import path from "node:path";
import fs from "node:fs/promises";
import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import argon2 from "argon2";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import sharp from "sharp";
import { Application } from "./index.mjs";

export type ApplicationUsers = {
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
    method: "GET",
    pathname: "/",
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
        request.state.systemOptions === undefined ||
        request.state.user === undefined
      )
        return;
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
      if (courseParticipation !== undefined) {
        const course = application.database.get<{
          publicId: string;
        }>(
          sql`
            select "publicId"
            from "courses"
            where "id" = ${courseParticipation.course};
          `,
        );
        if (course === undefined) throw new Error();
        response.redirect(`/courses/${course.publicId}`);
        return;
      }
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Welcome to Courselore! · Courselore</title>`,
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
                Welcome to Courselore!
              </div>
              <div
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
                `}"
              >
                $${(request.state.systemOptions.userRolesWhoMayCreateCourses ===
                  "userRoleUser" &&
                  (request.state.user.userRole === "userRoleUser" ||
                    request.state.user.userRole === "userRoleStaff" ||
                    request.state.user.userRole ===
                      "userRoleSystemAdministrator")) ||
                (request.state.systemOptions.userRolesWhoMayCreateCourses ===
                  "userRoleStaff" &&
                  (request.state.user.userRole === "userRoleStaff" ||
                    request.state.user.userRole ===
                      "userRoleSystemAdministrator")) ||
                (request.state.systemOptions.userRolesWhoMayCreateCourses ===
                  "userRoleSystemAdministrator" &&
                  request.state.user.userRole === "userRoleSystemAdministrator")
                  ? html`
                      <div>
                        <a
                          href="/courses/new"
                          class="button button--rectangle button--blue"
                          >Create a new course</a
                        >
                      </div>
                    `
                  : html``}
                <div>
                  <button
                    type="button"
                    class="button button--rectangle button--transparent"
                    javascript="${javascript`
                      javascript.popover({ element: this, trigger: "click" });
                    `}"
                  >
                    Join an existing course
                  </button>
                  <div type="popover">
                    To join an existing course you must receive an invitation
                    from the instructors, either via an invitation link or via
                    email.
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/settings",
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
      if (request.state.user === undefined) return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>User settings · Courselore</title>`,
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
                        rotate: var(--rotate--90);
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
                  action="/settings/general-settings"
                  enctype="multipart/form-data"
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
                  javascript="${javascript`
                    this.onsubmit = () => {
                      delete this.querySelector('[key~="userAvatar--withAvatarImage"]').morph;
                      this.querySelector('[name="avatarImage"]').value = "";
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
                            accept="image/jpeg, image/png"
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
                    <form
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
                    </form>
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
                  Authentication
                </summary>
                <div
                  css="${css`
                    padding: var(--size--2) var(--size--0);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--2);
                  `}"
                >
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
                      Email address
                    </summary>
                    <div
                      type="form"
                      method="PATCH"
                      action="/settings/email-address"
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
                      javascript="${javascript`
                        this.onsubmit = () => {
                          javascript.reset(this);
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
                              font-family:
                                "Roboto Mono Variable",
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
                              font-family:
                                "Roboto Mono Variable",
                                var(--font-family--monospace);
                            `}"
                            javascript="${javascript`
                              this.onvalidate = () => {
                                if (this.value === ${request.state.user.email})
                                  throw new javascript.ValidationError("“New email address” cannot be the same as “Current email address”.");
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
                                  minlength="6"
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
                      Password
                    </summary>
                    <div
                      type="form"
                      method="PATCH"
                      action="/settings/password"
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
                      javascript="${javascript`
                        this.onsubmit = () => {
                          javascript.reset(this);
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
                            name="password"
                            required
                            minlength="8"
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                            javascript="${javascript`
                              this.onvalidate = () => {
                                if (this.value === this.closest('[type~="form"]').querySelector('[name="passwordConfirmation"]').value)
                                  throw new javascript.ValidationError("“New password” cannot be the same as “Current password”.");
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
                                if (this.value !== this.closest('[type~="form"]').querySelector('[name="password"]').value)
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
                                  minlength="6"
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
                      Two-factor authentication
                    </summary>
                    $${Boolean(
                      request.state.user.twoFactorAuthenticationEnabled,
                    ) === false
                      ? html`
                          <div
                            type="form"
                            method="POST"
                            action="/settings/two-factor-authentication"
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
                            <div
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 600;
                                color: light-dark(
                                  var(--color--red--500),
                                  var(--color--red--500)
                                );
                              `}"
                            >
                              Two-factor authentication is disabled.
                            </div>
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
                            method="DELETE"
                            action="/settings/two-factor-authentication"
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
                            javascript="${javascript`
                              this.onsubmit = () => {
                                javascript.reset(this);
                              };
                            `}"
                          >
                            <div
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 600;
                                color: light-dark(
                                  var(--color--green--500),
                                  var(--color--green--500)
                                );
                              `}"
                            >
                              Two-factor authentication is enabled.
                            </div>
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
                  Email notifications
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/settings/email-notifications"
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
                      />  Email notifications for messages including a
                      <strong
                        css="${css`
                          font-weight: 500;
                        `}"
                        >@mention</strong
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
                  Danger zone
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
                  <div
                    css="${css`
                      font-size: var(--font-size--3);
                      line-height: var(--font-size--3--line-height);
                    `}"
                  >
                    <button
                      type="button"
                      class="button button--rectangle button--red"
                      javascript="${javascript`
                        javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true });
                      `}"
                    >
                      Delete my account
                    </button>
                    <div
                      type="form popover"
                      method="DELETE"
                      action="/settings/delete-my-account"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 600;
                          color: light-dark(
                            var(--color--red--500),
                            var(--color--red--500)
                          );
                        `}"
                      >
                        <i class="bi bi-exclamation-triangle-fill"></i> This
                        action cannot be undone. You’ll lose access to all your
                        courses.
                      </div>
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
                          Name confirmation
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="text"
                            placeholder="${request.state.user.name}"
                            required
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                            javascript="${javascript`
                              this.onvalidate = () => {
                                if (this.value !== ${request.state.user.name})
                                  throw new javascript.ValidationError(${`Incorrect name confirmation: “${request.state.user.name}”`});
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
                          Email confirmation
                        </div>
                        <div
                          css="${css`
                            display: flex;
                          `}"
                        >
                          <input
                            type="text"
                            placeholder="${request.state.user.email}"
                            required
                            maxlength="2000"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                            javascript="${javascript`
                              this.onvalidate = () => {
                                if (this.value !== ${request.state.user.email})
                                  throw new javascript.ValidationError(${`Incorrect email confirmation: “${request.state.user.email}”`});
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
                                  minlength="6"
                                  class="input--text"
                                  css="${css`
                                    flex: 1;
                                  `}"
                                />
                              </div>
                            </label>
                          `
                        : html``}
                      <div>
                        <button
                          type="submit"
                          class="button button--rectangle button--red"
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                          `}"
                        >
                          Delete my account
                        </button>
                      </div>
                    </div>
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
    pathname: "/settings/general-settings",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          name: string;
          avatarImage: serverTypes.RequestBodyFile;
          "avatarImage--remove": "on";
          darkMode:
            | "userDarkModeSystem"
            | "userDarkModeLight"
            | "userDarkModeDark";
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (
        typeof request.body.name !== "string" ||
        request.body.name.trim() === "" ||
        (typeof request.body.avatarImage === "object" &&
          request.body.avatarImage.mimeType !== "image/jpeg" &&
          request.body.avatarImage.mimeType !== "image/png") ||
        (request.body.darkMode !== "userDarkModeSystem" &&
          request.body.darkMode !== "userDarkModeLight" &&
          request.body.darkMode !== "userDarkModeDark")
      )
        throw "validation";
      let avatarImage: string | undefined;
      if (typeof request.body.avatarImage === "object") {
        const relativePath = `files/${cryptoRandomString({
          length: 20,
          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
        })}/${path.basename(request.body.avatarImage.path)}`;
        const absolutePath = path.join(
          application.configuration.dataDirectory,
          relativePath,
        );
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.rename(request.body.avatarImage.path, absolutePath);
        await sharp(absolutePath, { autoOrient: true })
          .resize({ width: 256 /* var(--size--64) */, height: 256 })
          .toFile(`${absolutePath}.webp`);
        avatarImage = `/${relativePath}.webp`;
      }
      application.database.run(
        sql`
          update "users"
          set
            "name" = ${request.body.name},
            $${typeof avatarImage === "string" ? sql`"avatarImage" = ${avatarImage},` : request.body["avatarImage--remove"] === "on" ? sql`"avatarImage" = null,` : sql``}
            "darkMode" = ${request.body.darkMode}
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">General settings updated successfully.</div>
      `);
      response.redirect("/settings");
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: "/settings/email-address",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          email: string;
          passwordConfirmation: string;
          twoFactorAuthenticationConfirmation: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (
        typeof request.body.email !== "string" ||
        !request.body.email.match(utilities.emailRegExp) ||
        request.body.email === request.state.user.email ||
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.length < 8 ||
        (Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
          (typeof request.body.twoFactorAuthenticationConfirmation !==
            "string" ||
            request.body.twoFactorAuthenticationConfirmation.length < 6))
      )
        throw "validation";
      const passwordConfirmationVerify = await argon2.verify(
        request.state.user.password!,
        request.body.passwordConfirmation,
        application.privateConfiguration.argon2,
      );
      const twoFactorAuthenticationValidate =
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
        typeof request.state.user.twoFactorAuthenticationSecret === "string" &&
        typeof request.body.twoFactorAuthenticationConfirmation === "string"
          ? new OTPAuth.TOTP({
              secret: request.state.user.twoFactorAuthenticationSecret,
            }).validate({
              token: request.body.twoFactorAuthenticationConfirmation,
            }) !== null
          : true;
      if (!passwordConfirmationVerify || !twoFactorAuthenticationValidate) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid “Password
            confirmation”${Boolean(
              request.state.user.twoFactorAuthenticationEnabled,
            ) === true
              ? " or “Two-factor authentication code”"
              : ""}.
          </div>
        `);
        response.redirect("/settings");
        return;
      }
      request.state.user.emailVerificationEmail = request.body.email;
      request.state.user.emailVerificationNonce = cryptoRandomString({
        length: 100,
        type: "numeric",
      });
      request.state.user.emailVerificationCreatedAt = new Date().toISOString();
      application.database.run(
        sql`
          update "users"
          set
            "emailVerificationEmail" = ${request.state.user.emailVerificationEmail},
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
              to: request.state.user.email,
              subject: "Trying to change email address",
              html: html`
                <p>
                  Someone is trying to change an account on Courselore from the
                  email address <code>${request.state.user.email}</code> to the
                  email address
                  <code>${request.state.user.emailVerificationEmail}</code>.
                </p>
                <p>
                  If it was you, please check the inbox for
                  <code>${request.state.user.emailVerificationEmail}</code> to
                  verify the email address.
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
                  Someone is trying to change an account on Courselore from the
                  email address <code>${request.state.user.email}</code> to the
                  email address
                  <code>${request.state.user.emailVerificationEmail}</code>.
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
        <div class="flash--green">
          Check your inbox to verify the new email address.
        </div>
      `);
      response.redirect("/settings");
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: "/settings/password",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          passwordConfirmation: string;
          password: string;
          twoFactorAuthenticationConfirmation: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.userSession === undefined ||
        request.state.user === undefined
      )
        return;
      if (
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.length < 8 ||
        typeof request.body.password !== "string" ||
        request.body.password.length < 8 ||
        request.body.passwordConfirmation === request.body.password ||
        (Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
          (typeof request.body.twoFactorAuthenticationConfirmation !==
            "string" ||
            request.body.twoFactorAuthenticationConfirmation.length < 6))
      )
        throw "validation";
      const passwordConfirmationVerify = await argon2.verify(
        request.state.user.password!,
        request.body.passwordConfirmation,
        application.privateConfiguration.argon2,
      );
      const twoFactorAuthenticationValidate =
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
        typeof request.state.user.twoFactorAuthenticationSecret === "string" &&
        typeof request.body.twoFactorAuthenticationConfirmation === "string"
          ? new OTPAuth.TOTP({
              secret: request.state.user.twoFactorAuthenticationSecret,
            }).validate({
              token: request.body.twoFactorAuthenticationConfirmation,
            }) !== null
          : true;
      if (!passwordConfirmationVerify || !twoFactorAuthenticationValidate) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid “Current
            password”${Boolean(
              request.state.user.twoFactorAuthenticationEnabled,
            ) === true
              ? " or “Two-factor authentication code”"
              : ""}.
          </div>
        `);
        response.redirect("/settings");
        return;
      }
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
      application.database.run(
        sql`
          delete from "userSessions"
          where
            "id" != ${request.state.userSession.id} and
            "user" = ${request.state.user.id};
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
              subject: "Password changed",
              html: html`
                <p>
                  Someone changed the password for an account on Courselore with
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
      response.setFlash(html`
        <div class="flash--green">Password updated successfully.</div>
      `);
      response.redirect("/settings");
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/settings/two-factor-authentication",
    handler: async (
      request: serverTypes.Request<
        {},
        { redirect: string },
        {},
        { passwordConfirmation: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true
      )
        return;
      if (
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.length < 8
      )
        throw "validation";
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        !(await argon2.verify(
          request.state.user.password!,
          request.body.passwordConfirmation,
          application.privateConfiguration.argon2,
        ))
      ) {
        response.setFlash(html`
          <div class="flash--red">Invalid “Password confirmation”.</div>
        `);
        response.redirect(request.search.redirect ?? "/settings");
        return;
      }
      request.state.user.twoFactorAuthenticationSecret =
        new OTPAuth.Secret().base32;
      request.state.user.twoFactorAuthenticationRecoveryCodes = JSON.stringify(
        Array.from({ length: 10 }, () =>
          cryptoRandomString({ length: 10, type: "numeric" }),
        ),
      );
      application.database.run(
        sql`
          update "users"
          set
            "twoFactorAuthenticationSecret" = ${request.state.user.twoFactorAuthenticationSecret},
            "twoFactorAuthenticationRecoveryCodes" = ${request.state.user.twoFactorAuthenticationRecoveryCodes}
          where "id" = ${request.state.user.id};
        `,
      );
      response.redirect(
        `/settings/two-factor-authentication${request.URL.search}`,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/settings/two-factor-authentication",
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
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true ||
        typeof request.state.user.twoFactorAuthenticationSecret !== "string" ||
        typeof request.state.user.twoFactorAuthenticationRecoveryCodes !==
          "string"
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
              <p>
                Take note of the recovery codes below. They are only shown to
                you now, and you will need one of them to access your account in
                case you lose your method of two-factor authentication, for
                example, if you lose your phone.
              </p>
              <ul
                css="${css`
                  font-family:
                    "Roboto Mono Variable", var(--font-family--monospace);
                  columns: 2;
                `}"
              >
                $${JSON.parse(
                  request.state.user.twoFactorAuthenticationRecoveryCodes,
                ).map(
                  (twoFactorAuthenticationRecoveryCode: string) =>
                    html`<li>${twoFactorAuthenticationRecoveryCode}</li>`,
                )}
              </ul>
              <hr class="separator" />
              <p>
                Scan the following QR code with your two-factor authentication
                application on your phone, for example, Google Authenticator.
              </p>
              <div
                css="${css`
                  display: flex;
                  justify-content: center;
                `}"
              >
                <div
                  css="${css`
                    max-width: var(--size--48);
                    width: 100%;
                  `}"
                >
                  $${(
                    await QRCode.toString(
                      new OTPAuth.TOTP({
                        issuer: `Courselore (${application.configuration.hostname})`,
                        label: request.state.user.email,
                        secret:
                          request.state.user.twoFactorAuthenticationSecret,
                      }).toString(),
                      { type: "svg", margin: 0 },
                    )
                  )
                    .replace("#000000", "currentColor")
                    .replace("#ffffff", "transparent")}
                </div>
              </div>
              <hr class="separator" />
              <p>
                Provide a code generated from your two-factor authentication
                application.
              </p>
              <div
                type="form"
                method="POST"
                action="/settings/two-factor-authentication/enable${request.URL
                  .search}"
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
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: "/settings/two-factor-authentication/enable",
    handler: async (
      request: serverTypes.Request<
        {},
        { redirect: string },
        {},
        { twoFactorAuthenticationConfirmation: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true ||
        typeof request.state.user.twoFactorAuthenticationSecret !== "string" ||
        typeof request.state.user.twoFactorAuthenticationRecoveryCodes !==
          "string"
      )
        return;
      if (
        typeof request.body.twoFactorAuthenticationConfirmation !== "string" ||
        request.body.twoFactorAuthenticationConfirmation.length < 6
      )
        throw "validation";
      if (
        typeof request.search.redirect === "string" &&
        !request.search.redirect.startsWith("/")
      )
        delete request.search.redirect;
      if (
        new OTPAuth.TOTP({
          secret: request.state.user.twoFactorAuthenticationSecret,
        }).validate({
          token: request.body.twoFactorAuthenticationConfirmation,
        }) === null
      ) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid “Two-factor authentication code”.
          </div>
        `);
        response.redirect(
          `/settings/two-factor-authentication${request.URL.search}`,
        );
        return;
      }
      request.state.user.twoFactorAuthenticationEnabled = Number(true);
      request.state.user.twoFactorAuthenticationRecoveryCodes = JSON.stringify(
        await Promise.all(
          JSON.parse(
            request.state.user.twoFactorAuthenticationRecoveryCodes,
          ).map((twoFactorAuthenticationRecoveryCode: string) =>
            argon2.hash(
              twoFactorAuthenticationRecoveryCode,
              application.privateConfiguration.argon2,
            ),
          ),
        ),
      );
      application.database.run(
        sql`
          update "users"
          set
            "twoFactorAuthenticationEnabled" = ${request.state.user.twoFactorAuthenticationEnabled},
            "twoFactorAuthenticationRecoveryCodes" = ${request.state.user.twoFactorAuthenticationRecoveryCodes}
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">
          Two-factor authentication enabled successfully.
        </div>
      `);
      response.redirect(request.search.redirect ?? "/settings");
    },
  });

  application.server?.push({
    method: "DELETE",
    pathname: "/settings/two-factor-authentication",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          passwordConfirmation: string;
          twoFactorAuthenticationConfirmation: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === false ||
        typeof request.state.user.twoFactorAuthenticationSecret !== "string" ||
        typeof request.state.user.twoFactorAuthenticationRecoveryCodes !==
          "string"
      )
        return;
      if (
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.length < 8 ||
        typeof request.body.twoFactorAuthenticationConfirmation !== "string" ||
        request.body.twoFactorAuthenticationConfirmation.length < 6
      )
        throw "validation";
      const passwordConfirmationVerify = await argon2.verify(
        request.state.user.password!,
        request.body.passwordConfirmation,
        application.privateConfiguration.argon2,
      );
      const twoFactorAuthenticationValidate =
        new OTPAuth.TOTP({
          secret: request.state.user.twoFactorAuthenticationSecret,
        }).validate({
          token: request.body.twoFactorAuthenticationConfirmation,
        }) !== null;
      if (!passwordConfirmationVerify || !twoFactorAuthenticationValidate) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid “Password confirmation” or “Two-factor authentication code”.
          </div>
        `);
        response.redirect("/settings");
        return;
      }
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
          Two-factor authentication disabled successfully.
        </div>
      `);
      response.redirect("/settings");
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: "/settings/email-notifications",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          emailNotificationsForAllMessages: "on";
          emailNotificationsForMessagesIncludingMentions: "on";
          emailNotificationsForMessagesInConversationsInWhichYouParticipated: "on";
          emailNotificationsForMessagesInConversationsThatYouStarted: "on";
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      application.database.run(
        sql`
          update "users"
          set
            "emailNotificationsForAllMessages" = ${Number(request.body.emailNotificationsForAllMessages === "on")},
            "emailNotificationsForMessagesIncludingMentions" = ${Number(request.body.emailNotificationsForMessagesIncludingMentions === "on")},
            "emailNotificationsForMessagesInConversationsInWhichYouParticipated" = ${Number(request.body.emailNotificationsForMessagesInConversationsInWhichYouParticipated === "on")},
            "emailNotificationsForMessagesInConversationsThatYouStarted" = ${Number(request.body.emailNotificationsForMessagesInConversationsThatYouStarted === "on")}
          where "id" = ${request.state.user.id};
        `,
      );
      response.setFlash(html`
        <div class="flash--green">Email notification updated successfully.</div>
      `);
      response.redirect("/settings");
    },
  });

  application.server?.push({
    method: "DELETE",
    pathname: "/settings/delete-my-account",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          passwordConfirmation: string;
          twoFactorAuthenticationConfirmation: string;
        },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (
        typeof request.body.passwordConfirmation !== "string" ||
        request.body.passwordConfirmation.length < 8 ||
        (Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
          (typeof request.body.twoFactorAuthenticationConfirmation !==
            "string" ||
            request.body.twoFactorAuthenticationConfirmation.length < 6))
      )
        throw "validation";
      const passwordConfirmationVerify = await argon2.verify(
        request.state.user.password!,
        request.body.passwordConfirmation,
        application.privateConfiguration.argon2,
      );
      const twoFactorAuthenticationValidate =
        Boolean(request.state.user.twoFactorAuthenticationEnabled) === true &&
        typeof request.state.user.twoFactorAuthenticationSecret === "string" &&
        typeof request.body.twoFactorAuthenticationConfirmation === "string"
          ? new OTPAuth.TOTP({
              secret: request.state.user.twoFactorAuthenticationSecret,
            }).validate({
              token: request.body.twoFactorAuthenticationConfirmation,
            }) !== null
          : true;
      if (!passwordConfirmationVerify || !twoFactorAuthenticationValidate) {
        response.setFlash(html`
          <div class="flash--red">
            Invalid “Password
            confirmation”${Boolean(
              request.state.user.twoFactorAuthenticationEnabled,
            ) === true
              ? " or “Two-factor authentication code”"
              : ""}.
          </div>
        `);
        response.redirect("/settings");
        return;
      }
      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            update "users"
            set "mostRecentlyVisitedCourseParticipation" = null
            where "id" = ${request.state.user!.id};
          `,
        );
        for (const courseParticipation of application.database.all<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseParticipations"
            where "user" = ${request.state.user!.id}
            order by "id" asc;
          `,
        )) {
          application.database.run(
            sql`
              delete from "courseConversationParticipations" where "courseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              delete from "courseConversationMessageDrafts" where "createdByCourseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              update "courseConversationMessages"
              set "createdByCourseParticipation" = null
              where "createdByCourseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              update "courseConversationMessageViews"
              set "courseParticipation" = null
              where "courseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              update "courseConversationMessageLikes"
              set "courseParticipation" = null
              where "courseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              delete from "courseConversationMessageEmailNotificationDeliveries" where "courseParticipation" = ${courseParticipation.id};
            `,
          );
          application.database.run(
            sql`
              delete from "courseParticipations" where "id" = ${courseParticipation.id};
            `,
          );
        }
        application.database.run(
          sql`
            delete from "userSessions" where "user" = ${request.state.user!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "users" where "id" = ${request.state.user!.id};
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
                to: request.state.user!.email,
                subject: "Account deleted",
                html: html`
                  <p>
                    Someone deleted the account on Courselore with the following
                    email address:
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
      });
      response.setFlash(html`
        <div class="flash--green">Account deleted.</div>
      `);
      response.redirect("/");
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
                translate: 40% 40%;
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
