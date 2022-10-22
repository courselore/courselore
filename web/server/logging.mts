import express from "express";
import { Courselore, BaseMiddlewareLocals } from "./index.mjs";

export default (app: Courselore): void => {
  app.once("server:start", () => {
    console.log(
      `${new Date().toISOString()}\t${
        app.locals.options.processType
      }\tCourselore/${app.locals.options.version}\tSTARTED\thttps://${
        app.locals.options.hostname
      }`
    );
  });
  app.once("server:stop", () => {
    console.log(
      `${new Date().toISOString()}\t${
        app.locals.options.processType
      }\tCourselore/${app.locals.options.version}\tSTOPPED`
    );
  });

  app.once("worker:start", () => {
    console.log(
      `${new Date().toISOString()}\t${
        app.locals.options.processType
      }\tCourselore/${app.locals.options.version}\tSTARTED`
    );
  });
  app.once("worker:stop", () => {
    console.log(
      `${new Date().toISOString()}\t${
        app.locals.options.processType
      }\tCourselore/${app.locals.options.version}\tSTOPPED`
    );
  });

  app.enable("trust proxy");
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.loggingStartTime = process.hrtime.bigint();
    console.log(
      `${new Date().toISOString()}\t${app.locals.options.processType}\t${
        req.ip
      }\t${req.method}\t${req.originalUrl}\tSTARTED...\n${
        app.locals.options.environment === "development" &&
        !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method)
          ? `\n${JSON.stringify(req.body, undefined, 2)}`
          : ``
      }`
    );
    if (req.header("Live-Updates") !== undefined) return next();
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
  }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>);
};
