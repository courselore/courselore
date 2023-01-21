import * as node from "@leafac/node";
import { Application } from "./index.mjs";

export type ApplicationLogging = {
  log(...messageParts: string[]): void;

  server: {
    locals: {
      ResponseLocals: {
        Logging: {
          log(...messageParts: string[]): void;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.log = (...messageParts) => {
    console.log(
      [
        new Date().toISOString(),
        application.process.type,
        application.process.number,
        application.process.id,
        ...messageParts,
      ].join(" \t")
    );
  };

  application.log(
    "STARTED",
    ...(application.process.type === "main"
      ? [
          application.name,
          application.version,
          `https://${application.configuration.hostname}`,
        ]
      : [])
  );

  process.once("exit", () => {
    application.log("STOPPED");
  });

  application.server.enable("trust proxy");

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Logging"]
  >((request, response, next) => {
    if (response.locals.log !== undefined) return next();

    const id = Math.random().toString(36).slice(2);
    const start = process.hrtime.bigint();
    response.locals.log = (...messageParts) => {
      application.log(
        id,
        `${node.elapsedTime(start)}ms`,
        request.ip,
        request.method,
        request.originalUrl,
        ...messageParts
      );
    };
    const log = response.locals.log;

    log("STARTING...");

    response.once("close", () => {
      const contentLength = response.getHeader("Content-Length");
      log(
        "FINISHED",
        String(response.statusCode),
        ...(typeof contentLength === "string"
          ? [`${Math.ceil(Number(contentLength) / 1000)}kB`]
          : [])
      );
    });

    next();
  });
};