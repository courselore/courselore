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
