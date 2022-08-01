export default (app) => {
    app.once("listen", () => {
        console.log(`${new Date().toISOString()}\tCourselore/${app.locals.options.version} started at https://${app.locals.options.host}`);
    });
    app.enable("trust proxy");
    app.use((req, res, next) => {
        res.locals.loggingStartTime = process.hrtime.bigint();
        if (req.header("Live-Updates") !== undefined)
            return next();
        for (const method of ["send", "redirect"]) {
            const resUntyped = res;
            const implementation = resUntyped[method].bind(resUntyped);
            resUntyped[method] = (...arguments_) => {
                const output = implementation(...arguments_);
                console.log(`${new Date().toISOString()}\t${req.method}\t${res.statusCode}\t${req.ip}\t${(process.hrtime.bigint() - res.locals.loggingStartTime) / 1000000n}ms\t\t${Math.floor(Number(res.getHeader("Content-Length") ?? "0") / 1000)}kB\t\t${req.originalUrl}${app.locals.options.environment === "development" &&
                    req.method !== "GET"
                    ? `\n${JSON.stringify(req.body, undefined, 2)}`
                    : ``}`);
                return output;
            };
        }
        next();
    });
    app.once("close", () => {
        console.log(`${new Date().toISOString()}\tCourselore/${app.locals.options.version} stopped at https://${app.locals.options.host}`);
    });
};
//# sourceMappingURL=logging.js.map