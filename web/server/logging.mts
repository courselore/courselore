import express from "express";
import { Courselore, BaseLocals } from "./index.mjs";

export default async (app: Courselore): Promise<void> => {
  console.log(
    `${new Date().toISOString()}\t${app.locals.options.processType}\tSTARTED${
      app.locals.options.processType === "main"
        ? `\tCourselore/${app.locals.options.version}\thttps://${app.locals.options.hostname}`
        : ``
    }`
  );
  process.once("exit", () => {
    console.log(
      `${new Date().toISOString()}\t${app.locals.options.processType}\tSTOPPED`
    );
  });

  app.enable("trust proxy");
  app.use<{}, any, {}, {}, BaseLocals>((req, res, next) => {
    res.locals.loggingStartTime = process.hrtime.bigint();
    const liveUpdatesNonce = req.header("Live-Updates");
    console.log(
      `${new Date().toISOString()}\t${app.locals.options.processType}\t${
        req.ip
      }\t${req.method}\t${req.originalUrl}${
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
          `${new Date().toISOString()}\t${app.locals.options.processType}\t${
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

  app.use(((err, req, res, next) => {
    console.log(
      `${new Date().toISOString()}\t${app.locals.options.processType}\t${
        req.ip
      }\t${req.method}\t${req.originalUrl}\tERROR\n${err}`
    );
    next(err);
  }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseLocals>);
};
