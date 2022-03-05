import url from "node:url";
import fs from "fs-extra";
import express from "express";
import nodemailer from "nodemailer";

import database, { DatabaseLocals } from "./database.js";
import logging from "./logging.js";

import globalMiddlewares, {
  GlobalMiddlewaresOptions,
} from "./global-middlewares.js";
export {
  BaseMiddlewareLocals,
  userFileExtensionsWhichMayBeShownInBrowser,
} from "./global-middlewares.js";

import eventSource, {
  EventSourceLocals,
  EventSourceMiddleware,
} from "./event-source.js";
export { EventSourceMiddlewareLocals } from "./event-source.js";

import layouts, {
  BaseLayout,
  BoxLayout,
  ApplicationLayout,
  MainLayout,
  SettingsLayout,
  LogoPartial,
  PartialLayout,
  SpinnerPartial,
  ReportIssueHrefPartial,
  FlashHelper,
} from "./layouts.js";

import authentication, {
  SessionHelper,
  IsSignedOutMiddleware,
  IsSignedInMiddleware,
  SignInHandler,
  PasswordResetHelper,
  AuthenticationOptions,
  EmailConfirmationMailer,
} from "./authentication.js";
export {
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./authentication.js";

import about, { AboutHandler } from "./about.js";

import user, { UserPartial, UserSettingsLayout } from "./user.js";
export {
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotifications,
  userEmailNotificationses,
} from "./user.js";

import course, {
  CoursePartial,
  EnrollmentRoleIconPartial,
  DefaultAccentColorHelper,
  IsEnrolledInCourseMiddleware,
  IsCourseStaffMiddleware,
  InvitationExistsMiddleware,
  MayManageInvitationMiddleware,
  IsInvitationUsableMiddleware,
  InvitationMailer,
  MayManageEnrollmentMiddleware,
  CourseSettingsLayout,
} from "./course.js";
export {
  EnrollmentRole,
  enrollmentRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  IsEnrolledInCourseMiddlewareLocals,
  IsCourseStaffMiddlewareLocals,
  InvitationExistsMiddlewareLocals,
  MayManageInvitationMiddlewareLocals,
  IsInvitationUsableMiddlewareLocals,
  MayManageEnrollmentMiddlewareLocals,
} from "./course.js";

import conversation, {
  ConversationLayout,
  ConversationPartial,
  ConversationTypeIconPartial,
  ConversationTypeTextColorPartial,
  GetConversationHelper,
  IsConversationAccessibleMiddleware,
  MayEditConversationHelper,
  MayEditConversationMiddleware,
} from "./conversation.js";
export {
  ConversationType,
  conversationTypes,
  AuthorEnrollment,
  AuthorEnrollmentUser,
  IsConversationAccessibleMiddlewareLocals,
  MayEditConversationMiddlewareLocals,
} from "./conversation.js";

import message, {
  GetMessageHelper,
  MessageExistsMiddleware,
  MayEditMessageHelper,
  MayEditMessageMiddleware,
  MayEndorseMessageHelper,
  MayEndorseMessageMiddleware,
  CourseRealTimeUpdater,
  NotificationsMailer,
} from "./message.js";
export {
  MessageExistsMiddlewareLocals,
  MayEditMessageMiddlewareLocals,
  MayEndorseMessageMiddlewareLocals,
} from "./message.js";

import content, {
  ContentPartial,
  ContentEditorPartial,
  MentionUserSearchHandler,
  ContentPreviewHandler,
} from "./content.js";

import email, { SendEmailWorker } from "./email.js";
import demonstration from "./demonstration.js";
import error from "./error.js";

import helpers, {
  EmailRegExpHelper,
  IsDateHelper,
  IsExpiredHelper,
  SanitizeSearchHelper,
  HighlightSearchResultHelper,
  SplitSearchPhrasesHelper,
  SplitFilterablePhrasesHelper,
} from "./helpers.js";

export interface Courselore extends express.Express {
  locals: {
    options: {
      version: string;
      canonicalBaseURL: string;
      metaCourseloreInvitation: string;
    } & Required<Options> &
      GlobalMiddlewaresOptions &
      AuthenticationOptions;
    handlers: {
      about: AboutHandler;
      signIn: SignInHandler;
      mentionUserSearch: MentionUserSearchHandler;
      contentPreview: ContentPreviewHandler;
    };
    middlewares: {
      eventSource: EventSourceMiddleware;
      isSignedOut: IsSignedOutMiddleware;
      isSignedIn: IsSignedInMiddleware;
      isEnrolledInCourse: IsEnrolledInCourseMiddleware;
      isCourseStaff: IsCourseStaffMiddleware;
      invitationExists: InvitationExistsMiddleware;
      mayManageInvitation: MayManageInvitationMiddleware;
      isInvitationUsable: IsInvitationUsableMiddleware;
      mayManageEnrollment: MayManageEnrollmentMiddleware;
      isConversationAccessible: IsConversationAccessibleMiddleware;
      mayEditConversation: MayEditConversationMiddleware;
      messageExists: MessageExistsMiddleware;
      mayEditMessage: MayEditMessageMiddleware;
      mayEndorseMessage: MayEndorseMessageMiddleware;
    };
    layouts: {
      base: BaseLayout;
      box: BoxLayout;
      application: ApplicationLayout;
      main: MainLayout;
      settings: SettingsLayout;
      partial: PartialLayout;
      userSettings: UserSettingsLayout;
      courseSettings: CourseSettingsLayout;
      conversation: ConversationLayout;
    };
    partials: {
      logo: LogoPartial;
      spinner: SpinnerPartial;
      reportIssueHref: ReportIssueHrefPartial;
      user: UserPartial;
      course: CoursePartial;
      enrollmentRoleIcon: EnrollmentRoleIconPartial;
      conversation: ConversationPartial;
      conversationTypeIcon: ConversationTypeIconPartial;
      conversationTypeTextColor: ConversationTypeTextColorPartial;
      content: ContentPartial;
      contentEditor: ContentEditorPartial;
    };
    helpers: {
      Flash: FlashHelper;
      Session: SessionHelper;
      PasswordReset: PasswordResetHelper;
      defaultAccentColor: DefaultAccentColorHelper;
      getConversation: GetConversationHelper;
      mayEditConversation: MayEditConversationHelper;
      getMessage: GetMessageHelper;
      mayEditMessage: MayEditMessageHelper;
      mayEndorseMessage: MayEndorseMessageHelper;
      emailRegExp: EmailRegExpHelper;
      isDate: IsDateHelper;
      isExpired: IsExpiredHelper;
      sanitizeSearch: SanitizeSearchHelper;
      highlightSearchResult: HighlightSearchResultHelper;
      splitSearchPhrases: SplitSearchPhrasesHelper;
      splitFilterablePhrases: SplitFilterablePhrasesHelper;
    };
    mailers: {
      emailConfirmation: EmailConfirmationMailer;
      invitation: InvitationMailer;
      notifications: NotificationsMailer;
    };
    workers: {
      sendEmail: SendEmailWorker;
    };
    realTimeUpdaters: {
      course: CourseRealTimeUpdater;
    };
  } & DatabaseLocals &
    EventSourceLocals;
}

export interface Options {
  dataDirectory: string;
  baseURL: string;
  administratorEmail: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  liveReload?: boolean;
}

export default async (options: Options): Promise<Courselore> => {
  const app = express() as Courselore;
  app.locals.options = Object.assign<any, any>(
    {
      version: JSON.parse(
        await fs.readFile(
          url.fileURLToPath(new URL("../package.json", import.meta.url)),
          "utf8"
        )
      ).version,
      canonicalBaseURL: "https://courselore.org",
      metaCourseloreInvitation:
        "https://courselore.org/courses/8537410611/invitations/3667859788",
      demonstration: process.env.NODE_ENV !== "production",
      liveReload: false,
    },
    options
  );
  app.locals.handlers = {} as any;
  app.locals.middlewares = {} as any;
  app.locals.layouts = {} as any;
  app.locals.partials = {} as any;
  app.locals.helpers = {} as any;
  app.locals.mailers = {} as any;
  app.locals.workers = {} as any;
  app.locals.realTimeUpdaters = {} as any;
  await database(app);
  logging(app);
  globalMiddlewares(app);
  eventSource(app);
  await layouts(app);
  authentication(app);
  about(app);
  user(app);
  course(app);
  conversation(app);
  message(app);
  await content(app);
  email(app);
  demonstration(app);
  error(app);
  helpers(app);
  return app;
};
