import express from "express";
import nodemailer from "nodemailer";
import { DatabaseLocals } from "./database.js";
import { GlobalMiddlewaresOptions } from "./global-middlewares.js";
export { BaseMiddlewareLocals } from "./global-middlewares.js";
import { LiveUpdatesLocals, LiveUpdatesMiddleware, LiveUpdatesDispatchHelper } from "./live-updates.js";
export { LiveUpdatesMiddlewareLocals } from "./live-updates.js";
import { BaseLayout, BoxLayout, ApplicationLayout, MainLayout, SettingsLayout, LogoPartial, PartialLayout, SpinnerPartial, ReportIssueHrefPartial, FlashHelper } from "./layouts.js";
import { AuthenticationOptions, SessionHelper, IsSignedOutMiddleware, IsSignedInMiddleware, EmailVerificationMailer } from "./authentication.js";
export { IsSignedOutMiddlewareLocals, IsSignedInMiddlewareLocals, } from "./authentication.js";
import { AdministrationOptions } from "./administration.js";
export { UserSystemRolesWhoMayCreateCourses, userSystemRolesWhoMayCreateCourseses, SystemRole, systemRoles, } from "./administration.js";
import { AboutHandler } from "./about.js";
import { UserPartial } from "./user.js";
export { UserAvatarlessBackgroundColor, userAvatarlessBackgroundColors, UserEmailNotificationsDigestsFrequency, userEmailNotificationsDigestsFrequencies, } from "./user.js";
import { CoursePartial, CoursesPartial, CourseArchivedPartial, IsEnrolledInCourseMiddleware, IsCourseStaffMiddleware } from "./course.js";
export { CourseRole, courseRoles, EnrollmentAccentColor, enrollmentAccentColors, IsEnrolledInCourseMiddlewareLocals, IsCourseStaffMiddlewareLocals, } from "./course.js";
import { ConversationLayout, ConversationPartial, GetConversationHelper, IsConversationAccessibleMiddleware } from "./conversation.js";
export { ConversationType, conversationTypes, AuthorEnrollment, AuthorEnrollmentUser, IsConversationAccessibleMiddlewareLocals, } from "./conversation.js";
import { GetMessageHelper, MayEditMessageHelper, MayEndorseMessageHelper, NotificationsMailer } from "./message.js";
import { ContentPartial, ContentEditorPartial } from "./content.js";
import { SendEmailWorker } from "./email.js";
import { EmailRegExpHelper, IsDateHelper, IsExpiredHelper, SanitizeSearchHelper, HighlightSearchResultHelper, SplitFilterablePhrasesHelper } from "./helpers.js";
export interface Courselore extends express.Express {
    locals: {
        options: {
            version: string;
            canonicalHost: string;
            metaCourseloreInvitation: string;
            tryHost: string;
        } & Options & GlobalMiddlewaresOptions & AuthenticationOptions & AdministrationOptions;
        handlers: {
            about: AboutHandler;
        };
        middlewares: {
            liveUpdates: LiveUpdatesMiddleware;
            isSignedOut: IsSignedOutMiddleware;
            isSignedIn: IsSignedInMiddleware;
            isEnrolledInCourse: IsEnrolledInCourseMiddleware;
            isCourseStaff: IsCourseStaffMiddleware;
            isConversationAccessible: IsConversationAccessibleMiddleware;
        };
        layouts: {
            base: BaseLayout;
            box: BoxLayout;
            application: ApplicationLayout;
            main: MainLayout;
            settings: SettingsLayout;
            partial: PartialLayout;
            conversation: ConversationLayout;
        };
        partials: {
            logo: LogoPartial;
            spinner: SpinnerPartial;
            reportIssueHref: ReportIssueHrefPartial;
            user: UserPartial;
            course: CoursePartial;
            courses: CoursesPartial;
            courseArchived: CourseArchivedPartial;
            conversation: ConversationPartial;
            content: ContentPartial;
            contentEditor: ContentEditorPartial;
        };
        helpers: {
            liveUpdatesDispatch: LiveUpdatesDispatchHelper;
            Flash: FlashHelper;
            Session: SessionHelper;
            getConversation: GetConversationHelper;
            getMessage: GetMessageHelper;
            mayEditMessage: MayEditMessageHelper;
            mayEndorseMessage: MayEndorseMessageHelper;
            emailRegExp: EmailRegExpHelper;
            isDate: IsDateHelper;
            isExpired: IsExpiredHelper;
            sanitizeSearch: SanitizeSearchHelper;
            highlightSearchResult: HighlightSearchResultHelper;
            splitFilterablePhrases: SplitFilterablePhrasesHelper;
        };
        mailers: {
            emailVerification: EmailVerificationMailer;
            notifications: NotificationsMailer;
        };
        workers: {
            sendEmail: SendEmailWorker;
        };
    } & DatabaseLocals & LiveUpdatesLocals;
}
export interface Options {
    host: string;
    administratorEmail: string;
    dataDirectory: string;
    sendMail: ((mailOptions: nodemailer.SendMailOptions) => Promise<nodemailer.SentMessageInfo>) & {
        options: any;
        defaults: nodemailer.SendMailOptions & {
            from: {
                name: string;
                address: string;
            };
        };
    };
    environment: "default" | "development" | "production";
    demonstration: boolean;
}
declare const _default: (options: Options) => Promise<Courselore>;
export default _default;
//# sourceMappingURL=index.d.ts.map