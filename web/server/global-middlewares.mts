import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { sql } from "@leafac/sqlite";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Courselore, UserSystemRolesWhoMayCreateCourses } from "./index.mjs";

export type GlobalMiddlewaresOptions = {
  cookies: express.CookieOptions;
};

export type BaseLocals = {
  loggingStartTime: bigint;
  css: ReturnType<typeof localCSS>;
  html: ReturnType<typeof HTMLForJavaScript>;
  administrationOptions: {
    latestVersion: string;
    userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
  };
  liveUpdatesNonce: string | undefined;
};

export default async (app: Courselore): Promise<void> => {
  app.use<{}, any, {}, {}, BaseLocals>((req, res, next) => {
    res.locals.css = localCSS();
    res.locals.html = HTMLForJavaScript();
    res.locals.administrationOptions = app.locals.database.get<{
      latestVersion: string;
      userSystemRolesWhoMayCreateCourses: UserSystemRolesWhoMayCreateCourses;
    }>(
      sql`
        SELECT "latestVersion", "userSystemRolesWhoMayCreateCourses"
        FROM "administrationOptions"
      `
    )!;
    if (
      !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method) &&
      req.header("CSRF-Protection") !== "true"
    )
      next("Cross-Site Request Forgery");
    next();
  });

  app.use<{}, any, {}, {}, BaseLocals>(cookieParser());
  app.locals.options.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  app.use<{}, any, {}, {}, BaseLocals>(express.urlencoded({ extended: true }));

  app.use<{}, any, {}, {}, BaseLocals>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
};
