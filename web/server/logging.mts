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
      : ["PROCESS NUMBER", String(application.process.number)])
  );

  process.once("exit", () => {
    application.log("STOPPED");
  });

  application.server.enable("trust proxy");

  application.server.use<{}, any, {}, {}, ResponseLocalsLogging>(
    (request, response, next) => {
      const liveUpdatesNonce = request.header("Live-Updates");
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
      for (const method of ["send", "redirect"]) {
        const responseAny = response as any;
        const implementation = responseAny[method].bind(responseAny);
        responseAny[method] = (...arguments_: any) => {
          const output = implementation(...arguments_);
          const contentLength = response.getHeader("Content-Length");
          response.locals.log(
            "FINISHED",
            String(response.statusCode),
            ...(typeof contentLength === "string"
              ? [`${Math.floor(Number(contentLength) / 1000)}kB`]
              : [])
          );
          return output;
        };
      }
      next();
    }
  );
};
