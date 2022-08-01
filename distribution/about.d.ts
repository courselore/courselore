import express from "express";
import { Courselore, IsSignedOutMiddlewareLocals, IsSignedInMiddlewareLocals } from "./index.js";
export declare type AboutHandler = express.RequestHandler<{}, any, {}, {}, IsSignedOutMiddlewareLocals & Partial<IsSignedInMiddlewareLocals>>;
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=about.d.ts.map