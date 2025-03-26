import * as serverTypes from "@radically-straightforward/server";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import { Application } from "./index.mjs";

export type ApplicationAuthentication = {
  types: {
    states: {
      Authentication: {
        userSession: {
          id: number;
          publicId: string;
          createdAt: string;
          samlIdentifier: string | null;
          samlSessionIndex: string | null;
          samlNameID: string | null;
        };
        user: {
          id: number;
          publicId: string;
          name: string;
          email: string;
          emailVerificationEmail: string | null;
          emailVerificationNonce: string | null;
          emailVerificationCreatedAt: string | null;
          password: string | null;
          passwordResetNonce: string | null;
          passwordResetCreatedAt: string | null;
          twoFactorAuthenticationEnabled: number;
          twoFactorAuthenticationSecret: string | null;
          twoFactorAuthenticationRecoveryCodes: string | null;
          avatarColor:
            | "red"
            | "orange"
            | "amber"
            | "yellow"
            | "lime"
            | "green"
            | "emerald"
            | "teal"
            | "cyan"
            | "sky"
            | "blue"
            | "indigo"
            | "violet"
            | "purple"
            | "fuchsia"
            | "pink"
            | "rose";
          avatarImage: string | null;
          userRole:
            | "userRoleSystemAdministrator"
            | "userRoleStaff"
            | "userRoleUser";
          lastSeenOnlineAt: string;
          darkMode:
            | "userDarkModeSystem"
            | "userDarkModeLight"
            | "userDarkModeDark";
          sidebarWidth: number;
          emailNotificationsForAllMessages: number;
          emailNotificationsForMessagesIncludingMentions: number;
          emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
          emailNotificationsForMessagesInConversationsThatYouStarted: number;
          userAnonymityPreferred:
            | "userAnonymityPreferredNone"
            | "userAnonymityPreferredCourseParticipationRoleStudents"
            | "userAnonymityPreferredCourseParticipationRoleInstructors";
          mostRecentlyVisitedCourseParticipation: number | null;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    handler: (
      request: serverTypes.Request<
        {},
        {},
        { session: string },
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      const userSessionPublicId = request.cookies.session;
      if (typeof userSessionPublicId !== "string") {
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect("/authentication");
        return;
      }
      const userSession = application.database.get<{
        id: number;
        publicId: string;
        user: number;
        createdAt: string;
        samlIdentifier: string | null;
        samlSessionIndex: string | null;
        samlNameID: string | null;
      }>(
        sql`
          select
            "id",
            "publicId",
            "user",
            "createdAt",
            "samlIdentifier",
            "samlSessionIndex",
            "samlNameID"
          from "userSessions"
          where "publicId" = ${userSessionPublicId};
        `,
      );
      if (userSession === undefined) {
        response.deleteCookie("session");
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect("/authentication");
        return;
      }
      if (
        userSession.createdAt <
        new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
      ) {
        application.database.run(
          sql`
            delete from "userSessions" where "id" = ${userSession.id};
          `,
        );
        response.deleteCookie("session");
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect("/authentication");
        return;
      }
      if (
        userSession.createdAt <
        new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
      ) {
        const userSessionPublicId = cryptoRandomString({
          length: 100,
          type: "alphanumeric",
        });
        application.database.run(
          sql`
            delete from "userSessions" where "id" = ${userSession.id};
          `,
        );
        response.deleteCookie("session");
        application.database.run(
          sql`
            insert into "userSessions" (
              "publicId",
              "user",
              "createdAt",
              "samlIdentifier",
              "samlSessionIndex",
              "samlNameID"
            )
            values (
              ${userSessionPublicId},
              ${userSession.user},
              ${new Date().toISOString()},
              ${userSession.samlIdentifier},
              ${userSession.samlSessionIndex},
              ${userSession.samlNameID}
            );
          `,
        );
        response.setCookie("session", userSessionPublicId);
      }
      request.state.user = application.database.get<{
        id: number;
        publicId: string;
        name: string;
        email: string;
        emailVerificationEmail: string | null;
        emailVerificationNonce: string | null;
        emailVerificationCreatedAt: string | null;
        password: string | null;
        passwordResetNonce: string | null;
        passwordResetCreatedAt: string | null;
        twoFactorAuthenticationEnabled: number;
        twoFactorAuthenticationSecret: string | null;
        twoFactorAuthenticationRecoveryCodes: string | null;
        avatarColor:
          | "red"
          | "orange"
          | "amber"
          | "yellow"
          | "lime"
          | "green"
          | "emerald"
          | "teal"
          | "cyan"
          | "sky"
          | "blue"
          | "indigo"
          | "violet"
          | "purple"
          | "fuchsia"
          | "pink"
          | "rose";
        avatarImage: string | null;
        userRole:
          | "userRoleSystemAdministrator"
          | "userRoleStaff"
          | "userRoleUser";
        lastSeenOnlineAt: string;
        darkMode:
          | "userDarkModeSystem"
          | "userDarkModeLight"
          | "userDarkModeDark";
        sidebarWidth: number;
        emailNotificationsForAllMessages: number;
        emailNotificationsForMessagesIncludingMentions: number;
        emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
        emailNotificationsForMessagesInConversationsThatYouStarted: number;
        userAnonymityPreferred:
          | "userAnonymityPreferredNone"
          | "userAnonymityPreferredCourseParticipationRoleStudents"
          | "userAnonymityPreferredCourseParticipationRoleInstructors";
        mostRecentlyVisitedCourseParticipation: number | null;
      }>(
        sql`
          select
            "id",
            "publicId",
            "name",
            "email",
            "emailVerificationEmail",
            "emailVerificationNonce",
            "emailVerificationCreatedAt",
            "password",
            "passwordResetNonce",
            "passwordResetCreatedAt",
            "twoFactorAuthenticationEnabled",
            "twoFactorAuthenticationSecret",
            "twoFactorAuthenticationRecoveryCodes",
            "avatarColor",
            "avatarImage",
            "userRole",
            "lastSeenOnlineAt",
            "darkMode",
            "sidebarWidth",
            "emailNotificationsForAllMessages",
            "emailNotificationsForMessagesIncludingMentions",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
            "emailNotificationsForMessagesInConversationsThatYouStarted",
            "userAnonymityPreferred",
            "mostRecentlyVisitedCourseParticipation"
          from "users"
          where "id" = ${userSession.user};
        `,
      );
      if (request.state.user === undefined) throw new Error();
      if (
        request.state.user.email === request.state.user.emailVerificationEmail
      ) {
        response.end(
          application.layouts.main({
            request,
            response,
            head: html`<title>Sign up · Courselore</title>`,
            body: html`
              <div
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--2);
                `}"
              >
                <div
                  css="${css`
                    font-size: var(--font-size--4);
                    line-height: var(--font-size--4--line-height);
                    font-weight: 800;
                  `}"
                >
                  Authentication
                </div>
                <p>To continue please check your email.</p>
              </div>
            `,
          }),
        );
        return;
      }
    },
  });

  if (application.commandLineArguments.values.type === "backgroundJob")
    node.backgroundJob({ interval: 60 * 60 * 1000 }, async () => {
      application.database.run(
        sql`
          delete from "userSessions" where "createdAt" < ${new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()};
        `,
      );
    });

  application.server?.push({
    method: "GET",
    pathname: "/authentication",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        { session: string },
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user !== undefined) return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Authentication · Courselore</title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                Authentication
              </div>
              <details open>
                <summary
                  class="button button--rectangle button--transparent"
                  css="${css`
                    font-weight: 500;
                  `}"
                >
                  <span
                    css="${css`
                      display: inline-block;
                      transition-property: var(
                        --transition-property--transform
                      );
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--ease-in-out
                      );
                      details[open] > summary > & {
                        rotate: var(--rotate--90);
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  Sign in
                </summary>
                <div
                  css="${css`
                    padding: var(--size--2) var(--size--0);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--2);
                  `}"
                >
                  <details open>
                    <summary
                      class="button button--rectangle button--transparent"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                      `}"
                    >
                      <span
                        css="${css`
                          display: inline-block;
                          transition-property: var(
                            --transition-property--transform
                          );
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                          details[open] > summary > & {
                            rotate: var(--rotate--90);
                          }
                        `}"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </span>
                      Email & password
                    </summary>
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/sessions"
                      css="${css`
                        padding: var(--size--2) var(--size--0);
                        border-bottom: var(--border-width--1) solid
                          light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--4);
                      `}"
                    >
                      <label>
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Email
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="email"
                            name="email"
                            required
                            maxlength="2000"
                            autofocus
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
                      <label>
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Password
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="password"
                            name="password"
                            required
                            minlength="8"
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                        `}"
                      >
                        <button
                          type="submit"
                          class="button button--rectangle button--blue"
                        >
                          Sign in
                        </button>
                      </div>
                    </div>
                  </details>
                  <details>
                    <summary
                      class="button button--rectangle button--transparent"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                      `}"
                    >
                      <span
                        css="${css`
                          display: inline-block;
                          transition-property: var(
                            --transition-property--transform
                          );
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                          details[open] > summary > & {
                            rotate: var(--rotate--90);
                          }
                        `}"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </span>
                      Forgot password
                    </summary>
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/forgot-password"
                      css="${css`
                        padding: var(--size--2) var(--size--0);
                        border-bottom: var(--border-width--1) solid
                          light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--4);
                      `}"
                    >
                      <label>
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Email
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="email"
                            name="email"
                            required
                            maxlength="2000"
                            autofocus
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                        `}"
                      >
                        <button
                          type="submit"
                          class="button button--rectangle button--blue"
                        >
                          Reset password
                        </button>
                      </div>
                    </div>
                  </details>
                  <details>
                    <summary
                      class="button button--rectangle button--transparent"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                      `}"
                    >
                      <span
                        css="${css`
                          display: inline-block;
                          transition-property: var(
                            --transition-property--transform
                          );
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                          details[open] > summary > & {
                            rotate: var(--rotate--90);
                          }
                        `}"
                      >
                        <i class="bi bi-chevron-right"></i>
                      </span>
                      School credentials
                    </summary>
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/sessions"
                      css="${css`
                        padding: var(--size--2) var(--size--0);
                        border-bottom: var(--border-width--1) solid
                          light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--4);
                      `}"
                    >
                      TODO
                    </div>
                  </details>
                </div>
              </details>
              <details>
                <summary
                  class="button button--rectangle button--transparent"
                  css="${css`
                    font-weight: 500;
                  `}"
                >
                  <span
                    css="${css`
                      display: inline-block;
                      transition-property: var(
                        --transition-property--transform
                      );
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--ease-in-out
                      );
                      details[open] > summary > & {
                        rotate: var(--rotate--90);
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  Sign up
                </summary>
                <div
                  type="form"
                  method="POST"
                  action="/authentication/sign-up"
                  css="${css`
                    padding: var(--size--2) var(--size--0);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <label>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      Name
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="text"
                        name="name"
                        required
                        maxlength="2000"
                        autofocus
                        class="input--text"
                        css="${css`
                          flex: 1;
                        `}"
                      />
                    </div>
                  </label>
                  <label>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      Email
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="email"
                        name="email"
                        required
                        maxlength="2000"
                        autofocus
                        class="input--text"
                        css="${css`
                          flex: 1;
                        `}"
                      />
                    </div>
                  </label>
                  <label>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      Password
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="password"
                        name="password"
                        required
                        minlength="8"
                        maxlength="2000"
                        class="input--text"
                        css="${css`
                          flex: 1;
                        `}"
                      />
                    </div>
                  </label>
                  <label>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      Password confirmation
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="password"
                        required
                        minlength="8"
                        maxlength="2000"
                        class="input--text"
                        css="${css`
                          flex: 1;
                        `}"
                        javascript="${javascript`
                          this.onvalidate = () => {
                            if (this.value !== this.closest('[type~="form"]').querySelector('[name="password"]').value)
                              throw new javascript.ValidationError("“Password” and “Password confirmation” don’t match.");
                          };
                        `}"
                      />
                    </div>
                  </label>
                  <div
                    css="${css`
                      font-size: var(--font-size--3);
                      line-height: var(--font-size--3--line-height);
                    `}"
                  >
                    <button
                      type="submit"
                      class="button button--rectangle button--blue"
                    >
                      Sign up
                    </button>
                  </div>
                </div>
              </details>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/sign-up",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          name: string;
          email: string;
          password: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user !== undefined) return;
      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === "" ||
        typeof request.body.email !== "string" ||
        !request.body.email.match(utilities.emailRegExp) ||
        typeof request.body.password !== "string" ||
        request.body.password.length <= 8
      )
        throw "validation";
      const password = await argon2.hash(
        request.body.password,
        application.privateConfiguration.argon2,
      );
      const emailVerificationNonce = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      const userSessionPublicId = cryptoRandomString({
        length: 100,
        type: "alphanumeric",
      });
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "users"
              where "email" = ${request.body.email};
            `,
          ) !== undefined
        )
          application.database.run(
            sql`
              insert into "_backgroundJobs" (
                "type",
                "startAt",
                "parameters"
              )
              values (
                'email',
                ${new Date().toISOString()},
                ${JSON.stringify({
                  to: request.body.email,
                  subject: "Tried to create an account with an existing email",
                  html: html`
                    <p>
                      Someone tried to sign up to Courselore with this email
                      address that already has an account:
                      <code>${request.body.email!}</code>
                    </p>
                    <p>
                      If it was you, please sign in instead, and if you don’t
                      remember your password, use the “Forgot password” feature
                      <a
                        href="https://${application.configuration
                          .hostname}/authentication"
                        >https://${application.configuration
                          .hostname}/authentication</a
                      >
                    </p>
                    <p>
                      If it was not you, please report the issue to
                      <a
                        href="mailto:${application.configuration
                          .systemAdministratorEmail ??
                        "system-administrator@courselore.org"}?${new URLSearchParams(
                          {
                            subject: "Potential sign up impersonation",
                            body: `Email: ${request.body.email}`,
                          },
                        )
                          .toString()
                          .replaceAll("+", "%20")}"
                        >${application.configuration.systemAdministratorEmail ??
                        "system-administrator@courselore.org"}</a
                      >
                    </p>
                  `,
                })}
              );
            `,
          );
        else {
          const user = application.database.get<{ id: number }>(
            sql`
              select * from "users" where "id" = ${
                application.database.run(
                  sql`
                    insert into "users" (
                      "publicId",
                      "name",
                      "nameSearch",
                      "email",
                      "emailVerificationEmail",
                      "emailVerificationNonce",
                      "emailVerificationCreatedAt",
                      "password",
                      "passwordResetNonce",
                      "passwordResetCreatedAt",
                      "twoFactorAuthenticationEnabled",
                      "twoFactorAuthenticationSecret",
                      "twoFactorAuthenticationRecoveryCodes",
                      "avatarColor",
                      "avatarImage",
                      "userRole",
                      "lastSeenOnlineAt",
                      "darkMode",
                      "sidebarWidth",
                      "emailNotificationsForAllMessages",
                      "emailNotificationsForMessagesIncludingMentions",
                      "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                      "emailNotificationsForMessagesInConversationsThatYouStarted",
                      "userAnonymityPreferred",
                      "mostRecentlyVisitedCourseParticipation"
                    )
                    values (
                      ${cryptoRandomString({ length: 20, type: "numeric" })},
                      ${request.body.name!},
                      ${utilities
                        .tokenize(request.body.name!)
                        .map((tokenWithPosition) => tokenWithPosition.token)
                        .join(" ")},
                      ${request.body.email},
                      ${request.body.email},
                      ${emailVerificationNonce},
                      ${new Date().toISOString()},
                      ${password},
                      ${null},
                      ${null},
                      ${Number(false)},
                      ${null},
                      ${null},
                      ${
                        [
                          "red",
                          "orange",
                          "amber",
                          "yellow",
                          "lime",
                          "green",
                          "emerald",
                          "teal",
                          "cyan",
                          "sky",
                          "blue",
                          "indigo",
                          "violet",
                          "purple",
                          "fuchsia",
                          "pink",
                          "rose",
                        ][Math.floor(Math.random() * 17)]
                      },
                      ${null},
                      ${
                        application.database.get<{ count: number }>(
                          sql`
                            select count(*) as "count" from "users";
                          `,
                        )!.count === 0
                          ? "userRoleSystemAdministrator"
                          : "userRoleUser"
                      },
                      ${new Date().toISOString()},
                      ${"userDarkModeSystem"},
                      ${80 * 4},
                      ${Number(false)},
                      ${Number(true)},
                      ${Number(true)},
                      ${Number(true)},
                      ${"userAnonymityPreferredNone"},
                      ${null}
                    );
                  `,
                ).lastInsertRowid
              };
            `,
          )!;
          application.database.run(
            sql`
              insert into "userSessions" (
                "publicId",
                "user",
                "createdAt",
                "samlIdentifier",
                "samlSessionIndex",
                "samlNameID"
              )
              values (
                ${userSessionPublicId},
                ${user.id},
                ${new Date().toISOString()},
                ${null},
                ${null},
                ${null}
              );
            `,
          );
          response.setCookie("session", userSessionPublicId);
          application.database.run(
            sql`
              insert into "_backgroundJobs" (
                "type",
                "startAt",
                "parameters"
              )
              values (
                'email',
                ${new Date().toISOString()},
                ${JSON.stringify({
                  to: request.body.email,
                  subject: "Email verification",
                  html: html`
                    <p>
                      Someone signed up to Courselore with this email address:
                      <code>${request.body.email!}</code>
                    </p>
                    <p>
                      If it was you, please confirm your email:
                      <a
                        href="https://${application.configuration
                          .hostname}/authentication/email-verification/${emailVerificationNonce}"
                        >https://${application.configuration
                          .hostname}/authentication/email-verification/${emailVerificationNonce}</a
                      >
                    </p>
                    <p>
                      If it was not you, please report the issue to
                      <a
                        href="mailto:${application.configuration
                          .systemAdministratorEmail ??
                        "system-administrator@courselore.org"}?${new URLSearchParams(
                          {
                            subject: "Potential sign up impersonation",
                            body: `Email: ${request.body.email}`,
                          },
                        )
                          .toString()
                          .replaceAll("+", "%20")}"
                        >${application.configuration.systemAdministratorEmail ??
                        "system-administrator@courselore.org"}</a
                      >
                    </p>
                  `,
                })}
              );
            `,
          );
        }
      });
      response.redirect("/");
    },
  });
};
