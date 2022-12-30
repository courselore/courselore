import url from "node:url";
import fs from "node:fs/promises";
import { execa } from "execa";

await execa("tsc", undefined, {
  cwd: url.fileURLToPath(new URL("./server/", import.meta.url)),
  preferLocal: true,
  stdio: "inherit",
});

/*
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import css, { processCSS } from "@leafac/css";
import javascript from "@leafac/javascript";
import esbuild from "esbuild";

await fs.writeFile(
  "global.css",
  processCSS(css`
    .label {
      display: flex;
      flex-direction: column;
      gap: var(--space--1);

      .label--text {
        font-size: var(--font-size--xs);
        line-height: var(--line-height--xs);
        font-weight: var(--font-weight--bold);
        display: flex;
        gap: var(--space--2);
      }
    }

    .input--text {
      background-color: var(--color--gray--medium--200);
      --color--box-shadow: var(--color--blue--400);
      &::placeholder {
        color: var(--color--gray--medium--400);
      }
      &:disabled,
      &.disabled {
        color: var(--color--gray--medium--500);
        -webkit-text-fill-color: var(--color--gray--medium--500);
        background-color: var(--color--gray--medium--300);
      }
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--700);
        --color--box-shadow: var(--color--blue--600);
        &::placeholder {
          color: var(--color--gray--medium--500);
        }
        &:disabled,
        &.disabled {
          color: var(--color--gray--medium--400);
          -webkit-text-fill-color: var(--color--gray--medium--400);
          background-color: var(--color--gray--medium--600);
        }
      }
      width: 100%;
      display: block;
      padding: var(--space--2) var(--space--4);
      border-radius: var(--border-radius--md);
      &:focus-within {
        box-shadow: var(--border-width--0) var(--border-width--0)
          var(--border-width--0) var(--border-width--2) var(--color--box-shadow);
      }
      transition-property: var(--transition-property--box-shadow);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
      &.input--text--textarea {
        border-radius: var(--border-radius--lg);
      }
    }

    .input--radio {
      background-color: var(--color--gray--medium--200);
      &:hover,
      &:focus-within {
        background-color: var(--color--gray--medium--300);
      }
      &:active {
        background-color: var(--color--gray--medium--400);
      }
      &:disabled,
      &.disabled {
        background-color: var(--color--gray--medium--300);
      }
      &:checked {
        background-color: var(--color--blue--600);
        &:hover,
        &:focus-within {
          background-color: var(--color--blue--500);
        }
        &:active {
          background-color: var(--color--blue--700);
        }
        &:disabled,
        &.disabled {
          background-color: var(--color--blue--300);
        }
      }
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--700);
        &:hover,
        &:focus-within {
          background-color: var(--color--gray--medium--600);
        }
        &:active {
          background-color: var(--color--gray--medium--500);
        }
        &:disabled,
        &.disabled {
          background-color: var(--color--gray--medium--600);
        }
        &:checked {
          background-color: var(--color--blue--700);
          &:hover,
          &:focus-within {
            background-color: var(--color--blue--600);
          }
          &:active {
            background-color: var(--color--blue--800);
          }
          &:disabled,
          &.disabled {
            background-color: var(--color--blue--500);
          }
        }
      }
      min-width: var(--space--3-5);
      width: var(--space--3-5);
      min-height: var(--space--3-5);
      height: var(--space--3-5);
      border-radius: var(--border-radius--circle);
      position: relative;
      top: var(--space---0-5);
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);

      &::before {
        content: "";
        background-color: var(--color--gray--medium--50);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--200);
        }
        display: block;
        width: var(--space--1-5);
        height: var(--space--1-5);
        border-radius: var(--border-radius--circle);
        transition-property: var(--transition-property--transform);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
      }
      &:not(:checked)::before {
        transform: scale(var(--scale--0));
      }
    }

    .input--checkbox {
      background-color: var(--color--gray--medium--200);
      &:hover,
      &:focus-within {
        background-color: var(--color--gray--medium--300);
      }
      &:active {
        background-color: var(--color--gray--medium--400);
      }
      &:disabled,
      &.disabled {
        background-color: var(--color--gray--medium--300);
      }
      &:checked {
        background-color: var(--color--blue--600);
        &:hover,
        &:focus-within {
          background-color: var(--color--blue--500);
        }
        &:active {
          background-color: var(--color--blue--700);
        }
        &:disabled,
        &.disabled {
          background-color: var(--color--blue--300);
        }
      }
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--700);
        &:hover,
        &:focus-within {
          background-color: var(--color--gray--medium--600);
        }
        &:active {
          background-color: var(--color--gray--medium--500);
        }
        &:disabled,
        &.disabled {
          background-color: var(--color--gray--medium--600);
        }
        &:checked {
          background-color: var(--color--blue--700);
          &:hover,
          &:focus-within {
            background-color: var(--color--blue--600);
          }
          &:active {
            background-color: var(--color--blue--800);
          }
          &:disabled,
          &.disabled {
            background-color: var(--color--blue--500);
          }
        }
      }
      min-width: var(--space--8);
      width: var(--space--8);
      padding: var(--space--0-5);
      border-radius: var(--border-radius--full);
      position: relative;
      top: calc(var(--space--0-5) * 1.5);
      cursor: pointer;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);

      &::after {
        content: "";
        background-color: var(--color--gray--medium--50);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--200);
        }
        width: var(--space--3);
        height: var(--space--3);
        border-radius: var(--border-radius--circle);
        display: block;
        transition-property: var(--transition-property--all);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
      }
      &:checked::after {
        margin-left: var(--space--4);
      }
    }

    .input--radio-or-checkbox--multilabel {
      & ~ * {
        display: flex;
        gap: var(--space--2);
      }
      &:not(:checked) + * + *,
      &:checked + * {
        display: none;
      }
    }

    .input--visible-when-enabled-and-checked {
      &[disabled] + *,
      &:not(:checked) + * {
        display: none;
      }
    }

    .button {
      padding: var(--space--1) var(--space--4);
      border-radius: var(--border-radius--md);
      display: flex;
      gap: var(--space--2);
      justify-content: center;
      align-items: baseline;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
      cursor: pointer;

      &:disabled,
      &.disabled {
        color: var(--color--gray--medium--500);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--400);
        }
      }

      &.button--tight {
        padding: var(--space--0-5) var(--space--1);

        &.button--tight--inline {
          margin: var(--space---0-5) var(--space---1);
        }
      }

      &.button--tight-gap {
        gap: var(--space--1);
      }

      &.button--full-width-on-small-screen {
        @media (max-width: 400px) {
          width: 100%;
        }
      }

      &.button--justify-start {
        justify-content: flex-start;
      }

      &.button--inline {
        display: inline-flex;
      }

      &.button--transparent {
        &:not(:disabled):not(.disabled) {
          &:hover,
          &:focus-within,
          &.hover {
            background-color: var(--color--gray--medium--200);
          }
          &:active {
            background-color: var(--color--gray--medium--300);
          }
          @media (prefers-color-scheme: dark) {
            &:hover,
            &:focus-within,
            &.hover {
              background-color: var(--color--gray--medium--700);
            }
            &:active {
              background-color: var(--color--gray--medium--600);
            }
          }
        }
      }

      ${["blue", "green", "rose", "amber"].map(
        (color) => css`
          &.button--${color} {
            color: var(--color--${color}--50);
            @media (prefers-color-scheme: dark) {
              color: var(--color--${color}--100);
            }
            &:not(:disabled):not(.disabled) {
              background-color: var(--color--${color}--600);
              &:hover,
              &:focus-within,
              &.hover {
                background-color: var(--color--${color}--500);
              }
              &:active {
                background-color: var(--color--${color}--700);
              }
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--${color}--800);
                &:hover,
                &:focus-within,
                &.hover {
                  background-color: var(--color--${color}--700);
                }
                &:active {
                  background-color: var(--color--${color}--900);
                }
              }
            }
            &:disabled,
            &.disabled {
              background-color: var(--color--${color}--300);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--${color}--500);
              }
            }
            .strong {
              color: var(--color--${color}--50);
              @media (prefers-color-scheme: dark) {
                color: var(--color--${color}--100);
              }
            }
            .secondary,
            [class^="text--"] {
              color: var(--color--${color}--100);
              @media (prefers-color-scheme: dark) {
                color: var(--color--${color}--200);
              }
            }
          }
        `
      )}
    }

    .link {
      text-decoration: underline;
      color: var(--color--blue--600);
      &:hover,
      &:focus-within {
        color: var(--color--blue--500);
      }
      &:active {
        color: var(--color--blue--700);
      }
      ${["rose"].map(
        (color) => css`
          &.text--${color} {
            &:hover,
            &:focus-within {
              color: var(--color--${color}--500);
            }
            &:active {
              color: var(--color--${color}--700);
            }
          }
        `
      )}
      @media (prefers-color-scheme: dark) {
        color: var(--color--blue--500);
        &:hover,
        &:focus-within {
          color: var(--color--blue--400);
        }
        &:active {
          color: var(--color--blue--600);
        }
        ${["rose"].map(
          (color) => css`
            &.text--${color} {
              &:hover,
              &:focus-within {
                color: var(--color--${color}--400);
              }
              &:active {
                color: var(--color--${color}--600);
              }
            }
          `
        )}
      }
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(--transition-timing-function--in-out);
      cursor: pointer;

      .bi {
        text-decoration: none;
      }
    }

    :disabled,
    .disabled {
      cursor: not-allowed;
    }

    .heading {
      font-size: var(--font-size--2xs);
      line-height: var(--line-height--2xs);
      font-weight: var(--font-weight--bold);
      text-transform: uppercase;
      letter-spacing: var(--letter-spacing--widest);
      color: var(--color--gray--medium--600);
      @media (prefers-color-scheme: dark) {
        color: var(--color--gray--medium--400);
      }
      display: flex;
      gap: var(--space--1);
    }

    .heading--display {
      font-size: var(--font-size--xl);
      line-height: var(--line-height--xl);
      font-weight: var(--font-weight--bold);
      text-align: center;
      color: var(--color--gray--medium--800);
      @media (prefers-color-scheme: dark) {
        color: var(--color--gray--medium--100);
      }
    }

    .strong {
      font-weight: var(--font-weight--bold);
      color: var(--color--gray--medium--800);
      @media (prefers-color-scheme: dark) {
        color: var(--color--gray--medium--100);
      }
    }

    .secondary {
      color: var(--color--gray--medium--500);
      @media (prefers-color-scheme: dark) {
        color: var(--color--gray--medium--400);
      }
    }

    ${[
      "blue",
      "green",
      "rose",
      "sky",
      "amber",
      "teal",
      "lime",
      "emerald",
      "fuchsia",
      "cyan",
      "purple",
      "orange",
    ].map(
      (color) => css`
        .text--${color} {
          color: var(--color--${color}--600);
          @media (prefers-color-scheme: dark) {
            color: var(--color--${color}--500);
          }
        }
      `
    )}

    .mark {
      color: var(--color--amber--700);
      background-color: var(--color--amber--200);
      @media (prefers-color-scheme: dark) {
        color: var(--color--amber--200);
        background-color: var(--color--amber--700);
      }
      padding: var(--space--0) var(--space--0-5);
      border-radius: var(--border-radius--base);
    }

    .code,
    .pre > code {
      font-family: "JetBrains MonoVariable", var(--font-family--monospace);
      font-variant-ligatures: none;
    }

    .pre > code {
      font-size: var(--font-size--xs);
      line-height: var(--line-height--xs);
    }

    .img {
      background-color: var(--color--gray--medium--50);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--50);
        filter: brightness(var(--brightness--90));
      }
      max-width: 100%;
      height: auto;
      border-radius: var(--border-radius--xl);
    }

    .details {
      background-color: var(--color--gray--medium--200);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--700);
      }
      border-radius: var(--border-radius--xl);
      summary {
        &:hover,
        &:focus-within {
          background-color: var(--color--gray--medium--300);
        }
        @media (prefers-color-scheme: dark) {
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--600);
          }
        }
        padding: var(--space--2) var(--space--4);
        border-radius: var(--border-radius--xl);
        transition-property: var(--transition-property--colors);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
        cursor: pointer;
        &::before {
          content: "\\f275";
          font-family: "bootstrap-icons" !important;
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          margin-right: var(--space--2);
        }
      }
      &[open] > summary::before {
        content: "\\f273";
      }
      & > div:last-child {
        padding: var(--space--4);
      }
    }

    .decorative-icon {
      font-size: var(--font-size--9xl);
      line-height: var(--line-height--9xl);
      color: var(--color--gray--medium--300);
      background-color: var(--color--gray--medium--100);
      @media (prefers-color-scheme: dark) {
        color: var(--color--gray--medium--600);
        background-color: var(--color--gray--medium--800);
      }
      width: var(--space--48);
      height: var(--space--48);
      border-radius: var(--border-radius--circle);
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .separator {
      border-top: var(--border-width--1) solid var(--color--gray--medium--200);
      @media (prefers-color-scheme: dark) {
        border-color: var(--color--gray--medium--700);
      }
    }

    .menu-box {
      background-color: var(--color--gray--medium--100);
      @media (prefers-color-scheme: dark) {
        background-color: var(--color--gray--medium--800);
      }
      width: 100%;
      max-width: var(--space--64);
      padding: var(--space--2);
      border-radius: var(--border-radius--lg);
      display: flex;
      flex-direction: column;
      gap: var(--space--2);

      .menu-box--item {
        justify-content: flex-start;
      }
    }

    .tippy-box {
      font-size: var(--font-size--sm);
      line-height: var(--line-height--sm);
      --background-color: var(--color--gray--medium--100);
      --border-color: var(--color--gray--medium--400);
      @media (prefers-color-scheme: dark) {
        --background-color: var(--color--gray--medium--800);
        --border-color: var(--color--gray--medium--400);
      }
      color: inherit;
      background-color: var(--background-color);
      border: var(--border-width--1) solid var(--border-color);
      border-radius: var(--border-radius--md);
      & > .tippy-svg-arrow > svg {
        &:first-child {
          fill: var(--border-color);
        }
        &:last-child {
          fill: var(--background-color);
        }
      }

      .tippy-content {
        padding: var(--space--1) var(--space--2);
      }

      .heading {
        padding: var(--space--1) var(--space--2);
      }

      .keyboard-shortcut {
        font-size: var(--font-size--xs);
        line-height: var(--line-height--xs);
        color: var(--color--gray--medium--500);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--400);
        }

        .keyboard-shortcut--cluster {
          letter-spacing: var(--letter-spacing--widest);
        }
      }

      .dropdown--menu {
        display: flex;
        flex-direction: column;

        .dropdown--menu--item {
          text-align: left;
          width: 100%;
          padding-left: var(--space--2);
          padding-right: var(--space--2);
          justify-content: flex-start;
        }
      }

      .dropdown--separator {
        border-top: var(--border-width--1) solid var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
        margin: var(--space--0) var(--space--2);
      }

      ${Object.entries({
        green: "green",
        amber: "amber",
        rose: "rose",
        error: "rose",
      }).map(
        ([theme, color]) => css`
          &[data-theme~="${theme}"] {
            color: var(--color--${color}--700);
            --background-color: var(--color--${color}--100);
            --border-color: var(--color--${color}--200);
            .button.button--transparent {
              &:hover,
              &:focus-within {
                background-color: var(--color--${color}--200);
              }
              &:active {
                background-color: var(--color--${color}--300);
              }
            }
            .link {
              color: var(--color--${color}--600);
              &:hover,
              &:focus-within {
                color: var(--color--${color}--500);
              }
              &:active {
                color: var(--color--${color}--700);
              }
            }
            .keyboard-shortcut {
              color: var(--color--${color}--500);
            }
            @media (prefers-color-scheme: dark) {
              color: var(--color--${color}--200);
              --background-color: var(--color--${color}--900);
              --border-color: var(--color--${color}--800);
              .button.button--transparent {
                &:hover,
                &:focus-within {
                  background-color: var(--color--${color}--800);
                }
                &:active {
                  background-color: var(--color--${color}--700);
                }
              }
              .link {
                color: var(--color--${color}--100);
                &:hover,
                &:focus-within {
                  color: var(--color--${color}--50);
                }
                &:active {
                  color: var(--color--${color}--200);
                }
              }
              .keyboard-shortcut {
                color: var(--color--${color}--400);
              }
            }
          }
        `
      )}
    }

    .dark {
      display: none !important;
    }
    @media (prefers-color-scheme: dark) {
      .light {
        display: none !important;
      }
      .dark {
        display: block !important;
      }
    }

    .content {
      &,
      div,
      figure,
      blockquote {
        display: flex;
        flex-direction: column;
        gap: var(--space--4);
      }

      h1,
      h2,
      h3,
      h4,
      h5,
      h6 {
        margin-top: var(--space--4);
      }

      h1 {
        color: var(--color--gray--medium--800);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--100);
        }
      }

      h1,
      h2,
      h3 {
        font-size: var(--font-size--base);
        line-height: var(--line-height--base);
      }

      h1,
      h4,
      h5,
      h6 {
        font-weight: var(--font-weight--bold);
      }

      h2 {
        font-style: italic;
      }

      b,
      strong {
        font-weight: var(--font-weight--bold);
        color: var(--color--gray--medium--800);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--100);
        }
      }

      i:not(.bi),
      em {
        font-style: italic;
        color: var(--color--gray--medium--800);
        @media (prefers-color-scheme: dark) {
          color: var(--color--gray--medium--100);
        }
      }

      u {
        text-decoration: underline;
        text-decoration-color: var(--color--gray--medium--300);
        @media (prefers-color-scheme: dark) {
          text-decoration-color: var(--color--gray--medium--500);
        }
      }

      a {
        text-decoration: underline;
        color: var(--color--blue--600);
        &:hover,
        &:focus-within {
          color: var(--color--blue--500);
        }
        &:active {
          color: var(--color--blue--700);
        }
        @media (prefers-color-scheme: dark) {
          color: var(--color--blue--500);
          &:hover,
          &:focus-within {
            color: var(--color--blue--400);
          }
          &:active {
            color: var(--color--blue--600);
          }
        }
        transition-property: var(--transition-property--colors);
        transition-duration: var(--transition-duration--150);
        transition-timing-function: var(--transition-timing-function--in-out);
        cursor: pointer;
      }

      pre {
        background-color: #ffffff;
        @media (prefers-color-scheme: dark) {
          background-color: #1e1e1e;
        }
        padding: var(--space--4);
        border-radius: var(--border-radius--xl);
        overflow-x: auto;
        & > code {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          background-color: transparent;
          padding: var(--space--0);
          overflow-wrap: normal;
        }
      }

      code,
      tt,
      kbd,
      samp {
        font-family: "JetBrains MonoVariable", var(--font-family--monospace);
        font-variant-ligatures: none;
        background-color: var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--700);
        }
        padding: var(--space--0) var(--space--0-5);
        border-radius: var(--border-radius--base);
      }

      del {
        text-decoration: line-through;
        color: var(--color--rose--600);
        @media (prefers-color-scheme: dark) {
          color: var(--color--rose--500);
        }
      }

      ins {
        color: var(--color--green--600);
        @media (prefers-color-scheme: dark) {
          color: var(--color--green--500);
        }
      }

      sup,
      sub {
        position: relative;
        font-size: var(--font-size--2xs);
        line-height: var(--space--0);
        vertical-align: baseline;
      }

      sup {
        top: var(--space---1);
      }

      sub {
        bottom: var(--space---1);
      }

      img,
      video {
        background-color: var(--color--gray--medium--50);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--50);
          filter: brightness(var(--brightness--90));
        }
        max-width: 100%;
        height: auto;
        border-radius: var(--border-radius--xl);
      }

      video {
        display: block;
      }

      hr {
        border-top: var(--border-width--1) solid var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
      }

      ol {
        padding-left: var(--space--8);
        & > li {
          list-style: decimal;
          &::marker {
            color: var(--color--gray--medium--500);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--400);
            }
          }
        }
      }

      ul {
        padding-left: var(--space--8);
        & > li {
          list-style: disc;
          &::marker {
            color: var(--color--gray--medium--500);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--400);
            }
          }
        }
      }

      table {
        border-collapse: collapse;
        display: block;
        caption {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          font-weight: var(--font-weight--bold);
        }
        th,
        td {
          padding: var(--space--1) var(--space--3);
          border-top: var(--border-width--1) solid
            var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            border-color: var(--color--gray--medium--700);
          }
        }
        th {
          font-weight: var(--font-weight--bold);
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
          }
        }
      }

      blockquote {
        padding-left: var(--space--4);
        border-left: var(--border-width--4) solid
          var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          border-color: var(--color--gray--medium--700);
        }
      }

      dl {
        dt {
          font-weight: var(--font-weight--bold);
          color: var(--color--gray--medium--800);
          @media (prefers-color-scheme: dark) {
            color: var(--color--gray--medium--100);
          }
        }
        dd {
          padding-left: var(--space--4);
        }
      }

      var {
        font-style: italic;
      }

      s,
      strike {
        text-decoration: line-through;
      }

      details {
        background-color: var(--color--gray--medium--200);
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--700);
        }
        border-radius: var(--border-radius--xl);
        summary {
          &:hover,
          &:focus-within {
            background-color: var(--color--gray--medium--300);
          }
          @media (prefers-color-scheme: dark) {
            &:hover,
            &:focus-within {
              background-color: var(--color--gray--medium--600);
            }
          }
          padding: var(--space--2) var(--space--4);
          border-radius: var(--border-radius--xl);
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(--transition-timing-function--in-out);
          cursor: pointer;
          &::before {
            content: "\\f275";
            font-family: "bootstrap-icons" !important;
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            margin-right: var(--space--2);
          }
        }
        &[open] > summary::before {
          content: "\\f273";
        }
        & > div:last-child {
          padding: var(--space--4);
        }
      }

      figure {
        figcaption {
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          font-weight: var(--font-weight--bold);
        }
      }

      abbr {
        text-decoration: underline dotted;
        cursor: help;
      }

      dfn {
        font-weight: var(--font-weight--bold);
      }

      mark {
        color: var(--color--amber--700);
        background-color: var(--color--amber--200);
        @media (prefers-color-scheme: dark) {
          color: var(--color--amber--200);
          background-color: var(--color--amber--700);
        }
        border-radius: var(--border-radius--base);
      }

      small {
        font-size: var(--font-size--xs);
        line-height: var(--line-height--xs);
      }

      input[type="checkbox"] {
        font-size: var(--font-size--2xs);
        line-height: var(--line-height--2xs);
        color: var(--color--transparent);
        background-color: var(--color--gray--medium--200);
        &:checked {
          color: var(--color--blue--50);
          background-color: var(--color--blue--600);
        }
        @media (prefers-color-scheme: dark) {
          background-color: var(--color--gray--medium--700);
          &:checked {
            color: var(--color--blue--200);
            background-color: var(--color--blue--700);
          }
        }
        width: var(--space--3-5);
        height: var(--space--3-5);
        border-radius: var(--border-radius--base);
        margin-right: var(--space--1);
        display: inline-flex;
        justify-content: center;
        align-items: center;
        &::before {
          content: "\\f633";
          font-family: "bootstrap-icons" !important;
        }
      }

      .katex {
        overflow: auto;
      }
    }
  `)
);

await fs.writeFile(
  "index.mjs",
  javascript`
    import "@fontsource/public-sans/variable.css";
    import "@fontsource/public-sans/variable-italic.css";

    import "@fontsource/jetbrains-mono/variable.css";
    import "@fontsource/jetbrains-mono/variable-italic.css";

    import "bootstrap-icons/font/bootstrap-icons.css";
    import "katex/dist/katex.css";
    import "tippy.js/dist/tippy.css";
    import "tippy.js/dist/svg-arrow.css";
    import "tippy.js/dist/border.css";
    import "@leafac/css/build/browser.css";
    import "./global.css";

    import autosize from "autosize";
    window.autosize = autosize;

    import "mousetrap";

    import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";
    window.scrollIntoViewIfNeeded = scrollIntoViewIfNeeded;

    import tippy, * as tippyStatic from "tippy.js";
    window.tippy = tippy;
    window.tippy.hideAll = tippyStatic.hideAll;

    import textareaCaret from "textarea-caret";
    window.textareaCaret = textareaCaret;

    import * as textFieldEdit from "text-field-edit";
    window.textFieldEdit = textFieldEdit;

    import * as leafac from "./leafac--javascript.mjs";
    window.leafac = leafac;

    leafac.customFormValidation();
    leafac.warnAboutLosingInputs();
    leafac.tippySetDefaultProps();
    leafac.liveNavigation();
  `
);

const esbuildResult = await esbuild.build({
  entryPoints: ["index.mjs"],
  outdir: "../build/static/",
  entryNames: "[dir]/[name]--[hash]",
  assetNames: "[dir]/[name]--[hash]",

  loader: {
    ".woff2": "file",
    ".woff": "file",
    ".ttf": "file",
  },

  target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],

  bundle: true,
  minify: true,
  sourcemap: true,
  metafile: true,
});

await fs.rm("global.css");
await fs.rm("index.mjs");

const paths = {};

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "index.mjs" && typeof cssBundle === "string") {
    paths["index.css"] = cssBundle.slice("../build/static/".length);
    paths["index.mjs"] = javascriptBundle.slice("../build/static/".length);
    break;
  }

for (const source of [
  "about/ali-madooei.webp",
  "about/eliot-smith.webp",
  "about/leandro-facchinetti.webp",
  "about/main-screen--dark.webp",
  "about/main-screen--light-and-dark.webp",
  "about/main-screen--light.webp",
  "about/main-screen--phone--dark.webp",
  "about/main-screen--phone--light.webp",
  "about/scott-smith.webp",
]) {
  const extension = path.extname(source);
  const destination = path.join(
    "../build/static",
    `${source.slice(0, -extension.length)}--${crypto
      .createHash("sha1")
      .update(await fs.readFile(source))
      .digest("hex")}${extension}`
  );
  paths[source] = destination.slice("../build/static/".length);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}

await fs.writeFile(
  new URL("../build/static/paths.json", import.meta.url),
  JSON.stringify(paths, undefined, 2)
);

for (const source of [
  "apple-touch-icon.png",
  "favicon.ico",
  "node_modules/fake-avatars/avatars/",
]) {
  const destination = path.join("../build/static", source);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.cp(source, destination, { recursive: true });
}
*/
