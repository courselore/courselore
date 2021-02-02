#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import express from "express";
import html from "@leafac/html";
import unified from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import hastUtilSanitize from "hast-util-sanitize";
// FIXME: https://github.com/syntax-tree/hast-util-sanitize/pull/21
const hastUtilSanitizeGitHubSchema = require("hast-util-sanitize/lib/github.json");
import deepMerge from "deepmerge";
import rehypeShiki from "@leafac/rehype-shiki";
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
              name="generator"
              content="CourseLore/v${app.get("version")}"
            />
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
            <!-- TODO: Remove unnecessary weights. -->
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/100.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/200.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/300.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/400.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/500.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/600.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/700.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/800.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/public-sans/900.css"
            />
            <link
              rel="stylesheet"
              href="${app.get("url")}/node_modules/katex/dist/katex.min.css"
            />
            <style>
              /*
                https://pico-8.fandom.com/wiki/Palette
                #83769c
                #ff77a8
                #29adff
              */
              body {
                line-height: 1.5;
                font-family: "Public Sans", sans-serif;
                -webkit-text-size-adjust: 100%;
                margin: 0;
              }

              ::selection {
                background: #ff77a8;
              }

              a {
                color: inherit;
              }

              a.undecorated,
              nav a {
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

              textarea {
                width: 100%;
                box-sizing: border-box;
                resize: vertical;
                font-size: 1em;
                background-color: white;
                color: black;
                border: 1px solid darkgray;
                border-radius: 5px;
                padding: 0.5em 0.7em;
                outline: none;
              }

              button {
                cursor: pointer;
                font-size: 1em;
                background-color: white;
                border: 1px solid darkgray;
                border-radius: 5px;
              }

              button.undecorated {
                border: none;
                background-color: transparent;
              }
            </style>
            $${head}
          </head>
          <body>
            <header
              style="
                display: flex;
                justify-content: space-between;
                background-color: #83769c;
                color: white;
                padding: 0.5em 1em;
              "
            >
              <nav>
                <button class="undecorated">
                  <svg width="20" height="20" viewBox="0 0 20 20">
                    <g stroke="white" stroke-width="2" stroke-linecap="round">
                      <line x1="3" y1="5" x2="17" y2="5" />
                      <line x1="3" y1="10" x2="17" y2="10" />
                      <line x1="3" y1="15" x2="17" y2="15" />
                    </g>
                  </svg>
                </button>
              </nav>
              <nav>
                <a href="${app.get("url")}" style="display: inline-flex;">
                  $${logo}
                  <span
                    style="
                      font-weight: 900;
                      margin-left: 0.3em;
                    "
                    >CourseLore</span
                  >
                </a>
              </nav>
              <nav>
                <a href="">PIC</a>
              </nav>
            </header>
            <main>$${body}</main>
            <footer></footer>
          </body>
        </html>
      `.trimLeft()
  );
  const logo = await fs.readFile(
    path.join(__dirname, "../public/logo.svg"),
    "utf-8"
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
      deepMerge<hastUtilSanitize.Schema>(hastUtilSanitizeGitHubSchema, {
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

  app
    .route("/thread")
    .get((req, res) => {
      res.send(
        app.get("layout")(
          html`<title>Thread · CourseLore</title>`,
          html`
            <ul>
              $${messages.map(
                (message) =>
                  html`<li>$${app.get("text processor")(message)}</li>`
              )}
            </ul>
            <form method="post">
              <p>
                <textarea name="text"></textarea><br /><button>Send</button>
              </p>
            </form>
          `
        )
      );
    })
    .post((req, res) => {
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
