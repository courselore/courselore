CREATE TABLE IF NOT EXISTS "courseParticipations" (
            "id" integer primary key autoincrement,
            "publicId" text not null unique,
            "user" integer not null references "users",
            "course" integer not null references "courses",
            "courseParticipationRole" text not null,
            "decorationColor" text not null,
            "mostRecentlyVisitedCourseConversation" integer null references "courseConversations", "ltiState" text null,
            unique ("user", "course")
          ) strict;
CREATE INDEX "index_courseParticipations_mostRecentlyVisitedCourseConversation" on "courseParticipations" ("mostRecentlyVisitedCourseConversation");
CREATE TABLE IF NOT EXISTS "courseConversationsTags" (
            "id" integer primary key autoincrement,
            "publicId" text not null unique,
            "course" integer not null references "courses",
            "order" integer not null,
            "name" text not null,
            "privateToCourseParticipationRoleInstructors" integer not null
          ) strict;
CREATE INDEX "index_courseConversationsTags_course" on "courseConversationsTags" ("course");
CREATE TABLE IF NOT EXISTS "courseConversations" (
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
CREATE INDEX "index_courseConversations_courseConversationType" on "courseConversations" ("courseConversationType");
CREATE INDEX "index_courseConversations_questionResolved" on "courseConversations" ("questionResolved");
CREATE INDEX "index_courseConversations_pinned" on "courseConversations" ("pinned");
CREATE VIRTUAL TABLE "search_courseConversations_titleSearch" using fts5(
            "titleSearch",
            content = "courseConversations",
            content_rowid = "id",
            prefix = '1 2 3'
          )
/* search_courseConversations_titleSearch(titleSearch) */;
CREATE TABLE IF NOT EXISTS 'search_courseConversations_titleSearch_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'search_courseConversations_titleSearch_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'search_courseConversations_titleSearch_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'search_courseConversations_titleSearch_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TRIGGER "search_courseConversations_titleSearch_insert" after insert on "courseConversations" begin
            insert into "search_courseConversations_titleSearch" ("rowid", "titleSearch") values ("new"."id", "new"."titleSearch");
          end;
CREATE TRIGGER "search_courseConversations_titleSearch_update" after update on "courseConversations" begin
            update "search_courseConversations_titleSearch" set "titleSearch" = "new"."titleSearch" where "rowid" = "old"."id";
          end;
CREATE TRIGGER "search_courseConversations_titleSearch_delete" after delete on "courseConversations" begin
            delete from "search_courseConversations_titleSearch" where "rowid" = "old"."id";
          end;
CREATE TABLE IF NOT EXISTS "courseConversationParticipations" (
            "id" integer primary key autoincrement,
            "courseConversation" integer not null references "courseConversations",
            "courseParticipation" integer not null references "courseParticipations",
            unique ("courseConversation", "courseParticipation")
          ) strict;
CREATE TABLE IF NOT EXISTS "courseConversationTaggings" (
            "id" integer primary key autoincrement,
            "courseConversation" integer not null references "courseConversations",
            "courseConversationsTag" integer not null references "courseConversationsTags",
            unique ("courseConversation", "courseConversationsTag")
          ) strict;
CREATE TABLE IF NOT EXISTS "courseConversationMessageDrafts" (
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
CREATE TABLE IF NOT EXISTS "courseConversationMessages" (
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
CREATE INDEX "index_courseConversationMessages_courseConversation" on "courseConversationMessages" ("courseConversation");
CREATE INDEX "index_courseConversationMessages_createdByCourseParticipation" on "courseConversationMessages" ("createdByCourseParticipation");
CREATE INDEX "index_courseConversationMessages_courseConversationMessageType" on "courseConversationMessages" ("courseConversationMessageType");
CREATE VIRTUAL TABLE "search_courseConversationMessages_contentSearch" using fts5(
            "contentSearch",
            content = "courseConversationMessages",
            content_rowid = "id",
            prefix = '1 2 3'
          )
/* search_courseConversationMessages_contentSearch(contentSearch) */;
CREATE TABLE IF NOT EXISTS 'search_courseConversationMessages_contentSearch_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'search_courseConversationMessages_contentSearch_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'search_courseConversationMessages_contentSearch_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'search_courseConversationMessages_contentSearch_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TRIGGER "search_courseConversationMessages_contentSearch_insert" after insert on "courseConversationMessages" begin
            insert into "search_courseConversationMessages_contentSearch" ("rowid", "contentSearch") values ("new"."id", "new"."contentSearch");
          end;
CREATE TRIGGER "search_courseConversationMessages_contentSearch_update" after update on "courseConversationMessages" begin
            update "search_courseConversationMessages_contentSearch" set "contentSearch" = "new"."contentSearch" where "rowid" = "old"."id";
          end;
CREATE TRIGGER "search_courseConversationMessages_contentSearch_delete" after delete on "courseConversationMessages" begin
            delete from "search_courseConversationMessages_contentSearch" where "rowid" = "old"."id";
          end;
CREATE TABLE IF NOT EXISTS "courseConversationMessageViews" (
            "id" integer primary key autoincrement,
            "courseConversationMessage" integer not null references "courseConversationMessages",
            "courseParticipation" integer null references "courseParticipations",
            "createdAt" text not null,
            unique ("courseConversationMessage", "courseParticipation")
          ) strict;
CREATE TABLE IF NOT EXISTS "courseConversationMessageLikes" (
            "id" integer primary key autoincrement,
            "courseConversationMessage" integer not null references "courseConversationMessages",
            "courseParticipation" integer null references "courseParticipations",
            unique ("courseConversationMessage", "courseParticipation")
          ) strict;
CREATE UNIQUE INDEX "index_courses_ltiIdentifier_ltiContextId" on "courses" ("ltiIdentifier", "ltiContextId");
CREATE INDEX "index_userSessions_lastUsedAt" on "userSessions" ("lastUsedAt");
CREATE INDEX "index_users_emailVerificationNonceCreatedAt" on "users" ("emailVerificationNonceCreatedAt");
CREATE INDEX "index_users_passwordResetNonceCreatedAt" on "users" ("passwordResetNonceCreatedAt");
CREATE INDEX "index_users_deleteMyAccountNonceCreatedAt" on "users" ("deleteMyAccountNonceCreatedAt");
