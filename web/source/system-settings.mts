import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "GET",
    pathname: "/system-settings",
    handler: async (
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
        request.state.systemSettings === undefined ||
        request.state.user === undefined ||
        request.state.user.userRole !== "userRoleSystemAdministrator"
      )
        return;
      response.send(
        application.layouts.main({
          request,
          response,
          head: html`<title>System settings · Courselore</title>`,
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
                System settings
              </div>
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
                  General settings
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/system-settings/general-settings"
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
                      User roles who may create courses
                    </div>
                    <form
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
                          name="userRolesWhoMayCreateCourses"
                          value="userRoleUser"
                          $${request.state.systemSettings
                            .userRolesWhoMayCreateCourses === "userRoleUser"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  User
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="userRolesWhoMayCreateCourses"
                          value="userRoleStaff"
                          $${request.state.systemSettings
                            .userRolesWhoMayCreateCourses === "userRoleStaff"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  Staff
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="userRolesWhoMayCreateCourses"
                          value="userRoleSystemAdministrator"
                          $${request.state.systemSettings
                            .userRolesWhoMayCreateCourses ===
                          "userRoleSystemAdministrator"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  System administrator
                      </label>
                    </form>
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
                  Users
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/system-settings/users"
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
                  $${(() => {
                    const usersCount = application.database.get<{
                      count: number;
                    }>(
                      sql`
                          select count(*) as "count" from "users";
                        `,
                    )!.count;
                    const usersUserCount = application.database.get<{
                      count: number;
                    }>(
                      sql`
                          select count(*) as "count"
                          from "users"
                          where "userRole" = ${"userRoleUser"};
                        `,
                    )!.count;
                    const usersStaffCount = application.database.get<{
                      count: number;
                    }>(
                      sql`
                          select count(*) as "count"
                          from "users"
                          where "userRole" = ${"userRoleStaff"};
                        `,
                    )!.count;
                    const usersSystemAdministratorCount =
                      application.database.get<{
                        count: number;
                      }>(
                        sql`
                          select count(*) as "count"
                          from "users"
                          where "userRole" = ${"userRoleSystemAdministrator"};
                        `,
                      )!.count;
                    return html`
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          color: light-dark(
                            var(--color--slate--600),
                            var(--color--slate--400)
                          );
                        `}"
                      >
                        ${String(usersCount)}
                        user${usersCount === 1 ? "" : "s"} /
                        ${String(usersUserCount)} role user ·
                        ${String(usersStaffCount)} role staff ·
                        ${String(usersSystemAdministratorCount)} role system
                        administrator
                      </div>
                    `;
                  })()}
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
                        where "courseParticipations"."course" = ${1}
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
                          <input
                            type="hidden"
                            name="courseParticipationsPublicIds[]"
                            value="${courseParticipation.publicId}"
                          />
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
                                  line-height: var(--font-size--3--line-height);
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
                                  javascript.popover({ element: this, trigger: "click" });
                                `}"
                              >
                                <form>
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
                                </form>
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
                                  <i class="bi bi-exclamation-triangle-fill"></i
                                  > Once you remove this course participant from
                                  the course, they may only participate again
                                  with an invitation.
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
                                        this.closest('[type~="form"]')
                                          .insertAdjacentElement(
                                            "beforeend",
                                            javascript.stringToElement(${html`
                                              <input
                                                type="hidden"
                                                name="courseParticipationsPublicIdsToRemove[]"
                                                value="${courseParticipation.publicId}"
                                              />
                                            `})
                                          );
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
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: "/system-settings/general-settings",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          userRolesWhoMayCreateCourses:
            | "userRoleUser"
            | "userRoleStaff"
            | "userRoleSystemAdministrator";
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.systemSettings === undefined ||
        request.state.user === undefined ||
        request.state.user.userRole !== "userRoleSystemAdministrator"
      )
        return;
      if (
        request.body.userRolesWhoMayCreateCourses !== "userRoleUser" &&
        request.body.userRolesWhoMayCreateCourses !== "userRoleStaff" &&
        request.body.userRolesWhoMayCreateCourses !==
          "userRoleSystemAdministrator"
      )
        throw "validation";
      application.database.run(
        sql`
          update "systemSettings"
          set "userRolesWhoMayCreateCourses" = ${request.body.userRolesWhoMayCreateCourses}
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash!(html`
        <div class="flash--green">General settings updated successfully.</div>
      `);
      response.redirect!("/system-settings");
    },
  });
};
