create table "taggings" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "conversation" integer not null references "conversations" on delete cascade,
        "tag" integer not null references "tags" on delete cascade,
        unique ("conversation", "tag")
      ) strict;
create table "readings" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "message" integer not null references "messages" on delete cascade,
        "courseParticipant" integer not null references "courseParticipants" on delete cascade,
        unique ("message", "courseParticipant") on conflict ignore
      ) strict;
create table "emailNotificationDeliveries" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "message" integer not null references "messages" on delete cascade,
        "courseParticipant" integer not null references "courseParticipants" on delete cascade,
        unique ("message", "courseParticipant") on conflict ignore
      ) strict;
create table "endorsements" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "message" integer not null references "messages" on delete cascade,
        "courseParticipant" integer null references "courseParticipants" on delete set null,
        unique ("message", "courseParticipant")
      ) strict;
create table "likes" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "message" integer not null references "messages" on delete cascade,
        "courseParticipant" integer null references "courseParticipants" on delete set null,
        unique ("message", "courseParticipant")
      ) strict;
create table "messageDrafts" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "conversation" integer not null references "conversations" on delete cascade,
        "authorCourseParticipant" integer not null references "courseParticipants" on delete cascade,
        "contentSource" text not null,
        unique ("conversation", "authorCourseParticipant") on conflict replace
      ) strict;
create table "messagePolls" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "course" integer not null references "courses" on delete cascade,
        "reference" text not null,
        "authorCourseParticipant" integer null references "courseParticipants" on delete set null,
        "multipleChoicesAt" text null,
        "closesAt" text null,
        unique ("course", "reference")
      ) strict;
create table "messagePollOptions" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "messagePoll" integer not null references "messagePolls" on delete cascade,
        "reference" text not null,
        "order" integer not null,
        "contentSource" text not null,
        "contentPreprocessed" text not null,
        unique ("messagePoll", "reference")
      ) strict;
create table "messagePollVotes" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "messagePollOption" integer not null references "messagePollOptions" on delete cascade,
        "courseParticipant" integer null references "courseParticipants" on delete set null,
        unique ("messagePollOption", "courseParticipant")
      ) strict;
create table "samlCache" (
        "identifier" integer primary key autoincrement,
        "createdAt" text not null,
        "samlIdentifier" text not null,
        "key" text not null unique,
        "value" text not null
      ) strict;
create table "users" (
            "identifier" integer primary key autoincrement,
            "createdAt" text not null,
            "lastSeenOnlineAt" text not null,
            "reference" text not null unique,
            "email" text not null unique collate nocase,
            "password" text null,
            "emailVerifiedAt" text null,
            "name" text not null,
            "nameSearch" text not null,
            "avatar" text null,
            "avatarlessBackgroundColor" text not null,
            "biographySource" text null,
            "biographyPreprocessed" text null,
            "systemRole" text not null,
            "emailNotificationsForAllMessages" text not null,
            "emailNotificationsForAllMessagesDigestDeliveredAt" text null,
            "emailNotificationsForMentionsAt" text null,
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" text null,
            "emailNotificationsForMessagesInConversationsYouStartedAt" text null,
            "preferContentEditorProgrammerModeAt" text null,
            "preferContentEditorToolbarInCompactAt" text null,
            "preferAnonymousAt" text null,
            "latestNewsVersion" text not null
          , "mostRecentlyVisitedCourseParticipant" integer null references "courseParticipants" on delete set null, "agreedToAITeachingAssistantAt" text null) strict;
create table "messages" (
            "identifier" integer primary key autoincrement,
            "createdAt" text not null,
            "updatedAt" text null,
            "conversation" integer not null references "conversations" on delete cascade,
            "reference" text not null,
            "authorCourseParticipant" integer null references "courseParticipants" on delete set null,
            "anonymousAt" text null,
            "type" text not null,
            "contentSource" text not null,
            "contentPreprocessed" text not null,
            "contentSearch" text not null, "authorAITeachingAssistantAt" text null,
            unique ("conversation", "reference")
          ) strict;
          -- FTS on "reference" and "contentSearch"
create table "administrationOptions" (
            "identifier" integer primary key autoincrement check ("id" = 1),
            "latestVersion" text not null,
            "privateKey" text not null,
            "certificate" text not null,
            "userSystemRolesWhoMayCreateCourses" text not null
          ) strict;
