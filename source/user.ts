import path from "node:path";
import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import filenamify from "filenamify";
import cryptoRandomString from "crypto-random-string";
import sharp from "sharp";
import argon2 from "argon2";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  IsEnrolledInCourseMiddlewareLocals,
  AuthorEnrollment,
  AuthorEnrollmentUser,
} from "./index.js";

export type UserAvatarlessBackgroundColor =
  typeof userAvatarlessBackgroundColors[number];
export const userAvatarlessBackgroundColors = [
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
] as const;

export type UserEmailNotificationsDigestsFrequency =
  typeof userEmailNotificationsDigestsFrequencies[number];
export const userEmailNotificationsDigestsFrequencies = [
  "hourly",
  "daily",
] as const;

export type UserPartial = ({
  req,
  res,
  enrollment,
  user,
  anonymous,
  avatar,
  decorate,
  name,
  tooltip,
  size,
}: {
  req: express.Request<
    {},
    any,
    {},
    {},
    BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  res: express.Response<
    any,
    BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  enrollment?: AuthorEnrollment;
  user?: AuthorEnrollmentUser | "no-longer-enrolled";
  anonymous?: boolean | "reveal";
  avatar?: boolean;
  decorate?: boolean;
  name?: boolean | string;
  tooltip?: boolean;
  size?: "xs" | "sm" | "xl";
}) => HTML;

export type UserSettingsLayout = ({
  req,
  res,
  head,
  body,
}: {
  req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
  res: express.Response<any, IsSignedInMiddlewareLocals>;
  head: HTML;
  body: HTML;
}) => HTML;

export default (app: Courselore): void => {
  app.locals.partials.user = ({
    req,
    res,
    enrollment = undefined,
    user = enrollment === undefined
      ? undefined
      : enrollment === "no-longer-enrolled"
      ? "no-longer-enrolled"
      : enrollment.user,
    anonymous = user === undefined,
    avatar = true,
    decorate = user !== undefined,
    name = true,
    tooltip = name !== false,
    size = "sm",
  }) => {
    let userAvatar: HTML | undefined;
    let userName: HTML | undefined;

    if (anonymous !== true && user !== undefined) {
      if (avatar) {
        userAvatar =
          user === "no-longer-enrolled"
            ? html`<svg
                viewBox="0 0 24 24"
                css="${res.locals.css(css`
                  color: var(--color--rose--700);
                  background-color: var(--color--rose--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--rose--200);
                    background-color: var(--color--rose--700);
                  }
                  ${{
                    xs: css`
                      width: var(--space--4);
                      height: var(--space--4);
                      vertical-align: var(--space---1);
                    `,
                    sm: css`
                      width: var(--space--6);
                      height: var(--space--6);
                      vertical-align: var(--space---1-5);
                    `,
                    xl: css`
                      width: var(--space--32);
                      height: var(--space--32);
                    `,
                  }[size]}
                  border-radius: var(--border-radius--circle);
                `)}"
              >
                <foreignObject x="2" y="-2" width="24" height="24">
                  <span
                    css="${res.locals.css(css`
                      font-size: var(--font-size--xl);
                      line-height: var(--line-height--xl);
                    `)}"
                  >
                    <i class="bi bi-emoji-smile-upside-down"></i>
                  </span>
                </foreignObject>
              </svg>`
            : user.avatar !== null
            ? html`<img
                src="${user.avatar}"
                alt="${user.name}"
                loading="lazy"
                css="${res.locals.css(css`
                  ${{
                    xs: css`
                      width: var(--space--4);
                      height: var(--space--4);
                      vertical-align: var(--space---1);
                    `,
                    sm: css`
                      width: var(--space--6);
                      height: var(--space--6);
                      vertical-align: var(--space---1-5);
                    `,
                    xl: css`
                      width: var(--space--32);
                      height: var(--space--32);
                    `,
                  }[size]}
                  border-radius: var(--border-radius--circle);
                  @media (prefers-color-scheme: dark) {
                    filter: brightness(var(--brightness--90));
                  }
                `)}"
              />`
            : html`<svg
                viewBox="0 0 24 24"
                css="${res.locals.css(css`
                  color: var(--color--${user.avatarlessBackgroundColor}--700);
                  background-color: var(
                    --color--${user.avatarlessBackgroundColor}--200
                  );
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--${user.avatarlessBackgroundColor}--200);
                    background-color: var(
                      --color--${user.avatarlessBackgroundColor}--700
                    );
                  }
                  ${{
                    xs: css`
                      width: var(--space--4);
                      height: var(--space--4);
                      vertical-align: var(--space---1);
                    `,
                    sm: css`
                      width: var(--space--6);
                      height: var(--space--6);
                      vertical-align: var(--space---1-5);
                    `,
                    xl: css`
                      width: var(--space--32);
                      height: var(--space--32);
                    `,
                  }[size]}
                  border-radius: var(--border-radius--circle);
                `)}"
              >
                <text
                  x="12"
                  y="16"
                  text-anchor="middle"
                  css="${res.locals.css(css`
                    font-size: var(--font-size--2xs);
                    line-height: var(--line-height--2xs);
                    font-weight: var(--font-weight--black);
                    fill: currentColor;
                  `)}"
                >
                  ${(() => {
                    const nameParts = user.name.split(/\s+/);
                    return `${nameParts[0][0]}${
                      nameParts.length > 0
                        ? nameParts[nameParts.length - 1][0]
                        : ""
                    }`.toUpperCase();
                  })()}
                </text>
              </svg>`;

        if (decorate && user !== "no-longer-enrolled")
          userAvatar = html`<span
            css="${res.locals.css(css`
              display: inline-grid;
              & > * {
                grid-area: 1 / 1;
                position: relative;
              }
              ${{
                xs: css`
                  vertical-align: var(--space---1);
                `,
                sm: css`
                  vertical-align: var(--space---1-5);
                `,
                xl: css``,
              }[size]}
            `)}"
          >
            $${userAvatar}
            <span
              hidden
              css="${res.locals.css(css`
                background-color: var(--color--green--500);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--green--600);
                }
                ${{
                  xs: css`
                    width: var(--space--1);
                    height: var(--space--1);
                  `,
                  sm: css`
                    width: var(--space--1-5);
                    height: var(--space--1-5);
                  `,
                  xl: css`
                    width: var(--space--3);
                    height: var(--space--3);
                    transform: translate(-100%, -100%);
                  `,
                }[size]}
                border-radius: var(--border-radius--circle);
                place-self: end;
              `)}"
              onload="${javascript`
                const element = this;

                (element.tooltip ??= tippy(element)).setProps({
                  touch: false,
                  content: "Online",
                });

                window.clearTimeout(element.updateTimeout);
                (function update() {
                  if (!leafac.isConnected(element)) return;
                  element.hidden = Date.now() - ${new Date(
                    user.lastSeenOnlineAt
                  ).getTime()} > 5 * 60 * 1000;
                  element.updateTimeout = window.setTimeout(update, 60 * 1000);
                })();
              `}"
            ></span>
          </span>`;
      }

      if (name !== false)
        userName = html`<span
          css="${res.locals.css(css`
            font-weight: var(--font-weight--bold);
          `)}"
          >$${name === true
            ? html`${user === "no-longer-enrolled"
                ? "No Longer Enrolled"
                : user.name}`
            : name}$${enrollment !== undefined &&
          enrollment !== "no-longer-enrolled" &&
          enrollment.role === "staff"
            ? html`<span
                class="text--sky"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: "Staff",
                  });
                `}"
                >  <i class="bi bi-mortarboard-fill"></i
              ></span>`
            : html``}</span
        >`;
    }

    let userHTML =
      userAvatar !== undefined && userName !== undefined
        ? html`<span>$${userAvatar}  $${userName}</span>`
        : userAvatar !== undefined
        ? userAvatar
        : userName !== undefined
        ? userName
        : undefined;

    if (tooltip && userHTML !== undefined)
      userHTML = html`<span
        onload="${javascript`
          (this.tooltip ??= tippy(this)).setProps({
            interactive: true,
            appendTo: document.querySelector("body"),
            delay: [1000, null],
            touch: ["hold", 1000],
            content: ${res.locals.html(
              html`
                <div
                  css="${res.locals.css(css`
                    max-height: var(--space--56);
                    padding: var(--space--1) var(--space--2);
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  <div
                    css="${res.locals.css(css`
                      display: flex;
                      gap: var(--space--4);
                      align-items: center;
                    `)}"
                  >
                    <div>
                      $${app.locals.partials.user({
                        req,
                        res,
                        enrollment,
                        user,
                        name: false,
                        size: "xl",
                      })}
                    </div>
                    <div
                      css="${res.locals.css(css`
                        padding-top: var(--space--0-5);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div>
                        <div class="strong">
                          ${user === "no-longer-enrolled"
                            ? "No Longer Enrolled"
                            : user!.name}
                        </div>
                        $${user !== "no-longer-enrolled" &&
                        (res.locals.enrollment?.role === "staff" ||
                          res.locals.user?.id === user!.id)
                          ? html`
                              <div class="secondary">
                                <span
                                  css="${res.locals.css(css`
                                    margin-right: var(--space--2);
                                  `)}"
                                >
                                  ${user!.email}
                                </span>
                                <button
                                  class="button button--tight button--tight--inline button--transparent"
                                  css="${res.locals.css(css`
                                    font-size: var(--font-size--xs);
                                    line-height: var(--line-height--xs);
                                    display: inline-flex;
                                  `)}"
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Copy Email",
                                    });
                                    (this.copied ??= tippy(this)).setProps({
                                      theme: "green",
                                      trigger: "manual",
                                      content: "Copied",
                                    });

                                    this.onclick = async () => {
                                      await navigator.clipboard.writeText(${JSON.stringify(
                                        user!.email
                                      )});
                                      this.copied.show();
                                      await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                      this.copied.hide();
                                    };
                                  `}"
                                >
                                  <i class="bi bi-stickies"></i>
                                </button>
                              </div>
                            `
                          : html``}
                        $${user === "no-longer-enrolled"
                          ? html`
                              <div class="secondary">
                                This person has left the course.
                              </div>
                            `
                          : html`
                              <div
                                class="secondary"
                                css="${res.locals.css(css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `)}"
                              >
                                <span>
                                  Last seen online
                                  <time
                                    datetime="${new Date(
                                      user!.lastSeenOnlineAt
                                    ).toISOString()}"
                                    onload="${javascript`
                                      leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                    `}"
                                  ></time>
                                </span>
                              </div>
                            `}
                        $${enrollment !== undefined &&
                        enrollment !== "no-longer-enrolled" &&
                        enrollment.role === "staff"
                          ? html`
                              <div
                                class="text--sky"
                                css="${res.locals.css(css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                  display: flex;
                                  gap: var(--space--2);
                                `)}"
                              >
                                <i class="bi bi-mortarboard-fill"></i>
                                Staff
                              </div>
                            `
                          : html``}
                      </div>
                    </div>
                  </div>
                  $${user !== "no-longer-enrolled" &&
                  user!.biographyPreprocessed !== null
                    ? app.locals.partials.content({
                        req,
                        res,
                        type: "preprocessed",
                        content: user!.biographyPreprocessed,
                      }).processed
                    : html``}
                </div>
              `
            )},
          });
        `}"
        >$${userHTML}</span
      >`;

    let anonymousAvatar: HTML | undefined;
    let anonymousName: HTML | undefined;

    if (anonymous !== false) {
      if (avatar)
        anonymousAvatar = html`<svg
          viewBox="0 0 24 24"
          css="${res.locals.css(css`
            color: var(--color--violet--700);
            background-color: var(--color--violet--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--violet--200);
              background-color: var(--color--violet--700);
            }
            ${{
              xs: css`
                width: var(--space--4);
                height: var(--space--4);
                vertical-align: var(--space---1);
              `,
              sm: css`
                width: var(--space--6);
                height: var(--space--6);
                vertical-align: var(--space---1-5);
              `,
              xl: css`
                width: var(--space--32);
                height: var(--space--32);
              `,
            }[size]}
            border-radius: var(--border-radius--circle);
          `)}"
        >
          <foreignObject x="2" y="-2" width="24" height="24">
            <span
              css="${res.locals.css(css`
                font-size: var(--font-size--xl);
                line-height: var(--line-height--xl);
              `)}"
            >
              <i class="bi bi-sunglasses"></i>
            </span>
          </foreignObject>
        </svg>`;

      if (name !== false)
        anonymousName = html`<span
          css="${res.locals.css(css`
            font-weight: var(--font-weight--bold);
          `)}"
          >Anonymous</span
        >`;
    }

    let anonymousHTML =
      anonymousAvatar !== undefined && anonymousName !== undefined
        ? html`<span>$${anonymousAvatar}  $${anonymousName}</span>`
        : anonymousAvatar !== undefined
        ? anonymousAvatar
        : anonymousName !== undefined
        ? anonymousName
        : undefined;

    if (tooltip && anonymousHTML !== undefined)
      anonymousHTML = html`<span
        onload="${javascript`
          (this.tooltip ??= tippy(this)).setProps({
            touch: false,
            content: "Anonymous to Other Students",
          });
        `}"
        >$${anonymousHTML}</span
      >`;

    return userHTML !== undefined && anonymousHTML !== undefined
      ? html`<span
          key="partial--user--${user === "no-longer-enrolled"
            ? "no-longer-enrolled"
            : user!.reference}"
          >$${anonymousHTML} ($${userHTML})</span
        >`
      : userHTML !== undefined
      ? html`<span
          key="partial--user--${user === "no-longer-enrolled"
            ? "no-longer-enrolled"
            : user!.reference}"
          >$${userHTML}</span
        >`
      : anonymousHTML !== undefined
      ? html`<span key="partial--user--anonymous">$${anonymousHTML}</span>`
      : html``;
  };

  app.locals.layouts.userSettings = ({ req, res, head, body }) =>
    app.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        User Settings
      `,
      menu: html`
        <a
          href="${app.locals.options.baseURL}/settings/profile"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/profile"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-person-circle"></i>
          Profile
        </a>
        <a
          href="${app.locals.options.baseURL}/settings/email-and-password"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/email-and-password"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/settings/email-and-password")
              ? "bi-key-fill"
              : "bi-key"}"
          ></i>
          Email & Password
        </a>
        <a
          href="${app.locals.options.baseURL}/settings/notifications"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/notifications"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.endsWith("/settings/notifications")
              ? "bi-bell-fill"
              : "bi-bell"}"
          ></i>
          Notifications
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.redirect(303, `${app.locals.options.baseURL}/settings/profile`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.userSettings({
          req,
          res,
          head: html`<title>Profile · User Settings · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-person-circle"></i>
              Profile
            </h2>

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/settings/profile"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                css="${res.locals.css(css`
                  display: flex;
                  gap: var(--space--4);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `)}"
              >
                <div
                  class="avatar-chooser"
                  css="${res.locals.css(css`
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    & > * {
                      width: var(--space--32);
                      height: var(--space--32);
                    }
                  `)}"
                  onload="${javascript`
                    this.ondragover = (event) => {
                      event.preventDefault();
                    };

                    this.ondrop = (event) => {
                      event.preventDefault();
                      this.querySelector(".avatar-chooser--upload").upload(event.dataTransfer.files);
                    };
                  `}"
                >
                  <div
                    class="avatar-chooser--empty"
                    $${res.locals.user.avatar === null ? html`` : html`hidden`}
                  >
                    <button
                      type="button"
                      class="button button--transparent"
                      css="${res.locals.css(css`
                        transform: scale(8)
                          translate(
                            calc(var(--space---px) + 50% + var(--space---px)),
                            calc(var(--space---px) + 50% + var(--space---px))
                          );
                        padding: var(--space--px);
                        margin: var(--space---px);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Add Avatar",
                        });
                        
                        this.onclick = () => {
                          this.closest("form").querySelector(".avatar-chooser--upload").click();
                        };
                      `}"
                    >
                      $${app.locals.partials.user({
                        req,
                        res,
                        user: { ...res.locals.user, avatar: null },
                        decorate: false,
                        name: false,
                        size: "xs",
                      })}
                    </button>
                  </div>
                  <div
                    $${res.locals.user.avatar === null ? html`hidden` : html``}
                    class="avatar-chooser--filled"
                    css="${res.locals.css(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                        position: relative;
                      }
                    `)}"
                  >
                    <button
                      type="button"
                      class="button button--transparent"
                      css="${res.locals.css(css`
                        padding: var(--space--2);
                        margin: var(--space---2);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Update Avatar",
                        });
                        
                        this.onclick = () => {
                          this.closest("form").querySelector(".avatar-chooser--upload").click();
                        };
                      `}"
                    >
                      <img
                        src="${res.locals.user.avatar ?? ""}"
                        alt="Avatar"
                        loading="lazy"
                        css="${res.locals.css(css`
                          width: 100%;
                          height: 100%;
                          border-radius: var(--border-radius--circle);
                        `)}"
                      />
                    </button>
                    <button
                      type="button"
                      class="button button--rose"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        place-self: end;
                        width: var(--font-size--2xl);
                        height: var(--font-size--2xl);
                        padding: var(--space--0);
                        border-radius: var(--border-radius--circle);
                        transform: translate(-20%, -20%);
                        align-items: center;
                      `)}"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          theme: "rose",
                          touch: false,
                          content: "Remove Avatar",
                        });
                        
                        this.onclick = () => {
                          const form = this.closest("form");
                          const avatar = form.querySelector('[name="avatar"]')
                          avatar.value = "";
                          form.querySelector(".avatar-chooser--empty").hidden = false;
                          form.querySelector(".avatar-chooser--filled").hidden = true;
                        };
                      `}"
                    >
                      <i class="bi bi-trash-fill"></i>
                    </button>
                  </div>
                  <input
                    type="file"
                    class="avatar-chooser--upload"
                    accept="image/*"
                    hidden
                    onload="${javascript`
                      this.isModified = false;

                      const avatarChooser = this.closest(".avatar-chooser");
                      const avatar = avatarChooser.querySelector('[name="avatar"]');
                      const avatarEmpty = avatarChooser.querySelector(".avatar-chooser--empty");
                      const avatarFilled = avatarChooser.querySelector(".avatar-chooser--filled");

                      (avatarChooser.uploadingIndicator ??= tippy(avatarChooser)).setProps({
                        trigger: "manual",
                        hideOnClick: false,
                        content: ${res.locals.html(
                          html`
                            <div
                              css="${res.locals.css(css`
                                display: flex;
                                gap: var(--space--2);
                              `)}"
                            >
                              $${app.locals.partials.spinner({ req, res })}
                              Uploading…
                            </div>
                          `
                        )},
                      });

                      (avatarChooser.uploadingError ??= tippy(avatarChooser)).setProps({
                        theme: "rose",
                        trigger: "manual",
                      });

                      this.upload = async (fileList) => {
                        const body = new FormData();
                        body.append("_csrf", ${JSON.stringify(
                          req.csrfToken()
                        )});
                        body.append("avatar", fileList[0]);
                        this.value = "";
                        tippy.hideAll();
                        avatarChooser.uploadingIndicator.show();
                        const response = await fetch("${
                          app.locals.options.baseURL
                        }/settings/profile/avatar", {
                          method: "POST",
                          body,
                        });
                        avatarChooser.uploadingIndicator.hide();
                        if (!response.ok) {
                          avatarChooser.uploadingError.setContent(await response.text());
                          avatarChooser.uploadingError.show();
                          return;
                        }
                        const avatarURL = await response.text();
                        avatar.value = avatarURL;
                        avatarEmpty.hidden = true;
                        avatarFilled.hidden = false;
                        avatarFilled.querySelector("img").setAttribute("src", avatarURL);
                      };

                      this.onchange = () => {
                        this.upload(this.files);
                      };
                    `}"
                  />
                  <input
                    type="text"
                    name="avatar"
                    value="${res.locals.user.avatar ?? ""}"
                    hidden
                  />
                </div>

                <div
                  css="${res.locals.css(css`
                    flex: 1;
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
                      value="${res.locals.user.name}"
                      required
                      class="input--text"
                    />
                  </label>
                </div>
              </div>

              <div class="label">
                <p class="label--text">Biography</p>
                $${app.locals.partials.contentEditor({
                  req,
                  res,
                  name: "biography",
                  contentSource: res.locals.user.biographySource ?? "",
                  required: false,
                })}
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Profile
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    { name?: string; avatar?: string; biography?: string },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/profile",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        typeof req.body.avatar !== "string" ||
        typeof req.body.biography !== "string"
      )
        return next("validation");
      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "name" = ${req.body.name},
              "nameSearch" = ${html`${req.body.name}`},
              "avatar" = ${
                req.body.avatar.trim() === "" ? null : req.body.avatar
              },
              "biographySource" = ${
                req.body.biography.trim() === "" ? null : req.body.biography
              },
              "biographyPreprocessed" = ${
                req.body.biography.trim() === ""
                  ? null
                  : app.locals.partials.content({
                      req,
                      res,
                      type: "source",
                      content: req.body.biography,
                    }).preprocessed
              }
          WHERE "id" = ${res.locals.user.id}
        `
      );
      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Profile updated successfully.`,
      });
      res.redirect(303, `${app.locals.options.baseURL}/settings/profile`);
    }
  );

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile/avatar",
    asyncHandler(async (req, res, next) => {
      if (req.files?.avatar === undefined || Array.isArray(req.files.avatar))
        return next("validation");
      if (!req.files.avatar.mimetype.startsWith("image/"))
        return res.status(413).send("The avatar must be an image.");
      if (req.files.avatar.truncated)
        return res.status(413).send("The avatar must be smaller than 10MB.");
      const name = filenamify(req.files.avatar.name, { replacement: "-" });
      if (name.trim() === "") return next("validation");
      const folder = cryptoRandomString({
        length: 20,
        type: "numeric",
      });
      await req.files.avatar.mv(
        path.join(app.locals.options.dataDirectory, `files/${folder}/${name}`)
      );
      const ext = path.extname(name);
      const nameAvatar = `${name.slice(
        0,
        name.length - ext.length
      )}--avatar${ext}`;
      try {
        await sharp(req.files.avatar.data, { limitInputPixels: false })
          .rotate()
          .resize({
            width: 256 /* var(--space--64) */,
            height: 256 /* var(--space--64) */,
            position: sharp.strategy.attention,
          })
          .toFile(
            path.join(
              app.locals.options.dataDirectory,
              `files/${folder}/${nameAvatar}`
            )
          );
      } catch (error) {
        return next("validation");
      }
      res.send(
        `${app.locals.options.baseURL}/files/${folder}/${encodeURIComponent(
          nameAvatar
        )}`
      );
    }),
    ((err, req, res, next) => {
      if (err === "validation")
        return res
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${app.locals.options.administratorEmail}.`
          );
      next(err);
    }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/email-and-password",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.userSettings({
          req,
          res,
          head: html`<title>
            Email & Password · User Settings · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-key"></i>
              Email & Password
            </h2>

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/settings/email-and-password"
              novalidate
              css="${res.locals.css(css`
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
                  name="currentPassword"
                  required
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${res.locals.user.email}"
                  required
                  class="input--text"
                />
              </label>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Email
                </button>
              </div>
            </form>

            <hr class="separator" />

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/settings/email-and-password"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Current Password</p>
                <input
                  type="password"
                  name="currentPassword"
                  required
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">New Password</p>
                <input
                  type="password"
                  name="newPassword"
                  required
                  minlength="8"
                  class="input--text"
                />
              </label>
              <label class="label">
                <p class="label--text">New Password Confirmation</p>
                <input
                  type="password"
                  required
                  class="input--text"
                  onload="${javascript`
                    this.onvalidate = (event) => {
                      if (this.value !== this.closest("form").querySelector('[name="newPassword"]').value)
                        return "New Password & New Password Confirmation don’t match.";
                    };
                  `}"
                />
              </label>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Password
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    { email?: string; currentPassword?: string; newPassword?: string },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/email-and-password",
    ...app.locals.middlewares.isSignedIn,
    asyncHandler(async (req, res, next) => {
      if (
        typeof req.body.currentPassword !== "string" ||
        req.body.currentPassword.trim() === ""
      )
        return next("validation");

      if (
        !(await argon2.verify(
          res.locals.user.password,
          req.body.currentPassword
        ))
      ) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`Incorrect password.`,
        });
        return res.redirect(
          303,
          `${app.locals.options.baseURL}/settings/email-and-password`
        );
      }

      if (typeof req.body.email === "string") {
        if (req.body.email.match(app.locals.helpers.emailRegExp) === null)
          return next("validation");
        if (
          app.locals.database.get<{}>(
            sql`
              SELECT TRUE FROM "users" WHERE "email" = ${req.body.email}
            `
          ) !== undefined
        ) {
          app.locals.helpers.Flash.set({
            req,
            res,
            theme: "rose",
            content: html`Email already taken.`,
          });
          return res.redirect(
            303,
            `${app.locals.options.baseURL}/settings/email-and-password`
          );
        }

        app.locals.database.run(
          sql`
            UPDATE "users"
            SET "email" = ${req.body.email},
                "emailVerifiedAt" = ${null}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        app.locals.mailers.emailVerification({
          req,
          res,
          userId: res.locals.user.id,
          userEmail: req.body.email,
        });
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Email updated successfully.`,
        });
      }

      if (typeof req.body.newPassword === "string") {
        if (
          req.body.newPassword.trim() === "" ||
          req.body.newPassword.length < 8
        )
          return next("validation");

        app.locals.database.run(
          sql`
            UPDATE "users"
            SET "password" =  ${await argon2.hash(
              req.body.newPassword,
              app.locals.options.argon2
            )}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        app.locals.helpers.Session.closeAllAndReopen({
          req,
          res,
          userId: res.locals.user.id,
        });
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Password updated successfully.`,
        });
      }

      res.redirect(
        303,
        `${app.locals.options.baseURL}/settings/email-and-password`
      );
    })
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/notifications",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.userSettings({
          req,
          res,
          head: html`<title>Notifications · User Settings · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-bell"></i>
              Notifications
            </h2>

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/settings/notifications"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />

              <div key="emailNotificationsFor" class="label">
                <p class="label--text">Email Notifications</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="checkbox"
                      name="emailNotificationsForAllMessages"
                      $${"TODO" && false ? html`checked` : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (this.checked)
                            for (const element of this.closest('[key="emailNotificationsFor"]').querySelectorAll("input"))
                              element.checked = true;
                          const emailNotificationsDigestsDisabled = [...this.closest('[key="emailNotificationsFor"]').querySelectorAll("input")].every((element) => element.disabled || !element.checked);
                          const emailNotificationsDigestsFrequencyDisabled = !this.closest("form").querySelector('[name="emailNotificationsDigests"][value="true"]').checked;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] input'))
                            element.disabled = emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled);
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] .button'))
                            element.classList[emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled) ? "add" : "remove"]("disabled");
                        };
                      `}"
                    />
                    All messages
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="checkbox"
                      name="emailNotificationsForMentions"
                      $${"TODO" ? html`checked` : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (!this.checked) this.closest("form").querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                          const emailNotificationsDigestsDisabled = [...this.closest('[key="emailNotificationsFor"]').querySelectorAll("input")].every((element) => element.disabled || !element.checked);
                          const emailNotificationsDigestsFrequencyDisabled = !this.closest("form").querySelector('[name="emailNotificationsDigests"][value="true"]').checked;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] input'))
                            element.disabled = emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled);
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] .button'))
                            element.classList[emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled) ? "add" : "remove"]("disabled");
                        };
                      `}"
                    />
                    @mentions
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="checkbox"
                      name="emailNotificationsForMessagesInConversationsInWhichYouParticipated"
                      $${"TODO" ? html`checked` : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          if (!this.checked) form.querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                          if (this.checked) form.querySelector('[name="emailNotificationsForMessagesInConversationsYouStarted"]').checked = true;
                          const emailNotificationsDigestsDisabled = [...this.closest('[key="emailNotificationsFor"]').querySelectorAll("input")].every((element) => element.disabled || !element.checked);
                          const emailNotificationsDigestsFrequencyDisabled = !this.closest("form").querySelector('[name="emailNotificationsDigests"][value="true"]').checked;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] input'))
                            element.disabled = emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled);
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] .button'))
                            element.classList[emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled) ? "add" : "remove"]("disabled");
                        };
                      `}"
                    />
                    Messages in conversations in which you participated
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="checkbox"
                      name="emailNotificationsForMessagesInConversationsYouStarted"
                      $${"TODO" ? html`checked` : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          if (!this.checked) form.querySelector('[name="emailNotificationsForAllMessages"]').checked = false;
                          if (!this.checked) form.querySelector('[name="emailNotificationsForMessagesInConversationsInWhichYouParticipated"]').checked = false;
                          const emailNotificationsDigestsDisabled = [...this.closest('[key="emailNotificationsFor"]').querySelectorAll("input")].every((element) => element.disabled || !element.checked);
                          const emailNotificationsDigestsFrequencyDisabled = !this.closest("form").querySelector('[name="emailNotificationsDigests"][value="true"]').checked;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] input'))
                            element.disabled = emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled);
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigests"] .button'))
                            element.classList[emailNotificationsDigestsDisabled || (element.closest('[key="emailNotificationsDigestsFrequency"]') !== null && emailNotificationsDigestsFrequencyDisabled) ? "add" : "remove"]("disabled");
                        };
                      `}"
                    />
                    Messages in conversations you started
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline disabled"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        content: "You always receive email notifications for important staff announcements.",
                      });
                    `}"
                  >
                    <input
                      type="checkbox"
                      disabled
                      checked
                      class="input--checkbox"
                    />
                    Important staff announcements
                  </label>
                </div>
              </div>

              <div key="emailNotificationsDigests" class="label">
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="radio"
                      name="emailNotificationsDigests"
                      value="false"
                      required
                      $${"TODO" ? html`checked` : html``}
                      class="input--radio"
                      onload="${javascript`
                        this.onchange = () => {
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigestsFrequency"] input'))
                            element.disabled = true;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigestsFrequency"] .button'))
                            element.classList.add("disabled");
                        };
                      `}"
                    />
                    One email notification per message
                  </label>
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${"TODO" &&
                    false
                      ? html`disabled`
                      : html``}"
                  >
                    <input
                      type="radio"
                      name="emailNotificationsDigests"
                      value="true"
                      required
                      $${"TODO" && false ? html`checked` : html``}
                      class="input--radio"
                      onload="${javascript`
                        this.onchange = () => {
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigestsFrequency"] input'))
                            element.disabled = false;
                          for (const element of this.closest("form").querySelectorAll('[key="emailNotificationsDigestsFrequency"] .button'))
                            element.classList.remove("disabled");
                        };
                      `}"
                    />
                    Digests of multiple messages
                  </label>
                </div>
                <div
                  key="emailNotificationsDigestsFrequency"
                  class="label"
                  css="${res.locals.css(css`
                    margin-left: var(--space--6);
                  `)}"
                >
                  <div
                    css="${res.locals.css(css`
                      display: flex;
                    `)}"
                  >
                    <label
                      class="button button--tight button--tight--inline ${"TODO"
                        ? html`disabled`
                        : html``}"
                    >
                      <input
                        type="radio"
                        name="emailNotificationsDigestsFrequency"
                        value="hourly"
                        required
                        $${"TODO" ? html`disabled` : html``}
                        $${"TODO" ? html`checked` : html``}
                        class="input--radio"
                      />
                      Hourly
                    </label>
                  </div>
                  <div
                    css="${res.locals.css(css`
                      display: flex;
                    `)}"
                  >
                    <label
                      class="button button--tight button--tight--inline ${"TODO"
                        ? html`disabled`
                        : html``}"
                    >
                      <input
                        type="radio"
                        name="emailNotificationsDigestsFrequency"
                        value="daily"
                        required
                        $${"TODO" ? html`disabled` : html``}
                        $${"TODO" && false ? html`checked` : html``}
                        class="input--radio"
                      />
                      Daily
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Notifications
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    {},
    any,
    {
      emailNotificationsForAllMessages?: boolean;
      emailNotificationsForMentions?: boolean;
      emailNotificationsForMessagesInConversationsInWhichYouParticipated?: boolean;
      emailNotificationsForMessagesInConversationsYouStarted?: boolean;
      emailNotificationsDigests?: "true" | "false";
      emailNotificationsDigestsFrequency?: UserEmailNotificationsDigestsFrequency;
    },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/notifications",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (
        typeof req.body.emailNotifications !== "string" ||
        !userEmailNotificationses.includes(req.body.emailNotifications)
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "emailNotifications" = ${req.body.emailNotifications}
          WHERE "id" = ${res.locals.user.id}
        `
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Notifications updated successfully.`,
      });

      res.redirect(303, `${app.locals.options.baseURL}/settings/notifications`);
    }
  );
};
