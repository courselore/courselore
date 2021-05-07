module.exports = (require) => {
  const path = require("path");
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const { html } = require("@leafac/html");
  const css = require("tagged-template-noop");
  const javascript = require("tagged-template-noop");
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
    app.locals.partials.customizedIndex = html`
      <div class="text-center">
        <header class="container">
          <p class="mt-3">
            $${app.locals.partials.art.large
              .replace("<svg", `$& class="img-fluid"`)
              .replace(
                "</svg>",
                html`
                  <g
                    font-weight="bold"
                    font-style="italic"
                    fill="white"
                    text-anchor="middle"
                  >
                    <g transform="translate(300, 250) rotate(-2)">
                      <rect
                        fill="#83769c"
                        width="570"
                        height="100"
                        x="-285"
                        y="-85"
                        rx="10"
                      />
                      <text font-family="IBM Plex Serif" font-size="6.5rem">
                        CourseLore
                      </text>
                    </g>
                    <g transform="translate(300, 350) rotate(-2)">
                      <rect
                        fill="#ff77a8"
                        x="-245"
                        y="-35"
                        width="490"
                        height="50"
                        rx="10"
                      />
                      <text font-size="2rem">
                        The Open-Source Student Forum
                      </text>
                    </g>
                    <g transform="translate(300, 550) rotate(-2)">
                      <rect
                        fill="#29adff"
                        width="370"
                        height="35"
                        x="-185"
                        y="-26"
                        rx="10"
                      />
                      <text font-size="1.5rem" letter-spacing="2">
                        COMING SEPTEMBER 2021!
                      </text>
                    </g>
                  </g>
                  $&
                `
              )}
            <script>
              new ArtAnimation({
                element: document.currentScript.previousElementSibling,
                speed: 0.001,
                amount: 3,
                startupDuration: 0,
              }).start();
            </script>
          </p>

          <nav>
            <p>
              <a
                href="$${app.locals.settings.url}/authenticate"
                class="btn btn-primary btn-lg me-3"
                data-bs-toggle="tooltip"
                title="Very early development demo"
                >Demo</a
              >

              <span class="btn-group btn-group-lg">
                <a
                  href="https://github.com/courselore"
                  class="btn btn-outline-primary"
                  data-bs-toggle="tooltip"
                  title="Source code on GitHub"
                  ><i class="bi bi-github"></i
                ></a>

                <a
                  href="mailto:contact@courselore.org"
                  class="btn btn-outline-primary"
                  data-bs-toggle="tooltip"
                  title="Contact via email"
                  ><i class="bi bi-envelope-fill"></i
                ></a>
              </span>
            </p>
          </nav>
        </header>

        <main>
          <div
            class="text-white position-relative"
            style="${css`
              background-color: $purple;
              clip-path: polygon(
                0 10vw,
                100% 0,
                100% calc(100% - 10vw),
                0 100%
              );
            `}"
          >
            $${app.locals.partials.art.small
              .replace(
                "<svg",
                `$&
                  preserveAspectRatio="none"
                  class="position-absolute top-0 start-0 w-100 h-100"
                  style="${css`
                    opacity: 40%;
                    z-index: -1;
                  `}"`
              )
              .replace(/viewBox=".*?"/, `viewBox="5 5 15 15"`)}
            <script>
              new ArtAnimation({
                element: document.currentScript.previousElementSibling,
                speed: 0.0001,
                amount: 5,
                startupDuration: 0,
              }).start();
            </script>

            <section
              class="container"
              style="${css`
                padding-top: calc(10vw + 1rem);
                padding-bottom: 13vw;
              `}"
            >
              <h1
                class="font-serif fw-bold fst-italic mb-3"
                style="${css`
                  text-shadow: 2px 2px $purple-600;
                `}"
              >
                A forum for educators & students
              </h1>

              <div class="card-group">
                <div
                  class="card"
                  style="${css`
                    background-color: $purple-600;
                  `}"
                >
                  <div class="card-header">
                    <h5 class="mb-0">
                      <i class="bi bi-toggles"></i> Fully-Featured
                    </h5>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      All the features you’ve come to expect from a forum,
                      including Q&A, announcements, notifications, invitations,
                      Markdown <span
                        data-bs-toggle="tooltip"
                        title="What’s Markdown?"
                      >
                        <button
                          type="button"
                          class="btn btn-link text-reset p-0"
                          data-bs-toggle="modal"
                          data-bs-target="#markdown-modal"
                          aria-label="More information"
                          onclick="${javascript`
                            bootstrap.Tooltip.getInstance(this.parentElement).hide();
                          `}"
                        >
                          <i class="bi bi-question-circle-fill"></i>
                        </button> </span
                      >, LaTeX <span
                        data-bs-toggle="tooltip"
                        title="What’s LaTeX?"
                      >
                        <button
                          type="button"
                          class="btn btn-link text-reset p-0"
                          data-bs-toggle="modal"
                          data-bs-target="#latex-modal"
                          aria-label="More information"
                          onclick="${javascript`
                            bootstrap.Tooltip.getInstance(this.parentElement).hide();
                          `}"
                        >
                          <i class="bi bi-question-circle-fill"></i>
                        </button> </span
                      >, syntax highlighting <span
                        data-bs-toggle="tooltip"
                        title="What’s Syntax Highlighting?"
                      >
                        <button
                          type="button"
                          class="btn btn-link text-reset p-0"
                          data-bs-toggle="modal"
                          data-bs-target="#syntax-highlighting-modal"
                          aria-label="More information"
                          onclick="${javascript`
                            bootstrap.Tooltip.getInstance(this.parentElement).hide();
                          `}"
                        >
                          <i class="bi bi-question-circle-fill"></i>
                        </button> </span
                      >, and much more, all in an easy-to-use and modern
                      interface.
                    </p>
                  </div>
                </div>

                <div
                  class="card"
                  style="${css`
                    background-color: $purple-600;
                  `}"
                >
                  <div class="card-header">
                    <h5 class="mb-0">
                      <i class="bi bi-code-square"></i> Open-Source
                    </h5>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      We’re building CourseLore in the open. You may inspect
                      CourseLore’s source code to build your trust on the
                      software that you use, you may build other tools on top of
                      the CourseLore API, and you may collaborate on the
                      development.
                    </p>
                  </div>
                </div>

                <div
                  class="card"
                  style="${css`
                    background-color: $purple-600;
                  `}"
                >
                  <div class="card-header">
                    <h5 class="mb-0">
                      <i class="bi bi-shield-lock"></i> Self-Hosted
                    </h5>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      CourseLore is easy to run on your own server. This means
                      you know exactly where your data is and who owns it: you.
                      Utmost respect for educators & students’ privacy is at the
                      core of what we do.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div
            class="text-white position-relative"
            style="${css`
              background-color: $pink;
              clip-path: polygon(0 10vw, 100% 0, 100% 100%, 0 100%);
              margin-top: -5vw;
            `}"
          >
            $${app.locals.partials.art.small
              .replace(
                "<svg",
                `$&
                  preserveAspectRatio="none"
                  class="position-absolute top-0 start-0 w-100 h-100"
                  style="${css`
                    opacity: 40%;
                    z-index: -1;
                  `}"`
              )
              .replace(/viewBox=".*?"/, `viewBox="10 10 20 20"`)}
            <script>
              new ArtAnimation({
                element: document.currentScript.previousElementSibling,
                speed: 0.0001,
                amount: 5,
                startupDuration: 0,
              }).start();
            </script>

            <section
              class="container"
              style="${css`
                padding-top: calc(10vw + 1rem);
                padding-bottom: 5vw;
              `}"
            >
              <h1
                class="font-serif fw-bold fst-italic mb-3"
                style="${css`
                  text-shadow: 2px 2px $pink-600;
                `}"
              >
                Team
              </h1>

              <div class="card-group">
                <div
                  class="card"
                  style="${css`
                    background-color: $pink-600;
                  `}"
                >
                  <div class="card-header">
                    <a
                      href="https://www.cs.jhu.edu/~scott/"
                      class="stretched-link"
                      ><img
                        src="${app.locals.settings.url}/scott.png"
                        alt="Dr. Scott Smith"
                        width="200"
                        class="card-title img-thumbnail rounded-circle"
                    /></a>
                    <h5 class="card-title mb-0">Dr. Scott Smith</h5>
                    <p class="card-subtitle">CEO</p>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      Scott is a full professor at the Johns Hopkins University.
                      Over his thirty years of experience as an educator, Scott
                      taught courses on the Principles of Programming Languages,
                      Object-Oriented Software Engineering, Functional
                      Programming, and so forth.
                    </p>
                  </div>
                </div>

                <div
                  class="card"
                  style="${css`
                    background-color: $pink-600;
                  `}"
                >
                  <div class="card-header">
                    <a
                      href="https://www.cs.jhu.edu/faculty/ali-madooei/"
                      class="stretched-link"
                      ><img
                        src="${app.locals.settings.url}/ali.png"
                        alt="Dr. Ali Madooei"
                        width="200"
                        class="card-title img-thumbnail rounded-circle"
                    /></a>
                    <h5 class="card-title mb-0">Dr. Ali Madooei</h5>
                    <p class="card-subtitle">Consultant</p>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      Ali is a lecturer at the Johns Hopkins University. Ali has
                      taught courses in several areas, from Introduction to
                      Programming to Object-Oriented Software Engineering. Ali
                      has classroom experience with many student forums and
                      knows what it takes to make a great one.
                    </p>
                  </div>
                </div>

                <div
                  class="card"
                  style="${css`
                    background-color: $pink-600;
                  `}"
                >
                  <div class="card-header">
                    <a href="https://leafac.com" class="stretched-link"
                      ><img
                        src="${app.locals.settings.url}/leandro.png"
                        alt="Leandro Facchinetti"
                        width="200"
                        class="card-title img-thumbnail rounded-circle"
                    /></a>
                    <h5 class="card-title mb-0">Leandro Facchinetti</h5>
                    <p class="card-subtitle">Developer & Designer</p>
                  </div>
                  <div class="card-body text-start">
                    <p class="card-text">
                      Leandro was a PhD Candidate at the Johns Hopkins
                      University. He received the Whiting School of
                      Engineering’s Professor Joel Dean Excellence in Teaching
                      Award for five years of work as a teaching assistant, and
                      taught a course on Object-Oriented Software Engineering.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <div
        class="modal fade"
        id="markdown-modal"
        tabindex="-1"
        aria-labelledby="markdown-modal-label"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="markdown-modal-label">
                What’s Markdown?
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">
              $${(() => {
                const example = markdown`
                  Things I’m **loving** about
                  [CourseLore](https://courselore.org):

                  - It’s easy to install.
                  - It respects my privacy.
                  - It looks great.
                `;
                return html`
                  <p class="card-text">
                    Markdown is a simple way to include bold text, links, lists,
                    and many other forms of rich-text formatting in your posts,
                    for example:
                  </p>

                  <div class="card-group">
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        You write
                      </div>
                      <div class="card-body pb-0">
                        <pre><code>$${example}</code></pre>
                      </div>
                    </div>
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        and your post looks like
                      </div>
                      <div class="card-body pb-0">
                        $${app.locals.partials.textProcessor(example)}
                      </div>
                    </div>
                  </div>

                  <p class="card-text">
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
                `;
              })()}
            </div>
          </div>
        </div>
      </div>

      <div
        class="modal fade"
        id="latex-modal"
        tabindex="-1"
        aria-labelledby="latex-modal-label"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="latex-modal-label">What’s LaTeX?</h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">
              $${(() => {
                const example = markdown`
                  There’s an $e^{ix}$ in
                  Euler’s formula:

                  $$
                  e^{ix} = \cos x + i \sin x
                  $$
                `;
                return html`
                  <p class="card-text">
                    LaTeX is a simple way to include mathematical formulas in
                    your posts, for example:
                  </p>

                  <div class="card-group">
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        You write
                      </div>
                      <div class="card-body pb-0">
                        <pre><code>$${example}</code></pre>
                      </div>
                    </div>
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        and your post looks like
                      </div>
                      <div class="card-body pb-0">
                        $${app.locals.partials.textProcessor(example)}
                      </div>
                    </div>
                  </div>

                  <p class="card-text">
                    LaTeX is much more powerful than this simple example shows,
                    it’s
                    <a href="https://katex.org/docs/supported.html"
                      >easy to learn</a
                    >, and it’s used by many people in academia.
                  </p>
                `;
              })()}
            </div>
          </div>
        </div>
      </div>

      <div
        class="modal fade"
        id="syntax-highlighting-modal"
        tabindex="-1"
        aria-labelledby="syntax-highlighting-modal-label"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="syntax-highlighting-modal-label">
                What’s Syntax Highlighting?
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">
              $${(() => {
                const example =
                  // prettier-ignore
                  markdown`
                  Calculate the position:

                  \`\`\`javascript
                  function position(time) {
                    return time * 0.25;
                  }
                  \`\`\`
                `;
                return html`
                  <p class="card-text">
                    Syntax highlighting is coloring code snippets in your posts
                    to make them easier to read, for example:
                  </p>

                  <div class="card-group">
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        You write
                      </div>
                      <div class="card-body pb-0">
                        <pre><code>$${example}</code></pre>
                      </div>
                    </div>
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        and your post looks like
                      </div>
                      <div class="card-body pb-0">
                        $${app.locals.partials.textProcessor(example)}
                      </div>
                    </div>
                  </div>

                  <p class="card-text">
                    CourseLore uses
                    <a href="https://shiki.matsu.io/"
                      >the same syntax highlighter as Visual Studio Code</a
                    >, which supports all popular programming languages so your
                    posts will always look awesome.
                  </p>
                `;
              })()}
            </div>
          </div>
        </div>
      </div>
    `;
    router.get("/", (req, res) =>
      res.send(
        app.locals.layouts.base(
          req,
          res,
          html`<title>CourseLore · The Open-Source Student Forum</title>`,
          app.locals.partials.customizedIndex
        )
      )
    );

    return router;
  };
};
