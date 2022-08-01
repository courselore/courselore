import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, IsEnrolledInCourseMiddlewareLocals, AuthorEnrollment, IsConversationAccessibleMiddlewareLocals } from "./index.js";
export declare type GetMessageHelper = ({ req, res, conversation, messageReference, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getConversation"]>>;
    messageReference: string;
}) => {
    id: number;
    createdAt: string;
    updatedAt: string | null;
    reference: string;
    authorEnrollment: AuthorEnrollment;
    anonymousAt: string | null;
    answerAt: string | null;
    contentSource: string;
    contentPreprocessed: HTML;
    contentSearch: string;
    reading: {
        id: number;
    } | null;
    readings: {
        id: number;
        createdAt: string;
        enrollment: AuthorEnrollment;
    }[];
    endorsements: {
        id: number;
        enrollment: AuthorEnrollment;
    }[];
    likes: {
        id: number;
        enrollment: AuthorEnrollment;
    }[];
} | undefined;
export declare type MayEditMessageHelper = ({ req, res, message, }: {
    req: express.Request<{
        courseReference: string;
        conversationReference: string;
    }, any, {}, {}, IsConversationAccessibleMiddlewareLocals>;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
}) => boolean;
export declare type MayEndorseMessageHelper = ({ req, res, message, }: {
    req: express.Request<{
        courseReference: string;
        conversationReference: string;
    }, any, {}, {}, IsConversationAccessibleMiddlewareLocals>;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
}) => boolean;
export declare type CourseLiveUpdater = ({ req, res, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
}) => Promise<void>;
export declare type NotificationsMailer = ({ req, res, conversation, message, mentions, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getConversation"]>>;
    message: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
    mentions: Set<string>;
}) => void;
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=message.d.ts.map