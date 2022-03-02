import url from "node:url";
import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Courselore } from "./index.js";

export interface GlobalMiddlewareOptions {
  cookies: express.CookieOptions;
}

export interface GlobalMiddlewareLocals {
  localCSS: ReturnType<typeof localCSS>;
  HTMLForJavaScript: ReturnType<typeof HTMLForJavaScript>;
}

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
];

export default (app: Courselore): void => {
  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>((req, res, next) => {
    res.locals.localCSS = localCSS();
    res.locals.HTMLForJavaScript = HTMLForJavaScript();
    next();
  });

  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(
    express.static(url.fileURLToPath(new URL("../static", import.meta.url)))
  );
  app.get<{}, any, {}, {}, GlobalMiddlewareLocals>(
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

  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(methodOverride("_method"));

  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(cookieParser());
  const baseURL = new URL(app.locals.options.baseURL);
  app.locals.options.cookies = {
    domain: baseURL.hostname,
    httpOnly: true,
    path: baseURL.pathname,
    sameSite: "lax",
    secure: true,
  } as const;

  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(
    express.urlencoded({ extended: true })
  );
  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(
    expressFileUpload({
      createParentPath: true,
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  );

  app.use<{}, any, {}, {}, GlobalMiddlewareLocals>(
    csurf({
      cookie: {
        ...app.locals.options.cookies,
        maxAge: 30 * 24 * 60 * 60,
      },
    })
  );

  if (app.locals.options.hotReload)
    app.get<{}, any, {}, {}, GlobalMiddlewareLocals>(
      "/hot-reload",
      (req, res) => {
        res.type("text/event-stream").write(":\n\n");
        console.log(`${new Date().toISOString()}\tHOT RELOAD\t${req.ip}`);
      }
    );
};
