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
    shouldUpdate?: boolean;
    req?: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
    res?: express.Response<any, LiveUpdatesMiddlewareLocals>;
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

export type LiveUpdatesDispatchHelper = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
}) => void;

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
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${token}\tEVENT-STREAM\tCREATED\t${
              req.ip
            }\t\t\t${req.originalUrl}`
          );
        }
        return next();
      }
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
      ) {
        res
          .type("text/event-stream")
          .write(`event: validationerror\ndata:\n\n`);
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            req.query.liveUpdatesToken
          }\tEVENT-STREAM\tFAILED\t${req.ip}\t\t\t${req.originalUrl}`
        );
        return;
      }
      liveUpdatesEventDestination.req = req;
      liveUpdatesEventDestination.res = res;
      res.locals.liveUpdatesToken = liveUpdatesEventDestination.token;
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
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            res.locals.liveUpdatesToken
          }\tEVENT-STREAM\tCLOSED\t${req.ip}\t\t\t${req.originalUrl}`
        );
      });
      res.type("text/event-stream").write(":\n\n");
      console.log(
        `${new Date().toISOString()}\tLIVE-UPDATES\t${
          res.locals.liveUpdatesToken
        }\tEVENT-STREAM\tOPENED\t${req.ip}\t\t\t${req.originalUrl}`
      );
    },
  ];

  app.locals.helpers.liveUpdatesDispatch = (() => {
    let timeoutId: NodeJS.Timeout;
    return ({ req, res }: { req: any; res: any }) => {
      for (const liveUpdatesEventDestination of app.locals
        .liveUpdatesEventDestinations)
        if (
          liveUpdatesEventDestination.token !== req.header("Live-Updates") &&
          res.locals.course.id === liveUpdatesEventDestination.courseId
        )
          liveUpdatesEventDestination.shouldUpdate = true;
      clearTimeout(timeoutId);
      work();
    };
    async function work() {
      for (const liveUpdatesEventDestination of app.locals
        .liveUpdatesEventDestinations) {
        if (
          liveUpdatesEventDestination.req === undefined ||
          liveUpdatesEventDestination.res === undefined
        ) {
          if (
            liveUpdatesEventDestination.createdAt.getTime() <
            Date.now() - 60 * 1000
          ) {
            app.locals.liveUpdatesEventDestinations.delete(
              liveUpdatesEventDestination
            );
            console.log(
              `${new Date().toISOString()}\tLIVE-UPDATES\t${
                liveUpdatesEventDestination.token
              }\tEVENT-STREAM\tEXPIRED`
            );
          }
          continue;
        }
        if (liveUpdatesEventDestination.shouldUpdate !== true) continue;
        liveUpdatesEventDestination.res.locals = {
          liveUpdatesToken:
            liveUpdatesEventDestination.res.locals.liveUpdatesToken,
        } as LiveUpdatesMiddlewareLocals;
        app(liveUpdatesEventDestination.req, liveUpdatesEventDestination.res);
        liveUpdatesEventDestination.shouldUpdate = false;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      timeoutId = setTimeout(work, 60 * 1000);
    }
  })();
};
