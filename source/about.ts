import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import dedent from "dedent";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
} from "./index.js";

export type AboutHandler = express.RequestHandler<
  {},
  any,
  {},
  {},
  BaseMiddlewareLocals & Partial<IsSignedInMiddlewareLocals>
>;

export default (app: Courselore): void => {
  app.locals.handlers.about = (req, res) => {
    res.send(
      app.locals.layouts.base({
        req,
        res,
        head: html`
          <title>Courselore · Communication Platform for Education</title>
        `,
        body: html`
          <div
            css="${res.locals.css(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--20) var(--space--8);
              align-items: center;
              @media (max-width: 959px) {
                flex-direction: column;
              }
            `)}"
          >
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <a
                href="${app.locals.options.baseURL}/about"
                class="heading--display button button--transparent"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                $${app.locals.partials.logo({
                  size: 48 /* var(--space--12) */,
                })}
                Courselore
              </a>
              <h3
                class="secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Communication Platform for Education
              </h3>

              <div
                css="${res.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  & > * {
                    display: flex;
                    gap: var(--space--4);
                    & > * {
                      flex: 1;
                    }
                    @media (max-width: 459px) {
                      flex-direction: column;
                    }
                  }
                `)}"
              >
                <div>
                  $${res.locals.user === undefined
                    ? html`
                        <a
                          href="https://${app.locals.options
                            .canonicalHost}/sign-up"
                          class="button button--blue"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Sign up on a Courselore installation managed by the developers of Courselore. Free for a limited time.",
                            });
                          `}"
                        >
                          <i class="bi bi-person-plus-fill"></i>
                          Sign up
                        </a>
                        <a
                          href="https://${app.locals.options
                            .canonicalHost}/sign-in"
                          class="button button--transparent"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Sign in on a Courselore installation managed by the developers of Courselore. Free for a limited time.",
                            });
                          `}"
                        >
                          <i class="bi bi-box-arrow-in-right"></i>
                          Sign in
                        </a>
                      `
                    : html`
                        <a
                          href="${app.locals.options.baseURL}/"
                          class="button button--blue"
                        >
                          Return to Courselore
                          <i class="bi bi-chevron-right"></i>
                        </a>
                      `}
                </div>

                <div>
                  <a
                    href="${app.locals.options.metaCourseloreInvitation}"
                    class="button button--transparent"
                    css="${res.locals.css(css`
                      align-items: center;
                    `)}"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "Join the Courselore community on Meta Courselore, a Courselore course that isn’t really a course, but a place to talk about Courselore itself.",
                      });
                    `}"
                  >
                    $${app.locals.partials.logo({
                      size: 16 /* var(--space--4) */,
                    })}
                    Meta Courselore
                  </a>
                  <a
                    href="https://github.com/courselore/courselore"
                    class="button button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "Courselore is open source and will be free forever for installing on your own server.",
                      });
                    `}"
                  >
                    <i class="bi bi-file-earmark-code"></i>
                    Source Code
                  </a>
                </div>

                <div>
                  <a
                    href="https://try.courselore.org/"
                    class="button button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "A Courselore installation running the latest development version. Not for use with real courses.",
                      });
                    `}"
                  >
                    <i class="bi bi-tools"></i>
                    Development Installation
                  </a>
                </div>
              </div>
            </div>

            <div
              css="${res.locals.css(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--light.png"
                alt="Courselore Main Screen"
                width="960"
                loading="lazy"
                class="img light"
                css="${res.locals.css(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
              <img
                src="/main-screen--dark.png"
                alt="Courselore Main Screen"
                width="960"
                loading="lazy"
                class="img dark"
                css="${res.locals.css(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              padding: var(--space--32) var(--space--8);
              display: flex;
              justify-content: center;
              @media (max-width: 1149px) {
                flex-direction: column;
                align-items: center;
                gap: var(--space--14);
              }
              @media (min-width: 1150px) {
                gap: var(--space--8);
              }
              & > * {
                flex: 1;
                max-width: var(--width--sm);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                align-items: center;
                text-align: center;
                & > :first-child {
                  display: flex;
                  gap: var(--space--4);
                  align-items: center;
                  & > :first-child {
                    border-radius: var(--border-radius--circle);
                    width: var(--space--10);
                    height: var(--space--10);
                    display: inline-flex;
                    justify-content: center;
                    align-items: center;
                    font-size: var(--font-size--xl);
                    line-height: var(--line-height--xl);
                  }
                  & > :last-child {
                    font-size: var(--font-size--3xl);
                    line-height: var(--line-height--3xl);
                    font-weight: var(--font-weight--black);
                    text-align: left;
                  }
                }
              }
            `)}"
          >
            <div>
              <div>
                <div
                  css="${res.locals.css(css`
                    color: var(--color--violet--700);
                    background-color: var(--color--violet--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--violet--200);
                      background-color: var(--color--violet--700);
                    }
                  `)}"
                >
                  <i class="bi bi-chat-left-text"></i>
                </div>
                <h2 class="heading--display">Forum & Chat</h2>
              </div>
              <p class="secondary">
                Question & Answer. Comprehensive search.<br />
                Notifications.
              </p>
            </div>

            <div>
              <div>
                <div
                  css="${res.locals.css(css`
                    color: var(--color--sky--700);
                    background-color: var(--color--sky--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--sky--200);
                      background-color: var(--color--sky--700);
                    }
                  `)}"
                >
                  <i class="bi bi-mortarboard-fill"></i>
                </div>
                <h2 class="heading--display">For Education</h2>
              </div>
              <p class="secondary">
                Anonymity. Private questions. Straightforward invitation system.
              </p>
            </div>

            <div>
              <div>
                <div
                  css="${res.locals.css(css`
                    color: var(--color--green--700);
                    background-color: var(--color--green--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--green--200);
                      background-color: var(--color--green--700);
                    }
                  `)}"
                >
                  <i class="bi bi-file-earmark-code"></i>
                </div>
                <h2 class="heading--display">Open Source</h2>
              </div>
              <p class="secondary">
                Easy to self-host for maximum privacy & control. <br />
                Welcoming to first-time contributors.
              </p>
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              @media (max-width: 889px) {
                flex-direction: column;
              }
              @media (min-width: 890px) {
                flex-direction: row-reverse;
              }
            `)}"
          >
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                Carefully Designed
              </p>
              <p
                class="secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Beautiful during the day. Elegant at night. <br />
                Always a joy to look at.
              </p>
            </div>

            <div
              css="${res.locals.css(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--light-and-dark.png"
                alt="Courselore Main Screen Featuring Light & Dark Modes"
                width="960"
                loading="lazy"
                class="img"
                css="${res.locals.css(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              justify-content: center;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              @media (max-width: 889px) {
                flex-direction: column;
                gap: var(--space--14);
              }
              @media (min-width: 890px) {
                gap: var(--space--24);
              }
            `)}"
          >
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                First-Class <br />
                Mobile Support
              </p>
              <p
                class="secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                It just works. Right from the browser. <br />
                No nagging to install an app.
              </p>
            </div>

            <div
              css="${res.locals.css(css`
                max-width: var(--width--3xl);
              `)}"
            >
              <img
                src="/main-screen--phone--light.jpeg"
                alt="Courselore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img light"
                css="${res.locals.css(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
              <img
                src="/main-screen--phone--dark.jpeg"
                alt="Courselore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img dark"
                css="${res.locals.css(css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `)}"
              />
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--36) var(--space--8);
              align-items: center;
              @media (max-width: 859px) {
                flex-direction: column;
              }
              @media (min-width: 860px) {
                flex-direction: row-reverse;
              }
            `)}"
          >
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <p
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                Rich-Text Messages
              </p>
              <p
                class="secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Markdown
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${res.locals.css(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      trigger: "click",
                      content: "A straightforward way to make text bold, include links, and so forth.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  LaTeX
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${res.locals.css(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      trigger: "click",
                      content: "A way to write mathematical formulas.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  Syntax highlighting
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${res.locals.css(css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `)}"
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      trigger: "click",
                      content: "Color computer code to make it easier to read.",
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                <br />
                Try it for yourself.
              </p>
            </div>

            <div
              css="${res.locals.css(css`
                flex: 1;
                max-width: calc(min(var(--width--xl), 100%));
              `)}"
              onload="${javascript`
                this.isModified = false;
              `}"
            >
              $${app.locals.partials.contentEditor({
                req,
                res,
                contentSource: dedent`
                  # Reasons to **Love** Courselore’s Message Editor

                  **Easy** to learn for people who are new to [Markdown](https://guides.github.com/features/mastering-markdown/).

                  Support for [mathematical formulas](https://katex.org/docs/supported.html):

                  $$

                  X_k = \sum_{n=0}^{N-1} x_n \cdot e^{-\frac{i2\pi}{N}kn}

                  $$

                  Gorgeous [syntax highlighter](https://shiki.matsu.io/):

                  \`\`\`javascript
                  import shiki from "shiki";

                  const highlighter = await shiki.getHighlighter({
                    theme: "nord",
                  });
                  console.log(highlighter.codeToHtml(\`console.log("shiki");\`, "js"));
                  \`\`\`

                  Add images & attachments by simply drag-and-dropping or copy-and-pasting.
                `,
                required: false,
              })}
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              flex-direction: column;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              gap: var(--space--14);
            `)}"
          >
            <div
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `)}"
            >
              <h2
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                The Team
              </h2>
            </div>

            <div
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--14);
                flex-direction: column;
                & > * {
                  display: flex;
                  gap: var(--space--4);
                  align-items: center;
                  max-width: var(--width--sm);
                  & > img {
                    background-color: transparent;
                    width: var(--space--24);
                    border-radius: var(--border-radius--circle);
                  }
                  & > p {
                    flex: 1;
                  }
                }
              `)}"
            >
              <a
                href="https://www.cs.jhu.edu/~scott/"
                class="button button--transparent"
              >
                <img
                  src="/team/scott-smith.png"
                  alt="Dr. Scott Smith"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <strong class="strong"> Dr. Scott Smith </strong>
                  <br />
                  <span class="secondary">
                    CEO. Professor of Computer Science at The Johns Hopkins
                    University.
                  </span>
                </p>
              </a>

              <a
                href="https://www.cs.jhu.edu/faculty/ali-madooei/"
                class="button button--transparent"
              >
                <img
                  src="/team/ali-madooei.png"
                  alt="Dr. Ali Madooei"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <strong class="strong"> Dr. Ali Madooei </strong>
                  <br />
                  <span class="secondary">
                    Consultant. Lecturer of Computer Science at The Johns
                    Hopkins University.
                  </span>
                </p>
              </a>

              <a href="https://leafac.com" class="button button--transparent">
                <img
                  src="/team/leandro-facchinetti.png"
                  alt="Leandro Facchinetti"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <strong class="strong"> Leandro Facchinetti </strong>
                  <br />
                  <span class="secondary">
                    Software Developer & Designer.
                  </span>
                </p>
              </a>

              <a
                href="https://github.com/ejasmith"
                class="button button--transparent"
              >
                <img
                  src="/team/eliot-smith.png"
                  alt="Eliot Smith"
                  loading="lazy"
                  class="img"
                />
                <p>
                  <strong class="strong"> Eliot Smith </strong>
                  <br />
                  <span class="secondary">
                    Intern. Student at The University of Rochester.
                  </span>
                </p>
              </a>
            </div>
          </div>

          <div
            css="${res.locals.css(css`
              font-size: var(--font-size--xl);
              line-height: var(--line-height--xl);
              font-weight: var(--font-weight--bold);
              display: flex;
              gap: var(--space--8);
              justify-content: center;
              padding: var(--space--36) var(--space--8);
              align-items: center;
              @media (max-width: 1159px) {
                flex-direction: column;
              }
            `)}"
          >
            $${res.locals.user === undefined
              ? html`
                  <a
                    href="https://${app.locals.options.canonicalHost}/sign-up"
                    class="button button--blue"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "Sign up on a Courselore installation managed by the developers of Courselore. Free for a limited time.",
                      });
                    `}"
                  >
                    <i class="bi bi-person-plus-fill"></i>
                    Sign up
                  </a>
                  <a
                    href="https://${app.locals.options.canonicalHost}/sign-in"
                    class="button button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "Sign in on a Courselore installation managed by the developers of Courselore. Free for a limited time.",
                      });
                    `}"
                  >
                    <i class="bi bi-box-arrow-in-right"></i>
                    Sign in
                  </a>
                `
              : html`
                  <a
                    href="${app.locals.options.baseURL}/"
                    class="button button--blue"
                  >
                    Return to Courselore
                    <i class="bi bi-chevron-right"></i>
                  </a>
                `}
            <a
              href="${app.locals.options.metaCourseloreInvitation}"
              class="button button--transparent"
              css="${res.locals.css(css`
                align-items: center;
              `)}"
              onload="${javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: "Join the Courselore community on Meta Courselore, a Courselore course that isn’t really a course, but a place to talk about Courselore itself.",
                });
              `}"
            >
              $${app.locals.partials.logo({ size: 24 /* var(--space--6) */ })}
              Meta Courselore
            </a>
            <a
              href="https://github.com/courselore/courselore"
              class="button button--transparent"
              onload="${javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: "Courselore is open source and will be free forever for installing on your own server.",
                });
              `}"
            >
              <i class="bi bi-file-earmark-code"></i>
              Source Code
            </a>
            <a
              href="https://try.courselore.org/"
              class="button button--transparent"
              onload="${javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: "A Courselore installation running the latest development version. Not for use with real courses.",
                });
              `}"
            >
              <i class="bi bi-tools"></i>
              Development Installation
            </a>
          </div>
        `,
      })
    );
  };

  if (
    app.locals.options.baseURL === app.locals.options.canonicalHost ||
    process.env.NODE_ENV !== "production"
  ) {
    app.get<{}, HTML, {}, {}, IsSignedOutMiddlewareLocals>(
      "/about",
      ...app.locals.middlewares.isSignedOut,
      app.locals.handlers.about
    );
    app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
      "/about",
      ...app.locals.middlewares.isSignedIn,
      app.locals.handlers.about
    );
  } else
    app.get<{}, HTML, {}, {}, BaseMiddlewareLocals>("/about", (req, res) => {
      res.redirect(303, `https://${app.locals.options.canonicalHost}/about`);
    });
};
