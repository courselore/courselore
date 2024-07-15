import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationCourseConversation = {
  types: {
    states: {
      CourseConversation: Application["types"]["states"]["Course"] & {
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
          courseConversationMessagesNextExternalId: number;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
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
        Application["types"]["states"]["CourseConversation"]
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
        courseConversationMessagesNextExternalId: number;
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
            "titleSearch",
            "courseConversationMessagesNextExternalId"
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
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationTags === undefined ||
        request.state.courseConversation === undefined
      )
        return;

      response.end(
        application.layouts.main({
          request,
          response,
          head: html`
            <title>
              ${request.state.courseConversation.title} · Courselore
            </title>
          `,
          hamburger: true,
          body: html`
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
                    transform: translateX(-101%);
                    transition-property: var(--transition-property--transform);
                    transition-duration: var(--transition-duration--200);
                    transition-timing-function: var(
                      --transition-timing-function--ease-in-out
                    );
                    [key="main"].sidebar--open & {
                      transform: translateX(0%);
                      box-shadow: var(--box-shadow--25);
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
                      name="conversations.search"
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
                            this.closest('[key="search-and-filter"]').querySelector('[name="conversations.search"]').focus();
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
                            display: flex;
                            gap: var(--space--2);
                            align-items: center;
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
                                  gap: var(--space--2);
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
                                      display: flex;
                                      align-items: baseline;
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <div
                                      key="courseConversation--main--title--title"
                                      css="${css`
                                        flex: 1;
                                        font-weight: 600;
                                      `}"
                                    >
                                      Example of a conversation
                                    </div>
                                    <div
                                      key="courseConversation--main--title--id"
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        color: light-dark(
                                          var(--color--slate--400),
                                          var(--color--slate--600)
                                        );
                                      `}"
                                    >
                                      #${String(
                                        1 + Math.floor(Math.random() * 100),
                                      )}
                                    </div>
                                  </div>
                                  <div
                                    key="courseConversation--main--details"
                                    class="text--secondary"
                                  >
                                    Abigail Wall<span
                                      css="${css`
                                        font-weight: 400;
                                      `}"
                                      > ·
                                      <span
                                        css="${css`
                                          display: inline-block;
                                        `}"
                                        >2024-03-02</span
                                      ></span
                                    >
                                    <br />
                                    $${Math.random() < 0.5
                                      ? html`<span
                                          css="${css`
                                            color: light-dark(
                                              var(--color--red--600),
                                              var(--color--red--400)
                                            );
                                          `}"
                                          >Question · Unresolved</span
                                        >`
                                      : Math.random() < 0.5
                                        ? html`Question`
                                        : html`Note`}<span
                                      css="${css`
                                        font-weight: 400;
                                      `}"
                                      > · Assignment 2 · Duplicate
                                      question</span
                                    >
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
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
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
                javascript="${javascript`
                    // TODO: If conversation page.
                    this.readIntersectionObserver?.disconnect();
                    this.readIntersectionObserver = new IntersectionObserver((entries) => {
                      for (const entry of entries) {
                        if (entry.intersectionRatio !== 1) continue;
                        readIntersectionObserverForegroundJobCourseConversationMessageIds.add(entry.target.courseConversationMessageId);
                        this.readIntersectionObserver.unobserve(entry.target);
                        setTimeout(() => {
                          entry.target.classList.remove("unread");
                        }, 1000);
                      }
                      readIntersectionObserverForegroundJob();
                    }, {
                      root: this,
                      threshold: 1,
                    });
                    const readIntersectionObserverForegroundJob = utilities.foregroundJob(async () => {
                      if (readIntersectionObserverForegroundJobCourseConversationMessageIds.size === 0) return;
                      const body = new URLSearchParams([...readIntersectionObserverForegroundJobCourseConversationMessageIds].map(courseConversationMessageId => ["courseConversationMessageIds[]", courseConversationMessageId]));
                      readIntersectionObserverForegroundJobCourseConversationMessageIds.clear();
                      await fetch(${`https://${application.configuration.hostname}/courses/${
                        request.state.course!.externalId
                      }/conversations/${
                        request.state.courseConversation!.externalId
                      }/messages/readings`}, {
                        method: "POST",
                        headers: { "CSRF-Protection": "true" },
                        body,
                      });
                    });
                    const readIntersectionObserverForegroundJobCourseConversationMessageIds = new Set();
                  `}"
              >
                <div
                  key="main--main"
                  css="${css`
                    max-width: var(--space--168);
                    @media (max-width: 899px) {
                      padding: var(--space--2) var(--space--4);
                    }
                    @media (min-width: 900px) {
                      padding: var(--space--3) var(--space--6);
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
                      gap: var(--space--6);
                    `}"
                  >
                    <div
                      key="courseConversation--header"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--1);
                      `}"
                    >
                      <div
                        css="${css`
                          display: flex;
                          gap: var(--space--4);
                        `}"
                      >
                        <div
                          key="courseConversation--header--title"
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
                            key="courseConversation--header--menu"
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
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div
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
                              .courseConversationType ===
                            "courseConversationNote"
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
                              application.database.get(
                                sql`
                                    select true
                                    from "courseConversationTaggings"
                                    where
                                      "courseConversation" = ${request.state.courseConversation!.id} and
                                      "courseConversationTag" = ${courseConversationTag.id};
                                  `,
                              ) !== undefined
                                ? html`
                                    <div
                                      key="courseConversationTag ${courseConversationTag.externalId}"
                                      css="${css`
                                        font-weight: 400;
                                      `}"
                                    >
                                      ${courseConversationTag.name}
                                    </div>
                                  `
                                : html``,
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      key="courseConversationMessages"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--6);
                      `}"
                    >
                      $${application.database
                        .all<{
                          id: number;
                          externalId: string;
                          createdAt: string;
                          updatedAt: string | null;
                          createdByCourseParticipation: number | null;
                          courseConversationMessageType:
                            | "courseConversationMessageMessage"
                            | "courseConversationMessageAnswer"
                            | "courseConversationMessageFollowUpQuestion"
                            | "courseConversationMessageCourseStaffWhisper";
                          anonymous: number;
                          contentSource: string;
                          contentPreprocessed: string;
                          contentSearch: string;
                        }>(
                          sql`
                              select
                                "id",
                                "externalId",
                                "createdAt",
                                "updatedAt",
                                "createdByCourseParticipation",
                                "courseConversationMessageType",
                                "anonymous",
                                "contentSource",
                                "contentPreprocessed",
                                "contentSearch"
                              from "courseConversationMessages"
                              where
                                "courseConversation" = ${request.state.courseConversation.id} $${
                                  request.state.courseParticipation
                                    .courseRole !== "courseStaff"
                                    ? sql`
                                        and
                                        "courseConversationMessageType" != 'courseConversationMessageCourseStaffWhisper'
                                      `
                                    : sql``
                                }
                              order by "id" asc;
                            `,
                        )
                        .map(
                          (courseConversationMessage) => html`
                            <div
                              key="courseConversationMessage /courses/${request
                                .state.course!
                                .externalId}/conversations/${request.state
                                .courseConversation!
                                .externalId}/messages/${courseConversationMessage.externalId}"
                              css="${css`
                                position: relative;
                                display: flex;
                                gap: var(--space--2);
                              `}"
                            >
                              $${(() => {
                                const unread =
                                  application.database.get(
                                    sql`
                                        select true
                                        from "courseConversationMessageViews"
                                        where
                                          "courseConversationMessage" = ${courseConversationMessage.id} and
                                          "courseParticipation" = ${request.state.courseParticipation!.id};
                                      `,
                                  ) === undefined;
                                return html`
                                  <div
                                    css="${css`
                                      position: absolute;
                                      margin-left: var(--space---2-5);
                                      margin-top: var(--space--4);
                                    `}"
                                  >
                                    <div
                                      key="unread"
                                      class="${unread ? "unread" : ""}"
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
                                        &:not(.unread) {
                                          opacity: var(--opacity--0);
                                        }
                                      `}"
                                      javascript="${javascript`
                                          if (${unread}) {
                                            this.closest('[key="main--main--scrolling"]').readIntersectionObserver.observe(this);
                                            this.courseConversationMessageId = ${courseConversationMessage.externalId};
                                          }
                                        `}"
                                    ></div>
                                  </div>
                                `;
                              })()}
                              <div key="courseConversationMessage--createdBy">
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
                                    font-size: var(--font-size--3-5);
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
                                    width: var(--space--9);
                                    height: var(--space--9);
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
                                key="courseConversationMessage--main"
                                css="${css`
                                  flex: 1;
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--1);
                                `}"
                              >
                                <div
                                  key="courseConversationMessage--header"
                                  class="text--secondary"
                                  css="${css`
                                    display: flex;
                                    gap: var(--space--2);
                                  `}"
                                >
                                  <div
                                    css="${css`
                                      flex: 1;
                                    `}"
                                  >
                                    <span
                                      css="${css`
                                        font-weight: 700;
                                      `}"
                                      >Abigail Wall</span
                                    ><span
                                      css="${css`
                                        font-weight: 400;
                                      `}"
                                      > ·
                                      <span
                                        css="${css`
                                          display: inline-block;
                                        `}"
                                        >2024-03-02</span
                                      > $${courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageMessage"
                                        ? html``
                                        : courseConversationMessage.courseConversationMessageType ===
                                            "courseConversationMessageAnswer"
                                          ? html`·
                                              <span
                                                css="${css`
                                                  font-weight: 700;
                                                  color: light-dark(
                                                    var(--color--green--500),
                                                    var(--color--green--500)
                                                  );
                                                `}"
                                                >Answer</span
                                              >`
                                          : courseConversationMessage.courseConversationMessageType ===
                                              "courseConversationMessageFollowUpQuestion"
                                            ? html`·
                                                <span
                                                  css="${css`
                                                    font-weight: 700;
                                                    color: light-dark(
                                                      var(--color--red--500),
                                                      var(--color--red--500)
                                                    );
                                                  `}"
                                                  >Follow-up question</span
                                                >`
                                            : courseConversationMessage.courseConversationMessageType ===
                                                "courseConversationMessageCourseStaffWhisper"
                                              ? html`·
                                                  <span
                                                    css="${css`
                                                      font-weight: 700;
                                                      color: light-dark(
                                                        var(--color--blue--500),
                                                        var(--color--blue--500)
                                                      );
                                                    `}"
                                                    >Course staff whisper</span
                                                  >`
                                              : (() => {
                                                  throw new Error();
                                                })()}</span
                                    >
                                  </div>
                                  <div>
                                    <button
                                      key="courseConversation--header--menu"
                                      class="button button--square button--icon button--transparent"
                                      css="${css`
                                        margin-right: var(--space---0-5);
                                      `}"
                                    >
                                      <i class="bi bi-three-dots-vertical"></i>
                                    </button>
                                  </div>
                                </div>
                                <div key="courseConversationMessage--content">
                                  ${courseConversationMessage.contentSource}
                                </div>
                                <div
                                  key="courseConversationMessage--footer"
                                  class="text--secondary"
                                >
                                  <button
                                    key="courseConversation--footer--like"
                                    class="button button--rectangle button--transparent"
                                  >
                                    <i class="bi bi-hand-thumbs-up"></i> Like
                                  </button>
                                </div>
                              </div>
                            </div>
                          `,
                        )}
                    </div>
                    <div key="courseConversationMessage/new">
                      <form
                        novalidate
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `}"
                      >
                        <div
                          key="contentEditor"
                          class="input--text"
                          css="${css`
                            padding: var(--space--0);
                            display: flex;
                            flex-direction: column;
                          `}"
                        >
                          <div
                            key="contentEditor--menu"
                            class="text--secondary"
                            css="${css`
                              font-size: var(--font-size--3-5);
                              line-height: var(--font-size--3-5--line-height);
                              padding: var(--space--1-5) var(--space--2);
                              border-bottom: var(--border-width--1) solid
                                light-dark(
                                  var(--color--slate--200),
                                  var(--color--slate--800)
                                );
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `}"
                          >
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Bold",
                                  });
                                `}"
                            >
                              <i class="bi bi-type-bold"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Link",
                                  });
                                `}"
                            >
                              <i class="bi bi-link"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Image",
                                  });
                                `}"
                            >
                              <i class="bi bi-image"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Code block",
                                  });
                                `}"
                            >
                              <i class="bi bi-code"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Mathematics block",
                                  });
                                `}"
                            >
                              <i class="bi bi-calculator"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Poll",
                                  });
                                `}"
                            >
                              <i class="bi bi-card-checklist"></i>
                            </button>
                            <div
                              css="${css`
                                flex: 1;
                              `}"
                            ></div>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Preview",
                                  });
                                `}"
                            >
                              <i class="bi bi-eyeglasses"></i>
                            </button>
                            <button
                              class="button button--square button--icon button--transparent"
                              javascript="${javascript`
                                  javascript.tippy({
                                    event,
                                    element: this,
                                    content: "Menu",
                                  });
                                `}"
                            >
                              <i class="bi bi-three-dots-vertical"></i>
                            </button>
                          </div>
                          <textarea
                            key="contentEditor--textarea"
                            css="${css`
                              font-family: "JetBrains Mono Variable",
                                var(--font-family--sans-serif);
                              height: var(--space--44);
                              padding: var(--space--1) var(--space--2);
                            `}"
                          ></textarea>
                        </div>
                        <div
                          class="text--secondary"
                          css="${css`
                            display: flex;
                            gap: var(--space--4);
                            align-items: baseline;
                          `}"
                        >
                          <button class="button button--rectangle button--blue">
                            Send
                          </button>
                          <label
                            class="button button--rectangle button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="anonymous"
                              class="input--checkbox"
                            />  Anonymous to other students
                          </label>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });
};
