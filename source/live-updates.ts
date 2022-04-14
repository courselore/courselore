import express from "express";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdatesEventDestinations: Set<{
    createdAt: Date;
    token: string;
    courseId: number;
    req?: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res?: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  }>;
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
  app.locals.liveUpdatesEventDestinations = new Set();
  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      if (!req.header("accept")?.includes("text/event-stream")) {
        if (res.locals.liveUpdatesToken === undefined) {
          const token = Math.random().toString(36).slice(2);
          res.locals.liveUpdatesToken = token;
          app.locals.liveUpdatesEventDestinations.add({
            createdAt: new Date(),
            token,
            courseId: res.locals.course.id,
          });
        }
        return next();
      }
      if (
        typeof req.query.liveUpdatesToken !== "string" ||
        req.query.liveUpdatesToken.trim() === ""
      )
        return next("validation");
      const liveUpdatesEventDestination = [
        ...app.locals.liveUpdatesEventDestinations,
      ].find(
        (liveUpdatesEventDestination) =>
          liveUpdatesEventDestination.token === req.query.liveUpdatesToken
      );
      if (
        liveUpdatesEventDestination === undefined ||
        liveUpdatesEventDestination.courseId !== res.locals.course.id ||
        liveUpdatesEventDestination.req !== undefined ||
        liveUpdatesEventDestination.res !== undefined
      )
        return next("validation");
      liveUpdatesEventDestination.req = req;
      liveUpdatesEventDestination.res = res;
      res.locals.liveUpdatesToken = req.query.liveUpdatesToken;
      res.setHeader = (name, value) => res;
      res.send = (body) => {
        res.write(
          `event: liveupdate\ndata:${body.replaceAll("\n", "\ndata:")}\n\n`
        );
        return res;
      };
      res.once("close", () => {
        app.locals.liveUpdatesEventDestinations.delete(
          liveUpdatesEventDestination
        );
      });
      res.type("text/event-stream").write(":\n\n");
      console.log(
        `${new Date().toISOString()}\tSSE\topen\t${req.ip}\t${
          res.locals.liveUpdatesToken
        }\t\t\t${req.originalUrl}`
      );
    },
  ];
};
