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
      <header
        style="${css`
          background-color: var(--color--primary-gray--50);
          min-height: 90vh;
          padding: var(--space--4);
          padding-bottom: 10vw;
          display: flex;
          flex-direction: column;
          gap: var(--space--6);
          justify-content: space-between;
          align-items: center;
        `}"
      >
        <h1>
          <span class="visually-hidden">CourseLore</span>
          $${app.locals.partials.art.large.replace(
            "</svg>",
            html`
              <g text-anchor="middle">
                <g transform="translate(300, 250) rotate(-2)">
                  <rect
                    width="550"
                    height="100"
                    x="-275"
                    y="-85"
                    rx="10"
                    style="${css`
                      fill: var(--color--primary--700);
                    `}"
                  />
                  <text
                    style="${css`
                      font-family: var(--font-family--serif);
                      font-size: var(--font-size--8xl);
                      line-height: var(--line-height--8xl);
                      font-weight: var(--font-weight--black);
                      font-style: italic;
                      fill: var(--color--primary--50);
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
                    `}"
                  />
                  <text
                    style="${css`
                      font-size: var(--font-size--3xl);
                      line-height: var(--line-height--3xl);
                      font-weight: var(--font-weight--black);
                      font-style: italic;
                      fill: var(--color--fuchsia--50);
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
                    `}"
                  />
                  <text
                    style="${css`
                      font-size: var(--font-size--2xl);
                      line-height: var(--line-height--2xl);
                      font-weight: var(--font-weight--black);
                      font-style: italic;
                      fill: var(--color--pink--50);
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
            new ArtAnimation({
              element: document.currentScript.previousElementSibling,
              speed: 0.001,
              amount: 3,
              startupDuration: 0,
            }).start();
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
            style="${css`
              font-weight: var(--font-weight--bold);
              color: var(--color--primary--50);
              background-color: var(--color--primary--700);
              padding: var(--space--2) var(--space--4);
              border-radius: var(--border-radius--md);
              display: inline-flex;
              gap: var(--space--2);
              justify-content: center;
              transition: background-color var(--transition-duration);

              &:hover {
                background-color: var(--color--primary--600);
              }

              &:active {
                background-color: var(--color--primary--800);
              }
            `}"
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
              href="https://github.com/courselore"
              style="${css`
                font-weight: var(--font-weight--bold);
                color: var(--color--primary-gray--700);
                background-color: var(--color--primary-gray--50);
                --color--focus: var(--color--primary-gray--300);
                padding: var(--space--2) var(--space--4);
                border-radius: var(--border-radius--md);
                display: inline-flex;
                gap: var(--space--2);
                justify-content: center;
                transition: background-color var(--transition-duration);

                &:hover {
                  background-color: var(--color--primary-gray--200);
                }

                &:active {
                  background-color: var(--color--primary-gray--300);
                }
              `}"
            >
              <i class="bi bi-github"></i>
              Source Code
            </a>

            <a
              href="mailto:contact@courselore.org"
              style="${css`
                font-weight: var(--font-weight--bold);
                color: var(--color--primary-gray--700);
                background-color: var(--color--primary-gray--50);
                --color--focus: var(--color--primary-gray--300);
                padding: var(--space--2) var(--space--4);
                border-radius: var(--border-radius--md);
                display: inline-flex;
                gap: var(--space--2);
                justify-content: center;
                transition: background-color var(--transition-duration);

                &:hover {
                  background-color: var(--color--primary-gray--200);
                }

                &:active {
                  background-color: var(--color--primary-gray--300);
                }
              `}"
            >
              <i class="bi bi-envelope"></i>
              Contact
            </a>
          </div>
        </nav>
      </header>

      <main>
        <div
          style="${css`
            background-color: var(--color--primary--800);
            margin-top: -10vw;
            clip-path: polygon(0 10vw, 100% 0, 100% calc(100% - 10vw), 0 100%);
            position: relative;
            display: grid;

            & > * {
              grid-area: 1 / 1;
            }
          `}"
        >
          $${app.locals.partials.art.small
            .replace(
              "<svg",
              `$&
                style="${css`
                  min-width: 100%;
                  min-height: 100%;
                  position: absolute;
                  z-index: -1;
                  opacity: 10%;
                `}"
              `
            )
            .replace(/width=".*?"/, "")
            .replace(/height=".*?"/, "")
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
            style="${css`
              padding: calc(10vw + var(--space--8)) var(--space--4);
              display: flex;
              justify-items: center;
              align-items: center;
              flex-direction: column;
              gap: var(--space--8);
            `}"
          >
            <h2
              style="${css`
                font-family: var(--font-family--serif);
                font-size: var(--font-size--4xl);
                line-height: var(--line-height--4xl);
                font-weight: var(--font-weight--black);
                font-style: italic;
                text-align: center;
                color: var(--color--primary--100);
              `}"
            >
              A forum for educators & students
            </h2>

            <div
              style="${css`
                display: flex;
                gap: var(--space--4);

                @media (max-width: 1023px) {
                  flex-direction: column;
                }

                @media (min-width: 1024px) {
                  max-width: 110ch;
                  & > * {
                    flex: 1;
                  }
                }

                & > div {
                  padding: var(--space--4);
                  border-radius: var(--border-radius--xl);
                  color: var(--color--primary--700);
                  background-color: var(--color--primary--100);
                  --color--focus: var(--color--primary--400);
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);

                  & > h3 {
                    font-size: var(--font-size--lg);
                    line-height: var(--line-height--lg);
                    font-weight: var(--font-weight--bold);
                    color: var(--color--primary--900);
                    display: flex;
                    align-items: center;
                    gap: var(--space--2);

                    & > i {
                      background-color: var(--color--primary--200);
                      width: var(--font-size--4xl);
                      height: var(--font-size--4xl);
                      border-radius: 50%;
                      display: inline-flex;
                      justify-content: center;
                      align-items: center;
                    }
                  }
                }
              `}"
            >
              <div>
                <h3><i class="bi bi-toggles"></i> Fully-Featured</h3>
                <p>
                  All the features you’ve come to expect from a forum, including
                  Q&A, announcements, notifications, invitations,
                  <button
                    type="button"
                    onclick="${javascript`
                      document.querySelector("#modal--markdown").showModal();
                    `}"
                  >
                    <abbr data-tippy-content="What’s Markdown?"
                      >Markdown</abbr
                    ></button
                  >, <abbr data-tippy-content="What’s LaTeX?">LaTeX</abbr>,
                  <abbr data-tippy-content="What’s Syntax Highlighting?"
                    >syntax highlighting</abbr
                  >, and much more, all in an easy-to-use and modern interface.
                </p>
              </div>

              <div>
                <h3><i class="bi bi-code-square"></i> Open-Source</h3>
                <p>
                  We’re developing CourseLore in the open. You may inspect the
                  source code to increase your trust on the software that you
                  use, you may build other tools on top of the CourseLore API,
                  and you may collaborate on the development of CourseLore
                  itself.
                </p>
              </div>

              <div>
                <h3><i class="bi bi-shield-lock"></i> Self-Hosted</h3>
                <p>
                  CourseLore is easy to run on your own server. This means you
                  know exactly where your data is and who owns it: you. Utmost
                  respect for educators & students’ privacy is at the core of
                  what we do.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div
          style="${css`
            background-color: $pink;
            clip-path: polygon(0 10vw, 100% 0, 100% 100%, 0 100%);
            position: relative;
            padding: calc(10vw + 2rem) 1rem 5rem;
            margin-top: -5vw;
            overflow: hidden;
          `}"
        >
          $${app.locals.partials.art.small
            .replace(
              "<svg",
              `$&
              style="${css`
                opacity: 40%;
                z-index: -1;
                position: absolute;
                top: 0;
                left: 0;
                min-width: 100%;
                min-height: 100%;
              `}"
            `
            )
            .replace(/width=".*?"/, "")
            .replace(/height=".*?"/, "")
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
            style="${css`
              max-width: 110ch;
              margin: 0 auto;
            `}"
          >
            <h1
              style="${css`
                font-family: $font-family-serif;
                @include font-size(3rem);
                font-weight: bold;
                font-style: italic;
                text-align: center;
                text-shadow: 2px 2px $pink-600;
              `}"
            >
              Team
            </h1>

            <div
              style="${css`
                display: grid;
                gap: 1rem;
                @include media-breakpoint-up(md) {
                  grid-auto-flow: column;
                }
              `}"
            >
              <div
                class="card shadow-lg"
                style="${css`
                  background-color: $pink-600;
                `}"
              >
                <div
                  class="card-header"
                  style="${css`
                    text-align: center;
                    padding-top: 1rem;
                  `}"
                >
                  <a
                    href="https://www.cs.jhu.edu/~scott/"
                    class="stretched-link"
                    ><img
                      src="${app.locals.settings.url}/scott.png"
                      alt="Dr. Scott Smith"
                      width="200"
                      class="card-title img-thumbnail rounded-circle"
                  /></a>
                  <h5
                    class="card-title"
                    style="${css`
                      margin-bottom: 0;
                    `}"
                  >
                    Dr. Scott Smith
                  </h5>
                  <p class="card-subtitle">CEO</p>
                </div>
                <div class="card-body">
                  <p>
                    Scott is a full professor at the Johns Hopkins University.
                    Over his thirty years of experience as an educator, Scott
                    taught courses on the Principles of Programming Languages,
                    Object-Oriented Software Engineering, Functional
                    Programming, and so forth.
                  </p>
                </div>
              </div>

              <div
                class="card shadow-lg"
                style="${css`
                  background-color: $pink-600;
                `}"
              >
                <div
                  class="card-header"
                  style="${css`
                    text-align: center;
                    padding-top: 1rem;
                  `}"
                >
                  <a
                    href="https://www.cs.jhu.edu/faculty/ali-madooei/"
                    class="stretched-link"
                    ><img
                      src="${app.locals.settings.url}/ali.png"
                      alt="Dr. Ali Madooei"
                      width="200"
                      class="card-title img-thumbnail rounded-circle"
                  /></a>
                  <h5
                    class="card-title"
                    style="${css`
                      margin-bottom: 0;
                    `}"
                  >
                    Dr. Ali Madooei
                  </h5>
                  <p class="card-subtitle">Consultant</p>
                </div>
                <div class="card-body">
                  <p>
                    Ali is a lecturer at the Johns Hopkins University. Ali has
                    taught courses in several areas, from Introduction to
                    Programming to Object-Oriented Software Engineering. Ali has
                    classroom experience with many student forums and knows what
                    it takes to make a great one.
                  </p>
                </div>
              </div>

              <div
                class="card shadow-lg"
                style="${css`
                  background-color: $pink-600;
                `}"
              >
                <div
                  class="card-header"
                  style="${css`
                    text-align: center;
                    padding-top: 1rem;
                  `}"
                >
                  <a href="https://leafac.com" class="stretched-link"
                    ><img
                      src="${app.locals.settings.url}/leandro.png"
                      alt="Leandro Facchinetti"
                      width="200"
                      class="card-title img-thumbnail rounded-circle"
                  /></a>
                  <h5
                    class="card-title"
                    style="${css`
                      margin-bottom: 0;
                    `}"
                  >
                    Leandro Facchinetti
                  </h5>
                  <p class="card-subtitle">Developer & Designer</p>
                </div>
                <div class="card-body">
                  <p>
                    Leandro was a PhD Candidate at the Johns Hopkins University.
                    He received the Whiting School of Engineering’s Professor
                    Joel Dean Excellence in Teaching Award for five years of
                    work as a teaching assistant, and taught a course on
                    Object-Oriented Software Engineering.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <dialog
        id="modal--markdown"
        style="${css`
          color: var(--color--primary-gray--700);
          background-color: var(--color--primary-gray--50);
          padding: var(--space--4);
          border-radius: var(--border-radius--lg);
          margin: auto;
        `}"
      >
        <button
          type="button"
          style="${css`
            float: right;
            transition: color var(--transition-duration);
            border-radius: 50%;
            width: var(--font-size--lg);
            height: var(--font-size--lg);

            &:hover {
              color: var(--color--primary--400);
            }

            &:active {
              color: var(--color--primary--600);
            }
          `}"
          onclick="${javascript`
            this.closest("dialog").close();
        `}"
        >
          <i class="bi bi-x-lg"></i>
        </button>
        <h5>What’s Markdown?</h5>
        $${(() => {
          const example = markdown`
            Things I’m **loving** about
            [CourseLore](https://courselore.org):

            - It’s easy to install.
            - It respects my privacy.
            - It looks great.
          `;
          return html`
            <p>
              Markdown is a simple way to include bold text, links, lists, and
              many other forms of rich-text formatting in your posts, for
              example:
            </p>

            <div class="card-group">
              <div class="card mb-3">
                <div class="card-header text-center fw-bold">You write…</div>
                <div class="card-body pb-0">
                  <pre><code>$${example}</code></pre>
                </div>
              </div>
              <div class="card mb-3">
                <div class="card-header text-center fw-bold">
                  …and your post looks like
                </div>
                <div class="card-body pb-0">
                  $${app.locals.partials.textProcessor(example)}
                </div>
              </div>
            </div>

            <p>
              Markdown is much more powerful than this simple example shows,
              it’s
              <a href="https://guides.github.com/features/mastering-markdown/"
                >easy to learn</a
              >, and it’s used by many popular forums including
              <a href="https://www.reddit.com">Reddit</a>,
              <a href="https://stackoverflow.com/">Stack Overflow</a>,
              <a href="https://github.com/">GitHub Issues</a>, and so forth.
            </p>
          `;
        })()}
      </dialog>

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
                  <p>
                    LaTeX is a simple way to include mathematical formulas in
                    your posts, for example:
                  </p>

                  <div class="card-group">
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        You write…
                      </div>
                      <div class="card-body pb-0">
                        <pre><code>$${example}</code></pre>
                      </div>
                    </div>
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        …and your post looks like
                      </div>
                      <div class="card-body pb-0">
                        $${app.locals.partials.textProcessor(example)}
                      </div>
                    </div>
                  </div>

                  <p>
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
                  <p>
                    Syntax highlighting is adding color to code snippets in your
                    posts to make them easier to read, for example:
                  </p>

                  <div class="card-group">
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        You write…
                      </div>
                      <div class="card-body pb-0">
                        <pre><code>$${example}</code></pre>
                      </div>
                    </div>
                    <div class="card mb-3">
                      <div class="card-header text-center fw-bold">
                        …and your post looks like
                      </div>
                      <div class="card-body pb-0">
                        $${app.locals.partials.textProcessor(example)}
                      </div>
                    </div>
                  </div>

                  <p>
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
