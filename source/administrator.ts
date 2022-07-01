import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { sql } from "@leafac/sqlite";
import { javascript } from "@leafac/javascript";
import lodash from "lodash";

import {
  Courselore,
  IsSignedInMiddlewareLocals,
  UserAvatarlessBackgroundColor,
} from "./index.js";

export type CanCreateCourses = typeof canCreateCourseses[number];
export const canCreateCourseses = [
  "anyone",
  "staff-and-administrators",
  "administrators",
] as const;

export type SystemRole = typeof systemRoles[number];
export const systemRoles = ["administrator", "staff", "none"] as const;

export type SystemRoleIconPartial = {
  [role in SystemRole]: {
    regular: HTML;
    fill: HTML;
  };
};

export type IsAdministratorMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  IsAdministratorMiddlewareLocals
>[];
export interface IsAdministratorMiddlewareLocals
  extends IsSignedInMiddlewareLocals {}

export type CanCreateCoursesMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  CanCreateCoursesMiddlewareLocals
>[];
export interface CanCreateCoursesMiddlewareLocals
  extends IsSignedInMiddlewareLocals {}

export type MayManageUserSystemRolesMiddleware = express.RequestHandler<
  { userReference: string },
  any,
  {},
  {},
  MayManageUserSystemRolesMiddlewareLocals
>[];
export interface MayManageUserSystemRolesMiddlewareLocals
  extends IsAdministratorMiddlewareLocals {
  managedUser: {
    id: number;
    isSelf: boolean;
  };
}

export type AdministratorLayout = ({
  req,
  res,
  head,
  body,
}: {
  req: express.Request<{}, any, {}, {}, IsAdministratorMiddlewareLocals>;
  res: express.Response<any, IsAdministratorMiddlewareLocals>;
  head: HTML;
  body: HTML;
}) => HTML;

export default (app: Courselore): void => {
  app.locals.options.canCreateCourses = JSON.parse(
    app.locals.database.get<{
      value: string;
    }>(
      sql`
        SELECT "value"
        FROM "configurations"
        WHERE "key" = 'canCreateCourses'
      `
    )!.value
  );

  app.locals.options.demonstration =
    JSON.parse(
      app.locals.database.get<{
        value: string;
      }>(
        sql`
        SELECT "value"
        FROM "configurations"
        WHERE "key" = 'demonstrationAt'
      `
      )!.value
    ) !== null;

  app.locals.options.administratorEmail = JSON.parse(
    app.locals.database.get<{
      value: string;
    }>(
      sql`
        SELECT "value"
        FROM "configurations"
        WHERE "key" = 'administratorEmail'
      `
    )!.value
  );

  app.locals.partials.systemRoleIcon = {
    administrator: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
    none: {
      regular: html`<i class="bi bi-dash-circle"></i>`,
      fill: html`<i class="bi bi-dash-circle-fill"></i>`,
    },
  };

  app.locals.middlewares.isAdministrator = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.user.systemRole === "administrator") return next();
      next("route");
    },
  ];

  app.locals.middlewares.canCreateCourses = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.canCreateCourses) return next();
      next("route");
    },
  ];

  app.locals.middlewares.mayManageUserSystemRoles = [
    ...app.locals.middlewares.isAdministrator,
    (req, res, next) => {
      const managedUser = app.locals.database.get<{
        id: number;
      }>(
        sql`
          SELECT "id"
          FROM "users"
          WHERE "reference" = ${req.params.userReference}
        `
      );
      if (managedUser === undefined) return next("route");
      res.locals.managedUser = {
        ...managedUser,
        isSelf: managedUser.id === res.locals.user.id,
      };
      if (
        res.locals.managedUser.isSelf &&
        app.locals.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "users"
            WHERE "systemRole" = 'administrator'
          `
        )!.count === 1
      )
        return next("validation");
      next();
    },
  ];

  app.locals.layouts.administratorPanel = ({ req, res, head, body }) =>
    app.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-tools"></i>
        Administrator Panel
      `,
      menu: html`
        <a
          href="${app.locals.options.baseURL}/administrator-panel/configuration"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administrator-panel/configuration"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/administrator-panel/configuration")
              ? "bi-gear-fill"
              : "bi-gear"}"
          ></i>
          Configuration
        </a>
        <a
          href="${app.locals.options.baseURL}/administrator-panel/system-roles"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administrator-panel/system-roles"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/administrator-panel/system-roles")
              ? "bi-people-fill"
              : "bi-people"}"
          ></i>
          System Roles
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administrator-panel",
    ...app.locals.middlewares.isAdministrator,
    (res, req) => {
      req.redirect(
        303,
        `${app.locals.options.baseURL}/administrator-panel/configuration`
      );
    }
  );

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administrator-panel/configuration",
    ...app.locals.middlewares.isAdministrator,
    (req, res) => {
      res.send(
        app.locals.layouts.administratorPanel({
          req,
          res,
          head: html`<title>
            Configuration · Administrator Panel · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-tools"></i>
              Administrator Panel ·
              <i class="bi bi-gear"></i>
              Configuration
            </h2>

            <form
              method="PATCH"
              action="${app.locals.options
                .baseURL}/administrator-panel/configuration"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Allow to Create Courses</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="canCreateCourses"
                      value="anyone"
                      required
                      $${app.locals.options.canCreateCourses === "anyone"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Anyone
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="canCreateCourses"
                      value="staff-and-administrators"
                      required
                      $${app.locals.options.canCreateCourses ===
                      "staff-and-administrators"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Staff & administrators
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="canCreateCourses"
                      value="administrators"
                      required
                      $${app.locals.options.canCreateCourses ===
                      "administrators"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Administrators
                  </label>
                </div>
              </div>
              <div
                css="${res.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="demonstration"
                    $${app.locals.options.demonstration
                      ? html`checked`
                      : html``}
                    class="input--checkbox"
                  />
                  Run in demonstration mode
                </label>
              </div>
              <label class="label">
                <p class="label--text">Administrator Email</p>
                <input
                  type="email"
                  name="administratorEmail"
                  placeholder="you@educational-institution.edu"
                  value="${app.locals.options.administratorEmail}"
                  required
                  class="input--text"
                />
              </label>

              <hr class="separator" />

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Configuration
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    {
      canCreateCourses?: CanCreateCourses;
      demonstration?: "on";
      administratorEmail?: string;
    },
    {},
    IsAdministratorMiddlewareLocals
  >(
    "/administrator-panel/configuration",
    ...app.locals.middlewares.isAdministrator,
    (req, res, next) => {
      if (
        typeof req.body.canCreateCourses !== "string" ||
        !canCreateCourseses.includes(req.body.canCreateCourses) ||
        ![undefined, "on"].includes(req.body.demonstration) ||
        typeof req.body.administratorEmail !== "string" ||
        req.body.administratorEmail.match(app.locals.helpers.emailRegExp) ===
          null
      )
        return next("validation");

      app.locals.options.canCreateCourses = JSON.parse(
        app.locals.database.get<{
          value: string;
        }>(
          sql`
            UPDATE "configurations"
            SET "value" = ${JSON.stringify(req.body.canCreateCourses)}
            WHERE "key" = 'canCreateCourses'
            RETURNING *
          `
        )!.value
      );

      app.locals.options.demonstration = JSON.parse(
        app.locals.database.get<{ value: string }>(
          sql`
            UPDATE "configurations"
            SET "value" = ${JSON.stringify(
              req.body.demonstration === "on" ? new Date().toISOString() : null
            )}
            WHERE "key" = 'demonstrationAt'
            RETURNING *
          `
        )!.value
      );

      app.locals.options.administratorEmail = JSON.parse(
        app.locals.database.get<{ value: string }>(
          sql`
            UPDATE "configurations"
            SET "value" = ${JSON.stringify(req.body.administratorEmail)}
            WHERE "key" = 'administratorEmail'
            RETURNING *
          `
        )!.value
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Configuration updated successfully.`,
      });

      res.redirect(
        303,
        `${app.locals.options.baseURL}/administrator-panel/configuration`
      );
    }
  );

  app.get<
    { userReference: string },
    HTML,
    {},
    {},
    IsAdministratorMiddlewareLocals
  >(
    "/administrator-panel/system-roles",
    ...app.locals.middlewares.isAdministrator,
    (req, res) => {
      const users = app.locals.database.all<{
        id: number;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        name: string;
        avatar: string | null;
        avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
        biographySource: string | null;
        biographyPreprocessed: HTML | null;
        systemRole: SystemRole;
      }>(
        sql`
          SELECT "id",
                 "lastSeenOnlineAt",
                 "reference",
                 "email",
                 "name",
                 "avatar",
                 "avatarlessBackgroundColor",
                 "biographySource",
                 "biographyPreprocessed",
                 "systemRole"
          FROM "users"
          ORDER BY CASE "systemRole"
                     WHEN 'administrator' THEN 0
                     WHEN 'staff' THEN 1
                     WHEN 'none' THEN 2
                   END,
                  "users"."name" ASC
        `
      );

      res.send(
        app.locals.layouts.administratorPanel({
          req,
          res,
          head: html`<title>System Roles · Administrator Panel · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-tools"></i>
              Administrator Panel ·
              <i class="bi bi-people"></i>
              System Roles
            </h2>

            <label
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--2);
                align-items: baseline;
              `)}"
            >
              <i class="bi bi-funnel"></i>
              <input
                type="text"
                class="input--text"
                placeholder="Filter…"
                onload="${javascript`
                  this.isModified = false;

                  this.oninput = () => {
                    const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                    for (const user of document.querySelectorAll(".user")) {
                      let userHidden = filterPhrases.length > 0;
                      for (const filterablePhrasesElement of user.querySelectorAll("[data-filterable-phrases]")) {
                        const filterablePhrases = JSON.parse(filterablePhrasesElement.dataset.filterablePhrases);
                        const filterablePhrasesElementChildren = [];
                        for (const filterablePhrase of filterablePhrases) {
                          let filterablePhraseElement;
                          if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                            filterablePhraseElement = document.createElement("mark");
                            filterablePhraseElement.classList.add("mark");
                            userHidden = false;
                          } else
                            filterablePhraseElement = document.createElement("span");
                          filterablePhraseElement.textContent = filterablePhrase;
                          filterablePhrasesElementChildren.push(filterablePhraseElement);
                        }
                        filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                      }
                      user.hidden = userHidden;
                    }
                  };
                `}"
              />
            </label>

            $${users.map((user) => {
              const action = `${app.locals.options.baseURL}/users/${user.reference}/system-roles`;
              const isSelf = user.id === res.locals.user.id;
              const isOnlyAdministrator =
                isSelf &&
                users.filter((user) => user.systemRole === "administrator")
                  .length === 1;

              return html`
                <div
                  key="user--${user.reference}"
                  class="user"
                  css="${res.locals.css(css`
                    padding-top: var(--space--2);
                    border-top: var(--border-width--1) solid
                      var(--color--gray--medium--200);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  <div>
                    $${app.locals.partials.user({
                      req,
                      res,
                      user,
                      name: false,
                    })}
                  </div>

                  <div
                    css="${res.locals.css(css`
                      flex: 1;
                      margin-top: var(--space--0-5);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      min-width: var(--space--0);
                    `)}"
                  >
                    <div>
                      <div
                        data-filterable-phrases="${JSON.stringify(
                          app.locals.helpers.splitFilterablePhrases(user.name)
                        )}"
                        class="strong"
                      >
                        ${user.name}
                      </div>
                      <div class="secondary">
                        <span
                          data-filterable-phrases="${JSON.stringify(
                            app.locals.helpers.splitFilterablePhrases(
                              user.email
                            )
                          )}"
                          css="${res.locals.css(css`
                            margin-right: var(--space--2);
                          `)}"
                        >
                          ${user.email}
                        </span>
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          css="${res.locals.css(css`
                            font-size: var(--font-size--xs);
                            line-height: var(--line-height--xs);
                            display: inline-flex;
                          `)}"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Copy Email",
                            });
                            (this.copied ??= tippy(this)).setProps({
                              theme: "green",
                              trigger: "manual",
                              content: "Copied",
                            });

                            this.onclick = async () => {
                              await navigator.clipboard.writeText(${JSON.stringify(
                                user.email
                              )});
                              this.copied.show();
                              await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                              this.copied.hide();
                            };
                          `}"
                        >
                          <i class="bi bi-stickies"></i>
                        </button>
                      </div>
                      <div
                        class="secondary"
                        css="${res.locals.css(css`
                          font-size: var(--font-size--xs);
                        `)}"
                      >
                        <span>
                          Last seen online
                          <time
                            datetime="${new Date(
                              user.lastSeenOnlineAt
                            ).toISOString()}"
                            onload="${javascript`
                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                            `}"
                          ></time>
                        </span>
                      </div>
                    </div>

                    <div
                      css="${res.locals.css(css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div
                        css="${res.locals.css(css`
                          width: var(--space--28);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent ${user.systemRole ===
                          "administrator"
                            ? "text--rose"
                            : user.systemRole === "staff"
                            ? "text--teal"
                            : ""}"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Update System Role",
                            });
                            
                            (this.dropdown ??= tippy(this)).setProps({
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.html(
                                html`
                                  <div class="dropdown--menu">
                                    $${systemRoles.map((role) =>
                                      role === user.systemRole
                                        ? html``
                                        : html`
                                            <form
                                              key="role--${role}"
                                              method="PATCH"
                                              action="${action}"
                                            >
                                              <input
                                                type="hidden"
                                                name="_csrf"
                                                value="${req.csrfToken()}"
                                              />
                                              <input
                                                type="hidden"
                                                name="role"
                                                value="${role}"
                                              />
                                              <div>
                                                <button
                                                  class="dropdown--menu--item button button--transparent $${role ===
                                                  "administrator"
                                                    ? "text--rose"
                                                    : role === "staff"
                                                    ? "text--teal"
                                                    : ""}"
                                                  $${isOnlyAdministrator
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not update your own role because you’re the only administrator.",
                                                          });
                                                        `}"
                                                      `
                                                    : isSelf
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.dropdown ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                            appendTo: document.querySelector("body"),
                                                            content: ${res.locals.html(
                                                              html`
                                                                <form
                                                                  key="role--${role}"
                                                                  method="PATCH"
                                                                  action="${action}"
                                                                  css="${res
                                                                    .locals
                                                                    .css(css`
                                                                    padding: var(
                                                                      --space--2
                                                                    );
                                                                    display: flex;
                                                                    flex-direction: column;
                                                                    gap: var(
                                                                      --space--4
                                                                    );
                                                                  `)}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <input
                                                                    type="hidden"
                                                                    name="role"
                                                                    value="${role}"
                                                                  />
                                                                  <p>
                                                                    Are you sure
                                                                    you want to
                                                                    update your
                                                                    own role to
                                                                    ${role}?
                                                                  </p>
                                                                  <p>
                                                                    <strong
                                                                      css="${res
                                                                        .locals
                                                                        .css(css`
                                                                        font-weight: var(
                                                                          --font-weight--bold
                                                                        );
                                                                      `)}"
                                                                    >
                                                                      You may
                                                                      not undo
                                                                      this
                                                                      action!
                                                                    </strong>
                                                                  </p>
                                                                  <button
                                                                    class="button button--rose"
                                                                  >
                                                                    <i
                                                                      class="bi bi-pencil-fill"
                                                                    ></i>
                                                                    Update My
                                                                    Own Role to
                                                                    ${lodash.capitalize(
                                                                      role
                                                                    )}
                                                                  </button>
                                                                </form>
                                                              `
                                                            )},
                                                          });
                                                        `}"
                                                      `
                                                    : html``}
                                                >
                                                  $${app.locals.partials
                                                    .systemRoleIcon[role][
                                                    role !== "none"
                                                      ? "fill"
                                                      : "regular"
                                                  ]}
                                                  ${lodash.capitalize(role)}
                                                </button>
                                              </div>
                                            </form>
                                          `
                                    )}
                                  </div>
                                `
                              )},
                            });
                          `}"
                        >
                          $${app.locals.partials.systemRoleIcon[
                            user.systemRole
                          ][user.systemRole !== "none" ? "fill" : "regular"]}
                          ${lodash.capitalize(user.systemRole)}
                          <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>
                    </div>

                    $${user.biographyPreprocessed !== null
                      ? html`
                          <details class="details">
                            <summary>Biography</summary>
                            $${app.locals.partials.content({
                              req,
                              res,
                              type: "preprocessed",
                              content: user.biographyPreprocessed,
                            }).processed}
                          </details>
                        `
                      : html``}
                  </div>
                </div>
              `;
            })}
          `,
        })
      );
    }
  );

  app.patch<
    { userReference: string },
    HTML,
    {
      role?: SystemRole;
    },
    {},
    MayManageUserSystemRolesMiddlewareLocals
  >(
    "/users/:userReference/system-roles",
    ...app.locals.middlewares.mayManageUserSystemRoles,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !systemRoles.includes(req.body.role)
      )
        return next("validation");

      app.locals.database.run(
        sql`UPDATE "users" SET "systemRole" = ${req.body.role} WHERE "id" = ${res.locals.managedUser.id}`
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`System role updated successfully.`,
      });

      res.redirect(
        303,
        res.locals.managedUser.isSelf
          ? `${app.locals.options.baseURL}`
          : `${app.locals.options.baseURL}/administrator-panel/system-roles`
      );
    }
  );
};
