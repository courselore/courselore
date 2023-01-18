import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import { globby } from "globby";
import * as node from "@leafac/node";
import babel from "@babel/core";
import babelGenerator from "@babel/generator";
import prettier from "prettier";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";
import esbuild from "esbuild";
import xxhash from "xxhash-addon";
import baseX from "base-x";
import css from "@leafac/css";
import javascript from "@leafac/javascript";

let staticCSS = "";
let staticJavaScript = javascript`
  import "@fontsource/public-sans/variable.css";
  import "@fontsource/public-sans/variable-italic.css";
  import "@fontsource/jetbrains-mono/variable.css";
  import "@fontsource/jetbrains-mono/variable-italic.css";
  import "bootstrap-icons/font/bootstrap-icons.css";
  import "katex/dist/katex.css";
  import "tippy.js/dist/tippy.css";
  import "tippy.js/dist/svg-arrow.css";
  import "tippy.js/dist/border.css";
  import "@leafac/css/static/index.css";
  import "./index.css";

  import autosize from "autosize";
  import Mousetrap from "mousetrap";
  import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";
  import * as tippy from "tippy.js";
  import textareaCaret from "textarea-caret";
  import * as textFieldEdit from "text-field-edit";
  // import * as leafac from "@leafac/javascript/static/index.mjs";
  import * as leafac from "./leafac--javascript.mjs";

  leafac.customFormValidation();
  leafac.warnAboutLosingInputs();
  leafac.tippySetDefaultProps();
  leafac.liveNavigation();
`;

const staticCSSIdentifiers = new Set();
const staticJavaScriptIdentifiers = new Set();
const baseIdentifier = baseX("abcdefghijklmnopqrstuvwxyz");
for (const input of await globby("./source/**/*.mts")) {
  const output = path.join(
    "./build",
    `${input.slice("./source/".length, -path.extname(input).length)}.mjs`
  );

  const code = await fs.readFile(input, "utf-8");

  const babelResult = await babel.transformFromAstAsync(
    (
      await babel.transformAsync(code, {
        filename: input,
        ast: true,
        code: false,
        presets: ["@babel/preset-typescript"],
      })
    ).ast,
    code,
    {
      filename: input,
      sourceMaps: true,
      sourceFileName: path.relative(path.dirname(output), input),
      cloneInputAst: false,
      plugins: [
        {
          visitor: {
            TaggedTemplateExpression(path) {
              switch (path.node.tag.name) {
                case "css": {
                  const css_ = prettier.format(
                    new Function(
                      "css",
                      `return (${babelGenerator.default(path.node).code});`
                    )(css),
                    { parser: "css" }
                  );
                  const identifier = baseIdentifier.encode(
                    xxhash.XXHash3.hash(Buffer.from(css_))
                  );
                  if (!staticCSSIdentifiers.has(identifier)) {
                    staticCSSIdentifiers.add(identifier);
                    staticCSS += `/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
                      6
                    )} {\n${css_}}\n\n`;
                  }
                  path.replaceWith(babel.types.stringLiteral(identifier));
                  break;
                }

                case "javascript": {
                  let javascript_ = "";
                  for (const [index, quasi] of path.node.quasi.quasis.entries())
                    javascript_ +=
                      (index === 0 ? `` : `$$${index - 1}`) +
                      quasi.value.cooked;
                  javascript_ = prettier.format(javascript_, {
                    parser: "babel",
                  });
                  const identifier = baseIdentifier.encode(
                    xxhash.XXHash3.hash(Buffer.from(javascript_))
                  );
                  if (!staticJavaScriptIdentifiers.has(identifier)) {
                    staticJavaScriptIdentifiers.add(identifier);
                    staticJavaScript += `/********************************************************************************/\n\nleafac.javascript.functions.set("${identifier}", function (${[
                      "event",
                      ...path.node.quasi.expressions.map(
                        (value, index) => `$$${index}`
                      ),
                    ].join(", ")}) {\n${javascript_}});\n\n`;
                  }
                  path.replaceWith(
                    babel.template.ast`
                      JSON.stringify({
                        function: ${babel.types.stringLiteral(identifier)},
                        arguments: ${babel.types.arrayExpression(
                          path.node.quasi.expressions
                        )},
                      })
                    `
                  );
                  break;
                }
              }
            },
          },
        },
      ],
    }
  );

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(
    output,
    `${babelResult.code}\n//# sourceMappingURL=${path.basename(output)}.map`
  );
  await fs.writeFile(`${output}.map`, JSON.stringify(babelResult.map));
}

staticCSS = (
  await postcss([postcssNested, autoprefixer]).process(staticCSS, {
    from: undefined,
  })
).css;

await fs.writeFile("./static/index.css", staticCSS);
await fs.writeFile("./static/index.mjs", staticJavaScript);

const esbuildResult = await esbuild.build({
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

await fs.rm("./static/index.css");
await fs.rm("./static/index.mjs");

const paths = {};

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
    paths["index.css"] = cssBundle.slice("../build/static/".length);
    paths["index.mjs"] = javascriptBundle.slice("../build/static/".length);
    break;
  }

const baseFileHash = baseX("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");
for (const source of await globby("./static/about/")) {
  const extension = path.extname(source);
  const destination = path.join(
    "./build",
    `${source.slice(0, -extension.length)}--${baseFileHash.encode(
      xxhash.XXHash3.hash(await fs.readFile(source))
    )}${extension}`
  );
  paths[source.slice("static/".length)] = destination.slice(
    "build/static/".length
  );
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

await fs.writeFile(
  new URL("./build/static/paths.json", import.meta.url),
  JSON.stringify(paths, undefined, 2)
);

for (const source of [
  "./static/apple-touch-icon.png",
  "./static/favicon.ico",
  "./static/node_modules/fake-avatars/avatars/webp/",
]) {
  const destination = path.join("./build", source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}
