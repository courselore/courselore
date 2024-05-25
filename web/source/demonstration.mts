import argon2 from "argon2";
import casual from "casual";
import cryptoRandomString from "crypto-random-string";
import sql from "@radically-straightforward/sqlite";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  if (application.configuration.environment === "development")
    application.server?.push({
      method: "POST",
      pathname: "/demonstration",
      handler: async (request, response) => {
        const users = new Array<{
          id: number;
          email: string;
          name: string;
        }>();
        for (let userIndex = 0; userIndex < 151; userIndex++) {
          const name = casual.full_name;
          users.push(
            application.database.get<{
              id: number;
              email: string;
              name: string;
            }>(
              sql`
                SELECT * FROM "users" WHERE "id" = ${
                  application.database.run(
                    sql`
                      INSERT INTO "users" (
                        "externalIdentifier",
                        "createdAt",
                        "name",
                        "nameSearch",
                        "email",
                        "emailVerified",
                        "password",
                        "avatarlessBackgroundColor",
                        "avatar",
                        "systemRole",
                        "lastSeenOnlineAt",
                        "emailNotificationsForAllMessages",
                        "emailNotificationsForMessagesIncludingMentions",
                        "emailNotificationsForMessagesInConversationsYouStarted",
                        "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                        "contentEditorProgrammerMode",
                        "anonymous"
                      )
                      VALUES (
                        ${cryptoRandomString({ length: 20, type: "numeric" })},
                        ${new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()},
                        ${name},
                        ${name},
                        ${`${name.replaceAll(/[^A-Za-z]/, "-").toLowerCase()}--${cryptoRandomString({ length: 3, type: "numeric" })}@courselore.org`},
                        ${Number(true)},
                        ${await argon2.hash(
                          "courselore",
                          application.configuration.argon2,
                        )},
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
                            ? new URL(
                                `/node_modules/fake-avatars/avatars/webp/${Math.floor(Math.random() * 263)}.webp`,
                                request.URL,
                              ).href
                            : null
                        },
                        ${userIndex === 0 || Math.random() < 0.05 ? "system-administrator" : Math.random() < 0.2 ? "system-staff" : "system-user"},
                        ${new Date(Date.now() - Math.floor(Math.random() * 24 * 60 * 60 * 1000)).toISOString()},
                        ${Math.random() < 0.1},
                        ${Math.random() < 0.9},
                        ${Math.random() < 0.9},
                        ${Math.random() < 0.9},
                        ${Math.random() < 0.1},
                        ${Math.random() < 0.8}
                      )
                    `,
                  ).lastInsertRowid
                }
              `,
            )!,
          );
        }
        const demonstrationUser = users.shift()!;
      },
    });
};
