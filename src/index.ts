#!/usr/bin/env node

import path from "path";
import express from "express";
import unified from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
const rehypeShiki = require("rehype-shiki");
import rehypeSanitize from "rehype-sanitize";
const rehypeSanitizeGitHubSchema = require("hast-util-sanitize/lib/github");
import rehypeStringify from "rehype-stringify";
import html from "tagged-template-noop";
import deepMerge from "deepmerge";

type HTML = string;

const app = express()
  .set(
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
            ${head ?? ""}
          </head>
          <body>
            ${body}
          </body>
        </html>
      `.trimLeft()
  )
  .use(express.static(path.join(__dirname, "../public")))
  .use(express.urlencoded({ extended: true }))
  .get("/", async (req, res) => {
    res.send(
      app.get("layout")(
        html`<title>Forum · CourseLore</title>`,
        html`
          <ul>
            ${(
              await Promise.all(
                messages.map(
                  async (message) => html`<li>${await render(message)}</li>`
                )
              )
            ).join("")}
          </ul>
          <form method="post" action="/">
            <p><textarea name="text"></textarea><button>Send</button></p>
          </form>
        `
      )
    );
  })
  .post("/", (req, res) => {
    messages.push(req.body.text);
    res.redirect("back");
  });

// const messages = new Array<string>();
const messages = [
  `
# Hello world

> Block quote.

Some _emphasis_, **importance**, and \`code\`.

# GFM

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a | b  |  c |  d  |
| - | :- | -: | :-: |

## Tasklist

* [ ] to do
* [x] done

---

Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
equation.

$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$

<div class="note">

A mix of *Markdown* and <em>HTML</em>.

</div>

<script>document.write("I SHOULDN’T SHOW UP!!!!")</script>

\`\`\`js
function render(text: string): string {
  return (
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeKatex)
      // .use(rehypeSanitize)
      .use(rehypeStringify)
      .processSync(text)
      .toString()
  );
}
\`\`\`
`,
];

async function render(text: string): Promise<string> {
  return (
    await unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(
        rehypeSanitize,
        deepMerge(rehypeSanitizeGitHubSchema, {
          attributes: {
            code: ["className"],
            span: [["className", "math-inline"]] as any,
            div: [["className", "math-display"]] as any,
          },
        })
      )
      .use(rehypeKatex)
      .use(rehypeShiki, { theme: "light_plus" })
      .use(rehypeStringify)
      .process(text)
  ).toString();
}

export default app;

if (require.main === module) {
  app
    .set("version", require("../package.json").version)
    .set("require", require);

  console.log(`CourseLore\nVersion: ${app.get("version")}`);

  const CONFIGURATION_FILE = path.join(
    process.argv[2] ?? process.cwd(),
    "configuration.js"
  );
  try {
    require(CONFIGURATION_FILE)(app);
    console.log(`Loaded configuration from ‘${CONFIGURATION_FILE}’`);
  } catch (error) {
    console.error(
      `Error: Failed to load configuration at ‘${CONFIGURATION_FILE}’: ${error.message}`
    );
    if (app.get("env") === "development")
      app
        .set("url", "http://localhost:4000")
        .set("administrator email", "administrator@courselore.org")
        .listen(new URL(app.get("url")).port, () => {
          console.log(
            `Trial/Development web server started at ${app.get("url")}`
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
}
