import express from "express";
import { BaseMiddlewareLocals } from "./global-middleware.js";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";

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

export type UserEmailNotifications = typeof userEmailNotificationses[number];
export const userEmailNotificationses = [
  "all-messages",
  "staff-announcements-and-mentions",
  "none",
] as const;

export default ({}: {}): {} => {
  const userPartial = ({
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
  }): HTML => {
    let userAvatar: HTML | undefined;
    let userName: HTML | undefined;

    if (anonymous !== true && user !== undefined) {
      if (avatar) {
        userAvatar =
          user === "no-longer-enrolled"
            ? html`<svg
                viewBox="0 0 24 24"
                class="${res.locals.localCSS(css`
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
                    class="${res.locals.localCSS(css`
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
                class="${res.locals.localCSS(css`
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
                class="${res.locals.localCSS(css`
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
                  class="${res.locals.localCSS(css`
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
            class="${res.locals.localCSS(css`
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
              class="${res.locals.localCSS(css`
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
              oninteractive="${javascript`
                const element = this;
                const lastSeenOnlineAt = ${new Date(
                  user.lastSeenOnlineAt
                ).getTime()};
                tippy(element, {
                  touch: false,
                  content: "Online",
                });
                (function update() {
                  element.hidden = Date.now() - lastSeenOnlineAt > 5 * 60 * 1000;
                  window.setTimeout(update, 60 * 1000);
                })();
              `}"
              onbeforeelupdated="${javascript`
                return false;
              `}"
            ></span>
          </span>`;
      }

      if (name !== false)
        userName = html`<span
          class="${res.locals.localCSS(css`
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
                oninteractive="${javascript`
                    tippy(this, {
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
        oninteractive="${javascript`
          tippy(this, {
            interactive: true,
            appendTo: document.body,
            delay: [1000, null],
            content: ${res.locals.HTMLForJavaScript(
              html`
                <div
                  class="${res.locals.localCSS(css`
                    max-height: var(--space--56);
                    padding: var(--space--1) var(--space--2);
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      gap: var(--space--4);
                      align-items: center;
                    `)}"
                  >
                    <div>
                      $${userPartial({
                        req,
                        res,
                        enrollment,
                        user,
                        name: false,
                        size: "xl",
                      })}
                    </div>
                    <div
                      class="${res.locals.localCSS(css`
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
                          ? html` <div class="secondary">${user!.email}</div> `
                          : html``}
                        $${user === "no-longer-enrolled"
                          ? html`
                              <div class="secondary">
                                This person has left the course.
                              </div>
                            `
                          : html`
                              <div
                                class="secondary ${res.locals.localCSS(css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `)}"
                              >
                                Last seen online
                                <time
                                  datetime="${new Date(
                                    user!.lastSeenOnlineAt
                                  ).toISOString()}"
                                  oninteractive="${javascript`
                                    leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                  `}"
                                  onbeforeelchildrenupdated="${javascript`
                                    return false;
                                  `}"
                                ></time>
                              </div>
                            `}
                        $${enrollment !== undefined &&
                        enrollment !== "no-longer-enrolled" &&
                        enrollment.role === "staff"
                          ? html`
                              <div
                                class="text--sky ${res.locals.localCSS(css`
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
                    ? processContent({
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
          class="${res.locals.localCSS(css`
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
              class="${res.locals.localCSS(css`
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
          class="${res.locals.localCSS(css`
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
        oninteractive="${javascript`
          tippy(this, {
            touch: false,
            content: "Anonymous to Other Students",
          });
        `}"
        >$${anonymousHTML}</span
      >`;

    return userHTML !== undefined && anonymousHTML !== undefined
      ? html`<span>$${anonymousHTML} ($${userHTML})</span>`
      : userHTML !== undefined
      ? userHTML
      : anonymousHTML !== undefined
      ? anonymousHTML
      : html``;
  };

  return {
    userPartial,
  };
};
