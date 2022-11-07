import { Application } from "./index.mjs";

export type ApplicationLogging = {
  log(...messageParts: string[]): void;
};

export type ResponseLocalsLogging = {
  log(...messageParts: string[]): void;
  liveUpdatesNonce: string | undefined;
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
      : ["PROCESS NUMBER", String(application.process.number)])
  );

  process.once("exit", () => {
    application.log("STOPPED");
  });

  application.server.enable("trust proxy");

  application.server.use<{}, any, {}, {}, ResponseLocalsLogging>(
    (request, response, next) => {
      const liveUpdatesNonce = request.header("Live-Updates");
      if (
        typeof liveUpdatesNonce === "string" &&
        response.locals.liveUpdatesNonce === undefined
      ) {
        const time = process.hrtime.bigint();
        response.locals.log = (...messageParts) => {
          application.log(
            "LIVE-UPDATES",
            liveUpdatesNonce,
            `${(process.hrtime.bigint() - time) / 1_000_000n}ms`,
            request.ip,
            request.method,
            request.originalUrl,
            ...messageParts
          );
        };
        response.locals.log("STARTING...");
        const log = response.locals.log;
        response.once("close", () => {
          log("CLOSED");
        });
        return next();
      }

      const id = Math.random().toString(36).slice(2);
      const time = process.hrtime.bigint();
      response.locals.log = (...messageParts) => {
        application.log(
          ...(typeof liveUpdatesNonce === "string"
            ? ["LIVE-UPDATES", liveUpdatesNonce]
            : []),
          id,
          `${(process.hrtime.bigint() - time) / 1_000_000n}ms`,
          request.ip,
          request.method,
          request.originalUrl,
          ...messageParts
        );
      };
      response.locals.log("STARTING...");
      response.once("close", () => {
        const contentLength = response.getHeader("Content-Length");
        response.locals.log(
          "CLOSED",
          String(response.statusCode),
          ...(typeof contentLength === "string"
            ? [`${Math.floor(Number(contentLength) / 1000)}kB`]
            : [])
        );
      });
      next();
    }
  );
};
