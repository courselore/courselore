ALTER TABLE "users" RENAME TO "old_users";
DROP TABLE "usersNameSearchIndex";
DROP TABLE "emailVerifications";
DROP TABLE "passwordResets";
CREATE TABLE "users" (
  "emailVerificationNonce" TEXT NULL UNIQUE,
  "emailVerificationCreatedAt" TEXT NULL,
  "passwordResetNonce" TEXT NULL UNIQUE,
  "passwordResetCreatedAt" TEXT NULL,
) STRICT;
CREATE INDEX "index_users_emailVerificationNonce" ON "users" ("emailVerificationNonce");
CREATE INDEX "index_users_passwordResetNonce" ON "users" ("passwordResetNonce");
CREATE VIRTUAL TABLE "search_users_nameSearch" USING fts5(
  content = "users",
  content_rowid = "id",
  "nameSearch",
  tokenize = 'porter'
);
CREATE TRIGGER "search_users_nameSearch_insert" AFTER INSERT ON "users" BEGIN
  INSERT INTO "search_users_nameSearch" ("rowid", "nameSearch") VALUES ("new"."id", "new"."nameSearch");
END;
CREATE TRIGGER "search_users_nameSearch_update" AFTER UPDATE ON "users" BEGIN
  UPDATE "search_users_nameSearch" SET "search_users_nameSearch"."nameSearch" = "new"."nameSearch" WHERE "search_users_nameSearch"."rowid" = "new"."id";
END;
CREATE TRIGGER "search_users_nameSearch_delete" AFTER DELETE ON "users" BEGIN
  DELETE FROM "search_users_nameSearch" WHERE "search_users_nameSearch"."rowid" = "old"."id";
END;

------------------------------------------------

DROP TABLE "old_users";