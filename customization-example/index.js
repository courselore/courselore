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
                              style="${css`
                                fill: $purple;
                                width: 570px;
                                height: 100px;
                                x: -285px;
                                y: -85px;
                                rx: 10px;
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
                              style="${css`
                                fill: $pink;
                                width: 490px;
                                height: 50px;
                                x: -245px;
                                y: -35px;
                                rx: 10px;
                              `}"
                            />
                            <text
                              style="${css`
                                font-size: 2rem;
                              `}"
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
                              style="${css`
                                fill: $blue;
                                width: 370px;
                                height: 35px;
                                x: -185px;
                                y: -26px;
                                rx: 10px;
                              `}"
                            />
                            <text
                              class="text-uppercase"
                              style="${css`
                                font-size: 1.5rem;
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
                    (() => {
                      const SPEED = 0.0001;
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
