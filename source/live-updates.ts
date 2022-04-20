import express from "express";
import { Database, sql } from "@leafac/sqlite";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface LiveUpdatesLocals {
  liveUpdates: {
    clients: Map<
      string,
      {
        req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
        res: express.Response<any, LiveUpdatesMiddlewareLocals>;
      }
    >;
    database: Database;
  };
}

export type LiveUpdatesMiddleware = express.RequestHandler<
  {},
  any,
  {},
  { liveUpdatesToken?: string; [key: string]: unknown },
  LiveUpdatesMiddlewareLocals
>[];
export interface LiveUpdatesMiddlewareLocals
  extends BaseMiddlewareLocals,
    IsEnrolledInCourseMiddlewareLocals {}

export type LiveUpdatesDispatchHelper = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
}) => void;

export default (app: Courselore): void => {
  app.locals.liveUpdates = {
    clients: new Map(),
    // FIXME: Remove this `""` argument when @leafac/sqlite allows for no argument, by having fixed the types in @types/better-sqlite3.
    database: new Database(""),
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
      const token = req.header("Live-Updates");
      if (token === undefined || token.trim() === "") {
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
      if (
        req.header("Live-Updates-Event-Stream") === "true" &&
        res.locals.liveUpdatesToken === undefined
      ) {
        res.locals.liveUpdatesToken = token;
        app.locals.liveUpdates.clients
          .get(res.locals.liveUpdatesToken)
          ?.res.end();
        app.locals.liveUpdates.clients.set(res.locals.liveUpdatesToken, {
          req,
          res,
        });
        res.flushHeaders();
        res.setHeader = (name, value) => res;
        res.send = (body) => {
          res.write(JSON.stringify(body) + "\n");
          return res;
        };
        res.once("close", () => {
          app.locals.liveUpdates.clients.delete(res.locals.liveUpdatesToken!);
          app.locals.liveUpdates.database.run(
            sql`
              UPDATE "clients"
              SET "expiresAt" = ${new Date(
                Date.now() + 5 * 60 * 1000
              ).toISOString()}
              WHERE "token" = ${res.locals.liveUpdatesToken}
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesToken
            }\tCLIENT\tCLOSED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        });
        let client = app.locals.liveUpdates.database.get<{
          shouldUpdateAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "shouldUpdateAt", "url"
            FROM "clients"
            WHERE "token" = ${res.locals.liveUpdatesToken}
          `
        );
        if (client !== undefined) {
          app.locals.liveUpdates.database.run(
            sql`
              UPDATE "clients"
              SET "expiresAt" = NULL,
                  "shouldUpdateAt" = NULL,
                  "url" = ${req.originalUrl}
              WHERE "token" = ${res.locals.liveUpdatesToken}
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesToken
            }\tCLIENT\tOPENED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        } else {
          client = {
            ...app.locals.liveUpdates.database.get<{
              url: string;
            }>(
              sql`
                INSERT INTO "clients" (
                  "token",
                  "url",
                  "course"
                )
                VALUES (
                  ${res.locals.liveUpdatesToken},
                  ${req.originalUrl},
                  ${res.locals.course.id}
                )
                RETURNING *
              `
            )!,
            shouldUpdateAt: new Date().toISOString(),
          };
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesToken
            }\tCLIENT\tRECREATED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        }
        if (client.shouldUpdateAt !== null) next();
        return;
      }
      next();
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
      app.locals.liveUpdates.database.run(
        sql`
          UPDATE "clients"
          SET "shouldUpdateAt" = ${new Date().toISOString()}
          WHERE "course" = ${res.locals.course.id} AND
                "token" != ${req.header("Live-Updates")}
        `
      );
      clearTimeout(timeout);
      work();
    };
    async function work() {
      for (const client of app.locals.liveUpdates.database.all<{
        token: string;
      }>(
        sql`
          SELECT "token"
          FROM "clients"
          WHERE "expiresAt" < ${new Date().toISOString()}
        `
      )) {
        app.locals.liveUpdates.database.run(
          sql`
            DELETE FROM "clients"
            WHERE "token" = ${client.token}
          `
        );
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            client.token
          }\tCLIENT\tEXPIRED`
        );
      }
      for (const client of app.locals.liveUpdates.database.all<{
        token: string;
      }>(
        sql`
          SELECT "token"
          FROM "courses"
          WHERE "shouldUpdateAt" IS NOT NULL
        `
      )) {
        const clientReqRes = app.locals.liveUpdates.clients.get(client.token);
        if (clientReqRes === undefined) continue;
        clientReqRes.res.locals = {
          liveUpdatesToken: clientReqRes.res.locals.liveUpdatesToken,
        } as LiveUpdatesMiddlewareLocals;
        await app(clientReqRes.req, clientReqRes.res);
        app.locals.liveUpdates.database.run(
          sql`
            UPDATE "clients"
            SET "shouldUpdateAt" = NULL
            WHERE "token" = ${client.token}
          `
        );
      }
      timeout = setTimeout(work, 60 * 1000);
    }
  })();
};
