import { Courselore, BaseMiddlewareLocals } from "./index.mjs";

export default (app: Courselore): void => {
  app.once("server:start", () => {
    console.log(
      `${new Date().toISOString()}\tSERVER\tCourselore/${
        app.locals.options.version
      }\tSTARTED\thttps://${app.locals.options.hostname}`
    );
  });
  app.once("server:stop", () => {
    console.log(
      `${new Date().toISOString()}\tSERVER\tCourselore/${
        app.locals.options.version
      }\tSTOPPED`
    );
  });

  app.enable("trust proxy");
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.loggingStartTime = process.hrtime.bigint();
    if (req.header("Live-Updates") !== undefined) return next();
    for (const method of ["send", "redirect"]) {
      const resUntyped = res as any;
      const implementation = resUntyped[method].bind(resUntyped);
      resUntyped[method] = (...arguments_: any) => {
        const output = implementation(...arguments_);
        console.log(
          `${new Date().toISOString()}\tSERVER\t${req.method}\t${
            res.statusCode
          }\t${req.ip}\t${
            (process.hrtime.bigint() - res.locals.loggingStartTime) / 1_000_000n
          }ms\t\t${Math.floor(
            Number(res.getHeader("Content-Length") ?? "0") / 1000
          )}kB\t\t${req.originalUrl}${
            app.locals.options.environment === "development" &&
            !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method)
              ? `\n${JSON.stringify(req.body, undefined, 2)}`
              : ``
          }`
        );
        return output;
      };
    }
    next();
  });

  app.once("worker:start", () => {
    console.log(
      `${new Date().toISOString()}\tWORKER\tCourselore/${
        app.locals.options.version
      }\tSTARTED`
    );
  });
  app.once("worker:stop", () => {
    console.log(
      `${new Date().toISOString()}\tWORKER\tCourselore/${
        app.locals.options.version
      }\tSTOPPED`
    );
  });
};
