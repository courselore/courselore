import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversation = {
  types: {
    states: {
      CourseConversation: Application["types"]["states"]["Course"] & {
        courseConversation: {
          id: number;
          publicId: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          questionResolved: number;
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: number;
          title: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  const courseConversationsLayout = ({
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
      Application["types"]["states"]["CourseConversation"]
    >;
    response: serverTypes.Response;
    head: HTML;
    body: HTML;
  }): HTML => {
    if (
      request.state.user === undefined ||
      request.state.course === undefined ||
      request.state.courseParticipation === undefined ||
      request.state.courseConversationsTags === undefined
    )
      throw new Error();
    return application.layouts.base({
      request,
      response,
      head,
      hamburger: true,
      body: html`
        <div
          key="main--two-column-layout"
          css="${css`
            width: 100%;
            height: 100%;
            display: flex;
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
              $${request.state.course.courseState === "courseStateActive"
                ? html`
                    <a
                      key="sidebar--menu--new-conversation"
                      href="/courses/${request.state.course
                        .publicId}/conversations/new"
                      class="button button--rectangle button--blue"
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        display: flex;
                        align-items: center;
                      `}"
                    >
                      New
                      ${request.state.courseParticipation
                        .courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? "note"
                        : request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleStudent"
                          ? "question"
                          : (() => {
                              throw new Error();
                            })()}
                    </a>
                  `
                : html``}
              <div
                key="sidebar--menu--search-and-filter"
                type="form"
                class="input--text"
                css="${css`
                  flex: 1;
                  min-width: var(--size--0);
                  padding: var(--size--0);
                  display: flex;
                `}"
              >
                <input
                  type="text"
                  name="search.courseConversations"
                  placeholder="Search…"
                  maxlength="3000"
                  css="${css`
                    flex: 1;
                    min-width: var(--size--0);
                    padding: var(--size--1) var(--size--0) var(--size--1)
                      var(--size--2);
                  `}"
                />
                <button
                  key="sidebar--menu--search-and-filter--search"
                  type="button"
                  class="button button--icon button--transparent"
                  css="${css`
                    padding: var(--size--1) var(--size--2);
                  `}"
                  javascript="${javascript`
                    javascript.popover({ element: this });
                    this.onclick = () => {
                      this.closest('[key~="sidebar--menu--search-and-filter"]').querySelector('[name="search.courseConversations"]').focus();
                    };
                  `}"
                >
                  <i class="bi bi-search"></i>
                </button>
                <div type="popover">Search</div>
                $${request.state.courseConversationsTags.length > 0
                  ? html`
                      <button
                        key="sidebar--menu--search-and-filter--filter"
                        type="button"
                        class="button button--icon button--transparent"
                        css="${css`
                          padding: var(--size--1) var(--size--2);
                        `}"
                        javascript="${javascript`
                          javascript.popover({ element: this });
                          javascript.popover({ element: this, target: this.nextElementSibling.nextElementSibling, trigger: "click", remainOpenWhileFocused: true, placement: "bottom-end" });
                        `}"
                      >
                        <i class="bi bi-filter"></i>
                      </button>
                      <div type="popover">Filter</div>
                      <div
                        type="popover"
                        css="${css`
                          display: flex;
                          flex-direction: column;
                          gap: var(--size--2);
                        `}"
                      >
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
                          Tags
                        </div>
                        $${request.state.courseConversationsTags.map(
                          (courseConversationsTag) => html`
                            <label
                              class="button button--rectangle button--transparent button--dropdown-menu"
                            >
                              <input
                                type="checkbox"
                                name="filter.courseConversationsTags[]"
                                value="${courseConversationsTag.publicId}"
                                class="input--checkbox"
                              />  ${courseConversationsTag.name}
                            </label>
                          `,
                        )}
                      </div>
                    `
                  : html``}
              </div>
            </div>
            <div
              key="courseConversations"
              class="scroll"
              css="${css`
                flex: 1;
              `}"
            >
              <div key="courseConversations--to-group" hidden>
                $${application.database
                  .all<{
                    id: number;
                    publicId: string;
                    courseConversationType:
                      | "courseConversationTypeNote"
                      | "courseConversationTypeQuestion";
                    questionResolved: number;
                    pinned: number;
                    title: string;
                  }>(
                    sql`
                      select
                        "id",
                        "publicId",
                        "courseConversationType",
                        "questionResolved",
                        "pinned",
                        "title"
                      from "courseConversations"
                      where
                        "course" = ${request.state.course.id} and (
                          "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                          $${
                            request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                              ? sql`
                                  or
                                  "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                                `
                              : sql``
                          }
                          or (
                            select true
                            from "courseConversationParticipations"
                            where
                              "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                              "courseConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                          )
                        )
                      order by
                        "pinned" = true desc,
                        "id" desc;
                    `,
                  )
                  .map((courseConversation) => {
                    const firstCourseConversationMessage =
                      application.database.get<{
                        createdAt: string;
                        createdByCourseParticipation: number | null;
                        courseConversationMessageAnonymity:
                          | "courseConversationMessageAnonymityNone"
                          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                          | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
                        content: string;
                      }>(
                        sql`
                          select
                            "createdAt",
                            "createdByCourseParticipation",
                            "courseConversationMessageAnonymity",
                            "content"
                          from "courseConversationMessages"
                          where
                            "courseConversation" = ${courseConversation.id} $${
                              request.state.courseParticipation!
                                .courseParticipationRole !==
                              "courseParticipationRoleInstructor"
                                ? sql`
                                    and
                                    "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                                  `
                                : sql``
                            }
                          order by "id" asc
                          limit 1;
                        `,
                      );
                    if (firstCourseConversationMessage === undefined)
                      throw new Error();
                    const firstCourseConversationMessageAnonymous =
                      firstCourseConversationMessage.createdByCourseParticipation !==
                        request.state.courseParticipation!.id &&
                      ((firstCourseConversationMessage.courseConversationMessageAnonymity ===
                        "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                        request.state.courseParticipation!
                          .courseParticipationRole ===
                          "courseParticipationRoleStudent") ||
                        firstCourseConversationMessage.courseConversationMessageAnonymity ===
                          "courseConversationMessageAnonymityCourseParticipationRoleInstructors");
                    const firstCourseConversationMessageCreatedByCourseParticipation =
                      typeof firstCourseConversationMessage.createdByCourseParticipation ===
                        "number" && !firstCourseConversationMessageAnonymous
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
                              where "id" = ${firstCourseConversationMessage.createdByCourseParticipation};
                            `,
                          )
                        : undefined;
                    const firstCourseConversationMessageCreatedByCourseParticipationUser =
                      typeof firstCourseConversationMessageCreatedByCourseParticipation ===
                      "object"
                        ? application.database.get<{
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
                            lastSeenOnlineAt: string;
                          }>(
                            sql`
                              select
                                "publicId",
                                "name",
                                "avatarColor",
                                "avatarImage",
                                "lastSeenOnlineAt"
                              from "users"
                              where "id" = ${firstCourseConversationMessageCreatedByCourseParticipation.user};
                            `,
                          )
                        : undefined;
                    return html`
                      <a
                        key="courseConversation /courses/${request.state.course!
                          .publicId}/conversations/${courseConversation.publicId}"
                        href="/courses/${request.state.course!
                          .publicId}/conversations/${courseConversation.publicId}"
                        css="${css`
                          padding: var(--size--2) var(--size--4);
                          border-bottom: var(--border-width--1) solid
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
                          transition-duration: var(--transition-duration--150);
                          transition-timing-function: var(
                            --transition-timing-function--ease-in-out
                          );
                        `} ${request.state.courseConversation?.id ===
                        courseConversation.id
                          ? css`
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
                          : css`
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
                        javascript="${javascript`
                          this.pinned = ${Boolean(courseConversation.pinned)};
                          this.firstCourseConversationMessageCreatedAt = ${firstCourseConversationMessage.createdAt};
                          this.current = ${
                            request.state.courseConversation?.id ===
                            courseConversation.id
                          };
                        `}"
                      >
                        <div key="courseConversation--sidebar">
                          <div
                            css="${css`
                              display: flex;
                              align-items: center;
                            `}"
                          >
                            $${request.state.courseConversation?.id !==
                              courseConversation.id &&
                            application.database.get(
                              sql`
                                select true
                                from "courseConversationMessages"
                                left join "courseConversationMessageViews" on
                                  "courseConversationMessages"."id" = "courseConversationMessageViews"."courseConversationMessage" and
                                  "courseConversationMessageViews"."courseParticipation" = ${request.state.courseParticipation!.id}
                                where
                                  "courseConversationMessages"."courseConversation" = ${courseConversation.id} $${
                                    request.state.courseParticipation!
                                      .courseParticipationRole !==
                                    "courseParticipationRoleInstructor"
                                      ? sql`
                                          and
                                          "courseConversationMessages"."courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                                        `
                                      : sql``
                                  } and
                                  "courseConversationMessageViews"."id" is null
                                limit 1;
                              `,
                            ) !== undefined
                              ? html`
                                  <div
                                    key="courseConversation--sidebar--courseConversationMessageViews"
                                    css="${css`
                                      font-size: var(--size--1-5);
                                      color: light-dark(
                                        var(--color--blue--500),
                                        var(--color--blue--500)
                                      );
                                      position: absolute;
                                      translate: calc(-100% - var(--size--1));
                                    `}"
                                  >
                                    <i class="bi bi-circle-fill"></i>
                                  </div>
                                `
                              : html``}
                            <div key="courseConversation--sidebar--userAvatar">
                              $${application.partials.userAvatar({
                                user: firstCourseConversationMessageAnonymous
                                  ? "anonymous"
                                  : (firstCourseConversationMessageCreatedByCourseParticipationUser ??
                                    "courseParticipationDeleted"),
                                size: 9,
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          key="courseConversation--main"
                          css="${css`
                            flex: 1;
                            min-width: var(--size--0);
                          `}"
                        >
                          <div
                            key="courseConversation--main--header"
                            css="${css`
                              display: flex;
                              align-items: baseline;
                              gap: var(--size--2);
                            `}"
                          >
                            <div
                              key="courseConversation--main--header--title"
                              css="${css`
                                flex: 1;
                                font-weight: 600;
                              `}"
                            >
                              ${courseConversation.title}
                            </div>
                            <div
                              key="courseConversation--main--header--publicId"
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                font-weight: 500;
                              `} ${request.state.courseConversation?.id ===
                              courseConversation.id
                                ? css`
                                    color: light-dark(
                                      var(--color--blue--300),
                                      var(--color--blue--300)
                                    );
                                  `
                                : css`
                                    color: light-dark(
                                      var(--color--slate--400),
                                      var(--color--slate--600)
                                    );
                                  `}"
                            >
                              #${courseConversation.publicId}
                            </div>
                          </div>
                          <div
                            key="courseConversation--main--byline"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                            `} ${request.state.courseConversation?.id ===
                            courseConversation.id
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
                                `}"
                          >
                            <span
                              css="${css`
                                font-weight: 600;
                              `}"
                              >${firstCourseConversationMessageAnonymous
                                ? "Anonymous"
                                : (firstCourseConversationMessageCreatedByCourseParticipationUser?.name ??
                                  "Deleted course participant")}</span
                            >${!firstCourseConversationMessageAnonymous
                              ? `${
                                  firstCourseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                  "courseParticipationRoleInstructor"
                                    ? " (instructor)"
                                    : ""
                                }${
                                  firstCourseConversationMessage.courseConversationMessageAnonymity ===
                                  "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                    ? " (anonymous to students)"
                                    : firstCourseConversationMessage.courseConversationMessageAnonymity ===
                                        "courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                      ? " (anonymous to instructors)"
                                      : ""
                                }`
                              : ``} ·
                            <span
                              javascript="${javascript`
                                javascript.relativizeDateTimeElement(this, ${firstCourseConversationMessage.createdAt}, { capitalize: true });
                                javascript.popover({ element: this });
                              `}"
                            ></span>
                            <span
                              type="popover"
                              javascript="${javascript`
                                this.textContent = javascript.localizeDateTime(${firstCourseConversationMessage.createdAt});
                              `}"
                            ></span>
                          </div>
                          <div
                            key="courseConversation--main--details"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                            `} ${request.state.courseConversation?.id ===
                            courseConversation.id
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
                                `}"
                          >
                            $${(() => {
                              const courseConversationMainDetails = [
                                html`<span
                                    css="${css`
                                      font-weight: 600;
                                    `}"
                                    >${courseConversation.courseConversationType ===
                                    "courseConversationTypeNote"
                                      ? "Note"
                                      : courseConversation.courseConversationType ===
                                          "courseConversationTypeQuestion"
                                        ? "Question"
                                        : (() => {
                                            throw new Error();
                                          })()}</span
                                  >$${courseConversation.courseConversationType ===
                                  "courseConversationTypeQuestion"
                                    ? Boolean(
                                        courseConversation.questionResolved,
                                      ) === false
                                      ? html` <span
                                          css="${request.state
                                            .courseConversation?.id ===
                                          courseConversation.id
                                            ? css``
                                            : css`
                                                color: light-dark(
                                                  var(--color--red--500),
                                                  var(--color--red--500)
                                                );
                                              `}"
                                          >(unresolved)</span
                                        >`
                                      : html` <span
                                          css="${request.state
                                            .courseConversation?.id ===
                                          courseConversation.id
                                            ? css``
                                            : css`
                                                color: light-dark(
                                                  var(--color--green--500),
                                                  var(--color--green--500)
                                                );
                                              `}"
                                          >(resolved)</span
                                        >`
                                    : ""}`,
                              ];
                              for (const courseConversationsTag of request.state
                                .courseConversationsTags!)
                                if (
                                  application.database.get(
                                    sql`
                                      select true
                                      from "courseConversationTaggings"
                                      where
                                        "courseConversation" = ${courseConversation.id} and
                                        "courseConversationsTag" = ${courseConversationsTag.id};
                                    `,
                                  ) !== undefined
                                )
                                  courseConversationMainDetails.push(
                                    html`${courseConversationsTag.name}`,
                                  );
                              return courseConversationMainDetails.join(" · ");
                            })()}
                          </div>
                          <div
                            key="courseConversation--main--firstCourseConversationMessageContent"
                            css="${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `} ${request.state.courseConversation?.id ===
                            courseConversation.id
                              ? css`
                                  color: light-dark(
                                    var(--color--blue--300),
                                    var(--color--blue--300)
                                  );
                                `
                              : css`
                                  color: light-dark(
                                    var(--color--slate--400),
                                    var(--color--slate--600)
                                  );
                                `}"
                          >
                            ${firstCourseConversationMessage.content.slice(
                              0,
                              200,
                            )}
                            TODO
                          </div>
                        </div>
                      </a>
                    `;
                  })}
              </div>
              <div
                key="courseConversations--groups--container"
                javascript="${javascript`
                  const courseConversationsGroups = javascript.stringToElement(html\`<div key="courseConversations--groups"></div>\`);
                  let currentCourseConversation;
                  for (const element of this.closest('[key~="courseConversations"]').querySelectorAll('[key~="courseConversations--to-group"] [key~="courseConversation"]')) {
                    let groupKey;
                    let groupSummary;
                    if (element.pinned) {
                      groupKey = "pinned";
                      groupSummary = "Pinned";
                    } else {
                      const firstCourseConversationMessageCreatedAtWeekStart = new Date(element.firstCourseConversationMessageCreatedAt);
                      firstCourseConversationMessageCreatedAtWeekStart.setHours(12, 0, 0, 0);
                      while (firstCourseConversationMessageCreatedAtWeekStart.getDay() !== 0) firstCourseConversationMessageCreatedAtWeekStart.setDate(firstCourseConversationMessageCreatedAtWeekStart.getDate() - 1);
                      const firstCourseConversationMessageCreatedAtWeekEnd = new Date(element.firstCourseConversationMessageCreatedAt);
                      firstCourseConversationMessageCreatedAtWeekEnd.setHours(12, 0, 0, 0);
                      while (firstCourseConversationMessageCreatedAtWeekEnd.getDay() !== 6) firstCourseConversationMessageCreatedAtWeekEnd.setDate(firstCourseConversationMessageCreatedAtWeekEnd.getDate() + 1);
                      groupKey = javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekStart.toISOString());
                      groupSummary = \`\${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekStart.toISOString())} — \${javascript.localizeDate(firstCourseConversationMessageCreatedAtWeekEnd.toISOString())}\`;
                    }
                    (
                      courseConversationsGroups.querySelector(\`[key~="courseConversations--groups--group"][key~="\${groupKey}"]\`) ??
                      courseConversationsGroups.insertAdjacentElement("beforeend", javascript.stringToElement(html\`
                        <details key="courseConversations--groups--group \${groupKey}">
                          <summary
                            css="\${${css`
                              font-size: var(--font-size--3);
                              line-height: var(--font-size--3--line-height);
                              font-weight: 600;
                              color: light-dark(
                                var(--color--slate--500),
                                var(--color--slate--500)
                              );
                              background-color: light-dark(
                                var(--color--slate--100),
                                var(--color--slate--900)
                              );
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
                              [key~="courseConversations--groups--group"].current
                                & {
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
                              }
                            `}}"
                          >
                            <div
                              key="courseConversations--groups--group--view"
                              css="\${${css`
                                font-size: var(--size--1-5);
                                color: light-dark(
                                  var(--color--blue--500),
                                  var(--color--blue--500)
                                );
                                position: absolute;
                                translate: calc(-100% - var(--size--1));
                                transition-property: var(
                                  --transition-property--opacity
                                );
                                transition-duration: var(
                                  --transition-duration--150
                                );
                                transition-timing-function: var(
                                  --transition-timing-function--ease-in-out
                                );
                                &:not(.visible),
                                [key~="courseConversations--groups--group"].current
                                  & {
                                  visibility: hidden;
                                  opacity: var(--opacity--0);
                                }
                              `}}"
                            >
                              <i class="bi bi-circle-fill"></i>
                            </div>
                            <div>
                              <span
                                css="\${${css`
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
                                  [key~="courseConversations--groups--group"][open]
                                    > summary
                                    > div
                                    > & {
                                    rotate: var(--rotate--90);
                                  }
                                `}}"
                              >
                                <i class="bi bi-chevron-right"></i>
                              </span>
                              \${groupSummary}
                            </div>
                          </summary>
                        </details>
                      \`))
                    ).insertAdjacentElement("beforeend", element);
                    if (element.current) {
                      element.closest('[key~="courseConversations--groups--group"]').classList.add("current");
                      element.closest('[key~="courseConversations--groups--group"]').open = true;
                      currentCourseConversation = element;
                    }
                    if (element.querySelector('[key~="courseConversation--sidebar--courseConversationMessageViews"]') !== null)
                      element.closest('[key~="courseConversations--groups--group"]').querySelector('[key~="courseConversations--groups--group--view"]').classList.add("visible");
                  }
                  {
                    const preopenCourseConversationsGroups = [...courseConversationsGroups.querySelectorAll('[key~="courseConversations--groups--group"]')].slice(0, 5);
                    if (preopenCourseConversationsGroups[0].matches('[key~="pinned"]')) {
                      if (preopenCourseConversationsGroups[0].querySelector('[key~="courseConversations--groups--group--view"].visible') === null)
                        preopenCourseConversationsGroups.shift();
                    }
                    else if (preopenCourseConversationsGroups.length === 5) preopenCourseConversationsGroups.pop();
                    for (const element of preopenCourseConversationsGroups) element.open = true;
                  }
                  javascript.mount(this.querySelector('[key~="courseConversations--groups"]'), courseConversationsGroups);
                  if (this.firstMount === undefined) currentCourseConversation?.scrollIntoView({ block: "center" });
                  this.firstMount = false;
                `}"
              >
                <div key="courseConversations--groups"></div>
              </div>
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
                const updateSidebarWidth = utilities.foregroundJob(async () => {
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

  application.server?.push({
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
      response.end();
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/new$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {
          "reuse.course": string;
          "reuse.courseConversation": string;
          title: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: "false" | "true";
          announcement: "false" | "true";
          tags: string[];
          content: string;
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
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
        request.state.courseConversationsTags === undefined
      )
        return;
      let prefill: Partial<{
        title: string;
        courseConversationType:
          | "courseConversationTypeNote"
          | "courseConversationTypeQuestion";
        courseConversationVisibility:
          | "courseConversationVisibilityEveryone"
          | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
          | "courseConversationVisibilityCourseConversationParticipations";
        pinned: "false" | "true";
        announcement: "false" | "true";
        tags: string[];
        content: string;
        courseConversationMessageAnonymity:
          | "courseConversationMessageAnonymityNone"
          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
          | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
      }> = {};
      if (
        typeof request.search["reuse.course"] === "string" &&
        request.search["reuse.course"].trim() !== "" &&
        typeof request.search["reuse.courseConversation"] === "string" &&
        request.search["reuse.courseConversation"].trim() !== ""
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
        const courseConversation =
          course !== undefined && courseParticipation !== undefined
            ? application.database.get<{
                id: number;
                courseConversationType:
                  | "courseConversationTypeNote"
                  | "courseConversationTypeQuestion";
                courseConversationVisibility:
                  | "courseConversationVisibilityEveryone"
                  | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                  | "courseConversationVisibilityCourseConversationParticipations";
                pinned: number;
                title: string;
              }>(
                sql`
                  select
                    "id",
                    "courseConversationType",
                    "courseConversationVisibility",
                    "pinned",
                    "title"
                  from "courseConversations"
                  where
                    "publicId" = ${request.search["reuse.courseConversation"]} and
                    "course" = ${course.id} and (
                      "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                      $${
                        courseParticipation.courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                            `
                          : sql``
                      }
                      or (
                        select true
                        from "courseConversationParticipations"
                        where
                          "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                          "courseConversationParticipations"."courseParticipation" = ${courseParticipation.id}
                      )
                    );
                `,
              )
            : undefined;
        const firstCourseConversationMessage =
          courseConversation !== undefined
            ? application.database.get<{
                content: string;
                courseConversationMessageAnonymity:
                  | "courseConversationMessageAnonymityNone"
                  | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                  | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
              }>(
                sql`
                  select "content", "courseConversationMessageAnonymity"
                  from "courseConversationMessages"
                  where "courseConversation" = ${courseConversation.id}
                  order by "id" asc
                  limit 1;
                `,
              )
            : undefined;
        if (
          courseConversation !== undefined &&
          firstCourseConversationMessage !== undefined
        )
          prefill = {
            ...prefill,
            ...courseConversation,
            pinned: Boolean(courseConversation.pinned) ? "true" : "false",
            ...firstCourseConversationMessage,
          };
      }
      prefill = { ...prefill, ...request.search };
      response.end(
        (application.database.get(
          sql`
            select true
            from "courseConversations"
            where
              "course" = ${request.state.course.id} and (
                "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                $${
                  request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? sql`
                        or
                        "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                      `
                    : sql``
                }
                or (
                  select true
                  from "courseConversationParticipations"
                  where
                    "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                    "courseConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
                )
              )
            limit 1;
          `,
        ) === undefined
          ? application.layouts.main
          : courseConversationsLayout)({
          request,
          response,
          head: html`
            <title>
              New conversation · ${request.state.course.name} · Courselore
            </title>
          `,
          body: html`
            <div
              key="courseConversation/new /courses/${request.state.course
                .publicId}/conversations/new"
              type="form"
              method="POST"
              action="/courses/${request.state.course.publicId}/conversations"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--4);
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
              $${request.state.course.courseState === "courseStateActive"
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
                            value="${typeof prefill.title === "string"
                              ? prefill.title
                              : ""}"
                            required
                            maxlength="2000"
                            autofocus
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                          />
                        </div>
                      </label>
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
                      <form>
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
                            >Type:</span
                          >  <input
                            type="radio"
                            name="courseConversationType"
                            value="courseConversationTypeNote"
                            required
                            $${prefill.courseConversationType ===
                              "courseConversationTypeNote" ||
                            (prefill.courseConversationType !==
                              "courseConversationTypeQuestion" &&
                              request.state.courseParticipation
                                .courseParticipationRole ===
                                "courseParticipationRoleInstructor")
                              ? html`checked`
                              : html``}
                            hidden
                            javascript="${javascript`
                              this.onchange = () => {
                                if (!this.checked) return;
                                this.closest('[type~="form"]').querySelector('[key~="announcement"]')?.removeAttribute("hidden");
                                this.closest('[type~="form"]').querySelector('[name="announcement"]')?.removeAttribute("disabled");
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
                            name="courseConversationType"
                            value="courseConversationTypeQuestion"
                            required
                            $${prefill.courseConversationType ===
                              "courseConversationTypeQuestion" ||
                            (prefill.courseConversationType !==
                              "courseConversationTypeNote" &&
                              request.state.courseParticipation
                                .courseParticipationRole ===
                                "courseParticipationRoleStudent")
                              ? html`checked`
                              : html``}
                            hidden
                            javascript="${javascript`
                              this.onchange = () => {
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
                                this.closest('[type~="form"]').querySelector('[name="courseConversationType"][value="courseConversationTypeNote"]').click();
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
                                this.closest('[type~="form"]').querySelector('[name="courseConversationType"][value="courseConversationTypeQuestion"]').click();
                              };
                            `}"
                          >
                            Question
                          </button>
                        </div>
                      </form>
                      <form>
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
                          >  <input
                            type="radio"
                            name="courseConversationVisibility"
                            value="courseConversationVisibilityEveryone"
                            required
                            $${prefill.courseConversationVisibility ===
                              "courseConversationVisibilityEveryone" ||
                            (prefill.courseConversationVisibility !==
                              "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
                              prefill.courseConversationVisibility !==
                                "courseConversationVisibilityCourseConversationParticipations")
                              ? html`checked`
                              : html``}
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
                            name="courseConversationVisibility"
                            value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                            required
                            $${prefill.courseConversationVisibility ===
                            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                              ? html`checked`
                              : html``}
                            hidden
                          /><span
                            css="${css`
                              :not(:checked) + & {
                                display: none;
                              }
                            `}"
                            >Instructors and selected course participants</span
                          ><input
                            type="radio"
                            name="courseConversationVisibility"
                            value="courseConversationVisibilityCourseConversationParticipations"
                            required
                            $${prefill.courseConversationVisibility ===
                            "courseConversationVisibilityCourseConversationParticipations"
                              ? html`checked`
                              : html``}
                            hidden
                          /><span
                            css="${css`
                              :not(:checked) + & {
                                display: none;
                              }
                            `}"
                            >Selected course participants</span
                          > <i class="bi bi-chevron-down"></i>
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
                                this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityEveryone"]').click();
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
                                this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"]').click();
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
                                this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityCourseConversationParticipations"]').click();
                              };
                            `}"
                          >
                            Selected course participants
                          </button>
                        </div>
                      </form>
                      $${request.state.courseParticipation
                        .courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? html`
                            <form>
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
                                >  <input
                                  type="radio"
                                  name="pinned"
                                  value="false"
                                  required
                                  $${prefill.pinned === "false" ||
                                  prefill.pinned !== "true"
                                    ? html`checked`
                                    : html``}
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
                                  $${prefill.pinned === "true"
                                    ? html`checked`
                                    : html``}
                                  hidden
                                /><span
                                  css="${css`
                                    :not(:checked) + & {
                                      display: none;
                                    }
                                  `}"
                                  >Pinned</span
                                > <i class="bi bi-chevron-down"></i>
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
                            </form>
                          `
                        : html``}
                    </div>
                    $${request.state.courseParticipation
                      .courseParticipationRole ===
                    "courseParticipationRoleInstructor"
                      ? html`
                          <div
                            key="announcement"
                            $${prefill.courseConversationType ===
                            "courseConversationTypeQuestion"
                              ? html`hidden`
                              : html``}
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
                                $${prefill.courseConversationType ===
                                "courseConversationTypeQuestion"
                                  ? html`disabled`
                                  : html``}
                                $${prefill.announcement === "true"
                                  ? html`checked`
                                  : html``}
                                class="input--checkbox"
                              />  Send email notifications to everyone about
                              this note
                            </label>
                          </div>
                        `
                      : html``}
                    $${request.state.courseConversationsTags.length > 0
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
                              $${request.state.courseConversationsTags.map(
                                (courseConversationsTag) => html`
                                  <label
                                    class="button button--rectangle button--transparent"
                                  >
                                    <input
                                      type="checkbox"
                                      name="tags[]"
                                      value="${courseConversationsTag.publicId}"
                                      $${Boolean(
                                        request.state.course!
                                          .courseConversationRequiresTagging,
                                      )
                                        ? html`required`
                                        : html``}
                                      $${Array.isArray(prefill.tags) &&
                                      prefill.tags.includes(
                                        courseConversationsTag.publicId,
                                      )
                                        ? html`checked`
                                        : html``}
                                      class="input--checkbox"
                                    />  ${courseConversationsTag.name}
                                  </label>
                                `,
                              )}
                            </div>
                          </div>
                        `
                      : html``}
                    $${application.partials.courseConversationMessageContentEditor(
                      {
                        course: request.state.course,
                        courseParticipation: request.state.courseParticipation,
                        courseConversationMessageContent:
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
                      $${request.state.courseParticipation
                        .courseParticipationRole ===
                        "courseParticipationRoleStudent" &&
                      (request.state.course
                        .courseParticipationRoleStudentsAnonymityAllowed ===
                        "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" ||
                        request.state.course
                          .courseParticipationRoleStudentsAnonymityAllowed ===
                          "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors")
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
                              <form>
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
                                    >Anonymity:</span
                                  >  <input
                                    type="radio"
                                    name="courseConversationMessageAnonymity"
                                    value="courseConversationMessageAnonymityNone"
                                    required
                                    $${prefill.courseConversationMessageAnonymity ===
                                      "courseConversationMessageAnonymityNone" ||
                                    (prefill.courseConversationMessageAnonymity !==
                                      "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                                      !(
                                        request.state.course
                                          .courseParticipationRoleStudentsAnonymityAllowed ===
                                          "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors" &&
                                        prefill.courseConversationMessageAnonymity ===
                                          "courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                      ))
                                      ? html`checked`
                                      : html``}
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
                                    name="courseConversationMessageAnonymity"
                                    value="courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                    required
                                    $${prefill.courseConversationMessageAnonymity ===
                                    "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                      ? html`checked`
                                      : html``}
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Anonymous to students</span
                                  >$${request.state.course
                                    .courseParticipationRoleStudentsAnonymityAllowed ===
                                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                                    ? html`<input
                                          type="radio"
                                          name="courseConversationMessageAnonymity"
                                          value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                          required
                                          $${prefill.courseConversationMessageAnonymity ===
                                          "courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                            ? html`checked`
                                            : html``}
                                          hidden
                                        /><span
                                          css="${css`
                                            :not(:checked) + & {
                                              display: none;
                                            }
                                          `}"
                                          >Anonymous to instructors</span
                                        >`
                                    : html``} <i class="bi bi-chevron-down"></i>
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityNone"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                                      };
                                    `}"
                                  >
                                    Anonymous to students
                                  </button>
                                  $${request.state.course
                                    .courseParticipationRoleStudentsAnonymityAllowed ===
                                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                                    ? html`
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"]').click();
                                            };
                                          `}"
                                        >
                                          Anonymous to instructors
                                        </button>
                                      `
                                    : html``}
                                </div>
                              </form>
                            </div>
                          `
                        : html``}
                    </div>
                  `
                : request.state.course.courseState === "courseStateArchived"
                  ? html`
                      <div
                        key="courseConversation--archived"
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
                    })()}
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/conversations$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          title: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: "false" | "true";
          announcement: "on";
          tags: string[];
          content: string;
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
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
        request.state.courseConversationsTags === undefined
      )
        return;
      request.body.tags ??= [];
      if (
        typeof request.body.title !== "string" ||
        request.body.title.trim() === "" ||
        (request.body.courseConversationType !== "courseConversationTypeNote" &&
          request.body.courseConversationType !==
            "courseConversationTypeQuestion") ||
        (request.body.courseConversationVisibility !==
          "courseConversationVisibilityEveryone" &&
          request.body.courseConversationVisibility !==
            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
          request.body.courseConversationVisibility !==
            "courseConversationVisibilityCourseConversationParticipations") ||
        (request.body.pinned === "true" &&
          request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor") ||
        !Array.isArray(request.body.tags) ||
        (Boolean(request.state.course.courseConversationRequiresTagging) &&
          0 < request.state.courseConversationsTags.length &&
          request.body.tags.length === 0) ||
        request.body.tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !request.state.courseConversationsTags!.some(
              (courseConversationsTag) =>
                tag === courseConversationsTag.publicId,
            ),
        ) ||
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (typeof request.body.courseConversationMessageAnonymity === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleStudent" ||
            (request.body.courseConversationMessageAnonymity !==
              "courseConversationMessageAnonymityNone" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleInstructors") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleInstructors" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      let courseConversation: {
        id: number;
        publicId: string;
        courseConversationType:
          | "courseConversationTypeNote"
          | "courseConversationTypeQuestion";
        questionResolved: number;
        courseConversationVisibility:
          | "courseConversationVisibilityEveryone"
          | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
          | "courseConversationVisibilityCourseConversationParticipations";
        pinned: number;
        title: string;
      };
      const contentTextContent =
        await application.partials.courseConversationMessageContentProcessor({
          course: request.state.course,
          courseConversationMessageContent: request.body.content,
          mode: "textContent",
        });
      application.database.executeTransaction(() => {
        courseConversation = application.database.get<{
          id: number;
          publicId: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          questionResolved: number;
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: number;
          title: string;
        }>(
          sql`
            select * from "courseConversations" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseConversations" (
                    "publicId",
                    "course",
                    "courseConversationType",
                    "questionResolved",
                    "courseConversationVisibility",
                    "pinned",
                    "title",
                    "titleSearch"
                  )
                  values (
                    ${String(request.state.course!.courseConversationsNextPublicId)},
                    ${request.state.course!.id},
                    ${request.body.courseConversationType},
                    ${Number(false)},
                    ${request.body.courseConversationVisibility},
                    ${Number(request.body.pinned === "true")},
                    ${request.body.title},
                    ${utilities
                      .tokenize(request.body.title!)
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")}
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
        request.state.course!.courseConversationsNextPublicId++;
        application.database.run(
          sql`
            update "courses"
            set "courseConversationsNextPublicId" = ${request.state.course!.courseConversationsNextPublicId}
            where "id" = ${request.state.course!.id};
          `,
        );
        for (const tag of request.body.tags!)
          application.database.run(
            sql`
              insert into "courseConversationTaggings" (
                "courseConversation",
                "courseConversationsTag"
              )
              values (
                ${courseConversation.id},
                ${request.state.courseConversationsTags!.find((courseConversationsTag) => tag === courseConversationsTag.publicId)!.id}
              );
            `,
          );
        application.database.run(
          sql`
            insert into "courseConversationMessages" (
              "publicId",
              "courseConversation",
              "createdAt",
              "updatedAt",
              "createdByCourseParticipation",
              "courseConversationMessageType",
              "courseConversationMessageVisibility",
              "courseConversationMessageAnonymity",
              "content",
              "contentSearch"
            )
            values (
              ${cryptoRandomString({ length: 20, type: "numeric" })},
              ${courseConversation.id},
              ${new Date().toISOString()},
              ${null},
              ${request.state.courseParticipation!.id},
              ${"courseConversationMessageTypeMessage"},
              ${"courseConversationMessageVisibilityEveryone"},
              ${request.body.courseConversationMessageAnonymity ?? "courseConversationMessageAnonymityNone"},
              ${request.body.content},
              ${utilities
                .tokenize(contentTextContent, {
                  stopWords: application.privateConfiguration.stopWords,
                  stem: (token) => natural.PorterStemmer.stem(token),
                })
                .map((tokenWithPosition) => tokenWithPosition.token)
                .join(" ")}
            );
          `,
        );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${courseConversation!.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations(?:$|/)`,
          }),
        });
    },
  });

  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationPublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversation"]
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
        publicId: string;
        courseConversationType:
          | "courseConversationTypeNote"
          | "courseConversationTypeQuestion";
        questionResolved: number;
        courseConversationVisibility:
          | "courseConversationVisibilityEveryone"
          | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
          | "courseConversationVisibilityCourseConversationParticipations";
        pinned: number;
        title: string;
      }>(
        sql`
          select 
            "id",
            "publicId",
            "courseConversationType",
            "questionResolved",
            "courseConversationVisibility",
            "pinned",
            "title"
          from "courseConversations"
          where
            "course" = ${request.state.course.id} and
            "publicId" = ${request.pathname.courseConversationPublicId} and (
              "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
              $${
                request.state.courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? sql`
                      or
                      "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                    `
                  : sql``
              }
              or (
                select true
                from "courseConversationParticipations"
                where
                  "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                  "courseConversationParticipations"."courseParticipation" = ${request.state.courseParticipation.id}
              )
            );
        `,
      );
      if (request.state.courseConversation === undefined) return;
      application.database.run(
        sql`
          update "courseParticipations"
          set "mostRecentlyVisitedCourseConversation" = ${request.state.courseConversation.id}
          where "id" = ${request.state.courseParticipation.id};
        `,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        { message: string },
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
        request.state.courseConversationsTags === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      response.end(
        courseConversationsLayout({
          request,
          response,
          head: html`
            <title>
              ${request.state.courseConversation.title} ·
              ${request.state.course.name} · Courselore
            </title>
          `,
          body: html`
            <div
              key="courseConversation /courses/${request.state.course
                .publicId}/conversations/${request.state.courseConversation
                .publicId}"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--6);
              `}"
            >
              <div
                key="courseConversation--header"
                type="form"
                method="PATCH"
                action="/courses/${request.state.course
                  .publicId}/conversations/${request.state.courseConversation
                  .publicId}"
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
                `}"
              >
                $${(() => {
                  const mayEditCourseConversation =
                    request.state.course.courseState === "courseStateActive" &&
                    (request.state.courseParticipation
                      .courseParticipationRole ===
                      "courseParticipationRoleInstructor" ||
                      request.state.courseParticipation.id ===
                        (
                          application.database.get<{
                            createdByCourseParticipation: number;
                          }>(
                            sql`
                              select "createdByCourseParticipation"
                              from "courseConversationMessages"
                              where "courseConversation" = ${request.state.courseConversation.id}
                              order by "id" asc
                              limit 1;
                            `,
                          ) ??
                          (() => {
                            throw new Error();
                          })()
                        ).createdByCourseParticipation);
                  return html`
                    $${request.state.course.courseState ===
                    "courseStateArchived"
                      ? html`
                          <div
                            key="courseConversation--archived"
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
                      : html``}
                    <div
                      css="${css`
                        display: flex;
                        gap: var(--size--4);
                        align-items: baseline;
                      `}"
                    >
                      <div
                        key="courseConversation--header--title"
                        css="${css`
                          flex: 1;
                        `}"
                      >
                        <div
                          key="courseConversation--header--title--show"
                          css="${css`
                            font-size: var(--font-size--4);
                            line-height: var(--font-size--4--line-height);
                            font-weight: 800;
                          `}"
                        >
                          ${request.state.courseConversation.title}
                        </div>
                        $${mayEditCourseConversation
                          ? html`
                              <div
                                key="courseConversation--header--title--edit"
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
                                    value="${request.state.courseConversation
                                      .title}"
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
                                        this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--show"]').hidden = false;
                                        this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--edit"]').hidden = true;
                                        javascript.reset(this.closest('[key~="courseConversation--header--title--edit"]'));
                                      };
                                    `}"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            `
                          : html``}
                      </div>
                      <div key="courseConversation--header--menu">
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
                                await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`});
                                popover.showPopover();
                                await utilities.sleep(1000);
                                popover.hidePopover();
                              };
                            `}"
                          >
                            Copy permanent link
                          </button>
                          <div type="popover">Copied</div>
                          $${mayEditCourseConversation
                            ? html`
                                <button
                                  type="button"
                                  class="button button--rectangle button--transparent button--dropdown-menu"
                                  javascript="${javascript`
                                    this.onclick = () => {
                                      this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--show"]').hidden = true;
                                      this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--edit"]').hidden = false;
                                      this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--edit"] [name="title"]').click();
                                      this.closest('[type~="form"]').querySelector('[key~="courseConversation--header--title--edit"] [name="title"]').focus();
                                    };
                                  `}"
                                >
                                  Edit title
                                </button>
                              `
                            : html``}
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
                                          href="/courses/${course.publicId}/conversations/new?${new URLSearchParams(
                                            {
                                              "reuse.course":
                                                request.state.course!.publicId,
                                              "reuse.courseConversation":
                                                request.state
                                                  .courseConversation!.publicId,
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
                                          $${typeof course.information ===
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
                                                      var(--color--slate--600),
                                                      var(--color--slate--400)
                                                    );
                                                  `}"
                                                >
                                                  ${course.information}
                                                </div>
                                              `
                                            : html``}
                                        </a>
                                      `,
                                    )}
                                  </div>
                                `
                              : html``;
                          })()}
                          $${mayEditCourseConversation &&
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
                                  action="/courses/${request.state.course
                                    .publicId}/conversations/${request.state
                                    .courseConversation.publicId}"
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
                            : html``}
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
                      $${mayEditCourseConversation
                        ? html`
                            <form>
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
                                  >Type:</span
                                >  <input
                                  type="radio"
                                  name="courseConversationType"
                                  value="courseConversationTypeNote"
                                  required
                                  $${request.state.courseConversation
                                    .courseConversationType ===
                                  "courseConversationTypeNote"
                                    ? html`checked`
                                    : html``}
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
                                  name="courseConversationType"
                                  value="courseConversationTypeQuestion"
                                  required
                                  $${request.state.courseConversation
                                    .courseConversationType ===
                                  "courseConversationTypeQuestion"
                                    ? html`checked`
                                    : html``}
                                  hidden
                                /><span
                                  css="${css`
                                    :not(:checked) + & {
                                      display: none;
                                    }
                                  `}"
                                  >Question</span
                                > <i class="bi bi-chevron-down"></i>
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
                                      this.closest('[type~="form"]').querySelector('[name="courseConversationType"][value="courseConversationTypeNote"]').click();
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
                                      this.closest('[type~="form"]').querySelector('[name="courseConversationType"][value="courseConversationTypeQuestion"]').click();
                                    };
                                  `}"
                                >
                                  Question
                                </button>
                              </div>
                            </form>
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
                              >  $${request.state.courseConversation
                                .courseConversationType ===
                              "courseConversationTypeNote"
                                ? html`Note`
                                : request.state.courseConversation
                                      .courseConversationType ===
                                    "courseConversationTypeQuestion"
                                  ? html`Question`
                                  : (() => {
                                      throw new Error();
                                    })()}
                            </div>
                          `}
                      $${request.state.courseConversation
                        .courseConversationType ===
                      "courseConversationTypeQuestion"
                        ? mayEditCourseConversation &&
                          request.state.courseParticipation
                            .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                          ? html`
                              <form>
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
                                    >Question:</span
                                  >  <input
                                    type="radio"
                                    name="questionResolved"
                                    value="false"
                                    required
                                    $${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === false
                                      ? html`checked`
                                      : html``}
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
                                    name="questionResolved"
                                    value="true"
                                    required
                                    $${Boolean(
                                      request.state.courseConversation
                                        .questionResolved,
                                    ) === true
                                      ? html`checked`
                                      : html``}
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
                                        this.closest('[type~="form"]').querySelector('[name="questionResolved"][value="false"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="questionResolved"][value="true"]').click();
                                      };
                                    `}"
                                  >
                                    Resolved
                                  </button>
                                </div>
                              </form>
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
                                  >Question:</span
                                >  $${Boolean(
                                  request.state.courseConversation
                                    .questionResolved,
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
                                        request.state.courseConversation
                                          .questionResolved,
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
                                      })()}
                              </div>
                            `
                        : html``}
                      $${mayEditCourseConversation
                        ? html`
                            <form>
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
                                >  <input
                                  type="radio"
                                  name="courseConversationVisibility"
                                  value="courseConversationVisibilityEveryone"
                                  required
                                  $${request.state.courseConversation
                                    .courseConversationVisibility ===
                                  "courseConversationVisibilityEveryone"
                                    ? html`checked`
                                    : html``}
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
                                  name="courseConversationVisibility"
                                  value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                  required
                                  $${request.state.courseConversation
                                    .courseConversationVisibility ===
                                  "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                    ? html`checked`
                                    : html``}
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
                                  name="courseConversationVisibility"
                                  value="courseConversationVisibilityCourseConversationParticipations"
                                  required
                                  $${request.state.courseConversation
                                    .courseConversationVisibility ===
                                  "courseConversationVisibilityCourseConversationParticipations"
                                    ? html`checked`
                                    : html``}
                                  hidden
                                /><span
                                  css="${css`
                                    :not(:checked) + & {
                                      display: none;
                                    }
                                  `}"
                                  >Selected course participants</span
                                > <i class="bi bi-chevron-down"></i>
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
                                      this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityEveryone"]').click();
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
                                      this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"]').click();
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
                                      this.closest('[type~="form"]').querySelector('[name="courseConversationVisibility"][value="courseConversationVisibilityCourseConversationParticipations"]').click();
                                    };
                                  `}"
                                >
                                  Selected course participants
                                </button>
                              </div>
                            </form>
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
                                >Visibility:</span
                              >  ${request.state.courseConversation
                                .courseConversationVisibility ===
                              "courseConversationVisibilityEveryone"
                                ? "Everyone"
                                : request.state.courseConversation
                                      .courseConversationVisibility ===
                                    "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                                  ? "Instructors and selected course participants"
                                  : request.state.courseConversation
                                        .courseConversationVisibility ===
                                      "courseConversationVisibilityCourseConversationParticipations"
                                    ? "Selected course participants"
                                    : (() => {
                                        throw new Error();
                                      })()}
                            </div>
                          `}
                      $${mayEditCourseConversation &&
                      request.state.courseParticipation
                        .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                        ? html`
                            <form>
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
                                >  <input
                                  type="radio"
                                  name="pinned"
                                  value="false"
                                  required
                                  $${Boolean(
                                    request.state.courseConversation.pinned,
                                  ) === false
                                    ? html`checked`
                                    : html``}
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
                                  $${Boolean(
                                    request.state.courseConversation.pinned,
                                  ) === true
                                    ? html`checked`
                                    : html``}
                                  hidden
                                /><span
                                  css="${css`
                                    :not(:checked) + & {
                                      display: none;
                                    }
                                  `}"
                                  >Pinned</span
                                > <i class="bi bi-chevron-down"></i>
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
                            </form>
                          `
                        : Boolean(request.state.courseConversation.pinned) ===
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
                          : html``}
                    </div>
                    $${request.state.courseConversationsTags.length > 0
                      ? (() => {
                          let courseConversationsTagsHTML = html``;
                          const courseConversationsTagsWithTagging =
                            request.state.courseConversationsTags.filter(
                              (courseConversationsTag) =>
                                application.database.get(
                                  sql`
                                    select true
                                    from "courseConversationTaggings"
                                    where
                                      "courseConversation" = ${request.state.courseConversation!.id} and
                                      "courseConversationsTag" = ${courseConversationsTag.id};
                                  `,
                                ) !== undefined,
                            );
                          if (mayEditCourseConversation)
                            courseConversationsTagsHTML += html`
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
                                  $${request.state.courseConversationsTags.map(
                                    (courseConversationsTag) => html`
                                      <label
                                        class="button button--rectangle button--transparent button--dropdown-menu"
                                      >
                                        <input
                                          type="checkbox"
                                          name="tags[]"
                                          value="${courseConversationsTag.publicId}"
                                          $${Boolean(
                                            request.state.course!
                                              .courseConversationRequiresTagging,
                                          )
                                            ? html`required`
                                            : html``}
                                          $${courseConversationsTagsWithTagging.some(
                                            (
                                              courseConversationsTagWithTagging,
                                            ) =>
                                              courseConversationsTag.id ===
                                              courseConversationsTagWithTagging.id,
                                          )
                                            ? html`checked`
                                            : html``}
                                          class="input--checkbox"
                                        />  ${courseConversationsTag.name}
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
                                    >
                                      Update
                                    </button>
                                  </div>
                                </div>
                              </div>
                            `;
                          else if (
                            courseConversationsTagsWithTagging.length > 0
                          )
                            courseConversationsTagsHTML += html`
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
                          if (courseConversationsTagsWithTagging.length > 0)
                            courseConversationsTagsHTML += html`
                              <div
                                css="${css`
                                  flex: 1;
                                `}"
                              >
                                ${courseConversationsTagsWithTagging
                                  .map(
                                    (courseConversationsTag) =>
                                      courseConversationsTag.name,
                                  )
                                  .join(" · ")}
                              </div>
                            `;
                          return courseConversationsTagsHTML !== html``
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
                                  `} ${mayEditCourseConversation
                                    ? css`
                                        gap: var(--size--2-5);
                                      `
                                    : css`
                                        gap: var(--size--1-5);
                                      `}"
                                >
                                  $${courseConversationsTagsHTML}
                                </div>
                              `
                            : html``;
                        })()
                      : html``}
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
                key="courseConversationMessages"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--size--4);
                `}"
              >
                $${await (async () => {
                  const firstCourseConversationMessage =
                    application.database.get<{ id: number }>(
                      sql`
                        select "id"
                        from "courseConversationMessages"
                        where "courseConversation" = ${request.state.courseConversation!.id}
                        order by "id" asc
                        limit 1;
                      `,
                    );
                  if (firstCourseConversationMessage === undefined)
                    throw new Error();
                  return await Promise.all(
                    application.database
                      .all<{
                        id: number;
                        publicId: string;
                        createdAt: string;
                        updatedAt: string | null;
                        createdByCourseParticipation: number | null;
                        courseConversationMessageType:
                          | "courseConversationMessageTypeMessage"
                          | "courseConversationMessageTypeAnswer"
                          | "courseConversationMessageTypeFollowUpQuestion";
                        courseConversationMessageVisibility:
                          | "courseConversationMessageVisibilityEveryone"
                          | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
                        courseConversationMessageAnonymity:
                          | "courseConversationMessageAnonymityNone"
                          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                          | "courseConversationMessageAnonymityCourseParticipationRoleInstructors";
                        content: string;
                      }>(
                        sql`
                          select
                            "id",
                            "publicId",
                            "createdAt",
                            "updatedAt",
                            "createdByCourseParticipation",
                            "courseConversationMessageType",
                            "courseConversationMessageVisibility",
                            "courseConversationMessageAnonymity",
                            "content"
                          from "courseConversationMessages"
                          where
                            "courseConversation" = ${request.state.courseConversation!.id} $${
                              request.state.courseParticipation!
                                .courseParticipationRole !==
                              "courseParticipationRoleInstructor"
                                ? sql`
                                    and
                                    "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                                  `
                                : sql``
                            }
                          order by "id" asc;
                        `,
                      )
                      .map(async (courseConversationMessage) => {
                        const mayEditCourseConversationMessage =
                          request.state.course!.courseState ===
                            "courseStateActive" &&
                          (request.state.courseParticipation!
                            .courseParticipationRole ===
                            "courseParticipationRoleInstructor" ||
                            request.state.courseParticipation!.id ===
                              courseConversationMessage.createdByCourseParticipation);
                        const courseConversationMessageAnonymous =
                          courseConversationMessage.createdByCourseParticipation !==
                            request.state.courseParticipation!.id &&
                          ((courseConversationMessage.courseConversationMessageAnonymity ===
                            "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
                            request.state.courseParticipation!
                              .courseParticipationRole ===
                              "courseParticipationRoleStudent") ||
                            courseConversationMessage.courseConversationMessageAnonymity ===
                              "courseConversationMessageAnonymityCourseParticipationRoleInstructors");
                        const courseConversationMessageCreatedByCourseParticipation =
                          typeof courseConversationMessage.createdByCourseParticipation ===
                            "number" && !courseConversationMessageAnonymous
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
                                  where "id" = ${courseConversationMessage.createdByCourseParticipation};
                                `,
                              )
                            : undefined;
                        const courseConversationMessageCreatedByUser =
                          typeof courseConversationMessageCreatedByCourseParticipation ===
                          "object"
                            ? application.database.get<{
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
                                lastSeenOnlineAt: string;
                              }>(
                                sql`
                                  select
                                    "publicId",
                                    "name",
                                    "avatarColor",
                                    "avatarImage",
                                    "lastSeenOnlineAt"
                                  from "users"
                                  where "id" = ${courseConversationMessageCreatedByCourseParticipation.user};
                                `,
                              )
                            : undefined;
                        return html`
                          <div
                            key="courseConversationMessage /courses/${request
                              .state.course!.publicId}/conversations/${request
                              .state.courseConversation!
                              .publicId}/messages/${courseConversationMessage.publicId}"
                            css="${css`
                              display: flex;
                              gap: var(--size--2);
                            `} ${request.search.message ===
                            courseConversationMessage.publicId
                              ? css`
                                  background-color: light-dark(
                                    var(--color--slate--50),
                                    var(--color--slate--950)
                                  );
                                  padding: var(--size--2);
                                  border-radius: var(--border-radius--1);
                                  margin: var(--size---2);
                                `
                              : css``}"
                            javascript="${javascript`
                              this.content = ${courseConversationMessage.content};
                              if (${
                                request.search.message ===
                                courseConversationMessage.publicId
                              } && this.scrolled === undefined) {
                                this.scrollIntoView({ block: "center" });
                                this.scrolled = true;
                              }
                            `}"
                          >
                            <div key="courseConversationMessage--sidebar">
                              <div
                                css="${css`
                                  display: flex;
                                  align-items: center;
                                `}"
                              >
                                $${application.database.get(
                                  sql`
                                    select true
                                    from "courseConversationMessageViews"
                                    where
                                      "courseConversationMessage" = ${courseConversationMessage.id} and
                                      "courseParticipation" = ${request.state.courseParticipation!.id};
                                  `,
                                ) === undefined
                                  ? html`
                                      <div
                                        key="courseConversationMessage--sidebar--courseConversationMessageView"
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
                                            }/conversations/${
                                              request.state.courseConversation!
                                                .publicId
                                            }/messages/${courseConversationMessage.publicId}/view`}, {
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
                                  : html``}
                                <div
                                  key="courseConversationMessage--sidebar--userAvatar"
                                >
                                  $${application.partials.userAvatar({
                                    user: courseConversationMessageAnonymous
                                      ? "anonymous"
                                      : (courseConversationMessageCreatedByUser ??
                                        "courseParticipationDeleted"),
                                    size: 9,
                                  })}
                                </div>
                              </div>
                            </div>
                            <div
                              key="courseConversationMessage--main"
                              css="${css`
                                flex: 1;
                                min-width: var(--size--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--1);
                              `}"
                            >
                              <div
                                key="courseConversationMessage--main--header"
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
                                  key="courseConversationMessage--main--header--byline"
                                  css="${css`
                                    flex: 1;
                                  `}"
                                >
                                  $${(() => {
                                    let courseConversationMessageMainHeaderBylineHTMLs: HTML[] =
                                      [];
                                    courseConversationMessageMainHeaderBylineHTMLs.push(
                                      html`<span
                                          css="${css`
                                            font-weight: 600;
                                          `}"
                                          >${courseConversationMessageAnonymous
                                            ? "Anonymous"
                                            : (courseConversationMessageCreatedByUser?.name ??
                                              "Deleted course participant")}</span
                                        >${!courseConversationMessageAnonymous
                                          ? `${
                                              courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                              "courseParticipationRoleInstructor"
                                                ? " (instructor)"
                                                : ""
                                            }${
                                              courseConversationMessage.courseConversationMessageAnonymity ===
                                              "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                                ? " (anonymous to students)"
                                                : courseConversationMessage.courseConversationMessageAnonymity ===
                                                    "courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                                  ? " (anonymous to instructors)"
                                                  : ""
                                            }`
                                          : ``}`,
                                    );
                                    courseConversationMessageMainHeaderBylineHTMLs.push(
                                      html`<span
                                          javascript="${javascript`
                                            javascript.relativizeDateTimeElement(this, ${courseConversationMessage.createdAt}, { capitalize: true });
                                            javascript.popover({ element: this });
                                          `}"
                                        ></span
                                        ><span
                                          type="popover"
                                          javascript="${javascript`
                                            this.textContent = javascript.localizeDateTime(${courseConversationMessage.createdAt});
                                          `}"
                                        ></span
                                        >$${typeof courseConversationMessage.updatedAt ===
                                        "string"
                                          ? html` (updated
                                              <span
                                                javascript="${javascript`
                                                javascript.relativizeDateTimeElement(this, ${courseConversationMessage.updatedAt}, { preposition: true });
                                                javascript.popover({ element: this });
                                              `}"
                                              ></span
                                              ><span
                                                type="popover"
                                                javascript="${javascript`
                                                  this.textContent = javascript.localizeDateTime(${courseConversationMessage.updatedAt});
                                                `}"
                                              ></span
                                              >)`
                                          : html``}`,
                                    );
                                    if (
                                      courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageTypeMessage"
                                    )
                                      "NOOP";
                                    else if (
                                      courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageTypeAnswer"
                                    )
                                      courseConversationMessageMainHeaderBylineHTMLs.push(
                                        html`<span
                                          css="${css`
                                            color: light-dark(
                                              var(--color--green--500),
                                              var(--color--green--500)
                                            );
                                          `}"
                                          ><span
                                            css="${css`
                                              font-weight: 700;
                                            `}"
                                            >Answer</span
                                          >$${courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                                            "courseParticipationRoleStudent" &&
                                          application.database.get(
                                            sql`
                                              select true
                                              from "courseConversationMessageLikes"
                                              join "courseParticipations" on
                                                "courseConversationMessageLikes"."courseParticipation" = "courseParticipations"."id" and
                                                "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor'
                                              where "courseConversationMessageLikes"."courseConversationMessage" = ${courseConversationMessage.id}
                                              limit 1;
                                            `,
                                          ) !== undefined
                                            ? html` (liked by instructor)`
                                            : html``}</span
                                        >`,
                                      );
                                    else if (
                                      courseConversationMessage.courseConversationMessageType ===
                                      "courseConversationMessageTypeFollowUpQuestion"
                                    )
                                      courseConversationMessageMainHeaderBylineHTMLs.push(
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
                                    if (
                                      courseConversationMessage.courseConversationMessageVisibility ===
                                      "courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                                    )
                                      courseConversationMessageMainHeaderBylineHTMLs.push(
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
                                    return courseConversationMessageMainHeaderBylineHTMLs.join(
                                      " · ",
                                    );
                                  })()}
                                </div>
                                <div
                                  key="courseConversationMessage--main--header--menu"
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
                                          await navigator.clipboard.writeText(${`https://${application.configuration.hostname}/courses/${request.state.course!.publicId}/conversations/${request.state.courseConversation!.publicId}?${new URLSearchParams({ message: courseConversationMessage.publicId }).toString()}`});
                                          popover.showPopover();
                                          await utilities.sleep(1000);
                                          popover.hidePopover();
                                        };
                                      `}"
                                    >
                                      Copy permanent link
                                    </button>
                                    <div type="popover">Copied</div>
                                    $${request.state.course!.courseState ===
                                    "courseStateActive"
                                      ? html`
                                          <button
                                            type="button"
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                              this.onclick = () => {
                                                const element = this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--textarea"]');
                                                element.focus();
                                                element.click();
                                                const previousSelectionEnd = element.selectionEnd;
                                                element.selectionStart = element.selectionEnd;
                                                document.execCommand("insertText", false, (0 < element.selectionStart ? "\\n\\n" : "") + ${`> Reply to #${request.state.courseConversation!.publicId}/${courseConversationMessage.publicId}\n>\n> `} + this.closest('[key~="courseConversationMessage"]').content.replaceAll("\\n", "\\n> ") + "\\n\\n");
                                                element.selectionStart = element.selectionEnd = previousSelectionEnd;
                                              };
                                            `}"
                                          >
                                            Reply
                                          </button>
                                        `
                                      : html``}
                                    $${mayEditCourseConversationMessage
                                      ? html`
                                          <button
                                            type="button"
                                            class="button button--rectangle button--transparent button--dropdown-menu"
                                            javascript="${javascript`
                                              this.onclick = async () => {
                                                if (this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--body"]').getAttribute("state") === null) {
                                                  this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--body"]').setAttribute("state", "loading");
                                                  javascript.mount(
                                                    this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--edit"]').firstElementChild,
                                                    await (
                                                      await fetch(
                                                        ${`/courses/${request.state.course!.publicId}/conversations/${request.state.courseConversation!.publicId}/messages/${courseConversationMessage.publicId}/edit`}
                                                      )
                                                    ).text()
                                                  );
                                                  this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--body"]').setAttribute("state", "edit");
                                                }
                                                this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--edit"] [name="content"]').click();
                                                this.closest('[key~="courseConversationMessage"]').querySelector('[key~="courseConversationMessage--main--content--edit"] [name="content"]').focus();
                                              };
                                            `}"
                                          >
                                            Edit
                                          </button>
                                        `
                                      : html``}
                                    $${mayEditCourseConversationMessage &&
                                    request.state.courseParticipation!
                                      .courseParticipationRole ===
                                      "courseParticipationRoleInstructor" &&
                                    courseConversationMessage.id !==
                                      firstCourseConversationMessage.id
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
                                            action="/courses/${request.state
                                              .course!
                                              .publicId}/conversations/${request
                                              .state.courseConversation!
                                              .publicId}/messages/${courseConversationMessage.publicId}"
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
                                      : html``}
                                  </div>
                                </div>
                              </div>
                              <div
                                key="courseConversationMessage--main--content--body"
                              >
                                <div
                                  key="courseConversationMessage--main--content--show"
                                  css="${css`
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--size--1);
                                    [key~="courseConversationMessage--main--content--body"][state]
                                      & {
                                      display: none;
                                    }
                                  `}"
                                >
                                  <div
                                    key="courseConversationMessage--main--content--show--content"
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
                                          this.nextElementSibling.querySelector('[key~="quoteReply"]').quote = this.closest('[key~="courseConversationMessage"]').content.slice(
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
                                    $${await application.partials.courseConversationMessageContentProcessor(
                                      {
                                        course: request.state.course!,
                                        courseParticipation:
                                          request.state.courseParticipation!,
                                        courseConversation:
                                          request.state.courseConversation!,
                                        courseConversationMessage,
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
                                          if (typeof this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor"]').getAttribute("state") === "string")
                                            this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--preview--button"]').click();
                                          const element = this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage--new"] [key~="courseConversationMessageContentEditor--textarea"]');
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
                                    let courseConversationMessageMainContentShowFooterHTML = html``;
                                    if (
                                      request.state.course!.courseState ===
                                      "courseStateActive"
                                    )
                                      courseConversationMessageMainContentShowFooterHTML +=
                                        application.database.get(
                                          sql`
                                            select true
                                            from "courseConversationMessageLikes"
                                            where
                                              "courseConversationMessage" = ${courseConversationMessage.id} and
                                              "courseParticipation" = ${request.state.courseParticipation!.id};
                                          `,
                                        ) === undefined
                                          ? html`
                                              <div
                                                key="courseConversationMessage--main--content--show--footer--like"
                                                type="form"
                                                method="POST"
                                                action="/courses/${request.state
                                                  .course!
                                                  .publicId}/conversations/${request
                                                  .state.courseConversation!
                                                  .publicId}/messages/${courseConversationMessage.publicId}/like"
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
                                                key="courseConversationMessage--main--content--show--footer--like"
                                                type="form"
                                                method="DELETE"
                                                action="/courses/${request.state
                                                  .course!
                                                  .publicId}/conversations/${request
                                                  .state.courseConversation!
                                                  .publicId}/messages/${courseConversationMessage.publicId}/like"
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
                                    const courseConversationMessageLikes =
                                      application.database.all<{
                                        courseParticipation: number | null;
                                      }>(
                                        sql`
                                          select "courseParticipation"
                                          from "courseConversationMessageLikes"
                                          where "courseConversationMessage" = ${courseConversationMessage.id}
                                          order by "id" asc;
                                        `,
                                      );
                                    if (
                                      courseConversationMessageLikes.length > 0
                                    )
                                      courseConversationMessageMainContentShowFooterHTML += html`
                                        <button
                                          key="courseConversationMessage--main--content--show--footer--likes"
                                          type="button"
                                          class="button button--rectangle button--transparent"
                                          javascript="${javascript`
                                            javascript.popover({ element: this, trigger: "click" });
                                          `}"
                                        >
                                          ${String(
                                            courseConversationMessageLikes.length,
                                          )}
                                          like${courseConversationMessageLikes.length !==
                                          1
                                            ? "s"
                                            : ""} <i
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
                                          $${courseConversationMessageLikes.map(
                                            (courseConversationMessageLike) => {
                                              const courseConversationMessageLikeCourseParticipation =
                                                typeof courseConversationMessageLike.courseParticipation ===
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
                                                        where "id" = ${courseConversationMessageLike.courseParticipation};
                                                      `,
                                                    )
                                                  : undefined;
                                              const courseConversationMessageLikeUser =
                                                courseConversationMessageLikeCourseParticipation !==
                                                undefined
                                                  ? application.database.get<{
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
                                                        | string
                                                        | null;
                                                      lastSeenOnlineAt: string;
                                                    }>(
                                                      sql`
                                                        select
                                                          "publicId",
                                                          "name",
                                                          "avatarColor",
                                                          "avatarImage",
                                                          "lastSeenOnlineAt"
                                                        from "users"
                                                        where "id" = ${courseConversationMessageLikeCourseParticipation.user};
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
                                                        courseConversationMessageLikeUser ??
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
                                                    ${courseConversationMessageLikeUser?.name ??
                                                    "Deleted course participant"}$${courseConversationMessageLikeCourseParticipation?.courseParticipationRole ===
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
                                                      : html``}
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
                                      const courseConversationMessageViews =
                                        application.database.all<{
                                          createdAt: string;
                                          courseParticipation: number | null;
                                        }>(
                                          sql`
                                            select "createdAt", "courseParticipation"
                                            from "courseConversationMessageViews"
                                            where "courseConversationMessage" = ${courseConversationMessage.id}
                                            order by "id" asc;
                                          `,
                                        );
                                      courseConversationMessageMainContentShowFooterHTML +=
                                        courseConversationMessageViews.length >
                                        0
                                          ? html`
                                              <button
                                                key="courseConversationMessage--main--content--show--footer--views"
                                                type="button"
                                                class="button button--rectangle button--transparent"
                                                javascript="${javascript`
                                                  javascript.popover({ element: this, trigger: "click" });
                                                `}"
                                              >
                                                ${String(
                                                  courseConversationMessageViews.length,
                                                )}
                                                view${courseConversationMessageViews.length !==
                                                1
                                                  ? "s"
                                                  : ""} <i
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
                                                $${courseConversationMessageViews.map(
                                                  (
                                                    courseConversationMessageView,
                                                  ) => {
                                                    const courseConversationMessageViewCourseParticipation =
                                                      typeof courseConversationMessageView.courseParticipation ===
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
                                                              where "id" = ${courseConversationMessageView.courseParticipation};
                                                            `,
                                                          )
                                                        : undefined;
                                                    const courseConversationMessageViewUser =
                                                      courseConversationMessageViewCourseParticipation !==
                                                      undefined
                                                        ? application.database.get<{
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
                                                              | string
                                                              | null;
                                                            lastSeenOnlineAt: string;
                                                          }>(
                                                            sql`
                                                              select
                                                                "publicId",
                                                                "name",
                                                                "avatarColor",
                                                                "avatarImage",
                                                                "lastSeenOnlineAt"
                                                              from "users"
                                                              where "id" = ${courseConversationMessageViewCourseParticipation.user};
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
                                                              courseConversationMessageViewUser ??
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
                                                          ${courseConversationMessageViewUser?.name ??
                                                          "Deleted course participant"}<span
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
                                                            >${courseConversationMessageViewCourseParticipation?.courseParticipationRole ===
                                                            "courseParticipationRoleInstructor"
                                                              ? " (instructor)"
                                                              : ""} ·
                                                            <span
                                                              javascript="${javascript`
                                                                javascript.relativizeDateTimeElement(this, ${courseConversationMessageView.createdAt}, { capitalize: true });
                                                                javascript.popover({ element: this });
                                                              `}"
                                                            ></span
                                                            ><span
                                                              type="popover"
                                                              javascript="${javascript`
                                                                this.textContent = javascript.localizeDateTime(${courseConversationMessageView.createdAt});
                                                              `}"
                                                            ></span
                                                          ></span>
                                                        </div>
                                                      </div>
                                                    `;
                                                  },
                                                )}
                                              </div>
                                            `
                                          : html`
                                              <div
                                                key="courseConversationMessage--main--content--show--footer--views"
                                              >
                                                0 views
                                              </div>
                                            `;
                                    }
                                    return courseConversationMessageMainContentShowFooterHTML !==
                                      html``
                                      ? html`
                                          <div
                                            key="courseConversationMessage--main--content--show--footer"
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
                                            $${courseConversationMessageMainContentShowFooterHTML}
                                          </div>
                                        `
                                      : html``;
                                  })()}
                                </div>
                                $${mayEditCourseConversationMessage
                                  ? html`
                                      <div
                                        key="courseConversationMessage--main--content--loading"
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
                                          [key~="courseConversationMessage--main--content--body"]:not(
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
                                        key="courseConversationMessage--main--content--edit"
                                        css="${css`
                                          [key~="courseConversationMessage--main--content--body"]:not(
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
                                  : html``}
                              </div>
                            </div>
                          </div>
                        `;
                      }),
                  );
                })()}
                <div
                  key="courseConversationMessage latencyCompensation"
                  hidden
                  css="${css`
                    display: flex;
                    gap: var(--size--2);
                    animation: var(--animation--pulse);
                  `}"
                  javascript="${javascript`
                    this.hidden = true;
                  `}"
                >
                  <div key="courseConversationMessage--sidebar">
                    <div key="courseConversationMessage--sidebar--userAvatar">
                      $${application.partials.userAvatar({
                        user: request.state.user,
                        size: 9,
                      })}
                    </div>
                  </div>
                  <div
                    key="courseConversationMessage--main"
                    css="${css`
                      flex: 1;
                      min-width: var(--size--0);
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--1);
                    `}"
                  >
                    <div
                      key="courseConversationMessage--main--header"
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
                        key="courseConversationMessage--main--header--byline"
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
                      key="courseConversationMessage--main--content--show"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--1);
                      `}"
                    >
                      <div
                        key="courseConversationMessage--main--content--show--content"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              $${request.state.course.courseState === "courseStateActive"
                ? html`
                    <div
                      type="form"
                      key="courseConversationMessage--new"
                      method="POST"
                      action="/courses/${request.state.course
                        .publicId}/conversations/${request.state
                        .courseConversation.publicId}/messages"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                      javascript="${javascript`
                        this.onsubmit = () => {
                          this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage"][key~="latencyCompensation"] [key~="courseConversationMessage--main--content--show--content"]').textContent = this.querySelector('[name="content"]').value;
                          this.closest('[key~="courseConversation"]').querySelector('[key~="courseConversationMessage"][key~="latencyCompensation"]').hidden = false;
                          if (typeof this.querySelector('[key~="courseConversationMessageContentEditor"]').getAttribute("state") === "string")
                            this.querySelector('[key~="courseConversationMessageContentEditor--preview--button"]').click();
                          javascript.reset(this);
                        };
                      `}"
                    >
                      $${request.state.courseParticipation
                        .courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? (() => {
                            const drafts = application.database.all<{
                              createdByCourseParticipation: number;
                            }>(
                              sql`
                                select "createdByCourseParticipation"
                                from "courseConversationMessageDrafts"
                                where
                                  "courseConversation" = ${request.state.courseConversation.id} and
                                  "createdByCourseParticipation" != ${request.state.courseParticipation.id} and
                                  ${new Date(Date.now() - 2 * 60 * 1000).toISOString()} < "createdAt"
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
                                        if (courseParticipation === undefined)
                                          throw new Error();
                                        const user = application.database.get<{
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
                                        return html`${user.name}${courseParticipation.courseParticipationRole ===
                                        "courseParticipationRoleInstructor"
                                          ? " (instructor)"
                                          : ""}`;
                                      })
                                      .join(", ")}
                                  </div>
                                `
                              : html``;
                          })()
                        : html``}
                      <div
                        javascript="${javascript`
                          this.isModified = false;
                          this.oninput = utilities.foregroundJob(async () => {
                            await fetch(${`/courses/${
                              request.state.course.publicId
                            }/conversations/${request.state.courseConversation.publicId}/messages/draft`}, {
                              method: "POST",
                              headers: { "CSRF-Protection": "true" },
                              body: new URLSearchParams(javascript.serialize(this)),
                            });
                          });
                        `}"
                      >
                        $${application.partials.courseConversationMessageContentEditor(
                          {
                            course: request.state.course,
                            courseParticipation:
                              request.state.courseParticipation,
                            courseConversation:
                              request.state.courseConversation,
                            courseConversationMessageContent:
                              application.database.get<{ content: string }>(
                                sql`
                                  select "content"
                                  from "courseConversationMessageDrafts"
                                  where
                                    "courseConversation" = ${request.state.courseConversation.id} and
                                    "createdByCourseParticipation" = ${request.state.courseParticipation.id};
                                `,
                              )?.content,
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
                          let courseConversationMessageNewOptionsHTML = html``;
                          if (
                            request.state.courseConversation
                              .courseConversationType ===
                            "courseConversationTypeQuestion"
                          )
                            courseConversationMessageNewOptionsHTML += html`
                              <form>
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
                                    >Type:</span
                                  >  <input
                                    type="radio"
                                    name="courseConversationMessageType"
                                    value="courseConversationMessageTypeMessage"
                                    required
                                    checked
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
                                    name="courseConversationMessageType"
                                    value="courseConversationMessageTypeAnswer"
                                    required
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
                                    name="courseConversationMessageType"
                                    value="courseConversationMessageTypeFollowUpQuestion"
                                    required
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeMessage"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeAnswer"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeFollowUpQuestion"]').click();
                                      };
                                    `}"
                                  >
                                    Follow-up question
                                  </button>
                                </div>
                              </form>
                            `;
                          if (
                            request.state.courseParticipation
                              .courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                          )
                            courseConversationMessageNewOptionsHTML += html`
                              <form>
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
                                  >  <input
                                    type="radio"
                                    name="courseConversationMessageVisibility"
                                    value="courseConversationMessageVisibilityEveryone"
                                    required
                                    checked
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
                                    name="courseConversationMessageVisibility"
                                    value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                                    required
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityEveryone"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"]').click();
                                      };
                                    `}"
                                  >
                                    Instructors
                                  </button>
                                </div>
                              </form>
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
                                "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors")
                          )
                            courseConversationMessageNewOptionsHTML += html`
                              <form>
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
                                    >Anonymity:</span
                                  >  <input
                                    type="radio"
                                    name="courseConversationMessageAnonymity"
                                    value="courseConversationMessageAnonymityNone"
                                    checked
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
                                    name="courseConversationMessageAnonymity"
                                    value="courseConversationMessageAnonymityCourseParticipationRoleStudents"
                                    required
                                    hidden
                                  /><span
                                    css="${css`
                                      :not(:checked) + & {
                                        display: none;
                                      }
                                    `}"
                                    >Anonymous to students</span
                                  >$${request.state.course
                                    .courseParticipationRoleStudentsAnonymityAllowed ===
                                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                                    ? html`<input
                                          type="radio"
                                          name="courseConversationMessageAnonymity"
                                          value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"
                                          required
                                          hidden
                                        /><span
                                          css="${css`
                                            :not(:checked) + & {
                                              display: none;
                                            }
                                          `}"
                                          >Anonymous to instructors</span
                                        >`
                                    : html``} <i class="bi bi-chevron-down"></i>
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityNone"]').click();
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
                                        this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                                      };
                                    `}"
                                  >
                                    Anonymous to students
                                  </button>
                                  $${request.state.course
                                    .courseParticipationRoleStudentsAnonymityAllowed ===
                                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleInstructors"
                                    ? html`
                                        <button
                                          type="button"
                                          class="button button--rectangle button--transparent button--dropdown-menu"
                                          javascript="${javascript`
                                            this.onclick = () => {
                                              this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleInstructors"]').click();
                                            };
                                          `}"
                                        >
                                          Anonymous to instructors
                                        </button>
                                      `
                                    : html``}
                                </div>
                              </form>
                            `;
                          return courseConversationMessageNewOptionsHTML !==
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
                                  $${courseConversationMessageNewOptionsHTML}
                                </div>
                              `
                            : html``;
                        })()}
                      </div>
                    </div>
                  `
                : html``}
            </div>
          `,
        }),
      );
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          title: string;
          courseConversationType:
            | "courseConversationTypeNote"
            | "courseConversationTypeQuestion";
          questionResolved: "false" | "true";
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: "false" | "true";
          tags: string[];
        },
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversationsTags === undefined ||
        request.state.courseConversation === undefined ||
        !(
          request.state.courseParticipation.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
          request.state.courseParticipation.id ===
            (
              application.database.get<{
                createdByCourseParticipation: number;
              }>(
                sql`
                  select "createdByCourseParticipation"
                  from "courseConversationMessages"
                  where "courseConversation" = ${request.state.courseConversation.id}
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
      request.body.tags ??= [];
      if (
        typeof request.body.title !== "string" ||
        request.body.title.trim() === "" ||
        (request.body.courseConversationType !== "courseConversationTypeNote" &&
          request.body.courseConversationType !==
            "courseConversationTypeQuestion") ||
        (request.body.questionResolved === "true" &&
          request.body.courseConversationType ===
            "courseConversationTypeQuestion") ||
        (request.body.courseConversationVisibility !==
          "courseConversationVisibilityEveryone" &&
          request.body.courseConversationVisibility !==
            "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
          request.body.courseConversationVisibility !==
            "courseConversationVisibilityCourseConversationParticipations") ||
        (request.body.pinned === "true" &&
          request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor") ||
        !Array.isArray(request.body.tags) ||
        (Boolean(request.state.course.courseConversationRequiresTagging) &&
          0 < request.state.courseConversationsTags.length &&
          request.body.tags.length === 0) ||
        request.body.tags.some(
          (tag) =>
            typeof tag !== "string" ||
            !request.state.courseConversationsTags!.some(
              (courseConversationsTag) =>
                tag === courseConversationsTag.publicId,
            ),
        )
      )
        throw "validation";
      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            update "courseConversations"
            set
              "courseConversationType" = ${request.body.courseConversationType},
              "questionResolved" = ${Number(request.body.questionResolved === "true")},
              "courseConversationVisibility" = ${request.body.courseConversationVisibility},
              "pinned" = ${Number(request.body.pinned === "true")},
              "title" = ${request.body.title},
              "titleSearch" = ${utilities
                .tokenize(request.body.title!)
                .map((tokenWithPosition) => tokenWithPosition.token)
                .join(" ")}
            where "id" = ${request.state.courseConversation!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseConversationTaggings"
            where "courseConversation" = ${request.state.courseConversation!.id};
          `,
        );
        for (const tag of request.body.tags!)
          application.database.run(
            sql`
              insert into "courseConversationTaggings" (
                "courseConversation",
                "courseConversationsTag"
              )
              values (
                ${request.state.courseConversation!.id},
                ${request.state.courseConversationsTags!.find((courseConversationsTag) => tag === courseConversationsTag.publicId)!.id}
              );
            `,
          );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations(?:$|/)`,
          }),
        });
    },
  });
};
