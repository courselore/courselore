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
      courseConversationType:
        | "courseConversationNote"
        | "courseConversationQuestion";
      questionResolved: number;
      courseConversationParticipations:
        | "courseStudent"
        | "courseStaff"
        | "courseConversationParticipations";
      pinned: number;
      title: string;
      titleSearch: string;
    };
    courseConversationTaggings: Set<number>;
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
        request.state.courseParticipation === undefined ||
        request.state.courseConversationTags === undefined
      )
        return;
      request.state.courseConversation = application.database.get<{
        id: number;
        externalId: string;
        courseConversationType:
          | "courseConversationNote"
          | "courseConversationQuestion";
        questionResolved: number;
        courseConversationParticipations:
          | "courseStudent"
          | "courseStaff"
          | "courseConversationParticipations";
        pinned: number;
        title: string;
        titleSearch: string;
      }>(
        sql`
          select 
            "id",
            "externalId",
            "courseConversationType",
            "questionResolved",
            "courseConversationParticipations",
            "pinned",
            "title",
            "titleSearch"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "externalId" = ${request.pathname.courseConversationId}
        `,
      );
      if (request.state.courseConversation === undefined) return;
      request.state.courseConversationTaggings = new Set(
        application.database
          .all<{
            id: number;
          }>(
            sql`
              select "id"
              from "courseConversationTaggings"
              where
                "courseConversation" = ${request.state.courseConversation.id} and
                "courseConversationTag" in ${request.state.courseConversationTags.map((courseConversationTag) => courseConversationTag.id)};
            `,
          )
          .map((courseConversationTagging) => courseConversationTagging.id),
      );
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
        request.state.courseConversationTags === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationTaggings === undefined
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

        .text--secondary {
          font-size: var(--font-size--3);
          line-height: var(--font-size--3--line-height);
          font-weight: 500;
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
                color: light-dark(
                  var(--color--${color}--50),
                  var(--color--${color}--950)
                );
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
              &[data-theme~="error"] {
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
              key="courseParticipationColor ${request.state.courseParticipation
                .color}"
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
                  line-height: var(--space--0);
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
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <path
                    d="M 3 3 L 9 9 L 3 9 L 9 3 L 3 15 L 9 21 L 9 15 L 3 21 L 15 15 L 21 21 L 21 15 L 15 21 L 21 9 L 15 3 L 21 3 L 15 9 Z"
                    fill="none"
                    stroke="currentColor"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <div
                  css="${css`
                    font-weight: 700;
                    font-size: var(--font-size--4);
                    line-height: var(--font-size--4--line-height);
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
                  key="user--avatar"
                  style="
                    --color--light: var(--color--${request.state.user
                    .color}--800);
                    --color--dark: var(--color--${request.state.user
                    .color}--200);
                    --background-color--light: var(--color--${request.state.user
                    .color}--200);
                    --background-color--dark: var(--color--${request.state.user
                    .color}--800);
                    --border-color--light: var(--color--${request.state.user
                    .color}--300);
                    --border-color--dark: var(--color--${request.state.user
                    .color}--900);
                  "
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--space--0);
                    letter-spacing: var(--letter-spacing--1);
                    font-weight: 800;
                    color: light-dark(var(--color--light), var(--color--dark));
                    background-color: light-dark(
                      var(--background-color--light),
                      var(--background-color--dark)
                    );
                    width: var(--space--6);
                    height: var(--space--6);
                    border: var(--border-width--1) solid
                      light-dark(
                        var(--border-color--light),
                        var(--border-color--dark)
                      );
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
                  key="sidebar--menu"
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
                    key="new-conversation"
                    href="https://${application.configuration
                      .hostname}/courses/${request.state.course
                      .externalId}/conversations/new"
                    class="button button--square button--blue"
                    css="${css`
                      font-size: var(--font-size--7-5);
                      line-height: var(--space--0);
                      font-weight: 700;
                      height: 100%;
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
                    class="input--text"
                    css="${css`
                      flex: 1;
                      min-width: var(--space--0);
                      padding: var(--space--0);
                      display: flex;
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
                      key="search"
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
                      key="filter"
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
                    "Pinned",
                    "This week",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                    "2024-04-03 — 2024-04-14",
                  ].map(
                    (label, index) => html`
                      <details key="courseConversationsGroup ${label}">
                        <summary
                          class="text--secondary"
                          css="${css`
                            background-color: light-dark(
                              var(--color--slate--50),
                              var(--color--slate--950)
                            );
                            padding: var(--space--1-5) var(--space--4);
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
                                var(--color--slate--900)
                              );
                            }
                            &:active {
                              background-color: light-dark(
                                var(--color--slate--200),
                                var(--color--slate--800)
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
                            ${label}
                          </div>
                          <div
                            key="unread"
                            css="${css`
                              background-color: light-dark(
                                var(--color--blue--500),
                                var(--color--blue--500)
                              );
                              width: var(--space--1-5);
                              height: var(--space--1-5);
                              border-radius: var(--border-radius--circle);
                              transition-property: var(
                                --transition-property--opacity
                              );
                              transition-duration: var(
                                --transition-duration--150
                              );
                              transition-timing-function: var(
                                --transition-timing-function--ease-in-out
                              );
                            `} ${index % 3 === 0 || index % 5 === 0
                              ? css`
                                  opacity: var(--opacity--0);
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
                            (value, index) => html`
                              <a
                                key="courseConversation /courses/${request.state
                                  .course!.externalId}/conversations/${String(
                                  index,
                                )}"
                                href="https://${application.configuration
                                  .hostname}/courses/${request.state.course!
                                  .externalId}/conversations/${String(index)}"
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
                                      var(--color--slate--50),
                                      var(--color--slate--950)
                                    );
                                  }
                                  &:active {
                                    background-color: light-dark(
                                      var(--color--slate--100),
                                      var(--color--slate--900)
                                    );
                                  }
                                `}"
                              >
                                <div key="courseConversation--user">
                                  <div
                                    key="user--avatar"
                                    style="
                                      --color--light: var(--color--pink--800);
                                      --color--dark: var(--color--pink--200);
                                      --background-color--light: var(--color--pink--200);
                                      --background-color--dark: var(--color--pink--800);
                                      --border-color--light: var(--color--pink--300);
                                      --border-color--dark: var(--color--pink--900);
                                    "
                                    css="${css`
                                      font-size: var(--font-size--3);
                                      line-height: var(--space--0);
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
                                      border: var(--border-width--1) solid
                                        light-dark(
                                          var(--border-color--light),
                                          var(--border-color--dark)
                                        );
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
                                  key="courseConversation--main"
                                  css="${css`
                                    flex: 1;
                                    min-width: var(--space--0);
                                    display: flex;
                                    flex-direction: column;
                                  `}"
                                >
                                  <div
                                    key="courseConversation--main--title"
                                    css="${css`
                                      font-weight: 600;
                                    `}"
                                  >
                                    Example of a conversation
                                  </div>
                                  <div
                                    key="courseConversation--main--details"
                                    class="text--secondary"
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
                                    key="courseConversation--main--excerpt"
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
                                  key="courseConversation--unread"
                                  css="${css`
                                    align-self: center;
                                  `}"
                                >
                                  <div
                                    key="unread"
                                    css="${css`
                                      background-color: light-dark(
                                        var(--color--blue--500),
                                        var(--color--blue--500)
                                      );
                                      width: var(--space--1-5);
                                      height: var(--space--1-5);
                                      border-radius: var(
                                        --border-radius--circle
                                      );
                                      transition-property: var(
                                        --transition-property--opacity
                                      );
                                      transition-duration: var(
                                        --transition-duration--150
                                      );
                                      transition-timing-function: var(
                                        --transition-timing-function--ease-in-out
                                      );
                                    `} ${index % 3 === 0 || index % 5 === 0
                                      ? css`
                                          opacity: var(--opacity--0);
                                        `
                                      : css``}"
                                  ></div>
                                </div>
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
                key="main--main--scrolling"
                css="${css`
                  flex: 1;
                  overflow: auto;
                `}"
              >
                <div
                  key="main--main"
                  css="${css`
                    max-width: var(--space--168);
                    @media (max-width: 899px) {
                      padding: var(--space--4);
                    }
                    @media (min-width: 900px) {
                      padding: var(--space--4) var(--space--4) var(--space--4)
                        var(--space--8);
                    }
                  `}"
                >
                  <div
                    key="courseConversation /courses/${request.state.course
                      .externalId}/conversations/${request.state
                      .courseConversation.externalId}"
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--4);
                    `}"
                  >
                    <div
                      key="courseConversation--heading"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div
                        css="${css`
                          display: flex;
                          gap: var(--space--4);
                        `}"
                      >
                        <div
                          key="courseConversation--heading--title"
                          css="${css`
                            flex: 1;
                            font-size: var(--font-size--4);
                            line-height: var(--font-size--4--line-height);
                            font-weight: 700;
                          `}"
                        >
                          ${request.state.courseConversation.title}
                        </div>
                        <div>
                          <button
                            key="courseConversation--heading--menu"
                            class="text--secondary button button--square button--icon button--transparent"
                            css="${css`
                              font-size: var(--font-size--4);
                              line-height: var(--space--0);
                              margin-top: var(--space--0);
                            `}"
                          >
                            <i class="bi bi-three-dots-vertical"></i>
                          </button>
                        </div>
                      </div>
                      <div
                        class="text--secondary"
                        css="${css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--4);
                          row-gap: var(--space--2);
                        `}"
                      >
                        <button
                          class="button button--rectangle button--transparent"
                        >
                          ${request.state.courseConversation
                            .courseConversationType === "courseConversationNote"
                            ? "Note"
                            : request.state.courseConversation
                                  .courseConversationType ===
                                "courseConversationQuestion"
                              ? "Question"
                              : (() => {
                                  throw new Error();
                                })()} <i class="bi bi-chevron-down"></i>
                        </button>
                        $${request.state.courseConversation
                          .courseConversationType ===
                        "courseConversationQuestion"
                          ? html`
                              <button
                                class="button button--rectangle button--transparent"
                              >
                                ${request.state.courseConversation
                                  .questionResolved === Number(true)
                                  ? "Resolved"
                                  : "Unresolved"} <i
                                  class="bi bi-chevron-down"
                                ></i>
                              </button>
                            `
                          : html``}
                        <button
                          class="button button--rectangle button--transparent"
                        >
                          ${request.state.courseConversation
                            .courseConversationParticipations ===
                          "courseStudent"
                            ? "Students"
                            : request.state.courseConversation
                                  .courseConversationParticipations ===
                                "courseStaff"
                              ? "Course staff"
                              : request.state.courseConversation
                                    .courseConversationParticipations ===
                                  "courseConversationParticipations"
                                ? "Selected people"
                                : (() => {
                                    throw new Error();
                                  })()} <i class="bi bi-chevron-down"></i>
                        </button>
                        <button
                          class="button button--rectangle button--transparent"
                        >
                          ${request.state.courseConversation.pinned ===
                          Number(true)
                            ? "Pinned"
                            : "Unpinned"} <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>
                      <div
                        class="text--secondary"
                        css="${css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--4);
                          row-gap: var(--space--2);
                        `}"
                      >
                        <button
                          class="button button--rectangle button--transparent"
                        >
                          Tags <i class="bi bi-chevron-down"></i>
                        </button>
                        $${request.state.courseConversationTags.map(
                          (courseConversationTag) =>
                            request.state.courseConversationTaggings!.has(
                              courseConversationTag.id,
                            )
                              ? html`
                                  <div
                                    key="courseConversationTag ${courseConversationTag.externalId}"
                                  >
                                    ${courseConversationTag.name}
                                  </div>
                                `
                              : html``,
                        )}
                      </div>
                    </div>
                    <div key="courseConversation--messages">
                      Toffee gummies dragée tootsie roll biscuit. Icing carrot
                      cake donut wafer jelly beans pudding danish cotton candy.
                      Gummies icing marzipan donut macaroon wafer. Toffee sesame
                      snaps oat cake cake gingerbread cheesecake chupa chups.
                      Biscuit danish marzipan halvah bonbon gummies tootsie
                      roll. Bear claw chocolate lollipop chocolate bar pudding
                      carrot cake danish muffin. Sugar plum gingerbread chupa
                      chups chocolate cake chocolate cake icing tart donut
                      danish. Halvah muffin cake tart pastry. Caramels topping
                      croissant chocolate muffin chupa chups tiramisu tart chupa
                      chups. Cupcake soufflé wafer halvah liquorice cotton
                      candy. Cotton candy danish soufflé sweet tootsie roll bear
                      claw jelly danish pie. Liquorice liquorice soufflé muffin
                      dragée cotton candy pie jelly beans topping. Gingerbread
                      jujubes carrot cake tootsie roll shortbread cookie. Carrot
                      cake bonbon cookie icing tootsie roll biscuit shortbread.
                      Marzipan croissant candy canes tart jelly-o. Cookie
                      lollipop macaroon marzipan fruitcake bear claw candy gummi
                      bears marshmallow. Tootsie roll wafer gummi bears sweet
                      dragée. Danish brownie ice cream toffee donut gummi bears
                      marzipan. Donut jujubes cake jelly tootsie roll pudding
                      cupcake biscuit fruitcake. Chocolate cake jelly beans
                      powder cotton candy croissant. Sweet roll lollipop tootsie
                      roll jelly wafer oat cake pastry wafer. Chocolate cake
                      icing chupa chups halvah soufflé cake halvah danish.
                      Cupcake tootsie roll bonbon cheesecake bonbon. Candy canes
                      powder bear claw toffee bonbon chupa chups. Chocolate cake
                      chocolate bar dessert jujubes topping chocolate bar
                      pudding. Fruitcake tootsie roll gummi bears donut tart.
                      Lollipop shortbread lemon drops liquorice sugar plum
                      brownie cake tart. Dessert danish croissant halvah jelly
                      beans topping shortbread. Chocolate tootsie roll jelly-o
                      pie topping bonbon toffee jelly-o. Dessert sugar plum
                      cheesecake toffee candy canes. Pastry chocolate brownie
                      muffin sweet roll chocolate gummi bears ice cream. Pastry
                      lemon drops caramels sesame snaps danish. Icing croissant
                      dessert caramels toffee oat cake candy canes tart. Tart
                      muffin candy canes oat cake chocolate cake fruitcake oat
                      cake gingerbread. Wafer chocolate brownie donut wafer
                      croissant muffin. Carrot cake lemon drops powder tiramisu
                      bear claw. Pudding lollipop pastry biscuit cake wafer
                      macaroon sugar plum. Dragée soufflé cake muffin tootsie
                      roll chocolate cake chocolate bar. Sweet roll liquorice
                      oat cake fruitcake oat cake muffin caramels. Croissant
                      lemon drops brownie gingerbread donut tootsie roll
                      lollipop tiramisu pudding. Liquorice marzipan cake lemon
                      drops icing carrot cake tart. Icing chocolate bar ice
                      cream powder fruitcake gingerbread croissant shortbread
                      biscuit. Pie soufflé marshmallow brownie brownie danish
                      ice cream liquorice chupa chups. Lollipop topping soufflé
                      tootsie roll tootsie roll fruitcake. Pastry carrot cake
                      cake sweet roll jelly beans cake soufflé. Tiramisu gummies
                      lollipop halvah tart wafer pastry. Macaroon carrot cake
                      ice cream croissant toffee fruitcake. Donut gingerbread
                      cookie bear claw donut gummi bears lollipop topping. Candy
                      canes wafer pastry sesame snaps apple pie cookie. Cupcake
                      biscuit halvah pudding dessert oat cake tootsie roll.
                      Candy soufflé marzipan candy canes muffin dragée.
                      Shortbread cupcake cotton candy bear claw sweet roll
                      cupcake. Marzipan lollipop topping jelly beans bear claw.
                      Bonbon jelly topping powder soufflé. Fruitcake sweet roll
                      cookie muffin cake tiramisu halvah carrot cake caramels.
                      Pie pudding jujubes gummies tiramisu jujubes marshmallow.
                      Chupa chups biscuit lemon drops caramels cheesecake
                      macaroon. Gummi bears danish dragée jelly sugar plum tart
                      oat cake. Sugar plum bonbon cake dessert oat cake powder
                      marzipan croissant gummi bears. Donut marzipan jelly beans
                      chocolate biscuit sugar plum cake tootsie roll. Gummi
                      bears topping jujubes chupa chups jelly-o chupa chups
                      dessert.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
    },
  });
};
