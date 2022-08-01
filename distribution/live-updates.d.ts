import express from "express";
import { Database } from "@leafac/sqlite";
import { Courselore, BaseMiddlewareLocals, IsEnrolledInCourseMiddlewareLocals } from "./index.js";
export interface LiveUpdatesLocals {
    liveUpdates: {
        clients: Map<string, {
            req: express.Request<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>;
            res: express.Response<any, LiveUpdatesMiddlewareLocals>;
        }>;
        database: Database;
    };
}
export declare type LiveUpdatesMiddleware = express.RequestHandler<{}, any, {}, {}, LiveUpdatesMiddlewareLocals>[];
export interface LiveUpdatesMiddlewareLocals extends BaseMiddlewareLocals, IsEnrolledInCourseMiddlewareLocals {
}
export declare type LiveUpdatesDispatchHelper = ({ req, res, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
}) => Promise<void>;
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=live-updates.d.ts.map