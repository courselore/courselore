CREATE TABLE IF NOT EXISTS "_backgroundJobs" (
              "id" INTEGER PRIMARY KEY AUTOINCREMENT,
              "type" TEXT NOT NULL,
              "startAt" TEXT NOT NULL,
              "parameters" TEXT NOT NULL,
              "startedAt" TEXT NULL,
              "retries" INTEGER NULL
            ) STRICT;
CREATE TABLE sqlite_sequence(name,seq);
CREATE INDEX "_backgroundJobsType" ON "_backgroundJobs" ("type");
CREATE INDEX "_backgroundJobsStartAt" ON "_backgroundJobs" ("startAt");
CREATE INDEX "_backgroundJobsStartedAt" ON "_backgroundJobs" ("startedAt");
CREATE INDEX "_backgroundJobsRetries" ON "_backgroundJobs" ("retries");
CREATE VIRTUAL TABLE "usersNameSearchIndex" USING fts5(
        content = "users",
        content_rowid = "id",
        "nameSearch",
        tokenize = 'porter'
      )
/* usersNameSearchIndex(nameSearch) */;
CREATE TABLE IF NOT EXISTS 'usersNameSearchIndex_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'usersNameSearchIndex_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'usersNameSearchIndex_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'usersNameSearchIndex_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS "emailVerifications" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
CREATE TABLE IF NOT EXISTS "passwordResets" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
CREATE TABLE IF NOT EXISTS "sessions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE
      , "samlIdentifier" TEXT NULL, "samlSessionIndex" TEXT NULL, "samlNameID" TEXT NULL);
CREATE TABLE IF NOT EXISTS "courses" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "reference" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "year" TEXT NULL,
        "term" TEXT NULL,
        "institution" TEXT NULL,
        "code" TEXT NULL,
        "nextConversationReference" INTEGER NOT NULL
      , "archivedAt" TEXT NULL, "studentsMayCreatePollsAt" TEXT NULL, "aiTeachingAssistantAPIKey" TEXT NULL);
CREATE TABLE IF NOT EXISTS "invitations" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "expiresAt" TEXT NULL,
        "usedAt" TEXT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "email" TEXT NULL,
        "name" TEXT NULL,
        "courseRole" TEXT NOT NULL,
        UNIQUE ("course", "reference")
      );
CREATE INDEX "invitationsCourseIndex" ON "invitations" ("course");
CREATE INDEX "invitationsEmailIndex" ON "invitations" ("email");
CREATE TABLE IF NOT EXISTS "courseParticipants" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "user" INTEGER NOT NULL REFERENCES "users" ON DELETE CASCADE,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "courseRole" TEXT NOT NULL,
        "accentColor" TEXT NOT NULL, "mostRecentlyVisitedConversation" INTEGER NULL REFERENCES "conversations" ON DELETE SET NULL,
        UNIQUE ("user", "course"),
        UNIQUE ("course", "reference")
      );
CREATE VIRTUAL TABLE "conversationsReferenceIndex" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "reference",
        tokenize = 'porter'
      )
/* conversationsReferenceIndex(reference) */;
CREATE TABLE IF NOT EXISTS 'conversationsReferenceIndex_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'conversationsReferenceIndex_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'conversationsReferenceIndex_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'conversationsReferenceIndex_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE VIRTUAL TABLE "conversationsTitleSearchIndex" USING fts5(
        content = "conversations",
        content_rowid = "id",
        "titleSearch",
        tokenize = 'porter'
      )
/* conversationsTitleSearchIndex(titleSearch) */;
CREATE TABLE IF NOT EXISTS 'conversationsTitleSearchIndex_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'conversationsTitleSearchIndex_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'conversationsTitleSearchIndex_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'conversationsTitleSearchIndex_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS "taggings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "tag" INTEGER NOT NULL REFERENCES "tags" ON DELETE CASCADE,
        UNIQUE ("conversation", "tag")
      );
CREATE INDEX "taggingsConversationIndex" ON "taggings" ("conversation");
CREATE INDEX "taggingsTagIndex" ON "taggings" ("tag");
CREATE VIRTUAL TABLE "messagesReferenceIndex" USING fts5(
        content = "messages",
        content_rowid = "id",
        "reference",
        tokenize = 'porter'
      )
/* messagesReferenceIndex(reference) */;
CREATE TABLE IF NOT EXISTS 'messagesReferenceIndex_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'messagesReferenceIndex_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'messagesReferenceIndex_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'messagesReferenceIndex_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE VIRTUAL TABLE "messagesContentSearchIndex" USING fts5(
        content = "messages",
        content_rowid = "id",
        "contentSearch",
        tokenize = 'porter'
      )
/* messagesContentSearchIndex(contentSearch) */;
CREATE TABLE IF NOT EXISTS 'messagesContentSearchIndex_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'messagesContentSearchIndex_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'messagesContentSearchIndex_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'messagesContentSearchIndex_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS "readings" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "courseParticipant" INTEGER NOT NULL REFERENCES "courseParticipants" ON DELETE CASCADE,
        UNIQUE ("message", "courseParticipant") ON CONFLICT IGNORE
      );
CREATE TABLE IF NOT EXISTS "emailNotificationDeliveries" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "courseParticipant" INTEGER NOT NULL REFERENCES "courseParticipants" ON DELETE CASCADE,
        UNIQUE ("message", "courseParticipant") ON CONFLICT IGNORE
      );
CREATE TABLE IF NOT EXISTS "endorsements" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "courseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
        UNIQUE ("message", "courseParticipant")
      );
CREATE INDEX "endorsementsMessageIndex" ON "endorsements" ("message");
CREATE TABLE IF NOT EXISTS "likes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "courseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
        UNIQUE ("message", "courseParticipant")
      );
CREATE INDEX "likesMessageIndex" ON "likes" ("message");
CREATE TABLE IF NOT EXISTS "sendEmailJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "startAt" TEXT NOT NULL,
        "startedAt" TEXT NULL,
        "mailOptions" TEXT NOT NULL
      );
CREATE INDEX "sendEmailJobsStartAtIndex" ON "sendEmailJobs" ("startAt");
CREATE INDEX "sendEmailJobsStartedAtIndex" ON "sendEmailJobs" ("startedAt");
CREATE INDEX "passwordResetsCreatedAtIndex" ON "passwordResets" ("createdAt");
CREATE INDEX "sessionsCreatedAtIndex" ON "sessions" ("createdAt");
CREATE TABLE IF NOT EXISTS "flashes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "theme" TEXT NOT NULL,
        "content" TEXT NOT NULL
      );
CREATE INDEX "flashesCreatedAtIndex" ON "flashes" ("createdAt");
CREATE INDEX "emailVerificationsCreatedAtIndex" ON "emailVerifications" ("createdAt");
CREATE TABLE IF NOT EXISTS "emailNotificationMessageJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "startAt" TEXT NOT NULL,
        "startedAt" TEXT NULL,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE
      );
CREATE INDEX "emailNotificationMessageJobsStartAtIndex" ON "emailNotificationMessageJobs" ("startAt");
CREATE INDEX "emailNotificationMessageJobsStartedAtIndex" ON "emailNotificationMessageJobs" ("startedAt");
CREATE TABLE IF NOT EXISTS "emailNotificationDigestMessages" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "message" INTEGER NOT NULL REFERENCES "messages" ON DELETE CASCADE,
        "courseParticipant" INTEGER NOT NULL REFERENCES "courseParticipants" ON DELETE CASCADE,
        UNIQUE ("message", "courseParticipant") ON CONFLICT IGNORE
      );
CREATE TABLE IF NOT EXISTS "emailNotificationDigestJobs" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "startedAt" TEXT NOT NULL,
        "user" INTEGER NOT NULL UNIQUE REFERENCES "users" ON DELETE CASCADE
      );
CREATE INDEX "emailNotificationDigestJobsStartedAtIndex" ON "emailNotificationDigestJobs" ("startedAt");
CREATE INDEX "emailNotificationDigestJobsUserIndex" ON "emailNotificationDigestJobs" ("user");
CREATE TABLE IF NOT EXISTS "conversations" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "updatedAt" TEXT NULL,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "authorCourseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
            "participants" TEXT NOT NULL,
            "anonymousAt" TEXT NULL,
            "type" TEXT NOT NULL,
            "pinnedAt" TEXT NULL,
            "resolvedAt" TEXT NULL,
            "title" TEXT NOT NULL,
            "titleSearch" TEXT NOT NULL,
            "nextMessageReference" INTEGER NOT NULL, "announcementAt" TEXT NULL, "aiTeachingAssistantChatId" TEXT NULL,
            UNIQUE ("course", "reference")
          );
CREATE TABLE IF NOT EXISTS "conversationSelectedParticipants" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
            "courseParticipant" INTEGER NOT NULL REFERENCES "courseParticipants" ON DELETE CASCADE,
            UNIQUE ("conversation", "courseParticipant") ON CONFLICT IGNORE
          );
CREATE INDEX "conversationSelectedParticipantsConversationIndex" ON "conversationSelectedParticipants" ("conversation");
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
CREATE INDEX "sessionsTokenIndex" ON "sessions" ("token");
CREATE INDEX "sessionsUserIndex" ON "sessions" ("user");
CREATE TABLE IF NOT EXISTS "messageDrafts" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
        "authorCourseParticipant" INTEGER NOT NULL REFERENCES "courseParticipants" ON DELETE CASCADE,
        "contentSource" TEXT NOT NULL,
        UNIQUE ("conversation", "authorCourseParticipant") ON CONFLICT REPLACE
      );
CREATE TABLE IF NOT EXISTS "tags" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "order" INTEGER NOT NULL,
            "name" TEXT NOT NULL,
            "courseStaffOnlyAt" TEXT NULL,
            UNIQUE ("course", "reference")
          );
CREATE INDEX "tagsCourseIndex" ON "tags" ("course");
CREATE TABLE IF NOT EXISTS "messagePolls" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "course" INTEGER NOT NULL REFERENCES "courses" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "authorCourseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
        "multipleChoicesAt" TEXT NULL,
        "closesAt" TEXT NULL,
        UNIQUE ("course", "reference")
      );
CREATE TABLE IF NOT EXISTS "messagePollOptions" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "messagePoll" INTEGER NOT NULL REFERENCES "messagePolls" ON DELETE CASCADE,
        "reference" TEXT NOT NULL,
        "order" INTEGER NOT NULL,
        "contentSource" TEXT NOT NULL,
        "contentPreprocessed" TEXT NOT NULL,
        UNIQUE ("messagePoll", "reference")
      );
CREATE TABLE IF NOT EXISTS "messagePollVotes" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "messagePollOption" INTEGER NOT NULL REFERENCES "messagePollOptions" ON DELETE CASCADE,
        "courseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
        UNIQUE ("messagePollOption", "courseParticipant")
      );
CREATE TABLE IF NOT EXISTS "samlCache" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "createdAt" TEXT NOT NULL,
        "samlIdentifier" TEXT NOT NULL,
        "key" TEXT NOT NULL UNIQUE,
        "value" TEXT NOT NULL
      );
CREATE INDEX "samlCacheCreatedAtIndex" ON "samlCache" ("createdAt");
CREATE TABLE IF NOT EXISTS "users" (
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
          , "mostRecentlyVisitedCourseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL, "agreedToAITeachingAssistantAt" TEXT NULL);
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
CREATE TABLE IF NOT EXISTS "messages" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT,
            "createdAt" TEXT NOT NULL,
            "updatedAt" TEXT NULL,
            "conversation" INTEGER NOT NULL REFERENCES "conversations" ON DELETE CASCADE,
            "reference" TEXT NOT NULL,
            "authorCourseParticipant" INTEGER NULL REFERENCES "courseParticipants" ON DELETE SET NULL,
            "anonymousAt" TEXT NULL,
            "type" TEXT NOT NULL,
            "contentSource" TEXT NOT NULL,
            "contentPreprocessed" TEXT NOT NULL,
            "contentSearch" TEXT NOT NULL, "authorAITeachingAssistantAt" TEXT NULL,
            UNIQUE ("conversation", "reference")
          );
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
CREATE INDEX "courseParticipantsUserIndex" ON "courseParticipants" ("user");
CREATE INDEX "courseParticipantsCourseIndex" ON "courseParticipants" ("course");
CREATE INDEX "emailNotificationDigestMessagesCourseParticipantIndex" ON "emailNotificationDigestMessages" ("courseParticipant");
CREATE INDEX "conversationSelectedParticipantsCourseParticipantIndex" ON "conversationSelectedParticipants" ("courseParticipant");
CREATE TABLE IF NOT EXISTS "administrationOptions" (
            "id" INTEGER PRIMARY KEY AUTOINCREMENT CHECK ("id" = 1),
            "latestVersion" TEXT NOT NULL,
            "privateKey" TEXT NOT NULL,
            "certificate" TEXT NOT NULL,
            "userSystemRolesWhoMayCreateCourses" TEXT NOT NULL
          );
CREATE INDEX "sendEmailJobsCreatedAtIndex" ON "sendEmailJobs" ("createdAt");
CREATE INDEX "emailNotificationMessageJobsCreatedAtIndex" ON "emailNotificationMessageJobs" ("createdAt");
CREATE TABLE IF NOT EXISTS "liveConnectionsMetadata" (
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
