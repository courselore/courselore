import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, BaseMiddlewareLocals, IsEnrolledInCourseMiddlewareLocals, IsConversationAccessibleMiddlewareLocals } from "./index.js";
export declare type ContentPartial = ({ req, res, type, content, decorate, search, }: {
    req: express.Request<{}, any, {}, {
        conversations?: object;
    }, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    type: "source" | "preprocessed";
    content: string;
    decorate?: boolean;
    search?: string | string[] | undefined;
}) => {
    preprocessed: HTML | undefined;
    search: string | undefined;
    processed: HTML;
    mentions: Set<string> | undefined;
};
export declare type ContentEditorPartial = ({ req, res, name, contentSource, required, compact, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals> & Partial<IsConversationAccessibleMiddlewareLocals>>;
    res: express.Response<any, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals> & Partial<IsConversationAccessibleMiddlewareLocals>>;
    name?: string;
    contentSource?: string;
    required?: boolean;
    compact?: boolean;
}) => HTML;
declare const _default: (app: Courselore) => Promise<void>;
export default _default;
//# sourceMappingURL=content.d.ts.map