#!/usr/bin/env node

import console from "console";
import process from "process";
import path from "path";
import crypto from "crypto";

import express from "express";
import cookieSession from "cookie-session";
import * as expressValidator from "express-validator";

import { Database, sql } from "@leafac/sqlite";
import databaseMigrate from "@leafac/sqlite-migration";

import html from "@leafac/html";
import css from "tagged-template-noop";
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

import postcss from "postcss";
import postcssNested from "postcss-nested";

import { JSDOM } from "jsdom";
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
  type CSS = string;

  app.set("url", "http://localhost:4000");
  app.set("administrator email", "demonstration-development@courselore.org");

  app.enable("demonstration");

  app.set(
    "layout base",
    (head: HTML, body: HTML): HTML => {
      const rawHTML = html`
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
                #ff77a8 / darker #e66c98 #cc6088
                #29adff
              */

              body {
                font-size: 14px;
                line-height: 1.5;
                font-family: "Public Sans", sans-serif;
                -webkit-text-size-adjust: 100%;
                margin: 0;
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
                font-size: large;
                font-weight: 800;
                margin-top: 1.5em;
              }

              /* TODO: Do something about other styling attacks in which the user just gives us input that’s too long and causes horizontal scrolls. */
              pre,
              div.math-display {
                overflow: auto;
              }

              pre {
                line-height: 1.3;
              }

              div.demonstration,
              div.TODO,
              input,
              textarea {
                border: 1px solid darkgray;
                border-radius: 10px;
                box-shadow: inset 0px 1px #ffffff22, 0px 1px #00000022;
              }

              div.demonstration,
              div.TODO {
                background-color: whitesmoke;
                box-sizing: border-box;
                padding: 0 1em;
              }

              div.TODO::before {
                content: "TODO";
                font-weight: bold;
                display: block;
                margin-top: 0.5em;
              }

              input,
              textarea,
              button {
                font-family: "Public Sans", sans-serif;
                font-size: 1em;
                line-height: 1.5;
                margin: 0;
                outline: none;
              }

              input,
              textarea {
                padding: 0.2em 1em;
                transition: border-color 0.2s;
              }

              input:focus,
              textarea:focus {
                border-color: #ff77a8;
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

              ::-webkit-resizer {
                display: none;
              }

              a,
              button.a,
              summary {
                transition: color 0.2s;
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

              a:hover,
              button.a:hover,
              summary:hover {
                color: #ff77a8;
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

              button,
              summary {
                cursor: pointer;
              }

              a.button {
                display: inline-block;
              }

              button:not(.undecorated):not(.a),
              a.button {
                color: white;
                background-color: #83769c;
                padding: 0.2em 1em;
                border: 1px solid #83769c;
                border-radius: 10px;
                box-shadow: inset 0px 1px #ffffff22, 0px 1px #00000022;
                transition-property: color, background-color, border-color;
                transition-duration: 0.2s;
              }

              button:not(.undecorated):not(.a).outline,
              a.button.outline {
                color: #83769c;
                background-color: white;
              }

              button:not(.undecorated):not(.a):hover,
              a.button:hover {
                color: white;
                background-color: #6e6382;
              }

              button:not(.undecorated):not(.a):active,
              a.button:active {
                color: white;
                background-color: #584f69;
              }

              button:not(.undecorated):not(.a):disabled,
              a.button.disabled {
                color: dimgray;
                background-color: whitesmoke;
                border-color: dimgray;
                cursor: wait;
              }

              [hidden] {
                display: none !important;
              }

              summary {
                cursor: pointer;
              }
            </style>
            $${head}
          </head>
          <body>
            $${body}
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
                    element.innerText = RELATIVE_TIME_FORMAT.format(
                      // TODO: Should this really be ‘round’, or should it be ‘floor/ceil’?
                      Math.round(value),
                      unit
                    );
                  }
                  window.setTimeout(relativeTimes, 60 * 1000);
                })();
              })();

              document.body.addEventListener(
                "click",
                (event) => {
                  window.setTimeout(() => {
                    if (
                      event.target.matches("button") &&
                      (event.target.getAttribute("type") === "button" ||
                        event.target.closest("form").checkValidity())
                    )
                      event.target.disabled = true;
                    else if (event.target.matches("a.button"))
                      event.target.classList.add("disabled");
                  }, 0);
                },
                true
              );
              function enableButton(element) {
                window.setTimeout(() => {
                  if (element.matches("button")) element.disabled = false;
                  else if (element.matches("a.button"))
                    element.classList.remove("disabled");
                }, 0);
              }
            </script>
          </body>
        </html>
      `;

      // TODO: Make this possibly faster by using Rehype instead of JSDOM (though we have to benchmark to be sure…)
      // TODO: Extract this into a package. Or at least into its own function outside the definition of the template.
      // TODO: Use more inline styles in the templates and in the customization.
      // TODO: Add support for all pseudo-classes, pseudo-elements, and media queries.
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
      //         https://www.npmjs.com/package/pseudo-classes
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
      //       https://github.com/postcss/postcss
      //       https://github.com/brettstimmerman/mensch
      // https://stackoverflow.com/questions/10963997/css-parser-for-javascript
      // https://github.com/CSSLint/parser-lib
      // https://github.com/NV/CSSOM
      // https://github.com/reworkcss/css
      // https://www.npmjs.com/package/cssparser
      // https://rahulnpadalkar.medium.com/css-parser-in-javascript-578eba0977e5
      // https://github.com/rahulnpadalkar/CSSParser
      // http://glazman.org/JSCSSP/

      // https://github.com/postcss/postcss-scss
      // https://github.com/postcss/postcss-js
      // https://github.com/jonathantneal/precss
      // https://github.com/postcss/postcss-nested (more installations than the one below)
      // https://github.com/jonathantneal/postcss-nesting (closer to the standard and more stars than the one above)

      // https://github.com/jsdom/cssstyle
      // https://github.com/reworkcss/css
      // https://github.com/css/csso
      // https://github.com/csstree/csstree
      // https://github.com/brettstimmerman/mensch
      const dom = new JSDOM(rawHTML);
      const document = dom.window.document;
      const inlineStyles: CSS[] = [];
      for (const element of document.querySelectorAll("[style]")) {
        const styles = element.getAttribute("style")!;
        element.removeAttribute("style");
        const className = `style--${crypto
          .createHash("sha256")
          .update(styles)
          .digest("hex")}`;
        element.classList.add(className);
        inlineStyles.push(
          cssProcessor.process(
            css`
              .${className} {
                ${styles}
              }
            `,
            { from: undefined }
          ).css
        );
      }
      document.head.insertAdjacentHTML(
        "beforeend",
        html`
          <style>
            $${inlineStyles}
          </style>
        `
      );
      return dom.serialize();
    }
  );
  const cssProcessor = postcss([postcssNested]);

  app.set(
    "layout",
    (
      req: express.Request,
      res: express.Response,
      head: HTML,
      body: HTML
    ): HTML => {
      if (req.session!.email === undefined)
        return app.get("layout base")(
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
        );

      const user = database.get<{ name: string }>(
        sql`SELECT "name" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;

      if (req.params.courseReference === undefined)
        return app.get("layout base")(
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
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  `}"
                >
                  $${logo()}
                  <button
                    type="button"
                    class="a undecorated"
                    onclick="${javascript`
                      const target = document.querySelector("#signed-in-menu");
                      target.hidden = !target.hidden;
                      enableButton(this);
                    `}"
                  >
                    ☰
                  </button>
                </p>
                <div id="signed-in-menu" hidden>
                  <p>
                    <strong>${user.name}</strong> ${`<${req.session!.email}>`}
                  </p>
                  <p>
                    <a href="${app.get("url")}/courses/new" class="undecorated"
                      >New course</a
                    >
                  </p>
                  <form method="post" action="${app.get("url")}/sign-out">
                    <p><button class="a undecorated">Sign out</button></p>
                  </form>
                </div>
              </header>
              <main>$${body}</main>
            </div>
          `
        );

      const course = database.get<{ name: string; role: Role }>(
        sql`
          SELECT "courses"."name" AS "name", "enrollments"."role" AS "role"
          FROM "courses"
          JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "courses"."reference" = ${req.params.courseReference} AND
                "users"."email" = ${req.session!.email}
        `
      )!;

      const otherCourses = database.all<{
        reference: string;
        name: string;
        role: Role;
      }>(
        sql`
          SELECT "courses"."reference" AS "reference", "courses"."name" AS "name", "enrollments"."role" AS "role"
          FROM "courses"
          JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "courses"."reference" <> ${req.params.courseReference} AND
                "users"."email" = ${req.session!.email}
          ORDER BY "enrollments"."createdAt" DESC
        `
      );

      return app.get("layout base")(
        head,
        html`
          <div
            style="${css`
              width: 100vw;
              height: 100vh;
              display: grid;
              grid-template-columns: 400px auto;
            `}"
          >
            <div
              style="${css`
                border-right: 1px solid silver;
                overflow: auto;
                display: grid;
                grid-template-rows: min-content auto;
              `}"
            >
              <header
                style="${css`
                  border-bottom: 1px solid silver;
                  padding: 0 1em;
                `}"
              >
                <p
                  style="${css`
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                  `}"
                >
                  $${logo(`${app.get("url")}/${req.params.courseReference}`)}
                  <button
                    type="button"
                    class="a undecorated"
                    style="${css`
                      button& {
                        color: dimgray;
                      }
                    `}"
                    onclick="${javascript`
                      const target = document.querySelector("#signed-in-menu");
                      target.hidden = !target.hidden;
                      enableButton(this);
                    `}"
                  >
                    ☰
                  </button>
                </p>
                <div id="signed-in-menu" hidden>
                  <p>
                    <strong>${user.name}</strong> ${`<${req.session!.email}>`}
                  </p>
                  <p>
                    <a href="${app.get("url")}/courses/new" class="undecorated"
                      >New course</a
                    >
                  </p>
                  <form method="post" action="${app.get("url")}/sign-out">
                    <p><button class="a undecorated">Sign out</button></p>
                  </form>
                </div>
                $${otherCourses.length === 0
                  ? html`
                      <p><strong>${course.name}</strong> (${course.role})</p>
                    `
                  : html`
                      <details>
                        <summary
                          style="${css`
                            margin: 1em 0;
                          `}"
                        >
                          <strong>${course.name}</strong> (${course.role})
                        </summary>
                        $${otherCourses.map(
                          (course) => html`
                            <p>
                              <a href="${app.get("url")}/${course.reference}"
                                >${course.name} (${course.role})</a
                              >
                            </p>
                          `
                        )}
                      </details>
                    `}
              </header>
              <div
                style="${css`
                  overflow: auto;
                  padding: 0 1em;
                `}"
              >
                <p
                  style="${css`
                    text-align: center;
                  `}"
                >
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
                        <p
                          style="${css`
                            line-height: 1.2;
                          `}"
                        >
                          <a
                            href="${app.get("url")}/${req.params
                              .courseReference}/threads/${reference}"
                            class="undecorated"
                            style="${css`
                              display: block;
                            `}"
                          >
                            <strong>${title}</strong><br />
                            <small
                              style="${css`
                                color: dimgray;
                              `}"
                            >
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
              </div>
            </div>
            <main
              style="${css`
                overflow: auto;
                padding: 0 1em;
              `}"
            >
              $${body}
            </main>
          </div>
        `
      );
    }
  );

  const logoSVG = await fs.readFile(
    path.join(__dirname, "../public/logo.svg"),
    "utf-8"
  );

  function logo(href: string = app.get("url")): HTML {
    return html`
      <a
        href="${href}"
        class="undecorated"
        style="${css`
          color: #83769c;
          display: inline-flex;
          align-items: center;

          &:hover {
            color: #6e6382;
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
            margin-left: 0.3em;
          `}"
          >CourseLore</span
        >
      </a>
    `;
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
          `}"
        >
          $${logoSVG
            .replace(`id="gradient"`, `id="${id}"`)
            .replace(`#gradient`, `#${id}`)}
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
          <strong
            style="${css`
              margin-left: 0.3em;
            `}"
            >Loading…</strong
          >
        </div>
      `;
    };
  })();

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
  // FIXME: Maybe ‘reference’s should be TEXT, because of private threads. But does TEXT sort the right way?
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
          html`<title>Sign ${preposition} · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>Sign ${preposition}</h1>
              <form
                method="post"
                style="${css`
                  max-width: 300px;
                  margin: 0 auto;
                  text-align: left;

                  & input {
                    box-sizing: border-box;
                    width: 100%;
                  }
                `}"
              >
                <p>
                  <label>
                    <strong>Email</strong><br />
                    <input
                      name="email"
                      type="email"
                      placeholder="me@university.edu"
                      required
                      autofocus
                      size="30"
                    />
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
                  <a href="${app.get("url")}/sign-${alternativePreposition}"
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

  function createAuthenticationToken(email: string): string {
    runtimeDatabase.run(
      sql`DELETE FROM "authenticationTokens" WHERE "email" = ${email}`
    );
    const newToken = cryptoRandomString({ length: 40, type: "numeric" });
    runtimeDatabase.run(
      sql`INSERT INTO "authenticationTokens" ("token", "email") VALUES (${newToken}, ${email})`
    );
    return newToken;
  }

  // TODO: Make more sophisticated use of expressValidator.
  app.post<{}, HTML, { email: string }, {}, {}>(
    ["/sign-up", "/sign-in"],
    ...isAuthenticated(false),
    expressValidator.body("email").isEmail(),
    (req, res) => {
      const newToken = createAuthenticationToken(req.body.email);
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
              <form method="post">
                <p>
                  <input type="hidden" name="email" value="${req.body.email}" />
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
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <p>
                  This magic sign-${preposition} link is invalid or has expired.
                  <a href="${app.get("url")}/sign-${preposition}">Start over</a
                  >.
                </p>
              </div>
            `
          )
        );
      }
      if (
        database.get<{ exists: number }>(
          sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${authenticationToken.email}) AS "exists"`
        )!.exists === 0
      ) {
        const newToken = createAuthenticationToken(authenticationToken.email);
        return res.send(
          app.get("layout")(
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
                  method="post"
                  action="${app.get("url")}/users"
                  style="${css`
                    max-width: 300px;
                    margin: 0 auto;
                    text-align: left;

                    & input {
                      box-sizing: border-box;
                      width: 100%;
                    }
                  `}"
                >
                  <input type="hidden" name="token" value="${newToken}" />
                  <p>
                    <label>
                      <strong>Email</strong><br />
                      <input
                        type="text"
                        value="${authenticationToken.email}"
                        disabled
                      />
                    </label>
                  </p>
                  <p>
                    <label
                      style="${css`
                        text-align: left;
                      `}"
                    >
                      <strong>Name</strong><br />
                      <input type="text" name="name" required autofocus />
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
                <p>Ask for more user information here. What information?</p>
              </div>
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
    if (enrollmentsCount == 0) {
      const user = database.get<{ name: string }>(
        sql`SELECT "name" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;
      return res.send(
        app.get("layout")(
          req,
          res,
          html`<title>CourseLore</title>`,
          html`
            <h1>Hi ${user.name},</h1>
            <p>
              <strong>Welcome to CourseLore!</strong> What would you like to do?
            </p>
            <p>
              <a href="${app.get("url")}/courses/new" class="button"
                >Create a new course</a
              >
            </p>
            <p>
              Or, to <strong>enroll on an existing course</strong>, you either
              have to be invited or go to the course URL (it looks something
              like
              <code
                >${app.get("url")}/${cryptoRandomString({
                  length: 10,
                  type: "numeric",
                })}</code
              >).
            </p>
            <div class="TODO">
              <p>
                The enrollment process should change to introduce the notion of
                <strong>invitations</strong>. Change the language above
                accordingly.
              </p>
            </div>
          `
        )
      );
    }

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
                <p>Welcome to CourseLore! What would you like to do?</p>
                <p>
                  <a href="${app.get("url")}/courses/new" class="button"
                    >Create a new course</a
                  >
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
                <p>
                  <a href="${app.get("url")}/courses/new" class="button"
                    >New course</a
                  >
                </p>
                <p>Here’s what’s going on with your courses:</p>
                $${database
                  .all<{ reference: string; name: string; role: Role }>(
                    sql`
                        SELECT "courses"."reference" AS "reference", "courses"."name" AS "name", "enrollments"."role" AS "role"
                        FROM "courses"
                        JOIN "enrollments" ON "courses"."id" = "enrollments"."course"
                        JOIN "users" ON "enrollments"."user" = "users"."id"
                        WHERE "users"."email" = ${req.session!.email}
                        ORDER BY "enrollments"."createdAt" DESC
                      `
                  )
                  .map(
                    ({ reference, name, role }) =>
                      html`
                        <p>
                          <a href="${app.get("url")}/${reference}"
                            >${name} (${role})</a
                          >
                        </p>
                      `
                  )}
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
            <div class="TODO">
              <p>
                Ask more questions here, for example, what’s the person’s role
                in the course, how they’d like for other people to enroll
                (either by invitation or via a link), and so forth…
              </p>
            </div>
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
      const newCourseId = database.run(
        sql`INSERT INTO "courses" ("reference", "name") VALUES (${newReference}, ${req.body.name})`
      ).lastInsertRowid;
      const user = database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;
      database.run(
        sql`INSERT INTO "enrollments" ("user", "course", "role") VALUES (${
          user.id
        }, ${newCourseId}, ${"instructor"})`
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
  const isEnrolledInCourse: (
    isEnrolledInCourse: boolean
  ) => express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {}
  >[] = (isEnrolledInCourse) => [
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
        )!.exists !== (isEnrolledInCourse ? 1 : 0)
      )
        return next("route");
      next();
    },
  ];

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/:courseReference",
    ...isEnrolledInCourse(false),
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
                <!-- TODO: Style this: https://moderncss.dev/custom-select-styles-with-pure-css/ https://www.filamentgroup.com/lab/select-css.html -->
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
    ...isEnrolledInCourse(false),
    expressValidator.body("role").isIn(ROLES as any),
    (req, res) => {
      const user = database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${req.session!.email}`
      )!;
      const course = database.get<{ id: number }>(
        sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      database.run(
        sql`INSERT INTO "enrollments" ("user", "course", "role") VALUES (${user.id}, ${course.id}, ${req.body.role})`
      );
      res.redirect(`${app.get("url")}/${req.params.courseReference}`);
    }
  );

  app.get<{ courseReference: string }, HTML, {}, {}, {}>(
    "/:courseReference",
    ...isEnrolledInCourse(true),
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
                    <p
                      style="${css`
                        line-height: 1.2;
                      `}"
                    >
                      <a
                        href="${app.get("url")}/${req.params
                          .courseReference}/threads/${reference}"
                        class="undecorated"
                        style="${css`
                          display: block;
                        `}"
                      >
                        <strong>${title}</strong><br />
                        <small
                          style="${css`
                            color: dimgray;
                          `}"
                        >
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
    ...isEnrolledInCourse(true),
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
            <h1>Create a new thread</h1>
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
                  style="${css`
                    box-sizing: border-box;
                    width: 100%;
                  `}"
                  required
                />
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

  // FIXME: This should return the parts of the text editor (more specifically, the textarea and the buttons), instead of the whole thing. Then we wouldn’t need to pass ‘submit’ as argument, and it’d be more reusable.
  // FIXME: Don’t require whole form to be valid, just the text editor itself.
  function textEditor(): HTML {
    return html`
      <!-- TODO: Make it so that buttons aren’t enabled until the form is valid. -->
      <!-- TODO: What happens if the content includes a form? -->
      <div class="text-editor">
        <p
          style="${css`
            color: dimgray;
            margin-bottom: 0em;

            & button {
              margin-right: 0.5em;
              transition-duration: 0.2s;
              transition-property: font-weight, color;

              &:disabled {
                font-weight: bold;
                color: black;
              }
            }
          `}"
        >
          <button
            type="button"
            class="write undecorated"
            disabled
            onclick="${javascript`
              const textEditor = this.closest("div.text-editor");
              textEditor.querySelector("div.preview").hidden = true;
              textEditor.querySelector("div.write").hidden = false;
              enableButton(textEditor.querySelector("button.preview"));
            `}"
          >
            Write
          </button>
          <button
            type="button"
            class="preview undecorated"
            onclick="${javascript`
              (async () => {
                const textEditor = this.closest("div.text-editor");
                const textarea = textEditor.querySelector("textarea");
                if (!textarea.reportValidity()) {
                  enableButton(this);
                  return;
                }
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
                enableButton(textEditor.querySelector("button.write"));
              })();
            `}"
          >
            Preview
          </button>
        </p>

        <div class="write">
          <textarea name="content" required rows="5"></textarea>
          <p
            style="${css`
              text-align: right;
              color: dimgray;
              margin-top: -0.3em;
            `}"
          >
            <small>
              <a
                href="https://guides.github.com/features/mastering-markdown/"
                class="undecorated"
                >Markdown</a
              >
              &
              <a
                href="https://katex.org/docs/supported.html"
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

  app.post<
    { courseReference: string },
    HTML,
    { title: string; content: string },
    {},
    {}
  >(
    "/:courseReference/threads",
    ...isEnrolledInCourse(true),
    expressValidator.body("title").exists(),
    expressValidator.body("content").exists(),
    (req, res) => {
      const course = database.get<{ id: number }>(
        sql`SELECT "id" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      const newThreadReference =
        database.get<{ newThreadReference: number }>(sql`
          SELECT MAX("threads"."reference") + 1 AS "newThreadReference"
          FROM "threads"
          WHERE "threads"."course" = ${course.id}
        `)?.newThreadReference ?? 1;
      const author = database.get<{ id: number }>(sql`
        SELECT "enrollments"."id" AS "id"
        FROM "enrollments"
        JOIN "users" ON "enrollments"."user" = "users"."id"
        JOIN "courses" ON "enrollments"."course" = "courses"."id"
        WHERE "users"."email" = ${req.session!.email} AND
              "courses"."id" = ${course.id}
      `)!;
      const threadId = database.run(sql`
        INSERT INTO "threads" ("course", "reference", "author", "title")
        VALUES (${course.id}, ${newThreadReference}, ${author.id}, ${req.body.title})
      `).lastInsertRowid;
      database.run(sql`
        INSERT INTO "posts" ("thread", "reference", "author", "content")
        VALUES (${threadId}, ${1}, ${author.id}, ${req.body.content})
      `);
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
    ...isEnrolledInCourse(true),
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
      const course = database.get<{ name: string }>(
        sql`SELECT "name" FROM "courses" WHERE "reference" = ${req.params.courseReference}`
      )!;
      const thread = database.get<{ id: number; title: string }>(
        sql`
          SELECT "threads"."id" AS "id", "threads"."title" AS "title"
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
            <h1>
              ${thread.title}
              <small
                style="${css`
                  font-weight: normal;
                  color: gray;
                `}"
              >
                <a
                  href="${app.get("url")}/${req.params
                    .courseReference}/threads/${req.params.threadReference}"
                  class="undecorated"
                  >#${req.params.threadReference}</a
                >
              </small>
            </h1>

            $${database
              .all<{
                createdAt: string;
                updatedAt: string;
                postReference: number;
                authorName: string | undefined;
                content: string;
              }>(
                sql`
                SELECT "posts"."createdAt" AS "createdAt",
                       "posts"."updatedAt" AS "updatedAt",
                       "posts"."reference" AS "postReference",
                       "author"."name" AS "authorName",
                       "posts"."content" AS "content"
                FROM "posts"
                LEFT JOIN "enrollments" ON "posts"."author" = "enrollments"."id"
                LEFT JOIN "users" AS "author" ON "enrollments"."user" = "author"."id"
                WHERE "posts"."thread" = ${thread.id}
                ORDER BY "posts"."createdAt" ASC
              `
              )
              .map(
                ({
                  createdAt,
                  updatedAt,
                  postReference,
                  authorName,
                  content,
                }) => html`
                  <section id="${postReference}">
                    <p>
                      <strong>${authorName ?? "Ghost"}</strong>
                      <span
                        style="${css`
                          color: dimgray;
                        `}"
                        >said
                        $${relativeTime(createdAt)}${updatedAt !== createdAt
                          ? html` (and last updated $${relativeTime(updatedAt)})`
                          : html``}
                        <small
                          style="${css`
                            color: gray;
                          `}"
                        >
                          <a
                            href="${app.get("url")}/${req.params
                              .courseReference}/threads/${req.params
                              .threadReference}#${postReference}"
                            class="undecorated"
                            >#${req.params.threadReference}/${postReference}</a
                          >
                        </small>
                      </span>
                    </p>
                    $${app.get("text processor")(content)}
                  </section>
                `
              )}

            <!-- TODO: Add keyboard shortcuts for posting. Here and in the create thread form as well. -->
            <form method="post">
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
    { content: string },
    {},
    {}
  >(
    "/:courseReference/threads/:threadReference",
    ...threadAccessible,
    expressValidator.body("content").exists(),
    (req, res) => {
      // FIXME: Maybe we can do this whole series of queries in one…
      const thread = database.get<{ id: number; title: string }>(sql`
        SELECT "threads"."id" AS "id"
        FROM "threads"
        JOIN "courses" ON "threads"."course" = "courses"."id"
        WHERE "threads"."reference" = ${req.params.threadReference} AND
              "courses"."reference" = ${req.params.courseReference}
      `)!;
      const newPostReference = database.get<{ newPostReference: number }>(sql`
        SELECT MAX("posts"."reference") + 1 AS "newPostReference"
        FROM "posts"
        WHERE "posts"."thread" = ${thread.id}
      `)!.newPostReference;
      const author = database.get<{ id: number }>(sql`
        SELECT "enrollments"."id" AS "id"
        FROM "enrollments"
        JOIN "users" ON "enrollments"."user" = "users"."id"
        JOIN "courses" ON "enrollments"."course" = "courses"."id"
        WHERE "users"."email" = ${req.session!.email} AND
              "courses"."reference" = ${req.params.courseReference}
      `)!;
      database.run(sql`
        INSERT INTO "posts" ("thread", "reference", "author", "content")
        VALUES (${thread.id}, ${newPostReference}, ${author.id}, ${req.body.content})
      `);
      res.redirect(
        `${app.get("url")}/${req.params.courseReference}/threads/${
          req.params.threadReference
        }#${newPostReference}`
      );
    }
  );

  app.post<{}, HTML, { content: string }, {}, {}>(
    "/preview",
    ...isAuthenticated(true),
    expressValidator.body("content").exists(),
    (req, res) => {
      res.send(app.get("text processor")(req.body.content));
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

    const configuration = await loadConfiguration(
      process.argv[2] ?? path.join(process.cwd(), "configuration.js")
    );
    await configuration(require);

    async function loadConfiguration(
      configurationFile: string
    ): Promise<(require: NodeRequire) => Promise<void>> {
      configurationFile = path.resolve(configurationFile);
      try {
        const configuration = require(configurationFile);
        console.log(`Configuration loaded from ‘${configurationFile}’`);
        return configuration;
      } catch (error) {
        if (error.code !== "MODULE_NOT_FOUND") {
          console.error(
            `Failed to load configuration from ‘${configurationFile}’ (probably there’s a problem with your configuration): ${error.message}`
          );
          process.exit(1);
        }
        switch (
          (
            await inquirer.prompt({
              type: "list",
              message: `There’s no configuration file at ‘${configurationFile}’. What would you like to do?`,
              choices: [
                `Create a configuration file at ‘${configurationFile}’`,
                "Load or create a configuration file at a different place",
                "Exit",
              ],
              name: "answer",
            })
          ).answer
        ) {
          case `Create a configuration file at ‘${configurationFile}’`:
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
                  ).answer ===
                  "From other devices as well (for example, my phone)"
                )
                  url = (
                    await inquirer.prompt({
                      type: "input",
                      name: "answer",
                      message: `With what URL can other devices access this machine (for example, ‘http://<your-machine-name>.local:4000’)?`,
                    })
                  ).answer;
                await fs.ensureDir(path.dirname(configurationFile));
                await fs.writeFile(
                  configurationFile,
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
                            ${'`Demonstration/Development web server started at ${app.get("url")}`'}
                          );
                        });
                      };
                    `,
                    { parser: "babel" }
                  )
                );
                console.log(
                  `Created configuration file at ‘${configurationFile}’`
                );
                break;
              case "Production":
                console.error("TODO");
                // app.disable("demonstration");
                process.exit(1);
            }
            break;
          case "Load or create a configuration file at a different place":
            configurationFile = (
              await inquirer.prompt({
                type: "input",
                message: "Where?",
                name: "answer",
              })
            ).answer;
            break;
          case "Exit":
            process.exit();
        }
        return await loadConfiguration(configurationFile);
      }
    }
  })();
