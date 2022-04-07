import express from "express";
import { Courselore, BaseMiddlewareLocals } from "./index.js";

export interface EventSourceLocals {
  eventDestinations: Set<{
    reference: string;
    req: express.Request;
    res: express.Response;
  }>;
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

export default (app: Courselore): void => {
  app.locals.eventDestinations = new Set();
  app.locals.middlewares.eventSource = [
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
      res.once("close", () => {
        app.locals.eventDestinations.delete(eventDestination);
      });
      res.type("text/event-stream").write(":\n\n");
      app.locals.eventDestinations.add(eventDestination);
      console.log(
        `${new Date().toISOString()}\tSSE\topen\t${req.ip}\t${
          eventDestination.reference
        }\t\t\t${req.originalUrl}`
      );
    },
  ];
};
