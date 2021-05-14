#!/usr/bin/env node

import path from "path";
import assert from "assert/strict";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";
import emailAddresses from "email-addresses";

import { Database, sql } from "@leafac/sqlite";
import { html, HTML } from "@leafac/html";
type CSS = string;
import css from "tagged-template-noop";
import javascript from "tagged-template-noop";
import { JSDOM } from "jsdom";
import sass from "sass";

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
  app.locals.database.migrate(
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
        "pinnedAt" TEXT NULL,
        "questionAt" TEXT NULL,
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
        "answerAt" TEXT NULL,
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
        "reference" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL
      );
    `
  );

  interface Layouts {
    base: (
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.base = (req, res, head, body) => {
    const bodyDOM = JSDOM.fragment(html`<div>$${body}</div>`);
    const styles: CSS[] = [];
    for (const element of bodyDOM.querySelectorAll("[style]")) {
      if (element.id === "") element.id = `style--${styles.length}`;
      styles.push(
        css`
          #${element.id} {
            ${element.getAttribute("style")!}
          }
        `
      );
      element.removeAttribute("style");
    }

    return html`
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
          <link rel="stylesheet" href="${app.locals.settings.url}/global.css" />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/@ibm/plex/css/ibm-plex.min.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/bootstrap-icons/font/bootstrap-icons.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/katex/dist/katex.min.css"
          />
          <style>
            $${app.locals.helpers.compileSass(styles.join(""))}
          </style>
          $${head}
        </head>
        <body>
          $${app.locals.partials.art.preamble}
          $${bodyDOM.firstElementChild!.innerHTML}

          <script src="${app.locals.settings
              .url}/node_modules/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              for (const element of document.querySelectorAll(
                '[data-bs-toggle="tooltip"]'
              ))
                new bootstrap.Tooltip(element);
              for (const element of document.querySelectorAll(
                '[data-bs-toggle="popover"]'
              ))
                new bootstrap.Popover(element);
            });
          </script>
        </body>
      </html>
    `.trim();
  };

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
      head,
      html`
        <div
          style="${css`
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
          `}"
        >
          $${app.locals.settings.demonstration
            ? html`
                <nav
                  style="${css`
                    text-align: center;
                    background-color: $red;
                    padding: 0.2rem 1rem;
                    border-bottom: 1px solid white;
                  `}"
                >
                  <a
                    role="button"
                    data-bs-toggle="popover"
                    data-bs-trigger="focus"
                    data-bs-content="${html`
                      CourseLore is running in Demonstration Mode. All data may
                      be lost, including courses, threads, posts, users, and so
                      forth. Also, no emails are actually sent; they show up in
                      the
                      <a href="${app.locals.settings.url}/demonstration-inbox"
                        >Demonstration Inbox</a
                      >
                      instead.
                    `}"
                    data-bs-html="true"
                    tabindex="0"
                    class="btn btn-sm link-light"
                    style="${css`
                      &:hover,
                      &:focus {
                        background-color: $red-600;
                      }
                    `}"
                  >
                    <i class="bi bi-easel"></i>
                    Demonstration Mode
                  </a>
                  <a
                    href="${app.locals.settings.url}/demonstration-inbox"
                    class="btn btn-sm link-light"
                    style="${css`
                      &:hover,
                      &:focus {
                        background-color: $red-600;
                      }
                      ${req.path === "/demonstration-inbox"
                        ? css`
                            background-color: $red-600;
                          `
                        : css``}
                    `}"
                  >
                    <i class="bi bi-inbox"></i>
                    Demonstration Inbox
                  </a>
                </nav>
              `
            : html``}

          <div
            style="${css`
              flex: 1;
              overflow: auto;
            `}"
          >
            $${body}
          </div>
        </div>

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
              const date = new Date(element.defaultValue);
              element.defaultValue =
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

          document.addEventListener(
            "submit",
            (event) => {
              if (isValid(event.target)) return;
              event.preventDefault();
              event.stopPropagation();
            },
            true
          );

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

              const valueInputByUser = element.value;
              const customValidity = validate(element);
              if (element.value !== valueInputByUser)
                elementsToReset.push({ element, valueInputByUser });

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
                for (const { element, valueInputByUser } of elementsToReset)
                  element.value = valueInputByUser;
                return false;
              }
            }
            return true;

            function validate(element) {
              if (element.value.trim() === "")
                if (element.matches("[required]")) return "Fill out this field";
                else return;

              if (
                element.matches('[type="email"]') &&
                !$${app.locals.constants.emailRegExp}.test(element.value)
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

          (() => {
            const beforeUnloadHandler = (event) => {
              if (!isModified(document)) return;
              event.preventDefault();
              event.returnValue = "";
            };
            window.addEventListener("beforeunload", beforeUnloadHandler);
            document.addEventListener("submit", (event) => {
              window.removeEventListener("beforeunload", beforeUnloadHandler);
            });
          })();

          function isModified(element) {
            const elementsToCheck = [...element.querySelectorAll("*"), element];
            for (const element of elementsToCheck) {
              if (element.dataset.skipIsModified === "true") continue;
              if (["radio", "checkbox"].includes(element.type)) {
                if (element.checked !== element.defaultChecked) return true;
              } else if (
                typeof element.value === "string" &&
                typeof element.defaultValue === "string"
              )
                if (element.value !== element.defaultValue) return true;
            }
            return false;
          }

          document.addEventListener("submit", (event) => {
            for (const button of event.target.querySelectorAll(
              'button:not([type="button"])'
            )) {
              button.disabled = true;
              button.insertAdjacentHTML(
                "afterbegin",
                '<div class="spinner-border spinner-border-sm"></div>'
              );
            }
          });
        </script>

        $${res.locals.eventSource
          ? html`
              <script>
                const eventSource = new EventSource(window.location.href);
                let refreshCount = 0;
                eventSource.addEventListener("refresh", async () => {
                  const response = await fetch(window.location.href);
                  switch (response.status) {
                    case 200:
                      const refreshedDocument = new DOMParser().parseFromString(
                        await response.text(),
                        "text/html"
                      );
                      refreshCount++;
                      for (const element of refreshedDocument.querySelectorAll(
                        '[id^="style--"]'
                      ))
                        element.id = element.id.replace(
                          "style--",
                          "style--" + String(refreshCount) + "--"
                        );
                      for (const element of refreshedDocument.querySelectorAll(
                        "head style"
                      ))
                        element.textContent = element.textContent.replaceAll(
                          "#style--",
                          "#style--" + String(refreshCount) + "--"
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
      `
    );

  interface Helpers {
    compileSass: (styles: CSS) => CSS;
  }
  app.locals.helpers.compileSass = (styles) =>
    sass
      .renderSync({
        data: css`
          @import "${path.join(
            __dirname,
            ".."
          )}/public/node_modules/bootstrap/scss/functions";

          $font-family-sans-serif: "IBM Plex Sans", sans-serif;
          $font-family-monospace: "IBM Plex Mono", monospace;
          $font-family-serif: "IBM Plex Serif", serif;

          $h1-font-size: 1.5rem;
          $h2-font-size: 1.25rem;
          $h3-font-size: 1.25rem;
          $h4-font-size: 1.25rem;
          $h5-font-size: 1.25rem;
          $headings-margin-bottom: 1rem;

          $purple: #83769c;
          $pink: #ff77a8;
          $blue: #29adff;
          $red: #ff004d;
          $green: #008751;

          $primary: $purple;

          $enable-shadows: true;

          $card-border-radius: 0.625rem;
          $modal-content-border-radius: 0.625rem;

          @import "${path.join(
            __dirname,
            ".."
          )}/public/node_modules/bootstrap/scss/variables";
          @import "${path.join(
            __dirname,
            ".."
          )}/public/node_modules/bootstrap/scss/mixins";

          ${styles}
        `,
      })
      .css.toString();

  interface Partials {
    globalCSS: CSS;
  }
  app.locals.partials.globalCSS = app.locals.helpers.compileSass(css`
    @import "${path.join(
      __dirname,
      ".."
    )}/public/node_modules/bootstrap/scss/bootstrap";

    // FIXME: https://github.com/twbs/bootstrap/pull/33954
    body {
      overflow-wrap: break-word;
    }

    .btn-primary {
      @include button-variant($primary, $primary, $white);
    }

    .btn-outline-primary {
      @include button-outline-variant($primary, $white);
    }

    .btn-danger {
      @include button-variant($danger, $danger, $white);
    }

    .btn-outline-danger {
      @include button-outline-variant($danger, $white);
    }
  `);
  app.get("/global.css", (req, res) => {
    res.type("css").send(app.locals.partials.globalCSS);
  });

  // https://www.youtube.com/watch?v=dSK-MW-zuAc
  interface Partials {
    artGenerator: (options: { size: number; order: number }) => HTML;
    art: {
      preamble: HTML;
      large: HTML;
      small: HTML;
    };
  }
  app.locals.partials.artGenerator = (options) => {
    // Hilbert
    // let points = [
    //   [1 / 4, 1 / 4],
    //   [1 / 4, 3 / 4],
    //   [3 / 4, 3 / 4],
    //   [3 / 4, 1 / 4],
    // ];
    let points = [
      [1 / 4, 1 / 4],
      [3 / 4, 3 / 4],
      [3 / 4, 1 / 4],
      [1 / 4, 3 / 4],
    ];
    for (let orderIndex = 2; orderIndex <= options.order; orderIndex++) {
      const upperLeft = [];
      const lowerLeft = [];
      const lowerRight = [];
      const upperRight = [];
      for (const [x, y] of points) {
        upperLeft.push([y / 2, x / 2]);
        lowerLeft.push([x / 2, y / 2 + 1 / 2]);
        lowerRight.push([x / 2 + 1 / 2, y / 2 + 1 / 2]);
        upperRight.push([(1 - y) / 2 + 1 / 2, (1 - x) / 2]);
      }
      points = [...upperLeft, ...lowerLeft, ...lowerRight, ...upperRight];
    }

    return html`
      <svg
        width="${options.size}"
        height="${options.size}"
        viewBox="0 0 ${options.size} ${options.size}"
      >
        <polyline
          stroke="url(#gradient)"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
          points="${points
            .flatMap(([x, y]) => [x * options.size, y * options.size])
            .join(" ")}"
        />
      </svg>
    `;
  };
  app.locals.partials.art = {
    preamble: html`
      <svg class="visually-hidden">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#83769c" />
            <stop offset="100%" stop-color="#ff77a8" />
          </linearGradient>
        </defs>
      </svg>

      <script>
        class ArtAnimation {
          constructor({ element, speed, amount, startupDuration }) {
            this._element = element;
            this._polyline = this._element.querySelector("polyline");
            this._points = this._polyline
              .getAttribute("points")
              .split(" ")
              .map(Number);
            this._speed = speed;
            this._amount = amount;
            this._startupDuration = Math.max(1, startupDuration);
            this._timeOffset = 0;
            this._animationFrame = null;
            this._drawAnimationFrame = this._drawAnimationFrame.bind(this);
          }

          start() {
            if (this._animationFrame !== null) return;
            this._timeOffset += performance.now();
            this._animationFrame = window.requestAnimationFrame(
              this._drawAnimationFrame
            );
          }

          stop() {
            if (this._animationFrame === null) return;
            window.cancelAnimationFrame(this._animationFrame);
            this._animationFrame = null;
            this._timeOffset -= performance.now();
          }

          _drawAnimationFrame(time) {
            time -= this._timeOffset;
            this._polyline.setAttribute(
              "points",
              this._points
                .map(
                  (coordinate, index) =>
                    coordinate +
                    (Math.min(time, this._startupDuration) /
                      this._startupDuration) *
                      Math.sin(time * this._speed + index) *
                      this._amount
                )
                .join(" ")
            );
            this._animationFrame = window.requestAnimationFrame(
              this._drawAnimationFrame
            );
          }
        }
      </script>
    `,
    large: app.locals.partials.artGenerator({ size: 600, order: 6 }),
    small: app.locals.partials.artGenerator({ size: 30, order: 3 }),
  };

  // TODO: This should be removed by the end of adding Bootstrap.
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
          $${app.locals.partials.art.small}
          <span>CourseLore</span>
        </a>
        <script>
          (() => {
            const logo = document.currentScript.previousElementSibling;
            const artAnimation = new ArtAnimation({
              element: logo,
              speed: 0.005,
              amount: 1,
              startupDuration: 200,
            });
            logo.addEventListener("mouseover", () => {
              artAnimation.start();
            });
            logo.addEventListener("mouseout", () => {
              artAnimation.stop();
            });
          })();
        </script>
      </h1>

      $${res.locals.user === undefined
        ? html``
        : html`
            <details class="dropdown">
              <summary class="no-marker"><i class="bi bi-list"></i></summary>
              <nav
                style="${css`
                  transform: translate(calc(-100% + 1rem));
                `}"
              >
                <p><strong>${res.locals.user.name}</strong></p>
                <p class="secondary">${res.locals.user.email}</p>
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
      next("route");
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

  interface Layouts {
    box: (
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.box = (req, res, head, body) =>
    app.locals.layouts.application(
      req,
      res,
      head,
      html`
        <div
          style="${css`
            min-height: 100%;
            background-image: linear-gradient(135deg, $purple 0%, $pink 100%);
            padding: 1rem;
            display: flex;
            justify-content: center;
            align-items: center;
          `}"
        >
          <div
            class="card shadow-lg"
            style="${css`
              color: white;
              background-color: $purple-600;
              max-width: 40ch;
              flex: 1;
            `}"
          >
            <div class="card-header">
              <h1
                class="card-text"
                style="${css`
                  text-align: center;
                `}"
              >
                <a
                  href="${app.locals.settings.url}/"
                  class="btn link-light"
                  style="${css`
                    font-family: $font-family-serif;
                    font-size: 2rem;
                    font-weight: bold;
                    font-style: italic;
                    padding: 0;
                    display: inline-flex;
                    gap: 0.5rem;
                    align-items: center;
                    * {
                      stroke: white;
                      transition: stroke 0.15s ease-in-out;
                    }
                    &:hover,
                    &:focus {
                      color: $purple-100;
                      * {
                        stroke: $purple-100;
                      }
                    }
                  `}"
                >
                  $${app.locals.partials.art.small}
                  <span>CourseLore</span>
                </a>
                <script>
                  (() => {
                    const logo = document.currentScript.previousElementSibling;
                    const artAnimation = new ArtAnimation({
                      element: logo,
                      speed: 0.001,
                      amount: 1,
                      startupDuration: 500,
                    });
                    logo.addEventListener("mouseover", () => {
                      artAnimation.start();
                    });
                    logo.addEventListener("mouseout", () => {
                      artAnimation.stop();
                    });
                  })();
                </script>
              </h1>
            </div>
            <div class="card-body">$${body}</div>
          </div>
        </div>
      `
    );

  interface Layouts {
    applicationWithHeader: (
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
  app.locals.layouts.applicationWithHeader = (req, res, head, body) =>
    app.locals.layouts.application(
      req,
      res,
      head,
      html`
        <div
          style="${css`
            height: 100%;
            display: flex;
            flex-direction: column;
          `}"
        >
          <header>
            <nav
              style="${css`
                background-color: $purple;
                padding: 0.5rem 1rem;
                display: grid;
                align-items: center;
                grid-template-columns: 1fr 2fr 1fr;
              `}"
            >
              <div>
                <a
                  href="${app.locals.settings.url}/"
                  class="btn link-light"
                  style="${css`
                    font-family: $font-family-serif;
                    font-size: 1.5rem;
                    font-weight: bold;
                    font-style: italic;
                    line-height: 1;
                    padding: 0;
                    display: inline-flex;
                    gap: 0.5rem;
                    align-items: center;
                    * {
                      stroke: white;
                      transition: stroke 0.15s ease-in-out;
                    }
                    &:hover,
                    &:focus {
                      color: $purple-100;
                      * {
                        stroke: $purple-100;
                      }
                    }
                  `}"
                >
                  $${app.locals.partials.art.small}
                  <span>CourseLore</span>
                </a>
                <script>
                  (() => {
                    const logo = document.currentScript.previousElementSibling;
                    const artAnimation = new ArtAnimation({
                      element: logo,
                      speed: 0.001,
                      amount: 1,
                      startupDuration: 500,
                    });
                    logo.addEventListener("mouseover", () => {
                      artAnimation.start();
                    });
                    logo.addEventListener("mouseout", () => {
                      artAnimation.stop();
                    });
                  })();
                </script>
              </div>

              $${res.locals.course === undefined
                ? html``
                : html`
                    <div
                      class="dropdown"
                      style="${css`
                        @include media-breakpoint-down(md) {
                          grid-area: 2 / 1 / 2 / 4;
                        }
                        @include media-breakpoint-up(md) {
                          justify-self: center;
                        }
                      `}"
                    >
                      <a
                        role="button"
                        class="btn link-light dropdown-toggle"
                        id="course-menu"
                        data-bs-toggle="dropdown"
                        aria-expanded="false"
                        style="${css`
                          white-space: normal;
                          padding: 0 0.2rem;
                          font-weight: 500;
                          &:hover,
                          &:focus {
                            background-color: $purple-600;
                          }
                        `}"
                      >
                        ${res.locals.course.name}
                      </a>
                      <div class="dropdown-menu" aria-labelledby="course-menu">
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings"
                          class="dropdown-item"
                        >
                          <i class="bi bi-sliders"></i>
                          Course Settings
                        </a>
                        $${res.locals.otherEnrollments!.length === 0
                          ? html``
                          : html`
                              <hr class="dropdown-divider" />
                              <h6 class="dropdown-header">
                                <i class="bi bi-arrow-left-right"></i>
                                Switch to Another Course
                              </h6>
                              $${res.locals.otherEnrollments!.map(
                                (otherEnrollment) => html`
                                  <a
                                    href="${app.locals.settings
                                      .url}/courses/${otherEnrollment.course
                                      .reference}"
                                    class="dropdown-item"
                                    style="${css`
                                      display: flex;
                                      gap: 0.5rem;
                                      white-space: normal;
                                    `}"
                                    >${otherEnrollment.course.name}</a
                                  >
                                `
                              )}
                            `}
                      </div>
                    </div>
                  `}
              $${res.locals.user === undefined
                ? html``
                : html`
                    <div
                      style="${css`
                        grid-area: 1 / 3;
                        justify-self: end;
                        margin-right: -0.2rem;
                        display: flex;
                        gap: 0.5rem;
                        align-items: center;
                      `}"
                    >
                      <div class="dropdown">
                        <a
                          role="button"
                          class="btn link-light"
                          id="add-menu"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="Add Menu"
                          style="${css`
                            padding: 0;
                            &:hover,
                            &:focus {
                              background-color: $purple-600;
                            }
                          `}"
                        >
                          <span
                            class="dropdown-toggle"
                            data-bs-toggle="tooltip"
                            data-bs-placement="left"
                            title="Add Course"
                            style="${css`
                              padding: 0.2rem;
                            `}"
                          >
                            <i class="bi bi-plus-circle"></i>
                          </span>
                        </a>
                        <div class="dropdown-menu" aria-labelledby="add-menu">
                          <button
                            type="button"
                            class="dropdown-item"
                            data-bs-toggle="modal"
                            data-bs-target="#enroll-in-an-existing-course-modal"
                          >
                            <i class="bi bi-journal-arrow-down"></i>
                            Enroll in an Existing Course
                          </button>
                          <a
                            href="${app.locals.settings.url}/courses/new"
                            class="dropdown-item"
                          >
                            <i class="bi bi-journal-plus"></i>
                            Create a New Course
                          </a>
                        </div>
                      </div>

                      <div class="dropdown">
                        <a
                          role="button"
                          class="btn link-light"
                          id="user-menu"
                          data-bs-toggle="dropdown"
                          aria-expanded="false"
                          aria-label="User Menu"
                          style="${css`
                            padding: 0;
                            &:hover,
                            &:focus {
                              background-color: $purple-600;
                            }
                          `}"
                        >
                          <span
                            class="dropdown-toggle"
                            data-bs-toggle="tooltip"
                            data-bs-placement="left"
                            title="${res.locals.user.name}"
                            style="${css`
                              padding: 0.2rem;
                            `}"
                          >
                            <i class="bi bi-person-circle"></i>
                          </span>
                        </a>
                        <div class="dropdown-menu" aria-labelledby="user-menu">
                          <div
                            style="${css`
                              padding: 0 1rem;
                            `}"
                          >
                            <strong>${res.locals.user.name}</strong><br />
                            <small
                              style="${css`
                                color: $text-muted;
                              `}"
                              >${res.locals.user.email}</small
                            >
                          </div>
                          <hr class="dropdown-divider" />
                          <a
                            class="dropdown-item"
                            href="${app.locals.settings.url}/settings"
                          >
                            <i class="bi bi-sliders"></i>
                            User Settings
                          </a>
                          <form
                            method="POST"
                            action="${app.locals.settings
                              .url}/authenticate?_method=DELETE"
                          >
                            <button class="dropdown-item">
                              <i class="bi bi-box-arrow-right"></i>
                              Sign Out
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  `}
            </nav>
          </header>

          <main
            style="${css`
              flex: 1;
              overflow: auto;
            `}"
          >
            $${body}
          </main>
        </div>

        <div
          class="modal fade"
          id="enroll-in-an-existing-course-modal"
          tabindex="-1"
          aria-labelledby="enroll-in-an-existing-course-modal-label"
          aria-hidden="true"
        >
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5
                  class="modal-title"
                  id="enroll-in-an-existing-course-modal-label"
                >
                  Enroll in an Existing Course
                </h5>
                <button
                  type="button"
                  class="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
                To enroll in an existing course you either have to follow an
                invitation link or be invited via email. Contact your course
                staff for more information.
              </div>
            </div>
          </div>
        </div>
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
    app.locals.layouts.applicationWithHeader(
      req,
      res,
      head,
      html`
        <div
          style="${css`
            max-width: 80ch;
            padding: 1rem;
            margin: 0 auto;
          `}"
        >
          $${body}
        </div>
      `
    );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >("/", ...app.locals.middlewares.isUnauthenticated, (req, res) => {
    res.redirect(`${app.locals.settings.url}/authenticate`);
  });

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; email?: string; name?: string },
    IsUnauthenticatedMiddlewareLocals
  >(
    "/authenticate",
    ...app.locals.middlewares.isUnauthenticated,
    (req, res) => {
      res.send(
        app.locals.layouts.box(
          req,
          res,
          html`<title>CourseLore · The Open-Source Student Forum</title>`,
          html`
            <form
              method="POST"
              action="${app.locals.settings.url}/authenticate?${qs.stringify({
                redirect: req.query.redirect,
                email: req.query.email,
                name: req.query.name,
              })}"
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
              `}"
            >
              <div>
                <div class="form-floating text-body">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value="${req.query.email ?? ""}"
                    placeholder="name@educational-email.edu"
                    required
                    autofocus
                    class="form-control"
                    aria-describedby="email-help"
                  />
                  <label for="email">Email</label>
                </div>
                <div
                  id="email-help"
                  class="form-text"
                  style="${css`
                    color: inherit;
                  `}"
                >
                  We recommend using the email address you use at your
                  educational institution.
                </div>
              </div>
              <button
                type="submit"
                class="btn btn-primary"
                data-bs-toggle="tooltip"
                title="If you’re a new user, you’ll sign up for a new account. If you’re a returning user, you’ll sign in to your existing account."
              >
                Continue
                <i class="bi bi-chevron-right"></i>
              </button>
            </form>
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
        !app.locals.constants.emailRegExp.test(req.body.email)
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>Authenticate · CourseLore</title>`,
          html`
            <p class="card-text">
              To continue, follow the magic authentication link we sent to
              ${req.body.email}.
            </p>
            <p class="card-text">
              If you’re a new user, you’ll sign up for a new account. If you’re
              a returning user, you’ll sign in to your existing account.
            </p>
            <form
              method="POST"
              action="${app.locals.settings.url}/authenticate?${qs.stringify({
                redirect: req.query.redirect,
                email: req.query.email,
                name: req.query.name,
              })}"
            >
              <input type="hidden" name="email" value="${req.body.email}" />
              <p class="card-text">
                Didn’t receive the email? Already checked the spam folder?
                <button
                  type="submit"
                  class="btn btn-link link-light"
                  style="${css`
                    padding: 0;
                    border: 0;
                    vertical-align: baseline;
                  `}"
                >
                  Resend</button
                >.
              </p>
            </form>

            $${app.locals.settings.demonstration
              ? html`
                  <div
                    role="alert"
                    class="alert alert-danger card-text"
                    style="${css`
                      display: flex;
                      gap: 1rem;
                      align-items: center;
                      margin-top: 1rem;
                    `}"
                  >
                    <i
                      class="bi bi-easel"
                      style="${css`
                        font-size: 2rem;
                      `}"
                    ></i>
                    <div
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: 1rem;
                      `}"
                    >
                      <span>
                        CourseLore doesn’t send emails in demonstration mode.
                      </span>
                      <a
                        href="${magicAuthenticationLink}"
                        class="btn btn-outline-dark"
                      >
                        <i class="bi bi-box-arrow-in-right"></i>
                        Follow Magic Authentication Link
                      </a>
                      <a
                        href="${app.locals.settings.url}/demonstration-inbox"
                        class="btn btn-outline-dark"
                      >
                        <i class="bi bi-inbox"></i>
                        Go to the Demonstration Inbox
                      </a>
                    </div>
                  </div>
                `
              : html``}
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
          app.locals.layouts.box(
            req,
            res,
            html`<title>Authenticate · CourseLore</title>`,
            html`
              <p class="card-text">
                This magic authentication link is invalid or has expired.
              </p>
              <p class="card-text">
                <a
                  href="${app.locals.settings.url}/authenticate?${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                  class="btn btn-primary"
                  style="${css`
                    width: 100%;
                  `}"
                >
                  <i class="bi bi-chevron-left"></i>
                  Start Over
                </a>
              </p>
            `
          )
        );
      const user = app.locals.database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${email}`
      );
      if (user === undefined)
        return res.send(
          app.locals.layouts.box(
            req,
            res,
            html`<title>Sign up · CourseLore</title>`,
            html`
              <form
                method="POST"
                action="${app.locals.settings.url}/users?${qs.stringify({
                  redirect: req.query.redirect,
                  email: req.query.email,
                  name: req.query.name,
                })}"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: 1rem;
                `}"
              >
                <input
                  type="hidden"
                  name="nonce"
                  value="${app.locals.helpers.authenticationNonce.create(
                    email
                  )}"
                />
                <div class="form-floating text-body">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value="${req.query.name ?? ""}"
                    required
                    autofocus
                    class="form-control"
                  />
                  <label for="name">Name</label>
                </div>

                <div class="form-floating text-body">
                  <input
                    type="email"
                    id="email"
                    value="${email}"
                    disabled
                    class="form-control"
                  />
                  <label for="email">Email</label>
                </div>

                <button type="submit" class="btn btn-primary">
                  <i class="bi bi-person-plus"></i>
                  Create Account
                </button>
              </form>
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>Sign up · CourseLore</title>`,
          html`
            <p class="card-text">Something went wrong in your sign up.</p>
            <p class="card-text">
              <a
                href="${app.locals.settings.url}/authenticate?${qs.stringify({
                  redirect: req.query.redirect,
                  email: req.query.email,
                  name: req.query.name,
                })}"
                class="btn btn-primary"
                style="${css`
                  width: 100%;
                `}"
              >
                <i class="bi bi-chevron-left"></i>
                Start Over
              </a>
            </p>
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
          html`<title>Magic Authentication Link · CourseLore</title>`,
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
          res.send(
            app.locals.layouts.main(
              req,
              res,
              html`<title>CourseLore</title>`,
              html`
                <div
                  style="${css`
                    display: flex;
                    gap: 1rem;
                    @include media-breakpoint-down(md) {
                      flex-direction: column;
                    }
                    & > * {
                      flex: 1;
                    }
                  `}"
                >
                  <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#enroll-in-an-existing-course-modal"
                  >
                    <i class="bi bi-journal-arrow-down"></i>
                    Enroll in an Existing Course
                  </button>
                  <a
                    href="${app.locals.settings.url}/courses/new"
                    class="btn btn-outline-primary"
                  >
                    <i class="bi bi-journal-plus"></i>
                    Create a New Course
                  </a>
                </div>
              `
            )
          );
          break;

        case 1:
          res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
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
                            ><span
                              style="${css`
                                font-size: 0.6rem;
                                color: ${enrollment.accentColor};
                              `}"
                            >
                              <i class="bi bi-circle-fill"></i>
                            </span>
                            <strong>${enrollment.course.name}</strong></a
                          >
                        </p>
                      `
                  )}
                </nav>
              `
            )
          );
          break;
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
                        flex: 1;
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
                <small class="full-width secondary">
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

            <form
              method="POST"
              action="${app.locals.settings.url}/courses"
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
              `}"
            >
              <div class="form-floating">
                <input
                  type="text"
                  name="name"
                  autocomplete="off"
                  required
                  autofocus
                  class="form-control"
                  id="name"
                  placeholder="name@example.com"
                />
                <label for="name">Name</label>
              </div>
              <div>
                <button
                  type="submit"
                  class="btn btn-primary"
                  style="${css`
                    @include media-breakpoint-down(md) {
                      width: 100%;
                    }
                  `}"
                >
                  <i class="bi bi-journal-plus"></i>
                  Create Course
                </button>
              </div>
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
      pinnedAt: string | null;
      questionAt: string | null;
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
          pinnedAt: string | null;
          questionAt: string | null;
        }>(
          sql`
            SELECT "threads"."id",
                   "threads"."reference",
                   "threads"."title",
                   "threads"."nextPostReference",
                   "threads"."pinnedAt",
                   "threads"."questionAt"
            FROM "threads"
            WHERE "threads"."course" = ${res.locals.course.id}
            ORDER BY "threads"."pinnedAt" IS NOT NULL DESC,
                     "threads"."id" DESC
          `
        )
        .map((thread) => {
          // FIXME: Try to get rid of these n+1 queries.
          const originalPost = app.locals.database.get<{
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
            pinnedAt: thread.pinnedAt,
            questionAt: thread.questionAt,
            createdAt: originalPost.createdAt,
            updatedAt: mostRecentlyUpdatedPost.updatedAt,
            authorEnrollment:
              originalPost.authorEnrollmentId !== null &&
              originalPost.authorUserId !== null &&
              originalPost.authorUserEmail !== null &&
              originalPost.authorUserName !== null &&
              originalPost.authorEnrollmentRole !== null
                ? {
                    id: originalPost.authorEnrollmentId,
                    user: {
                      id: originalPost.authorUserId,
                      email: originalPost.authorUserEmail,
                      name: originalPost.authorUserName,
                    },
                    role: originalPost.authorEnrollmentRole,
                  }
                : app.locals.constants.anonymousEnrollment,
            postsCount,
            likesCount: originalPost.likesCount,
          };
        });

      next();
    },
  ];

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
              $${res.locals.enrollment.role === "staff"
                ? html`
                    <div
                      style="${css`
                        display: flex;
                        gap: 1rem;
                        @include media-breakpoint-down(md) {
                          flex-direction: column;
                        }
                      `}"
                    >
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/settings"
                        class="btn btn-primary"
                        style="${css`
                          flex: 1;
                        `}"
                      >
                        <i class="bi bi-person-plus"></i>
                        Invite Other People to the Course
                      </a>
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/new"
                        class="btn btn-outline-primary"
                        style="${css`
                          flex: 1;
                        `}"
                      >
                        <i class="bi bi-chat-left-text"></i>
                        Create the First Thread
                      </a>
                    </div>
                  `
                : html`
                    <p>This is a new course.</p>
                    <a
                      href="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/threads/new"
                      class="btn btn-primary"
                      style="${css`
                        @include media-breakpoint-down(md) {
                          width: 100%;
                        }
                      `}"
                    >
                      <i class="bi bi-chat-left-text"></i>
                      Create the First Thread
                    </a>
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
                                flex: 1;
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

                                    <small class="secondary">
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
                                                  <p class="secondary">
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
                                                        margin-left: 0.5rem;
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
                                                        flex: 1;
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
                                  margin-left: 0.5rem;
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
                                  flex: 1;
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
                                  email.type !== "mailbox" || !${app.locals.constants.emailRegExp}.test(email.address)
                              ) !== undefined
                            )
                              return "Match the requested format";
                          `}"
                        ></textarea>
                        <br />
                        <small class="full-width secondary">
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
                              <small class="secondary">
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
            <p class="secondary">
              A bar of this color appears at the top of your screen to help you
              tell courses apart.
              $${res.locals.enrollment.role !== "staff"
                ? html``
                : html`Everyone gets a different color of their choosing.`}
            </p>
            <div
              style="${css`
                margin-top: -1rem;

                & > * + * {
                  margin-left: 0.5rem;
                }
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
                          class="undecorated"
                          style="${css`
                            font-size: 1rem;
                            color: ${accentColor};
                          `}"
                        >
                          $${accentColor === res.locals.enrollment.accentColor
                            ? html`<i class="bi bi-record-circle-fill"></i>`
                            : html`<i class="bi bi-circle-fill"></i>`}
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
                email.type !== "mailbox" ||
                !app.locals.constants.emailRegExp.test(email.address)
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
              <p class="secondary">
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/settings"
                  ><span
                    style="${css`
                      position: relative;
                      top: 0.2em;
                    `}"
                    ><i class="bi bi-arrow-left"></i
                  ></span>
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
            <p class="secondary">
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

            <!-- FIXME: Add explicit ‘action’ -->
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
                  (thread) => html`
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
                        class="secondary"
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
                          $${thread.pinnedAt !== null
                            ? html`
                                <span>
                                  <span
                                    style="${css`
                                      position: relative;
                                      top: 0.2em;
                                    `}"
                                  >
                                    <i class="bi bi-pin"></i>
                                  </span>
                                  Pinned
                                </span>
                              `
                            : html``}
                          $${thread.questionAt !== null
                            ? html`
                                <span>
                                  <span
                                    style="${css`
                                      position: relative;
                                      top: 0.1em;
                                    `}"
                                  >
                                    <i class="bi bi-question-diamond"></i>
                                  </span>
                                  Question
                                </span>
                              `
                            : html``}
                          <span>
                            <span
                              style="${css`
                                position: relative;
                                top: 0.1em;
                              `}"
                            >
                              <i class="bi bi-chat"></i>
                            </span>
                            ${thread.postsCount}
                            post${thread.postsCount === 1 ? "" : "s"}
                          </span>
                          $${thread.likesCount === 0
                            ? html``
                            : html`
                                <span>
                                  <span
                                    style="${css`
                                      position: relative;
                                      top: 0.1em;
                                    `}"
                                  >
                                    <i class="bi bi-hand-thumbs-up"></i>
                                  </span>
                                  ${thread.likesCount}
                                  like${thread.likesCount === 1 ? "" : "s"}
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
    textEditor: (value?: string) => HTML;
  }
  app.locals.partials.textEditor = (value = ""): HTML => html`
    <div class="text-editor">
      <p
        style="${css`
          & > button {
            color: gray;

            &:disabled {
              font-weight: bold;
              color: inherit;
            }
          }

          & > * + * {
            margin-left: 0.5rem;
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
            textEditor.querySelector("textarea").focus();
            this.disabled = true;
            textEditor.querySelector("button.preview").disabled = false;
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
          class="secondary"
          style="${css`
            text-align: right;
            margin-top: -2rem;

            & > * + * {
              margin-left: 0.5rem;
            }
          `}"
        >
          <a
            href="https://guides.github.com/features/mastering-markdown/"
            target="_blank"
            style="${css`
              font-size: 1.3em;
            `}"
            ><i class="bi bi-markdown"></i
          ></a>
          <a
            href="https://katex.org/docs/supported.html"
            target="_blank"
            style="${css`
              font-size: 0.9em;
              position: relative;
              top: -0.3em;
            `}"
            >$${app.locals.partials
              .textProcessor(`$\\LaTeX$`)
              .replace("<p>", "")
              .replace("</p>", "")}</a
          >
        </p>
        <p
          style="${css`
            margin-top: -0.6rem;
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
          >
${value}</textarea
          >
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
        $${app.locals.partials.art.small}
        <strong>Loading…</strong>
      </div>
      <script>
        (() => {
          const loading = document.currentScript.previousElementSibling;
          const artAnimation = new ArtAnimation({
            element: document.currentScript.previousElementSibling,
            speed: 0.005,
            amount: 1,
            startupDuration: 0,
          });
          new MutationObserver(() => {
            if (!loading.hidden) artAnimation.start();
            else artAnimation.stop();
          }).observe(loading, {
            attributes: true,
            attributeFilter: ["hidden"],
          });
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
          // TODO: dark: await shiki.getHighlighter({ theme: "dark-plus" }),
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
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                `}"
              >
                <span
                  style="${css`
                    & > * + * {
                      margin-left: 1rem;
                    }
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <label>
                          <input
                            type="checkbox"
                            name="isPinned"
                            class="undecorated"
                            style="${css`
                              width: 1em;
                              height: 1em;
                              background-image: url("data:image/svg+xml;base64,${Buffer.from(
                                "TODO"
                                // app.locals.icons["pin-angle"].replace(
                                //   "currentColor",
                                //   "gray"
                                // )
                              ).toString("base64")}");
                              &:checked {
                                background-image: url("data:image/svg+xml;base64,${Buffer.from(
                                  "TODO"
                                  // app.locals.icons["pin-fill"]
                                ).toString("base64")}");
                              }
                              background-repeat: no-repeat;
                              background-size: contain;
                              position: relative;
                              top: 0.1em;
                              &:checked {
                                top: 0.2em;
                              }

                              &:not(:checked) + * {
                                color: gray;
                              }
                            `}"
                          />
                          <span>Pin</span>
                          <span class="secondary">
                            Pinned threads are listed first
                          </span>
                        </label>
                      `
                    : html``}

                  <label>
                    <input
                      type="checkbox"
                      name="isQuestion"
                      $${res.locals.enrollment.role === "staff"
                        ? ``
                        : `checked`}
                      class="undecorated"
                      style="${css`
                        width: 1em;
                        height: 1em;
                        background-image: url("data:image/svg+xml;base64,${Buffer.from(
                          "TODO"
                          // app.locals.icons["question-diamond"].replace(
                          //   "currentColor",
                          //   "gray"
                          // )
                        ).toString("base64")}");
                        &:checked {
                          background-image: url("data:image/svg+xml;base64,${Buffer.from(
                            "TODO"
                            // app.locals.icons["question-diamond-fill"]
                          ).toString("base64")}");
                        }
                        background-repeat: no-repeat;
                        background-size: contain;
                        position: relative;
                        top: 0.2em;

                        &:not(:checked) + * {
                          color: gray;
                        }
                      `}"
                    />
                    <span>Question</span>
                  </label>
                </span>

                <button>Create Thread</button>
              </p>
            </form>
          `
        )
      );
    }
  );

  interface Helpers {
    emitCourseRefresh: (courseId: number) => void;
  }
  app.locals.helpers.emitCourseRefresh = (courseId) => {
    for (const eventSource of [...app.locals.eventSources].filter(
      (eventSource) => eventSource.locals.course?.id === courseId
    ))
      eventSource.write(`event: refresh\ndata:\n\n`);
  };

  app.post<
    { courseReference: string },
    HTML,
    {
      title?: string;
      content?: string;
      isPinned?: boolean;
      isQuestion?: boolean;
    },
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
        req.body.content.trim() === "" ||
        (req.body.isPinned && res.locals.enrollment.role !== "staff")
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
          INSERT INTO "threads" ("course", "reference", "title", "nextPostReference", "pinnedAt", "questionAt")
          VALUES (
            ${res.locals.course.id},
            ${String(res.locals.course.nextThreadReference)},
            ${req.body.title},
            ${"2"},
            ${req.body.isPinned ? new Date().toISOString() : null},
            ${req.body.isQuestion ? new Date().toISOString() : null}
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

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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
      answerAt: string | null;
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
          answerAt: string | null;
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
                   "posts"."content",
                   "posts"."answerAt"
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
          answerAt: post.answerAt,
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
                      class="secondary"
                      >#${res.locals.thread.reference}</a
                    >
                  </h1>

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
                              class="undecorated red"
                              onclick="${javascript`
                                if (!confirm("Remove thread?\\n\\nYou can’t undo this action!"))
                                  event.preventDefault();
                              `}"
                            >
                              <i class="bi bi-trash"></i>
                            </button>
                          </p>
                        </form>
                      `
                    : html``}
                  $${app.locals.helpers.mayEditThread(req, res)
                    ? html`
                        <p>
                          <button
                            title="Edit Title"
                            type="button"
                            class="undecorated"
                            onclick="${javascript`
                                const title = this.closest(".title");
                                title.querySelector(".show").hidden = true;
                                const edit = title.querySelector(".edit");
                                edit.hidden = false;
                                const input = edit.querySelector('[name="title"]');
                                input.focus();
                                input.setSelectionRange(0, 0);
                              `}"
                          >
                            <i class="bi bi-pencil"></i>
                          </button>
                        </p>
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
                            value="${res.locals.thread.title}"
                            autocomplete="off"
                            required
                            class="full-width"
                          />
                        </p>
                        <p>
                          <button class="green">Change Title</button>
                          <button
                            type="reset"
                            onclick="${javascript`
                              const title = this.closest(".title");
                              if (isModified(title) && !confirm("Discard changes?")) {
                                event.preventDefault();
                                return;
                              }
                              title.querySelector(".show").hidden = false;
                              const edit = title.querySelector(".edit");
                              edit.hidden = true;
                            `}"
                          >
                            Cancel
                          </button>
                        </p>
                      </form>
                    `
                  : html``}
              </div>

              $${(() => {
                const content: HTML[] = [];

                if (res.locals.enrollment.role === "staff")
                  content.push(html`
                    <form
                      method="POST"
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/threads/${res.locals.thread
                        .reference}?_method=PATCH"
                    >
                      <input
                        type="hidden"
                        name="isPinned"
                        value="${res.locals.thread.pinnedAt === null
                          ? "true"
                          : "false"}"
                      />
                      <p>
                        <button>
                          <span
                            style="${css`
                              position: relative;
                              top: ${res.locals.thread.pinnedAt === null
                                ? "0.1em"
                                : "0.2em"};
                            `}"
                          >
                          </span>
                          ${res.locals.thread.pinnedAt === null
                            ? "Unpinned"
                            : "Pinned"}
                        </button>
                      </p>
                    </form>
                  `);
                else if (res.locals.thread.pinnedAt !== null)
                  content.push(html`
                    <p>
                      <span
                        style="${css`
                          position: relative;
                          top: 0.2em;
                        `}"
                      >
                        <i class="bi bi-pin-fill"></i>
                      </span>
                      Pinned
                    </p>
                  `);

                if (app.locals.helpers.mayEditThread(req, res))
                  content.push(html`
                    <form
                      method="POST"
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/threads/${res.locals.thread
                        .reference}?_method=PATCH"
                    >
                      <input
                        type="hidden"
                        name="isQuestion"
                        value="${res.locals.thread.questionAt === null
                          ? "true"
                          : "false"}"
                      />
                      <p>
                        <button>
                          <span
                            style="${css`
                              position: relative;
                              top: 0.2em;
                            `}"
                          >
                          </span>
                          ${res.locals.thread.questionAt === null
                            ? "Not a Question"
                            : "Question"}
                        </button>
                      </p>
                    </form>
                  `);
                else if (res.locals.thread.questionAt !== null)
                  content.push(html`
                    <p>
                      <span
                        style="${css`
                          position: relative;
                          top: 0.2em;
                        `}"
                      >
                        <i class="bi bi-question-diamond-fill"></i>
                      </span>
                      Question
                    </p>
                  `);

                return content.length === 0
                  ? html``
                  : html`
                      <div
                        class="secondary"
                        style="${css`
                          margin-top: -1.5rem;
                          display: flex;

                          & > * + * {
                            margin-left: 1rem;
                          }
                        `}"
                      >
                        $${content}
                      </div>
                    `;
              })()}
              $${res.locals.posts.map(
                (post) => html`
                  <section
                    id="post--${post.reference}"
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
                        <span class="secondary">
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
                                  class="undecorated red"
                                  onclick="${javascript`
                                    if (!confirm("Remove post?\\n\\nYou can’t undo this action!"))
                                      event.preventDefault();
                                  `}"
                                >
                                  <i class="bi bi-trash"></i>
                                </button>
                              </p>
                            </form>
                          `
                        : html``}
                      $${app.locals.helpers.mayEditPost(req, res, post)
                        ? html`
                            <p>
                              <button
                                title="Edit Post"
                                type="button"
                                class="undecorated"
                                onclick="${javascript`
                                  const post = this.closest(".post");
                                  post.querySelector(".show").hidden = true;
                                  const edit = post.querySelector(".edit");
                                  edit.hidden = false;
                                  const textarea = edit.querySelector('[name="content"]');
                                  textarea.focus();
                                  textarea.setSelectionRange(0, 0);
                                `}"
                              >
                                <i class="bi bi-pencil"></i>
                              </button>
                            </p>
                          `
                        : html``}

                      <p>
                        <button
                          title="Reply"
                          type="button"
                          class="undecorated"
                          onclick="${javascript`
                            const newPost = document.querySelector("#new-post");
                            newPost.querySelector(".write").click();
                            const newPostContent = newPost.querySelector('[name="content"]');
                            const quote = ((newPostContent.selectionStart > 0) ? "\\n\\n" : "") +
                            ${JSON.stringify(
                              `> **In response to #${
                                res.locals.thread.reference
                              }/${post.reference} by ${
                                post.authorEnrollment.user.name
                              }**\n>\n${post.content
                                .split("\n")
                                .map((line) => `> ${line}`)
                                .join("\n")}\n\n`
                            )};
                            const selectionStart = newPostContent.selectionStart + quote.length;
                            const selectionEnd = newPostContent.selectionEnd + quote.length;
                            newPostContent.value =
                              newPostContent.value.slice(0, newPostContent.selectionStart) +
                              quote +
                              newPostContent.value.slice(newPostContent.selectionStart);
                            newPostContent.dispatchEvent(new Event("input"));
                            newPostContent.focus();
                            newPostContent.setSelectionRange(selectionStart, selectionEnd);
                          `}"
                        >
                          <i class="bi bi-reply"></i>
                        </button>
                      </p>
                    </div>

                    <div class="show">
                      $${(() => {
                        const content: HTML[] = [];

                        if (post.reference !== "1")
                          if (app.locals.helpers.mayEditPost(req, res, post))
                            content.push(html`
                              <form
                                method="POST"
                                action="${app.locals.settings.url}/courses/${res
                                  .locals.course.reference}/threads/${res.locals
                                  .thread
                                  .reference}/posts/${post.reference}?_method=PATCH"
                              >
                                <input
                                  type="hidden"
                                  name="isAnswer"
                                  value="${post.answerAt === null
                                    ? "true"
                                    : "false"}"
                                />
                                <p>
                                  <button>
                                    <span
                                      style="${css`
                                        position: relative;
                                        top: 0.1em;
                                      `}"
                                    >
                                    </span>
                                    ${post.answerAt === null
                                      ? "Not an Answer"
                                      : "Answer"}
                                  </button>
                                </p>
                              </form>
                            `);
                          else if (post.answerAt !== null)
                            content.push(html`
                              <p>
                                <span
                                  style="${css`
                                    position: relative;
                                    top: 0.1em;
                                  `}"
                                >
                                  <i class="bi bi-patch-check-fill"></i>
                                </span>
                                Answer
                              </p>
                            `);

                        return content.length === 0
                          ? html``
                          : html`
                              <div
                                class="secondary"
                                style="${css`
                                  margin-top: -1.5rem;
                                  display: flex;

                                  & > * + * {
                                    margin-left: 1rem;
                                  }
                                `}"
                              >
                                $${content}
                              </div>
                            `;
                      })()}
                      $${app.locals.partials.textProcessor(post.content)}

                      <div>
                        $${(() => {
                          const isLiked = post.likes.find(
                            (like) =>
                              like.enrollment.id === res.locals.enrollment.id
                          );
                          const likesCount = post.likes.length;

                          return html`
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/threads/${res.locals
                                .thread
                                .reference}/posts/${post.reference}/likes${isLiked
                                ? "?_method=DELETE"
                                : ""}"
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
                                <span
                                  class="secondary"
                                  style="${css`
                                    & > * + * {
                                      margin-left: 0.5rem;
                                    }
                                  `}"
                                >
                                  <button
                                    class="undecorated ${isLiked
                                      ? "green"
                                      : ""}"
                                  >
                                    <span
                                      style="${css`
                                        position: relative;
                                        top: 0.05em;
                                      `}"
                                    >
                                    </span>
                                    $${isLiked ? html`Liked` : html`Like`}
                                    $${likesCount > 0
                                      ? html`
                                          · ${likesCount}
                                          like${likesCount === 1 ? "" : "s"}
                                        `
                                      : html``}
                                  </button>
                                </span>
                              </p>
                            </form>
                          `;
                        })()}
                      </div>
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
                            $${app.locals.partials.textEditor(post.content)}
                            <p
                              style="${css`
                                text-align: right;
                              `}"
                            >
                              <button
                                type="reset"
                                onclick="${javascript`
                                  const post = this.closest(".post");
                                  if (isModified(post) && !confirm("Discard changes?")) {
                                    event.preventDefault();
                                    return;
                                  }
                                  post.querySelector(".show").hidden = false;
                                  const edit = post.querySelector(".edit");
                                  edit.hidden = true;
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
              <script>
                (() => {
                  const textarea = document.currentScript.previousElementSibling.querySelector(
                    "textarea"
                  );
                  textarea.defaultValue =
                    JSON.parse(
                      localStorage.getItem("threadsTextareas") ?? "{}"
                    )[window.location.pathname] ?? "";
                  textarea.dataset.skipIsModified = "true";
                  textarea.addEventListener("input", () => {
                    const threadsTextareas = JSON.parse(
                      localStorage.getItem("threadsTextareas") ?? "{}"
                    );
                    threadsTextareas[window.location.pathname] = textarea.value;
                    localStorage.setItem(
                      "threadsTextareas",
                      JSON.stringify(threadsTextareas)
                    );
                  });
                  textarea.closest("form").addEventListener("submit", () => {
                    const threadsTextareas = JSON.parse(
                      localStorage.getItem("threadsTextareas") ?? "{}"
                    );
                    delete threadsTextareas[window.location.pathname];
                    localStorage.setItem(
                      "threadsTextareas",
                      JSON.stringify(threadsTextareas)
                    );
                  });
                })();
              </script>
              <p
                style="${css`
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                `}"
              >
                <span
                  style="${css`
                    & > * + * {
                      margin-left: 1rem;
                    }
                  `}"
                >
                  $${res.locals.thread.questionAt !== null
                    ? html`
                        <label>
                          <input
                            type="checkbox"
                            name="isAnswer"
                            $${res.locals.enrollment.role === "staff"
                              ? `checked`
                              : ``}
                            class="undecorated"
                            style="${css`
                              width: 1em;
                              height: 1em;
                              background-image: url("data:image/svg+xml;base64,${Buffer.from(
                                "TODO"
                                // app.locals.icons["patch-check"].replace(
                                //   "currentColor",
                                //   "gray"
                                // )
                              ).toString("base64")}");
                              &:checked {
                                background-image: url("data:image/svg+xml;base64,${Buffer.from(
                                  "TODO"
                                  // app.locals.icons["patch-check-fill"]
                                ).toString("base64")}");
                              }
                              background-repeat: no-repeat;
                              background-size: contain;
                              position: relative;
                              top: 0.1em;

                              &:not(:checked) + * {
                                color: gray;
                              }
                            `}"
                          />
                          <span>Answer</span>
                        </label>
                      `
                    : html``}
                </span>

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
    {
      title?: string;
      isPinned?: "true" | "false";
      isQuestion?: "true" | "false";
    },
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

      if (typeof req.body.isPinned === "string")
        if (
          !["true", "false"].includes(req.body.isPinned) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isPinned === "true" &&
            res.locals.thread.pinnedAt !== null) ||
          (req.body.isPinned === "false" && res.locals.thread.pinnedAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "threads"
              SET "pinnedAt" = ${
                req.body.isPinned === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.thread.id}
            `
          );

      if (typeof req.body.isQuestion === "string")
        if (
          !["true", "false"].includes(req.body.isQuestion) ||
          (req.body.isQuestion === "true" &&
            res.locals.thread.questionAt !== null) ||
          (req.body.isQuestion === "false" &&
            res.locals.thread.questionAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "threads"
              SET "questionAt" = ${
                req.body.isQuestion === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.thread.id}
            `
          );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}`
      );
    }
  );

  app.post<
    { courseReference: string; threadReference: string },
    HTML,
    { content?: string; isAnswer?: boolean },
    {},
    IsThreadAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts",
    ...app.locals.middlewares.isThreadAccessible,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        (req.body.isAnswer && res.locals.thread.questionAt === null)
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
          INSERT INTO "posts" ("thread", "reference", "authorEnrollment", "content", "answerAt")
          VALUES (
            ${res.locals.thread.id},
            ${String(res.locals.thread.nextPostReference)},
            ${res.locals.enrollment.id},
            ${req.body.content},
            ${req.body.isAnswer ? new Date().toISOString() : null}
          )
        `
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.thread.reference}#${res.locals.thread.nextPostReference}`
      );
    }
  );

  app.patch<
    { courseReference: string; threadReference: string; postReference: string },
    any,
    { content?: string; isAnswer?: "true" | "false" },
    {},
    MayEditPostMiddlewareLocals
  >(
    "/courses/:courseReference/threads/:threadReference/posts/:postReference",
    ...app.locals.middlewares.mayEditPost,
    (req, res, next) => {
      if (typeof req.body.content === "string")
        if (req.body.content.trim() === "") return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "posts"
              SET "content" = ${req.body.content},
                  "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${res.locals.post.id}
            `
          );

      if (typeof req.body.isAnswer === "string")
        if (
          !["true", "false"].includes(req.body.isAnswer) ||
          res.locals.thread.questionAt === null ||
          (req.body.isAnswer === "true" && res.locals.post.answerAt !== null) ||
          (req.body.isAnswer === "false" && res.locals.post.answerAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "posts"
              SET "answerAt" = ${
                req.body.isAnswer === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.post.id}
            `
          );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

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
      sql`
        INSERT INTO "emailsQueue" ("reference", "to", "subject", "body")
        VALUES (
          ${cryptoRandomString({ length: 10, type: "numeric" })},
          ${to},
          ${subject},
          ${body}
        )
      `
    );
    // TODO: The worker that sends emails on non-demonstration mode. Kick the worker to wake up from here (as well as periodically just in case…)
  };

  app.get<{}, HTML, {}, {}, {}>("/demonstration-inbox", (req, res, next) => {
    if (!app.locals.settings.demonstration) return next();

    const emails = app.locals.database.all<{
      createdAt: string;
      reference: string;
      to: string;
      subject: string;
      body: string;
    }>(
      sql`SELECT "createdAt", "reference", "to", "subject", "body" FROM "emailsQueue" ORDER BY "id" DESC`
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

          $${emails.length === 0
            ? html``
            : html`
                <div class="accordion">
                  $${emails.map(
                    (email) => html`
                        <div class="accordion-item">
                          <h2
                            class="accordion-header"
                            id="email-heading--${email.reference}"
                          >
                            <button
                              class="accordion-button collapsed"
                              type="button"
                              data-bs-toggle="collapse"
                              data-bs-target="#email-collapse--${
                                email.reference
                              }"
                              aria-expanded="false"
                              aria-controls="email-collapse--${email.reference}"
                            >
                              <span>
                                <strong>${email.subject}</strong><br />
                                <small
                                  style="${css`
                                    color: $text-muted;
                                  `}"
                                  >${email.to} ·
                                  <time
                                    style="${css`
                                      display: inline-block;
                                    `}"
                                    >${email.createdAt}</time
                                  ></span
                                >
                              </small>
                            </button>
                          </h2>
                          <div
                            id="email-collapse--${email.reference}"
                            class="accordion-collapse collapse"
                            aria-labelledby="email-heading--${email.reference}"
                          >
                            <div class="accordion-body">$${email.body}</div>
                          </div>
                        </div>
                      `
                  )}
                </div>
              `}
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
        html`<title>${message} Error · CourseLore</title>`,
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

  interface Constants {
    emailRegExp: RegExp;
  }
  app.locals.constants.emailRegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

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
