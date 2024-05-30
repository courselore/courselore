import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  // TODO
  application.server?.push({
    method: "GET",
    pathname: "/",
    handler: (
      request: serverTypes.Request<
        { courseId: string; conversationId: string },
        { message: string },
        {},
        {},
        {}
      >,
      response,
    ) => {
      const course = application.database.get<{
        id: number;
        externalId: number;
      }>(
        sql`
          select "id", "externalId" from "courses" limit 1;
        `,
      )!;
      const conversation = application.database.get<{
        externalId: number;
      }>(
        sql`
          select "externalId" from "courseConversations" where "course" = ${course.id};
        `,
      )!;
      response.redirect(
        `/courses/${course.externalId}/conversations/${conversation.externalId}`,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<conversationId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        { courseId: string; conversationId: string },
        { message: string },
        {},
        {},
        {}
      >,
      response,
    ) => {
      const user = application.database.get<{ id: number; name: string }>(
        sql`
          select "id", "name" from "users" where "id" = ${1};
        `,
      );
      if (user === undefined) return;
      const course = application.database.get<{
        id: number;
        externalId: string;
        name: string;
      }>(
        sql`
          select "id", "externalId", "name" from "courses" where "externalId" = ${request.pathname.courseId};
        `,
      );
      if (course === undefined) return;
      const courseParticipation = application.database.get<{
        accentColor: string;
      }>(
        sql`
          select "accentColor" from "courseParticipations" where "user" = ${user.id} and "course" = ${course.id};
        `,
      );
      if (courseParticipation === undefined) return;
      const courseConversation = application.database.get<{
        id: number;
        externalId: string;
      }>(
        sql`
          select "id", "externalId" from "courseConversations" where "course" = ${course.id} and "externalId" = ${request.pathname.conversationId}
        `,
      );
      if (courseConversation === undefined) return;
      response.end(html`
        <!doctype html>
        <html style="color-scheme: light dark;">
          <head>
            <title>Courselore</title>
            <meta
              name="description"
              content="Communication Platform for Education"
            />
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
              background-color: light-dark(
                var(--color--white),
                var(--color--black)
              );
              color: light-dark(
                var(--color--slate--800),
                var(--color--slate--200)
              );
            `}"
            javascript="${javascript`
              javascript.liveConnection(${request.id}, { reload: ${application.configuration.environment === "development"} });
            `}"
          >
            <div
              css="${css`
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
              `}"
            >
              <div
                key="accentColor"
                style="background-color: light-dark(var(--color--${courseParticipation.accentColor}--500), var(--color--${courseParticipation.accentColor}--700));"
                css="${css`
                  height: var(--space--1);
                `}"
              ></div>
              <div
                key="header"
                css="${css`
                  padding: var(--space--2) var(--space--4);
                  border-bottom: var(--border-width--1) solid
                    light-dark(
                      var(--color--slate--200),
                      var(--color--slate--800)
                    );
                  display: flex;
                  gap: var(--space--4);
                `}"
              >
                <a
                  key="logo"
                  href="${new URL("/", request.URL).href}"
                  class="button"
                  css="${css`
                    font-weight: 700;
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
                  <div>Courselore</div>
                </a>
                <div
                  key="course"
                  css="${css`
                    flex: 1;
                    min-width: 0;
                  `}"
                >
                  <button
                    class="button"
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
                      ${course.name}
                    </div>
                    <i class="bi bi-chevron-down"></i>
                  </button>
                </div>
                <button key="user" class="button">LF</button>
              </div>
              <div
                key="main"
                css="${css`
                  flex: 1;
                  display: flex;
                `}"
              >
                <div
                  key="courseConversations /courses/${course.externalId}"
                  style="width: 320px;"
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
                <div key="separator">
                  <div
                    css="${css`
                      width: var(--border-width--4);
                      height: 100%;
                      position: absolute;
                      transform: translateX(-50%);
                      cursor: col-resize;
                      transition-property: var(--transition-property--colors);
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--ease-in-out
                      );
                      &:hover {
                        background-color: light-dark(
                          var(--color--blue--500),
                          var(--color--blue--500)
                        );
                      }
                    `}"
                    javascript="${javascript`
                      this.onmousedown = (event) => {
                        if (event.button !== 0) return;
                        document.onmousemove = (event) => {
                          const element = this.closest('[key="main"]').querySelector('[key~="courseConversations"]');
                          element.style.width = String(Number(element.style.width.slice(0, -"px".length)) + event.movementX) + "px";
                        };
                        document.onmouseup = () => {
                          document.onmousemove = undefined;
                        };
                      };
                      this.ondblclick = (event) => {
                        const element = this.closest('[key="main"]').querySelector('[key~="courseConversations"]');
                        element.style.width = "320px";
                      };
                    `}"
                  ></div>
                </div>
                <div
                  key="courseConversation /courses/${course.externalId}/conversations/${courseConversation.externalId}"
                  css="${css`
                    flex: 1;
                  `}"
                >
                  courseConversation
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
    },
  });
};
