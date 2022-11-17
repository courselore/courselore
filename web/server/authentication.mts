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
import { Application } from "./index.mjs";

export type ApplicationAuthentication = {
  server: {
    locals: {
      ResponseLocals: {
        SignedIn: Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] & {
          user: {
            id: number;
            lastSeenOnlineAt: string;
            reference: string;
            email: string;
            password: string;
            emailVerifiedAt: string | null;
            name: string;
            avatar: string | null;
            avatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
            biographySource: string | null;
            biographyPreprocessed: HTML | null;
            systemRole: Application["server"]["locals"]["helpers"]["systemRoles"][number];
            emailNotificationsForAllMessages: Application["server"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
            emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
            emailNotificationsForMentionsAt: string | null;
            emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
              | string
              | null;
            emailNotificationsForMessagesInConversationsYouStartedAt:
              | string
              | null;
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
            courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
            courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
            accentColor: Application["server"]["locals"]["helpers"]["enrollmentAccentColors"][number];
          }[];

          administrationOptions: {
            latestVersion: string;
            userSystemRolesWhoMayCreateCourses: Application["server"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
          };
        };
      };

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
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            userId: number;
          }): void;

          get({
            request,
            response,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
          }): number | undefined;

          close({
            request,
            response,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
          }): void;

          closeAllAndReopen({
            request,
            response,
            userId,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            userId: number;
          }): void;
        };

        passwordConfirmation({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            { passwordConfirmation?: string },
            {},
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
        }): Promise<boolean>;

        mayCreateCourses({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
        }): boolean;

        emailVerification({
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
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          userId: number;
          userEmail: string;
          welcome?: boolean;
        }): void;
      };
    };
  };
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
          SELECT * FROM "sessions" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "sessions" ("createdAt", "token", "user")
                VALUES (
                  ${new Date().toISOString()},
                  ${cryptoRandomString({ length: 100, type: "alphanumeric" })},
                  ${userId}
                )
              `
            ).lastInsertRowid
          }
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
        typeof request.header("Live-Connection") !== "string" &&
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

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log("CLEAN EXPIRED ‘sessions’", "STARTING...");
        application.database.run(
          sql`
            DELETE FROM "sessions"
            WHERE "createdAt" < ${new Date(
              Date.now() - application.server.locals.helpers.Session.maxAge
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘sessions’", "FINISHED");
        await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
      }
    });

  application.server.use<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >((request, response, next) => {
    const userId = application.server.locals.helpers.Session.get({
      request,
      response,
    });
    if (typeof userId !== "number") return next();

    response.locals.user = application.database.get<{
      id: number;
      lastSeenOnlineAt: string;
      reference: string;
      email: string;
      password: string;
      emailVerifiedAt: string | null;
      name: string;
      avatar: string | null;
      avatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
      biographySource: string | null;
      biographyPreprocessed: HTML | null;
      systemRole: Application["server"]["locals"]["helpers"]["systemRoles"][number];
      emailNotificationsForAllMessages: Application["server"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
      emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
      emailNotificationsForMentionsAt: string | null;
      emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
        | string
        | null;
      emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
    }>(
      sql`
        SELECT
          "id",
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
        courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
      }>(
        sql`
          SELECT
            "invitations"."id",
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
          WHERE
            "invitations"."usedAt" IS NULL AND (
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
          nextConversationReference: invitation.courseNextConversationReference,
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
        courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
        accentColor: Application["server"]["locals"]["helpers"]["enrollmentAccentColors"][number];
      }>(
        sql`
          SELECT
            "enrollments"."id",
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
          nextConversationReference: enrollment.courseNextConversationReference,
        },
        reference: enrollment.reference,
        courseRole: enrollment.courseRole,
        accentColor: enrollment.accentColor,
      }));

    response.locals.administrationOptions =
      application.database.get<{
        latestVersion: string;
        userSystemRolesWhoMayCreateCourses: Application["server"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
      }>(
        sql`
          SELECT "latestVersion", "userSystemRolesWhoMayCreateCourses"
          FROM "administrationOptions"
        `
      ) ??
      (() => {
        throw new Error("Failed to get ‘administrationOptions’.");
      })();

    next();
  });

  application.server.locals.helpers.passwordConfirmation = async ({
    request,
    response,
  }) =>
    typeof request.body.passwordConfirmation === "string" &&
    request.body.passwordConfirmation.trim() !== "" &&
    (await argon2.verify(
      response.locals.user.password,
      request.body.passwordConfirmation
    ));

  application.server.locals.helpers.mayCreateCourses = ({
    request,
    response,
  }) =>
    response.locals.administrationOptions.userSystemRolesWhoMayCreateCourses ===
      "all" ||
    (response.locals.administrationOptions
      .userSystemRolesWhoMayCreateCourses === "staff-and-administrators" &&
      ["staff", "administrator"].includes(response.locals.user.systemRole)) ||
    (response.locals.administrationOptions
      .userSystemRolesWhoMayCreateCourses === "administrators" &&
      response.locals.user.systemRole === "administrator");

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(["/", "/sign-in"], (request, response, next) => {
    if (
      response.locals.user !== undefined ||
      (request.originalUrl === "/" &&
        application.configuration.hostname ===
          application.addresses.canonicalHostname)
    )
      return next();

    response.send(
      application.server.locals.layouts.box({
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
                value="${typeof request.query.invitation?.email === "string" &&
                request.query.invitation.email.trim() !== ""
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
  });

  application.server.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; invitation?: object },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/sign-in",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user !== undefined) return next();

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
          SELECT * FROM "passwordResets" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "passwordResets" ("createdAt", "user", "nonce")
                VALUES (
                  ${new Date().toISOString()},
                  ${userId},
                  ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
                )
              `
            ).lastInsertRowid
          }
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
          WHERE
            "nonce" = ${nonce} AND
            "createdAt" > ${new Date(
              Date.now() - PasswordReset.maxAge
            ).toISOString()}
        `
      )?.user;
    },
  };

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log("CLEAN EXPIRED ‘passwordResets’", "STARTING...");
        application.database.run(
          sql`
            DELETE FROM "passwordResets"
            WHERE "createdAt" < ${new Date(
              Date.now() - PasswordReset.maxAge
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘passwordResets’", "FINISHED");
        await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
      }
    });

  application.server.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

    response.send(
      application.server.locals.layouts.box({
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
                value="${typeof request.query.invitation?.email === "string" &&
                request.query.invitation.email.trim() !== ""
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
  });

  application.server.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    { redirect?: string; invitation?: object },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

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
                  You may ignore this password reset link if you didn’t request
                  it.
                </small>
              </p>
            `,
          })}
        )
      `
    );
    got
      .post(`http://127.0.0.1:${application.ports.workerEventsAny}/send-email`)
      .catch((error) => {
        response.locals.log(
          "FAILED TO EMIT ‘/send-email’ EVENT",
          String(error),
          error?.stack
        );
      });

    if (request.body.resend === "true")
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Email resent.`,
      });
    response.send(
      application.server.locals.layouts.box({
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
              Didn’t receive the email? Already checked your spam inbox?
              <button class="link">Resend</button>.
            </p>
          </form>
        `,
      })
    );
  });

  application.server.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; invitation?: object },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password/:passwordResetNonce", (request, response) => {
    if (response.locals.user !== undefined) {
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
      application.server.locals.layouts.box({
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
  });

  application.server.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string; invitation?: object },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/reset-password/:passwordResetNonce",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user !== undefined) return next();

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
          SELECT * FROM "users" WHERE "id" = ${
            application.database.run(
              sql`
                UPDATE "users"
                SET "password" = ${await argon2.hash(
                  request.body.password,
                  application.server.locals.configuration.argon2
                )}
                WHERE "id" = ${userId}
              `
            ).lastInsertRowid
          }
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
          response.locals.log(
            "FAILED TO EMIT ‘/send-email’ EVENT",
            String(error),
            error?.stack
          );
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
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/sign-up", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

    response.send(
      application.server.locals.layouts.box({
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
                value="${typeof request.query.invitation?.email === "string" &&
                request.query.invitation.email.trim() !== ""
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
  });

  application.server.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; invitation?: object },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/sign-up",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user !== undefined) return next();

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
          SELECT * FROM "users" WHERE "id" = ${
            application.database.run(
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
                  ${lodash.sample(
                    application.server.locals.helpers
                      .userAvatarlessBackgroundColors
                  )},
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
              `
            ).lastInsertRowid
          }
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
          SELECT * FROM "emailVerifications" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "emailVerifications" ("createdAt", "user", "nonce")
                VALUES (
                  ${new Date().toISOString()},
                  ${userId},
                  ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
                )
              `
            ).lastInsertRowid
          }
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
        response.locals.log(
          "FAILED TO EMIT ‘/send-email’ EVENT",
          String(error),
          error?.stack
        );
      });
  };

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log("CLEAN EXPIRED ‘emailVerifications’", "STARTING...");
        application.database.run(
          sql`
            DELETE FROM "emailVerifications"
            WHERE "createdAt" < ${new Date(
              Date.now() - 24 * 60 * 60 * 1000
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘emailVerifications’", "FINISHED");
        await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
      }
    });

  application.server.post<
    {},
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/resend-email-verification", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt !== null
    )
      return next();

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
        typeof request.query.redirect === "string" ? request.query.redirect : ""
      }`
    );
  });

  application.server.get<
    { emailVerificationNonce: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/email-verification/:emailVerificationNonce",
    (request, response, next) => {
      if (response.locals.user === undefined) return next();

      if (response.locals.user.emailVerifiedAt !== null) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`You have already verified your email.`,
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

  application.server.delete<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/sign-out", (request, response, next) => {
    if (response.locals.user === undefined) return next();

    application.server.locals.helpers.Session.close({ request, response });

    response
      .header(
        "Clear-Site-Data",
        `"*", "cache", "cookies", "storage", "executionContexts"`
      )
      .redirect(303, `https://${application.configuration.hostname}/`);
  });
};
