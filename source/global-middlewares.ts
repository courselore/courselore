import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
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
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.css = localCSS();
    res.locals.html = HTMLForJavaScript();
    next();
  });

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(cookieParser());

  app.locals.options.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

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
