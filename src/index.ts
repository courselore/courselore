#!/usr/bin/env node

import path from "path";
import fs from "fs/promises";
import express from "express";
import cookieSession from "cookie-session";
import * as expressValidator from "express-validator";
import { Database, sql } from "@leafac/sqlite";
import databaseMigrate from "@leafac/sqlite-migration";
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
import cryptoRandomString from "crypto-random-string";
import dayjs from "dayjs";
import shell from "shelljs";

const ROOT_PATH = process.argv[2] ?? process.cwd();

type HTML = string;

async function appGenerator(): Promise<express.Express> {
  const app = express();

  app.set("version", require("../package.json").version);
  app.set("require", require);
  if (["development", "test"].includes(app.get("env"))) {
    app.set("url", "http://localhost:4000");
    app.set("administrator email", "development@courselore.org");
  }
  app.set("token characters", "cfhjkprtvwxy3479");
  app.set("token login length", 20);
  app.set("magic link expiration", [10, "minutes"]);
  app.set(
    "layout base",
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
            $${[100, 200, 300, 400, 500, 600, 700, 800, 900].map(
              (weight) => html`<link
                rel="stylesheet"
                href="${app.get(
                  "url"
                )}/node_modules/@fontsource/public-sans/${weight}.css"
              />`
            )}
            $${[100, 200, 300, 400, 500, 600, 700].map(
              (weight) => html`<link
                rel="stylesheet"
                href="${app.get(
                  "url"
                )}/node_modules/@fontsource/roboto-mono/${weight}.css"
              />`
            )}
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

              a {
                color: inherit;
              }

              a.undecorated,
              nav a {
                text-decoration: none;
              }

              code {
                font-family: "Roboto Mono", monospace;
              }

              ::selection {
                background-color: #ff77a8;
                color: white;
              }

              img,
              svg {
                max-width: 100%;
                height: auto;
              }

              h1 {
                line-height: 1.2;
                font-size: 1.5em;
                font-weight: 800;
                margin-top: 1.5em;
              }

              pre,
              .math-display {
                overflow: scroll;
              }

              pre {
                font-size: 0.75em;
                line-height: 1.3;
              }

              textarea {
                width: 100%;
                box-sizing: border-box;
                resize: vertical;
                font-size: 1em;
                background-color: white;
                border: 1px solid darkgray;
                border-radius: 10px;
                padding: 0.5em 0.7em;
                outline: none;
              }

              button,
              .button {
                font-size: 1em;
                font-weight: 700;
                text-decoration: none;
                background-color: #83769c;
                color: white;
                padding: 0.5em;
                border: none;
                border-radius: 10px;
                cursor: pointer;
              }
            </style>
            $${head}
          </head>
          <body>
            $${body}
          </body>
        </html>
      `.trimLeft()
  );
  app.set(
    "layout",
    (req: express.Request, head: HTML, body: HTML): HTML =>
      app.get("layout base")(
        head,
        html`
          <header
            style="
              display: grid;
              grid-template-columns: 1fr 2fr 1fr;
              align-items: center;
            "
          >
            <nav style="justify-self: start;">
              $${req.session!.user === undefined
                ? ""
                : html`
                    <button>
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
              $${req.session!.user === undefined
                ? ""
                : html`
                    <form method="post" action="${app.get("url")}/logout">
                      <button>Logout (${req.session!.user})</button>
                    </form>
                  `}
            </nav>
          </header>
          <main>$${body}</main>
          <footer></footer>
        `
      )
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
  if (["development", "test"].includes(app.get("env")))
    app.use(cookieSession({ secret: "development/test" }));

  app.get("/", (req, res) => {
    if (req.session!.user === undefined)
      return res.send(
        app.get("layout")(
          req,
          html`<title>CourseLore</title>`,
          authenticationForm
        )
      );
    res.send(
      app.get("layout")(
        req,
        html`<title>CourseLore</title>`,
        html`
          <p>
            TODO: If you aren’t in any courses, say welcome message and
            encourage you to join/create a course. If you’re in only one course,
            redirect to it. If you’re in multiple courses, show an aggregate
            feed of the activities in all courses.
          </p>
        `
      )
    );
  });
  const authenticationForm = html`
    <form method="post" action="${app.get("url")}/authentication">
      <label>Email: <input name="email" type="email" required /></label>
      <button>Sign up</button>
      <button>Login</button>
    </form>
  `;

  app.get("/authentication", (req, res) => {
    if (req.session!.user !== undefined) return res.redirect(app.get("url"));
    res.send(
      app.get("layout")(
        req,
        html`<title>Authentication · CourseLore</title>`,
        authenticationForm
      )
    );
  });

  /*
  app.get("/login", (req, res) => {
    if (req.session!.user !== undefined)
      return res.redirect(`${app.get("url")}/`);
    return res.send(
      app.get("layout")(
        req,
        html`<title>Login · CourseLore</title>`,
        html`
          <form method="post">
            <label>Email: <input name="email" type="email" required /></label>
            <button>Login</button>
          </form>
        `
      )
    );
  });
  app.post("/login", expressValidator.body("email").isEmail(), (req, res) => {
    const errors = expressValidator.validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json(errors.array());
    // FIXME: Delete all other tokens for same address.
    const { email } = req.body;
    const token = cryptoRandomString({
      length: app.get("token login length"),
      characters: app.get("token characters"),
    });
    const expiration = app.get("magic link expiration");
    const expiresAt = dayjs()
      .add(...(app.get("magic link expiration") as [number, dayjs.OpUnitType]))
      .toDate();
    loginTokens.set(token, {
      email,
      expiresAt,
    });
    const magicLink = `${app.get("url")}/login/${token}`;
    return res.send(
      app.get("layout")(
        req,
        html`<title>Login · CourseLore</title>`,
        html`
          <p>
            At this point CourseLore would send you an email with a magic link
            for login, but because this is only an early-stage demonstration,
            here’s the magic link instead (it’s valid for
            ${expiration.join(" ")}):<br />
            <a href="${magicLink}">${magicLink}</a><br />
          </p>
        `
      )
    );
  });
  app.get("/login/:token", (req, res) => {
    const { token } = req.params;
    const loginToken = loginTokens.get(token);
    loginTokens.delete(token);
    if (
      loginToken === undefined ||
      dayjs(loginToken.expiresAt).isBefore(dayjs())
    )
      return res.send(
        app.get("layout")(
          req,
          html`<title>Login · CourseLore</title>`,
          html`
            <p>
              Error: Invalid magic link.
              <a href="${app.get("url")}/login">Try logging in again</a>
            </p>
          `
        )
      );
    req.session!.user = loginToken.email;
    res.redirect(`${app.get("url")}/`);
  });
  app.post("/logout", (req, res) => {
    delete req.session!.user;
    res.redirect(`${app.get("url")}/`);
  });
  type LoginTokenKey = string;
  interface LoginTokenValue {
    email: string;
    expiresAt: Date;
  }
  const loginTokens: Map<LoginTokenKey, LoginTokenValue> = new Map();

  app.use((req, res, next) => {
    if (req.session!.user === undefined) return res.sendStatus(404);
    else next();
  });
  */

  /*
  app.get("/course", (req, res) => {
    res.send(
      app.get("layout")(
        req,
        html`<title>Course · CourseLore</title>`,
        html`<a class="button" href="/thread">Go to thread</a>`
      )
    );
  });

  app.get("/thread", (req, res) => {
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
            <p><textarea name="text"></textarea><br /><button>Send</button></p>
          </form>
        `
      )
    );
  });
  app.post("/thread", (req, res) => {
    posts.push({
      author: req.session!.user,
      content: req.body.text,
      createdAt: new Date().toISOString(),
    });
    res.redirect("back");
  });
  const posts: { author: string; content: string; createdAt: string }[] = [];
  */

  // FIXME: Open the database using smarter configuration, for example, WAL and PRAGMA foreign keys.
  shell.mkdir("-p", path.join(ROOT_PATH, "data"));
  const database = new Database(
    app.get("env") === "test"
      ? ":memory:"
      : path.join(ROOT_PATH, "data/courselore.db")
  );
  const migrations = [
    sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      );

      CREATE TABLE authenticationTokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        expiresAt TEXT NOT NULL
      );
    `,
  ];
  const databaseMigrationResult = databaseMigrate(database, migrations);
  app.set("database", database);
  console.log(
    `Database migration: ${databaseMigrationResult} migrations executed`
  );

  return app;
}

export default appGenerator;

if (require.main === module)
  (async () => {
    const app = await appGenerator();

    console.log(`CourseLore\nVersion: ${app.get("version")}`);

    const CONFIGURATION_FILE = path.join(ROOT_PATH, "configuration.js");
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
