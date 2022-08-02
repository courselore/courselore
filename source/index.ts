import url from "node:url";
import fs from "fs-extra";
import express from "express";
import nodemailer from "nodemailer";

import database, { DatabaseLocals } from "./database.js";
import logging from "./logging.js";

import globalMiddlewares, {
  GlobalMiddlewaresOptions,
} from "./global-middlewares.js";
export { BaseMiddlewareLocals } from "./global-middlewares.js";

import liveUpdates, {
  LiveUpdatesLocals,
  LiveUpdatesMiddleware,
  LiveUpdatesDispatchHelper,
} from "./live-updates.js";
export { LiveUpdatesMiddlewareLocals } from "./live-updates.js";

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
  AuthenticationOptions,
  SessionHelper,
  IsSignedOutMiddleware,
  IsSignedInMiddleware,
  EmailVerificationMailer,
} from "./authentication.js";
export {
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./authentication.js";

import administrator, { AdministrationOptions } from "./administration.js";
export {
  UserSystemRolesWhoMayCreateCourses,
  userSystemRolesWhoMayCreateCourseses,
  SystemRole,
  systemRoles,
} from "./administration.js";

import about, { AboutHandler } from "./about.js";

import user, { UserPartial } from "./user.js";
export {
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotificationsForAllMessages,
  userEmailNotificationsForAllMessageses,
} from "./user.js";

import course, {
  CoursePartial,
  CoursesPartial,
  CourseArchivedPartial,
  IsEnrolledInCourseMiddleware,
  IsCourseStaffMiddleware,
} from "./course.js";
export {
  CourseRole,
  courseRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  IsEnrolledInCourseMiddlewareLocals,
  IsCourseStaffMiddlewareLocals,
} from "./course.js";

import conversation, {
  ConversationLayout,
  ConversationPartial,
  GetConversationHelper,
  IsConversationAccessibleMiddleware,
} from "./conversation.js";
export {
  ConversationType,
  conversationTypes,
  AuthorEnrollment,
  AuthorEnrollmentUser,
  IsConversationAccessibleMiddlewareLocals,
} from "./conversation.js";

import message, {
  GetMessageHelper,
  MayEditMessageHelper,
  MayEndorseMessageHelper,
  NotificationsMailer,
} from "./message.js";

import content, {
  ContentPreprocessedPartial,
  ContentPartial,
  TODO,
  ContentEditorPartial,
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
  SplitFilterablePhrasesHelper,
} from "./helpers.js";

export interface Courselore extends express.Express {
  locals: {
    options: {
      version: string;
      canonicalHost: string;
      metaCourseloreInvitation: string;
      tryHost: string;
    } & Options &
      GlobalMiddlewaresOptions &
      AuthenticationOptions &
      AdministrationOptions;
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
      contentPreprocessed: ContentPreprocessedPartial;
      content: ContentPartial;
      TODO: TODO;
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
  } & DatabaseLocals &
    LiveUpdatesLocals;
}

export interface Options {
  host: string;
  administratorEmail: string;
  dataDirectory: string;
  sendMail: ((
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>) & {
    options: any;
    defaults: nodemailer.SendMailOptions & {
      from: { name: string; address: string };
    };
  };
  environment: "default" | "development" | "production";
  demonstration: boolean;
}

export default async (options: Options): Promise<Courselore> => {
  const app = express() as Courselore;
  app.locals.options = {
    ...options,
    version: JSON.parse(
      await fs.readFile(
        url.fileURLToPath(new URL("../package.json", import.meta.url)),
        "utf8"
      )
    ).version,
    canonicalHost: "courselore.org",
    metaCourseloreInvitation:
      "https://courselore.org/courses/8537410611/invitations/3667859788",
    tryHost: "try.courselore.org",
  } as any;
  app.locals.handlers = {} as any;
  app.locals.middlewares = {} as any;
  app.locals.layouts = {} as any;
  app.locals.partials = {} as any;
  app.locals.helpers = {} as any;
  app.locals.mailers = {} as any;
  app.locals.workers = {} as any;
  await database(app);
  logging(app);
  globalMiddlewares(app);
  liveUpdates(app);
  await layouts(app);
  authentication(app);
  administrator(app);
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
