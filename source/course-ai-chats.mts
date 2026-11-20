import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./application.mjs";

export type ApplicationCourseAIChats = {
  types: {
    states: {
      CourseAIChat: Application["types"]["states"]["Course"] & {
        courseAIChat: {
          id: number;
          publicId: string;
          pinned: number;
          title: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  const courseAIChatsLayout = async ({
    request,
    response,
    head,
    body,
  }: {
    request: serverTypes.Request<
      {},
      {},
      {},
      {},
      Application["types"]["states"]["CourseAIChat"]
    >;
    response: serverTypes.Response;
    head: HTML;
    body: HTML;
  }): Promise<HTML> => {
    if (
      request.state.user === undefined ||
      request.state.userSession === undefined ||
      request.state.course === undefined ||
      request.state.courseParticipation === undefined
    )
      throw new Error();
    const course = request.state.course;
    const timeZone = request.state.userSession.timeZone;
    const groups = new Map<
      string,
      {
        id: number;
        publicId: string;
        title: string;
        createdAt: Temporal.ZonedDateTime;
      }[]
    >();
    const chats = application.database.all<{
      id: number;
      publicId: string;
      title: string;
      pinned: number;
    }>(
      sql`
        select "id", "publicId", "title", "pinned"
        from "courseAIChats"
        where
          "course" = ${course.id} and
          "courseParticipation" = ${request.state.courseParticipation.id}
        order by "id" desc;
      `,
    );
    const chatsWithFirstMessage = chats
      .map((chat) => {
        const firstMessage = application.database.get<{ createdAt: string }>(
          sql`
          select "createdAt"
          from "courseAIChatMessages"
          where "courseAIChat" = ${chat.id}
          order by "id" asc
          limit 1;
        `,
        );
        if (firstMessage === undefined)
          throw new Error("Course AI chat has no messages");
        return {
          chat,
          createdAt: Temporal.Instant.from(firstMessage.createdAt),
        };
      })
      .sort(
        (a, b) =>
          Temporal.Instant.compare(b.createdAt, a.createdAt) ||
          b.chat.id - a.chat.id,
      );
    for (const { chat, createdAt: instant } of chatsWithFirstMessage) {
      const createdAt = instant.toZonedDateTimeISO(timeZone);
      const group = Boolean(chat.pinned)
        ? "Pinned"
        : `${utilities.formatDate(createdAt.subtract({ days: createdAt.dayOfWeek - 1 }))} — ${utilities.formatDate(createdAt.add({ days: 7 - createdAt.dayOfWeek }))}`;
      const groupChats = groups.get(group) ?? [];
      groupChats.push({ ...chat, createdAt });
      groups.set(group, groupChats);
    }
    const orderedGroups = [
      ...(groups.has("Pinned") ? ["Pinned"] : []),
      ...[...groups.keys()].filter((group) => group !== "Pinned"),
    ];
    return application.layouts.twoColumns({
      request,
      response,
      head,
      sidebar: html`
        <div
          key="sidebar--menu"
          css="${css`
            border-bottom: var(--border-width--1) solid
              light-dark(var(--color--slate--200), var(--color--slate--800));
            padding: var(--size--2) var(--size--4);
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
        >
          <div
            css="${css`
              display: flex;
              gap: var(--size--2);
            `}"
          >
            $${
              course.courseState === "courseStateActive"
                ? html`
                    <a
                      href="/courses/${course.publicId}/ai/new"
                      class="button button--rectangle button--blue"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        display: flex;
                        align-items: center;
                      `}"
                      >New chat</a
                    >
                  `
                : html``
            }
            <input
              key="sidebar--menu--search"
              type="text"
              name="search"
              aria-label="Search chats"
              placeholder="Search…"
              maxlength="3000"
              class="input--text"
              css="${css`
                flex: 1;
                min-width: var(--size--0);
              `}"
            />
          </div>
          $${
            request.state.courseParticipation.courseParticipationRole ===
            "courseParticipationRoleInstructor"
              ? html`
                  <div
                    css="${css`
                      font-size: var(--font-size--3);
                      line-height: var(--font-size--3--line-height);
                      font-weight: 600;
                      color: light-dark(
                        var(--color--slate--600),
                        var(--color--slate--400)
                      );
                    `}"
                  >
                    <a
                      href="/courses/${course.publicId}/settings?section=courseAISources"
                      class="button button--rectangle button--transparent"
                      >Manage sources</a
                    >
                  </div>
                `
              : html``
          }
        </div>
        <div
          key="courseAIChats /courses/${course.publicId}"
          class="scroll"
          css="${css`
            flex: 1;
          `}"
        >
          $${orderedGroups.map((group, index) => {
            const groupChats = groups.get(group);
            if (groupChats === undefined) throw new Error();
            const current = groupChats.some(
              (chat) => chat.id === request.state.courseAIChat?.id,
            );
            return html`
              <details
                key="courseAIChats--group ${group}"
                $${index < 5 || current ? html`open` : html``}
              >
                <summary
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    font-weight: 600;
                    padding: var(--size--1-5) var(--size--4);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    cursor: pointer;
                    user-select: none;
                    transition-property: var(--transition-property--colors);
                    transition-duration: var(--transition-duration--150);
                    transition-timing-function: var(
                      --transition-timing-function--ease-in-out
                    );
                  `} ${
                    current
                      ? css`
                          color: var(--color--white);
                          background-color: var(--color--blue--500);
                          &:hover,
                          &:focus-within {
                            background-color: var(--color--blue--400);
                          }
                          &:active {
                            background-color: var(--color--blue--600);
                          }
                        `
                      : css`
                          color: light-dark(
                            var(--color--slate--500),
                            var(--color--slate--500)
                          );
                          background-color: light-dark(
                            var(--color--slate--100),
                            var(--color--slate--900)
                          );
                          &:hover,
                          &:focus-within {
                            background-color: light-dark(
                              var(--color--slate--200),
                              var(--color--slate--800)
                            );
                          }
                          &:active {
                            background-color: light-dark(
                              var(--color--slate--300),
                              var(--color--slate--700)
                            );
                          }
                        `
                  }"
                >
                  <div>
                    <span
                      aria-hidden="true"
                      css="${css`
                        display: inline-block;
                        transition-property: var(
                          --transition-property--transform
                        );
                        transition-duration: var(--transition-duration--150);
                        transition-timing-function: var(
                          --transition-timing-function--ease-in-out
                        );
                        [key~="courseAIChats--group"][open]
                          > summary
                          > div
                          > & {
                          rotate: var(--rotate--90);
                        }
                      `}"
                    >
                      <i class="bi bi-chevron-right"></i>
                    </span>
                    ${group}
                  </div>
                </summary>
                $${groupChats.map((chat) => {
                  const selected = chat.id === request.state.courseAIChat?.id;
                  return html`
                    <a
                      key="courseAIChat /courses/${course.publicId}/ai/${chat.publicId}"
                      href="/courses/${course.publicId}/ai/${chat.publicId}"
                      $${selected ? html`aria-current="page"` : html``}
                      css="${css`
                        padding: var(--size--2) var(--size--4);
                        border-bottom: var(--border-width--1) solid
                          light-dark(
                            var(--color--slate--200),
                            var(--color--slate--800)
                          );
                        display: block;
                        overflow-wrap: anywhere;
                        font-weight: 600;
                        cursor: pointer;
                        transition-property: var(--transition-property--colors);
                        transition-duration: var(--transition-duration--150);
                        transition-timing-function: var(
                          --transition-timing-function--ease-in-out
                        );
                        &:hover,
                        &:focus-visible {
                          background-color: light-dark(
                            var(--color--slate--100),
                            var(--color--slate--900)
                          );
                        }
                      `} ${
                        selected
                          ? css`
                              color: var(--color--white);
                              background-color: var(--color--blue--500);
                              &:hover,
                              &:focus-visible {
                                background-color: var(--color--blue--400);
                              }
                            `
                          : css``
                      }"
                      javascript="${javascript`
                        if (${request.liveConnection}) return;
                        if (!${selected}) delete this.scrolled;
                        else if (this.scrolled === undefined) {
                          this.closest("details").open = true;
                          this.scrollIntoView({ block: "nearest" });
                          this.scrolled = true;
                        }
                      `}"
                      >${chat.title}<span
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 400;
                        `} ${
                          selected
                            ? css`
                                color: light-dark(
                                  var(--color--blue--200),
                                  var(--color--blue--200)
                                );
                              `
                            : css`
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
                              `
                        }"
                        > ·
                        <time
                          datetime="${chat.createdAt.toInstant().toString()}"
                          javascript="${javascript`
                            javascript.popover({ element: this });
                          `}"
                          >${utilities.capitalize(
                            utilities.zonedDateTimeToRelativeTimeFormat(
                              chat.createdAt,
                            ),
                          )}</time
                        ><span type="popover"
                          >${utilities.formatDateTime(chat.createdAt)}</span
                        ></span
                      ></a
                    >
                  `;
                })}
              </details>
            `;
          })}
        </div>
      `,
      body: html`
        <div
          css="${css`
            flex: 1;
            min-width: var(--size--0);
            min-height: var(--size--0);
            display: flex;
            flex-direction: column;
          `}"
        >
          $${body}
        </div>
      `,
    });
  };

  const composer = ({
    course,
    courseAIChat,
  }: {
    course: Application["types"]["states"]["Course"]["course"];
    courseAIChat?: Application["types"]["states"]["CourseAIChat"]["courseAIChat"];
  }): HTML => {
    if (course.courseState === "courseStateArchived")
      return html`
        <div
          css="${css`
            padding: var(--size--4);
            font-size: var(--font-size--3);
            font-weight: 600;
            color: var(--color--red--500);
          `}"
        >
          <i class="bi bi-exclamation-triangle-fill"></i> This course is
          archived (read-only).
        </div>
      `;
    return html`
      <div
        css="${css`
          border-top: var(--border-width--1) solid
            light-dark(var(--color--slate--200), var(--color--slate--800));
        `}"
      >
        <div
          key="courseAIChatMessage--new"
          type="form"
          method="POST"
          action="/courses/${course.publicId}/ai${
            courseAIChat !== undefined
              ? `/${courseAIChat.publicId}/messages`
              : ""
          }"
          css="${css`
            max-width: var(--size--168);
            padding: var(--size--2) var(--size--4) var(--size--4);
            display: flex;
            align-items: flex-end;
            gap: var(--size--2);
          `}"
        >
          <textarea
            id="courseAIChatMessageContent"
            name="content"
            aria-label="Message Course AI"
            class="input--text"
            rows="3"
            required
            autofocus
            css="${css`
              flex: 1;
              min-width: var(--size--0);
              resize: vertical;
            `}"
          ></textarea>
          <div
            css="${css`
              font-size: var(--font-size--3);
              line-height: var(--font-size--3--line-height);
              font-weight: 600;
            `}"
          >
            <button type="submit" class="button button--rectangle button--blue">
              Send
            </button>
          </div>
        </div>
      </div>
    `;
  };

  application.webServer?.push({
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/ai(?:$|/)"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.courseParticipation === undefined
      )
        return;
      application.database.run(
        sql`
          update "courseParticipations"
          set "mostRecentlyVisitedMode" = ${"courseAI"}
          where "id" = ${request.state.courseParticipation.id};
        `,
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/ai$"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.courseParticipation === undefined ||
        request.liveConnection
      )
        return;
      response.redirect!(`/courses/${request.state.course.publicId}/ai/new`);
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/ai/new$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.userSession === undefined ||
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.courseParticipation === undefined
      )
        return;
      const course = request.state.course;
      response.send(
        await courseAIChatsLayout({
          request,
          response,
          head: html`<title>New chat · ${course.name} · Courselore</title>`,
          body: html`
            <div
              key="courseAIChat--new"
              css="${css`
                flex: 1;
                min-height: var(--size--0);
                display: flex;
                flex-direction: column;
              `}"
            >
              <div
                css="${css`
                  flex: 1;
                `}"
              ></div>
              $${composer({ course })}
            </div>
          `,
        }),
      );
    },
  });

  application.webServer?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/ai/(?<courseAIChatPublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseAIChatPublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseAIChat"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.courseAIChatPublicId !== "string" ||
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.courseParticipation === undefined
      )
        return;
      request.state.courseAIChat = application.database.get<{
        id: number;
        publicId: string;
        pinned: number;
        title: string;
      }>(
        sql`
          select "id", "publicId", "pinned", "title"
          from "courseAIChats"
          where
            "course" = ${request.state.course.id} and
            "courseParticipation" = ${request.state.courseParticipation.id} and
            "publicId" = ${request.pathname.courseAIChatPublicId};
        `,
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/ai/(?<courseAIChatPublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        { message: string },
        {},
        {},
        Application["types"]["states"]["CourseAIChat"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.userSession === undefined ||
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.courseParticipation === undefined ||
        request.state.courseAIChat === undefined
      )
        return;
      const course = request.state.course;
      const chat = request.state.courseAIChat;
      const user = request.state.user;
      const timeZone = request.state.userSession.timeZone;
      const messages = application.database.all<{
        publicId: string;
        role: string;
        createdAt: string;
        content: string;
      }>(
        sql`
          select "publicId", "role", "createdAt", "content"
          from "courseAIChatMessages"
          where "courseAIChat" = ${chat.id}
          order by "id" asc;
        `,
      );
      if (messages.length === 0)
        throw new Error("Course AI chat has no messages");
      response.send(
        await courseAIChatsLayout({
          request,
          response,
          head: html`<title>
            ${chat.title} · ${course.name} · Courselore
          </title>`,
          body: html`
            <div
              key="courseAIChat /courses/${course.publicId}/ai/${chat.publicId}"
              css="${css`
                flex: 1;
                min-height: var(--size--0);
                display: flex;
                flex-direction: column;
              `}"
            >
              <div
                css="${css`
                  border-bottom: var(--border-width--1) solid
                    light-dark(
                      var(--color--slate--200),
                      var(--color--slate--800)
                    );
                `}"
              >
                <details
                  key="courseAIChat--header /courses/${course.publicId}/ai/${chat.publicId}"
                  css="${css`
                    max-width: var(--size--168);
                    padding: var(--size--1) var(--size--2);
                  `}"
                >
                  <summary
                    class="button button--transparent"
                    css="${css`
                      padding: var(--size--1) var(--size--2);
                      list-style: none;
                      cursor: pointer;
                      display: flex;
                      align-items: baseline;
                      gap: var(--size--4);
                      &::-webkit-details-marker {
                        display: none;
                      }
                    `}"
                  >
                    <h1
                      css="${css`
                        flex: 1;
                        min-width: var(--size--0);
                        overflow-wrap: anywhere;
                        font-size: var(--font-size--4);
                        line-height: var(--font-size--4--line-height);
                        font-weight: 800;
                      `}"
                    >
                      ${chat.title}
                    </h1>
                    <i
                      class="bi bi-chevron-down"
                      css="${css`
                        transition-property: var(
                          --transition-property--transform
                        );
                        transition-duration: var(--transition-duration--150);
                        details[open] > summary > & {
                          rotate: var(--rotate--180);
                        }
                      `}"
                    ></i>
                  </summary>
                  <div
                    css="${css`
                      padding: var(--size--1) var(--size--2);
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--2);
                    `}"
                  >
                    <div
                      css="${css`
                        display: flex;
                        justify-content: space-between;
                        align-items: baseline;
                        gap: var(--size--4);
                      `}"
                    >
                      $${
                        course.courseState === "courseStateActive"
                          ? html`
                              <div
                                type="form"
                                method="PATCH"
                                action="/courses/${course.publicId}/ai/${chat.publicId}/pin"
                                css="${css`
                                  font-size: var(--font-size--3);
                                  line-height: var(--font-size--3--line-height);
                                  font-weight: 600;
                                  color: light-dark(
                                    var(--color--slate--600),
                                    var(--color--slate--400)
                                  );
                                `}"
                              >
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                              javascript.popover({ element: this, trigger: "click" });
                            `}"
                                >
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Pin:</span
                                  >  ${
                                    Boolean(chat.pinned) ? "Pinned" : "Unpinned"
                                  } <i class="bi bi-chevron-down"></i>
                                </button>
                                <div
                                  type="popover"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--2);
                                  `}"
                                >
                                  <button
                                    type="submit"
                                    name="pinned"
                                    value="false"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                  >
                                    Unpinned
                                  </button>
                                  <button
                                    type="submit"
                                    name="pinned"
                                    value="true"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                  >
                                    Pinned
                                  </button>
                                </div>
                              </div>
                            `
                          : Boolean(chat.pinned)
                            ? html`
                                <div
                                  css="${css`
                                    font-size: var(--font-size--3);
                                    line-height: var(
                                      --font-size--3--line-height
                                    );
                                    font-weight: 600;
                                    color: light-dark(
                                      var(--color--slate--600),
                                      var(--color--slate--400)
                                    );
                                  `}"
                                >
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Pin:</span
                                  >  Pinned
                                </div>
                              `
                            : html``
                      }
                      $${
                        course.courseState === "courseStateActive"
                          ? html`
                              <div>
                                <button
                                  type="button"
                                  aria-label="Chat options"
                                  class="button button--square button--icon button--transparent"
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--600),
                                      var(--color--slate--400)
                                    );
                                  `}"
                                  javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true, placement: "bottom-end" });
                                  `}"
                                >
                                  <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <div
                                  type="popover"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--2);
                                  `}"
                                >
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="popover"]').hidePopover();
                                        const form = this.closest('details').querySelector('[key~="courseAIChat--title--edit"]');
                                        form.hidden = false;
                                        form.querySelector('[name="title"]').focus();
                                        form.querySelector('[name="title"]').select();
                                      };
                                    `}"
                                  >
                                    Edit title
                                  </button>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                  >
                                    Delete chat
                                  </button>
                                </div>
                              </div>
                            `
                          : html``
                      }
                    </div>
                    $${
                      course.courseState === "courseStateActive"
                        ? html`
                            <div
                              key="courseAIChat--title--edit"
                              type="form"
                              method="PATCH"
                              action="/courses/${course.publicId}/ai/${chat.publicId}/title"
                              hidden
                              css="${css`
                                display: flex;
                                align-items: baseline;
                                gap: var(--size--2);
                              `}"
                              javascript="${javascript`
                                this.onsubmit = () => {
                                  this.hidden = true;
                                };
                              `}"
                            >
                              <input
                                type="text"
                                name="title"
                                aria-label="Chat title"
                                value="${chat.title}"
                                required
                                maxlength="2000"
                                class="input--text"
                                css="${css`
                                  flex: 1;
                                  min-width: var(--size--0);
                                `}"
                              />
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                css="${css`
                                  font-size: var(--font-size--3);
                                  line-height: var(--font-size--3--line-height);
                                  font-weight: 600;
                                  color: light-dark(
                                    var(--color--slate--600),
                                    var(--color--slate--400)
                                  );
                                `}"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    const form = this.closest('[type~="form"]');
                                    form.hidden = true;
                                    javascript.reset(form);
                                  };
                                `}"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                class="button button--rectangle button--blue"
                                css="${css`
                                  font-size: var(--font-size--3);
                                  line-height: var(--font-size--3--line-height);
                                `}"
                              >
                                Update
                              </button>
                            </div>
                          `
                        : html``
                    }
                  </div>
                </details>
              </div>
              <div
                key="courseAIChatMessages"
                class="scroll"
                css="${css`
                  flex: 1;
                  min-height: var(--size--0);
                  padding: var(--size--4);
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--3);
                  > article {
                    max-width: calc(var(--size--168) - var(--size--8));
                  }
                `}"
                javascript="${javascript`
                  if (this.hasScrolled !== true) {
                    const message = ${!request.liveConnection ? request.search.message : undefined};
                    const target = Array.from(this.querySelectorAll('[data-course-ai-chat-message]')).find((element) => element.getAttribute('data-course-ai-chat-message') === message);
                    if (target !== undefined) target.scrollIntoView({ block: "start" });
                    else this.scrollTop = this.scrollHeight;
                    this.hasScrolled = true;
                  }
                `}"
              >
                $${await Promise.all(
                  messages.map(async (message) => {
                    if (message.role !== "user" && message.role !== "assistant")
                      throw new Error("Invalid Course AI chat message role");
                    const createdAt = Temporal.Instant.from(
                      message.createdAt,
                    ).toZonedDateTimeISO(timeZone);
                    return html`
                      <article
                        key="courseAIChatMessage ${message.publicId}"
                        data-course-ai-chat-message="${message.publicId}"
                        css="${css`
                          display: flex;
                          gap: var(--size--2);
                        `}"
                      >
                        <div
                          css="${css`
                            flex-shrink: 0;
                          `}"
                        >
                          $${application.partials.userAvatar({
                            user: message.role === "user" ? user : "courseAI",
                            size: 9,
                          })}
                        </div>
                        <div
                          css="${css`
                            flex: 1;
                            min-width: var(--size--0);
                            display: flex;
                            flex-direction: column;
                            gap: var(--size--1);
                          `}"
                        >
                          <div
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              color: light-dark(
                                var(--color--slate--600),
                                var(--color--slate--400)
                              );
                              display: flex;
                              gap: var(--size--2);
                            `}"
                          >
                            <div
                              css="${css`
                                flex: 1;
                                min-width: var(--size--0);
                              `}"
                            >
                              <span
                                css="${css`
                                  font-weight: 600;
                                `}"
                                >${
                                  message.role === "user"
                                    ? user.name
                                    : "Course AI"
                                }</span
                              > ·
                              <time
                                datetime="${message.createdAt}"
                                javascript="${javascript`
                                  javascript.popover({ element: this });
                                `}"
                                >${utilities.capitalize(
                                  utilities.zonedDateTimeToRelativeTimeFormat(
                                    createdAt,
                                  ),
                                )}</time
                              ><span type="popover"
                                >${utilities.formatDateTime(createdAt)}</span
                              >
                            </div>
                            <div>
                              <button
                                type="button"
                                aria-label="Message options"
                                class="button button--square button--icon button--transparent"
                                css="${css`
                                  margin-right: var(--size---0-5);
                                `}"
                                javascript="${javascript`
                                  javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true, placement: "bottom-end" });
                                `}"
                              >
                                <i class="bi bi-three-dots-vertical"></i>
                              </button>
                              <div
                                type="popover"
                                css="${css`
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--size--2);
                                `}"
                              >
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                    const popover = javascript.popover({ element: this, trigger: "none" });
                                    this.onclick = async () => {
                                      await navigator.clipboard.writeText(${`https://${application.userConfiguration.hostname}/courses/${course.publicId}/ai/${chat.publicId}?${new URLSearchParams({ message: message.publicId }).toString()}`});
                                      popover.showPopover();
                                      await utilities.sleep(1000);
                                      popover.hidePopover();
                                    };
                                  `}"
                                >
                                  Copy permanent link
                                </button>
                                <div type="popover">Copied</div>
                                $${
                                  course.courseState === "courseStateActive"
                                    ? html`
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                        >
                                          Ask in Forum
                                        </button>
                                      `
                                    : html``
                                }
                              </div>
                            </div>
                          </div>
                          $${await application.partials.courseAIChatMessageContentProcessor(
                            {
                              content: message.content,
                              coursePublicId: course.publicId,
                              courseAIChatPublicId: chat.publicId,
                              courseAIChatMessagePublicId: message.publicId,
                            },
                          )}
                        </div>
                      </article>
                    `;
                  }),
                )}
              </div>
              $${composer({ course, courseAIChat: chat })}
            </div>
          `,
        }),
      );
    },
  });

  application.webServer?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/ai/(?<courseAIChatPublicId>[0-9]+)/title$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        { title: string },
        Application["types"]["states"]["CourseAIChat"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseAIChat === undefined
      )
        return;
      if (
        typeof request.body.title !== "string" ||
        request.body.title.trim() === "" ||
        request.body.title.length > 2000
      )
        throw "validation";
      const embeddingResponse = await fetch(
        "http://localhost:19000/vector-embedding",
        {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: request.body.title }),
        },
      );
      if (!embeddingResponse.ok)
        throw new Error(
          `Course AI title embedding failed: ${embeddingResponse.status}`,
        );
      const titleSemanticSearch = await embeddingResponse.text();
      application.database.run(
        sql`
          update "courseAIChats"
          set
            "title" = ${request.body.title},
            "titleLexicalSearch" = ${utilities
              .tokenize(request.body.title, {
                stopWords: application.applicationConfiguration.stopWords,
                stem: (token) => natural.PorterStemmer.stem(token),
              })
              .map((tokenWithPosition) => tokenWithPosition.token)
              .join(" ")},
            "titleSemanticSearch" = vec_f32(${titleSemanticSearch})
          where
            "id" = ${request.state.courseAIChat.id} and
            "course" = ${request.state.course.id} and
            "courseParticipation" = ${request.state.courseParticipation.id};
        `,
      );
      response.redirect!(
        `/courses/${request.state.course.publicId}/ai/${request.state.courseAIChat.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/ai(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/ai/(?<courseAIChatPublicId>[0-9]+)/pin$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { pinned: "true" | "false" },
        Application["types"]["states"]["CourseAIChat"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        !Boolean(request.state.course.courseAIEnabled) ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseAIChat === undefined
      )
        return;
      if (request.body.pinned !== "true" && request.body.pinned !== "false")
        throw "validation";
      application.database.run(
        sql`
          update "courseAIChats"
          set "pinned" = ${Number(request.body.pinned === "true")}
          where
            "id" = ${request.state.courseAIChat.id} and
            "course" = ${request.state.course.id} and
            "courseParticipation" = ${request.state.courseParticipation.id};
        `,
      );
      response.redirect!(
        `/courses/${request.state.course.publicId}/ai/${request.state.courseAIChat.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/ai(?:$|/)`,
          }),
        });
    },
  });
};
