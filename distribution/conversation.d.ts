import express from "express";
import { HTML } from "@leafac/html";
import { Courselore, UserAvatarlessBackgroundColor, CourseRole, IsEnrolledInCourseMiddlewareLocals } from "./index.js";
export declare type ConversationType = typeof conversationTypes[number];
export declare const conversationTypes: readonly ["question", "note", "chat"];
export declare type AuthorEnrollment = {
    id: number;
    user: AuthorEnrollmentUser;
    reference: string;
    courseRole: CourseRole;
} | "no-longer-enrolled";
export declare type AuthorEnrollmentUser = {
    id: number;
    lastSeenOnlineAt: string;
    reference: string;
    email: string;
    name: string;
    avatar: string | null;
    avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
    biographySource: string | null;
    biographyPreprocessed: HTML | null;
};
export declare type ConversationLayout = ({ req, res, head, sidebarOnSmallScreen, mainIsAScrollingPane, body, }: {
    req: express.Request<{
        courseReference: string;
        conversationReference?: string;
    }, HTML, {}, {
        conversations?: {
            conversationsPage?: string;
            search?: string;
            filters?: {
                isQuick?: "true";
                isUnread?: "true" | "false";
                types?: ConversationType[];
                isResolved?: "true" | "false";
                isPinned?: "true" | "false";
                isStaffOnly?: "true" | "false";
                tagsReferences?: string[];
            };
        };
        messages?: object;
        newConversation?: object;
    }, IsEnrolledInCourseMiddlewareLocals & Partial<IsConversationAccessibleMiddlewareLocals>>;
    res: express.Response<HTML, IsEnrolledInCourseMiddlewareLocals & Partial<IsConversationAccessibleMiddlewareLocals>>;
    head: HTML;
    sidebarOnSmallScreen?: boolean;
    mainIsAScrollingPane?: boolean;
    body: HTML;
}) => HTML;
export declare type ConversationPartial = ({ req, res, conversation, searchResult, message, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getConversation"]>>;
    searchResult?: {
        type: "conversationTitle";
        highlight: HTML;
    } | {
        type: "messageAuthorUserName";
        message: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
        highlight: HTML;
    } | {
        type: "messageContent";
        message: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
        snippet: HTML;
    };
    message?: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getMessage"]>>;
}) => HTML;
export declare type GetConversationHelper = ({ req, res, conversationReference, }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversationReference: string;
}) => {
    id: number;
    createdAt: string;
    updatedAt: string | null;
    reference: string;
    authorEnrollment: AuthorEnrollment;
    anonymousAt: string | null;
    type: ConversationType;
    resolvedAt: string | null;
    pinnedAt: string | null;
    staffOnlyAt: string | null;
    title: string;
    titleSearch: string;
    nextMessageReference: number;
    taggings: {
        id: number;
        tag: {
            id: number;
            reference: string;
            name: string;
            staffOnlyAt: string | null;
        };
    }[];
    messagesCount: number;
    readingsCount: number;
    endorsements: {
        id: number;
        enrollment: AuthorEnrollment;
    }[];
} | undefined;
export declare type IsConversationAccessibleMiddleware = express.RequestHandler<{
    courseReference: string;
    conversationReference: string;
}, HTML, {}, {}, IsConversationAccessibleMiddlewareLocals>[];
export interface IsConversationAccessibleMiddlewareLocals extends IsEnrolledInCourseMiddlewareLocals {
    conversation: NonNullable<ReturnType<Courselore["locals"]["helpers"]["getConversation"]>>;
}
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=conversation.d.ts.map