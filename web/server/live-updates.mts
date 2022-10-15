import express from "express";
import { Database, sql } from "@leafac/sqlite";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.mjs";

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
  // FIXME: Remove this `""` argument when @leafac/sqlite allows for no argument, by having fixed the types in @types/better-sqlite3.
  const connectionsMetadata = new Database("");
  connectionsMetadata.migrate(
    sql`
      CREATE TABLE "connectionsMetadata" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT,
        "expiresAt" TEXT NULL,
        "shouldLiveUpdateOnOpenAt" TEXT NULL,
        "nonce" TEXT NOT NULL UNIQUE,
        "url" TEXT NOT NULL,
        "course" INTEGER NOT NULL
      );
      CREATE INDEX "connectionsMetadataExpiresAtIndex" ON "connectionsMetadata" ("expiresAt");
      CREATE INDEX "connectionsMetadataShouldLiveUpdateOnOpenAtIndex" ON "connectionsMetadata" ("shouldLiveUpdateOnOpenAt");
      CREATE INDEX "connectionsMetadataNonceIndex" ON "connectionsMetadata" ("nonce");
      CREATE INDEX "connectionsMetadataCourseIndex" ON "connectionsMetadata" ("course");
    `
  );

  const connections = new Map<
    string,
    {
      req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
      res: express.Response<any, LiveUpdatesMiddlewareLocals>;
    }
  >();

  app.once("worker:start", async () => {
    while (true) {
      for (const connectionMetadata of connectionsMetadata.all<{
        nonce: string;
      }>(
        sql`
          SELECT "nonce"
          FROM "connectionsMetadata"
          WHERE "expiresAt" < ${new Date().toISOString()}
        `
      )) {
        connectionsMetadata.run(
          sql`
            DELETE FROM "connectionsMetadata" WHERE "nonce" = ${connectionMetadata.nonce}
          `
        );
        connections.delete(connectionMetadata.nonce);
        console.log(
          `${new Date().toISOString()}\tLIVE-UPDATES\t${
            connectionMetadata.nonce
          }\tEXPIRED`
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 60 * 1000));
    }
  });

  app.locals.middlewares.liveUpdates = [
    (req, res, next) => {
      const nonce = req.header("Live-Updates");

      if (nonce === undefined) {
        res.locals.liveUpdatesNonce = Math.random().toString(36).slice(2);
        connectionsMetadata.run(
          sql`
            INSERT INTO "connectionsMetadata" (
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
          }\tCREATED\t${req.ip}\t\t\t${req.originalUrl}`
        );
        return next();
      }

      if (res.locals.liveUpdatesNonce === undefined) {
        res.locals.liveUpdatesNonce = nonce;

        const connectionMetadata = connectionsMetadata.get<{
          expiresAt: string | null;
          shouldLiveUpdateOnOpenAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "expiresAt", "shouldLiveUpdateOnOpenAt", "url"
            FROM "connectionsMetadata"
            WHERE "nonce" = ${res.locals.liveUpdatesNonce}
          `
        );

        if (
          (connectionMetadata !== undefined &&
            (connectionMetadata.expiresAt === null ||
              connectionMetadata.url !== req.originalUrl)) ||
          connections.has(res.locals.liveUpdatesNonce)
        ) {
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tFAILED\t${req.ip}\t\t\t${req.originalUrl}`
          );
          return res.status(422).end();
        }

        if (connectionMetadata !== undefined) {
          connectionsMetadata.run(
            sql`
              UPDATE "connectionsMetadata"
              SET "expiresAt" = NULL,
                  "shouldLiveUpdateOnOpenAt" = NULL
              WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tOPENED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        } else {
          connectionsMetadata.run(
            sql`
              INSERT INTO "connectionsMetadata" (
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
            }\tCREATED&OPENED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        }

        res.contentType("application/x-ndjson");
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
          connectionsMetadata.run(
            sql`
              DELETE FROM "connectionsMetadata" WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          connections.delete(res.locals.liveUpdatesNonce!);
          console.log(
            `${new Date().toISOString()}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCLOSED\t${req.ip}\t\t\t${req.originalUrl}`
          );
        });
        connections.set(res.locals.liveUpdatesNonce, {
          req,
          res,
        });

        if (connectionMetadata?.shouldLiveUpdateOnOpenAt === null) return;
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
    await new Promise((resolve) => setTimeout(resolve, 5 * 1000));

    connectionsMetadata.run(
      sql`
        UPDATE "connectionsMetadata"
        SET "shouldLiveUpdateOnOpenAt" = ${new Date().toISOString()}
        WHERE "course" = ${res.locals.course.id} AND
              "expiresAt" IS NOT NULL
      `
    );

    for (const connectionMetadata of connectionsMetadata.all<{
      nonce: string;
    }>(
      sql`
        SELECT "nonce"
        FROM "connectionsMetadata"
        WHERE "course" = ${res.locals.course.id} AND
              "expiresAt" IS NULL
      `
    )) {
      const connection = connections.get(connectionMetadata.nonce);
      if (connection === undefined) continue;
      connection.res.locals = {
        liveUpdatesNonce: connection.res.locals.liveUpdatesNonce,
      } as LiveUpdatesMiddlewareLocals;
      app(connection.req, connection.res);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  };

  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    const nonce = req.header("Live-Updates-Abort");
    if (nonce === undefined) return next();
    connectionsMetadata.run(
      sql`
        DELETE FROM "connectionsMetadata" WHERE "nonce" = ${nonce}
      `
    );
    const connection = connections.get(nonce);
    connections.delete(nonce);
    connection?.res.end();
    console.log(
      `${new Date().toISOString()}\tLIVE-UPDATES\t${nonce}\tABORTED\t${
        connection?.req.ip ?? ""
      }\t\t\t${connection?.req.originalUrl ?? ""}`
    );
    next();
  });
};
