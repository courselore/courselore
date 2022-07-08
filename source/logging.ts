import { Courselore, BaseMiddlewareLocals } from "./index.js";

export default (app: Courselore): void => {
  app.once("listen", () => {
    console.log(
      `${new Date().toISOString()}\tCourselore/${
        app.locals.configuration.version
      } started at https://${app.locals.configuration.host}`
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
          `${new Date().toISOString()}\t${req.method}\t${res.statusCode}\t${
            req.ip
          }\t${
            (process.hrtime.bigint() - res.locals.loggingStartTime) / 1_000_000n
          }ms\t\t${Math.floor(
            Number(res.getHeader("Content-Length") ?? "0") / 1000
          )}kB\t\t${req.originalUrl}${
            process.env.NODE_ENV !== "production" && req.method !== "GET"
              ? `\n${JSON.stringify(req.body, undefined, 2)}`
              : ``
          }`
        );
        return output;
      };
    }
    next();
  });
  app.once("close", () => {
    console.log(
      `${new Date().toISOString()}\tCourselore/${
        app.locals.configuration.version
      } stopped at https://${app.locals.configuration.host}`
    );
  });
};
