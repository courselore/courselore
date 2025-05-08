import * as serverTypes from "@radically-straightforward/server";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import * as SAML from "@node-saml/node-saml";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import * as OTPAuth from "otpauth";
import { Application } from "./index.mjs";

export type ApplicationAuthentication = {
  types: {
    states: {
      Authentication: {
        systemOptions: {
          id: number;
          privateKey: string;
          certificate: string;
          userRolesWhoMayCreateCourses:
            | "userRoleUser"
            | "userRoleStaff"
            | "userRoleSystemAdministrator";
        };
        userSession: {
          id: number;
          publicId: string;
          user: number;
          createdAt: string;
          needsTwoFactorAuthentication: number;
          samlIdentifier: string | null;
          samlProfile: string | null;
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
      request.state.systemOptions = application.database.get<{
        id: number;
        privateKey: string;
        certificate: string;
        userRolesWhoMayCreateCourses:
          | "userRoleUser"
          | "userRoleStaff"
          | "userRoleSystemAdministrator";
      }>(
        sql`
          select
            "id",
            "privateKey",
            "certificate",
            "userRolesWhoMayCreateCourses"
          from "systemOptions"
          limit 1;
        `,
      );
      if (request.state.systemOptions === undefined) throw new Error();
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
        needsTwoFactorAuthentication: number;
        samlIdentifier: string | null;
        samlProfile: string | null;
      }>(
        sql`
          select
            "id",
            "publicId",
            "user",
            "createdAt",
            "needsTwoFactorAuthentication",
            "samlIdentifier",
            "samlProfile"
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
          needsTwoFactorAuthentication: number;
          samlIdentifier: string | null;
          samlProfile: string | null;
        }>(
          sql`
            select * from "userSessions" where "id" = ${
              application.database.run(
                sql`
                  insert into "userSessions" (
                    "publicId",
                    "user",
                    "createdAt",
                    "needsTwoFactorAuthentication",
                    "samlIdentifier",
                    "samlProfile"
                  )
                  values (
                    ${cryptoRandomString({
                      length: 100,
                      type: "alphanumeric",
                    })},
                    ${request.state.userSession.user},
                    ${new Date().toISOString()},
                    ${request.state.userSession.needsTwoFactorAuthentication},
                    ${request.state.userSession.samlIdentifier},
                    ${request.state.userSession.samlProfile}
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
        !request.URL.pathname.match(
          new RegExp("^/authentication/email-verification(?:$|/)"),
        )
      ) {
        response.redirect(
          `/authentication/email-verification?${new URLSearchParams({
            redirect: request.URL.pathname + request.URL.search,
          }).toString()}`,
        );
        return;
      }
      if (
        typeof request.state.user.password !== "string" &&
        !request.URL.pathname.match(
          new RegExp("^/authentication/set-password(?:$|/)"),
        )
      ) {
        response.redirect(
          `/authentication/set-password?${new URLSearchParams({
            redirect: request.URL.pathname + request.URL.search,
          }).toString()}`,
        );
        return;
      }
      if (
        Boolean(request.state.userSession.needsTwoFactorAuthentication) &&
        !request.URL.pathname.match(
          new RegExp(
            "^/authentication/sign-in/two-factor-authentication(?:$|/)",
          ),
        )
      ) {
        response.redirect(
          `/authentication/sign-in/two-factor-authentication?${new URLSearchParams(
            { redirect: request.URL.pathname + request.URL.search },
          ).toString()}`,
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
                      action="/authentication/reset-password${request.URL
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
                  $${typeof application.configuration.saml === "object"
                    ? html`
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
                                transition-duration: var(
                                  --transition-duration--150
                                );
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
                            Institution credentials
                          </summary>
                          <div
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
                            $${Object.entries(
                              application.configuration.saml,
                            ).map(
                              ([samlIdentifier, saml]) => html`
                                <div>
                                  <a
                                    href="/authentication/saml/${samlIdentifier}/authorize${request
                                      .URL.search}"
                                    class="link"
                                    >${saml.name}</a
                                  >
                                </div>
                              `,
                            )}
                          </div>
                        </details>
                      `
                    : html``}
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
        request.body.password.length < 8
      )
        throw "validation";
      const emailVerificationNoncePlaintext = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      const emailVerificationNonce = await argon2.hash(
        emailVerificationNoncePlaintext,
        application.privateConfiguration.argon2,
      );
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
                      remember your password use the “Forgot password” feature
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
                            subject: "Potential impersonation",
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
            insert into "_backgroundJobs" (
              "type",
              "startAt",
              "parameters"
            )
            values (
              'email',
              ${new Date().toISOString()},
              ${JSON.stringify({
                to: request.state.user.email,
                subject: "Email verification",
                html: html`
                  <p>
                    Someone signed up to Courselore with the following email
                    address:
                    <code>${request.state.user.email}</code>
                  </p>
                  <p>
                    If it was you, please confirm your email:
                    <a
                      href="https://${application.configuration
                        .hostname}/authentication/email-verification/${emailVerificationNoncePlaintext}${request
                        .URL.search}"
                      >https://${application.configuration
                        .hostname}/authentication/email-verification/${emailVerificationNoncePlaintext}${request
                        .URL.search}</a
                    >
                  </p>
                  <p>
                    If it was not you, please report the issue to
                    <a
                      href="mailto:${application.configuration
                        .systemAdministratorEmail ??
                      "system-administrator@courselore.org"}?${new URLSearchParams(
                        {
                          subject: "Potential impersonation",
                          body: `Email: ${request.state.user.email}`,
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
      response.redirect(
        `/authentication/email-verification${request.URL.search}`,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/email-verification",
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
        request.state.user !== undefined &&
        request.state.user.emailVerificationEmail === null
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
              $${request.state.user !== undefined &&
              typeof request.state.user.emailVerificationEmail === "string" &&
              typeof request.state.user.emailVerificationCreatedAt === "string"
                ? html`
                    <div
                      type="form"
                      method="POST"
                      action="/authentication/email-verification/resend${request
                        .URL.search}"
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
                                before you can request a new email verification.
                              </p>
                            `
                          : html`
                              <button
                                type="submit"
                                class="button button--rectangle button--blue"
                              >
                                Send new email verification
                              </button>
                            `}
                      </div>
                    </div>
                  `
                : html``}
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/email-verification/resend",
    handler: async (
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
      const emailVerificationNoncePlaintext = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      request.state.user.emailVerificationNonce = await argon2.hash(
        emailVerificationNoncePlaintext,
        application.privateConfiguration.argon2,
      );
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
                      .hostname}/authentication/email-verification/${emailVerificationNoncePlaintext}${request
                      .URL.search}"
                    >https://${application.configuration
                      .hostname}/authentication/email-verification/${emailVerificationNoncePlaintext}${request
                      .URL.search}</a
                  >
                </p>
                <p>
                  If it was not you, please report the issue to
                  <a
                    href="mailto:${application.configuration
                      .systemAdministratorEmail ??
                    "system-administrator@courselore.org"}?${new URLSearchParams(
                      {
                        subject: "Potential impersonation",
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
      response.redirect(
        `/authentication/email-verification${request.URL.search}`,
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
    handler: async (
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
        !(await argon2.verify(
          request.state.user.emailVerificationNonce,
          request.pathname.emailVerificationNonce,
          application.privateConfiguration.argon2,
        )) ||
        request.state.user.emailVerificationCreatedAt <
          new Date(Date.now() - 15 * 60 * 1000).toISOString()
      ) {
        response.setFlash(html`
          <div class="flash--red">
            There’s something wrong with this email verification. Please request
            a new email verification.
          </div>
        `);
        response.redirect(
          `/authentication/email-verification${request.URL.search}`,
        );
        return;
      }
      request.state.user.email = request.state.user.emailVerificationEmail;
      request.state.user.emailVerificationEmail = null;
      request.state.user.emailVerificationNonce = null;
      request.state.user.emailVerificationCreatedAt = null;
      application.database.run(
        sql`
          update "users"
          set
            "email" = ${request.state.user.email},
            "emailVerificationEmail" = ${request.state.user.emailVerificationEmail},
            "emailVerificationNonce" = ${request.state.user.emailVerificationNonce},
            "emailVerificationCreatedAt" = ${request.state.user.emailVerificationCreatedAt}
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
        request.body.password.length < 8
      )
        throw "validation";
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
          where "email" = ${request.body.email};
        `,
      );
      const passwordVerify = await argon2.verify(
        request.state.user?.password ??
          "$argon2id$v=19$m=12288,t=3,p=1$pCgoHHS6clgtd39p7OfS8Q$ESbcsGxnoGpxWVbtXjBac0Lb+sdAyAd0X3EBRk4wku0",
        request.body.password,
        application.privateConfiguration.argon2,
      );
      if (request.state.user === undefined || !passwordVerify) {
        response.setFlash(html`
          <div class="flash--red">Invalid email or password.</div>
        `);
        response.redirect(`/authentication${request.URL.search}`);
        return;
      }
      request.state.userSession = application.database.get<{
        id: number;
        publicId: string;
        user: number;
        createdAt: string;
        needsTwoFactorAuthentication: number;
        samlIdentifier: string | null;
        samlProfile: string | null;
      }>(
        sql`
          select * from "userSessions" where "id" = ${
            application.database.run(
              sql`
                insert into "userSessions" (
                  "publicId",
                  "user",
                  "createdAt",
                  "needsTwoFactorAuthentication",
                  "samlIdentifier",
                  "samlProfile"
                )
                values (
                  ${cryptoRandomString({
                    length: 100,
                    type: "alphanumeric",
                  })},
                  ${request.state.user.id},
                  ${new Date().toISOString()},
                  ${request.state.user.twoFactorAuthenticationEnabled},
                  ${null},
                  ${null}
                );
              `,
            ).lastInsertRowid
          };
        `,
      )!;
      response.setCookie("session", request.state.userSession.publicId);
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
              to: request.state.user.email,
              subject: "Sign in",
              html: html`
                <p>
                  Someone signed in to Courselore with the following email
                  address:
                  <code>${request.state.user.email}</code>
                </p>
                <p>
                  If it was not you, please report the issue to
                  <a
                    href="mailto:${application.configuration
                      .systemAdministratorEmail ??
                    "system-administrator@courselore.org"}?${new URLSearchParams(
                      {
                        subject: "Potential impersonation",
                        body: `Email: ${request.state.user.email}`,
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
      response.redirect(request.search.redirect ?? "/");
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/sign-in/two-factor-authentication",
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
        request.state.userSession === undefined ||
        Boolean(request.state.userSession.needsTwoFactorAuthentication) ===
          false ||
        request.state.user === undefined
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Two-factor authentication · Courselore</title>`,
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
                Two-factor authentication
              </div>
              <div
                type="form"
                method="POST"
                action="/authentication/sign-in/two-factor-authentication${request
                  .URL.search}"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
                `}"
              >
                <div
                  key="twoFactorAuthenticationCode"
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--1);
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
                      Two-factor authentication code
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="text"
                        inputmode="numeric"
                        name="twoFactorAuthenticationCode"
                        required
                        minlength="6"
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
                      font-weight: 600;
                      color: light-dark(
                        var(--color--slate--600),
                        var(--color--slate--400)
                      );
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--transparent"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[key~="twoFactorAuthenticationCode"]').hidden = true;
                          this.closest('[type~="form"]').querySelector('[name="twoFactorAuthenticationCode"]').disabled = true;
                          this.closest('[type~="form"]').querySelector('[key~="twoFactorAuthenticationRecoveryCode"]').hidden = false;
                          this.closest('[type~="form"]').querySelector('[name="twoFactorAuthenticationRecoveryCode"]').disabled = false;
                        };
                      `}"
                    >
                      Use two-factor authentication recovery code instead
                    </button>
                  </div>
                </div>
                <div
                  key="twoFactorAuthenticationRecoveryCode"
                  hidden
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--1);
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
                      Two-factor authentication recovery code
                    </div>
                    <div
                      css="${css`
                        display: flex;
                      `}"
                    >
                      <input
                        type="text"
                        inputmode="numeric"
                        name="twoFactorAuthenticationRecoveryCode"
                        required
                        minlength="10"
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
                      color: light-dark(
                        var(--color--slate--600),
                        var(--color--slate--400)
                      );
                    `}"
                  >
                    The recovery codes have been shown to you when you
                    configured two-factor authentication. Ten recovery codes
                    have been shown, and you may use any one of them above. Only
                    use a recovery code if you lost the method of two-factor
                    authentication, for example, if you lost your phone. A
                    recovery code may be used only once, and after that you must
                    configure two-factor authentication again.
                  </div>
                  <div
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
                    <button
                      type="button"
                      class="button button--rectangle button--transparent"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest('[type~="form"]').querySelector('[key~="twoFactorAuthenticationCode"]').hidden = false;
                          this.closest('[type~="form"]').querySelector('[name="twoFactorAuthenticationCode"]').disabled = false;
                          this.closest('[type~="form"]').querySelector('[key~="twoFactorAuthenticationRecoveryCode"]').hidden = true;
                          this.closest('[type~="form"]').querySelector('[name="twoFactorAuthenticationRecoveryCode"]').disabled = true;
                        };
                      `}"
                    >
                      Use two-factor authentication code instead
                    </button>
                  </div>
                </div>
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
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/sign-in/two-factor-authentication",
    handler: async (
      request: serverTypes.Request<
        {},
        { redirect: string },
        {},
        {
          twoFactorAuthenticationCode: string;
          twoFactorAuthenticationRecoveryCode: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.userSession === undefined ||
        Boolean(request.state.userSession.needsTwoFactorAuthentication) ===
          false ||
        request.state.user === undefined ||
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === false ||
        typeof request.state.user.twoFactorAuthenticationSecret !== "string" ||
        typeof request.state.user.twoFactorAuthenticationRecoveryCodes !==
          "string"
      )
        return;
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        (typeof request.body.twoFactorAuthenticationCode !== "string" &&
          typeof request.body.twoFactorAuthenticationRecoveryCode !==
            "string") ||
        (typeof request.body.twoFactorAuthenticationCode === "string" &&
          typeof request.body.twoFactorAuthenticationRecoveryCode ===
            "string") ||
        (typeof request.body.twoFactorAuthenticationCode === "string" &&
          request.body.twoFactorAuthenticationCode.length < 6) ||
        (typeof request.body.twoFactorAuthenticationRecoveryCode === "string" &&
          request.body.twoFactorAuthenticationRecoveryCode.length < 10)
      )
        throw "validation";
      if (
        (typeof request.body.twoFactorAuthenticationCode === "string" &&
          new OTPAuth.TOTP({
            secret: request.state.user.twoFactorAuthenticationSecret,
          }).validate({
            token: request.body.twoFactorAuthenticationCode,
          }) === null) ||
        (typeof request.body.twoFactorAuthenticationRecoveryCode === "string" &&
          !(
            await Promise.all(
              JSON.parse(
                request.state.user.twoFactorAuthenticationRecoveryCodes,
              ).map((twoFactorAuthenticationCode: string) =>
                argon2.verify(
                  twoFactorAuthenticationCode,
                  request.body.twoFactorAuthenticationRecoveryCode!,
                  application.privateConfiguration.argon2,
                ),
              ),
            )
          ).includes(true))
      ) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid
            ${typeof request.body.twoFactorAuthenticationCode === "string"
              ? "“Two-factor authentication code”"
              : typeof request.body.twoFactorAuthenticationRecoveryCode ===
                  "string"
                ? "“Two-factor authentication recovery code”"
                : (() => {
                    throw new Error();
                  })()}.
          </div>
        `);
        response.redirect(
          `/authentication/sign-in/two-factor-authentication${request.URL.search}`,
        );
        return;
      }
      if (
        typeof request.body.twoFactorAuthenticationRecoveryCode === "string"
      ) {
        request.state.user.twoFactorAuthenticationEnabled = Number(false);
        request.state.user.twoFactorAuthenticationSecret = null;
        request.state.user.twoFactorAuthenticationRecoveryCodes = null;
        application.database.run(
          sql`
            update "users"
            set
              "twoFactorAuthenticationEnabled" = ${request.state.user.twoFactorAuthenticationEnabled},
              "twoFactorAuthenticationSecret" = ${request.state.user.twoFactorAuthenticationSecret},
              "twoFactorAuthenticationRecoveryCodes" = ${request.state.user.twoFactorAuthenticationRecoveryCodes}
            where "id" = ${request.state.user.id};
          `,
        );
        application.database.run(
          sql`
            update "userSessions"
            set "needsTwoFactorAuthentication" = ${Number(false)}
            where "user" = ${request.state.user.id};
          `,
        );
        response.setFlash(html`
          <div class="flash--green">
            Two-factor authentication was disabled because you used a recovery
            code. Please consider enabling it again.
          </div>
        `);
        response.redirect("/settings");
        return;
      }
      request.state.userSession.needsTwoFactorAuthentication = Number(false);
      application.database.run(
        sql`
          update "userSessions"
          set "needsTwoFactorAuthentication" = ${request.state.userSession.needsTwoFactorAuthentication}
          where "id" = ${request.state.userSession.id};
        `,
      );
      response.redirect(request.search.redirect ?? "/");
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/reset-password",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        { email: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user !== undefined) return;
      if (
        typeof request.body.email !== "string" ||
        !request.body.email.match(utilities.emailRegExp)
      )
        throw "validation";
      const passwordResetNoncePlaintext = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      const passwordResetNonce = await argon2.hash(
        passwordResetNoncePlaintext,
        application.privateConfiguration.argon2,
      );
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
          where "email" = ${request.body.email};
        `,
      );
      if (
        request.state.user !== undefined &&
        (request.state.user.passwordResetCreatedAt === null ||
          request.state.user.passwordResetCreatedAt <
            new Date(Date.now() - 5 * 60 * 1000).toISOString())
      ) {
        request.state.user.passwordResetNonce = passwordResetNonce;
        request.state.user.passwordResetCreatedAt = new Date().toISOString();
        application.database.run(
          sql`
            update "users"
            set
              "passwordResetNonce" = ${request.state.user.passwordResetNonce},
              "passwordResetCreatedAt" = ${request.state.user.passwordResetCreatedAt}
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
                to: request.state.user.email,
                subject: "Reset password",
                html: html`
                  <p>
                    Someone is trying to reset the password for an account on
                    Courselore with the following email address:
                    <code>${request.state.user.email}</code>
                  </p>
                  <p>
                    If it was you, please reset your password:
                    <a
                      href="https://${application.configuration
                        .hostname}/authentication/reset-password/${request.state
                        .user.publicId}/${passwordResetNoncePlaintext}${request
                        .URL.search}"
                      >https://${application.configuration
                        .hostname}/authentication/reset-password/${request.state
                        .user.publicId}/${passwordResetNoncePlaintext}${request
                        .URL.search}</a
                    >
                  </p>
                  <p>
                    If it was not you, please report the issue to
                    <a
                      href="mailto:${application.configuration
                        .systemAdministratorEmail ??
                      "system-administrator@courselore.org"}?${new URLSearchParams(
                        {
                          subject: "Potential impersonation",
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
      }
      response.redirect(`/authentication/reset-password${request.URL.search}`);
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/reset-password",
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
          head: html`<title>Password reset · Courselore</title>`,
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
                Password reset
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
      "^/authentication/reset-password/(?<userPublicId>[0-9]+)/(?<passwordResetNonce>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        { userPublicId: string; passwordResetNonce: string },
        { redirect: string },
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.userPublicId !== "string" ||
        typeof request.pathname.passwordResetNonce !== "string"
      )
        return;
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (request.state.user !== undefined) {
        response.setFlash(html`
          <div class="flash--red">
            You can’t reset the password because you’re already signed in.
          </div>
        `);
        response.redirect(request.search.redirect ?? "/");
        return;
      }
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Reset password · Courselore</title>`,
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
                Reset password
              </div>
              <div
                type="form"
                method="POST"
                action="/authentication/reset-password/${request.pathname
                  .userPublicId}/${request.pathname.passwordResetNonce}${request
                  .URL.search}"
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
                    Reset password
                  </button>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/authentication/reset-password/(?<userPublicId>[0-9]+)/(?<passwordResetNonce>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        { userPublicId: string; passwordResetNonce: string },
        { redirect: string },
        {},
        { password: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.userPublicId !== "string" ||
        typeof request.pathname.passwordResetNonce !== "string" ||
        request.state.user !== undefined
      )
        return;
      if (
        typeof request.body.password !== "string" ||
        request.body.password.length < 8
      )
        throw "validation";
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      const password = await argon2.hash(
        request.body.password,
        application.privateConfiguration.argon2,
      );
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
          where "publicId" = ${request.pathname.userPublicId};
        `,
      );
      const passwordResetNonceVerify = await argon2.verify(
        request.state.user?.passwordResetNonce ??
          "$argon2id$v=19$m=12288,t=3,p=1$pCgoHHS6clgtd39p7OfS8Q$ESbcsGxnoGpxWVbtXjBac0Lb+sdAyAd0X3EBRk4wku0",
        request.pathname.passwordResetNonce,
        application.privateConfiguration.argon2,
      );
      if (
        request.state.user === undefined ||
        !passwordResetNonceVerify ||
        typeof request.state.user.passwordResetCreatedAt !== "string" ||
        request.state.user.passwordResetCreatedAt <
          new Date(Date.now() - 15 * 60 * 1000).toISOString()
      ) {
        response.setFlash(html`
          <div class="flash--red">
            There’s something wrong with this password reset. Please request a
            new password reset.
          </div>
        `);
        response.redirect(`/authentication${request.URL.search}`);
        return;
      }
      request.state.user.password = password;
      request.state.user.passwordResetNonce = null;
      request.state.user.passwordResetCreatedAt = null;
      application.database.run(
        sql`
          update "users"
          set
            "password" = ${request.state.user.password},
            "passwordResetNonce" = ${request.state.user.passwordResetNonce},
            "passwordResetCreatedAt" = ${request.state.user.passwordResetCreatedAt}
          where "id" = ${request.state.user.id};
        `,
      );
      application.database.run(
        sql`
          delete from "userSessions" where "user" = ${request.state.user.id};
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
              to: request.state.user.email,
              subject: "Password has been reset",
              html: html`
                <p>
                  Someone reset the password for an account on Courselore with
                  the following email address:
                  <code>${request.state.user.email}</code>
                </p>
                <p>
                  If it was not you, please report the issue to
                  <a
                    href="mailto:${application.configuration
                      .systemAdministratorEmail ??
                    "system-administrator@courselore.org"}?${new URLSearchParams(
                      {
                        subject: "Potential impersonation",
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
      response.setFlash(html`
        <div class="flash--green">The password was reset successfully.</div>
      `);
      response.redirect(`/authentication${request.URL.search}`);
    },
  });

  const samls =
    typeof application.configuration.saml === "object"
      ? (() => {
          const systemOptions = application.database.get<{
            id: number;
            privateKey: string;
            certificate: string;
            userRolesWhoMayCreateCourses:
              | "userRoleUser"
              | "userRoleStaff"
              | "userRoleSystemAdministrator";
          }>(
            sql`
              select
                "id",
                "privateKey",
                "certificate",
                "userRolesWhoMayCreateCourses"
              from "systemOptions"
              limit 1;
            `,
          );
          if (systemOptions === undefined) throw new Error();
          return Object.fromEntries(
            Object.entries(application.configuration.saml).map(
              ([identifier, configuration]) => [
                identifier,
                {
                  identifier,
                  configuration,
                  saml: new SAML.SAML({
                    ...configuration.options,
                    issuer: `https://${application.configuration.hostname}/authentication/saml/${identifier}/metadata`,
                    callbackUrl: `https://${application.configuration.hostname}/authentication/saml/${identifier}/assertion-consumer-service`,
                    logoutCallbackUrl: `https://${application.configuration.hostname}/authentication/saml/${identifier}/single-logout-service`,
                    privateKey: systemOptions.privateKey,
                    publicCert: systemOptions.certificate,
                    signMetadata: true,
                    validateInResponseTo: SAML.ValidateInResponseTo.ifPresent,
                  }),
                },
              ],
            ),
          );
        })()
      : undefined;

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/authentication/saml/(?<samlIdentifier>[a-z0-9\\-]+)/metadata$",
    ),
    handler: (
      request: serverTypes.Request<
        { samlIdentifier: string },
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.samlIdentifier !== "string" ||
        request.state.systemOptions === undefined
      )
        return;
      const saml = samls?.[request.pathname.samlIdentifier];
      if (saml === undefined) return;
      response
        .setHeader("Content-Type", "application/xml; charset=utf-8")
        .end(
          saml.saml.generateServiceProviderMetadata(
            saml.configuration.options.decryptionCert ?? null,
            request.state.systemOptions.certificate,
          ),
        );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/authentication/saml/(?<samlIdentifier>[a-z0-9\\-]+)/authorize$",
    ),
    handler: async (
      request: serverTypes.Request<
        { samlIdentifier: string },
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.samlIdentifier !== "string" ||
        request.state.user !== undefined
      )
        return;
      const saml = samls?.[request.pathname.samlIdentifier];
      if (saml === undefined) return;
      response.redirect(
        await saml.saml.getAuthorizeUrlAsync(
          request.URL.search.slice(1),
          undefined,
          {},
        ),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/authentication/saml/(?<samlIdentifier>[a-z0-9\\-]+)/assertion-consumer-service$",
    ),
    handler: async (
      request: serverTypes.Request<
        { samlIdentifier: string },
        {},
        {},
        { RelayState: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (typeof request.pathname.samlIdentifier !== "string") return;
      let redirect =
        typeof request.body.RelayState === "string" &&
        request.body.RelayState.trim() !== ""
          ? (new URLSearchParams(request.body.RelayState).get("redirect") ??
            "/")
          : "/";
      if (!redirect.startsWith("/")) redirect = "/";
      if (request.state.user !== undefined) {
        response.redirect(redirect);
        return;
      }
      const saml = samls?.[request.pathname.samlIdentifier];
      if (saml === undefined) return;
      let samlResponse: Awaited<
        ReturnType<typeof saml.saml.validatePostResponseAsync>
      >;
      let attributes: { email: string; name: string };
      try {
        samlResponse = await saml.saml.validatePostResponseAsync(request.body);
        if (
          samlResponse.loggedOut !== false ||
          samlResponse.profile === undefined ||
          samlResponse.profile === null ||
          samlResponse.profile.issuer !==
            saml.configuration.options.idpIssuer ||
          typeof samlResponse.profile.sessionIndex !== "string" ||
          samlResponse.profile.sessionIndex.trim() === ""
        )
          throw new Error();
        attributes = saml.configuration.attributes(samlResponse.profile);
        if (
          typeof attributes.email !== "string" ||
          !attributes.email.match(utilities.emailRegExp) ||
          typeof attributes.name !== "string" ||
          attributes.name.trim() === ""
        )
          throw new Error();
      } catch (error) {
        request.log("ERROR", String(error));
        response.setFlash(html`
          <div class="flash--red">
            Something went wrong. Please try signing in again.
          </div>
        `);
        response.redirect(
          `/authentication?${typeof request.body.RelayState === "string" && request.body.RelayState.trim() !== "" ? request.body.RelayState : ""}`,
        );
        return;
      }
      application.database.executeTransaction(() => {
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
            where "email" = ${attributes.email};
          `,
        );
        request.state.user ??= application.database.get<{
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
                    ${attributes.name!},
                    ${utilities
                      .tokenize(attributes.name!)
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")},
                    ${attributes.email},
                    ${null},
                    ${null},
                    ${null},
                    ${null},
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
      });
      request.state.userSession = application.database.get<{
        id: number;
        publicId: string;
        user: number;
        createdAt: string;
        needsTwoFactorAuthentication: number;
        samlIdentifier: string | null;
        samlProfile: string | null;
      }>(
        sql`
          select * from "userSessions" where "id" = ${
            application.database.run(
              sql`
                insert into "userSessions" (
                  "publicId",
                  "user",
                  "createdAt",
                  "needsTwoFactorAuthentication",
                  "samlIdentifier",
                  "samlProfile"
                )
                values (
                  ${cryptoRandomString({
                    length: 100,
                    type: "alphanumeric",
                  })},
                  ${request.state.user!.id},
                  ${new Date().toISOString()},
                  ${Number(false)},
                  ${saml.identifier},
                  ${JSON.stringify(samlResponse.profile)}
                );
              `,
            ).lastInsertRowid
          };
        `,
      )!;
      response.setCookie("session", request.state.userSession.publicId);
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
              to: request.state.user!.email,
              subject: "Sign in",
              html: html`
                <p>
                  Someone signed in to Courselore with the following email
                  address:
                  <code>${request.state.user!.email}</code>
                </p>
                <p>
                  If it was not you, please report the issue to
                  <a
                    href="mailto:${application.configuration
                      .systemAdministratorEmail ??
                    "system-administrator@courselore.org"}?${new URLSearchParams(
                      {
                        subject: "Potential impersonation",
                        body: `Email: ${request.state.user!.email}`,
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
      response.redirect(redirect);
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication/set-password",
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
        request.state.user.password !== undefined
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Set password · Courselore</title>`,
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
                Set password
              </div>
              <div
                type="form"
                method="POST"
                action="/authentication/set-password${request.URL.search}"
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
                    Set password
                  </button>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/set-password",
    handler: async (
      request: serverTypes.Request<
        {},
        { redirect: string },
        {},
        { password: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.user.password !== undefined
      )
        return;
      if (
        typeof request.body.password !== "string" ||
        request.body.password.length < 8
      )
        throw "validation";
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      request.state.user.password = await argon2.hash(
        request.body.password,
        application.privateConfiguration.argon2,
      );
      application.database.run(
        sql`
          update "users"
          set "password" = ${request.state.user.password}
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">The password was set successfully.</div>
      `);
      response.redirect(request.search.redirect ?? "/");
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/authentication/sign-out",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.userSession === undefined) return;
      application.database.run(
        sql`
          delete from "userSessions" where "id" = ${request.state.userSession.id};
        `,
      );
      response.deleteCookie("session");
      if (
        typeof request.state.userSession.samlIdentifier === "string" &&
        typeof request.state.userSession.samlProfile === "string"
      ) {
        const saml = samls?.[request.state.userSession.samlIdentifier];
        if (saml === undefined) {
          response.redirect("/");
          return;
        }
        response.redirect(
          await saml.saml.getLogoutUrlAsync(
            JSON.parse(request.state.userSession.samlProfile),
            "",
            {},
          ),
        );
      } else response.redirect("/");
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/authentication/saml/(?<samlIdentifier>[a-z0-9\\-]+)/single-logout-service$",
    ),
    handler: async (
      request: serverTypes.Request<
        { samlIdentifier: string },
        {},
        {},
        { SAMLRequest: string; RelayState: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (typeof request.pathname.samlIdentifier !== "string") return;
      if (
        typeof request.body.SAMLRequest !== "string" ||
        typeof request.body.RelayState !== "string"
      ) {
        response.redirect("/");
        return;
      }
      const saml = samls?.[request.pathname.samlIdentifier];
      if (saml === undefined) return;
      let samlRequest: Awaited<
        ReturnType<typeof saml.saml.validatePostRequestAsync>
      >;
      let redirect: string;
      try {
        samlRequest = await saml.saml.validatePostRequestAsync(request.body);
        redirect = await saml.saml.getLogoutResponseUrlAsync(
          samlRequest.profile,
          request.body.RelayState,
          {},
          true,
        );
      } catch (error) {
        request.log("ERROR", String(error));
        response.setFlash(html`
          <div class="flash--red">
            Something went wrong. Please try signing out again.
          </div>
        `);
        response.redirect("/");
        return;
      }
      if (
        request.state.userSession !== undefined &&
        typeof request.state.userSession.samlIdentifier === "string" &&
        typeof request.state.userSession.samlProfile === "string" &&
        request.state.user !== undefined
      ) {
        const sessionProfile = JSON.parse(
          request.state.userSession.samlProfile,
        );
        if (
          request.state.userSession.samlIdentifier ===
            request.pathname.samlIdentifier &&
          samlRequest.loggedOut === true &&
          samlRequest.profile !== undefined &&
          samlRequest.profile !== null &&
          samlRequest.profile.issuer === saml.configuration.options.idpIssuer &&
          typeof samlRequest.profile.nameID === "string" &&
          samlRequest.profile.nameID.trim() !== "" &&
          samlRequest.profile.nameID === sessionProfile.nameID &&
          typeof samlRequest.profile.sessionIndex === "string" &&
          samlRequest.profile.sessionIndex.trim() !== "" &&
          samlRequest.profile.sessionIndex === sessionProfile.sessionIndex
        ) {
          application.database.run(
            sql`
              delete from "userSessions" where "id" = ${request.state.userSession.id};
            `,
          );
          response.deleteCookie("session");
        }
      }
      response.redirect(redirect);
    },
  });
};
