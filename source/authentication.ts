import express from "express";
import qs from "qs";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import lodash from "lodash";
import {
  Courselore,
  BaseMiddlewareLocals,
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotificationsForAllMessages,
  CourseRole,
  EnrollmentAccentColor,
  SystemRole,
} from "./index.js";

export interface AuthenticationOptions {
  argon2: argon2.Options & { raw?: false };
}

export interface SessionHelper {
  maxAge: number;
  open({
    req,
    res,
    userId,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    userId: number;
  }): void;
  get({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
  }): number | undefined;
  close({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
  }): void;
  closeAllAndReopen({
    req,
    res,
    userId,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    userId: number;
  }): void;
}

export type IsSignedOutMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  IsSignedOutMiddlewareLocals
>[];
export interface IsSignedOutMiddlewareLocals extends BaseMiddlewareLocals {}

export type IsSignedInMiddleware = express.RequestHandler<
  {},
  any,
  {},
  {},
  IsSignedInMiddlewareLocals
>[];
export interface IsSignedInMiddlewareLocals extends BaseMiddlewareLocals {
  actionAllowedToUserWithUnverifiedEmail?: boolean;
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
    emailNotificationsForAllMessages: UserEmailNotificationsForAllMessages;
    emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
    emailNotificationsForMentionsAt: string | null;
    emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
      | string
      | null;
    emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
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

export type EmailVerificationMailer = ({
  req,
  res,
  userId,
  userEmail,
}: {
  req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
  res: express.Response<any, BaseMiddlewareLocals>;
  userId: number;
  userEmail: string;
}) => void;

export default (app: Courselore): void => {
  app.locals.helpers.Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open({ req, res, userId }) {
      const session = app.locals.database.get<{
        token: string;
      }>(
        sql`
          INSERT INTO "sessions" ("createdAt", "token", "user")
          VALUES (
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })},
            ${userId}
          )
          RETURNING *
        `
      )!;
      req.cookies.session = session.token;
      res.cookie("session", session.token, {
        ...app.locals.options.cookies,
        maxAge: app.locals.helpers.Session.maxAge,
      });
    },

    get({ req, res }) {
      if (req.cookies.session === undefined) return undefined;
      const session = app.locals.database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() <
          Date.now() - app.locals.helpers.Session.maxAge
      ) {
        app.locals.helpers.Session.close({ req, res });
        return undefined;
      } else if (
        req.header("Live-Updates") === undefined &&
        new Date(session.createdAt).getTime() <
          Date.now() - app.locals.helpers.Session.maxAge / 2
      ) {
        app.locals.helpers.Session.close({ req, res });
        app.locals.helpers.Session.open({ req, res, userId: session.user });
      }
      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "lastSeenOnlineAt" = ${new Date().toISOString()}
          WHERE "id" = ${session.user}
        `
      );
      return session.user;
    },

    close({ req, res }) {
      if (req.cookies.session === undefined) return;
      delete req.cookies.session;
      res.clearCookie("session", app.locals.options.cookies);
      app.locals.database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
    },

    closeAllAndReopen({ req, res, userId }) {
      app.locals.helpers.Session.close({ req, res });
      app.locals.database.run(
        sql`DELETE FROM "sessions" WHERE "user" = ${userId}`
      );
      app.locals.helpers.Session.open({ req, res, userId });
    },
  };

  app.once("jobs", async () => {
    while (true) {
      app.locals.database.run(
        sql`
          DELETE FROM "sessions"
          WHERE "createdAt" < ${new Date(
            Date.now() - app.locals.helpers.Session.maxAge
          ).toISOString()}
        `
      );
      await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
    }
  });

  app.locals.middlewares.isSignedOut = [
    (req, res, next) => {
      if (app.locals.helpers.Session.get({ req, res }) !== undefined)
        return next("route");
      next();
    },
  ];

  app.locals.middlewares.isSignedIn = [
    (req, res, next) => {
      const actionAllowedToUserWithUnverifiedEmail =
        res.locals.actionAllowedToUserWithUnverifiedEmail;
      delete res.locals.actionAllowedToUserWithUnverifiedEmail;

      const userId = app.locals.helpers.Session.get({ req, res });
      if (userId === undefined) return next("route");

      res.locals.user = app.locals.database.get<{
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
        emailNotificationsForAllMessages: UserEmailNotificationsForAllMessages;
        emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
        emailNotificationsForMentionsAt: string | null;
        emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
          | string
          | null;
        emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
      }>(
        sql`
          SELECT "id",
                 "lastSeenOnlineAt",
                 "reference",
                 "email",
                 "password",
                 "emailVerifiedAt",
                 "name",
                 "avatar",
                 "avatarlessBackgroundColor",
                 "biographySource",
                 "biographyPreprocessed",
                 "systemRole",
                 "emailNotificationsForAllMessages",
                 "emailNotificationsForAllMessagesDigestDeliveredAt",
                 "emailNotificationsForMentionsAt",
                 "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
                 "emailNotificationsForMessagesInConversationsYouStartedAt"
          FROM "users"
          WHERE "id" = ${userId}
        `
      )!;

      if (
        actionAllowedToUserWithUnverifiedEmail !== true &&
        res.locals.user.emailVerifiedAt === null
      )
        return res.send(
          app.locals.layouts.box({
            req,
            res,
            head: html` <title>Email Verification · Courselore</title> `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-person-check-fill"></i>
                Email Verification
              </h2>

              <p>
                Please verify your email by following the link sent to
                <span class="strong">${res.locals.user.email}</span>
              </p>

              <hr class="separator" />

              <form
                method="POST"
                action="https://${app.locals.options
                  .host}/resend-verification-email${qs.stringify(
                  { redirect: req.originalUrl },
                  { addQueryPrefix: true }
                )}"
              >
                <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
                Didn’t receive the email? Already checked your spam folder?
                <button class="link">Resend</button>
              </form>

              <hr class="separator" />

              <p>
                Have the wrong email address?
                <button
                  class="link"
                  onload="${javascript`
                    this.onclick = () => {
                      document.querySelector('[key="update-email"]').hidden = false;
                    };
                `}"
                >
                  Update email
                </button>
              </p>

              <form
                key="update-email"
                method="PATCH"
                action="https://${app.locals.options
                  .host}/settings/email-and-password${qs.stringify(
                  { redirect: req.originalUrl },
                  { addQueryPrefix: true }
                )}"
                hidden
                novalidate
                css="${res.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
              >
                <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
                <label class="label">
                  <p class="label--text">Password</p>
                  <input
                    type="password"
                    name="currentPassword"
                    required
                    class="input--text"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Email</p>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@educational-institution.edu"
                    value="${res.locals.user.email}"
                    required
                    class="input--text"
                  />
                </label>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-pencil-fill"></i>
                    Update Email
                  </button>
                </div>
              </form>

              $${app.locals.options.demonstration
                ? (() => {
                    let emailVerification = app.locals.database.get<{
                      nonce: string;
                    }>(
                      sql`
                        SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${res.locals.user.id}
                      `
                    );
                    if (emailVerification === undefined) {
                      app.locals.mailers.emailVerification({
                        req,
                        res,
                        userId: res.locals.user.id,
                        userEmail: res.locals.user.email,
                      });
                      emailVerification = app.locals.database.get<{
                        nonce: string;
                      }>(
                        sql`
                          SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${res.locals.user.id}
                        `
                      )!;
                    }
                    return html`
                      <hr class="separator" />

                      <p
                        css="${res.locals.css(css`
                          font-weight: var(--font-weight--bold);
                        `)}"
                      >
                        This Courselore installation is running in demonstration
                        mode and doesn’t send emails.
                        <a
                          href="https://${app.locals.options
                            .host}/email-verification/${emailVerification.nonce}${qs.stringify(
                            { redirect: req.originalUrl },
                            { addQueryPrefix: true }
                          )}"
                          class="link"
                          >Verify email</a
                        >
                      </p>
                    `;
                  })()
                : html``}
            `,
          })
        );

      res.locals.invitations = app.locals.database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseArchivedAt: string | null;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          courseRole: CourseRole;
        }>(
          sql`
            SELECT "invitations"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."archivedAt" AS "courseArchivedAt",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
                   "invitations"."reference",
                   "invitations"."courseRole"
            FROM "invitations"
            JOIN "courses" ON "invitations"."course" = "courses"."id"
            WHERE "invitations"."usedAt" IS NULL AND (
                  "invitations"."expiresAt" IS NULL OR
                  ${new Date().toISOString()} < "invitations"."expiresAt"
                ) AND
                "invitations"."email" = ${res.locals.user.email}
            ORDER BY "invitations"."id" DESC
          `
        )
        .map((invitation) => ({
          id: invitation.id,
          course: {
            id: invitation.courseId,
            reference: invitation.courseReference,
            archivedAt: invitation.courseArchivedAt,
            name: invitation.courseName,
            year: invitation.courseYear,
            term: invitation.courseTerm,
            institution: invitation.courseInstitution,
            code: invitation.courseCode,
            nextConversationReference:
              invitation.courseNextConversationReference,
          },
          reference: invitation.reference,
          courseRole: invitation.courseRole,
        }));

      res.locals.enrollments = app.locals.database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseArchivedAt: string | null;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          courseRole: CourseRole;
          accentColor: EnrollmentAccentColor;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."archivedAt" AS "courseArchivedAt",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
                   "enrollments"."reference",
                   "enrollments"."courseRole",
                   "enrollments"."accentColor"
            FROM "enrollments"
            JOIN "courses" ON "enrollments"."course" = "courses"."id"
            WHERE "enrollments"."user" = ${res.locals.user.id}
            ORDER BY "enrollments"."id" DESC
          `
        )
        .map((enrollment) => ({
          id: enrollment.id,
          course: {
            id: enrollment.courseId,
            reference: enrollment.courseReference,
            archivedAt: enrollment.courseArchivedAt,
            name: enrollment.courseName,
            year: enrollment.courseYear,
            term: enrollment.courseTerm,
            institution: enrollment.courseInstitution,
            code: enrollment.courseCode,
            nextConversationReference:
              enrollment.courseNextConversationReference,
          },
          reference: enrollment.reference,
          courseRole: enrollment.courseRole,
          accentColor: enrollment.accentColor,
        }));

      res.locals.mayCreateCourses =
        app.locals.options.userSystemRolesWhoMayCreateCourses === "all" ||
        (app.locals.options.userSystemRolesWhoMayCreateCourses ===
          "staff-and-administrators" &&
          ["staff", "administrator"].includes(res.locals.user.systemRole)) ||
        (app.locals.options.userSystemRolesWhoMayCreateCourses ===
          "administrators" &&
          res.locals.user.systemRole === "administrator");

      next();
    },
  ];

  (() => {
    const handler: express.RequestHandler<
      {},
      HTML,
      {},
      { redirect?: string; invitation?: { email?: string; name?: string } },
      IsSignedOutMiddlewareLocals
    > = (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>
              Sign in · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="https://${app.locals.options.host}/sign-in${qs.stringify(
                {
                  redirect: req.query.redirect,
                  invitation: req.query.invitation,
                },
                {
                  addQueryPrefix: true,
                }
              )}"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${typeof req.query.invitation?.email === "string" &&
                  req.query.invitation.email.trim() !== ""
                    ? req.query.invitation.email
                    : ""}"
                  required
                  autofocus
                  class="input--text"
                  onload="${javascript`
                    this.isModified = false;
                  `}"
                />
              </label>
              <label class="label">
                <p class="label--text">Password</p>
                <input
                  type="password"
                  name="password"
                  required
                  class="input--text"
                  onload="${javascript`
                    this.isModified = false;
                  `}"
                />
              </label>
              <button class="button button--blue">
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in
              </button>
            </form>
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <p>
                Don’t have an account?
                <a
                  href="https://${app.locals.options
                    .host}/sign-up${qs.stringify(
                    {
                      redirect: req.query.redirect,
                      invitation: req.query.invitation,
                    },
                    {
                      addQueryPrefix: true,
                    }
                  )}"
                  class="link"
                  >Sign up</a
                >.
              </p>
              <p>
                Forgot your password?
                <a
                  href="https://${app.locals.options
                    .host}/reset-password${qs.stringify(
                    {
                      redirect: req.query.redirect,
                      invitation: req.query.invitation,
                    },
                    {
                      addQueryPrefix: true,
                    }
                  )}"
                  class="link"
                  >Reset password</a
                >.
              </p>
            </div>
          `,
        })
      );
    };

    app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
      "/",
      ...app.locals.middlewares.isSignedOut,
      app.locals.options.host === app.locals.options.canonicalHost
        ? (req, res, next) => {
            app.locals.handlers.about(req, res, next);
          }
        : handler
    );

    app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
      "/sign-in",
      ...app.locals.middlewares.isSignedOut,
      handler
    );

    app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
      "/sign-in",
      ...app.locals.middlewares.isSignedIn,
      (req, res) => {
        res.redirect(
          303,
          `https://${app.locals.options.host}${
            typeof req.query.redirect === "string" &&
            req.query.redirect.trim() !== ""
              ? req.query.redirect
              : "/"
          }`
        );
      }
    );
  })();

  app.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; invitation?: object },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-in",
    ...app.locals.middlewares.isSignedOut,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.email !== "string" ||
        req.body.email.match(app.locals.helpers.emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === ""
      )
        return next("validation");
      const user = app.locals.database.get<{ id: number; password: string }>(
        sql`SELECT "id", "password" FROM "users" WHERE "email" = ${req.body.email}`
      );
      if (
        user === undefined ||
        !(await argon2.verify(user.password, req.body.password))
      ) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`Incorrect email & password.`,
        });
        return res.redirect(
          303,
          `https://${app.locals.options.host}/sign-in${qs.stringify(
            {
              redirect: req.query.redirect,
              invitation: req.query.invitation,
            },
            {
              addQueryPrefix: true,
            }
          )}`
        );
      }
      app.locals.helpers.Session.open({ req, res, userId: user.id });
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    })
  );

  const PasswordReset = {
    maxAge: 10 * 60 * 1000,

    create(userId: number): string {
      app.locals.database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "user" = ${userId}
        `
      );
      return app.locals.database.get<{ nonce: string }>(
        sql`
          INSERT INTO "passwordResets" ("createdAt", "user", "nonce")
          VALUES (
            ${new Date().toISOString()},
            ${userId},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
          )
          RETURNING *
        `
      )!.nonce;
    },

    get(nonce: string): number | undefined {
      return app.locals.database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`
          SELECT "createdAt", "user"
          FROM "passwordResets"
          WHERE "nonce" = ${nonce} AND
                "createdAt" > ${new Date(
                  Date.now() - PasswordReset.maxAge
                ).toISOString()}
        `
      )?.user;
    },
  };

  app.once("jobs", async () => {
    while (true) {
      app.locals.database.run(
        sql`
          DELETE FROM "passwordResets"
          WHERE "createdAt" < ${new Date(
            Date.now() - PasswordReset.maxAge
          ).toISOString()}
        `
      );
      await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
    }
  });

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    BaseMiddlewareLocals
  >("/reset-password", (req, res) => {
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>
            Reset Password · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <form
            method="POST"
            action="https://${app.locals.options
              .host}/reset-password${qs.stringify(
              {
                redirect: req.query.redirect,
                invitation: req.query.invitation,
              },
              { addQueryPrefix: true }
            )}"
            novalidate
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <label class="label">
              <p class="label--text">Email</p>
              <input
                type="email"
                name="email"
                placeholder="you@educational-institution.edu"
                value="${typeof req.query.invitation?.email === "string" &&
                req.query.invitation.email.trim() !== ""
                  ? req.query.invitation.email
                  : ""}"
                required
                autofocus
                class="input--text"
                onload="${javascript`
                  this.isModified = false;
                `}"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-key-fill"></i>
              Reset Password
            </button>
          </form>
          <div
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `)}"
          >
            <p>
              Don’t have an account?
              <a
                href="https://${app.locals.options.host}/sign-up${qs.stringify(
                  {
                    redirect: req.query.redirect,
                    invitation: req.query.invitation,
                  },
                  { addQueryPrefix: true }
                )}"
                class="link"
                >Sign up</a
              >.
            </p>
            <p>
              Remember your password?
              <a
                href="https://${app.locals.options.host}/sign-in${qs.stringify(
                  {
                    redirect: req.query.redirect,
                    invitation: req.query.invitation,
                  },
                  { addQueryPrefix: true }
                )}"
                class="link"
                >Sign in</a
              >.
            </p>
          </div>
        `,
      })
    );
  });

  app.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    { redirect?: string; invitation?: object },
    BaseMiddlewareLocals
  >("/reset-password", (req, res, next) => {
    if (
      typeof req.body.email !== "string" ||
      req.body.email.match(app.locals.helpers.emailRegExp) === null
    )
      return next("validation");

    const user = app.locals.database.get<{ id: number; email: string }>(
      sql`SELECT "id", "email" FROM "users" WHERE "email" = ${req.body.email}`
    );
    if (user === undefined) {
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "rose",
        content: html`Email not found.`,
      });
      return res.redirect(
        303,
        `https://${app.locals.options.host}/reset-password${qs.stringify(
          {
            redirect: req.query.redirect,
            invitation: req.query.invitation,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );
    }

    const link = `https://${
      app.locals.options.host
    }/reset-password/${PasswordReset.create(user.id)}${qs.stringify(
      {
        redirect: req.query.redirect,
        invitation: req.query.invitation,
      },
      { addQueryPrefix: true }
    )}`;
    app.locals.database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            to: user.email,
            subject: "Courselore · Password Reset Link",
            html: html`
              <p><a href="${link}" target="_blank">${link}</a></p>
              <p>
                <small>
                  This password reset link is valid for ten minutes.<br />
                  You may ignore this password reset link if you didn’t request
                  it.
                </small>
              </p>
            `,
          })}
        )
      `
    );
    app.locals.workers.sendEmail();
    if (req.body.resend === "true")
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Email resent.`,
      });
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>
            Reset Password · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <p>
            To continue resetting your password, please follow the password
            reset link that was sent to
            <strong class="strong">${req.body.email}</strong>.
          </p>
          <form
            method="POST"
            action="https://${app.locals.options
              .host}/reset-password${qs.stringify(
              {
                redirect: req.query.redirect,
                invitation: req.query.invitation,
              },
              { addQueryPrefix: true }
            )}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <input type="hidden" name="email" value="${req.body.email}" />
            <input type="hidden" name="resend" value="true" />
            <p>
              Didn’t receive the email? Already checked your spam folder?
              <button class="link">Resend</button>.
            </p>
          </form>
        `,
      })
    );
  });

  app.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; invitation?: object },
    BaseMiddlewareLocals
  >("/reset-password/:passwordResetNonce", (req, res) => {
    const userId = PasswordReset.get(req.params.passwordResetNonce);
    if (userId === undefined) {
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "rose",
        content: html`This password reset link is invalid or expired.`,
      });
      return res.redirect(
        303,
        `https://${app.locals.options.host}/reset-password${qs.stringify(
          {
            redirect: req.query.redirect,
            invitation: req.query.invitation,
          },
          {
            addQueryPrefix: true,
          }
        )}`
      );
    }
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>
            Reset Password · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <form
            method="POST"
            action="https://${app.locals.options.host}/reset-password/${req
              .params.passwordResetNonce}${qs.stringify(
              {
                redirect: req.query.redirect,
                invitation: req.query.invitation,
              },
              { addQueryPrefix: true }
            )}"
            novalidate
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <label class="label">
              <p class="label--text">Password</p>
              <input
                type="password"
                name="password"
                required
                minlength="8"
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Password Confirmation</p>
              <input
                type="password"
                required
                class="input--text"
                onload="${javascript`
                  this.onvalidate = () => {
                    if (this.value !== this.closest("form").querySelector('[name="password"]').value)
                      return "Password & Password Confirmation don’t match.";
                  };
                `}"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-key-fill"></i>
              Reset Password
            </button>
          </form>
        `,
      })
    );
  });

  app.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string; invitation?: object },
    BaseMiddlewareLocals
  >(
    "/reset-password/:passwordResetNonce",
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`Something went wrong in your password reset. Please
          start over.`,
        });
        return res.redirect(
          303,
          `https://${app.locals.options.host}/reset-password${qs.stringify(
            {
              redirect: req.query.redirect,
              invitation: req.query.invitation,
            },
            { addQueryPrefix: true }
          )}`
        );
      }

      app.locals.database.run(
        sql`DELETE FROM "passwordResets" WHERE "user" = ${userId}`
      );
      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "password" = ${await argon2.hash(
            req.body.password,
            app.locals.options.argon2
          )}
          WHERE "id" = ${userId}
        `
      );
      app.locals.helpers.Session.closeAllAndReopen({ req, res, userId });
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Password reset successfully.`,
      });
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    })
  );

  app.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    IsSignedOutMiddlewareLocals
  >("/sign-up", ...app.locals.middlewares.isSignedOut, (req, res) => {
    res.send(
      app.locals.layouts.box({
        req,
        res,
        head: html`
          <title>
            Sign up · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <form
            method="POST"
            action="https://${app.locals.options.host}/sign-up${qs.stringify(
              {
                redirect: req.query.redirect,
                invitation: req.query.invitation,
              },
              {
                addQueryPrefix: true,
              }
            )}"
            novalidate
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
            <label class="label">
              <p class="label--text">Name</p>
              <input
                type="text"
                name="name"
                value="${typeof req.query.invitation?.name === "string" &&
                req.query.invitation.name.trim() !== ""
                  ? req.query.invitation.name
                  : ""}"
                required
                autofocus
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Email</p>
              <input
                type="email"
                name="email"
                placeholder="you@educational-institution.edu"
                value="${typeof req.query.invitation?.email === "string" &&
                req.query.invitation.email.trim() !== ""
                  ? req.query.invitation.email
                  : ""}"
                required
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Password</p>
              <input
                type="password"
                name="password"
                required
                minlength="8"
                class="input--text"
              />
            </label>
            <label class="label">
              <p class="label--text">Password Confirmation</p>
              <input
                type="password"
                required
                class="input--text"
                onload="${javascript`
                  this.onvalidate = () => {
                    if (this.value !== this.closest("form").querySelector('[name="password"]').value)
                      return "Password & Password Confirmation don’t match.";
                  };
              `}"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-person-plus-fill"></i>
              Sign up
            </button>
          </form>
          <div
            css="${res.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `)}"
          >
            <p>
              Already have an account account?
              <a
                href="https://${app.locals.options.host}/sign-in${qs.stringify(
                  {
                    redirect: req.query.redirect,
                    invitation: req.query.invitation,
                  },
                  {
                    addQueryPrefix: true,
                  }
                )}"
                class="link"
                >Sign in</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="https://${app.locals.options
                  .host}/reset-password${qs.stringify(
                  {
                    redirect: req.query.redirect,
                    invitation: req.query.invitation,
                  },
                  {
                    addQueryPrefix: true,
                  }
                )}"
                class="link"
                >Reset password</a
              >.
            </p>
          </div>
        `,
      })
    );
  });
  app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/sign-up",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    }
  );

  app.locals.options.argon2 = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  app.locals.mailers.emailVerification = ({ req, res, userId, userEmail }) => {
    const emailVerification = app.locals.database.executeTransaction(() => {
      app.locals.database.run(
        sql`
          DELETE FROM "emailVerifications" WHERE "user" = ${userId}
        `
      );
      return app.locals.database.get<{
        nonce: string;
      }>(
        sql`
          INSERT INTO "emailVerifications" ("createdAt", "user", "nonce")
          VALUES (
            ${new Date().toISOString()},
            ${userId},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
          )
          RETURNING *
        `
      )!;
    });

    const link = `https://${app.locals.options.host}/email-verification/${
      emailVerification.nonce
    }${qs.stringify({ redirect: req.originalUrl }, { addQueryPrefix: true })}`;
    app.locals.database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            to: userEmail,
            subject: "Welcome to Courselore!",
            html: html`
              <p>
                Please verify your email:<br />
                <a href="${link}" target="_blank">${link}</a>
              </p>
            `,
          })}
        )
      `
    );
    app.locals.workers.sendEmail();
  };

  app.once("jobs", async () => {
    while (true) {
      app.locals.database.run(
        sql`
          DELETE FROM "emailVerifications"
          WHERE "createdAt" < ${new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toISOString()}
        `
      );
      await new Promise((resolve) => setTimeout(resolve, 24 * 60 * 60 * 1000));
    }
  });

  app.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; invitation?: object },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-up",
    ...app.locals.middlewares.isSignedOut,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        typeof req.body.email !== "string" ||
        req.body.email.match(app.locals.helpers.emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      if (
        app.locals.database.get<{}>(
          sql`
            SELECT TRUE FROM "users" WHERE "email" = ${req.body.email}
          `
        ) !== undefined
      ) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`Email already taken.`,
        });
        return res.redirect(
          303,
          `https://${app.locals.options.host}/sign-in${qs.stringify(
            {
              redirect: req.query.redirect,
              invitation: { ...req.query.invitation, email: req.body.email },
            },
            {
              addQueryPrefix: true,
            }
          )}`
        );
      }

      const user = app.locals.database.get<{ id: number; email: string }>(
        sql`
          INSERT INTO "users" (
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatarlessBackgroundColor",
            "systemRole",
            "emailNotificationsForAllMessages",
            "emailNotificationsForAllMessagesDigestDeliveredAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt"
          )
          VALUES (
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 20, type: "numeric" })},
            ${req.body.email},
            ${await argon2.hash(req.body.password, app.locals.options.argon2)},
            ${null},
            ${req.body.name},
            ${html`${req.body.name}`},
            ${lodash.sample(userAvatarlessBackgroundColors)},
            ${
              app.locals.options.host !== app.locals.options.tryHost &&
              app.locals.database.get<{ count: number }>(
                sql`
                  SELECT COUNT(*) AS "count" FROM "users"
                `
              )!.count === 0
                ? "administrator"
                : "none"
            },
            ${"none"},
            ${null},
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${new Date().toISOString()}
          )
          RETURNING *
        `
      )!;

      app.locals.mailers.emailVerification({
        req,
        res,
        userId: user.id,
        userEmail: user.email,
      });
      app.locals.helpers.Session.open({ req, res, userId: user.id });
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    })
  );

  app.post<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/resend-verification-email",
    (req, res, next) => {
      res.locals.actionAllowedToUserWithUnverifiedEmail = true;
      next();
    },
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      if (res.locals.user.emailVerifiedAt !== null) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`Email already verified.`,
        });
        return res.redirect(
          303,
          `https://${app.locals.options.host}${
            typeof req.query.redirect === "string" &&
            req.query.redirect.trim() !== ""
              ? req.query.redirect
              : "/"
          }`
        );
      }
      app.locals.mailers.emailVerification({
        req,
        res,
        userId: res.locals.user.id,
        userEmail: res.locals.user.email,
      });
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Verification email resent.`,
      });
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    }
  );

  app.get<
    { emailVerificationNonce: string },
    HTML,
    {},
    { redirect?: string },
    IsSignedInMiddlewareLocals
  >(
    "/email-verification/:emailVerificationNonce",
    (req, res, next) => {
      res.locals.actionAllowedToUserWithUnverifiedEmail = true;
      next();
    },
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      const emailVerification = app.locals.database.get<{ user: number }>(
        sql`
          SELECT "user" FROM "emailVerifications" WHERE "nonce" = ${req.params.emailVerificationNonce}
        `
      );
      app.locals.database.run(
        sql`
          DELETE FROM "emailVerifications" WHERE "nonce" = ${req.params.emailVerificationNonce}
        `
      );
      if (
        emailVerification === undefined ||
        emailVerification.user !== res.locals.user.id
      ) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`
            This email verification link is invalid or belongs to a different
            account.
          `,
        });
        return res.redirect(
          303,
          `https://${app.locals.options.host}${
            typeof req.query.redirect === "string" &&
            req.query.redirect.trim() !== ""
              ? req.query.redirect
              : "/"
          }`
        );
      }
      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "emailVerifiedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.user.id}
        `
      );
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Email verified successfully.`,
      });
      res.redirect(
        303,
        `https://${app.locals.options.host}${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== ""
            ? req.query.redirect
            : "/"
        }`
      );
    }
  );

  app.delete<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/sign-out",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      app.locals.helpers.Session.close({ req, res });
      res
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(303, `https://${app.locals.options.host}/`);
    }
  );
};
