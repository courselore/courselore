#!/usr/bin/env node

import path from "path";
import assert from "assert/strict";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";

import { Database, sql } from "@leafac/sqlite";
import { html, HTML } from "@leafac/html";
type CSS = string;
import css from "tagged-template-noop";
import javascript from "tagged-template-noop";
import { JSDOM } from "jsdom";
import murmurHash2 from "@emotion/hash";
import postcss from "postcss";
import postcssNested from "postcss-nested";
import autoprefixer from "autoprefixer";

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
import dedent from "dedent";

const VERSION = require("../package.json").version;

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

  interface Constants {
    accentColors: AccentColor[];
  }
  type AccentColor =
    | "purple"
    | "fuchsia"
    | "pink"
    | "rose"
    | "red"
    | "orange"
    | "amber"
    | "yellow"
    | "lime"
    | "green"
    | "emerald"
    | "teal"
    | "cyan"
    | "light-blue"
    | "blue"
    | "indigo"
    | "violet";
  app.locals.constants.accentColors = [
    "purple",
    "fuchsia",
    "pink",
    "rose",
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "light-blue",
    "blue",
    "indigo",
    "violet",
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

      CREATE TABLE "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "nonce" TEXT NOT NULL UNIQUE,
        "content" TEXT NOT NULL
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
        "accentColor" TEXT NOT NULL CHECK ("accentColor" IN ('purple', 'fuchsia', 'pink', 'rose', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'light-blue', 'blue', 'indigo', 'violet')),
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
    base: (_: {
      req: express.Request<{}, any, {}, {}, {}>;
      res: express.Response<any, {}>;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.base = ({ req, res, head, body }) => {
    // TODO: Extract this logic into @leafac/css.
    const bodyDOM = JSDOM.fragment(html`<div>$${body}</div>`);
    const styles = new Map<string, CSS>();
    const extractStyle = (fragment: ParentNode) => {
      for (const element of fragment.querySelectorAll("[style]")) {
        const style = element.getAttribute("style")!;
        element.removeAttribute("style");
        const className = `style--${murmurHash2(style)}`;
        element.classList.add(className);
        styles.set(className, style);
      }
    };
    extractStyle(bodyDOM);
    for (const element of bodyDOM.querySelectorAll("[data-tippy-allowHTML]")) {
      const content = JSDOM.fragment(
        html`<div>$${element.getAttribute("data-tippy-content")!}</div>`
      );
      extractStyle(content);
      element.setAttribute(
        "data-tippy-content",
        content.firstElementChild!.innerHTML
      );
    }

    return html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
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
          <style>
            $${postcss([postcssNested, autoprefixer]).process(
              css`
                /* RESET */

                /*
                  https://necolas.github.io/normalize.css/8.0.1/normalize.css
                  https://meyerweb.com/eric/tools/css/reset/
                  https://github.com/twbs/bootstrap/blob/649c2bb0bf326db36cbbf7e72c0541b19749a70e/dist/css/bootstrap-reboot.css
                  https://github.com/sindresorhus/modern-normalize/blob/1fc6b5a86676b7ac8abc62d04d6080f92debc70f/modern-normalize.css
                  https://github.com/suitcss/base/blob/50d5ad1e0d6790eb3df29b705db3684a9909894f/lib/base.css
                  https://github.com/tailwindlabs/tailwindcss/blob/b442c912e2d052ad026fd2e3d31bc450f620a784/src/plugins/css/preflight.css
                  https://github.com/jensimmons/cssremedy/blob/468e31a7eda599eea2003ed7983c190828ffb5fd/css/remedy.css
                  https://github.com/csstools/sanitize.css/tree/776bd4d72654ddb54aa5071b2cd10bb1957f7f97
                  https://unpkg.com/browse/@tailwindcss/forms@0.3.2/dist/forms.css
                */

                *,
                ::before,
                ::after {
                  font: inherit;
                  text-decoration: inherit;
                  text-size-adjust: 100%;
                  color: inherit;
                  background-color: transparent;
                  box-sizing: border-box;
                  padding: 0;
                  border: 0;
                  margin: 0;
                  outline: 0;
                  overflow-wrap: break-word;
                  appearance: none;
                  list-style: none;
                  resize: none;
                  cursor: inherit;
                }

                ::-webkit-details-marker {
                  display: none;
                }

                /* DESIGN SYSTEM */

                /*
                  https://github.com/tailwindlabs/tailwindcss/blob/e6ea821a7a5a7244dfe2be948f8a4209620924a5/stubs/defaultConfig.stub.js
                  https://github.com/tailwindlabs/tailwindcss/blob/e6ea821a7a5a7244dfe2be948f8a4209620924a5/colors.js
                */

                :root {
                  --font-family--sans-serif: "IBM Plex Sans", sans-serif;
                  --font-family--monospace: "IBM Plex Mono", monospace;
                  --font-family--serif: "IBM Plex Serif", serif;

                  --font-size--xs: 0.75rem;
                  --line-height--xs: 1rem;
                  --font-size--sm: 0.875rem;
                  --line-height--sm: 1.25rem;
                  --font-size--base: 1rem;
                  --line-height--base: 1.5rem;
                  --font-size--lg: 1.125rem;
                  --line-height--lg: 1.75rem;
                  --font-size--xl: 1.25rem;
                  --line-height--xl: 1.75rem;
                  --font-size--2xl: 1.5rem;
                  --line-height--2xl: 2rem;
                  --font-size--3xl: 1.875rem;
                  --line-height--3xl: 2.25rem;
                  --font-size--4xl: 2.25rem;
                  --line-height--4xl: 2.5rem;
                  --font-size--5xl: 3rem;
                  --line-height--5xl: 1;
                  --font-size--6xl: 3.75rem;
                  --line-height--6xl: 1;
                  --font-size--7xl: 4.5rem;
                  --line-height--7xl: 1;
                  --font-size--8xl: 6rem;
                  --line-height--8xl: 1;
                  --font-size--9xl: 8rem;
                  --line-height--9xl: 1;

                  --font-weight--main: 400;
                  --font-weight--bold: 500;
                  --font-weight--black: 700;

                  --space--0: 0px;
                  --space--px: 1px;
                  --space--0-5: 0.125rem;
                  --space--1: 0.25rem;
                  --space--1-5: 0.375rem;
                  --space--2: 0.5rem;
                  --space--2-5: 0.625rem;
                  --space--3: 0.75rem;
                  --space--3-5: 0.875rem;
                  --space--4: 1rem;
                  --space--5: 1.25rem;
                  --space--6: 1.5rem;
                  --space--7: 1.75rem;
                  --space--8: 2rem;
                  --space--9: 2.25rem;
                  --space--10: 2.5rem;
                  --space--11: 2.75rem;
                  --space--12: 3rem;
                  --space--14: 3.5rem;
                  --space--16: 4rem;
                  --space--20: 5rem;
                  --space--24: 6rem;
                  --space--28: 7rem;
                  --space--32: 8rem;
                  --space--36: 9rem;
                  --space--40: 10rem;
                  --space--44: 11rem;
                  --space--48: 12rem;
                  --space--52: 13rem;
                  --space--56: 14rem;
                  --space--60: 15rem;
                  --space--64: 16rem;
                  --space--72: 18rem;
                  --space--80: 20rem;
                  --space--96: 24rem;

                  --border-width--0: 0;
                  --border-width--1: 1px;
                  --border-width--2: 2px;
                  --border-width--4: 4px;
                  --border-width--8: 8px;

                  --border-radius--none: 0px;
                  --border-radius--sm: 0.125rem;
                  --border-radius: 0.25rem;
                  --border-radius--md: 0.375rem;
                  --border-radius--lg: 0.5rem;
                  --border-radius--xl: 0.75rem;
                  --border-radius--2xl: 1rem;
                  --border-radius--3xl: 1.5rem;
                  --border-radius--full: 9999px;

                  --transition-duration: 150ms;
                  @media (prefers-reduced-motion: reduce) {
                    --transition-duration: 1ms;
                  }

                  --color--primary--50: var(--color--purple--50);
                  --color--primary--100: var(--color--purple--100);
                  --color--primary--200: var(--color--purple--200);
                  --color--primary--300: var(--color--purple--300);
                  --color--primary--400: var(--color--purple--400);
                  --color--primary--500: var(--color--purple--500);
                  --color--primary--600: var(--color--purple--600);
                  --color--primary--700: var(--color--purple--700);
                  --color--primary--800: var(--color--purple--800);
                  --color--primary--900: var(--color--purple--900);

                  --color--primary-gray--50: var(--color--cool-gray--50);
                  --color--primary-gray--100: var(--color--cool-gray--100);
                  --color--primary-gray--200: var(--color--cool-gray--200);
                  --color--primary-gray--300: var(--color--cool-gray--300);
                  --color--primary-gray--400: var(--color--cool-gray--400);
                  --color--primary-gray--500: var(--color--cool-gray--500);
                  --color--primary-gray--600: var(--color--cool-gray--600);
                  --color--primary-gray--700: var(--color--cool-gray--700);
                  --color--primary-gray--800: var(--color--cool-gray--800);
                  --color--primary-gray--900: var(--color--cool-gray--900);

                  --color--white: #ffffff;
                  --color--black: #000000;

                  --color--blue-gray--50: #f8fafc;
                  --color--blue-gray--100: #f1f5f9;
                  --color--blue-gray--200: #e2e8f0;
                  --color--blue-gray--300: #cbd5e1;
                  --color--blue-gray--400: #94a3b8;
                  --color--blue-gray--500: #64748b;
                  --color--blue-gray--600: #475569;
                  --color--blue-gray--700: #334155;
                  --color--blue-gray--800: #1e293b;
                  --color--blue-gray--900: #0f172a;

                  --color--cool-gray--50: #f9fafb;
                  --color--cool-gray--100: #f3f4f6;
                  --color--cool-gray--200: #e5e7eb;
                  --color--cool-gray--300: #d1d5db;
                  --color--cool-gray--400: #9ca3af;
                  --color--cool-gray--500: #6b7280;
                  --color--cool-gray--600: #4b5563;
                  --color--cool-gray--700: #374151;
                  --color--cool-gray--800: #1f2937;
                  --color--cool-gray--900: #111827;

                  --color--gray--50: #fafafa;
                  --color--gray--100: #f4f4f5;
                  --color--gray--200: #e4e4e7;
                  --color--gray--300: #d4d4d8;
                  --color--gray--400: #a1a1aa;
                  --color--gray--500: #71717a;
                  --color--gray--600: #52525b;
                  --color--gray--700: #3f3f46;
                  --color--gray--800: #27272a;
                  --color--gray--900: #18181b;

                  --color--true-gray--50: #fafafa;
                  --color--true-gray--100: #f5f5f5;
                  --color--true-gray--200: #e5e5e5;
                  --color--true-gray--300: #d4d4d4;
                  --color--true-gray--400: #a3a3a3;
                  --color--true-gray--500: #737373;
                  --color--true-gray--600: #525252;
                  --color--true-gray--700: #404040;
                  --color--true-gray--800: #262626;
                  --color--true-gray--900: #171717;

                  --color--warm-gray--50: #fafaf9;
                  --color--warm-gray--100: #f5f5f4;
                  --color--warm-gray--200: #e7e5e4;
                  --color--warm-gray--300: #d6d3d1;
                  --color--warm-gray--400: #a8a29e;
                  --color--warm-gray--500: #78716c;
                  --color--warm-gray--600: #57534e;
                  --color--warm-gray--700: #44403c;
                  --color--warm-gray--800: #292524;
                  --color--warm-gray--900: #1c1917;

                  --color--red--50: #fef2f2;
                  --color--red--100: #fee2e2;
                  --color--red--200: #fecaca;
                  --color--red--300: #fca5a5;
                  --color--red--400: #f87171;
                  --color--red--500: #ef4444;
                  --color--red--600: #dc2626;
                  --color--red--700: #b91c1c;
                  --color--red--800: #991b1b;
                  --color--red--900: #7f1d1d;

                  --color--orange--50: #fff7ed;
                  --color--orange--100: #ffedd5;
                  --color--orange--200: #fed7aa;
                  --color--orange--300: #fdba74;
                  --color--orange--400: #fb923c;
                  --color--orange--500: #f97316;
                  --color--orange--600: #ea580c;
                  --color--orange--700: #c2410c;
                  --color--orange--800: #9a3412;
                  --color--orange--900: #7c2d12;

                  --color--amber--50: #fffbeb;
                  --color--amber--100: #fef3c7;
                  --color--amber--200: #fde68a;
                  --color--amber--300: #fcd34d;
                  --color--amber--400: #fbbf24;
                  --color--amber--500: #f59e0b;
                  --color--amber--600: #d97706;
                  --color--amber--700: #b45309;
                  --color--amber--800: #92400e;
                  --color--amber--900: #78350f;

                  --color--yellow--50: #fefce8;
                  --color--yellow--100: #fef9c3;
                  --color--yellow--200: #fef08a;
                  --color--yellow--300: #fde047;
                  --color--yellow--400: #facc15;
                  --color--yellow--500: #eab308;
                  --color--yellow--600: #ca8a04;
                  --color--yellow--700: #a16207;
                  --color--yellow--800: #854d0e;
                  --color--yellow--900: #713f12;

                  --color--lime--50: #f7fee7;
                  --color--lime--100: #ecfccb;
                  --color--lime--200: #d9f99d;
                  --color--lime--300: #bef264;
                  --color--lime--400: #a3e635;
                  --color--lime--500: #84cc16;
                  --color--lime--600: #65a30d;
                  --color--lime--700: #4d7c0f;
                  --color--lime--800: #3f6212;
                  --color--lime--900: #365314;

                  --color--green--50: #f0fdf4;
                  --color--green--100: #dcfce7;
                  --color--green--200: #bbf7d0;
                  --color--green--300: #86efac;
                  --color--green--400: #4ade80;
                  --color--green--500: #22c55e;
                  --color--green--600: #16a34a;
                  --color--green--700: #15803d;
                  --color--green--800: #166534;
                  --color--green--900: #14532d;

                  --color--emerald--50: #ecfdf5;
                  --color--emerald--100: #d1fae5;
                  --color--emerald--200: #a7f3d0;
                  --color--emerald--300: #6ee7b7;
                  --color--emerald--400: #34d399;
                  --color--emerald--500: #10b981;
                  --color--emerald--600: #059669;
                  --color--emerald--700: #047857;
                  --color--emerald--800: #065f46;
                  --color--emerald--900: #064e3b;

                  --color--teal--50: #f0fdfa;
                  --color--teal--100: #ccfbf1;
                  --color--teal--200: #99f6e4;
                  --color--teal--300: #5eead4;
                  --color--teal--400: #2dd4bf;
                  --color--teal--500: #14b8a6;
                  --color--teal--600: #0d9488;
                  --color--teal--700: #0f766e;
                  --color--teal--800: #115e59;
                  --color--teal--900: #134e4a;

                  --color--cyan--50: #ecfeff;
                  --color--cyan--100: #cffafe;
                  --color--cyan--200: #a5f3fc;
                  --color--cyan--300: #67e8f9;
                  --color--cyan--400: #22d3ee;
                  --color--cyan--500: #06b6d4;
                  --color--cyan--600: #0891b2;
                  --color--cyan--700: #0e7490;
                  --color--cyan--800: #155e75;
                  --color--cyan--900: #164e63;

                  --color--light-blue--50: #f0f9ff;
                  --color--light-blue--100: #e0f2fe;
                  --color--light-blue--200: #bae6fd;
                  --color--light-blue--300: #7dd3fc;
                  --color--light-blue--400: #38bdf8;
                  --color--light-blue--500: #0ea5e9;
                  --color--light-blue--600: #0284c7;
                  --color--light-blue--700: #0369a1;
                  --color--light-blue--800: #075985;
                  --color--light-blue--900: #0c4a6e;

                  --color--blue--50: #eff6ff;
                  --color--blue--100: #dbeafe;
                  --color--blue--200: #bfdbfe;
                  --color--blue--300: #93c5fd;
                  --color--blue--400: #60a5fa;
                  --color--blue--500: #3b82f6;
                  --color--blue--600: #2563eb;
                  --color--blue--700: #1d4ed8;
                  --color--blue--800: #1e40af;
                  --color--blue--900: #1e3a8a;

                  --color--indigo--50: #eef2ff;
                  --color--indigo--100: #e0e7ff;
                  --color--indigo--200: #c7d2fe;
                  --color--indigo--300: #a5b4fc;
                  --color--indigo--400: #818cf8;
                  --color--indigo--500: #6366f1;
                  --color--indigo--600: #4f46e5;
                  --color--indigo--700: #4338ca;
                  --color--indigo--800: #3730a3;
                  --color--indigo--900: #312e81;

                  --color--violet--50: #f5f3ff;
                  --color--violet--100: #ede9fe;
                  --color--violet--200: #ddd6fe;
                  --color--violet--300: #c4b5fd;
                  --color--violet--400: #a78bfa;
                  --color--violet--500: #8b5cf6;
                  --color--violet--600: #7c3aed;
                  --color--violet--700: #6d28d9;
                  --color--violet--800: #5b21b6;
                  --color--violet--900: #4c1d95;

                  --color--purple--50: #faf5ff;
                  --color--purple--100: #f3e8ff;
                  --color--purple--200: #e9d5ff;
                  --color--purple--300: #d8b4fe;
                  --color--purple--400: #c084fc;
                  --color--purple--500: #a855f7;
                  --color--purple--600: #9333ea;
                  --color--purple--700: #7e22ce;
                  --color--purple--800: #6b21a8;
                  --color--purple--900: #581c87;

                  --color--fuchsia--50: #fdf4ff;
                  --color--fuchsia--100: #fae8ff;
                  --color--fuchsia--200: #f5d0fe;
                  --color--fuchsia--300: #f0abfc;
                  --color--fuchsia--400: #e879f9;
                  --color--fuchsia--500: #d946ef;
                  --color--fuchsia--600: #c026d3;
                  --color--fuchsia--700: #a21caf;
                  --color--fuchsia--800: #86198f;
                  --color--fuchsia--900: #701a75;

                  --color--pink--50: #fdf2f8;
                  --color--pink--100: #fce7f3;
                  --color--pink--200: #fbcfe8;
                  --color--pink--300: #f9a8d4;
                  --color--pink--400: #f472b6;
                  --color--pink--500: #ec4899;
                  --color--pink--600: #db2777;
                  --color--pink--700: #be185d;
                  --color--pink--800: #9d174d;
                  --color--pink--900: #831843;

                  --color--rose--50: #fff1f2;
                  --color--rose--100: #ffe4e6;
                  --color--rose--200: #fecdd3;
                  --color--rose--300: #fda4af;
                  --color--rose--400: #fb7185;
                  --color--rose--500: #f43f5e;
                  --color--rose--600: #e11d48;
                  --color--rose--700: #be123c;
                  --color--rose--800: #9f1239;
                  --color--rose--900: #881337;
                }

                /* GLOBAL STYLES */

                /* TODO: Try to get rid of most of these. Either they go into components, or they go into ‘.text’. */

                body {
                  font-family: var(--font-family--sans-serif);
                  font-size: var(--font-size--sm);
                  line-height: var(--line-height--sm);
                }

                code {
                  font-family: var(--font-family--monospace);
                }

                pre {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  overflow-x: auto;

                  code {
                    overflow-wrap: normal;
                  }
                }

                a,
                button {
                  cursor: pointer;
                }

                ::selection {
                  color: var(--color--primary--50);
                  background-color: var(--color--primary--800);
                }

                img,
                svg {
                  max-width: 100%;
                  height: auto;
                }

                :disabled {
                  cursor: not-allowed;
                }

                [hidden] {
                  display: none !important;
                }

                /* COMPONENTS */

                .heading--display--1 {
                  font-family: var(--font-family--serif);
                  font-size: var(--font-size--4xl);
                  line-height: var(--line-height--4xl);
                  font-weight: var(--font-weight--black);
                  font-style: italic;
                  text-align: center;
                }

                .heading--1 {
                  font-size: var(--font-size--base);
                  line-height: var(--line-height--base);
                  font-weight: var(--font-weight--bold);
                  color: var(--color--primary--900);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--400);
                  }
                }

                .heading--2 {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  font-weight: var(--font-weight--black);
                  text-transform: uppercase;
                  letter-spacing: var(--space--px);
                  color: var(--color--primary-gray--500);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--500);
                  }
                  display: flex;
                  gap: var(--space--2);
                }

                .text-gradient {
                  color: transparent;
                  background-clip: text;
                  background-image: linear-gradient(
                    135deg,
                    var(--color--primary--400) 0%,
                    var(--color--primary--700) 100%
                  );
                  @media (prefers-color-scheme: dark) {
                    background-image: linear-gradient(
                      135deg,
                      var(--color--primary--400) 0%,
                      var(--color--primary--700) 100%
                    );
                  }
                  padding: var(--space--0) var(--space--0-5);
                }

                .decorative-icon {
                  font-size: var(--font-size--9xl);
                  line-height: var(--line-height--9xl);
                  color: var(--color--primary-gray--200);
                  background-color: var(--color--primary-gray--50);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--600);
                    background-color: var(--color--primary-gray--800);
                  }
                  width: var(--space--48);
                  height: var(--space--48);
                  border-radius: 50%;
                  margin: var(--space--0) auto;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }

                .input--text {
                  width: 100%;
                  display: block;
                  padding: var(--space--2) var(--space--4);
                  border-radius: var(--border-radius--md);
                  color: var(--color--primary-gray--800);
                  background-color: var(--color--white);
                  &::placeholder {
                    color: var(--color--primary-gray--600);
                  }
                  &:focus {
                    box-shadow: inset var(--border-width--0)
                      var(--border-width--0) var(--border-width--0)
                      var(--border-width--2) var(--color--primary--400);
                  }
                  &:disabled {
                    color: var(--color--primary-gray--600);
                    background-color: var(--color--gray--200);
                  }
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--200);
                    background-color: var(--color--primary-gray--700);
                    &::placeholder {
                      color: var(--color--primary-gray--400);
                    }
                    &:focus {
                      box-shadow: inset var(--border-width--0)
                        var(--border-width--0) var(--border-width--0)
                        var(--border-width--2) var(--color--primary--800);
                    }
                    &:disabled {
                      color: var(--color--primary-gray--400);
                      background-color: var(--color--primary-gray--800);
                    }
                  }
                  transition: box-shadow var(--transition-duration);
                }

                .input--radio--group {
                  width: 100%;
                  display: flex;
                  & > * {
                    flex: 1;
                  }
                  & > label {
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }
                    & > span {
                      color: var(--color--primary-gray--700);
                      background-color: var(--color--white);
                      &:hover {
                        background-color: var(--color--primary-gray--200);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--100);
                        background-color: var(--color--primary-gray--700);
                        &:hover {
                          background-color: var(--color--primary-gray--600);
                        }
                      }
                      padding: var(--space--2) var(--space--4);
                      display: flex;
                      gap: var(--space--2);
                      justify-content: center;
                      cursor: pointer;
                      transition: color var(--transition-duration),
                        background-color var(--transition-duration),
                        border-color var(--transition-duration);
                    }
                    &:first-child > span {
                      border-top-left-radius: var(--border-radius--md);
                      border-bottom-left-radius: var(--border-radius--md);
                    }
                    &:last-child > span {
                      border-top-right-radius: var(--border-radius--md);
                      border-bottom-right-radius: var(--border-radius--md);
                    }
                    &:not(:last-child) > span {
                      border-right: var(--border-width--1) solid
                        var(--color--primary-gray--200);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--primary-gray--900);
                      }
                    }
                    &:not(:first-child) > span {
                      border-left: var(--border-width--1) solid
                        var(--color--primary-gray--200);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--primary-gray--900);
                      }
                      margin-left: calc(-1 * var(--border-width--1));
                    }
                    & > :focus + span {
                      background-color: var(--color--primary-gray--200);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--primary-gray--600);
                      }
                    }
                    & > :active + span,
                    & > :checked:focus + span {
                      color: var(--color--primary--50);
                      background-color: var(--color--primary--800);
                      border-color: var(--color--primary--800);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--200);
                        background-color: var(--color--primary--900);
                        border-color: var(--color--primary--900);
                      }
                    }
                    & > :checked {
                      &,
                      & ~ * {
                        position: relative;
                      }
                      & + span {
                        color: var(--color--primary--100);
                        background-color: var(--color--primary--700);
                        border-color: var(--color--primary--700);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary--200);
                          background-color: var(--color--primary--800);
                          border-color: var(--color--primary--800);
                        }
                      }
                    }
                  }
                }

                .button {
                  font-weight: var(--font-weight--bold);
                  padding: var(--space--2) var(--space--4);
                  border-radius: var(--border-radius--md);
                  display: inline-flex;
                  gap: var(--space--2);
                  justify-content: center;
                  align-items: center;
                  transition: background-color var(--transition-duration);

                  &.button--primary {
                    color: var(--color--primary--50);
                    background-color: var(--color--primary--700);
                    &:hover,
                    &:focus {
                      background-color: var(--color--primary--600);
                    }
                    &:active {
                      background-color: var(--color--primary--800);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      background-color: var(--color--primary--800);
                      &:hover,
                      &:focus {
                        background-color: var(--color--primary--700);
                      }
                      &:active {
                        background-color: var(--color--primary--800);
                      }
                    }
                  }

                  &.button--secondary {
                    &:hover,
                    &:focus {
                      background-color: var(--color--primary-gray--200);
                    }
                    &:active {
                      background-color: var(--color--primary-gray--300);
                    }
                    @media (prefers-color-scheme: dark) {
                      &:hover,
                      &:focus {
                        background-color: var(--color--primary-gray--800);
                      }
                      &:active {
                        background-color: var(--color--primary-gray--700);
                      }
                    }
                  }

                  &.button--rose {
                    color: var(--color--rose--50);
                    background-color: var(--color--rose--700);
                    &:hover,
                    &:focus {
                      background-color: var(--color--rose--600);
                    }
                    &:active {
                      background-color: var(--color--rose--800);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--rose--200);
                      background-color: var(--color--rose--800);
                      &:hover,
                      &:focus {
                        background-color: var(--color--rose--700);
                      }
                      &:active {
                        background-color: var(--color--rose--900);
                      }
                    }
                  }

                  &.button--green {
                    color: var(--color--green--50);
                    background-color: var(--color--green--700);
                    &:hover,
                    &:focus {
                      background-color: var(--color--green--600);
                    }
                    &:active {
                      background-color: var(--color--green--800);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--green--200);
                      background-color: var(--color--green--800);
                      &:hover,
                      &:focus {
                        background-color: var(--color--green--600);
                      }
                      &:active {
                        background-color: var(--color--green--900);
                      }
                    }
                  }
                }

                .button--inline {
                  color: var(--color--primary-gray--800);
                  &:hover,
                  &:focus,
                  :focus ~ &.after-toggle {
                    color: var(--color--primary--500);
                  }
                  &:active {
                    color: var(--color--primary--700);
                  }
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--300);
                    &:hover,
                    &:focus,
                    :focus ~ &.after-toggle {
                      color: var(--color--primary--500);
                    }
                    &:active {
                      color: var(--color--primary--700);
                    }
                  }
                  transition: color var(--transition-duration);

                  &.button--inline--gray {
                    color: var(--color--primary-gray--500);
                    &:hover,
                    &:focus,
                    :focus ~ &.after-toggle {
                      color: var(--color--primary--500);
                    }
                    &:active {
                      color: var(--color--primary--700);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary-gray--600);
                      &:hover,
                      &:focus,
                      :focus ~ &.after-toggle {
                        color: var(--color--primary--600);
                      }
                      &:active {
                        color: var(--color--primary--700);
                      }
                    }
                  }

                  &.button--inline--rose {
                    &:hover,
                    &:focus,
                    :focus ~ &.after-toggle {
                      color: var(--color--rose--500);
                    }
                    &:active {
                      color: var(--color--rose--700);
                    }
                    @media (prefers-color-scheme: dark) {
                      &:hover,
                      &:focus,
                      :focus ~ &.after-toggle {
                        color: var(--color--rose--500);
                      }
                      &:active {
                        color: var(--color--rose--700);
                      }
                    }
                  }
                }

                .link {
                  text-decoration: underline;
                  color: var(--color--primary--600);
                  &:hover,
                  &:focus {
                    color: var(--color--primary--400);
                  }
                  &:active {
                    color: var(--color--primary--800);
                  }
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--500);
                    &:hover,
                    &:focus {
                      color: var(--color--primary--300);
                    }
                    &:active {
                      color: var(--color--primary--700);
                    }
                  }
                  transition: color var(--transition-duration);
                }

                .strong {
                  font-weight: var(--font-weight--bold);
                  color: var(--color--primary-gray--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--300);
                  }
                }

                .separator {
                  margin: var(--space--4) var(--space--0);
                  border-top: var(--border-width--1) solid
                    var(--color--primary-gray--300);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--primary-gray--600);
                  }
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
                      var(--color--primary--700);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--primary--800);
                    }
                    border-radius: 50%;
                    justify-self: end;
                    margin-right: calc(-1 * var(--space--1));
                  }
                }

                .stripped {
                  & > * {
                    &:nth-child(even) {
                      background-color: var(--color--primary-gray--200);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--primary-gray--800);
                      }
                    }
                    @media (max-width: 1099px) {
                      --space--bleed: var(--space--2);
                    }
                    @media (min-width: 1100px) {
                      --space--bleed: var(--space--4);
                    }
                    width: calc(100% + 2 * var(--space--bleed));
                    padding: var(--space--2) var(--space--bleed);
                    border-radius: var(--border-radius--md);
                    margin-left: calc(-1 * var(--space--bleed));
                  }
                }

                .tippy-box {
                  font-size: var(--font-size--sm);
                  line-height: var(--line-height--sm);
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
                    padding: var(--space--1) var(--space--3);
                  }

                  .keyboard-shortcut {
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                  }

                  &[data-theme~="tooltip"] {
                    color: var(--color--primary--50);
                    --background-color: var(--color--primary--900);
                    --border-color: var(--color--primary--50);
                    .keyboard-shortcut {
                      color: var(--color--primary--200);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--900);
                      --background-color: var(--color--primary--200);
                      --border-color: var(--color--primary--900);
                      .keyboard-shortcut {
                        color: var(--color--primary--700);
                      }
                    }

                    &[data-theme~="tooltip--rose"] {
                      color: var(--color--rose--50);
                      --background-color: var(--color--rose--900);
                      --border-color: var(--color--rose--50);
                      .keyboard-shortcut {
                        color: var(--color--rose--200);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--rose--900);
                        --background-color: var(--color--rose--200);
                        --border-color: var(--color--rose--900);
                        .keyboard-shortcut {
                          color: var(--color--rose--700);
                        }
                      }
                    }
                  }

                  &[data-theme~="dropdown"] {
                    color: var(--color--primary--900);
                    --background-color: var(--color--primary--50);
                    --border-color: var(--color--primary--900);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      --background-color: var(--color--primary--900);
                      --border-color: var(--color--primary--400);
                    }

                    .dropdown--heading {
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      font-weight: var(--font-weight--black);
                      text-transform: uppercase;
                      letter-spacing: var(--space--px);
                      color: var(--color--primary--400);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--300);
                      }
                      padding: var(--space--0-5);
                      display: flex;
                      gap: var(--space--2);
                    }

                    .dropdown--item {
                      width: calc(100% + 2 * var(--space--2));
                      padding: var(--space--0-5) var(--space--2);
                      border-radius: var(--border-radius--md);
                      margin-left: calc(-1 * var(--space--2));
                      display: flex;
                      gap: var(--space--2);
                      transition: background-color var(--transition-duration);

                      &:hover,
                      &:focus,
                      &.active:focus {
                        background-color: var(--color--primary--100);
                      }
                      &:active,
                      &.active {
                        background-color: var(--color--primary--300);
                      }
                      @media (prefers-color-scheme: dark) {
                        &:hover,
                        &:focus,
                        &.active:focus {
                          background-color: var(--color--primary--600);
                        }
                        &:active,
                        &.active {
                          background-color: var(--color--primary--900);
                        }
                      }
                    }

                    .dropdown--separator {
                      margin: var(--space--2) var(--space--0);
                      border-top: var(--border-width--1) solid
                        var(--color--primary--300);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--primary--600);
                      }
                    }
                  }

                  &[data-theme~="dropdown--rose"] {
                    color: var(--color--rose--900);
                    --background-color: var(--color--rose--50);
                    --border-color: var(--color--rose--900);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--rose--200);
                      --background-color: var(--color--rose--900);
                      --border-color: var(--color--rose--400);
                    }

                    .dropdown--heading {
                      color: var(--color--rose--400);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--rose--300);
                      }
                    }

                    .dropdown--item {
                      &:hover {
                        background-color: var(--color--rose--100);
                        @media (prefers-color-scheme: dark) {
                          background-color: var(--color--rose--600);
                        }
                      }

                      &.active {
                        color: var(--color--rose--50);
                        background-color: var(--color--rose--600);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--rose--800);
                          background-color: var(--color--rose--100);
                        }
                      }
                    }

                    .dropdown--separator {
                      border-top: var(--border-width--1) solid
                        var(--color--rose--300);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--rose--600);
                      }
                    }
                  }
                }

                .modal {
                  &:not(.is-open) {
                    display: none;
                  }

                  & > div {
                    position: fixed;
                    top: 0;
                    right: 0;
                    bottom: 0;
                    left: 0;
                    display: flex;

                    &::before {
                      content: "";
                      background-color: var(--color--primary--300);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--primary--800);
                      }
                      position: absolute;
                      top: 0;
                      right: 0;
                      bottom: 0;
                      left: 0;
                      opacity: 70%;
                      z-index: -1;
                    }

                    &.modal--close-button::after {
                      content: "\\f622";
                      font-family: bootstrap-icons !important;
                      font-size: var(--font-size--xl);
                      line-height: var(--line-height--xl);
                      color: var(--color--primary--800);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--400);
                      }
                      position: fixed;
                      top: var(--space--2);
                      right: var(--space--4);
                      cursor: pointer;
                    }

                    & > div {
                      overflow: auto;
                      position: relative;

                      &.modal--dialog {
                        color: var(--color--primary-gray--700);
                        background-color: var(--color--primary-gray--100);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary-gray--200);
                          background-color: var(--color--primary-gray--900);
                        }
                        flex: 1;
                        max-width: min(
                          calc(100% - 2 * var(--space--4)),
                          calc(calc(var(--space--80) * 2))
                        );
                        max-height: calc(100% - 2 * var(--space--12));
                        padding: var(--space--4);
                        border-radius: var(--border-radius--xl);
                        margin: auto;
                      }
                    }
                  }
                }

                .text {
                  color: var(--color--primary-gray--700);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary-gray--400);
                  }

                  h1,
                  h2,
                  h3,
                  h4,
                  h5,
                  h6 {
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                    font-weight: var(--font-weight--bold);
                    color: var(--color--primary-gray--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary-gray--300);
                    }
                    &:not(:first-child) {
                      margin-top: var(--space--6);
                    }
                    &::before {
                      color: var(--color--primary-gray--500);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--600);
                      }
                      margin-right: var(--space--2);
                    }
                  }
                  h1::before {
                    content: "#";
                  }
                  h2::before {
                    content: "##";
                  }
                  h3::before {
                    content: "###";
                  }
                  h4::before {
                    content: "####";
                  }
                  h5::before {
                    content: "#####";
                  }
                  h6::before {
                    content: "######";
                  }

                  b,
                  strong {
                    font-weight: var(--font-weight--bold);
                    color: var(--color--primary-gray--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary-gray--300);
                    }
                  }

                  i,
                  em {
                    font-style: italic;
                    color: var(--color--primary-gray--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary-gray--300);
                    }
                  }

                  a {
                    text-decoration: underline;
                    color: var(--color--primary--600);
                    &:hover,
                    &:focus {
                      color: var(--color--primary--400);
                    }
                    &:active {
                      color: var(--color--primary--800);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--500);
                      &:hover,
                      &:focus {
                        color: var(--color--primary--300);
                      }
                      &:active {
                        color: var(--color--primary--700);
                      }
                    }
                    transition: color var(--transition-duration);
                  }

                  pre {
                    background-color: var(--color--white);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--color--primary-gray--700);
                    }
                    padding: var(--space--4);
                    border-radius: var(--border-radius--xl);
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
                    top: calc(-1 * var(--space--1));
                  }

                  sub {
                    bottom: calc(-1 * var(--space--1));
                  }

                  img {
                    background-color: var(--color--white);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--color--white);
                    }
                    max-width: 100%;
                    height: auto;
                    border-radius: var(--border-radius--xl);
                  }

                  hr {
                    margin: var(--space--4) var(--space--0);
                    border-top: var(--border-width--1) solid
                      var(--color--primary-gray--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--primary-gray--600);
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
                        color: var(--color--primary-gray--500);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary-gray--500);
                        }
                      }
                    }
                  }

                  ul {
                    padding-left: var(--space--8);
                    & > li {
                      list-style: disc;
                      &::marker {
                        color: var(--color--primary-gray--500);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary-gray--500);
                        }
                      }
                    }
                  }

                  table {
                    border-collapse: collapse;
                    caption {
                      font-style: italic;
                    }
                    th,
                    td {
                      padding: var(--space--1) var(--space--3);
                      border-bottom: var(--border-width--1) solid
                        var(--color--primary-gray--300);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--primary-gray--700);
                      }
                    }
                    th {
                      font-weight: var(--font-weight--bold);
                      color: var(--color--primary-gray--800);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--300);
                      }
                    }
                  }

                  blockquote {
                    font-style: italic;
                    padding-left: var(--space--8);
                    position: relative;
                    z-index: 0;
                    &::before {
                      content: "“";
                      font-size: var(--font-size--7xl);
                      line-height: var(--line-height--7xl);
                      color: var(--color--primary-gray--300);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--800);
                      }
                      display: block;
                      position: absolute;
                      left: calc(-1 * var(--space--2));
                      top: calc(-1 * var(--space--3));
                      z-index: -1;
                    }
                  }

                  dl {
                    dt {
                      font-weight: var(--font-weight--bold);
                      color: var(--color--primary-gray--800);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--300);
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
                      background-color: var(--color--primary-gray--700);
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
                        var(--color--primary-gray--300);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--primary-gray--700);
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
                    color: transparent;
                    width: var(--space--4);
                    height: var(--space--4);
                    border: var(--border-width--1) solid
                      var(--color--primary-gray--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--primary-gray--600);
                    }
                    border-radius: var(--border-radius);
                    margin-right: var(--space--0-5);
                    position: relative;
                    bottom: calc(-1 * var(--space--0-5));
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    &::before {
                      content: "\\f633";
                      font-family: bootstrap-icons !important;
                    }
                    &:checked {
                      color: var(--color--primary-gray--50);
                      background-color: var(--color--primary--700);
                      border-color: var(--color--primary--700);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--200);
                        background-color: var(--color--primary--800);
                        border-color: var(--color--primary--800);
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

                /*
                  https://github.com/twbs/bootstrap/blob/7d9adb702d96f9eb4706afb12cd73c9654979575/scss/mixins/_visually-hidden.scss
                  https://tailwindcss.com/docs/screen-readers
                  https://www.a11yproject.com/posts/2013-01-11-how-to-hide-content/
                  https://hugogiraudel.com/2016/10/13/css-hide-and-seek/
                  https://github.com/twbs/bootstrap/issues/25686
                  https://accessibility.18f.gov/hidden-content/
                */
                .visually-hidden:not(:focus):not(:focus-within):not(:active) {
                  width: 1px;
                  height: 1px;
                  padding: 0;
                  border: 0;
                  margin: -1px;
                  position: absolute;
                  overflow: hidden;
                  clip-path: inset(50%);
                  white-space: nowrap;
                }

                ${[...styles]
                  .map(
                    ([className, style]) =>
                      css`
                        .${className}.${className}.${className}.${className}.${className}.${className} {
                          ${style}
                        }
                      `
                  )
                  .join("")}
              `
            ).css}
          </style>
          $${head}
        </head>
        <body>
          $${bodyDOM.firstElementChild!.innerHTML}
          $${app.locals.partials.art.preamble}

          <script src="${app.locals.settings
              .url}/node_modules/@popperjs/core/dist/umd/popper.min.js"></script>
          <script src="${app.locals.settings
              .url}/node_modules/tippy.js/dist/tippy-bundle.umd.js"></script>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              for (const element of document.querySelectorAll(
                "[data-tippy-content]"
              )) {
                if (element.dataset.tippyCreated) continue;
                element.dataset.tippyCreated = true;
                tippy(element, {
                  arrow: tippy.roundArrow + tippy.roundArrow,
                  onMount() {
                    document.dispatchEvent(new Event("DOMContentLoaded"));
                  },
                  duration: window.matchMedia(
                    "(prefers-reduced-motion: reduce)"
                  ).matches
                    ? 1
                    : 150,
                  ...(element.dataset.tippyAppendTo === undefined
                    ? {}
                    : {
                        appendTo: element.closest(
                          element.dataset.tippyAppendTo
                        ),
                      }),
                });
              }
            });
          </script>

          <script src="${app.locals.settings
              .url}/node_modules/micromodal/dist/micromodal.min.js"></script>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              if (document.body.dataset.micromodalInitialized) return;
              document.body.dataset.micromodalInitialized = true;
              MicroModal.init({ disableScroll: true, disableFocus: true });
            });
          </script>

          <script type="module">
            import fitTextarea from "${app.locals.settings
              .url}/node_modules/fit-textarea/index.js";
            window.fitTextarea = fitTextarea;
          </script>
          <script>
            document.addEventListener("DOMContentLoaded", () => {
              for (const element of document.querySelectorAll(
                ".fit-textarea"
              )) {
                if (element.dataset.fitTextarea) continue;
                element.dataset.fitTextarea = true;
                fitTextarea.watch(element);
              }
            });
          </script>

          <script type="module">
            import * as textFieldEdit from "${app.locals.settings
              .url}/node_modules/text-field-edit/index.js";
            window.textFieldEdit = textFieldEdit;
          </script>
        </body>
      </html>
    `.trim();
  };

  interface Layouts {
    applicationBase: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<any, Partial<EventSourceMiddlewareLocals>>;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.applicationBase = ({ req, res, head, body }) =>
    app.locals.layouts.base({
      req,
      res,
      head,
      body: html`
        <div
          style="${css`
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `}"
        >
          $${app.locals.settings.demonstration
            ? html`
                <nav
                  style="${css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                    color: var(--color--rose--50);
                    background-color: var(--color--rose--500);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--rose--200);
                      background-color: var(--color--rose--700);
                    }
                    padding: var(--space--0) var(--space--2);
                    box-shadow: inset 0 calc(-1 * var(--border-width--1))
                      var(--color--rose--600);
                    @media (prefers-color-scheme: dark) {
                      box-shadow: inset 0 calc(-1 * var(--border-width--1))
                        var(--color--rose--900);
                    }
                    display: flex;
                    @media (max-width: 329px) {
                      flex-direction: column;
                      align-items: center;
                    }
                    @media (min-width: 330px) {
                      gap: var(--space--2);
                      justify-content: center;
                    }

                    & > * {
                      padding: var(--space--1) var(--space--2);
                      position: relative;
                      display: flex;
                      gap: var(--space--2);
                      transition: box-shadow var(--transition-duration);

                      &:hover,
                      &:focus,
                      &.active:focus {
                        box-shadow: inset 0 calc(-1 * var(--border-width--4))
                          var(--color--rose--700);
                        @media (prefers-color-scheme: dark) {
                          box-shadow: inset 0 calc(-1 * var(--border-width--4))
                            var(--color--rose--800);
                        }
                      }
                      &:active,
                      &.active {
                        box-shadow: inset 0 calc(-1 * var(--line-height--xl))
                          var(--color--rose--700);
                        @media (prefers-color-scheme: dark) {
                          box-shadow: inset 0 calc(-1 * var(--line-height--xl))
                            var(--color--rose--800);
                        }
                      }
                    }
                  `}"
                >
                  <button
                    data-tippy-content="CourseLore is running in Demonstration Mode. All data
                    may be lost, including courses, threads, posts, users,
                    and so forth. Also, no emails are actually sent; they
                    show up in the Demonstration Inbox instead."
                    data-tippy-theme="tooltip"
                    data-tippy-trigger="click"
                  >
                    <i class="bi bi-easel"></i>
                    Demonstration Mode
                  </button>
                  <a
                    href="${app.locals.settings.url}/demonstration-inbox"
                    class="${req.path === "/demonstration-inbox"
                      ? "active"
                      : ""}"
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
              for (const element of document.querySelectorAll(
                ".time--relative"
              )) {
                if (element.getAttribute("datetime") === null) {
                  const datetime = element.textContent.trim();
                  element.setAttribute("datetime", datetime);
                  element.dataset.tippyContent = datetime;
                  element.dataset.tippyTheme = "tooltip";
                  element.dataset.tippyTouch = "false";
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
              if (element.dataset.local) continue;
              element.dataset.local = true;
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
              element,
              ...element.querySelectorAll("*"),
            ];
            const elementsToReset = new Map();

            for (const element of elementsToValidate) {
              if (
                typeof element.reportValidity !== "function" ||
                element.matches("[disabled]")
              )
                continue;

              const valueInputByUser = element.value;
              const customValidity = validate(element);
              if (element.value !== valueInputByUser)
                elementsToReset.set(element, valueInputByUser);

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
                for (const [element, valueInputByUser] of elementsToReset)
                  element.value = valueInputByUser;
                return false;
              }
            }
            return true;

            function validate(element) {
              if (element.value === "" && !element.matches("[required]"))
                return;

              if (element.matches("[required]") && element.value.trim() === "")
                return "Fill out this field";

              if (
                element.matches('[type="email"]') &&
                !element.value.match(${app.locals.constants.emailRegExp})
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
              if (!isModified(document.body)) return;
              event.preventDefault();
              event.returnValue = "";
            };
            window.addEventListener("beforeunload", beforeUnloadHandler);
            document.addEventListener("submit", (event) => {
              window.removeEventListener("beforeunload", beforeUnloadHandler);
            });
          })();

          function isModified(element) {
            const elementsToCheck = [element, ...element.querySelectorAll("*")];
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
            ))
              button.disabled = true;
          });

          $${res.locals.eventSource
            ? javascript`
                const eventSource = new EventSource(window.location.href);
                /* TODO
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
                */
            `
            : javascript``};
        </script>
      `,
    });

  interface Layouts {
    box: (_: {
      req: express.Request<{}, any, {}, {}, {}>;
      res: express.Response<any, {}>;
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
            min-height: 100%;
            background-image: linear-gradient(
              135deg,
              var(--color--fuchsia--400) 0%,
              var(--color--purple--900) 100%
            );
            @media (prefers-color-scheme: dark) {
              background-image: linear-gradient(
                135deg,
                var(--color--fuchsia--600) 0%,
                var(--color--purple--900) 100%
              );
            }
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            align-items: center;
          `}"
        >
          <div
            style="${css`
              max-width: var(--space--96);
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <header>
              <h1 class="heading--display--1">
                <a
                  href="${app.locals.settings.url}/"
                  style="${css`
                    color: var(--color--primary--50);
                    * {
                      stroke: var(--color--primary--50);
                      transition: stroke var(--transition-duration);
                    }
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      * {
                        stroke: var(--color--primary--200);
                      }
                    }
                    &:hover,
                    &:focus {
                      color: var(--color--primary--200);
                      * {
                        stroke: var(--color--primary--200);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--300);
                        * {
                          stroke: var(--color--primary--300);
                        }
                      }
                    }
                    &:active {
                      color: var(--color--primary--400);
                      * {
                        stroke: var(--color--primary--400);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--500);
                        * {
                          stroke: var(--color--primary--500);
                        }
                      }
                    }
                    display: inline-flex;
                    gap: var(--space--2);
                    align-items: center;
                    transition: color var(--transition-duration);
                  `}"
                >
                  $${app.locals.partials.art.small} CourseLore
                </a>
                <script>
                  (() => {
                    const element =
                      document.currentScript.previousElementSibling;
                    document.addEventListener("DOMContentLoaded", () => {
                      if (element.dataset.animated) return;
                      element.dataset.animated = true;
                      const artAnimation = new ArtAnimation({
                        element,
                        speed: 0.001,
                        amount: 1,
                        startupDuration: 500,
                      });
                      element.addEventListener("mouseover", () => {
                        artAnimation.start();
                      });
                      element.addEventListener("mouseout", () => {
                        artAnimation.stop();
                      });
                      element.addEventListener("focus", () => {
                        artAnimation.start();
                      });
                      element.addEventListener("blur", () => {
                        artAnimation.stop();
                      });
                    });
                  })();
                </script>
              </h1>
            </header>
            <main>$${body}</main>
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
        Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
        Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      extraHeaders?: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.application = ({ req, res, head, extraHeaders, body }) => {
    const flash = app.locals.helpers.flash.get(req, res);
    return app.locals.layouts.applicationBase({
      req,
      res,
      head: html`
        $${head}
        $${res.locals.enrollment === undefined
          ? html``
          : html`
              <style>
                :root {
                  --color--primary--50: var(
                    --color--${res.locals.enrollment.accentColor}--50
                  );
                  --color--primary--100: var(
                    --color--${res.locals.enrollment.accentColor}--100
                  );
                  --color--primary--200: var(
                    --color--${res.locals.enrollment.accentColor}--200
                  );
                  --color--primary--300: var(
                    --color--${res.locals.enrollment.accentColor}--300
                  );
                  --color--primary--400: var(
                    --color--${res.locals.enrollment.accentColor}--400
                  );
                  --color--primary--500: var(
                    --color--${res.locals.enrollment.accentColor}--500
                  );
                  --color--primary--600: var(
                    --color--${res.locals.enrollment.accentColor}--600
                  );
                  --color--primary--700: var(
                    --color--${res.locals.enrollment.accentColor}--700
                  );
                  --color--primary--800: var(
                    --color--${res.locals.enrollment.accentColor}--800
                  );
                  --color--primary--900: var(
                    --color--${res.locals.enrollment.accentColor}--900
                  );
                }
              </style>
            `}
      `,
      body: html`
        <div
          style="${css`
            height: 100%;
            display: flex;
            flex-direction: column;
          `}"
        >
          <header
            style="${css`
              color: var(--color--primary--50);
              background-color: var(--color--primary--700);
              @media (prefers-color-scheme: dark) {
                color: var(--color--primary--200);
                background-color: var(--color--primary--800);
              }
              padding: var(--space--2) var(--space--4);
              display: flex;
              justify-content: space-between;
              align-items: center;
              & > * {
                width: var(--space--20);
              }

              .header--item {
                &:hover,
                &:focus {
                  color: var(--color--primary--200);
                }
                &:active {
                  color: var(--color--primary--400);
                }
                @media (prefers-color-scheme: dark) {
                  &:hover,
                  &:focus {
                    color: var(--color--white);
                  }
                  &:active {
                    color: var(--color--primary--400);
                  }
                }
                transition: color var(--transition-duration);
              }
            `}"
          >
            <h1
              style="${css`
                display: flex;
              `}"
            >
              <a
                href="${app.locals.settings.url}/"
                style="${css`
                  display: inline-flex;
                  * {
                    stroke: var(--color--primary--50);
                    @media (prefers-color-scheme: dark) {
                      stroke: var(--color--primary--200);
                    }
                    transition: stroke var(--transition-duration);
                  }
                  &:hover,
                  &:focus {
                    * {
                      stroke: var(--color--primary--200);
                      @media (prefers-color-scheme: dark) {
                        stroke: var(--color--primary--300);
                      }
                    }
                  }
                `}"
              >
                $${app.locals.partials.art.small}
                <span class="visually-hidden">CourseLore</span>
              </a>
              <script>
                (() => {
                  const element = document.currentScript.previousElementSibling;
                  document.addEventListener("DOMContentLoaded", () => {
                    if (element.dataset.animated) return;
                    element.dataset.animated = true;
                    const artAnimation = new ArtAnimation({
                      element,
                      speed: 0.001,
                      amount: 1,
                      startupDuration: 500,
                    });
                    element.addEventListener("mouseover", () => {
                      artAnimation.start();
                    });
                    element.addEventListener("mouseout", () => {
                      artAnimation.stop();
                    });
                    element.addEventListener("focus", () => {
                      artAnimation.start();
                    });
                    element.addEventListener("blur", () => {
                      artAnimation.stop();
                    });
                  });
                })();
              </script>
            </h1>

            $${res.locals.course === undefined
              ? html``
              : html`
                  <div
                    style="${css`
                      flex: 1;
                      display: flex;
                      justify-content: center;
                    `}"
                  >
                    <button
                      data-tippy-content="${html`
                        <p class="dropdown--heading">
                          <i class="bi bi-journal-text"></i>
                          ${res.locals.course.name}
                        </p>
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}"
                          class="dropdown--item"
                        >
                          <i class="bi bi-chat-left-text"></i>
                          Threads
                        </a>
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings"
                          class="dropdown--item"
                        >
                          <i class="bi bi-sliders"></i>
                          Course Settings
                        </a>
                        $${res.locals.otherEnrollments!.length === 0
                          ? html``
                          : html`
                              <hr class="dropdown--separator" />
                              <p class="dropdown--heading">
                                <i class="bi bi-arrow-left-right"></i>
                                Switch to Another Course
                              </p>
                              $${res.locals.otherEnrollments!.map(
                                (otherEnrollment) => html`
                                  <a
                                    href="${app.locals.settings
                                      .url}/courses/${otherEnrollment.course
                                      .reference}"
                                    class="dropdown--item"
                                    style="${css`
                                      color: var(
                                        --color--${otherEnrollment.accentColor}--50
                                      );
                                      background-color: var(
                                        --color--${otherEnrollment.accentColor}--500
                                      );
                                      &:hover {
                                        background-color: var(
                                          --color--${otherEnrollment.accentColor}--400
                                        );
                                      }
                                      @media (prefers-color-scheme: dark) {
                                        color: var(
                                          --color--${otherEnrollment.accentColor}--200
                                        );
                                        background-color: var(
                                          --color--${otherEnrollment.accentColor}--700
                                        );
                                        &:hover {
                                          background-color: var(
                                            --color--${otherEnrollment.accentColor}--600
                                          );
                                        }
                                      }
                                    `}"
                                  >
                                    <i class="bi bi-journal-text"></i>
                                    ${otherEnrollment.course.name}
                                  </a>
                                `
                              )}
                            `}
                      `}"
                      data-tippy-theme="dropdown"
                      data-tippy-trigger="click"
                      data-tippy-interactive="true"
                      data-tippy-allowHTML="true"
                      class="header--item"
                      style="${css`
                        font-size: var(--font-size--base);
                        line-height: var(--line-height--base);
                        font-weight: var(--font-weight--bold);
                        max-width: 100%;
                        display: flex;
                        gap: var(--space--2);
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
                  </div>
                `}
            $${res.locals.user === undefined
              ? html``
              : html`
                  <div
                    style="${css`
                      font-size: var(--font-size--xl);
                      line-height: var(--line-height--xl);
                      display: flex;
                      gap: var(--space--4);
                      justify-content: flex-end;
                    `}"
                  >
                    <div>
                      <button
                        data-tippy-content="${html`
                          $${res.locals.invitations!.length === 0
                            ? html``
                            : html`
                                <h3 class="dropdown--heading">
                                  <i class="bi bi-journal-arrow-down"></i>
                                  Invitations
                                </h3>
                                $${res.locals.invitations!.map(
                                  (invitation) => html`
                                    <a
                                      href="${app.locals.settings
                                        .url}/courses/${invitation.course
                                        .reference}/invitations/${invitation.reference}"
                                      class="dropdown--item"
                                    >
                                      <i class="bi bi-journal-arrow-down"></i>
                                      Enroll in ${invitation.course.name} as
                                      ${lodash.capitalize(invitation.role)}
                                    </a>
                                  `
                                )}
                                <hr class="dropdown--separator" />
                              `}
                          <button
                            class="dropdown--item"
                            data-tippy-content="To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information."
                            data-tippy-theme="tooltip"
                            data-tippy-trigger="click"
                          >
                            <i class="bi bi-journal-arrow-down"></i>
                            Enroll in an Existing Course
                          </button>
                          <a
                            href="${app.locals.settings.url}/courses/new"
                            class="dropdown--item"
                          >
                            <i class="bi bi-journal-plus"></i>
                            Create a New Course
                          </a>
                        `}"
                        data-tippy-theme="dropdown"
                        data-tippy-trigger="click"
                        data-tippy-interactive="true"
                        data-tippy-allowHTML="true"
                        class="header--item"
                        style="${css`
                          display: grid;
                        `}"
                      >
                        <span
                          data-tippy-content="$${res.locals.invitations!
                            .length === 0
                            ? "Add"
                            : `${
                                res.locals.invitations!.length
                              } pending invitation${
                                res.locals.invitations!.length === 1 ? "" : "s"
                              }`}"
                          data-tippy-theme="tooltip"
                          data-tippy-touch="false"
                          $${res.locals.invitations!.length === 0
                            ? html``
                            : html`class="notification-indicator"`}
                        >
                          <i class="bi bi-plus-circle"></i>
                        </span>
                      </button>
                    </div>
                    <div>
                      <button
                        data-tippy-content="${html`
                          <p
                            style="${css`
                              font-weight: var(--font-weight--bold);
                              color: var(--color--primary--900);
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--primary--50);
                              }
                            `}"
                          >
                            ${res.locals.user.name}
                          </p>
                          <p
                            style="${css`
                              color: var(--color--primary--500);
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--primary--300);
                              }
                            `}"
                          >
                            ${res.locals.user.email}
                          </p>
                          <hr class="dropdown--separator" />
                          <a
                            class="dropdown--item"
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
                            <button class="dropdown--item">
                              <i class="bi bi-box-arrow-right"></i>
                              Sign Out
                            </button>
                          </form>
                        `}"
                        data-tippy-theme="dropdown"
                        data-tippy-trigger="click"
                        data-tippy-interactive="true"
                        data-tippy-allowHTML="true"
                        class="header--item"
                      >
                        <span
                          data-tippy-content="${res.locals.user.name}"
                          data-tippy-theme="tooltip"
                          data-tippy-touch="false"
                        >
                          <i class="bi bi-person-circle"></i>
                        </span>
                      </button>
                    </div>
                  </div>
                `}
          </header>
          $${extraHeaders ?? html``}
          $${flash === undefined
            ? html``
            : html`
                <div
                  style="${css`
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }

                    & > :first-child {
                      padding: var(--space--2) var(--space--10);
                      text-align: center;

                      & + button {
                        transition: color var(--transition-duration);
                      }

                      &.flash--green {
                        &,
                        & + button,
                        & .link {
                          color: var(--color--green--700);
                          background-color: var(--color--green--200);
                        }
                        & + button:hover,
                        & .link:hover,
                        & + button:focus,
                        & .link:focus {
                          color: var(--color--green--600);
                        }
                        & + button:active,
                        & .link:active {
                          color: var(--color--green--900);
                        }
                        @media (prefers-color-scheme: dark) {
                          &,
                          & + button,
                          & .link {
                            color: var(--color--green--300);
                            background-color: var(--color--green--700);
                          }
                          & + button:hover,
                          & .link:hover,
                          & + button:focus,
                          & .link:focus {
                            color: var(--color--green--100);
                          }
                          & + button:active,
                          & .link:active {
                            color: var(--color--green--500);
                          }
                        }
                      }

                      &.flash--rose {
                        &,
                        & + button,
                        & .link {
                          color: var(--color--rose--700);
                          background-color: var(--color--rose--200);
                          @media (prefers-color-scheme: dark) {
                            color: var(--color--rose--300);
                            background-color: var(--color--rose--700);
                          }
                        }
                        & + button:hover,
                        & .link:hover {
                          color: var(--color--rose--600);
                          @media (prefers-color-scheme: dark) {
                            color: var(--color--rose--100);
                          }
                        }
                      }
                    }
                  `}"
                >
                  $${flash}
                  <button
                    style="${css`
                      justify-self: end;
                      align-self: start;
                      margin-top: var(--space--2);
                      margin-right: var(--space--4);
                    `}"
                    onclick="${javascript`
                      this.parentElement.remove();
                    `}"
                  >
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              `}
          <main
            style="${css`
              color: var(--color--primary-gray--500);
              background-color: var(--color--primary-gray--100);
              @media (prefers-color-scheme: dark) {
                color: var(--color--primary-gray--400);
                background-color: var(--color--primary-gray--900);
              }
              flex: 1;
              overflow: auto;
              display: flex;
            `}"
          >
            $${body}
          </main>
        </div>
      `,
    });
  };

  interface Layouts {
    main: (_: {
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<IsEnrolledInCourseMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        any,
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
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: center;
          `}"
        >
          <div
            style="${css`
              flex: 1;
              max-width: calc(var(--space--80) * 2);
              padding: var(--space--4);
              overflow: auto;
            `}"
          >
            $${body}
          </div>
        </div>
      `,
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
            <stop offset="0%" stop-color="var(--color--fuchsia--400)" />
            <stop offset="100%" stop-color="var(--color--purple--400)" />
          </linearGradient>
          <linearGradient
            id="gradient--primary"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stop-color="var(--color--primary--400)" />
            <stop offset="100%" stop-color="var(--color--primary--700)" />
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
      const nonce = cryptoRandomString({ length: 10, type: "alphanumeric" });
      app.locals.database.run(
        sql`
          INSERT INTO "flashes" ("nonce", "content") VALUES (${nonce}, ${content})
        `
      );
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      res.cookie("flash", nonce, {
        ...app.locals.settings.cookieOptions(),
        expires: expiresAt,
      });
    },

    get(req, res) {
      const flash = app.locals.database.get<{
        content: HTML;
      }>(
        sql`
          SELECT "content" FROM "flashes" WHERE "nonce" = ${req.cookies.flash}
        `
      );
      app.locals.database.run(
        sql`DELETE FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      res.clearCookie("flash", app.locals.settings.cookieOptions());
      return flash?.content;
    },
  };

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
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>CourseLore · The Open-Source Student Forum</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-box-arrow-in-right"></i>
                Authenticate
              </h2>
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
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
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
                    <input
                      type="email"
                      name="email"
                      placeholder="Email"
                      value="${req.query.email ?? ""}"
                      required
                      autofocus
                      class="input--text"
                      style="${css`
                        padding-right: var(--space--36);
                      `}"
                    />
                    <div
                      style="${css`
                        justify-self: end;
                        padding: var(--space--1);
                        display: flex;
                        gap: var(--space--2);
                      `}"
                    >
                      <button
                        type="button"
                        data-tippy-content="If you’re a new user, you’ll sign up for a new account. If you’re a returning user, you’ll sign in to your existing account."
                        data-tippy-theme="tooltip"
                        data-tippy-trigger="click"
                        class="button--inline"
                      >
                        <i class="bi bi-info-circle"></i>
                      </button>
                      <button class="button button--primary">
                        Continue <i class="bi bi-chevron-right"></i>
                      </button>
                    </div>
                  </div>
                  <p
                    style="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      color: var(--color--primary--300);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--300);
                      }
                    `}"
                  >
                    We recommend using the email address you use at your
                    educational institution.
                  </p>
                </div>
              </form>
            </div>
          `,
        })
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
        !req.body.email.match(app.locals.constants.emailRegExp)
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
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>Authenticate · CourseLore</title>`,
          body: html`
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
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <h2
                  class="heading--2"
                  style="${css`
                    color: var(--color--primary--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                    }
                  `}"
                >
                  <i class="bi bi-box-arrow-in-right"></i>
                  Authenticate
                </h2>
                <div
                  style="${css`
                    color: var(--color--primary--800);
                    background-color: var(--color--primary--100);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      background-color: var(--color--primary--900);
                    }
                    padding: var(--space--4);
                    border-radius: var(--border-radius--xl);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  <p>
                    <strong
                      style="${css`
                        font-weight: var(--font-weight--bold);
                        color: var(--color--primary--900);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary--50);
                        }
                      `}"
                    >
                      To continue, follow the Magic Authentication Link we sent
                      to ${req.body.email}.
                    </strong>
                  </p>
                  <p>
                    If you’re a new user, you’ll sign up for a new account. If
                    you’re a returning user, you’ll sign in to your existing
                    account.
                  </p>
                  <form
                    method="POST"
                    action="${app.locals.settings
                      .url}/authenticate?${qs.stringify({
                      redirect: req.query.redirect,
                      email: req.query.email,
                      name: req.query.name,
                    })}"
                  >
                    <input
                      type="hidden"
                      name="email"
                      value="${req.body.email}"
                    />
                    <p
                      style="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        color: var(--color--primary--700);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary--300);
                        }
                      `}"
                    >
                      Didn’t receive the email? Already checked the spam folder?
                      <button class="link">Resend</button>.
                    </p>
                  </form>
                </div>
              </div>

              $${app.locals.settings.demonstration
                ? html`
                    <div
                      style="${css`
                        color: var(--color--rose--100);
                        background-color: var(--color--rose--500);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--rose--200);
                          background-color: var(--color--rose--600);
                        }
                        padding: var(--space--4);
                        border: var(--border-width--1) solid
                          var(--color--rose--400);
                        @media (prefers-color-scheme: dark) {
                          border-color: var(--color--rose--900);
                        }
                        border-radius: var(--border-radius--xl);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <h3
                        class="heading--2"
                        style="${css`
                          color: var(--color--rose--50);
                          @media (prefers-color-scheme: dark) {
                            color: var(--color--rose--100);
                          }
                        `}"
                      >
                        <i class="bi bi-easel"></i> Demonstration Mode
                      </h3>
                      <p>
                        CourseLore doesn’t send emails in demonstration mode.
                      </p>
                      <div
                        style="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <a
                          href="${magicAuthenticationLink}"
                          class="button button--rose"
                        >
                          <i class="bi bi-box-arrow-in-right"></i>
                          Follow the Magic Authentication Link
                        </a>
                        <a
                          href="${app.locals.settings.url}/demonstration-inbox"
                          class="button button--rose"
                        >
                          <i class="bi bi-inbox"></i>
                          Go to the Demonstration Inbox
                        </a>
                      </div>
                    </div>
                  `
                : html``}
            </div>
          `,
        })
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
          app.locals.layouts.box({
            req,
            res,
            head: html`<title>Authenticate · CourseLore</title>`,
            body: html`
              <div
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <h2
                  class="heading--2"
                  style="${css`
                    color: var(--color--primary--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                    }
                  `}"
                >
                  <i class="bi bi-box-arrow-in-right"></i>
                  Authenticate
                </h2>
                <div
                  style="${css`
                    color: var(--color--primary--800);
                    background-color: var(--color--primary--100);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      background-color: var(--color--primary--900);
                    }
                    padding: var(--space--4);
                    border-radius: var(--border-radius--xl);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  <p>
                    This Magic Authentication Link is invalid or has expired.
                  </p>
                  <p>
                    <a
                      href="${app.locals.settings
                        .url}/authenticate?${qs.stringify({
                        redirect: req.query.redirect,
                        email: req.query.email,
                        name: req.query.name,
                      })}"
                      class="button button--primary"
                      style="${css`
                        width: 100%;
                      `}"
                    >
                      <i class="bi bi-chevron-left"></i>
                      Start Over
                    </a>
                  </p>
                </div>
              </div>
            `,
          })
        );
      const user = app.locals.database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${email}`
      );
      if (user === undefined)
        return res.send(
          app.locals.layouts.box({
            req,
            res,
            head: html`<title>Sign up · CourseLore</title>`,
            body: html`
              <div
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <h2
                  class="heading--2"
                  style="${css`
                    color: var(--color--primary--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                    }
                  `}"
                >
                  <i class="bi bi-person-plus"></i>
                  Sign up
                </h2>
                <form
                  method="POST"
                  action="${app.locals.settings.url}/users?${qs.stringify({
                    redirect: req.query.redirect,
                    email: req.query.email,
                    name: req.query.name,
                  })}"
                  style="${css`
                    color: var(--color--primary--800);
                    background-color: var(--color--primary--100);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--primary--200);
                      background-color: var(--color--primary--900);
                    }
                    padding: var(--space--4);
                    border-radius: var(--border-radius--xl);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);

                    .input--text {
                      color: var(--color--primary--800);
                      background-color: var(--color--primary--50);
                      &:disabled {
                        color: var(--color--primary--700);
                        background-color: var(--color--primary--300);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--50);
                        background-color: var(--color--primary--700);
                        &:disabled {
                          color: var(--color--primary--300);
                          background-color: var(--color--primary--800);
                        }
                      }
                    }
                  `}"
                >
                  <input
                    type="hidden"
                    name="nonce"
                    value="${app.locals.helpers.authenticationNonce.create(
                      email
                    )}"
                  />
                  <label>
                    Name
                    <input
                      type="text"
                      name="name"
                      value="${req.query.name ?? ""}"
                      required
                      autofocus
                      class="input--text"
                    />
                  </label>

                  <label>
                    Email
                    <span
                      data-tippy-content="This is the email that you confirmed by having followed the Magic Authentication Link; it’s your identity in CourseLore and may not be changed anymore."
                      data-tippy-theme="tooltip"
                      tabindex="0"
                    >
                      <input
                        type="email"
                        value="${email}"
                        disabled
                        class="input--text"
                      />
                    </span>
                  </label>

                  <button class="button button--primary">
                    <i class="bi bi-person-plus"></i>
                    Sign up
                  </button>
                </form>
              </div>
            `,
          })
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
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>Sign up · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-person-plus"></i>
                Sign up
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p>Something went wrong in your sign up.</p>
                <p>
                  <a
                    href="${app.locals.settings
                      .url}/authenticate?${qs.stringify({
                      redirect: req.query.redirect,
                      email: req.query.email,
                      name: req.query.name,
                    })}"
                    class="button button--primary"
                    style="${css`
                      width: 100%;
                    `}"
                  >
                    <i class="bi bi-chevron-left"></i>
                    Start Over
                  </a>
                </p>
              </div>
            </div>
          `,
        })
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
      const currentUserHTML = html`${res.locals.user.name}
      ${`<${res.locals.user.email}>`}`;
      const otherUserHTML =
        otherUserEmail === undefined
          ? undefined
          : isSelf
          ? html`yourself`
          : otherUser === undefined
          ? html`${otherUserEmail}`
          : html`${otherUser.name} ${`<${otherUserEmail}>`}`;
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>Magic Authentication Link · CourseLore</title>`,
          body: html`
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <h2
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-box-arrow-in-right"></i>
                Authenticate
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
                  }
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
                <p>
                  You’re already signed in as $${currentUserHTML} and you tried
                  to use
                  $${otherUserEmail === undefined
                    ? html`an invalid or expired Magic Authentication Link`
                    : html`a Magic Authentication Link for $${otherUserHTML}`}.
                </p>

                <a
                  href="${app.locals.settings.url}/"
                  class="button button--primary"
                  style="${css`
                    justify-content: space-between;
                  `}"
                >
                  Continue Signed in as $${currentUserHTML}
                  <i class="bi bi-chevron-right"></i>
                </a>

                $${otherUserEmail === undefined || isSelf
                  ? html`
                      <form
                        method="POST"
                        action="${app.locals.settings
                          .url}/authenticate?_method=DELETE"
                      >
                        <button
                          type="submit"
                          class="button"
                          style="${css`
                            text-align: left;
                            width: 100%;
                            justify-content: space-between;
                            &:hover,
                            &:focus {
                              background-color: var(--color--primary--200);
                            }
                            &:active {
                              background-color: var(--color--primary--300);
                            }
                            @media (prefers-color-scheme: dark) {
                              &:hover,
                              &:focus {
                                background-color: var(--color--primary--800);
                              }
                              &:active {
                                background-color: var(--color--primary--900);
                              }
                            }
                          `}"
                        >
                          Sign Out
                          <i class="bi bi-box-arrow-in-right"></i>
                        </button>
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
                        <button
                          type="submit"
                          class="button"
                          style="${css`
                            text-align: left;
                            width: 100%;
                            justify-content: space-between;
                            &:hover,
                            &:focus {
                              background-color: var(--color--primary--200);
                            }
                            &:active {
                              background-color: var(--color--primary--300);
                            }
                            @media (prefers-color-scheme: dark) {
                              &:hover,
                              &:focus {
                                background-color: var(--color--primary--800);
                              }
                              &:active {
                                background-color: var(--color--primary--900);
                              }
                            }
                          `}"
                        >
                          Sign out as $${currentUserHTML} and Sign
                          ${otherUser === undefined ? "up" : "in"} as
                          $${otherUserHTML}
                          <i class="bi bi-arrow-left-right"></i>
                        </button>
                      </form>
                    `}
                $${req.query.redirect === undefined
                  ? html``
                  : html`
                      <a
                        href="${app.locals.settings.url}${req.query.redirect}"
                        class="button"
                        style="${css`
                          justify-content: space-between;
                          &:hover,
                          &:focus {
                            background-color: var(--color--primary--200);
                          }
                          &:active {
                            background-color: var(--color--primary--300);
                          }
                          @media (prefers-color-scheme: dark) {
                            &:hover,
                            &:focus {
                              background-color: var(--color--primary--800);
                            }
                            &:active {
                              background-color: var(--color--primary--900);
                            }
                          }
                        `}"
                      >
                        Continue Signed in as $${currentUserHTML} and Visit the
                        Page to Which the Magic Authentication Link Would Have
                        Redirected You:
                        ${app.locals.settings.url}${req.query.redirect}
                        <i class="bi bi-chevron-right"></i>
                      </a>
                    `}
              </div>
            </div>
          `,
        })
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
                  <h2 class="heading--display--1 text-gradient">
                    Welcome to CourseLore!
                  </h2>

                  <div class="decorative-icon">
                    <div
                      style="${css`
                        width: var(--space--32);
                        opacity: 30%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        svg {
                          width: 100%;
                        }
                      `}"
                    >
                      $${app.locals.partials.art.small
                        .replace(/width=".*?"/, "")
                        .replace(/height=".*?"/, "")}
                      <script>
                        (() => {
                          const element =
                            document.currentScript.previousElementSibling;
                          document.addEventListener("DOMContentLoaded", () => {
                            if (element.dataset.animated) return;
                            element.dataset.animated = true;
                            new ArtAnimation({
                              element,
                              speed: 0.001,
                              amount: 1,
                              startupDuration: 500,
                            }).start();
                          });
                        })();
                      </script>
                    </div>
                  </div>

                  <p>
                    Get started by enrolling in an existing course or by
                    creating a new course.
                  </p>
                  <div
                    style="${css`
                      width: 100%;
                      display: flex;
                      gap: var(--space--4);
                      & > * {
                        flex: 1;
                      }
                      @media (max-width: 510px) {
                        flex-direction: column;
                      }
                    `}"
                  >
                    <button
                      data-tippy-content="To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information."
                      data-tippy-theme="tooltip"
                      data-tippy-trigger="click"
                      class="button button--primary"
                    >
                      <i class="bi bi-journal-arrow-down"></i>
                      Enroll in an Existing Course
                    </button>
                    <a
                      href="${app.locals.settings.url}/courses/new"
                      class="button button--secondary"
                    >
                      <i class="bi bi-journal-plus"></i>
                      Create a New Course
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
                  <h2 class="heading--2">
                    <i class="bi bi-journal"></i>
                    Courses
                  </h2>

                  <div
                    style="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      align-items: flex-start;
                    `}"
                  >
                    $${res.locals.enrollments.map(
                      (enrollment) =>
                        html`
                          <a
                            href="${app.locals.settings
                              .url}/courses/${enrollment.course.reference}"
                            style="${css`
                              font-weight: var(--font-weight--bold);
                              color: var(
                                --color--${enrollment.accentColor}--50
                              );
                              background-color: var(
                                --color--${enrollment.accentColor}--500
                              );
                              &:hover {
                                background-color: var(
                                  --color--${enrollment.accentColor}--400
                                );
                              }
                              @media (prefers-color-scheme: dark) {
                                color: var(
                                  --color--${enrollment.accentColor}--200
                                );
                                background-color: var(
                                  --color--${enrollment.accentColor}--700
                                );
                                &:hover {
                                  background-color: var(
                                    --color--${enrollment.accentColor}--600
                                  );
                                }
                              }
                              padding: var(--space--1) var(--space--3);
                              border-radius: var(--border-radius--md);
                              display: inline-block;
                              transition: background-color
                                var(--transition-duration);
                            `}"
                          >
                            <i class="bi bi-journal"></i>
                            ${enrollment.course.name}
                          </a>
                        `
                    )}
                  </div>

                  <div class="decorative-icon">
                    <i class="bi bi-journal-text"></i>
                  </div>
                </div>
              `,
            })
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
              <h2 class="heading--2">
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
                <label>
                  Name
                  <input
                    type="text"
                    name="name"
                    value="${res.locals.user.name}"
                    class="input--text"
                    required
                  />
                </label>
                <label>
                  Email
                  <span
                    data-tippy-content="Your email is your identity in CourseLore and may not be changed."
                    data-tippy-theme="tooltip"
                    tabindex="0"
                  >
                    <input
                      type="email"
                      value="${res.locals.user.email}"
                      class="input--text"
                      disabled
                    />
                  </span>
                </label>
                <div>
                  <button
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
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

  app.patch<{}, any, { name?: string }, {}, IsAuthenticatedMiddlewareLocals>(
    "/settings",
    ...app.locals.middlewares.isAuthenticated,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");
      app.locals.database.run(
        sql`UPDATE "users" SET "name" = ${req.body.name} WHERE "id" = ${res.locals.user.id}`
      );

      app.locals.helpers.flash.set(
        req,
        res,
        html`
          <div class="flash flash--green">
            User settings updated successfully.
          </div>
        `
      );

      res.redirect(`${app.locals.settings.url}/settings`);
    }
  );

  app.get<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "/courses/new",
    ...app.locals.middlewares.isAuthenticated,
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
              <h2 class="heading--2">
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
                <label>
                  Name
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
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
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
                <h2 class="heading--display--1 text-gradient">
                  Welcome to ${res.locals.course.name}!
                </h2>

                <div class="decorative-icon">
                  <i class="bi bi-journal-text"></i>
                </div>

                <p>
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        Get started by inviting other people to the course or by
                        creating the first thread.
                      `
                    : html`
                        This is a new course. Be the first to create a thread.
                      `}
                </p>
                <div
                  style="${css`
                    width: 100%;
                    display: flex;
                    gap: var(--space--4);
                    & > * {
                      flex: 1;
                    }
                    @media (max-width: 600px) {
                      flex-direction: column;
                    }
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings/invitations"
                          class="button button--primary"
                        >
                          <i class="bi bi-person-plus"></i>
                          Invite Other People to the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${app.locals.settings.url}/courses/${res.locals.course
                      .reference}/threads/new"
                    class="button $${res.locals.enrollment.role === "staff"
                      ? "button--secondary"
                      : "button--primary"}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Create the First Thread
                  </a>
                </div>
              </div>
            `,
          })
        );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/threads/${res.locals.threads[0].reference}?redirected=true`
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
    const menu = html`
      <a
        href="${app.locals.settings.url}/courses/${res.locals.course
          .reference}/settings"
        class="dropdown--item ${req.path.endsWith("/settings") ? "active" : ""}"
      >
        <i class="bi bi-sliders"></i>
        Course Settings
      </a>
      <a
        href="${app.locals.settings.url}/courses/${res.locals.course
          .reference}/settings/invitations"
        class="dropdown--item ${req.path.endsWith("/settings/invitations")
          ? "active"
          : ""}"
      >
        <i class="bi bi-person-plus"></i>
        Invitations
      </a>
      <a
        href="${app.locals.settings.url}/courses/${res.locals.course
          .reference}/settings/enrollments"
        class="dropdown--item ${req.path.endsWith("/settings/enrollments")
          ? "active"
          : ""}"
      >
        <i class="bi bi-people"></i>
        Enrollments
      </a>
      <a
        href="${app.locals.settings.url}/courses/${res.locals.course
          .reference}/settings/enrollment"
        class="dropdown--item ${req.path.endsWith("/settings/enrollment")
          ? "active"
          : ""}"
      >
        <i class="bi bi-person"></i>
        Your Enrollment
      </a>
    `;

    return app.locals.layouts.application({
      req,
      res,
      head,
      extraHeaders: html`
        $${res.locals.enrollment.role === "staff"
          ? html`
              <div
                style="${css`
                  color: var(--color--primary--100);
                  background-color: var(--color--primary--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
                  }
                  padding: var(--space--1) var(--space--4);
                  display: flex;
                  justify-content: center;
                  @media (min-width: 768px) {
                    display: none;
                  }
                `}"
              >
                <button
                  style="${css`
                    display: flex;
                    gap: var(--space--2);
                  `}"
                  data-tippy-content="${menu}"
                  data-tippy-theme="dropdown"
                  data-tippy-trigger="click"
                  data-tippy-interactive="true"
                  data-tippy-allowHTML="true"
                >
                  <i class="bi bi-sliders"></i>
                  Course Settings
                  <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            `
          : html``}
      `,
      body: html`
        <div
          style="${css`
            flex: 1;
            overflow: auto;
            @media (min-width: 768px) and (max-width: 1099px) {
              display: flex;
            }
            @media (min-width: 1100px) {
              display: grid;
              grid-template-columns: 1fr calc(var(--space--80) * 2) 1fr;
              gap: var(--space--12);
            }
          `}"
        >
          $${res.locals.enrollment.role === "staff"
            ? html`
                <div
                  style="${css`
                    padding: var(--space--2-5) var(--space--4) var(--space--4);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    overflow: auto;

                    @media (max-width: 767px) {
                      display: none;
                    }
                    @media (min-width: 1100px) {
                      justify-self: end;
                    }

                    .dropdown--item {
                      color: var(--color--primary-gray--600);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary-gray--400);
                      }
                      padding: var(--space--1) var(--space--3);
                      display: flex;
                      gap: var(--space--2);
                      transition: color var(--transition-duration),
                        box-shadow var(--transition-duration);

                      &:hover,
                      &:focus,
                      &.active:focus {
                        color: var(--color--primary-gray--900);
                        box-shadow: inset var(--border-width--4) 0
                          var(--color--primary-gray--500);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary-gray--100);
                          box-shadow: inset var(--border-width--4) 0
                            var(--color--primary-gray--500);
                        }
                      }
                      &:active,
                      &.active {
                        color: var(--color--primary--900);
                        box-shadow: inset var(--border-width--4) 0
                          var(--color--primary--500);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary--100);
                          box-shadow: inset var(--border-width--4) 0
                            var(--color--primary--500);
                        }
                      }
                    }
                  `}"
                >
                  $${menu}
                </div>
              `
            : html``}
          <div
            style="${css`
              padding: var(--space--4);
              overflow: auto;
              display: flex;
              justify-content: center;
              @media (min-width: 768px) and (max-width: 1099px) {
                flex: 1;
              }
              @media (min-width: 1100px) {
                grid-area: 1 / 2;
              }
            `}"
          >
            <div
              style="${css`
                flex: 1;
                max-width: calc(var(--space--80) * 2);
              `}"
            >
              $${body}
            </div>
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
              <h2 class="heading--2">
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
                <label>
                  Name
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
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
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
          <div class="flash flash--green">
            Course settings updated successfully.
          </div>
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
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollment`
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
    asyncHandler(async (req, res) => {
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
              <h2 class="heading--2">
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
                <div class="field">
                  <p>Type</p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                      flex-direction: column;
                    `}"
                  >
                    <div class="input--radio--group">
                      <label>
                        <input
                          type="radio"
                          name="type"
                          value="link"
                          required
                          autocomplete="off"
                          onchange="${javascript`
                            const extraFields = this.closest(".field").querySelector(".extra-fields");
                            extraFields.hidden = true;
                            for (const element of extraFields.querySelectorAll("*"))
                              if (element.disabled !== null) element.disabled = true;
                          `}"
                        />
                        <span>
                          <i class="bi bi-link"></i>
                          Invitation Link
                        </span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="type"
                          value="email"
                          required
                          autocomplete="off"
                          onchange="${javascript`
                            const extraFields = this.closest(".field").querySelector(".extra-fields");
                            extraFields.hidden = false;
                            for (const element of extraFields.querySelectorAll("*"))
                              if (element.disabled !== null) element.disabled = false;
                          `}"
                        />
                        <span>
                          <i class="bi bi-envelope"></i>
                          Email
                        </span>
                      </label>
                    </div>
                    <div
                      hidden
                      class="extra-fields"
                      style="${css`
                        display: grid;
                        & > * {
                          grid-area: 1 / 1;
                        }
                      `}"
                    >
                      <textarea
                        name="emails"
                        placeholder="Emails"
                        required
                        disabled
                        class="input--text fit-textarea"
                        style="${css`
                          padding-right: var(--space--10);
                        `}"
                        data-onvalidate="${javascript`
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
                            emails.find(
                              ({ email }) => !email.match(${
                                app.locals.constants.emailRegExp
                              })
                            ) !== undefined
                          )
                            return "Match the requested format";
                        `}"
                      ></textarea>
                      <button
                        type="button"
                        data-tippy-content="${html`
                          <p>
                            Emails must be separated by commas and/or newlines,
                            and may include names which may be quoted or not,
                            for example:
                          </p>
                          <pre><code>${dedent`
                            "Scott" <scott@courselore.org>,
                            Ali <ali@courselore.org>
                            leandro@courselore.org
                          `}</code></pre>
                        `}"
                        data-tippy-theme="tooltip"
                        data-tippy-trigger="click"
                        data-tippy-allowHTML="true"
                        class="button--inline"
                        style="${css`
                          justify-self: end;
                          align-self: start;
                          margin-top: var(--space--2);
                          margin-right: var(--space--4);
                          position: relative;
                        `}"
                      >
                        <i class="bi bi-info-circle"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <p>Role</p>
                  <div class="input--radio--group">
                    $${app.locals.constants.roles.map(
                      (role) =>
                        html`
                          <label>
                            <input
                              type="radio"
                              name="role"
                              value="${role}"
                              required
                              autocomplete="off"
                            />
                            <span>${lodash.capitalize(role)}</span>
                          </label>
                        `
                    )}
                  </div>
                </div>

                <div class="field">
                  <p>Expiration</p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                      flex-direction: column;
                    `}"
                  >
                    <div class="input--radio--group">
                      <label>
                        <input
                          type="radio"
                          name="isExpiresAt"
                          required
                          autocomplete="off"
                          onchange="${javascript`
                            const extraFields = this.closest(".field").querySelector(".extra-fields");
                            extraFields.hidden = true;
                            for (const element of extraFields.querySelectorAll("*"))
                              if (element.disabled !== undefined) element.disabled = true;
                          `}"
                        />
                        <span>
                          <i class="bi bi-calendar-minus"></i>
                          Doesn’t Expire
                        </span>
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="isExpiresAt"
                          required
                          autocomplete="off"
                          onchange="${javascript`
                            const extraFields = this.closest(".field").querySelector(".extra-fields");
                            extraFields.hidden = false;
                            for (const element of extraFields.querySelectorAll("*"))
                              if (element.disabled !== undefined) element.disabled = false;
                          `}"
                        />
                        <span>
                          <i class="bi bi-calendar-plus"></i>
                          Expires
                        </span>
                      </label>
                    </div>
                    <div
                      hidden
                      class="extra-fields"
                      style="${css`
                        display: grid;
                        & > * {
                          grid-area: 1 / 1;
                        }
                      `}"
                    >
                      <input
                        type="text"
                        name="expiresAt"
                        value="${new Date().toISOString()}"
                        required
                        autocomplete="off"
                        disabled
                        class="datetime input--text"
                        style="${css`
                          padding-right: var(--space--10);
                        `}"
                        data-onvalidate="${javascript`
                          if (new Date(this.value).getTime() <= Date.now())
                            return "Must be in the future";
                        `}"
                      />
                      <button
                        type="button"
                        data-tippy-content="This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving change."
                        data-tippy-theme="tooltip"
                        data-tippy-trigger="click"
                        class="button--inline"
                        style="${css`
                          justify-self: end;
                          align-self: start;
                          margin-top: var(--space--2);
                          margin-right: var(--space--4);
                          position: relative;
                        `}"
                      >
                        <i class="bi bi-info-circle"></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <button
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
                  >
                    <i class="bi bi-person-plus"></i>
                    Create Invitation
                  </button>
                </div>
              </form>
            </div>
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
                            align-items: baseline;
                          `}"
                        >
                          <div
                            style="${css`
                              flex: 1;
                            `}"
                          >
                            $${invitation.email === null
                              ? html`
                                  <div
                                    style="${css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <i class="bi bi-link"></i>
                                    <button
                                      $${isExpired
                                        ? html`disabled`
                                        : html`
                                            data-micromodal-trigger="modal--invitation--${invitation.reference}"
                                            class="button--inline"
                                          `}
                                    >
                                      <span
                                        $${isExpired
                                          ? html`
                                              data-tippy-content="Can’t show
                                              Invitation Link because it’s
                                              expired."
                                              data-tippy-theme="tooltip"
                                              tabindex="0"
                                            `
                                          : html`
                                              data-tippy-content="See Invitation
                                              Link" data-tippy-theme="tooltip"
                                              data-tippy-touch="false"
                                            `}
                                        style="${css`
                                          font-weight: var(--font-weight--bold);
                                        `}"
                                      >
                                        ${"*".repeat(
                                          6
                                        )}${invitation.reference.slice(6)}
                                        <i class="bi bi-chevron-down"></i>
                                      </span>
                                    </button>
                                  </div>
                                `
                              : html`
                                  <div
                                    style="${css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <i class="bi bi-envelope"></i>
                                    <div
                                      style="${css`
                                        flex: 1;
                                        display: flex;
                                        flex-direction: column;
                                      `}"
                                    >
                                      <div>
                                        <button
                                          $${isUsed || isExpired
                                            ? html`disabled`
                                            : html`
                                                data-tippy-content="${html`
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
                                                      class="dropdown--item"
                                                    >
                                                      Resend Invitation Email
                                                    </button>
                                                  </form>
                                                `}"
                                                data-tippy-theme="dropdown"
                                                data-tippy-trigger="click"
                                                data-tippy-interactive="true"
                                                data-tippy-allowHTML="true"
                                                class="button--inline"
                                              `}
                                          style="${css`
                                            font-weight: var(
                                              --font-weight--bold
                                            );
                                          `}"
                                        >
                                          <span
                                            $${isUsed
                                              ? html`
                                                  data-tippy-content="Can’t
                                                  resend invitation because it’s
                                                  used."
                                                  data-tippy-theme="tooltip"
                                                  tabindex="0"
                                                `
                                              : isExpired
                                              ? html`
                                                  data-tippy-content="Can’t
                                                  resend invitation because it’s
                                                  expired."
                                                  data-tippy-theme="tooltip"
                                                  tabindex="0"
                                                `
                                              : html``}
                                          >
                                            ${invitation.name ??
                                            invitation.email}
                                            <i class="bi bi-chevron-down"></i>
                                          </span>
                                        </button>
                                      </div>
                                      $${invitation.name === null
                                        ? html``
                                        : html`
                                            <div>${invitation.email}</div>
                                          `}
                                    </div>
                                  </div>
                                `}
                          </div>
                          <div
                            style="${css`
                              display: flex;
                              @media (max-width: 500px) {
                                flex-direction: column;
                                align-items: flex-end;
                                gap: var(--space--2);
                              }
                            `}"
                          >
                            <div
                              style="${css`
                                width: var(--space--20);
                                display: flex;
                                justify-content: flex-end;
                              `}"
                            >
                              <button
                                $${isUsed || isExpired
                                  ? html`disabled`
                                  : html`
                                      data-tippy-content="${html`
                                        $${app.locals.constants.roles.map(
                                          (role) =>
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
                                                      class="dropdown--item"
                                                    >
                                                      Change Invitation Role to
                                                      ${lodash.capitalize(role)}
                                                    </button>
                                                  </form>
                                                `
                                        )}
                                      `}"
                                      data-tippy-theme="dropdown"
                                      data-tippy-trigger="click"
                                      data-tippy-interactive="true"
                                      data-tippy-allowHTML="true"
                                      class="button--inline"
                                    `}
                              >
                                <span
                                  $${isUsed
                                    ? html`
                                        data-tippy-content="You may not change
                                        the role of this invitation because it
                                        has already been used."
                                        data-tippy-theme="tooltip" tabindex="0"
                                      `
                                    : isExpired
                                    ? html`
                                        data-tippy-content="You may not change
                                        the role of this invitation because it’s
                                        expired." data-tippy-theme="tooltip"
                                        tabindex="0"
                                      `
                                    : html`
                                        data-tippy-content="Change Role"
                                        data-tippy-theme="tooltip"
                                        data-tippy-touch="false"
                                      `}
                                >
                                  ${lodash.capitalize(invitation.role)}
                                  <i class="bi bi-chevron-down"></i>
                                </span>
                              </button>
                            </div>

                            <div
                              style="${css`
                                width: var(--space--40);
                                display: flex;
                                justify-content: flex-end;
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
                                      class="input--text datetime"
                                      data-onvalidate="${javascript`
                                      if (new Date(this.value).getTime() <= Date.now())
                                        return "Must be in the future";
                                    `}"
                                    />
                                    <button class="dropdown--item">
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
                                    <button class="dropdown--item">
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
                                    <button class="dropdown--item">
                                      <i class="bi bi-calendar-x"></i>
                                      Expire Invitation
                                    </button>
                                  </form>
                                `;

                                return isUsed
                                  ? html`
                                      <div
                                        data-tippy-content="${html`
                                          Used
                                          <time class="time--relative">
                                            ${new Date(
                                              invitation.usedAt!
                                            ).toISOString()}
                                          </time>
                                        `}"
                                        data-tippy-theme="tooltip"
                                        data-tippy-allowHTML="true"
                                        data-tippy-interactive="true"
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
                                      >
                                        Used
                                        <i class="bi bi-check-lg"></i>
                                      </div>
                                    `
                                  : isExpired
                                  ? html`
                                      <button
                                        data-tippy-content="${html`
                                          <h3 class="dropdown--heading">
                                            <i class="bi bi-calendar-x"></i>
                                            <span>
                                              Expired
                                              <time class="time--relative">
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
                                        `}"
                                        data-tippy-theme="dropdown"
                                        data-tippy-trigger="click"
                                        data-tippy-interactive="true"
                                        data-tippy-allowHTML="true"
                                        style="${css`
                                          color: var(--color--rose--700);
                                          background-color: var(
                                            --color--rose--100
                                          );
                                          &:hover,
                                          &:focus {
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
                                            &:focus {
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
                                          transition: background-color
                                            var(--transition-duration);
                                        `}"
                                      >
                                        <span
                                          data-tippy-content="Change Expiration"
                                          data-tippy-theme="tooltip"
                                          data-tippy-touch="false"
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
                                        </span>
                                      </button>
                                    `
                                  : invitation.expiresAt === null
                                  ? html`
                                      <button
                                        data-tippy-content="${html`
                                          <div
                                            style="${css`
                                              padding-top: var(--space--1);
                                            `}"
                                          >
                                            $${changeExpirationForm}
                                            <hr class="dropdown--separator" />
                                            $${expireForm}
                                          </div>
                                        `}"
                                        data-tippy-theme="dropdown"
                                        data-tippy-trigger="click"
                                        data-tippy-interactive="true"
                                        data-tippy-allowHTML="true"
                                        style="${css`
                                          color: var(--color--blue--700);
                                          background-color: var(
                                            --color--blue--100
                                          );
                                          &:hover,
                                          &:focus {
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
                                            &:focus {
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
                                          transition: background-color
                                            var(--transition-duration);
                                        `}"
                                      >
                                        <span
                                          data-tippy-content="Change Expiration"
                                          data-tippy-theme="tooltip"
                                          data-tippy-touch="false"
                                        >
                                          <span
                                            style="${css`
                                              display: inline-flex;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            <i class="bi bi-calendar-minus"></i>
                                            Doesn’t Expire
                                          </span>
                                          <i class="bi bi-chevron-down"></i>
                                        </span>
                                      </button>
                                    `
                                  : html`
                                      <button
                                        data-tippy-content="${html`
                                          <h3 class="dropdown--heading">
                                            <i class="bi bi-calendar-plus"></i>
                                            <span>
                                              Expires
                                              <time class="time--relative">
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
                                        `}"
                                        data-tippy-theme="dropdown"
                                        data-tippy-trigger="click"
                                        data-tippy-interactive="true"
                                        data-tippy-allowHTML="true"
                                        style="${css`
                                          color: var(--color--yellow--700);
                                          background-color: var(
                                            --color--yellow--100
                                          );
                                          &:hover,
                                          &:focus {
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
                                            color: var(--color--yellow--100);
                                            background-color: var(
                                              --color--yellow--900
                                            );
                                            &:hover,
                                            &:focus {
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
                                          transition: background-color
                                            var(--transition-duration);
                                        `}"
                                      >
                                        <span
                                          data-tippy-content="Change Expiration"
                                          data-tippy-theme="tooltip"
                                          data-tippy-touch="false"
                                        >
                                          <span
                                            style="${css`
                                              display: inline-flex;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            <i class="bi bi-calendar-plus"></i>
                                            Expires
                                          </span>
                                          <i class="bi bi-chevron-down"></i>
                                        </span>
                                      </button>
                                    `;
                              })()}
                            </div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                `}
            $${await Promise.all(
              invitations.map(async (invitation) => {
                if (
                  app.locals.helpers.isExpired(invitation.expiresAt) ||
                  invitation.email !== null
                )
                  return html``;

                const link = `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;

                return html`
                  <div
                    id="modal--invitation--${invitation.reference}"
                    class="modal"
                  >
                    <div data-micromodal-close class="modal--close-button">
                      <div
                        class="modal--dialog"
                        style="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--4);
                        `}"
                      >
                        <h2 class="heading--1">
                          Enroll in ${res.locals.course.name} as
                          ${lodash.capitalize(invitation.role)}
                        </h2>

                        <div
                          style="${css`
                            display: grid;
                            & > * {
                              grid-area: 1 / 1;
                            }
                          `}"
                        >
                          <input
                            type="text"
                            value="${link}"
                            readonly
                            class="input--text"
                            style="${css`
                              padding-right: var(--space--10);
                              user-select: all;
                            `}"
                          />
                          <button
                            data-tippy-content="Copy"
                            data-tippy-theme="tooltip"
                            data-tippy-touch="false"
                            class="button--inline"
                            style="${css`
                              justify-self: end;
                              align-self: start;
                              margin-top: var(--space--2);
                              margin-right: var(--space--4);
                              position: relative;
                            `}"
                            onclick="${javascript`
                              this.previousElementSibling.select();
                              document.execCommand("copy");
                              const classList = this.firstElementChild.classList;
                              classList.remove("bi-clipboard");
                              classList.add("bi-check-lg");
                              this.style.color = "var(--color--green--500)";
                              window.setTimeout(() => {
                                classList.remove("bi-check-lg");
                                classList.add("bi-clipboard");
                                this.style.color = null;
                              }, 500);
                            `}"
                          >
                            <i class="bi bi-clipboard"></i>
                          </button>
                        </div>

                        <p
                          style="${css`
                            display: flex;
                            gap: var(--space--2);
                          `}"
                        >
                          QR Code
                          <button
                            data-tippy-content="People may point their phone camera at the image below to follow the invitation link."
                            data-tippy-theme="tooltip"
                            data-tippy-trigger="click"
                            class="button--inline"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </p>
                        $${(await QRCode.toString(link, { type: "svg" }))
                          .replace("#000000", "url('#gradient--primary')")
                          .replace("#ffffff", "#00000000")}
                      </div>
                    </div>
                  </div>
                `;
              })
            )}
          `,
        })
      );
    })
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
              <div class="flash flash--green">
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
                    data-micromodal-trigger="modal--invitation--${invitationReference}"
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
            emails.find(
              ({ email }) => !email.match(app.locals.constants.emailRegExp)
            ) !== undefined
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

            const invitation = {
              expiresAt: req.body.expiresAt ?? null,
              usedAt: null,
              reference: cryptoRandomString({ length: 10, type: "numeric" }),
              email,
              name,
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

          app.locals.helpers.flash.set(
            req,
            res,
            html`
              <div class="flash flash--green">
                Invitations sent successfully.
                $${app.locals.settings.demonstration
                  ? html`
                      <br />
                      CourseLore doesn’t send emails in demonstration mode.
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
        if (res.locals.invitation.email === null) return next("validation");

        app.locals.helpers.sendInvitationEmail(res.locals.invitation);

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash flash--green">
              Invitation email resent successfully.
            </div>
          `
        );
      }

      if (req.body.role !== undefined) {
        if (!app.locals.constants.roles.includes(req.body.role))
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.locals.helpers.flash.set(
          req,
          res,
          html`
            <div class="flash flash--green">
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
            <div class="flash flash--green">
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
            <div class="flash flash--green">
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
            <div class="flash flash--green">
              Invitation expired successfully.
            </div>
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
              <h2 class="heading--2">
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
                          flex: 1;
                          display: flex;
                          flex-direction: column;
                        `}"
                      >
                        <div class="strong">
                          ${enrollment.userName}
                        </div>
                        <div>${enrollment.userEmail}</div>
                      </div>
                      <div
                        style="${css`
                          width: var(--space--32);
                          display: flex;
                          justify-content: flex-end;
                          align-items: baseline;
                          gap: var(--space--6);
                        `}"
                      >
                          <button
                            $${
                              isOnlyStaff
                                ? html`disabled`
                                : html`
                                    data-tippy-content="${html`
                                      $${app.locals.constants.roles.map(
                                        (role) =>
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
                                                  <button
                                                    $${isSelf
                                                      ? html`
                                                          type="button"
                                                          data-tippy-content="${html`
                                                            <div
                                                              style="${css`
                                                                padding: var(
                                                                    --space--2
                                                                  )
                                                                  var(
                                                                    --space--0
                                                                  );
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
                                                                  You may not
                                                                  undo this
                                                                  action!
                                                                </strong>
                                                              </p>
                                                              <button
                                                                class="button button--rose"
                                                                onclick="${javascript`
                                                              document.querySelector('[aria-describedby="' + this.closest("[data-tippy-root]").id + '"]').closest("form").submit();
                                                            `}"
                                                              >
                                                                Convert to
                                                                ${lodash.capitalize(
                                                                  role
                                                                )}
                                                              </button>
                                                            </div>
                                                          `}"
                                                          data-tippy-theme="dropdown
                                                          dropdown--rose"
                                                          data-tippy-trigger="click"
                                                          data-tippy-interactive="true"
                                                          data-tippy-allowHTML="true"
                                                          data-tippy-append-to="body"
                                                        `
                                                      : html``}
                                                    class="dropdown--item"
                                                  >
                                                    Convert to
                                                    ${lodash.capitalize(role)}
                                                  </button>
                                                </form>
                                              `
                                      )}
                                    `}"
                                    data-tippy-theme="dropdown"
                                    data-tippy-trigger="click"
                                    data-tippy-interactive="true"
                                    data-tippy-allowHTML="true"
                                    class="button--inline"
                                  `
                            }
                          >
                            <span
                              $${
                                isOnlyStaff
                                  ? html`
                                      data-tippy-content="You may not change
                                      your own role because you’re the only
                                      staff member." data-tippy-theme="tooltip"
                                      tabindex="0"
                                    `
                                  : html`
                                      data-tippy-content="Change Role"
                                      data-tippy-theme="tooltip"
                                      data-tippy-touch="false"
                                    `
                              }
                            >
                              ${lodash.capitalize(enrollment.role)}
                              <i class="bi bi-chevron-down"></i>
                            </span>
                        </span>

                          <button
                            $${
                              isOnlyStaff
                                ? html`disabled`
                                : html`
                                    data-tippy-content="${html`
                                      <form
                                        method="POST"
                                        action="${action}?_method=DELETE"
                                        style="${css`
                                          padding: var(--space--2)
                                            var(--space--0);
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
                                              font-weight: var(
                                                --font-weight--bold
                                              );
                                            `}"
                                          >
                                            You may not undo this action!
                                          </strong>
                                        </p>
                                        <button class="button button--rose">
                                          Remove from the course
                                        </button>
                                      </form>
                                    `}"
                                    data-tippy-theme="dropdown dropdown--rose"
                                    data-tippy-trigger="click"
                                    data-tippy-interactive="true"
                                    data-tippy-allowHTML="true"
                                    class="button--inline button--inline--rose"
                                  `
                            }
                          >
                            <span
                              $${
                                isOnlyStaff
                                  ? html`
                                      data-tippy-content="You may not remove
                                      yourself from the course because you’re
                                      the only staff member."
                                      data-tippy-theme="tooltip tooltip--rose"
                                      tabindex="0"
                                    `
                                  : html`
                                      data-tippy-content="Remove from the
                                      Course" data-tippy-theme="tooltip
                                      tooltip--rose" data-tippy-touch="false"
                                    `
                              }
                            >
                              <i class="bi bi-person-dash"></i>
                            </span>
                          </button>
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
            <div class="flash flash--green">
              Enrollment updated successfully.
            </div>
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
          <div class="flash flash--green">
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
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollment",
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
              <h2 class="heading--2">
                <i class="bi bi-sliders"></i>
                Course Settings ·
                <i class="bi bi-person"></i>
                Your Enrollment
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/settings/enrollment?_method=PATCH"
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
                    gap: var(--space--1);
                  `}"
                >
                  <p
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                    `}"
                  >
                    Accent Color
                    <button
                      type="button"
                      data-tippy-content="The accent color helps you tell your courses apart."
                      data-tippy-theme="tooltip"
                      data-tippy-trigger="click"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </p>
                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                      flex-wrap: wrap;
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
                          style="${css`
                            background-color: var(--color--${accentColor}--500);
                            @media (prefers-color-scheme: dark) {
                              background-color: var(
                                --color--${accentColor}--700
                              );
                            }
                            width: var(--space--5);
                            height: var(--space--5);
                            border-radius: 50%;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            cursor: pointer;

                            &:checked::before {
                              content: "";
                              display: block;
                              width: var(--space--2);
                              height: var(--space--2);
                              border-radius: 50%;
                              background-color: var(--color--primary-gray--50);
                              @media (prefers-color-scheme: dark) {
                                background-color: var(
                                  --color--primary-gray--900
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
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
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
    "/courses/:courseReference/settings/enrollment",
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
        html`
          <div class="flash flash--green">Enrollment updated successfully.</div>
        `
      );

      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollment`
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
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
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
                  class="button button--primary"
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
    IsAuthenticatedMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isAuthenticated,
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
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
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
                    class="button button--primary"
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
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
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
                  class="button button--primary"
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
    thread: (_: {
      req: express.Request<
        { courseReference: string; threadReference?: string },
        HTML,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsThreadAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      res: express.Response<
        HTML,
        IsEnrolledInCourseMiddlewareLocals &
          Partial<IsThreadAccessibleMiddlewareLocals> &
          Partial<EventSourceMiddlewareLocals>
      >;
      head: HTML;
      body: HTML;
    }) => HTML;
  }
  app.locals.layouts.thread = ({ req, res, head, body }) => {
    const sidebar = html`
      <!--
<button class="button--inline">
            <i class="bi bi-share"></i>
          </button>
    -->
      <div
        style="${css`
          color: var(--color--primary--200);
          background-color: var(--color--primary--900);
          @media (prefers-color-scheme: dark) {
            color: var(--color--primary--200);
            background-color: var(--color--primary--900);
          }
          flex: 1;
          padding: var(--space--4);
          display: flex;
          justify-content: center;
        `}"
      >
        <div
          style="${css`
            flex: 1;
            max-width: calc(var(--space--80) * 2);
            display: flex;
            flex-direction: column;
            gap: var(--space--4);
          `}"
        >
          <div
            style="${css`
              display: flex;
              justify-content: center;
              font-weight: var(--font-weight--bold);
            `}"
          >
            <a
              href="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/threads/new"
              style="${css`
                display: flex;
                gap: var(--space--2);
                transition: color var(--transition-duration);

                &:hover,
                &:focus {
                  color: var(--color--primary--50);
                }
                @media (prefers-color-scheme: dark) {
                  &:hover,
                  &:focus {
                    color: var(--color--primary--50);
                  }
                }
              `}"
            >
              <i class="bi bi-chat-left-text"></i>
              Create a New Thread
            </a>
          </div>

          <div
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
          >
            $${res.locals.threads.map(
              (thread) => html`
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/threads/${thread.reference}"
                  class="${thread.id === res.locals.thread?.id ? "active" : ""}"
                  style="${css`
                    width: calc(100% + 2 * var(--space--2));
                    padding: var(--space--2) var(--space--2);
                    border-radius: var(--border-radius--lg);
                    margin-left: calc(-1 * var(--space--2));
                    display: block;
                    transition: background-color var(--transition-duration);

                    &:hover,
                    &:focus,
                    &.active:focus {
                      background-color: var(--color--primary--600);
                    }
                    &:active {
                      background-color: var(--color--primary--700);
                    }
                    @media (max-width: 899px) {
                      :not(.active--cancel) > &.active {
                        background-color: var(--color--primary--700);
                      }
                    }
                    @media (min-width: 900px) {
                      &.active {
                        background-color: var(--color--primary--700);
                      }
                    }
                    @media (prefers-color-scheme: dark) {
                      &:hover,
                      &:focus,
                      &.active:focus {
                        background-color: var(--color--primary--600);
                      }
                      &:active {
                        background-color: var(--color--primary--700);
                      }
                      @media (max-width: 899px) {
                        :not(.active--cancel) > &.active {
                          background-color: var(--color--primary--700);
                        }
                      }
                      @media (min-width: 900px) {
                        &.active {
                          background-color: var(--color--primary--700);
                        }
                      }
                    }
                  `}"
                >
                  <h3
                    style="${css`
                      font-weight: var(--font-weight--bold);
                      color: var(--color--primary--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--primary--100);
                      }
                    `}"
                  >
                    ${thread.title}
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
                        #${thread.reference} created
                        <time class="time--relative">${thread.createdAt}</time>
                        by ${thread.authorEnrollment.user.name}
                      </div>
                      $${thread.updatedAt !== thread.createdAt
                        ? html`
                            <div>
                              and last updated
                              <time class="time--relative">
                                ${thread.updatedAt}
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
                      $${thread.pinnedAt !== null
                        ? html`
                            <div>
                              <i class="bi bi-pin"></i>
                              Pinned
                            </div>
                          `
                        : html``}
                      $${thread.questionAt !== null
                        ? html`
                            <div>
                              <i class="bi bi-patch-question"></i>
                              Question
                            </div>
                          `
                        : html``}
                      <div>
                        <i class="bi bi-chat-left-text"></i>
                        ${thread.postsCount}
                        post${thread.postsCount === 1 ? "" : "s"}
                      </div>
                      $${thread.likesCount === 0
                        ? html``
                        : html`
                            <div>
                              <i class="bi bi-hand-thumbs-up"></i>
                              ${thread.likesCount}
                              like${thread.likesCount === 1 ? "" : "s"}
                            </div>
                          `}
                    </div>
                  </div>
                </a>
              `
            )}
            <script>
              (() => {
                // const id = document.currentScript.previousElementSibling.id;
                // eventSource.addEventListener("refreshed", (event) => {
                //   document
                //     .querySelector("#" + id)
                //     .replaceWith(event.detail.document.querySelector("#" + id));
                // });
              })();
            </script>
          </div>
          <script>
            (() => {
              const element = document.currentScript.previousElementSibling;
              document.addEventListener("DOMContentLoaded", () => {
                if (element.dataset.canceledActiveWhenRedirected) return;
                element.dataset.canceledActiveWhenRedirected = true;
                if (
                  new URLSearchParams(window.location.search).get(
                    "redirected"
                  ) !== "true"
                )
                  return;
                element.classList.add("active--cancel");
              });
            })();
          </script>
        </div>
      </div>
    `;

    return app.locals.layouts.application({
      req,
      res,
      head,
      extraHeaders: html`
        $${res.locals.enrollment.role === "staff"
          ? html`
              <div
                style="${css`
                  color: var(--color--primary--100);
                  background-color: var(--color--primary--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
                  }
                  padding: var(--space--1) var(--space--4);
                  display: flex;
                  justify-content: center;
                  @media (min-width: 1280px) {
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
                    document.querySelector("#sidebar").classList.toggle("single-column--hidden");
                    document.querySelector("#main").classList.toggle("single-column--hidden");
                    this.lastElementChild.classList.toggle("bi-chevron-bar-expand");
                    this.lastElementChild.classList.toggle("bi-chevron-bar-contract");
                  `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Threads
                  <i class="bi bi-chevron-bar-expand"></i>
                </button>
                <script>
                  (() => {
                    const element =
                      document.currentScript.previousElementSibling;
                    document.addEventListener("DOMContentLoaded", () => {
                      if (element.dataset.pressedWhenRedirected) return;
                      element.dataset.pressedWhenRedirected = true;
                      if (
                        new URLSearchParams(window.location.search).get(
                          "redirected"
                        ) !== "true"
                      )
                        return;
                      element.click();
                      element.parentElement.remove();
                    });
                  })();
                </script>
              </div>
            `
          : html``}
      `,
      body: html`
        <div
          style="${css`
            flex: 1;
            overflow: auto;

            & > * {
              display: flex;
              overflow: auto;
              justify-content: center;
            }

            @media (max-width: 899px) {
              display: flex;
              justify-content: center;

              & > * {
                flex: 1;
              }

              & > .single-column--hidden {
                display: none;
              }
            }

            @media (min-width: 900px) and (max-width: 1279px) {
              display: flex;

              & > #sidebar {
                width: var(--space--80);
              }

              & > #main {
                flex: 1;
              }
            }

            @media (min-width: 1280px) {
              display: grid;
              grid-template-columns: var(--space--80) auto var(--space--80);
            }
          `}"
        >
          <div id="sidebar" class="single-column--hidden">$${sidebar}</div>
          <div id="main">
            <div
              style="${css`
                flex: 1;
                max-width: calc(var(--space--80) * 2);
                padding: var(--space--4);
                overflow: auto;
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
    });
  };

  interface Partials {
    textEditor: (value?: string) => HTML;
  }
  app.locals.partials.textEditor = (value = ""): HTML => html`
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
              padding: var(--space--1) var(--space--3);
              border-top-left-radius: var(--border-radius--md);
              border-top-right-radius: var(--border-radius--md);
              display: flex;
              gap: var(--space--2);
            }

            & > :checked + span {
              background-color: var(--color--white);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--primary-gray--700);
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
            onclick="${javascript`
              this.closest(".text-editor").querySelector(".write").hidden = false;
              this.closest(".text-editor").querySelector(".loading").hidden = true;
              this.closest(".text-editor").querySelector(".preview").hidden = true;
            `}"
          />
          <span class="button--inline after-toggle">
            <i class="bi bi-pencil"></i>
            Write
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="text-editor--mode"
            autocomplete="off"
            onclick="${javascript`
              (async () => {
                const write = this.closest(".text-editor").querySelector(".write");
                const loading = this.closest(".text-editor").querySelector(".loading");
                const preview = this.closest(".text-editor").querySelector(".preview");
                if (!isValid(write)) {
                  event.preventDefault();
                  return;
                }
                write.hidden = true;
                loading.hidden = false;
                preview.hidden = true;
                preview.innerHTML = await (
                  await fetch("${app.locals.settings.url}/preview", {
                    method: "POST",
                    body: new URLSearchParams({ content: write.querySelector("textarea").value }),
                  })
                ).text();
                write.hidden = true;
                loading.hidden = true;
                preview.hidden = false;
              })();
            `}"
          />
          <span class="button--inline after-toggle">
            <i class="bi bi-eyeglasses"></i>
            Preview
          </span>
        </label>
      </div>
      <div
        class="write"
        style="${css`
          background-color: var(--color--white);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--primary-gray--700);
          }
          border-radius: var(--border-radius--lg);
          border-top-left-radius: var(--border-radius--none);
        `}"
      >
        <div
          style="${css`
            padding: var(--space--2) var(--space--0);
            margin: var(--space--0) var(--space--4);
            overflow-x: auto;
            display: flex;
            gap: var(--space--5);
            & > * {
              display: flex;
              gap: var(--space--2);
            }
          `}"
        >
          <div>
            <button
              type="button"
              data-tippy-content="${html`
                Heading Level 1
                <span class="keyboard-shortcut">
                  (Ctrl+1 or <i class="bi bi-command"></i>1)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--heading-level-1"
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
              data-tippy-content="${html`
                Heading Level 2
                <span class="keyboard-shortcut">
                  (Ctrl+2 or <i class="bi bi-command"></i>2)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--heading-level-2"
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
              data-tippy-content="${html`
                Heading Level 3
                <span class="keyboard-shortcut">
                  (Ctrl+3 or <i class="bi bi-command"></i>3)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--heading-level-3"
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
              data-tippy-content="${html`
                Bold
                <span class="keyboard-shortcut">
                  (Ctrl+B or <i class="bi bi-command"></i>B)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--bold"
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
              data-tippy-content="${html`
                Italic
                <span class="keyboard-shortcut">
                  (Ctrl+I or <i class="bi bi-command"></i>I)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--italic"
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
              data-tippy-content="${html`
                Link
                <span class="keyboard-shortcut">
                  (Ctrl+K or <i class="bi bi-command"></i>K)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--link"
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
              data-tippy-content="${html`
                Unordered List
                <span class="keyboard-shortcut">
                  (Ctrl+U or <i class="bi bi-command"></i>U)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--unordered-list"
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
              data-tippy-content="${html`
                Ordered List
                <span class="keyboard-shortcut">
                  (Ctrl+O or <i class="bi bi-command"></i>O)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--ordered-list"
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
              data-tippy-content="${html`
                Task List
                <span class="keyboard-shortcut">
                  (Ctrl+Y or <i class="bi bi-command"></i>Y)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--task-list"
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
              data-tippy-content="${html`
                Quote
                <span class="keyboard-shortcut">
                  (Ctrl+' or <i class="bi bi-command"></i>')
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--quote"
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
              data-tippy-content="${html`
                Table
                <span class="keyboard-shortcut">
                  (Ctrl+H or <i class="bi bi-command"></i>H)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--table"
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
              data-tippy-content="${html`
                Disclosure
                <span class="keyboard-shortcut">
                  (Ctrl+D or <i class="bi bi-command"></i>D)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--disclosure"
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
              data-tippy-content="${html`
                Inline Code
                <span class="keyboard-shortcut">
                  (Ctrl+[ or <i class="bi bi-command"></i>[)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--inline-code"
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
              data-tippy-content="${html`
                Code Block
                <span class="keyboard-shortcut">
                  (Ctrl+] or <i class="bi bi-command"></i>])
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--code-block"
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
              data-tippy-content="${html`
                Inline Mathematics
                <span class="keyboard-shortcut">
                  (Ctrl+M or <i class="bi bi-command"></i>M)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--inline-mathematics"
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
              data-tippy-content="${html`
                Mathematics Block
                <span class="keyboard-shortcut">
                  (Ctrl+L or <i class="bi bi-command"></i>L)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--mathematics-block"
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
              data-tippy-content="${html`
                Mention User
                <span class="keyboard-shortcut">
                  (Ctrl+, or <i class="bi bi-command"></i>,)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--mention-user"
              onclick="${javascript`
                alert("TODO: Mention User");
              `}"
            >
              <i class="bi bi-at"></i>
            </button>
            <button
              type="button"
              data-tippy-content="${html`
                Cite Thread or Post
                <span class="keyboard-shortcut">
                  (Ctrl+. or <i class="bi bi-command"></i>.)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--cite-thread-or-post"
              onclick="${javascript`
                alert("TODO: Cite Thread or Post");
              `}"
            >
              <i class="bi bi-hash"></i>
            </button>
          </div>
          <div>
            <button
              type="button"
              data-tippy-content="${html`
                Image
                <span class="keyboard-shortcut">
                  (Ctrl+; or <i class="bi bi-command"></i>; or drag-and-drop or
                  copy-and-paste)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--image"
              onclick="${javascript`
                alert("TODO: Image");
              `}"
            >
              <i class="bi bi-image"></i>
            </button>
            <button
              type="button"
              data-tippy-content="${html`
                Attachment
                <span class="keyboard-shortcut">
                  (Ctrl+P or <i class="bi bi-command"></i>P or drag-and-drop or
                  copy-and-paste)
                </span>
              `}"
              data-tippy-theme="tooltip"
              data-tippy-touch="false"
              data-tippy-allowHTML="true"
              class="button--inline tool--attachment"
              onclick="${javascript`
                alert("TODO: Attachment");
              `}"
            >
              <i class="bi bi-paperclip"></i>
            </button>
          </div>
          <div>
            <button
              type="button"
              data-tippy-content="${html`
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
              `}"
              data-tippy-theme="dropdown"
              data-tippy-trigger="click"
              data-tippy-interactive="true"
              data-tippy-allowHTML="true"
              class="button--inline"
            >
              <span
                data-tippy-content="Help"
                data-tippy-theme="tooltip"
                data-tippy-touch="false"
              >
                <i class="bi bi-info-circle"></i>
              </span>
            </button>
          </div>
        </div>
        <textarea
          class="input--text fit-textarea"
          name="content"
          required
          onkeydown="${javascript`
            if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
              event.preventDefault();
              this.closest("form").querySelector('button:not([type="button"])').click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "1") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--heading-level-1").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "2") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--heading-level-2").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "3") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--heading-level-3").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "B") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--bold").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "I") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--italic").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "K") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--link").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "U") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--unordered-list").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "O") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--ordered-list").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "Y") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--task-list").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "'") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--quote").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "H") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--table").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "D") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--disclosure").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "[") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--inline-code").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === "]") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--code-block").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "M") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--inline-mathematics").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "L") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--mathematics-block").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === ",") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--mention-user").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === ".") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--cite-thread-or-post").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key === ";") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--image").click();
              return;
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toUpperCase() === "P") {
              event.preventDefault();
              this.closest(".text-editor").querySelector(".tool--attachment").click();
              return;
            }
          `}"
        >
${value}</textarea
        >
      </div>

      <div
        hidden
        class="loading strong"
        style="${css`
          background-color: var(--color--white);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--primary-gray--700);
          }
          padding: var(--space--4);
          border-radius: var(--border-radius--lg);
          display: flex;
          justify-content: center;
          align-items: center;
          gap: var(--space--2);
        `}"
      >
        $${app.locals.partials.art.small} Loading…
      </div>
      <script>
        (() => {
          const element = document.currentScript.previousElementSibling;
          document.addEventListener("DOMContentLoaded", () => {
            if (element.dataset.animated) return;
            element.dataset.animated = true;
            new ArtAnimation({
              element,
              speed: 0.005,
              amount: 1,
              startupDuration: 0,
            }).start();
          });
        })();
      </script>

      <div
        hidden
        class="preview text"
        style="${css`
          background-color: var(--color--white);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--primary-gray--700);
          }
          padding: var(--space--4);
          border-radius: var(--border-radius--lg);
        `}"
      >
        Preview
      </div>
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
        app.locals.layouts.thread({
          req,
          res,
          head: html`
            <title>
              Create a New Thread · ${res.locals.course.name} · CourseLore
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
              <h2 class="heading--2">
                <i class="bi bi-chat-left-text"></i>
                Create a New Thread
              </h2>

              <form
                method="POST"
                action="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/threads"
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
                <div
                  style="${css`
                    display: flex;
                    gap: var(--space--8);

                    span {
                      display: flex;
                      gap: var(--space--2);
                    }
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--2);
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
                              name="isPinned"
                              autocomplete="off"
                            />
                            <span
                              data-tippy-content="Pin"
                              data-tippy-theme="tooltip"
                              data-tippy-touch="false"
                              class="button--inline after-toggle"
                              style="${css`
                                :checked + & {
                                  display: none;
                                }
                              `}"
                            >
                              <i class="bi bi-pin-angle"></i>
                              Unpinned
                            </span>
                            <span
                              data-tippy-content="Unpin"
                              data-tippy-theme="tooltip"
                              data-tippy-touch="false"
                              class="button--inline after-toggle strong"
                              style="${css`
                                :not(:checked) + * + & {
                                  display: none;
                                }
                              `}"
                            >
                              <i class="bi bi-pin-fill"></i>
                              Pinned
                            </span>
                          </label>
                          <button
                            type="button"
                            data-tippy-content="Pinned threads are listed first."
                            data-tippy-theme="tooltip"
                            data-tippy-trigger="click"
                            class="button--inline"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </div>
                      `
                    : html``}

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
                      name="isQuestion"
                      autocomplete="off"
                      $${res.locals.enrollment.role === "staff"
                        ? ``
                        : `checked`}
                    />
                    <span
                      data-tippy-content="Mark as a Question"
                      data-tippy-theme="tooltip"
                      data-tippy-touch="false"
                      class="button--inline after-toggle"
                      style="${css`
                        :checked + & {
                          display: none;
                        }
                      `}"
                    >
                      <i class="bi bi-patch-question"></i>
                      Not a question
                    </span>
                    <span
                      data-tippy-content="Mark as Not a Question"
                      data-tippy-theme="tooltip"
                      data-tippy-touch="false"
                      class="button--inline after-toggle strong"
                      style="${css`
                        :not(:checked) + * + & {
                          display: none;
                        }
                      `}"
                    >
                      <i class="bi bi-patch-question-fill"></i>
                      Question
                    </span>
                  </label>
                </div>

                $${app.locals.partials.textEditor()}

                <div>
                  <button
                    data-tippy-content="${html`
                      <span class="keyboard-shortcut">
                        Ctrl+Enter or <i class="bi bi-command"></i
                        ><i class="bi bi-arrow-return-left"></i>
                      </span>
                    `}"
                    data-tippy-theme="tooltip"
                    data-tippy-touch="false"
                    data-tippy-allowHTML="true"
                    class="button button--primary"
                    style="${css`
                      @media (max-width: 400px) {
                        width: 100%;
                      }
                    `}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Create Thread
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
        app.locals.layouts.thread({
          req,
          res,
          head: html`
            <title>
              ${res.locals.thread.title} · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <div
              style="${css`
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                gap: var(--space--4);
              `}"
            >
              <h2>
                <span class="heading--1">${res.locals.thread.title}</span>

                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/threads/${res.locals.thread.reference}"
                  class="button--inline button--inline--gray"
                  style="${css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                  `}"
                  >#${res.locals.thread.reference}</a
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
                          data-tippy-content="${html`
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/threads/${res.locals
                                .thread.reference}?_method=DELETE"
                              style="${css`
                                padding: var(--space--2) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `}"
                            >
                              <p>
                                Are you sure you want to remove this thread?
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
                                Remove Thread
                              </button>
                            </form>
                          `}"
                          data-tippy-theme="dropdown dropdown--rose"
                          data-tippy-trigger="click"
                          data-tippy-interactive="true"
                          data-tippy-allowHTML="true"
                          class="button--inline button--inline--gray button--inline--rose"
                        >
                          <span
                            data-tippy-content="Remove Thread"
                            data-tippy-theme="tooltip tooltip--rose"
                            data-tippy-touch="false"
                          >
                            <i class="bi bi-trash"></i>
                          </span>
                        </button>
                      </div>
                    `
                  : html``}
                $${app.locals.helpers.mayEditThread(req, res)
                  ? html`
                      <div>
                        <button
                          data-tippy-content="${html`
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/threads/${res.locals
                                .thread.reference}?_method=PATCH"
                              style="${css`
                                padding: var(--space--2) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `}"
                            >
                              <input
                                type="text"
                                name="title"
                                value="${res.locals.thread.title}"
                                required
                                autocomplete="off"
                                class="input--text"
                              />
                              <button class="button button--primary">
                                <i class="bi bi-pencil"></i>
                                Update Title
                              </button>
                            </form>
                          `}"
                          data-tippy-theme="dropdown"
                          data-tippy-trigger="click"
                          data-tippy-interactive="true"
                          data-tippy-allowHTML="true"
                          class="button--inline button--inline--gray"
                        >
                          <span
                            data-tippy-content="Edit Title"
                            data-tippy-theme="tooltip"
                            data-tippy-touch="false"
                          >
                            <i class="bi bi-pencil"></i>
                          </span>
                        </button>
                      </div>
                    `
                  : html``}
              </div>
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
                      hidden
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
                <div
                  style="${css`
                    padding-bottom: var(--space--4);
                    border-bottom: var(--border-width--4) solid
                      var(--color--primary-gray--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--primary-gray--700);
                    }
                    margin: var(--space--4) var(--space--0);
                  `}"
                >
                  <div>
                    <div>
                      <span class="strong">
                        ${post.authorEnrollment.user.name}
                      </span>
                      said
                      <time class="time--relative">${post.createdAt}</time>
                      $${post.updatedAt !== post.createdAt
                        ? html`
                            and last edited
                            <time class="time--relative">
                              ${post.updatedAt}
                            </time>
                          `
                        : html``}
                      <a
                        href="${app.locals.settings.url}/courses/${res.locals
                          .course.reference}/threads/${res.locals.thread
                          .reference}#${post.reference}"
                        class="button--inline button--inline--gray"
                        style="${css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `}"
                        >#${res.locals.thread.reference}/${post.reference}</a
                      >
                    </div>

                    <div hidden>
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
                              <div>
                                <button
                                  title="Remove Post"
                                  class="undecorated red"
                                  onclick="${javascript`
                                    if (!confirm("Remove post?\\n\\nYou may not undo this action!"))
                                      event.preventDefault();
                                  `}"
                                >
                                  <i class="bi bi-trash"></i>
                                </button>
                              </div>
                            </form>
                          `
                        : html``}
                      $${app.locals.helpers.mayEditPost(req, res, post)
                        ? html`
                            <div>
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
                            </div>
                          `
                        : html``}

                      <div>
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
                      </div>
                    </div>
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
                              hidden
                            >
                              $${content}
                            </div>
                          `;
                    })()}
                    <div class="text">
                      $${app.locals.partials.textProcessor(post.content)}
                    </div>

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
                            hidden
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
                                  class="undecorated ${isLiked ? "green" : ""}"
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
                            <button
                              data-tippy-content="${html`
                                <span class="keyboard-shortcut">
                                  Ctrl+Enter or
                                  <i class="bi bi-command"></i
                                  ><i class="bi bi-arrow-return-left"></i>
                                </span>
                              `}"
                              data-tippy-theme="tooltip"
                              data-tippy-touch="false"
                              data-tippy-allowHTML="true"
                              class="green"
                            >
                              Change Post
                            </button>
                          </p>
                        </form>
                      `
                    : html``}
                </div>
              `
            )}
            <script>
              // (() => {
              //   const id = document.currentScript.previousElementSibling.id;
              //   eventSource.addEventListener("refreshed", (event) => {
              //     const posts = document.querySelector("#" + id);
              //     if (posts.querySelector(".edit:not([hidden])") !== null)
              //       return;
              //     posts.replaceWith(
              //       event.detail.document.querySelector("#" + id)
              //     );
              //   });
              // })();
            </script>

            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/threads/${res.locals.thread.reference}/posts"
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <!--
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
                        autocomplete="off"
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
              -->

              $${app.locals.partials.textEditor()}
              <script>
                (() => {
                  const textarea = document.currentScript.previousElementSibling.querySelector(
                    "textarea"
                  );
                  document.addEventListener("DOMContentLoaded", () => {
                    if (textarea.dataset.populatedFromLocalStorage === "true")
                      return;
                    textarea.dataset.populatedFromLocalStorage = true;
                    textarea.defaultValue =
                      JSON.parse(
                        localStorage.getItem("threadsTextareas") ?? "{}"
                      )[window.location.pathname] ?? "";
                    textarea.dataset.skipIsModified = "true";
                    textarea.addEventListener("input", () => {
                      const threadsTextareas = JSON.parse(
                        localStorage.getItem("threadsTextareas") ?? "{}"
                      );
                      threadsTextareas[window.location.pathname] =
                        textarea.value;
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
                  });
                })();
              </script>

              <div>
                <button
                  data-tippy-content="${html`
                    <span class="keyboard-shortcut">
                      Ctrl+Enter or
                      <i class="bi bi-command"></i
                      ><i class="bi bi-arrow-return-left"></i>
                    </span>
                  `}"
                  data-tippy-theme="tooltip"
                  data-tippy-touch="false"
                  data-tippy-allowHTML="true"
                  class="button button--primary"
                  style="${css`
                    @media (max-width: 400px) {
                      width: 100%;
                    }
                  `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Post
                </button>
              </div>
            </form>
          `,
        })
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
      app.locals.layouts.main({
        req,
        res,
        head: html`
          <title>
            Demonstration Inbox · CourseLore · The Open-Source Student Forum
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
            <div
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <h2 class="heading--2">
                <i class="bi bi-inbox"></i>
                Demonstration Inbox
              </h2>
              <p>
                CourseLore doesn’t send emails in demonstration mode.
                $${emails.length === 0
                  ? html`Emails that would have been sent will show up here
                    instead.`
                  : html`Here are the emails that would have been sent:`}
              </p>
            </div>

            $${emails.length === 0
              ? html`
                  <div class="decorative-icon">
                    <i class="bi bi-inbox"></i>
                  </div>
                `
              : html`
                  <div
                    style="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--4);
                    `}"
                  >
                    $${emails.map(
                      (email) => html`
                        <div>
                          <div
                            style="${css`
                              background-color: var(--color--primary--50);
                              @media (prefers-color-scheme: dark) {
                                background-color: var(--color--primary--900);
                              }
                              padding: var(--space--2) var(--space--4);
                              border: var(--border-width--1) solid
                                var(--color--primary--100);
                              @media (prefers-color-scheme: dark) {
                                border: var(--border-width--0);
                              }
                              border-top-left-radius: var(--border-radius--xl);
                              border-top-right-radius: var(--border-radius--xl);
                              display: flex;
                              @media (max-width: 1023px) {
                                flex-direction: column;
                              }
                              @media (min-width: 1024px) {
                                gap: var(--space--4);
                              }
                              justify-content: space-between;
                              align-items: baseline;
                            `}"
                          >
                            <h2
                              style="${css`
                                font-weight: var(--font-weight--bold);
                                color: var(--color--primary--800);
                                @media (prefers-color-scheme: dark) {
                                  color: var(--color--primary--300);
                                }
                                display: flex;
                                gap: var(--space--2);
                              `}"
                            >
                              <i class="bi bi-envelope"></i>
                              ${email.subject}
                            </h2>
                            <h3
                              style="${css`
                                font-size: var(--font-size--xs);
                                line-height: var(--line-height--xs);
                                color: var(--color--primary--400);
                                @media (prefers-color-scheme: dark) {
                                  color: var(--color--primary--400);
                                }
                              `}"
                            >
                              ${email.to} ·
                              <time
                                class="time--relative"
                                style="${css`
                                  display: inline-block;
                                `}"
                              >
                                ${email.createdAt}
                              </time>
                            </h3>
                          </div>

                          <div
                            class="text"
                            style="${css`
                              color: var(--color--primary-gray--700);
                              background-color: var(--color--primary-gray--50);
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--primary-gray--400);
                                background-color: var(
                                  --color--primary-gray--800
                                );
                              }
                              border: var(--border-width--1) solid
                                var(--color--primary--100);
                              @media (prefers-color-scheme: dark) {
                                border: var(--border-width--0);
                              }
                              padding: var(--space--2) var(--space--4);
                              border-bottom-left-radius: var(
                                --border-radius--xl
                              );
                              border-bottom-right-radius: var(
                                --border-radius--xl
                              );
                              margin-top: calc(-1 * var(--border-width--1));
                              @media (prefers-color-scheme: dark) {
                                margin-top: var(--border-width--0);
                              }
                            `}"
                          >
                            $${email.body}
                          </div>
                        </div>
                      `
                    )}
                  </div>
                `}
          </div>
        `,
      })
    );
  });

  app.all<{}, HTML, {}, {}, IsAuthenticatedMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isAuthenticated,
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
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-question-diamond"></i>
                404 Not Found
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
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

  app.all<{}, HTML, {}, {}, IsUnauthenticatedMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isUnauthenticated,
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
                class="heading--2"
                style="${css`
                  color: var(--color--primary--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                  }
                `}"
              >
                <i class="bi bi-question-diamond"></i>
                404 Not Found
              </h2>
              <div
                style="${css`
                  color: var(--color--primary--800);
                  background-color: var(--color--primary--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--primary--200);
                    background-color: var(--color--primary--900);
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
                    class="button button--primary"
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
              class="heading--2"
              style="${css`
                color: var(--color--primary--200);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--primary--200);
                }
              `}"
            >
              <i class="bi bi-bug"></i>
              ${message} Error
            </h2>
            <div
              style="${css`
                color: var(--color--primary--800);
                background-color: var(--color--primary--100);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--primary--200);
                  background-color: var(--color--primary--900);
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
                class="button button--primary"
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
