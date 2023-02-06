import timers from "node:timers/promises";
import express from "express";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import lodash from "lodash";
import semver from "semver";
import { Application } from "./index.mjs";

export type ApplicationAdministration = {
  web: {
    locals: {
      helpers: {
        userSystemRolesWhoMayCreateCourseses: [
          "all",
          "staff-and-administrators",
          "administrators"
        ];

        systemRoles: ["none", "staff", "administrator"];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.helpers.userSystemRolesWhoMayCreateCourseses = [
    "all",
    "staff-and-administrators",
    "administrators",
  ];

  application.web.locals.helpers.systemRoles = [
    "none",
    "staff",
    "administrator",
  ];

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        try {
          application.log("CHECK FOR UPDATES", "STARTING...");
          const latestVersion = semver.clean(
            (
              (await application
                .got(
                  "https://api.github.com/repos/courselore/courselore/releases/latest"
                )
                .json()) as { tag_name: string }
            ).tag_name
          );
          if (typeof latestVersion !== "string")
            throw new Error(`latestVersion = ‘${latestVersion}’`);
          application.database.run(
            sql`
              UPDATE "administrationOptions" SET "latestVersion" = ${latestVersion}
            `
          );
          application.log(
            "CHECK FOR UPDATES",
            ...(semver.gt(latestVersion, application.version)
              ? [
                  `NEW VERSION AVAILABLE: ${application.version} → ${latestVersion}`,
                ]
              : [`CURRENT VERSION ${application.version} IS THE LATEST`])
          );
        } catch (error: any) {
          application.log(
            "CHECK FOR UPDATES",
            "ERROR",
            String(error),
            error?.stack
          );
        }

        await timers.setTimeout(
          10 * 60 * 1000 + Math.random() * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/administration", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    response.redirect(
      303,
      `https://${application.configuration.hostname}/administration/system-settings`
    );
  });

  const layoutAdministration = ({
    request,
    response,
    head,
    body,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    application.web.locals.layouts.settings({
      request,
      response,
      head,
      menuButton: html`
        <i class="bi bi-pc-display-horizontal"></i>
        Administration
      `,
      menu: html`
        <a
          href="https://${application.configuration
            .hostname}/administration/system-settings"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/administration\/system-settings\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-sliders"></i>
          System Settings
        </a>
        <a
          href="https://${application.configuration
            .hostname}/administration/users"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/administration\/users\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${request.path.match(/\/administration\/users\/?$/i)
              ? "bi-people-fill"
              : "bi-people"}"
          ></i>
          Users
        </a>
        <a
          href="https://${application.configuration
            .hostname}/administration/courses"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/administration\/courses\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi bi-journal-text"></i>
          Courses
        </a>
      `,
      body,
    });

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/administration/system-settings", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    response.send(
      layoutAdministration({
        request,
        response,
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
            action="https://${application.configuration
              .hostname}/administration/system-settings"
            novalidate
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div class="label">
              <p class="label--text">Users Who May Create Courses</p>
              <div
                css="${css`
                  display: flex;
                `}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="radio"
                    name="userSystemRolesWhoMayCreateCourses"
                    value="all"
                    required
                    $${response.locals.administrationOptions
                      .userSystemRolesWhoMayCreateCourses === "all"
                      ? html`checked`
                      : html``}
                    class="input--radio"
                  />
                  All
                </label>
              </div>
              <div
                css="${css`
                  display: flex;
                `}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="radio"
                    name="userSystemRolesWhoMayCreateCourses"
                    value="staff-and-administrators"
                    required
                    $${response.locals.administrationOptions
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
                css="${css`
                  display: flex;
                `}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="radio"
                    name="userSystemRolesWhoMayCreateCourses"
                    value="administrators"
                    required
                    $${response.locals.administrationOptions
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
  });

  application.web.patch<
    {},
    any,
    {
      userSystemRolesWhoMayCreateCourses?: Application["web"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/administration/system-settings", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    if (
      typeof request.body.userSystemRolesWhoMayCreateCourses !== "string" ||
      !application.web.locals.helpers.userSystemRolesWhoMayCreateCourseses.includes(
        request.body.userSystemRolesWhoMayCreateCourses
      )
    )
      return next("Validation");

    application.database.run(
      sql`
        UPDATE "administrationOptions"
        SET "userSystemRolesWhoMayCreateCourses" = ${request.body.userSystemRolesWhoMayCreateCourses}
      `
    )!;

    application.web.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`System settings updated successfully.`,
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/administration/system-settings`
    );
  });

  application.web.get<
    { userReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/administration/users", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    const users = application.database.all<{
      id: number;
      lastSeenOnlineAt: string;
      reference: string;
      email: string;
      name: string;
      avatar: string | null;
      avatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
      biographySource: string | null;
      biographyPreprocessed: HTML | null;
      systemRole: Application["web"]["locals"]["helpers"]["systemRoles"][number];
    }>(
      sql`
        SELECT
          "id",
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
        ORDER BY
          "systemRole" = 'administrator' DESC,
          "systemRole" = 'staff' DESC,
          "systemRole" = 'none' DESC,
          "users"."name" ASC
      `
    );

    response.send(
      layoutAdministration({
        request,
        response,
        head: html`<title>Users · Administration · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-pc-display-horizontal"></i>
            Administration ·
            <i class="bi bi-people-fill"></i>
            Users
          </h2>

          <label
            css="${css`
              display: flex;
              gap: var(--space--2);
              align-items: baseline;
            `}"
          >
            <i class="bi bi-funnel"></i>
            <input
              type="text"
              class="input--text"
              placeholder="Filter…"
              javascript="${javascript`
                this.isModified = false;

                this.oninput = () => {
                  const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                  for (const user of document.querySelectorAll('[key^="user/"]')) {
                    let userHidden = filterPhrases.length > 0;
                    for (const filterablePhrasesElement of user.querySelectorAll("[data-filterable-phrases]")) {
                      const filterablePhrases = JSON.parse(filterablePhrasesElement.getAttribute("data-filterable-phrases"));
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
            const action = `https://${application.configuration.hostname}/users/${user.reference}`;
            const isSelf = user.id === response.locals.user.id;
            const isOnlyAdministrator =
              isSelf &&
              users.filter((user) => user.systemRole === "administrator")
                .length === 1;

            return html`
              <div
                key="user/${user.reference}"
                css="${css`
                  padding-top: var(--space--2);
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                  display: flex;
                  gap: var(--space--2);
                `}"
                javascript="${javascript`
                  this.onbeforemorph = (event) => !event?.detail?.liveUpdate;
                `}"
              >
                <div>
                  $${application.web.locals.partials.user({
                    request,
                    response,
                    user,
                    name: false,
                  })}
                </div>

                <div
                  css="${css`
                    flex: 1;
                    margin-top: var(--space--0-5);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    min-width: var(--space--0);
                  `}"
                >
                  <div>
                    <div
                      data-filterable-phrases="${JSON.stringify(
                        application.web.locals.helpers.splitFilterablePhrases(
                          user.name
                        )
                      )}"
                      class="strong"
                    >
                      ${user.name}
                    </div>
                    <div class="secondary">
                      <span
                        data-filterable-phrases="${JSON.stringify(
                          application.web.locals.helpers.splitFilterablePhrases(
                            user.email
                          )
                        )}"
                        css="${css`
                          margin-right: var(--space--2);
                        `}"
                      >
                        ${user.email}
                      </span>
                      <button
                        class="button button--tight button--tight--inline button--transparent"
                        css="${css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                          display: inline-flex;
                        `}"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            tippyProps: {
                              touch: false,
                              content: "Copy Email",
                            },
                          });

                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "copied",
                            tippyProps: {
                              theme: "green",
                              trigger: "manual",
                              content: "Copied",
                            },
                          });

                          this.onclick = async () => {
                            await navigator.clipboard.writeText(${user.email});
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
                      css="${css`
                        font-size: var(--font-size--xs);
                      `}"
                    >
                      <span>
                        Last seen online
                        <time
                          datetime="${new Date(
                            user.lastSeenOnlineAt
                          ).toISOString()}"
                          javascript="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                          `}"
                        ></time>
                      </span>
                    </div>
                  </div>

                  <div
                    css="${css`
                      display: flex;
                      flex-wrap: wrap;
                      gap: var(--space--2);
                    `}"
                  >
                    <div
                      css="${css`
                        width: var(--space--28);
                        display: flex;
                        justify-content: flex-start;
                      `}"
                    >
                      <button
                        class="button button--tight button--tight--inline button--transparent ${textColorsSystemRole[
                          user.systemRole
                        ]}"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            tippyProps: {
                              touch: false,
                              content: "Update System Role",
                            },
                          });
                          
                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "dropdown",
                            tippyProps: {
                              trigger: "click",
                              interactive: true,
                              content: ${html`
                                <div class="dropdown--menu">
                                  $${application.web.locals.helpers.systemRoles.map(
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
                                                : "button--transparent"} ${textColorsSystemRole[
                                                systemRole
                                              ]}"
                                              $${isOnlyAdministrator
                                                ? html`
                                                    type="button"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          theme: "rose",
                                                          trigger: "click",
                                                          content: "You may not update your own role because you’re the only administrator.",
                                                        },
                                                      });
                                                    `}"
                                                  `
                                                : isSelf
                                                ? html`
                                                    type="button"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        elementProperty: "dropdown",
                                                        tippyProps: {
                                                          theme: "rose",
                                                          trigger: "click",
                                                          interactive: true,
                                                          appendTo: document.querySelector("body"),
                                                          content: ${html`
                                                            <form
                                                              key="role--${systemRole}"
                                                              method="PATCH"
                                                              action="${action}"
                                                              css="${css`
                                                                padding: var(
                                                                  --space--2
                                                                );
                                                                display: flex;
                                                                flex-direction: column;
                                                                gap: var(
                                                                  --space--4
                                                                );
                                                              `}"
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
                                                                  css="${css`
                                                                    font-weight: var(
                                                                      --font-weight--bold
                                                                    );
                                                                  `}"
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
                                                          `},  
                                                        },
                                                      });
                                                    `}"
                                                  `
                                                : html``}
                                            >
                                              $${iconsSystemRole[systemRole]}
                                              ${lodash.capitalize(systemRole)}
                                            </button>
                                          </div>
                                        </form>
                                      `
                                  )}
                                </div>
                              `},  
                            },
                          });
                        `}"
                      >
                        $${iconsSystemRole[user.systemRole]}
                        ${lodash.capitalize(user.systemRole)}
                        <i class="bi bi-chevron-down"></i>
                      </button>
                    </div>
                  </div>

                  $${user.biographyPreprocessed !== null
                    ? html`
                        <details class="details">
                          <summary>Biography</summary>
                          $${application.web.locals.partials.content({
                            request,
                            response,
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

  const iconsSystemRole: {
    [systemRole in Application["web"]["locals"]["helpers"]["systemRoles"][number]]: HTML;
  } = {
    none: html`<i class="bi bi-dash-circle"></i>`,
    staff: html`<i class="bi bi-person-badge-fill"></i>`,
    administrator: html`<i class="bi bi-pc-display-horizontal"></i>`,
  };

  const textColorsSystemRole: {
    [systemRole in Application["web"]["locals"]["helpers"]["systemRoles"][number]]: string;
  } = {
    none: "",
    staff: "text--teal",
    administrator: "text--rose",
  };

  application.web.patch<
    { userReference: string },
    HTML,
    {
      role?: Application["web"]["locals"]["helpers"]["systemRoles"][number];
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/users/:userReference", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    const managedUser = application.database.get<{
      id: number;
    }>(
      sql`
        SELECT "id"
        FROM "users"
        WHERE "reference" = ${request.params.userReference}
      `
    );
    if (managedUser === undefined) return next();

    const isSelf = managedUser.id === response.locals.user.id;
    if (
      isSelf &&
      application.database.get<{ count: number }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "users"
          WHERE "systemRole" = 'administrator'
        `
      )!.count === 1
    )
      return next("Validation");

    if (typeof request.body.role === "string") {
      if (
        !application.web.locals.helpers.systemRoles.includes(
          request.body.role
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          UPDATE "users"
          SET "systemRole" = ${request.body.role}
          WHERE "id" = ${managedUser.id}
        `
      );
    }

    application.web.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`User updated successfully.`,
    });
    response.redirect(
      303,
      isSelf
        ? `https://${application.configuration.hostname}`
        : `https://${application.configuration.hostname}/administration/users`
    );
  });

  application.web.get<
    { userReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/administration/courses", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      response.locals.user.systemRole !== "administrator"
    )
      return next();

    const courses = application.database.all<{
      id: number;
      createdAt: string;
      reference: string;
      name: string;
      year: string | null;
      term: string | null;
      institution: string | null;
      code: string | null;
      archivedAt: string | null;
      enrollmentsCount: number;
      conversationsCount: number;
      updatedAt: string;
    }>(
      sql`
        SELECT
          "id",
          "createdAt",
          "reference",
          "name",
          "year",
          "term",
          "institution",
          "code",
          "archivedAt",
          (
            SELECT COUNT(*)
            FROM "enrollments"
            WHERE "courses"."id" = "enrollments"."course"
          ) AS "enrollmentsCount",
          (
            SELECT COUNT(*)
            FROM "conversations"
            WHERE "courses"."id" = "conversations"."course"
          ) AS "conversationsCount",
          coalesce(
            (
              SELECT coalesce("conversations"."updatedAt", "conversations"."createdAt") AS "updatedAt"
              FROM "conversations"
              WHERE "conversations"."course" = "courses"."id"
              ORDER BY coalesce("conversations"."updatedAt", "conversations"."createdAt") DESC
              LIMIT 1
            ),
            "courses"."createdAt"
          ) AS "updatedAt"
        FROM "courses"
        ORDER BY
          "updatedAt" DESC,
          "name" ASC
      `
    );

    response.send(
      layoutAdministration({
        request,
        response,
        head: html`<title>Courses · Administration · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-pc-display-horizontal"></i>
            Administration ·
            <i class="bi bi-people-fill"></i>
            Courses
          </h2>

          $${courses.map(
            (course) => html`
              <div
                key="course/${course.reference}"
                css="${css`
                  display: flex;
                  gap: var(--space--2);
                  align-items: baseline;
                `}"
              >
                <div>
                  <div
                    class="button button--tight"
                    css="${css`
                      cursor: default;
                    `}"
                  >
                    <i class="bi bi-journal-text"></i>
                  </div>
                </div>
                <div>
                  <div class="strong">${course.name}</div>
                  <div
                    class="secondary"
                    css="${css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                    `}"
                  >
                    $${[
                      [course.year, course.term],
                      [course.institution, course.code],
                    ].flatMap((row) => {
                      row = row.filter((element) => element !== null);
                      return row.length === 0
                        ? []
                        : [
                            html`
                              <div>
                                $${row
                                  .map((element) => html`${element!}`)
                                  .join(" · ")}
                              </div>
                            `,
                          ];
                    })}
                    <div
                      css="${css`
                        display: flex;
                        flex-wrap: wrap;
                        column-gap: var(--space--4);
                        row-gap: var(--space--0-5);

                        & > * {
                          display: flex;
                          gap: var(--space--1);
                        }
                      `}"
                    >
                      <div>
                        <i class="bi bi-people"></i>
                        ${String(course.enrollmentsCount)} enrollments
                      </div>
                      <div>
                        <i class="bi bi-chat-text"></i>
                        ${String(course.conversationsCount)} conversations
                      </div>
                      <div>
                        <i class="bi bi-journal-plus"></i>
                        <span>
                          Created
                          <time
                            datetime="${new Date(
                              course.createdAt
                            ).toISOString()}"
                            javascript="${javascript`
                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                            `}"
                          ></time>
                        </span>
                      </div>
                      <div>
                        <i class="bi bi-fire"></i>
                        <span>
                          Updated
                          <time
                            datetime="${new Date(
                              course.updatedAt
                            ).toISOString()}"
                            javascript="${javascript`
                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                            `}"
                          ></time>
                        </span>
                      </div>
                    </div>
                    $${course.archivedAt !== null
                      ? html`
                          <div>
                            <span>
                              $${application.web.locals.partials.courseArchived(
                                {
                                  request,
                                  response,
                                }
                              )}
                              <time
                                datetime="${new Date(
                                  course.archivedAt
                                ).toISOString()}"
                                css="${css`
                                  font-size: var(--font-size--2xs);
                                  line-height: var(--line-height--2xs);
                                `}"
                                javascript="${javascript`
                                  leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                `}"
                              ></time>
                            </span>
                          </div>
                        `
                      : html``}
                  </div>
                </div>
              </div>
            `
          )}
        `,
      })
    );
  });
};
