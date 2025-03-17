import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationAuthentication = {
  types: {
    states: {
      User: {
        user: {
          id: number;
          publicId: string;
          name: string;
          email: string;
          emailVerificationEmail: string | null;
          emailVerificationNonce: string | null;
          emailVerificationCreatedAt: string | null;
          emailVerified: number;
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
    method: "GET",
    pathname: "/",
    handler: (request, response) => {
      response.redirect("/authentication");
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/authentication",
    handler: (request, response) => {
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
};
