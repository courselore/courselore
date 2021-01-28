#!/usr/bin/env node

import path from "path";
import express from "express";
import html from "tagged-template-noop";
import unified from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import hastUtilSanitize from "hast-util-sanitize";
import hastUtilSanitizeGitHubSchema from "hast-util-sanitize/lib/github.json";
import deepMerge from "deepmerge";
import rehypeShiki from "shiki-rehype";
import * as shiki from "shiki";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

type HTML = string;

async function appGenerator(): Promise<express.Express> {
  const app = express();

  app.set("version", require("../package.json").version);
  app.set("require", require);
  if (["development", "test"].includes(app.get("env"))) {
    app.set("url", "http://localhost:4000");
    app.set("administrator email", "development@courselore.org");
  }
  app.set(
    "layout",
    (head: HTML, body: HTML): HTML =>
      html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="32x32"
              href="${app.get("url")}/favicon-32x32.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="16x16"
              href="${app.get("url")}/favicon-16x16.png"
            />
            <link
              rel="shortcut icon"
              type="image/x-icon"
              href="${app.get("url")}/favicon.ico"
            />
            <style>
              /* https://pico-8.fandom.com/wiki/Palette */

              /* TODO: Remove unnecessary weights. */
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/100.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/200.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/300.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/400.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/500.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/600.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/700.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/800.css";
              @import "${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/900.css";
              @import "${app.get("url")}/node_modules/katex/dist/katex.min.css";

              body {
                line-height: 1.5;
                font-family: "Public Sans", sans-serif;
                max-width: 600px;
                padding: 0 1em;
                margin: 1em auto;
                -webkit-text-size-adjust: 100%;
              }

              a {
                color: inherit;
              }

              a.undecorated {
                text-decoration: none;
              }

              h1 {
                line-height: 1.2;
                font-size: 1.5em;
                font-weight: 800;
                margin-top: 1.5em;
              }

              img,
              svg {
                max-width: 100%;
                height: auto;
              }

              figure {
                text-align: center;
                font-size: 1.1em;
              }

              header {
                text-align: center;
              }

              nav a {
                text-decoration: none;
              }
            </style>
            ${head}
          </head>
          <body>
            ${body}
          </body>
        </html>
      `.trimLeft()
  );
  app.set(
    "text processor",
    (text: string): HTML => textProcessor.processSync(text).toString()
  );
  const textProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(
      rehypeSanitize,
      // FIXME: https://github.com/syntax-tree/hast-util-sanitize/pull/21
      deepMerge<hastUtilSanitize.Schema>(hastUtilSanitizeGitHubSchema as any, {
        attributes: {
          code: ["className"],
          span: [["className", "math-inline"]],
          div: [["className", "math-display"]],
        },
      })
    )
    .use(rehypeShiki, {
      highlighter: await shiki.getHighlighter({ theme: "light-plus" }),
    })
    .use(rehypeKatex, { maxSize: 25, maxExpand: 10 })
    .use(rehypeStringify);

  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (req, res) => {
    res.send(
      app.get("layout")(
        html`<title>Forum · CourseLore</title>`,
        html`
          <ul>
            ${messages
              .map(
                (message) =>
                  html`<li>${app.get("text processor")(message)}</li>`
              )
              .join("")}
          </ul>
          <form method="post" action="/">
            <p><textarea name="text"></textarea><button>Send</button></p>
          </form>
        `
      )
    );
  });
  app.post("/", (req, res) => {
    messages.push(req.body.text);
    res.redirect("back");
  });
  const messages = new Array<string>();

  return app;
}

export default appGenerator;

if (require.main === module)
  (async () => {
    const app = await appGenerator();

    console.log(`CourseLore\nVersion: ${app.get("version")}`);

    const CONFIGURATION_FILE = path.join(
      process.argv[2] ?? process.cwd(),
      "configuration.js"
    );
    try {
      await require(CONFIGURATION_FILE)(app);
      console.log(`Loaded configuration from ‘${CONFIGURATION_FILE}’`);
    } catch (error) {
      console.error(
        `Error: Failed to load configuration at ‘${CONFIGURATION_FILE}’: ${error.message}`
      );
      if (app.get("env") === "development")
        app.listen(new URL(app.get("url")).port, () => {
          console.log(
            `Demonstration/Development web server started at ${app.get("url")}`
          );
        });
    }

    const REQUIRED_SETTINGS = ["url", "administrator email"];
    const missingRequiredSettings = REQUIRED_SETTINGS.filter(
      (setting) => app.get(setting) === undefined
    );
    if (missingRequiredSettings.length > 0) {
      console.error(
        `Error: Missing the following required settings (did you set them on ‘${CONFIGURATION_FILE}’?): ${missingRequiredSettings
          .map((setting) => `‘${setting}’`)
          .join(", ")}`
      );
      process.exit(1);
    }
  })();
