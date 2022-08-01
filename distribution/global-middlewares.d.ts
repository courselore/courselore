import express from "express";
import { localCSS } from "@leafac/css";
import { HTMLForJavaScript } from "@leafac/javascript";
import { Courselore } from "./index.js";
export interface GlobalMiddlewaresOptions {
    cookies: express.CookieOptions;
}
export interface BaseMiddlewareLocals {
    loggingStartTime: bigint;
    css: ReturnType<typeof localCSS>;
    html: ReturnType<typeof HTMLForJavaScript>;
    liveUpdatesNonce: string | undefined;
}
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=global-middlewares.d.ts.map