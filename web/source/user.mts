import path from "node:path";
import timers from "node:timers/promises";
import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import qs from "qs";
import filenamify from "filenamify";
import cryptoRandomString from "crypto-random-string";
import sharp from "sharp";
import argon2 from "argon2";
import { Application } from "./index.mjs";

export type ApplicationUser = {
  web: {
    locals: {
      Types: {
        User: {
          id: number;
          lastSeenOnlineAt: string;
          reference: string;
          email: string;
          name: string;
          avatar: string | null;
          avatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
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
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          enrollment?: Application["web"]["locals"]["Types"]["MaybeEnrollment"];
          user?:
            | Application["web"]["locals"]["Types"]["User"]
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
  application.web.locals.helpers.userAvatarlessBackgroundColors = [
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

  application.web.locals.helpers.userEmailNotificationsForAllMessageses = [
    "none",
    "instant",
    "hourly-digests",
    "daily-digests",
  ];

  // FIXME: https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/63288
  (application.webEvents.on as any)(
    "liveConnectionOpened",
    ({
      request,
      response,
    }: {
      request: express.Request<
        {},
        any,
        {},
        {},
        Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
      response: express.Response<
        any,
        Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
      >;
    }) => {
      const userId = application.web.locals.helpers.Session.get({
        request,
        response,
      });
      if (userId === undefined) return;

      const abortController = new AbortController();

      (async () => {
        while (true) {
          application.database.run(
            sql`
              UPDATE "users"
              SET "lastSeenOnlineAt" = ${new Date().toISOString()}
              WHERE "id" = ${userId}
            `
          );

          try {
            await timers.setTimeout(
              30 * 1000 + Math.random() * 5 * 1000,
              undefined,
              {
                ref: false,
                signal: abortController.signal,
              }
            );
          } catch {
            break;
          }
        }
      })();

      response.once("close", () => {
        abortController.abort();
      });
    }
  );

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
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

  const layoutUserSettings = ({
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
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    application.web.locals.layouts.settings({
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
          href="https://${application.configuration.hostname}/settings/account"
          class="dropdown--menu--item menu-box--item button ${request.path.match(
            /\/settings\/account\/?$/i
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i
            class="bi ${request.path.match(/\/settings\/account\/?$/i)
              ? "bi-person-fill-gear"
              : "bi-person-gear"}"
          ></i>
          Account
        </a>
      `,
      body,
    });

  application.web.locals.partials.user = ({
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
                css="${css`
                  color: var(--color--rose--700);
                  background-color: var(--color--rose--200);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--rose--200);
                    background-color: var(--color--rose--700);
                  }
                  border-radius: var(--border-radius--circle);
                `} ${{
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
                }[size]}"
              >
                <foreignObject x="2" y="-2" width="24" height="24">
                  <span
                    css="${css`
                      font-size: var(--font-size--xl);
                      line-height: var(--line-height--xl);
                    `}"
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
                css="${css`
                  border-radius: var(--border-radius--circle);
                  @media (prefers-color-scheme: dark) {
                    filter: brightness(var(--brightness--90));
                  }
                `} ${{
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
                }[size]}"
              />`
            : html`<svg
                viewBox="0 0 24 24"
                style="
                  --color--avatarless-background-color--200: var(--color--${user.avatarlessBackgroundColor}--200);
                  --color--avatarless-background-color--700: var(--color--${user.avatarlessBackgroundColor}--700);
                "
                css="${css`
                  color: var(--color--avatarless-background-color--700);
                  background-color: var(
                    --color--avatarless-background-color--200
                  );
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--avatarless-background-color--200);
                    background-color: var(
                      --color--avatarless-background-color--700
                    );
                  }
                  border-radius: var(--border-radius--circle);
                `} ${{
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
                }[size]}"
              >
                <text
                  x="12"
                  y="16"
                  text-anchor="middle"
                  css="${css`
                    font-size: var(--font-size--2xs);
                    line-height: var(--line-height--2xs);
                    font-weight: var(--font-weight--black);
                    fill: currentColor;
                  `}"
                >
                  ${(() => {
                    const nameParts = user.name.split(/\s+/);
                    return `${nameParts[0][0]}${
                      nameParts.length > 0 ? nameParts.at(-1)![0] : ""
                    }`.toUpperCase();
                  })()}
                </text>
              </svg>`;

        if (decorate && user !== "no-longer-enrolled")
          userAvatar = html`<span
            css="${css`
              display: inline-grid;
              & > * {
                grid-area: 1 / 1;
                position: relative;
              }
            `} ${{
              xs: css`
                vertical-align: var(--space---1);
              `,
              sm: css`
                vertical-align: var(--space---1-5);
              `,
              xl: css``,
            }[size]}"
          >
            $${userAvatar}
            $${Date.now() - 5 * 60 * 1000 <
            new Date(user.lastSeenOnlineAt).getTime()
              ? html`
                  <span
                    css="${css`
                      background-color: var(--color--green--500);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--green--600);
                      }
                      border-radius: var(--border-radius--circle);
                      place-self: end;
                    `} ${{
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
                    }[size]}"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Online",
                        },
                      });
                    `}"
                  ></span>
                `
              : html``}
          </span>`;
      }

      if (name !== false)
        userName = html`<span
          ><span
            css="${bold
              ? css`
                  font-weight: var(--font-weight--bold);
                `
              : css``}"
            $${name === true && user !== "no-longer-enrolled"
              ? html`
                  data-filterable-phrases="${JSON.stringify(
                    application.web.locals.helpers.splitFilterablePhrases(
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
                javascript="${javascript`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: "Staff",
                    },
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
        javascript="${javascript`
          leafac.setTippy({
            event,
            element: this,
            tippyProps: {
              interactive: true,
              appendTo: document.querySelector("body"),
              delay: [1000, null],
              touch: ["hold", 1000],
              content: ${html`
                <div
                  css="${css`
                    max-height: var(--space--56);
                    padding: var(--space--1) var(--space--2);
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `}"
                >
                  <div
                    css="${css`
                      display: flex;
                      gap: var(--space--4);
                      align-items: center;
                    `}"
                  >
                    <div>
                      $${application.web.locals.partials.user({
                        request,
                        response,
                        enrollment,
                        user,
                        name: false,
                        size: "xl",
                      })}
                    </div>
                    <div
                      css="${css`
                        padding-top: var(--space--0-5);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
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
                                  css="${css`
                                    margin-right: var(--space--2);
                                  `}"
                                >
                                  ${user!.email}
                                </span>
                                <button
                                  class="button button--tight button--tight--inline button--transparent"
                                  css="${css`
                                    font-size: var(--font-size--xs);
                                    line-height: var(--line-height--xs);
                                    display: inline-flex;
                                  `}"
                                  javascript="${javascript`
                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      tippyProps: {
                                        touch: false,
                                        content: "Copy Email",
                                      },
                                    });

                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      elementProperty: "copied",
                                      tippyProps: {
                                        theme: "green",
                                        trigger: "manual",
                                        content: "Copied",
                                      },
                                    });

                                    this.onclick = async () => {
                                      await navigator.clipboard.writeText(${
                                        user!.email
                                      });
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
                                css="${css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `}"
                              >
                                <span>
                                  Last seen online
                                  <time
                                    datetime="${new Date(
                                      user!.lastSeenOnlineAt
                                    ).toISOString()}"
                                    javascript="${javascript`
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
                                css="${css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                  display: flex;
                                  gap: var(--space--2);
                                `}"
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
                    ? application.web.locals.partials.content({
                        request,
                        response,
                        contentPreprocessed: user!.biographyPreprocessed,
                        context: "plain",
                      }).contentProcessed
                    : html``}
                </div>
              `},  
            },
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
          css="${css`
            color: var(--color--violet--700);
            background-color: var(--color--violet--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--violet--200);
              background-color: var(--color--violet--700);
            }
            border-radius: var(--border-radius--circle);
          `} ${{
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
          }[size]}"
        >
          <foreignObject x="2" y="-2" width="24" height="24">
            <span
              css="${css`
                font-size: var(--font-size--xl);
                line-height: var(--line-height--xl);
              `}"
            >
              <i class="bi bi-incognito"></i>
            </span>
          </foreignObject>
        </svg>`;

      if (name !== false)
        anonymousName = html`<span
          css="${bold
            ? css`
                font-weight: var(--font-weight--bold);
              `
            : css``}"
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
        javascript="${javascript`
          leafac.setTippy({
            event,
            element: this,
            tippyProps: {
              touch: false,
              content: "Anonymous to Other Students",
            },
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

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/profile", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      layoutUserSettings({
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div
              css="${css`
                display: flex;
                gap: var(--space--4);
                @media (max-width: 400px) {
                  flex-direction: column;
                }
              `}"
            >
              <div
                key="avatar-chooser"
                css="${css`
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
                `}"
                javascript="${javascript`
                  this.ondragover = (event) => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                  };

                  this.ondrop = (event) => {
                    if (event.dataTransfer.files.length === 0) return;
                    event.preventDefault();
                    this.querySelector('[key="avatar-chooser--upload"]').upload(event.dataTransfer.files);
                  };

                  this.onbeforemorph = (event) => !event?.detail?.liveUpdate;
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
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Add Avatar",
                        },
                      });

                      this.onclick = () => {
                        this.closest("form").querySelector('[key="avatar-chooser--upload"]').click();
                      };
                    `}"
                  >
                    <div
                      css="${css`
                        width: var(--space--4);
                        height: var(--space--4);
                        transform: scale(8);
                        svg {
                          vertical-align: var(--space--0);
                        }
                      `}"
                    >
                      $${application.web.locals.partials.user({
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
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Update Avatar",
                        },
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
                      css="${css`
                        width: 100%;
                        height: 100%;
                        border-radius: var(--border-radius--circle);
                      `}"
                    />
                  </button>
                  <button
                    type="button"
                    class="button button--rose"
                    css="${css`
                      && {
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        place-self: end;
                        width: var(--font-size--2xl);
                        height: var(--font-size--2xl);
                        padding: var(--space--0);
                        border-radius: var(--border-radius--circle);
                        transform: translate(-20%, -20%);
                        align-items: center;
                      }
                    `}"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          theme: "rose",
                          touch: false,
                          content: "Remove Avatar",
                        },
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
                  javascript="${javascript`
                    this.isModified = false;

                    const avatarChooser = this.closest('[key="avatar-chooser"]');
                    const avatar = avatarChooser.querySelector('[name="avatar"]');
                    const avatarEmpty = avatarChooser.querySelector('[key="avatar-chooser--empty"]');
                    const avatarFilled = avatarChooser.querySelector('[key="avatar-chooser--filled"]');

                    leafac.setTippy({
                      event,
                      element: avatarChooser,
                      elementProperty: "uploadingIndicator",
                      tippyProps: {
                        trigger: "manual",
                        hideOnClick: false,
                        content: ${html`
                          <div
                            css="${css`
                              display: flex;
                              gap: var(--space--2);
                            `}"
                          >
                            $${application.web.locals.partials.spinner({
                              request,
                              response,
                            })}
                            Uploading…
                          </div>
                        `},
                      },
                    });

                    this.upload = async (fileList) => {
                      const body = new FormData();
                      body.append("avatar", fileList[0]);
                      this.value = "";
                      tippy.hideAll();
                      avatarChooser.uploadingIndicator.show();
                      const response = await fetch(${`https://${application.configuration.hostname}/settings/profile/avatar`}, {
                        method: "POST",
                        headers: { "CSRF-Protection": "true", },
                        cache: "no-store",
                        body,
                      });
                      avatarChooser.uploadingIndicator.hide();
                      if (!response.ok) {
                        leafac.setTippy({
                          event,
                          element: avatarChooser,
                          elementProperty: "uploadingError",
                          tippyProps: {
                            theme: "rose",
                            trigger: "manual",
                            content: await response.text(),
                          },
                        });
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
                css="${css`
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `}"
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
              $${application.web.locals.partials.contentEditor({
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

  application.web.post<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/settings/profile/avatar",
    asyncHandler(async (request, response, next) => {
      if (
        response.locals.user === undefined ||
        response.locals.user.emailVerifiedAt === null
      )
        return next();

      if (
        request.files?.avatar === undefined ||
        Array.isArray(request.files.avatar)
      )
        return response
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${application.configuration.administratorEmail}.`
          );

      const name = filenamify(request.files.avatar.name, { replacement: "-" });
      if (name.trim() === "")
        return response
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${application.configuration.administratorEmail}.`
          );

      if (!request.files.avatar.mimetype.startsWith("image/"))
        return response.status(422).send("The avatar must be an image.");
      if (request.files.avatar.truncated)
        return response
          .status(413)
          .send("The avatar must be smaller than 10MB.");

      const directory = cryptoRandomString({
        length: 20,
        type: "numeric",
      });
      await request.files.avatar.mv(
        path.join(
          application.configuration.dataDirectory,
          "files",
          directory,
          name
        )
      );

      const nameAvatar = `${name.slice(
        0,
        -path.extname(name).length
      )}--avatar.webp`;
      try {
        await sharp(request.files.avatar.data)
          .rotate()
          .resize({
            width: 256 /* var(--space--64) */,
            height: 256 /* var(--space--64) */,
            position: sharp.strategy.attention,
          })
          .toFile(
            path.join(
              application.configuration.dataDirectory,
              "files",
              directory,
              nameAvatar
            )
          );
      } catch {
        return response
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${application.configuration.administratorEmail}.`
          );
      }

      response.send(
        `https://${
          application.configuration.hostname
        }/files/${directory}/${encodeURIComponent(nameAvatar)}`
      );
    })
  );

  application.web.patch<
    {},
    any,
    { name?: string; avatar?: string; biography?: string },
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
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
      (request.body.avatar.trim() !== "" &&
        !(
          (request.body.avatar.startsWith(
            `https://${application.configuration.hostname}/files/`
          ) &&
            request.body.avatar.endsWith(`--avatar.webp`)) ||
          (application.configuration.demonstration &&
            request.body.avatar.startsWith(
              `https://${application.configuration.hostname}/node_modules/fake-avatars/avatars/webp/`
            ))
        )) ||
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
              : application.web.locals.partials.contentPreprocessed(
                  request.body.biography
                ).contentPreprocessed
          }
        WHERE "id" = ${response.locals.user.id}
      `
    );

    application.web.locals.helpers.Flash.set({
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

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/email-and-password", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      layoutUserSettings({
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                javascript="${javascript`
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
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "You must confirm your password because this is an important operation that affects your account.",
                      },
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
                javascript="${javascript`
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

  application.web.patch<
    {},
    any,
    { email?: string; newPassword?: string; passwordConfirmation?: string },
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/settings/email-and-password",
    asyncHandler(async (request, response, next) => {
      if (response.locals.user === undefined) return next();

      if (
        !(await application.web.locals.helpers.passwordConfirmation({
          request,
          response,
        }))
      ) {
        application.web.locals.helpers.Flash.set({
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
            application.web.locals.helpers.emailRegExp
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
          application.web.locals.helpers.Flash.set({
            request,
            response,
            theme: "rose",
            content: html`
              There already exists another account with this email address.
            `,
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
                      The Courselore account that used the email address
                      <code>${response.locals.user.email}</code>
                      has been updated to use the email address
                      <code>${request.body.email}</code>.
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
        application.web.locals.helpers.emailVerification({
          request,
          response,
          userId: response.locals.user.id,
          userEmail: request.body.email,
        });

        application.web.locals.helpers.Flash.set({
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
              application.web.locals.configuration.argon2
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
        application.got
          .post(
            `http://127.0.0.1:${application.ports.workerEventsAny}/send-email`
          )
          .catch((error) => {
            response.locals.log(
              "FAILED TO EMIT ‘/send-email’ EVENT",
              String(error),
              error?.stack
            );
          });

        application.web.locals.helpers.Session.closeAllAndReopen({
          request,
          response,
          userId: response.locals.user.id,
        });

        application.web.locals.helpers.Flash.set({
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

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/notifications", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      layoutUserSettings({
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div key="isEmailNotificationsFor" class="label">
              <p class="label--text">Email Notifications</p>
              <div
                css="${css`
                  display: flex;
                `}"
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
                    javascript="${javascript`
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
                css="${css`
                  margin-left: var(--space--10);
                  display: flex;
                  flex-wrap: wrap;
                  column-gap: var(--space--8);
                  row-gap: var(--space--1);
                `}"
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
                css="${css`
                  display: flex;
                `}"
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
                    javascript="${javascript`
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
                css="${css`
                  display: flex;
                `}"
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
                    javascript="${javascript`
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
                css="${css`
                  display: flex;
                `}"
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
                    javascript="${javascript`
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
                css="${css`
                  display: flex;
                `}"
              >
                <label
                  class="button button--tight button--tight--inline disabled"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        content: "You always receive email notifications for staff announcements.",
                      },
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

  application.web.patch<
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
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
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

    application.web.locals.helpers.Flash.set({
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

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/settings/account", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    response.send(
      layoutUserSettings({
        request,
        response,
        head: html`<title>Account · User Settings · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-sliders"></i>
            User Settings ·
            <i class="bi bi-person-fill-gear"></i>
            Account
          </h2>

          <form
            method="DELETE"
            action="https://${application.configuration
              .hostname}/settings/account"
            novalidate
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div class="label">
              <p class="label--text">
                Email Confirmation
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--transparent"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "You must confirm your email because this is an important operation that affects your account.",
                      },
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
              </p>
              <input
                type="email"
                name="emailConfirmation"
                required
                class="input--text"
              />
            </div>
            <div class="label">
              <p class="label--text">
                Password Confirmation
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--transparent"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "You must confirm your password because this is an important operation that affects your account.",
                      },
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
                type="button"
                class="button button--full-width-on-small-screen button--rose"
                javascript="${javascript`
                  leafac.setTippy({
                    event,
                    element: this,
                    elementProperty: "dropdown",
                    tippyProps: {
                      theme: "rose",
                      trigger: "click",
                      interactive: true,
                      content: ${html`
                        <div
                          css="${css`
                            padding: var(--space--2);
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--4);
                          `}"
                        >
                          <p>Are you sure you want to remove your account?</p>
                          <p>
                            <strong
                              css="${css`
                                font-weight: var(--font-weight--bold);
                              `}"
                            >
                              You may not undo this action!
                            </strong>
                          </p>
                          <p>
                            <strong
                              css="${css`
                                font-weight: var(--font-weight--bold);
                              `}"
                            >
                              You’ll lose access to Courselore and all the
                              courses in which you participate.
                            </strong>
                          </p>
                          <button class="button button--rose">
                            <i class="bi bi-person-x-fill"></i>
                            Remove Your Account
                          </button>
                        </div>
                      `},  
                    },
                  });
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

  application.web.delete<
    {},
    any,
    { emailConfirmation?: string; passwordConfirmation?: string },
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/settings/account",
    asyncHandler(async (request, response, next) => {
      if (
        response.locals.user === undefined ||
        response.locals.user.emailVerifiedAt === null
      )
        return next();

      if (
        request.body.emailConfirmation !== response.locals.user.email ||
        !(await application.web.locals.helpers.passwordConfirmation({
          request,
          response,
        }))
      ) {
        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`Incorrect email/password confirmation.`,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/settings/account`
        );
      }

      application.database.run(
        sql`
          DELETE FROM "users"
          WHERE "id" = ${response.locals.user.id}
       `
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          Account removed successfully.<br /><br />
          Thanks for having used Courselore.<br /><br />
          If you wish to give us feedback, please reach out via
          <a
            href="${application.addresses
              .metaCourseloreInvitation}${qs.stringify(
              {
                redirect: `conversations/new/note${qs.stringify(
                  {
                    newConversation: {
                      title: "Feedback after having removed account",
                      tagsReferences: ["5387659377"],
                      participants: "staff",
                      isAnnouncement: "false",
                      isPinned: "false",
                    },
                  },
                  { addQueryPrefix: true }
                )}`,
              },
              { addQueryPrefix: true }
            )}"
            target="_blank"
            class="link"
            >Meta Courselore</a
          >,
          <a
            href="mailto:${application.configuration
              .administratorEmail}${qs.stringify(
              { subject: "Feedback after having removed account" },
              { addQueryPrefix: true }
            )}"
            target="_blank"
            class="link"
            >${application.configuration.administratorEmail}</a
          >, or
          <a
            href="https://github.com/courselore/courselore/issues/new${qs.stringify(
              { title: "Feedback after having removed account" },
              { addQueryPrefix: true }
            )}"
            target="_blank"
            class="link"
            >GitHub</a
          >.
        `,
      });

      application.web.locals.helpers.Session.close({ request, response });
      response
        .header(
          "Clear-Site-Data",
          `"*", "cache", "cookies", "storage", "executionContexts"`
        )
        .redirect(303, `https://${application.configuration.hostname}/`);
    })
  );

  application.web.patch<
    {},
    any,
    {
      preferContentEditorProgrammerMode?: "true" | "false";
      preferContentEditorToolbarInCompact?: "true" | "false";
      preferAnonymous?: "true" | "false";
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/preferences", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    if (
      ![undefined, "true", "false"].includes(
        request.body.preferContentEditorProgrammerMode
      ) ||
      ![undefined, "true", "false"].includes(
        request.body.preferContentEditorToolbarInCompact
      ) ||
      ![undefined, "true", "false"].includes(request.body.preferAnonymous)
    )
      return next("Validation");

    if (typeof request.body.preferContentEditorProgrammerMode === "string")
      application.database.run(
        sql`
          UPDATE "users"
          SET
            "preferContentEditorProgrammerModeAt" = ${
              request.body.preferContentEditorProgrammerMode === "true"
                ? new Date().toISOString()
                : null
            }
          WHERE "id" = ${response.locals.user.id}
        `
      );

    if (typeof request.body.preferContentEditorToolbarInCompact === "string")
      application.database.run(
        sql`
          UPDATE "users"
          SET
            "preferContentEditorToolbarInCompactAt" = ${
              request.body.preferContentEditorToolbarInCompact === "true"
                ? new Date().toISOString()
                : null
            }
          WHERE "id" = ${response.locals.user.id}
        `
      );

    if (typeof request.body.preferAnonymous === "string")
      application.database.run(
        sql`
          UPDATE "users"
          SET
            "preferAnonymousAt" = ${
              request.body.preferAnonymous === "true"
                ? new Date().toISOString()
                : null
            }
          WHERE "id" = ${response.locals.user.id}
        `
      );

    response.end();
  });

  application.web.patch<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/latest-news-version", (request, response, next) => {
    if (response.locals.user === undefined) return next();

    application.database.run(
      sql`
        UPDATE "users"
        SET "latestNewsVersion" = ${application.version}
        WHERE "id" = ${response.locals.user.id}
      `
    );

    response.end();
  });
};
