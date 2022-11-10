import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  server: {
    locals: {
      configuration: {
        cookies: express.CookieOptions;
      };
      ResponseLocals: {
        Base: Application["server"]["locals"]["ResponseLocals"]["Logging"] & {
          css: ReturnType<typeof localCSS>;
          html: ReturnType<typeof HTMLForJavaScript>;
        };
      }
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.use<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(
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

  application.server.use<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(cookieParser());

  application.server.locals.configuration.cookies = {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "lax",
  };

  application.server.use<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(
    express.urlencoded({ extended: true })
  );

  application.serverEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.workerEvents.use<{}, any, {}, {}, {}>(
    express.urlencoded({ extended: true })
  );

  application.server.use<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );
};
