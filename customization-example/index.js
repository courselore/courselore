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
              <header class="container mt-3">
                <p>
                  $${app.locals.partials.art.large
                    .replace("<svg", `$& class="img-fluid"`)
                    .replace(
                      "</svg>",
                      html`
                        <g
                          class="fw-bold fst-italic"
                          style="${css`
                            fill: $white;
                            text-anchor: middle;
                          `}"
                        >
                          <g
                            style="${css`
                              transform: translate(50%, 50%) rotate(-2deg);
                            `}"
                          >
                            <rect
                              width="570"
                              height="100"
                              x="-285"
                              y="-85"
                              rx="10"
                              style="${css`
                                fill: $purple;
                              `}"
                            />
                            <text
                              class="font-serif"
                              style="${css`
                                font-size: 6.5rem;
                              `}"
                              >CourseLore</text
                            >
                          </g>
                          <g
                            style="${css`
                              transform: translate(50%, calc(50% + 5rem))
                                rotate(-2deg);
                            `}"
                          >
                            <rect
                              width="480"
                              height="50"
                              x="-240"
                              y="-35"
                              rx="10"
                              style="${css`
                                fill: $pink;
                              `}"
                            />
                            <text class="fs-2"
                              >The Open-Source Student Forum</text
                            >
                          </g>
                          <g
                            style="${css`
                              transform: translate(50%, calc(50% + 15rem))
                                rotate(-2deg);
                            `}"
                          >
                            <rect
                              width="360"
                              height="35"
                              x="-180"
                              y="-26"
                              rx="10"
                              style="${css`
                                fill: $blue;
                              `}"
                            />
                            <text
                              class="text-uppercase fs-4"
                              style="${css`
                                letter-spacing: 2px;
                              `}"
                              >Coming September 2021!</text
                            >
                          </g>
                        </g>
                        $&
                      `
                    )}
                  <script>
                    (() => {
                      const SPEED = 0.001;
                      const AMOUNT = 3;
                      const polyline = document.currentScript.previousElementSibling.querySelector(
                        "polyline"
                      );
                      const points = polyline
                        .getAttribute("points")
                        .split(" ")
                        .map(Number);
                      window.requestAnimationFrame(function animate(time) {
                        polyline.setAttribute(
                          "points",
                          points
                            .map(
                              (coordinate, index) =>
                                coordinate +
                                Math.sin(time * SPEED + index) * AMOUNT
                            )
                            .join(" ")
                        );
                        window.requestAnimationFrame(animate);
                      });
                    })();
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

                    <span class="btn-group">
                      <a
                        href="https://github.com/courselore"
                        class="btn btn-outline-primary btn-lg"
                        data-bs-toggle="tooltip"
                        title="Source code on GitHub"
                        ><i class="bi bi-github"></i
                      ></a>

                      <a
                        href="mailto:contact@courselore.org"
                        class="btn btn-outline-primary btn-lg"
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
                  class="bg-primary"
                  style="${css`
                    padding-top: calc(10vw + 1rem);
                    clip-path: polygon(0 10vw, 100% 0, 100% 100%, 0 100%);
                  `}"
                >
                  <section class="container">
                    <h1 class="font-serif fw-bold fst-italic">
                      A forum for educators & students
                    </h1>
                    <div class="row g-5 py-5">
                      <div class="col-md-4">
                        <p class="fs-1">
                          <span class="bg-white text-primary p-2 rounded-3"
                            ><i class="bi bi-toggles"></i
                          ></span>
                        </p>
                        <h2>Modern</h2>
                        <p class="text-start">
                          All the features you’ve come to expect from a forum:
                          Q&A, announcements, notifications, invitations,
                          Markdown, LaTeX, syntax highlighting, and much more,
                          all in an easy-to-use and modern-looking interface.
                        </p>
                      </div>
                      <div class="col-md-4">
                        <i class="bi bi-code-square fs-1"></i>
                        <h2>Open-Source</h2>
                        <p>API</p>
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
