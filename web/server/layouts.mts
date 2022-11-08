import timers from "node:timers/promises";
import express from "express";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import dedent from "dedent";
import qs from "qs";
import cryptoRandomString from "crypto-random-string";
import semver from "semver";
import {
  Application,
  ResponseLocalsBase,
  ResponseLocalsSignedIn,
  ResponseLocalsCourseEnrolled,
} from "./index.mjs";

export type ApplicationLayouts = {
  server: {
    locals: {
      layouts: {
        base: ({
          request,
          response,
          head,
          extraHeaders,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            ResponseLocalsBase & Partial<ResponseLocalsCourseEnrolled>
          >;
          response: express.Response<
            any,
            ResponseLocalsBase & Partial<ResponseLocalsCourseEnrolled>
          >;
          head: HTML;
          extraHeaders?: HTML;
          body: HTML;
        }) => HTML;
        box: ({
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
            ResponseLocalsBase & Partial<ResponseLocalsCourseEnrolled>
          >;
          response: express.Response<
            any,
            ResponseLocalsBase & Partial<ResponseLocalsCourseEnrolled>
          >;
          head: HTML;
          body: HTML;
        }) => HTML;
        application: ({
          request,
          response,
          head,
          showCourseSwitcher,
          extraHeaders,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            ResponseLocalsSignedIn & Partial<ResponseLocalsCourseEnrolled>
          >;
          response: express.Response<
            any,
            ResponseLocalsSignedIn & Partial<ResponseLocalsCourseEnrolled>
          >;
          head: HTML;
          showCourseSwitcher?: boolean;
          extraHeaders?: HTML;
          body: HTML;
        }) => HTML;
        main: ({
          request,
          response,
          head,
          showCourseSwitcher,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            ResponseLocalsSignedIn & Partial<ResponseLocalsCourseEnrolled>
          >;
          response: express.Response<
            any,
            ResponseLocalsSignedIn & Partial<ResponseLocalsCourseEnrolled>
          >;
          head: HTML;
          showCourseSwitcher?: boolean;
          body: HTML;
        }) => HTML;
        settings: ({
          request,
          response,
          head,
          menuButton,
          menu,
          body,
        }: {
          request: express.Request<{}, any, {}, {}, ResponseLocalsSignedIn>;
          response: express.Response<any, ResponseLocalsSignedIn>;
          head: HTML;
          menuButton: HTML;
          menu: HTML;
          body: HTML;
        }) => HTML;
        partial: ({
          request,
          response,
          body,
        }: {
          request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
          response: express.Response<any, ResponseLocalsBase>;
          body: HTML;
        }) => HTML;
      };
      partials: {
        logo: (options?: { size?: number }) => HTML;
        spinner: ({
          request,
          response,
          size,
        }: {
          request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
          response: express.Response<any, ResponseLocalsBase>;
          size?: number;
        }) => HTML;
        reportIssueHref: string;
      };
      helpers: {
        Flash: {
          maxAge: number;
          set({
            request,
            response,
            theme,
            content,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
            theme: string;
            content: HTML;
          }): void;
          get({
            request,
            response,
          }: {
            request: express.Request<{}, any, {}, {}, ResponseLocalsBase>;
            response: express.Response<any, ResponseLocalsBase>;
          }): { theme: string; content: HTML } | undefined;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.locals.layouts.base = ({
    request,
    response,
    head,
    extraHeaders = html``,
    body,
  }) => {
    const baseLayoutBody = html`
      <body
        css="${response.locals.css(css`
          font-family: "Public SansVariable", var(--font-family--sans-serif);
          font-size: var(--font-size--sm);
          line-height: var(--line-height--sm);
          color: var(--color--gray--medium--700);
          background-color: var(--color--gray--medium--50);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--200);
            background-color: var(--color--gray--medium--900);
          }
        `)}"
      >
        <div
          key="viewport"
          css="${response.locals.css(css`
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `)}"
          onload="${javascript`
            this.onscroll = () => {
              this.scroll(0, 0);
            };

            ${(() => {
              const flash = application.server.locals.helpers.Flash.get({
                request,
                response,
              });
              return flash === undefined
                ? javascript``
                : javascript`
                    const body = document.querySelector("body");

                    (body.flash ??= tippy(body)).setProps({
                      appendTo: body,
                      trigger: "manual",
                      hideOnClick: false,
                      theme: ${JSON.stringify(flash.theme)},
                      arrow: false,
                      interactive: true,
                      content: ${response.locals.html(
                        html`
                          <div
                            css="${response.locals.css(css`
                              padding: var(--space--1) var(--space--2);
                              display: flex;
                              gap: var(--space--2);
                              align-items: flex-start;
                            `)}"
                          >
                            <div>$${flash.content}</div>
                            <button
                              class="button button--tight button--tight--inline button--transparent"
                              onload="${javascript`
                                (this.tooltip ??= tippy(this)).setProps({
                                  theme: "green",
                                  touch: false,
                                  content: ${response.locals.html(
                                    html`
                                      Close
                                      <span class="keyboard-shortcut">
                                        (<span
                                          onload="${javascript`
                                            this.hidden = leafac.isAppleDevice;
                                          `}"
                                          >Esc</span
                                        ><span
                                          class="keyboard-shortcut--cluster"
                                          onload="${javascript`
                                            this.hidden = !leafac.isAppleDevice;
                                          `}"
                                          ><i class="bi bi-escape"></i></span
                                        >)
                                      </span>
                                    `
                                  )},
                                });

                                this.onclick = () => {
                                  this.closest("[data-tippy-root]")._tippy.hide();
                                };

                                const keys = "escape";
                                (this.mousetrap ??= new Mousetrap()).bind(keys, () => { this.click(); this.mousetrap.unbind(keys); return false; });
                              `}"
                            >
                              <i class="bi bi-x-circle"></i>
                            </button>
                          </div>
                        `
                      )},
                    });
                    body.flash.show();
                  `;
            })()}

            document.querySelector('[key="theme-color--light"]').setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--color--${
              response.locals.enrollment?.accentColor
            }--500"));
            document.querySelector('[key="theme-color--dark"]').setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--color--${
              response.locals.enrollment?.accentColor
            }--600"));
          `}"
        >
          $${response.locals.enrollment === undefined
            ? html``
            : html`
                <div
                  key="header--accent-color"
                  css="${response.locals.css(css`
                    height: var(--border-width--8);
                    display: flex;
                  `)}"
                >
                  <button
                    class="button"
                    css="${response.locals.css(css`
                      background-color: var(
                        --color--${response.locals.enrollment.accentColor}--500
                      );
                      @media (prefers-color-scheme: dark) {
                        background-color: var(
                          --color--${response.locals.enrollment.accentColor}--600
                        );
                      }
                      border-radius: var(--border-radius--none);
                      flex: 1;
                    `)}"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "What’s This?",
                      });

                      (this.dropdown ??= tippy(this)).setProps({
                        trigger: "click",
                        interactive: true,
                        content: ${response.locals.html(
                          html`
                            <div
                              css="${response.locals.css(css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `)}"
                            >
                              <p>
                                This bar with an accent color appears at the top
                                of pages related to this course to help you
                                differentiate between courses.
                              </p>
                              <a
                                href="https://${application.configuration
                                  .hostname}/courses/${response.locals.course!
                                  .reference}/settings/your-enrollment"
                                class="button button--blue"
                                css="${response.locals.css(css`
                                  width: 100%;
                                `)}"
                              >
                                <i class="bi bi-palette-fill"></i>
                                Update Accent Color
                              </a>
                            </div>
                          `
                        )},
                      });
                    `}"
                  ></button>
                </div>
              `}
          $${(() => {
            let header = html``;

            let headerMeta = html``;

            if (application.configuration.demonstration)
              headerMeta += html`
                <div>
                  <button
                    class="button button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        interactive: true,
                        content: ${response.locals.html(
                          html`
                            <div
                              css="${response.locals.css(css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                              `)}"
                            >
                              <p>
                                This Courselore installation is running in
                                demonstration mode and must not be used for real
                                courses. Any data may be lost, including users,
                                courses, invitations, conversations, messages,
                                and so forth. Emails aren’t delivered. You may
                                create demonstration data to give you a better
                                idea of what Courselore looks like in use.
                              </p>
                              <form
                                method="POST"
                                action="https://${application.configuration
                                  .hostname}/demonstration-data"
                              >
                                <button
                                  class="button button--blue"
                                  css="${response.locals.css(css`
                                    width: 100%;
                                  `)}"
                                >
                                  <i class="bi bi-easel-fill"></i>
                                  Create Demonstration Data
                                </button>
                              </form>
                            </div>
                          `
                        )},
                      });
                    `}"
                  >
                    <i class="bi bi-easel"></i>
                    Demonstration Mode
                  </button>
                </div>
              `;

            if (application.configuration.environment !== "production")
              headerMeta += html`
                <form
                  method="DELETE"
                  action="https://${application.configuration
                    .hostname}/turn-off"
                >
                  <button class="button button--transparent">
                    <i class="bi bi-power"></i>
                    Turn off
                  </button>
                </form>
              `;

            if (headerMeta !== html``)
              header += html`
                <div
                  key="header--meta"
                  css="${response.locals.css(css`
                    justify-content: center;
                    flex-wrap: wrap;
                  `)}"
                >
                  $${headerMeta}
                </div>
              `;

            header += extraHeaders;

            return header !== html``
              ? html`
                  <div
                    key="header"
                    css="${response.locals.css(css`
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      background-color: var(--color--gray--medium--100);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--gray--medium--800);
                      }
                      display: flex;
                      flex-direction: column;
                      & > * {
                        padding: var(--space--0) var(--space--4);
                        border-bottom: var(--border-width--1) solid
                          var(--color--gray--medium--200);
                        @media (prefers-color-scheme: dark) {
                          border-color: var(--color--gray--medium--700);
                        }
                        display: flex;
                      }
                    `)}"
                  >
                    $${header}
                  </div>
                `
              : html``;
          })()}

          <div
            key="main"
            css="${response.locals.css(css`
              flex: 1;
              overflow: auto;
            `)}"
            onload="${javascript`
              if (
                event?.detail?.previousLocation?.origin !== window.location.origin ||
                event?.detail?.previousLocation?.pathname !== window.location.pathname ||
                event?.detail?.previousLocation?.search !== window.location.search
              )
                this.scroll(0, 0);
            `}"
          >
            $${body}
          </div>

          <div
            key="footer"
            css="${response.locals.css(css`
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              padding: var(--space--0) var(--space--4);
              border-top: var(--border-width--1) solid
                var(--color--gray--medium--200);
              @media (prefers-color-scheme: dark) {
                border-color: var(--color--gray--medium--700);
              }
              display: flex;
              justify-content: center;
              flex-wrap: wrap;
            `)}"
          >
            <div>
              <button
                class="button button--transparent"
                css="${response.locals.css(css`
                  align-items: center;
                `)}"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    trigger: "click",
                    interactive: true,
                    content: ${response.locals.html(
                      html`
                        <h3 class="heading">
                          $${application.server.locals.partials.logo({
                            size: 12 /* var(--space--3) */,
                          })}
                          <span>
                            Courselore <br />
                            Communication Platform for Education <br />
                            <small
                              class="secondary"
                              css="${response.locals.css(css`
                                font-size: var(--font-size--2xs);
                                line-height: var(--line-height--2xs);
                              `)}"
                            >
                              Version ${application.version}
                            </small>
                          </span>
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="https://${application.configuration
                              .hostname}/about"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-info-circle"></i>
                            About
                          </a>
                          <a
                            href="https://github.com/courselore/courselore"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-file-earmark-code"></i>
                            Source Code
                          </a>
                        </div>
                      `
                    )},
                  });
                `}"
              >
                $${application.server.locals.partials.logo({
                  size: 16 /* var(--space--4) */,
                })}
                Courselore
              </button>
            </div>

            <div>
              <button
                class="button button--transparent"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    trigger: "click",
                    interactive: true,
                    content: ${response.locals.html(
                      html`
                        <h3 class="heading">
                          <i class="bi bi-bug"></i>
                          Report an Issue
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="${application.addresses
                              .metaCourseloreInvitation}${qs.stringify(
                              {
                                redirect: `conversations/new/question${qs.stringify(
                                  {
                                    newConversation: {
                                      content: dedent`
                                        **What did you try to do?**



                                        **What did you expect to happen?**



                                        **What really happened?**



                                        **What error messages (if any) did you run into?**



                                        **Please provide as much relevant context as possible (operating system, browser, and so forth):**

                                        - Courselore Version: ${application.version}
                                      `,
                                      tagsReferences: ["9676584193"],
                                    },
                                  },
                                  { addQueryPrefix: true }
                                )}`,
                              },
                              { addQueryPrefix: true }
                            )}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                            css="${response.locals.css(css`
                              align-items: center;
                            `)}"
                          >
                            $${application.server.locals.partials.logo({
                              size: 14 /* var(--space--3-5) */,
                            })}
                            Meta Courselore
                          </a>
                          <a
                            href="${application.server.locals.partials
                              .reportIssueHref}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-envelope"></i>
                            ${application.configuration.administratorEmail}
                          </a>
                          <a
                            href="https://github.com/courselore/courselore/issues/new${qs.stringify(
                              {
                                body: dedent`
                                  **What did you try to do?**



                                  **What did you expect to happen?**



                                  **What really happened?**



                                  **What error messages (if any) did you run into?**



                                  **Please provide as much relevant context as possible (operating system, browser, and so forth):**

                                  - Courselore Version: ${application.version}
                                `,
                              },
                              { addQueryPrefix: true }
                            )}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-github"></i>
                            GitHub Issues
                          </a>
                        </div>
                      `
                    )},
                  });
                `}"
              >
                <i class="bi bi-bug"></i>
                Report an Issue
              </button>
            </div>

            $${response.locals.user?.systemRole === "administrator" &&
            semver.gt(
              response.locals.administrationOptions!.latestVersion,
              application.version
            )
              ? html`
                  <div>
                    <button
                      class="button button--transparent strong text--green"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          interactive: true,
                          content: ${response.locals.html(
                            html`
                              <h3 class="heading">
                                <i class="bi bi-arrow-up-circle-fill"></i>
                                <span>
                                  Courselore
                                  <span
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        touch: false,
                                        content: "Current Courselore version",
                                      });
                                    `}"
                                  >
                                    ${application.version}
                                  </span>
                                  →
                                  <span
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        touch: false,
                                        content: "Latest Courselore version",
                                      });
                                    `}"
                                  >
                                    ${response.locals.administrationOptions!
                                      .latestVersion}
                                  </span>
                                </span>
                              </h3>

                              <div class="dropdown--menu">
                                <a
                                  href="https://github.com/courselore/courselore/blob/main/documentation/changelog.md"
                                  target="_blank"
                                  class="dropdown--menu--item button button--transparent"
                                >
                                  <i class="bi bi-fire"></i>
                                  Changelog
                                </a>
                                <a
                                  href="https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#update"
                                  target="_blank"
                                  class="dropdown--menu--item button button--transparent"
                                >
                                  <i class="bi bi-book"></i>
                                  Update Instructions
                                </a>
                                <a
                                  href="https://github.com/courselore/courselore/releases/tag/v${response
                                    .locals.administrationOptions!
                                    .latestVersion}"
                                  target="_blank"
                                  class="dropdown--menu--item button button--green"
                                >
                                  <i class="bi bi-download"></i>
                                  Download
                                </a>
                              </div>
                            `
                          )},
                        });
                      `}"
                    >
                    <span css="${response.locals.css(css`
                      display: flex;
                      gap: var(--space--2);
                      animation: bounce 1s 3;
                    `)}">
                      <i class="bi bi-arrow-up-circle-fill"></i>
                      Update Courselore
                      <span>
                    </button>
                  </div>
                `
              : html``}
          </div>
        </div>

        <div
          key="progress-bar"
          hidden
          css="${response.locals.css(css`
            position: fixed;
            top: 0;
            right: 0;
            left: 0;
          `)}"
          onload="${javascript`
            (this.tooltip ??= tippy(this)).setProps({
              touch: false,
              content: "Loading…",
            });

            window.onlivenavigate = () => {
              const parentElement = this;
              parentElement.hidden = false;
              const element = parentElement.querySelector("div");
              let width = 10;
              window.clearTimeout(element.updateTimeout);
              (function update() {
                if (parentElement.hidden || !leafac.isConnected(element)) return;
                element.style.width = width.toString() + "%";
                width += (90 - width) / (5 + Math.random() * 15);
                element.updateTimeout = window.setTimeout(update, 100 + Math.random() * 100);
              })();
            };

            window.onlivenavigateerror = () => {
              this.hidden = true;
            };
          `}"
        >
          <div
            css="${response.locals.css(css`
              height: var(--border-width--4);
              background-color: var(--color--blue--500);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--blue--600);
              }
              border: var(--border-width--1) solid var(--color--blue--600);
              border-top-width: var(--border-width--0);
              border-left-width: var(--border-width--0);
              @media (prefers-color-scheme: dark) {
                border-color: var(--color--blue--700);
              }
              transition-property: width;
              transition-duration: var(--transition-duration--150);
              transition-timing-function: var(
                --transition-timing-function--in-out
              );
            `)}"
          ></div>
        </div>

        $${response.locals.html.toString()}
      </body>
    `;
    return html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
          <meta
            name="description"
            content="Communication Platform for Education"
          />

          <link
            rel="stylesheet"
            href="https://${application.configuration.hostname}/${application
              .static["index.css"]}"
          />
          $${response.locals.css.toString()}

          <script src="https://${application.configuration
              .hostname}/${application.static["index.mjs"]}"></script>
          <script>
            leafac.customFormValidation();
            leafac.warnAboutLosingInputs();
            leafac.tippySetDefaultProps();
            leafac.liveConnection({
              version: $${JSON.stringify(application.version)},
              url: $${JSON.stringify(
                `https://${application.configuration.hostname}/live-connection`
              )},
              newVersionMessage:
                "Courselore has been updated. Please reload the page.",
              offlineMessage:
                "Failed to connect to the Courselore server. Please check your internet connection and try reloading the page.",
              liveReload: $${JSON.stringify(
                application.configuration.environment === "development"
              )},
            });
            leafac.liveNavigation(
              $${JSON.stringify(application.configuration.hostname)}
            );
          </script>

          <meta
            key="theme-color--light"
            name="theme-color"
            content=""
            media="(prefers-color-scheme: light)"
          />
          <meta
            key="theme-color--dark"
            name="theme-color"
            content=""
            media="(prefers-color-scheme: dark)"
          />

          $${head}
        </head>
        $${baseLayoutBody}
      </html>
    `;
  };

  if (application.configuration.environment !== "production")
    application.server.delete<{}, any, {}, {}, ResponseLocalsBase>(
      "/turn-off",
      (request, response) => {
        response.send(
          application.server.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                Thanks for trying Courselore! · Courselore · Communication
                Platform for Education
              </title>
            `,
            body: html`
              <p class="strong">Thanks for trying Courselore!</p>
              <p>
                Next steps:
                <a
                  href="https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md"
                  class="link"
                  >Learn how to install Courselore on your own server</a
                >
                or
                <a
                  href="https://github.com/courselore/courselore/blob/main/documentation/setting-up-for-development.md"
                  class="link"
                  >learn how to setup for development</a
                >.
              </p>
            `,
          })
        );
        process.exit();
      }
    );

  application.server.locals.layouts.box = ({ request, response, head, body }) =>
    application.server.locals.layouts.base({
      request,
      response,
      head,
      body: html`
        <div
          key="layout--box"
          css="${response.locals.css(css`
            min-width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          `)}"
        >
          <div
            css="${response.locals.css(css`
              flex: 1;
              max-width: var(--width--sm);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div
              key="main--logo"
              css="${response.locals.css(css`
                display: flex;
                justify-content: center;
              `)}"
            >
              <a
                href="https://${application.configuration.hostname}/"
                class="heading--display button button--transparent"
                css="${response.locals.css(css`
                  align-items: center;
                `)}"
              >
                $${application.server.locals.partials.logo()} Courselore
              </a>
            </div>
            <div
              key="main--${request.path}"
              css="${response.locals.css(css`
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                padding: var(--space--4);
                border-radius: var(--border-radius--lg);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              $${body}
            </div>

            $${application.configuration.hostname ===
            application.addresses.tryHostname
              ? html`
                  <div
                    key="main--try"
                    css="${response.locals.css(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `)}"
                  >
                    <div
                      css="${response.locals.css(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      css="${response.locals.css(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `)}"
                    >
                      <p>
                        This is a demonstration installation of Courselore and
                        must not be used for real courses. Any data may be lost,
                        including users, courses, invitations, conversations,
                        messages, and so forth. Emails aren’t delivered. You may
                        create demonstration data to give you a better idea of
                        what Courselore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="https://${application.configuration
                          .hostname}/demonstration-data"
                      >
                        <button
                          class="button button--amber"
                          css="${response.locals.css(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel-fill"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : application.configuration.demonstration
              ? html`
                  <div
                    key="main--demonstration"
                    css="${response.locals.css(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `)}"
                  >
                    <div
                      css="${response.locals.css(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      css="${response.locals.css(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `)}"
                    >
                      <p>
                        This Courselore installation is running in demonstration
                        mode and must not be used for real courses. Any data may
                        be lost, including users, courses, invitations,
                        conversations, messages, and so forth. Emails aren’t
                        delivered. You may create demonstration data to give you
                        a better idea of what Courselore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="https://${application.configuration
                          .hostname}/demonstration-data"
                      >
                        <button
                          class="button button--amber"
                          css="${response.locals.css(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel-fill"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : html``}
          </div>
        </div>
      `,
    });

  application.server.locals.layouts.application = ({
    request,
    response,
    head,
    showCourseSwitcher = true,
    extraHeaders = html``,
    body,
  }) =>
    application.server.locals.layouts.base({
      request: request,
      response: response,
      head,
      extraHeaders: html`
        <div
          key="header--menu--primary"
          css="${response.locals.css(css`
            padding-top: var(--space--1);
            padding-bottom: var(--space--1);
            gap: var(--space--4);
            align-items: center;
          `)}"
        >
          <a
            href="https://${application.configuration.hostname}/"
            class="button button--tight button--tight--inline button--transparent"
            onload="${javascript`
              (this.tooltip ??= tippy(this)).setProps({
                touch: false,
                content: "Courselore",
              });
            `}"
          >
            $${application.server.locals.partials.logo()}
          </a>

          <div
            css="${response.locals.css(css`
              font-size: var(--font-size--sm);
              line-height: var(--line-height--sm);
              flex: 1;
              min-width: var(--width--0);
            `)}"
          >
            $${(() => {
              const courseSwitcher = html`
                <div class="dropdown--menu">
                  $${application.server.locals.partials.courses({
                    request,
                    response,
                    tight: true,
                  })}
                </div>
              `;

              return response.locals.course !== undefined
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent strong"
                      css="${response.locals.css(css`
                        max-width: 100%;
                      `)}"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          interactive: true,
                          content: ${response.locals.html(
                            html`
                              <div
                                css="${response.locals.css(css`
                                  max-height: var(--space--80);
                                  overflow: auto;
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `)}"
                              >
                                <div>
                                  <h3 class="heading">
                                    <i class="bi bi-journal-text"></i>
                                    ${response.locals.course.name}
                                  </h3>
                                  $${response.locals.course.archivedAt !== null
                                    ? html`
                                        <div
                                          css="${response.locals.css(css`
                                            padding: var(--space--0)
                                              var(--space--2) var(--space--1);
                                            margin-top: var(--space---2);
                                          `)}"
                                        >
                                          $${application.server.locals.partials.courseArchived(
                                            { request, response }
                                          )}
                                        </div>
                                      `
                                    : html``}
                                  <div class="dropdown--menu">
                                    <a
                                      href="https://${application.configuration
                                        .hostname}/courses/${response.locals
                                        .course.reference}"
                                      class="dropdown--menu--item button ${request.path.includes(
                                        "/settings/"
                                      )
                                        ? "button--transparent"
                                        : "button--blue"}"
                                    >
                                      <i
                                        class="bi ${request.path.includes(
                                          "/settings/"
                                        )
                                          ? "bi-chat-text"
                                          : "bi-chat-text-fill"}"
                                      ></i>
                                      Conversations
                                    </a>
                                    <a
                                      href="https://${application.configuration
                                        .hostname}/courses/${response.locals
                                        .course.reference}/settings"
                                      class="dropdown--menu--item button ${request.path.includes(
                                        "/settings/"
                                      )
                                        ? "button--blue"
                                        : "button--transparent"}"
                                    >
                                      <i class="bi bi-sliders"></i>
                                      Course Settings
                                    </a>
                                  </div>
                                </div>
                                $${response.locals.enrollments.length > 1
                                  ? html`
                                      <div>
                                        <h3 class="heading">
                                          <i class="bi bi-arrow-left-right"></i>
                                          Switch to Another Course
                                        </h3>
                                        $${courseSwitcher}
                                      </div>
                                    `
                                  : html``}
                              </div>
                            `
                          )},
                        });
                      `}"
                    >
                      <i class="bi bi-journal-text"></i>
                      <span
                        css="${response.locals.css(css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        `)}"
                      >
                        ${response.locals.course.name}
                      </span>
                      $${response.locals.course.archivedAt !== null
                        ? html`
                            $${application.server.locals.partials.courseArchived(
                              {
                                request,
                                response,
                              }
                            )}
                          `
                        : html``}
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  `
                : showCourseSwitcher && response.locals.enrollments.length > 0
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent"
                      css="${response.locals.css(css`
                        max-width: 100%;
                      `)}"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          interactive: true,
                          content: ${response.locals.html(
                            html`
                              <div
                                css="${response.locals.css(css`
                                  max-height: var(--space--80);
                                  overflow: auto;
                                `)}"
                              >
                                $${courseSwitcher}
                              </div>
                            `
                          )},
                        });
                      `}"
                    >
                      Go to Your Courses
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  `
                : html``;
            })()}
          </div>

          <div>
            <button
              class="button button--tight button--tight--inline button--transparent"
              onload="${javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: ${JSON.stringify(
                    response.locals.invitations!.length === 0
                      ? "Add"
                      : `${
                          response.locals.invitations!.length
                        } pending invitation${
                          response.locals.invitations!.length === 1 ? "" : "s"
                        }`
                  )},
                });

                (this.dropdown ??= tippy(this)).setProps({
                  trigger: "click",
                  interactive: true,
                  content: ${response.locals.html(
                    html`
                      <div
                        css="${response.locals.css(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        $${response.locals.invitations!.length === 0
                          ? html``
                          : html`
                              <div>
                                <h3 class="heading">
                                  <i class="bi bi-journal-arrow-down"></i>
                                  Invitations
                                </h3>
                                <div class="dropdown--menu">
                                  $${response.locals.invitations!.map(
                                    (invitation) => html`
                                      <a
                                        key="invitation--${invitation.reference}"
                                        href="https://${application
                                          .configuration
                                          .hostname}/courses/${invitation.course
                                          .reference}/invitations/${invitation.reference}"
                                        class="dropdown--menu--item button button--transparent"
                                      >
                                        $${application.server.locals.partials.course(
                                          {
                                            request,
                                            response,
                                            course: invitation.course,
                                            tight: true,
                                          }
                                        )}
                                      </a>
                                    `
                                  )}
                                </div>
                              </div>
                              <hr class="dropdown--separator" />
                            `}
                        <div class="dropdown--menu">
                          <button
                            class="dropdown--menu--item button button--transparent"
                            onload="${javascript`
                              (this.tooltip ??= tippy(this)).setProps({
                                trigger: "click",
                                content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                              });
                            `}"
                          >
                            <i class="bi bi-journal-arrow-down"></i>
                            Enroll in an Existing Course
                          </button>
                          $${response.locals.mayCreateCourses
                            ? html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}/courses/new"
                                  class="dropdown--menu--item button button--transparent"
                                >
                                  <i class="bi bi-journal-plus"></i>
                                  Create a New Course
                                </a>
                              `
                            : html``}
                        </div>
                      </div>
                    `
                  )},
                });
              `}"
            >
              <div
                css="${response.locals.css(css`
                  display: grid;
                  & > * {
                    grid-area: 1 / 1;
                  }
                `)}"
              >
                <div
                  css="${response.locals.css(css`
                    font-size: var(--font-size--xl);
                    line-height: var(--line-height--xl);
                    font-weight: var(--font-weight--bold);
                    padding: var(--space--0) var(--space--1);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  `)}"
                >
                  +
                </div>
                $${response.locals.invitations!.length === 0
                  ? html``
                  : html`
                      <div
                        css="${response.locals.css(css`
                          background-color: var(--color--rose--500);
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--rose--600);
                          }
                          width: var(--space--1-5);
                          height: var(--space--1-5);
                          border-radius: var(--border-radius--circle);
                          justify-self: end;
                          transform: translateY(50%);
                        `)}"
                      ></div>
                    `}
              </div>
            </button>
          </div>

          <div>
            <button
              class="button button--tight button--tight--inline button--transparent"
              css="${response.locals.css(css`
                padding: var(--space--1);
                border-radius: var(--border-radius--circle);
              `)}"
              onload="${javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: ${JSON.stringify(response.locals.user.name)},
                });

                (this.dropdown ??= tippy(this)).setProps({
                  trigger: "click",
                  interactive: true,
                  content: ${response.locals.html(
                    html`
                      <div
                        css="${response.locals.css(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div
                          css="${response.locals.css(css`
                            padding: var(--space--0) var(--space--2);
                          `)}"
                        >
                          <p class="strong">${response.locals.user.name}</p>
                          <p class="secondary">${response.locals.user.email}</p>
                        </div>

                        <hr class="dropdown--separator" />

                        $${response.locals.user.systemRole === "administrator"
                          ? html`
                              <div class="dropdown--menu">
                                <a
                                  class="dropdown--menu--item button button--transparent"
                                  href="https://${application.configuration
                                    .hostname}/administration"
                                >
                                  <i class="bi bi-pc-display-horizontal"></i>
                                  Administration
                                </a>
                              </div>

                              <hr class="dropdown--separator" />
                            `
                          : html``}

                        <div class="dropdown--menu">
                          <a
                            class="dropdown--menu--item button button--transparent"
                            href="https://${application.configuration
                              .hostname}/settings"
                          >
                            <i class="bi bi-sliders"></i>
                            User Settings
                          </a>
                          <form
                            method="DELETE"
                            action="https://${application.configuration
                              .hostname}/sign-out"
                          >
                            <button
                              class="dropdown--menu--item button button--transparent"
                              onload="${javascript`
                                this.onclick = () => {
                                  localStorage.clear();
                                };
                              `}"
                            >
                              <i class="bi bi-box-arrow-right"></i>
                              Sign Out
                            </button>
                          </form>
                        </div>
                      </div>
                    `
                  )},
                });
              `}"
            >
              $${application.server.locals.partials.user({
                request,
                response,
                user: response.locals.user,
                decorate: false,
                name: false,
              })}
            </button>
          </div>
        </div>

        $${extraHeaders}
      `,
      body,
    });

  application.server.locals.layouts.main = ({
    request,
    response,
    head,
    showCourseSwitcher = true,
    body,
  }) =>
    application.server.locals.layouts.application({
      request,
      response,
      head,
      showCourseSwitcher,
      body: html`
        <div
          key="layout--main--${request.path}"
          css="${response.locals.css(css`
            display: flex;
            justify-content: center;
          `)}"
        >
          <div
            css="${response.locals.css(css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  application.server.locals.layouts.settings = ({
    request,
    response,
    head,
    menuButton,
    menu,
    body,
  }) =>
    application.server.locals.layouts.application({
      request,
      response,
      head,
      extraHeaders:
        menu === html``
          ? html``
          : html`
              <div
                key="header--menu--secondary--${request.path}"
                css="${response.locals.css(css`
                  justify-content: center;
                  @media (min-width: 700px) {
                    display: none;
                  }
                `)}"
              >
                <div
                  css="${response.locals.css(css`
                    padding: var(--space--1) var(--space--0);
                  `)}"
                >
                  <button
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        interactive: true,
                        content: ${response.locals.html(
                          html`<div class="dropdown--menu">$${menu}</div>`
                        )},
                      });
                    `}"
                  >
                    $${menuButton}
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
              </div>
            `,
      body: html`
        <div
          key="layout--settings--${request.path}"
          css="${response.locals.css(css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            gap: var(--space--8);
          `)}"
        >
          $${menu === html``
            ? html``
            : html`
                <div
                  key="layout--settings--menu"
                  css="${response.locals.css(css`
                    flex: 1;
                    max-width: var(--space--64);
                    @media (max-width: 699px) {
                      display: none;
                    }
                  `)}"
                >
                  <div class="menu-box">$${menu}</div>
                </div>
              `}
          <div
            key="layout--settings--main"
            css="${response.locals.css(css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  application.server.locals.layouts.partial = ({
    request,
    response,
    body,
  }) => html`
    <!DOCTYPE html>
    <html>
      <head>
        $${response.locals.css.toString()}
      </head>
      <body>
        $${body}$${response.locals.html.toString()}
      </body>
    </html>
  `;

  application.server.locals.partials.logo = (() => {
    // https://www.youtube.com/watch?v=dSK-MW-zuAc
    const order = 2;
    const viewBox = 24; /* var(--space--6) */
    // Hilbert
    // let points = [
    //   [1 / 4, 1 / 4],
    //   [1 / 4, 3 / 4],
    //   [3 / 4, 3 / 4],
    //   [3 / 4, 1 / 4],
    // ];
    let points = [
      [1 / 4, 1 / 4],
      [3 / 4, 3 / 4],
      [3 / 4, 1 / 4],
      [1 / 4, 3 / 4],
    ];
    for (let orderIndex = 2; orderIndex <= order; orderIndex++) {
      const upperLeft = [];
      const lowerLeft = [];
      const lowerRight = [];
      const upperRight = [];
      for (const [x, y] of points) {
        upperLeft.push([y / 2, x / 2]);
        lowerLeft.push([x / 2, y / 2 + 1 / 2]);
        lowerRight.push([x / 2 + 1 / 2, y / 2 + 1 / 2]);
        upperRight.push([(1 - y) / 2 + 1 / 2, (1 - x) / 2]);
      }
      points = [...upperLeft, ...lowerLeft, ...lowerRight, ...upperRight];
    }
    const pathD = `M ${points
      .map((point) => point.map((coordinate) => coordinate * viewBox).join(" "))
      .join(" L ")} Z`;
    return ({ size = viewBox } = {}) => html`
      <svg
        width="${size.toString()}"
        height="${size.toString()}"
        viewBox="0 0 ${viewBox.toString()} ${viewBox.toString()}"
      >
        <path
          d="${pathD}"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  })();

  application.server.locals.partials.spinner = ({
    request,
    response,
    size = 20,
  }) => html`
    <svg
      width="${size.toString()}"
      height="${size.toString()}"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="4"
      css="${response.locals.css(css`
        animation: var(--animation--spin);
      `)}"
    >
      <path
        d="M 2 10 A 8 8 0 0 0 18 10 A 8 8 0 0 0 2 10"
        css="${response.locals.css(css`
          opacity: var(--opacity--25);
        `)}"
      />
      <path
        d="M 2 10 A 8 8 0 0 0 15.5 15.5"
        css="${response.locals.css(css`
          opacity: var(--opacity--75);
        `)}"
      />
    </svg>
  `;

  application.server.locals.partials.reportIssueHref = `mailto:${
    application.configuration.administratorEmail
  }${qs.stringify(
    {
      subject: "Report an Issue",
      body: dedent`
          What did you try to do?
  
  
  
          What did you expect to happen?
  
  
  
          What really happened?
  
  
  
          What error messages (if any) did you run into?
  
  
  
          Please provide as much relevant context as possible (operating system, browser, and so forth):
  
          Courselore Version: ${application.version}
        `,
    },
    { addQueryPrefix: true }
  )}`;

  application.server.locals.helpers.Flash = {
    maxAge: 5 * 60 * 1000,

    set({ request, response, theme, content }) {
      const flash = application.database.get<{ nonce: string }>(
        sql`
          INSERT INTO "flashes" ("createdAt", "nonce", "theme", "content")
          VALUES (
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 10, type: "alphanumeric" })},
            ${theme},
            ${content}
          )
          RETURNING *
        `
      )!;
      request.cookies["__Host-Flash"] = flash.nonce;
      response.cookie("__Host-Flash", flash.nonce, {
        ...application.server.locals.configuration.cookies,
        maxAge: application.server.locals.helpers.Flash.maxAge,
      });
    },

    get({ request, response }) {
      if (request.cookies["__Host-Flash"] === undefined) return undefined;
      const flash = application.database.get<{
        id: number;
        theme: string;
        content: HTML;
      }>(
        sql`SELECT "id", "theme", "content" FROM "flashes" WHERE "nonce" = ${request.cookies["__Host-Flash"]}`
      );
      delete request.cookies["__Host-Flash"];
      response.clearCookie("__Host-Flash", application.server.locals.configuration.cookies);
      if (flash === undefined) return undefined;
      application.database.run(
        sql`
          DELETE FROM "flashes" WHERE "id" = ${flash.id}
        `
      );
      return flash;
    },
  };

  application.workerEvents.once("start", async () => {
    while (true) {
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘flashes’\tSTARTING...`
      );
      application.database.run(
        sql`
          DELETE FROM "flashes"
          WHERE "createdAt" < ${new Date(
            Date.now() - application.server.locals.helpers.Flash.maxAge
          ).toISOString()}
        `
      );
      console.log(
        `${new Date().toISOString()}\t${
          application.process.type
        }\tCLEAN EXPIRED ‘flashes’\tFINISHED`
      );
      await timers.setTimeout(24 * 60 * 60 * 1000, undefined, { ref: false });
    }
  });
};
