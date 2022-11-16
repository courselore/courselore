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

      helpers: {
        liveUpdates({
          request,
          response,
          url,
        }: {
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
          url: string;
        }): Promise<void>;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  if (application.process.type === "server")
    application.database.run(
      sql`
        DELETE FROM "liveConnectionsMetadata" WHERE "processNumber" = ${application.process.number}
      `
    );

  const liveConnections = new Map<
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

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log(
          "LIVE-CONNECTIONS",
          "CLEAN EXPIRED ‘liveConnections’",
          "STARTING..."
        );

        for (const liveConnectionMetadata of application.database.all<{
          nonce: string;
        }>(
          sql`
            SELECT "nonce", "processNumber"
            FROM "liveConnectionsMetadata"
            WHERE "expiresAt" < ${new Date().toISOString()}
          `
        )) {
          application.database.run(
            sql`
              DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${liveConnectionMetadata.nonce}
            `
          );
          application.log(
            "LIVE-CONNECTION",
            liveConnectionMetadata.nonce,
            "EXPIRED"
          );
        }

        application.log(
          "LIVE-CONNECTIONS",
          "CLEAN EXPIRED ‘liveConnections’",
          "FINISHED"
        );

        await timers.setTimeout(60 * 1000, undefined, { ref: false });
      }
    });

  application.serverEvents.once("start", async () => {
    while (true) {
      await timers.setTimeout(10 * 60 * 1000, undefined, { ref: false });

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
        `
      )) {
        application.database.run(
          sql`
            DELETE FROM "liveConnectionsMetadata"
            WHERE "nonce" = ${liveConnectionMetadata.nonce}
          `
        );
        application.log(
          "LIVE-CONNECTION",
          liveConnectionMetadata.nonce,
          "CLEANED ZOMBIE CONNECTION IN DATABASE"
        );
      }

      for (const [nonce, liveConnection] of liveConnections)
        if (
          application.database.get<{}>(
            sql`
              SELECT TRUE FROM "liveConnectionsMetadata" WHERE "nonce" = ${nonce}
            `
          ) === undefined
        ) {
          liveConnection.response.end();
          application.log("LIVE-CONNECTION", nonce, "CLOSED ZOMBIE CONNECTION");
        }

      application.log("LIVE-CONNECTIONS", "CLEAN ZOMBIES", "FINISHED");
    }
  });

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
  >((request, response, next) => {
    if (response.locals.liveConnectionNonce !== undefined) return next();

    response.header("Version", application.version);

    const nonce = request.header("Live-Connection");
    if (typeof nonce === "string") {
      response.locals.liveConnectionNonce = nonce;

      const responseLocalsLog = response.locals.log;
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
        `
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
        heartbeatAbortController.abort();
        application.database.run(
          sql`
            DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${nonce}
          `
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
          `
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
          `
        );
        response.locals.log("CREATED & CONNECTION OPENED");
      }

      if (
        liveConnectionMetadata === undefined ||
        liveConnectionMetadata.liveUpdateAt !== null
      )
        got
          .post(
            `http://127.0.0.1:${
              application.ports.serverEvents[application.process.number]
            }/live-updates`
          )
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES",
              "FAILED TO EMIT POST ‘/live-updates’ EVENT",
              String(error),
              error?.stack
            );
          });

      application.serverEvents.emit("liveConnectionOpened", liveConnection);

      return;
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

  application.server.locals.helpers.liveUpdates = async ({
    request,
    response,
    url,
  }) => {
    application.database.run(
      sql`
        UPDATE "liveConnectionsMetadata"
        SET "liveUpdateAt" = ${new Date().toISOString()}
        WHERE "url" LIKE ${`${url}%`}
      `
    );

    await timers.setTimeout(3000, undefined, { ref: false });

    for (const port of application.ports.serverEvents)
      got.post(`http://127.0.0.1:${port}/live-updates`).catch((error) => {
        response.locals.log(
          "LIVE-UPDATES",
          "FAILED TO EMIT POST ‘/live-updates’ EVENT",
          String(error),
          error?.stack
        );
      });
  };

  let liveUpdates: Function = () => {};

  application.serverEvents.post<{}, any, {}, {}, {}>(
    "/live-updates",
    (request, response) => {
      liveUpdates();
      response.end();
    }
  );

  application.serverEvents.once("start", async () => {
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
          `
        );
        if (liveConnectionMetadata === undefined) break;

        const liveConnection = liveConnections.get(
          liveConnectionMetadata.nonce
        );
        if (liveConnection === undefined) {
          application.database.run(
            sql`
              DELETE FROM "liveConnectionsMetadata" WHERE "nonce" = ${liveConnectionMetadata.nonce}
            `
          );
          application.log(
            "LIVE-UPDATES",
            liveConnectionMetadata.nonce,
            "CLEANED ZOMBIE LIVE-CONNECTION WHEN TRYING TO SEND LIVE-UPDATE"
          );
          continue;
        }

        const responseLocalsLog = liveConnection.response.locals.log;
        const id = Math.random().toString(36).slice(2);
        const time = process.hrtime.bigint();
        liveConnection.response.locals.log = (...messageParts) => {
          responseLocalsLog(
            id,
            `${(process.hrtime.bigint() - time) / 1_000_000n}ms`,
            ...messageParts
          );
        };

        liveConnection.response.locals.log("STARTING...");

        liveConnection.response.setHeader = (name, value) =>
          liveConnection.response;

        liveConnection.response.send = (body) => {
          liveConnection.response.write(JSON.stringify(body) + "\n");
          liveConnection.response.locals.log(
            "LIVE-UPDATE FINISHED",
            String(liveConnection.response.statusCode),
            `${Math.ceil(Buffer.byteLength(body) / 1000)}kB`
          );
          return liveConnection.response;
        };

        liveConnection.response.locals = {
          liveConnectionNonce:
            liveConnection.response.locals.liveConnectionNonce,
          log: liveConnection.response.locals.log,
        } as Application["server"]["locals"]["ResponseLocals"]["LiveConnection"];

        application.server(liveConnection.request, liveConnection.response);

        application.database.run(
          sql`
            UPDATE "liveConnectionsMetadata"
            SET "liveUpdateAt" = NULL
            WHERE "nonce" = ${liveConnectionMetadata.nonce}
          `
        );

        liveConnection.response.locals.log = responseLocalsLog;

        await timers.setTimeout(100, undefined, { ref: false });
      }
    }
  });

  application.serverEvents.once("stop", () => {
    for (const liveConnection of liveConnections.values())
      liveConnection.response.end();
  });
};
