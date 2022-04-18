import express from "express";
import { Database, sql } from "@leafac/sqlite";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdates: {
    database: Database;
    clients: Map<
      string,
      {
        req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
        res: express.Response<any, LiveUpdatesMiddlewareLocals>;
      }
    >;
  };
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
  app.locals.liveUpdates = {
    database: new Database(""),
    clients: new Map(),
  };
  app.locals.liveUpdates.database.migrate(
    sql`
      CREATE TABLE "clients" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "expiresAt" TEXT NULL,
        "token" TEXT NOT NULL UNIQUE,
        "shouldUpdateAt" TEXT NULL,
        "url" TEXT NOT NULL,
        "course" INTEGER NOT NULL
      );
      CREATE INDEX "clientsExpiresAtIndex" ON "clients" ("expiresAt");
      CREATE INDEX "clientsTokenIndex" ON "clients" ("token");
      CREATE INDEX "clientsShouldUpdateAtIndex" ON "clients" ("shouldUpdateAt");
      CREATE INDEX "clientsCourseIndex" ON "clients" ("course");
    `
  );

  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      if (req.header("Live-Updates") === undefined) {
        res.locals.liveUpdatesToken = Math.random().toString(36).slice(2);
        app.locals.liveUpdates.database.run(
          sql`
            INSERT INTO "clients" (
              "expiresAt",
              "token",
              "url",
              "course"
            )
            VALUES (
              ${new Date(Date.now() + 60 * 1000).toISOString()},
              ${res.locals.liveUpdatesToken},
              ${req.originalUrl},
              ${res.locals.course.id}
            )
          `
        );
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            res.locals.liveUpdatesToken
          }\tCLIENT\tCREATED\t${req.ip}\t\t\t${req.originalUrl}`
        );
        return next();
      }
      if (res.locals.liveUpdatesToken === undefined) {
        res.locals.liveUpdatesToken = req.header("Live-Updates")!;
        res.setHeader = (name, value) => res;
        res.send = (body) => {
          res.write(JSON.stringify(body) + "\n");
          return res;
        };
        let client = app.locals.liveUpdates.database.get<{
          token: string;
          url: string;
        }>(
          sql`
            SELECT "token", "url" FROM "clients" WHERE "token" = ${res.locals.liveUpdatesToken}
          `
        );
        if (client !== undefined && client.url !== req.originalUrl)
          return res.status(422).end();
        if (client === undefined) {
          client = app.locals.liveUpdates.database.get<{
            token: string;
            url: string;
          }>(
            sql`
              INSERT INTO "clients" (
                "expiresAt",
                "token",
                "url",
                "course"
              )
              VALUES (
                ${new Date(Date.now() + 60 * 1000).toISOString()},
                ${res.locals.liveUpdatesToken},
                ${req.originalUrl},
                ${res.locals.course.id}
              )
              RETURNING *
            `
          )!;
          next();
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesToken
            }\tCLIENT\tCREATED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        }
        const connection = { req, res };
        app.locals.liveUpdates.clients.set(
          res.locals.liveUpdatesToken,
          connection
        );
        res.once("close", () => {
          app.locals.liveUpdates.database.run(
            sql`
              UPDATE "clients"
              SET "expiresAt" = ${new Date(
                Date.now() + 5 * 60 * 1000
              ).toISOString()}
              WHERE "token" = ${res.locals.liveUpdatesToken}
            `
          );
          app.locals.liveUpdates.clients.delete(res.locals.liveUpdatesToken);
        });
        return;
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
    let timeout: NodeJS.Timeout;
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
      clearTimeout(timeout);
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
        await app(
          liveUpdatesEventDestination.eventStream.req,
          liveUpdatesEventDestination.eventStream.res
        );
        liveUpdatesEventDestination.shouldUpdate = false;
      }
      timeout = setTimeout(work, 60 * 1000);
    }
  })();
};
