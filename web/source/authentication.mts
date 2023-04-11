import timers from "node:timers/promises";
import express from "express";
import qs from "qs";
import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import lodash from "lodash";
import * as saml from "@node-saml/node-saml";
import { Application } from "./index.mjs";

export type ApplicationAuthentication = {
  web: {
    locals: {
      ResponseLocals: {
        SignedIn: Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] & {
          session: {
            userId: number;
            samlIdentifier?: string;
            samlSessionIndex?: string;
          };

          user: {
            id: number;
            lastSeenOnlineAt: string;
            reference: string;
            email: string;
            password: string | null;
            emailVerifiedAt: string | null;
            name: string;
            avatar: string | null;
            avatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
            biographySource: string | null;
            biographyPreprocessed: HTML | null;
            systemRole: Application["web"]["locals"]["helpers"]["systemRoles"][number];
            emailNotificationsForAllMessages: Application["web"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
            emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
            emailNotificationsForMentionsAt: string | null;
            emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
              | string
              | null;
            emailNotificationsForMessagesInConversationsYouStartedAt:
              | string
              | null;
            preferContentEditorProgrammerModeAt: string | null;
            preferContentEditorToolbarInCompactAt: string | null;
            preferAnonymousAt: string | null;
            latestNewsVersion: string;
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
              studentsMayCreatePollsAt: string | null;
            };
            reference: string;
            courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
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
              studentsMayCreatePollsAt: string | null;
            };
            reference: string;
            courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
            accentColor: Application["web"]["locals"]["helpers"]["enrollmentAccentColors"][number];
          }[];

          administrationOptions: {
            latestVersion: string;
            userSystemRolesWhoMayCreateCourses: Application["web"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
          };
        };
      };

      configuration: {
        argon2: argon2.Options & { raw?: false };
      };

      helpers: {
        Session: {
          maxAge: number;

          open: ({
            request,
            response,
            userId,
            samlIdentifier,
            samlSessionIndex,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            userId: number;
            samlIdentifier?: string;
            samlSessionIndex?: string;
          }) => void;

          get: ({
            request,
            response,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
          }) =>
            | {
                userId: number;
                samlIdentifier?: string;
                samlSessionIndex?: string;
              }
            | undefined;

          close: ({
            request,
            response,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
          }) => void;

          closeAllAndReopen: ({
            request,
            response,
            userId,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            userId: number;
          }) => void;
        };

        passwordConfirmation: ({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            { passwordConfirmation?: string },
            {},
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
        }) => Promise<boolean>;

        mayCreateCourses: ({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
          >;
        }) => boolean;

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
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          userId: number;
          userEmail: string;
          welcome?: boolean;
        }) => void;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.configuration.argon2 = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  application.web.locals.helpers.Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open: ({
      request,
      response,
      userId,
      samlIdentifier = undefined,
      samlSessionIndex = undefined,
    }) => {
      const session = application.database.get<{
        token: string;
      }>(
        sql`
          SELECT * FROM "sessions" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "sessions" (
                  "createdAt",
                  "token",
                  "user",
                  "samlIdentifier",
                  "samlSessionIndex"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${cryptoRandomString({ length: 100, type: "alphanumeric" })},
                  ${userId},
                  ${samlIdentifier},
                  ${samlSessionIndex}
                )
              `
            ).lastInsertRowid
          }
        `
      )!;

      request.cookies["__Host-Session"] = session.token;
      response.cookie("__Host-Session", session.token, {
        ...application.web.locals.configuration.cookies,
        maxAge: application.web.locals.helpers.Session.maxAge,
      });
    },

    get: ({ request, response }) => {
      if (request.cookies["__Host-Session"] === undefined) return undefined;

      const session = application.database.get<{
        createdAt: string;
        userId: number;
        samlIdentifier: string | null;
        samlSessionIndex: string | null;
      }>(
        sql`
          SELECT
            "createdAt",
            "user" AS "userId",
            "samlIdentifier",
            "samlSessionIndex"
          FROM "sessions"
          WHERE "token" = ${request.cookies["__Host-Session"]}
        `
      );

      if (
        session === undefined ||
        new Date(session.createdAt).getTime() <
          Date.now() - application.web.locals.helpers.Session.maxAge
      ) {
        application.web.locals.helpers.Session.close({ request, response });
        return undefined;
      } else if (
        typeof request.header("Live-Connection") !== "string" &&
        new Date(session.createdAt).getTime() <
          Date.now() - application.web.locals.helpers.Session.maxAge / 2
      ) {
        application.web.locals.helpers.Session.close({ request, response });
        application.web.locals.helpers.Session.open({
          request,
          response,
          userId: session.userId,
          samlIdentifier: session.samlIdentifier ?? undefined,
          samlSessionIndex: session.samlSessionIndex ?? undefined,
        });
      }

      return {
        userId: session.userId,
        samlIdentifier: session.samlIdentifier ?? undefined,
        samlSessionIndex: session.samlSessionIndex ?? undefined,
      };
    },

    close: ({ request, response }) => {
      if (request.cookies["__Host-Session"] === undefined) return;

      application.database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${request.cookies["__Host-Session"]}`
      );

      delete request.cookies["__Host-Session"];
      response.clearCookie(
        "__Host-Session",
        application.web.locals.configuration.cookies
      );
    },

    closeAllAndReopen: ({ request, response, userId }) => {
      const session = application.web.locals.helpers.Session.get({
        request,
        response,
      });

      application.web.locals.helpers.Session.close({ request, response });

      application.database.run(
        sql`DELETE FROM "sessions" WHERE "user" = ${userId}`
      );

      application.web.locals.helpers.Session.open({
        request,
        response,
        userId,
        samlIdentifier: session?.samlIdentifier,
        samlSessionIndex: session?.samlSessionIndex,
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
              Date.now() - application.web.locals.helpers.Session.maxAge
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘sessions’", "FINISHED");
        await timers.setTimeout(
          24 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });

  application.web.use<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >((request, response, next) => {
    const session = application.web.locals.helpers.Session.get({
      request,
      response,
    });
    if (session === undefined) return next();
    response.locals.session = session;

    response.locals.user = application.database.get<{
      id: number;
      lastSeenOnlineAt: string;
      reference: string;
      email: string;
      password: string | null;
      emailVerifiedAt: string | null;
      name: string;
      avatar: string | null;
      avatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
      biographySource: string | null;
      biographyPreprocessed: HTML | null;
      systemRole: Application["web"]["locals"]["helpers"]["systemRoles"][number];
      emailNotificationsForAllMessages: Application["web"]["locals"]["helpers"]["userEmailNotificationsForAllMessageses"][number];
      emailNotificationsForAllMessagesDigestDeliveredAt: string | null;
      emailNotificationsForMentionsAt: string | null;
      emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt:
        | string
        | null;
      emailNotificationsForMessagesInConversationsYouStartedAt: string | null;
      preferContentEditorProgrammerModeAt: string | null;
      preferContentEditorToolbarInCompactAt: string | null;
      preferAnonymousAt: string | null;
      latestNewsVersion: string;
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
          "emailNotificationsForMessagesInConversationsYouStartedAt",
          "preferContentEditorProgrammerModeAt",
          "preferContentEditorToolbarInCompactAt",
          "preferAnonymousAt",
          "latestNewsVersion"
        FROM "users"
        WHERE "id" = ${response.locals.session.userId}
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
        courseStudentsMayCreatePollsAt: string | null;
        reference: string;
        courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
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
            "courses"."studentsMayCreatePollsAt" AS "courseStudentsMayCreatePollsAt",
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
          studentsMayCreatePollsAt: invitation.courseStudentsMayCreatePollsAt,
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
        courseStudentsMayCreatePollsAt: string | null;
        reference: string;
        courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        accentColor: Application["web"]["locals"]["helpers"]["enrollmentAccentColors"][number];
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
            "courses"."studentsMayCreatePollsAt" AS "courseStudentsMayCreatePollsAt",
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
          studentsMayCreatePollsAt: enrollment.courseStudentsMayCreatePollsAt,
        },
        reference: enrollment.reference,
        courseRole: enrollment.courseRole,
        accentColor: enrollment.accentColor,
      }));

    response.locals.administrationOptions =
      application.database.get<{
        latestVersion: string;
        userSystemRolesWhoMayCreateCourses: Application["web"]["locals"]["helpers"]["userSystemRolesWhoMayCreateCourseses"][number];
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

  application.web.locals.helpers.passwordConfirmation = async ({
    request,
    response,
  }) =>
    typeof request.body.passwordConfirmation === "string" &&
    request.body.passwordConfirmation.trim() !== "" &&
    typeof response.locals.user.password === "string" &&
    response.locals.user.password.trim() !== "" &&
    (await argon2.verify(
      response.locals.user.password,
      request.body.passwordConfirmation
    ));

  application.web.locals.helpers.mayCreateCourses = ({ request, response }) =>
    response.locals.administrationOptions.userSystemRolesWhoMayCreateCourses ===
      "all" ||
    (response.locals.administrationOptions
      .userSystemRolesWhoMayCreateCourses === "staff-and-administrators" &&
      ["staff", "administrator"].includes(response.locals.user.systemRole)) ||
    (response.locals.administrationOptions
      .userSystemRolesWhoMayCreateCourses === "administrators" &&
      response.locals.user.systemRole === "administrator");

  application.web.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(["/", "/sign-in"], (request, response, next) => {
    if (
      response.locals.user !== undefined ||
      (request.originalUrl === "/" &&
        application.configuration.hostname ===
          application.addresses.canonicalHostname)
    )
      return next();

    response.send(
      application.web.locals.layouts.box({
        request,
        response,
        head: html`
          <title>
            Sign in · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <h2 class="heading">
            <i class="bi bi-box-arrow-in-right"></i>
            Sign in
          </h2>

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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                javascript="${javascript`
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
                javascript="${javascript`
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
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

          $${Object.keys(samls).length > 0
            ? html`
                <div
                  css="${css`
                    display: flex;
                    gap: var(--space--4);
                    align-items: center;
                  `}"
                >
                  <hr
                    class="separator"
                    css="${css`
                      flex: 1;
                    `}"
                  />
                  <span class="heading">Or</span>
                  <hr
                    class="separator"
                    css="${css`
                      flex: 1;
                    `}"
                  />
                </div>

                $${Object.entries(samls).map(
                  ([samlIdentifier, options]) => html`
                    <a
                      href="https://${application.configuration
                        .hostname}/saml/${samlIdentifier}/authentication-request${qs.stringify(
                        { redirect: request.query.redirect },
                        { addQueryPrefix: true }
                      )}"
                      class="button button--transparent"
                      javascript="${javascript`
                        this.onbeforelivenavigate = () => false;
                      `}"
                    >
                      $${options.logo !== undefined
                        ? html`
                            <img
                              src="https://${application.configuration
                                .hostname}/${options.logo.light}"
                              alt="${options.name}"
                              class="light"
                              style="width: ${String(
                                options.logo.width / 2
                              )}px;"
                              css="${css`
                                max-width: 100%;
                                height: auto;
                              `}"
                            />
                            <img
                              src="https://${application.configuration
                                .hostname}/${options.logo.dark}"
                              alt="${options.name}"
                              class="dark"
                              style="width: ${String(
                                options.logo.width / 2
                              )}px;"
                              css="${css`
                                max-width: 100%;
                                height: auto;
                              `}"
                            />
                          `
                        : html`
                            <i class="bi bi-bank"></i>
                            ${options.name}
                          `}
                    </a>
                  `
                )}
              `
            : html``}
        `,
      })
    );
  });

  application.web.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string; invitation?: object },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/sign-in",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user !== undefined) return next();

      if (
        typeof request.body.email !== "string" ||
        request.body.email.match(application.web.locals.helpers.emailRegExp) ===
          null ||
        typeof request.body.password !== "string" ||
        request.body.password.trim() === ""
      )
        return next("Validation");

      const user = application.database.get<{
        id: number;
        password: string | null;
      }>(
        sql`
          SELECT "id", "password" FROM "users" WHERE "email" = ${request.body.email}
        `
      );

      if (
        user === undefined ||
        user.password === null ||
        !(await argon2.verify(user.password, request.body.password))
      ) {
        application.web.locals.helpers.Flash.set({
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

      application.web.locals.helpers.Session.open({
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

    create: (userId: number): string => {
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

    get: (nonce: string): number | undefined => {
      return application.database.get<{
        user: number;
      }>(
        sql`
          SELECT "user"
          FROM "passwordResets"
          WHERE
            "nonce" = ${nonce} AND
            ${new Date(
              Date.now() - PasswordReset.maxAge
            ).toISOString()} < "createdAt"
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
        await timers.setTimeout(
          24 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });

  application.web.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

    response.send(
      application.web.locals.layouts.box({
        request,
        response,
        head: html`
          <title>
            Reset Password · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <h2 class="heading">
            <i class="bi bi-key"></i>
            Reset Password
          </h2>

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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                javascript="${javascript`
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
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

  application.web.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    { redirect?: string; invitation?: object },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

    if (
      typeof request.body.email !== "string" ||
      request.body.email.match(application.web.locals.helpers.emailRegExp) ===
        null
    )
      return next("Validation");

    const user = application.database.get<{ id: number; email: string }>(
      sql`SELECT "id", "email" FROM "users" WHERE "email" = ${request.body.email}`
    );
    if (user === undefined) {
      application.web.locals.helpers.Flash.set({
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
    application.got
      .post(`http://127.0.0.1:${application.ports.workerEventsAny}/send-email`)
      .catch((error) => {
        response.locals.log(
          "FAILED TO EMIT ‘/send-email’ EVENT",
          String(error),
          error?.stack
        );
      });

    if (request.body.resend === "true")
      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Email resent.`,
      });
    response.send(
      application.web.locals.layouts.box({
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

  application.web.get<
    { passwordResetNonce: string },
    HTML,
    {},
    { redirect?: string; invitation?: object },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/reset-password/:passwordResetNonce", (request, response) => {
    if (response.locals.user !== undefined) {
      application.web.locals.helpers.Flash.set({
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
    const user =
      userId === undefined
        ? undefined
        : application.database.get<{ email: string; name: string }>(
            sql`
              SELECT "email", "name" FROM "users" WHERE "id" = ${userId}
            `
          );
    if (user === undefined) {
      application.web.locals.helpers.Flash.set({
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
      application.web.locals.layouts.box({
        request,
        response,
        head: html`
          <title>
            Reset Password · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <h2 class="heading">
            <i class="bi bi-key"></i>
            Reset Password
          </h2>

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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <label class="label">
              <p class="label--text">Name</p>
              <input value="${user.name}" disabled class="input--text" />
            </label>
            <label class="label">
              <p class="label--text">Email</p>
              <input value="${user.email}" disabled class="input--text" />
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
                javascript="${javascript`
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

  application.web.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string; invitation?: object },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
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
      const user =
        userId === undefined
          ? undefined
          : application.database.get<{ id: number; email: string }>(
              sql`
                SELECT "id", "email" FROM "users" WHERE "id" = ${userId}
              `
            );
      if (user === undefined) {
        application.web.locals.helpers.Flash.set({
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
        sql`DELETE FROM "passwordResets" WHERE "user" = ${user.id}`
      );
      application.database.run(
        sql`
          UPDATE "users"
          SET "password" = ${await argon2.hash(
            request.body.password,
            application.web.locals.configuration.argon2
          )}
          WHERE "id" = ${user.id}
        `
      );

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
      application.got
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

      application.web.locals.helpers.Session.closeAllAndReopen({
        request,
        response,
        userId: user.id,
      });

      application.web.locals.helpers.Flash.set({
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

  application.web.get<
    {},
    HTML,
    {},
    { redirect?: string; invitation?: { email?: string; name?: string } },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >("/sign-up", (request, response, next) => {
    if (response.locals.user !== undefined) return next();

    response.send(
      application.web.locals.layouts.box({
        request,
        response,
        head: html`
          <title>
            Sign up · Courselore · Communication Platform for Education
          </title>
        `,
        body: html`
          <h2 class="heading">
            <i class="bi bi-person-plus"></i>
            Sign up
          </h2>

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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                javascript="${javascript`
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `}"
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

  application.web.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string; invitation?: object },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/sign-up",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user !== undefined) return next();

      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === "" ||
        typeof request.body.email !== "string" ||
        request.body.email.match(application.web.locals.helpers.emailRegExp) ===
          null ||
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
        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            An account with this email address already exists. Perhaps you
            forgot your password?
          `,
        });
        return response.redirect(
          303,
          `https://${
            application.configuration.hostname
          }/reset-password${qs.stringify(
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
                  "emailNotificationsForMessagesInConversationsYouStartedAt",
                  "latestNewsVersion"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${new Date().toISOString()},
                  ${cryptoRandomString({ length: 20, type: "numeric" })},
                  ${request.body.email},
                  ${await argon2.hash(
                    request.body.password,
                    application.web.locals.configuration.argon2
                  )},
                  ${null},
                  ${request.body.name},
                  ${html`${request.body.name}`},
                  ${lodash.sample(
                    application.web.locals.helpers
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
                  ${new Date().toISOString()},
                  ${application.version}
                )
              `
            ).lastInsertRowid
          }
        `
      )!;

      application.web.locals.helpers.emailVerification({
        request,
        response,
        userId: user.id,
        userEmail: user.email,
        welcome: true,
      });

      application.web.locals.helpers.Session.open({
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

  application.web.locals.helpers.emailVerification = ({
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
    application.got
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
        await timers.setTimeout(
          24 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });

  application.web.post<
    {},
    HTML,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/resend-email-verification", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt !== null
    )
      return next();

    application.web.locals.helpers.emailVerification({
      request,
      response,
      userId: response.locals.user.id,
      userEmail: response.locals.user.email,
    });

    application.web.locals.helpers.Flash.set({
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

  application.web.get<
    { emailVerificationNonce: string },
    HTML,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/email-verification/:emailVerificationNonce",
    (request, response, next) => {
      if (response.locals.user === undefined) return next();

      if (response.locals.user.emailVerifiedAt !== null) {
        application.web.locals.helpers.Flash.set({
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
        application.web.locals.helpers.Flash.set({
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
        application.web.locals.helpers.Flash.set({
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

      application.web.locals.helpers.Flash.set({
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

  application.web.delete<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/sign-out", (request, response, next) => {
    if (response.locals.user === undefined) return next();

    application.web.locals.helpers.Session.close({ request, response });

    response
      .header(
        "Clear-Site-Data",
        `"*", "cache", "cookies", "storage", "executionContexts"`
      )
      .redirect(303, `https://${application.configuration.hostname}/`);
  });

  const samls = Object.fromEntries(
    Object.entries(application.configuration.saml).map(
      ([samlIdentifier, options]) => [
        samlIdentifier,
        {
          ...options,
          saml: new saml.SAML({
            ...options.options,
            issuer: `https://${application.configuration.hostname}/saml/${samlIdentifier}/metadata`,
            callbackUrl: `https://${application.configuration.hostname}/saml/${samlIdentifier}/assertion-consumer-service`,
            logoutCallbackUrl: `https://${application.configuration.hostname}/saml/${samlIdentifier}/single-logout-service`,
            validateInResponseTo: saml.ValidateInResponseTo.ifPresent,
            requestIdExpirationPeriodMs: 60 * 60 * 1000,
            cacheProvider: {
              saveAsync: async (key, value) => {
                if (
                  typeof (await samls[
                    samlIdentifier
                  ].saml.cacheProvider.getAsync(key)) === "string"
                )
                  return null;

                const cacheItem = application.database.get<{
                  createdAt: string;
                  value: string;
                }>(
                  sql`
                    SELECT * FROM "samlCache" WHERE "id" = ${
                      application.database.run(
                        sql`
                          INSERT INTO "samlCache" (
                            "createdAt",
                            "samlIdentifier",
                            "key",
                            "value"
                          )
                          VALUES (
                            ${new Date().toISOString()},
                            ${samlIdentifier},
                            ${key},
                            ${value}
                          )
                        `
                      ).lastInsertRowid
                    }
                  `
                )!;

                return {
                  createdAt: new Date(cacheItem.createdAt).getTime(),
                  value: cacheItem.value,
                };
              },

              getAsync: async (key) => {
                return (
                  application.database.get<{ value: string }>(
                    sql`
                      SELECT "value"
                      FROM "samlCache"
                      WHERE
                        ${new Date(
                          new Date().getTime() - 60 * 60 * 1000
                        ).toISOString()} < "createdAt" AND
                        "samlIdentifier" = ${samlIdentifier} AND
                        "key" = ${key}
                    `
                  )?.value ?? null
                );
              },

              removeAsync: async (key) => {
                application.database.run(
                  sql`
                    DELETE FROM "samlCache"
                    WHERE
                      "samlIdentifier" = ${samlIdentifier} AND
                      "key" = ${key}
                  `
                );

                return key;
              },
            },
          }),
        },
      ]
    )
  );

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log("CLEAN EXPIRED ‘samlCache’", "STARTING...");
        application.database.run(
          sql`
            DELETE FROM "samlCache"
            WHERE "createdAt" <= ${new Date(
              Date.now() - 60 * 60 * 1000
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘samlCache’", "FINISHED");
        await timers.setTimeout(
          60 * 60 * 1000 + Math.random() * 5 * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });

  type ResponseLocalsSAML =
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] & {
      saml: (typeof samls)[string];
    };

  application.web.use<
    { samlIdentifier: string },
    any,
    {},
    {},
    ResponseLocalsSAML
  >("/saml/:samlIdentifier", (request, response, next) => {
    response.locals.saml = samls[request.params.samlIdentifier];
    next();
  });

  application.web.get<
    { samlIdentifier: string },
    HTML,
    {},
    {},
    ResponseLocalsSAML
  >("/saml/:samlIdentifier/metadata", (request, response, next) => {
    if (response.locals.saml === undefined) return next();

    response
      .contentType("application/xml")
      .send(
        response.locals.saml.saml.generateServiceProviderMetadata(
          response.locals.saml.options.decryptionCert ?? null,
          response.locals.saml.options.signingCert ?? null
        )
      );
  });

  application.web.get<
    { samlIdentifier: string },
    HTML,
    {},
    { redirect?: string },
    ResponseLocalsSAML &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/saml/:samlIdentifier/authentication-request",
    asyncHandler(async (request, response, next) => {
      if (
        response.locals.saml === undefined ||
        response.locals.user !== undefined
      )
        return next();

      response.redirect(
        303,
        await response.locals.saml.saml.getAuthorizeUrlAsync(
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : "",
          undefined,
          {}
        )
      );
    })
  );

  application.web.post<
    { samlIdentifier: string },
    any,
    { RelayState: string },
    { redirect?: string; invitation?: { email?: string; name?: string } },
    ResponseLocalsSAML &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/saml/:samlIdentifier/assertion-consumer-service",
    asyncHandler(async (request, response, next) => {
      if (response.locals.saml === undefined) return next();

      const samlResponse = await response.locals.saml.saml
        .validatePostResponseAsync(request.body)
        .catch(() => undefined);

      if (
        response.locals.user !== undefined &&
        response.locals.session !== undefined
      ) {
        if (response.locals.user.email === samlResponse?.profile?.nameID) {
          if (
            typeof samlResponse.profile.sessionIndex === "string" &&
            samlResponse.profile.sessionIndex.trim() !== ""
          )
            application.database.run(
              sql`
                UPDATE "sessions"
                SET "samlSessionIndex" = ${samlResponse.profile.sessionIndex}
                WHERE
                  "samlIdentifier" = ${response.locals.session.samlIdentifier} AND
                  "samlSessionIndex" = ${response.locals.session.samlSessionIndex}
              `
            );

          application.database.run(
            sql`
              UPDATE "users"
              SET "emailVerifiedAt" = ${new Date().toISOString()}
              WHERE
                "id" = ${response.locals.user.id} AND
                "emailVerifiedAt" IS NULL
            `
          );
        } else
          application.web.locals.helpers.Flash.set({
            request,
            response,
            theme: "rose",
            content: html`
              <p>
                You’re already signed in and you tried to sign in again as a
                different user. If you intend to sign in as a different user
                please sign out first.
              </p>
            `,
          });

        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.body.RelayState === "string"
              ? request.body.RelayState
              : ""
          }`
        );
      }

      if (
        samlResponse === undefined ||
        samlResponse.profile === null ||
        typeof samlResponse.profile.sessionIndex !== "string" ||
        samlResponse.profile.sessionIndex.trim() === "" ||
        typeof samlResponse.profile.nameID !== "string" ||
        samlResponse.profile.nameID.trim() === "" ||
        samlResponse.loggedOut
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign in · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                The information Courselore received from
                ${response.locals.saml.name} is invalid.
              </p>

              <p>
                Please
                <a
                  href="https://${application.configuration
                    .hostname}/saml/${request.params
                    .samlIdentifier}/authentication-request${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  javascript="${javascript`
                    this.onbeforelivenavigate = () => false;
                  `}"
                  >try again</a
                >
                and if the issue persists report to the system administrator at
                <a
                  href="mailto:${application.configuration.administratorEmail}"
                  target="_blank"
                  class="link"
                  >${application.configuration.administratorEmail}</a
                >.
              </p>

              <p>
                For the time being, you may also
                <a
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign in</a
                >
                or
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign up</a
                >
                to Courselore using email and password.
              </p>
            `,
          })
        );

      if (
        samlResponse.profile.nameIDFormat !==
        "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign in · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                The <code class="code">nameIDFormat</code> in the information
                that Courselore received from ${response.locals.saml.name} is
                <code class="code">${samlResponse.profile.nameIDFormat}</code>
                and currently Courselore only supports
                <code class="code"
                  >urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</code
                >.
              </p>

              <p>
                Please contact the Courselore development team at
                <a
                  href="mailto:development@courselore.org"
                  target="_blank"
                  class="link"
                  >development@courselore.org</a
                >
                and manifest your interest in adding support for other
                <code class="code">nameIDFormat</code>s.
              </p>

              <p>
                For the time being, please
                <a
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign in</a
                >
                or
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign up</a
                >
                to Courselore using email and password.
              </p>
            `,
          })
        );

      if (
        samlResponse.profile.nameID.match(
          application.web.locals.helpers.emailRegExp
        ) === null
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign in · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                The email address in the information Courselore received from
                ${response.locals.saml.name} is in a format that Courselore
                doesn’t support currently.
              </p>

              <p>
                Please contact the Courselore development team at
                <a
                  href="mailto:development@courselore.org"
                  target="_blank"
                  class="link"
                  >development@courselore.org</a
                >
                and manifest your interest in adding support for more email
                formats.
              </p>

              <p>
                For the time being, please
                <a
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign in</a
                >
                or
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign up</a
                >
                to Courselore using email and password.
              </p>
            `,
          })
        );

      if (
        !response.locals.saml.domains.some(
          (domain) =>
            samlResponse.profile!.nameID.endsWith(`@${domain}`) ||
            samlResponse.profile!.nameID.endsWith(`.${domain}`)
        )
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign in · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                The email address in the information that Courselore received
                from ${response.locals.saml.name} is for a domain that isn’t
                included in the configuration.
              </p>

              <p>
                Please report to the system administrator at
                <a
                  href="mailto:${application.configuration.administratorEmail}"
                  target="_blank"
                  class="link"
                  >${application.configuration.administratorEmail}</a
                >.
              </p>

              <p>
                For the time being, you may
                <a
                  href="https://${application.configuration
                    .hostname}/sign-in${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign in</a
                >
                or
                <a
                  href="https://${application.configuration
                    .hostname}/sign-up${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  class="link"
                  >sign up</a
                >
                to Courselore using email and password.
              </p>
            `,
          })
        );

      let user = application.database.get<{ id: number }>(
        sql`SELECT "id" FROM "users" WHERE "email" = ${samlResponse.profile.nameID}`
      );

      if (user === undefined) {
        const userName = response.locals.saml.extractName?.(samlResponse);
        if (typeof userName !== "string" || userName.trim() === "")
          return response.send(
            application.web.locals.layouts.box({
              request,
              response,
              head: html`
                <title>
                  ${response.locals.saml.name} · Sign up · Courselore ·
                  Communication Platform for Education
                </title>
              `,
              body: html`
                <h2 class="heading">
                  <i class="bi bi-person-plus"></i>
                  Sign up ·
                  <i class="bi bi-bank"></i>
                  ${response.locals.saml.name}
                </h2>

                <form
                  method="POST"
                  action="https://${application.configuration
                    .hostname}/saml/${request.params
                    .samlIdentifier}/sign-up${qs.stringify(
                    { redirect: request.query.redirect },
                    { addQueryPrefix: true }
                  )}"
                  novalidate
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  <label class="label">
                    <p class="label--text">Name</p>
                    <input
                      type="text"
                      name="name"
                      value="${typeof request.query.invitation?.name ===
                        "string" && request.query.invitation.name.trim() !== ""
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
                      value="${samlResponse.profile.nameID}"
                      disabled
                      class="input--text"
                    />
                  </label>
                  <button class="button button--blue">
                    <i class="bi bi-person-plus-fill"></i>
                    Sign up
                  </button>
                </form>
              `,
            })
          );

        user = application.database.get<{ id: number }>(
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
                    "emailNotificationsForMessagesInConversationsYouStartedAt",
                    "latestNewsVersion"
                  )
                  VALUES (
                    ${new Date().toISOString()},
                    ${new Date().toISOString()},
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${samlResponse.profile.nameID},
                    ${null},
                    ${new Date().toISOString()},
                    ${userName},
                    ${html`${userName}`},
                    ${lodash.sample(
                      application.web.locals.helpers
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
                    ${new Date().toISOString()},
                    ${application.version}
                  )
                `
              ).lastInsertRowid
            }
          `
        )!;
      } else
        application.database.run(
          sql`
            UPDATE "users"
            SET "emailVerifiedAt" = ${new Date().toISOString()}
            WHERE
              "id" = ${user.id} AND
              "emailVerifiedAt" IS NULL
          `
        );

      application.web.locals.helpers.Session.open({
        request,
        response,
        userId: user.id,
        samlIdentifier: request.params.samlIdentifier,
        samlSessionIndex: samlResponse.profile.sessionIndex,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.body.RelayState === "string"
            ? request.body.RelayState
            : ""
        }`
      );
    })
  );

  application.web.get<
    { samlIdentifier: string },
    HTML,
    {},
    {},
    ResponseLocalsSAML &
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/saml/:samlIdentifier/logout-request",
    asyncHandler(async (request, response, next) => {
      if (
        response.locals.saml === undefined ||
        response.locals.user === undefined ||
        response.locals.session.samlIdentifier !== request.params.samlIdentifier
      )
        return next();

      response.contentType("text/plain").send(
        await response.locals.saml.saml.getLogoutUrlAsync(
          {
            issuer: `https://${application.configuration.hostname}/saml/${response.locals.session.samlIdentifier}/metadata`,
            sessionIndex: response.locals.session.samlSessionIndex,
            nameIDFormat:
              "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
            nameID: response.locals.user.email,
          },
          "",
          {}
        )
      );
    })
  );

  application.web.post<
    { samlIdentifier: string },
    any,
    { RelayState: string },
    {},
    ResponseLocalsSAML &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(
    "/saml/:samlIdentifier/single-logout-service",
    asyncHandler(async (request, response, next) => {
      if (response.locals.saml === undefined) return next();

      const samlRequest = await response.locals.saml.saml
        .validatePostRequestAsync(request.body)
        .catch(() => undefined);

      if (samlRequest !== undefined) {
        if (
          response.locals.user === undefined ||
          response.locals.session === undefined ||
          response.locals.session.samlIdentifier !==
            request.params.samlIdentifier ||
          response.locals.session.samlSessionIndex !==
            samlRequest.profile.sessionIndex ||
          typeof samlRequest.profile?.nameID !== "string" ||
          samlRequest.profile.nameID !== response.locals.user.email ||
          samlRequest.loggedOut !== true
        )
          return response.redirect(
            303,
            await response.locals.saml.saml.getLogoutResponseUrlAsync(
              samlRequest.profile,
              request.body.RelayState,
              {},
              false
            )
          );

        application.web.locals.helpers.Session.close({ request, response });

        return response
          .header(
            "Clear-Site-Data",
            `"*", "cache", "cookies", "storage", "executionContexts"`
          )
          .redirect(
            303,
            await response.locals.saml.saml.getLogoutResponseUrlAsync(
              samlRequest.profile,
              request.body.RelayState,
              {},
              true
            )
          );
      }

      if (
        response.locals.user === undefined ||
        response.locals.session === undefined
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                ${response.locals.saml.name} · Sign out · Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-right"></i>
                Sign out ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                You’re trying to sign out of Courselore but you aren’t signed
                in.
              </p>

              <p>
                <a
                  href="https://${application.configuration.hostname}/sign-in"
                  class="link"
                  >Sign in</a
                >
                or
                <a
                  href="https://${application.configuration.hostname}/sign-up"
                  class="link"
                  >sign up</a
                >
                to Courselore.
              </p>
            `,
          })
        );

      if (
        response.locals.session.samlIdentifier !== request.params.samlIdentifier
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign out · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-right"></i>
                Sign out ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                You’re trying to sign out using a different identity provider
                from the one you used to sign in.
              </p>

              <p>
                Please try again and if the issue persists report to the system
                administrator at
                <a
                  href="mailto:${application.configuration.administratorEmail}"
                  target="_blank"
                  class="link"
                  >${application.configuration.administratorEmail}</a
                >.
              </p>

              <form
                method="DELETE"
                action="https://${application.configuration.hostname}/sign-out"
              >
                For the time being, you may also
                <button class="link">sign out of Courselore</button>.
              </form>
            `,
          })
        );

      const samlResponse = await response.locals.saml.saml
        .validatePostResponseAsync(request.body)
        .catch(() => undefined);

      if (samlResponse === undefined || samlResponse.loggedOut !== true)
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign out · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-right"></i>
                Sign out ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <p>
                The information Courselore received from
                ${response.locals.saml.name} is invalid.
              </p>

              <p>
                Please try again and if the issue persists report to the system
                administrator at
                <a
                  href="mailto:${application.configuration.administratorEmail}"
                  target="_blank"
                  class="link"
                  >${application.configuration.administratorEmail}</a
                >.
              </p>

              <form
                method="DELETE"
                action="https://${application.configuration.hostname}/sign-out"
              >
                For the time being, you may also
                <button class="link">sign out of Courselore</button>.
              </form>
            `,
          })
        );

      if (
        (typeof samlResponse.profile?.sessionIndex === "string" &&
          samlResponse.profile.sessionIndex !==
            response.locals.session.samlSessionIndex) ||
        (typeof samlResponse.profile?.nameID === "string" &&
          samlResponse.profile.nameID !== response.locals.user.email)
      )
        return response.status(422).send(
          application.web.locals.layouts.box({
            request,
            response,
            head: html`<title>
              ${response.locals.saml.name} · Sign out · Courselore
            </title>`,
            body: html`
              <h2 class="heading">
                <i class="bi bi-box-arrow-right"></i>
                Sign out ·
                <i class="bi bi-bank"></i>
                ${response.locals.saml.name}
              </h2>

              <form
                method="DELETE"
                action="https://${application.configuration.hostname}/sign-out"
              >
                You’re trying to sign out from a different session.
                <button class="link">Sign out of Courselore</button>.
              </form>
            `,
          })
        );

      application.web.locals.helpers.Session.close({ request, response });

      return response
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.body.RelayState === "string"
              ? request.body.RelayState
              : ""
          }`
        );
    })
  );
};
