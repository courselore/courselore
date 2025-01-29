import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationUsers = {
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
  partials: {
    userAvatar: ({
      user,
      onlineIndicator,
      size,
    }: {
      user:
        | {
            publicId: string;
            name: string;
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
            lastSeenOnlineAt: string;
          }
        | "courseParticipationDeleted"
        | "anonymous";
      onlineIndicator?: boolean;
      size?: 6 | 9;
    }) => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      // TODO
      request.state.user = application.database.get<{
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
            "emailVerified",
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
          where "id" = ${1};
        `,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      const courseParticipation = application.database.get<{
        course: number;
      }>(
        sql`
          select "course"
          from "courseParticipations"
          $${
            typeof request.state.user.mostRecentlyVisitedCourseParticipation ===
            "number"
              ? sql`
                  where "id" = ${request.state.user.mostRecentlyVisitedCourseParticipation}
                `
              : sql`
                  where "user" = ${request.state.user.id}
                  order by "id" desc
                  limit 1
                `
          };
        `,
      );
      if (courseParticipation === undefined) return;
      const course = application.database.get<{
        publicId: number;
      }>(
        sql`
          select "publicId"
          from "courses"
          where "id" = ${courseParticipation.course};
        `,
      );
      if (course === undefined) throw new Error();
      response.redirect(`/courses/${course.publicId}`);
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/settings$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html` <title>User settings · Courselore</title> `,
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
                User settings
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
                        transform: rotate(var(--transform--rotate--90));
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  General settings
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/settings"
                  css="${css`
                    margin: var(--size--2) var(--size--0);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                  javascript="${javascript`
                    this.onsubmit = () => {
                      delete this.querySelector('[key~="userAvatar--withAvatarImage"]').morph;
                    };
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
                        value="${request.state.user.name}"
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
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--1);
                    `}"
                  >
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
                      Avatar
                    </div>
                    <div
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--1-5);
                      `}"
                    >
                      <div
                        key="userAvatar--withoutAvatarImage"
                        $${typeof request.state.user.avatarImage === "string"
                          ? html`hidden`
                          : html``}
                      >
                        $${application.partials.userAvatar({
                          user: { ...request.state.user, avatarImage: null },
                          onlineIndicator: false,
                          size: 9,
                        })}
                      </div>
                      <div
                        key="userAvatar--withAvatarImage"
                        $${request.state.user.avatarImage === null
                          ? html`hidden`
                          : html``}
                        javascript="${javascript`
                          this.morph = false;
                        `}"
                      >
                        $${application.partials.userAvatar({
                          user: {
                            ...request.state.user,
                            avatarImage: request.state.user.avatarImage ?? "",
                          },
                          onlineIndicator: false,
                          size: 9,
                        })}
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
                          display: flex;
                          align-items: baseline;
                          flex-wrap: wrap;
                          column-gap: var(--size--4);
                          row-gap: var(--size--2);
                        `}"
                      >
                        <label
                          class="button button--rectangle button--transparent"
                        >
                          <input
                            type="file"
                            name="avatarImage"
                            accept="image/png, image/jpeg"
                            hidden
                            javascript="${javascript`
                              this.onchange = async () => {
                                if (this.files.length !== 1) return;
                                const image = await new Promise((resolve) => {
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    resolve(reader.result);
                                  };
                                  reader.readAsDataURL(this.files[0]);
                                });
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--withoutAvatarImage"]').hidden = true;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--withAvatarImage"]').hidden = false;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--withAvatarImage"] img').setAttribute("src", image);
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--add"]').hidden = true;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--change"]').hidden = false;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--remove"]').hidden = false;
                                this.closest('[type~="form"]').querySelector('[name="avatarImage--remove"]').checked = false;
                              };
                            `}"
                          />
                          <div
                            key="userAvatar--add"
                            $${typeof request.state.user.avatarImage ===
                            "string"
                              ? html`hidden`
                              : html``}
                          >
                            Add
                          </div>
                          <div
                            key="userAvatar--change"
                            $${request.state.user.avatarImage === null
                              ? html`hidden`
                              : html``}
                          >
                            Change
                          </div>
                        </label>
                        <label
                          key="userAvatar--remove"
                          $${request.state.user.avatarImage === null
                            ? html`hidden`
                            : html``}
                          class="button button--rectangle button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="avatarImage--remove"
                            hidden
                            javascript="${javascript`
                              this.onchange = () => {
                                if (!this.checked) return;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--withoutAvatarImage"]').hidden = false;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--withAvatarImage"]').hidden = true;
                                this.closest('[type~="form"]').querySelector('[name="avatarImage"]').value = "";
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--add"]').hidden = false;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--change"]').hidden = true;
                                this.closest('[type~="form"]').querySelector('[key~="userAvatar--remove"]').hidden = true;
                              };
                            `}"
                          />
                          Remove
                        </label>
                      </div>
                    </div>
                  </div>
                  <div
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--1);
                    `}"
                  >
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
                      Dark mode
                    </div>
                    <div
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeSystem"
                          $${request.state.user.darkMode ===
                          "userDarkModeSystem"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  System
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeLight"
                          $${request.state.user.darkMode === "userDarkModeLight"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  Light
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeDark"
                          $${request.state.user.darkMode === "userDarkModeDark"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  Dark
                      </label>
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
                      Update general settings
                    </button>
                  </div>
                  <hr class="separator" />
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
                        transform: rotate(var(--transform--rotate--90));
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  Authentication
                </summary>
                <div
                  css="${css`
                    margin: var(--size--2) var(--size--0);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <div
                    type="form"
                    method="PATCH"
                    action="/settings"
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
                        Current email address
                      </div>
                      <div
                        css="${css`
                          display: flex;
                        `}"
                      >
                        <input
                          type="text"
                          value="${request.state.user.email}"
                          readonly
                          class="input--text"
                          css="${css`
                            flex: 1;
                            font-family: "Roboto Mono Variable",
                              var(--font-family--monospace);
                          `}"
                          javascript="${javascript`
                            this.onclick = () => {
                              this.select();
                            };
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
                        New email address
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
                            font-family: "Roboto Mono Variable",
                              var(--font-family--monospace);
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
                          name="passwordConfirmation"
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
                    $${Boolean(
                      request.state.user.twoFactorAuthenticationEnabled,
                    )
                      ? html`
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
                                name="twoFactorAuthenticationConfirmation"
                                required
                                class="input--text"
                                css="${css`
                                  flex: 1;
                                `}"
                              />
                            </div>
                          </label>
                        `
                      : html``}
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
                        Change email address
                      </button>
                    </div>
                  </div>
                  <hr class="separator" />
                  <div
                    type="form"
                    method="PATCH"
                    action="/settings"
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
                        Current password
                      </div>
                      <div
                        css="${css`
                          display: flex;
                        `}"
                      >
                        <input
                          type="password"
                          name="passwordConfirmation"
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
                        New password
                      </div>
                      <div
                        css="${css`
                          display: flex;
                        `}"
                      >
                        <input
                          type="password"
                          name="newPassword"
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
                        New password confirmation
                      </div>
                      <div
                        css="${css`
                          display: flex;
                        `}"
                      >
                        <input
                          type="password"
                          required
                          class="input--text"
                          css="${css`
                            flex: 1;
                          `}"
                          javascript="${javascript`
                            this.onvalidate = () => {
                              if (this.value !== this.closest('[type~="form"]').querySelector('[name="newPassword"]'))
                                throw new javascript.ValidationError("“New password” and “New password confirmation” don’t match.");
                            };
                          `}"
                        />
                      </div>
                    </label>
                    $${Boolean(
                      request.state.user.twoFactorAuthenticationEnabled,
                    )
                      ? html`
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
                                name="twoFactorAuthenticationConfirmation"
                                required
                                class="input--text"
                                css="${css`
                                  flex: 1;
                                `}"
                              />
                            </div>
                          </label>
                        `
                      : html``}
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
                        Change password
                      </button>
                    </div>
                  </div>
                  <hr class="separator" />
                  $${Boolean(
                    request.state.user.twoFactorAuthenticationEnabled,
                  ) === false
                    ? html`
                        <div
                          type="form"
                          method="PATCH"
                          action="/settings"
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
                              Password confirmation
                            </div>
                            <div
                              css="${css`
                                display: flex;
                              `}"
                            >
                              <input
                                type="password"
                                name="passwordConfirmation"
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
                              Enable two-factor authentication
                            </button>
                          </div>
                        </div>
                      `
                    : html`
                        <div
                          type="form"
                          method="PATCH"
                          action="/settings"
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
                              Password confirmation
                            </div>
                            <div
                              css="${css`
                                display: flex;
                              `}"
                            >
                              <input
                                type="password"
                                name="passwordConfirmation"
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
                                name="twoFactorAuthenticationConfirmation"
                                required
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
                              Disable two-factor authentication
                            </button>
                          </div>
                        </div>
                      `}
                  <hr class="separator" />
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
                        transform: rotate(var(--transform--rotate--90));
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  Email notifications
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/settings"
                  css="${css`
                    margin: var(--size--2) var(--size--0);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <div
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--2);
                    `}"
                  >
                    <label class="button button--rectangle button--transparent">
                      <input
                        type="checkbox"
                        name="emailNotificationsForAllMessages"
                        $${Boolean(
                          request.state.user.emailNotificationsForAllMessages,
                        )
                          ? html`checked`
                          : html``}
                        class="input--checkbox"
                        javascript="${javascript`
                          this.onchange = () => {
                            if (this.checked)
                              for (const element of this.closest('[type~="form"]').querySelectorAll("input"))
                                element.checked = true;
                          };
                        `}"
                      />  Email notifications for all messages
                    </label>
                    <label class="button button--rectangle button--transparent">
                      <input
                        type="checkbox"
                        name="emailNotificationsForMessagesIncludingMentions"
                        $${Boolean(
                          request.state.user
                            .emailNotificationsForMessagesIncludingMentions,
                        )
                          ? html`checked`
                          : html``}
                        class="input--checkbox"
                        javascript="${javascript`
                          this.onchange = () => {
                            if (!this.checked)
                              this.closest('[type~="form"]').querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                          };
                        `}"
                      />  Email notifications for messages including
                      <strong
                        css="${css`
                          font-weight: 500;
                        `}"
                        >@mentions</strong
                      >
                    </label>
                    <label class="button button--rectangle button--transparent">
                      <input
                        type="checkbox"
                        name="emailNotificationsForMessagesInConversationsInWhichYouParticipated"
                        $${Boolean(
                          request.state.user
                            .emailNotificationsForMessagesInConversationsInWhichYouParticipated,
                        )
                          ? html`checked`
                          : html``}
                        class="input--checkbox"
                        javascript="${javascript`
                          this.onchange = () => {
                            if (!this.checked)
                              this.closest('[type~="form"]').querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                            else
                              this.closest('[type~="form"]').querySelector('[name="emailNotificationsForMessagesInConversationsThatYouStarted"]').checked = true;
                          };
                        `}"
                      />  Email notifications for messages in conversations in
                      which you participated
                    </label>
                    <label class="button button--rectangle button--transparent">
                      <input
                        type="checkbox"
                        name="emailNotificationsForMessagesInConversationsThatYouStarted"
                        $${Boolean(
                          request.state.user
                            .emailNotificationsForMessagesInConversationsThatYouStarted,
                        )
                          ? html`checked`
                          : html``}
                        class="input--checkbox"
                        javascript="${javascript`
                          this.onchange = () => {
                            if (!this.checked) {
                              this.closest('[type~="form"]').querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                              this.closest('[type~="form"]').querySelector('[name="emailNotificationsForMessagesInConversationsInWhichYouParticipated"]').checked = false;
                            }
                          };
                        `}"
                      />  Email notifications for messages in conversations that
                      you started
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
                      You always receive email notifications for instructors
                      announcements and you may not opt out of them.
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
                      Update email notifications
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
    method: "PATCH",
    pathname: "/settings",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { sidebarWidth: string },
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (typeof request.body.sidebarWidth === "string")
        if (
          request.body.sidebarWidth.match(/^[0-9]+$/) === null ||
          Number(request.body.sidebarWidth) < 60 * 4 ||
          112 * 4 < Number(request.body.sidebarWidth)
        )
          throw "validation";
        else
          application.database.run(
            sql`
              update "users"
              set "sidebarWidth" = ${Number(request.body.sidebarWidth)}
              where "id" = ${request.state.user.id};
            `,
          );
      response.redirect();
    },
  });

  application.partials.userAvatar = ({
    user,
    onlineIndicator = true,
    size = 6,
  }) => html`
    <div
      key="user--avatar/${typeof user === "object" ? user.publicId : user}"
      css="${css`
        user-select: none;
        display: grid;
        & > * {
          grid-area: 1 / 1;
        }
      `}"
    >
      $${typeof user === "object" && typeof user.avatarImage === "string"
        ? html`
            <img
              src="${user.avatarImage}"
              loading="lazy"
              css="${css`
                background-color: light-dark(
                  var(--color--white),
                  var(--color--white)
                );
                border-radius: var(--border-radius--1);
                display: block;
                object-fit: cover;
              `} ${size === 6
                ? css`
                    width: var(--size--6);
                    height: var(--size--6);
                  `
                : size === 9
                  ? css`
                      width: var(--size--9);
                      height: var(--size--9);
                    `
                  : (() => {
                      throw new Error();
                    })()}"
            />
          `
        : html`
            <div
              style="
                --color--light: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--800);
                --color--dark: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--200);
                --background-color--light: var(--color--${typeof user ===
              "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--200);
                --background-color--dark: var(--color--${typeof user ===
              "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--800);
                --border-color--light: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--300);
                --border-color--dark: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--900);
              "
              css="${css`
                font-family: "Roboto Serif Variable", var(--font-family--serif);
                line-height: var(--size--0);
                font-weight: 900;
                color: light-dark(var(--color--light), var(--color--dark));
                background-color: light-dark(
                  var(--background-color--light),
                  var(--background-color--dark)
                );
                border: var(--border-width--1) solid
                  light-dark(
                    var(--border-color--light),
                    var(--border-color--dark)
                  );
                border-radius: var(--border-radius--1);
                overflow: hidden;
                display: flex;
                justify-content: center;
                align-items: center;
              `} ${size === 6
                ? `${
                    typeof user === "object"
                      ? css`
                          font-size: var(--font-size--2-5);
                        `
                      : css`
                          font-size: var(--font-size--4);
                        `
                  } ${css`
                    width: var(--size--6);
                    height: var(--size--6);
                  `}`
                : size === 9
                  ? `${
                      typeof user === "object"
                        ? css`
                            font-size: var(--font-size--3-5);
                          `
                        : css`
                            font-size: var(--font-size--6);
                          `
                    } ${css`
                      width: var(--size--9);
                      height: var(--size--9);
                    `}`
                  : (() => {
                      throw new Error();
                    })()}"
            >
              $${typeof user === "object"
                ? (() => {
                    const nameParts = [
                      ...user.name.matchAll(
                        /[\p{Letter}\p{Number}\p{Private_Use}]+/gu,
                      ),
                    ];
                    return html`${nameParts.length === 0
                      ? (() => {
                          throw new Error();
                        })()
                      : nameParts.length === 1
                        ? [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts[0][0],
                            ),
                          ][0].segment
                        : [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts.at(0)![0],
                            ),
                          ][0].segment +
                          [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts.at(-1)![0],
                            ),
                          ][0].segment}`;
                  })()
                : user === "courseParticipationDeleted"
                  ? html`<i class="bi bi-person-x"></i>`
                  : user === "anonymous"
                    ? html`<i class="bi bi-person"></i>`
                    : (() => {
                        throw new Error();
                      })()}
            </div>
          `}
      $${onlineIndicator && typeof user === "object"
        ? html`
            <div
              css="${css`
                font-size: var(--size--1-5);
                line-height: var(--size--0);
                color: light-dark(
                  var(--color--green--500),
                  var(--color--green--500)
                );
                justify-self: end;
                align-self: end;
                transform: translate(40%, 40%);
                transition-property: var(--transition-property--opacity);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
              `} ${user.lastSeenOnlineAt <
              new Date(Date.now() - 5 * 60 * 1000).toISOString()
                ? css`
                    opacity: var(--opacity--0);
                  `
                : css``}"
            >
              <i class="bi bi-circle-fill"></i>
            </div>
          `
        : html``}
    </div>
  `;
};
