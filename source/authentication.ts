import express from "express";
import { Database, sql } from "@leafac/sqlite";
import cryptoRandomString from "crypto-random-string";
import { Courselore, BaseMiddlewareLocals } from "./index.js";

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

export default (app: Courselore): void => {
  app.locals.helpers.Session = {
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

    get({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): number | undefined {
      if (req.cookies.session === undefined) return undefined;
      const session = app.locals.database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "sessions" WHERE "token" = ${req.cookies.session}`
      );
      if (
        session === undefined ||
        new Date(session.createdAt).getTime() < Date.now() - Session.maxAge
      ) {
        app.locals.helpers.Session.close({ req, res });
        return undefined;
      } else if (
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

    close({
      req,
      res,
    }: {
      req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
      res: express.Response<any, BaseMiddlewareLocals>;
    }): void {
      if (req.cookies.session === undefined) return;
      delete req.cookies.session;
      res.clearCookie("session", app.locals.options.cookies);
      app.locals.database.run(
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
      app.locals.helpers.Session.close({ req, res });
      app.locals.database.run(
        sql`DELETE FROM "sessions" WHERE "user" = ${userId}`
      );
      app.locals.helpers.Session.open({ req, res, userId });
    },
  };
  setTimeout(function worker() {
    app.locals.database.run(
      sql`
        DELETE FROM "sessions"
        WHERE "createdAt" < ${new Date(
          Date.now() - app.locals.helpers.Session.maxAge
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
  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/",
    ...isSignedOutMiddleware,
    baseURL === canonicalBaseURL ? aboutRequestHandler : signInRequestHandler
  );
  app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
    "/sign-in",
    ...isSignedOutMiddleware,
    signInRequestHandler
  );
  app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/sign-in",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  app.post<
    {},
    HTML,
    { email?: string; password?: string },
    { redirect?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-in",
    ...isSignedOutMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.email !== "string" ||
        req.body.email.match(emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === ""
      )
        return next("validation");
      const user = database.get<{ id: number; password: string }>(
        sql`SELECT "id", "password" FROM "users" WHERE "email" = ${req.body.email}`
      );
      if (
        user === undefined ||
        !(await argon2.verify(user.password, req.body.password))
      ) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">Incorrect email & password.</div>
          `,
        });
        return res.redirect(
          `${baseURL}/sign-in${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }
      Session.open({ req, res, userId: user.id });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  const PasswordReset = {
    maxAge: 10 * 60 * 1000,

    create(userId: number): string {
      database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "user" = ${userId}
        `
      );
      return database.get<{ nonce: string }>(
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
      const passwordReset = database.get<{
        createdAt: string;
        user: number;
      }>(
        sql`SELECT "createdAt", "user" FROM "passwordResets" WHERE "nonce" = ${nonce}`
      );
      database.run(
        sql`
          DELETE FROM "passwordResets" WHERE "nonce" = ${nonce}
        `
      );
      return passwordReset === undefined ||
        new Date(passwordReset.createdAt).getTime() <
          Date.now() - PasswordReset.maxAge
        ? undefined
        : passwordReset.user;
    },
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "passwordResets"
        WHERE "createdAt" < ${new Date(
          Date.now() - PasswordReset.maxAge
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  app.get<{}, HTML, {}, { email?: string }, BaseMiddlewareLocals>(
    "/reset-password",
    (req, res) => {
      res.send(
        boxLayout({
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
              action="${baseURL}/reset-password${qs.stringify(req.query, {
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
              <button class="button button--blue">
                <i class="bi bi-key"></i>
                Reset Password
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
                Remember your password?
                <a
                  href="${baseURL}/sign-in${qs.stringify(req.query, {
                    addQueryPrefix: true,
                  })}"
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

  app.post<
    {},
    HTML,
    { email?: string; resend?: "true" },
    {},
    BaseMiddlewareLocals
  >("/reset-password", (req, res, next) => {
    if (
      typeof req.body.email !== "string" ||
      req.body.email.match(emailRegExp) === null
    )
      return next("validation");

    const user = database.get<{ id: number; email: string }>(
      sql`SELECT "id", "email" FROM "users" WHERE "email" = ${req.body.email}`
    );
    if (user === undefined) {
      Flash.set({
        req,
        res,
        content: html`<div class="flash--rose">Email not found.</div>`,
      });
      return res.redirect(
        `${baseURL}/reset-password${qs.stringify(req.query, {
          addQueryPrefix: true,
        })}`
      );
    }

    const link = `${baseURL}/reset-password/${PasswordReset.create(
      user.id
    )}${qs.stringify(req.query, { addQueryPrefix: true })}`;
    database.run(
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
    sendEmailWorker();
    if (req.body.resend === "true")
      Flash.set({
        req,
        res,
        content: html`<div class="flash--green">Email resent.</div>`,
      });
    res.send(
      boxLayout({
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
            action="${baseURL}/reset-password${qs.stringify(req.query, {
              addQueryPrefix: true,
            })}"
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

  app.get<{ passwordResetNonce: string }, HTML, {}, {}, BaseMiddlewareLocals>(
    "/reset-password/:passwordResetNonce",
    (req, res) => {
      const userId = PasswordReset.get(req.params.passwordResetNonce);
      if (userId === undefined) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              This password reset link is invalid or expired.
            </div>
          `,
        });
        return res.redirect(
          `${baseURL}/reset-password${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }
      res.send(
        boxLayout({
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
              action="${baseURL}/reset-password/${PasswordReset.create(
                userId
              )}${qs.stringify(req.query, { addQueryPrefix: true })}"
              novalidate
              class="${res.locals.localCSS(css`
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
                  oninteractive="${javascript`
                    this.addEventListener("validate", (event) => {
                      if (this.value === this.closest("form").querySelector('[name="password"]').value) return;
                      event.stopImmediatePropagation();
                      event.detail.error = "Password & Password Confirmation don’t match.";
                    });
                  `}"
                />
              </label>
              <button class="button button--blue">
                <i class="bi bi-key"></i>
                Reset Password
              </button>
            </form>
          `,
        })
      );
    }
  );

  app.post<
    { passwordResetNonce: string },
    HTML,
    { password?: string },
    { redirect?: string },
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
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              Something went wrong in your password reset. Please start over.
            </div>
          `,
        });
        return res.redirect(
          `${baseURL}/reset-password${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }

      database.run(
        sql`
          UPDATE "users"
          SET "password" = ${await argon2.hash(
            req.body.password,
            argon2Options
          )}
          WHERE "id" = ${userId}
        `
      )!;
      Session.closeAllAndReopen({ req, res, userId });
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Password reset successfully.</div>
        `,
      });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  app.get<
    {},
    HTML,
    {},
    { name?: string; email?: string },
    IsSignedOutMiddlewareLocals
  >("/sign-up", ...isSignedOutMiddleware, (req, res) => {
    res.send(
      boxLayout({
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
            action="${baseURL}/sign-up${qs.stringify(req.query, {
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
              <p class="label--text">Name</p>
              <input
                type="text"
                name="name"
                value="${req.query.name ?? ""}"
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
                value="${req.query.email ?? ""}"
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
                oninteractive="${javascript`
                  this.addEventListener("validate", (event) => {
                    if (this.value === this.closest("form").querySelector('[name="password"]').value) return;
                    event.stopImmediatePropagation();
                    event.detail.error = "Password & Password Confirmation don’t match.";
                  });
                `}"
              />
            </label>
            <button class="button button--blue">
              <i class="bi bi-person-plus"></i>
              Sign up
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
              Already have an account account?
              <a
                href="${baseURL}/sign-in${qs.stringify(req.query, {
                  addQueryPrefix: true,
                })}"
                class="link"
                >Sign in</a
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
  });
  app.get<{}, HTML, {}, { redirect?: string }, IsSignedInMiddlewareLocals>(
    "/sign-up",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  const argon2Options = {
    type: argon2.argon2id,
    memoryCost: 15 * 2 ** 10,
    timeCost: 2,
    parallelism: 1,
  };

  const sendEmailConfirmationEmail = ({
    req,
    res,
    userId,
    userEmail,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    userId: number;
    userEmail: string;
  }): void => {
    const emailConfirmation = database.executeTransaction(() => {
      database.run(
        sql`
          DELETE FROM "emailConfirmations" WHERE "user" = ${userId}
        `
      );
      return database.get<{
        nonce: string;
      }>(
        sql`
          INSERT INTO "emailConfirmations" ("createdAt", "user", "nonce")
          VALUES (
            ${new Date().toISOString()},
            ${userId},
            ${cryptoRandomString({ length: 100, type: "alphanumeric" })}
          )
          RETURNING *
        `
      )!;
    });

    const link = `${baseURL}/email-confirmation/${
      emailConfirmation.nonce
    }${qs.stringify({ redirect: req.originalUrl }, { addQueryPrefix: true })}`;
    database.run(
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
                Please confirm your email:<br />
                <a href="${link}" target="_blank">${link}</a>
              </p>
            `,
          })}
        )
      `
    );
    sendEmailWorker();
  };
  setTimeout(function worker() {
    database.run(
      sql`
        DELETE FROM "emailConfirmations"
        WHERE "createdAt" < ${new Date(
          Date.now() - 24 * 60 * 60 * 1000
        ).toISOString()}
      `
    );
    setTimeout(worker, 24 * 60 * 60 * 1000);
  }, 10 * 60 * 1000);

  app.post<
    {},
    HTML,
    { name?: string; email?: string; password?: string },
    { redirect?: string },
    IsSignedOutMiddlewareLocals
  >(
    "/sign-up",
    ...isSignedOutMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        typeof req.body.email !== "string" ||
        req.body.email.match(emailRegExp) === null ||
        typeof req.body.password !== "string" ||
        req.body.password.trim() === "" ||
        req.body.password.length < 8
      )
        return next("validation");

      if (
        database.get<{}>(
          sql`
            SELECT TRUE FROM "users" WHERE "email" = ${req.body.email}
          `
        ) !== undefined
      ) {
        Flash.set({
          req,
          res,
          content: html`<div class="flash--rose">Email already taken.</div>`,
        });
        return res.redirect(
          `${baseURL}/sign-in${qs.stringify(req.query, {
            addQueryPrefix: true,
          })}`
        );
      }

      const user = database.get<{ id: number; email: string }>(
        sql`
          INSERT INTO "users" (
            "createdAt",
            "lastSeenOnlineAt",
            "email",
            "password",
            "emailConfirmedAt",
            "name",
            "nameSearch",
            "avatarlessBackgroundColor",
            "emailNotifications"
          )
          VALUES (
            ${new Date().toISOString()},
            ${new Date().toISOString()},
            ${req.body.email},
            ${await argon2.hash(req.body.password, argon2Options)},
            ${null},
            ${req.body.name},
            ${html`${req.body.name}`},
            ${lodash.sample(userAvatarlessBackgroundColors)},
            ${"staff-announcements-and-mentions"}
          )
          RETURNING *
        `
      )!;

      sendEmailConfirmationEmail({
        req,
        res,
        userId: user.id,
        userEmail: user.email,
      });
      Session.open({ req, res, userId: user.id });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    })
  );

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/resend-confirmation-email",
    ...isSignedInMiddleware,
    (req, res) => {
      if (res.locals.user.emailConfirmedAt !== null) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">Email already confirmed.</div>
          `,
        });
        return res.redirect("back");
      }
      sendEmailConfirmationEmail({
        req,
        res,
        userId: res.locals.user.id,
        userEmail: res.locals.user.email,
      });
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Confirmation email resent.</div>
        `,
      });
      res.redirect("back");
    }
  );

  app.get<
    { emailConfirmationNonce: string },
    HTML,
    {},
    { redirect?: string },
    IsSignedInMiddlewareLocals
  >(
    "/email-confirmation/:emailConfirmationNonce",
    ...isSignedInMiddleware,
    (req, res) => {
      const emailConfirmation = database.get<{ user: number }>(
        sql`
          SELECT "user" FROM "emailConfirmations" WHERE "nonce" = ${req.params.emailConfirmationNonce}
        `
      );
      database.run(
        sql`
          DELETE FROM "emailConfirmations" WHERE "nonce" = ${req.params.emailConfirmationNonce}
        `
      );
      if (
        emailConfirmation === undefined ||
        emailConfirmation.user !== res.locals.user.id
      ) {
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--rose">
              This email confirmation link is invalid or belongs to a different
              account.
            </div>
          `,
        });
        return res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
      }
      database.run(
        sql`
          UPDATE "users"
          SET "emailConfirmedAt" = ${new Date().toISOString()}
          WHERE "id" = ${res.locals.user.id}
        `
      );
      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Email confirmed successfully.</div>
        `,
      });
      res.redirect(`${baseURL}${req.query.redirect ?? "/"}`);
    }
  );

  app.delete<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/sign-out",
    ...isSignedInMiddleware,
    (req, res) => {
      Session.close({ req, res });
      res.redirect(`${baseURL}/`);
    }
  );

  return {};
};
