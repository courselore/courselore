alter table "users" rename to "old_users";
drop table "usersNameSearchIndex";
drop table "emailVerifications";
drop table "passwordResets";
create table "users" (
  "identifier" text primary key,
  "createdAt" text not null,
  "name" text not null,
  "nameSearch" text not null,
  "emailVerification" text null unique,
  "emailVerificationCreatedAt" text null,
  "passwordReset" text null unique,
  "passwordResetCreatedAt" text null
) strict, without rowid;
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
  update "search_users_nameSearch" set "nameSearch" = "new"."nameSearch" where "search_users_nameSearch"."rowid" = "new"."identifier";
end;
create trigger "search_users_nameSearch_delete" after delete on "users" begin
  delete from "search_users_nameSearch" where "search_users_nameSearch"."rowid" = "old"."identifier";
end;

alter table "sessions" rename to "old_sessions";
create table "sessions" (
  "identifier" text primary key,
  "createdAt" text not null,
  "user" text not null references "users" on delete cascade,
  "samlIdentifier" text null,
  "samlSessionIndex" text null,
  "samlNameID" text null
) strict, without rowid;
create index "index_sessions_createdAt" on "sessions" ("createdAt");
create index "index_sessions_user" on "sessions" ("user");

alter table "courses" rename to "old_courses";
create table "courses" (
  "identifier" text primary key,
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
  "nextConversationReference" integer not null,
  "archivedAt" text null
) strict, without rowid;
create index "index_courses_reference" on "courses" ("reference");

alter table "invitations" rename to "old_invitations";
create table "courseInvitationEmails" (
  "identifier" text primary key,
  "createdAt" text not null,
  "course" text not null references "courses" on delete cascade,
  "email" text not null,
  "courseRole" text not null
) strict, without rowid;
create index "index_courseInvitationEmails_createdAt" on "courseInvitationEmails" ("createdAt");
create index "index_courseInvitationEmails_course" on "courseInvitationEmails" ("course");
create index "index_courseInvitationEmails_email" on "courseInvitationEmails" ("email");

alter table "courseParticipants" rename to "old_courseParticipants";
create table "courseParticipations" (
  "user" text not null references "users" on delete cascade,
  "course" text not null references "courses" on delete cascade,
  "createdAt" text not null,
  "courseRole" text not null,
  "accentColor" text not null,
  "mostRecentlyVisitedConversation" integer null references "conversations" on delete set null,
  primary key ("user", "course")
) strict, without rowid;

------------------------------------------------

drop table "old_users";
drop table "old_sessions";
drop table "old_courses";
drop table "old_invitations";
