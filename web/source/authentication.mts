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
          user: number;
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
      if (typeof request.cookies.session !== "string") {
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect(
            `/authentication?${new URLSearchParams({ redirect: request.URL.pathname + request.URL.search }).toString()}`,
          );
        return;
      }
      request.state.userSession = application.database.get<{
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
          where "publicId" = ${request.cookies.session};
        `,
      );
      if (request.state.userSession === undefined) {
        response.deleteCookie("session");
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect(
            `/authentication?${new URLSearchParams({ redirect: request.URL.pathname + request.URL.search }).toString()}`,
          );
        return;
      }
      if (
        request.state.userSession.createdAt <
        new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString()
      ) {
        application.database.run(
          sql`
            delete from "userSessions" where "id" = ${request.state.userSession.id};
          `,
        );
        delete request.state.userSession;
        response.deleteCookie("session");
        if (!request.URL.pathname.match(new RegExp("^/authentication(?:$|/)")))
          response.redirect(
            `/authentication?${new URLSearchParams({ redirect: request.URL.pathname + request.URL.search }).toString()}`,
          );
        return;
      }
      if (
        request.state.userSession.createdAt <
          new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() &&
        request.liveConnection === undefined
      ) {
        application.database.run(
          sql`
            delete from "userSessions" where "id" = ${request.state.userSession.id};
          `,
        );
        response.deleteCookie("session");
        request.state.userSession = application.database.get<{
          id: number;
          publicId: string;
          user: number;
          createdAt: string;
          samlIdentifier: string | null;
          samlSessionIndex: string | null;
          samlNameID: string | null;
        }>(
          sql`
            select * from "userSessions" where "id" = ${
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
                    ${cryptoRandomString({
                      length: 100,
                      type: "alphanumeric",
                    })},
                    ${request.state.userSession.user},
                    ${new Date().toISOString()},
                    ${request.state.userSession.samlIdentifier},
                    ${request.state.userSession.samlSessionIndex},
                    ${request.state.userSession.samlNameID}
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
        response.setCookie("session", request.state.userSession.publicId);
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
          where "id" = ${request.state.userSession.user};
        `,
      );
      if (request.state.user === undefined) throw new Error();
      if (
        request.state.user.email ===
          request.state.user.emailVerificationEmail &&
        typeof request.state.user.emailVerificationCreatedAt === "string" &&
        !request.URL.pathname.match(
          new RegExp("^/authentication/email-verification(?:$|/)"),
        )
      ) {
        response.end(
          application.layouts.main({
            request,
            response,
            head: html`<title>Email verification · Courselore</title>`,
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
                  Email verification
                </div>
                <p>To continue please check your email.</p>
                <div
                  type="form"
                  method="POST"
                  action="/authentication/email-verification/resend?${new URLSearchParams(
                    { redirect: request.URL.pathname + request.URL.search },
                  ).toString()}"
                  css="${css`
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
                        value="${request.state.user.emailVerificationEmail}"
                        disabled
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
                    $${new Date(Date.now() - 5 * 60 * 1000).toISOString() <
                    request.state.user.emailVerificationCreatedAt
                      ? html`
                          <p>
                            Wait until
                            <span
                              javascript="${javascript`
                                this.textContent = javascript.localizeTime(${new Date(new Date(request.state.user.emailVerificationCreatedAt).getTime() + 6 * 60 * 1000).toISOString()});
                              `}"
                            ></span>
                            before you can request the email verification to be
                            sent again.
                          </p>
                        `
                      : html`
                          <button
                            type="submit"
                            class="button button--rectangle button--blue"
                          >
                            Resend email verification
                          </button>
                        `}
                  </div>
                </div>
              </div>
            `,
          }),
        );
        return;
      }
    },
  });

  if (application.commandLineArguments.values.type === "backgroundJob")
    node.backgroundJob({ interval: 60 * 60 * 1000 }, () => {
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
        {},
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
                  action="/authentication/sign-up${request.URL.search}"
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
                      action="/authentication/sign-in${request.URL.search}"
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
                      action="/authentication/forgot-password${request.URL
                        .search}"
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
                      action="/authentication/sign-in${request.URL.search}"
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
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "users"
              where "email" = ${request.body.email};
            `,
          ) !== undefined
        ) {
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
                  subject: "Tried to sign up with an existing email",
                  html: html`
                    <p>
                      Someone tried to sign up to Courselore with the following
                      email address that already has an account:
                      <code>${request.body.email!}</code>
                    </p>
                    <p>
                      If it was you, please sign in instead, and if you don’t
                      remember your password, use the “Forgot password” feature
                      <a
                        href="https://${application.configuration
                          .hostname}/authentication${request.URL.search}"
                        >https://${application.configuration
                          .hostname}/authentication${request.URL.search}</a
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
          return;
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
                    ${cryptoRandomString({ length: 100, type: "numeric" })},
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
                    Someone signed up to Courselore with the following email
                    address:
                    <code>${request.body.email!}</code>
                  </p>
                  <p>
                    If it was you, please confirm your email:
                    <a
                      href="https://${application.configuration
                        .hostname}/authentication/email-verification/${request
                        .state.user.emailVerificationNonce!}${request.URL
                        .search}"
                      >https://${application.configuration
                        .hostname}/authentication/email-verification/${request
                        .state.user.emailVerificationNonce!}${request.URL
                        .search}</a
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
      });
      response.redirect();
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/sign-up",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
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
                Sign up
              </div>
              <p>To continue please check your email.</p>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/email-verification/resend",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        typeof request.state.user.emailVerificationEmail !== "string" ||
        typeof request.state.user.emailVerificationNonce !== "string" ||
        typeof request.state.user.emailVerificationCreatedAt !== "string"
      )
        return;
      if (
        new Date(Date.now() - 5 * 60 * 1000).toISOString() <
        request.state.user.emailVerificationCreatedAt
      )
        throw "validation";
      request.state.user.emailVerificationNonce = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      request.state.user.emailVerificationCreatedAt = new Date().toISOString();
      application.database.run(
        sql`
          update "users"
          set
            "emailVerificationNonce" = ${request.state.user.emailVerificationNonce},
            "emailVerificationCreatedAt" = ${request.state.user.emailVerificationCreatedAt}
          where "id" = ${request.state.user.id};
        `,
      );
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
              to: request.state.user.emailVerificationEmail,
              subject: "Email verification",
              html: html`
                <p>
                  Someone is trying to verify the following email address for an
                  account on Courselore:
                  <code>${request.state.user.emailVerificationEmail}</code>
                </p>
                <p>
                  If it was you, please confirm your email:
                  <a
                    href="https://${application.configuration
                      .hostname}/authentication/email-verification/${request
                      .state.user.emailVerificationNonce}${request.URL.search}"
                    >https://${application.configuration
                      .hostname}/authentication/email-verification/${request
                      .state.user.emailVerificationNonce}${request.URL
                      .search}</a
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
                        body: `Email: ${request.state.user.emailVerificationEmail}`,
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
      response.redirect();
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/email-verification/resend",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        typeof request.state.user.emailVerificationEmail !== "string" ||
        typeof request.state.user.emailVerificationNonce !== "string" ||
        typeof request.state.user.emailVerificationCreatedAt !== "string"
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Email verification · Courselore</title>`,
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
                Email verification
              </div>
              <p>To continue please check your email.</p>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/authentication/email-verification/(?<emailVerificationNonce>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        { emailVerificationNonce: string },
        { redirect: string },
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (typeof request.pathname.emailVerificationNonce !== "string") return;
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        request.state.user !== undefined &&
        request.state.user.emailVerificationEmail === null
      ) {
        response.setFlash(html`
          <div class="flash--green">The email has already been verified.</div>
        `);
        response.redirect(request.search.redirect ?? "/");
        return;
      }
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Email verification · Courselore</title>`,
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
                Email verification
              </div>
              $${request.state.user === undefined
                ? html`
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/sign-in?${new URLSearchParams({
                        redirect: `/authentication/email-verification/${
                          request.pathname.emailVerificationNonce
                        }${request.URL.search}`,
                      }).toString()}"
                      css="${css`
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
                  `
                : html`
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/email-verification/${request
                        .pathname.emailVerificationNonce}${request.URL.search}"
                      css="${css`
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
                            value="${request.state.user
                              .emailVerificationEmail!}"
                            disabled
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
                          Verify email
                        </button>
                      </div>
                    </div>
                  `}
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/authentication/email-verification/(?<emailVerificationNonce>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        { emailVerificationNonce: string },
        { redirect: string },
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.emailVerificationNonce !== "string" ||
        request.state.user === undefined ||
        typeof request.state.user.emailVerificationEmail !== "string" ||
        typeof request.state.user.emailVerificationNonce !== "string" ||
        typeof request.state.user.emailVerificationCreatedAt !== "string"
      )
        return;
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        request.state.user.emailVerificationNonce !==
          request.pathname.emailVerificationNonce ||
        request.state.user.emailVerificationCreatedAt <
          new Date(Date.now() - 15 * 60 * 1000).toISOString()
      ) {
        response.setFlash(html`
          <div class="flash--red">
            There’s something wrong with this email verification. Please request
            a new email verification.
          </div>
        `);
        response.redirect(request.search.redirect ?? "/");
        return;
      }
      application.database.run(
        sql`
          update "users"
          set
            "email" = ${request.state.user.emailVerificationEmail},
            "emailVerificationEmail" = null,
            "emailVerificationNonce" = null,
            "emailVerificationCreatedAt" = null
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">The email was verified successfully.</div>
      `);
      response.redirect(request.search.redirect ?? "/");
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/sign-in",
    handler: async (
      request: serverTypes.Request<
        {},
        { redirect: string },
        {},
        { email: string; password: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      // TODO: Send email warning about sign in
      if (request.state.user !== undefined) return;
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        typeof request.body.email !== "string" ||
        !request.body.email.match(utilities.emailRegExp) ||
        typeof request.body.password !== "string" ||
        request.body.password.length <= 8
      )
        throw "validation";
      const user = application.database.get<{ id: number; password: string }>(
        sql`
          select "id", "password"
          from "users"
          where "email" = ${request.body.email};
        `,
      );
      const passwordVerify = await argon2.verify(
        user?.password ??
          "$argon2id$v=19$m=12288,t=3,p=1$pCgoHHS6clgtd39p7OfS8Q$ESbcsGxnoGpxWVbtXjBac0Lb+sdAyAd0X3EBRk4wku0",
        request.body.password,
        application.privateConfiguration.argon2,
      );
      if (user === undefined || !passwordVerify) {
        response.redirect("/TODO");
        return;
      }
      const userSession = application.database.get<{ publicId: string }>(
        sql`
          select * from "userSessions" where "id" = ${
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
                  ${cryptoRandomString({
                    length: 100,
                    type: "alphanumeric",
                  })},
                  ${user.id},
                  ${new Date().toISOString()},
                  ${null},
                  ${null},
                  ${null}
                );
              `,
            ).lastInsertRowid
          };
        `,
      )!;
      response.setCookie("session", userSession.publicId);
      response.redirect(request.search.redirect ?? "/");
    },
  });
};
