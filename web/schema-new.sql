ALTER TABLE "users" RENAME TO "old_users";
DROP TABLE "emailVerifications";
DROP TABLE "passwordResets";
DROP TABLE "usersNameSearchIndex";
CREATE TABLE "users" (
  "emailVerificationNonce" TEXT NULL UNIQUE,
  "emailVerificationCreatedAt" TEXT NULL,
  "passwordResetNonce" TEXT NULL UNIQUE,
  "passwordResetCreatedAt" TEXT NULL,
) STRICT;
CREATE INDEX "index_users_emailVerificationNonce" ON "users" ("emailVerificationNonce");
CREATE INDEX "index_users_passwordResetNonce" ON "users" ("passwordResetNonce");
CREATE VIRTUAL TABLE "index_users_nameSearch" USING fts5(
  content = "users",
  content_rowid = "id",
  "nameSearch",
  tokenize = 'porter'
);

------------------------------------------------

DROP TABLE "old_users";