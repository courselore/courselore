import express from "express";
import qs from "qs";
import { HTML, html } from "@leafac/html";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./index.js";

export default (app: Courselore): void => {
  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isSignedOut,
    (req, res) => {
      res.redirect(
        303,
        `https://${app.locals.options.host}/sign-in${qs.stringify(
          { redirect: req.originalUrl.slice(1) },
          { addQueryPrefix: true }
        )}`
      );
    }
  );

  app.all<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      if (typeof req.query.redirect === "string")
        return res.redirect(
          303,
          `https://${app.locals.options.host}/${req.query.redirect}`
        );
      res.status(404).send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>404 Not Found · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-question-diamond-fill"></i>
              404 Not Found
            </h2>
            <p>
              If you think there should be something here, please contact your
              course staff or the system administrator at
              <a
                href="${app.locals.partials.reportIssueHref}"
                target="_blank"
                class="link"
                >${app.locals.options.administratorEmail}</a
              >.
            </p>
          `,
        })
      );
    }
  );

  app.use<{}, HTML, {}, {}, BaseMiddlewareLocals>(((err, req, res, next) => {
    const isCSRF = err.code === "EBADCSRFTOKEN";
    const isValidation = err === "validation";
    const message = isCSRF
      ? "Cross-Site"
      : isValidation
      ? "Validation"
      : "Server";
    res.status(isCSRF ? 403 : isValidation ? 422 : 500).send(
      app.locals.layouts.box({
        req,
        res,
        head: html`<title>${message} Error · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-bug-fill"></i>
            ${message} Error
          </h2>
          $${isCSRF
            ? html`
                <p>
                  This request doesn’t appear to have come from Courselore.
                  Please try again.
                </p>
                <p>
                  If the issue persists, please report to the system
                  administrator at
                  <a
                    href="${app.locals.partials.reportIssueHref}"
                    target="_blank"
                    class="link"
                    >${app.locals.options.administratorEmail}</a
                  >.
                </p>
              `
            : html`
                <p>
                  This is an issue in Courselore, please report to the system
                  administrator at
                  <a
                    href="${app.locals.partials.reportIssueHref}"
                    target="_blank"
                    class="link"
                    >${app.locals.options.administratorEmail}</a
                  >.
                </p>
              `}
        `,
      })
    );
    console.log(`${new Date().toISOString()}\tERROR\n${err}`);
  }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>);
};
