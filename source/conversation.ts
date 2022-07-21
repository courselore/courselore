import assert from "node:assert/strict";
import util from "node:util";
import express from "express";
import qs from "qs";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import cryptoRandomString from "crypto-random-string";
import {
  Courselore,
  LiveUpdatesMiddlewareLocals,
  UserAvatarlessBackgroundColor,
  CourseRole,
  IsEnrolledInCourseMiddlewareLocals,
  IsCourseStaffMiddlewareLocals,
} from "./index.js";

export type ConversationType = typeof conversationTypes[number];
export const conversationTypes = ["question", "note", "chat"] as const;

export type AuthorEnrollment =
  | {
      id: number;
      user: AuthorEnrollmentUser;
      reference: string;
      courseRole: CourseRole;
    }
  | "no-longer-enrolled";
export type AuthorEnrollmentUser = {
  id: number;
  lastSeenOnlineAt: string;
  reference: string;
  email: string;
  name: string;
  avatar: string | null;
  avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
  biographySource: string | null;
  biographyPreprocessed: HTML | null;
};

export type ConversationLayout = ({
  req,
  res,
  head,
  sidebarOnSmallScreen,
  mainIsAScrollingPane,
  body,
}: {
  req: express.Request<
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
          types?: ConversationType[];
          isResolved?: "true" | "false";
          isPinned?: "true" | "false";
          isStaffOnly?: "true" | "false";
          tagsReferences?: string[];
        };
      };
      messages?: object;
      newConversation?: object;
    },
    IsEnrolledInCourseMiddlewareLocals &
      Partial<IsConversationAccessibleMiddlewareLocals>
  >;
  res: express.Response<
    HTML,
    IsEnrolledInCourseMiddlewareLocals &
      Partial<IsConversationAccessibleMiddlewareLocals>
  >;
  head: HTML;
  sidebarOnSmallScreen?: boolean;
  mainIsAScrollingPane?: boolean;
  body: HTML;
}) => HTML;

export type ConversationPartial = ({
  req,
  res,
  conversation,
  searchResult,
  message,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  conversation: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getConversation"]>
  >;
  searchResult?:
    | {
        type: "conversationTitle";
        highlight: HTML;
      }
    | {
        type: "messageAuthorUserName";
        message: NonNullable<
          ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
        >;
        highlight: HTML;
      }
    | {
        type: "messageContent";
        message: NonNullable<
          ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
        >;
        snippet: HTML;
      };
  message?: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getMessage"]>
  >;
}) => HTML;

export type GetConversationHelper = ({
  req,
  res,
  conversationReference,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  conversationReference: string;
}) =>
  | {
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollment: AuthorEnrollment;
      anonymousAt: string | null;
      type: ConversationType;
      resolvedAt: string | null;
      pinnedAt: string | null;
      staffOnlyAt: string | null;
      title: string;
      titleSearch: string;
      nextMessageReference: number;
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
        enrollment: AuthorEnrollment;
      }[];
    }
  | undefined;

export type IsConversationAccessibleMiddleware = express.RequestHandler<
  { courseReference: string; conversationReference: string },
  HTML,
  {},
  {},
  IsConversationAccessibleMiddlewareLocals
>[];
export interface IsConversationAccessibleMiddlewareLocals
  extends IsEnrolledInCourseMiddlewareLocals {
  conversation: NonNullable<
    ReturnType<Courselore["locals"]["helpers"]["getConversation"]>
  >;
}

export default (app: Courselore): void => {
  const conversationTypeIcon: {
    [conversationType in ConversationType]: {
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

  const conversationTypeTextColor: {
    [conversationType in ConversationType]: string;
  } = {
    question: "text--rose",
    note: "text--fuchsia",
    chat: "text--cyan",
  };

  app.locals.layouts.conversation = ({
    req,
    res,
    head,
    sidebarOnSmallScreen = false,
    mainIsAScrollingPane = false,
    body,
  }) => {
    const search =
      typeof req.query.conversations?.search === "string" &&
      req.query.conversations.search.trim() !== ""
        ? app.locals.helpers.sanitizeSearch(req.query.conversations.search)
        : undefined;

    const filters: {
      isQuick?: "true";
      isUnread?: "true" | "false";
      types?: ConversationType[];
      isResolved?: "true" | "false";
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
      tagsReferences?: string[];
    } = {};
    if (
      typeof req.query.conversations?.filters === "object" &&
      req.query.conversations.filters !== null
    ) {
      if (
        typeof req.query.conversations.filters.isUnread === "string" &&
        ["true", "false"].includes(req.query.conversations.filters.isUnread)
      )
        filters.isUnread = req.query.conversations.filters.isUnread;
      if (Array.isArray(req.query.conversations.filters.types)) {
        const types = [
          ...new Set(
            req.query.conversations.filters.types.filter((type) =>
              conversationTypes.includes(type)
            )
          ),
        ];
        if (types.length > 0) filters.types = types;
      }
      if (
        filters.types?.includes("question") &&
        typeof req.query.conversations.filters.isResolved === "string" &&
        ["true", "false"].includes(req.query.conversations.filters.isResolved)
      )
        filters.isResolved = req.query.conversations.filters.isResolved;
      if (
        typeof req.query.conversations.filters.isPinned === "string" &&
        ["true", "false"].includes(req.query.conversations.filters.isPinned)
      )
        filters.isPinned = req.query.conversations.filters.isPinned;
      if (
        typeof req.query.conversations.filters.isStaffOnly === "string" &&
        ["true", "false"].includes(req.query.conversations.filters.isStaffOnly)
      )
        filters.isStaffOnly = req.query.conversations.filters.isStaffOnly;
      if (Array.isArray(req.query.conversations.filters.tagsReferences)) {
        const tagsReferences = [
          ...new Set(
            req.query.conversations.filters.tagsReferences.filter(
              (tagReference) =>
                res.locals.tags.find(
                  (tag) => tagReference === tag.reference
                ) !== undefined
            )
          ),
        ];
        if (tagsReferences.length > 0) filters.tagsReferences = tagsReferences;
      }
      if (
        Object.keys(filters).length > 0 &&
        req.query.conversations.filters.isQuick === "true"
      )
        filters.isQuick = req.query.conversations.filters.isQuick;
    }

    const conversationsPageSize = 999999; // TODO: Pagination: 15
    const conversationsPage =
      typeof req.query.conversations?.conversationsPage === "string" &&
      req.query.conversations.conversationsPage.match(/^[1-9][0-9]*$/)
        ? Number(req.query.conversations.conversationsPage)
        : 1;

    const conversationsWithSearchResults = app.locals.database
      .all<{
        reference: string;
        conversationTitleSearchResultHighlight?: string | null;
        messageAuthorUserNameSearchResultMessageReference?: string | null;
        messageAuthorUserNameSearchResultHighlight?: string | null;
        messageContentSearchResultMessageReference?: string | null;
        messageContentSearchResultSnippet?: string | null;
      }>(
        sql`
          SELECT "conversations"."reference"
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
                  SELECT "rowid",
                         "rank",
                         highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "conversationsTitleSearchIndex"
                  WHERE "conversationsTitleSearchIndex" MATCH ${search}
                ) AS "conversationTitleSearchResult" ON "conversations"."id" = "conversationTitleSearchResult"."rowid"

                LEFT JOIN (
                  SELECT "messages"."reference" AS  "messageReference",
                         "messages"."conversation" AS "conversationId",
                         "usersNameSearchIndex"."rank" AS "rank",
                         highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "usersNameSearchIndex"
                  JOIN "users" ON "usersNameSearchIndex"."rowid" = "users"."id"
                  JOIN "enrollments" ON "users"."id" = "enrollments"."user"
                  JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment"
                                     $${
                                       res.locals.enrollment.courseRole ===
                                       "staff"
                                         ? sql``
                                         : sql`
                                             AND (
                                               "messages"."anonymousAt" IS NULL OR
                                               "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                                             )
                                           `
                                     }
                  WHERE "usersNameSearchIndex" MATCH ${search}
                ) AS "messageAuthorUserNameSearchResult" ON "conversations"."id" = "messageAuthorUserNameSearchResult"."conversationId"

                LEFT JOIN (
                  SELECT "messages"."reference" AS "messageReference",
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
                  JOIN "tags" ON "taggings"."tag" = "tags"."id" AND
                                 "tags"."reference" IN ${filters.tagsReferences}
                `
          }
          $${
            res.locals.enrollment.courseRole !== "staff"
              ? sql`
                  LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation" AND
                                          "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                `
              : sql``
          }
          WHERE "conversations"."course" = ${res.locals.course.id}
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
                  AND $${filters.isUnread === "true" ? sql`` : sql`NOT`} EXISTS(
                    SELECT TRUE
                    FROM "messages"
                    LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                            "readings"."enrollment" = ${
                                              res.locals.enrollment.id
                                            }
                    WHERE "conversations"."id" = "messages"."conversation" AND
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
                  AND "conversations"."resolvedAt" IS $${
                    filters.isResolved === "true" ? sql`NOT` : sql``
                  } NULL
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
          $${
            filters.isStaffOnly === undefined
              ? sql``
              : sql`
                  AND "conversations"."staffOnlyAt" IS $${
                    filters.isStaffOnly === "true" ? sql`NOT` : sql``
                  } NULL
                `
          }
          $${
            res.locals.enrollment.courseRole !== "staff"
              ? sql`
                  AND (
                    "conversations"."staffOnlyAt" IS NULL OR
                    "messages"."id" IS NOT NULL
                  )
                `
              : sql``
          }
          GROUP BY "conversations"."id"
          ORDER BY "conversations"."pinnedAt" IS NOT NULL DESC,
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
        const conversation = app.locals.helpers.getConversation({
          req,
          res,
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
                message: app.locals.helpers.getMessage({
                  req,
                  res,
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
                message: app.locals.helpers.getMessage({
                  req,
                  res,
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
    //   ...app.locals.database
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
    //         WHERE "course" = ${res.locals.course.id} AND
    //               "authorEnrollment" = ${res.locals.enrollment.id}
    //         ORDER BY coalesce("updatedAt", "createdAt") DESC
    //       `
    //     )
    //     .map((conversationDraft) => {
    //       const taggings = app.locals.database
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
    //             WHERE "course" = ${res.locals.course.id}
    //                   $${
    //                     res.locals.enrollment.courseRole === "student"
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
    //           authorEnrollment: res.locals.enrollment,
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

    return app.locals.layouts.application({
      req,
      res,
      head,
      extraHeaders: html`
        $${sidebarOnSmallScreen
          ? html``
          : html`
              <div
                key="header--menu--secondary"
                css="${res.locals.css(css`
                  @media (min-width: 900px) {
                    display: none;
                  }
                `)}"
              >
                <div
                  css="${res.locals.css(css`
                    padding: var(--space--1) var(--space--0);
                  `)}"
                >
                  <a
                    href="https://${app.locals.options.host}/courses/${res
                      .locals.course.reference}"
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
          css="${res.locals.css(css`
            width: 100%;
            height: 100%;
            display: flex;
          `)}"
        >
          <div
            key="layout--conversation--sidebar--/${res.locals.course.reference}"
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              @media (max-width: 899px) {
                flex: 1;
                ${sidebarOnSmallScreen
                  ? css``
                  : css`
                      display: none;
                    `}
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
                border-right: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              }
            `)}"
          >
            <div
              css="${res.locals.css(css`
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                max-height: 50%;
                overflow: auto;
                border-bottom: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              `)}"
            >
              <div
                css="${res.locals.css(css`
                  margin: var(--space--4);
                  @media (max-width: 899px) {
                    display: flex;
                    justify-content: center;
                  }
                `)}"
              >
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    @media (max-width: 899px) {
                      flex: 1;
                      min-width: var(--width--0);
                      max-width: var(--width--prose);
                    }
                  `)}"
                >
                  <div
                    css="${res.locals.css(css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      align-items: baseline;
                      gap: var(--space--2);
                      flex-wrap: wrap;
                    `)}"
                  >
                    <div
                      class="strong secondary"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--2xs);
                        line-height: var(--line-height--2xs);
                      `)}"
                    >
                      New:
                    </div>
                    $${res.locals.enrollment.courseRole === "staff"
                      ? html`
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/note${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--blue"
                          >
                            $${conversationTypeIcon.note.fill} Note
                          </a>
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/question${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${conversationTypeIcon.question.regular} Question
                          </a>
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/chat${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${conversationTypeIcon.chat.regular} Chat
                          </a>
                        `
                      : html`
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/question${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--blue"
                          >
                            $${conversationTypeIcon.question.fill} Question
                          </a>
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/note${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${conversationTypeIcon.note.regular} Note
                          </a>
                          <a
                            href="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/new/chat${qs.stringify(
                              { conversations: req.query.conversations },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--transparent"
                          >
                            $${conversationTypeIcon.chat.regular} Chat
                          </a>
                        `}
                  </div>

                  <hr class="separator" />

                  <div
                    css="${res.locals.css(css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      align-items: baseline;
                      column-gap: var(--space--4);
                      row-gap: var(--space--2);
                      flex-wrap: wrap;
                    `)}"
                  >
                    <div
                      class="strong secondary"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--2xs);
                        line-height: var(--line-height--2xs);
                      `)}"
                    >
                      Quick Filters:
                    </div>
                    $${!util.isDeepStrictEqual(
                      req.query.conversations?.filters,
                      {
                        isQuick: "true",
                        isUnread: "true",
                      }
                    )
                      ? html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    isUnread: "true",
                                  },
                                },
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-eyeglasses"></i>
                            Unread
                          </a>
                        `
                      : html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--blue"
                          >
                            <i class="bi bi-eyeglasses"></i>
                            Unread
                          </a>
                        `}
                    $${res.locals.enrollment.courseRole === "staff"
                      ? html`
                          $${!util.isDeepStrictEqual(
                            req.query.conversations?.filters,
                            {
                              isQuick: "true",
                              types: ["question"],
                              isResolved: "false",
                            }
                          )
                            ? html`
                                <a
                                  href="https://${app.locals.options
                                    .host}${req.path}${qs.stringify(
                                    {
                                      conversations: {
                                        filters: {
                                          isQuick: "true",
                                          types: ["question"],
                                          isResolved: "false",
                                        },
                                      },
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <i class="bi bi-patch-exclamation"></i>
                                  Unresolved Questions
                                </a>
                              `
                            : html`
                                <a
                                  href="https://${app.locals.options
                                    .host}${req.path}${qs.stringify(
                                    {
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent text--rose"
                                >
                                  <i class="bi bi-patch-exclamation-fill"></i>
                                  Unresolved Questions
                                </a>
                              `}
                        `
                      : html`
                          $${!util.isDeepStrictEqual(
                            req.query.conversations?.filters,
                            {
                              isQuick: "true",
                              types: ["question"],
                            }
                          )
                            ? html`
                                <a
                                  href="https://${app.locals.options
                                    .host}${req.path}${qs.stringify(
                                    {
                                      conversations: {
                                        filters: {
                                          isQuick: "true",
                                          types: ["question"],
                                        },
                                      },
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <i class="bi bi-patch-question"></i>
                                  Questions
                                </a>
                              `
                            : html`
                                <a
                                  href="https://${app.locals.options
                                    .host}${req.path}${qs.stringify(
                                    {
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
                                  )}"
                                  class="button button--tight button--tight--inline button--transparent text--rose"
                                >
                                  <i class="bi bi-patch-question-fill"></i>
                                  Questions
                                </a>
                              `}
                        `}
                    $${!util.isDeepStrictEqual(
                      req.query.conversations?.filters,
                      {
                        isQuick: "true",
                        types: ["note"],
                      }
                    )
                      ? html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    types: ["note"],
                                  },
                                },
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-sticky"></i>
                            Notes
                          </a>
                        `
                      : html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--fuchsia"
                          >
                            <i class="bi bi-sticky-fill"></i>
                            Notes
                          </a>
                        `}
                    $${!util.isDeepStrictEqual(
                      req.query.conversations?.filters,
                      {
                        isQuick: "true",
                        types: ["chat"],
                      }
                    )
                      ? html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                conversations: {
                                  filters: {
                                    isQuick: "true",
                                    types: ["chat"],
                                  },
                                },
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-chat-text"></i>
                            Chats
                          </a>
                        `
                      : html`
                          <a
                            href="https://${app.locals.options
                              .host}${req.path}${qs.stringify(
                              {
                                messages: req.query.messages,
                                newConversation: req.query.newConversation,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            class="button button--tight button--tight--inline button--transparent text--cyan"
                          >
                            <i class="bi bi-chat-text-fill"></i>
                            Chats
                          </a>
                        `}
                  </div>

                  <hr class="separator" />

                  <div
                    key="search-and-filters"
                    css="${res.locals.css(css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `)}"
                  >
                    <div
                      css="${res.locals.css(css`
                        display: flex;
                        column-gap: var(--space--4);
                        row-gap: var(--space--2);
                        flex-wrap: wrap;
                      `)}"
                    >
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          key="search-and-filters--show-hide--search"
                          type="checkbox"
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          $${search !== undefined ? html`checked` : html``}
                          onload="${javascript`
                            this.isModified = false;

                            this.onchange = () => {
                              const searchAndFilters = this.closest('[key="search-and-filters"]');
                              const searchAndFiltersForm = searchAndFilters.querySelector('[key="search-and-filters--form"]');
                              const searchAndFiltersFormSection = searchAndFiltersForm.querySelector('[key="search"]');
                              searchAndFiltersForm.hidden = [...searchAndFilters.querySelectorAll('[key="search-and-filters--show-hide--search"], [key="search-and-filters--show-hide--filters"]')]
                                .every((element) => !element.checked);
                              searchAndFiltersFormSection.hidden = !this.checked;
                              for (const element of searchAndFiltersFormSection.querySelectorAll("*"))
                                if (element.disabled !== null) element.disabled = !this.checked;
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
                          onload="${javascript`
                            this.isModified = false;
                            
                            this.onchange = () => {
                              const searchAndFilters = this.closest('[key="search-and-filters"]');
                              const searchAndFiltersForm = searchAndFilters.querySelector('[key="search-and-filters--form"]');
                              const searchAndFiltersFormSection = searchAndFiltersForm.querySelector('[key="filters"]');
                              searchAndFiltersForm.hidden = [...searchAndFilters.querySelectorAll('[key="search-and-filters--show-hide--search"], [key="search-and-filters--show-hide--filters"]')]
                                .every((element) => !element.checked);
                              searchAndFiltersFormSection.hidden = !this.checked;
                              for (const element of searchAndFiltersFormSection.querySelectorAll("*"))
                                if (element.disabled !== null) element.disabled = !this.checked;
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
                      $${req.query.conversations === undefined &&
                      conversationsWithSearchResults.length > 0 &&
                      conversationsWithSearchResults.some(
                        ({ conversation }) =>
                          conversation.readingsCount <
                          conversation.messagesCount
                      )
                        ? html`
                            <form
                              method="POST"
                              action="https://${app.locals.options
                                .host}/courses/${res.locals.course
                                .reference}/conversations/mark-all-conversations-as-read${qs.stringify(
                                { redirect: req.originalUrl },
                                { addQueryPrefix: true }
                              )}"
                            >
                              <input
                                type="hidden"
                                name="_csrf"
                                value="${req.csrfToken()}"
                              />
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
                      action="https://${app.locals.options
                        .host}${req.path}${qs.stringify(
                        {
                          messages: req.query.messages,
                          newConversation: req.query.newConversation,
                        },
                        {
                          addQueryPrefix: true,
                        }
                      )}"
                      novalidate
                      $${search !== undefined ||
                      (Object.keys(filters).length > 0 &&
                        filters.isQuick !== "true")
                        ? html``
                        : html`hidden`}
                      css="${res.locals.css(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--1);
                      `)}"
                      onload="${javascript`
                        this.isModified = false;
                      `}"
                    >
                      <div
                        key="search"
                        $${search !== undefined ? html`` : html`hidden`}
                        css="${res.locals.css(css`
                          display: flex;
                          gap: var(--space--2);
                          align-items: center;
                        `)}"
                      >
                        <input
                          type="text"
                          name="conversations[search]"
                          value="${search !== undefined
                            ? req.query.conversations!.search!
                            : ""}"
                          placeholder="Search…"
                          $${search !== undefined ? html`` : html`disabled`}
                          class="input--text"
                        />
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Search",
                            });
                          `}"
                        >
                          <i class="bi bi-search"></i>
                        </button>
                        $${search !== undefined
                          ? html`
                              <a
                                href="https://${app.locals.options
                                  .host}${req.path}${qs.stringify(
                                  {
                                    conversations: {
                                      filters: req.query.conversations?.filters,
                                    },
                                    messages: req.query.messages,
                                    newConversation: req.query.newConversation,
                                  },
                                  {
                                    addQueryPrefix: true,
                                  }
                                )}"
                                class="button button--tight button--tight--inline button--transparent"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Clear Search",
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
                        css="${res.locals.css(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div class="label">
                          <div class="label--text">Unread</div>
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isUnread]"
                                value="true"
                                $${req.query.conversations?.filters
                                  ?.isUnread === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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
                                $${req.query.conversations?.filters
                                  ?.isUnread === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            $${conversationTypes.map(
                              (conversationType) => html`
                                <label
                                  class="button button--tight button--tight--inline button--transparent"
                                >
                                  <input
                                    type="checkbox"
                                    name="conversations[filters][types][]"
                                    value="${conversationType}"
                                    $${req.query.conversations?.filters?.types?.includes(
                                      conversationType
                                    )
                                      ? html`checked`
                                      : html``}
                                    $${Object.keys(filters).length > 0 &&
                                    filters.isQuick !== "true"
                                      ? html``
                                      : html`disabled`}
                                    class="visually-hidden input--radio-or-checkbox--multilabel"
                                    onload="${javascript`
                                      ${
                                        conversationType === "question"
                                          ? javascript`
                                              this.onchange = () => {
                                                if (this.checked) return;
                                                for (const element of this.closest("form").querySelectorAll('[name="conversations[filters][isResolved]"]'))
                                                  element.checked = false;
                                              };
                                            `
                                          : javascript``
                                      }
                                    `}"
                                  />
                                  <span>
                                    $${conversationTypeIcon[conversationType]
                                      .regular}
                                    $${lodash.capitalize(conversationType)}
                                  </span>
                                  <span
                                    class="${conversationTypeTextColor[
                                      conversationType
                                    ]}"
                                  >
                                    $${conversationTypeIcon[conversationType]
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
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isResolved]"
                                value="false"
                                $${req.query.conversations?.filters
                                  ?.isResolved === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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
                                $${req.query.conversations?.filters
                                  ?.isResolved === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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
                          <div class="label--text">
                            Pin
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  trigger: "click",
                                  content: "Pinned conversations are listed first.",
                                });
                              `}"
                            >
                              <i class="bi bi-info-circle"></i>
                            </button>
                          </div>
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isPinned]"
                                value="true"
                                $${req.query.conversations?.filters
                                  ?.isPinned === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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
                                $${req.query.conversations?.filters
                                  ?.isPinned === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
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

                        <div class="label">
                          <p class="label--text">Visibility</p>
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--6);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isStaffOnly]"
                                value="false"
                                $${req.query.conversations?.filters
                                  ?.isStaffOnly === "false"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isStaffOnly]"][value="true"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-eye"></i>
                                Visible by Everyone
                              </span>
                              <span class="text--sky">
                                <i class="bi bi-eye-fill"></i>
                                Visible by Everyone
                              </span>
                            </label>
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="conversations[filters][isStaffOnly]"
                                value="true"
                                $${req.query.conversations?.filters
                                  ?.isStaffOnly === "true"
                                  ? html`checked`
                                  : html``}
                                $${Object.keys(filters).length > 0 &&
                                filters.isQuick !== "true"
                                  ? html``
                                  : html`disabled`}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
                                  this.onchange = () => {
                                    if (this.checked) this.closest("form").querySelector('[name="conversations[filters][isStaffOnly]"][value="false"]').checked = false;
                                  };
                                `}"
                              />
                              <span>
                                <i class="bi bi-mortarboard"></i>
                                Visible by Staff Only
                              </span>
                              <span class="text--sky">
                                <i class="bi bi-mortarboard-fill"></i>
                                Visible by Staff Only
                              </span>
                            </label>
                          </div>
                        </div>

                        $${res.locals.tags.length === 0
                          ? html``
                          : html`
                              <div class="label">
                                <div class="label--text">
                                  Tags
                                  <button
                                    type="button"
                                    class="button button--tight button--tight--inline button--transparent"
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        trigger: "click",
                                        content: "Tags help to organize conversations.",
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-info-circle"></i>
                                  </button>
                                </div>
                                <div
                                  css="${res.locals.css(css`
                                    display: flex;
                                    flex-wrap: wrap;
                                    column-gap: var(--space--6);
                                    row-gap: var(--space--2);
                                  `)}"
                                >
                                  $${res.locals.tags.map(
                                    (tag) => html`
                                      <div
                                        key="tag--${tag.reference}"
                                        css="${res.locals.css(css`
                                          display: flex;
                                          gap: var(--space--2);
                                        `)}"
                                      >
                                        <label
                                          class="button button--tight button--tight--inline button--transparent"
                                        >
                                          <input
                                            type="checkbox"
                                            name="conversations[filters][tagsReferences][]"
                                            value="${tag.reference}"
                                            $${req.query.conversations?.filters?.tagsReferences?.includes(
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
                                                onload="${javascript`
                                                  (this.tooltip ??= tippy(this)).setProps({
                                                    touch: false,
                                                    content: "This tag is visible by staff only.",
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
                          css="${res.locals.css(css`
                            margin-top: var(--space--2);
                            display: flex;
                            gap: var(--space--2);
                            & > * {
                              flex: 1;
                            }
                          `)}"
                        >
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <i class="bi bi-funnel"></i>
                            Apply Filters
                          </button>
                          $${Object.keys(filters).length > 0
                            ? html`
                                <a
                                  href="https://${app.locals.options
                                    .host}${req.path}${qs.stringify(
                                    {
                                      conversations: { search },
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
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
              css="${res.locals.css(css`
                flex: 1;
                overflow: auto;
              `)}"
            >
              <div
                css="${res.locals.css(css`
                  margin: var(--space--4);
                  @media (max-width: 899px) {
                    display: flex;
                    justify-content: center;
                  }
                `)}"
              >
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    @media (max-width: 899px) {
                      flex: 1;
                      min-width: var(--width--0);
                      max-width: var(--width--prose);
                    }
                  `)}"
                >
                  $${conversationsWithSearchResults.length === 0
                    ? html`
                        <div
                          css="${res.locals.css(css`
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                          `)}"
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
                                css="${res.locals.css(css`
                                  display: flex;
                                  justify-content: center;
                                `)}"
                              >
                                <a
                                  href="${qs.stringify(
                                    {
                                      conversations: {
                                        ...req.query.conversations,
                                        conversationsPage:
                                          conversationsPage - 1,
                                      },
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
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
                          css="${res.locals.css(css`
                            margin-top: var(--space---2);
                          `)}"
                          onload="${javascript`
                            ${
                              res.locals.conversation !== undefined
                                ? javascript`
                                    window.setTimeout(() => {
                                      if (event?.detail?.previousLocation?.href?.startsWith(${JSON.stringify(
                                        `https://${app.locals.options.host}/courses/${res.locals.course.reference}`
                                      )})) return;
                                      this.querySelector('[key="conversation--${
                                        res.locals.conversation.reference
                                      }"]')?.scrollIntoView({ block: "center" });
                                    });
                                  `
                                : javascript``
                            }
                          `}"
                        >
                          $${conversationsWithSearchResults.map(
                            ({ conversation, searchResult }) => {
                              const isSelected =
                                conversation.id === res.locals.conversation?.id;
                              return html`
                                <a
                                  key="conversation--${conversation.reference}"
                                  href="https://${app.locals.options
                                    .host}/courses/${res.locals.course
                                    .reference}/conversations/${conversation.reference}${qs.stringify(
                                    {
                                      conversations: req.query.conversations,
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
                                  css="${res.locals.css(css`
                                    width: calc(
                                      var(--space--2) + 100% + var(--space--2)
                                    );
                                    padding: var(--space--3) var(--space--2);
                                    margin-left: var(--space---2);
                                    position: relative;
                                    align-items: center;
                                    ${isSelected
                                      ? css`
                                          & + * {
                                            margin-bottom: var(--space--0);
                                          }
                                        `
                                      : css``}
                                  `)}"
                                >
                                  <div
                                    css="${res.locals.css(css`
                                      flex: 1;
                                    `)}"
                                  >
                                    $${app.locals.partials.conversation({
                                      req,
                                      res,
                                      conversation,
                                      searchResult,
                                    })}
                                  </div>
                                  <div
                                    css="${res.locals.css(css`
                                      width: var(--space--4);
                                      display: flex;
                                      justify-content: flex-end;
                                    `)}"
                                  >
                                    $${(() => {
                                      const unreadCount =
                                        conversation.messagesCount -
                                        conversation.readingsCount;
                                      return unreadCount === 0 ||
                                        conversation.id ===
                                          res.locals.conversation?.id
                                        ? html``
                                        : html`
                                            <button
                                              class="button button--tight button--blue"
                                              css="${res.locals.css(css`
                                                font-size: var(
                                                  --font-size--2xs
                                                );
                                                line-height: var(
                                                  --line-height--2xs
                                                );
                                              `)}"
                                              onload="${javascript`
                                                (this.tooltip ??= tippy(this)).setProps({
                                                  touch: false,
                                                  content: "Mark as Read",
                                                });
                                                        
                                                this.onclick = async (event) => {
                                                  event.preventDefault();
                                                  event.stopImmediatePropagation();
                                                  await fetch(this.closest("a").getAttribute("href"));
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
                              css="${res.locals.css(css`
                                margin: var(--space---px) var(--space--0);
                              `)}"
                            />
                          `)}
                        </div>
                        $${moreConversationsExist
                          ? html`
                              <hr class="separator" />

                              <div
                                css="${res.locals.css(css`
                                  display: flex;
                                  justify-content: center;
                                `)}"
                              >
                                <a
                                  href="${qs.stringify(
                                    {
                                      conversations: {
                                        ...req.query.conversations,
                                        conversationsPage:
                                          conversationsPage + 1,
                                      },
                                      messages: req.query.messages,
                                      newConversation:
                                        req.query.newConversation,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    }
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
            key="layout--conversation--main--${req.path}"
            css="${res.locals.css(css`
              overflow: auto;
              flex: 1;
              ${sidebarOnSmallScreen
                ? css`
                    @media (max-width: 899px) {
                      display: none;
                    }
                  `
                : css``}
            `)}"
          >
            <div
              css="${res.locals.css(css`
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
                ${mainIsAScrollingPane
                  ? css`
                      height: 100%;
                      display: flex;
                    `
                  : css`
                      margin: var(--space--4);
                      @media (min-width: 900px) {
                        margin-left: var(--space--8);
                      }
                    `}
              `)}"
            >
              $${mainIsAScrollingPane
                ? body
                : html`
                    <div
                      css="${res.locals.css(css`
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                        @media (max-width: 899px) {
                          flex: 1;
                        }
                      `)}"
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

  app.locals.partials.conversation = ({
    req,
    res,
    conversation,
    searchResult = undefined,
    message = undefined,
  }) => html`
    <div
      key="partial--conversation--${conversation.reference}"
      css="${res.locals.css(css`
        display: flex;
        flex-direction: column;
        gap: var(--space--1);
      `)}"
    >
      <div
        css="${res.locals.css(css`
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
        `)}"
      >
        <div
          class="${conversation.type === "question" &&
          conversation.resolvedAt !== null
            ? "text--emerald"
            : conversationTypeTextColor[conversation.type]}"
        >
          $${conversationTypeIcon[conversation.type].fill}
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
        $${conversation.pinnedAt !== null
          ? html`
              <div
                class="text--amber"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: "Pinned conversations are listed first.",
                  });
                `}"
              >
                <i class="bi bi-pin-fill"></i>
                Pinned
              </div>
            `
          : html``}
        $${conversation.staffOnlyAt !== null
          ? html`
              <div class="text--sky">
                <i class="bi bi-mortarboard-fill"></i>
                Visible by Staff Only
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
        css="${res.locals.css(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
        `)}"
      >
        $${app.locals.partials.user({
          req,
          res,
          enrollment: conversation.authorEnrollment,
          anonymous:
            conversation.anonymousAt === null
              ? false
              : res.locals.enrollment.courseRole === "staff" ||
                (conversation.authorEnrollment !== "no-longer-enrolled" &&
                  conversation.authorEnrollment.id === res.locals.enrollment.id)
              ? "reveal"
              : true,
          size: "xs",
        })}
      </div>

      <div
        class="secondary"
        css="${res.locals.css(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--3);
          row-gap: var(--space--0-5);
        `)}"
      >
        <div
          onload="${javascript`
          (this.tooltip ??= tippy(this)).setProps({
            touch: false,
            content: "Conversation Reference",
          });
        `}"
        >
          #${conversation.reference}
        </div>

        <time
          datetime="${new Date(conversation.createdAt).toISOString()}"
          onload="${javascript`
            leafac.relativizeDateTimeElement(this, { capitalize: true });
          `}"
        ></time>

        $${conversation.updatedAt !== null
          ? html`
              <div>
                Updated
                <time
                  datetime="${new Date(conversation.updatedAt).toISOString()}"
                  onload="${javascript`
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
              css="${res.locals.css(css`
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
              `)}"
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
                            onload="${javascript`
                              (this.tooltip ??= tippy(this)).setProps({
                                touch: false,
                                content: "This tag is visible by staff only.",
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
                $${app.locals.partials.user({
                  req,
                  res,
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
                $${app.locals.partials.user({
                  req,
                  res,
                  enrollment: searchResult.message.authorEnrollment,
                  anonymous:
                    searchResult.message.anonymousAt === null
                      ? false
                      : res.locals.enrollment.courseRole === "staff" ||
                        (searchResult.message.authorEnrollment !==
                          "no-longer-enrolled" &&
                          searchResult.message.authorEnrollment.id ===
                            res.locals.enrollment.id)
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
                $${app.locals.partials.user({
                  req,
                  res,
                  enrollment: message.authorEnrollment,
                  anonymous:
                    message.anonymousAt === null
                      ? false
                      : res.locals.enrollment.courseRole === "staff" ||
                        (message.authorEnrollment !== "no-longer-enrolled" &&
                          message.authorEnrollment.id ===
                            res.locals.enrollment.id)
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

  app.locals.helpers.getConversation = ({
    req,
    res,
    conversationReference,
  }) => {
    const conversationRow = app.locals.database.get<{
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
      type: ConversationType;
      resolvedAt: string | null;
      pinnedAt: string | null;
      staffOnlyAt: string | null;
      title: string;
      titleSearch: string;
      nextMessageReference: number;
    }>(
      sql`
        SELECT "conversations"."id",
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
               "conversations"."anonymousAt",
               "conversations"."type",
               "conversations"."resolvedAt",
               "conversations"."pinnedAt",
               "conversations"."staffOnlyAt",
               "conversations"."title",
               "conversations"."titleSearch",
               "conversations"."nextMessageReference"
        FROM "conversations"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "conversations"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        $${
          res.locals.enrollment.courseRole !== "staff"
            ? sql`
                LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation" AND
                                        "messages"."authorEnrollment" = ${res.locals.enrollment.id}
              `
            : sql``
        }
        WHERE "conversations"."course" = ${res.locals.course.id} AND
              "conversations"."reference" = ${conversationReference}
              $${
                res.locals.enrollment.courseRole !== "staff"
                  ? sql`
                      AND (
                        "conversations"."staffOnlyAt" IS NULL OR
                        "messages"."id" IS NOT NULL
                      )
                    `
                  : sql``
              }
        GROUP BY "conversations"."id"
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
      anonymousAt: conversationRow.anonymousAt,
      type: conversationRow.type,
      resolvedAt: conversationRow.resolvedAt,
      pinnedAt: conversationRow.pinnedAt,
      staffOnlyAt: conversationRow.staffOnlyAt,
      title: conversationRow.title,
      titleSearch: conversationRow.titleSearch,
      nextMessageReference: conversationRow.nextMessageReference,
    };

    const taggings = app.locals.database
      .all<{
        id: number;
        tagId: number;
        tagReference: string;
        tagName: string;
        tagStaffOnlyAt: string | null;
      }>(
        sql`
          SELECT "taggings"."id",
                 "tags"."id" AS "tagId",
                 "tags"."reference" AS "tagReference",
                 "tags"."name" AS "tagName",
                 "tags"."staffOnlyAt" AS "tagStaffOnlyAt"
          FROM "taggings"
          JOIN "tags" ON "taggings"."tag" = "tags"."id"
          $${
            res.locals.enrollment.courseRole === "student"
              ? sql`AND "tags"."staffOnlyAt" IS NULL`
              : sql``
          }
          WHERE "taggings"."conversation" = ${conversation.id}
          ORDER BY "tags"."id" ASC
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

    const messagesCount = app.locals.database.get<{
      messagesCount: number;
    }>(
      sql`SELECT COUNT(*) AS "messagesCount" FROM "messages" WHERE "messages"."conversation" = ${conversation.id}`
    )!.messagesCount;

    const readingsCount = app.locals.database.get<{ readingsCount: number }>(
      sql`
        SELECT COUNT(*) AS "readingsCount"
        FROM "readings"
        JOIN "messages" ON "readings"."message" = "messages"."id" AND
                           "messages"."conversation" = ${conversation.id}
        WHERE "readings"."enrollment" = ${res.locals.enrollment.id}
      `
    )!.readingsCount;

    const endorsements =
      conversation.type === "question"
        ? app.locals.database
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
                JOIN "messages" ON "endorsements"."message" = "messages"."id" AND
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
      taggings,
      messagesCount,
      readingsCount,
      endorsements,
    };
  };

  app.post<
    { courseReference: string },
    any,
    {},
    { redirect?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/mark-all-conversations-as-read",
    (req, res, next) => {
      res.locals.actionAllowedOnArchivedCourse = true;
      next();
    },
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      const messages = app.locals.database.all<{ id: number }>(
        sql`
          SELECT "messages"."id"
          FROM "messages"
          JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                  "conversations"."course" = ${
                                    res.locals.course.id
                                  }
          LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                  "readings"."enrollment" = ${
                                    res.locals.enrollment.id
                                  }
          WHERE "readings"."id" IS NULL
                $${
                  res.locals.enrollment.courseRole === "staff"
                    ? sql``
                    : sql`
                        AND "conversations"."staffOnlyAt" IS NULL OR
                        EXISTS(
                          SELECT TRUE
                          FROM "messages"
                          WHERE "messages"."authorEnrollment" = ${res.locals.enrollment.id} AND
                                "messages"."conversation" = "conversations"."id"
                        )
                      `
                }
          ORDER BY "messages"."id" ASC
        `
      );
      for (const message of messages)
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
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    }
  );

  app.get<
    { courseReference: string; type?: ConversationType },
    HTML,
    {},
    {
      conversations?: object;
      newConversation?: {
        conversationDraftReference?: string;
        type?: string;
        shouldNotify?: "true";
        isPinned?: "true";
        isStaffOnly?: "true";
        title?: string;
        content?: string;
        tagsReferences?: string[];
      };
    },
    IsEnrolledInCourseMiddlewareLocals & LiveUpdatesMiddlewareLocals
  >(
    `/courses/:courseReference/conversations/new(/:type(${conversationTypes.join(
      "|"
    )}))?`,
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.liveUpdates,
    (req, res) => {
      const conversationDraft =
        typeof req.query.newConversation?.conversationDraftReference ===
          "string" &&
        req.query.newConversation.conversationDraftReference.match(/^[0-9]+$/)
          ? app.locals.database.get<{
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
                SELECT "createdAt",
                       "updatedAt",
                       "reference",
                       "type",
                       "isPinned",
                       "isStaffOnly",
                       "title",
                       "content",
                       "tagsReferences"
                FROM "conversationDrafts"
                WHERE "course" = ${res.locals.course.id} AND
                      "reference" = ${req.query.newConversation.conversationDraftReference} AND
                      "authorEnrollment" = ${res.locals.enrollment.id}
              `
            )
          : undefined;

      res.send(
        (res.locals.conversationsCount === 0
          ? app.locals.layouts.main
          : app.locals.layouts.conversation)({
          req,
          res,
          head: html`
            <title>
              ${req.params.type === "note"
                ? `Post ${
                    res.locals.conversationsCount === 0 ? "the First" : "a New"
                  } Note`
                : req.params.type === "question"
                ? `Ask ${
                    res.locals.conversationsCount === 0 ? "the First" : "a New"
                  } Question`
                : req.params.type === "chat"
                ? `Start ${
                    res.locals.conversationsCount === 0 ? "the First" : "a New"
                  } Chat`
                : `Start ${
                    res.locals.conversationsCount === 0 ? "the First" : "a New"
                  } Conversation`}
              · ${res.locals.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              $${req.params.type === "note"
                ? html`
                    $${conversationTypeIcon.note.fill} Post
                    ${res.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Note
                  `
                : req.params.type === "question"
                ? html`
                    $${conversationTypeIcon.question.fill} Ask
                    ${res.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Question
                  `
                : req.params.type === "chat"
                ? html`
                    $${conversationTypeIcon.chat.fill} Start
                    ${res.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Chat
                  `
                : html`
                    <i class="bi bi-chat-text-fill"></i>
                    Start
                    ${res.locals.conversationsCount === 0
                      ? "the First"
                      : "a New"}
                    Conversation
                  `}
            </h2>

            <form
              method="POST"
              action="https://${app.locals.options.host}/courses/${res.locals
                .course.reference}/conversations${qs.stringify(
                { conversations: req.query.conversations },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />

              <div
                class="label"
                $${typeof req.params.type === "string" &&
                conversationTypes.includes(req.params.type)
                  ? html`hidden`
                  : html``}
              >
                <p class="label--text">Type</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--2);
                  `)}"
                >
                  $${conversationTypes.map(
                    (conversationType) => html`
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          type="radio"
                          name="type"
                          value="${conversationType}"
                          required
                          $${req.params.type === conversationType ||
                          (req.params.type === undefined &&
                            (conversationDraft?.type === conversationType ||
                              (conversationDraft === undefined &&
                                req.query.newConversation?.type ===
                                  conversationType)))
                            ? html`checked`
                            : html``}
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          onload="${javascript`
                            this.onchange = () => {
                              const form = this.closest("form");
                              for (const element of [form.querySelector('[name="content"]'), ...form.querySelectorAll('[name="tagsReferences[]"]')])
                                element.required = ${JSON.stringify(
                                  conversationType !== "chat"
                                )};

                              ${
                                res.locals.enrollment.courseRole === "staff"
                                  ? javascript`
                                      const notification = form.querySelector('[key="new-conversation--notification"]');
                                      notification.hidden = ${JSON.stringify(
                                        conversationType !== "note"
                                      )};
                                      for (const element of leafac.descendants(notification))
                                        if (element.disabled !== undefined)
                                          element.disabled = ${JSON.stringify(
                                            conversationType !== "note"
                                          )};
                                    `
                                  : javascript``
                              }
                            };
                          `}"
                        />
                        <span>
                          $${conversationTypeIcon[conversationType].regular}
                          $${lodash.capitalize(conversationType)}
                        </span>
                        <span
                          class="${conversationTypeTextColor[conversationType]}"
                        >
                          $${conversationTypeIcon[conversationType].fill}
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
                    typeof req.query.newConversation?.title === "string" &&
                    req.query.newConversation.title.trim() !== ""
                  ? html`value="${req.query.newConversation.title}"`
                  : html``}
                placeholder="Title…"
                autocomplete="off"
                $${conversationDraft === undefined ? html`autofocus` : html``}
                class="input--text"
              />

              $${app.locals.partials.contentEditor({
                req,
                res,
                contentSource:
                  typeof conversationDraft?.content === "string" &&
                  conversationDraft.content.trim() !== ""
                    ? conversationDraft.content
                    : conversationDraft === undefined &&
                      typeof req.query.newConversation?.content === "string" &&
                      req.query.newConversation.content.trim() !== ""
                    ? req.query.newConversation.content
                    : undefined,
                // TODO: Drafts
                required:
                  (typeof req.params.type === "string" &&
                    ["question", "note"].includes(req.params.type)) ||
                  (req.params.type === undefined &&
                    ((typeof req.query.newConversation?.type === "string" &&
                      ["question", "note"].includes(
                        req.query.newConversation.type
                      )) ||
                      req.query.newConversation?.type === undefined)),
              })}
              $${res.locals.tags.length === 0 &&
              res.locals.enrollment.courseRole !== "staff"
                ? html``
                : html`
                    <div class="label">
                      <div class="label--text">
                        Tags
                        <button
                          type="button"
                          class="button button--tight button--tight--inline button--transparent"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              trigger: "click",
                              content: "Tags help to organize conversations.",
                            });
                          `}"
                        >
                          <i class="bi bi-info-circle"></i>
                        </button>
                        $${res.locals.tags.length > 0 &&
                        res.locals.enrollment.courseRole === "staff"
                          ? html`
                              <div
                                css="${res.locals.css(css`
                                  flex: 1;
                                  display: flex;
                                  justify-content: flex-end;
                                `)}"
                              >
                                <a
                                  href="https://${app.locals.options
                                    .host}/courses/${res.locals.course
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
                        css="${res.locals.css(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        $${res.locals.tags.length === 0 &&
                        res.locals.enrollment.courseRole === "staff"
                          ? html`
                              <a
                                href="https://${app.locals.options
                                  .host}/courses/${res.locals.course
                                  .reference}/settings/tags"
                                target="_blank"
                                class="button button--tight button--tight--inline button--inline button--transparent secondary"
                              >
                                <i class="bi bi-sliders"></i>
                                Create the First Tag
                              </a>
                            `
                          : res.locals.tags.map(
                              (tag) => html`
                                <div
                                  key="tag--${tag.reference}"
                                  css="${res.locals.css(css`
                                    display: flex;
                                    gap: var(--space--2);
                                  `)}"
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
                                          req.query.newConversation
                                            ?.tagsReferences
                                        ) &&
                                        req.query.newConversation!.tagsReferences.includes(
                                          tag.reference
                                        ))
                                        ? html`checked`
                                        : html``}
                                      $${
                                        // TODO: Drafts
                                        (typeof req.params.type === "string" &&
                                          ["question", "note"].includes(
                                            req.params.type
                                          )) ||
                                        (req.params.type === undefined &&
                                          ((typeof req.query.newConversation
                                            ?.type === "string" &&
                                            ["question", "note"].includes(
                                              req.query.newConversation.type
                                            )) ||
                                            req.query.newConversation?.type ===
                                              undefined))
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
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              touch: false,
                                              content: "This tag is visible by staff only.",
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

              <div
                css="${res.locals.css(css`
                  display: flex;
                  flex-wrap: wrap;
                  column-gap: var(--space--8);
                  row-gap: var(--space--4);
                `)}"
              >
                <div
                  class="label"
                  css="${res.locals.css(css`
                    width: var(--space--40);
                  `)}"
                >
                  <p class="label--text">Visibility</p>
                  <div
                    css="${res.locals.css(css`
                      display: flex;
                    `)}"
                  >
                    <label
                      class="button button--tight button--tight--inline button--transparent"
                    >
                      <input
                        type="checkbox"
                        name="isStaffOnly"
                        $${conversationDraft?.isStaffOnly === "true" ||
                        (conversationDraft === undefined &&
                          req.query.newConversation?.isStaffOnly === "true")
                          ? html`checked`
                          : html``}
                        class="visually-hidden input--radio-or-checkbox--multilabel"
                        onload="${javascript`
                          this.onchange = () => {
                            const anonymity = this.closest("form").querySelector('[key="anonymity"]');
                            if (anonymity === null) return;
                            anonymity.hidden = this.checked;
                            for (const element of anonymity.querySelectorAll("*"))
                              if (element.disabled !== null) element.disabled = this.checked;
                          };
                        `}"
                      />
                      <span
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            touch: false,
                            content: "Set as Visible by Staff Only",
                          });
                        `}"
                      >
                        <i class="bi bi-eye"></i>
                        Visible by Everyone
                      </span>
                      <span
                        class="text--sky"
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            touch: false,
                            content: "Set as Visible by Everyone",
                          });
                        `}"
                      >
                        <i class="bi bi-mortarboard-fill"></i>
                        Visible by Staff Only
                      </span>
                    </label>
                  </div>
                </div>

                $${res.locals.enrollment.courseRole === "staff"
                  ? html`
                      <div
                        key="new-conversation--notification"
                        $${req.params.type === "note" ||
                        (req.params.type === undefined &&
                          (conversationDraft?.type === "note" ||
                            (conversationDraft === undefined &&
                              req.query.newConversation?.type === "note")))
                          ? html``
                          : html`hidden`}
                        class="label"
                        css="${res.locals.css(css`
                          width: var(--space--28);
                        `)}"
                      >
                        <div class="label--text">Notification</div>
                        <div
                          css="${res.locals.css(css`
                            display: flex;
                          `)}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="shouldNotify"
                              $${req.params.type === "note" ||
                              (req.params.type === undefined &&
                                (conversationDraft?.type === "note" ||
                                  (conversationDraft === undefined &&
                                    req.query.newConversation?.type ===
                                      "note")))
                                ? html``
                                : html`disabled`}
                              $${(
                                conversationDraft as any
                              ) /* TODO: Conversation drafts */
                                ?.shouldNotify === "true" ||
                              (conversationDraft === undefined &&
                                req.query.newConversation?.shouldNotify ===
                                  "true")
                                ? html`checked`
                                : html``}
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Notify",
                                });
                              `}"
                            >
                              <i class="bi bi-bell-slash"></i>
                              Don’t Notify
                            </span>
                            <span
                              class="text--blue"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Don’t Notify",
                                });
                              `}"
                            >
                              <i class="bi bi-bell-fill"></i>
                              Notify
                            </span>
                          </label>
                        </div>
                      </div>

                      <div
                        class="label"
                        css="${res.locals.css(css`
                          width: var(--space--24);
                        `)}"
                      >
                        <div class="label--text">
                          Pin
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            onload="${javascript`
                              (this.tooltip ??= tippy(this)).setProps({
                                trigger: "click",
                                content: "Pinned conversations are listed first.",
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                        </div>
                        <div
                          css="${res.locals.css(css`
                            display: flex;
                          `)}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isPinned"
                              $${conversationDraft?.isPinned === "true" ||
                              (conversationDraft === undefined &&
                                req.query.newConversation?.isPinned === "true")
                                ? html`checked`
                                : html``}
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Pin",
                                });
                              `}"
                            >
                              <i class="bi bi-pin-angle"></i>
                              Unpinned
                            </span>
                            <span
                              class="text--amber"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Unpin",
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
                        key="anonymity"
                        class="label"
                        css="${res.locals.css(css`
                          width: var(--space--60);
                        `)}"
                      >
                        <p class="label--text">Anonymity</p>
                        <div
                          css="${res.locals.css(css`
                            display: flex;
                          `)}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isAnonymous"
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                              onload="${javascript`
                                this.isModified = false;

                                this.onchange = () => {
                                  localStorage.setItem("anonymity", JSON.stringify(this.checked));  
                                };
                                
                                if (JSON.parse(localStorage.getItem("anonymity") ?? "false")) this.click();
                              `}"
                            />
                            <span
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Set as Anonymous to Other Students",
                                });
                              `}"
                            >
                              <span>
                                $${app.locals.partials.user({
                                  req,
                                  res,
                                  user: res.locals.user,
                                  decorate: false,
                                  name: false,
                                  size: "xs",
                                })}
                                <span
                                  css="${res.locals.css(css`
                                    margin-left: var(--space--1);
                                  `)}"
                                >
                                  Signed by You
                                </span>
                              </span>
                            </span>
                            <span
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Set as Signed by You",
                                });
                              `}"
                            >
                              <span>
                                $${app.locals.partials.user({
                                  req,
                                  res,
                                  name: false,
                                  size: "xs",
                                })}
                                <span
                                  css="${res.locals.css(css`
                                    margin-left: var(--space--1);
                                  `)}"
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
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      touch: false,
                      content: ${res.locals.html(
                        html`
                          <span class="keyboard-shortcut">
                            <span
                              onload="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Enter</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              onload="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i
                              ><i class="bi bi-arrow-return-left"></i
                            ></span>
                          </span>
                        `
                      )},
                    });

                    const textarea = this.closest("form").querySelector(".content-editor--write--textarea");

                    (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });

                    this.onclick = () => {
                      delete this.closest("form").isValid;
                    };
                  `}"
                >
                  $${req.params.type === "note"
                    ? html`
                        $${conversationTypeIcon.note.fill} Post
                        ${res.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Note
                      `
                    : req.params.type === "question"
                    ? html`
                        $${conversationTypeIcon.question.fill} Ask
                        ${res.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Question
                      `
                    : req.params.type === "chat"
                    ? html`
                        $${conversationTypeIcon.chat.fill} Start
                        ${res.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Chat
                      `
                    : html`
                        <i class="bi bi-chat-text-fill"></i>
                        Start
                        ${res.locals.conversationsCount === 0
                          ? "the First"
                          : "a New"}
                        Conversation
                      `}
                </button>
              </div>

              <div
                hidden
                class="secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  display: flex;
                  column-gap: var(--space--8);
                  row-gap: var(--space--2);
                  flex-wrap: wrap;
                `)}"
              >
                <button
                  class="link"
                  name="isDraft"
                  value="true"
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      touch: false,
                      content: ${res.locals.html(
                        html`
                          <span class="keyboard-shortcut">
                            <span
                              onload="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+S</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              onload="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>S</span
                            >
                          </span>
                        `
                      )},
                    });

                    const textarea = this.closest("form").querySelector(".content-editor--write--textarea");

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
                        formaction="https://${app.locals.options
                          .host}/courses/${res.locals.course
                          .reference}/conversations/new${qs.stringify(
                          { conversations: req.query.conversations },
                          { addQueryPrefix: true }
                        )}"
                        onload="${javascript`
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
                          onload="${javascript`
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
                                onload="${javascript`
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

  app.post<
    { courseReference: string },
    HTML,
    {
      type?: ConversationType;
      shouldNotify?: "on";
      isPinned?: "on";
      isStaffOnly?: "on";
      title?: string;
      content?: string;
      tagsReferences?: string[];
      isAnonymous?: "on";
      isDraft?: "true";
      conversationDraftReference?: string;
    },
    { conversations?: object },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (req.body.isDraft === "true") {
        // TODO: Conversation drafts: Validate inputs
        let conversationDraft =
          typeof req.body.conversationDraftReference === "string" &&
          req.body.conversationDraftReference.match(/^[0-9]+$/)
            ? app.locals.database.get<{
                reference: string;
              }>(
                sql`
                  SELECT "reference"
                  FROM "conversationDrafts"
                  WHERE "course" = ${res.locals.course.id} AND
                        "reference" = ${req.body.conversationDraftReference} AND
                        "authorEnrollment" = ${res.locals.enrollment.id}
                `
              )
            : undefined;
        if (conversationDraft === undefined)
          conversationDraft = app.locals.database.get<{
            reference: string;
          }>(
            sql`
              INSERT INTO "conversationDrafts" (
                "createdAt",
                "course",
                "reference",
                "authorEnrollment",
                "type",
                "isPinned",
                "isStaffOnly",
                "title",
                "content",
                "tagsReferences"
              )
              VALUES (
                ${new Date().toISOString()},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${res.locals.enrollment.id},
                ${
                  typeof req.body.type === "string" &&
                  req.body.type.trim() !== ""
                    ? req.body.type
                    : null
                },
                ${req.body.isPinned === "on" ? "true" : null},
                ${req.body.isStaffOnly === "on" ? "true" : null},
                ${
                  typeof req.body.title === "string" &&
                  req.body.title.trim() !== ""
                    ? req.body.title
                    : null
                },
                ${
                  typeof req.body.content === "string" &&
                  req.body.content.trim() !== ""
                    ? req.body.content
                    : null
                },
                ${
                  Array.isArray(req.body.tagsReferences) &&
                  req.body.tagsReferences.every(
                    (tagReference) =>
                      typeof tagReference === "string" &&
                      tagReference.trim() !== ""
                  )
                    ? JSON.stringify(req.body.tagsReferences)
                    : null
                }
              )
              RETURNING *
            `
          )!;
        else
          app.locals.database.run(
            sql`
              UPDATE "conversationDrafts"
              SET "updatedAt" = ${new Date().toISOString()},
                  "type" = ${
                    typeof req.body.type === "string" &&
                    req.body.type.trim() !== ""
                      ? req.body.type
                      : null
                  },
                  "isPinned" = ${req.body.isPinned === "on" ? "true" : null},
                  "isStaffOnly" = ${
                    req.body.isStaffOnly === "on" ? "true" : null
                  },
                  "title" = ${
                    typeof req.body.title === "string" &&
                    req.body.title.trim() !== ""
                      ? req.body.title
                      : null
                  },
                  "content" = ${
                    typeof req.body.content === "string" &&
                    req.body.content.trim() !== ""
                      ? req.body.content
                      : null
                  },
                  "tagsReferences" = ${
                    Array.isArray(req.body.tagsReferences) &&
                    req.body.tagsReferences.every(
                      (tagReference) =>
                        typeof tagReference === "string" &&
                        tagReference.trim() !== ""
                    )
                      ? JSON.stringify(req.body.tagsReferences)
                      : null
                  }
              WHERE "reference" = ${conversationDraft.reference}
            `
          );
        return res.redirect(
          303,
          `https://${app.locals.options.host}/courses/${
            res.locals.course.reference
          }/conversations/new${qs.stringify(
            {
              conversations: req.query.conversations,
              newConversation: {
                conversationDraftReference: conversationDraft.reference,
              },
            },
            {
              addQueryPrefix: true,
            }
          )}`
        );
      }

      req.body.tagsReferences ??= [];
      if (
        typeof req.body.type !== "string" ||
        !conversationTypes.includes(req.body.type) ||
        ![undefined, "on"].includes(req.body.shouldNotify) ||
        (req.body.shouldNotify === "on" &&
          (res.locals.enrollment.courseRole !== "staff" ||
            req.body.type !== "note")) ||
        ![undefined, "on"].includes(req.body.isPinned) ||
        (req.body.isPinned === "on" &&
          res.locals.enrollment.courseRole !== "staff") ||
        ![undefined, "on"].includes(req.body.isStaffOnly) ||
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        (req.body.type !== "chat" &&
          (typeof req.body.content !== "string" ||
            req.body.content.trim() === "")) ||
        (req.body.type === "chat" &&
          req.body.content !== undefined &&
          typeof req.body.content !== "string") ||
        !Array.isArray(req.body.tagsReferences) ||
        (res.locals.tags.length > 0 &&
          ((req.body.type !== "chat" && req.body.tagsReferences.length === 0) ||
            new Set(req.body.tagsReferences).size <
              req.body.tagsReferences.length ||
            req.body.tagsReferences.some(
              (tagReference) =>
                typeof tagReference !== "string" ||
                !res.locals.tags.some(
                  (existingTag) => tagReference === existingTag.reference
                )
            ))) ||
        ![undefined, "on"].includes(req.body.isAnonymous) ||
        (req.body.isAnonymous === "on" &&
          (res.locals.enrollment.courseRole === "staff" ||
            req.body.isStaffOnly === "on"))
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            res.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      const conversationRow = app.locals.database.get<{
        id: number;
        reference: string;
        type: ConversationType;
        staffOnlyAt: string | null;
        title: string;
      }>(
        sql`
          INSERT INTO "conversations" (
            "createdAt",
            "course",
            "reference",
            "authorEnrollment",
            "anonymousAt",
            "type",
            "pinnedAt",
            "staffOnlyAt",
            "title",
            "titleSearch",
            "nextMessageReference"
          )
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.course.id},
            ${String(res.locals.course.nextConversationReference)},
            ${res.locals.enrollment.id},
            ${req.body.isAnonymous === "on" ? new Date().toISOString() : null},
            ${req.body.type},
            ${req.body.isPinned === "on" ? new Date().toISOString() : null},
            ${req.body.isStaffOnly === "on" ? new Date().toISOString() : null},
            ${req.body.title},
            ${html`${req.body.title}`},
            ${2}
          )
          RETURNING *
        `
      )!;
      for (const tagReference of req.body.tagsReferences)
        app.locals.database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${
                res.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      if (
        typeof req.body.content === "string" &&
        req.body.content.trim() !== ""
      ) {
        const processedContent = app.locals.partials.content({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        if (req.body.shouldNotify === "on")
          processedContent.mentions!.add("everyone");
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
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${"1"},
              ${res.locals.enrollment.id},
              ${
                req.body.isAnonymous === "on" ? new Date().toISOString() : null
              },
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
        const conversation = app.locals.helpers.getConversation({
          req,
          res,
          conversationReference: conversationRow.reference,
        })!;
        app.locals.mailers.notifications({
          req,
          res,
          conversation,
          message: app.locals.helpers.getMessage({
            req,
            res,
            conversation,
            messageReference: message.reference,
          })!,
          mentions: processedContent.mentions!,
        });
      }

      if (
        typeof req.body.conversationDraftReference === "string" &&
        req.body.conversationDraftReference.match(/^[0-9]+$/)
      )
        app.locals.database.run(
          sql`
            DELETE FROM "conversationDrafts"
            WHERE "course" = ${res.locals.course.id} AND
                  "reference" = ${req.body.conversationDraftReference} AND
                  "authorEnrollment" = ${res.locals.enrollment.id}
          `
        );

      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/${conversationRow.reference}${qs.stringify(
          {
            conversations: req.query.conversations,
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
    { courseReference: string },
    HTML,
    { conversationDraftReference?: string },
    { conversations?: object },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/new",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.conversationDraftReference !== "string" ||
        !req.body.conversationDraftReference.match(/^[0-9]+$/)
      )
        return next("validation");
      const conversationDraft = app.locals.database.get<{
        id: number;
      }>(
        sql`
          SELECT "id"
          FROM "conversationDrafts"
          WHERE "course" = ${res.locals.course.id} AND
                "reference" = ${req.body.conversationDraftReference} AND
                "authorEnrollment" = ${res.locals.enrollment.id}
        `
      );
      if (conversationDraft === undefined) return next("validation");
      app.locals.database.run(
        sql`
          DELETE FROM "conversationDrafts" WHERE "id" = ${conversationDraft.id}
        `
      );
      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }/conversations/new${qs.stringify(
          { conversations: req.query.conversations },
          { addQueryPrefix: true }
        )}`
      );
    }
  );

  app.locals.middlewares.isConversationAccessible = [
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      const conversation = app.locals.helpers.getConversation({
        req,
        res,
        conversationReference: req.params.conversationReference,
      });
      if (conversation === undefined) return next("route");
      res.locals.conversation = conversation;
      next();
    },
  ];

  const mayEditConversation = ({
    req,
    res,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
  }): boolean =>
    res.locals.enrollment.courseRole === "staff" ||
    (res.locals.conversation.authorEnrollment !== "no-longer-enrolled" &&
      res.locals.conversation.authorEnrollment.id === res.locals.enrollment.id);

  app.get<
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
    IsConversationAccessibleMiddlewareLocals & LiveUpdatesMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...app.locals.middlewares.isConversationAccessible,
    ...app.locals.middlewares.liveUpdates,
    (req, res) => {
      const beforeMessage =
        typeof req.query.messages?.messagesPage?.beforeMessageReference ===
          "string" &&
        req.query.messages.messagesPage.beforeMessageReference.trim() !== ""
          ? app.locals.database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE "conversation" = ${res.locals.conversation.id} AND
                      "reference" = ${req.query.messages.messagesPage.beforeMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const afterMessage =
        beforeMessage === undefined &&
        typeof req.query.messages?.messagesPage?.afterMessageReference ===
          "string" &&
        req.query.messages.messagesPage.afterMessageReference.trim() !== ""
          ? app.locals.database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE "conversation" = ${res.locals.conversation.id} AND
                      "reference" = ${req.query.messages.messagesPage.afterMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const messagesReverse =
        beforeMessage !== undefined ||
        (afterMessage === undefined && res.locals.conversation.type === "chat");

      const messagesPageSize = 999999; // TODO: Pagination: 25

      const messagesRows = app.locals.database.all<{ reference: string }>(
        sql`
          SELECT "reference"
          FROM "messages"
          WHERE "conversation" = ${res.locals.conversation.id}
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
          ORDER BY "id" $${messagesReverse ? sql`DESC` : sql`ASC`}
          LIMIT ${messagesPageSize + 1}
        `
      );
      const moreMessagesExist = messagesRows.length === messagesPageSize + 1;
      if (moreMessagesExist) messagesRows.pop();
      if (messagesReverse) messagesRows.reverse();
      const messages = messagesRows.map(
        (message) =>
          app.locals.helpers.getMessage({
            req,
            res,
            conversation: res.locals.conversation,
            messageReference: message.reference,
          })!
      );

      for (const message of messages)
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

      res.send(
        app.locals.layouts.conversation({
          req,
          res,
          head: html`
            <title>
              ${res.locals.conversation.title} · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          mainIsAScrollingPane: res.locals.conversation.type === "chat",
          body: html`
            <div
              css="${res.locals.css(css`
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: var(--space--0);
              `)}"
            >
              <div
                class="conversation--header"
                css="${res.locals.css(css`
                  padding-bottom: var(--space--2);
                  border-bottom: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                  ${res.locals.conversation.type === "chat"
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
                    : css``}
                `)}"
              >
                <div
                  css="${res.locals.css(css`
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                          display: flex;
                          & > * {
                            flex: 1;
                          }
                        `
                      : css``}
                  `)}"
                >
                  $${res.locals.conversation.type === "chat"
                    ? html`
                        <button
                          class="conversation--header--compact button button--tight button--tight--inline button--transparent strong"
                          css="${res.locals.css(css`
                            max-width: calc(100% + var(--space--2));
                            margin-top: var(--space---2);
                          `)}"
                          onload="${javascript`
                            this.onclick = () => {
                              this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = true;
                              this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = false;
                            };
                          `}"
                        >
                          <span
                            css="${res.locals.css(css`
                              flex: 1;
                              text-align: left;
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `)}"
                          >
                            $${app.locals.helpers.highlightSearchResult(
                              html`${res.locals.conversation.title}`,
                              typeof req.query.conversations?.search ===
                                "string" &&
                                req.query.conversations.search.trim() !== ""
                                ? req.query.conversations.search
                                : undefined
                            )}
                          </span>
                          <i class="bi bi-chevron-bar-expand"></i>
                        </button>
                      `
                    : html``}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                    class="conversation--header--full"
                    css="${res.locals.css(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--1);
                    `)}"
                  >
                    <div
                      css="${res.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `)}"
                    >
                      <div
                        css="${res.locals.css(css`
                          flex: 1;
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--1);

                          & > * {
                            display: flex;
                            gap: var(--space--1);
                          }
                        `)}"
                      >
                        $${mayEditConversation({ req, res })
                          ? html`
                              <div>
                                <button
                                  class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                    .locals.conversation.type === "question" &&
                                  res.locals.conversation.resolvedAt !== null
                                    ? "text--emerald"
                                    : conversationTypeTextColor[
                                        res.locals.conversation.type
                                      ]}"
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Update Conversation Type",
                                    });
                                    
                                    (this.dropdown ??= tippy(this)).setProps({
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.html(
                                        html`
                                          <div class="dropdown--menu">
                                            $${conversationTypes.map(
                                              (conversationType) => html`
                                                <form
                                                  key="conversation-type--${conversationType}"
                                                  method="PATCH"
                                                  action="https://${app.locals
                                                    .options.host}/courses/${res
                                                    .locals.course
                                                    .reference}/conversations/${res
                                                    .locals.conversation
                                                    .reference}${qs.stringify(
                                                    {
                                                      conversations:
                                                        req.query.conversations,
                                                      messages:
                                                        req.query.messages,
                                                    },
                                                    {
                                                      addQueryPrefix: true,
                                                    }
                                                  )}"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="_csrf"
                                                    value="${req.csrfToken()}"
                                                  />
                                                  <input
                                                    type="hidden"
                                                    name="type"
                                                    value="${conversationType}"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button ${conversationType ===
                                                    res.locals.conversation.type
                                                      ? "button--blue"
                                                      : "button--transparent"} ${conversationTypeTextColor[
                                                      conversationType
                                                    ]}"
                                                  >
                                                    $${conversationTypeIcon[
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
                                        `
                                      )},
                                    });
                                  `}"
                                >
                                  $${conversationTypeIcon[
                                    res.locals.conversation.type
                                  ].fill}
                                  $${lodash.capitalize(
                                    res.locals.conversation.type
                                  )}
                                </button>
                              </div>
                            `
                          : html`
                              <div
                                class="${res.locals.conversation.type ===
                                  "question" &&
                                res.locals.conversation.resolvedAt !== null
                                  ? "text--emerald"
                                  : conversationTypeTextColor[
                                      res.locals.conversation.type
                                    ]}"
                              >
                                $${conversationTypeIcon[
                                  res.locals.conversation.type
                                ].fill}
                                $${lodash.capitalize(
                                  res.locals.conversation.type
                                )}
                              </div>
                            `}
                        $${res.locals.conversation.type === "question"
                          ? html`
                              $${res.locals.enrollment.courseRole === "staff"
                                ? html`
                                    <form
                                      method="PATCH"
                                      action="https://${app.locals.options
                                        .host}/courses/${res.locals.course
                                        .reference}/conversations/${res.locals
                                        .conversation.reference}${qs.stringify(
                                        {
                                          conversations:
                                            req.query.conversations,
                                          messages: req.query.messages,
                                        },
                                        {
                                          addQueryPrefix: true,
                                        }
                                      )}"
                                    >
                                      <input
                                        type="hidden"
                                        name="_csrf"
                                        value="${req.csrfToken()}"
                                      />
                                      $${res.locals.conversation.resolvedAt ===
                                      null
                                        ? html`
                                            <input
                                              key="isResolved--true"
                                              type="hidden"
                                              name="isResolved"
                                              value="true"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--rose"
                                              onload="${javascript`
                                                (this.tooltip ??= tippy(this)).setProps({
                                                  touch: false,
                                                  content: "Set as Resolved",
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
                                              onload="${javascript`
                                                (this.tooltip ??= tippy(this)).setProps({
                                                  touch: false,
                                                  content: "Set as Unresolved",
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
                                : res.locals.conversation.resolvedAt === null
                                ? html`
                                    <div
                                      class="text--rose"
                                      css="${res.locals.css(css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `)}"
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
                                      css="${res.locals.css(css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `)}"
                                    >
                                      <i class="bi bi-patch-check-fill"></i>
                                      Resolved
                                    </div>
                                  `}
                            `
                          : html``}
                        $${res.locals.enrollment.courseRole === "staff"
                          ? html`
                              <form
                                method="PATCH"
                                action="https://${app.locals.options
                                  .host}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation.reference}${qs.stringify(
                                  {
                                    conversations: req.query.conversations,
                                    messages: req.query.messages,
                                  },
                                  {
                                    addQueryPrefix: true,
                                  }
                                )}"
                              >
                                <input
                                  type="hidden"
                                  name="_csrf"
                                  value="${req.csrfToken()}"
                                />
                                $${res.locals.conversation.pinnedAt === null
                                  ? html`
                                      <input
                                        key="isPinned--true"
                                        type="hidden"
                                        name="isPinned"
                                        value="true"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        onload="${javascript`
                                          (this.tooltip ??= tippy(this)).setProps({
                                            touch: false,
                                            content: "Pin",
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
                                        onload="${javascript`
                                          (this.tooltip ??= tippy(this)).setProps({
                                            touch: false,
                                            content: "Unpin",
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-fill"></i>
                                        Pinned
                                      </button>
                                    `}
                              </form>
                            `
                          : res.locals.conversation.pinnedAt !== null
                          ? html`
                              <div class="text--amber">
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </div>
                            `
                          : html``}
                        $${res.locals.enrollment.courseRole === "staff"
                          ? html`
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                  .locals.conversation.staffOnlyAt === null
                                  ? ""
                                  : "text--sky"}"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Set as ${
                                      res.locals.conversation.staffOnlyAt ===
                                      null
                                        ? "Visible by Staff Only"
                                        : "Visible by Everyone"
                                    }",
                                  });
                                  
                                  (this.dropdown ??= tippy(this)).setProps({
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.html(
                                      html`
                                        <form
                                          method="PATCH"
                                          action="https://${app.locals.options
                                            .host}/courses/${res.locals.course
                                            .reference}/conversations/${res
                                            .locals.conversation
                                            .reference}${qs.stringify(
                                            {
                                              conversations:
                                                req.query.conversations,
                                              messages: req.query.messages,
                                            },
                                            {
                                              addQueryPrefix: true,
                                            }
                                          )}"
                                          css="${res.locals.css(css`
                                            padding: var(--space--2);
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--4);
                                          `)}"
                                        >
                                          <input
                                            type="hidden"
                                            name="_csrf"
                                            value="${req.csrfToken()}"
                                          />
                                          $${res.locals.conversation
                                            .staffOnlyAt === null
                                            ? html`
                                                <input
                                                  key="isStaffOnly--true"
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="true"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Staff Only?
                                                </p>
                                                <p>
                                                  <strong
                                                    css="${res.locals.css(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Students who already
                                                    participated in the
                                                    conversation will continue
                                                    to have access to it.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i
                                                    class="bi bi-mortarboard-fill"
                                                  ></i>
                                                  Set as Visible by Staff Only
                                                </button>
                                              `
                                            : html`
                                                <input
                                                  key="isStaffOnly--false"
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="false"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Everyone?
                                                </p>
                                                <p>
                                                  <strong
                                                    css="${res.locals.css(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Ensure that people involved
                                                    in the conversation consent
                                                    to having their messages
                                                    visible by everyone.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i class="bi bi-eye-fill"></i>
                                                  Set as Visible by Everyone
                                                </button>
                                              `}
                                        </form>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                $${res.locals.conversation.staffOnlyAt === null
                                  ? html`
                                      <i class="bi bi-eye"></i>
                                      Visible by Everyone
                                    `
                                  : html`
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Visible by Staff Only
                                    `}
                              </button>
                            `
                          : res.locals.conversation.staffOnlyAt !== null
                          ? html`
                              <div
                                class="text--sky"
                                css="${res.locals.css(css`
                                  display: flex;
                                  gap: var(--space--1);
                                `)}"
                              >
                                <i class="bi bi-mortarboard-fill"></i>
                                Visible by Staff Only
                              </div>
                            `
                          : html``}
                      </div>

                      <div>
                        <button
                          class="button button--tight button--tight--inline button--transparent secondary"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Actions",
                            });
                            
                            (this.dropdown ??= tippy(this)).setProps({
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.html(
                                html`
                                  <h3 class="heading">
                                    <i class="bi bi-chat-text-fill"></i>
                                    Conversation
                                    #${res.locals.conversation.reference}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                      onload="${javascript`
                                        (this.copied ??= tippy(this)).setProps({
                                          theme: "green",
                                          trigger: "manual",
                                          content: "Copied",
                                        });

                                        this.onclick = async () => {
                                          await navigator.clipboard.writeText("https://${app.locals.options.host}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}");
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
                                      req,
                                      res,
                                    })
                                      ? html`
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            onload="${javascript`
                                              this.onclick = () => {
                                                this.closest(".conversation--header--full").querySelector(".title--show").hidden = true;
                                                this.closest(".conversation--header--full").querySelector(".title--edit").hidden = false;
                                                tippy.hideAll();
                                              };
                                            `}"
                                          >
                                            <i class="bi bi-pencil"></i>
                                            Edit Conversation Title
                                          </button>
                                        `
                                      : html``}
                                    $${res.locals.enrollment.courseRole ===
                                    "staff"
                                      ? html`
                                          <div>
                                            <button
                                              class="dropdown--menu--item button button--transparent"
                                              onload="${javascript`
                                                (this.dropdown ??= tippy(this)).setProps({
                                                  theme: "rose",
                                                  trigger: "click",
                                                  interactive: true,
                                                  content: ${res.locals.html(
                                                    html`
                                                      <form
                                                        method="DELETE"
                                                        action="https://${app
                                                          .locals.options
                                                          .host}/courses/${res
                                                          .locals.course
                                                          .reference}/conversations/${res
                                                          .locals.conversation
                                                          .reference}${qs.stringify(
                                                          {
                                                            conversations:
                                                              req.query
                                                                .conversations,
                                                          },
                                                          {
                                                            addQueryPrefix:
                                                              true,
                                                          }
                                                        )}"
                                                        css="${res.locals
                                                          .css(css`
                                                          padding: var(
                                                            --space--2
                                                          );
                                                          display: flex;
                                                          flex-direction: column;
                                                          gap: var(--space--4);
                                                        `)}"
                                                      >
                                                        <input
                                                          type="hidden"
                                                          name="_csrf"
                                                          value="${req.csrfToken()}"
                                                        />
                                                        <p>
                                                          Are you sure you want
                                                          to remove this
                                                          conversation?
                                                        </p>
                                                        <p>
                                                          <strong
                                                            css="${res.locals
                                                              .css(css`
                                                              font-weight: var(
                                                                --font-weight--bold
                                                              );
                                                            `)}"
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
                                                    `
                                                  )},
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
                                `
                              )},
                            });
                          `}"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>

                    <h2
                      class="title--show strong"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--lg);
                        line-height: var(--line-height--lg);
                      `)}"
                    >
                      $${app.locals.helpers.highlightSearchResult(
                        html`${res.locals.conversation.title}`,
                        typeof req.query.conversations?.search === "string" &&
                          req.query.conversations.search.trim() !== ""
                          ? req.query.conversations.search
                          : undefined
                      )}
                    </h2>

                    $${mayEditConversation({ req, res })
                      ? html`
                          <form
                            method="PATCH"
                            action="https://${app.locals.options
                              .host}/courses/${res.locals.course
                              .reference}/conversations/${res.locals
                              .conversation.reference}${qs.stringify(
                              {
                                conversations: req.query.conversations,
                                messages: req.query.messages,
                              },
                              {
                                addQueryPrefix: true,
                              }
                            )}"
                            novalidate
                            hidden
                            class="title--edit"
                            css="${res.locals.css(css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: center;
                            `)}"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <input
                              type="text"
                              name="title"
                              value="${res.locals.conversation.title}"
                              required
                              autocomplete="off"
                              class="input--text"
                            />
                            <button
                              class="button button--tight button--tight--inline button--transparent text--green"
                              css="${res.locals.css(css`
                                flex: 1;
                              `)}"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  theme: "green",
                                  touch: false,
                                  content: "Update Title",
                                });
                              `}"
                            >
                              <i class="bi bi-check-lg"></i>
                            </button>
                            <button
                              type="reset"
                              class="button button--tight button--tight--inline button--transparent text--rose"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  theme: "rose",
                                  touch: false,
                                  content: ${res.locals.html(
                                    html`
                                      Cancel
                                      <span class="keyboard-shortcut">
                                        (<span
                                          onload="${javascript`
                                            this.hidden = leafac.isAppleDevice;
                                          `}"
                                          >Esc</span
                                        ><span
                                          class="keyboard-shortcut--cluster"
                                          onload="${javascript`
                                            this.hidden = !leafac.isAppleDevice;
                                          `}"
                                          ><i class="bi bi-escape"></i></span
                                        >)
                                      </span>
                                    `
                                  )},
                                });
                                      
                                this.onclick = () => {
                                  this.closest(".conversation--header--full").querySelector(".title--show").hidden = false;
                                  this.closest(".conversation--header--full").querySelector(".title--edit").hidden = true;
                                };

                                const input = this.closest(".title--edit").querySelector('[name="title"]');

                                (input.mousetrap ??= new Mousetrap(input)).bind("escape", () => { this.click(); return false; });
                              `}"
                            >
                              <i class="bi bi-x-lg"></i>
                            </button>
                          </form>
                        `
                      : html``}
                    $${(() => {
                      let tags = html``;

                      for (const tagging of res.locals.conversation.taggings)
                        if (!mayEditConversation({ req, res }))
                          tags += html`
                            $${res.locals.conversation.taggings.map(
                              (tagging) => html`
                                <div class="text--teal">
                                  <i class="bi bi-tag-fill"></i>
                                  ${tagging.tag.name}
                                </div>
                              `
                            )}
                          `;
                        else if (res.locals.conversation.taggings.length === 1)
                          tags += html`
                            <div
                              css="${res.locals.css(css`
                                display: flex;
                                gap: var(--space--2);
                              `)}"
                            >
                              <span
                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal disabled"
                                css="${res.locals.css(css`
                                  color: var(--color--teal--600);
                                  @media (prefers-color-scheme: dark) {
                                    color: var(--color--teal--500);
                                  }
                                  text-align: left;
                                `)}"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    theme: "rose",
                                    touch: false,
                                    content: "You may not remove this tag because a conversation must have at least one tag.",
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
                                      onload="${javascript`
                                        (this.tooltip ??= tippy(this)).setProps({
                                          content: "This tag is visible by staff only.",
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
                              action="https://${app.locals.options
                                .host}/courses/${res.locals.course
                                .reference}/conversations/${res.locals
                                .conversation.reference}/taggings${qs.stringify(
                                {
                                  conversations: req.query.conversations,
                                  messages: req.query.messages,
                                },
                                { addQueryPrefix: true }
                              )}"
                              css="${res.locals.css(css`
                                display: flex;
                                gap: var(--space--2);
                              `)}"
                            >
                              <input
                                type="hidden"
                                name="_csrf"
                                value="${req.csrfToken()}"
                              />
                              <input
                                type="hidden"
                                name="reference"
                                value="${tagging.tag.reference}"
                              />
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal"
                                css="${res.locals.css(css`
                                  text-align: left;
                                `)}"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    theme: "rose",
                                    touch: false,
                                    content: "Remove Tag",
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
                                      onload="${javascript`
                                        (this.tooltip ??= tippy(this)).setProps({
                                          content: "This tag is visible by staff only.",
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
                        res.locals.enrollment.courseRole === "staff" ||
                        (mayEditConversation({ req, res }) &&
                          res.locals.tags.length > 0)
                      )
                        tags += html`
                          <div>
                            <button
                              class="button button--tight button--tight--inline button--transparent text--teal"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  touch: false,
                                  content: "Add Tag",
                                });
                                
                                (this.dropdown ??= tippy(this)).setProps({
                                  trigger: "click",
                                  interactive: true,
                                  content: ${res.locals.html(
                                    html`
                                      <div
                                        css="${res.locals.css(css`
                                          max-height: var(--space--40);
                                          overflow: auto;
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `)}"
                                      >
                                        $${res.locals.enrollment.courseRole ===
                                        "staff"
                                          ? html`
                                              <div class="dropdown--menu">
                                                <a
                                                  href="https://${app.locals
                                                    .options.host}/courses/${res
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
                                          $${res.locals.tags.map((tag) => {
                                            const isTagging =
                                              res.locals.conversation.taggings.some(
                                                (tagging) =>
                                                  tagging.tag.id === tag.id
                                              );
                                            return html`
                                              <form
                                                key="tag--${tag.reference}"
                                                method="${isTagging
                                                  ? "DELETE"
                                                  : "POST"}"
                                                action="https://${app.locals
                                                  .options.host}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/taggings${qs.stringify(
                                                  {
                                                    conversations:
                                                      req.query.conversations,
                                                    messages:
                                                      req.query.messages,
                                                  },
                                                  {
                                                    addQueryPrefix: true,
                                                  }
                                                )}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                <input
                                                  type="hidden"
                                                  name="reference"
                                                  value="${tag.reference}"
                                                />
                                                <button
                                                  class="dropdown--menu--item button ${isTagging
                                                    ? "button--blue"
                                                    : "button--transparent"} text--teal"
                                                >
                                                  <i class="bi bi-tag-fill"></i>
                                                  ${tag.name}
                                                  $${tag.staffOnlyAt !== null
                                                    ? html`
                                                        <span
                                                          class="text--sky"
                                                          onload="${javascript`
                                                            (this.tooltip ??= tippy(this)).setProps({
                                                              touch: false,
                                                              content: "This tag is visible by staff only.",
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
                                            `;
                                          })}
                                        </div>
                                      </div>
                                    `
                                  )},
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
                              css="${res.locals.css(css`
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
                              `)}"
                            >
                              $${tags}
                            </div>
                          `
                        : html``;
                    })()}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            onload="${javascript`
                              this.onclick = () => {
                                this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = true;
                                this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = false;
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
                    css="${res.locals.css(css`
                      ${res.locals.conversation.type === "chat"
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
                        : css``}
                    `)}"
                    onload="${javascript`
                      window.setTimeout(() => {
                        if (event?.detail?.previousLocation?.pathname !== window.location.pathname) {
                          ${
                            typeof req.query.messages?.messageReference ===
                              "string" &&
                            req.query.messages.messageReference.trim() !== ""
                              ? javascript`
                                  const element = this.querySelector('[key="message--${req.query.messages.messageReference}"]');
                                  if (element === null) return;
                                  element.scrollIntoView();
                                  element.querySelector(".message--highlight").style.animation = "message--highlight 2s var(--transition-timing-function--in-out)";
                                `
                              : firstUnreadMessage !== undefined &&
                                firstUnreadMessage !== messages[0]
                              ? javascript`
                                  this.querySelector('[key="message--${firstUnreadMessage.reference}"]')?.scrollIntoView();
                                `
                              : res.locals.conversation.type === "chat" &&
                                messages.length > 0 &&
                                afterMessage === undefined
                              ? javascript`
                                  this.scroll(0, this.scrollHeight);
                                `
                              : javascript``
                          }
                        }
                        ${
                          res.locals.conversation.type === "chat"
                            ? javascript`
                                else if (this.shouldScrollConversationToBottom) {
                                  this.scroll(0, this.scrollHeight);
                                }
                                
                                this.onscroll = () => {
                                  this.shouldScrollConversationToBottom = this.scrollTop === this.scrollHeight - this.offsetHeight;
                                };
                                this.onscroll();
                              `
                            : javascript``
                        }
                      });
                    `}"
                  >
                    <div
                      css="${res.locals.css(css`
                        ${res.locals.conversation.type === "chat"
                          ? css`
                              flex: 1;
                              min-width: var(--width--0);
                              max-width: var(--width--prose);
                            `
                          : css``}
                      `)}"
                    >
                      $${messages.length === 0
                        ? html`
                            <div
                              css="${res.locals.css(css`
                                padding: var(--space--4) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                                align-items: center;
                              `)}"
                            >
                              <div class="decorative-icon">
                                <i class="bi bi-chat-text"></i>
                              </div>
                              <p class="secondary">
                                ${afterMessage !== undefined ||
                                beforeMessage !== undefined
                                  ? "No more messages."
                                  : res.locals.conversation.type === "chat"
                                  ? "Start the chat by sending the first message!"
                                  : "All messages in this conversation have been deleted."}
                              </p>
                            </div>
                          `
                        : html`
                            <div
                              key="messages"
                              css="${res.locals.css(css`
                                ${res.locals.conversation.type === "chat"
                                  ? css`
                                      padding: var(--space--4) var(--space--0);
                                    `
                                  : css``}
                              `)}"
                            >
                              $${afterMessage !== undefined ||
                              (moreMessagesExist && messagesReverse)
                                ? html`
                                    <div
                                      css="${res.locals.css(css`
                                        display: flex;
                                        justify-content: center;
                                      `)}"
                                    >
                                      <a
                                        href="https://${app.locals.options
                                          .host}/courses/${res.locals.course
                                          .reference}/conversations/${res.locals
                                          .conversation
                                          .reference}${qs.stringify(
                                          {
                                            conversations:
                                              req.query.conversations,
                                            messages: {
                                              ...req.query.messages,
                                              messagesPage: {
                                                beforeMessageReference:
                                                  messages[0].reference,
                                              },
                                            },
                                          },
                                          {
                                            addQueryPrefix: true,
                                          }
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
                                      key="message--${message.reference}"
                                      data-content-source="${JSON.stringify(
                                        message.contentSource
                                      )}"
                                      class="message"
                                      css="${res.locals.css(css`
                                        ${res.locals.conversation.type ===
                                        "chat"
                                          ? css``
                                          : css`
                                              border-bottom: var(
                                                  --border-width--4
                                                )
                                                solid
                                                var(--color--gray--medium--200);
                                              @media (prefers-color-scheme: dark) {
                                                border-color: var(
                                                  --color--gray--medium--700
                                                );
                                              }
                                            `}
                                      `)}"
                                    >
                                      $${message === firstUnreadMessage &&
                                      message !== messages[0]
                                        ? html`
                                            <button
                                              class="message--new-separator button button--transparent"
                                              css="${res.locals.css(css`
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
                                              `)}"
                                              onload="${javascript`
                                                if (this !== document.querySelector(".message--new-separator")) {
                                                  this.remove();
                                                  return;
                                                }

                                                (this.tooltip ??= tippy(this)).setProps({
                                                  touch: false,
                                                  content: "Close",
                                                });
                                                           
                                                this.onclick = () => {
                                                  this.remove();
                                                };

                                                this.onbeforeremove = () => false;
                                              `}"
                                            >
                                              <hr
                                                class="separator"
                                                css="${res.locals.css(css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `)}"
                                              />
                                              <span class="heading text--rose">
                                                <i class="bi bi-fire"></i>
                                                New
                                              </span>
                                              <hr
                                                class="separator"
                                                css="${res.locals.css(css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `)}"
                                              />
                                            </button>
                                          `
                                        : html``}
                                      $${res.locals.conversation.type === "chat"
                                        ? html`
                                            <div
                                              hidden
                                              key="message--date-separator"
                                              css="${res.locals.css(css`
                                                margin: var(--space--2)
                                                  var(--space--0);
                                                display: flex;
                                                gap: var(--space--4);
                                                align-items: center;
                                              `)}"
                                            >
                                              <hr
                                                class="separator"
                                                css="${res.locals.css(css`
                                                  flex: 1;
                                                `)}"
                                              />
                                              <span class="heading secondary">
                                                <i
                                                  class="bi bi-calendar-week-fill"
                                                ></i>
                                                <time
                                                  datetime="${new Date(
                                                    message.createdAt
                                                  ).toISOString()}"
                                                  onload="${javascript`
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
                                                      element.updateTimeout = window.setTimeout(update, 60 * 1000);
                                                    })();
                                                  `}"
                                                ></time>
                                              </span>
                                              <hr
                                                class="separator"
                                                css="${res.locals.css(css`
                                                  flex: 1;
                                                `)}"
                                              />
                                            </div>
                                          `
                                        : html``}

                                      <div
                                        class="message--highlight"
                                        css="${res.locals.css(css`
                                          padding: var(--space--2);
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css``
                                            : css`
                                                padding-bottom: var(--space--4);
                                              `}
                                          border-radius: var(--border-radius--lg);
                                          margin: var(--space--0)
                                            var(--space---2);
                                          display: flex;
                                          flex-direction: column;
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css`
                                                gap: var(--space--1);
                                              `
                                            : css`
                                                gap: var(--space--2);
                                              `}
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

                                          ${res.locals.conversation.type ===
                                          "chat"
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
                                                    --color--gray--medium--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    background-color: var(
                                                      --color--gray--medium--800
                                                    );
                                                  }
                                                }
                                              `
                                            : css``}
                                        `)}"
                                      >
                                        $${(() => {
                                          const actions = html`
                                            <div key="message--actions">
                                              <button
                                                class="button button--tight button--tight--inline button--transparent secondary"
                                                css="${res.locals.css(css`
                                                  font-size: var(
                                                    --font-size--xs
                                                  );
                                                  line-height: var(
                                                    --line-height--xs
                                                  );
                                                  ${res.locals.conversation
                                                    .type === "chat"
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
                                                        .message:not(:hover, :focus-within)
                                                          & {
                                                          opacity: var(
                                                            --opacity--0
                                                          );
                                                        }
                                                      `
                                                    : css``}
                                                `)}"
                                                onload="${javascript`
                                                  (this.tooltip ??= tippy(this)).setProps({
                                                    touch: false,
                                                    content: "Actions",
                                                  });
                                                
                                                  (this.dropdown ??= tippy(this)).setProps({
                                                    trigger: "click",
                                                    interactive: true,
                                                    content: ${res.locals.html(
                                                      html`
                                                        <h3 class="heading">
                                                          <i
                                                            class="bi bi-chat-text-fill"
                                                          ></i>
                                                          Message
                                                          #${res.locals
                                                            .conversation
                                                            .reference}/${message.reference}
                                                        </h3>
                                                        <div
                                                          class="dropdown--menu"
                                                        >
                                                          $${res.locals
                                                            .conversation
                                                            .type === "chat" &&
                                                          message.likes
                                                            .length === 0
                                                            ? html`
                                                                <form
                                                                  method="POST"
                                                                  action="https://${app
                                                                    .locals
                                                                    .options
                                                                    .host}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}/likes${qs.stringify(
                                                                    {
                                                                      conversations:
                                                                        req
                                                                          .query
                                                                          .conversations,
                                                                      messages:
                                                                        req
                                                                          .query
                                                                          .messages,
                                                                    },
                                                                    {
                                                                      addQueryPrefix:
                                                                        true,
                                                                    }
                                                                  )}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                  >
                                                                    <i
                                                                      class="bi bi-hand-thumbs-up"
                                                                    ></i>
                                                                    Like
                                                                  </button>
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment
                                                            .courseRole ===
                                                            "staff" &&
                                                          res.locals
                                                            .conversation
                                                            .type === "chat"
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  onload="${javascript`
                                                                    const loading = ${res
                                                                      .locals
                                                                      .html(html`
                                                                      <div
                                                                        css="${res
                                                                          .locals
                                                                          .css(css`
                                                                          display: flex;
                                                                          gap: var(
                                                                            --space--2
                                                                          );
                                                                          align-items: center;
                                                                        `)}"
                                                                      >
                                                                        $${app.locals.partials.spinner(
                                                                          {
                                                                            req,
                                                                            res,
                                                                          }
                                                                        )}
                                                                        Loading…
                                                                      </div>
                                                                    `)};
                                                                    loading.remove();
                
                                                                    const content = ${res.locals.html(
                                                                      html``
                                                                    )};
                                                                    content.remove();
                
                                                                    (this.tooltip ??= tippy(this)).setProps({
                                                                      trigger: "click",
                                                                      interactive: true,
                                                                      onShow: async () => {
                                                                        this.tooltip.setContent(loading);
                                                                        leafac.loadPartial(content, await (await fetch("https://${
                                                                          app
                                                                            .locals
                                                                            .options
                                                                            .host
                                                                        }/courses/${
                                                                    res.locals
                                                                      .course
                                                                      .reference
                                                                  }/conversations/${
                                                                    res.locals
                                                                      .conversation
                                                                      .reference
                                                                  }/messages/${
                                                                    message.reference
                                                                  }/views")).text());
                                                                        this.tooltip.setContent(content);
                                                                      },
                                                                    });
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-eye"
                                                                  ></i>
                                                                  ${message.readings.length.toString()}
                                                                  Views
                                                                </button>
                                                              `
                                                            : html``}

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            onload="${javascript`
                                                              this.onclick = () => {
                                                                const content = JSON.parse(this.closest("[data-content-source]").dataset.contentSource);
                                                                const newMessage = document.querySelector(".new-message");
                                                                newMessage.querySelector(".content-editor--button--write")?.click();
                                                                const element = newMessage.querySelector(".content-editor--write--textarea");
                                                                textFieldEdit.wrapSelection(
                                                                  element,
                                                                  ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                    message.authorEnrollment ===
                                                                    "no-longer-enrolled"
                                                                      ? javascript``
                                                                      : javascript`
                                                                        "@${
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
                                                                        } · " +
                                                                      `
                                                                  } "#" + ${JSON.stringify(
                                                              res.locals
                                                                .conversation
                                                                .reference
                                                            )} + "/" + ${JSON.stringify(
                                                              message.reference
                                                            )} + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                                  ""
                                                                );
                                                                element.focus();
                                                                tippy.hideAll();
                                                              };
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-reply"
                                                            ></i>
                                                            Reply
                                                          </button>

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            onload="${javascript`
                                                              (this.copied ??= tippy(this)).setProps({
                                                                theme: "green",
                                                                trigger: "manual",
                                                                content: "Copied",
                                                              });

                                                              this.onclick = async () => {
                                                                await navigator.clipboard.writeText("https://${
                                                                  app.locals
                                                                    .options
                                                                    .host
                                                                }/courses/${
                                                              res.locals.course
                                                                .reference
                                                            }/conversations/${
                                                              res.locals
                                                                .conversation
                                                                .reference
                                                            }${qs.stringify(
                                                              {
                                                                messages: {
                                                                  messageReference:
                                                                    message.reference,
                                                                },
                                                              },
                                                              {
                                                                addQueryPrefix:
                                                                  true,
                                                              }
                                                            )}");
                                                                this.copied.show();
                                                                await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                                                this.copied.hide();
                                                              };
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-link"
                                                            ></i>
                                                            Copy Message
                                                            Permanent Link
                                                          </button>

                                                          $${message.authorEnrollment !==
                                                            "no-longer-enrolled" &&
                                                          message
                                                            .authorEnrollment
                                                            .id ===
                                                            res.locals
                                                              .enrollment.id &&
                                                          res.locals.enrollment
                                                            .courseRole ===
                                                            "student" &&
                                                          res.locals
                                                            .conversation
                                                            .staffOnlyAt ===
                                                            null
                                                            ? html`
                                                                <form
                                                                  method="PATCH"
                                                                  action="https://${app
                                                                    .locals
                                                                    .options
                                                                    .host}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}${qs.stringify(
                                                                    {
                                                                      conversations:
                                                                        req
                                                                          .query
                                                                          .conversations,
                                                                      messages:
                                                                        req
                                                                          .query
                                                                          .messages,
                                                                    },
                                                                    {
                                                                      addQueryPrefix:
                                                                        true,
                                                                    }
                                                                  )}"
                                                                  class="dropdown--menu"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  $${message.anonymousAt ===
                                                                  null
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
                                                                            css="${res
                                                                              .locals
                                                                              .css(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${app.locals.partials.user(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Anonymous
                                                                          to
                                                                          Other
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
                                                                            css="${res
                                                                              .locals
                                                                              .css(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${app.locals.partials.user(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                user: res
                                                                                  .locals
                                                                                  .user,
                                                                                decorate:
                                                                                  false,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Signed
                                                                          by You
                                                                        </button>
                                                                      `}
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${app.locals.helpers.mayEditMessage(
                                                            {
                                                              req,
                                                              res,
                                                              message,
                                                            }
                                                          )
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  onload="${javascript`
                                                                    this.onclick = () => {
                                                                      this.closest(".message").querySelector(".message--show").hidden = true;
                                                                      this.closest(".message").querySelector(".message--edit").hidden = false;
                                                                      autosize.update(this.closest(".message").querySelector(".message--edit .content-editor--write--textarea"));
                                                                      tippy.hideAll();
                                                                    };
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-pencil"
                                                                  ></i>
                                                                  Edit Message
                                                                </button>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment
                                                            .courseRole ===
                                                          "staff"
                                                            ? html`
                                                                <div>
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                    onload="${javascript`
                                                                      (this.dropdown ??= tippy(this)).setProps({
                                                                        theme: "rose",
                                                                        trigger: "click",
                                                                        interactive: true,
                                                                        content: ${res.locals.html(
                                                                          html`
                                                                            <form
                                                                              method="DELETE"
                                                                              action="https://${app
                                                                                .locals
                                                                                .options
                                                                                .host}/courses/${res
                                                                                .locals
                                                                                .course
                                                                                .reference}/conversations/${res
                                                                                .locals
                                                                                .conversation
                                                                                .reference}/messages/${message.reference}${qs.stringify(
                                                                                {
                                                                                  conversations:
                                                                                    req
                                                                                      .query
                                                                                      .conversations,
                                                                                  messages:
                                                                                    req
                                                                                      .query
                                                                                      .messages,
                                                                                },
                                                                                {
                                                                                  addQueryPrefix:
                                                                                    true,
                                                                                }
                                                                              )}"
                                                                              css="${res
                                                                                .locals
                                                                                .css(css`
                                                                                padding: var(
                                                                                  --space--2
                                                                                );
                                                                                display: flex;
                                                                                flex-direction: column;
                                                                                gap: var(
                                                                                  --space--4
                                                                                );
                                                                              `)}"
                                                                            >
                                                                              <input
                                                                                type="hidden"
                                                                                name="_csrf"
                                                                                value="${req.csrfToken()}"
                                                                              />
                                                                              <p>
                                                                                Are
                                                                                you
                                                                                sure
                                                                                you
                                                                                want
                                                                                to
                                                                                remove
                                                                                this
                                                                                message?
                                                                              </p>
                                                                              <p>
                                                                                <strong
                                                                                  css="${res
                                                                                    .locals
                                                                                    .css(css`
                                                                                    font-weight: var(
                                                                                      --font-weight--bold
                                                                                    );
                                                                                  `)}"
                                                                                >
                                                                                  You
                                                                                  may
                                                                                  not
                                                                                  undo
                                                                                  this
                                                                                  action!
                                                                                </strong>
                                                                              </p>
                                                                              <button
                                                                                class="button button--rose"
                                                                              >
                                                                                <i
                                                                                  class="bi bi-trash-fill"
                                                                                ></i>
                                                                                Remove
                                                                                Message
                                                                              </button>
                                                                            </form>
                                                                          `
                                                                        )},
                                                                      });
                                                                    `}"
                                                                  >
                                                                    <i
                                                                      class="bi bi-trash"
                                                                    ></i>
                                                                    Remove
                                                                    Message
                                                                  </button>
                                                                </div>
                                                              `
                                                            : html``}
                                                        </div>
                                                      `
                                                    )},
                                                  });
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
                                            app.locals.helpers.mayEditMessage({
                                              req,
                                              res,
                                              message,
                                            }) &&
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question"
                                          )
                                            header += html`
                                              <form
                                                method="PATCH"
                                                action="https://${app.locals
                                                  .options.host}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}${qs.stringify(
                                                  {
                                                    conversations:
                                                      req.query.conversations,
                                                    messages:
                                                      req.query.messages,
                                                  },
                                                  {
                                                    addQueryPrefix: true,
                                                  }
                                                )}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${message.answerAt === null
                                                  ? html`
                                                      <input
                                                        key="isAnswer--true"
                                                        type="hidden"
                                                        name="isAnswer"
                                                        value="true"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            touch: false,
                                                            content: "Set as Answer",
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
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            touch: false,
                                                            content: "Set as Not an Answer",
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
                                          else if (
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question" &&
                                            message.answerAt !== null
                                          )
                                            header += html`
                                              <div class="text--emerald">
                                                <i
                                                  class="bi bi-patch-check-fill"
                                                ></i>
                                                Answer
                                              </div>
                                            `;

                                          if (
                                            app.locals.helpers.mayEndorseMessage(
                                              {
                                                req,
                                                res,
                                                message,
                                              }
                                            )
                                          ) {
                                            const isEndorsed =
                                              message.endorsements.some(
                                                (endorsement) =>
                                                  endorsement.enrollment !==
                                                    "no-longer-enrolled" &&
                                                  endorsement.enrollment.id ===
                                                    res.locals.enrollment.id
                                              );

                                            header += html`
                                              <form
                                                method="${isEndorsed
                                                  ? "DELETE"
                                                  : "POST"}"
                                                action="https://${app.locals
                                                  .options.host}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}/endorsements${qs.stringify(
                                                  {
                                                    conversations:
                                                      req.query.conversations,
                                                    messages:
                                                      req.query.messages,
                                                  },
                                                  {
                                                    addQueryPrefix: true,
                                                  }
                                                )}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${isEndorsed
                                                  ? html`
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--blue"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            touch: false,
                                                            content: ${JSON.stringify(
                                                              `Remove Endorsement${
                                                                message.endorsements.filter(
                                                                  (
                                                                    endorsement
                                                                  ) =>
                                                                    endorsement.enrollment !==
                                                                      "no-longer-enrolled" &&
                                                                    endorsement
                                                                      .enrollment
                                                                      .id !==
                                                                      res.locals
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
                                                                              res
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
                                                              }`
                                                            )},
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
                                                              onload="${javascript`
                                                                (this.tooltip ??= tippy(this)).setProps({
                                                                  touch: false,
                                                                  content: ${JSON.stringify(
                                                                    `Endorse (Already endorsed by ${
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
                                                                    })`
                                                                  )},
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
                                            res.locals.conversation.type ===
                                              "question" &&
                                            (message.authorEnrollment ===
                                              "no-longer-enrolled" ||
                                              message.authorEnrollment
                                                .courseRole !== "staff") &&
                                            message.endorsements.length > 0
                                          )
                                            header += html`
                                              <div
                                                class="text--lime"
                                                onload="${javascript`
                                                  ${
                                                    message.endorsements.filter(
                                                      (endorsement) =>
                                                        endorsement.enrollment !==
                                                        "no-longer-enrolled"
                                                    ).length > 0
                                                      ? javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            content: ${JSON.stringify(
                                                              `Endorsed by ${
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
                                                              }`
                                                            )},
                                                          });
                                                        `
                                                      : javascript``
                                                  }
                                                  
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
                                                    css="${res.locals.css(css`
                                                      font-size: var(
                                                        --font-size--xs
                                                      );
                                                      line-height: var(
                                                        --line-height--xs
                                                      );
                                                      display: flex;
                                                      gap: var(--space--4);
                                                    `)}"
                                                  >
                                                    <div
                                                      css="${res.locals.css(css`
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
                                                          gap: var(--space--1);
                                                        }
                                                      `)}"
                                                    >
                                                      $${header}
                                                    </div>
                                                    $${actions}
                                                  </div>
                                                `
                                              : html``}

                                            <div
                                              css="${res.locals.css(css`
                                                display: flex;
                                                gap: var(--space--2);
                                              `)}"
                                            >
                                              <div
                                                class="secondary"
                                                css="${res.locals.css(css`
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
                                                `)}"
                                              >
                                                <div
                                                  class="strong"
                                                  css="${res.locals.css(css`
                                                    font-size: var(
                                                      --font-size--sm
                                                    );
                                                    line-height: var(
                                                      --line-height--sm
                                                    );
                                                  `)}"
                                                >
                                                  $${app.locals.partials.user({
                                                    req,
                                                    res,
                                                    enrollment:
                                                      message.authorEnrollment,
                                                    anonymous:
                                                      message.anonymousAt ===
                                                      null
                                                        ? false
                                                        : res.locals.enrollment
                                                            .courseRole ===
                                                            "staff" ||
                                                          (message.authorEnrollment !==
                                                            "no-longer-enrolled" &&
                                                            message
                                                              .authorEnrollment
                                                              .id ===
                                                              res.locals
                                                                .enrollment.id)
                                                        ? "reveal"
                                                        : true,
                                                    name:
                                                      message.authorEnrollment ===
                                                      "no-longer-enrolled"
                                                        ? undefined
                                                        : app.locals.helpers.highlightSearchResult(
                                                            html`${message
                                                              .authorEnrollment
                                                              .user.name}`,
                                                            typeof req.query
                                                              .conversations
                                                              ?.search ===
                                                              "string" &&
                                                              req.query.conversations.search.trim() !==
                                                                ""
                                                              ? req.query
                                                                  .conversations
                                                                  .search
                                                              : undefined
                                                          ),
                                                  })}
                                                </div>

                                                <time
                                                  datetime="${new Date(
                                                    message.createdAt
                                                  ).toISOString()}"
                                                  onload="${javascript`
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
                                                          onload="${javascript`
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
                                          class="message--show"
                                          css="${res.locals.css(css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `)}"
                                        >
                                          <div
                                            class="message--show--content-area"
                                            css="${res.locals.css(css`
                                              position: relative;
                                            `)}"
                                          >
                                            <div
                                              class="message--show--content-area--dropdown-menu-target"
                                              css="${res.locals.css(css`
                                                width: var(--space--0);
                                                height: var(--line-height--sm);
                                                position: absolute;
                                              `)}"
                                            ></div>
                                            <div
                                              class="message--show--content-area--content"
                                              onload="${javascript`
                                                const dropdownMenuTarget = this.closest(".message--show--content-area").querySelector(".message--show--content-area--dropdown-menu-target");
                                                (dropdownMenuTarget.dropdownMenu ??= tippy(dropdownMenuTarget)).setProps({
                                                  trigger: "manual",
                                                  interactive: true,
                                                  content: ${res.locals.html(
                                                    html`
                                                      <div
                                                        class="dropdown--menu"
                                                      >
                                                        <button
                                                          class="dropdown--menu--item button button--transparent"
                                                          onload="${javascript`
                                                            this.onclick = () => {
                                                              tippy.hideAll();
                                                              const selection = window.getSelection();
                                                              const anchorElement = leafac.ancestors(selection.anchorNode).reverse().find(element => element?.dataset?.position !== undefined);
                                                              const focusElement = leafac.ancestors(selection.focusNode).reverse().find(element => element?.dataset?.position !== undefined);
                                                              const contentElement = this.closest(".message--show--content-area").querySelector(".message--show--content-area--content");
                                                              if (
                                                                selection.isCollapsed ||
                                                                anchorElement === undefined ||
                                                                focusElement === undefined ||
                                                                !contentElement.contains(anchorElement) ||
                                                                !contentElement.contains(focusElement)
                                                              ) return;
                                                              const anchorPosition = JSON.parse(anchorElement.dataset.position);
                                                              const focusPosition = JSON.parse(focusElement.dataset.position);
                                                              const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                                                              const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                                                              const content = JSON.parse(anchorElement.closest("[data-content-source]").dataset.contentSource);
                                                              const newMessage = document.querySelector(".new-message");
                                                              newMessage.querySelector(".content-editor--button--write")?.click();
                                                              const element = newMessage.querySelector(".content-editor--write--textarea");
                                                              textFieldEdit.wrapSelection(
                                                                element,
                                                                ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                  message.authorEnrollment ===
                                                                  "no-longer-enrolled"
                                                                    ? javascript``
                                                                    : javascript`
                                                                      "@${
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
                                                                      } · " +
                                                                    `
                                                                } "#" + ${JSON.stringify(
                                                            res.locals
                                                              .conversation
                                                              .reference
                                                          )} + "/" + ${JSON.stringify(
                                                            message.reference
                                                          )} + "\\n>\\n> " + content.slice(start, end).replaceAll("\\n", "\\n> ") + "\\n\\n",
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
                                                    `
                                                  )},
                                                });
                                                
                                                this.onmouseup = (event) => {
                                                  window.setTimeout(() => {
                                                    const selection = window.getSelection();
                                                    const anchorElement = leafac.ancestors(selection.anchorNode).reverse().find(element => element?.dataset?.position !== undefined);
                                                    const focusElement = leafac.ancestors(selection.focusNode).reverse().find(element => element?.dataset?.position !== undefined);
                                                    if (
                                                      selection.isCollapsed ||
                                                      anchorElement === undefined ||
                                                      focusElement === undefined ||
                                                      !this.contains(anchorElement) ||
                                                      !this.contains(focusElement)
                                                    ) return;
                                                    dropdownMenuTarget.style.top = String(event.layerY) + "px";
                                                    dropdownMenuTarget.style.left = String(event.layerX) + "px";
                                                    dropdownMenuTarget.dropdownMenu.show();
                                                  });
                                                };
                                              `}"
                                            >
                                              $${app.locals.partials.content({
                                                req,
                                                res,
                                                type: "preprocessed",
                                                content:
                                                  message.contentPreprocessed,
                                                decorate: true,
                                                search:
                                                  typeof req.query.conversations
                                                    ?.search === "string" &&
                                                  req.query.conversations.search.trim() !==
                                                    ""
                                                    ? req.query.conversations
                                                        .search
                                                    : undefined,
                                              }).processed}
                                            </div>
                                          </div>

                                          $${(() => {
                                            let messageShowFooter = html``;

                                            const isLiked = message.likes.some(
                                              (like) =>
                                                like.enrollment !==
                                                  "no-longer-enrolled" &&
                                                like.enrollment.id ===
                                                  res.locals.enrollment.id
                                            );
                                            const likesCount =
                                              message.likes.length;
                                            if (
                                              res.locals.conversation.type !==
                                                "chat" ||
                                              likesCount > 0
                                            )
                                              messageShowFooter += html`
                                                <form
                                                  method="${isLiked
                                                    ? "DELETE"
                                                    : "POST"}"
                                                  action="https://${app.locals
                                                    .options.host}/courses/${res
                                                    .locals.course
                                                    .reference}/conversations/${res
                                                    .locals.conversation
                                                    .reference}/messages/${message.reference}/likes${qs.stringify(
                                                    {
                                                      conversations:
                                                        req.query.conversations,
                                                      messages:
                                                        req.query.messages,
                                                    },
                                                    {
                                                      addQueryPrefix: true,
                                                    }
                                                  )}"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="_csrf"
                                                    value="${req.csrfToken()}"
                                                  />
                                                  <button
                                                    class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                                      ? "text--blue"
                                                      : ""}"
                                                    $${likesCount === 0
                                                      ? html``
                                                      : html`
                                                          onload="${javascript`
                                                            (this.tooltip ??= tippy(this)).setProps({
                                                              touch: false,
                                                              content: ${JSON.stringify(
                                                                isLiked
                                                                  ? "Remove Like"
                                                                  : "Like"
                                                              )},
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
                                                      : html`
                                                          ${likesCount.toString()}
                                                          Like${likesCount === 1
                                                            ? ""
                                                            : "s"}
                                                        `}
                                                  </button>
                                                </form>
                                              `;

                                            if (
                                              res.locals.enrollment
                                                .courseRole === "staff" &&
                                              res.locals.conversation.type !==
                                                "chat"
                                            )
                                              messageShowFooter += html`
                                                <button
                                                  class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                  onload="${javascript`
                                                    const loading = ${res.locals
                                                      .html(html`
                                                      <div
                                                        css="${res.locals
                                                          .css(css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                          align-items: center;
                                                        `)}"
                                                      >
                                                        $${app.locals.partials.spinner(
                                                          {
                                                            req,
                                                            res,
                                                          }
                                                        )}
                                                        Loading…
                                                      </div>
                                                    `)};
                                                    loading.remove();

                                                    const content = ${res.locals.html(
                                                      html``
                                                    )};
                                                    content.remove();

                                                    (this.tooltip ??= tippy(this)).setProps({
                                                      trigger: "click",
                                                      interactive: true,
                                                      onShow: async () => {
                                                        this.tooltip.setContent(loading);
                                                        leafac.loadPartial(content, await (await fetch("https://${
                                                          app.locals.options
                                                            .host
                                                        }/courses/${
                                                    res.locals.course.reference
                                                  }/conversations/${
                                                    res.locals.conversation
                                                      .reference
                                                  }/messages/${
                                                    message.reference
                                                  }/views")).text());
                                                        this.tooltip.setContent(content);
                                                      },
                                                    });
                                                  `}"
                                                >
                                                  <i class="bi bi-eye"></i>
                                                  ${message.readings.length.toString()}
                                                  Views
                                                </button>
                                              `;

                                            return messageShowFooter !== html``
                                              ? html`
                                                  <div
                                                    key="message--show--footer"
                                                    css="${res.locals.css(css`
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
                                                      row-gap: var(--space--1);
                                                    `)}"
                                                  >
                                                    $${messageShowFooter}
                                                  </div>
                                                `
                                              : html``;
                                          })()}
                                        </div>

                                        $${app.locals.helpers.mayEditMessage({
                                          req,
                                          res,
                                          message,
                                        })
                                          ? html`
                                              <form
                                                method="PATCH"
                                                action="https://${app.locals
                                                  .options.host}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}${qs.stringify(
                                                  {
                                                    conversations:
                                                      req.query.conversations,
                                                    messages:
                                                      req.query.messages,
                                                  },
                                                  {
                                                    addQueryPrefix: true,
                                                  }
                                                )}"
                                                novalidate
                                                hidden
                                                class="message--edit"
                                                css="${res.locals.css(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${app.locals.partials.contentEditor(
                                                  {
                                                    req,
                                                    res,
                                                    contentSource:
                                                      message.contentSource,
                                                    compact:
                                                      res.locals.conversation
                                                        .type === "chat",
                                                  }
                                                )}

                                                <div
                                                  css="${res.locals.css(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    @media (max-width: 400px) {
                                                      flex-direction: column;
                                                    }
                                                  `)}"
                                                >
                                                  <button
                                                    class="button button--blue"
                                                    onload="${javascript`
                                                      (this.tooltip ??= tippy(this)).setProps({
                                                        touch: false,
                                                        content: ${res.locals.html(
                                                          html`
                                                            <span
                                                              class="keyboard-shortcut"
                                                            >
                                                              <span
                                                                onload="${javascript`
                                                                  this.hidden = leafac.isAppleDevice;
                                                                `}"
                                                                >Ctrl+Enter</span
                                                              ><span
                                                                class="keyboard-shortcut--cluster"
                                                                onload="${javascript`
                                                                  this.hidden = !leafac.isAppleDevice;
                                                                `}"
                                                                ><i
                                                                  class="bi bi-command"
                                                                ></i
                                                                ><i
                                                                  class="bi bi-arrow-return-left"
                                                                ></i
                                                              ></span>
                                                            </span>
                                                          `
                                                        )},
                                                      });

                                                      const textarea = this.closest("form").querySelector(".content-editor--write--textarea");

                                                      (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });                                  
                                                    `}"
                                                  >
                                                    <i
                                                      class="bi bi-pencil-fill"
                                                    ></i>
                                                    Update Message
                                                  </button>
                                                  <button
                                                    type="reset"
                                                    class="button button--transparent"
                                                    onload="${javascript`
                                                      (this.tooltip ??= tippy(this)).setProps({
                                                        touch: false,
                                                        content: ${res.locals.html(
                                                          html`
                                                            <span
                                                              class="keyboard-shortcut"
                                                            >
                                                              <span
                                                                onload="${javascript`
                                                                  this.hidden = leafac.isAppleDevice;
                                                                `}"
                                                                >Esc</span
                                                              ><span
                                                                class="keyboard-shortcut--cluster"
                                                                onload="${javascript`
                                                                  this.hidden = !leafac.isAppleDevice;
                                                                `}"
                                                                ><i
                                                                  class="bi bi-escape"
                                                                ></i
                                                              ></span>
                                                            </span>
                                                          `
                                                        )},
                                                      });

                                                      this.onclick = () => {
                                                        this.closest(".message").querySelector(".message--show").hidden = false;
                                                        this.closest(".message").querySelector(".message--edit").hidden = true;
                                                      };

                                                      const textarea = this.closest("form").querySelector(".content-editor--write--textarea");

                                                      (textarea.mousetrap ??= new Mousetrap(textarea)).bind("escape", () => { this.click(); return false; });                                  
                                                    `}"
                                                  >
                                                    <i class="bi bi-x-lg"></i>
                                                    Cancel
                                                  </button>
                                                </div>
                                              </form>
                                            `
                                          : html``}
                                      </div>
                                    </div>
                                  `
                              )}
                              $${beforeMessage !== undefined ||
                              (moreMessagesExist && !messagesReverse)
                                ? html`
                                    <div
                                      css="${res.locals.css(css`
                                        display: flex;
                                        justify-content: center;
                                      `)}"
                                    >
                                      <a
                                        href="https://${app.locals.options
                                          .host}/courses/${res.locals.course
                                          .reference}/conversations/${res.locals
                                          .conversation
                                          .reference}${qs.stringify(
                                          {
                                            conversations:
                                              req.query.conversations,
                                            messages: {
                                              ...req.query.messages,
                                              messagesPage: {
                                                afterMessageReference:
                                                  messages[messages.length - 1]
                                                    .reference,
                                              },
                                            },
                                          },
                                          {
                                            addQueryPrefix: true,
                                          }
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
                                css="${res.locals.css(css`
                                  opacity: var(--opacity--50);
                                  ${res.locals.conversation.type === "chat"
                                    ? css``
                                    : css`
                                        border-bottom: var(--border-width--4)
                                          solid var(--color--gray--medium--200);
                                        @media (prefers-color-scheme: dark) {
                                          border-color: var(
                                            --color--gray--medium--700
                                          );
                                        }
                                      `}
                                `)}"
                              >
                                <div
                                  css="${res.locals.css(css`
                                    padding: var(--space--2);
                                    ${res.locals.conversation.type === "chat"
                                      ? css``
                                      : css`
                                          padding-bottom: var(--space--4);
                                        `}
                                    border-radius: var(--border-radius--lg);
                                    margin: var(--space--0) var(--space---2);
                                    display: flex;
                                    flex-direction: column;
                                    ${res.locals.conversation.type === "chat"
                                      ? css`
                                          gap: var(--space--1);
                                        `
                                      : css`
                                          gap: var(--space--2);
                                        `}

                                    ${res.locals.conversation.type === "chat"
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
                                              --color--gray--medium--100
                                            );
                                            @media (prefers-color-scheme: dark) {
                                              background-color: var(
                                                --color--gray--medium--800
                                              );
                                            }
                                          }
                                        `
                                      : css``}
                                  `)}"
                                >
                                  <div
                                    css="${res.locals.css(css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <div
                                      class="secondary"
                                      css="${res.locals.css(css`
                                        font-size: var(--font-size--xs);
                                        line-height: var(--line-height--xs);
                                        flex: 1;
                                        display: flex;
                                        flex-wrap: wrap;
                                        align-items: baseline;
                                        column-gap: var(--space--4);
                                        row-gap: var(--space--2);
                                      `)}"
                                    >
                                      <div
                                        key="message--new-message--placeholder--anonymous--false"
                                        class="strong"
                                        css="${res.locals.css(css`
                                          font-size: var(--font-size--sm);
                                          line-height: var(--line-height--sm);
                                        `)}"
                                      >
                                        $${app.locals.partials.user({
                                          req,
                                          res,
                                          enrollment: {
                                            ...res.locals.enrollment,
                                            user: res.locals.user,
                                          },
                                        })}
                                      </div>
                                      $${res.locals.enrollment.courseRole ===
                                      "staff"
                                        ? html``
                                        : html`
                                            <div
                                              key="message--new-message--placeholder--anonymous--true"
                                              class="strong"
                                              css="${res.locals.css(css`
                                                font-size: var(--font-size--sm);
                                                line-height: var(
                                                  --line-height--sm
                                                );
                                              `)}"
                                            >
                                              $${app.locals.partials.user({
                                                req,
                                                res,
                                                enrollment: {
                                                  ...res.locals.enrollment,
                                                  user: res.locals.user,
                                                },
                                                anonymous: "reveal",
                                              })}
                                            </div>
                                          `}
                                      <span>Sending…</span>
                                      $${app.locals.partials.spinner({
                                        req,
                                        res,
                                        size: 10,
                                      })}
                                    </div>
                                  </div>
                                  <div
                                    key="message--new-message--placeholder--content"
                                    css="${res.locals.css(css`
                                      white-space: pre-line;
                                    `)}"
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
                action="https://${app.locals.options.host}/courses/${res.locals
                  .course.reference}/conversations/${res.locals.conversation
                  .reference}/messages${qs.stringify(
                  {
                    conversations: req.query.conversations,
                    messages: req.query.messages,
                  },
                  {
                    addQueryPrefix: true,
                  }
                )}"
                novalidate
                css="${res.locals.css(css`
                  ${res.locals.conversation.type === "chat"
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
                      `}
                `)}"
                onload="${javascript`
                  this.onsubmit = () => {
                    window.setTimeout(() => {
                      const placeholder = document.querySelector('[key="message--new-message--placeholder"]');
                      const content = this.querySelector('[name="content"]');
                      ${
                        res.locals.enrollment.courseRole === "staff"
                          ? javascript``
                          : javascript`
                              const isAnonymous = this.querySelector('[name="isAnonymous"]');
                              placeholder.querySelector('[key="message--new-message--placeholder--anonymous--' + (!isAnonymous.checked).toString() + '"]').hidden = true;
                            `
                      }
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
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          gap: var(--space--2);
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                        `
                      : css`
                          gap: var(--space--4);
                        `}
                  `)}"
                >
                  <input
                    type="hidden"
                    name="_csrf"
                    value="${req.csrfToken()}"
                  />

                  $${res.locals.conversation.type === "question"
                    ? html`
                        <div class="label">
                          <p class="label--text">Type</p>
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnswer"
                                $${res.locals.enrollment.courseRole === "staff"
                                  ? `checked`
                                  : ``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
                                  leafac.saveFormInputValue(this, "answer");
                                `}"
                              />
                              <span
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Set as Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check"></i>
                                Not an Answer
                              </span>
                              <span
                                class="text--emerald"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Set as Not an Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check-fill"></i>
                                Answer
                              </span>
                            </label>
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="new-message"
                    css="${res.locals.css(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }

                      ${res.locals.conversation.type === "chat"
                        ? css`
                            textarea {
                              padding-right: var(--space--8);
                            }
                          `
                        : css``}
                    `)}"
                    onload="${javascript`
                      leafac.saveFormInputValue(this.querySelector(".content-editor--write--textarea"), "new-message");
                    `}"
                  >
                    $${app.locals.partials.contentEditor({
                      req,
                      res,
                      compact: res.locals.conversation.type === "chat",
                    })}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--blue"
                            css="${res.locals.css(css`
                              position: relative;
                              place-self: end;
                              width: var(--font-size--2xl);
                              height: var(--font-size--2xl);
                              padding: var(--space--0);
                              border-radius: var(--border-radius--circle);
                              margin: var(--space--1);
                              align-items: center;
                            `)}"
                            onload="${javascript`
                              (this.tooltip ??= tippy(this)).setProps({
                                touch: false,
                                content: ${res.locals.html(
                                  html`
                                    Send Message
                                    <span class="keyboard-shortcut">
                                      <span
                                        onload="${javascript`
                                          this.hidden = leafac.isAppleDevice;
                                        `}"
                                        >Ctrl+Enter</span
                                      ><span
                                        class="keyboard-shortcut--cluster"
                                        onload="${javascript`
                                          this.hidden = !leafac.isAppleDevice;
                                        `}"
                                        ><i class="bi bi-command"></i
                                        ><i class="bi bi-arrow-return-left"></i
                                      ></span>
                                    </span>
                                  `
                                )},
                              });
                            `}"
                          >
                            <i
                              class="bi bi-send-fill"
                              css="${res.locals.css(css`
                                position: relative;
                                top: var(--space--px);
                                right: var(--space--px);
                              `)}"
                            ></i>
                          </button>
                        `
                      : html``}
                  </div>

                  $${res.locals.enrollment.courseRole === "staff" ||
                  res.locals.conversation.staffOnlyAt !== null
                    ? html``
                    : html`
                        <div class="label">
                          $${res.locals.conversation.type === "chat"
                            ? html``
                            : html`<p class="label--text">Anonymity</p>`}
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnonymous"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                onload="${javascript`
                                  this.isModified = false;

                                  this.onchange = () => {
                                    localStorage.setItem("anonymity", JSON.stringify(this.checked));  
                                  };
                                  
                                  if (JSON.parse(localStorage.getItem("anonymity") ?? "false")) this.click();
                                `}"
                              />
                              <span
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Set as Anonymous to Other Students",
                                  });
                                `}"
                              >
                                <span>
                                  $${app.locals.partials.user({
                                    req,
                                    res,
                                    user: res.locals.user,
                                    decorate: false,
                                    name: false,
                                    size: "xs",
                                  })}
                                  <span
                                    css="${res.locals.css(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Signed by You
                                  </span>
                                </span>
                              </span>
                              <span
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Set as Signed by You",
                                  });
                                `}"
                              >
                                <span>
                                  $${app.locals.partials.user({
                                    req,
                                    res,
                                    name: false,
                                    size: "xs",
                                  })}
                                  <span
                                    css="${res.locals.css(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Anonymous to Other Students
                                  </span>
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>
                      `}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                  >
                    <button
                      class="button button--full-width-on-small-screen button--blue"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: ${res.locals.html(
                            html`
                              <span class="keyboard-shortcut">
                                <span
                                  onload="${javascript`
                                    this.hidden = leafac.isAppleDevice;
                                  `}"
                                  >Ctrl+Enter</span
                                ><span
                                  class="keyboard-shortcut--cluster"
                                  onload="${javascript`
                                    this.hidden = !leafac.isAppleDevice;
                                  `}"
                                  ><i class="bi bi-command"></i
                                  ><i class="bi bi-arrow-return-left"></i
                                ></span>
                              </span>
                            `
                          )},
                        });

                        const textarea = this.closest("form").querySelector(".content-editor--write--textarea");

                        (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });    
                      `}"
                    >
                      <i class="bi bi-send-fill"></i>
                      Send Message
                    </button>
                  </div>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  interface MayEditConversationMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {}
  const mayEditConversationMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    {},
    {},
    MayEditConversationMiddlewareLocals
  >[] = [
    ...app.locals.middlewares.isConversationAccessible,
    (req, res, next) => {
      if (mayEditConversation({ req, res })) return next();
      next("route");
    },
  ];

  app.patch<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      type?: ConversationType;
      isResolved?: "true" | "false";
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
      title?: string;
    },
    {
      conversations?: object;
      messages?: object;
    },
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (typeof req.body.type === "string")
        if (!conversationTypes.includes(req.body.type))
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "type" = ${req.body.type}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isResolved === "string")
        if (
          res.locals.conversation.type !== "question" ||
          !["true", "false"].includes(req.body.isResolved) ||
          res.locals.enrollment.courseRole !== "staff" ||
          (req.body.isResolved === "true" &&
            res.locals.conversation.resolvedAt !== null) ||
          (req.body.isResolved === "false" &&
            res.locals.conversation.resolvedAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "resolvedAt" = ${
                req.body.isResolved === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isPinned === "string")
        if (
          !["true", "false"].includes(req.body.isPinned) ||
          res.locals.enrollment.courseRole !== "staff" ||
          (req.body.isPinned === "true" &&
            res.locals.conversation.pinnedAt !== null) ||
          (req.body.isPinned === "false" &&
            res.locals.conversation.pinnedAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "pinnedAt" = ${
                req.body.isPinned === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isStaffOnly === "string")
        if (
          !["true", "false"].includes(req.body.isStaffOnly) ||
          res.locals.enrollment.courseRole !== "staff" ||
          (req.body.isStaffOnly === "true" &&
            res.locals.conversation.staffOnlyAt !== null) ||
          (req.body.isStaffOnly === "false" &&
            res.locals.conversation.staffOnlyAt === null)
        )
          return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "staffOnlyAt" = ${
                req.body.isStaffOnly === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          app.locals.database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()},
                  "title" = ${req.body.title},
                  "titleSearch" = ${html`${req.body.title}`}
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
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      conversations?: object;
      messages?: object;
    },
    IsCourseStaffMiddlewareLocals & IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.isConversationAccessible,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${res.locals.conversation.id}`
      );
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Conversation removed successfully.`,
      });
      res.redirect(
        303,
        `https://${app.locals.options.host}/courses/${
          res.locals.course.reference
        }${qs.stringify(
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
    },
    any,
    { reference?: string },
    {
      conversations?: object;
      messages?: object;
    },
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.reference !== "string" ||
        !res.locals.tags.some((tag) => req.body.reference === tag.reference) ||
        res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`
          INSERT INTO "taggings" ("createdAt", "conversation", "tag")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.conversation.id},
            ${
              res.locals.tags.find(
                (tag) => req.body.reference === tag.reference
              )!.id
            }
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
    }
  );

  app.delete<
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
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        res.locals.conversation.taggings.length === 1 ||
        typeof req.body.reference !== "string" ||
        !res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      app.locals.database.run(
        sql`
          DELETE FROM "taggings"
          WHERE "conversation" = ${res.locals.conversation.id} AND
                "tag" = ${
                  res.locals.tags.find(
                    (tag) => req.body.reference === tag.reference
                  )!.id
                }
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
    }
  );
};
