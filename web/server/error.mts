import express from "express";
import qs from "qs";
import { HTML, html } from "@leafac/html";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./index.mjs";

export default async (app: Courselore): Promise<void> => {
  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...app.locals.middlewares.isSignedOut,
    (req, res) => {
      res.redirect(
        303,
        `https://${app.locals.options.hostname}/sign-in${qs.stringify(
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
          `https://${app.locals.options.hostname}/${req.query.redirect}`
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

  app.use(((err, req, res, next) => {
    if (!["Cross-Site Request Forgery", "Validation"].includes(err))
      err = "Server";
    res
      .status(
        err === "Cross-Site Request Forgery"
          ? 403
          : err === "Validation"
          ? 422
          : 500
      )
      .send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>${err} Error · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-bug-fill"></i>
              ${err} Error
            </h2>

            <p>
              ${err === "Cross-Site Request Forgery"
                ? "This request doesn’t appear to have come from Courselore. Please try again. If the issue persists, please report to the system administrator at"
                : "This is an issue in Courselore. Please report to the system administrator at"}
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
  }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>);
};
