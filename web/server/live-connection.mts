import timers from "node:timers/promises";
import express from "express";
import { sql } from "@leafac/sqlite";
import got from "got";
import { Application } from "./index.mjs";

export type ApplicationLiveConnection = {
  server: {
    locals: {
      ResponseLocals: {
        LiveConnection: Application["server"]["locals"]["ResponseLocals"]["Base"] & {
          liveConnectionNonce?: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.database.run(
    sql`
      DELETE FROM "liveUpdates" WHERE "processNumber" = ${application.process.number}
    `
  );

  const connections = new Map<
    string,
    {
      request: express.Request<
        {},
        any,
        {},
        {},
        Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
      response: express.Response<
        any,
        Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
    }
  >();

  application.workerEvents.once("start", async () => {
    while (true) {
      application.log("CLEAN EXPIRED ‘liveConnections’", "STARTING...");

      for (const liveConnection of application.database.all<{
        nonce: string;
        processNumber: number | null;
      }>(
        sql`
          SELECT "nonce", "processNumber"
          FROM "liveConnections"
          WHERE "expiresAt" < ${new Date().toISOString()}
        `
      )) {
        application.database.run(
          sql`
            DELETE FROM "liveConnections" WHERE "nonce" = ${liveConnection.nonce}
          `
        );
        if (liveConnection.processNumber !== null)
          got
            .delete(
              `http://127.0.0.1:${
                application.ports.serverEvents[liveConnection.processNumber]
              }/live-connections`,
              {
                form: { nonce: liveConnection.nonce },
              }
            )
            .catch((error) => {
              application.log(
                "LIVE-CONNECTION",
                "ERROR EMITTING DELETE EVENT",
                error
              );
            });
        application.log("LIVE-CONNECTION", liveConnection.nonce, "EXPIRED");
      }

      application.log("CLEAN EXPIRED ‘liveConnections’", "FINISHED");

      await timers.setTimeout(60 * 1000, undefined, { ref: false });
    }
  });

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
  >((request, response, next) => {
    if (response.locals.liveConnectionNonce !== undefined) {
      // TODO: SUBSEQUENT REQUEST
      return next();
    }

    response.header("Version", application.version);

    const nonce = request.header("Live-Connection");
    if (typeof nonce === "string") {
      response.locals.liveConnectionNonce = nonce;

      const connection = { request, response };
      connections.set(response.locals.liveConnectionNonce, connection);

      response.contentType("text/plain");
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

      response.once("close", () => {
        if (typeof response.locals.liveConnectionNonce !== "string") return;
        connections.delete(response.locals.liveConnectionNonce);
        heartbeatAbortController.abort();
      });
      return;
    }

    const abortNonce = request.header("Live-Connection-Abort");
    if (typeof abortNonce === "string") {
      const liveConnection = application.database.get<{
        nonce: string;
        processNumber: number | null;
      }>(
        sql`
          SELECT "nonce", "processNumber" FROM "liveConnections" WHERE "nonce" = ${abortNonce}
        `
      );
      if (liveConnection !== undefined) {
        application.database.run(
          sql`
            DELETE FROM "liveConnections" WHERE "nonce" = ${liveConnection.nonce}
          `
        );
        if (liveConnection.processNumber !== null)
          got
            .delete(
              `http://127.0.0.1:${
                application.ports.serverEvents[liveConnection.processNumber]
              }/live-connections`,
              {
                form: { nonce: liveConnection.nonce },
              }
            )
            .catch((error) => {
              response.locals.log(
                "LIVE-CONNECTION",
                "ERROR EMITTING DELETE EVENT",
                error
              );
            });
        response.locals.log("LIVE-CONNECTION", "ABORTED", abortNonce);
      }
    }

    if (request.method === "GET") {
      response.locals.liveConnectionNonce = Math.random().toString(36).slice(2);

      response.once("close", () => {
        if (
          response.statusCode !== 200 ||
          typeof response.locals.liveConnectionNonce !== "string"
        )
          return;

        application.database.run(
          sql`
            INSERT INTO "liveUpdates" (
              "expiresAt",
              "nonce",
              "url"
            )
            VALUES (
              ${new Date(Date.now() + 60 * 1000).toISOString()},
              ${response.locals.liveConnectionNonce},
              ${request.originalUrl}
            )
          `
        );

        response.locals.log(
          "LIVE-CONNECTION",
          response.locals.liveConnectionNonce,
          "CREATED"
        );
      });
    }

    next();
  });

  // TODO: Worker that sends Live-Updates
  // TODO: ‘serverEvents’ listener that triggers worker

  application.serverEvents.delete<{}, any, { nonce?: string }, {}, {}>(
    "/live-connections",
    (request, response) => {
      if (
        typeof request.body.nonce !== "string" ||
        request.body.nonce.trim() === ""
      )
        return response.status(422).end();

      const connection = connections.get(request.body.nonce);
      if (connection === undefined) return;
      connections.delete(request.body.nonce);
      connection.response.end();

      response.end();
    }
  );

  application.serverEvents.once("stop", () => {
    for (const { request, response } of connections.values()) response.end();
  });
};

// TODO: Add nonce to log

application.server.locals.middleware.liveUpdates = [
  (request, response, next) => {
    const nonce = request.header("Live-Updates");

    if (response.locals.liveConnectionNonce === undefined) {
      response.locals.liveConnectionNonce = nonce;

      const liveUpdates = application.database.get<{
        expiresAt: string | null;
        shouldLiveUpdateOnConnectionAt: string | null;
        url: string;
      }>(
        sql`
          SELECT "expiresAt", "shouldLiveUpdateOnConnectionAt", "url"
          FROM "liveUpdates"
          WHERE "nonce" = ${response.locals.liveConnectionNonce}
        `
      );

      if (
        liveUpdates !== undefined &&
        (liveUpdates.expiresAt === null ||
          liveUpdates.url !== request.originalUrl)
      ) {
        response.locals.log("LIVE-CONNECTION", "CONNECTION FAILED");
        return response.status(422).end();
      }

      if (liveUpdates !== undefined) {
        application.database.run(
          sql`
            UPDATE "liveUpdates"
            SET
              "expiresAt" = NULL,
              "shouldLiveUpdateOnConnectionAt" = NULL
            WHERE "nonce" = ${response.locals.liveConnectionNonce}
          `
        );
        response.locals.log("LIVE-CONNECTION", "CONNECTION OPENED");
      } else {
        application.database.run(
          sql`
            INSERT INTO "liveUpdates" (
              "nonce",
              "url",
              "course"
            )
            VALUES (
              ${response.locals.liveConnectionNonce},
              ${request.originalUrl},
              ${response.locals.course.id}
            )
          `
        );
        response.locals.log("LIVE-CONNECTION", "CREATED & CONNECTION OPENED");
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
          String(response.statusCode),
          `${Math.ceil(Buffer.byteLength(body) / 1000)}kB`
        );
        return response;
      };
      response.once("close", () => {
        heartbeatAbortController.abort();
        application.database.run(
          sql`
            DELETE FROM "liveUpdates" WHERE "nonce" = ${response.locals.liveConnectionNonce}
          `
        );
        connections.delete(response.locals.liveConnectionNonce!);
      });
      connections.set(response.locals.liveConnectionNonce, {
        request,
        response,
      });

      if (liveUpdates?.shouldLiveUpdateOnConnectionAt === null) return;
    }

    next();
  },
];

// TODO: BRING BACK THIS HELPER, WHICH IS NECESSARY BECAUSE IT SETS THE DATABASE
application.server.locals.helpers.liveUpdates = async ({
  request,
  response,
}: {
  request: express.Request<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >;
  response: express.Response<
    any,
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >;
}) => {
  application.database.run(
    sql`
      UPDATE "liveUpdates"
      SET "shouldLiveUpdateOnConnectionAt" = ${new Date().toISOString()}
      WHERE
        "course" = ${response.locals.course.id} AND
        "expiresAt" IS NOT NULL
    `
  );

  await timers.setTimeout(3000, undefined, { ref: false });

  for (const port of application.ports.serverEvents)
    got
      .post(`http://127.0.0.1:${port}/live-updates`, {
        form: { courseId: response.locals.course.id },
      })
      .catch((error) => {
        response.locals.log(
          "LIVE-UPDATES ",
          "ERROR EMITTING POST EVENT",
          error
        );
      });
};

application.serverEvents.post<{}, any, { courseId: string }, {}, {}>(
  "/live-updates",
  asyncHandler(async (request, response, next) => {
    if (
      typeof request.body.courseId !== "string" ||
      request.body.courseId.trim() === ""
    )
      next("Validation");
    response.end();

    for (const liveUpdates of application.database.all<{
      nonce: string;
    }>(
      sql`
        SELECT "nonce"
        FROM "liveUpdates"
        WHERE
          "course" = ${request.body.courseId} AND
          "expiresAt" IS NULL
      `
    )) {
      const connection = connections.get(liveUpdates.nonce);
      if (connection === undefined) continue;
      connection.response.locals = {
        liveConnectionNonce: connection.response.locals.liveConnectionNonce,
      } as Application["server"]["locals"]["ResponseLocals"]["LiveConnection"];
      application.server(connection.request, connection.response);
      await timers.setTimeout(100, undefined, { ref: false });
    }
  })
);
