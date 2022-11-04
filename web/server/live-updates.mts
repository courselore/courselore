import timers from "node:timers/promises";
import express from "express";
import { Database, sql } from "@leafac/sqlite";
import {
  Application,
  ResponseLocalsBase,
  ResponseLocalsCourseEnrolled,
} from "./index.mjs";

export type ApplicationLiveUpdates = {
  server: {
    locals: {
      middleware: {
        liveUpdates: express.RequestHandler<
          {},
          any,
          {},
          {},
          ResponseLocalsLiveUpdates
        >[];
      };
      helpers: {
        liveUpdates({
          req,
          res,
        }: {
          req: express.Request<{}, any, {}, {}, ResponseLocalsCourseEnrolled>;
          res: express.Response<any, ResponseLocalsCourseEnrolled>;
        }): Promise<void>;
      };
    };
  };
};

export type ResponseLocalsLiveUpdates = ResponseLocalsCourseEnrolled & {
  liveUpdatesNonce: string | undefined;
};

export default async (application: Application): Promise<void> => {
  const connections = new Map<
    string,
    {
      req: express.Request<{}, any, {}, {}, ResponseLocalsLiveUpdates>;
      res: express.Response<any, ResponseLocalsLiveUpdates>;
    }
  >();

  application.worker.once("start", async () => {
    while (true) {
      application.log("CLEAN EXPIRED ‘liveUpdates’", "STARTING...");
      for (const connectionMetadata of application.database.all<{
        nonce: string;
      }>(
        sql`
          SELECT "nonce"
          FROM "liveUpdates"
          WHERE "expiresAt" < ${new Date().toISOString()}
        `
      )) {
        application.database.run(
          sql`
            DELETE FROM "liveUpdates" WHERE "nonce" = ${connectionMetadata.nonce}
          `
        );
        application.log("LIVE-UPDATES", connectionMetadata.nonce, "EXPIRED");
      }
      application.log("CLEAN EXPIRED ‘liveUpdates’", "FINISHED");
      await timers.setTimeout(60 * 1000, undefined, { ref: false });
    }
  });

  application.server.locals.middleware.liveUpdates = [
    (req, res, next) => {
      const nonce = req.header("Live-Updates");

      if (nonce === undefined) {
        res.locals.liveUpdatesNonce = Math.random().toString(36).slice(2);
        application.database.run(
          sql`
            INSERT INTO "liveUpdates" (
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
        response.log(
          `${new Date().toISOString()}\t${application.process.type}\t${
            req.ip
          }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
            res.locals.liveUpdatesNonce
          }\tCREATED`
        );
        return next();
      }

      if (res.locals.liveUpdatesNonce === undefined) {
        res.locals.liveUpdatesNonce = nonce;

        const connectionMetadata = application.database.get<{
          expiresAt: string | null;
          shouldLiveUpdateOnOpenAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "expiresAt", "shouldLiveUpdateOnOpenAt", "url"
            FROM "liveUpdates"
            WHERE "nonce" = ${res.locals.liveUpdatesNonce}
          `
        );

        if (
          (connectionMetadata !== undefined &&
            (connectionMetadata.expiresAt === null ||
              connectionMetadata.url !== req.originalUrl)) ||
          connections.has(res.locals.liveUpdatesNonce)
        ) {
          response.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCONNECTION FAILED`
          );
          return res.status(422).end();
        }

        if (connectionMetadata !== undefined) {
          application.database.run(
            sql`
              UPDATE "liveUpdates"
              SET "expiresAt" = NULL,
                  "shouldLiveUpdateOnOpenAt" = NULL
              WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          response.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\tCONNECTION OPENED`
          );
        } else {
          application.database.run(
            sql`
              INSERT INTO "liveUpdates" (
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
          response.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
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
          response.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              req.ip
            }\t${req.method}\t${req.originalUrl}\tLIVE-UPDATES\t${
              res.locals.liveUpdatesNonce
            }\t${res.statusCode}\t${
              (process.hrtime.bigint() - res.locals.responseStartTime) /
              1_000_000n
            }ms\t${Math.floor(Buffer.byteLength(body) / 1000)}kB`
          );
          return res;
        };
        const connectionOpenTime = res.locals.responseStartTime;
        res.once("close", () => {
          heartbeatAbortController.abort();
          application.database.run(
            sql`
              DELETE FROM "liveUpdates" WHERE "nonce" = ${res.locals.liveUpdatesNonce}
            `
          );
          connections.delete(res.locals.liveUpdatesNonce!);
          response.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
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

  application.locals.helpers.liveUpdatesDispatch = async ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, ResponseLocalsCourseEnrolled>;
    res: express.Response<any, ResponseLocalsCourseEnrolled>;
  }) => {
    await timers.setTimeout(5 * 1000, undefined, { ref: false });

    application.database.run(
      sql`
        UPDATE "liveUpdates"
        SET "shouldLiveUpdateOnOpenAt" = ${new Date().toISOString()}
        WHERE "course" = ${res.locals.course.id} AND
              "expiresAt" IS NOT NULL
      `
    );

    for (const connectionMetadata of application.database.all<{
      nonce: string;
    }>(
      sql`
        SELECT "nonce"
        FROM "liveUpdates"
        WHERE "course" = ${res.locals.course.id} AND
              "expiresAt" IS NULL
      `
    )) {
      const connection = connections.get(connectionMetadata.nonce);
      if (connection === undefined) continue;
      connection.res.locals = {
        liveUpdatesNonce: connection.res.locals.liveUpdatesNonce,
      } as ResponseLocalsLiveUpdates;
      application(connection.req, connection.res);
      await timers.setTimeout(100, undefined, { ref: false });
    }
  };

  application.use<{}, any, {}, {}, ResponseLocalsBase>((req, res, next) => {
    const nonce = req.header("Live-Updates-Abort");
    if (nonce === undefined) return next();
    application.database.run(
      sql`
        DELETE FROM "liveUpdates" WHERE "nonce" = ${nonce}
      `
    );
    const connection = connections.get(nonce);
    connections.delete(nonce);
    connection?.res.end();
    response.log(
      `${new Date().toISOString()}\t${application.process.type}\t${req.ip}\t${
        req.method
      }\t${req.originalUrl}\tLIVE-UPDATES\t${nonce}\tABORTED\t${
        connection?.req.ip ?? ""
      }\t${connection?.req.method ?? ""}\t${connection?.req.originalUrl ?? ""}`
    );
    next();
  });

  if (application.process.type === "server")
    application.once("stop", () => {
      for (const [_, { req, res }] of connections) res.end();
    });
};
