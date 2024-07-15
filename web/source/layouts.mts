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
        Application["types"]["states"]["User"]
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
    main: ({ request, response, head, body }) => html``,
  };
};
