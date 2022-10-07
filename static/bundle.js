// node_modules/@fontsource/public-sans/100-italic.css
// node_modules/@fontsource/public-sans/100.css
// node_modules/@fontsource/public-sans/200-italic.css
// node_modules/@fontsource/public-sans/200.css
// node_modules/@fontsource/public-sans/300-italic.css
// node_modules/@fontsource/public-sans/300.css
// node_modules/@fontsource/public-sans/400-italic.css
// node_modules/@fontsource/public-sans/400.css
// node_modules/@fontsource/public-sans/500-italic.css
// node_modules/@fontsource/public-sans/500.css
// node_modules/@fontsource/public-sans/600-italic.css
// node_modules/@fontsource/public-sans/600.css
// node_modules/@fontsource/public-sans/700-italic.css
// node_modules/@fontsource/public-sans/700.css
// node_modules/@fontsource/public-sans/800-italic.css
// node_modules/@fontsource/public-sans/800.css
// node_modules/@fontsource/public-sans/900-italic.css
// node_modules/@fontsource/public-sans/900.css
// node_modules/@fontsource/jetbrains-mono/100-italic.css
// node_modules/@fontsource/jetbrains-mono/100.css
// node_modules/@fontsource/jetbrains-mono/200-italic.css
// node_modules/@fontsource/jetbrains-mono/200.css
// node_modules/@fontsource/jetbrains-mono/300-italic.css
// node_modules/@fontsource/jetbrains-mono/300.css
// node_modules/@fontsource/jetbrains-mono/400-italic.css
// node_modules/@fontsource/jetbrains-mono/400.css
// node_modules/@fontsource/jetbrains-mono/500-italic.css
// node_modules/@fontsource/jetbrains-mono/500.css
// node_modules/@fontsource/jetbrains-mono/600-italic.css
// node_modules/@fontsource/jetbrains-mono/600.css
// node_modules/@fontsource/jetbrains-mono/700-italic.css
// node_modules/@fontsource/jetbrains-mono/700.css
// node_modules/@fontsource/jetbrains-mono/800-italic.css
// node_modules/@fontsource/jetbrains-mono/800.css
// node_modules/bootstrap-icons/font/bootstrap-icons.css
// node_modules/katex/dist/katex.min.css
// node_modules/tippy.js/dist/svg-arrow.css
// node_modules/tippy.js/dist/border.css
// node_modules/@leafac/css/distribution/browser.css
// global.css

import "@fontsource/public-sans/100-italic.css";
import "@fontsource/public-sans/100.css";
import "@fontsource/public-sans/200-italic.css";
import "@fontsource/public-sans/200.css";
import "@fontsource/public-sans/300-italic.css";
import "@fontsource/public-sans/300.css";
import "@fontsource/public-sans/400-italic.css";
import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500-italic.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600-italic.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700-italic.css";
import "@fontsource/public-sans/700.css";
import "@fontsource/public-sans/800-italic.css";
import "@fontsource/public-sans/800.css";
import "@fontsource/public-sans/900-italic.css";
import "@fontsource/public-sans/900.css";

import "@fontsource/jetbrains-mono/100-italic.css";
import "@fontsource/jetbrains-mono/100.css";
import "@fontsource/jetbrains-mono/200-italic.css";
import "@fontsource/jetbrains-mono/200.css";
import "@fontsource/jetbrains-mono/300-italic.css";
import "@fontsource/jetbrains-mono/300.css";
import "@fontsource/jetbrains-mono/400-italic.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500-italic.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600-italic.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700-italic.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/jetbrains-mono/800-italic.css";
import "@fontsource/jetbrains-mono/800.css";

import "bootstrap-icons/font/bootstrap-icons.css";
import "katex/dist/katex.css";
import "tippy.js/dist/tippy.css";
import "tippy.js/dist/svg-arrow.css";
import "tippy.js/dist/border.css";
import "@leafac/css/distribution/browser.css";
import "./global.css";

// node_modules/autosize/dist/autosize.min.js
// node_modules/fast-myers-diff/index.umd.js
// node_modules/mousetrap/mousetrap.min.js
// node_modules/scroll-into-view-if-needed/umd/scroll-into-view-if-needed.min.js
// node_modules/@popperjs/core/dist/umd/popper.min.js
// node_modules/tippy.js/dist/tippy-bundle.umd.min.js
// node_modules/textarea-caret/index.js
// node_modules/text-field-edit/index.umd.js
// node_modules/@leafac/javascript/distribution/browser.js
// leafac--javascript.js

import autosize from "autosize";
window.autosize = autosize;

import "mousetrap";

import scrollIntoViewIfNeeded from "scroll-into-view-if-needed";
window.scrollIntoViewIfNeeded = scrollIntoViewIfNeeded;

import tippy from "tippy.js";
window.tippy = tippy;

import "textarea-caret";

import * as textFieldEdit from "text-field-edit";
window.textFieldEdit = textFieldEdit;

import * as leafac from "./leafac--javascript.js";
window.leafac = leafac;
