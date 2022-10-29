import url from "node:url";
import fs from "fs-extra";
import express from "express";
import nodemailer from "nodemailer";

import logging from "./logging.mjs";
import database, { DatabaseLocals } from "./database.mjs";

import globalMiddlewares, {
  GlobalMiddlewaresOptions,
} from "./global-middlewares.mjs";
export { BaseMiddlewareLocals } from "./global-middlewares.mjs";

import healthChecks from "./health-checks.mjs";

import liveUpdates, {
  LiveUpdatesMiddleware,
  LiveUpdatesDispatchHelper,
} from "./live-updates.mjs";
export { LiveUpdatesMiddlewareLocals } from "./live-updates.mjs";

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
} from "./layouts.mjs";

import authentication, {
  AuthenticationOptions,
  SessionHelper,
  IsSignedOutMiddleware,
  IsSignedInMiddleware,
  HasPasswordConfirmationMiddleware,
  EmailVerificationMailer,
} from "./authentication.mjs";
export {
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  HasPasswordConfirmationMiddlewareLocals,
} from "./authentication.mjs";

import administration from "./administration.mjs";
export {
  UserSystemRolesWhoMayCreateCourses,
  userSystemRolesWhoMayCreateCourseses,
  SystemRole,
  systemRoles,
} from "./administration.mjs";

import about, { AboutHandler } from "./about.mjs";

import user, { UserPartial } from "./user.mjs";
export {
  User,
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotificationsForAllMessages,
  userEmailNotificationsForAllMessageses,
} from "./user.mjs";

import course, {
  CoursePartial,
  CoursesPartial,
  CourseArchivedPartial,
  IsEnrolledInCourseMiddleware,
  IsCourseStaffMiddleware,
} from "./course.mjs";
export {
  Enrollment,
  MaybeEnrollment,
  CourseRole,
  courseRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  IsEnrolledInCourseMiddlewareLocals,
  IsCourseStaffMiddlewareLocals,
} from "./course.mjs";

import conversation, {
  ConversationLayout,
  ConversationPartial,
  GetConversationHelper,
  IsConversationAccessibleMiddleware,
} from "./conversation.mjs";
export {
  ConversationParticipants,
  conversationParticipantses,
  ConversationType,
  conversationTypes,
  IsConversationAccessibleMiddlewareLocals,
} from "./conversation.mjs";

import message, {
  GetMessageHelper,
  MayEditMessageHelper,
  MayEndorseMessageHelper,
  EmailNotificationsMailer,
} from "./message.mjs";

import content, {
  ContentPreprocessedPartial,
  ContentPartial,
  ContentEditorPartial,
} from "./content.mjs";

import email, { SendEmailWorker } from "./email.mjs";
import demonstration from "./demonstration.mjs";
import error from "./error.mjs";

import helpers, {
  EmailRegExpHelper,
  IsDateHelper,
  IsExpiredHelper,
  SanitizeSearchHelper,
  HighlightSearchResultHelper,
  SplitFilterablePhrasesHelper,
} from "./helpers.mjs";

export interface Courselore extends express.Express {
  locals: {
    options: {
      version: string;
      static: { [file: string]: string };
      canonicalHostname: string;
      metaCourseloreInvitation: string;
      tryHostname: string;
    } & Options &
      GlobalMiddlewaresOptions &
      AuthenticationOptions;
    handlers: {
      about: AboutHandler;
    };
    middlewares: {
      liveUpdates: LiveUpdatesMiddleware;
      isSignedOut: IsSignedOutMiddleware;
      isSignedIn: IsSignedInMiddleware;
      hasPasswordConfirmation: HasPasswordConfirmationMiddleware;
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
      emailNotifications: EmailNotificationsMailer;
    };
    workers: {
      sendEmail: SendEmailWorker;
    };
  } & DatabaseLocals;
}

export interface Options {
  processType: "main" | "server" | "worker";
  hostname: string;
  administratorEmail: string;
  dataDirectory: string;
  email: {
    options: Parameters<typeof nodemailer.createTransport>[0];
    defaults: Parameters<typeof nodemailer.createTransport>[1];
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
        url.fileURLToPath(new URL("../../package.json", import.meta.url)),
        "utf8"
      )
    ).version,
    static: JSON.parse(
      await fs.readFile(
        url.fileURLToPath(new URL("../static/paths.json", import.meta.url)),
        "utf8"
      )
    ),
    canonicalHostname: "courselore.org",
    metaCourseloreInvitation: "https://meta.courselore.org",
    tryHostname: "try.courselore.org",
  } as any;

  // import filenamify from "filenamify";
  // sendMail: ((
  //   mailOptions: nodemailer.SendMailOptions
  // ) => Promise<nodemailer.SentMessageInfo>) & {
  //   options: any;
  //   defaults: nodemailer.SendMailOptions & {
  //     from: { name: string; address: string };
  //   };
  // };
  // if (typeof sendMail !== "function") {
  //   const { options, defaults } = sendMail;
  //   const transport = nodemailer.createTransport(options, defaults);
  //   sendMail =
  //     options.streamTransport && options.buffer
  //       ? async (mailOptions: any) => {
  //           const sentMessageInfo = await transport.sendMail(mailOptions);
  //           await fs.outputFile(
  //             path.join(
  //               dataDirectory,
  //               "emails",
  //               filenamify(
  //                 `${new Date().toISOString()}--${mailOptions.to}.eml`,
  //                 {
  //                   replacement: "-",
  //                 }
  //               )
  //             ),
  //             (sentMessageInfo as any).message
  //           );
  //           return sentMessageInfo;
  //         }
  //       : async (mailOptions: any) => await transport.sendMail(mailOptions);
  //   sendMail.options = options;
  //   sendMail.defaults = defaults;
  // }
  app.locals.handlers = {} as any;
  app.locals.middlewares = {} as any;
  app.locals.layouts = {} as any;
  app.locals.partials = {} as any;
  app.locals.helpers = {} as any;
  app.locals.mailers = {} as any;
  app.locals.workers = {} as any;
  await logging(app);
  await database(app);
  await globalMiddlewares(app);
  await healthChecks(app);
  await liveUpdates(app);
  await layouts(app);
  await authentication(app);
  await administration(app);
  await about(app);
  await user(app);
  await course(app);
  await conversation(app);
  await message(app);
  await content(app);
  await email(app);
  await demonstration(app);
  await error(app);
  await helpers(app);
  return app;
};
