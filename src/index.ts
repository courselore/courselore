#!/usr/bin/env node

import process from "process";
import path from "path";
import fs from "fs/promises";

import express from "express";
import core from "express-serve-static-core";
import cookieSession from "cookie-session";
import * as expressValidator from "express-validator";

import { Database, sql } from "@leafac/sqlite";
import databaseMigrate from "@leafac/sqlite-migration";

import html from "@leafac/html";
import javascript from "tagged-template-noop";

import unified from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import hastUtilSanitize from "hast-util-sanitize";
import deepMerge from "deepmerge";
import rehypeShiki from "@leafac/rehype-shiki";
import * as shiki from "shiki";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

import shell from "shelljs";
import cryptoRandomString from "crypto-random-string";
import inquirer from "inquirer";
import prettier from "prettier";

const VERSION = require("../package.json").version;

export default async function courselore(
  rootDirectory: string
): Promise<express.Express> {
  const app = express();

  type HTML = string;

  app.set("version", VERSION);
  app.set("url", "http://localhost:4000");
  app.set("administrator email", "demonstration-development@courselore.org");
  app.enable("demonstration");
  app.set(
    "layout base",
    (head: HTML, body: HTML): HTML =>
      html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="generator" content="CourseLore/${app.get("version")}" />
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
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/typeface-public-sans/index.css"
            />
            <link
              rel="stylesheet"
              href="${app.get(
                "url"
              )}/node_modules/typeface-roboto-mono/index.css"
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
                max-width: 600px;
                margin: 1em auto;
              }

              a,
              .a {
                color: inherit;
                background-color: inherit;
                border: none;
                font-size: 1em;
                text-decoration: underline;
                padding: 0;
                cursor: pointer;
              }

              a.undecorated,
              .a.undecorated,
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

              .demonstration,
              .TODO {
                font-size: 0.875em;
                background-color: whitesmoke;
                box-sizing: border-box;
                padding: 0 1em;
                border: 1px solid darkgray;
                border-radius: 10px;
              }

              .TODO::before {
                content: "TODO";
                font-weight: 700;
                display: block;
                margin-top: 0.5em;
              }

              /*
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
              */
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
              <!--$${req.session!.email === undefined
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
                  `}-->
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
              $${req.session!.email === undefined
                ? ""
                : html`
                    <form method="post" action="${app.get("url")}/sign-out">
                      <button>Sign out (${req.session!.email})</button>
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
      deepMerge<hastUtilSanitize.Schema>(
        require("hast-util-sanitize/lib/github.json"),
        {
          attributes: {
            code: ["className"],
            span: [["className", "math-inline"]],
            div: [["className", "math-display"]],
          },
        }
      )
    )
    .use(rehypeShiki, {
      highlighter: await shiki.getHighlighter({ theme: "light-plus" }),
    })
    .use(rehypeKatex, { maxSize: 25, maxExpand: 10 })
    .use(rehypeStringify);

  const ROLES = ["instructor", "assistant", "student"] as const;

  type Role = typeof ROLES[number];

  // FIXME: Open the databases using smarter configuration, for example, WAL and PRAGMA foreign keys.
  shell.mkdir("-p", path.join(rootDirectory, "data"));
  const database = new Database(path.join(rootDirectory, "data/courselore.db"));
  app.set("database", database);
  databaseMigrate(database, [
    sql`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      );

      CREATE TABLE courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL
      );

      CREATE TABLE enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user INTEGER NOT NULL REFERENCES users,
        course INTEGER NOT NULL REFERENCES courses,
        role TEXT NOT NULL,
        UNIQUE (user, course)
      );
    `,
  ]);

  /*
  Fixtures

# CommonMark

> Block quote.

Some _emphasis_, **importance**, and `code`.

---

# GitHub Flavored Markdown (GFM)

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

# HTML

<details class="note">

A mix of *Markdown* and <em>HTML</em>.

</details>

---

# Cross-Site Scripting (XSS)

👍<script>document.write("💩");</script>🙌

---

# Syntax highlighting (Shiki)

```javascript
const shiki = require('shiki')

shiki.getHighlighter({
  theme: 'nord'
}).then(highlighter => {
  console.log(highlighter.codeToHtml(`console.log('shiki');`, 'js'))
})
```

---

# Mathematics (KaTeX)

Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
equation.

$$
L = \frac{1}{2} \rho v^2 S C_L
$$

A raw dollar sign: \$

$$
\invalidMacro
$$

Prevent large width/height visual affronts:

$$
\rule{500em}{500em}
$$

  */

  shell.mkdir("-p", path.join(rootDirectory, "var"));
  const runtimeDatabase = new Database(
    path.join(rootDirectory, "var/courselore-runtime.db")
  );
  app.set("runtime database", runtimeDatabase);
  databaseMigrate(runtimeDatabase, [
    sql`
      CREATE TABLE secrets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL
      );

      CREATE TABLE authenticationTokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        token TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        expiresAt TEXT NOT NULL
      );
    `,

    sql`
      CREATE TABLE emailQueue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        to_ TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        tryAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `,
  ]);

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
      secret: runtimeDatabase.executeTransaction<string>(() => {
        let cookieSecret = runtimeDatabase.get<{ value: string }>(
          sql`SELECT value FROM secrets WHERE key = ${"cookie"}`
        )?.value;
        if (cookieSecret === undefined) {
          cookieSecret = newToken(60);
          runtimeDatabase.run(
            sql`INSERT INTO secrets (key, value) VALUES (${"cookie"}, ${cookieSecret})`
          );
        }
        return cookieSecret;
      }),
    })
  );

  const unauthenticatedRoutes = express.Router();

  app.use((req, res, next) => {
    if (req.session!.email === undefined) unauthenticatedRoutes(req, res, next);
    else next();
  });

  unauthenticatedRoutes.get(["/", "/authenticate"], (req, res) => {
    res.send(
      app.get("layout")(
        req,
        html`<title>CourseLore</title>`,
        html`
          <p>
            <a href="${app.get("url")}/sign-in">Sign in</a>
            <a href="${app.get("url")}/sign-up">Sign up</a>
          </p>
        `
      )
    );
  });

  unauthenticatedRoutes.get("/sign-up", (req, res) => {
    res.send(
      app.get("layout")(
        req,
        html`<title>Sign up · CourseLore</title>`,
        html`
          <h1>Sign up to CourseLore</h1>
          <form method="post" action="${app.get("url")}/authenticate">
            <input
              name="email"
              type="email"
              placeholder="me@university.edu"
              required
            />
            <button>Continue</button>
          </form>
          <p>
            <small>
              Already have an account?
              <a href="${app.get("url")}/sign-in">Sign in</a>.
            </small>
          </p>
        `
      )
    );
  });

  unauthenticatedRoutes.get("/sign-in", (req, res) => {
    res.send(
      app.get("layout")(
        req,
        html`<title>Sign in · CourseLore</title>`,
        html`
          <h1>Sign in to CourseLore</h1>
          <form method="post" action="${app.get("url")}/authenticate">
            <input
              name="email"
              type="email"
              placeholder="me@university.edu"
              required
            />
            <button>Continue</button>
          </form>
          <p>
            <small>
              Don’t have an account?
              <a href="${app.get("url")}/sign-up">Sign up</a>.
            </small>
          </p>
        `
      )
    );
  });

  // FIXME: Make more sophisticated use of expressValidator.
  unauthenticatedRoutes.post<core.ParamsDictionary, string, { email: string }>(
    "/authenticate",
    expressValidator.body("email").isEmail(),
    (req, res) => {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json(errors.array() as any);

      const { email } = req.body;

      runtimeDatabase.run(
        sql`DELETE FROM authenticationTokens WHERE email = ${email}`
      );
      const token = newToken(40);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      runtimeDatabase.run(
        sql`INSERT INTO authenticationTokens (token, email, expiresAt) VALUES (${token}, ${email}, ${expiresAt.toISOString()})`
      );

      const magicLink = `${app.get("url")}/authenticate/${token}`;
      const sentEmail = sendEmail({
        to: email,
        subject: "Here’s your magic link",
        body: html`<p><a href="${magicLink}">${magicLink}</a></p>`,
      });
      return res.send(
        app.get("layout")(
          req,
          html`<title>Authenticate · CourseLore</title>`,
          html`
            <form method="post" action="${app.get("url")}/authenticate">
              <input type="hidden" name="email" value="${email}" />
              <p>
                Check ${email} (including the spam folder) and click on the
                magic link to continue. <button class="a">Resend</button>.
              </p>
            </form>
            $${sentEmail}
          `
        )
      );
    }
  );

  unauthenticatedRoutes.get<{ token: string }>(
    "/authenticate/:token",
    (req, res) => {
      const { token } = req.params;
      const authenticationToken = runtimeDatabase.get<{
        email: string;
        expiresAt: string;
      }>(
        sql`SELECT email, expiresAt FROM authenticationTokens WHERE token = ${token}`
      );
      runtimeDatabase.run(
        sql`DELETE FROM authenticationTokens WHERE token = ${token}`
      );
      if (
        authenticationToken === undefined ||
        new Date(authenticationToken.expiresAt) < new Date()
      )
        return res.send(
          app.get("layout")(
            req,
            html`<title>Authentication · CourseLore</title>`,
            html`
              <p>
                This magic link is invalid or has expired.
                <a href="${app.get("url")}/sign-in">Sign in</a>.
                <a href="${app.get("url")}/sign-up">Sign up</a>.
              </p>
            `
          )
        );
      const { email } = authenticationToken;
      if (
        database.get<{ output: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM users WHERE email = ${email}) AS output`
        )!.output === 0
      ) {
        const token = newToken(40);
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);
        runtimeDatabase.run(
          sql`INSERT INTO authenticationTokens (token, email, expiresAt) VALUES (${token}, ${email}, ${expiresAt.toISOString()})`
        );
        return res.send(
          app.get("layout")(
            req,
            html`<title>Sign up · CourseLore</title>`,
            html`
              <form method="post" action="${app.get("url")}/users">
                <h1>Welcome to CourseLore!</h1>
                <p>
                  <input type="hidden" name="token" value="${token}" />
                  <input type="text" name="name" placeholder="Your name…" />
                  <button>Create account</button>
                </p>
                <div class="TODO">
                  <p>Ask for more user information here. What information?</p>
                </div>
              </form>
            `
          )
        );
      }
      req.session!.email = authenticationToken.email;
      res.redirect(`${app.get("url")}/`);
    }
  );

  unauthenticatedRoutes.post<
    core.ParamsDictionary,
    string,
    { token: string; name: string }
  >(
    "/users",
    expressValidator.body("token").exists(),
    expressValidator.body("name").exists(),
    (req, res) => {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json(errors.array() as any);

      const { token, name } = req.body;
      const authenticationToken = runtimeDatabase.get<{
        email: string;
        expiresAt: string;
      }>(
        sql`SELECT email, expiresAt FROM authenticationTokens WHERE token = ${token}`
      );
      runtimeDatabase.run(
        sql`DELETE FROM authenticationTokens WHERE token = ${token}`
      );
      database.executeTransaction(() => {
        if (
          authenticationToken === undefined ||
          new Date(authenticationToken.expiresAt) < new Date() ||
          database.get<{ output: number }>(
            sql`SELECT EXISTS(SELECT 1 FROM users WHERE email = ${authenticationToken.email}) AS output`
          )!.output === 1
        )
          return res.send(
            app.get("layout")(
              req,
              html`<title>Account creation · CourseLore</title>`,
              html`
                <p>
                  Something went wrong in the creation of your account.
                  <a href="${app.get("url")}/sign-up">Start over</a>.
                </p>
              `
            )
          );
        const { email } = authenticationToken;
        database.run(
          sql`INSERT INTO users (email, name) VALUES (${email}, ${name})`
        );
        req.session!.email = email;
        res.redirect(`${app.get("url")}/`);
      });
    }
  );

  const authenticatedRoutes = express.Router();

  app.use((req, res, next) => {
    if (req.session!.email !== undefined) authenticatedRoutes(req, res, next);
    else next();
  });

  authenticatedRoutes.post("/sign-out", (req, res) => {
    delete req.session!.email;
    res.redirect(`${app.get("url")}/`);
  });

  authenticatedRoutes.get("/", (req, res) => {
    const courses = database.all<{ token: string; name: string; role: Role }>(
      sql`
        SELECT courses.token as token, courses.name as name, enrollments.role as role
        FROM courses
        JOIN enrollments ON courses.id = enrollments.course
        JOIN users ON enrollments.user = users.id
        WHERE users.email = ${req.session!.email}
      `
    );
    if (courses.length === 1)
      return res.redirect(`${app.get("url")}/${courses[0].token}`);
    res.send(
      app.get("layout")(
        req,
        html`<title>CourseLore</title>`,
        html`
          <h1>
            Hi
            ${database.get<{ name: string }>(
              sql`SELECT name FROM users WHERE email = ${req.session!.email}`
            )!.name},
          </h1>
          $${courses.length === 0
            ? html`
                <p>
                  It looks like you’re new here. What would you like to do?
                  <a href="${app.get("url")}/courses/new">Create a course</a>.
                  <a href="${app.get("url")}/courses/join"
                    >Join an existing course</a
                  >.
                </p>
              `
            : html`
                <p>Here’s what’s going on with your courses:</p>
                <ul>
                  $${courses.map(
                    ({ token, name, role }) =>
                      html`<li>
                        <a href="${app.get("url")}/${token}"
                          >${name} (${role})</a
                        >
                      </li>`
                  )}
                </ul>
                <div class="TODO">
                  <p>
                    At this point we’re just showing a list of courses in which
                    the person in enrolled. In the future we’d probably like to
                    show a news feed with relevant updates from all courses.
                  </p>
                </div>
              `}
        `
      )
    );
  });

  /*
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
      author: req.session!.email,
      content: req.body.text,
      createdAt: new Date().toISOString(),
    });
    res.redirect("back");
  });
  const posts: { author: string; content: string; createdAt: string }[] = [];
  */

  function newToken(length: number): string {
    return cryptoRandomString({ length, characters: "cfhjkprtvwxy3479" });
  }

  function sendEmail({
    to,
    subject,
    body,
  }: {
    to: string;
    subject: string;
    body: string;
  }): string {
    if (app.get("demonstration"))
      return html`
        <div class="demonstration">
          <p>
            CourseLore is running in demonstration mode, so it doesn’t send
            emails. Here’s what would have been sent:
          </p>
          <p><strong>From:</strong> CourseLore</p>
          <p><strong>To:</strong> ${to}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Body:</strong></p>
          $${body}
        </div>
      `;
    runtimeDatabase.run(
      sql`INSERT INTO emailQueue (to_, subject, body, tryAt) VALUES (${to}, ${subject}, ${body}, ${new Date().toISOString()})`
    );
    return html``;
  }

  return app;
}

if (require.main === module)
  (async () => {
    console.log(`CourseLore/${VERSION}`);

    const CONFIGURATION_FILE =
      process.argv[2] ?? path.join(process.cwd(), "configuration.js");

    let configuration: (require: NodeRequire) => Promise<void>;
    try {
      configuration = require(CONFIGURATION_FILE);
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") {
        console.error(
          `Failed to load configuration from ‘${CONFIGURATION_FILE}’ (probably there’s a problem with your configuration): ${error.message}`
        );
        process.exit(1);
      }
      if (
        (
          await inquirer.prompt({
            type: "list",
            message: `There’s no configuration file at ‘${CONFIGURATION_FILE}’. What would you like to do?`,
            choices: [
              `Create a configuration file at ‘${CONFIGURATION_FILE}’`,
              "Exit",
            ],
            name: "answer",
          })
        ).answer == "Exit"
      )
        process.exit();
      switch (
        (
          await inquirer.prompt({
            type: "list",
            message:
              "What kind of configuration file would you like to create?",
            choices: ["Demonstration/Development", "Production"],
            name: "answer",
          })
        ).answer
      ) {
        case "Demonstration/Development":
          let url: string | undefined;
          if (
            (
              await inquirer.prompt({
                type: "list",
                name: "answer",
                message:
                  "From where would you like to access this CourseLore demonstration?",
                choices: [
                  "Only from this machine on which I’m running CourseLore",
                  "From other devices as well (for example, my phone)",
                ],
              })
            ).answer === "From other devices as well (for example, my phone)"
          )
            url = (
              await inquirer.prompt({
                type: "input",
                name: "answer",
                message: `With what URL can other devices access this machine (for example, ‘http://<your-machine-name>.local:4000’)?`,
              })
            ).answer;
          shell.mkdir("-p", path.dirname(CONFIGURATION_FILE));
          await fs.writeFile(
            CONFIGURATION_FILE,
            prettier.format(
              javascript`
                module.exports = async (require) => {
                  const courselore = require(".").default;
                
                  const app = await courselore(__dirname);
                
                  ${
                    url === undefined
                      ? javascript``
                      : javascript`app.set("url", "${url}");`
                  }

                  app.listen(new URL(app.get("url")).port, () => {
                    console.log(
                      \`Demonstration/Development web server started at \${app.get("url")}\`
                    );
                  });
                };
              `,
              { parser: "babel" }
            )
          );
          console.log(`Created configuration file at ‘${CONFIGURATION_FILE}’`);
          break;
        case "Production":
          console.error("TODO");
          process.exit(1);
          /*
  const fsSync = require("fs");
  const Greenlock = require("greenlock");
  const TLS_KEYS_DIRECTORY = path.join(__dirname, "var/keys/tls");
  const GREENLOCK_OPTIONS = {
    packageRoot: TLS_KEYS_DIRECTORY,
    packageAgent: `CourseLore/${VERSION}`,
    maintainerEmail: administratorEmail,
  };
  const HOSTNAMES = [
    "courselore.org",
    "www.courselore.org",
    "courselore.com",
    "www.courselore.com",
  ];
  if (!fsSync.existsSync(TLS_KEYS_DIRECTORY)) {
    shelljs.mkdir("-p", TLS_KEYS_DIRECTORY);
    const greenlockManager = Greenlock.create(GREENLOCK_OPTIONS).manager;
    await greenlockManager.defaults({
      agreeToTerms: true,
      subscriberEmail: app.get("administrator email"),
    });
    await greenlockManager.add({
      subject: HOSTNAMES[0],
      altnames: HOSTNAMES,
    });
    console.log(
      "TLS keys configured. Restart CourseLore. Shutting down now..."
    );
    process.exit();
  }
  app.disable("demonstration");
          */
          break;
      }
      configuration = require(CONFIGURATION_FILE);
    }
    console.log(`Configuration loaded from ‘${CONFIGURATION_FILE}’`);
    await configuration(require);
  })();
