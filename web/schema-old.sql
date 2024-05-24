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
