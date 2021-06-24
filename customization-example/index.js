module.exports = (require) => {
  const path = require("path");
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const { html } = require("@leafac/html");
  const css = require("tagged-template-noop");
  const markdown = require("dedent");

  return (app) => {
    const router = express.Router();

    router.use(cookieParser());
    router.all(
      "*",
      ...app.locals.middlewares.isAuthenticated,
      (req, res, next) => {
        next("router");
      }
    );
    router.use(express.static(path.join(__dirname, "public")));
    router.get(
      "/",
      (() => {
        const page = app.locals.layouts.base({
          head: html`<title>CourseLore · The Open-Source Student Forum</title>`,
          body: html`
            <div
              style="${css`
                color: var(--color--primary-gray--700);
                background-color: var(--color--primary-gray--50);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--primary-gray--200);
                  background-color: var(--color--primary-gray--900);
                }
              `}"
            >
              <header
                style="${css`
                  min-height: 90vh;
                  padding: var(--space--4);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--6);
                  justify-content: space-around;
                  align-items: center;
                `}"
              >
                <h1>
                  $${app.locals.partials.art.large.replace(
                    "</svg>",
                    html`
                      <g
                        text-anchor="middle"
                        style="${css`
                          font-weight: var(--font-weight--black);
                          font-style: italic;
                        `}"
                      >
                        <g transform="translate(300, 250) rotate(-2)">
                          <rect
                            width="550"
                            height="100"
                            x="-275"
                            y="-85"
                            rx="10"
                            style="${css`
                              fill: var(--color--primary--700);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--primary--800);
                              }
                            `}"
                          />
                          <text
                            style="${css`
                              font-family: var(--font-family--serif);
                              font-size: var(--font-size--8xl);
                              line-height: var(--line-height--8xl);
                              fill: var(--color--primary--50);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--primary--200);
                              }
                            `}"
                          >
                            CourseLore
                          </text>
                        </g>
                        <g transform="translate(300, 350) rotate(-2)">
                          <rect
                            x="-250"
                            y="-35"
                            width="500"
                            height="50"
                            rx="10"
                            style="${css`
                              fill: var(--color--fuchsia--500);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--fuchsia--800);
                              }
                            `}"
                          />
                          <text
                            style="${css`
                              font-size: var(--font-size--3xl);
                              line-height: var(--line-height--3xl);
                              fill: var(--color--fuchsia--50);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--fuchsia--200);
                              }
                            `}"
                          >
                            The Open-Source Student Forum
                          </text>
                        </g>
                        <g transform="translate(300, 550) rotate(-2)">
                          <rect
                            width="370"
                            height="35"
                            x="-185"
                            y="-26"
                            rx="10"
                            style="${css`
                              fill: var(--color--pink--500);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--pink--800);
                              }
                            `}"
                          />
                          <text
                            style="${css`
                              font-size: var(--font-size--2xl);
                              line-height: var(--line-height--2xl);
                              fill: var(--color--pink--50);
                              @media (prefers-color-scheme: dark) {
                                fill: var(--color--pink--200);
                              }
                              text-transform: uppercase;
                              letter-spacing: var(--space--0-5);
                            `}"
                          >
                            Coming September 2021!
                          </text>
                        </g>
                      </g>
                      $&
                    `
                  )}
                  <script>
                    (() => {
                      const element =
                        document.currentScript.previousElementSibling;
                      document.addEventListener("DOMContentLoaded", () => {
                        if (element.dataset.animated) return;
                        element.dataset.animated = true;
                        new ArtAnimation({
                          element,
                          speed: 0.001,
                          amount: 3,
                          startupDuration: 0,
                        }).start();
                      });
                    })();
                  </script>
                </h1>

                <nav
                  style="${css`
                    display: flex;
                    gap: var(--space--4);

                    @media (max-width: 449px) {
                      width: 100%;
                      flex-direction: column;
                    }
                  `}"
                >
                  <a
                    href="$${app.locals.settings.url}/authenticate"
                    data-tippy-content="Very rough early demonstration"
                    data-tippy-theme="tooltip"
                    data-tippy-touch="false"
                    class="button button--primary"
                  >
                    <i class="bi bi-easel"></i>
                    Demonstration
                  </a>

                  <div
                    style="${css`
                      display: flex;
                      gap: var(--space--2);
                      justify-content: center;
                    `}"
                  >
                    <a
                      href="https://github.com/courselore/courselore"
                      class="button button--secondary"
                    >
                      <i class="bi bi-github"></i>
                      Source Code
                    </a>

                    <a
                      href="mailto:contact@courselore.org"
                      class="button button--secondary"
                    >
                      <i class="bi bi-envelope"></i>
                      Contact
                    </a>
                  </div>
                </nav>
              </header>

              <main
                style="${css`
                  & > div {
                    position: relative;

                    & > svg {
                      width: 100%;
                      height: 100%;
                      position: absolute;
                      z-index: -1;
                      opacity: 10%;
                    }

                    & > section {
                      min-height: 100vh;
                      padding: calc(10vw + var(--space--8)) var(--space--4);
                      display: flex;
                      flex-direction: column;
                      justify-content: center;
                      align-items: center;
                      gap: var(--space--8);

                      & > div {
                        display: flex;
                        gap: var(--space--8);

                        @media (max-width: 1023px) {
                          max-width: var(--space--72);
                          flex-direction: column;
                        }

                        @media (min-width: 1024px) {
                          max-width: calc(
                            var(--space--72) * 3 + var(--space--8) * 2
                          );
                          & > * {
                            flex: 1;
                          }
                        }
                      }
                    }
                  }
                `}"
              >
                $${(() => {
                  const background = html`
                    $${app.locals.partials.art.small
                      .replace(
                        "<svg",
                        `$& preserveAspectRatio="xMidYMid slice"`
                      )
                      .replace(/width=".*?"/, "")
                      .replace(/height=".*?"/, "")
                      .replace(/viewBox=".*?"/, `viewBox="5 5 15 15"`)}
                    <script>
                      (() => {
                        const element =
                          document.currentScript.previousElementSibling;
                        document.addEventListener("DOMContentLoaded", () => {
                          if (element.dataset.animated) return;
                          element.dataset.animated = true;
                          new ArtAnimation({
                            element,
                            speed: 0.0001,
                            amount: 5,
                            startupDuration: 0,
                          }).start();
                        });
                      })();
                    </script>
                  `;

                  return html`
                    <div
                      style="${css`
                        color: var(--color--primary--100);
                        background-color: var(--color--primary--800);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--primary--200);
                          background-color: var(--color--primary--900);
                        }
                        clip-path: polygon(
                          0 10vw,
                          100% 0,
                          100% calc(100% - 10vw),
                          0 100%
                        );
                      `}"
                    >
                      $${background}
                      <section>
                        <h2 class="heading--display--1">
                          A forum for educators & students
                        </h2>

                        <div
                          style="${css`
                            & > div {
                              color: var(--color--primary--800);
                              background-color: var(--color--primary--100);
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--primary--100);
                                background-color: var(--color--primary--900);
                                border: var(--border-width--1) solid
                                  var(--color--primary--700);
                              }
                              padding: var(--space--4);
                              border-radius: var(--border-radius--xl);
                              display: flex;
                              flex-direction: column;
                              gap: var(--space--4);

                              & > h3 {
                                display: flex;
                                align-items: center;
                                gap: var(--space--2);
                                @media (prefers-color-scheme: dark) {
                                  color: var(--color--primary--200);
                                }

                                & > i {
                                  background-color: var(--color--primary--200);
                                  @media (prefers-color-scheme: dark) {
                                    background-color: var(
                                      --color--primary--700
                                    );
                                  }
                                  width: var(--font-size--4xl);
                                  height: var(--font-size--4xl);
                                  border-radius: 50%;
                                  display: inline-flex;
                                  justify-content: center;
                                  align-items: center;
                                }
                              }

                              & > ul {
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);

                                & > li {
                                  display: flex;
                                  gap: var(--space--2);

                                  & > i,
                                  & > button {
                                    color: var(--color--primary--600);
                                    @media (prefers-color-scheme: dark) {
                                      color: var(--color--primary--300);
                                    }
                                  }

                                  & > button {
                                    &:hover,
                                    &:focus {
                                      color: var(--color--primary--500);
                                    }
                                    &:active {
                                      color: var(--color--primary--700);
                                    }
                                    @media (prefers-color-scheme: dark) {
                                      &:hover,
                                      &:focus {
                                        color: var(--color--primary--400);
                                      }
                                      &:active {
                                        color: var(--color--primary--500);
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          `}"
                        >
                          <div>
                            <h3 class="heading--1">
                              <i class="bi bi-toggles"></i>
                              Fully-Featured
                            </h3>
                            <ul>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Q&A / Chat
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Announcements & Notifications
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Anonymity
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Markdown
                                <button
                                  data-tippy-content="What’s Markdown?"
                                  data-tippy-theme="tooltip"
                                  data-tippy-touch="false"
                                  data-micromodal-trigger="modal--markdown"
                                >
                                  <i class="bi bi-info-circle"></i>
                                </button>
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                LaTeX
                                <button
                                  data-tippy-content="What’s LaTeX?"
                                  data-tippy-theme="tooltip"
                                  data-tippy-touch="false"
                                  data-micromodal-trigger="modal--latex"
                                >
                                  <i class="bi bi-info-circle"></i>
                                </button>
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Syntax highlighting
                                <button
                                  data-tippy-content="What’s Syntax Highlighting?"
                                  data-tippy-theme="tooltip"
                                  data-tippy-touch="false"
                                  data-micromodal-trigger="modal--syntax-highlighting"
                                >
                                  <i class="bi bi-info-circle"></i>
                                </button>
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Easy-to-use & modern interface
                              </li>
                            </ul>
                          </div>

                          <div>
                            <h3 class="heading--1">
                              <i class="bi bi-code-square"></i>
                              Open-Source
                            </h3>
                            <ul>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Free for everyone; forever
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Programmable via the CourseLore API
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Beginner-friendly code base
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Read the code base and build your trust on the
                                software that you use
                              </li>
                            </ul>
                          </div>

                          <div>
                            <h3 class="heading--1">
                              <i class="bi bi-shield-lock"></i>
                              Self-Hosted
                            </h3>
                            <ul>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Easy to run on your own server
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Respect educators and students’ privacy
                              </li>
                              <li>
                                <i class="bi bi-check-circle-fill"></i>
                                Own your data
                              </li>
                            </ul>
                          </div>
                        </div>
                      </section>
                    </div>

                    <div
                      style="${css`
                        color: var(--color--fuchsia--100);
                        background-color: var(--color--fuchsia--800);
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--fuchsia--200);
                          background-color: var(--color--fuchsia--900);
                        }
                        margin-top: -5vw;
                        clip-path: polygon(0 10vw, 100% 0, 100% 100%, 0 100%);
                      `}"
                    >
                      $${background}
                      <section>
                        <h2 class="heading--display--1">Team</h2>

                        <div
                          style="${css`
                            & > a {
                              color: var(--color--fuchsia--800);
                              background-color: var(--color--fuchsia--100);
                              @media (prefers-color-scheme: dark) {
                                color: var(--color--fuchsia--200);
                                background-color: var(--color--fuchsia--900);
                                border: var(--border-width--1) solid
                                  var(--color--fuchsia--700);
                              }
                              display: block;
                              border-radius: var(--border-radius--xl);
                              transition: transform var(--transition-duration);

                              &:hover,
                              &:focus {
                                transform: scale(1.02) rotate(-1deg);
                              }
                              &:active {
                                transform: scale(0.98);
                              }

                              & > div {
                                & > img {
                                  display: block;
                                  border-top-left-radius: var(
                                    --border-radius--xl
                                  );
                                  border-top-right-radius: var(
                                    --border-radius--xl
                                  );
                                  clip-path: polygon(
                                    0 0,
                                    100% 0,
                                    100% calc(100% - var(--space--8)),
                                    0 100%
                                  );
                                  @media (prefers-color-scheme: dark) {
                                    filter: brightness(0.8);
                                  }
                                }

                                & > div {
                                  padding: var(--space--2) var(--space--4)
                                    var(--space--4);
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);

                                  & > div {
                                    & > h3 {
                                      color: var(--color--fuchsia--900);
                                      @media (prefers-color-scheme: dark) {
                                        color: var(--color--fuchsia--100);
                                      }
                                    }

                                    & > h4 {
                                      color: var(--color--fuchsia--400);
                                      @media (prefers-color-scheme: dark) {
                                        color: var(--color--fuchsia--400);
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          `}"
                        >
                          <a href="https://www.cs.jhu.edu/~scott/">
                            <div>
                              <img
                                src="${app.locals.settings.url}/scott.jpg"
                                alt="Dr. Scott Smith"
                              />
                              <div>
                                <div>
                                  <h3 class="heading--1">Dr. Scott Smith</h3>
                                  <h4 class="heading--2">CEO</h4>
                                </div>
                                <p>
                                  Scott is a full professor at the Johns Hopkins
                                  University. Over his thirty years of
                                  experience as an educator, Scott taught
                                  courses on the Principles of Programming
                                  Languages, Object-Oriented Software
                                  Engineering, Functional Programming, and so
                                  forth.
                                </p>
                              </div>
                            </div>
                          </a>

                          <a href="https://www.cs.jhu.edu/faculty/ali-madooei/">
                            <div>
                              <img
                                src="${app.locals.settings.url}/ali.jpg"
                                alt="Dr. Ali Madooei"
                              />
                              <div>
                                <div>
                                  <h3 class="heading--1">Dr. Ali Madooei</h3>
                                  <h4 class="heading--2">Consultant</h4>
                                </div>
                                <p>
                                  Ali is a lecturer at the Johns Hopkins
                                  University. Ali has taught courses in several
                                  areas, from Introduction to Programming to
                                  Object-Oriented Software Engineering. Ali has
                                  classroom experience with many student forums
                                  and knows what it takes to make a great one.
                                </p>
                              </div>
                            </div>
                          </a>

                          <a href="https://leafac.com">
                            <div>
                              <img
                                src="${app.locals.settings.url}/leandro.jpg"
                                alt="Leandro Facchinetti"
                              />
                              <div>
                                <div>
                                  <h3 class="heading--1">
                                    Leandro Facchinetti
                                  </h3>
                                  <h4 class="heading--2">
                                    Developer & Designer
                                  </h4>
                                </div>
                                <p>
                                  Leandro was a PhD Candidate at the Johns
                                  Hopkins University. He received the Whiting
                                  School of Engineering’s Professor Joel Dean
                                  Excellence in Teaching Award for five years of
                                  work as a teaching assistant, and taught a
                                  course on Object-Oriented Software
                                  Engineering.
                                </p>
                              </div>
                            </div>
                          </a>
                        </div>
                      </section>
                    </div>
                  `;
                })()}
              </main>
            </div>

            $${(() => {
              const textProcessorExample = (text) =>
                html`
                  <div
                    style="${css`
                      display: flex;

                      & > div {
                        display: flex;
                        flex-direction: column;

                        & > h4 {
                          font-weight: var(--font-weight--bold);
                          text-align: center;
                          color: var(--color--primary--800);
                          background-color: var(--color--primary--50);
                          @media (prefers-color-scheme: dark) {
                            color: var(--color--primary--300);
                            background-color: var(--color--primary-gray--800);
                          }
                          padding: var(--space--2) var(--space--4);
                        }

                        & > div {
                          background-color: var(--color--primary-gray--50);
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--primary-gray--800);
                          }
                          flex: 1;
                          padding: var(--space--4);
                          margin-top: calc(-1 * var(--border-width--1));
                        }

                        & > * {
                          border: var(--border-width--1) solid
                            var(--color--primary--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--primary--900);
                          }
                        }
                      }

                      @media (max-width: 649px) {
                        flex-direction: column;

                        & > :first-child > :first-child {
                          border-top-left-radius: var(--border-radius--xl);
                          border-top-right-radius: var(--border-radius--xl);
                        }

                        & > :last-child > :last-child {
                          border-bottom-left-radius: var(--border-radius--xl);
                          border-bottom-right-radius: var(--border-radius--xl);
                        }

                        & > :not(:first-child) {
                          margin-top: calc(-1 * var(--border-width--1));
                        }
                      }

                      @media (min-width: 650px) {
                        & > * {
                          flex: 1;
                        }

                        & > :first-child {
                          & > :first-child {
                            border-top-left-radius: var(--border-radius--xl);
                          }
                          & > :last-child {
                            border-bottom-left-radius: var(--border-radius--xl);
                          }
                        }

                        & > :last-child {
                          & > :first-child {
                            border-top-right-radius: var(--border-radius--xl);
                          }
                          & > :last-child {
                            border-bottom-right-radius: var(
                              --border-radius--xl
                            );
                          }
                        }

                        & > :not(:first-child) {
                          margin-left: calc(-1 * var(--border-width--1));
                        }
                      }
                    `}"
                  >
                    <div>
                      <h4>You write…</h4>
                      <div>
                        <pre><code>$${text}</code></pre>
                      </div>
                    </div>
                    <div>
                      <h4>…and your post looks like</h4>
                      <div class="text">
                        $${app.locals.partials.textProcessor(text)}
                      </div>
                    </div>
                  </div>
                `;

              return html`
                <div id="modal--markdown" class="modal">
                  <div data-micromodal-close class="modal--close-button">
                    <div
                      class="modal--dialog"
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <h3 class="heading--1">What’s Markdown?</h3>
                      <p>
                        Markdown is a simple way to include bold text, links,
                        lists, and many other forms of rich-text formatting in
                        your posts, for example:
                      </p>
                      $${textProcessorExample(
                        markdown`
                          Things I **love** about
                          [CourseLore](https://courselore.org):

                          - It’s easy to install.
                          - It respects my privacy.
                          - It looks great.
                        `
                      )}
                      <p class="text">
                        Markdown is much more powerful than this simple example
                        shows, it’s
                        <a
                          href="https://guides.github.com/features/mastering-markdown/"
                          >easy to learn</a
                        >, and it’s used by many popular forums including
                        <a href="https://www.reddit.com">Reddit</a>,
                        <a href="https://stackoverflow.com/">Stack Overflow</a>,
                        <a href="https://github.com/">GitHub Issues</a>, and so
                        forth.
                      </p>
                    </div>
                  </div>
                </div>

                <div id="modal--latex" class="modal">
                  <div data-micromodal-close class="modal--close-button">
                    <div
                      class="modal--dialog"
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <h3 class="heading--1">What’s LaTeX?</h3>
                      <p>
                        LaTeX is a simple way to include mathematical formulas
                        in your posts, for example:
                      </p>
                      $${textProcessorExample(
                        markdown`
                          There’s an $e^{ix}$ in
                          Euler’s formula:

                          $$
                          e^{ix} = \cos x + i \sin x
                          $$
                        `
                      )}
                      <p class="text">
                        LaTeX is much more powerful than this simple example
                        shows, it’s
                        <a href="https://katex.org/docs/supported.html"
                          >easy to learn</a
                        >, and it’s used by many people in academia.
                      </p>
                    </div>
                  </div>
                </div>

                <div id="modal--syntax-highlighting" class="modal">
                  <div data-micromodal-close class="modal--close-button">
                    <div
                      class="modal--dialog"
                      style="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <h3 class="heading--1">What’s Syntax Highlighting?</h3>
                      <p>
                        Syntax highlighting is the colors that make code
                        snippets in your posts easier to read, for example:
                      </p>
                      $${textProcessorExample(
                        // prettier-ignore
                        markdown`
                      Calculate the position:
      
                      \`\`\`javascript
                      function position(time) {
                        return time * 0.25;
                      }
                      \`\`\`
                    `
                      )}
                      <p class="text">
                        CourseLore uses
                        <a href="https://shiki.matsu.io/"
                          >the same syntax highlighter as Visual Studio Code</a
                        >, which supports all popular programming languages so
                        your posts will always look awesome.
                      </p>
                    </div>
                  </div>
                </div>
              `;
            })()}
          `,
        });
        return (req, res) => {
          res.send(page);
        };
      })()
    );

    return router;
  };
};
