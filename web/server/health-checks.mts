import express from "express";
import { Courselore, BaseMiddlewareLocals } from "./index.mjs";

export default async (app: Courselore): Promise<void> => {
  const liveConnections = new Set<{
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
  }>();
  app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
    "/live-connection",
    (req, res) => {
      const connection = { req, res };
      liveConnections.add(connection);
      res.header("Version", app.locals.options.version);
      res.contentType("text/plain");
      let heartbeatTimeout: NodeJS.Timeout;
      (function heartbeat() {
        res.write("\n");
        heartbeatTimeout = setTimeout(heartbeat, 15 * 1000).unref();
      })();
      res.once("close", () => {
        liveConnections.delete(connection);
        clearTimeout(heartbeatTimeout);
      });
    }
  );
  app.once("close", () => {
    for (const { req, res } of liveConnections) res.end();
  });

  app.get<{}, any, {}, {}, BaseMiddlewareLocals>("/health", (req, res) => {
    res.json({ version: app.locals.options.version });
  });

  if (app.locals.options.environment === "development") {
    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/errors/validation",
      (req, res, next) => {
        next("Validation");
      }
    );

    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/errors/cross-site-request-forgery",
      (req, res, next) => {
        next("Cross-Site Request Forgery");
      }
    );

    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/errors/exception",
      (req, res) => {
        throw new Error("Exception");
      }
    );

    app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
      "/errors/crash",
      (req, res) => {
        setTimeout(() => {
          throw new Error("Crash");
        });
      }
    );
  }
};
