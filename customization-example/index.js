module.exports = (require) => {
  const path = require("path");
  const express = require("express");
  const html = require("@leafac/html").default;
  const css = require("tagged-template-noop");
  const markdown = require("tagged-template-noop");

  const exports = middleware;
  exports.art = art;
  return exports;

  function middleware(app) {
    const router = express.Router();

    router.all(
      "*",
      ...app.get("middleware isAuthenticatedMiddleware"),
      (req, res, next) => {
        next("router");
      }
    );
    router.use(express.static(path.join(__dirname, "public")));
    router.get("/", (req, res, next) => {
      res.send(
        app.get("layout base")(
          req,
          res,
          html`<title>CourseLore · The Open-Source Student Forum</title>`,
          html`
            <div
              style="${css`
                @media (max-width: 1279px), (max-height: 699px) {
                  max-width: 600px;
                  padding: 0 1rem;
                  margin: 1rem auto;
                }

                @media (min-width: 1280px) and (min-height: 700px) {
                  display: grid;
                  grid-template-columns: 600px 600px;
                  column-gap: 40px;
                  justify-content: center;
                }
              `}"
            >
              <header>
                <div
                  style="${css`
                    @media (min-width: 1280px) and (min-height: 700px) {
                      position: fixed;
                      height: 100vh;
                      display: flex;
                      align-items: center;
                    }
                  `}"
                >
                  <div>
                    $${art({ size: 600, order: 6, strokeWidth: 1 }).replace(
                      "</svg>",
                      html`
                        <g
                          font-weight="900"
                          fill="white"
                          text-anchor="middle"
                          alignment-baseline="middle"
                          transform="translate(300, 250) rotate(-2)"
                        >
                          <g>
                            <rect
                              x="-250"
                              y="-78"
                              width="500"
                              height="100"
                              rx="10"
                              fill="#83769c"
                            />
                            <text font-size="5rem">CourseLore</text>
                          </g>
                          <g transform="translate(0, 100)">
                            <rect
                              x="-210"
                              y="-33"
                              width="420"
                              height="50"
                              rx="10"
                              fill="#ff77a8"
                            />
                            <text font-size="1.5rem"
                              >The Open-Source Student Forum</text
                            >
                          </g>
                          <g transform="translate(0, 300)">
                            <rect
                              x="-140"
                              y="-20"
                              width="280"
                              height="30"
                              rx="10"
                              fill="#29adff"
                            />
                            <text font-size="0.8rem" letter-spacing="3">
                              COMING SEPTEMBER 2021!
                            </text>
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
                    <nav
                      style="${css`
                        text-align: center;
                      `}"
                    >
                      <a
                        href="https://github.com/courselore"
                        class="undecorated"
                        ><strong>GitHub</strong></a
                      > ·
                      <a
                        href="https://www.youtube.com/channel/UCIUTEUo5RiGdtaJOJQGTwqw"
                        class="undecorated"
                        ><strong>YouTube</strong></a
                      > ·
                      <a
                        href="https://twitter.com/courselore"
                        class="undecorated"
                        ><strong>Twitter</strong></a
                      > ·
                      <a
                        href="mailto:contact@courselore.org"
                        class="undecorated"
                        ><strong>Email</strong></a
                      >
                    </nav>
                  </div>
                </div>
              </header>

              <main
                style="${css`
                  #user-content-people > div {
                    & > p:first-of-type {
                      text-align: center;
                      line-height: 1.3;

                      a {
                        text-decoration: none;
                      }
                    }

                    @media (max-width: 599px) {
                      &:not(:first-of-type) {
                        margin-top: 3rem;
                      }
                    }

                    @media (min-width: 600px) {
                      display: grid;
                      grid-template-columns: 200px 1fr;
                      column-gap: 40px;
                      align-items: center;
                    }
                  }
                `}"
              >
                $${app.get("text processor")(
                  // prettier-ignore
                  markdown`
# What Will CourseLore Be?

**A forum for educators & students.**

CourseLore will support Q&A, announcements, anonymous posting, [Markdown](https://commonmark.org) & [LaTeX](https://www.latex-project.org) rendering, and everything else you’ve come to expect from a modern web application.

# How Will CourseLore Be Different?

**[Open Source](https://github.com/courselore):** You may inspect the CourseLore’s code to guarantee that it meets your standards in terms of quality, privacy, and security. You may learn from the code base (we’re making it very beginner-friendly). You may contribute back to the project.

**Self-Hosted:** You’ll be able to run your own instance of CourseLore on your servers for maximum privacy. It’ll be easy!

**Respect for Privacy:** We’ll never share information about educators & students with third-parties.

**Modern Interface:** CourseLore will look familiar, because we’re basing it on our experience of what works and what doesn’t in other student forums. And it’s 2021, so CourseLore has to look welcoming and modern to educators & students.

**Programmable:** Advanced users will be able to use the CourseLore API to integrate CourseLore with other systems and write automation scripts. Also, you may mount CourseLore as part of a bigger application.

# Who’s behind CourseLore?

<div id="people">

<div>

[<img src="scott.png" alt="Dr. Scott Smith" width="200" />  
**Dr. Scott Smith**](https://www.cs.jhu.edu/~scott/)  
<small>
CEO  
<scott@courselore.org>
</small>

Scott is a full professor at the [Johns Hopkins University](https://www.jhu.edu). Over his almost thirty years of experience as an educator, Scott taught courses on the Principles of Programming Languages, Object-Oriented Software Engineering, Functional Programming, and so forth.

</div>

<div>

[<img src="ali.png" alt="Dr. Ali Madooei" width="200" />  
**Dr. Ali Madooei**](https://www.cs.jhu.edu/faculty/ali-madooei/)  
<small>
Consultant  
<ali@courselore.org>
</small>

Ali is a lecturer at the [Johns Hopkins University](https://www.jhu.edu). Ali has taught courses in several areas, from Introduction to Programming to Object-Oriented Software Engineering. Ali has classroom experience with many student forums and knows what it takes to make a great one.

</div>

<div>

[<img src="leandro.png" alt="Leandro Facchinetti" width="200" />  
**Leandro Facchinetti**](https://leafac.com)  
<small>
Developer & Designer  
<leandro@courselore.org>
</small>

Leandro was a PhD Candidate at the [Johns Hopkins University](https://www.jhu.edu), advised by Scott. He received the **Whiting School of Engineering’s Professor Joel Dean Excellence in Teaching Award** for five years of work as a teaching assistant, and taught a course on [Object-Oriented Software Engineering](https://oose-2019.leafac.com).

</div>

</div>

# I’m Interested! How Do I Participate?

**Try our [super-early development demos](${app.locals.url}/authenticate)!**

**Educators & Students:** We want to hear [your feedback](mailto:feedback@courselore.com).

**Developers & Designers:** Contribute on [GitHub](https://github.com/courselore).
`
                )}
              </main>
            </div>
          `
        )
      );
    });

    return router;
  }

  // https://www.youtube.com/watch?v=dSK-MW-zuAc
  function art({ size, order, strokeWidth }) {
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

    return html`
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="${size}"
        height="${size}"
        viewBox="0 0 ${size} ${size}"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#83769c" />
            <stop offset="100%" stop-color="#ff77a8" />
          </linearGradient>
        </defs>
        <polyline
          stroke="url(#gradient)"
          stroke-width="${strokeWidth}"
          stroke-linecap="round"
          stroke-linejoin="round"
          fill="none"
          points="${points.flatMap(([x, y]) => [x * size, y * size]).join(" ")}"
        />
      </svg>
    `;
  }
};
