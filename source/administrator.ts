import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { sql } from "@leafac/sqlite";

import { Courselore, IsSignedInMiddlewareLocals } from "./index.js";

export type CanCreateCourses = typeof canCreateCourseses[number];
export const canCreateCourseses = [
  "anyone",
  "staff-and-administrators",
  "administrators",
] as const;

export type IsAdministratorMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  IsAdministratorMiddlewareLocals
>[];
export interface IsAdministratorMiddlewareLocals
  extends IsSignedInMiddlewareLocals {}

export type AdministratorLayout = ({
  req,
  res,
  head,
  body,
}: {
  req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
  res: express.Response<any, IsSignedInMiddlewareLocals>;
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

  app.locals.middlewares.isAdministrator = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.user.administratorAt !== null) {
        return next();
      }
      next("route");
    },
  ];

  app.locals.layouts.administratorPanel = ({ req, res, head, body }) =>
    app.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-pc-display-horizontal"></i>
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
          href="${app.locals.options.baseURL}/administrator-panel/roles"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administrator-panel/roles"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/administrator-panel/roles")
              ? "bi-people-fill"
              : "bi-people"}"
          ></i>
          Roles
        </a>
        <a
          href="${app.locals.options.baseURL}/administrator-panel/statistics"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/administrator-panel/statistics"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/administrator-panel/statistics")
              ? "bi-bar-chart-fill"
              : "bi-bar-chart"}"
          ></i>
          Statistics
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
              <i class="bi bi-pc-display-horizontal"></i>
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
      canCreateCourses: CanCreateCourses;
      demonstration: string;
      administratorEmail: string;
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
        typeof req.body.administratorEmail !== "string" ||
        req.body.administratorEmail.match(app.locals.helpers.emailRegExp) ===
          null
      )
        return next("validation");

      app.locals.options.canCreateCourses = req.body.canCreateCourses;
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${JSON.stringify(app.locals.options.canCreateCourses)}
          WHERE "key" = 'canCreateCourses'
        `
      );

      app.locals.options.demonstration = req.body.demonstration === "on";
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${JSON.stringify(
            app.locals.options.demonstration ? new Date().toISOString() : null
          )}
          WHERE "key" = 'demonstrationAt'
        `
      );

      app.locals.options.administratorEmail = req.body.administratorEmail;
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${JSON.stringify(app.locals.options.administratorEmail)}
          WHERE "key" = 'administratorEmail'
        `
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

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administrator-panel/roles",
    ...app.locals.middlewares.isAdministrator,
    (req, res) => {
      res.send(
        app.locals.layouts.administratorPanel({
          req,
          res,
          head: html`<title>
            Roles · Administrator Panel · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-pc-display-horizontal"></i>
              Administrator Panel ·
              <i class="bi bi-people"></i>
              Roles
            </h2>
          `,
        })
      );
    }
  );

  app.get<{}, HTML, {}, {}, IsAdministratorMiddlewareLocals>(
    "/administrator-panel/statistics",
    ...app.locals.middlewares.isAdministrator,
    (req, res) => {
      res.send(
        app.locals.layouts.administratorPanel({
          req,
          res,
          head: html`<title>
            Statistics · Administrator Panel · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-pc-display-horizontal"></i>
              Administrator Panel ·
              <i class="bi bi-bar-chart"></i>
              Statistics
            </h2>
          `,
        })
      );
    }
  );
};
