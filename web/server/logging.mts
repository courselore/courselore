import express from "express";
import { Application } from "./index.mjs";

export type ApplicationLogging = {
  log: (messageParts: string[]) => void;
};

export type ResponseLocalsLogging = {
  logStartTime: BigInt;
};

export default async (application: Application): Promise<void> => {
  application.log = (messageParts) => {
    console.log(
      [
        new Date().toISOString(),
        application.process.type,
        application.process.identifier,
        ...messageParts,
      ].join("\t")
    );
  };

  application.log([
    "STARTED",
    ...(application.process.type === "main"
      ? [
          `Courselore/${application.version}`,
          `https://${application.configuration.hostname}`,
        ]
      : []),
  ]);
  process.once("exit", () => {
    console.log(
      `${new Date().toISOString()}\t${application.process.type}\tSTOPPED`
    );
  });

  application.enable("trust proxy");
  application.use<{}, any, {}, {}, ResponseLocalsLogging>((req, res, next) => {
    res.locals.loggingStartTime = process.hrtime.bigint();
    const liveUpdatesNonce = req.header("Live-Updates");
    console.log(
      `${new Date().toISOString()}\t${application.process.type}\t${req.ip}\t${
        req.method
      }\t${req.originalUrl}${
        liveUpdatesNonce !== undefined
          ? `\tLIVE-UPDATES\t${liveUpdatesNonce}`
          : ``
      }\tSTARTED...`
    );
    if (liveUpdatesNonce !== undefined) return next();
    for (const method of ["send", "redirect"]) {
      const resUntyped = res as any;
      const implementation = resUntyped[method].bind(resUntyped);
      resUntyped[method] = (...parameters: any) => {
        const output = implementation(...parameters);
        console.log(
          `${new Date().toISOString()}\t${application.process.type}\t${
            req.ip
          }\t${req.method}\t${req.originalUrl}\t${res.statusCode}\t${
            (process.hrtime.bigint() - res.locals.loggingStartTime) / 1_000_000n
          }ms\t${Math.floor(
            Number(res.getHeader("Content-Length") ?? "0") / 1000
          )}kB`
        );
        return output;
      };
    }
    next();
  });

  application.use(((err, req, res, next) => {
    console.log(
      `${new Date().toISOString()}\t${application.process.type}\t${req.ip}\t${
        req.method
      }\t${req.originalUrl}\tERROR\n${err}`
    );
    next(err);
  }) as express.ErrorRequestHandler<{}, any, {}, {}, ResponseLocalsLogging>);
};
