import path from "node:path";
import fs from "node:fs/promises";
import readline from "node:readline/promises";
import sql, { Database } from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import * as htmlUtilities from "@radically-straightforward/html";
import * as utilities from "@radically-straightforward/utilities";
import dedent from "dedent";
import markdown from "dedent";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import casual from "casual";
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
import { DOMParser } from "linkedom";
import sharp from "sharp";
import forge from "node-forge";
import { Application } from "./index.mjs";

export type ApplicationDatabase = {
  database: Database;
};

export default async (application: Application): Promise<void> => {
  application.database = await new Database(
    path.join(application.configuration.dataDirectory, "courselore.db"),
  ).migrate(
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

    (database) => {
      const makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork =
        (text: string): string =>
          text.replace(
            new RegExp(
              `(?<=https://${application.configuration.hostname.replaceAll(
                ".",
                "\\.",
              )}/courses/\\d+/conversations/\\d+)#message--(?=\\d+)`,
              "gi",
            ),
            "?messageReference=",
          );
      for (const user of database.all<{
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
          database.run(
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
      for (const message of database.all<{
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
        database.run(
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

    (database) => {
      const changeMessageReferencePermanentLinkQueryParameter = (
        text: string,
      ): string =>
        text.replace(
          new RegExp(
            `(?<=https://${application.configuration.hostname.replaceAll(
              ".",
              "\\.",
            )}/courses/\\d+/conversations/\\d+)\\?messageReference=(?=\\d+)`,
            "gi",
          ),
          "?messages%5BmessageReference%5D=",
        );
      for (const user of database.all<{
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
          database.run(
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
      for (const message of database.all<{
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
        database.run(
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

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
      database.execute(
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

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
      database.execute(
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

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
              ${user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt},
              ${user.emailNotificationsForMessagesInConversationsYouStartedAt},
              ${user.emailNotificationsDigestsFrequency}
            )
          `,
        );
      database.execute(
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

    async (database) => {
      if (
        database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count" FROM "users"
          `,
        )!.count === 0
      )
        return;
      if (!process.stdin.isTTY)
        throw new Error(
          "This update requires that you answer some questions. Please run Courselore interactively (for example, ‘./courselore/courselore ./configuration.mjs’ on the command line) instead of through a service manager (for example, systemd).",
        );
      const readlineInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      while (true) {
        const user = database.get<{
          id: number;
        }>(
          sql`
            SELECT "id"
            FROM "users"
            WHERE "email" = ${await readlineInterface.question("Courselore 4.0.0 introduces an administration interface and the role of system administrators. Please enter the email of an existing user to become a system administrator: ")}
          `,
        );
        if (user === undefined) {
          console.log("User not found.");
          continue;
        }
        database.run(
          sql`
            UPDATE "users" SET "systemRole" = 'administrator' WHERE "id" = ${user.id}
          `,
        );
        break;
      }
      readlineInterface.close();
    },

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
      database.execute(
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

    (database) => {
      database.execute(
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

      for (const conversation of database.all<{
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
        database.run(
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
          for (const enrollment of database.all<{
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
            database.run(
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

      database.execute(
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

    (database) => {
      database.execute(
        sql`
          CREATE TABLE "new_administrationOptions" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT CHECK ("id" = 1),
            "userSystemRolesWhoMayCreateCourses" TEXT NOT NULL,
            "latestVersion" TEXT NOT NULL
          );
        `,
      );
      const administrationOptions = database.get<{
        userSystemRolesWhoMayCreateCourses: string;
      }>(
        sql`
          SELECT "userSystemRolesWhoMayCreateCourses" FROM "administrationOptions"
        `,
      );
      if (administrationOptions === undefined)
        throw new Error("Failed to find ‘administrationOptions’");
      database.run(
        sql`
          INSERT INTO "new_administrationOptions" (
            "userSystemRolesWhoMayCreateCourses",
            "latestVersion"
          )
          VALUES (
            ${administrationOptions.userSystemRolesWhoMayCreateCourses},
            ${"THIS IS NO LONGER SUPPORTED SINCE 9.0.0"}
        )
      `,
      );
      database.execute(
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

    async (database) => {
      for (const user of database.all<{
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
          utilities.log(
            "DATABASE MIGRATION ERROR: FAILED TO CONVERT AVATAR TO WEBP",
            String(error),
            error?.stack,
          );
          continue;
        }

        database.run(
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

    (database) => {
      database.execute(
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
      for (const tag of database.all<{
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
        database.run(
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

      database.execute(
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

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
              ${"6.0.10"}
            )
          `,
        );
      database.execute(
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

    (database) => {
      database.execute(
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
      for (const user of database.all<{
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
        database.run(
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
      database.execute(
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

    (database) => {
      database.execute(
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

      for (const message of database.all<{
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
        database.run(
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

      database.execute(
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

    async (database) => {
      database.execute(
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
          .use(remarkParse)
          .use(remarkGfm, { singleTilde: false })
          .use(remarkMath)
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
          .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
          .use(
            await (async () => {
              const shikiHighlighter = await shiki.getHighlighter({
                langs: Object.keys(shiki.bundledLanguages),
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
                      utilities.log(
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
          const contentElement = new DOMParser()
            .parseFromString(
              html`
                <div>
                  $${unifiedProcessor
                    .processSync(
                      contentSource.replace(
                        htmlUtilities.invalidXMLCharacters,
                        "",
                      ),
                    )
                    .toString()}
                </div>
              `,
              "text/html",
            )
            .querySelector("div");

          const contentPreprocessed = contentElement.innerHTML;

          for (const element of contentElement.querySelectorAll(".dark"))
            element.remove();
          const contentSearch = contentElement.textContent!;

          return { contentPreprocessed, contentSearch };
        };
      })();

      for (const message of database.all<{
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
        database.run(
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

    async (database) => {
      const shouldPrompt =
        database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count" FROM "users"
          `,
        )!.count > 0;

      if (shouldPrompt && !process.stdin.isTTY)
        throw new Error(
          "This update requires that you answer some questions. Please run Courselore interactively (for example, ‘./courselore/courselore ./configuration.mjs’ on the command line) instead of through a service manager (for example, systemd).",
        );

      const readlineInterface = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      let privateKey: string;
      let certificate: string;
      if (
        shouldPrompt &&
        (await readlineInterface.question(
          dedent`
            This update of Courselore introduces a new system for handling the private key and certificate for SAML and the upcoming LTI support.
            
            1. If you haven’t configured SAML yet, then we recommend that you let Courselore generate a new private key and certificate.
            
            2. If you have already configured SAML and don’t want to rotate the certificate with the Identity Provider, then you may provide the existing private key and certificate.
            
            Choose your option [1/2]:
          ` + " ",
        )) === "2"
      ) {
        console.log(
          dedent`
          Requirements:

          • The private key must be RSA.
          • The private key must be at least 2048 bits long.
          • The certificate must have a *really* long expiration date.
          • The certificate must include ‘Subject’.
          • The certificate must be signed with SHA-256.
          • The private key and the certificate must be provided in PEM format.

          For example, you may use the following command:

          $ openssl req -x509 -newkey rsa:2048 -nodes -days 365000 -subj "/CN=courselore.org/C=US/ST=Maryland/L=Baltimore/O=Courselore" -keyout private-key.pem -out certificate.pem
        ` + "\n",
        );

        while (true) {
          try {
            privateKey = await fs.readFile(
              await readlineInterface.question(
                "Path to the file containing the private key (starts with ‘-----BEGIN PRIVATE KEY-----’): ",
              ),
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
              await readlineInterface.question(
                "Path to the file containing the certificate (starts with ‘-----BEGIN CERTIFICATE-----’): ",
              ),
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

      database.execute(
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
        database.get<{
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
      database.run(
        sql`
          INSERT INTO "new_administrationOptions" (
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
      database.execute(
        sql`
          DROP TABLE "administrationOptions";
          ALTER TABLE "new_administrationOptions" RENAME TO "administrationOptions";
        `,
      );
      readlineInterface.close();
    },

    sql`
      ALTER TABLE "courses" ADD COLUMN "aiTeachingAssistantAPIKey" TEXT NULL;
    `,

    sql`
      CREATE INDEX "sendEmailJobsCreatedAtIndex" ON "sendEmailJobs" ("createdAt");
      DROP INDEX "sendEmailJobsExpiresAtIndex";
      ALTER TABLE "sendEmailJobs" DROP COLUMN "expiresAt";

      CREATE INDEX "emailNotificationMessageJobsCreatedAtIndex" ON "emailNotificationMessageJobs" ("createdAt");
      DROP INDEX "emailNotificationMessageJobsExpiresAtIndex";
      ALTER TABLE "emailNotificationMessageJobs" DROP COLUMN "expiresAt";

      DROP TABLE "liveConnectionsMetadata";
      CREATE TABLE "liveConnectionsMetadata" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "url" TEXT NOT NULL,
        "processNumber" INTEGER NULL,
        "liveUpdateAt" TEXT NULL
      );
      CREATE INDEX "liveConnectionsMetadataCreatedAtIndex" ON "liveConnectionsMetadata" ("createdAt");
      CREATE INDEX "liveConnectionsMetadataNonceIndex" ON "liveConnectionsMetadata" ("nonce");
      CREATE INDEX "liveConnectionsMetadataURLIndex" ON "liveConnectionsMetadata" ("url");
      CREATE INDEX "liveConnectionsMetadataProcessNumberIndex" ON "liveConnectionsMetadata" ("processNumber");
      CREATE INDEX "liveConnectionsMetadataLiveUpdateAtIndex" ON "liveConnectionsMetadata" ("liveUpdateAt");
    `,

    sql`
      ALTER TABLE "users" ADD COLUMN "agreedToAITeachingAssistantAt" TEXT NULL;
      ALTER TABLE "conversations" ADD COLUMN "aiTeachingAssistantChatId" TEXT NULL;
      ALTER TABLE "messages" ADD COLUMN "authorAITeachingAssistantAt" TEXT NULL;
    `,

    async (database) => {
      database.execute(
        sql`
          drop trigger "conversationsReferenceIndexDelete";
          drop trigger "conversationsReferenceIndexInsert";
          drop trigger "conversationsReferenceIndexUpdate";
          drop trigger "conversationsTitleSearchIndexDelete";
          drop trigger "conversationsTitleSearchIndexInsert";
          drop trigger "conversationsTitleSearchIndexUpdate";
          drop trigger "usersNameSearchIndexDelete";
          drop trigger "usersNameSearchIndexInsert";
          drop trigger "usersNameSearchIndexUpdate";
          drop trigger "messagesContentSearchIndexDelete";
          drop trigger "messagesContentSearchIndexInsert";
          drop trigger "messagesContentSearchIndexUpdate";
          drop trigger "messagesReferenceIndexDelete";
          drop trigger "messagesReferenceIndexInsert";
          drop trigger "messagesReferenceIndexUpdate";
          
          drop table "conversationsReferenceIndex";
          drop table "conversationsTitleSearchIndex";
          drop table "messagesContentSearchIndex";
          drop table "messagesReferenceIndex";
          drop table "usersNameSearchIndex";
          drop table "sendEmailJobs";
          drop table "emailNotificationMessageJobs";
          drop table "emailNotificationDigestJobs";
          drop table "emailNotificationDigestMessages";
          drop table "emailVerifications";
          drop table "passwordResets";
          drop table "liveConnectionsMetadata";
          drop table "flashes";
          
          alter table "administrationOptions" rename to "old_administrationOptions";
          alter table "conversations" rename to "old_conversations";
          alter table "conversationSelectedParticipants" rename to "old_conversationSelectedParticipants";
          alter table "courseParticipants" rename to "old_courseParticipants";
          alter table "courses" rename to "old_courses";
          alter table "emailNotificationDeliveries" rename to "old_emailNotificationDeliveries";
          alter table "endorsements" rename to "old_endorsements";
          alter table "invitations" rename to "old_invitations";
          alter table "likes" rename to "old_likes";
          alter table "messageDrafts" rename to "old_messageDrafts";
          alter table "messagePollOptions" rename to "old_messagePollOptions";
          alter table "messagePolls" rename to "old_messagePolls";
          alter table "messagePollVotes" rename to "old_messagePollVotes";
          alter table "messages" rename to "old_messages";
          alter table "readings" rename to "old_readings";
          alter table "samlCache" rename to "old_samlCache";
          alter table "sessions" rename to "old_sessions";
          alter table "taggings" rename to "old_taggings";
          alter table "tags" rename to "old_tags";
          alter table "users" rename to "old_users";
          
          create table "systemOptions" (
            "id" integer primary key autoincrement,
            "privateKey" text not null,
            "certificate" text not null,
            "userSystemRolesWhoMayCreateCourses" text not null
          ) strict;
          
          create table "users" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "createdAt" text not null,
            "name" text not null,
            "nameSearch" text not null,
            "email" text not null unique,
            "emailVerificationNonce" text null unique,
            "emailVerificationCreatedAt" text null,
            "emailVerified" integer not null,
            "password" text null,
            "passwordResetNonce" text null unique,
            "passwordResetCreatedAt" text null,
            "color" text not null,
            "avatar" text null,
            "systemRole" text not null,
            "lastSeenOnlineAt" text not null,
            "darkMode" text not null,
            "sidebarWidth" integer not null,
            "emailNotificationsForAllMessages" integer not null,
            "emailNotificationsForMessagesIncludingMentions" integer not null,
            "emailNotificationsForMessagesInConversationsYouStarted" integer not null,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipated" integer not null,
            "contentEditorProgrammerMode" integer not null,
            "anonymous" integer not null,
            "mostRecentlyVisitedCourseParticipation" integer null references "courseParticipations"
          ) strict;
          create index "index_users_mostRecentlyVisitedCourseParticipation" on "users" ("mostRecentlyVisitedCourseParticipation");
          create virtual table "search_users_nameSearch" using fts5(
            content = "users",
            content_rowid = "id",
            "nameSearch",
            tokenize = 'porter'
          );
          create trigger "search_users_nameSearch_insert" after insert on "users" begin
            insert into "search_users_nameSearch" ("rowid", "nameSearch") values ("new"."id", "new"."nameSearch");
          end;
          create trigger "search_users_nameSearch_update" after update on "users" begin
            update "search_users_nameSearch" set "nameSearch" = "new"."nameSearch" where "rowid" = "old"."id";
          end;
          create trigger "search_users_nameSearch_delete" after delete on "users" begin
            delete from "search_users_nameSearch" where "rowid" = "old"."id";
          end;
          
          create table "userSessions" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "user" integer not null references "users",
            "createdAt" text not null,
            "samlIdentifier" text null,
            "samlSessionIndex" text null,
            "samlNameID" text null
          ) strict;
          create index "index_userSessions_createdAt" on "userSessions" ("createdAt");
          create index "index_userSessions_user" on "userSessions" ("user");
          
          create table "userSessionsSamlCache" (
            "id" integer primary key autoincrement,
            "createdAt" text not null,
            "samlIdentifier" text not null,
            "key" text not null unique,
            "value" text not null
          ) strict;
          
          create table "courses" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "createdAt" text not null,
            "name" text not null,
            "year" text null,
            "term" text null,
            "institution" text null,
            "code" text null,
            "invitationLinkCourseStaffToken" text not null,
            "invitationLinkCourseStaffActive" integer not null,
            "invitationLinkCourseStudentsToken" text not null,
            "invitationLinkCourseStudentsActive" integer not null,
            "courseStudentsMayCreatePolls" integer not null,
            "archivedAt" text null
          ) strict;
          
          create table "courseInvitationEmails" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "course" integer not null references "courses",
            "createdAt" text not null,
            "email" text not null,
            "courseRole" text not null
          ) strict;
          create index "index_courseInvitationEmails_createdAt" on "courseInvitationEmails" ("createdAt");
          create index "index_courseInvitationEmails_course" on "courseInvitationEmails" ("course");
          create index "index_courseInvitationEmails_email" on "courseInvitationEmails" ("email");
          
          create table "courseParticipations" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "user" integer not null references "users",
            "course" integer not null references "courses",
            "createdAt" text not null,
            "courseRole" text not null,
            "color" text not null,
            "mostRecentlyVisitedCourseConversation" integer null references "courseConversations",
            unique ("user", "course")
          ) strict;
          create index "index_courseParticipations_mostRecentlyVisitedCourseConversation" on "courseParticipations" ("mostRecentlyVisitedCourseConversation");

          create table "courseConversationTags" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "course" integer not null references "courses",
            "order" integer not null,
            "name" text not null,
            "courseStaffOnly" integer not null
          ) strict;
          create index "index_courseConversationTags_course" on "courseConversationTags" ("course");
          
          create table "courseConversations" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "course" integer not null references "courses",
            "pinned" integer not null,
            "courseConversationType" text not null,
            "questionResolved" integer not null,
            "courseConversationParticipations" text not null,
            "title" text not null,
            "titleSearch" text not null
          ) strict;
          create index "index_courseConversations_pinned" on "courseConversations" ("pinned");
          create index "index_courseConversations_courseConversationType" on "courseConversations" ("courseConversationType");
          create index "index_courseConversations_questionResolved" on "courseConversations" ("questionResolved");
          create virtual table "search_courseConversations_externalId" using fts5(
            content = "courseConversations",
            content_rowid = "id",
            "externalId",
            tokenize = 'porter'
          );
          create trigger "search_courseConversations_externalId_insert" after insert on "courseConversations" begin
            insert into "search_courseConversations_externalId" ("rowid", "externalId") values ("new"."id", "new"."externalId");
          end;
          create trigger "search_courseConversations_externalId_update" after update on "courseConversations" begin
            update "search_courseConversations_externalId" set "externalId" = "new"."externalId" where "rowid" = "old"."id";
          end;
          create trigger "search_courseConversations_externalId_delete" after delete on "courseConversations" begin
            delete from "search_courseConversations_externalId" where "rowid" = "old"."id";
          end;
          create virtual table "search_courseConversations_titleSearch" using fts5(
            content = "courseConversations",
            content_rowid = "id",
            "titleSearch",
            tokenize = 'porter'
          );
          create trigger "search_courseConversations_titleSearch_insert" after insert on "courseConversations" begin
            insert into "search_courseConversations_titleSearch" ("rowid", "titleSearch") values ("new"."id", "new"."titleSearch");
          end;
          create trigger "search_courseConversations_titleSearch_update" after update on "courseConversations" begin
            update "search_courseConversations_titleSearch" set "titleSearch" = "new"."titleSearch" where "rowid" = "old"."id";
          end;
          create trigger "search_courseConversations_titleSearch_delete" after delete on "courseConversations" begin
            delete from "search_courseConversations_titleSearch" where "rowid" = "old"."id";
          end;
          
          create table "courseConversationParticipations" (
            "id" integer primary key autoincrement,
            "courseConversation" integer not null references "courseConversations",
            "courseParticipation" integer not null references "courseParticipations",
            unique ("courseConversation", "courseParticipation")
          ) strict;
          
          create table "courseConversationTaggings" (
            "id" integer primary key autoincrement,
            "courseConversation" integer not null references "courseConversations",
            "courseConversationTag" integer not null references "courseConversationTags",
            unique ("courseConversation", "courseConversationTag")
          ) strict;
          
          create table "courseConversationMessageDrafts" (
            "id" integer primary key autoincrement,
            "courseConversation" integer not null references "courseConversations",
            "createdByCourseParticipation" integer not null references "courseParticipations",
            "contentSource" text not null,
            unique ("courseConversation", "createdByCourseParticipation")
          ) strict;
          
          create table "courseConversationMessages" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "courseConversation" integer not null references "courseConversations",
            "createdAt" text not null,
            "updatedAt" text null,
            "createdByCourseParticipation" integer null references "courseParticipations",
            "courseConversationMessageType" text not null,
            "anonymous" integer not null,
            "contentSource" text not null,
            "contentPreprocessed" text not null,
            "contentSearch" text not null
          ) strict;
          create index "index_courseConversationMessages_createdByCourseParticipation" on "courseConversationMessages" ("createdByCourseParticipation");
          create index "index_courseConversationMessages_courseConversationMessageType" on "courseConversationMessages" ("courseConversationMessageType");
          create virtual table "search_courseConversationMessages_externalId" using fts5(
            content = "courseConversationMessages",
            content_rowid = "id",
            "externalId",
            tokenize = 'porter'
          );
          create trigger "search_courseConversationMessages_externalId_insert" after insert on "courseConversationMessages" begin
            insert into "search_courseConversationMessages_externalId" ("rowid", "externalId") values ("new"."id", "new"."externalId");
          end;
          create trigger "search_courseConversationMessages_externalId_update" after update on "courseConversationMessages" begin
            update "search_courseConversationMessages_externalId" set "externalId" = "new"."externalId" where "rowid" = "old"."id";
          end;
          create trigger "search_courseConversationMessages_externalId_delete" after delete on "courseConversationMessages" begin
            delete from "search_courseConversationMessages_externalId" where "rowid" = "old"."id";
          end;
          create virtual table "search_courseConversationMessages_contentSearch" using fts5(
            content = "courseConversationMessages",
            content_rowid = "id",
            "contentSearch",
            tokenize = 'porter'
          );
          create trigger "search_courseConversationMessages_contentSearch_insert" after insert on "courseConversationMessages" begin
            insert into "search_courseConversationMessages_contentSearch" ("rowid", "contentSearch") values ("new"."id", "new"."contentSearch");
          end;
          create trigger "search_courseConversationMessages_contentSearch_update" after update on "courseConversationMessages" begin
            update "search_courseConversationMessages_contentSearch" set "contentSearch" = "new"."contentSearch" where "rowid" = "old"."id";
          end;
          create trigger "search_courseConversationMessages_contentSearch_delete" after delete on "courseConversationMessages" begin
            delete from "search_courseConversationMessages_contentSearch" where "rowid" = "old"."id";
          end;
          
          create table "courseConversationMessagePolls" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "course" integer not null references "courses",
            "createdByCourseParticipation" integer null references "courseParticipations",
            "multipleChoices" integer not null,
            "closed" integer not null
          ) strict;
          create index "index_courseConversationMessagePolls_createdByCourseParticipation" on "courseConversationMessagePolls" ("createdByCourseParticipation");
          
          create table "courseConversationMessagePollOptions" (
            "id" integer primary key autoincrement,
            "externalId" text not null unique,
            "courseConversationMessagePoll" integer not null references "courseConversationMessagePolls",
            "order" integer not null,
            "contentSource" text not null,
            "contentPreprocessed" text not null
          ) strict;
          create index "index_courseConversationMessagePollOptions_courseConversationMessagePoll" on "courseConversationMessagePollOptions" ("courseConversationMessagePoll");
          
          create table "courseConversationMessagePollOptionVotes" (
            "id" integer primary key autoincrement,
            "courseConversationMessagePollOption" integer not null references "courseConversationMessagePollOptions",
            "courseParticipation" integer null references "courseParticipations",
            unique ("courseConversationMessagePollOption", "courseParticipation")
          ) strict;
          
          create table "courseConversationMessageEmailNotificationDeliveries" (
            "id" integer primary key autoincrement,
            "courseConversationMessage" integer not null references "courseConversationMessages",
            "courseParticipation" integer not null references "courseParticipations",
            unique ("courseConversationMessage", "courseParticipation")
          ) strict;
          
          create table "courseConversationMessageReadings" (
            "id" integer primary key autoincrement,
            "createdAt" text not null,
            "courseConversationMessage" integer not null references "courseConversationMessages",
            "courseParticipation" integer not null references "courseParticipations",
            unique ("courseConversationMessage", "courseParticipation")
          ) strict;
          
          create table "courseConversationMessageLikes" (
            "id" integer primary key autoincrement,
            "courseConversationMessage" integer not null references "courseConversationMessages",
            "courseParticipation" integer null references "courseParticipations",
            unique ("courseConversationMessage", "courseParticipation")
          ) strict;
        `,
      );

      const administrationOptions = database.get<{
        privateKey: string;
        certificate: string;
        userSystemRolesWhoMayCreateCourses:
          | "all"
          | "staff-and-administrators"
          | "administrators";
      }>(
        sql`
          select "privateKey", "certificate", "userSystemRolesWhoMayCreateCourses" from "old_administrationOptions";
        `,
      )!;
      database.run(
        sql`
          insert into "systemOptions" (
            "privateKey",
            "certificate",
            "userSystemRolesWhoMayCreateCourses"
          )
          values (
            ${administrationOptions.privateKey},
            ${administrationOptions.certificate},
            ${
              {
                all: "systemUser",
                "staff-and-administrators": "systemStaff",
                administrators: "systemAdministrator",
              }[administrationOptions.userSystemRolesWhoMayCreateCourses]
            }
          );
        `,
      );

      // TODO
      // <courselore-poll reference=""> -> <courselore-poll id="">
      // @everyone, @course-staff, @students -> @all, @course-staff, @course-students
      // messages%5BmessageReference%5D -> message
      // "courseConversations"."externalId" and "courseConversationMessages"."externalId" aren’t sequential anymore

      if (application.configuration.environment !== "development")
        throw new Error("TODO: Migration");

      database.execute(
        sql`
          drop table "old_administrationOptions";
          drop table "old_conversations";
          drop table "old_conversationSelectedParticipants";
          drop table "old_courseParticipants";
          drop table "old_courses";
          drop table "old_emailNotificationDeliveries";
          drop table "old_endorsements";
          drop table "old_invitations";
          drop table "old_likes";
          drop table "old_messageDrafts";
          drop table "old_messagePollOptions";
          drop table "old_messagePolls";
          drop table "old_messagePollVotes";
          drop table "old_messages";
          drop table "old_readings";
          drop table "old_samlCache";
          drop table "old_sessions";
          drop table "old_taggings";
          drop table "old_tags";
          drop table "old_users";        
        `,
      );

      if (application.configuration.environment === "development") {
        const userPassword = await argon2.hash(
          "courselore",
          application.configuration.argon2,
        );
        const users = Array.from({ length: 151 }, (value, userIndex) => {
          const userName = casual.full_name;
          return database.get<{
            id: number;
            email: string;
          }>(
            sql`
              select * from "users" where "id" = ${
                database.run(
                  sql`
                    insert into "users" (
                      "externalId",
                      "createdAt",
                      "name",
                      "nameSearch",
                      "email",
                      "emailVerified",
                      "password",
                      "color",
                      "avatar",
                      "systemRole",
                      "lastSeenOnlineAt",
                      "darkMode",
                      "sidebarWidth",
                      "emailNotificationsForAllMessages",
                      "emailNotificationsForMessagesIncludingMentions",
                      "emailNotificationsForMessagesInConversationsYouStarted",
                      "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                      "contentEditorProgrammerMode",
                      "anonymous"
                    )
                    values (
                      ${cryptoRandomString({ length: 20, type: "numeric" })},
                      ${new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()},
                      ${userName},
                      ${userName},
                      ${`${userIndex === 0 ? "administrator" : `${userName.replaceAll(/[^A-Za-z]/g, "-").toLowerCase()}--${cryptoRandomString({ length: 3, type: "numeric" })}`}@courselore.org`},
                      ${Number(true)},
                      ${userPassword},
                      ${
                        [
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
                        ][Math.floor(Math.random() * 17)]
                      },
                      ${
                        Math.random() < 0.1
                          ? `https://${application.configuration.hostname}/node_modules/fake-avatars/avatars/webp/${Math.floor(Math.random() * 263)}.webp`
                          : null
                      },
                      ${userIndex === 0 || Math.random() < 0.05 ? "systemAdministrator" : Math.random() < 0.2 ? "systemStaff" : "systemUser"},
                      ${new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()},
                      ${"system"},
                      ${80 * 4},
                      ${Number(Math.random() < 0.1)},
                      ${Number(Math.random() < 0.9)},
                      ${Number(Math.random() < 0.9)},
                      ${Number(Math.random() < 0.9)},
                      ${Number(Math.random() < 0.1)},
                      ${Number(Math.random() < 0.8)}
                    );
                  `,
                ).lastInsertRowid
              };
        `,
          )!;
        });
        const user = users.shift()!;
        for (const courseData of [
          {
            name: "Principles of Programming Languages",
            year: String(
              new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getFullYear(),
            ),
            term: "Spring",
            code: "EN.601.426/626",
            archivedAt: new Date(
              Date.now() - 200 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            courseRole: "courseStaff",
          },
          {
            name: "Full-Stack JavaScript",
            year: String(new Date().getFullYear()),
            term: "Spring",
            courseRole: "courseStudent",
          },
          {
            name: "Principles of Programming Languages",
            year: String(new Date().getFullYear()),
            term: new Date().getMonth() < 6 ? "Spring" : "Fall",
            code: "EN.601.426/626",
            courseRole: "courseStaff",
          },
        ]) {
          const course = database.get<{
            id: number;
          }>(
            sql`
              select * from "courses" where "id" = ${
                database.run(
                  sql`
                    insert into "courses" (
                      "externalId",
                      "createdAt",
                      "name",
                      "year",
                      "term",
                      "institution",
                      "code",
                      "invitationLinkCourseStaffToken",
                      "invitationLinkCourseStaffActive",
                      "invitationLinkCourseStudentsToken",
                      "invitationLinkCourseStudentsActive",
                      "courseStudentsMayCreatePolls",
                      "archivedAt"
                    )
                    values (
                      ${cryptoRandomString({ length: 10, type: "numeric" })},
                      ${new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000)).toISOString()},
                      ${courseData.name},
                      ${courseData.year},
                      ${courseData.term},
                      ${Math.random() < 0.5 ? "Johns Hopkins University" : null},
                      ${courseData.code},
                      ${cryptoRandomString({ length: 20, type: "numeric" })},
                      ${Number(Math.random() < 0.2)},
                      ${cryptoRandomString({ length: 20, type: "numeric" })},
                      ${Number(Math.random() < 0.8)},
                      ${Number(Math.random() < 0.8)},
                      ${courseData.archivedAt}
                    );
                  `,
                ).lastInsertRowid
              };
            `,
          )!;
          const usersForCourseInvitationEmailsAndCourseParticipations = [
            ...users,
          ];
          const courseInvitationEmailsCount = Math.floor(Math.random() * 30);
          for (
            let courseInvitationEmailIndex = 0;
            courseInvitationEmailIndex < courseInvitationEmailsCount;
            courseInvitationEmailIndex++
          )
            database.run(
              sql`
                insert into "courseInvitationEmails" (
                  "externalId",
                  "course",
                  "createdAt",
                  "email",
                  "courseRole"
                )
                values (
                  ${cryptoRandomString({ length: 20, type: "numeric" })},
                  ${course.id},
                  ${new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000)).toISOString()},
                  ${
                    Math.random() < 0.5
                      ? `${casual.full_name.replaceAll(/[^A-Za-z]/g, "-").toLowerCase()}--${cryptoRandomString({ length: 3, type: "numeric" })}@courselore.org`
                      : usersForCourseInvitationEmailsAndCourseParticipations.splice(
                          Math.floor(
                            Math.random() *
                              usersForCourseInvitationEmailsAndCourseParticipations.length,
                          ),
                          1,
                        )[0].email
                  },
                  ${Math.random() < 0.5 ? "courseStaff" : "courseStudent"}
                );
              `,
            );
          const courseParticipations = [
            user,
            ...Array.from(
              { length: 60 + Math.floor(Math.random() * 50) },
              () =>
                usersForCourseInvitationEmailsAndCourseParticipations.splice(
                  Math.floor(
                    Math.random() *
                      usersForCourseInvitationEmailsAndCourseParticipations.length,
                  ),
                  1,
                )[0],
            ),
          ].map(
            (user, userIndex) =>
              database.get<{ id: number }>(
                sql`
                  select * from "courseParticipations" where "id" = ${
                    database.run(
                      sql`
                        insert into "courseParticipations" (
                          "externalId",
                          "user",
                          "course",
                          "createdAt",
                          "courseRole",
                          "color"
                        )
                        values (
                          ${cryptoRandomString({ length: 10, type: "numeric" })},
                          ${user.id},
                          ${course.id},
                          ${new Date(Date.now() - Math.floor(Math.random() * 100 * 24 * 60 * 60 * 1000)).toISOString()},
                          ${userIndex === 0 ? courseData.courseRole : Math.random() < 0.15 ? "courseStaff" : "courseStudent"},
                          ${
                            [
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
                            ][Math.floor(Math.random() * 17)]
                          }
                        );
                      `,
                    ).lastInsertRowid
                  };
                `,
              )!,
          );
          const courseParticipation = courseParticipations.shift()!;
          const courseConversationTags = [
            { name: "Assignment 1" },
            { name: "Assignment 2" },
            { name: "Assignment 3" },
            { name: "Assignment 4" },
            { name: "Assignment 5" },
            { name: "Assignment 6" },
            { name: "Change for Next Year", courseStaffOnly: true },
            { name: "Duplicate Question", courseStaffOnly: true },
          ].map(
            (courseConversationTag, courseConversationTagIndex) =>
              database.get<{ id: number }>(
                sql`
                  select * from "courseConversationTags" where "id" = ${
                    database.run(
                      sql`
                        insert into "courseConversationTags" (
                          "externalId",
                          "course",
                          "order",
                          "name",
                          "courseStaffOnly"
                        )
                        values (
                          ${cryptoRandomString({ length: 10, type: "numeric" })},
                          ${course.id},
                          ${courseConversationTagIndex},
                          ${courseConversationTag.name},
                          ${Number(courseConversationTag.courseStaffOnly ?? false)}
                        );
                      `,
                    ).lastInsertRowid
                  };
                `,
              )!,
          );
          const courseConversationsCount = 100 + Math.floor(Math.random() * 30);
          for (
            let courseConversationIndex = 0;
            courseConversationIndex < courseConversationsCount;
            courseConversationIndex++
          ) {
            const courseConversationTitle = (
              casual.words(1 + Math.floor(Math.random() * 10)) +
              (Math.random() < 0.2 ? "?" : "")
            ).replace(/./, (character) => character.toUpperCase());
            const courseConversation = database.get<{
              id: number;
            }>(
              sql`
                select * from "courseConversations" where "id" = ${
                  database.run(
                    sql`
                      insert into "courseConversations" (
                        "externalId",
                        "course",
                        "pinned",
                        "courseConversationType",
                        "questionResolved",
                        "courseConversationParticipations",
                        "title",
                        "titleSearch"
                      )
                      values (
                        ${cryptoRandomString({ length: 10, type: "numeric" })},
                        ${course.id},
                        ${Number(Math.random() < 0.1)},
                        ${Math.random() < 0.3 ? "courseConversationNote" : "courseConversationQuestion"},
                        ${Number(Math.random() < 0.5)},
                        ${courseConversationIndex === 0 || Math.random() < 0.3 ? "courseStudent" : Math.random() < 0.8 ? "courseStaff" : "courseConversationParticipations"},
                        ${courseConversationTitle},
                        ${courseConversationTitle}
                      );
                    `,
                  ).lastInsertRowid
                };
              `,
            )!;
            const courseParticipationsForCourseConversationParticipations = [
              ...courseParticipations,
            ];
            for (const courseParticipationForCourseConversationParticipations of [
              ...(Math.random() < 0.7 ? [courseParticipation] : []),
              ...Array.from(
                { length: Math.floor(Math.random() * 10) },
                () =>
                  courseParticipationsForCourseConversationParticipations.splice(
                    Math.floor(
                      Math.random() *
                        courseParticipationsForCourseConversationParticipations.length,
                    ),
                    1,
                  )[0],
              ),
            ])
              database.run(
                sql`
                  insert into "courseConversationParticipations" (
                    "courseConversation",
                    "courseParticipation"
                  )
                  values (
                    ${courseConversation.id},
                    ${courseParticipationForCourseConversationParticipations.id}
                  );
                `,
              );
            const courseConversationTagsForCourseConversationTaggings = [
              ...courseConversationTags,
            ];
            const courseConversationTaggingsCount =
              1 + Math.floor(Math.random() * 4);
            for (
              let courseConversationTaggingIndex = 0;
              courseConversationTaggingIndex < courseConversationTaggingsCount;
              courseConversationTaggingIndex++
            )
              database.run(
                sql`
                  insert into "courseConversationTaggings" (
                    "courseConversation",
                    "courseConversationTag"
                  )
                  values (
                    ${courseConversation.id},
                    ${courseConversationTagsForCourseConversationTaggings.splice(Math.floor(Math.random() * courseConversationTagsForCourseConversationTaggings.length), 1)[0].id}
                  );
                `,
              );
            const courseConversationMessagesCount =
              courseConversationIndex === 0
                ? 1
                : 1 + Math.floor(Math.random() * 15);
            for (
              let courseConversationMessageIndex = 0;
              courseConversationMessageIndex < courseConversationMessagesCount;
              courseConversationMessageIndex++
            ) {
              const courseConversationMessageContentSentences = Array.from(
                { length: 1 + Math.floor(Math.random() * 5) },
                () => casual.sentences(1 + Math.floor(Math.random() * 5)),
              );
              const courseConversationMessage = database.get<{
                id: number;
              }>(
                sql`
                    select * from "courseConversationMessages" where "id" = ${
                      database.run(
                        sql`
                          insert into "courseConversationMessages" (
                            "externalId",
                            "courseConversation",
                            "createdAt",
                            "updatedAt",
                            "createdByCourseParticipation",
                            "courseConversationMessageType",
                            "anonymous",
                            "contentSource",
                            "contentPreprocessed",
                            "contentSearch"
                          )
                          values (
                            ${cryptoRandomString({ length: 20, type: "numeric" })},
                            ${courseConversation.id},
                            ${new Date(Date.now() - Math.floor((1 + courseConversationsCount - courseConversationIndex + Math.random() * 0.5) * 5 * 60 * 60 * 1000)).toISOString()},
                            ${Math.random() < 0.05 ? new Date(Date.now() - Math.floor(24 * 5 * 60 * 60 * 1000)).toISOString() : null},
                            ${Math.random() < 0.9 ? courseParticipations[Math.floor(Math.random() * courseParticipations.length)].id : null},
                            ${
                              courseConversationMessageIndex === 0 ||
                              Math.random() < 0.6
                                ? "courseConversationMessageMessage"
                                : Math.random() < 0.5
                                  ? "courseConversationMessageAnswer"
                                  : Math.random() < 0.5
                                    ? "courseConversationMessageFollowUpQuestion"
                                    : "courseConversationMessageCourseStaffWhisper"
                            },
                            ${Number(Math.random() < 0.7)},
                            ${courseConversationMessageContentSentences.join("\n\n")},
                            ${courseConversationMessageContentSentences.map((sentence) => `<p>${sentence}</p>`).join("\n\n")},
                            ${courseConversationMessageContentSentences.join("\n\n")}
                          );
                        `,
                      ).lastInsertRowid
                    };
                  `,
              )!;
              const courseConversationMessageLikesCount =
                Math.random() < 0.6
                  ? 0
                  : Math.random() < 0.8
                    ? Math.floor(Math.random() * 3)
                    : Math.floor(Math.random() * 30);
              const courseParticipationsForCourseConversationMessageLikes = [
                ...courseParticipations,
              ];
              for (
                let courseConversationMessageLikeIndex = 0;
                courseConversationMessageLikeIndex <
                courseConversationMessageLikesCount;
                courseConversationMessageLikeIndex++
              )
                database.run(
                  sql`
                    insert into "courseConversationMessageLikes" (
                      "courseConversationMessage",
                      "courseParticipation"
                    )
                    values (
                      ${courseConversationMessage.id},
                      ${courseParticipationsForCourseConversationMessageLikes.splice(Math.floor(Math.random() * courseParticipationsForCourseConversationMessageLikes.length), 1)[0].id}
                    );
                  `,
                );
            }
            if (courseConversationIndex === 0) {
              const courseConversationMessagePolls = [false, true].map(
                (courseConversationMessagePollMultipleChoices) => {
                  const courseConversationMessagePoll = database.get<{
                    id: number;
                    multipleChoices: number;
                  }>(
                    sql`
                    select * from "courseConversationMessagePolls" where "id" = ${
                      database.run(
                        sql`
                          insert into "courseConversationMessagePolls" (
                            "externalId",
                            "course",
                            "createdByCourseParticipation",
                            "multipleChoices",
                            "closed"
                          )
                          values (
                            ${cryptoRandomString({ length: 20, type: "numeric" })},
                            ${course.id},
                            ${courseParticipation.id},
                            ${Number(courseConversationMessagePollMultipleChoices)},
                            ${Number(Math.random() < 0.5)}
                          );
                        `,
                      ).lastInsertRowid
                    };
                  `,
                  )!;
                  const courseConversationMessagePollOptions = Array.from(
                    { length: 3 + Math.floor(Math.random() * 4) },
                    (
                      courseConversationMessagePollOptionValue,
                      courseConversationMessagePollOptionIndex,
                    ) => {
                      const courseConversationMessagePollOptionContentSentence =
                        casual.title;
                      return database.get<{ id: number }>(
                        sql`
                        select * from "courseConversationMessagePollOptions" where "id" = ${
                          database.run(
                            sql`
                              insert into "courseConversationMessagePollOptions" (
                                "externalId",
                                "courseConversationMessagePoll",
                                "order",
                                "contentSource",
                                "contentPreprocessed"
                              )
                              values (
                                ${cryptoRandomString({ length: 20, type: "numeric" })},
                                ${courseConversationMessagePoll.id},
                                ${courseConversationMessagePollOptionIndex},
                                ${courseConversationMessagePollOptionContentSentence},
                                ${`<p>${courseConversationMessagePollOptionContentSentence}</p>`}
                              );
                            `,
                          ).lastInsertRowid
                        };
                      `,
                      )!;
                    },
                  );
                  const courseConversationMessagePollOptionVotesCount =
                    Math.random() < 0.5
                      ? 3 + Math.floor(Math.random() * 5)
                      : 30 + Math.floor(Math.random() * 10);
                  const courseParticipationsForCourseConversationMessagePollOptionVotes =
                    [...courseParticipations];
                  for (
                    let courseConversationMessagePollOptionVoteIndex = 0;
                    courseConversationMessagePollOptionVoteIndex <
                    courseConversationMessagePollOptionVotesCount;
                    courseConversationMessagePollOptionVoteIndex++
                  ) {
                    const courseParticipationForCourseConversationMessagePollOptionVotes =
                      courseParticipationsForCourseConversationMessagePollOptionVotes.splice(
                        Math.floor(
                          Math.random() *
                            courseParticipationsForCourseConversationMessagePollOptionVotes.length,
                        ),
                        1,
                      )[0];
                    const courseConversationMessagePollOptionsForCourseConversationMessagePollOptionVotes =
                      [...courseConversationMessagePollOptions];
                    const courseConversationMessagePollOptionVotesCount =
                      Boolean(courseConversationMessagePoll.multipleChoices)
                        ? 1 + Math.floor(Math.random() * 3)
                        : 1;
                    for (
                      let courseConversationMessagePollOptionVoteIndex = 0;
                      courseConversationMessagePollOptionVoteIndex <
                      courseConversationMessagePollOptionVotesCount;
                      courseConversationMessagePollOptionVoteIndex++
                    )
                      database.run(
                        sql`
                          insert into "courseConversationMessagePollOptionVotes" (
                            "courseConversationMessagePollOption",
                            "courseParticipation"
                          )
                          values (
                            ${
                              courseConversationMessagePollOptionsForCourseConversationMessagePollOptionVotes.splice(
                                Math.floor(
                                  Math.random() *
                                    courseConversationMessagePollOptionsForCourseConversationMessagePollOptionVotes.length,
                                ),
                                1,
                              )[0].id
                            },
                            ${courseParticipationForCourseConversationMessagePollOptionVotes.id}
                          );
                        `,
                      );
                  }
                  return courseConversationMessagePoll;
                },
              );
              database.run(
                sql`
                  insert into "courseConversationMessageDrafts" (
                    "courseConversation",
                    "createdByCourseParticipation",
                    "contentSource"
                  )
                  values (
                    ${courseConversation.id},
                    ${courseParticipation.id},
                    ${markdown`
                        # Headings

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        # Heading 1

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        ## Heading 2

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        ### Heading 3

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        #### Heading 4

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        ##### Heading 5

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        ###### Heading 6

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        # Separator

                        ${casual.sentences(3 + Math.floor(Math.random() * 5))}

                        ---

                        ${casual.sentences(3 + Math.floor(Math.random() * 5))}

                        # Inline

                        **Bold**, _italics_, <u>underline</u>, ~~strikethrough~~, [link](https://courselore.org), www.example.com, https://example.com, contact@example.com, $E=mc^2$, \`code\`, <ins>insertion</ins>, ~~deletion~~ (~one tilde~), <sup>superscript</sup>, <sub>subscript</sub>, and a line  
                        break.

                        # Image

                        ![Image](https://${
                          application.configuration.hostname
                        }/node_modules/fake-avatars/avatars/webp/1.webp)

                        # Animated GIF

                        [<video src="https://${
                          application.configuration.hostname
                        }/development/video-example.mp4"></video>](https://${
                          application.configuration.hostname
                        }/development/video-example.mp4)

                        # Video

                        <video src="https://${
                          application.configuration.hostname
                        }/development/video-example.mp4"></video>

                        # Image/Video Proxy

                        ![Proxied image](https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg)

                        <video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>

                        # Polls

                        ${courseConversationMessagePolls.map((courseConversationMessagePoll) => markdown`<courselore-poll id="${courseConversationMessagePoll.id}"></courselore-poll>`).join("\n\n")}

                        # Lists

                        - Banana
                        - Pyjamas
                        - Phone

                        ---

                        ${Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => `- ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n  ")}`).join("\n\n")}

                        ---

                        1. Banana
                        2. Pyjamas
                        3. Phone

                        ---

                        ${Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (listItemValue, listItemIndex) => `${listItemIndex + 1}. ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n  ")}`).join("\n\n")}

                        ---

                        ${Array.from(
                          { length: 4 + Math.floor(Math.random() * 5) },
                          () =>
                            `- [${Math.random() < 0.5 ? " " : "x"}] ${casual.sentences(
                              1 + Math.floor(Math.random() * 7),
                            )}`,
                        ).join("\n")}

                        # Blockquote

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => `> ${casual.sentences(1 + Math.floor(Math.random() * 7))}`).join("\n>\n")}

                        # Table

                        | Left-aligned | Center-aligned | Right-aligned |
                        | :---         |     :---:      |          ---: |
                        | git status   | git status     | git status    |
                        | git diff     | git diff       | git diff      |

                        | Left-aligned | Center-aligned | Right-aligned | Left-aligned | Center-aligned | Right-aligned | Left-aligned | Center-aligned | Right-aligned |
                        | :---         |     :---:      |          ---: | :---         |     :---:      |          ---: | :---         |     :---:      |          ---: |
                        | git status   | git status     | git status    | git status   | git status     | git status    | git status   | git status     | git status    |
                        | git diff     | git diff       | git diff      | git diff     | git diff       | git diff      | git diff     | git diff       | git diff      |

                        # Details

                        <details>
                        <summary>Example of details with summary</summary>

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        </details>

                        <details>

                        ${Array.from({ length: 1 + Math.floor(Math.random() * 7) }, () => casual.sentences(1 + Math.floor(Math.random() * 7))).join("\n\n")}

                        </details>

                        # Footnotes

                        Footnote[^1] and another.[^2]

                        [^1]: ${casual.sentences(1 + Math.floor(Math.random() * 7))}

                        [^2]: ${casual.sentences(1 + Math.floor(Math.random() * 7))}

                        # Cross-Site Scripting

                        👍<script>document.write("💩");</script>🙌

                        # Mathematics

                        $\\displaystyle \\frac{1}{\\Bigl(\\sqrt{\\phi \\sqrt{5}}-\\phi\\Bigr) e^{\\frac25 \\pi}} = 1+\\frac{e^{-2\\pi}} {1+\\frac{e^{-4\\pi}} {1+\\frac{e^{-6\\pi}} {1+\\frac{e^{-8\\pi}} {1+\\cdots} } } }$

                        Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
                        equation.

                        $$
                        L = \\frac{1}{2} \\rho v^2 S C_L
                        $$

                        A raw dollar sign: \\$

                        $$
                        \\invalidMacro
                        $$

                        Prevent large width/height visual affronts:

                        $$
                        \\rule{500em}{500em}
                        $$

                        # Syntax Highlighting

                        \`\`\`javascript
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
                        \`\`\`

                        \`\`\`
                        L          TE
                        A       A
                        C    V
                        R A
                        DOU
                        LOU
                        REUSE
                        QUE TU
                        PORTES
                        ET QUI T'
                        ORNE O CI
                        VILISÉ
                        OTE-  TU VEUX
                        LA    BIEN
                        SI      RESPI
                            RER       - Apollinaire
                        \`\`\`

                        <pre>
                        L          TE
                        A       A
                        C    V
                        R A
                        DOU
                        LOU
                        REUSE
                        QUE TU
                        PORTES
                        ET QUI T'
                        ORNE O CI
                        VILISÉ
                        OTE-  TU VEUX
                        LA    BIEN
                        SI      RESPI
                            RER       - Apollinaire
                        </pre>

                        # \`@mentions\`

                        Self: @${courseParticipation.id}

                        Other: @${courseParticipations[Math.floor(Math.random() * courseParticipations.length)].id}

                        Non-existent: @1571024857

                        Course roles: @all, @course-staff, @course-students

                        # \`#references\`

                        Conversation self: #1

                        Conversation other: #2

                        Conversation non-existent: #14981039481

                        Conversation permanent link turned reference: <https://${
                          application.configuration.hostname
                        }/courses/${course.id}/conversations/1>

                        Conversation non-existent permanent link turned reference: <https://${
                          application.configuration.hostname
                        }/courses/${course.id}/conversations/14981039481>

                        Message self: #1/2

                        Message other: #2/1

                        Message non-existent: #1/100

                        Message permanent link turned reference: <https://${
                          application.configuration.hostname
                        }/courses/${course.id}/conversations/1?message=1>

                        Message non-existent permanent link turned reference: <https://${
                          application.configuration.hostname
                        }/courses/${course.id}/conversations/1?message=100>
                      `}
                  );
                `,
              );
            }
          }
        }
      }
    },
  );
};
