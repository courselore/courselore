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

                :root {
                  -webkit-text-size-adjust: 100%;
                  box-sizing: border-box;
                  overflow-wrap: break-word;
                }

                *,
                ::before,
                ::after {
                  box-sizing: inherit;
                  padding: 0;
                  border: 0;
                  margin: 0;
                  outline: 0;
                  font: inherit;
                  text-decoration: inherit;
                  color: inherit;
                  background-color: transparent;
                  appearance: none;
                  list-style: none;
                }

                img,
                svg {
                  max-width: 100%;
                  height: auto;
                }

                textarea {
                  resize: vertical;
                }

                [hidden] {
                  display: none !important;
                }

                .visually-hidden {
                  position: absolute;
                  clip-path: polygon(0 0);
                }

                /* DESIGN SYSTEM OPTIONS */

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

                  --color-white: #ffffff;
                  --color-black: #000000;

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
                }

                @media (prefers-reduced-motion: reduce) {
                  :root {
                    --transition-duration: 0;
                  }
                }

                /* DESIGN SYSTEM */

                :root {
                  --font-weight--main: 400;
                  --font-weight--bold: 500;
                  --font-weight--black: 700;

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

                  --color--focus: var(--color--primary--200);
                }

                @media (prefers-color-scheme: dark) {
                  /* TODO */
                }

                /* GLOBAL STYLES */

                body {
                  font-family: var(--font-family--sans-serif);
                  font-size: var(--font-size--sm);
                  line-height: var(--line-height--sm);
                }

                input,
                textarea {
                  font-size: var(--font-size--base);
                  line-height: var(--line-height--base);
                }

                button {
                  cursor: pointer;
                }

                ::backdrop {
                  background-color: #d6d3d1; /* TODO: var(--color--warm-gray--300) */
                  opacity: 70%;
                }

                :focus {
                  box-shadow: var(--space--0) var(--space--0) var(--space--0)
                    var(--space--1) var(--color--focus);
                }

                .tippy-box {
                  color: var(--color--primary--700);
                  background-color: var(--color--primary--100);

                  &[data-placement^="top"] > .tippy-arrow::before {
                    border-top-color: var(--color--primary--100);
                  }

                  &[data-placement^="bottom"] > .tippy-arrow::before {
                    border-bottom-color: var(--color--primary--100);
                  }

                  &[data-placement^="left"] > .tippy-arrow::before {
                    border-left-color: var(--color--primary--100);
                  }

                  &[data-placement^="right"] > .tippy-arrow::before {
                    border-right-color: var(--color--primary--100);
                  }
                }

                /* COMPONENTS */

                /*
              ::selection {
                color: white;
                background-color: #ff77a8;
              }

              :focus:focus {
                outline: none;
                box-shadow: 0 0 0 2px #ff77a8aa;
              }

              img {
                border-radius: 10px;
                background-color: white;
              }

              .bi {
                width: 1em;
              }

              h1 {
                font-size: 1.3rem;
                line-height: 1.3;
                font-weight: bold;
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

                &:hover,
                &:focus {
                  color: #ff77a8;
                }

                h1 &,
                nav & {
                  text-decoration: none;
                }
              }

              input,
              textarea,
              select,
              button {
                all: unset;

                @supports (-webkit-touch-callout: none) {
                  font-size: 16px;
                }

                &:not(.undecorated) {
                  background-color: white;
                  @media (prefers-color-scheme: dark) {
                    background-color: #5a5a5a;
                  }
                  padding: 0.1rem 1rem;
                  border: 1px solid gainsboro;
                  border-radius: 5px;
                  @media (prefers-color-scheme: dark) {
                    border-color: dimgray;
                  }
                  box-shadow: inset 0 1px 1px #ffffff10, 0 1px 3px #00000010;

                  &:disabled {
                    color: gray;
                    @media (prefers-color-scheme: dark) {
                      color: whitesmoke;
                    }
                    background-color: whitesmoke;
                    @media (prefers-color-scheme: dark) {
                      background-color: #333333;
                    }
                    cursor: not-allowed;
                  }
                }
              }

              input[type="text"],
              input[type="email"],
              input[type="search"],
              textarea {
                cursor: text;
              }

              input[type="search"]::-webkit-search-decoration {
                -webkit-appearance: none;
              }

              input[type="radio"],
              input[type="checkbox"] {
                display: inline-block;

                &:not(.undecorated) {
                  width: 12px;
                  height: 12px;
                  padding: 0;
                  position: relative;
                  top: 0.15em;

                  &:checked {
                    background: #ff77a8 center center no-repeat;
                    border-color: #ff77a8;
                  }
                }
              }

              button {
                text-align: center;
                cursor: default;

                &:not(.undecorated):active {
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
                    0 0 50px -20px black;
                  position: absolute;
                }
              }

              summary {
                cursor: default;

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

              blockquote {
                color: gray;
                padding-left: 0.5rem;
                border-left: 3px solid gray;
                margin: 1rem 0;
              }

              [hidden] {
                display: none !important;
              }

              .full-width {
                box-sizing: border-box;
                width: 100%;
                display: block;
              }

              .secondary {
                font-size: 0.75rem;
                font-weight: normal;
                line-height: 1.3;
                color: gray;
                margin-top: -0.8rem;
              }

              .green {
                color: #008751;
                @media (prefers-color-scheme: dark) {
                  color: #00e436;
                }
              }

              .red {
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
            */
                ${styles.join("")}
              `
            ).css}
          </style>
          $${head}
        </head>
        <body>
          $${app.locals.partials.art.preamble}
          <div hidden>
            <div
              style="${css`
                text-align: center;
              `}"
            >
              $${app.locals.partials.art.small}
              <strong>Loading…</strong>
            </div>
          </div>
          <script>
            let loading;
            (() => {
              const source = document.currentScript.previousElementSibling;
              loading = (target) => {
                target.innerHTML = source.innerHTML;
                new ArtAnimation({
                  element: target,
                  speed: 0.005,
                  amount: 1,
                  startupDuration: 0,
                }).start();
              };
            })();
          </script>
          $${bodyDOM.firstElementChild!.innerHTML}
          <script src="${app.locals.settings
              .url}/node_modules/@popperjs/core/dist/umd/popper.min.js"></script>
          <script src="${app.locals.settings
              .url}/node_modules/tippy.js/dist/tippy-bundle.umd.js"></script>
          <script>
            tippy("[data-tippy-content]");
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
                    background-color: $red;
                    padding: 0.2rem 1rem;
                    border-bottom: 1px solid white;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 0.5rem;
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
                      padding: 0 0.2rem;
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
                      padding: 0 0.2rem;
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
      `
    );

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
              max-width: 45ch;
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
      body: HTML,
      extraMenu?: HTML
    ) => HTML;
  }
  app.locals.layouts.applicationWithHeader = (
    req,
    res,
    head,
    body,
    extraMenu = html``
  ) =>
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
                padding: 0.2rem 1rem;
                display: grid;
                align-items: center;
                grid-template-columns: 1fr 2fr 1fr;
                row-gap: 0.5rem;
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
                          grid-area: 2 / 1 / 2 / 3;
                          margin-left: -0.2rem;
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
                        <i class="bi bi-journal-text"></i>
                        ${res.locals.course.name}
                      </a>
                      <div class="dropdown-menu" aria-labelledby="course-menu">
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}"
                          class="dropdown-item"
                        >
                          <i class="bi bi-chat-left-text"></i>
                          Threads
                        </a>
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
                            href="${app.locals.settings.url}/"
                          >
                            <i class="bi bi-journal"></i>
                            Courses
                          </a>
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
              $${extraMenu}
            </nav>
            $${app.locals.helpers.flash.get(req, res) ?? html``}
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

  interface Layouts {
    applicationWithHeaderAndSidebar: (
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
      body: HTML,
      sidebar: HTML,
      sidebarButton: HTML
    ) => HTML;
  }
  app.locals.layouts.applicationWithHeaderAndSidebar = (
    req,
    res,
    head,
    body,
    sidebar,
    sidebarButton
  ) =>
    app.locals.layouts.applicationWithHeader(
      req,
      res,
      head,
      html`
        <div
          style="${css`
            height: 100%;
            & > * {
              overflow: auto;
            }
            @include media-breakpoint-down(md) {
              display: grid;
              & > * {
                grid-area: 1 / 1;
              }
            }
            @include media-breakpoint-up(md) {
              display: flex;
            }
          `}"
        >
          <div
            id="sidebar"
            class="collapse"
            style="${css`
              color: white;
              background-color: $purple-600;
              border-top: 1px solid $purple-700;
              @include media-breakpoint-down(md) {
                z-index: $zindex-modal;
              }
              @include media-breakpoint-up(md) {
                display: block;
                width: 35ch;
              }
            `}"
          >
            $${sidebar}
          </div>
          <div
            style="${css`
              @include media-breakpoint-up(md) {
                flex: 1;
              }
            `}"
          >
            <div
              style="${css`
                max-width: 80ch;
                margin: 0 auto;
                padding: 0.5rem 1rem;
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
      html`
        <div
          style="${css`
            @include media-breakpoint-down(md) {
              grid-area: 2 / 3 / 2 / 4;
              justify-self: end;
              margin-right: -0.2rem;
            }
            @include media-breakpoint-up(md) {
              display: none;
            }
          `}"
        >
          <button
            type="button"
            class="btn link-light dropdown-toggle"
            data-bs-toggle="collapse"
            data-bs-target="#sidebar"
            aria-expanded="false"
            aria-controls="sidebar"
            style="${css`
              padding: 0 0.2rem;
              &:hover,
              &:focus {
                background-color: $purple-700;
              }
            `}"
          >
            $${sidebarButton}
          </button>
        </div>
      `
    );

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
            <stop offset="0%" stop-color="#e879f9" />
            <stop offset="100%" stop-color="#c084fc" />
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>Authenticate · CourseLore</title>`,
          html`
            <p class="card-text">
              To continue, follow the Magic Authentication Link we sent to
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
                This Magic Authentication Link is invalid or has expired.
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

                <div
                  class="form-floating text-body"
                  data-bs-toggle="tooltip"
                  title="This is the email you confirmed by having followed the Magic Authentication Link and may not be changed."
                >
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>Magic Authentication Link · CourseLore</title>`,
          html`
            <p class="card-text">
              You’re already signed in as $${currentUserHTML} and you tried to
              use
              $${otherUserEmail === undefined
                ? html`an invalid or expired Magic Authentication Link`
                : html`a Magic Authentication Link for $${otherUserHTML}`}.
            </p>

            <p class="card-text">
              <a
                href="${app.locals.settings.url}/"
                class="btn btn-primary"
                style="${css`
                  width: 100%;
                `}"
              >
                Continue Signed in as $${currentUserHTML}
                <i class="bi bi-chevron-right"></i>
              </a>
            </p>

            $${otherUserEmail === undefined || isSelf
              ? html`
                  <form
                    method="POST"
                    action="${app.locals.settings
                      .url}/authenticate?_method=DELETE"
                    class="card-text"
                  >
                    <p>
                      <button
                        type="submit"
                        class="btn btn-outline-light"
                        style="${css`
                          width: 100%;
                        `}"
                      >
                        <i class="bi bi-box-arrow-in-right"></i>
                        Sign Out
                      </button>
                    </p>
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
                    <p class="card-text">
                      <button
                        type="submit"
                        class="btn btn-outline-light"
                        style="${css`
                          width: 100%;
                        `}"
                      >
                        <i class="bi bi-arrow-left-right"></i>
                        Sign out as $${currentUserHTML} and Sign
                        ${otherUser === undefined ? "up" : "in"} as
                        $${otherUserHTML}
                      </button>
                    </p>
                  </form>
                `}
            $${req.query.redirect === undefined
              ? html``
              : html`
                  <p class="card-text">
                    <a
                      href="${app.locals.settings.url}${req.query.redirect}"
                      class="btn btn-outline-light"
                      style="${css`
                        width: 100%;
                      `}"
                    >
                      Continue Signed in as $${currentUserHTML} and Visit the
                      Page to Which the Magic Authentication Link Would Have
                      Redirected You:
                      ${app.locals.settings.url}${req.query.redirect}
                      <i class="bi bi-chevron-right"></i>
                    </a>
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
                    text-align: center;
                  `}"
                >
                  <h1
                    style="${css`
                      font-family: $font-family-serif;
                      font-size: 2rem;
                      font-weight: bold;
                      font-style: italic;
                      background: linear-gradient(
                        135deg,
                        $purple 0%,
                        $pink 100%
                      );
                      background-clip: text;
                      color: transparent;
                    `}"
                  >
                    Welcome to CourseLore!
                  </h1>
                  <p
                    style="${css`
                      color: $text-muted;
                    `}"
                  >
                    Get started by enrolling in an existing course or by
                    creating a new course.
                  </p>
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
                <h1>Courses</h1>

                <div class="list-group">
                  $${res.locals.enrollments.map(
                    (enrollment) =>
                      html`
                        <a
                          href="${app.locals.settings.url}/courses/${enrollment
                            .course.reference}"
                          class="list-group-item list-group-item-action"
                        >
                          <i class="bi bi-journal"></i>
                          ${enrollment.course.name}
                        </a>
                      `
                  )}
                </div>
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
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
              `}"
            >
              <div class="form-floating">
                <input
                  type="text"
                  id="name"
                  name="name"
                  autocomplete="off"
                  required
                  value="${res.locals.user.name}"
                  class="form-control"
                />
                <label for="name">Name</label>
              </div>
              <div
                class="form-floating"
                data-bs-toggle="tooltip"
                title="Your email is your identity in CourseLore and may not be changed."
              >
                <input
                  type="email"
                  id="email"
                  value="${res.locals.user.email}"
                  class="form-control"
                  disabled
                  aria-describedby="email-help"
                />
                <label for="email">Email</label>
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
                  <i class="bi bi-pencil"></i>
                  Update User Settings
                </button>
              </div>
            </form>
          `
        )
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
          <div
            class="alert alert-success alert-dismissible fade show"
            style="${css`
              text-align: center;
              border-radius: 0;
              margin-bottom: 0;
            `}"
            role="alert"
          >
            User settings have been updated successfully.
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
            ></button>
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
              <div
                style="${css`
                  text-align: center;
                `}"
              >
                <h1
                  style="${css`
                    font-family: $font-family-serif;
                    font-size: 2rem;
                    font-weight: bold;
                    font-style: italic;
                    background: linear-gradient(135deg, $purple 0%, $pink 100%);
                    background-clip: text;
                    color: transparent;
                  `}"
                >
                  Welcome to ${res.locals.course.name}!
                </h1>

                <p
                  style="${css`
                    color: $text-muted;
                  `}"
                >
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
                    display: flex;
                    gap: 1rem;
                    @include media-breakpoint-down(md) {
                      flex-direction: column;
                    }
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${app.locals.settings.url}/courses/${res.locals
                            .course.reference}/settings/invitations"
                          class="btn btn-primary"
                          style="${css`
                            flex: 1;
                          `}"
                        >
                          <i class="bi bi-person-plus"></i>
                          Invite Other People to the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${app.locals.settings.url}/courses/${res.locals.course
                      .reference}/threads/new"
                    class="btn btn-outline-primary"
                    style="${css`
                      flex: 1;
                    `}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Create the First Thread
                  </a>
                </div>
              </div>
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

  interface Layouts {
    courseSettings: (
      req: express.Request<
        {},
        any,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals &
          Partial<EventSourceMiddlewareLocals>
      >,
      res: express.Response<
        any,
        IsEnrolledInCourseMiddlewareLocals &
          Partial<EventSourceMiddlewareLocals>
      >,
      head: HTML,
      body: HTML
    ) => HTML;
  }
  app.locals.layouts.courseSettings = (req, res, head, body) =>
    app.locals.layouts.applicationWithHeaderAndSidebar(
      req,
      res,
      head,
      body,
      html`
        <div
          style="${css`
            a {
              text-decoration: none;
              color: inherit;
              display: block;
              transition: $btn-transition;
              line-height: 1.3;
              padding: 0.5rem 1rem;
              &:hover,
              &:active {
                background-color: $purple-700;
              }
            }

            a + a {
              border-top: 1px solid $purple-700;
            }
          `}"
        >
          $${res.locals.enrollment.role === "staff"
            ? html`
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/settings"
                  style="${css`
                    ${req.path.endsWith("/settings")
                      ? css`
                          background-color: $purple-700;
                        `
                      : css``}
                  `}"
                >
                  <i class="bi bi-sliders"></i>
                  Course Settings
                </a>
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/settings/invitations"
                  style="${css`
                    ${req.path.endsWith("/settings/invitations")
                      ? css`
                          background-color: $purple-700;
                        `
                      : css``}
                  `}"
                >
                  <i class="bi bi-person-plus"></i>
                  Invitations
                </a>
                <a
                  href="${app.locals.settings.url}/courses/${res.locals.course
                    .reference}/settings/enrollments"
                  style="${css`
                    ${req.path.endsWith("/settings/enrollments")
                      ? css`
                          background-color: $purple-700;
                        `
                      : css``}
                  `}"
                >
                  <i class="bi bi-people"></i>
                  Enrollments
                </a>
              `
            : html``}
          <a
            href="${app.locals.settings.url}/courses/${res.locals.course
              .reference}/settings/enrollment"
            style="${css`
              ${req.path.endsWith("/settings/enrollment")
                ? css`
                    background-color: $purple-700;
                  `
                : css``}
            `}"
          >
            <i class="bi bi-person"></i>
            Your Enrollment
          </a>
        </div>
      `,
      html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `
    );

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
        app.locals.layouts.courseSettings(
          req,
          res,
          html`
            <title>
              Course Settings · ${res.locals.course.name} · CourseLore
            </title>
          `,
          html`
            <h1>Course Settings</h1>
            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings?_method=PATCH"
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
                  value="${res.locals.course.name}"
                  class="form-control"
                  id="name"
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
                  <i class="bi bi-pencil"></i>
                  Update Course Settings
                </button>
              </div>
            </form>
          `
        )
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
          <div
            class="alert alert-success alert-dismissible fade show"
            style="${css`
              text-align: center;
              border-radius: 0;
              margin-bottom: 0;
            `}"
            role="alert"
          >
            Course settings have been updated successfully.
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
            ></button>
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

  // TODO: There’s no visual indication of ‘used’, which allows you to even try some forbidden operations, such as trying to change the expiration date of an used invitation. Also, the table layout breaks on small screens.
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
        app.locals.layouts.courseSettings(
          req,
          res,
          html`
            <title>
              Invitations · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <h1>Invitations</h1>

            <h6>Create a New Invitation</h6>
            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/invitations"
            >
              <div
                style="${css`
                  display: flex;
                  gap: 1rem;
                  flex-direction: column;
                `}"
              >
                <div
                  class="btn-group"
                  role="group"
                  aria-label="Role"
                  style="${css`
                    & > * {
                      flex: 1;
                    }
                  `}"
                >
                  $${app.locals.constants.roles.map(
                    (role, index) =>
                      html`
                        <input
                          type="radio"
                          class="btn-check"
                          name="role"
                          id="${role}"
                          autocomplete="off"
                          value="${role}"
                          required
                        />
                        <label class="btn btn-outline-primary" for="${role}">
                          ${lodash.capitalize(role)}
                        </label>
                      `
                  )}
                </div>

                <div>
                  <div
                    class="btn-group"
                    role="group"
                    aria-label="Expiration"
                    style="${css`
                      width: 100%;
                      & > * {
                        flex: 1;
                      }
                    `}"
                  >
                    <input
                      type="radio"
                      class="btn-check"
                      name="isExpiresAt"
                      id="isExpiresAt--false"
                      autocomplete="off"
                      required
                      onchange="${javascript`
                        const collapse = document.querySelector("#expiresAt--collapse");
                        if (!collapse.classList.contains("show")) return;
                        new bootstrap.Collapse(collapse).hide();
                        for (const element of collapse.querySelectorAll("*"))
                          if (element.disabled !== undefined) element.disabled = true;
                      `}"
                    />
                    <label
                      class="btn btn-outline-primary"
                      for="isExpiresAt--false"
                    >
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Expire
                    </label>
                    <input
                      type="radio"
                      class="btn-check"
                      name="isExpiresAt"
                      id="isExpiresAt--true"
                      autocomplete="off"
                      required
                      onchange="${javascript`
                        const collapse = document.querySelector("#expiresAt--collapse");
                        new bootstrap.Collapse(collapse).show();
                        for (const element of collapse.querySelectorAll("*"))
                          if (element.disabled !== undefined) element.disabled = false;
                      `}"
                    />
                    <label
                      class="btn btn-outline-primary"
                      for="isExpiresAt--true"
                    >
                      <i class="bi bi-calendar-plus"></i>
                      Expires
                    </label>
                  </div>

                  <div class="collapse" id="expiresAt--collapse">
                    <div
                      style="${css`
                        margin-top: 1rem;
                      `}"
                    >
                      <div class="form-floating">
                        <input
                          type="text"
                          class="form-control datetime"
                          id="expiresAt"
                          name="expiresAt"
                          value="${new Date().toISOString()}"
                          required
                          disabled
                          data-onvalidate="${javascript`
                            if (new Date(this.value).getTime() <= Date.now())
                              return "Must be in the future";
                          `}"
                        />
                        <label for="expiresAt">Expires at</label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    class="btn-group"
                    role="group"
                    aria-label="Type"
                    style="${css`
                      width: 100%;
                      & > * {
                        flex: 1;
                      }
                    `}"
                  >
                    <input
                      type="radio"
                      class="btn-check"
                      name="type"
                      value="link"
                      id="type--link"
                      autocomplete="off"
                      required
                      onchange="${javascript`
                        const collapse = document.querySelector("#type--collapse");
                        if (!collapse.classList.contains("show")) return;
                        new bootstrap.Collapse(collapse).hide();
                        for (const element of collapse.querySelectorAll("*"))
                          if (element.disabled !== undefined) element.disabled = true;
                      `}"
                    />
                    <label class="btn btn-outline-primary" for="type--link">
                      <i class="bi bi-link"></i>
                      Invite with a Link
                    </label>
                    <input
                      type="radio"
                      class="btn-check"
                      name="type"
                      value="email"
                      id="type--email"
                      autocomplete="off"
                      required
                      onchange="${javascript`
                        const collapse = document.querySelector("#type--collapse");
                        new bootstrap.Collapse(collapse).show();
                        for (const element of collapse.querySelectorAll("*"))
                          if (element.disabled !== undefined) element.disabled = false;
                      `}"
                    />
                    <label class="btn btn-outline-primary" for="type--email">
                      <i class="bi bi-envelope"></i>
                      Invite via Email
                    </label>
                  </div>

                  <div class="collapse" id="type--collapse">
                    <div
                      style="${css`
                        margin-top: 1rem;
                        display: grid;
                        & > * {
                          grid-area: 1 / 1;
                        }
                      `}"
                    >
                      <div class="form-floating">
                        <textarea
                          type="text"
                          class="form-control datetime"
                          id="emails"
                          name="emails"
                          value="${new Date().toISOString()}"
                          required
                          disabled
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
                          style="${css`
                            height: 20ex;
                          `}"
                        ></textarea>
                        <label for="emails">Emails</label>
                      </div>
                      <div
                        data-bs-toggle="tooltip"
                        title="Help"
                        style="${css`
                          z-index: $zindex-dropdown;
                          justify-self: end;
                          align-self: start;
                        `}"
                      >
                        <a
                          tabindex="0"
                          class="btn"
                          role="button"
                          data-bs-toggle="popover"
                          data-bs-trigger="focus"
                          data-bs-html="true"
                          data-bs-content="${html`
                            Emails must be separated by commas or newlines, and
                            may include names, for example:
                            <br />
                            <code>${`"Scott" <scott@courselore.org>`}</code>
                          `}"
                          style="${css`
                            color: $text-muted;
                            padding: 0 0.2rem;
                            margin: 0.3rem;
                            &:hover,
                            &:focus {
                              background-color: $gray-100;
                            }
                          `}"
                          onclick="${javascript`
                            bootstrap.Tooltip.getInstance(this.parentElement).hide();
                          `}"
                        >
                          <i class="bi bi-question-circle"></i>
                        </a>
                      </div>
                    </div>
                  </div>
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
                    <i class="bi bi-person-plus"></i>
                    Create Invitation
                  </button>
                </div>
              </div>
            </form>

            $${invitations.length === 0
              ? html``
              : html`
                  <h6
                    style="${css`
                      margin-top: 2rem;
                    `}"
                  >
                    Existing Invitations
                  </h6>

                  <table class="table table-hover table-sm">
                    <thead>
                      <tr>
                        <th>Invitation</th>
                        <th>Role</th>
                        <th
                          style="${css`
                            text-align: right;
                          `}"
                        >
                          Expiration
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      $${invitations.map((invitation) => {
                        const action = `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                        const isExpired = app.locals.helpers.isExpired(
                          invitation.expiresAt
                        );
                        const isUsed = invitation.usedAt !== null;

                        return html`
                          <tr>
                            <td>
                              $${invitation.email === null
                                ? html`
                                    <span
                                      $${isExpired
                                        ? html`
                                            data-bs-toggle="tooltip" title="This
                                            invitation has already expired."
                                          `
                                        : html`
                                            data-bs-toggle="tooltip" title="See
                                            Invitation"
                                          `}
                                    >
                                      <button
                                        type="button"
                                        class="btn"
                                        $${isExpired
                                          ? html`disabled`
                                          : html`
                                              data-bs-toggle="modal"
                                              data-bs-target="#invitation--${invitation.reference}"
                                              onclick="${javascript`
                                                bootstrap.Tooltip.getInstance(this.parentElement).hide();
                                              `}"
                                            `}
                                        style="${css`
                                          padding: 0;
                                        `}"
                                      >
                                        <i class="bi bi-link"></i>
                                        ${"*".repeat(
                                          6
                                        )}${invitation.reference.slice(6)}
                                      </button>
                                    </span>
                                  `
                                : html`
                                    <i class="bi bi-envelope"></i>
                                    ${invitation.name === null
                                      ? invitation.email
                                      : `${invitation.name} <${invitation.email}>`}
                                  `}
                            </td>
                            <td>
                              <div class="dropdown">
                                <button
                                  class="btn dropdown-toggle"
                                  type="button"
                                  id="invitation-role-dropdown--${invitation.reference}"
                                  data-bs-toggle="dropdown"
                                  aria-expanded="false"
                                  style="${css`
                                    padding: 0;
                                  `}"
                                >
                                  ${lodash.capitalize(invitation.role)}
                                </button>
                                <div
                                  class="dropdown-menu"
                                  aria-labelledby="invitation-role-dropdown--${invitation.reference}"
                                >
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
                                            <span
                                              $${isUsed
                                                ? html`
                                                    data-bs-toggle="tooltip"
                                                    title="You may not change
                                                    the role of this invitation
                                                    because it has already been
                                                    used."
                                                  `
                                                : isExpired
                                                ? html`
                                                    data-bs-toggle="tooltip"
                                                    title="You may not change
                                                    the role of this invitation
                                                    because it’s expired."
                                                  `
                                                : html``}
                                            >
                                              <button
                                                type="submit"
                                                class="dropdown-item"
                                                $${isUsed || isExpired
                                                  ? html`disabled`
                                                  : html``}
                                              >
                                                Change Invitation Role to
                                                ${lodash.capitalize(role)}
                                              </button>
                                            </span>
                                          </form>
                                        `
                                  )}
                                </div>
                              </div>
                            </td>
                            <td
                              style="${css`
                                text-align: right;
                              `}"
                            >
                              <div class="dropdown">
                                <button
                                  class="btn dropdown-toggle"
                                  type="button"
                                  id="invitation-expiresAt-dropdown--${invitation.reference}"
                                  data-bs-toggle="dropdown"
                                  data-bs-auto-close="outside"
                                  aria-expanded="false"
                                  style="${css`
                                    padding: 0 0.5rem;
                                    text-transform: capitalize;
                                    ${isExpired
                                      ? css`
                                          color: $red-800;
                                          background-color: $red-100;
                                        `
                                      : invitation.expiresAt !== null
                                      ? css`
                                          color: $orange-800;
                                          background-color: $orange-100;
                                        `
                                      : css`
                                          color: $green-800;
                                          background-color: $green-100;
                                        `};
                                  `}"
                                >
                                  $${isExpired
                                    ? html`
                                        <time
                                          >${new Date(
                                            invitation.expiresAt!
                                          ).toISOString()}</time
                                        >
                                      `
                                    : invitation.expiresAt !== null
                                    ? html`
                                        <time
                                          >${new Date(
                                            invitation.expiresAt!
                                          ).toISOString()}</time
                                        >
                                      `
                                    : html`Doesn’t Expire`}
                                </button>
                                <div
                                  class="dropdown-menu"
                                  aria-labelledby="invitation-expiresAt-dropdown--${invitation.reference}"
                                >
                                  <form
                                    method="POST"
                                    action="${action}?_method=PATCH"
                                    style="${css`
                                      padding: 0 1rem;
                                      display: flex;
                                      flex-direction: column;
                                      gap: 0.5rem;
                                    `}"
                                  >
                                    <div class="form-floating">
                                      <input
                                        type="text"
                                        class="form-control datetime"
                                        id="expiresAt"
                                        name="expiresAt"
                                        value="${new Date(
                                          invitation.expiresAt ?? new Date()
                                        ).toISOString()}"
                                        required
                                        data-onvalidate="${javascript`
                                          if (new Date(this.value).getTime() <= Date.now())
                                            return "Must be in the future";
                                        `}"
                                      />
                                      <label for="expiresAt">Expires at</label>
                                    </div>
                                    <button
                                      type="submit"
                                      class="btn btn-outline-secondary"
                                    >
                                      <i class="bi bi-pencil"></i>
                                      Update Expiration Date
                                    </button>
                                  </form>
                                  <hr class="dropdown-divider" />
                                  $${invitation.expiresAt === null
                                    ? html``
                                    : html`
                                        <form
                                          method="POST"
                                          action="${action}?_method=PATCH"
                                        >
                                          <input
                                            type="hidden"
                                            name="doesntExpire"
                                            value="true"
                                          />
                                          <button
                                            type="submit"
                                            class="dropdown-item"
                                          >
                                            <i class="bi bi-calendar-minus"></i>
                                            Set Invitation as Non-Expiring
                                          </button>
                                        </form>
                                      `}
                                  $${isExpired
                                    ? html``
                                    : html`
                                        <form
                                          method="POST"
                                          action="${action}?_method=PATCH"
                                        >
                                          <input
                                            type="hidden"
                                            name="expireNow"
                                            value="true"
                                          />
                                          <button
                                            type="submit"
                                            class="dropdown-item"
                                          >
                                            <i class="bi bi-calendar-plus"></i>
                                            Expire Invitation Now
                                          </button>
                                        </form>
                                      `}
                                </div>
                              </div>
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>

                  $${await Promise.all(
                    invitations.map(async (invitation) => {
                      const link = `${app.locals.settings.url}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;

                      return html`
                        <div
                          class="modal fade"
                          id="invitation--${invitation.reference}"
                          tabindex="-1"
                          aria-labelledby="invitation--${invitation.reference}--label"
                          aria-hidden="true"
                        >
                          <div class="modal-dialog modal-fullscreen">
                            <div class="modal-content">
                              <div class="modal-header">
                                <h5
                                  class="modal-title"
                                  id="invitation--${invitation.reference}--label"
                                >
                                  Enroll in ${res.locals.course.name} as
                                  ${invitation.role}
                                </h5>
                                <button
                                  type="button"
                                  class="btn-close"
                                  data-bs-dismiss="modal"
                                  aria-label="Close"
                                ></button>
                              </div>
                              <div
                                class="modal-body"
                                style="${css`
                                  max-width: 70ch;
                                  display: flex;
                                  flex-direction: column;
                                  gap: 5rem;
                                  margin: 0 auto;
                                  text-align: center;
                                `}"
                              >
                                <div class="input-group">
                                  <input
                                    type="text"
                                    class="form-control"
                                    readonly
                                    value="${link}"
                                    style="${css`
                                      user-select: all;
                                    `}"
                                    id="invitation--${invitation.reference}--link"
                                  />
                                  <button
                                    class="btn btn-outline-primary"
                                    type="button"
                                    data-bs-toggle="tooltip"
                                    title="Copy"
                                    onclick="${javascript`
                                      document.querySelector("#invitation--${invitation.reference}--link").select();
                                      document.execCommand("copy");
                                      this.dataset.bsOriginalTitle = "Copied";
                                      bootstrap.Tooltip.getInstance(this).show();
                                      this.dataset.bsOriginalTitle = "Copy";
                                    `}"
                                  >
                                    <i class="bi bi-clipboard"></i>
                                  </button>
                                </div>

                                <div>
                                  <div><strong>QR Code</strong></div>
                                  <div
                                    style="${css`
                                      color: $text-muted;
                                    `}"
                                  >
                                    People may point their phone camera at the
                                    image below to follow the invitation link.
                                  </div>
                                  <div>
                                    $${(
                                      await QRCode.toString(link, {
                                        type: "svg",
                                      })
                                    )
                                      .replace("#000000", "url('#gradient')")
                                      .replace("#ffffff", "#00000000")}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      `;
                    })
                  )}
                `}
          `
        )
      );
    })
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      role?: Role;
      expiresAt?: string;
      type?: "link" | "email";
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
              <div
                class="alert alert-success alert-dismissible fade show"
                style="${css`
                  text-align: center;
                  border-radius: 0;
                  margin-bottom: 0;
                `}"
                role="alert"
              >
                Invitation created successfully.
                <a
                  role="button"
                  class="link-success"
                  data-bs-toggle="modal"
                  data-bs-target="#invitation--${invitationReference}"
                  >See invitation</a
                >.
                <button
                  type="button"
                  class="btn-close"
                  data-bs-dismiss="alert"
                  aria-label="Close"
                ></button>
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
              <div
                class="alert alert-success alert-dismissible fade show"
                style="${css`
                  text-align: center;
                  border-radius: 0;
                  margin-bottom: 0;
                `}"
                role="alert"
              >
                Invitations sent successfully.
                <button
                  type="button"
                  class="btn-close"
                  data-bs-dismiss="alert"
                  aria-label="Close"
                ></button>
              </div>
              $${app.locals.settings.demonstration
                ? html`
                    <div
                      role="alert"
                      class="alert alert-danger alert-dismissible fade show"
                      style="${css`
                        text-align: center;
                        border-radius: 0;
                        margin-bottom: 0;
                      `}"
                    >
                      <span>
                        CourseLore doesn’t send emails in demonstration mode.
                      </span>
                      <a
                        href="${app.locals.settings.url}/demonstration-inbox"
                        class="link-danger"
                      >
                        Go to the Demonstration Inbox </a
                      >.
                      <button
                        type="button"
                        class="btn-close"
                        data-bs-dismiss="alert"
                        aria-label="Close"
                      ></button>
                    </div>
                  `
                : html``}
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
      doesntExpire?: "true";
      expireNow?: "true";
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Invitation email resent successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Invitation role updated successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Invitation expiration updated successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
            </div>
          `
        );
      }

      if (req.body.doesntExpire === "true") {
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Invitation set as non-expiring successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
            </div>
          `
        );
      }

      if (req.body.expireNow === "true") {
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Invitation expired successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
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
          ORDER BY "enrollments"."id" DESC
        `
      );

      res.send(
        app.locals.layouts.courseSettings(
          req,
          res,
          html`
            <title>
              Enrollments · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <h1>Enrollments</h1>

            <table class="table table-hover table-sm">
              <tbody>
                $${enrollments.map((enrollment) => {
                  const action = `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
                  const isSelf = enrollment.id === res.locals.enrollment.id;
                  const isOnlyStaff =
                    isSelf &&
                    enrollments.filter(
                      (enrollment) => enrollment.role === "staff"
                    ).length === 1;

                  return html`
                    <tr>
                      <td
                        style="${css`
                          font-weight: bold;
                        `}"
                      >
                        ${enrollment.userName}
                      </td>
                      <td
                        style="${css`
                          color: $text-muted;
                        `}"
                      >
                        ${enrollment.userEmail}
                      </td>
                      <td>
                        <div class="dropdown">
                          <button
                            class="btn dropdown-toggle"
                            type="button"
                            id="enrollment-role-dropdown--${enrollment.reference}"
                            data-bs-toggle="dropdown"
                            aria-expanded="false"
                            style="${css`
                              padding: 0;
                            `}"
                          >
                            ${lodash.capitalize(enrollment.role)}
                          </button>
                          <div
                            class="dropdown-menu"
                            aria-labelledby="enrollment-role-dropdown--${enrollment.reference}"
                          >
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
                                      <span
                                        $${isOnlyStaff
                                          ? html`
                                              data-bs-toggle="tooltip"
                                              title="You may not convert
                                              yourself into ${role} because
                                              you’re the only staff member."
                                            `
                                          : html``}
                                      >
                                        <button
                                          type="submit"
                                          class="dropdown-item"
                                          $${isOnlyStaff
                                            ? html`disabled`
                                            : isSelf
                                            ? html`
                                                onclick="${javascript`
                                                  if (!confirm("Convert yourself into ${role}?\\n\\nYou may not undo this action!"))
                                                    event.preventDefault();
                                                `}"
                                              `
                                            : html``}
                                        >
                                          Convert to ${lodash.capitalize(role)}
                                        </button>
                                      </span>
                                    </form>
                                  `
                            )}
                          </div>
                        </div>
                      </td>
                      <td
                        style="${css`
                          text-align: right;
                        `}"
                      >
                        <form method="POST" action="${action}?_method=DELETE">
                          <span
                            data-bs-toggle="tooltip"
                            data-bs-placement="left"
                            title="$${isOnlyStaff
                              ? `You may not remove yourself from the course because you’re the only staff member.`
                              : `Remove from the course`}"
                          >
                            <button
                              type="submit"
                              class="btn btn-outline-danger"
                              style="${css`
                                padding: 0 0.2rem;
                                border: 0;
                              `}"
                              $${isOnlyStaff
                                ? html`disabled`
                                : html`
                                    onclick="${javascript`
                                      if (!confirm("Remove ${
                                        isSelf
                                          ? `yourself`
                                          : `${enrollment.userName} <${enrollment.userEmail}>`
                                      } from ${res.locals.course.name}?\\n\\nYou may not undo this action!"))
                                        event.preventDefault();
                                    `}"
                                  `}
                            >
                              <i class="bi bi-person-dash"></i>
                            </button>
                          </span>
                        </form>
                      </td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>
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
            <div
              class="alert alert-success alert-dismissible fade show"
              style="${css`
                text-align: center;
                border-radius: 0;
                margin-bottom: 0;
              `}"
              role="alert"
            >
              Enrollment has been updated successfully.
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert"
                aria-label="Close"
              ></button>
            </div>
          `
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

      app.locals.helpers.flash.set(
        req,
        res,
        html`
          <div
            class="alert alert-success alert-dismissible fade show"
            style="${css`
              text-align: center;
              border-radius: 0;
              margin-bottom: 0;
            `}"
            role="alert"
          >
            The person has been removed from the course successfully.
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
            ></button>
          </div>
        `
      );

      if (res.locals.managedEnrollment.id === res.locals.enrollment.id)
        return res.redirect(`${app.locals.settings.url}/`);
      res.redirect(
        `${app.locals.settings.url}/courses/${res.locals.course.reference}/settings/enrollments`
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
        app.locals.layouts.courseSettings(
          req,
          res,
          html`
            <title>
              Your Enrollment · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          html`
            <h1>Your Enrollment</h1>
            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.course
                .reference}/settings/enrollment?_method=PATCH"
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
              `}"
            >
              <div>
                <div>
                  <strong>Accent Color</strong>
                  <span data-bs-toggle="tooltip" title="Help">
                    <a
                      tabindex="0"
                      class="btn"
                      role="button"
                      data-bs-toggle="popover"
                      data-bs-trigger="focus"
                      data-bs-content="${html`
                        The accent color helps you tell your courses apart.
                      `}"
                      style="${css`
                        color: $text-muted;
                        padding: 0 0.2rem;
                        &:hover,
                        &:focus {
                          background-color: $gray-100;
                        }
                      `}"
                      onclick="${javascript`
                        bootstrap.Tooltip.getInstance(this.parentElement).hide();
                      `}"
                    >
                      <i class="bi bi-question-circle"></i>
                    </a>
                  </span>
                </div>
                <div
                  class="btn-group"
                  role="group"
                  aria-label="Accent colors"
                  style="${css`
                    padding: 1px;
                    max-width: 100%;
                    overflow: auto;
                  `}"
                >
                  $${app.locals.constants.accentColors.map(
                    (accentColor) => html`
                      <input
                        type="radio"
                        class="btn-check"
                        name="accentColor"
                        id="accentColor--${accentColor.slice(1)}"
                        autocomplete="off"
                        $${accentColor === res.locals.enrollment.accentColor
                          ? html`checked`
                          : html``}
                        value="${accentColor}"
                      />
                      <label
                        class="btn btn-outline-primary"
                        for="accentColor--${accentColor.slice(1)}"
                      >
                        <span
                          class="badge rounded-pill"
                          style="${css`
                            color: ${accentColor};
                            background-color: white;
                          `}"
                        >
                          <i class="bi bi-palette-fill"></i>
                        </span>
                      </label>
                    `
                  )}
                </div>
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
                  <i class="bi bi-pencil"></i>
                  Update Your Enrollment
                </button>
              </div>
            </form>
          `
        )
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
          <div
            class="alert alert-success alert-dismissible fade show"
            style="${css`
              text-align: center;
              border-radius: 0;
              margin-bottom: 0;
            `}"
            role="alert"
          >
            Your enrollment has been updated successfully.
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="alert"
              aria-label="Close"
            ></button>
          </div>
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
        app.locals.layouts.box(
          req,
          res,
          html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          html`
            <p>
              You tried to use an invitation for ${res.locals.course.name} but
              you’re already enrolled.
            </p>

            <p>
              <a
                href="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}"
                class="btn btn-primary"
                style="${css`
                  width: 100%;
                `}"
              >
                Go to ${res.locals.course.name}
                <i class="bi bi-chevron-right"></i>
              </a>
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
    ...app.locals.middlewares.isAuthenticated,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.box(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          html`
            <h6
              style="${css`
                text-align: center;
              `}"
            >
              Welcome to ${res.locals.invitation.course.name}!
            </h6>

            <form
              method="POST"
              action="${app.locals.settings.url}/courses/${res.locals.invitation
                .course.reference}/invitations/${res.locals.invitation
                .reference}"
            >
              <button
                type="submit"
                class="btn btn-primary"
                style="${css`
                  width: 100%;
                `}"
              >
                <i class="bi bi-journal-plus"></i>
                Enroll as ${lodash.capitalize(res.locals.invitation.role)}
              </button>
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
        app.locals.layouts.box(
          req,
          res,
          html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          html`
            <h6
              style="${css`
                text-align: center;
              `}"
            >
              Welcome to ${res.locals.invitation.course.name}!
            </h6>

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
              class="btn btn-primary"
              style="${css`
                width: 100%;
              `}"
            >
              Authenticate
              <i class="bi bi-chevron-right"></i>
            </a>
          `
        )
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
    app.locals.layouts.applicationWithHeaderAndSidebar(
      req,
      res,
      head,
      body,
      html`
        <div
          style="${css`
            padding: 1rem;
            text-align: center;
          `}"
        >
          <a
            href="${app.locals.settings.url}/courses/${res.locals.course
              .reference}/threads/new"
            class="btn btn-outline-light"
          >
            <i class="bi bi-chat-left-text"></i>
            Create a New Thread
          </a>
        </div>
        <div id="threads">
          $${res.locals.threads.map(
            (thread) => html`
              <a
                href="${app.locals.settings.url}/courses/${res.locals.course
                  .reference}/threads/${thread.reference}"
                style="${css`
                  text-decoration: none;
                  color: inherit;
                  display: block;
                  border-top: 1px solid $purple-700;
                  transition: $btn-transition;
                  line-height: 1.3;
                  padding: 0.5rem 1rem;
                  &:hover,
                  &:active {
                    background-color: $purple-700;
                  }
                  ${thread.id === res.locals.thread?.id
                    ? css`
                        background-color: $purple-700;
                      `
                    : css``}
                `}"
              >
                <div>${thread.title}</div>
                <div
                  style="${css`
                    color: $purple-100;
                    font-size: $small-font-size;
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
                  <div
                    style="${css`
                      display: flex;
                      gap: 0.5rem;
                      align-items: baseline;
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
                            <i class="bi bi-question-diamond"></i>
                            Question
                          </div>
                        `
                      : html``}
                    <div>
                      <i class="bi bi-chat-left"></i>
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
        </div>
        <script>
          (() => {
            const id = document.currentScript.previousElementSibling.id;
            eventSource.addEventListener("refreshed", (event) => {
              document
                .querySelector("#" + id)
                .replaceWith(event.detail.document.querySelector("#" + id));
            });
          })();
        </script>
      `,
      html`
        <i class="bi bi-chat-left-text"></i>
        Threads
      `
    );

  interface Partials {
    textEditor: (id: string, value?: string) => HTML;
  }
  app.locals.partials.textEditor = (id, value = ""): HTML => html`
    <div>
      <div
        style="${css`
          background-color: $gray-100;
          padding-top: 0.5rem;
          border: $nav-tabs-border-width solid $nav-tabs-border-color;
          border-bottom: none;
          border-top-left-radius: $nav-tabs-border-radius;
          border-top-right-radius: $nav-tabs-border-radius;
        `}"
      >
        <ul
          class="nav nav-tabs"
          id="myTab"
          role="tablist"
          style="${css`
            padding: 0 0.5rem;
          `}"
        >
          <li class="nav-item" role="presentation">
            <button
              class="nav-link active"
              id="text-editor-${id}-write-tab"
              data-bs-toggle="tab"
              data-bs-target="#text-editor-${id}-write"
              type="button"
              role="tab"
              aria-controls="text-editor-${id}-write"
              aria-selected="true"
            >
              <i class="bi bi-pencil"></i>
              Write
            </button>
          </li>
          <li class="nav-item" role="presentation">
            <button
              class="nav-link"
              id="text-editor-${id}-preview-tab"
              data-bs-target="#text-editor-${id}-preview"
              type="button"
              role="tab"
              aria-controls="text-editor-${id}-preview"
              aria-selected="false"
              onclick="${javascript`
                (async () => {
                  const write = document.querySelector("#text-editor-${id}-write");
                  const preview = document.querySelector("#text-editor-${id}-preview");
                  if (!isValid(write)) return;
                  loading(preview);
                  new bootstrap.Tab(this).show();
                  preview.innerHTML = await (
                    await fetch("${app.locals.settings.url}/preview", {
                      method: "POST",
                      body: new URLSearchParams({ content: write.querySelector("textarea").value }),
                    })
                  ).text();
                })();
              `}"
            >
              <i class="bi bi-eyeglasses"></i>
              Preview
            </button>
          </li>
        </ul>
      </div>
      <div
        class="tab-content"
        style="${css`
          border: $nav-tabs-border-width solid $nav-tabs-border-color;
          border-top: none;
          border-bottom-right-radius: $nav-tabs-border-radius;
          border-bottom-left-radius: $nav-tabs-border-radius;
        `}"
      >
        <div
          class="tab-pane fade show active"
          id="text-editor-${id}-write"
          role="tabpanel"
          aria-labelledby="text-editor-${id}-write-tab"
        >
          <textarea
            class="form-control"
            name="content"
            required
            style="${css`
              border: none;
              box-shadow: none;
            `}"
            onkeydown="${javascript`
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                event.preventDefault();
                this.closest("form").querySelector('button:not([type="button"])').click();
              }
            `}"
          >
${value}</textarea
          >
        </div>
        <div
          class="tab-pane fade"
          id="text-editor-${id}-preview"
          role="tabpanel"
          aria-labelledby="text-editor-${id}-preview-tab"
          style="${css`
            padding: 1rem;
          `}"
        ></div>
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
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
              `}"
            >
              <div class="form-floating">
                <input
                  type="text"
                  name="title"
                  autocomplete="off"
                  required
                  autofocus
                  class="form-control"
                  id="title"
                  placeholder="Title…"
                />
                <label for="title">Title</label>
              </div>
              <div
                style="${css`
                  display: flex;
                  gap: 2rem;
                `}"
              >
                $${res.locals.enrollment.role === "staff"
                  ? html`
                      <div
                        class="form-check form-switch"
                        data-bs-toggle="tooltip"
                        title="Pinned threads are listed first"
                      >
                        <input
                          class="form-check-input"
                          type="checkbox"
                          id="pin"
                          name="isPinned"
                        />
                        <label class="form-check-label" for="pin">
                          <i class="bi bi-pin-angle"></i>
                          Pin
                        </label>
                      </div>
                    `
                  : html``}

                <div class="form-check form-switch">
                  <input
                    class="form-check-input"
                    type="checkbox"
                    id="question"
                    name="isQuestion"
                    $${res.locals.enrollment.role === "staff" ? `` : `checked`}
                  />
                  <label class="form-check-label" for="question">
                    <i class="bi bi-patch-question"></i>
                    Question
                  </label>
                </div>
              </div>
              $${app.locals.partials.textEditor("new")}
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
                  <i class="bi bi-chat-left-text"></i>
                  Create Thread
                </button>
              </div>
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
                    justify-content: space-between;
                    align-items: baseline;
                    gap: 1rem;
                  `}"
                >
                  <h1>
                    ${res.locals.thread.title}

                    <a
                      href="${app.locals.settings.url}/courses/${res.locals
                        .course.reference}/threads/${res.locals.thread
                        .reference}"
                      class="secondary"
                      >#${res.locals.thread.reference}</a
                    >
                  </h1>

                  <div>
                    <div
                      class="btn-group btn-group-sm"
                      role="group"
                      aria-label="Thread Actions"
                    >
                      $${res.locals.enrollment.role === "staff"
                        ? html`
                            <form
                              method="POST"
                              action="${app.locals.settings.url}/courses/${res
                                .locals.course.reference}/threads/${res.locals
                                .thread.reference}?_method=DELETE"
                              class="btn btn-outline-primary"
                              style="${css`
                                padding: 0;
                              `}"
                            >
                              <button
                                data-bs-toggle="tooltip"
                                title="Remove Thread"
                                class="btn btn-sm"
                                style="${css`
                                  color: inherit;
                                `}"
                                onclick="${javascript`
                                if (!confirm("Remove thread?\\n\\nYou may not undo this action!"))
                                  event.preventDefault();
                              `}"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                            </form>
                          `
                        : html``}
                      $${app.locals.helpers.mayEditThread(req, res)
                        ? html`
                            <button
                              data-bs-toggle="tooltip"
                              title="Edit Title"
                              type="button"
                              class="btn btn-outline-primary"
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
                          `
                        : html``}
                    </div>
                  </div>
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
                                    if (!confirm("Remove post?\\n\\nYou may not undo this action!"))
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
                            $${app.locals.partials.textEditor(
                              post.reference,
                              post.content
                            )}
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
              style="${css`
                display: flex;
                flex-direction: column;
                gap: 1rem;
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

              $${app.locals.partials.textEditor("new")}
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
                  <i class="bi bi-chat-left-text"></i>
                  Post
                </button>
              </div>
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>404 Not Found · CourseLore</title>`,
          html`
            <h1>404 Not Found</h1>

            <p>
              If you think there should be something here, please contact the
              course staff or the
              <a href="${app.locals.settings.administrator}" class="link-light"
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
        app.locals.layouts.box(
          req,
          res,
          html`<title>404 Not Found · CourseLore</title>`,
          html`
            <h1>404 Not Found</h1>

            <p>
              You may have to
              <a
                href="${app.locals.settings.url}/authenticate?${qs.stringify({
                  redirect: req.originalUrl,
                })}"
                class="link-light"
                >authenticate</a
              >
              to see this page.
            </p>
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
      app.locals.layouts.box(
        req,
        res,
        html`<title>${message} Error · CourseLore</title>`,
        html`
          <h1>${message} Error</h1>

          <p>
            This is an issue in CourseLore; please report to
            <a href="mailto:issues@courselore.org" class="link-light"
              >issues@courselore.org</a
            >.
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
