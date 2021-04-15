#!/usr/bin/env node

import path from "path";
import { strict as assert } from "assert";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";
import validator from "validator";
import emailAddresses from "email-addresses";

import { Database, sql } from "@leafac/sqlite";

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

import QRCode from "qrcode";
import lodash from "lodash";

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

  const ROLES = ["student", "staff"] as const;
  type Role = typeof ROLES[number];

  // https://pico-8.fandom.com/wiki/Palette
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

  const ANONYMOUS_ENROLLMENT = {
    id: null,
    user: { id: null, email: null, name: "Anonymous" },
    role: null,
  } as const;
  type AnonymousEnrollment = typeof ANONYMOUS_ENROLLMENT;

  interface Post {
    id: number;
    createdAt: string;
    updatedAt: string;
    reference: string;
    content: string;
  }

  interface Like {
    id: number;
  }

  await fs.ensureDir(rootDirectory);
  const database = new Database(path.join(rootDirectory, "courselore.db"));
  app.set("database", database);
  database.executeTransaction(() => {
    const migrations = [
      () => {
        database.execute(sql`
          CREATE TABLE "users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "email" TEXT NOT NULL UNIQUE,
            "name" TEXT NOT NULL
          );
    
          CREATE TABLE "courses" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "reference" TEXT NOT NULL UNIQUE,
            "name" TEXT NOT NULL,
            "nextThreadReference" INTEGER NOT NULL DEFAULT 1
          );
    
          CREATE TABLE "invitations" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "expiresAt" TEXT NULL,
            "usedAt" TEXT NULL,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "email" TEXT NULL,
            "name" TEXT NULL,
            "role" TEXT NOT NULL CHECK ("role" IN ('student', 'staff')),
            UNIQUE ("course", "reference")
          );
    
          CREATE TABLE "enrollments" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "role" TEXT NOT NULL CHECK ("role" IN ('student', 'staff')),
            "accentColor" TEXT NOT NULL CHECK ("accentColor" IN ('#83769c', '#ff77a8', '#29adff', '#ffa300', '#ff004d', '#7e2553', '#008751', '#ab5236', '#1d2b53', '#5f574f')),
            UNIQUE ("user", "course"),
            UNIQUE ("course", "reference")
          );
    
          CREATE TABLE "threads" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "nextPostReference" INTEGER NOT NULL DEFAULT 1,
            UNIQUE ("course", "reference")
          );
    
          CREATE TABLE "posts" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "updatedAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "thread" INTEGER NOT NULL REFERENCES "threads" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
            "content" TEXT NOT NULL,
            UNIQUE ("thread", "reference")
          );
    
          CREATE TABLE "likes" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "post" INTEGER NOT NULL REFERENCES "posts" ON DELETE CASCADE,
            "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
            UNIQUE ("post", "enrollment")
          );
    
          CREATE TABLE "authenticationNonces" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "expiresAt" TEXT NOT NULL,
            "nonce" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE
          );
    
          CREATE TABLE "sessions" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "expiresAt" TEXT NOT NULL,
            "token" TEXT NOT NULL UNIQUE,
            "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
          );
    
          CREATE TABLE "emailsQueue" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "tryAfter" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
            "triedAt" TEXT NOT NULL DEFAULT (json_array()) CHECK (json_valid("triedAt")),
            "to" TEXT NOT NULL,
            "subject" TEXT NOT NULL,
            "body" TEXT NOT NULL
          );
        `);
      },
    ];
    for (const migration of migrations.slice(
      database.pragma("user_version", {
        simple: true,
      })
    ))
      migration();
    database.pragma(`user_version = ${migrations.length}`);
  });

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
                body {
                  font-size: 0.875rem;
                  -webkit-text-size-adjust: 100%;
                  line-height: 1.5;
                  font-family: "Public Sans", sans-serif;
                  margin: 0;
                  overflow-wrap: break-word;

                  @media (prefers-color-scheme: dark) {
                    color: #d4d4d4;
                    background-color: #1e1e1e;
                  }
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

                img {
                  border-radius: 10px;
                  background-color: white;
                }

                h1 {
                  font-size: 1.3rem;
                  line-height: 1.3;
                  font-weight: 800;
                }

                pre,
                div.math-display {
                  overflow: auto;
                  overflow-wrap: normal;
                }

                pre {
                  line-height: 1.3;
                }

                a {
                  color: inherit;
                  transition: color 0.2s;

                  &:hover {
                    color: #ff77a8 !important;
                  }

                  h1 &,
                  nav & {
                    text-decoration: none;
                  }
                }

                input[type="text"],
                input[type="email"],
                input[type="radio"],
                input[type="checkbox"],
                textarea,
                select,
                button {
                  all: unset;
                  border: 1px solid gainsboro;
                  box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;
                  transition: background-color 0.2s, border-color 0.2s;

                  @media (prefers-color-scheme: dark) {
                    border-color: dimgray;
                  }

                  &:focus {
                    border-color: #ff77a8;
                  }

                  &:disabled {
                    background-color: whitesmoke;
                    cursor: not-allowed;

                    @media (prefers-color-scheme: dark) {
                      background-color: #333333;
                    }
                  }
                }

                input[type="text"],
                input[type="email"],
                textarea,
                select,
                button {
                  padding: 0.1rem 1rem;
                  border-radius: 5px;

                  @supports (-webkit-touch-callout: none) {
                    font-size: 16px;
                  }

                  &:disabled {
                    color: gray;

                    @media (prefers-color-scheme: dark) {
                      color: whitesmoke;
                    }
                  }
                }

                input[type="text"],
                input[type="email"],
                textarea {
                  cursor: text;
                }

                input[type="radio"],
                input[type="checkbox"] {
                  display: inline-block;
                  width: 12px;
                  height: 12px;
                  margin-bottom: -2px;
                }

                input[type="radio"] {
                  border-radius: 50%;

                  &:checked {
                    background-image: url("data:image/svg+xml;base64,${Buffer.from(
                      html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                        >
                          <circle cx="6" cy="6" r="4" fill="#ff77a8" />
                        </svg>
                      `
                    ).toString("base64")}");
                  }
                }

                input[type="checkbox"] {
                  border-radius: 3px;

                  &:checked {
                    background-image: url("data:image/svg+xml;base64,${Buffer.from(
                      html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                        >
                          <path
                            d="M10.548 1.559a1.315 1.315 0 00-.921.378.652.652 0 00-.003 0L4.258 7.303 2.363 5.408a.652.652 0 00-.013-.01c-.485-.463-1.342-.455-1.817.02C.057 5.89.046 6.75.508 7.237a.652.652 0 00.009.012l2.82 2.82a.652.652 0 00.003 0c.481.48 1.354.48 1.836 0a.652.652 0 00.003 0l6.287-6.287c.484-.483.484-1.364 0-1.846a1.315 1.315 0 00-.915-.378z"
                            fill="#ff77a8"
                          />
                        </svg>
                      `
                    ).toString("base64")}");
                  }
                }

                textarea {
                  min-height: 5rem;
                  padding: 0.5rem 1rem;
                  resize: vertical;
                }

                select {
                  padding-right: 1.5rem;
                  background: url("data:image/svg+xml;base64,${Buffer.from(
                      html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"
                          ></path>
                        </svg>
                      `
                    ).toString("base64")}")
                    center right 0.3rem no-repeat;

                  @media (prefers-color-scheme: dark) {
                    background-image: url("data:image/svg+xml;base64,${Buffer.from(
                      html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"
                            fill="#d4d4d4"
                          ></path>
                        </svg>
                      `
                    ).toString("base64")}");
                  }

                  &:disabled {
                    background-image: url("data:image/svg+xml;base64,${Buffer.from(
                      html`
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                        >
                          <path
                            d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"
                            fill="gray"
                          ></path>
                        </svg>
                      `
                    ).toString("base64")}");

                    @media (prefers-color-scheme: dark) {
                      background-image: url("data:image/svg+xml;base64,${Buffer.from(
                        html`
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                          >
                            <path
                              d="M12.78 6.22a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06 0L3.22 7.28a.75.75 0 011.06-1.06L8 9.94l3.72-3.72a.75.75 0 011.06 0z"
                              fill="whitesmoke"
                            ></path>
                          </svg>
                        `
                      ).toString("base64")}");
                    }
                  }
                }

                button {
                  text-align: center;
                  background-color: white;
                  cursor: default;

                  @media (prefers-color-scheme: dark) {
                    background-color: #5a5a5a;
                  }

                  &:active {
                    color: white;
                    background-color: #ff77a8;
                  }
                }

                details.popup {
                  &[open] > summary::before {
                    content: "";
                    display: block;
                    position: absolute;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                  }

                  & > summary + * {
                    background-color: whitesmoke;
                    max-width: 300px;
                    padding: 0 1rem;
                    border: 1px solid darkgray;
                    border-radius: 10px;
                    box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010,
                      0 0 10px gainsboro;
                    position: absolute;

                    @media (prefers-color-scheme: dark) {
                      background-color: #464646;
                    }
                  }
                }

                summary {
                  outline: none;
                  cursor: default;
                  transition: color 0.2s;

                  &:hover,
                  details[open] > & {
                    color: #ff77a8;
                  }

                  &.no-marker {
                    list-style: none;

                    &::-webkit-details-marker {
                      display: none;
                    }
                  }
                }

                hr {
                  border: none;
                  border-top: 1px solid silver;

                  @media (prefers-color-scheme: dark) {
                    border-color: black;
                  }
                }

                [hidden] {
                  display: none !important;
                }

                .full-width {
                  box-sizing: border-box !important;
                  width: 100% !important;
                  display: block !important;
                }

                .hint {
                  font-size: 0.75rem;
                  font-weight: normal;
                  line-height: 1.3;
                  color: gray;
                  margin-top: -0.8rem;
                }

                .green:not(:active) {
                  color: #008751;

                  @media (prefers-color-scheme: dark) {
                    color: #00e436;
                  }
                }

                .red:not(:active) {
                  color: #ff004d;
                }

                @media (prefers-color-scheme: light) {
                  .dark {
                    display: none;
                  }
                }

                @media (prefers-color-scheme: dark) {
                  .light {
                    display: none;
                  }
                }
              }
            `}"
          >
            $${body}
          </body>
        </html>
      `)
  );

  app.set(
    "layout application",
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
          <script>
            const eventSource = new EventSource(window.location.href);

            eventSource.addEventListener("replaceWith", (event) => {
              const eventDocument = new DOMParser().parseFromString(
                event.data,
                "text/html"
              );
              document
                .querySelector("head")
                .append(eventDocument.querySelector("head"));
              for (const element of eventDocument.querySelectorAll("body > *"))
                document.getElementById(element.id).replaceWith(element);
            });
          </script>

          $${body}
          $${app.get("demonstration")
            ? html`
                <p
                  style="${css`
                    font-size: 0.56rem;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: white;
                    background-color: #83769c;
                    padding: 0.1rem 1rem;
                    border-top-left-radius: 5px;
                    margin: 0;
                    position: fixed;
                    right: 0;
                    bottom: 0;
                  `}"
                >
                  <a
                    href="${app.get("url")}/demonstration-inbox"
                    title="Go to the Demonstration 
                    Inbox"
                    style="${css`
                      text-decoration: none;
                    `}"
                    >Demonstration</a
                  >
                </p>
              `
            : html``}

          <script src="${app.get(
              "url"
            )}/node_modules/validator/validator.min.js"></script>
          <script src="${app.get(
              "url"
            )}/node_modules/email-addresses/lib/email-addresses.min.js"></script>

          <script>
            (() => {
              // TODO: Extract this into a library?
              // TODO: Maybe use relative times more selectively? Copy whatever Mail.app & GitHub are doing…
              // https://github.com/catamphetamine/javascript-time-ago
              // https://github.com/azer/relative-date
              // https://benborgers.com/posts/js-relative-date
              // https://github.com/digplan/time-ago
              // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat
              //   https://blog.webdevsimplified.com/2020-07/relative-time-format/
              // https://day.js.org
              // http://timeago.yarp.com
              // https://sugarjs.com

              const MINUTES = 60 * 1000;
              const HOURS = 60 * MINUTES;
              const DAYS = 24 * HOURS;
              const WEEKS = 7 * DAYS;
              const MONTHS = 30 * DAYS;
              const YEARS = 365 * DAYS;
              (function relativizeTimes() {
                for (const element of document.querySelectorAll("time")) {
                  if (element.getAttribute("datetime") === null) {
                    element.setAttribute("datetime", element.textContent);
                    element.title = element.textContent;
                  }
                  const difference =
                    new Date(element.getAttribute("datetime")).getTime() -
                    Date.now();
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
                  element.textContent = new Intl.RelativeTimeFormat("en-US", {
                    localeMatcher: "lookup",
                    numeric: "auto",
                  }).format(
                    // TODO: Should this really be ‘round’, or should it be ‘floor/ceil’?
                    Math.round(value),
                    unit
                  );
                }
                window.setTimeout(relativizeTimes, 60 * 1000);
              })();
            })();

            for (const element of document.querySelectorAll("input.datetime"))
              element.value = new Date(element.value).toLocaleString("sv");

            function isValid(element) {
              const resetters = [];
              const isValid = (element.matches("form")
                ? [...element.querySelectorAll("*")]
                : [element]
              ).every((element) => {
                if (
                  typeof element.reportValidity !== "function" ||
                  element.matches("[disabled]")
                )
                  return true;
                const customValidity = customValidator(element);
                if (typeof customValidity !== "string") return true;
                element.setCustomValidity(customValidity);
                resetters.push(() => {
                  element.addEventListener(
                    "input",
                    () => {
                      element.setCustomValidity("");
                    },
                    { once: true }
                  );
                });
                return element.reportValidity();
              });

              if (!isValid) for (const resetter of resetters) resetter();
              return isValid;

              function customValidator(element) {
                if (
                  element.matches("[required]") &&
                  element.value.trim() === ""
                )
                  return "Fill out this field";

                if (
                  element.matches('[type="email"]') &&
                  !validator.isEmail(element.value)
                )
                  return "Enter an email address";

                if (element.matches("input.datetime")) {
                  if (
                    !element.value.match(
                      ${/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/}
                    )
                  )
                    return "Match the pattern YYYY-MM-DD HH:MM:SS";
                  const date = new Date(element.value.replace(" ", "T"));
                  if (isNaN(date.getTime())) return "Invalid datetime";
                  element.value = date.toISOString();
                  resetters.push(() => {
                    element.value = new Date(element.value).toLocaleString(
                      "sv"
                    );
                  });
                }

                if (element.matches("[data-validator]"))
                  return new Function(element.dataset.validator).call(element);
              }
            }

            document.addEventListener("submit", (event) => {
              if (!isValid(event.target)) return event.preventDefault();
              for (const button of event.target.querySelectorAll(
                'button:not([type="button"])'
              ))
                button.disabled = true;
              isSubmitting = true;
            });

            const modifiedInputs = new Set();
            let isSubmitting = false;
            document.addEventListener("input", (event) => {
              modifiedInputs.add(event.target);
            });
            window.addEventListener("beforeunload", (event) => {
              if (modifiedInputs.size === 0 || isSubmitting) return;
              event.preventDefault();
              event.returnValue = "";
            });
          </script>
        `
      )
  );

  app.set(
    "layout main",
    (
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<IsEnrolledInCourseMiddlewareLocals>
      >,
      res: express.Response<any, Partial<IsEnrolledInCourseMiddlewareLocals>>,
      head: HTML,
      body: HTML
    ): HTML =>
      app.get("layout application")(
        req,
        res,
        head,
        html`
          <div
            style="${css`
              ${res.locals.enrollment === undefined
                ? css``
                : css`
                    box-sizing: border-box;
                    border-top: 10px solid ${res.locals.enrollment.accentColor};
                  `}
            `}"
          >
            <div
              style="${css`
                max-width: 600px;
                padding: 0 1rem;
                margin: 0 auto;
              `}"
            >
              <header>$${logoAndMenu(req, res)}</header>
              <main>$${body}</main>
            </div>
          </div>
        `
      )
  );

  // FIXME: This only works for a single process. To support multiple processes poll the database for changes or use a message broker mechanism (ZeroMQ seems like a good candidate).
  const eventSources = new Set<express.Response<any, Record<string, any>>>();

  interface EventSourceMiddlewareLocals {}

  const eventSourceMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    EventSourceMiddlewareLocals
  >[] = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) return next();
      res.type("text/event-stream").writeHead(200);
      eventSources.add(res);
      res.on("close", () => {
        eventSources.delete(res);
      });
    },
  ];

  const logoAndMenu = (
    req: express.Request<
      {},
      HTML,
      {},
      {},
      Partial<IsEnrolledInCourseMiddlewareLocals>
    >,
    res: express.Response<HTML, Partial<IsEnrolledInCourseMiddlewareLocals>>
  ): HTML => html`
    <div
      style="${css`
        display: flex;
        align-items: baseline;
        justify-content: ${res.locals.user === undefined
          ? `space-around`
          : `space-between`};
      `}"
    >
      <h1>
        <a
          href="${app.get("url")}/"
          style="${css`
            display: inline-flex;
            align-items: center;

            & > * + * {
              margin-left: 0.5rem;
            }
          `}"
        >
          $${logo}
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
          <span>CourseLore</span>
        </a>
      </h1>

      $${res.locals.user === undefined
        ? html``
        : html`
            <details
              class="popup"
              style="${css`
                margin-right: -8px;
              `}"
            >
              <summary
                class="no-marker"
                style="${css`
                  & line {
                    transition: stroke 0.2s;
                  }

                  &:hover line,
                  details[open] > & line {
                    stroke: #ff77a8;
                  }
                `}"
              >
                <svg width="30" height="30">
                  <g stroke="gray" stroke-width="2" stroke-linecap="round">
                    <line x1="8" y1="10" x2="22" y2="10" />
                    <line x1="8" y1="15" x2="22" y2="15" />
                    <line x1="8" y1="20" x2="22" y2="20" />
                  </g>
                </svg>
              </summary>
              <nav
                style="${css`
                  transform: translate(calc(-100% + 2rem), -0.5rem);
                `}"
              >
                <p><strong>${res.locals.user.name}</strong></p>
                <p class="hint">${res.locals.user.email}</p>
                <form
                  method="POST"
                  action="${app.get("url")}/authenticate?_method=DELETE"
                >
                  <p><button>Sign Out</button></p>
                </form>
                <p><a href="${app.get("url")}/settings">User Settings</a></p>
                $${res.locals.course === undefined
                  ? html``
                  : html`
                      <p>
                        <a
                          href="${app.get("url")}/courses/${res.locals.course
                            .reference}/settings"
                          >Course Settings</a
                        >
                      </p>
                    `}
                <p><a href="${app.get("url")}/courses/new">New Course</a></p>
              </nav>
            </details>
          `}
    </div>
  `;

  const logo = await fs.readFile(
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

  app.use(express.static(path.join(__dirname, "../public")));
  app.use(methodOverride("_method"));
  app.use(express.urlencoded({ extended: true }));

  const cookieOptions = (): express.CookieOptions => {
    const url = new URL(app.get("url"));
    return {
      domain: url.hostname,
      httpOnly: true,
      path: url.pathname,
      secure: url.protocol === "https",
      sameSite: true,
    };
  };

  function newAuthenticationNonce(email: string): string {
    database.run(
      sql`DELETE FROM "authenticationNonces" WHERE "email" = ${email}`
    );
    const nonce = cryptoRandomString({ length: 40, type: "numeric" });
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);
    database.run(
      sql`
        INSERT INTO "authenticationNonces" ("expiresAt", "nonce", "email")
        VALUES (${expiresAt.toISOString()}, ${nonce}, ${email})
      `
    );
    return nonce;
  }

  function verifyAuthenticationNonce(nonce: string): string | undefined {
    const authenticationNonce = database.get<{
      email: string;
    }>(
      sql`SELECT "email" FROM "authenticationNonces" WHERE "nonce" = ${nonce} AND ${new Date().toISOString()} < "expiresAt"`
    );
    database.run(
      sql`DELETE FROM "authenticationNonces" WHERE "nonce" = ${nonce}`
    );
    return authenticationNonce?.email;
  }

  function openSession(
    req: express.Request<{}, any, {}, {}, {}>,
    res: express.Response<any, {}>,
    userId: number
  ): void {
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 2);
    const token = cryptoRandomString({ length: 100, type: "alphanumeric" });
    database.run(
      sql`
        INSERT INTO "sessions" ("expiresAt", "token", "user")
        VALUES (${expiresAt.toISOString()}, ${token}, ${userId})
      `
    );
    res.cookie("session", token, { ...cookieOptions(), expires: expiresAt });
  }

  function closeSession(
    req: express.Request<{}, any, {}, {}, {}>,
    res: express.Response<any, {}>
  ): void {
    database.run(
      sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
    );
    res.clearCookie("session", cookieOptions());
  }

  interface IsUnauthenticatedMiddlewareLocals {}

  const isUnauthenticatedMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsUnauthenticatedMiddlewareLocals
  >[] = [
    cookieParser(),
    (req, res, next) => {
      if (req.cookies.session === undefined) return next();
      if (
        database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1
              FROM "sessions"
              WHERE "token" = ${req.cookies.session} AND
                    ${new Date().toISOString()} < "expiresAt"
            ) AS "exists"
          `
        )!.exists === 0
      ) {
        closeSession(req, res);
        return next();
      }
      return next("route");
    },
  ];
  app.set(
    "middleware isUnauthenticatedMiddleware",
    isUnauthenticatedMiddleware
  );

  interface IsAuthenticatedMiddlewareLocals {
    user: {
      id: number;
      email: string;
      name: string;
    };
    enrollments: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        nextThreadReference: number;
      };
      reference: string;
      role: Role;
      accentColor: AccentColor;
    }[];
  }

  const isAuthenticatedMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsAuthenticatedMiddlewareLocals
  >[] = [
    cookieParser(),
    (req, res, next) => {
      if (req.cookies.session === undefined) return next("route");
      const session = database.get<{
        expiresAt: string;
        userId: number;
        userEmail: string;
        userName: string;
      }>(sql`
          SELECT "sessions"."expiresAt",
                 "users"."id" AS "userId",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName"
          FROM "sessions"
          JOIN "users" ON "sessions"."user" = "users"."id"
          WHERE "sessions"."token" = ${req.cookies.session} AND
                ${new Date().toISOString()} < "sessions"."expiresAt"
        `);
      if (session === undefined) {
        closeSession(req, res);
        return next("route");
      }
      if (
        new Date(session.expiresAt).getTime() - Date.now() <
        30 * 24 * 60 * 60 * 1000
      ) {
        closeSession(req, res);
        openSession(req, res, session.userId);
      }
      res.locals.user = {
        id: session.userId,
        email: session.userEmail,
        name: session.userName,
      };
      res.locals.enrollments = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseNextThreadReference: number;
          reference: string;
          role: Role;
          accentColor: AccentColor;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."nextThreadReference" AS "courseNextThreadReference"
                   "enrollments"."reference",
                   "enrollments"."role",
                   "enrollments"."accentColor",
            FROM "enrollments"
            JOIN "courses" ON "enrollments"."course" = "courses"."id"
            WHERE "enrollments"."user" = ${res.locals.user.id}
            ORDER BY "enrollments"."id" DESC
          `
        )
        .map((row) => ({
          id: row.id,
          course: {
            id: row.courseId,
            reference: row.courseReference,
            name: row.courseName,
            nextThreadReference: row.courseNextThreadReference,
          },
          reference: row.reference,
          role: row.role,
          accentColor: row.accentColor,
        }));
      next();
    },
  ];
  app.set("middleware isAuthenticatedMiddleware", isAuthenticatedMiddleware);

  const courseSwitcher = (
    req: express.Request<
      { courseReference: string },
      HTML,
      {},
      {},
      IsEnrolledInCourseMiddlewareLocals
    >,
    res: express.Response<HTML, IsEnrolledInCourseMiddlewareLocals>,
    path = ""
  ): HTML =>
    res.locals.otherEnrollments.length === 0
      ? html``
      : html`
          <details class="popup">
            <summary
              class="no-marker"
              style="${css`
                p {
                  transition: color 0.2s;
                }

                &:hover p,
                details[open] > & p {
                  color: #ff77a8;
                }

                & path {
                  transition: fill 0.2s;
                }

                &:hover path,
                details[open] > & path {
                  fill: #ff77a8;
                }
              `}"
            >
              <p
                class="hint"
                style="${css`
                  display: flex;

                  & > * + * {
                    margin-left: 0.3rem;
                  }
                `}"
              >
                <svg width="16" height="16">
                  <path
                    d="M5.22 14.78a.75.75 0 001.06-1.06L4.56 12h8.69a.75.75 0 000-1.5H4.56l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3a.75.75 0 000 1.06l3 3zm5.56-6.5a.75.75 0 11-1.06-1.06l1.72-1.72H2.75a.75.75 0 010-1.5h8.69L9.72 2.28a.75.75 0 011.06-1.06l3 3a.75.75 0 010 1.06l-3 3z"
                    fill="gray"
                  ></path>
                </svg>
                <span>Switch to another course</span>
              </p>
            </summary>
            <nav
              style="${css`
                transform: translateY(-0.5rem);
              `}"
            >
              $${res.locals.otherEnrollments.map(
                (otherEnrollmentJoinCourse) => html`
                  <p>
                    <a
                      href="${app.get(
                        "url"
                      )}/courses/${otherEnrollmentJoinCourse.course
                        .reference}${path}"
                      ><svg width="10" height="10">
                        <circle
                          cx="5"
                          cy="5"
                          r="5"
                          fill="${otherEnrollmentJoinCourse.enrollment
                            .accentColor}"
                        />
                      </svg>
                      <strong>${otherEnrollmentJoinCourse.course.name}</strong>
                      (${otherEnrollmentJoinCourse.enrollment.role})</a
                    >
                  </p>
                `
              )}
            </nav>
          </details>
        `;

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >(["/", "/authenticate"], ...isUnauthenticatedMiddleware, (req, res) => {
    res.send(
      app.get("layout main")(
        req,
        res,
        html`<title>CourseLore · The Open-Source Student Forum</title>`,
        html`
          <div
            style="${css`
              display: flex;

              & > * {
                flex: 1;
              }

              & > * + * {
                margin-left: 3rem;
              }
            `}"
          >
            <form
              method="POST"
              action="${app.get("url")}/authenticate?${qs.stringify({
                redirect: req.query.redirect,
                email: req.query.email,
                name: req.query.name,
              })}"
            >
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <h1>Sign in</h1>
                <p class="hint">Returning user</p>
              </div>
              <p
                style="${css`
                  height: 5rem;
                `}"
              >
                <label>
                  <strong>Email</strong><br />
                  <input
                    type="email"
                    name="email"
                    value="${req.query.email ?? ""}"
                    placeholder="name@educational-email.edu"
                    required
                    autofocus
                    class="full-width"
                  />
                </label>
              </p>
              <p><button class="full-width">Continue</button></p>
            </form>

            <form
              method="POST"
              action="${app.get("url")}/authenticate?${qs.stringify({
                redirect: req.query.redirect,
                email: req.query.email,
                name: req.query.name,
              })}"
            >
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <h1>Sign up</h1>
                <p class="hint">New user</p>
              </div>
              <p
                style="${css`
                  height: 5rem;
                `}"
              >
                <label>
                  <strong>Email</strong><br />
                  <input
                    type="email"
                    name="email"
                    value="${req.query.email ?? ""}"
                    placeholder="name@educational-email.edu"
                    required
                    class="full-width"
                  /><br />
                  <small class="full-width hint">
                    We suggest using the email address you use at your
                    educational institution.
                  </small>
                </label>
              </p>
              <p><button class="full-width">Continue</button></p>
            </form>
          </div>
        `
      )
    );
  });

  app.post<
    {},
    HTML,
    { email?: string },
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >("/authenticate", ...isUnauthenticatedMiddleware, (req, res, next) => {
    if (
      typeof req.body.email !== "string" ||
      !validator.isEmail(req.body.email)
    )
      return next("validation");

    const magicAuthenticationLink = `${app.get(
      "url"
    )}/authenticate/${newAuthenticationNonce(req.body.email)}?${qs.stringify({
      redirect: req.query.redirect,
      email: req.query.email,
      name: req.query.name,
    })}`;
    sendEmail({
      to: req.body.email,
      subject: "Magic Authentication Link",
      body: html`
        <p>
          <a href="${magicAuthenticationLink}">${magicAuthenticationLink}</a>
        </p>
        <p><small>Expires in 10 minutes and may only be used once.</small></p>
      `,
    });

    res.send(
      app.get("layout main")(
        req,
        res,
        html`<title>Authenticate · CourseLore</title>`,
        html`
          <div
            style="${css`
              text-align: center;
            `}"
          >
            <p>
              To continue, check ${req.body.email} and click on the magic
              authentication link.
            </p>
            <form method="POST">
              <input type="hidden" name="email" value="${req.body.email}" />
              <p>
                Didn’t receive the email? Already checked the spam folder?
                <button>Resend</button>
              </p>
            </form>

            $${app.get("demonstration")
              ? html`
                  <p>
                    <strong>
                      CourseLore doesn’t send emails in demonstration mode.
                      <a href="${app.get("url")}/demonstration-inbox"
                        >Go to the Demonstration Inbox</a
                      >.
                    </strong>
                  </p>
                `
              : html``}
          </div>
        `
      )
    );
  });

  app.get<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >("/authenticate/:nonce", ...isUnauthenticatedMiddleware, (req, res) => {
    const email = verifyAuthenticationNonce(req.params.nonce);
    if (email === undefined)
      return res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Authenticate · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <p>
                This magic authentication link is invalid or has expired.
                <a
                  href="${app.get("url")}/authenticate?${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                  >Start over</a
                >.
              </p>
            </div>
          `
        )
      );
    const user = database.get<{ id: number }>(
      sql`SELECT "id" FROM "users" WHERE "email" = ${email}`
    );
    if (user === undefined)
      return res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Sign up · CourseLore</title>`,
          html`
            <div
              style="${css`
                max-width: 300px;
                margin: 0 auto;
              `}"
            >
              <h1
                style="${css`
                  text-align: center;
                `}"
              >
                Welcome to CourseLore!
              </h1>

              <form
                method="POST"
                action="${app.get("url")}/users?${qs.stringify({
                  redirect: req.query.redirect,
                  email: req.query.email,
                  name: req.query.name,
                })}"
              >
                <input
                  type="hidden"
                  name="nonce"
                  value="${newAuthenticationNonce(email)}"
                />
                <p>
                  <label>
                    <strong>Name</strong><br />
                    <input
                      type="text"
                      name="name"
                      value="${req.query.name ?? ""}"
                      required
                      autofocus
                      class="full-width"
                    />
                  </label>
                </p>
                <p>
                  <label>
                    <strong>Email</strong><br />
                    <input
                      type="email"
                      value="${email}"
                      disabled
                      class="full-width"
                    />
                  </label>
                </p>
                <p><button class="full-width">Create Account</button></p>
              </form>
            </div>
          `
        )
      );
    openSession(req, res, user.id);
    res.redirect(`${app.get("url")}${req.query.redirect ?? "/"}`);
  });

  app.post<
    {},
    HTML,
    { nonce?: string; name?: string },
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >("/users", ...isUnauthenticatedMiddleware, (req, res, next) => {
    if (
      typeof req.body.nonce !== "string" ||
      req.body.nonce.trim() === "" ||
      typeof req.body.name !== "string" ||
      req.body.name.trim() === ""
    )
      return next("validation");

    const email = verifyAuthenticationNonce(req.body.nonce);
    if (
      email === undefined ||
      database.get<{ exists: number }>(
        sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${email}) AS "exists"`
      )!.exists === 1
    )
      return res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Sign up · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <p>
                Something went wrong in your sign up.
                <a
                  href="${app.get("url")}/authenticate?${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                  >Start over</a
                >.
              </p>
            </div>
          `
        )
      );
    const userId = database.run(
      sql`INSERT INTO "users" ("email", "name") VALUES (${email}, ${req.body.name})`
    ).lastInsertRowid as number;
    openSession(req, res, userId);
    res.redirect(`${app.get("url")}${req.query.redirect ?? "/"}`);
  });

  app.delete<{}, any, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/authenticate",
    ...isAuthenticatedMiddleware,
    (req, res) => {
      closeSession(req, res);
      res.redirect(`${app.get("url")}/`);
    }
  );

  app.get<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsAuthenticatedMiddlewareLocals
  >("/authenticate/:nonce", ...isAuthenticatedMiddleware, (req, res) => {
    const redirect = `${app.get("url")}${req.query.redirect ?? "/"}`;
    const otherUserEmail = verifyAuthenticationNonce(req.params.nonce);
    const isSelf = otherUserEmail === res.locals.user.email;
    const otherUser =
      otherUserEmail === undefined || isSelf
        ? undefined
        : database.get<{ name: string }>(
            sql`SELECT "name" FROM "users" WHERE "email" = ${otherUserEmail}`
          );
    const currentUserHTML = html`<strong
      >${res.locals.user.name} ${`<${res.locals.user.email}>`}</strong
    >`;
    const otherUserHTML =
      otherUserEmail === undefined
        ? undefined
        : isSelf
        ? html`yourself`
        : otherUser === undefined
        ? html`<strong>${otherUserEmail}</strong>`
        : html`<strong>${otherUser.name} ${`<${otherUserEmail}>`}</strong>`;
    res.send(
      app.get("layout main")(
        req,
        res,
        html`<title>Magic Authentication Link · CourseLore</title>`,
        html`
          <h1>Magic Authentication Link</h1>

          <p>
            You’re already signed in as $${currentUserHTML} and you tried to use
            $${otherUserEmail === undefined
              ? html`an invalid or expired magic authentication link`
              : html`a magic authentication link for $${otherUserHTML}`}.
          </p>

          $${otherUserEmail === undefined || isSelf
            ? html`
                <form
                  method="POST"
                  action="${app.get("url")}/authenticate?_method=DELETE"
                >
                  <p><button>Sign Out</button></p>
                </form>
              `
            : html`
                <form
                  method="POST"
                  action="${app.get(
                    "url"
                  )}/authenticate/${newAuthenticationNonce(
                    otherUserEmail
                  )}?_method=PUT&${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                >
                  <p>
                    Sign out as $${currentUserHTML} and sign
                    ${otherUser === undefined ? "up" : "in"} as
                    $${otherUserHTML}:<br />
                    <button>Switch Users</button>
                  </p>
                </form>
              `}
          $${req.query.redirect === undefined
            ? html``
            : html`
                <p>
                  Continue as $${currentUserHTML} and visit the page to which
                  the magic authentication link would have redirected you:<br />
                  <a href="${redirect}">${redirect}</a>
                </p>
              `}
        `
      )
    );
  });

  app.put<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsAuthenticatedMiddlewareLocals
  >("/authenticate/:nonce", ...isAuthenticatedMiddleware, (req, res) => {
    closeSession(req, res);
    res.redirect(
      `${app.get("url")}/authenticate/${req.params.nonce}?${qs.stringify({
        redirect: req.query.redirect,
        email: req.query.email,
        name: req.query.name,
      })}`
    );
  });

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/",
    ...isAuthenticatedMiddleware,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          return res.send(
            app.get("layout main")(
              req,
              res,
              html`<title>CourseLore</title>`,
              html`
                <h1>Hi ${res.locals.user.name},</h1>

                <p><strong>Welcome to CourseLore!</strong></p>
                <p>
                  To <strong>enroll in an existing course</strong> you either
                  have to follow an invitation link or be invited via email.
                  Contact your course staff for more information.
                </p>
                <p>
                  Or
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
            `${app.get("url")}/courses/${
              res.locals.enrollments[0].course.reference
            }`
          );

        default:
          return res.send(
            app.get("layout main")(
              req,
              res,
              html`<title>CourseLore</title>`,
              html`
                <h1>Hi ${res.locals.user.name},</h1>

                <p>Go to one of your courses:</p>
                <nav>
                  $${res.locals.enrollments.map(
                    (enrollment) =>
                      html`
                        <p>
                          <a
                            href="${app.get("url")}/courses/${enrollment.course
                              .reference}"
                            ><svg width="10" height="10">
                              <circle
                                cx="5"
                                cy="5"
                                r="5"
                                fill="${enrollment.accentColor}"
                              />
                            </svg>
                            <strong>${enrollment.course.name}</strong>
                            (${enrollment.role})</a
                          >
                        </p>
                      `
                  )}
                </nav>
              `
            )
          );
      }
    }
  );

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/settings",
    ...isAuthenticatedMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>User Settings · CourseLore</title>`,
          html`
            <h1>User Settings</h1>

            <form
              method="POST"
              action="${app.get("url")}/settings?_method=PATCH"
            >
              <p>
                <label>
                  <strong>Name</strong><br />
                  <span
                    style="${css`
                      display: flex;

                      & > * + * {
                        margin-left: 1rem;
                      }
                    `}"
                  >
                    <input
                      type="text"
                      name="name"
                      autocomplete="off"
                      required
                      value="${res.locals.user.name}"
                      class="full-width"
                      style="${css`
                        flex: 1 !important;
                      `}"
                    />
                    <button>Change Name</button>
                  </span>
                </label>
              </p>
            </form>

            <p>
              <label>
                <strong>Email</strong><br />
                <input
                  type="email"
                  value="${res.locals.user.email}"
                  disabled
                  class="full-width"
                /><br />
                <small class="full-width hint">
                  Your email is your identity in CourseLore and can’t be
                  changed.
                </small>
              </label>
            </p>
          `
        )
      );
    }
  );

  app.patch<{}, any, { name?: string }, {}, IsAuthenticatedMiddlewareLocals>(
    "/settings",
    ...isAuthenticatedMiddleware,
    (req, res, next) => {
      if (typeof req.body.name === "string") {
        if (req.body.name.trim() === "") return next("validation");
        database.run(
          sql`UPDATE "users" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.user.id}`
        );
      }

      res.redirect(`${app.get("url")}/settings`);
    }
  );

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/courses/new",
    ...isAuthenticatedMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Create a New Course · CourseLore</title>`,
          html`
            <h1>Create a New Course</h1>

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
                    class="full-width"
                  />
                </label>
              </p>
              <p><button>Create Course</button></p>
            </form>
          `
        )
      );
    }
  );

  app.post<{}, any, { name?: string }, {}, IsAuthenticatedMiddlewareLocals>(
    "/courses",
    ...isAuthenticatedMiddleware,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      const courseReference = cryptoRandomString({
        length: 10,
        type: "numeric",
      });
      const newCourseId = database.run(
        sql`INSERT INTO "courses" ("reference", "name") VALUES (${courseReference}, ${req.body.name})`
      ).lastInsertRowid;
      database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${newCourseId},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${defaultAccentColor(req, res)}
          )
        `
      );
      res.redirect(`${app.get("url")}/courses/${courseReference}`);
    }
  );

  function defaultAccentColor(
    req: express.Request<{}, any, {}, {}, IsAuthenticatedMiddlewareLocals>,
    res: express.Response<any, IsAuthenticatedMiddlewareLocals>
  ): AccentColor {
    const accentColorsInUse = new Set<AccentColor>(
      res.locals.enrollments.map((enrollment) => enrollment.accentColor)
    );
    let accentColorsAvailable = new Set<AccentColor>(ACCENT_COLORS);
    for (const accentColorInUse of accentColorsInUse) {
      accentColorsAvailable.delete(accentColorInUse);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  }

  interface IsEnrolledInCourseMiddlewareLocals
    extends IsAuthenticatedMiddlewareLocals {
    course: IsAuthenticatedMiddlewareLocals["enrollments"][number]["course"];
    enrollment: IsAuthenticatedMiddlewareLocals["enrollments"][number];
    otherEnrollments: IsAuthenticatedMiddlewareLocals["enrollments"];
    threads: {
      id: number;
      reference: string;
      title: string;
      nextPostReference: number;
      createdAt: string;
      updatedAt: string;
      authorEnrollment:
        | {
            id: number;
            user: { id: number; email: string; name: string };
            role: Role;
          }
        | AnonymousEnrollment;
      postsCount: number;
      likesCount: number;
    }[];
  }

  // FIXME: Create another middleware that loads threads, because this middleware is also used in pages like /settings, which don’t need threads.
  const isEnrolledInCourseMiddleware: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >[] = [
    ...isAuthenticatedMiddleware,
    (req, res, next) => {
      res.locals.otherEnrollments = [];
      for (const enrollment of res.locals.enrollments)
        if (enrollment.course.reference === req.params.courseReference) {
          res.locals.enrollment = enrollment;
          res.locals.course = enrollment.course;
        } else res.locals.otherEnrollments.push(enrollment);
      if (res.locals.enrollment === undefined) return next("route");

      res.locals.threads = database
        .all<{
          id: number;
          reference: string;
          title: string;
          nextPostReference: number;
        }>(
          sql`
            SELECT "threads"."id",
                   "threads"."reference",
                   "threads"."title",
                   "threads"."nextPostReference"
            FROM "threads"
            WHERE "threads"."course" = ${res.locals.course.id}
            ORDER BY "threads"."id" DESC
          `
        )
        .map((thread) => {
          // FIXME: Try to get rid of these n+1 queries.
          const firstPost = database.get<{
            createdAt: string;
            authorEnrollmentId: number;
            authorUserId: number;
            authorUserEmail: string;
            authorUserName: string;
            authorEnrollmentRole: Role;
            likesCount: number;
          }>(sql`
            SELECT "posts"."createdAt",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email"  AS "authorUserEmail",
                   "authorUser"."name"  AS "authorUserName",
                   "authorEnrollment"."role" AS "authorEnrollmentRole",
                   COUNT("likes"."id") AS "likesCount"
            FROM "posts"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "posts"."authorEnrollment" = "enrollments"."id"
            LEFT JOIN "users" AS "authorUser" ON "enrollments"."user" = "users"."id"
            LEFT JOIN "likes" ON "posts"."id" = "likes"."post"
            GROUP BY "posts"."id"
            WHERE "posts"."thread" = ${thread.id} AND
                  "posts"."reference" = ${"1"}
          `)!;
          const mostRecentlyUpdatedPost = database.get<{
            updatedAt: string;
          }>(sql`
            SELECT "posts"."updatedAt"
            FROM "posts"
            WHERE "posts"."thread" = ${thread.id}
            ORDER BY "posts"."updatedAt" DESC
            LIMIT 1
          `)!;
          const postsCount = database.get<{ postsCount: number }>(
            sql`SELECT COUNT(*) AS "postsCount" FROM "posts" WHERE "posts"."thread" = ${thread.id}`
          )!.postsCount;

          return {
            id: thread.id,
            reference: thread.reference,
            title: thread.title,
            nextPostReference: thread.nextPostReference,
            createdAt: firstPost.createdAt,
            updatedAt: mostRecentlyUpdatedPost.updatedAt,
            authorEnrollment:
              firstPost.authorEnrollmentId !== null
                ? {
                    id: firstPost.authorEnrollmentId,
                    user: {
                      id: firstPost.authorUserId,
                      email: firstPost.authorUserEmail,
                      name: firstPost.authorUserName,
                    },
                    role: firstPost.authorEnrollmentRole,
                  }
                : ANONYMOUS_ENROLLMENT,
            postsCount,
            likesCount: firstPost.likesCount,
          };
        });

      next();
    },
  ];

  interface IsCourseStaffMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {}

  const isCourseStaffMiddleware: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >[] = [
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (res.locals.enrollment.role === "staff") return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference",
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      if (res.locals.threads.length === 0)
        return res.send(
          app.get("layout main")(
            req,
            res,
            html`<title>${res.locals.course.name} · CourseLore</title>`,
            html`
              <h1>
                Welcome to
                <a
                  href="${app.get("url")}/courses/${res.locals.course
                    .reference}"
                  >${res.locals.course.name}</a
                >!
              </h1>

              $${courseSwitcher(req, res)}
              $${res.locals.enrollment.role === "staff"
                ? html`
                    <p>
                      <a
                        href="${app.get("url")}/courses/${res.locals.course
                          .reference}/settings#invitations"
                        ><strong>Invite other people to the course</strong></a
                      >.
                    </p>
                    <p>
                      Or
                      <a
                        href="${app.get("url")}/courses/${res.locals.course
                          .reference}/threads/new"
                        ><strong>create the first thread</strong></a
                      >.
                    </p>
                  `
                : html`
                    <p>
                      This is a new course.
                      <a
                        href="${app.get("url")}/courses/${res.locals.course
                          .reference}/threads/new"
                        ><strong>Create the first thread</strong></a
                      >.
                    </p>
                  `}
            `
          )
        );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals.threads[0].reference
        }`
      );
    }
  );

  interface InvitationExistsMiddlewareLocals {
    invitation: {
      id: number;
      expiresAt: string | null;
      usedAt: string | null;
      course: {
        id: number;
        reference: string;
        name: string;
      };
      reference: string;
      email: string | null;
      name: string | null;
      role: Role;
    };
  }

  const invitationExistsMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    InvitationExistsMiddlewareLocals
  >[] = [
    (req, res, next) => {
      const invitation = database.get<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        courseId: number;
        courseReference: string;
        courseName: string;
        reference: string;
        email: string | null;
        name: string | null;
        role: Role;
      }>(
        sql`
          SELECT "invitations"."id",
                 "invitations"."expiresAt",
                 "invitations"."usedAt",
                 "courses"."id" AS "courseId",
                 "courses"."reference" AS "courseReference",
                 "courses"."name" AS "courseName",
                 "invitations"."reference",
                 "invitations"."email",
                 "invitations"."name",
                 "invitations"."role"
          FROM "invitations"
          JOIN "courses" ON "invitations"."course" = "courses"."id"
          WHERE "courses"."reference" = ${req.params.courseReference} AND
                "invitations"."reference" = ${req.params.invitationReference}
        `
      );
      if (invitation === undefined) return next("route");
      res.locals.invitation = {
        id: invitation.id,
        expiresAt: invitation.expiresAt,
        usedAt: invitation.usedAt,
        course: {
          id: invitation.courseId,
          reference: invitation.courseReference,
          name: invitation.courseName,
        },
        reference: invitation.reference,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
      };
      next();
    },
  ];

  interface MayManageInvitationMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals,
      InvitationExistsMiddlewareLocals {}

  const mayManageInvitationMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    MayManageInvitationMiddlewareLocals
  >[] = [...isCourseStaffMiddleware, ...invitationExistsMiddleware];

  interface IsInvitationUsableMiddlewareLocals
    extends InvitationExistsMiddlewareLocals,
      Partial<IsAuthenticatedMiddlewareLocals> {}

  const isInvitationUsableMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    IsInvitationUsableMiddlewareLocals
  >[] = [
    ...invitationExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.invitation.usedAt !== null ||
        isExpired(res.locals.invitation.expiresAt) ||
        (res.locals.invitation.email !== null &&
          res.locals.user !== undefined &&
          res.locals.invitation.email !== res.locals.user.email)
      )
        return next("route");
      next();
    },
  ];

  function sendInvitationEmail(
    invitation: InvitationExistsMiddlewareLocals["invitation"]
  ): void {
    assert(invitation.email !== null);

    const link = `${app.get("url")}/courses/${
      invitation.course.reference
    }/invitations/${invitation.reference}`;

    sendEmail({
      to: invitation.email,
      subject: `Enroll in ${invitation.course.name}`,
      body: html`
        <p>
          Visit the following link to enroll in ${invitation.course.name}:<br />
          <a href="${link}">${link}</a>
        </p>
        $${invitation.expiresAt === null
          ? html``
          : html`
              <p>
                <small>
                  Expires at ${new Date(invitation.expiresAt).toISOString()}.
                </small>
              </p>
            `}
      `,
    });
  }

  interface MayManageEnrollmentMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals {
    managedEnrollment: {
      id: number;
      reference: string;
      role: Role;
      accentColor: AccentColor;
    };
  }

  const mayManageEnrollmentMiddleware: express.RequestHandler<
    { courseReference: string; enrollmentReference: string },
    any,
    {},
    {},
    MayManageEnrollmentMiddlewareLocals
  >[] = [
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      const managedEnrollment = database.get<{
        id: number;
        reference: string;
        role: Role;
        accentColor: AccentColor;
      }>(
        sql`
          SELECT "id", "reference", "role", "accentColor"
          FROM "enrollments"
          WHERE "course" = ${res.locals.course.id} AND
                "reference" = ${req.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next("route");
      if (
        database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "enrollments"
            WHERE "course" = ${res.locals.course.id} AND
                  "role" = ${"staff"}
          `
        )!.count === 1
      )
        return next("validation");
      res.locals.managedEnrollment = managedEnrollment;
      next();
    },
  ];

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...isCourseStaffMiddleware,
    (req, res) => {
      const invitations = database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        role: Role;
      }>(sql`
        SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "role"
        FROM "invitations"
        WHERE "course" = ${res.locals.course.id}
        ORDER BY "id" DESC
      `);

      const enrollments = database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userName: string;
        reference: string;
        role: Role;
      }>(
        sql`
            SELECT "enrollments"."id",
                   "users"."id" AS "userId",
                   "users"."email" AS "userEmail",
                   "users"."name" AS "userName",
                   "enrollments"."reference",
                   "enrollments"."role"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id"
            WHERE "enrollments"."course" = ${res.locals.course.id}
            ORDER BY "enrollments"."id" DESC
          `
      );

      courseSettings(
        req,
        res,
        html`
          <form
            method="POST"
            action="${app.get("url")}/courses/${res.locals.course
              .reference}/settings?_method=PATCH"
          >
            <p>
              <label>
                <strong>Name</strong><br />
                <span
                  style="${css`
                    display: flex;

                    & > * + * {
                      margin-left: 1rem;
                    }
                  `}"
                >
                  <input
                    type="text"
                    name="name"
                    autocomplete="off"
                    required
                    value="${res.locals.course.name}"
                    class="full-width"
                    style="${css`
                      flex: 1 !important;
                    `}"
                  />
                  <button>Change Name</button>
                </span>
              </label>
            </p>
          </form>

          <hr />

          <p id="invitations"><strong>Invitations</strong></p>

          $${invitations!.length === 0
            ? html``
            : html`
                <details
                  style="${css`
                    margin: 1rem 0;
                  `}"
                >
                  <summary>
                    <strong>Existing Invitations</strong>
                  </summary>

                  $${invitations!.map((invitation) => {
                    const link = `${app.get("url")}/courses/${
                      res.locals.course.reference
                    }/invitations/${invitation.reference}`;

                    return html`
                      <details>
                        <summary>
                          $${invitation.email === null
                            ? html`
                                <code>
                                  ${app.get("url")}/courses/${res.locals.course
                                    .reference}/invitations/${"*".repeat(
                                    6
                                  )}${invitation.reference.slice(6)}
                                </code>
                                <br />
                              `
                            : invitation.name === null
                            ? html`${invitation.email}`
                            : html`${invitation.name} ${`<${invitation.email}>`}`}

                          <small class="hint">
                            ${lodash.capitalize(invitation.role)} ·
                            $${invitation.usedAt !== null
                              ? html`
                                  <span class="green">
                                    Used
                                    <time>${invitation.usedAt}</time>
                                  </span>
                                `
                              : isExpired(invitation.expiresAt)
                              ? html`
                                  <span class="red">
                                    Expired
                                    <time>${invitation.expiresAt}</time>
                                  </span>
                                `
                              : invitation.expiresAt !== null
                              ? html`
                                  Expires
                                  <time>${invitation.expiresAt}</time>
                                `
                              : html`Doesn’t expire`}
                          </small>
                        </summary>

                        $${invitation.email === null &&
                        !isExpired(invitation.expiresAt)
                          ? html`
                              <p>
                                <a href="${link}">See invitation link</a>
                              </p>
                            `
                          : html``}
                        $${invitation.usedAt !== null
                          ? html`
                              <p>
                                This invitation has already been used and may no
                                longer be modified.
                              </p>
                            `
                          : html`
                              $${invitation.email === null ||
                              isExpired(invitation.expiresAt)
                                ? html``
                                : html`
                                    <form
                                      method="POST"
                                      action="${link}?_method=PATCH"
                                    >
                                      <input
                                        type="hidden"
                                        name="resend"
                                        value="true"
                                      />
                                      <p>
                                        Invitation email wasn’t received?
                                        Already checked the spam folder?<br />
                                        <button>Resend Invitation Email</button>
                                      </p>
                                    </form>
                                  `}

                              <div
                                style="${css`
                                  display: flex;

                                  & > * {
                                    flex: 1;
                                  }

                                  & > * + * {
                                    margin-left: 2rem;
                                  }
                                `}"
                              >
                                <form
                                  method="POST"
                                  action="${link}?_method=PATCH"
                                >
                                  <p>
                                    <strong>Role</strong><br />
                                    <span
                                      style="${css`
                                        display: flex;
                                        align-items: baseline;

                                        & > * + * {
                                          margin-left: 1rem;
                                        }
                                      `}"
                                    >
                                      $${ROLES.map(
                                        (role) =>
                                          html`
                                            <label>
                                              <input
                                                type="radio"
                                                name="role"
                                                value="${role}"
                                                required
                                                ${role === invitation.role
                                                  ? `checked`
                                                  : ``}
                                                ${isExpired(
                                                  invitation.expiresAt
                                                )
                                                  ? `disabled`
                                                  : ``}
                                              />
                                              ${lodash.capitalize(role)}
                                            </label>
                                          `
                                      )}
                                      $${isExpired(invitation.expiresAt)
                                        ? html``
                                        : html`
                                            <button
                                              style="${css`
                                                flex: 1;
                                              `}"
                                            >
                                              Change Role
                                            </button>
                                          `}
                                    </span>
                                  </p>
                                  $${isExpired(invitation.expiresAt)
                                    ? html`
                                        <p class="hint">
                                          You may not change the role of an
                                          expired invitation.
                                        </p>
                                      `
                                    : html``}
                                </form>

                                <div>
                                  <form
                                    method="POST"
                                    action="${link}?_method=PATCH"
                                  >
                                    <input
                                      type="hidden"
                                      name="changeExpiration"
                                      value="true"
                                    />
                                    <p>
                                      <label>
                                        <strong>Expiration</strong><br />
                                        <span
                                          style="${css`
                                            display: flex;
                                            align-items: baseline;

                                            & > * + * {
                                              margin-left: 0.5rem !important;
                                            }
                                          `}"
                                        >
                                          <span>
                                            <input
                                              type="checkbox"
                                              ${invitation.expiresAt === null
                                                ? ``
                                                : `checked`}
                                              onchange="${javascript`
                                                const expiresAt = this.closest("p").querySelector('[name="expiresAt"]');
                                                expiresAt.disabled = !this.checked;
                                                if (this.checked) {
                                                  expiresAt.focus();
                                                  expiresAt.setSelectionRange(0, 0);
                                                }
                                              `}"
                                            />
                                          </span>
                                          <span>Expires at</span>
                                          <input
                                            type="text"
                                            name="expiresAt"
                                            value="${invitation.expiresAt ??
                                            new Date().toISOString()}"
                                            required
                                            ${invitation.expiresAt === null
                                              ? `disabled`
                                              : ``}
                                            data-validator="${javascript`
                                              if (new Date(this.value).getTime() <= Date.now())
                                                return "Must be in the future";
                                            `}"
                                            class="full-width datetime"
                                            style="${css`
                                              flex: 1 !important;
                                            `}"
                                          />
                                        </span>
                                      </label>
                                    </p>
                                    <p>
                                      <button class="full-width">
                                        Change Expiration
                                      </button>
                                    </p>
                                  </form>

                                  $${isExpired(invitation.expiresAt)
                                    ? html``
                                    : html`
                                        <form
                                          method="POST"
                                          action="${link}?_method=PATCH"
                                        >
                                          <input
                                            type="hidden"
                                            name="expireNow"
                                            value="true"
                                          />
                                          <p>
                                            <button class="full-width red">
                                              Expire Invitation Now
                                            </button>
                                          </p>
                                        </form>
                                      `}
                                </div>
                              </div>
                            `}
                      </details>
                    `;
                  })}
                  <hr />
                </details>

                <p><strong>Create a New Invitation</strong></p>
              `}

          <form
            method="POST"
            action="${app.get("url")}/courses/${res.locals.course
              .reference}/invitations"
          >
            <div
              style="${css`
                display: flex;
                margin: -1rem 0;

                & > * {
                  flex: 1;
                }

                & > * + * {
                  margin-left: 2rem;
                }
              `}"
            >
              <p>
                <strong>Role</strong><br />
                <span
                  style="${css`
                    display: flex;

                    & > * + * {
                      margin-left: 1rem;
                    }
                  `}"
                >
                  $${ROLES.map(
                    (role, index) =>
                      html`
                        <label>
                          <input
                            type="radio"
                            name="role"
                            value="${role}"
                            required
                            $${index === 0 ? `checked` : ``}
                          />
                          ${lodash.capitalize(role)}
                        </label>
                      `
                  )}
                </span>
              </p>

              <p>
                <label>
                  <strong>Expiration</strong><br />
                  <span
                    style="${css`
                      display: flex;
                      align-items: baseline;

                      & > * + * {
                        margin-left: 0.5rem !important;
                      }
                    `}"
                  >
                    <span>
                      <input
                        type="checkbox"
                        onchange="${javascript`
                          const expiresAt = this.closest("p").querySelector('[name="expiresAt"]');
                          expiresAt.disabled = !this.checked;
                          if (this.checked) {
                            expiresAt.focus();
                            expiresAt.setSelectionRange(0, 0);
                          }
                        `}"
                      />
                    </span>
                    <span>Expires at</span>
                    <input
                      type="text"
                      name="expiresAt"
                      value="${new Date().toISOString()}"
                      required
                      disabled
                      data-validator="${javascript`
                        if (new Date(this.value).getTime() <= Date.now())
                          return "Must be in the future";
                      `}"
                      class="full-width datetime"
                      style="${css`
                        flex: 1 !important;
                      `}"
                    />
                  </span>
                </label>
              </p>
            </div>
            <p>
              <strong>Sharing</strong><br />
              <label>
                <input
                  type="radio"
                  name="sharing"
                  value="link"
                  required
                  checked
                  onchange="${javascript`
                    this.closest("p").querySelector('[name="emails"]').disabled = true;
                  `}"
                />
                With an invitation link
              </label>
              <br />
              <label>
                <input
                  type="radio"
                  name="sharing"
                  value="emails"
                  required
                  onchange="${javascript`
                    const emails = this.closest("p").querySelector('[name="emails"]');
                    emails.disabled = false;
                    emails.focus();
                    emails.setSelectionRange(0, 0);
                  `}"
                />
                Via email
              </label>
              <br />
              <textarea
                name="emails"
                required
                class="full-width"
                disabled
                data-validator="${javascript`
                  const emails = emailAddresses.parseAddressList(this.value);
                  if (
                    emails === null ||
                    emails.find(
                      (email) =>
                        email.type !== "mailbox" || !validator.isEmail(email.address)
                    ) !== undefined
                  )
                    return "Match the requested format";
                `}"
              ></textarea>
              <br />
              <small class="full-width hint">
                Emails must be separated by commas and may include names.
                <br />
                Example:
                <code
                  >${`"Leandro Facchinetti" <leandro@courselore.org>, scott@courselore.org, Ali Madooei <ali@courselore.org>`}</code
                >
              </small>
            </p>
            <p><button>Create Invitation</button></p>
          </form>

          <hr />

          <details id="enrollments">
            <summary><strong>Enrollments</strong></summary>

            $${enrollments!.map(
              (enrollment) => html`
                <details>
                  <summary>
                    ${enrollment.userName} ${`<${enrollment.userEmail}>`}
                    <small class="hint">
                      ${lodash.capitalize(enrollment.role)}
                    </small>
                  </summary>

                  $${enrollment.id !== res.locals.user.id
                    ? html`
                        <div
                          style="${css`
                            display: flex;

                            & > * {
                              flex: 1;
                            }

                            & > * + * {
                              margin-left: 2rem;
                            }
                          `}"
                        >
                          <form
                            method="POST"
                            action="${app.get("url")}/courses/${res.locals
                              .course
                              .reference}/enrollments/${enrollment.reference}?_method=PATCH"
                          >
                            <p>
                              <strong>Role</strong><br />
                              <span
                                style="${css`
                                  display: flex;
                                  align-items: baseline;

                                  & > * + * {
                                    margin-left: 1rem;
                                  }
                                `}"
                              >
                                $${ROLES.map(
                                  (role) =>
                                    html`
                                      <label>
                                        <input
                                          type="radio"
                                          name="role"
                                          value="${role}"
                                          required
                                          ${role === enrollment.role
                                            ? `checked`
                                            : ``}
                                        />
                                        ${lodash.capitalize(role)}
                                      </label>
                                    `
                                )}
                                <button
                                  style="${css`
                                    flex: 1;
                                  `}"
                                >
                                  Change Role
                                </button>
                              </span>
                            </p>
                          </form>

                          <div>
                            <form
                              method="POST"
                              action="${app.get("url")}/courses/${res.locals
                                .course
                                .reference}/enrollments/${enrollment.reference}?_method=DELETE"
                            >
                              <p class="red">
                                <strong>Danger Zone</strong><br />
                                <button
                                  class="full-width"
                                  onclick="${javascript`
                              if (!confirm("Remove ${enrollment.userName} <${enrollment.userEmail}> from ${res.locals.course.name}?\\n\\nYou can’t undo this action!"))
                                event.preventDefault();
                            `}"
                                >
                                  Remove from Course
                                </button>
                              </p>
                            </form>
                          </div>
                        </div>
                      `
                    : enrollments!.filter(
                        (enrollment) => enrollment.role === "staff"
                      ).length === 1
                    ? html`
                        <p>
                          You may not modify the details of your enrollment in
                          ${res.locals.course.name} because you’re the only
                          staff member.
                        </p>
                      `
                    : html`
                        <div class="red">
                          <p
                            style="${css`
                              margin-bottom: -1rem;
                            `}"
                          >
                            <strong>Danger Zone</strong>
                          </p>

                          <div
                            style="${css`
                              display: flex;

                              & > * {
                                flex: 1;
                              }

                              & > * + * {
                                margin-left: 2rem;
                              }
                            `}"
                          >
                            <form
                              method="POST"
                              action="${app.get("url")}/courses/${res.locals
                                .course
                                .reference}/enrollments/${enrollment.reference}?_method=PATCH"
                            >
                              <input
                                type="hidden"
                                name="role"
                                value="student"
                              />
                              <p>
                                <button
                                  class="full-width"
                                  onclick="${javascript`
                                    if (!confirm("Convert yourself into student?\\n\\nYou can’t undo this action!"))
                                      event.preventDefault();
                                  `}"
                                >
                                  Convert Yourself into Student
                                </button>
                              </p>
                            </form>

                            <form
                              method="POST"
                              action="${app.get("url")}/courses/${res.locals
                                .course
                                .reference}/enrollments/${enrollment.reference}?_method=DELETE"
                            >
                              <p>
                                <button
                                  class="full-width"
                                  onclick="${javascript`
                                    if (!confirm("Remove yourself from ${res.locals.course.name}?\\n\\nYou can’t undo this action!"))
                                      event.preventDefault();
                                  `}"
                                >
                                  Remove Yourself from Course
                                </button>
                              </p>
                            </form>
                          </div>
                        </div>
                      `}
                </details>
              `
            )}
          </details>

          <hr />
        `
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      courseSettings(req, res);
    }
  );

  const courseSettings = (
    req: express.Request<
      { courseReference: string },
      HTML,
      {},
      {},
      IsEnrolledInCourseMiddlewareLocals
    >,
    res: express.Response<HTML, IsEnrolledInCourseMiddlewareLocals>,
    body: HTML = html``
  ): void => {
    res.send(
      app.get("layout main")(
        req,
        res,
        html`
          <title>
            Course Settings · ${res.locals.course.name} · CourseLore
          </title>
        `,
        html`
          <h1>
            Course Settings ·
            <a href="${app.get("url")}/courses/${res.locals.course.reference}"
              >${res.locals.course.name}</a
            >
          </h1>
          $${courseSwitcher(req, res, "/settings")} $${body}
          <p><strong>Accent color</strong></p>
          <p class="hint">
            A bar of this color appears at the top of your screen to help you
            tell courses apart.
            $${res.locals.enrollment.role !== "staff"
              ? html``
              : html`Everyone gets a different color of their choosing.`}
          </p>
          <div
            style="${css`
              margin-left: -5px;
              margin-top: -1rem;
            `}"
          >
            $${ACCENT_COLORS.map(
              (accentColor) =>
                html`
                  <form
                    method="POST"
                    action="${app.get("url")}/courses/${res.locals.course
                      .reference}/settings?_method=PATCH"
                    style="${css`
                      display: inline-block;
                    `}"
                  >
                    <input
                      type="hidden"
                      name="accentColor"
                      value="${accentColor}"
                    />
                    <p>
                      <button
                        style="${css`
                          &,
                          &:active {
                            all: unset;
                          }
                        `}"
                      >
                        <svg width="30" height="30">
                          <circle
                            cx="15"
                            cy="15"
                            r="10"
                            fill="${accentColor}"
                          />
                          $${accentColor === res.locals.enrollment.accentColor
                            ? html`<circle
                                cx="15"
                                cy="15"
                                r="3"
                                fill="white"
                              />`
                            : html``}
                        </svg>
                      </button>
                    </p>
                  </form>
                `
            )}
          </div>
        `
      )
    );
  };

  app.patch<
    { courseReference: string },
    HTML,
    { name?: string; accentColor?: AccentColor },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.name === "string" &&
        res.locals.enrollment.role === "staff"
      ) {
        if (req.body.name.trim() === "") return next("validation");
        database.run(
          sql`UPDATE "courses" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.course.id}`
        );
      }

      if (typeof req.body.accentColor === "string") {
        if (!ACCENT_COLORS.includes(req.body.accentColor))
          return next("validation");
        database.run(
          sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
        );
      }

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/settings`
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      role?: Role;
      expiresAt?: string;
      sharing?: "link" | "emails";
      emails?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/invitations",
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !ROLES.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            isNaN(new Date(req.body.expiresAt).getTime()) ||
            isExpired(req.body.expiresAt))) ||
        typeof req.body.sharing !== "string" ||
        !["link", "emails"].includes(req.body.sharing)
      )
        return next("validation");

      switch (req.body.sharing) {
        case "link":
          const invitationReference = cryptoRandomString({
            length: 10,
            type: "numeric",
          });
          database.run(sql`
            INSERT INTO "invitations" ("expiresAt", "course", "reference", "role")
            VALUES (
              ${req.body.expiresAt},
              ${res.locals.course.id},
              ${invitationReference},
              ${req.body.role}
            )
          `);
          res.redirect(
            `${app.get("url")}/courses/${
              res.locals.course.reference
            }/invitations/${invitationReference}`
          );
          break;

        case "emails":
          if (typeof req.body.emails !== "string") return next("validation");
          const emails = emailAddresses.parseAddressList(req.body.emails);
          if (
            emails === null ||
            emails.find(
              (email) =>
                email.type !== "mailbox" || !validator.isEmail(email.address)
            ) !== undefined
          )
            return next("validation");

          for (const email of emails as emailAddresses.ParsedMailbox[]) {
            if (
              database.get<{ exists: number }>(sql`
                  SELECT EXISTS(
                    SELECT 1
                    FROM "enrollments"
                    JOIN "users" ON "enrollments"."user" = "users"."id"
                    WHERE "enrollments"."course" = ${res.locals.course.id} AND
                          "users"."email" = ${email.address}
                  ) AS "exists"
                `)!.exists === 1
            )
              continue;

            const existingUnusedInvitation = database.get<{
              id: number;
              name: string | null;
            }>(sql`
                SELECT "id", "name"
                FROM "invitations"
                WHERE "course" = ${res.locals.course.id} AND
                      "email" = ${email.address} AND
                      "usedAt" IS NULL
              `);
            if (existingUnusedInvitation !== undefined) {
              database.run(sql`
                UPDATE "invitations"
                SET "expiresAt" = ${req.body.expiresAt},
                    "name" = ${email.name ?? existingUnusedInvitation.name},
                    "role" = ${req.body.role}
                WHERE "id" = ${existingUnusedInvitation.id}
              `);
              continue;
            }

            const invitation = {
              expiresAt: req.body.expiresAt ?? null,
              usedAt: null,
              reference: cryptoRandomString({ length: 10, type: "numeric" }),
              email: email.address,
              name: email.name,
              role: req.body.role,
            };
            const invitationId = database.run(sql`
              INSERT INTO "invitations" ("expiresAt", "course", "reference", "email", "name", "role")
              VALUES (
                ${invitation.expiresAt},
                ${res.locals.course.id},
                ${invitation.reference},
                ${invitation.email},
                ${invitation.name},
                ${invitation.role}
              )
            `).lastInsertRowid as number;

            sendInvitationEmail({
              invitation: { id: invitationId, ...invitation },
              course: res.locals.course,
            });
          }

          res.redirect(
            `${app.get("url")}/courses/${
              res.locals.course.reference
            }/settings#invitations`
          );
          break;
      }
    }
  );

  app.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      role?: Role;
      changeExpiration?: "true";
      expiresAt?: string;
      expireNow?: "true";
    },
    {},
    MayManageInvitationMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...mayManageInvitationMiddleware,
    (req, res, next) => {
      if (res.locals.invitationJoinCourse.invitation.usedAt !== null)
        return next("validation");

      if (req.body.resend === "true") {
        if (res.locals.invitationJoinCourse.invitation.email === null)
          return next("validation");

        sendInvitationEmail(res.locals.invitationJoinCourse);
      }

      if (req.body.role !== undefined) {
        if (!ROLES.includes(req.body.role)) return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
        );
      }

      if (req.body.changeExpiration === "true") {
        if (
          req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            isNaN(new Date(req.body.expiresAt).getTime()) ||
            isExpired(req.body.expiresAt))
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
        );
      }

      if (req.body.expireNow === "true")
        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${new Date().toISOString()} WHERE "id" = ${
            res.locals.invitationJoinCourse.invitation.id
          }`
        );

      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.course.reference
        }/settings#invitations`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    MayManageInvitationMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...mayManageInvitationMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        res.locals.invitationJoinCourse.invitation.email !== null ||
        isExpired(res.locals.invitationJoinCourse.invitation.expiresAt)
      )
        return next();

      const link = `${app.get("url")}/courses/${
        res.locals.course.reference
      }/invitations/${res.locals.invitationJoinCourse.invitation.reference}`;
      res.send(
        app.get("layout main")(
          req,
          res,
          html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          html`
            <h1>
              Invitation ·
              <a href="${app.get("url")}/courses/${res.locals.course.reference}"
                >${res.locals.course.name}</a
              >
            </h1>
            <nav>
              <p class="hint">
                <a
                  href="${app.get("url")}/courses/${res.locals.course
                    .reference}/settings"
                  style="${css`
                    display: flex;
                    align-items: center;

                    path {
                      transition: fill 0.2s;
                    }

                    &:hover path {
                      fill: #ff77a8;
                    }
                  `}"
                  ><svg viewBox="0 0 16 16" width="16" height="16">
                    <path
                      d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"
                      fill="gray"
                    ></path>
                  </svg>
                  Return to Course Settings</a
                >
              </p>
            </nav>

            <p>
              <strong>Invitation link</strong><br />
              <code>${link}</code><br />
              <button
                type="button"
                onclick="${javascript`
                  (async () => {
                    await navigator.clipboard.writeText(${JSON.stringify(
                      link
                    )});
                    const originalTextContent = this.textContent;
                    this.textContent = "Copied";
                    await new Promise(resolve => window.setTimeout(resolve, 500));
                    this.textContent = originalTextContent;
                  })();  
                `}"
              >
                Copy
              </button>
            </p>

            <p><strong>QR Code</strong></p>
            <p class="hint">
              People may point their phone camera at the image below to follow
              the invitation link.
            </p>
            <p>
              $${(await QRCode.toString(link, { type: "svg" }))
                .replace("#000000", "url('#gradient')")
                .replace("#ffffff", "#00000000")}
            </p>
          `
        )
      );
    })
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isEnrolledInCourseMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitationJoinCourse.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <h1>
              Invitation ·
              <a
                href="${app.get("url")}/courses/${res.locals
                  .invitationJoinCourse.course.reference}"
                >${res.locals.invitationJoinCourse.course.name}</a
              >
            </h1>

            <p>
              You’re already enrolled in
              ${res.locals.invitationJoinCourse.course.name}.
            </p>
          `
        )
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsAuthenticatedMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isAuthenticatedMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitationJoinCourse.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <h1>Welcome to ${res.locals.invitationJoinCourse.course.name}!</h1>

            <form method="POST">
              <p>
                <button>
                  Enroll as
                  ${lodash.capitalize(
                    res.locals.invitationJoinCourse.invitation.role
                  )}
                </button>
              </p>
            </form>
          `
        )
      );
    }
  );

  app.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsAuthenticatedMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isAuthenticatedMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${res.locals.invitationJoinCourse.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitationJoinCourse.invitation.role},
            ${defaultAccentColor(req, res)}
          )
        `
      );
      if (res.locals.invitationJoinCourse.invitation.email !== null)
        database.run(
          sql`
          UPDATE "invitations"
          SET "usedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
        );

      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.invitationJoinCourse.course.reference
        }`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsUnauthenticatedMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isUnauthenticatedMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitationJoinCourse.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>
                Welcome to ${res.locals.invitationJoinCourse.course.name}!
              </h1>

              <p>
                To enroll, first you have to
                <a
                  href="${app.get("url")}/authenticate?${qs.stringify({
                    redirect: req.originalUrl,
                    ...(res.locals.invitationJoinCourse.invitation.email ===
                    null
                      ? {}
                      : {
                          email:
                            res.locals.invitationJoinCourse.invitation.email,
                        }),
                    ...(res.locals.invitationJoinCourse.invitation.name === null
                      ? {}
                      : {
                          name: res.locals.invitationJoinCourse.invitation.name,
                        }),
                  })}"
                  >authenticate</a
                >.
              </p>
            </div>
          `
        )
      );
    }
  );

  app.patch<
    { courseReference: string; enrollmentReference: string },
    HTML,
    { role?: Role },
    {},
    MayManageEnrollmentMiddlewareLocals
  >(
    "/courses/:courseReference/enrollments/:enrollmentReference",
    ...mayManageEnrollmentMiddleware,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!ROLES.includes(req.body.role)) return next("validation");
        database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );
      }

      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.course.reference
        }/settings#enrollments`
      );
    }
  );

  app.delete<
    { courseReference: string; enrollmentReference: string },
    HTML,
    {},
    {},
    MayManageEnrollmentMiddlewareLocals
  >(
    "/courses/:courseReference/enrollments/:enrollmentReference",
    ...mayManageEnrollmentMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      if (res.locals.managedEnrollment.id === res.locals.enrollment.id)
        return res.redirect(`${app.get("url")}/`);
      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.course.reference
        }/settings#enrollments`
      );
    }
  );

  app.set(
    "layout thread",
    (
      req: express.Request<
        { courseReference: string; threadReference?: string },
        HTML,
        {},
        {},
        {
          user: User;
          enrollmentsJoinCourses: EnrollmentJoinCourse[];
          enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
          otherEnrollments: EnrollmentJoinCourse[];
          threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser?: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
        }
      >,
      res: express.Response<
        HTML,
        {
          user: User;
          enrollmentsJoinCourses: EnrollmentJoinCourse[];
          enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
          otherEnrollments: EnrollmentJoinCourse[];
          threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser?: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
        }
      >,
      head: HTML,
      body: HTML
    ): HTML =>
      app.get("layout application")(
        req,
        res,
        head,
        html`
          <div
            style="${css`
              @at-root {
                #alert {
                  background-color: white;
                  max-width: 700px;
                  padding: 0 1rem;
                  border: 1px solid gainsboro;
                  border-top: none;
                  border-radius: 10px;
                  border-top-left-radius: 0;
                  border-top-right-radius: 0;
                  box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;
                  position: absolute;
                  top: 0;
                  margin: 0 auto;

                  @media (prefers-color-scheme: dark) {
                    color: #d4d4d4;
                    background-color: #1e1e1e;
                  }
                }
              }
            `}"
          >
            <div id="alert">
              <p>REMOVE ME</p>
            </div>
            <button
              type="button"
              style="${css`
                &,
                &:active {
                  all: unset;
                }
              `}"
              onclick="${javascript`
                this.parentElement.hidden = true;
              `}"
            >
              <svg viewBox="0 0 16 16" width="16" height="16">
                <path
                  d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"
                ></path>
              </svg>
            </button>
          </div>

          <div
            style="${css`
              box-sizing: border-box;
              height: 100vh;
              border-top: 10px solid ${res.locals.enrollment.accentColor};
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
                  padding: 0 1rem;

                  @media (prefers-color-scheme: dark) {
                    border-color: black;
                  }
                `}"
              >
                $${logoAndMenu(req, res)}
                <nav>
                  <p
                    style="${css`
                      margin-top: 0;
                    `}"
                  >
                    <a
                      href="${app.get("url")}/courses/${res.locals.course
                        .reference}"
                      ><strong>${res.locals.course.name}</strong> (${res.locals
                        .enrollment.role})</a
                    >
                  </p>
                </nav>
                $${courseSwitcher(req, res)}
              </header>
              <div
                style="${css`
                  flex: 1;
                  padding: 0 1rem;
                  overflow: auto;
                `}"
              >
                <p
                  style="${css`
                    text-align: center;
                  `}"
                >
                  <a
                    href="${app.get("url")}/courses/${res.locals.course
                      .reference}/threads/new"
                    >Create a new thread</a
                  >
                </p>
                <nav>
                  $${res.locals.threadsWithMetadata.map(
                    (threadWithMetadata) =>
                      html`
                        <a
                          href="${app.get("url")}/courses/${res.locals.course
                            .reference}/threads/${threadWithMetadata.reference}"
                          style="${css`
                            line-height: 1.3;
                            display: block;
                            padding: 0.5rem 1rem;
                            margin: 0 -1rem;

                            ${threadWithMetadata.id ===
                            res.locals
                              .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              ?.threadWithMetadata?.id
                              ? css`
                                  background-color: whitesmoke;

                                  @media (prefers-color-scheme: dark) {
                                    background-color: #464646;
                                  }
                                `
                              : css``}
                          `}"
                        >
                          <p
                            style="${css`
                              margin-top: 0;
                            `}"
                          >
                            <strong>${threadWithMetadata.title}</strong>
                          </p>
                          <p
                            class="hint"
                            style="${css`
                              margin-bottom: 0;
                            `}"
                          >
                            #${threadWithMetadata.reference} created
                            <time>${threadWithMetadata.createdAt}</time> by
                            ${threadWithMetadata.author.user.name}
                            $${threadWithMetadata.updatedAt !==
                            threadWithMetadata.createdAt
                              ? html`
                                  <br />
                                  and last updated
                                  <time>${threadWithMetadata.updatedAt}</time>
                                `
                              : html``}
                            <br />
                            <span
                              style="${css`
                                & > * {
                                  display: inline-block;
                                }

                                & > * + * {
                                  margin-left: 0.5rem;
                                }
                              `}"
                            >
                              <span
                                title="${threadWithMetadata.postsCount} posts"
                              >
                                <svg viewBox="0 0 16 16" width="10" height="10">
                                  <path
                                    d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"
                                    fill="gray"
                                  ></path>
                                </svg>
                                ${threadWithMetadata.postsCount}
                              </span>

                              $${threadWithMetadata.likesCount === 0
                                ? html``
                                : html`
                                    <span
                                      title="${threadWithMetadata.likesCount} likes"
                                    >
                                      <svg
                                        viewBox="0 0 16 16"
                                        width="10"
                                        height="10"
                                      >
                                        <path
                                          d="m 8.3496094,0.06640625 c 0.1554219,-0.01874023 0.316875,-0.019125 0.484375,0 0.763,0.087 1.4997656,0.2938125 2.0097656,0.8828125 C 11.34875,1.5302188 11.5,2.328 11.5,3.25 c 0,0.467 -0.08625,1.1187188 -0.15625,1.6367188 L 11.328125,5 H 12.75 c 0.603,0 1.173969,0.084031 1.667969,0.3320312 0.50821,0.2539996 0.910468,0.6800156 1.136719,1.2011719 0.452999,0.998 0.4375,2.4474063 0.1875,4.3164059 l -0.03906,0.304688 c -0.105,0.79 -0.1945,1.473203 -0.3125,2.033203 -0.131,0.63 -0.314969,1.208875 -0.667969,1.671875 C 13.970656,15.846375 12.706,16 11,16 9.152,16 7.7653281,15.667656 6.6113281,15.347656 c -0.165,-0.045 -0.3226093,-0.08981 -0.4746093,-0.132812 -0.658,-0.186 -1.1996094,-0.341016 -1.7246094,-0.416016 C 4.1752281,15.515796 3.5050863,16.000149 2.75,16 h -1 C 0.784,16 0,15.216 0,14.25 V 6.75 C 0,5.7835017 0.78350169,5 1.75,5 h 1 c 0.6240451,-6.83e-5 1.2005796,0.3312739 1.5136719,0.8710938 0.258,-0.105 0.5899687,-0.2678125 0.9179687,-0.5078126 C 5.8526406,4.8732813 6.5,4.079 6.5,2.75 V 2.25 C 6.5,1.19825 7.2616562,0.19758789 8.3496094,0.06640625 Z M 8.6640625,1.5566406 C 8.3570625,1.5206406 8,1.793 8,2.25 v 0.5 C 8,4.672 7.0214063,5.8772187 6.0664062,6.5742188 5.5879272,6.9217253 5.0602055,7.1953645 4.5,7.3847656 v 5.9160154 c 0.705,0.088 1.3902656,0.282563 2.0722656,0.476563 l 0.4414063,0.125 c 1.096,0.305 2.3333281,0.599609 3.9863281,0.599609 1.794,0 2.279344,-0.224781 2.527344,-0.550781 0.147,-0.193 0.276531,-0.50336 0.394531,-1.06836 0.105,-0.501999 0.187922,-1.12564 0.294922,-1.93164 l 0.04101,-0.298828 C 14.507813,8.7703438 14.446453,7.7182969 14.189453,7.1542969 14.105554,6.9457685 13.947011,6.776555 13.746094,6.6757812 13.538094,6.5717812 13.227,6.5019531 12.75,6.5019531 H 11 c -0.686,0 -1.2940781,-0.5788906 -1.2050781,-1.3378906 0.023,-0.192 0.048219,-0.3899375 0.074219,-0.5859375 C 9.9341406,4.090125 10,3.6099531 10,3.2519531 10,2.4429531 9.8568906,2.1015469 9.7128906,1.9355469 9.5758906,1.7775469 9.3100625,1.6306406 8.6640625,1.5566406 Z M 1.75,6.5 C 1.6119288,6.5 1.5,6.6119288 1.5,6.75 v 7.5 c 0,0.138071 0.1119288,0.25 0.25,0.25 h 1 C 2.8880712,14.5 3,14.388071 3,14.25 V 6.75 C 3,6.6119288 2.8880712,6.5 2.75,6.5 Z"
                                          fill="gray"
                                        ></path>
                                      </svg>
                                      ${threadWithMetadata.likesCount}
                                    </span>
                                  `}
                            </span>
                          </p>
                        </a>
                      `
                  )}
                </nav>
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
                  padding: 0 1rem;
                  margin: 0 auto;
                `}"
              >
                $${body}
              </div>
            </main>
          </div>
        `
      )
  );

  const textEditor = (): HTML => html`
    <div class="text-editor">
      <p
        style="${css`
          & > button {
            all: unset;
            color: gray;
            cursor: default;
            transition: font-weight 0.2s, color 0.2s;

            &:hover {
              color: #ff77a8;
            }

            &:disabled {
              font-weight: bold;
              color: inherit;
            }
          }

          & > * + * {
            margin-left: 0.5rem !important;
          }
        `}"
      >
        <button
          type="button"
          class="write"
          disabled
          tabindex="-1"
          onclick="${javascript`
            const textEditor = this.closest("div.text-editor");
            textEditor.querySelector("div.preview").hidden = true;
            textEditor.querySelector("div.write").hidden = false;
            textEditor.querySelector("textarea").focus();
            this.disabled = true;
            textEditor.querySelector("button.preview").disabled = false;
          `}"
        >
          Write
        </button>
        <button
          type="button"
          class="preview"
          tabindex="-1"
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
            margin-top: -0.8rem;
          `}"
        >
          <textarea
            name="content"
            required
            class="full-width"
            onkeydown="${javascript`
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                this.closest("form").querySelector('button:not([type="button"])').click();
              }
            `}"
          ></textarea>
        </p>
        <p
          class="hint"
          style="${css`
            text-align: right;
          `}"
        >
          <a
            href="https://guides.github.com/features/mastering-markdown/"
            target="_blank"
            >Markdown</a
          >
          &
          <a href="https://katex.org/docs/supported.html" target="_blank"
            >LaTeX</a
          >
          are supported
        </p>
      </div>

      $${loading()}

      <div class="preview" hidden></div>
    </div>
  `;

  app.post<{}, any, { content?: string }, {}, IsAuthenticatedMiddlewareLocals>(
    "/preview",
    ...isAuthenticatedMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      res.send(app.get("text processor")(req.body.content));
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/threads/new",
    ...isEnrolledInCourseMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      res.send(
        app.get("layout thread")(
          req,
          res,
          html`
            <title>
              Create a New Thread · ${res.locals.course.name} · CourseLore
            </title>
          `,
          html`
            <h1>Create a New Thread</h1>

            <form
              method="POST"
              action="${app.get("url")}/courses/${res.locals.course
                .reference}/threads"
            >
              <p>
                <label>
                  <strong>Title</strong><br />
                  <input
                    type="text"
                    name="title"
                    autocomplete="off"
                    required
                    autofocus
                    class="full-width"
                  />
                </label>
              </p>
              $${textEditor()}
              <p
                style="${css`
                  text-align: right;
                `}"
              >
                <button>Create Thread</button>
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
    { title?: string; content?: string },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/threads",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "nextThreadReference" = ${
            res.locals.course.nextThreadReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      const threadId = database.run(
        sql`
          INSERT INTO "threads" ("course", "reference", "title", "nextPostReference")
          VALUES (
            ${res.locals.course.id},
            ${String(res.locals.course.nextThreadReference)},
            ${req.body.title},
            ${"2"}
          )
        `
      ).lastInsertRowid;
      database.run(
        sql`
          INSERT INTO "posts" ("thread", "reference", "authorEnrollment", "content")
          VALUES (
            ${threadId},
            ${"1"},
            ${res.locals.enrollment.id},
            ${req.body.content}
          )
        `
      );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals.course.nextThreadReference
        }`
      );
    }
  );

  interface IsThreadAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
  }

  const isThreadAccessibleMiddleware: express.RequestHandler<
    { courseReference: string; threadReference: string },
    HTML,
    {},
    {},
    IsThreadAccessibleMiddlewareLocals
  >[] = [
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      const threadWithMetadata = res.locals.threadsWithMetadata.find(
        (threadWithMetadata) =>
          threadWithMetadata.reference === req.params.threadReference
      );
      if (threadWithMetadata === undefined) return next("route");
      const postsJoinAuthorJoinLikesJoinEnrollmentJoinUser = database
        .all<{
          postId: number;
          createdAt: string;
          updatedAt: string;
          postReference: string;
          content: string;
          authorEnrollmentId: number | null;
          authorEnrollmentReference: string | null;
          role: Role | null;
          accentColor: AccentColor | null;
          authorUserId: number | null;
          email: string | null;
          name: string | null;
        }>(
          sql`
            SELECT "posts"."id" AS "postId",
                   "posts"."createdAt",
                   "posts"."updatedAt",
                   "posts"."reference" AS "postReference",
                   "posts"."content",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorEnrollment"."reference" AS "authorEnrollmentReference",
                   "authorEnrollment"."role",
                   "authorEnrollment"."accentColor",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email",
                   "authorUser"."name"
            FROM "posts"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "posts"."authorEnrollment" = "authorEnrollment"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
            WHERE "posts"."thread" = ${threadWithMetadata.id}
            ORDER BY "posts"."id" ASC
          `
        )
        .map((row) => ({
          post: {
            id: row.postId,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            reference: row.postReference,
            content: row.content,
          },
          author:
            row.authorEnrollmentId !== null
              ? {
                  enrollment: {
                    id: row.authorEnrollmentId!,
                    reference: row.authorEnrollmentReference!,
                    role: row.role!,
                    accentColor: row.accentColor!,
                  },
                  user: {
                    id: row.authorUserId!,
                    email: row.email!,
                    name: row.name!,
                  },
                }
              : ANONYMOUS_ENROLLMENT,
          // FIXME: Can we do better than this n+1 query?
          likesJoinEnrollmentJoinUser: database
            .all<{
              likeId: number;
              enrollmentId: number | null;
              reference: string | null;
              role: Role | null;
              accentColor: AccentColor | null;
              userId: number | null;
              email: string | null;
              name: string | null;
            }>(
              sql`
                SELECT "likes"."id" AS "likeId",
                       "enrollments"."id" AS "enrollmentId",
                       "enrollments"."reference",
                       "enrollments"."role",
                       "enrollments"."accentColor",
                       "users"."id" AS "userId",
                       "users"."email",
                       "users"."name"
                FROM "likes"
                LEFT JOIN "enrollments" ON "likes"."enrollment" = "enrollments"."id"
                LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE "likes"."post" = ${row.postId}
              `
            )
            .map((row) => ({
              like: { id: row.likeId },
              enrollmentJoinUser:
                row.enrollmentId !== null
                  ? {
                      enrollment: {
                        id: row.enrollmentId!,
                        reference: row.reference!,
                        role: row.role!,
                        accentColor: row.accentColor!,
                      },
                      user: {
                        id: row.userId!,
                        email: row.email!,
                        name: row.name!,
                      },
                    }
                  : ANONYMOUS_ENROLLMENT,
            })),
        }));

      res.locals.threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser = {
        threadWithMetadata,
        postsJoinAuthorJoinLikesJoinEnrollmentJoinUser,
      };

      next();
    },
  ];

  const mayEditThread = (
    req: express.Request<
      { courseReference: string; threadReference: string },
      any,
      {},
      {},
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollments: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
      }
    >,
    res: express.Response<
      any,
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollments: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
      }
    >
  ): boolean =>
    res.locals.enrollment.role === "staff" ||
    res.locals
      .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
      .threadWithMetadata.author.user.id === res.locals.user.id;

  interface MayEditThreadMiddlewareLocals
    extends IsThreadAccessibleMiddlewareLocals {}

  const mayEditThreadMiddleware: express.RequestHandler<
    { courseReference: string; threadReference: string },
    any,
    {},
    {},
    MayEditThreadMiddlewareLocals
  >[] = [
    ...isThreadAccessibleMiddleware,
    (req, res, next) => {
      if (mayEditThread(req, res)) return next();
      next("route");
    },
  ];

  interface PostExistsMiddlewareLocals
    extends IsThreadAccessibleMiddlewareLocals {
    postJoinAuthorJoinLikesJoinEnrollmentJoinUser: PostJoinAuthorJoinLikesJoinEnrollmentJoinUser;
  }

  const postExistsMiddleware: express.RequestHandler<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    {},
    {},
    PostExistsMiddlewareLocals
  >[] = [
    ...isThreadAccessibleMiddleware,
    (req, res, next) => {
      const postJoinAuthorJoinLikesJoinEnrollmentJoinUser = res.locals.threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser.postsJoinAuthorJoinLikesJoinEnrollmentJoinUser.find(
        (postJoinAuthorJoinLikesJoinEnrollmentJoinUser) =>
          postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post.reference ===
          req.params.postReference
      );
      if (postJoinAuthorJoinLikesJoinEnrollmentJoinUser === undefined)
        return next("route");
      res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser = postJoinAuthorJoinLikesJoinEnrollmentJoinUser;
      next();
    },
  ];

  const mayEditPost = (
    req: express.Request<
      { courseReference: string; threadReference: string },
      any,
      {},
      {},
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollments: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
      }
    >,
    res: express.Response<
      any,
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollments: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser: ThreadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser;
      }
    >,
    postJoinAuthorJoinLikesJoinEnrollmentJoinUser: PostJoinAuthorJoinLikesJoinEnrollmentJoinUser
  ): boolean =>
    res.locals.enrollment.role === "staff" ||
    postJoinAuthorJoinLikesJoinEnrollmentJoinUser.author.user.id ===
      res.locals.user.id;

  interface MayEditPostMiddlewareLocals extends PostExistsMiddlewareLocals {}

  const mayEditPostMiddleware: express.RequestHandler<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    {},
    {},
    MayEditPostMiddlewareLocals
  >[] = [
    ...postExistsMiddleware,
    (req, res, next) => {
      if (
        mayEditPost(
          req,
          res,
          res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser
        )
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
    IsThreadAccessibleMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isThreadAccessibleMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      res.send(
        app.get("layout thread")(
          req,
          res,
          html`
            <title>
              ${res.locals
                .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                .threadWithMetadata.title}
              · ${res.locals.course.name} · CourseLore
            </title>
          `,
          html`
            <div class="title">
              <div
                class="show"
                style="${css`
                  display: flex;
                  align-items: baseline;

                  & > * + * {
                    margin-left: 0.5rem;
                  }
                `}"
              >
                <h1
                  style="${css`
                    flex: 1;
                  `}"
                >
                  ${res.locals
                    .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                    .threadWithMetadata.title}

                  <a
                    href="${app.get("url")}/courses/${res.locals.course
                      .reference}/threads/${res.locals
                      .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                      .threadWithMetadata.reference}"
                    class="hint"
                    >#${res.locals
                      .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                      .threadWithMetadata.reference}</a
                  >
                </h1>

                $${mayEditThread(req, res)
                  ? html`
                      <p>
                        <button
                          type="button"
                          onclick="${javascript`
                            const title = this.closest(".title");
                            title.querySelector(".show").hidden = true;
                            const edit = title.querySelector(".edit");
                            edit.hidden = false;
                            const input = edit.querySelector('[name="title"]');
                            input.value = ${JSON.stringify(
                              res.locals
                                .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                                .threadWithMetadata.title
                            )};
                            input.focus();
                            input.setSelectionRange(0, 0);
                          `}"
                        >
                          Edit Title
                        </button>
                      </p>
                    `
                  : html``}
                $${res.locals.enrollment.role === "staff"
                  ? html`
                      <form
                        method="POST"
                        action="${app.get("url")}/courses/${res.locals.course
                          .reference}/threads/${res.locals
                          .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                          .threadWithMetadata.reference}?_method=DELETE"
                      >
                        <p>
                          <button
                            class="red"
                            onclick="${javascript`
                            if (!confirm("Remove thread?\\n\\nYou can’t undo this action!"))
                              event.preventDefault();
                          `}"
                          >
                            Remove Thread
                          </button>
                        </p>
                      </form>
                    `
                  : html``}
              </div>

              $${mayEditThread(req, res)
                ? html`
                    <form
                      method="POST"
                      action="${app.get("url")}/courses/${res.locals.course
                        .reference}/threads/${res.locals
                        .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                        .threadWithMetadata.reference}?_method=PATCH"
                      hidden
                      class="edit"
                      style="${css`
                        display: flex;

                        & > * + * {
                          margin-left: 1rem;
                        }
                      `}"
                    >
                      <p
                        style="${css`
                          flex: 1;
                        `}"
                      >
                        <input
                          type="text"
                          name="title"
                          autocomplete="off"
                          required
                          class="full-width"
                        />
                      </p>
                      <p>
                        <button class="green">Change Title</button>
                        <button
                          type="button"
                          onclick="${javascript`
                            if (!confirm("Discard changes?")) return;
                            const title = this.closest(".title");
                            title.querySelector(".show").hidden = false;
                            const edit = title.querySelector(".edit");
                            edit.hidden = true;
                            modifiedInputs.delete(edit.querySelector('[name="title"]'));
                          `}"
                        >
                          Cancel
                        </button>
                      </p>
                    </form>
                  `
                : html``}
            </div>

            $${res.locals.threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser.postsJoinAuthorJoinLikesJoinEnrollmentJoinUser.map(
              (postJoinAuthorJoinLikesJoinEnrollmentJoinUser) => html`
                <section
                  id="${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
                    .reference}"
                  class="post"
                  style="${css`
                    border-bottom: 1px solid silver;

                    @media (prefers-color-scheme: dark) {
                      border-color: black;
                    }
                  `}"
                >
                  <div
                    style="${css`
                      display: flex;
                      margin-bottom: -1rem;

                      & > * + * {
                        margin-left: 0.5rem;
                      }
                    `}"
                  >
                    <p
                      style="${css`
                        flex: 1;
                      `}"
                    >
                      <strong
                        >${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.author
                          .user.name}</strong
                      >
                      <span class="hint">
                        said
                        <time
                          >${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
                            .createdAt}</time
                        >
                        $${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
                          .updatedAt !==
                        postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
                          .createdAt
                          ? html`
                              and last edited
                              <time
                                >${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                                  .post.updatedAt}</time
                              >
                            `
                          : html``}
                        <a
                          href="${app.get("url")}/courses/${res.locals.course
                            .reference}/threads/${req.params
                            .threadReference}#${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .post.reference}"
                          style="${css`
                            text-decoration: none;
                          `}"
                          >#${res.locals
                            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .threadWithMetadata
                            .reference}/${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .post.reference}</a
                        >
                      </span>
                    </p>

                    $${mayEditPost(
                      req,
                      res,
                      postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                    )
                      ? html`
                          <p>
                            <button
                              type="button"
                              class="edit-button"
                              onclick="${javascript`
                                const post = this.closest(".post");
                                post.querySelector(".show").hidden = true;
                                const edit = post.querySelector(".edit");
                                edit.hidden = false;
                                const textarea = edit.querySelector('[name="content"]');
                                textarea.value = ${JSON.stringify(
                                  postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                                    .post.content
                                )};
                                textarea.focus();
                                textarea.setSelectionRange(0, 0);
                                this.hidden = true;
                              `}"
                            >
                              Edit Post
                            </button>
                          </p>
                        `
                      : html``}
                    $${res.locals.enrollment.role === "staff" &&
                    postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
                      .reference !== "1"
                      ? html`
                          <form
                            method="POST"
                            action="${app.get("url")}/courses/${res.locals
                              .course.reference}/threads/${res.locals
                              .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              .threadWithMetadata
                              .reference}/posts/${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              .post.reference}?_method=DELETE"
                          >
                            <p>
                              <button
                                class="red"
                                onclick="${javascript`
                                  if (!confirm("Remove post?\\n\\nYou can’t undo this action!"))
                                    event.preventDefault();
                                `}"
                              >
                                Remove Post
                              </button>
                            </p>
                          </form>
                        `
                      : html``}
                  </div>

                  <div class="show">
                    $${app.get("text processor")(
                      postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post.content
                    )}

                    <!-- TODO: Say “you” when you have liked the post. -->
                    <form
                      method="POST"
                      action="${app.get("url")}/courses/${res.locals.course
                        .reference}/threads/${res.locals
                        .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                        .threadWithMetadata
                        .reference}/posts/${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                        .post
                        .reference}/likes${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser.find(
                        (likeJoinEnrollmentJoinUser) =>
                          likeJoinEnrollmentJoinUser.enrollmentJoinUser.user
                            .id === res.locals.user.id
                      ) === undefined
                        ? ""
                        : "?_method=DELETE"}"
                      title="${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                        .likesJoinEnrollmentJoinUser.length === 0
                        ? "Be the first to like this"
                        : postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .likesJoinEnrollmentJoinUser.length === 1
                        ? `${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser[0].enrollmentJoinUser.user.name} liked this`
                        : postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .likesJoinEnrollmentJoinUser.length === 2
                        ? `${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser[0].enrollmentJoinUser.user.name} and ${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser[1].enrollmentJoinUser.user.name} liked this`
                        : postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .likesJoinEnrollmentJoinUser.length === 3
                        ? `${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser[0].enrollmentJoinUser.user.name}, ${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser[1].enrollmentJoinUser.user.name}, and 1 other liked this`
                        : `${
                            postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              .likesJoinEnrollmentJoinUser[0].enrollmentJoinUser
                              .user.name
                          }, ${
                            postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              .likesJoinEnrollmentJoinUser[1].enrollmentJoinUser
                              .user.name
                          }, and ${
                            postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                              .likesJoinEnrollmentJoinUser.length - 2
                          } others liked this`}"
                    >
                      <p
                        style="${css`
                          margin-top: -0.5rem;
                        `}"
                      >
                        <span class="hint">
                          <button
                            style="${css`
                              &,
                              &:active {
                                all: unset;
                              }
                            `}"
                          >
                            <svg viewBox="0 0 16 16" width="12" height="12">
                              <path
                                d="${postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser.find(
                                  (likeJoinEnrollmentJoinUser) =>
                                    likeJoinEnrollmentJoinUser
                                      .enrollmentJoinUser.user.id ===
                                    res.locals.user.id
                                ) === undefined
                                  ? "m 8.3496094,0.06640625 c 0.1554219,-0.01874023 0.316875,-0.019125 0.484375,0 0.763,0.087 1.4997656,0.2938125 2.0097656,0.8828125 C 11.34875,1.5302188 11.5,2.328 11.5,3.25 c 0,0.467 -0.08625,1.1187188 -0.15625,1.6367188 L 11.328125,5 H 12.75 c 0.603,0 1.173969,0.084031 1.667969,0.3320312 0.50821,0.2539996 0.910468,0.6800156 1.136719,1.2011719 0.452999,0.998 0.4375,2.4474063 0.1875,4.3164059 l -0.03906,0.304688 c -0.105,0.79 -0.1945,1.473203 -0.3125,2.033203 -0.131,0.63 -0.314969,1.208875 -0.667969,1.671875 C 13.970656,15.846375 12.706,16 11,16 9.152,16 7.7653281,15.667656 6.6113281,15.347656 c -0.165,-0.045 -0.3226093,-0.08981 -0.4746093,-0.132812 -0.658,-0.186 -1.1996094,-0.341016 -1.7246094,-0.416016 C 4.1752281,15.515796 3.5050863,16.000149 2.75,16 h -1 C 0.784,16 0,15.216 0,14.25 V 6.75 C 0,5.7835017 0.78350169,5 1.75,5 h 1 c 0.6240451,-6.83e-5 1.2005796,0.3312739 1.5136719,0.8710938 0.258,-0.105 0.5899687,-0.2678125 0.9179687,-0.5078126 C 5.8526406,4.8732813 6.5,4.079 6.5,2.75 V 2.25 C 6.5,1.19825 7.2616562,0.19758789 8.3496094,0.06640625 Z M 8.6640625,1.5566406 C 8.3570625,1.5206406 8,1.793 8,2.25 v 0.5 C 8,4.672 7.0214063,5.8772187 6.0664062,6.5742188 5.5879272,6.9217253 5.0602055,7.1953645 4.5,7.3847656 v 5.9160154 c 0.705,0.088 1.3902656,0.282563 2.0722656,0.476563 l 0.4414063,0.125 c 1.096,0.305 2.3333281,0.599609 3.9863281,0.599609 1.794,0 2.279344,-0.224781 2.527344,-0.550781 0.147,-0.193 0.276531,-0.50336 0.394531,-1.06836 0.105,-0.501999 0.187922,-1.12564 0.294922,-1.93164 l 0.04101,-0.298828 C 14.507813,8.7703438 14.446453,7.7182969 14.189453,7.1542969 14.105554,6.9457685 13.947011,6.776555 13.746094,6.6757812 13.538094,6.5717812 13.227,6.5019531 12.75,6.5019531 H 11 c -0.686,0 -1.2940781,-0.5788906 -1.2050781,-1.3378906 0.023,-0.192 0.048219,-0.3899375 0.074219,-0.5859375 C 9.9341406,4.090125 10,3.6099531 10,3.2519531 10,2.4429531 9.8568906,2.1015469 9.7128906,1.9355469 9.5758906,1.7775469 9.3100625,1.6306406 8.6640625,1.5566406 Z M 1.75,6.5 C 1.6119288,6.5 1.5,6.6119288 1.5,6.75 v 7.5 c 0,0.138071 0.1119288,0.25 0.25,0.25 h 1 C 2.8880712,14.5 3,14.388071 3,14.25 V 6.75 C 3,6.6119288 2.8880712,6.5 2.75,6.5 Z"
                                  : "m 8.7246094,1.0332031 c -0.6587706,-0.0772499 -1.25,0.4857182 -1.25,1.2167969 v 0.5 c 0,1.7433939 -0.8587996,2.7708087 -1.71875,3.3984375 C 5.3203307,6.4645348 4.8409962,6.7146417 4.3320312,6.8867188 A 0.52623759,0.52623759 0 0 0 3.9746094,7.3847656 v 5.9160154 a 0.52623759,0.52623759 0 0 0 0.4609375,0.521485 c 0.6519949,0.08138 1.310355,0.266985 1.9921875,0.460937 a 0.52623759,0.52623759 0 0 0 0.00195,0 l 0.4414063,0.125 a 0.52623759,0.52623759 0 0 0 0.00195,0.002 C 7.9832761,14.719116 9.2844798,15.027344 11,15.027344 c 0.918976,0 1.521459,-0.05327 1.974609,-0.169922 0.45315,-0.116655 0.781843,-0.33963 0.970703,-0.587891 0.221477,-0.290781 0.366317,-0.676611 0.492188,-1.279297 0.111298,-0.532107 0.194074,-1.162979 0.300781,-1.966796 v -0.0039 l 0.04102,-0.294922 a 0.52623759,0.52623759 0 0 0 0,-0.0039 C 15.032977,8.8110901 15.01157,7.7088204 14.669922,6.9492188 14.536072,6.6241198 14.29181,6.3602576 13.982422,6.2050781 a 0.52623759,0.52623759 0 0 0 -0.002,0 C 13.669027,6.0493573 13.278352,5.9765625 12.75,5.9765625 H 11 c -0.389981,0 -0.73475,-0.2990291 -0.681641,-0.7519531 l -0.002,0.00195 c 0.0226,-0.188677 0.04855,-0.3845679 0.07422,-0.578125 v -0.00195 c 0.06475,-0.4859924 0.134766,-0.9725832 0.134766,-1.3945313 0,-0.8699503 -0.149756,-1.354682 -0.414063,-1.6601562 C 9.8593817,1.3012309 9.4326222,1.1143068 8.7246094,1.0332031 Z M 1.75,5.9746094 c -0.4224426,0 -0.77539063,0.352948 -0.77539062,0.7753906 v 7.5 c 0,0.422443 0.35294752,0.775391 0.77539062,0.775391 h 1 c 0.4224431,0 0.7753906,-0.352948 0.7753906,-0.775391 V 6.75 C 3.5253906,6.3275574 3.1724426,5.9746094 2.75,5.9746094 Z"}"
                                fill="gray"
                              ></path>
                            </svg>
                          </button>
                          ${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .likesJoinEnrollmentJoinUser.length === 0
                            ? ""
                            : postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                                .likesJoinEnrollmentJoinUser.length}
                        </span>
                      </p>
                    </form>
                  </div>

                  $${mayEditPost(
                    req,
                    res,
                    postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                  )
                    ? html`
                        <form
                          method="POST"
                          action="${app.get("url")}/courses/${res.locals.course
                            .reference}/threads/${res.locals
                            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .threadWithMetadata
                            .reference}/posts/${postJoinAuthorJoinLikesJoinEnrollmentJoinUser
                            .post.reference}?_method=PATCH"
                          hidden
                          class="edit"
                        >
                          $${textEditor()}
                          <p
                            style="${css`
                              text-align: right;
                            `}"
                          >
                            <button
                              type="button"
                              onclick="${javascript`
                                if (!confirm("Discard changes?")) return;
                                const post = this.closest(".post");
                                post.querySelector(".show").hidden = false;
                                const edit = post.querySelector(".edit");
                                edit.hidden = true;
                                modifiedInputs.delete(edit.querySelector('[name="content"]'));
                                post.querySelector(".edit-button").hidden = false;
                              `}"
                            >
                              Cancel
                            </button>
                            <button class="green">Change Post</button>
                          </p>
                        </form>
                      `
                    : html``}
                </section>
              `
            )}

            <form
              method="POST"
              action="${app.get("url")}/courses/${res.locals.course
                .reference}/threads/${res.locals
                .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                .threadWithMetadata.reference}/posts"
            >
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

  app.patch<
    { courseReference: string; threadReference: string },
    HTML,
    { title?: string },
    {},
    MayEditThreadMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...mayEditThreadMiddleware,
    (req, res, next) => {
      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          database.run(
            sql`UPDATE "threads" SET "title" = ${req.body.title} WHERE "id" = ${res.locals.threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser.threadWithMetadata.id}`
          );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }`
      );
    }
  );

  app.delete<
    { courseReference: string; threadReference: string },
    HTML,
    { title?: string },
    {},
    IsCourseStaffMiddlewareLocals & IsThreadAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isCourseStaffMiddleware,
    ...isThreadAccessibleMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "threads" WHERE "id" = ${res.locals.threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser.threadWithMetadata.id}`
      );

      res.redirect(`${app.get("url")}/courses/${res.locals.course.reference}`);
    }
  );

  app.post<
    { courseReference: string; threadReference: string },
    HTML,
    { content?: string },
    {},
    IsThreadAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts",
    ...isThreadAccessibleMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "threads"
          SET "nextPostReference" = ${
            res.locals
              .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
              .threadWithMetadata.nextPostReference + 1
          }
          WHERE "id" = ${
            res.locals
              .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
              .threadWithMetadata.id
          }
        `
      );
      database.run(
        sql`
          INSERT INTO "posts" ("thread", "reference", "authorEnrollment", "content")
          VALUES (
            ${
              res.locals
                .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                .threadWithMetadata.id
            },
            ${String(
              res.locals
                .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
                .threadWithMetadata.nextPostReference
            )},
            ${res.locals.enrollment.id},
            ${req.body.content}
          )
        `
      );

      for (const eventSource of [...eventSources].filter(
        (eventSource) =>
          eventSource.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.id ===
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.id
      ))
        eventSource.write(
          `event: replaceWith\ndata:${processCSS(html`
            <div id="alert">
              <p
                style="${css`
                  display: flex;
                  align-items: baseline;

                  & > * + * {
                    margin-left: 0.5rem;
                  }
                `}"
              >
                <span>This thread has been updated</span>
                <button
                  type="button"
                  onclick="${javascript`
                    window.location.reload();
                  `}"
                >
                  Reload
                </button>
                <button
                  type="button"
                  onclick="${javascript`
                    document.querySelector("#alert").hidden = true;
                  `}"
                >
                  Dismiss
                </button>
              </p>
            </div>
          `).replace(/\n/g, "\ndata:")}\n\n`
        );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }#${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.nextPostReference
        }`
      );
    }
  );

  app.patch<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    { content?: string },
    {},
    MayEditPostMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts/:postReference",
    ...mayEditPostMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "posts"
          SET "content" = ${req.body.content},
              "updatedAt" = ${new Date().toISOString()}
          WHERE "id" = ${
            res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post.id
          }
        `
      );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }#${
          res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
            .reference
        }`
      );
    }
  );

  app.delete<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    { content?: string },
    {},
    IsCourseStaffMiddlewareLocals & PostExistsMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts/:postReference",
    ...isCourseStaffMiddleware,
    ...postExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
          .reference === "1"
      )
        return next("validation");

      database.run(
        sql`DELETE FROM "posts" WHERE "id" = ${res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post.id}`
      );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }`
      );
    }
  );

  app.post<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    { content?: string },
    {},
    PostExistsMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts/:postReference/likes",
    ...postExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser.find(
          (likeJoinEnrollmentJoinUser) =>
            likeJoinEnrollmentJoinUser.enrollmentJoinUser.user.id ===
            res.locals.user.id
        ) !== undefined
      )
        return next("validation");

      database.run(
        sql`INSERT INTO "likes" ("post", "enrollment") VALUES (${res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post.id}, ${res.locals.enrollment.id})`
      );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }#${
          res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
            .reference
        }`
      );
    }
  );

  app.delete<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    { content?: string },
    {},
    PostExistsMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts/:postReference/likes",
    ...postExistsMiddleware,
    (req, res, next) => {
      const likeJoinEnrollmentJoinUser = res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.likesJoinEnrollmentJoinUser.find(
        (likeJoinEnrollmentJoinUser) =>
          likeJoinEnrollmentJoinUser.enrollmentJoinUser.user.id ===
          res.locals.user.id
      );
      if (likeJoinEnrollmentJoinUser === undefined) return next("validation");

      database.run(
        sql`DELETE FROM "likes" WHERE "id" = ${likeJoinEnrollmentJoinUser.like.id}`
      );

      res.redirect(
        `${app.get("url")}/courses/${res.locals.course.reference}/threads/${
          res.locals
            .threadWithMetadataJoinPostsJoinAuthorJoinLikesJoinEnrollmentJoinUser
            .threadWithMetadata.reference
        }#${
          res.locals.postJoinAuthorJoinLikesJoinEnrollmentJoinUser.post
            .reference
        }`
      );
    }
  );

  function sendEmail({
    to,
    subject,
    body,
  }: {
    to: string;
    subject: string;
    body: string;
  }): void {
    database.run(
      sql`INSERT INTO "emailsQueue" ("to", "subject", "body") VALUES (${to}, ${subject}, ${body})`
    );
    // TODO: The worker that sends emails on non-demonstration mode. Kick the worker to wake up from here (as well as periodically just in case…)
  }

  app.get<{}, HTML, {}, {}, {}>("/demonstration-inbox", (req, res, next) => {
    if (!app.get("demonstration")) return next();

    const emails = database.all<{
      createdAt: string;
      to: string;
      subject: string;
      body: string;
    }>(
      sql`SELECT "createdAt", "to", "subject", "body" FROM "emailsQueue" ORDER BY "id" DESC`
    );

    res.send(
      app.get("layout main")(
        req,
        res,
        html`
          <title>
            Demonstration Inbox · CourseLore · The Open-Source Student Forum
          </title>
        `,
        html`
          <h1>Demonstration Inbox</h1>

          <p>
            CourseLore doesn’t send emails in demonstration mode.
            $${emails.length === 0
              ? html`Emails that would have been sent will show up here instead.`
              : html`Here are the emails that would have been sent:`}
          </p>

          $${emails.map(
            (email) => html`
              <details>
                <summary>
                  <strong>${email.subject}</strong>
                  <span class="hint"
                    >${email.to} · <time>${email.createdAt}</time></span
                  >
                </summary>
                $${email.body}
              </details>
            `
          )}
        `
      )
    );
  });

  app.all<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "*",
    ...isAuthenticatedMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Not Found · CourseLore</title>`,
          html`
            <h1>404 · Not Found</h1>

            <p>
              If you think there should be something here, please contact the
              course staff or the
              <a href="${app.get("administrator")}">system administrator</a>.
            </p>
          `
        )
      );
    }
  );

  app.all<{}, HTML, {}, {}, IsUnauthenticatedMiddlewareLocals>(
    "*",
    ...isUnauthenticatedMiddleware,
    (req, res) => {
      res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>Not Found · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>404 · Not Found</h1>

              <p>
                You may have to
                <a
                  href="${app.get("url")}/authenticate?${qs.stringify({
                    redirect: req.originalUrl,
                  })}"
                  >authenticate</a
                >
                to see this page.
              </p>
            </div>
          `
        )
      );
    }
  );

  app.use(((err, req, res, next) => {
    console.error(err);
    const isValidation = err === "validation";
    const message = isValidation ? "Validation" : "Server";
    res.status(isValidation ? 422 : 500).send(
      app.get("layout main")(
        req,
        res,
        html`<title>${message} Error · CourseLore</title>`,
        html`
          <h1>${message} Error</h1>

          <p>
            This is an issue in CourseLore; please report to
            <a href="mailto:issues@courselore.org">issues@courselore.org</a>.
          </p>
        `
      )
    );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, {}>);

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
            margin: 3rem 0;
            display: flex;
            justify-content: center;
            align-items: center;

            & > * + * {
              margin-left: 0.5rem;
            }
          `}"
        >
          $${logo
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

  function isExpired(expiresAt: string | null): boolean {
    return expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
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
