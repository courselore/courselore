import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import html from "@leafac/html";
import argon2 from "argon2";
import casual from "casual";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import cryptoRandomString from "crypto-random-string";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  if (!application.configuration.demonstration) return;

  application.web.post<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/demonstration-data",
    asyncHandler(async (request, response) => {
      const password = await argon2.hash(
        "courselore",
        application.web.locals.configuration.argon2,
      );
      const avatarIndices = lodash.shuffle(lodash.range(250));
      const users = lodash.times(151, (userIndex) => {
        const name = casual.full_name;
        const biographySource = casual.sentences(lodash.random(5, 7));
        const isEmailNotificationsForNone = Math.random() < 0.1;
        const isEmailNotificationsForMentions =
          !isEmailNotificationsForNone && Math.random() < 0.8;
        const isEmailNotificationsForMessagesInConversationsInWhichYouParticipated =
          !isEmailNotificationsForNone && Math.random() < 0.8;
        const isEmailNotificationsForMessagesInConversationsYouStarted =
          isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ||
          (!isEmailNotificationsForNone && Math.random() < 0.8);
        const isEmailNotificationsForAllMessages =
          isEmailNotificationsForMentions &&
          isEmailNotificationsForMessagesInConversationsInWhichYouParticipated &&
          isEmailNotificationsForMessagesInConversationsYouStarted &&
          Math.random() < 0.3
            ? lodash.sample(
                application.web.locals.helpers
                  .userEmailNotificationsForAllMessageses,
              )!
            : "none";
        const hour = new Date();
        hour.setUTCMinutes(0, 0, 0);
        const day = new Date();
        day.setUTCHours(0, 0, 0, 0);
        return application.database.get<{
          id: number;
          email: string;
          name: string;
        }>(
          sql`
            SELECT * FROM "users" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "users" (
                    "createdAt",
                    "lastSeenOnlineAt",
                    "reference",
                    "email",
                    "password",
                    "emailVerifiedAt",
                    "name",
                    "nameSearch",
                    "avatar",
                    "avatarlessBackgroundColor",
                    "biographySource",
                    "biographyPreprocessed",
                    "systemRole",
                    "emailNotificationsForAllMessages",
                    "emailNotificationsForAllMessagesDigestDeliveredAt",
                    "emailNotificationsForMentionsAt",
                    "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
                    "emailNotificationsForMessagesInConversationsYouStartedAt",
                    "preferContentEditorProgrammerModeAt",
                    "preferContentEditorToolbarInCompactAt",
                    "preferAnonymousAt",
                    "latestNewsVersion"
                  )
                  VALUES (
                    ${new Date().toISOString()},
                    ${new Date(
                      Date.now() -
                        (Math.random() < 0.5
                          ? 0
                          : lodash.random(0, 5 * 60 * 60 * 1000)),
                    ).toISOString()},
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${`${slugify(name)}--${cryptoRandomString({
                      length: 5,
                      type: "numeric",
                    })}@courselore.org`},
                    ${password},
                    ${new Date().toISOString()},
                    ${name},
                    ${html`${name}`},
                    ${
                      Math.random() < 0.6
                        ? `https://${
                            application.configuration.hostname
                          }/node_modules/fake-avatars/avatars/webp/${avatarIndices.shift()}.webp`
                        : null
                    },
                    ${lodash.sample(
                      application.web.locals.helpers
                        .userAvatarlessBackgroundColors,
                    )!},
                    ${biographySource},
                    ${
                      application.web.locals.partials.contentPreprocessed(
                        biographySource,
                      ).contentPreprocessed
                    },
                    ${
                      application.configuration.hostname ===
                      application.addresses.tryHostname
                        ? "none"
                        : userIndex === 0
                          ? "administrator"
                          : Math.random() < 0.1
                            ? "administrator"
                            : Math.random() < 0.3
                              ? "course-staff"
                              : "none"
                    },
                    ${isEmailNotificationsForAllMessages},
                    ${
                      isEmailNotificationsForAllMessages === "hourly-digests"
                        ? hour.toISOString()
                        : isEmailNotificationsForAllMessages === "daily-digests"
                          ? day.toISOString()
                          : null
                    },
                    ${
                      isEmailNotificationsForMentions
                        ? new Date().toISOString()
                        : null
                    },
                    ${
                      isEmailNotificationsForMessagesInConversationsInWhichYouParticipated
                        ? new Date().toISOString()
                        : null
                    },
                    ${
                      isEmailNotificationsForMessagesInConversationsYouStarted
                        ? new Date().toISOString()
                        : null
                    },
                    ${Math.random() < 0.5 ? new Date().toISOString() : null},
                    ${Math.random() < 0.5 ? new Date().toISOString() : null},
                    ${Math.random() < 0.5 ? new Date().toISOString() : null},
                    ${application.version}
                  )
                `,
              ).lastInsertRowid
            }
          `,
        )!;
      });
      const demonstrationUser = response.locals.user ?? users.shift()!;

      const year = new Date().getFullYear().toString();
      const month = new Date().getMonth() + 1;
      const term = month < 4 || month > 9 ? "Spring" : "Fall";
      const institution = "Johns Hopkins University";
      for (const {
        name,
        code,
        courseRole,
        accentColor,
        courseParticipantsUsers,
        isArchived,
      } of [
        {
          name: "Principles of Programming Languages",
          code: "CS 601.426",
          courseRole: application.web.locals.helpers.courseRoles[1],
          accentColor:
            application.web.locals.helpers.courseParticipantAccentColors[0],
          courseParticipantsUsers: users.slice(0, 100),
        },
        {
          name: "Music Theory",
          code: "MU 401.324",
          courseRole: application.web.locals.helpers.courseRoles[0],
          accentColor:
            application.web.locals.helpers.courseParticipantAccentColors[1],
          courseParticipantsUsers: users.slice(25, 125),
        },
        {
          name: "Object-Oriented Software Engineering",
          code: "EN 601.421",
          courseRole: application.web.locals.helpers.courseRoles[1],
          accentColor:
            application.web.locals.helpers.courseParticipantAccentColors[2],
          courseParticipantsUsers: users.slice(50, 150),
          isArchived: true,
        },
      ].reverse()) {
        const course = application.database.get<{
          id: number;
          reference: string;
          nextConversationReference: number;
        }>(
          sql`
            SELECT * FROM "courses" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "courses" (
                    "createdAt",
                    "reference",
                    "archivedAt",
                    "name",
                    "year",
                    "term",
                    "institution",
                    "code",      
                    "nextConversationReference",
                    "studentsMayCreatePollsAt"
                  )
                  VALUES (
                    ${new Date().toISOString()},
                    ${cryptoRandomString({ length: 10, type: "numeric" })},
                    ${isArchived ? new Date().toISOString() : null},
                    ${name},
                    ${year},
                    ${term},
                    ${institution},
                    ${code},
                    ${lodash.random(30, 50)},
                    ${Math.random() < 0.5 ? new Date().toISOString() : null}
                  )
                `,
              ).lastInsertRowid
            }
          `,
        )!;

        const courseParticipant = application.database.get<{
          id: number;
          reference: string;
          courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        }>(
          sql`
            SELECT * FROM "courseParticipants" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "courseParticipants" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
                  VALUES (
                    ${new Date().toISOString()},
                    ${demonstrationUser.id},
                    ${course.id},
                    ${cryptoRandomString({ length: 10, type: "numeric" })},
                    ${courseRole},
                    ${accentColor}
                  )
                `,
              ).lastInsertRowid
            }
          `,
        )!;

        for (const _ of lodash.times(20)) {
          const expiresAt =
            Math.random() < 0.3
              ? new Date(
                  new Date(
                    Date.now() +
                      lodash.random(
                        -30 * 24 * 60 * 60 * 1000,
                        30 * 24 * 60 * 60 * 1000,
                      ),
                  ).setUTCSeconds(0, 0),
                ).toISOString()
              : null;
          const user = Math.random() < 0.5 ? lodash.sample(users)! : null;
          const name =
            user !== null
              ? Math.random() < 0.7
                ? user.name
                : null
              : Math.random() < 0.5
                ? casual.full_name
                : null;
          const email =
            user !== null
              ? name !== null || Math.random() < 0.7
                ? user.email
                : null
              : name !== null || Math.random() < 0.5
                ? `${slugify(name ?? casual.full_name)}--${cryptoRandomString({
                    length: 5,
                    type: "numeric",
                  })}@courselore.org`
                : null;
          application.database.run(
            sql`
              INSERT INTO "invitations" (
                "createdAt",
                "expiresAt",
                "usedAt",
                "course",
                "reference",
                "email",
                "name",
                "courseRole"
              )
              VALUES (
                ${new Date().toISOString()},
                ${expiresAt},
                ${
                  email === null || Math.random() < 0.4
                    ? null
                    : new Date(
                        (expiresAt === null
                          ? Date.now()
                          : Math.min(
                              Date.now(),
                              new Date(expiresAt).getTime(),
                            )) - lodash.random(20 * 24 * 60 * 60 * 1000),
                      ).toISOString()
                },
                ${course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${email},
                ${name},
                ${
                  application.web.locals.helpers.courseRoles[
                    Math.random() < 0.1 ? 1 : 0
                  ]
                }
              )
            `,
          );
        }

        const courseParticipants = [
          courseParticipant,
          ...courseParticipantsUsers.map(
            (courseParticipantUser) =>
              application.database.get<{
                id: number;
                reference: string;
                courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
              }>(
                sql`
                  SELECT * FROM "courseParticipants" WHERE "id" = ${
                    application.database.run(
                      sql`
                        INSERT INTO "courseParticipants" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
                        VALUES (
                          ${new Date().toISOString()},
                          ${courseParticipantUser.id},
                          ${course.id},
                          ${cryptoRandomString({
                            length: 10,
                            type: "numeric",
                          })},
                          ${
                            application.web.locals.helpers.courseRoles[
                              Math.random() < 0.1 ? 1 : 0
                            ]
                          },
                          ${lodash.sample(
                            application.web.locals.helpers
                              .courseParticipantAccentColors,
                          )!}
                        )
                      `,
                    ).lastInsertRowid
                  }
                `,
              )!,
          ),
        ];
        const courseStaff = courseParticipants.filter(
          (courseParticipant) =>
            courseParticipant.courseRole === "course-staff",
        );
        const students = courseParticipants.filter(
          (courseParticipant) => courseParticipant.courseRole === "student",
        );

        const tags: { id: number }[] = [
          { name: "Assignment 1", courseStaffOnlyAt: null },
          { name: "Assignment 2", courseStaffOnlyAt: null },
          { name: "Assignment 3", courseStaffOnlyAt: null },
          { name: "Assignment 4", courseStaffOnlyAt: null },
          { name: "Assignment 5", courseStaffOnlyAt: null },
          { name: "Assignment 6", courseStaffOnlyAt: null },
          { name: "Assignment 7", courseStaffOnlyAt: null },
          { name: "Assignment 8", courseStaffOnlyAt: null },
          { name: "Assignment 9", courseStaffOnlyAt: null },
          { name: "Assignment 10", courseStaffOnlyAt: null },
          {
            name: "Change for Next Year",
            courseStaffOnlyAt: new Date().toISOString(),
          },
          {
            name: "Duplicate Question",
            courseStaffOnlyAt: new Date().toISOString(),
          },
        ].map(
          ({ name, courseStaffOnlyAt }, order) =>
            application.database.get<{ id: number }>(
              sql`
                SELECT * FROM "tags" WHERE "id" = ${
                  application.database.run(
                    sql`
                      INSERT INTO "tags" ("createdAt", "course", "reference", "order", "name", "courseStaffOnlyAt")
                      VALUES (
                        ${new Date().toISOString()},
                        ${course.id},
                        ${cryptoRandomString({ length: 10, type: "numeric" })},
                        ${order},
                        ${name},
                        ${courseStaffOnlyAt}
                      )
                    `,
                  ).lastInsertRowid
                }
              `,
            )!,
        );

        const conversationCreatedAts = [
          new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        ];
        for (
          let conversationReference = 2;
          conversationReference < course.nextConversationReference;
          conversationReference++
        )
          conversationCreatedAts.unshift(
            new Date(
              new Date(conversationCreatedAts[0]).getTime() -
                lodash.random(6 * 60 * 60 * 1000, 2 * 24 * 60 * 60 * 1000),
            ).toISOString(),
          );

        const pollSingleChoice = application.database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            SELECT * FROM "messagePolls" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "messagePolls" (
                    "createdAt",
                    "course",
                    "reference",
                    "authorCourseParticipant",
                    "multipleChoicesAt",
                    "closesAt"
                  )
                  VALUES (
                    ${conversationCreatedAts[0]},
                    ${course.id},
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${courseParticipant.id},
                    ${null},
                    ${null}
                  )
                `,
              ).lastInsertRowid
            }
          `,
        )!;

        const pollSingleChoiceOptions: { id: number }[] = [];
        for (const order of new Array(lodash.random(4, 7)).keys()) {
          const contentSource = casual.sentences(lodash.random(1, 2));
          pollSingleChoiceOptions.push(
            application.database.get<{ id: number }>(
              sql`
                SELECT * FROM "messagePollOptions" WHERE "id" = ${
                  application.database.run(
                    sql`
                      INSERT INTO "messagePollOptions" (
                        "createdAt",
                        "messagePoll",
                        "reference",
                        "order",
                        "contentSource",
                        "contentPreprocessed"
                      )
                      VALUES (
                        ${conversationCreatedAts[0]},
                        ${pollSingleChoice.id},
                        ${cryptoRandomString({ length: 20, type: "numeric" })},
                        ${order},
                        ${contentSource},
                        ${
                          application.web.locals.partials.contentPreprocessed(
                            contentSource,
                          ).contentPreprocessed
                        }
                      )
                    `,
                  ).lastInsertRowid
                }
              `,
            )!,
          );
        }

        for (const courseParticipant of lodash.sampleSize(
          [
            ...courseParticipants,
            ...new Array(Math.floor(courseParticipants.length * 0.2)).fill(
              null,
            ),
          ],
          lodash.random(0, 50),
        ))
          application.database.run(
            sql`
              INSERT INTO "messagePollVotes" (
                "createdAt",
                "messagePollOption",
                "courseParticipant"
              )
              VALUES (
                ${new Date(
                  new Date(conversationCreatedAts[0]).getTime() +
                    lodash.random(60 * 1000, 12 * 60 * 60 * 1000),
                ).toISOString()},
                ${lodash.sample(pollSingleChoiceOptions)!.id},
                ${courseParticipant?.id}
              )
            `,
          );

        const pollMultipleChoice = application.database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            SELECT * FROM "messagePolls" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "messagePolls" (
                    "createdAt",
                    "course",
                    "reference",
                    "authorCourseParticipant",
                    "multipleChoicesAt",
                    "closesAt"
                  )
                  VALUES (
                    ${conversationCreatedAts[0]},
                    ${course.id},
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${courseParticipant.id},
                    ${new Date().toISOString()},
                    ${new Date(
                      new Date(
                        Date.now() +
                          lodash.random(
                            -24 * 60 * 60 * 1000,
                            24 * 60 * 60 * 1000,
                          ),
                      ).setUTCSeconds(0, 0),
                    ).toISOString()}
                  )
                `,
              ).lastInsertRowid
            }
          `,
        )!;

        const pollMultipleChoiceOptions: { id: number }[] = [];
        for (const order of new Array(lodash.random(4, 7)).keys()) {
          const contentSource = casual.sentences(lodash.random(1, 2));
          pollMultipleChoiceOptions.push(
            application.database.get<{ id: number }>(
              sql`
                SELECT * FROM "messagePollOptions" WHERE "id" = ${
                  application.database.run(
                    sql`
                      INSERT INTO "messagePollOptions" (
                        "createdAt",
                        "messagePoll",
                        "reference",
                        "order",
                        "contentSource",
                        "contentPreprocessed"
                      )
                      VALUES (
                        ${conversationCreatedAts[0]},
                        ${pollMultipleChoice.id},
                        ${cryptoRandomString({ length: 20, type: "numeric" })},
                        ${order},
                        ${contentSource},
                        ${
                          application.web.locals.partials.contentPreprocessed(
                            contentSource,
                          ).contentPreprocessed
                        }
                      )
                    `,
                  ).lastInsertRowid
                }
              `,
            )!,
          );
        }

        for (const courseParticipant of lodash.sampleSize(
          [
            ...courseParticipants,
            ...new Array(Math.floor(courseParticipants.length * 0.2)).fill(
              null,
            ),
          ],
          lodash.random(0, 50),
        ))
          for (const option of lodash.sampleSize(
            pollMultipleChoiceOptions,
            lodash.random(1, pollMultipleChoiceOptions.length),
          ))
            application.database.run(
              sql`
                INSERT INTO "messagePollVotes" (
                  "createdAt",
                  "messagePollOption",
                  "courseParticipant"
                )
                VALUES (
                  ${new Date(
                    new Date(conversationCreatedAts[0]).getTime() +
                      lodash.random(60 * 1000, 12 * 60 * 60 * 1000),
                  ).toISOString()},
                  ${option.id},
                  ${courseParticipant?.id}
                )
              `,
            );

        const exampleOfAllFeaturesInRichTextMessages = `
**Edit to see source**

# Headings

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

# Heading 1

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

## Heading 2

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

### Heading 3

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

#### Heading 4

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

##### Heading 5

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

###### Heading 6

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

# Separator

${casual.sentences(lodash.random(5, 10))}

---

${casual.sentences(lodash.random(5, 10))}

# Inline

**Bold**, _italics_, <u>underline</u>, ~~strikethrough~~, [link](https://courselore.org), www.example.com, https://example.com, contact@example.com, $E=mc^2$, \`code\`, <ins>insertion</ins>, ~~deletion~~ (~one tilde~), <sup>superscript</sup>, <sub>subscript</sub>, and a line  
break.

# Image

![Image](https://${
          application.configuration.hostname
        }/node_modules/fake-avatars/avatars/webp/1.webp)

# Animated GIF

[<video src="https://${
          application.configuration.hostname
        }/demonstration/video.mp4"></video>](https://${
          application.configuration.hostname
        }/demonstration/video.mp4)

# Video

<video src="https://${
          application.configuration.hostname
        }/demonstration/video.mp4"></video>

# Image/Video Proxy

![Proxied image](https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg)

<video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>

# Polls

<courselore-poll reference="${pollSingleChoice.reference}"></courselore-poll>

<courselore-poll reference="${pollMultipleChoice.reference}"></courselore-poll>

# Lists

- Banana
- Pyjamas
- Phone

---

${lodash
  .times(
    lodash.random(3, 6),
    () =>
      `- ${lodash
        .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
        .join("\n\n  ")}`,
  )
  .join("\n\n")}

---

1. Banana
2. Pyjamas
3. Phone

---

${lodash
  .times(
    lodash.random(3, 6),
    (index) =>
      `${index + 1}. ${lodash
        .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
        .join("\n\n   ")}`,
  )
  .join("\n\n")}

---

${lodash
  .times(
    lodash.random(4, 8),
    () =>
      `- [${Math.random() < 0.5 ? " " : "x"}] ${casual.sentences(
        lodash.random(1, 6),
      )}`,
  )
  .join("\n")}

# Blockquote

${lodash
  .times(
    lodash.random(3, 6),
    () =>
      `> ${lodash
        .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
        .join("\n> ")}`,
  )
  .join("\n>\n")}

# Table

| Left-aligned | Center-aligned | Right-aligned |
| :---         |     :---:      |          ---: |
| git status   | git status     | git status    |
| git diff     | git diff       | git diff      |

| Left-aligned | Center-aligned | Right-aligned | Left-aligned | Center-aligned | Right-aligned | Left-aligned | Center-aligned | Right-aligned |
| :---         |     :---:      |          ---: | :---         |     :---:      |          ---: | :---         |     :---:      |          ---: |
| git status   | git status     | git status    | git status   | git status     | git status    | git status   | git status     | git status    |
| git diff     | git diff       | git diff      | git diff     | git diff       | git diff      | git diff     | git diff       | git diff      |

# Details

<details>
<summary>Example of details with summary</summary>

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

</details>

<details>

${lodash
  .times(lodash.random(1, 6), () => casual.sentences(lodash.random(1, 6)))
  .join("\n\n")}

</details>

# Footnotes

Footnote[^1] and another.[^2]

[^1]: ${casual.sentences(lodash.random(1, 6))}

[^2]: ${casual.sentences(lodash.random(1, 6))}

# Cross-Site Scripting

👍<script>document.write("💩");</script>🙌

# Mathematics

$\\displaystyle \\frac{1}{\\Bigl(\\sqrt{\\phi \\sqrt{5}}-\\phi\\Bigr) e^{\\frac25 \\pi}} = 1+\\frac{e^{-2\\pi}} {1+\\frac{e^{-4\\pi}} {1+\\frac{e^{-6\\pi}} {1+\\frac{e^{-8\\pi}} {1+\\cdots} } } }$

Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
equation.

$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$

A raw dollar sign: \\$

$$
\\invalidMacro
$$

Prevent large width/height visual affronts:

$$
\\rule{500em}{500em}
$$

# Syntax Highlighting

\`\`\`javascript
for (let orderIndex = 2; orderIndex <= order; orderIndex++) {
  const upperLeft = [];
  const lowerLeft = [];
  const lowerRight = [];
  const upperRight = [];
  for (const [x, y] of points) {
    upperLeft.push([y / 2, x / 2]);
    lowerLeft.push([x / 2, y / 2 + 1 / 2]);
    lowerRight.push([x / 2 + 1 / 2, y / 2 + 1 / 2]);
    upperRight.push([(1 - y) / 2 + 1 / 2, (1 - x) / 2]);
  }
  points = [...upperLeft, ...lowerLeft, ...lowerRight, ...upperRight];
}
\`\`\`

\`\`\`
  L          TE
    A       A
      C    V
        R A
        DOU
        LOU
      REUSE
      QUE TU
      PORTES
    ET QUI T'
    ORNE O CI
      VILISÉ
    OTE-  TU VEUX
      LA    BIEN
    SI      RESPI
            RER       - Apollinaire
\`\`\`

<pre>
  L          TE
    A       A
      C    V
        R A
        DOU
        LOU
      REUSE
      QUE TU
      PORTES
    ET QUI T'
    ORNE O CI
      VILISÉ
    OTE-  TU VEUX
      LA    BIEN
    SI      RESPI
            RER       - Apollinaire
</pre>

# \`@mentions\`

Self: @${courseParticipant.reference}

Other: @${lodash.sample(courseParticipants)!.reference}

Non-existent: @1571024857

Course roles: @everyone, @course-staff, @students

# \`#references\`

Conversation self: #1

Conversation other: #2

Conversation non-existent: #14981039481

Conversation permanent link turned reference: <https://${
          application.configuration.hostname
        }/courses/${course.reference}/conversations/1>

Conversation non-existent permanent link turned reference: <https://${
          application.configuration.hostname
        }/courses/${course.reference}/conversations/14981039481>

Message self: #1/1

Message other: #2/1

Message non-existent: #1/2

Message permanent link turned reference: <https://${
          application.configuration.hostname
        }/courses/${
          course.reference
        }/conversations/1?messages%5BmessageReference%5D=1>

Message non-existent permanent link turned reference: <https://${
          application.configuration.hostname
        }/courses/${
          course.reference
        }/conversations/1?messages%5BmessageReference%5D=2>
`;

        for (
          let conversationReference = 1;
          conversationReference < course.nextConversationReference;
          conversationReference++
        ) {
          const isExampleOfAllFeaturesInRichTextMessages =
            conversationReference === 1;
          const conversationCreatedAt =
            conversationCreatedAts[conversationReference - 1];
          const participants = isExampleOfAllFeaturesInRichTextMessages
            ? "everyone"
            : Math.random() < 0.5
              ? "everyone"
              : lodash.sample(
                  application.web.locals.helpers.conversationParticipantses,
                )!;
          const selectedParticipantCourseParticipants = lodash.uniq(
            participants === "everyone"
              ? []
              : participants === "course-staff"
                ? [
                    ...(courseParticipant.courseRole === "course-staff"
                      ? []
                      : Math.random() < 0.5
                        ? [courseParticipant]
                        : []),
                    ...lodash.sampleSize(students, lodash.random(0, 10)),
                  ]
                : participants === "selected-participants"
                  ? [
                      ...(Math.random() < 0.5 ? [courseParticipant] : []),
                      ...lodash.sampleSize(
                        courseParticipants,
                        lodash.random(2, 10),
                      ),
                    ]
                  : [],
          );
          const participantCourseParticipants = lodash.uniq([
            ...(participants === "everyone"
              ? courseParticipants
              : participants === "course-staff"
                ? courseStaff
                : participants === "selected-participants"
                  ? []
                  : []),
            ...selectedParticipantCourseParticipants,
          ]);
          const conversationConversationParticipant =
            Math.random() < 0.9
              ? lodash.sample(participantCourseParticipants)!
              : null;
          const type = isExampleOfAllFeaturesInRichTextMessages
            ? application.web.locals.helpers.conversationTypes[1]
            : application.web.locals.helpers.conversationTypes[
                Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2
              ];
          const title = isExampleOfAllFeaturesInRichTextMessages
            ? `Example of All Features in Rich-Text Messages`
            : `${lodash.capitalize(casual.words(lodash.random(3, 9)))}${
                type === "question" ? "?" : ""
              }`;
          const nextMessageReference = isExampleOfAllFeaturesInRichTextMessages
            ? 2
            : type === "chat"
              ? lodash.random(50, 100)
              : lodash.random(2, 30);
          const messageCreatedAts = [conversationCreatedAt];
          for (
            let messageReference = 1;
            messageReference < nextMessageReference;
            messageReference++
          )
            messageCreatedAts.push(
              new Date(
                Math.min(
                  Date.now(),
                  new Date(messageCreatedAts.at(-1)!).getTime() +
                    lodash.random(12 * 60 * 60 * 1000),
                ),
              ).toISOString(),
            );
          const conversation = application.database.get<{
            id: number;
            courseParticipant: number | null;
            participants: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
            anonymousAt: string | null;
            type: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
            title: string;
          }>(
            sql`
              SELECT * FROM "conversations" WHERE "id" = ${
                application.database.run(
                  sql`
                    INSERT INTO "conversations" (
                      "createdAt",
                      "updatedAt",
                      "course",
                      "reference",
                      "authorCourseParticipant",
                      "participants",
                      "anonymousAt",
                      "type",
                      "resolvedAt",
                      "announcementAt",
                      "pinnedAt",
                      "title",
                      "titleSearch",
                      "nextMessageReference"
                    )
                    VALUES (
                      ${conversationCreatedAt},
                      ${messageCreatedAts.at(-1)},
                      ${course.id},
                      ${String(conversationReference)},
                      ${conversationConversationParticipant?.id},
                      ${participants},
                      ${
                        conversationConversationParticipant?.courseRole ===
                          "student" && Math.random() < 0.5
                          ? new Date().toISOString()
                          : null
                      },
                      ${type},
                      ${
                        type === "question" && Math.random() < 0.75
                          ? new Date().toISOString()
                          : null
                      },
                      ${
                        conversationConversationParticipant?.courseRole ===
                          "course-staff" &&
                        type === "note" &&
                        Math.random() < 0.5
                          ? new Date().toISOString()
                          : null
                      },
                      ${
                        isExampleOfAllFeaturesInRichTextMessages
                          ? null
                          : Math.random() < 0.15
                            ? new Date().toISOString()
                            : null
                      },
                      ${title},
                      ${html`${title}`},
                      ${nextMessageReference}
                    )
                  `,
                ).lastInsertRowid
              }
            `,
          )!;

          for (const courseParticipant of selectedParticipantCourseParticipants)
            application.database.run(
              sql`
                INSERT INTO "conversationSelectedParticipants" ("createdAt", "conversation", "courseParticipant")
                VALUES (
                  ${new Date().toISOString()},
                  ${conversation.id},
                  ${courseParticipant.id}
                )
              `,
            );

          application.database.run(
            sql`
              INSERT INTO "taggings" ("createdAt", "conversation", "tag")
              VALUES (
                ${new Date().toISOString()},
                ${conversation.id},
                ${lodash.sample(tags)!.id}
              )
            `,
          );

          for (
            let messageReference = 1;
            messageReference < nextMessageReference;
            messageReference++
          ) {
            const messageCreatedAt = messageCreatedAts[messageReference - 1];
            const messageConversationParticipant =
              messageReference === 1
                ? conversationConversationParticipant
                : Math.random() < 0.05
                  ? null
                  : lodash.sample(participantCourseParticipants)!;
            const contentSource = isExampleOfAllFeaturesInRichTextMessages
              ? exampleOfAllFeaturesInRichTextMessages
              : type === "chat" && Math.random() < 0.9
                ? casual.sentences(lodash.random(1, 2))
                : lodash
                    .times(lodash.random(1, 6), () =>
                      casual.sentences(lodash.random(1, 6)),
                    )
                    .join("\n\n");
            const contentPreprocessed =
              application.web.locals.partials.contentPreprocessed(
                contentSource,
              );
            const message = application.database.get<{ id: number }>(
              sql`
                SELECT * FROM "messages" WHERE "id" = ${
                  application.database.run(
                    sql`
                      INSERT INTO "messages" (
                        "createdAt",
                        "updatedAt",
                        "conversation",
                        "reference",
                        "authorCourseParticipant",
                        "anonymousAt",
                        "type",
                        "contentSource",
                        "contentPreprocessed",
                        "contentSearch"
                      )
                      VALUES (
                        ${messageCreatedAt},
                        ${
                          Math.random() < 0.8
                            ? null
                            : new Date(
                                Math.min(
                                  Date.now(),
                                  new Date(messageCreatedAt).getTime() +
                                    lodash.random(
                                      5 * 60 * 60 * 1000,
                                      18 * 60 * 60 * 1000,
                                    ),
                                ),
                              ).toISOString()
                        },
                        ${conversation.id},
                        ${String(messageReference)},
                        ${messageConversationParticipant?.id},
                        ${
                          messageReference === 1
                            ? conversation.anonymousAt
                            : messageConversationParticipant?.courseRole ===
                                  "student" && Math.random() < 0.5
                              ? new Date().toISOString()
                              : null
                        },
                        ${
                          conversation.type === "question" &&
                          Math.random() < 0.5
                            ? "answer"
                            : conversation.type === "question" &&
                                messageConversationParticipant?.courseRole !==
                                  "course-staff" &&
                                Math.random() < 0.5
                              ? "follow-up-question"
                              : conversation.type !== "chat" &&
                                  messageConversationParticipant?.courseRole !==
                                    "student" &&
                                  Math.random() < 0.1
                                ? "course-staff-whisper"
                                : "message"
                        },
                        ${contentSource},
                        ${contentPreprocessed.contentPreprocessed},
                        ${contentPreprocessed.contentSearch}
                      )
                    `,
                  ).lastInsertRowid
                }
              `,
            )!;

            let readingCreatedAt = messageCreatedAt;
            for (const courseParticipant of lodash.sampleSize(
              participantCourseParticipants,
              lodash.random(1, participantCourseParticipants.length),
            )) {
              readingCreatedAt = new Date(
                Math.min(
                  Date.now(),
                  new Date(readingCreatedAt).getTime() +
                    lodash.random(12 * 60 * 60 * 1000),
                ),
              ).toISOString();
              application.database.run(
                sql`
                  INSERT INTO "readings" ("createdAt", "message", "courseParticipant")
                  VALUES (
                    ${readingCreatedAt},
                    ${message.id},
                    ${courseParticipant.id}
                  )
                `,
              );
            }

            for (const courseParticipant of lodash.sampleSize(
              lodash.intersection(courseStaff, participantCourseParticipants),
              Math.random() < 0.8 ? 0 : lodash.random(2),
            ))
              application.database.run(
                sql`
                  INSERT INTO "endorsements" ("createdAt", "message", "courseParticipant")
                  VALUES (
                    ${new Date().toISOString()},
                    ${message.id},
                    ${courseParticipant.id}
                  )
                `,
              );

            for (const courseParticipant of lodash.sampleSize(
              participantCourseParticipants,
              Math.random() < (conversation.type === "chat" ? 0.9 : 0.5)
                ? 0
                : lodash.random(5),
            ))
              application.database.run(
                sql`
                  INSERT INTO "likes" ("createdAt", "message", "courseParticipant")
                  VALUES (
                    ${new Date().toISOString()},
                    ${message.id},
                    ${courseParticipant.id}
                  )
                `,
              );
          }
        }
      }

      if (response.locals.user === undefined)
        application.web.locals.helpers.Session.open({
          request,
          response,
          userId: demonstrationUser.id,
        });

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          Demonstration data, including users, courses, conversations, and so
          forth, have been created and you’ve been signed in as a demonstration
          user to see what Courselore looks like in use. If you wish to sign in
          as another one of the demonstration users, their password is
          “courselore”.
        `,
      });
      response.redirect(303, `https://${application.configuration.hostname}`);
    }),
  );
};
