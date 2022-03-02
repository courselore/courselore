import { Courselore } from "./index.js";

export default (app: Courselore): void => {
  app.once("listen", () => {
    console.log(
      `${new Date().toISOString()}\tCourselore/${courseloreVersion} started at ${baseURL}`
    );
  });
  app.enable("trust proxy");
  app.use<{}, any, {}, {}, {}>((req, res, next) => {
    const start = process.hrtime.bigint();
    res.once("close", () => {
      console.log(
        `${new Date().toISOString()}\t${req.method}\t${res.statusCode}\t${
          req.ip
        }\t${Number((process.hrtime.bigint() - start) / 1000n) / 1000}ms\t\t${
          res.getHeader("content-length") ?? "0"
        }B\t\t${req.originalUrl}${
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
      `${new Date().toISOString()}\tCourselore/${courseloreVersion} stopped at ${baseURL}`
    );
  });
};
