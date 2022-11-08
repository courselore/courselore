import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Application, ResponseLocalsLogging } from "./index.mjs";

export type ApplicationBase = {
  server: {
    locals: {
      configuration: {
        cookies: express.CookieOptions;
      };
    };
  };
};

export type ResponseLocalsBase = ResponseLocalsLogging & {
  css: ReturnType<typeof localCSS>;
  html: ReturnType<typeof HTMLForJavaScript>;
};

export default async (application: Application): Promise<void> => {
  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(
    (req, res, next) => {
      res.locals.css = localCSS();
      res.locals.html = HTMLForJavaScript();
      if (
        !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method) &&
        req.header("CSRF-Protection") !== "true"
      )
        next("Cross-Site Request Forgery");
      next();
    }
  );

  application.server.use<{}, any, {}, {}, ResponseLocalsBase>(cookieParser());

  application.server.locals.configuration.cookies = {
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
