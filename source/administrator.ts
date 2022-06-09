import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { sql } from "@leafac/sqlite";

import { Courselore, IsSignedInMiddlewareLocals } from "./index.js";

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
              <div
                css="${res.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="canCreateCourses"
                    $${app.locals.options.canCreateCourses
                      ? html`checked`
                      : html``}
                    class="input--checkbox"
                  />
                  Allow users to create new courses
                </label>
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
      canCreateCourses: string;
      demonstration: string;
      administratorEmail?: string;
    },
    {},
    IsAdministratorMiddlewareLocals
  >(
    "/administrator-panel/configuration",
    ...app.locals.middlewares.isAdministrator,
    (req, res, next) => {
      if (
        typeof req.body.administratorEmail !== "string" ||
        req.body.administratorEmail.match(app.locals.helpers.emailRegExp) === null
      )
        return next("validation");

      app.locals.options.canCreateCourses = (req.body.canCreateCourses === "on");
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${
            JSON.stringify(app.locals.options.canCreateCourses ? new Date().toISOString() : null)
          }
          WHERE "key" = 'canCreateCoursesAt'
        `
      );
      
      app.locals.options.demonstration = (req.body.demonstration === "on");
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${
            JSON.stringify(app.locals.options.demonstration ? new Date().toISOString() : null)
          }
          WHERE "key" = 'demonstrationAt'
        `
      );
      
      app.locals.options.administratorEmail = req.body.administratorEmail;
      app.locals.database.run(
        sql`
          UPDATE "configurations"
          SET "value" = ${
            JSON.stringify(app.locals.options.administratorEmail)
          }
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
              <i class="bi bi-tools"></i>
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
