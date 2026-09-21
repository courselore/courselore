import path from "node:path";
import fs from "node:fs/promises";
import readline from "node:readline/promises";
import sql from "@radically-straightforward/sqlite";
import * as utilities from "@radically-straightforward/utilities";
import * as cryptography from "@radically-straightforward/cryptography";
import { dedent as markdown } from "@radically-straightforward/utilities";
import * as examples from "@radically-straightforward/examples";
import cryptoRandomString from "crypto-random-string";
import sharp from "sharp";
import natural from "natural";
import { Application } from "./application.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "initialize")
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

      (database) => {
        const makeMessageReferenceInMessagePermanentLinkVisibleToServerForPaginationToWork =
          (text: string): string =>
            text.replace(
              new RegExp(
                `(?<=https://${application.userConfiguration.hostname.replaceAll(
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
              `(?<=https://${application.userConfiguration.hostname.replaceAll(
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
            string | null;
          emailNotificationsForMessagesInConversationsYouStartedAt:
            string | null;
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
            string | null;
          emailNotificationsForMessagesInConversationsYouStartedAt:
            string | null;
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
              `https://${application.userConfiguration.hostname}/files/`,
            ) ||
            !user.avatar.endsWith(`--avatar${path.extname(user.avatar)}`)
          )
            continue;

          const fileURL = user.avatar.slice(
            `https://${application.userConfiguration.hostname}/files/`.length,
          );
          const directory = path.dirname(fileURL);
          const nameOldAvatar = decodeURIComponent(path.basename(fileURL));
          const extension = path.extname(nameOldAvatar);
          const name =
            nameOldAvatar.slice(0, -"--avatar".length - extension.length) +
            extension;
          const nameAvatar = `${name.slice(0, -extension.length)}--avatar.webp`;
          const file = path.join(
            application.userConfiguration.dataDirectory,
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
                  application.userConfiguration.dataDirectory,
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
                application.userConfiguration.hostname
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

      (database) => {
        database.execute(
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
          `,
        );
        database.run(
          sql`
            UPDATE "courses"
            SET "studentsMayCreatePollsAt" = ${new Date().toISOString()};
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
            "none" | "instant" | "hourly-digests" | "daily-digests";
          emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
          emailNotificationsForMentionsAt: string | null;
          emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
            string | null;
          emailNotificationsForMessagesInConversationsYouStartedAt:
            string | null;
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
            "none" | "instant" | "hourly-digests" | "daily-digests";
          emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
          emailNotificationsForMentionsAt: string | null;
          emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
            string | null;
          emailNotificationsForMessagesInConversationsYouStartedAt:
            string | null;
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

        const contentPreprocessed = (contentSource: string) => ({
          contentPreprocessed: "This became obsolete in version 9.0.0.",
          contentSearch: "This became obsolete in version 9.0.0.",
        });

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
              ${"REMOVED IN VERSION 10.2.0"},
              ${"REMOVED IN VERSION 10.2.0"},
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
            drop table "samlCache";
            drop table "emailNotificationDeliveries";
            
            alter table "administrationOptions" rename to "old_administrationOptions";
            alter table "conversations" rename to "old_conversations";
            alter table "conversationSelectedParticipants" rename to "old_conversationSelectedParticipants";
            alter table "courseParticipants" rename to "old_courseParticipants";
            alter table "courses" rename to "old_courses";
            alter table "endorsements" rename to "old_endorsements";
            alter table "invitations" rename to "old_invitations";
            alter table "likes" rename to "old_likes";
            alter table "messageDrafts" rename to "old_messageDrafts";
            alter table "messagePollOptions" rename to "old_messagePollOptions";
            alter table "messagePolls" rename to "old_messagePolls";
            alter table "messagePollVotes" rename to "old_messagePollVotes";
            alter table "messages" rename to "old_messages";
            alter table "readings" rename to "old_readings";
            alter table "sessions" rename to "old_sessions";
            alter table "taggings" rename to "old_taggings";
            alter table "tags" rename to "old_tags";
            alter table "users" rename to "old_users";
            
            create table "systemOptions" (
              "id" integer primary key autoincrement,
              "privateKey" text not null,
              "certificate" text not null,
              "userRolesWhoMayCreateCourses" text not null
            ) strict;
            
            create table "users" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "name" text not null,
              "email" text not null unique,
              "emailVerificationEmail" text null,
              "emailVerificationNonce" text null unique,
              "emailVerificationCreatedAt" text null,
              "password" text null,
              "passwordResetNonce" text null unique,
              "passwordResetCreatedAt" text null,
              "twoFactorAuthenticationEnabled" integer not null,
              "twoFactorAuthenticationSecret" text null,
              "twoFactorAuthenticationRecoveryCodes" text null,
              "avatarColor" text not null,
              "avatarImage" text null,
              "userRole" text not null,
              "lastSeenOnlineAt" text not null,
              "darkMode" text not null,
              "sidebarWidth" integer not null,
              "emailNotificationsForAllMessages" integer not null,
              "emailNotificationsForMessagesIncludingAMention" integer not null,
              "emailNotificationsForMessagesInConversationsInWhichYouParticipated" integer not null,
              "emailNotificationsForMessagesInConversationsThatYouStarted" integer not null,
              "userAnonymityPreferred" text not null,
              "mostRecentlyVisitedCourseParticipation" integer null references "courseParticipations"
            ) strict;
            create index "index_users_mostRecentlyVisitedCourseParticipation" on "users" ("mostRecentlyVisitedCourseParticipation");
            
            create table "userSessions" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "user" integer not null references "users",
              "createdAt" text not null,
              "needsTwoFactorAuthentication" integer not null,
              "samlIdentifier" text null,
              "samlProfile" text null
            ) strict;
            create index "index_userSessions_user" on "userSessions" ("user");
            create index "index_userSessions_createdAt" on "userSessions" ("createdAt");
            
            create table "courses" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "name" text not null,
              "information" text null,
              "invitationLinkCourseParticipationRoleInstructorsEnabled" integer not null,
              "invitationLinkCourseParticipationRoleInstructorsToken" text not null unique,
              "invitationLinkCourseParticipationRoleStudentsEnabled" integer not null,
              "invitationLinkCourseParticipationRoleStudentsToken" text not null unique,
              "courseConversationRequiresTagging" integer not null,
              "courseParticipationRoleStudentsAnonymityAllowed" text not null,
              "courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent" integer not null,
              "courseState" text not null,
              "courseConversationsNextPublicId" integer not null
            ) strict;
            
            create table "coursePendingInvitationEmails" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "course" integer not null references "courses",
              "email" text not null,
              "courseParticipationRole" text not null,
              unique ("course", "email")
            ) strict;
            
            create table "courseParticipations" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "user" integer not null references "users",
              "course" integer not null references "courses",
              "courseParticipationRole" text not null,
              "decorationColor" text not null,
              "mostRecentlyVisitedCourseConversation" integer null references "courseConversations",
              unique ("user", "course")
            ) strict;
            create index "index_courseParticipations_mostRecentlyVisitedCourseConversation" on "courseParticipations" ("mostRecentlyVisitedCourseConversation");

            create table "courseConversationsTags" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "course" integer not null references "courses",
              "order" integer not null,
              "name" text not null,
              "privateToCourseParticipationRoleInstructors" integer not null
            ) strict;
            create index "index_courseConversationsTags_course" on "courseConversationsTags" ("course");
            
            create table "courseConversations" (
              "id" integer primary key autoincrement,
              "publicId" text not null,
              "course" integer not null references "courses",
              "courseConversationType" text not null,
              "questionResolved" integer not null,
              "courseConversationVisibility" text not null,
              "pinned" integer not null,
              "title" text not null,
              "titleSearch" text not null,
              unique ("publicId", "course")
            ) strict;
            create index "index_courseConversations_courseConversationType" on "courseConversations" ("courseConversationType");
            create index "index_courseConversations_questionResolved" on "courseConversations" ("questionResolved");
            create index "index_courseConversations_pinned" on "courseConversations" ("pinned");
            create virtual table "search_courseConversations_titleSearch" using fts5(
              "titleSearch",
              content = "courseConversations",
              content_rowid = "id",
              prefix = '1 2 3'
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
              "courseConversationsTag" integer not null references "courseConversationsTags",
              unique ("courseConversation", "courseConversationsTag")
            ) strict;
            
            create table "courseConversationMessageDrafts" (
              "id" integer primary key autoincrement,
              "courseConversation" integer not null references "courseConversations",
              "createdByCourseParticipation" integer not null references "courseParticipations",
              "createdAt" text not null,
              "courseConversationMessageType" text not null,
              "courseConversationMessageVisibility" text not null,
              "courseConversationMessageAnonymity" text not null,
              "content" text not null,
              unique ("courseConversation", "createdByCourseParticipation")
            ) strict;
            
            create table "courseConversationMessages" (
              "id" integer primary key autoincrement,
              "publicId" text not null unique,
              "courseConversation" integer not null references "courseConversations",
              "createdByCourseParticipation" integer null references "courseParticipations",
              "createdAt" text not null,
              "updatedAt" text null,
              "courseConversationMessageType" text not null,
              "courseConversationMessageVisibility" text not null,
              "courseConversationMessageAnonymity" text not null,
              "content" text not null,
              "contentSearch" text not null
            ) strict;
            create index "index_courseConversationMessages_courseConversation" on "courseConversationMessages" ("courseConversation");
            create index "index_courseConversationMessages_createdByCourseParticipation" on "courseConversationMessages" ("createdByCourseParticipation");
            create index "index_courseConversationMessages_courseConversationMessageType" on "courseConversationMessages" ("courseConversationMessageType");
            create virtual table "search_courseConversationMessages_contentSearch" using fts5(
              "contentSearch",
              content = "courseConversationMessages",
              content_rowid = "id",
              prefix = '1 2 3'
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
            
            create table "courseConversationMessageViews" (
              "id" integer primary key autoincrement,
              "courseConversationMessage" integer not null references "courseConversationMessages",
              "courseParticipation" integer null references "courseParticipations",
              "createdAt" text not null,
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

        const old_administrationOptions =
          database.get<{
            privateKey: string;
            certificate: string;
            userSystemRolesWhoMayCreateCourses:
              "all" | "staff-and-administrators" | "administrators";
          }>(
            sql`
            select "privateKey", "certificate", "userSystemRolesWhoMayCreateCourses" from "old_administrationOptions";
          `,
          ) ??
          (() => {
            throw new Error();
          })();
        database.run(
          sql`
            insert into "systemOptions" (
              "privateKey",
              "certificate",
              "userRolesWhoMayCreateCourses"
            )
            values (
              ${old_administrationOptions.privateKey},
              ${old_administrationOptions.certificate},
              ${
                {
                  all: "userRoleUser",
                  "staff-and-administrators": "userRoleStaff",
                  administrators: "userRoleSystemAdministrator",
                }[old_administrationOptions.userSystemRolesWhoMayCreateCourses]
              }
            );
          `,
        );
        for (const old_user of database.all<{
          id: number;
          lastSeenOnlineAt: string;
          reference: string;
          email: string;
          password: string | null;
          emailVerifiedAt: string | null;
          name: string;
          avatar: string | null;
          avatarlessBackgroundColor:
            | "red"
            | "orange"
            | "amber"
            | "yellow"
            | "lime"
            | "green"
            | "emerald"
            | "teal"
            | "cyan"
            | "sky"
            | "blue"
            | "indigo"
            | "violet"
            | "purple"
            | "fuchsia"
            | "pink"
            | "rose";
          systemRole: "none" | "staff" | "administrator";
          emailNotificationsForAllMessages:
            "none" | "instant" | "hourly-digests" | "daily-digests";
          emailNotificationsForMentionsAt: string | null;
          emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
            string | null;
          emailNotificationsForMessagesInConversationsYouStartedAt:
            string | null;
        }>(
          sql`
            select
              "id",
              "lastSeenOnlineAt",
              "reference",
              "email",
              "password",
              "emailVerifiedAt",
              "name",
              "avatar",
              "avatarlessBackgroundColor",
              "systemRole",
              "emailNotificationsForAllMessages",
              "emailNotificationsForMentionsAt",
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
              "emailNotificationsForMessagesInConversationsYouStartedAt"
            from "old_users"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              insert into "users" (
                "id",
                "publicId",
                "name",
                "email",
                "emailVerificationEmail",
                "emailVerificationNonce",
                "emailVerificationCreatedAt",
                "password",
                "passwordResetNonce",
                "passwordResetCreatedAt",
                "twoFactorAuthenticationEnabled",
                "twoFactorAuthenticationSecret",
                "twoFactorAuthenticationRecoveryCodes",
                "avatarColor",
                "avatarImage",
                "userRole",
                "lastSeenOnlineAt",
                "darkMode",
                "sidebarWidth",
                "emailNotificationsForAllMessages",
                "emailNotificationsForMessagesIncludingAMention",
                "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                "emailNotificationsForMessagesInConversationsThatYouStarted",
                "userAnonymityPreferred",
                "mostRecentlyVisitedCourseParticipation"
              )
              values (
                ${old_user.id},
                ${old_user.reference},
                ${old_user.name},
                ${old_user.email},
                ${old_user.emailVerifiedAt === null ? old_user.email : null},
                ${null},
                ${null},
                ${old_user.password},
                ${null},
                ${null},
                ${Number(false)},
                ${null},
                ${null},
                ${old_user.avatarlessBackgroundColor},
                ${typeof old_user.avatar === "string" ? new URL(old_user.avatar).pathname : null},
                ${
                  {
                    none: "userRoleUser",
                    staff: "userRoleStaff",
                    administrator: "userRoleSystemAdministrator",
                  }[old_user.systemRole]
                },
                ${old_user.lastSeenOnlineAt},
                ${"userDarkModeSystem"},
                ${80 * 4},
                ${Number(old_user.emailNotificationsForAllMessages !== "none")},
                ${Number(typeof old_user.emailNotificationsForMentionsAt === "string")},
                ${Number(typeof old_user.emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt === "string")},
                ${Number(typeof old_user.emailNotificationsForMessagesInConversationsYouStartedAt === "string")},
                ${"userAnonymityPreferredNone"},
                ${null}
              );
            `,
          );
        for (const old_session of database.all<{
          createdAt: string;
          token: string;
          user: number;
          samlIdentifier: string | null;
        }>(
          sql`
            select
              "createdAt",
              "token",
              "user",
              "samlIdentifier"
            from "old_sessions"
            order by "id" asc;
          `,
        ))
          if (old_session.samlIdentifier === null)
            database.run(
              sql`
                insert into "userSessions" (
                  "publicId",
                  "user",
                  "createdAt",
                  "needsTwoFactorAuthentication",
                  "samlIdentifier",
                  "samlProfile"
                ) values (
                  ${old_session.token},
                  ${old_session.user},
                  ${old_session.createdAt},
                  ${Number(false)},
                  ${null},
                  ${null}
                );
              `,
            );
        for (const old_course of database.all<{
          id: number;
          reference: string;
          name: string;
          year: string | null;
          term: string | null;
          institution: string | null;
          code: string | null;
          nextConversationReference: number;
          archivedAt: string | null;
        }>(
          sql`
            select
              "id",
              "reference",
              "name",
              "year",
              "term",
              "institution",
              "code",
              "nextConversationReference",
              "archivedAt"
            from "old_courses"
            order by "id" asc;
          `,
        )) {
          const courseInformation = [
            old_course.year,
            old_course.term,
            old_course.institution,
            old_course.code,
          ]
            .filter(
              (courseInformationPart) =>
                typeof courseInformationPart === "string",
            )
            .join(" / ")
            .trim();
          const invitationLinkCourseParticipationRoleInstructors =
            database.get<{
              reference: string;
            }>(
              sql`
              select "reference"
              from "old_invitations"
              where
                "expiresAt" is null and
                "course" = ${old_course.id} and
                "email" is null and
                "name" is null and
                "courseRole" = ${"course-staff"}
              order by "id" asc
              limit 1;
            `,
            );
          const invitationLinkCourseParticipationRoleStudents = database.get<{
            reference: string;
          }>(
            sql`
              select "reference"
              from "old_invitations"
              where
                "expiresAt" is null and
                "course" = ${old_course.id} and
                "email" is null and
                "name" is null and
                "courseRole" = ${"student"}
              order by "id" asc
              limit 1;
            `,
          );
          database.run(
            sql`
              insert into "courses" (
                "id",
                "publicId",
                "name",
                "information",
                "invitationLinkCourseParticipationRoleInstructorsEnabled",
                "invitationLinkCourseParticipationRoleInstructorsToken",
                "invitationLinkCourseParticipationRoleStudentsEnabled",
                "invitationLinkCourseParticipationRoleStudentsToken",
                "courseConversationRequiresTagging",
                "courseParticipationRoleStudentsAnonymityAllowed",
                "courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent",
                "courseState",
                "courseConversationsNextPublicId"
              )
              values (
                ${old_course.id},
                ${old_course.reference},
                ${old_course.name},
                ${courseInformation !== "" ? courseInformation : null},
                ${Number(invitationLinkCourseParticipationRoleInstructors !== undefined)},
                ${invitationLinkCourseParticipationRoleInstructors?.reference ?? cryptoRandomString({ length: 20, type: "numeric" })},
                ${Number(invitationLinkCourseParticipationRoleStudents !== undefined)},
                ${invitationLinkCourseParticipationRoleStudents?.reference ?? cryptoRandomString({ length: 20, type: "numeric" })},
                ${Number(true)},
                ${"courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"},
                ${Number(true)},
                ${old_course.archivedAt === null ? "courseStateActive" : "courseStateArchived"},
                ${old_course.nextConversationReference}
              );
            `,
          );
          for (const old_courseParticipant of database.all<{
            id: number;
            user: number;
            reference: string;
            courseRole: "student" | "course-staff";
            accentColor:
              "red" | "yellow" | "emerald" | "sky" | "violet" | "pink";
          }>(
            sql`
              select
                "id",
                "user",
                "reference",
                "courseRole",
                "accentColor"
              from "old_courseParticipants"
              where "course" = ${old_course.id}
              order by "id" asc;
            `,
          ))
            database.run(
              sql`
                insert into "courseParticipations" (
                  "id",
                  "publicId",
                  "user",
                  "course",
                  "courseParticipationRole",
                  "decorationColor",
                  "mostRecentlyVisitedCourseConversation"
                )
                values (
                  ${old_courseParticipant.id},
                  ${old_courseParticipant.reference},
                  ${old_courseParticipant.user},
                  ${old_course.id},
                  ${
                    {
                      student: "courseParticipationRoleStudent",
                      "course-staff": "courseParticipationRoleInstructor",
                    }[old_courseParticipant.courseRole]
                  },
                  ${old_courseParticipant.accentColor === "sky" ? "cyan" : old_courseParticipant.accentColor},
                  ${null}
                );
              `,
            );
          for (const old_tag of database.all<{
            id: number;
            reference: string;
            order: number;
            name: string;
            courseStaffOnlyAt: string | null;
          }>(
            sql`
              select
                "id",
                "reference",
                "order",
                "name",
                "courseStaffOnlyAt"
              from "old_tags"
              where "course" = ${old_course.id}
              order by "id" asc;
            `,
          ))
            database.run(
              sql`
                insert into "courseConversationsTags" (
                  "id",
                  "publicId",
                  "course",
                  "order",
                  "name",
                  "privateToCourseParticipationRoleInstructors"
                )
                values (
                  ${old_tag.id},
                  ${old_tag.reference},
                  ${old_course.id},
                  ${old_tag.order},
                  ${old_tag.name},
                  ${Number(typeof old_tag.courseStaffOnlyAt === "string")}
                );
              `,
            );
          for (const old_conversation of database.all<{
            id: number;
            reference: string;
            participants: "everyone" | "course-staff" | "selected-participants";
            type: "question" | "note" | "chat";
            pinnedAt: string | null;
            resolvedAt: string | null;
            title: string;
          }>(
            sql`
                select
                  "id",
                  "reference",
                  "participants",
                  "type",
                  "pinnedAt",
                  "resolvedAt",
                  "title"
                from "old_conversations"
                where "course" = ${old_course.id}
                order by "id" asc;
              `,
          )) {
            database.run(
              sql`
                insert into "courseConversations" (
                  "id",
                  "publicId",
                  "course",
                  "courseConversationType",
                  "questionResolved",
                  "courseConversationVisibility",
                  "pinned",
                  "title",
                  "titleSearch"
                )
                values (
                  ${old_conversation.id},
                  ${old_conversation.reference},
                  ${old_course.id},
                  ${
                    {
                      question: "courseConversationTypeQuestion",
                      note: "courseConversationTypeNote",
                      chat: "courseConversationTypeNote",
                    }[old_conversation.type]
                  },
                  ${Number(old_conversation.type === "question" && typeof old_conversation.resolvedAt === "string")},
                  ${
                    {
                      everyone: "courseConversationVisibilityEveryone",
                      "course-staff":
                        "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations",
                      "selected-participants":
                        "courseConversationVisibilityCourseConversationParticipations",
                    }[old_conversation.participants]
                  },
                  ${Number(typeof old_conversation.pinnedAt === "string")},
                  ${old_conversation.title},
                  ${utilities
                    .tokenize(old_conversation.title, {
                      stopWords: application.applicationConfiguration.stopWords,
                      stem: (token) => natural.PorterStemmer.stem(token),
                    })
                    .map((tokenWithPosition) => tokenWithPosition.token)
                    .join(" ")}
                );
              `,
            );
            if (
              old_conversation.participants === "course-staff" ||
              old_conversation.participants === "selected-participants"
            )
              for (const old_conversationSelectedParticipant of database.all<{
                courseParticipant: number;
              }>(
                sql`
                  select "courseParticipant"
                  from "old_conversationSelectedParticipants"
                  where "conversation" = ${old_conversation.id}
                  order by "id" asc;
                `,
              ))
                database.run(
                  sql`
                    insert into "courseConversationParticipations" (
                      "courseConversation",
                      "courseParticipation"
                    )
                    values (
                      ${old_conversation.id},
                      ${old_conversationSelectedParticipant.courseParticipant}
                    );
                  `,
                );
            for (const old_tagging of database.all<{ tag: number }>(
              sql`
                select "tag"
                from "old_taggings"
                where "conversation" = ${old_conversation.id}
                order by "id" asc;
              `,
            ))
              database.run(
                sql`
                  insert into "courseConversationTaggings" (
                    "courseConversation",
                    "courseConversationsTag"
                  )
                  values (
                    ${old_conversation.id},
                    ${old_tagging.tag}
                  );
                `,
              );
            for (const old_message of database.all<{
              id: number;
              createdAt: string;
              updatedAt: string | null;
              authorCourseParticipant: number | null;
              anonymousAt: string | null;
              type:
                | "message"
                | "answer"
                | "follow-up-question"
                | "course-staff-whisper";
              contentSource: string;
            }>(
              sql`
                select
                  "id",
                  "createdAt",
                  "updatedAt",
                  "authorCourseParticipant",
                  "anonymousAt",
                  "type",
                  "contentSource"
                from "old_messages"
                where "conversation" = ${old_conversation.id}
                order by "id" asc;
              `,
            )) {
              const courseConversationMessageContent = old_message.contentSource
                .replaceAll(
                  /<courselore-poll\s+reference="(?<pollReference>\d+)"><\/courselore-poll>/g,
                  (match, pollReference) => {
                    const old_messagePoll = database.get<{ id: number }>(
                      sql`
                        select "id"
                        from "old_messagePolls"
                        where
                          "course" = ${old_course.id} and
                          "reference" = ${pollReference};
                      `,
                    );
                    if (old_messagePoll === undefined) return markdown``;
                    return markdown`
                      <poll>

                      ${database
                        .all<{ id: number; contentSource: string }>(
                          sql`
                            select
                              "id",
                              "contentSource"
                            from "old_messagePollOptions"
                            where "messagePoll" = ${old_messagePoll.id}
                            order by "order" asc;
                          `,
                        )
                        .map((old_messagePollOption) => {
                          const old_messagePollVotesCourseParticipations =
                            database
                              .all<{ courseParticipant: number }>(
                                sql`
                                  select "courseParticipant"
                                  from "old_messagePollVotes"
                                  where "messagePollOption" = ${old_messagePollOption.id}
                                  order by "id" asc;
                                `,
                              )
                              .map(
                                (old_messagePollVote) =>
                                  database.get<{ publicId: string }>(
                                    sql`
                                      select "publicId"
                                      from "courseParticipations"
                                      where "id" = ${old_messagePollVote.courseParticipant};
                                    `,
                                  )?.publicId ?? "0",
                              );
                          return markdown`- [ ] ${0 < old_messagePollVotesCourseParticipations.length ? markdown`<votes>${JSON.stringify(old_messagePollVotesCourseParticipations)}</votes> ` : markdown``}${old_messagePollOption.contentSource}`;
                        })
                        .join("\n")}

                      </poll>
                    `;
                  },
                )
                .replaceAll("@course-staff", "@instructors")
                .replaceAll("messages%5BmessageReference%5D", "message");
              database.run(
                sql`
                  insert into "courseConversationMessages" (
                    "id",
                    "publicId",
                    "courseConversation",
                    "createdByCourseParticipation",
                    "createdAt",
                    "updatedAt",
                    "courseConversationMessageType",
                    "courseConversationMessageVisibility",
                    "courseConversationMessageAnonymity",
                    "content",
                    "contentSearch"
                  )
                  values (
                    ${old_message.id},
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${old_conversation.id},
                    ${old_message.authorCourseParticipant},
                    ${old_message.createdAt},
                    ${old_message.updatedAt},
                    ${
                      {
                        message: "courseConversationMessageTypeMessage",
                        answer: "courseConversationMessageTypeAnswer",
                        "follow-up-question":
                          "courseConversationMessageTypeFollowUpQuestion",
                        "course-staff-whisper":
                          "courseConversationMessageTypeMessage",
                      }[old_message.type]
                    },
                    ${old_message.type === "course-staff-whisper" ? "courseConversationMessageVisibilityCourseParticipationRoleInstructors" : "courseConversationMessageVisibilityEveryone"},
                    ${typeof old_message.anonymousAt === "string" ? "courseConversationMessageAnonymityCourseParticipationRoleStudents" : "courseConversationMessageAnonymityNone"},
                    ${courseConversationMessageContent},
                    ${utilities
                      .tokenize(courseConversationMessageContent, {
                        stopWords:
                          application.applicationConfiguration.stopWords,
                        stem: (token) => natural.PorterStemmer.stem(token),
                      })
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")}
                  );
                `,
              );
              for (const old_reading of database.all<{
                createdAt: string;
                courseParticipant: number;
              }>(
                sql`
                  select
                    "createdAt",
                    "courseParticipant"
                  from "old_readings"
                  where "message" = ${old_message.id}
                  order by "id" asc;
                `,
              ))
                database.run(
                  sql`
                    insert into "courseConversationMessageViews" (
                      "courseConversationMessage",
                      "courseParticipation",
                      "createdAt"
                    )
                    values (
                      ${old_message.id},
                      ${old_reading.courseParticipant},
                      ${old_reading.createdAt}
                    );
                  `,
                );
              for (const old_like of database.all<{
                courseParticipant: number;
              }>(
                sql`
                  select "courseParticipant"
                  from "old_likes"
                  where "message" = ${old_message.id}
                  order by "id" asc;
                `,
              ))
                database.run(
                  sql`
                    insert into "courseConversationMessageLikes" (
                      "courseConversationMessage",
                      "courseParticipation"
                    )
                    values (
                      ${old_message.id},
                      ${old_like.courseParticipant}
                    );
                  `,
                );
              for (const old_endorsement of database.all<{
                courseParticipant: number;
              }>(
                sql`
                  select "courseParticipant"
                  from "old_endorsements"
                  where "message" = ${old_message.id}
                  order by "id" asc;
                `,
              ))
                if (
                  database.get(
                    sql`
                      select true
                      from "courseConversationMessageLikes"
                      where
                        "courseConversationMessage" = ${old_message.id} and
                        "courseParticipation" = ${old_endorsement.courseParticipant}
                    `,
                  ) === undefined
                )
                  database.run(
                    sql`
                    insert into "courseConversationMessageLikes" (
                      "courseConversationMessage",
                      "courseParticipation"
                    )
                    values (
                      ${old_message.id},
                      ${old_endorsement.courseParticipant}
                    );
                  `,
                  );
            }
          }
        }

        database.execute(
          sql`
            drop table "old_administrationOptions";
            drop table "old_conversations";
            drop table "old_conversationSelectedParticipants";
            drop table "old_courseParticipants";
            drop table "old_courses";
            drop table "old_endorsements";
            drop table "old_invitations";
            drop table "old_likes";
            drop table "old_messageDrafts";
            drop table "old_messagePollOptions";
            drop table "old_messagePolls";
            drop table "old_messagePollVotes";
            drop table "old_messages";
            drop table "old_readings";
            drop table "old_sessions";
            drop table "old_taggings";
            drop table "old_tags";
            drop table "old_users";        
          `,
        );

        if (application.userConfiguration.environment === "development") {
          const userPassword =
            await cryptography.PasswordHash.hash("courselore");
          const [user, ...users] = Array.from(
            { length: 151 },
            (value, userIndex) => {
              const userName = examples.name();
              return database.get<{
                id: number;
                email: string;
              }>(
                sql`
                  select * from "users" where "id" = ${
                    database.run(
                      sql`
                        insert into "users" (
                          "publicId",
                          "name",
                          "email",
                          "emailVerificationEmail",
                          "emailVerificationNonce",
                          "emailVerificationCreatedAt",
                          "password",
                          "passwordResetNonce",
                          "passwordResetCreatedAt",
                          "twoFactorAuthenticationEnabled",
                          "twoFactorAuthenticationSecret",
                          "twoFactorAuthenticationRecoveryCodes",
                          "avatarColor",
                          "avatarImage",
                          "userRole",
                          "lastSeenOnlineAt",
                          "darkMode",
                          "sidebarWidth",
                          "emailNotificationsForAllMessages",
                          "emailNotificationsForMessagesIncludingAMention",
                          "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                          "emailNotificationsForMessagesInConversationsThatYouStarted",
                          "userAnonymityPreferred",
                          "mostRecentlyVisitedCourseParticipation"
                        )
                        values (
                          ${cryptoRandomString({ length: 20, type: "numeric" })},
                          ${userName},
                          ${`${userIndex === 0 ? "system-administrator" : `${userName.replaceAll(/[^A-Za-z]/g, "-").toLowerCase()}--${cryptoRandomString({ length: 3, type: "numeric" })}`}@courselore.org`},
                          ${null},
                          ${null},
                          ${null},
                          ${userPassword},
                          ${null},
                          ${null},
                          ${Number(false)},
                          ${null},
                          ${null},
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
                              ? `/node_modules/@radically-straightforward/examples/avatars/webp/${Math.floor(Math.random() * 263)}.webp`
                              : null
                          },
                          ${userIndex === 0 || Math.random() < 0.05 ? "userRoleSystemAdministrator" : Math.random() < 0.2 ? "userRoleStaff" : "userRoleUser"},
                          ${new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()},
                          ${"userDarkModeSystem"},
                          ${80 * 4},
                          ${Number(Math.random() < 0.1)},
                          ${Number(Math.random() < 0.9)},
                          ${Number(Math.random() < 0.9)},
                          ${Number(Math.random() < 0.9)},
                          ${Math.random() < 0.8 ? "userAnonymityPreferredNone" : Math.random() < 0.8 ? "userAnonymityPreferredCourseParticipationRoleStudents" : "userAnonymityPreferredEveryone"},
                          ${null}
                        );
                      `,
                    ).lastInsertRowid
                  };
            `,
              )!;
            },
          );
          /*
            Please generate examples of conversations.

            The conversations take place in an online forum for a course about Principles of Programming Languages.
            
            The participants are instructors and students.

            A few of the conversations are announcements from instructors (`courseConversationTypeNote`). A few of the announcements are followed by follow-up questions by students and clarifications from the instructors.

            Most of the conversations are questions from students (`courseConversationTypeQuestion`). Most of the questions are answered by instructors, and a few of them by other students. In a few cases the conversation continues, with students asking follow-up questions and other people answering.

            The contents of the messages that are exchanged are formatted in Markdown with support for LaTeX. Most times it’s a short message. A few times it’s a long message that’s several paragraphs long. A few times it includes snippets of code.

            Please generate 20 of these conversations.

            Please make it follow a timeline of the course, for example, the first announcement is welcoming students to the course, then questions about a few homeworks in order, announcements about exams, and so forth, and at the end announcements about the final grades.

            ```json
            {
              "type": "object",
              "required": ["courseConversations"],
              "properties": {
                "courseConversations": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "title",
                      "courseConversationType",
                      "courseConversationMessages"
                    ],
                    "properties": {
                      "title": { "type": "string" },
                      "courseConversationType": {
                        "type": "string",
                        "enum": [
                          "courseConversationTypeNote",
                          "courseConversationTypeQuestion"
                        ]
                      },
                      "courseConversationMessages": {
                        "type": "array",
                        "items": {
                          "type": "object",
                          "required": ["courseParticipationRole", "content"],
                          "properties": {
                            "courseParticipationRole": {
                              "type": "string",
                              "enum": [
                                "courseParticipationRoleInstructor",
                                "courseParticipationRoleStudent"
                              ]
                            },
                            "content": { "type": "string" }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            ```
          */
          for (const courseData of [
            {
              name: "Principles of Programming Languages",
              information: `${String(
                new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).getFullYear(),
              )} / Spring / EN.601.426/626`,
              courseState: "courseStateArchived",
              courseParticipationRole: "courseParticipationRoleInstructor",
              courseConversations: [
                {
                  title:
                    "Welcome to CS 4110: Principles of Programming Languages (Fall 2026)",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Welcome to **CS 4110: Principles of Programming Languages**!\n\nAll lecture slides, homework assignments, and reading materials will be posted on Canvas and discussed here on this forum. \n\n### Important Links & Resources\n- **Lectures:** Mon/Wed 10:00 AM – 11:15 AM\n- **Office Hours:** Posted on the course website calendar\n- **Primary Language:** We will primarily use OCaml for coding assignments throughout the semester.\n\nPlease read the syllabus carefully and make sure your OCaml environment is set up via `opam` (version 5.0+) before our first lab this Friday.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is using WSL2 on Windows officially supported for the OCaml assignments, or do we need a native Linux/macOS environment?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "WSL2 with Ubuntu works great with `opam` and `dune`! You can also use the devcontainer configuration file provided in the course GitHub repository.",
                    },
                  ],
                },
                {
                  title: "HW1: Lexing vs Parsing with Ambiguous Grammars",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Problem 2 of HW1, we are asked to show that the following grammar is ambiguous:\n\n$$E \\to E + E \\mid E \\times E \\mid \\text{id}$$\n\nIs it sufficient to provide two distinct derivation trees for the string $\\text{id} + \\text{id} \\times \\text{id}$, or do we also need to show the leftmost and rightmost derivations explicitly?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Showing two distinct parse trees (or two distinct leftmost derivations) for the exact same input string is completely sufficient to establish ambiguity.",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Clarification on AST datatype definition in OCaml",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For Problem 4, should the `exp` type include explicit parentheses nodes, or should precedence be completely resolved into tree structure during parsing?\n\n```ocaml\ntype binop = Add | Sub | Mul | Div\ntype exp =\n  | Var of string\n  | Int of int\n  | BinOp of binop * exp * exp\n```",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Parentheses only dictate precedence in concrete syntax, so they should not appear in the Abstract Syntax Tree (AST). The nesting of `BinOp` already encodes the grouping.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "That is correct! The AST captures the abstract grammatical structure, so parentheses should not have a dedicated constructor in `exp`.",
                    },
                  ],
                },
                {
                  title:
                    "Big-step vs Small-step Operational Semantics for While Loops",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "I'm having trouble understanding how to express non-termination in big-step operational semantics compared to small-step operational semantics. \n\nIf we have a loop like $\\text{while } \\text{true } \\text{do } \\text{skip}$, small-step semantics produces an infinite sequence of transitions $\\langle c, \\sigma \\rangle \\to \\langle c', \\sigma' \\rangle \\to \\dots$. How does big-step handle this?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In standard big-step semantics (natural semantics), evaluation is modeled as a relation $\\langle c, \\sigma \\rangle \\Downarrow \\sigma'$. \n\nBecause big-step relates a configuration directly to its final terminated state, a non-terminating program simply has **no derivation tree** under the $\\Downarrow$ relation. In other words, you cannot construct a finite proof tree for $\\langle \\text{while } \\text{true } \\text{do } \\text{skip}, \\sigma \\rangle \\Downarrow \\sigma'$ for any $\\sigma'$. This is one of the main limitations of big-step semantics: it cannot easily distinguish between divergence (infinite loops) and getting stuck (runtime errors) without extending the semantic rules.",
                    },
                  ],
                },
                {
                  title:
                    "HW1 Solutions Released & HW2 Posted (Lambda Calculus)",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 1 solutions are now available on the course website. \n\n**Homework 2: Untyped Lambda Calculus & Operational Semantics** has been posted. It is due next Wednesday at 11:59 PM.\n\nPlease start early, as encoding data structures using Church encodings and writing an interpreter with capture-avoiding substitution can be tricky!",
                    },
                  ],
                },
                {
                  title: "HW2: Church Numerals and Predecessor Function",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Could someone give a hint on deriving the predecessor function $\\text{pred}$ for Church numerals? I understand successor:\n$$\\text{succ} = \\lambda n. \\lambda f. \\lambda x. f\\ (n\\ f\\ x)$$\nbut since we cannot 'subtract' an application of $f$, how do pairs help construct $\\text{pred}$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The standard trick is to use a helper function that operates on pairs of numbers: $\\Phi = \\lambda p. \\text{pair}\\ (\\text{snd } p)\\ (\\text{succ } (\\text{snd } p))$.\n\nIf you start with $(\\text{pair } 0\\ 0)$ and apply $\\Phi$ $n$ times using the Church numeral $n$, you obtain the pair $(n-1, n)$ for any $n > 0$. Then $\\text{pred}$ simply extracts the first component: $\\text{fst}\\ (n\\ \\Phi\\ (\\text{pair } 0\\ 0))$.",
                    },
                  ],
                },
                {
                  title: "HW2: Capture-Avoiding Substitution Definition",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Problem 3, when defining $e_1[x \\mapsto e_2]$, what should happen when $e_1 = \\lambda y. e'$ and $y \\in FV(e_2)$?\n\nDo we pick a fresh variable name deterministically or assume $\\alpha$-equivalence?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In your implementation, you should generate a fresh variable name that does not appear in $FV(e_2) \\cup FV(e') \\cup \\{x\\}$. For pen-and-paper proofs, you can simply say 'where $y$ is renamed by $\\alpha$-conversion to a fresh variable $z \\notin FV(e_2) \\cup FV(e')$'.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Thanks! For the coding part, is an incrementing counter like `x1`, `x2`, etc., acceptable for freshness?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, maintaining a counter or using a helper `fresh_var` function is the recommended approach.",
                    },
                  ],
                },
                {
                  title: "Midterm Exam 1 Logistics & Coverage",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Our first midterm exam will take place in class on **Wednesday, October 14**.\n\n### Covered Topics:\n1. Mathematical Induction and Structural Induction\n2. Formal Grammars and Parsing\n3. Operational Semantics (Small-Step and Big-Step)\n4. Untyped $\\lambda$-calculus (Syntax, $\\beta$-reduction strategies, Church encodings, and Substitution)\n\nYou may bring one double-sided letter-sized cheat sheet (handwritten or typed).",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Will we be expected to write OCaml code on the exam, or will all questions use formal mathematical notation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The exam will use standard mathematical syntax and inference rules (e.g. proof trees). No OCaml syntax will be required on the exam.",
                    },
                  ],
                },
                {
                  title: "Midterm Prep: De Bruijn Indices Indexing Convention",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When translating $\\lambda x. \\lambda y. x\\ (x\\ y)$ into De Bruijn notation, is the outermost binder index 0 or index 1 under the convention used in our textbook?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Under the textbook convention (TAPL), indices are 0-based and count the number of binders between the variable occurrence and its enclosing lambda. So $y$ is $0$ and $x$ is $1$. The expression becomes $\\lambda. \\lambda. 1\\ (1\\ 0)$.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Spot on! Counting starts at $0$ for the immediately enclosing $\\lambda$.",
                    },
                  ],
                },
                {
                  title: "Midterm 1 Clarification & Regrade Requests",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Midterm 1 grades and solutions have been released on Gradescope. \n\nOverall, the class median was **84/100**—great work everyone!\n\nIf you believe there was an arithmetic grading error or an oversight in applying the rubric, please submit a regrade request on Gradescope by next Friday at 5:00 PM.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: Simply Typed Lambda Calculus (STLC) & Progress Proof",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In the proof of the **Progress Theorem** for STLC with booleans:\n\n> If $\\vdash e : \\tau$, then either $e$ is a value or there exists $e'$ such that $e \\to e'$.\n\nWhen we do induction on the typing derivation $\\vdash e : \\tau$, do we need to invoke the Canonical Forms Lemma explicitly for the rule `T-App`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! When $e = e_1\\ e_2$ and $\\vdash e_1 : \\tau_1 \\to \\tau_2$, by induction $e_1$ is either a value or takes a step. If $e_1$ is a value, the Canonical Forms Lemma guarantees that $e_1$ must be an abstraction $\\lambda x : \\tau_1. e_{12}$, allowing the $\\beta$-reduction step to proceed once $e_2$ is evaluated to a value.",
                    },
                  ],
                },
                {
                  title: "HW3: Unification Algorithm Failure Modes",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For Hindley-Milner type inference in HW3, what are the exact conditions where `unify(t1, t2)` should raise an error?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "There are two main cases:\n1. Constructor clash (e.g., trying to unify `Int` with `Bool` or `Int` with `t1 -> t2`).\n2. Occurs check failure (e.g., trying to unify type variable `'a` with `'a -> Int`, which would produce an infinite type).",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Exactly. Make sure your `occurs_in` check is tested thoroughly, as missing it can cause infinite recursion in your type checker.",
                    },
                  ],
                },
                {
                  title:
                    "HW4: Continuation-Passing Style (CPS) Transformation for Conditionals",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When translating $\\text{if } e_1 \\text{ then } e_2 \\text{ else } e_3$ to CPS, should the continuation $k$ be duplicated into both branches?\n\nIs this translation correct?\n$$[\\![ \\text{if } e_1 \\text{ then } e_2 \\text{ else } e_3 ]\\] k = [\\![ e_1 ]\\] (\\lambda v_1. \\text{if } v_1 \\text{ then } ([\\![ e_2 ]\\] k) \\text{ else } ([\\![ e_3 ]\\] k))$$",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, that formulation is standard! However, notice that if $k$ is a large expression, duplicating it can lead to exponential code size blowup. \n\nIn practical compilers, one often binds $k$ to a fresh variable: \n$$(\\lambda k_{var}. [\\![ e_1 ]\\] (\\lambda v_1. \\text{if } v_1 \\text{ then } ([\\![ e_2 ]\\] k_{var}) \\text{ else } ([\\![ e_3 ]\\] k_{var})))\\ k$$",
                    },
                  ],
                },
                {
                  title: "HW4: Implementing call/cc in terms of Continuations",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "I'm trying to wrap my head around the typing rule and semantics for `call/cc`. \n\nHow do we represent capturing the current evaluation context $E[\\cdot]$ as a first-class function value?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In a small-step contextual semantics, if your machine configuration is $E[\\text{call/cc } v]$, you reduce it to $E[v\\ (\\text{cont } E)]$, where $(\\text{cont } E)$ is a reified continuation value.\n\nWhen $(\\text{cont } E)$ is later applied to an argument $w$ inside some other context $E'\\ [(\\text{cont } E)\\ w]$, the current context $E'$ is discarded and replaced with the captured context: $E[w]$.",
                    },
                  ],
                },
                {
                  title: "Final Project Guidelines & Midterm 2 Announcement",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Two major announcements:\n\n1. **Midterm 2:** Scheduled for **Wednesday, November 18**. Topics include STLC, Curry-Howard isomorphism, subtyping, and polymorphic types (System F).\n2. **Final Course Project:** The project specification is out! You may work in groups of up to 2 students to build an interpreter or compiler for a mini-language featuring either:\n   - Monadic effects and do-notation\n   - Concurrency via the $\\pi$-calculus or Actor model\n   - Linear / Affine type system\n\nProject proposals are due November 25.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can we propose a custom topic for the final project (e.g., adding Gradual Typing to STLC)?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! Gradual typing is an excellent topic. Please send us a brief 1-page proposal by email or discuss it in office hours first.",
                    },
                  ],
                },
                {
                  title: "HW5: Subtyping and Record Width/Depth Rules",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why is the function subtyping rule contravariant in the parameter type, but covariant in the return type?\n\n$$\\frac{S_1 \\le T_1 \\quad T_2 \\le S_2}{T_1 \\to T_2 \\le S_1 \\to S_2}$$",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Think about the **Liskov Substitution Principle**: a function of type $T_1 \\to T_2$ can safely replace a function of type $S_1 \\to S_2$ if:\n\n1. It demands **less** (or equal) from its argument: it must accept any argument that an $S_1 \\to S_2$ function could receive, meaning $S_1$ must be a subtype of $T_1$ ($S_1 \\le T_1$, contravariance).\n2. It promises **more** (or equal) in its return value: the returned result $T_2$ must be usable wherever an $S_2$ is expected ($T_2 \\le S_2$, covariance).",
                    },
                  ],
                },
                {
                  title: "HW5: System F Type Checking Decidability",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In lecture, we mentioned that type inference for System F is undecidable (Wells' theorem), but type checking explicitly typed System F terms is decidable. Could someone clarify why explicit type annotations make checking decidable?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "With explicit types, every type abstraction $\\Lambda X. e$ and type application $e\\ [\\tau]$ is written out in the AST. The type checker doesn't have to guess or search for which type $\\tau$ to instantiate; it simply performs substitution $\\tau'[X \\mapsto \\tau]$ and checks equality directly.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Correct! Explicit annotations remove the search problem, reducing type checking to deterministic syntax-directed algorithmic verification.",
                    },
                  ],
                },
                {
                  title: "Final Exam Details and Review Session Schedule",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The final exam is scheduled for **December 15, 2:00 PM - 5:00 PM** in Room 101.\n\n### Comprehensive Exam Coverage:\n- Operational Semantics & Inductive Proofs\n- $\\lambda$-calculus & Church Encodings\n- STLC, Type Safety (Progress & Preservation)\n- Hindley-Milner Type Inference (Algorithm W)\n- Subtyping, Records, & System F\n- Continuations, Monads, and Memory Management\n\nWe will host an AMA/Review session this Friday from 3 PM to 5 PM over Zoom.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Will the review session be recorded and uploaded?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, the recording will be published right after the session.",
                    },
                  ],
                },
                {
                  title: "Final Exam Prep: Linear vs Affine Types",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can someone summarize the difference between linear types and affine types in terms of structural rules (Weakening and Contraction)?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Here is the concise summary:\n\n- **Linear Types:** Every resource must be used **exactly once**. Neither Weakening (discarding unused variables) nor Contraction (duplicating variables) is permitted.\n- **Affine Types:** Every resource can be used **at most once**. Weakening is allowed (you may drop a resource without using it), but Contraction is forbidden (you cannot duplicate a resource).\n\nRust's ownership model is fundamentally an affine type system because values can be dropped without explicit consumption.",
                    },
                  ],
                },
                {
                  title: "Final Course Grades and Thank You!",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Final exam scores and course letter grades have been submitted to the registrar and are now viewable on Canvas.\n\nThank you all for an exceptional semester of CS 4110! You've mastered semantics, lambda calculi, sophisticated type systems, and compiler design. Have a restful break and best of luck with your future studies!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Thank you to all the course staff for a great semester! The assignments were challenging but extremely rewarding.",
                    },
                  ],
                },
              ],
            },
            {
              name: "Full-Stack JavaScript",
              information: `${String(new Date().getFullYear())} / Spring`,
              courseParticipationRole: "courseParticipationRoleStudent",
              courseConversations: [
                {
                  title:
                    "Welcome to CS 340: Full-Stack JavaScript! Syllabus and Tooling Setup",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "# Welcome to CS 340: Full-Stack JavaScript!\n\nWelcome everyone! Over the next 14 weeks, we will explore end-to-end web application development using the modern JavaScript ecosystem.\n\n### Required Tooling Checklist:\n1. **Node.js**: Version `v20.x` LTS or higher.\n2. **Package Manager**: `npm` v10+ or `pnpm`.\n3. **Editor**: VS Code (recommended extensions: ESLint, Prettier, Error Lens).\n4. **Database**: Docker Desktop (for running local MongoDB/PostgreSQL instances).\n\nPlease review the syllabus on Canvas. Our first assignment, **HW1: Asynchronous Node.js & Event Loop**, is already released and due next Sunday at 11:59 PM.\n\nLet's have a fantastic semester!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Hi Professor! Are we allowed to use `pnpm` for our homework submissions, or must all projects include a standard `package-lock.json` generated by `npm` for the autograder?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Great question! The autograder runs `npm ci`, so please ensure a valid `package-lock.json` is committed to the root of your repository before submitting.",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Microtasks vs Macrotasks execution order clarification",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Problem 2 of HW1, I'm trying to trace the output of the following snippet:\n\n```javascript\nconsole.log('1');\nsetTimeout(() => console.log('2'), 0);\nPromise.resolve().then(() => console.log('3'));\nprocess.nextTick(() => console.log('4'));\nconsole.log('5');\n```\n\nI predicted `1, 5, 3, 4, 2`, but Node outputs `1, 5, 4, 3, 2`. Why does `process.nextTick` execute before `Promise.then`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In Node.js, `process.nextTick` has its own priority queue called the **nextTickQueue**, which is drained immediately after the current synchronous phase completes, *before* the standard microtask queue (where Promise resolutions live) is processed.\n\nThe priority order per tick is:\n1. Synchronous execution (`1`, `5`)\n2. `process.nextTick` queue (`4`)\n3. Microtask queue / Promises (`3`)\n4. Macrotask / Timers queue (`2`)",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Error handling with `fs/promises` in custom stream pipeline",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When using `pipeline` from `stream/promises` with `fs.createReadStream`, does unhandled stream failure throw a rejected promise, or do we still need explicit `.on('error')` listeners?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "The `stream/promises` version of `pipeline` automatically converts stream errors into promise rejections, so wrapping it in a `try/catch` block is sufficient!",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "That is correct. Here is the canonical pattern:\n\n```javascript\nimport { pipeline } from 'node:stream/promises';\nimport { createReadStream, createWriteStream } from 'node:fs';\n\ntry {\n  await pipeline(\n    createReadStream('input.txt'),\n    transformStream,\n    createWriteStream('output.txt')\n  );\n} catch (err) {\n  console.error('Pipeline failed:', err.message);\n}\n```",
                    },
                  ],
                },
                {
                  title:
                    "HW2: Express middleware order and error-handling signatures",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "My custom error handling middleware in Express isn't intercepting errors thrown in my route handlers. Here is my setup:\n\n```javascript\napp.use((err, req, res, next) => {\n  res.status(500).json({ error: err.message });\n});\n\napp.get('/api/users/:id', async (req, res, next) => {\n  const user = await findUser(req.params.id);\n  if (!user) throw new Error('Not found');\n  res.json(user);\n});\n```\n\nWhy is Express falling back to the default HTML stack trace?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Two issues here:\n\n1. **Middleware Registration Order**: Express processes middleware sequentially. Error-handling middleware **must** be registered after all route declarations (`app.use(routes)` before `app.use(errorHandler)`).\n2. **Async Errors in Express < 5**: If you are using Express 4.x, unhandled promise rejections inside `async` routes are not caught automatically. You must pass the error via `next(err)` or wrap the handler:\n\n```javascript\napp.get('/api/users/:id', async (req, res, next) => {\n  try {\n    const user = await findUser(req.params.id);\n    if (!user) return res.status(404).json({ error: 'Not found' });\n    res.json(user);\n  } catch (err) {\n    next(err);\n  }\n});\n```",
                    },
                  ],
                },
                {
                  title:
                    "Important Note on HW2: Express Route Controllers & Input Validation",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "### HW2 Announcement & Common Pitfalls\n\nWe have noticed several submissions failing test cases for input validation. Please ensure you are validating request payloads using a schema validator like **Zod** before calling your database services.\n\nExample schema validation middleware pattern:\n\n```typescript\nimport { z } from 'zod';\n\nexport const validateBody = (schema: z.ZodSchema) => (req, res, next) => {\n  const result = schema.safeParse(req.body);\n  if (!result.success) {\n    return res.status(400).json({ errors: result.error.flatten() });\n  }\n  req.validatedBody = result.data;\n  next();\n};\n```\n\nLate submissions will incur a $10\\%$ penalty per $24\\text{ hours}$ past the deadline.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: Mongoose Virtuals vs Pre-save Hooks for computed properties",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For HW3, we need to calculate `totalPrice` from an array of order items: $\\text{totalPrice} = \\sum_{i=1}^{n} (\\text{quantity}_i \\times \\text{unitPrice}_i)$.\n\nShould we store this as a persisted field updated in a `pre('save')` hook, or use a Mongoose virtual getter?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If you do not need to index or query by `totalPrice` (e.g. `Order.find({ totalPrice: { $gt: 100 } })`), use a **virtual getter** to prevent data inconsistency.\n\nIf you need to query or sort by this field in MongoDB aggregation queries, calculate and persist it during `pre('save')`.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: MongoDB aggregation pipeline for nested array grouping",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we unroll nested tags and calculate average score per tag in the aggregation pipeline for Task 3?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "You can use `$unwind` followed by `$group`. Something like:\n\n```javascript\nawait Post.aggregate([\n  { $unwind: '$tags' },\n  {\n    $group: {\n      _id: '$tags',\n      avgScore: { $avg: '$score' },\n      count: { $sum: 1 }\n    }\n  },\n  { $sort: { avgScore: -1 } }\n]);\n```",
                    },
                  ],
                },
                {
                  title:
                    "Midterm Examination Logistics, Format, and Formula Sheet",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "# Midterm Exam Logistics\n\nThe Midterm Examination will take place next **Wednesday from 7:00 PM to 8:30 PM EST** online via Canvas with Respondus Lockdown Browser.\n\n### Covered Topics (Weeks 1 through 6):\n* Node.js runtime architecture & libuv threadpool\n* Async control flow (Callbacks, Promises, Async/Await)\n* RESTful API design principles with Express\n* MongoDB schema modeling, indexing strategy, and Aggregation Framework\n* Security basics: CORS, input sanitization, and SQL/NoSQL injection mitigations\n\nYou are permitted **one sheet ($8.5 \\times 11\\text{ inches}$, both sides)** of hand-written notes.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Will we be required to write complete Express application boilerplate, or will skeleton code be provided for coding problems?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "All coding questions will provide skeleton code; you will only need to implement specific route handlers, middleware, or pipeline stages.",
                    },
                  ],
                },
                {
                  title:
                    "Midterm Review: MongoDB compound index prefix rule question",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "If an index is defined as `{ status: 1, createdAt: -1, user: 1 }`, will a query searching only `{ createdAt: -1, user: 'abc' }` make use of this index with $O(\\log N)$ lookup time?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "No. MongoDB compound indexes adhere to the **Equality, Sort, Range (ESR)** and leftmost prefix rule.\n\nBecause the query omits the leading key `status`, the index prefix cannot be utilized for index filtering, resulting in a full collection scan ($O(N)$) unless an index starting with `createdAt` exists.",
                    },
                  ],
                },
                {
                  title:
                    "HW4: React `useEffect` infinite re-render with object dependency",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In HW4, my component enters an infinite re-render loop as soon as the page loads:\n\n```tsx\nconst UserProfile = ({ userId }: { userId: string }) => {\n  const [data, setData] = useState(null);\n  const options = { detailed: true };\n\n  useEffect(() => {\n    fetchUserData(userId, options).then(setData);\n  }, [userId, options]);\n\n  return <div>{data?.name}</div>;\n};\n```\n\nWhy does this happen even if `userId` doesn't change?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Every time `UserProfile` renders, a new object reference for `options` is created (`{} !== {}`). Because `options` is in the dependency array, React detects a reference change and triggers `useEffect` again, updating state and causing another render.\n\n### Fixes:\n1. Wrap `options` in `useMemo`:\n```tsx\nconst options = useMemo(() => ({ detailed: true }), []);\n```\n2. Or define it outside the component if it is static.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "That fixed it immediately! Should we also pass primitive values directly instead of objects whenever possible?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! Passing primitive types (strings, booleans, numbers) directly into the dependency array avoids reference instability altogether.",
                    },
                  ],
                },
                {
                  title:
                    "HW4: Custom hook cleanup with AbortController for race conditions",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we properly handle request cancellation in our `useFetch` hook when the component unmounts before the network request resolves?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "You can instantiate an `AbortController` inside `useEffect` and return a cleanup function:\n\n```typescript\nuseEffect(() => {\n  const controller = new AbortController();\n\n  fetch(url, { signal: controller.signal })\n    .then(res => res.json())\n    .then(data => setData(data))\n    .catch(err => {\n      if (err.name !== 'AbortError') setError(err);\n    });\n\n  return () => controller.abort();\n}, [url]);\n```",
                    },
                  ],
                },
                {
                  title:
                    "HW5: Storing JWTs - `httpOnly` cookies vs `localStorage`",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For our authentication assignment, why are we required to use `httpOnly; Secure; SameSite=Strict` cookies instead of just keeping the JWT in `localStorage` and sending it via the `Authorization: Bearer <token>` header?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The primary reason is **Cross-Site Scripting (XSS)** mitigation.\n\nIf an attacker exploits an XSS vulnerability on your frontend, any malicious script can execute `localStorage.getItem('token')` and exfiltrate the credential.\n\nWhen stored in an `httpOnly` cookie:\n1. Client-side JavaScript has zero access to the cookie value via `document.cookie`.\n2. Setting `SameSite=Strict` or `Lax` mitigates **Cross-Site Request Forgery (CSRF)** attacks.\n3. Setting `Secure` guarantees transmission only over HTTPS.",
                    },
                  ],
                },
                {
                  title:
                    "Final Project Guidelines, Milestones, and Capstone Specifications",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "# Final Project Capstone Released!\n\nThe final project is a full-stack, production-ready web application built in teams of 3–4 students.\n\n### Core Architecture Requirements:\n* **Frontend**: Next.js 14+ (App Router) or React with Vite.\n* **Backend**: Node.js/Express or NestJS with REST or GraphQL endpoints.\n* **Database**: PostgreSQL (Prisma/Drizzle ORM) or MongoDB (Mongoose) with relational constraints.\n* **Realtime**: WebSockets or Server-Sent Events for live synchronization.\n* **Testing**: At least $80\\%$ code coverage on core business logic using Jest/Vitest.\n* **CI/CD**: GitHub Actions workflow deploying to Vercel/Render/Fly.io.\n\n### Key Deadlines:\n* Proposal & Team Roster: **Nov 2**\n* Milestone 1 (MVP & Schema): **Nov 16**\n* Final Video Demo & Code Freeze: **Dec 7**",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can we build a mobile client using React Native instead of a web frontend if our backend satisfies all requirements?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, React Native / Expo is approved as long as your repository includes automated integration tests and a live deployed backend API.",
                    },
                  ],
                },
                {
                  title:
                    "HW6: Next.js App Router Server Actions vs Route Handlers",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Next.js App Router, when should we prefer Server Actions (`'use server'`) over traditional Route Handlers (`app/api/.../route.ts`) for mutating database records?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Use **Server Actions** when you are handling mutations directly coupled to UI form submissions or buttons inside your React tree, as they seamlessly integrate with `useActionState`, optimistic updates (`useOptimistic`), and automated cache revalidation (`revalidatePath`).\n\nUse **Route Handlers** (`route.ts`) when:\n* Exposing a public RESTful API for external third-party consumers.\n* Handling non-POST webhooks (e.g. Stripe webhook verification).",
                    },
                  ],
                },
                {
                  title:
                    "HW6: Socket.io acknowledgment callbacks with timeout fallback",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we implement client-side timeout handling in Socket.io v4 if the server fails to trigger the acknowledgment callback?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Socket.io provides a built-in `.timeout()` method that automatically returns an error if the server does not acknowledge within the allotted window:\n\n```typescript\nsocket.timeout(5000).emit('chat:send', { text: message }, (err, response) => {\n  if (err) {\n    console.error('Server failed to acknowledge within 5s');\n  } else {\n    console.log('Message delivered with ID:', response.messageId);\n  }\n});\n```",
                    },
                  ],
                },
                {
                  title:
                    "HW7: Mocking Prisma Client in Supertest integration test suite",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When testing Express routes with `supertest`, is it better to mock the Prisma database client using `jest-mock-extended`, or spin up a temporary Docker test database?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For integration tests, running against a real Dockerized database (e.g. using Testcontainers) gives much higher fidelity since mocked queries won't catch SQL foreign key constraint violations.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "I second this recommendation. Reserve unit test mocks for external 3rd party APIs (like Stripe or SendGrid). For route integration testing, use an isolated test database container.",
                    },
                  ],
                },
                {
                  title:
                    "Final Project: Docker multi-stage build optimization for Next.js",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Our production Docker image for our Next.js application is over $1.4\\text{ GB}$. How can we reduce this image footprint for deployment?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Leverage Next.js **standalone output mode** with multi-stage Docker builds:\n\n1. In `next.config.js`:\n```javascript\nmodule.exports = {\n  output: 'standalone',\n};\n```\n2. In your `Dockerfile`, use a `base`, `builder`, and lean `runner` stage copying only `.next/standalone` and `public`.\n\nThis typically reduces the final image size from $\\sim 1.5\\text{ GB}$ down to less than $150\\text{ MB}$.",
                    },
                  ],
                },
                {
                  title:
                    "Final Exam Schedule, Format, and Comprehensive Review Guide",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "# Final Exam Information\n\nThe Final Exam will take place on **December 15, 8:00 AM – 10:30 AM EST**.\n\n### Format:\n* $40\\%$ Conceptual multiple choice & short answer questions.\n* $30\\%$ Code output analysis, async trace diagrams, & performance profiling.\n* $30\\%$ Hands-on coding (React Hooks, Next.js Server Actions, SQL/NoSQL schema modeling).\n\nReview sessions will be held this Friday during regular lecture hours and recorded.",
                    },
                  ],
                },
                {
                  title:
                    "Final Exam Clarification: CORS Preflight triggers and HTTP Methods",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "During the review session, you mentioned 'Simple Requests' bypass CORS preflight `OPTIONS` requests. Does a `POST` request with `Content-Type: application/json` trigger a preflight?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! A request is considered a **Simple Request** only if its `Content-Type` is one of:\n* `application/x-www-form-urlencoded`\n* `multipart/form-data`\n* `text/plain`\n\nSince `application/json` is not on the exempt list, modern browsers will always dispatch an `OPTIONS` preflight request prior to sending the `POST` payload.",
                    },
                  ],
                },
                {
                  title:
                    "Final Course Grades Posted, Solutions Released, and Farewell!",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "# Final Grades & Course Wrap-Up\n\nFinal grades have been computed and submitted to the registrar. Detailed grading breakdowns for the final exam and capstone projects are available on Canvas.\n\n### Class Statistics:\n* **Mean Grade**: $88.4\\%$\n* **Median Grade**: $90.1\\%$\n\nThank you for an inspiring semester of building full-stack applications. Best of luck in your software engineering careers!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Thank you Professor and the TAs for such an engaging and practical course!",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It was our pleasure! Keep building cool projects!",
                    },
                  ],
                },
              ],
            },
            {
              name: "Principles of Programming Languages",
              information: `${String(new Date().getFullYear())} / ${new Date().getMonth() < 6 ? "Spring" : "Fall"} / EN.601.426/626`,
              courseParticipationRole: "courseParticipationRoleInstructor",
              courseConversations: [
                {
                  title:
                    "Welcome to CS 412: Principles of Programming Languages (Fall 2026)",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Welcome to **CS 412: Principles of Programming Languages**!\n\nIn this course, we will explore the mathematical foundations and design principles behind modern programming languages. Topics include:\n- Operational and Denotational Semantics\n- Lambda Calculus ($\u0300$-calculus)\n- Type Systems & Type Safety (Progress & Preservation)\n- Type Inference (Algorithm $\\mathcal{W}$)\n- Continuations and Control Flow\n- Concurrency and Memory Models\n\nPlease read the syllabus on the course website and set up your OCaml environment (Dune + OCaml 5.x) as soon as possible. Office hours start tomorrow!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Thank you Professor! Will lectures be recorded and posted on the portal?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, lecture recordings will be uploaded within 24 hours of each lecture.",
                    },
                  ],
                },
                {
                  title: "Issues setting up opam switch on macOS",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "I am trying to initialize my OCaml environment on macOS Apple Silicon, but running `opam switch create cs412 5.1.0` fails with a C compiler error. Has anyone encountered this?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Make sure you have Xcode command line tools installed via `xcode-select --install`. Also check that Homebrew's binary path is properly exported in your `~/.zshrc`:\n```bash\neval $(opam env)\n```\nLet us know if the issue persists during today's lab setup session.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Running `xcode-select --install` solved it! Thank you!",
                    },
                  ],
                },
                {
                  title: "Textbook and Supplementary Reading Materials",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Are the readings in Benjamin Pierce's *Types and Programming Languages* (TaPL) required or recommended?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "*Types and Programming Languages* (TaPL) is the primary reference for the middle third of the course (STLC, subtyping, polymorphism). Lecture notes are self-contained, but reading Chapters 3, 5, 8, and 9 in TaPL will significantly deepen your understanding.",
                    },
                  ],
                },
                {
                  title: "Clarification on OCaml Utop Configuration",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How can I automatically load my modules into `utop` without typing `#use` every time?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "You can launch `dune utop` inside your project directory! Dune will automatically compile your source files and make all defined modules available in the top-level.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "+1 to this answer. Running `dune utop lib` is the recommended workflow for all homework assignments.",
                    },
                  ],
                },
                {
                  title:
                    "Homework 1 Released: Inductive Definitions and AST Interpreters",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 1 is now live on GitHub Classroom and Gradescope.\n\n**Key Topics:**\n- Mathematical and Structural Induction\n- Abstract Syntax Trees (ASTs) in OCaml\n- A simple arithmetic expression evaluator ($e \\Coloneqq n \\mid e_1 + e_2 \\mid e_1 \\times e_2$)\n\n**Due Date:** September 28 at 11:59 PM.\n\nPlease review the academic integrity policy before starting.",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Base case for structural induction over binary expressions",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Problem 1.2, we are asked to prove a property $P(e)$ for all expressions $e$ by structural induction. Is the base case just integer constants $n \\in \\mathbb{Z}$, or do variables count as base cases too?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "For the grammar defined in Problem 1:\n$$\ne \\Coloneqq n \\mid x \\mid e_1 + e_2 \\mid e_1 \\times e_2\n$$\nBoth constants $n$ and variable identifiers $x$ are atomic terms with no subexpressions, so both must be treated as independent base cases in your inductive proof.",
                    },
                  ],
                },
                {
                  title: "Ambiguous Grammars in Problem 2",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "To prove a grammar is ambiguous, is it sufficient to provide one string with two distinct parse trees, or do we also need two distinct leftmost derivations?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Either is sufficient, because a grammar is ambiguous if and only if there exists a string with two distinct parse trees (which is equivalent to having two distinct leftmost derivations). Just make sure to draw or write out both trees/derivations explicitly.",
                    },
                  ],
                },
                {
                  title: "Tail recursion requirement for `eval_all`",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For HW1 Question 4, does `eval_all : expr list -> int list` need to be strictly tail-recursive?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "The handout says helper functions operating on lists of arbitrary length should be tail-recursive to avoid stack overflows on large test cases. You can use an accumulator with `List.rev` or `List.rev_map`.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Correct. The autograder tests lists with up to $10^6$ elements, so non-tail-recursive implementations will fail due to stack overflow.",
                    },
                  ],
                },
                {
                  title: "Pattern match exhaustiveness warning in OCaml",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        'Dune is treating Warning 8 (partial pattern matching) as an error in my AST traversal. Is using a catch-all `_ -> failwith "unreachable"` acceptable?',
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "We strongly discourage wildcard catch-alls like `_ -> failwith ...` unless absolutely necessary, because they hide bugs when new constructors are added. Instead, enumerate all valid AST variants or handle the malformed AST cases explicitly.",
                    },
                  ],
                },
                {
                  title: "HW1 Autograder test cases now visible on Gradescope",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "We have updated the Gradescope autograder for HW1 to show public test failure diffs. You are allowed unlimited submissions until the deadline.",
                    },
                  ],
                },
                {
                  title: "Deriving associativity in recursive descent parser",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When parsing left-associative subtraction $e_1 - e_2 - e_3$, our naive grammar $E \\to E - T \\mid T$ is left-recursive. How should we refactor it for LL(1) parsing?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Recall standard left-recursion elimination:\n$$\n\\begin{aligned}\nE &\\to T\\ E' \\\\\nE' &\\to -\\ T\\ E' \\mid \\epsilon\n\\end{aligned}\n$$\nWhen constructing the AST in your parser action, fold the list of terms left-associatively: `List.fold_left (fun acc t -> Sub(acc, t)) first rest`.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "That makes complete sense, thank you!",
                    },
                  ],
                },
                {
                  title: "Induction principle over recursively defined sets",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In lecture, we stated that structural induction follows from the principle of well-founded induction. What is the well-founded relation for ASTs?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The relation is the strict subterm ordering: $e_1 \\prec e_2$ iff $e_1$ is a proper subexpression of $e_2$. Since every expression has finite height/size (a finite number of AST nodes), $\\prec$ contains no infinite descending chains, making it well-founded.",
                    },
                  ],
                },
                {
                  title: "HW1 Submission deadline reminder",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Reminder: HW1 is due tonight at 11:59 PM. Each student has 3 late days total for the entire semester. If you submit late without late days, a 20% penalty per 24 hours applies.",
                    },
                  ],
                },
                {
                  title:
                    "Homework 2 Released: Operational Semantics and the Lambda Calculus",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 2 has been released.\n\n**Topics:**\n- Small-step ($\u2192$) and Big-step ($\\Downarrow$) Operational Semantics\n- Untyped $\\lambda$-calculus syntax, free variables, and capture-avoiding substitution\n- Church encodings and fixed-point combinators ($Y$ and $\\Theta$)\n- Call-by-Value vs Call-by-Name evaluation\n\n**Due Date:** October 12 at 11:59 PM.",
                    },
                  ],
                },
                {
                  title: "Big-step vs Small-step divergence behavior",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why is small-step semantics considered more expressive than big-step semantics when modeling non-terminating programs?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In big-step semantics ($e \\Downarrow v$), non-termination is represented merely by the absence of a derivation tree. You cannot distinguish between an expression that loops indefinitely (diverges) and one that gets stuck due to a runtime type error.\n\nIn small-step semantics ($e \\to e'$), divergence is explicitly observable as an infinite reduction sequence $e_0 \\to e_1 \\to e_2 \\to \\cdots$, while getting stuck is characterized by reaching an irreducible non-value term.",
                    },
                  ],
                },
                {
                  title: "Substitution definition for $\\lambda$-calculus",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In the capture-avoiding substitution rule for abstraction:\n$$(\\lambda y.\\, e)[x \\mapsto s]$$\nWhat condition requires $\\alpha$-renaming $y$?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "If $y \\neq x$ and $y \\in \\text{FV}(s)$, substituting $s$ directly would cause the free occurrences of $y$ in $s$ to be accidentally captured by $\\lambda y$. So you must rename $y$ to a fresh variable $z \\notin \\text{FV}(e) \\cup \\text{FV}(s)$ first.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "Spot on! That is the classic capture bug.",
                    },
                  ],
                },
                {
                  title: "Church Numeral Multiplication reduction step",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For Church numerals $c_n = \\lambda f.\\, \\lambda x.\\, f^n(x)$, the multiplication operator is $\\text{mult} = \\lambda m.\\, \\lambda n.\\, \\lambda f.\\, m\\,(n\\,f)$.\n\nHow do we evaluate $\\text{mult}\\ c_2\\ c_3$ step-by-step under call-by-value?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Under CBV, function arguments are reduced to values before applying the function body:\n$$\n\\begin{aligned}\n\\text{mult}\\ c_2\\ c_3 &\\to (\\lambda n.\\, \\lambda f.\\, c_2\\,(n\\,f))\\ c_3 \\\\\n&\\to \\lambda f.\\, c_2\\,(c_3\\,f) \\\\\n&= \\lambda f.\\, (\\lambda g.\\, \\lambda x.\\, g\\,(g\\,x))\\ (c_3\\,f) \\\\\n&\\to \\lambda f.\\, \\lambda x.\\, (c_3\\,f)\\ ((c_3\\,f)\\,x)\n\\end{aligned}\n$$\nSince $c_3\\,f = \\lambda y.\\, f(f(f(y)))$, applying it twice composes $f$ six times: $\\lambda f.\\, \\lambda x.\\, f^6(x) = c_6$.",
                    },
                  ],
                },
                {
                  title:
                    "Call-by-Value vs Call-by-Name with the $\\Omega$ combinator",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Consider the term $(\\lambda x.\\, 42)\\ \\Omega$, where $\\Omega = (\\lambda y.\\, y\\,y)(\\lambda y.\\, y\\,y)$. Does this term terminate under CBN and CBV?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Under **Call-by-Name (CBN)**, the argument is not evaluated beforehand:\n$$(\\lambda x.\\, 42)\\ \\Omega \\to_{\\text{CBN}} 42$$\nIt terminates in 1 step!\n\nUnder **Call-by-Value (CBV)**, the argument $\\Omega$ must be evaluated to a value first:\n$$(\\lambda x.\\, 42)\\ \\Omega \\to_{\\text{CBV}} (\\lambda x.\\, 42)\\ \\Omega \\to_{\\text{CBV}} \\cdots$$\nBecause $\\Omega \\to \\Omega$, it enters an infinite loop and diverges.",
                    },
                  ],
                },
                {
                  title: "Why doesn't the Y-combinator work in Call-by-Value?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why does $Y = \\lambda f.\\, (\\lambda x.\\, f\\,(x\\,x))(\\lambda x.\\, f\\,(x\\,x))$ loop infinitely in eager languages like OCaml?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Because in CBV, evaluating $Y\\ F \\to (\\lambda x.\\, F\\,(x\\,x))(\\lambda x.\\, F\\,(x\\,x)) \\to F\\ (Y\\ F)$. To call $F$, CBV tries to evaluate the argument $Y\\ F$ first, which expands to $F\\ (Y\\ F)$ forever before $F$ even gets to inspect its input.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Exactly. To fix this in CBV, we $\\eta$-expand the application, yielding the $Z$-combinator:\n$$Z = \\lambda f.\\, (\\lambda x.\\, f\\,(\\lambda v.\\, x\\,x\\,v))(\\lambda x.\\, f\\,(\\lambda v.\\, x\\,x\\,v))$$",
                    },
                  ],
                },
                {
                  title: "Evaluation Contexts notation $E[e]$",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Could someone clarify the notation $E[e]$ used in small-step operational semantics?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "An evaluation context $E$ represents an 'expression with a hole' $[\u00B7]$, defining the exact position where the next reduction step can occur.\n\nFor example, in left-to-right CBV:\n$$E \\Coloneqq [\\cdot] \\mid E\\ e \\mid v\\ E$$\nIf we have the rule $(\\lambda x.\\, e)\\,v \\to e[x \\mapsto v]$, we can express global reduction compactly as:\n$$\\frac{e \\to e'}{E[e] \\to E[e']}$$\nThis replaces having to write separate congruence rules for every syntactic form.",
                    },
                  ],
                },
                {
                  title: "HW2 Problem 4: De Bruijn Indices Indexing Bug",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In de Bruijn representation, how do we represent the term $\\lambda x.\\, \\lambda y.\\, x\\,(\\lambda z.\\, y\\,z)$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Counting enclosing lambdas (0-indexed):\n- $x$ is bound 2 binders up: index 1\n- $y$ is bound 2 binders up from inside the $z$ abstraction: index 1\n- $z$ is bound by innermost binder: index 0\n\nSo the nameless term is:\n$$\\lambda \\lambda 1\\,(\\lambda 1\\,0)$$",
                    },
                  ],
                },
                {
                  title: "Midterm Exam 1 Logistics & Review Session",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        '**Midterm Exam 1 Announcement**\n\n- **Date & Time:** Thursday, October 15, 7:00 PM - 9:00 PM\n- **Location:** Auditorium Hall B\n- **Coverage:** Lecture 1 through Lecture 10 (Induction, Grammars, ASTs, Big/Small-step Semantics, $\\lambda$-calculus, Substitution, Encodings)\n- **Permitted Materials:** One double-sided handwritten 8.5x11" cheat sheet.\n\nA review session will be held on Tuesday, October 13 at 6:00 PM on Zoom.',
                    },
                  ],
                },
                {
                  title: "Sample Midterm 1: Confluence of $\\beta$-reduction",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Question 3 on the sample midterm asks: Does full $\\beta$-reduction satisfy the diamond property ($\u2192$)? I know Church-Rosser holds for $\u2192^*$, but does $\u2192$ itself have the one-step diamond property?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "No, single-step $\\beta$-reduction does **not** satisfy the one-step diamond property. Consider $(\\lambda x.\\, x\\,x)((\\lambda y.\\, y)\\,z)$:\n- Reducing the inner redex gives $(\\lambda x.\\, x\\,x)\\,z \\to z\\,z$.\n- Reducing the outer redex duplicates the unreduced redex: $((\\lambda y.\\, y)\\,z)((\\lambda y.\\, y)\\,z)$, which requires two steps to reach $z\\,z$.\n\nTo prove confluence, we use parallel reduction ($\u21D2$), which does satisfy the diamond property.",
                    },
                  ],
                },
                {
                  title: "Cheatsheet guidelines for Midterm 1",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Are tablet-written and printed cheat sheets allowed, or must they be physically written with pen/pencil?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Tablet-written cheat sheets printed out on physical paper are completely fine as long as the font size is readable without magnification.",
                    },
                  ],
                },
                {
                  title:
                    "Midterm 1 Grades Published and Regrade Request Window",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Midterm 1 grades are now available on Gradescope.\n\n- **Mean:** 78.4 / 100\n- **Median:** 81.0 / 100\n- **Standard Deviation:** 12.2\n\nRegrade requests will be open until October 22 at 11:59 PM. Please make sure to include a specific justification referencing the rubric for any regrade request.",
                    },
                  ],
                },
                {
                  title:
                    "Regrade question on Problem 2 (Small-step derivation)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "On Problem 2(b), I lost 3 points because I omitted the premise for rule [E-App1] when evaluating `(1 + 2) 3`. Is the premise mandatory if the left term is obviously an addition?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes. A formal derivation tree must show every inference step from axioms to the conclusion:\n$$\\frac{1 + 2 \\to 3}{(1+2)\\ 3 \\to 3\\ 3}\\text{[E-App1]}$$\nOmitting premises makes the deduction tree incomplete according to the rubric.",
                    },
                  ],
                },
                {
                  title:
                    "Homework 3 Released: Simply Typed Lambda Calculus (STLC)",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 3 is officially assigned.\n\n**Topics:**\n- Simply Typed $\\lambda$-calculus (STLC) with Base Types ($\\text{Bool}, \\text{Nat}$)\n- Typing contexts $\\Gamma \\vdash e : \\tau$\n- Proofs of **Progress** and **Preservation** (Type Safety)\n- Extending STLC with Product and Sum types\n\n**Due Date:** October 26 at 11:59 PM.",
                    },
                  ],
                },
                {
                  title:
                    "STLC: Typing Rule for Abstraction and Variable Lookup",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In STLC, why does the abstraction rule require extending the typing context $\\Gamma$:\n$$\\frac{\\Gamma, x : \\tau_1 \\vdash e : \\tau_2}{\\Gamma \\vdash \\lambda x{:}\\tau_1.\\, e : \\tau_1 \\to \\tau_2}$$\nWhat happens if $x$ is already present in $\\Gamma$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The notation $\\Gamma, x : \\tau_1$ represents shadowing the previous binding of $x$ (or extending the mapping if $x \\notin \\text{dom}(\\Gamma)$). When type checking the function body $e$, occurrences of $x$ refer to the parameter with type $\\tau_1$.",
                    },
                  ],
                },
                {
                  title: "Can a well-typed STLC term loop forever?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can we type-check the $\\Omega = (\\lambda x.\\, x\\,x)(\\lambda x.\\, x\\,x)$ term in STLC?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "No, because for $x\\,x$ to typecheck, $x$ must have a function type $\\tau_1 \\to \\tau_2$, but $x$ is applied to itself, so its argument type must also be $\\tau_1 \\to \\tau_2$. This would require solving the infinite type equation $\\tau_1 = \\tau_1 \\to \\tau_2$, which has no finite solution in STLC.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Precisely! In fact, STLC is **strongly normalizing**: every well-typed program terminates in a finite number of evaluation steps (Tait's method / logical relations).",
                    },
                  ],
                },
                {
                  title: "Substitution Lemma Proof for Preservation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For the Preservation theorem, we need the Substitution Lemma:\n$$\\text{If } \\Gamma, x : \\tau' \\vdash e : \\tau \\text{ and } \\Gamma \\vdash e' : \\tau', \\text{ then } \\Gamma \\vdash e[x \\mapsto e'] : \\tau$$\nShould the proof proceed by induction on the derivation of $\\Gamma, x : \\tau' \\vdash e : \\tau$ or by induction on the structure of $e$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Induction on the typing derivation $\\Gamma, x : \\tau' \\vdash e : \\tau$ is the cleanest and most standard approach. It ensures each typing rule case (T-Var, T-Abs, T-App, etc.) directly provides the inductive hypotheses on the sub-derivations.",
                    },
                  ],
                },
                {
                  title: "Progress theorem: Inversion on Boolean values",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In the proof of Progress for conditional expressions $\\text{if } e_1 \\text{ then } e_2 \\text{ else } e_3$, when $e_1$ is a value, how do we formally justify that $e_1$ is either $\\text{true}$ or $\\text{false}$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "You invoke the **Canonical Forms Lemma** for booleans:\n$$\\text{If } \\vdash v : \\text{Bool} \\text{ and } v \\text{ is a value, then } v = \\text{true} \\text{ or } v = \\text{false}.$$\nThis guarantees $e_1$ cannot be an abstraction $\\lambda x.\\, e$ or integer.",
                    },
                  ],
                },
                {
                  title: "Clarification on Sum Types elimination rule",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the typing rule for `case` analysis on sum types $\\tau_1 + \\tau_2$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The standard typing rule is:\n$$\\frac{\\Gamma \\vdash e : \\tau_1 + \\tau_2 \\quad \\Gamma, x_1 : \\tau_1 \\vdash e_1 : \\tau \\quad \\Gamma, x_2 : \\tau_2 \\vdash e_2 : \\tau}{\\Gamma \\vdash \\text{case } e \\text{ of } \\text{inl}(x_1) \\Rightarrow e_1 \\mid \\text{inr}(x_2) \\Rightarrow e_2 : \\tau}$$\nNotice that both branches $e_1$ and $e_2$ must produce the exact same type $\\tau$.",
                    },
                  ],
                },
                {
                  title: "Unit Type vs Empty (Void) Type",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the theoretical distinction between $\\text{Unit}$ and $\\text{Void}$ (Bottom $\\bot$) in type theory?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- $\\text{Unit}$ is the 0-ary product type ($1$). It has exactly **one** value: `()`.\n- $\\text{Void}$ is the 0-ary sum type ($0$). It has **zero** values.\n\nA function $\\text{Unit} \\to \\tau$ represents a delayed computation (thunk), whereas a function $\\tau \\to \\text{Void}$ represents a computation that cannot return normally (e.g. divergence or raising an uncatchable exception).",
                    },
                  ],
                },
                {
                  title: "HW3 Type Checker: Handling unbound variables",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Should our `typeof : context -> expr -> (typ, string) result` return an `Error` when encountering an unbound variable, or raise an exception?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "The homework signature expects `Result.Error msg` for any type errors, including unbound variables.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Confirmed. Do not raise uncaught exceptions; use the `Result` monad provided in the stencil.",
                    },
                  ],
                },
                {
                  title: "HW3 Office Hours Additional Slots Added",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Due to high demand before the HW3 deadline, we have added two extra office hour blocks on Monday afternoon: 2:00 PM - 4:00 PM in CS Room 302.",
                    },
                  ],
                },
                {
                  title:
                    "Homework 4 Released: Mutable State, References, and Fixpoint Recursion",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 4 is now available.\n\n**Key Concepts:**\n- Adding general recursion via $\\text{fix} : (\\tau \\to \\tau) \\to \\tau$\n- References: $\\text{ref } e$, $!e$, $e_1 := e_2$\n- Memory stores $\\sigma$, store typings $\\Sigma$, and store safety\n- Preservation with cyclic references and pointers\n\n**Due Date:** November 9 at 11:59 PM.",
                    },
                  ],
                },
                {
                  title:
                    "Small-step semantics for assignment expression $e_1 := e_2$",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What value should an assignment $l := v$ evaluate to in small-step semantics?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "By convention in ML and our lecture notes, assignment evaluates to the unit value `()` while updating the store $\\sigma$:\n$$\\langle l := v, \\sigma \\rangle \\to \\langle (), \\sigma[l \\mapsto v] \\rangle$$\nwhere $l \\in \\text{dom}(\\sigma)$.",
                    },
                  ],
                },
                {
                  title: "Store Typing $\\Sigma$ vs Typing Context $\\Gamma$",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why do we need a separate store typing $\\Sigma$ in addition to $\\Gamma$ when typechecking expressions with references?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$\\Gamma$ maps program variables ($x, y, \\dots$) to types during static checking. However, during execution, reduction produces store memory locations ($l_1, l_2, \\dots$).\n\nTo type intermediate expressions containing memory locations (e.g. $!l_1$), the type system needs $\\Sigma$, which maps memory addresses to the types of values stored inside them: $\\Sigma(l) = \\tau$ means location $l$ holds a value of type $\\tau$, so $l : \\text{Ref } \\tau$.",
                    },
                  ],
                },
                {
                  title:
                    "Cyclic references and well-typed stores $\\Gamma \\mid \\Sigma \\vdash \\sigma$",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "If location $l_1$ holds a function that references $l_1$, how does store typing avoid an infinite proof tree when showing $\\Sigma \\vdash \\sigma$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The definition of a well-typed store checks every stored value against the *same global* $\\Sigma$:\n$$\\Sigma \\vdash \\sigma \\iff \\forall l \\in \\text{dom}(\\sigma).\\; \\emptyset \\mid \\Sigma \\vdash \\sigma(l) : \\Sigma(l)$$\nBecause the premises use the already-hypothesized $\\Sigma$ without expanding recursively into locations, cyclic references typecheck cleanly in a single step!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "That is so elegant! Thank you for clarifying.",
                    },
                  ],
                },
                {
                  title: "Fixpoint semantics: `fix (\\f. ...)`",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the single-step reduction rule for $\\text{fix}$ applied to an abstraction?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The reduction rule is:\n$$\\text{fix } (\\lambda x{:}\\tau.\\, e) \\to e[x \\mapsto \\text{fix } (\\lambda x{:}\\tau.\\, e)]$$\nThis unrolls the recursive definition by replacing the recursive function identifier $x$ with the entire fixpoint expression.",
                    },
                  ],
                },
                {
                  title: "Evaluation order in presence of side effects",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        'Consider `(print_string "A"; 1) + (print_string "B"; 2)`. In our formal semantics, which argument evaluates first?',
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        'Under standard left-to-right evaluation order, our reduction context is:\n$$E \\Coloneqq [\\cdot] + e_2 \\mid v_1 + [\\cdot]$$\nThis forces the left subterm to reduce to a value $v_1$ before any reduction can occur in the right subterm. Hence "A" prints before "B".',
                    },
                  ],
                },
                {
                  title: "Midterm Exam 2 Announcement & Information",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "**Midterm Exam 2 Details**\n\n- **Date:** Thursday, November 12, 7:00 PM - 9:00 PM\n- **Coverage:** STLC, Soundness (Progress & Preservation), Product/Sum Types, Fixpoint Recursion, Mutable References and Store Typings\n- **Format:** In-person, closed book, one double-sided cheat sheet permitted.",
                    },
                  ],
                },
                {
                  title:
                    "Sample Midterm 2: Soundness of Reference Deallocation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why would adding a `free(l)` primitive to STLC break the Preservation or Progress theorem?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If $\\text{free}(l)$ removes $l$ from the store $\\sigma$, any remaining expression that still holds reference $l$ (aliasing) will attempt to dereference $!l$ in a future step. Since $l \\notin \\text{dom}(\\sigma')$, the expression cannot take a step and is not a value, breaking **Progress** (dangling pointer stuck state).",
                    },
                  ],
                },
                {
                  title:
                    "Midterm 2 Practice Problem 4: Preservation with references",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When proving Preservation for stateful STLC, why must the theorem state that there exists $\\Sigma' \\supseteq \\Sigma$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Because allocating a new reference $\\text{ref } v$ adds a fresh location $l$ to the store $\\sigma$, expanding it to $\\sigma' = \\sigma[l \\mapsto v]$. The updated store requires an extended store typing $\\Sigma' = \\Sigma, l : \\tau$. The term and store remain sound under this extended context $\\Sigma'$.",
                    },
                  ],
                },
                {
                  title: "Midterm 2 Grades & Statistics",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Midterm 2 grades have been released on Gradescope.\n\n- **Mean:** 75.8 / 100\n- **Median:** 79.0 / 100\n- **High:** 100\n\nSolutions have been posted under the Resources tab. Regrade requests remain open for 7 days.",
                    },
                  ],
                },
                {
                  title: "Homework 5 Released: Type Inference and Algorithm W",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 5 is released!\n\n**Topics:**\n- Hindley-Milner Type System (HM)\n- Robinson's First-Order Unification Algorithm\n- Principal Types and Generalization / Instantiation\n- Algorithm $\\mathcal{W}$\n- The Value Restriction for References\n\n**Due Date:** November 23 at 11:59 PM.",
                    },
                  ],
                },
                {
                  title: "Occurs Check in Robinson's Unification Algorithm",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why does unifying $\\alpha$ with $\\alpha \\to \\text{Int}$ fail in the occurs check? What happens if an algorithm omits the check?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If we substitute $\\alpha \\mapsto \\alpha \\to \\text{Int}$, the variable $\\alpha$ occurs inside the target type. Omitting the occurs check leads to circular cyclic types ($(\\dots \\to \\text{Int}) \\to \\text{Int}$), causing the unification algorithm to loop infinitely or create an unsound type system where non-terminating terms like $Y$ become typeable.",
                    },
                  ],
                },
                {
                  title: "Generalization vs Instantiation in HM",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Algorithm $\\mathcal{W}$, how does generalization compute $\\text{gen}(\\Gamma, \\tau)$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Generalization binds all type variables in $\\tau$ that do **not** appear free in the current typing environment $\\Gamma$:\n$$\\text{gen}(\\Gamma, \\tau) = \\forall (\\text{FTV}(\\tau) \\setminus \\text{FTV}(\\Gamma)).\\; \\tau$$\nIf a type variable is free in $\\Gamma$, it is constrained by outer expressions and must not be generalized.",
                    },
                  ],
                },
                {
                  title:
                    "Why is let-polymorphism needed instead of lambda-polymorphism?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why does HM allow polymorphism on `let id = \\x. x in ...` but not on `(\\id. ...) (\\x. x)`?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Because in `\\id. e`, the parameter `id` must have a monomorphic type $\\tau$ inside the lambda body. Full polymorphism for lambda parameters requires System F, which makes type inference undecidable!",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Spot on. Hindley-Milner restricts type schemes $\\sigma = \\forall \\vec{\\alpha}.\\, \\tau$ to `let`-bindings to keep type inference decidable and complete in polynomial time.",
                    },
                  ],
                },
                {
                  title: "The Value Restriction and Soundness with References",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can someone demonstrate the classic type safety violation that occurs without the Value Restriction?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Without the value restriction, we could write:\n```ocaml\nlet r = ref (fun x -> x) (* Naively typed as: forall 'a. ref ('a -> 'a) *)\nlet () = r := (fun x -> x + 1) (* Instantiate 'a = int *)\nlet s = (!r) \"hello\" (* Instantiate 'a = string -> crashes treating string as int! *)\n```\nThe Value Restriction prevents generalizing $\\text{ref } (\\dots)$ because `ref e` is not a syntactic value.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "That example makes the danger so clear. Thank you!",
                    },
                  ],
                },
                {
                  title: "HW5: Most General Unifier (MGU) order",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is the substitution returned by `unify` unique?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The most general unifier is unique **up to variable renaming**. For instance, unifying $\\alpha$ with $\\beta$ may produce $[\\alpha \\mapsto \\beta]$ or $[\\beta \\mapsto \\alpha]$, both of which are equally most general.",
                    },
                  ],
                },
                {
                  title:
                    "System F (Polymorphic $\\lambda$-calculus) and Impredicativity",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What does it mean for System F to be **impredicative**?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Impredicativity means a polymorphic type quantifier $\\forall X.\\, \\tau$ can be instantiated with *any* type, including other polymorphic types or itself $(\\forall X.\\, \\tau)$. In contrast, predicative systems (like ML/HM) stratify types into monomorphic types $\\tau$ and polytypes $\\sigma$, prohibiting polytypes inside type arguments.",
                    },
                  ],
                },
                {
                  title:
                    "Homework 6 Released: Continuations, CPS, and Subtyping",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Homework 6 (the final homework assignment!) is now available.\n\n**Topics:**\n- Continuation-Passing Style (CPS) Transformations\n- First-Class Continuations (`call/cc`)\n- Subtyping: Record Subtyping (Width & Depth) and Function Contravariance/Covariance\n- Top ($\\top$) and Bottom ($\\bot$) Types\n\n**Due Date:** December 7 at 11:59 PM.",
                    },
                  ],
                },
                {
                  title: "Continuation-Passing Style: Transforming Factorial",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we write the CPS transform for recursive factorial in OCaml?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In direct style:\n```ocaml\nlet rec fact n = if n = 0 then 1 else n * fact (n - 1)\n```\nIn CPS, every function takes an explicit continuation `k`:\n```ocaml\nlet rec fact_cps n k =\n  if n = 0 then k 1\n  else fact_cps (n - 1) (fun res -> k (n * res))\n```\nNotice all calls are now tail calls, and intermediate results are passed explicitly to `k`.",
                    },
                  ],
                },
                {
                  title: "Call/cc operational semantics intuition",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the small-step operational semantics rule for $\\text{call/cc}$ with evaluation contexts?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "With an evaluation context $E$, invoking `call/cc` packages $E$ into a continuation value $\\text{cont}(E)$:\n$$E[\\text{call/cc } (\\lambda k.\\, e)] \\to E[e[k \\mapsto \\lambda v.\\, \\text{throw } v \\text{ to } E]]$$\nWhen $\\text{cont}(E)$ is applied to a value $v$ inside any arbitrary context $E'$:\n$$E'[(\\text{cont}(E))\\ v] \\to E[v]$$\nIt aborts current context $E'$ and restores saved context $E$ with argument $v$.",
                    },
                  ],
                },
                {
                  title:
                    "Function subtyping: Why is argument type contravariant?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why is the function subtyping rule contravariant in the domain:\n$$\\frac{T_1 <: S_1 \\quad S_2 <: T_2}{S_1 \\to S_2 <: T_1 \\to T_2}$$\nWhy isn't it $S_1 <: T_1$?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Think of the Liskov Substitution Principle: if a caller expects a function that accepts $T_1$, you can safely give it a function that accepts an even broader/more general type $S_1$ (since $T_1 <: S_1$). It accepts everything the caller might pass!",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Exact intuition! A function that requires *less* ($S_1$) can safely substitute for a function requiring *more* ($T_1$).",
                    },
                  ],
                },
                {
                  title: "Record Subtyping: Width vs Depth Subtyping",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Could someone give a quick example differentiating Width and Depth subtyping on records?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Width Subtyping:** Having *more* fields makes a record a subtype (more specific):\n$$\\{ x : \\text{Int}, y : \\text{Int} \\} <: \\{ x : \\text{Int} \\}$$\n- **Depth Subtyping:** Having subtyped fields makes the record a subtype:\n$$\\frac{\\tau_1 <: \\tau_1'}{\\{ x : \\tau_1 \\} <: \\{ x : \\tau_1' \\}}$$\nCombining both gives structural record subtyping.",
                    },
                  ],
                },
                {
                  title: "Final Project / Final Exam Guidelines and Schedule",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        '**Final Exam & Course Wrap-up Schedule**\n\n- **Comprehensive Final Exam:** Thursday, December 17, 9:00 AM - 12:00 PM in Main Gymnasium.\n- **Review Session:** Monday, December 14 at 5:00 PM.\n- **Office Hours:** TAs and Instructor will hold regular hours through December 16.\n- **Cheat Sheet:** Two double-sided handwritten or typed 8.5x11" sheets permitted.',
                    },
                  ],
                },
                {
                  title:
                    "Garbage Collection: Reference Counting vs Tracing Mark-Sweep",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Lecture 24, we discussed memory reclamation. Why cannot naive reference counting reclaim cyclic structures?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In an isolated cycle (e.g. $A \\leftrightarrow B$), each object's reference count is at least 1 even when neither is reachable from the stack roots. Tracing garbage collectors (like Mark-and-Sweep) solve this by discovering reachability starting directly from root references.",
                    },
                  ],
                },
                {
                  title: "Concurrency: Sequential Consistency vs Data Races",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the formal definition of a data race in the shared-memory concurrent $\\lambda$-calculus?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "A data race occurs when two concurrent threads access the same memory location $l$ simultaneously (without synchronization), where at least one of the accesses is a write ($l := v$).",
                    },
                  ],
                },
                {
                  title: "Course Evaluations and Extra Credit Reminder",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Course evaluations are now open! If we reach an 85% response rate across the class, everyone will receive 1% extra credit added to their final course grade. Please take a few minutes to submit your honest feedback.",
                    },
                  ],
                },
                {
                  title: "Final Exam Practice: CPS with Exceptions",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How does 2-continuation CPS represent `try e1 with handle e2`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In 2-continuation CPS, every term takes a success continuation $k_s$ and failure/exception continuation $k_f$:\n$$[\\![\\text{try } e_1 \\text{ with } e_2]\\!]\\; k_s\\; k_f = [\\![e_1]\\!]\\; k_s\\; (\\lambda err.\\; [\\![e_2]\\!]\\; err\\; k_s\\; k_f)$$\nIf $e_1$ encounters an error, it invokes the newly supplied exception handler with argument $err$.",
                    },
                  ],
                },
                {
                  title: "Final Exam Room Seating Charts Posted",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Seating charts by student ID have been uploaded to the course website. Please arrive 15 minutes before the 9:00 AM start time.",
                    },
                  ],
                },
                {
                  title: "Final Grades Released and Letter Grade Cutoffs",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Final exam scores and overall course letter grades have been submitted to the registrar.\n\n- **Final Exam Mean:** 80.2 / 100\n- **Course GPA Average:** 3.48\n\nThank you for an incredible semester exploring the principles, semantics, and foundations of programming languages! Have a fantastic winter break!",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Thank you Professor and TAs for an amazing course! Learned so much this semester.",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Best CS course I've taken so far. Thank you all!",
                    },
                  ],
                },
                {
                  title: "Farewell and TA Applications for Next Term",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If you enjoyed CS 412 and would like to serve as an Undergraduate Teaching Assistant (UTA) for next Spring, please fill out the TA application link on our website by December 22.",
                    },
                  ],
                },
                {
                  title: "Structural Induction: List Append Associativity",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In Problem 1.1, when proving $(l_1 @ l_2) @ l_3 = l_1 @ (l_2 @ l_3)$, should we do induction on $l_1$, $l_2$, or $l_3$?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Induction on $l_1$ is the easiest because `@` is defined recursively on its first argument!",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Correct. Since `(@)` matches on the left list, inducting on $l_1$ makes the inductive step simplify in one equality step.",
                    },
                  ],
                },
                {
                  title: "HW1: Handling negative integer constants in AST",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In our AST variant type `type expr = Const of int | ...`, does `Const (-5)` need a special unary minus constructor?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "No separate unary minus is needed unless specified. `Const (-5)` is just a constructor containing standard OCaml `int`.",
                    },
                  ],
                },
                {
                  title: "HW1: Pretty-printer parenthesization",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "For `string_of_expr`, do we need minimal parentheses based on operator precedence, or can we wrap every binary operation in parentheses?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Fully parenthesized output `((1 + 2) * 3)` is completely accepted by the grading script.",
                    },
                  ],
                },
                {
                  title: "HW2: Small-step Determinism Proof",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we state the Determinism lemma for our small-step relation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Determinism is stated as: if $e \\to e_1$ and $e \\to e_2$, then $e_1 = e_2$. You prove this by induction on the derivation of $e \\to e_1$ followed by inversion on $e \\to e_2$.",
                    },
                  ],
                },
                {
                  title:
                    "HW2: Short-circuit evaluation semantics for Boolean AND",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the small-step rule for short-circuiting `e1 && e2` when `e1` evaluates to `false`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The rule is:\n$$\\text{false} \\;\\&\\&\\; e_2 \\to \\text{false}$$\nNotice $e_2$ is never evaluated.",
                    },
                  ],
                },
                {
                  title: "HW2: Alpha equivalence relation definition",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is $\\alpha$-equivalence ($=_{\\alpha}$) an equivalence relation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, $\\alpha$-equivalence is reflexive, symmetric, and transitive. In the metatheory, terms that differ only in bound variable names are treated as identical.",
                    },
                  ],
                },
                {
                  title: "HW2: Encoding pairs in untyped lambda calculus",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What are the standard Church definitions for `pair`, `fst`, and `snd`?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Here they are:\n- $\\text{pair} = \\lambda x.\\, \\lambda y.\\, \\lambda f.\\, f\\,x\\,y$\n- $\\text{fst} = \\lambda p.\\, p\\,(\\lambda x.\\, \\lambda y.\\, x)$\n- $\\text{snd} = \\lambda p.\\, p\\,(\\lambda x.\\, \\lambda y.\\, y)$",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "Spot on!",
                    },
                  ],
                },
                {
                  title: "HW2: Predecessor function on Church Numerals",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why is predecessor $\\text{pred}$ so tricky to define for Church numerals?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Because Church numerals only give you iteration from $0$ up to $n$ ($f^n(x)$). To compute $n-1$, you have to step pairs of numbers $\\langle k, k+1 \\rangle$ starting from $\\langle 0, 0 \\rangle$ and extract the first component at the end.",
                    },
                  ],
                },
                {
                  title: "HW2: Normal Order vs Applicative Order Reduction",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the difference between normal order and applicative order reduction?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Normal Order:** Always reduce the leftmost, outermost redex first (guaranteed to find a normal form if one exists).\n- **Applicative Order:** Always reduce the leftmost, innermost redex first (evaluates arguments before functions, like eager evaluation).",
                    },
                  ],
                },
                {
                  title: "HW2: Can reduction increase the size of a term?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can a single $\\beta$-reduction step cause the size of an AST to grow exponentially?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! If an abstraction duplicates its argument, like $(\\lambda x.\\, x\\,x\\,x\\,x)$, substituting a large term for $x$ multiplies the term size.",
                    },
                  ],
                },
                {
                  title: "HW3: Typing derivations for nested applications",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we draw the typing tree for $f\\ x\\ y$ when $f : A \\to B \\to C$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Remember $f\\ x\\ y = (f\\ x)\\ y$. The tree has two applications:\n$$\\frac{\\frac{\\Gamma \\vdash f : A \\to B \\to C \\quad \\Gamma \\vdash x : A}{\\Gamma \\vdash f\\ x : B \\to C} \\quad \\Gamma \\vdash y : B}{\\Gamma \\vdash (f\\ x)\\ y : C}$$",
                    },
                  ],
                },
                {
                  title: "HW3: Uniqueness of types in STLC",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is the type of a well-typed term in STLC unique?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! If $\\Gamma \\vdash e : \\tau_1$ and $\\Gamma \\vdash e : \\tau_2$, then $\\tau_1 = \\tau_2$. (Assuming typed binders $\\lambda x{:}\\tau.\\, e$).",
                    },
                  ],
                },
                {
                  title: "HW3: Inversion Lemma for STLC typing",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What does the Inversion Lemma say for function applications?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If $\\Gamma \\vdash e_1\\ e_2 : \\tau$, then there exists some type $\\tau'$ such that $\\Gamma \\vdash e_1 : \\tau' \\to \\tau$ and $\\Gamma \\vdash e_2 : \\tau'$.",
                    },
                  ],
                },
                {
                  title: "HW3: Weakening Lemma formulation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the Weakening Lemma and why is it needed for STLC metatheory?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Weakening states: if $\\Gamma \\vdash e : \\tau$ and $x \\notin \\text{dom}(\\Gamma)$, then $\\Gamma, x : \\tau' \\vdash e : \\tau$. It allows adding irrelevant bindings to the context without breaking existing typing derivations.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: Pattern matching compilation into `case` expressions",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do complex multi-variable patterns compile into binary sum `case` expressions?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Compilers build decision trees where each node is a simple `case` inspecting a single constructor, branching until all variables are bound.",
                    },
                  ],
                },
                {
                  title: "HW4: Recursion via `let rec` desugaring",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How does `let rec f = \\x. e1 in e2` desugar into $\\text{fix}$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It desugars to:\n$$\\text{let } f = \\text{fix } (\\lambda f.\\, \\lambda x.\\, e_1) \\text{ in } e_2$$",
                    },
                  ],
                },
                {
                  title: "HW4: Why can't values be evaluated inside `ref`?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In $\\text{ref } e$, does $e$ evaluate before the allocation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, under CBV, $e \\to^* v$, and only then $\\text{ref } v \\to l$ with $\\sigma[l \\mapsto v]$.",
                    },
                  ],
                },
                {
                  title: "HW4: Memory aliasing example",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "If `let x = ref 1 in let y = x in y := 2; !x`, does `!x` evaluate to 2?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Yes! Both `x` and `y` hold the exact same memory address location `l`, so mutating via `y` affects reads via `x`.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "Correct, this is direct memory aliasing.",
                    },
                  ],
                },
                {
                  title: "HW4: Landin's Knot (Recursion through state)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can we implement general recursion using only references and loops without `fix`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! This technique is known as **Landin's Knot**: allocate a reference `r` holding a dummy function, define `f` that calls `!r`, then mutate `r := f`. Now `f` recursively invokes itself through the reference!",
                    },
                  ],
                },
                {
                  title:
                    "HW4: Garbage collection modeling in operational semantics",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How would small-step semantics model garbage collection formally?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "You can add a non-deterministic transition rule:\n$$\\langle e, \\sigma \\rangle \\to_{\\text{GC}} \\langle e, \\sigma|_{\\text{Reach}(e, \\sigma)} \\rangle$$\nwhere $\\sigma|_{\\text{Reach}(e, \\sigma)}$ restricts the store to locations reachable from the free locations in $e$.",
                    },
                  ],
                },
                {
                  title: "HW5: Substitution application order in Algorithm W",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When Algorithm $\\mathcal{W}$ infers $e_1\\ e_2$, in what order should substitutions be composed?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "1. Infer $(S_1, \\tau_1) = \\mathcal{W}(\\Gamma, e_1)$.\n2. Infer $(S_2, \\tau_2) = \\mathcal{W}(S_1\\Gamma, e_2)$.\n3. Unify $S_2(\\tau_1)$ with $\\tau_2 \\to \\beta$ (where $\\beta$ is fresh) to get $S_3$.\n4. Return substitution composition $S_3 \\circ S_2 \\circ S_1$ and type $S_3(\\beta)$.",
                    },
                  ],
                },
                {
                  title: "HW5: Free type variables in type environment",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "How do we compute $\\text{FTV}(\\Gamma)$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$\\text{FTV}(\\Gamma) = \\bigcup_{x \\in \\text{dom}(\\Gamma)} \\text{FTV}(\\Gamma(x))$, where for each scheme $\\forall \\vec{\\alpha}.\\, \\tau$, $\\text{FTV}(\\forall \\vec{\\alpha}.\\, \\tau) = \\text{FTV}(\\tau) \\setminus \\vec{\\alpha}$.",
                    },
                  ],
                },
                {
                  title: "HW5: Fresh type variable counter in OCaml",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        'Is using a global mutable counter `let counter = ref 0` acceptable for generating fresh type variables `TVar ("\'a" ^ string_of_int !counter)`?',
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, using a stateful generator `fresh_var ()` is standard and expected for HW5.",
                    },
                  ],
                },
                {
                  title: "HW5: Why is Principal Typing useful?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the practical benefit of the Principal Type property for compilers?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It guarantees that for every typeable expression, there exists a single most general type $\\sigma$ from which all other valid types can be obtained purely by substitution, eliminating the need for programmers to write explicit type annotations.",
                    },
                  ],
                },
                {
                  title: "HW5: Unification with concrete primitive types",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "What should `unify TInt TBool` return?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It must fail with a type clash error, because distinct base types cannot unify.",
                    },
                  ],
                },
                {
                  title: "HW6: Subtyping reflexivity and transitivity rules",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Are reflexivity ($S <: S$) and transitivity ($S <: U \\land U <: T \\implies S <: T$) always built into the subtyping relation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, subtyping is always defined as a preorder (reflexive and transitive).",
                    },
                  ],
                },
                {
                  title: "HW6: Top ($\\top$) type as universal supertype",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What can you do with an expression of type $\\top$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Since every type $T <: \\top$, anything can be passed where $\\top$ is expected. However, you can perform *no operations* on a term known only to have type $\\top$ (similar to `Object` in Java or `unknown` in TypeScript).",
                    },
                  ],
                },
                {
                  title: "HW6: Bottom ($\\bot$) type as universal subtype",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "Why is $\\bot <: T$ for every type $T$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Because $\\bot$ represents an expression that never produces a value (divergence, exceptions). Since it never returns, it can safely masquerade as any required return type.",
                    },
                  ],
                },
                {
                  title: "HW6: Cast operations and runtime type checks",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the difference between upcasting and downcasting in typed languages with subtyping?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Upcasting** ($e : T \\text{ to } T'$ where $T <: T'$) is always statically safe and requires no runtime check.\n- **Downcasting** ($e : T' \\text{ to } T$) is unsafe statically and requires a dynamic check at runtime to verify the actual value's underlying type.",
                    },
                  ],
                },
                {
                  title: "HW6: CPS transformation of conditionals",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the CPS transformation $[\\![\\text{if } e_1 \\text{ then } e_2 \\text{ else } e_3]\\!]\\; k$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$$[\\![e_1]\\!]\\; (\\lambda b.\\; \\text{if } b \\text{ then } [\\![e_2]\\!]\\; k \\text{ else } [\\![e_3]\\!]\\; k)$$",
                    },
                  ],
                },
                {
                  title:
                    "HW6: Continuations and Delimited Control (shift / reset)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do delimited continuations (`shift`/`reset`) differ from undelimited `call/cc`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "`call/cc` captures the entire remaining computation of the program up to top-level, whereas `shift` captures only the computation up to the enclosing `reset` delimiter and behaves like a regular composable function.",
                    },
                  ],
                },
                {
                  title: "Monad Laws Verification: Option Monad",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What are the three monad laws we need to verify for `Option`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "1. **Left Identity:** `return x >>= f` $\\equiv$ `f x`\n2. **Right Identity:** `m >>= return` $\\equiv$ `m`\n3. **Associativity:** `(m >>= f) >>= g` $\\equiv$ `m >>= (\\x -> f x >>= g)`",
                    },
                  ],
                },
                {
                  title:
                    "Actor Model vs Communicating Sequential Processes (CSP)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the key difference in communication between Erlang's Actor model and Go's CSP channels?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Actors:** Entities have mailboxes and send asynchronous messages directly to named actor process IDs.\n- **CSP:** Anonymous processes communicate by synchronizing over explicit shared channel entities.",
                    },
                  ],
                },
                {
                  title: "Final Review Session Recording Available",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The recording and whiteboard PDF from yesterday's 3-hour Final Exam comprehensive review session are now posted on the course portal.",
                    },
                  ],
                },
                {
                  title: "Lost and Found after Final Exam",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "A blue Hydro Flask and a pair of wired headphones were left in Main Gym after the final exam. Please pick them up from CS Main Office 201.",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Equivalence of Big-Step and Small-Step on Arithmetic",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When proving $e \\Downarrow n \\iff e \\to^* n$, do we prove both directions separately by induction?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes:\n- Direction $(\\implies)$ proceeds by induction on the derivation tree of $e \\Downarrow n$.\n- Direction $(\\impliedby)$ proceeds by induction on the number of small-step transitions using a lemma that $e \\to e' \\land e' \\Downarrow n \\implies e \\Downarrow n$.",
                    },
                  ],
                },
                {
                  title:
                    "HW2: Encoding integers with Scott numerals vs Church numerals",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the advantage of Scott numerals over Church numerals?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In Scott encoding, pattern matching / predecessor $\\text{pred}$ is an $O(1)$ operation, whereas in Church encoding, predecessor requires $O(n)$ steps.",
                    },
                  ],
                },
                {
                  title: "HW3: Can STLC type-check self-application $x\\ x$?",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "If we added recursive types $\\mu X.\\, \\tau$ to STLC, could we type $x\\ x$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! With iso-recursive or equi-recursive types, we can define $T = \\mu X.\\, X \\to \\text{Int}$, and folding/unfolding allows self-application.",
                    },
                  ],
                },
                {
                  title: "HW4: Store typing monotonicity lemma",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "What does store typing monotonicity state?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If $\\Sigma \\subseteq \\Sigma'$ and $\\Gamma \\mid \\Sigma \\vdash e : \\tau$, then $\\Gamma \\mid \\Sigma' \\vdash e : \\tau$. Types of terms are preserved as new memory locations are allocated.",
                    },
                  ],
                },
                {
                  title: "HW5: Type reconstruction vs Type checking",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the formal difference between type checking and type inference/reconstruction?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Type Checking:** Given context $\\Gamma$, term $e$, and type $\\tau$, verify if $\\Gamma \\vdash e : \\tau$ holds.\n- **Type Inference:** Given context $\\Gamma$ and untyped term $e$, compute a type $\\tau$ such that $\\Gamma \\vdash e : \\tau$ (or decide none exists).",
                    },
                  ],
                },
                {
                  title: "HW6: Intersection Types vs Universal Polymorphism",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How does intersection typing $\\tau_1 \\land \\tau_2$ differ from universal polymorphism $\\forall X.\\, \\tau$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "An intersection type $e : \\tau_1 \\land \\tau_2$ means $e$ can behave as both $\\tau_1$ and $\\tau_2$ (finite ad-hoc specialization), while $\\forall X.\\, \\tau$ means $e$ works uniformly for *all* infinite possible types.",
                    },
                  ],
                },
                {
                  title: "Thank you and End of Term Wrap-up",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The forum will transition to read-only mode on January 5. Best of luck in your future computer science studies and software engineering journeys!",
                    },
                  ],
                },
                {
                  title: "HW1: OCaml module signatures (.mli files)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can we modify the `.mli` interface file in our submission?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "No, do not alter `.mli` files. The autograder relies on the exact signatures specified in the distribution.",
                    },
                  ],
                },
                {
                  title: "HW2: Normal Form Definition",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "Is every value in normal form?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "In pure untyped $\\lambda$-calculus, every value (abstraction $\\lambda x.\\, e$) is in weak head normal form. In full reduction, an abstraction is in normal form if its body contains no redexes.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: Type Soundness under Reflexive Transitive Closure",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How do we combine Progress and Preservation to state full Type Soundness?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "If $\\vdash e : \\tau$ and $e \\to^* e'$, then either $e'$ is a value, or there exists $e''$ such that $e' \\to e''$ (a well-typed program never gets stuck).",
                    },
                  ],
                },
                {
                  title: "HW4: Uninitialized memory safety in STLC",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why does ML's `ref e` require an initial value, unlike C pointers `malloc`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Requiring an initial value ensures memory locations are never in an uninitialized garbage state, preserving the invariant that dereferencing $!l$ always produces a valid well-typed value.",
                    },
                  ],
                },
                {
                  title: "HW5: Substitution Application on Type Scheme",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "When applying substitution $S$ to $\\forall \\alpha.\\, \\tau$, should $\\alpha$ be removed from the domain of $S$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, $S(\\forall \\alpha.\\, \\tau) = \\forall \\alpha.\\, (S \\setminus \\{\\alpha\\})(\\tau)$. Bound type variables must not be replaced by substitutions on free type variables.",
                    },
                  ],
                },
                {
                  title: "HW6: Subtyping of Mutable References",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is $\\text{Ref } \\tau_1 <: \\text{Ref } \\tau_2$ covariant or contravariant?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Mutable references must be **invariant**: $\\text{Ref } \\tau_1 <: \\text{Ref } \\tau_2 \\iff \\tau_1 = \\tau_2$. Reading from a reference is covariant, but writing to it is contravariant; combining both forces invariance.",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Structural Induction on Natural Numbers vs Standard Induction",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is structural induction on Peano numbers `type nat = Z | S of nat` identical to standard mathematical induction on $\\mathbb{N}$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, standard mathematical induction is precisely structural induction specialized to the Peano inductive datatype.",
                    },
                  ],
                },
                {
                  title: "HW2: Substitution with multiple variable occurrences",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In $(x\\ x)[x \\mapsto (y\\ z)]$, do both occurrences of $x$ get substituted simultaneously?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, standard substitution replaces every free occurrence of $x$ in the term: $(y\\ z)\\,(y\\ z)$.",
                    },
                  ],
                },
                {
                  title: "HW3: Simply Typed Lambda Calculus with Empty Context",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "What is a closed term?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "A term $e$ is closed if it has no free variables ($\text{FV}(e) = \\emptyset$). It can be type-checked under the empty context $\\emptyset \\vdash e : \\tau$.",
                    },
                  ],
                },
                {
                  title: "HW4: Reference equality vs Structural equality",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In OCaml, what is the difference between `r1 == r2` and `r1 = r2` for references?",
                    },
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "`==` checks physical address equality (pointer identity), while `=` checks structural equality of the values pointed to.",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "Exactly right.",
                    },
                  ],
                },
                {
                  title: "HW5: Robinson's Algorithm Termination Guarantee",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the termination metric for Robinson's unification algorithm?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "The lexicographic measure $\\langle n_{\\text{vars}}, \\text{size} \\rangle$, where $n_{\\text{vars}}$ is the number of uninstantiated type variables and $\\text{size}$ is the total syntactic size of the equation set.",
                    },
                  ],
                },
                {
                  title: "HW6: Monadic Bind Operator (`>>=`) Type Signature",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the general type of `bind` in Haskell/OCaml notation?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$$\\text{bind} : M\\ \\alpha \\to (\\alpha \\to M\\ \\beta) \\to M\\ \\beta$$",
                    },
                  ],
                },
                {
                  title: "HW1: OCaml Format module for pretty printing",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is using `Format.printf` allowed for HW1 debugging?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, just make sure to remove debugging print statements before submitting to Gradescope.",
                    },
                  ],
                },
                {
                  title: "HW2: Leftmost innermost reduction order",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Is leftmost-innermost reduction identical to Call-by-Value inside abstractions?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Standard CBV does not reduce under abstractions $(\\lambda x.\\, e)$. Leftmost-innermost full reduction continues reducing inside lambda bodies.",
                    },
                  ],
                },
                {
                  title:
                    "HW3: Typing derivations as logic proofs (Curry-Howard)",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Under the Curry-Howard Isomorphism, what does the function type $\\tau_1 \\to \\tau_2$ correspond to in propositional logic?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It corresponds to logical implication $\\tau_1 \\implies \\tau_2$, and function application corresponds to Modus Ponens!",
                    },
                  ],
                },
                {
                  title: "HW4: Garbage collection and preservation theorem",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Does GC maintain well-typedness of the remaining store?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, since unreachable locations cannot be referenced by reachable expressions, restricting the store typing preserves $\\Sigma' \\vdash \\sigma'$.",
                    },
                  ],
                },
                {
                  title: "HW5: Principal types for polymorphic identity",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the principal type scheme of `fun x -> x`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "$$\\forall \\alpha.\\, \\alpha \\to \\alpha$$",
                    },
                  ],
                },
                {
                  title:
                    "HW6: Continuation transformation for recursive fibonacci",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In CPS for `fib(n-1) + fib(n-2)`, do we nest the continuations?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes:\n```ocaml\nlet rec fib_cps n k =\n  if n <= 1 then k n\n  else fib_cps (n - 1) (fun r1 ->\n         fib_cps (n - 2) (fun r2 ->\n           k (r1 + r2)))\n```",
                    },
                  ],
                },
                {
                  title: "HW1: Big-step vs Small-step state machine intuition",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can small-step semantics be viewed as a state transition system?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes, small-step defines a transition relation over configurations $(S, \\to)$, where execution traces are paths through the transition graph.",
                    },
                  ],
                },
                {
                  title: "HW2: Beta reduction confluence without types",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Does the Church-Rosser theorem hold for untyped terms that do not terminate?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! Church-Rosser holds for all untyped $\\lambda$-terms: if $a \\to^* b$ and $a \\to^* c$, there exists $d$ such that $b \\to^* d$ and $c \\to^* d$.",
                    },
                  ],
                },
                {
                  title: "HW3: Product type projection reduction rules",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What are the small-step rules for $\\pi_1(v_1, v_2)$ and $\\pi_2(v_1, v_2)$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$$\\pi_1(v_1, v_2) \\to v_1 \\qquad \\pi_2(v_1, v_2) \\to v_2$$",
                    },
                  ],
                },
                {
                  title: "HW4: Dynamic vs Static Scoping",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the key difference between static (lexical) and dynamic scoping in environment models?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Lexical Scope:** Closures capture the environment at definition time.\n- **Dynamic Scope:** Free variables are resolved from the calling stack environment at invocation time.",
                    },
                  ],
                },
                {
                  title: "HW5: Let-floating transformation soundness",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Does moving `let x = e1 in e2` outward change typing under Hindley-Milner?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It can allow $x$ to be generalized in a wider scope or shared across multiple subexpressions, provided no free variable captures occur.",
                    },
                  ],
                },
                {
                  title: "HW6: Subtyping with Universal Quantifiers",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In System $F_{<:}$, how does bounded quantification $(\\forall X <: T.\\, \\tau)$ extend subtyping?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "It allows functions to accept polymorphic type arguments restricted to subtypes of an upper bound $T$.",
                    },
                  ],
                },
                {
                  title: "HW1: Inductive definition of string concatenation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content: "How do we define string length inductively?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "$$\\text{len}(\\epsilon) = 0, \\qquad \\text{len}(c \\cdot s) = 1 + \\text{len}(s)$$",
                    },
                  ],
                },
                {
                  title: "HW2: Combinator S and K completeness",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can any closed lambda term be expressed using only $S, K,$ and $I$ combinators?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! SKI combinator calculus is Turing-complete (and $I$ can even be defined as $S\\ K\\ K$).",
                    },
                  ],
                },
                {
                  title: "HW3: Logical Relations for Strong Normalization",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why doesn't simple structural induction on terms prove strong normalization for STLC?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Because application $e_1\\ e_2$ can produce a term larger than $e_1$ upon substitution. Tait's method of Logical Relations solves this by inducting on types rather than terms.",
                    },
                  ],
                },
                {
                  title: "HW4: Linear Type Systems vs Affine Type Systems",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the difference between linear and affine resources in substructural type systems?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Linear:** Every resource must be used **exactly once** (no duplication, no dropping).\n- **Affine:** Every resource can be used **at most once** (dropping permitted, like in Rust).",
                    },
                  ],
                },
                {
                  title: "HW5: Polymorphic recursion in OCaml",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Why does OCaml require explicit type annotations for polymorphic recursion?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Type inference for polymorphic recursion is undecidable (equivalent to the Post Correspondence Problem), so compiler annotations are mandatory.",
                    },
                  ],
                },
                {
                  title: "HW6: Continuation Monad implementation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How is `return` defined in the Continuation Monad `type ('a, 'r) cont = ('a -> 'r) -> 'r`?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content: "```ocaml\nlet return x = fun k -> k x\n```",
                    },
                  ],
                },
                {
                  title:
                    "HW1: Tail recursion vs non-tail recursion memory visualization",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Does tail call elimination reuse the current stack frame?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! The compiler overwrites the current stack frame and jumps directly to the function start, maintaining $O(1)$ stack space.",
                    },
                  ],
                },
                {
                  title: "HW2: Renaming bound variables in capture avoidance",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "In $(\\lambda x.\\, y)[y \\mapsto x]$, what should the renamed term be?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Rename bound $x$ to fresh $x'$: $(\\lambda x'.\\, y)[y \\mapsto x] = \\lambda x'.\\, x$.",
                    },
                  ],
                },
                {
                  title: "HW3: Curry-Howard Isomorphism for Sum Types",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What is the logical equivalent of sum types $\\tau_1 + \\tau_2$ in intuitionistic logic?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Logical disjunction (logical OR: $\\tau_1 \\lor \\tau_2$).",
                    },
                  ],
                },
                {
                  title: "HW4: Formalization of memory deallocation",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "Can affine types prevent double-free bugs statically?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Yes! If capability tokens must be consumed to free memory and cannot be duplicated, a pointer can never be freed twice.",
                    },
                  ],
                },
                {
                  title: "HW5: Soundness vs Completeness of Type Inference",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "What do Soundness and Completeness mean for Algorithm $\\mathcal{W}$?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "- **Soundness:** If $\\mathcal{W}(\\Gamma, e) = (S, \\tau)$, then $S\\Gamma \\vdash e : \\tau$.\n- **Completeness:** If $\\Gamma \\vdash e : \\tau'$, then $\\mathcal{W}$ succeeds and finds a principal type of which $\\tau'$ is an instance.",
                    },
                  ],
                },
                {
                  title: "HW6: Coercion Semantics vs Subsumption",
                  courseConversationType: "courseConversationTypeQuestion",
                  courseConversationMessages: [
                    {
                      courseParticipationRole: "courseParticipationRoleStudent",
                      content:
                        "How does coercion semantics implement subtyping under the hood?",
                    },
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Coercion inserts runtime conversion functions (e.g. converting an integer to a float or slicing a record) whenever a subtype subsumption rule is applied.",
                    },
                  ],
                },
                {
                  title: "Course Wrap-up Note and Best Wishes",
                  courseConversationType: "courseConversationTypeNote",
                  courseConversationMessages: [
                    {
                      courseParticipationRole:
                        "courseParticipationRoleInstructor",
                      content:
                        "Thank you all for an engaging, mathematically rigorous semester. Have a restful break and happy coding in all your future languages!",
                    },
                  ],
                },
              ],
            },
          ]) {
            const course = database.get<{
              id: number;
              publicId: string;
              courseConversationsNextPublicId: number;
            }>(
              sql`
                select * from "courses" where "id" = ${
                  database.run(
                    sql`
                      insert into "courses" (
                        "publicId",
                        "name",
                        "information",
                        "invitationLinkCourseParticipationRoleInstructorsEnabled",
                        "invitationLinkCourseParticipationRoleInstructorsToken",
                        "invitationLinkCourseParticipationRoleStudentsEnabled",
                        "invitationLinkCourseParticipationRoleStudentsToken",
                        "courseConversationRequiresTagging",
                        "courseParticipationRoleStudentsAnonymityAllowed",
                        "courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent",
                        "courseState",
                        "courseConversationsNextPublicId"
                      )
                      values (
                        ${cryptoRandomString({ length: 10, type: "numeric" })},
                        ${courseData.name},
                        ${courseData.information},
                        ${Number(Math.random() < 0.2)},
                        ${cryptoRandomString({ length: 20, type: "numeric" })},
                        ${Number(Math.random() < 0.8)},
                        ${cryptoRandomString({ length: 20, type: "numeric" })},
                        ${Number(Math.random() < 0.8)},
                        ${Math.random() < 0.1 ? "courseParticipationRoleStudentsAnonymityAllowedNone" : Math.random() < 0.8 ? "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" : "courseParticipationRoleStudentsAnonymityAllowedEveryone"},
                        ${Number(Math.random() < 0.8)},
                        ${courseData.courseState ?? "courseStateActive"},
                        ${courseData.courseConversations.length + 1}
                      );
                    `,
                  ).lastInsertRowid
                };
              `,
            )!;
            const usersForCoursePendingInvitationEmailsAndCourseParticipations =
              [...users];
            const coursePendingInvitationEmailsCount = Math.floor(
              Math.random() * 30,
            );
            for (
              let coursePendingInvitationEmailIndex = 0;
              coursePendingInvitationEmailIndex <
              coursePendingInvitationEmailsCount;
              coursePendingInvitationEmailIndex++
            )
              database.run(
                sql`
                  insert into "coursePendingInvitationEmails" (
                    "publicId",
                    "course",
                    "email",
                    "courseParticipationRole"
                  )
                  values (
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${course.id},
                    ${
                      Math.random() < 0.5
                        ? `${examples
                            .name()
                            .replaceAll(/[^A-Za-z]/g, "-")
                            .toLowerCase()}--${cryptoRandomString({ length: 3, type: "numeric" })}@courselore.org`
                        : usersForCoursePendingInvitationEmailsAndCourseParticipations.splice(
                            Math.floor(
                              Math.random() *
                                usersForCoursePendingInvitationEmailsAndCourseParticipations.length,
                            ),
                            1,
                          )[0].email
                    },
                    ${Math.random() < 0.5 ? "courseParticipationRoleInstructor" : "courseParticipationRoleStudent"}
                  );
                `,
              );
            const [courseParticipation, ...courseParticipations] = [
              user,
              ...Array.from(
                { length: 60 + Math.floor(Math.random() * 50) },
                () =>
                  usersForCoursePendingInvitationEmailsAndCourseParticipations.splice(
                    Math.floor(
                      Math.random() *
                        usersForCoursePendingInvitationEmailsAndCourseParticipations.length,
                    ),
                    1,
                  )[0],
              ),
            ].map((user, userIndex) =>
              database.get<{
                id: number;
                publicId: string;
                courseParticipationRole:
                  | "courseParticipationRoleInstructor"
                  | "courseParticipationRoleStudent";
              }>(
                sql`
                    select * from "courseParticipations" where "id" = ${
                      database.run(
                        sql`
                          insert into "courseParticipations" (
                            "publicId",
                            "user",
                            "course",
                            "courseParticipationRole",
                            "decorationColor",
                            "mostRecentlyVisitedCourseConversation"
                          )
                          values (
                            ${cryptoRandomString({ length: 20, type: "numeric" })},
                            ${user.id},
                            ${course.id},
                            ${userIndex === 0 ? courseData.courseParticipationRole : Math.random() < 0.15 ? "courseParticipationRoleInstructor" : "courseParticipationRoleStudent"},
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
                                "violet",
                                "purple",
                                "fuchsia",
                                "pink",
                                "rose",
                              ][Math.floor(Math.random() * 14)]
                            },
                            ${null}
                          );
                        `,
                      ).lastInsertRowid
                    };
                  `,
              )!,
            );
            const courseConversationsTags = [
              { name: "Assignment 1" },
              { name: "Assignment 2" },
              { name: "Assignment 3" },
              { name: "Assignment 4" },
              { name: "Assignment 5" },
              { name: "Assignment 6" },
              {
                name: "Change for next year",
                privateToCourseParticipationRoleInstructors: true,
              },
              {
                name: "Duplicate question",
                privateToCourseParticipationRoleInstructors: true,
              },
            ].map((courseConversationsTag, courseConversationsTagIndex) =>
              database.get<{ id: number }>(
                sql`
                    select * from "courseConversationsTags" where "id" = ${
                      database.run(
                        sql`
                          insert into "courseConversationsTags" (
                            "publicId",
                            "course",
                            "order",
                            "name",
                            "privateToCourseParticipationRoleInstructors"
                          )
                          values (
                            ${cryptoRandomString({ length: 20, type: "numeric" })},
                            ${course.id},
                            ${courseConversationsTagIndex},
                            ${courseConversationsTag.name},
                            ${Number(courseConversationsTag.privateToCourseParticipationRoleInstructors ?? false)}
                          );
                        `,
                      ).lastInsertRowid
                    };
                  `,
              )!,
            );
            for (const [
              courseConversationIndex,
              courseConversationData,
            ] of courseData.courseConversations.entries()) {
              const courseConversation = database.get<{
                id: number;
                courseConversationVisibility:
                  | "courseConversationVisibilityEveryone"
                  | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                  | "courseConversationVisibilityCourseConversationParticipations";
              }>(
                sql`
                  select * from "courseConversations" where "id" = ${
                    database.run(
                      sql`
                        insert into "courseConversations" (
                          "publicId",
                          "course",
                          "courseConversationType",
                          "questionResolved",
                          "courseConversationVisibility",
                          "pinned",
                          "title",
                          "titleSearch"
                        )
                        values (
                          ${String(courseConversationIndex + 1)},
                          ${course.id},
                          ${courseConversationData.courseConversationType},
                          ${Number(Math.random() < 0.5)},
                          ${courseConversationIndex === 0 || Math.random() < 0.3 ? "courseConversationVisibilityEveryone" : Math.random() < 0.8 ? "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" : "courseConversationVisibilityCourseConversationParticipations"},
                          ${Number(courseConversationIndex !== 0 && Math.random() < 0.1)},
                          ${courseConversationData.title},
                          ${utilities
                            .tokenize(courseConversationData.title, {
                              stopWords:
                                application.applicationConfiguration.stopWords,
                              stem: (token) =>
                                natural.PorterStemmer.stem(token),
                            })
                            .map((tokenWithPosition) => tokenWithPosition.token)
                            .join(" ")}
                        );
                      `,
                    ).lastInsertRowid
                  };
                `,
              )!;
              if (
                courseConversation.courseConversationVisibility ===
                  "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" ||
                courseConversation.courseConversationVisibility ===
                  "courseConversationVisibilityCourseConversationParticipations"
              ) {
                const courseParticipationsForCourseConversationParticipations =
                  [...courseParticipations].filter(
                    (courseParticipation) =>
                      !(
                        courseConversation.courseConversationVisibility ===
                          "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
                        courseParticipation.courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                      ),
                  );
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
              }
              const courseConversationsTagsForCourseConversationTaggings = [
                ...courseConversationsTags,
              ];
              const courseConversationTaggingsCount =
                1 + Math.floor(Math.random() * 4);
              for (
                let courseConversationTaggingIndex = 0;
                courseConversationTaggingIndex <
                courseConversationTaggingsCount;
                courseConversationTaggingIndex++
              )
                database.run(
                  sql`
                    insert into "courseConversationTaggings" (
                      "courseConversation",
                      "courseConversationsTag"
                    )
                    values (
                      ${courseConversation.id},
                      ${courseConversationsTagsForCourseConversationTaggings.splice(Math.floor(Math.random() * courseConversationsTagsForCourseConversationTaggings.length), 1)[0].id}
                    );
                  `,
                );
              const firstCourseConversationMessageCreatedAt = new Date(
                Date.now() -
                  Math.floor(
                    (course.courseConversationsNextPublicId -
                      (courseConversationIndex + 1) +
                      Math.random()) *
                      2 *
                      24 *
                      60 *
                      60 *
                      1000,
                  ),
              );
              let courseConversationMessageForCourseConversationMessageDraft: {
                publicId: string;
              };
              for (const [
                courseConversationMessageIndex,
                courseConversationMessageData,
              ] of courseConversationData.courseConversationMessages.entries()) {
                const courseConversationMessage = database.get<{
                  id: number;
                  publicId: string;
                }>(
                  sql`
                    select * from "courseConversationMessages" where "id" = ${
                      database.run(
                        sql`
                          insert into "courseConversationMessages" (
                            "publicId",
                            "courseConversation",
                            "createdByCourseParticipation",
                            "createdAt",
                            "updatedAt",
                            "courseConversationMessageType",
                            "courseConversationMessageVisibility",
                            "courseConversationMessageAnonymity",
                            "content",
                            "contentSearch"
                          )
                          values (
                            ${cryptoRandomString({ length: 20, type: "numeric" })},
                            ${courseConversation.id},
                            ${Math.random() < 0.9 ? courseParticipations[Math.floor(Math.random() * courseParticipations.length)].id : null},
                            ${new Date(firstCourseConversationMessageCreatedAt.valueOf() + Math.floor((courseConversationMessageIndex + Math.random()) * 60 * 60 * 1000)).toISOString()},
                            ${Math.random() < 0.1 ? new Date(Date.now() - Math.floor(24 * 5 * 60 * 60 * 1000)).toISOString() : null},
                            ${
                              courseConversationMessageIndex === 0 ||
                              Math.random() < 0.7
                                ? "courseConversationMessageTypeMessage"
                                : Math.random() < 0.7
                                  ? "courseConversationMessageTypeAnswer"
                                  : "courseConversationMessageTypeFollowUpQuestion"
                            },
                            ${
                              courseConversationMessageIndex === 0 ||
                              Math.random() < 0.7
                                ? "courseConversationMessageVisibilityEveryone"
                                : "courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                            },
                            ${Math.random() < 0.5 ? "courseConversationMessageAnonymityNone" : Math.random() < 0.9 ? "courseConversationMessageAnonymityCourseParticipationRoleStudents" : "courseConversationMessageAnonymityEveryone"},
                            ${courseConversationMessageData.content},
                            ${utilities
                              .tokenize(courseConversationMessageData.content, {
                                stopWords:
                                  application.applicationConfiguration
                                    .stopWords,
                                stem: (token) =>
                                  natural.PorterStemmer.stem(token),
                              })
                              .map(
                                (tokenWithPosition) => tokenWithPosition.token,
                              )
                              .join(" ")}
                          );
                        `,
                      ).lastInsertRowid
                    };
                  `,
                )!;
                courseConversationMessageForCourseConversationMessageDraft =
                  courseConversationMessage;
                const courseParticipationsForCourseConversationMessageLikes = [
                  ...courseParticipations,
                ];
                const courseConversationMessageLikesCount =
                  Math.random() < 0.6
                    ? 0
                    : Math.random() < 0.8
                      ? Math.floor(Math.random() * 3)
                      : Math.floor(Math.random() * 30);
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
                        ${Math.random() < 0.9 ? courseParticipationsForCourseConversationMessageLikes.splice(Math.floor(Math.random() * courseParticipationsForCourseConversationMessageLikes.length), 1)[0].id : null}
                      );
                    `,
                  );
              }
              if (courseConversationIndex === 0)
                database.run(
                  sql`
                    insert into "courseConversationMessageDrafts" (
                      "courseConversation",
                      "createdByCourseParticipation",
                      "createdAt",
                      "courseConversationMessageType",
                      "courseConversationMessageVisibility",
                      "courseConversationMessageAnonymity",
                      "content"
                    )
                    values (
                      ${courseConversation.id},
                      ${courseParticipation.id},
                      ${new Date().toISOString()},
                      ${"courseConversationMessageTypeMessage"},
                      ${"courseConversationMessageVisibilityEveryone"},
                      ${"courseConversationMessageAnonymityNone"},
                      ${markdown`
                        # Headings

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        # Heading 1

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        ## Heading 2

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        ### Heading 3

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        #### Heading 4

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        ##### Heading 5

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        ###### Heading 6

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        # Separator

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        ---

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        # Inline

                        **Bold**, _italics_, <u>underline</u>, [link](https://courselore.org), www.example.com, https://example.com, contact@example.com, $E=mc^2$, \`code\`, <ins>insertion</ins>, ~~deletion~~ (~one tilde~), <sup>superscript</sup>, <sub>subscript</sub>, and a line  
                        break.

                        Areallylongwordwithoutbreaks${examples
                          .text({ length: 4 })
                          .toLowerCase()
                          .replaceAll(/[^a-z]/g, "")}

                        # Image

                        ![Image](/node_modules/@radically-straightforward/examples/avatars/webp/1.webp)

                        # Animated GIF

                        [<video src="/development/video-example.mp4"></video>](/development/video-example.mp4)

                        # Video

                        <video src="/development/video-example.mp4"></video>

                        # Audio

                        <audio src="/development/audio-example.mp3"></audio>

                        # Image/Video/Audio Proxy

                        ![Proxied image](https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg)

                        <video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>

                        <audio src="https://1cb2b4ea-084b-4282-9796-d397d4a2cc4d.mdnplay.dev/shared-assets/audio/t-rex-roar.mp3"></audio>

                        # Lists

                        - Banana
                        - Pyjamas
                        - Phone

                        ---

                        ${Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => `- ${examples.text({ length: 1 + Math.floor(Math.random() * 7) }).replaceAll("\n\n", "\n\n  ")}`).join("\n\n")}

                        ---

                        1. Banana
                        2. Pyjamas
                        3. Phone

                        ---

                        ${Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (listItemValue, listItemIndex) => `${listItemIndex + 1}. ${examples.text({ length: 1 + Math.floor(Math.random() * 7) }).replaceAll("\n\n", "\n\n   ")}`).join("\n\n")}

                        ---

                        - [ ] Banana
                        - [x] Pyjamas
                        - [ ] Phone

                        ---

                        ${Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () => `- [${Math.random() < 0.5 ? " " : "x"}] ${examples.text({ length: 1 + Math.floor(Math.random() * 7) }).replaceAll("\n\n", "\n\n  ")}`).join("\n\n")}

                        # Poll

                        <poll>

                        - [ ] Banana
                        - [ ] <votes>${(() => {
                          const courseParticipationsForcourseConversationMessageContentPollOptionVotes =
                            [...courseParticipations];
                          return JSON.stringify(
                            Array.from(
                              { length: 3 + Math.floor(Math.random() * 5) },
                              () =>
                                courseParticipationsForcourseConversationMessageContentPollOptionVotes.splice(
                                  Math.floor(
                                    Math.random() *
                                      courseParticipationsForcourseConversationMessageContentPollOptionVotes.length,
                                  ),
                                  1,
                                )[0].publicId,
                            ),
                          );
                        })()}</votes> Pyjamas
                        - [ ] <votes>${(() => {
                          const courseParticipationsForcourseConversationMessageContentPollOptionVotes =
                            [...courseParticipations];
                          return JSON.stringify(
                            Array.from(
                              { length: 30 + Math.floor(Math.random() * 10) },
                              () =>
                                courseParticipationsForcourseConversationMessageContentPollOptionVotes.splice(
                                  Math.floor(
                                    Math.random() *
                                      courseParticipationsForcourseConversationMessageContentPollOptionVotes.length,
                                  ),
                                  1,
                                )[0].publicId,
                            ),
                          );
                        })()}</votes> Phone

                        </poll>

                        # Blockquote

                        ${examples
                          .text({
                            length: 1 + Math.floor(Math.random() * 7),
                          })
                          .split("\n")
                          .map((paragraph) => `> ${paragraph}`)
                          .join("\n")}

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

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        </details>

                        <details>

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        </details>

                        # Footnotes

                        Footnote[^1] and another.[^2]

                        [^1]: ${examples.text({ length: 1 })}

                        [^2]: ${examples.text({ length: 1 })}

                        # \`id="___"\`

                        <p id="an-id-defined-by-the-user">${examples.text({ length: 1 })}</p>

                        <a href="#an-id-defined-by-the-user">An anchor that points to that id</a>

                        # Cross-Site Scripting

                        👍<script>document.write("💩");</script>🙌

                        # Mathematics

                        Lift($L$) can be determined by Lift Coefficient ($$C_L$$) like the following
                        equation.

                        $$
                        L = \\frac{1}{2} \\rho v^2 S C_L
                        $$

                        Big equation:

                        $$
                        \\frac{1}{\\Bigl(\\sqrt{\\phi \\sqrt{5}}-\\phi\\Bigr) e^{\\frac25 \\pi}} = 1+\\frac{e^{-2\\pi}} {1+\\frac{e^{-4\\pi}} {1+\\frac{e^{-6\\pi}} {1+\\frac{e^{-8\\pi}} {1+\\cdots} } } }
                        $$

                        Raw dollar signs: \\$Hello\\$

                        An invalid macro:

                        $$
                        \\invalidMacro
                        $$

                        Inline large width/height $\\rule{500em}{500em}$ visual affront.

                        Block large width/height visual affront:

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

                        Self: @self--${courseParticipation.publicId}

                        Other: @other--${courseParticipations[Math.floor(Math.random() * courseParticipations.length)].publicId}

                        Non-existent: @non-existent--1571024857

                        Course roles: @everyone, @instructors, @students

                        # \`#references\`

                        Conversation existent: #1

                        Conversation non-existent: #999999

                        Conversation existent permanent link turned reference: <https://${
                          application.userConfiguration.hostname
                        }/courses/${course.publicId}/conversations/1>

                        Conversation non-existent permanent link turned reference: <https://${
                          application.userConfiguration.hostname
                        }/courses/${course.publicId}/conversations/999999>

                        Message existent: #1/${courseConversationMessageForCourseConversationMessageDraft!.publicId}

                        Message non-existent: #1/999999

                        Message existent permanent link turned reference: <https://${
                          application.userConfiguration.hostname
                        }/courses/${course.publicId}/conversations/1?message=${courseConversationMessageForCourseConversationMessageDraft!.publicId}>

                        Message non-existent permanent link turned reference: <https://${
                          application.userConfiguration.hostname
                        }/courses/${course.publicId}/conversations/1?message=999999>

                        # Comment

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}

                        <!-- Comments should be removed -->

                        ${examples.text({ length: 1 + Math.floor(Math.random() * 7) })}
                      `}
                    );
                  `,
                );
            }
          }
        }
      },

      sql`
        alter table "systemOptions" rename to "systemSettings";
      `,

      () => {
        // Removed in version 10.2.0
      },

      sql`
        alter table "userSessions" drop column "samlIdentifier";
        alter table "userSessions" drop column "samlProfile";
      `,

      sql`
        alter table "courses" add column "ltiIdentifier" text null;
        alter table "courses" add column "ltiContextId" text null;
        alter table "courses" add column "ltiNamesAndRoleProvisioningServicesURL" text null;
        create unique index "index_courses_ltiIdentifier_ltiContextId" on "courses" ("ltiIdentifier", "ltiContextId");

        alter table "courseParticipations" add column "ltiUserId" text null;
        create unique index "index_courseParticipations_course_ltiUserId" on "courseParticipations" ("course", "ltiUserId");
      `,

      sql`
        drop index "index_courseParticipations_course_ltiUserId";
        alter table "courseParticipations" drop column "ltiUserId";
      `,

      sql`
        alter table "courseParticipations" add column "ltiState" text null;
      `,

      sql`
        alter table "users" alter column "lastSeenOnlineAt" drop not null;
      `,

      sql`
        alter table "users" rename column "emailVerificationNonce" to "emailVerificationNonceHash";
        alter table "users" rename column "password" to "passwordHash";
        alter table "users" rename column "passwordResetNonce" to "passwordResetNonceHash";
        alter table "users" rename column "twoFactorAuthenticationRecoveryCodes" to "twoFactorAuthenticationRecoveryCodesHashes";
        
        alter table "userSessions" rename column "createdAt" to "lastUsedAt";
        drop index "index_userSessions_createdAt";
        create index "index_userSessions_lastUsedAt" on "userSessions" ("lastUsedAt");
        
        alter table "users" drop column "lastSeenOnlineAt";
        
        create index "index_users_emailVerificationCreatedAt" on "users" ("emailVerificationCreatedAt");
        create index "index_users_passwordResetCreatedAt" on "users" ("passwordResetCreatedAt");
        
        alter table "users" add column "deleteMyAccountNonceHash" text null;
        alter table "users" add column "deleteMyAccountCreatedAt" text null;
        create index "index_users_deleteMyAccountCreatedAt" on "users" ("deleteMyAccountCreatedAt");
        
        alter table "users" rename column "emailVerificationCreatedAt" to "emailVerificationNonceCreatedAt";
        alter table "users" rename column "passwordResetCreatedAt" to "passwordResetNonceCreatedAt";
        alter table "users" rename column "deleteMyAccountCreatedAt" to "deleteMyAccountNonceCreatedAt";
        drop index "index_users_emailVerificationCreatedAt";
        drop index "index_users_passwordResetCreatedAt";
        drop index "index_users_deleteMyAccountCreatedAt";
        create index "index_users_emailVerificationNonceCreatedAt" on "users" ("emailVerificationNonceCreatedAt");
        create index "index_users_passwordResetNonceCreatedAt" on "users" ("passwordResetNonceCreatedAt");
        create index "index_users_deleteMyAccountNonceCreatedAt" on "users" ("deleteMyAccountNonceCreatedAt");
      `,

      (database) => {
        if (application.userConfiguration.environment === "development") return;
        for (const user of database.all<{
          id: number;
          passwordHash: string | null;
        }>(
          sql`
            select "id", "passwordHash"
            from "users"
            order by "id" asc;
          `,
        )) {
          if (typeof user.passwordHash !== "string") continue;
          const phcStringParts = user.passwordHash.split("$");
          const nonce = Buffer.from(phcStringParts.at(-2)!, "base64");
          const hash = Buffer.from(phcStringParts.at(-1)!, "base64");
          database.run(
            sql`
              update "users"
              set "passwordHash" = ${JSON.stringify({
                nonce: nonce.toString("hex"),
                hash: hash.toString("hex"),
              })}
              where "id" = ${user.id};
            `,
          );
        }
      },

      (database) => {
        const systemSettings = database.get<{
          privateKey: string;
          certificate: string;
        }>(
          sql`
            select "privateKey", "certificate"
            from "systemSettings"
            limit 1;
          `,
        );
        if (systemSettings === undefined) throw new Error();
        if (application.userConfiguration.environment !== "development")
          console.log(
            utilities.dedent`
              In version 10.2.0 of Courselore the SAML private key and certificate were moved from the database into the configuration file. If you had Identity Providers setup, please copy them over:

              ${systemSettings.privateKey}

              ${systemSettings.certificate}
            `,
          );
        database.execute(
          sql`
            alter table "systemSettings" drop column "privateKey";
            alter table "systemSettings" drop column "certificate";
          `,
        );
      },

      sql`
        drop index "index_courses_ltiIdentifier_ltiContextId";
        alter table "courses" drop column "ltiIdentifier";
        alter table "courses" drop column "ltiContextId";
        alter table "courses" drop column "ltiNamesAndRoleProvisioningServicesURL";
        
        alter table "courses" add column "ltiPlatformId" text null;
        alter table "courses" add column "ltiClientId" text null;
        alter table "courses" add column "ltiContextId" text null;
        alter table "courses" add column "ltiNamesAndRoleProvisioningServicesURL" text null;
        create unique index "index_courses_ltiPlatformId_ltiClientId_ltiContextId" on "courses" ("ltiPlatformId", "ltiClientId", "ltiContextId");
      `,

      sql`
        alter table "users" rename column "emailVerificationNonceHash" to "emailVerificationNonceTokenHash";
        alter table "users" rename column "passwordHash" to "passwordPasswordHash";
        alter table "users" rename column "passwordResetNonceHash" to "passwordResetNonceTokenHash";
        alter table "users" rename column "twoFactorAuthenticationRecoveryCodesHashes" to "twoFactorAuthenticationRecoveryCodesPasswordHashes";
        alter table "users" rename column "deleteMyAccountNonceHash" to "deleteMyAccountNonceTokenHash";
        
        create index "index_users_passwordResetNonceTokenHash" on "users" ("passwordResetNonceTokenHash");
      `,

      (database) => {
        database.execute(
          sql`
            alter table "users" rename column "twoFactorAuthenticationSecret" to "twoFactorAuthenticationSecretEncrypted";
          `,
        );
        for (const user of database.all<{
          id: number;
          twoFactorAuthenticationSecretEncrypted: string;
          twoFactorAuthenticationRecoveryCodesPasswordHashes: string;
        }>(
          sql`
            select
              "id",
              "twoFactorAuthenticationSecretEncrypted",
              "twoFactorAuthenticationRecoveryCodesPasswordHashes"
            from "users"
            where "twoFactorAuthenticationSecretEncrypted" is not null
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              update "users"
              set
                "twoFactorAuthenticationSecretEncrypted" = ${cryptography.SymmetricEncryption.encrypt(application.applicationConfiguration.secretKey, user.twoFactorAuthenticationSecretEncrypted)},
                "twoFactorAuthenticationRecoveryCodesPasswordHashes" = ${JSON.stringify(
                  JSON.parse(
                    user.twoFactorAuthenticationRecoveryCodesPasswordHashes,
                  ).map(
                    (
                      twoFactorAuthenticationRecoveryCodePasswordHash: string,
                    ) => {
                      const phcStringParts =
                        twoFactorAuthenticationRecoveryCodePasswordHash.split(
                          "$",
                        );
                      const nonce = Buffer.from(
                        phcStringParts.at(-2)!,
                        "base64",
                      );
                      const hash = Buffer.from(
                        phcStringParts.at(-1)!,
                        "base64",
                      );
                      return JSON.stringify({
                        nonce: nonce.toString("hex"),
                        hash: hash.toString("hex"),
                      });
                    },
                  ),
                )}
              where "id" = ${user.id};
            `,
          );
      },

      sql`
        update "users"
        set
          "emailVerificationNonceTokenHash" = null,
          "emailVerificationNonceCreatedAt" = null,
          "passwordResetNonceTokenHash" = null,
          "passwordResetNonceCreatedAt" = null,
          "deleteMyAccountNonceTokenHash" = null,
          "deleteMyAccountNonceCreatedAt" = null;
      `,

      (database) => {
        database.execute(
          sql`
            alter table "courses" rename column "invitationLinkCourseParticipationRoleInstructorsToken" to "invitationLinkCourseParticipationRoleInstructorsTokenEncrypted";
            alter table "courses" rename column "invitationLinkCourseParticipationRoleStudentsToken" to "invitationLinkCourseParticipationRoleStudentsTokenEncrypted";
          `,
        );
        for (const course of database.all<{
          id: number;
          invitationLinkCourseParticipationRoleInstructorsTokenEncrypted: string;
          invitationLinkCourseParticipationRoleStudentsTokenEncrypted: string;
        }>(
          sql`
            select
              "id",
              "invitationLinkCourseParticipationRoleInstructorsTokenEncrypted",
              "invitationLinkCourseParticipationRoleStudentsTokenEncrypted"
            from "courses"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
            update "courses"
            set
              "invitationLinkCourseParticipationRoleInstructorsTokenEncrypted" = ${cryptography.SymmetricEncryption.encrypt(application.applicationConfiguration.secretKey, course.invitationLinkCourseParticipationRoleInstructorsTokenEncrypted)},
              "invitationLinkCourseParticipationRoleStudentsTokenEncrypted" = ${cryptography.SymmetricEncryption.encrypt(application.applicationConfiguration.secretKey, course.invitationLinkCourseParticipationRoleStudentsTokenEncrypted)}
            where "id" = ${course.id};
          `,
          );
      },

      (database) => {
        database.execute(
          sql`
            alter table "userSessions" rename column "publicId" to "tokenTokenHash";
          `,
        );
        for (const userSession of database.all<{
          id: number;
          tokenTokenHash: string;
        }>(
          sql`
            select "id", "tokenTokenHash"
            from "userSessions"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              update "userSessions"
              set "tokenTokenHash" = ${cryptography.TokenHash.hash(userSession.tokenTokenHash)}
              where "id" = ${userSession.id};
            `,
          );
      },

      (database) => {
        database.execute(
          sql`
            create table "new_coursePendingInvitationEmails" (
              "id" integer primary key autoincrement,
              "publicId" text not null,
              "tokenTokenHash" text not null unique,
              "course" integer not null references "courses",
              "email" text not null,
              "courseParticipationRole" text not null,
              unique ("publicId", "course"),
              unique ("course", "email")
            ) strict;
          `,
        );
        for (const coursePendingInvitationEmail of database.all<{
          id: number;
          publicId: string;
          course: number;
          email: string;
          courseParticipationRole:
            | "courseParticipationRoleInstructor"
            | "courseParticipationRoleStudent";
        }>(
          sql`
            select
              "id",
              "publicId",
              "course",
              "email",
              "courseParticipationRole"
            from "coursePendingInvitationEmails"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              insert into "new_coursePendingInvitationEmails" (
                "publicId",
                "tokenTokenHash",
                "course",
                "email",
                "courseParticipationRole"
              )
              values (
                ${cryptoRandomString({ length: 20, type: "numeric" })},
                ${cryptography.TokenHash.hash(coursePendingInvitationEmail.publicId)},
                ${coursePendingInvitationEmail.course},
                ${coursePendingInvitationEmail.email},
                ${coursePendingInvitationEmail.courseParticipationRole}
              );
            `,
          );
        database.execute(
          sql`
            drop table "coursePendingInvitationEmails";
            alter table "new_coursePendingInvitationEmails" rename to "coursePendingInvitationEmails";
          `,
        );
      },

      (database) => {
        database.execute(
          sql`
            drop trigger "search_courseConversations_titleSearch_insert";
            drop trigger "search_courseConversations_titleSearch_update";
            drop trigger "search_courseConversations_titleSearch_delete";
            drop table "search_courseConversations_titleSearch";
            alter table "courseConversations" rename column "titleSearch" to "titleLexicalSearch";
            create virtual table "lexicalSearch_courseConversations_titleLexicalSearch" using fts5(
              "titleLexicalSearch",
              content = "courseConversations",
              content_rowid = "id",
              prefix = '1 2 3'
            );
            create trigger "lexicalSearch_courseConversations_titleLexicalSearch_insert" after insert on "courseConversations" begin
              insert into "lexicalSearch_courseConversations_titleLexicalSearch" ("rowid", "titleLexicalSearch") values ("new"."id", "new"."titleLexicalSearch");
            end;
            create trigger "lexicalSearch_courseConversations_titleLexicalSearch_update" after update on "courseConversations" begin
              update "lexicalSearch_courseConversations_titleLexicalSearch" set "titleLexicalSearch" = "new"."titleLexicalSearch" where "rowid" = "old"."id";
            end;
            create trigger "lexicalSearch_courseConversations_titleLexicalSearch_delete" after delete on "courseConversations" begin
              delete from "lexicalSearch_courseConversations_titleLexicalSearch" where "rowid" = "old"."id";
            end;
            
            drop trigger "search_courseConversationMessages_contentSearch_insert";
            drop trigger "search_courseConversationMessages_contentSearch_update";
            drop trigger "search_courseConversationMessages_contentSearch_delete";
            drop table "search_courseConversationMessages_contentSearch";
            alter table "courseConversationMessages" rename column "contentSearch" to "contentLexicalSearch";
            create virtual table "lexicalSearch_courseConversationMessages_contentLexicalSearch" using fts5(
              "contentLexicalSearch",
              content = "courseConversationMessages",
              content_rowid = "id",
              prefix = '1 2 3'
            );
            create trigger "lexicalSearch_courseConversationMessages_contentLexicalSearch_insert" after insert on "courseConversationMessages" begin
              insert into "lexicalSearch_courseConversationMessages_contentLexicalSearch" ("rowid", "contentLexicalSearch") values ("new"."id", "new"."contentLexicalSearch");
            end;
            create trigger "lexicalSearch_courseConversationMessages_contentLexicalSearch_update" after update on "courseConversationMessages" begin
              update "lexicalSearch_courseConversationMessages_contentLexicalSearch" set "contentLexicalSearch" = "new"."contentLexicalSearch" where "rowid" = "old"."id";
            end;
            create trigger "lexicalSearch_courseConversationMessages_contentLexicalSearch_delete" after delete on "courseConversationMessages" begin
              delete from "lexicalSearch_courseConversationMessages_contentLexicalSearch" where "rowid" = "old"."id";
            end;
          `,
        );

        for (const courseConversation of database.all<{
          id: number;
          titleLexicalSearch: string;
        }>(
          sql`
            select "id", "titleLexicalSearch"
            from "courseConversations"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              insert into "lexicalSearch_courseConversations_titleLexicalSearch" (
                "rowid",
                "titleLexicalSearch"
              )
              values (
                ${courseConversation.id},
                ${courseConversation.titleLexicalSearch}
              );
            `,
          );

        for (const courseConversationMessage of database.all<{
          id: number;
          contentLexicalSearch: string;
        }>(
          sql`
            select "id", "contentLexicalSearch"
            from "courseConversationMessages"
            order by "id" asc;
          `,
        ))
          database.run(
            sql`
              insert into "lexicalSearch_courseConversationMessages_contentLexicalSearch" (
                "rowid",
                "contentLexicalSearch"
              )
              values (
                ${courseConversationMessage.id},
                ${courseConversationMessage.contentLexicalSearch}
              );
            `,
          );
      },

      async (database) => {
        database.execute(
          sql`
            alter table "courseConversations" add column "titleSemanticSearch" blob null;
            update "courseConversations" set "titleSemanticSearch" = x'';
            alter table "courseConversations" alter column "titleSemanticSearch" set not null;
          `,
        );
      },

      async (database) => {
        database.execute(
          sql`
            alter table "courseConversationMessages" add column "contentSemanticSearch" blob null;
            update "courseConversationMessages" set "contentSemanticSearch" = x'';
            alter table "courseConversationMessages" alter column "contentSemanticSearch" set not null;
          `,
        );
      },

      async (database) => {
        let courseConversationsIndex = 0;
        const courseConversationsCount = database.get<{
          count: number;
        }>(
          sql`
            select count(*) as "count" from "courseConversations";
          `,
        )!.count;
        for (const courseConversation of database.iterate<{
          id: number;
          title: string;
        }>(
          sql`
            select "id", "title"
            from "courseConversations"
            order by "id" asc;
          `,
        )) {
          // process.stdout.write(
          //   `courseConversation: ${++courseConversationsIndex}/${courseConversationsCount}\r`,
          // );
          database.run(
            sql`
              update "courseConversations"
              set "titleSemanticSearch" = vec_f32(${await (
                await fetch("http://localhost:19000/vector-embedding", {
                  method: "POST",
                  headers: { "CSRF-Protection": "true" },
                  body: new URLSearchParams({ text: courseConversation.title }),
                })
              ).text()})
              where "id" = ${courseConversation.id};
            `,
          );
        }
        // console.log();
      },

      async (database) => {
        let courseConversationMessagesIndex = 0;
        const courseConversationMessagesCount = database.get<{
          count: number;
        }>(
          sql`
            select count(*) as "count" from "courseConversationMessages";
          `,
        )!.count;
        for (const courseConversationMessage of database.iterate<{
          id: number;
          content: string;
        }>(
          sql`
            select "id", "content"
            from "courseConversationMessages"
            order by "id" asc;
          `,
        )) {
          // process.stdout.write(
          //   `courseConversationMessage: ${++courseConversationMessagesIndex}/${courseConversationMessagesCount}\r`,
          // );
          database.run(
            sql`
              update "courseConversationMessages"
              set "contentSemanticSearch" = vec_f32(${await (
                await fetch("http://localhost:19000/vector-embedding", {
                  method: "POST",
                  headers: { "CSRF-Protection": "true" },
                  body: new URLSearchParams({
                    text: await application.partials.courseConversationMessageContentProcessor(
                      {
                        course:
                          database.get<{
                            id: number;
                            publicId: string;
                            courseState:
                              "courseStateActive" | "courseStateArchived";
                          }>(
                            sql`
                              select
                                "courses"."id" as "id",
                                "courses"."publicId" as "publicId",
                                "courses"."courseState" as "courseState"
                              from "courses"
                              join "courseConversations" on "courses"."id" = "courseConversations"."course"
                              join "courseConversationMessages" on
                                "courseConversations"."id" = "courseConversationMessages"."courseConversation" and
                                "courseConversationMessages"."id" = ${courseConversationMessage.id};
                            `,
                          ) ??
                          (() => {
                            throw new Error();
                          })(),
                        courseConversationMessageContent:
                          courseConversationMessage.content,
                        mode: "textContent",
                      },
                    ),
                  }),
                })
              ).text()})
              where "id" = ${courseConversationMessage.id};
            `,
          );
        }
        // console.log();
      },
    );
};
