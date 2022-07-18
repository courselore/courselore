import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { html } from "@leafac/html";
import argon2 from "argon2";
import casual from "casual";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import cryptoRandomString from "crypto-random-string";
import {
  Courselore,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  userAvatarlessBackgroundColors,
  userEmailNotificationsDigestsFrequencies,
  CourseRole,
  courseRoles,
  enrollmentAccentColors,
  ConversationType,
  conversationTypes,
} from "./index.js";

export type DemonstrationHandler = express.RequestHandler<
  {},
  any,
  {},
  {},
  IsSignedOutMiddlewareLocals & Partial<IsSignedInMiddlewareLocals>
>;

export default (app: Courselore): void => {
  if (!app.locals.options.demonstration) return;

  app.locals.handlers.demonstration = asyncHandler(async (req, res) => {
    const password = await argon2.hash("courselore", app.locals.options.argon2);
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
      return app.locals.database.get<{
        id: number;
        email: string;
        name: string;
      }>(
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
            "emailNotificationsForAllMessagesAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt",
            "emailNotificationsDigestsFrequency"
          )
          VALUES (
            ${new Date().toISOString()},
            ${new Date(
              Date.now() -
                (Math.random() < 0.5 ? 0 : lodash.random(0, 5 * 60 * 60 * 1000))
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
                    app.locals.options.host
                  }/node_modules/fake-avatars/avatars/${avatarIndices.shift()}.png`
                : null
            },
            ${lodash.sample(userAvatarlessBackgroundColors)},
            ${biographySource},
            ${
              app.locals.partials.content({
                req,
                res,
                type: "source",
                content: biographySource,
              }).preprocessed
            },
            ${
              app.locals.options.host === app.locals.options.tryHost
                ? "none"
                : userIndex === 0 || Math.random() < 0.1
                ? "administrator"
                : Math.random() < 0.3
                ? "staff"
                : "none"
            },
            ${
              isEmailNotificationsForMentions &&
              isEmailNotificationsForMessagesInConversationsInWhichYouParticipated &&
              isEmailNotificationsForMessagesInConversationsYouStarted &&
              Math.random() < 0.3
                ? new Date().toISOString()
                : null
            },
            ${
              isEmailNotificationsForMentions ? new Date().toISOString() : null
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
            ${
              (isEmailNotificationsForMentions ||
                isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ||
                isEmailNotificationsForMessagesInConversationsYouStarted) &&
              Math.random() < 0.9
                ? lodash.sample(userEmailNotificationsDigestsFrequencies)
                : null
            }
          )
          RETURNING *
        `
      )!;
    });
    const demonstrationUser = res.locals.user ?? users.shift()!;

    const year = new Date().getFullYear().toString();
    const month = new Date().getMonth() + 1;
    const term = month < 4 || month > 9 ? "Spring" : "Fall";
    const institution = "Johns Hopkins University";
    for (const {
      name,
      code,
      courseRole: courseRole,
      accentColor,
      enrollmentsUsers,
      isArchived,
    } of [
      {
        name: "Principles of Programming Languages",
        code: "CS 601.426",
        courseRole: courseRoles[1],
        accentColor: enrollmentAccentColors[0],
        enrollmentsUsers: users.slice(0, 100),
      },
      {
        name: "Pharmacology",
        code: "MD 401.324",
        courseRole: courseRoles[0],
        accentColor: enrollmentAccentColors[1],
        enrollmentsUsers: users.slice(25, 125),
      },
      {
        name: "Object-Oriented Software Engineering",
        code: "EN 601.421",
        courseRole: courseRoles[1],
        accentColor: enrollmentAccentColors[2],
        enrollmentsUsers: users.slice(50, 150),
        isArchived: true,
      },
    ].reverse()) {
      const course = app.locals.database.get<{
        id: number;
        nextConversationReference: number;
      }>(
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
            "nextConversationReference"
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
            ${lodash.random(30, 50)}
          )
          RETURNING *
        `
      )!;

      const enrollment = app.locals.database.get<{
        id: number;
        courseRole: CourseRole;
      }>(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${demonstrationUser.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${courseRole},
            ${accentColor}
          )
          RETURNING *
        `
      )!;

      for (const _ of lodash.times(20)) {
        const expiresAt =
          Math.random() < 0.3
            ? new Date(
                Date.now() +
                  lodash.random(
                    -30 * 24 * 60 * 60 * 1000,
                    30 * 24 * 60 * 60 * 1000
                  )
              ).toISOString()
            : null;
        const user = Math.random() < 0.5 ? lodash.sample(users)! : null;
        app.locals.database.run(
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
                user === null || Math.random() < 0.4
                  ? null
                  : new Date(
                      (expiresAt === null
                        ? Date.now()
                        : Math.min(Date.now(), new Date(expiresAt).getTime())) -
                        lodash.random(20 * 24 * 60 * 60 * 1000)
                    ).toISOString()
              },
              ${course.id},
              ${cryptoRandomString({ length: 10, type: "numeric" })},
              ${user?.email},
              ${Math.random() < 0.5 ? user?.name : null},
              ${courseRoles[Math.random() < 0.1 ? 1 : 0]}
            )
          `
        );
      }

      const enrollments: { id: number; courseRole: CourseRole }[] = [
        enrollment,
        ...enrollmentsUsers.map(
          (enrollmentUser) =>
            app.locals.database.get<{
              id: number;
              courseRole: CourseRole;
            }>(
              sql`
                INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
                VALUES (
                  ${new Date().toISOString()},
                  ${enrollmentUser.id},
                  ${course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${courseRoles[Math.random() < 0.1 ? 1 : 0]},
                  ${lodash.sample(enrollmentAccentColors)!}
                )
                RETURNING *
              `
            )!
        ),
      ];
      const staff = enrollments.filter(
        (enrollment) => enrollment.courseRole === "staff"
      );

      const tags: { id: number }[] = [
        { name: "Assignment 1", staffOnlyAt: null },
        { name: "Assignment 2", staffOnlyAt: null },
        { name: "Assignment 3", staffOnlyAt: null },
        { name: "Assignment 4", staffOnlyAt: null },
        { name: "Assignment 5", staffOnlyAt: null },
        { name: "Assignment 6", staffOnlyAt: null },
        { name: "Assignment 7", staffOnlyAt: null },
        { name: "Assignment 8", staffOnlyAt: null },
        { name: "Assignment 9", staffOnlyAt: null },
        { name: "Assignment 10", staffOnlyAt: null },
        {
          name: "Change for Next Year",
          staffOnlyAt: new Date().toISOString(),
        },
        {
          name: "Duplicate Question",
          staffOnlyAt: new Date().toISOString(),
        },
      ].map(
        ({ name, staffOnlyAt }) =>
          app.locals.database.get<{ id: number }>(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${name},
                ${staffOnlyAt}
              )
              RETURNING *
            `
          )!
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
              lodash.random(6 * 60 * 60 * 1000, 2 * 24 * 60 * 60 * 1000)
          ).toISOString()
        );

      for (
        let conversationReference = 1;
        conversationReference < course.nextConversationReference;
        conversationReference++
      ) {
        const conversationCreatedAt =
          conversationCreatedAts[conversationReference - 1];
        const type =
          conversationTypes[
            Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2
          ];
        const nextMessageReference =
          type === "chat" ? lodash.random(50, 100) : lodash.random(2, 30);
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
                new Date(
                  messageCreatedAts[messageCreatedAts.length - 1]
                ).getTime() + lodash.random(12 * 60 * 60 * 1000)
              )
            ).toISOString()
          );
        const title = `${lodash.capitalize(casual.words(lodash.random(3, 9)))}${
          type === "question" ? "?" : ""
        }`;
        const conversationAuthorEnrollment = lodash.sample(enrollments)!;
        const conversation = app.locals.database.get<{
          id: number;
          authorEnrollment: number | null;
          anonymousAt: string | null;
          type: ConversationType;
          staffOnlyAt: string | null;
          title: string;
        }>(
          sql`
            INSERT INTO "conversations" (
              "createdAt",
              "updatedAt",
              "course",
              "reference",
              "authorEnrollment",
              "anonymousAt",      
              "type",
              "resolvedAt",
              "pinnedAt",
              "staffOnlyAt",
              "title",
              "titleSearch",
              "nextMessageReference"
            )
            VALUES (
              ${conversationCreatedAt},
              ${messageCreatedAts[messageCreatedAts.length - 1]},
              ${course.id},
              ${String(conversationReference)},
              ${conversationAuthorEnrollment.id},
              ${
                conversationAuthorEnrollment.courseRole !== "staff" &&
                Math.random() < 0.5
                  ? new Date().toISOString()
                  : null
              },
              ${type},
              ${
                type === "question" && Math.random() < 0.75
                  ? new Date().toISOString()
                  : null
              },
              ${Math.random() < 0.15 ? new Date().toISOString() : null},
              ${Math.random() < 0.25 ? new Date().toISOString() : null},
              ${title},
              ${html`${title}`},
              ${nextMessageReference}
            )
            RETURNING *
          `
        )!;

        app.locals.database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversation.id},
              ${lodash.sample(tags)!.id}
            )
          `
        );

        for (
          let messageReference = 1;
          messageReference < nextMessageReference;
          messageReference++
        ) {
          const messageCreatedAt = messageCreatedAts[messageReference - 1];
          const contentSource =
            type === "chat" && Math.random() < 0.9
              ? casual.sentences(lodash.random(1, 2))
              : lodash
                  .times(lodash.random(1, 6), () =>
                    casual.sentences(lodash.random(1, 6))
                  )
                  .join("\n\n");
          const processedContent = app.locals.partials.content({
            req,
            res,
            type: "source",
            content: contentSource,
            decorate: true,
          });
          const messageAuthorEnrollment =
            messageReference === 1
              ? conversationAuthorEnrollment
              : Math.random() < 0.05
              ? null
              : lodash.sample(enrollments)!;
          const message = app.locals.database.get<{ id: number }>(
            sql`
              INSERT INTO "messages" (
                "createdAt",
                "updatedAt",
                "conversation",
                "reference",
                "authorEnrollment",
                "anonymousAt",
                "answerAt",
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
                              18 * 60 * 60 * 1000
                            )
                        )
                      ).toISOString()
                },
                ${conversation.id},
                ${String(messageReference)},
                ${messageAuthorEnrollment?.id},
                ${
                  messageReference === 1
                    ? conversation.anonymousAt
                    : messageAuthorEnrollment?.courseRole !== "staff" &&
                      Math.random() < 0.5
                    ? new Date().toISOString()
                    : null
                },
                ${Math.random() < 0.5 ? new Date().toISOString() : null},
                ${contentSource},
                ${processedContent.preprocessed},
                ${processedContent.search}
              )
              RETURNING *
            `
          )!;

          const readers =
            conversation.staffOnlyAt === null ? enrollments : staff;
          let readingCreatedAt = messageCreatedAt;
          for (const enrollment of lodash.sampleSize(
            readers,
            lodash.random(1, readers.length)
          )) {
            readingCreatedAt = new Date(
              Math.min(
                Date.now(),
                new Date(readingCreatedAt).getTime() +
                  lodash.random(12 * 60 * 60 * 1000)
              )
            ).toISOString();
            app.locals.database.run(
              sql`
                INSERT INTO "readings" ("createdAt", "message", "enrollment")
                VALUES (
                  ${readingCreatedAt},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );
          }

          for (const enrollment of lodash.sampleSize(
            staff,
            Math.random() < 0.8 ? 0 : lodash.random(2)
          ))
            app.locals.database.run(
              sql`
                INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );

          for (const enrollment of lodash.sampleSize(
            enrollments,
            Math.random() < (conversation.type === "chat" ? 0.9 : 0.5)
              ? 0
              : lodash.random(5)
          ))
            app.locals.database.run(
              sql`
                INSERT INTO "likes" ("createdAt", "message", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );
        }
      }
    }

    if (res.locals.user === undefined)
      app.locals.helpers.Session.open({
        req,
        res,
        userId: demonstrationUser.id,
      });

    app.locals.helpers.Flash.set({
      req,
      res,
      theme: "green",
      content: html`
        Demonstration data including users, courses, conversations, and so
        forth, have been created and you’ve been signed in as a demonstration
        user to give you a better idea of what Courselore looks like in use. If
        you wish to sign in as another one of the demonstration users, their
        password is “courselore”.
      `,
    });
    res.redirect(303, `https://${app.locals.options.host}`);
  });

  app.post<{}, any, {}, {}, IsSignedOutMiddlewareLocals>(
    "/demonstration-data",
    ...app.locals.middlewares.isSignedOut,
    (req, res, next) => app.locals.handlers.demonstration(req, res, next)
  );

  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/demonstration-data",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => app.locals.handlers.demonstration(req, res, next)
  );
};
