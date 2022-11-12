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
  application.database.run(
    sql`
      DELETE FROM "liveConnections" WHERE "processNumber" = ${application.process.number}
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
    if (response.locals.liveConnectionNonce !== undefined) return next();

    response.header("Version", application.version);

    const nonce = request.header("Live-Connection");
    if (typeof nonce === "string") {
      response.locals.liveConnectionNonce = nonce;

      const liveConnection = application.database.get<{
        expiresAt: string | null;
        url: string;
        processNumber: number | null;
        liveUpdateAt: string | null;
      }>(
        sql`
          SELECT "expiresAt", "url", "processNumber", "liveUpdateAt"
          FROM "liveConnections"
          WHERE "nonce" = ${response.locals.liveConnectionNonce}
        `
      );

      if (
        liveConnection !== undefined &&
        (liveConnection.expiresAt === null ||
          liveConnection.url !== request.originalUrl ||
          liveConnection.processNumber !== null)
      ) {
        response.locals.log("LIVE-CONNECTION", "CONNECTION FAILED");
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
        if (typeof response.locals.liveConnectionNonce !== "string") return;
        application.database.run(
          sql`
            DELETE FROM "liveConnections" WHERE "nonce" = ${response.locals.liveConnectionNonce}
          `
        );
        connections.delete(response.locals.liveConnectionNonce);
      });

      connections.set(response.locals.liveConnectionNonce, {
        request,
        response,
      });

      if (liveConnection !== undefined) {
        application.database.run(
          sql`
            UPDATE "liveConnections"
            SET
              "expiresAt" = NULL,
              "processNumber" = ${application.process.number}
            WHERE "nonce" = ${response.locals.liveConnectionNonce}
          `
        );
        response.locals.log("LIVE-CONNECTION", "CONNECTION OPENED");
      } else {
        application.database.run(
          sql`
            INSERT INTO "liveConnections" (
              "nonce",
              "url",
              "processNumber",
              "liveUpdateAt"
            )
            VALUES (
              ${response.locals.liveConnectionNonce},
              ${request.originalUrl},
              ${application.process.number},
              ${new Date().toISOString()}
            )
          `
        );
        response.locals.log("LIVE-CONNECTION", "CREATED & CONNECTION OPENED");
      }

      if (liveConnection === undefined || liveConnection.liveUpdateAt !== null)
        next();

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
            INSERT INTO "liveConnections" (
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
        UPDATE "liveConnections"
        SET "liveUpdateAt" = ${new Date().toISOString()}
        WHERE "url" LIKE ${`${url}%`}
      `
    );

    await timers.setTimeout(3000, undefined, { ref: false });

    for (const port of application.ports.serverEvents)
      got.post(`http://127.0.0.1:${port}/live-updates`).catch((error) => {
        response.locals.log("LIVE-UPDATES", "ERROR EMITTING POST EVENT", error);
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
        const liveConnection = application.database.get<{
          nonce: string;
        }>(
          sql`
            SELECT "nonce"
            FROM "liveConnections"
            WHERE
              "processNumber" = ${application.process.number},
              "liveUpdateAt" IS NOT NULL
            LIMIT 1
          `
        );
        if (liveConnection === undefined) break;

        const connection = connections.get(liveConnection.nonce);
        if (connection === undefined) {
          application.database.run(
            sql`
              DELETE FROM "liveConnections" WHERE "nonce" = ${liveConnection.nonce}
            `
          );
          continue;
        }

        connection.response.locals = {
          liveConnectionNonce: connection.response.locals.liveConnectionNonce,
          log: connection.response.locals.log,
        } as Application["server"]["locals"]["ResponseLocals"]["LiveConnection"];
        application.server(connection.request, connection.response);

        await timers.setTimeout(100, undefined, { ref: false });
      }
    }
  });

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
