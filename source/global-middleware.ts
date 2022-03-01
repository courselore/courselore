import url from "node:url";
import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";

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

export interface BaseMiddlewareLocals {
  localCSS: ReturnType<typeof localCSS>;
  HTMLForJavaScript: ReturnType<typeof HTMLForJavaScript>;
}

export default ({
  app,
  dataDirectory,
  baseURL,
  hotReload,
}: {
  app: express.Express;
  dataDirectory: string;
  baseURL: string;
  hotReload: boolean;
}): {
  cookieOptions: express.CookieOptions;
} => {
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
    express.static(dataDirectory, {
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

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(methodOverride("_method"));

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(cookieParser());
  const cookieOptions = {
    domain: new URL(baseURL).hostname,
    httpOnly: true,
    path: new URL(baseURL).pathname,
    sameSite: "lax",
    secure: true,
  } as const;

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
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60,
      },
    })
  );

  if (hotReload)
    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/hot-reload",
      (req, res) => {
        res.type("text/event-stream").write(":\n\n");
        console.log(`${new Date().toISOString()}\tHOT RELOAD\t${req.ip}`);
      }
    );

  return { cookieOptions };
};
