import express from "express";
import { Courselore, BaseMiddlewareLocals } from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdatesEventDestinations: Set<{
    token: string;
    req: express.Request;
    res: express.Response;
  }>;
}

export type LiveUpdatesMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  LiveUpdatesMiddlewareLocals
>[];
export interface LiveUpdatesMiddlewareLocals extends BaseMiddlewareLocals {
  liveUpdatesToken: string;
}

export default (app: Courselore): void => {
  app.locals.liveUpdatesEventDestinations = new Set();
  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        res.locals.liveUpdatesToken = Math.random().toString(36).slice(2);
        return next();
      }
      const liveUpdatesEventDestination = {
        token: "TODO",
        req,
        res,
      };
      res.once("close", () => {
        app.locals.liveUpdatesEventDestinations.delete(
          liveUpdatesEventDestination
        );
      });
      res.type("text/event-stream").write(":\n\n");
      app.locals.liveUpdatesEventDestinations.add(liveUpdatesEventDestination);
      console.log(
        `${new Date().toISOString()}\tSSE\topen\t${req.ip}\t${
          liveUpdatesEventDestination.token
        }\t\t\t${req.originalUrl}`
      );
    },
  ];
};
