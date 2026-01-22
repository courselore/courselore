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
                    const users = application.database.all<{
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
                          "email",
                          "avatarColor",
                          "avatarImage",
                          "userRole",
                          "lastSeenOnlineAt"
                        from "users"
                        order by
                          "userRole" = 'userRoleSystemAdministrator' desc,
                          "userRole" = 'userRoleStaff' desc,
                          "name" asc;
                      `,
                    );
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
                        ${String(users.length)}
                        user${users.length === 1 ? "" : "s"} /
                        ${String(
                          users.filter(
                            (user) =>
                              user.userRole === "userRoleSystemAdministrator",
                          ).length,
                        )}
                        role system administrator ·
                        ${String(
                          users.filter(
                            (user) => user.userRole === "userRoleStaff",
                          ).length,
                        )}
                        role staff ·
                        ${String(
                          users.filter(
                            (user) => user.userRole === "userRoleUser",
                          ).length,
                        )}
                        role user
                      </div>
                      $${users.map(
                        (user) => html`
                          <div
                            key="user ${user.publicId}"
                            css="${css`
                              display: flex;
                              align-items: center;
                              gap: var(--size--3);
                            `}"
                          >
                            <input
                              type="hidden"
                              name="usersPublicIds[]"
                              value="${user.publicId}"
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
                                      name="users[${user.publicId}].userRole"
                                      value="userRoleSystemAdministrator"
                                      required
                                      $${user.userRole ===
                                      "userRoleSystemAdministrator"
                                        ? html`checked`
                                        : html``}
                                      hidden
                                    /><span
                                      css="${css`
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >System administrator</span
                                    ><input
                                      type="radio"
                                      name="users[${user.publicId}].userRole"
                                      value="userRoleStaff"
                                      required
                                      $${user.userRole === "userRoleStaff"
                                        ? html`checked`
                                        : html``}
                                      hidden
                                    /><span
                                      css="${css`
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >Staff</span
                                    ><input
                                      type="radio"
                                      name="users[${user.publicId}].userRole"
                                      value="userRoleUser"
                                      required
                                      $${user.userRole === "userRoleUser"
                                        ? html`checked`
                                        : html``}
                                      hidden
                                    /><span
                                      css="${css`
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >User</span
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
                                        this.closest('[key~="user"]').querySelector(${`[name="users[${user.publicId}].userRole"][value="userRoleSystemAdministrator"]`}).click();
                                      };
                                    `}"
                                  >
                                    System administrator
                                  </button>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[key~="user"]').querySelector(${`[name="users[${user.publicId}].userRole"][value="userRoleStaff"]`}).click();
                                      };
                                    `}"
                                  >
                                    Staff
                                  </button>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[key~="user"]').querySelector(${`[name="users[${user.publicId}].userRole"][value="userRoleUser"]`}).click();
                                      };
                                    `}"
                                  >
                                    User
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
                                    > This action cannot be undone. The user
                                    will lose access to all their courses.
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
                                                  name="usersPublicIdsToRemove[]"
                                                  value="${user.publicId}"
                                                />
                                              `})
                                            );
                                          this.closest('[key~="user"]').remove();
                                        };
                                      `}"
                                    >
                                      Remove user
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        `,
                      )}
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
