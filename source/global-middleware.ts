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

export type EventSourceMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  EventSourceMiddlewareLocals
>[];
export interface EventSourceMiddlewareLocals extends BaseMiddlewareLocals {
  eventSource: boolean;
}

export default ({
  app,
  baseURL,
}: {
  app: express.Express;
  baseURL: string;
}): {
  cookieOptions: express.CookieOptions;
  eventSourceMiddleware: EventSourceMiddleware;
} => {
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

  const eventDestinations = new Set<{
    reference: string;
    req: express.Request;
    res: express.Response;
  }>();
  const eventSourceMiddleware: EventSourceMiddleware = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        res.locals.eventSource = true;
        return next();
      }
      const eventDestination = {
        reference: Math.random().toString(36).slice(2),
        req,
        res,
      };
      eventDestinations.add(eventDestination);
      res.once("close", () => {
        eventDestinations.delete(eventDestination);
      });
      res
        .type("text/event-stream")
        .write(`event: reference\ndata: ${eventDestination.reference}\n\n`);
      console.log(
        `${new Date().toISOString()}\tSSE\topen\t${req.ip}\t${
          eventDestination.reference
        }\t\t\t${req.originalUrl}`
      );
    },
  ];

  return { cookieOptions, eventSourceMiddleware };
};
