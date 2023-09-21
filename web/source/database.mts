import path from "node:path";
import fs from "node:fs/promises";
import html from "@leafac/html";
import sql, { Database } from "@leafac/sqlite";
import dedent from "dedent";
import escapeStringRegexp from "escape-string-regexp";
import cryptoRandomString from "crypto-random-string";
import * as sanitizeXMLCharacters from "sanitize-xml-string";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import * as shiki from "shiki";
import rehypeParse from "rehype-parse";
import { visit as unistUtilVisit } from "unist-util-visit";
import { toString as hastUtilToString } from "hast-util-to-string";
import rehypeStringify from "rehype-stringify";
import { JSDOM } from "jsdom";
import prompts from "prompts";
import sharp from "sharp";
import forge from "node-forge";
import { Application } from "./index.mjs";

export type ApplicationDatabase = {
  database: Database;
};

export default async (application: Application): Promise<void> => {
  await fs.mkdir(application.configuration.dataDirectory, { recursive: true });
  application.database = new Database(
    path.join(
      application.configuration.dataDirectory,
      `${application.name}.db`,
    ),
  );

  process.once("exit", () => {
    application.database.close();
  });

  if (application.process.type !== "main") return;

  application.log("DATABASE MIGRATION", "STARTING...");

  application.database.pragma("journal_mode = WAL");

  await application.database.migrate(
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
    `,

    sql`
      ALTER TABLE "conversations" ADD COLUMN "resolvedAt" TEXT NULL;
    `,

    sql`
      CREATE INDEX "conversationsResolvedAtIndex" ON "conversations" ("resolvedAt");
    `,

    sql`
      DELETE FROM "readings" WHERE "id" IN (
        SELECT "readings"."id"
        FROM "readings"
        JOIN "enrollments" ON
          "readings"."enrollment" = "enrollments"."id" AND
          "enrollments"."role" = 'student'
        JOIN "messages" ON "readings"."message" = "messages"."id"
        JOIN "conversations" ON
          "messages"."conversation" = "conversations"."id" AND
          "conversations"."staffOnlyAt" IS NOT NULL AND
          NOT EXISTS(
            SELECT TRUE
            FROM "messages"
            WHERE
              "enrollments"."id" = "messages"."authorEnrollment" AND
              "conversations"."id" = "messages"."conversation"
          )
      );
    `,

    () => {
      const makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork =
        (text: string): string =>
          text.replace(
            new RegExp(
              `(?<=https://${escapeStringRegexp(
                application.configuration.hostname,
              )}/courses/\\d+/conversations/\\d+)#message--(?=\\d+)`,
              "gi",
            ),
            "?messageReference=",
          );
      for (const user of application.database.all<{
        id: number;
        biographySource: string | null;
        biographyPreprocessed: string | null;
      }>(
        sql`
          SELECT "id", "biographySource", "biographyPreprocessed"
          FROM "users"
          ORDER BY "id"
        `,
      ))
        if (
          user.biographySource !== null &&
          user.biographyPreprocessed !== null
        )
          application.database.run(
            sql`
              UPDATE "users"
              SET
                "biographySource" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                  user.biographySource,
                )},
                "biographyPreprocessed" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                  user.biographyPreprocessed,
                )}
              WHERE "id" = ${user.id}
            `,
          );
      for (const message of application.database.all<{
        id: number;
        contentSource: string;
        contentPreprocessed: string;
        contentSearch: string;
      }>(
        sql`
          SELECT "id", "contentSource", "contentPreprocessed", "contentSearch"
          FROM "messages"
          ORDER BY "id"
        `,
      ))
        application.database.run(
          sql`
            UPDATE "messages"
            SET
              "contentSource" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                message.contentSource,
              )},
              "contentPreprocessed" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                message.contentPreprocessed,
              )},
              "contentSearch" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                message.contentSearch,
              )}
            WHERE "id" = ${message.id}
          `,
        );
    },

    sql`
      DROP TABLE "flashes";
      CREATE TABLE "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "theme" TEXT NOT NULL,
        "content" TEXT NOT NULL
      );
      CREATE INDEX "flashesCreatedAtIndex" ON "flashes" (datetime("createdAt"));
    `,

    sql`
      DROP INDEX "flashesCreatedAtIndex";
      CREATE INDEX "flashesCreatedAtIndex" ON "flashes" ("createdAt");
    `,

    sql`
      CREATE TABLE "conversationDrafts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "type" TEXT NULL,
        "isPinned" TEXT NULL,
        "isStaffOnly" TEXT NULL,
        "title" TEXT NULL,
        "content" TEXT NULL,
        "tagsReferences" TEXT NULL,
        UNIQUE ("course", "reference")
      );
    `,

    sql`
      DROP TABLE "conversationDrafts";
      CREATE TABLE "conversationDrafts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "type" TEXT NULL,
        "isPinned" TEXT NULL,
        "isStaffOnly" TEXT NULL,
        "title" TEXT NULL,
        "content" TEXT NULL,
        "tagsReferences" TEXT NULL,
        UNIQUE ("course", "reference")
      );
    `,

    () => {
      const changeMessageReferencePermanentLinkQueryParameter = (
        text: string,
      ): string =>
        text.replace(
          new RegExp(
            `(?<=https://${escapeStringRegexp(
              application.configuration.hostname,
            )}/courses/\\d+/conversations/\\d+)\\?messageReference=(?=\\d+)`,
            "gi",
          ),
          "?messages%5BmessageReference%5D=",
        );
      for (const user of application.database.all<{
        id: number;
        biographySource: string | null;
        biographyPreprocessed: string | null;
      }>(
        sql`
          SELECT "id", "biographySource", "biographyPreprocessed"
          FROM "users"
          ORDER BY "id"
        `,
      ))
        if (
          user.biographySource !== null &&
          user.biographyPreprocessed !== null
        )
          application.database.run(
            sql`
              UPDATE "users"
              SET
                "biographySource" = ${changeMessageReferencePermanentLinkQueryParameter(
                  user.biographySource,
                )},
                "biographyPreprocessed" = ${changeMessageReferencePermanentLinkQueryParameter(
                  user.biographyPreprocessed,
                )}
              WHERE "id" = ${user.id}
            `,
          );
      for (const message of application.database.all<{
        id: number;
        contentSource: string;
        contentPreprocessed: string;
        contentSearch: string;
      }>(
        sql`
          SELECT "id", "contentSource", "contentPreprocessed", "contentSearch"
          FROM "messages"
          ORDER BY "id"
        `,
      ))
        application.database.run(
          sql`
            UPDATE "messages"
            SET
              "contentSource" = ${changeMessageReferencePermanentLinkQueryParameter(
                message.contentSource,
              )},
              "contentPreprocessed" = ${changeMessageReferencePermanentLinkQueryParameter(
                message.contentPreprocessed,
              )},
              "contentSearch" = ${changeMessageReferencePermanentLinkQueryParameter(
                message.contentSearch,
              )}
            WHERE "id" = ${message.id}
          `,
        );
    },

    sql`
      ALTER TABLE "courses" ADD COLUMN "archivedAt" TEXT NULL;
    `,

    sql`
      UPDATE "users"
      SET "emailNotifications" = 'mentions'
      WHERE "emailNotifications" = 'staff-announcements-and-mentions';

      UPDATE "conversations"
      SET "type" = 'note'
      WHERE "type" = 'announcement';
    `,

    sql`
      DROP INDEX "emailConfirmationsCreatedAtIndex";
      ALTER TABLE "emailConfirmations" RENAME TO "emailVerifications";
      CREATE INDEX "emailVerificationsCreatedAtIndex" ON "emailVerifications" ("createdAt");
      ALTER TABLE "users" RENAME COLUMN "emailConfirmedAt" TO "emailVerifiedAt";
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NOT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "emailNotifications" TEXT NOT NULL
          );
        `,
      );
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        emailNotifications: string;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "emailNotifications"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "emailNotifications"
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${cryptoRandomString({ length: 20, type: "numeric" })},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${user.emailNotifications}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NOT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "emailNotificationsForAllMessagesAt" TEXT NULL,
            "emailNotificationsForMentionsAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsYouStartedAt" TEXT NULL,
            "emailNotificationsDigestsFrequency" TEXT NULL
          );
        `,
      );
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        emailNotifications: "all-messages" | "mentions" | "none";
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "emailNotifications"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "emailNotificationsForAllMessagesAt",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt",
              "emailNotificationsDigestsFrequency"
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${user.reference},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${
                user.emailNotifications === "all-messages"
                  ? new Date().toISOString()
                  : null
              },
              ${
                user.emailNotifications !== "none"
                  ? new Date().toISOString()
                  : null
              },
              ${
                user.emailNotifications !== "none"
                  ? new Date().toISOString()
                  : null
              },
              ${
                user.emailNotifications !== "none"
                  ? new Date().toISOString()
                  : null
              },
              ${user.emailNotifications === "mentions" ? "daily" : null}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    sql`
      ALTER TABLE "invitations" RENAME COLUMN "role" TO "courseRole";
      ALTER TABLE "enrollments" RENAME COLUMN "role" TO "courseRole";
    `,

    sql`
      CREATE TABLE "administrationOptions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT CHECK ("id" = 1),
        "userSystemRolesWhoMayCreateCourses" TEXT NOT NULL
      );

      INSERT INTO "administrationOptions" ("userSystemRolesWhoMayCreateCourses") VALUES ('all');
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NOT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "systemRole" TEXT NOT NULL,
            "emailNotificationsForAllMessagesAt" TEXT NULL,
            "emailNotificationsForMentionsAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsYouStartedAt" TEXT NULL,
            "emailNotificationsDigestsFrequency" TEXT NULL
          );
        `,
      );
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        emailNotificationsForAllMessagesAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
          | string
          | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
        emailNotificationsDigestsFrequency: "hourly" | "daily" | null;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "emailNotificationsForAllMessagesAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt",
            "emailNotificationsDigestsFrequency"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "systemRole",
              "emailNotificationsForAllMessagesAt",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt",
              "emailNotificationsDigestsFrequency"
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${user.reference},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${"none"},
              ${user.emailNotificationsForAllMessagesAt},
              ${user.emailNotificationsForMentionsAt},
              ${
                user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt
              },
              ${user.emailNotificationsForMessagesInConversationsYouStartedAt},
              ${user.emailNotificationsDigestsFrequency}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    async () => {
      const users = application.database.all<{
        id: number;
        email: string;
        name: string;
      }>(
        sql`
          SELECT "id", "email", "name" FROM "users" ORDER BY "id" ASC
        `,
      );
      if (users.length === 0) return;
      if (!process.stdin.isTTY)
        throw new Error(
          "This update requires that you answer some prompts. Please run Courselore interactively (for example, ‘./courselore configuration.mjs’ on the command line) instead of through a service manager (for example, systemd).",
        );
      while (true) {
        const user = (
          await prompts({
            type: "autocomplete",
            name: "output",
            message:
              "Courselore 4.0.0 introduces an administration interface and the role of system administrators. Please select a user to become the first administrator.",
            choices: users.map((user) => ({
              title: `${user.name} <${user.email}>`,
              value: user,
            })),
          })
        ).output;
        if (
          !(
            await prompts({
              type: "confirm",
              name: "output",
              message: `${user.name} <${user.email}> will become the first administrator. Is this correct?`,
              initial: true,
            })
          ).output
        )
          continue;
        application.database.run(
          sql`
            UPDATE "users" SET "systemRole" = 'administrator' WHERE "id" = ${user.id}
          `,
        );
        await prompts({
          type: "text",
          name: "output",
          message: `${user.name} <${user.email}> has become the first administrator. Press enter to continue...`,
        });
        break;
      }
    },

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NOT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "systemRole" TEXT NOT NULL,
            "emailNotificationsForAllMessages" TEXT NOT NULL,
            "emailNotificationsForAllMessagesDigestDeliveredAt" TEXT NULL,
            "emailNotificationsForMentionsAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsYouStartedAt" TEXT NULL
          );
        `,
      );
      const hour = new Date();
      hour.setUTCMinutes(0, 0, 0);
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        systemRole: "none" | "staff" | "administrator";
        emailNotificationsForAllMessagesAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
          | string
          | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
        emailNotificationsDigestsFrequency: "hourly" | "daily" | null;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "systemRole",
            "emailNotificationsForAllMessagesAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt",
            "emailNotificationsDigestsFrequency"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "systemRole",
              "emailNotificationsForAllMessages",
              "emailNotificationsForAllMessagesDigestDeliveredAt",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt" 
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${user.reference},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${user.systemRole},
              ${
                user.emailNotificationsForAllMessagesAt === null
                  ? "none"
                  : user.emailNotificationsDigestsFrequency === null
                  ? "instant"
                  : user.emailNotificationsDigestsFrequency === "hourly"
                  ? "hourly-digests"
                  : user.emailNotificationsDigestsFrequency === "daily"
                  ? "daily-digests"
                  : null
              },
              ${
                user.emailNotificationsForAllMessagesAt === null
                  ? null
                  : user.emailNotificationsDigestsFrequency === null
                  ? null
                  : user.emailNotificationsDigestsFrequency === "hourly"
                  ? hour.toISOString()
                  : user.emailNotificationsDigestsFrequency === "daily"
                  ? day.toISOString()
                  : null
              },
              ${user.emailNotificationsForMentionsAt},
              ${
                user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt
              },
              ${user.emailNotificationsForMessagesInConversationsYouStartedAt}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    sql`
      ALTER TABLE "notificationDeliveries" RENAME TO "emailNotificationDeliveries";

      CREATE TABLE "emailNotificationMessageJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "startAt" TEXT NOT NULL,
        "startedAt" TEXT NULL,
        "expiresAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE
      );
      CREATE INDEX "emailNotificationMessageJobsStartAtIndex" ON "emailNotificationMessageJobs" ("startAt");
      CREATE INDEX "emailNotificationMessageJobsStartedAtIndex" ON "emailNotificationMessageJobs" ("startedAt");
      CREATE INDEX "emailNotificationMessageJobsExpiresAtIndex" ON "emailNotificationMessageJobs" ("expiresAt");

      CREATE TABLE "emailNotificationDigestMessages" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "enrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
        UNIQUE ("message", "enrollment") ON CONFLICT IGNORE
      );
      CREATE INDEX "emailNotificationDigestMessagesEnrollmentIndex" ON "emailNotificationDigestMessages" ("enrollment");

      CREATE TABLE "emailNotificationDigestJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "startedAt" TEXT NOT NULL,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
      CREATE INDEX "emailNotificationDigestJobsStartedAtIndex" ON "emailNotificationDigestJobs" ("startedAt");
      CREATE INDEX "emailNotificationDigestJobsUserIndex" ON "emailNotificationDigestJobs" ("user");
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_conversations" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "updatedAt" TEXT NULL,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
            "participants" TEXT NOT NULL,
            "anonymousAt" TEXT NULL,
            "type" TEXT NOT NULL,
            "pinnedAt" TEXT NULL,
            "resolvedAt" TEXT NULL,
            "title" TEXT NOT NULL,
            "titleSearch" TEXT NOT NULL,
            "nextMessageReference" INTEGER NOT NULL,
            UNIQUE ("course", "reference")
          );

          CREATE TABLE "conversationSelectedParticipants" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
            "enrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
            UNIQUE ("conversation", "enrollment") ON CONFLICT IGNORE
          );
          
          CREATE INDEX "conversationSelectedParticipantsConversationIndex" ON "conversationSelectedParticipants" ("conversation");
          CREATE INDEX "conversationSelectedParticipantsEnrollmentIndex" ON "conversationSelectedParticipants" ("enrollment");
        `,
      );

      for (const conversation of application.database.all<{
        id: number;
        createdAt: string;
        updatedAt: string | null;
        course: number;
        reference: string;
        authorEnrollment: number | null;
        anonymousAt: string | null;
        type: string;
        pinnedAt: string | null;
        staffOnlyAt: string | null;
        title: string;
        titleSearch: string;
        nextMessageReference: number;
        resolvedAt: string | null;
      }>(
        sql`
          SELECT
            "id",
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
            "nextMessageReference",
            "resolvedAt"
          FROM "conversations"
        `,
      )) {
        application.database.run(
          sql`
            INSERT INTO "new_conversations" (
              "id",
              "createdAt",
              "updatedAt",
              "course",
              "reference",
              "authorEnrollment",
              "participants",
              "anonymousAt",
              "type",
              "pinnedAt",
              "resolvedAt",
              "title",
              "titleSearch",
              "nextMessageReference"
            ) VALUES (
              ${conversation.id},
              ${conversation.createdAt},
              ${conversation.updatedAt},
              ${conversation.course},
              ${conversation.reference},
              ${conversation.authorEnrollment},
              ${conversation.staffOnlyAt === null ? "everyone" : "staff"},
              ${conversation.anonymousAt},
              ${conversation.type},
              ${conversation.pinnedAt},
              ${conversation.resolvedAt},
              ${conversation.title},
              ${conversation.titleSearch},
              ${conversation.nextMessageReference}
            )
          `,
        );
        if (conversation.staffOnlyAt !== null)
          for (const enrollment of application.database.all<{
            id: number;
          }>(
            sql`
              SELECT "enrollments"."id"
              FROM "enrollments"
              LEFT JOIN "conversations" ON
                "enrollments"."id" = "conversations"."authorEnrollment" AND
                "conversations"."id" = ${conversation.id}
              LEFT JOIN "messages" ON
                "enrollments"."id" = "messages"."authorEnrollment" AND
                "messages"."conversation" = ${conversation.id}
              WHERE
                "enrollments"."courseRole" = 'student' AND (
                  "conversations"."id" IS NOT NULL OR
                  "messages"."id" IS NOT NULL
                )
              GROUP BY "enrollments"."id"
            `,
          ))
            application.database.run(
              sql`
                INSERT INTO "conversationSelectedParticipants" (
                  "createdAt",
                  "conversation",
                  "enrollment"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${conversation.id},
                  ${enrollment.id}
                )
              `,
            );
      }

      application.database.execute(
        sql`
          DROP TABLE "conversations";
          ALTER TABLE "new_conversations" RENAME TO "conversations";
          CREATE INDEX "conversationsCourseIndex" ON "conversations" ("course");
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
          CREATE INDEX "conversationsParticipantsIndex" ON "conversations" ("participants");
          CREATE INDEX "conversationsTypeIndex" ON "conversations" ("type");
          CREATE INDEX "conversationsPinnedAtIndex" ON "conversations" ("pinnedAt");
          CREATE INDEX "conversationsResolvedAtIndex" ON "conversations" ("resolvedAt");
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
        `,
      );
    },

    sql`
      ALTER TABLE "conversations" ADD COLUMN "announcementAt" TEXT NULL;
    `,

    sql`
      DELETE FROM "sessions";
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_administrationOptions" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT CHECK ("id" = 1),
            "userSystemRolesWhoMayCreateCourses" TEXT NOT NULL,
            "latestVersion" TEXT NOT NULL
          );
        `,
      );
      const administrationOptions = application.database.get<{
        userSystemRolesWhoMayCreateCourses: string;
      }>(
        sql`
          SELECT "userSystemRolesWhoMayCreateCourses" FROM "administrationOptions"
        `,
      );
      if (administrationOptions === undefined)
        throw new Error("Failed to find ‘administrationOptions’");
      application.database.run(
        sql`
          INSERT INTO "new_administrationOptions" (
            "userSystemRolesWhoMayCreateCourses",
            "latestVersion"
          )
          VALUES (
            ${administrationOptions.userSystemRolesWhoMayCreateCourses},
            ${application.version}
        )
      `,
      );
      application.database.execute(
        sql`
          DROP TABLE "administrationOptions";
          ALTER TABLE "new_administrationOptions" RENAME TO "administrationOptions";
        `,
      );
    },

    sql`
      CREATE TABLE "liveConnectionsMetadata" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "expiresAt" TEXT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "url" TEXT NOT NULL,
        "processNumber" INTEGER NULL,
        "liveUpdateAt" TEXT NULL
      );
      CREATE INDEX "liveConnectionsMetadataExpiresAtIndex" ON "liveConnectionsMetadata" ("expiresAt");
      CREATE INDEX "liveConnectionsMetadataNonceIndex" ON "liveConnectionsMetadata" ("nonce");
      CREATE INDEX "liveConnectionsMetadataURLIndex" ON "liveConnectionsMetadata" ("url");
      CREATE INDEX "liveConnectionsMetadataProcessNumberIndex" ON "liveConnectionsMetadata" ("processNumber");
      CREATE INDEX "liveConnectionsMetadataLiveUpdateAtIndex" ON "liveConnectionsMetadata" ("liveUpdateAt");
    `,

    sql`
      CREATE INDEX "sessionsTokenIndex" ON "sessions" ("token");
      CREATE INDEX "sessionsUserIndex" ON "sessions" ("user");
    `,

    async () => {
      for (const user of application.database.all<{
        id: number;
        avatar: string;
      }>(
        sql`
          SELECT "id", "avatar"
          FROM "users"
          WHERE "avatar" IS NOT NULL
        `,
      )) {
        if (
          !user.avatar.startsWith(
            `https://${application.configuration.hostname}/files/`,
          ) ||
          !user.avatar.endsWith(`--avatar${path.extname(user.avatar)}`)
        )
          continue;

        const fileURL = user.avatar.slice(
          `https://${application.configuration.hostname}/files/`.length,
        );
        const directory = path.dirname(fileURL);
        const nameOldAvatar = decodeURIComponent(path.basename(fileURL));
        const extension = path.extname(nameOldAvatar);
        const name =
          nameOldAvatar.slice(0, -"--avatar".length - extension.length) +
          extension;
        const nameAvatar = `${name.slice(0, -extension.length)}--avatar.webp`;
        const file = path.join(
          application.configuration.dataDirectory,
          "files",
          directory,
          name,
        );

        try {
          await sharp(file)
            .rotate()
            .resize({
              width: 256 /* var(--space--64) */,
              height: 256 /* var(--space--64) */,
              position: sharp.strategy.attention,
            })
            .toFile(
              path.join(
                application.configuration.dataDirectory,
                "files",
                directory,
                nameAvatar,
              ),
            );
        } catch (error: any) {
          application.log(
            "DATABASE MIGRATION ERROR: FAILED TO CONVERT AVATAR TO WEBP",
            String(error),
            error?.stack,
          );
          continue;
        }

        application.database.run(
          sql`
            UPDATE "users"
            SET "avatar" = ${`https://${
              application.configuration.hostname
            }/files/${directory}/${encodeURIComponent(nameAvatar)}`}
            WHERE "id" = ${user.id}
          `,
        );
      }
    },

    sql`
      ALTER TABLE "users" ADD COLUMN "preferContentEditorProgrammerModeAt" TEXT NULL;
      ALTER TABLE "users" ADD COLUMN "preferContentEditorToolbarInCompactAt" TEXT NULL;
      ALTER TABLE "users" ADD COLUMN "preferAnonymousAt" TEXT NULL;

      CREATE TABLE "messageDrafts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "authorEnrollment" INTEGER NOT NULL REFERENCES "enrollments" ON DELETE CASCADE,
        "answerAt" TEXT NULL,
        "contentSource" TEXT NOT NULL,
        UNIQUE ("conversation", "authorEnrollment") ON CONFLICT REPLACE
      );
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_tags" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "order" INTEGER NOT NULL,
            "name" TEXT NOT NULL,
            "staffOnlyAt" TEXT NULL,
            UNIQUE ("course", "reference")
          );
        `,
      );

      let previousCourse = -1;
      let order = -1;
      for (const tag of application.database.all<{
        id: number;
        createdAt: string;
        course: number;
        reference: string;
        name: string;
        staffOnlyAt: string | null;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "course",
            "reference",
            "name",
            "staffOnlyAt"
          FROM "tags"
          ORDER BY
            "course" ASC,
            "id" ASC
        `,
      )) {
        if (previousCourse !== tag.course) order = 0;
        application.database.run(
          sql`
            INSERT INTO "new_tags" (
              "id",
              "createdAt",
              "course",
              "reference",
              "order",
              "name",
              "staffOnlyAt"
            )
            VALUES (
              ${tag.id},
              ${tag.createdAt},
              ${tag.course},
              ${tag.reference},
              ${order},
              ${tag.name},
              ${tag.staffOnlyAt}
            )
          `,
        );
        previousCourse = tag.course;
        order++;
      }

      application.database.execute(
        sql`
          DROP TABLE "tags";
          ALTER TABLE "new_tags" RENAME TO "tags";
          CREATE INDEX "tagsCourseIndex" ON "tags" ("course");
        `,
      );
    },

    sql`
      CREATE TABLE "messagePolls" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        "multipleChoicesAt" TEXT NULL,
        "closesAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
      
      CREATE TABLE "messagePollOptions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "messagePoll" INTEGER NOT NULL REFERENCES "messagePolls" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        "contentSource" TEXT NOT NULL,
        "contentPreprocessed" TEXT NOT NULL,
        UNIQUE ("messagePoll", "reference")
      );
      
      CREATE TABLE "messagePollVotes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "messagePollOption" INTEGER NOT NULL REFERENCES "messagePollOptions" ON DELETE CASCADE,
        "enrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
        UNIQUE ("messagePollOption", "enrollment")
      );
      
      ALTER TABLE "courses" ADD COLUMN "studentsMayCreatePollsAt" TEXT NULL;

      UPDATE "courses"
      SET "studentsMayCreatePollsAt" = ${new Date().toISOString()};
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NOT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "systemRole" TEXT NOT NULL,
            "emailNotificationsForAllMessages" TEXT NOT NULL,
            "emailNotificationsForAllMessagesDigestDeliveredAt" TEXT NULL,
            "emailNotificationsForMentionsAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsYouStartedAt" TEXT NULL,
            "preferContentEditorProgrammerModeAt" TEXT NULL,
            "preferContentEditorToolbarInCompactAt" TEXT NULL,
            "preferAnonymousAt" TEXT NULL,
            "latestNewsVersion" TEXT NOT NULL
          );
        `,
      );
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        systemRole: "none" | "staff" | "administrator";
        emailNotificationsForAllMessages:
          | "none"
          | "instant"
          | "hourly-digests"
          | "daily-digests";
        emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
          | string
          | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
        preferContentEditorProgrammerModeAt: string | null;
        preferContentEditorToolbarInCompactAt: string | null;
        preferAnonymousAt: string | null;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "systemRole",
            "emailNotificationsForAllMessages",
            "emailNotificationsForAllMessagesDigestDeliveredAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt",
            "preferContentEditorProgrammerModeAt",
            "preferContentEditorToolbarInCompactAt",
            "preferAnonymousAt"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "systemRole",
              "emailNotificationsForAllMessages",
              "emailNotificationsForAllMessagesDigestDeliveredAt",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt",
              "preferContentEditorProgrammerModeAt",
              "preferContentEditorToolbarInCompactAt",
              "preferAnonymousAt",
              "latestNewsVersion"
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${user.reference},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${user.systemRole},
              ${user.emailNotificationsForAllMessages},
              ${user.emailNotificationsForAllMessagesDigestDeliveredAt},
              ${user.emailNotificationsForMentionsAt},
              ${
                user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt
              },
              ${user.emailNotificationsForMessagesInConversationsYouStartedAt},
              ${user.preferContentEditorProgrammerModeAt},
              ${user.preferContentEditorToolbarInCompactAt},
              ${user.preferAnonymousAt},
              ${"6.0.10"}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    sql`
      CREATE TABLE "samlCache" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "samlIdentifier" TEXT NOT NULL,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL
      );

      CREATE INDEX "samlCacheCreatedAtIndex" ON "samlCache" ("createdAt");

      DELETE FROM "sessions";
      
      ALTER TABLE "sessions" ADD COLUMN "samlIdentifier" TEXT NULL;
      ALTER TABLE "sessions" ADD COLUMN "samlSessionIndex" TEXT NULL;
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_users" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "lastSeenOnlineAt" TEXT NOT NULL,
            "reference" TEXT NOT NULL UNIQUE,
            "email" TEXT NOT NULL UNIQUE COLLATE NOCASE,
            "password" TEXT NULL,
            "emailVerifiedAt" TEXT NULL,
            "name" TEXT NOT NULL,
            "nameSearch" TEXT NOT NULL,
            "avatar" TEXT NULL,
            "avatarlessBackgroundColor" TEXT NOT NULL,
            "biographySource" TEXT NULL,
            "biographyPreprocessed" TEXT NULL,
            "systemRole" TEXT NOT NULL,
            "emailNotificationsForAllMessages" TEXT NOT NULL,
            "emailNotificationsForAllMessagesDigestDeliveredAt" TEXT NULL,
            "emailNotificationsForMentionsAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" TEXT NULL,
            "emailNotificationsForMessagesInConversationsYouStartedAt" TEXT NULL,
            "preferContentEditorProgrammerModeAt" TEXT NULL,
            "preferContentEditorToolbarInCompactAt" TEXT NULL,
            "preferAnonymousAt" TEXT NULL,
            "latestNewsVersion" TEXT NOT NULL
          );
        `,
      );
      for (const user of application.database.all<{
        id: number;
        createdAt: string;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        nameSearch: string;
        avatar: string | null;
        avatarlessBackgroundColor: string;
        biographySource: string | null;
        biographyPreprocessed: string | null;
        systemRole: "none" | "staff" | "administrator";
        emailNotificationsForAllMessages:
          | "none"
          | "instant"
          | "hourly-digests"
          | "daily-digests";
        emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
          | string
          | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
        preferContentEditorProgrammerModeAt: string | null;
        preferContentEditorToolbarInCompactAt: string | null;
        preferAnonymousAt: string | null;
        latestNewsVersion: string;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "systemRole",
            "emailNotificationsForAllMessages",
            "emailNotificationsForAllMessagesDigestDeliveredAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt",
            "preferContentEditorProgrammerModeAt",
            "preferContentEditorToolbarInCompactAt",
            "preferAnonymousAt",
            "latestNewsVersion"
          FROM "users"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_users" (
              "id",
              "createdAt",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "nameSearch",
              "avatar",
              "avatarlessBackgroundColor",
              "biographySource",
              "biographyPreprocessed",
              "systemRole",
              "emailNotificationsForAllMessages",
              "emailNotificationsForAllMessagesDigestDeliveredAt",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt",
              "preferContentEditorProgrammerModeAt",
              "preferContentEditorToolbarInCompactAt",
              "preferAnonymousAt",
              "latestNewsVersion"
            )
            VALUES (
              ${user.id},
              ${user.createdAt},
              ${user.lastSeenOnlineAt},
              ${user.reference},
              ${user.email},
              ${user.password},
              ${user.emailVerifiedAt},
              ${user.name},
              ${user.nameSearch},
              ${user.avatar},
              ${user.avatarlessBackgroundColor},
              ${user.biographySource},
              ${user.biographyPreprocessed},
              ${user.systemRole},
              ${user.emailNotificationsForAllMessages},
              ${user.emailNotificationsForAllMessagesDigestDeliveredAt},
              ${user.emailNotificationsForMentionsAt},
              ${user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt},
              ${user.emailNotificationsForMessagesInConversationsYouStartedAt},
              ${user.preferContentEditorProgrammerModeAt},
              ${user.preferContentEditorToolbarInCompactAt},
              ${user.preferAnonymousAt},
              ${user.latestNewsVersion}
            )
          `,
        );
      application.database.execute(
        sql`
          DROP TABLE "users";
          ALTER TABLE "new_users" RENAME TO "users";
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
        `,
      );
    },

    sql`
      ALTER TABLE "messageDrafts" DROP COLUMN "answerAt";
    `,

    () => {
      application.database.execute(
        sql`
          CREATE TABLE "new_messages" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "updatedAt" TEXT NULL,
            "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "authorEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL,
            "anonymousAt" TEXT NULL,
            "type" TEXT NOT NULL,
            "contentSource" TEXT NOT NULL,
            "contentPreprocessed" TEXT NOT NULL,
            "contentSearch" TEXT NOT NULL,
            UNIQUE ("conversation", "reference")
          );
        `,
      );

      for (const message of application.database.all<{
        id: number;
        createdAt: string;
        updatedAt: string | null;
        conversation: number;
        reference: string;
        authorEnrollment: number | null;
        anonymousAt: string | null;
        answerAt: string | null;
        contentSource: string;
        contentPreprocessed: string;
        contentSearch: string;
      }>(
        sql`
          SELECT
            "id",
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
          FROM "messages"
        `,
      ))
        application.database.run(
          sql`
            INSERT INTO "new_messages" (
              "id",
              "createdAt",
              "updatedAt",
              "conversation",
              "reference",
              "authorEnrollment",
              "anonymousAt",
              "type",
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${message.id},
              ${message.createdAt},
              ${message.updatedAt},
              ${message.conversation},
              ${message.reference},
              ${message.authorEnrollment},
              ${message.anonymousAt},
              ${typeof message.answerAt === "string" ? "answer" : "message"},
              ${message.contentSource},
              ${message.contentPreprocessed},
              ${message.contentSearch}
            )
          `,
        );

      application.database.execute(
        sql`
          DROP TABLE "messages";

          ALTER TABLE "new_messages" RENAME TO "messages";

          CREATE INDEX "messagesConversationIndex" ON "messages" ("conversation");
          CREATE INDEX "messagesTypeIndex" ON "messages" ("type");

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
        `,
      );
    },

    sql`
      ALTER TABLE "users" ADD COLUMN "mostRecentlyVisitedEnrollment" INTEGER NULL REFERENCES "enrollments" ON DELETE SET NULL;
      ALTER TABLE "enrollments" ADD COLUMN "mostRecentlyVisitedConversation" INTEGER NULL REFERENCES "conversations" ON DELETE SET NULL;
    `,

    async () => {
      application.database.execute(
        sql`
          DROP TABLE "conversationDrafts";

          UPDATE "enrollments" SET "courseRole" = 'course-staff' WHERE "courseRole" = 'staff';
          UPDATE "conversations" SET "participants" = 'course-staff' WHERE "participants" = 'staff';
          UPDATE "messages" SET "type" = 'course-staff-whisper' WHERE "type" = 'staff-whisper';
          ALTER TABLE "tags" RENAME COLUMN "staffOnlyAt" TO "courseStaffOnlyAt";

          ALTER TABLE "enrollments" RENAME TO "courseParticipants";
          DROP INDEX "enrollmentsUserIndex";
          CREATE INDEX "courseParticipantsUserIndex" ON "courseParticipants" ("user");
          DROP INDEX "enrollmentsCourseIndex";
          CREATE INDEX "courseParticipantsCourseIndex" ON "courseParticipants" ("course");
          ALTER TABLE "readings" RENAME COLUMN "enrollment" TO "courseParticipant";
          ALTER TABLE "emailNotificationDeliveries" RENAME COLUMN "enrollment" TO "courseParticipant";
          ALTER TABLE "endorsements" RENAME COLUMN "enrollment" TO "courseParticipant";
          ALTER TABLE "likes" RENAME COLUMN "enrollment" TO "courseParticipant";
          ALTER TABLE "emailNotificationDigestMessages" RENAME COLUMN "enrollment" TO "courseParticipant";
          DROP INDEX "emailNotificationDigestMessagesEnrollmentIndex";
          CREATE INDEX "emailNotificationDigestMessagesCourseParticipantIndex" ON "emailNotificationDigestMessages" ("courseParticipant");
          ALTER TABLE "conversations" RENAME COLUMN "authorEnrollment" TO "authorCourseParticipant";
          ALTER TABLE "conversationSelectedParticipants" RENAME COLUMN "enrollment" TO "courseParticipant";
          DROP INDEX "conversationSelectedParticipantsEnrollmentIndex";
          CREATE INDEX "conversationSelectedParticipantsCourseParticipantIndex" ON "conversationSelectedParticipants" ("courseParticipant");
          ALTER TABLE "messageDrafts" RENAME COLUMN "authorEnrollment" TO "authorCourseParticipant";
          ALTER TABLE "messagePolls" RENAME COLUMN "authorEnrollment" TO "authorCourseParticipant";
          ALTER TABLE "messagePollVotes" RENAME COLUMN "enrollment" TO "courseParticipant";
          ALTER TABLE "users" RENAME COLUMN "mostRecentlyVisitedEnrollment" TO "mostRecentlyVisitedCourseParticipant";
          ALTER TABLE "messages" RENAME COLUMN "authorEnrollment" TO "authorCourseParticipant";

          UPDATE "conversations" SET "participants" = 'selected-participants' WHERE "participants" = 'selected-people';
        `,
      );

      const contentPreprocessed = await (async () => {
        const unifiedProcessor = unified()
          // @ts-expect-error: https://github.com/orgs/rehypejs/discussions/150 / https://github.com/unifiedjs/unified/issues/227
          .use(remarkParse)
          // @ts-expect-error: https://github.com/orgs/rehypejs/discussions/150 / https://github.com/unifiedjs/unified/issues/227
          .use(remarkGfm, { singleTilde: false })
          // @ts-expect-error: https://github.com/orgs/rehypejs/discussions/150 / https://github.com/unifiedjs/unified/issues/227
          .use(remarkMath)
          // @ts-expect-error: https://github.com/orgs/rehypejs/discussions/150 / https://github.com/unifiedjs/unified/issues/227
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeRaw)
          .use(rehypeSanitize, {
            strip: ["script"],
            clobberPrefix: "UNUSED",
            clobber: [],
            ancestors: {
              li: ["ul", "ol"],
              thead: ["table"],
              tbody: ["table"],
              tfoot: ["table"],
              tr: ["table"],
              th: ["table"],
              td: ["table"],
              summary: ["details"],
            },
            protocols: {
              href: ["http", "https", "mailto"],
              src: ["http", "https"],
            },
            tagNames: [
              "h1",
              "h2",
              "h3",
              "h4",
              "h5",
              "h6",
              "hr",
              "p",
              "strong",
              "em",
              "u",
              "a",
              "span",
              "code",
              "ins",
              "del",
              "sup",
              "sub",
              "br",
              "img",
              "video",
              "courselore-poll",
              "ul",
              "ol",
              "li",
              "input",
              "blockquote",
              "table",
              "thead",
              "tbody",
              "tfoot",
              "tr",
              "th",
              "td",
              "details",
              "summary",
              "div",
              "pre",
            ],
            attributes: {
              a: ["href", "id"],
              img: ["src", "alt", "width"],
              video: ["src"],
              "courselore-poll": ["reference"],
              li: ["id"],
              input: [["type", "checkbox"], ["disabled", "true"], "checked"],
              th: [["align", "left", "center", "right"]],
              td: [["align", "left", "center", "right"]],
              div: [["className", "math-display"]],
              span: [["className", "math-inline"]],
              code: [["className", /^language-/]],
              "*": [],
            },
            required: {
              input: { type: "checkbox", disabled: true },
              div: { className: "math-display" },
              span: { className: "math-inline" },
            },
          })
          // @ts-expect-error: https://github.com/orgs/rehypejs/discussions/150 / https://github.com/unifiedjs/unified/issues/227
          .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
          .use(
            await (async () => {
              const shikiHighlighter = await shiki.getHighlighter({
                themes: ["light-plus", "dark-plus"],
              });
              const rehypeParseProcessor = unified().use(rehypeParse, {
                fragment: true,
              });

              return () => (tree: any) => {
                unistUtilVisit(tree, (node, index, parent) => {
                  if (
                    node.type !== "element" ||
                    node.tagName !== "pre" ||
                    node.children.length !== 1 ||
                    node.children[0].type !== "element" ||
                    node.children[0].tagName !== "code" ||
                    node.children[0].properties === undefined ||
                    !Array.isArray(node.children[0].properties.className) ||
                    node.children[0].properties.className.length !== 1 ||
                    typeof node.children[0].properties.className[0] !==
                      "string" ||
                    !node.children[0].properties.className[0].startsWith(
                      "language-",
                    ) ||
                    index === undefined ||
                    parent === undefined
                  )
                    return;

                  const code = hastUtilToString(node).slice(0, -1);
                  const language =
                    node.children[0].properties.className[0].slice(
                      "language-".length,
                    );

                  const highlightedCode = (() => {
                    try {
                      return rehypeParseProcessor
                        .parse(html`
                          <div>
                            <div class="light">
                              $${shikiHighlighter.codeToHtml(code, {
                                lang: language,
                                theme: "light-plus",
                              })}
                            </div>
                            <div class="dark">
                              $${shikiHighlighter.codeToHtml(code, {
                                lang: language,
                                theme: "dark-plus",
                              })}
                            </div>
                          </div>
                        `)
                        .children.find((child) => child.type === "element");
                    } catch (error: any) {
                      application.log(
                        "ERROR IN SYNTAX HIGHLIGHTER",
                        String(error),
                        error?.stack,
                      );
                    }
                  })();
                  if (highlightedCode === undefined) return;
                  highlightedCode.position = node.position;
                  parent.children[index] = highlightedCode;
                });
              };
            })(),
          )
          .use(() => (tree: any) => {
            unistUtilVisit(tree, (node) => {
              if (
                node.type === "element" &&
                node.properties !== undefined &&
                node.position !== undefined
              )
                node.properties.dataPosition = JSON.stringify(node.position);
            });
          })
          .use(rehypeStringify as any);

        return (contentSource: string) => {
          const contentElement = JSDOM.fragment(html`
            <div>
              $${unifiedProcessor
                .processSync(sanitizeXMLCharacters.sanitize(contentSource))
                .toString()}
            </div>
          `).firstElementChild!;

          const contentPreprocessed = contentElement.innerHTML;

          for (const element of contentElement.querySelectorAll(".dark"))
            element.remove();
          const contentSearch = contentElement.textContent!;

          return { contentPreprocessed, contentSearch };
        };
      })();

      for (const message of application.database.all<{
        id: number;
        contentSource: string;
      }>(
        sql`
          SELECT "id", "contentSource" FROM "messages"
        `,
      )) {
        const messageContentSource = message.contentSource.replace(
          /(?<=^|\s)@staff(?=[^a-z0-9-]|$)/gi,
          "@course-staff",
        );
        const messageContentPreprocessed =
          contentPreprocessed(messageContentSource);
        application.database.run(
          sql`
            UPDATE "messages"
            SET
              "contentSource" = ${messageContentSource},
              "contentPreprocessed" = ${messageContentPreprocessed.contentPreprocessed},
              "contentSearch" = ${messageContentPreprocessed.contentSearch}
            WHERE "id" = ${message.id}
          `,
        );
      }
    },

    sql`
      ALTER TABLE "sessions" ADD COLUMN "samlNameID" TEXT NULL;
      DELETE FROM "sessions" WHERE "samlIdentifier" IS NOT NULL;
    `,

    sql`
      UPDATE "invitations" SET "courseRole" = 'course-staff' WHERE "courseRole" = 'staff';
    `,

    async () => {
      const shouldPrompt =
        application.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count" FROM "users"
          `,
        )!.count > 0;

      if (shouldPrompt && !process.stdin.isTTY)
        throw new Error(
          "This update requires that you answer some prompts. Please run Courselore interactively (for example, ‘./courselore configuration.mjs’ on the command line) instead of through a service manager (for example, systemd).",
        );

      let privateKey: string;
      let certificate: string;
      if (
        shouldPrompt &&
        (
          await prompts({
            type: "select",
            name: "output",
            message:
              "This update of Courselore introduces a new system for handling the private key and certificate for SAML and the upcoming LTI support",
            choices: [
              {
                title:
                  "Let Courselore generate a new private key and certificate (recommended if you haven’t configured SAML yet)",
              },
              {
                title:
                  "Use an existing private key and certificate (recommended if you already configured SAML and don’t want to rotate the certificate with the Identity Provider)",
              },
            ],
          })
        ).output === 1
      ) {
        console.log(dedent`
          Requirements:

          • The private key must be RSA.
          • The private key must be at least 2048 bits long.
          • The certificate must have a *really* long expiration date.
          • The certificate must include ‘Subject’.
          • The certificate must be signed with SHA-256.
          • The private key and the certificate must be provided in PEM format.

          For example, you may use the following command:

          $ openssl req -x509 -newkey rsa:2048 -nodes -days 365000 -subj "/CN=courselore.org/C=US/ST=Maryland/L=Baltimore/O=Courselore" -keyout private-key.pem -out certificate.pem
        `);

        while (true) {
          try {
            privateKey = await fs.readFile(
              (
                await prompts({
                  type: "text",
                  name: "output",
                  message:
                    "Path to the file containing the private key (starts with ‘-----BEGIN PRIVATE KEY-----’)",
                })
              ).output,
              "utf-8",
            );
            forge.pki.privateKeyFromPem(privateKey);
            break;
          } catch (error) {
            console.log(error);
          }
        }

        while (true) {
          try {
            certificate = await fs.readFile(
              (
                await prompts({
                  type: "text",
                  name: "output",
                  message:
                    "Path to the file containing the certificate (starts with ‘-----BEGIN CERTIFICATE-----’)",
                })
              ).output,
              "utf-8",
            );
            forge.pki.certificateFromPem(certificate);
            break;
          } catch (error) {
            console.log(error);
          }
        }
      } else {
        const forgeKeyPair = forge.pki.rsa.generateKeyPair();
        const forgeCertificate = forge.pki.createCertificate();
        forgeCertificate.publicKey = forgeKeyPair.publicKey;
        forgeCertificate.serialNumber =
          "00" + Math.random().toString().slice(2, 12);
        forgeCertificate.validity.notAfter = new Date(
          Date.now() + 1000 * 365 * 24 * 60 * 60 * 1000,
        );
        const certificateSubject = [
          { name: "commonName", value: application.configuration.hostname },
          { name: "countryName", value: "US" },
          { name: "stateOrProvinceName", value: "Maryland" },
          { name: "localityName", value: "Baltimore" },
          { name: "organizationName", value: "Courselore" },
        ];
        forgeCertificate.setIssuer(certificateSubject);
        forgeCertificate.setSubject(certificateSubject);
        forgeCertificate.sign(
          forgeKeyPair.privateKey,
          forge.md.sha256.create(),
        );
        privateKey = forge.pki.privateKeyToPem(forgeKeyPair.privateKey);
        certificate = forge.pki.certificateToPem(forgeCertificate);
      }

      application.database.execute(
        sql`
          CREATE TABLE "new_administrationOptions" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT CHECK ("id" = 1),
            "latestVersion" TEXT NOT NULL,
            "privateKey" TEXT NOT NULL,
            "certificate" TEXT NOT NULL,
            "userSystemRolesWhoMayCreateCourses" TEXT NOT NULL
          );
        `,
      );
      const administrationOptions =
        application.database.get<{
          userSystemRolesWhoMayCreateCourses: string;
          latestVersion: string;
        }>(
          sql`
            SELECT
              "userSystemRolesWhoMayCreateCourses",
              "latestVersion"
            FROM "administrationOptions"
          `,
        ) ??
        (() => {
          throw new Error("Failed to get ‘administrationOptions’.");
        })();
      application.database.run(
        sql`
          INSERT INTO "administrationOptions" (
            "latestVersion",
            "privateKey",
            "certificate",
            "userSystemRolesWhoMayCreateCourses"
          )
          VALUES (
            ${administrationOptions.latestVersion},
            ${privateKey},
            ${certificate},
            ${administrationOptions.userSystemRolesWhoMayCreateCourses}
          )
        `,
      );
      application.database.execute(
        sql`
          DROP TABLE "administrationOptions";
          ALTER TABLE "new_administrationOptions" RENAME TO "administrationOptions";
        `,
      );
    },
  );

  application.database.run(
    sql`
      DELETE FROM "liveConnectionsMetadata"
    `,
  );

  application.log("DATABASE MIGRATION", "FINISHED");
};
