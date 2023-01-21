import timers from "node:timers/promises";
import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  server: {
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
    Application["server"]["locals"]["ResponseLocals"]["Logging"]
  >((request, response, next) => {
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
    Application["server"]["locals"]["ResponseLocals"]["Logging"]
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
    Application["server"]["locals"]["ResponseLocals"]["Logging"]
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
    Application["server"]["locals"]["ResponseLocals"]["Logging"]
  >(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
};