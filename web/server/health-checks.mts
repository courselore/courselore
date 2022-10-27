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
};
