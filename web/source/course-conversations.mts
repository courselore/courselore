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
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
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
        courseConversationVisibility:
          | "courseConversationVisibilityEveryone"
          | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
          | "courseConversationVisibilityCourseConversationParticipations";
        pinned: number;
        title: string;
      }>(
        sql`
          select 
            "id",
            "publicId",
            "courseConversationType",
            "questionResolved",
            "courseConversationVisibility",
            "pinned",
            "title"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "publicId" = ${request.pathname.courseConversationPublicId} and (
              "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
              $${
                request.state.courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? sql`
                      or
                      "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
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
                gap: var(--space--6);
              `}"
            >
              <div
                key="courseConversation--header"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                $${(() => {
                  const mayEditCourseConversation =
                    request.state.course.courseState === "courseStateActive" &&
                    (request.state.courseParticipation
                      .courseParticipationRole ===
                      "courseParticipationRoleInstructor" ||
                      request.state.courseParticipation.id ===
                        (
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
                          ) ??
                          (() => {
                            throw new Error();
                          })()
                        ).createdByCourseParticipation);
                  return html`
                    $${request.state.course.courseState ===
                    "courseStateArchived"
                      ? html`
                          <div
                            key="courseConversation--archived"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              font-weight: 600;
                              color: light-dark(
                                var(--color--red--500),
                                var(--color--red--500)
                              );
                            `}"
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
                            font-weight: 800;
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
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `}"
                              >
                                <input
                                  name="title"
                                  value="${request.state.courseConversation
                                    .title}"
                                  class="input--text"
                                />
                                <div
                                  css="${css`
                                    font-size: var(--font-size--3);
                                    line-height: var(
                                      --font-size--3--line-height
                                    );
                                    display: flex;
                                    align-items: baseline;
                                    flex-wrap: wrap;
                                    column-gap: var(--space--4);
                                    row-gap: var(--space--2);
                                  `}"
                                >
                                  <div>
                                    <button
                                      class="button button--rectangle button--blue"
                                    >
                                      Update
                                    </button>
                                  </div>
                                  <div>
                                    <button
                                      type="reset"
                                      class="button button--rectangle button--transparent"
                                      css="${css`
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--slate--600),
                                          var(--color--slate--400)
                                        );
                                      `}"
                                      javascript="${javascript`
                                        this.onclick = () => {
                                          this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--show"]').hidden = false;
                                          this.closest('[key="courseConversation--header"]').querySelector('[key="courseConversation--header--title--edit"]').hidden = true;
                                        };
                                      `}"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </form>
                            `
                          : html``}
                      </div>
                      <div key="courseConversation--header--menu">
                        <button
                          class="button button--square button--icon button--transparent"
                          css="${css`
                            font-size: var(--font-size--4);
                            line-height: var(--space--0);
                            color: light-dark(
                              var(--color--slate--600),
                              var(--color--slate--400)
                            );
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
                                                                  css="${css`
                                                                    font-size: var(
                                                                      --font-size--3
                                                                    );
                                                                    line-height: var(
                                                                      --font-size--3--line-height
                                                                    );
                                                                    font-weight: 600;
                                                                    color: light-dark(
                                                                      var(
                                                                        --color--slate--600
                                                                      ),
                                                                      var(
                                                                        --color--slate--400
                                                                      )
                                                                    );
                                                                  `}"
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
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div
                        css="${css`
                          display: flex;
                          align-items: baseline;
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
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Type:</span
                                >  ${request.state.courseConversation
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
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Type:</span
                                >  ${request.state.courseConversation
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
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Question:</span
                                  >  <span
                                    css="${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === false
                                      ? css`
                                          color: light-dark(
                                            var(--color--red--500),
                                            var(--color--red--500)
                                          );
                                        `
                                      : css`
                                          color: light-dark(
                                            var(--color--green--500),
                                            var(--color--green--500)
                                          );
                                        `}"
                                    >${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === false
                                      ? "Unresolved"
                                      : "Resolved"}</span
                                  > <i class="bi bi-chevron-down"></i>
                                </button>
                              `
                            : html`
                                <div>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Question:</span
                                  >  <span
                                    css="${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === false
                                      ? css`
                                          color: light-dark(
                                            var(--color--red--500),
                                            var(--color--red--500)
                                          );
                                        `
                                      : css`
                                          color: light-dark(
                                            var(--color--green--500),
                                            var(--color--green--500)
                                          );
                                        `}"
                                    >${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === false
                                      ? "Unresolved"
                                      : "Resolved"}</span
                                  >
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
                                            name="courseConversationVisibility"
                                            value="courseConversationVisibilityEveryone"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationVisibility ===
                                            "courseConversationVisibilityEveryone"
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
                                            name="courseConversationVisibility"
                                            value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationVisibility ===
                                            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                              ? "button--blue"
                                              : ""} button--dropdown-menu"
                                          >
                                            Instructors and selected course
                                            participants
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
                                            name="courseConversationVisibility"
                                            value="courseConversationVisibilityCourseConversationParticipations"
                                          />
                                          <button
                                            class="button button--rectangle button--transparent $${request
                                              .state.courseConversation
                                              .courseConversationVisibility ===
                                            "courseConversationVisibilityCourseConversationParticipations"
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
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Visibility:</span
                                >  ${request.state.courseConversation
                                  .courseConversationVisibility ===
                                "courseConversationVisibilityEveryone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationVisibility ===
                                      "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                    ? "Instructors and selected course participants"
                                    : request.state.courseConversation
                                          .courseConversationVisibility ===
                                        "courseConversationVisibilityCourseConversationParticipations"
                                      ? "Selected course participants"
                                      : (() => {
                                          throw new Error();
                                        })()} <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : html`
                              <div>
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Visibility:</span
                                >  ${request.state.courseConversation
                                  .courseConversationVisibility ===
                                "courseConversationVisibilityEveryone"
                                  ? "Everyone"
                                  : request.state.courseConversation
                                        .courseConversationVisibility ===
                                      "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                    ? "Instructors and selected course participants"
                                    : request.state.courseConversation
                                          .courseConversationVisibility ===
                                        "courseConversationVisibilityCourseConversationParticipations"
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
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Pin:</span
                                >  ${Boolean(
                                  request.state.courseConversation.pinned,
                                ) === false
                                  ? "Unpinned"
                                  : "Pinned"} <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : Boolean(request.state.courseConversation.pinned)
                            ? html`
                                <div>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Pin:</span
                                  >  Pinned
                                </div>
                              `
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
                        if (courseConversationsTagsWithTagging.length > 0)
                          courseConversationsTagsHTML += html`
                            <div
                              css="${css`
                                flex: 1;
                                font-weight: 400;
                              `}"
                            >
                              ${courseConversationsTagsWithTagging
                                .map(
                                  (courseConversationsTag) =>
                                    courseConversationsTag.name,
                                )
                                .join(" · ")}
                            </div>
                          `;
                        return courseConversationsTagsHTML !== html``
                          ? html`
                              <div
                                css="${css`
                                  display: flex;
                                  gap: var(--space--4);
                                  align-items: baseline;
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
                $${(() => {
                  const firstCourseConversationMessage =
                    application.database.get<{ id: number }>(
                      sql`
                        select "id"
                        from "courseConversationMessages"
                        where "courseConversation" = ${request.state.courseConversation.id}
                        order by "id" asc
                        limit 1;
                      `,
                    );
                  if (firstCourseConversationMessage === undefined)
                    throw new Error();
                  return application.database
                    .all<{
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
                          "courseConversation" = ${request.state.courseConversation.id} $${
                            request.state.courseParticipation
                              .courseParticipationRole !==
                            "courseParticipationRoleInstructor"
                              ? sql`
                                  and
                                  "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
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
                          key="courseConversationMessage /courses/${request
                            .state.course!.publicId}/conversations/${request
                            .state.courseConversation!
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
                                  "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                                  request.state.courseParticipation!
                                    .courseParticipationRole ===
                                    "courseParticipationRoleStudent" &&
                                  request.state.courseParticipation!.id !==
                                    courseConversationMessage.createdByCourseParticipation)
                                  ? "anonymous"
                                  : (courseConversationMessageCreatedByUser ??
                                    "courseParticipationDeleted"),
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
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 600;
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
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
                                    "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
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
                                    ? html` (instructor)`
                                    : html``}$${courseConversationMessage.courseConversationMessageAnonymity ===
                                    "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                                  (request.state.courseParticipation!
                                    .courseParticipationRole ===
                                    "courseParticipationRoleInstructor" ||
                                    request.state.courseParticipation!.id ===
                                      courseConversationMessage.createdByCourseParticipation)
                                    ? html` (anonymous to students)`
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
                                          <span
                                            css="${css`
                                              color: light-dark(
                                                var(--color--green--500),
                                                var(--color--green--500)
                                              );
                                            `}"
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
                                              css="${css`
                                                font-weight: 700;
                                                color: light-dark(
                                                  var(--color--red--500),
                                                  var(--color--red--500)
                                                );
                                              `}"
                                              >Follow-up question</span
                                            ></span
                                          >`
                                        : courseConversationMessage.courseConversationMessageVisibility ===
                                            "courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                                          ? html`<span
                                              > ·
                                              <span
                                                css="${css`
                                                  font-weight: 700;
                                                  color: light-dark(
                                                    var(--color--blue--500),
                                                    var(--color--blue--500)
                                                  );
                                                `}"
                                                >Visible to instructors
                                                only</span
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
                                          $${request.state.course!
                                            .courseState === "courseStateActive"
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
                                          courseConversationMessage.id !==
                                            firstCourseConversationMessage.id
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
                                                            gap: var(
                                                              --space--2
                                                            );
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
                                                              value="courseConversationMessageTypeMessage"
                                                            />
                                                            <button
                                                              class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                              "courseConversationMessageTypeMessage"
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
                                                              value="courseConversationMessageTypeAnswer"
                                                            />
                                                            <button
                                                              class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                              "courseConversationMessageTypeAnswer"
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
                                                              value="courseConversationMessageTypeFollowUpQuestion"
                                                            />
                                                            <button
                                                              class="button button--rectangle button--transparent $${courseConversationMessage.courseConversationMessageType ===
                                                              "courseConversationMessageTypeFollowUpQuestion"
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
                                          courseConversationMessage.id !==
                                            firstCourseConversationMessage.id
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
                                                            gap: var(
                                                              --space--2
                                                            );
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
                              ${courseConversationMessage.content}
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
                              if (
                                request.state.course!.courseState ===
                                "courseStateActive"
                              )
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
                                          action="/courses/${request.state
                                            .course!
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
                                          action="/courses/${request.state
                                            .course!
                                            .publicId}/conversations/${request
                                            .state.courseConversation!
                                            .publicId}/messages/${courseConversationMessage.publicId}/likes"
                                        >
                                          <button
                                            key="courseConversationMessage--main--footer--like"
                                            class="button button--rectangle button--transparent"
                                            css="${css`
                                              color: light-dark(
                                                var(--color--blue--500),
                                                var(--color--blue--500)
                                              );
                                            `}"
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
                                              (
                                                courseConversationMessageLike,
                                              ) => {
                                                const courseConversationMessageLikeCourseParticipation =
                                                  typeof courseConversationMessageLike.courseParticipation ===
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
                                                          where "id" = ${courseConversationMessageLike.courseParticipation};
                                                        `,
                                                      )
                                                    : undefined;
                                                const courseConversationMessageLikeUser =
                                                  courseConversationMessageLikeCourseParticipation !==
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
                                                        avatarImage:
                                                          | string
                                                          | null;
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
                                                          where "id" = ${courseConversationMessageLikeCourseParticipation.user};
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
                                                          courseConversationMessageLikeUser ??
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
                                                      ${courseConversationMessageLikeUser?.name ??
                                                      "Deleted course participant"}<span
                                                        css="${css`
                                                          font-size: var(
                                                            --font-size--3
                                                          );
                                                          line-height: var(
                                                            --font-size--3--line-height
                                                          );
                                                          color: light-dark(
                                                            var(
                                                              --color--slate--600
                                                            ),
                                                            var(
                                                              --color--slate--400
                                                            )
                                                          );
                                                        `}"
                                                        >${courseConversationMessageLikeCourseParticipation?.courseParticipationRole ===
                                                        "courseParticipationRoleInstructor"
                                                          ? " (instructor)"
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
                                                              courseParticipationRole:
                                                                | "courseParticipationRoleInstructor"
                                                                | "courseParticipationRoleStudent";
                                                            }>(
                                                              sql`
                                                                select
                                                                  "user",
                                                                  "courseParticipationRole"
                                                                from "courseParticipations"
                                                                where "id" = ${courseConversationMessageView.courseParticipation};
                                                              `,
                                                            )
                                                          : undefined;
                                                      const courseConversationMessageViewUser =
                                                        courseConversationMessageViewCourseParticipation !==
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
                                                              avatarImage:
                                                                | string
                                                                | null;
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
                                                                where "id" = ${courseConversationMessageViewCourseParticipation.user};
                                                              `,
                                                            )
                                                          : undefined;
                                                      return html`
                                                        <div
                                                          css="${css`
                                                            display: flex;
                                                            gap: var(
                                                              --space--2
                                                            );
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
                                                            "Deleted course participant"}<span
                                                              css="${css`
                                                                font-size: var(
                                                                  --font-size--3
                                                                );
                                                                line-height: var(
                                                                  --font-size--3--line-height
                                                                );
                                                                color: light-dark(
                                                                  var(
                                                                    --color--slate--600
                                                                  ),
                                                                  var(
                                                                    --color--slate--400
                                                                  )
                                                                );
                                                              `}"
                                                              >${courseConversationMessageViewCourseParticipation?.courseParticipationRole ===
                                                              "courseParticipationRoleInstructor"
                                                                ? " (instructor)"
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
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--slate--600),
                                          var(--color--slate--400)
                                        );
                                        display: flex;
                                        align-items: baseline;
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
                    });
                })()}
              </div>
              $${request.state.course.courseState === "courseStateActive"
                ? html`
                    <form
                      key="courseConversationMessage--new"
                      method="POST"
                      action="/courses/${request.state.course
                        .publicId}/conversations/${request.state
                        .courseConversation.publicId}/messages"
                      novalidate
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      $${application.partials.courseConversationMessageContentEditor()}
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          display: flex;
                          align-items: baseline;
                          gap: var(--space--4);
                        `}"
                      >
                        <div>
                          <button class="button button--rectangle button--blue">
                            Send
                          </button>
                        </div>
                        $${(() => {
                          let courseConversationMessageNewOptionsHTML = html``;
                          if (
                            request.state.courseConversation
                              .courseConversationType ===
                            "courseConversationTypeQuestion"
                          )
                            courseConversationMessageNewOptionsHTML += html`
                              <button
                                type="button"
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
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest("form").querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeMessage"]').checked = true;
                                              for (const element of this.parentElement.querySelectorAll("button")) element.classList.remove("button--blue");
                                              this.classList.add("button--blue");
                                              Tippy.hideAll();
                                            };
                                          `}"
                                        >
                                          Message
                                        </button>
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          css="${css`
                                            &:not(.button--blue) {
                                              color: light-dark(
                                                var(--color--green--500),
                                                var(--color--green--500)
                                              );
                                            }
                                          `}"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest("form").querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeAnswer"]').checked = true;
                                              for (const element of this.parentElement.querySelectorAll("button")) element.classList.remove("button--blue");
                                              this.classList.add("button--blue");
                                              Tippy.hideAll();
                                            };
                                          `}"
                                        >
                                          Answer
                                        </button>
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          css="${css`
                                            &:not(.button--blue) {
                                              color: light-dark(
                                                var(--color--red--500),
                                                var(--color--red--500)
                                              );
                                            }
                                          `}"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest("form").querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeFollowUpQuestion"]').checked = true;
                                              for (const element of this.parentElement.querySelectorAll("button")) element.classList.remove("button--blue");
                                              this.classList.add("button--blue");
                                              Tippy.hideAll();
                                            };
                                          `}"
                                        >
                                          Follow-up question
                                        </button>
                                      </div>
                                    `},
                                  });
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
                            `;
                          if (
                            request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                          )
                            courseConversationMessageNewOptionsHTML += html`
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    placement: "bottom-start",
                                    interactive: true,
                                    trigger: "click",
                                    content: ${html` TODO `},
                                  });
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
                                >  Everyone <i class="bi bi-chevron-down"></i>
                              </button>
                            `;
                          if (
                            request.state.courseParticipation
                              .courseParticipationRole ===
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
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    placement: "bottom-start",
                                    interactive: true,
                                    trigger: "click",
                                    content: ${html` TODO `},
                                  });
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
                                >  None <i class="bi bi-chevron-down"></i>
                              </button>
                            `;
                          return courseConversationMessageNewOptionsHTML !==
                            html``
                            ? html`
                                <div
                                  css="${css`
                                    flex: 1;
                                    font-weight: 600;
                                    color: light-dark(
                                      var(--color--slate--600),
                                      var(--color--slate--400)
                                    );
                                    display: flex;
                                    align-items: baseline;
                                    flex-wrap: wrap;
                                    column-gap: var(--space--4);
                                    row-gap: var(--space--2);
                                  `}"
                                >
                                  $${courseConversationMessageNewOptionsHTML}
                                </div>
                              `
                            : html``;
                        })()}
                      </div>
                    </form>
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
      Application["types"]["states"]["CourseConversation"]
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
          key="main--two-column-layout"
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
                max-width: var(--space--112);
                position: fixed;
                inset: var(--space--0) var(--space--14) var(--space--0)
                  var(--space--0);
                z-index: 100;
                transition-property: var(--transition-property--transform);
                transition-duration: var(--transition-duration--200);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                [key="main--two-column-layout"]:not([state~="sidebar--open"])
                  & {
                  transform: translateX(-101%);
                }
                [key="main--two-column-layout"][state~="sidebar--open"] & {
                  box-shadow: var(--box-shadow--25);
                }
              }
              @media (min-width: 900px) {
                width: var(--width);
              }
            `}"
          >
            <div
              key="sidebar--close"
              css="${css`
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                padding: var(--space--2) var(--space--4);
                display: flex;
                @media (min-width: 900px) {
                  display: none;
                }
              `}"
            >
              <button
                class="button button--square button--icon button--transparent"
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--space--0);
                `}"
                javascript="${javascript`
                  this.onclick = () => {
                    javascript.stateRemove(document.querySelector('[key="main--two-column-layout"]'), "sidebar--open");
                  };
                `}"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div
              key="sidebar--menu"
              css="${css`
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                padding: var(--space--2) var(--space--4);
                display: flex;
                gap: var(--space--2);
              `}"
            >
              $${request.state.course.courseState === "courseStateActive"
                ? html`
                    <a
                      key="sidebar--menu--new-conversation"
                      href="/courses/${request.state.course
                        .publicId}/conversations/new"
                      class="button button--rectangle button--blue"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        display: flex;
                        align-items: center;
                      `}"
                    >
                      New
                      ${request.state.courseParticipation
                        .courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? "note"
                        : request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleStudent"
                          ? "question"
                          : (() => {
                              throw new Error();
                            })()}
                    </a>
                  `
                : html``}
              <div
                key="sidebar--menu--search-and-filter"
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
                  name="search.courseConversations"
                  css="${css`
                    flex: 1;
                    min-width: var(--space--0);
                    padding: var(--space--1) var(--space--0) var(--space--1)
                      var(--space--2);
                  `}"
                />
                <button
                  key="sidebar--menu--search-and-filter--search"
                  class="button button--icon button--transparent"
                  css="${css`
                    padding: var(--space--1) var(--space--2);
                  `}"
                  javascript="${javascript`
                    javascript.popover({ element: this });
                    this.onclick = () => {
                      this.closest('[key="sidebar--menu--search-and-filter"]').querySelector('[name="search.courseConversations"]').focus();
                    };
                  `}"
                >
                  <i class="bi bi-search"></i>
                </button>
                <div class="popover">Search</div>
                $${request.state.courseConversationsTags.length > 0
                  ? html`
                      <button
                        key="sidebar--menu--search-and-filter--filter"
                        class="button button--icon button--transparent"
                        css="${css`
                          padding: var(--space--1) var(--space--2);
                        `}"
                        javascript="${javascript`
                          javascript.popover({ element: this });
                          javascript.popover({ element: this, target: this.nextElementSibling.nextElementSibling, trigger: "click", remainOpenWhileFocused: true, placement: "bottom-end" });
                        `}"
                      >
                        <i class="bi bi-filter"></i>
                      </button>
                      <div class="popover">Filter</div>
                      <div
                        class="popover"
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--600),
                              var(--color--slate--400)
                            );
                          `}"
                        >
                          Tags
                        </div>
                        $${request.state.courseConversationsTags.map(
                          (courseConversationsTag) => html`
                            <label
                              class="button button--rectangle button--transparent button--dropdown-menu"
                            >
                              <input
                                type="checkbox"
                                name="filter.courseConversationsTags[]"
                                value="${courseConversationsTag.publicId}"
                                class="input--checkbox"
                              />  ${courseConversationsTag.name}
                            </label>
                          `,
                        )}
                      </div>
                    `
                  : html``}
              </div>
            </div>
            <div
              key="courseConversations"
              css="${css`
                flex: 1;
                position: relative;
                overflow: auto;
              `}"
              javascript="${javascript`
                this.courseConversationsGroupsFirstGrouping ??= true;
                window.setTimeout(() => {
                  this.courseConversationsGroupsFirstGrouping = false;
                });
                this.courseConversationsGroupsOpen ??= new Set();
              `}"
            >
              <div
                key="courseConversations--toGroup"
                hidden
                javascript="${javascript`
                  window.setTimeout(() => {
                    this.remove();
                  });
                `}"
              >
                $${application.database
                  .all<{
                    id: number;
                    publicId: string;
                    courseConversationType:
                      | "courseConversationTypeNote"
                      | "courseConversationTypeQuestion";
                    questionResolved: number;
                    pinned: number;
                    title: string;
                  }>(
                    sql`
                      select
                        "id",
                        "publicId",
                        "courseConversationType",
                        "questionResolved",
                        "pinned",
                        "title"
                      from "courseConversations"
                      where
                        "course" = ${request.state.course.id} and (
                          "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                          $${
                            request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                              ? sql`
                                  or
                                  "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
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
                        )
                      order by
                        "pinned" = true desc,
                        "id" desc;
                    `,
                  )
                  .map((courseConversation) => {
                    const firstCourseConversationMessage =
                      application.database.get<{
                        createdAt: string;
                        createdByCourseParticipation: number | null;
                        courseConversationMessageAnonymity:
                          | "courseConversationMessageAnonymityNone"
                          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                          | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
                        content: string;
                      }>(
                        sql`
                          select
                            "createdAt",
                            "createdByCourseParticipation",
                            "courseConversationMessageAnonymity",
                            "content"
                          from "courseConversationMessages"
                          where
                            "courseConversation" = ${courseConversation.id} $${
                              request.state.courseParticipation!
                                .courseParticipationRole !==
                              "courseParticipationRoleInstructor"
                                ? sql`
                                    and
                                    "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                                  `
                                : sql``
                            }
                          order by "id" asc
                          limit 1;
                        `,
                      );
                    if (firstCourseConversationMessage === undefined)
                      throw new Error();
                    const firstCourseConversationMessageAnonymous =
                      firstCourseConversationMessage.createdByCourseParticipation !==
                        request.state.courseParticipation!.id &&
                      ((firstCourseConversationMessage.courseConversationMessageAnonymity ===
                        "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                        request.state.courseParticipation!
                          .courseParticipationRole ===
                          "courseParticipationRoleStudent") ||
                        firstCourseConversationMessage.courseConversationMessageAnonymity ===
                          "courseConversationMessageAnonymityCourseParticipationRoleInstructors");
                    const firstCourseConversationMessageCreatedByCourseParticipation =
                      typeof firstCourseConversationMessage.createdByCourseParticipation ===
                        "number" && !firstCourseConversationMessageAnonymous
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
                              where "id" = ${firstCourseConversationMessage.createdByCourseParticipation};
                            `,
                          )
                        : undefined;
                    const firstCourseConversationMessageCreatedByCourseParticipationUser =
                      typeof firstCourseConversationMessageCreatedByCourseParticipation ===
                      "object"
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
                            lastSeenOnlineAt: string;
                          }>(
                            sql`
                              select
                                "publicId",
                                "name",
                                "avatarColor",
                                "avatarImage",
                                "lastSeenOnlineAt"
                              from "users"
                              where "id" = ${firstCourseConversationMessageCreatedByCourseParticipation.user};
                            `,
                          )
                        : undefined;
                    return html`
                      <a
                        key="courseConversation /courses/${request.state.course!
                          .publicId}/conversations/${courseConversation.publicId}"
                        href="/courses/${request.state.course!
                          .publicId}/conversations/${courseConversation.publicId}"
                        class="${request.state.courseConversation?.id ===
                        courseConversation.id
                          ? "current"
                          : ""}"
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
                          transition-duration: var(--transition-duration--150);
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
                          &.current {
                            color: light-dark(
                              var(--color--white),
                              var(--color--white)
                            );
                            background-color: light-dark(
                              var(--color--blue--500),
                              var(--color--blue--500)
                            );
                          }
                        `}"
                        javascript="${javascript`
                          let key;
                          let summary;
                          if (${courseConversation.pinned}) {
                            key = "pinned";
                            summary = "Pinned";
                          }
                          else {
                            const firstCourseConversationMessageCreatedAtWeekStart = new Date(${firstCourseConversationMessage.createdAt});
                            firstCourseConversationMessageCreatedAtWeekStart.setHours(12, 0, 0, 0);
                            while (firstCourseConversationMessageCreatedAtWeekStart.getDay() !== 0) firstCourseConversationMessageCreatedAtWeekStart.setDate(firstCourseConversationMessageCreatedAtWeekStart.getDate() - 1);
                            const firstCourseConversationMessageCreatedAtWeekEnd = new Date(${firstCourseConversationMessage.createdAt});
                            firstCourseConversationMessageCreatedAtWeekEnd.setHours(12, 0, 0, 0);
                            while (firstCourseConversationMessageCreatedAtWeekEnd.getDay() !== 6) firstCourseConversationMessageCreatedAtWeekEnd.setDate(firstCourseConversationMessageCreatedAtWeekEnd.getDate() + 1);
                            key = javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekStart.toISOString());
                            summary = \`\${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekStart.toISOString())} — \${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekEnd.toISOString())}\`;
                          }
                          (
                            this.closest('[key="courseConversations"]').querySelector(\`[key~="courseConversations--group"][key~="\${key}"]\`) ??
                            javascript.execute(this.closest('[key="courseConversations"]').insertAdjacentElement("beforeend", javascript.stringToElement(html\`
                              <details
                                key="courseConversations--group \${key}"
                                javascript="\${${javascript`
                                  this.ontoggle = () => {
                                    if (this.getAttribute("open") === null)
                                      this.closest('[key="courseConversations"]').courseConversationsGroupsOpen.delete(this.getAttribute("key"));
                                    else
                                      this.closest('[key="courseConversations"]').courseConversationsGroupsOpen.add(this.getAttribute("key"));
                                  };
                                  if (
                                    (
                                      this.closest('[key="courseConversations"]').courseConversationsGroupsFirstGrouping &&
                                      (() => {
                                        const indexOf = [...this.parentElement.querySelectorAll('[key~="courseConversations--group"]:not([key~="pinned"])')].indexOf(this);
                                        return 0 <= indexOf && indexOf < 3;
                                      })()
                                    ) ||
                                    this.closest('[key="courseConversations"]').courseConversationsGroupsOpen.has(this.getAttribute("key"))
                                  )
                                    this.setAttribute("open", "");
                                `}}"
                              >
                                <summary
                                  css="\${${css`
                                    font-size: var(--font-size--3);
                                    line-height: var(
                                      --font-size--3--line-height
                                    );
                                    font-weight: 600;
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                    background-color: light-dark(
                                      var(--color--slate--100),
                                      var(--color--slate--900)
                                    );
                                    padding: var(--space--1-5) var(--space--4);
                                    border-bottom: var(--border-width--1) solid
                                      light-dark(
                                        var(--color--slate--200),
                                        var(--color--slate--800)
                                      );
                                    position: relative;
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
                                        var(--color--slate--200),
                                        var(--color--slate--800)
                                      );
                                    }
                                    &:active {
                                      background-color: light-dark(
                                        var(--color--slate--300),
                                        var(--color--slate--700)
                                      );
                                    }
                                    [key~="courseConversations--group"].current
                                      & {
                                      color: light-dark(
                                        var(--color--white),
                                        var(--color--white)
                                      );
                                      background-color: light-dark(
                                        var(--color--blue--500),
                                        var(--color--blue--500)
                                      );
                                    }
                                  `}}"
                                >
                                  <div
                                    key="courseConversations--group--view"
                                    class="hidden"
                                    css="\${${css`
                                      font-size: var(--space--1-5);
                                      color: light-dark(
                                        var(--color--blue--500),
                                        var(--color--blue--500)
                                      );
                                      position: absolute;
                                      margin-left: var(--space---2-5);
                                      [key~="courseConversations--group"].current
                                        &,
                                      &.hidden {
                                        display: none;
                                      }
                                    `}}"
                                  >
                                    <i class="bi bi-circle-fill"></i>
                                  </div>
                                  <div>
                                    <span
                                      css="\${${css`
                                        display: inline-block;
                                        transition-property: var(
                                          --transition-property--transform
                                        );
                                        transition-duration: var(
                                          --transition-duration--150
                                        );
                                        transition-timing-function: var(
                                          --transition-timing-function--ease-in-out
                                        );
                                        [key~="courseConversations--group"][open]
                                          & {
                                          transform: rotate(
                                            var(--transform--rotate--90)
                                          );
                                        }
                                      `}}"
                                      ><i class="bi bi-chevron-right"></i></span
                                    >  \${summary}
                                  </div>
                                </summary>
                              </details>
                            \`)))
                          ).insertAdjacentElement("beforeend", this);
                          if (${
                            request.state.courseConversation?.id ===
                            courseConversation.id
                          }) {
                            this.closest('[key~="courseConversations--group"]').classList.add("current");
                            if (event?.detail?.liveConnectionUpdate !== true) {
                              this.closest('[key~="courseConversations--group"]').setAttribute("open", "");
                              window.setTimeout(() => {
                                this.scrollIntoView({ block: "nearest" });
                              });
                            }
                          }
                        `}"
                      >
                        <div key="courseConversation--sidebar">
                          <div
                            css="${css`
                              position: relative;
                              display: flex;
                              align-items: center;
                            `}"
                          >
                            $${request.state.courseConversation?.id !==
                              courseConversation.id &&
                            application.database.get(
                              sql`
                                select true
                                from "courseConversationMessages"
                                left join "courseConversationMessageViews" on
                                  "courseConversationMessages"."id" = "courseConversationMessageViews"."courseConversationMessage" and
                                  "courseConversationMessageViews"."courseParticipation" = ${request.state.courseParticipation!.id}
                                where
                                  "courseConversationMessages"."courseConversation" = ${courseConversation.id} $${
                                    request.state.courseParticipation!
                                      .courseParticipationRole !==
                                    "courseParticipationRoleInstructor"
                                      ? sql`
                                          and
                                          "courseConversationMessages"."courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                                        `
                                      : sql``
                                  } and
                                  "courseConversationMessageViews"."id" is null
                                limit 1;
                              `,
                            ) !== undefined
                              ? html`
                                  <div
                                    key="courseConversation--sidebar--courseConversationMessageViews"
                                    css="${css`
                                      font-size: var(--space--1-5);
                                      color: light-dark(
                                        var(--color--blue--500),
                                        var(--color--blue--500)
                                      );
                                      position: absolute;
                                      margin-left: var(--space---2-5);
                                    `}"
                                    javascript="${javascript`
                                      this.closest('[key~="courseConversations--group"]').querySelector('[key="courseConversations--group--view"]').classList.remove("hidden");
                                      if (this.closest('[key="courseConversations"]').courseConversationsGroupsFirstGrouping && ${Boolean(courseConversation.pinned)})
                                        this.closest('[key~="courseConversations--group"]').setAttribute("open", "");
                                    `}"
                                  >
                                    <i class="bi bi-circle-fill"></i>
                                  </div>
                                `
                              : html``}
                            <div key="courseConversation--sidebar--userAvatar">
                              $${application.partials.userAvatar({
                                user: firstCourseConversationMessageAnonymous
                                  ? "anonymous"
                                  : (firstCourseConversationMessageCreatedByCourseParticipationUser ??
                                    "courseParticipationDeleted"),
                                size: 9,
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          key="courseConversation--main"
                          css="${css`
                            flex: 1;
                            min-width: var(--space--0);
                          `}"
                        >
                          <div
                            key="courseConversation--main--header"
                            css="${css`
                              display: flex;
                              align-items: baseline;
                              gap: var(--space--2);
                            `}"
                          >
                            <div
                              key="courseConversation--main--header--title"
                              css="${css`
                                flex: 1;
                                font-weight: 600;
                              `}"
                            >
                              ${courseConversation.title}
                            </div>
                            <div
                              key="courseConversation--main--header--publicId"
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 500;
                                [key~="courseConversation"]:not(.current) & {
                                  color: light-dark(
                                    var(--color--slate--400),
                                    var(--color--slate--600)
                                  );
                                }
                                [key~="courseConversation"].current & {
                                  color: light-dark(
                                    var(--color--blue--300),
                                    var(--color--blue--300)
                                  );
                                }
                              `}"
                            >
                              #${courseConversation.publicId}
                            </div>
                          </div>
                          <div
                            key="courseConversation--main--byline"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              [key~="courseConversation"]:not(.current) & {
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
                              }
                              [key~="courseConversation"].current & {
                                color: light-dark(
                                  var(--color--blue--200),
                                  var(--color--blue--200)
                                );
                              }
                            `}"
                          >
                            <span
                              css="${css`
                                font-weight: 600;
                              `}"
                              >${firstCourseConversationMessageAnonymous
                                ? "Anonymous"
                                : (firstCourseConversationMessageCreatedByCourseParticipationUser?.name ??
                                  "Deleted course participant")}</span
                            >${!firstCourseConversationMessageAnonymous &&
                            firstCourseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                              "courseParticipationRoleInstructor"
                              ? " (instructor)"
                              : ""}${!firstCourseConversationMessageAnonymous
                              ? firstCourseConversationMessage.courseConversationMessageAnonymity ===
                                "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                ? " (anonymous to students)"
                                : firstCourseConversationMessage.courseConversationMessageAnonymity ===
                                    "courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                  ? " (anonymous to instructors)"
                                  : ""
                              : ""} ·
                            <time
                              datetime="${firstCourseConversationMessage.createdAt}"
                              javascript="${javascript`
                                javascript.relativizeDateTimeElement(this, { capitalize: true });
                              `}"
                            ></time>
                          </div>
                          <div
                            key="courseConversation--main--details"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              [key~="courseConversation"]:not(.current) & {
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
                              }
                              [key~="courseConversation"].current & {
                                color: light-dark(
                                  var(--color--blue--200),
                                  var(--color--blue--200)
                                );
                              }
                            `}"
                          >
                            $${(() => {
                              const courseConversationMainDetails = [
                                html`<span
                                    css="${css`
                                      font-weight: 600;
                                    `}"
                                    >${courseConversation.courseConversationType ===
                                    "courseConversationTypeNote"
                                      ? "Note"
                                      : courseConversation.courseConversationType ===
                                          "courseConversationTypeQuestion"
                                        ? "Question"
                                        : (() => {
                                            throw new Error();
                                          })()}</span
                                  >$${courseConversation.courseConversationType ===
                                  "courseConversationTypeQuestion"
                                    ? Boolean(
                                        courseConversation.questionResolved,
                                      ) === false
                                      ? html` <span
                                          css="${css`
                                            [key~="courseConversation"]:not(
                                                .current
                                              )
                                              & {
                                              color: light-dark(
                                                var(--color--red--500),
                                                var(--color--red--500)
                                              );
                                            }
                                          `}"
                                          >(unresolved)</span
                                        >`
                                      : html` <span
                                          css="${css`
                                            [key~="courseConversation"]:not(
                                                .current
                                              )
                                              & {
                                              color: light-dark(
                                                var(--color--green--500),
                                                var(--color--green--500)
                                              );
                                            }
                                          `}"
                                          >(resolved)</span
                                        >`
                                    : ""}`,
                              ];
                              for (const courseConversationsTag of request.state
                                .courseConversationsTags!)
                                if (
                                  application.database.get(
                                    sql`
                                      select true
                                      from "courseConversationTaggings"
                                      where
                                        "courseConversation" = ${courseConversation.id} and
                                        "courseConversationsTag" = ${courseConversationsTag.id};
                                    `,
                                  ) !== undefined
                                )
                                  courseConversationMainDetails.push(
                                    html`${courseConversationsTag.name}`,
                                  );
                              return courseConversationMainDetails.join(" · ");
                            })()}
                          </div>
                          <div
                            key="courseConversation--main--firstCourseConversationMessageContent"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              [key~="courseConversation"]:not(.current) & {
                                color: light-dark(
                                  var(--color--slate--400),
                                  var(--color--slate--600)
                                );
                              }
                              [key~="courseConversation"].current & {
                                color: light-dark(
                                  var(--color--blue--300),
                                  var(--color--blue--300)
                                );
                              }
                            `}"
                          >
                            ${firstCourseConversationMessage.content.slice(
                              0,
                              200,
                            )}
                            TODO
                          </div>
                        </div>
                      </a>
                    `;
                  })}
              </div>
            </div>
          </div>
          <div
            key="sidebar--backdrop"
            css="${css`
              background-color: light-dark(
                var(--color--black),
                var(--color--white)
              );
              position: fixed;
              inset: var(--space--0);
              z-index: 99;
              visibility: hidden;
              opacity: var(--opacity--0);
              cursor: pointer;
              transition-property: var(--transition-property--opacity);
              transition-duration: var(--transition-duration--200);
              transition-timing-function: var(
                --transition-timing-function--ease-in-out
              );
              @media (max-width: 899px) {
                [key="main--two-column-layout"][state~="sidebar--open"] & {
                  visibility: visible;
                  opacity: var(--opacity--30);
                }
              }
            `}"
            javascript="${javascript`
              this.onclick = () => {
                javascript.stateRemove(document.querySelector('[key="main--two-column-layout"]'), "sidebar--open");
              };
            `}"
          ></div>
          <div
            key="sidebar--resize-handle"
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
                z-index: 100;
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
                &[state~="active"] {
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
                    this.closest('[key="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4)) + "px");
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
                  this.closest('[key="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(80 * 4) +"px");
                  updateSidebarWidth();
                };
                const updateSidebarWidth = utilities.foregroundJob(async () => {
                  await fetch("/settings", {
                    redirect: "manual",
                    method: "PATCH",
                    headers: { "CSRF-Protection": "true" },
                    body: new URLSearchParams({ sidebarWidth: this.closest('[key="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.getPropertyValue("--width").slice(0, -"px".length) }),
                  });
                });
              `}"
            ></div>
          </div>
          <div
            key="main--main ${request.URL.pathname}"
            css="${css`
              flex: 1;
              position: relative;
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
