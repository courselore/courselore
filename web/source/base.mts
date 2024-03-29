import timers from "node:timers/promises";
import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  web: {
    locals: {
      configuration: {
        cookies: express.CookieOptions;
      };
      ResponseLocals: {
        Base: Application["web"]["locals"]["ResponseLocals"]["Logging"] & {
          administrationOptions: {
            latestVersion: string;
            privateKey: string;
            certificate: string;
            userSystemRolesWhoMayCreateCourses: Application["web"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
          };
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  if (
    application.configuration.environment === "development" &&
    application.configuration.slow
  )
    application.web.use<{}, any, {}, {}, {}>(
      asyncHandler(async (request, response, next) => {
        await timers.setTimeout(5 * 1000, undefined, { ref: false });
        next();
      }),
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
    sameSite: "none",
  };

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Logging"]
  >(express.urlencoded({ extended: true }));

  application.webEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true }),
  );

  application.workerEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true }),
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
    }),
  );

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["Base"]
  >((request, response, next) => {
    response.locals.administrationOptions =
      application.database.get<{
        latestVersion: string;
        privateKey: string;
        certificate: string;
        userSystemRolesWhoMayCreateCourses: Application["web"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
      }>(
        sql`
          SELECT
            "latestVersion",
            "privateKey",
            "certificate",
            "userSystemRolesWhoMayCreateCourses"
          FROM "administrationOptions"
        `,
      ) ??
      (() => {
        throw new Error("Failed to get ‘administrationOptions’.");
      })();

    if (
      application.configuration.environment === "development" &&
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method)
    )
      response.locals.log(
        "REQUEST BODY",
        JSON.stringify(request.body, undefined, 2),
      );

    if (
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(request.method) &&
      request.header("CSRF-Protection") !== "true" &&
      !(
        request.originalUrl.startsWith("/saml/") &&
        (request.originalUrl.endsWith("/assertion-consumer-service") ||
          request.originalUrl.endsWith("/single-logout-service"))
      )
    )
      return next("Cross-Site Request Forgery");

    next();
  });
};
