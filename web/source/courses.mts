import * as serverTypes from "@radically-straightforward/server";
import QRCode from "qrcode";
import cryptoRandomString from "crypto-random-string";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourses = {
  types: {
    states: {
      Course: Application["types"]["states"]["Authentication"] & {
        course: {
          id: number;
          publicId: string;
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
          courseState: "courseStateActive" | "courseStateArchived";
          courseConversationsNextPublicId: number;
        };
        courseParticipation: {
          id: number;
          publicId: string;
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
    method: "GET",
    pathname: "/courses/new",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.systemOptions === undefined ||
        request.state.user === undefined ||
        !(
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleUser" &&
            (request.state.user.userRole === "userRoleUser" ||
              request.state.user.userRole === "userRoleStaff" ||
              request.state.user.userRole === "userRoleSystemAdministrator")) ||
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleStaff" &&
            (request.state.user.userRole === "userRoleStaff" ||
              request.state.user.userRole === "userRoleSystemAdministrator")) ||
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleSystemAdministrator" &&
            request.state.user.userRole === "userRoleSystemAdministrator")
        )
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html` <title>New course · Courselore</title> `,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                New course
              </div>
              <div
                type="form"
                method="POST"
                action="/courses"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
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
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                  `}"
                >
                  <button
                    type="submit"
                    class="button button--rectangle button--blue"
                  >
                    Create course
                  </button>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/courses",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { name: string },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.systemOptions === undefined ||
        request.state.user === undefined ||
        !(
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleUser" &&
            (request.state.user.userRole === "userRoleUser" ||
              request.state.user.userRole === "userRoleStaff" ||
              request.state.user.userRole === "userRoleSystemAdministrator")) ||
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleStaff" &&
            (request.state.user.userRole === "userRoleStaff" ||
              request.state.user.userRole === "userRoleSystemAdministrator")) ||
          (request.state.systemOptions.userRolesWhoMayCreateCourses ===
            "userRoleSystemAdministrator" &&
            request.state.user.userRole === "userRoleSystemAdministrator")
        )
      )
        return;
      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === ""
      )
        throw "validation";
      request.state.course = application.database.get<{
        id: number;
        publicId: string;
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
        courseState: "courseStateActive" | "courseStateArchived";
        courseConversationsNextPublicId: number;
      }>(
        sql`
            select * from "courses" where "id" = ${
              application.database.run(
                sql`
                insert into "courses" (
                  "publicId",
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
                  "courseState",
                  "courseConversationsNextPublicId"
                )
                values (
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${request.body.name},
                  ${null},
                  ${Number(true)},
                  ${cryptoRandomString({ length: 20, type: "numeric" })},
                  ${Number(true)},
                  ${cryptoRandomString({ length: 20, type: "numeric" })},
                  ${Number(true)},
                  ${"courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"},
                  ${Number(true)},
                  ${Number(true)},
                  ${"courseStateActive"},
                  ${1}
                );
              `,
              ).lastInsertRowid
            };
          `,
      )!;
      request.state.courseParticipation = application.database.get<{
        id: number;
        publicId: string;
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
            select * from "courseParticipations" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseParticipations" (
                    "publicId",
                    "user",
                    "course",
                    "courseParticipationRole",
                    "decorationColor",
                    "mostRecentlyVisitedCourseConversation"
                  )
                  values (
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${request.state.user.id},
                    ${request.state.course.id},
                    ${"courseParticipationRoleInstructor"},
                    ${
                      [
                        "red",
                        "orange",
                        "amber",
                        "yellow",
                        "lime",
                        "green",
                        "emerald",
                        "teal",
                        "cyan",
                        "sky",
                        "blue",
                        "indigo",
                        "violet",
                        "purple",
                        "fuchsia",
                        "pink",
                        "rose",
                      ][
                        application.database.get<{ count: number }>(
                          sql`
                            select count(*) as "count"
                            from "courseParticipations"
                            where "user" = ${request.state.user.id};
                          `,
                        )!.count % 17
                      ]
                    },
                    ${null}
                  );
                `,
              ).lastInsertRowid
            };
          `,
      )!;
      response.redirect(`/courses/${request.state.course.publicId}`);
    },
  });

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
        courseState: "courseStateActive" | "courseStateArchived";
        courseConversationsNextPublicId: number;
      }>(
        sql`
          select
            "id",
            "publicId",
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
      if (courseConversation !== undefined) {
        response.redirect(
          `/courses/${request.state.course.publicId}/conversations/${courseConversation.publicId}`,
        );
        return;
      }
      if (
        request.state.courseParticipation.courseParticipationRole ===
        "courseParticipationRoleStudent"
      ) {
        response.redirect(
          `/courses/${request.state.course.publicId}/conversations/new`,
        );
        return;
      }
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>${request.state.course.name} · Courselore</title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                ${request.state.course.name}
              </div>
              <div
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
                `}"
              >
                <div>
                  <a
                    href="/courses/${request.state.course.publicId}/settings"
                    class="button button--rectangle button--blue"
                    >Configure the course</a
                  >
                </div>
                <div>
                  <a
                    href="/courses/${request.state.course
                      .publicId}/conversations/new"
                    class="button button--rectangle button--transparent"
                    >Start the first conversation</a
                  >
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/settings$"),
    handler: async (
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
            <title>
              Course settings · ${request.state.course.name} · Courselore
            </title>
          `,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
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
                    <details>
                      <summary
                        class="button button--rectangle button--transparent"
                        css="${css`
                          font-weight: 500;
                        `}"
                      >
                        <span
                          css="${css`
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
                            details[open] > summary > & {
                              rotate: var(--rotate--90);
                            }
                          `}"
                        >
                          <i class="bi bi-chevron-right"></i>
                        </span>
                        General settings
                      </summary>
                      <div
                        type="form"
                        method="PATCH"
                        action="/courses/${request.state.course
                          .publicId}/settings/general-settings"
                        css="${css`
                          padding: var(--size--2) var(--size--0);
                          border-bottom: var(--border-width--1) solid
                            light-dark(
                              var(--color--slate--200),
                              var(--color--slate--800)
                            );
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--4);
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
                              name="information"
                              placeholder="Year / Term / Institution / Code / …"
                              value="${request.state.course.information ?? ""}"
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
                            gap: var(--size--1);
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
                              gap: var(--size--2);
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
                              />  Students may send messages that are anonymous
                              to other students, but not anonymous to
                              instructors
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
                              />  Students may send messages that are anonymous
                              to everyone, including instructors
                            </label>
                          </div>
                        </div>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--size--1);
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
                              gap: var(--size--2);
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
                              />  Students may create private conversations
                              among other students that aren’t visible by
                              instructors
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
                          </div>
                        </div>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--size--1);
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
                              gap: var(--size--2);
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
                            Update general settings
                          </button>
                        </div>
                      </div>
                    </details>
                    <details>
                      <summary
                        class="button button--rectangle button--transparent"
                        css="${css`
                          font-weight: 500;
                        `}"
                      >
                        <span
                          css="${css`
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
                            details[open] > summary > & {
                              rotate: var(--rotate--90);
                            }
                          `}"
                        >
                          <i class="bi bi-chevron-right"></i>
                        </span>
                        Conversation tags
                      </summary>
                      <div
                        type="form"
                        method="PATCH"
                        action="/courses/${request.state.course
                          .publicId}/settings/tags"
                        css="${css`
                          padding: var(--size--2) var(--size--0);
                          border-bottom: var(--border-width--1) solid
                            light-dark(
                              var(--color--slate--200),
                              var(--color--slate--800)
                            );
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--4);
                        `}"
                        javascript="${javascript`
                          this.morph = false;
                          this.onsubmit = () => {
                            delete this.morph;
                            delete this.isModified;
                          };
                        `}"
                      >
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
                        $${(() => {
                          const courseConversationsTagPartial = (
                            courseConversationsTag?: (typeof request.state.courseConversationsTags)[number],
                          ): HTML => html`
                            <div
                              key="courseConversationsTag ${courseConversationsTag?.publicId ??
                              ""}"
                              css="${css`
                                display: flex;
                                align-items: center;
                                gap: var(--size--3);
                              `}"
                            >
                              <div
                                css="${css`
                                  color: light-dark(
                                    var(--color--slate--600),
                                    var(--color--slate--400)
                                  );
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--size--1);
                                `}"
                              >
                                <div>
                                  <button
                                    type="button"
                                    class="button button--square button--icon button--transparent"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        const element = this.closest('[key~="courseConversationsTag"]');
                                        const previousElement = element.previousElementSibling;
                                        if (previousElement !== null) {
                                          this.closest('[type~="form"]').isModified = true;
                                          previousElement.insertAdjacentElement("beforebegin", element);
                                        }
                                      };
                                    `}"
                                  >
                                    <i class="bi bi-caret-up-fill"></i>
                                  </button>
                                </div>
                                <div>
                                  <button
                                    type="button"
                                    class="button button--square button--icon button--transparent"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        const element = this.closest('[key~="courseConversationsTag"]');
                                        const nextElement = element.nextElementSibling;
                                        if (nextElement !== null) {
                                          this.closest('[type~="form"]').isModified = true;
                                          nextElement.insertAdjacentElement("afterend", element);
                                        }
                                      };
                                    `}"
                                  >
                                    <i class="bi bi-caret-down-fill"></i>
                                  </button>
                                </div>
                              </div>
                              <div
                                css="${css`
                                  flex: 1;
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--size--2);
                                `}"
                              >
                                <input
                                  type="hidden"
                                  name="tags[]"
                                  value="${courseConversationsTag?.publicId ??
                                  ""}"
                                  $${courseConversationsTag === undefined
                                    ? html`
                                        javascript="${javascript`
                                          this.setAttribute("value", utilities.randomString());
                                        `}"
                                      `
                                    : html``}
                                />
                                <input
                                  type="text"
                                  name="tags[${courseConversationsTag?.publicId ??
                                  "{tag}"}].name"
                                  value="${courseConversationsTag?.name ?? ""}"
                                  required
                                  maxlength="2000"
                                  class="input--text"
                                  css="${css`
                                    flex: 1;
                                  `}"
                                  $${courseConversationsTag === undefined
                                    ? html`
                                        javascript="${javascript`
                                          this.setAttribute("name", this.getAttribute("name").replace("{tag}", this.closest('[key~="courseConversationsTag"]').querySelector('[name="tags[]"]').getAttribute("value")));
                                        `}"
                                      `
                                    : html``}
                                />
                                <div
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
                                    column-gap: var(--size--4);
                                    row-gap: var(--size--2);
                                  `}"
                                >
                                  <label
                                    class="button button--rectangle button--transparent"
                                  >
                                    <input
                                      type="checkbox"
                                      name="tags[${courseConversationsTag?.publicId ??
                                      "{tag}"}].privateToCourseParticipationRoleInstructors"
                                      $${Boolean(
                                        courseConversationsTag?.privateToCourseParticipationRoleInstructors ??
                                          false,
                                      )
                                        ? html`checked`
                                        : html``}
                                      class="input--checkbox"
                                      $${courseConversationsTag === undefined
                                        ? html`
                                            javascript="${javascript`
                                              this.setAttribute("name", this.getAttribute("name").replace("{tag}", this.closest('[key~="courseConversationsTag"]').querySelector('[name="tags[]"]').getAttribute("value")));
                                            `}"
                                          `
                                        : html``}
                                    />  Private to instructors
                                  </label>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                      if (${
                                        courseConversationsTag !== undefined &&
                                        application.database.get(
                                          sql`
                                            select true
                                            from "courseConversationTaggings"
                                            join "courseConversations" on
                                              "courseConversationTaggings"."courseConversation" = "courseConversations"."id" and
                                              "courseConversations"."course" = ${request.state.course!.id}
                                            where "courseConversationTaggings"."courseConversationsTag" = ${courseConversationsTag.id};
                                          `,
                                        ) !== undefined
                                      })
                                        javascript.popover({ element: this, trigger: "click" });
                                      else 
                                        this.onclick = () => {
                                          this.nextElementSibling.querySelector("button").click();
                                        };
                                    `}"
                                  >
                                    Remove
                                  </button>
                                  <div
                                    type="popover"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--red--500),
                                          var(--color--red--500)
                                        );
                                      `}"
                                    >
                                      <i
                                        class="bi bi-exclamation-triangle-fill"
                                      ></i
                                      > The tag will be removed from all
                                      conversations that use it.
                                    </div>
                                    <div>
                                      <button
                                        type="button"
                                        class="button button--rectangle button--red"
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                        `}"
                                        javascript="${javascript`
                                          this.onclick = () => {
                                            this.closest('[type~="form"]').isModified = true;
                                            const courseConversationsTags = this.closest('[key~="courseConversationsTags"]');
                                            this.closest('[key~="courseConversationsTag"]').remove();
                                            courseConversationsTags.hidden = courseConversationsTags.children.length === 0;
                                          };
                                        `}"
                                      >
                                        Remove tag
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          `;
                          return html`
                            <div
                              key="courseConversationsTags"
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--4);
                              `}"
                              $${request.state.courseConversationsTags
                                .length === 0
                                ? html`hidden`
                                : html``}
                            >
                              $${request.state.courseConversationsTags.map(
                                (courseConversationsTag) =>
                                  courseConversationsTagPartial(
                                    courseConversationsTag,
                                  ),
                              )}
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
                              `}"
                            >
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    this.closest('[type~="form"]').isModified = true;
                                    this.closest('[type~="form"]').querySelector('[key~="courseConversationsTags"]').hidden = false;
                                    javascript.execute(
                                      this.closest('[type~="form"]')
                                        .querySelector('[key~="courseConversationsTags"]')
                                        .insertAdjacentElement(
                                          "beforeend",
                                          javascript.stringToElement(${courseConversationsTagPartial()})
                                        )
                                    );
                                  };
                                `}"
                              >
                                Add tag
                              </button>
                            </div>
                          `;
                        })()}
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
                            Update conversation tags
                          </button>
                        </div>
                      </div>
                    </details>
                    <details>
                      <summary
                        class="button button--rectangle button--transparent"
                        css="${css`
                          font-weight: 500;
                        `}"
                      >
                        <span
                          css="${css`
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
                            details[open] > summary > & {
                              rotate: var(--rotate--90);
                            }
                          `}"
                        >
                          <i class="bi bi-chevron-right"></i>
                        </span>
                        Invitations
                      </summary>
                      <div
                        css="${css`
                          padding: var(--size--2) var(--size--0);
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--2);
                        `}"
                      >
                        <details>
                          <summary
                            class="button button--rectangle button--transparent"
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
                            <span
                              css="${css`
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
                                details[open] > summary > & {
                                  rotate: var(--rotate--90);
                                }
                              `}"
                            >
                              <i class="bi bi-chevron-right"></i>
                            </span>
                            Invitation links
                          </summary>
                          <div
                            type="form"
                            method="PATCH"
                            action="/courses/${request.state.course
                              .publicId}/settings"
                            css="${css`
                              padding: var(--size--2) var(--size--0);
                              border-bottom: var(--border-width--1) solid
                                light-dark(
                                  var(--color--slate--200),
                                  var(--color--slate--800)
                                );
                              display: flex;
                              flex-direction: column;
                              gap: var(--size--4);
                            `}"
                          >
                            <div
                              key="invitationLink"
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--2);
                              `}"
                            >
                              <label
                                class="button button--rectangle button--transparent"
                              >
                                <input
                                  type="checkbox"
                                  name="invitationLinkCourseParticipationRoleInstructorsEnabled"
                                  $${Boolean(
                                    request.state.course
                                      .invitationLinkCourseParticipationRoleInstructorsEnabled,
                                  )
                                    ? html`checked`
                                    : html``}
                                  class="input--checkbox"
                                />  Invitation link for instructors
                              </label>
                              <input
                                key="invitationLinkToken--hide--input"
                                type="text"
                                value="https://${application.configuration
                                  .hostname}/courses/${request.state.course
                                  .publicId}/invitations/${"*".repeat(
                                  request.state.course
                                    .invitationLinkCourseParticipationRoleInstructorsToken
                                    .length,
                                )}"
                                readonly
                                class="input--text"
                                css="${css`
                                  font-family:
                                    "Roboto Mono Variable",
                                    var(--font-family--monospace);
                                `}"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    this.select();
                                  };
                                `}"
                              />
                              <input
                                key="invitationLinkToken--show--input"
                                type="text"
                                value="https://${application.configuration
                                  .hostname}/courses/${request.state.course
                                  .publicId}/invitations/${request.state.course
                                  .invitationLinkCourseParticipationRoleInstructorsToken}"
                                readonly
                                hidden
                                class="input--text"
                                css="${css`
                                  font-family:
                                    "Roboto Mono Variable",
                                    var(--font-family--monospace);
                                `}"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    this.select();
                                  };
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
                                  column-gap: var(--size--4);
                                  row-gap: var(--size--2);
                                `}"
                              >
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    const popover = javascript.popover({ element: this, trigger: "none" });
                                    this.onclick = async () => {
                                      await navigator.clipboard.writeText(${`https://${
                                        application.configuration.hostname
                                      }/courses/${
                                        request.state.course.publicId
                                      }/invitations/${
                                        request.state.course
                                          .invitationLinkCourseParticipationRoleInstructorsToken
                                      }`});
                                      popover.showPopover();
                                      await utilities.sleep(1000);
                                      popover.hidePopover();
                                    };
                                  `}"
                                >
                                  Copy
                                </button>
                                <div type="popover">Copied</div>
                                <button
                                  key="invitationLinkToken--show--button"
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--button"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--button"]').hidden = false;
                                    };
                                  `}"
                                >
                                  Show
                                </button>
                                <button
                                  key="invitationLinkToken--hide--button"
                                  type="button"
                                  hidden
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--button"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--button"]').hidden = true;
                                    };
                                  `}"
                                >
                                  Hide
                                </button>
                                <button
                                  key="invitationLinkToken--QRCode--show--button"
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--button"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--hide--button"]').hidden = false;
                                    };
                                  `}"
                                >
                                  Show QR code
                                </button>
                                <button
                                  key="invitationLinkToken--QRCode--hide--button"
                                  type="button"
                                  hidden
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--button"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--hide--button"]').hidden = true;
                                    };
                                  `}"
                                >
                                  Hide QR code
                                </button>
                                <div>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                      javascript.popover({ element: this, trigger: "click" });
                                    `}"
                                  >
                                    Renew
                                  </button>
                                  <div
                                    type="form popover"
                                    method="PATCH"
                                    action="/courses/${request.state.course
                                      .publicId}/settings"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    <input
                                      type="hidden"
                                      name="renewInvitationLinkCourseParticipationRoleInstructorsToken"
                                      value="true"
                                    />
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--red--500),
                                          var(--color--red--500)
                                        );
                                      `}"
                                    >
                                      <i
                                        class="bi bi-exclamation-triangle-fill"
                                      ></i
                                      > The existing invitation link will become
                                      invalid and a new invitation link will be
                                      created. Only renew the invitation link if
                                      it has been distributed to people who
                                      shouldn’t have access to it.
                                    </div>
                                    <div>
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--red"
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                        `}"
                                      >
                                        Renew invitation link
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                key="invitationLinkToken--QRCode--show--input"
                                hidden
                                css="${css`
                                  display: flex;
                                  justify-content: center;
                                `}"
                              >
                                <div
                                  css="${css`
                                    max-width: var(--size--48);
                                    width: 100%;
                                  `}"
                                >
                                  $${(
                                    await QRCode.toString(
                                      `https://${
                                        application.configuration.hostname
                                      }/courses/${
                                        request.state.course.publicId
                                      }/invitations/${
                                        request.state.course
                                          .invitationLinkCourseParticipationRoleInstructorsToken
                                      }`,
                                      { type: "svg", margin: 0 },
                                    )
                                  )
                                    .replace("#000000", "currentColor")
                                    .replace("#ffffff", "transparent")}
                                </div>
                              </div>
                            </div>
                            <div
                              key="invitationLink"
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--2);
                              `}"
                            >
                              <label
                                class="button button--rectangle button--transparent"
                              >
                                <input
                                  type="checkbox"
                                  name="invitationLinkCourseParticipationRoleStudentsEnabled"
                                  $${Boolean(
                                    request.state.course
                                      .invitationLinkCourseParticipationRoleStudentsEnabled,
                                  )
                                    ? html`checked`
                                    : html``}
                                  class="input--checkbox"
                                />  Invitation link for students
                              </label>
                              <input
                                key="invitationLinkToken--hide--input"
                                type="text"
                                value="https://${application.configuration
                                  .hostname}/courses/${request.state.course
                                  .publicId}/invitations/${"*".repeat(
                                  request.state.course
                                    .invitationLinkCourseParticipationRoleStudentsToken
                                    .length,
                                )}"
                                readonly
                                class="input--text"
                                css="${css`
                                  font-family:
                                    "Roboto Mono Variable",
                                    var(--font-family--monospace);
                                `}"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    this.select();
                                  };
                                `}"
                              />
                              <input
                                key="invitationLinkToken--show--input"
                                type="text"
                                value="https://${application.configuration
                                  .hostname}/courses/${request.state.course
                                  .publicId}/invitations/${request.state.course
                                  .invitationLinkCourseParticipationRoleStudentsToken}"
                                readonly
                                hidden
                                class="input--text"
                                css="${css`
                                  font-family:
                                    "Roboto Mono Variable",
                                    var(--font-family--monospace);
                                `}"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    this.select();
                                  };
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
                                  column-gap: var(--size--4);
                                  row-gap: var(--size--2);
                                `}"
                              >
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    const popover = javascript.popover({ element: this, trigger: "none" });
                                    this.onclick = async () => {
                                      await navigator.clipboard.writeText(${`https://${
                                        application.configuration.hostname
                                      }/courses/${
                                        request.state.course.publicId
                                      }/invitations/${
                                        request.state.course
                                          .invitationLinkCourseParticipationRoleStudentsToken
                                      }`});
                                      popover.showPopover();
                                      await utilities.sleep(1000);
                                      popover.hidePopover();
                                    };
                                  `}"
                                >
                                  Copy
                                </button>
                                <div type="popover">Copied</div>
                                <button
                                  key="invitationLinkToken--show--button"
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--button"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--button"]').hidden = false;
                                    };
                                  `}"
                                >
                                  Show
                                </button>
                                <button
                                  key="invitationLinkToken--hide--button"
                                  type="button"
                                  hidden
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--show--button"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--hide--button"]').hidden = true;
                                    };
                                  `}"
                                >
                                  Hide
                                </button>
                                <button
                                  key="invitationLinkToken--QRCode--show--button"
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--input"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--button"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--hide--button"]').hidden = false;
                                    };
                                  `}"
                                >
                                  Show QR code
                                </button>
                                <button
                                  key="invitationLinkToken--QRCode--hide--button"
                                  type="button"
                                  hidden
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--input"]').hidden = true;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--show--button"]').hidden = false;
                                      this.closest('[key~="invitationLink"]').querySelector('[key~="invitationLinkToken--QRCode--hide--button"]').hidden = true;
                                    };
                                  `}"
                                >
                                  Hide QR code
                                </button>
                                <div>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                      javascript.popover({ element: this, trigger: "click" });
                                    `}"
                                  >
                                    Renew
                                  </button>
                                  <div
                                    type="form popover"
                                    method="PATCH"
                                    action="/courses/${request.state.course
                                      .publicId}/settings"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    <input
                                      type="hidden"
                                      name="renewInvitationLinkCourseParticipationRoleStudentsToken"
                                      value="true"
                                    />
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--red--500),
                                          var(--color--red--500)
                                        );
                                      `}"
                                    >
                                      <i
                                        class="bi bi-exclamation-triangle-fill"
                                      ></i
                                      > The existing invitation link will become
                                      invalid and a new invitation link will be
                                      created. Only renew the invitation link if
                                      it has been distributed to people who
                                      shouldn’t have access to it.
                                    </div>
                                    <div>
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--red"
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                        `}"
                                      >
                                        Renew invitation link
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                key="invitationLinkToken--QRCode--show--input"
                                hidden
                                css="${css`
                                  display: flex;
                                  justify-content: center;
                                `}"
                              >
                                <div
                                  css="${css`
                                    max-width: var(--size--48);
                                    width: 100%;
                                  `}"
                                >
                                  $${(
                                    await QRCode.toString(
                                      `https://${
                                        application.configuration.hostname
                                      }/courses/${
                                        request.state.course.publicId
                                      }/invitations/${
                                        request.state.course
                                          .invitationLinkCourseParticipationRoleStudentsToken
                                      }`,
                                      { type: "svg", margin: 0 },
                                    )
                                  )
                                    .replace("#000000", "currentColor")
                                    .replace("#ffffff", "transparent")}
                                </div>
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
                                Update invitation links
                              </button>
                            </div>
                          </div>
                        </details>
                        <details>
                          <summary
                            class="button button--rectangle button--transparent"
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
                            <span
                              css="${css`
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
                                details[open] > summary > & {
                                  rotate: var(--rotate--90);
                                }
                              `}"
                            >
                              <i class="bi bi-chevron-right"></i>
                            </span>
                            Send invitation emails
                          </summary>
                          <div
                            type="form"
                            method="POST"
                            action="/courses/${request.state.course
                              .publicId}/settings/invitation-emails"
                            css="${css`
                              padding: var(--size--2) var(--size--0);
                              border-bottom: var(--border-width--1) solid
                                light-dark(
                                  var(--color--slate--200),
                                  var(--color--slate--800)
                                );
                              display: flex;
                              flex-direction: column;
                              gap: var(--size--4);
                            `}"
                          >
                            <div
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--2);
                              `}"
                            >
                              <label
                                class="button button--rectangle button--transparent"
                              >
                                <input
                                  type="radio"
                                  name="courseParticipationRole"
                                  value="courseParticipationRoleInstructor"
                                  class="input--radio"
                                />  Instructors
                              </label>
                              <label
                                class="button button--rectangle button--transparent"
                              >
                                <input
                                  type="radio"
                                  name="courseParticipationRole"
                                  value="courseParticipationRoleStudent"
                                  checked
                                  class="input--radio"
                                />  Students
                              </label>
                            </div>
                            <textarea
                              name="courseInvitationEmails"
                              placeholder="${`"Scott Smith" <scott@courselore.org>, Leandro Facchinetti <leandro@courselore.org>, ali@courselore.org, …`}"
                              required
                              maxlength="50000"
                              class="input--text"
                              css="${css`
                                font-family:
                                  "Roboto Mono Variable",
                                  var(--font-family--monospace);
                                height: var(--size--48);
                              `}"
                              javascript="${javascript`
                                this.onvalidate = () => {
                                  const addresses = emailAddresses.parseAddressList(this.value.replaceAll(/\\n+/g, " , "));
                                  if (
                                    addresses === null ||
                                    addresses.length === 0 ||
                                    addresses.some(
                                      (address) =>
                                        address.type !== "mailbox" ||
                                        address.address.match(utilities.emailRegExp) === null
                                    )
                                  )
                                    throw new javascript.ValidationError("Invalid email list");
                                };
                              `}"
                            ></textarea>
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
                                Send invitation emails
                              </button>
                            </div>
                          </div>
                        </details>
                        $${(() => {
                          const courseInvitationEmails =
                            application.database.all<{
                              publicId: string;
                              email: string;
                              courseParticipationRole:
                                | "courseParticipationRoleInstructor"
                                | "courseParticipationRoleStudent";
                            }>(
                              sql`
                                select
                                  "publicId",
                                  "email",
                                  "courseParticipationRole"
                                from "courseInvitationEmails"
                                where "course" = ${request.state.course.id}
                                order by "id" asc;
                              `,
                            );
                          return 0 < courseInvitationEmails.length
                            ? html`
                                <details>
                                  <summary
                                    class="button button--rectangle button--transparent"
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
                                    `}"
                                  >
                                    <span
                                      css="${css`
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
                                        details[open] > summary > & {
                                          rotate: var(--rotate--90);
                                        }
                                      `}"
                                    >
                                      <i class="bi bi-chevron-right"></i>
                                    </span>
                                    Pending invitation emails
                                  </summary>
                                  <div
                                    type="form"
                                    method="PATCH"
                                    action="/courses/${request.state.course
                                      .publicId}/settings/invitation-emails"
                                    css="${css`
                                      padding: var(--size--2) var(--size--0);
                                      border-bottom: var(--border-width--1)
                                        solid
                                        light-dark(
                                          var(--color--slate--200),
                                          var(--color--slate--800)
                                        );
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--4);
                                    `}"
                                    javascript="${javascript`
                                      this.onsubmit = () => {
                                        delete this.isModified;
                                      };
                                    `}"
                                  >
                                    $${courseInvitationEmails.map(
                                      (courseInvitationEmail) => html`
                                        <div
                                          key="courseInvitationEmail ${courseInvitationEmail.publicId}"
                                          css="${css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--size--1);
                                          `}"
                                        >
                                          <input
                                            type="hidden"
                                            name="courseInvitationEmails[]"
                                            value="${courseInvitationEmail.publicId}"
                                          />
                                          <input
                                            type="hidden"
                                            name="courseInvitationEmails[${courseInvitationEmail.publicId}].id"
                                            value="${courseInvitationEmail.publicId}"
                                          />
                                          <div
                                            css="${css`
                                              font-family:
                                                "Roboto Mono Variable",
                                                var(--font-family--monospace);
                                            `}"
                                          >
                                            ${courseInvitationEmail.email}
                                          </div>
                                          <div
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
                                              column-gap: var(--size--4);
                                              row-gap: var(--size--2);
                                            `}"
                                          >
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
                                                >Role:</span
                                              >  <input
                                                type="radio"
                                                name="courseInvitationEmails[${courseInvitationEmail.publicId}].courseParticipationRole"
                                                value="courseParticipationRoleInstructor"
                                                required
                                                $${courseInvitationEmail.courseParticipationRole ===
                                                "courseParticipationRoleInstructor"
                                                  ? html`checked`
                                                  : html``}
                                                hidden
                                              /><span
                                                css="${css`
                                                  :not(:checked) + & {
                                                    display: none;
                                                  }
                                                `}"
                                                >Instructor</span
                                              ><input
                                                type="radio"
                                                name="courseInvitationEmails[${courseInvitationEmail.publicId}].courseParticipationRole"
                                                value="courseParticipationRoleStudent"
                                                required
                                                $${courseInvitationEmail.courseParticipationRole ===
                                                "courseParticipationRoleStudent"
                                                  ? html`checked`
                                                  : html``}
                                                hidden
                                              /><span
                                                css="${css`
                                                  :not(:checked) + & {
                                                    display: none;
                                                  }
                                                `}"
                                                >Student</span
                                              > <i
                                                class="bi bi-chevron-down"
                                              ></i>
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
                                                    this.closest('[key~="courseInvitationEmail"]').querySelector(${`[name="courseInvitationEmails[${courseInvitationEmail.publicId}].courseParticipationRole"][value="courseParticipationRoleInstructor"]`}).click();
                                                  };
                                                `}"
                                              >
                                                Instructor
                                              </button>
                                              <button
                                                type="button"
                                                class="button button--rectangle button--transparent button--dropdown-menu"
                                                javascript="${javascript`
                                                  this.onclick = () => {
                                                    this.closest('[key~="courseInvitationEmail"]').querySelector(${`[name="courseInvitationEmails[${courseInvitationEmail.publicId}].courseParticipationRole"][value="courseParticipationRoleStudent"]`}).click();
                                                  };
                                                `}"
                                              >
                                                Student
                                              </button>
                                            </div>
                                            <button
                                              type="button"
                                              class="button button--rectangle button--transparent"
                                              javascript="${javascript`
                                                this.onclick = () => {
                                                  this.closest('[type~="form"]').isModified = true;
                                                  this.closest('[key~="courseInvitationEmail"]').remove();
                                                };
                                              `}"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      `,
                                    )}
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                      `}"
                                    >
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--blue"
                                      >
                                        Update pending invitation emails
                                      </button>
                                    </div>
                                  </div>
                                </details>
                              `
                            : html``;
                        })()}
                      </div>
                    </details>
                    <details>
                      <summary
                        class="button button--rectangle button--transparent"
                        css="${css`
                          font-weight: 500;
                        `}"
                      >
                        <span
                          css="${css`
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
                            details[open] > summary > & {
                              rotate: var(--rotate--90);
                            }
                          `}"
                        >
                          <i class="bi bi-chevron-right"></i>
                        </span>
                        Course participants
                      </summary>
                      <div
                        type="form"
                        method="PATCH"
                        action="/courses/${request.state.course
                          .publicId}/settings/participations"
                        css="${css`
                          padding: var(--size--2) var(--size--0);
                          border-bottom: var(--border-width--1) solid
                            light-dark(
                              var(--color--slate--200),
                              var(--color--slate--800)
                            );
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--4);
                        `}"
                        javascript="${javascript`
                          this.onsubmit = () => {
                            delete this.isModified;
                          };
                        `}"
                      >
                        $${application.database
                          .all<{
                            id: number;
                            publicId: string;
                            user: number;
                            courseParticipationRole:
                              | "courseParticipationRoleInstructor"
                              | "courseParticipationRoleStudent";
                          }>(
                            sql`
                              select
                                "courseParticipations"."id" as "id",
                                "courseParticipations"."publicId" as "publicId",
                                "courseParticipations"."user" as "user",
                                "courseParticipations"."courseParticipationRole" as "courseParticipationRole"
                              from "courseParticipations"
                              join "users" on "courseParticipations"."user" = "users"."id"
                              where "courseParticipations"."course" = ${request.state.course.id}
                              order by
                                "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' desc,
                                "users"."name" asc;
                            `,
                          )
                          .map((courseParticipation) => {
                            const user = application.database.get<{
                              publicId: string;
                              name: string;
                              email: string;
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
                                  "email",
                                  "avatarColor",
                                  "avatarImage",
                                  "lastSeenOnlineAt"
                                from "users"
                                where "id" = ${courseParticipation.user};
                              `,
                            );
                            if (user === undefined) throw new Error();
                            return html`
                              <div
                                key="courseParticipation ${courseParticipation.publicId}"
                                css="${css`
                                  display: flex;
                                  align-items: center;
                                  gap: var(--size--3);
                                `}"
                              >
                                <div>
                                  $${application.partials.userAvatar({
                                    user,
                                    size: 9,
                                  })}
                                </div>
                                <div
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--1);
                                  `}"
                                >
                                  <input
                                    type="hidden"
                                    name="courseParticipations[]"
                                    value="${courseParticipation.publicId}"
                                  />
                                  <input
                                    type="hidden"
                                    name="courseParticipations[${courseParticipation.publicId}].id"
                                    value="${courseParticipation.publicId}"
                                  />
                                  <div>
                                    <span
                                      css="${css`
                                        font-weight: 500;
                                      `}"
                                      >${user.name}</span
                                    >  <span
                                      css="${css`
                                        font-family:
                                          "Roboto Mono Variable",
                                          var(--font-family--monospace);
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        color: light-dark(
                                          var(--color--slate--600),
                                          var(--color--slate--400)
                                        );
                                      `}"
                                      >${`<${user.email}>`}</span
                                    >
                                  </div>
                                  <div
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
                                      column-gap: var(--size--4);
                                      row-gap: var(--size--2);
                                    `}"
                                  >
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
                                        >Role:</span
                                      >  <input
                                        type="radio"
                                        name="courseParticipations[${courseParticipation.publicId}].courseParticipationRole"
                                        value="courseParticipationRoleInstructor"
                                        required
                                        $${courseParticipation.courseParticipationRole ===
                                        "courseParticipationRoleInstructor"
                                          ? html`checked`
                                          : html``}
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Instructor</span
                                      ><input
                                        type="radio"
                                        name="courseParticipations[${courseParticipation.publicId}].courseParticipationRole"
                                        value="courseParticipationRoleStudent"
                                        required
                                        $${courseParticipation.courseParticipationRole ===
                                        "courseParticipationRoleStudent"
                                          ? html`checked`
                                          : html``}
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Student</span
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
                                            this.closest('[key~="courseParticipation"]').querySelector(${`[name="courseParticipations[${courseParticipation.publicId}].courseParticipationRole"][value="courseParticipationRoleInstructor"]`}).click();
                                          };
                                        `}"
                                      >
                                        Instructor
                                      </button>
                                      <button
                                        type="button"
                                        class="button button--rectangle button--transparent button--dropdown-menu"
                                        javascript="${javascript`
                                          this.onclick = () => {
                                            this.closest('[key~="courseParticipation"]').querySelector(${`[name="courseParticipations[${courseParticipation.publicId}].courseParticipationRole"][value="courseParticipationRoleStudent"]`}).click();
                                          };
                                        `}"
                                      >
                                        Student
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent"
                                      javascript="${javascript`
                                        javascript.popover({ element: this, trigger: "click" });
                                      `}"
                                    >
                                      Remove
                                    </button>
                                    <div
                                      type="popover"
                                      css="${css`
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--size--2);
                                      `}"
                                    >
                                      <div
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                          font-weight: 600;
                                          color: light-dark(
                                            var(--color--red--500),
                                            var(--color--red--500)
                                          );
                                        `}"
                                      >
                                        <i
                                          class="bi bi-exclamation-triangle-fill"
                                        ></i
                                        > Once you remove this course
                                        participant from the course, they may
                                        only participate again with an
                                        invitation.
                                      </div>
                                      <div>
                                        <button
                                          type="button"
                                          class="button button--rectangle button--red"
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                          `}"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[type~="form"]').isModified = true;
                                              this.closest('[key~="courseParticipation"]').remove();
                                            };
                                          `}"
                                        >
                                          Remove course participant
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            `;
                          })}
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
                            Update course participants
                          </button>
                        </div>
                      </div>
                    </details>
                  `
                : html``}
              <details>
                <summary
                  class="button button--rectangle button--transparent"
                  css="${css`
                    font-weight: 500;
                  `}"
                >
                  <span
                    css="${css`
                      display: inline-block;
                      transition-property: var(
                        --transition-property--transform
                      );
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--ease-in-out
                      );
                      details[open] > summary > & {
                        rotate: var(--rotate--90);
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  Danger zone
                </summary>
                <div
                  css="${css`
                    padding: var(--size--2) var(--size--0);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <div
                    css="${css`
                      font-size: var(--font-size--3);
                      line-height: var(--font-size--3--line-height);
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--red"
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
                        gap: var(--size--2);
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
                        remove yourself from the course, you may only
                        participate again with an invitation.
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
              </details>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/settings/general-settings$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          name: string;
          information: string;
          courseParticipationRoleStudentsAnonymityAllowed:
            | "courseParticipationRoleStudentsAnonymityAllowedNone"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors";
          courseParticipationRoleStudentsMayHavePrivateCourseConversations: "on";
          courseParticipationRoleStudentsMayAttachImages: "on";
          courseState: "courseStateActive" | "courseStateArchived";
        },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseParticipation.courseParticipationRole !==
          "courseParticipationRoleInstructor"
      )
        return;
      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === "" ||
        typeof request.body.information !== "string" ||
        (request.body.courseParticipationRoleStudentsAnonymityAllowed !==
          "courseParticipationRoleStudentsAnonymityAllowedNone" &&
          request.body.courseParticipationRoleStudentsAnonymityAllowed !==
            "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" &&
          request.body.courseParticipationRoleStudentsAnonymityAllowed !==
            "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors") ||
        (request.body.courseState !== "courseStateActive" &&
          request.body.courseState !== "courseStateArchived")
      )
        throw "validation";
      application.database.run(
        sql`
          update "courses"
          set
            "name" = ${request.body.name},
            "information" = ${request.body.information.trim() !== "" ? request.body.information : null},
            "courseParticipationRoleStudentsAnonymityAllowed" = ${request.body.courseParticipationRoleStudentsAnonymityAllowed},
            "courseParticipationRoleStudentsMayHavePrivateCourseConversations" = ${Number(request.body.courseParticipationRoleStudentsMayHavePrivateCourseConversations === "on")},
            "courseParticipationRoleStudentsMayAttachImages" = ${Number(request.body.courseParticipationRoleStudentsMayAttachImages === "on")},
            "courseState" = ${request.body.courseState}
          where "id" = ${request.state.course.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">General settings updated successfully.</div>
      `);
      response.redirect(`/courses/${request.state.course.publicId}/settings`);
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/settings/tags$"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          courseConversationRequiresTagging: "on";
          tags: string[];
          [tagsName: `tags[${string}].name`]: string;
          [
            tagsPrivateToCourseParticipationRoleInstructors: `tags[${string}].privateToCourseParticipationRoleInstructors`
          ]: "on";
        },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseParticipation.courseParticipationRole !==
          "courseParticipationRoleInstructor"
      )
        return;
      // if (TODO) throw "validation";
      response.setFlash(html`
        <div class="flash--green">Conversation tags updated successfully.</div>
      `);
      response.redirect(`/courses/${request.state.course.publicId}/settings`);
    },
  });
};
