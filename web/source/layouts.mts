css`
  @import "@radically-straightforward/css/static/index.css";
  @import "@radically-straightforward/javascript/static/index.css";
  @import "@fontsource-variable/public-sans";
  @import "@fontsource-variable/public-sans/wght-italic.css";
  @import "@fontsource-variable/jetbrains-mono";
  @import "@fontsource-variable/jetbrains-mono/wght-italic.css";
  @import "bootstrap-icons/font/bootstrap-icons.css";
  @import "katex/dist/katex.css";
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
