#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import assert from "node:assert/strict";

import express from "express";

import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";

import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import dedent from "dedent";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema as rehypeSanitizeDefaultSchema,
} from "rehype-sanitize";
import deepMerge from "deepmerge";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@leafac/rehype-shiki";
import * as shiki from "shiki";
import { visit as unistUtilVisit } from "unist-util-visit";
import rehypeStringify from "rehype-stringify";
import { JSDOM } from "jsdom";

import fs from "fs-extra";
import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import sharp from "sharp";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import filenamify from "filenamify";
import escapeStringRegexp from "escape-string-regexp";
import QRCode from "qrcode";
import casual from "casual";

import createDatabase from "./database.js";
import logging from "./logging.js";
import globalMiddleware, {
  userFileExtensionsWhichMayBeShownInBrowser,
  BaseMiddlewareLocals,
} from "./global-middleware.js";
import eventSource, { EventSourceMiddlewareLocals } from "./event-source.js";
import layouts from "./layouts.js";
import user, {
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotifications,
  userEmailNotificationses,
} from "./user.js";
import course, {
  EnrollmentRole,
  enrollmentRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  ConversationType,
  conversationTypes,
  enrollmentRoleIcon,
  conversationTypeIcon,
  conversationTypeTextColor,
} from "./course.js";
import authentication from "./authentication.js";
import about from "./about.js";

const FEATURE_PAGINATION = true;

export default async function courselore({
  dataDirectory,
  baseURL,
  administratorEmail,
  sendMail,
  demonstration = process.env.NODE_ENV !== "production",
  hotReload = false,
}: {
  dataDirectory: string;
  baseURL: string;
  administratorEmail: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  hotReload?: boolean;
}): Promise<express.Express> {
  const canonicalBaseURL = "https://courselore.org";
  const app = express();
  const database = await createDatabase({ app, dataDirectory, baseURL });
  logging({ app, baseURL, courseloreVersion });
  const { cookieOptions } = globalMiddleware({
    app,
    dataDirectory,
    baseURL,
    hotReload,
  });
  const { eventSourceMiddleware } = eventSource();
  const {
    baseLayout,
    boxLayout,
    applicationLayout,
    mainLayout,
    settingsLayout,
    logo,
    partialLayout,
    spinner,
    reportIssueHref,
    Flash,
  } = await layouts({
    baseURL,
    administratorEmail,
    demonstration,
    hotReload,
    courseloreVersion,
    database,
    cookieOptions,
  });
  const {} = authentication({ database, cookieOptions });
  const { userPartial } = user();
  const { coursePartial } = course();
  const { aboutRequestHandler } = about({ baseURL, baseLayout });

  return app;
}

export const courseloreVersion = JSON.parse(
  await fs.readFile(
    url.fileURLToPath(new URL("../package.json", import.meta.url)),
    "utf8"
  )
).version;

if (import.meta.url.endsWith(process.argv[1]))
  await (
    await import(
      process.argv[2] === undefined
        ? url.fileURLToPath(
            new URL("../configuration/development.mjs", import.meta.url)
          )
        : path.resolve(process.argv[2])
    )
  ).default({
    courselore,
    courseloreImport: async (modulePath: string) => await import(modulePath),
    courseloreImportMetaURL: import.meta.url,
    courseloreVersion,
    userFileExtensionsWhichMayBeShownInBrowser,
  });
