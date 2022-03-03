#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import fs from "fs-extra";
import express from "express";
import nodemailer from "nodemailer";
import database, { databaseLocals } from "./database.js";
import logging from "./logging.js";
import globalMiddlewares, {
  globalMiddlewaresOptions,
} from "./global-middlewares.js";
export {
  baseMiddlewareLocals,
  userFileExtensionsWhichMayBeShownInBrowser,
} from "./global-middlewares.js";
import eventSource, {
  eventSourceLocals,
  eventSourceMiddleware,
} from "./event-source.js";
export { eventSourceMiddlewareLocals } from "./event-source.js";
import layouts, {
  baseLayout,
  boxLayout,
  applicationLayout,
  mainLayout,
  settingsLayout,
  logoPartial,
  partialLayout,
  spinnerPartial,
  reportIssueHrefPartial,
  FlashHelper,
} from "./layouts.js";
import authentication, {
  SessionHelper,
  isSignedOutMiddleware,
  isSignedInMiddleware,
  signInHandler,
  PasswordResetHelper,
  authenticationOptions,
  emailConfirmationMailer,
} from "./authentication.js";
export {
  isSignedOutMiddlewareLocals,
  isSignedInMiddlewareLocals,
} from "./authentication.js";
import about, { aboutHandler } from "./about.js";
import user, { userPartial, userSettingsLayout } from "./user.js";
export {
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotifications,
  userEmailNotificationses,
} from "./user.js";
import course, {
  coursePartial,
  enrollmentRoleIconPartial,
  defaultAccentColorHelper,
  isEnrolledInCourseMiddleware,
  isCourseStaffMiddleware,
  invitationExistsMiddleware,
  mayManageInvitationMiddleware,
  isInvitationUsableMiddleware,
  invitationMailer,
  mayManageEnrollmentMiddleware,
  courseSettingsLayout,
} from "./course.js";
export {
  EnrollmentRole,
  enrollmentRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  isEnrolledInCourseMiddlewareLocals,
  isCourseStaffMiddlewareLocals,
  invitationExistsMiddlewareLocals,
  mayManageInvitationMiddlewareLocals,
  isInvitationUsableMiddlewareLocals,
  mayManageEnrollmentMiddlewareLocals,
} from "./course.js";
import conversation, {
  conversationLayout,
  conversationPartial,
  conversationTypeIconPartial,
  conversationTypeTextColorPartial,
  getConversationHelper,
  isConversationAccessibleMiddleware,
  mayEditConversationHelper,
  mayEditConversationMiddleware,
} from "./conversation.js";
export {
  ConversationType,
  conversationTypes,
  conversationTypeIcon,
  conversationTypeTextColor,
  AuthorEnrollment,
  AuthorEnrollmentUser,
  isConversationAccessibleMiddlewareLocals,
  mayEditConversationMiddlewareLocals,
} from "./conversation.js";
import message from "./message.js";
export {} from "./message.js";
import content from "./content.js";
import email from "./email.js";
import demonstration from "./demonstration.js";
import error from "./error.js";
import helpers from "./helpers.js";

export interface Courselore extends express.Express {
  locals: {
    options: {
      version: string;
      canonicalBaseURL: string;
      metaCourseloreInvitation: string;
    } & Required<Options> &
      globalMiddlewaresOptions &
      authenticationOptions;
    handlers: {
      about: aboutHandler;
      signIn: signInHandler;
    };
    middlewares: {
      eventSource: eventSourceMiddleware;
      isSignedOut: isSignedOutMiddleware;
      isSignedIn: isSignedInMiddleware;
      isEnrolledInCourse: isEnrolledInCourseMiddleware;
      isCourseStaff: isCourseStaffMiddleware;
      invitationExists: invitationExistsMiddleware;
      mayManageInvitation: mayManageInvitationMiddleware;
      isInvitationUsable: isInvitationUsableMiddleware;
      mayManageEnrollment: mayManageEnrollmentMiddleware;
      isConversationAccessible: isConversationAccessibleMiddleware;
      mayEditConversation: mayEditConversationMiddleware;
    };
    layouts: {
      base: baseLayout;
      box: boxLayout;
      application: applicationLayout;
      main: mainLayout;
      settings: settingsLayout;
      partial: partialLayout;
      userSettings: userSettingsLayout;
      courseSettings: courseSettingsLayout;
      conversation: conversationLayout;
    };
    partials: {
      logo: logoPartial;
      spinner: spinnerPartial;
      reportIssueHref: reportIssueHrefPartial;
      user: userPartial;
      course: coursePartial;
      enrollmentRoleIcon: enrollmentRoleIconPartial;
      conversation: conversationPartial;
      conversationTypeIcon: conversationTypeIconPartial;
      conversationTypeTextColor: conversationTypeTextColorPartial;
      content: any; // TODO
      contentEditor: any; // TODO
    };
    helpers: {
      Flash: FlashHelper;
      Session: SessionHelper;
      PasswordReset: PasswordResetHelper;
      defaultAccentColor: defaultAccentColorHelper;
      getConversation: getConversationHelper;
      mayEditConversation: mayEditConversationHelper;
      getMessage: any; // TODO
      emailRegExp: any; // TODO
      isExpired: any; // TODO
      isDate: any; // TODO
      splitFilterablePhrases: any; // TODO
      sanitizeSearch: any; // TODO
      highlightSearchResult: any; // TODO
    };
    mailers: {
      emailConfirmation: emailConfirmationMailer;
      invitation: invitationMailer;
    };
    workers: {
      sendEmail: any; // TODO
    };
  } & databaseLocals &
    eventSourceLocals;
}

export interface Options {
  dataDirectory: string;
  baseURL: string;
  administratorEmail: string;
  sendMail: (
    mailOptions: nodemailer.SendMailOptions
  ) => Promise<nodemailer.SentMessageInfo>;
  demonstration?: boolean;
  hotReload?: boolean;
}

export default async function courselore(
  options: Options
): Promise<Courselore> {
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
      hotReload: false,
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
  content(app);
  email(app);
  demonstration(app);
  error(app);
  helpers(app);
  return app;
}

if (import.meta.url.endsWith(process.argv[1]))
  await (
    await import(
      process.argv[2] === undefined
        ? url.fileURLToPath(
            new URL("../configuration/development.js", import.meta.url)
          )
        : path.resolve(process.argv[2])
    )
  ).default({
    courseloreImport: async (modulePath: string) => await import(modulePath),
    courseloreImportMetaURL: import.meta.url,
  });
