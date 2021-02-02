#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import express from "express";
import cookieSession from "cookie-session";
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
    (req: express.Request, head: HTML, body: HTML): HTML =>
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
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/100.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/200.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/300.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/400.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/500.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/600.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/@fontsource/roboto-mono/700.css"
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
                max-width: 600px;
                font-family: "Public Sans", sans-serif;
                padding: 0 1em;
                margin: 1em auto;
                -webkit-text-size-adjust: 100%;
              }

              pre {
                font-size: ${13 / 16}em;
                line-height: 1.2;
              }

              code {
                font-family: "Roboto Mono", monospace;
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
                border: 1px solid darkgray;
                border-radius: 5px;
                padding: 0.5em 0.7em;
                outline: none;
              }

              button,
              .button {
                cursor: pointer;
                font-size: 1em;
                background-color: white;
                color: inherit;
                border: 1px solid darkgray;
                border-radius: 5px;
                padding: 0.2em;
                text-decoration: none;
              }

              button.undecorated,
              .button.undecorated {
                border: none;
                background-color: transparent;
              }

              main {
              }
            </style>
            $${head}
          </head>
          <body>
            <header
              style="
                display: grid;
                grid-template-columns: 1fr 2fr 1fr;
                align-items: center;
              "
            >
              <nav style="justify-self: start;">
                $${req.session?.user === undefined
                  ? ""
                  : html`
                      <button class="undecorated">
                        <svg width="20" height="20" viewBox="0 0 20 20">
                          <g
                            stroke="black"
                            stroke-width="2"
                            stroke-linecap="round"
                          >
                            <line x1="3" y1="5" x2="17" y2="5" />
                            <line x1="3" y1="10" x2="17" y2="10" />
                            <line x1="3" y1="15" x2="17" y2="15" />
                          </g>
                        </svg>
                      </button>
                    `}
              </nav>
              <nav style="justify-self: center;">
                <a href="${app.get("url")}" style="display: inline-flex;">
                  $${logo}
                  <span
                    style="
                      font-size: 1.5em;
                      font-weight: 900;
                      color: #83769c;
                      margin-left: 0.3em;
                    "
                    >CourseLore</span
                  >
                </a>
              </nav>
              <nav style="justify-self: end;">
                $${req.session?.user === undefined
                  ? ""
                  : html`
                      <form method="post" action="${app.get("url")}/logout">
                        <button class="undecorated">
                          Logout (${req.session!.user})
                        </button>
                      </form>
                    `}
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
  // FIXME:
  // https://expressjs.com/en/advanced/best-practice-security.html#use-cookies-securely
  // https://www.npmjs.com/package/cookie-session
  // https://github.com/expressjs/express/blob/master/examples/cookie-sessions/index.js
  // https://www.npmjs.com/package/express-session
  // https://github.com/expressjs/express/blob/master/examples/session/index.js
  app.use(
    cookieSession({
      secret: "TODO",
    })
  );

  app.get("/", (req, res) => {
    if (req.session?.user !== undefined)
      return res.redirect(app.get("url") + "/course");
    res.send(
      app.get("layout")(
        req,
        html`<title>CourseLore</title>`,
        html`
          <p>
            Exercitation veniam commodo voluptate dolore proident aliqua
            excepteur Lorem minim excepteur ut. Minim consectetur tempor sit non
            magna et elit esse ipsum eu anim deserunt sunt deserunt. Excepteur
            consequat irure sint <code>reprehenderit</code> mollit aliqua
            aliquip. Do aliquip aliquip fugiat non est minim laborum dolore
            proident incididunt sint id ea excepteur. Consequat
            <code>exercitation</code> irure et id magna amet mollit fugiat.
            Consectetur aute adipisicing ea occaecat ut do ad occaecat nisi.
            Pariatur proident aliqua enim aliqua pariatur culpa duis officia
            dolore velit.
          </p>
          $${app.get("text processor")(`
\`\`\`js
app.use(
  cookieSession({
    secret: "TODO",
  })
);
\`\`\`
`)}
          <p>
            Eiusmod occaecat aute est irure incididunt dolor cupidatat et
            deserunt enim et eiusmod duis ut. Dolor et consectetur anim pariatur
            aliquip exercitation culpa. Aute enim labore ut aliqua veniam
            voluptate. Adipisicing elit sit mollit reprehenderit enim enim ea
            dolore aliqua labore voluptate velit velit. Ex laboris minim sunt
            non. Adipisicing ut mollit excepteur laboris officia.
          </p>
          <p>
            Quis occaecat duis sit cupidatat aute elit minim duis nulla
            consectetur pariatur ut aute laboris. Fugiat cillum irure
            reprehenderit pariatur exercitation nisi est nostrud commodo irure
            duis aliquip sunt. In do minim culpa tempor laboris do fugiat
            consequat. In ullamco id enim labore velit adipisicing in pariatur.
          </p>
          <a class="button" href="${app.get("url")}/login?token=ali"
            >Login as Ali (Instructor)</a
          >
          <a class="button" href="${app.get("url")}/login?token=leandro"
            >Login as Leandro (Student)</a
          >
        `
      )
    );
  });

  app.get("/login", (req, res) => {
    const { token, redirect } = req.query;
    if (
      req.session?.user !== undefined ||
      (token !== "ali" && token !== "leandro") ||
      (redirect !== undefined && typeof redirect !== "string")
    )
      return res.sendStatus(400);
    req.session!.user = `${token}@courselore.org`;
    res.redirect(app.get("url") + (redirect ?? "/"));
  });

  app.post("/logout", (req, res) => {
    const { redirect } = req.query;
    if (
      req.session?.user === undefined ||
      (redirect !== undefined && typeof redirect !== "string")
    )
      return res.sendStatus(400);
    delete req.session!.user;
    res.redirect(app.get("url") + (redirect ?? "/"));
  });

  app.use((req, res, next) => {
    if (req.session?.user === undefined) return res.sendStatus(404);
    else next();
  });

  app.get("/course", (req, res) => {
    res.send(
      app.get("layout")(
        req,
        html`<title>Course · CourseLore</title>`,
        html`<a class="button" href="/thread">Go to thread</a>`
      )
    );
  });

  app
    .route("/thread")
    .get((req, res) => {
      res.send(
        app.get("layout")(
          req,
          html`<title>Thread · CourseLore</title>`,
          html`
            <ul>
              $${posts.map(
                ({ author, content, createdAt }) =>
                  html`<li>
                    ${author} says at ${createdAt}
                    $${app.get("text processor")(content)}
                  </li>`
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
      posts.push({
        author: req.session!.user,
        content: req.body.text,
        createdAt: new Date().toISOString(),
      });
      res.redirect("back");
    });
  const posts: { author: string; content: string; createdAt: string }[] = [];

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
