import timers from "node:timers/promises";
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

export default async (app: Courselore): Promise<void> => {
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

  if (app.locals.options.processType === "server")
    app.once("ready", async () => {
      while (true) {
        console.log(
          `${new Date().toISOString()}\t${
            app.locals.options.processType
          }\tCLEAN EXPIRED ‘connectionsMetadata’\tSTARTING...`
        );
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
            `${new Date().toISOString()}\t${
              app.locals.options.processType
            }\tLIVE-UPDATES\t${connectionMetadata.nonce}\tEXPIRED`
          );
        }
        console.log(
          `${new Date().toISOString()}\t${
            app.locals.options.processType
          }\tCLEAN EXPIRED ‘connectionsMetadata’\tFINISHED`
        );
        await timers.setTimeout(60 * 1000, undefined, { ref: false });
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
          `${new Date().toISOString()}\t${app.locals.options.processType}\t${
            req.ip
          }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
            res.locals.liveUpdatesNonce
          }\tCREATED`
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
            `${new Date().toISOString()}\t${app.locals.options.processType}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCONNECTION FAILED`
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
            `${new Date().toISOString()}\t${app.locals.options.processType}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCONNECTION OPENED`
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
            `${new Date().toISOString()}\t${app.locals.options.processType}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCREATED & CONNECTION OPENED`
          );
        }

        res.contentType("application/x-ndjson");
        const heartbeatAbortController = new AbortController();
        (async () => {
          while (true) {
            res.write("\n");
            try {
              await timers.setTimeout(15 * 1000, undefined, {
                ref: false,
                signal: heartbeatAbortController.signal,
              });
            } catch {
              break;
            }
          }
        })();
        res.setHeader = (name, value) => res;
        res.send = (body) => {
          res.write(JSON.stringify(body) + "\n");
          console.log(
            `${new Date().toISOString()}\t${app.locals.options.processType}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\t${res.statusCode}\t${
              (process.hrtime.bigint() - res.locals.loggingStartTime) /
              1_000_000n
            }ms\t${Math.floor(Buffer.byteLength(body) / 1000)}kB`
          );
          return res;
        };
        const connectionOpenTime = res.locals.loggingStartTime;
        res.once("close", () => {
          heartbeatAbortController.abort();
          connectionsMetadata.run(
            sql`
              DELETE FROM "connectionsMetadata" WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          connections.delete(res.locals.liveUpdatesNonce!);
          console.log(
            `${new Date().toISOString()}\t${app.locals.options.processType}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCONNECTION CLOSED\t${
              (process.hrtime.bigint() - connectionOpenTime) / 1_000_000n
            }ms`
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
    await timers.setTimeout(5 * 1000, undefined, { ref: false });

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
      await timers.setTimeout(100, undefined, { ref: false });
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
      `${new Date().toISOString()}\t${app.locals.options.processType}\t${
        req.ip
      }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${nonce}\tABORTED\t${
        connection?.req.ip ?? ""
      }\t${connection?.req.method ?? ""}\t${connection?.req.originalUrl ?? ""}`
    );
    next();
  });

  if (app.locals.options.processType === "server")
    app.once("stop", () => {
      for (const [_, { req, res }] of connections) res.end();
    });
};
