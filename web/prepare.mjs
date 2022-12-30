import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import { execa } from "execa";
import { globby } from "globby";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import html from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";

await execa("tsc", undefined, {
  cwd: "./server/",
  preferLocal: true,
  stdio: "inherit",
});

// TODO: Source maps.

const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
let applicationCSS = "";
let applicationJavaScript = "";
for (const file of await globby("./build/server/**/*.mjs"))
  await fs.writeFile(
    file,
    (
      await babel.transformFileAsync(file, {
        plugins: [
          {
            visitor: {
              TaggedTemplateExpression(path) {
                switch (path.node.tag.name) {
                  case "css": {
                    const css_ = new Function(
                      "css",
                      `return (${babelGenerator.default(path.node).code});`
                    )(css);
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(css_))
                    );
                    applicationCSS =
                      css`
                        ${`[css~="${identifier}"]`.repeat(6)} {
                          ${css_}
                        }
                      ` + applicationCSS;
                    path.replaceWith(babel.types.stringLiteral(identifier));
                    break;
                  }

                  case "javascript": {
                    const javascript_ = new Function(
                      "html",
                      "css",
                      "javascript",
                      `return (${babelGenerator.default(path.node).code});`
                    )(html, css, javascript);
                    const identifier = baseIdentifier.encode(
                      xxhash.XXHash3.hash(Buffer.from(javascript_))
                    );
                    applicationJavaScript += javascript`export const ${identifier} = (event) => { ${javascript_} };`;
                    path.replaceWith(babel.types.stringLiteral(identifier));
                    break;
                  }
                }
              },
            },
          },
        ],
      })
    ).code
  );

applicationCSS = (
  await postcss([postcssNested, autoprefixer]).process(applicationCSS)
).css;

await fs.writeFile("./static/application.css", applicationCSS);
await fs.writeFile("./static/application.mjs", applicationJavaScript);

const esbuildResult = await esbuild.build({
  absWorkingDir: url.fileURLToPath(new URL("./static/", import.meta.url)),
  entryPoints: ["./index.mjs"],
  outdir: "./build/static/",
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

await fs.rm("./static/application.css");
await fs.rm("./static/application.mjs");

const paths = {};

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
    paths["index.css"] = cssBundle.slice("./build/static/".length);
    paths["index.mjs"] = javascriptBundle.slice("./build/static/".length);
    break;
  }

for (const source of [
  "about/ali-madooei.webp",
  "about/eliot-smith.webp",
  "about/leandro-facchinetti.webp",
  "about/main-screen--dark.webp",
  "about/main-screen--light-and-dark.webp",
  "about/main-screen--light.webp",
  "about/main-screen--phone--dark.webp",
  "about/main-screen--phone--light.webp",
  "about/scott-smith.webp",
]) {
  const extension = path.extname(source);
  const destination = path.join(
    "./build/static",
    `${source.slice(0, -extension.length)}--${crypto
      .createHash("sha1")
      .update(await fs.readFile(source))
      .digest("hex")}${extension}`
  );
  paths[source] = destination.slice("./build/static/".length);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

await fs.writeFile(
  new URL("./build/static/paths.json", import.meta.url),
  JSON.stringify(paths, undefined, 2)
);

for (const source of [
  "apple-touch-icon.png",
  "favicon.ico",
  "node_modules/fake-avatars/avatars/",
]) {
  const destination = path.join("./build/static", source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}
