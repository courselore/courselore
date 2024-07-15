import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationLayouts = {
  layouts: {
    main: ({
      request,
      response,
      head,
      body,
    }: {
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"] &
          Application["types"]["states"]["Course"]
      >;
      response: serverTypes.Response;
      head: HTML;
      body: HTML;
    }) => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  css`
    @import "@radically-straightforward/javascript/static/index.css";
    @import "@fontsource-variable/public-sans";
    @import "@fontsource-variable/public-sans/wght-italic.css";
    @import "@fontsource-variable/jetbrains-mono";
    @import "@fontsource-variable/jetbrains-mono/wght-italic.css";
    @import "bootstrap-icons/font/bootstrap-icons.css";
    @import "katex/dist/katex.css";

    .text--secondary {
      font-size: var(--font-size--3);
      line-height: var(--font-size--3--line-height);
      font-weight: 600;
      color: light-dark(var(--color--slate--600), var(--color--slate--400));
    }

    .input--text {
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      padding: var(--space--1) var(--space--2);
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      border-radius: var(--border-radius--1);
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &:focus-within {
        border-color: light-dark(
          var(--color--blue--500),
          var(--color--blue--500)
        );
      }
    }

    .input--checkbox,
    .input--radio {
      color: light-dark(var(--color--slate--50), var(--color--slate--950));
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      width: var(--space--3-5);
      height: var(--space--3-5);
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      display: inline-flex;
      justify-content: center;
      align-items: center;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &:checked {
        background-color: light-dark(
          var(--color--blue--500),
          var(--color--blue--500)
        );
        border-color: light-dark(
          var(--color--blue--600),
          var(--color--blue--600)
        );
      }
    }

    .input--checkbox {
      vertical-align: var(--space---0-5);
      border-radius: var(--border-radius--1);
      &::after {
        content: "\\f633";
        font-family: "bootstrap-icons";
      }
    }

    .input--radio {
      vertical-align: var(--space--px);
      border-radius: var(--border-radius--circle);
      font-size: var(--space--1-5);
      &::after {
        content: "\\f287";
        font-family: "bootstrap-icons";
      }
    }

    .button {
      border-radius: var(--border-radius--1);
      cursor: pointer;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &.button--rectangle {
        padding: var(--space--1) var(--space--2);
      }
      &.button--square {
        aspect-ratio: var(--aspect-ratio--square);
        padding: var(--space--1);
      }
      &.button--icon .bi {
        display: flex;
      }
      &.button--transparent {
        &.button--rectangle {
          margin: var(--space---1) var(--space---2);
        }
        &.button--square {
          margin: var(--space---1);
        }
        &:hover,
        &:focus-within {
          background-color: light-dark(
            var(--color--slate--100),
            var(--color--slate--800)
          );
        }
        &:active {
          background-color: light-dark(
            var(--color--slate--200),
            var(--color--slate--900)
          );
        }
      }
      ${[
        "red",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "sky",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose",
      ].map(
        (color) => css`
          &.button--${color} {
            font-weight: 600;
            color: light-dark(var(--color--white), var(--color--white));
            background-color: light-dark(
              var(--color--${color}--500),
              var(--color--${color}--500)
            );
            border: var(--border-width--1) solid
              light-dark(
                var(--color--${color}--600),
                var(--color--${color}--600)
              );
            &:hover,
            &:focus-within {
              background-color: light-dark(
                var(--color--${color}--400),
                var(--color--${color}--400)
              );
              border-color: light-dark(
                var(--color--${color}--500),
                var(--color--${color}--500)
              );
            }
            &:active {
              background-color: light-dark(
                var(--color--${color}--600),
                var(--color--${color}--600)
              );
              border-color: light-dark(
                var(--color--${color}--700),
                var(--color--${color}--700)
              );
            }
          }
        `,
      )}
    }

    .tippy-box {
      color: light-dark(var(--color--black), var(--color--white));
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      border-radius: var(--border-radius--1);
      box-shadow: var(--box-shadow--4);
      &[data-theme~="error"] {
        color: light-dark(var(--color--red--800), var(--color--red--200));
        background-color: light-dark(
          var(--color--red--50),
          var(--color--red--950)
        );
        border-color: light-dark(
          var(--color--red--400),
          var(--color--red--600)
        );
      }
      ${[
        "red",
        "orange",
        "amber",
        "yellow",
        "lime",
        "green",
        "emerald",
        "teal",
        "cyan",
        "sky",
        "blue",
        "indigo",
        "violet",
        "purple",
        "fuchsia",
        "pink",
        "rose",
      ].map(
        (color) => css`
          &[data-theme~="${color}"] {
            color: light-dark(
              var(--color--${color}--800),
              var(--color--${color}--200)
            );
            background-color: light-dark(
              var(--color--${color}--50),
              var(--color--${color}--950)
            );
            border-color: light-dark(
              var(--color--${color}--400),
              var(--color--${color}--600)
            );
          }
        `,
      )}
      .tippy-content {
        padding: var(--space--1) var(--space--2);
      }
    }
  `;

  javascript`
    import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
    import * as utilities from "@radically-straightforward/utilities";
    import * as tippy from "tippy.js";
    import Mousetrap from "mousetrap";
    import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";
    import textareaCaret from "textarea-caret";
    import textFieldEdit from "text-field-edit";
    import { unified } from "unified";
    import rehypeParse from "rehype-parse";
    import rehypeRemark from "rehype-remark";
    import remarkGfm from "remark-gfm";
    import remarkStringify from "remark-stringify";
  `;

  application.layouts = {
    main: ({ request, response, head, body }) => html`
      <!doctype html>
      <html
        css="${request.state.user === undefined ||
        request.state.user.darkMode === "system"
          ? css`
              color-scheme: light dark;
            `
          : request.state.user.darkMode === "light"
            ? css`
                color-scheme: light;
              `
            : request.state.user.darkMode === "dark"
              ? css`
                  color-scheme: dark;
                `
              : css``}"
        javascript="${javascript`
          javascript.liveConnection(${request.id}, { reload: ${application.configuration.environment === "development"} });
        `}"
      >
        <head>
          <meta
            name="description"
            content="Communication Platform for Education"
          />
          <meta name="version" content="${application.version}" />
          <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
          <script src="/${caddy.staticFiles["index.mjs"]}"></script>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
          $${head}
        </head>
        <body
          css="${css`
            font-family: "Public Sans Variable", var(--font-family--sans-serif);
            font-size: var(--font-size--3-5);
            line-height: var(--font-size--3-5--line-height);
            color: light-dark(var(--color--black), var(--color--white));
            background-color: light-dark(
              var(--color--white),
              var(--color--black)
            );
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
          `}"
        >
          $${request.state.courseParticipation !== undefined
            ? html`
                <div
                  key="courseParticipationColor ${request.state
                    .courseParticipation.color}"
                  style="
                    --background-color--light: var(--color--${request.state
                    .courseParticipation.color}--500);
                    --background-color--dark: var(--color--${request.state
                    .courseParticipation.color}--500);
                    --border-color--light: var(--color--${request.state
                    .courseParticipation.color}--600);
                    --border-color--dark: var(--color--${request.state
                    .courseParticipation.color}--600);
                  "
                  css="${css`
                    background-color: light-dark(
                      var(--background-color--light),
                      var(--background-color--dark)
                    );
                    height: var(--space--1);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--border-color--light),
                        var(--border-color--dark)
                      );
                  `}"
                ></div>
              `
            : html``}
          $${body}
        </body>
      </html>
    `,
  };
};
