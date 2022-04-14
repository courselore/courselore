import express from "express";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdatesEventDestinations: Map<
    number,
    Set<{
      createdAt: Date;
      token: string;
      req?: express.Request<
        {},
        any,
        {},
        {},
        IsEnrolledInCourseMiddlewareLocals
      >;
      res?: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    }>
  >;
}

export type LiveUpdatesMiddleware = express.RequestHandler<
  {},
  any,
  {},
  { liveUpdatesToken?: string; [key: string]: any },
  LiveUpdatesMiddlewareLocals
>[];
export interface LiveUpdatesMiddlewareLocals
  extends BaseMiddlewareLocals,
    IsEnrolledInCourseMiddlewareLocals {
  liveUpdatesToken: string;
}

export default (app: Courselore): void => {
  app.locals.liveUpdatesEventDestinations = new Map();
  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        if (res.locals.liveUpdatesToken === undefined) {
          const token = Math.random().toString(36).slice(2);
          const eventDestination = { createdAt: new Date(), token };
          res.locals.liveUpdatesToken = token;
          if (
            app.locals.liveUpdatesEventDestinations
              .get(res.locals.course.id)
              ?.add(eventDestination) === undefined
          )
            app.locals.liveUpdatesEventDestinations.set(
              res.locals.course.id,
              new Set([eventDestination])
            );
        }
        return next();
      }
      if (
        typeof req.query.liveUpdatesToken !== "string" ||
        req.query.liveUpdatesToken.trim() === ""
      )
        return next("validation");
      res.locals.liveUpdatesToken = req.query.liveUpdatesToken;
      const liveUpdatesEventDestination = {
        req,
        res,
      };
      res.once("close", () => {
        app.locals.liveUpdatesEventDestinations.delete(
          liveUpdatesEventDestination
        );
      });
      res.type("text/event-stream").write(":\n\n");
      res.setHeader = (name, value) => res;
      res.send = (body) => {
        res.write(
          `event: liveupdate\ndata:${body.replaceAll("\n", "\ndata:")}\n\n`
        );
        return res;
      };
      app.locals.liveUpdatesEventDestinations.add(liveUpdatesEventDestination);
      console.log(
        `${new Date().toISOString()}\tSSE\topen\t${req.ip}\t${
          res.locals.liveUpdatesToken
        }\t\t\t${req.originalUrl}`
      );
    },
  ];
};
