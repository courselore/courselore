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

import database, { DatabaseLocals } from "./database.js";
import logging from "./logging.js";
import globalMiddlewares, {
  GlobalMiddlewaresOptions,
} from "./global-middlewares.js";
export {
  BaseMiddlewareLocals,
  userFileExtensionsWhichMayBeShownInBrowser,
} from "./global-middlewares.js";
import eventSource, {
  EventSourceLocals,
  EventSourceMiddleware,
} from "./event-source.js";
export { EventSourceMiddlewareLocals } from "./event-source.js";
import layouts, {
  BaseLayout,
  BoxLayout,
  ApplicationLayout,
  MainLayout,
  SettingsLayout,
  LogoPartial,
  PartialLayout,
  SpinnerPartial,
  ReportIssueHrefPartial,
  FlashHelper,
} from "./layouts.js";
import authentication, {
  SessionHelper,
  IsSignedOutMiddleware,
  IsSignedInMiddleware,
  SignInHandler,
  PasswordResetHelper,
  AuthenticationOptions,
  EmailConfirmationMailer,
} from "./authentication.js";
export {
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./authentication.js";
import about, { AboutHandler } from "./about.js";
import user, { UserPartial, UserSettingsLayout } from "./user.js";
export {
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotifications,
  userEmailNotificationses,
} from "./user.js";
import course, { EnrollmentRoleIconPartial, CoursePartial } from "./course.js";
export {
  EnrollmentRole,
  enrollmentRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  enrollmentRoleIcon,
  IsEnrolledInCourseMiddlewareLocals,
  AuthorEnrollment,
  AuthorEnrollmentUser,
} from "./course.js";

export {
  ConversationType,
  conversationTypes,
  conversationTypeIcon,
  conversationTypeTextColor,
} from "./conversation.js";

import error from "./error.js";

export interface Courselore extends express.Express {
  locals: {
    options: {
      version: string;
      canonicalBaseURL: string;
    } & Required<Options> &
      GlobalMiddlewaresOptions &
      AuthenticationOptions;
    handlers: {
      about: AboutHandler;
      signIn: SignInHandler;
    };
    middlewares: {
      eventSource: EventSourceMiddleware;
      isSignedOut: IsSignedOutMiddleware;
      isSignedIn: IsSignedInMiddleware;
    };
    layouts: {
      base: BaseLayout;
      box: BoxLayout;
      application: ApplicationLayout;
      main: MainLayout;
      settings: SettingsLayout;
      partial: PartialLayout;
      userSettings: UserSettingsLayout;
    };
    partials: {
      logo: LogoPartial;
      spinner: SpinnerPartial;
      reportIssueHref: ReportIssueHrefPartial;
      user: UserPartial;
      enrollmentRoleIcon: EnrollmentRoleIconPartial;
      course: CoursePartial;
      content: any; // TODO
      contentEditor: any; // TODO
    };
    helpers: {
      Flash: FlashHelper;
      Session: SessionHelper;
      PasswordReset: PasswordResetHelper;
      emailRegExp: any; // TODO
    };
    mailers: {
      emailConfirmation: EmailConfirmationMailer;
    };
    workers: {
      sendEmail: any; // TODO
    };
  } & DatabaseLocals &
    EventSourceLocals;
}

export interface Options {
  dataDirectory: string;
  baseURL: string;
  administratorEmail: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  hotReload?: boolean;
}

export default async function courselore(
  options: Options
): Promise<Courselore> {
  const app = express() as Courselore;
  app.locals.options = Object.assign<any, any>(
    {
      version: JSON.parse(
        await fs.readFile(
          url.fileURLToPath(new URL("../package.json", import.meta.url)),
          "utf8"
        )
      ).version,
      canonicalBaseURL: "https://courselore.org",
      demonstration: process.env.NODE_ENV !== "production",
      hotReload: false,
    },
    options
  );
  await database(app);
  logging(app);
  globalMiddlewares(app);
  eventSource(app);
  await layouts(app);
  // TODO: Fix mutual dependency between ‘authentication’ and ‘about’
  authentication(app);
  about(app);
  user(app);
  course(app);
  conversation(app);
  error(app);
  content(app);
  email(app);
  demonstration(app);
  helpers(app);
  return app;
}

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
    courseloreImport: async (modulePath: string) => await import(modulePath),
    courseloreImportMetaURL: import.meta.url,
  });
