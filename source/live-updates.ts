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
  {},
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
}) => Promise<void>;

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
        "shouldLiveUpdateOnOpenAt" TEXT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "url" TEXT NOT NULL,
        "course" INTEGER NOT NULL
      );
      CREATE INDEX "clientsExpiresAtIndex" ON "clients" ("expiresAt");
      CREATE INDEX "clientsShouldLiveUpdateOnOpenAtIndex" ON "clients" ("shouldLiveUpdateOnOpenAt");
      CREATE INDEX "clientsNonceIndex" ON "clients" ("nonce");
      CREATE INDEX "clientsCourseIndex" ON "clients" ("course");
    `
  );
  (async () => {
    while (true) {
      for (const client of app.locals.liveUpdates.database.all<{
        nonce: string;
      }>(
        sql`
          SELECT "nonce"
          FROM "clients"
          WHERE "expiresAt" < ${new Date().toISOString()}
        `
      )) {
        app.locals.liveUpdates.database.run(
          sql`
            DELETE FROM "clients" WHERE "nonce" = ${client.nonce}
          `
        );
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            client.nonce
          }\tCLIENT\tEXPIRED`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
  })();

  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      const nonce = req.header("Live-Updates");
      if (nonce === undefined) {
        res.locals.liveUpdatesNonce = Math.random().toString(36).slice(2);
        app.locals.liveUpdates.database.run(
          sql`
            INSERT INTO "clients" (
              "expiresAt",
              "nonce",
              "url",
              "course"
            )
            VALUES (
              ${new Date(Date.now() + 60 * 1000).toISOString()},
              ${res.locals.liveUpdatesNonce},
              ${req.originalUrl},
              ${res.locals.course.id}
            )
          `
        );
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            res.locals.liveUpdatesNonce
          }\tCLIENT\tCREATED\t${req.ip}\t\t\t${req.originalUrl}`
        );
        return next();
      }
      if (res.locals.liveUpdatesNonce === undefined) {
        res.locals.liveUpdatesNonce = nonce;
        const client = app.locals.liveUpdates.database.get<{
          expiresAt: string | null;
          shouldLiveUpdateOnOpenAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "expiresAt", "shouldLiveUpdateOnOpenAt", "url"
            FROM "clients"
            WHERE "nonce" = ${res.locals.liveUpdatesNonce}
          `
        );
        if (
          app.locals.liveUpdates.clients.has(res.locals.liveUpdatesNonce) ||
          (client !== undefined &&
            (client.expiresAt === null || req.originalUrl !== client.url))
        ) {
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCLIENT\tFAILED\t${req.ip}\t\t\t${req.originalUrl}`
          );
          return res.status(422).end();
        }
        app.locals.liveUpdates.clients.set(res.locals.liveUpdatesNonce, {
          req,
          res,
        });
        let heartbeatTimeout: NodeJS.Timeout;
        (function heartbeat() {
          res.write("\n");
          heartbeatTimeout = setTimeout(heartbeat, 15 * 1000);
        })();
        res.once("close", () => {
          clearTimeout(heartbeatTimeout);
        });
        res.setHeader = (name, value) => res;
        res.send = (body) => {
          res.write(JSON.stringify(body) + "\n");
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\t${req.method}\t${res.statusCode}\t${req.ip}\t${
              (process.hrtime.bigint() - res.locals.loggingStartTime) /
              1_000_000n
            }ms\t\t${Math.floor(Buffer.byteLength(body) / 1000)}kB\t\t${
              req.originalUrl
            }`
          );
          return res;
        };
        res.once("close", () => {
          app.locals.liveUpdates.clients.delete(res.locals.liveUpdatesNonce!);
          app.locals.liveUpdates.database.run(
            sql`
              DELETE FROM "clients" WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCLIENT\tCLOSED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        });
        if (client !== undefined) {
          app.locals.liveUpdates.database.run(
            sql`
              UPDATE "clients"
              SET "expiresAt" = NULL,
                  "shouldLiveUpdateOnOpenAt" = NULL
              WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCLIENT\tOPENED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        } else {
          app.locals.liveUpdates.database.run(
            sql`
              INSERT INTO "clients" (
                "nonce",
                "url",
                "course"
              )
              VALUES (
                ${res.locals.liveUpdatesNonce},
                ${req.originalUrl},
                ${res.locals.course.id}
              )
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCLIENT\tCREATED&OPENED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        }
        if (client?.shouldLiveUpdateOnOpenAt === null) return;
      }
      next();
    },
  ];

  app.locals.helpers.liveUpdatesDispatch = async ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  }) => {
    for (const client of app.locals.liveUpdates.database.all<{
      nonce: string;
    }>(
      sql`
        SELECT "nonce"
        FROM "clients"
        WHERE "course" = ${res.locals.course.id} AND
              "expiresAt" IS NOT NULL
      `
    )) {
      const clientReqRes = app.locals.liveUpdates.clients.get(client.nonce)!;
      clientReqRes.res.locals = {
        liveUpdatesNonce: clientReqRes.res.locals.liveUpdatesNonce,
      } as LiveUpdatesMiddlewareLocals;
      await app(clientReqRes.req, clientReqRes.res);
    }
  };

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    const nonce = req.header("Live-Updates-Abort");
    if (nonce === undefined) return next();
    const clientReqRes = app.locals.liveUpdates.clients.get(nonce);
    clientReqRes?.res.end();
    app.locals.liveUpdates.clients.delete(nonce);
    app.locals.liveUpdates.database.run(
      sql`
          DELETE FROM "clients" WHERE "nonce" = ${nonce}
        `
    );
    console.log(
      `${new Date().toISOString()}\tLIVE-UPDATES\t${nonce}\tCLIENT\tABORTED\t${
        clientReqRes?.req.ip ?? ""
      }\t\t\t${clientReqRes?.req.originalUrl ?? ""}`
    );
    next();
  });
};
