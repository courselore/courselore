import { Courselore, LiveUpdatesMiddlewareLocals } from "./index.js";

export default (app: Courselore): void => {
  app.once("listen", () => {
    console.log(
      `${new Date().toISOString()}\tCourselore/${
        app.locals.options.version
      } started at ${app.locals.options.baseURL}`
    );
  });
  app.enable("trust proxy");
  app.use<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>((req, res, next) => {
    if (
      req.header("accept")?.includes("text/event-stream") &&
      res.locals.liveUpdatesToken === undefined
    )
      return next();
    const start = process.hrtime.bigint();
    res.once("close", () => {
      console.log(
        `${new Date().toISOString()}\t${
          res.locals.liveUpdatesToken !== undefined ? "LIVE-UPDATES\t" : ""
        }${req.method}\t${res.statusCode}\t${req.ip}\t${
          Number((process.hrtime.bigint() - start) / 1000n) / 1000
        }ms\t\t${res.getHeader("content-length") ?? "0"}B\t\t${
          req.originalUrl
        }${
          process.env.NODE_ENV !== "production" && req.method !== "GET"
            ? `\n${JSON.stringify(req.body, undefined, 2)}`
            : ``
        }`
      );
    });
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
