import express from "express";
import { Courselore, baseMiddlewareLocals } from "./index.js";

export interface eventSourceLocals {
  eventDestinations: Set<{
    reference: string;
    req: express.Request;
    res: express.Response;
  }>;
}

export type eventSourceMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  eventSourceMiddlewareLocals
>[];
export interface eventSourceMiddlewareLocals extends baseMiddlewareLocals {
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
      app.locals.eventDestinations.add(eventDestination);
      res.once("close", () => {
        app.locals.eventDestinations.delete(eventDestination);
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
};
