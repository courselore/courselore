import "@fontsource/public-sans/variable.css";
import "@fontsource/public-sans/variable-italic.css";
import "@fontsource/jetbrains-mono/variable.css";
import "@fontsource/jetbrains-mono/variable-italic.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "katex/dist/katex.css";
import "tippy.js/dist/tippy.css";
import "tippy.js/dist/svg-arrow.css";
import "tippy.js/dist/border.css";
import "@leafac/css/static/index.css";
import "./application.css";

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

import * as localJavaScript from "./application.mjs";
window.localJavaScript = localJavaScript;

leafac.customFormValidation();
leafac.warnAboutLosingInputs();
leafac.tippySetDefaultProps();
leafac.liveNavigation();
