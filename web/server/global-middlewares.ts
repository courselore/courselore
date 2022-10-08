import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { html } from "@leafac/html";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Courselore } from "./index.js";

export interface GlobalMiddlewaresOptions {
  cookies: express.CookieOptions;
}

export interface BaseMiddlewareLocals {
  loggingStartTime: bigint;
  css: ReturnType<typeof localCSS>;
  html: ReturnType<typeof HTMLForJavaScript>;
  liveUpdatesNonce: string | undefined;
}

export default (app: Courselore): void => {
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(cookieParser());

  app.locals.options.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.css = localCSS();
    res.locals.html = HTMLForJavaScript();

    if (
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method) &&
      req.header("CSRF-Protection") !== "true"
    ) {
      res.status(403).send(
        app.locals.layouts.box({
          req,
          res,
          head: html`<title>
            Cross-Site Request Forgery Error · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-bug-fill"></i>
              Cross-Site Request Forgery Error
            </h2>
            <p>
              This request doesn’t appear to have come from Courselore. Please
              try again.
            </p>
            <p>
              If the issue persists, please report to the system administrator
              at
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
      console.log(
        `${new Date().toISOString()}\tERROR\nCross-Site Request Forgery`
      );
    }

    next();
  });

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.urlencoded({ extended: true })
  );

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );

  app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
    "/live-connection",
    (req, res) => {
      res.header("Version", app.locals.options.version);
      res.contentType("text/plain");
      let heartbeatTimeout: NodeJS.Timeout;
      (function heartbeat() {
        res.write("\n");
        heartbeatTimeout = setTimeout(heartbeat, 15 * 1000);
      })();
      res.once("close", () => {
        clearTimeout(heartbeatTimeout);
      });
    }
  );
};
