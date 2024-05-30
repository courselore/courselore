import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";

css`
  @import "@radically-straightforward/css/static/index.css";
  @import "@radically-straightforward/javascript/static/index.css";
  @import "@fontsource-variable/public-sans";
  @import "@fontsource-variable/public-sans/wght-italic.css";
  @import "@fontsource-variable/jetbrains-mono";
  @import "@fontsource-variable/jetbrains-mono/wght-italic.css";
  @import "bootstrap-icons/font/bootstrap-icons.css";
  @import "katex/dist/katex.css";

  .button {
    border-radius: var(--border-radius--1);
    padding: var(--space--1) var(--space--2);
    margin: var(--space---1) var(--space---2);
    display: flex;
    align-items: center;
    gap: var(--space--1);
    cursor: pointer;
    transition-property: var(--transition-property--colors);
    transition-duration: var(--transition-duration--150);
    transition-timing-function: var(--transition-timing-function--ease-in-out);
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
        var(--color--slate--700)
      );
    }
  }
`;

javascript`
  import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
  import * as tippy from "tippy.js";
  import Mousetrap from "mousetrap";
  import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";
  import autosize from "autosize";
  import textareaCaret from "textarea-caret";
  import textFieldEdit from "text-field-edit";
  import { unified } from "unified";
  import rehypeParse from "rehype-parse";
  import rehypeRemark from "rehype-remark";
  import remarkGfm from "remark-gfm";
  import remarkStringify from "remark-stringify";
`;
