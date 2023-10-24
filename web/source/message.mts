import timers from "node:timers/promises";
import express from "express";
import qs from "qs";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import slugify from "@sindresorhus/slugify";
import { Application } from "./index.mjs";

export type ApplicationMessage = {
  web: {
    locals: {
      helpers: {
        getMessage: ({
          request,
          response,
          conversation,
          messageReference,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
          >;
          conversation: NonNullable<
            ReturnType<
              Application["web"]["locals"]["helpers"]["getConversation"]
            >
          >;
          messageReference: string;
        }) =>
          | {
              id: number;
              createdAt: string;
              updatedAt: string | null;
              reference: string;
              authorCourseParticipant:
                | Application["web"]["locals"]["Types"]["CourseParticipant"]
                | null;
              authorAITeachingAssistantAt: string | null;
              anonymousAt: string | null;
              type:
                | "message"
                | "answer"
                | "follow-up-question"
                | "course-staff-whisper";
              contentSource: string;
              contentPreprocessed: HTML;
              contentSearch: string;
              reading: { id: number } | null;
              readings: {
                id: number;
                createdAt: string;
                courseParticipant:
                  | Application["web"]["locals"]["Types"]["CourseParticipant"]
                  | null;
              }[];
              endorsements: {
                id: number;
                courseParticipant:
                  | Application["web"]["locals"]["Types"]["CourseParticipant"]
                  | null;
              }[];
              likes: {
                id: number;
                createdAt: string;
                courseParticipant:
                  | Application["web"]["locals"]["Types"]["CourseParticipant"]
                  | null;
              }[];
            }
          | undefined;

        mayEditMessage: ({
          request,
          response,
          message,
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
          message: NonNullable<
            ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
          >;
        }) => boolean;

        mayEndorseMessage: ({
          request,
          response,
          message,
        }: {
          request: express.Request<
            {
              courseReference: string;
              conversationReference: string;
            },
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          message: NonNullable<
            ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
          >;
        }) => boolean;

        emailNotifications: ({
          request,
          response,
          message,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
          >;
          message: NonNullable<
            ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
          >;
        }) => void;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  type ResponseLocalsMessage =
    Application["web"]["locals"]["ResponseLocals"]["Conversation"] & {
      message: NonNullable<
        ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
      >;
    };

  application.web.use<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      const message = application.web.locals.helpers.getMessage({
        request,
        response,
        conversation: response.locals.conversation,
        messageReference: request.params.messageReference,
      });
      if (message === undefined) return next();
      response.locals.message = message;

      next();
    },
  );

  application.web.locals.helpers.getMessage = ({
    request,
    response,
    conversation,
    messageReference,
  }) => {
    const messageRow = application.database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorCourseParticipantId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserReference: string;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColors:
        | Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
        | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorCourseParticipantReference: string | null;
      authorCourseParticipantCourseRole:
        | Application["web"]["locals"]["helpers"]["courseRoles"][number]
        | null;
      authorAITeachingAssistantAt: string | null;
      anonymousAt: string | null;
      type: NonNullable<
        ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
      >["type"];
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
          "authorCourseParticipant"."id" AS "authorCourseParticipantId",
          "authorUser"."id" AS "authorUserId",
          "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
          "authorUser"."reference" AS "authorUserReference",
          "authorUser"."email" AS "authorUserEmail",
          "authorUser"."name" AS "authorUserName",
          "authorUser"."avatar" AS "authorUserAvatar",
          "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColors",
          "authorUser"."biographySource" AS "authorUserBiographySource",
          "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
          "authorCourseParticipant"."reference" AS "authorCourseParticipantReference",
          "authorCourseParticipant"."courseRole" AS "authorCourseParticipantCourseRole",
          "messages"."authorAITeachingAssistantAt",
          "messages"."anonymousAt",
          "messages"."type",
          "messages"."contentSource",
          "messages"."contentPreprocessed",
          "messages"."contentSearch",
          "readings"."id" AS "readingId"
        FROM "messages"
        LEFT JOIN "courseParticipants" AS "authorCourseParticipant" ON "messages"."authorCourseParticipant" = "authorCourseParticipant"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorCourseParticipant"."user" = "authorUser"."id"
        LEFT JOIN "readings" ON
          "messages"."id" = "readings"."message" AND
          "readings"."courseParticipant" = ${
            response.locals.courseParticipant.id
          }
        WHERE
          "messages"."conversation" = ${conversation.id} AND
          "messages"."reference" = ${messageReference}
          $${
            response.locals.courseParticipant.courseRole !== "course-staff"
              ? sql`
                  AND "messages"."type" != 'course-staff-whisper'
                `
              : sql``
          }
        ORDER BY "messages"."id" ASC
      `,
    );
    if (messageRow === undefined) return undefined;
    const message = {
      id: messageRow.id,
      createdAt: messageRow.createdAt,
      updatedAt: messageRow.updatedAt,
      reference: messageRow.reference,
      authorCourseParticipant:
        messageRow.authorCourseParticipantId !== null &&
        messageRow.authorUserId !== null &&
        messageRow.authorUserLastSeenOnlineAt !== null &&
        messageRow.authorUserReference !== null &&
        messageRow.authorUserEmail !== null &&
        messageRow.authorUserName !== null &&
        messageRow.authorUserAvatarlessBackgroundColors !== null &&
        messageRow.authorCourseParticipantReference !== null &&
        messageRow.authorCourseParticipantCourseRole !== null
          ? {
              id: messageRow.authorCourseParticipantId,
              user: {
                id: messageRow.authorUserId,
                lastSeenOnlineAt: messageRow.authorUserLastSeenOnlineAt,
                reference: messageRow.authorUserReference,
                email: messageRow.authorUserEmail,
                name: messageRow.authorUserName,
                avatar: messageRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  messageRow.authorUserAvatarlessBackgroundColors,
                biographySource: messageRow.authorUserBiographySource,
                biographyPreprocessed:
                  messageRow.authorUserBiographyPreprocessed,
              },
              reference: messageRow.authorCourseParticipantReference,
              courseRole: messageRow.authorCourseParticipantCourseRole,
            }
          : null,
      authorAITeachingAssistantAt: messageRow.authorAITeachingAssistantAt,
      anonymousAt: messageRow.anonymousAt,
      type: messageRow.type,
      contentSource: messageRow.contentSource,
      contentPreprocessed: messageRow.contentPreprocessed,
      contentSearch: messageRow.contentSearch,
      reading:
        messageRow.readingId === null ? null : { id: messageRow.readingId },
    };

    const readings = application.database
      .all<{
        id: number;
        createdAt: string;
        courseParticipantId: number | null;
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
        courseParticipantReference: string | null;
        courseParticipantCourseRole:
          | Application["web"]["locals"]["helpers"]["courseRoles"][number]
          | null;
      }>(
        sql`
          SELECT
            "readings"."id",
            "readings"."createdAt",
            "courseParticipants"."id" AS "courseParticipantId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "courseParticipants"."reference" AS "courseParticipantReference",
            "courseParticipants"."courseRole" AS "courseParticipantCourseRole"
          FROM "readings"
          JOIN "courseParticipants" ON "readings"."courseParticipant" = "courseParticipants"."id"
          JOIN "users" ON "courseParticipants"."user" = "users"."id"
          WHERE "readings"."message" = ${message.id}
          ORDER BY "readings"."id" ASC
        `,
      )
      .map((readingRow) => ({
        id: readingRow.id,
        createdAt: readingRow.createdAt,
        courseParticipant:
          readingRow.courseParticipantId !== null &&
          readingRow.userId !== null &&
          readingRow.userLastSeenOnlineAt !== null &&
          readingRow.userReference !== null &&
          readingRow.userEmail !== null &&
          readingRow.userName !== null &&
          readingRow.userAvatarlessBackgroundColor !== null &&
          readingRow.courseParticipantReference !== null &&
          readingRow.courseParticipantCourseRole !== null
            ? {
                id: readingRow.courseParticipantId,
                user: {
                  id: readingRow.userId,
                  lastSeenOnlineAt: readingRow.userLastSeenOnlineAt,
                  reference: readingRow.userReference,
                  email: readingRow.userEmail,
                  name: readingRow.userName,
                  avatar: readingRow.userAvatar,
                  avatarlessBackgroundColor:
                    readingRow.userAvatarlessBackgroundColor,
                  biographySource: readingRow.userBiographySource,
                  biographyPreprocessed: readingRow.userBiographyPreprocessed,
                },
                reference: readingRow.courseParticipantReference,
                courseRole: readingRow.courseParticipantCourseRole,
              }
            : null,
      }));

    const endorsements = application.database
      .all<{
        id: number;
        courseParticipantId: number | null;
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
        courseParticipantReference: string | null;
        courseParticipantCourseRole:
          | Application["web"]["locals"]["helpers"]["courseRoles"][number]
          | null;
      }>(
        sql`
          SELECT
            "endorsements"."id",
            "courseParticipants"."id" AS "courseParticipantId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "courseParticipants"."reference" AS "courseParticipantReference",
            "courseParticipants"."courseRole" AS "courseParticipantCourseRole"
          FROM "endorsements"
          JOIN "courseParticipants" ON "endorsements"."courseParticipant" = "courseParticipants"."id"
          JOIN "users" ON "courseParticipants"."user" = "users"."id"
          WHERE "endorsements"."message" = ${message.id}
          ORDER BY "endorsements"."id" ASC
        `,
      )
      .map((endorsementRow) => ({
        id: endorsementRow.id,
        courseParticipant:
          endorsementRow.courseParticipantId !== null &&
          endorsementRow.userId !== null &&
          endorsementRow.userLastSeenOnlineAt !== null &&
          endorsementRow.userReference !== null &&
          endorsementRow.userEmail !== null &&
          endorsementRow.userName !== null &&
          endorsementRow.userAvatarlessBackgroundColor !== null &&
          endorsementRow.courseParticipantReference !== null &&
          endorsementRow.courseParticipantCourseRole !== null
            ? {
                id: endorsementRow.courseParticipantId,
                user: {
                  id: endorsementRow.userId,
                  lastSeenOnlineAt: endorsementRow.userLastSeenOnlineAt,
                  reference: endorsementRow.userReference,
                  email: endorsementRow.userEmail,
                  name: endorsementRow.userName,
                  avatar: endorsementRow.userAvatar,
                  avatarlessBackgroundColor:
                    endorsementRow.userAvatarlessBackgroundColor,
                  biographySource: endorsementRow.userBiographySource,
                  biographyPreprocessed:
                    endorsementRow.userBiographyPreprocessed,
                },
                reference: endorsementRow.courseParticipantReference,
                courseRole: endorsementRow.courseParticipantCourseRole,
              }
            : null,
      }));

    const likes = application.database
      .all<{
        id: number;
        createdAt: string;
        courseParticipantId: number | null;
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
        courseParticipantReference: string | null;
        courseParticipantCourseRole:
          | Application["web"]["locals"]["helpers"]["courseRoles"][number]
          | null;
      }>(
        sql`
          SELECT
            "likes"."id",
            "likes"."createdAt",
            "courseParticipants"."id" AS "courseParticipantId",
            "users"."id" AS "userId",
            "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
            "users"."reference" AS "userReference",
            "users"."email" AS "userEmail",
            "users"."name" AS "userName",
            "users"."avatar" AS "userAvatar",
            "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
            "users"."biographySource" AS "userBiographySource",
            "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
            "courseParticipants"."reference" AS "courseParticipantReference",
            "courseParticipants"."courseRole" AS "courseParticipantCourseRole"
          FROM "likes"
          LEFT JOIN "courseParticipants" ON "likes"."courseParticipant" = "courseParticipants"."id"
          LEFT JOIN "users" ON "courseParticipants"."user" = "users"."id"
          WHERE "likes"."message" = ${message.id}
          ORDER BY "likes"."id" ASC
        `,
      )
      .map((likeRow) => ({
        id: likeRow.id,
        createdAt: likeRow.createdAt,
        courseParticipant:
          likeRow.courseParticipantId !== null &&
          likeRow.userId !== null &&
          likeRow.userLastSeenOnlineAt !== null &&
          likeRow.userReference !== null &&
          likeRow.userEmail !== null &&
          likeRow.userName !== null &&
          likeRow.userAvatarlessBackgroundColor !== null &&
          likeRow.courseParticipantReference !== null &&
          likeRow.courseParticipantCourseRole !== null
            ? {
                id: likeRow.courseParticipantId,
                user: {
                  id: likeRow.userId,
                  lastSeenOnlineAt: likeRow.userLastSeenOnlineAt,
                  reference: likeRow.userReference,
                  email: likeRow.userEmail,
                  name: likeRow.userName,
                  avatar: likeRow.userAvatar,
                  avatarlessBackgroundColor:
                    likeRow.userAvatarlessBackgroundColor,
                  biographySource: likeRow.userBiographySource,
                  biographyPreprocessed: likeRow.userBiographyPreprocessed,
                },
                reference: likeRow.courseParticipantReference,
                courseRole: likeRow.courseParticipantCourseRole,
              }
            : null,
      }));

    return {
      ...message,
      readings,
      endorsements,
      likes,
    };
  };

  application.web.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    { conversations?: object; messages?: object },
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/actions",
    (request, response, next) => {
      if (response.locals.message === undefined) return next();

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            <h3 class="heading">
              <i class="bi bi-chat-text-fill"></i>
              Message
              #${response.locals.conversation.reference}/${response.locals
                .message.reference}
            </h3>

            <div class="dropdown--menu">
              $${response.locals.conversation.type === "chat" &&
              response.locals.message.likes.length === 0
                ? html`
                    <form
                      method="POST"
                      action="https://${application.configuration
                        .hostname}/courses/${response.locals.course
                        .reference}/conversations/${response.locals.conversation
                        .reference}/messages/${response.locals.message
                        .reference}/likes${qs.stringify(
                        {
                          conversations: request.query.conversations,
                          messages: request.query.messages,
                        },
                        {
                          addQueryPrefix: true,
                        },
                      )}"
                    >
                      <button
                        class="dropdown--menu--item button button--transparent"
                      >
                        <i class="bi bi-hand-thumbs-up"></i>
                        Like
                      </button>
                    </form>
                  `
                : html``}

              <button
                class="dropdown--menu--item button button--transparent"
                javascript="${javascript`
                  this.onclick = () => {
                    const content = this.closest("[data-content-source]").getAttribute("data-content-source");
                    const newMessage = document.querySelector('[key="new-message"]');
                    newMessage.querySelector('[key="content-editor--button--write"]')?.click();
                    const element = newMessage.querySelector('[key="content-editor--write--textarea"]');
                    textFieldEdit.wrapSelection(
                      element,
                      ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                        response.locals.message.authorCourseParticipant === null
                          ? ``
                          : `@${
                              response.locals.message.anonymousAt === null
                                ? `${
                                    response.locals.message
                                      .authorCourseParticipant.reference
                                  }--${slugify(
                                    response.locals.message
                                      .authorCourseParticipant.user.name,
                                  )}`
                                : `anonymous`
                            } · `
                      } + "#" + ${
                        response.locals.conversation.reference
                      } + "/" + ${
                        response.locals.message.reference
                      } + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n",
                      ""
                    );
                    element.focus();
                    tippy.hideAll();
                  };
                `}"
              >
                <i class="bi bi-reply"></i>
                Reply
              </button>

              $${response.locals.courseParticipant.courseRole ===
                "course-staff" && response.locals.conversation.type === "chat"
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
                          leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/${response.locals.message.reference}/views`}, { cache: "no-store" })).text());
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
                      ${response.locals.message.readings.length.toString()}
                      Views
                    </button>
                  `
                : html``}

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
                    await navigator.clipboard.writeText(${`https://${
                      application.configuration.hostname
                    }/courses/${
                      response.locals.course.reference
                    }/conversations/${
                      response.locals.conversation.reference
                    }${qs.stringify(
                      {
                        messages: {
                          messageReference: response.locals.message.reference,
                        },
                      },
                      {
                        addQueryPrefix: true,
                      },
                    )}`});
                    this.copied.show();
                    await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                    this.copied.hide();
                  };
                `}"
              >
                <i class="bi bi-link"></i>
                Copy Message Permanent Link
              </button>

              $${application.web.locals.helpers.mayEditMessage({
                request,
                response,
                message: response.locals.message,
              })
                ? html`
                    <button
                      class="dropdown--menu--item button button--transparent"
                      javascript="${javascript`
                        this.onmouseenter = this.onfocus = async () => {
                          const messageEdit = this.closest('[key^="message/"]').querySelector('[key="message--edit"]');
                          const messageEditForm = messageEdit.querySelector('[key="form"]');
                          if (messageEditForm.skipLoading === true) return;
                          messageEditForm.skipLoading = true;
                          leafac.loadPartial(messageEditForm, await (await fetch(${`https://${
                            application.configuration.hostname
                          }/courses/${
                            response.locals.course.reference
                          }/conversations/${
                            response.locals.conversation.reference
                          }/messages/${
                            response.locals.message.reference
                          }/edit${qs.stringify(
                            {
                              conversations: request.query.conversations,
                              messages: request.query.messages,
                            },
                            { addQueryPrefix: true },
                          )}`}, { cache: "no-store" })).text());
                          messageEdit.querySelector('[key="loading"]').hidden = true;
                          messageEdit.querySelector('[key="form"]').hidden = false;
                          autosize.update(this.closest('[key^="message/"]')?.querySelector('[key="message--edit"] [key="content-editor--write--textarea"]'));
                        };

                        this.onclick = () => {
                          this.closest('[key^="message/"]').querySelector('[key="message--show"]').hidden = true;
                          this.closest('[key^="message/"]').querySelector('[key="message--edit"]').hidden = false;
                          autosize.update(this.closest('[key^="message/"]').querySelector('[key="message--edit"] [key="content-editor--write--textarea"]'));
                          tippy.hideAll();
                        };
                      `}"
                    >
                      <i class="bi bi-pencil"></i>
                      Edit Message
                    </button>
                  `
                : html``}
              $${response.locals.message.authorCourseParticipant !== null &&
              response.locals.message.authorCourseParticipant.courseRole ===
                "student" &&
              application.web.locals.helpers.mayEditMessage({
                request,
                response,
                message: response.locals.message,
              })
                ? html`
                    <form
                      method="PATCH"
                      action="https://${application.configuration
                        .hostname}/courses/${response.locals.course
                        .reference}/conversations/${response.locals.conversation
                        .reference}/messages/${response.locals.message
                        .reference}${qs.stringify(
                        {
                          conversations: request.query.conversations,
                          messages: request.query.messages,
                        },
                        {
                          addQueryPrefix: true,
                        },
                      )}"
                      class="dropdown--menu"
                    >
                      $${response.locals.message.anonymousAt === null
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
                                  margin-left: var(--space---0-5);
                                `}"
                              >
                                $${application.web.locals.partials.user({
                                  request,
                                  response,
                                  name: false,
                                  size: "xs",
                                })}
                              </span>
                              Set as Anonymous to Other Students
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
                                  margin-left: var(--space---0-5);
                                `}"
                              >
                                $${application.web.locals.partials.user({
                                  request,
                                  response,
                                  user: response.locals.message
                                    .authorCourseParticipant.user,
                                  decorate: false,
                                  name: false,
                                  size: "xs",
                                })}
                              </span>
                              Set as Signed by
                              ${response.locals.message.authorCourseParticipant
                                .id === response.locals.courseParticipant.id
                                ? "You"
                                : response.locals.message
                                    .authorCourseParticipant.user.name}
                            </button>
                          `}
                    </form>
                  `
                : html``}
              $${response.locals.courseParticipant.courseRole ===
                "course-staff" && response.locals.courseParticipants.length > 1
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
                          leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}/messages/${response.locals.message.reference}/reuse`}, { cache: "no-store" })).text());
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
                      Reuse Message in Another Course
                    </button>
                  `
                : html``}
              $${response.locals.courseParticipant.courseRole === "course-staff"
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
                                  action="https://${application.configuration
                                    .hostname}/courses/${response.locals.course
                                    .reference}/conversations/${response.locals
                                    .conversation.reference}/messages/${response
                                    .locals.message.reference}${qs.stringify(
                                    {
                                      conversations:
                                        request.query.conversations,
                                      messages: request.query.messages,
                                    },
                                    {
                                      addQueryPrefix: true,
                                    },
                                  )}"
                                  css="${css`
                                    padding: var(--space--2);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `}"
                                >
                                  <p>
                                    Are you sure you want to remove this
                                    message?
                                  </p>
                                  <p>
                                    <strong
                                      css="${css`
                                        font-weight: var(--font-weight--bold);
                                      `}"
                                    >
                                      You may not undo this action!
                                    </strong>
                                  </p>
                                  <button class="button button--rose">
                                    <i class="bi bi-trash-fill"></i>
                                    Remove Message
                                  </button>
                                </form>
                              `},  
                            },
                          });
                        `}"
                      >
                        <i class="bi bi-trash"></i>
                        Remove Message
                      </button>
                    </div>
                  `
                : html``}
            </div>
          `,
        }),
      );
    },
  );

  application.web.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    { conversations?: object; messages?: object },
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/edit",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        !application.web.locals.helpers.mayEditMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            <form
              method="PATCH"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/conversations/${response.locals.conversation
                .reference}/messages/${response.locals.message
                .reference}${qs.stringify(
                {
                  conversations: request.query.conversations,
                  messages: request.query.messages,
                },
                { addQueryPrefix: true },
              )}"
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              $${application.web.locals.partials.contentEditor({
                request,
                response,
                contentSource: response.locals.message.contentSource,
                compact: response.locals.conversation.type === "chat",
              })}

              <div
                css="${css`
                  display: flex;
                  gap: var(--space--2);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `}"
              >
                <button
                  class="button button--blue"
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
                  `}"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Message
                </button>
                <button
                  type="reset"
                  class="button button--transparent"
                  javascript="${javascript`
                    this.onclick = () => {
                      this.closest('[key^="message/"]').querySelector('[key="message--show"]').hidden = false;
                      this.closest('[key^="message/"]').querySelector('[key="message--edit"]').hidden = true;

                      const messageEdit = this.closest('[key^="message/"]').querySelector('[key="message--edit"]');
                      messageEdit.querySelector('[key="loading"]').hidden = false;
                      messageEdit.querySelector('[key="form"]').hidden = true;
                      messageEdit.querySelector('[key="form"]').skipLoading = false;
                    };
                  `}"
                >
                  <i class="bi bi-x-lg"></i>
                  Cancel
                </button>
              </div>
            </form>
          `,
        }),
      );
    },
  );

  application.web.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/views",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

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
              $${response.locals.message.readings.reverse().map(
                (reading) => html`
                  <div
                    key="reading/${reading.courseParticipant === null
                      ? "no-longer-participating"
                      : reading.courseParticipant.reference}"
                    class="dropdown--menu--item"
                  >
                    $${application.web.locals.partials.user({
                      request,
                      response,
                      courseParticipant: reading.courseParticipant,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `}"
                    >
                      <time
                        datetime="${new Date(reading.createdAt).toISOString()}"
                        javascript="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                      ></time>
                    </span>
                  </div>
                `,
              )}
            </div>
          `,
        }),
      );
    },
  );

  application.web.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { content?: string },
    {},
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/draft",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      if (typeof request.body.content !== "string") return next("Validation");

      const removeDraft = request.body.content.trim() === "";

      if (
        removeDraft ||
        application.database.get<{}>(
          sql`
            SELECT TRUE
            FROM "messageDrafts"
            WHERE
              "conversation" = ${response.locals.conversation.id} AND
              "authorCourseParticipant" = ${
                response.locals.courseParticipant.id
              } AND
              ${new Date(
                Date.now() - 5 * 60 * 1000,
              ).toISOString()} < "createdAt"
          `,
        ) === undefined
      )
        application.web.locals.helpers.liveUpdates({
          request,
          response,
          url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
        });

      if (removeDraft)
        application.database.run(
          sql`
            DELETE FROM "messageDrafts"
            WHERE
              "conversation" = ${response.locals.conversation.id} AND
              "authorCourseParticipant" = ${response.locals.courseParticipant.id}
          `,
        );
      else
        application.database.run(
          sql`
            INSERT INTO "messageDrafts" (
              "createdAt",
              "conversation",
              "authorCourseParticipant",
              "contentSource"
            )
            VALUES (
              ${new Date().toISOString()},
              ${response.locals.conversation.id},
              ${response.locals.courseParticipant.id},
              ${request.body.content}
            )
          `,
        );

      response.end();
    },
  );

  application.web.post<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      content?: string;
      isAnonymous?: "on";
      type?: "answer" | "follow-up-question" | "course-staff-whisper";
    },
    {
      conversations?: object;
      messages?: object;
    },
    Application["web"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        ![undefined, "on"].includes(request.body.isAnonymous) ||
        (request.body.isAnonymous === "on" &&
          response.locals.courseParticipant.courseRole === "course-staff") ||
        ![
          undefined,
          "answer",
          "follow-up-question",
          "course-staff-whisper",
        ].includes(request.body.type) ||
        (request.body.type === "answer" &&
          response.locals.conversation.type !== "question") ||
        (request.body.type === "follow-up-question" &&
          (response.locals.conversation.type !== "question" ||
            response.locals.courseParticipant.courseRole !== "student")) ||
        (request.body.type === "course-staff-whisper" &&
          (response.locals.conversation.type === "chat" ||
            response.locals.courseParticipant.courseRole !== "course-staff"))
      )
        return next("Validation");

      const mostRecentMessage = application.web.locals.helpers.getMessage({
        request,
        response,
        conversation: response.locals.conversation,
        messageReference: String(
          response.locals.conversation.nextMessageReference - 1,
        ),
      });
      let message: { id: number; reference: string };
      if (
        response.locals.conversation.type === "chat" &&
        mostRecentMessage !== undefined &&
        mostRecentMessage.authorCourseParticipant !== null &&
        response.locals.courseParticipant.id ===
          mostRecentMessage.authorCourseParticipant.id &&
        mostRecentMessage.anonymousAt === null &&
        request.body.isAnonymous !== "on" &&
        new Date().getTime() - new Date(mostRecentMessage.createdAt).getTime() <
          5 * 60 * 1000
      ) {
        const contentSource = `${mostRecentMessage.contentSource}\n\n${request.body.content}`;
        const contentPreprocessed =
          application.web.locals.partials.contentPreprocessed(contentSource);

        application.database.executeTransaction(() => {
          application.database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${response.locals.conversation.id}
            `,
          );
          application.database.run(
            sql`
              UPDATE "messages"
              SET
                "contentSource" = ${contentSource},
                "contentPreprocessed" = ${contentPreprocessed.contentPreprocessed},
                "contentSearch" = ${contentPreprocessed.contentSearch}
              WHERE "id" = ${mostRecentMessage.id}
            `,
          );
          message = mostRecentMessage;
          application.database.run(
            sql`
              DELETE FROM "readings"
              WHERE
                "message" = ${mostRecentMessage.id} AND
                "courseParticipant" != ${response.locals.courseParticipant.id}
            `,
          );
        });
      } else {
        const contentPreprocessed =
          application.web.locals.partials.contentPreprocessed(
            request.body.content,
          );

        application.database.executeTransaction(() => {
          application.database.run(
            sql`
              UPDATE "conversations"
              SET
                $${
                  request.body.type !== "course-staff-whisper"
                    ? sql`
                        "updatedAt" = ${new Date().toISOString()},
                      `
                    : sql``
                }
                "nextMessageReference" = ${
                  response.locals.conversation.nextMessageReference + 1
                }
                $${
                  request.body.type === "answer" &&
                  response.locals.courseParticipant.courseRole ===
                    "course-staff" &&
                  response.locals.conversation.resolvedAt === null
                    ? sql`,
                        "resolvedAt" = ${new Date().toISOString()}
                      `
                    : request.body.type === "follow-up-question"
                    ? sql`,
                        "resolvedAt" = ${null}
                      `
                    : sql``
                }
              WHERE "id" = ${response.locals.conversation.id}
            `,
          );
          message = application.database.get<{
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
                      "authorCourseParticipant",
                      "anonymousAt",
                      "type",
                      "contentSource",
                      "contentPreprocessed",
                      "contentSearch"
                    )
                    VALUES (
                      ${new Date().toISOString()},
                      ${response.locals.conversation.id},
                      ${String(
                        response.locals.conversation.nextMessageReference,
                      )},
                      ${response.locals.courseParticipant.id},
                      ${
                        request.body.isAnonymous === "on"
                          ? new Date().toISOString()
                          : null
                      },
                      ${request.body.type ?? "message"},
                      ${request.body.content},
                      ${contentPreprocessed.contentPreprocessed},
                      ${contentPreprocessed.contentSearch}
                    )
                  `,
                ).lastInsertRowid
              }
            `,
          )!;
          application.database.run(
            sql`
              INSERT INTO "readings" ("createdAt", "message", "courseParticipant")
              VALUES (
                ${new Date().toISOString()},
                ${message.id},
                ${response.locals.courseParticipant.id}
              )
            `,
          );
        });
      }
      application.database.run(
        sql`
          DELETE FROM "messageDrafts"
          WHERE
            "conversation" = ${response.locals.conversation.id} AND
            "authorCourseParticipant" = ${response.locals.courseParticipant.id}
        `,
      );
      application.web.locals.helpers.emailNotifications({
        request,
        response,
        message: application.web.locals.helpers.getMessage({
          request,
          response,
          conversation: response.locals.conversation,
          messageReference: message!.reference,
        })!,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/${response.locals.conversation.reference}${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.locals.helpers.mayEditMessage = ({
    request,
    response,
    message,
  }) =>
    response.locals.courseParticipant.courseRole === "course-staff" ||
    (message.authorCourseParticipant !== null &&
      message.authorCourseParticipant.id ===
        response.locals.courseParticipant.id);

  application.web.patch<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {
      type?: "message" | "answer" | "follow-up-question";
      isAnonymous?: "true" | "false";
      content?: string;
    },
    {
      conversations?: object;
      messages?: object;
    },
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        !application.web.locals.helpers.mayEditMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      if (typeof request.body.type === "string")
        if (
          !["message", "answer", "follow-up-question"].includes(
            request.body.type,
          ) ||
          response.locals.message.reference === "1" ||
          response.locals.conversation.type !== "question" ||
          response.locals.message.type === "course-staff-whisper"
        )
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "messages"
              SET "type" = ${request.body.type}
              WHERE "id" = ${response.locals.message.id}
            `,
          );

      if (typeof request.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(request.body.isAnonymous) ||
          response.locals.message.authorCourseParticipant === null ||
          response.locals.message.authorCourseParticipant.courseRole ===
            "course-staff"
        )
          return next("Validation");
        else
          application.database.executeTransaction(() => {
            application.database.run(
              sql`
                UPDATE "messages"
                SET "anonymousAt" = ${
                  request.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE "id" = ${response.locals.message.id}
              `,
            );
            if (
              response.locals.message.reference === "1" &&
              response.locals.conversation.authorCourseParticipant !== null &&
              response.locals.message.authorCourseParticipant !== null &&
              response.locals.conversation.authorCourseParticipant.id ===
                response.locals.message.authorCourseParticipant.id
            )
              application.database.run(
                sql`
                  UPDATE "conversations"
                  SET "anonymousAt" = ${
                    request.body.isAnonymous === "true"
                      ? new Date().toISOString()
                      : null
                  }
                  WHERE "id" = ${response.locals.conversation.id}
                `,
              );
          });

      if (typeof request.body.content === "string") {
        if (request.body.content.trim() === "") return next("Validation");
        const contentPreprocessed =
          application.web.locals.partials.contentPreprocessed(
            request.body.content,
          );

        application.database.executeTransaction(() => {
          application.database.run(
            sql`
              UPDATE "messages"
              SET
                "contentSource" = ${request.body.content},
                "contentPreprocessed" = ${
                  contentPreprocessed.contentPreprocessed
                },
                "contentSearch" = ${contentPreprocessed.contentSearch},
                "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${response.locals.message.id}
            `,
          );
          if (response.locals.message.type !== "course-staff-whisper")
            application.database.run(
              sql`
                UPDATE "conversations"
                SET "updatedAt" = ${new Date().toISOString()}
                WHERE "id" = ${response.locals.conversation.id}
              `,
            );
        });

        application.web.locals.helpers.emailNotifications({
          request,
          response,
          message: response.locals.message,
        });
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.course.reference
        }/conversations/${response.locals.conversation.reference}${qs.stringify(
          {
            conversations: request.query.conversations,
            messages: request.query.messages,
          },
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/reuse",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff" ||
        response.locals.courseParticipants.length === 1
      )
        return next();

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
              $${application.web.locals.partials.courses({
                request,
                response,
                hrefSuffix: `/conversations/new/${
                  response.locals.conversation.type
                }${qs.stringify(
                  {
                    newConversation: {
                      title: response.locals.conversation.title,
                      content:
                        response.locals.message.authorCourseParticipant !==
                          null &&
                        response.locals.message.authorCourseParticipant.id !==
                          response.locals.courseParticipant.id &&
                        !(
                          response.locals.message.authorCourseParticipant
                            .courseRole === "student" &&
                          response.locals.message.anonymousAt !== null
                        )
                          ? `> Original author: ${response.locals.message.authorCourseParticipant.user.name}\n\n${response.locals.message.contentSource}`
                          : response.locals.message.contentSource,
                      isAnnouncement:
                        response.locals.conversation.announcementAt !== null,
                      isPinned: response.locals.conversation.pinnedAt !== null,
                    },
                  },
                  { addQueryPrefix: true },
                )}`,
              })}
            </div>
          `,
        }),
      );
    },
  );

  application.web.delete<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      application.database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${response.locals.message.id}`,
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
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    },
  );

  application.web.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    (request, response, next) => {
      if (response.locals.message === undefined) return next();

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
              $${response.locals.message.likes.reverse().map(
                (like) => html`
                  <div
                    key="like/${like.courseParticipant === null
                      ? "no-longer-participating"
                      : like.courseParticipant.reference}"
                    class="dropdown--menu--item"
                  >
                    $${application.web.locals.partials.user({
                      request,
                      response,
                      courseParticipant: like.courseParticipant,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `}"
                    >
                      <time
                        datetime="${new Date(like.createdAt).toISOString()}"
                        javascript="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                      ></time>
                    </span>
                  </div>
                `,
              )}
            </div>
          `,
        }),
      );
    },
  );

  application.web.post<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    (request, response, next) => {
      if (response.locals.message === undefined) return next();

      if (
        response.locals.message.likes.some(
          (like) =>
            like.courseParticipant !== null &&
            like.courseParticipant.id === response.locals.courseParticipant.id,
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          INSERT INTO "likes" ("createdAt", "message", "courseParticipant")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.message.id},
            ${response.locals.courseParticipant.id}
          )
        `,
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
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    },
  );

  application.web.delete<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    (request, response, next) => {
      if (response.locals.message === undefined) return next();

      const like = response.locals.message.likes.find(
        (like) =>
          like.courseParticipant !== null &&
          like.courseParticipant.id === response.locals.courseParticipant.id,
      );
      if (like === undefined) return next("Validation");

      application.database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `,
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
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    },
  );

  application.web.locals.helpers.mayEndorseMessage = ({
    request,
    response,
    message,
  }) =>
    response.locals.courseParticipant.courseRole === "course-staff" &&
    response.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.type === "answer" &&
    (message.authorCourseParticipant === null ||
      message.authorCourseParticipant.courseRole !== "course-staff");

  application.web.post<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        !application.web.locals.helpers.mayEndorseMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      if (
        response.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.courseParticipant !== null &&
            endorsement.courseParticipant.id ===
              response.locals.courseParticipant.id,
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          INSERT INTO "endorsements" ("createdAt", "message", "courseParticipant")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.message.id},
            ${response.locals.courseParticipant.id}
          )
        `,
      );
      if (response.locals.conversation.resolvedAt === null)
        application.database.run(
          sql`
            UPDATE "conversations"
            SET "resolvedAt" = ${new Date().toISOString()}
            WHERE "id" = ${response.locals.conversation.id}
          `,
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
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    },
  );

  application.web.delete<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        !application.web.locals.helpers.mayEndorseMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      const endorsement = response.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.courseParticipant !== null &&
          endorsement.courseParticipant.id ===
            response.locals.courseParticipant.id,
      );
      if (endorsement === undefined) return next("Validation");

      application.database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`,
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
          { addQueryPrefix: true },
        )}`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    },
  );

  application.web.locals.helpers.emailNotifications = ({
    request,
    response,
    message,
  }) => {
    application.database.executeTransaction(() => {
      const job = application.database.get<{ id: number }>(
        sql`
          SELECT "id"
          FROM "emailNotificationMessageJobs"
          WHERE
            "message" = ${message.id} AND
            "startedAt" IS NULL
        `,
      );
      if (job === undefined)
        application.database.run(
          sql`
            INSERT INTO "emailNotificationMessageJobs" (
              "createdAt",
              "startAt",
              "message"
            )
            VALUES (
              ${new Date().toISOString()},
              ${
                new Date().toISOString(/* TODO: Email notification digests: Date.now() + 5 * 60 * 1000 */)
              },
              ${message.id}
            )
          `,
        );
      else
        application.database.run(
          sql`
            UPDATE "emailNotificationMessageJobs"
            SET
              "createdAt" = ${new Date().toISOString()},
              "startAt" = ${
                new Date().toISOString(/* TODO: Email notification digests: Date.now() + 5 * 60 * 1000 */)
              }
            WHERE "id" = ${job.id}
          `,
        );

      application.database.run(
        sql`
          INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "courseParticipant")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${response.locals.courseParticipant.id}
          )
        `,
      );
      if (message.authorCourseParticipant !== null)
        application.database.run(
          sql`
            INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "courseParticipant")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${message.authorCourseParticipant.id}
            )
          `,
        );
    });
  };

  application.workerEvents.once("start", async () => {
    while (true) {
      application.log("emailNotificationMessageJobs", "STARTING...");

      application.database.executeTransaction(() => {
        for (const job of application.database.all<{
          id: number;
          message: number;
        }>(
          sql`
            SELECT "id", "message"
            FROM "emailNotificationMessageJobs"
            WHERE "createdAt" < ${new Date(
              Date.now() - 20 * 60 * 1000,
            ).toISOString()}
          `,
        )) {
          application.database.run(
            sql`
              DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "emailNotificationMessageJobs",
            "EXPIRED",
            `message = ${job.message}`,
          );
        }
      });

      application.database.executeTransaction(() => {
        for (const job of application.database.all<{
          id: number;
          message: number;
        }>(
          sql`
            SELECT "id", "message"
            FROM "emailNotificationMessageJobs"
            WHERE "startedAt" < ${new Date(
              Date.now() - 2 * 60 * 1000,
            ).toISOString()}
          `,
        )) {
          application.database.run(
            sql`
              UPDATE "emailNotificationMessageJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "emailNotificationMessageJobs",
            "TIMED OUT",
            `message = ${job.message}`,
          );
        }
      });

      while (true) {
        const job = application.database.executeTransaction(() => {
          const job = application.database.get<{
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
            `,
          );
          if (job !== undefined)
            application.database.run(
              sql`
                UPDATE "emailNotificationMessageJobs"
                SET "startedAt" = ${new Date().toISOString()}
                WHERE "id" = ${job.id}
              `,
            );
          return job;
        });
        if (job === undefined) break;

        const messageRow = application.database.get<{
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
          conversationParticipants: Application["web"]["locals"]["helpers"]["conversationParticipantses"][number];
          conversationType: Application["web"]["locals"]["helpers"]["conversationTypes"][number];
          conversationAnnouncementAt: string | null;
          conversationTitle: string;
          reference: string;
          authorUserName: string | null;
          anonymousAt: string | null;
          type: NonNullable<
            ReturnType<Application["web"]["locals"]["helpers"]["getMessage"]>
          >["type"];
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
              "messages"."type",
              "messages"."contentPreprocessed"
            FROM "messages"
            JOIN "conversations" ON "messages"."conversation" = "conversations"."id"
            JOIN "courses" ON "conversations"."course" = "courses"."id"
            LEFT JOIN "courseParticipants" AS "authorCourseParticipant" ON "messages"."authorCourseParticipant" = "authorCourseParticipant"."id"
            LEFT JOIN "users" AS "authorUser" ON "authorCourseParticipant"."user" = "authorUser"."id"
            WHERE "messages"."id" = ${job.message}
          `,
        )!;
        const message = {
          id: messageRow.id,
          reference: messageRow.reference,
          courseParticipant:
            messageRow.authorUserName !== null
              ? {
                  user: {
                    name: messageRow.authorUserName,
                  },
                }
              : null,
          anonymousAt: messageRow.anonymousAt,
          type: messageRow.type,
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
          nextConversationReference: messageRow.courseNextConversationReference,
        };
        const contentProcessed = application.web.locals.partials.content({
          request: {
            originalUrl: "/",
            query: {},
          } as Parameters<
            typeof application.web.locals.partials.content
          >[0]["request"],
          response: {
            locals: {
              user: {},
              courseParticipant: {},
              course,
            },
          } as Parameters<
            typeof application.web.locals.partials.content
          >[0]["response"],
          contentPreprocessed: message.contentPreprocessed,
        });

        const courseParticipants = application.database.all<{
          id: number;
          userId: number;
          userEmail: string;
          userEmailNotificationsForAllMessages: Application["web"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
          reference: string;
          courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        }>(
          sql`
            SELECT
              "courseParticipants"."id",
              "users"."id" AS "userId",
              "users"."email" AS "userEmail",
              "users"."emailNotificationsForAllMessages" AS "userEmailNotificationsForAllMessages",
              "courseParticipants"."reference",
              "courseParticipants"."courseRole"
            FROM "courseParticipants"
            JOIN "users" ON
              "courseParticipants"."user" = "users"."id" AND
              "users"."emailVerifiedAt" IS NOT NULL
            WHERE
              "courseParticipants"."course" = ${course.id} AND
              NOT EXISTS(
                SELECT TRUE
                FROM "emailNotificationDeliveries"
                WHERE
                  "courseParticipants"."id" = "emailNotificationDeliveries"."courseParticipant" AND
                  "emailNotificationDeliveries"."message" = ${message.id}
              ) $${
                message.type === "course-staff-whisper"
                  ? sql`
                      AND "courseParticipants"."courseRole" = 'course-staff'
                    `
                  : sql``
              } $${
                conversation.participants === "everyone"
                  ? sql``
                  : conversation.participants === "course-staff"
                  ? sql`
                  AND (
                    "courseParticipants"."courseRole" = 'course-staff' OR EXISTS(
                      SELECT TRUE
                      FROM "conversationSelectedParticipants"
                      WHERE
                        "conversationSelectedParticipants"."conversation" = ${conversation.id} AND
                        "conversationSelectedParticipants"."courseParticipant" = "courseParticipants"."id"
                    )
                  )
                `
                  : conversation.participants === "selected-participants"
                  ? sql`
                  AND EXISTS(
                    SELECT TRUE
                    FROM "conversationSelectedParticipants"
                    WHERE
                      "conversationSelectedParticipants"."conversation" = ${conversation.id} AND
                      "conversationSelectedParticipants"."courseParticipant" = "courseParticipants"."id"
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
                            : contentProcessed.mentions.has("course-staff")
                            ? sql`
                                AND (
                                  "courseParticipants"."courseRole" = 'course-staff' OR
                                  "courseParticipants"."reference" IN ${contentProcessed.mentions}
                                )
                              `
                            : contentProcessed.mentions.has("students")
                            ? sql`
                                AND (
                                  "courseParticipants"."courseRole" = 'student' OR
                                  "courseParticipants"."reference" IN ${contentProcessed.mentions}
                                )
                              `
                            : sql`
                                AND "courseParticipants"."reference" IN ${contentProcessed.mentions}
                              `
                        }
                    ) OR (
                      "users"."emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" IS NOT NULL AND EXISTS(
                        SELECT TRUE
                        FROM "messages"
                        WHERE
                          "messages"."conversation" = ${conversation.id} AND
                          "messages"."authorCourseParticipant" = "courseParticipants"."id"
                      )
                    ) OR (
                      "users"."emailNotificationsForMessagesInConversationsYouStartedAt" IS NOT NULL AND EXISTS(
                        SELECT TRUE
                        FROM "conversations"
                        WHERE
                          "conversations"."id" = ${conversation.id} AND
                          "conversations"."authorCourseParticipant" = "courseParticipants"."id"
                      )
                    )
                  )
                `
              }
          `,
        );

        for (const courseParticipant of courseParticipants) {
          // TODO: Email notification digests
          // switch (courseParticipant.userEmailNotificationsForAllMessages) {
          //   case "instant":
          //     break;

          //   case "hourly-digests":
          //   case "daily-digests":
          //     break;
          // }
          application.database.run(
            sql`
              INSERT INTO "sendEmailJobs" (
                "createdAt",
                "startAt",
                "mailOptions"
              )
              VALUES (
                ${new Date().toISOString()},
                ${new Date().toISOString()},
                ${JSON.stringify({
                  from: {
                    name: `${course.name} · ${application.configuration.email.defaults.from.name}`,
                    address:
                      application.configuration.email.defaults.from.address,
                  },
                  to: courseParticipant.userEmail,
                  inReplyTo: `courses/${course.reference}/conversations/${conversation.reference}@${application.configuration.hostname}`,
                  references: `courses/${course.reference}/conversations/${conversation.reference}@${application.configuration.hostname}`,
                  subject: conversation.title,
                  html: html`
                    <p>
                      <a
                        href="https://${application.configuration
                          .hostname}/courses/${course.reference}/conversations/${conversation.reference}${qs.stringify(
                          {
                            messages: {
                              messageReference: message.reference,
                            },
                          },
                          { addQueryPrefix: true },
                        )}"
                        >${message.courseParticipant === null
                          ? "Someone who is no longer participating"
                          : message.anonymousAt !== null
                          ? `Anonymous ${
                              courseParticipant.courseRole === "course-staff"
                                ? `(${message.courseParticipant.user.name})`
                                : ""
                            }`
                          : message.courseParticipant.user.name}
                        says</a
                      >:
                    </p>

                    <hr />

                    $${message.contentPreprocessed}

                    <hr />

                    <p>
                      <small>
                        <a
                          href="https://${application.configuration
                            .hostname}/settings/notifications"
                          >Change Notifications Preferences</a
                        >
                      </small>
                    </p>
                  `,
                })}
              )
            `,
          );

          application.database.run(
            sql`
              INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "courseParticipant")
              VALUES (
                ${new Date().toISOString()},
                ${message.id},
                ${courseParticipant.id}
              )
            `,
          );
        }

        application.database.run(
          sql`
            DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
          `,
        );

        application.log(
          "emailNotificationMessageJobs",
          "SUCCEEDED",
          `message = ${job.message}`,
        );

        await timers.setTimeout(100 + Math.random() * 100, undefined, {
          ref: false,
        });
      }

      application.log("emailNotificationMessageJobs", "FINISHED");

      await timers.setTimeout(
        2 * 60 * 1000 + Math.random() * 30 * 1000,
        undefined,
        { ref: false },
      );
    }
  });
};
