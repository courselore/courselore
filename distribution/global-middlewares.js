import express from "express";
import cookieParser from "cookie-parser";
import expressFileUpload from "express-fileupload";
import csurf from "csurf";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
export default (app) => {
    app.use((req, res, next) => {
        res.locals.css = localCSS();
        res.locals.html = HTMLForJavaScript();
        next();
    });
    app.use(cookieParser());
    app.locals.options.cookies = (() => {
        const url = new URL(`https://${app.locals.options.host}`);
        return {
            domain: url.hostname,
            httpOnly: true,
            path: url.pathname,
            sameSite: "lax",
            secure: true,
        };
    })();
    app.use(express.urlencoded({ extended: true }));
    app.use(expressFileUpload({
        createParentPath: true,
        limits: { fileSize: 10 * 1024 * 1024 },
    }));
    app.use(csurf({
        cookie: {
            ...app.locals.options.cookies,
            maxAge: 30 * 24 * 60 * 60,
        },
    }));
    if (app.locals.options.environment === "development")
        app.get("/live-reload", (req, res) => {
            let heartbeatTimeout;
            (function heartbeat() {
                res.write("\n");
                heartbeatTimeout = setTimeout(heartbeat, 15 * 1000);
            })();
            res.once("close", () => {
                clearTimeout(heartbeatTimeout);
            });
        });
};
//# sourceMappingURL=global-middlewares.js.map