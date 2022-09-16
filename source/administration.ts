import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { sql } from "@leafac/sqlite";
import { javascript } from "@leafac/javascript";
import got from "got";
import lodash from "lodash";
import semver from "semver";
import {
  Courselore,
  IsSignedInMiddlewareLocals,
  UserAvatarlessBackgroundColor,
} from "./index.js";

export interface AdministrationOptions {
  latestVersion?: string;
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

export default (app: Courselore): void => {
  app.locals.options = {
    ...app.locals.options,
    ...app.locals.database.get<{ [key: string]: any }>(
      sql`
        SELECT * FROM "administrationOptions"
      `
    )!,
  };

  if (app.locals.options.environment === "production")
    app.once("jobs", async () => {
      while (true) {
        try {
          const latestVersion = (
            (await got(
              "https://api.github.com/repos/courselore/courselore/releases/latest"
            ).json()) as { tag_name: string }
          ).tag_name;
          if (semver.gt(latestVersion, app.locals.options.version)) {
            app.locals.options.latestVersion = latestVersion;
            console.log(
              `${new Date().toISOString()}\tUPDATE CHECK\tNew version available: ${
                app.locals.options.latestVersion
              }.`
            );
          } else
            console.log(
              `${new Date().toISOString()}\tUPDATE CHECK\tCurrent version is the latest.`
            );
        } catch (error) {
          console.log(
            `${new Date().toISOString()}\tUPDATE CHECK\tERROR:\n${error}`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 60 * 60 * 1000));
      }
    });

  interface IsAdministratorMiddlewareLocals
    extends IsSignedInMiddlewareLocals {}
  const isAdministratorMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsAdministratorMiddlewareLocals
  >[] = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.user.systemRole === "administrator") return next();
      next("route");
    },
  ];

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administration",
    ...isAdministratorMiddleware,
    (res, req) => {
      req.redirect(
        303,
        `https://${app.locals.options.host}/administration/system-settings`
      );
    }
  );

  const administrationLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<{}, any, {}, {}, IsAdministratorMiddlewareLocals>;
    res: express.Response<any, IsAdministratorMiddlewareLocals>;
    head: HTML;
    body: HTML;
  }): HTML =>
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
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/administration\/system-settings\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-sliders"></i>
          System Settings
        </a>
        <a
          href="https://${app.locals.options.host}/administration/users"
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/administration\/users\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.match(/\/administration\/users\/?$/i)
              ? "bi-people-fill"
              : "bi-people"}"
          ></i>
          Users
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administration/system-settings",
    ...isAdministratorMiddleware,
    (req, res) => {
      res.send(
        administrationLayout({
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
                    All
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
    ...isAdministratorMiddleware,
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
          SET "userSystemRolesWhoMayCreateCourses" = ${req.body.userSystemRolesWhoMayCreateCourses}
          RETURNING *
        `
      )!;
      app.locals.options = { ...app.locals.options, ...administrationOptions };

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

  const systemRoleIcon: { [systemRole in SystemRole]: HTML } = {
    none: html`<i class="bi bi-dash-circle"></i>`,
    staff: html`<i class="bi bi-person-badge-fill"></i>`,
    administrator: html`<i class="bi bi-pc-display-horizontal"></i>`,
  };

  const systemRoleTextColor: { [systemRole in SystemRole]: string } = {
    none: "",
    staff: "text--teal",
    administrator: "text--rose",
  };

  app.get<
    { userReference: string },
    HTML,
    {},
    {},
    IsAdministratorMiddlewareLocals
  >("/administration/users", ...isAdministratorMiddleware, (req, res) => {
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
        ORDER BY "systemRole" = 'administrator' DESC,
                  "systemRole" = 'staff' DESC,
                  "systemRole" = 'none' DESC,
                  "users"."name" ASC
      `
    );

    res.send(
      administrationLayout({
        req,
        res,
        head: html`<title>Users · Administration · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-pc-display-horizontal"></i>
            Administration ·
            <i class="bi bi-people-fill"></i>
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
                          app.locals.helpers.splitFilterablePhrases(user.email)
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
                        class="button button--tight button--tight--inline button--transparent ${systemRoleTextColor[
                          user.systemRole
                        ]}"
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
                                  $${systemRoles.map(
                                    (systemRole) =>
                                      html`
                                        <form
                                          key="role--${systemRole}"
                                          method="PATCH"
                                          action="${action}"
                                        >
                                          <input
                                            type="hidden"
                                            name="role"
                                            value="${systemRole}"
                                          />
                                          <div>
                                            <button
                                              class="dropdown--menu--item button ${systemRole ===
                                              user.systemRole
                                                ? "button--blue"
                                                : "button--transparent"} ${systemRoleTextColor[
                                                systemRole
                                              ]}"
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
                                                              key="role--${systemRole}"
                                                              method="PATCH"
                                                              action="${action}"
                                                              css="${res.locals
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
                                                                name="role"
                                                                value="${systemRole}"
                                                              />
                                                              <p>
                                                                Are you sure you
                                                                want to update
                                                                your own role to
                                                                ${systemRole}?
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
                                                                  You may not
                                                                  undo this
                                                                  action!
                                                                </strong>
                                                              </p>
                                                              <button
                                                                class="button button--rose"
                                                              >
                                                                <i
                                                                  class="bi bi-pencil-fill"
                                                                ></i>
                                                                Update My Own
                                                                Role to
                                                                ${lodash.capitalize(
                                                                  systemRole
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
                                              $${systemRoleIcon[systemRole]}
                                              ${lodash.capitalize(systemRole)}
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
                        $${systemRoleIcon[user.systemRole]}
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
                            contentPreprocessed: user.biographyPreprocessed,
                          }).contentProcessed}
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
  });

  app.patch<
    { userReference: string },
    HTML,
    {
      role?: SystemRole;
    },
    {},
    IsAdministratorMiddlewareLocals
  >("/users/:userReference", ...isAdministratorMiddleware, (req, res, next) => {
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
    const isSelf = managedUser.id === res.locals.user.id;
    if (
      isSelf &&
      app.locals.database.get<{ count: number }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "users"
          WHERE "systemRole" = 'administrator'
        `
      )!.count === 1
    )
      return next("validation");

    if (typeof req.body.role === "string") {
      if (!systemRoles.includes(req.body.role)) return next("validation");

      app.locals.database.run(
        sql`UPDATE "users" SET "systemRole" = ${req.body.role} WHERE "id" = ${managedUser.id}`
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
      isSelf
        ? `https://${app.locals.options.host}`
        : `https://${app.locals.options.host}/administration/users`
    );
  });
};
