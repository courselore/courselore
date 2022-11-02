import express from "express";
import { Application } from "./index.mjs";

export type ApplicationLogging = {
  log: (...messageParts: string[]) => void;
};

export type ResponseLocalsLogging = {
  id: string;
  startTime: bigint;
};

export default async (application: Application): Promise<void> => {
  application.log = (...messageParts) => {
    console.log(
      [
        new Date().toISOString(),
        application.process.type,
        application.process.identifier,
        ...messageParts,
      ].join("\t")
    );
  };

  application.log(
    "STARTED",
    ...(application.process.type === "main"
      ? [
          `Courselore/${application.version}`,
          `https://${application.configuration.hostname}`,
        ]
      : ["PORT", String(application.process.port)])
  );

  process.once("exit", () => {
    application.log("STOPPED");
  });

  application.server.enable("trust proxy");

  application.server.use<{}, any, {}, {}, ResponseLocalsLogging>(
    (request, response, next) => {
      response.locals.id = Math.random().toString(36).slice(2);
      response.locals.startTime = process.hrtime.bigint();
      const liveUpdatesNonce = request.header("Live-Updates");
      application.log(
        response.locals.id,
        request.ip,
        request.method,
        request.originalUrl,
        ...(liveUpdatesNonce !== undefined
          ? ["LIVE-UPDATES", liveUpdatesNonce]
          : []),
        "STARTED..."
      );
      if (liveUpdatesNonce !== undefined) return next();
      // TODO: Test that ‘close’ always fires, even in case of error. Consider the ‘finish’, ‘error’, and ‘end’ events as well. Or maybe patch the ‘.end()’ method.
      response.once("close", () => {
        application.log(
          response.locals.id,
          request.ip,
          request.method,
          request.originalUrl,
          String(response.statusCode),
          `${
            (process.hrtime.bigint() - response.locals.startTime) / 1_000_000n
          }ms`,
          ...(typeof response.getHeader("Content-Length") === "string"
            ? [
                `${Math.floor(
                  Number(response.getHeader("Content-Length")!) / 1000
                )}kB`,
              ]
            : [])
        );
      });
      next();
    }
  );

  application.server.use(((error, request, response, next) => {
    application.log(
      response.locals.id,
      request.ip,
      request.method,
      request.originalUrl,
      "ERROR",
      String(error)
    );
    next(error);
  }) as express.ErrorRequestHandler<{}, any, {}, {}, ResponseLocalsLogging>);
};
