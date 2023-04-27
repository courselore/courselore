import assert from "node:assert/strict";
import util from "node:util";
import express from "express";
import qs from "qs";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import { Application } from "./index.mjs";

export type ApplicationConversation = {
  web: {
    locals: {
      ResponseLocals: {
        Conversation: Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"] & {
          conversation: NonNullable<
            ReturnType<
              Application["web"]["locals"]["helpers"]["getConversation"]
            >
          >;
          messageDraft:
            | {
                id: number;
                createdAt: string;
                contentSource: string;
              }
            | undefined;
          enrollmentsTyping: Application["web"]["locals"]["Types"]["Enrollment"][];
        };
      };

      layouts: {
        conversation: ({
          request,
          response,
          head,
          sidebarOnSmallScreen,
          mainIsAScrollingPane,
          body,
        }: {
          request: express.Request<
            { courseReference: string; conversationReference?: string },
            HTML,
            {},
            {
              conversations?: {
                conversationsPage?: string;
                search?: string;
                filters?: {
                  isQuick?: "true";
                  isUnread?: "true" | "false";
                  types?: Application["web"]["locals"]["helpers"]["conversationTypes"][number][];
                  isResolved?: "true" | "false";
                  isAnnouncement?: "true" | "false";
                  participantses?: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number][];
                  isPinned?: "true" | "false";
                  tagsReferences?: string[];
                };
              };
              messages?: object;
              newConversation?: object;
            },
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          response: express.Response<
            HTML,
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          head: HTML;
          sidebarOnSmallScreen?: boolean;
          mainIsAScrollingPane?: boolean;
          body: HTML;
        }) => HTML;
      };

      partials: {
        conversation: ({
          request,
          response,
          conversation,
          searchResult,
          message,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          conversation: NonNullable<
            ReturnType<
              Application["web"]["locals"]["helpers"]["getConversation"]
            >
          >;
          searchResult?:
            | {
                type: "conversationTitle";
                highlight: HTML;
              }
            | {
                type: "messageAuthorUserName";
                message: NonNullable<
                  ReturnType<
                    Application["web"]["locals"]["helpers"]["getMessage"]
                  >
                >;
                highlight: HTML;
              }
            | {
                type: "messageContent";
                message: NonNullable<
                  ReturnType<
                    Application["web"]["locals"]["helpers"]["getMessage"]
                  >
                >;
                snippet: HTML;
              };
          message?: NonNullable<
            ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
          >;
        }) => HTML;
      };

      helpers: {
        conversationParticipantses: ["everyone", "staff", "selected-people"];

        conversationTypes: ["question", "note", "chat"];

        getConversation: ({
          request,
          response,
          conversationReference,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          conversationReference: string;
        }) =>
          | {
              id: number;
              createdAt: string;
              updatedAt: string | null;
              reference: string;
              authorEnrollment: Application["web"]["locals"]["Types"]["MaybeEnrollment"];
              participants: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
              anonymousAt: string | null;
              type: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
              resolvedAt: string | null;
              announcementAt: string | null;
              pinnedAt: string | null;
              title: string;
              titleSearch: string;
              nextMessageReference: number;
              selectedParticipants: Application["web"]["locals"]["Types"]["Enrollment"][];
              taggings: {
                id: number;
                tag: {
                  id: number;
                  reference: string;
                  name: string;
                  staffOnlyAt: string | null;
                };
              }[];
              messagesCount: number;
              readingsCount: number;
              endorsements: {
                id: number;
                enrollment: Application["web"]["locals"]["Types"]["MaybeEnrollment"];
              }[];
            }
          | undefined;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.helpers.conversationParticipantses = [
    "everyone",
    "staff",
    "selected-people",
  ];

  application.web.locals.helpers.conversationTypes = [
    "question",
    "note",
    "chat",
  ];

  application.web.use<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      const conversation = application.web.locals.helpers.getConversation({
        request,
        response,
        conversationReference: request.params.conversationReference,
      });
      if (conversation === undefined) return next();
      response.locals.conversation = conversation;

      response.locals.messageDraft = application.database.get<{
        id: number;
        createdAt: string;
        contentSource: string;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "contentSource"
          FROM "messageDrafts"
          WHERE
            "conversation" = ${response.locals.conversation.id} AND
            "authorEnrollment" = ${response.locals.enrollment.id}
        `
      );

      response.locals.enrollmentsTyping =
        response.locals.enrollment.courseRole === "staff"
          ? application.database
              .all<{
                enrollmentId: number;
                userId: number;
                userLastSeenOnlineAt: string;
                userReference: string;
                userEmail: string;
                userName: string;
                userAvatar: string | null;
                userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
                userBiographySource: string | null;
                userBiographyPreprocessed: HTML | null;
                enrollmentReference: string;
                enrollmentCourseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
              }>(
                sql`
                  SELECT
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
                  FROM "enrollments"
                  JOIN "users" ON "enrollments"."user" = "users"."id"
                  JOIN "messageDrafts" ON
                    "enrollments"."id" = "messageDrafts"."authorEnrollment" AND
                    "messageDrafts"."conversation" = ${
                      response.locals.conversation.id
                    } AND
                    ${new Date(
                      Date.now() - 5 * 60 * 1000
                    ).toISOString()} < "messageDrafts"."createdAt"
                  WHERE
                    "enrollments"."id" != ${response.locals.enrollment.id}
                  ORDER BY
                    "enrollments"."courseRole" = 'staff' DESC,
                    "users"."name" ASC
                `
              )
              .map((selectedParticipant) => ({
                id: selectedParticipant.enrollmentId,
                user: {
                  id: selectedParticipant.userId,
                  lastSeenOnlineAt: selectedParticipant.userLastSeenOnlineAt,
                  reference: selectedParticipant.userReference,
                  email: selectedParticipant.userEmail,
                  name: selectedParticipant.userName,
                  avatar: selectedParticipant.userAvatar,
                  avatarlessBackgroundColor:
                    selectedParticipant.userAvatarlessBackgroundColor,
                  biographySource: selectedParticipant.userBiographySource,
                  biographyPreprocessed:
                    selectedParticipant.userBiographyPreprocessed,
                },
                reference: selectedParticipant.enrollmentReference,
                courseRole: selectedParticipant.enrollmentCourseRole,
              }))
          : [];

      next();
    }
  );

  application.web.locals.helpers.getConversation = ({
    request,
    response,
    conversationReference,
  }) => {
    const conversationRow = application.database.get<{
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
      authorUserAvatarlessBackgroundColor:
        | Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
        | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentCourseRole:
        | Application["web"]["locals"]["helpers"]["courseRoles"][number]
        | null;
      participants: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
      anonymousAt: string | null;
      type: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
      resolvedAt: string | null;
      announcementAt: string | null;
      pinnedAt: string | null;
      title: string;
      titleSearch: string;
      nextMessageReference: number;
    }>(
      sql`
        SELECT
          "conversations"."id",
          "conversations"."createdAt",
          "conversations"."updatedAt",
          "conversations"."reference",
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
          "conversations"."participants",
          "conversations"."anonymousAt",
          "conversations"."type",
          "conversations"."resolvedAt",
          "conversations"."announcementAt",
          "conversations"."pinnedAt",
          "conversations"."title",
          "conversations"."titleSearch",
          "conversations"."nextMessageReference"
        FROM "conversations"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "conversations"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        WHERE
          "conversations"."course" = ${response.locals.course.id} AND
          "conversations"."reference" = ${conversationReference} AND (
            "conversations"."participants" = 'everyone' $${
              response.locals.enrollment.courseRole === "staff"
                ? sql`OR "conversations"."participants" = 'staff'`
                : sql``
            } OR EXISTS(
              SELECT TRUE
              FROM "conversationSelectedParticipants"
              WHERE
                "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                "conversationSelectedParticipants"."enrollment" = ${
                  response.locals.enrollment.id
                }
            )
          )
      `
    );
    if (conversationRow === undefined) return undefined;
    const conversation = {
      id: conversationRow.id,
      createdAt: conversationRow.createdAt,
      updatedAt: conversationRow.updatedAt,
      reference: conversationRow.reference,
      authorEnrollment:
        conversationRow.authorEnrollmentId !== null &&
        conversationRow.authorUserId !== null &&
        conversationRow.authorUserLastSeenOnlineAt !== null &&
        conversationRow.authorUserReference !== null &&
        conversationRow.authorUserEmail !== null &&
        conversationRow.authorUserName !== null &&
        conversationRow.authorUserAvatarlessBackgroundColor !== null &&
        conversationRow.authorEnrollmentReference !== null &&
        conversationRow.authorEnrollmentCourseRole !== null
          ? {
              id: conversationRow.authorEnrollmentId,
              user: {
                id: conversationRow.authorUserId,
                lastSeenOnlineAt: conversationRow.authorUserLastSeenOnlineAt,
                reference: conversationRow.authorUserReference,
                email: conversationRow.authorUserEmail,
                name: conversationRow.authorUserName,
                avatar: conversationRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  conversationRow.authorUserAvatarlessBackgroundColor,
                biographySource: conversationRow.authorUserBiographySource,
                biographyPreprocessed:
                  conversationRow.authorUserBiographyPreprocessed,
              },
              reference: conversationRow.authorEnrollmentReference,
              courseRole: conversationRow.authorEnrollmentCourseRole,
            }
          : ("no-longer-enrolled" as const),
      participants: conversationRow.participants,
      anonymousAt: conversationRow.anonymousAt,
      type: conversationRow.type,
      resolvedAt: conversationRow.resolvedAt,
      announcementAt: conversationRow.announcementAt,
      pinnedAt: conversationRow.pinnedAt,
      title: conversationRow.title,
      titleSearch: conversationRow.titleSearch,
      nextMessageReference: conversationRow.nextMessageReference,
    };

    const selectedParticipants =
      conversation.participants === "everyone"
        ? []
        : application.database
            .all<{
              enrollmentId: number;
              userId: number;
              userLastSeenOnlineAt: string;
              userReference: string;
              userEmail: string;
              userName: string;
              userAvatar: string | null;
              userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
              userBiographySource: string | null;
              userBiographyPreprocessed: HTML | null;
              enrollmentReference: string;
              enrollmentCourseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
            }>(
              sql`
                SELECT
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
                FROM "conversationSelectedParticipants"
                JOIN "enrollments" ON "conversationSelectedParticipants"."enrollment" = "enrollments"."id"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                WHERE
                  "conversationSelectedParticipants"."conversation" = ${conversation.id} AND
                  "enrollments"."id" != ${response.locals.enrollment.id}
                ORDER BY
                  "enrollments"."courseRole" = 'staff' DESC,
                  "users"."name" ASC
              `
            )
            .map((selectedParticipant) => ({
              id: selectedParticipant.enrollmentId,
              user: {
                id: selectedParticipant.userId,
                lastSeenOnlineAt: selectedParticipant.userLastSeenOnlineAt,
                reference: selectedParticipant.userReference,
                email: selectedParticipant.userEmail,
                name: selectedParticipant.userName,
                avatar: selectedParticipant.userAvatar,
                avatarlessBackgroundColor:
                  selectedParticipant.userAvatarlessBackgroundColor,
                biographySource: selectedParticipant.userBiographySource,
                biographyPreprocessed:
                  selectedParticipant.userBiographyPreprocessed,
              },
              reference: selectedParticipant.enrollmentReference,
              courseRole: selectedParticipant.enrollmentCourseRole,
            }));

    const taggings = application.database
      .all<{
        id: number;
        tagId: number;
        tagReference: string;
        tagName: string;
        tagStaffOnlyAt: string | null;
      }>(
        sql`
          SELECT
            "taggings"."id",
            "tags"."id" AS "tagId",
            "tags"."reference" AS "tagReference",
            "tags"."name" AS "tagName",
            "tags"."staffOnlyAt" AS "tagStaffOnlyAt"
          FROM "taggings"
          JOIN "tags" ON "taggings"."tag" = "tags"."id"
          $${
            response.locals.enrollment.courseRole === "student"
              ? sql`AND "tags"."staffOnlyAt" IS NULL`
              : sql``
          }
          WHERE "taggings"."conversation" = ${conversation.id}
          ORDER BY "tags"."order" ASC
        `
      )
      .map((tagging) => ({
        id: tagging.id,
        tag: {
          id: tagging.tagId,
          reference: tagging.tagReference,
          name: tagging.tagName,
          staffOnlyAt: tagging.tagStaffOnlyAt,
        },
      }));

    const messagesCount = application.database.get<{
      messagesCount: number;
    }>(
      sql`
        SELECT COUNT(*) AS "messagesCount"
        FROM "messages"
        WHERE "messages"."conversation" = ${conversation.id}
      `
    )!.messagesCount;

    const readingsCount = application.database.get<{ readingsCount: number }>(
      sql`
        SELECT COUNT(*) AS "readingsCount"
        FROM "readings"
        JOIN "messages" ON
          "readings"."message" = "messages"."id" AND
          "messages"."conversation" = ${conversation.id}
        WHERE "readings"."enrollment" = ${response.locals.enrollment.id}
      `
    )!.readingsCount;

    const endorsements =
      conversation.type === "question"
        ? application.database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userLastSeenOnlineAt: string | null;
              userReference: string;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userAvatarlessBackgroundColor:
                | Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
                | null;
              userBiographySource: string | null;
              userBiographyPreprocessed: HTML | null;
              enrollmentReference: string | null;
              enrollmentCourseRole:
                | Application["web"]["locals"]["helpers"]["courseRoles"][number]
                | null;
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
                JOIN "messages" ON
                  "endorsements"."message" = "messages"."id" AND
                  "messages"."conversation" = ${conversation.id}
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
                        biographyPreprocessed:
                          endorsement.userBiographyPreprocessed,
                      },
                      reference: endorsement.enrollmentReference,
                      courseRole: endorsement.enrollmentCourseRole,
                    }
                  : ("no-longer-enrolled" as const),
            }))
        : [];

    return {
      ...conversation,
      selectedParticipants,
      taggings,
      messagesCount,
      readingsCount,
      endorsements,
    };
  };

  application.web.locals.layouts.conversation = ({
    request,
    response,
    head,
    sidebarOnSmallScreen = false,
    mainIsAScrollingPane = false,
    body,
  }) => {
    const search =
      typeof request.query.conversations?.search === "string" &&
      request.query.conversations.search.trim() !== ""
        ? application.web.locals.helpers.sanitizeSearch(
            request.query.conversations.search
          )
        : undefined;

    const filters: {
      isQuick?: "true";
      isUnread?: "true" | "false";
      types?: Application["web"]["locals"]["helpers"]["conversationTypes"][number][];
      isResolved?: "true" | "false";
      isAnnouncement?: "true" | "false";
      participantses?: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number][];
      isPinned?: "true" | "false";
      tagsReferences?: string[];
    } = {};
    if (
      typeof request.query.conversations?.filters === "object" &&
      request.query.conversations.filters !== null
    ) {
      if (
        typeof request.query.conversations.filters.isUnread === "string" &&
        ["true", "false"].includes(request.query.conversations.filters.isUnread)
      )
        filters.isUnread = request.query.conversations.filters.isUnread;
      if (Array.isArray(request.query.conversations.filters.types)) {
        const types = [
          ...new Set(
            request.query.conversations.filters.types.filter((type) =>
              application.web.locals.helpers.conversationTypes.includes(type)
            )
          ),
        ];
        if (types.length > 0) filters.types = types;
      }
      if (
        filters.types?.includes("question") &&
        typeof request.query.conversations.filters.isResolved === "string" &&
        ["true", "false"].includes(
          request.query.conversations.filters.isResolved
        )
      )
        filters.isResolved = request.query.conversations.filters.isResolved;
      if (
        filters.types?.includes("note") &&
        typeof request.query.conversations.filters.isAnnouncement ===
          "string" &&
        ["true", "false"].includes(
          request.query.conversations.filters.isAnnouncement
        )
      )
        filters.isAnnouncement =
          request.query.conversations.filters.isAnnouncement;
      if (Array.isArray(request.query.conversations.filters.participantses)) {
        const participantses = [
          ...new Set(
            request.query.conversations.filters.participantses.filter(
              (conversationParticipants) =>
                application.web.locals.helpers.conversationParticipantses.includes(
                  conversationParticipants
                )
            )
          ),
        ];
        if (participantses.length > 0) filters.participantses = participantses;
      }
      if (
        typeof request.query.conversations.filters.isPinned === "string" &&
        ["true", "false"].includes(request.query.conversations.filters.isPinned)
      )
        filters.isPinned = request.query.conversations.filters.isPinned;
      if (Array.isArray(request.query.conversations.filters.tagsReferences)) {
        const tagsReferences = [
          ...new Set(
            request.query.conversations.filters.tagsReferences.filter(
              (tagReference) =>
                response.locals.tags.find(
                  (tag) => tagReference === tag.reference
                ) !== undefined
            )
          ),
        ];
        if (tagsReferences.length > 0) filters.tagsReferences = tagsReferences;
      }
      if (
        Object.keys(filters).length > 0 &&
        request.query.conversations.filters.isQuick === "true"
      )
        filters.isQuick = request.query.conversations.filters.isQuick;
    }

    const conversationsPageSize = 999999; // TODO: Pagination: 15
    const conversationsPage =
      typeof request.query.conversations?.conversationsPage === "string" &&
      request.query.conversations.conversationsPage.match(/^[1-9][0-9]*$/)
        ? Number(request.query.conversations.conversationsPage)
        : 1;

    const conversationsWithSearchResults = application.database
      .all<{
        reference: string;
        conversationTitleSearchResultHighlight?: string | null;
        messageAuthorUserNameSearchResultMessageReference?: string | null;
        messageAuthorUserNameSearchResultHighlight?: string | null;
        messageContentSearchResultMessageReference?: string | null;
        messageContentSearchResultSnippet?: string | null;
      }>(
        sql`
          SELECT
            "conversations"."reference"
            $${
              search === undefined
                ? sql``
                : sql`
                    ,
                    "conversationTitleSearchResult"."highlight" AS "conversationTitleSearchResultHighlight",
                    "messageAuthorUserNameSearchResult"."messageReference" AS "messageAuthorUserNameSearchResultMessageReference",
                    "messageAuthorUserNameSearchResult"."highlight" AS "messageAuthorUserNameSearchResultHighlight",
                    "messageContentSearchResult"."messageReference" AS "messageContentSearchResultMessageReference",
                    "messageContentSearchResult"."snippet" AS "messageContentSearchResultSnippet"
                  `
            }
          FROM "conversations"
          $${
            search === undefined
              ? sql``
              : sql`
                LEFT JOIN (
                  SELECT
                    "rowid",
                    "rank",
                    highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "conversationsTitleSearchIndex"
                  WHERE "conversationsTitleSearchIndex" MATCH ${search}
                ) AS "conversationTitleSearchResult" ON "conversations"."id" = "conversationTitleSearchResult"."rowid"

                LEFT JOIN (
                  SELECT
                    "messages"."reference" AS  "messageReference",
                    "messages"."conversation" AS "conversationId",
                    "usersNameSearchIndex"."rank" AS "rank",
                    highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "usersNameSearchIndex"
                  JOIN "users" ON "usersNameSearchIndex"."rowid" = "users"."id"
                  JOIN "enrollments" ON "users"."id" = "enrollments"."user"
                  JOIN "messages" ON
                    "enrollments"."id" = "messages"."authorEnrollment"
                    $${
                      response.locals.enrollment.courseRole === "staff"
                        ? sql``
                        : sql`
                            AND (
                              "messages"."anonymousAt" IS NULL OR
                              "messages"."authorEnrollment" = ${response.locals.enrollment.id}
                            )
                          `
                    }
                  WHERE "usersNameSearchIndex" MATCH ${search}
                ) AS "messageAuthorUserNameSearchResult" ON "conversations"."id" = "messageAuthorUserNameSearchResult"."conversationId"

                LEFT JOIN (
                  SELECT
                    "messages"."reference" AS "messageReference",
                    "messages"."conversation" AS "conversationId",
                    "messagesContentSearchIndex"."rank" AS "rank",
                    snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "snippet"
                  FROM "messagesContentSearchIndex"
                  JOIN "messages" ON "messagesContentSearchIndex"."rowid" = "messages"."id"
                  WHERE "messagesContentSearchIndex" MATCH ${search}
                ) AS "messageContentSearchResult" ON "conversations"."id" = "messageContentSearchResult"."conversationId"
              `
          }
          $${
            filters.tagsReferences === undefined
              ? sql``
              : sql`
                  JOIN "taggings" ON "conversations"."id" = "taggings"."conversation"
                  JOIN "tags" ON
                    "taggings"."tag" = "tags"."id" AND
                    "tags"."reference" IN ${filters.tagsReferences}
                `
          }
          WHERE
            "conversations"."course" = ${response.locals.course.id} AND (
              "conversations"."participants" = 'everyone' $${
                response.locals.enrollment.courseRole === "staff"
                  ? sql`OR "conversations"."participants" = 'staff'`
                  : sql``
              } OR EXISTS(
                SELECT TRUE
                FROM "conversationSelectedParticipants"
                WHERE
                  "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                  "conversationSelectedParticipants"."enrollment" = ${
                    response.locals.enrollment.id
                  }
              )
            )
            $${
              search === undefined
                ? sql``
                : sql`
                    AND (
                      "conversationTitleSearchResult"."rank" IS NOT NULL OR
                      "messageAuthorUserNameSearchResult"."rank" IS NOT NULL OR
                      "messageContentSearchResult"."rank" IS NOT NULL
                    )
                  `
            }
            $${
              filters.isUnread === undefined
                ? sql``
                : sql`
                    AND $${
                      filters.isUnread === "true" ? sql`` : sql`NOT`
                    } EXISTS(
                      SELECT TRUE
                      FROM "messages"
                      LEFT JOIN "readings" ON
                        "messages"."id" = "readings"."message" AND
                        "readings"."enrollment" = ${
                          response.locals.enrollment.id
                        }
                      WHERE
                        "conversations"."id" = "messages"."conversation" AND
                        "readings"."id" IS NULL
                    )
                  `
            }
            $${
              filters.types === undefined
                ? sql``
                : sql`
                    AND "conversations"."type" IN ${filters.types}
                  `
            }
            $${
              filters.isResolved === undefined
                ? sql``
                : sql`
                    AND (
                      (
                        "conversations"."type" = 'question' AND
                        "conversations"."resolvedAt" IS $${
                          filters.isResolved === "true" ? sql`NOT` : sql``
                        } NULL
                      ) OR
                      "conversations"."type" != 'question'
                    )
                  `
            }
            $${
              filters.isAnnouncement === undefined
                ? sql``
                : sql`
                    AND (
                      (
                        "conversations"."type" = 'note' AND
                        "conversations"."announcementAt" IS $${
                          filters.isAnnouncement === "true" ? sql`NOT` : sql``
                        } NULL
                      ) OR
                      "conversations"."type" != 'note'
                    )
                  `
            }
            $${
              filters.participantses === undefined
                ? sql``
                : sql`
                    AND "conversations"."participants" IN ${filters.participantses}
                  `
            }
            $${
              filters.isPinned === undefined
                ? sql``
                : sql`
                    AND "conversations"."pinnedAt" IS $${
                      filters.isPinned === "true" ? sql`NOT` : sql``
                    } NULL
                  `
            }
          GROUP BY "conversations"."id"
          ORDER BY
            "conversations"."pinnedAt" IS NOT NULL DESC,
            $${
              search === undefined
                ? sql``
                : sql`
                    min(
                      coalesce("conversationTitleSearchResult"."rank", 0),
                      coalesce("messageAuthorUserNameSearchResult"."rank", 0),
                      coalesce("messageContentSearchResult"."rank", 0)
                    ) ASC,
                  `
            }
            coalesce("conversations"."updatedAt", "conversations"."createdAt") DESC
          LIMIT ${conversationsPageSize + 1} OFFSET ${
          (conversationsPage - 1) * conversationsPageSize
        }
        `
      )
      .map((conversationWithSearchResult) => {
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference: conversationWithSearchResult.reference,
        });
        assert(conversation !== undefined);

        const searchResult =
          typeof conversationWithSearchResult.conversationTitleSearchResultHighlight ===
          "string"
            ? ({
                type: "conversationTitle",
                highlight:
                  conversationWithSearchResult.conversationTitleSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight ===
                "string"
            ? ({
                type: "messageAuthorUserName",
                message: application.web.locals.helpers.getMessage({
                  request,
                  response,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference,
                })!,
                highlight:
                  conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageContentSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageContentSearchResultSnippet ===
                "string"
            ? ({
                type: "messageContent",
                message: application.web.locals.helpers.getMessage({
                  request,
                  response,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageContentSearchResultMessageReference,
                })!,
                snippet:
                  conversationWithSearchResult.messageContentSearchResultSnippet,
              } as const)
            : undefined;

        return { conversation, searchResult };
      });
    const moreConversationsExist =
      conversationsWithSearchResults.length === conversationsPageSize + 1;
    if (moreConversationsExist) conversationsWithSearchResults.pop();

    // TODO: Conversation drafts
    // conversationsWithSearchResults.unshift(
    //   ...app.database
    //     .all<{
    //       id: number;
    //       createdAt: string;
    //       updatedAt: string | null;
    //       reference: string;
    //       type: string | null;
    //       isPinned: "true" | null;
    //       isStaffOnly: "true" | null;
    //       title: string | null;
    //       content: string | null;
    //       tagsReferences: string | null;
    //     }>(
    //       sql`
    //         SELECT "id",
    //               "createdAt",
    //               "updatedAt",
    //               "reference",
    //               "type",
    //               "isPinned",
    //               "isStaffOnly",
    //               "title",
    //               "content",
    //               "tagsReferences"
    //         FROM "conversationDrafts"
    //         WHERE "course" = ${response.locals.course.id} AND
    //               "authorEnrollment" = ${response.locals.enrollment.id}
    //         ORDER BY coalesce("updatedAt", "createdAt") DESC
    //       `
    //     )
    //     .map((conversationDraft) => {
    //       const taggings = app.database
    //         .all<{
    //           id: number;
    //           reference: string;
    //           name: string;
    //           staffOnlyAt: string | null;
    //         }>(
    //           sql`
    //             SELECT "id",
    //                   "reference",
    //                   "name",
    //                   "staffOnlyAt"
    //             FROM "tags"
    //             WHERE "course" = ${response.locals.course.id}
    //                   $${
    //                     response.locals.enrollment.courseRole === "student"
    //                       ? sql`AND "tags"."staffOnlyAt" IS NULL`
    //                       : sql``
    //                   }
    //             ORDER BY "tags"."id" ASC
    //           `
    //         )
    //         .map((tag) => ({
    //           id: null as unknown as number,
    //           tag: {
    //             id: tag.id,
    //             reference: tag.reference,
    //             name: tag.name,
    //             staffOnlyAt: tag.staffOnlyAt,
    //           },
    //         }));

    //       return {
    //         conversation: {
    //           id: conversationDraft.id,
    //           createdAt: conversationDraft.createdAt,
    //           updatedAt: conversationDraft.updatedAt,
    //           reference: conversationDraft.reference,
    //           authorEnrollment: response.locals.enrollment,
    //           anonymousAt: null,
    //           type: conversationDraft.type,
    //           resolvedAt: null,
    //           pinnedAt: conversationDraft.isPinned
    //             ? new Date().toISOString()
    //             : null,
    //           staffOnlyAt: conversationDraft.isStaffOnly
    //             ? new Date().toISOString()
    //             : null,
    //           title: conversationDraft.title,
    //           titleSearch: html`${conversationDraft.title ?? ""}`,
    //           nextMessageReference: null as unknown as number,
    //           taggings,
    //           messagesCount: 0,
    //           readingsCount: 0,
    //           endorsements: [],
    //         },
    //         searchResult: undefined,
    //       };
    //     })
    // );

    return application.web.locals.layouts.base({
      request,
      response,
      head,
      extraHeaders: html`
        $${sidebarOnSmallScreen
          ? html``
          : html`
              <div
                key="header--menu--secondary"
                css="${css`
                  && {
                    @media (min-width: 900px) {
                      display: none;
                    }
                  }
                `}"
              >
                <div
                  css="${css`
                    padding: var(--space--1) var(--space--0);
                  `}"
                >
                  <a
                    href="https://${application.configuration
                      .hostname}/courses/${response.locals.course.reference}"
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <i class="bi bi-arrow-left"></i>
                    <i class="bi bi-chat-text"></i>
                    Conversations
                  </a>
                </div>
              </div>
            `}
      `,
      body: html`
        <div
          key="layout--conversation"
          css="${css`
            width: 100%;
            height: 100%;
            display: flex;
          `}"
        >
          <div
            key="layout--conversation--sidebar--/${response.locals.course
              .reference}"
            css="${css`
              display: flex;
              flex-direction: column;
              @media (max-width: 899px) {
                flex: 1;
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
                border-right: var(--border-width--1) solid
                  var(--color--zinc--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--zinc--700);
                }
              }
            `} ${sidebarOnSmallScreen
              ? css``
              : css`
                  @media (max-width: 899px) {
                    display: none;
                  }
                `}"
          >
            <div
              css="${css`
                background-color: var(--color--zinc--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--zinc--800);
                }
                max-height: 50%;
                overflow: auto;
                border-bottom: var(--border-width--1) solid
                  var(--color--zinc--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--zinc--700);
                }
              `}"
            >
              <div
                css="${css`
                  margin: var(--space--4);
                  @media (max-width: 899px) {
                    display: flex;
                    justify-content: center;
                  }
                `}"
              >
                <div
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    @media (max-width: 899px) {
                      flex: 1;
                      min-width: var(--width--0);
                      max-width: var(--width--prose);
                    }
                  `}"
                >
                  <div
                    css="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      align-items: baseline;
                      gap: var(--space--2);
                      flex-wrap: wrap;
                    `}"
                  >
                    <div
                      class="strong"
                      css="${css`
                        font-size: var(--font-size--2xs);
                        line-height: var(--line-height--2xs);
                      `}"
                    >
                      New:
                    </div>
                    $${response.locals.enrollment.courseRole === "staff"
                      ? html`
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/note${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--blue"
                          >
                            $${iconsConversationType.note.fill} Note
                          </a>
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/question${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${iconsConversationType.question.regular} Question
                          </a>
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/chat${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${iconsConversationType.chat.regular} Chat
                          </a>
                        `
                      : html`
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/question${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--blue"
                          >
                            $${iconsConversationType.question.fill} Question
                          </a>
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/note${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${iconsConversationType.note.regular} Note
                          </a>
                          <a
                            href="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/new/chat${qs.stringify(
                              { conversations: request.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${iconsConversationType.chat.regular} Chat
                          </a>
                        `}
                  </div>

                  <hr class="separator" />

                  <div
                    css="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      align-items: baseline;
                      column-gap: var(--space--4);
                      row-gap: var(--space--2);
                      flex-wrap: wrap;
                    `}"
                  >
                    <div
                      class="strong"
                      css="${css`
                        font-size: var(--font-size--2xs);
                        line-height: var(--line-height--2xs);
                      `}"
                    >
                      Quick Filters:
                    </div>
                    $${response.locals.enrollment.courseRole === "staff"
                      ? html`
                          $${!util.isDeepStrictEqual(
                            request.query.conversations?.filters,
                            {
                              isQuick: "true",
                              types: ["question"],
                              isResolved: "false",
                            }
                          )
                            ? html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}${request.path}${qs.stringify(
                                    {
                                      conversations: {
                                        filters: {
                                          isQuick: "true",
                                          types: ["question"],
                                          isResolved: "false",
                                        },
                                      },
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <i class="bi bi-patch-exclamation"></i>
                                  Unresolved Questions
                                </a>
                              `
                            : html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}${request.path}${qs.stringify(
                                    {
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent text--rose"
                                >
                                  <i class="bi bi-patch-exclamation-fill"></i>
                                  Unresolved Questions
                                </a>
                              `}
                        `
                      : html``}
                    $${!util.isDeepStrictEqual(
                      request.query.conversations?.filters,
                      {
                        isQuick: "true",
                        types: ["note"],
                        isAnnouncement: "true",
                      }
                    )
                      ? html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    types: ["note"],
                                    isAnnouncement: "true",
                                  },
                                },
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-megaphone"></i>
                            Announcements
                          </a>
                        `
                      : html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--orange"
                          >
                            <i class="bi bi-megaphone-fill"></i>
                            Announcements
                          </a>
                        `}
                    $${response.locals.enrollment.courseRole === "student"
                      ? html`
                          $${!util.isDeepStrictEqual(
                            request.query.conversations?.filters,
                            {
                              isQuick: "true",
                              types: ["question"],
                            }
                          )
                            ? html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}${request.path}${qs.stringify(
                                    {
                                      conversations: {
                                        filters: {
                                          isQuick: "true",
                                          types: ["question"],
                                        },
                                      },
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <i class="bi bi-patch-question"></i>
                                  Questions
                                </a>
                              `
                            : html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}${request.path}${qs.stringify(
                                    {
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent text--rose"
                                >
                                  <i class="bi bi-patch-question-fill"></i>
                                  Questions
                                </a>
                              `}
                        `
                      : html``}
                    $${!util.isDeepStrictEqual(
                      request.query.conversations?.filters,
                      {
                        isQuick: "true",
                        types: ["chat"],
                      }
                    )
                      ? html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    types: ["chat"],
                                  },
                                },
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-chat-text"></i>
                            Chats
                          </a>
                        `
                      : html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--cyan"
                          >
                            <i class="bi bi-chat-text-fill"></i>
                            Chats
                          </a>
                        `}
                    $${!util.isDeepStrictEqual(
                      request.query.conversations?.filters,
                      {
                        isQuick: "true",
                        isUnread: "true",
                      }
                    )
                      ? html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    isUnread: "true",
                                  },
                                },
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-eyeglasses"></i>
                            Unread
                          </a>
                        `
                      : html`
                          <a
                            href="https://${application.configuration
                              .hostname}${request.path}${qs.stringify(
                              {
                                messages: request.query.messages,
                                newConversation: request.query.newConversation,
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--blue"
                          >
                            <i class="bi bi-eyeglasses"></i>
                            Unread
                          </a>
                        `}
                  </div>

                  <hr class="separator" />

                  <div
                    key="search-and-filters"
                    css="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    <div
                      css="${css`
                        display: flex;
                        column-gap: var(--space--4);
                        row-gap: var(--space--2);
                        flex-wrap: wrap;
                      `}"
                    >
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          key="search-and-filters--show-hide--search"
                          type="checkbox"
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          $${search !== undefined ? html`checked` : html``}
                          javascript="${javascript`
                            this.isModified = false;

                            this.onchange = () => {
                              const searchAndFilters = this.closest('[key="search-and-filters"]');
                              const searchAndFiltersForm = searchAndFilters.querySelector('[key="search-and-filters--form"]');
                              const searchAndFiltersFormSection = searchAndFiltersForm.querySelector('[key="search"]');
                              searchAndFiltersForm.hidden = [...searchAndFilters.querySelectorAll('[key="search-and-filters--show-hide--search"], [key="search-and-filters--show-hide--filters"]')]
                                .every((element) => !element.checked);
                              searchAndFiltersFormSection.hidden = !this.checked;
                              for (const element of leafac.descendants(searchAndFiltersFormSection))
                                if (element.disabled !== undefined) element.disabled = !this.checked;
                              if (this.checked)
                                searchAndFiltersFormSection.querySelector('[name="conversations[search]"]').focus();
                            };
                          `}"
                        />
                        <span>
                          <i class="bi bi-search"></i>
                          Search
                        </span>
                        <span class="text--blue">
                          <i class="bi bi-search"></i>
                          Search
                        </span>
                      </label>
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          key="search-and-filters--show-hide--filters"
                          type="checkbox"
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          $${Object.keys(filters).length > 0 &&
                          filters.isQuick !== "true"
                            ? html`checked`
                            : html``}
                          javascript="${javascript`
                            this.isModified = false;
                            
                            this.onchange = () => {
                              const searchAndFilters = this.closest('[key="search-and-filters"]');
                              const searchAndFiltersForm = searchAndFilters.querySelector('[key="search-and-filters--form"]');
                              const searchAndFiltersFormSection = searchAndFiltersForm.querySelector('[key="filters"]');
                              searchAndFiltersForm.hidden = [...searchAndFilters.querySelectorAll('[key="search-and-filters--show-hide--search"], [key="search-and-filters--show-hide--filters"]')]
                                .every((element) => !element.checked);
                              searchAndFiltersFormSection.hidden = !this.checked;
                              for (const element of leafac.descendants(searchAndFiltersFormSection))
                                if (element.disabled !== undefined) element.disabled = !this.checked;
                            };
                          `}"
                        />
                        <span>
                          <i class="bi bi-funnel"></i>
                          Filters
                        </span>
                        <span class="text--blue">
                          <i class="bi bi-funnel-fill"></i>
                          Filters
                        </span>
                      </label>
                      $${request.query.conversations === undefined &&
                      conversationsWithSearchResults.length > 0 &&
                      conversationsWithSearchResults.some(
                        ({ conversation }) =>
                          conversation.readingsCount <
                          conversation.messagesCount
                      )
                        ? html`
                            <form
                              method="POST"
                              action="https://${application.configuration
                                .hostname}/courses/${response.locals.course
                                .reference}/conversations/mark-all-conversations-as-read${qs.stringify(
                                { redirect: request.originalUrl.slice(1) },
                                { addQueryPrefix: true }
                              )}"
                            >
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent"
                              >
                                <i class="bi bi-check-all"></i>
                                Mark All Conversations as Read
                              </button>
                            </form>
                          `
                        : html``}
                    </div>

                    <form
                      key="search-and-filters--form"
                      method="GET"
                      action="https://${application.configuration
                        .hostname}${request.path}${qs.stringify(
                        {
                          messages: request.query.messages,
                          newConversation: request.query.newConversation,
                        },
                        { addQueryPrefix: true }
                      )}"
                      novalidate
                      $${search !== undefined ||
                      (Object.keys(filters).length > 0 &&
                        filters.isQuick !== "true")
                        ? html``
                        : html`hidden`}
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--1);
                      `}"
                      javascript="${javascript`
                        this.isModified = false;
                      `}"
                    >
                      <div
                        key="search"
                        $${search !== undefined ? html`` : html`hidden`}
                        css="${css`
                          display: flex;
                          gap: var(--space--2);
                          align-items: center;
                        `}"
                      >
                        <input
                          type="text"
                          name="conversations[search]"
                          value="${search !== undefined
                            ? request.query.conversations!.search!
                            : ""}"
                          placeholder="Search…"
                          $${search !== undefined ? html`` : html`disabled`}
                          class="input--text"
                        />
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Search",
                              },
                            });
                          `}"
                        >
                          <i class="bi bi-search"></i>
                        </button>
                        $${search !== undefined
                          ? html`
                              <a
                                href="https://${application.configuration
                                  .hostname}${request.path}${qs.stringify(
                                  {
                                    conversations: {
                                      filters:
                                        request.query.conversations?.filters,
                                    },
                                    messages: request.query.messages,
                                    newConversation:
                                      request.query.newConversation,
                                  },
                                  { addQueryPrefix: true }
                                )}"
                                class="button button--tight button--tight--inline button--transparent"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      touch: false,
                                      content: "Clear Search",
                                    },
                                  });
                                `}"
                              >
                                <i class="bi bi-x-lg"></i>
                              </a>
                            `
                          : html``}
                      </div>

                      <div
                        key="filters"
                        $${Object.keys(filters).length > 0 &&
                        filters.isQuick !== "true"
                          ? html``
                          : html`hidden`}
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div class="label">
                          <div class="label--text">Unread</div>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isUnread]"
                                value="true"
                                $${request.query.conversations?.filters
                                  ?.isUnread === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isUnread]"][value="false"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-eyeglasses"></i>
                                Unread
                              </span>
                              <span class="text--blue">
                                <i class="bi bi-eyeglasses"></i>
                                Unread
                              </span>
                            </label>
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isUnread]"
                                value="false"
                                $${request.query.conversations?.filters
                                  ?.isUnread === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isUnread]"][value="true"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-check-lg"></i>
                                Read
                              </span>
                              <span class="text--blue">
                                <i class="bi bi-check-lg"></i>
                                Read
                              </span>
                            </label>
                          </div>
                        </div>

                        <div class="label">
                          <p class="label--text">Type</p>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            $${application.web.locals.helpers.conversationTypes.map(
                              (conversationType) => html`
                                <label
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <input
                                    type="checkbox"
                                    name="conversations[filters][types][]"
                                    value="${conversationType}"
                                    $${request.query.conversations?.filters?.types?.includes(
                                      conversationType
                                    )
                                      ? html`checked`
                                      : html``}
                                    $${Object.keys(filters).length > 0 &&
                                    filters.isQuick !== "true"
                                      ? html``
                                      : html`disabled`}
                                    class="visually-hidden input--radio-or-checkbox--multilabel"
                                    javascript="${javascript`
                                      if (${
                                        conversationType === "question" ||
                                        conversationType === "note"
                                      })
                                        this.onchange = () => {
                                          if (this.checked) return;
                                          for (const element of this.closest("form").querySelectorAll(${
                                            conversationType === "question"
                                              ? `[name="conversations[filters][isResolved]"]`
                                              : conversationType === "note"
                                              ? `[name="conversations[filters][isAnnouncement]"]`
                                              : ``
                                          }))
                                            element.checked = false;
                                        };
                                    `}"
                                  />
                                  <span>
                                    $${iconsConversationType[conversationType]
                                      .regular}
                                    $${lodash.capitalize(conversationType)}
                                  </span>
                                  <span
                                    class="${textColorsConversationType[
                                      conversationType
                                    ]}"
                                  >
                                    $${iconsConversationType[conversationType]
                                      .fill}
                                    $${lodash.capitalize(conversationType)}
                                  </span>
                                </label>
                              `
                            )}
                          </div>
                        </div>

                        <div class="label">
                          <p class="label--text">Question Resolved</p>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isResolved]"
                                value="false"
                                $${request.query.conversations?.filters
                                  ?.isResolved === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (!this.checked) return;
                                    const form = this.closest("form");
                                    form.querySelector('[name="conversations[filters][types][]"][value="question"]').checked = true;
                                    form.querySelector('[name="conversations[filters][isResolved]"][value="true"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-patch-exclamation"></i>
                                Unresolved
                              </span>
                              <span class="text--rose">
                                <i class="bi bi-patch-exclamation-fill"></i>
                                Unresolved
                              </span>
                            </label>
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isResolved]"
                                value="true"
                                $${request.query.conversations?.filters
                                  ?.isResolved === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (!this.checked) return;
                                    const form = this.closest("form");
                                    form.querySelector('[name="conversations[filters][types][]"][value="question"]').checked = true;
                                    form.querySelector('[name="conversations[filters][isResolved]"][value="false"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-patch-check"></i>
                                Resolved
                              </span>
                              <span class="text--emerald">
                                <i class="bi bi-patch-check-fill"></i>
                                Resolved
                              </span>
                            </label>
                          </div>
                        </div>

                        <div class="label">
                          <p class="label--text">Announcement</p>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isAnnouncement]"
                                value="false"
                                $${request.query.conversations?.filters
                                  ?.isAnnouncement === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (!this.checked) return;
                                    const form = this.closest("form");
                                    form.querySelector('[name="conversations[filters][types][]"][value="note"]').checked = true;
                                    form.querySelector('[name="conversations[filters][isAnnouncement]"][value="true"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-sticky"></i>
                                Not an Announcement
                              </span>
                              <span class="text--orange">
                                <i class="bi bi-sticky-fill"></i>
                                Not an Announcement
                              </span>
                            </label>
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isAnnouncement]"
                                value="true"
                                $${request.query.conversations?.filters
                                  ?.isAnnouncement === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (!this.checked) return;
                                    const form = this.closest("form");
                                    form.querySelector('[name="conversations[filters][types][]"][value="note"]').checked = true;
                                    form.querySelector('[name="conversations[filters][isAnnouncement]"][value="false"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-megaphone"></i>
                                Announcement
                              </span>
                              <span class="text--orange">
                                <i class="bi bi-megaphone-fill"></i>
                                Announcement
                              </span>
                            </label>
                          </div>
                        </div>

                        <div class="label">
                          <p class="label--text">Participants</p>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            $${application.web.locals.helpers.conversationParticipantses.map(
                              (conversationParticipants) => html`
                                <label
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <input
                                    type="checkbox"
                                    name="conversations[filters][participantses][]"
                                    value="${conversationParticipants}"
                                    $${request.query.conversations?.filters?.participantses?.includes(
                                      conversationParticipants
                                    )
                                      ? html`checked`
                                      : html``}
                                    $${Object.keys(filters).length > 0 &&
                                    filters.isQuick !== "true"
                                      ? html``
                                      : html`disabled`}
                                    class="visually-hidden input--radio-or-checkbox--multilabel"
                                  />
                                  <span>
                                    $${iconsConversationParticipants[
                                      conversationParticipants
                                    ].regular}
                                    $${labelsConversationParticipants[
                                      conversationParticipants
                                    ]}
                                  </span>
                                  <span
                                    class="${textColorsConversationParticipants[
                                      conversationParticipants
                                    ]}"
                                  >
                                    $${iconsConversationParticipants[
                                      conversationParticipants
                                    ].fill}
                                    $${labelsConversationParticipants[
                                      conversationParticipants
                                    ]}
                                  </span>
                                </label>
                              `
                            )}
                          </div>
                        </div>

                        <div class="label">
                          <div class="label--text">
                            Pin
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    trigger: "click",
                                    content: "Pinned conversations are listed first.",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-info-circle"></i>
                            </button>
                          </div>
                          <div
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isPinned]"
                                value="true"
                                $${request.query.conversations?.filters
                                  ?.isPinned === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isPinned]"][value="false"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-pin"></i>
                                Pinned
                              </span>
                              <span class="text--amber">
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </span>
                            </label>
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isPinned]"
                                value="false"
                                $${request.query.conversations?.filters
                                  ?.isPinned === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isPinned]"][value="true"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-pin-angle"></i>
                                Unpinned
                              </span>
                              <span class="text--amber">
                                <i class="bi bi-pin-angle-fill"></i>
                                Unpinned
                              </span>
                            </label>
                          </div>
                        </div>

                        $${response.locals.tags.length === 0
                          ? html``
                          : html`
                              <div class="label">
                                <div class="label--text">
                                  Tags
                                  <button
                                    type="button"
                                    class="button button--tight button--tight--inline button--transparent"
                                    javascript="${javascript`
                                      leafac.setTippy({
                                        event,
                                        element: this,
                                        tippyProps: {
                                          trigger: "click",
                                          content: "Tags help to organize conversations.",
                                        },
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-info-circle"></i>
                                  </button>
                                </div>
                                <div
                                  css="${css`
                                    display: flex;
                                    flex-wrap: wrap;
                                    column-gap: var(--space--6);
                                    row-gap: var(--space--2);
                                  `}"
                                >
                                  $${response.locals.tags.map(
                                    (tag) => html`
                                      <div
                                        key="tag--${tag.reference}"
                                        css="${css`
                                          display: flex;
                                          gap: var(--space--2);
                                        `}"
                                      >
                                        <label
                                          class="button button--tight button--tight--inline button--transparent"
                                        >
                                          <input
                                            type="checkbox"
                                            name="conversations[filters][tagsReferences][]"
                                            value="${tag.reference}"
                                            $${request.query.conversations?.filters?.tagsReferences?.includes(
                                              tag.reference
                                            )
                                              ? html`checked`
                                              : html``}
                                            $${Object.keys(filters).length >
                                              0 && filters.isQuick !== "true"
                                              ? html``
                                              : html`disabled`}
                                            class="visually-hidden input--radio-or-checkbox--multilabel"
                                          />
                                          <span>
                                            <i class="bi bi-tag"></i>
                                            ${tag.name}
                                          </span>
                                          <span class="text--teal">
                                            <i class="bi bi-tag-fill"></i>
                                            ${tag.name}
                                          </span>
                                        </label>
                                        $${tag.staffOnlyAt !== null
                                          ? html`
                                              <span
                                                class="text--sky"
                                                javascript="${javascript`
                                                  leafac.setTippy({
                                                    event,
                                                    element: this,
                                                    tippyProps: {
                                                      touch: false,
                                                      content: "This tag is visible by staff only.",
                                                    },
                                                  });
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-mortarboard-fill"
                                                ></i>
                                              </span>
                                            `
                                          : html``}
                                      </div>
                                    `
                                  )}
                                </div>
                              </div>
                            `}
                        <div
                          css="${css`
                            margin-top: var(--space--2);
                            display: flex;
                            gap: var(--space--4);
                            & > * {
                              flex: 1;
                            }
                          `}"
                        >
                          <button
                            class="button button--tight button--tight--inline button--blue"
                          >
                            <i class="bi bi-funnel-fill"></i>
                            Apply Filters
                          </button>
                          $${Object.keys(filters).length > 0
                            ? html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}${request.path}${qs.stringify(
                                    {
                                      conversations: { search },
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <i class="bi bi-x-lg"></i>
                                  Clear Filters
                                </a>
                              `
                            : html``}
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div
              css="${css`
                flex: 1;
                overflow: auto;
              `}"
            >
              <div
                css="${css`
                  margin: var(--space--4);
                  @media (max-width: 899px) {
                    display: flex;
                    justify-content: center;
                  }
                `}"
              >
                <div
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    @media (max-width: 899px) {
                      flex: 1;
                      min-width: var(--width--0);
                      max-width: var(--width--prose);
                    }
                  `}"
                >
                  $${conversationsWithSearchResults.length === 0
                    ? html`
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                          `}"
                        >
                          <div class="decorative-icon">
                            <i class="bi bi-chat-text"></i>
                          </div>
                          <p class="secondary">No conversation found.</p>
                        </div>
                      `
                    : html`
                        $${conversationsPage > 1
                          ? html`
                              <div
                                css="${css`
                                  display: flex;
                                  justify-content: center;
                                `}"
                              >
                                <a
                                  href="${qs.stringify(
                                    {
                                      conversations: {
                                        ...request.query.conversations,
                                        conversationsPage:
                                          conversationsPage - 1,
                                      },
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--transparent"
                                >
                                  <i class="bi bi-arrow-up"></i>
                                  Load Previous Conversations
                                </a>
                              </div>

                              <hr class="separator" />
                            `
                          : html``}

                        <div
                          key="conversations"
                          css="${css`
                            margin-top: var(--space---2);
                          `}"
                          javascript="${javascript`
                            if (${response.locals.conversation !== undefined})
                              window.setTimeout(() => {
                                if (event?.detail?.previousLocation?.href?.startsWith(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}`})) return;
                                this.querySelector(${`[key="conversation--${response.locals.conversation?.reference}"]`})?.scrollIntoView({ block: "center" });
                              });
                          `}"
                        >
                          $${conversationsWithSearchResults.map(
                            ({ conversation, searchResult }) => {
                              const isSelected =
                                conversation.id ===
                                response.locals.conversation?.id;
                              return html`
                                <a
                                  key="conversation--${conversation.reference}"
                                  href="https://${application.configuration
                                    .hostname}/courses/${response.locals.course
                                    .reference}/conversations/${conversation.reference}${qs.stringify(
                                    {
                                      conversations:
                                        request.query.conversations,
                                      messages: {
                                        messageReference:
                                          searchResult?.message?.reference,
                                      },
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button ${isSelected
                                    ? "button--blue"
                                    : "button--transparent"}"
                                  css="${css`
                                    width: calc(
                                      var(--space--2) + 100% + var(--space--2)
                                    );
                                    padding: var(--space--3) var(--space--2);
                                    margin-left: var(--space---2);
                                    position: relative;
                                    align-items: center;
                                  `} ${isSelected
                                    ? css`
                                        && + * {
                                          margin-bottom: var(--space--0);
                                        }
                                      `
                                    : css``}"
                                >
                                  <div
                                    css="${css`
                                      flex: 1;
                                      max-width: 100%;
                                    `}"
                                  >
                                    $${application.web.locals.partials.conversation(
                                      {
                                        request,
                                        response,
                                        conversation,
                                        searchResult,
                                      }
                                    )}
                                  </div>
                                  <div
                                    css="${css`
                                      width: var(--space--4);
                                      display: flex;
                                      justify-content: flex-end;
                                    `}"
                                  >
                                    $${(() => {
                                      const unreadCount =
                                        conversation.messagesCount -
                                        conversation.readingsCount;
                                      return unreadCount === 0 ||
                                        conversation.id ===
                                          response.locals.conversation?.id
                                        ? html``
                                        : html`
                                            <button
                                              class="button button--tight button--blue"
                                              css="${css`
                                                font-size: var(
                                                  --font-size--2xs
                                                );
                                                line-height: var(
                                                  --line-height--2xs
                                                );
                                              `}"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Mark as Read",
                                                  },
                                                });
                                                        
                                                this.onclick = async (event) => {
                                                  event.preventDefault();
                                                  event.stopImmediatePropagation();
                                                  await fetch(this.closest("a").getAttribute("href"), { cache: "no-store" });
                                                  this.remove();
                                                };
                                              `}"
                                            >
                                              ${unreadCount.toString()}
                                            </button>
                                          `;
                                    })()}
                                  </div>
                                </a>
                              `;
                            }
                          ).join(html`
                            <hr
                              class="separator"
                              css="${css`
                                margin: var(--space---px) var(--space--0);
                              `}"
                            />
                          `)}
                        </div>
                        $${moreConversationsExist
                          ? html`
                              <hr class="separator" />

                              <div
                                css="${css`
                                  display: flex;
                                  justify-content: center;
                                `}"
                              >
                                <a
                                  href="${qs.stringify(
                                    {
                                      conversations: {
                                        ...request.query.conversations,
                                        conversationsPage:
                                          conversationsPage + 1,
                                      },
                                      messages: request.query.messages,
                                      newConversation:
                                        request.query.newConversation,
                                    },
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button button--transparent"
                                >
                                  <i class="bi bi-arrow-down"></i>
                                  Load Next Conversations
                                </a>
                              </div>
                            `
                          : html``}
                      `}
                </div>
              </div>
            </div>
          </div>

          <div
            key="layout--conversation--main--${request.path}"
            css="${css`
              overflow: auto;
              flex: 1;
            `} ${sidebarOnSmallScreen
              ? css`
                  @media (max-width: 899px) {
                    display: none;
                  }
                `
              : css``}"
          >
            <div
              css="${css`
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
              `} ${mainIsAScrollingPane
                ? css`
                    height: 100%;
                    display: flex;
                  `
                : css`
                    margin: var(--space--4);
                    @media (min-width: 900px) {
                      margin-left: var(--space--8);
                    }
                  `}"
            >
              $${mainIsAScrollingPane
                ? body
                : html`
                    <div
                      css="${css`
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                        @media (max-width: 899px) {
                          flex: 1;
                        }
                      `}"
                    >
                      $${body}
                    </div>
                  `}
            </div>
          </div>
        </div>
      `,
    });
  };

  application.web.locals.partials.conversation = ({
    request,
    response,
    conversation,
    searchResult = undefined,
    message = undefined,
  }) => html`
    <div
      key="partial--conversation--${conversation.reference}"
      css="${css`
        display: flex;
        flex-direction: column;
        gap: var(--space--1);
      `}"
    >
      <div
        css="${css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--4);
          row-gap: var(--space--0-5);

          & > * {
            display: flex;
            gap: var(--space--1);
          }
        `}"
      >
        <div
          class="${conversation.type === "question" &&
          conversation.resolvedAt !== null
            ? "text--emerald"
            : textColorsConversationType[conversation.type]}"
        >
          $${iconsConversationType[conversation.type].fill}
          ${lodash.capitalize(conversation.type)}
        </div>
        $${conversation.type === "question"
          ? html`
              $${conversation.resolvedAt === null
                ? html`
                    <div class="text--rose">
                      <i class="bi bi-patch-exclamation-fill"></i>
                      Unresolved
                    </div>
                  `
                : html`
                    <div class="text--emerald">
                      <i class="bi bi-patch-check-fill"></i>
                      Resolved
                    </div>
                  `}
            `
          : html``}
        $${conversation.type === "note" && conversation.announcementAt !== null
          ? html`
              <div class="text--orange">
                <i class="bi bi-megaphone-fill"></i>
                Announcement
              </div>
            `
          : html``}
        <div
          class="${textColorsConversationParticipants[
            conversation.participants
          ]}"
          javascript="${javascript`
            if (${conversation.selectedParticipants.length > 1}) {
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  interactive: true,
                  delay: [1000, null],
                  touch: ["hold", 1000],
                  onHidden: () => { this.onmouseleave(); },
                  content: ${html`
                    <div
                      key="loading"
                      css="${css`
                        display: flex;
                        gap: var(--space--2);
                        align-items: center;
                      `}"
                    >
                      $${application.web.locals.partials.spinner({
                        request,
                        response,
                      })}
                      Loading…
                    </div>
                    <div key="content" hidden></div>
                  `},  
                },
              });

              window.clearTimeout(this.tooltipContentTimeout);
              this.tooltipContentSkipLoading = false;
              
              this.onmouseenter = this.onfocus = async () => {
                window.clearTimeout(this.tooltipContentTimeout);
                if (this.tooltipContentSkipLoading) return;
                this.tooltipContentSkipLoading = true;
                leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${conversation.reference}/selected-participants`}, { cache: "no-store" })).text());
                this.tooltip.props.content.querySelector('[key="loading"]').hidden = true;
                this.tooltip.props.content.querySelector('[key="content"]').hidden = false;
                this.tooltip.setProps({});
              };
              
              this.onmouseleave = this.onblur = () => {
                window.clearTimeout(this.tooltipContentTimeout);
                if (this.matches(":hover, :focus-within") || this.tooltip.state.isShown) return;
                this.tooltipContentTimeout = window.setTimeout(() => {
                  this.tooltip.props.content.querySelector('[key="loading"]').hidden = false;
                  this.tooltip.props.content.querySelector('[key="content"]').hidden = true;
                  this.tooltipContentSkipLoading = false;
                }, 60 * 1000);
              };
            }
            else
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Participants",
                },
              });
          `}"
        >
          $${iconsConversationParticipants[conversation.participants].fill}
          $${labelsConversationParticipants[conversation.participants]}
          $${conversation.selectedParticipants.length === 1
            ? html`
                <div>
                  ($${application.web.locals.partials.user({
                    request,
                    response,
                    enrollment: conversation.selectedParticipants[0],
                    size: "xs",
                    bold: false,
                  })})
                </div>
              `
            : html``}
        </div>
        $${conversation.pinnedAt !== null
          ? html`
              <div
                class="text--amber"
                javascript="${javascript`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: "Pinned conversations are listed first.",
                    },
                  });
                `}"
              >
                <i class="bi bi-pin-fill"></i>
                Pinned
              </div>
            `
          : html``}
      </div>

      <h3 class="strong">
        $${searchResult?.type === "conversationTitle"
          ? searchResult.highlight
          : html`${conversation.title}`}
      </h3>

      <div
        class="secondary"
        css="${css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
        `}"
      >
        $${application.web.locals.partials.user({
          request,
          response,
          enrollment: conversation.authorEnrollment,
          anonymous:
            conversation.anonymousAt === null
              ? false
              : response.locals.enrollment.courseRole === "staff" ||
                (conversation.authorEnrollment !== "no-longer-enrolled" &&
                  conversation.authorEnrollment.id ===
                    response.locals.enrollment.id)
              ? "reveal"
              : true,
          size: "xs",
        })}
      </div>

      <div
        class="secondary"
        css="${css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--3);
          row-gap: var(--space--0-5);
        `}"
      >
        <div
          javascript="${javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: "Conversation Reference",
              },
            });
          `}"
        >
          #${conversation.reference}
        </div>

        <time
          datetime="${new Date(conversation.createdAt).toISOString()}"
          javascript="${javascript`
            leafac.relativizeDateTimeElement(this, { capitalize: true });
          `}"
        ></time>

        $${conversation.updatedAt !== null
          ? html`
              <div>
                Updated
                <time
                  datetime="${new Date(conversation.updatedAt).toISOString()}"
                  javascript="${javascript`
                    leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                  `}"
                ></time>
              </div>
            `
          : html``}
      </div>

      $${conversation.taggings.length === 0
        ? html``
        : html`
            <div
              css="${css`
                font-size: var(--font-size--xs);
                line-height: var(--line-height--xs);
                display: flex;
                flex-wrap: wrap;
                column-gap: var(--space--4);
                row-gap: var(--space--0-5);

                & > * {
                  display: flex;
                  gap: var(--space--1);
                }
              `}"
            >
              $${conversation.taggings.map(
                (tagging) => html`
                  <div class="text--teal">
                    <i class="bi bi-tag-fill"></i>
                    ${tagging.tag.name}
                    $${tagging.tag.staffOnlyAt !== null
                      ? html`
                          <span
                            class="text--sky"
                            javascript="${javascript`
                              leafac.setTippy({
                                event,
                                element: this,
                                tippyProps: {
                                  touch: false,
                                  content: "This tag is visible by staff only.",
                                },
                              });
                            `}"
                          >
                            <i class="bi bi-mortarboard-fill"></i>
                          </span>
                        `
                      : html``}
                  </div>
                `
              )}
            </div>
          `}
      $${searchResult?.type === "messageAuthorUserName"
        ? html`
            <div>
              <div>
                $${application.web.locals.partials.user({
                  request,
                  response,
                  enrollment: searchResult.message.authorEnrollment,
                  name: searchResult.highlight,
                })}
              </div>
              <div>
                $${lodash.truncate(searchResult.message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : searchResult?.type === "messageContent"
        ? html`
            <div>
              <div>
                $${application.web.locals.partials.user({
                  request,
                  response,
                  enrollment: searchResult.message.authorEnrollment,
                  anonymous:
                    searchResult.message.anonymousAt === null
                      ? false
                      : response.locals.enrollment.courseRole === "staff" ||
                        (searchResult.message.authorEnrollment !==
                          "no-longer-enrolled" &&
                          searchResult.message.authorEnrollment.id ===
                            response.locals.enrollment.id)
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>$${searchResult.snippet}</div>
            </div>
          `
        : message !== undefined
        ? html`
            <div>
              <div>
                $${application.web.locals.partials.user({
                  request,
                  response,
                  enrollment: message.authorEnrollment,
                  anonymous:
                    message.anonymousAt === null
                      ? false
                      : response.locals.enrollment.courseRole === "staff" ||
                        (message.authorEnrollment !== "no-longer-enrolled" &&
                          message.authorEnrollment.id ===
                            response.locals.enrollment.id)
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>
                $${lodash.truncate(message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : html``}
    </div>
  `;

  const iconsConversationType: {
    [conversationType in Application["web"]["locals"]["helpers"]["conversationTypes"][number]]: {
      regular: HTML;
      fill: HTML;
    };
  } = {
    question: {
      regular: html`<i class="bi bi-patch-question"></i>`,
      fill: html`<i class="bi bi-patch-question-fill"></i>`,
    },
    note: {
      regular: html`<i class="bi bi-sticky"></i>`,
      fill: html`<i class="bi bi-sticky-fill"></i>`,
    },
    chat: {
      regular: html`<i class="bi bi-chat-text"></i>`,
      fill: html`<i class="bi bi-chat-text-fill"></i>`,
    },
  };

  const textColorsConversationType: {
    [conversationType in Application["web"]["locals"]["helpers"]["conversationTypes"][number]]: string;
  } = {
    question: "text--rose",
    note: "text--fuchsia",
    chat: "text--cyan",
  };

  const iconsConversationParticipants: {
    [conversationParticipants in Application["web"]["locals"]["helpers"]["conversationParticipantses"][number]]: {
      regular: HTML;
      fill: HTML;
    };
  } = {
    everyone: {
      regular: html`<i class="bi bi-people"></i>`,
      fill: html`<i class="bi bi-people-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
    "selected-people": {
      regular: html`<i class="bi bi-door-closed"></i>`,
      fill: html`<i class="bi bi-door-closed-fill"></i>`,
    },
  };

  const textColorsConversationParticipants: {
    [conversationParticipants in Application["web"]["locals"]["helpers"]["conversationParticipantses"][number]]: string;
  } = {
    everyone: "text--green",
    staff: "text--sky",
    "selected-people": "text--purple",
  };

  const labelsConversationParticipants: {
    [conversationParticipants in Application["web"]["locals"]["helpers"]["conversationParticipantses"][number]]: string;
  } = {
    everyone: html`Everyone`,
    staff: html`Staff`,
    "selected-people": html`Selected People`,
  };

  application.web.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/selected-participants",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      if (
        response.locals.conversation.participants === "everyone" ||
        response.locals.conversation.selectedParticipants.length <= 1
      )
        return next("Validation");

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            <div
              class="dropdown--menu"
              css="${css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `}"
            >
              $${response.locals.conversation.selectedParticipants.map(
                (selectedParticipant) => html`
                  <div class="dropdown--menu--item">
                    $${application.web.locals.partials.user({
                      request,
                      response,
                      enrollment: selectedParticipant,
                      size: "xs",
                      bold: false,
                    })}
                  </div>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  application.web.post<
    { courseReference: string },
    any,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/conversations/mark-all-conversations-as-read",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      const messages = application.database.all<{ id: number }>(
        sql`
          SELECT "messages"."id"
          FROM "messages"
          JOIN "conversations" ON
            "messages"."conversation" = "conversations"."id" AND
            "conversations"."course" = ${response.locals.course.id}
          LEFT JOIN "readings" ON
            "messages"."id" = "readings"."message" AND
            "readings"."enrollment" = ${response.locals.enrollment.id}
          WHERE
            "readings"."id" IS NULL AND (
            "conversations"."participants" = 'everyone' $${
              response.locals.enrollment.courseRole === "staff"
                ? sql`
                    OR "conversations"."participants" = 'staff'
                  `
                : sql`
              `
            } OR EXISTS(
              SELECT TRUE
              FROM "conversationSelectedParticipants"
              WHERE
                "conversationSelectedParticipants"."conversation" = "conversations"."id" AND
                "conversationSelectedParticipants"."enrollment" = ${
                  response.locals.enrollment.id
                }
            )
          )
          ORDER BY "messages"."id" ASC
        `
      );
      for (const message of messages)
        application.database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${response.locals.enrollment.id}
            )
          `
        );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.web.get<
    {
      courseReference: string;
      type?: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
    },
    HTML,
    {},
    {
      conversations?: object;
      newConversation?: {
        conversationDraftReference?: string;
        type?: string;
        title?: string;
        content?: string;
        tagsReferences?: string[];
        participants?: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
        selectedParticipants?: string[];
        isAnnouncement?: "true";
        isPinned?: "true";
      };
    },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    `/courses/:courseReference/conversations/new(/:type(${application.web.locals.helpers.conversationTypes.join(
      "|"
    )}))?`,
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        ![
          undefined,
          ...application.web.locals.helpers.conversationTypes,
        ].includes(request.params.type)
      )
        return next();

      const conversationDraft =
        typeof request.query.newConversation?.conversationDraftReference ===
          "string" &&
        request.query.newConversation.conversationDraftReference.match(
          /^[0-9]+$/
        )
          ? application.database.get<{
              createdAt: string;
              updatedAt: string | null;
              reference: string;
              type: string | null;
              isPinned: "true" | null;
              isStaffOnly: "true" | null;
              title: string | null;
              content: string | null;
              tagsReferences: string | null;
            }>(
              sql`
                SELECT
                  "createdAt",
                  "updatedAt",
                  "reference",
                  "type",
                  "isPinned",
                  "isStaffOnly",
                  "title",
                  "content",
                  "tagsReferences"
                FROM "conversationDrafts"
                WHERE
                  "course" = ${response.locals.course.id} AND
                  "reference" = ${request.query.newConversation.conversationDraftReference} AND
                  "authorEnrollment" = ${response.locals.enrollment.id}
              `
            )
          : undefined;

      response.send(
        (response.locals.conversationsCount === 0
          ? application.web.locals.layouts.main
          : application.web.locals.layouts.conversation)({
          request,
          response,
          head: html`
            <title>
              ${request.params.type === "note"
                ? `Post ${
                    response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"
                  } Note`
                : request.params.type === "question"
                ? `Ask ${
                    response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"
                  } Question`
                : request.params.type === "chat"
                ? `Start ${
                    response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"
                  } Chat`
                : `Start ${
                    response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"
                  } Conversation`}
              · ${response.locals.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              $${request.params.type === "note"
                ? html`
                    $${iconsConversationType.note.fill} Post
                    ${response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Note
                  `
                : request.params.type === "question"
                ? html`
                    $${iconsConversationType.question.fill} Ask
                    ${response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Question
                  `
                : request.params.type === "chat"
                ? html`
                    $${iconsConversationType.chat.fill} Start
                    ${response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Chat
                  `
                : html`
                    <i class="bi bi-chat-text-fill"></i>
                    Start
                    ${response.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Conversation
                  `}
            </h2>

            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/conversations${qs.stringify(
                { conversations: request.query.conversations },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                $${typeof request.params.type === "string"
                  ? html`hidden`
                  : html``}
                class="label"
              >
                <p class="label--text">Type</p>
                <div
                  css="${css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--2);
                  `}"
                >
                  $${application.web.locals.helpers.conversationTypes.map(
                    (conversationType) => html`
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          type="radio"
                          name="type"
                          value="${conversationType}"
                          required
                          $${request.params.type === conversationType ||
                          (request.params.type === undefined &&
                            (conversationDraft?.type === conversationType ||
                              (conversationDraft === undefined &&
                                request.query.newConversation?.type ===
                                  conversationType)))
                            ? html`checked`
                            : html``}
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          javascript="${javascript`
                            this.onchange = () => {
                              const form = this.closest("form");
                              for (const element of [form.querySelector('[name="content"]'), ...form.querySelectorAll('[name="tagsReferences[]"]')])
                                element.required = ${
                                  conversationType !== "chat"
                                };

                              if (${
                                response.locals.enrollment.courseRole ===
                                "staff"
                              }) {
                                const notification = form.querySelector('[key="new-conversation--announcement"]');
                                notification.hidden = ${
                                  conversationType !== "note"
                                };
                                for (const element of leafac.descendants(notification))
                                  if (element.disabled !== undefined)
                                    element.disabled = ${
                                      conversationType !== "note"
                                    };
                              }
                            };
                          `}"
                        />
                        <span>
                          $${iconsConversationType[conversationType].regular}
                          $${lodash.capitalize(conversationType)}
                        </span>
                        <span
                          class="${textColorsConversationType[
                            conversationType
                          ]}"
                        >
                          $${iconsConversationType[conversationType].fill}
                          $${lodash.capitalize(conversationType)}
                        </span>
                      </label>
                    `
                  )}
                </div>
              </div>

              <input
                type="text"
                name="title"
                required
                $${typeof conversationDraft?.title === "string" &&
                conversationDraft.title.trim() !== ""
                  ? html`value="${conversationDraft.title}"`
                  : conversationDraft === undefined &&
                    typeof request.query.newConversation?.title === "string" &&
                    request.query.newConversation.title.trim() !== ""
                  ? html`value="${request.query.newConversation.title}"`
                  : html``}
                placeholder="Title…"
                autocomplete="off"
                $${conversationDraft === undefined ? html`autofocus` : html``}
                class="input--text"
              />

              $${application.web.locals.partials.contentEditor({
                request,
                response,
                contentSource:
                  typeof conversationDraft?.content === "string" &&
                  conversationDraft.content.trim() !== ""
                    ? conversationDraft.content
                    : conversationDraft === undefined &&
                      typeof request.query.newConversation?.content ===
                        "string" &&
                      request.query.newConversation.content.trim() !== ""
                    ? request.query.newConversation.content
                    : undefined,
                required:
                  // TODO: Drafts
                  (typeof request.params.type === "string" &&
                    ["question", "note"].includes(request.params.type)) ||
                  (request.params.type === undefined &&
                    ((typeof request.query.newConversation?.type === "string" &&
                      ["question", "note"].includes(
                        request.query.newConversation.type
                      )) ||
                      request.query.newConversation?.type === undefined)),
              })}
              $${response.locals.tags.length === 0 &&
              response.locals.enrollment.courseRole !== "staff"
                ? html``
                : html`
                    <div class="label">
                      <div class="label--text">
                        Tags
                        <button
                          type="button"
                          class="button button--tight button--tight--inline button--transparent"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                trigger: "click",
                                content: "Tags help to organize conversations.",
                              },
                            });
                          `}"
                        >
                          <i class="bi bi-info-circle"></i>
                        </button>
                        $${response.locals.tags.length > 0 &&
                        response.locals.enrollment.courseRole === "staff"
                          ? html`
                              <div
                                css="${css`
                                  flex: 1;
                                  display: flex;
                                  justify-content: flex-end;
                                `}"
                              >
                                <a
                                  href="https://${application.configuration
                                    .hostname}/courses/${response.locals.course
                                    .reference}/settings/tags"
                                  target="_blank"
                                  class="button button--tight button--tight--inline button--transparent secondary"
                                >
                                  <i class="bi bi-sliders"></i>
                                  Manage Tags
                                </a>
                              </div>
                            `
                          : html``}
                      </div>
                      <div
                        css="${css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--2);
                        `}"
                      >
                        $${response.locals.tags.length === 0 &&
                        response.locals.enrollment.courseRole === "staff"
                          ? html`
                              <a
                                href="https://${application.configuration
                                  .hostname}/courses/${response.locals.course
                                  .reference}/settings/tags"
                                target="_blank"
                                class="button button--tight button--tight--inline button--inline button--transparent secondary"
                              >
                                <i class="bi bi-sliders"></i>
                                Create the First Tag
                              </a>
                            `
                          : response.locals.tags.map(
                              (tag) => html`
                                <div
                                  key="tag--${tag.reference}"
                                  css="${css`
                                    display: flex;
                                    gap: var(--space--2);
                                  `}"
                                >
                                  <label
                                    class="button button--tight button--tight--inline button--transparent"
                                  >
                                    <input
                                      type="checkbox"
                                      name="tagsReferences[]"
                                      value="${tag.reference}"
                                      $${(typeof conversationDraft?.tagsReferences ===
                                        "string" &&
                                        JSON.parse(
                                          conversationDraft.tagsReferences
                                        ).includes(tag.reference)) ||
                                      (conversationDraft === undefined &&
                                        Array.isArray(
                                          request.query.newConversation
                                            ?.tagsReferences
                                        ) &&
                                        request.query.newConversation!.tagsReferences.includes(
                                          tag.reference
                                        ))
                                        ? html`checked`
                                        : html``}
                                      $${
                                        // TODO: Drafts
                                        (typeof request.params.type ===
                                          "string" &&
                                          ["question", "note"].includes(
                                            request.params.type
                                          )) ||
                                        (request.params.type === undefined &&
                                          ((typeof request.query.newConversation
                                            ?.type === "string" &&
                                            ["question", "note"].includes(
                                              request.query.newConversation.type
                                            )) ||
                                            request.query.newConversation
                                              ?.type === undefined))
                                          ? html`required`
                                          : html``
                                      }
                                      class="visually-hidden input--radio-or-checkbox--multilabel"
                                    />
                                    <span>
                                      <i class="bi bi-tag"></i>
                                      ${tag.name}
                                    </span>
                                    <span class="text--teal">
                                      <i class="bi bi-tag-fill"></i>
                                      ${tag.name}
                                    </span>
                                  </label>
                                  $${tag.staffOnlyAt !== null
                                    ? html`
                                        <span
                                          class="text--sky"
                                          javascript="${javascript`
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              tippyProps: {
                                                touch: false,
                                                content: "This tag is visible by staff only.",
                                              },
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-mortarboard-fill"></i>
                                        </span>
                                      `
                                    : html``}
                                </div>
                              `
                            )}
                      </div>
                    </div>
                  `}
              $${(() => {
                const enrollments = application.database
                  .all<{
                    id: number;
                    userId: number;
                    userLastSeenOnlineAt: string;
                    userReference: string;
                    userEmail: string;
                    userName: string;
                    userAvatar: string | null;
                    userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
                    userBiographySource: string | null;
                    userBiographyPreprocessed: HTML | null;
                    reference: string;
                    courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
                  }>(
                    sql`
                      SELECT
                        "enrollments"."id",
                        "users"."id" AS "userId",
                        "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                        "users"."reference" AS "userReference",
                        "users"."email" AS "userEmail",
                        "users"."name" AS "userName",
                        "users"."avatar" AS "userAvatar",
                        "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                        "users"."biographySource" AS "userBiographySource",
                        "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                        "enrollments"."reference",
                        "enrollments"."courseRole"
                      FROM "enrollments"
                      JOIN "users" ON "enrollments"."user" = "users"."id"
                      WHERE
                        "enrollments"."course" = ${response.locals.course.id} AND
                        "enrollments"."id" != ${response.locals.enrollment.id}
                      ORDER BY
                        "enrollments"."courseRole" = 'staff' DESC,
                        "users"."name" ASC
                    `
                  )
                  .map((enrollment) => ({
                    id: enrollment.id,
                    user: {
                      id: enrollment.userId,
                      lastSeenOnlineAt: enrollment.userLastSeenOnlineAt,
                      reference: enrollment.userReference,
                      email: enrollment.userEmail,
                      name: enrollment.userName,
                      avatar: enrollment.userAvatar,
                      avatarlessBackgroundColor:
                        enrollment.userAvatarlessBackgroundColor,
                      biographySource: enrollment.userBiographySource,
                      biographyPreprocessed:
                        enrollment.userBiographyPreprocessed,
                    },
                    reference: enrollment.reference,
                    courseRole: enrollment.courseRole,
                  }));

                return html`
                  <div class="label">
                    <div class="label--text">Participants</div>
                    <div
                      css="${css`
                        display: flex;
                        flex-wrap: wrap;
                        column-gap: var(--space--8);
                        row-gap: var(--space--4);
                      `}"
                    >
                      <div
                        key="participants"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "dropdown",
                            tippyProps: {
                              trigger: "click",
                              interactive: true,
                              content: ${html`
                                <div
                                  key="participants--dropdown"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--2);
                                  `}"
                                >
                                  <div class="dropdown--menu">
                                    $${application.web.locals.helpers.conversationParticipantses.map(
                                      (conversationParticipants) => html`
                                        <label>
                                          <input
                                            type="radio"
                                            name="participants--dropdown--participants"
                                            value="${conversationParticipants}"
                                            $${request.query.newConversation
                                              ?.participants ===
                                              conversationParticipants ||
                                            (request.query.newConversation
                                              ?.participants === undefined &&
                                              ((request.params.type ===
                                                "chat" &&
                                                conversationParticipants ===
                                                  "selected-people") ||
                                                (request.params.type !==
                                                  "chat" &&
                                                  conversationParticipants ===
                                                    "everyone")))
                                              ? html`checked`
                                              : html``}
                                            class="visually-hidden input--radio-or-checkbox--multilabel"
                                            javascript="${javascript`
                                              this.isModified = false;

                                              this.onchange = () => {  
                                                this.closest("form").querySelector(${`[name="participants"][value="${conversationParticipants}"]`}).checked = true;

                                                const participantsDropdown = this.closest('[key="participants--dropdown"]');
                                                const selectedParticipants = participantsDropdown.querySelector('[key="participants--dropdown--selected-participants"]');

                                                if (${
                                                  conversationParticipants ===
                                                  "everyone"
                                                }) {
                                                  selectedParticipants.hidden = true;

                                                  for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                    element.disabled = true;
                                                } else if (${
                                                  conversationParticipants ===
                                                  "staff"
                                                }) {
                                                  selectedParticipants.hidden = false;

                                                  for (const element of selectedParticipants.querySelectorAll('[data-enrollment-course-role="staff"]'))
                                                    element.hidden = true;
                                                  participantsDropdown.querySelector('[key="participants--dropdown--selected-participants--filter"]').oninput();

                                                  for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                    element.disabled = element.matches('[data-enrollment-course-role="staff"]');
                                                } else if (${
                                                  conversationParticipants ===
                                                  "selected-people"
                                                }) {
                                                  selectedParticipants.hidden = false;

                                                  for (const element of selectedParticipants.querySelectorAll('[data-enrollment-course-role="staff"]'))
                                                    element.hidden = false;
                                                  participantsDropdown.querySelector('[key="participants--dropdown--selected-participants--filter"]').oninput();

                                                  for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                    element.disabled = false;
                                                }
                                              };
                                            `}"
                                          />
                                          <span
                                            class="dropdown--menu--item button button--transparent ${textColorsConversationParticipants[
                                              conversationParticipants
                                            ]}"
                                          >
                                            $${iconsConversationParticipants[
                                              conversationParticipants
                                            ].fill}
                                            $${labelsConversationParticipants[
                                              conversationParticipants
                                            ]}
                                          </span>
                                          <span
                                            class="dropdown--menu--item button button--blue"
                                          >
                                            $${iconsConversationParticipants[
                                              conversationParticipants
                                            ].fill}
                                            $${labelsConversationParticipants[
                                              conversationParticipants
                                            ]}
                                          </span>
                                        </label>
                                      `
                                    )}
                                  </div>

                                  <div
                                    key="participants--dropdown--selected-participants"
                                    $${(typeof request.query.newConversation
                                      ?.participants === "string" &&
                                      ["staff", "selected-people"].includes(
                                        request.query.newConversation
                                          .participants
                                      )) ||
                                    (request.query.newConversation
                                      ?.participants === undefined &&
                                      request.params.type === "chat")
                                      ? html``
                                      : html`hidden`}
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <hr class="dropdown--separator" />

                                    $${response.locals
                                      .courseEnrollmentsCount === 1
                                      ? html`
                                          <p
                                            class="secondary"
                                            css="${css`
                                              padding: var(--space--0)
                                                var(--space--2) var(--space--2);
                                            `}"
                                          >
                                            You may select participants when
                                            there are more people enrolled in
                                            the course.
                                          </p>
                                        `
                                      : html`
                                          <div
                                            css="${css`
                                              padding: var(--space--0)
                                                var(--space--2);
                                            `}"
                                          >
                                            <label
                                              css="${css`
                                                display: flex;
                                                gap: var(--space--2);
                                                align-items: baseline;
                                              `}"
                                            >
                                              <i class="bi bi-funnel"></i>
                                              <input
                                                key="participants--dropdown--selected-participants--filter"
                                                type="text"
                                                class="input--text"
                                                placeholder="Filter…"
                                                javascript="${javascript`
                                                  this.isModified = false;

                                                  this.oninput = () => {
                                                    const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                                                    const participantsDropdown = this.closest('[key="participants--dropdown"]');
                                                    const participantsIsStaff = participantsDropdown.querySelector('[name="participants--dropdown--participants"][value="staff"]').checked;
                                                    for (const selectedParticipant of participantsDropdown.querySelectorAll('[key^="participants--dropdown--selected-participant--enrollment-reference--"]')) {
                                                      if (participantsIsStaff && selectedParticipant.matches('[data-enrollment-course-role="staff"]'))
                                                        continue;
                                                      let selectedParticipantHidden = filterPhrases.length > 0;
                                                      for (const filterablePhrasesElement of selectedParticipant.querySelectorAll("[data-filterable-phrases]")) {
                                                        const filterablePhrases = JSON.parse(filterablePhrasesElement.getAttribute("data-filterable-phrases"));
                                                        const filterablePhrasesElementChildren = [];
                                                        for (const filterablePhrase of filterablePhrases) {
                                                          let filterablePhraseElement;
                                                          if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                                                            filterablePhraseElement = document.createElement("mark");
                                                            filterablePhraseElement.classList.add("mark");
                                                            selectedParticipantHidden = false;
                                                          } else
                                                            filterablePhraseElement = document.createElement("span");
                                                          filterablePhraseElement.textContent = filterablePhrase;
                                                          filterablePhrasesElementChildren.push(filterablePhraseElement);
                                                        }
                                                        filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                                                      }
                                                      selectedParticipant.hidden = selectedParticipantHidden;
                                                    }
                                                  };
                                                `}"
                                              />
                                            </label>
                                          </div>

                                          <hr class="dropdown--separator" />

                                          <div
                                            class="dropdown--menu"
                                            css="${css`
                                              height: var(--space--40);
                                              overflow: auto;
                                            `}"
                                          >
                                            $${enrollments.map(
                                              (enrollment) => html`
                                                <label
                                                  key="participants--dropdown--selected-participant--enrollment-reference--${enrollment.reference}"
                                                  data-enrollment-course-role="${enrollment.courseRole}"
                                                  $${request.query
                                                    .newConversation
                                                    ?.participants ===
                                                    "staff" &&
                                                  enrollment.courseRole ===
                                                    "staff"
                                                    ? html`hidden`
                                                    : html``}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    name="participants--dropdown--selected-participants[]"
                                                    value="${enrollment.reference}"
                                                    $${request.query.newConversation?.selectedParticipants?.includes(
                                                      enrollment.reference
                                                    )
                                                      ? html`checked`
                                                      : html``}
                                                    class="visually-hidden input--radio-or-checkbox--multilabel"
                                                    javascript="${javascript`
                                                      this.isModified = false;

                                                      this.onchange = () => {
                                                        this.closest("form").querySelector(${`[name="selectedParticipantsReferences[]"][value="${enrollment.reference}"]`}).checked = this.checked;
                                                      };
                                                    `}"
                                                  />
                                                  <span
                                                    class="dropdown--menu--item button button--transparent"
                                                  >
                                                    $${application.web.locals.partials.user(
                                                      {
                                                        request,
                                                        response,
                                                        enrollment,
                                                        user: enrollment.user,
                                                        tooltip: false,
                                                        size: "xs",
                                                        bold: false,
                                                      }
                                                    )}
                                                  </span>
                                                  <span
                                                    class="dropdown--menu--item button button--blue"
                                                  >
                                                    $${application.web.locals.partials.user(
                                                      {
                                                        request,
                                                        response,
                                                        enrollment,
                                                        user: enrollment.user,
                                                        tooltip: false,
                                                        size: "xs",
                                                        bold: false,
                                                      }
                                                    )}
                                                  </span>
                                                </label>
                                              `
                                            )}
                                          </div>
                                        `}
                                  </div>
                                </div>
                              `},  
                            },
                          });
                        `}"
                      >
                        $${application.web.locals.helpers.conversationParticipantses.map(
                          (conversationParticipants) => html`
                            <input
                              type="radio"
                              name="participants"
                              value="${conversationParticipants}"
                              $${request.query.newConversation?.participants ===
                                conversationParticipants ||
                              (request.query.newConversation?.participants ===
                                undefined &&
                                ((request.params.type === "chat" &&
                                  conversationParticipants ===
                                    "selected-people") ||
                                  (request.params.type !== "chat" &&
                                    conversationParticipants === "everyone")))
                                ? html`checked`
                                : html``}
                              required
                              tabindex="-1"
                              class="visually-hidden input--visible-when-enabled-and-checked"
                              javascript="${javascript`
                                if (${
                                  conversationParticipants === "selected-people"
                                })
                                  this.onvalidate = () => {
                                    if (this.checked && [...this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]')].find(element => element.checked) === undefined)
                                      return "Please select at least one participant.";
                                  };
                                `}"
                            />
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent ${textColorsConversationParticipants[
                                conversationParticipants
                              ]}"
                            >
                              $${iconsConversationParticipants[
                                conversationParticipants
                              ].fill}
                              $${labelsConversationParticipants[
                                conversationParticipants
                              ]}
                              <i class="bi bi-chevron-down"></i>
                            </button>
                          `
                        )}
                      </div>

                      $${enrollments.map(
                        (enrollment) => html`
                          <input
                            key="selected-participants--input--${enrollment.reference}"
                            type="checkbox"
                            name="selectedParticipantsReferences[]"
                            value="${enrollment.reference}"
                            $${request.query.newConversation?.selectedParticipants?.includes(
                              enrollment.reference
                            )
                              ? html`checked`
                              : html``}
                            $${(request.query.newConversation?.participants ===
                              "staff" &&
                              enrollment.courseRole !== "staff") ||
                            request.query.newConversation?.participants ===
                              "selected-people" ||
                            (request.query.newConversation?.participants ===
                              undefined &&
                              request.params.type === "chat")
                              ? html``
                              : html`disabled`}
                            tabindex="-1"
                            class="visually-hidden input--visible-when-enabled-and-checked"
                            data-enrollment-course-role="${enrollment.courseRole}"
                          />
                          <button
                            key="selected-participants--button--${enrollment.reference}"
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            javascript="${javascript`
                              leafac.setTippy({
                                event,
                                element: this,
                                tippyProps: {
                                  touch: false,
                                  content: "Remove Participant",
                                },
                              });

                              this.onclick = () => {
                                this.previousElementSibling.checked = false;

                                this.closest("form").querySelector('[key="participants"]').dropdown.props.content.querySelector(${`[name="participants--dropdown--selected-participants[]"][value="${enrollment.reference}"]`}).checked = false;
                              };
                            `}"
                          >
                            $${application.web.locals.partials.user({
                              request,
                              response,
                              enrollment,
                              user: enrollment.user,
                              tooltip: false,
                              size: "xs",
                              bold: false,
                            })}
                          </button>
                        `
                      )}
                    </div>
                  </div>
                `;
              })()}

              <div
                css="${css`
                  display: flex;
                  flex-wrap: wrap;
                  column-gap: var(--space--8);
                  row-gap: var(--space--4);
                `}"
              >
                $${response.locals.enrollment.courseRole === "staff"
                  ? html`
                      <div
                        key="new-conversation--announcement"
                        $${request.params.type === "note" ||
                        (request.params.type === undefined &&
                          (conversationDraft?.type === "note" ||
                            (conversationDraft === undefined &&
                              request.query.newConversation?.type === "note")))
                          ? html``
                          : html`hidden`}
                        class="label"
                        css="${css`
                          width: var(--space--44);
                        `}"
                      >
                        <div class="label--text">
                          Announcement
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            javascript="${javascript`
                              leafac.setTippy({
                                event,
                                element: this,
                                tippyProps: {
                                  trigger: "click",
                                  content: "People receive immediate email notifications for announcements.",
                                },
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isAnnouncement"
                              $${request.params.type === "note" ||
                              (request.params.type === undefined &&
                                (conversationDraft?.type === "note" ||
                                  (conversationDraft === undefined &&
                                    request.query.newConversation?.type ===
                                      "note")))
                                ? html``
                                : html`disabled`}
                              $${(
                                conversationDraft as any
                              ) /* TODO: Conversation drafts */
                                ?.isAnnouncement === "true" ||
                              (conversationDraft === undefined &&
                                (request.query.newConversation
                                  ?.isAnnouncement === "true" ||
                                  request.query.newConversation
                                    ?.isAnnouncement === undefined))
                                ? html`checked`
                                : html``}
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                              javascript="${javascript`
                                this.onchange = () => {
                                  if (this.checked) this.closest("form").querySelector('[name="isPinned"]').checked = true;
                                };
                              `}"
                            />
                            <span
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Set as Announcement",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-megaphone"></i>
                              Not an Announcement
                            </span>
                            <span
                              class="text--orange"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Set as Not an Announcement",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-megaphone-fill"></i>
                              Announcement
                            </span>
                          </label>
                        </div>
                      </div>

                      <div
                        class="label"
                        css="${css`
                          width: var(--space--24);
                        `}"
                      >
                        <div class="label--text">
                          Pin
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            javascript="${javascript`
                              leafac.setTippy({
                                event,
                                element: this,
                                tippyProps: {
                                  trigger: "click",
                                  content: "Pinned conversations are listed first.",
                                },
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isPinned"
                              $${conversationDraft?.isPinned === "true" ||
                              (conversationDraft === undefined &&
                                (request.query.newConversation?.isPinned ===
                                  "true" ||
                                  (request.query.newConversation?.isPinned ===
                                    undefined &&
                                    request.params.type === "note")))
                                ? html`checked`
                                : html``}
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Pin",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-pin-angle"></i>
                              Unpinned
                            </span>
                            <span
                              class="text--amber"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Unpin",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-pin-fill"></i>
                              Pinned
                            </span>
                          </label>
                        </div>
                      </div>
                    `
                  : html`
                      <div
                        class="label"
                        css="${css`
                          width: var(--space--60);
                        `}"
                      >
                        <p class="label--text">Anonymity</p>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isAnonymous"
                              $${response.locals.user.preferAnonymousAt
                                ? html`checked`
                                : html``}
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                              javascript="${javascript`
                                this.isModified = false;

                                this.onchange = async () => {
                                  await fetch(${`https://${application.configuration.hostname}/preferences`}, {
                                    method: "PATCH",
                                    headers: { "CSRF-Protection": "true", },
                                    cache: "no-store",
                                    body: new URLSearchParams({ preferAnonymous: String(this.checked), }),
                                  });
                                };
                              `}"
                            />
                            <span
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Set as Anonymous to Other Students",
                                  },
                                });
                              `}"
                            >
                              <span>
                                $${application.web.locals.partials.user({
                                  request,
                                  response,
                                  user: response.locals.user,
                                  decorate: false,
                                  name: false,
                                  size: "xs",
                                })}
                                <span
                                  css="${css`
                                    margin-left: var(--space--1);
                                  `}"
                                >
                                  Signed by You
                                </span>
                              </span>
                            </span>
                            <span
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Set as Signed by You",
                                  },
                                });
                              `}"
                            >
                              <span>
                                $${application.web.locals.partials.user({
                                  request,
                                  response,
                                  name: false,
                                  size: "xs",
                                })}
                                <span
                                  css="${css`
                                    margin-left: var(--space--1);
                                  `}"
                                >
                                  Anonymous to Other Students
                                </span>
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>
                    `}
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: ${html`
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Enter</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i
                              ><i class="bi bi-arrow-return-left"></i
                            ></span>
                          </span>
                        `},
                      },
                    });

                    const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');

                    (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });

                    this.onclick = () => {
                      delete this.closest("form").isValid;
                    };
                  `}"
                >
                  $${request.params.type === "note"
                    ? html`
                        $${iconsConversationType.note.fill} Post
                        ${response.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Note
                      `
                    : request.params.type === "question"
                    ? html`
                        $${iconsConversationType.question.fill} Ask
                        ${response.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Question
                      `
                    : request.params.type === "chat"
                    ? html`
                        $${iconsConversationType.chat.fill} Start
                        ${response.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Chat
                      `
                    : html`
                        <i class="bi bi-chat-text-fill"></i>
                        Start
                        ${response.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Conversation
                      `}
                </button>
              </div>

              <div
                hidden
                class="secondary"
                css="${css`
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  display: flex;
                  column-gap: var(--space--8);
                  row-gap: var(--space--2);
                  flex-wrap: wrap;
                `}"
              >
                <button
                  class="link"
                  name="isDraft"
                  value="true"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: ${html`
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+S</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>S</span
                            >
                          </span>
                        `},  
                      },
                    });

                    const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');

                    // TODO: Drafts
                    // (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+s", () => { this.click(); return false; });

                    this.onclick = () => {
                      this.closest("form").isValid = true;
                    };
                  `}"
                >
                  <i class="bi bi-file-earmark-text"></i>
                  Save Draft
                </button>
                $${conversationDraft !== undefined
                  ? html`
                      <input
                        type="hidden"
                        name="conversationDraftReference"
                        value="${conversationDraft.reference}"
                      />
                      <button
                        class="link text--rose"
                        formmethod="DELETE"
                        formaction="https://${application.configuration
                          .hostname}/courses/${response.locals.course
                          .reference}/conversations/new${qs.stringify(
                          { conversations: request.query.conversations },
                          { addQueryPrefix: true }
                        )}"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest("form").isValid = true;
                          };
                        `}"
                      >
                        <i class="bi bi-trash"></i>
                        Remove Draft
                      </button>
                      <div>
                        Draft created
                        <time
                          datetime="${new Date(
                            new Date(conversationDraft.createdAt).getTime() -
                              100 * 24 * 60 * 60 * 1000
                          ).toISOString()}"
                          javascript="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                          `}"
                        ></time>
                      </div>
                      $${conversationDraft.updatedAt !== null
                        ? html`
                            <div>
                              Updated
                              <time
                                datetime="${new Date(
                                  conversationDraft.updatedAt
                                ).toISOString()}"
                                javascript="${javascript`
                                  leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                `}"
                              ></time>
                            </div>
                          `
                        : html``}
                    `
                  : html``}
              </div>
            </form>
          `,
        })
      );
    }
  );

  application.web.post<
    { courseReference: string },
    HTML,
    {
      type?: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
      title?: string;
      content?: string;
      tagsReferences?: string[];
      participants?: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
      selectedParticipantsReferences?: string[];
      isAnnouncement?: "on";
      isPinned?: "on";
      isAnonymous?: "on";
      isDraft?: "true";
      conversationDraftReference?: string;
    },
    { conversations?: object },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference/conversations", (request, response, next) => {
    if (response.locals.course === undefined) return next();

    if (request.body.isDraft === "true") {
      // TODO: Conversation drafts: Validate inputs
      // let conversationDraft =
      //   typeof request.body.conversationDraftReference === "string" &&
      //   request.body.conversationDraftReference.match(/^[0-9]+$/)
      //     ? app.database.get<{
      //         reference: string;
      //       }>(
      //         sql`
      //           SELECT "reference"
      //           FROM "conversationDrafts"
      //           WHERE "course" = ${response.locals.course.id} AND
      //                 "reference" = ${request.body.conversationDraftReference} AND
      //                 "authorEnrollment" = ${response.locals.enrollment.id}
      //         `
      //       )
      //     : undefined;
      // if (conversationDraft === undefined)
      //   conversationDraft = app.database.get<{
      //     reference: string;
      //   }>(
      //     sql`
      //       INSERT INTO "conversationDrafts" (
      //         "createdAt",
      //         "course",
      //         "reference",
      //         "authorEnrollment",
      //         "type",
      //         "isPinned",
      //         "isStaffOnly",
      //         "title",
      //         "content",
      //         "tagsReferences"
      //       )
      //       VALUES (
      //         ${new Date().toISOString()},
      //         ${response.locals.course.id},
      //         ${cryptoRandomString({ length: 10, type: "numeric" })},
      //         ${response.locals.enrollment.id},
      //         ${
      //           typeof request.body.type === "string" &&
      //           request.body.type.trim() !== ""
      //             ? request.body.type
      //             : null
      //         },
      //         ${request.body.isPinned === "on" ? "true" : null},
      //         ${request.body.isStaffOnly === "on" ? "true" : null},
      //         ${
      //           typeof request.body.title === "string" &&
      //           request.body.title.trim() !== ""
      //             ? request.body.title
      //             : null
      //         },
      //         ${
      //           typeof request.body.content === "string" &&
      //           request.body.content.trim() !== ""
      //             ? request.body.content
      //             : null
      //         },
      //         ${
      //           Array.isArray(request.body.tagsReferences) &&
      //           request.body.tagsReferences.every(
      //             (tagReference) =>
      //               typeof tagReference === "string" &&
      //               tagReference.trim() !== ""
      //           )
      //             ? JSON.stringify(request.body.tagsReferences)
      //             : null
      //         }
      //       )
      //       RETURNING *
      //     `
      //   )!;
      // else
      //   app.database.run(
      //     sql`
      //       UPDATE "conversationDrafts"
      //       SET "updatedAt" = ${new Date().toISOString()},
      //           "type" = ${
      //             typeof request.body.type === "string" &&
      //             request.body.type.trim() !== ""
      //               ? request.body.type
      //               : null
      //           },
      //           "isPinned" = ${request.body.isPinned === "on" ? "true" : null},
      //           "isStaffOnly" = ${
      //             request.body.isStaffOnly === "on" ? "true" : null
      //           },
      //           "title" = ${
      //             typeof request.body.title === "string" &&
      //             request.body.title.trim() !== ""
      //               ? request.body.title
      //               : null
      //           },
      //           "content" = ${
      //             typeof request.body.content === "string" &&
      //             request.body.content.trim() !== ""
      //               ? request.body.content
      //               : null
      //           },
      //           "tagsReferences" = ${
      //             Array.isArray(request.body.tagsReferences) &&
      //             request.body.tagsReferences.every(
      //               (tagReference) =>
      //                 typeof tagReference === "string" &&
      //                 tagReference.trim() !== ""
      //             )
      //               ? JSON.stringify(request.body.tagsReferences)
      //               : null
      //           }
      //       WHERE "reference" = ${conversationDraft.reference}
      //     `
      //   );
      return response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/new${qs.stringify(
          {
            conversations: request.query.conversations,
            newConversation: {
              // conversationDraftReference: conversationDraft.reference,
            },
          },
          { addQueryPrefix: true }
        )}`
      );
    }

    request.body.tagsReferences ??= [];
    request.body.selectedParticipantsReferences ??= [];
    if (
      typeof request.body.type !== "string" ||
      !application.web.locals.helpers.conversationTypes.includes(
        request.body.type
      ) ||
      typeof request.body.title !== "string" ||
      request.body.title.trim() === "" ||
      (request.body.type !== "chat" &&
        (typeof request.body.content !== "string" ||
          request.body.content.trim() === "")) ||
      (request.body.type === "chat" &&
        request.body.content !== undefined &&
        typeof request.body.content !== "string") ||
      !Array.isArray(request.body.tagsReferences) ||
      (response.locals.tags.length === 0 &&
        request.body.tagsReferences.length !== 0) ||
      (response.locals.tags.length !== 0 &&
        ((request.body.type !== "chat" &&
          request.body.tagsReferences.length === 0) ||
          request.body.tagsReferences.some(
            (tagReference) => typeof tagReference !== "string"
          ) ||
          request.body.tagsReferences.length !==
            new Set(request.body.tagsReferences).size ||
          request.body.tagsReferences.length !==
            lodash.intersection(
              request.body.tagsReferences,
              response.locals.tags.map((tag) => tag.reference)
            ).length)) ||
      typeof request.body.participants !== "string" ||
      !application.web.locals.helpers.conversationParticipantses.includes(
        request.body.participants
      ) ||
      !Array.isArray(request.body.selectedParticipantsReferences) ||
      (request.body.participants === "everyone" &&
        request.body.selectedParticipantsReferences.length > 0) ||
      (request.body.participants === "selected-people" &&
        request.body.selectedParticipantsReferences.length === 0) ||
      request.body.selectedParticipantsReferences.some(
        (selectedParticipantReference) =>
          typeof selectedParticipantReference !== "string"
      ) ||
      request.body.selectedParticipantsReferences.length !==
        new Set(request.body.selectedParticipantsReferences).size
    )
      return next("Validation");

    if (
      (request.body.participants === "staff" &&
        response.locals.enrollment.courseRole !== "staff") ||
      request.body.participants === "selected-people"
    )
      request.body.selectedParticipantsReferences.push(
        response.locals.enrollment.reference
      );
    const selectedParticipants =
      request.body.selectedParticipantsReferences.length === 0
        ? []
        : application.database.all<{
            id: number;
            courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
          }>(
            sql`
              SELECT "id", "courseRole"
              FROM "enrollments"
              WHERE
                "enrollments"."course" = ${response.locals.course.id} AND
                "reference" IN ${request.body.selectedParticipantsReferences}
            `
          );

    if (
      request.body.selectedParticipantsReferences.length !==
        selectedParticipants.length ||
      (request.body.participants === "staff" &&
        selectedParticipants.some(
          (selectedParticipant) => selectedParticipant.courseRole === "staff"
        )) ||
      ![undefined, "on"].includes(request.body.isAnnouncement) ||
      (request.body.isAnnouncement === "on" &&
        (response.locals.enrollment.courseRole !== "staff" ||
          request.body.type !== "note")) ||
      ![undefined, "on"].includes(request.body.isPinned) ||
      (request.body.isPinned === "on" &&
        response.locals.enrollment.courseRole !== "staff") ||
      ![undefined, "on"].includes(request.body.isAnonymous) ||
      (request.body.isAnonymous === "on" &&
        response.locals.enrollment.courseRole === "staff")
    )
      return next("Validation");

    const hasMessage =
      typeof request.body.content === "string" &&
      request.body.content.trim() !== "";

    const conversation = application.database.executeTransaction(() => {
      application.database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            response.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${response.locals.course.id}
        `
      );

      const conversation = application.database.get<{
        id: number;
        reference: string;
        participants: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
        type: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
        title: string;
      }>(
        sql`
          SELECT * FROM "conversations" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "conversations" (
                  "createdAt",
                  "course",
                  "reference",
                  "authorEnrollment",
                  "participants",
                  "anonymousAt",
                  "type",
                  "announcementAt",
                  "pinnedAt",
                  "title",
                  "titleSearch",
                  "nextMessageReference"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${response.locals.course.id},
                  ${String(response.locals.course.nextConversationReference)},
                  ${response.locals.enrollment.id},
                  ${request.body.participants},
                  ${
                    request.body.isAnonymous === "on"
                      ? new Date().toISOString()
                      : null
                  },
                  ${request.body.type},
                  ${
                    request.body.isAnnouncement === "on"
                      ? new Date().toISOString()
                      : null
                  },
                  ${
                    request.body.isPinned === "on"
                      ? new Date().toISOString()
                      : null
                  },
                  ${request.body.title},
                  ${html`${request.body.title!}`},
                  ${hasMessage ? 2 : 1}
                )
              `
            ).lastInsertRowid
          }
        `
      )!;

      for (const selectedParticipant of selectedParticipants)
        application.database.run(
          sql`
            INSERT INTO "conversationSelectedParticipants" ("createdAt", "conversation", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${conversation.id},
              ${selectedParticipant.id}
            )
          `
        );

      for (const tagReference of request.body.tagsReferences!)
        application.database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversation.id},
              ${
                response.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      if (hasMessage) {
        const contentPreprocessed =
          application.web.locals.partials.contentPreprocessed(
            request.body.content!
          );
        const message = application.database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            SELECT * FROM "messages" WHERE "id" = ${
              application.database.run(
                sql`
                  INSERT INTO "messages" (
                    "createdAt",
                    "conversation",
                    "reference",
                    "authorEnrollment",
                    "anonymousAt",
                    "type",
                    "contentSource",
                    "contentPreprocessed",
                    "contentSearch"
                  )
                  VALUES (
                    ${new Date().toISOString()},
                    ${conversation.id},
                    ${"1"},
                    ${response.locals.enrollment.id},
                    ${
                      request.body.isAnonymous === "on"
                        ? new Date().toISOString()
                        : null
                    },
                    ${"message"},
                    ${request.body.content},
                    ${contentPreprocessed.contentPreprocessed},
                    ${contentPreprocessed.contentSearch}
                  )
                `
              ).lastInsertRowid
            }
          `
        )!;
        application.database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${response.locals.enrollment.id}
            )
          `
        );
        application.web.locals.helpers.emailNotifications({
          request,
          response,
          message: application.web.locals.helpers.getMessage({
            request,
            response,
            conversation: application.web.locals.helpers.getConversation({
              request,
              response,
              conversationReference: conversation.reference,
            })!,
            messageReference: message.reference,
          })!,
        });
      }

      if (
        typeof request.body.conversationDraftReference === "string" &&
        request.body.conversationDraftReference.match(/^[0-9]+$/)
      )
        application.database.run(
          sql`
            DELETE FROM "conversationDrafts"
            WHERE
              "course" = ${response.locals.course.id} AND
              "reference" = ${request.body.conversationDraftReference} AND
              "authorEnrollment" = ${response.locals.enrollment.id}
          `
        );

      return conversation;
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${
        response.locals.course.reference
      }/conversations/${conversation.reference}${qs.stringify(
        { conversations: request.query.conversations },
        { addQueryPrefix: true }
      )}`
    );

    application.web.locals.helpers.liveUpdates({
      request,
      response,
      url: `/courses/${response.locals.course.reference}`,
    });
  });

  application.web.delete<
    { courseReference: string },
    HTML,
    { conversationDraftReference?: string },
    { conversations?: object },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/conversations/new",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      if (
        typeof request.body.conversationDraftReference !== "string" ||
        !request.body.conversationDraftReference.match(/^[0-9]+$/)
      )
        return next("Validation");

      const conversationDraft = application.database.get<{
        id: number;
      }>(
        sql`
          SELECT "id"
          FROM "conversationDrafts"
          WHERE
            "course" = ${response.locals.course.id} AND
            "reference" = ${request.body.conversationDraftReference} AND
            "authorEnrollment" = ${response.locals.enrollment.id}
        `
      );
      if (conversationDraft === undefined) return next("Validation");
      application.database.run(
        sql`
          DELETE FROM "conversationDrafts" WHERE "id" = ${conversationDraft.id}
        `
      );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/new${qs.stringify(
          { conversations: request.query.conversations },
          { addQueryPrefix: true }
        )}`
      );
    }
  );

  const mayEditConversation = ({
    request,
    response,
  }: {
    request: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      Application["web"]["locals"]["ResponseLocals"]["Conversation"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["Conversation"]
    >;
  }): boolean =>
    response.locals.enrollment.courseRole === "staff" ||
    (response.locals.conversation.authorEnrollment !== "no-longer-enrolled" &&
      response.locals.conversation.authorEnrollment.id ===
        response.locals.enrollment.id);

  application.web.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      conversations?: {
        search?: string;
      };
      messages?: {
        messageReference?: string;
        messagesPage?: {
          beforeMessageReference?: string;
          afterMessageReference?: string;
        };
      };
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      const beforeMessage =
        typeof request.query.messages?.messagesPage?.beforeMessageReference ===
          "string" &&
        request.query.messages.messagesPage.beforeMessageReference.trim() !== ""
          ? application.database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE
                  "conversation" = ${response.locals.conversation.id} AND
                  "reference" = ${request.query.messages.messagesPage.beforeMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const afterMessage =
        beforeMessage === undefined &&
        typeof request.query.messages?.messagesPage?.afterMessageReference ===
          "string" &&
        request.query.messages.messagesPage.afterMessageReference.trim() !== ""
          ? application.database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE
                  "conversation" = ${response.locals.conversation.id} AND
                  "reference" = ${request.query.messages.messagesPage.afterMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const messagesReverse =
        beforeMessage !== undefined ||
        (afterMessage === undefined &&
          response.locals.conversation.type === "chat");

      const messagesPageSize = 999999; // TODO: Pagination: 25

      const messagesRows = application.database.all<{ reference: string }>(
        sql`
          SELECT "reference"
          FROM "messages"
          WHERE
            "conversation" = ${response.locals.conversation.id}
            $${
              beforeMessage !== undefined
                ? sql`
                    AND "id" < ${beforeMessage.id}
                  `
                : sql``
            }
            $${
              afterMessage !== undefined
                ? sql`
                    AND "id" > ${afterMessage.id}
                  `
                : sql``
            }
            $${
              response.locals.enrollment.courseRole !== "staff"
                ? sql`
                    AND "type" != 'staffWhisper'
                  `
                : sql``
            }
          ORDER BY "id" $${messagesReverse ? sql`DESC` : sql`ASC`}
          LIMIT ${messagesPageSize + 1}
        `
      );
      const moreMessagesExist = messagesRows.length === messagesPageSize + 1;
      if (moreMessagesExist) messagesRows.pop();
      if (messagesReverse) messagesRows.reverse();
      const messages = messagesRows.map(
        (message) =>
          application.web.locals.helpers.getMessage({
            request,
            response,
            conversation: response.locals.conversation,
            messageReference: message.reference,
          })!
      );

      for (const message of messages)
        application.database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${response.locals.enrollment.id}
            )
          `
        );

      response.send(
        application.web.locals.layouts.conversation({
          request,
          response,
          head: html`
            <title>
              ${response.locals.conversation.title} ·
              ${response.locals.course.name} · Courselore
            </title>
          `,
          mainIsAScrollingPane: response.locals.conversation.type === "chat",
          body: html`
            <div
              css="${css`
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: var(--space--0);
              `}"
            >
              <div
                key="conversation--header"
                css="${css`
                  padding-bottom: var(--space--2);
                  border-bottom: var(--border-width--1) solid
                    var(--color--zinc--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--zinc--700);
                  }
                `} ${response.locals.conversation.type === "chat"
                  ? css`
                      padding-top: var(--space--4);
                      padding-right: var(--space--4);
                      padding-left: var(--space--4);
                      @media (min-width: 900px) {
                        padding-left: var(--space--8);
                      }
                      display: flex;
                      @media (max-width: 899px) {
                        justify-content: center;
                      }
                    `
                  : css``}"
              >
                <div
                  css="${response.locals.conversation.type === "chat"
                    ? css`
                        flex: 1;
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                        display: flex;
                        & > * {
                          flex: 1;
                        }
                      `
                    : css``}"
                >
                  $${response.locals.conversation.type === "chat"
                    ? html`
                        <button
                          key="conversation--header--compact"
                          class="button button--tight button--tight--inline button--transparent strong"
                          css="${css`
                            max-width: calc(100% + var(--space--2));
                            margin-top: var(--space---2);
                          `}"
                          javascript="${javascript`
                            this.onclick = () => {
                              this.closest('[key="conversation--header"]').querySelector('[key="conversation--header--compact"]').hidden = true;
                              this.closest('[key="conversation--header"]').querySelector('[key="conversation--header--full"]').hidden = false;
                            };
                          `}"
                        >
                          <span
                            css="${css`
                              flex: 1;
                              text-align: left;
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `}"
                          >
                            $${application.web.locals.helpers.highlightSearchResult(
                              html`${response.locals.conversation.title}`,
                              typeof request.query.conversations?.search ===
                                "string" &&
                                request.query.conversations.search.trim() !== ""
                                ? request.query.conversations.search
                                : undefined
                            )}
                          </span>
                          <i class="bi bi-chevron-bar-expand"></i>
                        </button>
                      `
                    : html``}

                  <div
                    key="conversation--header--full"
                    $${response.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--1);
                    `}"
                  >
                    <div
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `}"
                    >
                      <div
                        css="${css`
                          flex: 1;
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--1);

                          & > * {
                            display: flex;
                            gap: var(--space--1);
                          }
                        `}"
                      >
                        $${mayEditConversation({ request, response })
                          ? html`
                              <div>
                                <button
                                  class="button button--tight button--tight--inline button--tight-gap button--transparent ${response
                                    .locals.conversation.type === "question" &&
                                  response.locals.conversation.resolvedAt !==
                                    null
                                    ? "text--emerald"
                                    : textColorsConversationType[
                                        response.locals.conversation.type
                                      ]}"
                                  javascript="${javascript`
                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      tippyProps: {
                                        touch: false,
                                        content: "Update Conversation Type",
                                      },
                                    });

                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      elementProperty: "dropdown",
                                      tippyProps: {
                                        trigger: "click",
                                        interactive: true,
                                        content: ${html`
                                          <div class="dropdown--menu">
                                            $${application.web.locals.helpers.conversationTypes.map(
                                              (conversationType) => html`
                                                <form
                                                  key="conversation-type--${conversationType}"
                                                  method="PATCH"
                                                  action="https://${application
                                                    .configuration
                                                    .hostname}/courses/${response
                                                    .locals.course
                                                    .reference}/conversations/${response
                                                    .locals.conversation
                                                    .reference}${qs.stringify(
                                                    {
                                                      conversations:
                                                        request.query
                                                          .conversations,
                                                      messages:
                                                        request.query.messages,
                                                    },
                                                    { addQueryPrefix: true }
                                                  )}"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="type"
                                                    value="${conversationType}"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button ${conversationType ===
                                                    response.locals.conversation
                                                      .type
                                                      ? "button--blue"
                                                      : "button--transparent"} ${textColorsConversationType[
                                                      conversationType
                                                    ]}"
                                                  >
                                                    $${iconsConversationType[
                                                      conversationType
                                                    ].fill}
                                                    $${lodash.capitalize(
                                                      conversationType
                                                    )}
                                                  </button>
                                                </form>
                                              `
                                            )}
                                          </div>
                                        `},  
                                      },
                                    });
                                  `}"
                                >
                                  $${iconsConversationType[
                                    response.locals.conversation.type
                                  ].fill}
                                  $${lodash.capitalize(
                                    response.locals.conversation.type
                                  )}
                                </button>
                              </div>
                            `
                          : html`
                              <div
                                class="${response.locals.conversation.type ===
                                  "question" &&
                                response.locals.conversation.resolvedAt !== null
                                  ? "text--emerald"
                                  : textColorsConversationType[
                                      response.locals.conversation.type
                                    ]}"
                              >
                                $${iconsConversationType[
                                  response.locals.conversation.type
                                ].fill}
                                $${lodash.capitalize(
                                  response.locals.conversation.type
                                )}
                              </div>
                            `}
                        $${response.locals.conversation.type === "question"
                          ? html`
                              $${response.locals.enrollment.courseRole ===
                              "staff"
                                ? html`
                                    <form
                                      method="PATCH"
                                      action="https://${application
                                        .configuration
                                        .hostname}/courses/${response.locals
                                        .course
                                        .reference}/conversations/${response
                                        .locals.conversation
                                        .reference}${qs.stringify(
                                        {
                                          conversations:
                                            request.query.conversations,
                                          messages: request.query.messages,
                                        },
                                        { addQueryPrefix: true }
                                      )}"
                                    >
                                      $${response.locals.conversation
                                        .resolvedAt === null
                                        ? html`
                                            <input
                                              key="isResolved--true"
                                              type="hidden"
                                              name="isResolved"
                                              value="true"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--rose"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Set as Resolved",
                                                  },
                                                });
                                              `}"
                                            >
                                              <i
                                                class="bi bi-patch-exclamation-fill"
                                              ></i>
                                              Unresolved
                                            </button>
                                          `
                                        : html`
                                            <input
                                              key="isResolved--false"
                                              type="hidden"
                                              name="isResolved"
                                              value="false"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--emerald"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Set as Unresolved",
                                                  },
                                                });
                                              `}"
                                            >
                                              <i
                                                class="bi bi-patch-check-fill"
                                              ></i>
                                              Resolved
                                            </button>
                                          `}
                                    </form>
                                  `
                                : response.locals.conversation.resolvedAt ===
                                  null
                                ? html`
                                    <div
                                      class="text--rose"
                                      css="${css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `}"
                                    >
                                      <i
                                        class="bi bi-patch-exclamation-fill"
                                      ></i>
                                      Unresolved
                                    </div>
                                  `
                                : html`
                                    <div
                                      class="text--emerald"
                                      css="${css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `}"
                                    >
                                      <i class="bi bi-patch-check-fill"></i>
                                      Resolved
                                    </div>
                                  `}
                            `
                          : html``}
                        $${response.locals.conversation.type === "note"
                          ? html`
                              $${response.locals.enrollment.courseRole ===
                              "staff"
                                ? html`
                                    <form
                                      method="PATCH"
                                      action="https://${application
                                        .configuration
                                        .hostname}/courses/${response.locals
                                        .course
                                        .reference}/conversations/${response
                                        .locals.conversation
                                        .reference}${qs.stringify(
                                        {
                                          conversations:
                                            request.query.conversations,
                                          messages: request.query.messages,
                                        },
                                        { addQueryPrefix: true }
                                      )}"
                                    >
                                      $${response.locals.conversation
                                        .announcementAt === null
                                        ? html`
                                            <input
                                              key="isAnnouncement--true"
                                              type="hidden"
                                              name="isAnnouncement"
                                              value="true"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Set as Announcement",
                                                  },
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-megaphone"></i>
                                              Not an Announcement
                                            </button>
                                          `
                                        : html`
                                            <input
                                              key="isAnnouncement--false"
                                              type="hidden"
                                              name="isAnnouncement"
                                              value="false"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--orange"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Set as Not an Announcement",
                                                  },
                                                });
                                              `}"
                                            >
                                              <i
                                                class="bi bi-megaphone-fill"
                                              ></i>
                                              Announcement
                                            </button>
                                          `}
                                    </form>
                                  `
                                : response.locals.conversation
                                    .announcementAt !== null
                                ? html`
                                    <div class="text--orange">
                                      <i class="bi bi-megaphone-fill"></i>
                                      Announcement
                                    </div>
                                  `
                                : html``}
                            `
                          : html``}
                        $${response.locals.enrollment.courseRole === "staff"
                          ? html`
                              <form
                                method="PATCH"
                                action="https://${application.configuration
                                  .hostname}/courses/${response.locals.course
                                  .reference}/conversations/${response.locals
                                  .conversation.reference}${qs.stringify(
                                  {
                                    conversations: request.query.conversations,
                                    messages: request.query.messages,
                                  },
                                  { addQueryPrefix: true }
                                )}"
                              >
                                $${response.locals.conversation.pinnedAt ===
                                null
                                  ? html`
                                      <input
                                        key="isPinned--true"
                                        type="hidden"
                                        name="isPinned"
                                        value="true"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        javascript="${javascript`
                                          leafac.setTippy({
                                            event,
                                            element: this,
                                            tippyProps: {
                                              touch: false,
                                              content: "Pin",
                                            },
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-angle"></i>
                                        Unpinned
                                      </button>
                                    `
                                  : html`
                                      <input
                                        key="isPinned--false"
                                        type="hidden"
                                        name="isPinned"
                                        value="false"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--amber"
                                        javascript="${javascript`
                                          leafac.setTippy({
                                            event,
                                            element: this,
                                            tippyProps: {
                                              touch: false,
                                              content: "Unpin",
                                            },
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-fill"></i>
                                        Pinned
                                      </button>
                                    `}
                              </form>
                            `
                          : response.locals.conversation.pinnedAt !== null
                          ? html`
                              <div class="text--amber">
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </div>
                            `
                          : html``}
                      </div>

                      <div>
                        <button
                          class="button button--tight button--tight--inline button--transparent secondary"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Actions",
                              },
                            });

                            leafac.setTippy({
                              event,
                              element: this,
                              elementProperty: "dropdown",
                              tippyProps: {
                                trigger: "click",
                                interactive: true,
                                content: ${html`
                                  <h3 class="heading">
                                    <i class="bi bi-chat-text-fill"></i>
                                    Conversation
                                    #${response.locals.conversation.reference}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          elementProperty: "copied",
                                          tippyProps: {
                                            theme: "green",
                                            trigger: "manual",
                                            content: "Copied",
                                          },
                                        });

                                        this.onclick = async () => {
                                          await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`});
                                          this.copied.show();
                                          await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                          this.copied.hide();
                                        };
                                      `}"
                                    >
                                      <i class="bi bi-link"></i>
                                      Copy Conversation Permanent Link
                                    </button>
                                    $${mayEditConversation({
                                      request,
                                      response,
                                    })
                                      ? html`
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            javascript="${javascript`
                                              this.onclick = () => {
                                                this.closest('[key="conversation--header--full"]').querySelector('[key="title--show"]').hidden = true;
                                                this.closest('[key="conversation--header--full"]').querySelector('[key="title--edit"]').hidden = false;
                                                tippy.hideAll();
                                              };
                                            `}"
                                          >
                                            <i class="bi bi-pencil"></i>
                                            Edit Conversation Title
                                          </button>
                                        `
                                      : html``}
                                    $${response.locals.conversation
                                      .authorEnrollment !==
                                      "no-longer-enrolled" &&
                                    response.locals.conversation
                                      .authorEnrollment.courseRole ===
                                      "student" &&
                                    mayEditConversation({ request, response })
                                      ? html`
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${response
                                              .locals.course
                                              .reference}/conversations/${response
                                              .locals.conversation
                                              .reference}${qs.stringify(
                                              {
                                                conversations:
                                                  request.query.conversations,
                                                messages:
                                                  request.query.messages,
                                              },
                                              { addQueryPrefix: true }
                                            )}"
                                            class="dropdown--menu"
                                          >
                                            $${response.locals.conversation
                                              .anonymousAt === null
                                              ? html`
                                                  <input
                                                    key="isAnonymous--true"
                                                    type="hidden"
                                                    name="isAnonymous"
                                                    value="true"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button button--transparent"
                                                  >
                                                    <span
                                                      css="${css`
                                                        margin-left: var(
                                                          --space---0-5
                                                        );
                                                      `}"
                                                    >
                                                      $${application.web.locals.partials.user(
                                                        {
                                                          request,
                                                          response,
                                                          name: false,
                                                          size: "xs",
                                                        }
                                                      )}
                                                    </span>
                                                    Set as Anonymous to Other
                                                    Students
                                                  </button>
                                                `
                                              : html`
                                                  <input
                                                    key="isAnonymous--false"
                                                    type="hidden"
                                                    name="isAnonymous"
                                                    value="false"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button button--transparent"
                                                  >
                                                    <span
                                                      css="${css`
                                                        margin-left: var(
                                                          --space---0-5
                                                        );
                                                      `}"
                                                    >
                                                      $${application.web.locals.partials.user(
                                                        {
                                                          request,
                                                          response,
                                                          user: response.locals
                                                            .conversation
                                                            .authorEnrollment
                                                            .user,
                                                          decorate: false,
                                                          name: false,
                                                          size: "xs",
                                                        }
                                                      )}
                                                    </span>
                                                    Set as Signed by
                                                    ${response.locals
                                                      .conversation
                                                      .authorEnrollment.id ===
                                                    response.locals.enrollment
                                                      .id
                                                      ? "You"
                                                      : response.locals
                                                          .conversation
                                                          .authorEnrollment.user
                                                          .name}
                                                  </button>
                                                `}
                                          </form>
                                        `
                                      : html``}
                                    $${response.locals.enrollment.courseRole ===
                                      "staff" &&
                                    response.locals.enrollments.length > 1 &&
                                    messages.length > 0 &&
                                    messages[0].reference ===
                                      "1" /* TODO: Pagination */
                                      ? html`
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            javascript="${javascript`
                                              leafac.setTippy({
                                                event,
                                                element: this,
                                                tippyProps: {
                                                  trigger: "click",
                                                  interactive: true,
                                                  onHidden: () => { this.onmouseleave(); },
                                                  content: ${html`
                                                    <div
                                                      key="loading"
                                                      css="${css`
                                                        display: flex;
                                                        gap: var(--space--2);
                                                        align-items: center;
                                                      `}"
                                                    >
                                                      $${application.web.locals.partials.spinner(
                                                        {
                                                          request,
                                                          response,
                                                        }
                                                      )}
                                                      Loading…
                                                    </div>
                                                    <div
                                                      key="content"
                                                      hidden
                                                    ></div>
                                                  `},
                                                },
                                              });

                                              window.clearTimeout(this.tooltipContentTimeout);
                                              this.tooltipContentSkipLoading = false;
                                              
                                              this.onmouseenter = this.onfocus = async () => {
                                                window.clearTimeout(this.tooltipContentTimeout);
                                                if (this.tooltipContentSkipLoading) return;
                                                this.tooltipContentSkipLoading = true;
                                                leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/1/reuse`}, { cache: "no-store" })).text());
                                                this.tooltip.props.content.querySelector('[key="loading"]').hidden = true;
                                                this.tooltip.props.content.querySelector('[key="content"]').hidden = false;
                                                this.tooltip.setProps({});
                                              };
                                              
                                              this.onmouseleave = this.onblur = () => {
                                                window.clearTimeout(this.tooltipContentTimeout);
                                                if (this.matches(":hover, :focus-within") || this.tooltip.state.isShown) return;
                                                this.tooltipContentTimeout = window.setTimeout(() => {
                                                  this.tooltip.props.content.querySelector('[key="loading"]').hidden = false;
                                                  this.tooltip.props.content.querySelector('[key="content"]').hidden = true;
                                                  this.tooltipContentSkipLoading = false;
                                                }, 60 * 1000);
                                              };
                                            `}"
                                          >
                                            <i class="bi bi-recycle"></i>
                                            Reuse Conversation in Another Course
                                          </button>
                                        `
                                      : html``}
                                    $${response.locals.enrollment.courseRole ===
                                    "staff"
                                      ? html`
                                          <div>
                                            <button
                                              class="dropdown--menu--item button button--transparent"
                                              javascript="${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  elementProperty: "dropdown",
                                                  tippyProps: {
                                                    theme: "rose",
                                                    trigger: "click",
                                                    interactive: true,
                                                    content: ${html`
                                                      <form
                                                        method="DELETE"
                                                        action="https://${application
                                                          .configuration
                                                          .hostname}/courses/${response
                                                          .locals.course
                                                          .reference}/conversations/${response
                                                          .locals.conversation
                                                          .reference}${qs.stringify(
                                                          {
                                                            conversations:
                                                              request.query
                                                                .conversations,
                                                          },
                                                          {
                                                            addQueryPrefix:
                                                              true,
                                                          }
                                                        )}"
                                                        css="${css`
                                                          padding: var(
                                                            --space--2
                                                          );
                                                          display: flex;
                                                          flex-direction: column;
                                                          gap: var(--space--4);
                                                        `}"
                                                      >
                                                        <p>
                                                          Are you sure you want
                                                          to remove this
                                                          conversation?
                                                        </p>
                                                        <p>
                                                          <strong
                                                            css="${css`
                                                              font-weight: var(
                                                                --font-weight--bold
                                                              );
                                                            `}"
                                                          >
                                                            You may not undo
                                                            this action!
                                                          </strong>
                                                        </p>
                                                        <button
                                                          class="button button--rose"
                                                        >
                                                          <i
                                                            class="bi bi-trash-fill"
                                                          ></i>
                                                          Remove Conversation
                                                        </button>
                                                      </form>
                                                    `},  
                                                  },
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-trash"></i>
                                              Remove Conversation
                                            </button>
                                          </div>
                                        `
                                      : html``}
                                  </div>
                                `},  
                              },
                            });
                          `}"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>

                    <h2
                      key="title--show"
                      class="strong"
                      css="${css`
                        font-size: var(--font-size--lg);
                        line-height: var(--line-height--lg);
                      `}"
                    >
                      $${application.web.locals.helpers.highlightSearchResult(
                        html`${response.locals.conversation.title}`,
                        typeof request.query.conversations?.search ===
                          "string" &&
                          request.query.conversations.search.trim() !== ""
                          ? request.query.conversations.search
                          : undefined
                      )}
                    </h2>

                    $${mayEditConversation({ request, response })
                      ? html`
                          <form
                            key="title--edit"
                            method="PATCH"
                            action="https://${application.configuration
                              .hostname}/courses/${response.locals.course
                              .reference}/conversations/${response.locals
                              .conversation.reference}${qs.stringify(
                              {
                                conversations: request.query.conversations,
                                messages: request.query.messages,
                              },
                              { addQueryPrefix: true }
                            )}"
                            novalidate
                            hidden
                            css="${css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: center;
                            `}"
                          >
                            <input
                              type="text"
                              name="title"
                              value="${response.locals.conversation.title}"
                              required
                              autocomplete="off"
                              class="input--text"
                            />
                            <button
                              class="button button--tight button--tight--inline button--transparent text--green"
                              css="${css`
                                flex: 1;
                              `}"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    theme: "green",
                                    touch: false,
                                    content: "Update Title",
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-check-lg"></i>
                            </button>
                            <button
                              type="reset"
                              class="button button--tight button--tight--inline button--transparent text--rose"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    theme: "rose",
                                    touch: false,
                                    content: "Cancel",
                                  },
                                });

                                this.onclick = () => {
                                  this.closest('[key="conversation--header--full"]').querySelector('[key="title--show"]').hidden = false;
                                  this.closest('[key="conversation--header--full"]').querySelector('[key="title--edit"]').hidden = true;
                                };
                              `}"
                            >
                              <i class="bi bi-x-lg"></i>
                            </button>
                          </form>
                        `
                      : html``}
                    $${(() => {
                      let tags = html``;

                      for (const tagging of response.locals.conversation
                        .taggings)
                        if (!mayEditConversation({ request, response }))
                          tags += html`
                            $${response.locals.conversation.taggings.map(
                              (tagging) => html`
                                <div class="text--teal">
                                  <i class="bi bi-tag-fill"></i>
                                  ${tagging.tag.name}
                                </div>
                              `
                            )}
                          `;
                        else if (
                          response.locals.conversation.taggings.length === 1 &&
                          response.locals.conversation.type !== "chat"
                        )
                          tags += html`
                            <div
                              css="${css`
                                display: flex;
                                gap: var(--space--2);
                              `}"
                            >
                              <span
                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal disabled"
                                css="${css`
                                  color: var(--color--teal--600);
                                  @media (prefers-color-scheme: dark) {
                                    color: var(--color--teal--500);
                                  }
                                  text-align: left;
                                `}"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      theme: "rose",
                                      touch: false,
                                      content: "You may not remove this tag because a conversation must have at least one tag.",
                                    },
                                  });
                                `}"
                              >
                                <i class="bi bi-tag-fill"></i>
                                ${tagging.tag.name}
                              </span>
                              $${tagging.tag.staffOnlyAt !== null
                                ? html`
                                    <span
                                      class="text--sky"
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            content: "This tag is visible by staff only.",
                                          },
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-mortarboard-fill"></i>
                                    </span>
                                  `
                                : html``}
                            </div>
                          `;
                        else
                          tags += html`
                            <form
                              key="tagging--${tagging.tag.reference}"
                              method="DELETE"
                              action="https://${application.configuration
                                .hostname}/courses/${response.locals.course
                                .reference}/conversations/${response.locals
                                .conversation.reference}/taggings${qs.stringify(
                                {
                                  conversations: request.query.conversations,
                                  messages: request.query.messages,
                                },
                                { addQueryPrefix: true }
                              )}"
                              css="${css`
                                display: flex;
                                gap: var(--space--2);
                              `}"
                            >
                              <input
                                type="hidden"
                                name="reference"
                                value="${tagging.tag.reference}"
                              />
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal"
                                css="${css`
                                  text-align: left;
                                `}"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      theme: "rose",
                                      touch: false,
                                      content: "Remove Tag",
                                    },
                                  });
                                `}"
                              >
                                <i class="bi bi-tag-fill"></i>
                                ${tagging.tag.name}
                              </button>
                              $${tagging.tag.staffOnlyAt !== null
                                ? html`
                                    <span
                                      class="text--sky"
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            content: "This tag is visible by staff only.",
                                          },
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-mortarboard-fill"></i>
                                    </span>
                                  `
                                : html``}
                            </form>
                          `;

                      if (
                        response.locals.enrollment.courseRole === "staff" ||
                        (mayEditConversation({ request, response }) &&
                          response.locals.tags.length > 0)
                      )
                        tags += html`
                          <div>
                            <button
                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Add Tag",
                                  },
                                });
                                
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  elementProperty: "dropdown",
                                  tippyProps: {
                                    trigger: "click",
                                    interactive: true,
                                    content: ${html`
                                      <div
                                        css="${css`
                                          max-height: var(--space--40);
                                          overflow: auto;
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `}"
                                      >
                                        $${response.locals.enrollment
                                          .courseRole === "staff"
                                          ? html`
                                              <div class="dropdown--menu">
                                                <a
                                                  href="https://${application
                                                    .configuration
                                                    .hostname}/courses/${response
                                                    .locals.course
                                                    .reference}/settings/tags"
                                                  target="_blank"
                                                  class="dropdown--menu--item button button--transparent"
                                                >
                                                  <i class="bi bi-sliders"></i>
                                                  Manage Tags
                                                </a>
                                              </div>

                                              <hr class="separator" />
                                            `
                                          : html``}

                                        <div class="dropdown--menu">
                                          $${response.locals.tags.map((tag) =>
                                            !response.locals.conversation.taggings.some(
                                              (tagging) =>
                                                tagging.tag.id === tag.id
                                            )
                                              ? html`
                                                  <form
                                                    key="tag--${tag.reference}"
                                                    method="POST"
                                                    action="https://${application
                                                      .configuration
                                                      .hostname}/courses/${response
                                                      .locals.course
                                                      .reference}/conversations/${response
                                                      .locals.conversation
                                                      .reference}/taggings${qs.stringify(
                                                      {
                                                        conversations:
                                                          request.query
                                                            .conversations,
                                                        messages:
                                                          request.query
                                                            .messages,
                                                      },
                                                      { addQueryPrefix: true }
                                                    )}"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="reference"
                                                      value="${tag.reference}"
                                                    />
                                                    <button
                                                      class="dropdown--menu--item button button--transparent text--teal"
                                                    >
                                                      <i
                                                        class="bi bi-tag-fill"
                                                      ></i>
                                                      ${tag.name}
                                                      $${tag.staffOnlyAt !==
                                                      null
                                                        ? html`
                                                            <span
                                                              class="text--sky"
                                                              javascript="${javascript`
                                                                leafac.setTippy({
                                                                  event,
                                                                  element: this,
                                                                  tippyProps: {
                                                                    touch: false,
                                                                    content: "This tag is visible by staff only.",
                                                                  },
                                                                });
                                                              `}"
                                                            >
                                                              <i
                                                                class="bi bi-mortarboard-fill"
                                                              ></i>
                                                            </span>
                                                          `
                                                        : html``}
                                                    </button>
                                                  </form>
                                                `
                                              : response.locals.conversation
                                                  .taggings.length === 1 &&
                                                response.locals.conversation
                                                  .type !== "chat"
                                              ? html`
                                                  <div
                                                    class="dropdown--menu--item button button--blue text--teal disabled"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          theme: "rose",
                                                          touch: false,
                                                          content: "You may not remove this tag because a conversation must have at least one tag.",
                                                        },
                                                      });
                                                    `}"
                                                  >
                                                    <i
                                                      class="bi bi-tag-fill"
                                                    ></i>
                                                    ${tag.name}
                                                    $${tag.staffOnlyAt !== null
                                                      ? html`
                                                          <span
                                                            class="text--sky"
                                                            javascript="${javascript`
                                                              leafac.setTippy({
                                                                event,
                                                                element: this,
                                                                tippyProps: {
                                                                  touch: false,
                                                                  content: "This tag is visible by staff only.",
                                                                },
                                                              });
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-mortarboard-fill"
                                                            ></i>
                                                          </span>
                                                        `
                                                      : html``}
                                                  </div>
                                                `
                                              : html`
                                                  <form
                                                    key="tag--${tag.reference}"
                                                    method="DELETE"
                                                    action="https://${application
                                                      .configuration
                                                      .hostname}/courses/${response
                                                      .locals.course
                                                      .reference}/conversations/${response
                                                      .locals.conversation
                                                      .reference}/taggings${qs.stringify(
                                                      {
                                                        conversations:
                                                          request.query
                                                            .conversations,
                                                        messages:
                                                          request.query
                                                            .messages,
                                                      },
                                                      { addQueryPrefix: true }
                                                    )}"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="reference"
                                                      value="${tag.reference}"
                                                    />
                                                    <button
                                                      class="dropdown--menu--item button button--blue text--teal"
                                                    >
                                                      <i
                                                        class="bi bi-tag-fill"
                                                      ></i>
                                                      ${tag.name}
                                                      $${tag.staffOnlyAt !==
                                                      null
                                                        ? html`
                                                            <span
                                                              class="text--sky"
                                                              javascript="${javascript`
                                                                leafac.setTippy({
                                                                  event,
                                                                  element: this,
                                                                  tippyProps: {
                                                                    touch: false,
                                                                    content: "This tag is visible by staff only.",
                                                                  },
                                                                });
                                                              `}"
                                                            >
                                                              <i
                                                                class="bi bi-mortarboard-fill"
                                                              ></i>
                                                            </span>
                                                          `
                                                        : html``}
                                                    </button>
                                                  </form>
                                                `
                                          )}
                                        </div>
                                      </div>
                                    `},  
                                  },
                                });
                              `}"
                            >
                              <i class="bi bi-tags-fill"></i>
                              Tags
                            </button>
                          </div>
                        `;

                      return tags !== html``
                        ? html`
                            <div
                              css="${css`
                                font-size: var(--font-size--xs);
                                line-height: var(--line-height--xs);
                                display: flex;
                                flex-wrap: wrap;
                                column-gap: var(--space--8);
                                row-gap: var(--space--1);

                                & > * {
                                  display: flex;
                                  gap: var(--space--1);
                                }
                              `}"
                            >
                              $${tags}
                            </div>
                          `
                        : html``;
                    })()}
                    $${mayEditConversation({ request, response })
                      ? (() => {
                          const enrollments = application.database
                            .all<{
                              id: number;
                              userId: number;
                              userLastSeenOnlineAt: string;
                              userReference: string;
                              userEmail: string;
                              userName: string;
                              userAvatar: string | null;
                              userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
                              userBiographySource: string | null;
                              userBiographyPreprocessed: HTML | null;
                              reference: string;
                              courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
                            }>(
                              sql`
                                SELECT
                                  "enrollments"."id",
                                  "users"."id" AS "userId",
                                  "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                                  "users"."reference" AS "userReference",
                                  "users"."email" AS "userEmail",
                                  "users"."name" AS "userName",
                                  "users"."avatar" AS "userAvatar",
                                  "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                                  "users"."biographySource" AS "userBiographySource",
                                  "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                                  "enrollments"."reference",
                                  "enrollments"."courseRole"
                                FROM "enrollments"
                                JOIN "users" ON "enrollments"."user" = "users"."id"
                                WHERE
                                  "enrollments"."course" = ${response.locals.course.id} AND
                                  "enrollments"."id" != ${response.locals.enrollment.id}
                                ORDER BY
                                  "enrollments"."courseRole" = 'staff' DESC,
                                  "users"."name" ASC
                              `
                            )
                            .map((enrollment) => ({
                              id: enrollment.id,
                              user: {
                                id: enrollment.userId,
                                lastSeenOnlineAt:
                                  enrollment.userLastSeenOnlineAt,
                                reference: enrollment.userReference,
                                email: enrollment.userEmail,
                                name: enrollment.userName,
                                avatar: enrollment.userAvatar,
                                avatarlessBackgroundColor:
                                  enrollment.userAvatarlessBackgroundColor,
                                biographySource: enrollment.userBiographySource,
                                biographyPreprocessed:
                                  enrollment.userBiographyPreprocessed,
                              },
                              reference: enrollment.reference,
                              courseRole: enrollment.courseRole,
                            }));

                          return html`
                            <form
                              method="PATCH"
                              action="https://${application.configuration
                                .hostname}/courses/${response.locals.course
                                .reference}/conversations/${response.locals
                                .conversation.reference}${qs.stringify(
                                {
                                  conversations: request.query.conversations,
                                  messages: request.query.messages,
                                },
                                { addQueryPrefix: true }
                              )}"
                              css="${css`
                                font-size: var(--font-size--xs);
                                line-height: var(--line-height--xs);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `}"
                            >
                              <div
                                css="${css`
                                  max-height: var(--space--24);
                                  padding: var(--space--1);
                                  margin: var(--space---1);
                                  overflow: auto;
                                  display: flex;
                                  flex-wrap: wrap;
                                  column-gap: var(--space--8);
                                  row-gap: var(--space--1);
                                `}"
                              >
                                <div
                                  key="participants"
                                  javascript="${javascript`
                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      elementProperty: "dropdown",
                                      tippyProps: {
                                        trigger: "click",
                                        interactive: true,
                                        placement: "bottom",
                                        content: ${html`
                                          <div
                                            key="participants--dropdown"
                                            css="${css`
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            <div class="dropdown--menu">
                                              $${application.web.locals.helpers.conversationParticipantses.map(
                                                (
                                                  conversationParticipants
                                                ) => html`
                                                  <label>
                                                    <input
                                                      type="radio"
                                                      name="participants--dropdown--participants"
                                                      value="${conversationParticipants}"
                                                      $${response.locals
                                                        .conversation
                                                        .participants ===
                                                      conversationParticipants
                                                        ? html`checked`
                                                        : html``}
                                                      class="visually-hidden input--radio-or-checkbox--multilabel"
                                                      javascript="${javascript`
                                                        this.isModified = false;

                                                        this.onchange = () => {
                                                          this.closest("form").querySelector(${`[name="participants"][value="${conversationParticipants}"]`}).checked = true;

                                                          const participantsDropdown = this.closest('[key="participants--dropdown"]');
                                                          const selectedParticipants = participantsDropdown.querySelector('[key="participants--dropdown--selected-participants"]');

                                                          if (${
                                                            conversationParticipants ===
                                                            "everyone"
                                                          }) {
                                                            selectedParticipants.hidden = true;

                                                            for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                              element.disabled = true;
                                                          } else if (${
                                                            conversationParticipants ===
                                                            "staff"
                                                          }) {
                                                            selectedParticipants.hidden = false;

                                                            for (const element of selectedParticipants.querySelectorAll('[data-enrollment-course-role="staff"]'))
                                                              element.hidden = true;
                                                            participantsDropdown.querySelector('[key="participants--dropdown--selected-participants--filter"]').oninput();

                                                            for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                              element.disabled = element.matches('[data-enrollment-course-role="staff"]');
                                                          } else if (${
                                                            conversationParticipants ===
                                                            "selected-people"
                                                          }) {
                                                            selectedParticipants.hidden = false;

                                                            for (const element of selectedParticipants.querySelectorAll('[data-enrollment-course-role="staff"]'))
                                                              element.hidden = false;
                                                            participantsDropdown.querySelector('[key="participants--dropdown--selected-participants--filter"]').oninput();

                                                            for (const element of this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]'))
                                                              element.disabled = false;
                                                          }

                                                          this.closest("form").querySelector('[key="submit"]').hidden = !leafac.isModified(this.closest("form"));
                                                        };
                                                      `}"
                                                    />
                                                    <span
                                                      class="dropdown--menu--item button button--transparent ${textColorsConversationParticipants[
                                                        conversationParticipants
                                                      ]}"
                                                    >
                                                      $${iconsConversationParticipants[
                                                        conversationParticipants
                                                      ].fill}
                                                      $${labelsConversationParticipants[
                                                        conversationParticipants
                                                      ]}
                                                    </span>
                                                    <span
                                                      class="dropdown--menu--item button button--blue"
                                                    >
                                                      $${iconsConversationParticipants[
                                                        conversationParticipants
                                                      ].fill}
                                                      $${labelsConversationParticipants[
                                                        conversationParticipants
                                                      ]}
                                                    </span>
                                                  </label>
                                                `
                                              )}
                                            </div>

                                            <div
                                              key="participants--dropdown--selected-participants"
                                              $${[
                                                "staff",
                                                "selected-people",
                                              ].includes(
                                                response.locals.conversation
                                                  .participants
                                              )
                                                ? html``
                                                : html`hidden`}
                                              css="${css`
                                                display: flex;
                                                flex-direction: column;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              <hr class="dropdown--separator" />

                                              $${response.locals
                                                .courseEnrollmentsCount === 1
                                                ? html`
                                                    <p
                                                      class="secondary"
                                                      css="${css`
                                                        padding: var(--space--0)
                                                          var(--space--2)
                                                          var(--space--2);
                                                      `}"
                                                    >
                                                      You may select
                                                      participants when there
                                                      are more people enrolled
                                                      in the course.
                                                    </p>
                                                  `
                                                : html`
                                                    <div
                                                      css="${css`
                                                        padding: var(--space--0)
                                                          var(--space--2);
                                                      `}"
                                                    >
                                                      <label
                                                        css="${css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                          align-items: baseline;
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-funnel"
                                                        ></i>
                                                        <input
                                                          key="participants--dropdown--selected-participants--filter"
                                                          type="text"
                                                          class="input--text"
                                                          placeholder="Filter…"
                                                          javascript="${javascript`
                                                            this.isModified = false;

                                                            this.oninput = () => {
                                                              const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                                                              const participantsDropdown = this.closest('[key="participants--dropdown"]');
                                                              const participantsIsStaff = participantsDropdown.querySelector('[name="participants--dropdown--participants"][value="staff"]').checked;
                                                              for (const selectedParticipant of participantsDropdown.querySelectorAll('[key^="participants--dropdown--selected-participant--enrollment-reference--"]')) {
                                                                if (participantsIsStaff && selectedParticipant.matches('[data-enrollment-course-role="staff"]'))
                                                                  continue;
                                                                let selectedParticipantHidden = filterPhrases.length > 0;
                                                                for (const filterablePhrasesElement of selectedParticipant.querySelectorAll("[data-filterable-phrases]")) {
                                                                  const filterablePhrases = JSON.parse(filterablePhrasesElement.getAttribute("data-filterable-phrases"));
                                                                  const filterablePhrasesElementChildren = [];
                                                                  for (const filterablePhrase of filterablePhrases) {
                                                                    let filterablePhraseElement;
                                                                    if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                                                                      filterablePhraseElement = document.createElement("mark");
                                                                      filterablePhraseElement.classList.add("mark");
                                                                      selectedParticipantHidden = false;
                                                                    } else
                                                                      filterablePhraseElement = document.createElement("span");
                                                                    filterablePhraseElement.textContent = filterablePhrase;
                                                                    filterablePhrasesElementChildren.push(filterablePhraseElement);
                                                                  }
                                                                  filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                                                                }
                                                                selectedParticipant.hidden = selectedParticipantHidden;
                                                              }
                                                            };
                                                          `}"
                                                        />
                                                      </label>
                                                    </div>

                                                    <hr
                                                      class="dropdown--separator"
                                                    />

                                                    <div
                                                      class="dropdown--menu"
                                                      css="${css`
                                                        height: var(
                                                          --space--40
                                                        );
                                                        overflow: auto;
                                                      `}"
                                                    >
                                                      $${enrollments.map(
                                                        (enrollment) => html`
                                                          <label
                                                            key="participants--dropdown--selected-participant--enrollment-reference--${enrollment.reference}"
                                                            data-enrollment-course-role="${enrollment.courseRole}"
                                                            $${response.locals
                                                              .conversation
                                                              .participants ===
                                                              "staff" &&
                                                            enrollment.courseRole ===
                                                              "staff"
                                                              ? html`hidden`
                                                              : html``}
                                                          >
                                                            <input
                                                              type="checkbox"
                                                              name="participants--dropdown--selected-participants[]"
                                                              value="${enrollment.reference}"
                                                              $${response.locals.conversation.selectedParticipants.find(
                                                                (
                                                                  selectedParticipant
                                                                ) =>
                                                                  selectedParticipant.id ===
                                                                  enrollment.id
                                                              ) !== undefined
                                                                ? html`checked`
                                                                : html``}
                                                              class="visually-hidden input--radio-or-checkbox--multilabel"
                                                              javascript="${javascript`
                                                                this.isModified = false;

                                                                this.onchange = () => {
                                                                  this.closest("form").querySelector(${`[name="selectedParticipantsReferences[]"][value="${enrollment.reference}"]`}).checked = this.checked;

                                                                  this.closest("form").querySelector('[key="submit"]').hidden = !leafac.isModified(this.closest("form"));
                                                                };
                                                              `}"
                                                            />
                                                            <span
                                                              class="dropdown--menu--item button button--transparent"
                                                            >
                                                              $${application.web.locals.partials.user(
                                                                {
                                                                  request,
                                                                  response,
                                                                  enrollment,
                                                                  user: enrollment.user,
                                                                  tooltip:
                                                                    false,
                                                                  size: "xs",
                                                                  bold: false,
                                                                }
                                                              )}
                                                            </span>
                                                            <span
                                                              class="dropdown--menu--item button button--blue"
                                                            >
                                                              $${application.web.locals.partials.user(
                                                                {
                                                                  request,
                                                                  response,
                                                                  enrollment,
                                                                  user: enrollment.user,
                                                                  tooltip:
                                                                    false,
                                                                  size: "xs",
                                                                  bold: false,
                                                                }
                                                              )}
                                                            </span>
                                                          </label>
                                                        `
                                                      )}
                                                    </div>
                                                  `}
                                            </div>
                                          </div>
                                        `},  
                                      },
                                    });
                                  `}"
                                >
                                  $${application.web.locals.helpers.conversationParticipantses.map(
                                    (conversationParticipants) => html`
                                      <input
                                        type="radio"
                                        name="participants"
                                        value="${conversationParticipants}"
                                        $${response.locals.conversation
                                          .participants ===
                                        conversationParticipants
                                          ? html`checked`
                                          : html``}
                                        required
                                        tabindex="-1"
                                        class="visually-hidden input--visible-when-enabled-and-checked"
                                        javascript="${javascript`
                                          if (${
                                            conversationParticipants ===
                                            "selected-people"
                                          })
                                            this.onvalidate = () => {
                                              if (this.checked && [...this.closest("form").querySelectorAll('[name="selectedParticipantsReferences[]"]')].find(element => element.checked) === undefined)
                                                return "Please select at least one participant.";
                                            };
                                        `}"
                                      />
                                      <button
                                        type="button"
                                        class="button button--tight button--tight--inline button--transparent ${textColorsConversationParticipants[
                                          conversationParticipants
                                        ]}"
                                      >
                                        $${iconsConversationParticipants[
                                          conversationParticipants
                                        ].fill}
                                        $${labelsConversationParticipants[
                                          conversationParticipants
                                        ]}
                                        <i class="bi bi-chevron-down"></i>
                                      </button>
                                    `
                                  )}
                                </div>

                                $${enrollments.map(
                                  (enrollment) => html`
                                    <input
                                      key="selected-participants--input--${enrollment.reference}"
                                      type="checkbox"
                                      name="selectedParticipantsReferences[]"
                                      value="${enrollment.reference}"
                                      $${response.locals.conversation.selectedParticipants.find(
                                        (selectedParticipant) =>
                                          selectedParticipant.id ===
                                          enrollment.id
                                      ) !== undefined
                                        ? html`checked`
                                        : html``}
                                      $${(response.locals.conversation
                                        .participants === "staff" &&
                                        enrollment.courseRole !== "staff") ||
                                      response.locals.conversation
                                        .participants === "selected-people"
                                        ? html``
                                        : html`disabled`}
                                      tabindex="-1"
                                      class="visually-hidden input--visible-when-enabled-and-checked"
                                      data-enrollment-course-role="${enrollment.courseRole}"
                                    />
                                    <button
                                      key="selected-participants--button--${enrollment.reference}"
                                      type="button"
                                      class="button button--tight button--tight--inline button--transparent"
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            touch: false,
                                            content: "Remove Participant",
                                          },
                                        });

                                        this.onclick = () => {
                                          this.previousElementSibling.checked = false;

                                          this.closest("form").querySelector('[key="participants"]').dropdown.props.content.querySelector(${`[name="participants--dropdown--selected-participants[]"][value="${enrollment.reference}"]`}).checked = false;

                                          this.closest("form").querySelector('[key="submit"]').hidden = !leafac.isModified(this.closest("form"));
                                        };
                                      `}"
                                    >
                                      $${application.web.locals.partials.user({
                                        request,
                                        response,
                                        enrollment,
                                        user: enrollment.user,
                                        tooltip: false,
                                        size: "xs",
                                        bold: false,
                                      })}
                                    </button>
                                  `
                                )}
                              </div>

                              <div
                                key="submit"
                                hidden
                                css="${css`
                                  display: flex;
                                `}"
                              >
                                <button class="button button--blue">
                                  <i class="bi bi-pencil-fill"></i>
                                  Update Participants
                                </button>
                              </div>
                            </form>
                          `;
                        })()
                      : html`
                          <div
                            css="${css`
                              font-size: var(--font-size--xs);
                              line-height: var(--line-height--xs);
                              max-height: var(--space--24);
                              padding: var(--space--1);
                              margin: var(--space---1);
                              overflow: auto;
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--8);
                              row-gap: var(--space--1);

                              & > * {
                                display: flex;
                                gap: var(--space--1);
                              }
                            `}"
                          >
                            <div
                              class="${textColorsConversationParticipants[
                                response.locals.conversation.participants
                              ]}"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Participants",
                                  },
                                });
                              `}"
                            >
                              $${iconsConversationParticipants[
                                response.locals.conversation.participants
                              ].fill}
                              $${labelsConversationParticipants[
                                response.locals.conversation.participants
                              ]}
                            </div>

                            $${["staff", "selected-people"].includes(
                              response.locals.conversation.participants
                            )
                              ? html`
                                  $${response.locals.conversation.selectedParticipants.map(
                                    (selectedParticipant) => html`
                                      <div>
                                        $${application.web.locals.partials.user(
                                          {
                                            request,
                                            response,
                                            enrollment: selectedParticipant,
                                            user: selectedParticipant.user,
                                            size: "xs",
                                            bold: false,
                                          }
                                        )}
                                      </div>
                                    `
                                  )}
                                `
                              : html``}
                          </div>
                        `}
                    $${response.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            javascript="${javascript`
                              this.onclick = () => {
                                this.closest('[key="conversation--header"]').querySelector('[key="conversation--header--full"]').hidden = true;
                                this.closest('[key="conversation--header"]').querySelector('[key="conversation--header--compact"]').hidden = false;
                              };
                            `}"
                          >
                            <i class="bi bi-chevron-bar-contract"></i>
                          </button>
                        `
                      : html``}
                  </div>
                </div>
              </div>

              $${(() => {
                const firstUnreadMessage = messages.find(
                  (message) => message.reading === null
                );

                return html`
                  <div
                    css="${response.locals.conversation.type === "chat"
                      ? css`
                          flex: 1;
                          padding-right: var(--space--4);
                          padding-left: var(--space--4);
                          @media (min-width: 900px) {
                            padding-left: var(--space--8);
                          }
                          overflow: auto;
                          display: flex;
                          @media (max-width: 899px) {
                            justify-content: center;
                          }
                        `
                      : css``}"
                    javascript="${javascript`
                      const scroll = () => {
                        if (
                          [undefined, "GET", "HEAD", "OPTIONS", "TRACE"].includes(event?.detail?.request?.method) &&
                          !event?.detail?.liveUpdate
                        ) {
                          if (${
                            typeof request.query.messages?.messageReference ===
                              "string" &&
                            request.query.messages.messageReference.trim() !==
                              ""
                          }) {
                            const element = this.querySelector(${`[key="message/${request.query.messages?.messageReference}"]`});
                            if (element === null) return;
                            element.scrollIntoView();
                            const messageHighlight = element.querySelector('[key="message--highlight"]');
                            messageHighlight.style.animation = "message--highlight 2s var(--transition-timing-function--in-out)";
                            messageHighlight.onanimationend = () => {
                              messageHighlight.style.animation = "";
                            };
                          } else if (${
                            firstUnreadMessage !== undefined &&
                            firstUnreadMessage !== messages[0]
                          }) {
                            this.querySelector(${`[key="message/${firstUnreadMessage?.reference}"]`})?.scrollIntoView();
                          } else if (${
                            response.locals.conversation.type === "chat" &&
                            messages.length > 0 &&
                            afterMessage === undefined
                          }) {
                            this.scroll(0, this.scrollHeight);
                          }
                        }
                        else if (${
                          response.locals.conversation.type === "chat"
                        } && this.shouldScrollConversationToBottom) {
                          this.scroll(0, this.scrollHeight);
                        }

                        if (${response.locals.conversation.type === "chat"}) {
                          this.onscroll = () => {
                            this.shouldScrollConversationToBottom = this.scrollTop === this.scrollHeight - this.offsetHeight;
                          };
                          this.onscroll();
                        }
                      };
                      window.addEventListener("livenavigateself", scroll);
                      window.addEventListener("livenavigate", () => {
                        window.removeEventListener("livenavigateself", scroll);
                      }, { once: true });
                      window.setTimeout(scroll);
                    `}"
                  >
                    <div
                      css="${response.locals.conversation.type === "chat"
                        ? css`
                            flex: 1;
                            min-width: var(--width--0);
                            max-width: var(--width--prose);
                          `
                        : css``}"
                    >
                      $${messages.length === 0
                        ? html`
                            <div
                              css="${css`
                                padding: var(--space--4) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                                align-items: center;
                              `}"
                            >
                              <div class="decorative-icon">
                                <i class="bi bi-chat-text"></i>
                              </div>
                              <p class="secondary">
                                ${afterMessage !== undefined ||
                                beforeMessage !== undefined
                                  ? "No more messages."
                                  : response.locals.conversation.type === "chat"
                                  ? "Start the chat by sending the first message!"
                                  : "All messages in this conversation have been removed."}
                              </p>
                            </div>
                          `
                        : html`
                            <div
                              key="messages"
                              css="${response.locals.conversation.type ===
                              "chat"
                                ? css`
                                    padding: var(--space--4) var(--space--0);
                                  `
                                : css``}"
                            >
                              $${afterMessage !== undefined ||
                              (moreMessagesExist && messagesReverse)
                                ? html`
                                    <div
                                      css="${css`
                                        display: flex;
                                        justify-content: center;
                                      `}"
                                    >
                                      <a
                                        href="https://${application
                                          .configuration
                                          .hostname}/courses/${response.locals
                                          .course
                                          .reference}/conversations/${response
                                          .locals.conversation
                                          .reference}${qs.stringify(
                                          {
                                            conversations:
                                              request.query.conversations,
                                            messages: {
                                              ...request.query.messages,
                                              messagesPage: {
                                                beforeMessageReference:
                                                  messages[0].reference,
                                              },
                                            },
                                          },
                                          { addQueryPrefix: true }
                                        )}"
                                        class="button button--transparent"
                                      >
                                        <i class="bi bi-arrow-up"></i>
                                        Load Previous Messages
                                      </a>
                                    </div>
                                  `
                                : html``}
                              $${messages.map(
                                (message) =>
                                  html`
                                    <div
                                      key="message/${message.reference}"
                                      css="${response.locals.conversation
                                        .type === "chat"
                                        ? css``
                                        : css`
                                            border-bottom: var(
                                                --border-width--4
                                              )
                                              solid var(--color--zinc--200);
                                            @media (prefers-color-scheme: dark) {
                                              border-color: var(
                                                --color--zinc--700
                                              );
                                            }
                                          `}"
                                      data-content-source="${message.contentSource}"
                                    >
                                      $${message === firstUnreadMessage &&
                                      message !== messages[0]
                                        ? html`
                                            <button
                                              key="message--new-separator"
                                              class="button button--transparent"
                                              css="${css`
                                                width: calc(
                                                  var(--space--2) + 100% +
                                                    var(--space--2)
                                                );
                                                padding: var(--space--1-5)
                                                  var(--space--2);
                                                margin: var(--space--0)
                                                  var(--space---2);
                                                display: flex;
                                                gap: var(--space--4);
                                                align-items: center;
                                              `}"
                                              javascript="${javascript`
                                                if (this !== document.querySelector('[key="message--new-separator"]')) {
                                                  this.remove();
                                                  return;
                                                }

                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  tippyProps: {
                                                    touch: false,
                                                    content: "Close",
                                                  },
                                                });
                                                          
                                                this.onclick = () => {
                                                  this.remove();
                                                };

                                                this.onbeforeremove = () => false;
                                              `}"
                                            >
                                              <hr
                                                class="separator"
                                                css="${css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `}"
                                              />
                                              <span class="heading text--rose">
                                                <i class="bi bi-fire"></i>
                                                ${String(
                                                  response.locals.conversation
                                                    .messagesCount -
                                                    response.locals.conversation
                                                      .readingsCount
                                                )}
                                                New
                                              </span>
                                              <hr
                                                class="separator"
                                                css="${css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `}"
                                              />
                                            </button>
                                          `
                                        : html``}
                                      $${response.locals.conversation.type ===
                                      "chat"
                                        ? html`
                                            <div
                                              hidden
                                              key="message--date-separator"
                                              css="${css`
                                                margin: var(--space--2)
                                                  var(--space--0);
                                                display: flex;
                                                gap: var(--space--4);
                                                align-items: center;
                                              `}"
                                            >
                                              <hr
                                                class="separator"
                                                css="${css`
                                                  flex: 1;
                                                `}"
                                              />
                                              <span class="heading secondary">
                                                <i
                                                  class="bi bi-calendar-week-fill"
                                                ></i>
                                                <time
                                                  datetime="${new Date(
                                                    message.createdAt
                                                  ).toISOString()}"
                                                  javascript="${javascript`
                                                    const element = this;
                                                    leafac.relativizeDateElement(element);

                                                    window.clearTimeout(element.updateTimeout);
                                                    (function update() {
                                                      if (!leafac.isConnected(element)) return;
                                                      const dateSeparators = [...document.querySelectorAll('[key="message--date-separator"]')];
                                                      const thisDateSeparator = element.closest('[key="message--date-separator"]');
                                                      const thisDateSeparatorIndex = dateSeparators.indexOf(thisDateSeparator);
                                                      const previousDateSeparator = thisDateSeparatorIndex <= 0 ? undefined : dateSeparators[thisDateSeparatorIndex - 1];
                                                      thisDateSeparator.hidden = previousDateSeparator !== undefined && previousDateSeparator.textContent === thisDateSeparator.textContent;
                                                      element.updateTimeout = window.setTimeout(update, 60 * 1000 + Math.random() * 10 * 1000);
                                                    })();
                                                  `}"
                                                ></time>
                                              </span>
                                              <hr
                                                class="separator"
                                                css="${css`
                                                  flex: 1;
                                                `}"
                                              />
                                            </div>
                                          `
                                        : html``}

                                      <div
                                        key="message--highlight"
                                        css="${css`
                                          padding: var(--space--2);
                                          border-radius: var(
                                            --border-radius--lg
                                          );
                                          margin: var(--space--0)
                                            var(--space---2);
                                          display: flex;
                                          gap: var(--space--4);
                                          --message--highlight--background-color: var(
                                            --color--amber--200
                                          );
                                          @media (prefers-color-scheme: dark) {
                                            --message--highlight--background-color: var(
                                              --color--amber--900
                                            );
                                          }
                                          @keyframes message--highlight {
                                            from {
                                              background-color: var(
                                                --message--highlight--background-color
                                              );
                                            }
                                            to {
                                              background-color: transparent;
                                            }
                                          }
                                        `} ${response.locals.conversation
                                          .type === "chat"
                                          ? css`
                                              transition-property: var(
                                                --transition-property--colors
                                              );
                                              transition-duration: var(
                                                --transition-duration--150
                                              );
                                              transition-timing-function: var(
                                                --transition-timing-function--in-out
                                              );
                                              &:hover,
                                              &:focus-within {
                                                background-color: var(
                                                  --color--zinc--100
                                                );
                                                @media (prefers-color-scheme: dark) {
                                                  background-color: var(
                                                    --color--zinc--800
                                                  );
                                                }
                                              }
                                            `
                                          : css`
                                              padding-bottom: var(--space--4);
                                            `}"
                                      >
                                        $${message.type === "answer" &&
                                        message.reference !== "1" &&
                                        response.locals.conversation.type ===
                                          "question"
                                          ? html`
                                              <div
                                                class="heading"
                                                css="${css`
                                                  color: var(
                                                    --color--emerald--700
                                                  );
                                                  background-color: var(
                                                    --color--emerald--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    color: var(
                                                      --color--emerald--200
                                                    );
                                                    background-color: var(
                                                      --color--emerald--950
                                                    );
                                                  }
                                                  padding: var(--space--2)
                                                    var(--space--0);
                                                  border-radius: var(
                                                    --border-radius--base
                                                  );
                                                  writing-mode: vertical-lr;
                                                  transform: rotate(180deg);
                                                  justify-content: flex-end;
                                                  .bi {
                                                    transform: rotate(90deg);
                                                  }
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-patch-check-fill"
                                                ></i>
                                                Answer
                                              </div>
                                            `
                                          : message.type ===
                                              "followUpQuestion" &&
                                            message.reference !== "1" &&
                                            response.locals.conversation
                                              .type === "question"
                                          ? html`
                                              <div
                                                class="heading"
                                                css="${css`
                                                  color: var(
                                                    --color--rose--700
                                                  );
                                                  background-color: var(
                                                    --color--rose--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    color: var(
                                                      --color--rose--200
                                                    );
                                                    background-color: var(
                                                      --color--rose--950
                                                    );
                                                  }
                                                  padding: var(--space--2)
                                                    var(--space--0);
                                                  border-radius: var(
                                                    --border-radius--base
                                                  );
                                                  writing-mode: vertical-lr;
                                                  transform: rotate(180deg);
                                                  justify-content: flex-end;
                                                  .bi {
                                                    transform: rotate(90deg);
                                                  }
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-patch-question-fill"
                                                ></i>
                                                Follow-Up Question
                                              </div>
                                            `
                                          : message.type === "staffWhisper" &&
                                            response.locals.conversation
                                              .type !== "chat"
                                          ? html`
                                              <div
                                                class="heading"
                                                css="${css`
                                                  color: var(--color--sky--700);
                                                  background-color: var(
                                                    --color--sky--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    color: var(
                                                      --color--sky--200
                                                    );
                                                    background-color: var(
                                                      --color--sky--950
                                                    );
                                                  }
                                                  padding: var(--space--2)
                                                    var(--space--0);
                                                  border-radius: var(
                                                    --border-radius--base
                                                  );
                                                  writing-mode: vertical-lr;
                                                  transform: rotate(180deg);
                                                  justify-content: flex-end;
                                                  .bi {
                                                    transform: rotate(90deg);
                                                  }
                                                `}"
                                                javascript="${javascript`
                                                  leafac.setTippy({
                                                    event,
                                                    element: this,
                                                    tippyProps: {
                                                      touch: false,
                                                      content: "Staff whispers are messages visible to staff only.",
                                                    },
                                                  });
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-mortarboard-fill"
                                                ></i>
                                                Staff Whisper
                                              </div>
                                            `
                                          : html``}

                                        <div
                                          css="${css`
                                            flex: 1;
                                            display: flex;
                                            flex-direction: column;
                                          `} ${response.locals.conversation
                                            .type === "chat"
                                            ? css`
                                                gap: var(--space--1);
                                              `
                                            : css`
                                                gap: var(--space--2);
                                              `}"
                                        >
                                          $${(() => {
                                            const actions = html`
                                              <div key="message--actions">
                                                <button
                                                  class="button button--tight button--tight--inline button--transparent secondary"
                                                  css="${css`
                                                    font-size: var(
                                                      --font-size--xs
                                                    );
                                                    line-height: var(
                                                      --line-height--xs
                                                    );
                                                  `} ${response.locals
                                                    .conversation.type ===
                                                  "chat"
                                                    ? css`
                                                        transition-property: var(
                                                          --transition-property--opacity
                                                        );
                                                        transition-duration: var(
                                                          --transition-duration--150
                                                        );
                                                        transition-timing-function: var(
                                                          --transition-timing-function--in-out
                                                        );
                                                        [key^="message/"]:not(
                                                            :hover,
                                                            :focus-within
                                                          )
                                                          & {
                                                          opacity: var(
                                                            --opacity--0
                                                          );
                                                        }
                                                      `
                                                    : css``}"
                                                  javascript="${javascript`
                                                    leafac.setTippy({
                                                      event,
                                                      element: this,
                                                      tippyProps: {
                                                        touch: false,
                                                        content: "Actions",
                                                      },
                                                    });

                                                    leafac.setTippy({
                                                      event,
                                                      element: this,
                                                      elementProperty: "dropdown",
                                                      tippyProps: {
                                                        trigger: "click",
                                                        interactive: true,
                                                        onHidden: () => { this.onmouseleave(); },
                                                        content: ${html`
                                                          <div
                                                            key="loading"
                                                            css="${css`
                                                              display: flex;
                                                              gap: var(
                                                                --space--2
                                                              );
                                                              align-items: center;
                                                            `}"
                                                          >
                                                            $${application.web.locals.partials.spinner(
                                                              {
                                                                request,
                                                                response,
                                                              }
                                                            )}
                                                            Loading…
                                                          </div>
                                                          <div
                                                            key="content"
                                                            hidden
                                                          ></div>
                                                        `},
                                                      },
                                                    });

                                                    window.clearTimeout(this.dropdownContentTimeout);
                                                    this.dropdownContentSkipLoading = false;

                                                    this.onmouseenter = this.onfocus = async () => {
                                                      window.clearTimeout(this.dropdownContentTimeout);
                                                      if (this.dropdownContentSkipLoading) return;
                                                      this.dropdownContentSkipLoading = true;
                                                      leafac.loadPartial(this.dropdown.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${
                                                        application
                                                          .configuration
                                                          .hostname
                                                      }/courses/${
                                                        response.locals.course
                                                          .reference
                                                      }/conversations/${
                                                        response.locals
                                                          .conversation
                                                          .reference
                                                      }/messages/${
                                                        message.reference
                                                      }/actions${qs.stringify(
                                                        {
                                                          conversations:
                                                            request.query
                                                              .conversations,
                                                          messages:
                                                            request.query
                                                              .messages,
                                                        },
                                                        { addQueryPrefix: true }
                                                      )}`}, { cache: "no-store" })).text());
                                                      this.dropdown.props.content.querySelector('[key="loading"]').hidden = true;
                                                      this.dropdown.props.content.querySelector('[key="content"]').hidden = false;
                                                      this.dropdown.setProps({});
                                                    };

                                                    this.onmouseleave = this.onblur = () => {
                                                      window.clearTimeout(this.dropdownContentTimeout);
                                                      if (this.matches(":hover, :focus-within") || this.dropdown.state.isShown) return;
                                                      this.dropdownContentTimeout = window.setTimeout(() => {
                                                        this.dropdown.props.content.querySelector('[key="loading"]').hidden = false;
                                                        this.dropdown.props.content.querySelector('[key="content"]').hidden = true;
                                                        this.dropdownContentSkipLoading = false;
                                                      }, 60 * 1000);
                                                    };
                                                  `}"
                                                >
                                                  <i
                                                    class="bi bi-three-dots-vertical"
                                                  ></i>
                                                </button>
                                              </div>
                                            `;

                                            let header = html``;

                                            if (
                                              application.web.locals.helpers.mayEditMessage(
                                                {
                                                  request,
                                                  response,
                                                  message,
                                                }
                                              ) &&
                                              message.reference !== "1" &&
                                              response.locals.conversation
                                                .type === "question" &&
                                              message.type !== "staffWhisper"
                                            )
                                              header += html`
                                                <form
                                                  method="PATCH"
                                                  action="https://${application
                                                    .configuration
                                                    .hostname}/courses/${response
                                                    .locals.course
                                                    .reference}/conversations/${response
                                                    .locals.conversation
                                                    .reference}/messages/${message.reference}${qs.stringify(
                                                    {
                                                      conversations:
                                                        request.query
                                                          .conversations,
                                                      messages:
                                                        request.query.messages,
                                                    },
                                                    { addQueryPrefix: true }
                                                  )}"
                                                >
                                                  $${message.type !== "answer"
                                                    ? html`
                                                        <input
                                                          key="isAnswer--true"
                                                          type="hidden"
                                                          name="isAnswer"
                                                          value="true"
                                                        />
                                                        <button
                                                          class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                          javascript="${javascript`
                                                            leafac.setTippy({
                                                              event,
                                                              element: this,
                                                              tippyProps: {
                                                                touch: false,
                                                                content: "Set as Answer",
                                                              },
                                                            });
                                                          `}"
                                                        >
                                                          <i
                                                            class="bi bi-patch-check"
                                                          ></i>
                                                          Not an Answer
                                                        </button>
                                                      `
                                                    : html`
                                                        <input
                                                          key="isAnswer--false"
                                                          type="hidden"
                                                          name="isAnswer"
                                                          value="false"
                                                        />
                                                        <button
                                                          class="button button--tight button--tight--inline button--tight-gap button--transparent text--emerald"
                                                          javascript="${javascript`
                                                            leafac.setTippy({
                                                              event,
                                                              element: this,
                                                              tippyProps: {
                                                                touch: false,
                                                                content: "Set as Not an Answer",
                                                              },
                                                            });
                                                          `}"
                                                        >
                                                          <i
                                                            class="bi bi-patch-check-fill"
                                                          ></i>
                                                          Answer
                                                        </button>
                                                      `}
                                                </form>
                                              `;

                                            if (
                                              application.web.locals.helpers.mayEndorseMessage(
                                                {
                                                  request,
                                                  response,
                                                  message,
                                                }
                                              )
                                            ) {
                                              const isEndorsed =
                                                message.endorsements.some(
                                                  (endorsement) =>
                                                    endorsement.enrollment !==
                                                      "no-longer-enrolled" &&
                                                    endorsement.enrollment
                                                      .id ===
                                                      response.locals.enrollment
                                                        .id
                                                );

                                              header += html`
                                                <form
                                                  method="${isEndorsed
                                                    ? "DELETE"
                                                    : "POST"}"
                                                  action="https://${application
                                                    .configuration
                                                    .hostname}/courses/${response
                                                    .locals.course
                                                    .reference}/conversations/${response
                                                    .locals.conversation
                                                    .reference}/messages/${message.reference}/endorsements${qs.stringify(
                                                    {
                                                      conversations:
                                                        request.query
                                                          .conversations,
                                                      messages:
                                                        request.query.messages,
                                                    },
                                                    { addQueryPrefix: true }
                                                  )}"
                                                >
                                                  $${isEndorsed
                                                    ? html`
                                                        <button
                                                          class="button button--tight button--tight--inline button--tight-gap button--transparent text--blue"
                                                          javascript="${javascript`
                                                            leafac.setTippy({
                                                              event,
                                                              element: this,
                                                              tippyProps: {
                                                                touch: false,
                                                                content: ${`Remove Endorsement${
                                                                  message.endorsements.filter(
                                                                    (
                                                                      endorsement
                                                                    ) =>
                                                                      endorsement.enrollment !==
                                                                        "no-longer-enrolled" &&
                                                                      endorsement
                                                                        .enrollment
                                                                        .id !==
                                                                        response
                                                                          .locals
                                                                          .enrollment
                                                                          .id
                                                                  ).length > 0
                                                                    ? ` (Also endorsed by ${
                                                                        /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                          Intl as any
                                                                        ).ListFormat(
                                                                          "en"
                                                                        ).format(
                                                                          message.endorsements.flatMap(
                                                                            (
                                                                              endorsement
                                                                            ) =>
                                                                              endorsement.enrollment !==
                                                                                "no-longer-enrolled" &&
                                                                              endorsement
                                                                                .enrollment
                                                                                .id !==
                                                                                response
                                                                                  .locals
                                                                                  .enrollment
                                                                                  .id
                                                                                ? [
                                                                                    endorsement
                                                                                      .enrollment
                                                                                      .user
                                                                                      .name,
                                                                                  ]
                                                                                : []
                                                                          )
                                                                        )
                                                                      })`
                                                                    : ``
                                                                }`},  
                                                              },
                                                            });
                                                          `}"
                                                        >
                                                          <i
                                                            class="bi bi-award-fill"
                                                          ></i>
                                                          ${message.endorsements.length.toString()}
                                                          Staff
                                                          Endorsement${message
                                                            .endorsements
                                                            .length === 1
                                                            ? ""
                                                            : "s"}
                                                        </button>
                                                      `
                                                    : html`
                                                        <button
                                                          class="button button--tight button--tight--inline button--tight-gap button--transparent text--lime"
                                                          $${message.endorsements.filter(
                                                            (endorsement) =>
                                                              endorsement.enrollment !==
                                                              "no-longer-enrolled"
                                                          ).length === 0
                                                            ? html``
                                                            : html`
                                                                javascript="${javascript`
                                                                  leafac.setTippy({
                                                                    event,
                                                                    element: this,
                                                                    tippyProps: {
                                                                      touch: false,
                                                                      content: ${`Endorse (Already endorsed by ${
                                                                        /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                          Intl as any
                                                                        ).ListFormat(
                                                                          "en"
                                                                        ).format(
                                                                          message.endorsements.flatMap(
                                                                            (
                                                                              endorsement
                                                                            ) =>
                                                                              endorsement.enrollment ===
                                                                              "no-longer-enrolled"
                                                                                ? []
                                                                                : [
                                                                                    endorsement
                                                                                      .enrollment
                                                                                      .user
                                                                                      .name,
                                                                                  ]
                                                                          )
                                                                        )
                                                                      })`},  
                                                                    },
                                                                  });
                                                                `}"
                                                              `}
                                                        >
                                                          <i
                                                            class="bi bi-award"
                                                          ></i>
                                                          ${message.endorsements
                                                            .length === 0
                                                            ? `Endorse`
                                                            : `${
                                                                message
                                                                  .endorsements
                                                                  .length
                                                              }
                                                              Staff Endorsement${
                                                                message
                                                                  .endorsements
                                                                  .length === 1
                                                                  ? ""
                                                                  : "s"
                                                              }`}
                                                        </button>
                                                      `}
                                                </form>
                                              `;
                                            } else if (
                                              response.locals.conversation
                                                .type === "question" &&
                                              (message.authorEnrollment ===
                                                "no-longer-enrolled" ||
                                                message.authorEnrollment
                                                  .courseRole !== "staff") &&
                                              message.endorsements.length > 0
                                            )
                                              header += html`
                                                <div
                                                  class="text--lime"
                                                  javascript="${javascript`
                                                    if (${
                                                      message.endorsements.filter(
                                                        (endorsement) =>
                                                          endorsement.enrollment !==
                                                          "no-longer-enrolled"
                                                      ).length > 0
                                                    })
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          content: ${`Endorsed by ${
                                                            /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                              Intl as any
                                                            ).ListFormat(
                                                              "en"
                                                            ).format(
                                                              message.endorsements.flatMap(
                                                                (endorsement) =>
                                                                  endorsement.enrollment ===
                                                                  "no-longer-enrolled"
                                                                    ? []
                                                                    : [
                                                                        endorsement
                                                                          .enrollment
                                                                          .user
                                                                          .name,
                                                                      ]
                                                              )
                                                            )
                                                          }`},  
                                                        },
                                                      });
                                                  `}"
                                                >
                                                  <i class="bi bi-award"></i>
                                                  ${message.endorsements.length.toString()}
                                                  Staff
                                                  Endorsement${message
                                                    .endorsements.length === 1
                                                    ? ""
                                                    : "s"}
                                                </div>
                                              `;

                                            return html`
                                              $${header !== html``
                                                ? html`
                                                    <div
                                                      key="message--header"
                                                      css="${css`
                                                        font-size: var(
                                                          --font-size--xs
                                                        );
                                                        line-height: var(
                                                          --line-height--xs
                                                        );
                                                        display: flex;
                                                        gap: var(--space--4);
                                                      `}"
                                                    >
                                                      <div
                                                        css="${css`
                                                          flex: 1;
                                                          display: flex;
                                                          flex-wrap: wrap;
                                                          column-gap: var(
                                                            --space--8
                                                          );
                                                          row-gap: var(
                                                            --space--1
                                                          );
                                                          & > * {
                                                            display: flex;
                                                            gap: var(
                                                              --space--1
                                                            );
                                                          }
                                                        `}"
                                                      >
                                                        $${header}
                                                      </div>
                                                      $${actions}
                                                    </div>
                                                  `
                                                : html``}

                                              <div
                                                css="${css`
                                                  display: flex;
                                                  gap: var(--space--2);
                                                `}"
                                              >
                                                <div
                                                  class="secondary"
                                                  css="${css`
                                                    font-size: var(
                                                      --font-size--xs
                                                    );
                                                    line-height: var(
                                                      --line-height--xs
                                                    );
                                                    flex: 1;
                                                    display: flex;
                                                    flex-wrap: wrap;
                                                    align-items: baseline;
                                                    column-gap: var(--space--4);
                                                    row-gap: var(--space--2);
                                                  `}"
                                                >
                                                  <div
                                                    class="strong"
                                                    css="${css`
                                                      font-size: var(
                                                        --font-size--sm
                                                      );
                                                      line-height: var(
                                                        --line-height--sm
                                                      );
                                                    `}"
                                                  >
                                                    $${application.web.locals.partials.user(
                                                      {
                                                        request,
                                                        response,
                                                        enrollment:
                                                          message.authorEnrollment,
                                                        anonymous:
                                                          message.anonymousAt ===
                                                          null
                                                            ? false
                                                            : response.locals
                                                                .enrollment
                                                                .courseRole ===
                                                                "staff" ||
                                                              (message.authorEnrollment !==
                                                                "no-longer-enrolled" &&
                                                                message
                                                                  .authorEnrollment
                                                                  .id ===
                                                                  response
                                                                    .locals
                                                                    .enrollment
                                                                    .id)
                                                            ? "reveal"
                                                            : true,
                                                        name:
                                                          message.authorEnrollment ===
                                                          "no-longer-enrolled"
                                                            ? undefined
                                                            : application.web.locals.helpers.highlightSearchResult(
                                                                html`${message
                                                                  .authorEnrollment
                                                                  .user.name}`,
                                                                typeof request
                                                                  .query
                                                                  .conversations
                                                                  ?.search ===
                                                                  "string" &&
                                                                  request.query.conversations.search.trim() !==
                                                                    ""
                                                                  ? request
                                                                      .query
                                                                      .conversations
                                                                      .search
                                                                  : undefined
                                                              ),
                                                      }
                                                    )}
                                                  </div>

                                                  <time
                                                    datetime="${new Date(
                                                      message.createdAt
                                                    ).toISOString()}"
                                                    javascript="${javascript`
                                                      leafac.relativizeDateTimeElement(this, { capitalize: true });
                                                    `}"
                                                  ></time>

                                                  $${message.updatedAt !== null
                                                    ? html`
                                                        <div>
                                                          Updated
                                                          <time
                                                            datetime="${new Date(
                                                              message.updatedAt
                                                            ).toISOString()}"
                                                            javascript="${javascript`
                                                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                                            `}"
                                                          ></time>
                                                        </div>
                                                      `
                                                    : html``}
                                                </div>

                                                $${header === html``
                                                  ? actions
                                                  : html``}
                                              </div>
                                            `;
                                          })()}

                                          <div
                                            key="message--show"
                                            css="${css`
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--2);
                                            `}"
                                          >
                                            <div
                                              key="message--show--content-area"
                                              css="${css`
                                                position: relative;
                                              `}"
                                            >
                                              <div
                                                key="message--show--content-area--dropdown-menu-target"
                                                css="${css`
                                                  width: var(--space--0);
                                                  height: var(
                                                    --line-height--sm
                                                  );
                                                  position: absolute;
                                                `}"
                                              ></div>
                                              <div
                                                key="message--show--content-area--content"
                                                javascript="${javascript`
                                                  const dropdownMenuTarget = this.closest('[key="message--show--content-area"]').querySelector('[key="message--show--content-area--dropdown-menu-target"]');
                                                  leafac.setTippy({
                                                    event,
                                                    element: dropdownMenuTarget,
                                                    elementProperty: "dropdownMenu",
                                                    tippyProps: {
                                                      trigger: "manual",
                                                      interactive: true,
                                                      content: ${html`
                                                        <div
                                                          class="dropdown--menu"
                                                        >
                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            javascript="${javascript`
                                                              this.onclick = () => {
                                                                tippy.hideAll();
                                                                const selection = window.getSelection();
                                                                const anchorElement = leafac.ancestors(selection.anchorNode).reverse().find(element => typeof element?.getAttribute?.("data-position") === "string");
                                                                const focusElement = leafac.ancestors(selection.focusNode).reverse().find(element => typeof element?.getAttribute?.("data-position") === "string");
                                                                const contentElement = this.closest('[key="message--show--content-area"]').querySelector('[key="message--show--content-area--content"]');
                                                                if (
                                                                  selection.isCollapsed ||
                                                                  anchorElement === undefined ||
                                                                  focusElement === undefined ||
                                                                  !contentElement.contains(anchorElement) ||
                                                                  !contentElement.contains(focusElement)
                                                                ) return;
                                                                const anchorPosition = JSON.parse(anchorElement.getAttribute("data-position"));
                                                                const focusPosition = JSON.parse(focusElement.getAttribute("data-position"));
                                                                const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                                                                const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                                                                const content = anchorElement.closest("[data-content-source]").getAttribute("data-content-source");
                                                                const newMessage = document.querySelector('[key="new-message"]');
                                                                newMessage.querySelector('[key="content-editor--button--write"]')?.click();
                                                                const element = newMessage.querySelector('[key="content-editor--write--textarea"]');
                                                                textFieldEdit.wrapSelection(
                                                                  element,
                                                                  ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                    message.authorEnrollment ===
                                                                    "no-longer-enrolled"
                                                                      ? ``
                                                                      : `@${
                                                                          message.anonymousAt ===
                                                                          null
                                                                            ? `${
                                                                                message
                                                                                  .authorEnrollment
                                                                                  .reference
                                                                              }--${slugify(
                                                                                message
                                                                                  .authorEnrollment
                                                                                  .user
                                                                                  .name
                                                                              )}`
                                                                            : `anonymous`
                                                                        } · `
                                                                  } + "#" + ${
                                                              response.locals
                                                                .conversation
                                                                .reference
                                                            } + "/" + ${
                                                              message.reference
                                                            } + "\\n>\\n> " + content.slice(start, end).replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                                  ""
                                                                );
                                                                element.focus();
                                                              };
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-chat-quote"
                                                            ></i>
                                                            Quote
                                                          </button>
                                                        </div>
                                                      `},  
                                                    },
                                                  });
                                                  
                                                  this.onmouseup = (event) => {
                                                    window.setTimeout(() => {
                                                      const selection = window.getSelection();
                                                      const anchorElement = leafac.ancestors(selection.anchorNode).reverse().find(element => typeof element?.getAttribute?.("data-position") === "string");
                                                      const focusElement = leafac.ancestors(selection.focusNode).reverse().find(element => typeof element?.getAttribute?.("data-position") === "string");
                                                      if (
                                                        selection.isCollapsed ||
                                                        anchorElement === undefined ||
                                                        focusElement === undefined ||
                                                        !this.contains(anchorElement) ||
                                                        !this.contains(focusElement) ||
                                                        anchorElement.closest('[key^="poll/"]') !== null ||
                                                        focusElement.closest('[key^="poll/"]') !== null
                                                      ) return;
                                                      dropdownMenuTarget.style.top = String(event.layerY) + "px";
                                                      dropdownMenuTarget.style.left = String(event.layerX) + "px";
                                                      dropdownMenuTarget.dropdownMenu.show();
                                                    });
                                                  };
                                                `}"
                                              >
                                                $${application.web.locals.partials.content(
                                                  {
                                                    request,
                                                    response,
                                                    id: `message--${message.reference}`,
                                                    contentPreprocessed:
                                                      message.contentPreprocessed,
                                                    search:
                                                      typeof request.query
                                                        .conversations
                                                        ?.search === "string" &&
                                                      request.query.conversations.search.trim() !==
                                                        ""
                                                        ? request.query
                                                            .conversations
                                                            .search
                                                        : undefined,
                                                  }
                                                ).contentProcessed}
                                              </div>
                                            </div>

                                            $${(() => {
                                              let messageShowFooter = html``;

                                              const isLiked =
                                                message.likes.some(
                                                  (like) =>
                                                    like.enrollment !==
                                                      "no-longer-enrolled" &&
                                                    like.enrollment.id ===
                                                      response.locals.enrollment
                                                        .id
                                                );
                                              const likesCount =
                                                message.likes.length;
                                              if (
                                                response.locals.conversation
                                                  .type !== "chat" ||
                                                likesCount > 0
                                              )
                                                messageShowFooter += html`
                                                  <div
                                                    css="${css`
                                                      display: flex;
                                                      gap: var(--space--1);
                                                    `}"
                                                  >
                                                    <form
                                                      method="${isLiked
                                                        ? "DELETE"
                                                        : "POST"}"
                                                      action="https://${application
                                                        .configuration
                                                        .hostname}/courses/${response
                                                        .locals.course
                                                        .reference}/conversations/${response
                                                        .locals.conversation
                                                        .reference}/messages/${message.reference}/likes${qs.stringify(
                                                        {
                                                          conversations:
                                                            request.query
                                                              .conversations,
                                                          messages:
                                                            request.query
                                                              .messages,
                                                        },
                                                        { addQueryPrefix: true }
                                                      )}"
                                                    >
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                                          ? "text--blue"
                                                          : ""}"
                                                        $${likesCount === 0
                                                          ? html``
                                                          : html`
                                                              javascript="${javascript`
                                                                leafac.setTippy({
                                                                  event,
                                                                  element: this,
                                                                  tippyProps: {
                                                                    touch: false,
                                                                    content: ${
                                                                      isLiked
                                                                        ? "Remove Like"
                                                                        : "Like"
                                                                    },
                                                                  },
                                                                });
                                                              `}"
                                                            `}
                                                      >
                                                        $${isLiked
                                                          ? html`
                                                              <i
                                                                class="bi bi-hand-thumbs-up-fill"
                                                              ></i>
                                                            `
                                                          : html`<i
                                                              class="bi bi-hand-thumbs-up"
                                                            ></i>`}
                                                        $${likesCount === 0
                                                          ? html`Like`
                                                          : html``}
                                                      </button>
                                                    </form>

                                                    $${likesCount === 0
                                                      ? html``
                                                      : html`
                                                          <button
                                                            class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                                              ? "text--blue"
                                                              : ""}"
                                                            javascript="${javascript`
                                                              leafac.setTippy({
                                                                event,
                                                                element: this,
                                                                tippyProps: {
                                                                  touch: false,
                                                                  content: "See people who liked",
                                                                },
                                                              });
                                                              
                                                              leafac.setTippy({
                                                                event,
                                                                element: this,
                                                                elementProperty: "dropdown",
                                                                tippyProps: {
                                                                  trigger: "click",
                                                                  interactive: true,
                                                                  onHidden: () => { this.onmouseleave(); },
                                                                  content: ${html`
                                                                    <div
                                                                      key="loading"
                                                                      css="${css`
                                                                        display: flex;
                                                                        gap: var(
                                                                          --space--2
                                                                        );
                                                                        align-items: center;
                                                                      `}"
                                                                    >
                                                                      $${application.web.locals.partials.spinner(
                                                                        {
                                                                          request,
                                                                          response,
                                                                        }
                                                                      )}
                                                                      Loading…
                                                                    </div>
                                                                    <div
                                                                      key="content"
                                                                      hidden
                                                                    ></div>
                                                                  `},
                                                                },
                                                              });

                                                              window.clearTimeout(this.dropdownContentTimeout);
                                                              this.dropdownContentSkipLoading = false;
                                                              
                                                              this.onmouseenter = this.onfocus = async () => {
                                                                window.clearTimeout(this.dropdownContentTimeout);
                                                                if (this.dropdownContentSkipLoading) return;
                                                                this.dropdownContentSkipLoading = true;
                                                                leafac.loadPartial(this.dropdown.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/${message.reference}/likes`}, { cache: "no-store" })).text());
                                                                this.dropdown.props.content.querySelector('[key="loading"]').hidden = true;
                                                                this.dropdown.props.content.querySelector('[key="content"]').hidden = false;
                                                                this.dropdown.setProps({});
                                                              };
                                                              
                                                              this.onmouseleave = this.onblur = () => {
                                                                window.clearTimeout(this.dropdownContentTimeout);
                                                                if (this.matches(":hover, :focus-within") || this.dropdown.state.isShown) return;
                                                                this.dropdownContentTimeout = window.setTimeout(() => {
                                                                  this.dropdown.props.content.querySelector('[key="loading"]').hidden = false;
                                                                  this.dropdown.props.content.querySelector('[key="content"]').hidden = true;
                                                                  this.dropdownContentSkipLoading = false;
                                                                }, 60 * 1000);
                                                              };
                                                            `}"
                                                          >
                                                            ${likesCount.toString()}
                                                            Like${likesCount ===
                                                            1
                                                              ? ""
                                                              : "s"}
                                                          </button>
                                                        `}
                                                  </div>
                                                `;

                                              if (
                                                response.locals.enrollment
                                                  .courseRole === "staff" &&
                                                response.locals.conversation
                                                  .type !== "chat"
                                              )
                                                messageShowFooter += html`
                                                  <button
                                                    class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          trigger: "click",
                                                          interactive: true,
                                                          onHidden: () => { this.onmouseleave(); },
                                                          content: ${html`
                                                            <div
                                                              key="loading"
                                                              css="${css`
                                                                display: flex;
                                                                gap: var(
                                                                  --space--2
                                                                );
                                                                align-items: center;
                                                              `}"
                                                            >
                                                              $${application.web.locals.partials.spinner(
                                                                {
                                                                  request,
                                                                  response,
                                                                }
                                                              )}
                                                              Loading…
                                                            </div>
                                                            <div
                                                              key="content"
                                                              hidden
                                                            ></div>
                                                          `},
                                                        },
                                                      });

                                                      window.clearTimeout(this.tooltipContentTimeout);
                                                      this.tooltipContentSkipLoading = false;
                                                      
                                                      this.onmouseenter = this.onfocus = async () => {
                                                        window.clearTimeout(this.tooltipContentTimeout);
                                                        if (this.tooltipContentSkipLoading) return;
                                                        this.tooltipContentSkipLoading = true;
                                                        leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/${message.reference}/views`}, { cache: "no-store" })).text());
                                                        this.tooltip.props.content.querySelector('[key="loading"]').hidden = true;
                                                        this.tooltip.props.content.querySelector('[key="content"]').hidden = false;
                                                        this.tooltip.setProps({});
                                                      };
                                                      
                                                      this.onmouseleave = this.onblur = () => {
                                                        window.clearTimeout(this.tooltipContentTimeout);
                                                        if (this.matches(":hover, :focus-within") || this.tooltip.state.isShown) return;
                                                        this.tooltipContentTimeout = window.setTimeout(() => {
                                                          this.tooltip.props.content.querySelector('[key="loading"]').hidden = false;
                                                          this.tooltip.props.content.querySelector('[key="content"]').hidden = true;
                                                          this.tooltipContentSkipLoading = false;
                                                        }, 60 * 1000);
                                                      };
                                                    `}"
                                                  >
                                                    <i class="bi bi-eye"></i>
                                                    ${message.readings.length.toString()}
                                                    Views
                                                  </button>
                                                `;

                                              return messageShowFooter !==
                                                html``
                                                ? html`
                                                    <div
                                                      key="message--show--footer"
                                                      css="${css`
                                                        font-size: var(
                                                          --font-size--xs
                                                        );
                                                        line-height: var(
                                                          --line-height--xs
                                                        );
                                                        display: flex;
                                                        flex-wrap: wrap;
                                                        column-gap: var(
                                                          --space--8
                                                        );
                                                        row-gap: var(
                                                          --space--1
                                                        );
                                                      `}"
                                                    >
                                                      $${messageShowFooter}
                                                    </div>
                                                  `
                                                : html``;
                                            })()}
                                          </div>

                                          <div key="message--edit" hidden>
                                            <div
                                              key="loading"
                                              class="strong"
                                              css="${css`
                                                display: flex;
                                                gap: var(--space--2);
                                                justify-content: center;
                                              `}"
                                            >
                                              $${application.web.locals.partials.spinner(
                                                {
                                                  request,
                                                  response,
                                                }
                                              )}
                                              Loading…
                                            </div>
                                            <div
                                              key="form"
                                              hidden
                                              javascript="${javascript`
                                                if (event?.detail?.liveUpdate && !this.closest('[key="message--edit"]').hidden) return;
                                                this.partialParentElement = false;
                                                this.skipLoading = false;
                                              `}"
                                            ></div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  `
                              )}
                              $${beforeMessage !== undefined ||
                              (moreMessagesExist && !messagesReverse)
                                ? html`
                                    <div
                                      css="${css`
                                        display: flex;
                                        justify-content: center;
                                      `}"
                                    >
                                      <a
                                        href="https://${application
                                          .configuration
                                          .hostname}/courses/${response.locals
                                          .course
                                          .reference}/conversations/${response
                                          .locals.conversation
                                          .reference}${qs.stringify(
                                          {
                                            conversations:
                                              request.query.conversations,
                                            messages: {
                                              ...request.query.messages,
                                              messagesPage: {
                                                afterMessageReference:
                                                  messages.at(-1)!.reference,
                                              },
                                            },
                                          },
                                          { addQueryPrefix: true }
                                        )}"
                                        class="button button--transparent"
                                      >
                                        <i class="bi bi-arrow-down"></i>
                                        Load Next Messages
                                      </a>
                                    </div>
                                  `
                                : html``}
                              <div
                                key="message--new-message--placeholder"
                                hidden
                                css="${css`
                                  opacity: var(--opacity--50);
                                `} ${response.locals.conversation.type ===
                                "chat"
                                  ? css``
                                  : css`
                                      border-bottom: var(--border-width--4)
                                        solid var(--color--zinc--200);
                                      @media (prefers-color-scheme: dark) {
                                        border-color: var(--color--zinc--700);
                                      }
                                    `}"
                              >
                                <div
                                  css="${css`
                                    padding: var(--space--2);
                                    border-radius: var(--border-radius--lg);
                                    margin: var(--space--0) var(--space---2);
                                    display: flex;
                                    flex-direction: column;
                                  `} ${response.locals.conversation.type ===
                                  "chat"
                                    ? css`
                                        gap: var(--space--1);
                                        transition-property: var(
                                          --transition-property--colors
                                        );
                                        transition-duration: var(
                                          --transition-duration--150
                                        );
                                        transition-timing-function: var(
                                          --transition-timing-function--in-out
                                        );
                                        &:hover,
                                        &:focus-within {
                                          background-color: var(
                                            --color--zinc--100
                                          );
                                          @media (prefers-color-scheme: dark) {
                                            background-color: var(
                                              --color--zinc--800
                                            );
                                          }
                                        }
                                      `
                                    : css`
                                        padding-bottom: var(--space--4);
                                        gap: var(--space--2);
                                      `}"
                                >
                                  <div
                                    css="${css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <div
                                      class="secondary"
                                      css="${css`
                                        font-size: var(--font-size--xs);
                                        line-height: var(--line-height--xs);
                                        flex: 1;
                                        display: flex;
                                        flex-wrap: wrap;
                                        align-items: baseline;
                                        column-gap: var(--space--4);
                                        row-gap: var(--space--2);
                                      `}"
                                    >
                                      <div
                                        key="message--new-message--placeholder--anonymous--false"
                                        class="strong"
                                        css="${css`
                                          font-size: var(--font-size--sm);
                                          line-height: var(--line-height--sm);
                                        `}"
                                      >
                                        $${application.web.locals.partials.user(
                                          {
                                            request,
                                            response,
                                            enrollment: {
                                              ...response.locals.enrollment,
                                              user: response.locals.user,
                                            },
                                          }
                                        )}
                                      </div>
                                      $${response.locals.enrollment
                                        .courseRole === "staff"
                                        ? html``
                                        : html`
                                            <div
                                              key="message--new-message--placeholder--anonymous--true"
                                              class="strong"
                                              css="${css`
                                                font-size: var(--font-size--sm);
                                                line-height: var(
                                                  --line-height--sm
                                                );
                                              `}"
                                            >
                                              $${application.web.locals.partials.user(
                                                {
                                                  request,
                                                  response,
                                                  enrollment: {
                                                    ...response.locals
                                                      .enrollment,
                                                    user: response.locals.user,
                                                  },
                                                  anonymous: "reveal",
                                                }
                                              )}
                                            </div>
                                          `}
                                      <span>Sending…</span>
                                      $${application.web.locals.partials.spinner(
                                        {
                                          request,
                                          response,
                                          size: 10,
                                        }
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    key="message--new-message--placeholder--content"
                                    css="${css`
                                      white-space: pre-line;
                                    `}"
                                  ></div>
                                </div>
                              </div>
                            </div>
                          `}
                    </div>
                  </div>
                `;
              })()}

              <form
                method="POST"
                action="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/conversations/${response.locals.conversation
                  .reference}/messages${qs.stringify(
                  {
                    conversations: request.query.conversations,
                    messages: request.query.messages,
                  },
                  { addQueryPrefix: true }
                )}"
                novalidate
                css="${response.locals.conversation.type === "chat"
                  ? css`
                      padding-right: var(--space--4);
                      padding-bottom: var(--space--4);
                      padding-left: var(--space--4);
                      @media (min-width: 900px) {
                        padding-left: var(--space--8);
                      }
                      display: flex;
                      @media (max-width: 899px) {
                        justify-content: center;
                      }
                    `
                  : css`
                      padding-top: var(--space--4);
                    `}"
                javascript="${javascript`
                  this.isModified = false;

                  this.oninput = (() => {
                    let isUpdating = false;
                    let shouldUpdateAgain = false;
                    return async () => {
                      if (isUpdating) {
                        shouldUpdateAgain = true;
                        return;
                      }
                      isUpdating = true;
                      shouldUpdateAgain = false;
                      await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/draft`}, {
                        method: "POST",
                        headers: { "CSRF-Protection": "true", },
                        cache: "no-store",
                        body: new URLSearchParams(new FormData(this)),
                      });
                      isUpdating = false;
                      if (shouldUpdateAgain) this.oninput();
                    };
                  })();

                  this.onsubmit = () => {
                    window.setTimeout(() => {
                      const placeholder = document.querySelector('[key="message--new-message--placeholder"]');
                      const content = this.querySelector('[name="content"]');
                      if (${response.locals.enrollment.courseRole !== "staff"})
                        placeholder.querySelector('[key="message--new-message--placeholder--anonymous--' + (!this.querySelector('[name="isAnonymous"]').checked).toString() + '"]').hidden = true;
                      placeholder.querySelector('[key="message--new-message--placeholder--content"]').textContent = content.value;
                      placeholder.hidden = false;
                      for (const element of leafac.ancestors(placeholder))
                        element.scroll(0, element.scrollHeight);
                      textFieldEdit.set(content, "");
                    });
                  };
                `}"
              >
                <div
                  css="${css`
                    display: flex;
                    flex-direction: column;
                  `} ${response.locals.conversation.type === "chat"
                    ? css`
                        gap: var(--space--2);
                        flex: 1;
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                      `
                    : css`
                        gap: var(--space--4);
                      `}"
                >
                  <div
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    <div
                      key="new-message"
                      css="${css`
                        display: grid;
                        & > * {
                          grid-area: 1 / 1;
                        }
                      `}"
                    >
                      $${application.web.locals.partials.contentEditor({
                        request,
                        response,
                        contentSource:
                          response.locals.messageDraft?.contentSource,
                        compact: response.locals.conversation.type === "chat",
                      })}
                      $${response.locals.conversation.type === "chat"
                        ? html`
                            <button
                              class="button button--blue"
                              css="${css`
                                position: relative;
                                place-self: end;
                                width: var(--font-size--2xl);
                                height: var(--font-size--2xl);
                                padding: var(--space--0);
                                border-radius: var(--border-radius--circle);
                                margin: var(--space--1);
                                align-items: center;
                              `}"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: ${html`
                                      Send Message
                                      <span class="keyboard-shortcut">
                                        <span
                                          javascript="${javascript`
                                            this.hidden = leafac.isAppleDevice;
                                          `}"
                                          >Ctrl+Enter</span
                                        ><span
                                          class="keyboard-shortcut--cluster"
                                          javascript="${javascript`
                                            this.hidden = !leafac.isAppleDevice;
                                          `}"
                                          ><i class="bi bi-command"></i
                                          ><i
                                            class="bi bi-arrow-return-left"
                                          ></i
                                        ></span>
                                      </span>
                                    `},
                                  },
                                });

                                const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');

                                (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });
                              `}"
                            >
                              <i
                                class="bi bi-send-fill"
                                css="${css`
                                  position: relative;
                                  top: var(--space--px);
                                  right: var(--space--px);
                                `}"
                              ></i>
                            </button>
                          `
                        : html``}
                    </div>

                    $${response.locals.enrollmentsTyping.length > 0
                      ? html`
                          <div
                            class="secondary"
                            css="${css`
                              font-size: var(--font-size--xs);
                              line-height: var(--line-height--xs);
                            `}"
                          >
                            <i class="bi bi-keyboard"></i>
                            <span
                              css="${css`
                                margin-left: var(--space--1);
                                margin-right: var(--space--2);
                              `}"
                            >
                              Typing:
                            </span>
                            $${response.locals.enrollmentsTyping
                              .map((enrollment) =>
                                application.web.locals.partials.user({
                                  request,
                                  response,
                                  enrollment,
                                  size: "xs",
                                  bold: false,
                                })
                              )
                              .join(", ")}
                          </div>
                        `
                      : html``}
                  </div>

                  $${response.locals.enrollment.courseRole === "staff"
                    ? html``
                    : html`
                        <div class="label">
                          $${response.locals.conversation.type === "chat"
                            ? html``
                            : html`<p class="label--text">Anonymity</p>`}
                          <div
                            css="${css`
                              display: flex;
                            `}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnonymous"
                                $${response.locals.user.preferAnonymousAt
                                  ? html`checked`
                                  : html``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                javascript="${javascript`
                                  this.isModified = false;

                                  this.onchange = async () => {
                                    await fetch(${`https://${application.configuration.hostname}/preferences`}, {
                                      method: "PATCH",
                                      headers: { "CSRF-Protection": "true", },
                                      cache: "no-store",
                                      body: new URLSearchParams({ preferAnonymous: String(this.checked), }),
                                    });
                                  };
                                `}"
                              />
                              <span
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      touch: false,
                                      content: "Set as Anonymous to Other Students",
                                    },
                                  });
                                `}"
                              >
                                <span>
                                  $${application.web.locals.partials.user({
                                    request,
                                    response,
                                    user: response.locals.user,
                                    decorate: false,
                                    name: false,
                                    size: "xs",
                                  })}
                                  <span
                                    css="${css`
                                      margin-left: var(--space--1);
                                    `}"
                                  >
                                    Signed by You
                                  </span>
                                </span>
                              </span>
                              <span
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      touch: false,
                                      content: "Set as Signed by You",
                                    },
                                  });
                                `}"
                              >
                                <span>
                                  $${application.web.locals.partials.user({
                                    request,
                                    response,
                                    name: false,
                                    size: "xs",
                                  })}
                                  <span
                                    css="${css`
                                      margin-left: var(--space--1);
                                    `}"
                                  >
                                    Anonymous to Other Students
                                  </span>
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>
                      `}
                  $${response.locals.conversation.type !== "chat"
                    ? (() => {
                        const sendAnswerFirst =
                          response.locals.conversation.type === "question" &&
                          response.locals.enrollment.courseRole === "staff";

                        const sendMessage = html`
                          <div>
                            <button
                              class="button button--full-width-on-small-screen button--blue"
                              javascript="${javascript`
                                if (${sendAnswerFirst}) return;

                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: ${html`
                                      <span class="keyboard-shortcut">
                                        <span
                                          javascript="${javascript`
                                            this.hidden = leafac.isAppleDevice;
                                          `}"
                                          >Ctrl+Enter</span
                                        ><span
                                          class="keyboard-shortcut--cluster"
                                          javascript="${javascript`
                                            this.hidden = !leafac.isAppleDevice;
                                          `}"
                                          ><i class="bi bi-command"></i
                                          ><i
                                            class="bi bi-arrow-return-left"
                                          ></i
                                        ></span>
                                      </span>
                                    `},
                                  },
                                });
      
                                const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');
      
                                (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });
                              `}"
                            >
                              <i class="bi bi-send-fill"></i>
                              Send Message
                            </button>
                          </div>
                        `;

                        const sendAnswer =
                          response.locals.conversation.type === "question"
                            ? html`
                                <div>
                                  <button
                                    name="type"
                                    value="answer"
                                    class="button button--full-width-on-small-screen button--emerald"
                                    javascript="${javascript`
                                      if (${!sendAnswerFirst}) return;

                                      leafac.setTippy({
                                        event,
                                        element: this,
                                        tippyProps: {
                                          touch: false,
                                          content: ${html`
                                            <span class="keyboard-shortcut">
                                              <span
                                                javascript="${javascript`
                                                  this.hidden = leafac.isAppleDevice;
                                                `}"
                                                >Ctrl+Enter</span
                                              ><span
                                                class="keyboard-shortcut--cluster"
                                                javascript="${javascript`
                                                  this.hidden = !leafac.isAppleDevice;
                                                `}"
                                                ><i class="bi bi-command"></i
                                                ><i
                                                  class="bi bi-arrow-return-left"
                                                ></i
                                              ></span>
                                            </span>
                                          `},
                                        },
                                      });
            
                                      const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');
            
                                      (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });
                                    `}"
                                  >
                                    <i class="bi bi-patch-check-fill"></i>
                                    Send Answer
                                  </button>
                                </div>
                              `
                            : html``;

                        return html`
                          <div
                            css="${css`
                              display: flex;
                              column-gap: var(--space--4);
                              row-gap: var(--space--2);
                              flex-wrap: wrap;
                            `}"
                          >
                            $${sendAnswerFirst
                              ? html`$${sendAnswer} $${sendMessage}`
                              : html`$${sendMessage} $${sendAnswer}`}
                            $${response.locals.conversation.type ===
                              "question" &&
                            response.locals.enrollment.courseRole === "student"
                              ? html`
                                  <div>
                                    <button
                                      name="type"
                                      value="followUpQuestion"
                                      class="button button--full-width-on-small-screen button--rose"
                                    >
                                      <i class="bi bi-patch-question-fill"></i>
                                      Send Follow-Up Question
                                    </button>
                                  </div>
                                `
                              : html``}
                            $${response.locals.enrollment.courseRole === "staff"
                              ? html`
                                  <div
                                    css="${css`
                                      display: flex;
                                      gap: var(--space--2);
                                      align-items: center;
                                    `}"
                                  >
                                    <button
                                      name="type"
                                      value="staffWhisper"
                                      class="button button--full-width-on-small-screen button--sky"
                                    >
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Send Staff Whisper
                                    </button>

                                    <button
                                      type="button"
                                      class="button button--tight button--tight--inline button--transparent"
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            trigger: "click",
                                            content: "Staff whispers are messages visible to staff only.",
                                          },
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-info-circle"></i>
                                    </button>
                                  </div>
                                `
                              : html``}
                          </div>
                        `;
                      })()
                    : html``}
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  application.web.patch<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      participants?: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
      selectedParticipantsReferences?: string[];
      isAnonymous?: "true" | "false";
      type?: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
      isAnnouncement?: "true" | "false";
      isPinned?: "true" | "false";
      isResolved?: "true" | "false";
      title?: string;
    },
    {
      conversations?: object;
      messages?: object;
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    (request, response, next) => {
      if (
        response.locals.conversation === undefined ||
        !mayEditConversation({ request, response })
      )
        return next();

      if (typeof request.body.participants === "string")
        application.database.executeTransaction(() => {
          request.body.selectedParticipantsReferences ??= [];
          if (
            !application.web.locals.helpers.conversationParticipantses.includes(
              request.body.participants!
            ) ||
            !Array.isArray(request.body.selectedParticipantsReferences) ||
            (request.body.participants === "everyone" &&
              request.body.selectedParticipantsReferences.length > 0) ||
            (request.body.participants === "selected-people" &&
              request.body.selectedParticipantsReferences.length === 0) ||
            request.body.selectedParticipantsReferences.some(
              (selectedParticipantReference) =>
                typeof selectedParticipantReference !== "string"
            ) ||
            request.body.selectedParticipantsReferences.length !==
              new Set(request.body.selectedParticipantsReferences).size
          )
            return next("Validation");

          if (
            (request.body.participants === "staff" &&
              response.locals.enrollment.courseRole !== "staff") ||
            request.body.participants === "selected-people"
          )
            request.body.selectedParticipantsReferences.push(
              response.locals.enrollment.reference
            );
          const selectedParticipants =
            request.body.selectedParticipantsReferences.length === 0
              ? []
              : application.database.all<{
                  id: number;
                  courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
                }>(
                  sql`
                    SELECT "id", "courseRole"
                    FROM "enrollments"
                    WHERE
                      "enrollments"."course" = ${response.locals.course.id} AND
                      "reference" IN ${request.body.selectedParticipantsReferences}
                  `
                );

          if (
            request.body.selectedParticipantsReferences.length !==
              selectedParticipants.length ||
            (request.body.participants === "staff" &&
              selectedParticipants.some(
                (selectedParticipant) =>
                  selectedParticipant.courseRole === "staff"
              ))
          )
            return next("Validation");

          application.database.run(
            sql`
              UPDATE "conversations"
              SET "participants" = ${request.body.participants}
              WHERE "id" = ${response.locals.conversation.id}
            `
          );
          application.database.run(
            sql`
              DELETE FROM "conversationSelectedParticipants"
              WHERE
                "conversation" = ${response.locals.conversation.id} AND
                "enrollment" NOT IN ${selectedParticipants.map(
                  (selectedParticipant) => selectedParticipant.id
                )}
            `
          );
          for (const selectedParticipant of selectedParticipants)
            application.database.run(
              sql`
                INSERT INTO "conversationSelectedParticipants" ("createdAt", "conversation", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${response.locals.conversation.id},
                  ${selectedParticipant.id}
                )
              `
            );
        });

      if (typeof request.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(request.body.isAnonymous) ||
          response.locals.conversation.authorEnrollment ===
            "no-longer-enrolled" ||
          response.locals.conversation.authorEnrollment.courseRole ===
            "staff" ||
          (request.body.isAnonymous === "true" &&
            response.locals.conversation.anonymousAt !== null) ||
          (request.body.isAnonymous === "false" &&
            response.locals.conversation.anonymousAt === null)
        )
          return next("Validation");
        else
          application.database.executeTransaction(() => {
            application.database.run(
              sql`
                UPDATE "conversations"
                SET "anonymousAt" = ${
                  request.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE "id" = ${response.locals.conversation.id}
              `
            );
            application.database.run(
              sql`
                UPDATE "messages"
                SET "anonymousAt" = ${
                  request.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE
                  "conversation" = ${response.locals.conversation.id} AND
                  "reference" = '1' AND
                  "authorEnrollment" = ${
                    response.locals.conversation.authorEnrollment ===
                    "no-longer-enrolled"
                      ? (() => {
                          throw new Error();
                        })()
                      : response.locals.conversation.authorEnrollment.id
                  }
              `
            );
          });

      if (typeof request.body.type === "string")
        if (
          !application.web.locals.helpers.conversationTypes.includes(
            request.body.type
          )
        )
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "conversations"
              SET "type" = ${request.body.type}
              WHERE "id" = ${response.locals.conversation.id}
            `
          );

      if (typeof request.body.isAnnouncement === "string")
        if (
          !["true", "false"].includes(request.body.isAnnouncement) ||
          response.locals.enrollment.courseRole !== "staff" ||
          response.locals.conversation.type !== "note" ||
          (request.body.isAnnouncement === "true" &&
            response.locals.conversation.announcementAt !== null) ||
          (request.body.isAnnouncement === "false" &&
            response.locals.conversation.announcementAt === null)
        )
          return next("Validation");
        else {
          application.database.run(
            sql`
              UPDATE "conversations"
              SET
                $${
                  request.body.isAnnouncement === "true"
                    ? sql`"updatedAt" = ${new Date().toISOString()},`
                    : sql``
                }
                "announcementAt" = ${
                  request.body.isAnnouncement === "true"
                    ? new Date().toISOString()
                    : null
                }
              WHERE "id" = ${response.locals.conversation.id}
            `
          );
          if (request.body.isAnnouncement === "true") {
            const message = application.web.locals.helpers.getMessage({
              request,
              response,
              conversation: response.locals.conversation,
              messageReference: "1",
            });
            if (message !== undefined)
              application.web.locals.helpers.emailNotifications({
                request,
                response,
                message,
              });
          }
        }

      if (typeof request.body.isPinned === "string")
        if (
          !["true", "false"].includes(request.body.isPinned) ||
          response.locals.enrollment.courseRole !== "staff" ||
          (request.body.isPinned === "true" &&
            response.locals.conversation.pinnedAt !== null) ||
          (request.body.isPinned === "false" &&
            response.locals.conversation.pinnedAt === null)
        )
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "conversations"
              SET
                $${
                  request.body.isPinned === "true"
                    ? sql`"updatedAt" = ${new Date().toISOString()},`
                    : sql``
                }
                "pinnedAt" = ${
                  request.body.isPinned === "true"
                    ? new Date().toISOString()
                    : null
                }
              WHERE "id" = ${response.locals.conversation.id}
            `
          );

      if (typeof request.body.isResolved === "string")
        if (
          response.locals.conversation.type !== "question" ||
          !["true", "false"].includes(request.body.isResolved) ||
          response.locals.enrollment.courseRole !== "staff" ||
          (request.body.isResolved === "true" &&
            response.locals.conversation.resolvedAt !== null) ||
          (request.body.isResolved === "false" &&
            response.locals.conversation.resolvedAt === null)
        )
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "conversations"
              SET "resolvedAt" = ${
                request.body.isResolved === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${response.locals.conversation.id}
            `
          );

      if (typeof request.body.title === "string")
        if (request.body.title.trim() === "") return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "conversations"
              SET
                "updatedAt" = ${new Date().toISOString()},
                "title" = ${request.body.title},
                "titleSearch" = ${html`${request.body.title}`}
              WHERE "id" = ${response.locals.conversation.id}
            `
          );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/${response.locals.conversation.reference}${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.delete<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    (request, response, next) => {
      if (
        response.locals.conversation === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      application.database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${response.locals.conversation.id}`
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Conversation removed successfully.`,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.post<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {
      conversations?: object;
      messages?: object;
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    (request, response, next) => {
      if (
        response.locals.conversation === undefined ||
        !mayEditConversation({ request, response })
      )
        return next();

      if (
        typeof request.body.reference !== "string" ||
        !response.locals.tags.some(
          (tag) => request.body.reference === tag.reference
        ) ||
        response.locals.conversation.taggings.some(
          (tagging) => request.body.reference === tagging.tag.reference
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          INSERT INTO "taggings" ("createdAt", "conversation", "tag")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.conversation.id},
            ${
              response.locals.tags.find(
                (tag) => request.body.reference === tag.reference
              )!.id
            }
          )
        `
      );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/${response.locals.conversation.reference}${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.web.delete<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {
      conversations?: object;
      messages?: object;
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    (request, response, next) => {
      if (
        response.locals.conversation === undefined ||
        !mayEditConversation({ request, response })
      )
        return next();

      if (
        (response.locals.conversation.taggings.length === 1 &&
          response.locals.conversation.type !== "chat") ||
        typeof request.body.reference !== "string" ||
        !response.locals.conversation.taggings.some(
          (tagging) => request.body.reference === tagging.tag.reference
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          DELETE FROM "taggings"
          WHERE
            "conversation" = ${response.locals.conversation.id} AND
            "tag" = ${
              response.locals.tags.find(
                (tag) => request.body.reference === tag.reference
              )!.id
            }
        `
      );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/${response.locals.conversation.reference}${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true }
        )}`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );
};
