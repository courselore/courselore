import express from "express";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdatesEventDestinations: Set<{
    createdAt: Date;
    shouldUpdate?: boolean;
    original: {
      req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
      res: express.Response<any, LiveUpdatesMiddlewareLocals>;
    };
    eventStream?: {
      req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
      res: express.Response<any, LiveUpdatesMiddlewareLocals>;
    };
  }>;
}

export type LiveUpdatesMiddleware = express.RequestHandler<
  {},
  any,
  {},
  { liveUpdatesToken?: string; [key: string]: unknown /* TODO */ },
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
        const token = Math.random().toString(36).slice(2);
        res.locals.liveUpdatesToken = token;
        app.locals.liveUpdatesEventDestinations.add({
          createdAt: new Date(),
          original: { req, res },
        });
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${token}\tEVENT-STREAM\tCREATED\t${
            req.ip
          }\t\t\t${req.originalUrl}`
        );
        return next();
      }
      if (res.locals.liveUpdatesToken !== undefined) return next();
      const liveUpdatesEventDestination = [
        ...app.locals.liveUpdatesEventDestinations,
      ].find(
        (liveUpdatesEventDestination) =>
          liveUpdatesEventDestination.original.res.locals.liveUpdatesToken ===
          req.query.liveUpdatesToken
      );
      if (
        liveUpdatesEventDestination === undefined ||
        liveUpdatesEventDestination.original.req.originalUrl !==
          req.originalUrl ||
        liveUpdatesEventDestination.eventStream !== undefined
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
      liveUpdatesEventDestination.eventStream = { req, res };
      res.locals.liveUpdatesToken =
        liveUpdatesEventDestination.original.res.locals.liveUpdatesToken;
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
    return ({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
      res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    }) => {
      for (const liveUpdatesEventDestination of app.locals
        .liveUpdatesEventDestinations)
        if (
          liveUpdatesEventDestination.original.res.locals.liveUpdatesToken !==
            req.header("Live-Updates") &&
          res.locals.course.id ===
            liveUpdatesEventDestination.original.res.locals.course.id
        )
          liveUpdatesEventDestination.shouldUpdate = true;
      clearTimeout(timeoutId);
      work();
    };
    async function work() {
      for (const liveUpdatesEventDestination of app.locals
        .liveUpdatesEventDestinations) {
        if (liveUpdatesEventDestination.eventStream === undefined) {
          if (
            liveUpdatesEventDestination.createdAt.getTime() <
            Date.now() - 60 * 1000
          ) {
            app.locals.liveUpdatesEventDestinations.delete(
              liveUpdatesEventDestination
            );
            console.log(
              `${new Date().toISOString()}\tLIVE-UPDATES\t${
                liveUpdatesEventDestination.original.res.locals.liveUpdatesToken
              }\tEVENT-STREAM\tEXPIRED\t${
                liveUpdatesEventDestination.original.req.ip
              }\t\t\t${liveUpdatesEventDestination.original.req.originalUrl}`
            );
          }
          continue;
        }
        if (liveUpdatesEventDestination.shouldUpdate !== true) continue;
        liveUpdatesEventDestination.eventStream.res.locals = {
          liveUpdatesToken:
            liveUpdatesEventDestination.eventStream.res.locals.liveUpdatesToken,
        } as LiveUpdatesMiddlewareLocals;
        app(
          liveUpdatesEventDestination.eventStream.req,
          liveUpdatesEventDestination.eventStream.res
        );
        liveUpdatesEventDestination.shouldUpdate = false;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      timeoutId = setTimeout(work, 60 * 1000);
    }
  })();
};
