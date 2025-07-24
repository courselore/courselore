import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversationMessages = {
  types: {
    states: {
      CourseConversationMessage: Application["types"]["states"]["CourseConversation"] & {
        courseConversationMessage: {
          id: number;
          publicId: string;
          createdAt: string;
          updatedAt: string | null;
          createdByCourseParticipation: number | null;
          courseConversationMessageType:
            | "courseConversationMessageTypeMessage"
            | "courseConversationMessageTypeAnswer"
            | "courseConversationMessageTypeFollowUpQuestion";
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
          content: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/draft$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { content: string },
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      if (typeof request.body.content !== "string") throw "validation";
      let sendLiveConnectionUpdates = false;
      application.database.executeTransaction(() => {
        const existingCourseConversationMessageDraft = application.database.get(
          sql`
            select true
            from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        sendLiveConnectionUpdates =
          (existingCourseConversationMessageDraft === undefined &&
            request.body.content!.trim() !== "") ||
          (existingCourseConversationMessageDraft !== undefined &&
            request.body.content!.trim() === "");
        application.database.run(
          sql`
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (request.body.content!.trim() !== "")
          application.database.run(
            sql`
              insert into "courseConversationMessageDrafts" (
                "courseConversation",
                "createdByCourseParticipation",
                "createdAt",
                "content"
              )
              values (
                ${request.state.courseConversation!.id},
                ${request.state.courseParticipation!.id},
                ${new Date().toISOString()},
                ${request.body.content}
              );
            `,
          );
      });
      response.end();
      if (sendLiveConnectionUpdates)
        for (const port of application.privateConfiguration.ports)
          fetch(`http://localhost:${port}/__live-connections`, {
            method: "POST",
            headers: { "CSRF-Protection": "true" },
            body: new URLSearchParams({
              pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
            }),
          });
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseConversationMessageType:
            | "courseConversationMessageTypeMessage"
            | "courseConversationMessageTypeAnswer"
            | "courseConversationMessageTypeFollowUpQuestion";
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
        },
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationsTags === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (typeof request.body.courseConversationMessageType === "string" &&
          (request.state.courseConversation.courseConversationType !==
            "courseConversationTypeQuestion" ||
            (request.body.courseConversationMessageType !==
              "courseConversationMessageTypeMessage" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeAnswer" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeFollowUpQuestion"))) ||
        (typeof request.body.courseConversationMessageVisibility === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor" ||
            (request.body.courseConversationMessageVisibility !==
              "courseConversationMessageVisibilityEveryone" &&
              request.body.courseConversationMessageVisibility !==
                "courseConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (typeof request.body.courseConversationMessageAnonymity === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleStudent" ||
            (request.body.courseConversationMessageAnonymity !==
              "courseConversationMessageAnonymityNone" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleInstructors") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleInstructors" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      const contentTextContent =
        await application.partials.courseConversationMessageContentProcessor({
          course: request.state.course,
          courseConversationMessageContent: request.body.content,
          mode: "textContent",
        });
      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            insert into "courseConversationMessages" (
              "publicId",
              "courseConversation",
              "createdAt",
              "updatedAt",
              "createdByCourseParticipation",
              "courseConversationMessageType",
              "courseConversationMessageVisibility",
              "courseConversationMessageAnonymity",
              "content",
              "contentSearch"
            )
            values (
              ${cryptoRandomString({ length: 20, type: "numeric" })},
              ${request.state.courseConversation!.id},
              ${new Date().toISOString()},
              ${null},
              ${request.state.courseParticipation!.id},
              ${request.body.courseConversationMessageType ?? "courseConversationMessageTypeMessage"},
              ${request.body.courseConversationMessageVisibility ?? "courseConversationMessageVisibilityEveryone"},
              ${request.body.courseConversationMessageAnonymity ?? "courseConversationMessageAnonymityNone"},
              ${request.body.content},
              ${utilities
                .tokenize(contentTextContent, {
                  stopWords: application.privateConfiguration.stopWords,
                  stem: (token) => natural.PorterStemmer.stem(token),
                })
                .map((tokenWithPosition) => tokenWithPosition.token)
                .join(" ")}
            );
          `,
        );
        application.database.run(
          sql`
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationMessagePublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      request.state.courseConversationMessage = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        updatedAt: string | null;
        createdByCourseParticipation: number | null;
        courseConversationMessageType:
          | "courseConversationMessageTypeMessage"
          | "courseConversationMessageTypeAnswer"
          | "courseConversationMessageTypeFollowUpQuestion";
        courseConversationMessageVisibility:
          | "courseConversationMessageVisibilityEveryone"
          | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
        courseConversationMessageAnonymity:
          | "courseConversationMessageAnonymityNone"
          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
          | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
        content: string;
      }>(
        sql`
            select 
              "id",
              "publicId",
              "createdAt",
              "updatedAt",
              "createdByCourseParticipation",
              "courseConversationMessageType",
              "courseConversationMessageVisibility",
              "courseConversationMessageAnonymity",
              "content"
            from "courseConversationMessages"
            where
              "courseConversation" = ${request.state.courseConversation.id} and
              "publicId" = ${request.pathname.courseConversationMessagePublicId} and (
                "courseConversationMessageVisibility" = 'courseConversationMessageVisibilityEveryone'
                $${
                  request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? sql`
                        or
                        "courseConversationMessageVisibility" = 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                      `
                    : sql``
                }
              );
          `,
      );
      if (request.state.courseConversationMessage === undefined) return;
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/edit$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined ||
        !(
          request.state.course!.courseState === "courseStateActive" &&
          (request.state.courseParticipation!.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
            request.state.courseParticipation!.id ===
              request.state.courseConversationMessage
                .createdByCourseParticipation)
        )
      )
        return;
      response.end(html`
        <div
          type="form"
          method="PATCH"
          action="/courses/${request.state.course
            .publicId}/conversations/${request.state.courseConversation
            .publicId}/messages/${request.state.courseConversationMessage
            .publicId}"
          css="${css`
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
        >
          $${application.partials.courseConversationMessageContentEditor({
            course: request.state.course,
            courseParticipation: request.state.courseParticipation,
            courseConversation: request.state.courseConversation,
            courseConversationMessage: request.state.courseConversationMessage,
          })}
          <div
            css="${css`
              font-size: var(--font-size--3);
              line-height: var(--font-size--3--line-height);
              font-weight: 600;
              color: light-dark(
                var(--color--slate--600),
                var(--color--slate--400)
              );
              display: flex;
              align-items: baseline;
              gap: var(--size--4);
            `}"
          >
            <div>
              <button
                type="submit"
                class="button button--rectangle button--blue"
              >
                Edit
              </button>
            </div>
            $${(() => {
              let courseConversationMessageNewOptionsHTML = html``;
              if (
                request.state.courseConversation.courseConversationType ===
                "courseConversationTypeQuestion"
              )
                courseConversationMessageNewOptionsHTML += html`
                  <button
                    type="button"
                    class="button button--rectangle button--transparent"
                    javascript="${javascript`
                      javascript.popover({ element: this, trigger: "click" });
                    `}"
                  >
                    <span
                      css="${css`
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                      >Type:</span
                    >  <input
                      type="radio"
                      name="courseConversationMessageType"
                      value="courseConversationMessageTypeMessage"
                      required
                      checked
                      hidden
                    /><span
                      css="${css`
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Message</span
                    ><input
                      type="radio"
                      name="courseConversationMessageType"
                      value="courseConversationMessageTypeAnswer"
                      required
                      hidden
                    /><span
                      css="${css`
                        color: light-dark(
                          var(--color--green--500),
                          var(--color--green--500)
                        );
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Answer</span
                    ><input
                      type="radio"
                      name="courseConversationMessageType"
                      value="courseConversationMessageTypeFollowUpQuestion"
                      required
                      hidden
                    /><span
                      css="${css`
                        color: light-dark(
                          var(--color--red--500),
                          var(--color--red--500)
                        );
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Follow-up question</span
                    > <i class="bi bi-chevron-down"></i>
                  </button>
                  <div
                    type="popover"
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--2);
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeMessage"]').click();
                        };
                      `}"
                    >
                      Message
                    </button>
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeAnswer"]').click();
                        };
                      `}"
                    >
                      Answer
                    </button>
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeFollowUpQuestion"]').click();
                        };
                      `}"
                    >
                      Follow-up question
                    </button>
                  </div>
                `;
              if (
                request.state.courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
              )
                courseConversationMessageNewOptionsHTML += html`
                  <button
                    type="button"
                    class="button button--rectangle button--transparent"
                    javascript="${javascript`
                      javascript.popover({ element: this, trigger: "click" });
                    `}"
                  >
                    <span
                      css="${css`
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                      >Visibility:</span
                    >  <input
                      type="radio"
                      name="courseConversationMessageVisibility"
                      value="courseConversationMessageVisibilityEveryone"
                      required
                      checked
                      hidden
                    /><span
                      css="${css`
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Everyone</span
                    ><input
                      type="radio"
                      name="courseConversationMessageVisibility"
                      value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                      required
                      hidden
                    /><span
                      css="${css`
                        color: light-dark(
                          var(--color--blue--500),
                          var(--color--blue--500)
                        );
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Instructors</span
                    > <i class="bi bi-chevron-down"></i>
                  </button>
                  <div
                    type="popover"
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--2);
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityEveryone"]').click();
                        };
                      `}"
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"]').click();
                        };
                      `}"
                    >
                      Instructors
                    </button>
                  </div>
                `;
              if (
                request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleStudent" &&
                (request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" ||
                  request.state.course
                    .courseParticipationRoleStudentsAnonymityAllowed ===
                    "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors")
              )
                courseConversationMessageNewOptionsHTML += html`
                  <button
                    type="button"
                    class="button button--rectangle button--transparent"
                    javascript="${javascript`
                      javascript.popover({ element: this, trigger: "click" });
                    `}"
                  >
                    <span
                      css="${css`
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                      >Anonymity:</span
                    >  <input
                      type="radio"
                      name="courseConversationMessageAnonymity"
                      value="courseConversationMessageAnonymityNone"
                      checked
                      required
                      hidden
                    /><span
                      css="${css`
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >None</span
                    ><input
                      type="radio"
                      name="courseConversationMessageAnonymity"
                      value="courseConversationMessageAnonymityCourseParticipationRoleStudents"
                      required
                      hidden
                    /><span
                      css="${css`
                        :not(:checked) + & {
                          display: none;
                        }
                      `}"
                      >Anonymous to students</span
                    >$${request.state.course
                      .courseParticipationRoleStudentsAnonymityAllowed ===
                    "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                      ? html`<input
                            type="radio"
                            name="courseConversationMessageAnonymity"
                            value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                            required
                            hidden
                          /><span
                            css="${css`
                              :not(:checked) + & {
                                display: none;
                              }
                            `}"
                            >Anonymous to instructors</span
                          >`
                      : html``} <i class="bi bi-chevron-down"></i>
                  </button>
                  <div
                    type="popover"
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--2);
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityNone"]').click();
                        };
                      `}"
                    >
                      None
                    </button>
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                        };
                      `}"
                    >
                      Anonymous to students
                    </button>
                    $${request.state.course
                      .courseParticipationRoleStudentsAnonymityAllowed ===
                    "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                      ? html`
                          <button
                            type="button"
                            class="button button--rectangle button--transparent button--dropdown-menu"
                            javascript="${javascript`
                              this.onclick = () => {
                                this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"]').click();
                              };
                            `}"
                          >
                            Anonymous to instructors
                          </button>
                        `
                      : html``}
                  </div>
                `;
              return courseConversationMessageNewOptionsHTML !== html``
                ? html`
                    <div
                      css="${css`
                        flex: 1;
                        display: flex;
                        align-items: baseline;
                        flex-wrap: wrap;
                        column-gap: var(--size--4);
                        row-gap: var(--size--2);
                      `}"
                    >
                      $${courseConversationMessageNewOptionsHTML}
                    </div>
                  `
                : html``;
            })()}
          </div>
        </div>
      `);
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/view$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.courseParticipation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseConversationMessageViews"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseConversationMessageViews" (
                "courseConversationMessage",
                "courseParticipation",
                "createdAt"
              )
              values (
                ${request.state.courseConversationMessage!.id},
                ${request.state.courseParticipation!.id},
                ${new Date().toISOString()}
              );
            `,
          );
      });
      response.end();
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseConversationMessageLikes"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseConversationMessageLikes" (
                "courseConversationMessage",
                "courseParticipation"
              )
              values (
                ${request.state.courseConversationMessage!.id},
                ${request.state.courseParticipation!.id}
              );
            `,
          );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
    },
  });

  application.server?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.executeTransaction(() => {
        const courseConversationMessageLike = application.database.get<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseConversationMessageLikes"
            where
              "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
              "courseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (courseConversationMessageLike !== undefined)
          application.database.run(
            sql`
              delete from "courseConversationMessageLikes" where "id" = ${courseConversationMessageLike.id};
            `,
          );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
    },
  });
};
