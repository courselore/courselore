#!/usr/bin/env node

import path from "path";

import express from "express";
import methodOverride from "method-override";
import cookieSession from "cookie-session";
import validator from "validator";

import { Database, sql } from "@leafac/sqlite";
import databaseMigrate from "@leafac/sqlite-migration";

import { html, HTML } from "@leafac/html";
import { css, process as processCSS } from "@leafac/css";
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

const VERSION = require("../package.json").version;

export default async function courselore(
  rootDirectory: string
): Promise<express.Express> {
  const app = express();

  app.set("url", "http://localhost:4000");
  app.set("administrator", "mailto:demonstration-development@courselore.org");

  app.enable("demonstration");

  app.set(
    "layout base",
    (
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ): HTML =>
      processCSS(html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
            <meta name="generator" content="CourseLore/${VERSION}" />
            <meta name="description" content="The Open-Source Student Forum" />
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
            $${head}
          </head>
          <body
            style="${css`
              @at-root {
                /*
                  https://pico-8.fandom.com/wiki/Palette
                  #83769c / darker #6e6382 #584f69
                  #ff77a8 / darker #e66c98 #cc6088
                  #29adff
                */

                body {
                  font-size: 14px;
                  line-height: 1.5;
                  font-family: "Public Sans", sans-serif;
                  -webkit-text-size-adjust: 100%;
                  margin: 0;
                  overflow-wrap: break-word;
                }

                code {
                  font-family: "Roboto Mono", monospace;
                }

                ::selection {
                  color: #ffffffd4;
                  background-color: #ff77a8;
                }

                img,
                svg {
                  max-width: 100%;
                  height: auto;
                }

                h1 {
                  line-height: 1.3;
                  font-size: large;
                  font-weight: 800;
                  margin-top: 1.5em;
                }

                pre,
                div.math-display {
                  overflow-wrap: normal;
                  overflow: auto;
                }

                pre {
                  line-height: 1.3;
                }

                div.demonstration,
                div.TODO,
                input[type="text"],
                input[type="email"],
                textarea,
                select {
                  border: 1px solid darkgray;
                  border-radius: 10px;
                  box-shadow: inset 0px 1px #ffffff22, 0px 1px #00000022;
                }

                div.demonstration,
                div.TODO {
                  background-color: whitesmoke;
                  box-sizing: border-box;
                  padding: 0 1em;

                  @media (prefers-color-scheme: dark) {
                    background-color: #444444;
                  }
                }

                div.TODO::before {
                  content: "TODO";
                  font-weight: bold;
                  display: block;
                  margin-top: 0.5em;
                }

                label small.hint {
                  color: gray;
                  line-height: 1.3;
                  display: block;
                  margin-top: 0.5em;
                }

                input[type="text"],
                input[type="email"],
                textarea,
                select,
                button {
                  font-family: "Public Sans", sans-serif;
                  font-size: 1em;
                  line-height: 1.5;
                  margin: 0;
                  outline: none;
                }

                input[type="text"],
                input[type="email"],
                textarea,
                select {
                  color: inherit;
                  background-color: transparent;
                  box-sizing: border-box;
                  width: 100%;
                  transition: border-color 0.2s;

                  &:focus {
                    border-color: #ff77a8;
                  }
                }

                input[type="text"],
                input[type="email"],
                select {
                  padding: 0.2em 1em;
                  -webkit-appearance: none;

                  &:disabled {
                    cursor: not-allowed;
                  }
                }

                textarea {
                  padding: 0.5em 1em;
                  resize: vertical;
                }

                ::-webkit-resizer {
                  display: none;
                }

                select {
                  text-align-last: center;
                  padding-right: 2em;
                }

                .select-wrapper::after {
                  content: "▾";
                  position: absolute;
                  transform: translate(-1.5em, 4px);
                }

                a,
                button.a,
                summary {
                  transition: color 0.2s;

                  &:hover {
                    color: #ff77a8;
                  }
                }

                a,
                button.a {
                  color: inherit;
                }

                button.a {
                  text-decoration: underline;
                  background-color: inherit;
                  display: inline;
                  padding: 0;
                  border: none;
                }

                a.undecorated,
                a.button,
                button.a.undecorated {
                  text-decoration: none;
                }

                button.undecorated {
                  color: inherit;
                  background-color: inherit;
                  padding: 0;
                  border: 0;
                }

                select,
                button {
                  cursor: pointer;
                }

                a.button {
                  display: inline-block;
                }

                button:not(.undecorated):not(.a),
                a.button {
                  color: #ffffffd4;
                  background-color: #83769c;
                  padding: 0.2em 1em;
                  border: 1px solid #83769c;
                  border-radius: 10px;
                  box-shadow: inset 0px 1px #ffffff22, 0px 1px #00000022;
                  transition-property: color, background-color, border-color;
                  transition-duration: 0.2s;

                  @media (prefers-color-scheme: dark) {
                    background-color: #584f69;
                    border-color: #584f69;
                  }

                  &.outline {
                    color: #83769c;
                    background-color: transparent;
                  }

                  &:hover {
                    color: #ffffffd4;
                    background-color: #6e6382;
                  }

                  &:active {
                    color: #ffffffd4;
                    background-color: #584f69;
                  }

                  &:disabled {
                    color: gray;
                    background-color: whitesmoke;
                    border-color: gray;
                    cursor: wait;
                  }
                }

                summary {
                  margin: 1em 0;
                  outline: none;
                  cursor: pointer;

                  details[open] > & {
                    color: #ff77a8;
                  }
                }

                hr {
                  border: none;
                  border-top: 1px solid silver;

                  @media (prefers-color-scheme: dark) {
                    border-color: black;
                  }
                }

                .dim {
                  color: gray;
                }

                [hidden] {
                  display: none !important;
                }

                @media (prefers-color-scheme: light) {
                  body {
                    color: #000000d4;
                  }

                  .dark {
                    display: none;
                  }
                }

                @media (prefers-color-scheme: dark) {
                  body {
                    color: #ffffffd4;
                    background-color: #1e1e1e;
                  }

                  .light {
                    display: none;
                  }
                }
              }
            `}"
          >
            $${body}
            <script src="${app.get(
                "url"
              )}/node_modules/validator/validator.min.js"></script>
            <script>
              (() => {
                // TODO: Extract this into a library?
                // TODO: Maybe use relative times more selectively? Copy whatever Mail.app & GitHub are doing…
                const RELATIVE_TIME_FORMAT = new Intl.RelativeTimeFormat("en", {
                  numeric: "auto",
                });
                const MINUTES = 60 * 1000;
                const HOURS = 60 * MINUTES;
                const DAYS = 24 * HOURS;
                const WEEKS = 7 * DAYS;
                const MONTHS = 30 * DAYS;
                const YEARS = 365 * DAYS;
                (function relativeTimes() {
                  for (const element of document.querySelectorAll(
                    "time.relative"
                  )) {
                    const difference =
                      new Date(element.getAttribute("datetime")) - new Date();
                    const absoluteDifference = Math.abs(difference);
                    const [value, unit] =
                      absoluteDifference < MINUTES
                        ? [0, "seconds"]
                        : absoluteDifference < HOURS
                        ? [difference / MINUTES, "minutes"]
                        : absoluteDifference < DAYS
                        ? [difference / HOURS, "hours"]
                        : absoluteDifference < WEEKS
                        ? [difference / DAYS, "days"]
                        : absoluteDifference < MONTHS
                        ? [difference / WEEKS, "weeks"]
                        : absoluteDifference < YEARS
                        ? [difference / MONTHS, "months"]
                        : [difference / YEARS, "years"];
                    element.textContent = RELATIVE_TIME_FORMAT.format(
                      // TODO: Should this really be ‘round’, or should it be ‘floor/ceil’?
                      Math.round(value),
                      unit
                    );
                  }
                  window.setTimeout(relativeTimes, 60 * 1000);
                })();
              })();

              function isValid(element) {
                if (element.matches("form")) {
                  let isDescendantsValid = true;
                  for (const descendant of element.querySelectorAll("*"))
                    isDescendantsValid &&= isValid(descendant);
                  return isDescendantsValid;
                }

                let shouldResetCustomValidity = false;
                if (
                  element.matches("[required]") &&
                  validator.isEmpty(element.value, {
                    ignore_whitespace: true,
                  })
                ) {
                  shouldResetCustomValidity = true;
                  element.setCustomValidity("Fill out this field");
                }

                if (
                  element.matches('[type="email"]') &&
                  !validator.isEmail(element.value)
                ) {
                  shouldResetCustomValidity = true;
                  element.setCustomValidity("Enter an email address");
                }

                if (
                  element.matches("[data-validator]") &&
                  !validator[element.dataset.validator](element.value)
                ) {
                  shouldResetCustomValidity = true;
                  element.setCustomValidity("This field is invalid");
                }

                if (element.matches("[data-validator-custom]")) {
                  shouldResetCustomValidity = true;
                  const validationResult = new Function(
                    element.dataset.validatorCustom
                  ).bind(element)();
                  if (validationResult === false)
                    element.setCustomValidity("This field is invalid");
                  if (typeof validationResult === "string")
                    element.setCustomValidity(validationResult);
                }

                if (shouldResetCustomValidity)
                  element.addEventListener(
                    "input",
                    () => {
                      element.setCustomValidity("");
                    },
                    { once: true }
                  );

                return typeof element.reportValidity === "function"
                  ? element.reportValidity()
                  : true;
              }

              document.body.addEventListener(
                "submit",
                (event) => {
                  if (isValid(event.target))
                    for (const button of event.target.querySelectorAll(
                      'button:not([type="button"])'
                    ))
                      button.disabled = true;
                  else event.preventDefault();
                },
                true
              );
            </script>
          </body>
        </html>
      `)
  );

  function logo(): HTML {
    return html`
      <a
        href="${app.get("url")}/"
        class="undecorated"
        style="${css`
          display: inline-flex;
          align-items: center;

          & > * + * {
            margin-left: 0.5em;
          }
        `}"
      >
        $${logoSVG}
        <script>
          (() => {
            const logo = document.currentScript.parentElement;
            let animationFrame;
            let timeOffset = 0;
            logo.addEventListener("mouseover", () => {
              timeOffset += performance.now();
              animationFrame = window.requestAnimationFrame(animate);
            });
            logo.addEventListener("mouseout", () => {
              timeOffset -= performance.now();
              window.cancelAnimationFrame(animationFrame);
            });
            const polyline = logo.querySelector("polyline");
            const points = polyline
              .getAttribute("points")
              .split(" ")
              .map(Number);
            function animate(time) {
              time -= timeOffset;
              polyline.setAttribute(
                "points",
                points
                  .map(
                    (coordinate, index) =>
                      coordinate + Math.sin(time * 0.0005 * (index % 7))
                  )
                  .join(" ")
              );
              animationFrame = window.requestAnimationFrame(animate);
            }
          })();
        </script>
        <span
          style="${css`
            font-size: large;
            font-weight: 800;
          `}"
          >CourseLore</span
        >
      </a>
    `;
  }

  const logoSVG = await fs.readFile(
    path.join(__dirname, "../public/logo.svg"),
    "utf-8"
  );

  app.set(
    "text processor",
    (text: string): HTML => textProcessor.processSync(text).toString()
  );
  // TODO: Convert references to other threads like ‘#57’ and ‘#43/2’ into links.
  // TODO: Extract this into a library?
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
      highlighter: {
        light: await shiki.getHighlighter({ theme: "light-plus" }),
        dark: await shiki.getHighlighter({ theme: "dark-plus" }),
      },
    })
    .use(rehypeKatex, { maxSize: 25, maxExpand: 10 })
    .use(rehypeStringify);

  const ROLES = ["staff", "student"] as const;
  type Role = typeof ROLES[number];
  const ACCENT_COLORS = [
    "#83769c",
    "#ff77a8",
    "#29adff",
    "#ffa300",
    "#ff004d",
    "#7e2553",
    "#008751",
    "#ab5236",
    "#1d2b53",
    "#5f574f",
  ] as const;
  type AccentColor = typeof ACCENT_COLORS[number];

  await fs.ensureDir(rootDirectory);
  const database = new Database(path.join(rootDirectory, "courselore.db"));
  app.set("database", database);
  databaseMigrate(database, [
    sql`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "email" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL
      );

      CREATE TABLE "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reference" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL
      );

      CREATE TABLE "enrollments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "user" INTEGER NOT NULL REFERENCES "users",
        "course" INTEGER NOT NULL REFERENCES "courses",
        "role" TEXT NOT NULL CHECK ("role" IN ('staff', 'student')),
        "accentColor" TEXT NOT NULL CHECK ("accentColor" IN ('#83769c', '#ff77a8', '#29adff', '#ffa300', '#ff004d', '#7e2553', '#008751', '#ab5236', '#1d2b53', '#5f574f')),
        UNIQUE ("user", "course")
      );

      CREATE TABLE "threads" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "course" INTEGER NOT NULL REFERENCES "courses",
        "reference" TEXT NOT NULL,
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "title" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );

      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "thread" INTEGER NOT NULL REFERENCES "threads",
        "reference" TEXT NOT NULL,
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        UNIQUE ("thread", "reference")
      );

      CREATE TABLE "settings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL
      );

      CREATE TABLE "authenticationTokens" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TEXT NOT NULL DEFAULT (datetime('now', '+10 minutes')),
        "token" TEXT NOT NULL UNIQUE,
        "email" TEXT NOT NULL UNIQUE
      );

      CREATE TABLE "emailQueue" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "attemptedAt" TEXT NOT NULL DEFAULT (json_array()) CHECK (json_valid("attemptedAt")),
        "tryAfter" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "attempts" INTEGER NOT NULL DEFAULT 0,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL
      );
    `,
  ]);

  app.use(express.static(path.join(__dirname, "../public")));
  app.use(express.urlencoded({ extended: true }));
  app.use(methodOverride("_method"));

  app.set(
    "cookie secret",
    database.get<{ value: string }>(
      sql`SELECT "value" FROM "settings" WHERE "key" = ${"cookieSecret"}`
    )?.value
  );
  if (app.get("cookie secret") === undefined) {
    app.set(
      "cookie secret",
      cryptoRandomString({ length: 60, type: "alphanumeric" })
    );
    database.run(
      sql`
        INSERT INTO "settings" ("key", "value")
        VALUES (${"cookieSecret"}, ${app.get("cookie secret")})
      `
    );
  }
  app.use(
    cookieSession({
      maxAge: 365 * 24 * 60 * 60 * 1000,
      secret: app.get("cookie secret"),
    })
  );

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

  app.set(
    "layout unauthenticated",
    (
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ): HTML =>
      app.get("layout base")(
        req,
        res,
        head,
        html`
          <div
            style="${css`
              max-width: 600px;
              margin: 0 auto;
            `}"
          >
            <header>
              <p
                style="${css`
                  text-align: center;
                `}"
              >
                $${logo()}
              </p>
            </header>
            <main>$${body}</main>
          </div>
        `
      )
  );

  app.get<{}, HTML, {}, {}, {}>(
    ["/", "/authenticate"],
    ...isAuthenticated(false),
    (req, res) => {
      res.send(
        app.get("layout unauthenticated")(
          req,
          res,
          html`<title>CourseLore · The Open-Source Student Forum</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <p>
                <a href="${app.get("url")}/sign-in" class="button outline"
                  >Sign in</a
                >
                <a href="${app.get("url")}/sign-up" class="button">Sign up</a>
              </p>
            </div>
          `
        )
      );
    }
  );

  app.get<{}, HTML, {}, { redirect?: string }, {}>(
    ["/sign-up", "/sign-in"],
    ...isAuthenticated(false),
    (req, res) => {
      const preposition = req.path === "/sign-up" ? "up" : "in";
      const alternativePreposition = preposition === "up" ? "in" : "up";
      res.send(
        app.get("layout unauthenticated")(
          req,
          res,
          html`<title>Sign ${preposition} · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>Sign ${preposition}</h1>
              <form
                method="POST"
                style="${css`
                  max-width: 300px;
                  margin: 0 auto;
                  text-align: left;
                `}"
              >
                <p>
                  <label>
                    <strong>Email</strong><br />
                    <input
                      type="email"
                      name="email"
                      placeholder="name@educational-email.edu"
                      required
                      autofocus
                    />
                    $${preposition === "up"
                      ? html`
                          <br />
                          <small class="hint">
                            We suggest using the email address you use at your
                            educational institution.
                          </small>
                        `
                      : html``}
                  </label>
                </p>
                <p
                  style="${css`
                    text-align: center;
                  `}"
                >
                  <button>Continue</button>
                </p>
              </form>
              <p>
                <small>
                  ${preposition === "up"
                    ? "Already have an account?"
                    : "Don’t have an account yet?"}
                  <a
                    href="${app.get(
                      "url"
                    )}/sign-${alternativePreposition}${new URL(
                      req.originalUrl,
                      app.get("url")
                    ).search}"
                    >Sign ${alternativePreposition}</a
                  >.
                </small>
              </p>
            </div>
          `
        )
      );
    }
  );

  function newAuthenticationToken(email: string): { token: string } {
    database.run(
      sql`DELETE FROM "authenticationTokens" WHERE "email" = ${email}`
    );
    const token = cryptoRandomString({ length: 40, type: "numeric" });
    database.run(
      sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${token}, ${email})`
    );
    return { token };
  }

  app.post<{}, HTML, { email?: string }, { redirect?: string }, {}>(
    ["/sign-up", "/sign-in"],
    ...isAuthenticated(false),
    (req, res) => {
      if (
        typeof req.body.email !== "string" ||
        !validator.isEmail(req.body.email)
      )
        throw new ValidationError();

      const authenticationToken = newAuthenticationToken(req.body.email);
      const realPreposition =
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${req.body.email}) AS "exists"`
        )!.exists === 0
          ? "up"
          : "in";
      const magicLink = `${app.get("url")}/sign-${realPreposition}/${
        authenticationToken.token
      }${new URL(req.originalUrl, app.get("url")).search}`;
      const sentEmail = sendEmail({
        to: req.body.email,
        subject: `Magic sign-${realPreposition} link`,
        body: html`
          <p><a href="${magicLink}">${magicLink}</a></p>
          <p><small>Expires in 10 minutes and may only be used once.</small></p>
        `,
      });

      const pretendPreposition = req.path === "/sign-up" ? "up" : "in";
      res.send(
        app.get("layout unauthenticated")(
          req,
          res,
          html`<title>Sign ${pretendPreposition} · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <p>
                To continue with sign ${pretendPreposition}, check
                ${req.body.email} and click on the magic
                sign-${pretendPreposition} link.
              </p>
              <form method="POST">
                <input type="hidden" name="email" value="${req.body.email}" />
                <p>
                  <small>
                    Didn’t receive the email? Already checked the spam folder?
                    <button class="a">Resend</button>.
                  </small>
                </p>
              </form>
            </div>
            $${sentEmail}
          `
        )
      );
    }
  );

  function getAuthenticationToken(
    token: string
  ): { email: string } | undefined {
    const authenticationToken = database.get<{
      email: string;
    }>(
      sql`SELECT "email" FROM "authenticationTokens" WHERE "token" = ${token} AND CURRENT_TIMESTAMP < "expiresAt"`
    );
    database.run(
      sql`DELETE FROM "authenticationTokens" WHERE "token" = ${token}`
    );
    return authenticationToken;
  }

  // TODO: What should happen if the person clicks on a magic link but they’re already authenticated?
  app.get<{ token: string }, HTML, {}, { redirect?: string }, {}>(
    ["/sign-up/:token", "/sign-in/:token"],
    ...isAuthenticated(false),
    (req, res) => {
      const search = new URL(req.originalUrl, app.get("url")).search;
      const originalAuthenticationToken = getAuthenticationToken(
        req.params.token
      );
      if (originalAuthenticationToken === undefined) {
        const preposition = req.path.startsWith("/sign-up") ? "up" : "in";
        return res.send(
          app.get("layout unauthenticated")(
            req,
            res,
            html`<title>Sign ${preposition} · CourseLore</title>`,
            html`
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <p>
                  This magic sign-${preposition} link is invalid or has expired.
                  <a href="${app.get("url")}/sign-${preposition}${search}"
                    >Start over</a
                  >.
                </p>
              </div>
            `
          )
        );
      }
      if (
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${originalAuthenticationToken.email}) AS "exists"`
        )!.exists === 0
      ) {
        const aNewAuthenticationToken = newAuthenticationToken(
          originalAuthenticationToken.email
        );
        return res.send(
          app.get("layout unauthenticated")(
            req,
            res,
            html`<title>Sign up · CourseLore</title>`,
            html`
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <h1>Welcome to CourseLore!</h1>
                <form
                  method="POST"
                  action="${app.get("url")}/users${search}"
                  style="${css`
                    max-width: 300px;
                    margin: 0 auto;
                    text-align: left;
                  `}"
                >
                  <input
                    type="hidden"
                    name="token"
                    value="${aNewAuthenticationToken.token}"
                  />
                  <p>
                    <label>
                      <strong>Name</strong><br />
                      <input type="text" name="name" required autofocus />
                    </label>
                  </p>
                  <p>
                    <label>
                      <strong>Email</strong><br />
                      <input
                        type="email"
                        value="${originalAuthenticationToken.email}"
                        disabled
                      />
                    </label>
                  </p>
                  <p
                    style="${css`
                      text-align: center;
                    `}"
                  >
                    <button>Create account</button>
                  </p>
                </form>
              </div>

              <div class="TODO">
                <p>Ask for more user information here. But what?</p>
              </div>
            `
          )
        );
      }
      req.session!.email = originalAuthenticationToken.email;
      res.redirect(`${app.get("url")}${req.query.redirect ?? "/"}`);
    }
  );

  app.post<
    {},
    HTML,
    { token?: string; name?: string },
    { redirect?: string },
    {}
  >("/users", ...isAuthenticated(false), (req, res) => {
    if (
      typeof req.body.token !== "string" ||
      validator.isEmpty(req.body.token, { ignore_whitespace: true }) ||
      typeof req.body.name !== "string" ||
      validator.isEmpty(req.body.name, { ignore_whitespace: true })
    )
      throw new ValidationError();

    const authenticationToken = getAuthenticationToken(req.body.token);
    if (
      authenticationToken === undefined ||
      database.get<{ exists: number }>(
        sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${authenticationToken.email}) AS "exists"`
      )!.exists === 1
    )
      return res.send(
        app.get("layout unauthenticated")(
          req,
          res,
          html`<title>Sign up · CourseLore</title>`,
          html`
            <p>
              Something went wrong in your sign up.
              <a
                href="${app.get("url")}/sign-up${new URL(
                  req.originalUrl,
                  app.get("url")
                ).search}"
                >Start over</a
              >.
            </p>
          `
        )
      );
    database.run(
      sql`INSERT INTO "users" ("email", "name") VALUES (${authenticationToken.email}, ${req.body.name})`
    );
    req.session!.email = authenticationToken.email;
    res.redirect(`${app.get("url")}${req.query.redirect ?? "/"}`);
  });

  app.post<{}, any, {}, {}, {}>(
    "/sign-out",
    ...isAuthenticated(true),
    (req, res) => {
      delete req.session!.email;
      res.redirect(`${app.get("url")}/`);
    }
  );

  app.set(
    "layout authenticated",
    (
      req: express.Request<{ courseReference?: string }, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ): HTML => {
      const user = database.get<{ id: number; name: string }>(
        sql`SELECT "id", "name" FROM "users" WHERE "email" = ${
          req.session!.email
        }`
      )!;

      const enrollment =
        req.params.courseReference === undefined
          ? undefined
          : database.get<{ accentColor: AccentColor }>(
              sql`
                SELECT "enrollments"."accentColor"
                FROM "enrollments"
                JOIN "courses" ON "enrollments"."course" = "courses"."id"
                WHERE "enrollments"."user" = ${user.id} AND
                      "courses"."reference" = ${req.params.courseReference}
              `
            )!;

      return app.get("layout base")(
        req,
        res,
        head,
        html`
          <div
            style="${css`
              ${enrollment === undefined
                ? css``
                : css`
                    border-top: 10px solid ${enrollment.accentColor};
                  `}
            `}"
          >
            <div
              style="${css`
                max-width: 600px;
                margin: 0 auto;
              `}"
            >
              <header>$${logoAndMenu(req, res)}</header>
              <main>$${body}</main>
            </div>
          </div>
        `
      );
    }
  );

  function logoAndMenu(
    req: express.Request<{ courseReference?: string }, HTML, {}, {}, {}>,
    res: express.Response<HTML, {}>
  ): HTML {
    const user = database.get<{ name: string }>(
      sql`SELECT "name" FROM "users" WHERE "email" = ${req.session!.email}`
    )!;

    const course =
      req.params.courseReference === undefined
        ? undefined
        : database.get<{ id: number; name: string }>(
            sql`SELECT "id", "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
          )!;

    return html`
      <div
        style="${css`
          display: flex;
          align-items: center;
          justify-content: space-between;
        `}"
      >
        <p>$${logo()}</p>
        <details>
          <summary
            style="${css`
              list-style: none;

              &::-webkit-details-marker {
                display: none;
              }

              & line {
                transition: stroke 0.2s;
              }

              &:hover line,
              details[open] > & line {
                stroke: #ff77a8;
              }

              details[open] > &::before {
                content: "";
                display: block;
                position: absolute;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vw;
              }
            `}"
          >
            <svg width="20" height="20" viewBox="0 0 20 20">
              <g stroke="gray" stroke-width="2" stroke-linecap="round">
                <line x1="3" y1="5" x2="17" y2="5" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="15" x2="17" y2="15" />
              </g>
            </svg>
          </summary>
          <div
            style="${css`
              background-color: whitesmoke;
              max-width: 300px;
              padding: 0.5em 1em;
              border: 1px solid darkgray;
              border-radius: 10px;
              box-shadow: inset 0px 1px #ffffff22, 0px 1px #00000022;
              position: absolute;
              transform: translate(calc(-100% + 35px), -15px);

              @media (prefers-color-scheme: dark) {
                background-color: #444444;
              }

              &::before {
                content: "";
                background-color: whitesmoke;
                display: block;
                width: 10px;
                height: 10px;
                position: absolute;
                right: 19px;
                top: -6px;
                transform: rotate(45deg);
                border: 1px solid darkgray;
                border-right: none;
                border-bottom: none;
                border-top-left-radius: 5px;
                box-shadow: inset 1px 1px #ffffff22;

                @media (prefers-color-scheme: dark) {
                  background-color: #444444;
                }
              }

              p {
                margin: 0;
              }
            `}"
          >
            <p
              style="${css`
                line-height: 1;
              `}"
            >
              <strong>${user.name}</strong><br />
              <small class="dim">${req.session!.email}</small>
            </p>
            <hr />
            $${course === undefined
              ? html``
              : html`
                  <p>
                    <a
                      href="${app.get("url")}/courses/${req.params
                        .courseReference}/settings"
                      class="undecorated"
                      >Course settings</a
                    >
                  </p>
                  <hr />
                `}
            <p>
              <a href="${app.get("url")}/courses/new" class="undecorated"
                >New course</a
              >
            </p>
            <hr />
            <form method="POST" action="${app.get("url")}/sign-out">
              <p>
                <a href="${app.get("url")}/settings" class="undecorated"
                  >Settings</a
                ><br />
                <button class="a undecorated">Sign out</button>
              </p>
            </form>
          </div>
        </details>
      </div>
    `;
  }

  app.get<{}, HTML, {}, {}, {}>("/", ...isAuthenticated(true), (req, res) => {
    const user = database.get<{ name: string }>(
      sql`SELECT "name" FROM "users" WHERE "email" = ${req.session!.email}`
    )!;

    const courses = database.all<{
      reference: string;
      name: string;
      role: Role;
      accentColor: AccentColor;
    }>(
      sql`
        SELECT "courses"."reference", "courses"."name", "enrollments"."role", "enrollments"."accentColor"
        FROM "courses"
        JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
        JOIN "users" ON "enrollments"."user" = "users"."id"
        WHERE "users"."email" = ${req.session!.email}
        ORDER BY "enrollments"."id" DESC
      `
    );

    switch (courses.length) {
      case 0:
        return res.send(
          app.get("layout authenticated")(
            req,
            res,
            html`<title>CourseLore</title>`,
            html`
              <h1>Hi ${user.name},</h1>
              <p><strong>Welcome to CourseLore!</strong></p>
              <p>
                To <strong>enroll on an existing course</strong> you either have
                to follow an invitation link or be invited via email. Contact
                your course staff for more information.
              </p>
              <p>
                Or you may
                <strong
                  ><a href="${app.get("url")}/courses/new"
                    >create a new course</a
                  ></strong
                >.
              </p>
            `
          )
        );

      case 1:
        return res.redirect(
          `${app.get("url")}/courses/${courses[0].reference}`
        );

      default:
        return res.send(
          app.get("layout authenticated")(
            req,
            res,
            html`<title>CourseLore</title>`,
            html`
              <div>
                <h1>Hi ${user.name},</h1>
                <p>Go to one of your courses:</p>
                $${courses.map(
                  (course) =>
                    html`
                      <p>
                        <a
                          href="${app.get("url")}/courses/${course.reference}"
                          class="undecorated"
                          ><span
                            style="${css`
                              display: inline-block;
                              width: 0.8em;
                              height: 0.8em;
                              background-color: ${course.accentColor};
                              border-radius: 50%;
                            `}"
                          ></span>
                          <strong>${course.name}</strong> (${course.role})</a
                        >
                      </p>
                    `
                )}
              </div>
            `
          )
        );
    }
  });

  app.get<{}, HTML, {}, {}, {}>(
    "/settings",
    ...isAuthenticated(true),
    (req, res) => {
      const user = database.get<{ name: string }>(
        sql`SELECT "name" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;

      res.send(
        app.get("layout authenticated")(
          req,
          res,
          html`<title>Settings · CourseLore</title>`,
          html`
            <h1>Settings</h1>

            <form
              method="POST"
              action="${app.get("url")}/settings?_method=PATCH"
              style="${css`
                display: flex;
                align-items: flex-end;

                & > * + * {
                  margin-left: 1em;
                }
              `}"
            >
              <p
                style="${css`
                  flex: 1;
                `}"
              >
                <label>
                  <strong>Name</strong><br />
                  <input
                    type="text"
                    name="name"
                    autocomplete="off"
                    required
                    value="${user.name}"
                  />
                </label>
              </p>
              <p>
                <button>Change name</button>
              </p>
            </form>

            <p>
              <label>
                <strong>Email</strong><br />
                <input
                  type="email"
                  value="${req.session!.email}"
                  disabled
                /><br />
                <small class="hint">
                  Your email is your identity in CourseLore and it can’t be
                  changed.
                </small>
              </label>
            </p>
          `
        )
      );
    }
  );

  app.patch<{}, any, { name?: string }, {}, {}>(
    "/settings",
    ...isAuthenticated(true),
    (req, res) => {
      if (typeof req.body.name === "string") {
        if (validator.isEmpty(req.body.name, { ignore_whitespace: true }))
          throw new ValidationError();
        database.run(
          sql`UPDATE "users" SET "name" = ${req.body.name} WHERE "email" = ${
            req.session!.email
          }`
        );
      }

      res.redirect(`${app.get("url")}/settings`);
    }
  );

  app.get<{}, HTML, {}, {}, {}>(
    "/courses/new",
    ...isAuthenticated(true),
    (req, res) => {
      res.send(
        app.get("layout authenticated")(
          req,
          res,
          html`<title>Create a new course · CourseLore</title>`,
          html`
            <h1>Create a new course</h1>
            <form method="POST" action="${app.get("url")}/courses">
              <p>
                <label>
                  <strong>Name</strong><br />
                  <input
                    type="text"
                    name="name"
                    autocomplete="off"
                    required
                    autofocus
                  />
                </label>
              </p>
              <p>
                <button>Create course</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  app.post<{}, any, { name?: string }, {}, {}>(
    "/courses",
    ...isAuthenticated(true),
    (req, res) => {
      if (
        typeof req.body.name !== "string" ||
        validator.isEmpty(req.body.name, { ignore_whitespace: true })
      )
        throw new ValidationError();

      const courseReference = cryptoRandomString({
        length: 10,
        type: "numeric",
      });
      const newCourseId = database.run(
        sql`INSERT INTO "courses" ("reference", "name") VALUES (${courseReference}, ${req.body.name})`
      ).lastInsertRowid;
      // TODO: Extract this into an auxiliary function to be used by the student enrollment routine as well.
      const user = database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;
      const accentColorsInUse = database
        .all<{ accentColor: AccentColor }>(
          sql`
            SELECT "accentColor"
            FROM "enrollments"
            WHERE "user" = ${user.id}
            GROUP BY "accentColor"
            ORDER BY MAX("id") DESC
          `
        )
        .map((enrollment) => enrollment.accentColor);
      let accentColorsAvailable = [...ACCENT_COLORS];
      for (const accentColorInUse of accentColorsInUse) {
        accentColorsAvailable = accentColorsAvailable.filter(
          (accentColorAvailable) => accentColorAvailable !== accentColorInUse
        );
        if (accentColorsAvailable.length === 1) break;
      }
      const accentColor = accentColorsAvailable[0];
      database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "role", "accentColor")
          VALUES (
            ${user.id},
            ${newCourseId},
            ${"staff"},
            ${accentColor}
          )
        `
      );
      res.redirect(`${app.get("url")}/courses/${courseReference}`);
    }
  );

  // TODO: Maybe put stuff like "courses"."id" & "courses"."name" into ‘locals’, ’cause we’ll need that often… (The same applies to user data…) (Or just extract auxiliary functions to do that… May be a bit less magic, as your data doesn’t just show up in the ‘locals’ because of some random middleware… Yeah, it’s more explicit this way…)
  const isCourseEnrolled: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {}
  >[] = [
    ...isAuthenticated(true),
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
        )!.exists === 0
      )
        return next("route");
      next();
    },
  ];

  function textEditor(): HTML {
    // FIXME: The screen flickers showing the “loading” pane for a split second if the server responds too fast. What to do about it? We can’t know that the server will respond too fast; but introducing an artificial delay seems like a bad idea too.
    return html`
      <div class="text-editor">
        <p
          style="${css`
            & > * + * {
              margin-left: 0.5em;
            }

            & > button {
              transition-duration: 0.2s;
              transition-property: font-weight, color;

              &:disabled {
                font-weight: bold;
                color: inherit;
              }

              &:not(:disabled):not(:hover) {
                color: gray;
              }
            }
          `}"
        >
          <button
            type="button"
            class="write a undecorated"
            disabled
            onclick="${javascript`
              const textEditor = this.closest("div.text-editor");
              textEditor.querySelector("div.preview").hidden = true;
              textEditor.querySelector("div.write").hidden = false;
              this.disabled = true;
              textEditor.querySelector("button.preview").disabled = false;
            `}"
          >
            Write
          </button>
          <button
            type="button"
            class="preview a undecorated"
            onclick="${javascript`
              (async () => {
                const textEditor = this.closest("div.text-editor");
                const textarea = textEditor.querySelector("textarea");
                if (!isValid(textarea)) return;
                this.disabled = true;
                const loading = textEditor.querySelector("div.loading");
                textEditor.querySelector("div.write").hidden = true;
                loading.hidden = false;
                const preview = textEditor.querySelector("div.preview");
                preview.innerHTML = await (
                  await fetch("${app.get("url")}/preview", {
                    method: "POST",
                    body: new URLSearchParams({ content: textarea.value }),
                  })
                ).text();
                loading.hidden = true;
                preview.hidden = false;
                textEditor.querySelector("button.write").disabled = false;
              })();
            `}"
          >
            Preview
          </button>
        </p>

        <div class="write">
          <p
            style="${css`
              margin-top: -0.8em;
            `}"
          >
            <textarea
              name="content"
              required
              rows="5"
              onkeypress="${javascript`
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                const form = this.closest("form");
                if (isValid(form)) form.submit();
              }
            `}"
            ></textarea>
            <br />
            <small
              class="dim"
              style="${css`
                display: block;
                text-align: right;
              `}"
            >
              <a
                href="https://guides.github.com/features/mastering-markdown/"
                target="_blank"
                class="undecorated"
                >Markdown</a
              >
              &
              <a
                href="https://katex.org/docs/supported.html"
                target="_blank"
                class="undecorated"
                >LaTeX</a
              >
              are supported
            </small>
          </p>
        </div>

        $${loading()}

        <div class="preview" hidden></div>
      </div>
    `;
  }

  app.post<{}, HTML, { content?: string }, {}, {}>(
    "/preview",
    ...isAuthenticated(true),
    (req, res) => {
      if (
        typeof req.body.content !== "string" ||
        validator.isEmpty(req.body.content, { ignore_whitespace: true })
      )
        throw new ValidationError();

      res.send(app.get("text processor")(req.body.content));
    }
  );

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/courses/:courseReference",
    ...isCourseEnrolled,
    (req, res) => {
      const thread = database.get<{
        reference: string;
      }>(
        sql`
          SELECT "threads"."reference"
          FROM "threads"
          JOIN "courses" ON "threads"."course" = "courses"."id"
          WHERE "courses"."reference" = ${req.params.courseReference}
          ORDER BY CAST("threads"."reference" AS INTEGER) DESC
          LIMIT 1
        `
      );

      if (thread === undefined) {
        const course = database.get<{ id: number; name: string }>(
          sql`SELECT "id", "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
        )!;

        const enrollment = database.get<{ role: Role }>(
          sql`
            SELECT "role"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id"
            WHERE "users"."email" = ${req.session!.email} AND
                  "enrollments"."course" = ${course.id}
          `
        )!;

        return res.send(
          app.get("layout authenticated")(
            req,
            res,
            html`<title>${course.name} · CourseLore</title>`,
            html`
              <h1>
                Welcome to
                <a
                  href="${app.get("url")}/courses/${req.params.courseReference}"
                  class="undecorated"
                  >${course.name}</a
                >!
              </h1>
              $${enrollment.role === "staff"
                ? html`
                    <p>
                      <a
                        href="${app.get("url")}/courses/${req.params
                          .courseReference}/settings#invitations"
                        ><strong>Invite other people to the course</strong></a
                      >.
                    </p>
                    <p>
                      Or
                      <a
                        href="${app.get("url")}/courses/${req.params
                          .courseReference}/threads/new"
                        ><strong>create the first thread</strong></a
                      >.
                    </p>
                  `
                : html`
                    <p>
                      This is a new course.
                      <a
                        href="${app.get("url")}/courses/${req.params
                          .courseReference}/threads/new"
                        ><strong>Create the first thread</strong></a
                      >.
                    </p>
                  `}
            `
          )
        );
      }

      res.redirect(
        `${app.get("url")}/courses/${req.params.courseReference}/threads/${
          thread.reference
        }`
      );
    }
  );

  // TODO: Process email addresses
  // https://www.npmjs.com/package/email-addresses
  // https://www.npmjs.com/package/addressparser
  // https://www.npmjs.com/package/emailjs-mime-codec
  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/courses/:courseReference/settings",
    ...isCourseEnrolled,
    (req, res) => {
      const course = database.get<{ id: number; name: string }>(
        sql`SELECT "id", "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;

      const enrollment = database.get<{
        role: Role;
        accentColor: AccentColor;
      }>(
        sql`
          SELECT "role", "accentColor"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "users"."email" = ${req.session!.email} AND
                "enrollments"."course" = ${course.id}
        `
      )!;

      return res.send(
        app.get("layout authenticated")(
          req,
          res,
          html`<title>Course settings · ${course.name} · CourseLore</title>`,
          html`
            <h1>
              Course settings ·
              <a
                href="${app.get("url")}/courses/${req.params.courseReference}"
                class="undecorated"
                >${course.name}</a
              >
            </h1>

            $${enrollment.role !== "staff"
              ? html``
              : html`
                  <form
                    method="POST"
                    action="${app.get("url")}/courses/${req.params
                      .courseReference}/settings?_method=PATCH"
                    style="${css`
                      display: flex;
                      align-items: flex-end;

                      & > * + * {
                        margin-left: 1em;
                      }
                    `}"
                  >
                    <p
                      style="${css`
                        flex: 1;
                      `}"
                    >
                      <label>
                        <strong>Name</strong><br />
                        <input
                          type="text"
                          name="name"
                          autocomplete="off"
                          required
                          value="${course.name}"
                        />
                      </label>
                    </p>
                    <p>
                      <button>Rename</button>
                    </p>
                  </form>

                  <hr />

                  <p id="invitations">
                    <strong>Invite with a link</strong><br />
                    <small class="dim">
                      Anyone with an invitation link may enroll on the course.
                    </small>
                  </p>
                  <form>
                    <p>
                      <!-- WIP: https://github.com/jcgertig/date-input-polyfill https://github.com/Pikaday/Pikaday -->
                      <label>
                        For
                        <span class="select-wrapper">
                          <select
                            style="${css`
                              width: auto;
                            `}"
                          >
                            <option>students</option>
                            <option>staff</option>
                          </select>
                        </span>
                      </label>
                    </p>
                    <p><button>Create</button></p>
                  </form>
                  <p>
                    <strong>Invite via email</strong><br />
                    <small class="dim">
                      Only the people you invite may enroll on the course.
                    </small>
                  </p>
                  <form>
                    <p>
                      <textarea name="invite-by-email"></textarea>
                    </p>
                    <p
                      style="${css`
                        text-align: right;
                      `}"
                    >
                      <label>
                        As
                        <span class="select-wrapper">
                          <select
                            style="${css`
                              width: auto;
                            `}"
                          >
                            <option>students</option>
                            <option>staff</option>
                          </select>
                        </span>
                      </label>
                      <button>Invite</button>
                    </p>
                  </form>

                  <hr />
                `}

            <p
              style="${css`
                margin-bottom: 0;
              `}"
            >
              <strong>Accent color</strong>
            </p>
            $${ACCENT_COLORS.map(
              (accentColor) =>
                html`
                  <form
                    method="POST"
                    action="${app.get("url")}/courses/${req.params
                      .courseReference}/settings?_method=PATCH"
                    style="${css`
                      display: inline-block;
                    `}"
                  >
                    <input
                      type="hidden"
                      name="accentColor"
                      value="${accentColor}"
                    />
                    <button
                      class="undecorated ${accentColor ===
                      enrollment.accentColor
                        ? "checked"
                        : ""}"
                      style="${css`
                        width: 2em;
                        height: 2em;
                        cursor: pointer;
                      `}"
                    >
                      <span
                        style="${css`
                          display: inline-block;
                          width: 65%;
                          height: 65%;
                          border: 5px solid transparent;
                          border-radius: 50%;
                          transition: border-color 0.2s;

                          .checked > & {
                            border-color: #000000d4;

                            @media (prefers-color-scheme: dark) {
                              border-color: #ffffffd4;
                            }
                          }
                        `}"
                        ><span
                          style="${css`
                            background-color: ${accentColor};
                            display: inline-block;
                            width: 110%;
                            height: 110%;
                            margin-left: -5%;
                            margin-top: -5%;
                            border-radius: 50%;
                          `}"
                        ></span
                      ></span>
                    </button>
                  </form>
                `
            )}
            <p
              style="${css`
                margin-top: -0.3em;
              `}"
            >
              <label>
                <small class="hint">
                  A bar of this color appears at the top of your screen to help
                  you tell courses apart.
                </small>
              </label>
            </p>
          `
        )
      );
    }
  );

  app.patch<
    { courseReference: string },
    any,
    { name?: string; accentColor?: string },
    {},
    {}
  >("/courses/:courseReference/settings", ...isCourseEnrolled, (req, res) => {
    const enrollment = database.get<{ id: number; role: Role }>(
      sql`
          SELECT "enrollments"."id", "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          JOIN "courses" ON "enrollments"."course" = "courses"."id"
          WHERE "users"."email" = ${req.session!.email} AND
                "courses"."reference" = ${req.params.courseReference}
        `
    )!;

    if (typeof req.body.name === "string" && enrollment.role === "staff") {
      if (validator.isEmpty(req.body.name, { ignore_whitespace: true }))
        throw new ValidationError();
      database.run(
        sql`UPDATE "courses" SET "name" = ${req.body.name} WHERE "reference" = ${req.params.courseReference}`
      );
    }

    if (typeof req.body.accentColor === "string") {
      if (!ACCENT_COLORS.includes(req.body.accentColor as any))
        throw new ValidationError();
      database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${enrollment.id}`
      );
    }
    res.redirect(
      `${app.get("url")}/courses/${req.params.courseReference}/settings`
    );
  });

  app.post<
    { courseReference: string },
    HTML,
    { title?: string; content?: string },
    {},
    {}
  >("/courses/:courseReference/threads", ...isCourseEnrolled, (req, res) => {
    if (
      typeof req.body.title !== "string" ||
      validator.isEmpty(req.body.title, { ignore_whitespace: true }) ||
      typeof req.body.content !== "string" ||
      validator.isEmpty(req.body.content, { ignore_whitespace: true })
    )
      throw new ValidationError();

    const course = database.get<{ id: number }>(
      sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
    )!;

    const newThreadReference =
      database.get<{ newThreadReference: string }>(
        sql`
          SELECT CAST(MAX(CAST("threads"."reference" AS INTEGER)) + 1 AS TEXT) AS "newThreadReference"
          FROM "threads"
          WHERE "threads"."course" = ${course.id}
        `
      )?.newThreadReference ?? "1";

    const author = database.get<{ id: number }>(
      sql`
        SELECT "enrollments"."id"
        FROM "enrollments"
        JOIN "users" ON "enrollments"."user" = "users"."id"
        JOIN "courses" ON "enrollments"."course" = "courses"."id"
        WHERE "users"."email" = ${req.session!.email} AND
              "courses"."id" = ${course.id}
      `
    )!;

    const threadId = database.run(
      sql`
        INSERT INTO "threads" ("course", "reference", "author", "title")
        VALUES (${course.id}, ${newThreadReference}, ${author.id}, ${req.body.title})
      `
    ).lastInsertRowid;
    database.run(
      sql`
        INSERT INTO "posts" ("thread", "reference", "author", "content")
        VALUES (${threadId}, ${"1"}, ${author.id}, ${req.body.content})
      `
    );

    res.redirect(
      `${app.get("url")}/courses/${
        req.params.courseReference
      }/threads/${newThreadReference}`
    );
  });

  const isThreadAccessible: express.RequestHandler<
    { courseReference: string; threadReference: string },
    any,
    {},
    {},
    {}
  >[] = [
    ...isCourseEnrolled,
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
        )!.exists === 0
      )
        return next("route");
      next();
    },
  ];

  app.set(
    "layout thread",
    (
      req: express.Request<
        { courseReference: string; threadReference?: string },
        any,
        {},
        {},
        {}
      >,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ): HTML => {
      const user = database.get<{ id: number; name: string }>(
        sql`
          SELECT "id", "name" FROM "users" WHERE "email" = ${req.session!.email}
        `
      )!;

      const course = database.get<{ id: number; name: string }>(
        sql`SELECT "id", "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;

      const otherCourses = database.all<{
        reference: string;
        name: string;
        role: Role;
        accentColor: AccentColor;
      }>(
        sql`
          SELECT "courses"."reference", "courses"."name", "enrollments"."role", "enrollments"."accentColor"
          FROM "courses"
          JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "courses"."reference" <> ${req.params.courseReference} AND
                "users"."email" = ${req.session!.email}
          ORDER BY "enrollments"."id" DESC
        `
      );

      const enrollment = database.get<{
        role: Role;
        accentColor: AccentColor;
      }>(
        sql`SELECT "role", "accentColor" FROM "enrollments" WHERE "user" = ${user.id} AND "course" = ${course.id}`
      )!;

      const threads = database.all<{
        createdAt: string;
        updatedAt: string;
        reference: string;
        authorName: string | undefined;
        title: string;
      }>(
        sql`
          SELECT "threads"."reference",
                 "author"."name" AS "authorName",
                 "threads"."title",
                 MIN("posts"."createdAt") AS "createdAt",
                 MAX("posts"."updatedAt") AS "updatedAt"
          FROM "threads"
          JOIN "courses" ON "threads"."course" = "courses"."id"
          JOIN "posts" ON "threads"."id" = "posts"."thread"
          LEFT JOIN "enrollments" ON "threads"."author" = "enrollments"."id"
          LEFT JOIN "users" AS "author" ON "enrollments"."user" = "author"."id"
          WHERE "courses"."reference" = ${req.params.courseReference}
          GROUP BY "posts"."thread"
          ORDER BY CAST("threads"."reference" AS INTEGER) DESC
        `
      );

      return app.get("layout base")(
        req,
        res,
        head,
        html`
          <div
            style="${css`
              box-sizing: border-box;
              width: 100vw;
              height: 100vh;
              border-top: 10px solid ${enrollment.accentColor};
              display: flex;
            `}"
          >
            <div
              style="${css`
                width: 400px;
                border-right: 1px solid silver;
                display: flex;
                flex-direction: column;

                @media (prefers-color-scheme: dark) {
                  border-color: black;
                }
              `}"
            >
              <header
                style="${css`
                  border-bottom: 1px solid silver;
                  padding: 0 1em;
                  overflow: auto;

                  @media (prefers-color-scheme: dark) {
                    border-color: black;
                  }
                `}"
              >
                $${logoAndMenu(req, res)}
                <p
                  style="${css`
                    margin-top: -1em;
                  `}"
                >
                  <a
                    href="${app.get("url")}/courses/${req.params
                      .courseReference}"
                    class="undecorated"
                    ><strong>${course.name}</strong> (${enrollment.role})</a
                  >
                </p>
                $${otherCourses.length === 0
                  ? html``
                  : html`
                      <details
                        style="${css`
                          margin-top: -1em;
                        `}"
                      >
                        <summary
                          class="dim"
                          style="${css`
                            list-style: none;

                            &::-webkit-details-marker {
                              display: none;
                            }

                            & path {
                              transition: fill 0.2s;
                            }

                            &:hover path,
                            details[open] > & path {
                              fill: #ff77a8;
                            }

                            details[open] > &::before {
                              content: "";
                              display: block;
                              position: absolute;
                              top: 0;
                              left: 0;
                              width: 100vw;
                              height: 100vw;
                            }
                          `}"
                        >
                          <p
                            style="${css`
                              display: flex;

                              & > * + * {
                                margin-left: 0.3em;
                              }
                            `}"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16">
                              <path
                                fill="gray"
                                d="M5.22 14.78a.75.75 0 001.06-1.06L4.56 12h8.69a.75.75 0 000-1.5H4.56l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3a.75.75 0 000 1.06l3 3zm5.56-6.5a.75.75 0 11-1.06-1.06l1.72-1.72H2.75a.75.75 0 010-1.5h8.69L9.72 2.28a.75.75 0 011.06-1.06l3 3a.75.75 0 010 1.06l-3 3z"
                              ></path>
                            </svg>
                            <small>Switch to another course</small>
                          </p>
                        </summary>
                        <div
                          style="${css`
                            background-color: whitesmoke;
                            max-width: 300px;
                            padding: 0.5em 1em;
                            border: 1px solid darkgray;
                            border-radius: 10px;
                            box-shadow: inset 0px 1px #ffffff22,
                              0px 1px #00000022;
                            position: absolute;
                            transform: translate(0, -10px);

                            @media (prefers-color-scheme: dark) {
                              background-color: #444444;
                            }

                            &::before {
                              content: "";
                              background-color: whitesmoke;
                              display: block;
                              width: 10px;
                              height: 10px;
                              position: absolute;
                              left: 19px;
                              top: -6px;
                              transform: rotate(45deg);
                              border: 1px solid darkgray;
                              border-right: none;
                              border-bottom: none;
                              border-top-left-radius: 5px;
                              box-shadow: inset 1px 1px #ffffff22;

                              @media (prefers-color-scheme: dark) {
                                background-color: #444444;
                              }
                            }

                            p {
                              margin: 0;
                            }
                          `}"
                        >
                          $${otherCourses.map(
                            (course) => html`
                              <p>
                                <a
                                  href="${app.get(
                                    "url"
                                  )}/courses/${course.reference}"
                                  class="undecorated"
                                  ><span
                                    style="${css`
                                      display: inline-block;
                                      width: 0.8em;
                                      height: 0.8em;
                                      background-color: ${course.accentColor};
                                      border-radius: 50%;
                                    `}"
                                  ></span>
                                  <strong>${course.name}</strong>
                                  (${course.role})</a
                                >
                              </p>
                            `
                          )}
                        </div>
                      </details>
                    `}
              </header>
              <div
                style="${css`
                  flex: 1;
                  padding: 0 1em;
                  overflow: auto;
                `}"
              >
                <p
                  style="${css`
                    text-align: center;
                  `}"
                >
                  <a
                    href="${app.get("url")}/courses/${req.params
                      .courseReference}/threads/new"
                    class="button"
                    >New thread</a
                  >
                </p>
                $${threads.map(
                  (thread) =>
                    html`
                      <p
                        style="${css`
                          line-height: 1.3;
                          margin: 0;
                        `}"
                      >
                        <a
                          href="${app.get("url")}/courses/${req.params
                            .courseReference}/threads/${thread.reference}"
                          class="undecorated"
                          style="${css`
                            ${thread.reference === req.params.threadReference
                              ? css`
                                  background-color: whitesmoke;

                                  @media (prefers-color-scheme: dark) {
                                    background-color: #444444;
                                  }
                                `
                              : css``}
                            display: block;
                            padding: 1em;
                            margin: 0 -1em;
                          `}"
                        >
                          <strong>${thread.title}</strong><br />
                          <small class="dim">
                            #${thread.reference} created
                            $${relativeTime(thread.createdAt)} by
                            ${thread.authorName ?? "Ghost"}
                            $${thread.updatedAt !== thread.createdAt
                              ? html`<br />and last updated
                                  $${relativeTime(thread.updatedAt)}`
                              : html``}
                          </small>
                        </a>
                      </p>
                    `
                )}
              </div>
            </div>
            <main
              style="${css`
                flex: 1;
                overflow: auto;
              `}"
            >
              <div
                style="${css`
                  max-width: 800px;
                  padding: 0 1em;
                  margin: 0 auto;

                  & > h1:first-child {
                    margin-top: 1em;
                  }
                `}"
              >
                $${body}
              </div>
            </main>
          </div>
        `
      );
    }
  );

  app.get<
    { courseReference: string; threadReference: string },
    HTML,
    {},
    {},
    {}
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isThreadAccessible,
    (req, res) => {
      const course = database.get<{ id: number; name: string }>(
        sql`SELECT "id", "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;

      const thread = database.get<{ id: number; title: string }>(
        sql`SELECT "id", "title" FROM "threads" WHERE "course" = ${course.id} AND "reference" = ${req.params.threadReference}`
      )!;

      const posts = database.all<{
        createdAt: string;
        updatedAt: string;
        reference: string;
        authorName: string | undefined;
        content: string;
      }>(
        sql`
          SELECT "posts"."createdAt",
                 "posts"."updatedAt",
                 "posts"."reference",
                 "author"."name" AS "authorName",
                 "posts"."content"
          FROM "posts"
          LEFT JOIN "enrollments" ON "posts"."author" = "enrollments"."id"
          LEFT JOIN "users" AS "author" ON "enrollments"."user" = "author"."id"
          WHERE "posts"."thread" = ${thread.id}
          ORDER BY "posts"."id" ASC
        `
      );

      res.send(
        app.get("layout thread")(
          req,
          res,
          html`<title>${thread.title} · ${course.name} · CourseLore</title>`,
          html`
            <h1>
              ${thread.title}
              <small
                class="dim"
                style="${css`
                  font-weight: normal;
                `}"
              >
                <a
                  href="${app.get("url")}/courses/${req.params
                    .courseReference}/threads/${req.params.threadReference}"
                  class="undecorated"
                  >#${req.params.threadReference}</a
                >
              </small>
            </h1>

            $${posts.map(
              (post) => html`
                <section
                  id="${post.reference}"
                  style="${css`
                    border-bottom: 1px solid silver;

                    @media (prefers-color-scheme: dark) {
                      border-color: black;
                    }
                  `}"
                >
                  <p>
                    <strong>${post.authorName ?? "Ghost"}</strong>
                    <span class="dim">
                      said
                      $${relativeTime(post.createdAt)}$${post.updatedAt !==
                      post.createdAt
                        ? html` (and last edited
                          $${relativeTime(post.updatedAt)})`
                        : html``}
                      <small>
                        <a
                          href="${app.get("url")}/courses/${req.params
                            .courseReference}/threads/${req.params
                            .threadReference}#${post.reference}"
                          class="undecorated"
                          >#${req.params.threadReference}/${post.reference}</a
                        >
                      </small>
                    </span>
                  </p>
                  $${app.get("text processor")(post.content)}
                </section>
              `
            )}

            <form method="POST">
              $${textEditor()}
              <p
                style="${css`
                  text-align: right;
                `}"
              >
                <button>Post</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  app.post<
    { courseReference: string; threadReference: string },
    HTML,
    { content?: string },
    {},
    {}
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isThreadAccessible,
    (req, res) => {
      if (
        typeof req.body.content !== "string" ||
        validator.isEmpty(req.body.content, { ignore_whitespace: true })
      )
        throw new ValidationError();

      const course = database.get<{ id: number }>(
        sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;

      const thread = database.get<{ id: number; title: string }>(
        sql`SELECT "id" FROM "threads" WHERE "course" = ${course.id} AND "reference" = ${req.params.threadReference}`
      )!;

      const newPostReference = database.get<{ newPostReference: string }>(
        sql`
          SELECT CAST(MAX(CAST("posts"."reference" AS INTEGER)) + 1 AS TEXT) AS "newPostReference"
          FROM "posts"
          WHERE "posts"."thread" = ${thread.id}
        `
      )!.newPostReference;

      const author = database.get<{ id: number }>(
        sql`
          SELECT "enrollments"."id"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "enrollments"."course" = ${course.id} AND
                "users"."email" = ${req.session!.email}
        `
      )!;

      database.run(
        sql`
          INSERT INTO "posts" ("thread", "reference", "author", "content")
          VALUES (${thread.id}, ${newPostReference}, ${author.id}, ${req.body.content})
        `
      );

      res.redirect(
        `${app.get("url")}/courses/${req.params.courseReference}/threads/${
          req.params.threadReference
        }#${newPostReference}`
      );
    }
  );

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/courses/:courseReference/threads/new",
    ...isCourseEnrolled,
    (req, res) => {
      const course = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;

      res.send(
        app.get("layout thread")(
          req,
          res,
          html`
            <title>Create a new thread · ${course.name} · CourseLore</title>
          `,
          html`
            <h1>Create a new thread</h1>
            <form
              method="POST"
              action="${app.get("url")}/courses/${req.params
                .courseReference}/threads"
            >
              <p>
                <label>
                  <strong>Title</strong><br />
                  <input type="text" name="title" autocomplete="off" required />
                </label>
              </p>
              $${textEditor()}
              <p
                style="${css`
                  text-align: right;
                `}"
              >
                <button>Create thread</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  app.use(isAuthenticated(true));

  app.use<{}, HTML, {}, {}, {}>((req, res) => {
    res.send(
      app.get(
        req.session!.email === undefined
          ? "layout unauthenticated"
          : "layout authenticated"
      )(
        req,
        res,
        html`<title>Not found · CourseLore</title>`,
        html`
          <div
            style="${css`
              text-align: center;
            `}"
          >
            <h1>Not found</h1>
            $${req.session!.email === undefined
              ? html`
                  <p>
                    You may have to
                    <a
                      href="${app.get(
                        "url"
                      )}/sign-in?redirect=${req.originalUrl}"
                      >sign in</a
                    >
                    or
                    <a
                      href="${app.get(
                        "url"
                      )}/sign-up?redirect=${req.originalUrl}"
                      >sign up</a
                    >
                    to access this page.
                  </p>
                `
              : html`
                  <p>
                    If you think there should be something here, please contact
                    the course staff or the
                    <a href="${app.get("administrator")}"
                      >system administrator</a
                    >.
                  </p>
                `}
          </div>
        `
      )
    );
  });

  class ValidationError extends Error {}

  app.use(((err, req, res, next) => {
    console.error(err);
    const type = err instanceof ValidationError ? "Validation" : "Server";
    res.status(type === "Validation" ? 422 : 500).send(
      app.get(
        req.session!.email === undefined
          ? "layout unauthenticated"
          : "layout authenticated"
      )(
        req,
        res,
        html`<title>${type} error · CourseLore</title>`,
        html`
          <div
            style="${css`
              text-align: center;
            `}"
          >
            <h1>${type} error</h1>
            <p>
              This is a bug in CourseLore; please report to
              <a href="mailto:bug-report@courselore.org"
                >bug-report@courselore.org</a
              >.
            </p>
          </div>
        `
      )
    );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, {}>);

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
    database.run(
      sql`INSERT INTO "emailQueue" ("to", "subject", "body") VALUES (${to}, ${subject}, ${body})`
    );
    return html``;
  }

  const loading = (() => {
    let counter = 0;
    return (): HTML => {
      counter++;
      const id = `loading-gradient-${counter}`;
      return html`
        <div
          class="loading"
          hidden
          style="${css`
            margin: 3em 0;
            display: flex;
            justify-content: center;
            align-items: center;

            & > * + * {
              margin-left: 0.5em;
            }
          `}"
        >
          $${logoSVG
            .replace(`id="gradient"`, `id="${id}"`)
            .replace("#gradient", `#${id}`)}
          <script>
            (() => {
              const loading = document.currentScript.parentElement;
              let animationFrame;
              new MutationObserver(() => {
                if (loading.hidden) window.cancelAnimationFrame(animationFrame);
                else animationFrame = window.requestAnimationFrame(animate);
              }).observe(loading, {
                attributes: true,
                attributeFilter: ["hidden"],
              });
              const polyline = loading.querySelector("polyline");
              const points = polyline
                .getAttribute("points")
                .split(" ")
                .map(Number);
              function animate(time) {
                polyline.setAttribute(
                  "points",
                  points
                    .map(
                      (coordinate, index) =>
                        coordinate + Math.sin(time * 0.005 + index)
                    )
                    .join(" ")
                );
                animationFrame = window.requestAnimationFrame(animate);
              }
            })();
          </script>
          <strong>Loading…</strong>
        </div>
      `;
    };
  })();

  // TODO: Extract this into its own library?
  // TODO: Bring this and the client-side JavaScript that makes relative times work closer together.
  // https://github.com/catamphetamine/javascript-time-ago
  // https://github.com/azer/relative-date
  // https://benborgers.com/posts/js-relative-date
  // https://github.com/digplan/time-ago
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
  //   https://blog.webdevsimplified.com/2020-07/relative-time-format/
  // https://day.js.org
  // http://timeago.yarp.com
  // https://sugarjs.com
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
    const configurationFile =
      process.argv[2] === undefined ? undefined : path.resolve(process.argv[2]);
    if (configurationFile === undefined) {
      const app = await courselore(path.join(process.cwd(), "data"));
      app.listen(new URL(app.get("url")).port, () => {
        console.log(`Server started at ${app.get("url")}`);
      });
    } else {
      await require(configurationFile)(require);
      console.log(`Configuration loaded from ‘${configurationFile}’.`);
    }
  })();
