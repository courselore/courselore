import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { sql } from "@leafac/sqlite";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import {
  Application,
  ResponseLocalsLogging,
  UserSystemRolesWhoMayCreateCourses,
} from "./index.mjs";

export type ApplicationBase = {
  server: {
    locals: {
      cookies: express.CookieOptions;
    };
  };
};

export type ResponseLocalsBase = ResponseLocalsLogging & {
  css: ReturnType<typeof localCSS>;
  html: ReturnType<typeof HTMLForJavaScript>;
  administrationOptions: {
    latestVersion: string;
    userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
  };
};

export default async (application: Application): Promise<void> => {
  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(
    (req, res, next) => {
      res.locals.css = localCSS();
      res.locals.html = HTMLForJavaScript();
      res.locals.administrationOptions =
        application.database.get<{
          latestVersion: string;
          userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
        }>(
          sql`
            SELECT "latestVersion", "userSystemRolesWhoMayCreateCourses"
            FROM "administrationOptions"
          `
        ) ??
        (() => {
          throw new Error("Failed to fetch ‘administrationOptions’.");
        })();
      if (
        !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method) &&
        req.header("CSRF-Protection") !== "true"
      )
        next("Cross-Site Request Forgery");
      next();
    }
  );

  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(cookieParser());

  application.server.locals.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(
    express.urlencoded({ extended: true })
  );

  application.serverEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.workerEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
};
