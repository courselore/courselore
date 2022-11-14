import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Application } from "./index.mjs";

export type ApplicationBase = {
  server: {
    locals: {
      ResponseLocals: {
        Base: Application["server"]["locals"]["ResponseLocals"]["Logging"] & {
          css: ReturnType<typeof localCSS>;
          html: ReturnType<typeof HTMLForJavaScript>;
        };
      };

      configuration: {
        cookies: express.CookieOptions;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >((request, response, next) => {
    response.locals.css = localCSS();
    response.locals.html = HTMLForJavaScript();

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
