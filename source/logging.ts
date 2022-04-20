import { Courselore, BaseMiddlewareLocals } from "./index.js";

export default (app: Courselore): void => {
  app.once("listen", () => {
    console.log(
      `${new Date().toISOString()}\tCourselore/${
        app.locals.options.version
      } started at ${app.locals.options.baseURL}`
    );
  });
  app.enable("trust proxy");
  app.use<{}, any, {}, {}, BaseMiddlewareLocals>((req, res, next) => {
    res.locals.loggingStartTime = process.hrtime.bigint();
    if (res.locals.liveUpdatesToken !== undefined) return next();
    for (const method of ["send", "redirect"]) {
      const resUntyped = res as any;
      const implementation = resUntyped[method].bind(resUntyped);
      resUntyped[method] = (...arguments_: any) => {
        const output = implementation(...arguments_);
        console.log(
          `${new Date().toISOString()}\t${
            res.locals.liveUpdatesToken !== undefined
              ? `LIVE-UPDATES\t${res.locals.liveUpdatesToken}\t`
              : ``
          }${req.method}\t${res.statusCode}\t${req.ip}\t${
            (process.hrtime.bigint() - res.locals.loggingStartTime) / 1_000_000n
          }ms\t\t${res.getHeader("Content-Length") ?? "0"}B\t\t${
            req.originalUrl
          }${
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
        app.locals.options.version
      } stopped at ${app.locals.options.baseURL}`
    );
  });
};
