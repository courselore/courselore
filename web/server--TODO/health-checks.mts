import timers from "node:timers/promises";
import express from "express";
import { Courselore, BaseLocals } from "./index.mjs";

export default async (app: Courselore): Promise<void> => {
  const liveConnections = new Set<{
    req: express.Request<{}, any, {}, {}, BaseLocals>;
    res: express.Response<any, BaseLocals>;
  }>();
  app.get<{}, any, {}, {}, BaseLocals>("/live-connection", (req, res) => {
    const connection = { req, res };
    liveConnections.add(connection);
    res.header("Version", app.locals.options.version);
    res.contentType("text/plain");
    const heartbeatAbortController = new AbortController();
    (async () => {
      while (true) {
        res.write("\n");
        try {
          await timers.setTimeout(15 * 1000, undefined, {
            ref: false,
            signal: heartbeatAbortController.signal,
          });
        } catch {
          break;
        }
      }
    })();
    res.once("close", () => {
      liveConnections.delete(connection);
      heartbeatAbortController.abort();
      console.log(
        `${new Date().toISOString()}\t${app.locals.options.processType}\t${
          req.ip
        }\t${req.method}\t${req.originalUrl}\t${res.statusCode}\t${
          (process.hrtime.bigint() - res.locals.loggingStartTime) / 1_000_000n
        }ms`
      );
    });
  });
  if (app.locals.options.processType === "server")
    app.once("stop", () => {
      for (const { req, res } of liveConnections) res.end();
    });

  app.get<{}, any, {}, {}, BaseLocals>("/health", (req, res) => {
    res.json({ version: app.locals.options.version });
  });

  if (app.locals.options.environment === "development") {
    app.get<{}, any, {}, {}, BaseLocals>(
      "/errors/validation",
      (req, res, next) => {
        next("Validation");
      }
    );

    app.get<{}, any, {}, {}, BaseLocals>(
      "/errors/cross-site-request-forgery",
      (req, res, next) => {
        next("Cross-Site Request Forgery");
      }
    );

    app.get<{}, any, {}, {}, BaseLocals>("/errors/exception", (req, res) => {
      throw new Error("Exception");
    });

    app.get<{}, any, {}, {}, BaseLocals>("/errors/crash", (req, res) => {
      setTimeout(() => {
        throw new Error("Crash");
      });
    });
  }
};
