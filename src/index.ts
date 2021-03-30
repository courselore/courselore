#!/usr/bin/env node

import path from "path";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import { asyncHandler } from "@leafac/express-async-handler";
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

  interface User {
    id: number;
    email: string;
    name: string;
  }

  interface Course {
    id: number;
    reference: string;
    name: string;
  }

  interface Enrollment {
    id: number;
    role: Role;
    accentColor: AccentColor;
  }

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

  interface EnrollmentJoinCourse {
    enrollment: Enrollment;
    course: Course;
  }

  interface EnrollmentJoinUser {
    enrollment: Enrollment;
    user: User;
  }

  interface Invitation {
    id: number;
    expiresAt: string | null;
    reference: string;
    role: Role;
  }

  interface InvitationJoinCourse {
    invitation: Invitation;
    course: Course;
  }

  interface Thread {
    id: number;
    reference: string;
    title: string;
  }

  interface ThreadWithMetadata extends Thread {
    createdAt: string;
    updatedAt: string;
    author: EnrollmentJoinUser | Anonymous;
  }

  const ANONYMOUS = { user: { name: "Anonymous" } } as const;
  type Anonymous = typeof ANONYMOUS;

  interface EnrollmentJoinCourseJoinThreadsWithMetadata
    extends EnrollmentJoinCourse {
    threadsWithMetadata: ThreadWithMetadata[];
  }

  interface Post {
    id: number;
    createdAt: string;
    updatedAt: string;
    reference: string;
    content: string;
  }

  interface PostJoinAuthor {
    post: Post;
    author: EnrollmentJoinUser | Anonymous;
  }

  interface ThreadWithMetadataJoinPostsJoinAuthors {
    threadWithMetadata: ThreadWithMetadata;
    postsJoinAuthors: PostJoinAuthor[];
  }

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
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "role" TEXT NOT NULL CHECK ("role" IN ('student', 'staff')),
        "accentColor" TEXT NOT NULL CHECK ("accentColor" IN ('#83769c', '#ff77a8', '#29adff', '#ffa300', '#ff004d', '#7e2553', '#008751', '#ab5236', '#1d2b53', '#5f574f')),
        UNIQUE ("user", "course")
      );

      CREATE TABLE "invitations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TEXT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "role" TEXT NOT NULL CHECK ("role" IN ('student', 'staff')),
        UNIQUE ("course", "reference")
      );

      CREATE TABLE "threads" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );

      CREATE TABLE "posts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "thread" INTEGER NOT NULL REFERENCES "threads" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "author" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        UNIQUE ("thread", "reference")
      );

      CREATE TABLE "authenticationNonces" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "email" TEXT NOT NULL UNIQUE
      );

      CREATE TABLE "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      );

      CREATE TABLE "emailsQueue" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "tryAfter" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "triedAt" TEXT NOT NULL DEFAULT (json_array()) CHECK (json_valid("triedAt")),
        "to" TEXT NOT NULL,
        "subject" TEXT NOT NULL,
        "body" TEXT NOT NULL
      );
    `,
  ]);

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
                  margin-top: 1.5rem;

                  header & {
                    margin-top: 0;
                  }
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
                    color: #ff77a8;
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
                  box-shadow: inset 0px 1px 1px #ffffff10, 0px 1px 3px #00000010;
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

                input[type="radio"],
                input[type="checkbox"] {
                  display: inline-block;
                  width: 12px;
                  height: 12px;
                  margin-right: 5px;
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

                div.demonstration {
                  text-align: left;
                  min-height: 7.5rem;
                  padding-left: 0.5rem;
                  border-left: 1rem solid #83769c;
                  border-radius: 10px;
                  margin-left: -1.5rem;

                  &::before {
                    content: "Demonstration";
                    font-size: 0.56rem;
                    font-weight: bold;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    color: white;
                    position: absolute;
                    transform: translate(calc(-50% - 1rem)) rotate(-90deg)
                      translate(-50%);
                  }
                }

                details.popup {
                  &[open] > summary::before {
                    content: "";
                    display: block;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vw;
                  }

                  & > summary + * {
                    background-color: whitesmoke;
                    max-width: 300px;
                    padding: 0 1rem;
                    border: 1px solid darkgray;
                    border-radius: 10px;
                    box-shadow: inset 0px 1px 1px #ffffff10,
                      0px 1px 3px #00000010;
                    position: absolute;

                    @media (prefers-color-scheme: dark) {
                      background-color: #464646;
                    }

                    &::before {
                      content: "";
                      background-color: whitesmoke;
                      display: block;
                      width: 10px;
                      height: 10px;
                      position: absolute;
                      top: -6px;
                      transform: rotate(45deg);
                      border: 1px solid darkgray;
                      border-right: none;
                      border-bottom: none;
                      border-top-left-radius: 5px;
                      box-shadow: inset 1px 1px 1px #ffffff10;

                      @media (prefers-color-scheme: dark) {
                        background-color: #464646;
                      }
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
                  Demonstration
                </p>
              `
            : html``}

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
                validator.isEmpty(element.value, { ignore_whitespace: true })
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
                element.setCustomValidity(
                  element.dataset.validatorMessage ?? "This field is invalid"
                );
              }

              if (element.matches("[data-validator-custom]")) {
                shouldResetCustomValidity = true;
                const validationResult = new Function(
                  element.dataset.validatorCustom
                ).call(element);
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
        {
          user?: User;
          enrollmentJoinCourseJoinThreadsWithMetadata?: EnrollmentJoinCourseJoinThreadsWithMetadata;
        }
      >,
      res: express.Response<
        any,
        {
          user?: User;
          enrollmentJoinCourseJoinThreadsWithMetadata?: EnrollmentJoinCourseJoinThreadsWithMetadata;
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
              ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata ===
              undefined
                ? css``
                : css`
                    box-sizing: border-box;
                    border-top: 10px solid
                      ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata
                        .enrollment.accentColor};
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    overflow: auto;
                  `}
            `}"
          >
            <div
              style="${css`
                max-width: 600px;
                padding: 0 1rem;
                margin: 1rem auto;
              `}"
            >
              <header>$${logoAndMenu(req, res)}</header>
              <main>$${body}</main>
            </div>
          </div>
        `
      )
  );

  const logoAndMenu = (
    req: express.Request<
      {},
      HTML,
      {},
      {},
      {
        user?: User;
        enrollmentJoinCourseJoinThreadsWithMetadata?: EnrollmentJoinCourseJoinThreadsWithMetadata;
      }
    >,
    res: express.Response<
      HTML,
      {
        user?: User;
        enrollmentJoinCourseJoinThreadsWithMetadata?: EnrollmentJoinCourseJoinThreadsWithMetadata;
      }
    >
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
          <span
            style="${css`
              font-size: 1.3rem;
              font-weight: 800;
            `}"
            >CourseLore</span
          >
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
                  transform: translate(calc(-100% + 2.3rem), -0.5rem);

                  &::before {
                    right: 1rem;
                  }
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
                $${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata ===
                undefined
                  ? html``
                  : html`
                      <p>
                        <a
                          href="${app.get("url")}/courses/${res.locals
                            .enrollmentJoinCourseJoinThreadsWithMetadata.course
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

  const cookieOptions = (): express.CookieOptions => ({
    domain: new URL(app.get("url")).hostname,
    httpOnly: true,
    path: new URL(app.get("url")).pathname,
    secure: new URL(app.get("url")).protocol === "https",
    sameSite: true,
  });

  function newAuthenticationNonce(email: string): string {
    database.run(
      sql`DELETE FROM "authenticationNonces" WHERE "email" = ${email}`
    );
    const nonce = cryptoRandomString({ length: 40, type: "numeric" });
    database.run(
      sql`
        INSERT INTO "authenticationNonces" ("expiresAt", "nonce", "email")
        VALUES (datetime('now', '+10 minutes'), ${nonce}, ${email})
      `
    );
    return nonce;
  }

  function verifyAuthenticationNonce(nonce: string): string | undefined {
    const authenticationNonce = database.get<{
      email: string;
    }>(
      sql`SELECT "email" FROM "authenticationNonces" WHERE "nonce" = ${nonce} AND CURRENT_TIMESTAMP < "expiresAt"`
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

  const isUnauthenticated: express.RequestHandler<{}, any, {}, {}, {}>[] = [
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
                    CURRENT_TIMESTAMP < "expiresAt"
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
  app.set("handler isUnauthenticated", isUnauthenticated);

  const isAuthenticated: express.RequestHandler<
    {},
    any,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >[] = [
    cookieParser(),
    (req, res, next) => {
      if (req.cookies.session === undefined) return next("route");
      const sessionJoinUser = database.get<{ expiresAt: string } & User>(sql`
        SELECT "sessions"."expiresAt", "users"."id", "users"."email", "users"."name"
        FROM "sessions"
        JOIN "users" ON "sessions"."user" = "users"."id"
        WHERE "sessions"."token" = ${req.cookies.session} AND
              CURRENT_TIMESTAMP < "sessions"."expiresAt"
      `);
      if (sessionJoinUser === undefined) {
        closeSession(req, res);
        return next("route");
      }
      if (
        new Date(sessionJoinUser.expiresAt).getTime() - Date.now() <
        30 * 24 * 60 * 60 * 1000
      ) {
        closeSession(req, res);
        openSession(req, res, sessionJoinUser.id);
      }
      res.locals.user = {
        id: sessionJoinUser.id,
        email: sessionJoinUser.email,
        name: sessionJoinUser.name,
      };
      res.locals.enrollmentsJoinCourses = database
        .all<{
          enrollmentId: number;
          role: Role;
          accentColor: AccentColor;
          courseId: number;
          reference: string;
          name: string;
        }>(
          sql`
            SELECT "enrollments"."id" AS "enrollmentId",
                   "enrollments"."role",
                   "enrollments"."accentColor",
                   "courses"."id" AS "courseId",
                   "courses"."reference",
                   "courses"."name"
            FROM "enrollments"
            JOIN "courses" ON "enrollments"."course" = "courses"."id"
            WHERE "enrollments"."user" = ${res.locals.user.id}
            ORDER BY "enrollments"."id" DESC
          `
        )
        .map((row) => ({
          enrollment: {
            id: row.enrollmentId,
            role: row.role,
            accentColor: row.accentColor,
          },
          course: {
            id: row.courseId,
            reference: row.reference,
            name: row.name,
          },
        }));
      next();
    },
  ];
  app.set("handler isAuthenticated", isAuthenticated);

  app.get<{}, HTML, {}, { redirect?: string }, {}>(
    ["/", "/authenticate"],
    ...isUnauthenticated,
    (req, res) => {
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
                action="${app.get("url")}/authenticate${req.query.redirect ===
                undefined
                  ? ""
                  : `?redirect=${req.query.redirect}`}"
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
                action="${app.get("url")}/authenticate${req.query.redirect ===
                undefined
                  ? ""
                  : `?redirect=${req.query.redirect}`}"
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

  app.post<{}, HTML, { email?: string }, { redirect?: string }, {}>(
    "/authenticate",
    ...isUnauthenticated,
    (req, res) => {
      if (
        typeof req.body.email !== "string" ||
        !validator.isEmail(req.body.email)
      )
        throw new ValidationError();

      const magicAuthenticationLink = `${app.get(
        "url"
      )}/authenticate/${newAuthenticationNonce(req.body.email)}${
        req.query.redirect === undefined
          ? ""
          : `?redirect=${req.query.redirect}`
      }`;
      const sentEmail = sendEmail({
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
            </div>

            $${sentEmail}
          `
        )
      );
    }
  );

  app.get<{ nonce: string }, HTML, {}, { redirect?: string }, {}>(
    "/authenticate/:nonce",
    ...isUnauthenticated,
    (req, res) => {
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
                    href="${app.get("url")}/authenticate${req.query.redirect ===
                    undefined
                      ? ""
                      : `?redirect=${req.query.redirect}`}"
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
                  action="${app.get("url")}/users${req.query.redirect ===
                  undefined
                    ? ""
                    : `?redirect=${req.query.redirect}`}"
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
    }
  );

  app.post<
    {},
    HTML,
    { nonce?: string; name?: string },
    { redirect?: string },
    {}
  >("/users", ...isUnauthenticated, (req, res) => {
    if (
      typeof req.body.nonce !== "string" ||
      validator.isEmpty(req.body.nonce, { ignore_whitespace: true }) ||
      typeof req.body.name !== "string" ||
      validator.isEmpty(req.body.name, { ignore_whitespace: true })
    )
      throw new ValidationError();

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
                  href="${app.get("url")}/sign-up${req.query.redirect ===
                  undefined
                    ? ""
                    : `?redirect=${req.query.redirect}`}"
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

  app.delete<
    {},
    any,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/authenticate", ...isAuthenticated, (req, res) => {
    closeSession(req, res);
    res.redirect(`${app.get("url")}/`);
  });

  app.get<
    { nonce: string },
    HTML,
    {},
    { redirect?: string },
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/authenticate/:nonce", ...isAuthenticated, (req, res) => {
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
                  )}?_method=PUT${req.query.redirect === undefined
                    ? ""
                    : `&redirect=${req.query.redirect}`}"
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
    { redirect?: string },
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/authenticate/:nonce", ...isAuthenticated, (req, res) => {
    closeSession(req, res);
    res.redirect(
      `${app.get("url")}/authenticate/${req.params.nonce}${
        req.query.redirect === undefined
          ? ""
          : `?redirect=${req.query.redirect}`
      }`
    );
  });

  app.get<
    {},
    HTML,
    {},
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("/", ...isAuthenticated, (req, res) => {
    switch (res.locals.enrollmentsJoinCourses.length) {
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
                To <strong>enroll on an existing course</strong> you either have
                to follow an invitation link or be invited via email. Contact
                your course staff for more information.
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
            res.locals.enrollmentsJoinCourses[0].course.reference
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
                $${res.locals.enrollmentsJoinCourses.map(
                  (enrollmentJoinCourse) =>
                    html`
                      <p>
                        <a
                          href="${app.get("url")}/courses/${enrollmentJoinCourse
                            .course.reference}"
                          ><svg width="10" height="10">
                            <circle
                              cx="5"
                              cy="5"
                              r="5"
                              fill="${enrollmentJoinCourse.enrollment
                                .accentColor}"
                            />
                          </svg>
                          <strong>${enrollmentJoinCourse.course.name}</strong>
                          (${enrollmentJoinCourse.enrollment.role})</a
                        >
                      </p>
                    `
                )}
              </nav>
            `
          )
        );
    }
  });

  app.get<
    {},
    HTML,
    {},
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("/settings", ...isAuthenticated, (req, res) => {
    res.send(
      app.get("layout main")(
        req,
        res,
        html`<title>User Settings · CourseLore</title>`,
        html`
          <h1>User Settings</h1>

          <form method="POST" action="${app.get("url")}/settings?_method=PATCH">
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
                Your email is your identity in CourseLore and can’t be changed.
              </small>
            </label>
          </p>
        `
      )
    );
  });

  app.patch<
    {},
    any,
    { name?: string },
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("/settings", ...isAuthenticated, (req, res) => {
    if (typeof req.body.name === "string") {
      if (validator.isEmpty(req.body.name, { ignore_whitespace: true }))
        throw new ValidationError();
      database.run(
        sql`UPDATE "users" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.user.id}`
      );
    }

    res.redirect(`${app.get("url")}/settings`);
  });

  app.get<
    {},
    HTML,
    {},
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("/courses/new", ...isAuthenticated, (req, res) => {
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
  });

  app.post<
    {},
    any,
    { name?: string },
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("/courses", ...isAuthenticated, (req, res) => {
    if (
      typeof req.body.name !== "string" ||
      validator.isEmpty(req.body.name, { ignore_whitespace: true })
    )
      throw new ValidationError();

    const courseReference = cryptoRandomString({ length: 10, type: "numeric" });
    const newCourseId = database.run(
      sql`INSERT INTO "courses" ("reference", "name") VALUES (${courseReference}, ${req.body.name})`
    ).lastInsertRowid;
    database.run(
      sql`
          INSERT INTO "enrollments" ("user", "course", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${newCourseId},
            ${"staff"},
            ${defaultAccentColor(req, res)}
          )
        `
    );
    res.redirect(`${app.get("url")}/courses/${courseReference}`);
  });

  function defaultAccentColor(
    req: express.Request<
      {},
      any,
      {},
      {},
      { enrollmentsJoinCourses: EnrollmentJoinCourse[] }
    >,
    res: express.Response<
      any,
      { enrollmentsJoinCourses: EnrollmentJoinCourse[] }
    >
  ): AccentColor {
    const accentColorsInUse = new Set(
      res.locals.enrollmentsJoinCourses.map(
        (enrollmentJoinCourse) => enrollmentJoinCourse.enrollment.accentColor
      )
    );
    let accentColorsAvailable = new Set(ACCENT_COLORS);
    for (const accentColorInUse of accentColorsInUse) {
      accentColorsAvailable.delete(accentColorInUse);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  }

  const isEnrolledInCourse: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >[] = [
    ...isAuthenticated,
    (req, res, next) => {
      let enrollmentJoinCourse: EnrollmentJoinCourse | undefined;
      const otherEnrollmentsJoinCourses: EnrollmentJoinCourse[] = [];
      for (const aEnrollmentJoinCourse of res.locals.enrollmentsJoinCourses)
        if (
          aEnrollmentJoinCourse.course.reference === req.params.courseReference
        )
          enrollmentJoinCourse = aEnrollmentJoinCourse;
        else otherEnrollmentsJoinCourses.push(aEnrollmentJoinCourse);
      if (enrollmentJoinCourse === undefined) return next("route");

      const threadsWithMetadata = database
        .all<{
          threadId: number;
          reference: string;
          title: string;
          createdAt: string;
          updatedAt: string;
          authorEnrollmentId?: number;
          role?: Role;
          accentColor?: AccentColor;
          authorUserId?: number;
          email?: string;
          name?: string;
        }>(
          sql`
            SELECT "threads"."id" AS "threadId",
                   "threads"."reference",
                   "threads"."title",
                   "originalPost"."createdAt",
                   "mostRecentlyUpdatedPost"."updatedAt",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorEnrollment"."role",
                   "authorEnrollment"."accentColor",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email",
                   "authorUser"."name"
            FROM "threads"
            JOIN "posts" AS "originalPost" ON "threads"."id" = "originalPost"."thread"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "originalPost"."author" = "authorEnrollment"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
            JOIN "posts" AS "mostRecentlyUpdatedPost" ON "threads"."id" = "mostRecentlyUpdatedPost"."thread"
            WHERE "threads"."course" = ${enrollmentJoinCourse.course.id}
            GROUP BY "originalPost"."thread", "mostRecentlyUpdatedPost"."thread"
            ORDER BY "threads"."id" DESC, MIN("originalPost"."id"), MAX("mostRecentlyUpdatedPost"."updatedAt")
          `
        )
        .map((row) => ({
          id: row.threadId,
          reference: row.reference,
          title: row.title,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          author:
            row.authorEnrollmentId !== undefined
              ? {
                  enrollment: {
                    id: row.authorEnrollmentId!,
                    role: row.role!,
                    accentColor: row.accentColor!,
                  },
                  user: {
                    id: row.authorUserId!,
                    email: row.email!,
                    name: row.name!,
                  },
                }
              : ANONYMOUS,
        }));

      res.locals.enrollmentJoinCourseJoinThreadsWithMetadata = {
        ...enrollmentJoinCourse,
        threadsWithMetadata,
      };
      res.locals.otherEnrollmentsJoinCourses = otherEnrollmentsJoinCourses;

      next();
    },
  ];

  const isCourseStaff: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >[] = [
    ...isEnrolledInCourse,
    (req, res, next) => {
      if (
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment
          .role === "staff"
      )
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/courses/:courseReference", ...isEnrolledInCourse, (req, res) => {
    if (
      res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.threadsWithMetadata
        .length === 0
    )
      return res.send(
        app.get("layout main")(
          req,
          res,
          html`<title>
            ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
              .name}
            · CourseLore
          </title>`,
          html`
            <h1>
              Welcome to
              <a
                href="${app.get("url")}/courses/${res.locals
                  .enrollmentJoinCourseJoinThreadsWithMetadata.course
                  .reference}"
                >${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
                  .name}</a
              >!
            </h1>

            $${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment
              .role === "staff"
              ? html`
                  <p>
                    <a
                      href="${app.get("url")}/courses/${res.locals
                        .enrollmentJoinCourseJoinThreadsWithMetadata.course
                        .reference}/settings#invitations"
                      ><strong>Invite other people to the course</strong></a
                    >.
                  </p>
                  <p>
                    Or
                    <a
                      href="${app.get("url")}/courses/${res.locals
                        .enrollmentJoinCourseJoinThreadsWithMetadata.course
                        .reference}/threads/new"
                      ><strong>create the first thread</strong></a
                    >.
                  </p>
                `
              : html`
                  <p>
                    This is a new course.
                    <a
                      href="${app.get("url")}/courses/${res.locals
                        .enrollmentJoinCourseJoinThreadsWithMetadata.course
                        .reference}/threads/new"
                      ><strong>Create the first thread</strong></a
                    >.
                  </p>
                `}
          `
        )
      );

    res.redirect(
      `${app.get("url")}/courses/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.reference
      }/threads/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata
          .threadsWithMetadata[0].reference
      }`
    );
  });

  function isInvitationValid(invitation: Invitation): boolean {
    return (
      invitation.expiresAt === null || validator.isAfter(invitation.expiresAt)
    );
  }

  // TODO: Process email addresses
  // https://www.npmjs.com/package/email-addresses
  // https://www.npmjs.com/package/addressparser
  // https://www.npmjs.com/package/emailjs-mime-codec
  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/courses/:courseReference/settings", ...isEnrolledInCourse, (req, res) => {
    const invitations = database.all<Invitation>(
      sql`
        SELECT "id", "expiresAt", "reference", "role"
        FROM "invitations"
        WHERE "course" = ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.id}
        ORDER BY "id" DESC
      `
    );

    res.send(
      app.get("layout main")(
        req,
        res,
        html`<title>
          Course Settings ·
          ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.name}
          · CourseLore
        </title>`,
        html`
          <h1>
            Course Settings ·
            <a
              href="${app.get("url")}/courses/${res.locals
                .enrollmentJoinCourseJoinThreadsWithMetadata.course.reference}"
              >${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
                .name}</a
            >
          </h1>
          $${courseSwitcher(req, res, "/settings")}
          $${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment
            .role !== "staff"
            ? html``
            : html`
                <form
                  method="POST"
                  action="${app.get("url")}/courses/${res.locals
                    .enrollmentJoinCourseJoinThreadsWithMetadata.course
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
                          value="${res.locals
                            .enrollmentJoinCourseJoinThreadsWithMetadata.course
                            .name}"
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

                <p id="invitations"><strong>Invite with a link</strong></p>
                <p class="hint">
                  Anyone with an invitation link may enroll on the course.
                </p>

                $${invitations.length === 0
                  ? html``
                  : html`
                      <details>
                        <summary><strong>Existing Invitations</strong></summary>
                        <nav>
                          $${invitations.map(
                            (invitation) => html`
                              <p>
                                <a
                                  href="${app.get("url")}/courses/${res.locals
                                    .enrollmentJoinCourseJoinThreadsWithMetadata
                                    .course
                                    .reference}/invitations/${invitation.reference}"
                                  style="${css`
                                    * {
                                      transition: color 0.2s;
                                    }

                                    &:hover * {
                                      color: #ff77a8 !important;
                                    }
                                  `}"
                                  ><code
                                    class="${isInvitationValid(invitation)
                                      ? "green"
                                      : "red"}"
                                    >${invitation.reference}</code
                                  >
                                  <span class="hint">
                                    · ${lodash.capitalize(invitation.role)} ·
                                    ${invitation.expiresAt === null
                                      ? `Doesn’t expire`
                                      : `${
                                          validator.isAfter(
                                            invitation.expiresAt
                                          )
                                            ? "Expires"
                                            : "Expired"
                                        } at ${new Date(invitation.expiresAt)
                                          .toISOString()
                                          .slice(0, "YYYY-MM-DD HH:SS".length)
                                          .replace("T", " ")}`}
                                  </span></a
                                >
                              </p>
                            `
                          )}
                        </nav>
                      </details>
                    `}

                <form
                  method="POST"
                  action="${app.get("url")}/courses/${res.locals
                    .enrollmentJoinCourseJoinThreadsWithMetadata.course
                    .reference}/invitations"
                >
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
                    <p>
                      <label>
                        <strong>Role</strong><br />
                        <select name="role" required class="full-width">
                          $${ROLES.map(
                            (role) =>
                              html`
                                <option value="${role}">
                                  ${lodash.capitalize(role)}
                                </option>
                              `
                          )}
                        </select>
                      </label>
                    </p>

                    <p>
                      <strong>Expiration</strong><br />
                      <label>
                        <input
                          type="radio"
                          name="isExpiresAt"
                          value="false"
                          checked
                          required
                          onchange="${javascript`
                            this.closest("p").querySelector('[name="expiresAt"]').disabled = true;
                          `}"
                        />
                        Doesn’t expire
                      </label>
                      <br />
                      <span
                        style="${css`
                          display: flex;
                          align-items: baseline;

                          & > * + * {
                            margin-left: 0.5rem !important;
                          }
                        `}"
                      >
                        <label>
                          <input
                            type="radio"
                            name="isExpiresAt"
                            value="true"
                            required
                            onchange="${javascript`
                              const expiresAt = this.closest("p").querySelector('[name="expiresAt"]');
                              expiresAt.disabled = false;
                              expiresAt.focus();
                              expiresAt.setSelectionRange(0, 0);
                            `}"
                          />
                          Expires at
                        </label>
                        <input
                          type="text"
                          name="expiresAt"
                          value="${new Date()
                            .toISOString()
                            .slice(0, "YYYY-MM-DD HH:SS".length)
                            .replace("T", " ")}"
                          required
                          disabled
                          pattern="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}"
                          data-validator-custom="${javascript`
                            if (!validator.isAfter(this.value.replace(" ", "T")))
                              return "Must be in the future";
                          `}"
                          class="full-width"
                          style="${css`
                            flex: 1 !important;
                          `}"
                        />
                      </span>
                    </p>
                  </div>
                  <p><button>Create Invitation Link</button></p>
                </form>

                <hr />

                <!-- TODO:
                <p><strong>Invite via email</strong></p>
                <p class="hint">
                  Only the people you invite may enroll on the course.
                </p>
                <form>
                  <p>
                    <label>
                      As
                      <select name="role" required>
                        $${ROLES.map(
                  (role) =>
                    html`<option value="${role}">
                      ${lodash.capitalize(role)}
                    </option>`
                )}
                      </select>
                    </label>
                  </p>
                  <p>
                    <label>
                      <strong>Emails</strong><br/>
                      <textarea
                        name="invite-by-email"
                        required
                        class="full-width"
                      ></textarea>
                    </label>
                  </p>
                  <p><button>Invite</button></p>
                </form>

                <hr />
                -->
              `}

          <p><strong>Accent color</strong></p>
          <p class="hint">
            A bar of this color appears at the top of your screen to help you
            tell courses apart.
          </p>
          <div
            style="${css`
              margin-left: -5px;
              margin-top: -0.5rem;
            `}"
          >
            $${ACCENT_COLORS.map(
              (accentColor) =>
                html`
                  <form
                    method="POST"
                    action="${app.get("url")}/courses/${res.locals
                      .enrollmentJoinCourseJoinThreadsWithMetadata.course
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
                    <button
                      style="${css`
                        &,
                        &:active {
                          all: unset;
                        }
                      `}"
                    >
                      <svg width="30" height="30">
                        <circle cx="15" cy="15" r="10" fill="${accentColor}" />
                        $${accentColor ===
                        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata
                          .enrollment.accentColor
                          ? html`<circle cx="15" cy="15" r="3" fill="white" />`
                          : html``}
                      </svg>
                    </button>
                  </form>
                `
            )}
          </div>
        `
      )
    );
  });

  const courseSwitcher = (
    req: express.Request<
      { courseReference: string },
      HTML,
      {},
      {},
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
      }
    >,
    res: express.Response<
      HTML,
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
      }
    >,
    path = ""
  ): HTML =>
    res.locals.otherEnrollmentsJoinCourses.length === 0
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
              $${res.locals.otherEnrollmentsJoinCourses.map(
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

  app.patch<
    { courseReference: string },
    HTML,
    { name?: string; accentColor?: AccentColor },
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/courses/:courseReference/settings", ...isEnrolledInCourse, (req, res) => {
    if (
      typeof req.body.name === "string" &&
      res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment.role ===
        "staff"
    ) {
      if (validator.isEmpty(req.body.name, { ignore_whitespace: true }))
        throw new ValidationError();
      database.run(
        sql`UPDATE "courses" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.id}`
      );
    }

    if (typeof req.body.accentColor === "string") {
      if (!ACCENT_COLORS.includes(req.body.accentColor))
        throw new ValidationError();
      database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment.id}`
      );
    }

    res.redirect(
      `${app.get("url")}/courses/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.reference
      }/settings`
    );
  });

  app.post<
    { courseReference: string },
    HTML,
    { role?: Role; isExpiresAt?: "true" | "false"; expiresAt?: string },
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/courses/:courseReference/invitations", ...isCourseStaff, (req, res) => {
    if (
      typeof req.body.role !== "string" ||
      !ROLES.includes(req.body.role) ||
      (req.body.isExpiresAt === "true" &&
        (typeof req.body.expiresAt !== "string" ||
          !validator.isAfter(req.body.expiresAt)))
    )
      throw new ValidationError();

    const invitationReference = cryptoRandomString({
      length: 10,
      type: "numeric",
    });

    database.run(sql`
      INSERT INTO "invitations" ("expiresAt", "course", "reference", "role")
      VALUES (
        ${req.body.isExpiresAt === "true" ? req.body.expiresAt : null},
        ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.id},
        ${invitationReference},
        ${req.body.role}
      )
    `);

    res.redirect(
      `${app.get("url")}/courses/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.reference
      }/invitations/${invitationReference}`
    );
  });

  const invitationExists: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    { invitationJoinCourse: InvitationJoinCourse }
  >[] = [
    (req, res, next) => {
      const row = database.get<{
        invitationId: number;
        expiresAt: string;
        invitationReference: string;
        role: Role;
        courseId: number;
        courseReference: string;
        name: string;
      }>(
        sql`
          SELECT "invitations"."id" AS "invitationId",
                 "invitations"."expiresAt",
                 "invitations"."reference" AS "invitationReference",
                 "invitations"."role",
                 "courses"."id" AS "courseId",
                 "courses"."reference" AS "courseReference",
                 "courses"."name"
          FROM "invitations"
          JOIN "courses" ON "invitations"."course" = "courses"."id"
          WHERE "courses"."reference" = ${req.params.courseReference} AND
                "invitations"."reference" = ${req.params.invitationReference}
        `
      );
      if (row === undefined) return next("route");
      res.locals.invitationJoinCourse = {
        invitation: {
          id: row.invitationId,
          expiresAt: row.expiresAt,
          reference: row.invitationReference,
          role: row.role,
        },
        course: {
          id: row.courseId,
          reference: row.courseReference,
          name: row.name,
        },
      };
      next();
    },
  ];

  const mayManageInvitation: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >[] = [...invitationExists, ...isCourseStaff];

  const isInvitationUsable: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    { invitationJoinCourse: InvitationJoinCourse }
  >[] = [
    ...invitationExists,
    (req, res, next) => {
      if (isInvitationValid(res.locals.invitationJoinCourse.invitation))
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...mayManageInvitation,
    asyncHandler(async (req, res) => {
      const link = `${app.get("url")}/courses/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.reference
      }/invitations/${res.locals.invitationJoinCourse.invitation.reference}`;

      res.send(
        app.get("layout main")(
          req,
          res,
          html`
            <title>
              Invitation ·
              ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
                .name}
              · CourseLore
            </title>
          `,
          html`
            <h1>
              Invitation ·
              <a
                href="${app.get("url")}/courses/${res.locals
                  .enrollmentJoinCourseJoinThreadsWithMetadata.course
                  .reference}"
                >${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
                  .name}</a
              >
            </h1>
            <nav>
              <p class="hint">
                <a
                  href="${app.get("url")}/courses/${res.locals
                    .enrollmentJoinCourseJoinThreadsWithMetadata.course
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
                  ><svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                  >
                    <path
                      d="M7.78 12.53a.75.75 0 01-1.06 0L2.47 8.28a.75.75 0 010-1.06l4.25-4.25a.75.75 0 011.06 1.06L4.81 7h7.44a.75.75 0 010 1.5H4.81l2.97 2.97a.75.75 0 010 1.06z"
                      fill="gray"
                    ></path>
                  </svg>
                  Return to Course Settings</a
                >
              </p>
            </nav>

            $${isInvitationValid(res.locals.invitationJoinCourse.invitation)
              ? html``
              : html`
                  <div
                    style="${css`
                      text-align: center;
                    `}"
                  >
                    <p>
                      <strong class="red"
                        >This invitation link has expired.</strong
                      >
                    </p>
                    <p class="hint">
                      You may make it valid again by extending the expiration in
                      the form at the end of the page.
                    </p>
                  </div>
                `}

            <p>
              <strong>Invitation link</strong><br />
              <code>${link}</code><br />
              <button
                type="button"
                onclick="${javascript`
                  (async () => {
                    await navigator.clipboard.writeText("${link}");
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
            <details>
              <summary>QR Code</summary>
              <p>
                People may point their phone camera at the image below to follow
                the invitation link:
              </p>
              <p>
                $${(await QRCode.toString(link, { type: "svg" }))
                  .replace("#000000", "url('#gradient')")
                  .replace("#ffffff", "#00000000")}
              </p>
            </details>

            <hr />

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
              <p>
                <label>
                  <strong>Role</strong><br />
                  <select disabled class="full-width">
                    $${ROLES.map(
                      (role) =>
                        html`
                          <option
                            ${role ===
                            res.locals.invitationJoinCourse.invitation.role
                              ? `selected`
                              : ``}
                          >
                            ${lodash.capitalize(role)}
                          </option>
                        `
                    )}</select
                  ><br />
                  <small class="full-width hint"
                    >To avoid mistakes you may not change the role, but you may
                    <a
                      href="${app.get("url")}/courses/${res.locals
                        .enrollmentJoinCourseJoinThreadsWithMetadata.course
                        .reference}/settings#invitations"
                      >create a new invitation link for another role</a
                    >.</small
                  >
                </label>
              </p>

              <div>
                <form method="POST" action="${link}?_method=PATCH">
                  <p>
                    <strong>Expiration</strong><br />
                    <label>
                      <input
                        type="radio"
                        name="isExpiresAt"
                        value="false"
                        ${res.locals.invitationJoinCourse.invitation
                          .expiresAt === null
                          ? `checked`
                          : ``}
                        required
                        onchange="${javascript`
                                this.closest("p").querySelector('[name="expiresAt"]').disabled = true;
                              `}"
                      />
                      Doesn’t expire
                    </label>
                    <br />

                    <span
                      style="${css`
                        display: flex;
                        align-items: baseline;

                        & > * + * {
                          margin-left: 0.5rem !important;
                        }
                      `}"
                    >
                      <label>
                        <input
                          type="radio"
                          name="isExpiresAt"
                          value="true"
                          ${res.locals.invitationJoinCourse.invitation
                            .expiresAt === null
                            ? ``
                            : `checked`}
                          required
                          onchange="${javascript`
                                  const expiresAt = this.closest("p").querySelector('[name="expiresAt"]');
                                  expiresAt.disabled = false;
                                  expiresAt.focus();
                                  expiresAt.setSelectionRange(0, 0);
                                `}"
                        />
                        Expires at
                      </label>
                      <input
                        type="text"
                        name="expiresAt"
                        value="${res.locals.invitationJoinCourse.invitation
                          .expiresAt === null
                          ? new Date()
                              .toISOString()
                              .slice(0, "YYYY-MM-DD HH:SS".length)
                              .replace("T", " ")
                          : res.locals.invitationJoinCourse.invitation
                              .expiresAt}"
                        required
                        ${res.locals.invitationJoinCourse.invitation
                          .expiresAt === null
                          ? `disabled`
                          : ``}
                        pattern="\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}"
                        data-validator-custom="${javascript`
                                if (!validator.isAfter(this.value.replace(" ", "T")))
                                  return "Must be in the future";
                              `}"
                        class="full-width"
                        style="${css`
                          flex: 1 !important;
                        `}"
                      />
                    </span>
                  </p>
                  <p><button class="full-width">Change Expiration</button></p>
                </form>

                $${isInvitationValid(res.locals.invitationJoinCourse.invitation)
                  ? html`
                      <form method="POST" action="${link}?_method=PATCH">
                        <input type="hidden" name="expireNow" value="true" />
                        <p>
                          <button class="full-width red">
                            Expire Invitation Now
                          </button>
                        </p>
                      </form>
                    `
                  : html``}
              </div>
            </div>
          `
        )
      );
    })
  );

  app.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    { isExpiresAt?: "true" | "false"; expiresAt?: string; expireNow?: "true" },
    {},
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...mayManageInvitation,
    (req, res) => {
      if (req.body.isExpiresAt === "false")
        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = NULL WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
        );
      else if (req.body.isExpiresAt === "true")
        if (
          typeof req.body.expiresAt !== "string" ||
          !validator.isAfter(req.body.expiresAt)
        )
          throw new ValidationError();
        else
          database.run(
            sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
          );

      if (req.body.expireNow === "true")
        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = CURRENT_TIMESTAMP WHERE "id" = ${res.locals.invitationJoinCourse.invitation.id}`
        );

      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
            .reference
        }/invitations/${res.locals.invitationJoinCourse.invitation.reference}`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isInvitationUsable,
    ...isEnrolledInCourse,
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
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isInvitationUsable,
    ...isAuthenticated,
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
    {
      invitationJoinCourse: InvitationJoinCourse;
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isInvitationUsable,
    ...isAuthenticated,
    (req, res) => {
      database.run(
        sql`
            INSERT INTO "enrollments" ("user", "course", "role", "accentColor")
            VALUES (
              ${res.locals.user.id},
              ${res.locals.invitationJoinCourse.course.id},
              ${res.locals.invitationJoinCourse.invitation.role},
              ${defaultAccentColor(req, res)}
            )
          `
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
    {
      invitationJoinCourse: InvitationJoinCourse;
    }
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isInvitationUsable,
    ...isUnauthenticated,
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
                  href="${app.get(
                    "url"
                  )}/authenticate?redirect=${req.originalUrl}"
                  >authenticate</a
                >.
              </p>
            </div>
          `
        )
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
          otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
          threadWithMetadataJoinPostsJoinAuthors?: ThreadWithMetadataJoinPostsJoinAuthors;
        }
      >,
      res: express.Response<
        HTML,
        {
          user: User;
          enrollmentsJoinCourses: EnrollmentJoinCourse[];
          enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
          otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
          threadWithMetadataJoinPostsJoinAuthors?: ThreadWithMetadataJoinPostsJoinAuthors;
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
              box-sizing: border-box;
              width: 100vw;
              height: 100vh;
              border-top: 10px solid
                ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata
                  .enrollment.accentColor};
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
                  margin-top: 1rem;
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
                      margin-top: -0.5rem;
                    `}"
                  >
                    <a
                      href="${app.get("url")}/courses/${res.locals
                        .enrollmentJoinCourseJoinThreadsWithMetadata.course
                        .reference}"
                      ><strong
                        >${res.locals
                          .enrollmentJoinCourseJoinThreadsWithMetadata.course
                          .name}</strong
                      >
                      (${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata
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
                    href="${app.get("url")}/courses/${res.locals
                      .enrollmentJoinCourseJoinThreadsWithMetadata.course
                      .reference}/threads/new"
                    >New thread</a
                  >
                </p>
                <nav>
                  $${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.threadsWithMetadata.map(
                    (threadWithMetadata) =>
                      html`
                        <a
                          href="${app.get("url")}/courses/${res.locals
                            .enrollmentJoinCourseJoinThreadsWithMetadata.course
                            .reference}/threads/${threadWithMetadata.reference}"
                          style="${css`
                            line-height: 1.3;
                            display: block;
                            padding: 0.5rem 1rem;
                            margin: 0 -1rem;

                            ${threadWithMetadata.id ===
                            res.locals.threadWithMetadataJoinPostsJoinAuthors
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
                          <p><strong>${threadWithMetadata.title}</strong></p>
                          <p class="hint">
                            #${threadWithMetadata.reference} created
                            $${relativeTime(threadWithMetadata.createdAt)} by
                            ${threadWithMetadata.author.user.name}
                            $${threadWithMetadata.updatedAt !==
                            threadWithMetadata.createdAt
                              ? html`<br />and last updated
                                  $${relativeTime(threadWithMetadata.updatedAt)}`
                              : html``}
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
                  margin: 1rem auto;

                  & > h1:first-child {
                    margin-top: 1rem;
                  }
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
            onkeypress="${javascript`
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                const form = this.closest("form");
                if (isValid(form)) form.submit();
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

  app.post<
    {},
    any,
    { content?: string },
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/preview", ...isAuthenticated, (req, res) => {
    if (
      typeof req.body.content !== "string" ||
      validator.isEmpty(req.body.content, { ignore_whitespace: true })
    )
      throw new ValidationError();

    res.send(app.get("text processor")(req.body.content));
  });

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >(
    "/courses/:courseReference/threads/new",
    ...isEnrolledInCourse,
    (req, res) => {
      res.send(
        app.get("layout thread")(
          req,
          res,
          html`
            <title>
              Create a New Thread ·
              ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
                .name}
              · CourseLore
            </title>
          `,
          html`
            <h1>Create a New Thread</h1>

            <form
              method="POST"
              action="${app.get("url")}/courses/${res.locals
                .enrollmentJoinCourseJoinThreadsWithMetadata.course
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
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
    }
  >("/courses/:courseReference/threads", ...isEnrolledInCourse, (req, res) => {
    if (
      typeof req.body.title !== "string" ||
      validator.isEmpty(req.body.title, { ignore_whitespace: true }) ||
      typeof req.body.content !== "string" ||
      validator.isEmpty(req.body.content, { ignore_whitespace: true })
    )
      throw new ValidationError();

    const newThreadReference =
      database.get<{ newThreadReference: string }>(
        sql`
          SELECT CAST(MAX(CAST("threads"."reference" AS INTEGER)) + 1 AS TEXT) AS "newThreadReference"
          FROM "threads"
          WHERE "threads"."course" = ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.id}
        `
      )?.newThreadReference ?? "1";

    const threadId = database.run(
      sql`
        INSERT INTO "threads" ("course", "reference", "title")
        VALUES (
          ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.id},
          ${newThreadReference},
          ${req.body.title}
        )
      `
    ).lastInsertRowid;
    database.run(
      sql`
        INSERT INTO "posts" ("thread", "reference", "author", "content")
        VALUES (
          ${threadId},
          ${"1"},
          ${
            res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment.id
          },
          ${req.body.content}
        )
      `
    );

    res.redirect(
      `${app.get("url")}/courses/${
        res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course.reference
      }/threads/${newThreadReference}`
    );
  });

  const isThreadAccessible: express.RequestHandler<
    { courseReference: string; threadReference: string },
    HTML,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
      threadWithMetadataJoinPostsJoinAuthors: ThreadWithMetadataJoinPostsJoinAuthors;
    }
  >[] = [
    ...isEnrolledInCourse,
    (req, res, next) => {
      const threadWithMetadata = res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.threadsWithMetadata.find(
        (threadWithMetadata) =>
          threadWithMetadata.reference === req.params.threadReference
      );
      if (threadWithMetadata === undefined) return next("route");
      const postsJoinAuthors = database
        .all<{
          postId: number;
          createdAt: string;
          updatedAt: string;
          reference: string;
          content: string;
          authorEnrollmentId?: number;
          role?: Role;
          accentColor?: AccentColor;
          authorUserId?: number;
          email?: string;
          name?: string;
        }>(
          sql`
            SELECT "posts"."id" AS "postId",
                   "posts"."createdAt",
                   "posts"."updatedAt",
                   "posts"."reference",
                   "posts"."content",
                   "authorEnrollment"."id" AS "authorEnrollmentId",
                   "authorEnrollment"."role",
                   "authorEnrollment"."accentColor",
                   "authorUser"."id" AS "authorUserId",
                   "authorUser"."email",
                   "authorUser"."name"
            FROM "posts"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "posts"."author" = "authorEnrollment"."id"
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
            reference: row.reference,
            content: row.content,
          },
          author:
            row.authorEnrollmentId !== undefined
              ? {
                  enrollment: {
                    id: row.authorEnrollmentId!,
                    role: row.role!,
                    accentColor: row.accentColor!,
                  },
                  user: {
                    id: row.authorUserId!,
                    email: row.email!,
                    name: row.name!,
                  },
                }
              : ANONYMOUS,
        }));

      res.locals.threadWithMetadataJoinPostsJoinAuthors = {
        threadWithMetadata,
        postsJoinAuthors,
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
        otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthors: ThreadWithMetadataJoinPostsJoinAuthors;
      }
    >,
    res: express.Response<
      any,
      {
        user: User;
        enrollmentsJoinCourses: EnrollmentJoinCourse[];
        enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
        otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
        threadWithMetadataJoinPostsJoinAuthors: ThreadWithMetadataJoinPostsJoinAuthors;
      }
    >
  ): boolean =>
    res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment.role ===
      "staff" ||
    (res.locals.threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata
      .author as EnrollmentJoinUser)?.user?.id === res.locals.user.id;

  // TODO: Continue here:
  //       1. Do something better than a float on the “Edit” button.
  //       2. Only show the “Edit” button to people who can edit the title.
  //       3. Create the .patch() action.
  //       4. Maybe rename the middlewares above for invitation so that they indicate that there’s a predicate and a related middleware—a pattern that’s emerging here as well. The predicate is used for conditionally displaying stuff, and the middleware for authorization.
  // Other note: There’s a pattern emerging of buttons which toggle the visibility of components within a container. The first instance is the “Write”/“Preview” in the textEditor(), the other is right here on the thread title (and it’ll also come up in editing the posts…)
  app.get<
    { courseReference: string; threadReference: string },
    HTML,
    {},
    {},
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
      threadWithMetadataJoinPostsJoinAuthors: ThreadWithMetadataJoinPostsJoinAuthors;
    }
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isThreadAccessible,
    (req, res) => {
      res.send(
        app.get("layout thread")(
          req,
          res,
          html`<title>
            ${res.locals.threadWithMetadataJoinPostsJoinAuthors
              .threadWithMetadata.title}
            ·
            ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
              .name}
            · CourseLore
          </title>`,
          html`
            <div class="title">
              <div class="show">
                <button
                  type="button"
                  style="${css`
                    float: right;
                  `}"
                  onclick="${javascript`
                    const title = this.closest(".title");
                    title.querySelector(".show").hidden = true;
                    title.querySelector(".edit").hidden = false;
                  `}"
                >
                  Edit
                </button>
                <h1>
                  ${res.locals.threadWithMetadataJoinPostsJoinAuthors
                    .threadWithMetadata.title}

                  <a
                    href="${app.get("url")}/courses/${res.locals
                      .enrollmentJoinCourseJoinThreadsWithMetadata.course
                      .reference}/threads/${res.locals
                      .threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata
                      .reference}"
                    class="hint"
                    >#${res.locals.threadWithMetadataJoinPostsJoinAuthors
                      .threadWithMetadata.reference}</a
                  >
                </h1>
              </div>
              <form
                method="POST"
                action="${app.get("url")}/courses/${res.locals
                  .enrollmentJoinCourseJoinThreadsWithMetadata.course
                  .reference}/threads/${res.locals
                  .threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata
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
                    value="${res.locals.threadWithMetadataJoinPostsJoinAuthors
                      .threadWithMetadata.title}"
                    autocomplete="off"
                    required
                    class="full-width"
                  />
                </p>
                <p>
                  <button class="green">Save</button>
                  <button
                    type="button"
                    onclick="${javascript`
                      const title = this.closest(".title");
                      title.querySelector(".show").hidden = false;
                      title.querySelector(".edit").hidden = true;
                    `}"
                  >
                    Cancel
                  </button>
                </p>
              </form>
            </div>

            $${res.locals.threadWithMetadataJoinPostsJoinAuthors.postsJoinAuthors.map(
              (postJoinAuthor) => html`
                <section
                  id="${postJoinAuthor.post.reference}"
                  style="${css`
                    border-bottom: 1px solid silver;

                    @media (prefers-color-scheme: dark) {
                      border-color: black;
                    }
                  `}"
                >
                  <p>
                    <strong>${postJoinAuthor.author.user.name}</strong>
                    <span class="hint">
                      said
                      $${relativeTime(
                        postJoinAuthor.post.createdAt
                      )}$${postJoinAuthor.post.updatedAt !==
                      postJoinAuthor.post.createdAt
                        ? html` (and last edited
                          $${relativeTime(postJoinAuthor.post.updatedAt)})`
                        : html``}
                      <a
                        href="${app.get("url")}/courses/${res.locals
                          .enrollmentJoinCourseJoinThreadsWithMetadata.course
                          .reference}/threads/${req.params
                          .threadReference}#${postJoinAuthor.post.reference}"
                        style="${css`
                          text-decoration: none;
                        `}"
                        >#${res.locals.threadWithMetadataJoinPostsJoinAuthors
                          .threadWithMetadata.reference}/${postJoinAuthor.post
                          .reference}</a
                      >
                    </span>
                  </p>
                  $${app.get("text processor")(postJoinAuthor.post.content)}
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
    {
      user: User;
      enrollmentsJoinCourses: EnrollmentJoinCourse[];
      enrollmentJoinCourseJoinThreadsWithMetadata: EnrollmentJoinCourseJoinThreadsWithMetadata;
      otherEnrollmentsJoinCourses: EnrollmentJoinCourse[];
      threadWithMetadataJoinPostsJoinAuthors: ThreadWithMetadataJoinPostsJoinAuthors;
    }
  >(
    "/courses/:courseReference/threads/:threadReference",
    ...isThreadAccessible,
    (req, res) => {
      if (
        typeof req.body.content !== "string" ||
        validator.isEmpty(req.body.content, { ignore_whitespace: true })
      )
        throw new ValidationError();

      const newPostReference = database.get<{ newPostReference: string }>(
        sql`
          SELECT CAST(MAX(CAST("posts"."reference" AS INTEGER)) + 1 AS TEXT) AS "newPostReference"
          FROM "posts"
          WHERE "posts"."thread" = ${res.locals.threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata.id}
        `
      )!.newPostReference;

      database.run(
        sql`
          INSERT INTO "posts" ("thread", "reference", "author", "content")
          VALUES (
            ${res.locals.threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata.id},
            ${newPostReference},
            ${res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.enrollment.id},
            ${req.body.content}
          )
        `
      );

      res.redirect(
        `${app.get("url")}/courses/${
          res.locals.enrollmentJoinCourseJoinThreadsWithMetadata.course
            .reference
        }/threads/${
          res.locals.threadWithMetadataJoinPostsJoinAuthors.threadWithMetadata
            .reference
        }#${newPostReference}`
      );
    }
  );

  app.all<
    {},
    HTML,
    {},
    {},
    { user: User; enrollmentsJoinCourses: EnrollmentJoinCourse[] }
  >("*", ...isAuthenticated, (req, res) => {
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
  });

  app.all<{}, HTML, {}, {}, {}>("*", ...isUnauthenticated, (req, res) => {
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
                href="${app.get(
                  "url"
                )}/authenticate?redirect=${req.originalUrl}"
                >authenticate</a
              >
              to see this page.
            </p>
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
      app.get("layout main")(
        req,
        res,
        html`<title>${type} Error · CourseLore</title>`,
        html`
          <h1>${type} Error</h1>

          <p>
            This is an issue in CourseLore; please report to
            <a href="mailto:issues@courselore.org">issues@courselore.org</a>.
          </p>
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
            CourseLore doesn’t send emails in demonstration mode. Here’s what
            would have been sent:
          </p>
          <p><strong>From:</strong> CourseLore</p>
          <p><strong>To:</strong> ${to}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Body:</strong></p>
          $${body}
        </div>
      `;
    database.run(
      sql`INSERT INTO "emailsQueue" ("to", "subject", "body") VALUES (${to}, ${subject}, ${body})`
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
