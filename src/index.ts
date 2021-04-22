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
  interface App extends express.Express {
    locals: AppLocals;
  }
  const app = express() as App;

  interface AppLocals {
    settings: Settings;
  }
  interface Settings {
    url: string;
    administrator: string;
    demonstration: boolean;
  }
  app.locals.settings.url = "http://localhost:4000";
  app.locals.settings.administrator =
    "mailto:demonstration-development@courselore.org";
  app.locals.settings.demonstration = true;

  interface AppLocals {
    constants: Constants;
    middlewares: Middlewares;
    helpers: Helpers;
    layouts: Layouts;
    partials: Partials;
  }
  app.locals.constants = {} as Constants;
  app.locals.middlewares = {} as Middlewares;
  app.locals.helpers = {} as Helpers;
  app.locals.layouts = {} as Layouts;
  app.locals.partials = {} as Partials;

  interface Constants {
    roles: Role[];
  }
  type Role = "student" | "staff";
  app.locals.constants.roles = ["student", "staff"];

  // https://pico-8.fandom.com/wiki/Palette
  interface Constants {
    accentColors: AccentColor[];
  }
  type AccentColor =
    | "#83769c"
    | "#ff77a8"
    | "#29adff"
    | "#ffa300"
    | "#ff004d"
    | "#7e2553"
    | "#008751"
    | "#ab5236"
    | "#1d2b53"
    | "#5f574f";
  app.locals.constants.accentColors = [
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
  ];

  interface Constants {
    anonymousEnrollment: AnonymousEnrollment;
  }
  interface AnonymousEnrollment {
    id: null;
    user: { id: null; email: null; name: "Anonymous" };
    role: null;
  }
  app.locals.constants.anonymousEnrollment = {
    id: null,
    user: { id: null, email: null, name: "Anonymous" },
    role: null,
  };

  interface AppLocals {
    database: Database;
  }
  await fs.ensureDir(rootDirectory);
  app.locals.database = new Database(path.join(rootDirectory, "courselore.db"));
  app.locals.database.executeTransaction(() => {
    const migrations = [
      () => {
        app.locals.database.execute(
          sql`
            CREATE TABLE "authenticationNonces" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
              "expiresAt" TEXT NOT NULL,
              "nonce" TEXT NOT NULL UNIQUE,
              "email" TEXT NOT NULL UNIQUE
            );

            CREATE TABLE "users" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
              "email" TEXT NOT NULL UNIQUE,
              "name" TEXT NOT NULL
            );

            CREATE TABLE "sessions" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
              "expiresAt" TEXT NOT NULL,
              "token" TEXT NOT NULL UNIQUE,
              "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
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
      
            CREATE TABLE "emailsQueue" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
              "tryAfter" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
              "triedAt" TEXT NOT NULL DEFAULT (json_array()) CHECK (json_valid("triedAt")),
              "to" TEXT NOT NULL,
              "subject" TEXT NOT NULL,
              "body" TEXT NOT NULL
            );
          `
        );
      },
    ];
    for (const migration of migrations.slice(
      app.locals.database.pragma("user_version", {
        simple: true,
      })
    ))
      migration();
    app.locals.database.pragma(`user_version = ${migrations.length}`);
  });

  interface Layouts {
    base: (
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.base = (req, res, head, body) =>
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
            href="${app.locals.settings.url}/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="${app.locals.settings.url}/favicon-16x16.png"
          />
          <link
            rel="shortcut icon"
            type="image/x-icon"
            href="${app.locals.settings.url}/favicon.ico"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/typeface-public-sans/index.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/typeface-roboto-mono/index.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/katex/dist/katex.min.css"
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
                  fill: #d4d4d4;
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
                @media (prefers-color-scheme: dark) {
                  border-color: dimgray;
                }
                box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;

                &:focus {
                  border-color: #ff77a8;
                }

                &:disabled {
                  background-color: whitesmoke;
                  @media (prefers-color-scheme: dark) {
                    background-color: #333333;
                  }
                  cursor: not-allowed;
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
                        <circle cx="6" cy="6" r="3" fill="#ff77a8" />
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
                min-height: 10rem;
                padding: 0.5rem 1rem;
                resize: vertical;
                white-space: pre-wrap;
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
                @media (prefers-color-scheme: dark) {
                  background-color: #5a5a5a;
                }
                cursor: default;

                &:active {
                  color: white;
                  background-color: #ff77a8;
                }
              }

              details.dropdown {
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
                  @media (prefers-color-scheme: dark) {
                    background-color: #464646;
                  }
                  max-width: 300px;
                  padding: 0 1rem;
                  border: 1px solid darkgray;
                  border-radius: 10px;
                  box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010,
                    0 0 50px -20px;
                  position: absolute;
                }
              }

              summary {
                outline: none;
                cursor: default;

                &:hover,
                details[open] > & {
                  color: #ff77a8;
                  fill: #ff77a8;
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

              blockquote {
                color: gray;
                padding-left: 0.5rem;
                border-left: 3px solid gray;
                margin: 1rem 0;
              }

              [hidden] {
                display: none !important;
              }

              .full-width.full-width {
                box-sizing: border-box;
                width: 100%;
                display: block;
              }

              .hint {
                font-size: 0.75rem;
                font-weight: normal;
                line-height: 1.3;
                color: gray;
                fill: gray;
                margin-top: -0.8rem;
              }

              .green:not(:active) {
                color: #008751;
                fill: #008751;
                @media (prefers-color-scheme: dark) {
                  color: #00e436;
                  fill: #00e436;
                }
              }

              .red:not(:active) {
                color: #ff004d;
                fill: #ff004d;
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
    `);

  interface Layouts {
    application: (
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<EventSourceMiddlewareLocals>
      >,
      res: express.Response<any, Partial<EventSourceMiddlewareLocals>>,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.application = (req, res, head, body) =>
    app.locals.layouts.base(
      req,
      res,
      html`
        <script src="${app.locals.settings
            .url}/node_modules/validator/validator.min.js"></script>
        <script src="${app.locals.settings
            .url}/node_modules/email-addresses/lib/email-addresses.min.js"></script>

        <script>
          (() => {
            const relativizeTimes = () => {
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
              const minutes = 60 * 1000;
              const hours = 60 * minutes;
              const days = 24 * hours;
              const weeks = 7 * days;
              const months = 30 * days;
              const years = 365 * days;
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
                element.textContent = new Intl.RelativeTimeFormat("en-US", {
                  localeMatcher: "lookup",
                  numeric: "auto",
                }).format(
                  // FIXME: Should this really be ‘round’, or should it be ‘floor/ceil’?
                  Math.round(value),
                  unit
                );
              }
            };

            document.addEventListener("DOMContentLoaded", relativizeTimes);
            (function refresh() {
              relativizeTimes();
              window.setTimeout(refresh, 60 * 1000);
            })();
          })();

          document.addEventListener("DOMContentLoaded", () => {
            for (const element of document.querySelectorAll("input.datetime")) {
              if (element.dataset.local === "true") continue;
              element.dataset.local = "true";
              const date = new Date(element.value);
              element.value =
                String(date.getFullYear()) +
                "-" +
                String(date.getMonth() + 1).padStart(2, "0") +
                "-" +
                String(date.getDate()).padStart(2, "0") +
                " " +
                String(date.getHours()).padStart(2, "0") +
                ":" +
                String(date.getMinutes()).padStart(2, "0");
            }
          });

          function isValid(element) {
            const elementsToValidate = [
              ...element.querySelectorAll("*"),
              element,
            ];
            const elementsToReset = [];

            for (const element of elementsToValidate) {
              if (
                typeof element.reportValidity !== "function" ||
                element.matches("[disabled]")
              )
                continue;

              const originalValue = element.value;
              const customValidity = validate(element);
              if (element.value !== originalValue)
                elementsToReset.push({ element, originalValue });

              if (typeof customValidity === "string") {
                element.setCustomValidity(customValidity);
                element.addEventListener(
                  "input",
                  () => {
                    element.setCustomValidity("");
                  },
                  { once: true }
                );
              }

              if (!element.reportValidity()) {
                for (const { element, originalValue } of elementsToReset)
                  element.value = originalValue;
                return false;
              }
            }
            return true;

            function validate(element) {
              if (element.matches("[required]") && element.value.trim() === "")
                return "Fill out this field";

              if (
                element.matches('[type="email"]') &&
                !validator.isEmail(element.value)
              )
                return "Enter an email address";

              if (element.matches("input.datetime")) {
                if (
                  element.value.match(${/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/}) ===
                  null
                )
                  return "Match the pattern YYYY-MM-DD HH:MM";
                const date = new Date(element.value.replace(" ", "T"));
                if (isNaN(date.getTime())) return "Invalid datetime";
                element.value = date.toISOString();
              }

              if (element.matches("[data-onvalidate]"))
                return new Function(element.dataset.onvalidate).call(element);
            }
          }

          const modifiedInputs = new Set();
          (() => {
            document.addEventListener("input", (event) => {
              modifiedInputs.add(event.target);
            });

            document.addEventListener("submit", (event) => {
              if (!isValid(event.target)) return event.preventDefault();
              window.removeEventListener("beforeunload", beforeUnloadHandler);
              for (const button of event.target.querySelectorAll(
                'button:not([type="button"])'
              ))
                button.disabled = true;
            });

            const beforeUnloadHandler = (event) => {
              if (modifiedInputs.size === 0) return;
              event.preventDefault();
              event.returnValue = "";
            };
            window.addEventListener("beforeunload", beforeUnloadHandler);
          })();
        </script>

        $${res.locals.eventSource
          ? html`
              <script>
                const eventSource = new EventSource(window.location.href);
                eventSource.addEventListener("refresh", async () => {
                  const response = await fetch(window.location.href);
                  switch (response.status) {
                    case 200:
                      const refreshedDocument = new DOMParser().parseFromString(
                        await response.text(),
                        "text/html"
                      );
                      document
                        .querySelector("head")
                        .append(
                          ...refreshedDocument.querySelectorAll("head style")
                        );
                      eventSource.dispatchEvent(
                        new CustomEvent("refreshed", {
                          detail: { document: refreshedDocument },
                        })
                      );
                      document.dispatchEvent(new Event("DOMContentLoaded"));
                      break;

                    case 404:
                      alert(
                        "This page has been removed.\\n\\nYou’ll be redirected now."
                      );
                      window.location.href = $${JSON.stringify(
                        app.locals.settings.url
                      )};
                      break;

                    default:
                      console.error(response);
                      break;
                  }
                });
              </script>
            `
          : html``}
        $${head}
      `,
      html`
        $${body}
        $${app.locals.settings.demonstration
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
                  href="${app.locals.settings.url}/demonstration-inbox"
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
      `
    );

  interface Layouts {
    main: (
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >,
      res: express.Response<
        any,
        Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.main = (req, res, head, body) =>
    app.locals.layouts.application(
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
            <header>$${app.locals.partials.logoAndMenu(req, res)}</header>
            <main>$${body}</main>
          </div>
        </div>
      `
    );

  interface Partials {
    logoAndMenu: (
      req: express.Request<
        {},
        HTML,
        {},
        {},
        Partial<IsEnrolledInCourseMiddlewareLocals>
      >,
      res: express.Response<HTML, Partial<IsEnrolledInCourseMiddlewareLocals>>
    ) => HTML;
  }
  app.locals.partials.logoAndMenu = (req, res) => html`
    <div
      style="${css`
        display: flex;
        align-items: center;
        justify-content: ${res.locals.user === undefined
          ? `space-around`
          : `space-between`};
      `}"
    >
      <h1>
        <a
          href="${app.locals.settings.url}/"
          style="${css`
            display: inline-flex;
            align-items: center;

            & > * + * {
              margin-left: 0.5rem;
            }
          `}"
        >
          <svg width="30" height="30">
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#83769c" />
                <stop offset="100%" stop-color="#ff77a8" />
              </linearGradient>
            </defs>
            <polyline
              stroke="url(#gradient)"
              stroke-linecap="round"
              stroke-linejoin="round"
              fill="none"
              points="1.875 1.875 5.625 5.625 5.625 1.875 1.875 5.625 9.375 1.875 13.125 5.625 9.375 5.625 13.125 1.875 9.375 9.375 13.125 13.125 9.375 13.125 13.125 9.375 5.625 13.125 1.875 9.375 1.875 13.125 5.625 9.375 1.875 16.875 5.625 20.625 1.875 20.625 5.625 16.875 1.875 24.375 5.625 28.125 5.625 24.375 1.875 28.125 9.375 24.375 13.125 28.125 13.125 24.375 9.375 28.125 13.125 20.625 9.375 16.875 13.125 16.875 9.375 20.625 16.875 16.875 20.625 20.625 16.875 20.625 20.625 16.875 16.875 24.375 20.625 28.125 20.625 24.375 16.875 28.125 24.375 24.375 28.125 28.125 28.125 24.375 24.375 28.125 28.125 20.625 24.375 16.875 28.125 16.875 24.375 20.625 28.125 13.125 24.375 9.375 24.375 13.125 28.125 9.375 20.625 13.125 16.875 9.375 20.625 9.375 16.875 13.125 20.625 5.625 16.875 1.875 20.625 1.875 16.875 5.625 24.375 1.875 28.125 5.625 28.125 1.875 24.375 5.625"
            />
          </svg>
          <span>CourseLore</span>
        </a>
        <script>
          (() => {
            const logo = document.currentScript.previousElementSibling;
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
      </h1>

      $${res.locals.user === undefined
        ? html``
        : html`
            <details class="dropdown">
              <summary class="no-marker">
                <svg width="16" height="16">
                  <path
                    d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 110 1.5H1.75A.75.75 0 011 7.75zM1.75 12a.75.75 0 100 1.5h12.5a.75.75 0 100-1.5H1.75z"
                  />
                </svg>
              </summary>
              <nav
                style="${css`
                  transform: translate(calc(-100% + 1rem));
                `}"
              >
                <p><strong>${res.locals.user.name}</strong></p>
                <p class="hint">${res.locals.user.email}</p>
                <form
                  method="POST"
                  action="${app.locals.settings
                    .url}/authenticate?_method=DELETE"
                >
                  <p><button class="full-width">Sign Out</button></p>
                </form>
                <p>
                  <a href="${app.locals.settings.url}/settings"
                    >User Settings</a
                  >
                </p>
                $${res.locals.course === undefined
                  ? html``
                  : html`
                      <p>
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings"
                          >Course Settings</a
                        >
                      </p>
                    `}
                <p>
                  <a href="${app.locals.settings.url}/courses/new"
                    >New Course</a
                  >
                </p>
              </nav>
            </details>
          `}
    </div>
  `;

  app.use(express.static(path.join(__dirname, "../public")));
  app.use(methodOverride("_method"));
  interface Settings {
    cookieOptions: () => express.CookieOptions;
  }
  app.locals.settings.cookieOptions = () => {
    const url = new URL(app.locals.settings.url);
    return {
      domain: url.hostname,
      httpOnly: true,
      path: url.pathname,
      secure: url.protocol === "https",
      sameSite: true,
    };
  };
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));

  // FIXME: This only works for a single process. To support multiple processes poll the database for changes or use a message broker mechanism (ZeroMQ seems like a good candidate).
  interface AppLocals {
    eventSources: Set<express.Response<any, Record<string, any>>>;
  }
  app.locals.eventSources = new Set();

  interface Middlewares {
    eventSource: express.RequestHandler<
      {},
      any,
      {},
      {},
      EventSourceMiddlewareLocals
    >[];
  }
  interface EventSourceMiddlewareLocals {
    eventSource: boolean;
  }
  app.locals.middlewares.eventSource = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        res.locals.eventSource = true;
        return next();
      }
      app.locals.eventSources.add(res);
      res.on("close", () => {
        app.locals.eventSources.delete(res);
      });
      res.type("text/event-stream").write("");
    },
  ];

  interface Helpers {
    authenticationNonce: {
      create: (email: string) => string;
      verify: (nonce: string) => string | undefined;
    };
  }
  app.locals.helpers.authenticationNonce = {
    create(email) {
      app.locals.database.run(
        sql`DELETE FROM "authenticationNonces" WHERE "email" = ${email}`
      );
      const nonce = cryptoRandomString({ length: 40, type: "numeric" });
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);
      app.locals.database.run(
        sql`
        INSERT INTO "authenticationNonces" ("expiresAt", "nonce", "email")
        VALUES (${expiresAt.toISOString()}, ${nonce}, ${email})
      `
      );
      return nonce;
    },

    verify(nonce) {
      const authenticationNonce = app.locals.database.get<{
        email: string;
      }>(
        sql`
        SELECT "email"
        FROM "authenticationNonces"
        WHERE "nonce" = ${nonce} AND
              datetime(${new Date().toISOString()}) < datetime("expiresAt")
      `
      );
      app.locals.database.run(
        sql`DELETE FROM "authenticationNonces" WHERE "nonce" = ${nonce}`
      );
      return authenticationNonce?.email;
    },
  };

  interface Helpers {
    session: {
      open: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>,
        userId: number
      ) => void;
      close: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>
      ) => void;
    };
  }
  app.locals.helpers.session = {
    open(req, res, userId) {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 2);
      const token = cryptoRandomString({ length: 100, type: "alphanumeric" });
      app.locals.database.run(
        sql`
        INSERT INTO "sessions" ("expiresAt", "token", "user")
        VALUES (${expiresAt.toISOString()}, ${token}, ${userId})
      `
      );
      res.cookie("session", token, {
        ...app.locals.settings.cookieOptions(),
        expires: expiresAt,
      });
    },

    close(req, res) {
      app.locals.database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      res.clearCookie("session", app.locals.settings.cookieOptions());
    },
  };

  interface Middlewares {
    isUnauthenticated: express.RequestHandler<
      {},
      any,
      {},
      {},
      IsUnauthenticatedMiddlewareLocals
    >[];
  }
  interface IsUnauthenticatedMiddlewareLocals {}
  app.locals.middlewares.isUnauthenticated = [
    (req, res, next) => {
      if (req.cookies.session === undefined) return next();
      if (
        app.locals.database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1
              FROM "sessions"
              WHERE "token" = ${req.cookies.session} AND
                    datetime(${new Date().toISOString()}) < datetime("expiresAt")
            ) AS "exists"
          `
        )!.exists === 0
      ) {
        app.locals.helpers.session.close(req, res);
        return next();
      }
      return next("route");
    },
  ];

  interface Middlewares {
    isAuthenticated: express.RequestHandler<
      {},
      any,
      {},
      {},
      IsAuthenticatedMiddlewareLocals
    >[];
  }
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
  app.locals.middlewares.isAuthenticated = [
    (req, res, next) => {
      if (req.cookies.session === undefined) return next("route");
      const session = app.locals.database.get<{
        expiresAt: string;
        userId: number;
        userEmail: string;
        userName: string;
      }>(
        sql`
          SELECT "sessions"."expiresAt",
                 "users"."id" AS "userId",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName"
          FROM "sessions"
          JOIN "users" ON "sessions"."user" = "users"."id"
          WHERE "sessions"."token" = ${req.cookies.session} AND
                CURRENT_TIMESTAMP < datetime("sessions"."expiresAt")
        `
      );
      if (session === undefined) {
        app.locals.helpers.session.close(req, res);
        return next("route");
      }
      if (
        new Date(session.expiresAt).getTime() - Date.now() <
        30 * 24 * 60 * 60 * 1000
      ) {
        app.locals.helpers.session.close(req, res);
        app.locals.helpers.session.open(req, res, session.userId);
      }
      res.locals.user = {
        id: session.userId,
        email: session.userEmail,
        name: session.userName,
      };
      res.locals.enrollments = app.locals.database
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
                   "courses"."nextThreadReference" AS "courseNextThreadReference",
                   "enrollments"."reference",
                   "enrollments"."role",
                   "enrollments"."accentColor"
            FROM "enrollments"
            JOIN "courses" ON "enrollments"."course" = "courses"."id"
            WHERE "enrollments"."user" = ${res.locals.user.id}
            ORDER BY "enrollments"."id" DESC
          `
        )
        .map((enrollment) => ({
          id: enrollment.id,
          course: {
            id: enrollment.courseId,
            reference: enrollment.courseReference,
            name: enrollment.courseName,
            nextThreadReference: enrollment.courseNextThreadReference,
          },
          reference: enrollment.reference,
          role: enrollment.role,
          accentColor: enrollment.accentColor,
        }));
      next();
    },
  ];

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >(
    ["/", "/authenticate"],
    ...app.locals.middlewares.isUnauthenticated,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
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
                action="${app.locals.settings.url}/authenticate?${qs.stringify({
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
                action="${app.locals.settings.url}/authenticate?${qs.stringify({
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
    }
  );

  app.post<
    {},
    HTML,
    { email?: string },
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >(
    "/authenticate",
    ...app.locals.middlewares.isUnauthenticated,
    (req, res, next) => {
      if (
        typeof req.body.email !== "string" ||
        !validator.isEmail(req.body.email)
      )
        return next("validation");

      const magicAuthenticationLink = `${
        app.locals.settings.url
      }/authenticate/${app.locals.helpers.authenticationNonce.create(
        req.body.email
      )}?${qs.stringify({
        redirect: req.query.redirect,
        email: req.query.email,
        name: req.query.name,
      })}`;
      app.locals.helpers.sendEmail({
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
        app.locals.layouts.main(
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

              $${app.locals.settings.demonstration
                ? html`
                    <p>
                      <strong>
                        CourseLore doesn’t send emails in demonstration mode.
                        <a href="${app.locals.settings.url}/demonstration-inbox"
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
    }
  );

  app.get<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >(
    "/authenticate/:nonce",
    ...app.locals.middlewares.isUnauthenticated,
    (req, res) => {
      const email = app.locals.helpers.authenticationNonce.verify(
        req.params.nonce
      );
      if (email === undefined)
        return res.send(
          app.locals.layouts.main(
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
                    href="${app.locals.settings
                      .url}/authenticate?${qs.stringify({
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
      const user = app.locals.database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${email}`
      );
      if (user === undefined)
        return res.send(
          app.locals.layouts.main(
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
                  action="${app.locals.settings.url}/users?${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                >
                  <input
                    type="hidden"
                    name="nonce"
                    value="${app.locals.helpers.authenticationNonce.create(
                      email
                    )}"
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
      app.locals.helpers.session.open(req, res, user.id);
      res.redirect(`${app.locals.settings.url}${req.query.redirect ?? "/"}`);
    }
  );

  app.post<
    {},
    HTML,
    { nonce?: string; name?: string },
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >("/users", ...app.locals.middlewares.isUnauthenticated, (req, res, next) => {
    if (
      typeof req.body.nonce !== "string" ||
      req.body.nonce.trim() === "" ||
      typeof req.body.name !== "string" ||
      req.body.name.trim() === ""
    )
      return next("validation");

    const email = app.locals.helpers.authenticationNonce.verify(req.body.nonce);
    if (
      email === undefined ||
      app.locals.database.get<{ exists: number }>(
        sql`SELECT EXISTS(SELECT 1 FROM "users" WHERE "email" = ${email}) AS "exists"`
      )!.exists === 1
    )
      return res.send(
        app.locals.layouts.main(
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
                  href="${app.locals.settings.url}/authenticate?${qs.stringify({
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
    const userId = Number(
      app.locals.database.run(
        sql`INSERT INTO "users" ("email", "name") VALUES (${email}, ${req.body.name})`
      ).lastInsertRowid
    );
    app.locals.helpers.session.open(req, res, userId);
    res.redirect(`${app.locals.settings.url}${req.query.redirect ?? "/"}`);
  });

  app.delete<{}, any, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/authenticate",
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      app.locals.helpers.session.close(req, res);
      res.redirect(`${app.locals.settings.url}/`);
    }
  );

  app.get<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsAuthenticatedMiddlewareLocals
  >(
    "/authenticate/:nonce",
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      const otherUserEmail = app.locals.helpers.authenticationNonce.verify(
        req.params.nonce
      );
      const isSelf = otherUserEmail === res.locals.user.email;
      const otherUser =
        otherUserEmail === undefined || isSelf
          ? undefined
          : app.locals.database.get<{ name: string }>(
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
        app.locals.layouts.main(
          req,
          res,
          html`<title>Magic Authentication Link · CourseLore</title>`,
          html`
            <h1>Magic Authentication Link</h1>

            <p>
              You’re already signed in as $${currentUserHTML} and you tried to
              use
              $${otherUserEmail === undefined
                ? html`an invalid or expired magic authentication link`
                : html`a magic authentication link for $${otherUserHTML}`}.
            </p>

            $${otherUserEmail === undefined || isSelf
              ? html`
                  <form
                    method="POST"
                    action="${app.locals.settings
                      .url}/authenticate?_method=DELETE"
                  >
                    <p><button>Sign Out</button></p>
                  </form>
                `
              : html`
                  <form
                    method="POST"
                    action="${app.locals.settings
                      .url}/authenticate/${app.locals.helpers.authenticationNonce.create(
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
                    <a href="${app.locals.settings.url}${req.query.redirect}"
                      >${app.locals.settings.url}${req.query.redirect}</a
                    >
                  </p>
                `}
          `
        )
      );
    }
  );

  app.put<
    { nonce: string },
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsAuthenticatedMiddlewareLocals
  >(
    "/authenticate/:nonce",
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      app.locals.helpers.session.close(req, res);
      res.redirect(
        `${app.locals.settings.url}/authenticate/${
          req.params.nonce
        }?${qs.stringify({
          redirect: req.query.redirect,
          email: req.query.email,
          name: req.query.name,
        })}`
      );
    }
  );

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/",
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          return res.send(
            app.locals.layouts.main(
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
                    ><a href="${app.locals.settings.url}/courses/new"
                      >create a new course</a
                    ></strong
                  >.
                </p>
              `
            )
          );

        case 1:
          return res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.enrollments[0].course.reference}`
          );

        default:
          return res.send(
            app.locals.layouts.main(
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
                            href="${app.locals.settings
                              .url}/courses/${enrollment.course.reference}"
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
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`<title>User Settings · CourseLore</title>`,
          html`
            <h1>User Settings</h1>

            <form
              method="POST"
              action="${app.locals.settings.url}/settings?_method=PATCH"
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
    ...app.locals.middlewares.isAuthenticated,
    (req, res, next) => {
      if (typeof req.body.name === "string") {
        if (req.body.name.trim() === "") return next("validation");
        app.locals.database.run(
          sql`UPDATE "users" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.user.id}`
        );
      }

      res.redirect(`${app.locals.settings.url}/settings`);
    }
  );

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/courses/new",
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`<title>Create a New Course · CourseLore</title>`,
          html`
            <h1>Create a New Course</h1>

            <form method="POST" action="${app.locals.settings.url}/courses">
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
    ...app.locals.middlewares.isAuthenticated,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      const courseReference = cryptoRandomString({
        length: 10,
        type: "numeric",
      });
      const newCourseId = app.locals.database.run(
        sql`INSERT INTO "courses" ("reference", "name") VALUES (${courseReference}, ${req.body.name})`
      ).lastInsertRowid;
      app.locals.database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${newCourseId},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${app.locals.helpers.defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      res.redirect(`${app.locals.settings.url}/courses/${courseReference}`);
    }
  );

  interface Helpers {
    defaultAccentColor: (
      enrollments: IsAuthenticatedMiddlewareLocals["enrollments"]
    ) => AccentColor;
  }
  app.locals.helpers.defaultAccentColor = (enrollments) => {
    const accentColorsInUse = new Set<AccentColor>(
      enrollments.map((enrollment) => enrollment.accentColor)
    );
    let accentColorsAvailable = new Set<AccentColor>(
      app.locals.constants.accentColors
    );
    for (const accentColorInUse of accentColorsInUse) {
      accentColorsAvailable.delete(accentColorInUse);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  };

  // FIXME: Create another middleware that loads threads, because this middleware is also used in pages like /settings, which don’t need threads.
  interface Middlewares {
    isEnrolledInCourse: express.RequestHandler<
      { courseReference: string },
      any,
      {},
      {},
      IsEnrolledInCourseMiddlewareLocals
    >[];
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
  app.locals.middlewares.isEnrolledInCourse = [
    ...app.locals.middlewares.isAuthenticated,
    (req, res, next) => {
      res.locals.otherEnrollments = [];
      for (const enrollment of res.locals.enrollments)
        if (enrollment.course.reference === req.params.courseReference) {
          res.locals.enrollment = enrollment;
          res.locals.course = enrollment.course;
        } else res.locals.otherEnrollments.push(enrollment);
      if (res.locals.enrollment === undefined) return next("route");

      res.locals.threads = app.locals.database
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
          const firstPost = app.locals.database.get<{
            createdAt: string;
            authorEnrollmentId: number | null;
            authorUserId: number | null;
            authorUserEmail: string | null;
            authorUserName: string | null;
            authorEnrollmentRole: Role | null;
            likesCount: number;
          }>(
            sql`
              SELECT "posts"."createdAt",
                    "authorEnrollment"."id" AS "authorEnrollmentId",
                    "authorUser"."id" AS "authorUserId",
                    "authorUser"."email" AS "authorUserEmail",
                    "authorUser"."name" AS "authorUserName",
                    "authorEnrollment"."role" AS "authorEnrollmentRole",
                    COUNT("likes"."id") AS "likesCount"
              FROM "posts"
              LEFT JOIN "enrollments" AS "authorEnrollment" ON "posts"."authorEnrollment" = "authorEnrollment"."id"
              LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
              LEFT JOIN "likes" ON "posts"."id" = "likes"."post"
              WHERE "posts"."thread" = ${thread.id} AND
                    "posts"."reference" = ${"1"}
              GROUP BY "posts"."id"
            `
          )!;
          const mostRecentlyUpdatedPost = app.locals.database.get<{
            updatedAt: string;
          }>(
            sql`
              SELECT "posts"."updatedAt"
              FROM "posts"
              WHERE "posts"."thread" = ${thread.id}
              ORDER BY "posts"."updatedAt" DESC
              LIMIT 1
            `
          )!;
          const postsCount = app.locals.database.get<{ postsCount: number }>(
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
              firstPost.authorEnrollmentId !== null &&
              firstPost.authorUserId !== null &&
              firstPost.authorUserEmail !== null &&
              firstPost.authorUserName !== null &&
              firstPost.authorEnrollmentRole !== null
                ? {
                    id: firstPost.authorEnrollmentId,
                    user: {
                      id: firstPost.authorUserId,
                      email: firstPost.authorUserEmail,
                      name: firstPost.authorUserName,
                    },
                    role: firstPost.authorEnrollmentRole,
                  }
                : app.locals.constants.anonymousEnrollment,
            postsCount,
            likesCount: firstPost.likesCount,
          };
        });

      next();
    },
  ];

  interface Partials {
    courseSwitcher: (
      req: express.Request<
        { courseReference: string },
        HTML,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals
      >,
      res: express.Response<HTML, IsEnrolledInCourseMiddlewareLocals>,
      path?: string
    ) => HTML;
  }
  app.locals.partials.courseSwitcher = (req, res, path = "") =>
    res.locals.otherEnrollments.length === 0
      ? html``
      : html`
          <details class="dropdown">
            <summary class="no-marker hint">
              <p
                style="${css`
                  display: flex;
                  align-items: center;

                  & > * + * {
                    margin-left: 0.3rem;
                  }
                `}"
              >
                <svg width="16" height="16">
                  <path
                    d="M5.22 14.78a.75.75 0 001.06-1.06L4.56 12h8.69a.75.75 0 000-1.5H4.56l1.72-1.72a.75.75 0 00-1.06-1.06l-3 3a.75.75 0 000 1.06l3 3zm5.56-6.5a.75.75 0 11-1.06-1.06l1.72-1.72H2.75a.75.75 0 010-1.5h8.69L9.72 2.28a.75.75 0 011.06-1.06l3 3a.75.75 0 010 1.06l-3 3z"
                  />
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
                (otherEnrollment) => html`
                  <p>
                    <a
                      href="${app.locals.settings.url}/courses/${otherEnrollment
                        .course.reference}${path}"
                      ><svg width="10" height="10">
                        <circle
                          cx="5"
                          cy="5"
                          r="5"
                          fill="${otherEnrollment.accentColor}"
                        />
                      </svg>
                      <strong>${otherEnrollment.course.name}</strong>
                      (${otherEnrollment.role})</a
                    >
                  </p>
                `
              )}
            </nav>
          </details>
        `;

  interface Middlewares {
    isCourseStaff: express.RequestHandler<
      { courseReference: string },
      any,
      {},
      {},
      IsCourseStaffMiddlewareLocals
    >[];
  }
  interface IsCourseStaffMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {}
  app.locals.middlewares.isCourseStaff = [
    ...app.locals.middlewares.isEnrolledInCourse,
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
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      if (res.locals.threads.length === 0)
        return res.send(
          app.locals.layouts.main(
            req,
            res,
            html`<title>${res.locals.course.name} · CourseLore</title>`,
            html`
              <h1>
                Welcome to
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}"
                  >${res.locals.course.name}</a
                >!
              </h1>

              $${app.locals.partials.courseSwitcher(req, res)}
              $${res.locals.enrollment.role === "staff"
                ? html`
                    <p>
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/settings#invitations"
                        ><strong>Invite other people to the course</strong></a
                      >.
                    </p>
                    <p>
                      Or
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/new"
                        ><strong>create the first thread</strong></a
                      >.
                    </p>
                  `
                : html`
                    <p>
                      This is a new course.
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/new"
                        ><strong>Create the first thread</strong></a
                      >.
                    </p>
                  `}
            `
          )
        );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.threads[0].reference}`
      );
    }
  );

  interface Middlewares {
    invitationExists: express.RequestHandler<
      { courseReference: string; invitationReference: string },
      any,
      {},
      {},
      InvitationExistsMiddlewareLocals
    >[];
  }
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
  app.locals.middlewares.invitationExists = [
    (req, res, next) => {
      const invitation = app.locals.database.get<{
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

  interface Middlewares {
    mayManageInvitation: express.RequestHandler<
      { courseReference: string; invitationReference: string },
      any,
      {},
      {},
      MayManageInvitationMiddlewareLocals
    >[];
  }
  interface MayManageInvitationMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals,
      InvitationExistsMiddlewareLocals {}
  app.locals.middlewares.mayManageInvitation = [
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.invitationExists,
  ];

  interface Middlewares {
    isInvitationUsable: express.RequestHandler<
      { courseReference: string; invitationReference: string },
      any,
      {},
      {},
      IsInvitationUsableMiddlewareLocals
    >[];
  }
  interface IsInvitationUsableMiddlewareLocals
    extends InvitationExistsMiddlewareLocals,
      Partial<IsAuthenticatedMiddlewareLocals> {}
  app.locals.middlewares.isInvitationUsable = [
    ...app.locals.middlewares.invitationExists,
    (req, res, next) => {
      if (
        res.locals.invitation.usedAt !== null ||
        app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
        (res.locals.invitation.email !== null &&
          res.locals.user !== undefined &&
          res.locals.invitation.email !== res.locals.user.email)
      )
        return next("route");
      next();
    },
  ];

  interface Helpers {
    sendInvitationEmail: (
      invitation: InvitationExistsMiddlewareLocals["invitation"]
    ) => void;
  }
  app.locals.helpers.sendInvitationEmail = (invitation) => {
    assert(invitation.email !== null);

    const link = `${app.locals.settings.url}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;

    app.locals.helpers.sendEmail({
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
  };

  interface Middlewares {
    mayManageEnrollment: express.RequestHandler<
      { courseReference: string; enrollmentReference: string },
      any,
      {},
      {},
      MayManageEnrollmentMiddlewareLocals
    >[];
  }
  interface MayManageEnrollmentMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals {
    managedEnrollment: {
      id: number;
      reference: string;
      role: Role;
    };
  }
  app.locals.middlewares.mayManageEnrollment = [
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      const managedEnrollment = app.locals.database.get<{
        id: number;
        reference: string;
        role: Role;
      }>(
        sql`
          SELECT "id", "reference", "role"
          FROM "enrollments"
          WHERE "course" = ${res.locals.course.id} AND
                "reference" = ${req.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next("route");
      res.locals.managedEnrollment = managedEnrollment;
      if (
        managedEnrollment.id === res.locals.enrollment.id &&
        app.locals.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "enrollments"
            WHERE "course" = ${res.locals.course.id} AND
                  "role" = ${"staff"}
          `
        )!.count === 1
      )
        return next("validation");
      next();
    },
  ];

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
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
              <a
                href="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}"
                >${res.locals.course.name}</a
              >
            </h1>
            $${app.locals.partials.courseSwitcher(req, res, "/settings")}
            $${res.locals.enrollment.role !== "staff"
              ? html``
              : (() => {
                  const invitations = app.locals.database.all<{
                    id: number;
                    expiresAt: string | null;
                    usedAt: string | null;
                    reference: string;
                    email: string | null;
                    name: string | null;
                    role: Role;
                  }>(
                    sql`
                      SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "role"
                      FROM "invitations"
                      WHERE "course" = ${res.locals.course.id}
                      ORDER BY "id" DESC
                    `
                  );
                  const enrollments = app.locals.database.all<{
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

                  return html`
                    <form
                      method="POST"
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/settings?_method=PATCH"
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
                              const link = `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;

                              return html`
                                <details>
                                  <summary>
                                    $${invitation.email === null
                                      ? html`
                                          <code>
                                            ${app.locals.settings
                                              .url}/courses/${res.locals.course
                                              .reference}/invitations/${"*".repeat(
                                              6
                                            )}${invitation.reference.slice(6)}
                                          </code>
                                          <br />
                                        `
                                      : invitation.name === null
                                      ? html`${invitation.email}`
                                      : html`${invitation.name}
                                        ${`<${invitation.email}>`}`}

                                    <small class="hint">
                                      ${lodash.capitalize(invitation.role)} ·
                                      $${invitation.usedAt !== null
                                        ? html`
                                            <span class="green">
                                              Used
                                              <time>${invitation.usedAt}</time>
                                            </span>
                                          `
                                        : app.locals.helpers.isExpired(
                                            invitation.expiresAt
                                          )
                                        ? html`
                                            <span class="red">
                                              Expired
                                              <time
                                                >${invitation.expiresAt}</time
                                              >
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
                                  !app.locals.helpers.isExpired(
                                    invitation.expiresAt
                                  )
                                    ? html`
                                        <p>
                                          <a href="${link}"
                                            >See invitation link</a
                                          >
                                        </p>
                                      `
                                    : html``}
                                  $${invitation.usedAt !== null
                                    ? html`
                                        <p>
                                          This invitation has already been used
                                          and may no longer be modified.
                                        </p>
                                      `
                                    : html`
                                        $${invitation.email === null ||
                                        app.locals.helpers.isExpired(
                                          invitation.expiresAt
                                        )
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
                                                  Invitation email wasn’t
                                                  received? Already checked the
                                                  spam folder?<br />
                                                  <button>
                                                    Resend Invitation Email
                                                  </button>
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
                                                $${app.locals.constants.roles.map(
                                                  (role) =>
                                                    html`
                                                      <label>
                                                        <input
                                                          type="radio"
                                                          name="role"
                                                          value="${role}"
                                                          required
                                                          ${role ===
                                                          invitation.role
                                                            ? `checked`
                                                            : ``}
                                                          ${app.locals.helpers.isExpired(
                                                            invitation.expiresAt
                                                          )
                                                            ? `disabled`
                                                            : ``}
                                                        />
                                                        ${lodash.capitalize(
                                                          role
                                                        )}
                                                      </label>
                                                    `
                                                )}
                                                $${app.locals.helpers.isExpired(
                                                  invitation.expiresAt
                                                )
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
                                            $${app.locals.helpers.isExpired(
                                              invitation.expiresAt
                                            )
                                              ? html`
                                                  <p class="hint">
                                                    You may not change the role
                                                    of an expired invitation.
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
                                                  <strong>Expiration</strong
                                                  ><br />
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
                                                        ${invitation.expiresAt ===
                                                        null
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
                                                      ${invitation.expiresAt ===
                                                      null
                                                        ? `disabled`
                                                        : ``}
                                                      data-onvalidate="${javascript`
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

                                            $${app.locals.helpers.isExpired(
                                              invitation.expiresAt
                                            )
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
                                                      <button
                                                        class="full-width red"
                                                      >
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
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/invitations"
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
                            $${app.locals.constants.roles.map(
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
                                data-onvalidate="${javascript`
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
                          data-onvalidate="${javascript`
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
                          Emails must be separated by commas and may include
                          names.
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
                              ${enrollment.userName}
                              ${`<${enrollment.userEmail}>`}
                              <small class="hint">
                                ${lodash.capitalize(enrollment.role)}
                              </small>
                            </summary>

                            $${enrollment.id !== res.locals.enrollment.id
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
                                      action="${app.locals.settings
                                        .url}/courses/${res.locals.course
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
                                          $${app.locals.constants.roles.map(
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
                                        action="${app.locals.settings
                                          .url}/courses/${res.locals.course
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
                                    You may not modify the details of your
                                    enrollment in ${res.locals.course.name}
                                    because you’re the only staff member.
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
                                        action="${app.locals.settings
                                          .url}/courses/${res.locals.course
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
                                        action="${app.locals.settings
                                          .url}/courses/${res.locals.course
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
                  `;
                })()}

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
              $${app.locals.constants.accentColors.map(
                (accentColor) =>
                  html`
                    <form
                      method="POST"
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/settings?_method=PATCH"
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
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    { name?: string; accentColor?: AccentColor },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.name === "string" &&
        res.locals.enrollment.role === "staff"
      ) {
        if (req.body.name.trim() === "") return next("validation");
        app.locals.database.run(
          sql`UPDATE "courses" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.course.id}`
        );
      }

      if (typeof req.body.accentColor === "string") {
        if (!app.locals.constants.accentColors.includes(req.body.accentColor))
          return next("validation");
        app.locals.database.run(
          sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
        );
      }

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings`
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
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !app.locals.constants.roles.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !app.locals.helpers.isDate(req.body.expiresAt) ||
            app.locals.helpers.isExpired(req.body.expiresAt))) ||
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
          app.locals.database.run(
            sql`
              INSERT INTO "invitations" ("expiresAt", "course", "reference", "role")
              VALUES (
                ${req.body.expiresAt},
                ${res.locals.course.id},
                ${invitationReference},
                ${req.body.role}
              )
            `
          );
          res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${invitationReference}`
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
              app.locals.database.get<{ exists: number }>(
                sql`
                  SELECT EXISTS(
                    SELECT 1
                    FROM "enrollments"
                    JOIN "users" ON "enrollments"."user" = "users"."id"
                    WHERE "enrollments"."course" = ${res.locals.course.id} AND
                          "users"."email" = ${email.address}
                  ) AS "exists"
                `
              )!.exists === 1
            )
              continue;

            const existingUnusedInvitation = app.locals.database.get<{
              id: number;
              name: string | null;
            }>(
              sql`
                SELECT "id", "name"
                FROM "invitations"
                WHERE "course" = ${res.locals.course.id} AND
                      "email" = ${email.address} AND
                      "usedAt" IS NULL
              `
            );
            if (existingUnusedInvitation !== undefined) {
              app.locals.database.run(
                sql`
                  UPDATE "invitations"
                  SET "expiresAt" = ${req.body.expiresAt},
                      "name" = ${email.name ?? existingUnusedInvitation.name},
                      "role" = ${req.body.role}
                  WHERE "id" = ${existingUnusedInvitation.id}
                `
              );
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
            const invitationId = Number(
              app.locals.database.run(
                sql`
                  INSERT INTO "invitations" ("expiresAt", "course", "reference", "email", "name", "role")
                  VALUES (
                    ${invitation.expiresAt},
                    ${res.locals.course.id},
                    ${invitation.reference},
                    ${invitation.email},
                    ${invitation.name},
                    ${invitation.role}
                  )
                `
              ).lastInsertRowid
            );

            app.locals.helpers.sendInvitationEmail({
              id: invitationId,
              ...invitation,
              course: res.locals.course,
            });
          }

          res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings#invitations`
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
    ...app.locals.middlewares.mayManageInvitation,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("validation");

      if (req.body.resend === "true") {
        if (res.locals.invitation.email === null) return next("validation");

        app.locals.helpers.sendInvitationEmail(res.locals.invitation);
      }

      if (req.body.role !== undefined) {
        if (!app.locals.constants.roles.includes(req.body.role))
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );
      }

      if (req.body.changeExpiration === "true") {
        if (
          req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !app.locals.helpers.isDate(req.body.expiresAt) ||
            app.locals.helpers.isExpired(req.body.expiresAt))
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );
      }

      if (req.body.expireNow === "true")
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings#invitations`
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
    ...app.locals.middlewares.mayManageInvitation,
    asyncHandler(async (req, res, next) => {
      if (
        res.locals.invitation.email !== null ||
        app.locals.helpers.isExpired(res.locals.invitation.expiresAt)
      )
        return next();

      const link = `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`;
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          html`
            <h1>
              Invitation ·
              <a
                href="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}"
                >${res.locals.course.name}</a
              >
            </h1>
            <nav>
              <p class="hint">
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/settings"
                  style="${css`
                    display: flex;
                    align-items: center;
                  `}"
                  ><svg viewBox="0 0 16 16" width="16" height="16">
                    <path
                      d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"
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
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          html`
            <h1>
              Invitation ·
              <a
                href="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}"
                >${res.locals.course.name}</a
              >
            </h1>

            <p>You’re already enrolled in ${res.locals.course.name}.</p>
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
    ...app.locals.middlewares.isAuthenticated,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          html`
            <h1>Welcome to ${res.locals.invitation.course.name}!</h1>

            <form method="POST">
              <p>
                <button>
                  Enroll as ${lodash.capitalize(res.locals.invitation.role)}
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
    ...app.locals.middlewares.isAuthenticated,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      app.locals.database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${res.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitation.role},
            ${app.locals.helpers.defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      if (res.locals.invitation.email !== null)
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.invitation.course.reference}`
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
    ...app.locals.middlewares.isUnauthenticated,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.main(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>Welcome to ${res.locals.invitation.course.name}!</h1>

              <p>
                To enroll, first you have to
                <a
                  href="${app.locals.settings.url}/authenticate?${qs.stringify({
                    redirect: req.originalUrl,
                    ...(res.locals.invitation.email === null
                      ? {}
                      : {
                          email: res.locals.invitation.email,
                        }),
                    ...(res.locals.invitation.name === null
                      ? {}
                      : {
                          name: res.locals.invitation.name,
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
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!app.locals.constants.roles.includes(req.body.role))
          return next("validation");
        app.locals.database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );
      }

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings#enrollments`
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
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      if (res.locals.managedEnrollment.id === res.locals.enrollment.id)
        return res.redirect(`${app.locals.settings.url}/`);
      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings#enrollments`
      );
    }
  );

  interface Layouts {
    thread: (
      req: express.Request<
        { courseReference: string; threadReference?: string },
        HTML,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsThreadAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >,
      res: express.Response<
        HTML,
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsThreadAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.thread = (req, res, head, body) =>
    app.locals.layouts.application(
      req,
      res,
      head,
      html`
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
              @media (prefers-color-scheme: dark) {
                border-color: black;
              }
              display: flex;
              flex-direction: column;
            `}"
          >
            <header
              style="${css`
                border-bottom: 1px solid silver;
                @media (prefers-color-scheme: dark) {
                  border-color: black;
                }
                padding: 0 1rem;
              `}"
            >
              $${app.locals.partials.logoAndMenu(req, res)}
              <nav>
                <p
                  style="${css`
                    margin-top: 0;
                  `}"
                >
                  <a
                    href="${app.locals.settings.url}/courses/${res.locals.course
                      .reference}"
                    ><strong>${res.locals.course.name}</strong> (${res.locals
                      .enrollment.role})</a
                  >
                </p>
              </nav>
              $${app.locals.partials.courseSwitcher(req, res)}
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
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/threads/new"
                  >Create a new thread</a
                >
              </p>
              <nav id="threads">
                $${res.locals.threads.map(
                  (thread) =>
                    html`
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/${thread.reference}"
                        style="${css`
                          line-height: 1.3;
                          display: block;
                          padding: 0.5rem 1rem;
                          margin: 0 -1rem;

                          ${thread.id === res.locals.thread?.id
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
                          <strong>${thread.title}</strong>
                        </p>
                        <p
                          class="hint"
                          style="${css`
                            margin-bottom: 0;
                          `}"
                        >
                          #${thread.reference} created
                          <time>${thread.createdAt}</time> by
                          ${thread.authorEnrollment.user.name}
                          $${thread.updatedAt !== thread.createdAt
                            ? html`
                                <br />
                                and last updated
                                <time>${thread.updatedAt}</time>
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
                              title="${thread.postsCount} post${thread.postsCount ===
                              1
                                ? ""
                                : "s"}"
                            >
                              <svg
                                viewBox="0 0 16 16"
                                width="10"
                                height="10"
                                style="${css`
                                  transform: translateY(1px);
                                `}"
                              >
                                <path
                                  d="M2.75 2.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h2a.75.75 0 01.75.75v2.19l2.72-2.72a.75.75 0 01.53-.22h4.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25H2.75zM1 2.75C1 1.784 1.784 1 2.75 1h10.5c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0113.25 12H9.06l-2.573 2.573A1.457 1.457 0 014 13.543V12H2.75A1.75 1.75 0 011 10.25v-7.5z"
                                ></path>
                              </svg>
                              ${thread.postsCount}
                            </span>

                            $${thread.likesCount === 0
                              ? html``
                              : html`
                                  <span
                                    title="${thread.likesCount} like${thread.likesCount ===
                                    1
                                      ? ""
                                      : "s"}"
                                  >
                                    <svg
                                      viewBox="0 0 512 512"
                                      width="10"
                                      height="10"
                                    >
                                      <path
                                        d="M466.27 286.69C475.04 271.84 480 256 480 236.85c0-44.015-37.218-85.58-85.82-85.58H357.7c4.92-12.81 8.85-28.13 8.85-46.54C366.55 31.936 328.86 0 271.28 0c-61.607 0-58.093 94.933-71.76 108.6-22.747 22.747-49.615 66.447-68.76 83.4H32c-17.673 0-32 14.327-32 32v240c0 17.673 14.327 32 32 32h64c14.893 0 27.408-10.174 30.978-23.95 44.509 1.001 75.06 39.94 177.802 39.94 7.22 0 15.22.01 22.22.01 77.117 0 111.986-39.423 112.94-95.33 13.319-18.425 20.299-43.122 17.34-66.99 9.854-18.452 13.664-40.343 8.99-62.99zm-61.75 53.83c12.56 21.13 1.26 49.41-13.94 57.57 7.7 48.78-17.608 65.9-53.12 65.9h-37.82c-71.639 0-118.029-37.82-171.64-37.82V240h10.92c28.36 0 67.98-70.89 94.54-97.46 28.36-28.36 18.91-75.63 37.82-94.54 47.27 0 47.27 32.98 47.27 56.73 0 39.17-28.36 56.72-28.36 94.54h103.99c21.11 0 37.73 18.91 37.82 37.82.09 18.9-12.82 37.81-22.27 37.81 13.489 14.555 16.371 45.236-5.21 65.62zM88 432c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"
                                      />
                                    </svg>
                                    ${thread.likesCount}
                                  </span>
                                `}
                          </span>
                        </p>
                      </a>
                    `
                )}
              </nav>
              <script>
                (() => {
                  const id = document.currentScript.previousElementSibling.id;
                  eventSource.addEventListener("refreshed", (event) => {
                    document
                      .querySelector("#" + id)
                      .replaceWith(
                        event.detail.document.querySelector("#" + id)
                      );
                  });
                })();
              </script>
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
    );

  interface Partials {
    textEditor: () => HTML;
  }
  app.locals.partials.textEditor = (): HTML => html`
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
                await fetch("${app.locals.settings.url}/preview", {
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
        <svg width="30" height="30">
          <polyline
            stroke="url(#gradient)"
            stroke-linecap="round"
            stroke-linejoin="round"
            fill="none"
            points="1.875 1.875 5.625 5.625 5.625 1.875 1.875 5.625 9.375 1.875 13.125 5.625 9.375 5.625 13.125 1.875 9.375 9.375 13.125 13.125 9.375 13.125 13.125 9.375 5.625 13.125 1.875 9.375 1.875 13.125 5.625 9.375 1.875 16.875 5.625 20.625 1.875 20.625 5.625 16.875 1.875 24.375 5.625 28.125 5.625 24.375 1.875 28.125 9.375 24.375 13.125 28.125 13.125 24.375 9.375 28.125 13.125 20.625 9.375 16.875 13.125 16.875 9.375 20.625 16.875 16.875 20.625 20.625 16.875 20.625 20.625 16.875 16.875 24.375 20.625 28.125 20.625 24.375 16.875 28.125 24.375 24.375 28.125 28.125 28.125 24.375 24.375 28.125 28.125 20.625 24.375 16.875 28.125 16.875 24.375 20.625 28.125 13.125 24.375 9.375 24.375 13.125 28.125 9.375 20.625 13.125 16.875 9.375 20.625 9.375 16.875 13.125 20.625 5.625 16.875 1.875 20.625 1.875 16.875 5.625 24.375 1.875 28.125 5.625 28.125 1.875 24.375 5.625"
          />
        </svg>
        <strong>Loading…</strong>
      </div>
      <script>
        (() => {
          const loading = document.currentScript.previousElementSibling;
          let animationFrame;
          new MutationObserver(() => {
            if (loading.hidden) window.cancelAnimationFrame(animationFrame);
            else animationFrame = window.requestAnimationFrame(animate);
          }).observe(loading, {
            attributes: true,
            attributeFilter: ["hidden"],
          });
          const polyline = loading.querySelector("polyline");
          const points = polyline.getAttribute("points").split(" ").map(Number);
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

      <div class="preview" hidden></div>
    </div>
  `;

  // TODO: Would making this async speed things up in any way?
  // TODO: Convert references to other threads like ‘#57’ and ‘#43/2’ into links.
  // TODO: Extract this into a library?
  interface Partials {
    textProcessor: (text: string) => HTML;
  }
  app.locals.partials.textProcessor = await (async () => {
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

    return (text: string) => textProcessor.processSync(text).toString();
  })();

  app.post<{}, any, { content?: string }, {}, IsAuthenticatedMiddlewareLocals>(
    "/preview",
    ...app.locals.middlewares.isAuthenticated,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      res.send(app.locals.partials.textProcessor(req.body.content));
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
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.eventSource,
    (req, res) => {
      res.send(
        app.locals.layouts.thread(
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
              action="${app.locals.settings.url}/courses/${res.locals.course
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
              $${app.locals.partials.textEditor()}
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
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "courses"
          SET "nextThreadReference" = ${
            res.locals.course.nextThreadReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      const threadId = app.locals.database.run(
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
      app.locals.database.run(
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

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.course.nextThreadReference}`
      );
    }
  );

  interface Middlewares {
    isThreadAccessible: express.RequestHandler<
      { courseReference: string; threadReference: string },
      HTML,
      {},
      {},
      IsThreadAccessibleMiddlewareLocals
    >[];
  }
  interface IsThreadAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    thread: IsEnrolledInCourseMiddlewareLocals["threads"][number];
    posts: {
      id: number;
      createdAt: string;
      updatedAt: string;
      reference: string;
      authorEnrollment: IsThreadAccessibleMiddlewareLocals["thread"]["authorEnrollment"];
      content: string;
      likes: {
        id: number;
        enrollment: IsThreadAccessibleMiddlewareLocals["thread"]["authorEnrollment"];
      }[];
    }[];
  }
  app.locals.middlewares.isThreadAccessible = [
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      const thread = res.locals.threads.find(
        (thread) => thread.reference === req.params.threadReference
      );
      if (thread === undefined) return next("route");
      res.locals.thread = thread;
      res.locals.posts = app.locals.database
        .all<{
          id: number;
          createdAt: string;
          updatedAt: string;
          reference: string;
          authorEnrollmentId: number | null;
          authorUserId: number | null;
          authorUserEmail: string | null;
          authorUserName: string | null;
          authorEnrollmentRole: Role | null;
          content: string;
        }>(
          sql`
            SELECT "posts"."id",
                   "posts"."createdAt",
                   "posts"."updatedAt",
                   "posts"."reference",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email" AS "authorUserEmail",
                   "authorUser"."name" AS "authorUserName",
                   "authorEnrollment"."role" AS "authorEnrollmentRole",
                   "posts"."content"
            FROM "posts"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "posts"."authorEnrollment" = "authorEnrollment"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
            WHERE "posts"."thread" = ${thread.id}
            ORDER BY "posts"."id" ASC
          `
        )
        .map((post) => ({
          id: post.id,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          reference: post.reference,
          authorEnrollment:
            post.authorEnrollmentId !== null &&
            post.authorUserId !== null &&
            post.authorUserEmail !== null &&
            post.authorUserName !== null &&
            post.authorEnrollmentRole !== null
              ? {
                  id: post.authorEnrollmentId,
                  user: {
                    id: post.authorUserId,
                    email: post.authorUserEmail,
                    name: post.authorUserName,
                  },
                  role: post.authorEnrollmentRole,
                }
              : app.locals.constants.anonymousEnrollment,
          content: post.content,
          // FIXME: Try to get rid of this n+1 query.
          likes: app.locals.database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userEmail: string | null;
              userName: string | null;
              enrollmentRole: Role | null;
            }>(
              sql`
                SELECT "likes"."id",
                       "enrollments"."id" AS "enrollmentId",
                       "users"."id" AS "userId",
                       "users"."email" AS "userEmail",
                       "users"."name" AS "userName",
                       "enrollments"."role" AS "enrollmentRole"
                FROM "likes"
                LEFT JOIN "enrollments" ON "likes"."enrollment" = "enrollments"."id"
                LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE "likes"."post" = ${post.id}
              `
            )
            .map((like) => ({
              id: like.id,
              enrollment:
                like.enrollmentId !== null &&
                like.userId !== null &&
                like.userEmail !== null &&
                like.userName !== null &&
                like.enrollmentRole !== null
                  ? {
                      id: like.enrollmentId,
                      user: {
                        id: like.userId,
                        email: like.userEmail,
                        name: like.userName,
                      },
                      role: like.enrollmentRole,
                    }
                  : app.locals.constants.anonymousEnrollment,
            })),
        }));

      next();
    },
  ];

  interface Helpers {
    mayEditThread: (
      req: express.Request<
        { courseReference: string; threadReference: string },
        any,
        {},
        {},
        IsThreadAccessibleMiddlewareLocals
      >,
      res: express.Response<any, IsThreadAccessibleMiddlewareLocals>
    ) => boolean;
  }
  app.locals.helpers.mayEditThread = (
    req: express.Request<
      { courseReference: string; threadReference: string },
      any,
      {},
      {},
      IsThreadAccessibleMiddlewareLocals
    >,
    res: express.Response<any, IsThreadAccessibleMiddlewareLocals>
  ): boolean =>
    res.locals.enrollment.role === "staff" ||
    res.locals.thread.authorEnrollment.id === res.locals.enrollment.id;

  interface Middlewares {
    postExists: express.RequestHandler<
      {
        courseReference: string;
        threadReference: string;
        postReference: string;
      },
      any,
      {},
      {},
      PostExistsMiddlewareLocals
    >[];
  }
  interface PostExistsMiddlewareLocals
    extends IsThreadAccessibleMiddlewareLocals {
    post: IsThreadAccessibleMiddlewareLocals["posts"][number];
  }
  app.locals.middlewares.postExists = [
    ...app.locals.middlewares.isThreadAccessible,
    (req, res, next) => {
      const post = res.locals.posts.find(
        (post) => post.reference === req.params.postReference
      );
      if (post === undefined) return next("route");
      res.locals.post = post;
      next();
    },
  ];

  interface Helpers {
    mayEditPost: (
      req: express.Request<
        { courseReference: string; threadReference: string },
        any,
        {},
        {},
        IsThreadAccessibleMiddlewareLocals
      >,
      res: express.Response<any, IsThreadAccessibleMiddlewareLocals>,
      post: PostExistsMiddlewareLocals["post"]
    ) => boolean;
  }
  app.locals.helpers.mayEditPost = (req, res, post) =>
    res.locals.enrollment.role === "staff" ||
    post.authorEnrollment.id === res.locals.enrollment.id;

  interface Middlewares {
    mayEditPost: express.RequestHandler<
      {
        courseReference: string;
        threadReference: string;
        postReference: string;
      },
      any,
      {},
      {},
      MayEditPostMiddlewareLocals
    >[];
  }
  interface MayEditPostMiddlewareLocals extends PostExistsMiddlewareLocals {}
  app.locals.middlewares.mayEditPost = [
    ...app.locals.middlewares.postExists,
    (req, res, next) => {
      if (app.locals.helpers.mayEditPost(req, res, res.locals.post))
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
    ...app.locals.middlewares.isThreadAccessible,
    ...app.locals.middlewares.eventSource,
    (req, res) => {
      res.send(
        app.locals.layouts.thread(
          req,
          res,
          html`
            <title>
              ${res.locals.thread.title} · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <div id="thread">
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
                    ${res.locals.thread.title}

                    <a
                      href="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/threads/${res.locals.thread
                        .reference}"
                      class="hint"
                      >#${res.locals.thread.reference}</a
                    >
                  </h1>

                  $${app.locals.helpers.mayEditThread(req, res)
                    ? html`
                        <p>
                          <button
                            title="Edit Title"
                            type="button"
                            style="${css`
                              &,
                              &:active {
                                all: unset;
                              }
                            `}"
                            onclick="${javascript`
                              const title = this.closest(".title");
                              title.querySelector(".show").hidden = true;
                              const edit = title.querySelector(".edit");
                              edit.hidden = false;
                              const input = edit.querySelector('[name="title"]');
                              input.value = ${JSON.stringify(
                                res.locals.thread.title
                              )};
                              input.focus();
                              input.setSelectionRange(0, 0);
                            `}"
                          >
                            <svg width="16" height="16">
                              <path
                                d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"
                              ></path>
                            </svg>
                          </button>
                        </p>
                      `
                    : html``}
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <form
                          method="POST"
                          action="${app.locals.settings.url}/courses/${res
                            .locals.course.reference}/threads/${res.locals
                            .thread.reference}?_method=DELETE"
                        >
                          <p>
                            <button
                              title="Remove Thread"
                              class="red"
                              style="${css`
                                &,
                                &:active {
                                  all: unset;
                                }
                              `}"
                              onclick="${javascript`
                                if (!confirm("Remove thread?\\n\\nYou can’t undo this action!"))
                                  event.preventDefault();
                              `}"
                            >
                              <svg width="16" height="16">
                                <path
                                  fill-rule="evenodd"
                                  d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"
                                ></path>
                              </svg>
                            </button>
                          </p>
                        </form>
                      `
                    : html``}
                </div>

                $${app.locals.helpers.mayEditThread(req, res)
                  ? html`
                      <form
                        method="POST"
                        action="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/${res.locals.thread
                          .reference}?_method=PATCH"
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
                              for (const element of edit.querySelectorAll("*"))
                                modifiedInputs.delete(element);
                            `}"
                          >
                            Cancel
                          </button>
                        </p>
                      </form>
                    `
                  : html``}
              </div>

              $${res.locals.posts.map(
                (post) => html`
                  <section
                    id="${post.reference}"
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
                        <strong>${post.authorEnrollment.user.name}</strong>
                        <span class="hint">
                          said
                          <time>${post.createdAt}</time>
                          $${post.updatedAt !== post.createdAt
                            ? html`
                                and last edited
                                <time>${post.updatedAt}</time>
                              `
                            : html``}
                          <a
                            href="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/threads/${res.locals
                              .thread.reference}#${post.reference}"
                            style="${css`
                              text-decoration: none;
                            `}"
                            >#${res.locals.thread
                              .reference}/${post.reference}</a
                          >
                        </span>
                      </p>

                      <p>
                        <button
                          title="Reply"
                          type="button"
                          style="${css`
                            &,
                            &:active {
                              all: unset;
                            }
                          `}"
                          onclick="${javascript`
                            const newPost = document.querySelector("#new-post");
                            newPost.querySelector(".write").click();
                            const newPostContent = newPost.querySelector('[name="content"]');
                            newPostContent.value += (newPostContent.value === "" ? "" : "\\n\\n") + "> @" + ${JSON.stringify(
                              post.authorEnrollment.user.name
                            )} + "\\n>\\n" + ${JSON.stringify(
                            post.content
                              .split("\n")
                              .map((line) => `> ${line}`)
                              .join("\n")
                          )} + "\\n\\n";
                            newPostContent.focus();
                            newPostContent.setSelectionRange(newPostContent.value.length, newPostContent.value.length);
                          `}"
                        >
                          <svg width="16" height="16">
                            <path
                              d="M6.78 1.97a.75.75 0 010 1.06L3.81 6h6.44A4.75 4.75 0 0115 10.75v2.5a.75.75 0 01-1.5 0v-2.5a3.25 3.25 0 00-3.25-3.25H3.81l2.97 2.97a.75.75 0 11-1.06 1.06L1.47 7.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 0z"
                            ></path>
                          </svg>
                        </button>
                      </p>

                      $${app.locals.helpers.mayEditPost(req, res, post)
                        ? html`
                            <p>
                              <button
                                title="Edit Post"
                                type="button"
                                class="edit-button"
                                style="${css`
                                  &,
                                  &:active {
                                    all: unset;
                                  }
                                `}"
                                onclick="${javascript`
                                  const post = this.closest(".post");
                                  post.querySelector(".show").hidden = true;
                                  const edit = post.querySelector(".edit");
                                  edit.hidden = false;
                                  const textarea = edit.querySelector('[name="content"]');
                                  textarea.value = ${JSON.stringify(
                                    post.content
                                  )};
                                  textarea.focus();
                                  textarea.setSelectionRange(0, 0);
                                  this.hidden = true;
                                `}"
                              >
                                <svg width="16" height="16">
                                  <path
                                    d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.249.249 0 00.108-.064l6.286-6.286z"
                                  ></path>
                                </svg>
                              </button>
                            </p>
                          `
                        : html``}
                      $${res.locals.enrollment.role === "staff" &&
                      post.reference !== "1"
                        ? html`
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/threads/${res.locals
                                .thread
                                .reference}/posts/${post.reference}?_method=DELETE"
                            >
                              <p>
                                <button
                                  title="Remove Post"
                                  class="red"
                                  style="${css`
                                    &,
                                    &:active {
                                      all: unset;
                                    }
                                  `}"
                                  onclick="${javascript`
                                    if (!confirm("Remove post?\\n\\nYou can’t undo this action!"))
                                      event.preventDefault();
                                  `}"
                                >
                                  <svg width="16" height="16">
                                    <path
                                      fill-rule="evenodd"
                                      d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19c.9 0 1.652-.681 1.741-1.576l.66-6.6a.75.75 0 00-1.492-.149l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6z"
                                    ></path>
                                  </svg>
                                </button>
                              </p>
                            </form>
                          `
                        : html``}
                    </div>

                    <div class="show">
                      $${app.locals.partials.textProcessor(post.content)}

                      <!-- TODO: Say “you” when you have liked the post. -->
                      <form
                        method="POST"
                        action="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/${res.locals.thread
                          .reference}/posts/${post.reference}/likes${post.likes.find(
                          (like) =>
                            like.enrollment.id === res.locals.enrollment.id
                        ) === undefined
                          ? ""
                          : "?_method=DELETE"}"
                        title="${post.likes.length === 0
                          ? "Be the first to like this"
                          : post.likes.length === 1
                          ? `${post.likes[0].enrollment.user.name} liked this`
                          : post.likes.length === 2
                          ? `${post.likes[0].enrollment.user.name} and ${post.likes[1].enrollment.user.name} liked this`
                          : post.likes.length === 3
                          ? `${post.likes[0].enrollment.user.name}, ${post.likes[1].enrollment.user.name}, and 1 other liked this`
                          : `${post.likes[0].enrollment.user.name}, ${
                              post.likes[1].enrollment.user.name
                            }, and ${post.likes.length - 2} others liked this`}"
                        onsubmit="${javascript`
                          event.preventDefault();
                          fetch(this.action, { method: this.method });
                        `}"
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
                              $${post.likes.find(
                                (like) =>
                                  like.enrollment.id ===
                                  res.locals.enrollment.id
                              ) === undefined
                                ? html`
                                    <svg
                                      viewBox="0 0 512 512"
                                      width="12"
                                      height="12"
                                    >
                                      <path
                                        d="M466.27 286.69C475.04 271.84 480 256 480 236.85c0-44.015-37.218-85.58-85.82-85.58H357.7c4.92-12.81 8.85-28.13 8.85-46.54C366.55 31.936 328.86 0 271.28 0c-61.607 0-58.093 94.933-71.76 108.6-22.747 22.747-49.615 66.447-68.76 83.4H32c-17.673 0-32 14.327-32 32v240c0 17.673 14.327 32 32 32h64c14.893 0 27.408-10.174 30.978-23.95 44.509 1.001 75.06 39.94 177.802 39.94 7.22 0 15.22.01 22.22.01 77.117 0 111.986-39.423 112.94-95.33 13.319-18.425 20.299-43.122 17.34-66.99 9.854-18.452 13.664-40.343 8.99-62.99zm-61.75 53.83c12.56 21.13 1.26 49.41-13.94 57.57 7.7 48.78-17.608 65.9-53.12 65.9h-37.82c-71.639 0-118.029-37.82-171.64-37.82V240h10.92c28.36 0 67.98-70.89 94.54-97.46 28.36-28.36 18.91-75.63 37.82-94.54 47.27 0 47.27 32.98 47.27 56.73 0 39.17-28.36 56.72-28.36 94.54h103.99c21.11 0 37.73 18.91 37.82 37.82.09 18.9-12.82 37.81-22.27 37.81 13.489 14.555 16.371 45.236-5.21 65.62zM88 432c0 13.255-10.745 24-24 24s-24-10.745-24-24 10.745-24 24-24 24 10.745 24 24z"
                                      ></path>
                                    </svg>
                                  `
                                : html`
                                    <svg
                                      viewBox="0 0 512 512"
                                      width="12"
                                      height="12"
                                    >
                                      <path
                                        d="M104 224H24c-13.255 0-24 10.745-24 24v240c0 13.255 10.745 24 24 24h80c13.255 0 24-10.745 24-24V248c0-13.255-10.745-24-24-24zM64 472c-13.255 0-24-10.745-24-24s10.745-24 24-24 24 10.745 24 24-10.745 24-24 24zM384 81.452c0 42.416-25.97 66.208-33.277 94.548h101.723c33.397 0 59.397 27.746 59.553 58.098.084 17.938-7.546 37.249-19.439 49.197l-.11.11c9.836 23.337 8.237 56.037-9.308 79.469 8.681 25.895-.069 57.704-16.382 74.757 4.298 17.598 2.244 32.575-6.148 44.632C440.202 511.587 389.616 512 346.839 512l-2.845-.001c-48.287-.017-87.806-17.598-119.56-31.725-15.957-7.099-36.821-15.887-52.651-16.178-6.54-.12-11.783-5.457-11.783-11.998v-213.77c0-3.2 1.282-6.271 3.558-8.521 39.614-39.144 56.648-80.587 89.117-113.111 14.804-14.832 20.188-37.236 25.393-58.902C282.515 39.293 291.817 0 312 0c24 0 72 8 72 81.452z"
                                      ></path>
                                    </svg>
                                  `}
                              ${post.likes.length === 0
                                ? ""
                                : post.likes.length}
                            </button>
                          </span>
                        </p>
                      </form>
                    </div>

                    $${app.locals.helpers.mayEditPost(req, res, post)
                      ? html`
                          <form
                            method="POST"
                            action="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/threads/${res.locals
                              .thread
                              .reference}/posts/${post.reference}?_method=PATCH"
                            hidden
                            class="edit"
                          >
                            $${app.locals.partials.textEditor()}
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
                                  for (const element of edit.querySelectorAll("*"))
                                    modifiedInputs.delete(element);
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
            </div>
            <script>
              (() => {
                const id = document.currentScript.previousElementSibling.id;
                eventSource.addEventListener("refreshed", (event) => {
                  const posts = document.querySelector("#" + id);
                  if (posts.querySelector(".edit:not([hidden])") !== null)
                    return;
                  posts.replaceWith(
                    event.detail.document.querySelector("#" + id)
                  );
                });
              })();
            </script>

            <form
              id="new-post"
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/threads/${res.locals.thread.reference}/posts"
            >
              $${app.locals.partials.textEditor()}
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
    IsThreadAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...app.locals.middlewares.isThreadAccessible,
    (req, res, next) => {
      if (!app.locals.helpers.mayEditThread(req, res)) return next();
      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          app.locals.database.run(
            sql`UPDATE "threads" SET "title" = ${req.body.title} WHERE "id" = ${res.locals.thread.id}`
          );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}`
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
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.isThreadAccessible,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "threads" WHERE "id" = ${res.locals.thread.id}`
      );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}`
      );
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
    ...app.locals.middlewares.isThreadAccessible,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "threads"
          SET "nextPostReference" = ${res.locals.thread.nextPostReference + 1}
          WHERE "id" = ${res.locals.thread.id}
        `
      );
      app.locals.database.run(
        sql`
          INSERT INTO "posts" ("thread", "reference", "authorEnrollment", "content")
          VALUES (
            ${res.locals.thread.id},
            ${String(res.locals.thread.nextPostReference)},
            ${res.locals.enrollment.id},
            ${req.body.content}
          )
        `
      );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}#${res.locals.thread.nextPostReference}`
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
    ...app.locals.middlewares.mayEditPost,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "posts"
          SET "content" = ${req.body.content},
              "updatedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.post.id}
        `
      );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}#${res.locals.post.reference}`
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
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.postExists,
    (req, res, next) => {
      if (res.locals.post.reference === "1") return next("validation");

      app.locals.database.run(
        sql`DELETE FROM "posts" WHERE "id" = ${res.locals.post.id}`
      );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}`
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
    ...app.locals.middlewares.postExists,
    (req, res, next) => {
      if (
        res.locals.post.likes.find(
          (like) => like.enrollment.id === res.locals.enrollment.id
        ) !== undefined
      )
        return next("validation");

      app.locals.database.run(
        sql`INSERT INTO "likes" ("post", "enrollment") VALUES (${res.locals.post.id}, ${res.locals.enrollment.id})`
      );

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}#${res.locals.post.reference}`
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
    ...app.locals.middlewares.postExists,
    (req, res, next) => {
      const like = res.locals.post.likes.find(
        (like) => like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      app.locals.database.run(sql`DELETE FROM "likes" WHERE "id" = ${like.id}`);

      for (const eventSource of [...app.locals.eventSources].filter(
        (eventSource) => eventSource.locals.course?.id === res.locals.course.id
      ))
        eventSource.write(`event: refresh\ndata:\n\n`);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}#${res.locals.post.reference}`
      );
    }
  );

  interface Helpers {
    sendEmail: ({
      to,
      subject,
      body,
    }: {
      to: string;
      subject: string;
      body: string;
    }) => void;
  }
  app.locals.helpers.sendEmail = ({ to, subject, body }) => {
    app.locals.database.run(
      sql`INSERT INTO "emailsQueue" ("to", "subject", "body") VALUES (${to}, ${subject}, ${body})`
    );
    // TODO: The worker that sends emails on non-demonstration mode. Kick the worker to wake up from here (as well as periodically just in case…)
  };

  app.get<{}, HTML, {}, {}, {}>("/demonstration-inbox", (req, res, next) => {
    if (!app.locals.settings.demonstration) return next();

    const emails = app.locals.database.all<{
      createdAt: string;
      to: string;
      subject: string;
      body: string;
    }>(
      sql`SELECT "createdAt", "to", "subject", "body" FROM "emailsQueue" ORDER BY "id" DESC`
    );

    res.send(
      app.locals.layouts.main(
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
    ...app.locals.middlewares.isAuthenticated,
    (req, res) => {
      res.status(404).send(
        app.locals.layouts.main(
          req,
          res,
          html`<title>404 Not Found · CourseLore</title>`,
          html`
            <h1>404 Not Found</h1>

            <p>
              If you think there should be something here, please contact the
              course staff or the
              <a href="${app.locals.settings.administrator}"
                >system administrator</a
              >.
            </p>
          `
        )
      );
    }
  );

  app.all<{}, HTML, {}, {}, IsUnauthenticatedMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isUnauthenticated,
    (req, res) => {
      res.status(404).send(
        app.locals.layouts.main(
          req,
          res,
          html`<title>404 Not Found · CourseLore</title>`,
          html`
            <div
              style="${css`
                text-align: center;
              `}"
            >
              <h1>404 Not Found</h1>

              <p>
                You may have to
                <a
                  href="${app.locals.settings.url}/authenticate?${qs.stringify({
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
      app.locals.layouts.main(
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

  interface Helpers {
    isDate: (dateString: string) => boolean;
  }
  app.locals.helpers.isDate = (string) =>
    string.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null &&
    !isNaN(new Date(string).getTime());

  interface Helpers {
    isExpired: (expiresAt: string | null) => boolean;
  }
  app.locals.helpers.isExpired = (expiresAt) =>
    expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

  return app;
}

if (require.main === module)
  (async () => {
    console.log(`CourseLore/${VERSION}`);
    if (process.argv[2] === undefined) {
      const app = await courselore(path.join(process.cwd(), "data"));
      app.listen(new URL(app.locals.settings.url).port, () => {
        console.log(`Server started at ${app.locals.settings.url}`);
      });
    } else {
      const configurationFile = path.resolve(process.argv[2]);
      await require(configurationFile)(require);
      console.log(`Configuration loaded from ‘${configurationFile}’.`);
    }
  })();
