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
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import xss from "xss";
import sanitizeHtml from 'sanitize-html';
import * as DOMPurify from 'dompurify';
import * as shiki from "shiki";
import { JSDOM } from "jsdom";
import html from "tagged-template-noop";

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
  .get("/forum", (req, res) => {
    res.send(
      app.get("layout")(
        html`<title>Forum · CourseLore</title>`,
        html`
          <ul>
            ${messages
              .map((message) => html`<li>${render(message)}</li>`)
              .join("")}
          </ul>
          <form method="post" action="/forum">
            <p><textarea name="text"></textarea><button>Send</button></p>
          </form>
        `
      )
    );
  })
  .post("/forum", (req, res) => {
    messages.push(req.body.text);
    res.redirect("back");
  });

// const messages = new Array<string>();
const messages = [
  `
# Hello

- [ ] TODO
- [x] DONE

| Hello | World |
|-------|-------|
| Test  | Table |

<details>

I am **math**: $\\alpha$

</details>

<script>document.write("I SHOULDN’T SHOW UP")</script>

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

(async () => {
  app.set(
    "syntax highlighter",
    await shiki.getHighlighter({ theme: "light-plus" })
  );
})();
function render(text: string): string {
  const renderedMarkdown = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeKatex)
    // .use(rehypeSanitize)
    .use(rehypeStringify)
    .processSync(text)
    .toString();
  const dom = JSDOM.fragment(`<wrapper>${renderedMarkdown}</wrapper>`);
  const syntaxHighlighter = app.get("syntax highlighter");
  for (const codeBlock of dom.querySelectorAll(
    `pre > code[class^="language-"]`
  ))
    codeBlock.parentElement!.outerHTML = syntaxHighlighter.codeToHtml(
      codeBlock.innerHTML,
      codeBlock.className.slice("language-".length)
    );
  return DOMPurify.sanitize(dom.querySelector("wrapper")!.innerHTML);
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
