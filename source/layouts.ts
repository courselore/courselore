import express from "express";

import { processCSS, css } from "@leafac/css";
import { HTML, html } from "@leafac/html";
import { javascript } from "@leafac/javascript";

import {
  BaseMiddlewareLocals,
  EventSourceMiddlewareLocals,
} from "./global-middleware.js";

export default ({
  baseURL,
}: {
  baseURL: string;
}): {
  baseLayout: ({
    req,
    res,
    head,
    extraHeaders,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    extraHeaders?: HTML;
    body: HTML;
  }) => HTML;
} => {
  const baseLayout = ({
    req,
    res,
    head,
    extraHeaders = html``,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    extraHeaders?: HTML;
    body: HTML;
  }): HTML => {
    const baseLayoutBody = html`
      <body
        class="${res.locals.localCSS(css`
          font-family: "Public Sans", var(--font-family--sans-serif);
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
          class="${res.locals.localCSS(css`
            position: absolute;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          `)}"
          oninteractive="${javascript`
            this.addEventListener("scroll", () => {
              this.scroll(0, 0);
            });
          `}"
        >
          $${res.locals.enrollment === undefined
            ? html``
            : html`
                <div
                  class="${res.locals.localCSS(css`
                    height: var(--border-width--8);
                    display: flex;
                  `)}"
                >
                  <button
                    class="button ${res.locals.localCSS(css`
                      background-color: var(
                        --color--${res.locals.enrollment.accentColor}--500
                      );
                      @media (prefers-color-scheme: dark) {
                        background-color: var(
                          --color--${res.locals.enrollment.accentColor}--600
                        );
                      }
                      border-radius: var(--border-radius--none);
                      flex: 1;
                    `)}"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "What’s This?",
                      });
                      tippy(this, {
                        trigger: "click",
                        interactive: true,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="${res.locals.localCSS(css`
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
                                class="button button--blue ${res.locals
                                  .localCSS(css`
                                  width: 100%;
                                `)}"
                                href="${baseURL}/courses/${res.locals.course!
                                  .reference}/settings/your-enrollment"
                              >
                                <i class="bi bi-palette"></i>
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
          <div
            class="${res.locals.localCSS(css`
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
            $${demonstration
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
                      justify-content: center;
                      flex-wrap: wrap;
                    `)}"
                  >
                    <div>
                      <button
                        class="button button--transparent"
                        oninteractive="${javascript`
                          tippy(this, {
                            trigger: "click",
                            interactive: true,
                            content: ${res.locals.HTMLForJavaScript(
                              html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    padding: var(--space--2);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `)}"
                                >
                                  <p>
                                    This Courselore installation is running in
                                    demonstration mode and must not be used for
                                    real courses. Any data may be lost,
                                    including users, courses, invitations,
                                    conversations, messages, and so forth.
                                    Emails aren’t delivered. You may create
                                    demonstration data to give you a better idea
                                    of what Courselore looks like in use.
                                  </p>
                                  <form
                                    method="POST"
                                    action="${baseURL}/demonstration-data"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <button
                                      class="button button--blue ${res.locals
                                        .localCSS(css`
                                        width: 100%;
                                      `)}"
                                    >
                                      <i class="bi bi-easel"></i>
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
                    $${process.env.NODE_ENV !== "production"
                      ? html`
                          <form
                            method="POST"
                            action="${baseURL}/turn-off?_method=DELETE"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <button class="button button--transparent">
                              <i class="bi bi-power"></i>
                              Turn off
                            </button>
                          </form>
                        `
                      : html``}
                  </div>
                `
              : html``}
            $${extraHeaders}
          </div>

          $${res.locals.user !== undefined &&
          res.locals.user.emailConfirmedAt === null
            ? html`
                <div
                  class="${res.locals.localCSS(css`
                    color: var(--color--amber--700);
                    background-color: var(--color--amber--100);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--amber--200);
                      background-color: var(--color--amber--900);
                    }
                    padding: var(--space--1) var(--space--10);
                    display: flex;
                    justify-content: center;

                    .link {
                      color: var(--color--amber--600);
                      &:hover,
                      &:focus-within {
                        color: var(--color--amber--500);
                      }
                      &:active {
                        color: var(--color--amber--700);
                      }
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--100);
                        &:hover,
                        &:focus-within {
                          color: var(--color--amber--50);
                        }
                        &:active {
                          color: var(--color--amber--200);
                        }
                      }
                    }
                  `)}"
                >
                  <div
                    class="${res.locals.localCSS(css`
                      flex: 1;
                      max-width: var(--width--prose);
                      text-align: center;
                    `)}"
                  >
                    <form
                      method="POST"
                      action="${baseURL}/resend-confirmation-email${qs.stringify(
                        {
                          redirect: req.originalUrl,
                        },
                        { addQueryPrefix: true }
                      )}"
                    >
                      <input
                        type="hidden"
                        name="_csrf"
                        value="${req.csrfToken()}"
                      />
                      Please confirm your email by following the link sent to
                      ${res.locals.user.email}.<br />
                      Didn’t receive the email? Already checked your spam
                      folder?
                      <button class="link">Resend</button>.
                    </form>
                    $${demonstration
                      ? (() => {
                          let emailConfirmation = database.get<{
                            nonce: string;
                          }>(
                            sql`
                              SELECT "nonce" FROM "emailConfirmations" WHERE "user" = ${res.locals.user.id}
                            `
                          );
                          if (emailConfirmation === undefined) {
                            sendEmailConfirmationEmail({
                              req,
                              res,
                              userId: res.locals.user.id,
                              userEmail: res.locals.user.email,
                            });
                            emailConfirmation = database.get<{
                              nonce: string;
                            }>(
                              sql`
                                SELECT "nonce" FROM "emailConfirmations" WHERE "user" = ${res.locals.user.id}
                              `
                            )!;
                          }
                          return html`
                            <p
                              class="${res.locals.localCSS(
                                css`
                                  font-weight: var(--font-weight--bold);
                                `
                              )}"
                            >
                              This Courselore installation is running in
                              demonstration mode and doesn’t send emails.
                              Confirm your email by
                              <a
                                href="${baseURL}/email-confirmation/${emailConfirmation.nonce}${qs.stringify(
                                  {
                                    redirect: req.originalUrl,
                                  },
                                  { addQueryPrefix: true }
                                )}"
                                class="link"
                                >clicking here</a
                              >.
                            </p>
                          `;
                        })()
                      : html``}
                  </div>
                </div>
              `
            : html``}
          $${(() => {
            const flash = Flash.get({ req, res });
            return flash === undefined
              ? html``
              : html`
                  <div
                    class="flash ${res.locals.localCSS(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }
                      ${["green", "rose"].map(
                        (color) => css`
                          .flash--${color} {
                            &,
                            & + .button--transparent {
                              color: var(--color--${color}--700);
                            }
                            background-color: var(--color--${color}--100);
                            & + .button--transparent {
                              &:hover,
                              &:focus-within {
                                background-color: var(--color--${color}--200);
                              }
                              &:active {
                                background-color: var(--color--${color}--300);
                              }
                            }
                            @media (prefers-color-scheme: dark) {
                              &,
                              & + .button--transparent {
                                color: var(--color--${color}--200);
                              }
                              background-color: var(--color--${color}--900);
                              & + .button--transparent {
                                &:hover,
                                &:focus-within {
                                  background-color: var(--color--${color}--800);
                                }
                                &:active {
                                  background-color: var(--color--${color}--700);
                                }
                              }
                            }
                            padding: var(--space--1) var(--space--10);
                            display: flex;
                            justify-content: center;
                            text-align: center;
                            & > * {
                              flex: 1;
                              max-width: var(--width--prose);
                            }
                            .link {
                              color: var(--color--${color}--600);
                              &:hover,
                              &:focus-within {
                                color: var(--color--${color}--500);
                              }
                              &:active {
                                color: var(--color--${color}--700);
                              }
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--${color}--100);
                                &:hover,
                                &:focus-within {
                                  color: var(--color--${color}--50);
                                }
                                &:active {
                                  color: var(--color--${color}--200);
                                }
                              }
                            }
                          }
                        `
                      )}
                    `)}"
                  >
                    $${flash}
                    <button
                      class="button button--tight button--tight--inline button--transparent ${res
                        .locals.localCSS(css`
                        justify-self: end;
                        align-self: start;
                        margin-top: var(--space--0-5);
                        margin-right: var(--space--3);
                      `)}"
                      oninteractive="${javascript`
                        this.addEventListener("click", () => {
                          this.closest(".flash").remove();
                        });
                      `}"
                    >
                      <i class="bi bi-x-circle"></i>
                    </button>
                  </div>
                `;
          })()}

          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              overflow: auto;
            `)}"
          >
            $${body}
          </div>

          <div
            class="${res.locals.localCSS(css`
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
                class="button button--transparent ${res.locals.localCSS(css`
                  align-items: center;
                `)}"
                oninteractive="${javascript`
                  tippy(this, {
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <h3 class="heading">
                          $${logo({ size: 12 /* var(--space--3) */ })}
                          <span>
                            Courselore <br />
                            Communication Platform for Education <br />
                            <small
                              class="secondary ${res.locals.localCSS(css`
                                font-size: var(--font-size--2xs);
                                line-height: var(--line-height--2xs);
                              `)}"
                            >
                              Version ${courseloreVersion}
                            </small>
                          </span>
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="https://courselore.org/about"
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
                $${logo({ size: 16 /* var(--space--4) */ })} Courselore
              </button>
            </div>
            <div>
              <button
                class="button button--transparent"
                oninteractive="${javascript`
                  tippy(this, {
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <h3 class="heading">
                          <i class="bi bi-bug"></i>
                          Report an Issue
                        </h3>
                        <div class="dropdown--menu">
                          <a
                            href="https://courselore.org/courses/8537410611/invitations/3667859788"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent ${res.locals.localCSS(
                              css`
                                align-items: center;
                              `
                            )}"
                          >
                            $${logo({ size: 14 /* var(--space--3-5) */ })} Meta
                            Courselore
                          </a>
                          <a
                            href="${reportIssueHref}"
                            target="_blank"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-envelope"></i>
                            ${administratorEmail}
                          </a>
                          <a
                            href="https://github.com/courselore/courselore/issues/new${qs.stringify(
                              {
                                body: dedent`
                                  **What did you try to do?**



                                  **What did you expect to happen?**



                                  **What really happened?**



                                  **What error messages (if any) did you run into?**



                                  Please provide as much relevant context as possible (operating system, browser, and so forth):

                                  - Courselore Version: ${courseloreVersion}
                                `,
                              },
                              {
                                addQueryPrefix: true,
                              }
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
          </div>
        </div>

        $${res.locals.HTMLForJavaScript.toString()}
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
            href="${baseURL}/node_modules/@fontsource/public-sans/100-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/100.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/200-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/200.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/300-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/300.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/400-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/400.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/500-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/500.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/600-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/600.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/700-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/700.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/800-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/800.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/900-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/public-sans/900.css"
          />

          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/100-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/100.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/200-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/200.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/300-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/300.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/400-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/400.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/500-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/500.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/600-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/600.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/700-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/700.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/800-italic.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@fontsource/jetbrains-mono/800.css"
          />

          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/bootstrap-icons/font/bootstrap-icons.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/katex/dist/katex.min.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/tippy.js/dist/svg-arrow.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/tippy.js/dist/border.css"
          />
          <link
            rel="stylesheet"
            href="${baseURL}/node_modules/@leafac/css/distribution/browser.css"
          />
          <link rel="stylesheet" href="${baseURL}/global.css" />
          $${res.locals.localCSS.toString()}

          <script src="${baseURL}/node_modules/autosize/dist/autosize.min.js"></script>
          <script src="${baseURL}/node_modules/morphdom/dist/morphdom-umd.min.js"></script>
          <script src="${baseURL}/node_modules/mousetrap/mousetrap.min.js"></script>
          <script src="${baseURL}/node_modules/scroll-into-view-if-needed/umd/scroll-into-view-if-needed.min.js"></script>
          <script src="${baseURL}/node_modules/@popperjs/core/dist/umd/popper.min.js"></script>
          <script src="${baseURL}/node_modules/tippy.js/dist/tippy-bundle.umd.min.js"></script>
          <script src="${baseURL}/node_modules/textarea-caret/index.js"></script>
          <script src="${baseURL}/node_modules/text-field-edit/index.umd.js"></script>
          <script src="${baseURL}/node_modules/reconnecting-eventsource/dist/ReconnectingEventSource.min.js"></script>
          <script src="${baseURL}/node_modules/@leafac/javascript/distribution/browser.js"></script>
          <script src="${baseURL}/leafac--javascript.js"></script>
          <script>
            leafac.evaluateOnInteractive();
            leafac.customFormValidation();
            leafac.warnAboutLosingInputs();
            leafac.disableButtonsOnSubmit();
            leafac.tippySetDefaultProps();
            leafac.turboDrive();
          </script>
          $${res?.locals.eventSource
            ? html`
                <script>
                  const eventSource = new ReconnectingEventSource(
                    window.location.href
                  );
                  eventSource.addEventListener("reference", (event) => {
                    eventSource.reference = event.data;
                  });
                  eventSource.addEventListener("refresh", async () => {
                    await eventSourceRefresh(await fetch(window.location.href));
                  });
                </script>
              `
            : html``}
          $${hotReload
            ? html`
                <script>
                  leafac.hotReload($${JSON.stringify(`${baseURL}/hot-reload`)});
                </script>
              `
            : html``}
          $${head}
        </head>
        $${baseLayoutBody}
      </html>
    `;
  };

  if (process.env.NODE_ENV !== "production")
    await fs.writeFile(
      new URL("../static/global.css", import.meta.url),
      processCSS(css`
        .label {
          display: flex;
          flex-direction: column;
          gap: var(--space--1);

          .label--text {
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            font-weight: var(--font-weight--bold);
            display: flex;
            gap: var(--space--2);
          }
        }

        .input--text {
          background-color: var(--color--gray--medium--200);
          --color--box-shadow: var(--color--blue--400);
          &::placeholder {
            color: var(--color--gray--medium--400);
          }
          &:disabled,
          &.disabled {
            color: var(--color--gray--medium--500);
            -webkit-text-fill-color: var(--color--gray--medium--500);
            background-color: var(--color--gray--medium--300);
          }
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
            --color--box-shadow: var(--color--blue--600);
            &::placeholder {
              color: var(--color--gray--medium--500);
            }
            &:disabled,
            &.disabled {
              color: var(--color--gray--medium--400);
              -webkit-text-fill-color: var(--color--gray--medium--400);
              background-color: var(--color--gray--medium--600);
            }
          }
          width: 100%;
          display: block;
          padding: var(--space--2) var(--space--4);
          border-radius: var(--border-radius--md);
          &:focus-within {
            box-shadow: var(--border-width--0) var(--border-width--0)
              var(--border-width--0) var(--border-width--2)
              var(--color--box-shadow);
          }
          transition-property: var(--transition-property--box-shadow);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
          &.input--text--textarea {
            border-radius: var(--border-radius--lg);
          }
        }

        .input--radio {
          background-color: var(--color--gray--medium--200);
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--300);
          }
          &:active {
            background-color: var(--color--gray--medium--400);
          }
          &:checked {
            background-color: var(--color--blue--600);
            &:hover,
            &:focus-within {
              background-color: var(--color--blue--500);
            }
            &:active {
              background-color: var(--color--blue--700);
            }
          }
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
            &:hover,
            &:focus-within {
              background-color: var(--color--gray--medium--600);
            }
            &:active {
              background-color: var(--color--gray--medium--500);
            }
            &:checked {
              background-color: var(--color--blue--700);
              &:hover,
              &:focus-within {
                background-color: var(--color--blue--600);
              }
              &:active {
                background-color: var(--color--blue--800);
              }
            }
          }
          width: var(--space--3-5);
          height: var(--space--3-5);
          border-radius: var(--border-radius--circle);
          position: relative;
          top: var(--space---0-5);
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);

          &::before {
            content: "";
            background-color: var(--color--gray--medium--50);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--200);
            }
            display: block;
            width: var(--space--1-5);
            height: var(--space--1-5);
            border-radius: var(--border-radius--circle);
            transition-property: var(--transition-property--transform);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--in-out
            );
          }
          &:not(:checked)::before {
            transform: scale(var(--scale--0));
          }
        }

        .input--checkbox {
          background-color: var(--color--gray--medium--200);
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--300);
          }
          &:active {
            background-color: var(--color--gray--medium--400);
          }
          &:checked {
            background-color: var(--color--blue--600);
            &:hover,
            &:focus-within {
              background-color: var(--color--blue--500);
            }
            &:active {
              background-color: var(--color--blue--700);
            }
          }
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
            &:hover,
            &:focus-within {
              background-color: var(--color--gray--medium--600);
            }
            &:active {
              background-color: var(--color--gray--medium--500);
            }
            &:checked {
              background-color: var(--color--blue--700);
              &:hover,
              &:focus-within {
                background-color: var(--color--blue--600);
              }
              &:active {
                background-color: var(--color--blue--800);
              }
            }
          }
          width: var(--space--8);
          padding: var(--space--0-5);
          border-radius: var(--border-radius--full);
          position: relative;
          top: calc(var(--space--0-5) * 1.5);
          &::after {
            content: "";
            background-color: var(--color--gray--medium--50);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--200);
            }
            width: var(--space--3);
            height: var(--space--3);
            border-radius: var(--border-radius--circle);
            display: block;
            transition-property: var(--transition-property--all);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--in-out
            );
          }
          &:checked::after {
            margin-left: var(--space--4);
          }
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
        }

        .input--radio-or-checkbox--multilabel {
          & ~ * {
            display: flex;
            gap: var(--space--2);
          }
          &:not(:checked) + * + *,
          &:checked + * {
            display: none;
          }
        }

        .button {
          padding: var(--space--1) var(--space--4);
          border-radius: var(--border-radius--md);
          display: flex;
          gap: var(--space--2);
          justify-content: center;
          align-items: baseline;
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
          cursor: pointer;

          &.button--tight {
            padding: var(--space--0-5) var(--space--1);

            &.button--tight--inline {
              margin: var(--space---0-5) var(--space---1);
            }
          }

          &.button--tight-gap {
            gap: var(--space--1);
          }

          &.button--full-width-on-small-screen {
            @media (max-width: 400px) {
              width: 100%;
            }
          }

          &.button--justify-start {
            justify-content: flex-start;
          }

          &.button--inline {
            display: inline-flex;
          }

          &.button--transparent {
            &:not(:disabled):not(.disabled) {
              &:hover,
              &:focus-within,
              &.hover {
                background-color: var(--color--gray--medium--200);
              }
              &:active {
                background-color: var(--color--gray--medium--300);
              }
              @media (prefers-color-scheme: dark) {
                &:hover,
                &:focus-within,
                &.hover {
                  background-color: var(--color--gray--medium--700);
                }
                &:active {
                  background-color: var(--color--gray--medium--600);
                }
              }
            }
            &:disabled,
            &.disabled {
              color: var(--color--gray--medium--500);
              @media (prefers-color-scheme: dark) {
                color: var(--color--gray--medium--400);
              }
            }
          }

          ${["blue", "green", "rose", "amber"].map(
            (color) => css`
              &.button--${color} {
                color: var(--color--${color}--50);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--${color}--100);
                }
                &:not(:disabled):not(.disabled) {
                  background-color: var(--color--${color}--600);
                  &:hover,
                  &:focus-within,
                  &.hover {
                    background-color: var(--color--${color}--500);
                  }
                  &:active {
                    background-color: var(--color--${color}--700);
                  }
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--${color}--800);
                    &:hover,
                    &:focus-within,
                    &.hover {
                      background-color: var(--color--${color}--700);
                    }
                    &:active {
                      background-color: var(--color--${color}--900);
                    }
                  }
                }
                &:disabled,
                &.disabled {
                  background-color: var(--color--${color}--300);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--${color}--500);
                  }
                }
                .strong {
                  color: var(--color--${color}--50);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--${color}--100);
                  }
                }
                .secondary,
                [class^="text--"] {
                  color: var(--color--${color}--100);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--${color}--200);
                  }
                }
              }
            `
          )}
        }

        .link {
          text-decoration: underline;
          color: var(--color--blue--600);
          &:hover,
          &:focus-within {
            color: var(--color--blue--500);
          }
          &:active {
            color: var(--color--blue--700);
          }
          @media (prefers-color-scheme: dark) {
            color: var(--color--blue--500);
            &:hover,
            &:focus-within {
              color: var(--color--blue--400);
            }
            &:active {
              color: var(--color--blue--600);
            }
          }
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
          cursor: pointer;
        }

        :disabled,
        .disabled {
          cursor: not-allowed;
        }

        .heading {
          font-size: var(--font-size--2xs);
          line-height: var(--line-height--2xs);
          font-weight: var(--font-weight--bold);
          text-transform: uppercase;
          letter-spacing: var(--letter-spacing--widest);
          color: var(--color--gray--medium--600);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--400);
          }
          display: flex;
          gap: var(--space--1);
        }

        .heading--display {
          font-size: var(--font-size--xl);
          line-height: var(--line-height--xl);
          font-weight: var(--font-weight--bold);
          text-align: center;
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
          }
        }

        .strong {
          font-weight: var(--font-weight--bold);
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
          }
        }

        .secondary {
          color: var(--color--gray--medium--500);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--400);
          }
        }

        ${[
          "blue",
          "green",
          "rose",
          "sky",
          "amber",
          "teal",
          "lime",
          "emerald",
          "fuchsia",
          "cyan",
        ].map(
          (color) => css`
            .text--${color} {
              color: var(--color--${color}--600);
              @media (prefers-color-scheme: dark) {
                color: var(--color--${color}--500);
              }
            }
          `
        )}

        .mark {
          color: var(--color--amber--700);
          background-color: var(--color--amber--200);
          @media (prefers-color-scheme: dark) {
            color: var(--color--amber--200);
            background-color: var(--color--amber--700);
          }
          padding: var(--space--0) var(--space--0-5);
          border-radius: var(--border-radius--base);
        }

        .code,
        .pre > code {
          font-family: "JetBrains Mono", var(--font-family--monospace);
          font-variant-ligatures: none;
        }

        .pre > code {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
        }

        .img {
          background-color: var(--color--gray--medium--50);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--50);
            filter: brightness(var(--brightness--90));
          }
          max-width: 100%;
          height: auto;
          border-radius: var(--border-radius--xl);
        }

        .details {
          background-color: var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
          }
          border-radius: var(--border-radius--xl);
          summary {
            &:hover,
            &:focus-within {
              background-color: var(--color--gray--medium--300);
            }
            @media (prefers-color-scheme: dark) {
              &:hover,
              &:focus-within {
                background-color: var(--color--gray--medium--600);
              }
            }
            padding: var(--space--2) var(--space--4);
            border-radius: var(--border-radius--xl);
            transition-property: var(--transition-property--colors);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--in-out
            );
            cursor: pointer;
            &::before {
              content: "\\f275";
              font-family: "bootstrap-icons" !important;
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              margin-right: var(--space--2);
            }
          }
          &[open] > summary::before {
            content: "\\f273";
          }
          & > div:last-child {
            padding: var(--space--4);
          }
        }

        .decorative-icon {
          font-size: var(--font-size--9xl);
          line-height: var(--line-height--9xl);
          color: var(--color--gray--medium--300);
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--600);
            background-color: var(--color--gray--medium--800);
          }
          width: var(--space--48);
          height: var(--space--48);
          border-radius: var(--border-radius--circle);
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .separator {
          border-top: var(--border-width--1) solid
            var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            border-color: var(--color--gray--medium--700);
          }
        }

        .menu-box {
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--800);
          }
          padding: var(--space--2);
          border-radius: var(--border-radius--lg);
          display: flex;
          flex-direction: column;
          gap: var(--space--2);

          .menu-box--item {
            justify-content: flex-start;
          }
        }

        .tippy-box {
          font-size: var(--font-size--sm);
          line-height: var(--line-height--sm);
          --background-color: var(--color--gray--medium--100);
          --border-color: var(--color--gray--medium--400);
          @media (prefers-color-scheme: dark) {
            --background-color: var(--color--gray--medium--800);
            --border-color: var(--color--gray--medium--400);
          }
          color: inherit;
          background-color: var(--background-color);
          border: var(--border-width--1) solid var(--border-color);
          border-radius: var(--border-radius--md);
          & > .tippy-svg-arrow > svg {
            &:first-child {
              fill: var(--border-color);
            }
            &:last-child {
              fill: var(--background-color);
            }
          }

          .tippy-content {
            padding: var(--space--1) var(--space--2);
          }

          .heading {
            padding: var(--space--1) var(--space--2);
          }

          .keyboard-shortcut {
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            color: var(--color--gray--medium--500);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--400);
            }

            .keyboard-shortcut--cluster {
              letter-spacing: var(--letter-spacing--widest);
            }
          }

          .dropdown--menu {
            display: flex;
            flex-direction: column;

            .dropdown--menu--item {
              text-align: left;
              width: 100%;
              padding-left: var(--space--2);
              padding-right: var(--space--2);
              justify-content: flex-start;
            }
          }

          .dropdown--separator {
            border-top: var(--border-width--1) solid
              var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              border-color: var(--color--gray--medium--700);
            }
            margin: var(--space--0) var(--space--2);
          }

          ${["green", "rose"].map(
            (color) => css`
              &[data-theme~="${color}"] {
                color: var(--color--${color}--700);
                --background-color: var(--color--${color}--100);
                --border-color: var(--color--${color}--200);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--${color}--200);
                  --background-color: var(--color--${color}--900);
                  --border-color: var(--color--${color}--800);
                }
              }
            `
          )}

          &[data-theme~="validation--error"] {
            color: var(--color--rose--700);
            --background-color: var(--color--rose--100);
            --border-color: var(--color--rose--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--rose--200);
              --background-color: var(--color--rose--900);
              --border-color: var(--color--rose--800);
            }
          }
        }

        .dark {
          display: none !important;
        }
        @media (prefers-color-scheme: dark) {
          .light {
            display: none !important;
          }
          .dark {
            display: block !important;
          }
        }

        .content {
          &,
          div,
          figure,
          blockquote {
            display: flex;
            flex-direction: column;
            gap: var(--space--4);
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: var(--space--4);
          }

          h1 {
            color: var(--color--gray--medium--800);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--100);
            }
          }

          h1,
          h2,
          h3 {
            font-size: var(--font-size--base);
            line-height: var(--line-height--base);
          }

          h1,
          h4,
          h5,
          h6 {
            font-weight: var(--font-weight--bold);
          }

          h2 {
            font-style: italic;
          }

          b,
          strong {
            font-weight: var(--font-weight--bold);
            color: var(--color--gray--medium--800);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--100);
            }
          }

          i:not(.bi),
          em {
            font-style: italic;
            color: var(--color--gray--medium--800);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--100);
            }
          }

          a {
            text-decoration: underline;
            color: var(--color--blue--600);
            &:hover,
            &:focus-within {
              color: var(--color--blue--500);
            }
            &:active {
              color: var(--color--blue--700);
            }
            @media (prefers-color-scheme: dark) {
              color: var(--color--blue--500);
              &:hover,
              &:focus-within {
                color: var(--color--blue--400);
              }
              &:active {
                color: var(--color--blue--600);
              }
            }
            transition-property: var(--transition-property--colors);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--in-out
            );
            cursor: pointer;
          }

          pre {
            background-color: #ffffff;
            @media (prefers-color-scheme: dark) {
              background-color: #1e1e1e;
            }
            padding: var(--space--4);
            border-radius: var(--border-radius--xl);
            overflow-x: auto;
            & > code {
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              background-color: transparent;
              padding: var(--space--0);
              overflow-wrap: normal;
            }
          }

          code,
          tt,
          kbd,
          samp {
            font-family: "JetBrains Mono", var(--font-family--monospace);
            font-variant-ligatures: none;
            background-color: var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--700);
            }
            padding: var(--space--0) var(--space--0-5);
            border-radius: var(--border-radius--base);
          }

          del {
            text-decoration: line-through;
            color: var(--color--rose--600);
            @media (prefers-color-scheme: dark) {
              color: var(--color--rose--500);
            }
          }

          ins {
            color: var(--color--green--600);
            @media (prefers-color-scheme: dark) {
              color: var(--color--green--500);
            }
          }

          sup,
          sub {
            position: relative;
            font-size: var(--font-size--2xs);
            line-height: var(--space--0);
            vertical-align: baseline;
          }

          sup {
            top: var(--space---1);
          }

          sub {
            bottom: var(--space---1);
          }

          img {
            background-color: var(--color--gray--medium--50);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--50);
              filter: brightness(var(--brightness--90));
            }
            max-width: 100%;
            height: auto;
            border-radius: var(--border-radius--xl);
          }

          hr {
            border-top: var(--border-width--1) solid
              var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              border-color: var(--color--gray--medium--700);
            }
          }

          ol {
            padding-left: var(--space--8);
            & > li {
              list-style: decimal;
              &::marker {
                color: var(--color--gray--medium--500);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--400);
                }
              }
            }
          }

          ul {
            padding-left: var(--space--8);
            & > li {
              list-style: disc;
              &::marker {
                color: var(--color--gray--medium--500);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--400);
                }
              }
            }
          }

          table {
            border-collapse: collapse;
            display: block;
            caption {
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              font-weight: var(--font-weight--bold);
            }
            th,
            td {
              padding: var(--space--1) var(--space--3);
              border-top: var(--border-width--1) solid
                var(--color--gray--medium--200);
              @media (prefers-color-scheme: dark) {
                border-color: var(--color--gray--medium--700);
              }
            }
            th {
              font-weight: var(--font-weight--bold);
              color: var(--color--gray--medium--800);
              @media (prefers-color-scheme: dark) {
                color: var(--color--gray--medium--100);
              }
            }
          }

          blockquote {
            padding-left: var(--space--4);
            border-left: var(--border-width--4) solid
              var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              border-color: var(--color--gray--medium--700);
            }
          }

          dl {
            dt {
              font-weight: var(--font-weight--bold);
              color: var(--color--gray--medium--800);
              @media (prefers-color-scheme: dark) {
                color: var(--color--gray--medium--100);
              }
            }
            dd {
              padding-left: var(--space--4);
            }
          }

          var {
            font-style: italic;
          }

          s,
          strike {
            text-decoration: line-through;
          }

          details {
            background-color: var(--color--gray--medium--200);
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--700);
            }
            border-radius: var(--border-radius--xl);
            summary {
              &:hover,
              &:focus-within {
                background-color: var(--color--gray--medium--300);
              }
              @media (prefers-color-scheme: dark) {
                &:hover,
                &:focus-within {
                  background-color: var(--color--gray--medium--600);
                }
              }
              padding: var(--space--2) var(--space--4);
              border-radius: var(--border-radius--xl);
              transition-property: var(--transition-property--colors);
              transition-duration: var(--transition-duration--150);
              transition-timing-function: var(
                --transition-timing-function--in-out
              );
              cursor: pointer;
              &::before {
                content: "\\f275";
                font-family: "bootstrap-icons" !important;
                font-size: var(--font-size--xs);
                line-height: var(--line-height--xs);
                margin-right: var(--space--2);
              }
            }
            &[open] > summary::before {
              content: "\\f273";
            }
            & > div:last-child {
              padding: var(--space--4);
            }
          }

          figure {
            figcaption {
              font-size: var(--font-size--xs);
              line-height: var(--line-height--xs);
              font-weight: var(--font-weight--bold);
            }
          }

          abbr {
            text-decoration: underline dotted;
            cursor: help;
          }

          dfn {
            font-weight: var(--font-weight--bold);
          }

          mark {
            color: var(--color--amber--700);
            background-color: var(--color--amber--200);
            @media (prefers-color-scheme: dark) {
              color: var(--color--amber--200);
              background-color: var(--color--amber--700);
            }
            border-radius: var(--border-radius--base);
          }

          small {
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
          }

          input[type="checkbox"] {
            font-size: var(--font-size--2xs);
            line-height: var(--line-height--2xs);
            color: var(--color--transparent);
            background-color: var(--color--gray--medium--200);
            &:checked {
              color: var(--color--blue--50);
              background-color: var(--color--blue--600);
            }
            @media (prefers-color-scheme: dark) {
              background-color: var(--color--gray--medium--700);
              &:checked {
                color: var(--color--blue--200);
                background-color: var(--color--blue--700);
              }
            }
            width: var(--space--3-5);
            height: var(--space--3-5);
            border-radius: var(--border-radius--base);
            margin-right: var(--space--1);
            display: inline-flex;
            justify-content: center;
            align-items: center;
            &::before {
              content: "\\f633";
              font-family: "bootstrap-icons" !important;
            }
          }

          .katex {
            overflow: auto;
          }
        }
      `)
    );

  const boxLayout = ({
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
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      BaseMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    baseLayout({
      req,
      res,
      head,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            min-width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          `)}"
        >
          <div
            class="${res.locals.localCSS(css`
              flex: 1;
              max-width: var(--width--sm);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                display: flex;
                justify-content: center;
              `)}"
            >
              <a
                href="${baseURL}/"
                class="heading--display button button--transparent ${res.locals
                  .localCSS(css`
                  align-items: center;
                `)}"
              >
                $${logo()} Courselore
              </a>
            </div>
            <div
              class="${res.locals.localCSS(css`
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

            $${baseURL === "https://try.courselore.org"
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
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
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `)}"
                    >
                      <p>
                        This is the development installation of Courselore and
                        must not be used for real courses. Any data may be lost,
                        including users, courses, invitations, conversations,
                        messages, and so forth. Emails aren’t delivered. You may
                        create demonstration data to give you a better idea of
                        what Courselore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="${baseURL}/demonstration-data"
                      >
                        <input
                          type="hidden"
                          name="_csrf"
                          value="${req.csrfToken()}"
                        />
                        <button
                          class="button button--amber ${res.locals.localCSS(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : demonstration
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
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
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      class="${res.locals.localCSS(css`
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
                        action="${baseURL}/demonstration-data"
                      >
                        <input
                          type="hidden"
                          name="_csrf"
                          value="${req.csrfToken()}"
                        />
                        <button
                          class="button button--amber ${res.locals.localCSS(css`
                            width: 100%;
                          `)}"
                        >
                          <i class="bi bi-easel"></i>
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

  const applicationLayout = ({
    req,
    res,
    head,
    showCourseSwitcher = true,
    extraHeaders = html``,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsSignedInMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    showCourseSwitcher?: boolean;
    extraHeaders?: HTML;
    body: HTML;
  }): HTML =>
    baseLayout({
      req,
      res,
      head,
      extraHeaders: html`
        <div
          class="${res.locals.localCSS(css`
            padding-top: var(--space--1);
            padding-bottom: var(--space--1);
            gap: var(--space--4);
            align-items: center;
          `)}"
        >
          <a
            href="${baseURL}/"
            class="button button--tight button--tight--inline button--transparent"
            oninteractive="${javascript`
              tippy(this, {
                touch: false,
                content: "Courselore",
              });
            `}"
          >
            $${logo()}
          </a>

          <div
            class="${res.locals.localCSS(css`
              font-size: var(--font-size--sm);
              line-height: var(--line-height--sm);
              flex: 1;
              min-width: var(--width--0);
            `)}"
          >
            $${(() => {
              const courseSwitcher = html`
                <div class="dropdown--menu">
                  $${res.locals.enrollments.map(
                    (enrollment) => html`
                      <a
                        href="${baseURL}/courses/${enrollment.course.reference}"
                        class="dropdown--menu--item button ${enrollment.id ===
                        res.locals.enrollment?.id
                          ? "button--blue"
                          : "button--transparent"}"
                      >
                        $${coursePartial({
                          req,
                          res,
                          course: enrollment.course,
                          enrollment,
                          tight: true,
                        })}
                      </a>
                    `
                  )}
                </div>
              `;

              return res.locals.course !== undefined
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent strong ${res
                        .locals.localCSS(css`
                        max-width: 100%;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          trigger: "click",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <div
                                class="${res.locals.localCSS(css`
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `)}"
                              >
                                <div>
                                  <h3 class="heading">
                                    <i class="bi bi-journal-text"></i>
                                    ${res.locals.course.name}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <a
                                      href="${baseURL}/courses/${res.locals
                                        .course.reference}"
                                      class="dropdown--menu--item button ${req.path.includes(
                                        "/settings/"
                                      )
                                        ? "button--transparent"
                                        : "button--blue"}"
                                    >
                                      <i class="bi bi-chat-left-text"></i>
                                      Conversations
                                    </a>
                                    <a
                                      href="${baseURL}/courses/${res.locals
                                        .course.reference}/settings"
                                      class="dropdown--menu--item button ${req.path.includes(
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
                                $${res.locals.enrollments.length > 1
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
                        class="${res.locals.localCSS(css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        `)}"
                      >
                        ${res.locals.course.name}
                      </span>
                      <i class="bi bi-chevron-down"></i>
                    </button>
                  `
                : showCourseSwitcher && res.locals.enrollments.length > 0
                ? html`
                    <button
                      class="button button--tight button--tight--inline button--transparent ${res
                        .locals.localCSS(css`
                        max-width: 100%;
                      `)}"
                      oninteractive="${javascript`
                        tippy(this, {
                          trigger: "click",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`$${courseSwitcher}`
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
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: ${JSON.stringify(
                    res.locals.invitations!.length === 0
                      ? "Add"
                      : `${res.locals.invitations!.length} pending invitation${
                          res.locals.invitations!.length === 1 ? "" : "s"
                        }`
                  )},
                });
                tippy(this, {
                  trigger: "click",
                  interactive: true,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        $${res.locals.invitations!.length === 0
                          ? html``
                          : html`
                              <div>
                                <h3 class="heading">
                                  <i class="bi bi-journal-arrow-down"></i>
                                  Invitations
                                </h3>
                                <div class="dropdown--menu">
                                  $${res.locals.invitations!.map(
                                    (invitation) => html`
                                      <a
                                        href="${baseURL}/courses/${invitation
                                          .course
                                          .reference}/invitations/${invitation.reference}"
                                        class="dropdown--menu--item button button--transparent"
                                      >
                                        $${coursePartial({
                                          req,
                                          res,
                                          course: invitation.course,
                                          tight: true,
                                        })}
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
                            oninteractive="${javascript`
                              tippy(this, {
                                trigger: "click",
                                content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                              });
                            `}"
                          >
                            <i class="bi bi-journal-arrow-down"></i>
                            Enroll in an Existing Course
                          </button>
                          <a
                            href="${baseURL}/courses/new"
                            class="dropdown--menu--item button button--transparent"
                          >
                            <i class="bi bi-journal-plus"></i>
                            Create a New Course
                          </a>
                        </div>
                      </div>
                    `
                  )},
                });
              `}"
            >
              <div
                class="${res.locals.localCSS(css`
                  display: grid;
                  & > * {
                    grid-area: 1 / 1;
                  }
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
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
                $${res.locals.invitations!.length === 0
                  ? html``
                  : html`
                      <div
                        class="${res.locals.localCSS(css`
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
              class="button button--tight button--tight--inline button--transparent ${res
                .locals.localCSS(css`
                padding: var(--space--1);
                border-radius: var(--border-radius--circle);
              `)}"
              oninteractive="${javascript`
                tippy(this, {
                  touch: false,
                  content: ${JSON.stringify(res.locals.user.name)},
                });
                tippy(this, {
                  trigger: "click",
                  interactive: true,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div
                          class="${res.locals.localCSS(css`
                            padding: var(--space--0) var(--space--2);
                          `)}"
                        >
                          <p class="strong">${res.locals.user.name}</p>
                          <p class="secondary">${res.locals.user.email}</p>
                        </div>

                        <hr class="dropdown--separator" />

                        <div class="dropdown--menu">
                          <a
                            class="dropdown--menu--item button button--transparent"
                            href="${baseURL}/settings"
                          >
                            <i class="bi bi-sliders"></i>
                            User Settings
                          </a>
                          <form
                            method="POST"
                            action="${baseURL}/sign-out?_method=DELETE"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <button
                              class="dropdown--menu--item button button--transparent"
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
              $${userPartial({
                req,
                res,
                user: res.locals.user,
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

  const mainLayout = ({
    req,
    res,
    head,
    showCourseSwitcher = true,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsSignedInMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsSignedInMiddlewareLocals &
        Partial<IsEnrolledInCourseMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    showCourseSwitcher?: boolean;
    body: HTML;
  }): HTML =>
    applicationLayout({
      req,
      res,
      head,
      showCourseSwitcher,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            display: flex;
            justify-content: center;
          `)}"
        >
          <div
            class="${res.locals.localCSS(css`
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

  const settingsLayout = ({
    req,
    res,
    head,
    menuButton,
    menu,
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
    menuButton: HTML;
    menu: HTML;
    body: HTML;
  }): HTML =>
    applicationLayout({
      req,
      res,
      head,
      extraHeaders:
        menu === html``
          ? html``
          : html`
              <div
                class="${res.locals.localCSS(css`
                  justify-content: center;
                  @media (min-width: 700px) {
                    display: none;
                  }
                `)}"
              >
                <button
                  class="button button--transparent"
                  oninteractive="${javascript`
                    tippy(this, {
                      trigger: "click",
                      interactive: true,
                      content: ${res.locals.HTMLForJavaScript(
                        html`<div class="dropdown--menu">$${menu}</div>`
                      )},
                    });
                  `}"
                >
                  $${menuButton}
                  <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            `,
      body: html`
        <div
          class="${res.locals.localCSS(css`
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
                  class="${res.locals.localCSS(css`
                    @media (max-width: 699px) {
                      display: none;
                    }
                  `)}"
                >
                  <div class="menu-box">$${menu}</div>
                </div>
              `}
          <div
            class="${res.locals.localCSS(css`
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

  const logo = (() => {
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
    return ({ size = viewBox }: { size?: number } = {}) => html`
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

  const partialLayout = ({
    req,
    res,
    body,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    body: HTML;
  }): HTML => html`
    <!DOCTYPE html>
    <html>
      <head>
        $${res.locals.localCSS.toString()}
      </head>
      <body>
        $${body}$${res.locals.HTMLForJavaScript.toString()}
      </body>
    </html>
  `;

  const spinner = ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
  }): HTML => html`
    <svg
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      stroke-width="4"
      class="${res.locals.localCSS(css`
        animation: var(--animation--spin);
      `)}"
    >
      <path
        d="M 2 10 A 8 8 0 0 0 18 10 A 8 8 0 0 0 2 10"
        class="${res.locals.localCSS(css`
          opacity: var(--opacity--25);
        `)}"
      />
      <path
        d="M 2 10 A 8 8 0 0 0 15.5 15.5"
        class="${res.locals.localCSS(css`
          opacity: var(--opacity--75);
        `)}"
      />
    </svg>
  `;

  return { baseLayout };
};
