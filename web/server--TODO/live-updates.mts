import timers from "node:timers/promises";
import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import got from "got";
import {
  Application,
  Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"],
} from "./index.mjs";

// TODO: "LIVE-UPDATES", liveUpdatesNonce

// const liveConnections = new Set<{
//   req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
//   res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
// }>();
// app.server.get<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(
//   "/live-connection",
//   (req, res) => {
//     const connection = { req, res };
//     liveConnections.add(connection);
//     res.header("Version", app.version);
//     res.contentType("text/plain");
//     const heartbeatAbortController = new AbortController();
//     (async () => {
//       while (true) {
//         res.write("\n");
//         try {
//           await timers.setTimeout(15 * 1000, undefined, {
//             ref: false,
//             signal: heartbeatAbortController.signal,
//           });
//         } catch {
//           break;
//         }
//       }
//     })();
//     res.once("close", () => {
//       liveConnections.delete(connection);
//       heartbeatAbortController.abort();
//       console.log(
//         `${new Date().toISOString()}\t${app.process.type}\t${
//           req.ip
//         }\t${req.method}\t${req.originalUrl}\t${res.statusCode}\t${
//           (process.hrtime.bigint() - res.locals.responseStartTime) /
//           1_000_000n
//         }ms`
//       );
//     });
//   }
// );
// if (app.process.type === "server")
//   app.once("stop", () => {
//     for (const { req, res } of liveConnections) res.end();
//   });

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
          response: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
        }): Promise<void>;
      };
    };
  };
};

export type ResponseLocalsLiveUpdates = Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & {
  liveUpdatesNonce: string | undefined;
};

export default async (application: Application): Promise<void> => {
  application.database.run(
    sql`
      DELETE FROM "liveUpdates" WHERE ___
    `
  );

  const connections = new Map<
    string,
    {
      request: express.Request<{}, any, {}, {}, ResponseLocalsLiveUpdates>;
      response: express.Response<any, ResponseLocalsLiveUpdates>;
    }
  >();

  application.workerEvents.once("start", async () => {
    while (true) {
      application.log("CLEAN EXPIRED ‘liveUpdates’", "STARTING...");
      for (const liveUpdates of application.database.all<{
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
            DELETE FROM "liveUpdates" WHERE "nonce" = ${liveUpdates.nonce}
          `
        );
        for (const port of application.ports.serverEvents)
          got
            .delete(`http://127.0.0.1:${port}/live-updates`, {
              form: { nonce: liveUpdates.nonce },
            })
            .catch((error) => {
              application.log(
                "LIVE-UPDATES",
                "ERROR EMITTING DELETE EVENT",
                error
              );
            });
        application.log("LIVE-UPDATES", liveUpdates.nonce, "EXPIRED");
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
        response.locals.log("LIVE-UPDATES", "CREATED");
        return next();
      }

      if (response.locals.liveUpdatesNonce === undefined) {
        response.locals.liveUpdatesNonce = nonce;

        const liveUpdates = application.database.get<{
          expiresAt: string | null;
          shouldLiveUpdateOnConnectionAt: string | null;
          url: string;
        }>(
          sql`
            SELECT "expiresAt", "shouldLiveUpdateOnConnectionAt", "url"
            FROM "liveUpdates"
            WHERE "nonce" = ${response.locals.liveUpdatesNonce}
          `
        );

        if (
          liveUpdates !== undefined &&
          (liveUpdates.expiresAt === null ||
            liveUpdates.url !== request.originalUrl)
        ) {
          response.locals.log("LIVE-UPDATES", "CONNECTION FAILED");
          return response.status(422).end();
        }

        if (liveUpdates !== undefined) {
          application.database.run(
            sql`
              UPDATE "liveUpdates"
              SET
                "expiresAt" = NULL,
                "shouldLiveUpdateOnConnectionAt" = NULL
              WHERE "nonce" = ${response.locals.liveUpdatesNonce}
            `
          );
          response.locals.log("LIVE-UPDATES", "CONNECTION OPENED");
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
          response.locals.log("LIVE-UPDATES", "CREATED & CONNECTION OPENED");
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
              DELETE FROM "liveUpdates" WHERE "nonce" = ${response.locals.liveUpdatesNonce}
            `
          );
          connections.delete(response.locals.liveUpdatesNonce!);
        });
        connections.set(response.locals.liveUpdatesNonce, {
          request,
          response,
        });

        if (liveUpdates?.shouldLiveUpdateOnConnectionAt === null) return;
      }

      next();
    },
  ];

  application.server.locals.helpers.liveUpdates = async ({
    request,
    response,
  }: {
    request: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
    response: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
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
          liveUpdatesNonce: connection.response.locals.liveUpdatesNonce,
        } as ResponseLocalsLiveUpdates;
        application.server(connection.request, connection.response);
        await timers.setTimeout(100, undefined, { ref: false });
      }
    })
  );

  application.server.use<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>(
    (request, response, next) => {
      const nonce = request.header("Live-Updates-Abort");
      if (nonce === undefined) return next();
      application.database.run(
        sql`
          DELETE FROM "liveUpdates" WHERE "nonce" = ${nonce}
        `
      );
      for (const port of application.ports.serverEvents)
        got
          .delete(`http://127.0.0.1:${port}/live-updates`, {
            form: { nonce },
          })
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES",
              "ERROR EMITTING DELETE EVENT",
              error
            );
          });
      next();
    }
  );

  application.serverEvents.delete<{}, any, { nonce: string }, {}, {}>(
    "/live-updates",
    (request, response, next) => {
      if (
        typeof request.body.nonce !== "string" ||
        request.body.nonce.trim() === ""
      )
        next("Validation");
      response.end();

      const connection = connections.get(request.body.nonce);
      if (connection === undefined) return;
      connections.delete(request.body.nonce);
      connection.response.end();
      connection.response.locals.log("LIVE-UPDATES", "ABORTED");
    }
  );

  application.serverEvents.once("stop", () => {
    for (const [_, { request, response }] of connections) response.end();
  });
};
