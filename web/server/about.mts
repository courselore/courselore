import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import dedent from "dedent";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>
  >(["/", "/about"], (request, response, next) => {
    if (request.originalUrl === "/" && response.locals.user !== undefined)
      return next();

    if (
      request.originalUrl === "/about" &&
      application.configuration.hostname !==
        application.addresses.canonicalHostname &&
      application.configuration.environment !== "development"
    )
      return response.redirect(
        303,
        `https://${application.addresses.canonicalHostname}/about`
      );

    response.send(
      application.server.locals.layouts.base({
        request,
        response,
        head: html`
          <title>Courselore · Communication Platform for Education</title>
        `,
        body: html`
          <div
            css="${css`
              display: flex;
              gap: var(--space--14);
              justify-content: center;
              padding: var(--space--20) var(--space--8);
              align-items: center;
              @media (max-width: 959px) {
                flex-direction: column;
              }
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `}"
            >
              <a
                href="https://${application.configuration.hostname}/about"
                class="heading--display button button--transparent"
                css="${css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `}"
              >
                $${application.server.locals.partials.logo({
                  size: 48 /* var(--space--12) */,
                })}
                Courselore
              </a>
              <h3
                class="secondary"
                css="${css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `}"
              >
                Communication Platform for Education
              </h3>

              <div
                css="${css`
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
                `}"
              >
                <div>
                  $${response.locals.user === undefined
                    ? html`
                        <a
                          href="https://${application.addresses
                            .canonicalHostname}/sign-up"
                          class="button button--blue"
                          javascript-TODO="${javascript_TODO`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Sign up on a Courselore installation managed by the developers of Courselore.",
                              },
                            });
                          `}"
                        >
                          <i class="bi bi-person-plus-fill"></i>
                          Sign up
                        </a>
                        <a
                          href="https://${application.addresses
                            .canonicalHostname}/sign-in"
                          class="button button--transparent"
                          javascript-TODO="${javascript_TODO`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Sign in on a Courselore installation managed by the developers of Courselore.",
                              },
                            });
                          `}"
                        >
                          <i class="bi bi-box-arrow-in-right"></i>
                          Sign in
                        </a>
                      `
                    : html`
                        <a
                          href="https://${application.configuration.hostname}/"
                          class="button button--blue"
                        >
                          Return to Courselore
                          <i class="bi bi-chevron-right"></i>
                        </a>
                      `}
                </div>

                <div>
                  <a
                    href="${application.addresses.metaCourseloreInvitation}"
                    class="button button--transparent"
                    css="${css`
                      align-items: center;
                    `}"
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Join the Courselore community on Meta Courselore, a Courselore course that isn’t really a course, but a place to talk about Courselore itself.",  
                        },
                      });
                    `}"
                  >
                    $${application.server.locals.partials.logo({
                      size: 16 /* var(--space--4) */,
                    })}
                    Meta Courselore
                  </a>
                  <a
                    href="https://github.com/courselore/courselore"
                    class="button button--transparent"
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Courselore is open source and will be free forever for installing on your own server.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-file-earmark-code"></i>
                    Source Code
                  </a>
                </div>

                <div>
                  <a
                    href="https://${application.addresses.tryHostname}"
                    class="button button--transparent"
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "A Courselore installation running the latest development version. Not for use with real courses.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-easel"></i>
                    Demonstration Installation
                  </a>
                </div>
              </div>
            </div>

            <div
              css="${css`
                max-width: var(--width--3xl);
              `}"
            >
              <img
                src="https://${application.configuration.hostname}/${application
                  .static["about/main-screen--light.webp"]}"
                alt="Courselore Main Screen"
                width="960"
                loading="lazy"
                class="img light"
                css="${css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `}"
              />
              <img
                src="https://${application.configuration.hostname}/${application
                  .static["about/main-screen--dark.webp"]}"
                alt="Courselore Main Screen"
                width="960"
                loading="lazy"
                class="img dark"
                css="${css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `}"
              />
            </div>
          </div>

          <div
            css="${css`
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
            `}"
          >
            <div>
              <div>
                <div
                  css="${css`
                    color: var(--color--violet--700);
                    background-color: var(--color--violet--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--violet--200);
                      background-color: var(--color--violet--700);
                    }
                  `}"
                >
                  <i
                    class="bi bi-chat-text-fill"
                    css="${css`
                      margin-left: var(--space--0-5);
                    `}"
                  ></i>
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
                  css="${css`
                    color: var(--color--sky--700);
                    background-color: var(--color--sky--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--sky--200);
                      background-color: var(--color--sky--700);
                    }
                  `}"
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
                  css="${css`
                    color: var(--color--green--700);
                    background-color: var(--color--green--200);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--green--200);
                      background-color: var(--color--green--700);
                    }
                  `}"
                >
                  <i
                    class="bi bi-file-earmark-code-fill"
                    css="${css`
                      margin-left: var(--space--0-5);
                    `}"
                  ></i>
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
            css="${css`
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
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `}"
            >
              <p
                class="heading--display"
                css="${css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `}"
              >
                Carefully Designed
              </p>
              <p
                class="secondary"
                css="${css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `}"
              >
                Beautiful during the day. Elegant at night. <br />
                Always a joy to look at.
              </p>
            </div>

            <div
              css="${css`
                max-width: var(--width--3xl);
              `}"
            >
              <img
                src="https://${application.configuration.hostname}/${application
                  .static["about/main-screen--light-and-dark.webp"]}"
                alt="Courselore Main Screen Featuring Light & Dark Modes"
                width="960"
                loading="lazy"
                class="img"
                css="${css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `}"
              />
            </div>
          </div>

          <div
            css="${css`
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
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `}"
            >
              <p
                class="heading--display"
                css="${css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `}"
              >
                First-Class <br />
                Mobile Support
              </p>
              <p
                class="secondary"
                css="${css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `}"
              >
                It just works. Right from the browser. <br />
                No nagging to install an app.
              </p>
            </div>

            <div
              css="${css`
                max-width: var(--width--3xl);
              `}"
            >
              <img
                src="https://${application.configuration.hostname}/${application
                  .static["about/main-screen--phone--light.webp"]}"
                alt="Courselore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img light"
                css="${css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `}"
              />
              <img
                src="https://${application.configuration.hostname}/${application
                  .static["about/main-screen--phone--dark.webp"]}"
                alt="Courselore Main Screen on Phone"
                width="300"
                loading="lazy"
                class="img dark"
                css="${css`
                  background-color: transparent;
                  border: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                `}"
              />
            </div>
          </div>

          <div
            css="${css`
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
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `}"
            >
              <p
                class="heading--display"
                css="${css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `}"
              >
                Rich-Text Messages
              </p>
              <p
                class="secondary"
                css="${css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `}"
              >
                Markdown
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `}"
                  javascript-TODO="${javascript_TODO`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "A straightforward way to make text bold, include links, and so forth.",
                      },
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  LaTeX
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `}"
                  javascript-TODO="${javascript_TODO`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "A way to write mathematical formulas.",
                      },
                    });
                  `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
                  Syntax highlighting
                <button
                  type="button"
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  css="${css`
                    font-size: var(--font-size--base);
                    line-height: var(--line-height--base);
                  `}"
                  javascript-TODO="${javascript_TODO`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "Color computer code to make it easier to read.",
                      },
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
              css="${css`
                flex: 1;
                max-width: calc(min(var(--width--xl), 100%));
              `}"
              javascript-TODO="${javascript_TODO`
                this.isModified = false;
              `}"
            >
              $${application.server.locals.partials.contentEditor({
                request: request,
                response: response,
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
            css="${css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              display: flex;
              flex-direction: column;
              padding: var(--space--32) var(--space--8);
              align-items: center;
              gap: var(--space--14);
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                max-width: var(--width--prose);
                align-items: center;
              `}"
            >
              <h2
                class="heading--display"
                css="${css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `}"
              >
                The Team
              </h2>
            </div>

            <div
              css="${css`
                display: flex;
                gap: var(--space--14);
                flex-direction: column;
                & > a {
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
              `}"
            >
              <a
                href="https://www.cs.jhu.edu/~scott/"
                class="button button--transparent"
              >
                <img
                  src="https://${application.configuration
                    .hostname}/${application.static["about/scott-smith.webp"]}"
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
                  src="https://${application.configuration
                    .hostname}/${application.static["about/ali-madooei.webp"]}"
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
                  src="https://${application.configuration
                    .hostname}/${application.static[
                    "about/leandro-facchinetti.webp"
                  ]}"
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

              <h3
                class="secondary"
                css="${css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                  text-align: center;
                  margin-bottom: var(--space---12);
                `}"
              >
                Alumni
              </h3>

              <a
                href="https://github.com/ejasmith"
                class="button button--transparent"
              >
                <img
                  src="https://${application.configuration
                    .hostname}/${application.static["about/eliot-smith.webp"]}"
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
            css="${css`
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
            `}"
          >
            $${response.locals.user === undefined
              ? html`
                  <a
                    href="https://${application.addresses
                      .canonicalHostname}/sign-up"
                    class="button button--blue"
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Sign up on a Courselore installation managed by the developers of Courselore.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-person-plus-fill"></i>
                    Sign up
                  </a>
                  <a
                    href="https://${application.addresses
                      .canonicalHostname}/sign-in"
                    class="button button--transparent"
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Sign in on a Courselore installation managed by the developers of Courselore.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-box-arrow-in-right"></i>
                    Sign in
                  </a>
                `
              : html`
                  <a
                    href="https://${application.configuration.hostname}/"
                    class="button button--blue"
                  >
                    Return to Courselore
                    <i class="bi bi-chevron-right"></i>
                  </a>
                `}
            <a
              href="${application.addresses.metaCourseloreInvitation}"
              class="button button--transparent"
              css="${css`
                align-items: center;
              `}"
              javascript-TODO="${javascript_TODO`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: "Join the Courselore community on Meta Courselore, a Courselore course that isn’t really a course, but a place to talk about Courselore itself.",
                  },
                });
              `}"
            >
              $${application.server.locals.partials.logo({
                size: 24 /* var(--space--6) */,
              })}
              Meta Courselore
            </a>
            <a
              href="https://github.com/courselore/courselore"
              class="button button--transparent"
              javascript-TODO="${javascript_TODO`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: "Courselore is open source and will be free forever for installing on your own server.",
                  },
                });
              `}"
            >
              <i class="bi bi-file-earmark-code"></i>
              Source Code
            </a>
            <a
              href="https://${application.addresses.tryHostname}"
              class="button button--transparent"
              javascript-TODO="${javascript_TODO`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: "A Courselore installation running the latest development version. Not for use with real courses.",
                  },
                });
              `}"
            >
              <i class="bi bi-easel"></i>
              Demonstration Installation
            </a>
          </div>
        `,
      })
    );
  });
};
