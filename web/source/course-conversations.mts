import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  type CourseConversationState = Application["types"]["states"]["Course"] & {
    courseConversation: {
      id: number;
      externalId: string;
    };
  };
  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<courseConversationId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationId: string },
        {},
        {},
        {},
        CourseConversationState
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      request.state.courseConversation = application.database.get<{
        id: number;
        externalId: string;
      }>(
        sql`
          select "id", "externalId"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "externalId" = ${request.pathname.courseConversationId}
        `,
      );
      if (request.state.courseConversation === undefined) return;
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<courseConversationId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<{}, {}, {}, {}, CourseConversationState>,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;

      css`
        @import "@radically-straightforward/javascript/static/index.css";
        @import "@fontsource-variable/public-sans";
        @import "@fontsource-variable/public-sans/wght-italic.css";
        @import "@fontsource-variable/jetbrains-mono";
        @import "@fontsource-variable/jetbrains-mono/wght-italic.css";
        @import "bootstrap-icons/font/bootstrap-icons.css";
        @import "katex/dist/katex.css";

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
          &.button--blue {
            color: light-dark(var(--color--blue--50), var(--color--blue--950));
            background-color: light-dark(
              var(--color--blue--500),
              var(--color--blue--500)
            );
            &:hover,
            &:focus-within {
              background-color: light-dark(
                var(--color--blue--400),
                var(--color--blue--400)
              );
            }
            &:active {
              background-color: light-dark(
                var(--color--blue--600),
                var(--color--blue--600)
              );
            }
          }
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
            border: var(--border-width--1) solid
              light-dark(var(--color--red--400), var(--color--red--600));
          }
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
        import autosize from "autosize";
        import textareaCaret from "textarea-caret";
        import textFieldEdit from "text-field-edit";
        import { unified } from "unified";
        import rehypeParse from "rehype-parse";
        import rehypeRemark from "rehype-remark";
        import remarkGfm from "remark-gfm";
        import remarkStringify from "remark-stringify";
      `;
      response.end(html`
        <!doctype html>
        <html
          css="${request.state.user.darkMode === "system"
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
        >
          <head>
            <title>Courselore</title>
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
          </head>
          <body
            css="${css`
              font-family: "Public Sans Variable",
                var(--font-family--sans-serif);
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
            javascript="${javascript`
              javascript.liveConnection(${request.id}, { reload: ${application.configuration.environment === "development"} });
            `}"
          >
            <div
              key="accentColor"
              style="
                --background-color--light: var(--color--${request.state
                .courseParticipation.accentColor}--500);
                --background-color--dark: var(--color--${request.state
                .courseParticipation.accentColor}--500);
              "
              css="${css`
                background-color: light-dark(
                  var(--background-color--light),
                  var(--background-color--dark)
                );
                height: var(--space--1);
              `}"
            ></div>
            <div
              key="header"
              css="${css`
                padding: var(--space--2) var(--space--4);
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: var(--space--4);
              `}"
            >
              <button
                key="hamburger"
                class="button button--square button--icon button--transparent"
                css="${css`
                  font-size: var(--font-size--5);
                  line-height: var(--font-size--5--line-height);
                  @media (min-width: 900px) {
                    display: none;
                  }
                `}"
                javascript="${javascript`
                  this.onclick = () => {
                    document.querySelector('[key="main"]').classList.add("sidebar--open");
                  };
                `}"
              >
                <i class="bi bi-list"></i>
              </button>
              <a
                key="logo"
                href="https://${application.configuration.hostname}"
                class="button button--rectangle button--transparent"
                css="${css`
                  display: flex;
                  gap: var(--space--1);
                  align-items: center;
                `}"
              >
                <svg width="20" height="20" viewBox="0 0 20 20">
                  <path
                    d="M 2.5 2.5 L 7.5 7.5 L 2.5 7.5 L 7.5 2.5 L 2.5 12.5 L 7.5 17.5 L 7.5 12.5 L 2.5 17.5 L 12.5 12.5 L 17.5 17.5 L 17.5 12.5 L 12.5 17.5 L 17.5 7.5 L 12.5 2.5 L 17.5 2.5 L 12.5 7.5 Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div
                  css="${css`
                    font-weight: 700;
                  `}"
                >
                  Courselore
                </div>
              </a>
              <div
                key="course"
                css="${css`
                  flex: 1;
                  min-width: var(--space--0);
                `}"
              >
                <button
                  class="button button--rectangle button--transparent"
                  css="${css`
                    max-width: 100%;
                    display: flex;
                    gap: var(--space--1);
                    align-items: center;
                  `}"
                >
                  <div
                    css="${css`
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    `}"
                  >
                    ${request.state.course.name}
                  </div>
                  <i class="bi bi-chevron-down"></i>
                </button>
              </div>
              <button
                key="user"
                class="button button--square button--transparent"
              >
                <div
                  style="
                    --color--light: var(--color--${request.state.user
                    .avatarlessBackgroundColor}--800);
                    --color--dark: var(--color--${request.state.user
                    .avatarlessBackgroundColor}--200);
                    --background-color--light: var(--color--${request.state.user
                    .avatarlessBackgroundColor}--200);
                    --background-color--dark: var(--color--${request.state.user
                    .avatarlessBackgroundColor}--800);
                  "
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    letter-spacing: var(--letter-spacing--1);
                    font-weight: 800;
                    color: light-dark(var(--color--light), var(--color--dark));
                    background-color: light-dark(
                      var(--background-color--light),
                      var(--background-color--dark)
                    );
                    width: var(--space--6);
                    height: var(--space--6);
                    border-radius: var(--border-radius--1);
                    overflow: hidden;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                  `}"
                >
                  ${(() => {
                    const nameParts = request.state.user.name
                      .split(/\s+/)
                      .filter((namePart) => namePart !== "");
                    return nameParts.length < 2
                      ? request.state.user.name.trim()[0]
                      : nameParts.at(0)![0] + nameParts.at(-1)![0];
                  })()}
                </div>
              </button>
            </div>
            <div
              key="main"
              css="${css`
                flex: 1;
                display: flex;
                min-height: 0;
              `}"
            >
              <button
                key="sidebar--underlay"
                css="${css`
                  background-color: light-dark(
                    var(--color--black),
                    var(--color--white)
                  );
                  position: absolute;
                  inset: 0;
                  opacity: var(--opacity--0);
                  cursor: pointer;
                  pointer-events: none;
                  transition-property: var(--transition-property--opacity);
                  transition-duration: var(--transition-duration--200);
                  transition-timing-function: var(
                    --transition-timing-function--ease-in-out
                  );
                  @media (max-width: 899px) {
                    [key="main"].sidebar--open & {
                      opacity: var(--opacity--30);
                      pointer-events: auto;
                    }
                  }
                `}"
                javascript="${javascript`
                  this.onclick = () => {
                    document.querySelector('[key="main"]').classList.remove("sidebar--open");
                  };
                `}"
              ></button>
              <div
                key="sidebar /courses/${request.state.course.externalId}"
                style="--width: ${String(request.state.user.sidebarWidth)}px;"
                css="${css`
                  border-right: var(--border-width--1) solid
                    light-dark(
                      var(--color--slate--200),
                      var(--color--slate--800)
                    );
                  display: flex;
                  flex-direction: column;
                  @media (max-width: 899px) {
                    background-color: light-dark(
                      var(--color--white),
                      var(--color--black)
                    );
                    position: absolute;
                    inset: 0;
                    right: var(--space--14);
                    max-width: var(--space--112);
                    box-shadow: var(--box-shadow--25);
                    transform: translateX(-101%);
                    transition-property: var(--transition-property--transform);
                    transition-duration: var(--transition-duration--200);
                    transition-timing-function: var(
                      --transition-timing-function--ease-in-out
                    );
                    [key="main"].sidebar--open & {
                      transform: translateX(0%);
                    }
                  }
                  @media (min-width: 900px) {
                    width: var(--width);
                  }
                `}"
              >
                <div
                  key="actions"
                  css="${css`
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    padding: var(--space--2) var(--space--4);
                    display: flex;
                    gap: var(--space--4);
                  `}"
                >
                  <a
                    href="https://${application.configuration
                      .hostname}/courses/${request.state.course
                      .externalId}/conversations/new"
                    class="button button--square button--blue"
                    css="${css`
                      font-size: var(--font-size--7-5);
                      font-weight: 700;
                      height: 100%;
                      aspect-ratio: var(--aspect-ratio--square);
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    `}"
                    javascript="${javascript`
                      javascript.tippy({
                        event,
                        element: this,
                        content: "New Conversation",
                      });
                    `}"
                  >
                    +
                  </a>
                  <div
                    key="search-and-filter"
                    css="${css`
                      flex: 1;
                      min-width: var(--space--0);
                      background-color: light-dark(
                        var(--color--slate--50),
                        var(--color--slate--950)
                      );
                      border: var(--border-width--1) solid
                        light-dark(
                          var(--color--slate--400),
                          var(--color--slate--600)
                        );
                      border-radius: var(--border-radius--1);
                      display: flex;
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
                    `}"
                  >
                    <input
                      type="text"
                      name="courseConversations.search"
                      css="${css`
                        flex: 1;
                        min-width: var(--space--0);
                        padding: var(--space--1) var(--space--0) var(--space--1)
                          var(--space--2);
                      `}"
                    />
                    <button
                      class="button button--icon button--transparent"
                      css="${css`
                        padding: var(--space--1) var(--space--2);
                      `}"
                      javascript="${javascript`
                        javascript.tippy({
                          event,
                          element: this,
                          content: "Search",
                        });
                        this.onclick = () => {
                          this.closest('[key="search-and-filter"]').querySelector('[name="courseConversations.search"]').focus();
                        };
                      `}"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                    <button
                      class="button button--icon button--transparent"
                      css="${css`
                        padding: var(--space--1) var(--space--2);
                      `}"
                      javascript="${javascript`
                        javascript.tippy({
                          event,
                          element: this,
                          content: "Filter",
                        });
                      `}"
                    >
                      <i class="bi bi-filter"></i>
                    </button>
                  </div>
                </div>
                <div
                  key="courseConversations"
                  css="${css`
                    overflow: auto;
                    display: flex;
                    flex-direction: column;
                  `}"
                >
                  $${[
                    html`<i class="bi bi-pin-fill"></i> Pinned`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                    `2024-04-03 — 2024-04-14`,
                  ].map(
                    (label) => html`
                      <details>
                        <summary
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--slate--600),
                              var(--color--slate--400)
                            );
                            background-color: light-dark(
                              var(--color--slate--50),
                              var(--color--slate--950)
                            );
                            padding: var(--space--2) var(--space--4);
                            border-bottom: var(--border-width--1) solid
                              light-dark(
                                var(--color--slate--200),
                                var(--color--slate--800)
                              );
                            cursor: pointer;
                            transition-property: var(
                              --transition-property--colors
                            );
                            transition-duration: var(
                              --transition-duration--150
                            );
                            transition-timing-function: var(
                              --transition-timing-function--ease-in-out
                            );
                            display: flex;
                            gap: var(--space--2);
                            align-items: center;
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
                          `}"
                        >
                          <i
                            class="bi bi-chevron-right"
                            css="${css`
                              transition-property: var(
                                --transition-property--transform
                              );
                              transition-duration: var(
                                --transition-duration--150
                              );
                              transition-timing-function: var(
                                --transition-timing-function--ease-in-out
                              );
                              details[open] > summary > & {
                                transform: rotate(var(--transform--rotate--90));
                              }
                            `}"
                          ></i>
                          <div
                            css="${css`
                              flex: 1;
                            `}"
                          >
                            $${label}
                          </div>
                          <div
                            css="${css`
                              background-color: light-dark(
                                var(--color--blue--500),
                                var(--color--blue--500)
                              );
                              width: var(--space--1-5);
                              height: var(--space--1-5);
                              border-radius: var(--border-radius--circle);
                            `} ${Math.random() < 0.7
                              ? css`
                                  visibility: hidden;
                                `
                              : css``}"
                          ></div>
                        </summary>
                        <div
                          css="${css`
                            display: flex;
                            flex-direction: column;
                          `}"
                        >
                          $${Array.from(
                            { length: 1 + Math.floor(Math.random() * 4) },
                            () => html`
                              <a
                                href="/"
                                css="${css`
                                  padding: var(--space--2) var(--space--4);
                                  border-bottom: var(--border-width--1) solid
                                    light-dark(
                                      var(--color--slate--200),
                                      var(--color--slate--800)
                                    );
                                  display: flex;
                                  gap: var(--space--4);
                                  cursor: pointer;
                                  transition-property: var(
                                    --transition-property--colors
                                  );
                                  transition-duration: var(
                                    --transition-duration--150
                                  );
                                  transition-timing-function: var(
                                    --transition-timing-function--ease-in-out
                                  );
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
                                `}"
                              >
                                <div>
                                  <div
                                    style="
                                      --color--light: var(--color--pink--800);
                                      --color--dark: var(--color--pink--200);
                                      --background-color--light: var(--color--pink--200);
                                      --background-color--dark: var(--color--pink--800);
                                    "
                                    css="${css`
                                      font-size: var(--font-size--3);
                                      line-height: var(
                                        --font-size--3--line-height
                                      );
                                      letter-spacing: var(--letter-spacing--1);
                                      font-weight: 800;
                                      color: light-dark(
                                        var(--color--light),
                                        var(--color--dark)
                                      );
                                      background-color: light-dark(
                                        var(--background-color--light),
                                        var(--background-color--dark)
                                      );
                                      width: var(--space--6);
                                      height: var(--space--6);
                                      border-radius: var(--border-radius--1);
                                      overflow: hidden;
                                      display: flex;
                                      justify-content: center;
                                      align-items: center;
                                    `}"
                                  >
                                    AW
                                  </div>
                                </div>
                                <div
                                  css="${css`
                                    flex: 1;
                                    display: flex;
                                    flex-direction: column;
                                    min-width: var(--space--0);
                                  `}"
                                >
                                  <div
                                    css="${css`
                                      font-weight: 600;
                                    `}"
                                  >
                                    Example of a conversation
                                  </div>
                                  <div
                                    css="${css`
                                      font-size: var(--font-size--3);
                                      line-height: var(
                                        --font-size--3--line-height
                                      );
                                      font-weight: 500;
                                      color: light-dark(
                                        var(--color--slate--600),
                                        var(--color--slate--400)
                                      );
                                    `}"
                                  >
                                    Abigail Wall ·
                                    <div
                                      css="${css`
                                        display: inline-block;
                                      `}"
                                    >
                                      2024-03-02
                                    </div>
                                    <br />
                                    $${Math.random() < 0.5
                                      ? html`<div
                                          css="${css`
                                            color: light-dark(
                                              var(--color--red--600),
                                              var(--color--red--400)
                                            );
                                          `}"
                                        >
                                          Question · Unresolved
                                        </div>`
                                      : Math.random() < 0.5
                                        ? html`Question`
                                        : html`Note`}
                                  </div>
                                  <div
                                    css="${css`
                                      font-size: var(--font-size--3);
                                      line-height: var(
                                        --font-size--3--line-height
                                      );
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                      white-space: nowrap;
                                      overflow: hidden;
                                      text-overflow: ellipsis;
                                    `}"
                                  >
                                    Human is behind a closed door, emergency!
                                    abandoned! meeooowwww!!! headbutt owner's
                                    knee chase laser be a nyan cat,
                                  </div>
                                </div>
                                <div
                                  css="${css`
                                    align-self: center;

                                    background-color: light-dark(
                                      var(--color--blue--500),
                                      var(--color--blue--500)
                                    );
                                    width: var(--space--1-5);
                                    height: var(--space--1-5);
                                    border-radius: var(--border-radius--circle);
                                  `} ${Math.random() < 0.7
                                    ? css`
                                        visibility: hidden;
                                      `
                                    : css``}"
                                ></div>
                              </a>
                            `,
                          )}
                        </div>
                      </details>
                    `,
                  )}
                </div>
              </div>
              <div
                key="sidebar--separator"
                css="${css`
                  position: relative;
                  @media (max-width: 899px) {
                    display: none;
                  }
                `}"
              >
                <div
                  css="${css`
                    width: var(--border-width--4);
                    height: 100%;
                    position: absolute;
                    transform: translateX(-50%);
                    cursor: col-resize;
                    pointer-events: auto;
                    transition-property: var(--transition-property--colors);
                    transition-delay: var(--transition-duration--150);
                    transition-duration: var(--transition-duration--150);
                    transition-timing-function: var(
                      --transition-timing-function--ease-in-out
                    );
                    &:hover,
                    &.active {
                      background-color: light-dark(
                        var(--color--blue--500),
                        var(--color--blue--500)
                      );
                    }
                  `}"
                  javascript="${javascript`
                    this.onpointerdown = (event) => {
                      if (event.button !== 0) return;
                      this.classList.add("active");
                      document.querySelector("body").classList.add("noninteractive");
                      document.querySelector("body").style.cursor = "col-resize";
                      document.onpointermove = (event) => {
                        this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4)) + "px");
                      };
                      document.onpointerup = () => {
                        this.classList.remove("active");
                        document.querySelector("body").classList.remove("noninteractive");
                        document.querySelector("body").style.cursor = "";
                        document.onpointermove = undefined;
                        document.onpointerup = undefined;
                        updateSidebarWidth();
                      };
                    };
                    this.ondblclick = (event) => {
                      this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(80 * 4) +"px");
                      updateSidebarWidth();
                    };
                    const updateSidebarWidth = utilities.foregroundJob(async () => {
                      await fetch(${`https://${application.configuration.hostname}/settings`}, {
                        redirect: "manual",
                        method: "PATCH",
                        headers: { "CSRF-Protection": "true" },
                        body: new URLSearchParams({ sidebarWidth: this.closest('[key="main"]').querySelector('[key~="sidebar"]').style.getPropertyValue("--width").slice(0, -"px".length) }),
                      });
                    });
                  `}"
                ></div>
              </div>
              <div
                key="courseConversation /courses/${request.state.course
                  .externalId}/conversations/${request.state.courseConversation
                  .externalId}"
                css="${css`
                  flex: 1;
                `}"
              >
                courseConversation
              </div>
            </div>
          </body>
        </html>
      `);
    },
  });
};
