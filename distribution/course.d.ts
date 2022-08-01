import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, BaseMiddlewareLocals, IsSignedInMiddlewareLocals } from "./index.js";
export declare type CourseRole = typeof courseRoles[number];
export declare const courseRoles: readonly ["student", "staff"];
export declare type EnrollmentAccentColor = typeof enrollmentAccentColors[number];
export declare const enrollmentAccentColors: readonly ["red", "yellow", "emerald", "sky", "violet", "pink"];
export declare type CoursePartial = ({ req, res, course, enrollment, tight, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    enrollment?: IsSignedInMiddlewareLocals["enrollments"][number];
    tight?: boolean;
}) => HTML;
export declare type CoursesPartial = ({ req, res, tight, }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    res: express.Response<any, IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>>;
    tight?: boolean;
}) => HTML;
export declare type CourseArchivedPartial = ({ req, res, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
}) => HTML;
export declare type IsEnrolledInCourseMiddleware = express.RequestHandler<{
    courseReference: string;
}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>[];
export interface IsEnrolledInCourseMiddlewareLocals extends IsSignedInMiddlewareLocals {
    enrollment: IsSignedInMiddlewareLocals["enrollments"][number];
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    conversationsCount: number;
    tags: {
        id: number;
        reference: string;
        name: string;
        staffOnlyAt: string | null;
    }[];
    actionAllowedOnArchivedCourse?: boolean;
}
export declare type IsCourseStaffMiddleware = express.RequestHandler<{
    courseReference: string;
}, any, {}, {}, IsCourseStaffMiddlewareLocals>[];
export interface IsCourseStaffMiddlewareLocals extends IsEnrolledInCourseMiddlewareLocals {
}
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=course.d.ts.map