import express from "express";
import { BaseMiddlewareLocals } from "./global-middleware.js";

type EventSourceMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  EventSourceMiddlewareLocals
>[];
export interface EventSourceMiddlewareLocals extends BaseMiddlewareLocals {
  eventSource: boolean;
}

export default (): {
  eventSourceMiddleware: EventSourceMiddleware;
} => {
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

  return { eventSourceMiddleware };
};
