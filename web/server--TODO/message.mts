import timers from "node:timers/promises";
import express from "express";
import qs from "qs";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css, localCSS } from "@leafac/css";
import { javascript, HTMLForJavaScript } from "@leafac/javascript";
import {
  Courselore,
  Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"],
  Application["server"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"],
  MaybeEnrollment,
  CourseRole,
  Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"],
  IsCourseStaffLocals,
  ConversationParticipants,
  ConversationType,
  IsConversationAccessibleLocals,
} from "./index.mjs";

export type GetMessageHelper = ({
  req,
  res,
  conversation,
  messageReference,
}: {
  req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
  res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
  conversation: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getConversation"]>
  >;
  messageReference: string;
}) =>
  | {
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollment: MaybeEnrollment;
      anonymousAt: string | null;
      answerAt: string | null;
      contentSource: string;
      contentPreprocessed: HTML;
      contentSearch: string;
      reading: { id: number } | null;
      readings: {
        id: number;
        createdAt: string;
        enrollment: MaybeEnrollment;
      }[];
      endorsements: {
        id: number;
        enrollment: MaybeEnrollment;
      }[];
      likes: {
        id: number;
        createdAt: string;
        enrollment: MaybeEnrollment;
      }[];
    }
  | undefined;

export type MayEditMessageHelper = ({
  req,
  res,
  message,
}: {
  req: express.Request<
    { courseReference: string; conversationReference: string },
    any,
    {},
    {},
    IsConversationAccessibleLocals
  >;
  res: express.Response<any, IsConversationAccessibleLocals>;
  message: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
  >;
}) => boolean;

export type MayEndorseMessageHelper = ({
  req,
  res,
  message,
}: {
  req: express.Request<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    {},
    {},
    IsConversationAccessibleLocals
  >;
  res: express.Response<any, IsConversationAccessibleLocals>;
  message: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
  >;
}) => boolean;

export type CourseLiveUpdater = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
  res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
}) => Promise<void>;

export type EmailNotificationsMailer = ({
  req,
  res,
  message,
}: {
  req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
  res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
  message: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
  >;
}) => void;

export default async (app: Courselore): Promise<void> => {
  app.server.locals.helpers.getMessage = ({
    req,
    res,
    conversation,
    messageReference,
  }) => {
    const messageRow = app.database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserReference: string;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorApplication["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"]: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"] | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentCourseRole: CourseRole | null;
      anonymousAt: string | null;
      answerAt: string | null;
      contentSource: string;
      contentPreprocessed: HTML;
      contentSearch: string;
      readingId: number | null;
    }>(
      sql`
        SELECT
          "messages"."id",
          "messages"."createdAt",
          "messages"."updatedAt",
          "messages"."reference",
          "authorEnrollment"."id" AS "authorEnrollmentId",
          "authorUser"."id" AS "authorUserId",
          "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
          "authorUser"."reference" AS "authorUserReference",
          "authorUser"."email" AS "authorUserEmail",
          "authorUser"."name" AS "authorUserName",
          "authorUser"."avatar" AS "authorUserAvatar",
          "authorUser"."avatarlessBackgroundColor" AS "authorApplication["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"]",
          "authorUser"."biographySource" AS "authorUserBiographySource",
          "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
          "authorEnrollment"."reference" AS "authorEnrollmentReference",
          "authorEnrollment"."courseRole" AS "authorEnrollmentCourseRole",
          "messages"."anonymousAt",
          "messages"."answerAt",
          "messages"."contentSource",
          "messages"."contentPreprocessed",
          "messages"."contentSearch",
          "readings"."id" AS "readingId"
        FROM "messages"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        LEFT JOIN "readings" ON
          "messages"."id" = "readings"."message" AND
          "readings"."enrollment" = ${res.locals.enrollment.id}
        WHERE
          "messages"."conversation" = ${conversation.id} AND
          "messages"."reference" = ${messageReference}
        ORDER BY "messages"."id" ASC
      `
    );
    if (messageRow === undefined) return undefined;
    const message = {
      id: messageRow.id,
      createdAt: messageRow.createdAt,
      updatedAt: messageRow.updatedAt,
      reference: messageRow.reference,
      authorEnrollment:
        messageRow.authorEnrollmentId !== null &&
        messageRow.authorUserId !== null &&
        messageRow.authorUserLastSeenOnlineAt !== null &&
        messageRow.authorUserReference !== null &&
        messageRow.authorUserEmail !== null &&
        messageRow.authorUserName !== null &&
        messageRow.authorApplication["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"] !== null &&
        messageRow.authorEnrollmentReference !== null &&
        messageRow.authorEnrollmentCourseRole !== null
          ? {
              id: messageRow.authorEnrollmentId,
              user: {
                id: messageRow.authorUserId,
                lastSeenOnlineAt: messageRow.authorUserLastSeenOnlineAt,
                reference: messageRow.authorUserReference,
                email: messageRow.authorUserEmail,
                name: messageRow.authorUserName,
                avatar: messageRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  messageRow.authorApplication["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"],
                biographySource: messageRow.authorUserBiographySource,
                biographyPreprocessed:
                  messageRow.authorUserBiographyPreprocessed,
              },
              reference: messageRow.authorEnrollmentReference,
              courseRole: messageRow.authorEnrollmentCourseRole,
            }
          : ("no-longer-enrolled" as const),
      anonymousAt: messageRow.anonymousAt,
      answerAt: messageRow.answerAt,
      contentSource: messageRow.contentSource,
      contentPreprocessed: messageRow.contentPreprocessed,
      contentSearch: messageRow.contentSearch,
      reading:
        messageRow.readingId === null ? null : { id: messageRow.readingId },
    };

    const readings = app.database
      .all<{
        id: number;
        createdAt: string;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userReference: string;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"] | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT
            "readings"."id",
            "readings"."createdAt",
            "enrollments"."id" AS "enrollmentId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "enrollments"."reference" AS "enrollmentReference",
            "enrollments"."courseRole" AS "enrollmentCourseRole"
          FROM "readings"
          JOIN "enrollments" ON "readings"."enrollment" = "enrollments"."id"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "readings"."message" = ${message.id}
          ORDER BY "readings"."id" ASC
        `
      )
      .map((reading) => ({
        id: reading.id,
        createdAt: reading.createdAt,
        enrollment:
          reading.enrollmentId !== null &&
          reading.userId !== null &&
          reading.userLastSeenOnlineAt !== null &&
          reading.userReference !== null &&
          reading.userEmail !== null &&
          reading.userName !== null &&
          reading.userAvatarlessBackgroundColor !== null &&
          reading.enrollmentReference !== null &&
          reading.enrollmentCourseRole !== null
            ? {
                id: reading.enrollmentId,
                user: {
                  id: reading.userId,
                  lastSeenOnlineAt: reading.userLastSeenOnlineAt,
                  reference: reading.userReference,
                  email: reading.userEmail,
                  name: reading.userName,
                  avatar: reading.userAvatar,
                  avatarlessBackgroundColor:
                    reading.userAvatarlessBackgroundColor,
                  biographySource: reading.userBiographySource,
                  biographyPreprocessed: reading.userBiographyPreprocessed,
                },
                reference: reading.enrollmentReference,
                courseRole: reading.enrollmentCourseRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const endorsements = app.database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userReference: string;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"] | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT
            "endorsements"."id",
            "enrollments"."id" AS "enrollmentId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "enrollments"."reference" AS "enrollmentReference",
            "enrollments"."courseRole" AS "enrollmentCourseRole"
          FROM "endorsements"
          JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "endorsements"."message" = ${message.id}
          ORDER BY "endorsements"."id" ASC
        `
      )
      .map((endorsement) => ({
        id: endorsement.id,
        enrollment:
          endorsement.enrollmentId !== null &&
          endorsement.userId !== null &&
          endorsement.userLastSeenOnlineAt !== null &&
          endorsement.userReference !== null &&
          endorsement.userEmail !== null &&
          endorsement.userName !== null &&
          endorsement.userAvatarlessBackgroundColor !== null &&
          endorsement.enrollmentReference !== null &&
          endorsement.enrollmentCourseRole !== null
            ? {
                id: endorsement.enrollmentId,
                user: {
                  id: endorsement.userId,
                  lastSeenOnlineAt: endorsement.userLastSeenOnlineAt,
                  reference: endorsement.userReference,
                  email: endorsement.userEmail,
                  name: endorsement.userName,
                  avatar: endorsement.userAvatar,
                  avatarlessBackgroundColor:
                    endorsement.userAvatarlessBackgroundColor,
                  biographySource: endorsement.userBiographySource,
                  biographyPreprocessed: endorsement.userBiographyPreprocessed,
                },
                reference: endorsement.enrollmentReference,
                courseRole: endorsement.enrollmentCourseRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const likes = app.database
      .all<{
        id: number;
        createdAt: string;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userReference: string;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"] | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT
            "likes"."id",
            "likes"."createdAt",
            "enrollments"."id" AS "enrollmentId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "enrollments"."reference" AS "enrollmentReference",
            "enrollments"."courseRole" AS "enrollmentCourseRole"
          FROM "likes"
          LEFT JOIN "enrollments" ON "likes"."enrollment" = "enrollments"."id"
          LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "likes"."message" = ${message.id}
          ORDER BY "likes"."id" ASC
        `
      )
      .map((like) => ({
        id: like.id,
        createdAt: like.createdAt,
        enrollment:
          like.enrollmentId !== null &&
          like.userId !== null &&
          like.userLastSeenOnlineAt !== null &&
          like.userReference !== null &&
          like.userEmail !== null &&
          like.userName !== null &&
          like.userAvatarlessBackgroundColor !== null &&
          like.enrollmentReference !== null &&
          like.enrollmentCourseRole !== null
            ? {
                id: like.enrollmentId,
                user: {
                  id: like.userId,
                  lastSeenOnlineAt: like.userLastSeenOnlineAt,
                  reference: like.userReference,
                  email: like.userEmail,
                  name: like.userName,
                  avatar: like.userAvatar,
                  avatarlessBackgroundColor: like.userAvatarlessBackgroundColor,
                  biographySource: like.userBiographySource,
                  biographyPreprocessed: like.userBiographyPreprocessed,
                },
                reference: like.enrollmentReference,
                courseRole: like.enrollmentCourseRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    return {
      ...message,
      readings,
      endorsements,
      likes,
    };
  };

  type MessageExistsLocals = IsConversationAccessibleLocals & {
    message: NonNullable<
      ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
    >;
  };
  const messageExistsMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsLocals
  >[] = [
    ...app.server.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      const message = app.server.locals.helpers.getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: req.params.messageReference,
      });
      if (message === undefined) return next("route");
      res.locals.message = message;
      next();
    },
  ];

  app.server.locals.helpers.mayEditMessage = ({ req, res, message }) =>
    res.locals.enrollment.courseRole === "staff" ||
    (message.authorEnrollment !== "no-longer-enrolled" &&
      message.authorEnrollment.id === res.locals.enrollment.id);

  app.server.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    IsCourseStaffLocals & MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/views",
    ...app.server.locals.middlewares.isCourseStaff,
    ...messageExistsMiddleware,
    (req, res) => {
      res.send(
        app.server.locals.layouts.partial({
          req,
          res,
          body: html`
            <div
              class="dropdown--menu"
              css="${res.locals.css(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${res.locals.message.readings.reverse().map(
                (reading) => html`
                  <div class="dropdown--menu--item">
                    $${app.server.locals.partials.user({
                      req,
                      res,
                      enrollment: reading.enrollment,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(reading.createdAt).toISOString()}"
                        onload="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                      ></time>
                    </span>
                  </div>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  app.server.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { isAnswer?: "on"; content?: string; isAnonymous?: "on" },
    {
      conversations?: object;
      messages?: object;
    },
    IsConversationAccessibleLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...app.server.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      if (
        ![undefined, "on"].includes(req.body.isAnswer) ||
        (req.body.isAnswer === "on" &&
          res.locals.conversation.type !== "question") ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        ![undefined, "on"].includes(req.body.isAnonymous) ||
        (req.body.isAnonymous === "on" &&
          res.locals.enrollment.courseRole === "staff")
      )
        return next("Validation");

      const mostRecentMessage = app.server.locals.helpers.getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: String(
          res.locals.conversation.nextMessageReference - 1
        ),
      });
      let message: { id: number; reference: string };
      if (
        res.locals.conversation.type === "chat" &&
        mostRecentMessage !== undefined &&
        mostRecentMessage.authorEnrollment !== "no-longer-enrolled" &&
        res.locals.enrollment.id === mostRecentMessage.authorEnrollment.id &&
        mostRecentMessage.anonymousAt === null &&
        req.body.isAnonymous !== "on" &&
        new Date().getTime() - new Date(mostRecentMessage.createdAt).getTime() <
          5 * 60 * 1000
      ) {
        const contentSource = `${mostRecentMessage.contentSource}\n\n${req.body.content}`;
        const contentPreprocessed =
          app.server.locals.partials.contentPreprocessed(contentSource);
        app.database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        message = app.database.get<{ id: number; reference: string }>(
          sql`
            UPDATE "messages"
            SET
              "contentSource" = ${contentSource},
              "contentPreprocessed" = ${contentPreprocessed.contentPreprocessed},
              "contentSearch" = ${contentPreprocessed.contentSearch}
            WHERE "id" = ${mostRecentMessage.id}
            RETURNING *
          `
        )!;
        app.database.run(
          sql`
            DELETE FROM "readings"
            WHERE
              "message" = ${mostRecentMessage.id} AND
              "enrollment" != ${res.locals.enrollment.id}
          `
        );
      } else {
        const contentPreprocessed = app.server.locals.partials.contentPreprocessed(
          req.body.content
        );
        app.database.run(
          sql`
            UPDATE "conversations"
            SET
              "updatedAt" = ${new Date().toISOString()},
              "nextMessageReference" = ${
                res.locals.conversation.nextMessageReference + 1
              }
              $${
                res.locals.conversation.type === "question" &&
                res.locals.enrollment.courseRole === "staff" &&
                req.body.isAnswer === "on" &&
                res.locals.conversation.resolvedAt === null
                  ? sql`,
                      "resolvedAt" = ${new Date().toISOString()}
                    `
                  : res.locals.conversation.type === "question" &&
                    res.locals.enrollment.courseRole === "student" &&
                    req.body.isAnswer !== "on"
                  ? sql`,
                      "resolvedAt" = ${null}
                    `
                  : sql``
              }
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        message = app.database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            INSERT INTO "messages" (
              "createdAt",
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
              ${new Date().toISOString()},
              ${res.locals.conversation.id},
              ${String(res.locals.conversation.nextMessageReference)},
              ${res.locals.enrollment.id},
              ${
                req.body.isAnonymous === "on" ? new Date().toISOString() : null
              },
              ${req.body.isAnswer === "on" ? new Date().toISOString() : null},
              ${req.body.content},
              ${contentPreprocessed.contentPreprocessed},
              ${contentPreprocessed.contentSearch}
            )
            RETURNING *
          `
        )!;
        app.database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
      }
      app.server.locals.helpers.emailNotifications({
        req,
        res,
        message: app.server.locals.helpers.getMessage({
          req,
          res,
          conversation: res.locals.conversation,
          messageReference: message.reference,
        })!,
      });

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.patch<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {
      isAnswer?: "true" | "false";
      isAnonymous?: "true" | "false";
      content?: string;
    },
    {
      conversations?: object;
      messages?: object;
    },
    MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        !app.server.locals.helpers.mayEditMessage({
          req,
          res,
          message: res.locals.message,
        })
      )
        return next("route");

      if (typeof req.body.isAnswer === "string")
        if (
          !["true", "false"].includes(req.body.isAnswer) ||
          res.locals.message.reference === "1" ||
          res.locals.conversation.type !== "question" ||
          (req.body.isAnswer === "true" &&
            res.locals.message.answerAt !== null) ||
          (req.body.isAnswer === "false" &&
            res.locals.message.answerAt === null)
        )
          return next("Validation");
        else
          app.database.run(
            sql`
              UPDATE "messages"
              SET "answerAt" = ${
                req.body.isAnswer === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );

      if (typeof req.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(req.body.isAnonymous) ||
          res.locals.message.authorEnrollment === "no-longer-enrolled" ||
          res.locals.message.authorEnrollment.courseRole === "staff" ||
          (req.body.isAnonymous === "true" &&
            res.locals.message.anonymousAt !== null) ||
          (req.body.isAnonymous === "false" &&
            res.locals.message.anonymousAt === null)
        )
          return next("Validation");
        else {
          app.database.run(
            sql`
              UPDATE "messages"
              SET "anonymousAt" = ${
                req.body.isAnonymous === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );
          if (
            res.locals.message.reference === "1" &&
            res.locals.conversation.authorEnrollment !== "no-longer-enrolled" &&
            res.locals.conversation.authorEnrollment.id ===
              res.locals.message.authorEnrollment.id
          )
            app.database.run(
              sql`
                UPDATE "conversations"
                SET "anonymousAt" = ${
                  req.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE "id" = ${res.locals.conversation.id}
              `
            );
        }

      if (typeof req.body.content === "string") {
        if (req.body.content.trim() === "") return next("Validation");
        const contentPreprocessed = app.server.locals.partials.contentPreprocessed(
          req.body.content
        );
        app.database.run(
          sql`
            UPDATE "messages"
            SET
              "contentSource" = ${req.body.content},
              "contentPreprocessed" = ${
                contentPreprocessed.contentPreprocessed
              },
              "contentSearch" = ${contentPreprocessed.contentSearch},
              "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.message.id}
          `
        );
        app.database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        app.server.locals.helpers.emailNotifications({
          req,
          res,
          message: res.locals.message,
        });
      }

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    IsCourseStaffLocals & MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...app.server.locals.middlewares.isCourseStaff,
    ...messageExistsMiddleware,
    (req, res, next) => {
      app.database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );
      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );
      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    ...messageExistsMiddleware,
    (req, res) => {
      res.send(
        app.server.locals.layouts.partial({
          req,
          res,
          body: html`
            <div
              class="dropdown--menu"
              css="${res.locals.css(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${res.locals.message.likes.reverse().map(
                (like) => html`
                  <div class="dropdown--menu--item">
                    $${app.server.locals.partials.user({
                      req,
                      res,
                      enrollment: like.enrollment,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(like.createdAt).toISOString()}"
                        onload="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                      ></time>
                    </span>
                  </div>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  app.server.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.likes.some(
          (like) =>
            like.enrollment !== "no-longer-enrolled" &&
            like.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("Validation");

      app.database.run(
        sql`
          INSERT INTO "likes" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    MessageExistsLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...messageExistsMiddleware,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) =>
          like.enrollment !== "no-longer-enrolled" &&
          like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("Validation");

      app.database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `
      );

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.locals.helpers.mayEndorseMessage = ({ req, res, message }) =>
    res.locals.enrollment.courseRole === "staff" &&
    res.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    (message.authorEnrollment === "no-longer-enrolled" ||
      message.authorEnrollment.courseRole !== "staff");

  type MayEndorseMessageLocals = MessageExistsLocals;
  const mayEndorseMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        app.server.locals.helpers.mayEndorseMessage({
          req,
          res,
          message: res.locals.message,
        })
      )
        return next();
      next("route");
    },
  ];

  app.server.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    MayEndorseMessageLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.enrollment !== "no-longer-enrolled" &&
            endorsement.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("Validation");

      app.database.run(
        sql`
          INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );
      if (res.locals.conversation.resolvedAt === null)
        app.database.run(
          sql`
            UPDATE "conversations"
            SET "resolvedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    MayEndorseMessageLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.enrollment !== "no-longer-enrolled" &&
          endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("Validation");

      app.database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.locals.helpers.emailNotifications = ({ req, res, message }) => {
    app.database.executeTransaction(() => {
      app.database.run(
        sql`
          INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${res.locals.enrollment.id}
          )
        `
      );
      if (message.authorEnrollment !== "no-longer-enrolled")
        app.database.run(
          sql`
            INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${message.authorEnrollment.id}
            )
          `
        );

      const job = app.database.get<{ id: number }>(
        sql`
          SELECT "id"
          FROM "emailNotificationMessageJobs"
          WHERE
            "message" = ${message.id} AND
            "startedAt" IS NULL
        `
      );
      if (job === undefined)
        app.database.run(
          sql`
            INSERT INTO "emailNotificationMessageJobs" (
              "createdAt",
              "startAt",
              "expiresAt",
              "message"
            )
            VALUES (
              ${new Date().toISOString()},
              ${new Date(
                Date.now() /* TODO: Better email notifications: + 5 * 60 * 1000 */
              ).toISOString()},
              ${new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()},
              ${message.id}
            )
          `
        );
      else
        app.database.run(
          sql`
            UPDATE "emailNotificationMessageJobs"
            SET
              "startAt" = ${new Date(
                Date.now() /* TODO: Better email notifications: + 5 * 60 * 1000 */
              ).toISOString()},
              "expiresAt" = ${new Date(
                Date.now() + 5 * 60 * 60 * 1000
              ).toISOString()}
            WHERE "id" = ${job.id}
          `
        );
    });
  };

  if (app.process.type === "worker")
    app.once("start", async () => {
      while (true) {
        console.log(
          `${new Date().toISOString()}\t${
            app.process.type
          }\temailNotificationMessageJobs\tSTARTED...`
        );

        app.database.executeTransaction(() => {
          for (const job of app.database.all<{
            id: number;
            message: number;
          }>(
            sql`
              SELECT "id", "message"
              FROM "emailNotificationMessageJobs"
              WHERE "expiresAt" < ${new Date().toISOString()}
            `
          )) {
            app.database.run(
              sql`
                DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\temailNotificationMessageJobs\tEXPIRED\tmessage = ${
                job.message
              }`
            );
          }
        });

        app.database.executeTransaction(() => {
          for (const job of app.database.all<{
            id: number;
            message: number;
          }>(
            sql`
              SELECT "id", "message"
              FROM "emailNotificationMessageJobs"
              WHERE "startedAt" < ${new Date(
                Date.now() - 2 * 60 * 1000
              ).toISOString()}
            `
          )) {
            app.database.run(
              sql`
                UPDATE "emailNotificationMessageJobs"
                SET "startedAt" = NULL
                WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\temailNotificationMessageJobs\tTIMED OUT\tmessage = ${
                job.message
              }`
            );
          }
        });

        while (true) {
          const job = app.database.executeTransaction(() => {
            const job = app.database.get<{
              id: number;
              message: string;
            }>(
              sql`
                SELECT "id", "message"
                FROM "emailNotificationMessageJobs"
                WHERE
                  "startAt" <= ${new Date().toISOString()} AND
                  "startedAt" IS NULL
                ORDER BY "startAt" ASC
                LIMIT 1
              `
            );
            if (job !== undefined)
              app.database.run(
                sql`
                  UPDATE "emailNotificationMessageJobs"
                  SET "startedAt" = ${new Date().toISOString()}
                  WHERE "id" = ${job.id}
                `
              );
            return job;
          });
          if (job === undefined) break;

          const messageRow = app.database.get<{
            id: number;
            conversationId: number;
            courseId: number;
            courseReference: string;
            courseArchivedAt: string | null;
            courseName: string;
            courseYear: string | null;
            courseTerm: string | null;
            courseInstitution: string | null;
            courseCode: string | null;
            courseNextConversationReference: number;
            conversationReference: string;
            conversationParticipants: ConversationParticipants;
            conversationType: ConversationType;
            conversationAnnouncementAt: string | null;
            conversationTitle: string;
            reference: string;
            authorUserName: string | null;
            anonymousAt: string | null;
            contentPreprocessed: string;
          }>(
            sql`
              SELECT
                "messages"."id",
                "conversations"."id" AS "conversationId",
                "courses"."id" AS "courseId",
                "courses"."reference" AS "courseReference",
                "courses"."archivedAt" AS "courseArchivedAt",
                "courses"."name" AS "courseName",
                "courses"."year" AS "courseYear",
                "courses"."term" AS "courseTerm",
                "courses"."institution" AS "courseInstitution",
                "courses"."code" AS "courseCode",
                "courses"."nextConversationReference" AS "courseNextConversationReference",
                "conversations"."reference" AS "conversationReference",
                "conversations"."participants" AS "conversationParticipants",
                "conversations"."type" AS "conversationType",
                "conversations"."announcementAt" AS "conversationAnnouncementAt",
                "conversations"."title" AS "conversationTitle",
                "messages"."reference",
                "authorUser"."name" AS "authorUserName",
                "messages"."anonymousAt",
                "messages"."contentPreprocessed"
              FROM "messages"
              JOIN "conversations" ON "messages"."conversation" = "conversations"."id"
              JOIN "courses" ON "conversations"."course" = "courses"."id"
              LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
              LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"    
              WHERE "messages"."id" = ${job.message}
            `
          )!;
          const message = {
            id: messageRow.id,
            reference: messageRow.reference,
            authorEnrollment:
              messageRow.authorUserName !== null
                ? {
                    user: {
                      name: messageRow.authorUserName,
                    },
                  }
                : ("no-longer-enrolled" as const),
            anonymousAt: messageRow.anonymousAt,
            contentPreprocessed: messageRow.contentPreprocessed,
          };
          const conversation = {
            id: messageRow.conversationId,
            reference: messageRow.conversationReference,
            participants: messageRow.conversationParticipants,
            type: messageRow.conversationType,
            announcementAt: messageRow.conversationAnnouncementAt,
            title: messageRow.conversationTitle,
          };
          const course = {
            id: messageRow.courseId,
            reference: messageRow.courseReference,
            archivedAt: messageRow.courseArchivedAt,
            name: messageRow.courseName,
            year: messageRow.courseYear,
            term: messageRow.courseTerm,
            institution: messageRow.courseInstitution,
            code: messageRow.courseCode,
            nextConversationReference:
              messageRow.courseNextConversationReference,
          };
          const contentProcessed = app.server.locals.partials.content({
            req: { query: {} } as Parameters<
              typeof app.server.locals.partials.content
            >[0]["req"],
            res: {
              locals: {
                css: localCSS(),
                html: HTMLForJavaScript(),
                user: {},
                enrollment: {},
                course,
              },
            } as Parameters<typeof app.server.locals.partials.content>[0]["res"],
            contentPreprocessed: message.contentPreprocessed,
            decorate: true,
          });

          const enrollments = app.database.all<{
            id: number;
            userId: number;
            userEmail: string;
            userEmailNotificationsForAllMessages: Application["server"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"];
            reference: string;
            courseRole: CourseRole;
          }>(
            sql`
              SELECT
                "enrollments"."id",
                "users"."id" AS "userId",
                "users"."email" AS "userEmail",
                "users"."emailNotificationsForAllMessages" AS "userEmailNotificationsForAllMessages",
                "enrollments"."reference",
                "enrollments"."courseRole"
              FROM "enrollments"
              JOIN "users" ON
                "enrollments"."user" = "users"."id" AND
                "users"."emailVerifiedAt" IS NOT NULL
              WHERE
                "enrollments"."course" = ${course.id} AND
                NOT EXISTS(
                  SELECT TRUE
                  FROM "emailNotificationDeliveries"
                  WHERE
                    "enrollments"."id" = "emailNotificationDeliveries"."enrollment" AND
                    "emailNotificationDeliveries"."message" = ${
                      message.id
                    }
                ) $${
                  conversation.participants === "everyone"
                    ? sql``
                    : conversation.participants === "staff"
                    ? sql`
                        AND (
                          "enrollments"."courseRole" = 'staff' OR EXISTS(
                            SELECT TRUE
                            FROM "conversationSelectedParticipants"
                            WHERE
                              "conversationSelectedParticipants"."conversation" = ${conversation.id} AND
                              "conversationSelectedParticipants"."enrollment" = "enrollments"."id"
                          )
                        )
                      `
                    : conversation.participants === "selected-people"
                    ? sql`
                        AND EXISTS(
                          SELECT TRUE
                          FROM "conversationSelectedParticipants"
                          WHERE
                            "conversationSelectedParticipants"."conversation" = ${conversation.id} AND
                            "conversationSelectedParticipants"."enrollment" = "enrollments"."id"
                        )
                      `
                    : sql``
                } $${
          conversation.type === "note" &&
          conversation.announcementAt !== null &&
          message.reference === "1"
            ? sql``
            : sql`
                AND (
                  "users"."emailNotificationsForAllMessages" != 'none' OR (
                    "users"."emailNotificationsForMentionsAt" IS NOT NULL
                      $${
                        contentProcessed.mentions.has("everyone")
                          ? sql``
                          : contentProcessed.mentions.has("staff")
                          ? sql`
                              AND (
                                "enrollments"."courseRole" = 'staff' OR
                                "enrollments"."reference" IN ${contentProcessed.mentions}
                              )
                            `
                          : contentProcessed.mentions.has("students")
                          ? sql`
                              AND (
                                "enrollments"."courseRole" = 'student' OR
                                "enrollments"."reference" IN ${contentProcessed.mentions}
                              )
                            `
                          : sql`
                              AND "enrollments"."reference" IN ${contentProcessed.mentions}
                            `
                      }
                  ) OR (
                    "users"."emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" IS NOT NULL AND EXISTS(
                      SELECT TRUE
                      FROM "messages"
                      WHERE
                        "conversation" = ${conversation.id} AND
                        "authorEnrollment" = "enrollments"."id"
                    )
                  ) OR (
                    "users"."emailNotificationsForMessagesInConversationsYouStartedAt" IS NOT NULL AND EXISTS(
                      SELECT TRUE
                      FROM "conversations"
                      WHERE
                        "id" = ${conversation.id} AND
                        "authorEnrollment" = "enrollments"."id"
                    )
                  )
                )
              `
            }
            `
          );

          for (const enrollment of enrollments) {
            // TODO: Better email notifications
            // switch (enrollment.userEmailNotificationsForAllMessages) {
            //   case "instant":
            //     break;

            //   case "hourly-digests":
            //   case "daily-digests":
            //     break;
            // }
            app.database.run(
              sql`
                INSERT INTO "sendEmailJobs" (
                  "createdAt",
                  "startAt",
                  "expiresAt",
                  "mailOptions"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${new Date().toISOString()},
                  ${new Date(Date.now() + 20 * 60 * 1000).toISOString()},
                  ${JSON.stringify({
                    from: {
                      name: `${course.name} · ${app.configuration.email.defaults.from.name}`,
                      address: app.configuration.email.defaults.from.address,
                    },
                    to: enrollment.userEmail,
                    inReplyTo: `courses/${course.reference}/conversations/${conversation.reference}@${app.configuration.hostname}`,
                    references: `courses/${course.reference}/conversations/${conversation.reference}@${app.configuration.hostname}`,
                    subject: conversation.title,
                    html: html`
                      <p>
                        <a
                          href="https://${app.configuration
                            .hostname}/courses/${course.reference}/conversations/${conversation.reference}${qs.stringify(
                            {
                              messages: {
                                messageReference: message.reference,
                              },
                            },
                            { addQueryPrefix: true }
                          )}"
                          >${message.authorEnrollment === "no-longer-enrolled"
                            ? "Someone who is no longer enrolled"
                            : message.anonymousAt !== null
                            ? `Anonymous ${
                                enrollment.courseRole === "staff"
                                  ? `(${message.authorEnrollment.user.name})`
                                  : ""
                              }`
                            : message.authorEnrollment.user.name}
                          says</a
                        >:
                      </p>

                      <hr />

                      $${message.contentPreprocessed}

                      <hr />

                      <p>
                        <small>
                          <a
                            href="https://${app.configuration
                              .hostname}/settings/notifications-preferences"
                            >Change Notifications Preferences</a
                          >
                        </small>
                      </p>
                    `,
                  })}
                )
              `
            );

            app.database.run(
              sql`
                INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );
          }

          app.database.run(
            sql`
              DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
            `
          );
          console.log(
            `${new Date().toISOString()}\t${
              app.process.type
            }\temailNotificationMessageJobs\tSUCCEEDED\tmessage = ${
              job.message
            }`
          );
          await timers.setTimeout(100, undefined, { ref: false });
        }

        app.server.locals.workers.sendEmail?.();

        console.log(
          `${new Date().toISOString()}\t${
            app.process.type
          }\temailNotificationMessageJobs\tFINISHED`
        );

        await timers.setTimeout(2 * 60 * 1000, undefined, { ref: false });
      }
    });
};
