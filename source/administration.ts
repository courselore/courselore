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

export interface AdministrationOptions {
  userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
}

export type UserSystemRolesWhoMayCreateCourses =
  typeof userSystemRolesWhoMayCreateCourseses[number];
export const userSystemRolesWhoMayCreateCourseses = [
  "all",
  "staff-and-administrators",
  "administrators",
] as const;

export type SystemRole = typeof systemRoles[number];
export const systemRoles = ["none", "staff", "administrator"] as const;

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

export type MayManageUserMiddleware = express.RequestHandler<
  { userReference: string },
  any,
  {},
  {},
  MayManageUserMiddlewareLocals
>[];
export interface MayManageUserMiddlewareLocals
  extends IsAdministratorMiddlewareLocals {
  managedUser: {
    id: number;
    isSelf: boolean;
  };
}

export type AdministrationLayout = ({
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
  for (const [key, value] of Object.entries(
    app.locals.database.get<{ [key: string]: any }>(
      sql`
        SELECT * FROM "administrationOptions"
      `
    )!
  ))
    app.locals.options[key as keyof AdministrationOptions] = value;

  app.locals.partials.systemRoleIcon = {
    none: {
      regular: html`<i class="bi bi-dash-circle"></i>`,
      fill: html`<i class="bi bi-dash-circle-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
    administrator: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
  };

  app.locals.middlewares.isAdministrator = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.user.systemRole === "administrator") return next();
      next("route");
    },
  ];

  app.locals.middlewares.mayManageUser = [
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

  app.locals.layouts.administration = ({ req, res, head, body }) =>
    app.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-pc-display-horizontal"></i>
        Administration
      `,
      menu: html`
        <a
          href="https://${app.locals.options
            .host}/administration/system-settings"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administration/system-settings"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-sliders"></i>
          System Settings
        </a>
        <a
          href="https://${app.locals.options.host}/administration/users"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administration/users"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/administration/users")
              ? "bi-people-fill"
              : "bi-people"}"
          ></i>
          Users
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administration",
    ...app.locals.middlewares.isAdministrator,
    (res, req) => {
      req.redirect(
        303,
        `https://${app.locals.options.host}/administration/system-settings`
      );
    }
  );

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administration/system-settings",
    ...app.locals.middlewares.isAdministrator,
    (req, res) => {
      res.send(
        app.locals.layouts.administration({
          req,
          res,
          head: html`
            <title>System Settings · Administration · Courselore</title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-pc-display-horizontal"></i>
              Administration ·
              <i class="bi bi-sliders"></i>
              System Settings
            </h2>

            <form
              method="PATCH"
              action="https://${app.locals.options
                .host}/administration/system-settings"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Users Who May Create Courses</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="userSystemRolesWhoMayCreateCourses"
                      value="all"
                      required
                      $${app.locals.options
                        .userSystemRolesWhoMayCreateCourses === "all"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    all
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
                      name="userSystemRolesWhoMayCreateCourses"
                      value="staff-and-administrators"
                      required
                      $${app.locals.options
                        .userSystemRolesWhoMayCreateCourses ===
                      "staff-and-administrators"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Staff & Administrators
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
                      name="userSystemRolesWhoMayCreateCourses"
                      value="administrators"
                      required
                      $${app.locals.options
                        .userSystemRolesWhoMayCreateCourses === "administrators"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Administrators
                  </label>
                </div>
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update System Settings
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
      userSystemRolesWhoMayCreateCourses?: UserSystemRolesWhoMayCreateCourses;
    },
    {},
    IsAdministratorMiddlewareLocals
  >(
    "/administration/system-settings",
    ...app.locals.middlewares.isAdministrator,
    (req, res, next) => {
      if (
        typeof req.body.userSystemRolesWhoMayCreateCourses !== "string" ||
        !userSystemRolesWhoMayCreateCourseses.includes(
          req.body.userSystemRolesWhoMayCreateCourses
        )
      )
        return next("validation");

      const administrationOptions = app.locals.database.get<{
        [key: string]: any;
      }>(
        sql`
          UPDATE "administrationOptions"
          SET "value" = ${JSON.stringify(
            req.body.userSystemRolesWhoMayCreateCourses
          )}
          WHERE "key" = 'userSystemRolesWhoMayCreateCourses'
          RETURNING *
        `
      )!;
      for (const [key, value] of Object.entries(administrationOptions))
        app.locals.options[key as keyof AdministrationOptions] = value;

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`System settings updated successfully.`,
      });

      res.redirect(
        303,
        `https://${app.locals.options.host}/administration/system-settings`
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
    "/administration/users",
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
        app.locals.layouts.administration({
          req,
          res,
          head: html`<title>Users · Administration · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-pc-display-horizontal"></i>
              Administration ·
              <i class="bi bi-people"></i>
              Users
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
              const action = `https://${app.locals.options.host}/users/${user.reference}`;
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
    MayManageUserMiddlewareLocals
  >(
    "/users/:userReference",
    ...app.locals.middlewares.mayManageUser,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (
          typeof req.body.role !== "string" ||
          !systemRoles.includes(req.body.role)
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "users" SET "systemRole" = ${req.body.role} WHERE "id" = ${res.locals.managedUser.id}`
        );
      }

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`User updated successfully.`,
      });

      res.redirect(
        303,
        res.locals.managedUser.isSelf
          ? `https://${app.locals.options.host}`
          : `https://${app.locals.options.host}/administration/users`
      );
    }
  );
};
