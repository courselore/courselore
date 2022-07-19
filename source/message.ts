import express from "express";
import qs from "qs";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import {
  Courselore,
  UserAvatarlessBackgroundColor,
  UserEmailNotificationsDigestsFrequency,
  CourseRole,
  IsEnrolledInCourseMiddlewareLocals,
  IsCourseStaffMiddlewareLocals,
  AuthorEnrollment,
  IsConversationAccessibleMiddlewareLocals,
} from "./index.js";

export type GetMessageHelper = ({
  req,
  res,
  conversation,
  messageReference,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
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
      authorEnrollment: AuthorEnrollment;
      anonymousAt: string | null;
      answerAt: string | null;
      contentSource: string;
      contentPreprocessed: HTML;
      contentSearch: string;
      reading: { id: number } | null;
      readings: {
        id: number;
        createdAt: string;
        enrollment: AuthorEnrollment;
      }[];
      endorsements: {
        id: number;
        enrollment: AuthorEnrollment;
      }[];
      likes: {
        id: number;
        enrollment: AuthorEnrollment;
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
    IsConversationAccessibleMiddlewareLocals
  >;
  res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
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
    IsConversationAccessibleMiddlewareLocals
  >;
  res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
  message: MessageExistsMiddlewareLocals["message"];
}) => boolean;

export type CourseLiveUpdater = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
}) => Promise<void>;

export type NotificationsMailer = ({
  req,
  res,
  conversation,
  message,
  mentions,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  conversation: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getConversation"]>
  >;
  message: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
  >;
  mentions: Set<string>;
}) => void;

export default (app: Courselore): void => {
  app.locals.helpers.getMessage = ({
    req,
    res,
    conversation,
    messageReference,
  }) => {
    const messageRow = app.locals.database.get<{
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
      authorUserAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
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
        SELECT "messages"."id",
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
               "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColor",
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
        LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                "readings"."enrollment" = ${res.locals.enrollment.id}
        WHERE "messages"."conversation" = ${conversation.id} AND
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
        messageRow.authorUserAvatarlessBackgroundColor !== null &&
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
                  messageRow.authorUserAvatarlessBackgroundColor,
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

    const readings = app.locals.database
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
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT "readings"."id",
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

    const endorsements = app.locals.database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userReference: string;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT "endorsements"."id",
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

    const likes = app.locals.database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userReference: string;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole: CourseRole | null;
      }>(
        sql`
          SELECT "likes"."id",
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

  interface MessageExistsMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {
    message: NonNullable<
      ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
    >;
  }
  const messageExistsMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsMiddlewareLocals
  >[] = [
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      const message = app.locals.helpers.getMessage({
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

  app.locals.helpers.mayEditMessage = ({ req, res, message }) =>
    res.locals.enrollment.courseRole === "staff" ||
    (message.authorEnrollment !== "no-longer-enrolled" &&
      message.authorEnrollment.id === res.locals.enrollment.id);

  app.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/views",
    ...messageExistsMiddleware,
    (req, res) => {
      res.send(
        app.locals.layouts.partial({
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
                  <button class="dropdown--menu--item">
                    $${app.locals.partials.user({
                      req,
                      res,
                      enrollment: reading.enrollment,
                      size: "xs",
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
                  </button>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  app.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { isAnswer?: "on"; content?: string; isAnonymous?: "on" },
    {
      conversations?: object;
      messages?: object;
    },
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      if (
        ![undefined, "on"].includes(req.body.isAnswer) ||
        (req.body.isAnswer === "on" &&
          res.locals.conversation.type !== "question") ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        ![undefined, "on"].includes(req.body.isAnonymous) ||
        (req.body.isAnonymous === "on" &&
          (res.locals.enrollment.courseRole === "staff" ||
            res.locals.conversation.staffOnlyAt !== null))
      )
        return next("validation");

      const mostRecentMessage = app.locals.helpers.getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: String(
          res.locals.conversation.nextMessageReference - 1
        ),
      });
      let processedContent: ReturnType<typeof app.locals.partials.content>;
      let messageReference: string;
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
        processedContent = app.locals.partials.content({
          req,
          res,
          type: "source",
          content: contentSource,
          decorate: true,
        });
        app.locals.database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        app.locals.database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${contentSource},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search}
            WHERE "id" = ${mostRecentMessage.id}
          `
        );
        app.locals.database.run(
          sql`
            DELETE FROM "readings"
            WHERE "message" = ${mostRecentMessage.id} AND
                  "enrollment" != ${res.locals.enrollment.id}
          `
        );
        messageReference = mostRecentMessage.reference;
      } else {
        processedContent = app.locals.partials.content({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        app.locals.database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()},
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
        const message = app.locals.database.get<{
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
              ${processedContent.preprocessed},
              ${processedContent.search}
            )
            RETURNING *
          `
        )!;
        app.locals.database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
        messageReference = message.reference;
      }
      app.locals.mailers.notifications({
        req,
        res,
        conversation: res.locals.conversation,
        message: app.locals.helpers.getMessage({
          req,
          res,
          conversation: res.locals.conversation,
          messageReference,
        })!,
        mentions: processedContent.mentions!,
      });

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.patch<
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
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        !app.locals.helpers.mayEditMessage({
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
          return next("validation");
        else
          app.locals.database.run(
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
          res.locals.conversation.staffOnlyAt !== null ||
          (req.body.isAnonymous === "true" &&
            res.locals.message.anonymousAt !== null) ||
          (req.body.isAnonymous === "false" &&
            res.locals.message.anonymousAt === null)
        )
          return next("validation");
        else {
          app.locals.database.run(
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
          if (res.locals.message.reference === "1")
            app.locals.database.run(
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
        if (req.body.content.trim() === "") return next("validation");
        const processedContent = app.locals.partials.content({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        app.locals.database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${req.body.content},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search},
                "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.message.id}
          `
        );
        app.locals.database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        app.locals.mailers.notifications({
          req,
          res,
          conversation: res.locals.conversation,
          message: res.locals.message,
          mentions: processedContent.mentions!,
        });
      }

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.delete<
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
    IsCourseStaffMiddlewareLocals & MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...app.locals.middlewares.isCourseStaff,
    ...messageExistsMiddleware,
    (req, res, next) => {
      app.locals.database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );
      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );
      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.post<
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
    MessageExistsMiddlewareLocals
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
        return next("validation");

      app.locals.database.run(
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
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.delete<
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
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...messageExistsMiddleware,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) =>
          like.enrollment !== "no-longer-enrolled" &&
          like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      app.locals.database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `
      );

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.locals.helpers.mayEndorseMessage = ({ req, res, message }) =>
    res.locals.enrollment.courseRole === "staff" &&
    res.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    (message.authorEnrollment === "no-longer-enrolled" ||
      message.authorEnrollment.courseRole !== "staff");

  interface MayEndorseMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  const mayEndorseMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        app.locals.helpers.mayEndorseMessage({
          req,
          res,
          message: res.locals.message,
        })
      )
        return next();
      next("route");
    },
  ];

  app.post<
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
    MayEndorseMessageMiddlewareLocals
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
        return next("validation");

      app.locals.database.run(
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
        app.locals.database.run(
          sql`
            UPDATE "conversations"
            SET "resolvedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.delete<
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
    MayEndorseMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.enrollment !== "no-longer-enrolled" &&
          endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("validation");

      app.locals.database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${res.locals.conversation.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
            messages: req.query.messages,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.locals.mailers.notifications = ({
    req,
    res,
    conversation,
    message,
    mentions,
  }) => {
    app.locals.database.run(
      sql`
        INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
        VALUES (
          ${new Date().toISOString()},
          ${message.id},
          ${res.locals.enrollment.id}
        )
      `
    );
    if (message.authorEnrollment !== "no-longer-enrolled")
      app.locals.database.run(
        sql`
          INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${message.authorEnrollment.id}
          )
        `
      );

    app.locals.database.executeTransaction(() => {
      const enrollments = app.locals.database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userEmailNotificationsDigestsFrequency: UserEmailNotificationsDigestsFrequency | null;
        reference: string;
        courseRole: CourseRole;
      }>(
        sql`
            SELECT "enrollments"."id",
                   "users"."id" AS "userId",
                   "users"."email" AS "userEmail",
                   "users"."emailNotificationsDigestsFrequency" AS "userEmailNotificationsDigestsFrequency",
                   "enrollments"."reference",
                   "enrollments"."courseRole"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id" AND
                            "users"."emailVerifiedAt" IS NOT NULL
            LEFT JOIN "notificationDeliveries" ON "enrollments"."id" = "notificationDeliveries"."enrollment" AND
                                                  "notificationDeliveries"."message" = ${
                                                    message.id
                                                  }
            $${
              conversation.staffOnlyAt !== null
                ? sql`
                    LEFT JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment" AND
                                            "messages"."conversation" = ${conversation.id}
                  `
                : sql``
            }
            WHERE "enrollments"."course" = ${res.locals.course.id} AND
                  "notificationDeliveries"."id" IS NULL
                  $${
                    conversation.staffOnlyAt !== null
                      ? sql`
                        AND (
                          "enrollments"."courseRole" = 'staff' OR
                          "messages"."id" IS NOT NULL
                        )
                      `
                      : sql``
                  } AND (
                    "users"."emailNotificationsForAllMessagesAt" IS NOT NULL OR (
                      "users"."emailNotificationsForMentionsAt" IS NOT NULL AND (
                        $${mentions.has("everyone") ? sql`TRUE` : sql`FALSE`} OR
                        $${
                          mentions.has("staff")
                            ? sql`"enrollments"."courseRole" = 'staff'`
                            : sql`FALSE`
                        } OR
                        $${
                          mentions.has("students")
                            ? sql`"enrollments"."courseRole" = 'student'`
                            : sql`FALSE`
                        } OR
                        "enrollments"."reference" IN ${mentions}
                      )
                    )
                    -- TODO: Better email notifications: "users"."emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt"
                    -- TODO: Better email notifications: "users"."emailNotificationsForMessagesInConversationsYouStartedAt"
                  )
            GROUP BY "enrollments"."id"
          `
      );
      for (const enrollment of enrollments) {
        app.locals.database.run(
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
                  name: `${app.locals.options.sendMail.defaults.from.name} · ${res.locals.course.name}`,
                  address: app.locals.options.sendMail.defaults.from.address,
                },
                to: enrollment.userEmail,
                subject: `${conversation.title} · ${res.locals.course.name} · Courselore`,
                html: html`
                  <p>
                    <a
                      href="https://${app.locals.options.host}/courses/${res
                        .locals.course
                        .reference}/conversations/${conversation.reference}${qs.stringify(
                        { messages: { messageReference: message.reference } },
                        {
                          addQueryPrefix: true,
                        }
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
                        href="https://${app.locals.options
                          .host}/settings/notifications-preferences"
                        >Change Notifications Preferences</a
                      >
                    </small>
                  </p>
                `,
              })}
            )
          `
        );
        app.locals.database.run(
          sql`
            INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${enrollment.id}
            )
          `
        );
      }
    });

    app.locals.workers.sendEmail();
  };
};
