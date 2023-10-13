import timers from "node:timers/promises";
import express from "express";
import * as node from "@leafac/node";
import sql from "@leafac/sqlite";
import { Application } from "./index.mjs";

export type ApplicationLiveConnection = {
  web: {
    locals: {
      ResponseLocals: {
        LiveConnection: Application["web"]["locals"]["ResponseLocals"]["Base"] & {
          liveConnectionNonce?: string;
        };
      };

      helpers: {
        liveUpdates: ({
          request,
          response,
          url,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          url: string;
        }) => Promise<void>;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  if (application.process.type === "web")
    application.database.run(
      sql`
        DELETE FROM "liveConnectionsMetadata" WHERE "processNumber" = ${application.process.number}
      `,
    );

  const liveConnections = new Map<
    string,
    {
      request: express.Request<
        {},
        any,
        {},
        {},
        Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
      response: express.Response<
        any,
        Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
    }
  >();

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log(
          "LIVE-CONNECTIONS",
          "CLEAN EXPIRED ‘liveConnections’",
          "STARTING...",
        );

        for (const liveConnectionMetadata of application.database.all<{
          nonce: string;
        }>(
          sql`
            SELECT "nonce", "processNumber"
            FROM "liveConnectionsMetadata"
            WHERE "expiresAt" < ${new Date().toISOString()}
          `,
        )) {
          application.database.run(
            sql`
              DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${liveConnectionMetadata.nonce}
            `,
          );
          application.log(
            "LIVE-CONNECTION",
            liveConnectionMetadata.nonce,
            "EXPIRED",
          );
        }

        application.log(
          "LIVE-CONNECTIONS",
          "CLEAN EXPIRED ‘liveConnections’",
          "FINISHED",
        );

        await timers.setTimeout(
          60 * 1000 + Math.random() * 10 * 1000,
          undefined,
          { ref: false },
        );
      }
    });

  application.webEvents.once("start", async () => {
    while (true) {
      await timers.setTimeout(
        10 * 60 * 1000 + Math.random() * 60 * 1000,
        undefined,
        { ref: false },
      );

      application.log("LIVE-CONNECTIONS", "CLEAN ZOMBIES", "STARTING...");

      for (const liveConnectionMetadata of application.database.all<{
        nonce: string;
      }>(
        sql`
          SELECT "nonce"
          FROM "liveConnectionsMetadata"
          WHERE
            "processNumber" = ${application.process.number} AND
            "nonce" NOT IN ${[...liveConnections.keys()]}
        `,
      )) {
        application.database.run(
          sql`
            DELETE FROM "liveConnectionsMetadata"
            WHERE "nonce" = ${liveConnectionMetadata.nonce}
          `,
        );
        application.log(
          "LIVE-CONNECTION",
          liveConnectionMetadata.nonce,
          "CLEANED ZOMBIE CONNECTION IN DATABASE",
        );
      }

      for (const [nonce, liveConnection] of liveConnections)
        if (
          application.database.get<{}>(
            sql`
              SELECT TRUE FROM "liveConnectionsMetadata" WHERE "nonce" = ${nonce}
            `,
          ) === undefined
        ) {
          liveConnection.response.end();
          application.log("LIVE-CONNECTION", nonce, "CLOSED ZOMBIE CONNECTION");
        }

      application.log("LIVE-CONNECTIONS", "CLEAN ZOMBIES", "FINISHED");
    }
  });

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >((request, response, next) => {
    if (response.locals.liveConnectionNonce !== undefined) return next();

    response.header("Version", application.version);

    const nonce = request.header("Live-Connection");
    if (typeof nonce === "string") {
      response.locals.liveConnectionNonce = nonce;

      const responseLocalsLog = response.locals.log.bind(response);
      response.locals.log = (...messageParts) => {
        responseLocalsLog("LIVE-CONNECTION", nonce, ...messageParts);
      };

      const liveConnectionMetadata = application.database.get<{
        expiresAt: string | null;
        url: string;
        processNumber: number | null;
        liveUpdateAt: string | null;
      }>(
        sql`
          SELECT "expiresAt", "url", "processNumber", "liveUpdateAt"
          FROM "liveConnectionsMetadata"
          WHERE "nonce" = ${nonce}
        `,
      );

      if (
        liveConnectionMetadata !== undefined &&
        (liveConnectionMetadata.expiresAt === null ||
          liveConnectionMetadata.url !== request.originalUrl ||
          liveConnectionMetadata.processNumber !== null)
      ) {
        response.locals.log("CONNECTION FAILED");
        return response.status(422).end();
      }

      response.contentType("application/x-ndjson");
      const heartbeatAbortController = new AbortController();
      (async () => {
        while (true) {
          response.write("\n");
          try {
            await timers.setTimeout(
              15 * 1000 + Math.random() * 5 * 1000,
              undefined,
              {
                ref: false,
                signal: heartbeatAbortController.signal,
              },
            );
          } catch {
            break;
          }
        }
      })();
      (async () => {
        while (true) {
          try {
            await timers.setTimeout(
              4.5 * 60 * 1000 + Math.random() * 0.5 * 60 * 1000,
              undefined,
              {
                ref: false,
                signal: heartbeatAbortController.signal,
              },
            );
          } catch {
            break;
          }
          application.database.run(
            sql`
              UPDATE "liveConnectionsMetadata"
              SET "liveUpdateAt" = ${new Date().toISOString()}
              WHERE "nonce" = ${nonce}
            `,
          );
          application.got
            .post(
              `http://localhost:${
                application.ports.webEvents[application.process.number]
              }/live-updates`,
            )
            .catch((error) => {
              response.locals.log(
                "LIVE-UPDATES",
                "FAILED TO EMIT POST ‘/live-updates’ EVENT",
                String(error),
                error?.stack,
              );
            });
        }
      })();

      response.setHeader = (name, value) => response;

      response.send = (body) => {
        response.write(JSON.stringify(body) + "\n");
        response.locals.log(
          "LIVE-UPDATE FINISHED",
          String(response.statusCode),
          `${Math.ceil(Buffer.byteLength(body) / 1000)}kB`,
        );
        return response;
      };

      response.once("close", () => {
        heartbeatAbortController.abort();
        application.database.run(
          sql`
            DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${nonce}
          `,
        );
        liveConnections.delete(nonce);
      });

      const liveConnection = {
        request,
        response,
      };
      liveConnections.set(nonce, liveConnection);

      if (liveConnectionMetadata !== undefined) {
        application.database.run(
          sql`
            UPDATE "liveConnectionsMetadata"
            SET
              "expiresAt" = NULL,
              "processNumber" = ${application.process.number}
            WHERE "nonce" = ${nonce}
          `,
        );
        response.locals.log("CONNECTION OPENED");
      } else {
        application.database.run(
          sql`
            INSERT INTO "liveConnectionsMetadata" (
              "nonce",
              "url",
              "processNumber",
              "liveUpdateAt"
            )
            VALUES (
              ${nonce},
              ${request.originalUrl},
              ${application.process.number},
              ${new Date().toISOString()}
            )
          `,
        );
        response.locals.log("CREATED & CONNECTION OPENED");
      }

      if (
        liveConnectionMetadata === undefined ||
        liveConnectionMetadata.liveUpdateAt !== null
      )
        application.got
          .post(
            `http://localhost:${
              application.ports.webEvents[application.process.number]
            }/live-updates`,
          )
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES",
              "FAILED TO EMIT POST ‘/live-updates’ EVENT",
              String(error),
              error?.stack,
            );
          });

      application.webEvents.emit("liveConnectionOpened", liveConnection);

      return;
    }

    if (request.method === "GET") {
      response.locals.liveConnectionNonce = Math.random().toString(36).slice(2);

      const responseSend = response.send.bind(response);
      response.send = (body) => {
        if (
          typeof response.locals.liveConnectionNonce === "string" &&
          response.getHeader("Content-Type") === undefined
        ) {
          application.database.run(
            sql`
              INSERT INTO "liveConnectionsMetadata" (
                "expiresAt",
                "nonce",
                "url"
              )
              VALUES (
                ${new Date(Date.now() + 60 * 1000).toISOString()},
                ${response.locals.liveConnectionNonce},
                ${request.originalUrl}
              )
            `,
          );
          response.locals.log(
            "LIVE-CONNECTION",
            response.locals.liveConnectionNonce,
            "CREATED",
          );
        }

        responseSend(body);
        return response;
      };
    }

    next();
  });

  application.web.locals.helpers.liveUpdates = async ({
    request,
    response,
    url,
  }) => {
    application.database.run(
      sql`
        UPDATE "liveConnectionsMetadata"
        SET "liveUpdateAt" = ${new Date().toISOString()}
        WHERE "url" LIKE ${`${url}%`}
      `,
    );

    await timers.setTimeout(3 * 1000 + Math.random() * 2 * 1000, undefined, {
      ref: false,
    });

    for (const port of application.ports.webEvents)
      application.got
        .post(`http://localhost:${port}/live-updates`)
        .catch((error) => {
          response.locals.log(
            "LIVE-UPDATES",
            "FAILED TO EMIT POST ‘/live-updates’ EVENT",
            String(error),
            error?.stack,
          );
        });
  };

  let liveUpdates: Function = () => {};

  application.webEvents.post<{}, any, {}, {}, {}>(
    "/live-updates",
    (request, response) => {
      liveUpdates();
      response.end();
    },
  );

  application.webEvents.once("start", async () => {
    while (true) {
      await new Promise((resolve) => {
        liveUpdates = resolve;
      });

      while (true) {
        const liveConnectionMetadata = application.database.get<{
          nonce: string;
        }>(
          sql`
            SELECT "nonce"
            FROM "liveConnectionsMetadata"
            WHERE
              "processNumber" = ${application.process.number} AND
              "liveUpdateAt" IS NOT NULL
            LIMIT 1
          `,
        );
        if (liveConnectionMetadata === undefined) break;

        const liveConnection = liveConnections.get(
          liveConnectionMetadata.nonce,
        );
        if (liveConnection === undefined) {
          application.database.run(
            sql`
              DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${liveConnectionMetadata.nonce}
            `,
          );
          application.log(
            "LIVE-UPDATES",
            liveConnectionMetadata.nonce,
            "CLEANED ZOMBIE LIVE-CONNECTION WHEN TRYING TO SEND LIVE-UPDATE",
          );
          continue;
        }

        const responseLocalsLog = liveConnection.response.locals.log.bind(
          liveConnection.response,
        );
        const id = Math.random().toString(36).slice(2);
        const start = process.hrtime.bigint();
        liveConnection.response.locals.log = (...messageParts) => {
          responseLocalsLog(
            id,
            `${node.elapsedTime(start)}ms`,
            ...messageParts,
          );
        };

        liveConnection.response.locals.log("STARTING...");

        liveConnection.response.locals = {
          liveConnectionNonce:
            liveConnection.response.locals.liveConnectionNonce,
          log: liveConnection.response.locals.log,
        } as Application["web"]["locals"]["ResponseLocals"]["LiveConnection"];

        application.web(liveConnection.request, liveConnection.response);

        application.database.run(
          sql`
            UPDATE "liveConnectionsMetadata"
            SET "liveUpdateAt" = NULL
            WHERE "nonce" = ${liveConnectionMetadata.nonce}
          `,
        );

        liveConnection.response.locals.log = responseLocalsLog;

        await timers.setTimeout(100 + Math.random() * 100, undefined, {
          ref: false,
        });
      }
    }
  });

  if (application.configuration.environment === "development")
    application.web.get<
      {},
      any,
      {},
      {},
      Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
    >("/live-updates", (request, response) => {
      application.database.run(
        sql`
          UPDATE "liveConnectionsMetadata"
          SET "liveUpdateAt" = ${new Date().toISOString()}
        `,
      );

      for (const port of application.ports.webEvents)
        application.got
          .post(`http://localhost:${port}/live-updates`)
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES",
              "FAILED TO EMIT POST ‘/live-updates’ EVENT",
              String(error),
              error?.stack,
            );
          });

      response.end();
    });

  application.webEvents.once("stop", () => {
    for (const liveConnection of liveConnections.values())
      liveConnection.response.end();
  });
};
