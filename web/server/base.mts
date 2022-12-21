import timers from "node:timers/promises";
import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import { localCSS } from "@leafac/css";
import { localHTMLForJavaScript, localJavaScript } from "@leafac/javascript";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  server: {
    locals: {
      ResponseLocals: {
        Base: Application["server"]["locals"]["ResponseLocals"]["Logging"] & {
          html: ReturnType<typeof localHTMLForJavaScript>;
          css: ReturnType<typeof localCSS>;
          javascript: ReturnType<typeof localJavaScript>;
        };
      };

      configuration: {
        cookies: express.CookieOptions;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  if (false && application.configuration.environment === "development")
    application.server.use<{}, any, {}, {}, {}>(
      asyncHandler(async (request, response, next) => {
        await timers.setTimeout(5 * 1000, undefined, { ref: false });
        next();
      })
    );

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >((request, response, next) => {
    response.locals.html = localHTMLForJavaScript();
    response.locals.css = localCSS();
    response.locals.javascript = localJavaScript();

    if (
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method) &&
      request.header("CSRF-Protection") !== "true"
    )
      next("Cross-Site Request Forgery");

    next();
  });

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >(cookieParser());

  application.server.locals.configuration.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >(express.urlencoded({ extended: true }));

  application.serverEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.workerEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
};
