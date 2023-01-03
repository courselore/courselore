import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import { execa } from "execa";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeStringify from "rehype-stringify";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import html from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";

// TODO: Extract into @leafac/node
// TODO: Use in @leafac/html for benchmarks
export async function time(title, function_) {
  const start = process.hrtime.bigint();
  await function_();
  console.log(`${title}: ${(process.hrtime.bigint() - start) / 1_000_000n}ms`);
}

// TODO: Either remove this, or restore it and remove ‘tsc --noEmit’ from ‘package.json’
// await time("Server: TypeScript", async () => {
//   await execa("tsc", undefined, {
//     cwd: "./server/",
//     preferLocal: true,
//     stdio: "inherit",
//   });
// });

await time("Server: esbuild", async () => {
  await esbuild.build({
    absWorkingDir: url.fileURLToPath(new URL("./server/", import.meta.url)),
    entryPoints: await globby("./**/*.mts", { cwd: "./server/" }),
    outdir: "../build/server/",
    outExtension: { ".js": ".mjs" },
    format: "esm",
    platform: "node",
    packages: "external",
    sourcemap: true,
  });
});

let staticCSS = "";
let staticJavaScript = "";
await time(
  "Server: Minify HTML and extract static CSS & JavaScript",
  async () => {
    const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
    const htmlMinifier = unified()
      .use(rehypeParse, { fragment: true, emitParseErrors: true })
      .use(rehypePresetMinify)
      .use(rehypeStringify);
    for (const file of await globby("./build/server/**/*.mjs"))
      await fs.writeFile(
        file,
        (
          await babel.transformFileAsync(file, {
            plugins: [
              {
                visitor: {
                  TaggedTemplateExpression(path) {
                    // switch (path.node.tag.name) {
                    //   case "html": {
                    //     path.node.quasi.quasis = htmlMinifier
                    //       .processSync(
                    //         path.node.quasi.quasis
                    //           .map(
                    //             (templateElement) => templateElement.value.cooked
                    //           )
                    //           .join("◊◊◊◊")
                    //       )
                    //       .value.split("◊◊◊◊")
                    //       .map((templateElementValueCooked) =>
                    //         babel.types.templateElement({
                    //           raw: templateElementValueCooked,
                    //         })
                    //       );
                    //     break;
                    //   }
                    //   case "css": {
                    //     const css_ = new Function(
                    //       "css",
                    //       `return (${babelGenerator.default(path.node).code});`
                    //     )(css);
                    //     const identifier = baseIdentifier.encode(
                    //       xxhash.XXHash3.hash(Buffer.from(css_))
                    //     );
                    //     staticCSS =
                    //       css`
                    //         ${`[css~="${identifier}"]`.repeat(6)} {
                    //           ${css_}
                    //         }
                    //       ` + staticCSS;
                    //     path.replaceWith(babel.types.stringLiteral(identifier));
                    //     break;
                    //   }
                    //   case "javascript": {
                    //     const expressions = path.node.quasi.expressions.slice();
                    //     path.node.quasi.expressions =
                    //       path.node.quasi.expressions.map((expression, index) =>
                    //         babel.types.stringLiteral(`$$${index}`)
                    //       );
                    //     const javascript_ = babelGenerator.default(path.node).code;
                    //     const identifier = baseIdentifier.encode(
                    //       xxhash.XXHash3.hash(Buffer.from(javascript_))
                    //     );
                    //     staticJavaScript += javascript`export const ${identifier} = (${[
                    //       "event",
                    //       ...expressions.map((value, index) => `$$${index}`),
                    //     ].join(", ")}) => { ${javascript_} };`;
                    //     path.replaceWith(
                    //       babel.template.ast`
                    //         JSON.stringify({
                    //           function: ${babel.types.stringLiteral(identifier)},
                    //           arguments: ${babel.types.arrayExpression(
                    //             expressions
                    //           )},
                    //         })
                    //       `
                    //     );
                    //     break;
                    //   }
                    // }
                  },
                },
              },
            ],
          })
        ).code
      );
  }
);

await time("Static: PostCSS", async () => {
  staticCSS = (
    await postcss([postcssNested, autoprefixer]).process(staticCSS, {
      from: undefined,
    })
  ).css;
});

await fs.writeFile("./static/application.css", staticCSS);
await fs.writeFile("./static/application.mjs", staticJavaScript);

let esbuildResult;
await time("Static: esbuild", async () => {
  esbuildResult = await esbuild.build({
    absWorkingDir: url.fileURLToPath(new URL("./static/", import.meta.url)),
    entryPoints: ["./index.mjs"],
    outdir: "../build/static/",
    entryNames: "[dir]/[name]--[hash]",
    assetNames: "[dir]/[name]--[hash]",

    loader: {
      ".woff2": "file",
      ".woff": "file",
      ".ttf": "file",
    },

    target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],

    bundle: true,
    minify: true,
    sourcemap: true,
    metafile: true,
  });
});

await fs.rm("./static/application.css");
await fs.rm("./static/application.mjs");

const paths = {};

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
    paths["index.css"] = cssBundle.slice("../build/static/".length);
    paths["index.mjs"] = javascriptBundle.slice("../build/static/".length);
    break;
  }

await time("Static: Copy static files with cache busting", async () => {
  const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
  for (const source of [
    "./static/about/ali-madooei.webp",
    "./static/about/eliot-smith.webp",
    "./static/about/leandro-facchinetti.webp",
    "./static/about/main-screen--dark.webp",
    "./static/about/main-screen--light-and-dark.webp",
    "./static/about/main-screen--light.webp",
    "./static/about/main-screen--phone--dark.webp",
    "./static/about/main-screen--phone--light.webp",
    "./static/about/scott-smith.webp",
  ]) {
    const extension = path.extname(source);
    const destination = path.join(
      "./build",
      `${source.slice(0, -extension.length)}--${baseFileHash.encode(
        xxhash.XXHash3.hash(await fs.readFile(source))
      )}${extension}`
    );
    paths[source.slice("./static/".length)] = destination.slice(
      "build/static/".length
    );
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true });
  }
});

await fs.writeFile(
  new URL("./build/static/paths.json", import.meta.url),
  JSON.stringify(paths, undefined, 2)
);

await time("Static: Copy static files without cache busting", async () => {
  for (const source of [
    "./static/apple-touch-icon.png",
    "./static/favicon.ico",
    "./static/node_modules/fake-avatars/avatars/webp/",
  ]) {
    const destination = path.join("./build", source);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.cp(source, destination, { recursive: true });
  }
});
