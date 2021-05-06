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
              clip-path: polygon(0 10vw, 100% 0, 100% 100%, 0 100%);
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
              .replace(/viewBox=".*?"/, `viewBox="7 7 15 15"`)}
            <script>
              new ArtAnimation({
                element: document.currentScript.previousElementSibling,
                speed: 0.0001,
                amount: 10,
                startupDuration: 0,
              }).start();
            </script>

            <section
              class="container"
              style="${css`
                padding-top: calc(10vw + 1rem);
              `}"
            >
              <h1
                class="font-serif fw-bold fst-italic"
                style="${css`
                  text-shadow: 2px 2px $purple-600;
                `}"
              >
                A forum for educators & students
              </h1>

              <div class="row py-5">
                <div class="col-md-4 mb-3 mb-md-0">
                  <div
                    class="card h-100 shadow-lg"
                    style="${css`
                      background-color: $purple-600;
                    `}"
                  >
                    <div class="card-header">
                      <h2>
                        <i class="bi bi-toggles"></i>
                        Fully-Featured
                      </h2>
                    </div>
                    <div class="card-body">
                      <p class="text-start">
                        All the features you’ve come to expect from a forum:
                        Q&A, announcements, notifications, invitations, Markdown
                        <button
                          type="button"
                          class="btn btn-link text-reset p-0"
                          data-bs-toggle="popover"
                          data-bs-html="true"
                          data-bs-sanitize="false"
                          data-bs-title="${html`What’s Markdown?`}"
                          data-bs-content="${(() => {
                            const example = markdown`
                              Things I’m **loving** about
                              [CourseLore](https://courselore.org):

                              - It’s easy to install and maintain.
                              - It respects my privacy.
                              - It looks great.
                            `;
                            return html`
                              <p>
                                Markdown is a way to include rich-text
                                formatting in your posts.
                              </p>

                              <p>For example, your write:</p>

                              <div class="card p-3 mb-3">
                                <pre><code>$${example}</code></pre>
                              </div>

                              <p>And the post ends up looking like:</p>

                              <div class="card p-3 mb-3">
                                $${app.locals.partials.textProcessor(example)}
                              </div>

                              <p>
                                Markdown is powerful; it’s capable of much more
                                <a
                                  href="https://guides.github.com/features/mastering-markdown/"
                                  >easy to learn</a
                                >
                                and is used by many popular forums, including
                                <a href="https://www.reddit.com">Reddit</a>,
                                <a href="https://stackoverflow.com/"
                                  >Stack Overflow</a
                                >, and so forth.
                              </p>
                            `;
                          })()}"
                        >
                          <i class="bi bi-info-circle"></i></button
                        >, LaTeX, syntax highlighting, and much more, all in an
                        easy-to-use and modern-looking interface.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div
                    class="card h-100"
                    style="${css`
                      background-color: #00000066;
                    `}"
                  >
                    <div
                      class="card-header"
                      style="${css`
                        background-color: $blue;
                      `}"
                    >
                      <h2>
                        <i class="bi bi-code-square"></i><br />Open-Source
                      </h2>
                    </div>
                    <div class="card-body">
                      <p class="text-start">
                        All the features you’ve come to expect from a forum:
                        Q&A, announcements, notifications, invitations,
                        Markdown, LaTeX, syntax highlighting, and much more, all
                        in an easy-to-use and modern-looking interface.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="col-md-4">
                  <div
                    class="card h-100"
                    style="${css`
                      background-color: #00000066;
                    `}"
                  >
                    <div class="card-header">
                      <h2>
                        <span class="badge"
                          ><i class="bi bi-code-square"></i
                        ></span>
                        Open-Source
                      </h2>
                    </div>
                    <div class="card-body">
                      <p class="text-start">
                        All the features you’ve come to expect from a forum:
                        Q&A, announcements, notifications, invitations,
                        Markdown, LaTeX, syntax highlighting, and much more, all
                        in an easy-to-use and modern-looking interface.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
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
