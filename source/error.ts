import express from "express";
import qs from "qs";
import { HTML, html } from "@leafac/html";
import { BoxLayout, ReportIssueHref } from "./layouts.js";
import { GlobalMiddlewareLocals } from "./global-middlewares.js";
import {
  IsSignedOutMiddleware,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddleware,
  IsSignedInMiddlewareLocals,
} from "./authentication.js";

export default ({
  app,
  baseURL,
  administratorEmail,
  boxLayout,
  reportIssueHref,
  isSignedOutMiddleware,
  isSignedInMiddleware,
}: {
  app: express.Express;
  baseURL: string;
  administratorEmail: string;
  boxLayout: BoxLayout;
  reportIssueHref: ReportIssueHref;
  isSignedOutMiddleware: IsSignedOutMiddleware;
  isSignedInMiddleware: IsSignedInMiddleware;
}): void => {
  app.all<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "*",
    ...isSignedOutMiddleware,
    (req, res) => {
      res.redirect(
        `${baseURL}/sign-in${qs.stringify(
          {
            redirect: req.originalUrl,
          },
          { addQueryPrefix: true }
        )}`
      );
    }
  );

  app.all<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "*",
    ...isSignedInMiddleware,
    (req, res) => {
      if (typeof req.query.redirect === "string")
        return res.redirect(`${baseURL}${req.query.redirect}`);
      res.status(404).send(
        boxLayout({
          req,
          res,
          head: html`<title>404 Not Found · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-question-diamond"></i>
              404 Not Found
            </h2>
            <p>
              If you think there should be something here, please contact your
              course staff or the system administrator at
              <a href="${reportIssueHref}" target="_blank" class="link"
                >${administratorEmail}</a
              >.
            </p>
          `,
        })
      );
    }
  );

  app.use<{}, HTML, {}, {}, GlobalMiddlewareLocals>(((err, req, res, next) => {
    console.error(`${new Date().toISOString()}\tERROR\t${err}`);
    const isCSRF = err.code === "EBADCSRFTOKEN";
    const isValidation = err === "validation";
    const message = isCSRF
      ? "Cross-Site"
      : isValidation
      ? "Validation"
      : "Server";
    res.status(isCSRF ? 403 : isValidation ? 422 : 500).send(
      boxLayout({
        req,
        res,
        head: html`<title>${message} Error · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-bug"></i>
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
                  <a href="${reportIssueHref}" target="_blank" class="link"
                    >${administratorEmail}</a
                  >.
                </p>
              `
            : html`
                <p>
                  This is an issue in Courselore, please report to the system
                  administrator at
                  <a href="${reportIssueHref}" target="_blank" class="link"
                    >${administratorEmail}</a
                  >.
                </p>
              `}
        `,
      })
    );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, GlobalMiddlewareLocals>);
};
