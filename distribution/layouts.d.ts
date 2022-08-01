import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, BaseMiddlewareLocals, IsSignedInMiddlewareLocals, IsEnrolledInCourseMiddlewareLocals } from "./index.js";
export declare type BaseLayout = ({ req, res, head, extraHeaders, body, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    head: HTML;
    extraHeaders?: HTML;
    body: HTML;
}) => HTML;
export declare type BoxLayout = ({ req, res, head, body, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    head: HTML;
    body: HTML;
}) => HTML;
export declare type ApplicationLayout = ({ req, res, head, showCourseSwitcher, extraHeaders, body, }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    head: HTML;
    showCourseSwitcher?: boolean;
    extraHeaders?: HTML;
    body: HTML;
}) => HTML;
export declare type MainLayout = ({ req, res, head, showCourseSwitcher, body, }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    head: HTML;
    showCourseSwitcher?: boolean;
    body: HTML;
}) => HTML;
export declare type SettingsLayout = ({ req, res, head, menuButton, menu, body, }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
    res: express.Response<any, IsSignedInMiddlewareLocals>;
    head: HTML;
    menuButton: HTML;
    menu: HTML;
    body: HTML;
}) => HTML;
export declare type LogoPartial = (options?: {
    size?: number;
}) => HTML;
export declare type PartialLayout = ({ req, res, body, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    body: HTML;
}) => HTML;
export declare type SpinnerPartial = ({ req, res, size, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    size?: number;
}) => HTML;
export declare type ReportIssueHrefPartial = string;
export interface FlashHelper {
    maxAge: number;
    set({ req, res, theme, content, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
        theme: string;
        content: HTML;
    }): void;
    get({ req, res, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
    }): {
        theme: string;
        content: HTML;
    } | undefined;
}
declare const _default: (app: Courselore) => Promise<void>;
export default _default;
//# sourceMappingURL=layouts.d.ts.map