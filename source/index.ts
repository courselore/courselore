#!/usr/bin/env node

import path from "path";
import assert from "assert/strict";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";

import { Database, sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css, extractInlineStyles } from "@leafac/css";
import javascript from "tagged-template-noop";
import markdown from "tagged-template-noop";
import dedent from "dedent";

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
import unistUtilVisit from "unist-util-visit";
import rehypeStringify from "rehype-stringify";
import { JSDOM } from "jsdom";

import fs from "fs-extra";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import sharp from "sharp";
import lodash from "lodash";
import faker from "faker";

export default async function courselore(
  rootDirectory: string
): Promise<express.Express> {
  interface App extends express.Express {}
  const app = express() as App;

  interface App {
    locals: AppLocals;
  }
  interface AppLocals {
    settings: Settings;
  }
  interface Settings {
    env: string;
    url: string;
    administrator: string;
    demonstration: boolean;
    liveReload: boolean;
  }
  app.locals.settings.url = "https://localhost:5000";
  app.locals.settings.administrator =
    "mailto:demonstration-development@courselore.org";
  app.locals.settings.demonstration = true;
  app.locals.settings.liveReload = false;

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

  interface Constants {
    accentColors: AccentColor[];
  }
  type AccentColor = "amber" | "teal" | "blue" | "purple";
  app.locals.constants.accentColors = ["amber", "teal", "blue", "purple"];

  interface Constants {
    anonymousEnrollment: AnonymousEnrollment;
  }
  interface AnonymousEnrollment {
    id: null;
    user: {
      id: null;
      email: null;
      name: "Anonymous";
      avatar: null;
      biography: null;
    };
    reference: null;
    role: null;
  }
  app.locals.constants.anonymousEnrollment = {
    id: null,
    user: {
      id: null,
      email: null,
      name: "Anonymous",
      avatar: null,
      biography: null,
    },
    reference: null,
    role: null,
  };

  interface Constants {
    tagVisibleBy: TagVisibleBy[];
  }
  type TagVisibleBy = "everyone" | "staff";
  app.locals.constants.tagVisibleBy = ["everyone", "staff"];

  interface AppLocals {
    database: Database;
  }
  await fs.ensureDir(rootDirectory);
  app.locals.database = new Database(path.join(rootDirectory, "courselore.db"));
  app.locals.database.migrate(
    sql`
      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
        "password" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "avatar" TEXT NULL,
        "biography" TEXT NULL
      );

      CREATE TABLE "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "reference" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "nextConversationReference" INTEGER NOT NULL DEFAULT 1
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
        "accentColor" TEXT NOT NULL CHECK ("accentColor" IN ('amber', 'teal', 'blue', 'purple')),
        UNIQUE ("user", "course"),
        UNIQUE ("course", "reference")
      );

      CREATE TABLE "conversations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "nextMessageReference" INTEGER NOT NULL DEFAULT 1,
        "pinnedAt" TEXT NULL,
        "questionAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE VIRTUAL TABLE "conversationsSearch" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "title",
        tokenize = 'porter'
      );
      CREATE TRIGGER "conversationsSearchInsert" AFTER INSERT ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("rowid", "title") VALUES ("new"."id", "new"."title");
      END;
      CREATE TRIGGER "conversationsSearchUpdate" AFTER UPDATE ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("conversationsSearch", "rowid", "title")
        VALUES ('delete', "old"."id", "old"."title");
        INSERT INTO "conversationsSearch" ("rowid", "title") VALUES ("new"."id", "new"."title");
      END;
      CREATE TRIGGER "conversationsSearchDelete" AFTER DELETE ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("conversationsSearch", "rowid", "title")
        VALUES ('delete', "old"."id", "old"."title");
      END;

      CREATE TABLE "messages" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "updatedAt" TEXT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        "answerAt" TEXT NULL,
        UNIQUE ("conversation", "reference")
      );
      CREATE VIRTUAL TABLE "messagesSearch" USING fts5(
        content = "messages",
        content_rowid = "id",
        "content",
        tokenize = 'porter'
      );
      CREATE TRIGGER "messagesSearchInsert" AFTER INSERT ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("rowid", "content") VALUES ("new"."id", "new"."content");
      END;
      CREATE TRIGGER "messagesSearchUpdate" AFTER UPDATE ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("messagesSearch", "rowid", "content")
        VALUES ('delete', "old"."id", "old"."content");
        INSERT INTO "messagesSearch" ("rowid", "content") VALUES ("new"."id", "new"."content");
      END;
      CREATE TRIGGER "messagesSearchDelete" AFTER DELETE ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("messagesSearch", "rowid", "content")
        VALUES ('delete', "old"."id", "old"."content");
      END;

      CREATE TABLE "endorsements" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );

      CREATE TABLE "likes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );

      CREATE TABLE "tags" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "visibleBy" TEXT NOT NULL CHECK ("visibleBy" IN ('everyone', 'staff')),
        UNIQUE ("course", "reference")
      );

      CREATE TABLE "taggings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "tag" INTEGER NOT NULL REFERENCES "tags" ON DELETE CASCADE,
        UNIQUE ("conversation", "tag")
      );

      CREATE TABLE "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "token" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      );

      CREATE TABLE "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "nonce" TEXT NOT NULL UNIQUE,
        "content" TEXT NOT NULL
      );

      CREATE TABLE "emailsQueue" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "triedAt" TEXT NOT NULL DEFAULT (json_array()) CHECK (json_valid("triedAt")),
        "reference" TEXT NOT NULL,
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL
      );
    `
  );

  interface Layouts {
    base: (_: {
      req?: express.Request<
        {},
        any,
        {},
        {},
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<EventSourceMiddlewareLocals>
      >;
      res?: express.Response<
        any,
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.base = ({ req, res, head, body }) =>
    extractInlineStyles(html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
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
              .url}/node_modules/bootstrap-icons/font/bootstrap-icons.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/katex/dist/katex.min.css"
          />

          <script src="${app.locals.settings
              .url}/node_modules/@popperjs/core/dist/umd/popper.min.js"></script>
          <script src="${app.locals.settings
              .url}/node_modules/tippy.js/dist/tippy-bundle.umd.min.js"></script>
          <script>
            tippy.setDefaultProps({
              arrow: tippy.roundArrow + tippy.roundArrow,
              duration: window.matchMedia("(prefers-reduced-motion: reduce)")
                .matches
                ? 1
                : 150,
            });
          </script>
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/tippy.js/dist/svg-arrow.css"
          />
          <link
            rel="stylesheet"
            href="${app.locals.settings
              .url}/node_modules/tippy.js/dist/border.css"
          />

          <script type="module">
            import * as textFieldEdit from "${app.locals.settings
              .url}/node_modules/text-field-edit/index.js";
            window.textFieldEdit = textFieldEdit;
          </script>

          <script src="${app.locals.settings
              .url}/node_modules/mousetrap/mousetrap.min.js"></script>

          <script>
            /* TODO: Extract the following global auxiliary functions into @leafac/javascript */
            window.addEventListener("DOMContentLoaded", () => {
              for (const element of document.querySelectorAll(
                "[data-ondomcontentloaded]"
              ))
                new Function(element.dataset.ondomcontentloaded).call(element);
            });

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
            function relativizeTime(element) {
              const relativeTimeFormat = new Intl.RelativeTimeFormat("en-US", {
                localeMatcher: "lookup",
                numeric: "auto",
              });

              const minutes = 60 * 1000;
              const hours = 60 * minutes;
              const days = 24 * hours;
              const weeks = 7 * days;
              const months = 30 * days;
              const years = 365 * days;

              const datetime = element.textContent.trim();
              element.setAttribute("datetime", datetime);
              tippy(element, {
                content: datetime,
                touch: false,
              });

              (function update() {
                const difference = new Date(datetime).getTime() - Date.now();
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
                element.textContent = relativeTimeFormat.format(
                  // FIXME: Should this really be ‘round’, or should it be ‘floor/ceil’?
                  Math.round(value),
                  unit
                );
                window.setTimeout(update, 10000);
              })();
            }

            function localizeTime(element) {
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
              (element.validators ??= []).push(() => {
                if (
                  element.value.match(${/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/}) ===
                  null
                )
                  return "Match the pattern YYYY-MM-DD HH:MM.";
                const date = new Date(element.value.replace(" ", "T"));
                if (isNaN(date.getTime())) return "Invalid datetime";
                element.value = date.toISOString();
              });
            }

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
                element,
                ...element.querySelectorAll("*"),
              ];
              const elementsToReset = new Map();

              for (const element of elementsToValidate) {
                if (
                  typeof element.setCustomValidity !== "function" ||
                  element.closest("[disabled]") !== null
                )
                  continue;

                const valueInputByUser = element.value;
                const customValidity = validate(element);
                if (element.value !== valueInputByUser)
                  elementsToReset.set(element, valueInputByUser);
                if (typeof customValidity === "string") {
                  element.setCustomValidity(customValidity);
                  element.addEventListener("click", reset, { once: true });
                  element.addEventListener("input", reset, { once: true });
                  function reset() {
                    element.setCustomValidity("");
                  }
                }

                if (!element.reportValidity()) {
                  for (const [element, valueInputByUser] of elementsToReset)
                    element.value = valueInputByUser;
                  return false;
                }
              }
              return true;

              function validate(element) {
                if (
                  element.matches("[required]") &&
                  element.value.trim() === ""
                )
                  return "Fill out this field";

                if (
                  element.matches('[type="email"]') &&
                  element.value.trim() !== "" &&
                  !element.value.match(${app.locals.constants.emailRegExp})
                )
                  return "Enter an email address";

                for (const validator of element.validators ?? []) {
                  const customValidity = validator();
                  if (typeof customValidity === "string") return customValidity;
                }
              }
            }

            (() => {
              const warnAboutLosingInputs = (event) => {
                if (!isModified(document.body)) return;
                event.preventDefault();
                event.returnValue = "";
              };
              window.addEventListener("beforeunload", warnAboutLosingInputs);
              document.addEventListener("submit", (event) => {
                window.removeEventListener(
                  "beforeunload",
                  warnAboutLosingInputs
                );
              });
            })();

            function isModified(element) {
              const elementsToCheck = [
                element,
                ...element.querySelectorAll("*"),
              ];
              for (const element of elementsToCheck) {
                if (
                  element.dataset.skipIsModified === "true" ||
                  element.closest("[disabled]") !== null
                )
                  continue;
                if (element.dataset.forceIsModified === "true") return true;
                if (["radio", "checkbox"].includes(element.type)) {
                  if (element.checked !== element.defaultChecked) return true;
                } else if (element.tagName.toLowerCase() === "option") {
                  if (element.selected !== element.defaultSelected) return true;
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
              ))
                button.disabled = true;
            });
          </script>

          $${res?.locals.eventSource
            ? html`
                <!-- TODO: Improve this such that the diff is done on the server. -->
                <script src="${app.locals.settings
                    .url}/node_modules/morphdom/dist/morphdom-umd.min.js"></script>

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
                        for (const element of refreshedDocument.querySelectorAll(
                          "[data-ondomcontentloaded]"
                        ))
                          new Function(element.dataset.ondomcontentloaded).call(
                            element
                          );

                        morphdom(
                          document.documentElement,
                          refreshedDocument.documentElement
                        );
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
          $${app.locals.settings.liveReload
            ? html`
                <script>
                  const liveReload = new EventSource(
                    "${app.locals.settings.url}/live-reload"
                  );
                  liveReload.addEventListener("error", (event) => {
                    liveReload.close();
                    (async function reload() {
                      if (
                        (await fetch("${app.locals.settings.url}/live-reload"))
                          .ok
                      )
                        location.reload();
                      else window.setTimeout(reload, 200);
                    })();
                  });
                </script>
              `
            : html``}
          $${head}
        </head>
        <body
          style="${css`
            font-family: var(--font-family--sans-serif);
            font-size: var(--font-size--sm);
            line-height: var(--line-height--sm);
            color: var(--color--gray--medium--700);
            background-color: var(--color--gray--medium--50);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--200);
              background-color: var(--color--gray--medium--900);
            }

            @at-root {
              .label {
                display: flex;
                flex-direction: column;
                gap: var(--space--1);

                .label--text {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  font-weight: var(--font-weight--bold);
                  display: flex;
                  gap: var(--space--1);
                }

                .label--radio-or-checkbox {
                  cursor: pointer;
                  display: flex;
                  gap: var(--space--2);
                  align-items: center;
                }
              }

              .input--text {
                background-color: var(--color--gray--medium--200);
                --color--box-shadow: var(--color--blue--400);
                &::placeholder {
                  color: var(--color--gray--medium--400);
                }
                &:disabled {
                  color: var(--color--gray--medium--500);
                  -webkit-text-fill-color: var(--color--gray--medium--500);
                  background-color: var(--color--gray--medium--300);
                }
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--700);
                  --color--box-shadow: var(--color--blue--600);
                  &::placeholder {
                    color: var(--color--gray--medium--500);
                  }
                  &:disabled {
                    color: var(--color--gray--medium--500);
                    -webkit-text-fill-color: var(--color--gray--medium--500);
                    background-color: var(--color--gray--medium--800);
                  }
                }
                width: 100%;
                display: block;
                padding: var(--space--2) var(--space--4);
                border-radius: var(--border-radius--md);
                &:focus-within {
                  box-shadow: var(--border-width--0) var(--border-width--0)
                    var(--border-width--0) var(--border-width--2)
                    var(--color--box-shadow);
                }
                transition-property: var(--transition-property--box-shadow);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
              }

              .input--radio {
                background-color: var(--color--gray--medium--200);
                &:hover,
                &:focus-within {
                  background-color: var(--color--gray--medium--300);
                }
                &:active {
                  background-color: var(--color--gray--medium--400);
                }
                &:checked {
                  background-color: var(--color--blue--600);
                }
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--700);
                  &:hover,
                  &:focus-within {
                    background-color: var(--color--gray--medium--600);
                  }
                  &:active {
                    background-color: var(--color--gray--medium--500);
                  }
                  &:checked {
                    background-color: var(--color--blue--700);
                  }
                }
                width: var(--space--3-5);
                height: var(--space--3-5);
                border-radius: var(--border-radius--circle);
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
                transition-property: var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );

                &::before {
                  content: "";
                  background-color: var(--color--gray--medium--50);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--200);
                  }
                  display: block;
                  width: var(--space--1-5);
                  height: var(--space--1-5);
                  border-radius: var(--border-radius--circle);
                  transition-property: var(--transition-property--transform);
                  transition-duration: var(--transition-duration--150);
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
                }
                &:not(:checked)::before {
                  transform: scale(var(--scale--0));
                }
              }

              .button {
                padding: var(--space--1) var(--space--4);
                border-radius: var(--border-radius--md);
                display: flex;
                gap: var(--space--2);
                justify-content: center;
                align-items: center;
                transition-property: var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
                cursor: pointer;

                &.button--icon {
                  padding: var(--space--0-5) var(--space--1);

                  &.button--icon--inline {
                    margin-top: var(--space---0-5);
                  }
                }

                &.button--full-width-on-small-screen {
                  @media (max-width: 400px) {
                    width: 100%;
                  }
                }

                &.button--transparent {
                  &:hover,
                  &:focus-within,
                  &.active {
                    background-color: var(--color--gray--medium--300);
                  }
                  &:active {
                    background-color: var(--color--gray--medium--400);
                  }
                  @media (prefers-color-scheme: dark) {
                    &:hover,
                    &:focus-within,
                    &.active {
                      background-color: var(--color--gray--medium--700);
                    }
                    &:active {
                      background-color: var(--color--gray--medium--600);
                    }
                  }
                }

                ${["blue", "green", "rose"].map(
                  (color) => css`
                    &.button--${color} {
                      color: var(--color--${color}--50);
                      background-color: var(--color--${color}--600);
                      &:hover,
                      &:focus-within,
                      &.active {
                        background-color: var(--color--${color}--500);
                      }
                      &:active {
                        background-color: var(--color--${color}--700);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--${color}--100);
                        background-color: var(--color--${color}--800);
                        &:hover,
                        &:focus-within,
                        &.active {
                          background-color: var(--color--${color}--700);
                        }
                        &:active {
                          background-color: var(--color--${color}--900);
                        }
                      }
                    }
                  `
                )}
              }

              .heading {
                font-size: var(--font-size--2xs);
                line-height: var(--line-height--2xs);
                font-weight: var(--font-weight--bold);
                text-transform: uppercase;
                letter-spacing: var(--letter-spacing--widest);
                color: var(--color--gray--medium--600);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--400);
                }
                display: flex;
                gap: var(--space--2);
              }

              .heading--display {
                font-size: var(--font-size--xl);
                line-height: var(--line-height--xl);
                font-weight: var(--font-weight--bold);
                text-align: center;
                color: var(--color--gray--medium--800);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--100);
                }
              }

              .strong {
                font-weight: var(--font-weight--bold);
                color: var(--color--gray--medium--800);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--100);
                }
              }

              .secondary {
                color: var(--color--gray--medium--500);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--400);
                }
              }

              .rose {
                color: var(--color--rose--600);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--rose--600);
                }
              }

              .avatar {
                border-radius: var(--border-radius--circle);
                @media (prefers-color-scheme: dark) {
                  filter: brightness(var(--brightness--90));
                }
              }

              .decorative-icon {
                font-size: var(--font-size--9xl);
                line-height: var(--line-height--9xl);
                color: var(--color--gray--medium--300);
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--600);
                  background-color: var(--color--gray--medium--800);
                }
                width: var(--space--48);
                height: var(--space--48);
                border-radius: var(--border-radius--circle);
                display: flex;
                justify-content: center;
                align-items: center;
              }

              .notification-indicator {
                display: grid;
                & > *,
                &::after {
                  grid-area: 1 / 1;
                }
                &::after {
                  content: "";
                  background-color: var(--color--rose--500);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--rose--600);
                  }
                  display: block;
                  width: var(--space--3);
                  height: var(--space--3);
                  border: var(--border-width--2) solid
                    var(--color--gray--medium--700);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--800);
                  }
                  border-radius: var(--border-radius--circle);
                  justify-self: end;
                  margin-right: var(--space---1);
                }
              }

              .separator {
                border-top: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              }

              .stripped {
                & > * {
                  &:nth-child(odd) {
                    background-color: var(--color--gray--medium--200);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--color--gray--medium--800);
                    }
                  }
                  padding: var(--space--2);
                  border-radius: var(--border-radius--md);
                }
              }

              .tippy-box {
                --background-color: var(--color--gray--medium--100);
                --border-color: var(--color--gray--medium--400);
                @media (prefers-color-scheme: dark) {
                  --background-color: var(--color--gray--medium--800);
                  --border-color: var(--color--gray--medium--400);
                }
                color: inherit;
                background-color: var(--background-color);
                border: var(--border-width--1) solid var(--border-color);
                border-radius: var(--border-radius--md);
                & > .tippy-svg-arrow > svg {
                  &:first-child {
                    fill: var(--border-color);
                  }
                  &:last-child {
                    fill: var(--background-color);
                  }
                }

                .tippy-content {
                  padding: var(--space--1) var(--space--2);
                }

                .heading {
                  padding: var(--space--1) var(--space--2);
                }

                .keyboard-shortcut {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  color: var(--color--gray--medium--500);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--400);
                  }

                  .keyboard-shortcut--cluster {
                    letter-spacing: var(--letter-spacing--widest);
                  }
                }

                .dropdown-menu {
                  display: flex;
                  flex-direction: column;

                  .dropdown-menu--item {
                    width: 100%;
                    padding-left: var(--space--2);
                    padding-right: var(--space--2);
                    justify-content: start;
                  }
                }
              }

              .text {
                color: var(--color--gray--medium--700);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--400);
                }

                h1,
                h2,
                h3,
                h4,
                h5,
                h6 {
                  &:not(:first-child) {
                    margin-top: var(--space--6);
                  }
                }

                h1 {
                  color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--300);
                  }
                }

                h2,
                h3,
                h4,
                h5,
                h6 {
                  color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--300);
                  }
                }

                h1,
                h2,
                h3 {
                  font-size: var(--font-size--base);
                  line-height: var(--line-height--base);
                }

                h1,
                h4,
                h5,
                h6 {
                  font-weight: var(--font-weight--bold);
                }

                h2 {
                  font-style: italic;
                }

                b,
                strong {
                  font-weight: var(--font-weight--bold);
                  color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--300);
                  }
                }

                i,
                em {
                  font-style: italic;
                  color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--300);
                  }
                }

                a {
                  text-decoration: underline;
                  color: var(--color--blue--600);
                  &:hover,
                  &:focus-within {
                    color: var(--color--blue--500);
                  }
                  &:active {
                    color: var(--color--blue--700);
                  }
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--blue--500);
                    &:hover,
                    &:focus-within {
                      color: var(--color--blue--400);
                    }
                    &:active {
                      color: var(--color--blue--600);
                    }
                  }
                  transition-property: var(--transition-property--colors);
                  transition-duration: var(--transition-duration--150);
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
                  cursor: pointer;
                }

                pre {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  overflow-x: auto;
                  background-color: var(--color--white);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--700);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);

                  code {
                    overflow-wrap: normal;
                  }
                }

                code,
                tt,
                kbd,
                samp {
                  font-family: var(--font-family--monospace);
                }

                del {
                  text-decoration: line-through;
                  color: var(--color--rose--900);
                  background-color: var(--color--rose--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--rose--100);
                    background-color: var(--color--rose--800);
                  }
                }

                ins {
                  color: var(--color--green--900);
                  background-color: var(--color--green--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--green--100);
                    background-color: var(--color--green--800);
                  }
                }

                sup,
                sub {
                  position: relative;
                  font-size: var(--font-size--xs);
                  line-height: 0;
                  vertical-align: baseline;
                }

                sup {
                  top: var(--space---1);
                }

                sub {
                  bottom: var(--space---1);
                }

                img {
                  background-color: var(--color--white);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--100);
                    filter: brightness(var(--brightness--90));
                  }
                  max-width: 100%;
                  height: auto;
                  border-radius: var(--border-radius--xl);
                }

                hr {
                  margin: var(--space--4) var(--space--0);
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--600);
                  }
                }

                p,
                ol,
                ul,
                dt {
                  &:not(:first-child) {
                    margin-top: var(--space--2);
                  }
                }

                pre,
                div,
                table,
                blockquote,
                figure,
                dl,
                details,
                .rehype-shiki,
                .math-display {
                  &:not(:first-child) {
                    margin-top: var(--space--4);
                  }
                }

                ol {
                  padding-left: var(--space--8);
                  & > li {
                    list-style: decimal;
                    &::marker {
                      color: var(--color--gray--medium--500);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--gray--medium--500);
                      }
                    }
                  }
                }

                ul {
                  padding-left: var(--space--8);
                  & > li {
                    list-style: disc;
                    &::marker {
                      color: var(--color--gray--medium--500);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--gray--medium--500);
                      }
                    }
                  }
                }

                table {
                  border-collapse: collapse;
                  display: block;
                  overflow-x: auto;
                  caption {
                    font-style: italic;
                  }
                  th,
                  td {
                    padding: var(--space--1) var(--space--3);
                    border-bottom: var(--border-width--1) solid
                      var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                  }
                  th {
                    font-weight: var(--font-weight--bold);
                    color: var(--color--gray--medium--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--300);
                    }
                  }
                }

                blockquote {
                  font-style: italic;
                  padding-left: var(--space--8);
                  position: relative;
                  z-index: var(--z-index--0);
                  &::before {
                    content: "“";
                    font-size: var(--font-size--7xl);
                    line-height: var(--line-height--7xl);
                    color: var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--800);
                    }
                    display: block;
                    position: absolute;
                    left: var(--space---2);
                    top: var(--space---3);
                    z-index: var(--z-index---1);
                  }
                }

                dl {
                  dt {
                    font-weight: var(--font-weight--bold);
                    color: var(--color--gray--medium--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--300);
                    }
                  }
                  dd {
                    padding-left: var(--space--4);
                  }
                }

                var {
                  font-style: italic;
                }

                s,
                strike {
                  text-decoration: line-through;
                }

                details {
                  padding: var(--space--2) var(--space--4);
                  background-color: var(--color--white);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--700);
                  }
                  border-radius: var(--border-radius--md);
                  summary {
                    cursor: pointer;
                    &::before {
                      content: "\\f275";
                      font-family: bootstrap-icons !important;
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      margin-right: var(--space--2);
                    }
                  }
                  &[open] > summary {
                    padding-bottom: var(--space--4);
                    border-bottom: var(--border-width--1) solid
                      var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                    margin-bottom: var(--space--4);
                    &::before {
                      content: "\\f273";
                    }
                  }
                }

                figure {
                  figcaption {
                    font-style: italic;
                  }
                }

                abbr {
                  text-decoration: underline dotted;
                  cursor: help;
                }

                dfn {
                  font-weight: var(--font-weight--bold);
                }

                mark {
                  color: var(--color--yellow--900);
                  background-color: var(--color--yellow--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--yellow--100);
                    background-color: var(--color--yellow--800);
                  }
                }

                small {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                }

                input[type="checkbox"] {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  color: var(--color--transparent);
                  width: var(--space--4);
                  height: var(--space--4);
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--600);
                  }
                  border-radius: var(--border-radius--base);
                  margin-right: var(--space--0-5);
                  position: relative;
                  bottom: var(--space---0-5);
                  display: inline-flex;
                  justify-content: center;
                  align-items: center;
                  &::before {
                    content: "\\f633";
                    font-family: bootstrap-icons !important;
                  }
                  &:checked {
                    color: var(--color--gray--medium--50);
                    background-color: var(--color--gray--medium--700);
                    border-color: var(--color--gray--medium--700);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--200);
                      background-color: var(--color--gray--medium--800);
                      border-color: var(--color--gray--medium--800);
                    }
                  }
                }

                .katex {
                  overflow: auto;
                }
              }

              .dark {
                display: none;
              }
              @media (prefers-color-scheme: dark) {
                .light {
                  display: none;
                }
                .dark {
                  display: block;
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
    applicationBase: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      extraHeaders?: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.applicationBase = ({
    req,
    res,
    head,
    extraHeaders = html``,
    body,
  }) => {
    const flash = app.locals.helpers.flash.get(req, res);
    return app.locals.layouts.base({
      req,
      res,
      head,
      body: html`
        <div
          style="${css`
            ${res.locals.enrollment === undefined
              ? css``
              : css`
                  border-top: var(--border-width--8) solid
                    var(--color--${res.locals.enrollment.accentColor}--500);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(
                      --color--${res.locals.enrollment.accentColor}--600
                    );
                  }
                `}
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
                <div
                  style="${css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                    background-color: var(--color--gray--medium--200);
                    border-bottom: var(--border-width--1) solid
                      var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--color--gray--medium--800);
                      border-color: var(--color--gray--medium--700);
                    }
                    padding: var(--space--0) var(--space--4);
                    display: flex;
                    justify-content: center;
                  `}"
                >
                  <div>
                    <button
                      class="button button--transparent"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: this.nextElementSibling.firstElementChild,
                          trigger: "click",
                          interactive: true,
                        });
                      `}"
                    >
                      <i class="bi bi-easel"></i>
                      Demonstration Mode
                    </button>
                    <div hidden>
                      <div
                        style="${css`
                          padding: var(--space--2);
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--4);
                        `}"
                      >
                        <p>
                          CourseLore is running in Demonstration Mode. All data
                          may be lost, including courses, conversations, users,
                          and so forth. Also, no emails are actually sent.
                        </p>
                        <p>
                          To give you a better idea of what CourseLore looks
                          like in use, you may create demonstration data.
                        </p>
                        <form
                          method="POST"
                          action="${app.locals.settings.url}/demonstration-data"
                        >
                          <button
                            class="button button--blue"
                            style="${css`
                              width: 100%;
                            `}"
                          >
                            <i class="bi bi-easel"></i>
                            Create Demonstration Data
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                  $${app.locals.settings.env === "production"
                    ? html``
                    : html`
                        <form
                          method="POST"
                          action="${app.locals.settings
                            .url}/turn-off?_method=DELETE"
                        >
                          <button class="button button--transparent">
                            <i class="bi bi-power"></i>
                            Turn off
                          </button>
                        </form>
                      `}
                </div>
              `
            : html``}
          $${extraHeaders}
          $${flash === undefined
            ? html``
            : html`
                <div
                  class="flash"
                  style="${css`
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }
                    ${["green", "rose"].map(
                      (color) => css`
                        .flash--${color} {
                          &,
                          & + .button--transparent {
                            color: var(--color--${color}--700);
                          }
                          background-color: var(--color--${color}--100);
                          & + .button--transparent {
                            &:hover,
                            &:focus-within {
                              background-color: var(--color--${color}--200);
                            }
                            &:active {
                              background-color: var(--color--${color}--300);
                            }
                          }
                          @media (prefers-color-scheme: dark) {
                            &,
                            & + .button--transparent {
                              color: var(--color--${color}--200);
                            }
                            background-color: var(--color--${color}--900);
                            & + .button--transparent {
                              &:hover,
                              &:focus-within {
                                background-color: var(--color--${color}--800);
                              }
                              &:active {
                                background-color: var(--color--${color}--700);
                              }
                            }
                          }
                          padding: var(--space--1) var(--space--10);
                          display: flex;
                          justify-content: center;
                          & > * {
                            flex: 1;
                            max-width: var(--width--prose);
                          }
                        }
                      `
                    )}
                  `}"
                >
                  $${flash}
                  <button
                    class="button button--icon button--transparent"
                    style="${css`
                      justify-self: end;
                      align-self: start;
                      margin-top: var(--space--0-5);
                      margin-right: var(--space--3);
                    `}"
                    onclick="${javascript`
                      this.closest(".flash").remove();
                    `}"
                  >
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              `}

          <div
            style="${css`
              flex: 1;
              overflow: auto;
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });
  };

  interface Layouts {
    box: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        (IsSignedOutMiddlewareLocals | IsSignedInMiddlewareLocals) &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.box = ({ req, res, head, body }) =>
    app.locals.layouts.applicationBase({
      req,
      res,
      head,
      body: html`
        <div
          style="${css`
            min-width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          `}"
        >
          <div
            style="${css`
              flex: 1;
              max-width: var(--width--sm);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--8);
            `}"
          >
            <div
              style="${css`
                display: flex;
                justify-content: center;
              `}"
            >
              <a
                href="${app.locals.settings.url}/"
                class="heading--display button button--transparent"
              >
                $${app.locals.partials.logo} CourseLore
              </a>
            </div>
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
    });

  interface Layouts {
    application: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        IsSignedInMiddlewareLocals &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        IsSignedInMiddlewareLocals &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      extraHeaders?: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.application = ({
    req,
    res,
    head,
    extraHeaders = html``,
    body,
  }) =>
    app.locals.layouts.applicationBase({
      req,
      res,
      head,
      extraHeaders: html`
        <div
          style="${css`
            background-color: var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--800);
            }
            padding: var(--space--1) var(--space--3);
            display: flex;
            justify-content: space-between;
          `}"
        >
          <div
            style="${css`
              flex: 1;
              display: flex;
              align-items: center;
              min-width: var(--width--0);
            `}"
          >
            <a
              href="${app.locals.settings.url}/"
              class="button button--icon button--transparent"
            >
              $${app.locals.partials.logo}
            </a>

            $${res.locals.course === undefined
              ? html``
              : html`
                  <div
                    style="${css`
                      flex: 1;
                      min-width: var(--width--0);
                    `}"
                  >
                    <button
                      class="button button--transparent strong"
                      style="${css`
                        max-width: 100%;
                      `}"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: this.nextElementSibling.firstElementChild,
                          trigger: "click",
                          interactive: true,
                        });
                      `}"
                    >
                      <i class="bi bi-journal-text"></i>
                      <span
                        style="${css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        `}"
                      >
                        ${res.locals.course.name}
                      </span>
                      <i class="bi bi-chevron-down"></i>
                    </button>
                    <div hidden>
                      <div
                        style="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div class="dropdown-menu">
                          <h3 class="dropdown-menu--item heading">
                            <i class="bi bi-journal-text"></i>
                            ${res.locals.course.name}
                          </h3>
                          <a
                            href="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}"
                            class="dropdown-menu--item button button--transparent ${req.path.includes(
                              "settings"
                            )
                              ? ""
                              : "active"}"
                          >
                            <i class="bi bi-chat-left-text"></i>
                            Conversations
                          </a>
                          <a
                            href="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/settings"
                            class="dropdown-menu--item button button--transparent ${req.path.includes(
                              "settings"
                            )
                              ? "active"
                              : ""}"
                          >
                            <i class="bi bi-sliders"></i>
                            Course Settings
                          </a>
                        </div>
                        $${res.locals.otherEnrollments!.length === 0
                          ? html``
                          : html`
                              <div class="dropdown-menu">
                                <p class="dropdown-menu--item heading">
                                  <i class="bi bi-arrow-left-right"></i>
                                  Switch to Another Course
                                </p>
                                $${res.locals.otherEnrollments!.map(
                                  (otherEnrollment) => html`
                                    <a
                                      href="${app.locals.settings
                                        .url}/courses/${otherEnrollment.course
                                        .reference}"
                                      class="dropdown-menu--item button button--transparent"
                                    >
                                      <div
                                        class="button button--icon"
                                        style="${css`
                                          color: var(
                                            --color--${otherEnrollment.accentColor}--600
                                          );
                                          background-color: var(
                                            --color--${otherEnrollment.accentColor}--100
                                          );
                                          @media (prefers-color-scheme: dark) {
                                            color: var(
                                              --color--${otherEnrollment.accentColor}--500
                                            );
                                            background-color: var(
                                              --color--${otherEnrollment.accentColor}--800
                                            );
                                          }
                                        `}"
                                      >
                                        <i class="bi bi-journal-text"></i>
                                      </div>
                                      ${otherEnrollment.course.name}
                                    </a>
                                  `
                                )}
                              </div>
                            `}
                      </div>
                    </div>
                  </div>
                `}
          </div>
          <div
            style="${css`
              font-size: var(--font-size--xl);
              line-height: var(--line-height--xl);
              display: flex;
              gap: var(--space--1);
              align-items: center;
            `}"
          >
            <div>
              <button
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                  tippy(this, {
                    content: ${JSON.stringify(
                      res.locals.invitations!.length === 0
                        ? "Add"
                        : `${
                            res.locals.invitations!.length
                          } pending invitation${
                            res.locals.invitations!.length === 1 ? "" : "s"
                          }`
                    )},
                    touch: false,
                  });
                  tippy(this, {
                    content: this.nextElementSibling.firstElementChild,
                    trigger: "click",
                    interactive: true,
                  });
                `}"
              >
                <div
                  $${res.locals.invitations!.length === 0
                    ? html``
                    : html`class="notification-indicator"`}
                >
                  <i class="bi bi-plus-circle"></i>
                </div>
              </button>
              <div hidden>
                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  $${res.locals.invitations!.length === 0
                    ? html``
                    : html`
                        <div class="dropdown-menu">
                          <h3 class="dropdown-menu--item heading">
                            <i class="bi bi-journal-arrow-down"></i>
                            Invitations
                          </h3>
                          $${res.locals.invitations!.map(
                            (invitation) => html`
                              <a
                                href="${app.locals.settings
                                  .url}/courses/${invitation.course
                                  .reference}/invitations/${invitation.reference}"
                                class="dropdown-menu--item button button--transparent"
                              >
                                <i class="bi bi-journal-arrow-down"></i>
                                Enroll in ${invitation.course.name} as
                                ${lodash.capitalize(invitation.role)}
                              </a>
                            `
                          )}
                        </div>
                      `}
                  <div class="dropdown-menu">
                    <button
                      class="dropdown-menu--item button button--transparent"
                      data-ondomcontentloaded="${javascript`
                      tippy(this, {
                        content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                        trigger: "click",
                      });
                    `}"
                    >
                      <i class="bi bi-journal-arrow-down"></i>
                      Enroll in an Existing Course
                    </button>
                    <a
                      href="${app.locals.settings.url}/courses/new"
                      class="dropdown-menu--item button button--transparent"
                    >
                      <i class="bi bi-journal-plus"></i>
                      Create a New Course
                    </a>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <button
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                  tippy(this, {
                    content: ${JSON.stringify(res.locals.user.name)},
                    touch: false,
                  });
                  tippy(this, {
                    content: this.nextElementSibling.firstElementChild,
                    trigger: "click",
                    interactive: true,
                  });
                `}"
              >
                $${res.locals.user.avatar === null
                  ? html`<i class="bi bi-person-circle"></i>`
                  : html`
                      <img
                        src="${res.locals.user.avatar}"
                        alt="${res.locals.user.name}"
                        class="avatar"
                        style="${css`
                          width: var(--font-size--xl);
                          height: var(--font-size--xl);
                        `}"
                      />
                    `}
              </button>
              <div hidden>
                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                  `}"
                >
                  <div
                    style="${css`
                      padding: var(--space--0) var(--space--2);
                    `}"
                  >
                    <p class="strong">${res.locals.user.name}</p>
                    <p class="secondary">${res.locals.user.email}</p>
                  </div>
                  <div class="dropdown-menu">
                    <a
                      class="dropdown-menu--item button button--transparent"
                      href="${app.locals.settings.url}/settings"
                    >
                      <i class="bi bi-sliders"></i>
                      User Settings
                    </a>
                    <form
                      method="POST"
                      action="${app.locals.settings
                        .url}/sign-out?_method=DELETE"
                    >
                      <button
                        class="dropdown-menu--item button button--transparent"
                      >
                        <i class="bi bi-box-arrow-right"></i>
                        Sign Out
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        $${extraHeaders}
      `,
      body,
    });

  interface Layouts {
    main: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        IsSignedInMiddlewareLocals &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        IsSignedInMiddlewareLocals &
          Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.main = ({ req, res, head, body }) =>
    app.locals.layouts.application({
      req,
      res,
      head,
      body: html`
        <div
          style="${css`
            display: flex;
            justify-content: center;
          `}"
        >
          <div
            style="${css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              padding: var(--space--4);
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  interface Partials {
    logo: HTML;
  }
  app.locals.partials.logo = (() => {
    // https://www.youtube.com/watch?v=dSK-MW-zuAc
    const order = 2;
    const size = 20;
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
    for (let orderIndex = 2; orderIndex <= order; orderIndex++) {
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
    const pointsSvg = points.map((point) =>
      point.map((coordinate) => coordinate * size).join(" ")
    );
    return html`
      <svg width="${size}" height="${size}">
        <path
          d="M ${pointsSvg[0]} ${pointsSvg
            .slice(1)
            .map((pointSvg) => `L ${pointSvg}`)
            .join(" ")} Z"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  })();

  app.use(express.static(path.join(__dirname, "../static")));
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
      sameSite: true,
      secure: true,
    };
  };
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: true }));
  // TODO: Make this secure: https://github.com/richardgirges/express-fileupload
  app.use(expressFileUpload({ createParentPath: true }));

  app.get<{}, any, {}, {}, {}>("/live-reload", (req, res, next) => {
    if (!app.locals.settings.liveReload) return next();
    // FIXME: https://github.com/caddyserver/caddy/issues/4247
    res.type("text/event-stream").write(":\n\n");
  });

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
      // FIXME: https://github.com/caddyserver/caddy/issues/4247
      res.type("text/event-stream").write(":\n\n");
    },
  ];

  // TODO: Periodic jobs to clean stale sessions & flashes.

  interface Helpers {
    session: {
      maxAge: number;
      open: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>,
        userId: number
      ) => void;
      get: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>
      ) => number | undefined;
      close: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>
      ) => void;
    };
  }
  app.locals.helpers.session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open(req, res, userId) {
      const session = app.locals.database.get<{
        token: string;
      }>(
        sql`
          INSERT INTO "sessions" ("token", "user")
          VALUES (
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })},
            ${userId}
          )
          RETURNING *
        `
      )!;
      res.cookie("session", session.token, {
        ...app.locals.settings.cookieOptions(),
        maxAge: app.locals.helpers.session.maxAge,
      });
    },

    get(req, res) {
      if (req.cookies.session === undefined) return;
      const session = app.locals.database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() +
          app.locals.helpers.session.maxAge <
          Date.now()
      )
        app.locals.helpers.session.close(req, res);
      else if (
        new Date(session.createdAt).getTime() +
          app.locals.helpers.session.maxAge / 2 <
        Date.now()
      ) {
        app.locals.helpers.session.close(req, res);
        app.locals.helpers.session.open(req, res, session.user);
      }
      return session?.user;
    },

    close(req, res) {
      app.locals.database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      res.clearCookie("session", app.locals.settings.cookieOptions());
    },
  };

  interface Helpers {
    flash: {
      set: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>,
        content: HTML
      ) => void;
      get: (
        req: express.Request<{}, any, {}, {}, {}>,
        res: express.Response<any, {}>
      ) => HTML | undefined;
    };
  }
  app.locals.helpers.flash = {
    set(req, res, content) {
      const flash = app.locals.database.get<{ nonce: string }>(
        sql`
          INSERT INTO "flashes" ("nonce", "content")
          VALUES (
            ${cryptoRandomString({ length: 10, type: "alphanumeric" })},
            ${content}
          )
          RETURNING *
        `
      )!;
      res.cookie("flash", flash.nonce, {
        ...app.locals.settings.cookieOptions(),
        maxAge: 5 * 60 * 1000,
      });
    },

    get(req, res) {
      const flash = app.locals.database.get<{
        content: HTML;
      }>(
        sql`SELECT "content" FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      app.locals.database.run(
        sql`DELETE FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      res.clearCookie("flash", app.locals.settings.cookieOptions());
      return flash?.content;
    },
  };

  interface Middlewares {
    isSignedOut: express.RequestHandler<
      {},
      any,
      {},
      {},
      IsSignedOutMiddlewareLocals
    >[];
  }
  interface IsSignedOutMiddlewareLocals {}
  app.locals.middlewares.isSignedOut = [
    (req, res, next) => {
      if (app.locals.helpers.session.get(req, res) !== undefined)
        return next("route");
      next();
    },
  ];

  interface Middlewares {
    isSignedIn: express.RequestHandler<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals
    >[];
  }
  interface IsSignedInMiddlewareLocals {
    user: {
      id: number;
      email: string;
      name: string;
      avatar: string | null;
      biography: string | null;
    };
    invitations: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
      };
      reference: string;
      role: Role;
    }[];
    enrollments: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        nextConversationReference: number;
      };
      reference: string;
      role: Role;
      accentColor: AccentColor;
    }[];
  }
  app.locals.middlewares.isSignedIn = [
    (req, res, next) => {
      const userId = app.locals.helpers.session.get(req, res);
      if (userId === undefined) return next("route");

      res.locals.user = app.locals.database.get<{
        id: number;
        email: string;
        name: string;
        avatar: string | null;
        biography: string | null;
      }>(
        sql`
          SELECT "id", "email", "name", "avatar", "biography"
          FROM "users"
          WHERE "id" = ${userId}
        `
      )!;

      res.locals.invitations = app.locals.database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          reference: string;
          role: Role;
        }>(
          sql`
            SELECT "invitations"."id",
                  "courses"."id" AS "courseId",
                  "courses"."reference" AS "courseReference",
                  "courses"."name" AS "courseName",
                  "invitations"."reference",
                  "invitations"."role"
            FROM "invitations"
            JOIN "courses" ON "invitations"."course" = "courses"."id"
            WHERE "invitations"."usedAt" IS NULL AND (
                    "invitations"."expiresAt" IS NULL OR
                    CURRENT_TIMESTAMP < datetime("invitations"."expiresAt") 
                  ) AND
                  "invitations"."email" = ${res.locals.user.email}
            ORDER BY "invitations"."id" DESC
          `
        )
        .map((invitation) => ({
          id: invitation.id,
          course: {
            id: invitation.courseId,
            reference: invitation.courseReference,
            name: invitation.courseName,
          },
          reference: invitation.reference,
          role: invitation.role,
        }));

      res.locals.enrollments = app.locals.database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseNextConversationReference: number;
          reference: string;
          role: Role;
          accentColor: AccentColor;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
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
            nextConversationReference:
              enrollment.courseNextConversationReference,
          },
          reference: enrollment.reference,
          role: enrollment.role,
          accentColor: enrollment.accentColor,
        }));

      next();
    },
  ];

  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/",
    ...app.locals.middlewares.isSignedOut,
    (req, res) => {
      res.redirect(`${app.locals.settings.url}/sign-in`);
    }
  );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/sign-in", ...app.locals.middlewares.isSignedOut, (req, res) => {
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>Sign in · CourseLore · The Open-Source Student Forum</title>
        `,
        body: html`
          <form
            method="POST"
            action="${app.locals.settings.url}/sign-in?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <label class="label">
              <p class="label--text">Email</p>
              <input
                type="email"
                name="email"
                placeholder="you@educational-institution.edu"
                value="${req.query.email ?? ""}"
                required
                autofocus
                class="input--text"
                data-skip-is-modified="true"
            /></label>
            <label class="label">
              <p class="label--text">Password</p>
              <input
                type="password"
                name="password"
                required
                class="input--text"
                data-skip-is-modified="true"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-box-arrow-in-right"></i>
              Sign in
            </button>
          </form>
          <p class="text">
            Don’t have an account?
            <a
              href="${app.locals.settings.url}/sign-up?${qs.stringify({
                redirect: req.query.redirect,
                name: req.query.name,
                email: req.query.email,
              })}"
              >Sign up</a
            >.
          </p>
        `,
      })
    );
  });

  app.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-in",
    ...app.locals.middlewares.isSignedOut,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.email !== "string" ||
        !req.body.email.match(app.locals.constants.emailRegExp) ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === ""
      )
        return next("validation");
      const user = app.locals.database.get<{ id: number; password: string }>(
        sql`SELECT "id", "password" FROM "users" WHERE "email" = ${req.body.email}`
      );
      if (
        user === undefined ||
        !(await argon2.verify(user.password, req.body.password))
      ) {
        app.locals.helpers.flash.set(
          req,
          res,
          html`<div class="flash--rose">Incorrect email & password.</div>`
        );
        return res.redirect(
          `${app.locals.settings.url}/sign-in?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
          })}`
        );
      }
      app.locals.helpers.session.open(req, res, user.id);
      res.redirect(`${app.locals.settings.url}${req.query.redirect ?? "/"}`);
    })
  );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/sign-up", ...app.locals.middlewares.isSignedOut, (req, res) => {
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>Sign up · CourseLore · The Open-Source Student Forum</title>
        `,
        body: html`
          <form
            method="POST"
            action="${app.locals.settings.url}/sign-up?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <label class="label">
              <p class="label--text">Name</p>
              <input
                type="text"
                name="name"
                value="${req.query.name ?? ""}"
                required
                autofocus
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Email</p>
              <input
                type="email"
                name="email"
                placeholder="you@educational-institution.edu"
                value="${req.query.email ?? ""}"
                required
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Password</p>
              <input
                type="password"
                name="password"
                required
                minlength="8"
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Password Confirmation</p>
              <input
                type="password"
                required
                class="input--text"
                data-ondomcontentloaded="${javascript`
                  (this.validators ??= []).push(() => {
                    if (this.value !== this.closest("form").querySelector('[name="password"]').value)
                      return "Password & Password Confirmation don’t match.";
                  });
                `}"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-person-plus"></i>
              Sign up
            </button>
          </form>
          <p class="text">
            Already have an account account?
            <a
              href="${app.locals.settings.url}/sign-in?${qs.stringify({
                redirect: req.query.redirect,
                name: req.query.name,
                email: req.query.email,
              })}"
              >Sign in</a
            >.
          </p>
        `,
      })
    );
  });

  app.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-up",
    ...app.locals.middlewares.isSignedOut,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        typeof req.body.email !== "string" ||
        !req.body.email.match(app.locals.constants.emailRegExp) ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");
      if (
        app.locals.database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1 FROM "users" WHERE "email" = ${req.body.email}
            ) AS "exists";
          `
        )!.exists === 1
      ) {
        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--rose">
              This email is already registered. Sign in instead.
            </div>
          `
        );
        return res.redirect(
          `${app.locals.settings.url}/sign-in?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
          })}`
        );
      }
      const user = app.locals.database.get<{ id: number }>(
        sql`
          INSERT INTO "users" ("name", "email", "password")
          VALUES (
            ${req.body.name},
            ${req.body.email},
            ${await argon2.hash(req.body.password, {
              type: argon2.argon2id,
              memoryCost: 15 * 2 ** 10,
              timeCost: 2,
              parallelism: 1,
            })}
          )
          RETURNING *
        `
      )!;
      app.locals.helpers.session.open(req, res, user.id);
      res.redirect(`${app.locals.settings.url}${req.query.redirect ?? "/"}`);
    })
  );

  app.delete<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/sign-out",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      app.locals.helpers.session.close(req, res);
      res.redirect(`${app.locals.settings.url}/`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          res.send(
            app.locals.layouts.main({
              req,
              res,
              head: html`<title>CourseLore</title>`,
              body: html`
                <div
                  style="${css`
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `}"
                >
                  <h2 class="heading--display">Welcome to CourseLore!</h2>

                  <div
                    class="decorative-icon"
                    style="${css`
                      svg {
                        transform: scale(7);
                      }
                    `}"
                  >
                    $${app.locals.partials.logo}
                  </div>

                  <div
                    style="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--4);
                    `}"
                  >
                    <button
                      class="button button--blue"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                          trigger: "click",
                        });
                      `}"
                    >
                      <i class="bi bi-journal-arrow-down"></i>
                      Enroll in an Existing Course
                    </button>
                    <a
                      href="${app.locals.settings.url}/courses/new"
                      class="button button--transparent"
                    >
                      <i class="bi bi-journal-plus"></i>
                      Create a New Course
                    </a>
                    <a
                      href="${app.locals.settings.url}/settings"
                      class="button button--transparent"
                    >
                      <i class="bi bi-person-circle"></i>
                      Fill in Your User Profile
                    </a>
                  </div>
                </div>
              `,
            })
          );
          break;

        case 1:
          res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
            app.locals.layouts.main({
              req,
              res,
              head: html`<title>CourseLore</title>`,
              body: html`
                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  <h2 class="heading">
                    <i class="bi bi-journal-text"></i>
                    Your Courses
                  </h2>

                  <div
                    style="${css`
                      margin-left: var(--space---2);
                      display: flex;
                      flex-direction: column;
                      align-items: start;
                      gap: var(--space--1);
                    `}"
                  >
                    $${res.locals.enrollments.map(
                      (enrollment) =>
                        html`
                          <a
                            href="${app.locals.settings
                              .url}/courses/${enrollment.course.reference}"
                            class="button button--icon button--transparent"
                          >
                            <div
                              class="button button--icon"
                              style="${css`
                                color: var(
                                  --color--${enrollment.accentColor}--600
                                );
                                background-color: var(
                                  --color--${enrollment.accentColor}--100
                                );
                                @media (prefers-color-scheme: dark) {
                                  color: var(
                                    --color--${enrollment.accentColor}--500
                                  );
                                  background-color: var(
                                    --color--${enrollment.accentColor}--800
                                  );
                                }
                              `}"
                            >
                              <i class="bi bi-journal-text"></i>
                            </div>
                            ${enrollment.course.name}
                          </a>
                        `
                    )}
                  </div>
                </div>
              `,
            })
          );
          break;
      }
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.main({
          req,
          res,
          head: html`<title>User Settings · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                User Settings
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/settings?_method=PATCH"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <div
                  style="${css`
                    display: flex;
                    gap: var(--space--4);
                    @media (max-width: 400px) {
                      flex-direction: column;
                    }
                  `}"
                >
                  <div
                    style="${css`
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      & > * {
                        width: var(--space--32);
                        height: var(--space--32);
                      }
                    `}"
                  >
                    <div
                      class="avatar--empty"
                      $${res.locals.user.avatar === null
                        ? html``
                        : html`hidden`}
                    >
                      <button
                        type="button"
                        class="button decorative-icon"
                        style="${css`
                          font-size: var(--font-size--8xl);
                          line-height: var(--line-height--8xl);
                          width: 100%;
                          height: 100%;
                          &:hover,
                          &:focus-within {
                            color: var(--color--gray--medium--400);
                          }
                          &:active {
                            color: var(--color--gray--medium--500);
                          }
                          @media (prefers-color-scheme: dark) {
                            &:hover,
                            &:focus-within {
                              color: var(--color--gray--medium--500);
                            }
                            &:active {
                              color: var(--color--gray--medium--400);
                            }
                          }
                        `}"
                        data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Add Avatar",
                            touch: false,
                          });
                        `}"
                        onclick="${javascript`
                          this.closest("form").querySelector(".avatar--upload").click();
                        `}"
                      >
                        <i class="bi bi-person-circle"></i>
                      </button>
                    </div>
                    <div
                      class="avatar--filled"
                      $${res.locals.user.avatar === null
                        ? html`hidden`
                        : html``}
                      style="${css`
                        display: grid;
                        & > * {
                          grid-area: 1 / 1;
                          position: relative;
                        }
                      `}"
                    >
                      <button
                        type="button"
                        class="button"
                        style="${css`
                          padding: var(--space--0);
                          place-self: center;
                          transition-property: var(--transition-property--base);
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--in-out
                          );
                          &:hover,
                          &:focus-within {
                            filter: brightness(var(--brightness--105));
                          }
                          &:active {
                            filter: brightness(var(--brightness--95));
                          }
                        `}"
                        data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Change Avatar",
                            touch: false,
                          });
                        `}"
                        onclick="${javascript`
                          this.closest("form").querySelector(".avatar--upload").click();
                        `}"
                      >
                        <img
                          src="${res.locals.user.avatar ?? ""}"
                          alt="Avatar"
                          class="avatar"
                          style="${css`
                            width: 100%;
                            height: 100%;
                          `}"
                        />
                      </button>
                      <button
                        type="button"
                        class="button button--rose"
                        style="${css`
                          place-self: end;
                          width: var(--font-size--2xl);
                          height: var(--font-size--2xl);
                          padding: var(--space--0);
                          border-radius: var(--border-radius--circle);
                          margin-right: var(--space--2);
                        `}"
                        data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Remove Avatar",
                            theme: "rose",
                            touch: false,
                          });
                        `}"
                        onclick="${javascript`
                          const form = this.closest("form");
                          const avatar = form.querySelector('[name="avatar"]')
                          avatar.value = "";
                          avatar.dataset.forceIsModified = true;
                          form.querySelector(".avatar--empty").hidden = false;
                          form.querySelector(".avatar--filled").hidden = true;
                        `}"
                      >
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <input
                      type="file"
                      class="avatar--upload"
                      accept="image/*"
                      autocomplete="off"
                      hidden
                      onchange="${javascript`
                        (async () => {
                          // TODO: Give some visual indication of progress.
                          // TODO: Work with drag-and-drop.
                          const body = new FormData();
                          body.append("avatar", this.files[0]);
                          this.value = "";
                          const avatarURL = await (await fetch("${app.locals.settings.url}/settings/avatar", {
                            method: "POST",
                            body,
                          })).text();
                          const form = this.closest("form");
                          const avatar = form.querySelector('[name="avatar"]')
                          avatar.value = avatarURL;
                          avatar.dataset.forceIsModified = true;
                          form.querySelector(".avatar--empty").hidden = true;
                          const avatarFilled = form.querySelector(".avatar--filled");
                          avatarFilled.hidden = false;
                          avatarFilled.querySelector("img").setAttribute("src", avatarURL);
                        })();
                      `}"
                    />
                    <input
                      type="hidden"
                      name="avatar"
                      value="${res.locals.user.avatar ?? ""}"
                    />
                  </div>

                  <div
                    style="${css`
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--4);
                    `}"
                  >
                    <label class="label">
                      <p class="label--text">Name</p>
                      <input
                        type="text"
                        name="name"
                        value="${res.locals.user.name}"
                        required
                        class="input--text"
                      />
                    </label>

                    <label class="label">
                      <p class="label--text">Email</p>
                      <span
                        tabindex="0"
                        data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Your email is your identity in CourseLore and may not be changed.",
                          });
                        `}"
                      >
                        <input
                          type="email"
                          value="${res.locals.user.email}"
                          class="input--text"
                          disabled
                        />
                      </span>
                    </label>
                  </div>
                </div>

                <div class="label">
                  <p class="label--text">Biography</p>
                  $${app.locals.partials.textEditor({
                    name: "biography",
                    value: res.locals.user.biography ?? "",
                    required: false,
                  })}
                </div>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-pencil"></i>
                    Update User Settings
                  </button>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    { name?: string; avatar?: string; biography?: string },
    {},
    IsSignedInMiddlewareLocals
  >("/settings", ...app.locals.middlewares.isSignedIn, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      typeof req.body.avatar !== "string" ||
      typeof req.body.biography !== "string"
    )
      return next("validation");

    app.locals.database.run(
      sql`
          UPDATE "users"
          SET "name" = ${req.body.name},
              "avatar" = ${
                req.body.avatar.trim() === "" ? null : req.body.avatar
              },
              "biography" = ${
                req.body.biography.trim() === "" ? null : req.body.biography
              }
          WHERE "id" = ${res.locals.user.id}
        `
    );

    app.locals.helpers.flash.set(
      req,
      res,
      html`
        <div class="flash--green">User settings updated successfully.</div>
      `
    );

    res.redirect(`${app.locals.settings.url}/settings`);
  });

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/avatar",
    asyncHandler(async (req, res, next) => {
      if (
        req.files?.avatar === undefined ||
        Array.isArray(req.files.avatar) ||
        !req.files.avatar.mimetype.startsWith("image/")
      )
        return next("validation");
      const relativePathOriginal = `files/${cryptoRandomString({
        length: 20,
        type: "numeric",
      })}/${req.files.avatar.name}`;
      await req.files.avatar.mv(path.join(rootDirectory, relativePathOriginal));
      const ext = path.extname(relativePathOriginal);
      const relativePathAvatar = `${relativePathOriginal.slice(
        0,
        -ext.length
      )}--avatar${ext}`;
      await sharp(req.files.avatar.data)
        .resize(/* var(--space--64) */ 256, 256, {
          position: sharp.strategy.attention,
        })
        .toFile(path.join(rootDirectory, relativePathAvatar));
      res.send(`${app.locals.settings.url}/${relativePathAvatar}`);
    })
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/courses/new",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.main({
          req,
          res,
          head: html`<title>Create a New Course · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-journal-plus"></i>
                Create a New Course
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <label class="label">
                  <p class="label--text">Name</p>
                  <input
                    type="text"
                    name="name"
                    class="input--text"
                    required
                    autocomplete="off"
                    autofocus
                  />
                </label>
                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-journal-plus"></i>
                    Create Course
                  </button>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.post<{}, any, { name?: string }, {}, IsSignedInMiddlewareLocals>(
    "/courses",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      const course = app.locals.database.get<{
        id: number;
        reference: string;
      }>(
        sql`
          INSERT INTO "courses" ("reference", "name")
          VALUES (
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${req.body.name}
          )
          RETURNING *
        `
      )!;
      app.locals.database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${app.locals.helpers.defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      res.redirect(`${app.locals.settings.url}/courses/${course.reference}`);
    }
  );

  interface Helpers {
    defaultAccentColor: (
      enrollments: IsSignedInMiddlewareLocals["enrollments"]
    ) => AccentColor;
  }
  app.locals.helpers.defaultAccentColor = (enrollments) => {
    const accentColorsInUse = new Set<AccentColor>(
      enrollments.map((enrollment) => enrollment.accentColor)
    );
    const accentColorsAvailable = new Set<AccentColor>(
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
      { search?: string; tag?: string },
      IsEnrolledInCourseMiddlewareLocals
    >[];
  }
  interface IsEnrolledInCourseMiddlewareLocals
    extends IsSignedInMiddlewareLocals {
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    enrollment: IsSignedInMiddlewareLocals["enrollments"][number];
    otherEnrollments: IsSignedInMiddlewareLocals["enrollments"];
    tags: {
      id: number;
      reference: string;
      name: string;
      visibleBy: TagVisibleBy;
    }[];
    tagFilter?: IsEnrolledInCourseMiddlewareLocals["tags"][number];
    conversations: {
      id: number;
      reference: string;
      title: string;
      nextMessageReference: number;
      pinnedAt: string | null;
      questionAt: string | null;
      createdAt: string;
      updatedAt: string;
      authorEnrollment:
        | {
            id: number;
            user: {
              id: number;
              email: string;
              name: string;
              avatar: string | null;
              biography: string | null;
            };
            reference: string;
            role: Role;
          }
        | AnonymousEnrollment;
      messagesCount: number;
      endorsements: {
        id: number;
        enrollment:
          | {
              id: number;
              user: {
                id: number;
                email: string;
                name: string;
                avatar: string | null;
                biography: string | null;
              };
              reference: string;
              role: Role;
            }
          | AnonymousEnrollment;
      }[];
      likesCount: number;
      taggings: {
        id: number;
        tag: {
          id: number;
          reference: string;
          name: string;
          visibleBy: TagVisibleBy;
        };
      }[];
    }[];
  }
  app.locals.middlewares.isEnrolledInCourse = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      res.locals.otherEnrollments = [];
      for (const enrollment of res.locals.enrollments)
        if (enrollment.course.reference === req.params.courseReference) {
          res.locals.enrollment = enrollment;
          res.locals.course = enrollment.course;
        } else res.locals.otherEnrollments.push(enrollment);
      if (res.locals.enrollment === undefined) return next("route");

      res.locals.tags = app.locals.database.all<{
        id: number;
        reference: string;
        name: string;
        visibleBy: TagVisibleBy;
      }>(
        sql`
          SELECT "id", "reference", "name", "visibleBy"
          FROM "tags"
          WHERE "course" = ${res.locals.course.id}
                $${
                  res.locals.enrollment.role === "student"
                    ? sql`AND "visibleBy" = 'everyone'`
                    : sql``
                }
          ORDER BY "id" ASC
        `
      );

      if (typeof req.query.tag === "string")
        res.locals.tagFilter = res.locals.tags.find(
          (tag) => tag.reference === req.query.tag
        );

      const search =
        req.query.search === undefined
          ? undefined
          : req.query.search
              .split(/\s+/)
              .map((phrase) => `"${phrase.replaceAll('"', '""')}"`)
              .join(" ");

      res.locals.conversations = app.locals.database
        .all<{
          id: number;
          reference: string;
          title: string;
          nextMessageReference: number;
          pinnedAt: string | null;
          questionAt: string | null;
        }>(
          sql`
            SELECT "conversations"."id",
                   "conversations"."reference",
                   "conversations"."title",
                   "conversations"."nextMessageReference",
                   "conversations"."pinnedAt",
                   "conversations"."questionAt"
            FROM "conversations"
            $${
              search === undefined
                ? sql``
                : sql`
                  LEFT JOIN "conversationsSearch" ON "conversations"."id" = "conversationsSearch"."rowid" AND
                                                     "conversationsSearch" MATCH ${search}
                  LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation"
                  LEFT JOIN "messagesSearch" ON "messages"."id" = "messagesSearch"."rowid" AND
                                                "messagesSearch" MATCH ${search}
                `
            }
            $${
              res.locals.tagFilter === undefined
                ? sql``
                : sql`
                    JOIN "taggings" ON "conversations"."id" = "taggings"."conversation"
                  `
            }
            WHERE "conversations"."course" = ${res.locals.course.id}
            $${
              search === undefined
                ? sql``
                : sql`
                  AND (
                    "conversationsSearch"."rank" IS NOT NULL OR
                    "messagesSearch"."rank" IS NOT NULL
                  )
                `
            }
            $${
              res.locals.tagFilter === undefined
                ? sql``
                : sql`
                    AND "taggings"."tag" = ${res.locals.tagFilter.id}
                  `
            }
            GROUP BY "conversations"."id"
            ORDER BY "conversations"."pinnedAt" IS NOT NULL DESC,
                     $${
                       req.query.search === undefined
                         ? sql``
                         : sql`
                            min(coalesce("conversationsSearch"."rank", 0), coalesce(min("messagesSearch"."rank"), 0)) ASC,
                          `
                     }
                     "conversations"."id" DESC
          `
        )
        .map((conversation) => {
          // FIXME: Try to get rid of these n+1 queries.
          const originalMessage = app.locals.database.get<{
            createdAt: string;
            authorEnrollmentId: number | null;
            authorUserId: number | null;
            authorUserEmail: string | null;
            authorUserName: string | null;
            authorUserAvatar: string | null;
            authorUserBiography: string | null;
            authorEnrollmentReference: string | null;
            authorEnrollmentRole: Role | null;
            likesCount: number;
          }>(
            sql`
              SELECT "messages"."createdAt",
                     "authorEnrollment"."id" AS "authorEnrollmentId",
                     "authorUser"."id" AS "authorUserId",
                     "authorUser"."email" AS "authorUserEmail",
                     "authorUser"."name" AS "authorUserName",
                     "authorUser"."avatar" AS "authorUserAvatar",
                     "authorUser"."biography" AS "authorUserBiography",
                     "authorEnrollment"."reference" AS "authorEnrollmentReference",
                     "authorEnrollment"."role" AS "authorEnrollmentRole",
                     COUNT("likes"."id") AS "likesCount"
              FROM "messages"
              LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
              LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
              LEFT JOIN "likes" ON "messages"."id" = "likes"."message"
              WHERE "messages"."conversation" = ${conversation.id} AND
                    "messages"."reference" = ${"1"}
              GROUP BY "messages"."id"
            `
          )!;
          const mostRecentlyUpdatedMessage = app.locals.database.get<{
            updatedAt: string;
          }>(
            sql`
              SELECT "messages"."updatedAt"
              FROM "messages"
              WHERE "messages"."conversation" = ${conversation.id}
              ORDER BY "messages"."updatedAt" DESC
              LIMIT 1
            `
          )!;
          const messagesCount = app.locals.database.get<{
            messagesCount: number;
          }>(
            sql`SELECT COUNT(*) AS "messagesCount" FROM "messages" WHERE "messages"."conversation" = ${conversation.id}`
          )!.messagesCount;
          const endorsements =
            conversation.questionAt === null
              ? []
              : app.locals.database
                  .all<{
                    id: number;
                    enrollmentId: number | null;
                    userId: number | null;
                    userEmail: string | null;
                    userName: string | null;
                    userAvatar: string | null;
                    userBiography: string | null;
                    enrollmentReference: string | null;
                    enrollmentRole: Role | null;
                  }>(
                    sql`
                      SELECT "endorsements"."id",
                            "enrollments"."id" AS "enrollmentId",
                            "users"."id" AS "userId",
                            "users"."email" AS "userEmail",
                            "users"."name" AS "userName",
                            "users"."avatar" AS "userAvatar",
                            "users"."biography" AS "userBiography",      
                            "enrollments"."reference" AS "enrollmentReference",
                            "enrollments"."role" AS "enrollmentRole"
                      FROM "endorsements"
                      JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
                      JOIN "users" ON "enrollments"."user" = "users"."id"
                      JOIN "messages" ON "endorsements"."message" = "messages"."id"
                      WHERE "messages"."conversation" = ${conversation.id}
                      ORDER BY "endorsements"."id" ASC
                    `
                  )
                  .map((endorsement) => ({
                    id: endorsement.id,
                    enrollment:
                      endorsement.enrollmentId !== null &&
                      endorsement.userId !== null &&
                      endorsement.userEmail !== null &&
                      endorsement.userName !== null &&
                      endorsement.enrollmentReference !== null &&
                      endorsement.enrollmentRole !== null
                        ? {
                            id: endorsement.enrollmentId,
                            user: {
                              id: endorsement.userId,
                              email: endorsement.userEmail,
                              name: endorsement.userName,
                              avatar: endorsement.userAvatar,
                              biography: endorsement.userBiography,
                            },
                            reference: endorsement.enrollmentReference,
                            role: endorsement.enrollmentRole,
                          }
                        : app.locals.constants.anonymousEnrollment,
                  }));
          const taggings = app.locals.database
            .all<{
              id: number;
              tagId: number;
              tagReference: string;
              tagName: string;
              tagVisibleBy: TagVisibleBy;
            }>(
              sql`
            SELECT "taggings"."id",
                   "tags"."id" AS "tagId",
                   "tags"."reference" AS "tagReference",
                   "tags"."name" AS "tagName",
                   "tags"."visibleBy" AS "tagVisibleBy"
            FROM "taggings"
            JOIN "tags" ON "taggings"."tag" = "tags"."id"
            WHERE "taggings"."conversation" = ${conversation.id}
            $${
              res.locals.enrollment.role === "student"
                ? sql`AND "tags"."visibleBy" = 'everyone'`
                : sql``
            }
            ORDER BY "tags"."id" ASC
          `
            )
            .map((tagging) => ({
              id: tagging.id,
              tag: {
                id: tagging.tagId,
                reference: tagging.tagReference,
                name: tagging.tagName,
                visibleBy: tagging.tagVisibleBy,
              },
            }));

          return {
            id: conversation.id,
            reference: conversation.reference,
            title: conversation.title,
            nextMessageReference: conversation.nextMessageReference,
            pinnedAt: conversation.pinnedAt,
            questionAt: conversation.questionAt,
            createdAt: originalMessage.createdAt,
            updatedAt: mostRecentlyUpdatedMessage.updatedAt,
            authorEnrollment:
              originalMessage.authorEnrollmentId !== null &&
              originalMessage.authorUserId !== null &&
              originalMessage.authorUserEmail !== null &&
              originalMessage.authorUserName !== null &&
              originalMessage.authorEnrollmentReference !== null &&
              originalMessage.authorEnrollmentRole !== null
                ? {
                    id: originalMessage.authorEnrollmentId,
                    user: {
                      id: originalMessage.authorUserId,
                      email: originalMessage.authorUserEmail,
                      name: originalMessage.authorUserName,
                      avatar: originalMessage.authorUserAvatar,
                      biography: originalMessage.authorUserBiography,
                    },
                    reference: originalMessage.authorEnrollmentReference,
                    role: originalMessage.authorEnrollmentRole,
                  }
                : app.locals.constants.anonymousEnrollment,
            messagesCount,
            endorsements,
            likesCount: originalMessage.likesCount,
            taggings,
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
      if (res.locals.conversations.length === 0)
        return res.send(
          app.locals.layouts.main({
            req,
            res,
            head: html`<title>${res.locals.course.name} · CourseLore</title>`,
            body: html`
              <div
                style="${css`
                  text-align: center;
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  align-items: center;
                `}"
              >
                <h2 class="heading--display">
                  Welcome to ${res.locals.course.name}!
                </h2>

                <div class="decorative-icon">
                  <i class="bi bi-journal-text"></i>
                </div>

                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings/invitations"
                          class="button button--blue"
                        >
                          <i class="bi bi-person-plus"></i>
                          Invite Other People to the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${app.locals.settings.url}/courses/${res.locals.course
                      .reference}/conversations/new"
                    class="button ${res.locals.enrollment.role === "staff"
                      ? "button--transparent"
                      : "button--blue"}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start the First Conversation
                  </a>
                </div>
              </div>
            `,
          })
        );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversations[0].reference}?onlyConversationLayoutSidebarOnSmallScreen=true`
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
      Partial<IsSignedInMiddlewareLocals> {}
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

  interface Layouts {
    courseSettings: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        IsEnrolledInCourseMiddlewareLocals &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.courseSettings = ({ req, res, head, body }) => {
    const menu =
      res.locals.enrollment.role === "staff"
        ? html`
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings"
              class="dropdown-menu--item button button--transparent ${req.path.endsWith(
                "/settings"
              )
                ? "active"
                : ""}"
            >
              <i class="bi bi-sliders"></i>
              Course Settings
            </a>
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/invitations"
              class="dropdown-menu--item button button--transparent ${req.path.endsWith(
                "/settings/invitations"
              )
                ? "active"
                : ""}"
            >
              <i class="bi bi-person-plus"></i>
              Invitations
            </a>
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/enrollments"
              class="dropdown-menu--item button button--transparent ${req.path.endsWith(
                "/settings/enrollments"
              )
                ? "active"
                : ""}"
            >
              <i class="bi bi-people"></i>
              Enrollments
            </a>
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/tags"
              class="dropdown-menu--item button button--transparent ${req.path.endsWith(
                "/settings/tags"
              )
                ? "active"
                : ""}"
            >
              <i class="bi bi-tags"></i>
              Tags
            </a>
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/your-enrollment"
              class="dropdown-menu--item button button--transparent ${req.path.endsWith(
                "/settings/your-enrollment"
              )
                ? "active"
                : ""}"
            >
              <i class="bi bi-person"></i>
              Your Enrollment
            </a>
          `
        : html``;

    return app.locals.layouts.application({
      req,
      res,
      head,
      extraHeaders: html`
        $${res.locals.enrollment.role === "staff"
          ? html`
              <div
                style="${css`
                  background-color: var(--color--gray--medium--200);
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--800);
                    border-color: var(--color--gray--medium--700);
                  }
                  display: flex;
                  justify-content: center;
                  @media (min-width: 700px) {
                    display: none;
                  }
                `}"
              >
                <div
                  style="${css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                    flex: 1;
                    padding: var(--space--0) var(--space--4);
                    display: flex;
                    justify-content: center;
                  `}"
                >
                  <button
                    class="button button--transparent"
                    data-ondomcontentloaded="${javascript`
                      tippy(this, {
                        content: this.nextElementSibling.firstElementChild,
                        trigger: "click",
                        interactive: true,
                      });
                    `}"
                  >
                    <i class="bi bi-sliders"></i>
                    Course Settings
                    <i class="bi bi-chevron-down"></i>
                  </button>
                  <div hidden><div class="dropdown-menu">$${menu}</div></div>
                </div>
              </div>
            `
          : html``}
      `,
      body: html`
        <div
          style="${css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            gap: var(--space--8);
          `}"
        >
          $${res.locals.enrollment.role === "staff"
            ? html`
                <div
                  style="${css`
                    width: var(--space--40);
                    margin-top: var(--space---2);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    @media (max-width: 699px) {
                      display: none;
                    }
                    .dropdown-menu--item {
                      justify-content: start;
                    }
                  `}"
                >
                  $${menu}
                </div>
              `
            : html``}
          <div
            style="${css`
              flex: 1;
              max-width: var(--width--prose);
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });
  };

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Course Settings · ${res.locals.course.name} · CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                Course Settings
              </h2>
              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/settings?_method=PATCH"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <label class="label">
                  <p class="label--text">Name</p>
                  <input
                    type="text"
                    name="name"
                    value="${res.locals.course.name}"
                    required
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-pencil"></i>
                    Update Course Settings
                  </button>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    { name?: string },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      app.locals.database.run(
        sql`UPDATE "courses" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.course.id}`
      );

      app.locals.helpers.flash.set(
        req,
        res,
        html`
          <div class="flash--green">Course settings updated successfully.</div>
        `
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings`
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
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/your-enrollment`
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
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

      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Invitations · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                Course Settings ·
                <i class="bi bi-person-plus"></i>
                Invitations
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/settings/invitations"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <div class="label">
                  <p class="label--text">Type</p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--4);
                    `}"
                  >
                    <label class="label--radio-or-checkbox">
                      <input
                        type="radio"
                        name="type"
                        value="link"
                        required
                        autocomplete="off"
                        class="input--radio"
                        onchange="${javascript`
                          const emails = this.closest("form").querySelector(".emails");
                          emails.hidden = true;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = true;
                        `}"
                      />
                      <i class="bi bi-link"></i>
                      Invitation Link
                    </label>
                    <label class="label--radio-or-checkbox">
                      <input
                        type="radio"
                        name="type"
                        value="email"
                        required
                        autocomplete="off"
                        class="input--radio"
                        onchange="${javascript`
                          const emails = this.closest("form").querySelector(".emails");
                          emails.hidden = false;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = false;
                        `}"
                      />
                      <i class="bi bi-envelope"></i>
                      Email
                    </label>
                  </div>
                </div>

                <div hidden class="emails label">
                  <div class="label--text">
                    Emails
                    <button
                      type="button"
                      class="button button--icon button--icon--inline button--transparent"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: this.nextElementSibling.firstElementChild,
                          trigger: "click",
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                    <div hidden>
                      <div
                        class="text"
                        style="${css`
                          padding: var(--space--2);
                        `}"
                      >
                        <p>
                          Emails must be separated by commas and/or newlines,
                          and may include names which may be quoted or not, for
                          example:
                        </p>
                        <pre><code>${dedent`
                          "Scott" <scott@courselore.org>,
                          Ali <ali@courselore.org>
                          leandro@courselore.org
                        `}</code></pre>
                      </div>
                    </div>
                  </div>
                  <textarea
                    name="emails"
                    required
                    disabled
                    class="input--text"
                    style="${css`
                      padding-right: var(--space--7);
                    `}"
                    data-ondomcontentloaded="${javascript`
                      (this.validators ??= []).push(() => {
                        const emails = [];
                        for (let email of this.value.split(${/[,\n]/})) {
                          email = email.trim();
                          let name = null;
                          const match = email.match(${/^(?<name>.*)<(?<email>.*)>$/});
                          if (match !== null) {
                            email = match.groups.email.trim();
                            name = match.groups.name.trim();
                            if (name.startsWith('"') && name.endsWith('"'))
                              name = name.slice(1, -1);
                            if (name === "") name = null;
                          }
                          if (email === "") continue;
                          emails.push({ email, name });
                        }
                        if (
                          emails.length === 0 ||
                          emails.some(
                            ({ email }) => !email.match(${
                              app.locals.constants.emailRegExp
                            })
                          )
                        )
                          return "Match the requested format.";
                      });
                    `}"
                  ></textarea>
                </div>

                <div class="label">
                  <p class="label--text">Role</p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--4);
                    `}"
                  >
                    $${app.locals.constants.roles.map(
                      (role) =>
                        html`
                          <label class="label--radio-or-checkbox">
                            <input
                              type="radio"
                              name="role"
                              value="${role}"
                              required
                              autocomplete="off"
                              class="input--radio"
                            />
                            ${lodash.capitalize(role)}
                          </label>
                        `
                    )}
                  </div>
                </div>

                <div class="label">
                  <p class="label--text">Expiration</p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--4);
                    `}"
                  >
                    <label class="label--radio-or-checkbox">
                      <input
                        type="radio"
                        name="isExpiresAt"
                        required
                        autocomplete="off"
                        class="input--radio"
                        onchange="${javascript`
                          const expiresAt = this.closest("form").querySelector(".expires-at");
                          expiresAt.hidden = true;
                          for (const element of expiresAt.querySelectorAll("*"))
                            if (element.disabled !== undefined) element.disabled = true;
                        `}"
                      />
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Expire
                    </label>
                    <label class="label--radio-or-checkbox">
                      <input
                        type="radio"
                        name="isExpiresAt"
                        required
                        autocomplete="off"
                        class="input--radio"
                        onchange="${javascript`
                          const expiresAt = this.closest("form").querySelector(".expires-at");
                          expiresAt.hidden = false;
                          for (const element of expiresAt.querySelectorAll("*"))
                            if (element.disabled !== undefined) element.disabled = false;
                        `}"
                      />
                      <i class="bi bi-calendar-plus"></i>
                      Expires
                    </label>
                  </div>
                </div>

                <div hidden class="expires-at label">
                  <div class="label--text">
                    Expires at
                    <button
                      type="button"
                      class="button button--icon button--icon--inline button--transparent"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving change.",
                          trigger: "click",
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </div>
                  <input
                    type="text"
                    name="expiresAt"
                    value="${new Date().toISOString()}"
                    required
                    autocomplete="off"
                    disabled
                    class="input--text"
                    data-ondomcontentloaded="${javascript`
                      localizeTime(this);
                      (this.validators ??= []).push(() => {
                        if (new Date(this.value).getTime() <= Date.now())
                          return "Must be in the future.";
                      });
                    `}"
                  />
                </div>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-person-plus"></i>
                    Create Invitation
                  </button>
                </div>
              </form>

              $${invitations.length === 0
                ? html``
                : html`
                    <hr class="separator" />

                    <div class="stripped">
                      $${invitations.map((invitation) => {
                        const action = `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                        const isExpired = app.locals.helpers.isExpired(
                          invitation.expiresAt
                        );
                        const isUsed = invitation.usedAt !== null;

                        return html`
                          <div
                            style="${css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: baseline;
                            `}"
                          >
                            $${invitation.email === null
                              ? html`<i class="bi bi-link"></i>`
                              : html`<i class="bi bi-envelope"></i>`}
                            <div
                              style="${css`
                                flex: 1;
                              `}"
                            >
                              $${invitation.email === null
                                ? html`
                                    <button
                                      class="button button--transparent strong"
                                      data-ondomcontentloaded="${javascript`
                                        tippy(this, {
                                          content: "See Invitation Link",
                                          touch: false,
                                        });
                                        tippy(this, {
                                          content: this.nextElementSibling.firstElementChild,
                                          trigger: "click",
                                          interactive: true,
                                          maxWidth: "none",
                                        });
                                      `}"
                                    >
                                      ${"*".repeat(
                                        6
                                      )}${invitation.reference.slice(6)}
                                      <i class="bi bi-chevron-down"></i>
                                    </button>
                                    $${(() => {
                                      const link = `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
                                      return html`
                                        <div hidden>
                                          <div
                                            style="${css`
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            $${isExpired
                                              ? html`
                                                  <p
                                                    class="rose"
                                                    style="${css`
                                                      display: flex;
                                                      gap: var(--space--2);
                                                      justify-content: center;
                                                    `}"
                                                  >
                                                    <i
                                                      class="bi bi-calendar-x"
                                                    ></i>
                                                    Expired
                                                  </p>
                                                `
                                              : html``}
                                            <div
                                              style="${css`
                                                display: flex;
                                                gap: var(--space--2);
                                                align-items: center;
                                              `}"
                                            >
                                              <div
                                                style="${css`
                                                  user-select: all;
                                                `}"
                                              >
                                                ${link}
                                              </div>
                                              <button
                                                class="button button--icon button--transparent"
                                                data-ondomcontentloaded="${javascript`
                                                  tippy(this, {
                                                    content: "Copy",
                                                    touch: false,
                                                  });
                                                `}"
                                                onclick="${javascript`
                                                  (async () => {
                                                    await navigator.clipboard.writeText(${JSON.stringify(
                                                      link
                                                    )});
                                                    const classList = this.firstElementChild.classList;
                                                    classList.remove("bi-clipboard");
                                                    classList.add("bi-check-lg");
                                                    await new Promise((resolve) => { window.setTimeout(resolve, 500); });
                                                    classList.remove("bi-check-lg");
                                                    classList.add("bi-clipboard");
                                                  })();
                                                `}"
                                              >
                                                <i class="bi bi-clipboard"></i>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      `;
                                    })()}
                                  `
                                : html`
                                    <button
                                      class="button button--transparent"
                                      data-ondomcontentloaded="${javascript`
                                        tippy(this, {
                                          content: this.nextElementSibling.firstElementChild,
                                          trigger: "click",
                                          interactive: true,
                                        });
                                      `}"
                                    >
                                      <div
                                        style="${css`
                                          display: flex;
                                          flex-direction: column;
                                          align-items: start;
                                        `}"
                                      >
                                        <span class="strong">
                                          ${invitation.name ?? invitation.email}
                                        </span>
                                        $${invitation.name !== null
                                          ? html`
                                              <span class="secondary">
                                                ${invitation.email}
                                              </span>
                                            `
                                          : html``}
                                      </div>
                                      <i class="bi bi-chevron-down"></i>
                                    </button>
                                    <div hidden>
                                      <div class="dropdown-menu">
                                        <form
                                          method="POST"
                                          action="${action}?_method=PATCH"
                                        >
                                          <input
                                            type="hidden"
                                            name="resend"
                                            value="true"
                                          />
                                          <button
                                            class="dropdown-menu--item button button--transparent"
                                            $${isUsed
                                              ? html`
                                                  type="button"
                                                  data-ondomcontentloaded="${javascript`
                                                    tippy(this, {
                                                      content: "Can’t resend invitation because it’s used.",
                                                      trigger: "click",
                                                    });
                                                  `}"
                                                `
                                              : isExpired
                                              ? html`
                                                  type="button"
                                                  data-ondomcontentloaded="${javascript`
                                                    tippy(this, {
                                                      content: "Can’t resend invitation because it’s expired.",
                                                      trigger: "click",
                                                    });
                                                  `}"
                                                `
                                              : html``}
                                          >
                                            <i class="bi bi-envelope"></i>
                                            Resend Invitation Email
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  `}
                            </div>

                            <div
                              style="${css`
                                display: flex;
                                @media (max-width: 500px) {
                                  flex-direction: column;
                                  align-items: end;
                                  gap: var(--space--2);
                                }
                              `}"
                            >
                              <div>
                                <button
                                  class="button button--transparent"
                                  data-ondomcontentloaded="${javascript`
                                    tippy(this, {
                                      content: "Change Role",
                                      touch: false,
                                    });
                                    tippy(this, {
                                      content: this.nextElementSibling.firstElementChild,
                                      trigger: "click",
                                      interactive: true,
                                    });
                                  `}"
                                >
                                  ${lodash.capitalize(invitation.role)}
                                  <i class="bi bi-chevron-down"></i>
                                </button>
                                <div hidden>
                                  <div class="dropdown--menu">
                                    $${app.locals.constants.roles.map((role) =>
                                      role === invitation.role
                                        ? html``
                                        : html`
                                            <form
                                              method="POST"
                                              action="${action}?_method=PATCH"
                                            >
                                              <input
                                                type="hidden"
                                                name="role"
                                                value="${role}"
                                              />
                                              <button
                                                class="dropdown-menu--item button button--transparent"
                                                $${isUsed
                                                  ? html`
                                                      type="button"
                                                      data-ondomcontentloaded="${javascript`
                                                        tippy(this, {
                                                          content: "Can’t change role because the invitation is used.",
                                                          trigger: "click",
                                                        });
                                                      `}"
                                                    `
                                                  : isExpired
                                                  ? html`
                                                      type="button"
                                                      data-ondomcontentloaded="${javascript`
                                                        tippy(this, {
                                                          content: "Can’t change role because the invitation is expired.",
                                                          trigger: "click",
                                                        });
                                                      `}"
                                                    `
                                                  : html``}
                                              >
                                                ${lodash.capitalize(role)}
                                              </button>
                                            </form>
                                          `
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div
                                style="${css`
                                  width: var(--space--40);
                                  display: flex;
                                  justify-content: end;
                                `}"
                              >
                                $${(() => {
                                  const changeExpirationForm = html`
                                    <form
                                      method="POST"
                                      action="${action}?_method=PATCH"
                                      style="${css`
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--space--2);
                                      `}"
                                    >
                                      <input
                                        type="text"
                                        name="expiresAt"
                                        value="${new Date(
                                          invitation.expiresAt ?? new Date()
                                        ).toISOString()}"
                                        required
                                        autocomplete="off"
                                        class="input--text"
                                        data-ondomcontentloaded="${javascript`
                                        localizeTime(this);
                                        (this.validators ??= []).push(() => {
                                          if (new Date(this.value).getTime() <= Date.now())
                                            return "Must be in the future.";
                                        });
                                      `}"
                                      />
                                      <button
                                        class="dropdown-menu--item button button--transparent"
                                      >
                                        <i class="bi bi-pencil"></i>
                                        Update Expiration Date
                                      </button>
                                    </form>
                                  `;
                                  const removeExpirationForm = html`
                                    <form
                                      method="POST"
                                      action="${action}?_method=PATCH"
                                    >
                                      <input
                                        type="hidden"
                                        name="removeExpiration"
                                        value="true"
                                      />
                                      <button
                                        class="dropdown-menu--item button button--transparent"
                                      >
                                        <i class="bi bi-calendar-minus"></i>
                                        Remove Expiration
                                      </button>
                                    </form>
                                  `;
                                  const expireForm = html`
                                    <form
                                      method="POST"
                                      action="${action}?_method=PATCH"
                                    >
                                      <input
                                        type="hidden"
                                        name="expire"
                                        value="true"
                                      />
                                      <button
                                        class="dropdown-menu--item button button--transparent"
                                      >
                                        <i class="bi bi-calendar-x"></i>
                                        Expire Invitation
                                      </button>
                                    </form>
                                  `;

                                  return isUsed
                                    ? html`
                                        <div
                                          style="${css`
                                            color: var(--color--green--700);
                                            background-color: var(
                                              --color--green--100
                                            );
                                            @media (prefers-color-scheme: dark) {
                                              color: var(--color--green--100);
                                              background-color: var(
                                                --color--green--900
                                              );
                                            }
                                            padding: var(--space--1)
                                              var(--space--2);
                                            border-radius: var(
                                              --border-radius--md
                                            );
                                          `}"
                                          data-ondomcontentloaded="${javascript`
                                          tippy(this, {
                                            content: ${JSON.stringify(html`
                                              Used
                                              <time
                                                data-ondomcontentloaded="${javascript`
                                                  relativizeTime(this);
                                                `}"
                                              >
                                                ${new Date(
                                                  invitation.usedAt!
                                                ).toISOString()}
                                              </time>
                                            `)},
                                            allowHTML: true,
                                            interactive: true,
                                          });
                                        `}"
                                        >
                                          Used
                                          <i class="bi bi-check-lg"></i>
                                        </div>
                                      `
                                    : isExpired
                                    ? html`
                                        <div>
                                          <button
                                            style="${css`
                                              color: var(--color--rose--700);
                                              background-color: var(
                                                --color--rose--100
                                              );
                                              &:hover,
                                              &:focus-within {
                                                background-color: var(
                                                  --color--rose--200
                                                );
                                              }
                                              &:active {
                                                background-color: var(
                                                  --color--rose--300
                                                );
                                              }
                                              @media (prefers-color-scheme: dark) {
                                                color: var(--color--rose--100);
                                                background-color: var(
                                                  --color--rose--900
                                                );
                                                &:hover,
                                                &:focus-within {
                                                  background-color: var(
                                                    --color--rose--700
                                                  );
                                                }
                                                &:active {
                                                  background-color: var(
                                                    --color--rose--600
                                                  );
                                                }
                                              }
                                              padding: var(--space--1)
                                                var(--space--2);
                                              border-radius: var(
                                                --border-radius--md
                                              );
                                              transition-property: var(
                                                --transition-property--colors
                                              );
                                              transition-duration: var(
                                                --transition-duration--150
                                              );
                                              transition-timing-function: var(
                                                --transition-timing-function--in-out
                                              );
                                            `}"
                                            data-ondomcontentloaded="${javascript`
                                            tippy(this, {
                                              content: "Change Expiration",
                                              touch: false,
                                            });
                                            tippy(this, {
                                              content: this.nextElementSibling.firstElementChild,
                                              trigger: "click",
                                              interactive: true,
                                            });
                                          `}"
                                          >
                                            <span
                                              style="${css`
                                                display: inline-flex;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              <i class="bi bi-calendar-x"></i>
                                              Expired
                                            </span>
                                            <i class="bi bi-chevron-down"></i>
                                          </button>
                                          <div hidden>
                                            <div>
                                              <h3 class="heading">
                                                <i class="bi bi-calendar-x"></i>
                                                <span>
                                                  Expired
                                                  <time
                                                    data-ondomcontentloaded="${javascript`
                                                    relativizeTime(this);
                                                  `}"
                                                  >
                                                    ${new Date(
                                                      invitation.expiresAt!
                                                    ).toISOString()}
                                                  </time>
                                                </span>
                                              </h3>
                                              <hr class="dropdown--separator" />
                                              $${changeExpirationForm}
                                              <hr class="dropdown--separator" />
                                              $${removeExpirationForm}
                                            </div>
                                          </div>
                                        </div>
                                      `
                                    : invitation.expiresAt === null
                                    ? html`
                                        <div>
                                          <button
                                            style="${css`
                                              color: var(--color--blue--700);
                                              background-color: var(
                                                --color--blue--100
                                              );
                                              &:hover,
                                              &:focus-within {
                                                background-color: var(
                                                  --color--blue--200
                                                );
                                              }
                                              &:active {
                                                background-color: var(
                                                  --color--blue--300
                                                );
                                              }
                                              @media (prefers-color-scheme: dark) {
                                                color: var(--color--blue--100);
                                                background-color: var(
                                                  --color--blue--900
                                                );
                                                &:hover,
                                                &:focus-within {
                                                  background-color: var(
                                                    --color--blue--700
                                                  );
                                                }
                                                &:active {
                                                  background-color: var(
                                                    --color--blue--600
                                                  );
                                                }
                                              }
                                              padding: var(--space--1)
                                                var(--space--2);
                                              border-radius: var(
                                                --border-radius--md
                                              );
                                              transition-property: var(
                                                --transition-property--colors
                                              );
                                              transition-duration: var(
                                                --transition-duration--150
                                              );
                                              transition-timing-function: var(
                                                --transition-timing-function--in-out
                                              );
                                            `}"
                                            data-ondomcontentloaded="${javascript`
                                            tippy(this, {
                                              content: "Change Expiration",
                                              touch: false,
                                            });
                                            tippy(this, {
                                              content: this.nextElementSibling.firstElementChild,
                                              trigger: "click",
                                              interactive: true,
                                            });
                                          `}"
                                          >
                                            <span
                                              style="${css`
                                                display: inline-flex;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              <i
                                                class="bi bi-calendar-minus"
                                              ></i>
                                              Doesn’t Expire
                                            </span>
                                            <i class="bi bi-chevron-down"></i>
                                          </button>
                                          <div hidden>
                                            <div
                                              style="${css`
                                                padding-top: var(--space--1);
                                              `}"
                                            >
                                              $${changeExpirationForm}
                                              <hr class="dropdown--separator" />
                                              $${expireForm}
                                            </div>
                                          </div>
                                        </div>
                                      `
                                    : html`
                                        <div>
                                          <button
                                            style="${css`
                                              color: var(--color--yellow--700);
                                              background-color: var(
                                                --color--yellow--100
                                              );
                                              &:hover,
                                              &:focus-within {
                                                background-color: var(
                                                  --color--yellow--200
                                                );
                                              }
                                              &:active {
                                                background-color: var(
                                                  --color--yellow--300
                                                );
                                              }
                                              @media (prefers-color-scheme: dark) {
                                                color: var(
                                                  --color--yellow--100
                                                );
                                                background-color: var(
                                                  --color--yellow--900
                                                );
                                                &:hover,
                                                &:focus-within {
                                                  background-color: var(
                                                    --color--yellow--700
                                                  );
                                                }
                                                &:active {
                                                  background-color: var(
                                                    --color--yellow--600
                                                  );
                                                }
                                              }
                                              padding: var(--space--1)
                                                var(--space--2);
                                              border-radius: var(
                                                --border-radius--md
                                              );
                                              transition-property: var(
                                                --transition-property--colors
                                              );
                                              transition-duration: var(
                                                --transition-duration--150
                                              );
                                              transition-timing-function: var(
                                                --transition-timing-function--in-out
                                              );
                                            `}"
                                            data-ondomcontentloaded="${javascript`
                                            tippy(this, {
                                              content: "Change Expiration",
                                              touch: false,
                                            });
                                            tippy(this, {
                                              content: this.nextElementSibling.firstElementChild,
                                              trigger: "click",
                                              interactive: true,
                                            });
                                          `}"
                                          >
                                            <span
                                              style="${css`
                                                display: inline-flex;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              <i
                                                class="bi bi-calendar-plus"
                                              ></i>
                                              Expires
                                            </span>
                                            <i class="bi bi-chevron-down"></i>
                                          </button>
                                          <div hidden>
                                            <div>
                                              <h3 class="heading">
                                                <i
                                                  class="bi bi-calendar-plus"
                                                ></i>
                                                <span>
                                                  Expires
                                                  <time
                                                    data-ondomcontentloaded="${javascript`
                                                  relativizeTime(this);
                                                `}"
                                                  >
                                                    ${new Date(
                                                      invitation.expiresAt
                                                    ).toISOString()}
                                                  </time>
                                                </span>
                                              </h3>
                                              <hr class="dropdown--separator" />
                                              $${changeExpirationForm}
                                              <hr class="dropdown--separator" />
                                              $${removeExpirationForm}
                                              $${expireForm}
                                            </div>
                                          </div>
                                        </div>
                                      `;
                                })()}
                              </div>
                            </div>
                          </div>
                        `;
                      })}
                    </div>
                  `}
            </div>
          `,
        })
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      type?: "link" | "email";
      role?: Role;
      expiresAt?: string;
      emails?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !app.locals.constants.roles.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !app.locals.helpers.isDate(req.body.expiresAt) ||
            app.locals.helpers.isExpired(req.body.expiresAt))) ||
        typeof req.body.type !== "string" ||
        !["link", "email"].includes(req.body.type)
      )
        return next("validation");

      switch (req.body.type) {
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

          app.locals.helpers.flash.set(
            req,
            res,
            html`
              <div class="flash--green">
                <div
                  style="${css`
                    display: flex;
                    justify-content: center;
                    @media (max-width: 419px) {
                      gap: var(--space--2);
                      flex-direction: column;
                    }
                    @media (min-width: 420px) {
                      gap: var(--space--4);
                      align-items: baseline;
                    }
                  `}"
                >
                  Invitation created successfully.
                  <button
                    class="button button--green"
                    onclick="${javascript`
                      MicroModal.show("modal--invitation--${invitationReference}", microModalDefaults);
                    `}"
                  >
                    See Invitation
                  </button>
                </div>
              </div>
            `
          );
          break;

        case "email":
          if (typeof req.body.emails !== "string") return next("validation");
          const emails: { email: string; name: string | null }[] = [];
          for (let email of req.body.emails.split(/[,\n]/)) {
            email = email.trim();
            let name: string | null = null;
            const match = email.match(/^(?<name>.*)<(?<email>.*)>$/);
            if (match !== null) {
              email = match.groups!.email.trim();
              name = match.groups!.name.trim();
              if (name.startsWith('"') && name.endsWith('"'))
                name = name.slice(1, -1);
              if (name === "") name = null;
            }
            if (email === "") continue;
            emails.push({ email, name });
          }
          if (
            emails.length === 0 ||
            emails.some(
              ({ email }) => !email.match(app.locals.constants.emailRegExp)
            )
          )
            return next("validation");

          for (const { email, name } of emails) {
            if (
              app.locals.database.get<{ exists: number }>(
                sql`
                  SELECT EXISTS(
                    SELECT 1
                    FROM "enrollments"
                    JOIN "users" ON "enrollments"."user" = "users"."id"
                    WHERE "enrollments"."course" = ${res.locals.course.id} AND
                          "users"."email" = ${email}
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
                      "email" = ${email} AND
                      "usedAt" IS NULL
              `
            );
            if (existingUnusedInvitation !== undefined) {
              app.locals.database.run(
                sql`
                  UPDATE "invitations"
                  SET "expiresAt" = ${req.body.expiresAt},
                      "name" = ${name ?? existingUnusedInvitation.name},
                      "role" = ${req.body.role}
                  WHERE "id" = ${existingUnusedInvitation.id}
                `
              );
              continue;
            }

            const invitation = app.locals.database.get<{
              id: number;
              expiresAt: string | null;
              usedAt: string | null;
              reference: string;
              email: string | null;
              name: string | null;
              role: Role;
            }>(
              sql`
                INSERT INTO "invitations" ("expiresAt", "course", "reference", "email", "name", "role")
                VALUES (
                  ${req.body.expiresAt ?? null},
                  ${res.locals.course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${email},
                  ${name},
                  ${req.body.role}
                )
                RETURNING *
              `
            )!;

            app.locals.helpers.sendInvitationEmail({
              ...invitation,
              course: res.locals.course,
            });
          }

          app.locals.helpers.flash.set(
            req,
            res,
            html`
              <div class="flash--green">
                Invitations sent successfully.
                $${app.locals.settings.demonstration
                  ? html`
                      <br />
                      CourseLore doesn’t send emails in Demonstration Mode.
                      <a
                        href="${app.locals.settings.url}/demonstration-inbox"
                        class="link"
                        >Go to the Demonstration Inbox</a
                      >.
                    `
                  : html``}
              </div>
            `
          );
          break;
      }

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      role?: Role;
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    MayManageInvitationMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    ...app.locals.middlewares.mayManageInvitation,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("validation");

      if (req.body.resend === "true") {
        if (
          app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          res.locals.invitation.email === null
        )
          return next("validation");

        app.locals.helpers.sendInvitationEmail(res.locals.invitation);

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">
              Invitation email resent successfully.
            </div>
          `
        );
      }

      if (req.body.role !== undefined) {
        if (
          app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          !app.locals.constants.roles.includes(req.body.role)
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">
              Invitation role updated successfully.
            </div>
          `
        );
      }

      if (req.body.expiresAt !== undefined) {
        if (
          typeof req.body.expiresAt !== "string" ||
          !app.locals.helpers.isDate(req.body.expiresAt) ||
          app.locals.helpers.isExpired(req.body.expiresAt)
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">
              Invitation expiration updated successfully.
            </div>
          `
        );
      }

      if (req.body.removeExpiration === "true") {
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">
              Invitation expiration removed successfully.
            </div>
          `
        );
      }

      if (req.body.expire === "true") {
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">Invitation expired successfully.</div>
          `
        );
      }

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollments",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      const enrollments = app.locals.database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userName: string;
        userAvatar: string | null;
        userBiography: string | null;
        reference: string;
        role: Role;
      }>(
        sql`
          SELECT "enrollments"."id",
                 "users"."id" AS "userId",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."biography" AS "userBiography",
                 "enrollments"."reference",
                 "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "enrollments"."course" = ${res.locals.course.id}
          ORDER BY "enrollments"."role" ASC, "users"."name" ASC
        `
      );

      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Enrollments · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                Course Settings ·
                <i class="bi bi-people"></i>
                Enrollments
              </h2>

              <div class="stripped">
                $${enrollments.map((enrollment) => {
                  const action = `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
                  const isSelf = enrollment.id === res.locals.enrollment.id;
                  const isOnlyStaff =
                    isSelf &&
                    enrollments.filter(
                      (enrollment) => enrollment.role === "staff"
                    ).length === 1;

                  return html`
                    <div
                      style="${css`
                        display: flex;
                      `}"
                    >
                      <div
                        style="${css`
                          width: var(--space--8);
                        `}"
                      >
                        $${enrollment.userAvatar === null
                          ? html`
                              <div
                                style="${css`
                                  font-size: var(--font-size--xl);
                                `}"
                              >
                                <i class="bi bi-person-circle"></i>
                              </div>
                            `
                          : html`
                              <img
                                src="${enrollment.userAvatar}"
                                alt="${enrollment.userName ??
                                enrollment.userEmail}"
                                class="avatar"
                                style="${css`
                                  width: var(--font-size--xl);
                                  height: var(--font-size--xl);
                                `}"
                              />
                            `}
                      </div>
                      <div
                        style="${css`
                          flex: 1;
                          display: flex;
                          flex-direction: column;
                        `}"
                      >
                        <div class="strong">
                          ${enrollment.userName ?? enrollment.userEmail}
                        </div>
                        $${enrollment.userName === null
                          ? html``
                          : html`<div>${enrollment.userEmail}</div>`}
                      </div>
                      <div
                        style="${css`
                          width: var(--space--32);
                          display: flex;
                          justify-content: end;
                          align-items: baseline;
                          gap: var(--space--6);
                        `}"
                      >
                        <div>
                          <button
                            $${isOnlyStaff
                              ? html`disabled`
                              : html`
                                  class="button"
                                  data-ondomcontentloaded="${javascript`
                                    tippy(this, {
                                      content: "Change Role",
                                      touch: false,
                                    });
                                    tippy(this, {
                                      content: this.nextElementSibling.firstElementChild,
                                      trigger: "click",
                                      interactive: true,
                                    });
                                  `}"
                                `}
                          >
                            <span
                              $${isOnlyStaff
                                ? html`
                                    tabindex="0"
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: "You may not change your own role because you’re the only staff member.",
                                      });
                                    `}"
                                  `
                                : html``}
                            >
                              ${lodash.capitalize(enrollment.role)}
                              <i class="bi bi-chevron-down"></i>
                            </span>
                          </button>
                          $${isOnlyStaff
                            ? html``
                            : html`
                                <div hidden>
                                  <div>
                                    $${app.locals.constants.roles.map((role) =>
                                      role === enrollment.role
                                        ? html``
                                        : html`
                                            <form
                                              method="POST"
                                              action="${action}?_method=PATCH"
                                            >
                                              <input
                                                type="hidden"
                                                name="role"
                                                value="${role}"
                                              />
                                              <div>
                                                <button
                                                  class="dropdown-menu--item button button--transparent"
                                                  $${isSelf
                                                    ? html`
                                                        type="button"
                                                        data-ondomcontentloaded="${javascript`
                                                          tippy(this, {
                                                            content: this.nextElementSibling.firstElementChild,
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                          });
                                                        `}"
                                                      `
                                                    : html``}
                                                >
                                                  Convert to
                                                  ${lodash.capitalize(role)}
                                                </button>
                                                $${isSelf
                                                  ? html`
                                                      <div hidden>
                                                        <div
                                                          style="${css`
                                                            padding: var(
                                                                --space--2
                                                              )
                                                              var(--space--0);
                                                            display: flex;
                                                            flex-direction: column;
                                                            gap: var(
                                                              --space--4
                                                            );
                                                          `}"
                                                        >
                                                          <p>
                                                            Are you sure you
                                                            want to convert
                                                            yourself into
                                                            ${role}?
                                                          </p>
                                                          <p>
                                                            <strong
                                                              style="${css`
                                                                font-weight: var(
                                                                  --font-weight--bold
                                                                );
                                                              `}"
                                                            >
                                                              You may not undo
                                                              this action!
                                                            </strong>
                                                          </p>
                                                          <button
                                                            class="button button--rose"
                                                          >
                                                            Convert to
                                                            ${lodash.capitalize(
                                                              role
                                                            )}
                                                          </button>
                                                        </div>
                                                      </div>
                                                    `
                                                  : html``}
                                              </div>
                                            </form>
                                          `
                                    )}
                                  </div>
                                </div>
                              `}
                        </div>

                        <div>
                          <button
                            $${isOnlyStaff
                              ? html`disabled`
                              : html`
                                  class="button button--rose"
                                  data-ondomcontentloaded="${javascript`
                                    tippy(this, {
                                      content: "Remove from the Course",
                                      theme: "rose",
                                      touch: false,
                                    });
                                    tippy(this, {
                                      content: this.nextElementSibling.firstElementChild,
                                      theme: "rose",
                                      trigger: "click",
                                      interactive: true,
                                    });
                                  `}"
                                `}
                          >
                            <span
                              $${isOnlyStaff
                                ? html`
                                    tabindex="0"
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: "You may not remove yourself from the course because you’re the only staff member.",
                                        theme: "rose",
                                      });
                                    `}"
                                  `
                                : html``}
                            >
                              <i class="bi bi-person-dash"></i>
                            </span>
                          </button>
                          $${isOnlyStaff
                            ? html``
                            : html`
                                <div hidden>
                                  <form
                                    method="POST"
                                    action="${action}?_method=DELETE"
                                    style="${css`
                                      padding: var(--space--2) var(--space--0);
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--space--4);
                                    `}"
                                  >
                                    <p>
                                      Are you sure you want to remove
                                      ${isSelf ? "yourself" : "this person"}
                                      from the course?
                                    </p>
                                    <p>
                                      <strong
                                        style="${css`
                                          font-weight: var(--font-weight--bold);
                                        `}"
                                      >
                                        You may not undo this action!
                                      </strong>
                                    </p>
                                    <button class="button button--rose">
                                      <i class="bi bi-person-dash"></i>
                                      Remove from the Course
                                    </button>
                                  </form>
                                </div>
                              `}
                        </div>
                      </div>
                    </div>
                  `;
                })}
              </div>
            </div>
          `,
        })
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
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!app.locals.constants.roles.includes(req.body.role))
          return next("validation");
        app.locals.database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash--green">Enrollment updated successfully.</div>
          `
        );

        if (res.locals.managedEnrollment.id === res.locals.enrollment.id)
          return res.redirect(
            `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings`
          );
      }

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollments`
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
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      const isSelf =
        res.locals.managedEnrollment.id === res.locals.enrollment.id;

      app.locals.helpers.flash.set(
        req,
        res,
        html`
          <div class="flash--green">
            $${isSelf ? html`You removed yourself` : html`Person removed`} from
            the course successfully.
          </div>
        `
      );

      res.redirect(
        isSelf
          ? `${app.locals.settings.url}/`
          : `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollments`
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Tags · Course Settings · ${res.locals.course.name} · CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                Course Settings ·
                <i class="bi bi-tags"></i>
                Tags
              </h2>

              $${res.locals.tags.length === 0
                ? html`
                    <div
                      class="tags--empty"
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                        align-items: center;
                      `}"
                    >
                      <div class="decorative-icon">
                        <i class="bi bi-tags"></i>
                      </div>
                      <p>Organize conversations with tags.</p>
                    </div>
                  `
                : html``}

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/settings/tags?_method=PUT"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                  `}"
                >
                  <div
                    class="tags"
                    style="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    $${res.locals.tags.map(
                      (tag, index) => html`
                        <!-- TODO: Add link to see all conversations tagged with this tag -->
                        <div class="tag">
                          <div
                            style="${css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: center;
                            `}"
                          >
                            <input
                              type="hidden"
                              name="tags[${index}][reference]"
                              value="${tag.reference}"
                            />
                            <input
                              type="hidden"
                              name="tags[${index}][delete]"
                              value="true"
                              disabled
                              data-force-is-modified="true"
                            />
                            <div
                              style="${css`
                                .deleted & {
                                  color: var(--color--rose--800);
                                  @media (prefers-color-scheme: dark) {
                                    color: var(--color--rose--200);
                                  }
                                }
                              `}"
                            >
                              <i class="bi bi-tag"></i>
                            </div>
                            <div
                              style="${css`
                                flex: 1;
                              `}"
                            >
                              <input
                                type="text"
                                name="tags[${index}][name]"
                                value="${tag.name}"
                                class="input--text disable-on-delete"
                                required
                                autocomplete="off"
                                style="${css`
                                  .deleted & {
                                    color: var(--color--rose--800);
                                    background-color: var(--color--rose--200);
                                    @media (prefers-color-scheme: dark) {
                                      color: var(--color--rose--200);
                                      background-color: var(--color--rose--900);
                                    }
                                  }
                                `}"
                              />
                            </div>
                            <label
                              class="button button--transparent"
                              style="${css`
                                .deleted & {
                                  color: var(--color--rose--800);
                                  @media (prefers-color-scheme: dark) {
                                    color: var(--color--rose--200);
                                  }
                                }
                              `}"
                            >
                              <select
                                name="tags[${index}][visibleBy]"
                                required
                                autocomplete="off"
                                class="disable-on-delete"
                              >
                                <option
                                  value="everyone"
                                  $${tag.visibleBy === "everyone"
                                    ? html`selected`
                                    : html``}
                                >
                                  Visible by Everyone
                                </option>
                                <option
                                  value="staff"
                                  $${tag.visibleBy === "staff"
                                    ? html`selected`
                                    : html``}
                                >
                                  Visible by Staff Only
                                </option>
                              </select>
                              <i class="bi bi-chevron-down"></i>
                            </label>
                            <div
                              style="${css`
                                .tag.deleted & {
                                  display: none;
                                }
                              `}"
                            >
                              <button
                                type="button"
                                class="button button--transparent button--rose"
                                data-ondomcontentloaded="${javascript`
                                  tippy(this, {
                                    content: "Remove Tag",
                                    theme: "rose",
                                    touch: false,
                                  });
                                  tippy(this, {
                                    content: this.nextElementSibling.firstElementChild,
                                    theme: "rose",
                                    interactive: true,
                                  });
                                `}"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                              <div hidden>
                                <div
                                  style="${css`
                                    padding: var(--space--2) var(--space--0);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `}"
                                >
                                  <p>
                                    Are you sure you want to remove this tag?
                                  </p>
                                  <p>
                                    <strong
                                      style="${css`
                                        font-weight: var(--font-weight--bold);
                                      `}"
                                    >
                                      The tag will be removed from all
                                      conversations and you may not undo this
                                      action!
                                    </strong>
                                  </p>
                                  <button
                                    type="button"
                                    class="button button--rose"
                                    onclick="${javascript`
                                      const tag = this.closest(".tag");
                                      tag.classList.add("deleted");
                                      tag.querySelector('[name$="[delete]"]').disabled = false;
                                      for (const element of tag.querySelectorAll(".disable-on-delete")) element.disabled = true;
                                    `}"
                                  >
                                    <i class="bi bi-trash"></i>
                                    Remove Tag
                                  </button>
                                </div>
                              </div>
                            </div>
                            <div
                              style="${css`
                                .tag:not(.deleted) & {
                                  display: none;
                                }
                              `}"
                            >
                              <button
                                type="button"
                                class="button button--transparent"
                                data-ondomcontentloaded="${javascript`
                                  tippy(this, {
                                    content: "Don’t Remove Tag",
                                    touch: false,
                                  });
                                `}"
                                onclick="${javascript`
                                  const tag = this.closest(".tag");
                                  tag.classList.remove("deleted");
                                  tag.querySelector('[name$="[delete]"]').disabled = true;
                                  for (const element of tag.querySelectorAll(".disable-on-delete")) element.disabled = false;
                                `}"
                              >
                                <i class="bi bi-recycle"></i>
                              </button>
                            </div>
                          </div>
                        </div>
                      `
                    )}
                  </div>
                  <div
                    style="${css`
                      display: flex;
                      justify-content: center;
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--full-width-on-small-screen"
                      onclick="${javascript`
                        const newTag = this.nextElementSibling.firstElementChild.cloneNode(true);
                        this.closest("form").querySelector(".tags").insertAdjacentElement("beforeend", newTag);
                        for (const element of newTag.querySelectorAll("[data-onmount]"))
                          new Function(element.dataset.onmount).call(element);
                      `}"
                    >
                      <i class="bi bi-plus-circle"></i>
                      Add Tag
                    </button>
                    <div hidden>
                      <div
                        class="tag"
                        style="${css`
                          display: flex;
                          gap: var(--space--2);
                          align-items: center;
                        `}"
                      >
                        <i class="bi bi-tag"></i>
                        <div
                          style="${css`
                            flex: 1;
                          `}"
                        >
                          <input
                            type="text"
                            class="input--text"
                            required
                            autocomplete="off"
                            disabled
                            data-onmount="${javascript`
                              this.dataset.forceIsModified = true;
                              this.disabled = false;
                              const tag = this.closest(".tag");
                              this.name = "tags[" + [...tag.parentElement.children].indexOf(tag) + "][name]";
                            `}"
                          />
                        </div>
                        <label class="button button--transparent">
                          <select
                            required
                            autocomplete="off"
                            disabled
                            data-onmount="${javascript`
                              this.dataset.forceIsModified = true;
                              this.disabled = false;
                              const tag = this.closest(".tag");
                              this.name = "tags[" + [...tag.parentElement.children].indexOf(tag) + "][visibleBy]";
                            `}"
                          >
                            <option value="everyone">
                              Visible by Everyone
                            </option>
                            <option value="staff">Visible by Staff Only</option>
                          </select>
                          <i class="bi bi-chevron-down"></i>
                        </label>
                        <div>
                          <button
                            type="button"
                            class="button button--transparent button--rose"
                            data-onmount="${javascript`
                              tippy(this, {
                                content: "Remove Tag",
                                theme: "rose",
                                touch: false,
                              });
                            `}"
                            onclick="${javascript`
                              this.closest(".tag").remove();
                            `}"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                    data-ondomcontentloaded="${javascript`
                      (this.validators ??= []).push(() => {
                        if (this.closest("form").querySelector(".tags").children.length === 0)
                          return "Add at least one tag.";
                      });
                    `}"
                  >
                    <i class="bi bi-pencil"></i>
                    Update Tags
                  </button>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.put<
    { courseReference: string },
    HTML,
    {
      tags?: {
        reference?: string;
        delete?: "true";
        name?: string;
        visibleBy?: TagVisibleBy;
      }[];
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        !Array.isArray(req.body.tags) ||
        req.body.tags.length === 0 ||
        req.body.tags.some(
          (tag) =>
            (tag.reference === undefined &&
              (typeof tag.name !== "string" ||
                tag.name.trim() === "" ||
                typeof tag.visibleBy !== "string" ||
                !app.locals.constants.tagVisibleBy.includes(tag.visibleBy))) ||
            (tag.reference !== undefined &&
              (!res.locals.tags.some(
                (existingTag) => tag.reference === existingTag.reference
              ) ||
                (tag.delete !== "true" &&
                  (typeof tag.name !== "string" ||
                    tag.name.trim() === "" ||
                    typeof tag.visibleBy !== "string" ||
                    !app.locals.constants.tagVisibleBy.includes(
                      tag.visibleBy
                    )))))
        )
      )
        return next("validation");

      for (const tag of req.body.tags)
        if (tag.reference === undefined)
          app.locals.database.run(
            sql`
              INSERT INTO "tags" ("course", "reference", "name", "visibleBy")
              VALUES (
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${tag.name},
                ${tag.visibleBy}
              )
            `
          );
        else if (tag.delete === "true")
          app.locals.database.run(
            sql`
              DELETE FROM "tags" WHERE "reference" = ${tag.reference}
            `
          );
        else
          app.locals.database.run(
            sql`
              UPDATE "tags"
              SET "name" = ${tag.name}, "visibleBy" = ${tag.visibleBy}
              WHERE "reference" = ${tag.reference}
            `
          );

      app.locals.helpers.flash.set(
        req,
        res,
        html`<div class="flash--green">Tags updated successfully.</div>`
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/tags`
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
    "/courses/:courseReference/settings/your-enrollment",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Your Enrollment · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-sliders"></i>
                Course Settings ·
                <i class="bi bi-person"></i>
                Your Enrollment
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/settings/your-enrollment?_method=PATCH"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <div class="label">
                  <div class="label--text">
                    Accent Color
                    <button
                      type="button"
                      class="button button--icon button--icon--inline button--transparent"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "A bar with the accent color appears at the top of pages related to this course to help you differentiate between courses.",
                          trigger: "click",
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </div>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                    `}"
                  >
                    $${app.locals.constants.accentColors.map(
                      (accentColor) => html`
                        <input
                          type="radio"
                          name="accentColor"
                          value="${accentColor}"
                          required
                          autocomplete="off"
                          $${accentColor === res.locals.enrollment.accentColor
                            ? html`checked`
                            : html``}
                          class="input--radio"
                          style="${css`
                            background-color: var(--color--${accentColor}--500);
                            &:hover,
                            &:focus-within {
                              background-color: var(
                                --color--${accentColor}--400
                              );
                            }
                            &:active {
                              background-color: var(
                                --color--${accentColor}--600
                              );
                            }
                            @media (prefers-color-scheme: dark) {
                              background-color: var(
                                --color--${accentColor}--600
                              );
                              &:hover,
                              &:focus-within {
                                background-color: var(
                                  --color--${accentColor}--500
                                );
                              }
                              &:active {
                                background-color: var(
                                  --color--${accentColor}--700
                                );
                              }
                            }
                          `}"
                        />
                      `
                    )}
                  </div>
                </div>
                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-pencil"></i>
                    Update Your Enrollment
                  </button>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    { accentColor?: AccentColor },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.accentColor !== "string" ||
        !app.locals.constants.accentColors.includes(req.body.accentColor)
      )
        return next("validation");

      app.locals.database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
      );

      app.locals.helpers.flash.set(
        req,
        res,
        html` <div class="flash--green">Enrollment updated successfully.</div> `
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/your-enrollment`
      );
    }
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
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading"
                style="${css`
                  color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--gray--medium--800);
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p>
                  You tried to use an invitation for ${res.locals.course.name}
                  but you’re already enrolled.
                </p>

                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}"
                  class="button button--blue"
                  style="${css`
                    width: 100%;
                  `}"
                >
                  Go to ${res.locals.course.name}
                  <i class="bi bi-chevron-right"></i>
                </a>
              </div>
            </div>
          `,
        })
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading"
                style="${css`
                  color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--gray--medium--800);
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p
                  style="${css`
                    font-weight: var(--font-weight--bold);
                  `}"
                >
                  Welcome to ${res.locals.invitation.course.name}!
                </p>

                <form
                  method="POST"
                  action="${app.locals.settings.url}/courses/${res.locals
                    .invitation.course.reference}/invitations/${res.locals
                    .invitation.reference}"
                >
                  <button
                    type="submit"
                    class="button button--blue"
                    style="${css`
                      width: 100%;
                    `}"
                  >
                    <i class="bi bi-journal-arrow-down"></i>
                    Enroll as ${lodash.capitalize(res.locals.invitation.role)}
                  </button>
                </form>
              </div>
            </div>
          `,
        })
      );
    }
  );

  app.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
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
    IsSignedOutMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedOut,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading"
                style="${css`
                  color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--gray--medium--800);
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p
                  style="${css`
                    font-weight: var(--font-weight--bold);
                  `}"
                >
                  Welcome to ${res.locals.invitation.course.name}!
                </p>
                <p>To enroll, first you must authenticate.</p>

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
                  class="button button--blue"
                  style="${css`
                    width: 100%;
                  `}"
                >
                  <i class="bi bi-box-arrow-in-right"></i>
                  Authenticate
                </a>
              </div>
            </div>
          `,
        })
      );
    }
  );

  interface Layouts {
    conversation: (_: {
      req: express.Request<
        { courseReference: string; conversationReference?: string },
        HTML,
        {},
        {
          onlyConversationLayoutSidebarOnSmallScreen?: "true";
          conversationLayoutSidebarOpenOnSmallScreen?: "true";
          search?: string;
          tag?: string;
        },
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsConversationAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        HTML,
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsConversationAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.conversation = ({ req, res, head, body }) =>
    app.locals.layouts.application({
      req,
      res,
      head,
      extraHeaders: html`
        $${req.query.onlyConversationLayoutSidebarOnSmallScreen === "true"
          ? html``
          : html`
              <div
                style="${css`
                  color: var(--color--gray--medium--100);
                  background-color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--1) var(--space--4);
                  display: flex;
                  justify-content: center;
                  @media (min-width: 900px) {
                    display: none;
                  }
                `}"
              >
                <button
                  style="${css`
                    display: flex;
                    gap: var(--space--2);
                  `}"
                  onclick="${javascript`
                    document.querySelector(".conversation--layout--sidebar").classList.toggle("single-column--hidden");
                    document.querySelector(".conversation--layout--main").classList.toggle("single-column--hidden");
                    this.lastElementChild.classList.toggle("bi-chevron-bar-expand");
                    this.lastElementChild.classList.toggle("bi-chevron-bar-contract");
                  `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Conversations
                  <i class="bi bi-chevron-bar-expand"></i>
                </button>
              </div>
            `}
      `,
      body: html`
        <div
          class="conversation--layout"
          style="${css`
            width: 100%;
            height: 100%;
            display: flex;
            & > * {
              overflow: auto;
              & > * {
                margin: var(--space--4);
              }
            }
            @media (max-width: 899px) {
              & > * {
                flex: 1;
                display: flex;
                justify-content: center;
                & > * {
                  flex: 1;
                  min-width: var(--width--0);
                  max-width: var(--width--2xl);
                }
              }
              & > .single-column--hidden {
                display: none;
              }
            }
          `}"
        >
          <div
            class="conversation--layout--sidebar ${req.query
              .onlyConversationLayoutSidebarOnSmallScreen === "true" ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? ""
              : "single-column--hidden"}"
            style="${css`
              color: var(--color--gray--medium--200);
              background-color: var(--color--gray--medium--900);
              @media (prefers-color-scheme: dark) {
                color: var(--color--gray--medium--200);
                background-color: var(--color--gray--medium--900);
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
              }

              .button--sidebar {
                color: var(--color--gray--medium--200);
                &:hover,
                &:focus-within {
                  color: var(--color--gray--medium--50);
                }
                &:active {
                  color: var(--color--gray--medium--100);
                }
                @media (prefers-color-scheme: dark) {
                  &:hover,
                  &:focus-within {
                    color: var(--color--gray--medium--50);
                  }
                  &:active {
                    color: var(--color--gray--medium--100);
                  }
                }
              }

              .input--text--sidebar {
                color: var(--color--gray--medium--200);
                background-color: var(--color--gray--medium--700);
                &::placeholder {
                  color: var(--color--gray--medium--300);
                }
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--200);
                  background-color: var(--color--gray--medium--700);
                  &::placeholder {
                    color: var(--color--gray--medium--300);
                  }
                }
              }
            `}"
          >
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                style="${css`
                  display: flex;
                  justify-content: center;
                `}"
              >
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/conversations/new"
                  class="button button--sidebar"
                  style="${css`
                    font-weight: var(--font-weight--bold);
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Start a New Conversation
                </a>
              </div>

              <div
                style="${css`
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <form
                  style="${css`
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }
                  `}"
                >
                  $${req.query.onlyConversationLayoutSidebarOnSmallScreen ===
                  "true"
                    ? html`
                        <input
                          type="hidden"
                          name="onlyConversationLayoutSidebarOnSmallScreen"
                          value="true"
                        />
                      `
                    : html``}
                  <input
                    type="hidden"
                    name="conversationLayoutSidebarOpenOnSmallScreen"
                    value="true"
                  />
                  $${req.query.tag !== undefined
                    ? html`
                        <input
                          type="hidden"
                          name="tag"
                          value="${req.query.tag}"
                        />
                      `
                    : html``}
                  <input
                    type="text"
                    name="search"
                    value="${req.query.search ?? ""}"
                    placeholder="Search…"
                    required
                    class="input--text input--text--sidebar"
                    style="${css`
                      padding-right: var(--space--12);
                    `}"
                    data-skip-is-modified="true"
                  />
                  <div
                    style="${css`
                      justify-self: end;
                      margin-right: var(--space--2);
                      display: flex;
                      gap: var(--space--2);
                      align-items: center;
                    `}"
                  >
                    $${req.query.search !== undefined
                      ? html`
                          <a
                            href="?${qs.stringify({
                              onlyConversationLayoutSidebarOnSmallScreen:
                                req.query
                                  .onlyConversationLayoutSidebarOnSmallScreen,
                              conversationLayoutSidebarOpenOnSmallScreen:
                                "true",
                              tag: req.query.tag,
                            })}"
                            class="button button--sidebar"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Remove Search",
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-x-lg"></i>
                          </a>
                        `
                      : html``}
                    <button
                      class="button button--sidebar"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "Search",
                          touch: false,
                        });
                      `}"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                  </div>
                </form>
                $${res.locals.tags.length > 0
                  ? html`
                      <div
                        style="${css`
                          display: flex;
                          gap: var(--space--2);
                        `}"
                      >
                        <div>
                          <button
                            class="button button--sidebar"
                            style="${css`
                              ${res.locals.tagFilter === undefined
                                ? css``
                                : css`
                                    font-weight: var(--font-weight--bold);
                                  `}
                            `}"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: this.nextElementSibling.firstElementChild,
                                trigger: "click",
                                interactive: true,
                              });
                            `}"
                          >
                            $${res.locals.tagFilter === undefined
                              ? html`
                                  <i class="bi bi-funnel"></i>
                                  Filter by Tag
                                `
                              : html`
                                  <i class="bi bi-funnel-fill"></i>
                                  Filtering by <i class="bi bi-tag"></i>
                                  ${res.locals.tagFilter.name}
                                `}
                          </button>
                          <div hidden>
                            <div
                              style="${css`
                                max-height: var(--space--40);
                                overflow: auto;
                                margin: var(--space--0) var(--space---2);
                              `}"
                            >
                              <div
                                style="${css`
                                  margin: var(--space--0) var(--space--2);
                                `}"
                              >
                                $${res.locals.tags.map((tag) => {
                                  const isTagFilter =
                                    tag.id === res.locals.tagFilter?.id;
                                  return html`
                                    <a
                                      href="?${qs.stringify({
                                        onlyConversationLayoutSidebarOnSmallScreen:
                                          req.query
                                            .onlyConversationLayoutSidebarOnSmallScreen,
                                        conversationLayoutSidebarOpenOnSmallScreen:
                                          "true",
                                        search: req.query.search,
                                        tag: isTagFilter
                                          ? undefined
                                          : tag.reference,
                                      })}"
                                      class="dropdown-menu--item button button--transparent ${isTagFilter
                                        ? "active"
                                        : ""}"
                                      ><i class="bi bi-tag"></i> ${tag.name}</a
                                    >
                                  `;
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        $${res.locals.tagFilter === undefined
                          ? html``
                          : html`
                              <a
                                href="?${qs.stringify({
                                  onlyConversationLayoutSidebarOnSmallScreen:
                                    req.query
                                      .onlyConversationLayoutSidebarOnSmallScreen,
                                  conversationLayoutSidebarOpenOnSmallScreen:
                                    "true",
                                  search: req.query.search,
                                })}"
                                class="button button--sidebar"
                                data-ondomcontentloaded="${javascript`
                                  tippy(this, {
                                    content: "Remove Filter",
                                    touch: false,
                                  });
                                `}"
                              >
                                <i class="bi bi-x-lg"></i>
                              </a>
                            `}
                      </div>
                    `
                  : html``}
              </div>

              $${res.locals.conversations.length === 0
                ? html`
                    <div
                      style="${css`
                        color: var(--color--gray--medium--500);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                        align-items: center;
                      `}"
                    >
                      <div
                        class="decorative-icon"
                        style="${css`
                          color: var(--color--gray--medium--600);
                          background-color: var(--color--gray--medium--800);
                        `}"
                      >
                        <i class="bi bi-chat-left-text"></i>
                      </div>
                      No conversation found.
                    </div>
                  `
                : html`
                    <div
                      class="${req.query
                        .onlyConversationLayoutSidebarOnSmallScreen === "true"
                        ? "active--cancel"
                        : ""}"
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      $${res.locals.conversations.map(
                        (conversation) => html`
                          <a
                            href="${app.locals.settings.url}/courses/${res
                              .locals.course
                              .reference}/conversations/${conversation.reference}?${qs.stringify(
                              {
                                search: req.query.search,
                                tag: req.query.tag,
                              }
                            )}"
                            class="${conversation.id ===
                            res.locals.conversation?.id
                              ? "active"
                              : ""}"
                            style="${css`
                              width: calc(100% + 2 * var(--space--2));
                              padding: var(--space--2) var(--space--2);
                              border-radius: var(--border-radius--lg);
                              margin-left: var(--space---2);
                              display: block;
                              transition-property: var(
                                --transition-property--colors
                              );
                              transition-duration: var(
                                --transition-duration--150
                              );
                              transition-timing-function: var(
                                --transition-timing-function--in-out
                              );

                              &:hover,
                              &:focus-within,
                              &.active:focus {
                                background-color: var(
                                  --color--gray--medium--600
                                );
                              }
                              &:active {
                                background-color: var(
                                  --color--gray--medium--700
                                );
                              }
                              @media (max-width: 899px) {
                                :not(.active--cancel) > &.active {
                                  background-color: var(
                                    --color--gray--medium--700
                                  );
                                }
                              }
                              @media (min-width: 900px) {
                                &.active {
                                  background-color: var(
                                    --color--gray--medium--700
                                  );
                                }
                              }
                              @media (prefers-color-scheme: dark) {
                                &:hover,
                                &:focus-within,
                                &.active:focus {
                                  background-color: var(
                                    --color--gray--medium--600
                                  );
                                }
                                &:active {
                                  background-color: var(
                                    --color--gray--medium--700
                                  );
                                }
                                @media (max-width: 899px) {
                                  :not(.active--cancel) > &.active {
                                    background-color: var(
                                      --color--gray--medium--700
                                    );
                                  }
                                }
                                @media (min-width: 900px) {
                                  &.active {
                                    background-color: var(
                                      --color--gray--medium--700
                                    );
                                  }
                                }
                              }
                            `}"
                          >
                            <h3
                              style="${css`
                                font-weight: var(--font-weight--bold);
                                color: var(--color--gray--medium--100);
                                @media (prefers-color-scheme: dark) {
                                  color: var(--color--gray--medium--100);
                                }
                              `}"
                            >
                              ${conversation.title}
                            </h3>
                            <div
                              style="${css`
                                font-size: var(--font-size--xs);
                                line-height: var(--line-height--xs);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--0-5);
                              `}"
                            >
                              <div>
                                <div>
                                  #${conversation.reference} created
                                  <time
                                    data-ondomcontentloaded="${javascript`
                                  relativizeTime(this);
                                `}"
                                  >
                                    ${conversation.createdAt}
                                  </time>
                                  by
                                  $${conversation.authorEnrollment.user
                                    .avatar === null
                                    ? html`<i class="bi bi-person-circle"></i>`
                                    : html`
                                        <img
                                          src="${conversation.authorEnrollment
                                            .user.avatar}"
                                          alt="${conversation.authorEnrollment
                                            .user.name}"
                                          class="avatar"
                                          style="${css`
                                            width: var(--font-size--xs);
                                            height: var(--font-size--xs);
                                            vertical-align: -0.125em;
                                          `}"
                                        />
                                      `}
                                  ${conversation.authorEnrollment.user.name}
                                </div>
                                $${conversation.updatedAt !==
                                conversation.createdAt
                                  ? html`
                                      <div>
                                        and last updated
                                        <time
                                          data-ondomcontentloaded="${javascript`
                                        relativizeTime(this);
                                      `}"
                                        >
                                          ${conversation.updatedAt}
                                        </time>
                                      </div>
                                    `
                                  : html``}
                              </div>
                              <div
                                style="${css`
                                  display: flex;
                                  gap: var(--space--4);

                                  & > * {
                                    display: flex;
                                    gap: var(--space--1);
                                  }
                                `}"
                              >
                                $${conversation.pinnedAt !== null
                                  ? html`
                                      <div>
                                        <i class="bi bi-pin"></i>
                                        Pinned
                                      </div>
                                    `
                                  : html``}
                                $${conversation.questionAt !== null
                                  ? html`
                                      <div>
                                        <i class="bi bi-patch-question"></i>
                                        Question
                                      </div>
                                    `
                                  : html``}
                                <div>
                                  <i class="bi bi-chat-left-text"></i>
                                  ${conversation.messagesCount}
                                  Message${conversation.messagesCount === 1
                                    ? ""
                                    : "s"}
                                </div>
                                $${conversation.endorsements.length === 0
                                  ? html``
                                  : html`
                                      <div
                                        data-ondomcontentloaded="${javascript`
                                    tippy(this, {
                                      content: ${JSON.stringify(
                                        `Endorsed by ${
                                          /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (Intl as any).ListFormat(
                                            "en"
                                          ).format(
                                            conversation.endorsements.map(
                                              (endorsement) =>
                                                endorsement.enrollment.user.name
                                            )
                                          )
                                        }`
                                      )},
                                      touch: false,
                                    });
                                  `}"
                                      >
                                        <i class="bi bi-award"></i>
                                        ${conversation.endorsements.length}
                                        Staff
                                        Endorsement${conversation.endorsements
                                          .length === 1
                                          ? ""
                                          : "s"}
                                      </div>
                                    `}
                                $${conversation.likesCount === 0
                                  ? html``
                                  : html`
                                      <div>
                                        <i class="bi bi-hand-thumbs-up"></i>
                                        ${conversation.likesCount}
                                        Like${conversation.likesCount === 1
                                          ? ""
                                          : "s"}
                                      </div>
                                    `}
                                $${conversation.taggings.length === 0
                                  ? html``
                                  : html`
                                      <div>
                                        $${conversation.taggings.map(
                                          (tagging) => html`
                                            <i class="bi bi-tag"></i>
                                            ${tagging.tag.name}
                                          `
                                        )}
                                      </div>
                                    `}
                              </div>
                            </div>
                          </a>
                        `
                      )}
                    </div>
                  `}
            </div>
          </div>
          <div
            class="conversation--layout--main ${req.query
              .onlyConversationLayoutSidebarOnSmallScreen === "true" ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? "single-column--hidden"
              : ""}"
            style="${css`
              @media (min-width: 900px) {
                flex: 1;
              }
            `}"
          >
            <div
              style="${css`
                @media (min-width: 900px) {
                  max-width: var(--width--2xl);
                  margin-left: var(--space--8);
                }
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
    });

  interface Partials {
    textEditor: (_?: {
      name?: string;
      value?: string;
      required?: boolean;
    }) => HTML;
  }
  app.locals.partials.textEditor = ({
    name = "content",
    value = "",
    required = true,
  } = {}): HTML => html`
    <div class="text-editor">
      <div
        style="${css`
          display: flex;

          & > label {
            display: grid;
            cursor: pointer;

            & > * {
              grid-area: 1 / 1;
            }

            & > span {
              padding: var(--space--1) var(--space--3) var(--space--3);
              border-bottom-left-radius: var(--border-radius--0);
              border-bottom-right-radius: var(--border-radius--0);
              display: flex;
              gap: var(--space--2);
            }

            & > :checked + span {
              background-color: var(--color--gray--medium--200);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--700);
              }
            }
          }
        `}"
      >
        <label>
          <input
            type="radio"
            name="text-editor--mode"
            autocomplete="off"
            checked
            class="text-editor--button--write"
            onclick="${javascript`
              this.closest(".text-editor").querySelector(".text-editor--write").hidden = false;
              this.closest(".text-editor").querySelector(".text-editor--loading").hidden = true;
              this.closest(".text-editor").querySelector(".text-editor--preview").hidden = true;
            `}"
          />
          <span class="button button--transparent">
            <i class="bi bi-pencil"></i>
            Write
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="text-editor--mode"
            autocomplete="off"
            class="text-editor--button--preview"
            onclick="${javascript`
              (async () => {
                const write = this.closest(".text-editor").querySelector(".text-editor--write");
                const loading = this.closest(".text-editor").querySelector(".text-editor--loading");
                const preview = this.closest(".text-editor").querySelector(".text-editor--preview");
                const textarea = write.querySelector("textarea");
                textarea.required = true;
                const isWriteValid = isValid(write);
                textarea.required = ${JSON.stringify(required)};
                if (!isWriteValid) {
                  event.preventDefault();
                  return;
                }
                write.hidden = true;
                loading.hidden = false;
                preview.hidden = true;
                preview.innerHTML = await (
                  await fetch("${
                    app.locals.settings.url
                  }/text-editor/preview", {
                    method: "POST",
                    body: new URLSearchParams({ content: textarea.value }),
                  })
                ).text();
                write.hidden = true;
                loading.hidden = true;
                preview.hidden = false;
              })();
            `}"
          />
          <span
            class="button button--transparent"
            data-ondomcontentloaded="${javascript`
              Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+p", () => { this.click(); return false; });
              tippy(this, {
                content: ${JSON.stringify(html`
                  <span class="keyboard-shortcut">
                    Ctrl+Shift+P or
                    <span class="keyboard-shortcut--cluster"
                      ><i class="bi bi-shift"></i
                      ><i class="bi bi-command"></i>P</span
                    >
                  </span>
                `)},
                allowHTML: true,
                touch: false,
              });
            `}"
          >
            <i class="bi bi-eyeglasses"></i>
            Preview
          </span>
        </label>
      </div>
      <div
        style="${css`
          background-color: var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
          }
          border-radius: var(--border-radius--lg);
          position: relative;
          margin-top: var(--space---2);
        `}"
      >
        <div class="text-editor--write">
          <div
            style="${css`
              padding: var(--space--1) var(--space--0);
              margin: var(--space--0) var(--space--2);
              overflow-x: auto;
              display: flex;
              gap: var(--space--2);
              & > * {
                display: flex;
              }
            `}"
          >
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+1", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Heading 1
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+1 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>1</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "# ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-type-h1"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+2", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Heading 2
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+2 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>2</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "## ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-type-h2"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+3", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Heading 3
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+3 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>3</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "### ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-type-h3"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+b", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Bold
                    <span class="keyboard-shortcut">
                      (Ctrl+B or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-command"></i>B</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, "**");
                element.focus();
              `}"
              >
                <i class="bi bi-type-bold"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+i", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Italic
                    <span class="keyboard-shortcut">
                      (Ctrl+I or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-command"></i>I</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, "_");
                element.focus();
              `}"
              >
                <i class="bi bi-type-italic"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+k", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Link
                    <span class="keyboard-shortcut">
                      (Ctrl+K or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-command"></i>K</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, "[", "](https://example.com)");
                element.focus();
              `}"
              >
                <i class="bi bi-link"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+8", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Bulleted List
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+8 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>8</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "- ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-list-ul"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+7", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Numbered List
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+7 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>7</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "1. ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-list-ol"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+9", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Checklist
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+9 or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>9</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "- [ ] ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-ui-checks"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+'", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Quote
                    <span class="keyboard-shortcut">
                      (Ctrl+' or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-command"></i>'</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> ", "\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-chat-left-quote"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+t", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Table
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+T or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>T</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                const gapLength = element.selectionEnd - element.selectionStart + 2;
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "| ", " |  |\\n|" + "-".repeat(gapLength) + "|--|\\n|" + " ".repeat(gapLength) + "|  |\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-table"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+d", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Disclosure
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+D or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>D</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "<details>\\n<summary>", "</summary>\\n\\nContent\\n\\n</details>\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-chevron-bar-expand"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+e", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Inline Code
                    <span class="keyboard-shortcut">
                      (Ctrl+E or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-command"></i>E</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, "\`");
                element.focus();
              `}"
              >
                <i class="bi bi-code"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+e", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Code Block
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+E or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>E</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "\`\`\`language\\n", "\\n\`\`\`\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-code-square"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+e", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Inline Equation
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+E or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>E</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, "$");
                element.focus();
              `}"
              >
                <i class="bi bi-calculator"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+alt+shift+e", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Equation Block
                    <span class="keyboard-shortcut">
                      (Ctrl+Alt+Shift+E or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i><i class="bi bi-alt"></i
                        ><i class="bi bi-command"></i>E</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                const element = this.closest(".text-editor").querySelector('[name="content"]');
                textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "$$\\n", "\\n$$\\n\\n");
                element.focus();
              `}"
              >
                <i class="bi bi-calculator-fill"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+u", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Mention User
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+U or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>U</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                alert("TODO: Mention User");
              `}"
              >
                <i class="bi bi-at"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+j", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Refer to Conversation or Message
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+J or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>J</span
                      >)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                alert("TODO: Refer to Conversation or Message");
              `}"
              >
                <i class="bi bi-hash"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+i", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Image
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+I or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>I</span
                      >
                      or drag-and-drop or copy-and-paste)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                this.closest(".text-editor").querySelector(".attachments").click();
              `}"
              >
                <i class="bi bi-image"></i>
              </button>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                Mousetrap(this.closest(".text-editor").querySelector('[name="content"]')).bind("mod+shift+k", () => { this.click(); return false; });
                tippy(this, {
                  content: ${JSON.stringify(html`
                    Attachment
                    <span class="keyboard-shortcut">
                      (Ctrl+Shift+K or
                      <span class="keyboard-shortcut--cluster"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>K</span
                      >
                      or drag-and-drop or copy-and-paste)
                    </span>
                  `)},
                  touch: false,
                  allowHTML: true,
                });
              `}"
                onclick="${javascript`
                this.closest(".text-editor").querySelector(".attachments").click();
              `}"
              >
                <i class="bi bi-paperclip"></i>
              </button>
              <input
                type="file"
                class="attachments"
                multiple
                hidden
                data-skip-is-modified="true"
                data-ondomcontentloaded="${javascript`
                this.upload = async (fileList) => {
                  const element = this.closest(".text-editor").querySelector('[name="content"]');
                  // TODO: Give some visual indication of progress.
                  element.disabled = true;
                  const body = new FormData();
                  for (const file of fileList) body.append("attachments", file);
                  const response = await (await fetch("${app.locals.settings.url}/text-editor/attachments", {
                    method: "POST",
                    body,
                  })).text();
                  element.disabled = false;
                  textFieldEdit.wrapSelection(element, response, "");
                  element.focus();
                };
              `}"
                onchange="${javascript`
                (async () => {
                  await this.upload(this.files);
                  this.value = "";
                })();
              `}"
              />
            </div>
            <div>
              <button
                type="button"
                class="button button--icon button--transparent"
                data-ondomcontentloaded="${javascript`
                tippy(this, {
                  content: "Help",
                  touch: false,
                });
                tippy(this, {
                  content: this.nextElementSibling.firstElementChild,
                  trigger: "click",
                  interactive: true,
                });
              `}"
              >
                <i class="bi bi-info-circle"></i>
              </button>
              <div hidden>
                <div>
                  <p class="text">
                    You may style text with
                    <a
                      href="https://guides.github.com/features/mastering-markdown/"
                      target="_blank"
                      >GitHub Flavored Markdown</a
                    >
                    and include mathematical formulas with
                    <a
                      href="https://katex.org/docs/supported.html"
                      target="_blank"
                      >LaTeX</a
                    >.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <textarea
            name="${name}"
            $${required ? html`required` : html``}
            class="input--text"
            style="${css`
              height: var(--space--20);
              transition-property: var(--transition-property--all);
              transition-duration: var(--transition-duration--150);
              transition-timing-function: var(
                --transition-timing-function--in-out
              );
              &.drag {
                background-color: var(--color--blue--200);
              }
            `}"
            onfocus="${javascript`
            this.style.height = "var(--space--52)";
          `}"
            ondragenter="${javascript`
            this.classList.add("drag");
          `}"
            ondragover="${javascript`
            event.preventDefault(); // TODO: Firefox seems to require this. Investigate more.
          `}"
            ondrop="${javascript`
            event.preventDefault();
            // TODO: I read somewhere that some browsers also need ‘event.stopPropagation()’. Investigate.
            this.classList.remove("drag");
            this.closest(".text-editor").querySelector(".attachments").upload(event.dataTransfer.files);
          `}"
            ondragleave="${javascript`
            this.classList.remove("drag");
          `}"
            onpaste="${javascript`
            if (event.clipboardData.files.length === 0) return;
            event.preventDefault();
            this.closest(".text-editor").querySelector(".attachments").upload(event.clipboardData.files);
          `}"
          >
${value}</textarea
          >
        </div>

        <div
          hidden
          class="text-editor--loading strong"
          style="${css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: var(--space--2);
          `}"
        >
          $${app.locals.partials.logo} Loading…
        </div>

        <div
          hidden
          class="text-editor--preview text"
          style="${css`
            padding: var(--space--4);
          `}"
        >
          Preview
        </div>
      </div>
    </div>
  `;

  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/text-editor/attachments",
    ...app.locals.middlewares.isSignedIn,
    asyncHandler(async (req, res, next) => {
      if (req.files?.attachments === undefined) return next("validation");
      const attachmentsMarkdowns: string[] = [];
      for (const attachment of Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments]) {
        const relativePath = `files/${cryptoRandomString({
          length: 20,
          type: "numeric",
        })}/${attachment.name}`;
        await attachment.mv(path.join(rootDirectory, relativePath));
        // TODO: URI encode relative path.
        const url = `${app.locals.settings.url}/${relativePath}`;
        if (attachment.mimetype.startsWith("image/")) {
          // TODO: Handle error on sharp constructor: https://sharp.pixelplumbing.com/api-constructor / https://sharp.pixelplumbing.com/api-input
          const metadata = await sharp(attachment.data).metadata();
          if (metadata.width !== undefined && metadata.density !== undefined) {
            // TODO: Resize big images.
            attachmentsMarkdowns.push(
              markdown`<img src="${url}" alt="${attachment.name}" width="${
                metadata.density < 100 ? metadata.width / 2 : metadata.width
              }" />`
            );
            continue;
          }
        }
        attachmentsMarkdowns.push(markdown`[${attachment.name}](${url})`);
      }
      // TODO: Handle spacing more intelligently.
      res.send(attachmentsMarkdowns.join(" "));
    })
  );

  // TODO: Verify the security of this: https://expressjs.com/en/4x/api.html#express.static
  // TODO: Move this route to a more generic place.
  app.get<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/files/*",
    ...app.locals.middlewares.isSignedIn,
    express.static(rootDirectory)
  );

  // TODO: Would making this async speed things up in any way?
  interface Partials {
    textProcessor: (
      text: string,
      _?: {
        req?: express.Request<
          {},
          any,
          {},
          {},
          IsEnrolledInCourseMiddlewareLocals
        >;
        res?: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
      }
    ) => HTML;
  }
  app.locals.partials.textProcessor = await (async () => {
    const markdownProcessor = unified()
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
      .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
      .use(() => (tree) => {
        unistUtilVisit(tree, (node) => {
          if (node.properties !== undefined && node.position !== undefined)
            (node.properties as any).dataPosition = JSON.stringify(
              node.position
            );
        });
      })
      .use(rehypeStringify);

    return (
      text: string,
      {
        req,
        res,
      }: {
        req?: express.Request<
          {},
          any,
          {},
          {},
          IsEnrolledInCourseMiddlewareLocals
        >;
        res?: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
      } = {}
    ) => {
      const processedMarkdown = markdownProcessor.processSync(text).toString();
      if (res === undefined) return processedMarkdown;
      const document = JSDOM.fragment(html`<div>$${processedMarkdown}</div>`);
      (function traverse(node: Node): void {
        switch (node.nodeType) {
          case node.TEXT_NODE:
            const parentElement = node.parentElement;
            if (
              parentElement === null ||
              parentElement.closest("a, code") !== null
            )
              return;
            const textContent = node.textContent;
            if (textContent === null) return;
            let newNodeHTML = html`${textContent}`;
            newNodeHTML = newNodeHTML.replace(
              /#(\d+)(?:\/(\d+))?/g,
              (match, conversation, message) => {
                // TODO: Check that the conversation/message is accessible by user.
                // TODO: Do a tooltip to reveal what would be under the link.
                return html`<a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/conversations/${conversation}${message ===
                  undefined
                    ? ""
                    : `#message--${message}`}"
                  >${match}</a
                >`;
              }
            );
            parentElement.replaceChild(JSDOM.fragment(newNodeHTML), node);
            break;
        }
        if (node.hasChildNodes())
          for (const childNode of node.childNodes) traverse(childNode);
      })(document);
      return document.firstElementChild!.innerHTML;
    };
  })();

  app.post<{}, any, { content?: string }, {}, IsSignedInMiddlewareLocals>(
    "/text-editor/preview",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");

      // TODO: Pass {req, res} here to enable rendering of mentions and references.
      res.send(app.locals.partials.textProcessor(req.body.content));
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    { search?: string; tag?: string },
    IsEnrolledInCourseMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/new",
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.eventSource,
    (req, res) => {
      res.send(
        (res.locals.course.nextConversationReference === 1
          ? app.locals.layouts.main
          : app.locals.layouts.conversation)({
          req,
          res,
          head: html`
            <title>
              Start a New Conversation · ${res.locals.course.name} · CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading">
                <i class="bi bi-chat-left-text"></i>
                Start a New Conversation
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/conversations"
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <input
                  type="text"
                  name="title"
                  placeholder="Title"
                  required
                  autocomplete="off"
                  autofocus
                  class="input--text"
                />

                $${app.locals.partials.textEditor()}

                <div
                  style="${css`
                    display: flex;
                    gap: var(--space--8);
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div
                          style="${css`
                            display: flex;
                          `}"
                        >
                          <label
                            style="${css`
                              display: grid;
                              & > * {
                                grid-area: 1 / 1;
                              }
                            `}"
                          >
                            <input
                              type="checkbox"
                              name="isPinned"
                              autocomplete="off"
                            />
                            <span
                              class="button button--icon button--transparent"
                              style="${css`
                                :checked + & {
                                  display: none;
                                }
                              `}"
                              data-ondomcontentloaded="${javascript`
                                tippy(this, {
                                  content: "Pin",
                                  touch: false,
                                });
                              `}"
                            >
                              <i class="bi bi-pin-angle"></i>
                              Unpinned
                            </span>
                            <span
                              class="button button--icon button--transparent strong"
                              style="${css`
                                :not(:checked) + * + & {
                                  display: none;
                                }
                              `}"
                              data-ondomcontentloaded="${javascript`
                                tippy(this, {
                                  content: "Unpin",
                                  touch: false,
                                });
                              `}"
                            >
                              <i class="bi bi-pin-fill"></i>
                              Pinned
                            </span>
                          </label>
                          <button
                            type="button"
                            class="button button--icon button--transparent"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Pinned conversations are listed first.",
                                trigger: "click",
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </div>
                      `
                    : html``}

                  <label
                    style="${css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }
                    `}"
                  >
                    <input
                      type="checkbox"
                      name="isQuestion"
                      autocomplete="off"
                      $${res.locals.enrollment.role === "staff"
                        ? ``
                        : `checked`}
                    />
                    <span
                      class="button button--icon button--transparent"
                      style="${css`
                        :checked + & {
                          display: none;
                        }
                      `}"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "Mark as a Question",
                          touch: false,
                        });
                      `}"
                    >
                      <i class="bi bi-patch-question"></i>
                      Not a Question
                    </span>
                    <span
                      class="button button--icon button--transparent strong"
                      style="${css`
                        :not(:checked) + * + & {
                          display: none;
                        }
                      `}"
                      data-ondomcontentloaded="${javascript`
                        tippy(this, {
                          content: "Mark as Not a Question",
                          touch: false,
                        });
                      `}"
                    >
                      <i class="bi bi-patch-question-fill"></i>
                      Question
                    </span>
                  </label>

                  $${res.locals.tags.length === 0
                    ? html``
                    : html`
                        <div
                          class="tags"
                          style="${css`
                            display: flex;
                            gap: var(--space--4);
                            align-items: baseline;
                          `}"
                        >
                          <div
                            style="${css`
                              display: grid;
                              & > * {
                                grid-area: 1 / 1;
                              }
                            `}"
                          >
                            <button
                              type="button"
                              class="tags--button button"
                              data-ondomcontentloaded="${javascript`
                                this.addTag = tippy(this, {
                                  content: "Add Tag",
                                  touch: false,
                                });
                                this.noMoreTagsToAdd = tippy(this, {
                                  content: "No more tags to add",
                                  touch: false,
                                });
                                this.noMoreTagsToAdd.disable();
                                this.dropdownContent = this.nextElementSibling.firstElementChild;
                                this.dropdown = tippy(this, {
                                  content: this.dropdownContent,
                                  trigger: "click",
                                  interactive: true,
                                });
                              `}"
                            >
                              <span>
                                <i class="bi bi-tags"></i>
                                Tags
                              </span>
                            </button>
                            <div hidden>
                              <div
                                style="${css`
                                  max-height: var(--space--40);
                                  overflow: auto;
                                  margin: var(--space--0) var(--space---2);
                                `}"
                              >
                                <div
                                  style="${css`
                                    margin: var(--space--0) var(--space--2);
                                  `}"
                                >
                                  $${res.locals.tags.map(
                                    (tag) =>
                                      html`
                                        <button
                                          type="button"
                                          class="tag--${tag.reference}--enable dropdown-menu--item button button--transparent"
                                          onclick="${javascript`
                                            (async () => {
                                              const tags = this.closest(".tags");
                                              const tag = tags.querySelector(".tag--${tag.reference}");
                                              tag.hidden = false;
                                              const input = tag.querySelector("input");
                                              input.disabled = false;
                                              input.dataset.forceIsModified = true;
                                              if ([...this.parentElement.children].filter((element) => !element.hidden).length === 1) {
                                                const tagsButton = tags.querySelector(".tags--button");
                                                tagsButton.addTag.disable();
                                                tagsButton.noMoreTagsToAdd.enable();
                                                tagsButton.dropdown.disable();
                                                await new Promise((resolve) => window.setTimeout(resolve, tippy.defaultProps.duration));
                                              }
                                              this.hidden = true;
                                            })();
                                          `}"
                                        >
                                          <i class="bi bi-tag"></i>
                                          ${tag.name}
                                        </button>
                                      `
                                  )}
                                </div>
                              </div>
                            </div>
                            <input
                              type="radio"
                              data-ondomcontentloaded="${javascript`
                                (this.validators ??= []).push(() => {
                                  if (this.closest(".tags").querySelector('[name="tagsReferences[]"]:not([disabled])') === null)
                                    return "Select at least one tag.";
                                });
                                this.closest(".tags").querySelector(".tags--button").addEventListener("click", () => { this.click(); });
                              `}"
                            />
                          </div>
                          $${res.locals.tags.map(
                            (tag) =>
                              html`
                                <div class="tag--${tag.reference}" hidden>
                                  <input
                                    type="hidden"
                                    name="tagsReferences[]"
                                    value="${tag.reference}"
                                    disabled
                                  />
                                  <button
                                    type="button"
                                    class="button"
                                    style="${css`
                                      font-size: var(--font-size--xs);
                                      line-height: var(--line-height--xs);
                                    `}"
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: "Remove Tag",
                                        touch: false,
                                      });
                                    `}"
                                    onclick="${javascript`
                                      const tag = this.closest(".tag--${tag.reference}");
                                      tag.hidden = true;
                                      const input = tag.querySelector("input");
                                      input.disabled = true;
                                      input.dataset.forceIsModified = false;
                                      const tagsButton = this.closest(".tags").querySelector(".tags--button")
                                      tagsButton.addTag.enable();
                                      tagsButton.noMoreTagsToAdd.disable();
                                      tagsButton.dropdown.enable();
                                      tagsButton.dropdownContent.querySelector(".tag--${tag.reference}--enable").hidden = false;
                                    `}"
                                  >
                                    <span>
                                      <i class="bi bi-tag"></i>
                                      ${tag.name}
                                    </span>
                                  </button>
                                </div>
                              `
                          )}
                        </div>
                      `}
                </div>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                    data-ondomcontentloaded="${javascript`
                      Mousetrap(this.closest("form").querySelector('[name="content"]')).bind("mod+enter", () => { this.click(); return false; });
                      tippy(this, {
                        content: ${JSON.stringify(html`
                          <span class="keyboard-shortcut">
                            Ctrl+Enter or
                            <span class="keyboard-shortcut--cluster"
                              ><i class="bi bi-command"></i
                              ><i class="bi bi-arrow-return-left"></i
                            ></span>
                          </span>
                        `)},
                        touch: false,
                        allowHTML: true,
                      });
                    `}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start Conversation
                  </button>
                </div>
              </form>
            </div>
          `,
        })
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
      tagsReferences?: string[];
    },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      req.body.tagsReferences ??= [];
      if (
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        (req.body.isPinned && res.locals.enrollment.role !== "staff") ||
        !Array.isArray(req.body.tagsReferences) ||
        (res.locals.tags.length > 0 &&
          (req.body.tagsReferences.length === 0 ||
            new Set(req.body.tagsReferences).size <
              req.body.tagsReferences.length ||
            req.body.tagsReferences.some(
              (tagReference) =>
                typeof tagReference !== "string" ||
                !res.locals.tags.some(
                  (existingTag) => tagReference === existingTag.reference
                )
            )))
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            res.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      // FIXME: Use ‘RETURNING *’. See https://github.com/JoshuaWise/better-sqlite3/issues/654.
      const conversationId = Number(
        app.locals.database.run(
          sql`
            INSERT INTO "conversations" ("course", "reference", "title", "nextMessageReference", "pinnedAt", "questionAt")
            VALUES (
              ${res.locals.course.id},
              ${String(res.locals.course.nextConversationReference)},
              ${req.body.title},
              ${"2"},
              ${req.body.isPinned ? new Date().toISOString() : null},
              ${req.body.isQuestion ? new Date().toISOString() : null}
            )
          `
        ).lastInsertRowid
      );
      app.locals.database.run(
        sql`
          INSERT INTO "messages" ("conversation", "reference", "authorEnrollment", "content")
          VALUES (
            ${conversationId},
            ${"1"},
            ${res.locals.enrollment.id},
            ${req.body.content}
          )
        `
      );
      for (const tagReference of req.body.tagsReferences)
        app.locals.database.run(
          sql`
            INSERT INTO "taggings" ("conversation", "tag")
            VALUES (
              ${conversationId},
              ${
                res.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.course.nextConversationReference}`
      );
    }
  );

  interface Middlewares {
    isConversationAccessible: express.RequestHandler<
      { courseReference: string; conversationReference: string },
      HTML,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >[];
  }
  interface IsConversationAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    conversation: IsEnrolledInCourseMiddlewareLocals["conversations"][number];
    messages: {
      id: number;
      createdAt: string;
      updatedAt: string;
      reference: string;
      authorEnrollment: IsConversationAccessibleMiddlewareLocals["conversation"]["authorEnrollment"];
      content: string;
      answerAt: string | null;
      endorsements: IsConversationAccessibleMiddlewareLocals["conversation"]["endorsements"];
      likes: {
        id: number;
        enrollment: IsConversationAccessibleMiddlewareLocals["conversation"]["authorEnrollment"];
      }[];
    }[];
  }
  app.locals.middlewares.isConversationAccessible = [
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      const conversation = app.locals.database.get<{
        id: number;
        reference: string;
        title: string;
        nextMessageReference: number;
        pinnedAt: string | null;
        questionAt: string | null;
      }>(
        sql`
          SELECT "conversations"."id",
                 "conversations"."reference",
                 "conversations"."title",
                 "conversations"."nextMessageReference",
                 "conversations"."pinnedAt",
                 "conversations"."questionAt"
          FROM "conversations"
          WHERE "conversations"."reference" = ${req.params.conversationReference}
        `
      );
      if (conversation === undefined) return next("route");
      const originalMessage = app.locals.database.get<{
        createdAt: string;
        authorEnrollmentId: number | null;
        authorUserId: number | null;
        authorUserEmail: string | null;
        authorUserName: string | null;
        authorUserAvatar: string | null;
        authorUserBiography: string | null;
        authorEnrollmentReference: string | null;
        authorEnrollmentRole: Role | null;
        likesCount: number;
      }>(
        sql`
          SELECT "messages"."createdAt",
                 "authorEnrollment"."id" AS "authorEnrollmentId",
                 "authorUser"."id" AS "authorUserId",
                 "authorUser"."email" AS "authorUserEmail",
                 "authorUser"."name" AS "authorUserName",
                 "authorUser"."avatar" AS "authorUserAvatar",
                 "authorUser"."biography" AS "authorUserBiography",
                 "authorEnrollment"."reference" AS "authorEnrollmentReference",
                 "authorEnrollment"."role" AS "authorEnrollmentRole",
                 COUNT("likes"."id") AS "likesCount"
          FROM "messages"
          LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
          LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
          LEFT JOIN "likes" ON "messages"."id" = "likes"."message"
          WHERE "messages"."conversation" = ${conversation.id} AND
                "messages"."reference" = ${"1"}
          GROUP BY "messages"."id"
        `
      )!;
      const mostRecentlyUpdatedMessage = app.locals.database.get<{
        updatedAt: string;
      }>(
        sql`
          SELECT "messages"."updatedAt"
          FROM "messages"
          WHERE "messages"."conversation" = ${conversation.id}
          ORDER BY "messages"."updatedAt" DESC
          LIMIT 1
        `
      )!;
      const messagesCount = app.locals.database.get<{
        messagesCount: number;
      }>(
        sql`SELECT COUNT(*) AS "messagesCount" FROM "messages" WHERE "messages"."conversation" = ${conversation.id}`
      )!.messagesCount;
      const endorsements =
        conversation.questionAt === null
          ? []
          : app.locals.database
              .all<{
                id: number;
                enrollmentId: number | null;
                userId: number | null;
                userEmail: string | null;
                userName: string | null;
                userAvatar: string | null;
                userBiography: string | null;
                enrollmentReference: string | null;
                enrollmentRole: Role | null;
              }>(
                sql`
                    SELECT "endorsements"."id",
                           "enrollments"."id" AS "enrollmentId",
                           "users"."id" AS "userId",
                           "users"."email" AS "userEmail",
                           "users"."name" AS "userName",
                           "users"."avatar" AS "userAvatar",
                           "users"."biography" AS "userBiography",      
                           "enrollments"."reference" AS "enrollmentReference",
                           "enrollments"."role" AS "enrollmentRole"
                    FROM "endorsements"
                    JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
                    JOIN "users" ON "enrollments"."user" = "users"."id"
                    JOIN "messages" ON "endorsements"."message" = "messages"."id"
                    WHERE "messages"."conversation" = ${conversation.id}
                    ORDER BY "endorsements"."id" ASC
                  `
              )
              .map((endorsement) => ({
                id: endorsement.id,
                enrollment:
                  endorsement.enrollmentId !== null &&
                  endorsement.userId !== null &&
                  endorsement.userEmail !== null &&
                  endorsement.userName !== null &&
                  endorsement.enrollmentReference !== null &&
                  endorsement.enrollmentRole !== null
                    ? {
                        id: endorsement.enrollmentId,
                        user: {
                          id: endorsement.userId,
                          email: endorsement.userEmail,
                          name: endorsement.userName,
                          avatar: endorsement.userAvatar,
                          biography: endorsement.userBiography,
                        },
                        reference: endorsement.enrollmentReference,
                        role: endorsement.enrollmentRole,
                      }
                    : app.locals.constants.anonymousEnrollment,
              }));
      const taggings = app.locals.database
        .all<{
          id: number;
          tagId: number;
          tagReference: string;
          tagName: string;
          tagVisibleBy: TagVisibleBy;
        }>(
          sql`
          SELECT "taggings"."id",
                 "tags"."id" AS "tagId",
                 "tags"."reference" AS "tagReference",
                 "tags"."name" AS "tagName",
                 "tags"."visibleBy" AS "tagVisibleBy"
          FROM "taggings"
          JOIN "tags" ON "taggings"."tag" = "tags"."id"
          WHERE "taggings"."conversation" = ${conversation.id}
          $${
            res.locals.enrollment.role === "student"
              ? sql`AND "tags"."visibleBy" = 'everyone'`
              : sql``
          }
          ORDER BY "tags"."id" ASC
        `
        )
        .map((tagging) => ({
          id: tagging.id,
          tag: {
            id: tagging.tagId,
            reference: tagging.tagReference,
            name: tagging.tagName,
            visibleBy: tagging.tagVisibleBy,
          },
        }));
      res.locals.conversation = {
        id: conversation.id,
        reference: conversation.reference,
        title: conversation.title,
        nextMessageReference: conversation.nextMessageReference,
        pinnedAt: conversation.pinnedAt,
        questionAt: conversation.questionAt,
        createdAt: originalMessage.createdAt,
        updatedAt: mostRecentlyUpdatedMessage.updatedAt,
        authorEnrollment:
          originalMessage.authorEnrollmentId !== null &&
          originalMessage.authorUserId !== null &&
          originalMessage.authorUserEmail !== null &&
          originalMessage.authorUserName !== null &&
          originalMessage.authorEnrollmentReference !== null &&
          originalMessage.authorEnrollmentRole !== null
            ? {
                id: originalMessage.authorEnrollmentId,
                user: {
                  id: originalMessage.authorUserId,
                  email: originalMessage.authorUserEmail,
                  name: originalMessage.authorUserName,
                  avatar: originalMessage.authorUserAvatar,
                  biography: originalMessage.authorUserBiography,
                },
                reference: originalMessage.authorEnrollmentReference,
                role: originalMessage.authorEnrollmentRole,
              }
            : app.locals.constants.anonymousEnrollment,
        messagesCount,
        endorsements,
        likesCount: originalMessage.likesCount,
        taggings,
      };

      res.locals.messages = app.locals.database
        .all<{
          id: number;
          createdAt: string;
          updatedAt: string;
          reference: string;
          authorEnrollmentId: number | null;
          authorUserId: number | null;
          authorUserEmail: string | null;
          authorUserName: string | null;
          authorUserAvatar: string | null;
          authorUserBiography: string | null;
          authorEnrollmentReference: Role | null;
          authorEnrollmentRole: Role | null;
          content: string;
          answerAt: string | null;
        }>(
          sql`
            SELECT "messages"."id",
                   "messages"."createdAt",
                   "messages"."updatedAt",
                   "messages"."reference",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email" AS "authorUserEmail",
                   "authorUser"."name" AS "authorUserName",
                   "authorUser"."avatar" AS "authorUserAvatar",
                   "authorUser"."biography" AS "authorUserBiography",
                   "authorEnrollment"."reference" AS "authorEnrollmentReference",
                   "authorEnrollment"."role" AS "authorEnrollmentRole",
                   "messages"."content",
                   "messages"."answerAt"
            FROM "messages"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
            WHERE "messages"."conversation" = ${conversation.id}
            ORDER BY "messages"."id" ASC
          `
        )
        .map((message) => {
          // FIXME: Try to get rid of these n+1 queries.
          const endorsements = app.locals.database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userBiography: string | null;
              enrollmentReference: string | null;
              enrollmentRole: Role | null;
            }>(
              sql`
                SELECT "endorsements"."id",
                       "enrollments"."id" AS "enrollmentId",
                       "users"."id" AS "userId",
                       "users"."email" AS "userEmail",
                       "users"."name" AS "userName",
                       "users"."avatar" AS "userAvatar",
                       "users"."biography" AS "userBiography",
                       "enrollments"."reference" AS "enrollmentReference",
                       "enrollments"."role" AS "enrollmentRole"
                FROM "endorsements"
                JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE "endorsements"."message" = ${message.id}
                ORDER BY "endorsements"."id" ASC
              `
            )
            .map((endorsement) => ({
              id: endorsement.id,
              enrollment:
                endorsement.enrollmentId !== null &&
                endorsement.userId !== null &&
                endorsement.userEmail !== null &&
                endorsement.userName !== null &&
                endorsement.enrollmentReference !== null &&
                endorsement.enrollmentRole !== null
                  ? {
                      id: endorsement.enrollmentId,
                      user: {
                        id: endorsement.userId,
                        email: endorsement.userEmail,
                        name: endorsement.userName,
                        avatar: endorsement.userAvatar,
                        biography: endorsement.userBiography,
                      },
                      reference: endorsement.enrollmentReference,
                      role: endorsement.enrollmentRole,
                    }
                  : app.locals.constants.anonymousEnrollment,
            }));
          const likes = app.locals.database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userBiography: string | null;
              enrollmentReference: string | null;
              enrollmentRole: Role | null;
            }>(
              sql`
                SELECT "likes"."id",
                       "enrollments"."id" AS "enrollmentId",
                       "users"."id" AS "userId",
                       "users"."email" AS "userEmail",
                       "users"."name" AS "userName",
                       "users"."avatar" AS "userAvatar",
                       "users"."biography" AS "userBiography",
                       "enrollments"."reference" AS "enrollmentReference",
                       "enrollments"."role" AS "enrollmentRole"
                FROM "likes"
                LEFT JOIN "enrollments" ON "likes"."enrollment" = "enrollments"."id"
                LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE "likes"."message" = ${message.id}
                ORDER BY "likes"."id" ASC
              `
            )
            .map((like) => ({
              id: like.id,
              enrollment:
                like.enrollmentId !== null &&
                like.userId !== null &&
                like.userEmail !== null &&
                like.userName !== null &&
                like.enrollmentReference !== null &&
                like.enrollmentRole !== null
                  ? {
                      id: like.enrollmentId,
                      user: {
                        id: like.userId,
                        email: like.userEmail,
                        name: like.userName,
                        avatar: like.userAvatar,
                        biography: like.userBiography,
                      },
                      reference: like.enrollmentReference,
                      role: like.enrollmentRole,
                    }
                  : app.locals.constants.anonymousEnrollment,
            }));

          return {
            id: message.id,
            createdAt: message.createdAt,
            updatedAt: message.updatedAt,
            reference: message.reference,
            authorEnrollment:
              message.authorEnrollmentId !== null &&
              message.authorUserId !== null &&
              message.authorUserEmail !== null &&
              message.authorUserName !== null &&
              message.authorEnrollmentReference !== null &&
              message.authorEnrollmentRole !== null
                ? {
                    id: message.authorEnrollmentId,
                    user: {
                      id: message.authorUserId,
                      email: message.authorUserEmail,
                      name: message.authorUserName,
                      avatar: message.authorUserAvatar,
                      biography: message.authorUserBiography,
                    },
                    reference: message.authorEnrollmentReference,
                    role: message.authorEnrollmentRole,
                  }
                : app.locals.constants.anonymousEnrollment,
            content: message.content,
            answerAt: message.answerAt,
            endorsements,
            likes,
          };
        });

      next();
    },
  ];

  interface Helpers {
    mayEditConversation: (
      req: express.Request<
        { courseReference: string; conversationReference: string },
        any,
        {},
        {},
        IsConversationAccessibleMiddlewareLocals
      >,
      res: express.Response<any, IsConversationAccessibleMiddlewareLocals>
    ) => boolean;
  }
  app.locals.helpers.mayEditConversation = (req, res) =>
    res.locals.enrollment.role === "staff" ||
    res.locals.conversation.authorEnrollment.id === res.locals.enrollment.id;

  interface Middlewares {
    mayEditConversation: express.RequestHandler<
      {
        courseReference: string;
        conversationReference: string;
      },
      any,
      {},
      {},
      MayEditConversationMiddlewareLocals
    >[];
  }
  interface MayEditConversationMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {}
  app.locals.middlewares.mayEditConversation = [
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      if (app.locals.helpers.mayEditConversation(req, res)) return next();
      next("route");
    },
  ];

  interface Middlewares {
    messageExists: express.RequestHandler<
      {
        courseReference: string;
        conversationReference: string;
        messageReference: string;
      },
      any,
      {},
      {},
      MessageExistsMiddlewareLocals
    >[];
  }
  interface MessageExistsMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {
    message: IsConversationAccessibleMiddlewareLocals["messages"][number];
  }
  app.locals.middlewares.messageExists = [
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      const message = res.locals.messages.find(
        (message) => message.reference === req.params.messageReference
      );
      if (message === undefined) return next("route");
      res.locals.message = message;
      next();
    },
  ];

  interface Helpers {
    mayEditMessage: (
      req: express.Request<
        { courseReference: string; conversationReference: string },
        any,
        {},
        {},
        IsConversationAccessibleMiddlewareLocals
      >,
      res: express.Response<any, IsConversationAccessibleMiddlewareLocals>,
      message: MessageExistsMiddlewareLocals["message"]
    ) => boolean;
  }
  app.locals.helpers.mayEditMessage = (req, res, message) =>
    res.locals.enrollment.role === "staff" ||
    message.authorEnrollment.id === res.locals.enrollment.id;

  interface Middlewares {
    mayEditMessage: express.RequestHandler<
      {
        courseReference: string;
        conversationReference: string;
        messageReference: string;
      },
      any,
      {},
      {},
      MayEditMessageMiddlewareLocals
    >[];
  }
  interface MayEditMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  app.locals.middlewares.mayEditMessage = [
    ...app.locals.middlewares.messageExists,
    (req, res, next) => {
      if (app.locals.helpers.mayEditMessage(req, res, res.locals.message))
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      onlyConversationLayoutSidebarOnSmallScreen?: "true";
      conversationLayoutSidebarOpenOnSmallScreen?: "true";
      search?: string;
      tag?: string;
    },
    IsConversationAccessibleMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...app.locals.middlewares.isConversationAccessible,
    ...app.locals.middlewares.eventSource,
    (req, res) => {
      res.send(
        app.locals.layouts.conversation({
          req,
          res,
          head: html`
            <title>
              ${res.locals.conversation.title} · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <div class="title">
              <div
                class="title--show"
                style="${css`
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                  gap: var(--space--4);
                `}"
              >
                <h2>
                  <span class="heading">${res.locals.conversation.title}</span>

                  <a
                    href="${app.locals.settings.url}/courses/${res.locals.course
                      .reference}/conversations/${res.locals.conversation
                      .reference}"
                    class="button button--transparent"
                    style="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                    `}"
                    data-ondomcontentloaded="${javascript`
                      tippy(this, {
                        content: "Permanent Link to Conversation",
                        touch: false,
                      });
                    `}"
                    >#${res.locals.conversation.reference}</a
                  >
                </h2>

                <div
                  style="${css`
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div>
                          <button
                            class="button button--transparent button--rose"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Remove Conversation",
                                theme: "rose",
                                touch: false,
                              });
                              tippy(this, {
                                content: this.nextElementSibling.firstElementChild,
                                theme: "rose",
                                trigger: "click",
                                interactive: true,
                              });
                            `}"
                          >
                            <i class="bi bi-trash"></i>
                          </button>
                          <div hidden>
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/conversations/${res
                                .locals.conversation.reference}?_method=DELETE"
                              style="${css`
                                padding: var(--space--2) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `}"
                            >
                              <p>
                                Are you sure you want to remove this
                                conversation?
                              </p>
                              <p>
                                <strong
                                  style="${css`
                                    font-weight: var(--font-weight--bold);
                                  `}"
                                >
                                  You may not undo this action!
                                </strong>
                              </p>
                              <button class="button button--rose">
                                <i class="bi bi-trash"></i>
                                Remove Conversation
                              </button>
                            </form>
                          </div>
                        </div>
                      `
                    : html``}
                  $${app.locals.helpers.mayEditConversation(req, res)
                    ? html`
                        <button
                          class="button button--transparent"
                          data-ondomcontentloaded="${javascript`
                            tippy(this, {
                              content: "Edit Title",
                              touch: false,
                            });
                          `}"
                          onclick="${javascript`
                            this.closest(".title").querySelector(".title--show").hidden = true;
                            this.closest(".title").querySelector(".title--edit").hidden = false;
                          `}"
                        >
                          <i class="bi bi-pencil"></i>
                        </button>
                      `
                    : html``}
                </div>
              </div>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/conversations/${res.locals.conversation
                  .reference}?_method=PATCH"
                hidden
                class="title--edit"
                style="${css`
                  padding-bottom: var(--space--4);
                  display: flex;
                  gap: var(--space--2);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `}"
              >
                <input
                  type="text"
                  name="title"
                  value="${res.locals.conversation.title}"
                  required
                  autocomplete="off"
                  class="input--text"
                  style="${css`
                    flex: 1;
                  `}"
                />
                <div
                  style="${css`
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  <button
                    class="button button--blue"
                    style="${css`
                      flex: 1;
                    `}"
                  >
                    <i class="bi bi-pencil"></i>
                    Update Title
                  </button>
                  <button
                    type="reset"
                    class="button button--transparent button--rose"
                    data-ondomcontentloaded="${javascript`
                      tippy(this, {
                        content: "Cancel",
                        theme: "rose",
                        touch: false,
                      });
                    `}"
                    onclick="${javascript`
                      this.closest(".title").querySelector(".title--show").hidden = false;
                      this.closest(".title").querySelector(".title--edit").hidden = true;
                    `}"
                  >
                    <i class="bi bi-x-lg"></i>
                  </button>
                </div>
              </form>
            </div>

            $${(() => {
              const content: HTML[] = [];

              if (res.locals.enrollment.role === "staff")
                content.push(html`
                  <form
                    method="POST"
                    action="${app.locals.settings.url}/courses/${res.locals
                      .course.reference}/conversations/${res.locals.conversation
                      .reference}?_method=PATCH"
                  >
                    $${res.locals.conversation.pinnedAt === null
                      ? html`
                          <input type="hidden" name="isPinned" value="true" />
                          <button
                            class="button"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Pin",
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-pin-angle"></i>
                            Unpinned
                          </button>
                        `
                      : html`
                          <input type="hidden" name="isPinned" value="false" />
                          <button
                            class="button strong"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Unpin",
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-pin-fill"></i>
                            Pinned
                          </button>
                        `}
                  </form>
                `);
              else if (res.locals.conversation.pinnedAt !== null)
                content.push(html`
                  <div>
                    <i class="bi bi-pin-fill"></i>
                    Pinned
                  </div>
                `);

              if (app.locals.helpers.mayEditConversation(req, res))
                content.push(html`
                  <form
                    method="POST"
                    action="${app.locals.settings.url}/courses/${res.locals
                      .course.reference}/conversations/${res.locals.conversation
                      .reference}?_method=PATCH"
                  >
                    $${res.locals.conversation.questionAt === null
                      ? html`
                          <input type="hidden" name="isQuestion" value="true" />
                          <button
                            class="button"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Mark as a Question",
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-patch-question"></i>
                            Not a Question
                          </button>
                        `
                      : html`
                          <input
                            type="hidden"
                            name="isQuestion"
                            value="false"
                          />
                          <button
                            class="button strong"
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: "Mark as Not a Question",
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-patch-question-fill"></i>
                            Question
                          </button>
                        `}
                  </form>
                `);
              else if (res.locals.conversation.questionAt !== null)
                content.push(html`
                  <div>
                    <i class="bi bi-patch-question-fill"></i>
                    Question
                  </div>
                `);

              const tagsContent: HTML[] = [];
              if (app.locals.helpers.mayEditConversation(req, res)) {
                const remainingTags = res.locals.tags.filter(
                  (tag) =>
                    !res.locals.conversation.taggings.some(
                      (tagging) => tag.id === tagging.tag.id
                    )
                );
                if (remainingTags.length > 0)
                  tagsContent.push(html`
                    <div>
                      <button
                        class="button"
                        data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Add Tag",
                            touch: false,
                          });
                          tippy(this, {
                            content: this.nextElementSibling.firstElementChild,
                            trigger: "click",
                            interactive: true,
                           });
                        `}"
                      >
                        <i class="bi bi-tags"></i>
                        Tags
                      </button>
                      <div hidden>
                        <div
                          style="${css`
                            max-height: var(--space--40);
                            overflow: auto;
                            margin: var(--space--0) var(--space---2);
                          `}"
                        >
                          <div
                            style="${css`
                              margin: var(--space--0) var(--space--2);
                            `}"
                          >
                            $${remainingTags.map(
                              (tag) =>
                                html`
                                  <form
                                    method="POST"
                                    action="${app.locals.settings
                                      .url}/courses/${res.locals.course
                                      .reference}/conversations/${res.locals
                                      .conversation.reference}/taggings"
                                  >
                                    <input
                                      type="hidden"
                                      name="reference"
                                      value="${tag.reference}"
                                    />
                                    <button
                                      class="dropdown-menu--item button button--transparent"
                                    >
                                      <i class="bi bi-tag"></i>
                                      ${tag.name}
                                    </button>
                                  </form>
                                `
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  `);
                for (const tagging of res.locals.conversation.taggings) {
                  const isOnlyTag =
                    res.locals.conversation.taggings.length === 1;
                  tagsContent.push(html`
                    <form
                      method="POST"
                      action="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/conversations/${res.locals
                        .conversation.reference}/taggings?_method=DELETE"
                    >
                      <input
                        type="hidden"
                        name="reference"
                        value="${tagging.tag.reference}"
                      />
                      <span
                        $${isOnlyTag
                          ? html`
                              tabindex="0"
                              data-ondomcontentloaded="${javascript`
                                tippy(this, {
                                  content: "Can’t remove tag because a conversation must have at least one tag",
                                  theme: "rose",
                                  touch: false,
                                });
                              `}"
                            `
                          : html``}
                      >
                        <button
                          class="button ${isOnlyTag ? "button--rose" : ""}"
                          data-ondomcontentloaded="${javascript`
                            tippy(this, {
                              content: "Remove Tag",
                              touch: false,
                            });
                          `}"
                          $${isOnlyTag ? html`disabled` : html``}
                        >
                          <i class="bi bi-tag"></i>
                          ${tagging.tag.name}
                        </button>
                      </span>
                    </form>
                  `);
                }
              } else
                for (const tagging of res.locals.conversation.taggings)
                  tagsContent.push(html`
                    <div>
                      <i class="bi bi-tag"></i>
                      ${tagging.tag.name}
                    </div>
                  `);

              if (tagsContent.length > 0)
                // TODO: Test with too many tags (here and on the sidebar)
                content.push(html`
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                    `}"
                  >
                    $${tagsContent}
                  </div>
                `);

              return content.length === 0
                ? html``
                : html`
                    <div
                      style="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `}"
                    >
                      $${content}
                    </div>
                  `;
            })()}
            $${res.locals.messages.map(
              (message) => html`
                <div
                  id="message--${message.reference}"
                  data-content="${JSON.stringify(message.content)}"
                  class="message"
                  style="${css`
                    padding-bottom: var(--space--4);
                    border-bottom: var(--border-width--4) solid
                      var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                    margin: var(--space--4) var(--space--0);
                  `}"
                >
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--4);
                      justify-content: space-between;
                      align-items: center;
                    `}"
                  >
                    <div
                      style="${css`
                        display: flex;
                        gap: var(--space--2);
                        align-items: center;
                      `}"
                    >
                      $${message.authorEnrollment.user.avatar === null
                        ? html`
                            <div
                              style="${css`
                                font-size: var(--font-size--2xl);
                              `}"
                            >
                              <i class="bi bi-person-circle"></i>
                            </div>
                          `
                        : html`
                            <img
                              src="${message.authorEnrollment.user.avatar}"
                              alt="${message.authorEnrollment.user.name}"
                              class="avatar"
                              style="${css`
                                width: var(--font-size--2xl);
                                height: var(--font-size--2xl);
                              `}"
                            />
                          `}
                      <div>
                        <span class="strong">
                          ${message.authorEnrollment.user.name}
                        </span>
                        said
                        <time
                          data-ondomcontentloaded="${javascript`
                            relativizeTime(this);
                          `}"
                        >
                          ${message.createdAt}
                        </time>
                        $${message.updatedAt !== message.createdAt
                          ? html`
                              and last edited
                              <time
                                data-ondomcontentloaded="${javascript`
                                  relativizeTime(this);
                                `}"
                              >
                                ${message.updatedAt}
                              </time>
                            `
                          : html``}
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/conversations/${res.locals
                            .conversation
                            .reference}#message--${message.reference}"
                          class="button button--transparent"
                          style="${css`
                            font-size: var(--font-size--xs);
                            line-height: var(--line-height--xs);
                          `}"
                          data-ondomcontentloaded="${javascript`
                            tippy(this, {
                              content: "Permanent Link to Message",
                              touch: false,
                            });
                          `}"
                          >#${res.locals.conversation
                            .reference}/${message.reference}</a
                        >
                      </div>
                    </div>

                    <div
                      style="${css`
                        display: flex;
                        gap: var(--space--2);
                      `}"
                    >
                      $${res.locals.enrollment.role === "staff" &&
                      message.reference !== "1"
                        ? html`
                            <div>
                              <button
                                class="button button--transparent button--rose"
                                data-ondomcontentloaded="${javascript`
                                  tippy(this, {
                                    content: "Remove Message",
                                    theme: "rose",
                                    touch: false,
                                  });
                                  tippy(this, {
                                    content: this.nextElementSibling.firstElementChild,
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                  });
                                `}"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                              <div hidden>
                                <form
                                  method="POST"
                                  action="${app.locals.settings
                                    .url}/courses/${res.locals.course
                                    .reference}/conversations/${res.locals
                                    .conversation
                                    .reference}/messages/${message.reference}?_method=DELETE"
                                  style="${css`
                                    padding: var(--space--2) var(--space--0);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `}"
                                >
                                  <p>
                                    Are you sure you want to remove this
                                    message?
                                  </p>
                                  <p>
                                    <strong
                                      style="${css`
                                        font-weight: var(--font-weight--bold);
                                      `}"
                                    >
                                      You may not undo this action!
                                    </strong>
                                  </p>
                                  <button class="button button--rose">
                                    <i class="bi bi-trash"></i>
                                    Remove Message
                                  </button>
                                </form>
                              </div>
                            </div>
                          `
                        : html``}
                      $${app.locals.helpers.mayEditMessage(req, res, message)
                        ? html`
                            <div>
                              <button
                                class="button button--transparent"
                                data-ondomcontentloaded="${javascript`
                                  tippy(this, {
                                    content: "Edit Message",
                                    touch: false,
                                  });
                                `}"
                                onclick="${javascript`
                                  this.closest(".message").querySelector(".message--show").hidden = true;
                                  this.closest(".message").querySelector(".message--edit").hidden = false;
                                `}"
                              >
                                <i class="bi bi-pencil"></i>
                              </button>
                            </div>
                          `
                        : html``}

                      <div>
                        <button
                          class="button button--transparent"
                          data-ondomcontentloaded="${javascript`
                            tippy(this, {
                              content: "Reply",
                              touch: false,
                            });
                          `}"
                          onclick="${javascript`
                            const content = JSON.parse(this.closest("[data-content]").dataset.content);
                            const newMessage = document.querySelector(".new-message");
                            newMessage.querySelector(".text-editor--button--write").click();
                            const element = newMessage.querySelector('[name="content"]');
                            // TODO: Use something like ‘@Leandro-Facchinetti-2342’
                            textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> @" + ${JSON.stringify(
                              message.authorEnrollment.reference
                            )} + " · #" + ${JSON.stringify(
                            res.locals.conversation.reference
                          )} + "/" + ${JSON.stringify(
                            message.reference
                          )} + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n", "");
                            element.focus();
                            `}"
                        >
                          <i class="bi bi-reply"></i>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div class="message--show">
                    $${(() => {
                      const content: HTML[] = [];

                      if (
                        app.locals.helpers.mayEditMessage(req, res, message) &&
                        message.reference !== "1" &&
                        res.locals.conversation.questionAt !== null
                      )
                        content.push(html`
                          <form
                            method="POST"
                            action="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/conversations/${res
                              .locals.conversation
                              .reference}/messages/${message.reference}?_method=PATCH"
                          >
                            $${message.answerAt === null
                              ? html`
                                  <input
                                    type="hidden"
                                    name="isAnswer"
                                    value="true"
                                  />
                                  <button
                                    class="button"
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: "Mark as Answer",
                                        touch: false,
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-patch-check"></i>
                                    Not an Answer
                                  </button>
                                `
                              : html`
                                  <input
                                    type="hidden"
                                    name="isAnswer"
                                    value="false"
                                  />
                                  <button
                                    class="button strong"
                                    data-ondomcontentloaded="${javascript`
                                        tippy(this, {
                                          content: "Mark as Not an Answer",
                                          touch: false,
                                        });
                                      `}"
                                  >
                                    <i class="bi bi-patch-check-fill"></i>
                                    Answer
                                  </button>
                                `}
                          </form>
                        `);
                      else if (
                        res.locals.conversation.questionAt !== null &&
                        message.answerAt !== null
                      )
                        content.push(html`
                          <div>
                            <i class="bi bi-patch-check-fill"></i>
                            Answer
                          </div>
                        `);

                      if (
                        app.locals.helpers.mayEndorseMessage(req, res, message)
                      ) {
                        const isEndorsed = message.endorsements.some(
                          (endorsement) =>
                            endorsement.enrollment.id ===
                            res.locals.enrollment.id
                        );

                        content.push(html`
                          <form
                            method="POST"
                            action="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/conversations/${res
                              .locals.conversation
                              .reference}/messages/${message.reference}/endorsements${isEndorsed
                              ? "?_method=DELETE"
                              : ""}"
                          >
                            $${isEndorsed
                              ? html`
                                  <input
                                    type="hidden"
                                    name="isEndorsed"
                                    value="false"
                                  />
                                  <button
                                    class="button strong"
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: ${JSON.stringify(
                                          `Remove Endorsement${
                                            message.endorsements.length > 1
                                              ? ` (Also endorsed by ${
                                                  /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (Intl as any).ListFormat(
                                                    "en"
                                                  ).format(
                                                    message.endorsements
                                                      .filter(
                                                        (endorsement) =>
                                                          endorsement.enrollment
                                                            .id !==
                                                          res.locals.enrollment
                                                            .id
                                                      )
                                                      .map(
                                                        (endorsement) =>
                                                          endorsement.enrollment
                                                            .user.name
                                                      )
                                                  )
                                                })`
                                              : ``
                                          }`
                                        )},
                                        touch: false,
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-award-fill"></i>
                                    ${message.endorsements.length} Staff
                                    Endorsement${message.endorsements.length ===
                                    1
                                      ? ""
                                      : "s"}
                                  </button>
                                `
                              : html`
                                  <input
                                    type="hidden"
                                    name="isEndorsed"
                                    value="true"
                                  />
                                  <button
                                    class="button"
                                    $${message.endorsements.length === 0
                                      ? html``
                                      : html`
                                          data-ondomcontentloaded="${javascript`
                                            tippy(this, {
                                              content: ${JSON.stringify(
                                                `Endorse (Already endorsed by ${
                                                  /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (Intl as any).ListFormat(
                                                    "en"
                                                  ).format(
                                                    message.endorsements.map(
                                                      (endorsement) =>
                                                        endorsement.enrollment
                                                          .user.name
                                                    )
                                                  )
                                                })`
                                              )},
                                              touch: false,
                                            });
                                          `}"
                                        `}
                                  >
                                    <i class="bi bi-award"></i>
                                    ${message.endorsements.length === 0
                                      ? `Endorse`
                                      : `${message.endorsements.length}
                                        Staff Endorsement${
                                          message.endorsements.length === 1
                                            ? ""
                                            : "s"
                                        }`}
                                  </button>
                                `}
                          </form>
                        `);
                      } else if (
                        res.locals.conversation.questionAt !== null &&
                        message.endorsements.length > 0
                      )
                        content.push(html`
                          <div
                            data-ondomcontentloaded="${javascript`
                              tippy(this, {
                                content: ${JSON.stringify(
                                  `Endorsed by ${
                                    /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (Intl as any).ListFormat(
                                      "en"
                                    ).format(
                                      message.endorsements.map(
                                        (endorsement) =>
                                          endorsement.enrollment.user.name
                                      )
                                    )
                                  }`
                                )},
                                touch: false,
                              });
                            `}"
                          >
                            <i class="bi bi-award"></i>
                            ${message.endorsements.length} Staff
                            Endorsement${message.endorsements.length === 1
                              ? ""
                              : "s"}
                          </div>
                        `);

                      return content.length === 0
                        ? html``
                        : html`
                            <div
                              style="${css`
                                font-size: var(--font-size--xs);
                                line-height: var(--line-height--xs);
                                display: flex;
                                gap: var(--space--4);
                              `}"
                            >
                              $${content}
                            </div>
                          `;
                    })()}

                    <div>
                      <div
                        class="text"
                        data-ondomcontentloaded="${javascript`
                          this.tippy = tippy(this, {
                            content: this.nextElementSibling.firstElementChild,
                            trigger: "manual",
                            interactive: true,
                            offset: [0, 20],
                            touch: false,
                          });
                        `}"
                        onpointerup="${javascript`
                          const selection = window.getSelection();
                          const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement;
                          const focusElement = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode.parentElement;
                          if (
                            selection.isCollapsed ||
                            !this.contains(anchorElement) ||
                            !this.contains(focusElement) ||
                            anchorElement.dataset.position === undefined ||
                            focusElement.dataset.position === undefined
                          ) return;
                          this.tippy.setProps({
                            getReferenceClientRect: () => ({
                              width: 0,
                              height: 0,
                              top: event.clientY,
                              right: event.clientX,
                              bottom: event.clientY,
                              left: event.clientX,
                            }),
                          });
                          this.tippy.show();
                        `}"
                      >
                        $${app.locals.partials.textProcessor(message.content, {
                          req,
                          res,
                        })}
                      </div>
                      <div hidden>
                        <div>
                          <button
                            class="dropdown-menu--item button button--transparent"
                            onclick="${javascript`
                            tippy.hideAll();
                            const selection = window.getSelection();
                            const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode.parentElement;
                            const focusElement = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode.parentElement;  
                            // TODO: May have to get ‘closest()’ child of ‘.text’ to prevent some elements (for example, tables) from breaking.
                            const anchorPosition = JSON.parse(anchorElement.dataset.position);
                            const focusPosition = JSON.parse(focusElement.dataset.position);
                            const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                            const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                            const content = JSON.parse(anchorElement.closest("[data-content]").dataset.content);
                            const newMessage = document.querySelector(".new-message");
                            newMessage.querySelector(".text-editor--button--write").click();
                            const element = newMessage.querySelector('[name="content"]');
                            // TODO: Use something like ‘@Leandro-Facchinetti-2342’
                            textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> @" + ${JSON.stringify(
                              message.authorEnrollment.reference
                            )} + " · #" + ${JSON.stringify(
                              res.locals.conversation.reference
                            )} + "/" + ${JSON.stringify(
                              message.reference
                            )} + "\\n>\\n> " + content.slice(start, end).replaceAll("\\n", "\\n> ") + "\\n\\n", "");
                            element.focus();
                          `}"
                          >
                            <i class="bi bi-chat-left-quote"></i> Quote
                          </button>
                        </div>
                      </div>
                    </div>

                    <div
                      style="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `}"
                    >
                      $${(() => {
                        const isLiked = message.likes.some(
                          (like) =>
                            like.enrollment.id === res.locals.enrollment.id
                        );
                        const likesCount = message.likes.length;

                        return html`
                          <form
                            method="POST"
                            action="${app.locals.settings.url}/courses/${res
                              .locals.course.reference}/conversations/${res
                              .locals.conversation
                              .reference}/messages/${message.reference}/likes${isLiked
                              ? "?_method=DELETE"
                              : ""}"
                            onsubmit="${javascript`
                              event.preventDefault();
                              fetch(this.action, { method: this.method });
                            `}"
                          >
                            <button
                              class="button button--transparent ${isLiked
                                ? "strong"
                                : ""}"
                              $${likesCount === 0
                                ? html``
                                : html`
                                    data-ondomcontentloaded="${javascript`
                                      tippy(this, {
                                        content: ${JSON.stringify(
                                          isLiked ? "Remove Like" : "Like"
                                        )},
                                        touch: false,
                                      });
                                    `}"
                                  `}
                            >
                              $${isLiked
                                ? html`
                                    <i class="bi bi-hand-thumbs-up-fill"></i>
                                  `
                                : html`<i class="bi bi-hand-thumbs-up"></i>`}
                              $${likesCount === 0
                                ? html`Like`
                                : html`
                                    ${likesCount}
                                    Like${likesCount === 1 ? "" : "s"}
                                  `}
                            </button>
                          </form>
                        `;
                      })()}
                    </div>
                  </div>

                  $${app.locals.helpers.mayEditMessage(req, res, message)
                    ? html`
                        <form
                          method="POST"
                          action="${app.locals.settings.url}/courses/${res
                            .locals.course.reference}/conversations/${res.locals
                            .conversation
                            .reference}/messages/${message.reference}?_method=PATCH"
                          hidden
                          class="message--edit"
                          style="${css`
                            padding-top: var(--space--2);
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
                        >
                          $${app.locals.partials.textEditor({
                            value: message.content,
                          })}

                          <div
                            style="${css`
                              display: flex;
                              gap: var(--space--2);
                              @media (max-width: 400px) {
                                flex-direction: column;
                              }
                            `}"
                          >
                            <button
                              class="button button--blue"
                              data-ondomcontentloaded="${javascript`
                                Mousetrap(this.closest("form").querySelector('[name="content"]')).bind("mod+enter", () => { this.click(); return false; });
                                tippy(this, {
                                  content: ${JSON.stringify(html`
                                    <span class="keyboard-shortcut">
                                      Ctrl+Enter or
                                      <span class="keyboard-shortcut--cluster"
                                        ><i class="bi bi-command"></i
                                        ><i class="bi bi-arrow-return-left"></i
                                      ></span>
                                    </span>
                                  `)},
                                  touch: false,
                                  allowHTML: true,
                                });
                              `}"
                            >
                              <i class="bi bi-pencil"></i>
                              Update Message
                            </button>
                            <button
                              type="reset"
                              class="button"
                              onclick="${javascript`
                                this.closest(".message").querySelector(".message--show").hidden = false;
                                this.closest(".message").querySelector(".message--edit").hidden = true;
                            `}"
                            >
                              <i class="bi bi-x-lg"></i>
                              Cancel
                            </button>
                          </div>
                        </form>
                      `
                    : html``}
                </div>
              `
            )}

            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/conversations/${res.locals.conversation
                .reference}/messages"
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                class="new-message"
                data-ondomcontentloaded="${javascript`
                  const content = this.querySelector('[name="content"]');
                  content.defaultValue =
                    JSON.parse(
                      localStorage.getItem("conversationsContentsInProgress") ?? "{}"
                    )[window.location.pathname] ?? "";
                  content.dataset.skipIsModified = "true";
                  content.addEventListener("input", () => {
                    const conversationsContentsInProgress = JSON.parse(
                      localStorage.getItem("conversationsContentsInProgress") ?? "{}"
                    );
                    conversationsContentsInProgress[window.location.pathname] =
                      content.value;
                    localStorage.setItem(
                      "conversationsContentsInProgress",
                      JSON.stringify(conversationsContentsInProgress)
                    );
                  });
                  content.closest("form").addEventListener("submit", () => {
                    const conversationsContentsInProgress = JSON.parse(
                      localStorage.getItem("conversationsContentsInProgress") ?? "{}"
                    );
                    delete conversationsContentsInProgress[window.location.pathname];
                    localStorage.setItem(
                      "conversationsContentsInProgress",
                      JSON.stringify(conversationsContentsInProgress)
                    );
                  });
                `}"
              >
                $${app.locals.partials.textEditor()}
              </div>

              $${res.locals.conversation.questionAt === null
                ? html``
                : html`
                    <div
                      style="${css`
                        display: flex;
                      `}"
                    >
                      <label
                        style="${css`
                          display: grid;
                          cursor: pointer;

                          & > * {
                            grid-area: 1 / 1;
                          }
                        `}"
                      >
                        <input
                          type="checkbox"
                          name="isAnswer"
                          autocomplete="off"
                          $${res.locals.enrollment.role === "staff"
                            ? `checked`
                            : ``}
                        />
                        <span
                          class="button button--transparent"
                          style="${css`
                            :checked + & {
                              display: none;
                            }
                          `}"
                          data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Mark as Answer",
                            touch: false,
                          });
                        `}"
                        >
                          <i class="bi bi-patch-check"></i>
                          Not an Answer
                        </span>
                        <span
                          class="button button--transparent strong"
                          style="${css`
                            :not(:checked) + * + & {
                              display: none;
                            }
                          `}"
                          data-ondomcontentloaded="${javascript`
                          tippy(this, {
                            content: "Mark as Not an Answer",
                            touch: false,
                          });
                        `}"
                        >
                          <i class="bi bi-patch-check-fill"></i>
                          Answer
                        </span>
                      </label>
                    </div>
                  `}

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                  data-ondomcontentloaded="${javascript`
                      Mousetrap(this.closest("form").querySelector('[name="content"]')).bind("mod+enter", () => { this.click(); return false; });
                      tippy(this, {
                        content: ${JSON.stringify(html`
                          <span class="keyboard-shortcut">
                            Ctrl+Enter or
                            <span class="keyboard-shortcut--cluster"
                              ><i class="bi bi-command"></i
                              ><i class="bi bi-arrow-return-left"></i
                            ></span>
                          </span>
                        `)},
                        touch: false,
                        allowHTML: true,
                      });
                    `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Send Message
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      title?: string;
      isPinned?: "true" | "false";
      isQuestion?: "true" | "false";
    },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...app.locals.middlewares.mayEditConversation,
    (req, res, next) => {
      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          app.locals.database.run(
            sql`UPDATE "conversations" SET "title" = ${req.body.title} WHERE "id" = ${res.locals.conversation.id}`
          );

      if (typeof req.body.isPinned === "string")
        if (
          !["true", "false"].includes(req.body.isPinned) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isPinned === "true" &&
            res.locals.conversation.pinnedAt !== null) ||
          (req.body.isPinned === "false" &&
            res.locals.conversation.pinnedAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "pinnedAt" = ${
                req.body.isPinned === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isQuestion === "string")
        if (
          !["true", "false"].includes(req.body.isQuestion) ||
          (req.body.isQuestion === "true" &&
            res.locals.conversation.questionAt !== null) ||
          (req.body.isQuestion === "false" &&
            res.locals.conversation.questionAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "questionAt" = ${
                req.body.isQuestion === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.delete<
    { courseReference: string; conversationReference: string },
    HTML,
    { title?: string },
    {},
    IsCourseStaffMiddlewareLocals & IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.isConversationAccessible,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${res.locals.conversation.id}`
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}`
      );
    }
  );

  app.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { content?: string; isAnswer?: boolean },
    {},
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        (req.body.isAnswer && res.locals.conversation.questionAt === null)
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "conversations"
          SET "nextMessageReference" = ${
            res.locals.conversation.nextMessageReference + 1
          }
          WHERE "id" = ${res.locals.conversation.id}
        `
      );
      app.locals.database.run(
        sql`
          INSERT INTO "messages" ("conversation", "reference", "authorEnrollment", "content", "answerAt")
          VALUES (
            ${res.locals.conversation.id},
            ${String(res.locals.conversation.nextMessageReference)},
            ${res.locals.enrollment.id},
            ${req.body.content},
            ${req.body.isAnswer ? new Date().toISOString() : null}
          )
        `
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.conversation.nextMessageReference}`
      );
    }
  );

  app.patch<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    { content?: string; isAnswer?: "true" | "false" },
    {},
    MayEditMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...app.locals.middlewares.mayEditMessage,
    (req, res, next) => {
      if (typeof req.body.content === "string")
        if (req.body.content.trim() === "") return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "messages"
              SET "content" = ${req.body.content},
                  "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${res.locals.message.id}
            `
          );

      if (typeof req.body.isAnswer === "string")
        if (
          res.locals.message.reference === "1" ||
          !["true", "false"].includes(req.body.isAnswer) ||
          res.locals.conversation.questionAt === null ||
          (req.body.isAnswer === "true" &&
            res.locals.message.answerAt !== null) ||
          (req.body.isAnswer === "false" &&
            res.locals.message.answerAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "messages"
              SET "answerAt" = ${
                req.body.isAnswer === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    { content?: string },
    {},
    IsCourseStaffMiddlewareLocals & MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.messageExists,
    (req, res, next) => {
      if (res.locals.message.reference === "1") return next("validation");

      app.locals.database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...app.locals.middlewares.messageExists,
    (req, res, next) => {
      if (
        res.locals.message.likes.some(
          (like) => like.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`INSERT INTO "likes" ("message", "enrollment") VALUES (${res.locals.message.id}, ${res.locals.enrollment.id})`
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...app.locals.middlewares.messageExists,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) => like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      app.locals.database.run(sql`DELETE FROM "likes" WHERE "id" = ${like.id}`);

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  interface Helpers {
    mayEndorseMessage: (
      req: express.Request<
        {
          courseReference: string;
          conversationReference: string;
        },
        any,
        {},
        {},
        IsConversationAccessibleMiddlewareLocals
      >,
      res: express.Response<any, IsConversationAccessibleMiddlewareLocals>,
      message: MessageExistsMiddlewareLocals["message"]
    ) => boolean;
  }
  app.locals.helpers.mayEndorseMessage = (req, res, message) =>
    res.locals.enrollment.role === "staff" &&
    res.locals.conversation.questionAt !== null &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    message.authorEnrollment.role !== "staff";

  interface Middlewares {
    mayEndorseMessage: express.RequestHandler<
      {
        courseReference: string;
        conversationReference: string;
        messageReference: string;
      },
      any,
      {},
      {},
      MayEndorseMessageMiddlewareLocals
    >[];
  }
  interface MayEndorseMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  app.locals.middlewares.mayEndorseMessage = [
    ...app.locals.middlewares.messageExists,
    (req, res, next) => {
      if (app.locals.helpers.mayEndorseMessage(req, res, res.locals.message))
        return next();
      next("route");
    },
  ];

  app.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...app.locals.middlewares.mayEndorseMessage,
    (req, res, next) => {
      if (
        res.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`INSERT INTO "endorsements" ("message", "enrollment") VALUES (${res.locals.message.id}, ${res.locals.enrollment.id})`
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...app.locals.middlewares.mayEndorseMessage,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) => endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("validation");

      app.locals.database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      app.locals.helpers.emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  app.post<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...app.locals.middlewares.mayEditConversation,
    (req, res, next) => {
      if (
        typeof req.body.reference !== "string" ||
        !res.locals.tags.some((tag) => req.body.reference === tag.reference) ||
        res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`
            INSERT INTO "taggings" ("conversation", "tag")
            VALUES (
              ${res.locals.conversation.id},
              ${
                res.locals.tags.find(
                  (tag) => req.body.reference === tag.reference
                )!.id
              }
            )
          `
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...app.locals.middlewares.mayEditConversation,
    (req, res, next) => {
      if (
        res.locals.conversation.taggings.length === 1 ||
        typeof req.body.reference !== "string" ||
        !res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`
          DELETE FROM "taggings"
          WHERE "conversation" = ${res.locals.conversation.id} AND
                "tag" = ${
                  res.locals.tags.find(
                    (tag) => req.body.reference === tag.reference
                  )!.id
                }
        `
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
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
    // TODO: The worker that sends emails on non-Demonstration Mode. Kick the worker to wake up from here (as well as periodically just in case…)
  };

  // app.post<{}, any, {}, {}, {}>("/demonstration-data", (req, res, next) => {
  //   if (!app.locals.settings.demonstration) return next();

  //   const card = faker.helpers.contextualCard();
  //   const demonstrationUser = app.locals.database.get<{ id: number }>(
  //     sql`
  //       INSERT INTO "users" ("email", "name", "avatar", "biography")
  //       VALUES (
  //         ${`${card.username.toLowerCase()}--${cryptoRandomString({
  //           length: 10,
  //           type: "numeric",
  //         })}@courselore.org`},
  //         ${card.name},
  //         ${card.avatar},
  //         ${faker.lorem.paragraph()}
  //       )
  //       RETURNING *
  //     `
  //   )!;

  //   const users = [...new Array(500)].map((_) => {
  //     const card = faker.helpers.contextualCard();
  //     return app.locals.database.get<{
  //       id: number;
  //       email: string;
  //       name: string | null;
  //     }>(
  //       sql`
  //         INSERT INTO "users" ("email", "name", "avatar", "biography")
  //         VALUES (
  //           ${`${card.username}--${cryptoRandomString({
  //             length: 10,
  //             type: "numeric",
  //           })}@courselore.org`},
  //           ${faker.helpers.randomize([card.name, null])},
  //           ${faker.helpers.randomize([card.avatar, null])},
  //           ${faker.helpers.randomize([faker.lorem.paragraph(), null])}
  //         )
  //         RETURNING *
  //       `
  //     )!;
  //   });

  //   for (const { name, role, accentColor } of [
  //     {
  //       name: "Introduction to Statistics",
  //       role: "staff",
  //       accentColor: "purple",
  //     },
  //     {
  //       name: "Advanced Harmony",
  //       role: "student",
  //       accentColor: "fuchsia",
  //     },
  //     {
  //       name: "Computer Graphics",
  //       role: "staff",
  //       accentColor: "pink",
  //     },
  //     {
  //       name: "Pharmacology",
  //       role: "staff",
  //       accentColor: "rose",
  //     },
  //     {
  //       name: "Macroeconomy",
  //       role: "student",
  //       accentColor: "red",
  //     },
  //   ]) {
  //     const conversationsCount = faker.datatype.number({ min: 30, max: 50 });
  //     const course = app.locals.database.get<{ id: number }>(
  //       sql`
  //         INSERT INTO "courses" ("reference", "name", "nextConversationReference")
  //         VALUES (
  //           ${cryptoRandomString({ length: 10, type: "numeric" })},
  //           ${name},
  //           ${String(conversationsCount + 1)}
  //         )
  //         RETURNING *
  //       `
  //     )!;

  //     for (const _ of new Array(20)) {
  //       const expiresAt = faker.helpers.randomize([
  //         faker.date.past(0.3),
  //         faker.date.future(0.3),
  //         null,
  //       ]);
  //       const user = faker.helpers.randomize([
  //         faker.helpers.randomize(users),
  //         null,
  //       ]);
  //       const usedAt =
  //         user === null
  //           ? null
  //           : faker.helpers.randomize([faker.date.past(0.1, new Date()), null]);
  //       app.locals.database.run(
  //         sql`
  //           INSERT INTO "invitations" (
  //             "expiresAt",
  //             "usedAt",
  //             "course",
  //             "reference",
  //             "email",
  //             "name",
  //             "role"
  //           )
  //           VALUES (
  //             ${expiresAt === null ? null : expiresAt.toISOString()},
  //             ${usedAt === null ? null : usedAt.toISOString()},
  //             ${course.id},
  //             ${cryptoRandomString({ length: 10, type: "numeric" })},
  //             ${user?.email},
  //             ${faker.helpers.randomize([user?.name, null])},
  //             ${faker.helpers.randomize(app.locals.constants.roles)}
  //           )
  //         `
  //       );
  //     }

  //     const enrollments: { id: number }[] = [];
  //     const staff: { id: number }[] = [];
  //     const enrollment = app.locals.database.get<{ id: number; role: Role }>(
  //       sql`
  //         INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
  //         VALUES (
  //           ${demonstrationUser.id},
  //           ${course.id},
  //           ${cryptoRandomString({ length: 10, type: "numeric" })},
  //           ${role},
  //           ${accentColor}
  //         )
  //         RETURNING *
  //       `
  //     )!;
  //     enrollments.push(enrollment);
  //     if (enrollment.role === "staff") staff.push(enrollment);

  //     for (const user of faker.random.arrayElements(users, 99)) {
  //       const enrollment = app.locals.database.get<{ id: number; role: Role }>(
  //         sql`
  //           INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
  //           VALUES (
  //             ${user.id},
  //             ${course.id},
  //             ${cryptoRandomString({ length: 10, type: "numeric" })},
  //             ${Math.random() < 1 / 10 ? "staff" : "student"},
  //             ${faker.helpers.randomize(app.locals.constants.accentColors)}
  //           )
  //           RETURNING *
  //         `
  //       )!;
  //       enrollments.push(enrollment);
  //       if (enrollment.role === "staff") staff.push(enrollment);
  //     }

  //     for (const conversationReference of lodash
  //       .range(1, conversationsCount + 1)
  //       .map(String)) {
  //       const messagesCount = faker.datatype.number({ min: 1, max: 25 });
  //       // FIXME: Use ‘RETURNING *’. See https://github.com/JoshuaWise/better-sqlite3/issues/654.
  //       const conversationId = Number(
  //         app.locals.database.run(
  //           sql`
  //           INSERT INTO "conversations" (
  //             "course",
  //             "reference",
  //             "title",
  //             "nextMessageReference",
  //             "pinnedAt",
  //             "questionAt"
  //           )
  //           VALUES (
  //             ${course.id},
  //             ${conversationReference},
  //             ${lodash.capitalize(faker.lorem.words())},
  //             ${String(messagesCount + 1)},
  //             ${
  //               Math.random() < 0.05 ? faker.date.past(0.2).toISOString() : null
  //             },
  //             ${
  //               Math.random() < 0.05 ? faker.date.past(0.2).toISOString() : null
  //             }
  //           )
  //         `
  //         ).lastInsertRowid
  //       );

  //       let createdAt = faker.date.past(0.3);
  //       for (const messageReference of lodash
  //         .range(1, messagesCount + 1)
  //         .map(String)) {
  //         createdAt = faker.date.between(createdAt, new Date());
  //         // FIXME: Use ‘RETURNING *’. See https://github.com/JoshuaWise/better-sqlite3/issues/654.
  //         const messageId = Number(
  //           app.locals.database.run(
  //             sql`
  //             INSERT INTO "messages" (
  //               "createdAt",
  //               "updatedAt",
  //               "conversation",
  //               "reference",
  //               "authorEnrollment",
  //               "content",
  //               "answerAt"
  //             )
  //             VALUES (
  //               ${createdAt.toISOString()},
  //               ${
  //                 Math.random() < 0.1
  //                   ? faker.date.between(createdAt, new Date()).toISOString()
  //                   : createdAt.toISOString()
  //               },
  //               ${conversationId},
  //               ${messageReference},
  //               ${faker.helpers.randomize(enrollments).id},
  //               ${faker.lorem.paragraphs(
  //                 faker.datatype.number({ min: 1, max: 10 }),
  //                 "\n\n"
  //               )},
  //               ${
  //                 Math.random() < 0.05
  //                   ? faker.date.past(0.2).toISOString()
  //                   : null
  //               }
  //             )
  //           `
  //           ).lastInsertRowid
  //         );

  //         // TODO: endorsements, likes, tags, taggings
  //       }
  //     }
  //   }

  //   app.locals.helpers.session.open(req, res, demonstrationUser.id);
  //   app.locals.helpers.flash.set(
  //     req,
  //     res,
  //     html`
  //       <div class="flash--green">
  //         Demonstration data including users, courses, conversations, and so
  //         forth, have been created and you’ve been signed in as a demonstration
  //         user to give you a better idea of what CourseLore looks like in use.
  //       </div>
  //     `
  //   );
  //   res.redirect(app.locals.settings.url);
  // });

  app.delete<{}, any, {}, {}, {}>("/turn-off", (req, res, next) => {
    if (
      !app.locals.settings.demonstration ||
      app.locals.settings.env === "production"
    )
      return next();

    res.send(
      `The demonstration server was turned off. Thanks for trying out CourseLore.`
    );
    process.exit(0);
  });

  app.all<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.status(404).send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>404 Not Found · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading"
                style="${css`
                  color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                  }
                `}"
              >
                <i class="bi bi-question-diamond"></i>
                404 Not Found
              </h2>
              <div
                style="${css`
                  color: var(--color--gray--medium--800);
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p>
                  If you think there should be something here, please contact
                  your course staff or the
                  <a href="${app.locals.settings.administrator}" class="link"
                    >system administrator</a
                  >.
                </p>
              </div>
            </div>
          `,
        })
      );
    }
  );

  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isSignedOut,
    (req, res) => {
      res.status(404).send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>404 Not Found · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading"
                style="${css`
                  color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                  }
                `}"
              >
                <i class="bi bi-question-diamond"></i>
                404 Not Found
              </h2>
              <div
                style="${css`
                  color: var(--color--gray--medium--800);
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--200);
                    background-color: var(--color--gray--medium--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p>
                  Either this page doesn’t exist or you have to authenticate to
                  see it.
                </p>
                <p>
                  <a
                    href="${app.locals.settings
                      .url}/authenticate?${qs.stringify({
                      redirect: req.originalUrl,
                    })}"
                    class="button button--blue"
                    style="${css`
                      width: 100%;
                    `}"
                  >
                    <i class="bi bi-box-arrow-in-right"></i>
                    Authenticate
                  </a>
                </p>
              </div>
            </div>
          `,
        })
      );
    }
  );

  app.use(((err, req, res, next) => {
    console.error(err);
    const isValidation = err === "validation";
    const message = isValidation ? "Validation" : "Server";
    res.status(isValidation ? 422 : 500).send(
      app.locals.layouts.box({
        req,
        res,
        head: html`<title>${message} Error · CourseLore</title>`,
        body: html`
          <div
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
          >
            <h2
              class="heading"
              style="${css`
                color: var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--200);
                }
              `}"
            >
              <i class="bi bi-bug"></i>
              ${message} Error
            </h2>
            <div
              style="${css`
                color: var(--color--gray--medium--800);
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--200);
                  background-color: var(--color--gray--medium--900);
                }
                padding: var(--space--4);
                border-radius: var(--border-radius--xl);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <p>This is an issue in CourseLore.</p>

              <a
                href="mailto:issues@courselore.org"
                class="button button--blue"
              >
                <i class="bi bi-envelope"></i>
                Report to issues@courselore.org
              </a>
            </div>
          </div>
        `,
      })
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
  require(path.resolve(
    process.argv[2] ?? path.join(__dirname, "../configuration/demonstration.js")
  ))(require);
