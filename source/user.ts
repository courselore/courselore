import express from "express";
import { BaseMiddlewareLocals } from "./global-middlewares.js";
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

type UserPartial = ({
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

export default (): { userPartial: UserPartial } => {
  const userPartial: UserPartial = ({
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

  const userSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsSignedInMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }) =>
    settingsLayout({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        User Settings
      `,
      menu: html`
        <a
          href="${baseURL}/settings/profile"
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
          href="${baseURL}/settings/update-email-and-password"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/update-email-and-password"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-key"></i>
          Update Email & Password
        </a>
        <a
          href="${baseURL}/settings/notifications-preferences"
          class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
            "/settings/notifications-preferences"
          )
            ? "button--blue"
            : "button--transparent"}"
        >
          <i class="bi bi-bell"></i>
          Notifications Preferences
        </a>
      `,
      body,
    });

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings",
    ...isSignedInMiddleware,
    (req, res) => {
      res.redirect(`${baseURL}/settings/profile`);
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile",
    ...isSignedInMiddleware,
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
              method="POST"
              action="${baseURL}/settings/profile?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--4);
                  @media (max-width: 400px) {
                    flex-direction: column;
                  }
                `)}"
              >
                <div
                  class="avatar-chooser ${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    & > * {
                      width: var(--space--32);
                      height: var(--space--32);
                    }
                  `)}"
                  oninteractive="${javascript`
                    this.addEventListener("dragover", (event) => {
                      event.preventDefault();
                    });
                    this.addEventListener("drop", (event) => {
                      event.preventDefault();
                      this.querySelector(".avatar-chooser--upload").upload(event.dataTransfer.files);
                    });
                  `}"
                >
                  <div
                    class="avatar-chooser--empty"
                    $${res.locals.user.avatar === null ? html`` : html`hidden`}
                  >
                    <button
                      type="button"
                      class="button button--transparent ${res.locals
                        .localCSS(css`
                        transform: scale(8)
                          translate(
                            calc(var(--space---px) + 50% + var(--space---px)),
                            calc(var(--space---px) + 50% + var(--space---px))
                          );
                        padding: var(--space--px);
                        margin: var(--space---px);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Add Avatar",
                        });
                        this.addEventListener("click", () => {
                          this.closest("form").querySelector(".avatar-chooser--upload").click();
                        });
                      `}"
                    >
                      $${userPartial({
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
                    class="avatar-chooser--filled ${res.locals.localCSS(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                        position: relative;
                      }
                    `)}"
                  >
                    <button
                      type="button"
                      class="button button--transparent ${res.locals
                        .localCSS(css`
                        padding: var(--space--2);
                        margin: var(--space---2);
                        border-radius: var(--border-radius--circle);
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Update Avatar",
                        });
                        this.addEventListener("click", () => {
                          this.closest("form").querySelector(".avatar-chooser--upload").click();
                        });
                      `}"
                    >
                      <img
                        src="${res.locals.user.avatar ?? ""}"
                        alt="Avatar"
                        loading="lazy"
                        class="${res.locals.localCSS(css`
                          width: 100%;
                          height: 100%;
                          border-radius: var(--border-radius--circle);
                        `)}"
                      />
                    </button>
                    <button
                      type="button"
                      class="button button--rose ${res.locals.localCSS(css`
                        place-self: end;
                        width: var(--font-size--2xl);
                        height: var(--font-size--2xl);
                        padding: var(--space--0);
                        border-radius: var(--border-radius--circle);
                        transform: translate(-20%, -20%);
                        align-items: center;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          theme: "rose",
                          touch: false,
                          content: "Remove Avatar",
                        });
                        this.addEventListener("click", () => {
                          const form = this.closest("form");
                          const avatar = form.querySelector('[name="avatar"]')
                          avatar.value = "";
                          form.querySelector(".avatar-chooser--empty").hidden = false;
                          form.querySelector(".avatar-chooser--filled").hidden = true;
                        });
                      `}"
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                  <input
                    type="file"
                    class="avatar-chooser--upload"
                    accept="image/*"
                    hidden
                    oninteractive="${javascript`
                      this.isModified = false;
                      const avatarChooser = this.closest(".avatar-chooser");
                      const avatar = avatarChooser.querySelector('[name="avatar"]');
                      const avatarEmpty = avatarChooser.querySelector(".avatar-chooser--empty");
                      const avatarFilled = avatarChooser.querySelector(".avatar-chooser--filled");
                      const uploadingIndicator = tippy(avatarChooser, {
                        trigger: "manual",
                        hideOnClick: false,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                gap: var(--space--2);
                              `)}"
                            >
                              $${spinner({ req, res })} Uploading…
                            </div>
                          `
                        )},
                      });
                      this.upload = async (fileList) => {
                        const body = new FormData();
                        body.append("_csrf", ${JSON.stringify(
                          req.csrfToken()
                        )});
                        body.append("avatar", fileList[0]);
                        this.value = "";
                        tippy.hideAll();
                        uploadingIndicator.show();
                        const response = await fetch("${baseURL}/settings/profile/avatar", {
                          method: "POST",
                          body,
                        });
                        uploadingIndicator.hide();
                        if (!response.ok) {
                          const tooltip = tippy(avatarChooser, {
                            theme: "validation--error",
                            trigger: "manual",
                            showOnCreate: true,
                            onHidden: () => {
                              tooltip.destroy();
                            },
                            content: await response.text(),
                          });
                          return;
                        }
                        const avatarURL = await response.text();
                        avatar.value = avatarURL;
                        avatarEmpty.hidden = true;
                        avatarFilled.hidden = false;
                        avatarFilled.querySelector("img").setAttribute("src", avatarURL);
                      };
                      this.addEventListener("change", () => {
                        this.upload(this.files);
                      });
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
                  class="${res.locals.localCSS(css`
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
                $${contentEditor({
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
                  <i class="bi bi-pencil"></i>
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
  >("/settings/profile", ...isSignedInMiddleware, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      typeof req.body.avatar !== "string" ||
      typeof req.body.biography !== "string"
    )
      return next("validation");
    database.run(
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
                : processContent({
                    req,
                    res,
                    type: "source",
                    content: req.body.biography,
                  }).preprocessed
            }
        WHERE "id" = ${res.locals.user.id}
      `
    );
    Flash.set({
      req,
      res,
      content: html`
        <div class="flash--green">Profile updated successfully.</div>
      `,
    });
    res.redirect(`${baseURL}/settings/profile`);
  });

  app.post<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/profile/avatar",
    asyncHandler(async (req, res, next) => {
      if (
        req.files?.avatar === undefined ||
        Array.isArray(req.files.avatar) ||
        !req.files.avatar.mimetype.startsWith("image/")
      )
        return next("validation");
      if (req.files.avatar.truncated)
        return res.status(413).send("Avatars must be smaller than 10MB.");
      const name = filenamify(req.files.avatar.name, { replacement: "-" });
      if (name.trim() === "") return next("validation");
      const folder = cryptoRandomString({
        length: 20,
        type: "numeric",
      });
      await req.files.avatar.mv(
        path.join(dataDirectory, `files/${folder}/${name}`)
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
          .toFile(path.join(dataDirectory, `files/${folder}/${nameAvatar}`));
      } catch (error) {
        return next("validation");
      }
      res.send(`${baseURL}/files/${folder}/${encodeURIComponent(nameAvatar)}`);
    }),
    ((err, req, res, next) => {
      if (err === "validation")
        return res
          .status(422)
          .send(
            `Something went wrong in uploading your avatar. Please report to the system administrator at ${administratorEmail}.`
          );
      next(err);
    }) as express.ErrorRequestHandler<{}, any, {}, {}, BaseMiddlewareLocals>
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/update-email-and-password",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>
            Update Email & Password · User Settings · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-key"></i>
              Update Email & Password
            </h2>

            <form
              method="POST"
              action="${baseURL}/settings/update-email-and-password?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
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
                  <i class="bi bi-key"></i>
                  Update Email
                </button>
              </div>
            </form>

            <hr class="separator" />

            <form
              method="POST"
              action="${baseURL}/settings/update-email-and-password?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
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
                  oninteractive="${javascript`
                    this.addEventListener("validate", (event) => {
                      if (this.value === this.closest("form").querySelector('[name="newPassword"]').value) return;
                      event.stopImmediatePropagation();
                      event.detail.error = "New Password & New Password Confirmation don’t match.";
                    });
                  `}"
                />
              </label>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-key"></i>
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
    "/settings/update-email-and-password",
    ...isSignedInMiddleware,
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
        Flash.set({
          req,
          res,
          content: html`<div class="flash--rose">Incorrect password.</div>`,
        });
        return res.redirect(`${baseURL}/settings/update-email-and-password`);
      }

      if (typeof req.body.email === "string") {
        if (req.body.email.match(emailRegExp) === null)
          return next("validation");
        if (
          database.get<{}>(
            sql`
              SELECT TRUE FROM "users" WHERE "email" = ${req.body.email}
            `
          ) !== undefined
        ) {
          Flash.set({
            req,
            res,
            content: html`<div class="flash--rose">Email already taken.</div>`,
          });
          return res.redirect(`${baseURL}/settings/update-email-and-password`);
        }

        database.run(
          sql`
            UPDATE "users"
            SET "email" = ${req.body.email},
                "emailConfirmedAt" = ${null}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        sendEmailConfirmationEmail({
          req,
          res,
          userId: res.locals.user.id,
          userEmail: req.body.email,
        });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Email updated successfully.</div>
          `,
        });
      }

      if (typeof req.body.newPassword === "string") {
        if (
          req.body.newPassword.trim() === "" ||
          req.body.newPassword.length < 8
        )
          return next("validation");

        database.run(
          sql`
            UPDATE "users"
            SET "password" =  ${await argon2.hash(
              req.body.newPassword,
              app.locals.options.argon2
            )}
            WHERE "id" = ${res.locals.user.id}
          `
        );
        Session.closeAllAndReopen({ req, res, userId: res.locals.user.id });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Password updated successfully.</div>
          `,
        });
      }

      res.redirect(`${baseURL}/settings/update-email-and-password`);
    })
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/settings/notifications-preferences",
    ...isSignedInMiddleware,
    (req, res) => {
      res.send(
        userSettingsLayout({
          req,
          res,
          head: html`<title>
            Notifications Preferences · User Settings · Courselore
          </title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              User Settings ·
              <i class="bi bi-bell"></i>
              Notifications Preferences
            </h2>

            <form
              method="POST"
              action="${baseURL}/settings/notifications-preferences?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Email Notifications</p>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="all-messages"
                      required
                      $${res.locals.user.emailNotifications === "all-messages"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    All messages
                  </label>
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="staff-announcements-and-mentions"
                      required
                      $${res.locals.user.emailNotifications ===
                      "staff-announcements-and-mentions"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    Staff announcements and @mentions
                  </label>
                </div>
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label class="button button--tight button--tight--inline">
                    <input
                      type="radio"
                      name="emailNotifications"
                      value="none"
                      required
                      $${res.locals.user.emailNotifications === "none"
                        ? html`checked`
                        : html``}
                      class="input--radio"
                    />
                    None
                  </label>
                </div>
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil"></i>
                  Update Notifications Preferences
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
    { emailNotifications?: UserEmailNotifications },
    {},
    IsSignedInMiddlewareLocals
  >(
    "/settings/notifications-preferences",
    ...isSignedInMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.emailNotifications !== "string" ||
        !userEmailNotificationses.includes(req.body.emailNotifications)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "users"
          SET "emailNotifications" = ${req.body.emailNotifications}
          WHERE "id" = ${res.locals.user.id}
        `
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            Notifications preferences updated successfully.
          </div>
        `,
      });

      res.redirect(`${baseURL}/settings/notifications-preferences`);
    }
  );

  return {
    userPartial,
  };
};
