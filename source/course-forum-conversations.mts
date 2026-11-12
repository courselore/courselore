import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./application.mjs";

export type ApplicationCourseForumConversations = {
  types: {
    states: {
      courseForumConversation: Application["types"]["states"]["Course"] & {
        courseForumConversation: {
          id: number;
          publicId: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationTypeQuestionResolved: number;
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          pinned: number;
          title: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  const courseForumConversationsLayout = async ({
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
      Application["types"]["states"]["courseForumConversation"]
    >;
    response: serverTypes.Response;
    head: HTML;
    body: HTML;
  }): Promise<HTML> => {
    if (
      request.state.userSession === undefined ||
      request.state.user === undefined ||
      request.state.course === undefined ||
      request.state.courseParticipation === undefined ||
      request.state.courseForumConversationsTags === undefined
    )
      throw new Error();
    return application.layouts.base({
      request,
      response,
      head,
      headerBefore: html`
        <button
          key="header--hamburger"
          type="button"
          class="button button--square button--icon button--transparent"
          css="${css`
            font-size: var(--font-size--5);
            line-height: var(--size--0);
            @media (min-width: 900px) {
              display: none;
            }
          `}"
          javascript="${javascript`
            this.onclick = () => {
              javascript.stateAdd(document.querySelector('[key~="main--two-column-layout"]'), "sidebar--open");
            };
          `}"
        >
          <i class="bi bi-list"></i>
        </button>
      `,
      body: html`
        <div
          key="main--two-column-layout"
          css="${css`
            width: 100%;
            height: 100%;
            display: flex;
          `}"
          javascript="${javascript`
            if (${!request.liveConnection}) this.removeAttribute("state");
          `}"
        >
          <div
            key="sidebar /courses/${request.state.course.publicId}"
            style="--width: ${String(request.state.user.sidebarWidth)}px;"
            css="${css`
              border-right: var(--border-width--1) solid
                light-dark(var(--color--slate--200), var(--color--slate--800));
              display: flex;
              flex-direction: column;
              @media (max-width: 899px) {
                background-color: light-dark(
                  var(--color--white),
                  var(--color--black)
                );
                max-width: var(--size--112);
                position: fixed;
                inset: var(--size--0) var(--size--14) var(--size--0)
                  var(--size--0);
                z-index: 100;
                transition-property: var(--transition-property--transform);
                transition-duration: var(--transition-duration--200);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                [key~="main--two-column-layout"]:not([state~="sidebar--open"])
                  & {
                  translate: -101%;
                }
                [key~="main--two-column-layout"][state~="sidebar--open"] & {
                  box-shadow: var(--box-shadow--25);
                }
              }
              @media (min-width: 900px) {
                width: var(--width);
              }
            `}"
          >
            <div
              key="sidebar--close"
              css="${css`
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                padding: var(--size--2) var(--size--4);
                display: flex;
                @media (min-width: 900px) {
                  display: none;
                }
              `}"
            >
              <button
                type="button"
                class="button button--square button--icon button--transparent"
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--size--0);
                `}"
                javascript="${javascript`
                  this.onclick = () => {
                    javascript.stateRemove(document.querySelector('[key~="main--two-column-layout"]'), "sidebar--open");
                  };
                `}"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div
              key="sidebar--menu"
              css="${css`
                border-bottom: var(--border-width--1) solid
                  light-dark(var(--color--slate--200), var(--color--slate--800));
                padding: var(--size--2) var(--size--4);
                display: flex;
                gap: var(--size--2);
              `}"
            >
              $${
                request.state.course.courseState === "courseStateActive"
                  ? html`
                      <a
                        key="sidebar--menu--new-conversation"
                        href="/courses/${
                          request.state.course.publicId
                        }/forum/new"
                        class="button button--rectangle button--blue"
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          display: flex;
                          align-items: center;
                        `}"
                      >
                        New
                        ${
                          request.state.courseParticipation
                            .courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                            ? "note"
                            : request.state.courseParticipation
                                  .courseParticipationRole ===
                                "courseParticipationRoleStudent"
                              ? "question"
                              : (() => {
                                  throw new Error();
                                })()
                        }
                      </a>
                    `
                  : html``
              }
              <div
                key="sidebar--menu--search"
                type="form"
                method="GET"
                action="/courses/${request.state.course.publicId}/search"
                css="${css`
                  flex: 1;
                  min-width: var(--size--0);
                  display: flex;
                `}"
                javascript="${javascript`
                  this.isModified = false;
                  const popover = javascript.popover({ element: this, trigger: "none", placement: "bottom-start" });
                  this.oninput = this.onfocusin = utilities.throttle(async () => {
                    if (this.querySelector('[name="search"]').value.trim() === "") {
                      popover.hidePopover();
                      return;
                    }
                    popover.showPopover();
                    javascript.mount(
                      popover.firstElementChild,
                      await (await fetch(this.getAttribute("action") + "?" + new URLSearchParams(javascript.serialize(this)))).text()
                    );
                    if (popover.matches('[state~="open"]')) popover.showPopover();
                  });
                  this.onfocusout = () => {
                    popover.hidePopover();
                  };
                `}"
              >
                <input
                  type="text"
                  name="search"
                  placeholder="Search…"
                  maxlength="3000"
                  class="input--text"
                  css="${css`
                    flex: 1;
                    min-width: var(--size--0);
                  `}"
                />
              </div>
              <div type="popover">
                <div
                  css="${css`
                    color: light-dark(
                      var(--color--slate--600),
                      var(--color--slate--400)
                    );
                    animation: var(--animation--pulse);
                  `}"
                >
                  <i class="bi bi-three-dots"></i>
                </div>
              </div>
            </div>
            <div
              key="courseForumConversations"
              class="scroll"
              css="${css`
                flex: 1;
              `}"
            >
              $${await (async () => {
                const courseForumConversationsGroups = Object.groupBy(
                  application.database
                    .all<{
                      id: number;
                      publicId: string;
                      courseForumConversationType:
                        | "courseForumConversationTypeNote"
                        | "courseForumConversationTypeQuestion";
                      courseForumConversationTypeQuestionResolved: number;
                      pinned: number;
                      title: string;
                    }>(
                      sql`
                      select
                        "id",
                        "publicId",
                        "courseForumConversationType",
                        "courseForumConversationTypeQuestionResolved",
                        "pinned",
                        "title"
                      from "courseForumConversations"
                      where
                        "course" = ${request.state.course!.id} and (
                          "courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                          ${
                            request.state.courseParticipation!
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                              ? sql`
                                  or
                                  "courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                                `
                              : sql``
                          }
                          or (
                            select true
                            from "courseForumConversationParticipations"
                            where
                              "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                              "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation!.id}
                          )
                        )
                      order by "id" desc;
                    `,
                    )
                    .map((courseForumConversation) => {
                      const firstcourseForumConversationMessage =
                        application.database.get<{
                          id: number;
                          publicId: string;
                          createdByCourseParticipation: number | null;
                          createdAt: string;
                          updatedAt: string | null;
                          courseForumConversationMessageAnonymity:
                            | "courseForumConversationMessageAnonymityNone"
                            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                            | "courseForumConversationMessageAnonymityEveryone";
                          content: string;
                          contentSentimentAnalysisType:
                            "positive" | "neutral" | "negative";
                          contentSentimentAnalysisIntensity: number;
                        }>(
                          sql`
                          select
                            "id",
                            "publicId",
                            "createdByCourseParticipation",
                            "createdAt",
                            "updatedAt",
                            "courseForumConversationMessageAnonymity",
                            "content",
                            "contentSentimentAnalysisType",
                            "contentSentimentAnalysisIntensity"
                          from "courseForumConversationMessages"
                          where "courseForumConversation" = ${courseForumConversation.id}
                          order by "id" asc
                          limit 1;
                        `,
                        );
                      if (firstcourseForumConversationMessage === undefined)
                        throw new Error();
                      const firstcourseForumConversationMessageAnonymous =
                        firstcourseForumConversationMessage.createdByCourseParticipation !==
                          request.state.courseParticipation!.id &&
                        ((firstcourseForumConversationMessage.courseForumConversationMessageAnonymity ===
                          "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
                          request.state.courseParticipation!
                            .courseParticipationRole ===
                            "courseParticipationRoleStudent") ||
                          firstcourseForumConversationMessage.courseForumConversationMessageAnonymity ===
                            "courseForumConversationMessageAnonymityEveryone");
                      const firstcourseForumConversationMessageCreatedByCourseParticipation =
                        typeof firstcourseForumConversationMessage.createdByCourseParticipation ===
                          "number" && !firstcourseForumConversationMessageAnonymous
                          ? application.database.get<{
                              user: number;
                              courseParticipationRole:
                                | "courseParticipationRoleInstructor"
                                | "courseParticipationRoleStudent";
                            }>(
                              sql`
                                select
                                  "user",
                                  "courseParticipationRole"
                                from "courseParticipations"
                                where "id" = ${firstcourseForumConversationMessage.createdByCourseParticipation};
                              `,
                            )
                          : undefined;
                      const firstcourseForumConversationMessageCreatedByCourseParticipationUser =
                        typeof firstcourseForumConversationMessageCreatedByCourseParticipation ===
                        "object"
                          ? application.database.get<{
                              id: number;
                              publicId: string;
                              name: string;
                              avatarColor:
                                | "red"
                                | "orange"
                                | "amber"
                                | "yellow"
                                | "lime"
                                | "green"
                                | "emerald"
                                | "teal"
                                | "cyan"
                                | "sky"
                                | "blue"
                                | "indigo"
                                | "violet"
                                | "purple"
                                | "fuchsia"
                                | "pink"
                                | "rose";
                              avatarImage: string | null;
                            }>(
                              sql`
                                select
                                  "id",
                                  "publicId",
                                  "name",
                                  "avatarColor",
                                  "avatarImage"
                                from "users"
                                where "id" = ${firstcourseForumConversationMessageCreatedByCourseParticipation.user};
                              `,
                            )
                          : undefined;
                      const courseForumConversationMessagesCount =
                        application.database.get<{ count: number }>(
                          sql`
                            select count(*) as "count"
                            from "courseForumConversationMessages"
                            where "courseForumConversation" = ${courseForumConversation.id};
                          `,
                        )!.count;
                      const includesUnviewedcourseForumConversationMessages =
                        (request.state.courseForumConversation === undefined ||
                          request.state.courseForumConversation.id !==
                            courseForumConversation.id) &&
                        application.database.get(
                          sql`
                            select true
                            from "courseForumConversationMessages"
                            left join "courseForumConversationMessageViews" on
                              "courseForumConversationMessages"."id" = "courseForumConversationMessageViews"."courseForumConversationMessage" and
                              "courseForumConversationMessageViews"."courseParticipation" = ${request.state.courseParticipation!.id}
                            where
                              "courseForumConversationMessages"."courseForumConversation" = ${courseForumConversation.id} ${
                                request.state.courseParticipation!
                                  .courseParticipationRole !==
                                "courseParticipationRoleInstructor"
                                  ? sql`
                                      and
                                      "courseForumConversationMessages"."courseForumConversationMessageVisibility" != 'courseForumConversationMessageVisibilityCourseParticipationRoleInstructors'
                                    `
                                  : sql``
                              } and
                              "courseForumConversationMessageViews"."id" is null
                            limit 1;
                          `,
                        ) !== undefined;
                      return {
                        ...courseForumConversation,
                        firstcourseForumConversationMessage,
                        firstcourseForumConversationMessageAnonymous,
                        firstcourseForumConversationMessageCreatedByCourseParticipation,
                        firstcourseForumConversationMessageCreatedByCourseParticipationUser,
                        courseForumConversationMessagesCount,
                        includesUnviewedcourseForumConversationMessages,
                      };
                    }),
                  (courseForumConversation) => {
                    const courseForumConversationFirstcourseForumConversationMessageCreatedAt =
                      Temporal.Instant.from(
                        courseForumConversation.firstcourseForumConversationMessage
                          .createdAt,
                      ).toZonedDateTimeISO(request.state.userSession!.timeZone);
                    return Boolean(courseForumConversation.pinned)
                      ? "Pinned"
                      : `${utilities.formatDate(courseForumConversationFirstcourseForumConversationMessageCreatedAt.subtract({ days: courseForumConversationFirstcourseForumConversationMessageCreatedAt.dayOfWeek - 1 }))} — ${utilities.formatDate(courseForumConversationFirstcourseForumConversationMessageCreatedAt.add({ days: 7 - courseForumConversationFirstcourseForumConversationMessageCreatedAt.dayOfWeek }))}`;
                  },
                );
                const courseForumConversationsGroupsKeys = Object.keys(
                  courseForumConversationsGroups,
                );
                return html`
                  $${await Promise.all(
                    [
                      ...(courseForumConversationsGroupsKeys.includes("Pinned")
                        ? ["Pinned"]
                        : []),
                      ...courseForumConversationsGroupsKeys.filter(
                        (key) => key !== "Pinned",
                      ),
                    ].map(
                      async (
                        courseForumConversationsGroupKey,
                        courseForumConversationsGroupIndex,
                      ) => {
                        const courseForumConversations =
                          courseForumConversationsGroups[
                            courseForumConversationsGroupKey as any
                          ]!;
                        const courseForumConversationsCurrent =
                          courseForumConversations.some(
                            (courseForumConversation) =>
                              request.state.courseForumConversation !== undefined &&
                              request.state.courseForumConversation.id ===
                                courseForumConversation.id,
                          );
                        return html`
                          <details
                            key="courseForumConversations--group ${courseForumConversationsGroupKey}"
                            $${
                              (courseForumConversationsGroupKey === "Pinned" &&
                                courseForumConversations.some(
                                  (courseForumConversation) =>
                                    courseForumConversation.includesUnviewedcourseForumConversationMessages,
                                )) ||
                              (courseForumConversationsGroupKey !== "Pinned" &&
                                courseForumConversationsGroupIndex < 5) ||
                              courseForumConversationsCurrent
                                ? html`open`
                                : html``
                            }
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
                                transition-property: var(
                                  --transition-property--colors
                                );
                                transition-duration: var(
                                  --transition-duration--150
                                );
                                transition-timing-function: var(
                                  --transition-timing-function--ease-in-out
                                );
                              `} ${
                                !courseForumConversationsCurrent
                                  ? css`
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
                                  : css`
                                      color: light-dark(
                                        var(--color--white),
                                        var(--color--white)
                                      );
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
                                    `
                              }"
                            >
                              $${
                                !courseForumConversationsCurrent &&
                                courseForumConversations.some(
                                  (courseForumConversation) =>
                                    courseForumConversation.includesUnviewedcourseForumConversationMessages,
                                )
                                  ? html`
                                      <div
                                        css="${css`
                                          font-size: var(--size--1-5);
                                          color: light-dark(
                                            var(--color--blue--500),
                                            var(--color--blue--500)
                                          );
                                          position: absolute;
                                          translate: calc(
                                            -100% - var(--size--1)
                                          );
                                        `}"
                                      >
                                        <i class="bi bi-circle-fill"></i>
                                      </div>
                                    `
                                  : html``
                              }
                              <div>
                                <span
                                  css="${css`
                                    display: inline-block;
                                    transition-property: var(
                                      --transition-property--transform
                                    );
                                    transition-duration: var(
                                      --transition-duration--150
                                    );
                                    transition-timing-function: var(
                                      --transition-timing-function--ease-in-out
                                    );
                                    [key~="courseForumConversations--group"][open]
                                      > summary
                                      > div
                                      > & {
                                      rotate: var(--rotate--90);
                                    }
                                  `}"
                                >
                                  <i class="bi bi-chevron-right"></i>
                                </span>
                                ${courseForumConversationsGroupKey}
                              </div>
                            </summary>
                            $${await Promise.all(
                              courseForumConversations.map(
                                async (courseForumConversation) => {
                                  const courseForumConversationCurrent =
                                    request.state.courseForumConversation !==
                                      undefined &&
                                    request.state.courseForumConversation.id ===
                                      courseForumConversation.id;
                                  return html`
                                    <a
                                      key="courseForumConversation /courses/${
                                        request.state.course!.publicId
                                      }/forum/${courseForumConversation.publicId}"
                                      href="/courses/${
                                        request.state.course!.publicId
                                      }/forum/${courseForumConversation.publicId}"
                                      css="${css`
                                        padding: var(--size--2) var(--size--4);
                                        border-bottom: var(--border-width--1)
                                          solid
                                          light-dark(
                                            var(--color--slate--200),
                                            var(--color--slate--800)
                                          );
                                        display: flex;
                                        gap: var(--size--2);
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
                                      `} ${
                                        !courseForumConversationCurrent
                                          ? css`
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
                                            `
                                          : css`
                                              color: light-dark(
                                                var(--color--white),
                                                var(--color--white)
                                              );
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
                                            `
                                      }"
                                      javascript="${javascript`
                                        if (${request.liveConnection}) return;
                                        if (${!courseForumConversationCurrent}) delete this.scrolled;
                                        else if (this.scrolled === undefined) {
                                          this.closest('[key~="courseForumConversations--group"]').open = true;
                                          this.scrollIntoView({ block: "nearest" });
                                          this.scrolled = true;
                                        }
                                      `}"
                                    >
                                      <div>
                                        <div
                                          css="${css`
                                            display: flex;
                                            align-items: center;
                                          `}"
                                        >
                                          $${
                                            !courseForumConversationCurrent &&
                                            courseForumConversation.includesUnviewedcourseForumConversationMessages
                                              ? html`
                                                  <div
                                                    css="${css`
                                                      font-size: var(
                                                        --size--1-5
                                                      );
                                                      color: light-dark(
                                                        var(--color--blue--500),
                                                        var(--color--blue--500)
                                                      );
                                                      position: absolute;
                                                      translate: calc(
                                                        -100% - var(--size--1)
                                                      );
                                                    `}"
                                                  >
                                                    <i
                                                      class="bi bi-circle-fill"
                                                    ></i>
                                                  </div>
                                                `
                                              : html``
                                          }
                                          <div>
                                            $${application.partials.userAvatar({
                                              user: courseForumConversation.firstcourseForumConversationMessageAnonymous
                                                ? "anonymous"
                                                : (courseForumConversation.firstcourseForumConversationMessageCreatedByCourseParticipationUser ??
                                                  "courseParticipationDeleted"),
                                              size: 9,
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                      <div
                                        css="${css`
                                          flex: 1;
                                          min-width: var(--size--0);
                                        `}"
                                      >
                                        <div
                                          css="${css`
                                            display: flex;
                                            align-items: baseline;
                                            gap: var(--size--2);
                                          `}"
                                        >
                                          <div
                                            css="${css`
                                              flex: 1;
                                              font-weight: 600;
                                            `}"
                                          >
                                            $${
                                              request.state.courseParticipation!
                                                .courseParticipationRole ===
                                                "courseParticipationRoleInstructor" &&
                                              courseForumConversation.courseForumConversationType ===
                                                "courseForumConversationTypeQuestion" &&
                                              Boolean(
                                                courseForumConversation.courseForumConversationTypeQuestionResolved,
                                              ) === false &&
                                              courseForumConversation.courseForumConversationMessagesCount ===
                                                1 &&
                                              courseForumConversation
                                                .firstcourseForumConversationMessage
                                                .contentSentimentAnalysisType ===
                                                "negative" &&
                                              0.6 <
                                                courseForumConversation
                                                  .firstcourseForumConversationMessage
                                                  .contentSentimentAnalysisIntensity
                                                ? html`
                                                    <span
                                                      css="${
                                                        !courseForumConversationCurrent
                                                          ? css`
                                                              color: light-dark(
                                                                var(
                                                                  --color--red--400
                                                                ),
                                                                var(
                                                                  --color--red--600
                                                                )
                                                              );
                                                            `
                                                          : css``
                                                      }"
                                                      javascript="${javascript`
                                                        javascript.popover({ element: this });
                                                      `}"
                                                    >
                                                      <i
                                                        class="bi bi-exclamation-diamond-fill"
                                                      ></i>
                                                    </span>
                                                    <span type="popover">
                                                      High-priority question
                                                    </span>
                                                  `
                                                : html``
                                            }
                                            ${courseForumConversation.title}
                                          </div>
                                          <div
                                            css="${css`
                                              font-size: var(--font-size--3);
                                              line-height: var(
                                                --font-size--3--line-height
                                              );
                                              font-weight: 500;
                                            `} ${
                                              !courseForumConversationCurrent
                                                ? css`
                                                    color: light-dark(
                                                      var(--color--slate--400),
                                                      var(--color--slate--600)
                                                    );
                                                  `
                                                : css`
                                                    color: light-dark(
                                                      var(--color--blue--300),
                                                      var(--color--blue--300)
                                                    );
                                                  `
                                            }"
                                          >
                                            #${courseForumConversation.publicId}
                                          </div>
                                        </div>
                                        <div
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                          `} ${
                                            !courseForumConversationCurrent
                                              ? css`
                                                  color: light-dark(
                                                    var(--color--slate--600),
                                                    var(--color--slate--400)
                                                  );
                                                `
                                              : css`
                                                  color: light-dark(
                                                    var(--color--blue--200),
                                                    var(--color--blue--200)
                                                  );
                                                `
                                          }"
                                        >
                                          <span
                                            css="${css`
                                              font-weight: 600;
                                            `}"
                                            >${
                                              courseForumConversation.firstcourseForumConversationMessageAnonymous
                                                ? "Anonymous"
                                                : (courseForumConversation
                                                    .firstcourseForumConversationMessageCreatedByCourseParticipationUser
                                                    ?.name ??
                                                  "Deleted course participant")
                                            }</span
                                          >${
                                            !courseForumConversation.firstcourseForumConversationMessageAnonymous
                                              ? `${
                                                  courseForumConversation
                                                    .firstcourseForumConversationMessageCreatedByCourseParticipation
                                                    ?.courseParticipationRole ===
                                                  "courseParticipationRoleInstructor"
                                                    ? " (instructor)"
                                                    : ""
                                                }${
                                                  courseForumConversation
                                                    .firstcourseForumConversationMessage
                                                    .courseForumConversationMessageAnonymity ===
                                                  "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                                                    ? " (anonymous to students)"
                                                    : courseForumConversation
                                                          .firstcourseForumConversationMessage
                                                          .courseForumConversationMessageAnonymity ===
                                                        "courseForumConversationMessageAnonymityEveryone"
                                                      ? " (anonymous to everyone)"
                                                      : ""
                                                }`
                                              : ``
                                          } ·
                                          <span
                                            javascript="${javascript`
                                              javascript.popover({ element: this });
                                            `}"
                                            >${utilities.capitalize(utilities.zonedDateTimeToRelativeTimeFormat(Temporal.Instant.from(courseForumConversation.firstcourseForumConversationMessage.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone)))}</span
                                          >
                                          <span type="popover"
                                            >${utilities.formatDateTime(Temporal.Instant.from(courseForumConversation.firstcourseForumConversationMessage.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone))}</span
                                          >
                                        </div>
                                        <div
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                          `} ${
                                            !courseForumConversationCurrent
                                              ? css`
                                                  color: light-dark(
                                                    var(--color--slate--600),
                                                    var(--color--slate--400)
                                                  );
                                                `
                                              : css`
                                                  color: light-dark(
                                                    var(--color--blue--200),
                                                    var(--color--blue--200)
                                                  );
                                                `
                                          }"
                                        >
                                          $${(() => {
                                            const courseForumConversationMainDetails =
                                              [
                                                html`<span
                                                    css="${css`
                                                      font-weight: 600;
                                                    `}"
                                                    >${
                                                      courseForumConversation.courseForumConversationType ===
                                                      "courseForumConversationTypeNote"
                                                        ? "Note"
                                                        : courseForumConversation.courseForumConversationType ===
                                                            "courseForumConversationTypeQuestion"
                                                          ? "Question"
                                                          : (() => {
                                                              throw new Error();
                                                            })()
                                                    }</span
                                                  >$${
                                                    courseForumConversation.courseForumConversationType ===
                                                    "courseForumConversationTypeQuestion"
                                                      ? Boolean(
                                                          courseForumConversation.courseForumConversationTypeQuestionResolved,
                                                        ) === false
                                                        ? html` <span
                                                            css="${
                                                              !courseForumConversationCurrent
                                                                ? css`
                                                                    color: light-dark(
                                                                      var(
                                                                        --color--red--500
                                                                      ),
                                                                      var(
                                                                        --color--red--500
                                                                      )
                                                                    );
                                                                  `
                                                                : css``
                                                            }"
                                                            >(unresolved)</span
                                                          >`
                                                        : html` <span
                                                            css="${
                                                              !courseForumConversationCurrent
                                                                ? css`
                                                                    color: light-dark(
                                                                      var(
                                                                        --color--green--500
                                                                      ),
                                                                      var(
                                                                        --color--green--500
                                                                      )
                                                                    );
                                                                  `
                                                                : css``
                                                            }"
                                                            >(resolved)</span
                                                          >`
                                                      : ""
                                                  }`,
                                              ];
                                            for (const courseForumConversationsTag of request
                                              .state.courseForumConversationsTags!)
                                              if (
                                                application.database.get(
                                                  sql`
                                                    select true
                                                    from "courseForumConversationTaggings"
                                                    where
                                                      "courseForumConversation" = ${courseForumConversation.id} and
                                                      "courseForumConversationsTag" = ${courseForumConversationsTag.id};
                                                  `,
                                                ) !== undefined
                                              )
                                                courseForumConversationMainDetails.push(
                                                  html`${courseForumConversationsTag.name}`,
                                                );
                                            return courseForumConversationMainDetails.join(
                                              " · ",
                                            );
                                          })()}
                                        </div>
                                        $${
                                          application.database.get(
                                            sql`
                                              select true
                                              from "courseForumConversationMessageLikes"
                                              join "courseParticipations" on
                                                "courseForumConversationMessageLikes"."courseParticipation" = "courseParticipations"."id" and
                                                "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor'
                                              where "courseForumConversationMessageLikes"."courseForumConversationMessage" = ${courseForumConversation.firstcourseForumConversationMessage.id}
                                              limit 1;
                                            `,
                                          ) !== undefined
                                            ? html`
                                                <div
                                                  css="${css`
                                                    font-size: var(
                                                      --font-size--3
                                                    );
                                                    line-height: var(
                                                      --font-size--3--line-height
                                                    );
                                                    font-weight: 600;
                                                  `} ${
                                                    !courseForumConversationCurrent
                                                      ? css`
                                                          color: light-dark(
                                                            var(
                                                              --color--green--500
                                                            ),
                                                            var(
                                                              --color--green--500
                                                            )
                                                          );
                                                        `
                                                      : css`
                                                          color: light-dark(
                                                            var(
                                                              --color--blue--200
                                                            ),
                                                            var(
                                                              --color--blue--200
                                                            )
                                                          );
                                                        `
                                                  }"
                                                >
                                                  Liked by instructor
                                                </div>
                                              `
                                            : html``
                                        }
                                        <div
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                            white-space: nowrap;
                                            overflow: hidden;
                                            text-overflow: ellipsis;
                                          `} ${
                                            !courseForumConversationCurrent
                                              ? css`
                                                  color: light-dark(
                                                    var(--color--slate--400),
                                                    var(--color--slate--600)
                                                  );
                                                `
                                              : css`
                                                  color: light-dark(
                                                    var(--color--blue--300),
                                                    var(--color--blue--300)
                                                  );
                                                `
                                          }"
                                        >
                                          ${(
                                            await application.partials.courseForumConversationMessageContentProcessor(
                                              {
                                                course: request.state.course!,
                                                courseParticipation:
                                                  request.state
                                                    .courseParticipation,
                                                courseForumConversation,
                                                courseForumConversationMessage:
                                                  courseForumConversation.firstcourseForumConversationMessage,
                                                mode: "textContent",
                                              },
                                            )
                                          ).slice(0, 1000)}
                                        </div>
                                      </div>
                                    </a>
                                  `;
                                },
                              ),
                            )}
                          </details>
                        `;
                      },
                    ),
                  )}
                `;
              })()}
            </div>
          </div>
          <div
            key="sidebar--backdrop"
            css="${css`
              background-color: light-dark(
                var(--color--black),
                var(--color--white)
              );
              position: fixed;
              inset: var(--size--0);
              z-index: 99;
              visibility: hidden;
              opacity: var(--opacity--0);
              cursor: pointer;
              transition-property: var(--transition-property--opacity);
              transition-duration: var(--transition-duration--200);
              transition-timing-function: var(
                --transition-timing-function--ease-in-out
              );
              @media (max-width: 899px) {
                [key~="main--two-column-layout"][state~="sidebar--open"] & {
                  visibility: visible;
                  opacity: var(--opacity--30);
                }
              }
            `}"
            javascript="${javascript`
              this.onclick = () => {
                javascript.stateRemove(document.querySelector('[key~="main--two-column-layout"]'), "sidebar--open");
              };
            `}"
          ></div>
          <div
            key="sidebar--resize-handle"
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
                translate: -50%;
                z-index: 100;
                cursor: col-resize;
                pointer-events: auto;
                transition-property: var(--transition-property--colors);
                transition-delay: var(--transition-duration--150);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                &:hover,
                &[state~="active"] {
                  background-color: light-dark(
                    var(--color--blue--500),
                    var(--color--blue--500)
                  );
                }
              `}"
              javascript="${javascript`
                this.onpointerdown = (event) => {
                  if (event.button !== 0) return;
                  javascript.stateAdd(this, "active");
                  javascript.stateAdd(document.querySelector("body"), "noninteractive");
                  document.querySelector("body").style.cursor = "col-resize";
                  document.onpointermove = (event) => {
                    this.closest('[key~="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(Math.min(Math.max(Math.floor(event.clientX), 60 * 4), 112 * 4)) + "px");
                  };
                  document.onpointerup = () => {
                    javascript.stateRemove(this, "active");
                    javascript.stateRemove(document.querySelector("body"), "noninteractive");
                    document.querySelector("body").style.cursor = "";
                    document.onpointermove = undefined;
                    document.onpointerup = undefined;
                    updateSidebarWidth();
                  };
                };
                this.ondblclick = () => {
                  this.closest('[key~="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.setProperty("--width", String(80 * 4) +"px");
                  updateSidebarWidth();
                };
                const updateSidebarWidth = utilities.throttle(async () => {
                  await fetch("/settings/sidebar-width", {
                    method: "PATCH",
                    headers: { "CSRF-Protection": "true" },
                    body: new URLSearchParams({ sidebarWidth: this.closest('[key~="main--two-column-layout"]').querySelector('[key~="sidebar"]').style.getPropertyValue("--width").slice(0, -"px".length) }),
                  });
                });
              `}"
            ></div>
          </div>
          <div
            key="main--main ${request.URL.pathname}"
            class="scroll"
            css="${css`
              flex: 1;
            `}"
          >
            <div
              css="${css`
                max-width: var(--size--168);
                padding: var(--size--2) var(--size--4);
                @media (max-width: 899px) {
                  margin: var(--size--0) auto;
                }
              `}"
            >
              $${body}
            </div>
          </div>
        </div>
      `,
    });
  };

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/search$"),
    handler: async (
      request: serverTypes.Request<
        {},
        { search: "string" },
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      if (
        typeof request.search.search !== "string" ||
        request.search.search.trim() === ""
      )
        throw "validation";
      const lexicalSearchTokens = utilities.tokenize(request.search.search, {
        stem: (token) => natural.PorterStemmer.stem(token),
      });
      const results = new Array<HTML>();
      if (0 < lexicalSearchTokens.length) {
        const lexicalSearchString = lexicalSearchTokens
          .map((tokenWithPosition) => `"${tokenWithPosition.token}"*`)
          .join(" ");
        const semanticSearch = await (
          await fetch("http://localhost:19000/vector-embedding", {
            method: "POST",
            headers: { "CSRF-Protection": "true" },
            body: new URLSearchParams({
              text: `Represent this sentence for searching relevant passages: ${request.search.search}`,
            }),
          })
        ).text();
        for (const courseForumConversationId of utilities
          .reciprocalRankFusion(
            application.database
              .all<{ id: number }>(
                sql`
                  select "courseForumConversations"."id" as "id"
                  from "courseForumConversations"
                  join "lexicalSearch_courseForumConversations_titleLexicalSearch" on
                    "courseForumConversations"."id" = "lexicalSearch_courseForumConversations_titleLexicalSearch"."rowid" and
                    "lexicalSearch_courseForumConversations_titleLexicalSearch" match ${lexicalSearchString}
                  where
                    "courseForumConversations"."course" = ${request.state.course.id} and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  order by "lexicalSearch_courseForumConversations_titleLexicalSearch"."rank" asc
                  limit 20;
                `,
              )
              .map((courseForumConversation) => courseForumConversation.id),
            application.database
              .all<{ id: number }>(
                sql`
                  select "courseForumConversations"."id" as "id"
                  from "courseForumConversations"
                  where
                    "courseForumConversations"."course" = ${request.state.course.id} and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  order by vec_distance_L2("courseForumConversations"."titleSemanticSearch", ${semanticSearch}) asc
                  limit 20;
                `,
              )
              .map((courseForumConversation) => courseForumConversation.id),
          )
          .slice(0, 5)) {
          const courseForumConversation = application.database.get<{
            publicId: string;
            title: string;
          }>(
            sql`
              select "publicId", "title"
              from "courseForumConversations"
              where "id" = ${courseForumConversationId};
            `,
          );
          if (courseForumConversation === undefined) throw new Error();
          results.push(html`
            <a
              href="/courses/${
                request.state.course.publicId
              }/forum/${courseForumConversation.publicId}"
              class="button button--rectangle button--transparent button--dropdown-menu"
            >
              <span
                css="${css`
                  font-size: var(--font-size--3);
                  line-height: var(--font-size--3--line-height);
                  font-weight: 500;
                  color: light-dark(
                    var(--color--slate--400),
                    var(--color--slate--600)
                  );
                `}"
                >#${courseForumConversation.publicId}</span
              >
              <span
                >$${utilities.highlight(
                  html`${courseForumConversation.title}`,
                  new Set(
                    lexicalSearchTokens.map(
                      (tokenWithPosition) => tokenWithPosition.token,
                    ),
                  ),
                  {
                    prefix: true,
                    stopWords: application.applicationConfiguration.stopWords,
                    stem: (token) => natural.PorterStemmer.stem(token),
                  },
                )}</span
              >
            </a>
          `);
        }
        for (const courseForumConversationMessageId of utilities
          .reciprocalRankFusion(
            application.database
              .all<{ id: number }>(
                sql`
                  select "courseForumConversationMessages"."id" as "id"
                  from "courseForumConversationMessages"
                  join "lexicalSearch_courseForumConversationMessages_contentLexicalSearch" on
                    "courseForumConversationMessages"."id" = "lexicalSearch_courseForumConversationMessages_contentLexicalSearch"."rowid" and
                    "lexicalSearch_courseForumConversationMessages_contentLexicalSearch" match ${lexicalSearchString}
                  join "courseForumConversations" on
                    "courseForumConversationMessages"."courseForumConversation" = "courseForumConversations"."id" and
                    "courseForumConversations"."course" = ${request.state.course.id} and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  ${
                    request.state.courseParticipation!
                      .courseParticipationRole !==
                    "courseParticipationRoleInstructor"
                      ? sql`
                          where
                            "courseForumConversationMessages"."courseForumConversationMessageVisibility" != 'courseForumConversationMessageVisibilityCourseParticipationRoleInstructors'
                        `
                      : sql``
                  }
                  order by "lexicalSearch_courseForumConversationMessages_contentLexicalSearch"."rank" asc
                  limit 20;
                `,
              )
              .map((courseForumConversationMessage) => courseForumConversationMessage.id),
            application.database
              .all<{ id: number }>(
                sql`
                  select "courseForumConversationMessages"."id" as "id"
                  from "courseForumConversationMessages"
                  join "courseForumConversations" on
                    "courseForumConversationMessages"."courseForumConversation" = "courseForumConversations"."id" and
                    "courseForumConversations"."course" = ${request.state.course.id} and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  ${
                    request.state.courseParticipation!
                      .courseParticipationRole !==
                    "courseParticipationRoleInstructor"
                      ? sql`
                          where
                            "courseForumConversationMessages"."courseForumConversationMessageVisibility" != 'courseForumConversationMessageVisibilityCourseParticipationRoleInstructors'
                        `
                      : sql``
                  }
                  order by vec_distance_L2("courseForumConversationMessages"."contentSemanticSearch", ${semanticSearch}) asc
                  limit 20;
                `,
              )
              .map((courseForumConversationMessage) => courseForumConversationMessage.id),
          )
          .slice(0, 5)) {
          const courseForumConversationMessage = application.database.get<{
            publicId: string;
            courseForumConversation: number;
            createdByCourseParticipation: number | null;
            updatedAt: string | null;
            content: string;
          }>(
            sql`
              select
                "publicId",
                "courseForumConversation",
                "createdByCourseParticipation",
                "updatedAt",
                "content"
              from "courseForumConversationMessages"
              where "id" = ${courseForumConversationMessageId};
            `,
          );
          if (courseForumConversationMessage === undefined) throw new Error();
          const courseForumConversation = application.database.get<{
            publicId: string;
            title: string;
          }>(
            sql`
              select
                "publicId",
                "title"
              from "courseForumConversations"
              where "id" = ${courseForumConversationMessage.courseForumConversation};
            `,
          );
          if (courseForumConversation === undefined) throw new Error();
          results.push(html`
            <a
              href="/courses/${
                request.state.course.publicId
              }/forum/${courseForumConversation.publicId}?${new URLSearchParams({
                message: courseForumConversationMessage.publicId,
              }).toString()}"
              class="button button--rectangle button--transparent button--dropdown-menu"
            >
              <div>
                <span
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    font-weight: 500;
                    color: light-dark(
                      var(--color--slate--400),
                      var(--color--slate--600)
                    );
                  `}"
                  >#${courseForumConversation.publicId}</span
                >
                <span>${courseForumConversation.title}</span>
              </div>
              <div
                css="${css`
                  font-size: var(--font-size--3);
                  line-height: var(--font-size--3--line-height);
                  color: light-dark(
                    var(--color--slate--600),
                    var(--color--slate--400)
                  );
                `}"
              >
                $${utilities.snippet(
                  html`${await application.partials.courseForumConversationMessageContentProcessor(
                    {
                      course: request.state.course,
                      courseParticipation: request.state.courseParticipation,
                      courseForumConversation,
                      courseForumConversationMessage,
                      mode: "textContent",
                    },
                  )}`,
                  new Set(
                    lexicalSearchTokens.map(
                      (tokenWithPosition) => tokenWithPosition.token,
                    ),
                  ),
                  {
                    prefix: true,
                    stopWords: application.applicationConfiguration.stopWords,
                    stem: (token) => natural.PorterStemmer.stem(token),
                  },
                )}
              </div>
            </a>
          `);
        }
      }
      response.send(html`
        <div
          css="${css`
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
        >
          $${
            0 < results.length
              ? results
              : html`
                  <div
                    css="${css`
                      color: light-dark(
                        var(--color--slate--400),
                        var(--color--slate--600)
                      );
                    `}"
                  >
                    No results
                  </div>
                `
          }
        </div>
      `);
    },
  });

  application.webServer?.push({
    method: "PATCH",
    pathname: "/settings/sidebar-width",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { sidebarWidth: string },
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (
        typeof request.body.sidebarWidth !== "string" ||
        request.body.sidebarWidth.match(/^[0-9]+$/) === null ||
        Number(request.body.sidebarWidth) < 60 * 4 ||
        112 * 4 < Number(request.body.sidebarWidth)
      )
        throw "validation";
      application.database.run(
        sql`
          update "users"
          set "sidebarWidth" = ${Number(request.body.sidebarWidth)}
          where "id" = ${request.state.user.id};
        `,
      );
      response.send();
    },
  });

  application.webServer?.push({
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/conversations/"),
    handler: (request, response) => {
      if (request.liveConnection) return;
      response.redirect!(
        request.URL.pathname.replace("/conversations/", "/forum/") +
          request.URL.search.toString(),
        "permanent",
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/forum/new$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {
          "reuse.course": string;
          "reuse.courseForumConversation": string;
          title: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          pinned: "false" | "true";
          announcement: "false" | "true";
          tags: string[];
          content: string;
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
        },
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversationsTags === undefined
      )
        return;
      let prefill: Partial<{
        title: string;
        courseForumConversationType:
          "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
        courseForumConversationVisibility:
          | "courseForumConversationVisibilityEveryone"
          | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
          | "courseForumConversationVisibilityCourseForumConversationParticipations";
        pinned: "false" | "true";
        announcement: "false" | "true";
        tags: string[];
        content: string;
        courseForumConversationMessageAnonymity:
          | "courseForumConversationMessageAnonymityNone"
          | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
          | "courseForumConversationMessageAnonymityEveryone";
      }> = {};
      if (
        typeof request.search["reuse.course"] === "string" &&
        request.search["reuse.course"].trim() !== "" &&
        typeof request.search["reuse.courseForumConversation"] === "string" &&
        request.search["reuse.courseForumConversation"].trim() !== ""
      ) {
        const course = application.database.get<{ id: number }>(
          sql`
            select "id"
            from "courses"
            where "publicId" = ${request.search["reuse.course"]};
          `,
        );
        const courseParticipation =
          course !== undefined
            ? application.database.get<{
                id: number;
                courseParticipationRole:
                  | "courseParticipationRoleInstructor"
                  | "courseParticipationRoleStudent";
              }>(
                sql`
                  select "id", "courseParticipationRole"
                  from "courseParticipations"
                  where
                    "user" = ${request.state.user.id} and
                    "course" = ${course.id};
                `,
              )
            : undefined;
        const courseForumConversation =
          course !== undefined && courseParticipation !== undefined
            ? application.database.get<{
                id: number;
                courseForumConversationType:
                  | "courseForumConversationTypeNote"
                  | "courseForumConversationTypeQuestion";
                courseForumConversationVisibility:
                  | "courseForumConversationVisibilityEveryone"
                  | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                  | "courseForumConversationVisibilityCourseForumConversationParticipations";
                pinned: number;
                title: string;
              }>(
                sql`
                  select
                    "id",
                    "courseForumConversationType",
                    "courseForumConversationVisibility",
                    "pinned",
                    "title"
                  from "courseForumConversations"
                  where
                    "publicId" = ${request.search["reuse.courseForumConversation"]} and
                    "course" = ${course.id} and (
                      "courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        courseParticipation.courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${courseParticipation.id}
                      )
                    );
                `,
              )
            : undefined;
        const firstcourseForumConversationMessage =
          courseForumConversation !== undefined
            ? application.database.get<{
                content: string;
                courseForumConversationMessageAnonymity:
                  | "courseForumConversationMessageAnonymityNone"
                  | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                  | "courseForumConversationMessageAnonymityEveryone";
              }>(
                sql`
                  select "content", "courseForumConversationMessageAnonymity"
                  from "courseForumConversationMessages"
                  where "courseForumConversation" = ${courseForumConversation.id}
                  order by "id" asc
                  limit 1;
                `,
              )
            : undefined;
        if (
          courseForumConversation !== undefined &&
          firstcourseForumConversationMessage !== undefined
        )
          prefill = {
            ...prefill,
            ...courseForumConversation,
            pinned: Boolean(courseForumConversation.pinned) ? "true" : "false",
            ...firstcourseForumConversationMessage,
          };
      }
      prefill = { ...prefill, ...request.search };
      response.send(
        await (
          application.database.get(
            sql`
            select true
            from "courseForumConversations"
            where
              "course" = ${request.state.course.id} and (
                "courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                ${
                  request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? sql`
                        or
                        "courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                      `
                    : sql``
                }
                or (
                  select true
                  from "courseForumConversationParticipations"
                  where
                    "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                    "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                )
              )
            limit 1;
          `,
          ) === undefined
            ? application.layouts.main
            : courseForumConversationsLayout
        )({
          request,
          response,
          head: html`
            <title>
              New conversation · ${request.state.course.name} · Courselore
            </title>
          `,
          body: html`
            <div
              key="courseForumConversation/new /courses/${
                request.state.course.publicId
              }/forum/new"
              type="form"
              method="POST"
              action="/courses/${request.state.course.publicId}/forum"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--4);
              `}"
              javascript="${javascript`
                this.onsubmit = () => {
                  delete this.querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').morph;
                };
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                New conversation
              </div>
              $${
                request.state.course.courseState === "courseStateActive"
                  ? html`
                      <div>
                        <label>
                          <div
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              font-weight: 600;
                              color: light-dark(
                                var(--color--slate--500),
                                var(--color--slate--500)
                              );
                            `}"
                          >
                            Title
                          </div>
                          <div
                            css="${css`
                              display: flex;
                            `}"
                          >
                            <input
                              type="text"
                              name="title"
                              value="${
                                typeof prefill.title === "string"
                                  ? prefill.title
                                  : ""
                              }"
                              required
                              maxlength="2000"
                              autofocus
                              class="input--text"
                              css="${css`
                                flex: 1;
                              `}"
                              javascript="${javascript`
                                this.onchange = utilities.throttle(async () => {
                                  if (this.closest('[type~="form"]').querySelector('[name="courseForumConversationType"]:checked').value !== "courseForumConversationTypeQuestion" || this.value.trim().length < 5) {
                                    this.closest('[type~="form"]').querySelector('[key~="similarQuestions"]').hidden = true;
                                    return;
                                  }
                                  const similarQuestionsResults = await (await fetch(${`/courses/${request.state.course.publicId}/forum/new/similar-questions`} + "?" + new URLSearchParams({ title: this.value }))).text();
                                  if (similarQuestionsResults === "") {
                                    this.closest('[type~="form"]').querySelector('[key~="similarQuestions"]').hidden = true;
                                    return;
                                  }
                                  javascript.mount(
                                    this.closest('[type~="form"]').querySelector('[key~="similarQuestionsResults"]'),
                                    similarQuestionsResults,
                                  );
                                  this.closest('[type~="form"]').querySelector('[key~="similarQuestions"]').hidden = false;
                                });
                              `}"
                            />
                          </div>
                        </label>
                      </div>
                      <div
                        key="similarQuestions"
                        hidden
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 600;
                          color: light-dark(
                            var(--color--slate--600),
                            var(--color--slate--400)
                          );
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--1);
                        `}"
                      >
                        <div
                          css="${css`
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                        >
                          Similar questions
                        </div>
                        <div key="similarQuestionsResults"></div>
                      </div>
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 600;
                          color: light-dark(
                            var(--color--slate--600),
                            var(--color--slate--400)
                          );
                          display: flex;
                          align-items: baseline;
                          flex-wrap: wrap;
                          column-gap: var(--size--4);
                          row-gap: var(--size--2);
                        `}"
                      >
                        <button
                          type="button"
                          class="button button--rectangle button--transparent"
                          javascript="${javascript`
                            javascript.popover({ element: this, trigger: "click" });
                          `}"
                        >
                          <form>
                            <span
                              css="${css`
                                color: light-dark(
                                  var(--color--slate--500),
                                  var(--color--slate--500)
                                );
                              `}"
                              >Type:</span
                            >  <input
                              type="radio"
                              name="courseForumConversationType"
                              value="courseForumConversationTypeNote"
                              required
                              $${
                                prefill.courseForumConversationType ===
                                  "courseForumConversationTypeNote" ||
                                (prefill.courseForumConversationType !==
                                  "courseForumConversationTypeQuestion" &&
                                  request.state.courseParticipation
                                    .courseParticipationRole ===
                                    "courseParticipationRoleInstructor")
                                  ? html`checked`
                                  : html``
                              }
                              hidden
                              javascript="${javascript`
                                this.oninput = () => {
                                  if (!this.checked) return;
                                  this.closest('[type~="form"]').querySelector('[key~="announcement"]')?.removeAttribute("hidden");
                                  this.closest('[type~="form"]').querySelector('[name="announcement"]')?.removeAttribute("disabled");
                                  this.closest('[type~="form"]').querySelector('[key~="similarQuestions"]').hidden = true;
                                };
                              `}"
                            /><span
                              css="${css`
                                :not(:checked) + & {
                                  display: none;
                                }
                              `}"
                              >Note</span
                            ><input
                              type="radio"
                              name="courseForumConversationType"
                              value="courseForumConversationTypeQuestion"
                              required
                              $${
                                prefill.courseForumConversationType ===
                                  "courseForumConversationTypeQuestion" ||
                                (prefill.courseForumConversationType !==
                                  "courseForumConversationTypeNote" &&
                                  request.state.courseParticipation
                                    .courseParticipationRole ===
                                    "courseParticipationRoleStudent")
                                  ? html`checked`
                                  : html``
                              }
                              hidden
                              javascript="${javascript`
                                this.oninput = () => {
                                  if (!this.checked) return;
                                  this.closest('[type~="form"]').querySelector('[key~="announcement"]')?.setAttribute("hidden", "");
                                  this.closest('[type~="form"]').querySelector('[name="announcement"]')?.setAttribute("disabled", "");
                                };
                              `}"
                            /><span
                              css="${css`
                                :not(:checked) + & {
                                  display: none;
                                }
                              `}"
                              >Question</span
                            > <i class="bi bi-chevron-down"></i>
                          </form>
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
                                this.closest('[type~="form"]').querySelector('[name="courseForumConversationType"][value="courseForumConversationTypeNote"]').click();
                              };
                            `}"
                          >
                            Note
                          </button>
                          <button
                            type="button"
                            class="button button--rectangle button--transparent button--dropdown-menu"
                            javascript="${javascript`
                              this.onclick = () => {
                                this.closest('[type~="form"]').querySelector('[name="courseForumConversationType"][value="courseForumConversationTypeQuestion"]').click();
                              };
                            `}"
                          >
                            Question
                          </button>
                        </div>
                        <button
                          type="button"
                          class="button button--rectangle button--transparent"
                          javascript="${javascript`
                            javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true });
                          `}"
                        >
                          <form>
                            <span
                              css="${css`
                                color: light-dark(
                                  var(--color--slate--500),
                                  var(--color--slate--500)
                                );
                              `}"
                              >Visibility:</span
                            >  <input
                              type="radio"
                              name="courseForumConversationVisibility"
                              value="courseForumConversationVisibilityEveryone"
                              required
                              $${
                                prefill.courseForumConversationVisibility ===
                                  "courseForumConversationVisibilityEveryone" ||
                                (prefill.courseForumConversationVisibility !==
                                  "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                                  prefill.courseForumConversationVisibility !==
                                    "courseForumConversationVisibilityCourseForumConversationParticipations")
                                  ? html`checked`
                                  : html``
                              }
                              hidden
                            /><span
                              css="${css`
                                :not(:checked) + & {
                                  display: none;
                                }
                              `}"
                              >Everyone</span
                            ><input
                              type="radio"
                              name="courseForumConversationVisibility"
                              value="courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                              required
                              $${
                                prefill.courseForumConversationVisibility ===
                                "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                  ? html`checked`
                                  : html``
                              }
                              hidden
                            /><span
                              css="${css`
                                :not(:checked) + & {
                                  display: none;
                                }
                              `}"
                              >Instructors and selected course
                              participants</span
                            ><input
                              type="radio"
                              name="courseForumConversationVisibility"
                              value="courseForumConversationVisibilityCourseForumConversationParticipations"
                              required
                              $${
                                prefill.courseForumConversationVisibility ===
                                "courseForumConversationVisibilityCourseForumConversationParticipations"
                                  ? html`checked`
                                  : html``
                              }
                              hidden
                            /><span
                              css="${css`
                                :not(:checked) + & {
                                  display: none;
                                }
                              `}"
                              >Selected course participants</span
                            > <i class="bi bi-chevron-down"></i>
                          </form>
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
                                this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityEveryone"]').click();
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                              };
                            `}"
                          >
                            Everyone
                          </button>
                          <button
                            type="button"
                            class="button button--rectangle button--transparent button--dropdown-menu"
                            javascript="${javascript`
                              this.onclick = () => {
                                this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"]').checked = true;
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                                if (this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').hidden) return;
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').focus();
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').onkeyup();
                              };
                            `}"
                          >
                            Instructors and selected course participants
                          </button>
                          <button
                            type="button"
                            class="button button--rectangle button--transparent button--dropdown-menu"
                            javascript="${javascript`
                              this.onclick = () => {
                                this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityCourseForumConversationParticipations"]').checked = true;
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                                if (this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').hidden) return;
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').focus();
                                this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').onkeyup();
                              };
                            `}"
                          >
                            Selected course participants
                          </button>
                          <div
                            key="courseForumConversationParticipations"
                            css="${css`
                              display: flex;
                              flex-direction: column;
                              gap: var(--size--2);
                            `}"
                            javascript="${javascript`
                              this.setHidden = () => {
                                this.hidden =
                                  this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityEveryone" || (
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                                    ![...this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children].some((element) => element.courseParticipationRole !== "courseParticipationRoleInstructor")
                                  ) || (
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseForumConversationParticipations" &&
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children.length === 0
                                  );
                              };
                              this.setHidden();
                            `}"
                          >
                            <hr class="separator" />
                            <input
                              key="courseForumConversationParticipations--input"
                              type="text"
                              placeholder="Search…"
                              maxlength="3000"
                              class="input--text"
                              javascript="${javascript`
                                this.isModified = false;
                                this.onkeyup = utilities.throttle(() => {
                                  const search = new Set(utilities.tokenize(this.value).map((tokenWithPosition) => tokenWithPosition.token));
                                  for (const element of this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children) {
                                    const nameElement = element.querySelector('[key~="courseForumConversationParticipations--courseParticipation--name"]');
                                    nameElement.innerHTML = utilities.highlight(html\`\${nameElement.name}\`, search, { prefix: true });
                                    nameElement.morph = nameElement.querySelector("span") === null;
                                    element.hidden =
                                      (
                                        element.courseParticipationRole === "courseParticipationRoleInstructor" &&
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                      ) || (
                                        0 < search.size &&
                                        nameElement.querySelector("span") === null
                                      );
                                  }
                                });
                              `}"
                            />
                            <div
                              key="courseForumConversationParticipations--courseParticipations"
                              css="${css`
                                max-height: var(--size--36);
                                padding: var(--size--1) var(--size--2);
                                margin: var(--size---1) var(--size---2);
                                overflow: auto;
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--2);
                              `}"
                              javascript="${javascript`
                                this.morph = false;
                              `}"
                            >
                              $${application.database
                                .all<{
                                  publicId: string;
                                  user: number;
                                  courseParticipationRole:
                                    | "courseParticipationRoleInstructor"
                                    | "courseParticipationRoleStudent";
                                }>(
                                  sql`
                                    select
                                      "courseParticipations"."publicId" as "publicId",
                                      "courseParticipations"."user" as "user",
                                      "courseParticipations"."courseParticipationRole" as "courseParticipationRole"
                                    from "courseParticipations"
                                    join "users" on "courseParticipations"."user" = "users"."id"
                                    where
                                      "courseParticipations"."course" = ${request.state.course.id} and
                                      "users"."id" != ${request.state.user.id}
                                    order by
                                      "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' desc,
                                      "users"."name" asc;
                                  `,
                                )
                                .map(
                                  (
                                    courseParticipation,
                                    courseParticipationOrder,
                                  ) => {
                                    const user = application.database.get<{
                                      id: number;
                                      publicId: string;
                                      name: string;
                                      avatarColor:
                                        | "red"
                                        | "orange"
                                        | "amber"
                                        | "yellow"
                                        | "lime"
                                        | "green"
                                        | "emerald"
                                        | "teal"
                                        | "cyan"
                                        | "sky"
                                        | "blue"
                                        | "indigo"
                                        | "violet"
                                        | "purple"
                                        | "fuchsia"
                                        | "pink"
                                        | "rose";
                                      avatarImage: string | null;
                                    }>(
                                      sql`
                                        select
                                          "id",
                                          "publicId",
                                          "name",
                                          "avatarColor",
                                          "avatarImage"
                                        from "users"
                                        where "id" = ${courseParticipation.user};
                                      `,
                                    );
                                    if (user === undefined) throw new Error();
                                    return html`
                                      <label
                                        key="courseForumConversationParticipations--courseParticipation ${courseParticipation.publicId}"
                                        class="button button--rectangle button--transparent button--dropdown-menu"
                                        css="${css`
                                          display: flex;
                                          gap: var(--size--2);
                                        `}"
                                        javascript="${javascript`
                                          this.courseParticipationRole = ${courseParticipation.courseParticipationRole};
                                          this.order = ${courseParticipationOrder};
                                        `}"
                                      >
                                        <input
                                          type="checkbox"
                                          name="courseForumConversationParticipations[]"
                                          value="${courseParticipation.publicId}"
                                          class="input--checkbox"
                                          css="${css`
                                            margin-top: var(--size--1);
                                          `}"
                                          javascript="${javascript`
                                            this.oninput = () => {
                                              const element = this.closest('[key~="courseForumConversationParticipations--courseParticipation"]');
                                              for (const otherElement of this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children)
                                                if (
                                                  (
                                                    this.checked && (
                                                      otherElement.querySelector('[name="courseForumConversationParticipations[]"]').checked === false ||
                                                      element.order < otherElement.order
                                                    ) 
                                                  ) || (
                                                    !this.checked &&
                                                      otherElement.querySelector('[name="courseForumConversationParticipations[]"]').checked === false &&
                                                      element.order < otherElement.order
                                                  )
                                                ) {
                                                  otherElement.insertAdjacentElement("beforebegin", element);
                                                  return;
                                                }
                                              this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').insertAdjacentElement("beforeend", element);
                                            };
                                          `}"
                                        />
                                        $${application.partials.userAvatar({
                                          user,
                                        })}
                                        <div
                                          css="${css`
                                            margin-top: var(--size--0-5);
                                          `}"
                                        >
                                          <span
                                            key="courseForumConversationParticipations--courseParticipation--name"
                                            javascript="${javascript`
                                              this.name = ${user.name};
                                            `}"
                                            >${user.name}</span
                                          >$${
                                            courseParticipation.courseParticipationRole ===
                                            "courseParticipationRoleInstructor"
                                              ? html`<span
                                                  css="${css`
                                                    font-size: var(
                                                      --font-size--3
                                                    );
                                                    line-height: var(
                                                      --font-size--3--line-height
                                                    );
                                                    color: light-dark(
                                                      var(--color--slate--600),
                                                      var(--color--slate--400)
                                                    );
                                                  `}"
                                                >
                                                  (instructor)</span
                                                >`
                                              : html``
                                          }
                                        </div>
                                      </label>
                                    `;
                                  },
                                )}
                            </div>
                          </div>
                        </div>
                        $${
                          request.state.courseParticipation
                            .courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                            ? html`
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click" });
                                  `}"
                                >
                                  <form>
                                    <span
                                      css="${css`
                                        color: light-dark(
                                          var(--color--slate--500),
                                          var(--color--slate--500)
                                        );
                                      `}"
                                      >Pin:</span
                                    >  <input
                                      type="radio"
                                      name="pinned"
                                      value="false"
                                      required
                                      $${
                                        prefill.pinned === "false" ||
                                        prefill.pinned !== "true"
                                          ? html`checked`
                                          : html``
                                      }
                                      hidden
                                    /><span
                                      css="${css`
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >Unpinned</span
                                    ><input
                                      type="radio"
                                      name="pinned"
                                      value="true"
                                      required
                                      $${
                                        prefill.pinned === "true"
                                          ? html`checked`
                                          : html``
                                      }
                                      hidden
                                    /><span
                                      css="${css`
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >Pinned</span
                                    > <i class="bi bi-chevron-down"></i>
                                  </form>
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
                                        this.closest('[type~="form"]').querySelector('[name="pinned"][value="false"]').click();
                                      };
                                    `}"
                                  >
                                    Unpinned
                                  </button>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[name="pinned"][value="true"]').click();
                                      };
                                    `}"
                                  >
                                    Pinned
                                  </button>
                                </div>
                              `
                            : html``
                        }
                      </div>
                      $${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? html`
                              <div
                                key="announcement"
                                $${
                                  prefill.courseForumConversationType ===
                                  "courseForumConversationTypeQuestion"
                                    ? html`hidden`
                                    : html``
                                }
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
                                <label
                                  class="button button--rectangle button--transparent"
                                >
                                  <input
                                    type="checkbox"
                                    name="announcement"
                                    $${
                                      prefill.courseForumConversationType ===
                                      "courseForumConversationTypeQuestion"
                                        ? html`disabled`
                                        : html``
                                    }
                                    $${
                                      prefill.announcement === "true"
                                        ? html`checked`
                                        : html``
                                    }
                                    class="input--checkbox"
                                  />  Send email notifications to everyone about
                                  this note
                                </label>
                              </div>
                            `
                          : html``
                      }
                      $${
                        request.state.courseForumConversationsTags.length > 0
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
                                  display: flex;
                                  align-items: baseline;
                                  gap: var(--size--1-5);
                                `}"
                              >
                                <div
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                >
                                  Tags:
                                </div>
                                <div
                                  css="${css`
                                    flex: 1;
                                    display: flex;
                                    flex-wrap: wrap;
                                    column-gap: var(--size--4);
                                    row-gap: var(--size--2);
                                  `}"
                                >
                                  $${request.state.courseForumConversationsTags.map(
                                    (courseForumConversationsTag) => html`
                                      <label
                                        class="button button--rectangle button--transparent"
                                      >
                                        <input
                                          type="checkbox"
                                          name="tags[]"
                                          value="${courseForumConversationsTag.publicId}"
                                          $${
                                            Boolean(
                                              request.state.course!
                                                .courseForumConversationRequiresTagging,
                                            )
                                              ? html`required`
                                              : html``
                                          }
                                          $${
                                            Array.isArray(prefill.tags) &&
                                            prefill.tags.includes(
                                              courseForumConversationsTag.publicId,
                                            )
                                              ? html`checked`
                                              : html``
                                          }
                                          class="input--checkbox"
                                        />  ${courseForumConversationsTag.name}
                                      </label>
                                    `,
                                  )}
                                </div>
                              </div>
                            `
                          : html``
                      }
                      $${application.partials.courseForumConversationMessageContentEditor(
                        {
                          course: request.state.course,
                          courseParticipation:
                            request.state.courseParticipation,
                          courseForumConversationMessageContent:
                            typeof prefill.content === "string"
                              ? prefill.content
                              : undefined,
                        },
                      )}
                      <div
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 600;
                          color: light-dark(
                            var(--color--slate--600),
                            var(--color--slate--400)
                          );
                          display: flex;
                          align-items: baseline;
                          gap: var(--size--4);
                        `}"
                      >
                        <div>
                          <button
                            type="submit"
                            class="button button--rectangle button--blue"
                          >
                            Create conversation
                          </button>
                        </div>
                        $${
                          request.state.courseParticipation
                            .courseParticipationRole ===
                            "courseParticipationRoleStudent" &&
                          (request.state.course
                            .courseParticipationRoleStudentsAnonymityAllowed ===
                            "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" ||
                            request.state.course
                              .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedEveryone")
                            ? html`
                                <div
                                  css="${css`
                                    flex: 1;
                                    display: flex;
                                    align-items: baseline;
                                    flex-wrap: wrap;
                                    column-gap: var(--size--4);
                                    row-gap: var(--size--2);
                                  `}"
                                >
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click" });
                                  `}"
                                  >
                                    <form
                                      javascript="${javascript`
                                      this.oninput = async () => {
                                        await fetch(
                                          "/settings/anonymity-preferred", {
                                            method: "PATCH",
                                            headers: { "CSRF-Protection": "true" },
                                            body: new URLSearchParams(javascript.serialize(this)),
                                          }
                                        );
                                      };
                                    `}"
                                    >
                                      <span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--slate--500),
                                            var(--color--slate--500)
                                          );
                                        `}"
                                        >Anonymity:</span
                                      >  <input
                                        type="radio"
                                        name="courseForumConversationMessageAnonymity"
                                        value="courseForumConversationMessageAnonymityNone"
                                        required
                                        $${
                                          prefill.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityNone" ||
                                          (prefill.courseForumConversationMessageAnonymity !==
                                            "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
                                            prefill.courseForumConversationMessageAnonymity !==
                                              "courseForumConversationMessageAnonymityEveryone" &&
                                            request.state.user
                                              .userAnonymityPreferred ===
                                              "userAnonymityPreferredNone")
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >None</span
                                      ><input
                                        type="radio"
                                        name="courseForumConversationMessageAnonymity"
                                        value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                                        required
                                        $${
                                          prefill.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" ||
                                          (prefill.courseForumConversationMessageAnonymity !==
                                            "courseForumConversationMessageAnonymityNone" &&
                                            prefill.courseForumConversationMessageAnonymity !==
                                              "courseForumConversationMessageAnonymityEveryone" &&
                                            (request.state.user
                                              .userAnonymityPreferred ===
                                              "userAnonymityPreferredCourseParticipationRoleStudents" ||
                                              (request.state.user
                                                .userAnonymityPreferred ===
                                                "userAnonymityPreferredEveryone" &&
                                                request.state.course
                                                  .courseParticipationRoleStudentsAnonymityAllowed !==
                                                  "courseParticipationRoleStudentsAnonymityAllowedEveryone"))) ||
                                          (prefill.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityEveryone" &&
                                            request.state.course
                                              .courseParticipationRoleStudentsAnonymityAllowed !==
                                              "courseParticipationRoleStudentsAnonymityAllowedEveryone")
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Anonymous to students</span
                                      >$${
                                        request.state.course
                                          .courseParticipationRoleStudentsAnonymityAllowed ===
                                        "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                                          ? html`<input
                                                type="radio"
                                                name="courseForumConversationMessageAnonymity"
                                                value="courseForumConversationMessageAnonymityEveryone"
                                                required
                                                $${
                                                  prefill.courseForumConversationMessageAnonymity ===
                                                    "courseForumConversationMessageAnonymityEveryone" ||
                                                  (prefill.courseForumConversationMessageAnonymity !==
                                                    "courseForumConversationMessageAnonymityNone" &&
                                                    prefill.courseForumConversationMessageAnonymity !==
                                                      "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
                                                    request.state.user
                                                      .userAnonymityPreferred ===
                                                      "userAnonymityPreferredEveryone")
                                                    ? html`checked`
                                                    : html``
                                                }
                                                hidden
                                              /><span
                                                css="${css`
                                                  :not(:checked) + & {
                                                    display: none;
                                                  }
                                                `}"
                                                >Anonymous to everyone</span
                                              >`
                                          : html``
                                      } <i class="bi bi-chevron-down"></i>
                                    </form>
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
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityNone"]').click();
                                      };
                                    `}"
                                    >
                                      None
                                    </button>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent button--dropdown-menu"
                                      javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                                      };
                                    `}"
                                    >
                                      Anonymous to students
                                    </button>
                                    $${
                                      request.state.course
                                        .courseParticipationRoleStudentsAnonymityAllowed ===
                                      "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                                        ? html`
                                            <button
                                              type="button"
                                              class="button button--rectangle button--transparent button--dropdown-menu"
                                              javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityEveryone"]').click();
                                            };
                                          `}"
                                            >
                                              Anonymous to everyone
                                            </button>
                                          `
                                        : html``
                                    }
                                  </div>
                                </div>
                              `
                            : html``
                        }
                      </div>
                    `
                  : request.state.course.courseState === "courseStateArchived"
                    ? html`
                        <div
                          key="courseForumConversation--archived"
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--red--500),
                              var(--color--red--500)
                            );
                          `}"
                        >
                          <i class="bi bi-exclamation-triangle-fill"></i> This
                          course is archived (read-only).
                        </div>
                      `
                    : (() => {
                        throw new Error();
                      })()
              }
            </div>
          `,
        }),
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/new/similar-questions$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        { title: "string" },
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      if (
        typeof request.search.title !== "string" ||
        request.search.title.trim() === ""
      )
        throw "validation";
      const lexicalSearchTokens = utilities.tokenize(request.search.title, {
        stem: (token) => natural.PorterStemmer.stem(token),
      });
      const results = new Array<HTML>();
      if (0 < lexicalSearchTokens.length) {
        const lexicalSearchString = lexicalSearchTokens
          .map((tokenWithPosition) => `"${tokenWithPosition.token}"*`)
          .join(" ");
        const semanticSearch = await (
          await fetch("http://localhost:19000/vector-embedding", {
            method: "POST",
            headers: { "CSRF-Protection": "true" },
            body: new URLSearchParams({
              text: `Represent this sentence for searching relevant passages: ${request.search.title}`,
            }),
          })
        ).text();
        const courseForumConversations = [
          ...new Map(
            [
              ...application.database.all<{
                id: number;
                publicId: string;
                title: string;
              }>(
                sql`
                  select
                    "courseForumConversations"."id" as "id",
                    "courseForumConversations"."publicId" as "publicId",
                    "courseForumConversations"."title" as "title"
                  from "courseForumConversations"
                  join "lexicalSearch_courseForumConversations_titleLexicalSearch" on
                    "courseForumConversations"."id" = "lexicalSearch_courseForumConversations_titleLexicalSearch"."rowid" and
                    "lexicalSearch_courseForumConversations_titleLexicalSearch" match ${lexicalSearchString}
                  where
                    "courseForumConversations"."course" = ${request.state.course.id} and
                    "courseForumConversations"."courseForumConversationType" = 'courseForumConversationTypeQuestion' and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  order by "lexicalSearch_courseForumConversations_titleLexicalSearch"."rank" asc
                  limit 20;
                `,
              ),
              ...application.database.all<{
                id: number;
                publicId: string;
                title: string;
              }>(
                sql`
                  select
                    "courseForumConversations"."id" as "id",
                    "courseForumConversations"."publicId" as "publicId",
                    "courseForumConversations"."title" as "title"
                  from "courseForumConversations"
                  where
                    "courseForumConversations"."course" = ${request.state.course.id} and
                    "courseForumConversations"."courseForumConversationType" = 'courseForumConversationTypeQuestion' and (
                      "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                      ${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseForumConversations"."courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseForumConversationParticipations"
                        where
                          "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                          "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                      )
                    )
                  order by vec_distance_L2("courseForumConversations"."titleSemanticSearch", ${semanticSearch}) asc
                  limit 20;
                `,
              ),
            ].map((courseForumConversation) => [
              courseForumConversation.id,
              { ...courseForumConversation, reranking: -Infinity },
            ]),
          ).values(),
        ];
        if (0 < courseForumConversations.length)
          for (const [courseForumConversationIndex, courseForumConversationReranking] of (
            (await (
              await fetch("http://localhost:19000/reranking", {
                method: "POST",
                headers: { "CSRF-Protection": "true" },
                body: new URLSearchParams([
                  ["query", request.search.title],
                  ...courseForumConversations.map((courseForumConversation) => [
                    "searchResults[]",
                    courseForumConversation.title,
                  ]),
                ]),
              })
            ).json()) as number[]
          ).entries())
            courseForumConversations[courseForumConversationIndex].reranking =
              courseForumConversationReranking;
        for (const courseForumConversation of courseForumConversations
          .filter((courseForumConversation) => 1.5 < courseForumConversation.reranking)
          .sort(
            (courseForumConversationA, courseForumConversationB) =>
              courseForumConversationB.reranking - courseForumConversationA.reranking,
          )
          .slice(0, 3))
          results.push(html`
            <div>
              <a
                href="/courses/${
                  request.state.course.publicId
                }/forum/${courseForumConversation.publicId}"
                target="_blank"
                class="button button--rectangle button--transparent"
              >
                <span
                  css="${css`
                    color: light-dark(
                      var(--color--slate--500),
                      var(--color--slate--500)
                    );
                  `}"
                  >#${courseForumConversation.publicId}</span
                >
                <span
                  >$${utilities.highlight(
                    html`${courseForumConversation.title}`,
                    new Set(
                      lexicalSearchTokens.map(
                        (tokenWithPosition) => tokenWithPosition.token,
                      ),
                    ),
                    {
                      prefix: true,
                      stopWords: application.applicationConfiguration.stopWords,
                      stem: (token) => natural.PorterStemmer.stem(token),
                    },
                  )}</span
                >
              </a>
            </div>
          `);
      }
      response.send(
        0 < results.length
          ? html`
              <div
                key="similarQuestionsResults"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--1-5);
                `}"
              >
                $${results}
              </div>
            `
          : html``,
      );
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/forum$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          title: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          courseForumConversationParticipations: string[];
          pinned: "false" | "true";
          announcement: "on";
          tags: string[];
          content: string;
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
        },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversationsTags === undefined
      )
        return;
      request.body.courseForumConversationParticipations ??= [];
      request.body.tags ??= [];
      if (
        typeof request.body.title !== "string" ||
        request.body.title.trim() === "" ||
        (request.body.courseForumConversationType !== "courseForumConversationTypeNote" &&
          request.body.courseForumConversationType !==
            "courseForumConversationTypeQuestion") ||
        (request.body.courseForumConversationVisibility !==
          "courseForumConversationVisibilityEveryone" &&
          request.body.courseForumConversationVisibility !==
            "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
          request.body.courseForumConversationVisibility !==
            "courseForumConversationVisibilityCourseForumConversationParticipations") ||
        !Array.isArray(request.body.courseForumConversationParticipations) ||
        request.body.courseForumConversationParticipations.some(
          (courseForumConversationParticipation) =>
            typeof courseForumConversationParticipation !== "string",
        ) ||
        (request.body.pinned === "true" &&
          request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor") ||
        (request.body.announcement === "on" &&
          (request.body.courseForumConversationType !==
            "courseForumConversationTypeNote" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor")) ||
        !Array.isArray(request.body.tags) ||
        (Boolean(request.state.course.courseForumConversationRequiresTagging) &&
          0 < request.state.courseForumConversationsTags.length &&
          request.body.tags.length === 0) ||
        request.body.tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !request.state.courseForumConversationsTags!.some(
              (courseForumConversationsTag) =>
                tag === courseForumConversationsTag.publicId,
            ),
        ) ||
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (request.body.courseForumConversationMessageAnonymity !== undefined &&
          (typeof request.body.courseForumConversationMessageAnonymity !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleStudent" ||
            (request.body.courseForumConversationMessageAnonymity !==
              "courseForumConversationMessageAnonymityNone" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityEveryone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityEveryone" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      const titleSemanticSearch = await (
        await fetch("http://localhost:19000/vector-embedding", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: request.body.title }),
        })
      ).text();
      let courseForumConversation: {
        id: number;
        publicId: string;
        courseForumConversationType:
          "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
        courseForumConversationTypeQuestionResolved: number;
        courseForumConversationVisibility:
          | "courseForumConversationVisibilityEveryone"
          | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
          | "courseForumConversationVisibilityCourseForumConversationParticipations";
        pinned: number;
        title: string;
      };
      const contentTextContent =
        await application.partials.courseForumConversationMessageContentProcessor({
          course: request.state.course,
          courseForumConversationMessageContent: request.body.content,
          mode: "textContent",
        });
      const contentSemanticSearch = await (
        await fetch("http://localhost:19000/vector-embedding", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).text();
      const contentSentimentAnalysis = (await (
        await fetch("http://localhost:19000/sentiment-analysis", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).json()) as {
        label: "positive" | "neutral" | "negative";
        score: number;
      };
      application.database.transaction(() => {
        courseForumConversation = application.database.get<{
          id: number;
          publicId: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationTypeQuestionResolved: number;
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          pinned: number;
          title: string;
        }>(
          sql`
            select * from "courseForumConversations" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseForumConversations" (
                    "publicId",
                    "course",
                    "courseForumConversationType",
                    "courseForumConversationTypeQuestionResolved",
                    "courseForumConversationVisibility",
                    "pinned",
                    "title",
                    "titleLexicalSearch",
                    "titleSemanticSearch"
                  )
                  values (
                    ${String(request.state.course!.courseForumConversationsNextPublicId)},
                    ${request.state.course!.id},
                    ${request.body.courseForumConversationType!},
                    ${Number(false)},
                    ${request.body.courseForumConversationVisibility!},
                    ${Number(request.body.pinned === "true")},
                    ${request.body.title!},
                    ${utilities
                      .tokenize(request.body.title!, {
                        stopWords:
                          application.applicationConfiguration.stopWords,
                        stem: (token) => natural.PorterStemmer.stem(token),
                      })
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")},
                    vec_f32(${titleSemanticSearch})
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
        request.state.course!.courseForumConversationsNextPublicId++;
        application.database.run(
          sql`
            update "courses"
            set "courseForumConversationsNextPublicId" = ${request.state.course!.courseForumConversationsNextPublicId}
            where "id" = ${request.state.course!.id};
          `,
        );
        for (const courseForumConversationParticipation of new Set([
          ...request.body.courseForumConversationParticipations!,
          request.state.courseParticipation!.publicId,
        ])) {
          const courseParticipation = application.database.get<{
            id: number;
            courseParticipationRole:
              | "courseParticipationRoleInstructor"
              | "courseParticipationRoleStudent";
          }>(
            sql`
              select
                "id",
                "courseParticipationRole"
              from "courseParticipations"
              where "publicId" = ${courseForumConversationParticipation};
            `,
          );
          if (
            courseParticipation !== undefined &&
            request.body.courseForumConversationVisibility !==
              "courseForumConversationVisibilityEveryone" &&
            !(
              request.body.courseForumConversationVisibility ===
                "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
              courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
            )
          )
            application.database.run(
              sql`
                insert into "courseForumConversationParticipations" (
                  "courseForumConversation",
                  "courseParticipation"
                )
                values (
                  ${courseForumConversation.id},
                  ${courseParticipation.id}
                );
              `,
            );
        }
        for (const tag of request.body.tags!)
          application.database.run(
            sql`
              insert into "courseForumConversationTaggings" (
                "courseForumConversation",
                "courseForumConversationsTag"
              )
              values (
                ${courseForumConversation.id},
                ${request.state.courseForumConversationsTags!.find((courseForumConversationsTag) => tag === courseForumConversationsTag.publicId)!.id}
              );
            `,
          );
        const courseForumConversationMessage = application.database.get<{
          id: number;
        }>(
          sql`
            select * from "courseForumConversationMessages" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseForumConversationMessages" (
                    "publicId",
                    "courseForumConversation",
                    "createdByCourseParticipation",
                    "createdAt",
                    "updatedAt",
                    "courseForumConversationMessageType",
                    "courseForumConversationMessageVisibility",
                    "courseForumConversationMessageAnonymity",
                    "sentViaEmail",
                    "content",
                    "contentLexicalSearch",
                    "contentSemanticSearch",
                    "contentSentimentAnalysisType",
                    "contentSentimentAnalysisIntensity"
                  )
                  values (
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${courseForumConversation.id},
                    ${request.state.courseParticipation!.id},
                    ${Temporal.Now.instant().toString()},
                    ${null},
                    ${"courseForumConversationMessageTypeMessage"},
                    ${"courseForumConversationMessageVisibilityEveryone"},
                    ${request.body.courseForumConversationMessageAnonymity ?? "courseForumConversationMessageAnonymityNone"},
                    ${Number(false)},
                    ${request.body.content!},
                    ${utilities
                      .tokenize(contentTextContent, {
                        stopWords:
                          application.applicationConfiguration.stopWords,
                        stem: (token) => natural.PorterStemmer.stem(token),
                      })
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")},
                    vec_f32(${contentSemanticSearch}),
                    ${contentSentimentAnalysis.label},
                    ${contentSentimentAnalysis.score}
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
        application.database.run(
          sql`
            insert into "courseForumConversationMessageViews" (
              "courseForumConversationMessage",
              "courseParticipation",
              "createdAt"
            )
            values (
              ${courseForumConversationMessage.id},
              ${request.state.courseParticipation!.id},
              ${Temporal.Now.instant().toString()}
            );
          `,
        );
        application.database.backgroundJob({
          type: "courseForumConversationMessageEmailNotification",
          startAt: Temporal.Now.instant().add({ minutes: 5 }).toString(),
          parameters: {
            courseForumConversationMessageId: courseForumConversationMessage.id,
            announcement: request.body.announcement === "on",
          },
        });
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${courseForumConversation!.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseForumConversationPublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["courseForumConversation"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.courseForumConversationPublicId !== "string" ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      request.state.courseForumConversation = application.database.get<{
        id: number;
        publicId: string;
        courseForumConversationType:
          "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
        courseForumConversationTypeQuestionResolved: number;
        courseForumConversationVisibility:
          | "courseForumConversationVisibilityEveryone"
          | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
          | "courseForumConversationVisibilityCourseForumConversationParticipations";
        pinned: number;
        title: string;
      }>(
        sql`
          select 
            "id",
            "publicId",
            "courseForumConversationType",
            "courseForumConversationTypeQuestionResolved",
            "courseForumConversationVisibility",
            "pinned",
            "title"
          from "courseForumConversations"
          where
            "course" = ${request.state.course.id} and
            "publicId" = ${request.pathname.courseForumConversationPublicId} and (
              "courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
              ${
                request.state.courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? sql`
                      or
                      "courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                    `
                  : sql``
              }
              or (
                select true
                from "courseForumConversationParticipations"
                where
                  "courseForumConversations"."id" = "courseForumConversationParticipations"."courseForumConversation" and
                  "courseForumConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
              )
            );
        `,
      );
      if (request.state.courseForumConversation === undefined) return;
      application.database.run(
        sql`
          update "courseParticipations"
          set "mostRecentlyVisitedCourseForumConversation" = ${request.state.courseForumConversation.id}
          where "id" = ${request.state.courseParticipation.id};
        `,
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        { message: string },
        {},
        {},
        Application["types"]["states"]["courseForumConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversationsTags === undefined ||
        request.state.courseForumConversation === undefined
      )
        return;
      const firstcourseForumConversationMessage = application.database.get<{
        id: number;
        createdByCourseParticipation: number | null;
      }>(
        sql`
          select "id", "createdByCourseParticipation"
          from "courseForumConversationMessages"
          where "courseForumConversation" = ${request.state.courseForumConversation.id}
          order by "id" asc
          limit 1;
        `,
      );
      if (firstcourseForumConversationMessage === undefined) throw new Error();
      response.send(
        await courseForumConversationsLayout({
          request,
          response,
          head: html`
            <title>
              ${request.state.courseForumConversation.title} ·
              ${request.state.course.name} · Courselore
            </title>
          `,
          body: html`
            <div
              key="courseForumConversation /courses/${
                request.state.course.publicId
              }/forum/${request.state.courseForumConversation.publicId}"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--6);
              `}"
              javascript="${javascript`
                const element =
                  ${typeof request.search.message === "string" && !request.liveConnection} ? (
                    this.querySelector(${`[key~="courseForumConversationMessage"][key~="/courses/${
                      request.state.course.publicId
                    }/forum/${
                      request.state.courseForumConversation.publicId
                    }/messages/${request.search.message}"]`}) ??
                    undefined
                  ) :
                  this.hasScrolled !== true ? (
                    this.querySelector('[key~="courseForumConversationMessage--sidebar--courseForumConversationMessageView"]')?.closest('[key~="courseForumConversationMessage"]') ??
                    this.querySelector('[key~="courseForumConversationMessage--new"]') ??
                    undefined
                  ) :
                  undefined;
                if (
                  element !== undefined &&
                  element !== this.querySelectorAll('[key~="courseForumConversationMessage"]')[0]
                )
                  element.scrollIntoView();
                this.hasScrolled = true;
              `}"
            >
              <div
                key="courseForumConversation--header"
                type="form"
                method="PATCH"
                action="/courses/${
                  request.state.course.publicId
                }/forum/${request.state.courseForumConversation.publicId}"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--2);
                `}"
                javascript="${javascript`
                  this.oninput = () => {
                    for (const element of this.querySelectorAll(".hide-on-not-modified"))
                      element.hidden = !javascript.isModified(this);
                  };
                  window.setTimeout(() => {
                    this.oninput();
                  });
                  this.onsubmit = () => {
                    this.querySelector('[key~="courseForumConversation--header--title--show"]').hidden = false;
                    this.querySelector('[key~="courseForumConversation--header--title--edit"]').hidden = true;
                    delete this.querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').morph;
                  };
                `}"
              >
                $${(() => {
                  const mayEditcourseForumConversation =
                    request.state.course.courseState === "courseStateActive" &&
                    (request.state.courseParticipation
                      .courseParticipationRole ===
                      "courseParticipationRoleInstructor" ||
                      request.state.courseParticipation.id ===
                        firstcourseForumConversationMessage.createdByCourseParticipation);
                  return html`
                    $${
                      request.state.course.courseState === "courseStateArchived"
                        ? html`
                            <div
                              key="courseForumConversation--archived"
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 600;
                                color: light-dark(
                                  var(--color--red--500),
                                  var(--color--red--500)
                                );
                              `}"
                            >
                              <i class="bi bi-exclamation-triangle-fill"></i
                              > This course is archived (read-only).
                            </div>
                          `
                        : html``
                    }
                    <div
                      css="${css`
                        display: flex;
                        gap: var(--size--4);
                        align-items: baseline;
                      `}"
                    >
                      <div
                        key="courseForumConversation--header--title"
                        css="${css`
                          flex: 1;
                        `}"
                      >
                        <div
                          key="courseForumConversation--header--title--show"
                          css="${css`
                            font-size: var(--font-size--4);
                            line-height: var(--font-size--4--line-height);
                            font-weight: 800;
                          `}"
                        >
                          ${request.state.courseForumConversation.title}
                        </div>
                        $${
                          mayEditcourseForumConversation
                            ? html`
                                <div
                                  key="courseForumConversation--header--title--edit"
                                  hidden
                                  css="${css`
                                    display: flex;
                                    gap: var(--size--4);
                                    align-items: baseline;
                                  `}"
                                >
                                  <div
                                    css="${css`
                                      flex: 1;
                                      display: flex;
                                    `}"
                                  >
                                    <input
                                      type="text"
                                      name="title"
                                      value="${
                                        request.state.courseForumConversation.title
                                      }"
                                      required
                                      maxlength="2000"
                                      class="input--text"
                                      css="${css`
                                        flex: 1;
                                      `}"
                                    />
                                  </div>
                                  <div>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent"
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
                                      javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--show"]').hidden = false;
                                        this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--edit"]').hidden = true;
                                        javascript.reset(this.closest('[key~="courseForumConversation--header--title--edit"]'));
                                      };
                                    `}"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              `
                            : html``
                        }
                      </div>
                      <div key="courseForumConversation--header--menu">
                        <button
                          type="button"
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
                              const popover = javascript.popover({ element: this, trigger: "none" });
                              this.onclick = async () => {
                                await navigator.clipboard.writeText(${`https://${application.userConfiguration.hostname}/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`});
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
                            mayEditcourseForumConversation
                              ? html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--show"]').hidden = true;
                                      this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--edit"]').hidden = false;
                                      this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--edit"] [name="title"]').click();
                                      this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--title--edit"] [name="title"]').focus();
                                    };
                                  `}"
                                  >
                                    Edit title
                                  </button>
                                `
                              : html``
                          }
                          $${(() => {
                            const courses = application.database.all<{
                              publicId: string;
                              name: string;
                              information: string | null;
                            }>(
                              sql`
                                select
                                  "courses"."publicId" as "publicId",
                                  "courses"."name" as "name",
                                  "courses"."information" as "information"
                                from "courses"
                                join "courseParticipations" on
                                  "courses"."id" = "courseParticipations"."course" and
                                  "courseParticipations"."user" = ${request.state.user.id}
                                where
                                  "courses"."id" != ${request.state.course.id} and
                                  "courses"."courseState" = 'courseStateActive'
                                order by "courseParticipations"."id" desc;
                              `,
                            );
                            return 0 < courses.length
                              ? html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      javascript.popover({ element: this, trigger: "click" });
                                    `}"
                                  >
                                    Reuse in another course
                                  </button>
                                  <div
                                    type="popover"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    $${courses.map(
                                      (course) => html`
                                        <a
                                          href="/courses/${course.publicId}/forum/new?${new URLSearchParams(
                                            {
                                              "reuse.course":
                                                request.state.course!.publicId,
                                              "reuse.courseForumConversation":
                                                request.state
                                                  .courseForumConversation!.publicId,
                                            },
                                          ).toString()}"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                        >
                                          <div
                                            css="${css`
                                              font-weight: 500;
                                            `}"
                                          >
                                            ${course.name}
                                          </div>
                                          $${
                                            typeof course.information ===
                                            "string"
                                              ? html`
                                                  <div
                                                    css="${css`
                                                      font-size: var(
                                                        --font-size--3
                                                      );
                                                      line-height: var(
                                                        --font-size--3--line-height
                                                      );
                                                      color: light-dark(
                                                        var(
                                                          --color--slate--600
                                                        ),
                                                        var(--color--slate--400)
                                                      );
                                                    `}"
                                                  >
                                                    ${course.information}
                                                  </div>
                                                `
                                              : html``
                                          }
                                        </a>
                                      `,
                                    )}
                                  </div>
                                `
                              : html``;
                          })()}
                          $${
                            mayEditcourseForumConversation &&
                            request.state.courseParticipation
                              .courseParticipationRole ===
                              "courseParticipationRoleInstructor"
                              ? html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click" });
                                  `}"
                                  >
                                    Delete
                                  </button>
                                  <div
                                    type="form popover"
                                    method="DELETE"
                                    action="/courses/${
                                      request.state.course.publicId
                                    }/forum/${
                                      request.state.courseForumConversation.publicId
                                    }"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                        font-weight: 600;
                                        color: light-dark(
                                          var(--color--red--500),
                                          var(--color--red--500)
                                        );
                                      `}"
                                    >
                                      <i
                                        class="bi bi-exclamation-triangle-fill"
                                      ></i
                                      > This action cannot be reverted.
                                    </div>
                                    <div>
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--red"
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                        `}"
                                      >
                                        Delete conversation
                                      </button>
                                    </div>
                                  </div>
                                `
                              : html``
                          }
                        </div>
                      </div>
                    </div>
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                        display: flex;
                        align-items: baseline;
                        flex-wrap: wrap;
                        column-gap: var(--size--4);
                        row-gap: var(--size--2);
                      `}"
                    >
                      $${
                        mayEditcourseForumConversation
                          ? html`
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                javascript.popover({ element: this, trigger: "click" });
                              `}"
                              >
                                <form>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Type:</span
                                  >  <input
                                    type="radio"
                                    name="courseForumConversationType"
                                    value="courseForumConversationTypeNote"
                                    required
                                    $${
                                      request.state.courseForumConversation
                                        .courseForumConversationType ===
                                      "courseForumConversationTypeNote"
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Note</span
                                  ><input
                                    type="radio"
                                    name="courseForumConversationType"
                                    value="courseForumConversationTypeQuestion"
                                    required
                                    $${
                                      request.state.courseForumConversation
                                        .courseForumConversationType ===
                                      "courseForumConversationTypeQuestion"
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Question</span
                                  > <i class="bi bi-chevron-down"></i>
                                </form>
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
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationType"][value="courseForumConversationTypeNote"]').click();
                                    this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--courseForumConversationTypeQuestionResolved"]').hidden = true;
                                  };
                                `}"
                                >
                                  Note
                                </button>
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                  this.onclick = () => {
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationType"][value="courseForumConversationTypeQuestion"]').click();
                                    this.closest('[type~="form"]').querySelector('[key~="courseForumConversation--header--courseForumConversationTypeQuestionResolved"]').hidden = false;
                                  };
                                `}"
                                >
                                  Question
                                </button>
                              </div>
                            `
                          : html`
                              <div>
                                <span
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                  >Type:</span
                                >  $${
                                  request.state.courseForumConversation
                                    .courseForumConversationType ===
                                  "courseForumConversationTypeNote"
                                    ? html`Note`
                                    : request.state.courseForumConversation
                                          .courseForumConversationType ===
                                        "courseForumConversationTypeQuestion"
                                      ? html`Question`
                                      : (() => {
                                          throw new Error();
                                        })()
                                }
                              </div>
                            `
                      }
                      $${
                        mayEditcourseForumConversation
                          ? html`
                              <div
                                key="courseForumConversation--header--courseForumConversationTypeQuestionResolved"
                                $${
                                  request.state.courseForumConversation
                                    .courseForumConversationType !==
                                  "courseForumConversationTypeQuestion"
                                    ? html`hidden`
                                    : html``
                                }
                              >
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent"
                                  javascript="${javascript`
                                  javascript.popover({ element: this, trigger: "click" });
                                `}"
                                >
                                  <form>
                                    <span
                                      css="${css`
                                        color: light-dark(
                                          var(--color--slate--500),
                                          var(--color--slate--500)
                                        );
                                      `}"
                                      >Question:</span
                                    >  <input
                                      type="radio"
                                      name="courseForumConversationTypeQuestionResolved"
                                      value="false"
                                      required
                                      $${
                                        Boolean(
                                          request.state.courseForumConversation
                                            .courseForumConversationTypeQuestionResolved,
                                        ) === false
                                          ? html`checked`
                                          : html``
                                      }
                                      hidden
                                    /><span
                                      css="${css`
                                        color: light-dark(
                                          var(--color--red--500),
                                          var(--color--red--500)
                                        );
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >Unresolved</span
                                    ><input
                                      type="radio"
                                      name="courseForumConversationTypeQuestionResolved"
                                      value="true"
                                      required
                                      $${
                                        Boolean(
                                          request.state.courseForumConversation
                                            .courseForumConversationTypeQuestionResolved,
                                        ) === true
                                          ? html`checked`
                                          : html``
                                      }
                                      hidden
                                    /><span
                                      css="${css`
                                        color: light-dark(
                                          var(--color--green--500),
                                          var(--color--green--500)
                                        );
                                        :not(:checked) + & {
                                          display: none;
                                        }
                                      `}"
                                      >Resolved</span
                                    > <i class="bi bi-chevron-down"></i>
                                  </form>
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
                                      this.closest('[type~="form"]').querySelector('[name="courseForumConversationTypeQuestionResolved"][value="false"]').click();
                                    };
                                  `}"
                                  >
                                    Unresolved
                                  </button>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[type~="form"]').querySelector('[name="courseForumConversationTypeQuestionResolved"][value="true"]').click();
                                    };
                                  `}"
                                  >
                                    Resolved
                                  </button>
                                </div>
                              </div>
                            `
                          : request.state.courseForumConversation
                                .courseForumConversationType ===
                              "courseForumConversationTypeQuestion"
                            ? html`
                                <div>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Question:</span
                                  >  $${
                                    Boolean(
                                      request.state.courseForumConversation
                                        .courseForumConversationTypeQuestionResolved,
                                    ) === false
                                      ? html`<span
                                          css="${css`
                                            color: light-dark(
                                              var(--color--red--500),
                                              var(--color--red--500)
                                            );
                                          `}"
                                          >Unresolved</span
                                        >`
                                      : Boolean(
                                            request.state.courseForumConversation
                                              .courseForumConversationTypeQuestionResolved,
                                          ) === true
                                        ? html`<span
                                            css="${css`
                                              color: light-dark(
                                                var(--color--green--500),
                                                var(--color--green--500)
                                              );
                                            `}"
                                            >Resolved</span
                                          >`
                                        : (() => {
                                            throw new Error();
                                          })()
                                  }
                                </div>
                              `
                            : html``
                      }
                      $${
                        mayEditcourseForumConversation
                          ? html`
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true });
                              `}"
                              >
                                <form>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Visibility:</span
                                  >  <input
                                    type="radio"
                                    name="courseForumConversationVisibility"
                                    value="courseForumConversationVisibilityEveryone"
                                    required
                                    $${
                                      request.state.courseForumConversation
                                        .courseForumConversationVisibility ===
                                      "courseForumConversationVisibilityEveryone"
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Everyone</span
                                  ><input
                                    type="radio"
                                    name="courseForumConversationVisibility"
                                    value="courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                    required
                                    $${
                                      request.state.courseForumConversation
                                        .courseForumConversationVisibility ===
                                      "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Instructors and selected course
                                    participants</span
                                  ><input
                                    type="radio"
                                    name="courseForumConversationVisibility"
                                    value="courseForumConversationVisibilityCourseForumConversationParticipations"
                                    required
                                    $${
                                      request.state.courseForumConversation
                                        .courseForumConversationVisibility ===
                                      "courseForumConversationVisibilityCourseForumConversationParticipations"
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Selected course participants</span
                                  > <i class="bi bi-chevron-down"></i>
                                </form>
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
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityEveryone"]').click();
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                                  };
                                `}"
                                >
                                  Everyone
                                </button>
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                  this.onclick = () => {
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"]').checked = true;
                                    this.closest('[type~="form"]').oninput();
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                                    if (this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').hidden) return;
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').focus();
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').onkeyup();
                                  };
                                `}"
                                >
                                  Instructors and selected course participants
                                </button>
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                  this.onclick = () => {
                                    this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"][value="courseForumConversationVisibilityCourseForumConversationParticipations"]').checked = true;
                                    this.closest('[type~="form"]').oninput();
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').setHidden();
                                    if (this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations"]').hidden) return;
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').focus();
                                    this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--input"]').onkeyup();
                                  };
                                `}"
                                >
                                  Selected course participants
                                </button>
                                <div
                                  key="courseForumConversationParticipations"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--2);
                                  `}"
                                  javascript="${javascript`
                                  this.setHidden = () => {
                                    this.hidden =
                                      this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityEveryone" || (
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                                        ![...this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children].some((element) => element.courseParticipationRole !== "courseParticipationRoleInstructor")
                                      ) || (
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseForumConversationParticipations" &&
                                        this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children.length === 0
                                      );
                                  };
                                  this.setHidden();
                                `}"
                                >
                                  <hr class="separator" />
                                  <input
                                    key="courseForumConversationParticipations--input"
                                    type="text"
                                    placeholder="Search…"
                                    maxlength="3000"
                                    class="input--text"
                                    javascript="${javascript`
                                    this.isModified = false;
                                    this.onkeyup = utilities.throttle(() => {
                                      const search = new Set(utilities.tokenize(this.value).map((tokenWithPosition) => tokenWithPosition.token));
                                      for (const element of this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children) {
                                        const nameElement = element.querySelector('[key~="courseForumConversationParticipations--courseParticipation--name"]');
                                        nameElement.innerHTML = utilities.highlight(html\`\${nameElement.name}\`, search, { prefix: true });
                                        nameElement.morph = nameElement.querySelector("span") === null;
                                        element.hidden =
                                          (
                                            element.courseParticipationRole === "courseParticipationRoleInstructor" &&
                                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationVisibility"]:checked').value === "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                          ) || (
                                            0 < search.size &&
                                            nameElement.querySelector("span") === null
                                          );
                                      }
                                    });
                                    window.setTimeout(() => {
                                      this.onkeyup();
                                    });
                                  `}"
                                  />
                                  <div
                                    key="courseForumConversationParticipations--courseParticipations"
                                    css="${css`
                                      max-height: var(--size--36);
                                      padding: var(--size--1) var(--size--2);
                                      margin: var(--size---1) var(--size---2);
                                      overflow: auto;
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                    javascript="${javascript`
                                    this.morph = false;
                                  `}"
                                  >
                                    $${application.database
                                      .all<{
                                        id: number;
                                        publicId: string;
                                        user: number;
                                        courseParticipationRole:
                                          | "courseParticipationRoleInstructor"
                                          | "courseParticipationRoleStudent";
                                      }>(
                                        sql`
                                        select
                                          "courseParticipations"."id" as "id",
                                          "courseParticipations"."publicId" as "publicId",
                                          "courseParticipations"."user" as "user",
                                          "courseParticipations"."courseParticipationRole" as "courseParticipationRole"
                                        from "courseParticipations"
                                        join "users" on "courseParticipations"."user" = "users"."id"
                                        where
                                          "courseParticipations"."course" = ${request.state.course.id} and
                                          "users"."id" != ${request.state.user.id}
                                        order by
                                          "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' desc,
                                          "users"."name" asc;
                                      `,
                                      )
                                      .map(
                                        (
                                          courseParticipation,
                                          courseParticipationOrder,
                                        ) => {
                                          const user =
                                            application.database.get<{
                                              id: number;
                                              publicId: string;
                                              name: string;
                                              avatarColor:
                                                | "red"
                                                | "orange"
                                                | "amber"
                                                | "yellow"
                                                | "lime"
                                                | "green"
                                                | "emerald"
                                                | "teal"
                                                | "cyan"
                                                | "sky"
                                                | "blue"
                                                | "indigo"
                                                | "violet"
                                                | "purple"
                                                | "fuchsia"
                                                | "pink"
                                                | "rose";
                                              avatarImage: string | null;
                                            }>(
                                              sql`
                                            select
                                              "id",
                                              "publicId",
                                              "name",
                                              "avatarColor",
                                              "avatarImage"
                                            from "users"
                                            where "id" = ${courseParticipation.user};
                                          `,
                                            );
                                          if (user === undefined)
                                            throw new Error();
                                          return html`
                                            <label
                                              key="courseForumConversationParticipations--courseParticipation ${courseParticipation.publicId}"
                                              class="button button--rectangle button--transparent button--dropdown-menu"
                                              css="${css`
                                                display: flex;
                                                gap: var(--size--2);
                                              `}"
                                              javascript="${javascript`
                                              this.courseParticipationRole = ${courseParticipation.courseParticipationRole};
                                              this.order = ${courseParticipationOrder};
                                            `}"
                                            >
                                              <input
                                                type="checkbox"
                                                name="courseForumConversationParticipations[]"
                                                value="${courseParticipation.publicId}"
                                                class="input--checkbox"
                                                css="${css`
                                                  margin-top: var(--size--1);
                                                `}"
                                                $${
                                                  application.database.get(
                                                    sql`
                                                  select true
                                                  from "courseForumConversationParticipations"
                                                  where
                                                    "courseForumConversation" = ${request.state.courseForumConversation!.id} and
                                                    "courseParticipation" = ${courseParticipation.id};
                                                `,
                                                  ) !== undefined ||
                                                  (courseParticipation.id ===
                                                    firstcourseForumConversationMessage.createdByCourseParticipation &&
                                                    (request.state
                                                      .courseForumConversation!
                                                      .courseForumConversationVisibility ===
                                                      "courseForumConversationVisibilityEveryone" ||
                                                      (request.state
                                                        .courseForumConversation!
                                                        .courseForumConversationVisibility ===
                                                        "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                                                        courseParticipation.courseParticipationRole ===
                                                          "courseParticipationRoleInstructor")))
                                                    ? html`checked`
                                                    : html``
                                                }
                                                javascript="${javascript`
                                                this.oninput = () => {
                                                  const element = this.closest('[key~="courseForumConversationParticipations--courseParticipation"]');
                                                  for (const otherElement of this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').children)
                                                    if (
                                                      (
                                                        this.checked && (
                                                          otherElement.querySelector('[name="courseForumConversationParticipations[]"]').checked === false ||
                                                          element.order < otherElement.order
                                                        ) 
                                                      ) || (
                                                        !this.checked &&
                                                          otherElement.querySelector('[name="courseForumConversationParticipations[]"]').checked === false &&
                                                          element.order < otherElement.order
                                                      )
                                                    ) {
                                                      otherElement.insertAdjacentElement("beforebegin", element);
                                                      return;
                                                    }
                                                  this.closest('[type~="popover"]').querySelector('[key~="courseForumConversationParticipations--courseParticipations"]').insertAdjacentElement("beforeend", element);
                                                };
                                                window.setTimeout(() => {
                                                  this.oninput();
                                                });
                                              `}"
                                              />
                                              $${application.partials.userAvatar(
                                                {
                                                  user,
                                                },
                                              )}
                                              <div
                                                css="${css`
                                                  margin-top: var(--size--0-5);
                                                `}"
                                              >
                                                <span
                                                  key="courseForumConversationParticipations--courseParticipation--name"
                                                  javascript="${javascript`
                                                  this.name = ${user.name};
                                                `}"
                                                  >${user.name}</span
                                                >$${
                                                  courseParticipation.courseParticipationRole ===
                                                  "courseParticipationRoleInstructor"
                                                    ? html`<span
                                                        css="${css`
                                                          font-size: var(
                                                            --font-size--3
                                                          );
                                                          line-height: var(
                                                            --font-size--3--line-height
                                                          );
                                                          color: light-dark(
                                                            var(
                                                              --color--slate--600
                                                            ),
                                                            var(
                                                              --color--slate--400
                                                            )
                                                          );
                                                        `}"
                                                      >
                                                        (instructor)</span
                                                      >`
                                                    : html``
                                                }
                                              </div>
                                            </label>
                                          `;
                                        },
                                      )}
                                  </div>
                                  <div
                                    hidden
                                    class="hide-on-not-modified"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    <hr class="separator" />
                                    <div
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                      `}"
                                    >
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--blue"
                                        javascript="${javascript`
                                        this.onclick = () => {
                                          document.querySelector("body").click();
                                        };
                                      `}"
                                      >
                                        Update
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            `
                          : (() => {
                              const courseForumConversationParticipations =
                                application.database.all<{
                                  courseParticipation: number;
                                }>(
                                  sql`
                                  select "courseForumConversationParticipations"."courseParticipation" as "courseParticipation"
                                  from "courseForumConversationParticipations"
                                  join "courseParticipations" on "courseForumConversationParticipations"."courseParticipation" = "courseParticipations"."id"
                                  join "users" on "courseParticipations"."user" = "users"."id"
                                  where
                                    "courseForumConversationParticipations"."courseForumConversation" = ${request.state.courseForumConversation.id} and
                                    "courseForumConversationParticipations"."courseParticipation" != ${request.state.courseParticipation.id}
                                  order by
                                    "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' desc,
                                    "users"."name" asc;
                                `,
                                );
                              return courseForumConversationParticipations.length ===
                                0
                                ? html`
                                    <div>
                                      <span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--slate--500),
                                            var(--color--slate--500)
                                          );
                                        `}"
                                        >Visibility:</span
                                      >  ${
                                        request.state.courseForumConversation
                                          .courseForumConversationVisibility ===
                                        "courseForumConversationVisibilityEveryone"
                                          ? "Everyone"
                                          : request.state.courseForumConversation
                                                .courseForumConversationVisibility ===
                                              "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                            ? "Instructors and selected course participants"
                                            : request.state.courseForumConversation
                                                  .courseForumConversationVisibility ===
                                                "courseForumConversationVisibilityCourseForumConversationParticipations"
                                              ? "Selected course participants"
                                              : (() => {
                                                  throw new Error();
                                                })()
                                      }
                                    </div>
                                  `
                                : html`
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
                                        >Visibility:</span
                                      >  ${
                                        request.state.courseForumConversation
                                          .courseForumConversationVisibility ===
                                        "courseForumConversationVisibilityEveryone"
                                          ? "Everyone"
                                          : request.state.courseForumConversation
                                                .courseForumConversationVisibility ===
                                              "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                                            ? "Instructors and selected course participants"
                                            : request.state.courseForumConversation
                                                  .courseForumConversationVisibility ===
                                                "courseForumConversationVisibilityCourseForumConversationParticipations"
                                              ? "Selected course participants"
                                              : (() => {
                                                  throw new Error();
                                                })()
                                      } <i class="bi bi-chevron-down"></i>
                                    </button>
                                    <div
                                      type="popover"
                                      css="${css`
                                        max-height: var(--size--56);
                                        padding: var(--size--1) var(--size--2);
                                        margin: var(--size---1) var(--size---2);
                                        overflow: auto;
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--size--2);
                                      `}"
                                    >
                                      $${courseForumConversationParticipations.map(
                                        (courseForumConversationParticipation) => {
                                          const courseParticipation =
                                            application.database.get<{
                                              id: number;
                                              publicId: string;
                                              user: number;
                                              courseParticipationRole:
                                                | "courseParticipationRoleInstructor"
                                                | "courseParticipationRoleStudent";
                                            }>(
                                              sql`
                                              select
                                                "id",
                                                "publicId",
                                                "user",
                                                "courseParticipationRole"
                                              from "courseParticipations"
                                              where "id" = ${courseForumConversationParticipation.courseParticipation};
                                            `,
                                            );
                                          if (courseParticipation === undefined)
                                            throw new Error();
                                          const user =
                                            application.database.get<{
                                              id: number;
                                              publicId: string;
                                              name: string;
                                              avatarColor:
                                                | "red"
                                                | "orange"
                                                | "amber"
                                                | "yellow"
                                                | "lime"
                                                | "green"
                                                | "emerald"
                                                | "teal"
                                                | "cyan"
                                                | "sky"
                                                | "blue"
                                                | "indigo"
                                                | "violet"
                                                | "purple"
                                                | "fuchsia"
                                                | "pink"
                                                | "rose";
                                              avatarImage: string | null;
                                            }>(
                                              sql`
                                            select
                                              "id",
                                              "publicId",
                                              "name",
                                              "avatarColor",
                                              "avatarImage"
                                            from "users"
                                            where "id" = ${courseParticipation.user};
                                          `,
                                            );
                                          if (user === undefined)
                                            throw new Error();
                                          return html`
                                            <div
                                              css="${css`
                                                display: flex;
                                                gap: var(--size--2);
                                              `}"
                                            >
                                              $${application.partials.userAvatar(
                                                {
                                                  user,
                                                },
                                              )}
                                              <div
                                                css="${css`
                                                  margin-top: var(--size--0-5);
                                                `}"
                                              >
                                                ${user.name}$${
                                                  courseParticipation.courseParticipationRole ===
                                                  "courseParticipationRoleInstructor"
                                                    ? html`<span
                                                        css="${css`
                                                          font-size: var(
                                                            --font-size--3
                                                          );
                                                          line-height: var(
                                                            --font-size--3--line-height
                                                          );
                                                          color: light-dark(
                                                            var(
                                                              --color--slate--600
                                                            ),
                                                            var(
                                                              --color--slate--400
                                                            )
                                                          );
                                                        `}"
                                                      >
                                                        (instructor)</span
                                                      >`
                                                    : html``
                                                }
                                              </div>
                                            </div>
                                          `;
                                        },
                                      )}
                                    </div>
                                  `;
                            })()
                      }
                      $${
                        mayEditcourseForumConversation &&
                        request.state.courseParticipation
                          .courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                          ? html`
                              <button
                                type="button"
                                class="button button--rectangle button--transparent"
                                javascript="${javascript`
                                javascript.popover({ element: this, trigger: "click" });
                              `}"
                              >
                                <form>
                                  <span
                                    css="${css`
                                      color: light-dark(
                                        var(--color--slate--500),
                                        var(--color--slate--500)
                                      );
                                    `}"
                                    >Pin:</span
                                  >  <input
                                    type="radio"
                                    name="pinned"
                                    value="false"
                                    required
                                    $${
                                      Boolean(
                                        request.state.courseForumConversation.pinned,
                                      ) === false
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Unpinned</span
                                  ><input
                                    type="radio"
                                    name="pinned"
                                    value="true"
                                    required
                                    $${
                                      Boolean(
                                        request.state.courseForumConversation.pinned,
                                      ) === true
                                        ? html`checked`
                                        : html``
                                    }
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Pinned</span
                                  > <i class="bi bi-chevron-down"></i>
                                </form>
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
                                    this.closest('[type~="form"]').querySelector('[name="pinned"][value="false"]').click();
                                  };
                                `}"
                                >
                                  Unpinned
                                </button>
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                  this.onclick = () => {
                                    this.closest('[type~="form"]').querySelector('[name="pinned"][value="true"]').click();
                                  };
                                `}"
                                >
                                  Pinned
                                </button>
                              </div>
                            `
                          : Boolean(request.state.courseForumConversation.pinned) ===
                              true
                            ? html`
                                <div>
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
                    </div>
                    $${
                      request.state.courseForumConversationsTags.length > 0
                        ? (() => {
                            let courseForumConversationsTagsHTML = html``;
                            const courseForumConversationsTagsWithTagging =
                              request.state.courseForumConversationsTags.filter(
                                (courseForumConversationsTag) =>
                                  application.database.get(
                                    sql`
                                    select true
                                    from "courseForumConversationTaggings"
                                    where
                                      "courseForumConversation" = ${request.state.courseForumConversation!.id} and
                                      "courseForumConversationsTag" = ${courseForumConversationsTag.id};
                                  `,
                                  ) !== undefined,
                              );
                            if (mayEditcourseForumConversation)
                              courseForumConversationsTagsHTML += html`
                                <div>
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click", remainOpenWhileFocused: true });
                                  `}"
                                  >
                                    <span
                                      css="${css`
                                        color: light-dark(
                                          var(--color--slate--500),
                                          var(--color--slate--500)
                                        );
                                      `}"
                                      >Tags: <i class="bi bi-chevron-down"></i
                                    ></span>
                                  </button>
                                  <div
                                    type="popover"
                                    css="${css`
                                      display: flex;
                                      flex-direction: column;
                                      gap: var(--size--2);
                                    `}"
                                  >
                                    $${request.state.courseForumConversationsTags.map(
                                      (courseForumConversationsTag) => html`
                                        <label
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                        >
                                          <input
                                            type="checkbox"
                                            name="tags[]"
                                            value="${courseForumConversationsTag.publicId}"
                                            $${
                                              Boolean(
                                                request.state.course!
                                                  .courseForumConversationRequiresTagging,
                                              )
                                                ? html`required`
                                                : html``
                                            }
                                            $${
                                              courseForumConversationsTagsWithTagging.some(
                                                (
                                                  courseForumConversationsTagWithTagging,
                                                ) =>
                                                  courseForumConversationsTag.id ===
                                                  courseForumConversationsTagWithTagging.id,
                                              )
                                                ? html`checked`
                                                : html``
                                            }
                                            class="input--checkbox"
                                          />  ${courseForumConversationsTag.name}
                                        </label>
                                      `,
                                    )}
                                    <div
                                      hidden
                                      class="hide-on-not-modified"
                                      css="${css`
                                        font-size: var(--font-size--3);
                                        line-height: var(
                                          --font-size--3--line-height
                                        );
                                      `}"
                                    >
                                      <button
                                        type="submit"
                                        class="button button--rectangle button--blue"
                                        javascript="${javascript`
                                        this.onclick = () => {
                                          document.querySelector("body").click();
                                        };
                                      `}"
                                      >
                                        Update
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              `;
                            else if (
                              courseForumConversationsTagsWithTagging.length > 0
                            )
                              courseForumConversationsTagsHTML += html`
                                <div
                                  css="${css`
                                    color: light-dark(
                                      var(--color--slate--500),
                                      var(--color--slate--500)
                                    );
                                  `}"
                                >
                                  Tags:
                                </div>
                              `;
                            if (courseForumConversationsTagsWithTagging.length > 0)
                              courseForumConversationsTagsHTML += html`
                                <div
                                  css="${css`
                                    flex: 1;
                                  `}"
                                >
                                  ${courseForumConversationsTagsWithTagging
                                    .map(
                                      (courseForumConversationsTag) =>
                                        courseForumConversationsTag.name,
                                    )
                                    .join(" · ")}
                                </div>
                              `;
                            return courseForumConversationsTagsHTML !== html``
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
                                      display: flex;
                                      align-items: baseline;
                                    `} ${
                                      mayEditcourseForumConversation
                                        ? css`
                                            gap: var(--size--2-5);
                                          `
                                        : css`
                                            gap: var(--size--1-5);
                                          `
                                    }"
                                  >
                                    $${courseForumConversationsTagsHTML}
                                  </div>
                                `
                              : html``;
                          })()
                        : html``
                    }
                    <div
                      hidden
                      class="hide-on-not-modified"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                      `}"
                    >
                      <button
                        type="submit"
                        class="button button--rectangle button--blue"
                      >
                        Update
                      </button>
                    </div>
                  `;
                })()}
              </div>
              <div
                key="courseForumConversationMessages"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
                `}"
              >
                $${await Promise.all(
                  application.database
                    .all<{
                      id: number;
                      publicId: string;
                      createdByCourseParticipation: number | null;
                      createdAt: string;
                      updatedAt: string | null;
                      courseForumConversationMessageType:
                        | "courseForumConversationMessageTypeMessage"
                        | "courseForumConversationMessageTypeAnswer"
                        | "courseForumConversationMessageTypeFollowUpQuestion";
                      courseForumConversationMessageVisibility:
                        | "courseForumConversationMessageVisibilityEveryone"
                        | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
                      courseForumConversationMessageAnonymity:
                        | "courseForumConversationMessageAnonymityNone"
                        | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                        | "courseForumConversationMessageAnonymityEveryone";
                      sentViaEmail: number;
                      content: string;
                    }>(
                      sql`
                        select
                          "id",
                          "publicId",
                          "createdByCourseParticipation",
                          "createdAt",
                          "updatedAt",
                          "courseForumConversationMessageType",
                          "courseForumConversationMessageVisibility",
                          "courseForumConversationMessageAnonymity",
                          "sentViaEmail",
                          "content"
                        from "courseForumConversationMessages"
                        where
                          "courseForumConversation" = ${request.state.courseForumConversation!.id} ${
                            request.state.courseParticipation!
                              .courseParticipationRole !==
                            "courseParticipationRoleInstructor"
                              ? sql`
                                  and
                                  "courseForumConversationMessageVisibility" != 'courseForumConversationMessageVisibilityCourseParticipationRoleInstructors'
                                `
                              : sql``
                          }
                        order by "id" asc;
                      `,
                    )
                    .map(async (courseForumConversationMessage) => {
                      const mayEditcourseForumConversationMessage =
                        request.state.course!.courseState ===
                          "courseStateActive" &&
                        (request.state.courseParticipation!
                          .courseParticipationRole ===
                          "courseParticipationRoleInstructor" ||
                          request.state.courseParticipation!.id ===
                            courseForumConversationMessage.createdByCourseParticipation);
                      const courseForumConversationMessageAnonymous =
                        courseForumConversationMessage.createdByCourseParticipation !==
                          request.state.courseParticipation!.id &&
                        ((courseForumConversationMessage.courseForumConversationMessageAnonymity ===
                          "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
                          request.state.courseParticipation!
                            .courseParticipationRole ===
                            "courseParticipationRoleStudent") ||
                          courseForumConversationMessage.courseForumConversationMessageAnonymity ===
                            "courseForumConversationMessageAnonymityEveryone");
                      const courseForumConversationMessageCreatedByCourseParticipation =
                        typeof courseForumConversationMessage.createdByCourseParticipation ===
                          "number" && !courseForumConversationMessageAnonymous
                          ? application.database.get<{
                              user: number;
                              courseParticipationRole:
                                | "courseParticipationRoleInstructor"
                                | "courseParticipationRoleStudent";
                            }>(
                              sql`
                                select
                                  "user",
                                  "courseParticipationRole"
                                from "courseParticipations"
                                where "id" = ${courseForumConversationMessage.createdByCourseParticipation};
                              `,
                            )
                          : undefined;
                      const courseForumConversationMessageCreatedByUser =
                        typeof courseForumConversationMessageCreatedByCourseParticipation ===
                        "object"
                          ? application.database.get<{
                              id: number;
                              publicId: string;
                              name: string;
                              avatarColor:
                                | "red"
                                | "orange"
                                | "amber"
                                | "yellow"
                                | "lime"
                                | "green"
                                | "emerald"
                                | "teal"
                                | "cyan"
                                | "sky"
                                | "blue"
                                | "indigo"
                                | "violet"
                                | "purple"
                                | "fuchsia"
                                | "pink"
                                | "rose";
                              avatarImage: string | null;
                            }>(
                              sql`
                                select
                                  "id",
                                  "publicId",
                                  "name",
                                  "avatarColor",
                                  "avatarImage"
                                from "users"
                                where "id" = ${courseForumConversationMessageCreatedByCourseParticipation.user};
                              `,
                            )
                          : undefined;
                      return html`
                        <div
                          key="courseForumConversationMessage /courses/${
                            request.state.course!.publicId
                          }/forum/${
                            request.state.courseForumConversation!.publicId
                          }/messages/${courseForumConversationMessage.publicId}"
                          css="${css`
                            padding: var(--size--2);
                            border-radius: var(--border-radius--1);
                            margin: var(--size---2);
                            display: flex;
                            gap: var(--size--2);
                          `} ${
                            request.search.message ===
                            courseForumConversationMessage.publicId
                              ? css`
                                  background-color: light-dark(
                                    var(--color--slate--50),
                                    var(--color--slate--950)
                                  );
                                `
                              : css``
                          }"
                          javascript="${javascript`
                            this.content = ${courseForumConversationMessage.content};
                          `}"
                        >
                          <div key="courseForumConversationMessage--sidebar">
                            <div
                              css="${css`
                                display: flex;
                                align-items: center;
                              `}"
                            >
                              $${
                                application.database.get(
                                  sql`
                                  select true
                                  from "courseForumConversationMessageViews"
                                  where
                                    "courseForumConversationMessage" = ${courseForumConversationMessage.id} and
                                    "courseParticipation" = ${request.state.courseParticipation!.id};
                                `,
                                ) === undefined
                                  ? html`
                                      <div
                                        key="courseForumConversationMessage--sidebar--courseForumConversationMessageView"
                                        css="${css`
                                          font-size: var(--size--1-5);
                                          color: light-dark(
                                            var(--color--blue--500),
                                            var(--color--blue--500)
                                          );
                                          position: absolute;
                                          translate: calc(
                                            -100% - var(--size--1)
                                          );
                                          transition-property: var(
                                            --transition-property--opacity
                                          );
                                          transition-delay: 2s;
                                          transition-duration: var(
                                            --transition-duration--150
                                          );
                                          transition-timing-function: var(
                                            --transition-timing-function--ease-in-out
                                          );
                                          &[state~="viewed"] {
                                            visibility: hidden;
                                            opacity: var(--opacity--0);
                                          }
                                        `}"
                                        javascript="${javascript`
                                        if (this.intersectionObserver !== undefined) return;
                                        this.intersectionObserver = new IntersectionObserver(async (entries) => {
                                          if (entries[0].isIntersecting === false) return;
                                          this.intersectionObserver.disconnect();
                                          javascript.stateAdd(this, "viewed");
                                          await fetch(${`/courses/${
                                            request.state.course!.publicId
                                          }/forum/${
                                            request.state.courseForumConversation!
                                              .publicId
                                          }/messages/${courseForumConversationMessage.publicId}/view`}, {
                                            method: "POST",
                                            headers: { "CSRF-Protection": "true" },
                                          });
                                        }, { root: this.closest('[key~="main--main"]') });
                                        this.intersectionObserver.observe(this);
                                        this.onremove = () => {
                                          this.intersectionObserver.disconnect();
                                        };
                                      `}"
                                      >
                                        <i class="bi bi-circle-fill"></i>
                                      </div>
                                    `
                                  : html``
                              }
                              <div
                                key="courseForumConversationMessage--sidebar--userAvatar"
                              >
                                $${application.partials.userAvatar({
                                  user: courseForumConversationMessageAnonymous
                                    ? "anonymous"
                                    : (courseForumConversationMessageCreatedByUser ??
                                      "courseParticipationDeleted"),
                                  size: 9,
                                })}
                              </div>
                            </div>
                          </div>
                          <div
                            key="courseForumConversationMessage--main"
                            css="${css`
                              flex: 1;
                              min-width: var(--size--0);
                              display: flex;
                              flex-direction: column;
                              gap: var(--size--1);
                            `}"
                          >
                            <div
                              key="courseForumConversationMessage--main--header"
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
                                key="courseForumConversationMessage--main--header--byline"
                                css="${css`
                                  flex: 1;
                                `}"
                              >
                                $${(() => {
                                  let courseForumConversationMessageMainHeaderBylineHTMLs: HTML[] =
                                    [];
                                  courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                    html`<span
                                        css="${css`
                                          font-weight: 600;
                                        `}"
                                        >${
                                          courseForumConversationMessageAnonymous
                                            ? "Anonymous"
                                            : (courseForumConversationMessageCreatedByUser?.name ??
                                              "Deleted course participant")
                                        }</span
                                      >${
                                        !courseForumConversationMessageAnonymous
                                          ? `${
                                              courseForumConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                              "courseParticipationRoleInstructor"
                                                ? " (instructor)"
                                                : ""
                                            }${
                                              courseForumConversationMessage.courseForumConversationMessageAnonymity ===
                                              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                                                ? " (anonymous to students)"
                                                : courseForumConversationMessage.courseForumConversationMessageAnonymity ===
                                                    "courseForumConversationMessageAnonymityEveryone"
                                                  ? " (anonymous to everyone)"
                                                  : ""
                                            }`
                                          : ``
                                      }`,
                                  );
                                  courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                    html`<span
                                        javascript="${javascript`
                                          javascript.popover({ element: this });
                                        `}"
                                        >${utilities.capitalize(utilities.zonedDateTimeToRelativeTimeFormat(Temporal.Instant.from(courseForumConversationMessage.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone)))}</span
                                      ><span type="popover"
                                        >${utilities.formatDateTime(Temporal.Instant.from(courseForumConversationMessage.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone))}</span
                                      ></span
                                      >$${
                                        typeof courseForumConversationMessage.updatedAt ===
                                        "string"
                                          ? html` (updated
                                              <span
                                                javascript="${javascript`
                                                  javascript.popover({ element: this });
                                                `}"
                                                >${utilities.zonedDateTimeToRelativeTimeFormat(Temporal.Instant.from(courseForumConversationMessage.updatedAt).toZonedDateTimeISO(request.state.userSession!.timeZone), { preposition: true })}</span
                                              ><span type="popover"
                                                >${utilities.formatDateTime(Temporal.Instant.from(courseForumConversationMessage.updatedAt).toZonedDateTimeISO(request.state.userSession!.timeZone))}</span
                                              >)`
                                          : html``
                                      }`,
                                  );
                                  if (
                                    request.state.courseForumConversation!
                                      .courseForumConversationType ===
                                    "courseForumConversationTypeQuestion"
                                  ) {
                                    if (
                                      courseForumConversationMessage.courseForumConversationMessageType ===
                                      "courseForumConversationMessageTypeMessage"
                                    )
                                      "NOOP";
                                    else if (
                                      courseForumConversationMessage.courseForumConversationMessageType ===
                                      "courseForumConversationMessageTypeAnswer"
                                    )
                                      courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                        html`<span
                                          css="${css`
                                            font-weight: 700;
                                            color: light-dark(
                                              var(--color--green--500),
                                              var(--color--green--500)
                                            );
                                          `}"
                                          >Answer</span
                                        >`,
                                      );
                                    else if (
                                      courseForumConversationMessage.courseForumConversationMessageType ===
                                      "courseForumConversationMessageTypeFollowUpQuestion"
                                    )
                                      courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                        html`<span
                                          css="${css`
                                            font-weight: 700;
                                            color: light-dark(
                                              var(--color--red--500),
                                              var(--color--red--500)
                                            );
                                          `}"
                                          >Follow-up question</span
                                        >`,
                                      );
                                    else throw new Error();
                                  }
                                  if (
                                    courseForumConversationMessage.courseForumConversationMessageVisibility ===
                                    "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
                                  )
                                    courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                      html`<span
                                        css="${css`
                                          font-weight: 700;
                                          color: light-dark(
                                            var(--color--blue--500),
                                            var(--color--blue--500)
                                          );
                                        `}"
                                        >Visible by instructors only</span
                                      >`,
                                    );
                                  if (
                                    application.database.get(
                                      sql`
                                        select true
                                        from "courseForumConversationMessageLikes"
                                        join "courseParticipations" on
                                          "courseForumConversationMessageLikes"."courseParticipation" = "courseParticipations"."id" and
                                          "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor'
                                        where "courseForumConversationMessageLikes"."courseForumConversationMessage" = ${courseForumConversationMessage.id}
                                        limit 1;
                                      `,
                                    ) !== undefined
                                  )
                                    courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                      html`<span
                                        css="${css`
                                          font-weight: 700;
                                          color: light-dark(
                                            var(--color--green--500),
                                            var(--color--green--500)
                                          );
                                        `}"
                                        >Liked by instructor</span
                                      >`,
                                    );
                                  if (
                                    Boolean(
                                      courseForumConversationMessage.sentViaEmail,
                                    ) === true
                                  )
                                    courseForumConversationMessageMainHeaderBylineHTMLs.push(
                                      html`<span>Sent via email</span>`,
                                    );
                                  return courseForumConversationMessageMainHeaderBylineHTMLs.join(
                                    " · ",
                                  );
                                })()}
                              </div>
                              <div
                                key="courseForumConversationMessage--main--header--menu"
                              >
                                <button
                                  type="button"
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
                                        await navigator.clipboard.writeText(${`https://${application.userConfiguration.hostname}/courses/${request.state.course!.publicId}/forum/${request.state.courseForumConversation!.publicId}?${new URLSearchParams({ message: courseForumConversationMessage.publicId }).toString()}`});
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
                                    request.state.course!.courseState ===
                                    "courseStateActive"
                                      ? html`
                                          <button
                                            type="button"
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                            this.onclick = () => {
                                              const element = this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage--new"] [key~="courseForumConversationMessageContentEditor--textarea"]');
                                              element.focus();
                                              element.click();
                                              const previousSelectionEnd = element.selectionEnd;
                                              element.selectionStart = element.selectionEnd;
                                              document.execCommand("insertText", false, (0 < element.selectionStart ? "\\n\\n" : "") + ${`> Reply to #${request.state.courseForumConversation!.publicId}/${courseForumConversationMessage.publicId}\n>\n> `} + this.closest('[key~="courseForumConversationMessage"]').content.replaceAll("\\n", "\\n> ") + "\\n\\n");
                                              element.selectionStart = element.selectionEnd = previousSelectionEnd;
                                            };
                                          `}"
                                          >
                                            Reply
                                          </button>
                                        `
                                      : html``
                                  }
                                  $${
                                    mayEditcourseForumConversationMessage
                                      ? html`
                                          <button
                                            type="button"
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                            this.onclick = async () => {
                                              if (this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--body"]').getAttribute("state") === null) {
                                                this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--body"]').setAttribute("state", "loading");
                                                javascript.mount(
                                                  this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--edit"]').firstElementChild,
                                                  await (
                                                    await fetch(
                                                      ${`/courses/${request.state.course!.publicId}/forum/${request.state.courseForumConversation!.publicId}/messages/${courseForumConversationMessage.publicId}/edit`}
                                                    )
                                                  ).text()
                                                );
                                                this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--body"]').setAttribute("state", "edit");
                                              }
                                              this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--edit"] [name="content"]').click();
                                              this.closest('[key~="courseForumConversationMessage"]').querySelector('[key~="courseForumConversationMessage--main--content--edit"] [name="content"]').focus();
                                            };
                                          `}"
                                          >
                                            Edit
                                          </button>
                                        `
                                      : html``
                                  }
                                  $${
                                    mayEditcourseForumConversationMessage &&
                                    request.state.courseParticipation!
                                      .courseParticipationRole ===
                                      "courseParticipationRoleInstructor" &&
                                    courseForumConversationMessage.id !==
                                      firstcourseForumConversationMessage.id
                                      ? html`
                                          <button
                                            type="button"
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                            javascript.popover({ element: this, trigger: "click" });
                                          `}"
                                          >
                                            Delete
                                          </button>
                                          <div
                                            type="form popover"
                                            method="DELETE"
                                            action="/courses/${
                                              request.state.course!.publicId
                                            }/forum/${
                                              request.state.courseForumConversation!
                                                .publicId
                                            }/messages/${courseForumConversationMessage.publicId}"
                                            css="${css`
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--size--2);
                                            `}"
                                          >
                                            <div
                                              css="${css`
                                                font-size: var(--font-size--3);
                                                line-height: var(
                                                  --font-size--3--line-height
                                                );
                                                font-weight: 600;
                                                color: light-dark(
                                                  var(--color--red--500),
                                                  var(--color--red--500)
                                                );
                                              `}"
                                            >
                                              <i
                                                class="bi bi-exclamation-triangle-fill"
                                              ></i
                                              > This action cannot be reverted.
                                            </div>
                                            <div>
                                              <button
                                                type="submit"
                                                class="button button--rectangle button--red"
                                                css="${css`
                                                  font-size: var(
                                                    --font-size--3
                                                  );
                                                  line-height: var(
                                                    --font-size--3--line-height
                                                  );
                                                `}"
                                              >
                                                Delete message
                                              </button>
                                            </div>
                                          </div>
                                        `
                                      : html``
                                  }
                                </div>
                              </div>
                            </div>
                            <div
                              key="courseForumConversationMessage--main--content--body"
                            >
                              <div
                                key="courseForumConversationMessage--main--content--show"
                                css="${css`
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--size--1);
                                  [key~="courseForumConversationMessage--main--content--body"][state]
                                    & {
                                    display: none;
                                  }
                                `}"
                              >
                                <div
                                  key="courseForumConversationMessage--main--content--show--content"
                                  javascript="${javascript`
                                    let popoverElementBoundingClientRect;
                                    const popover = javascript.popover({
                                      element: { getBoundingClientRect: () => popoverElementBoundingClientRect },
                                      target: this.nextElementSibling,
                                      trigger: "none",
                                    });
                                    this.onpointerup = (event) => {
                                      window.setTimeout(() => {
                                        const selection = document.getSelection();
                                        if (selection === null) return;
                                        let startNode;
                                        let endNode;
                                        for (let rangeIndex = 0; rangeIndex < selection.rangeCount; rangeIndex++) {
                                          const range = selection.getRangeAt(rangeIndex);
                                          if (range.collapsed) continue;
                                          if (
                                            startNode === undefined ||
                                            range.startContainer.compareDocumentPosition(startNode) & range.startContainer.DOCUMENT_POSITION_FOLLOWING
                                          )
                                            startNode = range.startContainer;
                                          if (
                                            endNode === undefined ||
                                            endNode.compareDocumentPosition(range.endContainer) & endNode.DOCUMENT_POSITION_FOLLOWING
                                          )
                                            endNode = range.endContainer;
                                        }
                                        if (
                                          startNode === undefined ||
                                          !this.contains(startNode) ||
                                          endNode === undefined ||
                                          !this.contains(endNode)
                                        ) return;
                                        const startElement = (startNode.nodeType === startNode.ELEMENT_NODE ? startNode : startNode.parentElement).closest("[data-position]");
                                        const endElement = (endNode.nodeType === endNode.ELEMENT_NODE ? endNode : endNode.parentElement).closest("[data-position]");
                                        if (startElement === null || endElement === null) return;
                                        this.nextElementSibling.querySelector('[key~="quoteReply"]').quote = this.closest('[key~="courseForumConversationMessage"]').content.slice(
                                          JSON.parse(startElement.getAttribute("data-position")).start,
                                          JSON.parse(endElement.getAttribute("data-position")).end,
                                        );
                                        popoverElementBoundingClientRect = DOMRect.fromRect({
                                          x: event.clientX - 10,
                                          y: event.clientY - 10,
                                          width: 20,
                                          height: 20,
                                        });
                                        popover.showPopover();
                                        const abortController = new AbortController();
                                        for (const eventType of ["pointerdown", "keydown"])
                                          document.addEventListener(
                                            eventType,
                                            () => {
                                              abortController.abort();
                                              popover.hidePopover();
                                            },
                                            { signal: abortController.signal },
                                          );
                                      });
                                    };
                                  `}"
                                >
                                  $${await application.partials.courseForumConversationMessageContentProcessor(
                                    {
                                      course: request.state.course!,
                                      courseParticipation:
                                        request.state.courseParticipation!,
                                      courseForumConversation:
                                        request.state.courseForumConversation!,
                                      courseForumConversationMessage,
                                    },
                                  )}
                                </div>
                                <div
                                  type="popover"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--2);
                                  `}"
                                >
                                  <button
                                    key="quoteReply"
                                    type="button"
                                    class="button button--rectangle button--transparent button--dropdown-menu"
                                    javascript="${javascript`
                                      this.onclick = () => {
                                        if (typeof this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage--new"] [key~="courseForumConversationMessageContentEditor"]').getAttribute("state") === "string")
                                          this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage--new"] [key~="courseForumConversationMessageContentEditor--preview--button"]').click();
                                        const element = this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage--new"] [key~="courseForumConversationMessageContentEditor--textarea"]');
                                        element.focus();
                                        element.click();
                                        const previousSelectionEnd = element.selectionEnd;
                                        element.selectionStart = element.selectionEnd;
                                        document.execCommand("insertText", false, (0 < element.selectionStart ? "\\n\\n" : "") + "> " + this.quote.replaceAll("\\n", "\\n> ") + "\\n\\n");
                                        element.selectionStart = element.selectionEnd = previousSelectionEnd;
                                      };
                                    `}"
                                  >
                                    Quote reply
                                  </button>
                                </div>
                                $${(() => {
                                  let courseForumConversationMessageMainContentShowFooterHTML = html``;
                                  if (
                                    request.state.course!.courseState ===
                                    "courseStateActive"
                                  )
                                    courseForumConversationMessageMainContentShowFooterHTML +=
                                      application.database.get(
                                        sql`
                                          select true
                                          from "courseForumConversationMessageLikes"
                                          where
                                            "courseForumConversationMessage" = ${courseForumConversationMessage.id} and
                                            "courseParticipation" = ${request.state.courseParticipation!.id};
                                        `,
                                      ) === undefined
                                        ? html`
                                            <div
                                              key="courseForumConversationMessage--main--content--show--footer--like"
                                              type="form"
                                              method="POST"
                                              action="/courses/${
                                                request.state.course!.publicId
                                              }/forum/${
                                                request.state
                                                  .courseForumConversation!.publicId
                                              }/messages/${courseForumConversationMessage.publicId}/like"
                                            >
                                              <button
                                                type="submit"
                                                class="button button--rectangle button--transparent"
                                              >
                                                Like
                                              </button>
                                            </div>
                                          `
                                        : html`
                                            <div
                                              key="courseForumConversationMessage--main--content--show--footer--like"
                                              type="form"
                                              method="DELETE"
                                              action="/courses/${
                                                request.state.course!.publicId
                                              }/forum/${
                                                request.state
                                                  .courseForumConversation!.publicId
                                              }/messages/${courseForumConversationMessage.publicId}/like"
                                            >
                                              <button
                                                type="submit"
                                                class="button button--rectangle button--transparent"
                                                css="${css`
                                                  color: light-dark(
                                                    var(--color--blue--500),
                                                    var(--color--blue--500)
                                                  );
                                                `}"
                                              >
                                                Liked
                                              </button>
                                            </div>
                                          `;
                                  const courseForumConversationMessageLikes =
                                    application.database.all<{
                                      courseParticipation: number | null;
                                    }>(
                                      sql`
                                        select "courseParticipation"
                                        from "courseForumConversationMessageLikes"
                                        where "courseForumConversationMessage" = ${courseForumConversationMessage.id}
                                        order by "id" asc;
                                      `,
                                    );
                                  if (courseForumConversationMessageLikes.length > 0)
                                    courseForumConversationMessageMainContentShowFooterHTML += html`
                                      <button
                                        key="courseForumConversationMessage--main--content--show--footer--likes"
                                        type="button"
                                        class="button button--rectangle button--transparent"
                                        javascript="${javascript`
                                          javascript.popover({ element: this, trigger: "click" });
                                        `}"
                                      >
                                        ${String(
                                          courseForumConversationMessageLikes.length,
                                        )}
                                        like${
                                          courseForumConversationMessageLikes.length !==
                                          1
                                            ? "s"
                                            : ""
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
                                        $${courseForumConversationMessageLikes.map(
                                          (courseForumConversationMessageLike) => {
                                            const courseForumConversationMessageLikeCourseParticipation =
                                              typeof courseForumConversationMessageLike.courseParticipation ===
                                              "number"
                                                ? application.database.get<{
                                                    user: number;
                                                    courseParticipationRole:
                                                      | "courseParticipationRoleInstructor"
                                                      | "courseParticipationRoleStudent";
                                                  }>(
                                                    sql`
                                                      select
                                                        "user",
                                                        "courseParticipationRole"
                                                      from "courseParticipations"
                                                      where "id" = ${courseForumConversationMessageLike.courseParticipation};
                                                    `,
                                                  )
                                                : undefined;
                                            const courseForumConversationMessageLikeUser =
                                              courseForumConversationMessageLikeCourseParticipation !==
                                              undefined
                                                ? application.database.get<{
                                                    id: number;
                                                    publicId: string;
                                                    name: string;
                                                    avatarColor:
                                                      | "red"
                                                      | "orange"
                                                      | "amber"
                                                      | "yellow"
                                                      | "lime"
                                                      | "green"
                                                      | "emerald"
                                                      | "teal"
                                                      | "cyan"
                                                      | "sky"
                                                      | "blue"
                                                      | "indigo"
                                                      | "violet"
                                                      | "purple"
                                                      | "fuchsia"
                                                      | "pink"
                                                      | "rose";
                                                    avatarImage: string | null;
                                                  }>(
                                                    sql`
                                                      select
                                                        "id",
                                                        "publicId",
                                                        "name",
                                                        "avatarColor",
                                                        "avatarImage"
                                                      from "users"
                                                      where "id" = ${courseForumConversationMessageLikeCourseParticipation.user};
                                                    `,
                                                  )
                                                : undefined;
                                            return html`
                                              <div
                                                css="${css`
                                                  display: flex;
                                                  gap: var(--size--2);
                                                `}"
                                              >
                                                $${application.partials.userAvatar(
                                                  {
                                                    user:
                                                      courseForumConversationMessageLikeUser ??
                                                      "courseParticipationDeleted",
                                                  },
                                                )}
                                                <div
                                                  css="${css`
                                                    margin-top: var(
                                                      --size--0-5
                                                    );
                                                  `}"
                                                >
                                                  ${
                                                    courseForumConversationMessageLikeUser?.name ??
                                                    "Deleted course participant"
                                                  }$${
                                                    courseForumConversationMessageLikeCourseParticipation?.courseParticipationRole ===
                                                    "courseParticipationRoleInstructor"
                                                      ? html`<span
                                                          css="${css`
                                                            font-size: var(
                                                              --font-size--3
                                                            );
                                                            line-height: var(
                                                              --font-size--3--line-height
                                                            );
                                                            color: light-dark(
                                                              var(
                                                                --color--slate--600
                                                              ),
                                                              var(
                                                                --color--slate--400
                                                              )
                                                            );
                                                          `}"
                                                        >
                                                          (instructor)</span
                                                        >`
                                                      : html``
                                                  }
                                                </div>
                                              </div>
                                            `;
                                          },
                                        )}
                                      </div>
                                    `;
                                  if (
                                    request.state.courseParticipation!
                                      .courseParticipationRole ===
                                    "courseParticipationRoleInstructor"
                                  ) {
                                    const courseForumConversationMessageViews =
                                      application.database.all<{
                                        createdAt: string;
                                        courseParticipation: number | null;
                                      }>(
                                        sql`
                                          select "createdAt", "courseParticipation"
                                          from "courseForumConversationMessageViews"
                                          where "courseForumConversationMessage" = ${courseForumConversationMessage.id}
                                          order by "id" asc;
                                        `,
                                      );
                                    courseForumConversationMessageMainContentShowFooterHTML +=
                                      courseForumConversationMessageViews.length > 0
                                        ? html`
                                            <button
                                              key="courseForumConversationMessage--main--content--show--footer--views"
                                              type="button"
                                              class="button button--rectangle button--transparent"
                                              javascript="${javascript`
                                                javascript.popover({ element: this, trigger: "click" });
                                              `}"
                                            >
                                              ${String(
                                                courseForumConversationMessageViews.length,
                                              )}
                                              view${
                                                courseForumConversationMessageViews.length !==
                                                1
                                                  ? "s"
                                                  : ""
                                              } <i
                                                class="bi bi-chevron-down"
                                              ></i>
                                            </button>
                                            <div
                                              type="popover"
                                              css="${css`
                                                display: flex;
                                                flex-direction: column;
                                                gap: var(--size--2);
                                              `}"
                                            >
                                              $${courseForumConversationMessageViews.map(
                                                (
                                                  courseForumConversationMessageView,
                                                ) => {
                                                  const courseForumConversationMessageViewCourseParticipation =
                                                    typeof courseForumConversationMessageView.courseParticipation ===
                                                    "number"
                                                      ? application.database.get<{
                                                          user: number;
                                                          courseParticipationRole:
                                                            | "courseParticipationRoleInstructor"
                                                            | "courseParticipationRoleStudent";
                                                        }>(
                                                          sql`
                                                            select
                                                              "user",
                                                              "courseParticipationRole"
                                                            from "courseParticipations"
                                                            where "id" = ${courseForumConversationMessageView.courseParticipation};
                                                          `,
                                                        )
                                                      : undefined;
                                                  const courseForumConversationMessageViewUser =
                                                    courseForumConversationMessageViewCourseParticipation !==
                                                    undefined
                                                      ? application.database.get<{
                                                          id: number;
                                                          publicId: string;
                                                          name: string;
                                                          avatarColor:
                                                            | "red"
                                                            | "orange"
                                                            | "amber"
                                                            | "yellow"
                                                            | "lime"
                                                            | "green"
                                                            | "emerald"
                                                            | "teal"
                                                            | "cyan"
                                                            | "sky"
                                                            | "blue"
                                                            | "indigo"
                                                            | "violet"
                                                            | "purple"
                                                            | "fuchsia"
                                                            | "pink"
                                                            | "rose";
                                                          avatarImage:
                                                            string | null;
                                                        }>(
                                                          sql`
                                                            select
                                                              "id",
                                                              "publicId",
                                                              "name",
                                                              "avatarColor",
                                                              "avatarImage"
                                                            from "users"
                                                            where "id" = ${courseForumConversationMessageViewCourseParticipation.user};
                                                          `,
                                                        )
                                                      : undefined;
                                                  return html`
                                                    <div
                                                      css="${css`
                                                        display: flex;
                                                        gap: var(--size--2);
                                                      `}"
                                                    >
                                                      $${application.partials.userAvatar(
                                                        {
                                                          user:
                                                            courseForumConversationMessageViewUser ??
                                                            "courseParticipationDeleted",
                                                        },
                                                      )}
                                                      <div
                                                        css="${css`
                                                          margin-top: var(
                                                            --size--0-5
                                                          );
                                                        `}"
                                                      >
                                                        ${
                                                          courseForumConversationMessageViewUser?.name ??
                                                          "Deleted course participant"
                                                        }<span
                                                          css="${css`
                                                            font-size: var(
                                                              --font-size--3
                                                            );
                                                            line-height: var(
                                                              --font-size--3--line-height
                                                            );
                                                            color: light-dark(
                                                              var(
                                                                --color--slate--600
                                                              ),
                                                              var(
                                                                --color--slate--400
                                                              )
                                                            );
                                                          `}"
                                                          >${
                                                            courseForumConversationMessageViewCourseParticipation?.courseParticipationRole ===
                                                            "courseParticipationRoleInstructor"
                                                              ? " (instructor)"
                                                              : ""
                                                          } ·
                                                          <span
                                                            javascript="${javascript`
                                                              javascript.popover({ element: this });
                                                            `}"
                                                            >${utilities.capitalize(utilities.zonedDateTimeToRelativeTimeFormat(Temporal.Instant.from(courseForumConversationMessageView.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone)))}</span
                                                          ><span type="popover"
                                                            >${utilities.formatDateTime(Temporal.Instant.from(courseForumConversationMessageView.createdAt).toZonedDateTimeISO(request.state.userSession!.timeZone))}</span
                                                          ></span
                                                        >
                                                      </div>
                                                    </div>
                                                  `;
                                                },
                                              )}
                                            </div>
                                          `
                                        : html`
                                            <div
                                              key="courseForumConversationMessage--main--content--show--footer--views"
                                            >
                                              0 views
                                            </div>
                                          `;
                                  }
                                  return courseForumConversationMessageMainContentShowFooterHTML !==
                                    html``
                                    ? html`
                                        <div
                                          key="courseForumConversationMessage--main--content--show--footer"
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
                                            display: flex;
                                            align-items: baseline;
                                            flex-wrap: wrap;
                                            column-gap: var(--size--4);
                                            row-gap: var(--size--2);
                                          `}"
                                        >
                                          $${courseForumConversationMessageMainContentShowFooterHTML}
                                        </div>
                                      `
                                    : html``;
                                })()}
                              </div>
                              $${
                                mayEditcourseForumConversationMessage
                                  ? html`
                                      <div
                                        key="courseForumConversationMessage--main--content--loading"
                                        css="${css`
                                          font-size: var(--size--12);
                                          color: light-dark(
                                            var(--color--slate--600),
                                            var(--color--slate--400)
                                          );
                                          height: var(--size--44);
                                          display: flex;
                                          justify-content: center;
                                          align-items: center;
                                          animation: var(--animation--pulse);
                                          [key~="courseForumConversationMessage--main--content--body"]:not(
                                              [state~="loading"]
                                            )
                                            & {
                                            display: none;
                                          }
                                        `}"
                                      >
                                        <i class="bi bi-three-dots"></i>
                                      </div>
                                      <div
                                        key="courseForumConversationMessage--main--content--edit"
                                        css="${css`
                                          [key~="courseForumConversationMessage--main--content--body"]:not(
                                              [state~="edit"]
                                            )
                                            & {
                                            display: none;
                                          }
                                        `}"
                                      >
                                        <div></div>
                                      </div>
                                    `
                                  : html``
                              }
                            </div>
                          </div>
                        </div>
                      `;
                    }),
                )}
                <div
                  key="courseForumConversationMessage latencyCompensation"
                  hidden
                  css="${css`
                    display: flex;
                    gap: var(--size--2);
                    animation: var(--animation--pulse);
                  `}"
                  javascript="${javascript`
                    if (${!request.liveConnection}) this.hidden = true;
                  `}"
                >
                  <div key="courseForumConversationMessage--sidebar">
                    <div key="courseForumConversationMessage--sidebar--userAvatar">
                      $${application.partials.userAvatar({
                        user: request.state.user,
                        size: 9,
                      })}
                    </div>
                  </div>
                  <div
                    key="courseForumConversationMessage--main"
                    css="${css`
                      flex: 1;
                      min-width: var(--size--0);
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--1);
                    `}"
                  >
                    <div
                      key="courseForumConversationMessage--main--header"
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
                        key="courseForumConversationMessage--main--header--byline"
                        css="${css`
                          flex: 1;
                        `}"
                      >
                        <span
                          css="${css`
                            font-weight: 600;
                          `}"
                          >${request.state.user.name}</span
                        > · Sending…
                      </div>
                    </div>
                    <div
                      key="courseForumConversationMessage--main--content--show"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--1);
                      `}"
                    >
                      <div
                        key="courseForumConversationMessage--main--content--show--content"
                        css="${css`
                          white-space: pre-line;
                        `}"
                        javascript="${javascript`
                          this.morph = false;
                        `}"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              $${
                request.state.course.courseState === "courseStateActive"
                  ? (() => {
                      const courseForumConversationMessageDraft =
                        application.database.get<{
                          courseForumConversationMessageType:
                            | "courseForumConversationMessageTypeMessage"
                            | "courseForumConversationMessageTypeAnswer"
                            | "courseForumConversationMessageTypeFollowUpQuestion";
                          courseForumConversationMessageVisibility:
                            | "courseForumConversationMessageVisibilityEveryone"
                            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
                          courseForumConversationMessageAnonymity:
                            | "courseForumConversationMessageAnonymityNone"
                            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                            | "courseForumConversationMessageAnonymityEveryone";
                          content: string;
                        }>(
                          sql`
                          select
                            "courseForumConversationMessageType",
                            "courseForumConversationMessageVisibility",
                            "courseForumConversationMessageAnonymity",
                            "content"
                          from "courseForumConversationMessageDrafts"
                          where
                            "courseForumConversation" = ${request.state.courseForumConversation.id} and
                            "createdByCourseParticipation" = ${request.state.courseParticipation.id};
                        `,
                        );
                      return html`
                        <div
                          type="form"
                          key="courseForumConversationMessage--new"
                          method="POST"
                          action="/courses/${
                            request.state.course.publicId
                          }/forum/${
                            request.state.courseForumConversation.publicId
                          }/messages"
                          css="${css`
                            display: flex;
                            flex-direction: column;
                            gap: var(--size--2);
                          `}"
                          javascript="${javascript`
                          this.isModified = false;
                          this.oninput = utilities.throttle(async () => {
                            await fetch(${`/courses/${
                              request.state.course.publicId
                            }/forum/${request.state.courseForumConversation.publicId}/messages/draft`}, {
                              method: "POST",
                              headers: { "CSRF-Protection": "true" },
                              body: new URLSearchParams(javascript.serialize(this)),
                            });
                          });
                          this.onsubmit = async () => {
                            this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage"][key~="latencyCompensation"] [key~="courseForumConversationMessage--main--content--show--content"]').textContent = this.querySelector('[name="content"]').value.trim();
                            this.closest('[key~="courseForumConversation"]').querySelector('[key~="courseForumConversationMessage"][key~="latencyCompensation"]').hidden = false;
                            this.querySelector('[name="content"]').value = "";
                            if (typeof this.querySelector('[key~="courseForumConversationMessageContentEditor"]').getAttribute("state") === "string")
                              this.querySelector('[key~="courseForumConversationMessageContentEditor--preview--button"]').click();
                            await this.oninput.promise;
                          };
                        `}"
                        >
                          $${
                            request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                              ? (() => {
                                  const drafts = application.database.all<{
                                    createdByCourseParticipation: number;
                                  }>(
                                    sql`
                                  select "createdByCourseParticipation"
                                  from "courseForumConversationMessageDrafts"
                                  where
                                    "courseForumConversation" = ${request.state.courseForumConversation.id} and
                                    "createdByCourseParticipation" != ${request.state.courseParticipation.id} and
                                    ${Temporal.Now.instant().subtract({ minutes: 2 }).toString()} < "createdAt" and
                                    trim("content") != ''
                                  order by "createdAt" asc;
                                `,
                                  );
                                  return 0 < drafts.length
                                    ? html`
                                        <div
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                            color: light-dark(
                                              var(--color--green--500),
                                              var(--color--green--500)
                                            );
                                          `}"
                                        >
                                          <span
                                            css="${css`
                                              font-weight: 600;
                                            `}"
                                            >Typing:</span
                                          >
                                          $${drafts
                                            .map((draft) => {
                                              const courseParticipation =
                                                application.database.get<{
                                                  user: number;
                                                  courseParticipationRole:
                                                    | "courseParticipationRoleInstructor"
                                                    | "courseParticipationRoleStudent";
                                                }>(
                                                  sql`
                                                select
                                                  "user",
                                                  "courseParticipationRole"
                                                from "courseParticipations"
                                                where "id" = ${draft.createdByCourseParticipation};
                                              `,
                                                );
                                              if (
                                                courseParticipation ===
                                                undefined
                                              )
                                                throw new Error();
                                              const user =
                                                application.database.get<{
                                                  name: string;
                                                }>(
                                                  sql`
                                                select "name"
                                                from "users"
                                                where "id" = ${courseParticipation.user};
                                              `,
                                                );
                                              if (user === undefined)
                                                throw new Error();
                                              return html`${user.name}${
                                                courseParticipation.courseParticipationRole ===
                                                "courseParticipationRoleInstructor"
                                                  ? " (instructor)"
                                                  : ""
                                              }`;
                                            })
                                            .join(", ")}
                                        </div>
                                      `
                                    : html``;
                                })()
                              : html``
                          }
                          <div
                            javascript="${javascript`
                            if (this.loadedcourseForumConversationMessageDraft === undefined && ${courseForumConversationMessageDraft !== undefined})
                              this.querySelector('[name="content"]').value = ${
                                courseForumConversationMessageDraft?.content ?? ""
                              };
                            this.loadedcourseForumConversationMessageDraft = true;
                          `}"
                          >
                            $${application.partials.courseForumConversationMessageContentEditor(
                              {
                                course: request.state.course,
                                courseParticipation:
                                  request.state.courseParticipation,
                                courseForumConversation:
                                  request.state.courseForumConversation,
                              },
                            )}
                          </div>
                          <div
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              font-weight: 600;
                              color: light-dark(
                                var(--color--slate--600),
                                var(--color--slate--400)
                              );
                              display: flex;
                              align-items: baseline;
                              gap: var(--size--4);
                            `}"
                          >
                            <div>
                              <button
                                type="submit"
                                class="button button--rectangle button--blue"
                              >
                                Send
                              </button>
                            </div>
                            $${(() => {
                              let courseForumConversationMessageNewOptionsHTML = html``;
                              if (
                                request.state.courseForumConversation
                                  .courseForumConversationType ===
                                "courseForumConversationTypeQuestion"
                              )
                                courseForumConversationMessageNewOptionsHTML += html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click" });
                                  `}"
                                  >
                                    <form>
                                      <span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--slate--500),
                                            var(--color--slate--500)
                                          );
                                        `}"
                                        >Type:</span
                                      >  <input
                                        type="radio"
                                        name="courseForumConversationMessageType"
                                        value="courseForumConversationMessageTypeMessage"
                                        required
                                        $${
                                          (courseForumConversationMessageDraft ===
                                            undefined &&
                                            !(
                                              request.state.courseForumConversation
                                                .courseForumConversationType ===
                                                "courseForumConversationTypeQuestion" &&
                                              !Boolean(
                                                request.state.courseForumConversation
                                                  .courseForumConversationTypeQuestionResolved,
                                              ) &&
                                              request.state.courseParticipation
                                                .courseParticipationRole ===
                                                "courseParticipationRoleInstructor"
                                            )) ||
                                          courseForumConversationMessageDraft?.courseForumConversationMessageType ===
                                            "courseForumConversationMessageTypeMessage"
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Message</span
                                      ><input
                                        type="radio"
                                        name="courseForumConversationMessageType"
                                        value="courseForumConversationMessageTypeAnswer"
                                        required
                                        $${
                                          (courseForumConversationMessageDraft ===
                                            undefined &&
                                            request.state.courseForumConversation
                                              .courseForumConversationType ===
                                              "courseForumConversationTypeQuestion" &&
                                            !Boolean(
                                              request.state.courseForumConversation
                                                .courseForumConversationTypeQuestionResolved,
                                            ) &&
                                            request.state.courseParticipation
                                              .courseParticipationRole ===
                                              "courseParticipationRoleInstructor") ||
                                          courseForumConversationMessageDraft?.courseForumConversationMessageType ===
                                            "courseForumConversationMessageTypeAnswer"
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--green--500),
                                            var(--color--green--500)
                                          );
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Answer</span
                                      ><input
                                        type="radio"
                                        name="courseForumConversationMessageType"
                                        value="courseForumConversationMessageTypeFollowUpQuestion"
                                        required
                                        $${
                                          courseForumConversationMessageDraft?.courseForumConversationMessageType ===
                                          "courseForumConversationMessageTypeFollowUpQuestion"
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--red--500),
                                            var(--color--red--500)
                                          );
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Follow-up question</span
                                      > <i class="bi bi-chevron-down"></i>
                                    </form>
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
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeMessage"]').click();
                                      };
                                    `}"
                                    >
                                      Message
                                    </button>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent button--dropdown-menu"
                                      javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeAnswer"]').click();
                                      };
                                    `}"
                                    >
                                      Answer
                                    </button>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent button--dropdown-menu"
                                      javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeFollowUpQuestion"]').click();
                                      };
                                    `}"
                                    >
                                      Follow-up question
                                    </button>
                                  </div>
                                `;
                              if (
                                request.state.courseParticipation
                                  .courseParticipationRole ===
                                "courseParticipationRoleInstructor"
                              )
                                courseForumConversationMessageNewOptionsHTML += html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                    javascript.popover({ element: this, trigger: "click" });
                                  `}"
                                  >
                                    <form>
                                      <span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--slate--500),
                                            var(--color--slate--500)
                                          );
                                        `}"
                                        >Visibility:</span
                                      >  <input
                                        type="radio"
                                        name="courseForumConversationMessageVisibility"
                                        value="courseForumConversationMessageVisibilityEveryone"
                                        required
                                        $${
                                          courseForumConversationMessageDraft ===
                                            undefined ||
                                          courseForumConversationMessageDraft.courseForumConversationMessageVisibility ===
                                            "courseForumConversationMessageVisibilityEveryone"
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Everyone</span
                                      ><input
                                        type="radio"
                                        name="courseForumConversationMessageVisibility"
                                        value="courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
                                        required
                                        $${
                                          courseForumConversationMessageDraft?.courseForumConversationMessageVisibility ===
                                          "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--blue--500),
                                            var(--color--blue--500)
                                          );
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Instructors</span
                                      > <i class="bi bi-chevron-down"></i>
                                    </form>
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
                                          this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageVisibility"][value="courseForumConversationMessageVisibilityEveryone"]').click();
                                        };
                                      `}"
                                    >
                                      Everyone
                                    </button>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent button--dropdown-menu"
                                      javascript="${javascript`
                                        this.onclick = () => {
                                          this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageVisibility"][value="courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"]').click();
                                        };
                                      `}"
                                    >
                                      Instructors
                                    </button>
                                  </div>
                                `;
                              if (
                                request.state.courseParticipation
                                  .courseParticipationRole ===
                                  "courseParticipationRoleStudent" &&
                                (request.state.course
                                  .courseParticipationRoleStudentsAnonymityAllowed ===
                                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" ||
                                  request.state.course
                                    .courseParticipationRoleStudentsAnonymityAllowed ===
                                    "courseParticipationRoleStudentsAnonymityAllowedEveryone")
                              )
                                courseForumConversationMessageNewOptionsHTML += html`
                                  <button
                                    type="button"
                                    class="button button--rectangle button--transparent"
                                    javascript="${javascript`
                                      javascript.popover({ element: this, trigger: "click" });
                                    `}"
                                  >
                                    <form
                                      javascript="${javascript`
                                        this.oninput = async () => {
                                          await fetch(
                                            "/settings/anonymity-preferred", {
                                              method: "PATCH",
                                              headers: { "CSRF-Protection": "true" },
                                              body: new URLSearchParams(javascript.serialize(this)),
                                            }
                                          );
                                        };
                                      `}"
                                    >
                                      <span
                                        css="${css`
                                          color: light-dark(
                                            var(--color--slate--500),
                                            var(--color--slate--500)
                                          );
                                        `}"
                                        >Anonymity:</span
                                      >  <input
                                        type="radio"
                                        name="courseForumConversationMessageAnonymity"
                                        value="courseForumConversationMessageAnonymityNone"
                                        $${
                                          courseForumConversationMessageDraft?.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityNone" ||
                                          (courseForumConversationMessageDraft ===
                                            undefined &&
                                            request.state.user
                                              .userAnonymityPreferred ===
                                              "userAnonymityPreferredNone")
                                            ? html`checked`
                                            : html``
                                        }
                                        required
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >None</span
                                      ><input
                                        type="radio"
                                        name="courseForumConversationMessageAnonymity"
                                        value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                                        required
                                        $${
                                          courseForumConversationMessageDraft?.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" ||
                                          (courseForumConversationMessageDraft ===
                                            undefined &&
                                            (request.state.user
                                              .userAnonymityPreferred ===
                                              "userAnonymityPreferredCourseParticipationRoleStudents" ||
                                              (request.state.user
                                                .userAnonymityPreferred ===
                                                "userAnonymityPreferredEveryone" &&
                                                request.state.course
                                                  .courseParticipationRoleStudentsAnonymityAllowed !==
                                                  "courseParticipationRoleStudentsAnonymityAllowedEveryone"))) ||
                                          (courseForumConversationMessageDraft?.courseForumConversationMessageAnonymity ===
                                            "courseForumConversationMessageAnonymityEveryone" &&
                                            request.state.course
                                              .courseParticipationRoleStudentsAnonymityAllowed !==
                                              "courseParticipationRoleStudentsAnonymityAllowedEveryone")
                                            ? html`checked`
                                            : html``
                                        }
                                        hidden
                                      /><span
                                        css="${css`
                                          :not(:checked) + & {
                                            display: none;
                                          }
                                        `}"
                                        >Anonymous to students</span
                                      >$${
                                        request.state.course
                                          .courseParticipationRoleStudentsAnonymityAllowed ===
                                        "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                                          ? html`<input
                                                type="radio"
                                                name="courseForumConversationMessageAnonymity"
                                                value="courseForumConversationMessageAnonymityEveryone"
                                                required
                                                $${
                                                  courseForumConversationMessageDraft?.courseForumConversationMessageAnonymity ===
                                                    "courseForumConversationMessageAnonymityEveryone" ||
                                                  (courseForumConversationMessageDraft ===
                                                    undefined &&
                                                    request.state.user
                                                      .userAnonymityPreferred ===
                                                      "userAnonymityPreferredEveryone")
                                                    ? html`checked`
                                                    : html``
                                                }
                                                hidden
                                              /><span
                                                css="${css`
                                                  :not(:checked) + & {
                                                    display: none;
                                                  }
                                                `}"
                                                >Anonymous to everyone</span
                                              >`
                                          : html``
                                      } <i class="bi bi-chevron-down"></i>
                                    </form>
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
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityNone"]').click();
                                      };
                                    `}"
                                    >
                                      None
                                    </button>
                                    <button
                                      type="button"
                                      class="button button--rectangle button--transparent button--dropdown-menu"
                                      javascript="${javascript`
                                      this.onclick = () => {
                                        this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                                      };
                                    `}"
                                    >
                                      Anonymous to students
                                    </button>
                                    $${
                                      request.state.course
                                        .courseParticipationRoleStudentsAnonymityAllowed ===
                                      "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                                        ? html`
                                            <button
                                              type="button"
                                              class="button button--rectangle button--transparent button--dropdown-menu"
                                              javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityEveryone"]').click();
                                            };
                                          `}"
                                            >
                                              Anonymous to everyone
                                            </button>
                                          `
                                        : html``
                                    }
                                  </div>
                                `;
                              return courseForumConversationMessageNewOptionsHTML !==
                                html``
                                ? html`
                                    <div
                                      css="${css`
                                        flex: 1;
                                        display: flex;
                                        align-items: baseline;
                                        flex-wrap: wrap;
                                        column-gap: var(--size--4);
                                        row-gap: var(--size--2);
                                      `}"
                                    >
                                      $${courseForumConversationMessageNewOptionsHTML}
                                    </div>
                                  `
                                : html``;
                            })()}
                          </div>
                        </div>
                      `;
                    })()
                  : html``
              }
            </div>
          `,
        }),
      );
    },
  });

  application.webServer?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          title: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationTypeQuestionResolved: "false" | "true";
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          courseForumConversationParticipations: string[];
          pinned: "false" | "true";
          tags: string[];
        },
        Application["types"]["states"]["courseForumConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversationsTags === undefined ||
        request.state.courseForumConversation === undefined ||
        !(
          request.state.courseParticipation.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
          request.state.courseParticipation.id ===
            (
              application.database.get<{
                createdByCourseParticipation: number | null;
              }>(
                sql`
                  select "createdByCourseParticipation"
                  from "courseForumConversationMessages"
                  where "courseForumConversation" = ${request.state.courseForumConversation.id}
                  order by "id" asc
                  limit 1;
                `,
              ) ??
              (() => {
                throw new Error();
              })()
            ).createdByCourseParticipation
        )
      )
        return;
      request.body.courseForumConversationParticipations ??= [];
      request.body.tags ??= [];
      if (
        typeof request.body.title !== "string" ||
        request.body.title.trim() === "" ||
        (request.body.courseForumConversationType !== "courseForumConversationTypeNote" &&
          request.body.courseForumConversationType !==
            "courseForumConversationTypeQuestion") ||
        (request.body.courseForumConversationVisibility !==
          "courseForumConversationVisibilityEveryone" &&
          request.body.courseForumConversationVisibility !==
            "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
          request.body.courseForumConversationVisibility !==
            "courseForumConversationVisibilityCourseForumConversationParticipations") ||
        !Array.isArray(request.body.courseForumConversationParticipations) ||
        request.body.courseForumConversationParticipations.some(
          (courseForumConversationParticipation) =>
            typeof courseForumConversationParticipation !== "string",
        ) ||
        (request.body.pinned === "true" &&
          request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor") ||
        !Array.isArray(request.body.tags) ||
        (Boolean(request.state.course.courseForumConversationRequiresTagging) &&
          0 < request.state.courseForumConversationsTags.length &&
          request.body.tags.length === 0) ||
        request.body.tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !request.state.courseForumConversationsTags!.some(
              (courseForumConversationsTag) =>
                tag === courseForumConversationsTag.publicId,
            ),
        )
      )
        throw "validation";
      const titleSemanticSearch = await (
        await fetch("http://localhost:19000/vector-embedding", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: request.body.title }),
        })
      ).text();
      application.database.transaction(() => {
        application.database.run(
          sql`
            update "courseForumConversations"
            set
              "courseForumConversationType" = ${request.body.courseForumConversationType!},
              "courseForumConversationTypeQuestionResolved" = ${Number(request.body.courseForumConversationTypeQuestionResolved === "true")},
              "courseForumConversationVisibility" = ${request.body.courseForumConversationVisibility!},
              "pinned" = ${
                request.state.courseParticipation!.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? Number(request.body.pinned === "true")
                  : request.state.courseForumConversation!.pinned
              },
              "title" = ${request.body.title!},
              "titleLexicalSearch" = ${utilities
                .tokenize(request.body.title!)
                .map((tokenWithPosition) => tokenWithPosition.token)
                .join(" ")},
              "titleSemanticSearch" = vec_f32(${titleSemanticSearch})
            where "id" = ${request.state.courseForumConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationParticipations"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        for (const courseForumConversationParticipation of new Set([
          ...request.body.courseForumConversationParticipations!,
          request.state.courseParticipation!.publicId,
        ])) {
          const courseParticipation = application.database.get<{
            id: number;
            courseParticipationRole:
              | "courseParticipationRoleInstructor"
              | "courseParticipationRoleStudent";
          }>(
            sql`
              select
                "id",
                "courseParticipationRole"
              from "courseParticipations"
              where "publicId" = ${courseForumConversationParticipation};
            `,
          );
          if (
            courseParticipation !== undefined &&
            request.body.courseForumConversationVisibility !==
              "courseForumConversationVisibilityEveryone" &&
            !(
              request.body.courseForumConversationVisibility ===
                "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
              courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
            )
          )
            application.database.run(
              sql`
                insert into "courseForumConversationParticipations" (
                  "courseForumConversation",
                  "courseParticipation"
                )
                values (
                  ${request.state.courseForumConversation!.id},
                  ${courseParticipation.id}
                );
              `,
            );
        }
        application.database.run(
          sql`
            delete from "courseForumConversationTaggings"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        for (const tag of request.body.tags!)
          application.database.run(
            sql`
              insert into "courseForumConversationTaggings" (
                "courseForumConversation",
                "courseForumConversationsTag"
              )
              values (
                ${request.state.courseForumConversation!.id},
                ${request.state.courseForumConversationsTags!.find((courseForumConversationsTag) => tag === courseForumConversationsTag.publicId)!.id}
              );
            `,
          );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["courseForumConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseParticipation.courseParticipationRole !==
          "courseParticipationRoleInstructor" ||
        request.state.courseForumConversation === undefined
      )
        return;
      application.database.transaction(() => {
        application.database.run(
          sql`
            update "courseParticipations"
            set "mostRecentlyVisitedCourseForumConversation" = null
            where "mostRecentlyVisitedCourseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationParticipations"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationTaggings"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationMessageDrafts"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        for (const courseForumConversationMessage of application.database.all<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseForumConversationMessages"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id}
            order by "id" asc;
          `,
        )) {
          application.database.run(
            sql`
              delete from "courseForumConversationMessageViews"
              where "courseForumConversationMessage" = ${courseForumConversationMessage.id};
            `,
          );
          application.database.run(
            sql`
              delete from "courseForumConversationMessageLikes"
              where "courseForumConversationMessage" = ${courseForumConversationMessage.id};
            `,
          );
          application.database.run(
            sql`
              delete from "courseForumConversationMessages"
              where "id" = ${courseForumConversationMessage.id};
            `,
          );
        }
        application.database.run(
          sql`
            delete from "courseForumConversationMessageEmailNotificationReplyTokens"
            where "courseForumConversation" = ${request.state.courseForumConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversations"
            where "id" = ${request.state.courseForumConversation!.id};
          `,
        );
      });
      response.redirect!(`/courses/${request.state.course.publicId}`);
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum(?:$|/)`,
          }),
        });
    },
  });
};
