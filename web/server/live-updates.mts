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
    (request, response, next) => {
      const nonce = request.header("Live-Updates");

      if (nonce === undefined) {
        response.locals.liveUpdatesNonce = Math.random().toString(36).slice(2);
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
              ${response.locals.liveUpdatesNonce},
              ${request.originalUrl},
              ${response.locals.course.id}
            )
          `
        );
        response.locals.log("CREATED");
        return next();
      }

      if (response.locals.liveUpdatesNonce === undefined) {
        response.locals.liveUpdatesNonce = nonce;

        const connectionMetadata = application.database.get<{
          expiresAt: string | null;
          shouldLiveUpdateOnOpenAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "expiresAt", "shouldLiveUpdateOnOpenAt", "url"
            FROM "liveUpdates"
            WHERE "nonce" = ${response.locals.liveUpdatesNonce}
          `
        );

        if (
          (connectionMetadata !== undefined &&
            (connectionMetadata.expiresAt === null ||
              connectionMetadata.url !== request.originalUrl)) ||
          connections.has(response.locals.liveUpdatesNonce)
        ) {
          response.locals.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              request.ip
            }\t${request.method}\t${request.originalUrl}\tLIVE-UPDATES\t${
              response.locals.liveUpdatesNonce
            }\tCONNECTION FAILED`
          );
          return response.status(422).end();
        }

        if (connectionMetadata !== undefined) {
          application.database.run(
            sql`
              UPDATE "liveUpdates"
              SET "expiresAt" = NULL,
                  "shouldLiveUpdateOnOpenAt" = NULL
              WHERE "nonce" = ${response.locals.liveUpdatesNonce}
            `
          );
          response.locals.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              request.ip
            }\t${request.method}\t${request.originalUrl}\tLIVE-UPDATES\t${
              response.locals.liveUpdatesNonce
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
                ${response.locals.liveUpdatesNonce},
                ${request.originalUrl},
                ${response.locals.course.id}
              )
            `
          );
          response.locals.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              request.ip
            }\t${request.method}\t${request.originalUrl}\tLIVE-UPDATES\t${
              response.locals.liveUpdatesNonce
            }\tCREATED & CONNECTION OPENED`
          );
        }

        response.contentType("application/x-ndjson");
        const heartbeatAbortController = new AbortController();
        (async () => {
          while (true) {
            response.write("\n");
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
        response.setHeader = (name, value) => response;
        response.send = (body) => {
          response.write(JSON.stringify(body) + "\n");
          response.locals.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              request.ip
            }\t${request.method}\t${request.originalUrl}\tLIVE-UPDATES\t${
              response.locals.liveUpdatesNonce
            }\t${response.statusCode}\t${
              (process.hrtime.bigint() - response.locals.responseStartTime) /
              1_000_000n
            }ms\t${Math.floor(Buffer.byteLength(body) / 1000)}kB`
          );
          return response;
        };
        const connectionOpenTime = response.locals.responseStartTime;
        response.once("close", () => {
          heartbeatAbortController.abort();
          application.database.run(
            sql`
              DELETE FROM "liveUpdates" WHERE "nonce" = ${response.locals.liveUpdatesNonce}
            `
          );
          connections.delete(response.locals.liveUpdatesNonce!);
          response.locals.log(
            `${new Date().toISOString()}\t${application.process.type}\t${
              request.ip
            }\t${request.method}\t${request.originalUrl}\tLIVE-UPDATES\t${
              response.locals.liveUpdatesNonce
            }\tCONNECTION CLOSED\t${
              (process.hrtime.bigint() - connectionOpenTime) / 1_000_000n
            }ms`
          );
        });
        connections.set(response.locals.liveUpdatesNonce, {
          req: request,
          res: response,
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
    response.locals.log(
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
