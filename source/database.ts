import path from "node:path";
import escapeStringRegexp from "escape-string-regexp";
import { Database, sql } from "@leafac/sqlite";
import fs from "fs-extra";
import { Courselore } from "./index.js";

export interface DatabaseLocals {
  database: Database;
}

export default async (app: Courselore): Promise<void> => {
  await fs.ensureDir(app.locals.options.dataDirectory);
  app.locals.database = new Database(
    path.join(app.locals.options.dataDirectory, "courselore.db"),
    process.env.LOG_DATABASE === "true" ? { verbose: console.log } : undefined
  );
  app.locals.database.pragma("journal_mode = WAL");
  app.locals.database.migrate(
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
        JOIN "enrollments" ON "readings"."enrollment" = "enrollments"."id" AND
                              "enrollments"."role" = 'student'
        JOIN "messages" ON "readings"."message" = "messages"."id"
        JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                "conversations"."staffOnlyAt" IS NOT NULL AND
                                NOT EXISTS(
                                  SELECT TRUE
                                  FROM "messages"
                                  WHERE "enrollments"."id" = "messages"."authorEnrollment" AND
                                        "conversations"."id" = "messages"."conversation"
                                )
      );
    `,
    () => {
      const makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork =
        (text: string): string =>
          text.replace(
            new RegExp(
              `(?<=${escapeStringRegexp(
                app.locals.options.baseURL
              )}/courses/\\d+/conversations/\\d+)#message--(?=\\d+)`,
              "gi"
            ),
            "?messageReference="
          );
      for (const user of app.locals.database.all<{
        id: number;
        biographySource: string | null;
        biographyPreprocessed: string | null;
      }>(
        sql`
          SELECT "id", "biographySource", "biographyPreprocessed"
          FROM "users"
          ORDER BY "id"
        `
      ))
        if (
          user.biographySource !== null &&
          user.biographyPreprocessed !== null
        )
          app.locals.database.run(
            sql`
              UPDATE "users"
              SET "biographySource" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                user.biographySource
              )},
                  "biographyPreprocessed" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                    user.biographyPreprocessed
                  )}
              WHERE "id" = ${user.id}
            `
          );
      for (const message of app.locals.database.all<{
        id: number;
        contentSource: string;
        contentPreprocessed: string;
        contentSearch: string;
      }>(
        sql`
          SELECT "id", "contentSource", "contentPreprocessed", "contentSearch"
          FROM "messages"
          ORDER BY "id"
        `
      ))
        app.locals.database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
              message.contentSource
            )},
                "contentPreprocessed" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                  message.contentPreprocessed
                )},
                "contentSearch" = ${makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork(
                  message.contentSearch
                )}
            WHERE "id" = ${message.id}
          `
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
        text: string
      ): string =>
        text.replace(
          new RegExp(
            `(?<=${escapeStringRegexp(
              app.locals.options.baseURL
            )}/courses/\\d+/conversations/\\d+)\\?messageReference=(?=\\d+)`,
            "gi"
          ),
          "?messages%5BmessageReference%5D="
        );
      for (const user of app.locals.database.all<{
        id: number;
        biographySource: string | null;
        biographyPreprocessed: string | null;
      }>(
        sql`
          SELECT "id", "biographySource", "biographyPreprocessed"
          FROM "users"
          ORDER BY "id"
        `
      ))
        if (
          user.biographySource !== null &&
          user.biographyPreprocessed !== null
        )
          app.locals.database.run(
            sql`
              UPDATE "users"
              SET "biographySource" = ${changeMessageReferencePermanentLinkQueryParameter(
                user.biographySource
              )},
                  "biographyPreprocessed" = ${changeMessageReferencePermanentLinkQueryParameter(
                    user.biographyPreprocessed
                  )}
              WHERE "id" = ${user.id}
            `
          );
      for (const message of app.locals.database.all<{
        id: number;
        contentSource: string;
        contentPreprocessed: string;
        contentSearch: string;
      }>(
        sql`
          SELECT "id", "contentSource", "contentPreprocessed", "contentSearch"
          FROM "messages"
          ORDER BY "id"
        `
      ))
        app.locals.database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${changeMessageReferencePermanentLinkQueryParameter(
              message.contentSource
            )},
                "contentPreprocessed" = ${changeMessageReferencePermanentLinkQueryParameter(
                  message.contentPreprocessed
                )},
                "contentSearch" = ${changeMessageReferencePermanentLinkQueryParameter(
                  message.contentSearch
                )}
            WHERE "id" = ${message.id}
          `
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
    sql`
      ALTER TABLE "users" ADD COLUMN "administratorAt" TEXT NULL;
      CREATE TABLE "configurations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL
      );
    `
  );
  app.once("close", () => {
    app.locals.database.close();
  });
};
