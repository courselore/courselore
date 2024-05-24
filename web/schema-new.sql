alter table "users" rename to "old_users";
drop table "usersNameSearchIndex";
drop table "emailVerifications";
drop table "passwordResets";
create table "users" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "createdAt" text not null,
  "name" text not null,
  "nameSearch" text not null,
  "emailVerification" text null unique,
  "emailVerificationCreatedAt" text null,
  "passwordReset" text null unique,
  "passwordResetCreatedAt" text null
) strict;
create virtual table "search_users_nameSearch" using fts5(
  content = "users",
  content_rowid = "identifier",
  "nameSearch",
  tokenize = 'porter'
);
create trigger "search_users_nameSearch_insert" after insert on "users" begin
  insert into "search_users_nameSearch" ("rowid", "nameSearch") values ("new"."identifier", "new"."nameSearch");
end;
create trigger "search_users_nameSearch_update" after update on "users" begin
  update "search_users_nameSearch" set "nameSearch" = "new"."nameSearch" where "rowid" = "old"."identifier";
end;
create trigger "search_users_nameSearch_delete" after delete on "users" begin
  delete from "search_users_nameSearch" where "rowid" = "old"."identifier";
end;

alter table "sessions" rename to "old_sessions";
create table "userSessions" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "createdAt" text not null,
  "user" integer not null references "users" on delete cascade,
  "samlIdentifier" text null,
  "samlSessionIndex" text null,
  "samlNameID" text null
) strict;
create index "index_userSessions_createdAt" on "userSessions" ("createdAt");
create index "index_userSessions_user" on "userSessions" ("user");

alter table "courses" rename to "old_courses";
create table "courses" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "createdAt" text not null,
  "name" text not null,
  "year" text null,
  "term" text null,
  "institution" text null,
  "code" text null,
  "invitationLinkCourseStaff" text not null,
  "invitationLinkCourseStaffActive" integer not null,
  "invitationLinkStudents" text not null,
  "invitationLinkStudentsActive" integer not null,
  "studentsMayCreatePolls" integer not null,
  "nextConversationExternalIdentifier" integer not null,
  "archivedAt" text null
) strict;

alter table "invitations" rename to "old_invitations";
create table "courseInvitationEmails" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "createdAt" text not null,
  "course" integer not null references "courses" on delete cascade,
  "email" text not null,
  "courseRole" text not null
) strict;
create index "index_courseInvitationEmails_createdAt" on "courseInvitationEmails" ("createdAt");
create index "index_courseInvitationEmails_course" on "courseInvitationEmails" ("course");
create index "index_courseInvitationEmails_email" on "courseInvitationEmails" ("email");

alter table "courseParticipants" rename to "old_courseParticipants";
create table "courseParticipations" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "user" integer not null references "users" on delete cascade,
  "course" integer not null references "courses" on delete cascade,
  "createdAt" text not null,
  "courseRole" text not null,
  "accentColor" text not null,
  "mostRecentlyVisitedConversation" integer null references "conversations" on delete set null,
  unique ("user", "course")
) strict;

alter table "conversations" rename to "old_conversations";
create table "courseConversations" (
  "identifier" integer primary key autoincrement,
  "externalIdentifier" text not null unique,
  "course" integer not null references "courses" on delete cascade,
  "createdAt" text not null,
  "updatedAt" text null,
  "createdBy" integer null references "courseParticipations" on delete set null,
  "pinned" integer not null,
  "type" text not null,
  "resolved" integer not null,
  "participants" text not null,
  "anonymous" integer not null,
  "title" text not null,
  "titleSearch" text not null,
  "nextMessageExternalIdentifier" integer not null,
  unique ("course", "externalIdentifier")
) strict;
create index "index_courseConversations_course" on "courseConversations" ("course");
create index "index_courseConversations_createdAt" on "courseConversations" ("createdAt");
create index "index_courseConversations_updatedAt" on "courseConversations" ("updatedAt");
create index "index_courseConversations_pinned" on "courseConversations" ("pinned");
create index "index_courseConversations_type" on "courseConversations" ("type");
create index "index_courseConversations_resolved" on "courseConversations" ("resolved");
create virtual table "search_courseConversations_externalIdentifier" using fts5(
  content = "courseConversations",
  content_rowid = "identifier",
  "externalIdentifier",
  tokenize = 'porter'
);
create trigger "search_courseConversations_externalIdentifier_insert" after insert on "courseConversations" begin
  insert into "search_courseConversations_externalIdentifier" ("rowid", "externalIdentifier") values ("new"."identifier", "new"."externalIdentifier");
end;
create trigger "search_courseConversations_externalIdentifier_update" after update on "courseConversations" begin
  update "search_courseConversations_externalIdentifier" set "externalIdentifier" = "new"."externalIdentifier" where "rowid" = "old"."identifier";
end;
create trigger "search_courseConversations_externalIdentifier_delete" after delete on "courseConversations" begin
  delete from "search_courseConversations_externalIdentifier" where "rowid" = "old"."identifier";
end;
create virtual table "search_courseConversations_titleSearch" using fts5(
  content = "courseConversations",
  content_rowid = "identifier",
  "titleSearch",
  tokenize = 'porter'
);
create trigger "search_courseConversations_titleSearch_insert" after insert on "courseConversations" begin
  insert into "search_courseConversations_titleSearch" ("rowid", "titleSearch") values ("new"."identifier", "new"."titleSearch");
end;
create trigger "search_courseConversations_titleSearch_update" after update on "courseConversations" begin
  update "search_courseConversations_titleSearch" set "titleSearch" = "new"."titleSearch" where "rowid" = "old"."identifier";
end;
create trigger "search_courseConversations_titleSearch_delete" after delete on "courseConversations" begin
  delete from "search_courseConversations_titleSearch" where "rowid" = "old"."identifier";
end;

alter table "conversationSelectedParticipants" rename to "old_conversationSelectedParticipants";
create table "courseConversationParticipations" (
  "identifier" integer primary key autoincrement,
  "courseConversation" integer not null references "courseConversations" on delete cascade,
  "courseParticipation" integer not null references "courseParticipations" on delete cascade,
  unique ("courseConversation", "courseParticipation")
) strict;

------------------------------------------------

drop table "old_users";
drop table "old_sessions";
drop table "old_courses";
drop table "old_invitations";
drop table "old_courseParticipants";
drop table "old_conversations";
drop table "old_conversationSelectedParticipants";
