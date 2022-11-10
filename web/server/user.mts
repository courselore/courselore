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
import got from "got";
import { Application } from "./index.mjs";

export type ApplicationUser = {
  server: {
    locals: {
      Types: {
        User: {
          id: number;
          lastSeenOnlineAt: string;
          reference: string;
          email: string;
          name: string;
          avatar: string | null;
          avatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
          biographySource: string | null;
          biographyPreprocessed: HTML | null;
        };
      };
      partials: {
        user: ({
          request,
          response,
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
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["Base"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["Base"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          enrollment?: Application["server"]["locals"]["Types"]["MaybeEnrollment"];
          user?:
            | Application["server"]["locals"]["Types"]["User"]
            | "no-longer-enrolled";
          anonymous?: boolean | "reveal";
          avatar?: boolean;
          decorate?: boolean;
          name?: boolean | string;
          tooltip?: boolean;
          size?: "xs" | "sm" | "xl";
          bold?: boolean;
        }) => HTML;
      };
      helpers: {
        userAvatarlessBackgroundColors: [
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
          "rose"
        ];
        userEmailNotificationsForAllMessageses: [
          "none",
          "instant",
          "hourly-digests",
          "daily-digests"
        ];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.locals.partials.user = ({
    request,
    response,
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
                css="${response.locals.css(css`
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
                    css="${response.locals.css(css`
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
                css="${response.locals.css(css`
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
                css="${response.locals.css(css`
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
                  css="${response.locals.css(css`
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
            css="${response.locals.css(css`
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
              css="${response.locals.css(css`
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
            css="${response.locals.css(css`
              ${bold
                ? css`
                    font-weight: var(--font-weight--bold);
                  `
                : css``}
            `)}"
            $${name === true && user !== "no-longer-enrolled"
              ? html`
                  data-filterable-phrases="${JSON.stringify(
                    application.server.locals.helpers.splitFilterablePhrases(
                      user.name
                    )
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
            content: ${response.locals.html(
              html`
                <div
                  css="${response.locals.css(css`
                    max-height: var(--space--56);
                    padding: var(--space--1) var(--space--2);
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  <div
                    css="${response.locals.css(css`
                      display: flex;
                      gap: var(--space--4);
                      align-items: center;
                    `)}"
                  >
                    <div>
                      $${application.server.locals.partials.user({
                        request,
                        response,
                        enrollment,
                        user,
                        name: false,
                        size: "xl",
                      })}
                    </div>
                    <div
                      css="${response.locals.css(css`
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
                        (response.locals.enrollment?.courseRole === "staff" ||
                          response.locals.user?.id === user!.id)
                          ? html`
                              <div class="secondary">
                                <span
                                  css="${response.locals.css(css`
                                    margin-right: var(--space--2);
                                  `)}"
                                >
                                  ${user!.email}
                                </span>
                                <button
                                  class="button button--tight button--tight--inline button--transparent"
                                  css="${response.locals.css(css`
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
                                css="${response.locals.css(css`
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
                                css="${response.locals.css(css`
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
                    ? application.server.locals.partials.content({
                        request,
                        response,
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
          css="${response.locals.css(css`
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
              css="${response.locals.css(css`
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
          css="${response.locals.css(css`
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

  application.server.locals.helpers.userAvatarlessBackgroundColors = [
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
  ];

  application.server.locals.helpers.userEmailNotificationsForAllMessageses = [
    "none",
    "instant",
    "hourly-digests",
    "daily-digests",
  ];

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.redirect(
      303,
      `https://${application.configuration.hostname}/settings/profile`
    );
  });

  const userSettingsLayout = ({
    request,
    response,
    head,
    body,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    response: express.Response<
      any,
      Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    application.server.locals.layouts.settings({
      request,
      response,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        User Settings
      `,
      menu: html`
        <a
          href="https://${application.configuration.hostname}/settings/profile"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/settings\/profile\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-person-circle"></i>
          Profile
        </a>
        <a
          href="https://${application.configuration
            .hostname}/settings/email-and-password"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/settings\/email-and-password\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${request.path.match(
              /\/settings\/email-and-password\/?$/i
            )
              ? "bi-key-fill"
              : "bi-key"}"
          ></i>
          Email & Password
        </a>
        <a
          href="https://${application.configuration
            .hostname}/settings/notifications"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/settings\/notifications\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${request.path.match(/\/settings\/notifications\/?$/i)
              ? "bi-bell-fill"
              : "bi-bell"}"
          ></i>
          Notifications
        </a>
        <a
          hidden
          TODO
          href="https://${application.configuration.hostname}/settings/account"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
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

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/profile", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      userSettingsLayout({
        request,
        response,
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
            action="https://${application.configuration
              .hostname}/settings/profile"
            novalidate
            css="${response.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div
              css="${response.locals.css(css`
                display: flex;
                gap: var(--space--4);
                @media (max-width: 400px) {
                  flex-direction: column;
                }
              `)}"
            >
              <div
                key="avatar-chooser"
                css="${response.locals.css(css`
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
                  $${response.locals.user.avatar === null
                    ? html``
                    : html`hidden`}
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
                      css="${response.locals.css(css`
                        width: var(--space--4);
                        height: var(--space--4);
                        transform: scale(8);
                        svg {
                          vertical-align: var(--space--0);
                        }
                      `)}"
                    >
                      $${application.server.locals.partials.user({
                        request,
                        response,
                        user: { ...response.locals.user, avatar: null },
                        decorate: false,
                        name: false,
                        size: "xs",
                      })}
                    </div>
                  </button>
                </div>
                <div
                  key="avatar-chooser--filled"
                  $${response.locals.user.avatar === null
                    ? html`hidden`
                    : html``}
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
                      src="${response.locals.user.avatar ?? ""}"
                      alt="Avatar"
                      loading="lazy"
                      css="${response.locals.css(css`
                        width: 100%;
                        height: 100%;
                        border-radius: var(--border-radius--circle);
                      `)}"
                    />
                  </button>
                  <button
                    type="button"
                    class="button button--rose"
                    css="${response.locals.css(css`
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
                      content: ${response.locals.html(
                        html`
                          <div
                            css="${response.locals.css(css`
                              display: flex;
                              gap: var(--space--2);
                            `)}"
                          >
                            $${application.server.locals.partials.spinner({
                              request,
                              response,
                            })}
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
                        application.configuration.hostname
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
                  value="${response.locals.user.avatar ?? ""}"
                  hidden
                />
              </div>

              <div
                css="${response.locals.css(css`
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
                    value="${response.locals.user.name}"
                    required
                    class="input--text"
                  />
                </label>
              </div>
            </div>

            <div class="label">
              <p class="label--text">Biography</p>
              $${application.server.locals.partials.contentEditor({
                request,
                response,
                name: "biography",
                contentSource: response.locals.user.biographySource ?? "",
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
  });

  application.server.patch<
    {},
    any,
    { name?: string; avatar?: string; biography?: string },
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/profile", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    if (
      typeof request.body.name !== "string" ||
      request.body.name.trim() === "" ||
      typeof request.body.avatar !== "string" ||
      typeof request.body.biography !== "string"
    )
      return next("Validation");

    application.database.run(
      sql`
        UPDATE "users"
        SET
          "name" = ${request.body.name},
          "nameSearch" = ${html`${request.body.name}`},
          "avatar" = ${
            request.body.avatar.trim() === "" ? null : request.body.avatar
          },
          "biographySource" = ${
            request.body.biography.trim() === "" ? null : request.body.biography
          },
          "biographyPreprocessed" = ${
            request.body.biography.trim() === ""
              ? null
              : application.server.locals.partials.contentPreprocessed(
                  request.body.biography
                ).contentPreprocessed
          }
        WHERE "id" = ${response.locals.user.id}
      `
    );

    application.server.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`Profile updated successfully.`,
    });
    response.redirect(
      303,
      `https://${application.configuration.hostname}/settings/profile`
    );
  });

  application.server.post<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/settings/profile/avatar",
    asyncHandler(async (request, response, next) => {
      if (
        request.files?.avatar === undefined ||
        Array.isArray(request.files.avatar)
      )
        return next("Validation");
      if (!request.files.avatar.mimetype.startsWith("image/"))
        return response.status(413).send("The avatar must be an image.");
      if (request.files.avatar.truncated)
        return response
          .status(413)
          .send("The avatar must be smaller than 10MB.");
      const name = filenamify(request.files.avatar.name, { replacement: "-" });
      if (name.trim() === "") return next("Validation");
      const folder = cryptoRandomString({
        length: 20,
        type: "numeric",
      });
      await request.files.avatar.mv(
        path.join(
          application.configuration.dataDirectory,
          `files/${folder}/${name}`
        )
      );
      const extension = path.extname(name);
      const nameAvatar = `${name.slice(
        0,
        -extension.length
      )}--avatar${extension}`;
      try {
        await sharp(request.files.avatar.data, { limitInputPixels: false })
          .rotate()
          .resize({
            width: 256 /* var(--space--64) */,
            height: 256 /* var(--space--64) */,
            position: sharp.strategy.attention,
          })
          .toFile(
            path.join(
              application.configuration.dataDirectory,
              `files/${folder}/${nameAvatar}`
            )
          );
      } catch (error) {
        return next("Validation");
      }
      response.send(
        `https://${
          application.configuration.hostname
        }/files/${folder}/${encodeURIComponent(nameAvatar)}`
      );
    }),
    ((error, request, response, next) => {
      if (error === "Validation")
        return response
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${application.configuration.administratorEmail}.`
          );
      next(error);
    }) as express.ErrorRequestHandler<
      {},
      any,
      {},
      {},
      Application["server"]["locals"]["ResponseLocals"]["Base"]
    >
  );

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/email-and-password", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      userSettingsLayout({
        request,
        response,
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
            action="https://${application.configuration
              .hostname}/settings/email-and-password"
            novalidate
            css="${response.locals.css(css`
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
                value="${response.locals.user.email}"
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
            action="https://${application.configuration
              .hostname}/settings/email-and-password"
            novalidate
            css="${response.locals.css(css`
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
  });

  application.server.patch<
    {},
    any,
    { email?: string; newPassword?: string },
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/settings/email-and-password",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user === undefined) return next();

      if (!response.locals.passwordConfirmation) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Incorrect password confirmation.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${
            typeof request.query.redirect === "string"
              ? request.query.redirect
              : "settings/email-and-password"
          }`
        );
      }

      if (typeof request.body.email === "string") {
        if (
          request.body.email.match(
            application.server.locals.helpers.emailRegExp
          ) === null
        )
          return next("Validation");

        if (
          application.database.get<{}>(
            sql`
              SELECT TRUE FROM "users" WHERE "email" = ${request.body.email}
            `
          ) !== undefined
        ) {
          application.server.locals.helpers.Flash.set({
            request,
            response,
            theme: "rose",
            content: html`Email already taken.`,
          });
          return response.redirect(
            303,
            `https://${application.configuration.hostname}/${
              typeof request.query.redirect === "string"
                ? request.query.redirect
                : "settings/email-and-password"
            }`
          );
        }

        application.database.run(
          sql`
            UPDATE "users"
            SET
              "email" = ${request.body.email},
              "emailVerifiedAt" = ${null}
            WHERE "id" = ${response.locals.user.id}
          `
        );

        if (response.locals.user.emailVerifiedAt !== null)
          application.database.run(
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
                  to: response.locals.user.email,
                  subject: "Your Email Has Been Updated",
                  html: html`
                    <p>
                      The <code>${response.locals.user.email}</code> email
                      address was associated with a Courselore account that has
                      been updated to use the
                      <code>${request.body.email}</code> email address.
                    </p>

                    <p>
                      If you performed this update, then no further action is
                      required.
                    </p>

                    <p>
                      If you did not perform this update, then please contact
                      the system administrator at
                      <a
                        href="mailto:${application.configuration
                          .administratorEmail}"
                        >${application.configuration.administratorEmail}</a
                      >
                      as soon as possible.
                    </p>
                  `,
                })}
              )
            `
          );
        application.server.locals.helpers.emailVerification({
          request,
          response,
          userId: response.locals.user.id,
          userEmail: request.body.email,
        });

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Email updated successfully.`,
        });
      }

      if (typeof request.body.newPassword === "string") {
        if (
          request.body.newPassword.trim() === "" ||
          request.body.newPassword.length < 8
        )
          return next("Validation");

        application.database.run(
          sql`
            UPDATE "users"
            SET "password" =  ${await argon2.hash(
              request.body.newPassword,
              application.server.locals.configuration.argon2
            )}
            WHERE "id" = ${response.locals.user.id}
          `
        );

        application.database.run(
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
                to: response.locals.user.email,
                subject: "Your Password Has Been Updated",
                html: html`
                  <p>
                    The password for the Courselore account with email address
                    <code>${response.locals.user.email}</code> has been updated.
                  </p>

                  <p>
                    If you performed this update, then no further action is
                    required.
                  </p>

                  <p>
                    If you did not perform this update, then please contact the
                    system administrator at
                    <a
                      href="mailto:${application.configuration
                        .administratorEmail}"
                      >${application.configuration.administratorEmail}</a
                    >
                    as soon as possible.
                  </p>
                `,
              })}
            )
          `
        );
        got
          .post(
            `http://127.0.0.1:${application.ports.workerEventsAny}/send-email`
          )
          .catch((error) => {
            response.locals.log("FAILED TO EMIT ‘/send-email’ EVENT", error);
          });

        application.server.locals.helpers.Session.closeAllAndReopen({
          request,
          response,
          userId: response.locals.user.id,
        });

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Password updated successfully.`,
        });
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : "settings/email-and-password"
        }`
      );
    })
  );

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/notifications", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      userSettingsLayout({
        request,
        response,
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
            action="https://${application.configuration
              .hostname}/settings/notifications"
            novalidate
            css="${response.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div key="isEmailNotificationsFor" class="label">
              <p class="label--text">Email Notifications</p>
              <div
                css="${response.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="isEmailNotificationsForAllMessages"
                    $${response.locals.user.emailNotificationsForAllMessages !==
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
                css="${response.locals.css(css`
                  margin-left: var(--space--10);
                  display: flex;
                  flex-wrap: wrap;
                  column-gap: var(--space--8);
                  row-gap: var(--space--1);
                `)}"
              >
                <label
                  class="button button--tight button--tight--inline ${response
                    .locals.user.emailNotificationsForAllMessages === "none"
                    ? "disabled"
                    : ""}"
                >
                  <input
                    type="radio"
                    name="emailNotificationsForAllMessages"
                    value="instant"
                    required
                    $${response.locals.user.emailNotificationsForAllMessages ===
                    "none"
                      ? html`disabled`
                      : html``}
                    $${response.locals.user.emailNotificationsForAllMessages ===
                    "instant"
                      ? html`checked`
                      : html``}
                    class="input--radio"
                  />
                  Instant
                </label>

                <label
                  class="button button--tight button--tight--inline ${response
                    .locals.user.emailNotificationsForAllMessages === "none"
                    ? "disabled"
                    : ""}"
                >
                  <input
                    type="radio"
                    name="emailNotificationsForAllMessages"
                    value="hourly-digests"
                    required
                    $${response.locals.user.emailNotificationsForAllMessages ===
                    "none"
                      ? html`disabled`
                      : html``}
                    $${response.locals.user.emailNotificationsForAllMessages ===
                    "hourly-digests"
                      ? html`checked`
                      : html``}
                    class="input--radio"
                  />
                  Hourly Digests
                </label>

                <label
                  class="button button--tight button--tight--inline ${response
                    .locals.user.emailNotificationsForAllMessages === "none"
                    ? "disabled"
                    : ""}"
                >
                  <input
                    type="radio"
                    name="emailNotificationsForAllMessages"
                    value="daily-digests"
                    required
                    $${response.locals.user.emailNotificationsForAllMessages ===
                    "none"
                      ? html`disabled`
                      : html``}
                    $${["none", "daily-digests"].includes(
                      response.locals.user.emailNotificationsForAllMessages
                    )
                      ? html`checked`
                      : html``}
                    class="input--radio"
                  />
                  Daily Digests
                </label>
              </div>

              <div
                css="${response.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="isEmailNotificationsForMentions"
                    $${response.locals.user.emailNotificationsForMentionsAt !==
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
                css="${response.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="isEmailNotificationsForMessagesInConversationsInWhichYouParticipated"
                    $${response.locals.user
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
                css="${response.locals.css(css`
                  display: flex;
                `)}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="isEmailNotificationsForMessagesInConversationsYouStarted"
                    $${response.locals.user
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
                css="${response.locals.css(css`
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
  });

  application.server.patch<
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
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/notifications", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    if (
      ![undefined, "on"].includes(
        request.body.isEmailNotificationsForAllMessages
      ) ||
      (request.body.isEmailNotificationsForAllMessages === undefined &&
        request.body.emailNotificationsForAllMessages !== undefined) ||
      (request.body.isEmailNotificationsForAllMessages === "on" &&
        (typeof request.body.emailNotificationsForAllMessages !== "string" ||
          !["instant", "hourly-digests", "daily-digests"].includes(
            request.body.emailNotificationsForAllMessages
          ))) ||
      ![undefined, "on"].includes(
        request.body.isEmailNotificationsForMentions
      ) ||
      ![undefined, "on"].includes(
        request.body
          .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated
      ) ||
      ![undefined, "on"].includes(
        request.body.isEmailNotificationsForMessagesInConversationsYouStarted
      ) ||
      (request.body.isEmailNotificationsForAllMessages === "on" &&
        (request.body.isEmailNotificationsForMentions !== "on" ||
          request.body
            .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated !==
            "on" ||
          request.body
            .isEmailNotificationsForMessagesInConversationsYouStarted !==
            "on")) ||
      (request.body
        .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ===
        "on" &&
        request.body
          .isEmailNotificationsForMessagesInConversationsYouStarted !== "on")
    )
      return next("Validation");

    application.database.run(
      sql`
        UPDATE "users"
        SET
          "emailNotificationsForAllMessages" = ${
            request.body.isEmailNotificationsForAllMessages === undefined
              ? "none"
              : "instant" /* TODO request.body.emailNotificationsForAllMessages */
          },
          "emailNotificationsForMentionsAt" = ${
            request.body.isEmailNotificationsForMentions === "on"
              ? new Date().toISOString()
              : null
          },
          "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt" = ${
            request.body
              .isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ===
            "on"
              ? new Date().toISOString()
              : null
          },
          "emailNotificationsForMessagesInConversationsYouStartedAt" = ${
            request.body
              .isEmailNotificationsForMessagesInConversationsYouStarted === "on"
              ? new Date().toISOString()
              : null
          }
        WHERE "id" = ${response.locals.user.id}
      `
    );

    application.server.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`Notifications updated successfully.`,
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/settings/notifications`
    );
  });

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/account", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      userSettingsLayout({
        request,
        response,
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
            action="https://${application.configuration
              .hostname}/settings/account"
            novalidate
            css="${response.locals.css(css`
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
  });

  /*
  TODO
  app.server.delete<{}, any, {}, {}, HasPasswordConfirmationLocals>(
    "/settings/account",
    (request, response, next) => {
      response.locals.hasPasswordConfirmationRedirect = "settings/account";
      next();
    },
    ...app.server.locals.middlewares.hasPasswordConfirmation,
    (request, response) => {
      app.database.run(
        sql`
          DELETE FROM "users"
          WHERE "id" = ${response.locals.user.id}
       `
      );

      app.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          Account deleted successfully.<br />
          Thanks for having used Courselore.
        `,
      });

      app.server.locals.helpers.Session.close({ request, response });
      response
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(303, `https://${app.configuration.host}/`);
    }
  );
  */
};
