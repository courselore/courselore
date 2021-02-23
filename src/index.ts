#!/usr/bin/env node

import process from "process";
import path from "path";

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

import fs from "fs-extra";
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
                #83769c / darker #6e6382 #584f69
                #ff77a8
                #29adff
              */

              /* TODO: Do something about styling attacks in which the user just gives us input that’s too long and causes horizontal scrolls. */

              body {
                font-size: 14px;
                line-height: 1.5;
                font-family: "Public Sans", sans-serif;
                -webkit-text-size-adjust: 100%;
                max-width: 600px;
                padding: 0 1em;
                margin: 1em auto;
              }

              code {
                font-family: "Roboto Mono", monospace;
              }

              ::selection {
                color: white;
                background-color: #ff77a8;
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
                font-size: 0.857em;
                line-height: 1.3;
              }

              .demonstration,
              .TODO {
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

              input,
              textarea,
              button,
              .button {
                font-family: "Public Sans", sans-serif;
                font-size: 1em;
                line-height: 1.5;
                margin: 0;
              }

              input,
              textarea {
                background-color: white;
                border: 1px solid darkgray;
                border-radius: 10px;
                padding: 0.2em 1em;
              }

              input[type="text"],
              input[type="email"] {
                -webkit-appearance: none;
              }

              textarea {
                box-sizing: border-box;
                width: 100%;
                resize: vertical;
              }

              a,
              .a {
                text-decoration: underline;
                color: inherit;
                transition: color 0.2s;
              }

              a:hover,
              .a:hover {
                color: #ff77a8;
              }

              .undecorated,
              .button,
              nav a,
              nav .a {
                text-decoration: none;
              }

              button,
              .button {
                cursor: pointer;
                color: inherit;
                background-color: inherit;
                padding: 0;
                border: none;
              }

              button:not(.a),
              .button {
                color: white;
                background-color: #83769c;
                display: inline-block;
                padding: 0.2em 1em;
                border-radius: 10px;
                transition-duration: 0.2s;
                transition-property: color, background-color, border-color;
              }

              .button--outline {
                color: #83769c;
                background-color: inherit;
                border: 1px solid #83769c;
              }

              button:not(.a):hover,
              .button:hover {
                color: white;
                background-color: #6e6382;
                border-color: transparent;
              }

              button:not(.a):active,
              .button:active {
                color: white;
                background-color: #584f69;
                border-color: transparent;
              }

              :not(:checked) + .toggleable {
                display: none;
              }
            </style>
            $${head}
          </head>
          <body>
            $${body}
            <script>
              // TODO: Extract this into a library?
              const relativeTimeFormat = new Intl.RelativeTimeFormat("en", {
                numeric: "auto",
              });
              (function relativeTimes() {
                const now = new Date();
                for (const element of document.querySelectorAll(
                  "time.relative"
                )) {
                  const difference =
                    new Date(element.getAttribute("datetime")) - new Date();
                  const absoluteDifference = Math.abs(difference);
                  const minutes =
                    new Date().setMinutes(now.getMinutes() + 1) - now;
                  const hours = new Date().setHours(now.getHours() + 1) - now;
                  const days = new Date().setDate(now.getDate() + 1) - now;
                  const weeks = new Date().setDate(now.getDate() + 7) - now;
                  const months = new Date().setMonth(now.getMonth() + 1) - now;
                  const years =
                    new Date().setFullYear(now.getFullYear() + 1) - now;
                  const [value, unit] =
                    absoluteDifference < minutes
                      ? [0, "seconds"]
                      : absoluteDifference < hours
                      ? [difference / minutes, "minutes"]
                      : absoluteDifference < days
                      ? [difference / hours, "hours"]
                      : absoluteDifference < weeks
                      ? [difference / days, "days"]
                      : absoluteDifference < months
                      ? [difference / weeks, "weeks"]
                      : absoluteDifference < years
                      ? [difference / months, "months"]
                      : [difference / years, "years"];
                  element.innerText = relativeTimeFormat.format(
                    // TODO: Should this really be ‘round’, or should it be ‘floor/ceil’?
                    Math.round(value),
                    unit
                  );
                }
                window.setTimeout(relativeTimes, 60 * 1000);
              })();
            </script>
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
    ): HTML => {
      const user =
        req.session!.email === undefined
          ? undefined
          : database.get<{ name: string }>(
              sql`SELECT "name" FROM "users" WHERE "email" = ${
                req.session!.email
              }`
            )!;
      return app.get("layout base")(
        head,
        html`
          <header>
            <div
              style="
                display: flex;
                justify-content: space-between;
                align-items: center;
              "
            >
              <nav>
                <a
                  href="${app.get("url")}"
                  style="display: inline-flex;"
                  onmouseover="shouldAnimateLogo = true;"
                  onmouseout="shouldAnimateLogo = false;"
                >
                  $${logo}
                  <script>
                    const ANIMATION_SPEED = 0.001;
                    const ANIMATION_AMOUNT = 1;
                    const polyline = document.currentScript.previousElementSibling.querySelector(
                      "polyline"
                    );
                    const points = polyline
                      .getAttribute("points")
                      .split(" ")
                      .map(Number);
                    let shouldAnimateLogo = false;
                    let isAnimatingLogo = false;
                    let timeOffset = 0;
                    let lastTime = 0;
                    (function animateLogo(time) {
                      if (!isAnimatingLogo && shouldAnimateLogo) {
                        isAnimatingLogo = true;
                        timeOffset += time - lastTime;
                      }
                      if (isAnimatingLogo && !shouldAnimateLogo) {
                        isAnimatingLogo = false;
                        lastTime = time;
                      }
                      if (isAnimatingLogo)
                        polyline.setAttribute(
                          "points",
                          points
                            .map(
                              (coordinate, index) =>
                                coordinate +
                                Math.sin(
                                  (time - timeOffset) *
                                    ANIMATION_SPEED *
                                    Math.sin(index)
                                ) *
                                  ANIMATION_AMOUNT
                            )
                            .join(" ")
                        );
                      window.requestAnimationFrame(animateLogo);
                    })(0);
                  </script>
                  <span
                    style="
                      font-size: 1.5em;
                      font-weight: 800;
                      color: #83769c;
                      margin-left: 0.3em;
                    "
                    >CourseLore</span
                  >
                </a>
              </nav>
              <nav>
                $${user === undefined
                  ? html``
                  : html`
                      <label
                        for="toggle--signed-in-menu"
                        class="button"
                        style="
                          font-weight: 700;
                          text-align: center;
                          background-color: #ff77a8;
                          width: 30px;
                          height: 30px;
                          line-height: 30px;
                          padding: 0;
                          border-radius: 50%;
                        "
                      >
                        ${user.name[0]}
                      </label>
                    `}
              </nav>
            </div>
            $${user === undefined
              ? html``
              : html`
                  <input
                    type="checkbox"
                    id="toggle--signed-in-menu"
                    style="display: none;"
                  />
                  <div class="toggleable">
                    <nav>
                      ${user.name} ${`<${req.session!.email}>`}
                      <form method="post" action="${app.get("url")}/sign-out">
                        <button class="a">Sign out</button>
                      </form>
                    </nav>
                  </div>
                `}
          </header>
          <main>$${body}</main>
          <footer></footer>
        `
      );
    }
  );
  const logo = await fs.readFile(
    path.join(__dirname, "../public/logo.svg"),
    "utf-8"
  );
  app.set(
    "text processor",
    (text: string): HTML => textProcessor.processSync(text).toString()
  );
  // TODO: Convert references to other threads like ‘#57’ into links.
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
  await fs.ensureDir(path.join(rootDirectory, "data"));
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
        "reference" TEXT NOT NULL UNIQUE,
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

      CREATE TABLE "threads" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "course" INTEGER NOT NULL REFERENCES "courses",
        "reference" INTEGER NULL,
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "title" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );
    `,

    sql`
      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT DEFAULT CURRENT_TIMESTAMP,
        "thread" INTEGER NOT NULL REFERENCES "threads",
        "reference" INTEGER NOT NULL,
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        UNIQUE ("thread", "reference")
      );
    `,
  ]);

  await fs.ensureDir(path.join(rootDirectory, "var"));
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
  let cookieSecret = runtimeDatabase.get<{ value: string }>(
    sql`SELECT "value" FROM "settings" WHERE "key" = ${"cookieSecret"}`
  )?.value;
  if (cookieSecret === undefined) {
    cookieSecret = cryptoRandomString({ length: 60, type: "alphanumeric" });
    runtimeDatabase.run(
      sql`INSERT INTO "settings" ("key", "value") VALUES (${"cookieSecret"}, ${cookieSecret})`
    );
  }
  app.use(cookieSession({ secret: cookieSecret }));

  const isAuthenticated: (
    isAuthenticated: boolean
  ) => express.RequestHandler<{}, any, {}, {}, {}>[] = (isAuthenticated) => [
    (req, res, next) => {
      switch (isAuthenticated) {
        case false:
          if (req.session!.email !== undefined) return next("route");
          break;
        case true:
          if (req.session!.email === undefined) return next("route");
          if (
            database.get<{ exists: number }>(
              sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${
                req.session!.email
              }) AS "exists"`
            )!.exists === 0
          ) {
            delete req.session!.email;
            return next("route");
          }
          break;
      }
      next();
    },
  ];

  app.get<{}, HTML, {}, {}, {}>(
    ["/", "/authenticate"],
    ...isAuthenticated(false),
    (req, res) => {
      res.send(
        app.get("layout")(
          req,
          res,
          html`
            <title>CourseLore · The Open-Source Student Forum</title>
            <style>
              main {
                text-align: center;
              }
            </style>
          `,
          html`
            <p>
              <a href="${app.get("url")}/sign-in" class="button button--outline"
                >Sign in</a
              >
              <a href="${app.get("url")}/sign-up" class="button">Sign up</a>
            </p>
          `
        )
      );
    }
  );

  app.get<{}, HTML, {}, {}, {}>(
    ["/sign-up", "/sign-in"],
    ...isAuthenticated(false),
    (req, res) => {
      const preposition = req.path === "/sign-up" ? "up" : "in";
      const alternativePreposition = preposition === "up" ? "in" : "up";
      res.send(
        app.get("layout")(
          req,
          res,
          html`
            <title>Sign ${preposition} · CourseLore</title>
            <style>
              main {
                text-align: center;
              }
            </style>
          `,
          html`
            <h1>Sign ${preposition} to CourseLore</h1>
            <form method="post">
              <p>
                <input
                  name="email"
                  type="email"
                  placeholder="me@university.edu"
                  required
                  autofocus
                  size="30"
                />
              </p>
              <p><button>Continue</button></p>
            </form>
            <p>
              <small>
                ${preposition === "up"
                  ? "Already have an account?"
                  : "Don’t have an account yet?"}
                <a href="${app.get("url")}/sign-${alternativePreposition}"
                  >Sign ${alternativePreposition}</a
                >.
              </small>
            </p>
          `
        )
      );
    }
  );

  // TODO: Make more sophisticated use of expressValidator.
  app.post<{}, HTML, { email: string }, {}, {}>(
    ["/sign-up", "/sign-in"],
    ...isAuthenticated(false),
    expressValidator.body("email").isEmail(),
    (req, res) => {
      runtimeDatabase.run(
        sql`DELETE FROM "authenticationTokens" WHERE "email" = ${req.body.email}`
      );
      const newToken = cryptoRandomString({ length: 40, type: "numeric" });
      runtimeDatabase.run(
        sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${newToken}, ${req.body.email})`
      );

      const realPreposition =
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${req.body.email}) AS "exists"`
        )!.exists === 0
          ? "up"
          : "in";
      const magicLink = `${app.get("url")}/sign-${realPreposition}/${newToken}`;
      const sentEmail = sendEmail({
        to: req.body.email,
        subject: `Magic sign-${realPreposition} link`,
        body: html`
          <p><a href="${magicLink}">${magicLink}</a></p>
          <p><small>Expires in 10 minutes and may only be used once.</small></p>
        `,
      });

      const pretendPreposition = req.path === "/sign-up" ? "up" : "in";
      return res.send(
        app.get("layout")(
          req,
          res,
          html`<title>Sign ${pretendPreposition} · CourseLore</title>`,
          html`
            <p>
              To continue with sign ${pretendPreposition}, check
              ${req.body.email} and click on the magic
              sign-${pretendPreposition} link.
            </p>
            <form method="post">
              <p>
                <input type="hidden" name="email" value="${req.body.email}" />
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

  function getAuthenticationToken(
    token: string
  ): { email: string } | undefined {
    const authenticationToken = runtimeDatabase.get<{
      email: string;
      expiresAt: string;
    }>(
      sql`SELECT "email", "expiresAt" FROM "authenticationTokens" WHERE "token" = ${token}`
    );
    if (authenticationToken === undefined) return;
    runtimeDatabase.run(
      sql`DELETE FROM "authenticationTokens" WHERE "token" = ${token}`
    );
    if (new Date() < new Date(authenticationToken.expiresAt))
      return authenticationToken;
  }

  app.get<{ token: string }, HTML, {}, {}, {}>(
    ["/sign-up/:token", "/sign-in/:token"],
    ...isAuthenticated(false),
    (req, res) => {
      const authenticationToken = getAuthenticationToken(req.params.token);
      if (authenticationToken === undefined) {
        const preposition = req.path.startsWith("/sign-up") ? "up" : "in";
        return res.send(
          app.get("layout")(
            req,
            res,
            html`<title>Sign ${preposition} · CourseLore</title>`,
            html`
              <p>
                This magic sign-${preposition} link is invalid or has expired.
                <a href="${app.get("url")}/sign-${preposition}">Start over</a>.
              </p>
            `
          )
        );
      }
      if (
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${authenticationToken.email}) AS "exists"`
        )!.exists === 0
      ) {
        const newToken = cryptoRandomString({ length: 40, type: "numeric" });
        runtimeDatabase.run(
          sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${newToken}, ${authenticationToken.email})`
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
                  <input type="hidden" name="token" value="${newToken}" />
                  <input
                    type="text"
                    value="${authenticationToken.email}"
                    disabled
                  />
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

  app.post<{}, HTML, { token: string; name: string }, {}, {}>(
    "/users",
    ...isAuthenticated(false),
    expressValidator.body("token").exists(),
    expressValidator.body("name").exists(),
    (req, res) => {
      const authenticationToken = getAuthenticationToken(req.body.token);
      if (
        authenticationToken === undefined ||
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
      database.run(
        sql`INSERT INTO "users" ("email", "name") VALUES (${authenticationToken.email}, ${req.body.name})`
      );
      req.session!.email = authenticationToken.email;
      res.redirect(`${app.get("url")}/`);
    }
  );

  app.post<{}, any, {}, {}, {}>(
    "/sign-out",
    ...isAuthenticated(true),
    (req, res) => {
      delete req.session!.email;
      res.redirect(`${app.get("url")}/`);
    }
  );

  app.get<{}, HTML, {}, {}, {}>("/", ...isAuthenticated(true), (req, res) => {
    const enrollmentsCount = database.get<{ enrollmentsCount: number }>(
      sql`
        SELECT COUNT(*) AS "enrollmentsCount"
        FROM "enrollments"
        JOIN "users" ON "enrollments"."user" = "users"."id"
        WHERE "users"."email" = ${req.session!.email}
      `
    )!.enrollmentsCount;
    if (enrollmentsCount == 1)
      return res.redirect(
        `${app.get("url")}/${
          database.get<{ reference: string }>(
            sql`
              SELECT "courses"."reference" AS "reference"
              FROM "courses"
              JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
              JOIN "users" ON "enrollments"."user" = "users"."id"
              WHERE "users"."email" = ${req.session!.email}
            `
          )!.reference
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
                <p>It looks like you’re new here. What would you like to do?</p>
                <p>
                  <a href="${app.get("url")}/courses/new"
                    ><strong>Create a new course</strong></a
                  >.
                </p>
                <p>
                  Or, to <strong>enroll on an existing course</strong>, you
                  either have to be invited or go to the course URL (it looks
                  something like
                  <code
                    >${app.get("url")}/${cryptoRandomString({
                      length: 10,
                      type: "numeric",
                    })}</code
                  >).
                </p>
              `
            : html`
                <p>Here’s what’s going on with your courses:</p>
                <ul>
                  $${database
                    .all<{ reference: string; name: string; role: Role }>(
                      sql`
                        SELECT "courses"."reference" AS "reference", "courses"."name" AS "name", "enrollments"."role" AS "role"
                        FROM "courses"
                        JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
                        JOIN "users" ON "enrollments"."user" = "users"."id"
                        WHERE "users"."email" = ${req.session!.email}
                      `
                    )
                    .map(
                      ({ reference, name, role }) =>
                        html`<li>
                          <a href="${app.get("url")}/${reference}"
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

  app.get<{}, HTML, {}, {}, {}>(
    "/courses/new",
    ...isAuthenticated(true),
    (req, res) => {
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
    }
  );

  app.post<{}, any, { name: string }, {}, {}>(
    "/courses",
    ...isAuthenticated(true),
    expressValidator.body("name").exists(),
    (req, res) => {
      const newReference = cryptoRandomString({ length: 10, type: "numeric" });
      const courseId = database.run(
        sql`INSERT INTO "courses" ("reference", "name") VALUES (${newReference}, ${req.body.name})`
      ).lastInsertRowid;
      database.run(
        sql`INSERT INTO "enrollments" ("user", "course", "role") VALUES (${
          database.get<{ id: number }>(
            sql`SELECT "id" FROM "users" WHERE "email" = ${req.session!.email}`
          )!.id
        }, ${courseId}, ${"instructor"})`
      );
      res.redirect(`${app.get("url")}/${newReference}`);
    }
  );

  const courseExists: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {}
  >[] = [
    (req, res, next) => {
      if (
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "courses" WHERE "reference" = ${req.params.courseReference}) AS "exists"`
        )!.exists === 0
      )
        return next("route");
      next();
    },
  ];

  // TODO: Maybe put stuff like "courses"."id" & "courses"."name" into ‘locals’, ’cause we’ll need that often… (The same applies to user data…) (Or just extract auxiliary functions to do that… May be a bit less magic, as your data doesn’t just show up in the ‘locals’ because of some random middleware… Yeah, it’s more explicit this way…)
  const isCourseEnrolled: (
    isCourseEnrolled: boolean
  ) => express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {}
  >[] = (isCourseEnrolled) => [
    ...isAuthenticated(true),
    ...courseExists,
    (req, res, next) => {
      if (
        database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1
              FROM "enrollments"
              JOIN "users" ON "enrollments"."user" = "users"."id"
              JOIN "courses" ON "enrollments"."course" = "courses"."id"
              WHERE "users"."email" = ${req.session!.email} AND
                    "courses"."reference" = ${req.params.courseReference}
            ) AS "exists"
          `
        )!.exists !== (isCourseEnrolled ? 1 : 0)
      )
        return next("route");
      next();
    },
  ];

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/:courseReference",
    ...isCourseEnrolled(false),
    (req, res) => {
      const course = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>${course.name} · CourseLore</title>`,
          html`
            <h1>Enroll on ${course.name}</h1>
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

  app.post<{ courseReference: string }, any, { role: Role }, {}, {}>(
    "/:courseReference",
    ...isCourseEnrolled(false),
    expressValidator.body("role").isIn(ROLES as any),
    (req, res) => {
      database.run(
        sql`INSERT INTO "enrollments" ("user", "course", "role") VALUES (${
          database.get<{ id: number }>(
            sql`SELECT "id" FROM "users" WHERE "email" = ${req.session!.email}`
          )!.id
        }, ${
          database.get<{ id: number }>(
            sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
          )!.id
        }, ${req.body.role})`
      );
      res.redirect(`${app.get("url")}/${req.params.courseReference}`);
    }
  );

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/:courseReference",
    ...isCourseEnrolled(true),
    (req, res) => {
      const course = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>${course.name} · CourseLore</title>`,
          html`
            <h1>
              ${course.name}
              (${database.get<{ role: Role }>(
                sql`
                  SELECT "enrollments"."role" AS "role"
                  FROM "enrollments"
                  JOIN "users" ON "enrollments"."user" = "users"."id"
                  JOIN "courses" ON "enrollments"."course" = "courses"."id"
                  WHERE "courses"."reference" = ${
                    req.params.courseReference
                  } AND
                        "users"."email" = ${req.session!.email}
                `
              )!.role})
            </h1>
            <p>
              <a
                href="${app.get("url")}/${req.params
                  .courseReference}/threads/new"
                class="button"
                >New thread</a
              >
            </p>
            $${database
              .all<{
                createdAt: string;
                updatedAt: string;
                reference: string;
                authorName: string | undefined;
                title: string;
              }>(
                sql`
                  SELECT "threads"."createdAt" AS "createdAt",
                         "threads"."updatedAt" AS "updatedAt",
                         "threads"."reference" AS "reference",
                         "author"."name" AS "authorName",
                         "threads"."title" AS "title"
                  FROM "threads"
                  JOIN "courses" ON "threads"."course" = "courses"."id"
                  LEFT JOIN "enrollments" ON "threads"."author" = "enrollments"."id"
                  LEFT JOIN "users" AS "author" ON "enrollments"."user" = "author"."id"
                  WHERE "courses"."reference" = ${req.params.courseReference}
                  ORDER BY "threads"."reference" DESC
                `
              )
              .map(
                ({ createdAt, updatedAt, reference, authorName, title }) =>
                  html`
                    <p style="line-height: 1.2;">
                      <a
                        href="${app.get("url")}/${req.params
                          .courseReference}/threads/${reference}"
                        class="undecorated"
                        style="display: block;"
                      >
                        <strong>${title}</strong><br />
                        <small style="color: dimgray;">
                          #${reference} created $${relativeTime(createdAt)}
                          ${updatedAt !== createdAt
                            ? html` (and last updated
                              $${relativeTime(updatedAt)})`
                            : html``}
                          by ${authorName ?? "Ghost"}
                        </small>
                      </a>
                    </p>
                  `
              )}
            <div class="TODO">
              <ul>
                <li>Help instructor invite other users.</li>
              </ul>
            </div>
          `
        )
      );
    }
  );

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/:courseReference/threads/new",
    ...isCourseEnrolled(true),
    (req, res) => {
      const course = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>${course.name} · CourseLore</title>`,
          html`
            <h1>${course.name} · Create a new thread</h1>
            <form
              method="post"
              action="${app.get("url")}/${req.params.courseReference}/threads"
            >
              <p>
                <input
                  type="text"
                  name="title"
                  placeholder="Title…"
                  autocomplete="off"
                  style="box-sizing: border-box; width: 100%;"
                  required
                />
              </p>
              <textarea name="content" required></textarea>
              <p>
                <button>Create thread</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    { title: string; content: string },
    {},
    {}
  >(
    "/:courseReference/threads",
    ...isCourseEnrolled(true),
    expressValidator.body("title").exists(),
    expressValidator.body("content").exists(),
    (req, res) => {
      const newThreadReference =
        database.get<{ newThreadReference: number }>(sql`
          SELECT MAX("threads"."reference") + 1 AS "newThreadReference"
          FROM "threads"
          JOIN "courses" ON "threads"."course" = "courses"."id"
          WHERE "courses"."reference" = ${req.params.courseReference}
        `)?.newThreadReference ?? 1;
      database.run(sql`
        INSERT INTO "threads" ("course", "reference", "author", "title")
        VALUES (
          ${
            database.get<{ id: number }>(
              sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
            )!.id
          },
          ${newThreadReference},
          ${
            database.get<{ id: number }>(sql`
              SELECT "enrollments"."id" AS "id"
              FROM "enrollments"
              JOIN "users" ON "enrollments"."user" = "users"."id"
              JOIN "courses" ON "enrollments"."course" = "courses"."id"
              WHERE "courses"."reference" = ${req.params.courseReference} AND
                    "users"."email" = ${req.session!.email}
            `)!.id
          },
  ${req.body.title}
        )
      `);
      // TODO: Add the initial post.
      res.redirect(
        `${app.get("url")}/${
          req.params.courseReference
        }/threads/${newThreadReference}`
      );
    }
  );

  const threadAccessible: express.RequestHandler<
    { courseReference: string; threadReference: string },
    any,
    {},
    {},
    {}
  >[] = [
    ...isCourseEnrolled(true),
    (req, res, next) => {
      if (
        database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1
              FROM "threads"
              JOIN "courses" ON "threads"."course" = "courses"."id"
              WHERE "threads"."reference" = ${req.params.threadReference} AND
                    "courses"."reference" = ${req.params.courseReference}
            ) AS "exists"
          `
        )!.exists === 1
      )
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; threadReference: string },
    HTML,
    {},
    {},
    {}
  >(
    "/:courseReference/threads/:threadReference",
    ...threadAccessible,
    (req, res) => {
      const thread = database.get<{
        createdAt: string;
        updatedAt: string;
        title: string;
      }>(
        sql`
          SELECT "threads"."createdAt" AS "createdAt", "threads"."updatedAt" AS "updatedAt", "threads"."title" AS "title"
          FROM "threads"
          JOIN "courses" ON "threads"."course" = "courses"."id"
          WHERE "threads"."reference" = ${req.params.threadReference} AND
                "courses"."reference" = ${req.params.courseReference}
        `
      )!;
      res.send(
        app.get("layout")(
          req,
          res,
          html`<title>${thread.title} · CourseLore</title>`,
          html`
            <h1>${thread.title}</h1>
            <div class="TODO">
              <ul>
                <li>
                  Show more information about the thread (author,
                  creation/update time, and so forth).
                </li>
                <li>Show posts.</li>
                <li>Add editor for creating a new post.</li>
              </ul>
            </div>
          `
        )
      );
    }
  );

  app.post<{}, HTML, { text: string }, {}, {}>(
    "/preview",
    ...isAuthenticated(true),
    expressValidator.body("text").exists(),
    (req, res) => {
      res.send(app.get("text processor")(req.body.text));
    }
  );

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

  function relativeTime(time: string): HTML {
    const timeString = new Date(time).toISOString();
    return html`<time
      datetime="${timeString}"
      title="${timeString}"
      class="relative"
      >at ${timeString}</time
    >`;
  }

  return app;
}

if (require.main === module)
  (async () => {
    console.log(`CourseLore/${VERSION}`);

    const CONFIGURATION_FILE = path.resolve(
      process.argv[2] ?? path.join(process.cwd(), "configuration.js")
    );

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
          await fs.ensureDir(path.dirname(CONFIGURATION_FILE));
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
