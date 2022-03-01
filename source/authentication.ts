import express from "express";
import { Database, sql } from "@leafac/sqlite";
import cryptoRandomString from "crypto-random-string";
import { BaseMiddlewareLocals } from "./global-middleware.js";

export default ({
  database,
  cookieOptions,
}: {
  database: Database;
  cookieOptions: express.CookieOptions;
}): {} => {
  const Session = {
    maxAge: 180 * 24 * 60 * 60 * 1000,

    open({
      req,
      res,
      userId,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
      userId: number;
    }): void {
      const session = database.get<{
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
        ...cookieOptions,
        maxAge: Session.maxAge,
      });
    },

    get({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): number | undefined {
      if (req.cookies.session === undefined) return undefined;
      const session = database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() < Date.now() - Session.maxAge
      ) {
        Session.close({ req, res });
        return undefined;
      } else if (
        new Date(session.createdAt).getTime() <
        Date.now() - Session.maxAge / 2
      ) {
        Session.close({ req, res });
        Session.open({ req, res, userId: session.user });
      }
      database.run(
        sql`
          UPDATE "users"
          SET "lastSeenOnlineAt" = ${new Date().toISOString()}
          WHERE "id" = ${session.user}
        `
      );
      return session.user;
    },

    close({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): void {
      if (req.cookies.session === undefined) return;
      delete req.cookies.session;
      res.clearCookie("session", cookieOptions);
      database.run(
        sql`DELETE FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
    },

    closeAllAndReopen({
      req,
      res,
      userId,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
      userId: number;
    }): void {
      Session.close({ req, res });
      database.run(sql`DELETE FROM "sessions" WHERE "user" = ${userId}`);
      Session.open({ req, res, userId });
    },
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "sessions"
        WHERE "createdAt" < ${new Date(
          Date.now() - Session.maxAge
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  interface IsSignedOutMiddlewareLocals extends BaseMiddlewareLocals {}
  const isSignedOutMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedOutMiddlewareLocals
  >[] = [
    (req, res, next) => {
      if (Session.get({ req, res }) !== undefined) return next("route");
      next();
    },
  ];

  interface IsSignedInMiddlewareLocals extends BaseMiddlewareLocals {
    user: {
      id: number;
      lastSeenOnlineAt: string;
      email: string;
      password: string;
      emailConfirmedAt: string | null;
      name: string;
      avatar: string | null;
      avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
      biographySource: string | null;
      biographyPreprocessed: HTML | null;
      emailNotifications: UserEmailNotifications;
    };
    invitations: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        nextConversationReference: number;
      };
      reference: string;
      role: EnrollmentRole;
    }[];
    enrollments: {
      id: number;
      course: {
        id: number;
        reference: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        nextConversationReference: number;
      };
      reference: string;
      role: EnrollmentRole;
      accentColor: EnrollmentAccentColor;
    }[];
  }
  const isSignedInMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedInMiddlewareLocals
  >[] = [
    (req, res, next) => {
      const userId = Session.get({ req, res });
      if (userId === undefined) return next("route");

      res.locals.user = database.get<{
        id: number;
        lastSeenOnlineAt: string;
        email: string;
        password: string;
        emailConfirmedAt: string | null;
        name: string;
        avatar: string | null;
        avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
        biographySource: string | null;
        biographyPreprocessed: HTML | null;
        emailNotifications: UserEmailNotifications;
      }>(
        sql`
          SELECT "id",
                 "lastSeenOnlineAt",
                 "email",
                 "password",
                 "emailConfirmedAt",
                 "name",
                 "avatar",
                 "avatarlessBackgroundColor",
                 "biographySource",
                 "biographyPreprocessed",
                 "emailNotifications"
          FROM "users"
          WHERE "id" = ${userId}
        `
      )!;

      res.locals.invitations = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          role: EnrollmentRole;
        }>(
          sql`
            SELECT "invitations"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
                   "invitations"."reference",
                   "invitations"."role"
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
            name: invitation.courseName,
            year: invitation.courseYear,
            term: invitation.courseTerm,
            institution: invitation.courseInstitution,
            code: invitation.courseCode,
            nextConversationReference:
              invitation.courseNextConversationReference,
          },
          reference: invitation.reference,
          role: invitation.role,
        }));

      res.locals.enrollments = database
        .all<{
          id: number;
          courseId: number;
          courseReference: string;
          courseName: string;
          courseYear: string | null;
          courseTerm: string | null;
          courseInstitution: string | null;
          courseCode: string | null;
          courseNextConversationReference: number;
          reference: string;
          role: EnrollmentRole;
          accentColor: EnrollmentAccentColor;
        }>(
          sql`
            SELECT "enrollments"."id",
                   "courses"."id" AS "courseId",
                   "courses"."reference" AS "courseReference",
                   "courses"."name" AS "courseName",
                   "courses"."year" AS "courseYear",
                   "courses"."term" AS "courseTerm",
                   "courses"."institution" AS "courseInstitution",
                   "courses"."code" AS "courseCode",
                   "courses"."nextConversationReference" AS "courseNextConversationReference",
                   "enrollments"."reference",
                   "enrollments"."role",
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
            name: enrollment.courseName,
            year: enrollment.courseYear,
            term: enrollment.courseTerm,
            institution: enrollment.courseInstitution,
            code: enrollment.courseCode,
            nextConversationReference:
              enrollment.courseNextConversationReference,
          },
          reference: enrollment.reference,
          role: enrollment.role,
          accentColor: enrollment.accentColor,
        }));

      next();
    },
  ];

  const signInRequestHandler: express.RequestHandler<
    {},
    HTML,
    {},
    { email?: string },
    IsSignedOutMiddlewareLocals
  > = (req, res) => {
    res.send(
      boxLayout({
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
            action="${baseURL}/sign-in${qs.stringify(req.query, {
              addQueryPrefix: true,
            })}"
            novalidate
            class="${res.locals.localCSS(css`
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
                value="${req.query.email ?? ""}"
                required
                autofocus
                class="input--text"
                oninteractive="${javascript`
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
                oninteractive="${javascript`
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
            class="${res.locals.localCSS(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--2);
            `)}"
          >
            <p>
              Don’t have an account?
              <a
                href="${baseURL}/sign-up${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Sign up</a
              >.
            </p>
            <p>
              Forgot your password?
              <a
                href="${baseURL}/reset-password${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Reset password</a
              >.
            </p>
          </div>
        `,
      })
    );
  };

  return {};
};
