module.exports = (require) => {
  const path = require("path");
  const express = require("express");
  const cookieParser = require("cookie-parser");
  const { html } = require("@leafac/html");
  const css = require("tagged-template-noop");

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
    router.get("/", (req, res) => {
      res.send(
        app.locals.layouts.base(
          req,
          res,
          html`<title>CourseLore · The Open-Source Student Forum</title>`,
          html`
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
                            <text
                              font-family="IBM Plex Serif"
                              font-size="6.5rem"
                            >
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
                    <h1 class="font-serif fw-bold fst-italic">
                      A forum for educators & students
                    </h1>

                    <div class="row py-5 gap-5 gap-md-0">
                      <div class="col-md-4">
                        <div
                          class="card h-100"
                          style="${css`
                            background-color: #00000055;
                          `}"
                        >
                          <div class="card-header">
                            <h2>
                              <span
                                class="badge bg-white"
                                style="${css`
                                  color: $purple;
                                `}"
                              >
                                <i class="bi bi-toggles"></i>
                              </span>
                              <br />
                              Modern
                            </h2>
                          </div>
                          <div class="card-body">
                            <p class="text-start">
                              All the features you’ve come to expect from a
                              forum: Q&A, announcements, notifications,
                              invitations, Markdown, LaTeX, syntax highlighting,
                              and much more, all in an easy-to-use and
                              modern-looking interface.
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
                              All the features you’ve come to expect from a
                              forum: Q&A, announcements, notifications,
                              invitations, Markdown, LaTeX, syntax highlighting,
                              and much more, all in an easy-to-use and
                              modern-looking interface.
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
                              All the features you’ve come to expect from a
                              forum: Q&A, announcements, notifications,
                              invitations, Markdown, LaTeX, syntax highlighting,
                              and much more, all in an easy-to-use and
                              modern-looking interface.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </main>
            </div>
          `
        )
      );
    });

    return router;
  };
};
