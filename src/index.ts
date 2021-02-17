#!/usr/bin/env node

import process from "process";
import path from "path";
import fs from "fs/promises";

import express from "express";
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
            <meta name="generator" content="CourseLore/${VERSION}" />
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
    (
      req: express.Request,
      res: express.Response,
      head: HTML,
      body: HTML
    ): HTML =>
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
                ? html``
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
                ? html``
                : html`
                    <form method="post" action="${app.get("url")}/sign-out">
                      <button>
                        Sign out
                        (${database.get<{ name: string }>(
                          sql`SELECT "name" FROM "users" WHERE "email" = ${
                            req.session!.email
                          }`
                        )!.name})
                      </button>
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

  // FIXME: Open the databases using more appropriate configuration, for example, WAL and PRAGMA foreign keys.
  shell.mkdir("-p", path.join(rootDirectory, "data"));
  const database = new Database(path.join(rootDirectory, "data/courselore.db"));
  app.set("database", database);
  databaseMigrate(database, [
    sql`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL
      );

      CREATE TABLE "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "token" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL
      );

      CREATE TABLE "enrollments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "user" INTEGER NOT NULL REFERENCES "users",
        "course" INTEGER NOT NULL REFERENCES "courses",
        "role" TEXT NOT NULL,
        UNIQUE ("user", "course")
      );
    `,

    sql`
      CREATE TABLE "threads" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "course" INTEGER NOT NULL REFERENCES "courses",
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "title" TEXT NOT NULL
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
      CREATE TABLE "settings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL
      );

      CREATE TABLE "authenticationTokens" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "token" TEXT NOT NULL UNIQUE,
        "email" TEXT NOT NULL UNIQUE,
        "expiresAt" TEXT DEFAULT (datetime('now', '+10 minutes'))
      );

      CREATE TABLE "emailQueue" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "tryAt" TEXT DEFAULT CURRENT_TIMESTAMP
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
          sql`SELECT "value" FROM "settings" WHERE "key" = ${"cookie"}`
        )?.value;
        if (cookieSecret === undefined) {
          cookieSecret = newToken(60);
          runtimeDatabase.run(
            sql`INSERT INTO "settings" ("key", "value") VALUES (${"cookie"}, ${cookieSecret})`
          );
        }
        return cookieSecret;
      }),
    })
  );

  const unauthenticatedRouter = express.Router();
  const authenticatedRouter = express.Router();

  app.use<{}, unknown, {}, {}, {}>((req, res, next) => {
    if (req.session!.email === undefined) unauthenticatedRouter(req, res, next);
    else
      database.executeTransaction(() => {
        if (
          database.get<{ exists: number }>(
            sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${
              req.session!.email
            }) AS "exists"`
          )!.exists === 0
        ) {
          delete req.session!.email;
          res.redirect(`${app.get("url")}/`);
        } else authenticatedRouter(req, res, next);
      });
  });

  unauthenticatedRouter.get<{}, HTML, {}, {}, {}>(
    ["/", "/authenticate"],
    (req, res) => {
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>CourseLore</title>`,
          html`
            <p>
              <a href="${app.get("url")}/sign-in">Sign in</a>
              <a href="${app.get("url")}/sign-up">Sign up</a>
            </p>
          `
        )
      );
    }
  );

  unauthenticatedRouter.get<{}, HTML, {}, {}, {}>(
    ["/sign-up", "/sign-in"],
    (req, res) => {
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>
            Sign ${req.path === "/sign-up" ? "up" : "in"} · CourseLore
          </title>`,
          html`
            <h1>Sign ${req.path === "/sign-up" ? "up" : "in"} to CourseLore</h1>
            <form method="post">
              <p>
                <input
                  name="email"
                  type="email"
                  placeholder="me@university.edu"
                  required
                />
                <button>Continue</button>
              </p>
            </form>
            <p>
              <small>
                $${req.path === "/sign-up"
                  ? html`
                      Already have an account?
                      <a href="${app.get("url")}/sign-in">Sign in</a>.
                    `
                  : html`
                      Don’t have an account yet?
                      <a href="${app.get("url")}/sign-up">Sign up</a>.
                    `}
              </small>
            </p>
          `
        )
      );
    }
  );

  // FIXME: Make more sophisticated use of expressValidator.
  unauthenticatedRouter.post<{}, HTML, { email: string }, {}, {}>(
    ["/sign-up", "/sign-in"],
    expressValidator.body("email").isEmail(),
    (req, res) => {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json(errors.array() as any);

      const { email } = req.body;

      runtimeDatabase.run(
        sql`DELETE FROM "authenticationTokens" WHERE "email" = ${email}`
      );
      const token = newToken(40);
      runtimeDatabase.run(
        sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${token}, ${email})`
      );

      const userExists =
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${email}) AS "exists"`
        )!.exists === 1;

      const magicLink = `${app.get("url")}/sign-${
        userExists ? "in" : "up"
      }/${token}`;
      const sentEmail = sendEmail({
        to: email,
        subject: `Here’s your magic link to sign ${
          userExists ? "in" : "up"
        } to CourseLore`,
        body: html`
          <p><a href="${magicLink}">${magicLink}</a></p>
          <p><small>Expires in 10 minutes.</small></p>
        `,
      });
      return res.send(
        app.get("layout")(
          req,
          res,
          html`<title>
            Sign ${req.path === "/sign-up" ? "up" : "in"} · CourseLore
          </title>`,
          html`
            <p>
              To continue with sign ${req.path === "/sign-up" ? "up" : "in"},
              check ${email} and follow the magic link.
            </p>
            <form method="post">
              <p>
                <input type="hidden" name="email" value="${email}" />
                <small>
                  Didn’t receive the email? Already checked the spam folder?
                  <button class="a">Resend</button>.
                </small>
              </p>
            </form>
            $${sentEmail}
          `
        )
      );
    }
  );

  unauthenticatedRouter.get<{ token: string }, HTML, {}, {}, {}>(
    ["/sign-up/:token", "/sign-in/:token"],
    (req, res) => {
      const { token } = req.params;
      const authenticationToken = runtimeDatabase.get<{
        email: string;
        expiresAt: string;
      }>(
        sql`SELECT "email", "expiresAt" FROM "authenticationTokens" WHERE "token" = ${token}`
      );
      runtimeDatabase.run(
        sql`DELETE FROM "authenticationTokens" WHERE "token" = ${token}`
      );
      if (
        authenticationToken === undefined ||
        new Date(authenticationToken.expiresAt) < new Date()
      )
        return res.send(
          app.get("layout")(
            req,
            res,
            html`<title>
              Sign ${req.path.startsWith("/sign-up") ? "up" : "in"} · CourseLore
            </title>`,
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
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${email}) AS "exists"`
        )!.exists === 0
      ) {
        const token = newToken(40);
        runtimeDatabase.run(
          sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${token}, ${email})`
        );
        return res.send(
          app.get("layout")(
            req,
            res,
            html`<title>Sign up · CourseLore</title>`,
            html`
              <h1>Welcome to CourseLore!</h1>
              <form method="post" action="${app.get("url")}/users">
                <p>
                  <input type="hidden" name="token" value="${token}" />
                  <input type="text" value="${email}" disabled />
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

  unauthenticatedRouter.post<{}, HTML, { token: string; name: string }, {}, {}>(
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
        sql`SELECT "email", "expiresAt" FROM "authenticationTokens" WHERE "token" = ${token}`
      );
      runtimeDatabase.run(
        sql`DELETE FROM "authenticationTokens" WHERE "token" = ${token}`
      );
      database.executeTransaction(() => {
        if (
          authenticationToken === undefined ||
          new Date(authenticationToken.expiresAt) < new Date() ||
          database.get<{ exists: number }>(
            sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${authenticationToken.email}) AS "exists"`
          )!.exists === 1
        )
          return res.send(
            app.get("layout")(
              req,
              res,
              html`<title>Sign up · CourseLore</title>`,
              html`
                <p>
                  Something went wrong in your sign up.
                  <a href="${app.get("url")}/sign-up">Start over</a>.
                </p>
              `
            )
          );
        const { email } = authenticationToken;
        database.run(
          sql`INSERT INTO "users" ("email", "name") VALUES (${email}, ${name})`
        );
        req.session!.email = email;
        res.redirect(`${app.get("url")}/`);
      });
    }
  );

  authenticatedRouter.post<{}, never, {}, {}, {}>("/sign-out", (req, res) => {
    delete req.session!.email;
    res.redirect(`${app.get("url")}/`);
  });

  authenticatedRouter.get<{}, HTML, {}, {}, {}>("/", (req, res) => {
    database.executeTransaction(() => {
      const { enrollmentsCount } = database.get<{ enrollmentsCount: number }>(
        sql`SELECT COUNT(*) AS "enrollmentsCount" FROM "enrollments" JOIN "users" ON "enrollments"."user" = "users"."id" WHERE "users"."email" = ${
          req.session!.email
        }`
      )!;
      if (enrollmentsCount == 1)
        return res.redirect(
          `${app.get("url")}/${
            database.get<{ token: string }>(
              sql`
                SELECT "courses"."token" AS "token"
                FROM "courses"
                JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE "users"."email" = ${req.session!.email}
              `
            )!.token
          }`
        );
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>CourseLore</title>`,
          html`
            <h1>
              Hi
              ${database.get<{ name: string }>(
                sql`SELECT "name" FROM "users" WHERE "email" = ${
                  req.session!.email
                }`
              )!.name},
            </h1>
            $${enrollmentsCount === 0
              ? html`
                  <p>
                    It looks like you’re new here. What would you like to do?
                  </p>
                  <p>
                    <a href="${app.get("url")}/courses/new"
                      ><strong>Create a new course</strong></a
                    >.
                  </p>
                  <p>
                    Or, to <strong>enroll on an existing course</strong>, you
                    either have to be invited or go to the course URL (it looks
                    something like
                    <code>${app.get("url")}/${newToken(10)}</code>).
                  </p>
                `
              : html`
                  <p>Here’s what’s going on with your courses:</p>
                  <ul>
                    $${database
                      .all<{ token: string; name: string; role: Role }>(
                        sql`
                        SELECT "courses"."token" AS "token", "courses"."name" AS "name", "enrollments"."role" AS "role"
                        FROM "courses"
                        JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
                        JOIN "users" ON "enrollments"."user" = "users"."id"
                        WHERE "users"."token" = ${req.session!.email}
                      `
                      )
                      .map(
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
                      At this point we’re just showing a list of courses in
                      which the person in enrolled. In the future we’d probably
                      like to show a news feed with relevant updates from all
                      courses.
                    </p>
                  </div>
                `}
          `
        )
      );
    });
  });

  authenticatedRouter.get<{}, HTML, {}, {}, {}>("/courses/new", (req, res) => {
    res.send(
      app.get("layout")(
        req,
        res,
        html`<title>Create a new course · CourseLore</title>`,
        html`
          <h1>Create a new course</h1>
          <form method="post" action="${app.get("url")}/courses">
            <p>
              <input
                type="text"
                name="name"
                placeholder="Course name…"
                required
              />
              <button>Create course</button>
            </p>
            <div class="TODO">
              <p>
                Ask more questions here, for example, what’s the person’s role
                in the course, how they’d like for other people to enroll
                (either by invitation or via a link), and so forth…
              </p>
            </div>
          </form>
        `
      )
    );
  });

  authenticatedRouter.post<{}, never, { name: string }, {}, {}>(
    "/courses",
    expressValidator.body("name").exists(),
    (req, res) => {
      const errors = expressValidator.validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json(errors.array() as any);

      const token = newToken(10);
      database.executeTransaction(() => {
        const courseId = database.run(
          sql`INSERT INTO "courses" ("token", "name") VALUES (${token}, ${req.body.name})`
        ).lastInsertRowid;
        database.run(
          sql`INSERT INTO "enrollments" ("user", "course", "role") VALUES (${
            database.get<{ id: number }>(
              sql`SELECT "id" FROM "users" WHERE "email" = ${
                req.session!.email
              }`
            )!.id
          }, ${courseId}, ${"instructor"})`
        );
      });
      res.redirect(`${app.get("url")}/${token}`);
    }
  );

  const unenrolledCourseRouter = express.Router();
  const enrolledCourseRouter = express.Router();

  authenticatedRouter.use<
    { token: string },
    unknown,
    {},
    {},
    { courseToken: string }
  >("/:token", (req, res, next) => {
    database.executeTransaction(() => {
      if (
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "courses" WHERE "token" = ${req.params.token}) AS "exists"`
        )!.exists === 0
      )
        next();
      else {
        res.locals.courseToken = req.params.token;
        if (
          database.get<{ exists: number }>(
            sql`
              SELECT EXISTS(
                SELECT 1
                FROM "enrollments"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                JOIN "courses" ON "enrollments"."course" = "courses"."id"
                WHERE "users"."email" = ${req.session!.email}
              ) AS "exists"
            `
          )!.exists === 0
        )
          unenrolledCourseRouter(req, res, next);
        else enrolledCourseRouter(req, res, next);
      }
    });
  });

  unenrolledCourseRouter.get<{}, HTML, {}, {}, { courseToken: string }>(
    "/",
    (req, res, next) => {
      const name = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "token" = ${res.locals.courseToken}`
      )!.name;
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>${name} · CourseLore</title>`,
          html`
            <h1>Enroll on ${name}</h1>
            <form method="post">
              <p>
                as
                <select name="role" required>
                  <option value="student">student</option>
                  <option value="assistant">assistant</option>
                  <option value="instructor">instructor</option>
                </select>
                <button>Enroll</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  // courseRouter.get<{}, HTML, {}, {}, {}>("/", (req, res) => {
  //   res.send(
  //     app.get("layout")(
  //       req,
  //       res,
  //       html`<title>${res.locals.course.name} · CourseLore</title>`,
  //       html`<h1>${res.locals.course.name}</h1>`
  //     )
  //   );
  // });

  /*
  app.get("/thread", (req, res) => {
    res.send(
      app.get("layout")(
        req,res,
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

  app.use<{}, HTML, {}, {}, {}>((req, res) => {
    res.send(
      app.get("layout")(
        req,
        res,
        html`<title>404 · CourseLore</title>`,
        html`<h1>404</h1>`
      )
    );
  });

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
  }): HTML {
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
      sql`INSERT INTO "emailQueue" ("to", "subject", "body") VALUES (${to}, ${subject}, ${body})`
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
          // app.disable("demonstration");
          break;
      }
      configuration = require(CONFIGURATION_FILE);
    }
    console.log(`Configuration loaded from ‘${CONFIGURATION_FILE}’`);
    await configuration(require);
  })();
