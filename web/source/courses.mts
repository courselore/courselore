import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourses = {
  types: {
    states: {
      Course: Application["types"]["states"]["User"] & {
        course: {
          id: number;
          publicId: string;
          createdAt: string;
          name: string;
          information: string | null;
          invitationLinkCourseParticipationRoleInstructorsEnabled: number;
          invitationLinkCourseParticipationRoleInstructorsToken: string;
          invitationLinkCourseParticipationRoleStudentsEnabled: number;
          invitationLinkCourseParticipationRoleStudentsToken: string;
          courseConversationRequiresTagging: number;
          courseParticipationRoleStudentsAnonymityAllowed:
            | "courseParticipationRoleStudentsAnonymityAllowedNone"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors";
          courseParticipationRoleStudentsMayHavePrivateCourseConversations: number;
          courseParticipationRoleStudentsMayAttachImages: number;
          courseParticipationRoleStudentsMayCreatePolls: number;
          courseState: "courseStateActive" | "courseStateArchived";
          courseConversationsNextPublicId: number;
        };
        courseParticipation: {
          id: number;
          publicId: string;
          createdAt: string;
          courseParticipationRole:
            | "courseParticipationRoleInstructor"
            | "courseParticipationRoleStudent";
          decorationColor:
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
          mostRecentlyVisitedCourseConversation: number | null;
        };
        courseConversationsTags: {
          id: number;
          publicId: string;
          name: string;
          privateToCourseParticipationRoleInstructors: number;
        }[];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)(?:$|/)"),
    handler: (
      request: serverTypes.Request<
        { coursePublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      request.state.course = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        name: string;
        information: string | null;
        invitationLinkCourseParticipationRoleInstructorsEnabled: number;
        invitationLinkCourseParticipationRoleInstructorsToken: string;
        invitationLinkCourseParticipationRoleStudentsEnabled: number;
        invitationLinkCourseParticipationRoleStudentsToken: string;
        courseConversationRequiresTagging: number;
        courseParticipationRoleStudentsAnonymityAllowed:
          | "courseParticipationRoleStudentsAnonymityAllowedNone"
          | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
          | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors";
        courseParticipationRoleStudentsMayHavePrivateCourseConversations: number;
        courseParticipationRoleStudentsMayAttachImages: number;
        courseParticipationRoleStudentsMayCreatePolls: number;
        courseState: "courseStateActive" | "courseStateArchived";
        courseConversationsNextPublicId: number;
      }>(
        sql`
          select
            "id",
            "publicId",
            "createdAt",
            "name",
            "information",
            "invitationLinkCourseParticipationRoleInstructorsEnabled",
            "invitationLinkCourseParticipationRoleInstructorsToken",
            "invitationLinkCourseParticipationRoleStudentsEnabled",
            "invitationLinkCourseParticipationRoleStudentsToken",
            "courseConversationRequiresTagging",
            "courseParticipationRoleStudentsAnonymityAllowed",
            "courseParticipationRoleStudentsMayHavePrivateCourseConversations",
            "courseParticipationRoleStudentsMayAttachImages",
            "courseParticipationRoleStudentsMayCreatePolls",
            "courseState",
            "courseConversationsNextPublicId"
          from "courses"
          where "publicId" = ${request.pathname.coursePublicId};
        `,
      );
      if (request.state.course === undefined) return;
      request.state.courseParticipation = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        courseParticipationRole:
          | "courseParticipationRoleInstructor"
          | "courseParticipationRoleStudent";
        decorationColor:
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
        mostRecentlyVisitedCourseConversation: number | null;
      }>(
        sql`
          select
            "id",
            "publicId",
            "createdAt",
            "courseParticipationRole",
            "decorationColor",
            "mostRecentlyVisitedCourseConversation"
          from "courseParticipations"
          where
            "user" = ${request.state.user.id} and
            "course" = ${request.state.course.id};
        `,
      );
      if (request.state.courseParticipation === undefined) return;
      application.database.run(
        sql`
          update "users"
          set "mostRecentlyVisitedCourseParticipation" = ${request.state.courseParticipation.id}
          where "id" = ${request.state.user.id};
        `,
      );
      request.state.courseConversationsTags = application.database.all<{
        id: number;
        publicId: string;
        name: string;
        privateToCourseParticipationRoleInstructors: number;
      }>(
        sql`
          select
            "id",
            "publicId",
            "name",
            "privateToCourseParticipationRoleInstructors"
          from "courseConversationsTags"
          where
            "course" = ${request.state.course.id} $${
              request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor"
                ? sql`
                    and
                    "privateToCourseParticipationRoleInstructors" = ${Number(false)}
                  `
                : sql``
            }
          order by "order" asc;
        `,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)$"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      const courseConversation = application.database.get<{
        publicId: number;
      }>(
        sql`
          select "publicId"
          from "courseConversations"
          $${
            typeof request.state.courseParticipation
              .mostRecentlyVisitedCourseConversation === "number"
              ? sql`
                  where "id" = ${
                    request.state.courseParticipation
                      .mostRecentlyVisitedCourseConversation
                  }
                `
              : sql`
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
                    "id" desc
                  limit 1
                `
          };
        `,
      );
      if (courseConversation === undefined) return;
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${courseConversation.publicId}`,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/settings$"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationsTags === undefined
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`
            <title>Settings · ${request.state.course.name} · Courselore</title>
          `,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                Course settings
              </div>
              $${request.state.courseParticipation.courseParticipationRole ===
              "courseParticipationRoleInstructor"
                ? html`
                    <div
                      type="form"
                      method="PATCH"
                      action="/courses/${request.state.course
                        .publicId}/settings"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <label>
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Name
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="text"
                            name="name"
                            value="${request.state.course.name}"
                            required
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
                      <label>
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Information
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="text"
                            name="name"
                            placeholder="Year / Term / Institution / Code / …"
                            value="${request.state.course.information ?? ""}"
                            required
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
                      <div
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--1);
                        `}"
                      >
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Anonymity
                        </div>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
                        >
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="radio"
                              name="courseParticipationRoleStudentsAnonymityAllowed"
                              value="courseParticipationRoleStudentsAnonymityAllowedNone"
                              $${request.state.course
                                .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedNone"
                                ? html`checked`
                                : html``}
                              class="input--radio"
                            />  Students may not send anonymous messages
                          </label>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="radio"
                              name="courseParticipationRoleStudentsAnonymityAllowed"
                              value="courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
                              $${request.state.course
                                .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
                                ? html`checked`
                                : html``}
                              class="input--radio"
                            />  Students may send messages that are anonymous to
                            other students, but not anonymous to instructors
                          </label>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="radio"
                              name="courseParticipationRoleStudentsAnonymityAllowed"
                              value="courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                              $${request.state.course
                                .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                                ? html`checked`
                                : html``}
                              class="input--radio"
                            />  Students may send messages that are anonymous to
                            everyone, including instructors
                          </label>
                        </div>
                      </div>
                      <div
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--1);
                        `}"
                      >
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Students permissions
                        </div>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
                        >
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="courseParticipationRoleStudentsMayHavePrivateCourseConversations"
                              $${Boolean(
                                request.state.course
                                  .courseParticipationRoleStudentsMayHavePrivateCourseConversations,
                              )
                                ? html`checked`
                                : html``}
                              class="input--checkbox"
                            />  Students may create private conversations among
                            other students that aren’t visible by instructors
                          </label>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="courseParticipationRoleStudentsMayAttachImages"
                              $${Boolean(
                                request.state.course
                                  .courseParticipationRoleStudentsMayAttachImages,
                              )
                                ? html`checked`
                                : html``}
                              class="input--checkbox"
                            />  Students may attach images to their messages
                          </label>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="courseParticipationRoleStudentsMayCreatePolls"
                              $${Boolean(
                                request.state.course
                                  .courseParticipationRoleStudentsMayCreatePolls,
                              )
                                ? html`checked`
                                : html``}
                              class="input--checkbox"
                            />  Students may create polls
                          </label>
                        </div>
                      </div>
                      <div
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--1);
                        `}"
                      >
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Course state
                        </div>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
                        >
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="radio"
                              name="courseState"
                              value="courseStateActive"
                              $${request.state.course.courseState ===
                              "courseStateActive"
                                ? html`checked`
                                : html``}
                              class="input--radio"
                            />  Active
                          </label>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="radio"
                              name="courseState"
                              value="courseStateArchived"
                              $${request.state.course.courseState ===
                              "courseStateArchived"
                                ? html`checked`
                                : html``}
                              class="input--radio"
                            />  Archived
                            <span
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
                              `}"
                              >(read-only)</span
                            >
                          </label>
                        </div>
                      </div>
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                        `}"
                      >
                        <button
                          type="submit"
                          class="button button--rectangle button--blue"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                    <hr class="separator" />
                    <div
                      type="form"
                      method="PUT"
                      action="/courses/${request.state.course
                        .publicId}/settings/tags"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <div
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--1);
                        `}"
                      >
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Conversation tags
                        </div>
                        <label
                          class="button button--rectangle button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="courseConversationRequiresTagging"
                            $${Boolean(
                              request.state.course
                                .courseConversationRequiresTagging,
                            )
                              ? html`checked`
                              : html``}
                            class="input--checkbox"
                          />  Tags are required when creating a conversation
                        </label>
                      </div>
                      <div
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--4);
                        `}"
                      >
                        $${request.state.courseConversationsTags.map(
                          (courseConversationsTag) => html`
                            <div
                              key="courseConversationsTag ${courseConversationsTag.publicId}"
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `}"
                            >
                              <input
                                type="hidden"
                                name="tags.id[]"
                                value="${courseConversationsTag.publicId}"
                              />
                              <input
                                type="text"
                                name="tags.name[]"
                                value="${courseConversationsTag.name}"
                                required
                                maxlength="2000"
                                class="input--text"
                                css="${css`
                                  flex: 1;
                                `}"
                              />
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
                                  flex-wrap: wrap;
                                  column-gap: var(--space--4);
                                  row-gap: var(--space--2);
                                `}"
                              >
                                <label
                                  class="button button--rectangle button--transparent"
                                >
                                  <input
                                    type="checkbox"
                                    name="tags.privateToCourseParticipationRoleInstructors[]"
                                    $${Boolean(
                                      courseConversationsTag.privateToCourseParticipationRoleInstructors,
                                    )
                                      ? html`checked`
                                      : html``}
                                    class="input--checkbox"
                                  />  Private to instructors
                                </label>
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="courseConversationsTag"]').remove();
                                    };
                                  `}"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          `,
                        )}
                      </div>
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                        `}"
                      >
                        <button
                          type="submit"
                          class="button button--rectangle button--blue"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                    <hr class="separator" />
                  `
                : html``}
              <div>
                <button
                  type="button"
                  class="button button--rectangle button--red"
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                  `}"
                  javascript="${javascript`
                    javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true });
                  `}"
                >
                  Remove myself from the course
                </button>
                <div
                  type="form popover"
                  method="DELETE"
                  action="/courses/${request.state.course
                    .publicId}/participation"
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
                        var(--color--red--500),
                        var(--color--red--500)
                      );
                    `}"
                  >
                    <i class="bi bi-exclamation-triangle-fill"></i> Once you
                    remove yourself from the course, you may only participate
                    again with an invitation.
                  </div>
                  <label>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      Course name confirmation
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="text"
                        placeholder="${request.state.course.name}"
                        required
                        maxlength="2000"
                        class="input--text"
                        css="${css`
                          flex: 1;
                        `}"
                        javascript="${javascript`
                          this.onvalidate = () => {
                            if (this.value !== ${request.state.course.name})
                              throw new javascript.ValidationError(${`Incorrect course name confirmation: “${request.state.course.name}”`});
                          };
                        `}"
                      />
                    </div>
                  </label>
                  <div>
                    <button
                      type="submit"
                      class="button button--rectangle button--red"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                      `}"
                    >
                      Remove myself from the course
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });
};
