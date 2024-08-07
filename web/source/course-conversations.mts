import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationCourseConversation = {
  types: {
    states: {
      CourseConversation: Application["types"]["states"]["Course"] & {
        courseConversation: {
          id: number;
          externalId: string;
          courseConversationType:
            | "courseConversationNote"
            | "courseConversationQuestion";
          questionResolved: number;
          courseConversationParticipations:
            | "everyone"
            | "courseStaff"
            | "courseConversationParticipations";
          pinned: number;
          title: string;
          titleSearch: string;
          courseConversationMessagesNextExternalId: number;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<courseConversationId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationsTags === undefined
      )
        return;
      request.state.courseConversation = application.database.get<{
        id: number;
        externalId: string;
        courseConversationType:
          | "courseConversationNote"
          | "courseConversationQuestion";
        questionResolved: number;
        courseConversationParticipations:
          | "everyone"
          | "courseStaff"
          | "courseConversationParticipations";
        pinned: number;
        title: string;
        titleSearch: string;
        courseConversationMessagesNextExternalId: number;
      }>(
        sql`
          select 
            "id",
            "externalId",
            "courseConversationType",
            "questionResolved",
            "courseConversationParticipations",
            "pinned",
            "title",
            "titleSearch",
            "courseConversationMessagesNextExternalId"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "externalId" = ${request.pathname.courseConversationId}
        `,
      );
      if (request.state.courseConversation === undefined) return;
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<courseConversationId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationsTags === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      response.end(
        courseConversationsLayout({
          request,
          response,
          head: html`
            <title>
              ${request.state.courseConversation.title} · Courselore
            </title>
          `,
          body: html`
            <div
              key="courseConversation /courses/${request.state.course
                .externalId}/conversations/${request.state.courseConversation
                .externalId}"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                key="courseConversation--header"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--1);
                `}"
              >
                $${(() => {
                  const mayEditCourseConversation =
                    request.state.course.archivedAt === null &&
                    (request.state.courseParticipation.courseRole ===
                      "courseStaff" ||
                      application.database.get(
                        sql`
                          select true
                          from "courseConversationMessages"
                          where
                            "courseConversation" = ${request.state.courseConversation.id} and
                            "createdByCourseParticipation" = ${request.state.courseParticipation.id} and
                            "externalId" = '1';
                        `,
                      ) !== undefined);
                  return html`
                    $${typeof request.state.course.archivedAt === "string"
                      ? html`
                          <div
                            key="courseConversation--archived"
                            class="text--secondary text--red"
                          >
                            <i class="bi bi-exclamation-triangle-fill"></i> This
                            course has been archived on
                            <span
                              javascript="${javascript`
                                this.textContent = javascript.localizeDate(${request.state.course.archivedAt});
                              `}"
                            ></span>
                            and is now read-only.
                          </div>
                        `
                      : html``}
                    <div
                      css="${css`
                        display: flex;
                        gap: var(--space--4);
                      `}"
                    >
                      <div
                        key="courseConversation--header--title"
                        css="${css`
                          flex: 1;
                        `}"
                      >
                        <div
                          key="courseConversation--header--title--show"
                          css="${css`
                            font-size: var(--font-size--4);
                            line-height: var(--font-size--4--line-height);
                            font-weight: 700;
                          `}"
                        >
                          ${request.state.courseConversation.title}
                        </div>
                        $${mayEditCourseConversation
                          ? html`
                              <form
                                key="courseConversation--header--title--edit"
                                method="PATCH"
                                action="https://${application.configuration
                                  .hostname}/courses/${request.state.course
                                  .externalId}/conversations/${request.state
                                  .courseConversation.externalId}"
                                novalidate
                                hidden
                                css="${css`
                                  display: flex;
                                  gap: var(--space--2);
                                  align-items: center;
                                  margin-bottom: var(--space--2);
                                `}"
                              >
                                <input
                                  name="title"
                                  value="${request.state.courseConversation
                                    .title}"
                                  class="input--text"
                                  css="${css`
                                    flex: 1;
                                  `}"
                                />
                                <button
                                  class="button button--square button--icon button--transparent"
                                  css="${css`
                                    font-size: var(--font-size--5);
                                    line-height: var(--space--0);
                                  `}"
                                >
                                  <i class="bi bi-check"></i>
                                </button>
                                <button
                                  type="reset"
                                  class="button button--square button--icon button--transparent"
                                  css="${css`
                                    font-size: var(--font-size--5);
                                    line-height: var(--space--0);
                                  `}"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--show"]').hidden = false;
                                      this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--edit"]').hidden = true;
                                    };
                                  `}"
                                >
                                  <i class="bi bi-x"></i>
                                </button>
                              </form>
                            `
                          : html``}
                      </div>
                      <div>
                        <button
                          key="courseConversation--header--menu"
                          class="text--secondary button button--square button--icon button--transparent"
                          css="${css`
                            font-size: var(--font-size--4);
                            line-height: var(--space--0);
                            margin-top: var(--space--0);
                          `}"
                          javascript="${javascript`
                            javascript.tippy({
                              event,
                              element: this,
                              placement: "bottom-end",
                              interactive: true,
                              trigger: "click",
                              content: ${html`
                                <div
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--2);
                                  `}"
                                >
                                  <button
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = async () => {
                                        await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${request.state.course.externalId}/conversations/${request.state.courseConversation.externalId}`});
                                        javascript.tippy({
                                          element: this,
                                          elementProperty: "copiedTippy",
                                          trigger: "manual",
                                          content: "Copied",
                                        }).show();
                                        await utilities.sleep(1000);
                                        this.copiedTippy.hide();
                                      };
                                    `}"
                                  >
                                    Copy conversation permanent link
                                  </button>
                                  $${mayEditCourseConversation
                                    ? html`
                                        <button
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--show"]').hidden = true;
                                              this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--edit"]').hidden = false;
                                              Tippy.hideAll();
                                              this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--edit"] [name="title"]').focus();
                                            };
                                          `}"
                                        >
                                          Edit conversation title
                                        </button>
                                      `
                                    : html``}
                                  $${(() => {
                                    const courses = application.database.all<{
                                      externalId: string;
                                      name: string;
                                    }>(
                                      sql`
                                        select
                                          "courses"."externalId" as "externalId",
                                          "courses"."name" as "name"
                                        from "courses"
                                        join "courseParticipations" on
                                          "courses"."id" = "courseParticipations"."course" and
                                          "courseParticipations"."user" = ${request.state.user.id}
                                        where
                                          "courses"."id" != ${request.state.course.id} and
                                          "courses"."archivedAt" is null
                                        order by "courseParticipations"."id" desc;
                                      `,
                                    );
                                    return courses.length > 0
                                      ? html`
                                          <button
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                              javascript.tippy({
                                                event,
                                                element: this,
                                                placement: "bottom-end",
                                                interactive: true,
                                                trigger: "click",
                                                content: ${html`
                                                  <div
                                                    css="${css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `}"
                                                  >
                                                    $${courses.map(
                                                      (course) => html`
                                                        <a
                                                          href="https://${application
                                                            .configuration
                                                            .hostname}/courses/${course.externalId}/conversations/new?${new URLSearchParams(
                                                            {
                                                              "reuse.course":
                                                                request.state
                                                                  .course!
                                                                  .externalId,
                                                              "reuse.courseConversation":
                                                                request.state
                                                                  .courseConversation!
                                                                  .externalId,
                                                            },
                                                          ).toString()}"
                                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                                        >
                                                          ${course.name}
                                                        </a>
                                                      `,
                                                    )}
                                                  </div>
                                                `},
                                              });
                                            `}"
                                          >
                                            Reuse conversation in another course
                                          </button>
                                        `
                                      : html``;
                                  })()}
                                  $${mayEditCourseConversation &&
                                  request.state.courseParticipation
                                    .courseRole === "courseStaff"
                                    ? html`
                                        <button
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            javascript.tippy({
                                              event,
                                              element: this,
                                              placement: "bottom-end",
                                              interactive: true,
                                              trigger: "click",
                                              theme: "red",
                                              content: ${html`
                                                <form
                                                  method="DELETE"
                                                  action="https://${application
                                                    .configuration
                                                    .hostname}/courses/${request
                                                    .state.course
                                                    .externalId}/conversations/${request
                                                    .state.courseConversation
                                                    .externalId}"
                                                  css="${css`
                                                    display: flex;
                                                    flex-direction: column;
                                                    gap: var(--space--2);
                                                  `}"
                                                >
                                                  <div>
                                                    <i
                                                      class="bi bi-exclamation-triangle-fill"
                                                    ></i
                                                    > This action cannot be
                                                    reverted.
                                                  </div>
                                                  <div>
                                                    <button
                                                      class="button button--rectangle button--red"
                                                      css="${css`
                                                        font-size: var(
                                                          --font-size--3
                                                        );
                                                        line-height: var(
                                                          --font-size--3--line-height
                                                        );
                                                      `}"
                                                    >
                                                      Delete conversation
                                                    </button>
                                                  </div>
                                                </form>
                                              `},
                                            });
                                          `}"
                                        >
                                          Delete conversation
                                        </button>
                                      `
                                    : html``}
                                </div>
                              `},
                            });
                          `}"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>
                    <div
                      class="text--secondary"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div
                        css="${css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--4);
                          row-gap: var(--space--2);
                        `}"
                      >
                        $${mayEditCourseConversation
                          ? html`
                              <button
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    placement: "bottom-start",
                                    interactive: true,
                                    trigger: "click",
                                    content: ${html`
                                      <div
                                        css="${css`
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `}"
                                      >
                                        <form
                                          method="PATCH"
                                          action="https://${application
                                            .configuration
                                            .hostname}/courses/${request.state
                                            .course
                                            .externalId}/conversations/${request
                                            .state.courseConversation
                                            .externalId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationType"
                                            value="courseConversationNote"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationType ===
                                            "courseConversationNote"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Note
                                          </button>
                                        </form>
                                        <form
                                          method="PATCH"
                                          action="https://${application
                                            .configuration
                                            .hostname}/courses/${request.state
                                            .course
                                            .externalId}/conversations/${request
                                            .state.courseConversation
                                            .externalId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationType"
                                            value="courseConversationQuestion"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationType ===
                                            "courseConversationQuestion"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Question
                                          </button>
                                        </form>
                                      </div>
                                    `},
                                  });
                                `}"
                              >
                                ${request.state.courseConversation
                                  .courseConversationType ===
                                "courseConversationNote"
                                  ? "Note"
                                  : request.state.courseConversation
                                        .courseConversationType ===
                                      "courseConversationQuestion"
                                    ? "Question"
                                    : (() => {
                                        throw new Error();
                                      })()} <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : html`
                              <div>
                                ${request.state.courseConversation
                                  .courseConversationType ===
                                "courseConversationNote"
                                  ? "Note"
                                  : request.state.courseConversation
                                        .courseConversationType ===
                                      "courseConversationQuestion"
                                    ? "Question"
                                    : (() => {
                                        throw new Error();
                                      })()}
                              </div>
                            `}
                        $${request.state.courseConversation
                          .courseConversationType ===
                        "courseConversationQuestion"
                          ? mayEditCourseConversation &&
                            request.state.courseParticipation.courseRole ===
                              "courseStaff"
                            ? html`
                                <button
                                  class="${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  ) === false
                                    ? "text--red"
                                    : ""} button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    javascript.tippy({
                                      event,
                                      element: this,
                                      placement: "bottom-start",
                                      interactive: true,
                                      trigger: "click",
                                      content: ${html`
                                        <div
                                          css="${css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `}"
                                        >
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${request.state
                                              .course
                                              .externalId}/conversations/${request
                                              .state.courseConversation
                                              .externalId}"
                                          >
                                            <input
                                              type="hidden"
                                              name="questionResolved"
                                              value="false"
                                            />
                                            <button
                                              class="button button--rectangle button--transparent $${Boolean(
                                                request.state.courseConversation
                                                  .questionResolved,
                                              ) === false
                                                ? "button--blue"
                                                : ""} button--dropdown-menu"
                                            >
                                              Unresolved
                                            </button>
                                          </form>
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${request.state
                                              .course
                                              .externalId}/conversations/${request
                                              .state.courseConversation
                                              .externalId}"
                                          >
                                            <input
                                              type="hidden"
                                              name="questionResolved"
                                              value="true"
                                            />
                                            <button
                                              class="button button--rectangle button--transparent $${Boolean(
                                                request.state.courseConversation
                                                  .questionResolved,
                                              ) === true
                                                ? "button--blue"
                                                : ""} button--dropdown-menu"
                                            >
                                              Resolved
                                            </button>
                                          </form>
                                        </div>
                                      `},
                                    });
                                  `}"
                                >
                                  ${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  )
                                    ? "Resolved"
                                    : "Unresolved"} <i
                                    class="bi bi-chevron-down"
                                  ></i>
                                </button>
                              `
                            : html`
                                <div
                                  class="${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  ) === false
                                    ? "text--red"
                                    : ""}"
                                >
                                  ${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  )
                                    ? "Resolved"
                                    : "Unresolved"}
                                </div>
                              `
                          : html``}
                        $${mayEditCourseConversation
                          ? html`
                              <button
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                    javascript.tippy({
                                      event,
                                      element: this,
                                      placement: "bottom-start",
                                      interactive: true,
                                      trigger: "click",
                                      content: ${html`
                                        <div
                                          css="${css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `}"
                                        >
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${request.state
                                              .course
                                              .externalId}/conversations/${request
                                              .state.courseConversation
                                              .externalId}"
                                          >
                                            <input
                                              type="hidden"
                                              name="courseConversationParticipations"
                                              value="everyone"
                                            />
                                            <button
                                              class="button button--rectangle button--transparent $${request
                                                .state.courseConversation
                                                .courseConversationParticipations ===
                                              "everyone"
                                                ? "button--blue"
                                                : ""} button--dropdown-menu"
                                            >
                                              Everyone
                                            </button>
                                          </form>
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${request.state
                                              .course
                                              .externalId}/conversations/${request
                                              .state.courseConversation
                                              .externalId}"
                                          >
                                            <input
                                              type="hidden"
                                              name="courseConversationParticipations"
                                              value="courseStaff"
                                            />
                                            <button
                                              class="button button--rectangle button--transparent $${request
                                                .state.courseConversation
                                                .courseConversationParticipations ===
                                              "courseStaff"
                                                ? "button--blue"
                                                : ""} button--dropdown-menu"
                                            >
                                              Course staff and selected course
                                              participants
                                            </button>
                                          </form>
                                          <form
                                            method="PATCH"
                                            action="https://${application
                                              .configuration
                                              .hostname}/courses/${request.state
                                              .course
                                              .externalId}/conversations/${request
                                              .state.courseConversation
                                              .externalId}"
                                          >
                                            <input
                                              type="hidden"
                                              name="courseConversationParticipations"
                                              value="courseConversationParticipations"
                                            />
                                            <button
                                              class="button button--rectangle button--transparent $${request
                                                .state.courseConversation
                                                .courseConversationParticipations ===
                                              "courseConversationParticipations"
                                                ? "button--blue"
                                                : ""} button--dropdown-menu"
                                            >
                                              Selected course participants
                                            </button>
                                          </form>
                                        </div>
                                      `},
                                    });
                                  `}"
                              >
                                ${request.state.courseConversation
                                  .courseConversationParticipations ===
                                "everyone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationParticipations ===
                                      "courseStaff"
                                    ? "Course staff and selected course participants"
                                    : request.state.courseConversation
                                          .courseConversationParticipations ===
                                        "courseConversationParticipations"
                                      ? "Selected course participants"
                                      : (() => {
                                          throw new Error();
                                        })()} <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : html`
                              <div>
                                ${request.state.courseConversation
                                  .courseConversationParticipations ===
                                "everyone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationParticipations ===
                                      "courseStaff"
                                    ? "Course staff and selected course participants"
                                    : request.state.courseConversation
                                          .courseConversationParticipations ===
                                        "courseConversationParticipations"
                                      ? "Selected course participants"
                                      : (() => {
                                          throw new Error();
                                        })()}
                              </div>
                            `}
                        $${mayEditCourseConversation &&
                        request.state.courseParticipation.courseRole ===
                          "courseStaff"
                          ? html`
                              <button
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    placement: "bottom-start",
                                    interactive: true,
                                    trigger: "click",
                                    content: ${html`
                                      <div
                                        css="${css`
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `}"
                                      >
                                        <form
                                          method="PATCH"
                                          action="https://${application
                                            .configuration
                                            .hostname}/courses/${request.state
                                            .course
                                            .externalId}/conversations/${request
                                            .state.courseConversation
                                            .externalId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="pinned"
                                            value="false"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${Boolean(
                                              request.state.courseConversation
                                                .pinned,
                                            ) === false
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Unpinned
                                          </button>
                                        </form>
                                        <form
                                          method="PATCH"
                                          action="https://${application
                                            .configuration
                                            .hostname}/courses/${request.state
                                            .course
                                            .externalId}/conversations/${request
                                            .state.courseConversation
                                            .externalId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="pinned"
                                            value="true"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${Boolean(
                                              request.state.courseConversation
                                                .pinned,
                                            ) === true
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Pinned
                                          </button>
                                        </form>
                                      </div>
                                    `},
                                  });
                                `}"
                              >
                                ${Boolean(
                                  request.state.courseConversation.pinned,
                                )
                                  ? "Pinned"
                                  : "Unpinned"} <i
                                  class="bi bi-chevron-down"
                                ></i>
                              </button>
                            `
                          : Boolean(request.state.courseConversation.pinned)
                            ? html`<div>Pinned</div>`
                            : html``}
                      </div>
                      $${(() => {
                        let courseConversationsTagsHTML = html``;
                        const courseConversationsTagsWithTagging =
                          request.state.courseConversationsTags.filter(
                            (courseConversationsTag) =>
                              application.database.get(
                                sql`
                                  select true
                                  from "courseConversationTaggings"
                                  where
                                    "courseConversation" = ${request.state.courseConversation!.id} and
                                    "courseConversationsTag" = ${courseConversationsTag.id};
                                `,
                              ) !== undefined,
                          );
                        if (
                          mayEditCourseConversation &&
                          request.state.courseConversationsTags.length > 0
                        )
                          courseConversationsTagsHTML += html`
                            <button
                              class="button button--rectangle button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  placement: "bottom-start",
                                  interactive: true,
                                  trigger: "click",
                                  content: ${html`
                                    <form
                                      method="PUT"
                                      action="https://${application
                                        .configuration
                                        .hostname}/courses/${request.state
                                        .course
                                        .externalId}/conversations/${request
                                        .state.courseConversation
                                        .externalId}/taggings"
                                      novalidate
                                      css="${css`
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--space--2);
                                      `}"
                                    >
                                      $${request.state.courseConversationsTags.map(
                                        (courseConversationsTag) => html`
                                          <label
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                          >
                                            <input
                                              type="checkbox"
                                              name="tags[]"
                                              value="${courseConversationsTag.externalId}"
                                              required
                                              $${courseConversationsTagsWithTagging.some(
                                                (
                                                  courseConversationsTagWithTagging,
                                                ) =>
                                                  courseConversationsTag.id ===
                                                  courseConversationsTagWithTagging.id,
                                              )
                                                ? html`checked`
                                                : html``}
                                              class="input--checkbox"
                                            />  ${courseConversationsTag.name}
                                          </label>
                                        `,
                                      )}
                                      <div>
                                        <button
                                          class="button button--rectangle button--blue"
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                          `}"
                                        >
                                          Update tags
                                        </button>
                                      </div>
                                    </form>
                                  `},
                                });
                              `}"
                            >
                              Tags <i class="bi bi-chevron-down"></i>
                            </button>
                          `;
                        else if (courseConversationsTagsWithTagging.length > 0)
                          courseConversationsTagsHTML += html`
                            <div>Tags</div>
                          `;
                        for (const courseConversationsTag of courseConversationsTagsWithTagging)
                          courseConversationsTagsHTML += html`
                            <div
                              key="courseConversationsTag ${courseConversationsTag.externalId}"
                              css="${css`
                                font-weight: 400;
                              `}"
                            >
                              ${courseConversationsTag.name}
                            </div>
                          `;
                        return courseConversationsTagsHTML !== html``
                          ? html`
                              <div
                                css="${css`
                                  display: flex;
                                  flex-wrap: wrap;
                                  column-gap: var(--space--4);
                                  row-gap: var(--space--2);
                                `}"
                              >
                                $${courseConversationsTagsHTML}
                              </div>
                            `
                          : html``;
                      })()}
                    </div>
                  `;
                })()}
              </div>
              <div
                key="courseConversationMessages"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
                javascript="${javascript`
                  // TODO: Prevent leaking intersection observer.
                  this.courseConversationMessageViewsIntersectionObserver?.disconnect();
                  this.courseConversationMessageViewsIntersectionObserver = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                      if (entry.intersectionRatio !== 1) continue;
                      conversationMessageIds.add(entry.target.courseConversationMessageId);
                      this.courseConversationMessageViewsIntersectionObserver.unobserve(entry.target);
                      setTimeout(() => {
                        entry.target.classList.add("viewed");
                      }, 1000);
                    }
                    updateCourseConversationMessageViews();
                  }, {
                    root: this.closest('[key="main--main"]'),
                    threshold: 1,
                  });
                  const updateCourseConversationMessageViews = utilities.foregroundJob(async () => {
                    if (conversationMessageIds.size === 0) return;
                    const body = new URLSearchParams([...conversationMessageIds].map(courseConversationMessageId => ["courseConversationMessageIds[]", courseConversationMessageId]));
                    conversationMessageIds.clear();
                    await fetch(${`https://${application.configuration.hostname}/courses/${
                      request.state.course!.externalId
                    }/conversations/${
                      request.state.courseConversation!.externalId
                    }/messages/views`}, {
                      method: "POST",
                      headers: { "CSRF-Protection": "true" },
                      body,
                    });
                  });
                  const conversationMessageIds = new Set();
                `}"
              >
                $${application.database
                  .all<{
                    id: number;
                    externalId: string;
                    createdAt: string;
                    updatedAt: string | null;
                    createdByCourseParticipation: number | null;
                    courseConversationMessageType:
                      | "courseConversationMessageMessage"
                      | "courseConversationMessageAnswer"
                      | "courseConversationMessageFollowUpQuestion"
                      | "courseConversationMessageCourseStaffWhisper";
                    anonymous: number;
                    contentSource: string;
                    contentPreprocessed: string;
                    contentSearch: string;
                  }>(
                    sql`
                      select
                        "id",
                        "externalId",
                        "createdAt",
                        "updatedAt",
                        "createdByCourseParticipation",
                        "courseConversationMessageType",
                        "anonymous",
                        "contentSource",
                        "contentPreprocessed",
                        "contentSearch"
                      from "courseConversationMessages"
                      where
                        "courseConversation" = ${request.state.courseConversation.id} $${
                          request.state.courseParticipation.courseRole !==
                          "courseStaff"
                            ? sql`
                                and
                                "courseConversationMessageType" != 'courseConversationMessageCourseStaffWhisper'
                              `
                            : sql``
                        }
                      order by "id" asc;
                    `,
                  )
                  .map((courseConversationMessage) => {
                    const mayEditCourseConversationMessage =
                      request.state.course!.archivedAt === null &&
                      (request.state.courseParticipation!.courseRole ===
                        "courseStaff" ||
                        request.state.courseParticipation!.id ===
                          courseConversationMessage.createdByCourseParticipation);
                    const createdByCourseParticipation =
                      typeof courseConversationMessage.createdByCourseParticipation ===
                      "number"
                        ? application.database.get<{
                            user: number;
                            courseRole: "courseStaff" | "courseStudent";
                          }>(
                            sql`
                              select
                                "user",
                                "courseRole"
                              from "courseParticipations"
                              where
                                "id" = ${courseConversationMessage.createdByCourseParticipation};
                            `,
                          )
                        : undefined;
                    const createdByUser =
                      createdByCourseParticipation !== undefined
                        ? application.database.get<{
                            id: number;
                            externalId: string;
                            createdAt: string;
                            name: string;
                            nameSearch: string;
                            email: string;
                            emailVerificationNonce: string | null;
                            emailVerificationCreatedAt: string | null;
                            emailVerified: number;
                            password: string | null;
                            passwordResetNonce: string | null;
                            passwordResetCreatedAt: string | null;
                            color:
                              | "red"
                              | "orange"
                              | "amber"
                              | "yellow"
                              | "lime"
                              | "green"
                              | "emerald"
                              | "teal"
                              | "cyan"
                              | "sky"
                              | "blue"
                              | "indigo"
                              | "violet"
                              | "purple"
                              | "fuchsia"
                              | "pink"
                              | "rose";
                            avatar: string | null;
                            systemRole:
                              | "systemAdministrator"
                              | "systemStaff"
                              | "systemUser";
                            lastSeenOnlineAt: string;
                            darkMode: "system" | "light" | "dark";
                            sidebarWidth: number;
                            emailNotificationsForAllMessages: number;
                            emailNotificationsForMessagesIncludingMentions: number;
                            emailNotificationsForMessagesInConversationsYouStarted: number;
                            emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
                            anonymous: number;
                            mostRecentlyVisitedCourse: number | null;
                          }>(
                            sql`
                              select
                                "id",
                                "externalId",
                                "createdAt",
                                "name",
                                "nameSearch",
                                "email",
                                "emailVerificationNonce",
                                "emailVerificationCreatedAt",
                                "emailVerified",
                                "password",
                                "passwordResetNonce",
                                "passwordResetCreatedAt",
                                "color",
                                "avatar",
                                "systemRole",
                                "lastSeenOnlineAt",
                                "darkMode",
                                "sidebarWidth",
                                "emailNotificationsForAllMessages",
                                "emailNotificationsForMessagesIncludingMentions",
                                "emailNotificationsForMessagesInConversationsYouStarted",
                                "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                                "anonymous",
                                "mostRecentlyVisitedCourse"
                              from "users"
                              where "id" = ${createdByCourseParticipation.user};
                            `,
                          )
                        : undefined;
                    return html`
                      <div
                        key="courseConversationMessage /courses/${request.state
                          .course!.externalId}/conversations/${request.state
                          .courseConversation!
                          .externalId}/messages/${courseConversationMessage.externalId}"
                        css="${css`
                          position: relative;
                          display: flex;
                          gap: var(--space--2);
                        `}"
                      >
                        $${(() => {
                          const courseConversationMessageView =
                            application.database.get(
                              sql`
                                select true
                                from "courseConversationMessageViews"
                                where
                                  "courseConversationMessage" = ${courseConversationMessage.id} and
                                  "courseParticipation" = ${request.state.courseParticipation!.id};
                              `,
                            ) !== undefined;
                          return html`
                            <div
                              key="courseConversationMessage--courseConversationMessageView"
                              css="${css`
                                position: absolute;
                                margin-left: var(--space---2-5);
                                margin-top: var(--space--4);
                              `}"
                            >
                              <div
                                key="courseConversationMessageView"
                                class="${courseConversationMessageView
                                  ? "viewed"
                                  : ""}"
                                css="${css`
                                  background-color: light-dark(
                                    var(--color--blue--500),
                                    var(--color--blue--500)
                                  );
                                  width: var(--space--1-5);
                                  height: var(--space--1-5);
                                  border-radius: var(--border-radius--circle);
                                  transition-property: var(
                                    --transition-property--opacity
                                  );
                                  transition-duration: var(
                                    --transition-duration--150
                                  );
                                  transition-timing-function: var(
                                    --transition-timing-function--ease-in-out
                                  );
                                  &.viewed {
                                    opacity: var(--opacity--0);
                                  }
                                `}"
                                javascript="${javascript`
                                  if (${!courseConversationMessageView}) {
                                    this.closest('[key="courseConversationMessages"]').courseConversationMessageViewsIntersectionObserver.observe(this);
                                    this.courseConversationMessageId = ${courseConversationMessage.externalId};
                                  }
                                `}"
                              ></div>
                            </div>
                          `;
                        })()}
                        <div key="courseConversationMessage--createdBy">
                          $${application.partials.user({
                            user:
                              request.state.courseParticipation!.courseRole !==
                                "courseStaff" &&
                              request.state.courseParticipation!.id !==
                                courseConversationMessage.createdByCourseParticipation &&
                              Boolean(courseConversationMessage.anonymous)
                                ? "anonymous"
                                : (createdByUser ??
                                  "formerCourseParticipation"),
                            size: 9,
                          })}
                        </div>
                        <div
                          key="courseConversationMessage--main"
                          css="${css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--1);
                          `}"
                        >
                          <div
                            key="courseConversationMessage--main--header"
                            class="text--secondary"
                            css="${css`
                              display: flex;
                              gap: var(--space--2);
                            `}"
                          >
                            <div
                              css="${css`
                                flex: 1;
                              `}"
                            >
                              $${mayEditCourseConversationMessage &&
                              createdByCourseParticipation?.courseRole ===
                                "courseStudent"
                                ? html`
                                    <button
                                      class="button button--rectangle button--transparent"
                                      css="${css`
                                        font-weight: 700;
                                      `}"
                                      javascript="${javascript`
                                        javascript.tippy({
                                          event,
                                          element: this,
                                          placement: "bottom-end",
                                          interactive: true,
                                          trigger: "click",
                                          content: ${html`
                                            <div
                                              css="${css`
                                                display: flex;
                                                flex-direction: column;
                                                gap: var(--space--2);
                                              `}"
                                            >
                                              <button
                                                class="button button--rectangle button--transparent button--dropdown-menu"
                                                javascript="${javascript`
                                                  javascript.tippy({
                                                    event,
                                                    element: this,
                                                    placement: "bottom-start",
                                                    interactive: true,
                                                    trigger: "click",
                                                    theme: "red",
                                                    content: ${html`
                                                      <form
                                                        method="PATCH"
                                                        action="https://${application
                                                          .configuration
                                                          .hostname}/courses/${request
                                                          .state.course!
                                                          .externalId}/conversations/${request
                                                          .state
                                                          .courseConversation!
                                                          .externalId}/messages/${courseConversationMessage.externalId}"
                                                        css="${css`
                                                          display: flex;
                                                          flex-direction: column;
                                                          gap: var(--space--2);
                                                        `}"
                                                      >
                                                        <input
                                                          type="hidden"
                                                          name="anonymous"
                                                          value="false"
                                                        />
                                                        <div>
                                                          <i
                                                            class="bi bi-exclamation-triangle-fill"
                                                          ></i
                                                          > The author of this
                                                          message will become
                                                          visible to other
                                                          students.
                                                        </div>
                                                        <div>
                                                          <button
                                                            class="button button--rectangle button--red"
                                                            css="${css`
                                                              font-size: var(
                                                                --font-size--3
                                                              );
                                                              line-height: var(
                                                                --font-size--3--line-height
                                                              );
                                                            `}"
                                                          >
                                                            Set as not anonymous
                                                          </button>
                                                        </div>
                                                      </form>
                                                    `},
                                                  });
                                                `}"
                                              >
                                                ${createdByUser!.name}
                                              </button>
                                              <form
                                                method="PATCH"
                                                action="https://${application
                                                  .configuration
                                                  .hostname}/courses/${request
                                                  .state.course!
                                                  .externalId}/conversations/${request
                                                  .state.courseConversation!
                                                  .externalId}/messages/${courseConversationMessage.externalId}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="anonymous"
                                                  value="true"
                                                />
                                                <button
                                                  class="button button--rectangle button--transparent $${Boolean(
                                                    courseConversationMessage.anonymous,
                                                  ) === true
                                                    ? "button--blue"
                                                    : ""} button--dropdown-menu"
                                                >
                                                  Anonymous to other students
                                                </button>
                                              </form>
                                            </div>
                                          `},
                                        });
                                      `}"
                                    >
                                      ${createdByUser!.name} <i
                                        class="bi bi-chevron-down"
                                      ></i>
                                    </button>
                                  `
                                : html`<span
                                    css="${css`
                                      font-weight: 700;
                                    `}"
                                    >${request.state.courseParticipation!
                                      .courseRole !== "courseStaff" &&
                                    request.state.courseParticipation!.id !==
                                      courseConversationMessage.createdByCourseParticipation &&
                                    Boolean(courseConversationMessage.anonymous)
                                      ? "Anonymous"
                                      : (createdByUser?.name ??
                                        "Former course participant")}</span
                                  >`}<span
                                css="${css`
                                  font-weight: 400;
                                `}"
                                > ·
                                <span
                                  css="${css`
                                    display: inline-block;
                                  `}"
                                  >2024-03-02</span
                                > $${courseConversationMessage.courseConversationMessageType ===
                                "courseConversationMessageMessage"
                                  ? html``
                                  : courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageAnswer"
                                    ? html`·
                                        <span
                                          class="text--green"
                                          css="${css`
                                            font-weight: 700;
                                          `}"
                                          >Answer</span
                                        >`
                                    : courseConversationMessage.courseConversationMessageType ===
                                        "courseConversationMessageFollowUpQuestion"
                                      ? html`·
                                          <span
                                            class="text--red"
                                            css="${css`
                                              font-weight: 700;
                                            `}"
                                            >Follow-up question</span
                                          >`
                                      : courseConversationMessage.courseConversationMessageType ===
                                          "courseConversationMessageCourseStaffWhisper"
                                        ? html`·
                                            <span
                                              class="text--blue"
                                              css="${css`
                                                font-weight: 700;
                                              `}"
                                              >Course staff whisper</span
                                            >`
                                        : (() => {
                                            throw new Error();
                                          })()}</span
                              >
                            </div>
                            <div>
                              <button
                                key="courseConversation--header--menu"
                                class="button button--square button--icon button--transparent"
                                css="${css`
                                  margin-right: var(--space---0-5);
                                `}"
                              >
                                <i class="bi bi-three-dots-vertical"></i>
                              </button>
                            </div>
                          </div>
                          <div key="courseConversationMessage--main--content">
                            ${courseConversationMessage.contentSource}
                          </div>
                          <div
                            key="courseConversationMessage--main--footer"
                            class="text--secondary"
                          >
                            <button
                              key="courseConversation--main--footer--like"
                              class="button button--rectangle button--transparent"
                            >
                              <i class="bi bi-hand-thumbs-up"></i> Like
                            </button>
                          </div>
                        </div>
                      </div>
                    `;
                  })}
              </div>
              $${request.state.course.archivedAt === null
                ? html`
                    <div key="courseConversationMessage/new">
                      <form
                        novalidate
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div
                          key="contentEditor"
                          class="input--text"
                          css="${css`
                            padding: var(--space--0);
                            display: flex;
                            flex-direction: column;
                          `}"
                        >
                          <div
                            key="contentEditor--menu"
                            class="text--secondary"
                            css="${css`
                              font-size: var(--font-size--3-5);
                              line-height: var(--font-size--3-5--line-height);
                              padding: var(--space--1-5) var(--space--2);
                              border-bottom: var(--border-width--1) solid
                                light-dark(
                                  var(--color--slate--200),
                                  var(--color--slate--800)
                                );
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `}"
                          >
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Bold",
                                });
                              `}"
                            >
                              <i class="bi bi-type-bold"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Link",
                                });
                              `}"
                            >
                              <i class="bi bi-link"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Image",
                                });
                              `}"
                            >
                              <i class="bi bi-image"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Code block",
                                });
                              `}"
                            >
                              <i class="bi bi-code"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Mathematics block",
                                });
                              `}"
                            >
                              <i class="bi bi-calculator"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Poll",
                                });
                              `}"
                            >
                              <i class="bi bi-card-checklist"></i>
                            </button>
                            <div
                              css="${css`
                                flex: 1;
                              `}"
                            ></div>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Preview",
                                });
                              `}"
                            >
                              <i class="bi bi-eyeglasses"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                javascript.tippy({
                                  event,
                                  element: this,
                                  content: "Menu",
                                });
                              `}"
                            >
                              <i class="bi bi-three-dots-vertical"></i>
                            </button>
                          </div>
                          <textarea
                            key="contentEditor--textarea"
                            css="${css`
                              font-family: "JetBrains Mono Variable",
                                var(--font-family--sans-serif);
                              height: var(--space--44);
                              padding: var(--space--1) var(--space--2);
                            `}"
                          ></textarea>
                        </div>
                        <div
                          class="text--secondary"
                          css="${css`
                            display: flex;
                            gap: var(--space--4);
                            align-items: baseline;
                          `}"
                        >
                          <button class="button button--rectangle button--blue">
                            Send
                          </button>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="anonymous"
                              class="input--checkbox"
                            />  Anonymous to other students
                          </label>
                        </div>
                      </form>
                    </div>
                  `
                : html``}
            </div>
          `,
        }),
      );
    },
  });

  const courseConversationsLayout = ({
    request,
    response,
    head,
    body,
  }: {
    request: serverTypes.Request<
      {},
      {},
      {},
      {},
      Application["types"]["states"]["Course"]
    >;
    response: serverTypes.Response;
    head: HTML;
    body: HTML;
  }): HTML => {
    if (
      request.state.user === undefined ||
      request.state.course === undefined ||
      request.state.courseParticipation === undefined ||
      request.state.courseConversationsTags === undefined
    )
      throw new Error();
    return application.layouts.base({
      request,
      response,
      head,
      hamburger: true,
      body: html`
        <div
          css="${css`
            width: 100%;
            height: 100%;
            display: flex;
          `}"
        >
          <div
            key="sidebar /courses/${request.state.course.externalId}"
            style="--width: ${String(request.state.user.sidebarWidth)}px;"
            css="${css`
              border-right: var(--border-width--1) solid
                light-dark(var(--color--slate--200), var(--color--slate--800));
              display: flex;
              flex-direction: column;
              @media (max-width: 899px) {
                background-color: light-dark(
                  var(--color--white),
                  var(--color--black)
                );
                position: absolute;
                inset: 0;
                right: var(--space--14);
                z-index: 100;
                max-width: var(--space--112);
                transform: translateX(-101%);
                transition-property: var(--transition-property--transform);
                transition-duration: var(--transition-duration--200);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                [key="main"].sidebar--open & {
                  transform: translateX(0%);
                  box-shadow: var(--box-shadow--25);
                }
              }
              @media (min-width: 900px) {
                width: var(--width);
              }
            `}"
          >
            <div
              key="sidebar--menu"
              css="${css`
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                padding: var(--space--2) var(--space--4);
                display: flex;
                gap: var(--space--4);
              `}"
            >
              $${request.state.course.archivedAt === null
                ? html`
                    <a
                      key="new-conversation"
                      href="https://${application.configuration
                        .hostname}/courses/${request.state.course
                        .externalId}/conversations/new"
                      class="button button--square button--blue"
                      css="${css`
                        font-size: var(--font-size--7-5);
                        line-height: var(--space--0);
                        font-weight: 700;
                        height: 100%;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                      `}"
                      javascript="${javascript`
                        javascript.tippy({
                          event,
                          element: this,
                          content: "New conversation",
                        });
                      `}"
                    >
                      +
                    </a>
                  `
                : html``}
              <div
                key="search-and-filter"
                class="input--text"
                css="${css`
                  flex: 1;
                  min-width: var(--space--0);
                  padding: var(--space--0);
                  display: flex;
                `}"
              >
                <input
                  type="text"
                  name="conversations.search"
                  css="${css`
                    flex: 1;
                    min-width: var(--space--0);
                    padding: var(--space--1) var(--space--0) var(--space--1)
                      var(--space--2);
                  `}"
                />
                <button
                  key="search"
                  class="button button--icon button--transparent"
                  css="${css`
                    padding: var(--space--1) var(--space--2);
                  `}"
                  javascript="${javascript`
                    javascript.tippy({
                      event,
                      element: this,
                      content: "Search",
                    });
                    this.onclick = () => {
                      this.closest('[key="search-and-filter"]').querySelector('[name="conversations.search"]').focus();
                    };
                  `}"
                >
                  <i class="bi bi-search"></i>
                </button>
                <button
                  key="filter"
                  class="button button--icon button--transparent"
                  css="${css`
                    padding: var(--space--1) var(--space--2);
                  `}"
                  javascript="${javascript`
                    javascript.tippy({
                      event,
                      element: this,
                      content: "Filter",
                    });
                  `}"
                >
                  <i class="bi bi-filter"></i>
                </button>
              </div>
            </div>
            <div
              key="courseConversations"
              css="${css`
                flex: 1;
                overflow: auto;
                display: flex;
                flex-direction: column;
              `}"
            >
              $${[
                "Pinned",
                "This week",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
                "2024-04-03 — 2024-04-14",
              ].map(
                (label, index) => html`
                  <details key="courseConversationsGroup ${label}">
                    <summary
                      class="text--secondary"
                      css="${css`
                        background-color: light-dark(
                          var(--color--slate--50),
                          var(--color--slate--950)
                        );
                        padding: var(--space--1-5) var(--space--4);
                        border-bottom: var(--border-width--1) solid
                          light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        display: flex;
                        gap: var(--space--2);
                        align-items: center;
                        cursor: pointer;
                        transition-property: var(--transition-property--colors);
                        transition-duration: var(--transition-duration--150);
                        transition-timing-function: var(
                          --transition-timing-function--ease-in-out
                        );
                        &:hover,
                        &:focus-within {
                          background-color: light-dark(
                            var(--color--slate--100),
                            var(--color--slate--900)
                          );
                        }
                        &:active {
                          background-color: light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        }
                      `}"
                    >
                      <i
                        class="bi bi-chevron-right"
                        css="${css`
                          transition-property: var(
                            --transition-property--transform
                          );
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                          details[open] > summary > & {
                            transform: rotate(var(--transform--rotate--90));
                          }
                        `}"
                      ></i>
                      <div
                        css="${css`
                          flex: 1;
                        `}"
                      >
                        ${label}
                      </div>
                      <div
                        key="courseConversationMessageViews"
                        css="${css`
                          background-color: light-dark(
                            var(--color--blue--500),
                            var(--color--blue--500)
                          );
                          width: var(--space--1-5);
                          height: var(--space--1-5);
                          border-radius: var(--border-radius--circle);
                          transition-property: var(
                            --transition-property--opacity
                          );
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                        `} ${index % 3 === 0 || index % 5 === 0
                          ? css`
                              opacity: var(--opacity--0);
                            `
                          : css``}"
                      ></div>
                    </summary>
                    <div
                      css="${css`
                        display: flex;
                        flex-direction: column;
                      `}"
                    >
                      $${Array.from(
                        { length: 1 + Math.floor(Math.random() * 4) },
                        (value, index) => html`
                          <a
                            key="courseConversation /courses/${request.state
                              .course!.externalId}/conversations/${String(
                              index,
                            )}"
                            href="https://${application.configuration
                              .hostname}/courses/${request.state.course!
                              .externalId}/conversations/${String(index)}"
                            css="${css`
                              padding: var(--space--2) var(--space--4);
                              border-bottom: var(--border-width--1) solid
                                light-dark(
                                  var(--color--slate--200),
                                  var(--color--slate--800)
                                );
                              display: flex;
                              gap: var(--space--2);
                              cursor: pointer;
                              transition-property: var(
                                --transition-property--colors
                              );
                              transition-duration: var(
                                --transition-duration--150
                              );
                              transition-timing-function: var(
                                --transition-timing-function--ease-in-out
                              );
                              &:hover,
                              &:focus-within {
                                background-color: light-dark(
                                  var(--color--slate--50),
                                  var(--color--slate--950)
                                );
                              }
                              &:active {
                                background-color: light-dark(
                                  var(--color--slate--100),
                                  var(--color--slate--900)
                                );
                              }
                            `}"
                          >
                            <div key="courseConversation--user">
                              $${application.partials.user({
                                user: "formerCourseParticipation",
                              })}
                            </div>
                            <div
                              key="courseConversation--main"
                              css="${css`
                                flex: 1;
                                min-width: var(--space--0);
                                display: flex;
                                flex-direction: column;
                              `}"
                            >
                              <div
                                key="courseConversation--main--title"
                                css="${css`
                                  display: flex;
                                  align-items: baseline;
                                  gap: var(--space--2);
                                `}"
                              >
                                <div
                                  key="courseConversation--main--title--title"
                                  css="${css`
                                    flex: 1;
                                    font-weight: 600;
                                  `}"
                                >
                                  Example of a conversation
                                </div>
                                <div
                                  key="courseConversation--main--title--id"
                                  css="${css`
                                    font-size: var(--font-size--3);
                                    line-height: var(
                                      --font-size--3--line-height
                                    );
                                    color: light-dark(
                                      var(--color--slate--400),
                                      var(--color--slate--600)
                                    );
                                  `}"
                                >
                                  #${String(
                                    1 + Math.floor(Math.random() * 100),
                                  )}
                                </div>
                              </div>
                              <div
                                key="courseConversation--main--details"
                                class="text--secondary"
                              >
                                Abigail Wall<span
                                  css="${css`
                                    font-weight: 400;
                                  `}"
                                  > ·
                                  <span
                                    css="${css`
                                      display: inline-block;
                                    `}"
                                    >2024-03-02</span
                                  ></span
                                >
                                <br />
                                $${Math.random() < 0.5
                                  ? html`<span class="text--red"
                                      >Question · Unresolved</span
                                    >`
                                  : Math.random() < 0.5
                                    ? html`Question`
                                    : html`Note`}<span
                                  css="${css`
                                    font-weight: 400;
                                  `}"
                                  > · Assignment 2 · Duplicate question</span
                                >
                              </div>
                              <div
                                key="courseConversation--main--excerpt"
                                css="${css`
                                  font-size: var(--font-size--3);
                                  line-height: var(--font-size--3--line-height);
                                  color: light-dark(
                                    var(--color--slate--500),
                                    var(--color--slate--500)
                                  );
                                  white-space: nowrap;
                                  overflow: hidden;
                                  text-overflow: ellipsis;
                                `}"
                              >
                                Human is behind a closed door, emergency!
                                abandoned! meeooowwww!!! headbutt owner's knee
                                chase laser be a nyan cat,
                              </div>
                            </div>
                            <div
                              key="courseConversation--side-decoration"
                              css="${css`
                                display: flex;
                                justify-content: center;
                                align-items: center;
                              `}"
                            >
                              <div
                                key="courseConversationMessageViews"
                                css="${css`
                                  background-color: light-dark(
                                    var(--color--blue--500),
                                    var(--color--blue--500)
                                  );
                                  width: var(--space--1-5);
                                  height: var(--space--1-5);
                                  border-radius: var(--border-radius--circle);
                                  transition-property: var(
                                    --transition-property--opacity
                                  );
                                  transition-duration: var(
                                    --transition-duration--150
                                  );
                                  transition-timing-function: var(
                                    --transition-timing-function--ease-in-out
                                  );
                                `} ${index % 3 === 0 || index % 5 === 0
                                  ? css`
                                      opacity: var(--opacity--0);
                                    `
                                  : css``}"
                              ></div>
                            </div>
                          </a>
                        `,
                      )}
                    </div>
                  </details>
                `,
              )}
            </div>
          </div>
          <button
            key="sidebar--underlay"
            css="${css`
              background-color: light-dark(
                var(--color--black),
                var(--color--white)
              );
              position: absolute;
              inset: 0;
              z-index: 99;
              opacity: var(--opacity--0);
              cursor: pointer;
              pointer-events: none;
              transition-property: var(--transition-property--opacity);
              transition-duration: var(--transition-duration--200);
              transition-timing-function: var(
                --transition-timing-function--ease-in-out
              );
              @media (max-width: 899px) {
                [key="main"].sidebar--open & {
                  opacity: var(--opacity--30);
                  pointer-events: auto;
                }
              }
            `}"
            javascript="${javascript`
              this.onclick = () => {
                document.querySelector('[key="main"]').classList.remove("sidebar--open");
              };
            `}"
          ></button>
          <div
            key="sidebar--separator"
            css="${css`
              position: relative;
              @media (max-width: 899px) {
                display: none;
              }
            `}"
          >
            <div
              css="${css`
                width: var(--border-width--4);
                height: 100%;
                position: absolute;
                transform: translateX(-50%);
                cursor: col-resize;
                pointer-events: auto;
                transition-property: var(--transition-property--colors);
                transition-delay: var(--transition-duration--150);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                &:hover,
                &.active {
                  background-color: light-dark(
                    var(--color--blue--500),
                    var(--color--blue--500)
                  );
                }
              `}"
              javascript="${javascript`
                this.onpointerdown = (event) => {
                  if (event.button !== 0) return;
                  this.classList.add("active");
                  document.querySelector("body").classList.add("noninteractive");
                  document.querySelector("body").style.cursor = "col-resize";
                  document.onpointermove = (event) => {
                    this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4)) + "px");
                  };
                  document.onpointerup = () => {
                    this.classList.remove("active");
                    document.querySelector("body").classList.remove("noninteractive");
                    document.querySelector("body").style.cursor = "";
                    document.onpointermove = undefined;
                    document.onpointerup = undefined;
                    updateSidebarWidth();
                  };
                };
                this.ondblclick = (event) => {
                  this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(80 * 4) +"px");
                  updateSidebarWidth();
                };
                const updateSidebarWidth = utilities.foregroundJob(async () => {
                  await fetch(${`https://${application.configuration.hostname}/settings`}, {
                    redirect: "manual",
                    method: "PATCH",
                    headers: { "CSRF-Protection": "true" },
                    body: new URLSearchParams({ sidebarWidth: this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.getPropertyValue("--width").slice(0, -"px".length) }),
                  });
                });
              `}"
            ></div>
          </div>
          <div
            key="main--main ${request.URL.pathname}"
            css="${css`
              flex: 1;
              overflow: auto;
            `}"
          >
            <div
              css="${css`
                max-width: var(--space--168);
                padding: var(--space--2) var(--space--4);
                @media (max-width: 899px) {
                  margin: var(--space--0) auto;
                }
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
    });
  };
};
