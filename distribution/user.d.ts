import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, BaseMiddlewareLocals, IsEnrolledInCourseMiddlewareLocals, AuthorEnrollment, AuthorEnrollmentUser } from "./index.js";
export declare type UserAvatarlessBackgroundColor = typeof userAvatarlessBackgroundColors[number];
export declare const userAvatarlessBackgroundColors: readonly ["red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
export declare type UserEmailNotificationsDigestsFrequency = typeof userEmailNotificationsDigestsFrequencies[number];
export declare const userEmailNotificationsDigestsFrequencies: readonly ["hourly", "daily"];
export declare type UserPartial = ({ req, res, enrollment, user, anonymous, avatar, decorate, name, tooltip, size, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    enrollment?: AuthorEnrollment;
    user?: AuthorEnrollmentUser | "no-longer-enrolled";
    anonymous?: boolean | "reveal";
    avatar?: boolean;
    decorate?: boolean;
    name?: boolean | string;
    tooltip?: boolean;
    size?: "xs" | "sm" | "xl";
}) => HTML;
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=user.d.ts.map