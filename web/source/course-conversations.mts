import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversation = {
  types: {
    states: {
      CourseConversation: Application["types"]["states"]["Course"] & {
        courseConversation: {
          id: number;
          publicId: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          questionResolved: number;
          courseConversationParticipations:
            | "courseConversationParticipationsEveryone"
            | "courseConversationParticipationsCourseParticipationRoleInstructors"
            | "courseConversationParticipationsCourseConversationParticipations";
          pinned: number;
          title: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationPublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      request.state.courseConversation = application.database.get<{
        id: number;
        publicId: string;
        courseConversationType:
          | "courseConversationTypeNote"
          | "courseConversationTypeQuestion";
        questionResolved: number;
        courseConversationParticipations:
          | "courseConversationParticipationsEveryone"
          | "courseConversationParticipationsCourseParticipationRoleInstructors"
          | "courseConversationParticipationsCourseConversationParticipations";
        pinned: number;
        title: string;
      }>(
        sql`
          select 
            "id",
            "publicId",
            "courseConversationType",
            "questionResolved",
            "courseConversationParticipations",
            "pinned",
            "title"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "publicId" = ${request.pathname.courseConversationPublicId} and (
              "courseConversationParticipations" = 'courseConversationParticipationsEveryone'
              $${
                request.state.courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? sql`
                      or
                      "courseConversationParticipations" = 'courseConversationParticipationsCourseParticipationRoleInstructors'
                    `
                  : sql``
              }
              or (
                select true
                from "courseConversationParticipations"
                where
                  "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                  "courseConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
              )
            );
        `,
      );
      if (request.state.courseConversation === undefined) return;
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)$",
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
                .publicId}/conversations/${request.state.courseConversation
                .publicId}"
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
                    request.state.course.courseState === "courseStateActive" &&
                    (request.state.courseParticipation
                      .courseParticipationRole ===
                      "courseParticipationRoleInstructor" ||
                      request.state.courseParticipation.id ===
                        application.database.get<{
                          createdByCourseParticipation: number;
                        }>(
                          sql`
                            select "createdByCourseParticipation"
                            from "courseConversationMessages"
                            where "courseConversation" = ${request.state.courseConversation.id}
                            order by "id" asc
                            limit 1;
                          `,
                        )!.createdByCourseParticipation);
                  return html`
                    $${request.state.course.courseState ===
                    "courseStateArchived"
                      ? html`
                          <div
                            key="courseConversation--archived"
                            class="text--secondary text--red"
                          >
                            <i class="bi bi-exclamation-triangle-fill"></i> This
                            course is archived (read-only).
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
                                action="/courses/${request.state.course
                                  .publicId}/conversations/${request.state
                                  .courseConversation.publicId}"
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
                      <div key="courseConversation--header--menu">
                        <button
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
                                        await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`});
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
                                      publicId: string;
                                      name: string;
                                      information: string | null;
                                    }>(
                                      sql`
                                        select
                                          "courses"."publicId" as "publicId",
                                          "courses"."name" as "name",
                                          "courses"."information" as "information"
                                        from "courses"
                                        join "courseParticipations" on
                                          "courses"."id" = "courseParticipations"."course" and
                                          "courseParticipations"."user" = ${request.state.user.id}
                                        where
                                          "courses"."id" != ${request.state.course.id} and
                                          "courses"."courseState" = 'courseStateActive'
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
                                                          href="/courses/${course.publicId}/conversations/new?${new URLSearchParams(
                                                            {
                                                              "reuse.course":
                                                                request.state
                                                                  .course!
                                                                  .publicId,
                                                              "reuse.courseConversation":
                                                                request.state
                                                                  .courseConversation!
                                                                  .publicId,
                                                            },
                                                          ).toString()}"
                                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                                        >
                                                          ${course.name}
                                                          $${typeof course.information ===
                                                          "string"
                                                            ? html`
                                                                <span
                                                                  class="text--secondary"
                                                                >
                                                                  (${course.information})
                                                                </span>
                                                              `
                                                            : html``}
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
                                    .courseParticipationRole ===
                                    "courseParticipationRoleInstructor"
                                    ? html`
                                        <button
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            javascript.tippy({
                                              event,
                                              element: this,
                                              theme: "red",
                                              placement: "bottom-end",
                                              interactive: true,
                                              trigger: "click",
                                              content: ${html`
                                                <form
                                                  method="DELETE"
                                                  action="/courses/${request
                                                    .state.course
                                                    .publicId}/conversations/${request
                                                    .state.courseConversation
                                                    .publicId}"
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
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationType"
                                            value="courseConversationTypeNote"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationType ===
                                            "courseConversationTypeNote"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Note
                                          </button>
                                        </form>
                                        <form
                                          method="PATCH"
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationType"
                                            value="courseConversationTypeQuestion"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationType ===
                                            "courseConversationTypeQuestion"
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
                                "courseConversationTypeNote"
                                  ? "Note"
                                  : request.state.courseConversation
                                        .courseConversationType ===
                                      "courseConversationTypeQuestion"
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
                                "courseConversationTypeNote"
                                  ? "Note"
                                  : request.state.courseConversation
                                        .courseConversationType ===
                                      "courseConversationTypeQuestion"
                                    ? "Question"
                                    : (() => {
                                        throw new Error();
                                      })()}
                              </div>
                            `}
                        $${request.state.courseConversation
                          .courseConversationType ===
                        "courseConversationTypeQuestion"
                          ? mayEditCourseConversation &&
                            request.state.courseParticipation
                              .courseParticipationRole ===
                              "courseParticipationRoleInstructor"
                            ? html`
                                <button
                                  class="${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  ) === false
                                    ? "text--red"
                                    : "text--green"} button button--rectangle button--transparent"
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
                                            action="/courses/${request.state
                                              .course
                                              .publicId}/conversations/${request
                                              .state.courseConversation
                                              .publicId}"
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
                                            action="/courses/${request.state
                                              .course
                                              .publicId}/conversations/${request
                                              .state.courseConversation
                                              .publicId}"
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
                                  ) === false
                                    ? "Unresolved"
                                    : "Resolved"} <i
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
                                    : "text--green"}"
                                >
                                  ${Boolean(
                                    request.state.courseConversation
                                      .questionResolved,
                                  ) === false
                                    ? "Unresolved"
                                    : "Resolved"}
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
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationParticipations"
                                            value="courseConversationParticipationsEveryone"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationParticipations ===
                                            "courseConversationParticipationsEveryone"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Everyone
                                          </button>
                                        </form>
                                        <form
                                          method="PATCH"
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationParticipations"
                                            value="courseConversationParticipationsCourseParticipationRoleInstructors"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationParticipations ===
                                            "courseConversationParticipationsCourseParticipationRoleInstructors"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Instructors and selected students
                                          </button>
                                        </form>
                                        <form
                                          method="PATCH"
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseConversationParticipations"
                                            value="courseConversationParticipationsCourseConversationParticipations"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationParticipations ===
                                            "courseConversationParticipationsCourseConversationParticipations"
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
                                "courseConversationParticipationsEveryone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationParticipations ===
                                      "courseConversationParticipationsCourseParticipationRoleInstructors"
                                    ? "Instructors and selected students"
                                    : request.state.courseConversation
                                          .courseConversationParticipations ===
                                        "courseConversationParticipationsCourseConversationParticipations"
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
                                "courseConversationParticipationsEveryone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationParticipations ===
                                      "courseConversationParticipationsCourseParticipationRoleInstructors"
                                    ? "Instructors and selected students"
                                    : request.state.courseConversation
                                          .courseConversationParticipations ===
                                        "courseConversationParticipationsCourseConversationParticipations"
                                      ? "Selected course participants"
                                      : (() => {
                                          throw new Error();
                                        })()}
                              </div>
                            `}
                        $${mayEditCourseConversation &&
                        request.state.courseParticipation
                          .courseParticipationRole ===
                          "courseParticipationRoleInstructor"
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
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
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
                                          action="/courses/${request.state
                                            .course
                                            .publicId}/conversations/${request
                                            .state.courseConversation.publicId}"
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
                                ) === false
                                  ? "Unpinned"
                                  : "Pinned"} <i class="bi bi-chevron-down"></i>
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
                                      action="/courses/${request.state.course
                                        .publicId}/conversations/${request.state
                                        .courseConversation.publicId}/taggings"
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
                                              value="${courseConversationsTag.publicId}"
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
                              key="courseConversationsTag ${courseConversationsTag.publicId}"
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
                      courseConversationMessagePublicIds.add(entry.target.courseConversationMessagePublicId);
                      this.courseConversationMessageViewsIntersectionObserver.unobserve(entry.target);
                      setTimeout(() => {
                        entry.target.querySelector('[key="courseConversationMessageView"]').classList.add("viewed");
                      }, 1000);
                    }
                    updateCourseConversationMessageViews();
                  }, {
                    root: this.closest('[key="main--main"]'),
                    threshold: 1,
                  });
                  const updateCourseConversationMessageViews = utilities.foregroundJob(async () => {
                    if (courseConversationMessagePublicIds.size === 0) return;
                    const body = new URLSearchParams([...courseConversationMessagePublicIds].map(courseConversationMessagePublicId => ["courseCourseConversationMessagePublicIds[]", courseConversationMessagePublicId]));
                    courseConversationMessagePublicIds.clear();
                    await fetch(${`/courses/${
                      request.state.course!.publicId
                    }/conversations/${
                      request.state.courseConversation!.publicId
                    }/messages/views`}, {
                      method: "POST",
                      headers: { "CSRF-Protection": "true" },
                      body,
                    });
                  });
                  const courseConversationMessagePublicIds = new Set();
                `}"
              >
                $${application.database
                  .all<{
                    id: number;
                    publicId: string;
                    createdAt: string;
                    updatedAt: string | null;
                    createdByCourseParticipation: number | null;
                    courseConversationMessageType:
                      | "courseConversationMessageTypeMessage"
                      | "courseConversationMessageTypeAnswer"
                      | "courseConversationMessageTypeFollowUpQuestion"
                      | "courseConversationMessageTypeCourseParticipationRoleInstructorWhisper";
                    courseConversationMessageAnonymity:
                      | "courseConversationMessageAnonymityNone"
                      | "courseConversationMessageAnonymityOtherCourseParticipationRoleStudents"
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
                        "courseConversationMessageAnonymity",
                        "content"
                      from "courseConversationMessages"
                      where
                        "courseConversation" = ${request.state.courseConversation.id} $${
                          request.state.courseParticipation
                            .courseParticipationRole !==
                          "courseParticipationRoleInstructor"
                            ? sql`
                                and
                                "courseConversationMessageType" != 'courseConversationMessageTypeCourseParticipationRoleInstructorWhisper'
                              `
                            : sql``
                        }
                      order by "id" asc;
                    `,
                  )
                  .map((courseConversationMessage) => {
                    const mayEditCourseConversationMessage =
                      request.state.course!.courseState ===
                        "courseStateActive" &&
                      (request.state.courseParticipation!
                        .courseParticipationRole ===
                        "courseParticipationRoleInstructor" ||
                        request.state.courseParticipation!.id ===
                          courseConversationMessage.createdByCourseParticipation);
                    const courseConversationMessageCreatedByCourseParticipation =
                      typeof courseConversationMessage.createdByCourseParticipation ===
                      "number"
                        ? application.database.get<{
                            user: number;
                            courseParticipationRole:
                              | "courseParticipationRoleInstructor"
                              | "courseParticipationRoleStudent";
                          }>(
                            sql`
                              select
                                "user",
                                "courseParticipationRole"
                              from "courseParticipations"
                              where "id" = ${courseConversationMessage.createdByCourseParticipation};
                            `,
                          )
                        : undefined;
                    const courseConversationMessageCreatedByUser =
                      courseConversationMessageCreatedByCourseParticipation !==
                      undefined
                        ? application.database.get<{
                            publicId: string;
                            name: string;
                            avatarColor:
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
                            avatarImage: string | null;
                            userRole:
                              | "userRoleSystemAdministrator"
                              | "userRoleStaff"
                              | "userRoleUser";
                            lastSeenOnlineAt: string;
                          }>(
                            sql`
                              select
                                "publicId",
                                "name",
                                "avatarColor",
                                "avatarImage",
                                "userRole",
                                "lastSeenOnlineAt"
                              from "users"
                              where "id" = ${courseConversationMessageCreatedByCourseParticipation.user};
                            `,
                          )
                        : undefined;
                    return html`
                      <div
                        key="courseConversationMessage /courses/${request.state
                          .course!.publicId}/conversations/${request.state
                          .courseConversation!
                          .publicId}/messages/${courseConversationMessage.publicId}"
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
                              javascript="${javascript`
                                if (${!courseConversationMessageView}) {
                                  this.closest('[key="courseConversationMessages"]').courseConversationMessageViewsIntersectionObserver.observe(this);
                                  this.courseConversationMessagePublicId = ${courseConversationMessage.publicId};
                                }
                              `}"
                            >
                              $${courseConversationMessageViewPartial(
                                courseConversationMessageView,
                              )}
                            </div>
                          `;
                        })()}
                        <div key="courseConversationMessage--createdBy">
                          $${application.partials.userAvatar({
                            user:
                              courseConversationMessage.courseConversationMessageAnonymity ===
                                "courseConversationMessageAnonymityCourseParticipationRoleInstructors" ||
                              (courseConversationMessage.courseConversationMessageAnonymity ===
                                "courseConversationMessageAnonymityOtherCourseParticipationRoleStudents" &&
                                request.state.courseParticipation!
                                  .courseParticipationRole ===
                                  "courseParticipationRoleStudent" &&
                                request.state.courseParticipation!.id !==
                                  courseConversationMessage.createdByCourseParticipation)
                                ? "anonymous"
                                : (courseConversationMessageCreatedByUser ??
                                  "courseParticipationDeleted"),
                            courseParticipation:
                              courseConversationMessageCreatedByCourseParticipation,
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
                              key="courseConversationMessage--main--header--byline"
                              css="${css`
                                flex: 1;
                              `}"
                            >
                              <span
                                css="${css`
                                  font-weight: 700;
                                `}"
                                >${courseConversationMessage.courseConversationMessageAnonymity ===
                                  "courseConversationMessageAnonymityCourseParticipationRoleInstructors" ||
                                (courseConversationMessage.courseConversationMessageAnonymity ===
                                  "courseConversationMessageAnonymityOtherCourseParticipationRoleStudents" &&
                                  request.state.courseParticipation!
                                    .courseParticipationRole ===
                                    "courseParticipationRoleStudent" &&
                                  request.state.courseParticipation!.id !==
                                    courseConversationMessage.createdByCourseParticipation)
                                  ? "Anonymous"
                                  : (courseConversationMessageCreatedByUser?.name ??
                                    "Deleted course participant")}</span
                              ><span
                                css="${css`
                                  font-weight: 400;
                                `}"
                                >$${courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                "courseParticipationRoleInstructor"
                                  ? html` (course staff)`
                                  : html``}$${courseConversationMessage.courseConversationMessageAnonymity ===
                                  "courseConversationMessageAnonymityOtherCourseParticipationRoleStudents" &&
                                (request.state.courseParticipation!
                                  .courseParticipationRole ===
                                  "courseParticipationRoleInstructor" ||
                                  request.state.courseParticipation!.id ===
                                    courseConversationMessage.createdByCourseParticipation)
                                  ? html` (anonymous to other students)`
                                  : html``} ·
                                <time
                                  datetime="${courseConversationMessage.createdAt}"
                                  javascript="${javascript`
                                    javascript.relativizeDateTimeElement(this, { capitalize: true });
                                  `}"
                                ></time
                                >$${typeof courseConversationMessage.updatedAt ===
                                "string"
                                  ? html` (updated
                                      <time
                                        datetime="${courseConversationMessage.updatedAt}"
                                        javascript="${javascript`
                                          javascript.relativizeDateTimeElement(this, { preposition: true });
                                        `}"
                                      ></time
                                      >)`
                                  : html``}$${courseConversationMessage.courseConversationMessageType ===
                                "courseConversationMessageTypeMessage"
                                  ? html``
                                  : courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageTypeAnswer"
                                    ? html`<span
                                        > ·
                                        <span class="text--green"
                                          ><span
                                            css="${css`
                                              font-weight: 700;
                                            `}"
                                            >Answer</span
                                          >$${courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                            "courseParticipationRoleStudent" &&
                                          application.database.get(
                                            sql`
                                              select true
                                              from "courseConversationMessageLikes"
                                              join "courseParticipations" on
                                                "courseConversationMessageLikes"."courseParticipation" = "courseParticipations"."id" and
                                                "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor'
                                              where "courseConversationMessageLikes"."courseConversationMessage" = ${courseConversationMessage.id};
                                            `,
                                          ) !== undefined
                                            ? html` (liked by instructor)`
                                            : html``}</span
                                        ></span
                                      >`
                                    : courseConversationMessage.courseConversationMessageType ===
                                        "courseConversationMessageTypeFollowUpQuestion"
                                      ? html`<span
                                          > ·
                                          <span
                                            class="text--red"
                                            css="${css`
                                              font-weight: 700;
                                            `}"
                                            >Follow-up question</span
                                          ></span
                                        >`
                                      : courseConversationMessage.courseConversationMessageType ===
                                          "courseConversationMessageTypeCourseParticipationRoleInstructorWhisper"
                                        ? html`<span
                                            > ·
                                            <span class="text--blue"
                                              ><span
                                                css="${css`
                                                  font-weight: 700;
                                                `}"
                                                >Instructor whisper</span
                                              >
                                              (hidden from students)</span
                                            ></span
                                          >`
                                        : (() => {
                                            throw new Error();
                                          })()}</span
                              >
                            </div>
                            <div
                              key="courseConversationMessage--main--header--menu"
                            >
                              <button
                                class="button button--square button--icon button--transparent"
                                css="${css`
                                  margin-right: var(--space---0-5);
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
                                              await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${request.state.course!.publicId}/conversations/${request.state.courseConversation!.publicId}?${new URLSearchParams({ message: courseConversationMessage.publicId }).toString()}`});
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
                                          Copy message permanent link
                                        </button>
                                        $${request.state.course!.archivedAt ===
                                        null
                                          ? html`
                                              <button
                                                class="button button--rectangle button--transparent button--dropdown-menu"
                                                javascript="${javascript`
                                                  this.onclick = async () => {
                                                    alert("TODO");
                                                  };
                                                `}"
                                              >
                                                Reply
                                              </button>
                                            `
                                          : html``}
                                        $${mayEditCourseConversationMessage
                                          ? html`
                                              <button
                                                class="button button--rectangle button--transparent button--dropdown-menu"
                                                javascript="${javascript`
                                                  this.onclick = () => {
                                                    this.closest('[key="courseConversationMessage--main"]').querySelector('[key="courseConversationMessage--main--content--show"]').hidden = true;
                                                    this.closest('[key="courseConversationMessage--main"]').querySelector('[key="courseConversationMessage--main--content--edit"]').hidden = false;
                                                    this.closest('[key="courseConversationMessage--main"]').querySelector('[key="courseConversationMessage--main--footer"]').hidden = true;
                                                    Tippy.hideAll();
                                                    this.closest('[key="courseConversationMessage--main"]').querySelector('[key="courseConversationMessage--main--content--edit"] [name="TODO"]').focus();
                                                  };
                                                `}"
                                              >
                                                Edit message
                                              </button>
                                            `
                                          : html``}
                                        $${mayEditCourseConversationMessage &&
                                        courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                          "courseParticipationRoleStudent"
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
                                                    content: ${html` TODO `},
                                                  });
                                                `}"
                                              >
                                                Change anonymity
                                              </button>
                                            `
                                          : html``}
                                        $${mayEditCourseConversationMessage &&
                                        request.state.courseConversation!
                                          .courseConversationType ===
                                          "courseConversationTypeQuestion" &&
                                        courseConversationMessage.courseConversationMessageType !==
                                          "courseConversationMessageTypeCourseParticipationRoleInstructorWhisper" &&
                                        courseConversationMessage.publicId !==
                                          "1"
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
                                                        <form
                                                          method="PATCH"
                                                          action="/courses/${request
                                                            .state.course!
                                                            .publicId}/conversations/${request
                                                            .state
                                                            .courseConversation!
                                                            .publicId}/messages/${courseConversationMessage.publicId}"
                                                        >
                                                          <input
                                                            type="hidden"
                                                            name="courseConversationMessageType"
                                                            value="courseConversationMessageMessage"
                                                          />
                                                          <button
                                                            class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                            "courseConversationMessageMessage"
                                                              ? "button--blue"
                                                              : ""} button--dropdown-menu"
                                                          >
                                                            Message
                                                          </button>
                                                        </form>
                                                        <form
                                                          method="PATCH"
                                                          action="/courses/${request
                                                            .state.course!
                                                            .publicId}/conversations/${request
                                                            .state
                                                            .courseConversation!
                                                            .publicId}/messages/${courseConversationMessage.publicId}"
                                                        >
                                                          <input
                                                            type="hidden"
                                                            name="courseConversationMessageType"
                                                            value="courseConversationMessageAnswer"
                                                          />
                                                          <button
                                                            class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                            "courseConversationMessageAnswer"
                                                              ? "button--blue"
                                                              : ""} button--dropdown-menu"
                                                          >
                                                            Answer
                                                          </button>
                                                        </form>
                                                        <form
                                                          method="PATCH"
                                                          action="/courses/${request
                                                            .state.course!
                                                            .publicId}/conversations/${request
                                                            .state
                                                            .courseConversation!
                                                            .publicId}/messages/${courseConversationMessage.publicId}"
                                                        >
                                                          <input
                                                            type="hidden"
                                                            name="courseConversationMessageType"
                                                            value="courseConversationMessageFollowUpQuestion"
                                                          />
                                                          <button
                                                            class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                            "courseConversationMessageFollowUpQuestion"
                                                              ? "button--blue"
                                                              : ""} button--dropdown-menu"
                                                          >
                                                            Follow-up question
                                                          </button>
                                                        </form>
                                                      </div>
                                                    `},
                                                  });
                                                `}"
                                              >
                                                Change message type
                                              </button>
                                            `
                                          : html``}
                                        $${mayEditCourseConversationMessage &&
                                        request.state.courseParticipation!
                                          .courseParticipationRole ===
                                          "courseParticipationRoleInstructor" &&
                                        courseConversationMessage.publicId !==
                                          "1"
                                          ? html`
                                              <button
                                                class="button button--rectangle button--transparent button--dropdown-menu"
                                                javascript="${javascript`
                                                  javascript.tippy({
                                                    event,
                                                    element: this,
                                                    theme: "red",
                                                    placement: "bottom-end",
                                                    interactive: true,
                                                    trigger: "click",
                                                    content: ${html`
                                                      <form
                                                        method="DELETE"
                                                        action="/courses/${request
                                                          .state.course!
                                                          .publicId}/conversations/${request
                                                          .state
                                                          .courseConversation!
                                                          .publicId}/messages/${courseConversationMessage.publicId}"
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
                                                          > This action cannot
                                                          be reverted.
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
                                                            Delete message
                                                          </button>
                                                        </div>
                                                      </form>
                                                    `},
                                                  });
                                                `}"
                                              >
                                                Delete message
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
                            key="courseConversationMessage--main--content--show"
                          >
                            ${courseConversationMessage.contentSource}
                          </div>
                          $${mayEditCourseConversationMessage
                            ? html`
                                <div
                                  key="courseConversationMessage--main--content--edit"
                                  hidden
                                >
                                  TODO
                                </div>
                              `
                            : html``}
                          $${(() => {
                            let courseConversationMessageMainFooterHTML = html``;
                            if (request.state.course!.archivedAt === null)
                              courseConversationMessageMainFooterHTML +=
                                application.database.get(
                                  sql`
                                    select true
                                    from "courseConversationMessageLikes"
                                    where
                                      "courseConversationMessage" = ${courseConversationMessage.id} and
                                      "courseParticipation" = ${request.state.courseParticipation!.id};
                                  `,
                                ) === undefined
                                  ? html`
                                      <form
                                        method="POST"
                                        action="/courses/${request.state.course!
                                          .publicId}/conversations/${request
                                          .state.courseConversation!
                                          .publicId}/messages/${courseConversationMessage.publicId}/likes"
                                      >
                                        <button
                                          key="courseConversationMessage--main--footer--like"
                                          class="button button--rectangle button--transparent"
                                        >
                                          Like
                                        </button>
                                      </form>
                                    `
                                  : html`
                                      <form
                                        method="DELETE"
                                        action="/courses/${request.state.course!
                                          .publicId}/conversations/${request
                                          .state.courseConversation!
                                          .publicId}/messages/${courseConversationMessage.publicId}/likes"
                                      >
                                        <button
                                          key="courseConversationMessage--main--footer--like"
                                          class="text--blue button button--rectangle button--transparent"
                                        >
                                          Liked
                                        </button>
                                      </form>
                                    `;
                            const courseConversationMessageLikes =
                              application.database.all<{
                                courseParticipation: number | null;
                              }>(
                                sql`
                                  select "courseParticipation"
                                  from "courseConversationMessageLikes"
                                  where "courseConversationMessage" = ${courseConversationMessage.id}
                                  order by "id" asc;
                                `,
                              );
                            if (courseConversationMessageLikes.length > 0)
                              courseConversationMessageMainFooterHTML += html`
                                <button
                                  key="courseConversationMessage--main--footer--likes"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    javascript.tippy({
                                      event,
                                      element: this,
                                      theme: "max-height",
                                      placement: "top-start",
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
                                          $${courseConversationMessageLikes.map(
                                            (courseConversationMessageLike) => {
                                              const courseConversationMessageViewCourseParticipation =
                                                typeof courseConversationMessageLike.courseParticipation ===
                                                "number"
                                                  ? application.database.get<{
                                                      user: number;
                                                      courseRole:
                                                        | "courseStaff"
                                                        | "courseStudent";
                                                    }>(
                                                      sql`
                                                        select
                                                          "user",
                                                          "courseRole"
                                                        from "courseParticipations"
                                                        where "id" = ${courseConversationMessageLike.courseParticipation};
                                                      `,
                                                    )
                                                  : undefined;
                                              const courseConversationMessageViewUser =
                                                courseConversationMessageViewCourseParticipation !==
                                                undefined
                                                  ? application.database.get<{
                                                      id: number;
                                                      publicId: string;
                                                      createdAt: string;
                                                      name: string;
                                                      nameSearch: string;
                                                      email: string;
                                                      emailVerificationNonce:
                                                        | string
                                                        | null;
                                                      emailVerificationCreatedAt:
                                                        | string
                                                        | null;
                                                      emailVerified: number;
                                                      password: string | null;
                                                      passwordResetNonce:
                                                        | string
                                                        | null;
                                                      passwordResetCreatedAt:
                                                        | string
                                                        | null;
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
                                                      darkMode:
                                                        | "system"
                                                        | "light"
                                                        | "dark";
                                                      sidebarWidth: number;
                                                      emailNotificationsForAllMessages: number;
                                                      emailNotificationsForMessagesIncludingMentions: number;
                                                      emailNotificationsForMessagesInConversationsYouStarted: number;
                                                      emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
                                                      anonymous: number;
                                                      mostRecentlyVisitedCourse:
                                                        | number
                                                        | null;
                                                    }>(
                                                      sql`
                                                        select
                                                          "id",
                                                          "publicId",
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
                                                        where "id" = ${courseConversationMessageViewCourseParticipation.user};
                                                      `,
                                                    )
                                                  : undefined;
                                              return html`
                                                <div
                                                  css="${css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                  `}"
                                                >
                                                  $${application.partials.userAvatar(
                                                    {
                                                      user:
                                                        courseConversationMessageViewUser ??
                                                        "courseParticipationDeleted",
                                                    },
                                                  )}
                                                  <div
                                                    css="${css`
                                                      margin-top: var(
                                                        --space--0-5
                                                      );
                                                    `}"
                                                  >
                                                    ${courseConversationMessageViewUser?.name ??
                                                    "Former course participant"}<span
                                                      class="text--secondary"
                                                      css="${css`
                                                        font-weight: 400;
                                                      `}"
                                                      >${courseConversationMessageViewCourseParticipation?.courseRole ===
                                                      "courseStaff"
                                                        ? " (course staff)"
                                                        : ""}</span
                                                    >
                                                  </div>
                                                </div>
                                              `;
                                            },
                                          )}
                                        </div>
                                      `},
                                    });
                                  `}"
                                >
                                  ${String(
                                    courseConversationMessageLikes.length,
                                  )}
                                  like${courseConversationMessageLikes.length !==
                                  1
                                    ? "s"
                                    : ""} <i class="bi bi-chevron-down"></i>
                                </button>
                              `;
                            if (
                              request.state.courseParticipation!
                                .courseParticipationRole ===
                              "courseParticipationRoleInstructor"
                            ) {
                              const courseConversationMessageViews =
                                application.database.all<{
                                  createdAt: string;
                                  courseParticipation: number | null;
                                }>(
                                  sql`
                                    select "createdAt", "courseParticipation"
                                    from "courseConversationMessageViews"
                                    where "courseConversationMessage" = ${courseConversationMessage.id}
                                    order by "id" asc;
                                  `,
                                );
                              courseConversationMessageMainFooterHTML +=
                                courseConversationMessageViews.length > 0
                                  ? html`
                                      <button
                                        key="courseConversationMessage--main--footer--views"
                                        class="button button--rectangle button--transparent"
                                        javascript="${javascript`
                                          javascript.tippy({
                                            event,
                                            element: this,
                                            placement: "top-start",
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
                                                $${courseConversationMessageViews.map(
                                                  (
                                                    courseConversationMessageView,
                                                  ) => {
                                                    const courseConversationMessageViewCourseParticipation =
                                                      typeof courseConversationMessageView.courseParticipation ===
                                                      "number"
                                                        ? application.database.get<{
                                                            user: number;
                                                            courseRole:
                                                              | "courseStaff"
                                                              | "courseStudent";
                                                          }>(
                                                            sql`
                                                              select
                                                                "user",
                                                                "courseRole"
                                                              from "courseParticipations"
                                                              where "id" = ${courseConversationMessageView.courseParticipation};
                                                            `,
                                                          )
                                                        : undefined;
                                                    const courseConversationMessageViewUser =
                                                      courseConversationMessageViewCourseParticipation !==
                                                      undefined
                                                        ? application.database.get<{
                                                            id: number;
                                                            publicId: string;
                                                            createdAt: string;
                                                            name: string;
                                                            nameSearch: string;
                                                            email: string;
                                                            emailVerificationNonce:
                                                              | string
                                                              | null;
                                                            emailVerificationCreatedAt:
                                                              | string
                                                              | null;
                                                            emailVerified: number;
                                                            password:
                                                              | string
                                                              | null;
                                                            passwordResetNonce:
                                                              | string
                                                              | null;
                                                            passwordResetCreatedAt:
                                                              | string
                                                              | null;
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
                                                            avatar:
                                                              | string
                                                              | null;
                                                            systemRole:
                                                              | "systemAdministrator"
                                                              | "systemStaff"
                                                              | "systemUser";
                                                            lastSeenOnlineAt: string;
                                                            darkMode:
                                                              | "system"
                                                              | "light"
                                                              | "dark";
                                                            sidebarWidth: number;
                                                            emailNotificationsForAllMessages: number;
                                                            emailNotificationsForMessagesIncludingMentions: number;
                                                            emailNotificationsForMessagesInConversationsYouStarted: number;
                                                            emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
                                                            anonymous: number;
                                                            mostRecentlyVisitedCourse:
                                                              | number
                                                              | null;
                                                          }>(
                                                            sql`
                                                              select
                                                                "id",
                                                                "publicId",
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
                                                              where "id" = ${courseConversationMessageViewCourseParticipation.user};
                                                            `,
                                                          )
                                                        : undefined;
                                                    return html`
                                                      <div
                                                        css="${css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                        `}"
                                                      >
                                                        $${application.partials.userAvatar(
                                                          {
                                                            user:
                                                              courseConversationMessageViewUser ??
                                                              "courseParticipationDeleted",
                                                          },
                                                        )}
                                                        <div
                                                          css="${css`
                                                            margin-top: var(
                                                              --space--0-5
                                                            );
                                                          `}"
                                                        >
                                                          ${courseConversationMessageViewUser?.name ??
                                                          "Former course participant"}<span
                                                            class="text--secondary"
                                                            css="${css`
                                                              font-weight: 400;
                                                            `}"
                                                            >${courseConversationMessageViewCourseParticipation?.courseRole ===
                                                            "courseStaff"
                                                              ? " (course staff)"
                                                              : ""} ·
                                                            <time
                                                              datetime="${courseConversationMessageView.createdAt}"
                                                              javascript="${javascript`
                                                                javascript.relativizeDateTimeElement(this, { preposition: true, capitalize: true });
                                                              `}"
                                                            ></time
                                                          ></span>
                                                        </div>
                                                      </div>
                                                    `;
                                                  },
                                                )}
                                              </div>
                                            `},
                                          });
                                        `}"
                                      >
                                        ${String(
                                          courseConversationMessageViews.length,
                                        )}
                                        view${courseConversationMessageViews.length !==
                                        1
                                          ? "s"
                                          : ""} <i
                                          class="bi bi-chevron-down"
                                        ></i>
                                      </button>
                                    `
                                  : html`
                                      <div
                                        key="courseConversationMessage--main--footer--views"
                                      >
                                        0 views
                                      </div>
                                    `;
                            }
                            return courseConversationMessageMainFooterHTML !==
                              html``
                              ? html`
                                  <div
                                    key="courseConversationMessage--main--footer"
                                    class="text--secondary"
                                    css="${css`
                                      display: flex;
                                      flex-wrap: wrap;
                                      column-gap: var(--space--4);
                                      row-gap: var(--space--2);
                                    `}"
                                  >
                                    $${courseConversationMessageMainFooterHTML}
                                  </div>
                                `
                              : html``;
                          })()}
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
                        $${application.partials.courseConversationMessageContentEditor()}
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
            key="sidebar /courses/${request.state.course.publicId}"
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
              $${request.state.course.courseState === "courseStateActive"
                ? html`
                    <a
                      key="new-conversation"
                      href="/courses/${request.state.course
                        .publicId}/conversations/new"
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
                      $${courseConversationMessageViewPartial(
                        index % 3 === 0 || index % 5 === 0,
                      )}
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
                              .course!.publicId}/conversations/${String(index)}"
                            href="/courses/${request.state.course!
                              .publicId}/conversations/${String(index)}"
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
                              $${application.partials.userAvatar({
                                user: "courseParticipationDeleted",
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
                              $${courseConversationMessageViewPartial(
                                index % 3 === 0 || index % 5 === 0,
                              )}
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
                javascript.stateRemove(document.querySelector('[key="main"]'), "sidebar--open");
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
                [state~="active"] {
                  background-color: light-dark(
                    var(--color--blue--500),
                    var(--color--blue--500)
                  );
                }
              `}"
              javascript="${javascript`
                this.onpointerdown = (event) => {
                  if (event.button !== 0) return;
                  javascript.stateAdd(this, "active");
                  javascript.stateAdd(document.querySelector("body"), "noninteractive");
                  document.querySelector("body").style.cursor = "col-resize";
                  document.onpointermove = (event) => {
                    this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4)) + "px");
                  };
                  document.onpointerup = () => {
                    javascript.stateRemove(this, "active");
                    javascript.stateRemove(document.querySelector("body"), "noninteractive");
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
                  await fetch(${`/settings`}, {
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

  const courseConversationMessageViewPartial = (viewed: boolean): HTML => html`
    <div
      key="courseConversationMessageView"
      class="${viewed ? "viewed" : ""}"
      css="${css`
        background-color: light-dark(
          var(--color--blue--500),
          var(--color--blue--500)
        );
        width: var(--space--1-5);
        height: var(--space--1-5);
        border-radius: var(--border-radius--circle);
        transition-property: var(--transition-property--opacity);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(
          --transition-timing-function--ease-in-out
        );
        &.viewed {
          opacity: var(--opacity--0);
        }
      `}"
    ></div>
  `;
};
