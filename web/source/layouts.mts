import timers from "node:timers/promises";
import express from "express";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import dedent from "dedent";
import qs from "qs";
import cryptoRandomString from "crypto-random-string";
import semver from "semver";
import { Application } from "./index.mjs";

export type ApplicationLayouts = {
  web: {
    locals: {
      layouts: {
        base: ({
          request,
          response,
          head,
          showCourseSwitcher,
          extraHeaders,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          head: HTML;
          showCourseSwitcher?: boolean;
          extraHeaders?: HTML;
          body: HTML;
        }) => HTML;

        box: ({
          request,
          response,
          head,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          head: HTML;
          body: HTML;
        }) => HTML;

        main: ({
          request,
          response,
          head,
          showCourseSwitcher,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          head: HTML;
          showCourseSwitcher?: boolean;
          body: HTML;
        }) => HTML;

        settings: ({
          request,
          response,
          head,
          menuButton,
          menu,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          head: HTML;
          menuButton: HTML;
          menu: HTML;
          body: HTML;
        }) => HTML;

        partial: ({
          request,
          response,
          body,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          body: HTML;
        }) => HTML;
      };

      partials: {
        logo: (options?: { size?: number }) => HTML;

        spinner: ({
          request,
          response,
          size,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          size?: number;
        }) => HTML;

        reportIssueHref: string;
      };

      helpers: {
        Flash: {
          maxAge: number;

          set: ({
            request,
            response,
            theme,
            content,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            theme: string;
            content: HTML;
          }) => void;

          get: ({
            request,
            response,
          }: {
            request: express.Request<
              {},
              any,
              {},
              {},
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
            response: express.Response<
              any,
              Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
            >;
          }) => { theme: string; content: HTML } | undefined;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.layouts.base = ({
    request,
    response,
    head,
    showCourseSwitcher = true,
    extraHeaders = html``,
    body,
  }) =>
    html`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta name="version" content="${application.version}" />

          <meta
            name="description"
            content="Communication Platform for Education"
          />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          />
          <meta
            key="theme-color--light"
            name="theme-color"
            media="(prefers-color-scheme: light)"
            content=""
          />
          <meta
            key="theme-color--dark"
            name="theme-color"
            media="(prefers-color-scheme: dark)"
            content=""
          />
          <link
            rel="stylesheet"
            href="https://${application.configuration.hostname}/${application
              .static["index.css"]}"
          />

          <script
            src="https://${application.configuration.hostname}/${application
              .static["index.mjs"]}"
            defer
          ></script>

          $${head}
        </head>

        <body
          css="${css`
            @at-root {
              ::-webkit-scrollbar {
                width: var(--space--2);
                height: var(--space--2);
              }

              ::-webkit-scrollbar-button {
                display: none;
              }

              ::-webkit-scrollbar-track {
                display: none;
              }

              ::-webkit-scrollbar-track-piece {
                display: none;
              }

              ::-webkit-scrollbar-thumb {
                background-color: var(--color--gray--medium--400);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--500);
                }
                border-radius: var(--border-radius--full);
              }

              ::-webkit-scrollbar-corner {
                display: none;
              }

              ::-webkit-resizer {
                display: none;
              }

              *,
              ::before,
              ::after {
                scrollbar-color: var(--color--gray--medium--400) transparent;
                @media (prefers-color-scheme: dark) {
                  scrollbar-color: var(--color--gray--medium--500) transparent;
                }
              }

              .grabbing {
                &,
                &::before,
                &::after,
                & *,
                & *::before,
                & *::after {
                  cursor: grabbing !important;
                  touch-action: none !important;
                  user-select: none !important;
                }
              }

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
                    var(--border-width--0) var(--border-width--2)
                    var(--color--box-shadow);
                }
                transition-property: var(--transition-property--box-shadow);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );

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
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );

                &::after {
                  content: "";
                  background-color: var(--color--gray--medium--50);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--200);
                  }
                  display: block;
                  width: var(--space--3);
                  height: var(--space--3);
                  border-radius: var(--border-radius--circle);
                  transition-property: var(--transition-property--all);
                  transition-duration: var(--transition-duration--150);
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
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
                font-family: "JetBrains MonoVariable",
                  var(--font-family--monospace);
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
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
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
                border-top: var(--border-width--1) solid
                  var(--color--gray--medium--200);
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
                color: var(--color--gray--medium--700);
                --background-color: var(--color--gray--medium--100);
                background-color: var(--background-color);
                --border-color: var(--color--gray--medium--400);
                border: var(--border-width--1) solid var(--border-color);
                border-radius: var(--border-radius--md);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--gray--medium--200);
                  --background-color: var(--color--gray--medium--800);
                  --border-color: var(--color--gray--medium--400);
                }
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
                  flex: 1;
                  text-align: right;

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
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--200);
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
                h1,
                h2,
                h3,
                h4,
                h5,
                h6 {
                  margin-top: var(--space--6);
                  margin-bottom: var(--space--2);
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

                hr {
                  border-top: var(--border-width--1) solid
                    var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--600);
                  }
                  margin: var(--space--2) var(--space--0);
                }

                p + p {
                  margin-top: var(--space--2);
                }

                strong {
                  font-weight: var(--font-weight--bold);
                  color: var(--color--gray--medium--800);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--100);
                  }
                }

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
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );
                  cursor: pointer;
                }

                code {
                  font-family: "JetBrains MonoVariable",
                    var(--font-family--monospace);
                  font-variant-ligatures: none;
                  background-color: var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--600);
                  }
                  padding: var(--space--0) var(--space--0-5);
                  border-radius: var(--border-radius--base);
                }

                ins {
                  color: var(--color--green--600);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--green--500);
                  }
                }

                del {
                  text-decoration: line-through;
                  color: var(--color--rose--600);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--rose--500);
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

                video,
                ul,
                ol,
                blockquote,
                table,
                details,
                .math-display,
                pre {
                  margin: var(--space--4) var(--space--0);
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

                li + li {
                  margin-top: var(--space--2);
                }

                input[type="radio"] {
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
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  transition-property: var(--transition-property--colors);
                  transition-duration: var(--transition-duration--150);
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );

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
                    transition-timing-function: var(
                      --transition-timing-function--in-out
                    );
                  }
                  &:not(:checked)::before {
                    transform: scale(var(--scale--0));
                  }
                }

                input[type="checkbox"] {
                  font-size: var(--font-size--2xs);
                  line-height: var(--line-height--2xs);
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
                  width: var(--space--3-5);
                  height: var(--space--3-5);
                  border-radius: var(--border-radius--base);
                  margin-right: var(--space--1);
                  display: inline-flex;
                  justify-content: center;
                  align-items: center;
                  transition-property: var(--transition-property--colors);
                  transition-duration: var(--transition-duration--150);
                  transition-timing-function: var(
                    --transition-timing-function--in-out
                  );

                  &::before {
                    content: "\\f633";
                    font-family: "bootstrap-icons" !important;
                    color: var(--color--gray--medium--50);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--200);
                    }
                    transition-property: var(--transition-property--transform);
                    transition-duration: var(--transition-duration--150);
                    transition-timing-function: var(
                      --transition-timing-function--in-out
                    );
                  }
                  &:not(:checked)::before {
                    transform: scale(var(--scale--0));
                  }
                }

                li > input[type="checkbox"]:first-child {
                  position: absolute;
                  margin-left: var(--space---5);
                  margin-top: var(--space--1);
                }

                blockquote {
                  padding-left: var(--space--4);
                  color: var(--color--gray--medium--500);
                  border-left: var(--border-width--4) solid
                    var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--gray--medium--400);
                    border-color: var(--color--gray--medium--600);
                  }
                }

                table {
                  border-collapse: collapse;
                  display: block;
                  overflow-x: auto;
                  tbody tr {
                    border-top: var(--border-width--1) solid
                      var(--color--gray--medium--300);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--600);
                    }
                  }
                  th,
                  td {
                    padding: var(--space--1) var(--space--3);
                  }
                  th {
                    font-weight: var(--font-weight--bold);
                    text-align: left;
                    color: var(--color--gray--medium--800);
                    @media (prefers-color-scheme: dark) {
                      color: var(--color--gray--medium--100);
                    }
                  }
                }

                details {
                  background-color: var(--color--gray--medium--300);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--gray--medium--600);
                  }
                  border-radius: var(--border-radius--xl);
                  padding: var(--space--0) var(--space--4);
                  & > summary {
                    &:hover,
                    &:focus-within {
                      background-color: var(--color--gray--medium--400);
                    }
                    @media (prefers-color-scheme: dark) {
                      &:hover,
                      &:focus-within {
                        background-color: var(--color--gray--medium--500);
                      }
                    }
                    padding: var(--space--2) var(--space--4);
                    border-radius: var(--border-radius--xl);
                    margin: var(--space--0) var(--space---4);
                    transition-property: var(--transition-property--colors);
                    transition-duration: var(--transition-duration--150);
                    transition-timing-function: var(
                      --transition-timing-function--in-out
                    );
                    cursor: pointer;
                    &::before {
                      content: "\\f275";
                      font-family: "bootstrap-icons" !important;
                      font-size: var(--font-size--xs);
                      line-height: var(--line-height--xs);
                      margin-right: var(--space--2);
                    }
                  }
                  &[open] {
                    padding-bottom: var(--space--4);
                    & > summary {
                      margin-bottom: var(--space--4);
                      &::before {
                        content: "\\f273";
                      }
                    }
                  }
                }

                .katex {
                  overflow-x: auto;
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
              }
            }

            font-family: "Public SansVariable", var(--font-family--sans-serif);
            font-size: var(--font-size--sm);
            line-height: var(--line-height--sm);
            color: var(--color--gray--medium--700);
            background-color: var(--color--gray--medium--50);
            @media (prefers-color-scheme: dark) {
              color: var(--color--gray--medium--200);
              background-color: var(--color--gray--medium--900);
            }
          `}"
          javascript="${(() => {
            const flash = application.web.locals.helpers.Flash.get({
              request,
              response,
            });

            return javascript`
              if (${flash !== undefined}) {
                leafac.setTippy({
                  event,
                  element: this,
                  elementProperty: "flash",
                  tippyProps: {
                    appendTo: this,
                    trigger: "manual",
                    hideOnClick: false,
                    theme: ${flash?.theme ?? ""},
                    arrow: false,
                    interactive: true,
                    content: ${html`
                      <div
                        css="${css`
                          padding: var(--space--1) var(--space--2);
                          display: flex;
                          gap: var(--space--2);
                          align-items: flex-start;
                        `}"
                      >
                        <div>$${flash?.content ?? html``}</div>
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                theme: "green",
                                touch: false,
                                content: "Close",
                              },
                            });

                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                            };
                          `}"
                        >
                          <i class="bi bi-x-circle"></i>
                        </button>
                      </div>
                    `},  
                  },
                });
                this.flash.show();
              }

              document.querySelector('[key="theme-color--light"]').setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue(${`--color--${
                response.locals.enrollment?.accentColor ?? ""
              }--500`}));
              document.querySelector('[key="theme-color--dark"]').setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue(${`--color--${
                response.locals.enrollment?.accentColor ?? ""
              }--600`}));

              if (${
                typeof response.locals.liveConnectionNonce === "string"
              } && event?.detail?.liveUpdate !== true)
                leafac.liveConnection({
                  nonce: ${response.locals.liveConnectionNonce},
                  newServerVersionMessage: "Courselore has been updated. Please reload the page.",
                  offlineMessage: "Failed to connect to Courselore. Please check your internet connection and try reloading the page.",
                  environment: ${application.configuration.environment},
                });
            `;
          })()}"
        >
          <div
            key="viewport"
            css="${css`
              position: absolute;
              top: 0;
              right: 0;
              bottom: 0;
              left: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
            `}"
            javascript="${javascript`
              this.onscroll = () => {
                this.scroll(0, 0);
              };
            `}"
          >
            $${response.locals.enrollment === undefined
              ? html``
              : html`
                  <div
                    key="header--accent-color"
                    css="${css`
                      height: var(--border-width--8);
                      display: flex;
                    `}"
                  >
                    <button
                      class="button"
                      style="
                        --color--accent-color--500: var(--color--${response
                        .locals.enrollment.accentColor}--500);
                        --color--accent-color--600: var(--color--${response
                        .locals.enrollment.accentColor}--600);
                      "
                      css="${css`
                        background-color: var(--color--accent-color--500);
                        @media (prefers-color-scheme: dark) {
                          background-color: var(--color--accent-color--600);
                        }
                        border-radius: var(--border-radius--none);
                        flex: 1;
                      `}"
                      javascript="${javascript`
                        this.style.setProperty("--color--accent-color--500", ${`var(--color--${response.locals.enrollment.accentColor}--500)`});
                        this.style.setProperty("--color--accent-color--600", ${`var(--color--${response.locals.enrollment.accentColor}--600)`});

                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "What’s This?",
                          },
                        });

                        leafac.setTippy({
                          event,
                          element: this,
                          elementProperty: "dropdown",
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            content: ${html`
                              <div
                                css="${css`
                                  padding: var(--space--2);
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--4);
                                `}"
                              >
                                <p>
                                  This bar with an accent color appears at the
                                  top of pages related to this course to help
                                  you differentiate between courses.
                                </p>
                                <a
                                  href="https://${application.configuration
                                    .hostname}/courses/${response.locals.course!
                                    .reference}/settings/your-enrollment"
                                  class="button button--blue"
                                  css="${css`
                                    width: 100%;
                                  `}"
                                >
                                  <i class="bi bi-palette-fill"></i>
                                  Update Accent Color
                                </a>
                              </div>
                            `},  
                          },
                        });
                      `}"
                    ></button>
                  </div>
                `}
            $${(() => {
              let header = html``;

              let headerMeta = html``;

              if (application.configuration.demonstration)
                headerMeta += html`
                  <div>
                    <button
                      class="button button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          elementProperty: "dropdown",
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            content: ${html`
                              <div
                                css="${css`
                                  padding: var(--space--2);
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--4);
                                `}"
                              >
                                <p>
                                  This Courselore installation is running in
                                  demonstration mode and must not be used for
                                  real courses. Any data may be lost, including
                                  users, courses, invitations, conversations,
                                  messages, and so forth. Emails aren’t
                                  delivered. You may create demonstration data
                                  to give you a better idea of what Courselore
                                  looks like in use.
                                </p>
                                <form
                                  method="POST"
                                  action="https://${application.configuration
                                    .hostname}/demonstration-data"
                                >
                                  <button
                                    class="button button--blue"
                                    css="${css`
                                      width: 100%;
                                    `}"
                                  >
                                    <i class="bi bi-easel-fill"></i>
                                    Create Demonstration Data
                                  </button>
                                </form>
                              </div>
                            `},  
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-easel"></i>
                      Demonstration Mode
                    </button>
                  </div>
                `;

              if (application.configuration.environment === "development")
                headerMeta += html`
                  <div>
                    <button
                      class="button button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          elementProperty: "dropdown",
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            content: ${html`
                              <div
                                css="${css`
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--2);
                                `}"
                              >
                                <div class="dropdown--menu">
                                  <button
                                    class="dropdown--menu--item button button--transparent"
                                    javascript="${javascript`
                                      this.onclick = async () => {
                                        this.classList.add("button--amber");
                                        await new Promise((resolve) => { window.setTimeout(resolve, 3 * 1000); });
                                        await fetch(${`https://${application.configuration.hostname}/live-updates`}, { cache: "no-store" });
                                        this.classList.remove("button--amber");
                                        this.classList.add("button--green");
                                      };
                                    `}"
                                  >
                                    <i class="bi bi-arrow-clockwise"></i>
                                    Live-Updates
                                  </button>
                                </div>

                                <hr class="dropdown--separator" />

                                <div class="dropdown--menu">
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/health"
                                    target="_blank"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-heart-pulse"></i>
                                    Health Check
                                  </a>
                                </div>

                                <hr class="dropdown--separator" />

                                <div class="dropdown--menu">
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/errors/not-found"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-question-diamond"></i>
                                    404 Not Found
                                  </a>
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/errors/validation"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-bug"></i>
                                    Validation Error
                                  </a>
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/errors/cross-site-request-forgery"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-bug"></i>
                                    Cross-Site Request Forgery Error
                                  </a>
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/errors/exception"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-bug"></i>
                                    Server Error
                                  </a>
                                  <a
                                    href="https://${application.configuration
                                      .hostname}/errors/crash"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-fire"></i>
                                    Crash
                                  </a>
                                </div>
                              </div>
                            `},  
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-tools"></i>
                      Development Utilities
                    </button>
                  </div>
                `;

              if (application.configuration.environment !== "production")
                headerMeta += html`
                  <form
                    method="DELETE"
                    action="https://${application.configuration
                      .hostname}/turn-off"
                  >
                    <button class="button button--transparent">
                      <i class="bi bi-power"></i>
                      Turn off
                    </button>
                  </form>
                `;

              if (headerMeta !== html``)
                header += html`
                  <div
                    key="header--meta"
                    css="${css`
                      justify-content: center;
                      flex-wrap: wrap;
                    `}"
                  >
                    $${headerMeta}
                  </div>
                `;

              if (response.locals.user !== undefined) {
                const requestSignedIn = request as express.Request<
                  {},
                  any,
                  {},
                  {},
                  Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
                >;
                const responseSignedIn = response as express.Response<
                  any,
                  Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
                >;

                header += html`
                  <div
                    key="header--menu--primary"
                    css="${css`
                      && {
                        padding-top: var(--space--1);
                        padding-bottom: var(--space--1);
                        gap: var(--space--4);
                        align-items: center;
                      }
                    `}"
                  >
                    <a
                      href="https://${application.configuration.hostname}/"
                      class="button button--tight button--tight--inline button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "Courselore",
                          },
                        });
                      `}"
                    >
                      $${application.web.locals.partials.logo()}
                    </a>

                    <div
                      css="${css`
                        font-size: var(--font-size--sm);
                        line-height: var(--line-height--sm);
                        flex: 1;
                        min-width: var(--width--0);
                      `}"
                    >
                      $${(() => {
                        const courseSwitcher = html`
                          <div class="dropdown--menu">
                            $${application.web.locals.partials.courses({
                              request: requestSignedIn,
                              response: responseSignedIn,
                              tight: true,
                            })}
                          </div>
                        `;

                        return response.locals.course !== undefined
                          ? html`
                              <button
                                class="button button--tight button--tight--inline button--transparent strong"
                                css="${css`
                                  max-width: 100%;
                                `}"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    elementProperty: "dropdown",
                                    tippyProps: {
                                      trigger: "click",
                                      interactive: true,
                                      content: ${html`
                                        <div
                                          css="${css`
                                            max-height: var(--space--80);
                                            overflow: auto;
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `}"
                                        >
                                          <div>
                                            <h3 class="heading">
                                              <i class="bi bi-journal-text"></i>
                                              ${response.locals.course.name}
                                            </h3>
                                            $${response.locals.course
                                              .archivedAt !== null
                                              ? html`
                                                  <div
                                                    css="${css`
                                                      padding: var(--space--0)
                                                        var(--space--2)
                                                        var(--space--1);
                                                      margin-top: var(
                                                        --space---2
                                                      );
                                                    `}"
                                                  >
                                                    $${application.web.locals.partials.courseArchived(
                                                      {
                                                        request,
                                                        response,
                                                      }
                                                    )}
                                                  </div>
                                                `
                                              : html``}
                                            <div class="dropdown--menu">
                                              <a
                                                href="https://${application
                                                  .configuration
                                                  .hostname}/courses/${response
                                                  .locals.course.reference}"
                                                class="dropdown--menu--item button ${request.path.includes(
                                                  "/settings/"
                                                )
                                                  ? "button--transparent"
                                                  : "button--blue"}"
                                              >
                                                <i
                                                  class="bi ${request.path.includes(
                                                    "/settings/"
                                                  )
                                                    ? "bi-chat-text"
                                                    : "bi-chat-text-fill"}"
                                                ></i>
                                                Conversations
                                              </a>
                                              <a
                                                href="https://${application
                                                  .configuration
                                                  .hostname}/courses/${response
                                                  .locals.course
                                                  .reference}/settings"
                                                class="dropdown--menu--item button ${request.path.includes(
                                                  "/settings/"
                                                )
                                                  ? "button--blue"
                                                  : "button--transparent"}"
                                              >
                                                <i class="bi bi-sliders"></i>
                                                Course Settings
                                              </a>
                                            </div>
                                          </div>
                                          $${responseSignedIn.locals.enrollments
                                            .length > 1
                                            ? html`
                                                <div>
                                                  <h3 class="heading">
                                                    <i
                                                      class="bi bi-arrow-left-right"
                                                    ></i>
                                                    Switch to Another Course
                                                  </h3>
                                                  $${courseSwitcher}
                                                </div>
                                              `
                                            : html``}
                                        </div>
                                      `},  
                                    },
                                  });
                                `}"
                              >
                                <i class="bi bi-journal-text"></i>
                                <span
                                  css="${css`
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                  `}"
                                >
                                  ${response.locals.course.name}
                                </span>
                                $${response.locals.course.archivedAt !== null
                                  ? html`
                                      $${application.web.locals.partials.courseArchived(
                                        {
                                          request,
                                          response,
                                        }
                                      )}
                                    `
                                  : html``}
                                <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : showCourseSwitcher &&
                            responseSignedIn.locals.enrollments.length > 0
                          ? html`
                              <button
                                class="button button--tight button--tight--inline button--transparent"
                                css="${css`
                                  max-width: 100%;
                                `}"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    elementProperty: "dropdown",
                                    tippyProps: {
                                      trigger: "click",
                                      interactive: true,
                                      content: ${html`
                                        <div
                                          css="${css`
                                            max-height: var(--space--80);
                                            overflow: auto;
                                          `}"
                                        >
                                          $${courseSwitcher}
                                        </div>
                                      `},  
                                    },
                                  });
                                `}"
                              >
                                Go to Your Courses
                                <i class="bi bi-chevron-down"></i>
                              </button>
                            `
                          : html``;
                      })()}
                    </div>

                    $${typeof response.locals.user.emailVerifiedAt === "string"
                      ? html`
                          <div>
                            <button
                              class="button button--tight button--tight--inline button--transparent"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: ${
                                      response.locals.invitations!.length === 0
                                        ? "Add"
                                        : `${
                                            response.locals.invitations!.length
                                          } pending invitation${
                                            response.locals.invitations!
                                              .length === 1
                                              ? ""
                                              : "s"
                                          }`
                                    },  
                                  },
                                });

                                leafac.setTippy({
                                  event,
                                  element: this,
                                  elementProperty: "dropdown",
                                  tippyProps: {
                                    trigger: "click",
                                    interactive: true,
                                    content: ${html`
                                      <div
                                        css="${css`
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `}"
                                      >
                                        $${response.locals.invitations!
                                          .length === 0
                                          ? html``
                                          : html`
                                              <div>
                                                <h3 class="heading">
                                                  <i
                                                    class="bi bi-journal-arrow-down"
                                                  ></i>
                                                  Invitations
                                                </h3>
                                                <div class="dropdown--menu">
                                                  $${response.locals.invitations!.map(
                                                    (invitation) => html`
                                                      <a
                                                        key="invitation--${invitation.reference}"
                                                        href="https://${application
                                                          .configuration
                                                          .hostname}/courses/${invitation
                                                          .course
                                                          .reference}/invitations/${invitation.reference}"
                                                        class="dropdown--menu--item button button--transparent"
                                                      >
                                                        $${application.web.locals.partials.course(
                                                          {
                                                            request,
                                                            response,
                                                            course:
                                                              invitation.course,
                                                            tight: true,
                                                          }
                                                        )}
                                                      </a>
                                                    `
                                                  )}
                                                </div>
                                              </div>
                                              <hr class="dropdown--separator" />
                                            `}
                                        <div class="dropdown--menu">
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            javascript="${javascript`
                                              leafac.setTippy({
                                                event,
                                                element: this,
                                                tippyProps: {
                                                  trigger: "click",
                                                  content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                                                },
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-journal-arrow-down"
                                            ></i>
                                            Enroll in an Existing Course
                                          </button>
                                          $${application.web.locals.helpers.mayCreateCourses(
                                            {
                                              request: requestSignedIn,
                                              response: responseSignedIn,
                                            }
                                          )
                                            ? html`
                                                <a
                                                  href="https://${application
                                                    .configuration
                                                    .hostname}/courses/new"
                                                  class="dropdown--menu--item button button--transparent"
                                                >
                                                  <i
                                                    class="bi bi-journal-plus"
                                                  ></i>
                                                  Create a New Course
                                                </a>
                                              `
                                            : html``}
                                        </div>
                                      </div>
                                    `},  
                                  },
                                });
                              `}"
                            >
                              <div
                                css="${css`
                                  display: grid;
                                  & > * {
                                    grid-area: 1 / 1;
                                  }
                                `}"
                              >
                                <div
                                  css="${css`
                                    font-size: var(--font-size--xl);
                                    line-height: var(--line-height--xl);
                                    font-weight: var(--font-weight--bold);
                                    padding: var(--space--0) var(--space--1);
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                  `}"
                                >
                                  +
                                </div>
                                $${response.locals.invitations!.length === 0
                                  ? html``
                                  : html`
                                      <div
                                        css="${css`
                                          background-color: var(
                                            --color--rose--500
                                          );
                                          @media (prefers-color-scheme: dark) {
                                            background-color: var(
                                              --color--rose--600
                                            );
                                          }
                                          width: var(--space--1-5);
                                          height: var(--space--1-5);
                                          border-radius: var(
                                            --border-radius--circle
                                          );
                                          justify-self: end;
                                          transform: translateY(50%);
                                        `}"
                                      ></div>
                                    `}
                              </div>
                            </button>
                          </div>
                        `
                      : html``}

                    <div>
                      <button
                        class="button button--tight button--tight--inline button--transparent"
                        css="${css`
                          padding: var(--space--1);
                          border-radius: var(--border-radius--circle);
                        `}"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            tippyProps: {
                              touch: false,
                              content: ${response.locals.user.name},
                            },
                          });

                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "dropdown",
                            tippyProps: {
                              trigger: "click",
                              interactive: true,
                              content: ${html`
                                <div
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--2);
                                  `}"
                                >
                                  <div
                                    css="${css`
                                      padding: var(--space--0) var(--space--2);
                                    `}"
                                  >
                                    <p class="strong">
                                      ${response.locals.user.name}
                                    </p>
                                    <p class="secondary">
                                      ${response.locals.user.email}
                                    </p>
                                  </div>

                                  <hr class="dropdown--separator" />

                                  $${typeof response.locals.user
                                    .emailVerifiedAt === "string" &&
                                  response.locals.user.systemRole ===
                                    "administrator"
                                    ? html`
                                        <div class="dropdown--menu">
                                          <a
                                            class="dropdown--menu--item button button--transparent"
                                            href="https://${application
                                              .configuration
                                              .hostname}/administration"
                                          >
                                            <i
                                              class="bi bi-pc-display-horizontal"
                                            ></i>
                                            Administration
                                          </a>
                                        </div>

                                        <hr class="dropdown--separator" />
                                      `
                                    : html``}

                                  <div class="dropdown--menu">
                                    $${typeof response.locals.user
                                      .emailVerifiedAt === "string"
                                      ? html`
                                          <a
                                            class="dropdown--menu--item button button--transparent"
                                            href="https://${application
                                              .configuration.hostname}/settings"
                                          >
                                            <i class="bi bi-sliders"></i>
                                            User Settings
                                          </a>
                                        `
                                      : html``}

                                    <form
                                      method="DELETE"
                                      action="https://${application
                                        .configuration.hostname}/sign-out"
                                    >
                                      <button
                                        class="dropdown--menu--item button button--transparent"
                                      >
                                        <i class="bi bi-box-arrow-right"></i>
                                        Sign Out
                                      </button>
                                    </form>
                                  </div>
                                </div>
                              `},  
                            },
                          });
                        `}"
                      >
                        $${application.web.locals.partials.user({
                          request,
                          response,
                          user: response.locals.user,
                          decorate: false,
                          name: false,
                        })}
                      </button>
                    </div>
                  </div>
                `;
              }

              header += extraHeaders;

              return header !== html``
                ? html`
                    <div
                      key="header"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        background-color: var(--color--gray--medium--100);
                        @media (prefers-color-scheme: dark) {
                          background-color: var(--color--gray--medium--800);
                        }
                        display: flex;
                        flex-direction: column;
                        & > * {
                          padding: var(--space--0) var(--space--4);
                          border-bottom: var(--border-width--1) solid
                            var(--color--gray--medium--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--gray--medium--700);
                          }
                          display: flex;
                        }
                      `}"
                    >
                      $${header}
                    </div>
                  `
                : html``;
            })()}

            <div
              key="main"
              css="${css`
                flex: 1;
                overflow: auto;
              `}"
              javascript="${javascript`
                if (
                  event?.detail?.previousLocation?.origin !== window.location.origin ||
                  event?.detail?.previousLocation?.pathname !== window.location.pathname ||
                  event?.detail?.previousLocation?.search !== window.location.search
                )
                  this.scroll(0, 0);
              `}"
            >
              $${body}
            </div>

            <div
              key="footer"
              css="${css`
                font-size: var(--font-size--xs);
                line-height: var(--line-height--xs);
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                padding: var(--space--0) var(--space--4);
                border-top: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
                display: flex;
                justify-content: center;
                flex-wrap: wrap;
              `}"
            >
              <div>
                <button
                  class="button button--transparent"
                  css="${css`
                    align-items: center;
                  `}"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      elementProperty: "dropdown",
                      tippyProps: {
                        trigger: "click",
                        interactive: true,
                        content: ${html`
                          <h3 class="heading">
                            $${application.web.locals.partials.logo({
                              size: 12 /* var(--space--3) */,
                            })}
                            <span>
                              Courselore <br />
                              Communication Platform for Education <br />
                              <small
                                class="secondary"
                                css="${css`
                                  font-size: var(--font-size--2xs);
                                  line-height: var(--line-height--2xs);
                                `}"
                              >
                                Version ${application.version}
                              </small>
                            </span>
                          </h3>
                          <div class="dropdown--menu">
                            <a
                              href="https://${application.configuration
                                .hostname}/about"
                              target="_blank"
                              class="dropdown--menu--item button button--transparent"
                            >
                              <i class="bi bi-info-circle"></i>
                              About
                            </a>
                            <a
                              href="https://github.com/courselore/courselore"
                              target="_blank"
                              class="dropdown--menu--item button button--transparent"
                            >
                              <i class="bi bi-file-earmark-code"></i>
                              Source Code
                            </a>
                          </div>
                        `},  
                      },
                    });
                  `}"
                >
                  $${application.web.locals.partials.logo({
                    size: 16 /* var(--space--4) */,
                  })}
                  Courselore
                </button>
              </div>

              <div>
                <button
                  class="button button--transparent"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      elementProperty: "dropdown",
                      tippyProps: {
                        trigger: "click",
                        interactive: true,
                        content: ${html`
                          <h3 class="heading">
                            <i class="bi bi-bug"></i>
                            Report an Issue
                          </h3>
                          <div class="dropdown--menu">
                            <a
                              href="${application.addresses
                                .metaCourseloreInvitation}${qs.stringify(
                                {
                                  redirect: `conversations/new/question${qs.stringify(
                                    {
                                      newConversation: {
                                        content: dedent`
                                          **What did you try to do?**
    
    
    
                                          **What did you expect to happen?**
    
    
    
                                          **What really happened?**
    
    
    
                                          **What error messages (if any) did you run into?**
    
    
    
                                          **Please provide as much relevant context as possible (operating system, browser, and so forth):**
    
                                          - Courselore Version: ${application.version}
                                        `,
                                        tagsReferences: ["9676584193"],
                                      },
                                    },
                                    { addQueryPrefix: true }
                                  )}`,
                                },
                                { addQueryPrefix: true }
                              )}"
                              target="_blank"
                              class="dropdown--menu--item button button--transparent"
                              css="${css`
                                align-items: center;
                              `}"
                            >
                              $${application.web.locals.partials.logo({
                                size: 14 /* var(--space--3-5) */,
                              })}
                              Meta Courselore
                            </a>
                            <a
                              href="${application.web.locals.partials
                                .reportIssueHref}"
                              target="_blank"
                              class="dropdown--menu--item button button--transparent"
                            >
                              <i class="bi bi-envelope"></i>
                              ${application.configuration.administratorEmail}
                            </a>
                            <a
                              href="https://github.com/courselore/courselore/issues/new${qs.stringify(
                                {
                                  body: dedent`
                                    **What did you try to do?**
    
    
    
                                    **What did you expect to happen?**
    
    
    
                                    **What really happened?**
    
    
    
                                    **What error messages (if any) did you run into?**
    
    
    
                                    **Please provide as much relevant context as possible (operating system, browser, and so forth):**
    
                                    - Courselore Version: ${application.version}
                                  `,
                                },
                                { addQueryPrefix: true }
                              )}"
                              target="_blank"
                              class="dropdown--menu--item button button--transparent"
                            >
                              <i class="bi bi-github"></i>
                              GitHub Issues
                            </a>
                          </div>
                        `},  
                      },
                    });
                  `}"
                >
                  <i class="bi bi-bug"></i>
                  Report an Issue
                </button>
              </div>

              $${response.locals.user?.systemRole === "administrator" &&
              semver.gt(
                response.locals.administrationOptions!.latestVersion,
                application.version
              )
                ? html`
                    <div>
                      <button
                        class="button button--transparent strong text--green"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            elementProperty: "dropdown",
                            tippyProps: {
                              trigger: "click",
                              interactive: true,
                              content: ${html`
                                <h3 class="heading">
                                  <i class="bi bi-arrow-up-circle-fill"></i>
                                  <span>
                                    Courselore
                                    <span
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            touch: false,
                                            content: "Current Courselore version",
                                          },
                                        });
                                      `}"
                                    >
                                      ${application.version}
                                    </span>
                                    →
                                    <span
                                      javascript="${javascript`
                                        leafac.setTippy({
                                          event,
                                          element: this,
                                          tippyProps: {
                                            touch: false,
                                            content: "Latest Courselore version",
                                          },
                                        });
                                      `}"
                                    >
                                      ${response.locals.administrationOptions!
                                        .latestVersion}
                                    </span>
                                  </span>
                                </h3>

                                <div class="dropdown--menu">
                                  <a
                                    href="https://github.com/courselore/courselore/blob/main/documentation/changelog.md"
                                    target="_blank"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-fire"></i>
                                    Changelog
                                  </a>
                                  <a
                                    href="https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#update"
                                    target="_blank"
                                    class="dropdown--menu--item button button--transparent"
                                  >
                                    <i class="bi bi-book"></i>
                                    Update Instructions
                                  </a>
                                  <a
                                    href="https://github.com/courselore/courselore/releases/tag/v${response
                                      .locals.administrationOptions!
                                      .latestVersion}"
                                    target="_blank"
                                    class="dropdown--menu--item button button--green"
                                  >
                                    <i class="bi bi-download"></i>
                                    Download
                                  </a>
                                </div>
                              `},
                            },
                          });
                        `}"
                      >
                        <span
                          css="${css`
                            display: flex;
                            gap: var(--space--2);
                            animation: bounce 1s 3;
                          `}"
                        >
                          <i class="bi bi-arrow-up-circle-fill"></i>
                          Update Courselore
                        </span>
                      </button>
                    </div>
                  `
                : html``}

              <div>
                <button
                  class="button button--transparent ${response.locals.user !==
                    undefined &&
                  semver.gt(
                    application.version,
                    response.locals.user.latestNewsVersion
                  )
                    ? "strong text--green"
                    : ""}"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      elementProperty: "dropdown",
                      tippyProps: {
                        trigger: "click",
                        interactive: true,
                        content: ${html`
                          <div
                            css="${css`
                              max-height: var(--space--80);
                              overflow: auto;
                            `}"
                          >
                            <h3 class="heading">
                              <i class="bi bi-newspaper"></i>
                              News
                            </h3>

                            <div
                              css="${css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);

                                video {
                                  max-width: 100%;
                                  height: auto;
                                  border-radius: var(--border-radius--xl);
                                  display: block;
                                }
                              `}"
                            >
                              <h4 class="strong">6.0.11 · 2023-03-16</h4>

                              <p>Polls</p>

                              <div>
                                <video
                                  src="https://${application.configuration
                                    .hostname}/${application.static[
                                    "news/2023-03-16--polls.mp4"
                                  ]}"
                                  autoplay
                                  loop
                                  muted
                                  playsinline
                                ></video>
                              </div>
                            </div>
                          </div>
                        `},
                      },
                    });

                    if (${response.locals.user !== undefined})
                      this.onclick = async () => {
                        this.classList.remove("strong");
                        this.classList.remove("text--green");
                        await fetch(${`https://${application.configuration.hostname}/latest-news-version`}, {
                          method: "PATCH",
                          headers: { "CSRF-Protection": "true", },
                          cache: "no-store",
                        });
                      };
                  `}"
                >
                  <i class="bi bi-newspaper"></i>
                  News
                </button>
              </div>
            </div>
          </div>

          <div
            key="progress-bar"
            hidden
            css="${css`
              position: fixed;
              top: 0;
              right: 0;
              left: 0;
            `}"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Loading…",
                },
              });

              window.onlivenavigate = () => {
                const parentElement = this;
                parentElement.hidden = false;
                const element = parentElement.querySelector("div");
                let width = 5;
                window.clearTimeout(element.updateTimeout);
                (function update() {
                  if (parentElement.hidden || !leafac.isConnected(element)) return;
                  element.style.width = width.toString() + "%";
                  width += (95 - width) / (20 + Math.random() * 15);
                  element.updateTimeout = window.setTimeout(update, 200 + Math.random() * 300);
                })();
              };

              window.onlivenavigateerror = () => {
                this.hidden = true;
              };
            `}"
          >
            <div
              css="${css`
                height: var(--border-width--4);
                background-color: var(--color--blue--500);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--blue--600);
                }
                border: var(--border-width--1) solid var(--color--blue--600);
                border-top-width: var(--border-width--0);
                border-left-width: var(--border-width--0);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--blue--700);
                }
                transition-property: width;
                transition-duration: var(--transition-duration--500);
                transition-timing-function: var(
                  --transition-timing-function--in-out
                );
              `}"
            ></div>
          </div>
        </body>
      </html>
    `;

  if (application.configuration.environment !== "production")
    application.web.delete<
      {},
      any,
      {},
      {},
      Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
    >("/turn-off", (request, response) => {
      response.send(
        application.web.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Thanks for trying Courselore! · Courselore · Communication
              Platform for Education
            </title>
          `,
          body: html`
            <p class="strong">Thanks for trying Courselore!</p>
            <p>
              Next steps:
              <a
                href="https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md"
                class="link"
                >Learn how to install Courselore on your own server</a
              >
              or
              <a
                href="https://github.com/courselore/courselore/blob/main/documentation/setting-up-for-development.md"
                class="link"
                >learn how to setup for development</a
              >.
            </p>
          `,
        })
      );
      process.kill(process.ppid);
    });

  application.web.locals.layouts.box = ({ request, response, head, body }) =>
    application.web.locals.layouts.base({
      request,
      response,
      head,
      body: html`
        <div
          key="layout--box"
          css="${css`
            min-width: 100%;
            min-height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          `}"
        >
          <div
            css="${css`
              flex: 1;
              max-width: var(--width--sm);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div
              key="main--logo"
              css="${css`
                display: flex;
                justify-content: center;
              `}"
            >
              <a
                href="https://${application.configuration.hostname}/"
                class="heading--display button button--transparent"
                css="${css`
                  align-items: center;
                `}"
              >
                $${application.web.locals.partials.logo()} Courselore
              </a>
            </div>
            <div
              key="main--${request.path}"
              css="${css`
                background-color: var(--color--gray--medium--100);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--800);
                }
                padding: var(--space--4);
                border-radius: var(--border-radius--lg);
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              $${body}
            </div>

            $${application.configuration.hostname ===
            application.addresses.tryHostname
              ? html`
                  <div
                    key="main--try"
                    css="${css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `}"
                  >
                    <div
                      css="${css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <p>
                        This is a demonstration installation of Courselore and
                        must not be used for real courses. Any data may be lost,
                        including users, courses, invitations, conversations,
                        messages, and so forth. Emails aren’t delivered. You may
                        create demonstration data to give you a better idea of
                        what Courselore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="https://${application.configuration
                          .hostname}/demonstration-data"
                      >
                        <button
                          class="button button--amber"
                          css="${css`
                            width: 100%;
                          `}"
                        >
                          <i class="bi bi-easel-fill"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : application.configuration.demonstration
              ? html`
                  <div
                    key="main--demonstration"
                    css="${css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);
                    `}"
                  >
                    <div
                      css="${css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <div
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                      `}"
                    >
                      <p>
                        This Courselore installation is running in demonstration
                        mode and must not be used for real courses. Any data may
                        be lost, including users, courses, invitations,
                        conversations, messages, and so forth. Emails aren’t
                        delivered. You may create demonstration data to give you
                        a better idea of what Courselore looks like in use.
                      </p>
                      <form
                        method="POST"
                        action="https://${application.configuration
                          .hostname}/demonstration-data"
                      >
                        <button
                          class="button button--amber"
                          css="${css`
                            width: 100%;
                          `}"
                        >
                          <i class="bi bi-easel-fill"></i>
                          Create Demonstration Data
                        </button>
                      </form>
                    </div>
                  </div>
                `
              : html``}
          </div>
        </div>
      `,
    });

  application.web.locals.layouts.main = ({
    request,
    response,
    head,
    showCourseSwitcher = true,
    body,
  }) =>
    application.web.locals.layouts.base({
      request,
      response,
      head,
      showCourseSwitcher,
      body: html`
        <div
          key="layout--main--${request.path}"
          css="${css`
            display: flex;
            justify-content: center;
          `}"
        >
          <div
            css="${css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              margin: var(--space--4);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  application.web.locals.layouts.settings = ({
    request,
    response,
    head,
    menuButton,
    menu,
    body,
  }) =>
    application.web.locals.layouts.base({
      request,
      response,
      head,
      extraHeaders:
        menu === html``
          ? html``
          : html`
              <div
                key="header--menu--secondary--${request.path}"
                css="${css`
                  && {
                    justify-content: center;
                    @media (min-width: 700px) {
                      display: none;
                    }
                  }
                `}"
              >
                <div
                  css="${css`
                    padding: var(--space--1) var(--space--0);
                  `}"
                >
                  <button
                    class="button button--tight button--tight--inline button--transparent"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        elementProperty: "dropdown",
                        tippyProps: {
                          trigger: "click",
                          interactive: true,
                          content: ${html`
                            <div class="dropdown--menu">$${menu}</div>
                          `},
                        },
                      });
                    `}"
                  >
                    $${menuButton}
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
              </div>
            `,
      body: html`
        <div
          key="layout--settings--${request.path}"
          css="${css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            gap: var(--space--8);
          `}"
        >
          $${menu === html``
            ? html``
            : html`
                <div
                  key="layout--settings--menu"
                  css="${css`
                    flex: 1;
                    max-width: var(--space--64);
                    @media (max-width: 699px) {
                      display: none;
                    }
                  `}"
                >
                  <div class="menu-box">$${menu}</div>
                </div>
              `}
          <div
            key="layout--settings--main"
            css="${css`
              flex: 1;
              min-width: var(--width--0);
              max-width: var(--width--prose);
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            $${body}
          </div>
        </div>
      `,
    });

  application.web.locals.layouts.partial = ({ request, response, body }) => {
    if (typeof request.header("Live-Connection") !== "string")
      delete response.locals.liveConnectionNonce;

    return body;
  };

  application.web.locals.partials.logo = (() => {
    // https://www.youtube.com/watch?v=dSK-MW-zuAc
    const order = 2;
    const viewBox = 24; /* var(--space--6) */
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
    const pathD = `M ${points
      .map((point) => point.map((coordinate) => coordinate * viewBox).join(" "))
      .join(" L ")} Z`;
    return ({ size = viewBox } = {}) => html`
      <svg
        width="${size.toString()}"
        height="${size.toString()}"
        viewBox="0 0 ${viewBox.toString()} ${viewBox.toString()}"
      >
        <path
          d="${pathD}"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    `;
  })();

  application.web.locals.partials.spinner = ({
    request,
    response,
    size = 20,
  }) => html`
    <svg
      width="${size.toString()}"
      height="${size.toString()}"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      stroke-width="4"
      css="${css`
        animation: var(--animation--spin);
      `}"
    >
      <path
        d="M 2 10 A 8 8 0 0 0 18 10 A 8 8 0 0 0 2 10"
        css="${css`
          opacity: var(--opacity--25);
        `}"
      />
      <path
        d="M 2 10 A 8 8 0 0 0 15.5 15.5"
        css="${css`
          opacity: var(--opacity--75);
        `}"
      />
    </svg>
  `;

  application.web.locals.partials.reportIssueHref = `mailto:${
    application.configuration.administratorEmail
  }${qs.stringify(
    {
      subject: "Report an Issue",
      body: dedent`
          What did you try to do?
  
  
  
          What did you expect to happen?
  
  
  
          What really happened?
  
  
  
          What error messages (if any) did you run into?
  
  
  
          Please provide as much relevant context as possible (operating system, browser, and so forth):
  
          Courselore Version: ${application.version}
        `,
    },
    { addQueryPrefix: true }
  )}`;

  application.web.locals.helpers.Flash = {
    maxAge: 5 * 60 * 1000,

    set: ({ request, response, theme, content }) => {
      const flash = application.database.get<{ nonce: string }>(
        sql`
          SELECT * FROM "flashes" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "flashes" ("createdAt", "nonce", "theme", "content")
                VALUES (
                  ${new Date().toISOString()},
                  ${cryptoRandomString({ length: 10, type: "alphanumeric" })},
                  ${theme},
                  ${content}
                )
              `
            ).lastInsertRowid
          }
        `
      )!;
      request.cookies["__Host-Flash"] = flash.nonce;
      response.cookie("__Host-Flash", flash.nonce, {
        ...application.web.locals.configuration.cookies,
        maxAge: application.web.locals.helpers.Flash.maxAge,
      });
    },

    get: ({ request, response }) => {
      if (request.cookies["__Host-Flash"] === undefined) return undefined;
      const flash = application.database.get<{
        id: number;
        theme: string;
        content: HTML;
      }>(
        sql`SELECT "id", "theme", "content" FROM "flashes" WHERE "nonce" = ${request.cookies["__Host-Flash"]}`
      );
      delete request.cookies["__Host-Flash"];
      response.clearCookie(
        "__Host-Flash",
        application.web.locals.configuration.cookies
      );
      if (flash === undefined) return undefined;
      application.database.run(
        sql`
          DELETE FROM "flashes" WHERE "id" = ${flash.id}
        `
      );
      return flash;
    },
  };

  if (application.process.number === 0)
    application.workerEvents.once("start", async () => {
      while (true) {
        application.log("CLEAN EXPIRED ‘flashes’", "STARTING...");
        application.database.run(
          sql`
            DELETE FROM "flashes"
            WHERE "createdAt" < ${new Date(
              Date.now() - application.web.locals.helpers.Flash.maxAge
            ).toISOString()}
          `
        );
        application.log("CLEAN EXPIRED ‘flashes’", "FINISHED");
        await timers.setTimeout(
          24 * 60 * 60 * 1000 + Math.random() * 5 * 60 * 1000,
          undefined,
          { ref: false }
        );
      }
    });
};
