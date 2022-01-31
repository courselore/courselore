#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import crypto from "node:crypto";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";

import { Database, sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { CSS, localCSS, globalCSS, processCSS, css } from "@leafac/css";
import { HTMLForJavaScript, javascript } from "@leafac/javascript";
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

export default async function courselore({
  dataDirectory,
  baseURL,
  administratorEmail,
  sendMail,
  demonstration = process.env.NODE_ENV !== "production",
  liveReload = false,
}: {
  dataDirectory: string;
  baseURL: string;
  administratorEmail: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  liveReload?: boolean;
}): Promise<express.Express> {
  await fs.ensureDir(dataDirectory);

  const app = express();

  type UserAvatarlessBackgroundColor =
    typeof userAvatarlessBackgroundColors[number];
  const userAvatarlessBackgroundColors = [
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
  ] as const;

  type UserEmailNotifications = typeof userEmailNotificationses[number];
  const userEmailNotificationses = [
    "all-messages",
    "staff-announcements-and-mentions",
    "none",
  ] as const;

  type EnrollmentRole = typeof enrollmentRoles[number];
  const enrollmentRoles = ["student", "staff"] as const;

  type EnrollmentAccentColor = typeof enrollmentAccentColors[number];
  const enrollmentAccentColors = [
    "red",
    "yellow",
    "emerald",
    "sky",
    "violet",
    "pink",
  ] as const;

  type ConversationType = typeof conversationTypes[number];
  const conversationTypes = [
    "announcement",
    "question",
    "note",
    "chat",
  ] as const;

  const database = new Database(
    path.join(dataDirectory, "courselore.db"),
    process.env.LOG_DATABASE === "true" ? { verbose: console.log } : undefined
  );
  database.pragma("journal_mode = WAL");
  database.migrate(
    sql`
      CREATE TABLE "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "content" TEXT NOT NULL
      );
      CREATE INDEX "flashesCreatedAtIndex" ON "flashes" (datetime("createdAt"));

      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "lastSeenOnlineAt" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
        "password" TEXT NOT NULL,
        "emailConfirmedAt" TEXT NULL,
        "name" TEXT NOT NULL,
        "nameSearch" TEXT NOT NULL,
        "avatar" TEXT NULL,
        "avatarlessBackgroundColor" TEXT NOT NULL,
        "biographySource" TEXT NULL,
        "biographyPreprocessed" TEXT NULL,
        "emailNotifications" TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE "usersNameSearchIndex" USING fts5(
        content = "users",
        content_rowid = "id",
        "nameSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "usersNameSearchIndexInsert" AFTER INSERT ON "users" BEGIN
        INSERT INTO "usersNameSearchIndex" ("rowid", "nameSearch") VALUES ("new"."id", "new"."nameSearch");
      END;
      CREATE TRIGGER "usersNameSearchIndexUpdate" AFTER UPDATE ON "users" BEGIN
        INSERT INTO "usersNameSearchIndex" ("usersNameSearchIndex", "rowid", "nameSearch") VALUES ('delete', "old"."id", "old"."nameSearch");
        INSERT INTO "usersNameSearchIndex" ("rowid", "nameSearch") VALUES ("new"."id", "new"."nameSearch");
      END;
      CREATE TRIGGER "usersNameSearchIndexDelete" AFTER DELETE ON "users" BEGIN
        INSERT INTO "usersNameSearchIndex" ("usersNameSearchIndex", "rowid", "nameSearch") VALUES ('delete', "old"."id", "old"."nameSearch");
      END;

      CREATE TABLE "emailConfirmations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "emailConfirmationsCreatedAtIndex" ON "emailConfirmations" (datetime("createdAt"));

      CREATE TABLE "passwordResets" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "passwordResetsCreatedAtIndex" ON "passwordResets" (datetime("createdAt"));

      CREATE TABLE "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "sessionsCreatedAtIndex" ON "sessions" (datetime("createdAt"));

      CREATE TABLE "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "reference" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "year" TEXT NULL,
        "term" TEXT NULL,
        "institution" TEXT NULL,
        "code" TEXT NULL,
        "nextConversationReference" INTEGER NOT NULL
      );

      CREATE TABLE "invitations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "expiresAt" TEXT NULL,
        "usedAt" TEXT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "email" TEXT NULL,
        "name" TEXT NULL,
        "role" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "invitationsCourseIndex" ON "invitations" ("course");
      CREATE INDEX "invitationsEmailIndex" ON "invitations" ("email");

      CREATE TABLE "enrollments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "accentColor" TEXT NOT NULL,
        UNIQUE ("user", "course"),
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "enrollmentsUserIndex" ON "enrollments" ("user");
      CREATE INDEX "enrollmentsCourseIndex" ON "enrollments" ("course");

      CREATE TABLE "tags" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "staffOnlyAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "tagsCourseIndex" ON "tags" ("course");

      CREATE TABLE "conversations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "anonymousAt" TEXT NULL,
        "type" TEXT NOT NULL,
        "pinnedAt" TEXT NULL,
        "staffOnlyAt" TEXT NULL,
        "title" TEXT NOT NULL,
        "titleSearch" TEXT NOT NULL,
        "nextMessageReference" INTEGER NOT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "conversationsCourseIndex" ON "conversations" ("course");
      CREATE VIRTUAL TABLE "conversationsReferenceIndex" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "reference",
        tokenize = 'porter'
      );
      CREATE TRIGGER "conversationsReferenceIndexInsert" AFTER INSERT ON "conversations" BEGIN
        INSERT INTO "conversationsReferenceIndex" ("rowid", "reference") VALUES ("new"."id", "new"."reference");
      END;
      CREATE TRIGGER "conversationsReferenceIndexUpdate" AFTER UPDATE ON "conversations" BEGIN
        INSERT INTO "conversationsReferenceIndex" ("conversationsReferenceIndex", "rowid", "reference") VALUES ('delete', "old"."id", "old"."reference");
        INSERT INTO "conversationsReferenceIndex" ("rowid", "reference") VALUES ("new"."id", "new"."reference");
      END;
      CREATE TRIGGER "conversationsReferenceIndexDelete" AFTER DELETE ON "conversations" BEGIN
        INSERT INTO "conversationsReferenceIndex" ("conversationsReferenceIndex", "rowid", "reference") VALUES ('delete', "old"."id", "old"."reference");
      END;
      CREATE INDEX "conversationsTypeIndex" ON "conversations" ("type");
      CREATE INDEX "conversationsPinnedAtIndex" ON "conversations" ("pinnedAt");
      CREATE INDEX "conversationsStaffOnlyAtIndex" ON "conversations" ("staffOnlyAt");
      CREATE VIRTUAL TABLE "conversationsTitleSearchIndex" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "titleSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "conversationsTitleSearchIndexInsert" AFTER INSERT ON "conversations" BEGIN
        INSERT INTO "conversationsTitleSearchIndex" ("rowid", "titleSearch") VALUES ("new"."id", "new"."titleSearch");
      END;
      CREATE TRIGGER "conversationsTitleSearchIndexUpdate" AFTER UPDATE ON "conversations" BEGIN
        INSERT INTO "conversationsTitleSearchIndex" ("conversationsTitleSearchIndex", "rowid", "titleSearch") VALUES ('delete', "old"."id", "old"."titleSearch");
        INSERT INTO "conversationsTitleSearchIndex" ("rowid", "titleSearch") VALUES ("new"."id", "new"."titleSearch");
      END;
      CREATE TRIGGER "conversationsTitleSearchIndexDelete" AFTER DELETE ON "conversations" BEGIN
        INSERT INTO "conversationsTitleSearchIndex" ("conversationsTitleSearchIndex", "rowid", "titleSearch") VALUES ('delete', "old"."id", "old"."titleSearch");
      END;

      CREATE TABLE "taggings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "tag" INTEGER NOT NULL REFERENCES "tags" ON DELETE CASCADE,
        UNIQUE ("conversation", "tag")
      );
      CREATE INDEX "taggingsConversationIndex" ON "taggings" ("conversation");
      CREATE INDEX "taggingsTagIndex" ON "taggings" ("tag");

      CREATE TABLE "messages" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "anonymousAt" TEXT NULL,
        "answerAt" TEXT NULL,
        "contentSource" TEXT NOT NULL,
        "contentPreprocessed" TEXT NOT NULL,
        "contentSearch" TEXT NOT NULL,
        UNIQUE ("conversation", "reference")
      );
      CREATE INDEX "messagesConversationIndex" ON "messages" ("conversation");
      CREATE VIRTUAL TABLE "messagesReferenceIndex" USING fts5(
        content = "messages",
        content_rowid = "id",
        "reference",
        tokenize = 'porter'
      );
      CREATE TRIGGER "messagesReferenceIndexInsert" AFTER INSERT ON "messages" BEGIN
        INSERT INTO "messagesReferenceIndex" ("rowid", "reference") VALUES ("new"."id", "new"."reference");
      END;
      CREATE TRIGGER "messagesReferenceIndexUpdate" AFTER UPDATE ON "messages" BEGIN
        INSERT INTO "messagesReferenceIndex" ("messagesReferenceIndex", "rowid", "reference") VALUES ('delete', "old"."id", "old"."reference");
        INSERT INTO "messagesReferenceIndex" ("rowid", "reference") VALUES ("new"."id", "new"."reference");
      END;
      CREATE TRIGGER "messagesReferenceIndexDelete" AFTER DELETE ON "messages" BEGIN
        INSERT INTO "messagesReferenceIndex" ("messagesReferenceIndex", "rowid", "reference") VALUES ('delete', "old"."id", "old"."reference");
      END;
      CREATE INDEX "messagesAnswerAtIndex" ON "messages" ("answerAt");
      CREATE VIRTUAL TABLE "messagesContentSearchIndex" USING fts5(
        content = "messages",
        content_rowid = "id",
        "contentSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "messagesContentSearchIndexInsert" AFTER INSERT ON "messages" BEGIN
        INSERT INTO "messagesContentSearchIndex" ("rowid", "contentSearch") VALUES ("new"."id", "new"."contentSearch");
      END;
      CREATE TRIGGER "messagesContentSearchIndexUpdate" AFTER UPDATE ON "messages" BEGIN
        INSERT INTO "messagesContentSearchIndex" ("messagesContentSearchIndex", "rowid", "contentSearch") VALUES ('delete', "old"."id", "old"."contentSearch");
        INSERT INTO "messagesContentSearchIndex" ("rowid", "contentSearch") VALUES ("new"."id", "new"."contentSearch");
      END;
      CREATE TRIGGER "messagesContentSearchIndexDelete" AFTER DELETE ON "messages" BEGIN
        INSERT INTO "messagesContentSearchIndex" ("messagesContentSearchIndex", "rowid", "contentSearch") VALUES ('delete', "old"."id", "old"."contentSearch");
      END;

      CREATE TABLE "readings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
        UNIQUE ("message", "enrollment") ON CONFLICT IGNORE
      );

      CREATE TABLE "notificationDeliveries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
        UNIQUE ("message", "enrollment") ON CONFLICT IGNORE
      );

      CREATE TABLE "endorsements" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );
      CREATE INDEX "endorsementsMessageIndex" ON "endorsements" ("message");

      CREATE TABLE "likes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );
      CREATE INDEX "likesMessageIndex" ON "likes" ("message");
    `,
    sql`
      CREATE TABLE "sendEmailJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "startAt" TEXT NOT NULL,
        "startedAt" TEXT NULL,
        "expiresAt" TEXT NOT NULL,
        "mailOptions" TEXT NOT NULL
      );
      CREATE INDEX "sendEmailJobsStartAtIndex" ON "sendEmailJobs" ("startAt");
      CREATE INDEX "sendEmailJobsStartedAtIndex" ON "sendEmailJobs" ("startedAt");
      CREATE INDEX "sendEmailJobsExpiresAtIndex" ON "sendEmailJobs" ("expiresAt");

      DROP INDEX "flashesCreatedAtIndex";
      CREATE INDEX "flashesCreatedAtIndex" ON "flashes" ("createdAt");

      DROP INDEX "emailConfirmationsCreatedAtIndex";
      CREATE INDEX "emailConfirmationsCreatedAtIndex" ON "emailConfirmations" ("createdAt");

      DROP INDEX "passwordResetsCreatedAtIndex";
      CREATE INDEX "passwordResetsCreatedAtIndex" ON "passwordResets" ("createdAt");

      DROP INDEX "sessionsCreatedAtIndex";
      CREATE INDEX "sessionsCreatedAtIndex" ON "sessions" ("createdAt");
    `
  );
  app.once("close", () => {
    database.close();
  });

  app.once("listen", () => {
    console.log(
      `${new Date().toISOString()}\tCourseLore/${courseloreVersion} started at ${baseURL}`
    );
  });
  app.enable("trust proxy");
  app.use<{}, any, {}, {}, {}>((req, res, next) => {
    const start = process.hrtime.bigint();
    res.once("close", () => {
      console.log(
        `${new Date().toISOString()}\t${req.method}\t${res.statusCode}\t${
          req.ip
        }\t${Number((process.hrtime.bigint() - start) / 1000n) / 1000}ms\t\t${
          res.getHeader("content-length") ?? "0"
        }B\t\t${req.originalUrl}${
          process.env.NODE_ENV !== "production" && req.method !== "GET"
            ? `\n${JSON.stringify(req.body, undefined, 2)}`
            : ``
        }`
      );
    });
    next();
  });
  app.once("close", () => {
    console.log(
      `${new Date().toISOString()}\tCourseLore/${courseloreVersion} stopped at ${baseURL}`
    );
  });

  interface BaseMiddlewareLocals {
    localCSS: ReturnType<typeof localCSS>;
    HTMLForJavaScript: ReturnType<typeof HTMLForJavaScript>;
  }
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.localCSS = localCSS();
    res.locals.HTMLForJavaScript = HTMLForJavaScript();
    next();
  });

  const baseLayout = ({
    req,
    res,
    head,
    extraHeaders = html``,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    extraHeaders?: HTML;
    body: HTML;
  }): HTML => {
    const baseLayoutBody = html`
      <body
        class="${res.locals.localCSS(css`
          font-family: "public-sans", var(--font-family--sans-serif);
          font-size: var(--font-size--sm);
          line-height: var(--line-height--sm);
          color: var(--color--gray--medium--700);
          background-color: var(--color--gray--medium--50);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--200);
            background-color: var(--color--gray--medium--900);
          }
        `)}"
      >
        <div
          class="${res.locals.localCSS(css`
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `)}"
          onscroll="${javascript`
            this.scroll(0, 0);
          `}"
        >
          $${res.locals.enrollment === undefined
            ? html``
            : html`
                <div
                  class="${res.locals.localCSS(css`
                    height: var(--border-width--8);
                    display: flex;
                  `)}"
                >
                  <button
                    class="button ${res.locals.localCSS(css`
                      background-color: var(
                        --color--${res.locals.enrollment.accentColor}--500
                      );
                      @media (prefers-color-scheme: dark) {
                        background-color: var(
                          --color--${res.locals.enrollment.accentColor}--600
                        );
                      }
                      border-radius: var(--border-radius--none);
                      flex: 1;
                    `)}"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "What’s This?",
                      });
                      tippy(this, {
                        trigger: "click",
                        interactive: true,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="${res.locals.localCSS(css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `)}"
                            >
                              <p>
                                This bar with an accent color appears at the top
                                of pages related to this course to help you
                                differentiate between courses.
                              </p>
                              <a
                                class="button button--blue ${res.locals
                                  .localCSS(css`
                                  width: 100%;
                                `)}"
                                href="${baseURL}/courses/${res.locals.course!
                                  .reference}/settings/your-enrollment"
                              >
                                <i class="bi bi-palette"></i>
                                Update Accent Color
                              </a>
                            </div>
                          `
                        )},
                      });
                    `}"
                  ></button>
                </div>
              `}
          <div
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              flex-direction: column;
              & > * {
                padding: var(--space--0) var(--space--4);
                border-bottom: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
                display: flex;
              }
            `)}"
          >
            $${demonstration
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      justify-content: center;
                      flex-wrap: wrap;
                    `)}"
                  >
                    <div>
                      <button
                        class="button button--transparent"
                        oninteractive="${javascript`
                          tippy(this, {
                            trigger: "click",
                            interactive: true,
                            content: ${res.locals.HTMLForJavaScript(
                              html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    padding: var(--space--2);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `)}"
                                >
                                  <p>
                                    This CourseLore installation is running in
                                    demonstration mode and must not be used for
                                    real courses. Any data may be lost,
                                    including users, courses, invitations,
                                    conversations, messages, and so forth.
                                    Emails aren’t delivered. You may create
                                    demonstration data to give you a better idea
                                    of what CourseLore looks like in use.
                                  </p>
                                  <form
                                    method="POST"
                                    action="${baseURL}/demonstration-data"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <button
                                      class="button button--blue ${res.locals
                                        .localCSS(css`
                                        width: 100%;
                                      `)}"
                                    >
                                      <i class="bi bi-easel"></i>
                                      Create Demonstration Data
                                    </button>
                                  </form>
                                </div>
                              `
                            )},
                          });
                        `}"
                      >
                        <i class="bi bi-easel"></i>
                        Demonstration Mode
                      </button>
                    </div>
                    $${process.env.NODE_ENV !== "production"
                      ? html`
                          <form
                            method="POST"
                            action="${baseURL}/turn-off?_method=DELETE"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <button class="button button--transparent">
                              <i class="bi bi-power"></i>
                              Turn off
                            </button>
                          </form>
                        `
                      : html``}
                  </div>
                `
              : html``}
            $${extraHeaders}
          </div>

          $${res.locals.user !== undefined &&
          res.locals.user.emailConfirmedAt === null
            ? html`
                <div
                  class="${res.locals.localCSS(css`
                    color: var(--color--amber--700);
                    background-color: var(--color--amber--100);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--amber--200);
                      background-color: var(--color--amber--900);
                    }
                    padding: var(--space--1) var(--space--10);
                    display: flex;
                    justify-content: center;

                    .link {
                      color: var(--color--amber--600);
                      &:hover,
                      &:focus-within {
                        color: var(--color--amber--500);
                      }
                      &:active {
                        color: var(--color--amber--700);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--100);
                        &:hover,
                        &:focus-within {
                          color: var(--color--amber--50);
                        }
                        &:active {
                          color: var(--color--amber--200);
                        }
                      }
                    }
                  `)}"
                >
                  <div
                    class="${res.locals.localCSS(css`
                      flex: 1;
                      max-width: var(--width--prose);
                      text-align: center;
                    `)}"
                  >
                    <form
                      method="POST"
                      action="${baseURL}/resend-confirmation-email${qs.stringify(
                        {
                          redirect: req.originalUrl,
                        },
                        { addQueryPrefix: true }
                      )}"
                    >
                      <input
                        type="hidden"
                        name="_csrf"
                        value="${req.csrfToken()}"
                      />
                      Please confirm your email by following the link sent to
                      ${res.locals.user.email}.<br />
                      Didn’t receive the email? Already checked your spam
                      folder? <button class="link">Resend</button>.
                      $${demonstration
                        ? html`
                            <br />
                            <span
                              class="${res.locals.localCSS(
                                css`
                                  font-weight: var(--font-weight--bold);
                                `
                              )}"
                              >This CourseLore installation is running in
                              demonstration mode and doesn’t send emails.
                              Confirm your email by
                              <a
                                href="${baseURL}/email-confirmation/${database.get<{
                                  nonce: string;
                                }>(
                                  sql`
                                    SELECT "nonce" FROM "emailConfirmations" WHERE "user" = ${res.locals.user.id}
                                  `
                                )!.nonce}${qs.stringify(
                                  {
                                    redirect: req.originalUrl,
                                  },
                                  { addQueryPrefix: true }
                                )}"
                                class="link"
                                >clicking here</a
                              >.</span
                            >
                          `
                        : html``}
                    </form>
                  </div>
                </div>
              `
            : html``}
          $${(() => {
            const flash = Flash.get({ req, res });
            return flash === undefined
              ? html``
              : html`
                  <div
                    class="flash ${res.locals.localCSS(css`
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
                            text-align: center;
                            & > * {
                              flex: 1;
                              max-width: var(--width--prose);
                            }
                            .link {
                              color: var(--color--${color}--600);
                              &:hover,
                              &:focus-within {
                                color: var(--color--${color}--500);
                              }
                              &:active {
                                color: var(--color--${color}--700);
                              }
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--${color}--100);
                                &:hover,
                                &:focus-within {
                                  color: var(--color--${color}--50);
                                }
                                &:active {
                                  color: var(--color--${color}--200);
                                }
                              }
                            }
                          }
                        `
                      )}
                    `)}"
                  >
                    $${flash}
                    <button
                      class="button button--tight button--tight--inline button--transparent ${res
                        .locals.localCSS(css`
                        justify-self: end;
                        align-self: start;
                        margin-top: var(--space--0-5);
                        margin-right: var(--space--3);
                      `)}"
                      onclick="${javascript`
                        this.closest(".flash").remove();
                      `}"
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                `;
          })()}

          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              overflow: auto;
            `)}"
          >
            $${body}
          </div>

          <div
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              padding: var(--space--0) var(--space--4);
              border-top: var(--border-width--1) solid
                var(--color--gray--medium--200);
              @media (prefers-color-scheme: dark) {
                border-color: var(--color--gray--medium--700);
              }
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
            `)}"
          >
            <div>
              <button
                class="button button--transparent ${res.locals.localCSS(css`
                  align-items: center;
                `)}"
                oninteractive="${javascript`
                  tippy(this, {
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <h3 class="heading">
                          $${logo({ size: 12 /* var(--space--3) */ })}
                          <span>
                            CourseLore <br />
                            Communication Platform for Education <br />
                            <small
                              class="secondary ${res.locals.localCSS(css`
                                font-size: var(--font-size--2xs);
                                line-height: var(--line-height--2xs);
                              `)}"
                            >
                              Version ${courseloreVersion}
                            </small>
                          </span>
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="https://courselore.org/about"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-info-circle"></i>
                            About
                          </a>
                          <a
                            href="https://github.com/courselore/courselore"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-file-earmark-code"></i>
                            Source Code
                          </a>
                        </div>
                      `
                    )},
                  });
                `}"
              >
                $${logo({ size: 16 /* var(--space--4) */ })} CourseLore
              </button>
            </div>
            <div>
              <button
                class="button button--transparent"
                oninteractive="${javascript`
                  tippy(this, {
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <h3 class="heading">
                          <i class="bi bi-bug"></i>
                          Report an Issue
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="https://courselore.org/courses/8537410611/invitations/3667859788"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent ${res.locals.localCSS(
                              css`
                                align-items: center;
                              `
                            )}"
                          >
                            $${logo({ size: 14 /* var(--space--3-5) */ })} Meta
                            CourseLore
                          </a>
                          <a
                            href="${reportIssueHref}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-envelope"></i>
                            ${administratorEmail}
                          </a>
                          <a
                            href="https://github.com/courselore/courselore/issues/new${qs.stringify(
                              {
                                body: dedent`
                                  **What did you try to do?**



                                  **What did you expect to happen?**



                                  **What really happened?**



                                  **What error messages (if any) did you run into?**



                                  Please provide as much relevant context as possible (operating system, browser, and so forth):

                                  - CourseLore Version: ${courseloreVersion}
                                `,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-github"></i>
                            GitHub Issues
                          </a>
                        </div>
                      `
                    )},
                    });
                  `}"
              >
                <i class="bi bi-bug"></i>
                Report an Issue
              </button>
            </div>
          </div>
        </div>

        $${res.locals.HTMLForJavaScript}
      </body>
    `;
    return html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
          <meta
            name="description"
            content="Communication Platform for Education"
          />

          <link rel="stylesheet" href="${baseURL}${globalCSSPath}" />
          <style>
            $${res.locals.localCSS}
          </style>
          <script type="module">
            import * as textFieldEdit from "${baseURL}/node_modules/text-field-edit/index.js";
            window.textFieldEdit = textFieldEdit;
          </script>
          <script src="${baseURL}${globalJavaScriptPath}"></script>

          $${res?.locals.eventSource
            ? html`
                <script>
                  const eventSource = new EventSource(window.location.href);
                  eventSource.addEventListener("refresh", async () => {
                    const response = await fetch(window.location.href);
                    switch (response.status) {
                      case 200:
                        const refreshedDocument =
                          new DOMParser().parseFromString(
                            await response.text(),
                            "text/html"
                          );
                        document.head.append(
                          ...refreshedDocument.head.querySelectorAll("style")
                        );
                        morphdom(document.body, refreshedDocument.body, {
                          onBeforeElUpdated(from, to) {
                            const onBeforeElUpdated =
                              from.getAttribute("onbeforeelupdated");
                            return typeof onBeforeElUpdated === "true"
                              ? new Function(
                                  "from",
                                  "to",
                                  onBeforeElUpdated
                                ).call(from, from, to)
                              : !from.matches("input, textarea");
                          },
                        });
                        leafac.evaluateElementsAttribute(document);
                        leafac.evaluateElementsAttribute(
                          document,
                          "onrefresh",
                          true
                        );
                        break;

                      case 404:
                        alert(
                          "This page has been removed.\\n\\nYou’ll be redirected now."
                        );
                        window.location.href = $${JSON.stringify(baseURL)};
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
        </head>
        $${baseLayoutBody}
      </html>
    `;
  };

  const globalCSSProcessed = processCSS(css`
    ${["public-sans", "jetbrains-mono"].flatMap((family) =>
      ["normal", "italic"].flatMap((style) =>
        ["100", "200", "300", "400", "500", "600", "700", "800", "900"].flatMap(
          (weight) => [
            css`
              @font-face {
                font-family: "${family}";
                font-style: ${style};
                font-display: swap;
                font-weight: ${weight};
                src: url("${baseURL}/node_modules/@fontsource/${family}/files/${family}-all-${weight}-${style}.woff");
              }
            `,
          ]
        )
      )
    )}
    ${(
      await fs.readFile(
        new URL(
          "../static/node_modules/bootstrap-icons/font/bootstrap-icons.css",
          import.meta.url
        ),
        "utf-8"
      )
    ).replaceAll(
      `url("./`,
      `url("${baseURL}/node_modules/bootstrap-icons/font/`
    )}
    ${(
      await fs.readFile(
        new URL(
          "../static/node_modules/katex/dist/katex.min.css",
          import.meta.url
        ),
        "utf-8"
      )
    ).replaceAll(`url(`, `url(${baseURL}/node_modules/katex/dist/`)}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/tippy.js/dist/svg-arrow.css",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/tippy.js/dist/border.css",
        import.meta.url
      ),
      "utf-8"
    )}

    ${globalCSS}

    .label {
      display: flex;
      flex-direction: column;
      gap: var(--space--1);

      .label--text {
        font-size: var(--font-size--xs);
        line-height: var(--line-height--xs);
        font-weight: var(--font-weight--bold);
        display: flex;
        gap: var(--space--2);
      }
    }

    .input--text {
      background-color: var(--color--gray--medium--200);
      --color--box-shadow: var(--color--blue--400);
      &::placeholder {
        color: var(--color--gray--medium--400);
      }
      &:disabled,
      &.disabled {
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
        &:disabled,
        &.disabled {
          color: var(--color--gray--medium--400);
          -webkit-text-fill-color: var(--color--gray--medium--400);
          background-color: var(--color--gray--medium--600);
        }
      }
      width: 100%;
      display: block;
      padding: var(--space--2) var(--space--4);
      border-radius: var(--border-radius--md);
      &:focus-within {
        box-shadow: var(--border-width--0) var(--border-width--0)
          var(--border-width--0) var(--border-width--2) var(--color--box-shadow);
      }
      transition-property: var(--transition-property--box-shadow);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
      &.input--text--textarea {
        border-radius: var(--border-radius--lg);
      }
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
        &:hover,
        &:focus-within {
          background-color: var(--color--blue--500);
        }
        &:active {
          background-color: var(--color--blue--700);
        }
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
          &:hover,
          &:focus-within {
            background-color: var(--color--blue--600);
          }
          &:active {
            background-color: var(--color--blue--800);
          }
        }
      }
      width: var(--space--3-5);
      height: var(--space--3-5);
      border-radius: var(--border-radius--circle);
      position: relative;
      top: var(--space---0-5);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);

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
        transition-timing-function: var(--transition-timing-function--in-out);
      }
      &:not(:checked)::before {
        transform: scale(var(--scale--0));
      }
    }

    .input--checkbox {
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
        &:hover,
        &:focus-within {
          background-color: var(--color--blue--500);
        }
        &:active {
          background-color: var(--color--blue--700);
        }
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
          &:hover,
          &:focus-within {
            background-color: var(--color--blue--600);
          }
          &:active {
            background-color: var(--color--blue--800);
          }
        }
      }
      width: var(--space--8);
      padding: var(--space--0-5);
      border-radius: var(--border-radius--full);
      position: relative;
      top: calc(var(--space--0-5) * 1.5);
      &::after {
        content: "";
        background-color: var(--color--gray--medium--50);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--200);
        }
        width: var(--space--3);
        height: var(--space--3);
        border-radius: var(--border-radius--circle);
        display: block;
        transition-property: var(--transition-property--all);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
      }
      &:checked::after {
        margin-left: var(--space--4);
      }
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
    }

    .input--radio-or-checkbox--multilabel {
      & ~ * {
        display: flex;
        gap: var(--space--2);
      }
      &:not(:checked) + * + *,
      &:checked + * {
        display: none;
      }
    }

    .button {
      padding: var(--space--1) var(--space--4);
      border-radius: var(--border-radius--md);
      display: flex;
      gap: var(--space--2);
      justify-content: center;
      align-items: baseline;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
      cursor: pointer;

      &.button--tight {
        padding: var(--space--0-5) var(--space--1);

        &.button--tight--inline {
          margin: var(--space---0-5) var(--space---1);
        }
      }

      &.button--tight-gap {
        gap: var(--space--1);
      }

      &.button--full-width-on-small-screen {
        @media (max-width: 400px) {
          width: 100%;
        }
      }

      &.button--justify-start {
        justify-content: flex-start;
      }

      &.button--inline {
        display: inline-flex;
      }

      &.button--transparent {
        &:not(:disabled):not(.disabled) {
          &:hover,
          &:focus-within,
          &.hover {
            background-color: var(--color--gray--medium--200);
          }
          &:active {
            background-color: var(--color--gray--medium--300);
          }
          @media (prefers-color-scheme: dark) {
            &:hover,
            &:focus-within,
            &.hover {
              background-color: var(--color--gray--medium--700);
            }
            &:active {
              background-color: var(--color--gray--medium--600);
            }
          }
        }
        &:disabled,
        &.disabled {
          color: var(--color--gray--medium--500);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--400);
          }
        }
      }

      ${["blue", "green", "rose", "amber"].map(
        (color) => css`
          &.button--${color} {
            color: var(--color--${color}--50);
            @media (prefers-color-scheme: dark) {
              color: var(--color--${color}--100);
            }
            &:not(:disabled):not(.disabled) {
              background-color: var(--color--${color}--600);
              &:hover,
              &:focus-within,
              &.hover {
                background-color: var(--color--${color}--500);
              }
              &:active {
                background-color: var(--color--${color}--700);
              }
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--${color}--800);
                &:hover,
                &:focus-within,
                &.hover {
                  background-color: var(--color--${color}--700);
                }
                &:active {
                  background-color: var(--color--${color}--900);
                }
              }
            }
            &:disabled,
            &.disabled {
              background-color: var(--color--${color}--300);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--${color}--500);
              }
            }
            .strong {
              color: var(--color--${color}--50);
              @media (prefers-color-scheme: dark) {
                color: var(--color--${color}--100);
              }
            }
            .secondary,
            [class^="text--"] {
              color: var(--color--${color}--100);
              @media (prefers-color-scheme: dark) {
                color: var(--color--${color}--200);
              }
            }
          }
        `
      )}
    }

    .link {
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
      transition-timing-function: var(--transition-timing-function--in-out);
      cursor: pointer;
    }

    :disabled,
    .disabled {
      cursor: not-allowed;
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
      gap: var(--space--1);
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

    ${[
      "blue",
      "green",
      "rose",
      "pink",
      "amber",
      "teal",
      "lime",
      "emerald",
      "fuchsia",
      "cyan",
    ].map(
      (color) => css`
        .text--${color} {
          color: var(--color--${color}--600);
          @media (prefers-color-scheme: dark) {
            color: var(--color--${color}--500);
          }
        }
      `
    )}

    .mark {
      color: var(--color--amber--700);
      background-color: var(--color--amber--200);
      @media (prefers-color-scheme: dark) {
        color: var(--color--amber--200);
        background-color: var(--color--amber--700);
      }
      border-radius: var(--border-radius--base);
    }

    .code,
    .pre > code {
      font-family: "jetbrains-mono", var(--font-family--monospace);
      font-variant-ligatures: none;
    }

    .pre > code {
      font-size: var(--font-size--xs);
      line-height: var(--line-height--xs);
    }

    .img {
      background-color: var(--color--gray--medium--50);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--50);
        filter: brightness(var(--brightness--90));
      }
      max-width: 100%;
      height: auto;
      border-radius: var(--border-radius--xl);
    }

    .details {
      background-color: var(--color--gray--medium--200);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--700);
      }
      border-radius: var(--border-radius--xl);
      summary {
        &:hover,
        &:focus-within {
          background-color: var(--color--gray--medium--300);
        }
        @media (prefers-color-scheme: dark) {
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--600);
          }
        }
        padding: var(--space--2) var(--space--4);
        border-radius: var(--border-radius--xl);
        transition-property: var(--transition-property--colors);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
        cursor: pointer;
        &::before {
          content: "\\f275";
          font-family: bootstrap-icons !important;
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          margin-right: var(--space--2);
        }
      }
      &[open] > summary::before {
        content: "\\f273";
      }
      & > div:last-child {
        padding: var(--space--4);
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

    .separator {
      border-top: var(--border-width--1) solid var(--color--gray--medium--200);
      @media (prefers-color-scheme: dark) {
        border-color: var(--color--gray--medium--700);
      }
    }

    .menu-box {
      background-color: var(--color--gray--medium--100);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--800);
      }
      padding: var(--space--2);
      border-radius: var(--border-radius--lg);
      display: flex;
      flex-direction: column;
      gap: var(--space--2);

      .menu-box--item {
        justify-content: flex-start;
      }
    }

    .tippy-box {
      font-size: var(--font-size--sm);
      line-height: var(--line-height--sm);
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

      .dropdown--menu {
        display: flex;
        flex-direction: column;

        .dropdown--menu--item {
          text-align: left;
          width: 100%;
          padding-left: var(--space--2);
          padding-right: var(--space--2);
          justify-content: flex-start;
        }
      }

      .dropdown--separator {
        border-top: var(--border-width--1) solid var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
        margin: var(--space--0) var(--space--2);
      }

      ${["green", "rose"].map(
        (color) => css`
          &[data-theme~="${color}"] {
            color: var(--color--${color}--700);
            --background-color: var(--color--${color}--100);
            --border-color: var(--color--${color}--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--${color}--200);
              --background-color: var(--color--${color}--900);
              --border-color: var(--color--${color}--800);
            }
          }
        `
      )}

      &[data-theme~="validation--error"] {
        color: var(--color--rose--700);
        --background-color: var(--color--rose--100);
        --border-color: var(--color--rose--200);
        @media (prefers-color-scheme: dark) {
          color: var(--color--rose--200);
          --background-color: var(--color--rose--900);
          --border-color: var(--color--rose--800);
        }
      }
    }

    .dark {
      display: none !important;
    }
    @media (prefers-color-scheme: dark) {
      .light {
        display: none !important;
      }
      .dark {
        display: block !important;
      }
    }

    .content {
      &,
      div,
      figure,
      blockquote {
        display: flex;
        flex-direction: column;
        gap: var(--space--4);
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        margin-top: var(--space--4);
      }

      h1 {
        color: var(--color--gray--medium--800);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--100);
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
          color: var(--color--gray--medium--100);
        }
      }

      i:not(.bi),
      em {
        font-style: italic;
        color: var(--color--gray--medium--800);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--100);
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
        transition-timing-function: var(--transition-timing-function--in-out);
        cursor: pointer;
      }

      pre {
        padding: var(--space--4);
        border-radius: var(--border-radius--xl);
        overflow-x: auto;
        & > code {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          overflow-wrap: normal;
        }
      }

      code,
      tt,
      kbd,
      samp {
        font-family: "jetbrains-mono", var(--font-family--monospace);
        font-variant-ligatures: none;
      }

      del {
        text-decoration: line-through;
        color: var(--color--rose--600);
        @media (prefers-color-scheme: dark) {
          color: var(--color--rose--500);
        }
      }

      ins {
        color: var(--color--green--600);
        @media (prefers-color-scheme: dark) {
          color: var(--color--green--500);
        }
      }

      sup,
      sub {
        position: relative;
        font-size: var(--font-size--2xs);
        line-height: var(--space--0);
        vertical-align: baseline;
      }

      sup {
        top: var(--space---1);
      }

      sub {
        bottom: var(--space---1);
      }

      img {
        background-color: var(--color--gray--medium--50);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--50);
          filter: brightness(var(--brightness--90));
        }
        max-width: 100%;
        height: auto;
        border-radius: var(--border-radius--xl);
      }

      hr {
        border-top: var(--border-width--1) solid var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
      }

      ol {
        padding-left: var(--space--8);
        & > li {
          list-style: decimal;
          &::marker {
            color: var(--color--gray--medium--500);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--400);
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
              color: var(--color--gray--medium--400);
            }
          }
        }
      }

      table {
        border-collapse: collapse;
        display: block;
        caption {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          font-weight: var(--font-weight--bold);
        }
        th,
        td {
          padding: var(--space--1) var(--space--3);
          border-top: var(--border-width--1) solid
            var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            border-color: var(--color--gray--medium--700);
          }
        }
        th {
          font-weight: var(--font-weight--bold);
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
          }
        }
      }

      blockquote {
        padding-left: var(--space--4);
        border-left: var(--border-width--4) solid
          var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
      }

      dl {
        dt {
          font-weight: var(--font-weight--bold);
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
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
        background-color: var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--700);
        }
        border-radius: var(--border-radius--xl);
        summary {
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--300);
          }
          @media (prefers-color-scheme: dark) {
            &:hover,
            &:focus-within {
              background-color: var(--color--gray--medium--600);
            }
          }
          padding: var(--space--2) var(--space--4);
          border-radius: var(--border-radius--xl);
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
          cursor: pointer;
          &::before {
            content: "\\f275";
            font-family: bootstrap-icons !important;
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            margin-right: var(--space--2);
          }
        }
        &[open] > summary::before {
          content: "\\f273";
        }
        & > div:last-child {
          padding: var(--space--4);
        }
      }

      figure {
        figcaption {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          font-weight: var(--font-weight--bold);
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
        color: var(--color--amber--700);
        background-color: var(--color--amber--200);
        @media (prefers-color-scheme: dark) {
          color: var(--color--amber--200);
          background-color: var(--color--amber--700);
        }
        border-radius: var(--border-radius--base);
      }

      small {
        font-size: var(--font-size--xs);
        line-height: var(--line-height--xs);
      }

      input[type="checkbox"] {
        font-size: var(--font-size--2xs);
        line-height: var(--line-height--2xs);
        color: var(--color--transparent);
        background-color: var(--color--gray--medium--200);
        &:checked {
          color: var(--color--blue--50);
          background-color: var(--color--blue--600);
        }
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--700);
          &:checked {
            color: var(--color--blue--200);
            background-color: var(--color--blue--700);
          }
        }
        width: var(--space--3-5);
        height: var(--space--3-5);
        border-radius: var(--border-radius--base);
        margin-right: var(--space--1);
        display: inline-flex;
        justify-content: center;
        align-items: center;
        &::before {
          content: "\\f633";
          font-family: bootstrap-icons !important;
        }
      }

      .katex {
        overflow: auto;
      }
    }
  `);
  const globalCSSPath = `/global--${crypto
    .createHash("sha256")
    .update(globalCSSProcessed)
    .digest("hex")}.css`;
  app.get<{}, CSS, {}, {}, BaseMiddlewareLocals>(globalCSSPath, (req, res) => {
    res.type("css").send(globalCSSProcessed);
  });

  const globalJavaScript = javascript`
    ${await fs.readFile(
      new URL(
        "../static/node_modules/@popperjs/core/dist/umd/popper.min.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/tippy.js/dist/tippy-bundle.umd.min.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/mousetrap/mousetrap.min.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/textarea-caret/index.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/scroll-into-view-if-needed/umd/scroll-into-view-if-needed.min.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/morphdom/dist/morphdom-umd.min.js",
        import.meta.url
      ),
      "utf-8"
    )}
    ${await fs.readFile(
      new URL(
        "../static/node_modules/@leafac/javascript/browser.js",
        import.meta.url
      ),
      "utf-8"
    )}

    leafac.evaluateOnInteractive();
    leafac.customFormValidation();
    leafac.warnAboutLosingInputs();
    leafac.disableButtonsOnSubmit();
    leafac.tippySetDefaultProps();
    ${
      liveReload
        ? javascript`
            leafac.liveReload();
          `
        : javascript``
    }
  `;
  const globalJavaScriptPath = `/global--${crypto
    .createHash("sha256")
    .update(globalJavaScript)
    .digest("hex")}.js`;
  app.get<{}, CSS, {}, {}, BaseMiddlewareLocals>(
    globalJavaScriptPath,
    (req, res) => {
      res.type("js").send(globalJavaScript);
    }
  );

  const boxLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    baseLayout({
      req,
      res,
      head,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            min-width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          `)}"
        >
          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              max-width: var(--width--sm);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                justify-content: center;
              `)}"
            >
              <a
                href="${baseURL}/"
                class="heading--display button button--transparent ${res.locals
                  .localCSS(css`
                  align-items: center;
                `)}"
              >
                $${logo()} CourseLore
              </a>
            </div>
            <div
              class="${res.locals.localCSS(css`
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                padding: var(--space--4);
                border-radius: var(--border-radius--lg);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              $${body}
            </div>

            $${baseURL === "https://try.courselore.org"
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `)}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `)}"
                    >
                      <p>
                        This is the development installation of CourseLore and
                        must not be used for real courses. Any data may be lost,
                        including users, courses, invitations, conversations,
                        messages, and so forth. Emails aren’t delivered. You may
                        create demonstration data to give you a better idea of
                        what CourseLore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="${baseURL}/demonstration-data"
                      >
                        <input
                          type="hidden"
                          name="_csrf"
                          value="${req.csrfToken()}"
                        />
                        <button
                          class="button button--amber ${res.locals.localCSS(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : demonstration
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `)}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `)}"
                    >
                      <p>
                        This CourseLore installation is running in demonstration
                        mode and must not be used for real courses. Any data may
                        be lost, including users, courses, invitations,
                        conversations, messages, and so forth. Emails aren’t
                        delivered. You may create demonstration data to give you
                        a better idea of what CourseLore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="${baseURL}/demonstration-data"
                      >
                        <input
                          type="hidden"
                          name="_csrf"
                          value="${req.csrfToken()}"
                        />
                        <button
                          class="button button--amber ${res.locals.localCSS(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : html``}
          </div>
        </div>
      `,
    });

  const applicationLayout = ({
    req,
    res,
    head,
    showCourseSwitcher = true,
    extraHeaders = html``,
    body,
  }: {
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
    showCourseSwitcher?: boolean;
    extraHeaders?: HTML;
    body: HTML;
  }): HTML =>
    baseLayout({
      req,
      res,
      head,
      extraHeaders: html`
        <div
          class="${res.locals.localCSS(css`
            padding-top: var(--space--1);
            padding-bottom: var(--space--1);
            gap: var(--space--4);
            align-items: center;
          `)}"
        >
          <a
            href="${baseURL}/"
            class="button button--tight button--tight--inline button--transparent"
            oninteractive="${javascript`
              tippy(this, {
                touch: false,
                content: "CourseLore",
              });
            `}"
          >
            $${logo()}
          </a>

          <div
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--sm);
              line-height: var(--line-height--sm);
              flex: 1;
              min-width: var(--width--0);
            `)}"
          >
            $${(() => {
              const courseSwitcher = html`
                <div class="dropdown--menu">
                  $${res.locals.enrollments.map(
                    (enrollment) => html`
                      <a
                        href="${baseURL}/courses/${enrollment.course.reference}"
                        class="dropdown--menu--item button ${enrollment.id ===
                        res.locals.enrollment?.id
                          ? "button--blue"
                          : "button--transparent"}"
                      >
                        $${coursePartial({
                          req,
                          res,
                          course: enrollment.course,
                          enrollment,
                          tight: true,
                        })}
                      </a>
                    `
                  )}
                </div>
              `;

              return res.locals.course !== undefined
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent strong ${res
                        .locals.localCSS(css`
                        max-width: 100%;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          trigger: "click",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <div
                                class="${res.locals.localCSS(css`
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `)}"
                              >
                                <div>
                                  <h3 class="heading">
                                    <i class="bi bi-journal-text"></i>
                                    ${res.locals.course.name}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <a
                                      href="${baseURL}/courses/${res.locals
                                        .course.reference}"
                                      class="dropdown--menu--item button ${req.path.includes(
                                        "/settings/"
                                      )
                                        ? "button--transparent"
                                        : "button--blue"}"
                                    >
                                      <i class="bi bi-chat-left-text"></i>
                                      Conversations
                                    </a>
                                    <a
                                      href="${baseURL}/courses/${res.locals
                                        .course.reference}/settings"
                                      class="dropdown--menu--item button ${req.path.includes(
                                        "/settings/"
                                      )
                                        ? "button--blue"
                                        : "button--transparent"}"
                                    >
                                      <i class="bi bi-sliders"></i>
                                      Course Settings
                                    </a>
                                  </div>
                                </div>
                                $${res.locals.enrollments.length > 1
                                  ? html`
                                      <div>
                                        <h3 class="heading">
                                          <i class="bi bi-arrow-left-right"></i>
                                          Switch to Another Course
                                        </h3>
                                        $${courseSwitcher}
                                      </div>
                                    `
                                  : html``}
                              </div>
                            `
                          )},
                        });
                      `}"
                    >
                      <i class="bi bi-journal-text"></i>
                      <span
                        class="${res.locals.localCSS(css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        `)}"
                      >
                        ${res.locals.course.name}
                      </span>
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  `
                : showCourseSwitcher && res.locals.enrollments.length > 0
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent ${res
                        .locals.localCSS(css`
                        max-width: 100%;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          trigger: "click",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`$${courseSwitcher}`
                          )},
                        });
                      `}"
                    >
                      Go to Your Courses
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  `
                : html``;
            })()}
          </div>

          <div>
            <button
              class="button button--tight button--tight--inline button--transparent"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: ${JSON.stringify(
                    res.locals.invitations!.length === 0
                      ? "Add"
                      : `${res.locals.invitations!.length} pending invitation${
                          res.locals.invitations!.length === 1 ? "" : "s"
                        }`
                  )},
                });
                tippy(this, {
                  trigger: "click",
                  interactive: true,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        $${res.locals.invitations!.length === 0
                          ? html``
                          : html`
                              <div>
                                <h3 class="heading">
                                  <i class="bi bi-journal-arrow-down"></i>
                                  Invitations
                                </h3>
                                <div class="dropdown--menu">
                                  $${res.locals.invitations!.map(
                                    (invitation) => html`
                                      <a
                                        href="${baseURL}/courses/${invitation
                                          .course
                                          .reference}/invitations/${invitation.reference}"
                                        class="dropdown--menu--item button button--transparent"
                                      >
                                        $${coursePartial({
                                          req,
                                          res,
                                          course: invitation.course,
                                          tight: true,
                                        })}
                                      </a>
                                    `
                                  )}
                                </div>
                              </div>
                              <hr class="dropdown--separator" />
                            `}
                        <div class="dropdown--menu">
                          <button
                            class="dropdown--menu--item button button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                trigger: "click",
                                content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                              });
                            `}"
                          >
                            <i class="bi bi-journal-arrow-down"></i>
                            Enroll in an Existing Course
                          </button>
                          <a
                            href="${baseURL}/courses/new"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-journal-plus"></i>
                            Create a New Course
                          </a>
                        </div>
                      </div>
                    `
                  )},
                });
              `}"
            >
              <div
                class="${res.locals.localCSS(css`
                  display: grid;
                  & > * {
                    grid-area: 1 / 1;
                  }
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    font-size: var(--font-size--xl);
                    line-height: var(--line-height--xl);
                    font-weight: var(--font-weight--bold);
                    padding: var(--space--0) var(--space--1);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  `)}"
                >
                  +
                </div>
                $${res.locals.invitations!.length === 0
                  ? html``
                  : html`
                      <div
                        class="${res.locals.localCSS(css`
                          background-color: var(--color--rose--500);
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--rose--600);
                          }
                          width: var(--space--1-5);
                          height: var(--space--1-5);
                          border-radius: var(--border-radius--circle);
                          justify-self: end;
                          transform: translateY(50%);
                        `)}"
                      ></div>
                    `}
              </div>
            </button>
          </div>

          <div>
            <button
              class="button button--tight button--tight--inline button--transparent ${res
                .locals.localCSS(css`
                padding: var(--space--1);
                border-radius: var(--border-radius--circle);
              `)}"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: ${JSON.stringify(res.locals.user.name)},
                });
                tippy(this, {
                  trigger: "click",
                  interactive: true,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div
                          class="${res.locals.localCSS(css`
                            padding: var(--space--0) var(--space--2);
                          `)}"
                        >
                          <p class="strong">${res.locals.user.name}</p>
                          <p class="secondary">${res.locals.user.email}</p>
                        </div>

                        <hr class="dropdown--separator" />

                        <div class="dropdown--menu">
                          <a
                            class="dropdown--menu--item button button--transparent"
                            href="${baseURL}/settings"
                          >
                            <i class="bi bi-sliders"></i>
                            User Settings
                          </a>
                          <form
                            method="POST"
                            action="${baseURL}/sign-out?_method=DELETE"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <button
                              class="dropdown--menu--item button button--transparent"
                            >
                              <i class="bi bi-box-arrow-right"></i>
                              Sign Out
                            </button>
                          </form>
                        </div>
                      </div>
                    `
                  )},
                });
              `}"
            >
              $${userPartial({
                req,
                res,
                user: res.locals.user,
                decorate: false,
                name: false,
              })}
            </button>
          </div>
        </div>

        $${extraHeaders}
      `,
      body,
    });

  const mainLayout = ({
    req,
    res,
    head,
    showCourseSwitcher = true,
    body,
  }: {
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
    showCourseSwitcher?: boolean;
    body: HTML;
  }): HTML =>
    applicationLayout({
      req,
      res,
      head,
      showCourseSwitcher,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            display: flex;
            justify-content: center;
          `)}"
        >
          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  const settingsLayout = ({
    req,
    res,
    head,
    menuButton,
    menu,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    menuButton: HTML;
    menu: HTML;
    body: HTML;
  }): HTML =>
    applicationLayout({
      req,
      res,
      head,
      extraHeaders:
        menu === html``
          ? html``
          : html`
              <div
                class="${res.locals.localCSS(css`
                  justify-content: center;
                  @media (min-width: 700px) {
                    display: none;
                  }
                `)}"
              >
                <button
                  class="button button--transparent"
                  oninteractive="${javascript`
                    tippy(this, {
                      trigger: "click",
                      interactive: true,
                      content: ${res.locals.HTMLForJavaScript(
                        html`<div class="dropdown--menu">$${menu}</div>`
                      )},
                    });
                  `}"
                >
                  $${menuButton}
                  <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            `,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            gap: var(--space--8);
          `)}"
        >
          $${menu === html``
            ? html``
            : html`
                <div
                  class="${res.locals.localCSS(css`
                    @media (max-width: 699px) {
                      display: none;
                    }
                  `)}"
                >
                  <div class="menu-box">$${menu}</div>
                </div>
              `}
          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  const logo = (() => {
    // https://www.youtube.com/watch?v=dSK-MW-zuAc
    const order = 2;
    const viewBox = 24; /* var(--space--6) */
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
    const pathD = `M ${points
      .map((point) => point.map((coordinate) => coordinate * viewBox).join(" "))
      .join(" L ")} Z`;
    return ({ size = viewBox }: { size?: number } = {}) => html`
      <svg width="${size}" height="${size}" viewBox="0 0 ${viewBox} ${viewBox}">
        <path
          d="${pathD}"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  })();

  const partialLayout = ({
    req,
    res,
    body,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    body: HTML;
  }): HTML => html`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          $${res.locals.localCSS}
        </style>
      </head>
      <body>
        $${body}$${res.locals.HTMLForJavaScript}
      </body>
    </html>
  `;

  const spinner = ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
  }): HTML => html`
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="4"
      class="${res.locals.localCSS(css`
        animation: var(--animation--spin);
      `)}"
    >
      <path
        d="M 2 10 A 8 8 0 0 0 18 10 A 8 8 0 0 0 2 10"
        class="${res.locals.localCSS(css`
          opacity: var(--opacity--25);
        `)}"
      />
      <path
        d="M 2 10 A 8 8 0 0 0 15.5 15.5"
        class="${res.locals.localCSS(css`
          opacity: var(--opacity--75);
        `)}"
      />
    </svg>
  `;

  const userPartial = ({
    req,
    res,
    enrollment = undefined,
    user = enrollment === undefined
      ? undefined
      : enrollment === "no-longer-enrolled"
      ? "no-longer-enrolled"
      : enrollment.user,
    anonymous = user === undefined,
    decorate = user !== undefined,
    name = true,
    tooltip = name !== false,
    size = "sm",
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
    >;
    enrollment?: AuthorEnrollment;
    user?: AuthorEnrollmentUser | "no-longer-enrolled";
    anonymous?: boolean | "reveal";
    decorate?: boolean;
    name?: boolean | string;
    tooltip?: boolean;
    size?: "xs" | "sm" | "xl";
  }): HTML => {
    let userAvatar = html``;
    if (user !== undefined && anonymous !== true) {
      if (user === "no-longer-enrolled")
        userAvatar = html`<svg
          viewBox="0 0 24 24"
          class="${res.locals.localCSS(css`
            color: var(--color--rose--700);
            background-color: var(--color--rose--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--rose--200);
              background-color: var(--color--rose--700);
            }
            ${{
              xs: css`
                width: var(--space--4);
                height: var(--space--4);
                vertical-align: var(--space---1);
              `,
              sm: css`
                width: var(--space--6);
                height: var(--space--6);
                vertical-align: var(--space---1-5);
              `,
              xl: css`
                width: var(--space--32);
                height: var(--space--32);
              `,
            }[size]}
            border-radius: var(--border-radius--circle);
          `)}"
        >
          <foreignObject x="2" y="-2" width="24" height="24">
            <span
              class="${res.locals.localCSS(css`
                font-size: var(--font-size--xl);
                line-height: var(--line-height--xl);
              `)}"
            >
              <i class="bi bi-emoji-smile-upside-down"></i>
            </span>
          </foreignObject>
        </svg>`;
      else if (user.avatar !== null)
        userAvatar = html`<img
          src="${user.avatar}"
          alt="${user.name}"
          loading="lazy"
          class="${res.locals.localCSS(css`
            ${{
              xs: css`
                width: var(--space--4);
                height: var(--space--4);
                vertical-align: var(--space---1);
              `,
              sm: css`
                width: var(--space--6);
                height: var(--space--6);
                vertical-align: var(--space---1-5);
              `,
              xl: css`
                width: var(--space--32);
                height: var(--space--32);
              `,
            }[size]}
            border-radius: var(--border-radius--circle);
            @media (prefers-color-scheme: dark) {
              filter: brightness(var(--brightness--90));
            }
          `)}"
        />`;
      else
        userAvatar = html`<svg
          viewBox="0 0 24 24"
          class="${res.locals.localCSS(css`
            color: var(--color--${user.avatarlessBackgroundColor}--700);
            background-color: var(
              --color--${user.avatarlessBackgroundColor}--200
            );
            @media (prefers-color-scheme: dark) {
              color: var(--color--${user.avatarlessBackgroundColor}--200);
              background-color: var(
                --color--${user.avatarlessBackgroundColor}--700
              );
            }
            ${{
              xs: css`
                width: var(--space--4);
                height: var(--space--4);
                vertical-align: var(--space---1);
              `,
              sm: css`
                width: var(--space--6);
                height: var(--space--6);
                vertical-align: var(--space---1-5);
              `,
              xl: css`
                width: var(--space--32);
                height: var(--space--32);
              `,
            }[size]}
            border-radius: var(--border-radius--circle);
          `)}"
        >
          <text
            x="12"
            y="16"
            text-anchor="middle"
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--2xs);
              line-height: var(--line-height--2xs);
              font-weight: var(--font-weight--black);
              fill: currentColor;
            `)}"
          >
            ${(() => {
              const nameParts = user.name.split(/\s+/);
              return `${nameParts[0][0]}${
                nameParts.length > 0 ? nameParts[nameParts.length - 1][0] : ""
              }`.toUpperCase();
            })()}
          </text>
        </svg>`;

      if (
        decorate &&
        user !== "no-longer-enrolled" &&
        enrollment !== "no-longer-enrolled"
      )
        userAvatar = html`<span
          class="${res.locals.localCSS(css`
            display: inline-grid;
            & > * {
              grid-area: 1 / 1;
            }
            ${{
              xs: css`
                vertical-align: var(--space---1);
              `,
              sm: css`
                vertical-align: var(--space---1-5);
              `,
              xl: css``,
            }[size]}
          `)}"
        >
          $${userAvatar}
          <span
            class="${res.locals.localCSS(css`
              background-color: var(--color--green--500);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--green--600);
              }
              ${{
                xs: css`
                  width: var(--space--1);
                  height: var(--space--1);
                `,
                sm: css`
                  width: var(--space--1-5);
                  height: var(--space--1-5);
                `,
                xl: css`
                  width: var(--space--3);
                  height: var(--space--3);
                  transform: translate(-100%, -100%);
                `,
              }[size]}
              border-radius: var(--border-radius--circle);
              place-self: end;
              display: none;
            `)}"
            oninteractive="${javascript`
              const element = this;
              const lastSeenOnlineAt = ${new Date(
                user.lastSeenOnlineAt
              ).getTime()};
              tippy(element, {
                touch: false,
                content: "Online",
              });
              (function update() {
                element.style.display = Date.now() - lastSeenOnlineAt < 5 * 60 * 1000 ? "block" : "none";
                window.setInterval(update, 60 * 1000);
              })();
            `}"
          ></span>
        </span>`;

      if (name !== false)
        userAvatar = html`<span
          class="${res.locals.localCSS(css`
            font-weight: var(--font-weight--bold);
          `)}"
          oninteractive="${javascript`
            ${
              tooltip
                ? javascript`
                    tippy(this, {
                      interactive: true,
                      appendTo: document.body,
                      delay: [1000, null],
                      content: ${res.locals.HTMLForJavaScript(
                        html`
                          <div
                            class="${res.locals.localCSS(css`
                              max-height: var(--space--56);
                              padding: var(--space--1) var(--space--2);
                              overflow: auto;
                              display: flex;
                              flex-direction: column;
                              gap: var(--space--4);
                            `)}"
                          >
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                gap: var(--space--4);
                                align-items: center;
                              `)}"
                            >
                              <div>
                                $${userPartial({
                                  req,
                                  res,
                                  enrollment,
                                  user,
                                  name: false,
                                  size: "xl",
                                })}
                              </div>
                              <div
                                class="${res.locals.localCSS(css`
                                  padding-top: var(--space--0-5);
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `)}"
                              >
                                <div>
                                  <div class="strong">
                                    ${user === "no-longer-enrolled"
                                      ? "No Longer Enrolled"
                                      : user.name}
                                  </div>
                                  $${user !== "no-longer-enrolled" &&
                                  (res.locals.enrollment?.role === "staff" ||
                                    res.locals.user?.id === user.id)
                                    ? html`
                                        <div class="secondary">
                                          ${user.email}
                                        </div>
                                      `
                                    : html``}
                                  $${user === "no-longer-enrolled"
                                    ? html`
                                        <div class="secondary">
                                          This person has left the course.
                                        </div>
                                      `
                                    : html`
                                        <div
                                          class="secondary ${res.locals
                                            .localCSS(css`
                                            font-size: var(--font-size--xs);
                                            line-height: var(--line-height--xs);
                                          `)}"
                                        >
                                          Last seen online
                                          <time
                                            datetime="${new Date(
                                              user.lastSeenOnlineAt
                                            ).toISOString()}"
                                            oninteractive="${javascript`
                                              leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                            `}"
                                          ></time>
                                        </div>
                                      `}
                                  $${enrollment !== undefined &&
                                  enrollment !== "no-longer-enrolled" &&
                                  enrollment.role === "staff"
                                    ? html`
                                        <div
                                          class="text--pink ${res.locals
                                            .localCSS(css`
                                            font-size: var(--font-size--xs);
                                            line-height: var(--line-height--xs);
                                            display: flex;
                                            gap: var(--space--2);
                                          `)}"
                                        >
                                          <i class="bi bi-mortarboard-fill"></i>
                                          Staff
                                        </div>
                                      `
                                    : html``}
                                </div>
                              </div>
                            </div>
                            $${user !== "no-longer-enrolled" &&
                            user.biographyPreprocessed !== null
                              ? processContent({
                                  req,
                                  res,
                                  type: "preprocessed",
                                  content: user.biographyPreprocessed,
                                }).processed
                              : html``}
                          </div>
                        `
                      )},
                    });
                  `
                : javascript``
            }
          `}"
          >$${userAvatar}  $${name === true
            ? html`${user === "no-longer-enrolled"
                ? "No Longer Enrolled"
                : user.name}`
            : name}$${enrollment !== undefined &&
          enrollment !== "no-longer-enrolled" &&
          enrollment.role === "staff"
            ? html`  <span
                  class="text--pink"
                  oninteractive="${javascript`
                    tippy(this, {
                      touch: false,
                      content: "Staff",
                    });
                  `}"
                  ><i class="bi bi-mortarboard-fill"></i
                ></span>`
            : html``}</span
        >`;
    }

    let anonymousAvatar = html``;
    if (anonymous !== false) {
      anonymousAvatar = html`<svg
        viewBox="0 0 24 24"
        class="${res.locals.localCSS(css`
          color: var(--color--violet--700);
          background-color: var(--color--violet--200);
          @media (prefers-color-scheme: dark) {
            color: var(--color--violet--200);
            background-color: var(--color--violet--700);
          }
          ${{
            xs: css`
              width: var(--space--4);
              height: var(--space--4);
              vertical-align: var(--space---1);
            `,
            sm: css`
              width: var(--space--6);
              height: var(--space--6);
              vertical-align: var(--space---1-5);
            `,
            xl: css`
              width: var(--space--32);
              height: var(--space--32);
            `,
          }[size]}
          border-radius: var(--border-radius--circle);
        `)}"
      >
        <foreignObject x="2" y="-2" width="24" height="24">
          <span
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--xl);
              line-height: var(--line-height--xl);
            `)}"
          >
            <i class="bi bi-sunglasses"></i>
          </span>
        </foreignObject>
      </svg>`;

      if (name !== false)
        anonymousAvatar = html`<span
          class="${res.locals.localCSS(css`
            font-weight: var(--font-weight--bold);
          `)}"
          oninteractive="${javascript`
            tippy(this, {
              touch: false,
              content: "Anonymous to Other Students",
            });
          `}"
          >$${anonymousAvatar}  Anonymous</span
        >`;
    }

    return anonymous === false
      ? userAvatar
      : anonymous === "reveal"
      ? html`<span>$${anonymousAvatar} ($${userAvatar})</span>`
      : anonymous === true
      ? anonymousAvatar
      : html``;
  };

  const coursePartial = ({
    req,
    res,
    course,
    enrollment = undefined,
    tight = false,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    enrollment?: IsSignedInMiddlewareLocals["enrollments"][number];
    tight?: boolean;
  }): HTML => html`
    <div
      class="${res.locals.localCSS(css`
        display: flex;
        gap: var(--space--2);
        align-items: baseline;
      `)}"
    >
      <div>
        <div
          class="button button--tight ${tight
            ? "button--tight--inline"
            : ""} ${res.locals.localCSS(css`
            cursor: default;
            ${enrollment === undefined
              ? css``
              : css`
                  color: var(--color--${enrollment.accentColor}--700);
                  background-color: var(
                    --color--${enrollment.accentColor}--100
                  );
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--${enrollment.accentColor}--200);
                    background-color: var(
                      --color--${enrollment.accentColor}--800
                    );
                  }
                `}
          `)}"
        >
          $${enrollment === undefined
            ? html`<i class="bi bi-journal-arrow-down"></i>`
            : html`<i class="bi bi-journal-text"></i>`}
        </div>
      </div>
      <div>
        <div class="strong">${course.name}</div>
        <div
          class="secondary ${res.locals.localCSS(css`
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
          `)}"
        >
          $${[
            [course.year, course.term],
            [course.institution, course.code],
          ].flatMap((row) => {
            row = row.filter((element) => element !== null);
            return row.length === 0
              ? []
              : [
                  html`
                    <div>
                      $${row.map((element) => html`${element}`).join(" · ")}
                    </div>
                  `,
                ];
          })}
          $${enrollment === undefined
            ? html``
            : html`
                <div>
                  $${enrollmentRoleIcon[enrollment.role]
                    .regular} ${lodash.capitalize(enrollment.role)}
                </div>
              `}
        </div>
      </div>
    </div>
  `;

  const enrollmentRoleIcon = {
    student: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
  };

  const conversationTypeIcon = {
    announcement: {
      regular: html`<i class="bi bi-megaphone"></i>`,
      fill: html`<i class="bi bi-megaphone-fill"></i>`,
    },
    question: {
      regular: html`<i class="bi bi-patch-question"></i>`,
      fill: html`<i class="bi bi-patch-question-fill"></i>`,
    },
    note: {
      regular: html`<i class="bi bi-sticky"></i>`,
      fill: html`<i class="bi bi-sticky-fill"></i>`,
    },
    chat: {
      regular: html`<i class="bi bi-cup"></i>`,
      fill: html`<i class="bi bi-cup-fill"></i>`,
    },
  };

  const conversationTypeTextColor = {
    announcement: {
      display: "text--fuchsia",
      select: "text--fuchsia",
    },
    question: {
      display: "text--rose",
      select: "text--rose",
    },
    note: {
      display: "",
      select: "text--blue",
    },
    chat: {
      display: "text--cyan",
      select: "text--cyan",
    },
  };

  const reportIssueHref = `mailto:${administratorEmail}${qs.stringify(
    {
      subject: "Report an Issue",
      body: dedent`
        What did you try to do?



        What did you expect to happen?



        What really happened?



        What error messages (if any) did you run into?



        Please provide as much relevant context as possible (operating system, browser, and so forth):

        CourseLore Version: ${courseloreVersion}
      `,
    },
    {
      addQueryPrefix: true,
    }
  )}`;

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.static(url.fileURLToPath(new URL("../static", import.meta.url)))
  );
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(methodOverride("_method"));
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(cookieParser());
  const cookieOptions = {
    domain: new URL(baseURL).hostname,
    httpOnly: true,
    path: new URL(baseURL).pathname,
    sameSite: "lax",
    secure: true,
  } as const;
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.urlencoded({ extended: true })
  );
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    csurf({
      cookie: {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      },
    })
  );

  if (liveReload)
    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/live-reload",
      (req, res, next) => {
        res.type("text/event-stream").flushHeaders();
      }
    );

  const eventDestinations = new Set<{
    req: express.Request;
    res: express.Response;
  }>();

  interface EventSourceMiddlewareLocals extends BaseMiddlewareLocals {
    eventSource: boolean;
  }
  const eventSourceMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    EventSourceMiddlewareLocals
  >[] = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        res.locals.eventSource = true;
        return next();
      }
      const eventDestination = { req, res };
      eventDestinations.add(eventDestination);
      res.once("close", () => {
        eventDestinations.delete(eventDestination);
      });
      res.type("text/event-stream").flushHeaders();
    },
  ];

  const Flash = {
    maxAge: 5 * 60 * 1000,

    set({
      req,
      res,
      content,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
      content: HTML;
    }): void {
      const flash = database.get<{ nonce: string }>(
        sql`
          INSERT INTO "flashes" ("createdAt", "nonce", "content")
          VALUES (
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 10, type: "alphanumeric" })},
            ${content}
          )
          RETURNING *
        `
      )!;
      req.cookies.flash = flash.nonce;
      res.cookie("flash", flash.nonce, {
        ...cookieOptions,
        maxAge: Flash.maxAge,
      });
    },

    get({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): HTML | undefined {
      if (req.cookies.flash === undefined) return undefined;
      const flash = database.get<{
        id: number;
        content: HTML;
      }>(
        sql`SELECT "id", "content" FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      delete req.cookies.flash;
      res.clearCookie("flash", cookieOptions);
      if (flash === undefined) return undefined;
      database.run(
        sql`
          DELETE FROM "flashes" WHERE "id" = ${flash.id}
        `
      );
      return flash.content;
    },
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "flashes"
        WHERE "createdAt" < ${new Date(Date.now() - Flash.maxAge).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  const Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open({
      req,
      res,
      userId,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
      userId: number;
    }): void {
      const session = database.get<{
        token: string;
      }>(
        sql`
          INSERT INTO "sessions" ("createdAt", "token", "user")
          VALUES (
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })},
            ${userId}
          )
          RETURNING *
        `
      )!;
      req.cookies.session = session.token;
      res.cookie("session", session.token, {
        ...cookieOptions,
        maxAge: Session.maxAge,
      });
    },

    get({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): number | undefined {
      if (req.cookies.session === undefined) return undefined;
      const session = database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() < Date.now() - Session.maxAge
      ) {
        Session.close({ req, res });
        return undefined;
      } else if (
        new Date(session.createdAt).getTime() <
        Date.now() - Session.maxAge / 2
      ) {
        Session.close({ req, res });
        Session.open({ req, res, userId: session.user });
      }
      database.run(
        sql`
          UPDATE "users"
          SET "lastSeenOnlineAt" = ${new Date().toISOString()}
          WHERE "id" = ${session.user}
        `
      );
      return session.user;
    },

    close({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): void {
      if (req.cookies.session === undefined) return;
      delete req.cookies.session;
      res.clearCookie("session", cookieOptions);
      database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
    },

    closeAllAndReopen({
      req,
      res,
      userId,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
      userId: number;
    }): void {
      Session.close({ req, res });
      database.run(sql`DELETE FROM "sessions" WHERE "user" = ${userId}`);
      Session.open({ req, res, userId });
    },
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "sessions"
        WHERE "createdAt" < ${new Date(
          Date.now() - Session.maxAge
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  interface IsSignedOutMiddlewareLocals extends BaseMiddlewareLocals {}
  const isSignedOutMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedOutMiddlewareLocals
  >[] = [
    (req, res, next) => {
      if (Session.get({ req, res }) !== undefined) return next("route");
      next();
    },
  ];

  interface IsSignedInMiddlewareLocals extends BaseMiddlewareLocals {
    user: {
      id: number;
      lastSeenOnlineAt: string;
      email: string;
      password: string;
      emailConfirmedAt: string | null;
      name: string;
      avatar: string | null;
      avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
      biographySource: string | null;
      biographyPreprocessed: HTML | null;
      emailNotifications: UserEmailNotifications;
    };
    invitations: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        nextConversationReference: number;
      };
      reference: string;
      role: EnrollmentRole;
    }[];
    enrollments: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        nextConversationReference: number;
      };
      reference: string;
      role: EnrollmentRole;
      accentColor: EnrollmentAccentColor;
    }[];
  }
  const isSignedInMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedInMiddlewareLocals
  >[] = [
    (req, res, next) => {
      const userId = Session.get({ req, res });
      if (userId === undefined) return next("route");

      res.locals.user = database.get<{
        id: number;
        lastSeenOnlineAt: string;
        email: string;
        password: string;
        emailConfirmedAt: string | null;
        name: string;
        avatar: string | null;
        avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
        biographySource: string | null;
        biographyPreprocessed: HTML | null;
        emailNotifications: UserEmailNotifications;
      }>(
        sql`
          SELECT "id",
                 "lastSeenOnlineAt",
                 "email",
                 "password",
                 "emailConfirmedAt",
                 "name",
                 "avatar",
                 "avatarlessBackgroundColor",
                 "biographySource",
                 "biographyPreprocessed",
                 "emailNotifications"
          FROM "users"
          WHERE "id" = ${userId}
        `
      )!;

      res.locals.invitations = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          role: EnrollmentRole;
        }>(
          sql`
            SELECT "invitations"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
                   "invitations"."reference",
                   "invitations"."role"
            FROM "invitations"
            JOIN "courses" ON "invitations"."course" = "courses"."id"
            WHERE "invitations"."usedAt" IS NULL AND (
                    "invitations"."expiresAt" IS NULL OR
                    ${new Date().toISOString()} < "invitations"."expiresAt"
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
            year: invitation.courseYear,
            term: invitation.courseTerm,
            institution: invitation.courseInstitution,
            code: invitation.courseCode,
            nextConversationReference:
              invitation.courseNextConversationReference,
          },
          reference: invitation.reference,
          role: invitation.role,
        }));

      res.locals.enrollments = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          role: EnrollmentRole;
          accentColor: EnrollmentAccentColor;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
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
            year: enrollment.courseYear,
            term: enrollment.courseTerm,
            institution: enrollment.courseInstitution,
            code: enrollment.courseCode,
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

  app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
    "/files/*",
    express.static(dataDirectory, {
      index: false,
      dotfiles: "allow",
      immutable: true,
      maxAge: 60 * 24 * 60 * 60 * 1000,
      setHeaders: (res, path, stat) => {
        res.attachment();
      },
    })
  );

  const aboutRequestHandler: express.RequestHandler<
    {},
    any,
    {},
    {},
    BaseMiddlewareLocals & Partial<IsSignedInMiddlewareLocals>
  > = (req, res, next) => {
    res.send(
      baseLayout({
        req,
        res,
        head: html`
          <title>CourseLore · Communication Platform for Education</title>
        `,
        body: html`
          <div
            class="${res.locals.localCSS(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--20) var(--space--8);
              align-items: center;
              @media (max-width: 959px) {
                flex-direction: column;
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <a
                href="https://courselore.org/about"
                class="heading--display button button--transparent ${res.locals
                  .localCSS(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                $${logo({ size: 48 /* var(--space--12) */ })} CourseLore
              </a>
              <h3
                class="secondary ${res.locals.localCSS(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Communication Platform for Education
              </h3>

              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  & > * {
                    display: flex;
                    gap: var(--space--4);
                    & > * {
                      flex: 1;
                    }
                    @media (max-width: 459px) {
                      flex-direction: column;
                    }
                  }
                `)}"
              >
                <div>
                  <a
                    href="https://courselore.org/sign-in"
                    class="button button--blue"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "A CourseLore installation managed by the developers of CourseLore. Free for a limited time.",
                      });
                    `}"
                  >
                    <i class="bi bi-stars"></i>
                    Hosted Installation
                  </a>
                  <a
                    href="https://try.courselore.org/sign-in"
                    class="button button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "A CourseLore installation running the latest development version. Not for use with real courses.",
                      });
                    `}"
                  >
                    <i class="bi bi-tools"></i>
                    Development Installation
                  </a>
                </div>

                <div>
                  <a
                    href="https://courselore.org/courses/8537410611/invitations/3667859788"
                    class="button button--transparent ${res.locals.localCSS(
                      css`
                        align-items: center;
                      `
                    )}"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "Join the CourseLore community on Meta CourseLore, a CourseLore course that isn’t really a course, but a place to talk about CourseLore itself.",
                      });
                    `}"
                  >
                    $${logo({ size: 16 /* var(--space--4) */ })} Meta CourseLore
                  </a>
                  <a
                    href="https://github.com/courselore/courselore"
                    class="button button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "CourseLore is open source and will be free forever for installing on your own server.",
                      });
                    `}"
                  >
                    <i class="bi bi-file-earmark-code"></i>
                    Source Code
                  </a>
                </div>
              </div>
            </div>

            <div
              class="${res.locals.localCSS(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--light.png"
                alt="CourseLore Main Screen"
                width="960"
                loading="lazy"
                class="img light ${res.locals.localCSS(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
              <img
                src="/main-screen--dark.png"
                alt="CourseLore Main Screen"
                width="960"
                loading="lazy"
                class="img dark ${res.locals.localCSS(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              padding: var(--space--32) var(--space--8);
              display: flex;
              justify-content: center;
              @media (max-width: 1149px) {
                flex-direction: column;
                align-items: center;
                gap: var(--space--14);
              }
              @media (min-width: 1150px) {
                gap: var(--space--8);
              }
              & > * {
                flex: 1;
                max-width: var(--width--sm);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                align-items: center;
                text-align: center;
                & > :first-child {
                  display: flex;
                  gap: var(--space--4);
                  align-items: center;
                  & > :first-child {
                    border-radius: var(--border-radius--circle);
                    width: var(--space--10);
                    height: var(--space--10);
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: var(--font-size--xl);
                    line-height: var(--line-height--xl);
                  }
                  & > :last-child {
                    font-size: var(--font-size--3xl);
                    line-height: var(--line-height--3xl);
                    font-weight: var(--font-weight--black);
                    text-align: left;
                  }
                }
              }
            `)}"
          >
            <div>
              <div>
                <div
                  class="${res.locals.localCSS(css`
                    color: var(--color--violet--700);
                    background-color: var(--color--violet--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--violet--200);
                      background-color: var(--color--violet--700);
                    }
                  `)}"
                >
                  <i class="bi bi-chat-left-text"></i>
                </div>
                <h2 class="heading--display">Forum & Chat</h2>
              </div>
              <p class="secondary">
                Question & answer. Announcements. Comprehensive search.
                Notifications.
              </p>
            </div>

            <div>
              <div>
                <div
                  class="${res.locals.localCSS(css`
                    color: var(--color--pink--700);
                    background-color: var(--color--pink--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--pink--200);
                      background-color: var(--color--pink--700);
                    }
                  `)}"
                >
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <h2 class="heading--display">For Education</h2>
              </div>
              <p class="secondary">
                Anonymity. Private questions. Straightforward invitation system.
              </p>
            </div>

            <div>
              <div>
                <div
                  class="${res.locals.localCSS(css`
                    color: var(--color--green--700);
                    background-color: var(--color--green--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--green--200);
                      background-color: var(--color--green--700);
                    }
                  `)}"
                >
                  <i class="bi bi-file-earmark-code"></i>
                </div>
                <h2 class="heading--display">Open Source</h2>
              </div>
              <p class="secondary">
                Easy to self-host for maximum privacy & control. <br />
                Welcoming to first-time contributors.
              </p>
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              @media (max-width: 889px) {
                flex-direction: column;
              }
              @media (min-width: 890px) {
                flex-direction: row-reverse;
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display ${res.locals.localCSS(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                Carefully Designed
              </p>
              <p
                class="secondary ${res.locals.localCSS(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Beautiful during the day. Elegant at night. <br />
                Always a joy to look at.
              </p>
            </div>

            <div
              class="${res.locals.localCSS(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--light-and-dark.png"
                alt="CourseLore Main Screen Featuring Light & Dark Modes"
                width="960"
                loading="lazy"
                class="img ${res.locals.localCSS(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              justify-content: center;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              @media (max-width: 889px) {
                flex-direction: column;
                gap: var(--space--14);
              }
              @media (min-width: 890px) {
                gap: var(--space--24);
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display ${res.locals.localCSS(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                First-Class <br />
                Mobile Support
              </p>
              <p
                class="secondary ${res.locals.localCSS(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                It just works. Right from the browser. <br />
                No nagging to install an app.
              </p>
            </div>

            <div
              class="${res.locals.localCSS(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--phone--light.jpeg"
                alt="CourseLore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img light ${res.locals.localCSS(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
              <img
                src="/main-screen--phone--dark.jpeg"
                alt="CourseLore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img dark ${res.locals.localCSS(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--36) var(--space--8);
              align-items: center;
              @media (max-width: 859px) {
                flex-direction: column;
              }
              @media (min-width: 860px) {
                flex-direction: row-reverse;
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display ${res.locals.localCSS(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                Rich-Text Messages
              </p>
              <p
                class="secondary ${res.locals.localCSS(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Markdown
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent ${res
                    .locals.localCSS(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  oninteractive="${javascript`
                    tippy(this, {
                      trigger: "click",
                      content: "A straightforward way to make text bold, include links, and so forth.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  LaTeX
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent ${res
                    .locals.localCSS(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  oninteractive="${javascript`
                    tippy(this, {
                      trigger: "click",
                      content: "A way to write mathematical formulas.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  Syntax highlighting
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent ${res
                    .locals.localCSS(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  oninteractive="${javascript`
                    tippy(this, {
                      trigger: "click",
                      content: "Color computer code to make it easier to read.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                <br />
                Try it for yourself.
              </p>
            </div>

            <div
              class="${res.locals.localCSS(css`
                flex: 1;
                max-width: calc(min(var(--width--xl), 100%));
              `)}"
            >
              $${contentEditor({
                req,
                res,
                contentSource: dedent`
                  # Reasons to **Love** CourseLore’s Message Editor

                  **Easy** to learn for people who are new to [Markdown](https://guides.github.com/features/mastering-markdown/).

                  Support for [mathematical formulas](https://katex.org/docs/supported.html):

                  $$

                  X_k = \sum_{n=0}^{N-1} x_n \cdot e^{-\frac{i2\pi}{N}kn}

                  $$

                  Gorgeous [syntax highlighter](https://shiki.matsu.io/):

                  \`\`\`javascript
                  import shiki from "shiki";

                  const highlighter = await shiki.getHighlighter({
                    theme: "nord",
                  });
                  console.log(highlighter.codeToHtml(\`console.log("shiki");\`, "js"));
                  \`\`\`

                  Add images & attachments by simply drag-and-dropping or copy-and-pasting.
                `,
                required: false,
                skipIsModified: true,
                expanded: true,
              })}
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              flex-direction: column;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              gap: var(--space--14);
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <h2
                class="heading--display ${res.locals.localCSS(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                The Team
              </h2>
            </div>

            <div
              class="${res.locals.localCSS(css`
                display: flex;
                gap: var(--space--14);
                @media (max-width: 1289px) {
                  flex-direction: column;
                }
                & > * {
                  display: flex;
                  gap: var(--space--4);
                  align-items: center;
                  max-width: var(--width--sm);
                  & > img {
                    background-color: transparent;
                    width: var(--space--24);
                    border-radius: var(--border-radius--circle);
                  }
                }
              `)}"
            >
              <div>
                <img
                  src="/team/scott-smith.png"
                  alt="Dr. Scott Smith"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <a
                    href="https://www.cs.jhu.edu/~scott/"
                    class="button button--tight button--tight--inline button--inline button--transparent strong"
                  >
                    Dr. Scott Smith
                  </a>
                  <br />
                  <span class="secondary">
                    CEO. Professor of Computer Science at The Johns Hopkins
                    University.
                  </span>
                </p>
              </div>

              <div>
                <img
                  src="/team/ali-madooei.png"
                  alt="Dr. Ali Madooei"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <a
                    href="https://www.cs.jhu.edu/faculty/ali-madooei/"
                    class="button button--tight button--tight--inline button--inline button--transparent strong"
                  >
                    Dr. Ali Madooei
                  </a>
                  <br />
                  <span class="secondary">
                    Consultant. Lecturer of Computer Science at The Johns
                    Hopkins University.
                  </span>
                </p>
              </div>

              <div>
                <img
                  src="/team/leandro-facchinetti.png"
                  alt="Leandro Facchinetti"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <a
                    href="https://leafac.com"
                    class="button button--tight button--tight--inline button--inline button--transparent strong"
                  >
                    Leandro Facchinetti
                  </a>
                  <br />
                  <span class="secondary">
                    Software Developer & Designer.
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--xl);
              line-height: var(--line-height--xl);
              font-weight: var(--font-weight--bold);
              display: flex;
              gap: var(--space--8);
              justify-content: center;
              padding: var(--space--36) var(--space--8);
              align-items: center;
              @media (max-width: 1099px) {
                flex-direction: column;
              }
            `)}"
          >
            <a
              href="https://courselore.org/sign-in"
              class="button button--blue"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: "A CourseLore installation managed by the developers of CourseLore. Free for a limited time.",
                });
              `}"
            >
              <i class="bi bi-stars"></i>
              Hosted Installation
            </a>
            <a
              href="https://try.courselore.org/sign-in"
              class="button button--transparent"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: "A CourseLore installation running the latest development version. Not for use with real courses.",
                });
              `}"
            >
              <i class="bi bi-tools"></i>
              Development Installation
            </a>
            <a
              href="https://courselore.org/courses/8537410611/invitations/3667859788"
              class="button button--transparent ${res.locals.localCSS(
                css`
                  align-items: center;
                `
              )}"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: "Join the CourseLore community on Meta CourseLore, a CourseLore course that isn’t really a course, but a place to talk about CourseLore itself.",
                });
              `}"
            >
              $${logo({ size: 24 /* var(--space--6) */ })} Meta CourseLore
            </a>
            <a
              href="https://github.com/courselore/courselore"
              class="button button--transparent"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: "CourseLore is open source and will be free forever for installing on your own server.",
                });
              `}"
            >
              <i class="bi bi-file-earmark-code"></i>
              Source Code
            </a>
          </div>
        `,
      })
    );
  };

  const signInRequestHandler: express.RequestHandler<
    {},
    HTML,
    {},
    { email?: string },
    IsSignedOutMiddlewareLocals
  > = (req, res) => {
    res.send(
      boxLayout({
        req,
        res,
        head: html`
          <title>
            Sign in · CourseLore · Communication Platform for Education
          </title>
        `,
        body: html`
          <form
            method="POST"
            action="${baseURL}/sign-in${qs.stringify(req.query, {
              addQueryPrefix: true,
            })}"
            novalidate
            class="${res.locals.localCSS(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
              />
            </label>
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
          <div
            class="${res.locals.localCSS(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `)}"
          >
            <p>
              Don’t have an account?
              <a
                href="${baseURL}/sign-up${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Sign up</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="${baseURL}/reset-password${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Reset password</a
              >.
            </p>
          </div>
        `,
      })
    );
  };

  const canonicalBaseURL = "https://courselore.org";
  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/",
    ...isSignedOutMiddleware,
    baseURL === canonicalBaseURL ? aboutRequestHandler : signInRequestHandler
  );

  const shouldDisplayAbout =
    baseURL === canonicalBaseURL || process.env.NODE_ENV !== "production";
  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/about",
    ...isSignedOutMiddleware,
    shouldDisplayAbout
      ? aboutRequestHandler
      : (req, res) => {
          res.redirect(`${canonicalBaseURL}/about`);
        }
  );
  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/about",
    ...isSignedInMiddleware,
    shouldDisplayAbout
      ? aboutRequestHandler
      : (req, res) => {
          res.redirect(`${canonicalBaseURL}/about`);
        }
  );

  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/sign-in",
    ...isSignedOutMiddleware,
    signInRequestHandler
  );
  app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/sign-in",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  app.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-in",
    ...isSignedOutMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.email !== "string" ||
        req.body.email.match(emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === ""
      )
        return next("validation");
      const user = database.get<{ id: number; password: string }>(
        sql`SELECT "id", "password" FROM "users" WHERE "email" = ${req.body.email}`
      );
      if (
        user === undefined ||
        !(await argon2.verify(user.password, req.body.password))
      ) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">Incorrect email & password.</div>
          `,
        });
        return res.redirect(
          `${baseURL}/sign-in${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }
      Session.open({ req, res, userId: user.id });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  const PasswordReset = {
    maxAge: 10 * 60 * 1000,

    create(userId: number): string {
      database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "user" = ${userId}
        `
      );
      return database.get<{ nonce: string }>(
        sql`
          INSERT INTO "passwordResets" ("createdAt", "user", "nonce")
          VALUES (
            ${new Date().toISOString()},
            ${userId},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
          )
          RETURNING *
        `
      )!.nonce;
    },

    get(nonce: string): number | undefined {
      const passwordReset = database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "passwordResets" WHERE "nonce" = ${nonce}`
      );
      database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "nonce" = ${nonce}
        `
      );
      return passwordReset === undefined ||
        new Date(passwordReset.createdAt).getTime() <
          Date.now() - PasswordReset.maxAge
        ? undefined
        : passwordReset.user;
    },
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "passwordResets"
        WHERE "createdAt" < ${new Date(
          Date.now() - PasswordReset.maxAge
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  app.get<{}, HTML, {}, { email?: string }, BaseMiddlewareLocals>(
    "/reset-password",
    (req, res) => {
      res.send(
        boxLayout({
          req,
          res,
          head: html`
            <title>
              Reset Password · CourseLore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="${baseURL}/reset-password${qs.stringify(req.query, {
                addQueryPrefix: true,
              })}"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
                />
              </label>
              <button class="button button--blue">
                <i class="bi bi-key"></i>
                Reset Password
              </button>
            </form>
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <p>
                Don’t have an account?
                <a
                  href="${baseURL}/sign-up${qs.stringify(req.query, {
                    addQueryPrefix: true,
                  })}"
                  class="link"
                  >Sign up</a
                >.
              </p>
              <p>
                Remember your password?
                <a
                  href="${baseURL}/sign-in${qs.stringify(req.query, {
                    addQueryPrefix: true,
                  })}"
                  class="link"
                  >Sign in</a
                >.
              </p>
            </div>
          `,
        })
      );
    }
  );

  app.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    {},
    BaseMiddlewareLocals
  >("/reset-password", (req, res, next) => {
    if (
      typeof req.body.email !== "string" ||
      req.body.email.match(emailRegExp) === null
    )
      return next("validation");

    const user = database.get<{ id: number; email: string }>(
      sql`SELECT "id", "email" FROM "users" WHERE "email" = ${req.body.email}`
    );
    if (user === undefined) {
      Flash.set({
        req,
        res,
        content: html`<div class="flash--rose">Email not found.</div>`,
      });
      return res.redirect(
        `${baseURL}/reset-password${qs.stringify(req.query, {
          addQueryPrefix: true,
        })}`
      );
    }

    const link = `${baseURL}/reset-password/${PasswordReset.create(
      user.id
    )}${qs.stringify(req.query, { addQueryPrefix: true })}`;
    database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            to: user.email,
            subject: "CourseLore · Password Reset Link",
            html: html`
              <p><a href="${link}" target="_blank">${link}</a></p>
              <p>
                <small>
                  This password reset link is valid for ten minutes.<br />
                  You may ignore this password reset link if you didn’t request
                  it.
                </small>
              </p>
            `,
          })}
        )
      `
    );
    sendEmailWorker();
    if (req.body.resend === "true")
      Flash.set({
        req,
        res,
        content: html`<div class="flash--green">Email resent.</div>`,
      });
    res.send(
      boxLayout({
        req,
        res,
        head: html`
          <title>
            Reset Password · CourseLore · Communication Platform for Education
          </title>
        `,
        body: html`
          <p>
            To continue resetting your password, please follow the password
            reset link that was sent to
            <strong class="strong">${req.body.email}</strong>.
          </p>
          <form
            method="POST"
            action="${baseURL}/reset-password${qs.stringify(req.query, {
              addQueryPrefix: true,
            })}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <input type="hidden" name="email" value="${req.body.email}" />
            <input type="hidden" name="resend" value="true" />
            <p>
              Didn’t receive the email? Already checked your spam folder?
              <button class="link">Resend</button>.
            </p>
          </form>
        `,
      })
    );
  });

  app.get<{ passwordResetNonce: string }, HTML, {}, {}, BaseMiddlewareLocals>(
    "/reset-password/:passwordResetNonce",
    (req, res) => {
      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              This password reset link is invalid or expired.
            </div>
          `,
        });
        return res.redirect(
          `${baseURL}/reset-password${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }
      res.send(
        boxLayout({
          req,
          res,
          head: html`
            <title>
              Reset Password · CourseLore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="${baseURL}/reset-password/${PasswordReset.create(
                userId
              )}${qs.stringify(req.query, { addQueryPrefix: true })}"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
                  oninteractive="${javascript`
                    (this.validators ??= []).push(() => {
                      if (this.value !== this.closest("form").querySelector('[name="password"]').value)
                        return "Password & Password Confirmation don’t match.";
                    });
                  `}"
                />
              </label>
              <button class="button button--blue">
                <i class="bi bi-key"></i>
                Reset Password
              </button>
            </form>
          `,
        })
      );
    }
  );

  app.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string },
    BaseMiddlewareLocals
  >(
    "/reset-password/:passwordResetNonce",
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              Something went wrong in your password reset. Please start over.
            </div>
          `,
        });
        return res.redirect(
          `${baseURL}/reset-password${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }

      database.run(
        sql`
          UPDATE "users"
          SET "password" = ${await argon2.hash(
            req.body.password,
            argon2Options
          )}
          WHERE "id" = ${userId}
        `
      )!;
      Session.closeAllAndReopen({ req, res, userId });
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Password reset successfully.</div>
        `,
      });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  app.get<
    {},
    HTML,
    {},
    { name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/sign-up", ...isSignedOutMiddleware, (req, res) => {
    res.send(
      boxLayout({
        req,
        res,
        head: html`
          <title>
            Sign up · CourseLore · Communication Platform for Education
          </title>
        `,
        body: html`
          <form
            method="POST"
            action="${baseURL}/sign-up${qs.stringify(req.query, {
              addQueryPrefix: true,
            })}"
            novalidate
            class="${res.locals.localCSS(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
                oninteractive="${javascript`
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
          <div
            class="${res.locals.localCSS(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `)}"
          >
            <p>
              Already have an account account?
              <a
                href="${baseURL}/sign-in${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Sign in</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="${baseURL}/reset-password${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Reset password</a
              >.
            </p>
          </div>
        `,
      })
    );
  });
  app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/sign-up",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  const sendEmailConfirmationEmail = ({
    req,
    res,
    userId,
    userEmail,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    userId: number;
    userEmail: string;
  }): void => {
    const emailConfirmation = database.executeTransaction(() => {
      database.run(
        sql`
          DELETE FROM "emailConfirmations" WHERE "user" = ${userId}
        `
      );
      return database.get<{
        nonce: string;
      }>(
        sql`
          INSERT INTO "emailConfirmations" ("createdAt", "user", "nonce")
          VALUES (
            ${new Date().toISOString()},
            ${userId},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
          )
          RETURNING *
        `
      )!;
    });

    const link = `${baseURL}/email-confirmation/${
      emailConfirmation.nonce
    }${qs.stringify({ redirect: req.originalUrl }, { addQueryPrefix: true })}`;
    database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            to: userEmail,
            subject: "Welcome to CourseLore!",
            html: html`
              <p>
                Please confirm your email:<br />
                <a href="${link}" target="_blank">${link}</a>
              </p>
            `,
          })}
        )
      `
    );
    sendEmailWorker();
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "emailConfirmations"
        WHERE "createdAt" < ${new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  app.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-up",
    ...isSignedOutMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        typeof req.body.email !== "string" ||
        req.body.email.match(emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      if (
        database.get<{ exists: number }>(
          sql`
            SELECT EXISTS(
              SELECT 1 FROM "users" WHERE "email" = ${req.body.email}
            ) AS "exists"
          `
        )!.exists === 1
      ) {
        Flash.set({
          req,
          res,
          content: html`<div class="flash--rose">Email already taken.</div>`,
        });
        return res.redirect(
          `${baseURL}/sign-in${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }

      const user = database.get<{ id: number; email: string }>(
        sql`
          INSERT INTO "users" (
            "createdAt",
            "lastSeenOnlineAt",
            "email",
            "password",
            "emailConfirmedAt",
            "name",
            "nameSearch",
            "avatarlessBackgroundColor",
            "emailNotifications"
          )
          VALUES (
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${req.body.email},
            ${await argon2.hash(req.body.password, argon2Options)},
            ${null},
            ${req.body.name},
            ${html`${req.body.name}`},
            ${lodash.sample(userAvatarlessBackgroundColors)},
            ${"staff-announcements-and-mentions"}
          )
          RETURNING *
        `
      )!;

      sendEmailConfirmationEmail({
        req,
        res,
        userId: user.id,
        userEmail: user.email,
      });
      Session.open({ req, res, userId: user.id });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/resend-confirmation-email",
    ...isSignedInMiddleware,
    (req, res) => {
      if (res.locals.user.emailConfirmedAt !== null) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">Email already confirmed.</div>
          `,
        });
        return res.redirect("back");
      }
      sendEmailConfirmationEmail({
        req,
        res,
        userId: res.locals.user.id,
        userEmail: res.locals.user.email,
      });
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Confirmation email resent.</div>
        `,
      });
      res.redirect("back");
    }
  );

  app.get<
    { emailConfirmationNonce: string },
    HTML,
    {},
    { redirect?: string },
    IsSignedInMiddlewareLocals
  >(
    "/email-confirmation/:emailConfirmationNonce",
    ...isSignedInMiddleware,
    (req, res) => {
      const emailConfirmation = database.get<{ user: number }>(
        sql`
          SELECT "user" FROM "emailConfirmations" WHERE "nonce" = ${req.params.emailConfirmationNonce}
        `
      );
      database.run(
        sql`
          DELETE FROM "emailConfirmations" WHERE "nonce" = ${req.params.emailConfirmationNonce}
        `
      );
      if (
        emailConfirmation === undefined ||
        emailConfirmation.user !== res.locals.user.id
      ) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              This email confirmation link is invalid or belongs to a different
              account.
            </div>
          `,
        });
        return res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
      }
      database.run(
        sql`
          UPDATE "users"
          SET "emailConfirmedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.user.id}
        `
      );
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Email confirmed successfully.</div>
        `,
      });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  app.delete<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/sign-out",
    ...isSignedInMiddleware,
    (req, res) => {
      Session.close({ req, res });
      res.redirect(`${baseURL}/`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/",
    ...isSignedInMiddleware,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          res.send(
            mainLayout({
              req,
              res,
              head: html`<title>CourseLore</title>`,
              body: html`
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `)}"
                >
                  <h2 class="heading--display">Welcome to CourseLore!</h2>

                  <div class="decorative-icon">
                    $${logo({ size: 144 /* var(--space--36) */ })}
                  </div>

                  <div class="menu-box">
                    <a
                      href="${baseURL}/settings/profile"
                      class="menu-box--item button button--blue"
                    >
                      <i class="bi bi-person-circle"></i>
                      Fill in Your Profile
                    </a>
                    <button
                      class="menu-box--item button button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          trigger: "click",
                          content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                        });
                      `}"
                    >
                      <i class="bi bi-journal-arrow-down"></i>
                      Enroll in an Existing Course
                    </button>
                    <a
                      href="${baseURL}/courses/new"
                      class="menu-box--item button button--transparent"
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
            `${baseURL}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
            mainLayout({
              req,
              res,
              head: html`<title>CourseLore</title>`,
              showCourseSwitcher: false,
              body: html`
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `)}"
                >
                  <div class="decorative-icon">
                    <i class="bi bi-journal-text"></i>
                  </div>

                  <p class="secondary">Go to one of your courses.</p>

                  <div class="menu-box">
                    $${res.locals.enrollments.map(
                      (enrollment) =>
                        html`
                          <a
                            href="${baseURL}/courses/${enrollment.course
                              .reference}"
                            class="menu-box--item button button--tight button--transparent"
                          >
                            $${coursePartial({
                              req,
                              res,
                              course: enrollment.course,
                              enrollment,
                            })}
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

  const userSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }) =>
    settingsLayout({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        User Settings
      `,
      menu: html`
        <a
          href="${baseURL}/settings/profile"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/profile"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-person-circle"></i>
          Profile
        </a>
        <a
          href="${baseURL}/settings/update-email-and-password"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/update-email-and-password"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-key"></i>
          Update Email & Password
        </a>
        <a
          href="${baseURL}/settings/notifications-preferences"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/notifications-preferences"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-bell"></i>
          Notifications Preferences
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}/settings/profile`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>Profile · User Settings · CourseLore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-person-circle"></i>
              Profile
            </h2>

            <form
              method="POST"
              action="${baseURL}/settings/profile?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--4);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `)}"
              >
                <div
                  class="avatar-chooser ${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    & > * {
                      width: var(--space--32);
                      height: var(--space--32);
                    }
                  `)}"
                  ondragover="${javascript`
                    event.preventDefault();
                  `}"
                  ondrop="${javascript`
                    event.preventDefault();
                    this.querySelector(".avatar-chooser--upload").upload(event.dataTransfer.files);
                  `}"
                >
                  <div
                    class="avatar-chooser--empty"
                    $${res.locals.user.avatar === null ? html`` : html`hidden`}
                  >
                    <button
                      type="button"
                      class="button button--transparent ${res.locals
                        .localCSS(css`
                        transform: scale(8)
                          translate(
                            calc(var(--space---px) + 50% + var(--space---px)),
                            calc(var(--space---px) + 50% + var(--space---px))
                          );
                        padding: var(--space--px);
                        margin: var(--space---px);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Add Avatar",
                        });
                      `}"
                      onclick="${javascript`
                        this.closest("form").querySelector(".avatar-chooser--upload").click();
                      `}"
                    >
                      $${userPartial({
                        req,
                        res,
                        user: { ...res.locals.user, avatar: null },
                        decorate: false,
                        name: false,
                        size: "xs",
                      })}
                    </button>
                  </div>
                  <div
                    $${res.locals.user.avatar === null ? html`hidden` : html``}
                    class="avatar-chooser--filled ${res.locals.localCSS(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                        position: relative;
                      }
                    `)}"
                  >
                    <button
                      type="button"
                      class="button button--transparent ${res.locals
                        .localCSS(css`
                        padding: var(--space--2);
                        margin: var(--space---2);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Update Avatar",
                        });
                      `}"
                      onclick="${javascript`
                        this.closest("form").querySelector(".avatar-chooser--upload").click();
                      `}"
                    >
                      <img
                        src="${res.locals.user.avatar ?? ""}"
                        alt="Avatar"
                        loading="lazy"
                        class="${res.locals.localCSS(css`
                          width: 100%;
                          height: 100%;
                          border-radius: var(--border-radius--circle);
                        `)}"
                      />
                    </button>
                    <button
                      type="button"
                      class="button button--rose ${res.locals.localCSS(css`
                        place-self: end;
                        width: var(--font-size--2xl);
                        height: var(--font-size--2xl);
                        padding: var(--space--0);
                        border-radius: var(--border-radius--circle);
                        transform: translate(-20%, -20%);
                        align-items: center;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          theme: "rose",
                          touch: false,
                          content: "Remove Avatar",
                        });
                      `}"
                      onclick="${javascript`
                        const form = this.closest("form");
                        const avatar = form.querySelector('[name="avatar"]')
                        avatar.value = "";
                        form.querySelector(".avatar-chooser--empty").hidden = false;
                        form.querySelector(".avatar-chooser--filled").hidden = true;
                      `}"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <input
                    type="file"
                    class="avatar-chooser--upload"
                    accept="image/*"
                    hidden
                    data-skip-is-modified="true"
                    oninteractive="${javascript`
                      const avatarChooser = this.closest(".avatar-chooser");
                      const avatar = avatarChooser.querySelector('[name="avatar"]');
                      const avatarEmpty = avatarChooser.querySelector(".avatar-chooser--empty");
                      const avatarFilled = avatarChooser.querySelector(".avatar-chooser--filled");
                      const uploadingIndicator = tippy(avatarChooser, {
                        trigger: "manual",
                        hideOnClick: false,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                gap: var(--space--2);
                              `)}"
                            >
                              $${spinner({ req, res })} Uploading…
                            </div>
                          `
                        )},
                      });
                      this.upload = async (fileList) => {
                        const body = new FormData();
                        body.append("_csrf", ${JSON.stringify(
                          req.csrfToken()
                        )});
                        body.append("avatar", fileList[0]);
                        this.value = "";
                        tippy.hideAll();
                        uploadingIndicator.show();
                        const response = await fetch("${baseURL}/settings/profile/avatar", {
                          method: "POST",
                          body,
                        });
                        uploadingIndicator.hide();
                        if (!response.ok) {
                          const tooltip = tippy(avatarChooser, {
                            theme: "validation--error",
                            trigger: "manual",
                            showOnCreate: true,
                            onHidden: () => {
                              tooltip.destroy();
                            },
                            content: await response.text(),
                          });
                          return;
                        }
                        const avatarURL = await response.text();
                        avatar.value = avatarURL;
                        avatarEmpty.hidden = true;
                        avatarFilled.hidden = false;
                        avatarFilled.querySelector("img").setAttribute("src", avatarURL);
                      };
                    `}"
                    onchange="${javascript`
                      this.upload(this.files);
                    `}"
                  />
                  <input
                    type="text"
                    name="avatar"
                    value="${res.locals.user.avatar ?? ""}"
                    hidden
                  />
                </div>

                <div
                  class="${res.locals.localCSS(css`
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
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
                </div>
              </div>

              <div class="label">
                <p class="label--text">Biography</p>
                $${contentEditor({
                  req,
                  res,
                  name: "biography",
                  contentSource: res.locals.user.biographySource ?? "",
                  required: false,
                })}
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil"></i>
                  Update Profile
                </button>
              </div>
            </form>
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
  >("/settings/profile", ...isSignedInMiddleware, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      typeof req.body.avatar !== "string" ||
      typeof req.body.biography !== "string"
    )
      return next("validation");
    database.run(
      sql`
        UPDATE "users"
        SET "name" = ${req.body.name},
            "nameSearch" = ${html`${req.body.name}`},
            "avatar" = ${
              req.body.avatar.trim() === "" ? null : req.body.avatar
            },
            "biographySource" = ${
              req.body.biography.trim() === "" ? null : req.body.biography
            },
            "biographyPreprocessed" = ${
              req.body.biography.trim() === ""
                ? null
                : processContent({
                    req,
                    res,
                    type: "source",
                    content: req.body.biography,
                  }).preprocessed
            }
        WHERE "id" = ${res.locals.user.id}
      `
    );
    Flash.set({
      req,
      res,
      content: html`
        <div class="flash--green">Profile updated successfully.</div>
      `,
    });
    res.redirect(`${baseURL}/settings/profile`);
  });

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile/avatar",
    asyncHandler(async (req, res, next) => {
      if (
        req.files?.avatar === undefined ||
        Array.isArray(req.files.avatar) ||
        !req.files.avatar.mimetype.startsWith("image/")
      )
        return next("validation");
      if (req.files.avatar.truncated)
        return res.status(413).send("Avatars must be smaller than 10MB.");
      const name = filenamify(req.files.avatar.name, { replacement: "-" });
      if (name.trim() === "") return next("validation");
      const folder = cryptoRandomString({
        length: 20,
        type: "numeric",
      });
      await req.files.avatar.mv(
        path.join(dataDirectory, `files/${folder}/${name}`)
      );
      const ext = path.extname(name);
      const nameAvatar = `${name.slice(
        0,
        name.length - ext.length
      )}--avatar${ext}`;
      try {
        await sharp(req.files.avatar.data, { limitInputPixels: false })
          .rotate()
          .resize({
            width: 256 /* var(--space--64) */,
            height: 256 /* var(--space--64) */,
            position: sharp.strategy.attention,
          })
          .toFile(path.join(dataDirectory, `files/${folder}/${nameAvatar}`));
      } catch (error) {
        return next("validation");
      }
      res.send(`${baseURL}/files/${folder}/${encodeURIComponent(nameAvatar)}`);
    }),
    ((err, req, res, next) => {
      if (err === "validation")
        return res
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${administratorEmail}.`
          );
      next(err);
    }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/update-email-and-password",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>
            Update Email & Password · User Settings · CourseLore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-key"></i>
              Update Email & Password
            </h2>

            <form
              method="POST"
              action="${baseURL}/settings/update-email-and-password?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Password</p>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${res.locals.user.email}"
                  required
                  class="input--text"
                />
              </label>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-key"></i>
                  Update Email
                </button>
              </div>
            </form>

            <hr class="separator" />

            <form
              method="POST"
              action="${baseURL}/settings/update-email-and-password?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Current Password</p>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">New Password</p>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minlength="8"
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">New Password Confirmation</p>
                <input
                  type="password"
                  required
                  class="input--text"
                  oninteractive="${javascript`
                    (this.validators ??= []).push(() => {
                      if (this.value !== this.closest("form").querySelector('[name="newPassword"]').value)
                        return "New Password & New Password Confirmation don’t match.";
                    });
                  `}"
                />
              </label>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-key"></i>
                  Update Password
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    { email?: string; currentPassword?: string; newPassword?: string },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/update-email-and-password",
    ...isSignedInMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.currentPassword !== "string" ||
        req.body.currentPassword.trim() === ""
      )
        return next("validation");

      if (
        !(await argon2.verify(
          res.locals.user.password,
          req.body.currentPassword
        ))
      ) {
        Flash.set({
          req,
          res,
          content: html`<div class="flash--rose">Incorrect password.</div>`,
        });
        return res.redirect(`${baseURL}/settings/update-email-and-password`);
      }

      if (typeof req.body.email === "string") {
        if (req.body.email.match(emailRegExp) === null)
          return next("validation");
        if (
          database.get<{ exists: number }>(
            sql`
              SELECT (
                SELECT 1 FROM "users" WHERE "email" = ${req.body.email}
              ) AS "exists"
            `
          )!.exists === 1
        ) {
          Flash.set({
            req,
            res,
            content: html`<div class="flash--rose">Email already taken.</div>`,
          });
          return res.redirect(`${baseURL}/settings/update-email-and-password`);
        }

        database.run(
          sql`
            UPDATE "users"
            SET "email" = ${req.body.email},
                "emailConfirmedAt" = ${null}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        sendEmailConfirmationEmail({
          req,
          res,
          userId: res.locals.user.id,
          userEmail: req.body.email,
        });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Email updated successfully.</div>
          `,
        });
      }

      if (typeof req.body.newPassword === "string") {
        if (
          req.body.newPassword.trim() === "" ||
          req.body.newPassword.length < 8
        )
          return next("validation");

        database.run(
          sql`
            UPDATE "users"
            SET "password" =  ${await argon2.hash(
              req.body.newPassword,
              argon2Options
            )}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        Session.closeAllAndReopen({ req, res, userId: res.locals.user.id });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Password updated successfully.</div>
          `,
        });
      }

      res.redirect(`${baseURL}/settings/update-email-and-password`);
    })
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/notifications-preferences",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>
            Notifications Preferences · User Settings · CourseLore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-bell"></i>
              Notifications Preferences
            </h2>

            <form
              method="POST"
              action="${baseURL}/settings/notifications-preferences?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Email Notifications</p>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="all-messages"
                      required
                      $${res.locals.user.emailNotifications === "all-messages"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    All messages
                  </label>
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="staff-announcements-and-mentions"
                      required
                      $${res.locals.user.emailNotifications ===
                      "staff-announcements-and-mentions"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Staff announcements and @mentions
                  </label>
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="none"
                      required
                      $${res.locals.user.emailNotifications === "none"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    None
                  </label>
                </div>
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil"></i>
                  Update Notifications Preferences
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    { emailNotifications?: UserEmailNotifications },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/notifications-preferences",
    ...isSignedInMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.emailNotifications !== "string" ||
        !userEmailNotificationses.includes(req.body.emailNotifications)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "users"
          SET "emailNotifications" = ${req.body.emailNotifications}
          WHERE "id" = ${res.locals.user.id}
        `
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            Notifications preferences updated successfully.
          </div>
        `,
      });

      res.redirect(`${baseURL}/settings/notifications-preferences`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/courses/new",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        mainLayout({
          req,
          res,
          head: html`<title>Create a New Course · CourseLore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-plus"></i>
              Create a New Course
            </h2>

            $${baseURL === "https://courselore.org"
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);

                      .link {
                        color: var(--color--amber--600);
                        &:hover,
                        &:focus-within {
                          color: var(--color--amber--500);
                        }
                        &:active {
                          color: var(--color--amber--700);
                        }
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--amber--100);
                          &:hover,
                          &:focus-within {
                            color: var(--color--amber--50);
                          }
                          &:active {
                            color: var(--color--amber--200);
                          }
                        }
                      }
                    `)}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <p>
                      This is the hosted installation of CourseLore managed by
                      the CourseLore developers. It’s free for a limited period,
                      but we may charge for it in the future (you’ll be warned
                      well in advance). CourseLore is
                      <a
                        href="https://github.com/courselore/courselore"
                        class="link"
                        >open source</a
                      >
                      and you may install it on your own server, an option that
                      will be free forever and guarantees maximum privacy &
                      control.
                    </p>
                  </div>
                `
              : html``}

            <form
              method="POST"
              action="${baseURL}/courses"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--2);
                  & > * {
                    flex: 1;
                  }
                `)}"
              >
                <label class="label">
                  <p class="label--text">Year</p>
                  <input
                    type="text"
                    name="year"
                    class="input--text"
                    autocomplete="off"
                    oninteractive="${javascript`
                      this.defaultValue = new Date().getFullYear().toString();
                    `}"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Term</p>
                  <input
                    type="text"
                    name="term"
                    class="input--text"
                    autocomplete="off"
                    oninteractive="${javascript`
                      const month = new Date().getMonth() + 1;
                      this.defaultValue = month < 4 || month > 9 ? "Spring" : "Fall";
                    `}"
                  />
                </label>
              </div>
              <label class="label">
                <p class="label--text">Institution</p>
                <input
                  type="text"
                  name="institution"
                  class="input--text"
                  autocomplete="off"
                  placeholder="Your University"
                  value="${res.locals.enrollments.length > 0
                    ? res.locals.enrollments[res.locals.enrollments.length - 1]
                        .course.institution ?? ""
                    : ""}"
                />
              </label>
              <label class="label">
                <p class="label--text">Code</p>
                <input
                  type="text"
                  name="code"
                  class="input--text"
                  autocomplete="off"
                  placeholder="CS 601.426"
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
          `,
        })
      );
    }
  );

  app.post<
    {},
    any,
    {
      name?: string;
      year?: string;
      term?: string;
      institution?: string;
      code?: string;
    },
    {},
    IsSignedInMiddlewareLocals
  >("/courses", ...isSignedInMiddleware, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      !["string", "undefined"].includes(typeof req.body.year) ||
      !["string", "undefined"].includes(typeof req.body.term) ||
      !["string", "undefined"].includes(typeof req.body.institution) ||
      !["string", "undefined"].includes(typeof req.body.code)
    )
      return next("validation");

    const course = database.get<{
      id: number;
      reference: string;
    }>(
      sql`
        INSERT INTO "courses" (
          "createdAt",
          "reference",
          "name",
          "year",
          "term",
          "institution",
          "code",
          "nextConversationReference"
        )
        VALUES (
          ${new Date().toISOString()},
          ${cryptoRandomString({ length: 10, type: "numeric" })},
          ${req.body.name},
          ${
            typeof req.body.year === "string" && req.body.year.trim() !== ""
              ? req.body.year
              : null
          },
          ${
            typeof req.body.term === "string" && req.body.term.trim() !== ""
              ? req.body.term
              : null
          },
          ${
            typeof req.body.institution === "string" &&
            req.body.institution.trim() !== ""
              ? req.body.institution
              : null
          },
          ${
            typeof req.body.code === "string" && req.body.code.trim() !== ""
              ? req.body.code
              : null
          },
          ${1}
        )
        RETURNING *
      `
    )!;
    database.run(
      sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${defaultAccentColor(res.locals.enrollments)}
          )
        `
    );
    res.redirect(`${baseURL}/courses/${course.reference}`);
  });

  const defaultAccentColor = (
    enrollments: IsSignedInMiddlewareLocals["enrollments"]
  ): EnrollmentAccentColor => {
    const accentColorsInUse = new Set<EnrollmentAccentColor>(
      enrollments.map((enrollment) => enrollment.accentColor)
    );
    const accentColorsAvailable = new Set<EnrollmentAccentColor>(
      enrollmentAccentColors
    );
    for (const accentColorInUse of accentColorsInUse) {
      accentColorsAvailable.delete(accentColorInUse);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  };

  interface IsEnrolledInCourseMiddlewareLocals
    extends IsSignedInMiddlewareLocals {
    enrollment: IsSignedInMiddlewareLocals["enrollments"][number];
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    conversationsCount: number;
    conversationTypes: ConversationType[];
    tags: {
      id: number;
      reference: string;
      name: string;
      staffOnlyAt: string | null;
    }[];
  }
  const isEnrolledInCourseMiddleware: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >[] = [
    ...isSignedInMiddleware,
    (req, res, next) => {
      const enrollment = res.locals.enrollments.find(
        (enrollment) =>
          enrollment.course.reference === req.params.courseReference
      );
      if (enrollment === undefined) return next("route");
      res.locals.enrollment = enrollment;
      res.locals.course = enrollment.course;

      res.locals.conversationsCount = database.get<{
        count: number;
      }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "conversations"
          WHERE "course" = ${res.locals.course.id}
          $${
            res.locals.enrollment.role !== "staff"
              ? sql`
                  AND "conversations"."staffOnlyAt" IS NULL
                `
              : sql``
          }
        `
      )!.count;

      res.locals.conversationTypes = conversationTypes.filter(
        (conversationType) =>
          !(
            conversationType === "announcement" &&
            res.locals.enrollment.role !== "staff"
          )
      );

      res.locals.tags = database.all<{
        id: number;
        reference: string;
        name: string;
        staffOnlyAt: string | null;
      }>(
        sql`
          SELECT "id", "reference", "name", "staffOnlyAt"
          FROM "tags"
          WHERE "course" = ${res.locals.course.id}
                $${
                  res.locals.enrollment.role === "student"
                    ? sql`AND "staffOnlyAt" IS NULL`
                    : sql``
                }
          ORDER BY "id" ASC
        `
      );

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
      if (res.locals.conversationsCount === 0)
        return res.send(
          mainLayout({
            req,
            res,
            head: html`<title>${res.locals.course.name} · CourseLore</title>`,
            body: html`
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  align-items: center;
                `)}"
              >
                <h2 class="heading--display">
                  Welcome to ${res.locals.course.name}!
                </h2>

                <div class="decorative-icon">
                  <i class="bi bi-journal-text"></i>
                </div>

                <div class="menu-box">
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${baseURL}/courses/${res.locals.course
                            .reference}/settings/tags"
                          class="menu-box--item button button--blue"
                        >
                          <i class="bi bi-sliders"></i>
                          Configure the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${baseURL}/courses/${res.locals.course
                      .reference}/conversations/new"
                    class="menu-box--item button ${res.locals.enrollment
                      .role === "staff"
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

      res.send(
        conversationLayout({
          req,
          res,
          head: html`<title>${res.locals.course.name} · CourseLore</title>`,
          onlyConversationLayoutSidebarOnSmallScreen: true,
          body: html`<p class="secondary">No conversation selected.</p>`,
        })
      );
    }
  );

  interface InvitationExistsMiddlewareLocals extends BaseMiddlewareLocals {
    invitation: {
      id: number;
      expiresAt: string | null;
      usedAt: string | null;
      course: {
        id: number;
        reference: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        nextConversationReference: number;
      };
      reference: string;
      email: string | null;
      name: string | null;
      role: EnrollmentRole;
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
        courseYear: string | null;
        courseTerm: string | null;
        courseInstitution: string | null;
        courseCode: string | null;
        courseNextConversationReference: number;
        reference: string;
        email: string | null;
        name: string | null;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "invitations"."id",
                 "invitations"."expiresAt",
                 "invitations"."usedAt",
                 "courses"."id" AS "courseId",
                 "courses"."reference" AS "courseReference",
                 "courses"."name" AS "courseName",
                 "courses"."year" AS "courseYear",
                 "courses"."term" AS "courseTerm",
                 "courses"."institution" AS "courseInstitution",
                 "courses"."code" AS "courseCode",
                 "courses"."nextConversationReference" AS "courseNextConversationReference",
                 "invitations"."reference",
                 "invitations"."email",
                 "invitations"."name",
                 "invitations"."role"
          FROM "invitations"
          JOIN "courses" ON "invitations"."course" = "courses"."id" AND
                            "courses"."reference" = ${req.params.courseReference}
          WHERE "invitations"."reference" = ${req.params.invitationReference}
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
          year: invitation.courseYear,
          term: invitation.courseTerm,
          institution: invitation.courseInstitution,
          code: invitation.courseCode,
          nextConversationReference: invitation.courseNextConversationReference,
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
      Omit<Partial<IsSignedInMiddlewareLocals>, keyof BaseMiddlewareLocals> {}
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
          res.locals.invitation.email.toLowerCase() !==
            res.locals.user.email.toLowerCase())
      )
        return next("route");
      next();
    },
  ];

  const sendInvitationEmail = ({
    req,
    res,
    invitation,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    invitation: InvitationExistsMiddlewareLocals["invitation"];
  }): void => {
    const link = `${baseURL}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 20 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            to: invitation.email!,
            subject: `Enroll in ${invitation.course.name}`,
            html: html`
              <p>
                Enroll in ${invitation.course.name}:<br />
                <a href="${link}" target="_blank">${link}</a>
              </p>
              $${invitation.expiresAt === null
                ? html``
                : html`
                    <p>
                      <small>
                        This invitation is valid until
                        ${new Date(invitation.expiresAt).toISOString()}.
                      </small>
                    </p>
                  `}
            `,
          })}
        )
      `
    );
    sendEmailWorker();
  };

  interface MayManageEnrollmentMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals {
    managedEnrollment: {
      id: number;
      reference: string;
      role: EnrollmentRole;
      isSelf: boolean;
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
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "id", "reference", "role"
          FROM "enrollments"
          WHERE "course" = ${res.locals.course.id} AND
                "reference" = ${req.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next("route");
      res.locals.managedEnrollment = {
        ...managedEnrollment,
        isSelf: managedEnrollment.id === res.locals.enrollment.id,
      };
      if (
        managedEnrollment.id === res.locals.enrollment.id &&
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
      next();
    },
  ];

  const courseSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsEnrolledInCourseMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsEnrolledInCourseMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    settingsLayout({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `,
      menu:
        res.locals.enrollment.role === "staff"
          ? html`
              <a
                href="${baseURL}/courses/${res.locals.course
                  .reference}/settings/course-information"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/course-information"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-journal-text"></i>
                Course Information
              </a>
              <a
                href="${baseURL}/courses/${res.locals.course
                  .reference}/settings/tags"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/tags"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-tags"></i>
                Tags
              </a>
              <a
                href="${baseURL}/courses/${res.locals.course
                  .reference}/settings/invitations"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/invitations"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-person-plus"></i>
                Invitations
              </a>
              <a
                href="${baseURL}/courses/${res.locals.course
                  .reference}/settings/enrollments"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/enrollments"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-people"></i>
                Enrollments
              </a>
              <a
                href="${baseURL}/courses/${res.locals.course
                  .reference}/settings/your-enrollment"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/your-enrollment"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-person"></i>
                Your Enrollment
              </a>
            `
          : html``,
      body,
    });

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
      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/${
          res.locals.enrollment.role === "staff"
            ? "course-information"
            : "your-enrollment"
        }`
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
    "/courses/:courseReference/settings/course-information",
    ...isCourseStaffMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Course Information · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-journal-text"></i>
              Course Information
            </h2>
            <form
              method="POST"
              action="${baseURL}/courses/${res.locals.course
                .reference}/settings/course-information?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
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
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--2);
                  & > * {
                    flex: 1;
                  }
                `)}"
              >
                <label class="label">
                  <p class="label--text">Year</p>
                  <input
                    type="text"
                    name="year"
                    value="${res.locals.course.year ?? ""}"
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Term</p>
                  <input
                    type="text"
                    name="term"
                    value="${res.locals.course.term ?? ""}"
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
              </div>
              <label class="label">
                <p class="label--text">Institution</p>
                <input
                  type="text"
                  name="institution"
                  value="${res.locals.course.institution ?? ""}"
                  autocomplete="off"
                  class="input--text"
                  placeholder="Your University"
                />
              </label>
              <label class="label">
                <p class="label--text">Code</p>
                <input
                  type="text"
                  name="code"
                  value="${res.locals.course.code ?? ""}"
                  autocomplete="off"
                  class="input--text"
                  placeholder="CS 601.426"
                />
              </label>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil"></i>
                  Update Course Information
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    {
      name?: string;
      year?: string;
      term?: string;
      institution?: string;
      code?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/course-information",
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        !["string", "undefined"].includes(typeof req.body.year) ||
        !["string", "undefined"].includes(typeof req.body.term) ||
        !["string", "undefined"].includes(typeof req.body.institution) ||
        !["string", "undefined"].includes(typeof req.body.code)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "name" = ${req.body.name},
              "year" = ${
                typeof req.body.year === "string" && req.body.year.trim() !== ""
                  ? req.body.year
                  : null
              },
              "term" = ${
                typeof req.body.term === "string" && req.body.term.trim() !== ""
                  ? req.body.term
                  : null
              },
              "institution" = ${
                typeof req.body.institution === "string" &&
                req.body.institution.trim() !== ""
                  ? req.body.institution
                  : null
              },
              "code" = ${
                typeof req.body.code === "string" && req.body.code.trim() !== ""
                  ? req.body.code
                  : null
              }
          WHERE "id" = ${res.locals.course.id}
        `
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            Course information updated successfully.
          </div>
        `,
      });

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/course-information`
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
    ...isCourseStaffMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Tags · Course Settings · ${res.locals.course.name} · CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-tags"></i>
              Tags
            </h2>

            $${res.locals.tags.length === 0
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      align-items: center;
                    `)}"
                  >
                    <div class="decorative-icon">
                      <i class="bi bi-tags"></i>
                    </div>
                    <p class="secondary">Organize conversations with tags.</p>
                  </div>
                `
              : html``}

            <form
              method="POST"
              action="${baseURL}/courses/${res.locals.course
                .reference}/settings/tags?_method=PUT"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `)}"
              >
                <div
                  class="tags ${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  $${res.locals.tags.map(
                    (tag, index) => html`
                      <div
                        class="tag ${res.locals.localCSS(css`
                          padding-bottom: var(--space--4);
                          border-bottom: var(--border-width--1) solid
                            var(--color--gray--medium--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--gray--medium--700);
                          }
                          display: flex;
                          gap: var(--space--2);
                          align-items: baseline;
                        `)}"
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
                        <div class="tag--icon text--teal">
                          <i class="bi bi-tag-fill"></i>
                        </div>
                        <div
                          class="${res.locals.localCSS(css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `)}"
                        >
                          <input
                            type="text"
                            name="tags[${index}][name]"
                            value="${tag.name}"
                            class="disable-on-delete input--text"
                            required
                            autocomplete="off"
                          />
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--4);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <div
                              class="${res.locals.localCSS(css`
                                width: var(--space--40);
                              `)}"
                            >
                              <label
                                class="button button--tight button--tight--inline button--justify-start button--transparent"
                              >
                                <input
                                  type="checkbox"
                                  name="tags[${index}][isStaffOnly]"
                                  $${tag.staffOnlyAt === null
                                    ? html``
                                    : html`checked`}
                                  class="disable-on-delete visually-hidden input--radio-or-checkbox--multilabel"
                                />
                                <span
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Set as Visible by Staff Only",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-eye"></i>
                                  Visible by Everyone
                                </span>
                                <span
                                  class="text--pink"
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Set as Visible by Everyone",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-mortarboard-fill"></i>
                                  Visible by Staff Only
                                </span>
                              </label>
                            </div>
                            <div
                              class="${res.locals.localCSS(css`
                                .tag.deleted & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    theme: "rose",
                                    touch: false,
                                    content: "Remove Tag",
                                  });
                                  tippy(this, {
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <div
                                          class="${res.locals.localCSS(css`
                                            padding: var(--space--2)
                                              var(--space--0);
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--4);
                                          `)}"
                                        >
                                          <p>
                                            Are you sure you want to remove this
                                            tag?
                                          </p>
                                          <p>
                                            <strong
                                              class="${res.locals.localCSS(css`
                                                font-weight: var(
                                                  --font-weight--bold
                                                );
                                              `)}"
                                            >
                                              The tag will be removed from all
                                              conversations and you may not undo
                                              this action!
                                            </strong>
                                          </p>
                                          <button
                                            type="button"
                                            class="button button--rose"
                                            onclick="${javascript`
                                              const tag = this.closest(".tag");
                                              tag.classList.add("deleted");
                                              const tagIconClassList = tag.querySelector(".tag--icon").classList;
                                              tagIconClassList.remove("text--teal");
                                              tagIconClassList.add("text--rose");
                                              tag.querySelector('[name$="[delete]"]').disabled = false;
                                              for (const element of tag.querySelectorAll(".disable-on-delete")) {
                                                element.disabled = true;
                                                const button = element.closest(".button");
                                                if (button === null) continue;
                                                button.classList.add("disabled");
                                                for (const element of button.querySelectorAll("*"))
                                                  if (element.tooltip !== undefined) element.tooltip.disable();
                                              }
                                            `}"
                                          >
                                            <i class="bi bi-trash"></i>
                                            Remove Tag
                                          </button>
                                        </div>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                            </div>
                            <div
                              class="${res.locals.localCSS(css`
                                .tag:not(.deleted) & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Don’t Remove Tag",
                                  });
                                `}"
                                onclick="${javascript`
                                  const tag = this.closest(".tag");
                                  tag.classList.remove("deleted");
                                  const tagIconClassList = tag.querySelector(".tag--icon").classList;
                                  tagIconClassList.remove("text--rose");
                                  tagIconClassList.add("text--teal");
                                  tag.querySelector('[name$="[delete]"]').disabled = true;
                                  for (const element of tag.querySelectorAll(".disable-on-delete")) {
                                    element.disabled = false;
                                    const button = element.closest(".button");
                                    if (button === null) continue;
                                    button.classList.remove("disabled");
                                    for (const element of button.querySelectorAll("*"))
                                      if (element.tooltip !== undefined) element.tooltip.enable();
                                  }
                                `}"
                              >
                                <i class="bi bi-recycle"></i>
                              </button>
                            </div>
                            $${res.locals.conversationsCount > 0
                              ? html`
                                  <a
                                    href="${baseURL}/courses/${res.locals.course
                                      .reference}${qs.stringify(
                                      {
                                        conversationLayoutSidebarOpenOnSmallScreen:
                                          "true",
                                        filters: {
                                          tagsReferences: [tag.reference],
                                        },
                                      },
                                      { addQueryPrefix: true }
                                    )}"
                                    class="button button--tight button--tight--inline button--transparent"
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        touch: false,
                                        content: "See Conversations with This Tag",
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-chat-left-text"></i>
                                  </a>
                                `
                              : html``}
                          </div>
                        </div>
                      </div>
                    `
                  )}
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                  `)}"
                >
                  <button
                    type="button"
                    class="button button--transparent button--full-width-on-small-screen"
                    oninteractive="${javascript`
                      (this.validators ??= []).push(() => {
                        if ([...this.closest("form").querySelector(".tags").children].filter((tag) => !tag.hidden).length === 0)
                          return "Please add at least one tag.";
                      });
                    `}"
                    onclick="${javascript`
                      const newTag = ${res.locals.HTMLForJavaScript(
                        html`
                          <div
                            class="tag ${res.locals.localCSS(css`
                              padding-bottom: var(--space--4);
                              border-bottom: var(--border-width--1) solid
                                var(--color--gray--medium--200);
                              @media (prefers-color-scheme: dark) {
                                border-color: var(--color--gray--medium--700);
                              }
                              display: flex;
                              gap: var(--space--2);
                              align-items: baseline;
                            `)}"
                          >
                            <div class="text--teal">
                              <i class="bi bi-tag-fill"></i>
                            </div>
                            <div
                              class="${res.locals.localCSS(css`
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `)}"
                            >
                              <input
                                type="text"
                                placeholder=" "
                                required
                                autocomplete="off"
                                disabled
                                class="input--text"
                                onmount="${javascript`
                                  this.dataset.forceIsModified = true;
                                  this.disabled = false;
                                  this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][name]";
                                `}"
                              />
                              <div
                                class="${res.locals.localCSS(css`
                                  display: flex;
                                  flex-wrap: wrap;
                                  column-gap: var(--space--4);
                                  row-gap: var(--space--2);
                                `)}"
                              >
                                <div
                                  class="${res.locals.localCSS(css`
                                    width: var(--space--40);
                                  `)}"
                                >
                                  <label
                                    class="button button--tight button--tight--inline button--justify-start button--transparent"
                                  >
                                    <input
                                      type="checkbox"
                                      disabled
                                      class="visually-hidden input--radio-or-checkbox--multilabel"
                                      onmount="${javascript`
                                        this.dataset.forceIsModified = true;
                                        this.disabled = false;
                                        this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][isStaffOnly]";
                                      `}"
                                    />
                                    <span
                                      onmount="${javascript`
                                        tippy(this, {
                                          touch: false,
                                          content: "Set as Visible by Staff Only",
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-eye"></i>
                                      Visible by Everyone
                                    </span>
                                    <span
                                      class="text--pink"
                                      onmount="${javascript`
                                        tippy(this, {
                                          touch: false,
                                          content: "Set as Visible by Everyone",
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Visible by Staff Only
                                    </span>
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  class="button button--tight button--tight--inline button--transparent"
                                  onmount="${javascript`
                                    tippy(this, {
                                      theme: "rose",
                                      touch: false,
                                      content: "Remove Tag",
                                    });
                                  `}"
                                  onclick="${javascript`
                                    const tag = this.closest(".tag");
                                    tag.replaceChildren();
                                    tag.hidden = true;
                                  `}"
                                >
                                  <i class="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        `
                      )}.firstElementChild.cloneNode(true);
                      this.closest("form").querySelector(".tags").insertAdjacentElement("beforeend", newTag);
                      leafac.evaluateElementsAttribute(newTag, "onmount");
                    `}"
                  >
                    <i class="bi bi-plus-circle"></i>
                    Add Tag
                  </button>
                </div>
              </div>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil"></i>
                  Update Tags
                </button>
              </div>
            </form>
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
        isStaffOnly?: boolean;
      }[];
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        !Array.isArray(req.body.tags) ||
        req.body.tags.length === 0 ||
        req.body.tags.some(
          (tag) =>
            (tag.reference === undefined &&
              (typeof tag.name !== "string" || tag.name.trim() === "")) ||
            (tag.reference !== undefined &&
              (!res.locals.tags.some(
                (existingTag) => tag.reference === existingTag.reference
              ) ||
                (tag.delete !== "true" &&
                  (typeof tag.name !== "string" || tag.name.trim() === ""))))
        )
      )
        return next("validation");

      for (const tag of req.body.tags)
        if (tag.reference === undefined)
          database.run(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${tag.name},
                ${tag.isStaffOnly ? new Date().toISOString() : null}
              )
            `
          );
        else if (tag.delete === "true")
          database.run(
            sql`
              DELETE FROM "tags" WHERE "reference" = ${tag.reference}
            `
          );
        else
          database.run(
            sql`
              UPDATE "tags"
              SET "name" = ${tag.name},
                  "staffOnlyAt" = ${
                    tag.isStaffOnly ? new Date().toISOString() : null
                  }
              WHERE "reference" = ${tag.reference}
            `
          );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Tags updated successfully.</div>
        `,
      });

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/tags`
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
    ...isCourseStaffMiddleware,
    (req, res) => {
      const invitations = database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "role"
          FROM "invitations"
          WHERE "course" = ${res.locals.course.id}
          ORDER BY "id" DESC
        `
      );

      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Invitations · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-person-plus"></i>
              Invitations
            </h2>

            <form
              method="POST"
              action="${baseURL}/courses/${res.locals.course
                .reference}/settings/invitations"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Type</p>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="link"
                      required
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onchange="${javascript`
                        const form = this.closest("form");
                        const emails = form.querySelector(".emails");
                        emails.hidden = true;
                        for (const element of emails.querySelectorAll("*"))
                          if (element.disabled !== null) element.disabled = true;
                        form.querySelector(".button--create-invitation").hidden = false;
                        form.querySelector(".button--send-invitation-emails").hidden = true;
                      `}"
                    />
                    <span>
                      <i class="bi bi-link"></i>
                      Invitation Link
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-link"></i>
                      Invitation Link
                    </span>
                  </label>
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="email"
                      required
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onchange="${javascript`
                        const form = this.closest("form");
                        const emails = form.querySelector(".emails");
                        emails.hidden = false;
                        for (const element of emails.querySelectorAll("*"))
                          if (element.disabled !== null) element.disabled = false;
                        form.querySelector(".button--create-invitation").hidden = true;
                        form.querySelector(".button--send-invitation-emails").hidden = false;
                      `}"
                    />
                    <span>
                      <i class="bi bi-envelope"></i>
                      Email
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-envelope-fill"></i>
                      Email
                    </span>
                  </label>
                </div>
              </div>

              <div hidden class="emails label">
                <div class="label--text">
                  Emails
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        trigger: "click",
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="${res.locals.localCSS(css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `)}"
                            >
                              <p>
                                Emails must be separated by commas and/or
                                newlines, and may include names which may be
                                quoted or not, for example:
                              </p>
                              <pre class="pre"><code>${dedent`
                                "Scott" <scott@courselore.org>,
                                Ali <ali@courselore.org>
                                leandro@courselore.org
                              `}</code></pre>
                            </div>
                          `
                        )},
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <textarea
                  name="emails"
                  required
                  disabled
                  class="input--text input--text--textarea ${res.locals
                    .localCSS(css`
                    height: var(--space--32);
                  `)}"
                  oninteractive="${javascript`
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
                          ({ email }) => email.match(leafac.regExps.email) === null
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
                  class="${res.locals.localCSS(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  $${enrollmentRoles.map(
                    (role) =>
                      html`
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="radio"
                            name="role"
                            value="${role}"
                            required
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                          />
                          <span>
                            $${enrollmentRoleIcon[role].regular}
                            ${lodash.capitalize(role)}
                          </span>
                          <span class="text--blue">
                            $${enrollmentRoleIcon[role].fill}
                            ${lodash.capitalize(role)}
                          </span>
                        </label>
                      `
                  )}
                </div>
              </div>

              <div class="label">
                <p class="label--text">Expiration</p>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onchange="${javascript`
                        const expiresAt = this.closest("form").querySelector(".expires-at");
                        expiresAt.hidden = !this.checked;
                        for (const element of expiresAt.querySelectorAll("*"))
                          if (element.disabled !== undefined) element.disabled = !this.checked;
                      `}"
                    />
                    <span
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Set as Expiring",
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Expire
                    </span>
                    <span
                      class="text--amber"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Set as Not Expiring",
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-plus-fill"></i>
                      Expires
                    </span>
                  </label>
                </div>
              </div>

              <div hidden class="expires-at label">
                <div class="label--text">
                  Expires at
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        trigger: "click",
                        content: "This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving change.",
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
                  oninteractive="${javascript`
                    leafac.localizeDateTimeInput(this);
                    (this.validators ??= []).push(() => {
                      if (new Date(this.value).getTime() <= Date.now())
                        return "Must be in the future.";
                    });
                  `}"
                />
              </div>

              <div>
                <button
                  class="button--create-invitation button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-person-plus"></i>
                  Create Invitation
                </button>
                <button
                  class="button--send-invitation-emails button button--full-width-on-small-screen button--blue"
                  hidden
                >
                  <i class="bi bi-envelope"></i>
                  Send Invitation Emails
                </button>
              </div>
            </form>

            $${invitations.length === 0
              ? html``
              : html`
                  $${invitations.map((invitation) => {
                    const action = `${baseURL}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                    const isInvitationExpired = isExpired(invitation.expiresAt);
                    const isUsed = invitation.usedAt !== null;

                    return html`
                      <div
                        class="${res.locals.localCSS(css`
                          padding-top: var(--space--4);
                          border-top: var(--border-width--1) solid
                            var(--color--gray--medium--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--gray--medium--700);
                          }
                          display: flex;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div>
                          $${invitation.email === null
                            ? html`
                                <span
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Invitation Link",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-link"></i>
                                </span>
                              `
                            : html`
                                <span
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Invitation Email",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-envelope"></i>
                                </span>
                              `}
                        </div>
                        <div
                          class="${res.locals.localCSS(css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `)}"
                        >
                          $${invitation.email === null
                            ? html`
                                <div>
                                  <button
                                    id="invitation--${invitation.reference}"
                                    class="button button--tight button--tight--inline button--transparent strong"
                                    oninteractive="${javascript`
                                      this.tooltip = tippy(this, {
                                        touch: false,
                                        content: "See Invitation Link",
                                      });
                                      tippy(this, {
                                        trigger: "click",
                                        interactive: true,
                                        maxWidth: "none",
                                        content: ${(() => {
                                          const link = `${baseURL}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
                                          return res.locals.HTMLForJavaScript(
                                            html`
                                              <div
                                                class="${res.locals
                                                  .localCSS(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                $${isInvitationExpired
                                                  ? html`
                                                      <p
                                                        class="text--rose ${res
                                                          .locals.localCSS(css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                          justify-content: center;
                                                        `)}"
                                                      >
                                                        <i
                                                          class="bi bi-calendar-x-fill"
                                                        ></i>
                                                        Expired
                                                      </p>
                                                    `
                                                  : html``}
                                                <div
                                                  class="${res.locals
                                                    .localCSS(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    align-items: center;
                                                  `)}"
                                                >
                                                  <input
                                                    type="text"
                                                    readonly
                                                    value="${link}"
                                                    class="input--text ${res
                                                      .locals.localCSS(css`
                                                      flex: 1;
                                                    `)}"
                                                    onfocus="${javascript`
                                                      this.select();
                                                    `}"
                                                  />
                                                  <button
                                                    class="button button--tight button--transparent"
                                                    oninteractive="${javascript`
                                                      tippy(this, {
                                                        touch: false,
                                                        content: "Copy Link",
                                                      });
                                                    `}"
                                                    onclick="${javascript`
                                                      (async () => {
                                                        await navigator.clipboard.writeText(${JSON.stringify(
                                                          link
                                                        )});
                                                        const stickies = this.querySelector(".stickies");
                                                        const check = this.querySelector(".check");
                                                        stickies.hidden = true;
                                                        check.hidden = false;
                                                        await new Promise((resolve) => { window.setTimeout(resolve, 500); });
                                                        stickies.hidden = false;
                                                        check.hidden = true;
                                                      })();
                                                    `}"
                                                  >
                                                    <span class="stickies">
                                                      <i
                                                        class="bi bi-stickies"
                                                      ></i>
                                                    </span>
                                                    <span
                                                      hidden
                                                      class="check text--green"
                                                    >
                                                      <i
                                                        class="bi bi-check-lg"
                                                      ></i>
                                                    </span>
                                                  </button>
                                                  <a
                                                    href="${link}"
                                                    class="button button--tight button--transparent"
                                                    oninteractive="${javascript`
                                                      tippy(this, {
                                                        touch: false,
                                                        content: "See QR Code for Link",
                                                      });
                                                    `}"
                                                    ><i
                                                      class="bi bi-qr-code"
                                                    ></i
                                                  ></a>
                                                </div>
                                              </div>
                                            `
                                          );
                                        })()},
                                      });
                                    `}"
                                  >
                                    ${"*".repeat(
                                      6
                                    )}${invitation.reference.slice(6)}
                                    <i class="bi bi-chevron-down"></i>
                                  </button>
                                </div>
                              `
                            : html`
                                <div>
                                  <button
                                    class="button button--tight button--tight--inline button--transparent ${res
                                      .locals.localCSS(css`
                                      display: flex;
                                      flex-direction: column;
                                      align-items: flex-start;
                                      gap: var(--space--0);
                                    `)}"
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        trigger: "click",
                                        interactive: true,
                                        content: ${res.locals.HTMLForJavaScript(
                                          html`
                                            <div class="dropdown--menu">
                                              <form
                                                method="POST"
                                                action="${action}?_method=PATCH"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                <input
                                                  type="hidden"
                                                  name="resend"
                                                  value="true"
                                                />
                                                <button
                                                  class="dropdown--menu--item button button--transparent"
                                                  $${isUsed
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                        tippy(this, {
                                                          theme: "rose",
                                                          trigger: "click",
                                                          content: "You may not resend this invitation because it’s used.",
                                                        });
                                                      `}"
                                                      `
                                                    : isInvitationExpired
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                        tippy(this, {
                                                          theme: "rose",
                                                          trigger: "click",
                                                          content: "You may not resend this invitation because it’s expired.",
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
                                          `
                                        )},
                                      });
                                    `}"
                                  >
                                    <div
                                      class="strong ${res.locals.localCSS(css`
                                        display: flex;
                                        align-items: baseline;
                                        gap: var(--space--2);
                                      `)}"
                                    >
                                      ${invitation.name ?? invitation.email}
                                      <i class="bi bi-chevron-down"></i>
                                    </div>
                                    $${invitation.name !== null
                                      ? html`
                                          <div class="secondary">
                                            ${invitation.email}
                                          </div>
                                        `
                                      : html``}
                                  </button>
                                </div>
                              `}

                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `)}"
                          >
                            <div
                              class="${res.locals.localCSS(css`
                                width: var(--space--28);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              <button
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Update Role",
                                  });
                                  tippy(this, {
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <div class="dropdown--menu">
                                          $${enrollmentRoles.map((role) =>
                                            role === invitation.role
                                              ? html``
                                              : html`
                                                  <form
                                                    method="POST"
                                                    action="${action}?_method=PATCH"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="_csrf"
                                                      value="${req.csrfToken()}"
                                                    />
                                                    <input
                                                      type="hidden"
                                                      name="role"
                                                      value="${role}"
                                                    />
                                                    <button
                                                      class="dropdown--menu--item button button--transparent"
                                                      $${isUsed
                                                        ? html`
                                                            type="button"
                                                            oninteractive="${javascript`
                                                              tippy(this, {
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the role of this invitation because it’s used.",
                                                              });
                                                            `}"
                                                          `
                                                        : isInvitationExpired
                                                        ? html`
                                                            type="button"
                                                            oninteractive="${javascript`
                                                              tippy(this, {
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the role of this invitation because it’s expired.",
                                                              });
                                                            `}"
                                                          `
                                                        : html``}
                                                    >
                                                      $${enrollmentRoleIcon[
                                                        role
                                                      ].regular}
                                                      ${lodash.capitalize(role)}
                                                    </button>
                                                  </form>
                                                `
                                          )}
                                        </div>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                $${enrollmentRoleIcon[invitation.role].regular}
                                ${lodash.capitalize(invitation.role)}
                                <i class="bi bi-chevron-down"></i>
                              </button>
                            </div>

                            <div
                              class="${res.locals.localCSS(css`
                                width: var(--space--40);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              $${(() => {
                                const updateExpirationForm = html`
                                  <form
                                    method="POST"
                                    action="${action}?_method=PATCH"
                                    novalidate
                                    class="dropdown--menu ${res.locals
                                      .localCSS(css`
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <div class="dropdown--menu--item">
                                      <input
                                        type="text"
                                        name="expiresAt"
                                        value="${new Date(
                                          invitation.expiresAt ?? new Date()
                                        ).toISOString()}"
                                        required
                                        autocomplete="off"
                                        class="input--text"
                                        oninteractive="${javascript`
                                          leafac.localizeDateTimeInput(this);
                                          (this.validators ??= []).push(() => {
                                            if (new Date(this.value).getTime() <= Date.now())
                                              return "Must be in the future.";
                                          });
                                        `}"
                                      />
                                    </div>
                                    <button
                                      class="dropdown--menu--item button button--transparent"
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
                                    class="dropdown--menu"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <input
                                      type="hidden"
                                      name="removeExpiration"
                                      value="true"
                                    />
                                    <button
                                      class="dropdown--menu--item button button--transparent"
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
                                    class="dropdown--menu"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <input
                                      type="hidden"
                                      name="expire"
                                      value="true"
                                    />
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                    >
                                      <i class="bi bi-calendar-x"></i>
                                      Expire Invitation
                                    </button>
                                  </form>
                                `;

                                return isUsed
                                  ? html`
                                      <div>
                                        <div
                                          class="button button--tight button--tight--inline text--green ${res
                                            .locals.localCSS(css`
                                            cursor: default;
                                          `)}"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  Used
                                                  <time
                                                    datetime="${new Date(
                                                      invitation.usedAt!
                                                    ).toISOString()}"
                                                    oninteractive="${javascript`
                                                    leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                  `}"
                                                  ></time>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-check-lg"></i>
                                          Used
                                        </div>
                                      </div>
                                    `
                                  : isInvitationExpired
                                  ? html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--rose"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-x"
                                                      ></i>
                                                      <span>
                                                        Expired
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt!
                                                          ).toISOString()}"
                                                          oninteractive="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                          `}"
                                                        ></time>
                                                      </span>
                                                    </h3>
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${removeExpirationForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-calendar-x-fill"></i>
                                          Expired
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `
                                  : invitation.expiresAt === null
                                  ? html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--blue"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      padding-top: var(
                                                        --space--2
                                                      );
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${expireForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i
                                            class="bi bi-calendar-minus-fill"
                                          ></i>
                                          Doesn’t Expire
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `
                                  : html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--amber"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-plus"
                                                      ></i>
                                                      <span>
                                                        Expires
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt
                                                          ).toISOString()}"
                                                          oninteractive="${javascript`
                                                          leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                        `}"
                                                        ></time>
                                                      </span>
                                                    </h3>
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${removeExpirationForm}
                                                    $${expireForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i
                                            class="bi bi-calendar-plus-fill"
                                          ></i>
                                          Expires
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  })}
                `}
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
      role?: EnrollmentRole;
      expiresAt?: string;
      emails?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !enrollmentRoles.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !isDate(req.body.expiresAt) ||
            isExpired(req.body.expiresAt))) ||
        typeof req.body.type !== "string" ||
        !["link", "email"].includes(req.body.type)
      )
        return next("validation");

      switch (req.body.type) {
        case "link":
          const invitation = database.get<{ reference: string }>(
            sql`
              INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "role")
              VALUES (
                ${new Date().toISOString()},
                ${req.body.expiresAt},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${req.body.role}
              )
              RETURNING *
          `
          )!;

          Flash.set({
            req,
            res,
            content: html`
              <div class="flash--green">
                <div>
                  Invitation link created successfully.
                  <button
                    class="link"
                    onclick="${javascript`
                      const id = "#invitation--${invitation.reference}";
                      window.location.hash = id;
                      const button = document.querySelector(id);
                      button.click();
                      button.tooltip.hide();
                      this.closest(".flash").remove();
                    `}"
                  >
                    See invitation link</button
                  >.
                </div>
              </div>
            `,
          });
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
            emails.some(({ email }) => email.match(emailRegExp) === null)
          )
            return next("validation");

          for (const { email, name } of emails) {
            if (
              database.get<{ exists: number }>(
                sql`
                  SELECT EXISTS(
                    SELECT 1
                    FROM "enrollments"
                    JOIN "users" ON "enrollments"."user" = "users"."id" AND
                                    "users"."email" = ${email}
                    WHERE "enrollments"."course" = ${res.locals.course.id}
                  ) AS "exists"
                `
              )!.exists === 1
            )
              continue;

            const existingUnusedInvitation = database.get<{
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
              database.run(
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

            const invitation = database.get<{
              id: number;
              expiresAt: string | null;
              usedAt: string | null;
              reference: string;
              email: string;
              name: string | null;
              role: EnrollmentRole;
            }>(
              sql`
                INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "email", "name", "role")
                VALUES (
                  ${new Date().toISOString()},
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

            sendInvitationEmail({
              req,
              res,
              invitation: {
                ...invitation,
                course: res.locals.course,
              },
            });
          }

          Flash.set({
            req,
            res,
            content: html`
              <div class="flash--green">
                Invitation emails sent successfully.
              </div>
            `,
          });
          break;
      }

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      role?: EnrollmentRole;
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    MayManageInvitationMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    ...mayManageInvitationMiddleware,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("validation");

      if (req.body.resend === "true") {
        if (
          isExpired(res.locals.invitation.expiresAt) ||
          res.locals.invitation.email === null
        )
          return next("validation");
        sendInvitationEmail({
          req,
          res,
          invitation: res.locals.invitation,
        });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation email resent successfully.
            </div>
          `,
        });
      }

      if (req.body.role !== undefined) {
        if (
          isExpired(res.locals.invitation.expiresAt) ||
          !enrollmentRoles.includes(req.body.role)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation role updated successfully.
            </div>
          `,
        });
      }

      if (req.body.expiresAt !== undefined) {
        if (
          typeof req.body.expiresAt !== "string" ||
          !isDate(req.body.expiresAt) ||
          isExpired(req.body.expiresAt)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation expiration updated successfully.
            </div>
          `,
        });
      }

      if (req.body.removeExpiration === "true") {
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation expiration removed successfully.
            </div>
          `,
        });
      }

      if (req.body.expire === "true") {
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Invitation expired successfully.</div>
          `,
        });
      }

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/invitations`
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
    ...isCourseStaffMiddleware,
    (req, res) => {
      const enrollments = database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor;
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          reference: string;
          role: EnrollmentRole;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "users"."id" AS "userId",
                   "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                   "users"."email" AS "userEmail",
                   "users"."name" AS "userName",
                   "users"."avatar" AS "userAvatar",
                   "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                   "users"."biographySource" AS "userBiographySource",
                   "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                   "enrollments"."reference",
                   "enrollments"."role"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id"
            WHERE "enrollments"."course" = ${res.locals.course.id}
            ORDER BY "enrollments"."role" ASC, "users"."name" ASC
          `
        )
        .map((enrollment) => ({
          id: enrollment.id,
          user: {
            id: enrollment.userId,
            lastSeenOnlineAt: enrollment.userLastSeenOnlineAt,
            email: enrollment.userEmail,
            name: enrollment.userName,
            avatar: enrollment.userAvatar,
            avatarlessBackgroundColor: enrollment.userAvatarlessBackgroundColor,
            biographySource: enrollment.userBiographySource,
            biographyPreprocessed: enrollment.userBiographyPreprocessed,
          },
          reference: enrollment.reference,
          role: enrollment.role,
        }));

      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Enrollments · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-people"></i>
              Enrollments
            </h2>

            <label
              class="${res.locals.localCSS(css`
                display: flex;
                gap: var(--space--2);
                align-items: baseline;
              `)}"
            >
              <i class="bi bi-funnel"></i>
              <input
                type="text"
                class="input--text"
                placeholder="Filter…"
                data-skip-is-modified="true"
                oninput="${javascript`
                  const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                  for (const enrollment of document.querySelectorAll(".enrollment")) {
                    let enrollmentHidden = filterPhrases.length > 0;
                    for (const filterablePhrasesElement of enrollment.querySelectorAll("[data-filterable-phrases]")) {
                      const filterablePhrases = JSON.parse(filterablePhrasesElement.dataset.filterablePhrases);
                      const filterablePhrasesElementChildren = [];
                      for (const filterablePhrase of filterablePhrases) {
                        let filterablePhraseElement;
                        if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                          filterablePhraseElement = document.createElement("mark");
                          filterablePhraseElement.classList.add("mark");
                          enrollmentHidden = false;
                        } else
                          filterablePhraseElement = document.createElement("span");
                        filterablePhraseElement.textContent = filterablePhrase;
                        filterablePhrasesElementChildren.push(filterablePhraseElement);
                      }
                      filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                    }
                    enrollment.hidden = enrollmentHidden;
                  }
                `}"
              />
            </label>

            $${enrollments.map((enrollment) => {
              const action = `${baseURL}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
              const isSelf = enrollment.id === res.locals.enrollment.id;
              const isOnlyStaff =
                isSelf &&
                enrollments.filter((enrollment) => enrollment.role === "staff")
                  .length === 1;

              return html`
                <div
                  class="enrollment ${res.locals.localCSS(css`
                    padding-top: var(--space--2);
                    border-top: var(--border-width--1) solid
                      var(--color--gray--medium--200);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  <div>
                    $${userPartial({
                      req,
                      res,
                      enrollment,
                      name: false,
                    })}
                  </div>

                  <div
                    class="${res.locals.localCSS(css`
                      flex: 1;
                      margin-top: var(--space--0-5);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      min-width: var(--space--0);
                    `)}"
                  >
                    <div>
                      <div
                        data-filterable-phrases="${JSON.stringify(
                          splitFilterablePhrases(enrollment.user.name)
                        )}"
                        class="strong"
                      >
                        ${enrollment.user.name}
                      </div>
                      <div
                        data-filterable-phrases="${JSON.stringify(
                          splitFilterablePhrases(enrollment.user.email)
                        )}"
                        class="secondary"
                      >
                        ${enrollment.user.email}
                      </div>
                      <div
                        class="secondary ${res.locals.localCSS(css`
                          font-size: var(--font-size--xs);
                        `)}"
                      >
                        Last seen online
                        <time
                          datetime="${new Date(
                            enrollment.user.lastSeenOnlineAt
                          ).toISOString()}"
                          oninteractive="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                          `}"
                        ></time>
                      </div>
                    </div>

                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div
                        class="${res.locals.localCSS(css`
                          width: var(--space--28);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Update Role",
                            });
                            tippy(this, {
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.HTMLForJavaScript(
                                html`
                                  <div class="dropdown--menu">
                                    $${enrollmentRoles.map((role) =>
                                      role === enrollment.role
                                        ? html``
                                        : html`
                                            <form
                                              method="POST"
                                              action="${action}?_method=PATCH"
                                            >
                                              <input
                                                type="hidden"
                                                name="_csrf"
                                                value="${req.csrfToken()}"
                                              />
                                              <input
                                                type="hidden"
                                                name="role"
                                                value="${role}"
                                              />
                                              <div>
                                                <button
                                                  class="dropdown--menu--item button button--transparent"
                                                  $${isOnlyStaff
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not update your own role because you’re the only staff member.",
                                                          });
                                                        `}"
                                                      `
                                                    : isSelf
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                            appendTo: document.body,
                                                            content: ${res.locals.HTMLForJavaScript(
                                                              html`
                                                                <form
                                                                  method="POST"
                                                                  action="${action}?_method=PATCH"
                                                                  class="${res
                                                                    .locals
                                                                    .localCSS(css`
                                                                    padding: var(
                                                                      --space--2
                                                                    );
                                                                    display: flex;
                                                                    flex-direction: column;
                                                                    gap: var(
                                                                      --space--4
                                                                    );
                                                                  `)}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <input
                                                                    type="hidden"
                                                                    name="role"
                                                                    value="${role}"
                                                                  />
                                                                  <p>
                                                                    Are you sure
                                                                    you want to
                                                                    update your
                                                                    own role to
                                                                    ${role}?
                                                                  </p>
                                                                  <p>
                                                                    <strong
                                                                      class="${res
                                                                        .locals
                                                                        .localCSS(css`
                                                                        font-weight: var(
                                                                          --font-weight--bold
                                                                        );
                                                                      `)}"
                                                                    >
                                                                      You may
                                                                      not undo
                                                                      this
                                                                      action!
                                                                    </strong>
                                                                  </p>
                                                                  <button
                                                                    class="button button--rose"
                                                                  >
                                                                    Update My
                                                                    Own Role to
                                                                    ${lodash.capitalize(
                                                                      role
                                                                    )}
                                                                  </button>
                                                                </form>
                                                              `
                                                            )},
                                                          });
                                                        `}"
                                                      `
                                                    : html``}
                                                >
                                                  $${enrollmentRoleIcon[role]
                                                    .regular}
                                                  ${lodash.capitalize(role)}
                                                </button>
                                              </div>
                                            </form>
                                          `
                                    )}
                                  </div>
                                `
                              )},
                            });
                          `}"
                        >
                          $${enrollmentRoleIcon[enrollment.role].regular}
                          ${lodash.capitalize(enrollment.role)}
                          <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>

                      <div
                        class="${res.locals.localCSS(css`
                          width: var(--space--8);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
                            tippy(this, {
                              theme: "rose",
                              touch: false,
                              content: "Remove from the Course",
                            });
                            ${
                              isOnlyStaff
                                ? javascript`
                                    tippy(this, {
                                      theme: "rose",
                                      trigger: "click",
                                      content: "You may not remove yourself from the course because you’re the only staff member.",
                                    });
                                  `
                                : javascript`
                                    tippy(this, {
                                      theme: "rose",
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.HTMLForJavaScript(
                                        html`
                                          <form
                                            method="POST"
                                            action="${action}?_method=DELETE"
                                            class="${res.locals.localCSS(css`
                                              padding: var(--space--2);
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--4);
                                            `)}"
                                          >
                                            <input
                                              type="hidden"
                                              name="_csrf"
                                              value="${req.csrfToken()}"
                                            />
                                            <p>
                                              Are you sure you want to remove
                                              ${isSelf
                                                ? "yourself"
                                                : "this person"}
                                              from the course?
                                            </p>
                                            <p>
                                              <strong
                                                class="${res.locals
                                                  .localCSS(css`
                                                  font-weight: var(
                                                    --font-weight--bold
                                                  );
                                                `)}"
                                              >
                                                You may not undo this action!
                                              </strong>
                                            </p>
                                            <button class="button button--rose">
                                              <i class="bi bi-person-dash"></i>
                                              Remove from the Course
                                            </button>
                                          </form>
                                        `
                                      )},
                                    });
                                  `
                            }
                          `}"
                        >
                          <i class="bi bi-person-dash"></i>
                        </button>
                      </div>
                    </div>

                    $${enrollment.user.biographyPreprocessed !== null
                      ? html`
                          <details class="details">
                            <summary>Biography</summary>
                            $${processContent({
                              req,
                              res,
                              type: "preprocessed",
                              content: enrollment.user.biographyPreprocessed,
                            }).processed}
                          </details>
                        `
                      : html``}
                  </div>
                </div>
              `;
            })}
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string; enrollmentReference: string },
    HTML,
    { role?: EnrollmentRole },
    {},
    MayManageEnrollmentMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...mayManageEnrollmentMiddleware,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!enrollmentRoles.includes(req.body.role)) return next("validation");
        database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Enrollment updated successfully.</div>
          `,
        });
      }

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${baseURL}/courses/${res.locals.course.reference}`
          : `${baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
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
    ...mayManageEnrollmentMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            $${res.locals.managedEnrollment.isSelf
              ? html`You removed yourself`
              : html`Person removed`}
            from the course successfully.
          </div>
        `,
      });

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${baseURL}/`
          : `${baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
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
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Your Enrollment · Course Settings · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-person"></i>
              Your Enrollment
            </h2>

            <form
              method="POST"
              action="${baseURL}/courses/${res.locals.course
                .reference}/settings/your-enrollment?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <div class="label--text">
                  Accent Color
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        trigger: "click",
                        content: "A bar with the accent color appears at the top of pages related to this course to help you differentiate between courses.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    margin-top: var(--space--1);
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  $${enrollmentAccentColors.map(
                    (accentColor) => html`
                      <input
                        type="radio"
                        name="accentColor"
                        value="${accentColor}"
                        required
                        $${accentColor === res.locals.enrollment.accentColor
                          ? html`checked`
                          : html``}
                        class="input--radio ${res.locals.localCSS(css`
                          background-color: var(--color--${accentColor}--500);
                          &:hover,
                          &:focus-within {
                            background-color: var(--color--${accentColor}--400);
                          }
                          &:active {
                            background-color: var(--color--${accentColor}--600);
                          }
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--${accentColor}--600);
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
                        `)}"
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
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    { accentColor?: EnrollmentAccentColor },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.accentColor !== "string" ||
        !enrollmentAccentColors.includes(req.body.accentColor)
      )
        return next("validation");

      database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Enrollment updated successfully.</div>
        `,
      });

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/settings/your-enrollment`
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
    ...isEnrolledInCourseMiddleware,
    ...isInvitationUsableMiddleware,
    asyncHandler(async (req, res) => {
      const link = `${baseURL}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`;
      res.send(
        boxLayout({
          req,
          res,
          head: html`
            <title>Invitation · ${res.locals.course.name} · CourseLore</title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${coursePartial({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <hr class="separator" />
            <p class="strong">You’re already enrolled.</p>
            <p>
              You may share this invitation with other people by asking them to
              point their phone camera at the following QR Code:
            </p>

            <div>
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--2);
                  align-items: baseline;
                `)}"
              >
                <input
                  type="text"
                  readonly
                  value="${link}"
                  class="input--text ${res.locals.localCSS(css`
                    flex: 1;
                  `)}"
                  onfocus="${javascript`
                    this.select();
                  `}"
                />
                <div>
                  <button
                    class="button button--tight button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "Copy Link",
                      });
                    `}"
                    onclick="${javascript`
                      (async () => {
                        await navigator.clipboard.writeText(${JSON.stringify(
                          link
                        )});
                        const stickies = this.querySelector(".stickies");
                        const check = this.querySelector(".check");
                        stickies.hidden = true;
                        check.hidden = false;
                        await new Promise((resolve) => { window.setTimeout(resolve, 500); });
                        stickies.hidden = false;
                        check.hidden = true;
                      })();
                    `}"
                  >
                    <span class="stickies">
                      <i class="bi bi-stickies"></i>
                    </span>
                    <span hidden class="check text--green">
                      <i class="bi bi-check-lg"></i>
                    </span>
                  </button>
                </div>
              </div>

              $${(
                await QRCode.toString(
                  `${baseURL}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`,
                  { type: "svg" }
                )
              )
                .replace("#000000", "currentColor")
                .replace("#ffffff", "transparent")}
            </div>

            <a
              href="${baseURL}/courses/${res.locals.course.reference}"
              class="button button--blue"
            >
              Go to ${res.locals.course.name}
              <i class="bi bi-chevron-right"></i>
            </a>
          `,
        })
      );
    })
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isSignedInMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        boxLayout({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${coursePartial({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <form
              method="POST"
              action="${baseURL}/courses/${res.locals.invitation.course
                .reference}/invitations/${res.locals.invitation.reference}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <button
                class="button button--blue ${res.locals.localCSS(css`
                  width: 100%;
                `)}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Enroll as ${lodash.capitalize(res.locals.invitation.role)}
              </button>
            </form>
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
    ...isSignedInMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${res.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitation.role},
            ${defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      if (res.locals.invitation.email !== null)
        database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        `${baseURL}/courses/${res.locals.invitation.course.reference}`
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
    ...isSignedOutMiddleware,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        boxLayout({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${coursePartial({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                gap: var(--space--4);
                & > * {
                  flex: 1;
                }
              `)}"
            >
              <a
                href="${baseURL}/sign-up${qs.stringify(
                  {
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
                  },
                  { addQueryPrefix: true }
                )}"
                class="button button--blue"
              >
                <i class="bi bi-person-plus"></i>
                Sign up
              </a>
              <a
                href="${baseURL}/sign-in${qs.stringify(
                  {
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
                  },
                  { addQueryPrefix: true }
                )}"
                class="button button--transparent"
              >
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in
              </a>
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
    BaseMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    (req, res) => {
      res.send(
        boxLayout({
          req,
          res,
          head: html` <title>Invitation · CourseLore</title> `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>

            <p>
              This invitation is invalid or expired. Please contact your course
              staff.
            </p>
          `,
        })
      );
    }
  );

  const conversationLayout = ({
    req,
    res,
    head,
    onlyConversationLayoutSidebarOnSmallScreen = false,
    mainIsAScrollingPane = false,
    body,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference?: string },
      HTML,
      {},
      {
        conversationLayoutSidebarOpenOnSmallScreen?: "true";
        search?: string;
        filters?: {
          types?: ConversationType[];
          tagsReferences?: string[];
          isPinned?: "true" | "false";
          isStaffOnly?: "true" | "false";
        };
        scrollToConversation?: "false";
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
    onlyConversationLayoutSidebarOnSmallScreen?: boolean;
    mainIsAScrollingPane?: boolean;
    body: HTML;
  }): HTML => {
    const search =
      typeof req.query.search === "string" && req.query.search.trim() !== ""
        ? sanitizeSearch(req.query.search)
        : undefined;

    const filters: {
      types?: ConversationType[];
      tagsReferences?: string[];
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
    } = {};
    if (typeof req.query.filters === "object") {
      if (Array.isArray(req.query.filters.types)) {
        const types = [
          ...new Set(
            req.query.filters.types.filter((type) =>
              conversationTypes.includes(type)
            )
          ),
        ];
        if (types.length > 0) filters.types = types;
      }
      if (Array.isArray(req.query.filters.tagsReferences)) {
        const tagsReferences = [
          ...new Set(
            req.query.filters.tagsReferences.filter(
              (tagReference) =>
                res.locals.tags.find(
                  (tag) => tagReference === tag.reference
                ) !== undefined
            )
          ),
        ];
        if (tagsReferences.length > 0) filters.tagsReferences = tagsReferences;
      }
      if (
        typeof req.query.filters.isPinned === "string" &&
        ["true", "false"].includes(req.query.filters.isPinned)
      )
        filters.isPinned = req.query.filters.isPinned;
      if (
        typeof req.query.filters.isStaffOnly === "string" &&
        ["true", "false"].includes(req.query.filters.isStaffOnly)
      )
        filters.isStaffOnly = req.query.filters.isStaffOnly;
    }

    const conversationsWithSearchResults = database
      .all<{
        reference: string;
        conversationTitleSearchResultHighlight?: string | null;
        messageAuthorUserNameSearchResultMessageReference?: string | null;
        messageAuthorUserNameSearchResultHighlight?: string | null;
        messageContentSearchResultMessageReference?: string | null;
        messageContentSearchResultSnippet?: string | null;
      }>(
        sql`
          SELECT "conversations"."reference"
                  $${
                    search === undefined
                      ? sql``
                      : sql`
                          ,
                          "conversationTitleSearchResult"."highlight" AS "conversationTitleSearchResultHighlight",
                          "messageAuthorUserNameSearchResult"."messageReference" AS "messageAuthorUserNameSearchResultMessageReference",
                          "messageAuthorUserNameSearchResult"."highlight" AS "messageAuthorUserNameSearchResultHighlight",
                          "messageContentSearchResult"."messageReference" AS "messageContentSearchResultMessageReference",
                          "messageContentSearchResult"."snippet" AS "messageContentSearchResultSnippet"
                        `
                  }
          FROM "conversations"
          $${
            search === undefined
              ? sql``
              : sql`
                LEFT JOIN (
                  SELECT "rowid",
                         "rank",
                         highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "conversationsTitleSearchIndex"
                  WHERE "conversationsTitleSearchIndex" MATCH ${search}
                ) AS "conversationTitleSearchResult" ON "conversations"."id" = "conversationTitleSearchResult"."rowid"

                LEFT JOIN (
                  SELECT "messages"."reference" AS  "messageReference",
                         "messages"."conversation" AS "conversationId",
                         "usersNameSearchIndex"."rank" AS "rank",
                         highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "usersNameSearchIndex"
                  JOIN "users" ON "usersNameSearchIndex"."rowid" = "users"."id"
                  JOIN "enrollments" ON "users"."id" = "enrollments"."user"
                  JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment"
                                     $${
                                       res.locals.enrollment.role === "staff"
                                         ? sql``
                                         : sql`
                                             AND (
                                               "messages"."anonymousAt" IS NULL OR
                                               "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                                             )
                                           `
                                     }
                  WHERE "usersNameSearchIndex" MATCH ${search}
                ) AS "messageAuthorUserNameSearchResult" ON "conversations"."id" = "messageAuthorUserNameSearchResult"."conversationId"

                LEFT JOIN (
                  SELECT "messages"."reference" AS "messageReference",
                         "messages"."conversation" AS "conversationId",
                         "messagesContentSearchIndex"."rank" AS "rank",
                         snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "snippet"
                  FROM "messagesContentSearchIndex"
                  JOIN "messages" ON "messagesContentSearchIndex"."rowid" = "messages"."id"
                  WHERE "messagesContentSearchIndex" MATCH ${search}
                ) AS "messageContentSearchResult" ON "conversations"."id" = "messageContentSearchResult"."conversationId"
              `
          }
          $${
            filters.tagsReferences === undefined
              ? sql``
              : sql`
                  JOIN "taggings" ON "conversations"."id" = "taggings"."conversation"
                  JOIN "tags" ON "taggings"."tag" = "tags"."id" AND
                                 "tags"."reference" IN ${filters.tagsReferences}
                `
          }
          WHERE "conversations"."course" = ${res.locals.course.id}
          $${
            search === undefined
              ? sql``
              : sql`
                AND (
                  "conversationTitleSearchResult"."rank" IS NOT NULL OR
                  "messageAuthorUserNameSearchResult"."rank" IS NOT NULL OR
                  "messageContentSearchResult"."rank" IS NOT NULL
                )
              `
          }
          $${
            filters.types === undefined
              ? sql``
              : sql`
                AND "conversations"."type" IN ${filters.types}
              `
          }
          $${
            filters.isPinned === undefined
              ? sql``
              : sql`
                AND "conversations"."pinnedAt" IS $${
                  filters.isPinned === "true" ? sql`NOT` : sql``
                } NULL
              `
          }
          $${
            filters.isStaffOnly === undefined
              ? sql``
              : sql`
                AND "conversations"."staffOnlyAt" IS $${
                  filters.isStaffOnly === "true" ? sql`NOT` : sql``
                } NULL
              `
          }
          GROUP BY "conversations"."id"
          ORDER BY "conversations"."pinnedAt" IS NOT NULL DESC,
                    $${
                      search === undefined
                        ? sql``
                        : sql`
                          min(
                            coalesce("conversationTitleSearchResult"."rank", 0),
                            coalesce("messageAuthorUserNameSearchResult"."rank", 0),
                            coalesce("messageContentSearchResult"."rank", 0)
                          ) ASC,
                        `
                    }
                    "conversations"."id" DESC
        `
      )
      .flatMap((conversationWithSearchResult) => {
        const conversation = getConversation({
          req,
          res,
          conversationReference: conversationWithSearchResult.reference,
        });
        if (conversation === undefined) return [];

        const searchResult =
          typeof conversationWithSearchResult.conversationTitleSearchResultHighlight ===
          "string"
            ? ({
                type: "conversationTitle",
                highlight:
                  conversationWithSearchResult.conversationTitleSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight ===
                "string"
            ? ({
                type: "messageAuthorUserName",
                message: getMessage({
                  req,
                  res,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference,
                })!,
                highlight:
                  conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageContentSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageContentSearchResultSnippet ===
                "string"
            ? ({
                type: "messageContent",
                message: getMessage({
                  req,
                  res,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageContentSearchResultMessageReference,
                })!,
                snippet:
                  conversationWithSearchResult.messageContentSearchResultSnippet,
              } as const)
            : undefined;

        return [{ conversation, searchResult }];
      });

    return applicationLayout({
      req,
      res,
      head,
      extraHeaders: html`
        $${onlyConversationLayoutSidebarOnSmallScreen
          ? html``
          : html`
              <div
                class="${res.locals.localCSS(css`
                  justify-content: center;
                  @media (min-width: 900px) {
                    display: none;
                  }
                `)}"
              >
                <button
                  class="button button--transparent"
                  onclick="${javascript`
                    document.querySelector(".conversation--layout--sidebar").classList.toggle("hidden-on-small-screen");
                    document.querySelector(".conversation--layout--main").classList.toggle("hidden-on-small-screen");
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
          class="${res.locals.localCSS(css`
            width: 100%;
            height: 100%;
            display: flex;
            @media (max-width: 899px) {
              & > .hidden-on-small-screen {
                display: none;
              }
            }
          `)}"
        >
          <div
            class="conversation--layout--sidebar ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? ""
              : "hidden-on-small-screen"} ${res.locals.localCSS(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              overflow: auto;
              @media (max-width: 899px) {
                flex: 1;
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
                border-right: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                margin: var(--space--4);
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
              `)}"
            >
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                  @media (max-width: 899px) {
                    flex: 1;
                    min-width: var(--width--0);
                    max-width: var(--width--prose);
                  }
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                  `)}"
                >
                  <a
                    href="${baseURL}/courses/${res.locals.course
                      .reference}/conversations/new${qs.stringify(
                      lodash.omit(req.query, [
                        "conversationLayoutSidebarOpenOnSmallScreen",
                      ]),
                      { addQueryPrefix: true }
                    )}"
                    class="button button--transparent"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start a New Conversation
                  </a>
                </div>

                <hr class="separator" />

                <form
                  novalidate
                  data-skip-is-modified="true"
                  class="${res.locals.localCSS(css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--1);
                  `)}"
                >
                  <input
                    type="hidden"
                    name="conversationLayoutSidebarOpenOnSmallScreen"
                    value="true"
                  />
                  <input
                    type="hidden"
                    name="scrollToConversation"
                    value="false"
                  />
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      gap: var(--space--2);
                      align-items: center;
                    `)}"
                  >
                    <input
                      type="text"
                      name="search"
                      value="${req.query.search ?? ""}"
                      placeholder="Search…"
                      class="input--text"
                    />
                    <button
                      class="button button--tight button--tight--inline button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Search",
                        });
                      `}"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                    $${req.query.search !== undefined ||
                    req.query.filters !== undefined
                      ? html`
                          <a
                            href="${qs.stringify(
                              {
                                conversationLayoutSidebarOpenOnSmallScreen:
                                  "true",
                                scrollToConversation: "false",
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: "Clear Search & Filters",
                              });
                            `}"
                          >
                            <i class="bi bi-x-lg"></i>
                          </a>
                        `
                      : html``}
                  </div>

                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                    `)}"
                  >
                    <label
                      class="button button--tight button--tight--inline button--transparent"
                    >
                      <input
                        type="checkbox"
                        class="visually-hidden input--radio-or-checkbox--multilabel"
                        $${req.query.filters === undefined
                          ? html``
                          : html`checked`}
                        onchange="${javascript`
                          const filters = this.closest("form").querySelector(".filters");
                          filters.hidden = !this.checked;
                          for (const element of filters.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = !this.checked;
                        `}"
                      />
                      <span>
                        <i class="bi bi-funnel"></i>
                        Filters
                      </span>
                      <span class="text--blue">
                        <i class="bi bi-funnel-fill"></i>
                        Filters
                      </span>
                    </label>
                  </div>

                  <div
                    $${req.query.filters === undefined ? html`hidden` : html``}
                    class="filters ${res.locals.localCSS(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `)}"
                  >
                    <div class="label">
                      <p class="label--text">Type</p>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        $${conversationTypes.map(
                          (conversationType) => html`
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="filters[types][]"
                                value="${conversationType}"
                                $${req.query.filters?.types?.includes(
                                  conversationType
                                )
                                  ? html`checked`
                                  : html``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span>
                                $${conversationTypeIcon[conversationType]
                                  .regular}
                                $${lodash.capitalize(conversationType)}
                              </span>
                              <span
                                class="${conversationTypeTextColor[
                                  conversationType
                                ].select}"
                              >
                                $${conversationTypeIcon[conversationType].fill}
                                $${lodash.capitalize(conversationType)}
                              </span>
                            </label>
                          `
                        )}
                      </div>
                    </div>

                    <div class="label">
                      <div class="label--text">
                        Pin
                        <button
                          type="button"
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
                            tippy(this, {
                              trigger: "click",
                              content: "Pinned conversations are listed first.",
                            });
                          `}"
                        >
                          <i class="bi bi-info-circle"></i>
                        </button>
                      </div>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isPinned]"
                            value="true"
                            $${req.query.filters?.isPinned === "true"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            onchange="${javascript`
                              if (this.checked) this.closest("form").querySelector('[name="filters[isPinned]"][value="false"]').checked = false;
                            `}"
                          />
                          <span>
                            <i class="bi bi-pin"></i>
                            Pinned
                          </span>
                          <span class="text--amber">
                            <i class="bi bi-pin-fill"></i>
                            Pinned
                          </span>
                        </label>
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isPinned]"
                            value="false"
                            $${req.query.filters?.isPinned === "false"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            onchange="${javascript`
                              if (this.checked) this.closest("form").querySelector('[name="filters[isPinned]"][value="true"]').checked = false;
                            `}"
                          />
                          <span>
                            <i class="bi bi-pin-angle"></i>
                            Unpinned
                          </span>
                          <span class="text--amber">
                            <i class="bi bi-pin-angle-fill"></i>
                            Unpinned
                          </span>
                        </label>
                      </div>
                    </div>

                    <div class="label">
                      <p class="label--text">Visibility</p>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isStaffOnly]"
                            value="false"
                            $${req.query.filters?.isStaffOnly === "false"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            onchange="${javascript`
                              if (this.checked) this.closest("form").querySelector('[name="filters[isStaffOnly]"][value="true"]').checked = false;
                            `}"
                          />
                          <span>
                            <i class="bi bi-eye"></i>
                            Visible by Everyone
                          </span>
                          <span class="text--pink">
                            <i class="bi bi-eye-fill"></i>
                            Visible by Everyone
                          </span>
                        </label>
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isStaffOnly]"
                            value="true"
                            $${req.query.filters?.isStaffOnly === "true"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            onchange="${javascript`
                              if (this.checked) this.closest("form").querySelector('[name="filters[isStaffOnly]"][value="false"]').checked = false;
                            `}"
                          />
                          <span>
                            <i class="bi bi-mortarboard"></i>
                            Visible by Staff Only
                          </span>
                          <span class="text--pink">
                            <i class="bi bi-mortarboard-fill"></i>
                            Visible by Staff Only
                          </span>
                        </label>
                      </div>
                    </div>

                    $${res.locals.tags.length === 0
                      ? html``
                      : html`
                          <div class="label">
                            <div class="label--text">
                              Tags
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    trigger: "click",
                                    content: "Tags help to organize conversations.",
                                  });
                                `}"
                              >
                                <i class="bi bi-info-circle"></i>
                              </button>
                            </div>
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                flex-wrap: wrap;
                                column-gap: var(--space--6);
                                row-gap: var(--space--2);
                              `)}"
                            >
                              $${res.locals.tags.map(
                                (tag) => html`
                                  <div
                                    class="${res.locals.localCSS(css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <label
                                      class="button button--tight button--tight--inline button--transparent"
                                    >
                                      <input
                                        type="checkbox"
                                        name="filters[tagsReferences][]"
                                        value="${tag.reference}"
                                        $${req.query.filters?.tagsReferences?.includes(
                                          tag.reference
                                        )
                                          ? html`checked`
                                          : html``}
                                        class="visually-hidden input--radio-or-checkbox--multilabel"
                                      />
                                      <span>
                                        <i class="bi bi-tag"></i>
                                        ${tag.name}
                                      </span>
                                      <span class="text--teal">
                                        <i class="bi bi-tag-fill"></i>
                                        ${tag.name}
                                      </span>
                                    </label>
                                    $${tag.staffOnlyAt !== null
                                      ? html`
                                          <span
                                            class="text--pink"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                touch: false,
                                                content: "This tag is visible by staff only.",
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-mortarboard-fill"
                                            ></i>
                                          </span>
                                        `
                                      : html``}
                                  </div>
                                `
                              )}
                            </div>
                          </div>
                        `}
                    <div
                      class="${res.locals.localCSS(css`
                        margin-top: var(--space--2);
                        display: flex;
                        gap: var(--space--2);
                        & > * {
                          flex: 1;
                        }
                      `)}"
                    >
                      <button
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <i class="bi bi-funnel"></i>
                        Apply Filters
                      </button>
                      $${req.query.search !== undefined ||
                      req.query.filters !== undefined
                        ? html`
                            <a
                              href="${qs.stringify(
                                {
                                  conversationLayoutSidebarOpenOnSmallScreen:
                                    "true",
                                  scrollToConversation: "false",
                                },
                                { addQueryPrefix: true }
                              )}"
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <i class="bi bi-x-lg"></i>
                              Clear Search & Filters
                            </a>
                          `
                        : html``}
                    </div>
                  </div>
                </form>

                $${conversationsWithSearchResults.length === 0
                  ? html`
                      <hr class="separator" />

                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                        `)}"
                      >
                        <div class="decorative-icon">
                          <i class="bi bi-chat-left-text"></i>
                        </div>
                        <p class="secondary">No conversation found.</p>
                      </div>
                    `
                  : html`
                      $${req.query.search === undefined &&
                      req.query.filters === undefined &&
                      conversationsWithSearchResults.some(
                        ({ conversation }) =>
                          conversation.readingsCount <
                          conversation.messagesCount
                      )
                        ? html`
                            <hr class="separator" />

                            <form
                              method="POST"
                              action="${baseURL}/courses/${res.locals.course
                                .reference}/conversations/mark-all-conversations-as-read"
                              class="${res.locals.localCSS(css`
                                display: flex;
                                justify-content: flex-end;
                              `)}"
                            >
                              <input
                                type="hidden"
                                name="_csrf"
                                value="${req.csrfToken()}"
                              />
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                  .locals.localCSS(css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `)}"
                              >
                                <i class="bi bi-check-all"></i>
                                Mark All Conversations as Read
                              </button>
                            </form>
                          `
                        : html``}

                      <div>
                        $${conversationsWithSearchResults.map(
                          ({ conversation, searchResult }) => {
                            const isSelected =
                              conversation.id === res.locals.conversation?.id;
                            return html`
                              <hr
                                class="separator ${res.locals.localCSS(css`
                                  margin: var(--space---px) var(--space--0);
                                `)}"
                              />
                              <a
                                href="${baseURL}/courses/${res.locals.course
                                  .reference}/conversations/${conversation.reference}${qs.stringify(
                                  lodash.omit(req.query, [
                                    "conversationLayoutSidebarOpenOnSmallScreen",
                                    "scrollToConversation",
                                  ]),
                                  { addQueryPrefix: true }
                                )}${typeof searchResult?.message?.reference ===
                                "string"
                                  ? `#message--${searchResult.message.reference}`
                                  : ``}"
                                class="button ${isSelected
                                  ? "button--blue"
                                  : "button--transparent"} ${res.locals
                                  .localCSS(css`
                                  width: calc(
                                    var(--space--2) + 100% + var(--space--2)
                                  );
                                  padding: var(--space--3) var(--space--2);
                                  margin-left: var(--space---2);
                                  position: relative;
                                  align-items: center;
                                  ${isSelected
                                    ? css`
                                        & + * {
                                          margin-bottom: var(--space--0);
                                        }
                                      `
                                    : css``}
                                `)}"
                                $${isSelected &&
                                req.query.scrollToConversation !== "false"
                                  ? html`
                                      oninteractive="${javascript`
                                        window.setTimeout(() => { this.scrollIntoView({ block: "center" }); }, 0);
                                      `}"
                                    `
                                  : html``}
                              >
                                <div
                                  class="${res.locals.localCSS(css`
                                    flex: 1;
                                  `)}"
                                >
                                  $${conversationPartial({
                                    req,
                                    res,
                                    conversation,
                                    searchResult,
                                  })}
                                </div>
                                <div
                                  class="${res.locals.localCSS(css`
                                    width: var(--space--4);
                                    display: flex;
                                    justify-content: flex-end;
                                  `)}"
                                >
                                  $${(() => {
                                    const unreadCount =
                                      conversation.messagesCount -
                                      conversation.readingsCount;
                                    return unreadCount === 0 ||
                                      conversation.id ===
                                        res.locals.conversation?.id
                                      ? html``
                                      : html`
                                          <button
                                            class="button button--tight button--blue ${res
                                              .locals.localCSS(css`
                                              font-size: var(--font-size--2xs);
                                              line-height: var(
                                                --line-height--2xs
                                              );
                                            `)}"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                touch: false,
                                                content: "Mark as Read",
                                              });
                                            `}"
                                            onclick="${javascript`
                                              event.preventDefault();
                                              fetch(this.closest("a").getAttribute("href"));
                                              this.remove();
                                            `}"
                                          >
                                            ${unreadCount}
                                          </button>
                                        `;
                                  })()}
                                </div>
                              </a>
                            `;
                          }
                        )}
                      </div>
                    `}
              </div>
            </div>
          </div>

          <div
            class="conversation--layout--main ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? "hidden-on-small-screen"
              : ""} ${res.locals.localCSS(css`
              overflow: auto;
              flex: 1;
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
                ${mainIsAScrollingPane
                  ? css`
                      height: 100%;
                      display: flex;
                    `
                  : css`
                      margin: var(--space--4);
                      @media (min-width: 900px) {
                        margin-left: var(--space--8);
                      }
                    `}
              `)}"
            >
              $${mainIsAScrollingPane
                ? body
                : html`
                    <div
                      class="${res.locals.localCSS(css`
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                        @media (max-width: 899px) {
                          flex: 1;
                        }
                      `)}"
                    >
                      $${body}
                    </div>
                  `}
            </div>
          </div>
        </div>
      `,
    });
  };

  const conversationPartial = ({
    req,
    res,
    conversation,
    searchResult = undefined,
    message = undefined,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    searchResult?:
      | {
          type: "conversationTitle";
          highlight: HTML;
        }
      | {
          type: "messageAuthorUserName";
          message: NonNullable<ReturnType<typeof getMessage>>;
          highlight: HTML;
        }
      | {
          type: "messageContent";
          message: NonNullable<ReturnType<typeof getMessage>>;
          snippet: HTML;
        };
    message?: NonNullable<ReturnType<typeof getMessage>>;
  }): HTML => html`
    <div
      class="${res.locals.localCSS(css`
        display: flex;
        flex-direction: column;
        gap: var(--space--1);
      `)}"
    >
      <div
        class="${res.locals.localCSS(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--4);
          row-gap: var(--space--0-5);

          & > * {
            display: flex;
            gap: var(--space--1);
          }
        `)}"
      >
        <div class="${conversationTypeTextColor[conversation.type].display}">
          $${conversationTypeIcon[conversation.type].fill}
          ${lodash.capitalize(conversation.type)}
        </div>
        $${conversation.pinnedAt !== null
          ? html`
              <div
                class="text--amber"
                oninteractive="${javascript`
                  tippy(this, {
                    touch: false,
                    content: "Pinned conversations are listed first.",
                  });
                `}"
              >
                <i class="bi bi-pin-fill"></i>
                Pinned
              </div>
            `
          : html``}
        $${conversation.staffOnlyAt !== null
          ? html`
              <div class="text--pink">
                <i class="bi bi-mortarboard-fill"></i>
                Visible by Staff Only
              </div>
            `
          : html``}
      </div>

      <h3 class="strong">
        $${searchResult?.type === "conversationTitle"
          ? searchResult.highlight
          : html`${conversation.title}`}
      </h3>

      <div
        class="secondary ${res.locals.localCSS(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--3);
          row-gap: var(--space--0-5);
        `)}"
      >
        $${userPartial({
          req,
          res,
          enrollment: conversation.authorEnrollment,
          anonymous:
            conversation.anonymousAt === null ||
            conversation.authorEnrollment === "no-longer-enrolled"
              ? false
              : res.locals.enrollment.role === "staff" ||
                conversation.authorEnrollment.id === res.locals.enrollment.id
              ? "reveal"
              : true,
          size: "xs",
        })}

        <time
          datetime="${new Date(conversation.createdAt).toISOString()}"
          oninteractive="${javascript`
            leafac.relativizeDateTimeElement(this, { capitalize: true });
          `}"
        ></time>

        <div
          oninteractive="${javascript`
            tippy(this, {
              touch: false,
              content: "Conversation Reference",
            });
          `}"
        >
          #${conversation.reference}
        </div>
      </div>

      $${conversation.taggings.length === 0
        ? html``
        : html`
            <div
              class="${res.locals.localCSS(css`
                font-size: var(--font-size--xs);
                line-height: var(--line-height--xs);
                display: flex;
                flex-wrap: wrap;
                column-gap: var(--space--4);
                row-gap: var(--space--0-5);

                & > * {
                  display: flex;
                  gap: var(--space--1);
                }
              `)}"
            >
              $${conversation.taggings.map(
                (tagging) => html`
                  <div class="text--teal">
                    <i class="bi bi-tag-fill"></i>
                    ${tagging.tag.name}
                    $${tagging.tag.staffOnlyAt !== null
                      ? html`
                          <span
                            class="text--pink"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: "This tag is visible by staff only.",
                              });
                            `}"
                          >
                            <i class="bi bi-mortarboard-fill"></i>
                          </span>
                        `
                      : html``}
                  </div>
                `
              )}
            </div>
          `}
      $${searchResult?.type === "messageAuthorUserName"
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: searchResult.message.authorEnrollment,
                  name: searchResult.highlight,
                })}
              </div>
              <div>
                $${lodash.truncate(searchResult.message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : searchResult?.type === "messageContent"
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: searchResult.message.authorEnrollment,
                  anonymous:
                    searchResult.message.anonymousAt === null ||
                    searchResult.message.authorEnrollment ===
                      "no-longer-enrolled"
                      ? false
                      : res.locals.enrollment.role === "staff" ||
                        searchResult.message.authorEnrollment.id ===
                          res.locals.enrollment.id
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>$${searchResult.snippet}</div>
            </div>
          `
        : message !== undefined
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: message.authorEnrollment,
                  anonymous:
                    message.anonymousAt === null ||
                    message.authorEnrollment === "no-longer-enrolled"
                      ? false
                      : res.locals.enrollment.role === "staff" ||
                        message.authorEnrollment.id === res.locals.enrollment.id
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>
                $${lodash.truncate(message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : html``}
    </div>
  `;

  type AuthorEnrollmentUser = {
    id: number;
    lastSeenOnlineAt: string;
    email: string;
    name: string;
    avatar: string | null;
    avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
    biographySource: string | null;
    biographyPreprocessed: HTML | null;
  };
  type AuthorEnrollment =
    | {
        id: number;
        user: AuthorEnrollmentUser;
        reference: string;
        role: EnrollmentRole;
      }
    | "no-longer-enrolled";

  const getConversation = ({
    req,
    res,
    conversationReference,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversationReference: string;
  }):
    | {
        id: number;
        createdAt: string;
        updatedAt: string | null;
        reference: string;
        authorEnrollment: AuthorEnrollment;
        anonymousAt: string | null;
        type: ConversationType;
        pinnedAt: string | null;
        staffOnlyAt: string | null;
        title: string;
        titleSearch: string;
        nextMessageReference: number;
        taggings: {
          id: number;
          tag: {
            id: number;
            reference: string;
            name: string;
            staffOnlyAt: string | null;
          };
        }[];
        messagesCount: number;
        readingsCount: number;
        endorsements: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
      }
    | undefined => {
    const conversationRow = database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentRole: EnrollmentRole | null;
      anonymousAt: string | null;
      type: ConversationType;
      pinnedAt: string | null;
      staffOnlyAt: string | null;
      title: string;
      titleSearch: string;
      nextMessageReference: number;
    }>(
      sql`
        SELECT "conversations"."id",
               "conversations"."createdAt",
               "conversations"."updatedAt",
               "conversations"."reference",
               "authorEnrollment"."id" AS "authorEnrollmentId",
               "authorUser"."id" AS "authorUserId",
               "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
               "authorUser"."email" AS "authorUserEmail",
               "authorUser"."name" AS "authorUserName",
               "authorUser"."avatar" AS "authorUserAvatar",
               "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColor",
               "authorUser"."biographySource" AS "authorUserBiographySource",
               "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
               "authorEnrollment"."reference" AS "authorEnrollmentReference",
               "authorEnrollment"."role" AS "authorEnrollmentRole",
               "conversations"."anonymousAt",
               "conversations"."type",
               "conversations"."pinnedAt",
               "conversations"."staffOnlyAt",
               "conversations"."title",
               "conversations"."titleSearch",
               "conversations"."nextMessageReference"
        FROM "conversations"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "conversations"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        $${
          res.locals.enrollment.role !== "staff"
            ? sql`
                LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation" AND
                                        "messages"."authorEnrollment" = ${res.locals.enrollment.id}
              `
            : sql``
        }
        WHERE "conversations"."course" = ${res.locals.course.id} AND
              "conversations"."reference" = ${conversationReference}
              $${
                res.locals.enrollment.role !== "staff"
                  ? sql`
                      AND (
                        "conversations"."staffOnlyAt" IS NULL OR
                        "messages"."id" IS NOT NULL
                      )
                    `
                  : sql``
              }
        GROUP BY "conversations"."id"
      `
    );
    if (conversationRow === undefined) return undefined;
    const conversation = {
      id: conversationRow.id,
      createdAt: conversationRow.createdAt,
      updatedAt: conversationRow.updatedAt,
      reference: conversationRow.reference,
      authorEnrollment:
        conversationRow.authorEnrollmentId !== null &&
        conversationRow.authorUserId !== null &&
        conversationRow.authorUserLastSeenOnlineAt !== null &&
        conversationRow.authorUserEmail !== null &&
        conversationRow.authorUserName !== null &&
        conversationRow.authorUserAvatarlessBackgroundColor !== null &&
        conversationRow.authorEnrollmentReference !== null &&
        conversationRow.authorEnrollmentRole !== null
          ? {
              id: conversationRow.authorEnrollmentId,
              user: {
                id: conversationRow.authorUserId,
                lastSeenOnlineAt: conversationRow.authorUserLastSeenOnlineAt,
                email: conversationRow.authorUserEmail,
                name: conversationRow.authorUserName,
                avatar: conversationRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  conversationRow.authorUserAvatarlessBackgroundColor,
                biographySource: conversationRow.authorUserBiographySource,
                biographyPreprocessed:
                  conversationRow.authorUserBiographyPreprocessed,
              },
              reference: conversationRow.authorEnrollmentReference,
              role: conversationRow.authorEnrollmentRole,
            }
          : ("no-longer-enrolled" as const),
      anonymousAt: conversationRow.anonymousAt,
      type: conversationRow.type,
      pinnedAt: conversationRow.pinnedAt,
      staffOnlyAt: conversationRow.staffOnlyAt,
      title: conversationRow.title,
      titleSearch: conversationRow.titleSearch,
      nextMessageReference: conversationRow.nextMessageReference,
    };

    const taggings = database
      .all<{
        id: number;
        tagId: number;
        tagReference: string;
        tagName: string;
        tagStaffOnlyAt: string | null;
      }>(
        sql`
          SELECT "taggings"."id",
                 "tags"."id" AS "tagId",
                 "tags"."reference" AS "tagReference",
                 "tags"."name" AS "tagName",
                 "tags"."staffOnlyAt" AS "tagStaffOnlyAt"
          FROM "taggings"
          JOIN "tags" ON "taggings"."tag" = "tags"."id"
          $${
            res.locals.enrollment.role === "student"
              ? sql`AND "tags"."staffOnlyAt" IS NULL`
              : sql``
          }
          WHERE "taggings"."conversation" = ${conversation.id}
          ORDER BY "tags"."id" ASC
        `
      )
      .map((tagging) => ({
        id: tagging.id,
        tag: {
          id: tagging.tagId,
          reference: tagging.tagReference,
          name: tagging.tagName,
          staffOnlyAt: tagging.tagStaffOnlyAt,
        },
      }));

    const messagesCount = database.get<{
      messagesCount: number;
    }>(
      sql`SELECT COUNT(*) AS "messagesCount" FROM "messages" WHERE "messages"."conversation" = ${conversation.id}`
    )!.messagesCount;

    const readingsCount = database.get<{ readingsCount: number }>(
      sql`
        SELECT COUNT(*) AS "readingsCount"
        FROM "readings"
        JOIN "messages" ON "readings"."message" = "messages"."id" AND
                           "messages"."conversation" = ${conversation.id}
        WHERE "readings"."enrollment" = ${res.locals.enrollment.id}
      `
    )!.readingsCount;

    const endorsements =
      conversation.type === "question"
        ? database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userLastSeenOnlineAt: string | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
              userBiographySource: string | null;
              userBiographyPreprocessed: HTML | null;
              enrollmentReference: string | null;
              enrollmentRole: EnrollmentRole | null;
            }>(
              sql`
                SELECT "endorsements"."id",
                       "enrollments"."id" AS "enrollmentId",
                       "users"."id" AS "userId",
                       "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                       "users"."email" AS "userEmail",
                       "users"."name" AS "userName",
                       "users"."avatar" AS "userAvatar",
                       "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                       "users"."biographySource" AS "userBiographySource",
                       "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                       "enrollments"."reference" AS "enrollmentReference",
                       "enrollments"."role" AS "enrollmentRole"
                FROM "endorsements"
                JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                JOIN "messages" ON "endorsements"."message" = "messages"."id" AND
                                  "messages"."conversation" = ${conversation.id}
                ORDER BY "endorsements"."id" ASC
              `
            )
            .map((endorsement) => ({
              id: endorsement.id,
              enrollment:
                endorsement.enrollmentId !== null &&
                endorsement.userId !== null &&
                endorsement.userLastSeenOnlineAt !== null &&
                endorsement.userEmail !== null &&
                endorsement.userName !== null &&
                endorsement.userAvatarlessBackgroundColor !== null &&
                endorsement.enrollmentReference !== null &&
                endorsement.enrollmentRole !== null
                  ? {
                      id: endorsement.enrollmentId,
                      user: {
                        id: endorsement.userId,
                        lastSeenOnlineAt: endorsement.userLastSeenOnlineAt,
                        email: endorsement.userEmail,
                        name: endorsement.userName,
                        avatar: endorsement.userAvatar,
                        avatarlessBackgroundColor:
                          endorsement.userAvatarlessBackgroundColor,
                        biographySource: endorsement.userBiographySource,
                        biographyPreprocessed:
                          endorsement.userBiographyPreprocessed,
                      },
                      reference: endorsement.enrollmentReference,
                      role: endorsement.enrollmentRole,
                    }
                  : ("no-longer-enrolled" as const),
            }))
        : [];

    return {
      ...conversation,
      taggings,
      messagesCount,
      readingsCount,
      endorsements,
    };
  };

  const getMessage = ({
    req,
    res,
    conversation,
    messageReference,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    messageReference: string;
  }):
    | {
        id: number;
        createdAt: string;
        updatedAt: string | null;
        reference: string;
        authorEnrollment: AuthorEnrollment;
        anonymousAt: string | null;
        answerAt: string | null;
        contentSource: string;
        contentPreprocessed: HTML;
        contentSearch: string;
        reading: { id: number } | null;
        readings: {
          id: number;
          createdAt: string;
          enrollment: AuthorEnrollment;
        }[];
        endorsements: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
        likes: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
      }
    | undefined => {
    const messageRow = database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: EnrollmentRole | null;
      authorEnrollmentRole: EnrollmentRole | null;
      anonymousAt: string | null;
      answerAt: string | null;
      contentSource: string;
      contentPreprocessed: HTML;
      contentSearch: string;
      readingId: number | null;
    }>(
      sql`
        SELECT "messages"."id",
               "messages"."createdAt",
               "messages"."updatedAt",
               "messages"."reference",
               "authorEnrollment"."id" AS "authorEnrollmentId",
               "authorUser"."id" AS "authorUserId",
               "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
               "authorUser"."email" AS "authorUserEmail",
               "authorUser"."name" AS "authorUserName",
               "authorUser"."avatar" AS "authorUserAvatar",
               "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColor",
               "authorUser"."biographySource" AS "authorUserBiographySource",
               "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
               "authorEnrollment"."reference" AS "authorEnrollmentReference",
               "authorEnrollment"."role" AS "authorEnrollmentRole",
               "messages"."anonymousAt",
               "messages"."answerAt",
               "messages"."contentSource",
               "messages"."contentPreprocessed",
               "messages"."contentSearch",
               "readings"."id" AS "readingId"
        FROM "messages"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                "readings"."enrollment" = ${res.locals.enrollment.id}
        WHERE "messages"."conversation" = ${conversation.id} AND
              "messages"."reference" = ${messageReference}
        ORDER BY "messages"."id" ASC
      `
    );
    if (messageRow === undefined) return undefined;
    const message = {
      id: messageRow.id,
      createdAt: messageRow.createdAt,
      updatedAt: messageRow.updatedAt,
      reference: messageRow.reference,
      authorEnrollment:
        messageRow.authorEnrollmentId !== null &&
        messageRow.authorUserId !== null &&
        messageRow.authorUserLastSeenOnlineAt !== null &&
        messageRow.authorUserEmail !== null &&
        messageRow.authorUserName !== null &&
        messageRow.authorUserAvatarlessBackgroundColor !== null &&
        messageRow.authorEnrollmentReference !== null &&
        messageRow.authorEnrollmentRole !== null
          ? {
              id: messageRow.authorEnrollmentId,
              user: {
                id: messageRow.authorUserId,
                lastSeenOnlineAt: messageRow.authorUserLastSeenOnlineAt,
                email: messageRow.authorUserEmail,
                name: messageRow.authorUserName,
                avatar: messageRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  messageRow.authorUserAvatarlessBackgroundColor,
                biographySource: messageRow.authorUserBiographySource,
                biographyPreprocessed:
                  messageRow.authorUserBiographyPreprocessed,
              },
              reference: messageRow.authorEnrollmentReference,
              role: messageRow.authorEnrollmentRole,
            }
          : ("no-longer-enrolled" as const),
      anonymousAt: messageRow.anonymousAt,
      answerAt: messageRow.answerAt,
      contentSource: messageRow.contentSource,
      contentPreprocessed: messageRow.contentPreprocessed,
      contentSearch: messageRow.contentSearch,
      reading:
        messageRow.readingId === null ? null : { id: messageRow.readingId },
    };

    const readings = database
      .all<{
        id: number;
        createdAt: string;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "readings"."id",
                 "readings"."createdAt",
                 "enrollments"."id" AS "enrollmentId",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                 "enrollments"."reference" AS "enrollmentReference",
                 "enrollments"."role" AS "enrollmentRole"
          FROM "readings"
          JOIN "enrollments" ON "readings"."enrollment" = "enrollments"."id"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "readings"."message" = ${message.id}
          ORDER BY "readings"."id" ASC
        `
      )
      .map((reading) => ({
        id: reading.id,
        createdAt: reading.createdAt,
        enrollment:
          reading.enrollmentId !== null &&
          reading.userId !== null &&
          reading.userLastSeenOnlineAt !== null &&
          reading.userEmail !== null &&
          reading.userName !== null &&
          reading.userAvatarlessBackgroundColor !== null &&
          reading.enrollmentReference !== null &&
          reading.enrollmentRole !== null
            ? {
                id: reading.enrollmentId,
                user: {
                  id: reading.userId,
                  lastSeenOnlineAt: reading.userLastSeenOnlineAt,
                  email: reading.userEmail,
                  name: reading.userName,
                  avatar: reading.userAvatar,
                  avatarlessBackgroundColor:
                    reading.userAvatarlessBackgroundColor,
                  biographySource: reading.userBiographySource,
                  biographyPreprocessed: reading.userBiographyPreprocessed,
                },
                reference: reading.enrollmentReference,
                role: reading.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const endorsements = database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "endorsements"."id",
                 "enrollments"."id" AS "enrollmentId",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
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
          endorsement.userLastSeenOnlineAt !== null &&
          endorsement.userEmail !== null &&
          endorsement.userName !== null &&
          endorsement.userAvatarlessBackgroundColor !== null &&
          endorsement.enrollmentReference !== null &&
          endorsement.enrollmentRole !== null
            ? {
                id: endorsement.enrollmentId,
                user: {
                  id: endorsement.userId,
                  lastSeenOnlineAt: endorsement.userLastSeenOnlineAt,
                  email: endorsement.userEmail,
                  name: endorsement.userName,
                  avatar: endorsement.userAvatar,
                  avatarlessBackgroundColor:
                    endorsement.userAvatarlessBackgroundColor,
                  biographySource: endorsement.userBiographySource,
                  biographyPreprocessed: endorsement.userBiographyPreprocessed,
                },
                reference: endorsement.enrollmentReference,
                role: endorsement.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const likes = database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "likes"."id",
                "enrollments"."id" AS "enrollmentId",
                "users"."id" AS "userId",
                "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                "users"."email" AS "userEmail",
                "users"."name" AS "userName",
                "users"."avatar" AS "userAvatar",
                "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                "users"."biographySource" AS "userBiographySource",
                "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
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
          like.userLastSeenOnlineAt !== null &&
          like.userEmail !== null &&
          like.userName !== null &&
          like.userAvatarlessBackgroundColor !== null &&
          like.enrollmentReference !== null &&
          like.enrollmentRole !== null
            ? {
                id: like.enrollmentId,
                user: {
                  id: like.userId,
                  lastSeenOnlineAt: like.userLastSeenOnlineAt,
                  email: like.userEmail,
                  name: like.userName,
                  avatar: like.userAvatar,
                  avatarlessBackgroundColor: like.userAvatarlessBackgroundColor,
                  biographySource: like.userBiographySource,
                  biographyPreprocessed: like.userBiographyPreprocessed,
                },
                reference: like.enrollmentReference,
                role: like.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    return {
      ...message,
      readings,
      endorsements,
      likes,
    };
  };

  const contentEditor = ({
    req,
    res,
    name = "content",
    contentSource = "",
    required = true,
    compact = false,
    skipIsModified = false,
    expanded = false,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
    >;
    name?: string;
    contentSource?: string;
    required?: boolean;
    compact?: boolean;
    skipIsModified?: boolean;
    expanded?: boolean;
  }): HTML => html`
    <div
      class="content-editor ${res.locals.localCSS(css`
        min-width: var(--space--0);
      `)}"
      onbeforeelupdated="${javascript`
        return false;
      `}"
    >
      <div
        $${compact ? html`hidden` : html``}
        class="${res.locals.localCSS(css`
          display: flex;
          gap: var(--space--1);

          .button {
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            padding-bottom: var(--space--4);
            margin-bottom: var(--space---3);
          }
          & + * {
            position: relative;
          }

          :checked + .button--transparent {
            background-color: var(--color--gray--medium--100);
          }
          :focus-within + .button--transparent {
            background-color: var(--color--gray--medium--200);
          }
          @media (prefers-color-scheme: dark) {
            :checked + .button--transparent {
              background-color: var(--color--gray--medium--800);
            }
            :focus-within + .button--transparent {
              background-color: var(--color--gray--medium--700);
            }
          }
        `)}"
      >
        <label>
          <input
            type="radio"
            name="content-editor--mode"
            checked
            data-skip-is-modified="true"
            class="content-editor--button--write visually-hidden"
            onclick="${javascript`
              this.closest(".content-editor").querySelector(".content-editor--write").hidden = false;
              this.closest(".content-editor").querySelector(".content-editor--loading").hidden = true;
              this.closest(".content-editor").querySelector(".content-editor--preview").hidden = true;
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
            name="content-editor--mode"
            data-skip-is-modified="true"
            class="content-editor--button--preview visually-hidden"
            onclick="${javascript`
              (async () => {
                const write = this.closest(".content-editor").querySelector(".content-editor--write");
                const loading = this.closest(".content-editor").querySelector(".content-editor--loading");
                const preview = this.closest(".content-editor").querySelector(".content-editor--preview");
                const textarea = write.querySelector("textarea");
                ${
                  required
                    ? javascript``
                    : javascript`
                        textarea.setAttribute("required", "");
                      `
                }
                const isWriteValid = leafac.validate(write);
                ${
                  required
                    ? javascript``
                    : javascript`
                        textarea.removeAttribute("required");
                      `
                }
                if (!isWriteValid) {
                  event.preventDefault();
                  return;
                }
                write.hidden = true;
                loading.hidden = false;
                preview.hidden = true;
                leafac.mount(
                  preview,
                  await (
                    await fetch("${baseURL}${
              res.locals.course === undefined
                ? ""
                : `/courses/${res.locals.course.reference}`
            }/content-editor/preview", {
                      method: "POST",
                      body: new URLSearchParams({
                        _csrf: ${JSON.stringify(req.csrfToken())},
                        content: textarea.value,
                      }),
                    })
                  ).text()
                );
                write.hidden = true;
                loading.hidden = true;
                preview.hidden = false;
              })();
            `}"
          />
          <span
            class="button button--transparent"
            oninteractive="${javascript`
            ${
              compact
                ? javascript``
                : javascript`
                    Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+p", () => { this.click(); return false; });
                  `
            }
              tippy(this, {
                touch: false,
                content: ${res.locals.HTMLForJavaScript(
                  html`
                    <span class="keyboard-shortcut">
                      <span
                        oninteractive="${javascript`
                          this.hidden = leafac.isAppleDevice;
                        `}"
                        >Ctrl+Shift+P</span
                      ><span
                        class="keyboard-shortcut--cluster"
                        oninteractive="${javascript`
                          this.hidden = !leafac.isAppleDevice;
                        `}"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>P</span
                      >
                    </span>
                  `
                )},
              });
            `}"
          >
            <i class="bi bi-eyeglasses"></i>
            Preview
          </span>
        </label>
      </div>
      <div
        class="${res.locals.localCSS(css`
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--800);
          }
          border-radius: var(--border-radius--lg);
        `)}"
      >
        <div class="content-editor--write">
          <div
            $${compact ? html`hidden` : html``}
            class="${res.locals.localCSS(css`
              padding: var(--space--1) var(--space--0);
              margin: var(--space--0) var(--space--3);
              overflow-x: auto;
              display: flex;
              & > * {
                display: flex;
              }
              & > * + * {
                padding-left: var(--space--0-5);
                border-left: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
                margin-left: var(--space--0-5);
              }
            `)}"
          >
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  tippy(this, {
                    touch: false,
                    content: "Help",
                  });
                  tippy(this, {
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <p>
                          You may style text with
                          <a
                            href="https://guides.github.com/features/mastering-markdown/"
                            target="_blank"
                            class="link"
                            >GitHub Flavored Markdown</a
                          >
                          and include mathematical formulas with
                          <a
                            href="https://katex.org/docs/supported.html"
                            target="_blank"
                            class="link"
                            >LaTeX</a
                          >.
                        </p>
                      `
                    )},
                  });
                `}"
              >
                <i class="bi bi-info-circle"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+1", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 1
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+1</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>1</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "# ", "\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-type-h1"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+2", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 2
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+2</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>2</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "## ", "\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-type-h2"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+3", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 3
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+3</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>3</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+b", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Bold
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+B</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>B</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, "**");
                  element.focus();
                `}"
              >
                <i class="bi bi-type-bold"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+i", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Italic
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>I</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, "_");
                  element.focus();
                `}"
              >
                <i class="bi bi-type-italic"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+k", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Link
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>K</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+8", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Bulleted List
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+8</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>8</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "- ", "\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-list-ul"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+7", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Numbered List
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+7</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>7</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "1. ", "\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-list-ol"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+9", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Checklist
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+9</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>9</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+'", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Quote
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+'</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>'</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> ", "\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-chat-left-quote"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+t", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Table
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+T</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>T</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  const gapLength = element.selectionEnd - element.selectionStart + 2;
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "| ", " |  |\\n|" + "-".repeat(gapLength) + "|--|\\n|" + " ".repeat(gapLength) + "|  |\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-table"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+d", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Disclosure
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+D</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>D</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "<details>\\n<summary>", "</summary>\\n\\nContent\\n\\n</details>\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-chevron-bar-expand"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+f", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Footnote
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+F</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>F</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, "[^", "<identifier>]\\n\\n[^<identifier>]: <footnote>");
                  element.focus();
                `}"
              >
                <i class="bi bi-card-text"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+e", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Inline Code
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, "\`");
                  element.focus();
                `}"
              >
                <i class="bi bi-code"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+e", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Code Block
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+e", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Inline Equation
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, "$");
                  element.focus();
                `}"
              >
                <i class="bi bi-calculator"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+alt+shift+e", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Equation Block
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "$$\\n", "\\n$$\\n\\n");
                  element.focus();
                `}"
              >
                <i class="bi bi-calculator-fill"></i>
              </button>
            </div>
            $${res.locals.course !== undefined
              ? html`
                  <div>
                    <button
                      type="button"
                      class="button button--tight button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              Mention User
                              <span class="keyboard-shortcut">(@)</span>
                            `
                          )},
                        }); 
                      `}"
                      onclick="${javascript`
                        const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                        textFieldEdit.wrapSelection(element, "@", "");
                        element.focus();
                      `}"
                    >
                      <i class="bi bi-at"></i>
                    </button>
                    <button
                      type="button"
                      class="button button--tight button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              Refer to Conversation or Message
                              <span class="keyboard-shortcut">(#)</span>
                            `
                          )},
                        });
                      `}"
                      onclick="${javascript`
                        const element = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                        textFieldEdit.wrapSelection(element, "#", "");
                        element.focus();
                      `}"
                    >
                      <i class="bi bi-hash"></i>
                    </button>
                  </div>
                `
              : html``}
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+i", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Image
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>I</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  this.closest(".content-editor").querySelector(".attachments").click();
                `}"
              >
                <i class="bi bi-image"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".content-editor").querySelector(".content-editor--write--textarea")).bind("mod+shift+k", () => { this.click(); return false; });
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Attachment
                        <span class="keyboard-shortcut">
                          (<span
                            oninteractive="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            oninteractive="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>K</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `
                    )},
                  });
                `}"
                onclick="${javascript`
                  this.closest(".content-editor").querySelector(".attachments").click();
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
                oninteractive="${javascript`
                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");
                  const uploadingIndicator = tippy(textarea, {
                    trigger: "manual",
                    hideOnClick: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                            gap: var(--space--2);
                          `)}"
                        >
                          $${spinner({ req, res })} Uploading…
                        </div>
                      `
                    )},
                  });
                  this.upload = async (fileList) => {
                    if (this.errorIfNotSignedIn()) return;
                    const body = new FormData();
                    body.append("_csrf", ${JSON.stringify(req.csrfToken())});
                    tippy.hideAll();
                    uploadingIndicator.show();
                    textarea.disabled = true;
                    for (const file of fileList) body.append("attachments", file);
                    this.value = "";
                    const response = await (await fetch("${baseURL}/content-editor/attachments", {
                      method: "POST",
                      body,
                    })).text();
                    textarea.disabled = false;
                    uploadingIndicator.hide();
                    textFieldEdit.wrapSelection(textarea, response, "");
                    textarea.focus();
                  };
                  this.errorIfNotSignedIn = () => {
                    ${
                      res.locals.user === undefined
                        ? javascript`
                            const tooltip = tippy(this.closest(".content-editor").querySelector(".content-editor--write--textarea"), {
                              trigger: "manual",
                              theme: "rose",
                              showOnCreate: true,
                              onHidden: () => {
                                tooltip.destroy();
                              },
                              content: "You must sign in to upload files.",
                            });
                            return true;
                          `
                        : javascript`
                            return false;
                          `
                    }
                  };
                `}"
                onclick="${javascript`
                  if (this.errorIfNotSignedIn()) event.preventDefault();
                `}"
                onchange="${javascript`
                  this.upload(this.files);
                `}"
              />
            </div>
          </div>
          <div
            class="${res.locals.localCSS(css`
              position: relative;
            `)}"
          >
            <div
              class="content-editor--write--textarea--dropdown-menu-target ${res
                .locals.localCSS(css`
                width: var(--space--0);
                height: var(--line-height--sm);
                position: absolute;
              `)}"
            ></div>
            <textarea
              name="${name}"
              $${required ? html`required` : html``}
              $${skipIsModified ? html`data-skip-is-modified="true"` : html``}
              class="content-editor--write--textarea input--text input--text--textarea ${res
                .locals.localCSS(css`
                ${compact
                  ? css`
                      height: var(--space--14);
                    `
                  : expanded
                  ? css`
                      height: var(--space--52);
                    `
                  : css`
                      height: var(--space--20);
                    `}

                transition-property: var(--transition-property--all);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
                &.drag {
                  background-color: var(--color--blue--200);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--blue--900);
                  }
                }
              `)}"
              $${res.locals.course !== undefined
                ? html`
                    oninteractive="${javascript`
                      const contentEditor = this.closest(".content-editor");
                      const dropdownMenuTarget = contentEditor.querySelector(".content-editor--write--textarea--dropdown-menu-target");
                      const dropdownMenus = [
                        {
                          trigger: "@",
                          route: "mention-user-search",
                          dropdownMenu: tippy(dropdownMenuTarget, {
                            placement: "bottom-start",
                            trigger: "manual",
                            interactive: true,
                            content: ${res.locals.HTMLForJavaScript(
                              html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    width: var(--space--56);
                                    max-height: var(--space--44);
                                    overflow: auto;
                                  `)}"
                                >
                                  <p class="heading">
                                    <i class="bi bi-at"></i>
                                    Mention User
                                  </p>
                                  <div class="dropdown--menu">
                                    <div class="search-results"></div>
                                    <button
                                      type="button"
                                      class="dropdown--menu--item button button--transparent"
                                      onclick="${javascript`
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("everyone");
                                      `}"
                                    >
                                      Everyone in the Conversation
                                    </button>
                                    <button
                                      type="button"
                                      class="dropdown--menu--item button button--transparent"
                                      onclick="${javascript`
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("staff");
                                      `}"
                                    >
                                      Staff in the Conversation
                                    </button>
                                    <button
                                      type="button"
                                      class="dropdown--menu--item button button--transparent"
                                      onclick="${javascript`
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("students");
                                      `}"
                                    >
                                      Students in the Conversation
                                    </button>
                                  </div>
                                </div>
                              `
                            )},
                          }),
                        },
                        {
                          trigger: "#",
                          route: "refer-to-conversation-or-message-search",
                          dropdownMenu: tippy(dropdownMenuTarget, {
                            placement: "bottom-start",
                            trigger: "manual",
                            interactive: true,
                            content: ${res.locals.HTMLForJavaScript(
                              html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    width: var(--space--72);
                                    max-height: var(--space--44);
                                    overflow: auto;
                                  `)}"
                                >
                                  <p class="heading">
                                    <i class="bi bi-hash"></i>
                                    Refer to Conversation or Message
                                  </p>
                                  <div class="dropdown--menu">
                                    <div class="search-results"></div>
                                  </div>
                                </div>
                              `
                            )},
                          }),
                        },
                      ];
                      let anchorIndex = null;

                      this.addEventListener("input", (() => {
                        let isUpdating = false;
                        let shouldUpdateAgain = false;
                        return async function onInput() {
                          const value = this.value;
                          const selectionMin = Math.min(this.selectionStart, this.selectionEnd);
                          const selectionMax = Math.max(this.selectionStart, this.selectionEnd);
                          for (const { trigger, route, dropdownMenu } of dropdownMenus) {
                            if (!dropdownMenu.state.isShown) {
                              if (
                                value[selectionMin - 1] !== trigger ||
                                (selectionMin > 1 && value[selectionMin - 2].match(/\\w/) !== null)
                              ) continue;
                              anchorIndex = selectionMin;
                              const caretCoordinates = getCaretCoordinates(this, anchorIndex - 1);
                              dropdownMenuTarget.style.top = String(caretCoordinates.top) + "px";
                              dropdownMenuTarget.style.left = String(caretCoordinates.left) + "px";
                              tippy.hideAll();
                              dropdownMenu.show();
                            }
                            if (selectionMin < anchorIndex || value[anchorIndex - 1] !== trigger) {
                              dropdownMenu.hide();
                              continue;
                            }
                            if (isUpdating) {
                              shouldUpdateAgain = true;
                              continue;
                            }
                            isUpdating = true;
                            shouldUpdateAgain = false;
                            const content = dropdownMenu.props.content;
                            const searchResults = content.querySelector(".search-results");
                            const search = value.slice(anchorIndex, selectionMax).trim();
                            if (search === "")
                              searchResults.innerHTML = "";
                            else
                              leafac.mount(
                                searchResults,
                                await (await fetch("${baseURL}/courses/${
                      res.locals.course.reference
                    }/content-editor/" + route + "?" + new URLSearchParams({ search }))).text()
                              );
                            const buttons = content.querySelectorAll(".button");
                            for (const button of buttons) button.classList.remove("hover");
                            if (buttons.length > 0) buttons[0].classList.add("hover");
                            isUpdating = false;
                            if (shouldUpdateAgain) onInput();
                          }
                        }
                      })());

                      this.addEventListener("keydown", (event) => {
                        for (const { dropdownMenu } of dropdownMenus) {
                          if (!dropdownMenu.state.isShown) continue;
                          const content = dropdownMenu.props.content;
                          switch (event.code) {
                            case "ArrowUp":
                            case "ArrowDown":
                              event.preventDefault();
                              const buttons = [...content.querySelectorAll(".button")];
                              if (buttons.length === 0) continue;    
                              const currentHoverIndex = buttons.indexOf(content.querySelector(".button.hover"));
                              if (
                                currentHoverIndex === -1 ||
                                (event.code === "ArrowUp" && currentHoverIndex === 0) ||
                                (event.code === "ArrowDown" && currentHoverIndex === buttons.length - 1)
                              ) continue;
                              buttons[currentHoverIndex].classList.remove("hover");
                              const buttonToHover = buttons[currentHoverIndex + (event.code === "ArrowUp" ? -1 : 1)];
                              buttonToHover.classList.add("hover");
                              scrollIntoView(buttonToHover, { scrollMode: "if-needed" });
                              break;

                            case "Enter":
                            case "Tab":
                              const buttonHover = content.querySelector(".button.hover");
                              if (buttonHover === null) dropdownMenu.hide();
                              else {
                                event.preventDefault();
                                buttonHover.click();
                              }
                              break;

                            case "Escape":
                            case "ArrowLeft":
                            case "ArrowRight":
                            case "Home":
                            case "End":
                              dropdownMenu.hide();
                              break;
                          }
                        }
                      });

                      this.dropdownMenuComplete = (text) => {
                        this.setSelectionRange(anchorIndex, Math.max(this.selectionStart, this.selectionEnd));
                        textFieldEdit.insert(this, text + " ");
                        tippy.hideAll();
                        this.focus();
                      };
                    `}"
                  `
                : html``}
              $${compact
                ? html``
                : html`
                    onfocus="${javascript`
                      this.style.height = "var(--space--52)";
                    `}"
                  `}
              ondragenter="${javascript`
                this.classList.add("drag");
              `}"
              ondragover="${javascript`
                event.preventDefault();
              `}"
              ondrop="${javascript`
                event.preventDefault();
                this.classList.remove("drag");
                this.closest(".content-editor").querySelector(".attachments").upload(event.dataTransfer.files);
              `}"
              ondragleave="${javascript`
                this.classList.remove("drag");
              `}"
              onpaste="${javascript`
                if (event.clipboardData.files.length === 0) return;
                event.preventDefault();
                this.closest(".content-editor").querySelector(".attachments").upload(event.clipboardData.files);
              `}"
            >
${contentSource}</textarea
            >
          </div>
        </div>

        <div
          hidden
          class="content-editor--loading strong ${res.locals.localCSS(css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: var(--space--2);
          `)}"
        >
          $${spinner({ req, res })} Loading…
        </div>

        <div
          hidden
          class="content-editor--preview ${res.locals.localCSS(css`
            padding: var(--space--4);
          `)}"
        ></div>
      </div>
    </div>
  `;

  app.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/mention-user-search",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.query.search !== "string" ||
        req.query.search.trim() === ""
      )
        return next("validation");

      const enrollments = database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor;
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          userNameSearchResultHighlight: string;
          reference: string;
          role: EnrollmentRole;
        }>(
          sql`
          SELECT "enrollments"."id",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                 highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "userNameSearchResultHighlight",
                 "enrollments"."reference",
                 "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id" AND
                          "enrollments"."course" = ${res.locals.course.id} AND
                          "users"."id" != ${res.locals.user.id}
          JOIN "usersNameSearchIndex" ON "users"."id" = "usersNameSearchIndex"."rowid" AND
                                         "usersNameSearchIndex" MATCH ${sanitizeSearch(
                                           req.query.search,
                                           { prefix: true }
                                         )}
          ORDER BY "usersNameSearchIndex"."rank" ASC,
                   "users"."name" ASC
          LIMIT 5
        `
        )
        .map((enrollment) => ({
          id: enrollment.id,
          user: {
            id: enrollment.userId,
            lastSeenOnlineAt: enrollment.userLastSeenOnlineAt,
            email: enrollment.userEmail,
            name: enrollment.userName,
            avatar: enrollment.userAvatar,
            avatarlessBackgroundColor: enrollment.userAvatarlessBackgroundColor,
            biographySource: enrollment.userBiographySource,
            biographyPreprocessed: enrollment.userBiographyPreprocessed,
            nameSearchResultHighlight: enrollment.userNameSearchResultHighlight,
          },
          reference: enrollment.reference,
          role: enrollment.role,
        }));

      res.send(
        partialLayout({
          req,
          res,
          body: html`
            $${enrollments.length === 0
              ? html`
                  <div class="dropdown--menu--item secondary">
                    No user found.
                  </div>
                `
              : enrollments.map(
                  (enrollment) => html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onclick="${javascript`
                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${
                          enrollment.reference
                        }--${slugify(enrollment.user.name)}");
                      `}"
                    >
                      $${userPartial({
                        req,
                        res,
                        enrollment,
                        name: enrollment.user.nameSearchResultHighlight,
                        tooltip: false,
                        size: "xs",
                      })}
                    </button>
                  `
                )}
          `,
        })
      );
    }
  );

  app.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/refer-to-conversation-or-message-search",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.query.search !== "string" ||
        req.query.search.trim() === ""
      )
        return next("validation");

      const results: HTML[] = [];

      if (req.query.search.match(/^\d+$/) !== null)
        results.push(
          ...database
            .all<{ reference: string }>(
              sql`
                SELECT "conversations"."reference"
                FROM "conversations"
                JOIN "conversationsReferenceIndex" ON "conversations"."id" = "conversationsReferenceIndex"."rowid" AND
                                                      "conversationsReferenceIndex" MATCH ${sanitizeSearch(
                                                        req.query.search,
                                                        { prefix: true }
                                                      )}
                WHERE "conversations"."course" = ${res.locals.course.id}
                ORDER BY "conversations"."id" ASC
                LIMIT 5
              `
            )
            .flatMap((conversationRow) => {
              const conversation = getConversation({
                req,
                res,
                conversationReference: conversationRow.reference,
              });
              return conversation === undefined
                ? []
                : [
                    html`
                      <button
                        type="button"
                        class="dropdown--menu--item button button--transparent"
                        onclick="${javascript`
                          this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}");
                        `}"
                      >
                        <span>
                          <span class="secondary">
                            $${highlightSearchResult(
                              `#${conversation.reference}`,
                              `#${req.query.search}`,
                              { prefix: true }
                            )}
                          </span>
                          <span class="strong">${conversation.title}</span>
                        </span>
                      </button>
                    `,
                  ];
            })
        );

      const messageReferenceSearchMatch =
        req.query.search.match(/^(\d+)\/(\d*)$/);
      if (messageReferenceSearchMatch !== null) {
        const [conversationReference, messageReferenceSearch] =
          messageReferenceSearchMatch.slice(1);
        const conversation = getConversation({
          req,
          res,
          conversationReference,
        });
        if (conversation !== undefined) {
          results.push(
            ...database
              .all<{ reference: string }>(
                sql`
                  SELECT "messages"."reference"
                  FROM "messages"
                  $${
                    messageReferenceSearch === ""
                      ? sql``
                      : sql`
                        JOIN "messagesReferenceIndex" ON "messages"."id" = "messagesReferenceIndex"."rowid" AND
                                                         "messagesReferenceIndex" MATCH ${sanitizeSearch(
                                                           messageReferenceSearch,
                                                           { prefix: true }
                                                         )}
                      `
                  }
                  WHERE "messages"."conversation" = ${conversation.id}
                  ORDER BY "messages"."id" ASC
                  LIMIT 5
                `
              )
              .flatMap((messageRow) => {
                const message = getMessage({
                  req,
                  res,
                  conversation,
                  messageReference: messageRow.reference,
                });
                return message === undefined
                  ? []
                  : [
                      html`
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          onclick="${javascript`
                            this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}/${message.reference}");
                          `}"
                        >
                          <div>
                            <div>
                              <span class="secondary">
                                $${highlightSearchResult(
                                  `#${conversation.reference}/${message.reference}`,
                                  `#${req.query.search}`,
                                  { prefix: true }
                                )}
                              </span>
                              <span class="strong">
                                ${conversation.title}
                              </span>
                            </div>
                            <div class="secondary">
                              $${lodash.truncate(message.contentSearch, {
                                length: 100,
                                separator: /\W/,
                              })}
                            </div>
                          </div>
                        </button>
                      `,
                    ];
              })
          );
          results.push(
            html`
              <button
                type="button"
                class="dropdown--menu--item button button--transparent"
                onclick="${javascript`
                  this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}");
                `}"
              >
                <span>
                  <span class="secondary">
                    $${highlightSearchResult(
                      `#${conversation.reference}`,
                      `#${conversationReference}`
                    )}
                  </span>
                  <span class="strong">${conversation.title}</span>
                </span>
              </button>
            `
          );
        }
      }

      results.push(
        ...database
          .all<{
            reference: string;
            conversationTitleSearchResultHighlight: string;
          }>(
            sql`
              SELECT "conversations"."reference",
                     highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "conversationTitleSearchResultHighlight"
              FROM "conversations"
              JOIN "conversationsTitleSearchIndex" ON "conversations"."id" = "conversationsTitleSearchIndex"."rowid" AND
                                                      "conversationsTitleSearchIndex" MATCH ${sanitizeSearch(
                                                        req.query.search,
                                                        { prefix: true }
                                                      )}
              WHERE "conversations"."course" = ${res.locals.course.id}
              ORDER BY "conversationsTitleSearchIndex"."rank" ASC,
                       "conversations"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((conversationRow) => {
            const conversation = getConversation({
              req,
              res,
              conversationReference: conversationRow.reference,
            });
            return conversation === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onclick="${javascript`
                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}");
                      `}"
                    >
                      <span>
                        <span class="secondary">
                          #${conversation.reference}
                        </span>
                        <span class="strong">
                          $${conversationRow.conversationTitleSearchResultHighlight}
                        </span>
                      </span>
                    </button>
                  `,
                ];
          })
      );

      results.push(
        ...database
          .all<{
            messageReference: string;
            conversationReference: string;
            messageAuthorUserNameSearchResultHighlight: string;
          }>(
            sql`
              SELECT "messages"."reference" AS "messageReference",
                     "conversations"."reference" AS "conversationReference",
                     highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "messageAuthorUserNameSearchResultHighlight"
              FROM "messages"
              JOIN "enrollments" ON "messages"."authorEnrollment" = "enrollments"."id"
              JOIN "usersNameSearchIndex" ON "enrollments"."user" = "usersNameSearchIndex"."rowid" AND
                                             "usersNameSearchIndex" MATCH ${sanitizeSearch(
                                               req.query.search,
                                               { prefix: true }
                                             )}
              JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                      "conversations"."course" = ${
                                        res.locals.course.id
                                      }
              $${
                res.locals.enrollment.role === "staff"
                  ? sql``
                  : sql`
                      WHERE (
                       "messages"."anonymousAt" IS NULL OR
                       "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                     )
                   `
              }
              ORDER BY "usersNameSearchIndex"."rank" ASC,
                       "messages"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((messageRow) => {
            const conversation = getConversation({
              req,
              res,
              conversationReference: messageRow.conversationReference,
            });
            if (conversation === undefined) return [];
            const message = getMessage({
              req,
              res,
              conversation,
              messageReference: messageRow.messageReference,
            });
            return message === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onclick="${javascript`
                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}/${message.reference}");
                      `}"
                    >
                      <div>
                        <div>
                          <span class="secondary">
                            #${conversation.reference}/${message.reference}
                          </span>
                          <span class="strong">${conversation.title}</span>
                        </div>
                        <div class="secondary">
                          <div>
                            $${userPartial({
                              req,
                              res,
                              enrollment: message.authorEnrollment,
                              name: messageRow.messageAuthorUserNameSearchResultHighlight,
                              tooltip: false,
                            })}
                          </div>
                          <div>
                            $${lodash.truncate(message.contentSearch, {
                              length: 100,
                              separator: /\W/,
                            })}
                          </div>
                        </div>
                      </div>
                    </button>
                  `,
                ];
          })
      );

      results.push(
        ...database
          .all<{
            messageReference: string;
            conversationReference: string;
            messageContentSearchResultSnippet: string;
          }>(
            sql`
              SELECT "messages"."reference" AS "messageReference",
                     "conversations"."reference" AS "conversationReference",
                     snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "messageContentSearchResultSnippet"
              FROM "messages"
              JOIN "messagesContentSearchIndex" ON "messages"."id" = "messagesContentSearchIndex"."rowid" AND
                                                   "messagesContentSearchIndex" MATCH ${sanitizeSearch(
                                                     req.query.search,
                                                     { prefix: true }
                                                   )}
              JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                      "conversations"."course" = ${
                                        res.locals.course.id
                                      }
              ORDER BY "messagesContentSearchIndex"."rank" ASC,
                       "messages"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((messageRow) => {
            const conversation = getConversation({
              req,
              res,
              conversationReference: messageRow.conversationReference,
            });
            if (conversation === undefined) return [];
            const message = getMessage({
              req,
              res,
              conversation,
              messageReference: messageRow.messageReference,
            });
            return message === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onclick="${javascript`
                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("${conversation.reference}/${message.reference}");
                      `}"
                    >
                      <div>
                        <div>
                          <span class="secondary">
                            #${conversation.reference}/${message.reference}
                          </span>
                          <span class="strong">${conversation.title}</span>
                        </div>
                        <div class="secondary">
                          $${messageRow.messageContentSearchResultSnippet}
                        </div>
                      </div>
                    </button>
                  `,
                ];
          })
      );

      res.send(
        partialLayout({
          req,
          res,
          body: html`
            $${results.length === 0
              ? html`
                  <div class="dropdown--menu--item secondary">
                    No conversation or message found.
                  </div>
                `
              : results}
          `,
        })
      );
    }
  );

  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/content-editor/attachments",
    ...isSignedInMiddleware,
    asyncHandler(async (req, res, next) => {
      if (req.files?.attachments === undefined) return next("validation");
      const attachments = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];
      for (const attachment of attachments) {
        if (attachment.truncated)
          return res
            .status(413)
            .send(
              `<!-- Failed to upload: Attachments must be smaller than 10MB. -->`
            );
        attachment.name = filenamify(attachment.name, { replacement: "-" });
        if (attachment.name.trim() === "") return next("validation");
      }
      const attachmentsContentSources: string[] = [];
      for (const attachment of attachments) {
        const folder = cryptoRandomString({
          length: 20,
          type: "numeric",
        });
        await attachment.mv(
          path.join(dataDirectory, `files/${folder}/${attachment.name}`)
        );
        const href = `${baseURL}/files/${folder}/${encodeURIComponent(
          attachment.name
        )}`;
        if (attachment.mimetype.startsWith("image/"))
          try {
            const image = sharp(attachment.data, { limitInputPixels: false });
            const metadata = await image.metadata();
            if (metadata.width === undefined) throw new Error();
            const maximumWidth = 1152; /* var(--width--6xl) */
            if (metadata.width <= maximumWidth) {
              attachmentsContentSources.push(
                `[<img src="${href}" alt="${attachment.name}" width="${
                  metadata.width / 2
                }" />](${href})`
              );
              continue;
            }
            const ext = path.extname(attachment.name);
            const nameThumbnail = `${attachment.name.slice(
              0,
              attachment.name.length - ext.length
            )}--thumbnail${ext}`;
            await image
              .rotate()
              .resize({ width: maximumWidth })
              .toFile(
                path.join(dataDirectory, `files/${folder}/${nameThumbnail}`)
              );
            attachmentsContentSources.push(
              `[<img src="${baseURL}/files/${folder}/${encodeURIComponent(
                nameThumbnail
              )}" alt="${attachment.name}" width="${
                maximumWidth / 2
              }" />](${href})`
            );
            continue;
          } catch {}
        attachmentsContentSources.push(`[${attachment.name}](${href})`);
      }
      res.send(` ${attachmentsContentSources.join("\n\n")} `);
    })
  );

  const processContent = await (async () => {
    const unifiedProcessor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(
        rehypeSanitize,
        deepMerge(rehypeSanitizeDefaultSchema, {
          attributes: {
            code: ["className"],
            span: [["className", "math", "math-inline"]],
            div: [["className", "math", "math-display"]],
          },
        })
      )
      .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
      .use(rehypeShiki, {
        highlighter: {
          light: await shiki.getHighlighter({ theme: "light-plus" }),
          dark: await shiki.getHighlighter({ theme: "dark-plus" }),
        },
      })
      .use(() => (tree) => {
        unistUtilVisit(tree, (node) => {
          if (
            (node as any).properties !== undefined &&
            node.position !== undefined
          )
            (node as any).properties.dataPosition = JSON.stringify(
              node.position
            );
        });
      })
      .use(rehypeStringify);

    return ({
      req,
      res,
      type,
      content,
      decorate = false,
      search = undefined,
    }: {
      req: express.Request<
        {},
        any,
        {},
        {},
        BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
      >;
      res: express.Response<
        any,
        BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
      >;
      type: "source" | "preprocessed";
      content: string;
      decorate?: boolean;
      search?: string | string[] | undefined;
    }): {
      preprocessed: HTML | undefined;
      search: string | undefined;
      processed: HTML;
      mentions: Set<string> | undefined;
    } => {
      const contentElement = JSDOM.fragment(html`
        <div class="content">
          $${type === "source"
            ? unifiedProcessor.processSync(content).toString()
            : type === "preprocessed"
            ? content
            : html``}
        </div>
      `).firstElementChild!;
      const contentPreprocessed =
        type === "source" ? contentElement.innerHTML : undefined;
      const contentSearch =
        type === "source" ? contentElement.textContent! : undefined;
      let mentions: Set<string> | undefined;

      for (const element of contentElement.querySelectorAll(
        "li, td, th, dt, dd"
      ))
        element.innerHTML = [...element.childNodes].some(
          (node) =>
            node.nodeType === node.TEXT_NODE && node.textContent!.trim() !== ""
        )
          ? html`<div><p>$${element.innerHTML}</p></div>`
          : html`<div>$${element.innerHTML}</div>`;

      for (const element of contentElement.querySelectorAll("img"))
        element.setAttribute("loading", "lazy");

      for (const element of contentElement.querySelectorAll("details")) {
        const summaries: Node[] = [];
        const rest: Node[] = [];
        for (const child of element.childNodes)
          (child.nodeType === child.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "summary"
            ? summaries
            : rest
          ).push(child);
        switch (summaries.length) {
          case 0:
            summaries.push(
              JSDOM.fragment(html`<summary>See More</summary>`)
                .firstElementChild!
            );
            break;
          case 1:
            break;
          default:
            continue;
        }
        const wrapper = JSDOM.fragment(html`<div></div>`).firstElementChild!;
        wrapper.replaceChildren(...rest);
        element.replaceChildren(summaries[0], wrapper);
      }

      const namespace = Math.random().toString(36).slice(2);
      for (const element of contentElement.querySelectorAll("[id]"))
        element.id += `--${namespace}`;
      for (const element of contentElement.querySelectorAll("[href]")) {
        let href = element.getAttribute("href")!;
        if (href.startsWith("#")) {
          href = `#user-content-${href.slice(1)}--${namespace}`;
          element.setAttribute("href", href);
        } else if (!href.startsWith(baseURL)) {
          element.setAttribute("target", "_blank");
          element.setAttribute(
            "oninteractive",
            javascript`
              tippy(this, {
                touch: false,
                content: ${res.locals.HTMLForJavaScript(
                  html`External link to <code class="code">${href}</code>`
                )},
              });
            `
          );
        }
        if (
          href.startsWith("#user-content-user-content-fnref-") &&
          element.innerHTML === "↩"
        )
          element.innerHTML = html`<i class="bi bi-arrow-return-left"></i>`;
      }

      if (decorate) {
        if (res.locals.course !== undefined) {
          const narrowReq = req as express.Request<
            {},
            any,
            {},
            {},
            IsEnrolledInCourseMiddlewareLocals
          >;
          const narrowRes = res as express.Response<
            any,
            IsEnrolledInCourseMiddlewareLocals
          >;

          for (const element of contentElement.querySelectorAll("a")) {
            const href = element.getAttribute("href");
            if (href !== element.textContent!.trim()) continue;
            const match = href.match(
              new RegExp(
                `^${escapeStringRegexp(
                  baseURL
                )}/courses/(\\d+)/conversations/(\\d+)(?:#message--(\\d+))?$`
              )
            );
            if (match === null) continue;
            const [courseReference, conversationReference, messageReference] =
              match.slice(1);
            if (courseReference !== res.locals.course.reference) continue;
            const conversation = getConversation({
              req: narrowReq,
              res: narrowRes,
              conversationReference,
            });
            if (conversation === undefined) continue;
            if (messageReference === undefined) {
              element.textContent = `#${conversation.reference}`;
              continue;
            }
            const message = getMessage({
              req: narrowReq,
              res: narrowRes,
              conversation,
              messageReference,
            });
            if (message === undefined) continue;
            element.textContent = `#${conversation.reference}/${message.reference}`;
          }

          mentions = new Set();
          (function processTree(node: Node): void {
            processNode();
            if (node.hasChildNodes())
              for (const childNode of node.childNodes) processTree(childNode);
            function processNode() {
              switch (node.nodeType) {
                case node.TEXT_NODE:
                  const parentElement = node.parentElement;
                  if (
                    parentElement === null ||
                    parentElement.closest("a, code, .mention, .reference") !==
                      null
                  )
                    return;
                  let newNodeHTML = html`${node.textContent}`;

                  newNodeHTML = newNodeHTML.replace(
                    /(?<!\w)@(everyone|staff|students|anonymous|[0-9a-z-]+)(?!\w)/gi,
                    (match, mention) => {
                      mention = mention.toLowerCase();
                      let mentionHTML: HTML;
                      switch (mention) {
                        case "everyone":
                        case "staff":
                        case "students":
                          mentions!.add(mention);
                          mentionHTML = html`<strong
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Mention",
                              });
                            `}"
                            >${lodash.capitalize(mention)} in the
                            Conversation</strong
                          >`;
                          break;
                        case "anonymous":
                          mentionHTML = userPartial({ req, res });
                          break;
                        default:
                          const enrollmentReference = mention.split("--")[0];
                          const enrollmentRow = database.get<{
                            id: number;
                            userId: number;
                            userLastSeenOnlineAt: string;
                            userEmail: string;
                            userName: string;
                            userAvatar: string | null;
                            userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor;
                            userBiographySource: string | null;
                            userBiographyPreprocessed: HTML | null;
                            reference: string;
                            role: EnrollmentRole;
                          }>(
                            sql`
                              SELECT "enrollments"."id",
                                      "users"."id" AS "userId",
                                      "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                                      "users"."email" AS "userEmail",
                                      "users"."name" AS "userName",
                                      "users"."avatar" AS "userAvatar",
                                      "users"."avatarlessBackgroundColor" AS  "userAvatarlessBackgroundColor",
                                      "users"."biographySource" AS "userBiographySource",
                                      "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                                      "enrollments"."reference",
                                      "enrollments"."role"
                              FROM "enrollments"
                              JOIN "users" ON "enrollments"."user" = "users"."id"
                              WHERE "enrollments"."course" = ${
                                res.locals.course!.id
                              } AND
                                    "enrollments"."reference" = ${enrollmentReference}
                            `
                          );
                          if (enrollmentRow === undefined) return match;
                          const enrollment = {
                            id: enrollmentRow.id,
                            user: {
                              id: enrollmentRow.userId,
                              lastSeenOnlineAt:
                                enrollmentRow.userLastSeenOnlineAt,
                              email: enrollmentRow.userEmail,
                              name: enrollmentRow.userName,
                              avatar: enrollmentRow.userAvatar,
                              avatarlessBackgroundColor:
                                enrollmentRow.userAvatarlessBackgroundColor,
                              biographySource:
                                enrollmentRow.userBiographySource,
                              biographyPreprocessed:
                                enrollmentRow.userBiographyPreprocessed,
                            },
                            reference: enrollmentRow.reference,
                            role: enrollmentRow.role,
                          };
                          mentions!.add(enrollment.reference);
                          mentionHTML = userPartial({
                            req,
                            res,
                            enrollment,
                          });
                          if (enrollment.user.id === res.locals.user!.id)
                            mentionHTML = html`<mark
                              class="mark ${res.locals.localCSS(css`
                                border-top-left-radius: var(
                                  --border-radius--3xl
                                );
                                border-bottom-left-radius: var(
                                  --border-radius--3xl
                                );
                              `)}"
                              >$${mentionHTML}</mark
                            >`;
                          break;
                      }
                      return html`<span class="mention">$${mentionHTML}</span>`;
                    }
                  );

                  newNodeHTML = newNodeHTML.replace(
                    /(?<!\w)#(\d+)(?:\/(\d+))?(?!\w)/g,
                    (match, conversationReference, messageReference) => {
                      const conversation = getConversation({
                        req: narrowReq,
                        res: narrowRes,
                        conversationReference,
                      });
                      if (conversation === undefined) return match;
                      if (messageReference === undefined)
                        return html`<a
                          class="reference"
                          href="${baseURL}/courses/${res.locals.course!
                            .reference}/conversations/${conversation.reference}"
                          >${match}</a
                        >`;
                      const message = getMessage({
                        req: narrowReq,
                        res: narrowRes,
                        conversation,
                        messageReference,
                      });
                      if (message === undefined) return match;
                      return html`<a
                        class="reference"
                        href="${baseURL}/courses/${res.locals.course!
                          .reference}/conversations/${conversation.reference}#message--${message.reference}"
                        >${match}</a
                      >`;
                    }
                  );

                  parentElement.replaceChild(JSDOM.fragment(newNodeHTML), node);
                  break;
              }
            }
          })(contentElement);

          for (const element of contentElement.querySelectorAll("a")) {
            const href = element.getAttribute("href");
            if (href === null) continue;
            const hrefMatch = href.match(
              new RegExp(
                `^${escapeStringRegexp(
                  baseURL
                )}/courses/(\\d+)/conversations/(\\d+)(?:#message--(\\d+))?$`
              )
            );
            if (hrefMatch === null) continue;
            const [
              hrefCourseReference,
              hrefConversationReference,
              hrefMessageReference,
            ] = hrefMatch.slice(1);
            if (hrefCourseReference !== res.locals.course.reference) continue;
            const textContentMatch = element
              .textContent!.trim()
              .match(/^#(\d+)(?:\/(\d+))?$/);
            if (textContentMatch === null) continue;
            const [
              textContentConversationReference,
              textContentMessageReference,
            ] = textContentMatch.slice(1);
            if (
              hrefConversationReference !== textContentConversationReference ||
              hrefMessageReference !== textContentMessageReference
            )
              continue;
            const conversation = getConversation({
              req: narrowReq,
              res: narrowRes,
              conversationReference: hrefConversationReference,
            });
            if (conversation === undefined) continue;
            if (hrefMessageReference === undefined) {
              element.setAttribute(
                "oninteractive",
                javascript`
                  tippy(this, {
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <div
                          class="${res.locals.localCSS(css`
                            padding: var(--space--2);
                          `)}"
                        >
                          $${conversationPartial({
                            req: narrowReq,
                            res: narrowRes,
                            conversation,
                          })}
                        </div>
                      `
                    )},
                  });
                `
              );
              continue;
            }
            const message = getMessage({
              req: narrowReq,
              res: narrowRes,
              conversation,
              messageReference: hrefMessageReference,
            });
            if (message === undefined) continue;
            element.setAttribute(
              "oninteractive",
              javascript`
                tippy(this, {
                  touch: false,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          padding: var(--space--2);
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        $${conversationPartial({
                          req: narrowReq,
                          res: narrowRes,
                          conversation,
                          message,
                        })}
                      </div>
                    `
                  )},
                });
              `
            );
          }
        }

        if (search !== undefined)
          (function processTree(node: Node): void {
            processNode();
            if (node.hasChildNodes())
              for (const childNode of node.childNodes) processTree(childNode);
            function processNode() {
              switch (node.nodeType) {
                case node.TEXT_NODE:
                  const parentElement = node.parentElement;
                  if (parentElement === null) return;
                  parentElement.replaceChild(
                    JSDOM.fragment(
                      highlightSearchResult(html`${node.textContent}`, search)
                    ),
                    node
                  );
                  break;
              }
            }
          })(contentElement);
      }

      return {
        preprocessed: contentPreprocessed,
        search: contentSearch,
        processed: contentElement.outerHTML,
        mentions,
      };
    };
  })();

  const previewRequestHandler: express.RequestHandler<
    {},
    any,
    { content?: string },
    {},
    BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  > = (req, res, next) => {
    if (typeof req.body.content !== "string" || req.body.content.trim() === "")
      return next("validation");
    res.send(
      partialLayout({
        req,
        res,
        body: processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        }).processed,
      })
    );
  };

  app.post<{}, any, { content?: string }, {}, IsSignedInMiddlewareLocals>(
    "/content-editor/preview",
    ...isSignedInMiddleware,
    previewRequestHandler
  );

  app.post<{}, any, { content?: string }, {}, IsSignedOutMiddlewareLocals>(
    "/content-editor/preview",
    ...isSignedOutMiddleware,
    previewRequestHandler
  );

  app.post<
    { courseReference: string },
    any,
    { content?: string },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/preview",
    ...isEnrolledInCourseMiddleware,
    previewRequestHandler
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/new",
    ...isEnrolledInCourseMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      res.send(
        (res.locals.conversationsCount === 0 ? mainLayout : conversationLayout)(
          {
            req,
            res,
            head: html`
              <title>
                Start
                ${res.locals.conversationsCount === 0 ? "the First" : "a New"}
                Conversation · ${res.locals.course.name} · CourseLore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-chat-left-text"></i>
                Start
                ${res.locals.conversationsCount === 0 ? "the First" : "a New"}
                Conversation
              </h2>

              <form
                method="POST"
                action="${baseURL}/courses/${res.locals.course
                  .reference}/conversations"
                novalidate
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
              >
                <input type="hidden" name="_csrf" value="${req.csrfToken()}" />

                <div class="label">
                  <p class="label--text">Type</p>
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      flex-wrap: wrap;
                      column-gap: var(--space--8);
                      row-gap: var(--space--2);
                    `)}"
                  >
                    $${res.locals.conversationTypes.map(
                      (conversationType) => html`
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="radio"
                            name="type"
                            value="${conversationType}"
                            required
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            onchange="${javascript`
                              const form = this.closest("form");
                              for (const element of [...form.querySelectorAll('[name="tagsReferences[]"]'), form.querySelector('[name="content"]')])
                                element.required = ${JSON.stringify(
                                  conversationType !== "chat"
                                )};
                            `}"
                          />
                          <span>
                            $${conversationTypeIcon[conversationType].regular}
                            $${lodash.capitalize(conversationType)}
                          </span>
                          <span
                            class="${conversationTypeTextColor[conversationType]
                              .select}"
                          >
                            $${conversationTypeIcon[conversationType].fill}
                            $${lodash.capitalize(conversationType)}
                          </span>
                        </label>
                      `
                    )}
                  </div>
                </div>

                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--4);
                  `)}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div
                          class="label ${res.locals.localCSS(css`
                            width: var(--space--24);
                          `)}"
                        >
                          <div class="label--text">
                            Pin
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent"
                              oninteractive="${javascript`
                                tippy(this, {
                                  trigger: "click",
                                  content: "Pinned conversations are listed first.",
                                });
                              `}"
                            >
                              <i class="bi bi-info-circle"></i>
                            </button>
                          </div>
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isPinned"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Pin",
                                  });
                                `}"
                              >
                                <i class="bi bi-pin-angle"></i>
                                Unpinned
                              </span>
                              <span
                                class="text--amber"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Unpin",
                                  });
                                `}"
                              >
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </span>
                            </label>
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="label ${res.locals.localCSS(css`
                      width: var(--space--40);
                    `)}"
                  >
                    <p class="label--text">Visibility</p>
                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                      `)}"
                    >
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          type="checkbox"
                          name="isStaffOnly"
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          onchange="${javascript`
                            const anonymity = this.closest("form").querySelector(".anonymity");
                            if (anonymity === null) return;
                            anonymity.hidden = this.checked;
                            for (const element of anonymity.querySelectorAll("*"))
                              if (element.disabled !== null) element.disabled = this.checked;
                          `}"
                        />
                        <span
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Set as Visible by Staff Only",
                            });
                          `}"
                        >
                          <i class="bi bi-eye"></i>
                          Visible by Everyone
                        </span>
                        <span
                          class="text--pink"
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Set as Visible by Everyone",
                            });
                          `}"
                        >
                          <i class="bi bi-mortarboard-fill"></i>
                          Visible by Staff Only
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="label">
                  <p class="label--text">Title</p>
                  <input
                    type="text"
                    name="title"
                    required
                    autocomplete="off"
                    autofocus
                    class="input--text"
                  />
                </div>

                $${contentEditor({ req, res })}
                $${res.locals.tags.length === 0 &&
                res.locals.enrollment.role !== "staff"
                  ? html``
                  : html`
                      <div class="label">
                        <div class="label--text">
                          Tags
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                trigger: "click",
                                content: "Tags help to organize conversations.",
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                          $${res.locals.tags.length > 0 &&
                          res.locals.enrollment.role === "staff"
                            ? html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    flex: 1;
                                    display: flex;
                                    justify-content: flex-end;
                                  `)}"
                                >
                                  <a
                                    href="${baseURL}/courses/${res.locals.course
                                      .reference}/settings/tags"
                                    target="_blank"
                                    class="button button--tight button--tight--inline button--transparent secondary"
                                  >
                                    <i class="bi bi-sliders"></i>
                                    Manage Tags
                                  </a>
                                </div>
                              `
                            : html``}
                        </div>
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                            flex-wrap: wrap;
                            column-gap: var(--space--8);
                            row-gap: var(--space--2);
                          `)}"
                        >
                          $${res.locals.tags.length === 0 &&
                          res.locals.enrollment.role === "staff"
                            ? html`
                                <a
                                  href="${baseURL}/courses/${res.locals.course
                                    .reference}/settings/tags"
                                  target="_blank"
                                  class="button button--tight button--tight--inline button--inline button--transparent secondary"
                                >
                                  <i class="bi bi-sliders"></i>
                                  Create the First Tag
                                </a>
                              `
                            : res.locals.tags.map(
                                (tag) => html`
                                  <div
                                    class="${res.locals.localCSS(css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <label
                                      class="button button--tight button--tight--inline button--transparent"
                                    >
                                      <input
                                        type="checkbox"
                                        name="tagsReferences[]"
                                        value="${tag.reference}"
                                        required
                                        class="visually-hidden input--radio-or-checkbox--multilabel"
                                      />
                                      <span>
                                        <i class="bi bi-tag"></i>
                                        ${tag.name}
                                      </span>
                                      <span class="text--teal">
                                        <i class="bi bi-tag-fill"></i>
                                        ${tag.name}
                                      </span>
                                    </label>
                                    $${tag.staffOnlyAt !== null
                                      ? html`
                                          <span
                                            class="text--pink"
                                            oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "This tag is visible by staff only.",
                                          });
                                        `}"
                                          >
                                            <i
                                              class="bi bi-mortarboard-fill"
                                            ></i>
                                          </span>
                                        `
                                      : html``}
                                  </div>
                                `
                              )}
                        </div>
                      </div>
                    `}
                $${res.locals.enrollment.role === "staff"
                  ? html``
                  : html`
                      <div class="anonymity label">
                        <p class="label--text">Anonymity</p>
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                          `)}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isAnonymous"
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span
                              oninteractive="${javascript`
                                tippy(this, {
                                  touch: false,
                                  content: "Set as Anonymous to Other Students",
                                });
                              `}"
                            >
                              <span>
                                $${userPartial({
                                  req,
                                  res,
                                  user: res.locals.user,
                                  decorate: false,
                                  name: false,
                                })}
                                <span
                                  class="${res.locals.localCSS(css`
                                    margin-left: var(--space--1);
                                  `)}"
                                >
                                  Signed by You
                                </span>
                              </span>
                            </span>
                            <span
                              oninteractive="${javascript`
                                tippy(this, {
                                  touch: false,
                                  content: "Set as Signed by You",
                                });
                              `}"
                            >
                              <span>
                                $${userPartial({
                                  req,
                                  res,
                                  name: false,
                                })}
                                <span
                                  class="${res.locals.localCSS(css`
                                    margin-left: var(--space--1);
                                  `)}"
                                >
                                  Anonymous to Other Students
                                </span>
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>
                    `}

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                    oninteractive="${javascript`
                      Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                      tippy(this, {
                        touch: false,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <span class="keyboard-shortcut">
                              <span
                                oninteractive="${javascript`
                                  this.hidden = leafac.isAppleDevice;
                                `}"
                                >Ctrl+Enter</span
                              ><span
                                class="keyboard-shortcut--cluster"
                                oninteractive="${javascript`
                                  this.hidden = !leafac.isAppleDevice;
                                `}"
                                ><i class="bi bi-command"></i
                                ><i class="bi bi-arrow-return-left"></i
                              ></span>
                            </span>
                          `
                        )},
                      });
                    `}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start Conversation
                  </button>
                </div>
              </form>
            `,
          }
        )
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      type?: ConversationType;
      isPinned?: boolean;
      isStaffOnly?: boolean;
      title?: string;
      content?: string;
      tagsReferences?: string[];
      isAnonymous?: boolean;
    },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      req.body.tagsReferences ??= [];
      if (
        typeof req.body.type !== "string" ||
        !res.locals.conversationTypes.includes(req.body.type) ||
        (req.body.isPinned && res.locals.enrollment.role !== "staff") ||
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        (req.body.type !== "chat" &&
          (typeof req.body.content !== "string" ||
            req.body.content.trim() === "")) ||
        (req.body.type === "chat" &&
          req.body.content !== undefined &&
          typeof req.body.content !== "string") ||
        !Array.isArray(req.body.tagsReferences) ||
        (res.locals.tags.length > 0 &&
          ((req.body.type !== "chat" && req.body.tagsReferences.length === 0) ||
            new Set(req.body.tagsReferences).size <
              req.body.tagsReferences.length ||
            req.body.tagsReferences.some(
              (tagReference) =>
                typeof tagReference !== "string" ||
                !res.locals.tags.some(
                  (existingTag) => tagReference === existingTag.reference
                )
            ))) ||
        ((res.locals.enrollment.role === "staff" || req.body.isStaffOnly) &&
          req.body.isAnonymous)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            res.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      const conversationRow = database.get<{
        id: number;
        reference: string;
        type: ConversationType;
        staffOnlyAt: string | null;
        title: string;
      }>(
        sql`
          INSERT INTO "conversations" (
            "createdAt",
            "course",
            "reference",
            "authorEnrollment",
            "anonymousAt",
            "type",
            "pinnedAt",
            "staffOnlyAt",
            "title",
            "titleSearch",
            "nextMessageReference"
          )
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.course.id},
            ${String(res.locals.course.nextConversationReference)},
            ${res.locals.enrollment.id},
            ${req.body.isAnonymous ? new Date().toISOString() : null},
            ${req.body.type},
            ${req.body.isPinned ? new Date().toISOString() : null},
            ${req.body.isStaffOnly ? new Date().toISOString() : null},
            ${req.body.title},
            ${html`${req.body.title}`},
            ${2}
          )
          RETURNING *
        `
      )!;
      for (const tagReference of req.body.tagsReferences)
        database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${
                res.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      if (
        typeof req.body.content === "string" &&
        req.body.content.trim() !== ""
      ) {
        const processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        const message = database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            INSERT INTO "messages" (
              "createdAt",
              "conversation",
              "reference",
              "authorEnrollment",
              "anonymousAt",
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${"1"},
              ${res.locals.enrollment.id},
              ${req.body.isAnonymous ? new Date().toISOString() : null},
              ${req.body.content},
              ${processedContent.preprocessed},
              ${processedContent.search}
            )
            RETURNING *
          `
        )!;
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
        const conversation = getConversation({
          req,
          res,
          conversationReference: conversationRow.reference,
        })!;
        sendNotificationEmails({
          req,
          res,
          conversation,
          message: getMessage({
            req,
            res,
            conversation,
            messageReference: message.reference,
          })!,
          mentions: processedContent.mentions!,
        });
      }

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.course.nextConversationReference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.post<
    { courseReference: string },
    any,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/mark-all-conversations-as-read",
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      const messages = database.all<{ id: number }>(
        sql`
          SELECT "messages"."id"
          FROM "messages"
          JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                  "conversations"."course" = ${res.locals.course.id}
          LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                  "readings"."enrollment" = ${res.locals.enrollment.id}
          WHERE "readings"."id" IS NULL
          ORDER BY "messages"."id" ASC
        `
      );
      for (const message of messages)
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
      res.redirect("back");
    }
  );

  interface IsConversationAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    conversation: NonNullable<ReturnType<typeof getConversation>>;
  }
  const isConversationAccessibleMiddleware: express.RequestHandler<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    IsConversationAccessibleMiddlewareLocals
  >[] = [
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      const conversation = getConversation({
        req,
        res,
        conversationReference: req.params.conversationReference,
      });
      if (conversation === undefined) return next("route");
      res.locals.conversation = conversation;
      next();
    },
  ];

  const mayEditConversation = ({
    req,
    res,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
  }): boolean =>
    res.locals.enrollment.role === "staff" ||
    (res.locals.conversation.authorEnrollment !== "no-longer-enrolled" &&
      res.locals.conversation.authorEnrollment.id === res.locals.enrollment.id);

  interface MayEditConversationMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {}
  const mayEditConversationMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    {},
    {},
    MayEditConversationMiddlewareLocals
  >[] = [
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      if (mayEditConversation({ req, res })) return next();
      next("route");
    },
  ];

  interface MessageExistsMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {
    message: NonNullable<ReturnType<typeof getMessage>>;
  }
  const messageExistsMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsMiddlewareLocals
  >[] = [
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      const message = getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: req.params.messageReference,
      });
      if (message === undefined) return next("route");
      res.locals.message = message;
      next();
    },
  ];

  const mayEditMessage = ({
    req,
    res,
    message,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: MessageExistsMiddlewareLocals["message"];
  }) =>
    res.locals.enrollment.role === "staff" ||
    (message.authorEnrollment !== "no-longer-enrolled" &&
      message.authorEnrollment.id === res.locals.enrollment.id);

  interface MayEditMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  const mayEditMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEditMessageMiddlewareLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (mayEditMessage({ req, res, message: res.locals.message }))
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      search?: string;
    },
    IsConversationAccessibleMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...isConversationAccessibleMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      const messages = database
        .all<{ reference: string }>(
          sql`
            SELECT "messages"."reference"
            FROM "messages"
            WHERE "messages"."conversation" = ${res.locals.conversation.id}
            ORDER BY "messages"."id" ASC
          `
        )
        .map(
          (message) =>
            getMessage({
              req,
              res,
              conversation: res.locals.conversation,
              messageReference: message.reference,
            })!
        );

      for (const message of messages)
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );

      res.send(
        conversationLayout({
          req,
          res,
          head: html`
            <title>
              ${res.locals.conversation.title} · ${res.locals.course.name} ·
              CourseLore
            </title>
          `,
          mainIsAScrollingPane: res.locals.conversation.type === "chat",
          body: html`
            <div
              class="${res.locals.localCSS(css`
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: var(--space--0);
              `)}"
            >
              <div
                class="conversation--header ${res.locals.localCSS(css`
                  padding-bottom: var(--space--2);
                  border-bottom: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                  ${res.locals.conversation.type === "chat"
                    ? css`
                        padding-top: var(--space--4);
                        padding-right: var(--space--4);
                        padding-left: var(--space--4);
                        @media (min-width: 900px) {
                          padding-left: var(--space--8);
                        }
                        display: flex;
                        @media (max-width: 899px) {
                          justify-content: center;
                        }
                      `
                    : css``}
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                          display: flex;
                          & > * {
                            flex: 1;
                          }
                        `
                      : css``}
                  `)}"
                >
                  $${res.locals.conversation.type === "chat"
                    ? html`
                        <button
                          class="conversation--header--compact button button--tight button--tight--inline button--transparent strong ${res
                            .locals.localCSS(css`
                            max-width: calc(100% + var(--space--2));
                            margin-top: var(--space---2);
                          `)}"
                          onclick="${javascript`
                            this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = true;
                            this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = false;
                          `}"
                        >
                          <span
                            class="${res.locals.localCSS(css`
                              flex: 1;
                              text-align: left;
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `)}"
                          >
                            $${highlightSearchResult(
                              html`${res.locals.conversation.title}`,
                              req.query.search
                            )}
                          </span>
                          <i class="bi bi-chevron-bar-expand"></i>
                        </button>
                      `
                    : html``}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                    class="conversation--header--full ${res.locals.localCSS(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--1);
                    `)}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `)}"
                    >
                      <div
                        class="${res.locals.localCSS(css`
                          flex: 1;
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--1);

                          & > * {
                            display: flex;
                            gap: var(--space--1);
                          }
                        `)}"
                      >
                        $${mayEditConversation({ req, res })
                          ? html`
                              <div>
                                <button
                                  class="button button--tight button--tight--inline button--tight-gap button--transparent ${conversationTypeTextColor[
                                    res.locals.conversation.type
                                  ].display}"
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Update Conversation Type",
                                    });
                                    tippy(this, {
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.HTMLForJavaScript(
                                        html`
                                          <div class="dropdown--menu">
                                            $${res.locals.conversationTypes.map(
                                              (conversationType) => html`
                                                <form
                                                  method="POST"
                                                  action="${baseURL}/courses/${res
                                                    .locals.course
                                                    .reference}/conversations/${res
                                                    .locals.conversation
                                                    .reference}?_method=PATCH"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="_csrf"
                                                    value="${req.csrfToken()}"
                                                  />
                                                  <input
                                                    type="hidden"
                                                    name="type"
                                                    value="${conversationType}"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button ${conversationType ===
                                                    res.locals.conversation.type
                                                      ? "button--blue"
                                                      : "button--transparent"} ${conversationTypeTextColor[
                                                      conversationType
                                                    ].display}"
                                                  >
                                                    $${conversationTypeIcon[
                                                      conversationType
                                                    ].fill}
                                                    $${lodash.capitalize(
                                                      conversationType
                                                    )}
                                                  </button>
                                                </form>
                                              `
                                            )}
                                          </div>
                                        `
                                      )},
                                    });
                                  `}"
                                >
                                  $${conversationTypeIcon[
                                    res.locals.conversation.type
                                  ].fill}
                                  $${lodash.capitalize(
                                    res.locals.conversation.type
                                  )}
                                </button>
                              </div>
                            `
                          : html`
                              <div
                                class="${conversationTypeTextColor[
                                  res.locals.conversation.type
                                ].display}"
                              >
                                $${conversationTypeIcon[
                                  res.locals.conversation.type
                                ].fill}
                                $${lodash.capitalize(
                                  res.locals.conversation.type
                                )}
                              </div>
                            `}
                        $${res.locals.enrollment.role === "staff"
                          ? html`
                              <form
                                method="POST"
                                action="${baseURL}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation.reference}?_method=PATCH"
                              >
                                <input
                                  type="hidden"
                                  name="_csrf"
                                  value="${req.csrfToken()}"
                                />
                                $${res.locals.conversation.pinnedAt === null
                                  ? html`
                                      <input
                                        type="hidden"
                                        name="isPinned"
                                        value="true"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "Pin",
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-angle"></i>
                                        Unpinned
                                      </button>
                                    `
                                  : html`
                                      <input
                                        type="hidden"
                                        name="isPinned"
                                        value="false"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--amber"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "Unpin",
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-fill"></i>
                                        Pinned
                                      </button>
                                    `}
                              </form>
                            `
                          : res.locals.conversation.pinnedAt !== null
                          ? html`
                              <div class="text--amber">
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </div>
                            `
                          : html``}
                        $${res.locals.enrollment.role === "staff"
                          ? html`
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                  .locals.conversation.staffOnlyAt === null
                                  ? ""
                                  : "text--pink"}"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as ${
                                      res.locals.conversation.staffOnlyAt ===
                                      null
                                        ? "Visible by Staff Only"
                                        : "Visible by Everyone"
                                    }",
                                  });
                                  tippy(this, {
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <form
                                          method="POST"
                                          action="${baseURL}/courses/${res
                                            .locals.course
                                            .reference}/conversations/${res
                                            .locals.conversation
                                            .reference}?_method=PATCH"
                                          class="${res.locals.localCSS(css`
                                            padding: var(--space--2);
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--4);
                                          `)}"
                                        >
                                          <input
                                            type="hidden"
                                            name="_csrf"
                                            value="${req.csrfToken()}"
                                          />
                                          $${res.locals.conversation
                                            .staffOnlyAt === null
                                            ? html`
                                                <input
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="true"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Staff Only?
                                                </p>
                                                <p>
                                                  <strong
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Students who already
                                                    participated in the
                                                    conversation will continue
                                                    to have access to it.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i
                                                    class="bi bi-mortarboard"
                                                  ></i>
                                                  Set as Visible by Staff Only
                                                </button>
                                              `
                                            : html`
                                                <input
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="false"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Everyone?
                                                </p>
                                                <p>
                                                  <strong
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Ensure that people involved
                                                    in the conversation consent
                                                    to having their messages
                                                    visible by everyone.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i class="bi bi-eye"></i>
                                                  Set as Visible by Everyone
                                                </button>
                                              `}
                                        </form>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                $${res.locals.conversation.staffOnlyAt === null
                                  ? html`
                                      <i class="bi bi-eye"></i>
                                      Visible by Everyone
                                    `
                                  : html`
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Visible by Staff Only
                                    `}
                              </button>
                            `
                          : res.locals.conversation.staffOnlyAt !== null
                          ? html`
                              <div
                                class="text--pink ${res.locals.localCSS(css`
                                  display: flex;
                                  gap: var(--space--1);
                                `)}"
                              >
                                <i class="bi bi-mortarboard-fill"></i>
                                Visible by Staff Only
                              </div>
                            `
                          : html``}
                      </div>

                      <div>
                        <button
                          class="button button--tight button--tight--inline button--transparent secondary"
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Actions",
                            });
                            tippy(this, {
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.HTMLForJavaScript(
                                html`
                                  <h3 class="heading">
                                    <i class="bi bi-chat-left-text"></i>
                                    Conversation
                                    #${res.locals.conversation.reference}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                      oninteractive="${javascript`
                                        this.copied = tippy(this, {
                                          theme: "green",
                                          trigger: "manual",
                                          content: "Copied",
                                        });
                                      `}"
                                      onclick="${javascript`
                                        (async () => {
                                          await navigator.clipboard.writeText("${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}");
                                          this.copied.show();
                                          await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                          this.copied.hide();
                                        })();
                                      `}"
                                    >
                                      <i class="bi bi-link"></i>
                                      Copy Conversation Permanent Link
                                    </button>
                                    $${mayEditConversation({ req, res })
                                      ? html`
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            onclick="${javascript`
                                              this.closest(".conversation--header--full").querySelector(".title--show").hidden = true;
                                              this.closest(".conversation--header--full").querySelector(".title--edit").hidden = false;
                                              tippy.hideAll();
                                            `}"
                                          >
                                            <i class="bi bi-pencil"></i>
                                            Edit Conversation Title
                                          </button>
                                        `
                                      : html``}
                                    $${res.locals.enrollment.role === "staff"
                                      ? html`
                                          <div>
                                            <button
                                              class="dropdown--menu--item button button--transparent"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  theme: "rose",
                                                  trigger: "click",
                                                  interactive: true,
                                                  content: ${res.locals.HTMLForJavaScript(
                                                    html`
                                                      <form
                                                        method="POST"
                                                        action="${baseURL}/courses/${res
                                                          .locals.course
                                                          .reference}/conversations/${res
                                                          .locals.conversation
                                                          .reference}?_method=DELETE"
                                                        class="${res.locals
                                                          .localCSS(css`
                                                          padding: var(
                                                            --space--2
                                                          );
                                                          display: flex;
                                                          flex-direction: column;
                                                          gap: var(--space--4);
                                                        `)}"
                                                      >
                                                        <input
                                                          type="hidden"
                                                          name="_csrf"
                                                          value="${req.csrfToken()}"
                                                        />
                                                        <p>
                                                          Are you sure you want
                                                          to remove this
                                                          conversation?
                                                        </p>
                                                        <p>
                                                          <strong
                                                            class="${res.locals
                                                              .localCSS(css`
                                                              font-weight: var(
                                                                --font-weight--bold
                                                              );
                                                            `)}"
                                                          >
                                                            You may not undo
                                                            this action!
                                                          </strong>
                                                        </p>
                                                        <button
                                                          class="button button--rose"
                                                        >
                                                          <i
                                                            class="bi bi-trash"
                                                          ></i>
                                                          Remove Conversation
                                                        </button>
                                                      </form>
                                                    `
                                                  )},
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-trash"></i>
                                              Remove Conversation
                                            </button>
                                          </div>
                                        `
                                      : html``}
                                  </div>
                                `
                              )},
                            });
                          `}"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>

                    <h2
                      class="title--show strong ${res.locals.localCSS(css`
                        font-size: var(--font-size--lg);
                        line-height: var(--line-height--lg);
                      `)}"
                    >
                      $${highlightSearchResult(
                        html`${res.locals.conversation.title}`,
                        req.query.search
                      )}
                    </h2>

                    $${mayEditConversation({ req, res })
                      ? html`
                          <form
                            method="POST"
                            action="${baseURL}/courses/${res.locals.course
                              .reference}/conversations/${res.locals
                              .conversation.reference}?_method=PATCH"
                            novalidate
                            hidden
                            class="title--edit ${res.locals.localCSS(css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: center;
                            `)}"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <input
                              type="text"
                              name="title"
                              value="${res.locals.conversation.title}"
                              required
                              autocomplete="off"
                              class="input--text"
                            />
                            <button
                              class="button button--tight button--tight--inline button--transparent text--green ${res
                                .locals.localCSS(css`
                                flex: 1;
                              `)}"
                              oninteractive="${javascript`
                                tippy(this, {
                                  theme: "green",
                                  touch: false,
                                  content: "Update Title",
                                });
                              `}"
                            >
                              <i class="bi bi-check-lg"></i>
                            </button>
                            <button
                              type="reset"
                              class="button button--tight button--tight--inline button--transparent text--rose"
                              oninteractive="${javascript`
                                tippy(this, {
                                  theme: "rose",
                                  touch: false,
                                  content: "Cancel",
                                });
                              `}"
                              onclick="${javascript`
                                this.closest(".conversation--header--full").querySelector(".title--show").hidden = false;
                                this.closest(".conversation--header--full").querySelector(".title--edit").hidden = true;
                              `}"
                            >
                              <i class="bi bi-x-lg"></i>
                            </button>
                          </form>
                        `
                      : html``}
                    $${res.locals.tags.length === 0
                      ? html``
                      : html`
                          <div
                            class="${res.locals.localCSS(css`
                              font-size: var(--font-size--xs);
                              line-height: var(--line-height--xs);
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--8);
                              row-gap: var(--space--1);

                              & > * {
                                display: flex;
                                gap: var(--space--1);
                              }
                            `)}"
                          >
                            $${mayEditConversation({ req, res })
                              ? html`
                                  $${res.locals.conversation.taggings.length ===
                                  1
                                    ? html`
                                        <div>
                                          <button
                                            class="button button--tight button--tight--inline button--tight-gap text--teal disabled ${res
                                              .locals.localCSS(css`
                                              text-align: left;
                                            `)}"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                theme: "rose",
                                                touch: false,
                                                content: "You may not remove this tag because a conversation must have at least one tag.",
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-tag-fill"></i>
                                            ${res.locals.conversation
                                              .taggings[0].tag.name}
                                          </button>
                                          $${res.locals.conversation.taggings[0]
                                            .tag.staffOnlyAt !== null
                                            ? html`
                                                <span
                                                  class="text--pink"
                                                  oninteractive="${javascript`
                                                    tippy(this, {
                                                      content: "This tag is visible by staff only.",
                                                    });
                                                  `}"
                                                >
                                                  <i
                                                    class="bi bi-mortarboard-fill"
                                                  ></i>
                                                </span>
                                              `
                                            : html``}
                                        </div>
                                      `
                                    : html`
                                        $${res.locals.conversation.taggings.map(
                                          (tagging) => html`
                                            <form
                                              method="POST"
                                              action="${baseURL}/courses/${res
                                                .locals.course
                                                .reference}/conversations/${res
                                                .locals.conversation
                                                .reference}/taggings?_method=DELETE"
                                              class="${res.locals.localCSS(css`
                                                display: flex;
                                                gap: var(--space--2);
                                              `)}"
                                            >
                                              <input
                                                type="hidden"
                                                name="_csrf"
                                                value="${req.csrfToken()}"
                                              />
                                              <input
                                                type="hidden"
                                                name="reference"
                                                value="${tagging.tag.reference}"
                                              />
                                              <button
                                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal ${res
                                                  .locals.localCSS(css`
                                                  text-align: left;
                                                `)}"
                                                oninteractive="${javascript`
                                                  tippy(this, {
                                                    theme: "rose",
                                                    touch: false,
                                                    content: "Remove Tag",
                                                  });
                                                `}"
                                              >
                                                <i class="bi bi-tag-fill"></i>
                                                ${tagging.tag.name}
                                              </button>
                                              $${tagging.tag.staffOnlyAt !==
                                              null
                                                ? html`
                                                    <span
                                                      class="text--pink"
                                                      oninteractive="${javascript`
                                                        tippy(this, {
                                                          content: "This tag is visible by staff only.",
                                                        });
                                                      `}"
                                                    >
                                                      <i
                                                        class="bi bi-mortarboard-fill"
                                                      ></i>
                                                    </span>
                                                  `
                                                : html``}
                                            </form>
                                          `
                                        )}
                                      `}
                                  $${res.locals.tags.length >
                                  res.locals.conversation.taggings.length
                                    ? html`
                                        <div>
                                          <button
                                            class="button button--tight button--tight--inline button--transparent text--teal"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                touch: false,
                                                content: "Add Tag",
                                              });
                                              tippy(this, {
                                                trigger: "click",
                                                interactive: true,
                                                content: ${res.locals.HTMLForJavaScript(
                                                  html`
                                                    <div
                                                      class="dropdown--menu ${res
                                                        .locals.localCSS(css`
                                                        max-height: var(
                                                          --space--40
                                                        );
                                                        overflow: auto;
                                                      `)}"
                                                    >
                                                      $${res.locals.tags
                                                        .filter(
                                                          (tag) =>
                                                            !res.locals.conversation.taggings.some(
                                                              (tagging) =>
                                                                tagging.tag
                                                                  .id === tag.id
                                                            )
                                                        )
                                                        .map(
                                                          (tag) => html`
                                                            <form
                                                              method="POST"
                                                              action="${baseURL}/courses/${res
                                                                .locals.course
                                                                .reference}/conversations/${res
                                                                .locals
                                                                .conversation
                                                                .reference}/taggings"
                                                            >
                                                              <input
                                                                type="hidden"
                                                                name="_csrf"
                                                                value="${req.csrfToken()}"
                                                              />
                                                              <input
                                                                type="hidden"
                                                                name="reference"
                                                                value="${tag.reference}"
                                                              />
                                                              <button
                                                                class="dropdown--menu--item button button--transparent text--teal"
                                                              >
                                                                <i
                                                                  class="bi bi-tag-fill"
                                                                ></i>
                                                                ${tag.name}
                                                                $${tag.staffOnlyAt !==
                                                                null
                                                                  ? html`
                                                                      <span
                                                                        class="text--pink"
                                                                        oninteractive="${javascript`
                                                                          tippy(this, {
                                                                            touch: false,
                                                                            content: "This tag is visible by staff only.",
                                                                          });
                                                                        `}"
                                                                      >
                                                                        <i
                                                                          class="bi bi-mortarboard-fill"
                                                                        ></i>
                                                                      </span>
                                                                    `
                                                                  : html``}
                                                              </button>
                                                            </form>
                                                          `
                                                        )}
                                                      $${res.locals.enrollment
                                                        .role === "staff"
                                                        ? html`
                                                            <a
                                                              href="${baseURL}/courses/${res
                                                                .locals.course
                                                                .reference}/settings/tags"
                                                              target="_blank"
                                                              class="dropdown--menu--item button button--transparent"
                                                            >
                                                              <i
                                                                class="bi bi-sliders"
                                                              ></i>
                                                              Manage Tags
                                                            </a>
                                                          `
                                                        : html``}
                                                    </div>
                                                  `
                                                )},
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-tags-fill"></i>
                                            Tags
                                          </button>
                                        </div>
                                      `
                                    : html``}
                                `
                              : res.locals.conversation.taggings.map(
                                  (tagging) => html`
                                    <div class="text--teal">
                                      <i class="bi bi-tag-fill"></i>
                                      ${tagging.tag.name}
                                    </div>
                                  `
                                )}
                          </div>
                        `}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            onclick="${javascript`
                              this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = true;
                              this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = false;
                            `}"
                          >
                            <i class="bi bi-chevron-bar-contract"></i>
                          </button>
                        `
                      : html``}
                  </div>
                </div>
              </div>

              $${(() => {
                const firstUnreadMessage = messages.find(
                  (message) => message.reading === null
                );
                const shouldScrollToFirstUnreadMessage =
                  firstUnreadMessage !== undefined &&
                  firstUnreadMessage !== messages[0];
                const shouldScrollToBottom =
                  !shouldScrollToFirstUnreadMessage &&
                  res.locals.conversation.type === "chat" &&
                  messages.length > 0;
                const shouldScroll =
                  shouldScrollToFirstUnreadMessage || shouldScrollToBottom;

                return html`
                  <div
                    class="${res.locals.localCSS(css`
                      ${shouldScroll
                        ? css`
                            /* TODO: Do something to prevent flash of unstyled content. visibility: hidden; */
                          `
                        : css``}
                      ${res.locals.conversation.type === "chat"
                        ? css`
                            flex: 1;
                            padding-right: var(--space--4);
                            padding-left: var(--space--4);
                            @media (min-width: 900px) {
                              padding-left: var(--space--8);
                            }
                            overflow: auto;
                            display: flex;
                            @media (max-width: 899px) {
                              justify-content: center;
                            }
                          `
                        : css``}
                    `)}"
                    oninteractive="${javascript`
                      ${
                        shouldScroll
                          ? javascript`
                              this.style.visibility = "visible";
                              ${
                                shouldScrollToBottom
                                  ? javascript`
                                      if (window.location.hash === "")
                                        window.setTimeout(() => {
                                          this.scrollTop = this.scrollHeight;
                                          this.shouldScrollToBottomOnRefresh = true;
                                        }, 0);
                                    `
                                  : javascript``
                              }
                            `
                          : javascript``
                      }
                    `}"
                    onscroll="${javascript`
                      this.shouldScrollToBottomOnRefresh = this.scrollTop === this.scrollHeight - this.offsetHeight;
                    `}"
                    onrefresh="${javascript`
                      if (this.shouldScrollToBottomOnRefresh) this.scrollTop = this.scrollHeight;
                    `}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        ${res.locals.conversation.type === "chat"
                          ? css`
                              flex: 1;
                              min-width: var(--width--0);
                              max-width: var(--width--prose);
                            `
                          : css``}
                      `)}"
                    >
                      $${messages.length === 0
                        ? html`
                            <div
                              class="${res.locals.localCSS(css`
                                padding: var(--space--4) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                                align-items: center;
                              `)}"
                            >
                              <div class="decorative-icon">
                                <i class="bi bi-chat-left-text"></i>
                              </div>
                              <p class="secondary">
                                ${res.locals.conversation.type === "chat"
                                  ? "Start the chat by sending the first message!"
                                  : "All messages in this conversation have been deleted."}
                              </p>
                            </div>
                          `
                        : html`
                            <div
                              class="${res.locals.localCSS(css`
                                ${res.locals.conversation.type === "chat"
                                  ? css`
                                      padding: var(--space--4) var(--space--0);
                                    `
                                  : css``}
                              `)}"
                            >
                              $${messages.map(
                                (message) =>
                                  html`
                                    $${message === firstUnreadMessage &&
                                    message !== messages[0]
                                      ? html`
                                          <div
                                            class="${res.locals.localCSS(css`
                                              margin: var(--space--2)
                                                var(--space--0);
                                              display: flex;
                                              gap: var(--space--4);
                                              align-items: center;
                                            `)}"
                                          >
                                            <hr
                                              class="separator ${res.locals
                                                .localCSS(css`
                                                flex: 1;
                                                border-color: var(
                                                  --color--rose--600
                                                );
                                                @media (prefers-color-scheme: dark) {
                                                  border-color: var(
                                                    --color--rose--500
                                                  );
                                                }
                                              `)}"
                                            />
                                            <span class="heading text--rose">
                                              New
                                            </span>
                                            <hr
                                              class="separator ${res.locals
                                                .localCSS(css`
                                                flex: 1;
                                                border-color: var(
                                                  --color--rose--600
                                                );
                                                @media (prefers-color-scheme: dark) {
                                                  border-color: var(
                                                    --color--rose--500
                                                  );
                                                }
                                              `)}"
                                            />
                                          </div>
                                        `
                                      : html``}
                                    $${res.locals.conversation.type === "chat"
                                      ? html`
                                          <div
                                            hidden
                                            class="date-separator ${res.locals
                                              .localCSS(css`
                                              margin: var(--space--2)
                                                var(--space--0);
                                              display: flex;
                                              gap: var(--space--4);
                                              align-items: center;
                                            `)}"
                                          >
                                            <hr
                                              class="separator ${res.locals
                                                .localCSS(css`
                                                flex: 1;
                                              `)}"
                                            />
                                            <time
                                              datetime="${new Date(
                                                message.createdAt
                                              ).toISOString()}"
                                              class="heading secondary"
                                              oninteractive="${javascript`
                                                const element = this;
                                                leafac.relativizeDateElement(element);
                                                (function update() {
                                                  const dateSeparator = element.closest(".date-separator");
                                                  let previousDateSeparator = dateSeparator;
                                                  do previousDateSeparator = previousDateSeparator.previousElementSibling;
                                                  while (previousDateSeparator !== null && !previousDateSeparator.matches(".date-separator"));
                                                  dateSeparator.hidden = previousDateSeparator !== null && dateSeparator.textContent === previousDateSeparator.textContent;
                                                  window.setTimeout(update, 60 * 1000);
                                                })();
                                              `}"
                                            ></time>
                                            <hr
                                              class="separator ${res.locals
                                                .localCSS(css`
                                                flex: 1;
                                              `)}"
                                            />
                                          </div>
                                        `
                                      : html``}

                                    <div
                                      id="message--${message.reference}"
                                      data-content-source="${JSON.stringify(
                                        message.contentSource
                                      )}"
                                      class="message ${res.locals.localCSS(css`
                                        ${res.locals.conversation.type ===
                                        "chat"
                                          ? css``
                                          : css`
                                              border-bottom: var(
                                                  --border-width--4
                                                )
                                                solid
                                                var(--color--gray--medium--200);
                                              @media (prefers-color-scheme: dark) {
                                                border-color: var(
                                                  --color--gray--medium--700
                                                );
                                              }
                                            `}
                                      `)}"
                                      oninteractive="${javascript`
                                        ${
                                          shouldScrollToFirstUnreadMessage &&
                                          message === firstUnreadMessage
                                            ? javascript`
                                                if (window.location.hash === "") window.setTimeout(() => { this.scrollIntoView(); }, 0);
                                              `
                                            : javascript``
                                        }
                                        
                                      `}"
                                    >
                                      <div
                                        class="${res.locals.localCSS(css`
                                          padding: var(--space--2);
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css``
                                            : css`
                                                padding-bottom: var(--space--4);
                                              `}
                                          border-radius: var(--border-radius--lg);
                                          margin: var(--space--0)
                                            var(--space---2);
                                          display: flex;
                                          flex-direction: column;
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css`
                                                gap: var(--space--1);
                                              `
                                            : css`
                                                gap: var(--space--2);
                                              `}

                                          --color--message--highlight-background-on-target: var(
                                            --color--amber--200
                                          );
                                          @media (prefers-color-scheme: dark) {
                                            --color--message--highlight-background-on-target: var(
                                              --color--amber--900
                                            );
                                          }
                                          @keyframes message--highlight-background-on-target {
                                            from {
                                              background-color: var(
                                                --color--message--highlight-background-on-target
                                              );
                                            }
                                            to {
                                              background-color: transparent;
                                            }
                                          }
                                          :target > & {
                                            animation: message--highlight-background-on-target
                                              var(--transition-duration--1000)
                                              var(
                                                --transition-timing-function--in-out
                                              );
                                          }

                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css`
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
                                                &:focus-within {
                                                  background-color: var(
                                                    --color--gray--medium--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    background-color: var(
                                                      --color--gray--medium--800
                                                    );
                                                  }
                                                }
                                              `
                                            : css``}
                                        `)}"
                                      >
                                        $${(() => {
                                          const actions = html`
                                            <div>
                                              <button
                                                class="button button--tight button--tight--inline button--transparent secondary ${res
                                                  .locals.localCSS(css`
                                                  font-size: var(
                                                    --font-size--xs
                                                  );
                                                  line-height: var(
                                                    --line-height--xs
                                                  );
                                                  ${res.locals.conversation
                                                    .type === "chat"
                                                    ? css`
                                                        transition-property: var(
                                                          --transition-property--opacity
                                                        );
                                                        transition-duration: var(
                                                          --transition-duration--150
                                                        );
                                                        transition-timing-function: var(
                                                          --transition-timing-function--in-out
                                                        );
                                                        .message:not(:hover, :focus-within)
                                                          & {
                                                          opacity: var(
                                                            --opacity--0
                                                          );
                                                        }
                                                      `
                                                    : css``}
                                                `)}"
                                                oninteractive="${javascript`
                                                  tippy(this, {
                                                    touch: false,
                                                    content: "Actions",
                                                  });
                                                  tippy(this, {
                                                    trigger: "click",
                                                    interactive: true,
                                                    content: ${res.locals.HTMLForJavaScript(
                                                      html`
                                                        <h3 class="heading">
                                                          <i
                                                            class="bi bi-chat-left-text"
                                                          ></i>
                                                          Message
                                                          #${res.locals
                                                            .conversation
                                                            .reference}/${message.reference}
                                                        </h3>
                                                        <div
                                                          class="dropdown--menu"
                                                        >
                                                          $${res.locals
                                                            .conversation
                                                            .type === "chat" &&
                                                          message.likes
                                                            .length === 0
                                                            ? html`
                                                                <form
                                                                  method="POST"
                                                                  action="${baseURL}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}/likes"
                                                                  onsubmit="${javascript`
                                                                    event.preventDefault();
                                                                    fetch(this.action, {
                                                                      method: this.method,
                                                                      body: new URLSearchParams(new FormData(this)),
                                                                    });
                                                                  `}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                  >
                                                                    <i
                                                                      class="bi bi-hand-thumbs-up"
                                                                    ></i>
                                                                    Like
                                                                  </button>
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment.role ===
                                                            "staff" &&
                                                          res.locals
                                                            .conversation
                                                            .type === "chat"
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  oninteractive="${javascript`
                                                                    const tooltip = ${res
                                                                      .locals
                                                                      .HTMLForJavaScript(html`
                                                                      <div
                                                                        class="loading ${res.locals.localCSS(
                                                                          css`
                                                                            display: flex;
                                                                            gap: var(
                                                                              --space--2
                                                                            );
                                                                            align-items: center;
                                                                          `
                                                                        )}"
                                                                      >
                                                                        $${spinner(
                                                                          {
                                                                            req,
                                                                            res,
                                                                          }
                                                                        )}
                                                                        Loading…
                                                                      </div>
                                                                      <div
                                                                        class="content"
                                                                        hidden
                                                                      ></div>
                                                                    `)};
                                                                    const loading = tooltip.querySelector(".loading");
                                                                    const content = tooltip.querySelector(".content");

                                                                    tippy(this, {
                                                                      trigger: "click",
                                                                      interactive: true,
                                                                      content: tooltip,
                                                                    });

                                                                    this.onmouseover = this.onfocus = async () => {
                                                                      if (!content.hidden) return;
                                                                      leafac.mount(
                                                                        content,
                                                                        await (await fetch("${baseURL}/courses/${
                                                                    res.locals
                                                                      .course
                                                                      .reference
                                                                  }/conversations/${
                                                                    res.locals
                                                                      .conversation
                                                                      .reference
                                                                  }/messages/${
                                                                    message.reference
                                                                  }/views")).text()
                                                                      );
                                                                      loading.hidden = true;
                                                                      content.hidden = false;
                                                                    };
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-eye"
                                                                  ></i>
                                                                  ${message
                                                                    .readings
                                                                    .length}
                                                                  Views
                                                                </button>
                                                              `
                                                            : html``}

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            onclick="${javascript`
                                                              const content = JSON.parse(this.closest("[data-content-source]").dataset.contentSource);
                                                              const newMessage = document.querySelector(".new-message");
                                                              newMessage.querySelector(".content-editor--button--write").click();
                                                              const element = newMessage.querySelector(".content-editor--write--textarea");
                                                              textFieldEdit.wrapSelection(
                                                                element,
                                                                ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                  message.authorEnrollment ===
                                                                  "no-longer-enrolled"
                                                                    ? javascript``
                                                                    : javascript`
                                                                      "@${
                                                                        message.anonymousAt ===
                                                                        null
                                                                          ? `${
                                                                              message
                                                                                .authorEnrollment
                                                                                .reference
                                                                            }--${slugify(
                                                                              message
                                                                                .authorEnrollment
                                                                                .user
                                                                                .name
                                                                            )}`
                                                                          : `anonymous`
                                                                      } · " +
                                                                    `
                                                                } "#" + ${JSON.stringify(
                                                              res.locals
                                                                .conversation
                                                                .reference
                                                            )} + "/" + ${JSON.stringify(
                                                              message.reference
                                                            )} + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                                ""
                                                              );
                                                              element.focus();
                                                              tippy.hideAll();
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-reply"
                                                            ></i>
                                                            Reply
                                                          </button>

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            oninteractive="${javascript`
                                                              this.copied = tippy(this, {
                                                                theme: "green",
                                                                trigger: "manual",
                                                                content: "Copied",
                                                              });
                                                            `}"
                                                            onclick="${javascript`
                                                              (async () => {
                                                                await navigator.clipboard.writeText("${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${message.reference}");
                                                                this.copied.show();
                                                                await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                                                this.copied.hide();
                                                              })();
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-link"
                                                            ></i>
                                                            Copy Message
                                                            Permanent Link
                                                          </button>

                                                          $${message.authorEnrollment !==
                                                            "no-longer-enrolled" &&
                                                          message
                                                            .authorEnrollment
                                                            .id ===
                                                            res.locals
                                                              .enrollment.id &&
                                                          res.locals.enrollment
                                                            .role ===
                                                            "student" &&
                                                          res.locals
                                                            .conversation
                                                            .staffOnlyAt ===
                                                            null
                                                            ? html`
                                                                <form
                                                                  method="POST"
                                                                  action="${baseURL}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}?_method=PATCH"
                                                                  class="dropdown--menu"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  $${message.anonymousAt ===
                                                                  null
                                                                    ? html`
                                                                        <input
                                                                          type="hidden"
                                                                          name="isAnonymous"
                                                                          value="true"
                                                                        />
                                                                        <button
                                                                          class="dropdown--menu--item button button--transparent"
                                                                        >
                                                                          <span
                                                                            class="${res
                                                                              .locals
                                                                              .localCSS(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${userPartial(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Anonymous
                                                                          to
                                                                          Other
                                                                          Students
                                                                        </button>
                                                                      `
                                                                    : html`
                                                                        <input
                                                                          type="hidden"
                                                                          name="isAnonymous"
                                                                          value="false"
                                                                        />
                                                                        <button
                                                                          class="dropdown--menu--item button button--transparent"
                                                                        >
                                                                          <span
                                                                            class="${res
                                                                              .locals
                                                                              .localCSS(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${userPartial(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                user: res
                                                                                  .locals
                                                                                  .user,
                                                                                decorate:
                                                                                  false,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Signed
                                                                          by You
                                                                        </button>
                                                                      `}
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${mayEditMessage({
                                                            req,
                                                            res,
                                                            message,
                                                          })
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  onclick="${javascript`
                                                                    this.closest(".message").querySelector(".message--show").hidden = true;
                                                                    this.closest(".message").querySelector(".message--edit").hidden = false;
                                                                    tippy.hideAll();
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-pencil"
                                                                  ></i>
                                                                  Edit Message
                                                                </button>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment.role ===
                                                          "staff"
                                                            ? html`
                                                                <div>
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                    oninteractive="${javascript`
                                                                      tippy(this, {
                                                                        theme: "rose",
                                                                        trigger: "click",
                                                                        interactive: true,
                                                                        content: ${res.locals.HTMLForJavaScript(
                                                                          html`
                                                                            <form
                                                                              method="POST"
                                                                              action="${baseURL}/courses/${res
                                                                                .locals
                                                                                .course
                                                                                .reference}/conversations/${res
                                                                                .locals
                                                                                .conversation
                                                                                .reference}/messages/${message.reference}?_method=DELETE"
                                                                              class="${res
                                                                                .locals
                                                                                .localCSS(css`
                                                                                padding: var(
                                                                                  --space--2
                                                                                );
                                                                                display: flex;
                                                                                flex-direction: column;
                                                                                gap: var(
                                                                                  --space--4
                                                                                );
                                                                              `)}"
                                                                            >
                                                                              <input
                                                                                type="hidden"
                                                                                name="_csrf"
                                                                                value="${req.csrfToken()}"
                                                                              />
                                                                              <p>
                                                                                Are
                                                                                you
                                                                                sure
                                                                                you
                                                                                want
                                                                                to
                                                                                remove
                                                                                this
                                                                                message?
                                                                              </p>
                                                                              <p>
                                                                                <strong
                                                                                  class="${res
                                                                                    .locals
                                                                                    .localCSS(css`
                                                                                    font-weight: var(
                                                                                      --font-weight--bold
                                                                                    );
                                                                                  `)}"
                                                                                >
                                                                                  You
                                                                                  may
                                                                                  not
                                                                                  undo
                                                                                  this
                                                                                  action!
                                                                                </strong>
                                                                              </p>
                                                                              <button
                                                                                class="button button--rose"
                                                                              >
                                                                                <i
                                                                                  class="bi bi-trash"
                                                                                ></i>
                                                                                Remove
                                                                                Message
                                                                              </button>
                                                                            </form>
                                                                          `
                                                                        )},
                                                                      });
                                                                    `}"
                                                                  >
                                                                    <i
                                                                      class="bi bi-trash"
                                                                    ></i>
                                                                    Remove
                                                                    Message
                                                                  </button>
                                                                </div>
                                                              `
                                                            : html``}
                                                        </div>
                                                      `
                                                    )},
                                                  });
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-three-dots-vertical"
                                                ></i>
                                              </button>
                                            </div>
                                          `;

                                          const headers: HTML[] = [];

                                          if (
                                            mayEditMessage({
                                              req,
                                              res,
                                              message,
                                            }) &&
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question"
                                          )
                                            headers.push(html`
                                              <form
                                                method="POST"
                                                action="${baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}?_method=PATCH"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${message.answerAt === null
                                                  ? html`
                                                      <input
                                                        type="hidden"
                                                        name="isAnswer"
                                                        value="true"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: "Set as Answer",
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-patch-check"
                                                        ></i>
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
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--emerald"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: "Set as Not an Answer",
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-patch-check-fill"
                                                        ></i>
                                                        Answer
                                                      </button>
                                                    `}
                                              </form>
                                            `);
                                          else if (
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question" &&
                                            message.answerAt !== null
                                          )
                                            headers.push(html`
                                              <div class="text--emerald">
                                                <i
                                                  class="bi bi-patch-check-fill"
                                                ></i>
                                                Answer
                                              </div>
                                            `);

                                          if (
                                            mayEndorseMessage({
                                              req,
                                              res,
                                              message,
                                            })
                                          ) {
                                            const isEndorsed =
                                              message.endorsements.some(
                                                (endorsement) =>
                                                  endorsement.enrollment !==
                                                    "no-longer-enrolled" &&
                                                  endorsement.enrollment.id ===
                                                    res.locals.enrollment.id
                                              );

                                            headers.push(html`
                                              <form
                                                method="POST"
                                                action="${baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}/endorsements${isEndorsed
                                                  ? "?_method=DELETE"
                                                  : ""}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${isEndorsed
                                                  ? html`
                                                      <input
                                                        type="hidden"
                                                        name="isEndorsed"
                                                        value="false"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--blue"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: ${JSON.stringify(
                                                              `Remove Endorsement${
                                                                message.endorsements.filter(
                                                                  (
                                                                    endorsement
                                                                  ) =>
                                                                    endorsement.enrollment !==
                                                                      "no-longer-enrolled" &&
                                                                    endorsement
                                                                      .enrollment
                                                                      .id !==
                                                                      res.locals
                                                                        .enrollment
                                                                        .id
                                                                ).length > 0
                                                                  ? ` (Also endorsed by ${
                                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                        Intl as any
                                                                      ).ListFormat(
                                                                        "en"
                                                                      ).format(
                                                                        message.endorsements.flatMap(
                                                                          (
                                                                            endorsement
                                                                          ) =>
                                                                            endorsement.enrollment !==
                                                                              "no-longer-enrolled" &&
                                                                            endorsement
                                                                              .enrollment
                                                                              .id !==
                                                                              res
                                                                                .locals
                                                                                .enrollment
                                                                                .id
                                                                              ? [
                                                                                  endorsement
                                                                                    .enrollment
                                                                                    .user
                                                                                    .name,
                                                                                ]
                                                                              : []
                                                                        )
                                                                      )
                                                                    })`
                                                                  : ``
                                                              }`
                                                            )},
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-award-fill"
                                                        ></i>
                                                        ${message.endorsements
                                                          .length}
                                                        Staff
                                                        Endorsement${message
                                                          .endorsements
                                                          .length === 1
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
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--lime"
                                                        $${message.endorsements.filter(
                                                          (endorsement) =>
                                                            endorsement.enrollment !==
                                                            "no-longer-enrolled"
                                                        ).length === 0
                                                          ? html``
                                                          : html`
                                                              oninteractive="${javascript`
                                                                tippy(this, {
                                                                  touch: false,
                                                                  content: ${JSON.stringify(
                                                                    `Endorse (Already endorsed by ${
                                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                        Intl as any
                                                                      ).ListFormat(
                                                                        "en"
                                                                      ).format(
                                                                        message.endorsements.flatMap(
                                                                          (
                                                                            endorsement
                                                                          ) =>
                                                                            endorsement.enrollment ===
                                                                            "no-longer-enrolled"
                                                                              ? []
                                                                              : [
                                                                                  endorsement
                                                                                    .enrollment
                                                                                    .user
                                                                                    .name,
                                                                                ]
                                                                        )
                                                                      )
                                                                    })`
                                                                  )},
                                                                });
                                                              `}"
                                                            `}
                                                      >
                                                        <i
                                                          class="bi bi-award"
                                                        ></i>
                                                        ${message.endorsements
                                                          .length === 0
                                                          ? `Endorse`
                                                          : `${
                                                              message
                                                                .endorsements
                                                                .length
                                                            }
                                                            Staff Endorsement${
                                                              message
                                                                .endorsements
                                                                .length === 1
                                                                ? ""
                                                                : "s"
                                                            }`}
                                                      </button>
                                                    `}
                                              </form>
                                            `);
                                          } else if (
                                            res.locals.conversation.type ===
                                              "question" &&
                                            (message.authorEnrollment ===
                                              "no-longer-enrolled" ||
                                              message.authorEnrollment.role !==
                                                "staff") &&
                                            message.endorsements.length > 0
                                          )
                                            headers.push(html`
                                              <div
                                                class="text--lime"
                                                oninteractive="${javascript`
                                                  ${
                                                    message.endorsements.filter(
                                                      (endorsement) =>
                                                        endorsement.enrollment !==
                                                        "no-longer-enrolled"
                                                    ).length > 0
                                                      ? javascript`
                                                          tippy(this, {
                                                            content: ${JSON.stringify(
                                                              `Endorsed by ${
                                                                /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                  Intl as any
                                                                ).ListFormat(
                                                                  "en"
                                                                ).format(
                                                                  message.endorsements.flatMap(
                                                                    (
                                                                      endorsement
                                                                    ) =>
                                                                      endorsement.enrollment ===
                                                                      "no-longer-enrolled"
                                                                        ? []
                                                                        : [
                                                                            endorsement
                                                                              .enrollment
                                                                              .user
                                                                              .name,
                                                                          ]
                                                                  )
                                                                )
                                                              }`
                                                            )},
                                                          });
                                                        `
                                                      : javascript``
                                                  }
                                                  
                                                `}"
                                              >
                                                <i class="bi bi-award"></i>
                                                ${message.endorsements.length}
                                                Staff
                                                Endorsement${message
                                                  .endorsements.length === 1
                                                  ? ""
                                                  : "s"}
                                              </div>
                                            `);

                                          return html`
                                            $${headers.length === 0
                                              ? html``
                                              : html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-size: var(
                                                        --font-size--xs
                                                      );
                                                      line-height: var(
                                                        --line-height--xs
                                                      );
                                                      display: flex;
                                                      gap: var(--space--4);
                                                    `)}"
                                                  >
                                                    <div
                                                      class="${res.locals
                                                        .localCSS(css`
                                                        flex: 1;
                                                        display: flex;
                                                        flex-wrap: wrap;
                                                        column-gap: var(
                                                          --space--8
                                                        );
                                                        row-gap: var(
                                                          --space--1
                                                        );
                                                        & > * {
                                                          display: flex;
                                                          gap: var(--space--1);
                                                        }
                                                      `)}"
                                                    >
                                                      $${headers}
                                                    </div>
                                                    $${actions}
                                                  </div>
                                                `}

                                            <div
                                              class="${res.locals.localCSS(css`
                                                display: flex;
                                                gap: var(--space--2);
                                              `)}"
                                            >
                                              <div
                                                class="secondary ${res.locals
                                                  .localCSS(css`
                                                  font-size: var(
                                                    --font-size--xs
                                                  );
                                                  line-height: var(
                                                    --line-height--xs
                                                  );
                                                  flex: 1;
                                                  display: flex;
                                                  flex-wrap: wrap;
                                                  align-items: baseline;
                                                  column-gap: var(--space--4);
                                                  row-gap: var(--space--2);
                                                `)}"
                                              >
                                                <div
                                                  class="strong ${res.locals
                                                    .localCSS(css`
                                                    font-size: var(
                                                      --font-size--sm
                                                    );
                                                    line-height: var(
                                                      --line-height--sm
                                                    );
                                                  `)}"
                                                >
                                                  $${userPartial({
                                                    req,
                                                    res,
                                                    enrollment:
                                                      message.authorEnrollment,
                                                    anonymous:
                                                      message.anonymousAt ===
                                                        null ||
                                                      message.authorEnrollment ===
                                                        "no-longer-enrolled"
                                                        ? false
                                                        : res.locals.enrollment
                                                            .role === "staff" ||
                                                          message
                                                            .authorEnrollment
                                                            .id ===
                                                            res.locals
                                                              .enrollment.id
                                                        ? "reveal"
                                                        : true,
                                                    name:
                                                      message.authorEnrollment ===
                                                      "no-longer-enrolled"
                                                        ? undefined
                                                        : highlightSearchResult(
                                                            html`${message
                                                              .authorEnrollment
                                                              .user.name}`,
                                                            req.query.search
                                                          ),
                                                  })}
                                                </div>

                                                <time
                                                  datetime="${new Date(
                                                    message.createdAt
                                                  ).toISOString()}"
                                                  oninteractive="${javascript`
                                                    leafac.relativizeDateTimeElement(this, { capitalize: true });
                                                  `}"
                                                ></time>

                                                $${message.updatedAt !== null
                                                  ? html`
                                                      <div>
                                                        Updated
                                                        <time
                                                          datetime="${new Date(
                                                            message.updatedAt
                                                          ).toISOString()}"
                                                          oninteractive="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                          `}"
                                                        ></time>
                                                      </div>
                                                    `
                                                  : html``}
                                              </div>

                                              $${headers.length === 0
                                                ? actions
                                                : html``}
                                            </div>
                                          `;
                                        })()}

                                        <div
                                          class="message--show ${res.locals
                                            .localCSS(css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `)}"
                                        >
                                          <div
                                            class="message--show--content-area ${res
                                              .locals.localCSS(css`
                                              position: relative;
                                            `)}"
                                          >
                                            <div
                                              class="message--show--content-area--dropdown-menu-target ${res
                                                .locals.localCSS(css`
                                                width: var(--space--0);
                                                height: var(--line-height--sm);
                                                position: absolute;
                                              `)}"
                                            ></div>
                                            <div
                                              class="message--show--content-area--content"
                                              oninteractive="${javascript`
                                                const dropdownMenuTarget = this.closest(".message--show--content-area").querySelector(".message--show--content-area--dropdown-menu-target");
                                                const dropdownMenu = tippy(dropdownMenuTarget, {
                                                  trigger: "manual",
                                                  interactive: true,
                                                  content: ${res.locals.HTMLForJavaScript(
                                                    html`
                                                      <div
                                                        class="dropdown--menu"
                                                      >
                                                        <button
                                                          class="dropdown--menu--item button button--transparent"
                                                          onclick="${javascript`
                                                            tippy.hideAll();
                                                            const selection = window.getSelection();
                                                            let anchorElement = selection.anchorNode;
                                                            while (
                                                              (
                                                                anchorElement?.dataset?.position === undefined ||
                                                                anchorElement?.parentElement?.dataset?.position !== undefined
                                                              ) &&
                                                              anchorElement !== null
                                                            ) anchorElement = anchorElement.parentElement;
                                                            let focusElement = selection.focusNode;
                                                            while (
                                                              (
                                                                focusElement?.dataset?.position === undefined ||
                                                                focusElement?.parentElement?.dataset?.position !== undefined
                                                              ) &&
                                                              focusElement !== null
                                                            ) focusElement = focusElement.parentElement;
                                                            const contentElement = this.closest(".message--show--content-area").querySelector(".message--show--content-area--content");
                                                            if (
                                                              selection.isCollapsed ||
                                                              anchorElement === null ||
                                                              focusElement === null ||
                                                              !contentElement.contains(anchorElement) ||
                                                              !contentElement.contains(focusElement)
                                                            ) return;
                                                            const anchorPosition = JSON.parse(anchorElement.dataset.position);
                                                            const focusPosition = JSON.parse(focusElement.dataset.position);
                                                            const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                                                            const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                                                            const content = JSON.parse(anchorElement.closest("[data-content-source]").dataset.contentSource);
                                                            const newMessage = document.querySelector(".new-message");
                                                            newMessage.querySelector(".content-editor--button--write").click();
                                                            const element = newMessage.querySelector(".content-editor--write--textarea");
                                                            textFieldEdit.wrapSelection(
                                                              element,
                                                              ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                message.authorEnrollment ===
                                                                "no-longer-enrolled"
                                                                  ? javascript``
                                                                  : javascript`
                                                                    "@${
                                                                      message.anonymousAt ===
                                                                      null
                                                                        ? `${
                                                                            message
                                                                              .authorEnrollment
                                                                              .reference
                                                                          }--${slugify(
                                                                            message
                                                                              .authorEnrollment
                                                                              .user
                                                                              .name
                                                                          )}`
                                                                        : `anonymous`
                                                                    } · " +
                                                                  `
                                                              } "#" + ${JSON.stringify(
                                                            res.locals
                                                              .conversation
                                                              .reference
                                                          )} + "/" + ${JSON.stringify(
                                                            message.reference
                                                          )} + "\\n>\\n> " + content.slice(start, end).replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                              ""
                                                            );
                                                            element.focus();
                                                          `}"
                                                        >
                                                          <i
                                                            class="bi bi-chat-left-quote"
                                                          ></i>
                                                          Quote
                                                        </button>
                                                      </div>
                                                    `
                                                  )},
                                                });
                                                this.addEventListener("mouseup", (event) => {
                                                  window.setTimeout(() => {
                                                    const selection = window.getSelection();
                                                    let anchorElement = selection.anchorNode;
                                                    while (
                                                      (
                                                        anchorElement?.dataset?.position === undefined ||
                                                        anchorElement?.parentElement?.dataset?.position !== undefined
                                                      ) &&
                                                      anchorElement !== null
                                                    ) anchorElement = anchorElement.parentElement;
                                                    let focusElement = selection.focusNode;
                                                    while (
                                                      (
                                                        focusElement?.dataset?.position === undefined ||
                                                        focusElement?.parentElement?.dataset?.position !== undefined
                                                      ) &&
                                                      focusElement !== null
                                                    ) focusElement = focusElement.parentElement;
                                                    if (
                                                      selection.isCollapsed ||
                                                      anchorElement === null ||
                                                      focusElement === null ||
                                                      !this.contains(anchorElement) ||
                                                      !this.contains(focusElement)
                                                    ) return;
                                                    dropdownMenuTarget.style.top = String(event.layerY) + "px";
                                                    dropdownMenuTarget.style.left = String(event.layerX) + "px";
                                                    dropdownMenu.show();
                                                  }, 0);
                                                });
                                              `}"
                                            >
                                              $${processContent({
                                                req,
                                                res,
                                                type: "preprocessed",
                                                content:
                                                  message.contentPreprocessed,
                                                decorate: true,
                                                search: req.query.search,
                                              }).processed}
                                            </div>
                                          </div>

                                          $${(() => {
                                            const content: HTML[] = [];

                                            const isLiked = message.likes.some(
                                              (like) =>
                                                like.enrollment !==
                                                  "no-longer-enrolled" &&
                                                like.enrollment.id ===
                                                  res.locals.enrollment.id
                                            );
                                            const likesCount =
                                              message.likes.length;
                                            if (
                                              res.locals.conversation.type !==
                                                "chat" ||
                                              likesCount > 0
                                            )
                                              content.push(
                                                html`
                                                  <form
                                                    method="POST"
                                                    action="${baseURL}/courses/${res
                                                      .locals.course
                                                      .reference}/conversations/${res
                                                      .locals.conversation
                                                      .reference}/messages/${message.reference}/likes${isLiked
                                                      ? "?_method=DELETE"
                                                      : ""}"
                                                    onsubmit="${javascript`
                                                      event.preventDefault();
                                                      fetch(this.action, {
                                                        method: this.method,
                                                        body: new URLSearchParams(new FormData(this)),
                                                      });
                                                    `}"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="_csrf"
                                                      value="${req.csrfToken()}"
                                                    />
                                                    <button
                                                      class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                                        ? "text--blue"
                                                        : ""}"
                                                      $${likesCount === 0
                                                        ? html``
                                                        : html`
                                                            oninteractive="${javascript`
                                                              tippy(this, {
                                                                touch: false,
                                                                content: ${JSON.stringify(
                                                                  isLiked
                                                                    ? "Remove Like"
                                                                    : "Like"
                                                                )},
                                                              });
                                                            `}"
                                                          `}
                                                    >
                                                      $${isLiked
                                                        ? html`
                                                            <i
                                                              class="bi bi-hand-thumbs-up-fill"
                                                            ></i>
                                                          `
                                                        : html`<i
                                                            class="bi bi-hand-thumbs-up"
                                                          ></i>`}
                                                      $${likesCount === 0
                                                        ? html`Like`
                                                        : html`
                                                            ${likesCount}
                                                            Like${likesCount ===
                                                            1
                                                              ? ""
                                                              : "s"}
                                                          `}
                                                    </button>
                                                  </form>
                                                `
                                              );

                                            if (
                                              res.locals.enrollment.role ===
                                                "staff" &&
                                              res.locals.conversation.type !==
                                                "chat"
                                            )
                                              content.push(html`
                                                <button
                                                  class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                  oninteractive="${javascript`
                                                    const tooltip = ${res.locals
                                                      .HTMLForJavaScript(html`
                                                      <div
                                                        class="loading ${res.locals.localCSS(
                                                          css`
                                                            display: flex;
                                                            gap: var(
                                                              --space--2
                                                            );
                                                            align-items: center;
                                                          `
                                                        )}"
                                                      >
                                                        $${spinner({
                                                          req,
                                                          res,
                                                        })}
                                                        Loading…
                                                      </div>
                                                      <div
                                                        class="content"
                                                        hidden
                                                      ></div>
                                                    `)};
                                                    const loading = tooltip.querySelector(".loading");
                                                    const content = tooltip.querySelector(".content");

                                                    tippy(this, {
                                                      trigger: "click",
                                                      interactive: true,
                                                      content: tooltip,
                                                    });

                                                    this.onmouseover = this.onfocus = async () => {
                                                      if (!content.hidden) return;
                                                      leafac.mount(
                                                        content,
                                                        await (await fetch("${baseURL}/courses/${
                                                    res.locals.course.reference
                                                  }/conversations/${
                                                    res.locals.conversation
                                                      .reference
                                                  }/messages/${
                                                    message.reference
                                                  }/views")).text()
                                                      );
                                                      loading.hidden = true;
                                                      content.hidden = false;
                                                    };
                                                  `}"
                                                >
                                                  <i class="bi bi-eye"></i>
                                                  ${message.readings.length}
                                                  Views
                                                </button>
                                              `);

                                            return content.length === 0
                                              ? html``
                                              : html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-size: var(
                                                        --font-size--xs
                                                      );
                                                      line-height: var(
                                                        --line-height--xs
                                                      );
                                                      display: flex;
                                                      flex-wrap: wrap;
                                                      column-gap: var(
                                                        --space--8
                                                      );
                                                      row-gap: var(--space--1);
                                                    `)}"
                                                  >
                                                    $${content}
                                                  </div>
                                                `;
                                          })()}
                                        </div>

                                        $${mayEditMessage({ req, res, message })
                                          ? html`
                                              <form
                                                method="POST"
                                                action="${baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}?_method=PATCH"
                                                novalidate
                                                hidden
                                                class="message--edit ${res
                                                  .locals.localCSS(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${contentEditor({
                                                  req,
                                                  res,
                                                  contentSource:
                                                    message.contentSource,
                                                  compact:
                                                    res.locals.conversation
                                                      .type === "chat",
                                                })}

                                                <div
                                                  class="${res.locals
                                                    .localCSS(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    @media (max-width: 400px) {
                                                      flex-direction: column;
                                                    }
                                                  `)}"
                                                >
                                                  <button
                                                    class="button button--blue"
                                                    oninteractive="${javascript`
                                                      Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                                                      tippy(this, {
                                                        touch: false,
                                                        content: ${res.locals.HTMLForJavaScript(
                                                          html`
                                                            <span
                                                              class="keyboard-shortcut"
                                                            >
                                                              <span
                                                                oninteractive="${javascript`
                                                                    this.hidden = leafac.isAppleDevice;
                                                                  `}"
                                                                >Ctrl+Enter</span
                                                              ><span
                                                                class="keyboard-shortcut--cluster"
                                                                oninteractive="${javascript`
                                                                    this.hidden = !leafac.isAppleDevice;
                                                                  `}"
                                                                ><i
                                                                  class="bi bi-command"
                                                                ></i
                                                                ><i
                                                                  class="bi bi-arrow-return-left"
                                                                ></i
                                                              ></span>
                                                            </span>
                                                          `
                                                        )},
                                                      });
                                                    `}"
                                                  >
                                                    <i class="bi bi-pencil"></i>
                                                    Update Message
                                                  </button>
                                                  <button
                                                    type="reset"
                                                    class="button button--transparent"
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
                                    </div>
                                  `
                              )}
                            </div>
                          `}
                    </div>
                  </div>
                `;
              })()}

              <form
                method="POST"
                action="${baseURL}/courses/${res.locals.course
                  .reference}/conversations/${res.locals.conversation
                  .reference}/messages"
                novalidate
                class="${res.locals.localCSS(css`
                  ${res.locals.conversation.type === "chat"
                    ? css`
                        padding-right: var(--space--4);
                        padding-bottom: var(--space--4);
                        padding-left: var(--space--4);
                        @media (min-width: 900px) {
                          padding-left: var(--space--8);
                        }
                        display: flex;
                        @media (max-width: 899px) {
                          justify-content: center;
                        }
                      `
                    : css`
                        padding-top: var(--space--4);
                      `}
                `)}"
                $${res.locals.conversation.type === "chat"
                  ? html`
                      onsubmit="${javascript`
                        event.preventDefault();
                        fetch(this.action, {
                          method: this.method,
                          body: new URLSearchParams(new FormData(this)),
                        });
                      `}"
                    `
                  : html``}
              >
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          gap: var(--space--2);
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                        `
                      : css`
                          gap: var(--space--4);
                        `}
                  `)}"
                >
                  <input
                    type="hidden"
                    name="_csrf"
                    value="${req.csrfToken()}"
                  />

                  $${res.locals.conversation.type === "question"
                    ? html`
                        <div class="label">
                          <p class="label--text">Type</p>
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnswer"
                                $${res.locals.enrollment.role === "staff"
                                  ? `checked`
                                  : ``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check"></i>
                                Not an Answer
                              </span>
                              <span
                                class="text--emerald"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Not an Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check-fill"></i>
                                Answer
                              </span>
                            </label>
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="new-message ${res.locals.localCSS(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }

                      ${res.locals.conversation.type === "chat"
                        ? css`
                            textarea {
                              padding-right: var(--space--8);
                            }
                          `
                        : css``}
                    `)}"
                    oninteractive="${javascript`
                      leafac.saveFormInputValue(this.querySelector(".content-editor--write--textarea"), "new-message");
                    `}"
                  >
                    $${contentEditor({
                      req,
                      res,
                      compact: res.locals.conversation.type === "chat",
                    })}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--blue ${res.locals
                              .localCSS(css`
                              position: relative;
                              place-self: end;
                              width: var(--font-size--2xl);
                              height: var(--font-size--2xl);
                              padding: var(--space--0);
                              border-radius: var(--border-radius--circle);
                              margin: var(--space--1);
                              align-items: center;
                            `)}"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: ${res.locals.HTMLForJavaScript(
                                  html`
                                    Send Message
                                    <span class="keyboard-shortcut">
                                      <span
                                        oninteractive="${javascript`
                                          this.hidden = leafac.isAppleDevice;
                                        `}"
                                        >Ctrl+Enter</span
                                      ><span
                                        class="keyboard-shortcut--cluster"
                                        oninteractive="${javascript`
                                          this.hidden = !leafac.isAppleDevice;
                                        `}"
                                        ><i class="bi bi-command"></i
                                        ><i class="bi bi-arrow-return-left"></i
                                      ></span>
                                    </span>
                                  `
                                )},
                              });
                            `}"
                          >
                            <i
                              class="bi bi-send ${res.locals.localCSS(css`
                                position: relative;
                                top: var(--space--px);
                                right: var(--space--px);
                              `)}"
                            ></i>
                          </button>
                        `
                      : html``}
                  </div>

                  $${res.locals.enrollment.role === "staff" ||
                  res.locals.conversation.staffOnlyAt !== null
                    ? html``
                    : html`
                        <div class="label">
                          $${res.locals.conversation.type === "chat"
                            ? html``
                            : html`<p class="label--text">Anonymity</p>`}
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnonymous"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Anonymous to Other Students",
                                  });
                                `}"
                              >
                                <span>
                                  $${userPartial({
                                    req,
                                    res,
                                    user: res.locals.user,
                                    decorate: false,
                                    name: false,
                                  })}
                                  <span
                                    class="${res.locals.localCSS(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Signed by You
                                  </span>
                                </span>
                              </span>
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Signed by You",
                                  });
                                `}"
                              >
                                <span>
                                  $${userPartial({
                                    req,
                                    res,
                                    name: false,
                                  })}
                                  <span
                                    class="${res.locals.localCSS(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Anonymous to Other Students
                                  </span>
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>
                      `}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                  >
                    <button
                      class="button button--full-width-on-small-screen button--blue"
                      oninteractive="${javascript`
                        Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                        tippy(this, {
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <span class="keyboard-shortcut">
                                <span
                                  oninteractive="${javascript`
                                    this.hidden = leafac.isAppleDevice;
                                  `}"
                                  >Ctrl+Enter</span
                                ><span
                                  class="keyboard-shortcut--cluster"
                                  oninteractive="${javascript`
                                    this.hidden = !leafac.isAppleDevice;
                                  `}"
                                  ><i class="bi bi-command"></i
                                  ><i class="bi bi-arrow-return-left"></i
                                ></span>
                              </span>
                            `
                          )},
                        });
                      `}"
                    >
                      <i class="bi bi-send"></i>
                      Send Message
                    </button>
                  </div>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/views",
    ...messageExistsMiddleware,
    (req, res) => {
      res.send(
        partialLayout({
          req,
          res,
          body: html`
            <div
              class="dropdown--menu ${res.locals.localCSS(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${res.locals.message.readings.reverse().map(
                (reading) => html`
                  <button class="dropdown--menu--item">
                    $${userPartial({
                      req,
                      res,
                      enrollment: reading.enrollment,
                      size: "xs",
                    })}
                    <span
                      class="secondary ${res.locals.localCSS(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(reading.createdAt).toISOString()}"
                        oninteractive="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                      ></time>
                    </span>
                  </button>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      type?: ConversationType;
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
      title?: string;
    },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (typeof req.body.type === "string")
        if (!res.locals.conversationTypes.includes(req.body.type))
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "type" = ${req.body.type}
              WHERE "id" = ${res.locals.conversation.id}
            `
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
          database.run(
            sql`
              UPDATE "conversations"
              SET "pinnedAt" = ${
                req.body.isPinned === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isStaffOnly === "string")
        if (
          !["true", "false"].includes(req.body.isStaffOnly) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isStaffOnly === "true" &&
            res.locals.conversation.staffOnlyAt !== null) ||
          (req.body.isStaffOnly === "false" &&
            res.locals.conversation.staffOnlyAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "staffOnlyAt" = ${
                req.body.isStaffOnly === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()},
                  "title" = ${req.body.title},
                  "titleSearch" = ${html`${req.body.title}`}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.delete<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals & IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...isCourseStaffMiddleware,
    ...isConversationAccessibleMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${res.locals.conversation.id}`
      );

      res.redirect(`${baseURL}/courses/${res.locals.course.reference}`);

      emitCourseRefresh(res.locals.course.id);
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
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.reference !== "string" ||
        !res.locals.tags.some((tag) => req.body.reference === tag.reference) ||
        res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "taggings" ("createdAt", "conversation", "tag")
          VALUES (
            ${new Date().toISOString()},
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
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
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
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        res.locals.conversation.taggings.length === 1 ||
        typeof req.body.reference !== "string" ||
        !res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      database.run(
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
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { isAnswer?: boolean; content?: string; isAnonymous?: boolean },
    {},
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      if (
        (req.body.isAnswer && res.locals.conversation.type !== "question") ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        ((res.locals.enrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null) &&
          req.body.isAnonymous)
      )
        return next("validation");

      const mostRecentMessage = getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: String(
          res.locals.conversation.nextMessageReference - 1
        ),
      });
      let processedContent: ReturnType<typeof processContent>;
      let messageReference: string;
      if (
        res.locals.conversation.type === "chat" &&
        mostRecentMessage !== undefined &&
        mostRecentMessage.authorEnrollment !== "no-longer-enrolled" &&
        res.locals.enrollment.id === mostRecentMessage.authorEnrollment.id &&
        mostRecentMessage.anonymousAt === null &&
        !req.body.isAnonymous &&
        new Date().getTime() - new Date(mostRecentMessage.createdAt).getTime() <
          5 * 60 * 1000
      ) {
        const contentSource = `${mostRecentMessage.contentSource}\n\n${req.body.content}`;
        processedContent = processContent({
          req,
          res,
          type: "source",
          content: contentSource,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${contentSource},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search}
            WHERE "id" = ${mostRecentMessage.id}
          `
        );
        database.run(
          sql`
            DELETE FROM "readings"
            WHERE "message" = ${mostRecentMessage.id} AND
                  "enrollment" != ${res.locals.enrollment.id}
          `
        );
        messageReference = mostRecentMessage.reference;
      } else {
        processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()},
                "nextMessageReference" = ${
                  res.locals.conversation.nextMessageReference + 1
                }
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        const message = database.get<{ id: number; reference: string }>(
          sql`
            INSERT INTO "messages" (
              "createdAt",
              "conversation",
              "reference",
              "authorEnrollment",
              "anonymousAt",
              "answerAt",
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${new Date().toISOString()},
              ${res.locals.conversation.id},
              ${String(res.locals.conversation.nextMessageReference)},
              ${res.locals.enrollment.id},
              ${req.body.isAnonymous ? new Date().toISOString() : null},
              ${req.body.isAnswer ? new Date().toISOString() : null},
              ${req.body.content},
              ${processedContent.preprocessed},
              ${processedContent.search}
            )
            RETURNING *
          `
        )!;
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
        messageReference = message.reference;
      }
      sendNotificationEmails({
        req,
        res,
        conversation: res.locals.conversation,
        message: getMessage({
          req,
          res,
          conversation: res.locals.conversation,
          messageReference,
        })!,
        mentions: processedContent.mentions!,
      });

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.conversation.nextMessageReference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.patch<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {
      isAnswer?: "true" | "false";
      isAnonymous?: "true" | "false";
      content?: string;
    },
    {},
    MayEditMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...mayEditMessageMiddleware,
    (req, res, next) => {
      if (typeof req.body.isAnswer === "string")
        if (
          !["true", "false"].includes(req.body.isAnswer) ||
          res.locals.message.reference === "1" ||
          res.locals.conversation.type !== "question" ||
          (req.body.isAnswer === "true" &&
            res.locals.message.answerAt !== null) ||
          (req.body.isAnswer === "false" &&
            res.locals.message.answerAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "messages"
              SET "answerAt" = ${
                req.body.isAnswer === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );

      if (typeof req.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(req.body.isAnonymous) ||
          res.locals.message.authorEnrollment === "no-longer-enrolled" ||
          res.locals.message.authorEnrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null ||
          (req.body.isAnonymous === "true" &&
            res.locals.message.anonymousAt !== null) ||
          (req.body.isAnonymous === "false" &&
            res.locals.message.anonymousAt === null)
        )
          return next("validation");
        else {
          database.run(
            sql`
              UPDATE "messages"
              SET "anonymousAt" = ${
                req.body.isAnonymous === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );
          if (res.locals.message.reference === "1")
            database.run(
              sql`
                UPDATE "conversations"
                SET "anonymousAt" = ${
                  req.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE "id" = ${res.locals.conversation.id}
              `
            );
        }

      if (typeof req.body.content === "string") {
        if (req.body.content.trim() === "") return next("validation");
        const processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${req.body.content},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search},
                "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.message.id}
          `
        );
        database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        sendNotificationEmails({
          req,
          res,
          conversation: res.locals.conversation,
          message: res.locals.message,
          mentions: processedContent.mentions!,
        });
      }

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
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
    IsCourseStaffMiddlewareLocals & MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...isCourseStaffMiddleware,
    ...messageExistsMiddleware,
    (req, res, next) => {
      database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
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
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.likes.some(
          (like) =>
            like.enrollment !== "no-longer-enrolled" &&
            like.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "likes" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
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
    ...messageExistsMiddleware,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) =>
          like.enrollment !== "no-longer-enrolled" &&
          like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `
      );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  const mayEndorseMessage = ({
    req,
    res,
    message,
  }: {
    req: express.Request<
      {
        courseReference: string;
        conversationReference: string;
      },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: MessageExistsMiddlewareLocals["message"];
  }): boolean =>
    res.locals.enrollment.role === "staff" &&
    res.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    (message.authorEnrollment === "no-longer-enrolled" ||
      message.authorEnrollment.role !== "staff");

  interface MayEndorseMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  const mayEndorseMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (mayEndorseMessage({ req, res, message: res.locals.message }))
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
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.enrollment !== "no-longer-enrolled" &&
            endorsement.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
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
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.enrollment !== "no-longer-enrolled" &&
          endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("validation");

      database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      res.redirect(
        `${baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  const emitCourseRefresh = (courseId: number): void => {
    for (const { req, res } of eventDestinations)
      res.write(`event: refresh\ndata:\n\n`);
  };

  const sendNotificationEmails = ({
    req,
    res,
    conversation,
    message,
    mentions,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    message: NonNullable<ReturnType<typeof getMessage>>;
    mentions: Set<string>;
  }): void => {
    database.run(
      sql`
        INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
        VALUES (
          ${new Date().toISOString()},
          ${message.id},
          ${res.locals.enrollment.id}
        )
      `
    );
    if (message.authorEnrollment !== "no-longer-enrolled")
      database.run(
        sql`
          INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${message.authorEnrollment.id}
          )
        `
      );

    database.executeTransaction(() => {
      let enrollments = database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userEmailNotifications: UserEmailNotifications;
        reference: string;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "enrollments"."id",
                 "users"."id" AS "userId",
                 "users"."email" AS "userEmail",
                 "users"."emailNotifications" AS "userEmailNotifications",
                 "enrollments"."reference",
                 "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id" AND
                          "users"."emailConfirmedAt" IS NOT NULL AND
                          "users"."emailNotifications" != 'none'
          LEFT JOIN "notificationDeliveries" ON "enrollments"."id" = "notificationDeliveries"."enrollment" AND
                                                "notificationDeliveries"."message" = ${
                                                  message.id
                                                }
          $${
            conversation.staffOnlyAt !== null
              ? sql`
                  LEFT JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment" AND
                                          "messages"."conversation" = ${conversation.id}
                `
              : sql``
          }
          WHERE "enrollments"."course" = ${res.locals.course.id} AND
                "notificationDeliveries"."id" IS NULL
                $${
                  conversation.staffOnlyAt !== null
                    ? sql`
                      AND (
                        "enrollments"."role" = 'staff' OR
                        "messages"."id" IS NOT NULL
                      )
                    `
                    : sql``
                }
          GROUP BY "enrollments"."id"
        `
      );
      if (
        !(
          (conversation.type === "announcement" && message.reference === "1") ||
          mentions.has("everyone")
        )
      )
        enrollments = enrollments.filter(
          (enrollment) =>
            enrollment.userEmailNotifications === "all-messages" ||
            (enrollment.role === "staff" && mentions.has("staff")) ||
            (enrollment.role === "student" && mentions.has("students")) ||
            mentions.has(enrollment.reference)
        );

      for (const enrollment of enrollments) {
        database.run(
          sql`
            INSERT INTO "sendEmailJobs" (
              "createdAt",
              "startAt",
              "expiresAt",
              "mailOptions"
            )
            VALUES (
              ${new Date().toISOString()},
              ${new Date().toISOString()},
              ${new Date(Date.now() + 20 * 60 * 1000).toISOString()},
              ${JSON.stringify({
                to: enrollment.userEmail,
                subject: `${conversation.title} · ${res.locals.course.name} · CourseLore`,
                html: html`
                  <p>
                    <a
                      href="${baseURL}/courses/${res.locals.course
                        .reference}/conversations/${conversation.reference}#message--${message.reference}"
                      >${message.authorEnrollment === "no-longer-enrolled"
                        ? "Someone who is no longer enrolled"
                        : message.anonymousAt !== null
                        ? `Anonymous ${
                            enrollment.role === "staff"
                              ? `(${message.authorEnrollment.user.name})`
                              : ""
                          }`
                        : message.authorEnrollment.user.name}
                      says</a
                    >:
                  </p>

                  <hr />

                  $${message.contentPreprocessed}

                  <hr />

                  <p>
                    <small>
                      <a href="${baseURL}/settings/notifications-preferences"
                        >Change Notifications Preferences</a
                      >
                    </small>
                  </p>
                `,
              })}
            )
          `
        );
        database.run(
          sql`
            INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${enrollment.id}
            )
          `
        );
      }
    });

    sendEmailWorker();
  };

  if (demonstration)
    app.post<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/demonstration-data",
      asyncHandler(async (req, res) => {
        const password = await argon2.hash("courselore", argon2Options);
        const name = casual.full_name;
        const avatarIndices = lodash.shuffle(lodash.range(250));
        const biographySource = casual.sentences(lodash.random(5, 7));
        const demonstrationUser = database.get<{ id: number; name: string }>(
          sql`
            INSERT INTO "users" (
              "createdAt",
              "lastSeenOnlineAt",
              "email",
              "password",
              "emailConfirmedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "emailNotifications"
            )
            VALUES (
              ${new Date().toISOString()},
              ${new Date(
                Date.now() - lodash.random(0, 5 * 60 * 60 * 1000)
              ).toISOString()},
              ${`${slugify(name)}--${cryptoRandomString({
                length: 5,
                type: "numeric",
              })}@courselore.org`},
              ${password},
              ${new Date().toISOString()},
              ${name},
              ${html`${name}`},
              ${`${baseURL}/node_modules/fake-avatars/avatars/${avatarIndices.shift()}.png`},
              ${lodash.sample(userAvatarlessBackgroundColors)},
              ${biographySource},
              ${
                processContent({
                  req,
                  res,
                  type: "source",
                  content: biographySource,
                }).preprocessed
              },
              ${"none"}
            )
            RETURNING *
          `
        )!;

        const users = lodash.times(150, () => {
          const name = casual.full_name;
          const biographySource = casual.sentences(lodash.random(5, 7));
          return database.get<{
            id: number;
            email: string;
            name: string;
          }>(
            sql`
              INSERT INTO "users" (
                "createdAt",
                "lastSeenOnlineAt",
                "email",
                "password",
                "emailConfirmedAt",
                "name",
                "nameSearch",
                "avatar",
                "avatarlessBackgroundColor",
                "biographySource",
                "biographyPreprocessed",
                "emailNotifications"
              )
              VALUES (
                ${new Date().toISOString()},
                ${new Date(
                  Date.now() -
                    (Math.random() < 0.5
                      ? 0
                      : lodash.random(0, 5 * 60 * 60 * 1000))
                ).toISOString()},
                ${`${slugify(name)}--${cryptoRandomString({
                  length: 5,
                  type: "numeric",
                })}@courselore.org`},
                ${password},
                ${new Date().toISOString()},
                ${name},
                ${html`${name}`},
                ${
                  Math.random() < 0.6
                    ? `${baseURL}/node_modules/fake-avatars/avatars/${avatarIndices.shift()}.png`
                    : null
                },
                ${lodash.sample(userAvatarlessBackgroundColors)},
                ${biographySource},
                ${
                  processContent({
                    req,
                    res,
                    type: "source",
                    content: biographySource,
                  }).preprocessed
                },
                ${"none"}
              )
              RETURNING *
            `
          )!;
        });

        const year = new Date().getFullYear().toString();
        const month = new Date().getMonth() + 1;
        const term = month < 4 || month > 9 ? "Spring" : "Fall";
        const institution = "Johns Hopkins University";
        for (const { name, code, role, accentColor, enrollmentsUsers } of [
          {
            name: "Principles of Programming Languages",
            code: "CS 601.426",
            role: enrollmentRoles[1],
            accentColor: enrollmentAccentColors[0],
            enrollmentsUsers: users.slice(0, 100),
          },
          {
            name: "Pharmacology",
            code: "MD 401.324",
            role: enrollmentRoles[0],
            accentColor: enrollmentAccentColors[1],
            enrollmentsUsers: users.slice(50, 150),
          },
        ].reverse()) {
          const course = database.get<{
            id: number;
            nextConversationReference: number;
          }>(
            sql`
              INSERT INTO "courses" (
                "createdAt",
                "reference",
                "name",
                "year",
                "term",
                "institution",
                "code",      
                "nextConversationReference"
              )
              VALUES (
                ${new Date().toISOString()},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${name},
                ${year},
                ${term},
                ${institution},
                ${code},
                ${lodash.random(30, 50)}
              )
              RETURNING *
            `
          )!;

          const enrollment = database.get<{
            id: number;
            role: EnrollmentRole;
          }>(
            sql`
              INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
              VALUES (
                ${new Date().toISOString()},
                ${demonstrationUser.id},
                ${course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${role},
                ${accentColor}
              )
              RETURNING *
            `
          )!;

          for (const _ of lodash.times(20)) {
            const expiresAt =
              Math.random() < 0.3
                ? new Date(
                    Date.now() +
                      lodash.random(
                        -30 * 24 * 60 * 60 * 1000,
                        30 * 24 * 60 * 60 * 1000
                      )
                  ).toISOString()
                : null;
            const user = Math.random() < 0.5 ? lodash.sample(users)! : null;
            database.run(
              sql`
                INSERT INTO "invitations" (
                  "createdAt",
                  "expiresAt",
                  "usedAt",
                  "course",
                  "reference",
                  "email",
                  "name",
                  "role"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${expiresAt},
                  ${
                    user === null || Math.random() < 0.4
                      ? null
                      : new Date(
                          (expiresAt === null
                            ? Date.now()
                            : Math.min(
                                Date.now(),
                                new Date(expiresAt).getTime()
                              )) - lodash.random(20 * 24 * 60 * 60 * 1000)
                        ).toISOString()
                  },
                  ${course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${user?.email},
                  ${Math.random() < 0.5 ? user?.name : null},
                  ${enrollmentRoles[Math.random() < 0.1 ? 1 : 0]}
                )
              `
            );
          }

          const enrollments: { id: number; role: EnrollmentRole }[] = [
            enrollment,
            ...enrollmentsUsers.map(
              (enrollmentUser) =>
                database.get<{
                  id: number;
                  role: EnrollmentRole;
                }>(
                  sql`
                    INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
                    VALUES (
                      ${new Date().toISOString()},
                      ${enrollmentUser.id},
                      ${course.id},
                      ${cryptoRandomString({ length: 10, type: "numeric" })},
                      ${enrollmentRoles[Math.random() < 0.1 ? 1 : 0]},
                      ${lodash.sample(enrollmentAccentColors)!}
                    )
                    RETURNING *
                  `
                )!
            ),
          ];
          const staff = enrollments.filter(
            (enrollment) => enrollment.role === "staff"
          );

          const tags: { id: number }[] = [
            {
              name: "Assignment 1",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 2",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 3",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 4",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 5",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 6",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 7",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 8",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 9",
              staffOnlyAt: null,
            },
            {
              name: "Assignment 10",
              staffOnlyAt: null,
            },
            {
              name: "Change for Next Year",
              staffOnlyAt: new Date().toISOString(),
            },
            {
              name: "Duplicate Question",
              staffOnlyAt: new Date().toISOString(),
            },
          ].map(
            ({ name, staffOnlyAt }) =>
              database.get<{ id: number }>(
                sql`
                    INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
                    VALUES (
                      ${new Date().toISOString()},
                      ${course.id},
                      ${cryptoRandomString({ length: 10, type: "numeric" })},
                      ${name},
                      ${staffOnlyAt}
                    )
                    RETURNING *
                  `
              )!
          );

          const conversationCreatedAts = [
            new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          ];
          for (
            let conversationReference = 2;
            conversationReference < course.nextConversationReference;
            conversationReference++
          )
            conversationCreatedAts.unshift(
              new Date(
                new Date(conversationCreatedAts[0]).getTime() -
                  lodash.random(6 * 60 * 60 * 1000, 2 * 24 * 60 * 60 * 1000)
              ).toISOString()
            );

          for (
            let conversationReference = 1;
            conversationReference < course.nextConversationReference;
            conversationReference++
          ) {
            const conversationCreatedAt =
              conversationCreatedAts[conversationReference - 1];
            const type =
              conversationTypes[
                Math.random() < 0.5
                  ? 1
                  : Math.random() < 0.5
                  ? 0
                  : Math.random() < 0.7
                  ? 3
                  : 2
              ];
            const nextMessageReference =
              type === "chat" ? lodash.random(50, 100) : lodash.random(2, 13);
            const messageCreatedAts = [conversationCreatedAt];
            for (
              let messageReference = 1;
              messageReference < nextMessageReference;
              messageReference++
            )
              messageCreatedAts.push(
                new Date(
                  Math.min(
                    Date.now(),
                    new Date(
                      messageCreatedAts[messageCreatedAts.length - 1]
                    ).getTime() + lodash.random(12 * 60 * 60 * 1000)
                  )
                ).toISOString()
              );
            const title = `${lodash.capitalize(
              casual.words(lodash.random(3, 9))
            )}${type === "question" ? "?" : ""}`;
            const conversation = database.get<{
              id: number;
              authorEnrollment: number | null;
              anonymousAt: string | null;
              type: ConversationType;
              title: string;
            }>(
              sql`
                INSERT INTO "conversations" (
                  "createdAt",
                  "updatedAt",
                  "course",
                  "reference",
                  "authorEnrollment",
                  "anonymousAt",      
                  "type",
                  "pinnedAt",
                  "staffOnlyAt",
                  "title",
                  "titleSearch",
                  "nextMessageReference"
                )
                VALUES (
                  ${conversationCreatedAt},
                  ${messageCreatedAts[messageCreatedAts.length - 1]},
                  ${course.id},
                  ${String(conversationReference)},
                  ${lodash.sample(enrollments)!.id},
                  ${Math.random() < 0.5 ? new Date().toISOString() : null},
                  ${type},
                  ${Math.random() < 0.15 ? new Date().toISOString() : null},
                  ${Math.random() < 0.25 ? new Date().toISOString() : null},
                  ${title},
                  ${html`${title}`},
                  ${nextMessageReference}
                )
                RETURNING *
              `
            )!;

            database.run(
              sql`
                INSERT INTO "taggings" ("createdAt", "conversation", "tag")
                VALUES (
                  ${new Date().toISOString()},
                  ${conversation.id},
                  ${lodash.sample(tags)!.id}
                )
              `
            );

            for (
              let messageReference = 1;
              messageReference < nextMessageReference;
              messageReference++
            ) {
              const messageCreatedAt = messageCreatedAts[messageReference - 1];
              const contentSource =
                type === "chat" && Math.random() < 0.9
                  ? casual.sentences(lodash.random(1, 2))
                  : lodash
                      .times(lodash.random(1, 6), () =>
                        casual.sentences(lodash.random(1, 6))
                      )
                      .join("\n\n");
              const processedContent = processContent({
                req,
                res,
                type: "source",
                content: contentSource,
                decorate: true,
              });
              const message = database.get<{ id: number }>(
                sql`
                  INSERT INTO "messages" (
                    "createdAt",
                    "updatedAt",
                    "conversation",
                    "reference",
                    "authorEnrollment",
                    "anonymousAt",
                    "answerAt",
                    "contentSource",
                    "contentPreprocessed",
                    "contentSearch"
                  )
                  VALUES (
                    ${messageCreatedAt},
                    ${
                      Math.random() < 0.8
                        ? null
                        : new Date(
                            Math.min(
                              Date.now(),
                              new Date(messageCreatedAt).getTime() +
                                lodash.random(
                                  5 * 60 * 60 * 1000,
                                  18 * 60 * 60 * 1000
                                )
                            )
                          ).toISOString()
                    },
                    ${conversation.id},
                    ${String(messageReference)},
                    ${
                      messageReference === 1
                        ? conversation.authorEnrollment
                        : Math.random() < 0.05
                        ? null
                        : lodash.sample(enrollments)!.id
                    },
                    ${
                      messageReference === 1
                        ? conversation.anonymousAt
                        : Math.random() < 0.5
                        ? new Date().toISOString()
                        : null
                    },
                    ${Math.random() < 0.5 ? new Date().toISOString() : null},
                    ${contentSource},
                    ${processedContent.preprocessed},
                    ${processedContent.search}
                  )
                  RETURNING *
                `
              )!;

              let readingCreatedAt = messageCreatedAt;
              for (const enrollment of lodash.sampleSize(
                enrollments,
                lodash.random(1, enrollments.length)
              )) {
                readingCreatedAt = new Date(
                  Math.min(
                    Date.now(),
                    new Date(readingCreatedAt).getTime() +
                      lodash.random(12 * 60 * 60 * 1000)
                  )
                ).toISOString();
                database.run(
                  sql`
                    INSERT INTO "readings" ("createdAt", "message", "enrollment")
                    VALUES (
                      ${readingCreatedAt},
                      ${message.id},
                      ${enrollment.id}
                    )
                  `
                );
              }

              for (const enrollment of lodash.sampleSize(
                staff,
                Math.random() < 0.8 ? 0 : lodash.random(2)
              ))
                database.run(
                  sql`
                    INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
                    VALUES (
                      ${new Date().toISOString()},
                      ${message.id},
                      ${enrollment.id}
                    )
                  `
                );

              for (const enrollment of lodash.sampleSize(
                enrollments,
                Math.random() < (conversation.type === "chat" ? 0.9 : 0.5)
                  ? 0
                  : lodash.random(5)
              ))
                database.run(
                  sql`
                    INSERT INTO "likes" ("createdAt", "message", "enrollment")
                    VALUES (
                      ${new Date().toISOString()},
                      ${message.id},
                      ${enrollment.id}
                    )
                  `
                );
            }
          }
        }

        Session.open({ req, res, userId: demonstrationUser.id });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              <p>
                Demonstration data including users, courses, conversations, and
                so forth, have been created and you’ve been signed in as a
                demonstration user to give you a better idea of what CourseLore
                looks like in use. If you wish to sign in as another one of the
                demonstration users, their password is “courselore”.
              </p>
            </div>
          `,
        });
        res.redirect(baseURL);
      })
    );

  if (demonstration && process.env.NODE_ENV !== "production")
    app.delete<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/turn-off",
      (req, res, next) => {
        res.send(`Thanks for trying CourseLore.`);
        process.exit(0);
      }
    );

  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...isSignedOutMiddleware,
    (req, res) => {
      res.redirect(
        `${baseURL}/sign-in${qs.stringify(
          {
            redirect: req.originalUrl,
          },
          { addQueryPrefix: true }
        )}`
      );
    }
  );

  app.all<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "*",
    ...isSignedInMiddleware,
    (req, res) => {
      if (typeof req.query.redirect === "string")
        return res.redirect(`${baseURL}${req.query.redirect}`);
      res.status(404).send(
        boxLayout({
          req,
          res,
          head: html`<title>404 Not Found · CourseLore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-question-diamond"></i>
              404 Not Found
            </h2>
            <p>
              If you think there should be something here, please contact your
              course staff or the system administrator at
              <a href="${reportIssueHref}" target="_blank" class="link"
                >${administratorEmail}</a
              >.
            </p>
          `,
        })
      );
    }
  );

  app.use<{}, HTML, {}, {}, BaseMiddlewareLocals>(((err, req, res, next) => {
    console.error(`${new Date().toISOString()}\tERROR\t${err}`);
    const isCSRF = err.code === "EBADCSRFTOKEN";
    const isValidation = err === "validation";
    const message = isCSRF
      ? "Cross-Site"
      : isValidation
      ? "Validation"
      : "Server";
    res.status(isCSRF ? 403 : isValidation ? 422 : 500).send(
      boxLayout({
        req,
        res,
        head: html`<title>${message} Error · CourseLore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-bug"></i>
            ${message} Error
          </h2>
          $${isCSRF
            ? html`
                <p>
                  This request doesn’t appear to have come from CourseLore.
                  Please try again.
                </p>
                <p>
                  If the issue persists, please report to the system
                  administrator at
                  <a href="${reportIssueHref}" target="_blank" class="link"
                    >${administratorEmail}</a
                  >.
                </p>
              `
            : html`
                <p>
                  This is an issue in CourseLore, please report to the system
                  administrator at
                  <a href="${reportIssueHref}" target="_blank" class="link"
                    >${administratorEmail}</a
                  >.
                </p>
              `}
        `,
      })
    );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>);

  const sendEmailWorker = (() => {
    let timeout = setTimeout(schedule, 2 * 60 * 1000);
    return schedule;

    async function schedule(): Promise<void> {
      clearTimeout(timeout);
      clean();
      await work();
      timeout = setTimeout(schedule, 2 * 60 * 1000);
    }

    function clean(): void {
      database.executeTransaction(() => {
        for (const job of database.all<{ id: number; mailOptions: string }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "expiresAt" < ${new Date().toISOString()}
          `
        )) {
          database.run(
            sql`
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `
          );
          console.log(
            `${new Date().toISOString()}\tsendEmailWorker\tEXPIRED\n${JSON.stringify(
              JSON.parse(job.mailOptions),
              undefined,
              2
            )}`
          );
        }
      });

      database.executeTransaction(() => {
        for (const job of database.all<{ id: number; mailOptions: string }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "startedAt" < ${new Date(
              Date.now() - 2 * 60 * 1000
            ).toISOString()}
          `
        )) {
          database.run(
            sql`
              UPDATE "sendEmailJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `
          );
          console.log(
            `${new Date().toISOString()}\tsendEmailWorker\tTIMED OUT\n${JSON.stringify(
              JSON.parse(job.mailOptions),
              undefined,
              2
            )}`
          );
        }
      });
    }

    async function work(): Promise<void> {
      while (true) {
        const job = database.executeTransaction(() => {
          const job = database.get<{ id: number; mailOptions: string }>(
            sql`
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE "startAt" <= ${new Date().toISOString()} AND
                    "startedAt" IS NULL
              ORDER BY "startAt" ASC
              LIMIT 1
            `
          );
          if (job !== undefined)
            database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startedAt" = ${new Date().toISOString()}
                WHERE "id" = ${job.id}
              `
            );
          return job;
        });
        if (job === undefined) return;
        const mailOptions = JSON.parse(job.mailOptions);
        let result: { status: "SUCCEEDED" | "FAILED"; response: string };
        try {
          const sentMessageInfo = await sendMail(mailOptions);
          result = { status: "SUCCEEDED", ...sentMessageInfo };
        } catch (error: any) {
          result = { status: "FAILED", ...error };
        }
        switch (result.status) {
          case "SUCCEEDED":
            database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            break;
          case "FAILED":
            database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startAt" = ${new Date(
                  Date.now() + 5 * 60 * 1000
                ).toISOString()},
                    "startedAt" = NULL
                WHERE "id" = ${job.id}
              `
            );
            break;
        }
        console.log(
          `${new Date().toISOString()}\tsendEmailWorker\t${result.status}\t\t${
            result?.response ?? ""
          }\t\t${mailOptions.to}\t\t${mailOptions.subject}${
            process.env.NODE_ENV !== "production" ? `\n${mailOptions.html}` : ``
          }`
        );
      }
    }
  })();

  const emailRegExp = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  const isDate = (string: string): boolean =>
    string.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null &&
    !isNaN(new Date(string).getTime());

  const isExpired = (expiresAt: string | null): boolean =>
    expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

  const sanitizeSearch = (
    search: string,
    { prefix = false }: { prefix?: boolean } = {}
  ): string =>
    splitSearchPhrases(search)
      .map((phrase) => `"${phrase.replaceAll('"', '""')}"${prefix ? "*" : ""}`)
      .join(" ");

  const highlightSearchResult = (
    searchResult: string,
    searchPhrases: string | string[] | undefined,
    { prefix = false }: { prefix?: boolean } = {}
  ): HTML => {
    if (searchPhrases === undefined) return searchResult;
    if (typeof searchPhrases === "string")
      searchPhrases = splitSearchPhrases(searchPhrases);
    if (searchPhrases.length === 0) return searchResult;
    return searchResult.replace(
      new RegExp(
        `(?<!\\w)(?:${searchPhrases
          .map((searchPhrase) => escapeStringRegexp(searchPhrase))
          .join("|")})${prefix ? "" : "(?!\\w)"}`,
        "gi"
      ),
      (searchPhrase) => html`<mark class="mark">$${searchPhrase}</mark>`
    );
  };

  const splitSearchPhrases = (search: string): string[] =>
    search.split(/\s+/).filter((searchPhrase) => searchPhrase.trim() !== "");

  const splitFilterablePhrases = (filterable: string): string[] =>
    filterable.split(/(?<=[^a-z0-9])(?=[a-z0-9])|(?<=[a-z0-9])(?=[^a-z0-9])/i);

  return app;
}

export const courseloreVersion = JSON.parse(
  // FIXME: Remove this extra `await` & `.toString()` when updating TypeScript target so that it doesn’t complain about top-level await.
  await (
    await fs.readFile(
      url.fileURLToPath(new URL("../package.json", import.meta.url)),
      "utf8"
    )
  ).toString()
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
    courseloreVersion,
  });
