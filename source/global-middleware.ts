import express from "express";
import methodOverride from "method-override";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import url from "node:url";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";

export interface BaseMiddlewareLocals {
  localCSS: ReturnType<typeof localCSS>;
  HTMLForJavaScript: ReturnType<typeof HTMLForJavaScript>;
}
export default ({
  app,
  baseURL,
}: {
  app: express.Express;
  baseURL: string;
}): { cookieOptions: express.CookieOptions } => {
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.localCSS = localCSS();
    res.locals.HTMLForJavaScript = HTMLForJavaScript();
    next();
  });
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>(
    express.static(url.fileURLToPath(new URL("../static", import.meta.url)))
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
  return { cookieOptions };
};
