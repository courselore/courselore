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
          padding: var(--space--1) var(--space--2);
          cursor: pointer;
          transition-property: var(--transition-property--colors);
          transition-duration: var(--transition-duration--150);
          transition-timing-function: var(
            --transition-timing-function--ease-in-out
          );
          &.button--transparent {
            margin: var(--space---1) var(--space---2);
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
              style="background-color: var(--color--${request.state
                .courseParticipation.accentColor}--500);"
              css="${css`
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
                gap: var(--space--4);
              `}"
            >
              <a
                key="logo"
                href="https://${application.configuration.hostname}"
                class="button button--transparent"
                css="${css`
                  display: flex;
                  gap: var(--space--1);
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
                  min-width: 0;
                `}"
              >
                <button
                  class="button button--transparent"
                  css="${css`
                    max-width: 100%;
                    display: flex;
                    gap: var(--space--1);
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
              <button key="user" class="button button--transparent">LF</button>
            </div>
            <div
              key="main"
              css="${css`
                flex: 1;
                display: flex;
              `}"
            >
              <div
                key="courseConversations /courses/${request.state.course
                  .externalId}"
                style="width: ${String(request.state.user.sidebarWidth)}px;"
                css="${css`
                  border-right: var(--border-width--1) solid
                    light-dark(
                      var(--color--slate--200),
                      var(--color--slate--800)
                    );
                `}"
              >
                courseConversations
              </div>
              <div
                key="separator"
                css="${css`
                  position: relative;
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
                    this.onmousedown = (event) => {
                      if (event.button !== 0) return;
                      this.classList.add("active");
                      document.querySelector("body").classList.add("noninteractive");
                      document.querySelector("body").style.cursor = "col-resize";
                      document.onmousemove = (event) => {
                        this.closest('[key="main"]').querySelector('[key~="courseConversations"]').style.width = String(Math.min(Math.max(event.clientX, 60 * 4), 112 * 4)) + "px";
                      };
                      document.onmouseup = () => {
                        this.classList.remove("active");
                        document.querySelector("body").classList.remove("noninteractive");
                        document.querySelector("body").style.cursor = "";
                        document.onmousemove = undefined;
                        updateSidebarWidth();
                      };
                    };
                    this.ondblclick = (event) => {
                      this.closest('[key="main"]').querySelector('[key~="courseConversations"]').style.width = String(80 * 4) +"px";
                      updateSidebarWidth();
                    };
                    const updateSidebarWidth = utilities.foregroundJob(async () => {
                      await fetch(${`https://${application.configuration.hostname}/settings`}, {
                        redirect: "manual",
                        method: "PATCH",
                        headers: { "CSRF-Protection": "true" },
                        body: new URLSearchParams({ sidebarWidth: this.closest('[key="main"]').querySelector('[key~="courseConversations"]').style.width.slice(0, -"px".length) }),
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
