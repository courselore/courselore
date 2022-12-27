import timers from "node:timers/promises";
import express from "express";
import qs from "qs";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css, { localCSS } from "@leafac/css";
import javascript, { localJavaScript } from "@leafac/javascript";
import slugify from "@sindresorhus/slugify";
import { Application } from "./index.mjs";

export type ApplicationMessage = {
  server: {
    locals: {
      helpers: {
        getMessage({
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
            Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          conversation: NonNullable<
            ReturnType<
              Application["server"]["locals"]["helpers"]["getConversation"]
            >
          >;
          messageReference: string;
        }):
          | {
              id: number;
              createdAt: string;
              updatedAt: string | null;
              reference: string;
              authorEnrollment: Application["server"]["locals"]["Types"]["MaybeEnrollment"];
              anonymousAt: string | null;
              answerAt: string | null;
              contentSource: string;
              contentPreprocessed: HTML;
              contentSearch: string;
              reading: { id: number } | null;
              readings: {
                id: number;
                createdAt: string;
                enrollment: Application["server"]["locals"]["Types"]["MaybeEnrollment"];
              }[];
              endorsements: {
                id: number;
                enrollment: Application["server"]["locals"]["Types"]["MaybeEnrollment"];
              }[];
              likes: {
                id: number;
                createdAt: string;
                enrollment: Application["server"]["locals"]["Types"]["MaybeEnrollment"];
              }[];
            }
          | undefined;

        mayEditMessage({
          request,
          response,
          message,
        }: {
          request: express.Request<
            { courseReference: string; conversationReference: string },
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          message: NonNullable<
            ReturnType<Application["server"]["locals"]["helpers"]["getMessage"]>
          >;
        }): boolean;

        mayEndorseMessage({
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
            Application["server"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["Conversation"]
          >;
          message: NonNullable<
            ReturnType<Application["server"]["locals"]["helpers"]["getMessage"]>
          >;
        }): boolean;

        emailNotifications({
          request,
          response,
          message,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
          >;
          message: NonNullable<
            ReturnType<Application["server"]["locals"]["helpers"]["getMessage"]>
          >;
        }): void;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  type ResponseLocalsMessage =
    Application["server"]["locals"]["ResponseLocals"]["Conversation"] & {
      message: NonNullable<
        ReturnType<Application["server"]["locals"]["helpers"]["getMessage"]>
      >;
    };

  application.server.use<
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

      const message = application.server.locals.helpers.getMessage({
        request,
        response,
        conversation: response.locals.conversation,
        messageReference: request.params.messageReference,
      });
      if (message === undefined) return next();
      response.locals.message = message;

      next();
    }
  );

  application.server.locals.helpers.getMessage = ({
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
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserReference: string;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColors:
        | Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
        | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentCourseRole:
        | Application["server"]["locals"]["helpers"]["courseRoles"][number]
        | null;
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
          "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColors",
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
          "readings"."enrollment" = ${response.locals.enrollment.id}
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
        messageRow.authorUserAvatarlessBackgroundColors !== null &&
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
                  messageRow.authorUserAvatarlessBackgroundColors,
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

    const readings = application.database
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
        userAvatarlessBackgroundColor:
          | Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
          | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole:
          | Application["server"]["locals"]["helpers"]["courseRoles"][number]
          | null;
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

    const endorsements = application.database
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
          | Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
          | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole:
          | Application["server"]["locals"]["helpers"]["courseRoles"][number]
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

    const likes = application.database
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
        userAvatarlessBackgroundColor:
          | Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
          | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentCourseRole:
          | Application["server"]["locals"]["helpers"]["courseRoles"][number]
          | null;
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

  application.server.get<
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
        application.server.locals.layouts.partial({
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
                        }
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
                javascript="${response.locals.javascript(javascript`
                  this.onclick = () => {
                    const content = this.closest("[javascript-content-source]").getAttribute("javascript-content-source");
                    const newMessage = document.querySelector('[key="new-message"]');
                    newMessage.querySelector('[key="content-editor--button--write"]')?.click();
                    const element = newMessage.querySelector('[key="content-editor--write--textarea"]');
                    textFieldEdit.wrapSelection(
                      element,
                      ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                        response.locals.message.authorEnrollment ===
                        "no-longer-enrolled"
                          ? javascript``
                          : javascript`
                            "@${
                              response.locals.message.anonymousAt === null
                                ? `${
                                    response.locals.message.authorEnrollment
                                      .reference
                                  }--${slugify(
                                    response.locals.message.authorEnrollment
                                      .user.name
                                  )}`
                                : `anonymous`
                            } · " +
                          `
                      } "#" + ${JSON.stringify(
                  response.locals.conversation.reference
                )} + "/" + ${JSON.stringify(
                  response.locals.message.reference
                )} + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n",
                      ""
                    );
                    element.focus();
                    tippy.hideAll();
                  };
                `)}"
              >
                <i class="bi bi-reply"></i>
                Reply
              </button>

              $${response.locals.enrollment.courseRole === "staff" &&
              response.locals.conversation.type === "chat"
                ? html`
                    <button
                      class="dropdown--menu--item button button--transparent"
                      javascript="${response.locals.javascript(javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            onHidden: () => { this.onmouseleave(); },
                            content: ${JSON.stringify(html`
                              <div
                                key="loading"
                                css="${response.locals.css(css`
                                  display: flex;
                                  gap: var(--space--2);
                                  align-items: center;
                                `)}"
                              >
                                $${application.server.locals.partials.spinner({
                                  request,
                                  response,
                                })}
                                Loading…
                              </div>
                              <div key="content" hidden></div>
                            `)},
                          },
                        });

                        window.clearTimeout(this.tooltipContentTimeout);
                        this.tooltipContentSkipLoading = false;
                        
                        this.onmouseenter = this.onfocus = async () => {
                          window.clearTimeout(this.tooltipContentTimeout);
                          if (this.tooltipContentSkipLoading) return;
                          this.tooltipContentSkipLoading = true;
                          leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch("https://${
                            application.configuration.hostname
                          }/courses/${
                        response.locals.course.reference
                      }/conversations/${
                        response.locals.conversation.reference
                      }/messages/${
                        response.locals.message.reference
                      }/views", { cache: "no-store" })).text());
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
                      `)}"
                    >
                      <i class="bi bi-eye"></i>
                      ${response.locals.message.readings.length.toString()}
                      Views
                    </button>
                  `
                : html``}

              <button
                class="dropdown--menu--item button button--transparent"
                javascript="${response.locals.javascript(javascript`
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
                    await navigator.clipboard.writeText("https://${
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
                  }
                )}");
                    this.copied.show();
                    await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                    this.copied.hide();
                  };
                `)}"
              >
                <i class="bi bi-link"></i>
                Copy Message Permanent Link
              </button>

              $${application.server.locals.helpers.mayEditMessage({
                request,
                response,
                message: response.locals.message,
              })
                ? html`
                    <button
                      class="dropdown--menu--item button button--transparent"
                      javascript="${response.locals.javascript(javascript`
                        this.onmouseenter = this.onfocus = async () => {
                          const messageEdit = this.closest('[key^="message/"]').querySelector('[key="message--edit"]');
                          const messageEditForm = messageEdit.querySelector('[key="form"]');
                          if (messageEditForm.skipLoading === true) return;
                          messageEditForm.skipLoading = true;
                          leafac.loadPartial(messageEditForm, await (await fetch("https://${
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
                        { addQueryPrefix: true }
                      )}", { cache: "no-store" })).text());
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
                      `)}"
                    >
                      <i class="bi bi-pencil"></i>
                      Edit Message
                    </button>
                  `
                : html``}
              $${response.locals.message.authorEnrollment !==
                "no-longer-enrolled" &&
              response.locals.message.authorEnrollment.courseRole ===
                "student" &&
              application.server.locals.helpers.mayEditMessage({
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
                        }
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
                                css="${response.locals.css(css`
                                  margin-left: var(--space---0-5);
                                `)}"
                              >
                                $${application.server.locals.partials.user({
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
                                css="${response.locals.css(css`
                                  margin-left: var(--space---0-5);
                                `)}"
                              >
                                $${application.server.locals.partials.user({
                                  request,
                                  response,
                                  user: response.locals.message.authorEnrollment
                                    .user,
                                  decorate: false,
                                  name: false,
                                  size: "xs",
                                })}
                              </span>
                              Set as Signed by
                              ${response.locals.message.authorEnrollment.id ===
                              response.locals.enrollment.id
                                ? "You"
                                : response.locals.message.authorEnrollment.user
                                    .name}
                            </button>
                          `}
                    </form>
                  `
                : html``}
              $${response.locals.enrollment.courseRole === "staff" &&
              response.locals.enrollments.length > 1
                ? html`
                    <button
                      class="dropdown--menu--item button button--transparent"
                      javascript="${response.locals.javascript(javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            onHidden: () => { this.onmouseleave(); },
                            content: ${JSON.stringify(html`
                              <div
                                key="loading"
                                css="${response.locals.css(css`
                                  display: flex;
                                  gap: var(--space--2);
                                  align-items: center;
                                `)}"
                              >
                                $${application.server.locals.partials.spinner({
                                  request,
                                  response,
                                })}
                                Loading…
                              </div>
                              <div key="content" hidden></div>
                            `)},
                          },
                        });

                        window.clearTimeout(this.tooltipContentTimeout);
                        this.tooltipContentSkipLoading = false;

                        this.onmouseenter = this.onfocus = async () => {
                          window.clearTimeout(this.tooltipContentTimeout);
                          if (this.tooltipContentSkipLoading) return;
                          this.tooltipContentSkipLoading = true;
                          leafac.loadPartial(this.tooltip.props.content.querySelector('[key="content"]'), await (await fetch("https://${
                            application.configuration.hostname
                          }/courses/${
                        response.locals.course.reference
                      }/conversations/${
                        response.locals.conversation.reference
                      }/messages/${
                        response.locals.message.reference
                      }/reuse", { cache: "no-store" })).text());
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
                      `)}"
                    >
                      <i class="bi bi-recycle"></i>
                      Reuse Message in Another Course
                    </button>
                  `
                : html``}
              $${response.locals.enrollment.courseRole === "staff"
                ? html`
                    <div>
                      <button
                        class="dropdown--menu--item button button--transparent"
                        javascript="${response.locals.javascript(javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "dropdown",
                            tippyProps: {
                              theme: "rose",
                              trigger: "click",
                              interactive: true,
                              content: ${JSON.stringify(html`
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
                                    }
                                  )}"
                                  css="${response.locals.css(css`
                                    padding: var(--space--2);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `)}"
                                >
                                  <p>
                                    Are you sure you want to remove this
                                    message?
                                  </p>
                                  <p>
                                    <strong
                                      css="${response.locals.css(css`
                                        font-weight: var(--font-weight--bold);
                                      `)}"
                                    >
                                      You may not undo this action!
                                    </strong>
                                  </p>
                                  <button class="button button--rose">
                                    <i class="bi bi-trash-fill"></i>
                                    Remove Message
                                  </button>
                                </form>
                              `)},  
                            },
                          });
                        `)}"
                      >
                        <i class="bi bi-trash"></i>
                        Remove Message
                      </button>
                    </div>
                  `
                : html``}
            </div>
          `,
        })
      );
    }
  );

  application.server.get<
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
        !application.server.locals.helpers.mayEditMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      response.send(
        application.server.locals.layouts.partial({
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
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              $${application.server.locals.partials.contentEditor({
                request,
                response,
                contentSource: response.locals.message.contentSource,
                compact: response.locals.conversation.type === "chat",
              })}

              <div
                css="${response.locals.css(css`
                  display: flex;
                  gap: var(--space--2);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `)}"
              >
                <button
                  class="button button--blue"
                  javascript="${response.locals.javascript(javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: ${JSON.stringify(html`
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${response.locals
                                .javascript(javascript`
                                  this.hidden = leafac.isAppleDevice;
                                `)}"
                              >Ctrl+Enter</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${response.locals
                                .javascript(javascript`
                                  this.hidden = !leafac.isAppleDevice;
                                `)}"
                              ><i class="bi bi-command"></i
                              ><i class="bi bi-arrow-return-left"></i
                            ></span>
                          </span>
                        `)},
                      },
                    });

                    const textarea = this.closest("form").querySelector('[key="content-editor--write--textarea"]');

                    (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+enter", () => { this.click(); return false; });                                  
                  `)}"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Message
                </button>
                <button
                  type="reset"
                  class="button button--transparent"
                  javascript="${response.locals.javascript(javascript`
                    this.onclick = () => {
                      this.closest('[key^="message/"]').querySelector('[key="message--show"]').hidden = false;
                      this.closest('[key^="message/"]').querySelector('[key="message--edit"]').hidden = true;

                      const messageEdit = this.closest('[key^="message/"]').querySelector('[key="message--edit"]');
                      messageEdit.querySelector('[key="loading"]').hidden = false;
                      messageEdit.querySelector('[key="form"]').hidden = true;
                      messageEdit.querySelector('[key="form"]').skipLoading = false;
                    };
                  `)}"
                >
                  <i class="bi bi-x-lg"></i>
                  Cancel
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  application.server.get<
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
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      response.send(
        application.server.locals.layouts.partial({
          request,
          response,
          body: html`
            <div
              class="dropdown--menu"
              css="${response.locals.css(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${response.locals.message.readings.reverse().map(
                (reading) => html`
                  <div
                    key="reading/${reading.enrollment === "no-longer-enrolled"
                      ? reading.enrollment
                      : reading.enrollment.reference}"
                    class="dropdown--menu--item"
                  >
                    $${application.server.locals.partials.user({
                      request,
                      response,
                      enrollment: reading.enrollment,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${response.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(reading.createdAt).toISOString()}"
                        javascript="${response.locals.javascript(javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `)}"
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

  application.server.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { isAnswer?: "on"; content?: string; isAnonymous?: "on" },
    {
      conversations?: object;
      messages?: object;
    },
    Application["server"]["locals"]["ResponseLocals"]["Conversation"]
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    (request, response, next) => {
      if (response.locals.conversation === undefined) return next();

      if (
        ![undefined, "on"].includes(request.body.isAnswer) ||
        (request.body.isAnswer === "on" &&
          response.locals.conversation.type !== "question") ||
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        ![undefined, "on"].includes(request.body.isAnonymous) ||
        (request.body.isAnonymous === "on" &&
          response.locals.enrollment.courseRole === "staff")
      )
        return next("Validation");

      const mostRecentMessage = application.server.locals.helpers.getMessage({
        request,
        response,
        conversation: response.locals.conversation,
        messageReference: String(
          response.locals.conversation.nextMessageReference - 1
        ),
      });
      let message: { id: number; reference: string };
      if (
        response.locals.conversation.type === "chat" &&
        mostRecentMessage !== undefined &&
        mostRecentMessage.authorEnrollment !== "no-longer-enrolled" &&
        response.locals.enrollment.id ===
          mostRecentMessage.authorEnrollment.id &&
        mostRecentMessage.anonymousAt === null &&
        request.body.isAnonymous !== "on" &&
        new Date().getTime() - new Date(mostRecentMessage.createdAt).getTime() <
          5 * 60 * 1000
      ) {
        const contentSource = `${mostRecentMessage.contentSource}\n\n${request.body.content}`;
        const contentPreprocessed =
          application.server.locals.partials.contentPreprocessed(contentSource);

        application.database.executeTransaction(() => {
          application.database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${response.locals.conversation.id}
            `
          );
          application.database.run(
            sql`
              UPDATE "messages"
              SET
                "contentSource" = ${contentSource},
                "contentPreprocessed" = ${contentPreprocessed.contentPreprocessed},
                "contentSearch" = ${contentPreprocessed.contentSearch}
              WHERE "id" = ${mostRecentMessage.id}
            `
          );
          message = mostRecentMessage;
          application.database.run(
            sql`
              DELETE FROM "readings"
              WHERE
                "message" = ${mostRecentMessage.id} AND
                "enrollment" != ${response.locals.enrollment.id}
            `
          );
        });
      } else {
        const contentPreprocessed =
          application.server.locals.partials.contentPreprocessed(
            request.body.content
          );

        application.database.executeTransaction(() => {
          application.database.run(
            sql`
              UPDATE "conversations"
              SET
                "updatedAt" = ${new Date().toISOString()},
                "nextMessageReference" = ${
                  response.locals.conversation.nextMessageReference + 1
                }
                $${
                  response.locals.conversation.type === "question" &&
                  response.locals.enrollment.courseRole === "staff" &&
                  request.body.isAnswer === "on" &&
                  response.locals.conversation.resolvedAt === null
                    ? sql`,
                        "resolvedAt" = ${new Date().toISOString()}
                      `
                    : response.locals.conversation.type === "question" &&
                      response.locals.enrollment.courseRole === "student" &&
                      request.body.isAnswer !== "on"
                    ? sql`,
                        "resolvedAt" = ${null}
                      `
                    : sql``
                }
              WHERE "id" = ${response.locals.conversation.id}
            `
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
                      "authorEnrollment",
                      "anonymousAt",
                      "answerAt",
                      "contentSource",
                      "contentPreprocessed",
                      "contentSearch"
                    )
                    VALUES (
                      ${new Date().toISOString()},
                      ${response.locals.conversation.id},
                      ${String(
                        response.locals.conversation.nextMessageReference
                      )},
                      ${response.locals.enrollment.id},
                      ${
                        request.body.isAnonymous === "on"
                          ? new Date().toISOString()
                          : null
                      },
                      ${
                        request.body.isAnswer === "on"
                          ? new Date().toISOString()
                          : null
                      },
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
        });
      }
      application.server.locals.helpers.emailNotifications({
        request,
        response,
        message: application.server.locals.helpers.getMessage({
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
          { addQueryPrefix: true }
        )}`
      );

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.server.locals.helpers.mayEditMessage = ({
    request,
    response,
    message,
  }) =>
    response.locals.enrollment.courseRole === "staff" ||
    (message.authorEnrollment !== "no-longer-enrolled" &&
      message.authorEnrollment.id === response.locals.enrollment.id);

  application.server.patch<
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
    ResponseLocalsMessage
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    (request, response, next) => {
      if (
        response.locals.message === undefined ||
        !application.server.locals.helpers.mayEditMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      if (typeof request.body.isAnswer === "string")
        if (
          !["true", "false"].includes(request.body.isAnswer) ||
          response.locals.message.reference === "1" ||
          response.locals.conversation.type !== "question"
        )
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "messages"
              SET "answerAt" = ${
                request.body.isAnswer === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${response.locals.message.id}
            `
          );

      if (typeof request.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(request.body.isAnonymous) ||
          response.locals.message.authorEnrollment === "no-longer-enrolled" ||
          response.locals.message.authorEnrollment.courseRole === "staff"
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
              `
            );
            if (
              response.locals.message.reference === "1" &&
              response.locals.conversation.authorEnrollment !==
                "no-longer-enrolled" &&
              response.locals.message.authorEnrollment !==
                "no-longer-enrolled" &&
              response.locals.conversation.authorEnrollment.id ===
                response.locals.message.authorEnrollment.id
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
                `
              );
          });

      if (typeof request.body.content === "string") {
        if (request.body.content.trim() === "") return next("Validation");
        const contentPreprocessed =
          application.server.locals.partials.contentPreprocessed(
            request.body.content
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
            `
          );
          application.database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()}
              WHERE "id" = ${response.locals.conversation.id}
            `
          );
        });

        application.server.locals.helpers.emailNotifications({
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
          { addQueryPrefix: true }
        )}`
      );

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.server.get<
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
        response.locals.enrollment.courseRole !== "staff" ||
        response.locals.enrollments.length === 1
      )
        return next();

      response.send(
        application.server.locals.layouts.partial({
          request,
          response,
          body: html`
            <div
              class="dropdown--menu"
              css="${response.locals.css(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${application.server.locals.partials.courses({
                request,
                response,
                hrefSuffix: `/conversations/new/${
                  response.locals.conversation.type
                }${qs.stringify(
                  {
                    newConversation: {
                      title: response.locals.conversation.title,
                      content:
                        response.locals.message.authorEnrollment !==
                          "no-longer-enrolled" &&
                        response.locals.message.authorEnrollment.id !==
                          response.locals.enrollment.id &&
                        !(
                          response.locals.message.authorEnrollment
                            .courseRole === "student" &&
                          response.locals.message.anonymousAt !== null
                        )
                          ? `> Original author: ${response.locals.message.authorEnrollment.user.name}\n\n${response.locals.message.contentSource}`
                          : response.locals.message.contentSource,
                      isAnnouncement:
                        response.locals.conversation.announcementAt !== null,
                      isPinned: response.locals.conversation.pinnedAt !== null,
                    },
                  },
                  { addQueryPrefix: true }
                )}`,
              })}
            </div>
          `,
        })
      );
    }
  );

  application.server.delete<
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
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      application.database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${response.locals.message.id}`
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

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.server.get<
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
        application.server.locals.layouts.partial({
          request,
          response,
          body: html`
            <div
              class="dropdown--menu"
              css="${response.locals.css(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${response.locals.message.likes.reverse().map(
                (like) => html`
                  <div
                    key="like/${like.enrollment === "no-longer-enrolled"
                      ? like.enrollment
                      : like.enrollment.reference}"
                    class="dropdown--menu--item"
                  >
                    $${application.server.locals.partials.user({
                      request,
                      response,
                      enrollment: like.enrollment,
                      size: "xs",
                      bold: false,
                    })}
                     
                    <span
                      class="secondary"
                      css="${response.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(like.createdAt).toISOString()}"
                        javascript="${response.locals.javascript(javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `)}"
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

  application.server.post<
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
            like.enrollment !== "no-longer-enrolled" &&
            like.enrollment.id === response.locals.enrollment.id
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          INSERT INTO "likes" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.message.id},
            ${response.locals.enrollment.id}
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

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.server.delete<
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
          like.enrollment !== "no-longer-enrolled" &&
          like.enrollment.id === response.locals.enrollment.id
      );
      if (like === undefined) return next("Validation");

      application.database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
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

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.server.locals.helpers.mayEndorseMessage = ({
    request,
    response,
    message,
  }) =>
    response.locals.enrollment.courseRole === "staff" &&
    response.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    (message.authorEnrollment === "no-longer-enrolled" ||
      message.authorEnrollment.courseRole !== "staff");

  application.server.post<
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
        !application.server.locals.helpers.mayEndorseMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      if (
        response.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.enrollment !== "no-longer-enrolled" &&
            endorsement.enrollment.id === response.locals.enrollment.id
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.message.id},
            ${response.locals.enrollment.id}
          )
        `
      );
      if (response.locals.conversation.resolvedAt === null)
        application.database.run(
          sql`
            UPDATE "conversations"
            SET "resolvedAt" = ${new Date().toISOString()}
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

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.server.delete<
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
        !application.server.locals.helpers.mayEndorseMessage({
          request,
          response,
          message: response.locals.message,
        })
      )
        return next();

      const endorsement = response.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.enrollment !== "no-longer-enrolled" &&
          endorsement.enrollment.id === response.locals.enrollment.id
      );
      if (endorsement === undefined) return next("Validation");

      application.database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
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

      application.server.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}/conversations/${response.locals.conversation.reference}`,
      });
    }
  );

  application.server.locals.helpers.emailNotifications = ({
    request,
    response,
    message,
  }) => {
    application.database.executeTransaction(() => {
      application.database.run(
        sql`
          INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${response.locals.enrollment.id}
          )
        `
      );
      if (message.authorEnrollment !== "no-longer-enrolled")
        application.database.run(
          sql`
            INSERT INTO "emailNotificationDeliveries" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${message.authorEnrollment.id}
            )
          `
        );

      const job = application.database.get<{ id: number }>(
        sql`
          SELECT "id"
          FROM "emailNotificationMessageJobs"
          WHERE
            "message" = ${message.id} AND
            "startedAt" IS NULL
        `
      );
      if (job === undefined)
        application.database.run(
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
        application.database.run(
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
            WHERE "expiresAt" < ${new Date().toISOString()}
          `
        )) {
          application.database.run(
            sql`
              DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
            `
          );
          application.log(
            "emailNotificationMessageJobs",
            "EXPIRED",
            `message = ${job.message}`
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
              Date.now() - 2 * 60 * 1000
            ).toISOString()}
          `
        )) {
          application.database.run(
            sql`
              UPDATE "emailNotificationMessageJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `
          );
          application.log(
            "emailNotificationMessageJobs",
            "TIMED OUT",
            `message = ${job.message}`
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
            `
          );
          if (job !== undefined)
            application.database.run(
              sql`
                UPDATE "emailNotificationMessageJobs"
                SET "startedAt" = ${new Date().toISOString()}
                WHERE "id" = ${job.id}
              `
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
          conversationParticipants: Application["server"]["locals"]["helpers"]["conversationParticipantses"][number];
          conversationType: Application["server"]["locals"]["helpers"]["conversationTypes"][number];
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
          nextConversationReference: messageRow.courseNextConversationReference,
        };
        const contentProcessed = application.server.locals.partials.content({
          request: { query: {} } as Parameters<
            typeof application.server.locals.partials.content
          >[0]["request"],
          response: {
            locals: {
              css: localCSS(),
              javascript: localJavaScript(),
              user: {},
              enrollment: {},
              course,
            },
          } as Parameters<
            typeof application.server.locals.partials.content
          >[0]["response"],
          contentPreprocessed: message.contentPreprocessed,
          decorate: true,
        });

        const enrollments = application.database.all<{
          id: number;
          userId: number;
          userEmail: string;
          userEmailNotificationsForAllMessages: Application["server"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
          reference: string;
          courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
                  "emailNotificationDeliveries"."message" = ${message.id}
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
          application.database.run(
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
                    name: `${course.name} · ${application.configuration.email.defaults.from.name}`,
                    address:
                      application.configuration.email.defaults.from.address,
                  },
                  to: enrollment.userEmail,
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
                          href="https://${application.configuration
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

          application.database.run(
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

        application.database.run(
          sql`
            DELETE FROM "emailNotificationMessageJobs" WHERE "id" = ${job.id}
          `
        );

        application.log(
          "emailNotificationMessageJobs",
          "SUCCEEDED",
          `message = ${job.message}`
        );

        await timers.setTimeout(100 + Math.random() * 100, undefined, {
          ref: false,
        });
      }

      application.log("emailNotificationMessageJobs", "FINISHED");

      await timers.setTimeout(
        2 * 60 * 1000 + Math.random() * 30 * 1000,
        undefined,
        { ref: false }
      );
    }
  });
};
