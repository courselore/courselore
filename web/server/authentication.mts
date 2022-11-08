import timers from "node:timers/promises";
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
import got from "got";
import {
  Application,
  ResponseLocalsBase,
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotificationsForAllMessages,
  CourseRole,
  EnrollmentAccentColor,
  SystemRole,
} from "./index.mjs";

export type ApplicationAuthentication = {
  server: {
    locals: {
      configuration: {
        argon2: argon2.Options & { raw?: false };
      };
      helpers: {
        Session: {
          maxAge: number;
          open({
            request,
            response,
            userId,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
            userId: number;
          }): void;
          get({
            request,
            response,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
          }): number | undefined;
          close({
            request,
            response,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
          }): void;
          closeAllAndReopen({
            request,
            response,
            userId,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
            userId: number;
          }): void;
        };
        emailVerification: ({
          request,
          response,
          userId,
          userEmail,
          welcome,
        }: {
          request: express.Request<
            {},
            any,
            {},
            { redirect?: string },
            ResponseLocalsBase
          >;
          response: express.Response<any, ResponseLocalsBase>;
          userId: number;
          userEmail: string;
          welcome?: boolean;
        }) => void;
      };
    };
  };
};

export type ResponseLocalsSignedIn = ResponseLocalsBase & {
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
  confirmedPassword?: boolean;
};

export default async (application: Application): Promise<void> => {
  application.server.locals.configuration.argon2 = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  application.server.locals.helpers.Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open({ request, response, userId }) {
      const session = application.database.get<{
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
      request.cookies["__Host-Session"] = session.token;
      response.cookie("__Host-Session", session.token, {
        ...application.server.locals.configuration.cookies,
        maxAge: application.server.locals.helpers.Session.maxAge,
      });
    },

    get({ request, response }) {
      if (request.cookies["__Host-Session"] === undefined) return undefined;
      const session = application.database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`
          SELECT "createdAt", "user"
          FROM "sessions"
          WHERE "token" = ${request.cookies["__Host-Session"]}
        `
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() <
          Date.now() - application.server.locals.helpers.Session.maxAge
      ) {
        application.server.locals.helpers.Session.close({ request, response });
        return undefined;
      } else if (
        request.header("Live-Updates") === undefined &&
        new Date(session.createdAt).getTime() <
          Date.now() - application.server.locals.helpers.Session.maxAge / 2
      ) {
        application.server.locals.helpers.Session.close({ request, response });
        application.server.locals.helpers.Session.open({
          request,
          response,
          userId: session.user,
        });
      }
      application.database.run(
        sql`
          UPDATE "users"
          SET "lastSeenOnlineAt" = ${new Date().toISOString()}
          WHERE "id" = ${session.user}
        `
      );
      return session.user;
    },

    close({ request, response }) {
      if (request.cookies["__Host-Session"] === undefined) return;
      application.database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${request.cookies["__Host-Session"]}`
      );
      delete request.cookies["__Host-Session"];
      response.clearCookie(
        "__Host-Session",
        application.server.locals.configuration.cookies
      );
    },

    closeAllAndReopen({ request, response, userId }) {
      application.server.locals.helpers.Session.close({ request, response });
      application.database.run(
        sql`DELETE FROM "sessions" WHERE "user" = ${userId}`
      );
      application.server.locals.helpers.Session.open({
        request,
        response,
        userId,
      });
    },
  };

  application.workerEvents.once("start", async () => {
    while (true) {
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘sessions’\tSTARTING...`
      );
      application.database.run(
        sql`
          DELETE FROM "sessions"
          WHERE "createdAt" < ${new Date(
            Date.now() - application.server.locals.helpers.Session.maxAge
          ).toISOString()}
        `
      );
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘sessions’\tFINISHED`
      );
      await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
    }
  });

  application.server.locals.helpers.emailVerification = ({
    request,
    response,
    userId,
    userEmail,
    welcome = false,
  }) => {
    const emailVerification = application.database.executeTransaction(() => {
      application.database.run(
        sql`
          DELETE FROM "emailVerifications" WHERE "user" = ${userId}
        `
      );
      return application.database.get<{
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

    const link = `https://${
      application.configuration.hostname
    }/email-verification/${emailVerification.nonce}${qs.stringify(
      { redirect: request.query.redirect ?? request.originalUrl.slice(1) },
      { addQueryPrefix: true }
    )}`;
    application.database.run(
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
            subject: welcome ? "Welcome to Courselore!" : "Email Verification",
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
    got
      .post(`http://127.0.0.1:${application.ports.workerEventsAny}/send-email`)
      .catch((error) => {
        response.locals.log("FAILED TO EMIT ‘/send-email’ EVENT", error);
      });
  };

  application.workerEvents.once("start", async () => {
    while (true) {
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘emailVerifications’\tSTARTING...`
      );
      application.database.run(
        sql`
          DELETE FROM "emailVerifications"
          WHERE "createdAt" < ${new Date(
            Date.now() - 24 * 60 * 60 * 1000
          ).toISOString()}
        `
      );
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘emailVerifications’\tFINISHED`
      );
      await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
    }
  });

  application.locals.middlewares.isSignedOut = [
    (request, response, next) => {
      if (
        application.server.locals.helpers.Session.get({ request, response }) !==
        undefined
      )
        return next("route");
      next();
    },
  ];

  application.locals.middlewares.isSignedIn = [
    (request, response, next) => {
      const actionAllowedToUserWithUnverifiedEmail =
        response.locals.actionAllowedToUserWithUnverifiedEmail;
      delete response.locals.actionAllowedToUserWithUnverifiedEmail;

      const userId = application.server.locals.helpers.Session.get({
        request,
        response,
      });
      if (userId === undefined) return next("route");

      response.locals.user = application.database.get<{
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
        response.locals.user.emailVerifiedAt === null
      )
        return response.send(
          application.locals.layouts.box({
            request,
            response,
            head: html` <title>Email Verification · Courselore</title> `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-person-check-fill"></i>
                Email Verification
              </h2>

              <p>
                Please verify your email by following the link sent to
                <span class="strong">${response.locals.user.email}</span>
              </p>

              <hr class="separator" />

              <form
                method="POST"
                action="https://${application.configuration
                  .hostname}/resend-email-verification${qs.stringify(
                  { redirect: request.originalUrl.slice(1) },
                  { addQueryPrefix: true }
                )}"
              >
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
                action="https://${application.configuration
                  .hostname}/settings/email-and-password${qs.stringify(
                  { redirect: request.originalUrl.slice(1) },
                  { addQueryPrefix: true }
                )}"
                hidden
                novalidate
                css="${response.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
              >
                <label class="label">
                  <p class="label--text">Email</p>
                  <input
                    type="email"
                    name="email"
                    placeholder="you@educational-institution.edu"
                    value="${response.locals.user.email}"
                    required
                    class="input--text"
                    onload="${javascript`
                      this.onvalidate = () => {
                        if (!leafac.isModified(this))
                          return "Please provide the email address to which you’d like to update.";
                      };
                    `}"
                  />
                </label>
                <div class="label">
                  <p class="label--text">
                    Password Confirmation
                    <button
                      type="button"
                      class="button button--tight button--tight--inline button--transparent"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          content: "You must confirm your email because this is an important operation that affects your account.",
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </p>
                  <input
                    type="password"
                    name="passwordConfirmation"
                    required
                    class="input--text"
                  />
                </div>

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                  >
                    <i class="bi bi-pencil-fill"></i>
                    Update Email
                  </button>
                </div>
              </form>

              $${application.configuration.demonstration
                ? (() => {
                    let emailVerification = application.database.get<{
                      nonce: string;
                    }>(
                      sql`
                        SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${response.locals.user.id}
                      `
                    );
                    if (emailVerification === undefined) {
                      application.server.locals.helpers.emailVerification({
                        request,
                        response,
                        userId: response.locals.user.id,
                        userEmail: response.locals.user.email,
                      });
                      emailVerification = application.database.get<{
                        nonce: string;
                      }>(
                        sql`
                          SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${response.locals.user.id}
                        `
                      )!;
                    }
                    return html`
                      <hr class="separator" />

                      <p
                        css="${response.locals.css(css`
                          font-weight: var(--font-weight--bold);
                        `)}"
                      >
                        This Courselore installation is running in demonstration
                        mode and doesn’t send emails.
                        <a
                          href="https://${application.configuration
                            .hostname}/email-verification/${emailVerification.nonce}${qs.stringify(
                            { redirect: request.originalUrl.slice(1) },
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

      response.locals.invitations = application.database
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
                "invitations"."email" = ${response.locals.user.email}
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

      response.locals.enrollments = application.database
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
            WHERE "enrollments"."user" = ${response.locals.user.id}
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

      response.locals.mayCreateCourses =
        response.locals.administrationOptions
          .userSystemRolesWhoMayCreateCourses === "all" ||
        (response.locals.administrationOptions
          .userSystemRolesWhoMayCreateCourses === "staff-and-administrators" &&
          ["staff", "administrator"].includes(
            response.locals.user.systemRole
          )) ||
        (response.locals.administrationOptions
          .userSystemRolesWhoMayCreateCourses === "administrators" &&
          response.locals.user.systemRole === "administrator");

      next();
    },
  ];

  application.locals.middlewares.hasPasswordConfirmation = [
    ...application.locals.middlewares.isSignedIn,
    asyncHandler(async (request, response, next) => {
      if (
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.trim() === ""
      )
        return next("Validation");

      if (
        !(await argon2.verify(
          response.locals.user.password,
          request.body.passwordConfirmation
        ))
      ) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Incorrect password confirmation.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            response.locals.hasPasswordConfirmationRedirect ?? ""
          }`
        );
      }

      next();
    }),
  ];

  (() => {
    const handler: express.RequestHandler<
      {},
      HTML,
      {},
      { redirect?: string; invitation?: { email?: string; name?: string } },
      ResponseLocalsBase
    > = (request, response) => {
      response.send(
        application.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Sign in · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/sign-in${qs.stringify(
                {
                  redirect: request.query.redirect,
                  invitation: request.query.invitation,
                },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${typeof request.query.invitation?.email ===
                    "string" && request.query.invitation.email.trim() !== ""
                    ? request.query.invitation.email
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
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <p>
                Don’t have an account?
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
                    },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >Sign up</a
                >.
              </p>
              <p>
                Forgot your password?
                <a
                  href="https://${application.configuration
                    .hostname}/reset-password${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
                    },
                    { addQueryPrefix: true }
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

    application.server.get<{}, HTML, {}, {}, ResponseLocalsBase>(
      "/",
      ...application.locals.middlewares.isSignedOut,
      application.configuration.hostname ===
        application.configuration.canonicalHostname
        ? (request, response, next) => {
            application.locals.handlers.about(request, response, next);
          }
        : handler
    );

    application.server.get<{}, HTML, {}, {}, ResponseLocalsBase>(
      "/sign-in",
      ...application.locals.middlewares.isSignedOut,
      handler
    );

    application.server.get<
      {},
      HTML,
      {},
      { redirect?: string },
      ResponseLocalsSignedIn
    >(
      "/sign-in",
      ...application.locals.middlewares.isSignedIn,
      (request, response) => {
        response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.query.redirect === "string"
              ? request.query.redirect
              : ""
          }`
        );
      }
    );
  })();

  application.server.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; invitation?: object },
    ResponseLocalsBase
  >(
    "/sign-in",
    ...application.locals.middlewares.isSignedOut,
    asyncHandler(async (request, response, next) => {
      if (
        typeof request.body.email !== "string" ||
        request.body.email.match(
          application.server.locals.helpers.emailRegExp
        ) === null ||
        typeof request.body.password !== "string" ||
        request.body.password.trim() === ""
      )
        return next("Validation");
      const user = application.database.get<{ id: number; password: string }>(
        sql`SELECT "id", "password" FROM "users" WHERE "email" = ${request.body.email}`
      );
      if (
        user === undefined ||
        !(await argon2.verify(user.password, request.body.password))
      ) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Incorrect email & password.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/sign-in${qs.stringify(
            {
              redirect: request.query.redirect,
              invitation: request.query.invitation,
            },
            { addQueryPrefix: true }
          )}`
        );
      }
      application.server.locals.helpers.Session.open({
        request,
        response,
        userId: user.id,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    })
  );

  const PasswordReset = {
    maxAge: 10 * 60 * 1000,

    create(userId: number): string {
      application.database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "user" = ${userId}
        `
      );
      return application.database.get<{ nonce: string }>(
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
      return application.database.get<{
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

  application.workerEvents.once("start", async () => {
    while (true) {
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘passwordResets’\tSTARTING...`
      );
      application.database.run(
        sql`
          DELETE FROM "passwordResets"
          WHERE "createdAt" < ${new Date(
            Date.now() - PasswordReset.maxAge
          ).toISOString()}
        `
      );
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘passwordResets’\tFINISHED`
      );
      await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
    }
  });

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    ResponseLocalsBase
  >(
    "/reset-password",
    ...application.locals.middlewares.isSignedOut,
    (request, response) => {
      response.send(
        application.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Reset Password · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/reset-password${qs.stringify(
                {
                  redirect: request.query.redirect,
                  invitation: request.query.invitation,
                },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${typeof request.query.invitation?.email ===
                    "string" && request.query.invitation.email.trim() !== ""
                    ? request.query.invitation.email
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
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <p>
                Don’t have an account?
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
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
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
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
    }
  );

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string },
    ResponseLocalsSignedIn
  >(
    "/reset-password",
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.server.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    { redirect?: string; invitation?: object },
    ResponseLocalsBase
  >(
    "/reset-password",
    ...application.locals.middlewares.isSignedOut,
    (request, response, next) => {
      if (
        typeof request.body.email !== "string" ||
        request.body.email.match(
          application.server.locals.helpers.emailRegExp
        ) === null
      )
        return next("Validation");

      const user = application.database.get<{ id: number; email: string }>(
        sql`SELECT "id", "email" FROM "users" WHERE "email" = ${request.body.email}`
      );
      if (user === undefined) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Email not found.`,
        });
        return response.redirect(
          303,
          `https://${
            application.configuration.hostname
          }/reset-password${qs.stringify(
            {
              redirect: request.query.redirect,
              invitation: request.query.invitation,
            },
            { addQueryPrefix: true }
          )}`
        );
      }

      const link = `https://${
        application.configuration.hostname
      }/reset-password/${PasswordReset.create(user.id)}${qs.stringify(
        {
          redirect: request.query.redirect,
          invitation: request.query.invitation,
        },
        { addQueryPrefix: true }
      )}`;
      application.database.run(
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
              subject: "Password Reset Link",
              html: html`
                <p><a href="${link}" target="_blank">${link}</a></p>
                <p>
                  <small>
                    This password reset link is valid for ten minutes.<br />
                    You may ignore this password reset link if you didn’t
                    request it.
                  </small>
                </p>
              `,
            })}
          )
        `
      );
      got
        .post(
          `http://127.0.0.1:${application.ports.workerEventsAny}/send-email`
        )
        .catch((error) => {
          response.locals.log("FAILED TO EMIT ‘/send-email’ EVENT", error);
        });
      if (request.body.resend === "true")
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Email resent.`,
        });
      response.send(
        application.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Reset Password · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <p>
              To continue resetting your password, please follow the password
              reset link that was sent to
              <strong class="strong">${request.body.email}</strong>.
            </p>
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/reset-password${qs.stringify(
                {
                  redirect: request.query.redirect,
                  invitation: request.query.invitation,
                },
                { addQueryPrefix: true }
              )}"
            >
              <input type="hidden" name="email" value="${request.body.email}" />
              <input type="hidden" name="resend" value="true" />
              <p>
                Didn’t receive the email? Already checked your spam folder?
                <button class="link">Resend</button>.
              </p>
            </form>
          `,
        })
      );
    }
  );

  application.server.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; invitation?: object },
    ResponseLocalsBase
  >(
    "/reset-password/:passwordResetNonce",
    ...application.locals.middlewares.isSignedOut,
    (request, response) => {
      const userId = PasswordReset.get(request.params.passwordResetNonce);
      if (userId === undefined) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`This password reset link is invalid or expired.`,
        });
        return response.redirect(
          303,
          `https://${
            application.configuration.hostname
          }/reset-password${qs.stringify(
            {
              redirect: request.query.redirect,
              invitation: request.query.invitation,
            },
            { addQueryPrefix: true }
          )}`
        );
      }
      response.send(
        application.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Reset Password · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/reset-password/${request.params
                .passwordResetNonce}${qs.stringify(
                {
                  redirect: request.query.redirect,
                  invitation: request.query.invitation,
                },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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
    }
  );

  application.server.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; invitation?: object },
    ResponseLocalsSignedIn
  >(
    "/reset-password/:passwordResetNonce",
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "rose",
        content: html`
          You may not use this password reset link because you’re already signed
          in.
        `,
      });
      return response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.server.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string; invitation?: object },
    ResponseLocalsBase
  >(
    "/reset-password/:passwordResetNonce",
    ...application.locals.middlewares.isSignedOut,
    asyncHandler(async (request, response, next) => {
      if (
        typeof request.body.password !== "string" ||
        request.body.password.trim() === "" ||
        request.body.password.length < 8
      )
        return next("Validation");

      const userId = PasswordReset.get(request.params.passwordResetNonce);
      if (userId === undefined) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            Something went wrong with your password reset. Please start over.
          `,
        });
        return response.redirect(
          303,
          `https://${
            application.configuration.hostname
          }/reset-password${qs.stringify(
            {
              redirect: request.query.redirect,
              invitation: request.query.invitation,
            },
            { addQueryPrefix: true }
          )}`
        );
      }

      application.database.run(
        sql`DELETE FROM "passwordResets" WHERE "user" = ${userId}`
      );
      const user = application.database.get<{ email: string }>(
        sql`
          UPDATE "users"
          SET "password" = ${await argon2.hash(
            request.body.password,
            application.server.locals.configuration.argon2
          )}
          WHERE "id" = ${userId}
          RETURNING *
        `
      )!;
      application.database.run(
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
              subject: "Your Password Has Been Reset",
              html: html`
                <p>
                  The password for the Courselore account with email address
                  <code>${user.email}</code> has been reset.
                </p>

                <p>
                  If you performed this reset, then no further action is
                  required.
                </p>

                <p>
                  If you did not perform this reset, then please contact the
                  system administrator at
                  <a
                    href="mailto:${application.configuration
                      .administratorEmail}"
                    >${application.configuration.administratorEmail}</a
                  >
                  as soon as possible.
                </p>
              `,
            })}
          )
        `
      );
      got
        .post(
          `http://127.0.0.1:${application.ports.workerEventsAny}/send-email`
        )
        .catch((error) => {
          response.locals.log("FAILED TO EMIT ‘/send-email’ EVENT", error);
        });
      application.server.locals.helpers.Session.closeAllAndReopen({
        request,
        response,
        userId,
      });
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Password reset successfully.`,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    })
  );

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    ResponseLocalsBase
  >(
    "/sign-up",
    ...application.locals.middlewares.isSignedOut,
    (request, response) => {
      response.send(
        application.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Sign up · Courselore · Communication Platform for Education
            </title>
          `,
          body: html`
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/sign-up${qs.stringify(
                {
                  redirect: request.query.redirect,
                  invitation: request.query.invitation,
                },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <label class="label">
                <p class="label--text">Name</p>
                <input
                  type="text"
                  name="name"
                  value="${typeof request.query.invitation?.name === "string" &&
                  request.query.invitation.name.trim() !== ""
                    ? request.query.invitation.name
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
                  value="${typeof request.query.invitation?.email ===
                    "string" && request.query.invitation.email.trim() !== ""
                    ? request.query.invitation.email
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
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <p>
                Already have an account account?
                <a
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
                    },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >Sign in</a
                >.
              </p>
              <p>
                Forgot your password?
                <a
                  href="https://${application.configuration
                    .hostname}/reset-password${qs.stringify(
                    {
                      redirect: request.query.redirect,
                      invitation: request.query.invitation,
                    },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >Reset password</a
                >.
              </p>
            </div>
          `,
        })
      );
    }
  );

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string },
    ResponseLocalsSignedIn
  >(
    "/sign-up",
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.server.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; invitation?: object },
    ResponseLocalsBase
  >(
    "/sign-up",
    ...application.locals.middlewares.isSignedOut,
    asyncHandler(async (request, response, next) => {
      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === "" ||
        typeof request.body.email !== "string" ||
        request.body.email.match(
          application.server.locals.helpers.emailRegExp
        ) === null ||
        typeof request.body.password !== "string" ||
        request.body.password.trim() === "" ||
        request.body.password.length < 8
      )
        return next("Validation");

      if (
        application.database.get<{}>(
          sql`
            SELECT TRUE FROM "users" WHERE "email" = ${request.body.email}
          `
        ) !== undefined
      ) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Email already taken.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/sign-in${qs.stringify(
            {
              redirect: request.query.redirect,
              invitation: {
                ...request.query.invitation,
                email: request.body.email,
              },
            },
            { addQueryPrefix: true }
          )}`
        );
      }

      const user = application.database.get<{ id: number; email: string }>(
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
            ${request.body.email},
            ${await argon2.hash(
              request.body.password,
              application.server.locals.configuration.argon2
            )},
            ${null},
            ${request.body.name},
            ${html`${request.body.name}`},
            ${lodash.sample(userAvatarlessBackgroundColors)},
            ${
              application.configuration.hostname !==
                application.addresses.tryHostname &&
              application.database.get<{ count: number }>(
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

      application.server.locals.helpers.emailVerification({
        request,
        response,
        userId: user.id,
        userEmail: user.email,
        welcome: true,
      });
      application.server.locals.helpers.Session.open({
        request,
        response,
        userId: user.id,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    })
  );

  application.server.post<
    {},
    HTML,
    {},
    { redirect?: string },
    ResponseLocalsSignedIn
  >(
    "/resend-email-verification",
    (request, response, next) => {
      response.locals.actionAllowedToUserWithUnverifiedEmail = true;
      next();
    },
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      if (response.locals.user.emailVerifiedAt !== null) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Email already verified.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.query.redirect === "string"
              ? request.query.redirect
              : ""
          }`
        );
      }
      application.server.locals.helpers.emailVerification({
        request,
        response,
        userId: response.locals.user.id,
        userEmail: response.locals.user.email,
      });
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Verification email resent.`,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.server.get<
    { emailVerificationNonce: string },
    HTML,
    {},
    { redirect?: string },
    ResponseLocalsSignedIn
  >(
    "/email-verification/:emailVerificationNonce",
    (request, response, next) => {
      response.locals.actionAllowedToUserWithUnverifiedEmail = true;
      next();
    },
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      const emailVerification = application.database.get<{ user: number }>(
        sql`
          SELECT "user" FROM "emailVerifications" WHERE "nonce" = ${request.params.emailVerificationNonce}
        `
      );
      if (emailVerification === undefined) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`This email verification link is invalid.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.query.redirect === "string"
              ? request.query.redirect
              : ""
          }`
        );
      }
      if (emailVerification.user !== response.locals.user.id) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            This email verification link belongs to a different account.
          `,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.query.redirect === "string"
              ? request.query.redirect
              : ""
          }`
        );
      }
      application.database.run(
        sql`
          DELETE FROM "emailVerifications" WHERE "nonce" = ${request.params.emailVerificationNonce}
        `
      );
      application.database.run(
        sql`
          UPDATE "users"
          SET "emailVerifiedAt" = ${new Date().toISOString()}
          WHERE "id" = ${response.locals.user.id}
        `
      );
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Email verified successfully.`,
      });
      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.delete<{}, any, {}, {}, ResponseLocalsSignedIn>(
    "/sign-out",
    ...application.locals.middlewares.isSignedIn,
    (request, response) => {
      application.server.locals.helpers.Session.close({ request, response });
      response
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(303, `https://${application.configuration.hostname}/`);
    }
  );
};
