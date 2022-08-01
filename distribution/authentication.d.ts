import express from "express";
import { HTML } from "@leafac/html";
import argon2 from "argon2";
import { Courselore, BaseMiddlewareLocals, UserAvatarlessBackgroundColor, UserEmailNotificationsDigestsFrequency, CourseRole, EnrollmentAccentColor, SystemRole } from "./index.js";
export interface AuthenticationOptions {
    argon2: argon2.Options & {
        raw?: false;
    };
}
export interface SessionHelper {
    maxAge: number;
    open({ req, res, userId, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
        userId: number;
    }): void;
    get({ req, res, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
    }): number | undefined;
    close({ req, res, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
    }): void;
    closeAllAndReopen({ req, res, userId, }: {
        req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
        res: express.Response<any, BaseMiddlewareLocals>;
        userId: number;
    }): void;
}
export declare type IsSignedOutMiddleware = express.RequestHandler<{}, any, {}, {}, IsSignedOutMiddlewareLocals>[];
export interface IsSignedOutMiddlewareLocals extends BaseMiddlewareLocals {
}
export declare type IsSignedInMiddleware = express.RequestHandler<{}, any, {}, {}, IsSignedInMiddlewareLocals>[];
export interface IsSignedInMiddlewareLocals extends BaseMiddlewareLocals {
    user: {
        id: number;
        lastSeenOnlineAt: string;
        reference: string;
        email: string;
        password: string;
        emailVerifiedAt: string | null;
        name: string;
        avatar: string | null;
        avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
        biographySource: string | null;
        biographyPreprocessed: HTML | null;
        systemRole: SystemRole;
        emailNotificationsForAllMessagesAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt: string | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
        emailNotificationsDigestsFrequency: UserEmailNotificationsDigestsFrequency | null;
    };
    invitations: {
        id: number;
        course: {
            id: number;
            reference: string;
            archivedAt: string | null;
            name: string;
            year: string | null;
            term: string | null;
            institution: string | null;
            code: string | null;
            nextConversationReference: number;
        };
        reference: string;
        courseRole: CourseRole;
    }[];
    enrollments: {
        id: number;
        course: {
            id: number;
            reference: string;
            archivedAt: string | null;
            name: string;
            year: string | null;
            term: string | null;
            institution: string | null;
            code: string | null;
            nextConversationReference: number;
        };
        reference: string;
        courseRole: CourseRole;
        accentColor: EnrollmentAccentColor;
    }[];
    mayCreateCourses: boolean;
}
export declare type EmailVerificationMailer = ({ req, res, userId, userEmail, }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    userId: number;
    userEmail: string;
}) => void;
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=authentication.d.ts.map