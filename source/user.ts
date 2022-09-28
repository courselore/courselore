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
  HasPasswordConfirmationMiddlewareLocals,
  MaybeEnrollment,
  IsEnrolledInCourseMiddlewareLocals,
} from "./index.js";

export interface User {
  id: number;
  lastSeenOnlineAt: string;
  reference: string;
  email: string;
  name: string;
  avatar: string | null;
  avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
  biographySource: string | null;
  biographyPreprocessed: HTML | null;
}

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

export type UserEmailNotificationsForAllMessages =
  typeof userEmailNotificationsForAllMessageses[number];
export const userEmailNotificationsForAllMessageses = [
  "none",
  "instant",
  "hourly-digests",
  "daily-digests",
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
  bold,
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
  enrollment?: MaybeEnrollment;
  user?: User | "no-longer-enrolled";
  anonymous?: boolean | "reveal";
  avatar?: boolean;
  decorate?: boolean;
  name?: boolean | string;
  tooltip?: boolean;
  size?: "xs" | "sm" | "xl";
  bold?: boolean;
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
    bold = true,
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
          ><span
            css="${res.locals.css(css`
              ${bold
                ? css`
                    font-weight: var(--font-weight--bold);
                  `
                : css``}
            `)}"
            $${name === true && user !== "no-longer-enrolled"
              ? html`
                  data-filterable-phrases="${JSON.stringify(
                    app.locals.helpers.splitFilterablePhrases(user.name)
                  )}"
                `
              : html``}
            >$${name === true
              ? html`${user === "no-longer-enrolled"
                  ? "No Longer Enrolled"
                  : user.name}`
              : name}</span
          >$${enrollment !== undefined &&
          enrollment !== "no-longer-enrolled" &&
          enrollment.courseRole === "staff"
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
                        (res.locals.enrollment?.courseRole === "staff" ||
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
                        enrollment.courseRole === "staff"
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
                        contentPreprocessed: user!.biographyPreprocessed,
                      }).contentProcessed
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
              <i class="bi bi-incognito"></i>
            </span>
          </foreignObject>
        </svg>`;

      if (name !== false)
        anonymousName = html`<span
          css="${res.locals.css(css`
            ${bold
              ? css`
                  font-weight: var(--font-weight--bold);
                `
              : css``}
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

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.redirect(
        303,
        `https://${app.locals.options.hostname}/settings/profile`
      );
    }
  );

  const userSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
    res: express.Response<any, IsSignedInMiddlewareLocals>;
    head: HTML;
    body: HTML;
  }): HTML =>
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
          href="https://${app.locals.options.hostname}/settings/profile"
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/settings\/profile\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-person-circle"></i>
          Profile
        </a>
        <a
          href="https://${app.locals.options
            .hostname}/settings/email-and-password"
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/settings\/email-and-password\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.match(/\/settings\/email-and-password\/?$/i)
              ? "bi-key-fill"
              : "bi-key"}"
          ></i>
          Email & Password
        </a>
        <a
          href="https://${app.locals.options.hostname}/settings/notifications"
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/settings\/notifications\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${req.path.match(/\/settings\/notifications\/?$/i)
              ? "bi-bell-fill"
              : "bi-bell"}"
          ></i>
          Notifications
        </a>
        <a
          hidden
          TODO
          href="https://${app.locals.options.hostname}/settings/account"
          class="dropdown--menu--item menu-box--item button ${req.path.match(
            /\/settings\/account\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-sliders"></i>
          Account
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        userSettingsLayout({
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
              action="https://${app.locals.options.hostname}/settings/profile"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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
                  key="avatar-chooser"
                  css="${res.locals.css(css`
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    & > * {
                      width: var(--space--32);
                      height: var(--space--32);
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                        position: relative;
                        &:first-child {
                          padding: var(--space--2);
                          margin: var(--space---2);
                          border-radius: var(--border-radius--circle);
                          align-items: center;
                        }
                      }
                    }
                  `)}"
                  onload="${javascript`
                    this.ondragover = (event) => {
                      if (!event.dataTransfer.types.includes("Files")) return;
                      event.preventDefault();
                    };

                    this.ondrop = (event) => {
                      if (event.dataTransfer.files.length === 0) return;
                      event.preventDefault();
                      this.querySelector('[key="avatar-chooser--upload"]').upload(event.dataTransfer.files);
                    };
                  `}"
                >
                  <div
                    key="avatar-chooser--empty"
                    $${res.locals.user.avatar === null ? html`` : html`hidden`}
                  >
                    <button
                      type="button"
                      class="button button--transparent"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Add Avatar",
                        });
                        
                        this.onclick = () => {
                          this.closest("form").querySelector('[key="avatar-chooser--upload"]').click();
                        };
                      `}"
                    >
                      <div
                        css="${res.locals.css(css`
                          width: var(--space--4);
                          height: var(--space--4);
                          transform: scale(8);
                          svg {
                            vertical-align: var(--space--0);
                          }
                        `)}"
                      >
                        $${app.locals.partials.user({
                          req,
                          res,
                          user: { ...res.locals.user, avatar: null },
                          decorate: false,
                          name: false,
                          size: "xs",
                        })}
                      </div>
                    </button>
                  </div>
                  <div
                    key="avatar-chooser--filled"
                    $${res.locals.user.avatar === null ? html`hidden` : html``}
                  >
                    <button
                      type="button"
                      class="button button--transparent"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Update Avatar",
                        });
                        
                        this.onclick = () => {
                          this.closest("form").querySelector('[key="avatar-chooser--upload"]').click();
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
                          form.querySelector('[key="avatar-chooser--empty"]').hidden = false;
                          form.querySelector('[key="avatar-chooser--filled"]').hidden = true;
                        };
                      `}"
                    >
                      <i class="bi bi-trash-fill"></i>
                    </button>
                  </div>
                  <input
                    key="avatar-chooser--upload"
                    type="file"
                    accept="image/*"
                    hidden
                    onload="${javascript`
                      this.isModified = false;

                      const avatarChooser = this.closest('[key="avatar-chooser"]');
                      const avatar = avatarChooser.querySelector('[name="avatar"]');
                      const avatarEmpty = avatarChooser.querySelector('[key="avatar-chooser--empty"]');
                      const avatarFilled = avatarChooser.querySelector('[key="avatar-chooser--filled"]');

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
                        body.append("avatar", fileList[0]);
                        this.value = "";
                        tippy.hideAll();
                        avatarChooser.uploadingIndicator.show();
                        const response = await fetch("https://${
                          app.locals.options.hostname
                        }/settings/profile/avatar", {
                          cache: "no-store",
                          method: "POST",
                          headers: { "CSRF-Protection": "true", },
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
                  : app.locals.partials.contentPreprocessed(req.body.biography)
                      .contentPreprocessed
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
      res.redirect(
        303,
        `https://${app.locals.options.hostname}/settings/profile`
      );
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
        `https://${
          app.locals.options.hostname
        }/files/${folder}/${encodeURIComponent(nameAvatar)}`
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
        userSettingsLayout({
          req,
          res,
          head: html`<title>
            Email & Password · User Settings · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-key-fill"></i>
              Email & Password
            </h2>

            <form
              method="PATCH"
              action="https://${app.locals.options
                .hostname}/settings/email-and-password"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${res.locals.user.email}"
                  required
                  class="input--text"
                  onload="${javascript`
                    this.onvalidate = () => {
                      if (!leafac.isModified(this))
                        return "Please provide the email address to which you’d like to update.";
                    };
                  `}"
                />
              </label>
              <div class="label">
                <p class="label--text">
                  Password Confirmation
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        content: "You must confirm your email because this is an important operation that affects your account.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </p>
                <input
                  type="password"
                  name="passwordConfirmation"
                  required
                  class="input--text"
                />
              </div>

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
              action="https://${app.locals.options
                .hostname}/settings/email-and-password"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <label class="label">
                <p class="label--text">Current Password</p>
                <input
                  type="password"
                  name="passwordConfirmation"
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
                    this.onvalidate = () => {
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
    { passwordConfirmation?: string; email?: string; newPassword?: string },
    { redirect?: string },
    HasPasswordConfirmationMiddlewareLocals
  >(
    "/settings/email-and-password",
    (req, res, next) => {
      res.locals.actionAllowedToUserWithUnverifiedEmail =
        typeof req.body.email === "string" &&
        req.body.newPassword === undefined;
      res.locals.hasPasswordConfirmationRedirect =
        typeof req.query.redirect === "string"
          ? req.query.redirect
          : "settings/email-and-password";
      next();
    },
    ...app.locals.middlewares.hasPasswordConfirmation,
    asyncHandler(async (req, res, next) => {
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
            `https://${app.locals.options.hostname}/${
              typeof req.query.redirect === "string"
                ? req.query.redirect
                : "settings/email-and-password"
            }`
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
        if (res.locals.user.emailVerifiedAt !== null)
          app.locals.database.run(
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
                  to: res.locals.user.email,
                  subject: "Your Email Has Been Updated",
                  html: html`
                    <p>
                      The <code>${res.locals.user.email}</code> email address
                      was associated with a Courselore account that has been
                      updated to use the <code>${req.body.email}</code> email
                      address.
                    </p>

                    <p>
                      If you performed this update, then no further action is
                      required.
                    </p>

                    <p>
                      If you did not perform this update, then please contact
                      the system administrator at
                      <a href="mailto:${app.locals.options.administratorEmail}"
                        >${app.locals.options.administratorEmail}</a
                      >
                      as soon as possible.
                    </p>
                  `,
                })}
              )
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
        app.locals.database.run(
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
                to: res.locals.user.email,
                subject: "Your Password Has Been Updated",
                html: html`
                  <p>
                    The password for the Courselore account with email address
                    <code>${res.locals.user.email}</code> has been updated.
                  </p>

                  <p>
                    If you performed this update, then no further action is
                    required.
                  </p>

                  <p>
                    If you did not perform this update, then please contact the
                    system administrator at
                    <a href="mailto:${app.locals.options.administratorEmail}"
                      >${app.locals.options.administratorEmail}</a
                    >
                    as soon as possible.
                  </p>
                `,
              })}
            )
          `
        );
        app.locals.workers.sendEmail();
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
        `https://${app.locals.options.hostname}/${
          typeof req.query.redirect === "string"
            ? req.query.redirect
            : "settings/email-and-password"
        }`
      );
    })
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/notifications",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>Notifications · User Settings · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-bell-fill"></i>
              Notifications
            </h2>

            <form
              method="PATCH"
              action="https://${app.locals.options
                .hostname}/settings/notifications"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <div key="isEmailNotificationsFor" class="label">
                <p class="label--text">Email Notifications</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="checkbox"
                      name="isEmailNotificationsForAllMessages"
                      $${res.locals.user.emailNotificationsForAllMessages !==
                      "none"
                        ? html`checked`
                        : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (this.checked) {
                            this.closest("form").querySelector('[name="isEmailNotificationsForMentions"]').checked = true;
                            this.closest("form").querySelector('[name="isEmailNotificationsForMessagesInConversationsInWhichYouParticipated"]').checked = true;
                            this.closest("form").querySelector('[name="isEmailNotificationsForMessagesInConversationsYouStarted"]').checked = true;
                          }
                          for (const element of this.closest("form").querySelectorAll('[name="emailNotificationsForAllMessages"]')) {
                            element.disabled = !this.checked;
                            element.closest("label").classList[this.checked ? "remove" : "add"]("disabled");
                          }
                        };
                      `}"
                    />
                    All messages
                  </label>
                </div>

                <div
                  hidden
                  TODO
                  css="${res.locals.css(css`
                    margin-left: var(--space--10);
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--1);
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline ${res
                      .locals.user.emailNotificationsForAllMessages === "none"
                      ? "disabled"
                      : ""}"
                  >
                    <input
                      type="radio"
                      name="emailNotificationsForAllMessages"
                      value="instant"
                      required
                      $${res.locals.user.emailNotificationsForAllMessages ===
                      "none"
                        ? html`disabled`
                        : html``}
                      $${res.locals.user.emailNotificationsForAllMessages ===
                      "instant"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Instant
                  </label>

                  <label
                    class="button button--tight button--tight--inline ${res
                      .locals.user.emailNotificationsForAllMessages === "none"
                      ? "disabled"
                      : ""}"
                  >
                    <input
                      type="radio"
                      name="emailNotificationsForAllMessages"
                      value="hourly-digests"
                      required
                      $${res.locals.user.emailNotificationsForAllMessages ===
                      "none"
                        ? html`disabled`
                        : html``}
                      $${res.locals.user.emailNotificationsForAllMessages ===
                      "hourly-digests"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Hourly Digests
                  </label>

                  <label
                    class="button button--tight button--tight--inline ${res
                      .locals.user.emailNotificationsForAllMessages === "none"
                      ? "disabled"
                      : ""}"
                  >
                    <input
                      type="radio"
                      name="emailNotificationsForAllMessages"
                      value="daily-digests"
                      required
                      $${res.locals.user.emailNotificationsForAllMessages ===
                      "none"
                        ? html`disabled`
                        : html``}
                      $${["none", "daily-digests"].includes(
                        res.locals.user.emailNotificationsForAllMessages
                      )
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Daily Digests
                  </label>
                </div>

                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="checkbox"
                      name="isEmailNotificationsForMentions"
                      $${res.locals.user.emailNotificationsForMentionsAt !==
                      null
                        ? html`checked`
                        : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (!this.checked) {
                            const element = this.closest("form").querySelector('[name="isEmailNotificationsForAllMessages"]');
                            element.checked = false;
                            element.onchange();
                          }
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
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="checkbox"
                      name="isEmailNotificationsForMessagesInConversationsInWhichYouParticipated"
                      $${res.locals.user
                        .emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt !==
                      null
                        ? html`checked`
                        : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (!this.checked) {
                            const element = this.closest("form").querySelector('[name="isEmailNotificationsForAllMessages"]');
                            element.checked = false;
                            element.onchange();
                          }
                          if (this.checked) this.closest("form").querySelector('[name="isEmailNotificationsForMessagesInConversationsYouStarted"]').checked = true;
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
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="checkbox"
                      name="isEmailNotificationsForMessagesInConversationsYouStarted"
                      $${res.locals.user
                        .emailNotificationsForMessagesInConversationsYouStartedAt !==
                      null
                        ? html`checked`
                        : html``}
                      class="input--checkbox"
                      onload="${javascript`
                        this.onchange = () => {
                          if (!this.checked) {
                            const element = this.closest("form").querySelector('[name="isEmailNotificationsForAllMessages"]');
                            element.checked = false;
                            element.onchange();
                          }
                          if (!this.checked) this.closest("form").querySelector('[name="isEmailNotificationsForMessagesInConversationsInWhichYouParticipated"]').checked = false;
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
                        content: "You always receive email notifications for staff announcements.",
                      });
                    `}"
                  >
                    <input
                      type="checkbox"
                      disabled
                      checked
                      class="input--checkbox"
                    />
                    Staff announcements
                  </label>
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
      isEmailNotificationsForAllMessages?: "on";
      emailNotificationsForAllMessages?:
        | "instant"
        | "hourly-digests"
        | "daily-digests";
      isEmailNotificationsForMentions?: "on";
      isEmailNotificationsForMessagesInConversationsInWhichYouParticipated?: "on";
      isEmailNotificationsForMessagesInConversationsYouStarted?: "on";
    },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/notifications",
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (
        ![undefined, "on"].includes(
          req.body.isEmailNotificationsForAllMessages
        ) ||
        (req.body.isEmailNotificationsForAllMessages === undefined &&
          req.body.emailNotificationsForAllMessages !== undefined) ||
        (req.body.isEmailNotificationsForAllMessages === "on" &&
          (typeof req.body.emailNotificationsForAllMessages !== "string" ||
            !["instant", "hourly-digests", "daily-digests"].includes(
              req.body.emailNotificationsForAllMessages
            ))) ||
        ![undefined, "on"].includes(req.body.isEmailNotificationsForMentions) ||
        ![undefined, "on"].includes(
          req.body
            .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated
        ) ||
        ![undefined, "on"].includes(
          req.body.isEmailNotificationsForMessagesInConversationsYouStarted
        ) ||
        (req.body.isEmailNotificationsForAllMessages === "on" &&
          (req.body.isEmailNotificationsForMentions !== "on" ||
            req.body
              .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated !==
              "on" ||
            req.body
              .isEmailNotificationsForMessagesInConversationsYouStarted !==
              "on")) ||
        (req.body
          .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ===
          "on" &&
          req.body.isEmailNotificationsForMessagesInConversationsYouStarted !==
            "on")
      )
        return next("validation");

      app.locals.database.run(
        sql`
          UPDATE "users"
          SET "emailNotificationsForAllMessages" = ${
            req.body.isEmailNotificationsForAllMessages === undefined
              ? "none"
              : "instant" /* TODO req.body.emailNotificationsForAllMessages */
          },
              "emailNotificationsForMentionsAt" = ${
                req.body.isEmailNotificationsForMentions === "on"
                  ? new Date().toISOString()
                  : null
              },
              "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" = ${
                req.body
                  .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ===
                "on"
                  ? new Date().toISOString()
                  : null
              },
              "emailNotificationsForMessagesInConversationsYouStartedAt" = ${
                req.body
                  .isEmailNotificationsForMessagesInConversationsYouStarted ===
                "on"
                  ? new Date().toISOString()
                  : null
              }
          WHERE "id" = ${res.locals.user.id}
       `
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Notifications updated successfully.`,
      });

      res.redirect(
        303,
        `https://${app.locals.options.hostname}/settings/notifications`
      );
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/account",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>Account · User Settings · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-bell-fill"></i>
              Account
            </h2>

            <form
              method="DELETE"
              action="https://${app.locals.options.hostname}/settings/account"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <div class="label">
                <p class="label--text">
                  Password Confirmation
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        content: "You must confirm your email because this is an important operation that affects your account.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </p>
                <input
                  type="password"
                  name="passwordConfirmation"
                  required
                  class="input--text"
                />
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--rose"
                  onload="${javascript`
                    this.onclick = () => {
                      localStorage.clear();
                    };
                  `}"
                >
                  <i class="bi bi-person-x-fill"></i>
                  Remove Your Account
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  /*
  TODO
  app.delete<{}, any, {}, {}, HasPasswordConfirmationMiddlewareLocals>(
    "/settings/account",
    (req, res, next) => {
      res.locals.hasPasswordConfirmationRedirect = "settings/account";
      next();
    },
    ...app.locals.middlewares.hasPasswordConfirmation,
    (req, res) => {
      app.locals.database.run(
        sql`
          DELETE FROM "users"
          WHERE "id" = ${res.locals.user.id}
       `
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`
          Account deleted successfully.<br />
          Thanks for having used Courselore.
        `,
      });

      app.locals.helpers.Session.close({ req, res });
      res
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(303, `https://${app.locals.options.host}/`);
    }
  );
  */
};
