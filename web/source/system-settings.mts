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
