import timers from "node:timers/promises";
import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  web: {
    locals: {
      configuration: {
        cookies: express.CookieOptions;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  if (
    process.env.SLOW === "true" &&
    application.configuration.environment === "development"
  )
    application.web.use<{}, any, {}, {}, {}>(
      asyncHandler(async (request, response, next) => {
        await timers.setTimeout(5 * 1000, undefined, { ref: false });
        next();
      })
    );

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Logging"]
  >(cookieParser());

  application.web.locals.configuration.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Logging"]
  >(express.urlencoded({ extended: true }));

  application.webEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.workerEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Logging"]
  >(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Logging"]
  >((request, response, next) => {
    if (
      !request.originalUrl.startsWith("/saml/") &&
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method) &&
      request.header("CSRF-Protection") !== "true"
    )
      return next("Cross-Site Request Forgery");

    next();
  });
};
