import url from "node:url";
import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Courselore } from "./index.js";

export interface GlobalMiddlewaresOptions {
  cookies: express.CookieOptions;
}

export interface BaseMiddlewareLocals {
  localCSS: ReturnType<typeof localCSS>;
  HTMLForJavaScript: ReturnType<typeof HTMLForJavaScript>;
}

export type UserFileExtensionsWhichMayBeShownInBrowser =
  typeof userFileExtensionsWhichMayBeShownInBrowser[number];
export const userFileExtensionsWhichMayBeShownInBrowser = [
  "png",
  "svg",
  "jpg",
  "jpeg",
  "gif",
  "mp3",
  "mp4",
  "m4v",
  "ogg",
  "mov",
  "mpeg",
  "avi",
  "pdf",
  "txt",
] as const;

export default (app: Courselore): void => {
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.localCSS = localCSS();
    res.locals.HTMLForJavaScript = HTMLForJavaScript();
    next();
  });

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.static(url.fileURLToPath(new URL("../static", import.meta.url)))
  );
  app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
    "/files/*",
    express.static(app.locals.options.dataDirectory, {
      index: false,
      dotfiles: "allow",
      immutable: true,
      maxAge: 60 * 24 * 60 * 60 * 1000,
      setHeaders: (res, path, stat) => {
        if (
          !userFileExtensionsWhichMayBeShownInBrowser.some((extension) =>
            path.toLowerCase().endsWith(`.${extension}`)
          )
        )
          res.attachment();
      },
    })
  );

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(methodOverride("_method"), ((
    req,
    res,
    next
  ) => {
    delete req.query._method;
    next();
  }) as express.RequestHandler<{}, any, {}, { _method?: "string" }, BaseMiddlewareLocals>);

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(cookieParser());

  app.locals.options.cookies = (() => {
    const baseURL = new URL(app.locals.options.baseURL);
    return {
      domain: baseURL.hostname,
      httpOnly: true,
      path: baseURL.pathname,
      sameSite: "lax",
      secure: true,
    };
  })();

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.urlencoded({ extended: true })
  );
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    csurf({
      cookie: {
        ...app.locals.options.cookies,
        maxAge: 30 * 24 * 60 * 60,
      },
    })
  );

  if (app.locals.options.liveReload)
    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/live-reload",
      (req, res) => {
        res.type("text/event-stream").write(":\n\n");
        console.log(`${new Date().toISOString()}\tLIVE RELOAD\t${req.ip}`);
      }
    );
};
