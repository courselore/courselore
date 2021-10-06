#!/usr/bin/env node

import path from "path";

import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import qs from "qs";

import { Database, sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css, extractInlineStyles } from "@leafac/css";
import { javascript } from "@leafac/javascript";
type Markdown = string;
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
import nodemailer from "nodemailer";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import sharp from "sharp";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import escapeStringRegexp from "escape-string-regexp";
import QRCode from "qrcode";
import faker from "faker";

export default async function courselore({
  dataDirectory,
  url,
  administrator,
  sendMail,
  demonstration = process.env.NODE_ENV !== "production",
  liveReload = false,
}: {
  dataDirectory: string;
  url: string;
  administrator: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  liveReload?: boolean;
}): Promise<express.Express> {
  await fs.ensureDir(dataDirectory);

  const app = express();

  type UserEmailNotifications = typeof userEmailNotificationses[number];
  const userEmailNotificationses = [
    "none",
    "staff-announcements-and-mentions",
    "all-messages",
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

  type NoLongerEnrolledEnrollment = typeof noLongerEnrolledEnrollment;
  const noLongerEnrolledEnrollment = {
    id: null,
    user: {
      id: null,
      email: null,
      name: "No Longer Enrolled",
      avatar: null,
      biography: null,
    },
    reference: null,
    role: null,
  } as const;

  type ConversationType = typeof conversationTypes[number];
  const conversationTypes = ["announcement", "question", "other"] as const;

  const database = new Database(path.join(dataDirectory, "courselore.db"));
  database.pragma("journal_mode = WAL");
  database.migrate(
    sql`
      CREATE TABLE "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "nonce" TEXT NOT NULL UNIQUE,
        "content" TEXT NOT NULL
      );
      CREATE INDEX "flashesCreatedAtIndex" ON "flashes" (datetime("createdAt"));

      CREATE TABLE "users" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
        "password" TEXT NOT NULL,
        "emailConfirmedAt" TEXT NULL,
        "name" TEXT NOT NULL,
        "nameSearch" TEXT NOT NULL,
        "avatar" TEXT NULL,
        "biography" TEXT NULL,
        "emailNotifications" TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE "usersSearch" USING fts5 (
        content = "users",
        content_rowid = "id",
        "nameSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "usersSearchInsert" AFTER INSERT ON "users" BEGIN
        INSERT INTO "usersSearch" ("rowid", "nameSearch") VALUES ("new"."id", "new"."nameSearch");
      END;
      CREATE TRIGGER "usersSearchUpdate" AFTER UPDATE ON "users" BEGIN
        INSERT INTO "usersSearch" ("usersSearch", "rowid", "nameSearch") VALUES ('delete', "old"."id", "old"."nameSearch");
        INSERT INTO "usersSearch" ("rowid", "nameSearch") VALUES ("new"."id", "new"."nameSearch");
      END;
      CREATE TRIGGER "usersSearchDelete" AFTER DELETE ON "users" BEGIN
        INSERT INTO "usersSearch" ("usersSearch", "rowid", "nameSearch") VALUES ('delete', "old"."id", "old"."nameSearch");
      END;

      CREATE TABLE "emailConfirmations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "emailConfirmationsCreatedAtIndex" ON "emailConfirmations" (datetime("createdAt"));

      CREATE TABLE "passwordResets" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "passwordResetsCreatedAtIndex" ON "passwordResets" (datetime("createdAt"));

      CREATE TABLE "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "token" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "sessionsCreatedAtIndex" ON "sessions" (datetime("createdAt"));

      CREATE TABLE "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "reference" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "nextConversationReference" INTEGER NOT NULL
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
        "role" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "invitationsCourseIndex" ON "invitations" ("course");
      CREATE INDEX "invitationsEmailIndex" ON "invitations" ("email");

      CREATE TABLE "enrollments" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
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

      CREATE TABLE "conversations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "titleSearch" TEXT NOT NULL,
        "nextMessageReference" INTEGER NOT NULL,
        "type" TEXT NOT NULL,
        "pinnedAt" TEXT NULL,
        "staffOnlyAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "conversationsCourseIndex" ON "conversations" ("course");
      CREATE INDEX "conversationsTypeIndex" ON "conversations" ("type");
      CREATE INDEX "conversationsPinnedAtIndex" ON "conversations" ("pinnedAt");
      CREATE INDEX "conversationsStaffOnlyAtIndex" ON "conversations" ("staffOnlyAt");
      CREATE VIRTUAL TABLE "conversationsSearch" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "titleSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "conversationsSearchInsert" AFTER INSERT ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("rowid", "titleSearch") VALUES ("new"."id", "new"."titleSearch");
      END;
      CREATE TRIGGER "conversationsSearchUpdate" AFTER UPDATE ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("conversationsSearch", "rowid", "titleSearch") VALUES ('delete', "old"."id", "old"."titleSearch");
        INSERT INTO "conversationsSearch" ("rowid", "titleSearch") VALUES ("new"."id", "new"."titleSearch");
      END;
      CREATE TRIGGER "conversationsSearchDelete" AFTER DELETE ON "conversations" BEGIN
        INSERT INTO "conversationsSearch" ("conversationsSearch", "rowid", "titleSearch") VALUES ('delete', "old"."id", "old"."titleSearch");
      END;

      CREATE TABLE "messages" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "updatedAt" TEXT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "content" TEXT NOT NULL,
        "contentSearch" TEXT NOT NULL,
        "answerAt" TEXT NULL,
        "anonymousAt" TEXT NULL,
        UNIQUE ("conversation", "reference")
      );
      CREATE INDEX "messagesConversationIndex" ON "messages" ("conversation");
      CREATE INDEX "messagesAnswerAtIndex" ON "messages" ("answerAt");
      CREATE VIRTUAL TABLE "messagesSearch" USING fts5(
        content = "messages",
        content_rowid = "id",
        "contentSearch",
        tokenize = 'porter'
      );
      CREATE TRIGGER "messagesSearchInsert" AFTER INSERT ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("rowid", "contentSearch") VALUES ("new"."id", "new"."contentSearch");
      END;
      CREATE TRIGGER "messagesSearchUpdate" AFTER UPDATE ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("messagesSearch", "rowid", "contentSearch") VALUES ('delete', "old"."id", "old"."contentSearch");
        INSERT INTO "messagesSearch" ("rowid", "contentSearch") VALUES ("new"."id", "new"."contentSearch");
      END;
      CREATE TRIGGER "messagesSearchDelete" AFTER DELETE ON "messages" BEGIN
        INSERT INTO "messagesSearch" ("messagesSearch", "rowid", "contentSearch") VALUES ('delete', "old"."id", "old"."contentSearch");
      END;

      CREATE TABLE "readings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
        UNIQUE ("message", "enrollment") ON CONFLICT IGNORE
      );

      CREATE TABLE "endorsements" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );
      CREATE INDEX "endorsementsMessageIndex" ON "endorsements" ("message");

      CREATE TABLE "likes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("message", "enrollment")
      );
      CREATE INDEX "likesMessageIndex" ON "likes" ("message");

      CREATE TABLE "tags" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "staffOnlyAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
      CREATE INDEX "tagsCourseIndex" ON "tags" ("course");

      CREATE TABLE "taggings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ')),
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "tag" INTEGER NOT NULL REFERENCES "tags" ON DELETE CASCADE,
        UNIQUE ("conversation", "tag")
      );
      CREATE INDEX "taggingsConversationIndex" ON "taggings" ("conversation");
      CREATE INDEX "taggingsTagIndex" ON "taggings" ("tag");
    `
  );
  setTimeout(function deleteExpiredData() {
    database.run(
      sql`
        DELETE FROM "flashes" WHERE datetime("createdAt") < datetime(${new Date(
          Date.now() - Flash.maxAge
        ).toISOString()})
      `
    );
    database.run(
      sql`
        DELETE FROM "emailConfirmations" WHERE datetime("createdAt") < datetime(${new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString()})
      `
    );
    database.run(
      sql`
        DELETE FROM "passwordResets" WHERE datetime("createdAt") < datetime(${new Date(
          Date.now() - PasswordReset.maxAge
        ).toISOString()})
      `
    );
    database.run(
      sql`
        DELETE FROM "sessions" WHERE datetime("createdAt") < datetime(${new Date(
          Date.now() - Session.maxAge
        ).toISOString()})
      `
    );
    setTimeout(deleteExpiredData, 24 * 60 * 60 * 1000);
  }, 0);

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
  }): HTML =>
    extractInlineStyles(html`
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

          <link
            rel="stylesheet"
            href="${url}/node_modules/bootstrap-icons/font/bootstrap-icons.css"
          />
          <link
            rel="stylesheet"
            href="${url}/node_modules/katex/dist/katex.min.css"
          />
          <script src="${url}/node_modules/@popperjs/core/dist/umd/popper.min.js"></script>
          <script src="${url}/node_modules/tippy.js/dist/tippy-bundle.umd.min.js"></script>
          <link
            rel="stylesheet"
            href="${url}/node_modules/tippy.js/dist/svg-arrow.css"
          />
          <link
            rel="stylesheet"
            href="${url}/node_modules/tippy.js/dist/border.css"
          />
          <script type="module">
            import * as textFieldEdit from "${url}/node_modules/text-field-edit/index.js";
            window.textFieldEdit = textFieldEdit;
          </script>
          <script src="${url}/node_modules/mousetrap/mousetrap.min.js"></script>
          <script src="${url}/node_modules/textarea-caret/index.js"></script>
          <script src="${url}/node_modules/scroll-into-view-if-needed/umd/scroll-into-view-if-needed.min.js"></script>
          <script src="${url}/node_modules/@leafac/javascript/browser.js"></script>
          <script>
            leafac.evaluateOnInteractive();
            leafac.customFormValidation();
            leafac.warnAboutLosingInputs();
            leafac.disableButtonsOnSubmit();
            leafac.tippySetDefaultProps();
            ${liveReload
              ? javascript`
                  leafac.liveReload();
                `
              : javascript``};
          </script>

          $${res?.locals.eventSource
            ? html`
                <!-- TODO: Improve this such that the diff is done on the server. -->
                <script src="${url}/node_modules/morphdom/dist/morphdom-umd.min.js"></script>

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
                        leafac.evaluateElementsAttribute(refreshedDocument);
                        document.head.append(
                          ...refreshedDocument.head.querySelectorAll("style")
                        );
                        morphdom(document.body, refreshedDocument.body);
                        break;

                      case 404:
                        alert(
                          "This page has been removed.\\n\\nYou’ll be redirected now."
                        );
                        window.location.href = $${JSON.stringify(url)};
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
                    var(--border-width--0) var(--border-width--2)
                    var(--color--box-shadow);
                }
                transition-property: var(--transition-property--box-shadow);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
                }
                &:checked::after {
                  margin-left: var(--space--4);
                }
                transition-property: var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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

                ${["blue", "green", "rose"].map(
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
                      .secondary,
                      [class^="text--"] {
                        color: var(--color--${color}--50);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--${color}--100);
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                flex-wrap: wrap;
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
                "orange",
                "amber",
                "teal",
                "fuchsia",
                "violet",
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

              .search-result-highlight {
                color: var(--color--amber--700);
                background-color: var(--color--amber--200);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--amber--200);
                  background-color: var(--color--amber--700);
                }
                border-radius: var(--border-radius--base);
              }

              .pre {
                code {
                  font-family: var(--font-family--monospace);
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                }
              }

              .avatar {
                border-radius: var(--border-radius--circle);
                @media (prefers-color-scheme: dark) {
                  filter: brightness(var(--brightness--90));
                }

                ${["xs", "sm", "xl", "2xl"].map(
                  (size) => css`
                    &.avatar--${size} {
                      width: var(--font-size--${size});
                      height: var(--font-size--${size});
                    }
                  `
                )}

                &.avatar--vertical-align {
                  position: relative;
                  top: var(--space--0-5);
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
                    var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--800);
                  }
                  border-radius: var(--border-radius--circle);
                  justify-self: end;
                  transform: translateX(40%);
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
                display: flex;
                flex-direction: column;
                & > * {
                  &:nth-child(odd) {
                    background-color: var(--color--gray--medium--100);
                    @media (prefers-color-scheme: dark) {
                      background-color: var(--color--gray--medium--800);
                    }
                  }
                  padding: var(--space--2);
                  border-radius: var(--border-radius--lg);
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
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--200);
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

              .markdown {
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

                i,
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
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
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
                  font-family: var(--font-family--monospace);
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
                  background-color: var(--color--gray--medium--100);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--800);
                    filter: brightness(var(--brightness--90));
                  }
                  max-width: 100%;
                  height: auto;
                  border-radius: var(--border-radius--xl);
                }

                hr {
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--200);
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
                  padding: var(--space--2) var(--space--4);
                  background-color: var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--700);
                  }
                  border-radius: var(--border-radius--xl);
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
                    margin-bottom: var(--space--4);
                    &::before {
                      content: "\\f273";
                    }
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
            }
          `}"
        >
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
            onscroll="${javascript`
              this.scroll(0, 0);
            `}"
          >
            $${res.locals.enrollment === undefined
              ? html``
              : html`
                  <div
                    style="${css`
                      height: var(--border-width--8);
                      display: flex;
                    `}"
                  >
                    <button
                      class="button"
                      style="${css`
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
                      `}"
                      oninteractive="${javascript`
                        tippy(this, {
                          content: "What’s This?",
                          touch: false,
                        });
                        tippy(this, {
                          content: this.nextElementSibling.firstElementChild,
                          trigger: "click",
                          interactive: true,
                        });
                      `}"
                    ></button>
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
                          This bar with an accent color appears at the top of
                          pages related to this course to help you differentiate
                          between courses.
                        </p>
                        <a
                          class="button button--blue"
                          href="${url}/courses/${res.locals.course!
                            .reference}/settings/your-enrollment"
                          style="${css`
                            width: 100%;
                          `}"
                        >
                          <i class="bi bi-palette"></i>
                          Update Accent Color
                        </a>
                      </div>
                    </div>
                  </div>
                `}
            <div
              style="${css`
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
              `}"
            >
              $${demonstration
                ? html`
                    <div
                      style="${css`
                        justify-content: center;
                        flex-wrap: wrap;
                      `}"
                    >
                      <div>
                        <button
                          class="button button--transparent"
                          oninteractive="${javascript`
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
                              CourseLore is running in Demonstration Mode. All
                              data may be lost, including courses,
                              conversations, users, and so forth. Also, no
                              emails are actually sent.
                            </p>
                            <p>
                              To give you a better idea of what CourseLore looks
                              like in use, you may create demonstration data.
                            </p>
                            <form
                              method="POST"
                              action="${url}/demonstration-data"
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
                      $${process.env.NODE_ENV !== "production"
                        ? html`
                            <form
                              method="POST"
                              action="${url}/turn-off?_method=DELETE"
                            >
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
                    style="${css`
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
                    `}"
                  >
                    <div
                      style="${css`
                        flex: 1;
                        max-width: var(--width--prose);
                        text-align: center;
                      `}"
                    >
                      <form
                        method="POST"
                        action="${url}/resend-confirmation-email"
                      >
                        Please confirm your email by following the link sent to
                        ${res.locals.user.email}.<br />
                        Didn’t receive the email? Already checked your spam
                        folder? <button class="link">Resend</button>.
                      </form>
                    </div>
                  </div>
                `
              : html``}
            $${(() => {
              const flash = Flash.get(req, res);
              return flash === undefined
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
                                    background-color: var(
                                      --color--${color}--800
                                    );
                                  }
                                  &:active {
                                    background-color: var(
                                      --color--${color}--700
                                    );
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
                        class="button button--tight button--tight--inline button--transparent"
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
                  `;
            })()}

            <div
              style="${css`
                flex: 1;
                overflow: auto;
              `}"
            >
              $${body}
            </div>
          </div>
        </body>
      </html>
    `);

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
  }): HTML =>
    baseLayout({
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
                href="${url}/"
                class="heading--display button button--transparent"
                style="${css`
                  align-items: center;
                `}"
              >
                $${logo} CourseLore
              </a>
            </div>
            <div
              style="${css`
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                padding: var(--space--4);
                border-radius: var(--border-radius--lg);
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

  const applicationLayout = ({
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
  }): HTML =>
    baseLayout({
      req,
      res,
      head,
      extraHeaders: html`
        <div
          style="${css`
            padding-top: var(--space--1);
            padding-bottom: var(--space--1);
            gap: var(--space--4);
            align-items: center;
          `}"
        >
          <a
            href="${url}/"
            class="button button--tight button--tight--inline button--transparent"
          >
            $${logo}
          </a>

          <div
            style="${css`
              font-size: var(--font-size--sm);
              line-height: var(--line-height--sm);
              flex: 1;
              min-width: var(--width--0);
            `}"
          >
            $${res.locals.course === undefined
              ? html``
              : html`
                  <button
                    class="button button--tight button--tight--inline button--transparent strong"
                    style="${css`
                      max-width: 100%;
                    `}"
                    oninteractive="${javascript`
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
                      <span
                        class="secondary"
                        style="${css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `}"
                      >
                        · ${lodash.capitalize(res.locals.enrollment!.role)}
                      </span>
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
                      <div>
                        <h3 class="heading">
                          <i class="bi bi-journal-text"></i>
                          ${res.locals.course.name}
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="${url}/courses/${res.locals.course.reference}"
                            class="dropdown--menu--item button ${req.path.includes(
                              "settings"
                            )
                              ? "button--transparent"
                              : "button--blue"}"
                          >
                            <i class="bi bi-chat-left-text"></i>
                            Conversations
                          </a>
                          <a
                            href="${url}/courses/${res.locals.course
                              .reference}/settings"
                            class="dropdown--menu--item button ${req.path.includes(
                              "settings"
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
                              <div class="dropdown--menu">
                                $${res.locals.enrollments.map(
                                  (enrollment) => html`
                                    <a
                                      href="${url}/courses/${enrollment.course
                                        .reference}"
                                      class="dropdown--menu--item button ${enrollment.id ===
                                      res.locals.enrollment?.id
                                        ? "button--blue"
                                        : "button--transparent"}"
                                    >
                                      <div
                                        class="button button--tight"
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
                                      <span>
                                        ${enrollment.course.name}
                                        <span
                                          class="secondary"
                                          style="${css`
                                            font-size: var(--font-size--xs);
                                            line-height: var(--line-height--xs);
                                          `}"
                                        >
                                          ·
                                          ${lodash.capitalize(enrollment.role)}
                                        </span>
                                      </span>
                                    </a>
                                  `
                                )}
                              </div>
                            </div>
                          `
                        : html``}
                    </div>
                  </div>
                `}
          </div>
          <div>
            <button
              class="button button--tight button--tight--inline button--transparent"
              oninteractive="${javascript`
                tippy(this, {
                  content: ${JSON.stringify(
                    res.locals.invitations!.length === 0
                      ? "Add"
                      : `${res.locals.invitations!.length} pending invitation${
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
                style="${css`
                  font-size: var(--font-size--xl);
                  line-height: var(--line-height--xl);
                `}"
              >
                <i class="bi bi-plus-circle"></i>
              </div>
            </button>
            <div hidden>
              <div
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
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
                                href="${url}/courses/${invitation.course
                                  .reference}/invitations/${invitation.reference}"
                                class="dropdown--menu--item button button--transparent"
                              >
                                <i class="bi bi-journal-arrow-down"></i>
                                Enroll in ${invitation.course.name} as
                                ${lodash.capitalize(invitation.role)}
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
                        content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                        trigger: "click",
                      });
                    `}"
                  >
                    <i class="bi bi-journal-arrow-down"></i>
                    Enroll in an Existing Course
                  </button>
                  <a
                    href="${url}/courses/new"
                    class="dropdown--menu--item button button--transparent"
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
              class="button button--tight button--tight--inline button--transparent"
              oninteractive="${javascript`
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
                ? html`
                    <div
                      style="${css`
                        font-size: var(--font-size--xl);
                        line-height: var(--line-height--xl);
                      `}"
                    >
                      <i class="bi bi-person-circle"></i>
                    </div>
                  `
                : html`
                    <img
                      src="${res.locals.user.avatar}"
                      alt="${res.locals.user.name}"
                      class="avatar avatar--xl"
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

                <hr class="dropdown--separator" />

                <div class="dropdown--menu">
                  <a
                    class="dropdown--menu--item button button--transparent"
                    href="${url}/settings"
                  >
                    <i class="bi bi-sliders"></i>
                    User Settings
                  </a>
                  <form method="POST" action="${url}/sign-out?_method=DELETE">
                    <button
                      class="dropdown--menu--item button button--transparent"
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

        $${extraHeaders}
      `,
      body,
    });

  const mainLayout = ({
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
  }): HTML =>
    applicationLayout({
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
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                style="${css`
                  justify-content: center;
                  @media (min-width: 700px) {
                    display: none;
                  }
                `}"
              >
                <button
                  class="button button--transparent"
                  oninteractive="${javascript`
                    tippy(this, {
                      content: this.nextElementSibling.firstElementChild,
                      trigger: "click",
                      interactive: true,
                    });
                  `}"
                >
                  $${menuButton}
                  <i class="bi bi-chevron-down"></i>
                </button>
                <div hidden>
                  <div class="dropdown--menu">$${menu}</div>
                </div>
              </div>
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
          $${menu === html``
            ? html``
            : html`
                <div
                  style="${css`
                    @media (max-width: 699px) {
                      display: none;
                    }
                  `}"
                >
                  <div class="menu-box">$${menu}</div>
                </div>
              `}
          <div
            style="${css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  const logo = (() => {
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

  const spinner = html`
    <svg
      width="20"
      height="20"
      style="${css`
        animation: var(--animation--spin);
      `}"
      fill="none"
      stroke="currentColor"
      stroke-width="4"
    >
      <path
        d="M 2 10, A 8 8, 0, 0, 0, 18 10, A 8 8, 0, 0, 0, 2 10"
        style="${css`
          opacity: var(--opacity--25);
        `}"
      />
      <path
        d="M 2 10, A 8 8, 0, 0, 0, 15.5 15.5"
        style="${css`
          opacity: var(--opacity--75);
        `}"
      />
    </svg>
  `;

  const conversationTypeIcon = {
    announcement: {
      regular: html`<i class="bi bi-megaphone"></i>`,
      fill: html`<i class="bi bi-megaphone-fill"></i>`,
    },
    question: {
      regular: html`<i class="bi bi-patch-question"></i>`,
      fill: html`<i class="bi bi-patch-question-fill"></i>`,
    },
    other: {
      regular: html`<i class="bi bi-chat-left-text"></i>`,
      fill: html`<i class="bi bi-chat-left-text-fill"></i>`,
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
    other: {
      display: "",
      select: "text--blue",
    },
  };

  app.use(express.static(path.join(__dirname, "../static")));
  app.use(methodOverride("_method"));
  app.use(cookieParser());
  const cookieOptions = {
    domain: new URL(url).hostname,
    httpOnly: true,
    path: new URL(url).pathname,
    sameSite: true,
    secure: true,
  };
  app.use(express.urlencoded({ extended: true }));
  // TODO: Make this secure: https://github.com/richardgirges/express-fileupload
  app.use(expressFileUpload({ createParentPath: true }));

  if (liveReload)
    app.get<{}, any, {}, {}, {}>("/live-reload", (req, res, next) => {
      res.type("text/event-stream").flushHeaders();
    });

  // FIXME: This only works for a single process. To support multiple processes poll the database for updates or use a message broker mechanism (ZeroMQ seems like a good candidate).
  const eventDestinations = new Set<express.Response>();

  interface EventSourceMiddlewareLocals {
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
      eventDestinations.add(res);
      res.on("close", () => {
        eventDestinations.delete(res);
      });
      res.type("text/event-stream").flushHeaders();
    },
  ];

  const Flash = {
    maxAge: 5 * 60 * 1000,

    set(
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      content: HTML
    ): void {
      const flash = database.get<{ nonce: string }>(
        sql`
          INSERT INTO "flashes" ("nonce", "content")
          VALUES (
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

    get(
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>
    ): HTML | undefined {
      const flash = database.get<{
        content: HTML;
      }>(
        sql`SELECT "content" FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      database.run(
        sql`DELETE FROM "flashes" WHERE "nonce" = ${req.cookies.flash}`
      );
      delete req.cookies.flash;
      res.clearCookie("flash", cookieOptions);
      return flash?.content;
    },
  };

  const Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open(
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>,
      userId: number
    ): void {
      const session = database.get<{
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
      req.cookies.session = session.token;
      res.cookie("session", session.token, {
        ...cookieOptions,
        maxAge: Session.maxAge,
      });
    },

    get(
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>
    ): number | undefined {
      if (req.cookies.session === undefined) return;
      const session = database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() < Date.now() - Session.maxAge
      )
        Session.close(req, res);
      else if (
        new Date(session.createdAt).getTime() <
        Date.now() - Session.maxAge / 2
      ) {
        Session.close(req, res);
        Session.open(req, res, session.user);
      }
      return session?.user;
    },

    close(
      req: express.Request<{}, any, {}, {}, {}>,
      res: express.Response<any, {}>
    ): void {
      database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      delete req.cookies.session;
      res.clearCookie("session", cookieOptions);
    },
  };

  interface IsSignedOutMiddlewareLocals {}
  const isSignedOutMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedOutMiddlewareLocals
  >[] = [
    (req, res, next) => {
      if (Session.get(req, res) !== undefined) return next("route");
      next();
    },
  ];

  interface IsSignedInMiddlewareLocals {
    user: {
      id: number;
      email: string;
      password: string;
      emailConfirmedAt: string | null;
      name: string;
      avatar: string | null;
      biography: string | null;
      emailNotifications: UserEmailNotifications;
    };
    invitations: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
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
      const userId = Session.get(req, res);
      if (userId === undefined) return next("route");

      res.locals.user = database.get<{
        id: number;
        email: string;
        password: string;
        emailConfirmedAt: string | null;
        name: string;
        avatar: string | null;
        biography: string | null;
        emailNotifications: UserEmailNotifications;
      }>(
        sql`
          SELECT "id",
                 "email",
                 "password",
                 "emailConfirmedAt",
                 "name",
                 "avatar",
                 "biography",
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
          reference: string;
          role: EnrollmentRole;
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

      res.locals.enrollments = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
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
    ...isSignedOutMiddleware,
    (req, res) => {
      res.redirect(`${url}/sign-in`);
    }
  );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/sign-in", ...isSignedOutMiddleware, (req, res) => {
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
            action="${url}/sign-in?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
            novalidate
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
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
          >
            <p>
              Don’t have an account?
              <a
                href="${url}/sign-up?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
                })}"
                class="link"
                >Sign up</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="${url}/reset-password?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
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

  app.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; name?: string; email?: string },
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
        Flash.set(
          req,
          res,
          html`<div class="flash--rose">Incorrect email & password.</div>`
        );
        return res.redirect(
          `${url}/sign-in?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
          })}`
        );
      }
      Session.open(req, res, user.id);
      res.redirect(`${url}${req.query.redirect ?? "/"}`);
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
          INSERT INTO "passwordResets" ("user", "nonce")
          VALUES (
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

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/reset-password", ...isSignedOutMiddleware, (req, res) => {
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
            action="${url}/reset-password?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
            novalidate
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
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-key"></i>
              Reset Password
            </button>
          </form>
          <div
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
          >
            <p>
              Don’t have an account?
              <a
                href="${url}/sign-up?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
                })}"
                class="link"
                >Sign up</a
              >.
            </p>
            <p>
              Remember your password?
              <a
                href="${url}/sign-in?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
                })}"
                class="link"
                >Sign in</a
              >.
            </p>
          </div>
        `,
      })
    );
  });

  app.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/reset-password", ...isSignedOutMiddleware, (req, res, next) => {
    if (
      typeof req.body.email !== "string" ||
      req.body.email.match(emailRegExp) === null
    )
      return next("validation");

    const user = database.get<{ id: number; email: string }>(
      sql`SELECT "id", "email" FROM "users" WHERE "email" = ${req.body.email}`
    );
    if (user === undefined) {
      Flash.set(
        req,
        res,
        html`<div class="flash--rose">Email not found.</div>`
      );
      return res.redirect(
        `${url}/reset-password?${qs.stringify({
          redirect: req.query.redirect,
          name: req.query.name,
          email: req.query.email,
        })}`
      );
    }

    const link = `${url}/reset-password/${PasswordReset.create(
      user.id
    )}?${qs.stringify({
      redirect: req.query.redirect,
      name: req.query.name,
      email: req.query.email,
    })}`;
    sendMail({
      to: user.email,
      subject: "CourseLore · Password Reset Link",
      html: html`
        <p><a href="${link}">${link}</a></p>
        <p>
          <small>
            This Password Reset Link is valid for ten minutes.<br />
            If you didn’t request this Password Reset Link, you may ignore this
            email.
          </small>
        </p>
      `,
    });
    if (req.body.resend === "true")
      Flash.set(req, res, html`<div class="flash--green">Email resent.</div>`);
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
            To continue resetting your password, please follow the Password
            Reset Link that was sent to ${req.body.email}.
          </p>
          <form
            method="POST"
            action="${url}/reset-password?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
          >
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

  app.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/reset-password/:passwordResetNonce",
    ...isSignedOutMiddleware,
    (req, res) => {
      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        Flash.set(
          req,
          res,
          html`
            <div class="flash--rose">
              This Password Reset Link is invalid or expired.
            </div>
          `
        );
        return res.redirect(
          `${url}/reset-password?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
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
              action="${url}/reset-password/${PasswordReset.create(
                userId
              )}?${qs.stringify({
                redirect: req.query.redirect,
                name: req.query.name,
                email: req.query.email,
              })}"
              novalidate
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
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
    { redirect?: string; name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/reset-password/:passwordResetNonce",
    ...isSignedOutMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        Flash.set(
          req,
          res,
          html`
            <div class="flash--rose">
              Something went wrong in your password reset. Please start over.
            </div>
          `
        );
        return res.redirect(
          `${url}/reset-password?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
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
      Session.open(req, res, userId);
      Flash.set(
        req,
        res,
        html`<div class="flash--green">Password reset successfully.</div>`
      );
      res.redirect(`${url}${req.query.redirect ?? "/"}`);
    })
  );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; name?: string; email?: string },
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
            action="${url}/sign-up?${qs.stringify({
              redirect: req.query.redirect,
              name: req.query.name,
              email: req.query.email,
            })}"
            novalidate
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
            style="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
          >
            <p>
              Already have an account account?
              <a
                href="${url}/sign-in?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
                })}"
                class="link"
                >Sign in</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="${url}/reset-password?${qs.stringify({
                  redirect: req.query.redirect,
                  name: req.query.name,
                  email: req.query.email,
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

  const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  const sendConfirmationEmail = async (user: {
    id: number;
    email: string;
  }): Promise<nodemailer.SentMessageInfo> => {
    database.run(
      sql`
        DELETE FROM "emailConfirmations" WHERE "user" = ${user.id}
      `
    );
    const emailConfirmation = database.get<{
      nonce: string;
    }>(
      sql`
        INSERT INTO "emailConfirmations" ("user", "nonce")
        VALUES (
          ${user.id},
          ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
        )
        RETURNING *
      `
    )!;
    const link = `${url}/email-confirmation/${emailConfirmation.nonce}`;
    await sendMail({
      to: user.email,
      subject: "Welcome to CourseLore!",
      html: html`
        <p>
          Please confirm your email:<br />
          <a href="${link}">${link}</a>
        </p>
      `,
    });
  };

  app.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; name?: string; email?: string },
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
        Flash.set(
          req,
          res,
          html`<div class="flash--rose">Email already taken.</div>`
        );
        return res.redirect(
          `${url}/sign-in?${qs.stringify({
            redirect: req.query.redirect,
            name: req.query.name,
            email: req.query.email,
          })}`
        );
      }
      // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
      const user = database.get<{ id: number; email: string; name: string }>(
        sql`
          SELECT * FROM "users" WHERE "id" = ${Number(
            database.run(
              sql`
                INSERT INTO "users" (
                  "email",
                  "password",
                  "emailConfirmedAt",
                  "name",
                  "nameSearch",
                  "emailNotifications"
                )
                VALUES (
                  ${req.body.email},
                  ${await argon2.hash(req.body.password, argon2Options)},
                  ${null},
                  ${req.body.name},
                  ${html`${req.body.name}`},
                  ${"staff-announcements-and-mentions"}
                )
              `
            ).lastInsertRowid
          )}
        `
      )!;
      sendConfirmationEmail(user);
      Session.open(req, res, user.id);
      res.redirect(`${url}${req.query.redirect ?? "/"}`);
    })
  );

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/resend-confirmation-email",
    ...isSignedInMiddleware,
    (req, res, next) => {
      if (res.locals.user.emailConfirmedAt !== null) {
        Flash.set(
          req,
          res,
          html`<div class="flash--rose">Email already confirmed.</div>`
        );
        return res.redirect(`${url}/`);
      }

      sendConfirmationEmail(res.locals.user);
      Flash.set(
        req,
        res,
        html`<div class="flash--green">Confirmation email resent.</div>`
      );
      res.redirect(`${url}/`);
    }
  );

  app.get<
    { emailConfirmationNonce: string },
    HTML,
    {},
    {},
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
        Flash.set(
          req,
          res,
          html`
            <div class="flash--rose">
              This Email Confirmation Link is invalid.
            </div>
          `
        );
        return res.redirect(`${url}/`);
      }
      database.run(
        sql`
          UPDATE "users"
          SET "emailConfirmedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.user.id}
        `
      );
      Flash.set(
        req,
        res,
        html`<div class="flash--green">Email confirmed successfully.</div>`
      );
      return res.redirect(`${url}/`);
    }
  );

  app.delete<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/sign-out",
    ...isSignedInMiddleware,
    (req, res) => {
      Session.close(req, res);
      res.redirect(`${url}/`);
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
                  style="${css`
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
                    $${logo}
                  </div>

                  <div class="menu-box">
                    <button
                      class="menu-box--item button button--blue"
                      oninteractive="${javascript`
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
                      href="${url}/settings"
                      class="menu-box--item button button--transparent"
                    >
                      <i class="bi bi-person-circle"></i>
                      Fill in Your Profile
                    </a>
                    <a
                      href="${url}/courses/new"
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
            `${url}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
            mainLayout({
              req,
              res,
              head: html`<title>CourseLore</title>`,
              body: html`
                <div
                  style="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `}"
                >
                  <div class="decorative-icon">
                    <i class="bi bi-journal-text"></i>
                  </div>

                  <p class="secondary">Go to one of your courses.</p>

                  <div
                    style="${css`
                      background-color: var(--color--gray--medium--100);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--gray--medium--800);
                      }
                      padding: var(--space--2);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    $${res.locals.enrollments.map(
                      (enrollment) =>
                        html`
                          <a
                            href="${url}/courses/${enrollment.course.reference}"
                            class="button button--tight button--transparent"
                            style="${css`
                              justify-content: flex-start;
                            `}"
                          >
                            <div
                              class="button button--tight"
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
                            <span>
                              ${enrollment.course.name}
                              <span
                                class="secondary"
                                style="${css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `}"
                              >
                                · ${lodash.capitalize(enrollment.role)}
                              </span>
                            </span>
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
          href="${url}/settings"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-person-circle"></i>
          Profile
        </a>
        <a
          href="${url}/settings/update-email-and-password"
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
          href="${url}/settings/notifications-preferences"
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
              action="${url}/settings?_method=PATCH"
              novalidate
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
                    $${res.locals.user.avatar === null ? html`` : html`hidden`}
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
                      oninteractive="${javascript`
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
                    $${res.locals.user.avatar === null ? html`hidden` : html``}
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
                      oninteractive="${javascript`
                        tippy(this, {
                          content: "Update Avatar",
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
                        align-items: center;
                      `}"
                      oninteractive="${javascript`
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
                        const avatarURL = await (await fetch("${url}/settings/avatar", {
                          method: "POST",
                          body,
                        })).text();
                        const form = this.closest("form");
                        const avatar = form.querySelector('[name="avatar"]')
                        avatar.value = avatarURL;
                        form.querySelector(".avatar--empty").hidden = true;
                        const avatarFilled = form.querySelector(".avatar--filled");
                        avatarFilled.hidden = false;
                        avatarFilled.querySelector("img").setAttribute("src", avatarURL);
                      })();
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
                </div>
              </div>

              <div class="label">
                <p class="label--text">Biography</p>
                $${markdownEditor({
                  req,
                  res,
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
  >("/settings", ...isSignedInMiddleware, (req, res, next) => {
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
            "biography" = ${
              req.body.biography.trim() === "" ? null : req.body.biography
            }
        WHERE "id" = ${res.locals.user.id}
      `
    );
    Flash.set(
      req,
      res,
      html`<div class="flash--green">Profile updated successfully.</div>`
    );
    res.redirect(`${url}/settings`);
  });

  // TODO: https://github.com/sindresorhus/filenamify
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
      await req.files.avatar.mv(path.join(dataDirectory, relativePathOriginal));
      const ext = path.extname(relativePathOriginal);
      const relativePathAvatar = `${relativePathOriginal.slice(
        0,
        -ext.length
      )}--avatar${ext}`;
      await sharp(req.files.avatar.data)
        .rotate()
        .resize(/* var(--space--64) */ 256, 256, {
          position: sharp.strategy.attention,
        })
        .toFile(path.join(dataDirectory, relativePathAvatar));
      res.send(`${url}/${relativePathAvatar}`);
    })
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
              action="${url}/settings/update-email-and-password?_method=PATCH"
              novalidate
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
              action="${url}/settings/update-email-and-password?_method=PATCH"
              novalidate
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
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
          Flash.set(
            req,
            res,
            html`<div class="flash--rose">Email already taken.</div>`
          );
          return res.redirect(`${url}/settings/update-email-and-password`);
        }

        database.run(
          sql`
            UPDATE "users"
            SET "email" = ${req.body.email},
                "emailConfirmedAt" = ${null}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        sendConfirmationEmail(res.locals.user);
        Flash.set(
          req,
          res,
          html`<div class="flash--green">Email updated successfully.</div>`
        );
      }

      if (
        typeof req.body.currentPassword === "string" &&
        typeof req.body.newPassword === "string"
      ) {
        if (
          req.body.currentPassword.trim() === "" ||
          req.body.newPassword.trim() === "" ||
          req.body.newPassword.length < 8
        )
          return next("validation");
        if (
          !(await argon2.verify(
            res.locals.user.password,
            req.body.currentPassword
          ))
        ) {
          Flash.set(
            req,
            res,
            html`<div class="flash--rose">Incorrect current password.</div>`
          );
          return res.redirect(`${url}/settings/update-email-and-password`);
        }

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
        Flash.set(
          req,
          res,
          html`<div class="flash--green">Password updated successfully.</div>`
        );
      }
      res.redirect(`${url}/settings/update-email-and-password`);
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
              action="${url}/settings/notifications-preferences?_method=PATCH"
              novalidate
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div class="label">
                <p class="label--text">Email Notifications</p>
                <div
                  style="${css`
                    display: flex;
                  `}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="none"
                      required
                      autocomplete="off"
                      $${res.locals.user.emailNotifications === "none"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    None
                  </label>
                </div>
                <div
                  style="${css`
                    display: flex;
                  `}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="staff-announcements-and-mentions"
                      required
                      autocomplete="off"
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
                  style="${css`
                    display: flex;
                  `}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="all-messages"
                      required
                      autocomplete="off"
                      $${res.locals.user.emailNotifications === "all-messages"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    All messages
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

      Flash.set(
        req,
        res,
        html`
          <div class="flash--green">
            Notifications preferences updated successfully.
          </div>
        `
      );

      res.redirect(`${url}/settings/notifications-preferences`);
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

            <form
              method="POST"
              action="${url}/courses"
              novalidate
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
          `,
        })
      );
    }
  );

  app.post<{}, any, { name?: string }, {}, IsSignedInMiddlewareLocals>(
    "/courses",
    ...isSignedInMiddleware,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      const course = database.get<{
        id: number;
        reference: string;
      }>(
        sql`
          INSERT INTO "courses" ("reference", "name", "nextConversationReference")
          VALUES (
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${req.body.name},
            ${1}
          )
          RETURNING *
        `
      )!;
      database.run(
        sql`
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
            ${res.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      res.redirect(`${url}/courses/${course.reference}`);
    }
  );

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
    { search?: string; tag?: string; [otherQueryParameters: string]: unknown },
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
    {
      conversationLayoutSidebarOpenOnSmallScreen?: "true";
      search?: string;
      tag?: string;
    },
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
                style="${css`
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

                <div class="menu-box">
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${url}/courses/${res.locals.course
                            .reference}/settings/invitations"
                          class="menu-box--item button button--blue"
                        >
                          <i class="bi bi-person-plus"></i>
                          Invite Other People to the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${url}/courses/${res.locals.course
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
          body: html`<p class="secondary">No conversation selected.</p>`,
          onlyConversationLayoutSidebarOnSmallScreen: true,
        })
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
      Partial<IsSignedInMiddlewareLocals> {}
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
          res.locals.invitation.email.toLocaleLowerCase() !==
            res.locals.user.email.toLocaleLowerCase())
      )
        return next("route");
      next();
    },
  ];

  const sendInvitationEmail = async (
    invitation: InvitationExistsMiddlewareLocals["invitation"] & {
      email: string;
    }
  ): Promise<nodemailer.SentMessageInfo> => {
    const link = `${url}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    await sendMail({
      to: invitation.email,
      subject: `Enroll in ${invitation.course.name}`,
      html: html`
        <p>
          Enroll in ${invitation.course.name}:<br />
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
                href="${url}/courses/${res.locals.course.reference}/settings"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-sliders"></i>
                Course Settings
              </a>
              <a
                href="${url}/courses/${res.locals.course
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
                href="${url}/courses/${res.locals.course
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
                href="${url}/courses/${res.locals.course
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
                href="${url}/courses/${res.locals.course
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
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...isCourseStaffMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
          req,
          res,
          head: html`
            <title>
              Course Settings · ${res.locals.course.name} · CourseLore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings
            </h2>
            <form
              method="POST"
              action="${url}/courses/${res.locals.course
                .reference}/settings?_method=PATCH"
              novalidate
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
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (typeof req.body.name !== "string" || req.body.name.trim() === "")
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "name" = ${req.body.name}
          WHERE "id" = ${res.locals.course.id}
        `
      );

      Flash.set(
        req,
        res,
        html`
          <div class="flash--green">Course settings updated successfully.</div>
        `
      );

      res.redirect(`${url}/courses/${res.locals.course.reference}/settings`);
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
      res.redirect(
        `${url}/courses/${res.locals.course.reference}/settings/your-enrollment`
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
              action="${url}/courses/${res.locals.course
                .reference}/settings/invitations"
              novalidate
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
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="link"
                      required
                      autocomplete="off"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onchange="${javascript`
                        const emails = this.closest("form").querySelector(".emails");
                        emails.hidden = true;
                        for (const element of emails.querySelectorAll("*"))
                          if (element.disabled !== null) element.disabled = true;
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
                  <span class="secondary">|</span>
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="email"
                      required
                      autocomplete="off"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onchange="${javascript`
                        const emails = this.closest("form").querySelector(".emails");
                        emails.hidden = false;
                        for (const element of emails.querySelectorAll("*"))
                          if (element.disabled !== null) element.disabled = false;
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
                        content: this.nextElementSibling.firstElementChild,
                        trigger: "click",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                  <div hidden>
                    <div
                      style="${css`
                        padding: var(--space--2);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <p>
                        Emails must be separated by commas and/or newlines, and
                        may include names which may be quoted or not, for
                        example:
                      </p>
                      <pre class="pre"><code>${dedent`
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
                  class="input--text input--text--textarea"
                  style="${css`
                    height: var(--space--32);
                  `}"
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
                  style="${css`
                    display: flex;
                    gap: var(--space--4);
                  `}"
                >
                  $${enrollmentRoles
                    .map(
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
                              autocomplete="off"
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span>${lodash.capitalize(role)}</span>
                            <span class="text--blue">
                              ${lodash.capitalize(role)}
                            </span>
                          </label>
                        `
                    )
                    .join(html`<span class="secondary">|</span>`)}
                </div>
              </div>

              <div class="label">
                <p class="label--text">Expiration</p>
                <div
                  style="${css`
                    display: flex;
                  `}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      autocomplete="off"
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
                          content: "Set as Expiring",
                          touch: false,
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
                          content: "Set as Not Expiring",
                          touch: false,
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
                  oninteractive="${javascript`
                    leafac.formatDateTimeInput(this);
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
                      const action = `${url}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                      const isInvitationExpired = isExpired(
                        invitation.expiresAt
                      );
                      const isUsed = invitation.usedAt !== null;

                      return html`
                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--2);
                            /*align-items: baseline;*/
                          `}"
                        >
                          <div>
                            $${invitation.email === null
                              ? html`
                                  <span
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        content: "Invitation Link",
                                        touch: false,
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
                                        content: "Invitation Email",
                                        touch: false,
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-envelope"></i>
                                  </span>
                                `}
                          </div>
                          <div
                            style="${css`
                              flex: 1;
                              display: flex;
                              flex-direction: column;
                              gap: var(--space--2);
                            `}"
                          >
                            $${invitation.email === null
                              ? html`
                                  <div>
                                    <button
                                      id="invitation--${invitation.reference}"
                                      class="button button--tight button--tight--inline button--transparent strong"
                                      oninteractive="${javascript`
                                        this.tooltip = tippy(this, {
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
                                      const link = `${url}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
                                      return html`
                                        <div hidden>
                                          <div
                                            style="${css`
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            $${isInvitationExpired
                                              ? html`
                                                  <p
                                                    class="text--rose"
                                                    style="${css`
                                                      display: flex;
                                                      gap: var(--space--2);
                                                      justify-content: center;
                                                    `}"
                                                  >
                                                    <i
                                                      class="bi bi-calendar-x-fill"
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
                                                class="button button--tight button--transparent"
                                                oninteractive="${javascript`
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
                                  </div>
                                `
                              : html`
                                  <div>
                                    <button
                                      class="button button--tight button--tight--inline button--transparent"
                                      style="${css`
                                        display: flex;
                                        flex-direction: column;
                                        align-items: flex-start;
                                        gap: var(--space--0);
                                      `}"
                                      oninteractive="${javascript`
                                        tippy(this, {
                                          content: this.nextElementSibling.firstElementChild,
                                          trigger: "click",
                                          interactive: true,
                                        });
                                      `}"
                                    >
                                      <div
                                        class="strong"
                                        style="${css`
                                          display: flex;
                                          align-items: baseline;
                                          gap: var(--space--2);
                                        `}"
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
                                    <div hidden>
                                      <div class="dropdown--menu">
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
                                            class="dropdown--menu--item button button--transparent"
                                            $${isUsed
                                              ? html`
                                                  type="button"
                                                  oninteractive="${javascript`
                                                    tippy(this, {
                                                      content: "You may not resend this invitation because it’s used.",
                                                      theme: "rose",
                                                      trigger: "click",
                                                    });
                                                  `}"
                                                `
                                              : isInvitationExpired
                                              ? html`
                                                  type="button"
                                                  oninteractive="${javascript`
                                                    tippy(this, {
                                                      content: "You may not resend this invitation because it’s expired.",
                                                      theme: "rose",
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
                                  </div>
                                `}

                            <div
                              style="${css`
                                display: flex;
                                flex-wrap: wrap;
                                gap: var(--space--2);
                              `}"
                            >
                              <div
                                style="${css`
                                  width: var(--space--24);
                                  display: flex;
                                  justify-content: flex-start;
                                `}"
                              >
                                <button
                                  class="button button--tight button--tight--inline button--transparent"
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      content: "Update Role",
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
                                                          content: "You may not update the role of this invitation because it’s used.",
                                                          theme: "rose",
                                                          trigger: "click",
                                                        });
                                                      `}"
                                                    `
                                                  : isInvitationExpired
                                                  ? html`
                                                      type="button"
                                                      oninteractive="${javascript`
                                                        tippy(this, {
                                                          content: "You may not update the role of this invitation because it’s expired.",
                                                          theme: "rose",
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
                                  justify-content: flex-start;
                                `}"
                              >
                                $${(() => {
                                  const updateExpirationForm = html`
                                    <form
                                      method="POST"
                                      action="${action}?_method=PATCH"
                                      novalidate
                                      class="dropdown--menu"
                                      style="${css`
                                        gap: var(--space--2);
                                      `}"
                                    >
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
                                            leafac.formatDateTimeInput(this);
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
                                            class="button button--tight button--tight--inline text--green"
                                            style="${css`
                                              cursor: default;
                                            `}"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                content: this.nextElementSibling.firstElementChild,
                                                touch: false,
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-check-lg"></i>
                                            Used
                                          </div>
                                          <div hidden>
                                            <div>
                                              Used
                                              <time
                                                oninteractive="${javascript`
                                                  leafac.relativizeDateTimeElement(this);
                                                `}"
                                              >
                                                ${new Date(
                                                  invitation.usedAt!
                                                ).toISOString()}
                                              </time>
                                            </div>
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
                                                content: "Update Expiration",
                                                touch: false,
                                              });
                                              tippy(this, {
                                                content: this.nextElementSibling.firstElementChild,
                                                trigger: "click",
                                                interactive: true,
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-calendar-x-fill"
                                            ></i>
                                            Expired
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
                                              <h3 class="heading">
                                                <i class="bi bi-calendar-x"></i>
                                                <span>
                                                  Expired
                                                  <time
                                                    oninteractive="${javascript`
                                                      leafac.relativizeDateTimeElement(this);
                                                    `}"
                                                  >
                                                    ${new Date(
                                                      invitation.expiresAt!
                                                    ).toISOString()}
                                                  </time>
                                                </span>
                                              </h3>
                                              $${updateExpirationForm}
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
                                            class="button button--tight button--tight--inline button--transparent text--blue"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                content: "Update Expiration",
                                                touch: false,
                                              });
                                              tippy(this, {
                                                content: this.nextElementSibling.firstElementChild,
                                                trigger: "click",
                                                interactive: true,
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-calendar-minus-fill"
                                            ></i>
                                            Doesn’t Expire
                                            <i class="bi bi-chevron-down"></i>
                                          </button>
                                          <div hidden>
                                            <div
                                              style="${css`
                                                padding-top: var(--space--2);
                                                display: flex;
                                                flex-direction: column;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              $${updateExpirationForm}
                                              <hr class="dropdown--separator" />
                                              $${expireForm}
                                            </div>
                                          </div>
                                        </div>
                                      `
                                    : html`
                                        <div>
                                          <button
                                            class="button button--tight button--tight--inline button--transparent text--amber"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                content: "Update Expiration",
                                                touch: false,
                                              });
                                              tippy(this, {
                                                content: this.nextElementSibling.firstElementChild,
                                                trigger: "click",
                                                interactive: true,
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-calendar-plus-fill"
                                            ></i>
                                            Expires
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
                                              <h3 class="heading">
                                                <i
                                                  class="bi bi-calendar-plus"
                                                ></i>
                                                <span>
                                                  Expires
                                                  <time
                                                    oninteractive="${javascript`
                                                      leafac.relativizeDateTimeElement(this);
                                                    `}"
                                                  >
                                                    ${new Date(
                                                      invitation.expiresAt
                                                    ).toISOString()}
                                                  </time>
                                                </span>
                                              </h3>
                                              <hr class="dropdown--separator" />
                                              $${updateExpirationForm}
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
                        </div>
                      `;
                    })}
                  </div>
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
              INSERT INTO "invitations" ("expiresAt", "course", "reference", "role")
              VALUES (
                ${req.body.expiresAt},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${req.body.role}
              )
              RETURNING *
          `
          )!;

          Flash.set(
            req,
            res,
            html`
              <div class="flash--green">
                <div
                  style="${css`
                    display: flex;
                    justify-content: center;
                    align-items: baseline;
                    gap: var(--space--4);
                  `}"
                >
                  Invitation created successfully.
                  <button
                    class="button button--green"
                    onclick="${javascript`
                      const id = "#invitation--${invitation.reference}";
                      window.location.hash = id;
                      const button = document.querySelector(id);
                      button.click();
                      button.tooltip.hide();
                      this.closest(".flash").remove();
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

            sendInvitationEmail({
              ...invitation,
              course: res.locals.course,
            });
          }

          Flash.set(
            req,
            res,
            html`
              <div class="flash--green">Invitations sent successfully.</div>
            `
          );
          break;
      }

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/settings/invitations`
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

        sendInvitationEmail(
          res.locals.invitation as typeof res.locals.invitation & {
            email: string;
          }
        );

        Flash.set(
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
          isExpired(res.locals.invitation.expiresAt) ||
          !enrollmentRoles.includes(req.body.role)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set(
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
          !isDate(req.body.expiresAt) ||
          isExpired(req.body.expiresAt)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set(
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
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set(
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
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set(
          req,
          res,
          html`
            <div class="flash--green">Invitation expired successfully.</div>
          `
        );
      }

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/settings/invitations`
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
      const enrollments = database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userName: string;
        userAvatar: string | null;
        userBiography: string | null;
        reference: string;
        role: EnrollmentRole;
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

            <div class="stripped">
              $${enrollments.map((enrollment) => {
                const action = `${url}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
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
                      gap: var(--space--2);
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
                            alt="${enrollment.userName}"
                            class="avatar avatar--xl"
                          />
                        `}
                    <div
                      style="${css`
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div
                        style="${css`
                          flex: 1;
                          display: flex;
                          flex-direction: column;
                        `}"
                      >
                        <div class="strong">${enrollment.userName}</div>
                        <div class="secondary">${enrollment.userEmail}</div>
                      </div>

                      <div
                        style="${css`
                          display: flex;
                          flex-wrap: wrap;
                          gap: var(--space--2);
                        `}"
                      >
                        <div
                          style="${css`
                            width: var(--space--24);
                            display: flex;
                            justify-content: flex-start;
                          `}"
                        >
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Update Role",
                                touch: false,
                              });
                              tippy(this, {
                                content: this.nextElementSibling.firstElementChild,
                                trigger: "click",
                                interactive: true,
                              });
                            `}"
                          >
                            ${lodash.capitalize(enrollment.role)}
                            <i class="bi bi-chevron-down"></i>
                          </button>
                          <div hidden>
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
                                                      content: "You may not update your own role because you’re the only staff member.",
                                                      theme: "rose",
                                                      trigger: "click",
                                                    });
                                                  `}"
                                                `
                                              : isSelf
                                              ? html`
                                                  type="button"
                                                  oninteractive="${javascript`
                                                    const element = this.nextElementSibling.firstElementChild;
                                                    element.form = this.closest("form");
                                                    tippy(this, {
                                                      content: element,
                                                      theme: "rose",
                                                      trigger: "click",
                                                      interactive: true,
                                                      appendTo: document.body,
                                                    });
                                                  `}"
                                                `
                                              : html``}
                                          >
                                            ${lodash.capitalize(role)}
                                          </button>
                                          $${isSelf
                                            ? html`
                                                <div hidden>
                                                  <div
                                                    class="confirmation"
                                                    style="${css`
                                                      padding: var(--space--2);
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--4);
                                                    `}"
                                                  >
                                                    <p>
                                                      Are you sure you want to
                                                      update your own role to
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
                                                        You may not undo this
                                                        action!
                                                      </strong>
                                                    </p>
                                                    <button
                                                      class="button button--rose"
                                                      onclick="${javascript`
                                                          this.closest(".confirmation").form.submit();
                                                        `}"
                                                    >
                                                      Update My Own Role to
                                                      ${lodash.capitalize(role)}
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
                        </div>

                        <div
                          style="${css`
                            width: var(--space--8);
                            display: flex;
                            justify-content: flex-start;
                          `}"
                        >
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Remove from the Course",
                                theme: "rose",
                                touch: false,
                              });
                              ${
                                isOnlyStaff
                                  ? javascript`
                                      tippy(this, {
                                        content: "You may not remove yourself from the course because you’re the only staff member.",
                                        theme: "rose",
                                        trigger: "click",
                                      });
                                    `
                                  : javascript`
                                      tippy(this, {
                                        content: this.nextElementSibling.firstElementChild,
                                        theme: "rose",
                                        trigger: "click",
                                        interactive: true,
                                      });
                                    `
                              }
                            `}"
                          >
                            <i class="bi bi-person-dash"></i>
                          </button>
                          $${isOnlyStaff
                            ? html``
                            : html`
                                <div hidden>
                                  <form
                                    method="POST"
                                    action="${action}?_method=DELETE"
                                    style="${css`
                                      padding: var(--space--2);
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
                  </div>
                `;
              })}
            </div>
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

        Flash.set(
          req,
          res,
          html`
            <div class="flash--green">Enrollment updated successfully.</div>
          `
        );
      }

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${url}/courses/${res.locals.course.reference}/settings`
          : `${url}/courses/${res.locals.course.reference}/settings/enrollments`
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

      Flash.set(
        req,
        res,
        html`
          <div class="flash--green">
            $${res.locals.managedEnrollment.isSelf
              ? html`You removed yourself`
              : html`Person removed`}
            from the course successfully.
          </div>
        `
      );

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${url}/`
          : `${url}/courses/${res.locals.course.reference}/settings/enrollments`
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
                    <p class="secondary">Organize conversations with tags.</p>
                  </div>
                `
              : html``}

            <form
              method="POST"
              action="${url}/courses/${res.locals.course
                .reference}/settings/tags?_method=PUT"
              novalidate
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
                <div class="tags stripped">
                  $${res.locals.tags.map(
                    (tag, index) => html`
                      <div
                        class="tag"
                        style="${css`
                          display: flex;
                          gap: var(--space--2);
                          align-items: baseline;
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
                        <div class="tag--icon text--teal">
                          <i class="bi bi-tag-fill"></i>
                        </div>
                        <div
                          style="${css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
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
                            style="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--4);
                              row-gap: var(--space--2);
                            `}"
                          >
                            <div
                              style="${css`
                                width: var(--space--40);
                              `}"
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
                                      content: "Set as Visible by Staff Only",
                                      touch: false,
                                    });
                                  `}"
                                >
                                  <i class="bi bi-eye"></i>
                                  Visible by Everyone
                                </span>
                                <span
                                  class="text--orange"
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      content: "Set as Visible by Everyone",
                                      touch: false,
                                    });
                                  `}"
                                >
                                  <i class="bi bi-eye-slash-fill"></i>
                                  Visible by Staff Only
                                </span>
                              </label>
                            </div>
                            <div
                              style="${css`
                                .tag.deleted & {
                                  display: none;
                                }
                              `}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: "Remove Tag",
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
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: "Don’t Remove Tag",
                                    touch: false,
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
                                    href="${url}/courses/${res.locals.course
                                      .reference}?${qs.stringify({
                                      tag: tag.reference,
                                    })}"
                                    class="button button--tight button--tight--inline button--transparent"
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        content: "See Conversations with This Tag",
                                        touch: false,
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
                  style="${css`
                    display: flex;
                    justify-content: center;
                  `}"
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
                      const newTag = this.nextElementSibling.firstElementChild.cloneNode(true);
                      this.closest("form").querySelector(".tags").insertAdjacentElement("beforeend", newTag);
                      leafac.evaluateElementsAttribute(newTag, "onmount");
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
                        align-items: baseline;
                      `}"
                    >
                      <div class="text--teal">
                        <i class="bi bi-tag-fill"></i>
                      </div>
                      <div
                        style="${css`
                          flex: 1;
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
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
                          style="${css`
                            display: flex;
                            flex-wrap: wrap;
                            column-gap: var(--space--4);
                            row-gap: var(--space--2);
                          `}"
                        >
                          <div
                            style="${css`
                              width: var(--space--40);
                            `}"
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
                                    content: "Set as Visible by Staff Only",
                                    touch: false,
                                  });
                                `}"
                              >
                                <i class="bi bi-eye"></i>
                                Visible by Everyone
                              </span>
                              <span
                                class="text--orange"
                                onmount="${javascript`
                                  tippy(this, {
                                    content: "Set as Visible by Everyone",
                                    touch: false,
                                  });
                                `}"
                              >
                                <i class="bi bi-eye-slash-fill"></i>
                                Visible by Staff Only
                              </span>
                            </label>
                          </div>
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            onmount="${javascript`
                              tippy(this, {
                                content: "Remove Tag",
                                theme: "rose",
                                touch: false,
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
                  </div>
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
              INSERT INTO "tags" ("course", "reference", "name", "staffOnlyAt")
              VALUES (
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
        // FIXME: Don’t update ‘staffOnlyAt’ unless necessary.
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

      Flash.set(
        req,
        res,
        html`<div class="flash--green">Tags updated successfully.</div>`
      );

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/settings/tags`
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
              action="${url}/courses/${res.locals.course
                .reference}/settings/your-enrollment?_method=PATCH"
              novalidate
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
                    class="button button--tight button--tight--inline button--transparent"
                    oninteractive="${javascript`
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
                    margin-top: var(--space--1);
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  $${enrollmentAccentColors.map(
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

      Flash.set(
        req,
        res,
        html` <div class="flash--green">Enrollment updated successfully.</div> `
      );

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/settings/your-enrollment`
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
            <p>
              You tried to use an invitation for ${res.locals.course.name} but
              you’re already enrolled.
            </p>
            <p>
              If you wish to share this invitation with other people, you may
              ask them to point their phone camera at the following QR Code:
            </p>
            $${(
              await QRCode.toString(
                `${url}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`,
                { type: "svg" }
              )
            )
              .replace("#000000", "currentColor")
              .replace("#ffffff", "transparent")}
            <a
              href="${url}/courses/${res.locals.course.reference}"
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
            <p class="strong">
              Welcome to ${res.locals.invitation.course.name}!
            </p>
            <form
              method="POST"
              action="${url}/courses/${res.locals.invitation.course
                .reference}/invitations/${res.locals.invitation.reference}"
            >
              <button
                class="button button--blue"
                style="${css`
                  width: 100%;
                `}"
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
          INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
          VALUES (
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

      res.redirect(`${url}/courses/${res.locals.invitation.course.reference}`);
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
            <p class="strong">
              Welcome to ${res.locals.invitation.course.name}!
            </p>
            <div
              style="${css`
                display: flex;
                gap: var(--space--4);
                & > * {
                  flex: 1;
                }
              `}"
            >
              <a
                href="${url}/sign-up?${qs.stringify({
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
              >
                <i class="bi bi-person-plus"></i>
                Sign up
              </a>
              <a
                href="${url}/sign-in?${qs.stringify({
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

  const conversationLayout = ({
    req,
    res,
    head,
    body,
    onlyConversationLayoutSidebarOnSmallScreen = false,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference?: string },
      HTML,
      {},
      {
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
    onlyConversationLayoutSidebarOnSmallScreen?: boolean;
  }): HTML => {
    const search =
      req.query.search === "string"
        ? sanitizeSearch(req.query.search)
        : undefined;

    const tagFilter =
      typeof req.query.tag === "string"
        ? res.locals.tags.find((tag) => tag.reference === req.query.tag)
        : undefined;

    const conversations = database
      .all<{
        reference: string;
      }>(
        sql`
          SELECT "conversations"."reference"
                  $${
                    search === undefined
                      ? sql``
                      : sql`
                          ,
                          "usersSearchResult"."highlight" AS "usersSearchResultHighlight",
                          "conversationsSearchResult"."highlight" AS "conversationsSearchResultHighlight",
                          "messagesSearchResult"."snippet" AS "messagesSearchResultSnippet"
                        `
                  }
          FROM "conversations"
          $${
            search === undefined
              ? sql``
              : sql`
                LEFT JOIN (
                  SELECT "messages"."conversation" AS "conversationId",
                         "usersSearch"."rank" AS "rank",
                         highlight("usersSearch", -1, '<span class="search-result-highlight">', '</span>') AS "highlight"
                  FROM "usersSearch"
                  JOIN "users" ON "usersSearch"."rowid" = "users"."id"
                  JOIN "enrollments" ON "users"."id" = "enrollments"."user"
                  JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment"
                  WHERE "usersSearch" MATCH ${search}
                ) AS "usersSearchResult" ON "conversations"."id" = "usersSearchResult"."conversationId"

                LEFT JOIN (
                  SELECT "rowid",
                         "rank",
                         highlight("conversationsSearch", -1, '<span class="search-result-highlight">', '</span>') AS "highlight"
                  FROM "conversationsSearch"
                  WHERE "conversationsSearch" MATCH ${search}
                ) AS "conversationsSearchResult" ON "conversations"."id" = "conversationsSearchResult"."rowid"

                LEFT JOIN (
                  SELECT "messages"."conversation" AS "conversationId",
                         "messagesSearch"."rank" AS "rank",
                         snippet("messagesSearch", -1, '<span class="search-result-highlight">', '</span>', '…', 10) AS "snippet"
                  FROM "messagesSearch"
                  JOIN "messages" ON "messagesSearch"."rowid" = "messages"."id"
                  WHERE "messagesSearch" MATCH ${search}
                ) AS "messagesSearchResult" ON "conversations"."id" = "messagesSearchResult"."conversationId"
              `
          }
          $${
            tagFilter === undefined
              ? sql``
              : sql`
                  JOIN "taggings" ON "conversations"."id" = "taggings"."conversation" AND
                                     "taggings"."tag" = ${tagFilter.id}
                `
          }
          WHERE "conversations"."course" = ${res.locals.course.id}
          $${
            search === undefined
              ? sql``
              : sql`
                AND (
                  "conversationsSearchResult"."rank" IS NOT NULL OR
                  "messagesSearchResult"."rank" IS NOT NULL
                )
              `
          }
          GROUP BY "conversations"."id"
          ORDER BY "conversations"."pinnedAt" IS NOT NULL DESC,
                    $${
                      search === undefined
                        ? sql``
                        : sql`
                          min(coalesce("conversationsSearchResult"."rank", 0), coalesce(min("messagesSearchResult"."rank"), 0)) ASC,
                        `
                    }
                    "conversations"."id" DESC
        `
      )
      // FIXME: Try to get rid of these n+1 queries.
      .flatMap((conversationRow) => {
        const conversation = getConversation(
          req,
          res,
          conversationRow.reference
        );
        if (conversation === undefined) return [];
        return [
          {
            ...conversationRow,
            ...conversation,
          },
        ];
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
                style="${css`
                  justify-content: center;
                  @media (min-width: 900px) {
                    display: none;
                  }
                `}"
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
          style="${css`
            width: 100%;
            height: 100%;
            display: flex;
            & > * {
              overflow: auto;
              & > * {
                margin: var(--space--4);
                & > * {
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                }
              }
            }
            @media (max-width: 899px) {
              & > * {
                flex: 1;
                & > * {
                  display: flex;
                  justify-content: center;
                  & > * {
                    flex: 1;
                    min-width: var(--width--0);
                    max-width: var(--width--prose);
                  }
                }
              }
              & > .hidden-on-small-screen {
                display: none;
              }
            }
          `}"
        >
          <div
            class="conversation--layout--sidebar ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? ""
              : "hidden-on-small-screen"}"
            style="${css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
                border-right: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              }
            `}"
          >
            <div>
              <div>
                <div
                  style="${css`
                    display: flex;
                    justify-content: center;
                  `}"
                >
                  <a
                    href="${url}/courses/${res.locals.course
                      .reference}/conversations/new?${qs.stringify({
                      search: req.query.search,
                      tag: req.query.tag,
                    })}"
                    class="button button--transparent"
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
                    novalidate
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                      align-items: center;
                    `}"
                  >
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
                      class="input--text"
                      data-skip-is-modified="true"
                    />
                    $${req.query.search !== undefined
                      ? html`
                          <a
                            href="?${qs.stringify({
                              conversationLayoutSidebarOpenOnSmallScreen:
                                "true",
                              search: undefined,
                              tag: req.query.tag,
                            })}"
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
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
                      class="button button--tight button--tight--inline button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          content: "Search",
                          touch: false,
                        });
                      `}"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                  </form>

                  $${res.locals.tags.length > 0
                    ? html`
                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--3);
                          `}"
                        >
                          <div>
                            <button
                              class="button button--tight button--tight--inline button--tight-gap button--transparent"
                              oninteractive="${javascript`
                                tippy(this, {
                                  content: this.nextElementSibling.firstElementChild,
                                  trigger: "click",
                                  interactive: true,
                                });
                              `}"
                            >
                              $${tagFilter === undefined
                                ? html`
                                    <i class="bi bi-tag"></i>
                                    Filter by Tag
                                  `
                                : html`
                                    <i class="bi bi-tag-fill"></i>
                                    Filtering by
                                    <i class="bi bi-tag"></i>
                                    ${tagFilter.name}
                                  `}
                            </button>
                            <div hidden>
                              <div
                                class="dropdown--menu"
                                style="${css`
                                  max-height: var(--space--40);
                                  overflow: auto;
                                `}"
                              >
                                $${res.locals.tags.map((tag) => {
                                  const isTagFilter = tag.id === tagFilter?.id;
                                  return html`
                                    <a
                                      href="?${qs.stringify({
                                        conversationLayoutSidebarOpenOnSmallScreen:
                                          "true",
                                        search: req.query.search,
                                        tag: isTagFilter
                                          ? undefined
                                          : tag.reference,
                                      })}"
                                      class="dropdown--menu--item button ${isTagFilter
                                        ? "button--blue"
                                        : "button--transparent"}"
                                    >
                                      <i class="bi bi-tag"></i>
                                      ${tag.name}
                                    </a>
                                  `;
                                })}
                              </div>
                            </div>
                          </div>
                          $${tagFilter === undefined
                            ? html``
                            : html`
                                <a
                                  href="?${qs.stringify({
                                    conversationLayoutSidebarOpenOnSmallScreen:
                                      "true",
                                    search: req.query.search,
                                    tag: undefined,
                                  })}"
                                  class="button button--tight button--tight--inline button--transparent"
                                  oninteractive="${javascript`
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

                $${conversations.length === 0
                  ? html`
                      <div
                        style="${css`
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                        `}"
                      >
                        <div class="decorative-icon">
                          <i class="bi bi-chat-left-text"></i>
                        </div>
                        <p class="secondary">No conversation found.</p>
                      </div>
                    `
                  : html`
                      <div>
                        $${conversations.map((conversation) => {
                          const isSelected =
                            conversation.id === res.locals.conversation?.id;
                          return html`
                            <hr
                              class="separator"
                              style="${css`
                                margin: var(--space---px) var(--space--0);
                              `}"
                            />
                            <a
                              href="${url}/courses/${res.locals.course
                                .reference}/conversations/${conversation.reference}?${qs.stringify(
                                {
                                  search: req.query.search,
                                  tag: req.query.tag,
                                }
                              )}"
                              class="button ${isSelected
                                ? "button--blue"
                                : "button--transparent"}"
                              style="${css`
                                width: calc(
                                  var(--space--2) + 100% + var(--space--2)
                                );
                                padding: var(--space--2);
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
                              `}"
                              $${isSelected
                                ? html`
                                    oninteractive="${javascript`
                                      this.scrollIntoView({ block: "center" });
                                    `}"
                                  `
                                : html``}
                            >
                              <div
                                style="${css`
                                  flex: 1;
                                `}"
                              >
                                <h3
                                  style="${css`
                                    font-weight: var(--font-weight--bold);
                                  `}"
                                >
                                  ${conversation.title}
                                </h3>
                                <div
                                  style="${css`
                                    font-size: var(--font-size--xs);
                                    line-height: var(--line-height--xs);
                                  `}"
                                >
                                  <div>
                                    #${conversation.reference} created
                                    <time
                                      oninteractive="${javascript`
                                        leafac.relativizeDateTimeElement(this);
                                      `}"
                                    >
                                      ${conversation.createdAt}
                                    </time>
                                    by
                                    $${conversation.anonymousAt === null ||
                                    res.locals.enrollment.role === "staff" ||
                                    conversation.authorEnrollment.id ===
                                      res.locals.enrollment.id
                                      ? html`
                                          $${conversation.authorEnrollment.user
                                            .avatar === null
                                            ? html`
                                                <i
                                                  class="bi bi-person-circle"
                                                ></i>
                                              `
                                            : html`
                                                <img
                                                  src="${conversation
                                                    .authorEnrollment.user
                                                    .avatar}"
                                                  alt="${conversation
                                                    .authorEnrollment.user
                                                    .name}"
                                                  class="avatar avatar--xs avatar--vertical-align"
                                                />
                                              `}
                                          ${conversation.authorEnrollment.user
                                            .name}
                                        `
                                      : html``}
                                    $${conversation.anonymousAt === null
                                      ? html``
                                      : res.locals.enrollment.role ===
                                          "staff" ||
                                        conversation.authorEnrollment.id ===
                                          res.locals.enrollment.id
                                      ? html`
                                          <span
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                content: "Anonymous to other students.",
                                                touch: false,
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-sunglasses"></i>
                                          </span>
                                        `
                                      : html`
                                          <i class="bi bi-sunglasses"></i>
                                          Anonymous
                                        `}
                                  </div>
                                  $${conversation.updatedAt !== null
                                    ? html`
                                        <div>
                                          and last updated
                                          <time
                                            oninteractive="${javascript`
                                              leafac.relativizeDateTimeElement(this);
                                            `}"
                                          >
                                            ${conversation.updatedAt}
                                          </time>
                                        </div>
                                      `
                                    : html``}
                                  <div
                                    style="${css`
                                      & > * {
                                        display: flex;
                                        flex-wrap: wrap;
                                        column-gap: var(--space--4);
                                        row-gap: var(--space--0-5);

                                        & > * {
                                          display: flex;
                                          gap: var(--space--1);
                                        }
                                      }
                                    `}"
                                  >
                                    $${conversation.taggings.length === 0
                                      ? html``
                                      : html`
                                          <div>
                                            $${conversation.taggings.map(
                                              (tagging) => html`
                                                <div class="text--teal">
                                                  <i class="bi bi-tag-fill"></i>
                                                  ${tagging.tag.name}
                                                </div>
                                              `
                                            )}
                                          </div>
                                        `}
                                    <div>
                                      $${conversation.pinnedAt !== null
                                        ? html`
                                            <div class="text--amber">
                                              <i class="bi bi-pin-fill"></i>
                                              Pinned
                                            </div>
                                          `
                                        : html``}
                                      $${conversation.staffOnlyAt !== null
                                        ? html`
                                            <div>
                                              <i class="bi bi-eye-slash"></i>
                                              Visible by Staff Only
                                            </div>
                                          `
                                        : html``}
                                      <div
                                        class="${conversationTypeTextColor[
                                          conversation.type
                                        ].display}"
                                      >
                                        $${conversationTypeIcon[
                                          conversation.type
                                        ].fill}
                                        ${lodash.capitalize(conversation.type)}
                                      </div>
                                      <div>
                                        <i class="bi bi-chat-left-text"></i>
                                        ${conversation.messagesCount}
                                        Message${conversation.messagesCount ===
                                        1
                                          ? ""
                                          : "s"}
                                      </div>
                                      $${conversation.endorsements.length === 0
                                        ? html``
                                        : html`
                                            <div
                                              class="text--green"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  content: ${JSON.stringify(
                                                    `Endorsed by ${
                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                        Intl as any
                                                      ).ListFormat("en").format(
                                                        conversation.endorsements.map(
                                                          (endorsement) =>
                                                            endorsement
                                                              .enrollment.user
                                                              .name
                                                        )
                                                      )
                                                    }`
                                                  )},
                                                  touch: false,
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-award"></i>
                                              ${conversation.endorsements
                                                .length}
                                              Staff
                                              Endorsement${conversation
                                                .endorsements.length === 1
                                                ? ""
                                                : "s"}
                                            </div>
                                          `}
                                      $${conversation.likesCount === 0
                                        ? html``
                                        : html`
                                            <div>
                                              <i
                                                class="bi bi-hand-thumbs-up"
                                              ></i>
                                              ${conversation.likesCount}
                                              Like${conversation.likesCount ===
                                              1
                                                ? ""
                                                : "s"}
                                            </div>
                                          `}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                style="${css`
                                  width: var(--space--4);
                                  display: flex;
                                  justify-content: flex-end;
                                `}"
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
                                          class="button button--tight button--blue"
                                          style="${css`
                                            font-size: var(--font-size--2xs);
                                            line-height: var(
                                              --line-height--2xs
                                            );
                                          `}"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              content: "Unread Messages",
                                              touch: false,
                                            });
                                          `}"
                                        >
                                          ${unreadCount}
                                        </button>
                                      `;
                                })()}
                              </div>
                            </a>
                          `;
                        })}
                      </div>
                    `}
              </div>
            </div>
          </div>
          <div
            class="conversation--layout--main ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? "hidden-on-small-screen"
              : ""}"
            style="${css`
              @media (min-width: 900px) {
                flex: 1;
              }
            `}"
          >
            <div>
              <div
                style="${css`
                  @media (min-width: 900px) {
                    max-width: var(--width--prose);
                    margin-left: var(--space--4);
                  }
                `}"
              >
                $${body}
              </div>
            </div>
          </div>
        </div>
      `,
    });
  };

  const getConversation = (
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>,
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>,
    conversationReference: string
  ):
    | {
        id: number;
        reference: string;
        title: string;
        nextMessageReference: number;
        type: ConversationType;
        pinnedAt: string | null;
        staffOnlyAt: string | null;
        createdAt: string;
        anonymousAt: string | null;
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
              role: EnrollmentRole;
            }
          | NoLongerEnrolledEnrollment;
        updatedAt: string | null;
        messagesCount: number;
        readingsCount: number;
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
                role: EnrollmentRole;
              }
            | NoLongerEnrolledEnrollment;
        }[];
        likesCount: number;
        taggings: {
          id: number;
          tag: {
            id: number;
            reference: string;
            name: string;
            staffOnlyAt: string | null;
          };
        }[];
      }
    | undefined => {
    const conversation = database.get<{
      id: number;
      reference: string;
      title: string;
      nextMessageReference: number;
      type: ConversationType;
      pinnedAt: string | null;
      staffOnlyAt: string | null;
    }>(
      sql`
        SELECT "conversations"."id",
                "conversations"."reference",
                "conversations"."title",
                "conversations"."nextMessageReference",
                "conversations"."type",
                "conversations"."pinnedAt",
                "conversations"."staffOnlyAt"
        FROM "conversations"
        WHERE "conversations"."course" = ${res.locals.course.id} AND
              "conversations"."reference" = ${conversationReference}
              $${
                res.locals.enrollment.role !== "staff"
                  ? sql`
                      AND "conversations"."staffOnlyAt" IS NULL
                    `
                  : sql``
              }
      `
    );
    if (conversation === undefined) return undefined;

    const originalMessage = database.get<{
      id: number;
      createdAt: string;
      anonymousAt: string | null;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserBiography: string | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentRole: EnrollmentRole | null;
    }>(
      sql`
        SELECT "messages"."id",
               "messages"."createdAt",
               "messages"."anonymousAt",
               "authorEnrollment"."id" AS "authorEnrollmentId",
               "authorUser"."id" AS "authorUserId",
               "authorUser"."email" AS "authorUserEmail",
               "authorUser"."name" AS "authorUserName",
               "authorUser"."avatar" AS "authorUserAvatar",
               "authorUser"."biography" AS "authorUserBiography",
               "authorEnrollment"."reference" AS "authorEnrollmentReference",
               "authorEnrollment"."role" AS "authorEnrollmentRole"
        FROM "messages"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        WHERE "messages"."conversation" = ${conversation.id} AND
              "messages"."reference" = ${"1"}
      `
    )!;

    const mostRecentlyUpdatedMessage = database.get<{
      updatedAt: string;
    }>(
      sql`
        SELECT coalesce("messages"."updatedAt", "messages"."createdAt") AS "updatedAt"
        FROM "messages"
        WHERE "messages"."conversation" = ${conversation.id}
        ORDER BY datetime(coalesce("messages"."updatedAt", "messages"."createdAt")) DESC
        LIMIT 1
      `
    )!;

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
        ? database.all<{
            id: number;
            enrollmentId: number | null;
            userId: number | null;
            userEmail: string | null;
            userName: string | null;
            userAvatar: string | null;
            userBiography: string | null;
            enrollmentReference: string | null;
            enrollmentRole: EnrollmentRole | null;
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
              JOIN "messages" ON "endorsements"."message" = "messages"."id" AND
                                 "messages"."conversation" = ${conversation.id}
              ORDER BY "endorsements"."id" ASC
            `
          )
        : [];

    const likesCount = database.get<{ likesCount: number }>(
      sql`
        SELECT COUNT(*) AS "likesCount"
        FROM "likes"
        WHERE "message" = ${originalMessage.id}
      `
    )!.likesCount;

    const taggings = database.all<{
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
    );

    return {
      id: conversation.id,
      reference: conversation.reference,
      title: conversation.title,
      nextMessageReference: conversation.nextMessageReference,
      type: conversation.type,
      pinnedAt: conversation.pinnedAt,
      staffOnlyAt: conversation.staffOnlyAt,
      createdAt: originalMessage.createdAt,
      anonymousAt: originalMessage.anonymousAt,
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
          : noLongerEnrolledEnrollment,
      updatedAt:
        mostRecentlyUpdatedMessage.updatedAt === originalMessage.createdAt
          ? null
          : mostRecentlyUpdatedMessage.updatedAt,
      messagesCount,
      readingsCount,
      endorsements: endorsements.map((endorsement) => ({
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
            : noLongerEnrolledEnrollment,
      })),
      likesCount,
      taggings: taggings.map((tagging) => ({
        id: tagging.id,
        tag: {
          id: tagging.tagId,
          reference: tagging.tagReference,
          name: tagging.tagName,
          staffOnlyAt: tagging.tagStaffOnlyAt,
        },
      })),
    };
  };

  const markdownEditor = ({
    req,
    res,
    name = "content",
    value = "",
    required = true,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      Partial<IsEnrolledInCourseMiddlewareLocals>
    >;
    res: express.Response<any, Partial<IsEnrolledInCourseMiddlewareLocals>>;
    name?: string;
    value?: string;
    required?: boolean;
  }): HTML => html`
    <div class="markdown-editor">
      <div
        style="${css`
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
        `}"
      >
        <label>
          <input
            type="radio"
            name="markdown-editor--mode"
            autocomplete="off"
            checked
            data-skip-is-modified="true"
            class="markdown-editor--button--write visually-hidden"
            onclick="${javascript`
              this.closest(".markdown-editor").querySelector(".markdown-editor--write").hidden = false;
              this.closest(".markdown-editor").querySelector(".markdown-editor--loading").hidden = true;
              this.closest(".markdown-editor").querySelector(".markdown-editor--preview").hidden = true;
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
            name="markdown-editor--mode"
            autocomplete="off"
            data-skip-is-modified="true"
            class="markdown-editor--button--preview visually-hidden"
            onclick="${javascript`
              (async () => {
                const write = this.closest(".markdown-editor").querySelector(".markdown-editor--write");
                const loading = this.closest(".markdown-editor").querySelector(".markdown-editor--loading");
                const preview = this.closest(".markdown-editor").querySelector(".markdown-editor--preview");
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
                preview.innerHTML = await (
                  await fetch("${url}${
              res.locals.course === undefined
                ? ""
                : `/courses/${res.locals.course.reference}`
            }/markdown-editor/preview", {
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
            oninteractive="${javascript`
              Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+p", () => { this.click(); return false; });
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
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--800);
          }
          border-radius: var(--border-radius--lg);
        `}"
      >
        <div class="markdown-editor--write">
          <div
            style="${css`
              padding: var(--space--1) var(--space--0);
              margin: var(--space--0) var(--space--3);
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+1", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+2", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+3", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+b", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+i", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+k", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+8", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+7", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+9", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+'", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+t", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+d", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+e", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+e", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+e", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+alt+shift+e", () => { this.click(); return false; });
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
                  const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                          content: ${JSON.stringify(html`
                            Mention User
                            <span class="keyboard-shortcut">(@)</span>
                          `)},
                          touch: false,
                          allowHTML: true,
                        }); 
                      `}"
                      onclick="${javascript`
                        const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                          content: ${JSON.stringify(html`
                            Refer to Conversation or Message
                            <span class="keyboard-shortcut">(#)</span>
                          `)},
                          touch: false,
                          allowHTML: true,
                        });
                      `}"
                      onclick="${javascript`
                        const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
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
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+i", () => { this.click(); return false; });
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
                  this.closest(".markdown-editor").querySelector(".attachments").click();
                `}"
              >
                <i class="bi bi-image"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                oninteractive="${javascript`
                  Mousetrap(this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea")).bind("mod+shift+k", () => { this.click(); return false; });
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
                  this.closest(".markdown-editor").querySelector(".attachments").click();
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
                  this.upload = async (fileList) => {
                    const element = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea");
                    // TODO: Give some visual indication of progress.
                    element.disabled = true;
                    const body = new FormData();
                    for (const file of fileList) body.append("attachments", file);
                    const response = await (await fetch("${url}/markdown-editor/attachments", {
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
                class="button button--tight button--transparent"
                oninteractive="${javascript`
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
                </div>
              </div>
            </div>
          </div>
          <div
            style="${css`
              position: relative;
            `}"
          >
            <div
              class="markdown-editor--write--textarea--dropdown-menu-target"
              style="${css`
                width: var(--space--0);
                height: var(--line-height--sm);
                position: absolute;
              `}"
            ></div>
            <textarea
              name="${name}"
              $${required ? html`required` : html``}
              class="markdown-editor--write--textarea input--text input--text--textarea"
              style="${css`
                height: var(--space--20);
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
              `}"
              $${res.locals.course !== undefined
                ? html`
                    oninteractive="${javascript`
                      const dropdownMenuTarget = this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea--dropdown-menu-target");
                      const dropdownMenu = tippy(dropdownMenuTarget, {
                        content: this.closest(".markdown-editor").querySelector(".markdown-editor--mention-user"),
                        placement: "bottom-start",
                        trigger: "manual",
                        interactive: true,
                      });
                      let anchorIndex = null;

                      this.addEventListener("input", (() => {
                        let isSearching = false;
                        let shouldSearchAgain = false;
                        return async function search() {
                          const selectionMin = Math.min(this.selectionStart, this.selectionEnd);
                          const selectionMax = Math.max(this.selectionStart, this.selectionEnd);
                          if (!dropdownMenu.state.isShown) {
                            anchorIndex = selectionMin - 1;
                            if (this.value[anchorIndex] !== "@" || (anchorIndex > 0 && this.value[anchorIndex - 1].match(/[\\w@]/) !== null)) return;
                            const caretCoordinates = getCaretCoordinates(this, anchorIndex);
                            dropdownMenuTarget.style.top = String(caretCoordinates.top) + "px";
                            dropdownMenuTarget.style.left = String(caretCoordinates.left) + "px";
                            dropdownMenu.show();
                          }
                          if (selectionMin <= anchorIndex || this.value[anchorIndex] !== "@") {
                            dropdownMenu.hide();
                            return;
                          }
                          if (isSearching) {
                            shouldSearchAgain = true;
                            return;
                          }
                          shouldSearchAgain = false;
                          isSearching = true;
                          const name = this.value.slice(anchorIndex + 1, selectionMax);
                          this.closest(".markdown-editor").querySelector(".markdown-editor--mention-user--search-results").innerHTML =
                            name.trim() === ""
                            ? ""
                            : await (await fetch("${url}/courses/${res.locals.course.reference}/markdown-editor/mention-user-search?" + new URLSearchParams({ name }))).text();
                          const buttons = this.closest(".markdown-editor").querySelectorAll(".markdown-editor--mention-user .button");
                          for (const button of buttons) button.classList.remove("hover");
                          buttons[0].classList.add("hover");
                          isSearching = false;
                          if (shouldSearchAgain) search();
                        }
                      })());

                      this.addEventListener("keydown", (event) => {
                        if (!dropdownMenu.state.isShown) return;
                        switch (event.code) {
                          case "ArrowUp":
                          case "ArrowDown":
                            event.preventDefault();
                            const buttonsContainer = this.closest(".markdown-editor").querySelector(".markdown-editor--mention-user");
                            const buttons = [...buttonsContainer.querySelectorAll(".button")];
                            const currentHoverIndex = buttons.indexOf(buttonsContainer.querySelector(".button.hover"));
                            if (
                              currentHoverIndex === -1 ||
                              (event.code === "ArrowUp" && currentHoverIndex === 0) ||
                              (event.code === "ArrowDown" && currentHoverIndex === buttons.length - 1)
                            ) return;
                            buttons[currentHoverIndex].classList.remove("hover");
                            const buttonToHover = buttons[currentHoverIndex + (event.code === "ArrowUp" ? -1 : 1)];
                            buttonToHover.classList.add("hover");
                            scrollIntoView(buttonToHover, { scrollMode: "if-needed" });
                            break;

                          case "Enter":
                          case "Tab":
                            event.preventDefault();
                            this.closest(".markdown-editor").querySelector(".markdown-editor--mention-user .button.hover").click();
                            break;

                          case "Escape":
                          case "ArrowLeft":
                          case "ArrowRight":
                          case "Home":
                          case "End":
                            dropdownMenu.hide();
                            break;
                        }
                      });

                      this.mentionUser = (user) => {
                        this.setSelectionRange(anchorIndex + 1, Math.max(this.selectionStart, this.selectionEnd));
                        textFieldEdit.insert(this, user + " ");
                        dropdownMenu.hide();
                        this.focus();
                      };
                    `}"
                  `
                : html``}
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
                this.closest(".markdown-editor").querySelector(".attachments").upload(event.dataTransfer.files);
              `}"
              ondragleave="${javascript`
                this.classList.remove("drag");
              `}"
              onpaste="${javascript`
                if (event.clipboardData.files.length === 0) return;
                event.preventDefault();
                this.closest(".markdown-editor").querySelector(".attachments").upload(event.clipboardData.files);
              `}"
            >
${value}</textarea
            >
            $${res.locals.course !== undefined
              ? html`
                  <div hidden>
                    <div
                      class="markdown-editor--mention-user"
                      style="${css`
                        width: var(--space--56);
                        max-height: var(--space--44);
                        overflow: auto;
                      `}"
                    >
                      <p class="heading">
                        <i class="bi bi-at"></i>
                        Mention User
                      </p>
                      <div class="dropdown--menu">
                        <div
                          class="markdown-editor--mention-user--search-results"
                        ></div>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          onclick="${javascript`
                            this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea").mentionUser("all");
                          `}"
                        >
                          Everyone in the Conversation
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          onclick="${javascript`
                            this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea").mentionUser("staff");
                          `}"
                        >
                          Staff in the Conversation
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          onclick="${javascript`
                            this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea").mentionUser("students");
                          `}"
                        >
                          Students in the Conversation
                        </button>
                      </div>
                    </div>
                  </div>
                `
              : html``}
          </div>
        </div>

        <div
          hidden
          class="markdown-editor--loading strong"
          style="${css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: var(--space--2);
          `}"
        >
          $${spinner} Loading…
        </div>

        <div
          hidden
          class="markdown-editor--preview"
          style="${css`
            padding: var(--space--4);
          `}"
        ></div>
      </div>
    </div>
  `;

  app.get<
    { courseReference: string },
    any,
    {},
    { name?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/markdown-editor/mention-user-search",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (typeof req.query.name !== "string" || req.query.name.trim() === "")
        return next("validation");

      const users = database.all<{
        name: string;
        nameSearch: string;
        avatar: string | null;
        enrollmentReference: string;
        enrollmentRole: string;
      }>(
        sql`
          SELECT "users"."name" AS "name",
                 "users"."nameSearch" AS "nameSearch",
                 "users"."avatar" AS "avatar",
                 "enrollments"."reference" AS "enrollmentReference",
                 "enrollments"."role" AS "enrollmentRole"
          FROM "users"
          JOIN "usersSearch" ON "users"."id" = "usersSearch"."rowid" AND
                                "usersSearch" MATCH ${sanitizeSearch(
                                  req.query.name,
                                  { prefix: true }
                                )}
          JOIN "enrollments" ON "users"."id" = "enrollments"."user" AND
                                "enrollments"."course" = ${res.locals.course.id}
          WHERE "users"."id" != ${res.locals.user.id}
          ORDER BY "usersSearch"."rank" ASC,
                   "users"."name" ASC
        `
      );

      res.send(
        html`
          $${users.length === 0
            ? html`
                <div class="dropdown--menu--item secondary">No user found.</div>
              `
            : users.map(
                (user) => html`
                  <button
                    type="button"
                    class="dropdown--menu--item button button--transparent"
                    onclick="${javascript`
                      this.closest(".markdown-editor").querySelector(".markdown-editor--write--textarea").mentionUser("${
                        user.enrollmentReference
                      }--${slugify(user.name)}");
                    `}"
                  >
                    $${user.avatar === null
                      ? html`<i class="bi bi-person-circle"></i>`
                      : html`
                          <img
                            src="${user.avatar}"
                            alt="${user.name}"
                            class="avatar avatar--sm avatar--vertical-align"
                          />
                        `}
                    <span>
                      $${highlightSearchResult(
                        user.nameSearch,
                        req.query.name!
                      )}
                      <span class="secondary">
                        · ${lodash.capitalize(user.enrollmentRole)}
                      </span>
                    </span>
                  </button>
                `
              )}
        `
      );
    }
  );

  // TODO: https://github.com/sindresorhus/filenamify
  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/markdown-editor/attachments",
    ...isSignedInMiddleware,
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
        await attachment.mv(path.join(dataDirectory, relativePath));
        // TODO: URI encode relative path.
        const href = `${url}/${relativePath}`;
        if (attachment.mimetype.startsWith("image/")) {
          // TODO: Handle error on sharp constructor: https://sharp.pixelplumbing.com/api-constructor / https://sharp.pixelplumbing.com/api-input
          const metadata = await sharp(attachment.data).metadata();
          if (metadata.width !== undefined && metadata.density !== undefined) {
            // TODO: Resize big images.
            attachmentsMarkdowns.push(
              markdown`<img src="${href}" alt="${attachment.name}" width="${
                metadata.density < 100 ? metadata.width / 2 : metadata.width
              }" />`
            );
            continue;
          }
        }
        attachmentsMarkdowns.push(markdown`[${attachment.name}](${href})`);
      }
      // TODO: Handle spacing more intelligently.
      res.send(attachmentsMarkdowns.join(" "));
    })
  );

  // TODO: Verify the security of this: https://expressjs.com/en/4x/api.html#express.static
  // TODO: Move this route to a more generic place.
  app.get<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/files/*",
    ...isSignedInMiddleware,
    express.static(dataDirectory)
  );

  const markdownProcessor = await (async () => {
    const unifiedProcessor = unified()
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

    // TODO: Would making this async speed things up in any way?
    return ({
      req,
      res,
      markdown,
    }: {
      req: express.Request<
        {},
        any,
        {},
        {},
        Partial<IsEnrolledInCourseMiddlewareLocals>
      >;
      res: express.Response<any, Partial<IsEnrolledInCourseMiddlewareLocals>>;
      markdown: Markdown;
    }): { html: HTML; text: string; mentions: string[] } => {
      const document = JSDOM.fragment(html`
        <div class="markdown">
          $${unifiedProcessor.processSync(markdown).toString()}
        </div>
      `);
      for (const element of document.querySelectorAll("li, td, th, dt, dd"))
        element.innerHTML = [...element.childNodes].some(
          (node) =>
            node.nodeType === node.TEXT_NODE && node.textContent!.trim() !== ""
        )
          ? html`<div><p>$${element.innerHTML}</p></div>`
          : html`<div>$${element.innerHTML}</div>`;
      for (const element of document.querySelectorAll("details")) {
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
              JSDOM.fragment(html`<summary>Details</summary>`)
                .firstElementChild!
            );
            break;
          case 1:
            break;
          default:
            continue;
        }
        const wrapper = JSDOM.fragment(html`<div></div>`).firstElementChild!;
        // FIXME: When this gets released https://github.com/microsoft/TypeScript/blob/6cdbf98a6f945b7e498b7cb44c8d4132b370b1ea/lib/lib.dom.d.ts#L10948-L10953
        (wrapper as any).replaceChildren(...rest);
        (element as any).replaceChildren(summaries[0], wrapper);
      }
      // TODO: Actually compute mentions
      const mentions: string[] = [];
      if (res.locals.course !== undefined)
        (function processReferencesAndMentions(node: Node): void {
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
                  // TODO: Check that the conversation/message exists and is accessible by user.
                  // TODO: Do a tooltip to reveal what would be under the link.
                  return html`<a
                    href="${url}/courses/${res.locals.course!
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
            for (const childNode of node.childNodes)
              processReferencesAndMentions(childNode);
        })(document);
      return {
        html: document.firstElementChild!.outerHTML,
        text: document.textContent!,
        mentions,
      };
    };
  })();

  app.post<{}, any, { content?: string }, {}, IsSignedInMiddlewareLocals>(
    "/markdown-editor/preview",
    ...isSignedInMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");
      res.send(
        markdownProcessor({ req, res, markdown: req.body.content }).html
      );
    }
  );

  app.post<
    { courseReference: string },
    any,
    { content?: string },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/markdown-editor/preview",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === ""
      )
        return next("validation");
      res.send(
        markdownProcessor({ req, res, markdown: req.body.content }).html
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {
      conversationLayoutSidebarOpenOnSmallScreen?: "true";
      search?: string;
      tag?: string;
    },
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
                action="${url}/courses/${res.locals.course
                  .reference}/conversations"
                novalidate
                style="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
              >
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

                $${markdownEditor({ req, res })}

                <div class="label">
                  <p class="label--text">Type</p>
                  <div
                    style="${css`
                      display: flex;
                      flex-wrap: wrap;
                      column-gap: var(--space--4);
                      row-gap: var(--space--2);
                    `}"
                  >
                    $${res.locals.conversationTypes
                      .map(
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
                            />
                            <span>
                              $${conversationTypeIcon[conversationType].regular}
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
                      )
                      .join(html`<span class="secondary">|</span>`)}
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
                                content: "Tags help to organize conversations. You must select at least one tag.",
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
                            flex-wrap: wrap;
                            column-gap: var(--space--6);
                            row-gap: var(--space--2);
                          `}"
                        >
                          $${res.locals.tags
                            .map(
                              (tag) => html`
                                <div
                                  style="${css`
                                    display: flex;
                                    gap: var(--space--2);
                                  `}"
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
                                        <button
                                          type="button"
                                          class="button button--tight button--tight--inline button--transparent text--orange"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              content: "This tag is visible by staff only.",
                                              trigger: "click",
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-eye-slash-fill"></i>
                                        </button>
                                      `
                                    : html``}
                                </div>
                              `
                            )
                            .join(html`<span class="secondary">|</span>`)}
                        </div>
                      </div>
                    `}
                <div
                  style="${css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--4);
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div
                          class="label"
                          style="${css`
                            width: var(--space--24);
                          `}"
                        >
                          <div class="label--text">
                            Pin
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent"
                              oninteractive="${javascript`
                              tippy(this, {
                                content: "Pinned conversations are listed first.",
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
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isPinned"
                                autocomplete="off"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
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
                                class="text--amber"
                                oninteractive="${javascript`
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
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="label"
                    style="${css`
                      width: var(--space--40);
                    `}"
                  >
                    <p class="label--text">Visibility</p>
                    <div
                      style="${css`
                        display: flex;
                      `}"
                    >
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          type="checkbox"
                          name="isStaffOnly"
                          autocomplete="off"
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
                              content: "Set as Visible by Staff Only",
                              touch: false,
                            });
                          `}"
                        >
                          <i class="bi bi-eye"></i>
                          Visible by Everyone
                        </span>
                        <span
                          class="text--orange"
                          oninteractive="${javascript`
                            tippy(this, {
                              content: "Set as Visible by Everyone",
                              touch: false,
                            });
                          `}"
                        >
                          <i class="bi bi-eye-slash-fill"></i>
                          Visible by Staff Only
                        </span>
                      </label>
                    </div>
                  </div>

                  $${res.locals.enrollment.role === "staff"
                    ? html``
                    : html`
                        <div
                          class="anonymity label"
                          style="${css`
                            width: var(--space--56);
                          `}"
                        >
                          <div class="label--text">Anonymity</div>
                          <div
                            style="${css`
                              display: flex;
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnonymous"
                                autocomplete="off"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: "Set as Anonymous to Other Students",
                                    touch: false,
                                  });
                                `}"
                              >
                                $${res.locals.user.avatar === null
                                  ? html`<i class="bi bi-person-circle"></i>`
                                  : html`
                                      <img
                                        src="${res.locals.user.avatar}"
                                        alt="${res.locals.user.name}"
                                        class="avatar avatar--sm avatar--vertical-align"
                                      />
                                    `}
                                Identified to Other Students
                              </span>
                              <span
                                class="text--violet"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: "Set as Identified to Other Students",
                                    touch: false,
                                  });
                                `}"
                              >
                                <i class="bi bi-sunglasses"></i>
                                Anonymous to Other Students
                              </span>
                            </label>
                          </div>
                        </div>
                      `}
                </div>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                    oninteractive="${javascript`
                      Mousetrap(this.closest("form").querySelector(".markdown-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
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
            `,
          }
        )
      );
    }
  );

  const emitCourseRefresh = (courseId: number): void => {
    for (const eventDestination of eventDestinations)
      eventDestination.write(`event: refresh\ndata:\n\n`);
  };

  app.post<
    { courseReference: string },
    HTML,
    {
      title?: string;
      content?: string;
      type?: ConversationType;
      tagsReferences?: string[];
      isPinned?: boolean;
      isStaffOnly?: boolean;
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
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        typeof req.body.type !== "string" ||
        !res.locals.conversationTypes.includes(req.body.type) ||
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
            ))) ||
        (req.body.isPinned && res.locals.enrollment.role !== "staff") ||
        ((res.locals.enrollment.role === "staff" || req.body.isStaffOnly) &&
          req.body.isAnonymous)
      )
        return next("validation");

      const processedContent = markdownProcessor({
        req,
        res,
        markdown: req.body.content,
      });

      database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            res.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
      const conversation = database.get<{ id: number; title: string }>(
        sql`
          SELECT * FROM "conversations" WHERE "id" = ${Number(
            database.run(
              sql`
                INSERT INTO "conversations" (
                  "course",
                  "reference",
                  "title",
                  "titleSearch",
                  "nextMessageReference",
                  "type",
                  "pinnedAt",
                  "staffOnlyAt"
                )
                VALUES (
                  ${res.locals.course.id},
                  ${String(res.locals.course.nextConversationReference)},
                  ${req.body.title},
                  ${html`${req.body.title}`},
                  ${2},
                  ${req.body.type},
                  ${req.body.isPinned ? new Date().toISOString() : null},
                  ${req.body.isStaffOnly ? new Date().toISOString() : null}
                )
              `
            ).lastInsertRowid
          )}
        `
      )!;
      // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
      const message = database.get<{ id: number }>(
        sql`
          SELECT * FROM "messages" WHERE "id" = ${Number(
            database.run(
              sql`
                INSERT INTO "messages" (
                  "conversation",
                  "reference",
                  "authorEnrollment",
                  "content",
                  "contentSearch",
                  "anonymousAt"
                )
                VALUES (
                  ${conversation.id},
                  ${"1"},
                  ${res.locals.enrollment.id},
                  ${req.body.content},
                  ${processedContent.text},
                  ${req.body.isAnonymous ? new Date().toISOString() : null}
                )
              `
            ).lastInsertRowid
          )}
        `
      )!;
      for (const tagReference of req.body.tagsReferences)
        database.run(
          sql`
            INSERT INTO "taggings" ("conversation", "tag")
            VALUES (
              ${conversation.id},
              ${
                res.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.course.nextConversationReference}`
      );

      // TODO:
      // - ‘all-messages’
      // - ‘staff-announcements-and-mentions’
      //   - Announcements
      //   - ‘@mentions’
      // - Check that user is allowed to see this message (with respect to staffOnly)
      // - Include author (say Anonymous when necessary)
      // - Don’t notify the author themselves
      // - Messages
      // - NOT EDITS
      // - Have a queue
      // - Confirmed emails only
      // sendMail({
      //   to: database
      //     .all<{ email: string }>(
      //       sql`
      //         SELECT "users"."email" AS "email"
      //         FROM "users"
      //         JOIN "enrollments" ON "users"."id" = "enrollments"."user" AND
      //                               "enrollments"."course" = ${res.locals.course.id}
      //         WHERE "users"."emailNotifications" = 'all-messages'
      //       `
      //     )
      //     .map((user) => user.email)
      //     .join(", "),
      //   subject: `${res.locals.course.name} · ${req.body.title}`,
      //   html: html`
      //     ${markdownProcessor({ req, res, markdown: req.body.content }).html}

      //     <hr />

      //     <p>
      //       <a href="${url}/settings/notifications-preferences"
      //         >Update Email Preferences</a
      //       >
      //     </p>
      //   `,
      // });
    }
  );

  interface IsConversationAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    messages: {
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollment: IsConversationAccessibleMiddlewareLocals["conversation"]["authorEnrollment"];
      content: string;
      answerAt: string | null;
      anonymousAt: string | null;
      reading: { id: number } | null;
      endorsements: IsConversationAccessibleMiddlewareLocals["conversation"]["endorsements"];
      likes: {
        id: number;
        enrollment: IsConversationAccessibleMiddlewareLocals["conversation"]["authorEnrollment"];
      }[];
    }[];
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
      const conversation = getConversation(
        req,
        res,
        req.params.conversationReference
      );
      if (conversation === undefined) return next("route");
      res.locals.conversation = conversation;

      res.locals.messages = database
        .all<{
          id: number;
          createdAt: string;
          updatedAt: string | null;
          reference: string;
          authorEnrollmentId: number | null;
          authorUserId: number | null;
          authorUserEmail: string | null;
          authorUserName: string | null;
          authorUserAvatar: string | null;
          authorUserBiography: string | null;
          authorEnrollmentReference: EnrollmentRole | null;
          authorEnrollmentRole: EnrollmentRole | null;
          content: string;
          answerAt: string | null;
          anonymousAt: string | null;
          readingId: number | null;
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
                   "messages"."answerAt",
                   "messages"."anonymousAt",
                   "readings"."id" AS "readingId"
            FROM "messages"
            LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
            LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                    "readings"."enrollment" = ${res.locals.enrollment.id}
            WHERE "messages"."conversation" = ${conversation.id}
            ORDER BY "messages"."id" ASC
          `
        )
        .map((message) => {
          // FIXME: Try to get rid of these n+1 queries.
          const endorsements = database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userBiography: string | null;
              enrollmentReference: string | null;
              enrollmentRole: EnrollmentRole | null;
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
                  : noLongerEnrolledEnrollment,
            }));
          const likes = database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userBiography: string | null;
              enrollmentReference: string | null;
              enrollmentRole: EnrollmentRole | null;
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
                  : noLongerEnrolledEnrollment,
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
                : noLongerEnrolledEnrollment,
            content: message.content,
            answerAt: message.answerAt,
            anonymousAt: message.anonymousAt,
            reading:
              message.readingId === null ? null : { id: message.readingId },
            endorsements,
            likes,
          };
        });

      next();
    },
  ];

  const mayEditConversation = (
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >,
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>
  ): boolean =>
    res.locals.enrollment.role === "staff" ||
    res.locals.conversation.authorEnrollment.id === res.locals.enrollment.id;

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
      if (mayEditConversation(req, res)) return next();
      next("route");
    },
  ];

  interface MessageExistsMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {
    message: IsConversationAccessibleMiddlewareLocals["messages"][number];
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
      const message = res.locals.messages.find(
        (message) => message.reference === req.params.messageReference
      );
      if (message === undefined) return next("route");
      res.locals.message = message;
      next();
    },
  ];

  const mayEditMessage = (
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >,
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>,
    message: MessageExistsMiddlewareLocals["message"]
  ) =>
    res.locals.enrollment.role === "staff" ||
    message.authorEnrollment.id === res.locals.enrollment.id;

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
      if (mayEditMessage(req, res, res.locals.message)) return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      conversationLayoutSidebarOpenOnSmallScreen?: "true";
      search?: string;
      tag?: string;
    },
    IsConversationAccessibleMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...isConversationAccessibleMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      for (const message of res.locals.messages)
        database.run(
          sql`
            INSERT INTO "readings" ("message", "enrollment")
            VALUES (${message.id}, ${res.locals.enrollment.id})
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
          body: html`
            <div>
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
                    <span
                      class="strong"
                      style="${css`
                        font-size: var(--font-size--lg);
                        line-height: var(--line-height--lg);
                      `}"
                    >
                      ${res.locals.conversation.title}
                    </span>

                    <a
                      href="${url}/courses/${res.locals.course
                        .reference}/conversations/${res.locals.conversation
                        .reference}"
                      class="button button--tight button--transparent secondary"
                      style="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: inline-flex;
                      `}"
                      oninteractive="${javascript`
                        tippy(this, {
                          content: "Permanent Link to Conversation",
                          touch: false,
                        });
                      `}"
                    >
                      #${res.locals.conversation.reference}
                    </a>
                  </h2>

                  $${(() => {
                    const content: HTML[] = [];

                    if (res.locals.enrollment.role === "staff")
                      content.push(html`
                        <div>
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
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
                              action="${url}/courses/${res.locals.course
                                .reference}/conversations/${res.locals
                                .conversation.reference}?_method=DELETE"
                              style="${css`
                                padding: var(--space--2);
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
                      `);

                    if (mayEditConversation(req, res))
                      content.push(html`
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
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
                      `);

                    return content.length === 0
                      ? html``
                      : html`
                          <div
                            style="${css`
                              display: flex;
                              gap: var(--space--2);
                            `}"
                          >
                            $${content}
                          </div>
                        `;
                  })()}
                </div>

                $${mayEditConversation(req, res)
                  ? html`
                      <form
                        method="POST"
                        action="${url}/courses/${res.locals.course
                          .reference}/conversations/${res.locals.conversation
                          .reference}?_method=PATCH"
                        novalidate
                        hidden
                        class="title--edit"
                        style="${css`
                          margin-bottom: var(--space--2);
                          display: flex;
                          gap: var(--space--4);
                          align-items: center;
                        `}"
                      >
                        <input
                          type="text"
                          name="title"
                          value="${res.locals.conversation.title}"
                          required
                          autocomplete="off"
                          class="input--text"
                        />
                        <button
                          class="button button--tight button--tight--inline button--transparent text--green"
                          style="${css`
                            flex: 1;
                          `}"
                          oninteractive="${javascript`
                            tippy(this, {
                              content: "Update Title",
                              theme: "green",
                              touch: false,
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
                      </form>
                    `
                  : html``}
              </div>

              <div
                style="${css`
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--1);
                `}"
              >
                $${res.locals.tags.length === 0
                  ? html``
                  : html`
                      <div
                        style="${css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--1);
                        `}"
                      >
                        $${mayEditConversation(req, res)
                          ? html`
                              $${res.locals.tags.length >
                              res.locals.conversation.taggings.length
                                ? html`
                                    <div>
                                      <button
                                        class="button button--tight button--tight--inline button--transparent text--teal"
                                        oninteractive="${javascript`
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
                                        <i class="bi bi-tags-fill"></i>
                                      </button>
                                      <div hidden>
                                        <div
                                          class="dropdown--menu"
                                          style="${css`
                                            max-height: var(--space--40);
                                            overflow: auto;
                                          `}"
                                        >
                                          $${res.locals.tags
                                            .filter(
                                              (tag) =>
                                                !res.locals.conversation.taggings.some(
                                                  (tagging) =>
                                                    tagging.tag.id === tag.id
                                                )
                                            )
                                            .map(
                                              (tag) => html`
                                                <form
                                                  method="POST"
                                                  action="${url}/courses/${res
                                                    .locals.course
                                                    .reference}/conversations/${res
                                                    .locals.conversation
                                                    .reference}/taggings"
                                                >
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
                                                  </button>
                                                </form>
                                              `
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  `
                                : html``}
                              $${res.locals.conversation.taggings.length === 1
                                ? html`
                                    <button
                                      class="button button--tight button--tight--inline button--tight-gap text--teal disabled"
                                      oninteractive="${javascript`
                                        tippy(this, {
                                          content: "You may not remove this tag because a conversation must have at least one tag.",
                                          theme: "rose",
                                          touch: false,
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-tag-fill"></i>
                                      ${res.locals.conversation.taggings[0].tag
                                        .name}
                                    </button>
                                  `
                                : html`
                                    <div
                                      style="${css`
                                        display: flex;
                                        flex-wrap: wrap;
                                        column-gap: var(--space--6);
                                        row-gap: var(--space--1);
                                      `}"
                                    >
                                      $${res.locals.conversation.taggings.map(
                                        (tagging) => html`
                                          <form
                                            method="POST"
                                            action="${url}/courses/${res.locals
                                              .course
                                              .reference}/conversations/${res
                                              .locals.conversation
                                              .reference}/taggings?_method=DELETE"
                                          >
                                            <input
                                              type="hidden"
                                              name="reference"
                                              value="${tagging.tag.reference}"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  content: "Remove Tag",
                                                  theme: "rose",
                                                  touch: false,
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-tag-fill"></i>
                                              ${tagging.tag.name}
                                            </button>
                                          </form>
                                        `
                                      )}
                                    </div>
                                  `}
                            `
                          : res.locals.conversation.taggings.map(
                              (tagging) => html`
                                <div
                                  class="text--teal"
                                  style="${css`
                                    display: flex;
                                    gap: var(--space--1);
                                  `}"
                                >
                                  <i class="bi bi-tag-fill"></i>
                                  ${tagging.tag.name}
                                </div>
                              `
                            )}
                      </div>
                    `}

                <div
                  style="${css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--6);
                    row-gap: var(--space--1);
                  `}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <form
                          method="POST"
                          action="${url}/courses/${res.locals.course
                            .reference}/conversations/${res.locals.conversation
                            .reference}?_method=PATCH"
                        >
                          <input
                            type="hidden"
                            name="isPinned"
                            value="${res.locals.conversation.pinnedAt === null
                              ? "true"
                              : "false"}"
                          />
                          <button
                            class="button button--tight button--tight--inline button--tight-gap text--amber"
                          >
                            <input
                              type="checkbox"
                              $${res.locals.conversation.pinnedAt === null
                                ? html``
                                : html`checked`}
                              class="input--checkbox"
                            />
                            <i class="bi bi-pin-fill"></i>
                            Pinned
                          </button>
                        </form>
                      `
                    : res.locals.conversation.pinnedAt !== null
                    ? html`
                        <div
                          class="text--amber"
                          style="${css`
                            display: flex;
                            gap: var(--space--1);
                          `}"
                        >
                          <i class="bi bi-pin-fill"></i>
                          Pinned
                        </div>
                      `
                    : html``}
                  $${res.locals.conversation.staffOnlyAt === null
                    ? res.locals.enrollment.role === "staff"
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--tight-gap button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Set as Visible by Staff Only",
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
                            <i class="bi bi-eye"></i>
                            Visible by Everyone
                          </button>
                          <div hidden>
                            <form
                              method="POST"
                              action="${url}/courses/${res.locals.course
                                .reference}/conversations/${res.locals
                                .conversation.reference}?_method=PATCH"
                              style="${css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `}"
                            >
                              <input
                                type="hidden"
                                name="isStaffOnly"
                                value="true"
                              />
                              <p>
                                Are you sure you want to set this conversation
                                as visible by staff only?
                              </p>
                              <p>
                                Students who already participated in the
                                conversation will continue to have access to it.
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
                                <i class="bi bi-eye-slash"></i>
                                Set as Visible by Staff Only
                              </button>
                            </form>
                          </div>
                        `
                      : html``
                    : html`
                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--1);
                          `}"
                        >
                          <i class="bi bi-eye-slash"></i>
                          Visible by Staff Only
                        </div>
                      `}
                  $${mayEditConversation(req, res)
                    ? html`
                        <div>
                          <button
                            class="button button--tight button--tight--inline button--tight-gap button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Update Conversation Type",
                                touch: false,
                              });
                              tippy(this, {
                                content: this.nextElementSibling.firstElementChild,
                                trigger: "click",
                                interactive: true,
                              });
                            `}"
                          >
                            $${conversationTypeIcon[
                              res.locals.conversation.type
                            ].fill}
                            $${lodash.capitalize(res.locals.conversation.type)}
                          </button>
                          <div hidden>
                            <div class="dropdown--menu">
                              $${res.locals.conversationTypes.map(
                                (conversationType) => html`
                                  <form
                                    method="POST"
                                    action="${url}/courses/${res.locals.course
                                      .reference}/conversations/${res.locals
                                      .conversation.reference}?_method=PATCH"
                                  >
                                    <input
                                      type="hidden"
                                      name="type"
                                      value="${conversationType}"
                                    />
                                    <button
                                      class="dropdown--menu--item button ${conversationType ===
                                      res.locals.conversation.type
                                        ? "button--blue"
                                        : "button--transparent"}"
                                    >
                                      $${conversationTypeIcon[conversationType]
                                        .fill}
                                      $${lodash.capitalize(conversationType)}
                                    </button>
                                  </form>
                                `
                              )}
                            </div>
                          </div>
                        </div>
                      `
                    : html`
                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--1);
                          `}"
                        >
                          $${conversationTypeIcon[res.locals.conversation.type]
                            .fill}
                          $${lodash.capitalize(res.locals.conversation.type)}
                        </div>
                      `}
                </div>
              </div>
            </div>

            $${(() => {
              let isScrolledIntoView = false;
              return res.locals.messages.map(
                (message) => html`
                  <div
                    id="message--${message.reference}"
                    data-content="${JSON.stringify(message.content)}"
                    class="message"
                    style="${css`
                      padding-bottom: var(--space--2);
                      border-bottom: var(--border-width--4) solid
                        var(--color--gray--medium--200);
                      @media (prefers-color-scheme: dark) {
                        border-color: var(--color--gray--medium--700);
                      }
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }
                    `}"
                    $${message.reading === null && !isScrolledIntoView
                      ? (() => {
                          isScrolledIntoView = true;
                          return html`
                            oninteractive="${javascript`
                              this.scrollIntoView();
                            `}"
                          `;
                        })()
                      : html``}
                  >
                    $${message.reading === null
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--blue"
                            style="${css`
                              width: var(--space--2);
                              height: var(--space--2);
                              margin-top: var(--space--3-5);
                              @media (max-width: 629px) {
                                margin-left: var(--space---3);
                              }
                              @media (min-width: 630px) {
                                margin-left: var(--space---4);
                              }
                            `}"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Unread Message",
                                touch: false,
                              });
                            `}"
                            onclick="${javascript`
                              this.remove();
                            `}"
                          ></button>
                        `
                      : html``}
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
                          gap: var(--space--4);
                          align-items: baseline;
                        `}"
                      >
                        <div
                          style="${css`
                            flex: 1;
                            display: flex;
                            gap: var(--space--2);
                            align-items: baseline;
                          `}"
                        >
                          <div
                            style="${css`
                              position: relative;
                              bottom: var(--space---1-5);
                            `}"
                          >
                            $${message.anonymousAt !== null &&
                            res.locals.enrollment.role !== "staff" &&
                            message.authorEnrollment.id !==
                              res.locals.enrollment.id
                              ? html`
                                  <div
                                    style="${css`
                                      font-size: var(--font-size--2xl);
                                      & > *::before {
                                        vertical-align: baseline;
                                      }
                                    `}"
                                  >
                                    <i class="bi bi-sunglasses"></i>
                                  </div>
                                `
                              : message.authorEnrollment.user.avatar === null
                              ? html`
                                  <div
                                    style="${css`
                                      font-size: var(--font-size--2xl);
                                      & > *::before {
                                        vertical-align: baseline;
                                      }
                                    `}"
                                  >
                                    <i class="bi bi-person-circle"></i>
                                  </div>
                                `
                              : html`
                                  <img
                                    src="${message.authorEnrollment.user
                                      .avatar}"
                                    alt="${message.authorEnrollment.user.name}"
                                    class="avatar avatar--2xl"
                                  />
                                `}
                          </div>
                          <h3>
                            <span class="strong">
                              $${message.anonymousAt !== null &&
                              res.locals.enrollment.role !== "staff" &&
                              message.authorEnrollment.id !==
                                res.locals.enrollment.id
                                ? html`Anonymous`
                                : html`
                                    ${message.authorEnrollment.user.name}
                                    $${message.anonymousAt !== null
                                      ? html`
                                          <span
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                content: "Anonymous to other students.",
                                                touch: false,
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-sunglasses"></i>
                                          </span>
                                        `
                                      : html``}
                                  `}
                            </span>
                            <span class="secondary">
                              said
                              <time
                                oninteractive="${javascript`
                                  leafac.relativizeDateTimeElement(this);
                                `}"
                              >
                                ${message.createdAt}
                              </time>
                              $${message.updatedAt !== null
                                ? html`
                                    and last edited
                                    <time
                                      oninteractive="${javascript`
                                        leafac.relativizeDateTimeElement(this);
                                      `}"
                                    >
                                      ${message.updatedAt}
                                    </time>
                                  `
                                : html``}
                              <a
                                href="${url}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation
                                  .reference}#message--${message.reference}"
                                class="button button--tight button--tight--inline button--transparent"
                                style="${css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                  display: inline-flex;
                                `}"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: "Permanent Link to Message",
                                    touch: false,
                                  });
                                `}"
                              >
                                #${res.locals.conversation
                                  .reference}/${message.reference}
                              </a>
                            </span>
                          </h3>
                        </div>

                        <div
                          style="${css`
                            display: flex;
                            gap: var(--space--2);
                          `}"
                        >
                          $${message.authorEnrollment.id ===
                            res.locals.enrollment.id &&
                          res.locals.enrollment.role === "student" &&
                          res.locals.conversation.staffOnlyAt === null
                            ? html`
                                <div>
                                  <button
                                    class="button button--tight button--tight--inline button--transparent"
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        content: "Update Identity",
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
                                    <i class="bi bi-sunglasses"></i>
                                  </button>
                                  <div hidden>
                                    <form
                                      method="POST"
                                      action="${url}/courses/${res.locals.course
                                        .reference}/conversations/${res.locals
                                        .conversation
                                        .reference}/messages/${message.reference}?_method=PATCH"
                                      style="${css`
                                        padding: var(--space--2);
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--space--4);
                                      `}"
                                    >
                                      $${message.anonymousAt === null
                                        ? html`
                                            <input
                                              type="hidden"
                                              name="isAnonymous"
                                              value="true"
                                            />
                                            <p>
                                              Other students may see that you’re
                                              the author of this message.
                                            </p>
                                            <button class="button button--rose">
                                              <i class="bi bi-sunglasses"></i>
                                              Go Anonymous to Other Students
                                            </button>
                                          `
                                        : html`
                                            <input
                                              type="hidden"
                                              name="isAnonymous"
                                              value="false"
                                            />
                                            <p>
                                              Other students see this message as
                                              anonymous.
                                            </p>
                                            <button class="button button--rose">
                                              $${res.locals.user.avatar === null
                                                ? html`<i
                                                    class="bi bi-person-circle"
                                                  ></i>`
                                                : html`
                                                    <img
                                                      src="${res.locals.user
                                                        .avatar}"
                                                      alt="${res.locals.user
                                                        .name}"
                                                      class="avatar avatar--sm avatar--vertical-align"
                                                    />
                                                  `}
                                              Go Public to Other Students
                                            </button>
                                          `}
                                    </form>
                                  </div>
                                </div>
                              `
                            : html``}
                          $${res.locals.enrollment.role === "staff" &&
                          message.reference !== "1"
                            ? html`
                                <div>
                                  <button
                                    class="button button--tight button--tight--inline button--transparent"
                                    oninteractive="${javascript`
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
                                      action="${url}/courses/${res.locals.course
                                        .reference}/conversations/${res.locals
                                        .conversation
                                        .reference}/messages/${message.reference}?_method=DELETE"
                                      style="${css`
                                        padding: var(--space--2);
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
                                            font-weight: var(
                                              --font-weight--bold
                                            );
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
                          $${mayEditMessage(req, res, message)
                            ? html`
                                <button
                                  class="button button--tight button--tight--inline button--transparent"
                                  oninteractive="${javascript`
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
                              `
                            : html``}

                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                content: "Reply",
                                touch: false,
                              });
                            `}"
                            onclick="${javascript`
                              const content = JSON.parse(this.closest("[data-content]").dataset.content);
                              const newMessage = document.querySelector(".new-message");
                              newMessage.querySelector(".markdown-editor--button--write").click();
                              const element = newMessage.querySelector(".markdown-editor--write--textarea");
                              textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> @${
                                message.authorEnrollment.reference
                              }--${slugify(
                              message.authorEnrollment.user.name
                            )}" + " · #" + ${JSON.stringify(
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

                      <div
                        class="message--show"
                        style="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--4);
                        `}"
                      >
                        $${(() => {
                          const content: HTML[] = [];

                          if (
                            mayEditMessage(req, res, message) &&
                            message.reference !== "1" &&
                            res.locals.conversation.type === "question"
                          )
                            content.push(html`
                              <form
                                method="POST"
                                action="${url}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation
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
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            content: "Set as an Answer",
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
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        oninteractive="${javascript`
                                            tippy(this, {
                                              content: "Set as Not an Answer",
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
                            res.locals.conversation.type === "question" &&
                            message.answerAt !== null
                          )
                            content.push(html`
                              <div
                                style="${css`
                                  display: flex;
                                  gap: var(--space--1);
                                `}"
                              >
                                <i class="bi bi-patch-check-fill"></i>
                                Answer
                              </div>
                            `);

                          if (mayEndorseMessage(req, res, message)) {
                            const isEndorsed = message.endorsements.some(
                              (endorsement) =>
                                endorsement.enrollment.id ===
                                res.locals.enrollment.id
                            );

                            content.push(html`
                              <form
                                method="POST"
                                action="${url}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation
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
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--blue"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            content: ${JSON.stringify(
                                              `Remove Endorsement${
                                                message.endorsements.length > 1
                                                  ? ` (Also endorsed by ${
                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                        Intl as any
                                                      ).ListFormat("en").format(
                                                        message.endorsements
                                                          .filter(
                                                            (endorsement) =>
                                                              endorsement
                                                                .enrollment
                                                                .id !==
                                                              res.locals
                                                                .enrollment.id
                                                          )
                                                          .map(
                                                            (endorsement) =>
                                                              endorsement
                                                                .enrollment.user
                                                                .name
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
                                        Endorsement${message.endorsements
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
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        $${message.endorsements.length === 0
                                          ? html``
                                          : html`
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  content: ${JSON.stringify(
                                                    `Endorse (Already endorsed by ${
                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                        Intl as any
                                                      ).ListFormat("en").format(
                                                        message.endorsements.map(
                                                          (endorsement) =>
                                                            endorsement
                                                              .enrollment.user
                                                              .name
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
                            res.locals.conversation.type === "question" &&
                            message.endorsements.length > 0
                          )
                            content.push(html`
                              <div
                                style="${css`
                                  display: flex;
                                  gap: var(--space--1);
                                `}"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    content: ${JSON.stringify(
                                      `Endorsed by ${
                                        /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                          Intl as any
                                        ).ListFormat("en").format(
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
                                    flex-wrap: wrap;
                                    column-gap: var(--space--6);
                                    row-gap: var(--space--1);
                                  `}"
                                >
                                  $${content}
                                </div>
                              `;
                        })()}

                        <div
                          class="message--show--content"
                          style="${css`
                            position: relative;
                          `}"
                        >
                          <div
                            class="message--show--content--dropdown-menu-target"
                            style="${css`
                              width: var(--space--0);
                              height: var(--line-height--sm);
                              position: absolute;
                            `}"
                          ></div>
                          <div
                            class="message--show--content--content"
                            oninteractive="${javascript`
                              const dropdownMenuTarget = this.closest(".message--show--content").querySelector(".message--show--content--dropdown-menu-target");
                              const dropdownMenu = tippy(dropdownMenuTarget, {
                                content: this.nextElementSibling.firstElementChild,
                                trigger: "manual",
                                interactive: true,
                                touch: false,
                              });
                              this.addEventListener("mouseup", (event) => {
                                window.setTimeout(() => {
                                  const selection = window.getSelection();
                                  const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
                                  const focusElement = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode?.parentElement;
                                  if (
                                    selection.isCollapsed ||
                                    anchorElement === null ||
                                    focusElement === null ||
                                    !this.contains(anchorElement) ||
                                    !this.contains(focusElement) ||
                                    anchorElement.dataset.position === undefined ||
                                    focusElement.dataset.position === undefined
                                  ) return;
                                  dropdownMenuTarget.style.top = String(event.layerY) + "px";
                                  dropdownMenuTarget.style.left = String(event.layerX) + "px";
                                  dropdownMenu.show();
                                }, 0);
                              });
                            `}"
                          >
                            $${markdownProcessor({
                              req,
                              res,
                              markdown: message.content,
                            }).html}
                          </div>
                          <div hidden>
                            <div class="dropdown--menu">
                              <button
                                class="dropdown--menu--item button button--transparent"
                                onclick="${javascript`
                                  tippy.hideAll();
                                  const selection = window.getSelection();
                                  const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
                                  const focusElement = selection.focusNode instanceof Element ? selection.focusNode : selection.focusNode?.parentElement;
                                  const contentElement = this.closest(".message--show--content").querySelector(".message--show--content--content");
                                  if (
                                    selection.isCollapsed ||
                                    anchorElement === null ||
                                    focusElement === null ||
                                    !contentElement.contains(anchorElement) ||
                                    !contentElement.contains(focusElement) ||
                                    anchorElement.dataset.position === undefined ||
                                    focusElement.dataset.position === undefined
                                  ) return;
                                  // TODO: May have to get ‘closest()’ child of ‘.text’ to prevent some elements (for example, tables) from breaking.
                                  const anchorPosition = JSON.parse(anchorElement.dataset.position);
                                  const focusPosition = JSON.parse(focusElement.dataset.position);
                                  const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                                  const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                                  const content = JSON.parse(anchorElement.closest("[data-content]").dataset.content);
                                  const newMessage = document.querySelector(".new-message");
                                  newMessage.querySelector(".markdown-editor--button--write").click();
                                  const element = newMessage.querySelector(".markdown-editor--write--textarea");
                                  textFieldEdit.wrapSelection(element, ((element.selectionStart > 0) ? "\\n\\n" : "") + "> @${
                                    message.authorEnrollment.reference
                                  }--${slugify(
                                  message.authorEnrollment.user.name
                                )}" + " · #" + ${JSON.stringify(
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
                            flex-wrap: wrap;
                            column-gap: var(--space--6);
                            row-gap: var(--space--1);
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
                                action="${url}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation
                                  .reference}/messages/${message.reference}/likes${isLiked
                                  ? "?_method=DELETE"
                                  : ""}"
                                onsubmit="${javascript`
                                  event.preventDefault();
                                  fetch(this.action, { method: this.method });
                                `}"
                              >
                                <button
                                  class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                    ? "text--blue"
                                    : ""}"
                                  $${likesCount === 0
                                    ? html``
                                    : html`
                                        oninteractive="${javascript`
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
                                        Like${likesCount === 1 ? "" : "s"}
                                      `}
                                </button>
                              </form>
                            `;
                          })()}
                        </div>
                      </div>

                      $${mayEditMessage(req, res, message)
                        ? html`
                            <form
                              method="POST"
                              action="${url}/courses/${res.locals.course
                                .reference}/conversations/${res.locals
                                .conversation
                                .reference}/messages/${message.reference}?_method=PATCH"
                              novalidate
                              hidden
                              class="message--edit"
                              style="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `}"
                            >
                              $${markdownEditor({
                                req,
                                res,
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
                                  oninteractive="${javascript`
                                    Mousetrap(this.closest("form").querySelector(".markdown-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                                    tippy(this, {
                                      content: ${JSON.stringify(html`
                                        <span class="keyboard-shortcut">
                                          Ctrl+Enter or
                                          <span
                                            class="keyboard-shortcut--cluster"
                                            ><i class="bi bi-command"></i
                                            ><i
                                              class="bi bi-arrow-return-left"
                                            ></i
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
              );
            })()}

            <form
              method="POST"
              action="${url}/courses/${res.locals.course
                .reference}/conversations/${res.locals.conversation
                .reference}/messages"
              novalidate
              style="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                class="new-message"
                oninteractive="${javascript`
                  const content = this.querySelector(".markdown-editor--write--textarea");
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
                $${markdownEditor({ req, res })}
              </div>

              <div
                style="${css`
                  display: flex;
                  flex-wrap: wrap;
                  column-gap: var(--space--8);
                  row-gap: var(--space--4);
                `}"
              >
                $${res.locals.conversation.type === "question"
                  ? html`
                      <div class="label">
                        <p class="label--text">Type</p>
                        <label
                          class="button button--tight button--tight--inline"
                        >
                          <input
                            type="checkbox"
                            name="isAnswer"
                            autocomplete="off"
                            $${res.locals.enrollment.role === "staff"
                              ? `checked`
                              : ``}
                            class="input--checkbox"
                          />
                          <i class="bi bi-patch-check"></i>
                          Answer
                        </label>
                      </div>
                    `
                  : html``}
                $${res.locals.enrollment.role === "staff" ||
                res.locals.conversation.staffOnlyAt !== null
                  ? html``
                  : html`
                      <div class="identity label">
                        <p class="label--text">Anonymity</p>
                        <label
                          class="button button--tight button--tight--inline"
                        >
                          <input
                            type="checkbox"
                            name="isAnonymous"
                            autocomplete="off"
                            class="input--checkbox"
                          />
                          <i class="bi bi-sunglasses"></i>
                          Anonymous to Other Students
                        </label>
                      </div>
                    `}
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                  oninteractive="${javascript`
                      Mousetrap(this.closest("form").querySelector(".markdown-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
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
      type?: ConversationType;
      isPinned?: "true" | "false";
      isStaffOnly?: "true";
    },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "title" = ${req.body.title},
                  "titleSearch" = ${html`${req.body.title}`}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

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
          req.body.isStaffOnly !== "true" ||
          res.locals.enrollment.role !== "staff" ||
          res.locals.conversation.staffOnlyAt !== null
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "staffOnlyAt" = ${new Date().toISOString()}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
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
    ...isCourseStaffMiddleware,
    ...isConversationAccessibleMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${res.locals.conversation.id}`
      );
      emitCourseRefresh(res.locals.course.id);
      res.redirect(`${url}/courses/${res.locals.course.reference}`);
    }
  );

  app.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { content?: string; isAnswer?: boolean; isAnonymous?: boolean },
    {},
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        (req.body.isAnswer && res.locals.conversation.type !== "question") ||
        ((res.locals.enrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null) &&
          req.body.isAnonymous)
      )
        return next("validation");

      const processedContent = markdownProcessor({
        req,
        res,
        markdown: req.body.content,
      });

      database.run(
        sql`
          UPDATE "conversations"
          SET "nextMessageReference" = ${
            res.locals.conversation.nextMessageReference + 1
          }
          WHERE "id" = ${res.locals.conversation.id}
        `
      );
      // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
      const message = database.get<{ id: number }>(
        sql`
          SELECT * FROM "messages" WHERE "id" = ${Number(
            database.run(
              sql`
                INSERT INTO "messages" (
                  "conversation",
                  "reference",
                  "authorEnrollment",
                  "content",
                  "contentSearch",
                  "answerAt",
                  "anonymousAt"
                )
                VALUES (
                  ${res.locals.conversation.id},
                  ${String(res.locals.conversation.nextMessageReference)},
                  ${res.locals.enrollment.id},
                  ${req.body.content},
                  ${processedContent.text},
                  ${req.body.isAnswer ? new Date().toISOString() : null},
                  ${req.body.isAnonymous ? new Date().toISOString() : null}
                )
              `
            ).lastInsertRowid
          )}
        `
      )!;
      // TODO: Send email notifications.

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.conversation.nextMessageReference}`
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
    {
      content?: string;
      isAnswer?: "true" | "false";
      isAnonymous?: "true" | "false";
    },
    {},
    MayEditMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...mayEditMessageMiddleware,
    (req, res, next) => {
      if (typeof req.body.content === "string")
        if (req.body.content.trim() === "") return next("validation");
        else {
          const processedContent = markdownProcessor({
            req,
            res,
            markdown: req.body.content,
          });
          database.run(
            sql`
              UPDATE "messages"
              SET "content" = ${req.body.content},
                  "contentSearch" = ${processedContent.text},
                  "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${res.locals.message.id}
            `
          );
          // TODO: Notify people who have been mentioned in this edit.
        }

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
          res.locals.message.authorEnrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null ||
          (req.body.isAnonymous === "true" &&
            res.locals.message.anonymousAt !== null) ||
          (req.body.isAnonymous === "false" &&
            res.locals.message.anonymousAt === null)
        )
          return next("validation");
        else
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

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
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
    IsCourseStaffMiddlewareLocals & MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...isCourseStaffMiddleware,
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (res.locals.message.reference === "1") return next("validation");
      database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );
      emitCourseRefresh(res.locals.course.id);
      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
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
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.likes.some(
          (like) => like.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`INSERT INTO "likes" ("message", "enrollment") VALUES (${res.locals.message.id}, ${res.locals.enrollment.id})`
      );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
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
    ...messageExistsMiddleware,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) => like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `
      );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
      );
    }
  );

  const mayEndorseMessage = (
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
  ): boolean =>
    res.locals.enrollment.role === "staff" &&
    res.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    message.authorEnrollment.role !== "staff";

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
      if (mayEndorseMessage(req, res, res.locals.message)) return next();
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
            endorsement.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`INSERT INTO "endorsements" ("message", "enrollment") VALUES (${res.locals.message.id}, ${res.locals.enrollment.id})`
      );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
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
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) => endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("validation");

      database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      emitCourseRefresh(res.locals.course.id);

      res.redirect(
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}#message--${res.locals.message.reference}`
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
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
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
        `${url}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  if (demonstration)
    app.post<{}, any, {}, {}, {}>(
      "/demonstration-data",
      asyncHandler(async (req, res) => {
        const password = await argon2.hash("courselore", argon2Options);
        const card = faker.helpers.contextualCard();
        const name = `${card.name} ${faker.name.lastName()}`;
        // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
        const demonstrationUser = database.get<{ id: number; name: string }>(
          sql`
            SELECT * FROM "users" WHERE "id" = ${Number(
              database.run(
                sql`
                  INSERT INTO "users" (
                    "email",
                    "password",
                    "emailConfirmedAt",
                    "name",
                    "nameSearch",
                    "avatar",
                    "biography",
                    "emailNotifications"
                  )
                  VALUES (
                    ${`${card.username.toLowerCase()}--${cryptoRandomString({
                      length: 10,
                      type: "numeric",
                    })}@courselore.org`},
                    ${password},
                    ${new Date().toISOString()},
                    ${name},
                    ${html`${name}`},
                    ${card.avatar},
                    ${faker.lorem.paragraph()},
                    ${"none"}
                  )
                `
              ).lastInsertRowid
            )}
          `
        )!;

        const users = lodash.times(150, () => {
          const card = faker.helpers.contextualCard();
          const name = `${card.name} ${faker.name.lastName()}`;
          // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
          return database.get<{
            id: number;
            email: string;
            name: string;
          }>(
            sql`
              SELECT * FROM "users" WHERE "id" = ${Number(
                database.run(
                  sql`
                    INSERT INTO "users" (
                      "email",
                      "password",
                      "emailConfirmedAt",
                      "name",
                      "nameSearch",
                      "avatar",
                      "biography",
                      "emailNotifications"
                    )
                    VALUES (
                      ${`${card.username}--${cryptoRandomString({
                        length: 10,
                        type: "numeric",
                      })}@courselore.org`},
                      ${password},
                      ${new Date().toISOString()},
                      ${name},
                      ${html`${name}`},
                      ${Math.random() < 0.6 ? card.avatar : null},
                      ${Math.random() < 0.3 ? faker.lorem.paragraph() : null},
                      ${"none"}
                    )
                  `
                ).lastInsertRowid
              )}
            `
          )!;
        });

        for (const { name, role, accentColor, enrollmentsUsers } of [
          {
            name: "Principles of Programming Languages",
            role: enrollmentRoles[1],
            accentColor: enrollmentAccentColors[0],
            enrollmentsUsers: users.slice(0, 100),
          },
          {
            name: "Pharmacology",
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
                "reference",
                "name",
                "nextConversationReference"
              )
              VALUES (
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${name},
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
              INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
              VALUES (
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
            const user = Math.random() < 0.2 ? lodash.sample(users)! : null;
            database.run(
              sql`
                INSERT INTO "invitations" (
                  "expiresAt",
                  "usedAt",
                  "course",
                  "reference",
                  "email",
                  "name",
                  "role"
                )
                VALUES (
                  ${expiresAt},
                  ${
                    user === null || Math.random() < 0.4
                      ? null
                      : new Date(
                          (expiresAt === null
                            ? Date.now()
                            : new Date(expiresAt).getTime()) -
                            lodash.random(20 * 24 * 60 * 60 * 1000)
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
                    INSERT INTO "enrollments" ("user", "course", "reference", "role", "accentColor")
                    VALUES (
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
                    INSERT INTO "tags" ("course", "reference", "name", "staffOnlyAt")
                    VALUES (
                      ${course.id},
                      ${cryptoRandomString({ length: 10, type: "numeric" })},
                      ${name},
                      ${staffOnlyAt}
                    )
                    RETURNING *
                  `
              )!
          );

          let conversationCreatedAt = new Date(
            Date.now() +
              lodash.random(
                -50 * 24 * 60 * 60 * 1000,
                -30 * 24 * 60 * 60 * 1000
              )
          ).toISOString();
          for (
            let conversationReference = 1;
            conversationReference < course.nextConversationReference;
            conversationReference++
          ) {
            conversationCreatedAt = new Date(
              new Date(conversationCreatedAt).getTime() +
                lodash.random(6 * 60 * 60 * 1000, 18 * 60 * 60 * 1000)
            ).toISOString();
            // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
            const title = lodash.capitalize(
              faker.lorem.words(lodash.random(1, 10))
            );
            const conversation = database.get<{
              id: number;
              title: string;
              nextMessageReference: number;
            }>(
              sql`
                SELECT * FROM "conversations" WHERE "id" = ${Number(
                  database.run(
                    sql`
                      INSERT INTO "conversations" (
                        "course",
                        "reference",
                        "title",
                        "titleSearch",
                        "nextMessageReference",
                        "type",
                        "pinnedAt",
                        "staffOnlyAt"
                      )
                      VALUES (
                        ${course.id},
                        ${String(conversationReference)},
                        ${title},
                        ${html`${title}`},
                        ${lodash.random(2, 13)},
                        ${
                          conversationTypes[
                            Math.random() < 0.7
                              ? 1
                              : Math.random() < 0.7
                              ? 0
                              : 2
                          ]
                        },
                        ${
                          Math.random() < 0.05 ? new Date().toISOString() : null
                        },
                        ${
                          Math.random() < 0.25 ? new Date().toISOString() : null
                        }
                      )
                    `
                  ).lastInsertRowid
                )}
              `
            )!;

            database.run(
              sql`
                INSERT INTO "taggings" ("conversation", "tag")
                VALUES (
                  ${conversation.id},
                  ${lodash.sample(tags)!.id}
                )
              `
            );

            let messageCreatedAt = conversationCreatedAt;
            for (
              let messageReference = 1;
              messageReference < conversation.nextMessageReference;
              messageReference++
            ) {
              messageCreatedAt = new Date(
                new Date(messageCreatedAt).getTime() +
                  lodash.random(12 * 60 * 60 * 1000)
              ).toISOString();
              const content = faker.lorem.paragraphs(
                lodash.random(1, 6),
                "\n\n"
              );
              const processedContent = markdownProcessor({
                req,
                res,
                markdown: content,
              });
              // FIXME: https://github.com/JoshuaWise/better-sqlite3/issues/654
              const message = database.get<{ id: number }>(
                sql`
                  SELECT * FROM "messages" WHERE "id" = ${Number(
                    database.run(
                      sql`
                        INSERT INTO "messages" (
                          "createdAt",
                          "updatedAt",
                          "conversation",
                          "reference",
                          "authorEnrollment",
                          "content",
                          "contentSearch",
                          "answerAt",
                          "anonymousAt"
                        )
                        VALUES (
                          ${messageCreatedAt},
                          ${
                            Math.random() < 0.8
                              ? null
                              : new Date(
                                  new Date(messageCreatedAt).getTime() +
                                    lodash.random(
                                      5 * 60 * 60 * 1000,
                                      18 * 60 * 60 * 1000
                                    )
                                ).toISOString()
                          },
                          ${conversation.id},
                          ${String(messageReference)},
                          ${lodash.sample(enrollments)!.id},
                          ${content},
                          ${processedContent.text},
                          ${
                            Math.random() < 0.5
                              ? new Date().toISOString()
                              : null
                          },
                          ${
                            Math.random() < 0.25
                              ? new Date().toISOString()
                              : null
                          }
                        )
                      `
                    ).lastInsertRowid
                  )}
                `
              )!;

              for (const enrollment of lodash.sampleSize(
                staff,
                Math.random() < 0.8 ? 0 : lodash.random(2)
              ))
                database.run(
                  sql`
                    INSERT INTO "endorsements" ("message", "enrollment")
                    VALUES (${message.id}, ${enrollment.id})
                  `
                );

              for (const enrollment of lodash.sampleSize(
                enrollments,
                Math.random() < 0.5 ? 0 : lodash.random(5)
              ))
                database.run(
                  sql`
                    INSERT INTO "likes" ("message", "enrollment")
                    VALUES (${message.id}, ${enrollment.id})
                  `
                );
            }
          }
        }

        Session.open(req, res, demonstrationUser.id);
        Flash.set(
          req,
          res,
          html`
            <div class="flash--green">
              <p>
                Demonstration data including users, courses, conversations, and
                so forth, have been created and you’ve been signed in as a
                demonstration user to give you a better idea of what CourseLore
                looks like in use. If you wish to sign in as another one of the
                demonstration users, their password is “courselore”.
              </p>
            </div>
          `
        );
        res.redirect(url);
      })
    );

  if (demonstration && process.env.NODE_ENV !== "production")
    app.delete<{}, any, {}, {}, {}>("/turn-off", (req, res, next) => {
      res.send(`Thanks for trying CourseLore.`);
      process.exit(0);
    });

  app.all<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "*",
    ...isSignedInMiddleware,
    (req, res) => {
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
              course staff or the
              <a href="${administrator}" class="link">system administrator</a>.
            </p>
          `,
        })
      );
    }
  );

  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...isSignedOutMiddleware,
    (req, res) => {
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
              Either this page doesn’t exist, or you must sign in or sign up to
              see it.
            </p>
            <div
              style="${css`
                display: flex;
                gap: var(--space--4);
                & > * {
                  flex: 1;
                }
              `}"
            >
              <a
                href="${url}/sign-up?${qs.stringify({
                  redirect: req.originalUrl,
                })}"
                class="button button--blue"
              >
                <i class="bi bi-person-plus"></i>
                Sign up
              </a>
              <a
                href="${url}/sign-in?${qs.stringify({
                  redirect: req.originalUrl,
                })}"
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

  app.use(((err, req, res, next) => {
    console.error(err);
    const isValidation = err === "validation";
    const message = isValidation ? "Validation" : "Server";
    res.status(isValidation ? 422 : 500).send(
      boxLayout({
        req,
        res,
        head: html`<title>${message} Error · CourseLore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-bug"></i>
            ${message} Error
          </h2>
          <p>This is an issue in CourseLore.</p>
          <a href="mailto:issues@courselore.org" class="button button--blue">
            <i class="bi bi-envelope"></i>
            Report to issues@courselore.org
          </a>
        `,
      })
    );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, {}>);

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
    searchPhrases: string | string[]
  ): HTML =>
    searchResult.replace(
      new RegExp(
        `${(typeof searchPhrases === "string"
          ? splitSearchPhrases(searchPhrases)
          : searchPhrases
        )
          .map((searchPhrase) => escapeStringRegexp(searchPhrase))
          .join("|")}`,
        "gi"
      ),
      (searchPhrase) =>
        html`<mark class="search-result-highlight">$${searchPhrase}</mark>`
    );

  const splitSearchPhrases = (search: string): string[] => search.split(/\s+/);

  return app;
}

if (require.main === module)
  require(path.resolve(
    process.argv[2] ?? path.join(__dirname, "../configuration/demonstration.js")
  ))(require);
