import { Application } from "./index.mjs";

export type ApplicationLogging = {
  log(...messageParts: string[]): void;
};

export type ResponseLocalsLogging = {
  log(...messageParts: string[]): void;
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
      /*
LIVE-UPDATES\t${
            response.locals.liveUpdatesNonce
          }
      */
      const id = Math.random().toString(36).slice(2);
      const time = process.hrtime.bigint();
      const liveUpdatesNonce = request.header("Live-Updates");
      response.locals.log = (...messageParts) => {
        application.log(
          ...(liveUpdatesNonce !== undefined
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
      response.locals.log("STARTED...");
      if (liveUpdatesNonce !== undefined) return next();
      response.once("close", () => {
        const contentLength = response.getHeader("Content-Length");
        response.locals.log(
          String(response.statusCode),
          ...(typeof contentLength === "string"
            ? [`${Math.floor(Number(contentLength!) / 1000)}kB`]
            : [])
        );
      });
      next();
    }
  );
};
