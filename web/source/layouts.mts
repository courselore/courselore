import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationLayouts = {
  layouts: {
    base: ({
      request,
      response,
      head,
      hamburger,
      body,
    }: {
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"] &
          Application["types"]["states"]["Course"]
      >;
      response: serverTypes.Response;
      head: HTML;
      hamburger?: boolean;
      body: HTML;
    }) => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  css`
    @import "@radically-straightforward/javascript/static/index.css";
    @import "@fontsource-variable/roboto-flex/slnt.css";
    @import "@fontsource-variable/roboto-serif/wght.css";
    @import "@fontsource-variable/roboto-serif/wght-italic.css";
    @import "@fontsource-variable/roboto-mono/wght.css";
    @import "@fontsource-variable/roboto-mono/wght-italic.css";
    @import "bootstrap-icons/font/bootstrap-icons.css";
    @import "katex/dist/katex.css";

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

    .input--checkbox,
    .input--radio {
      color: light-dark(var(--color--slate--50), var(--color--slate--950));
      background-color: light-dark(
        var(--color--slate--50),
        var(--color--slate--950)
      );
      width: var(--space--3-5);
      height: var(--space--3-5);
      border: var(--border-width--1) solid
        light-dark(var(--color--slate--400), var(--color--slate--600));
      display: inline-flex;
      justify-content: center;
      align-items: center;
      transition-property: var(--transition-property--colors);
      transition-duration: var(--transition-duration--150);
      transition-timing-function: var(
        --transition-timing-function--ease-in-out
      );
      &:checked {
        background-color: light-dark(
          var(--color--blue--500),
          var(--color--blue--500)
        );
        border-color: light-dark(
          var(--color--blue--600),
          var(--color--blue--600)
        );
      }
    }

    .input--checkbox {
      vertical-align: var(--space---0-5);
      border-radius: var(--border-radius--1);
      &::after {
        content: "\\f633";
        font-family: "bootstrap-icons";
      }
    }

    .input--radio {
      vertical-align: var(--space--px);
      border-radius: var(--border-radius--circle);
      font-size: var(--space--1-5);
      &::after {
        content: "\\f287";
        font-family: "bootstrap-icons";
      }
    }

    .button {
      border-radius: var(--border-radius--1);
      cursor: pointer;
      user-select: none;
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
            font-weight: 600;
            color: light-dark(var(--color--white), var(--color--white));
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
      &.button--dropdown-menu {
        font-weight: 400;
        width: calc(var(--space--2) + 100% + var(--space--2));
        border: none;
        border-radius: calc(var(--border-radius--1) - var(--border-width--1));
      }
    }

    .separator {
      border-top: var(--border-width--1) solid
        light-dark(var(--color--slate--200), var(--color--slate--800));
    }
  `;

  javascript`
    import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
    import * as utilities from "@radically-straightforward/utilities";
    import html from "@radically-straightforward/html";
    import { unified } from "unified";
    import rehypeParse from "rehype-parse";
    import rehypeRemark from "rehype-remark";
    import remarkGfm from "remark-gfm";
    import remarkStringify from "remark-stringify";
  `;

  application.layouts.base = ({
    request,
    response,
    head,
    hamburger = false,
    body,
  }) => html`
    <!doctype html>
    <html
      css="${request.state.user === undefined ||
      request.state.user.darkMode === "userDarkModeSystem"
        ? css`
            color-scheme: light dark;
          `
        : request.state.user.darkMode === "userDarkModeLight"
          ? css`
              color-scheme: light;
            `
          : request.state.user.darkMode === "userDarkModeDark"
            ? css`
                color-scheme: dark;
              `
            : css``}"
      javascript="${javascript`
        javascript.liveConnection(${request.id}, { reload: ${application.configuration.environment === "development"} });
      `}"
    >
      <head>
        <meta
          name="description"
          content="Communication platform for education"
        />
        <meta name="version" content="${application.version}" />
        <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
        <script src="/${caddy.staticFiles["index.mjs"]}"></script>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        $${head}
      </head>
      <body
        css="${css`
          font-family: "Roboto Flex Variable", var(--font-family--sans-serif);
          font-size: var(--font-size--3-5);
          line-height: var(--font-size--3-5--line-height);
          color: light-dark(var(--color--black), var(--color--white));
          background-color: light-dark(
            var(--color--white),
            var(--color--black)
          );
          position: fixed;
          inset: var(--space--0);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        `}"
      >
        $${request.state.courseParticipation !== undefined
          ? html`
              <div
                key="courseParticipation--decoration ${request.state
                  .courseParticipation.decorationColor}"
                style="
                  --background-color--light: var(--color--${request.state
                  .courseParticipation.decorationColor}--500);
                  --background-color--dark: var(--color--${request.state
                  .courseParticipation.decorationColor}--500);
                  --border-color--light: var(--color--${request.state
                  .courseParticipation.decorationColor}--600);
                  --border-color--dark: var(--color--${request.state
                  .courseParticipation.decorationColor}--600);
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
            `
          : html``}
        <div
          key="header"
          css="${css`
            padding: var(--space--2) var(--space--4);
            border-bottom: var(--border-width--1) solid
              light-dark(var(--color--slate--200), var(--color--slate--800));
            display: flex;
            align-items: center;
            gap: var(--space--4);
          `}"
        >
          $${hamburger
            ? html`
                <button
                  key="header--hamburger"
                  type="button"
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
                      javascript.stateAdd(document.querySelector('[key~="main--two-column-layout"]'), "sidebar--open");
                    };
                  `}"
                >
                  <i class="bi bi-list"></i>
                </button>
              `
            : html``}
          <a
            key="header--logo"
            href="/"
            class="button button--rectangle button--transparent"
            css="${css`
              font-family: "Roboto Serif Variable", var(--font-family--serif);
              font-weight: 900;
              font-size: var(--font-size--4);
              line-height: var(--font-size--4--line-height);
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
            <div>Courselore</div>
          </a>
          <div
            key="header--course"
            css="${css`
              flex: 1;
              min-width: var(--space--0);
            `}"
          >
            $${request.state.user !== undefined &&
            request.state.course !== undefined
              ? html`
                  <button
                    type="button"
                    class="button button--rectangle button--transparent"
                    css="${css`
                      max-width: 100%;
                      display: flex;
                      gap: var(--space--1);
                      align-items: center;
                    `}"
                    javascript="${javascript`
                      javascript.popover({ element: this, trigger: "click" });
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
                  <div
                    type="popover"
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    <a
                      href="/courses/${request.state.course.publicId}/"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                    >
                      Conversations
                    </a>
                    <a
                      href="/courses/${request.state.course.publicId}/settings"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                    >
                      Course settings
                    </a>
                    <hr class="separator" />
                    $${application.database
                      .all<{
                        id: number;
                        course: number;
                        courseParticipationRole:
                          | "courseParticipationRoleInstructor"
                          | "courseParticipationRoleStudent";
                      }>(
                        sql`
                          select
                            "courseParticipations"."id" as "id",
                            "courseParticipations"."course" as "course",
                            "courseParticipations"."courseParticipationRole" as "courseParticipationRole"
                          from "courseParticipations"
                          join "courses" on
                            "courseParticipations"."course" = "courses"."id" and
                            "courseParticipations"."user" = ${request.state.user.id}
                          order by
                            "courses"."courseState" = 'courseStateActive' desc,
                            "courseParticipations"."id" desc;
                        `,
                      )
                      .map((courseParticipation) => {
                        const course = application.database.get<{
                          id: number;
                          publicId: string;
                          name: string;
                          information: string | null;
                          courseState:
                            | "courseStateActive"
                            | "courseStateArchived";
                        }>(
                          sql`
                            select
                              "id",
                              "publicId",
                              "name",
                              "information",
                              "courseState"
                            from "courses"
                            where "id" = ${courseParticipation.course};
                          `,
                        );
                        if (course === undefined) throw new Error();
                        return html`
                          <a
                            key="course-selector ${course.publicId}"
                            href="/courses/${course.publicId}"
                            class="button button--rectangle button--transparent ${request.URL.pathname.match(
                              new RegExp(`^/courses/${course.publicId}/`),
                            ) !== null
                              ? "button--blue"
                              : ""} button--dropdown-menu"
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
                              <div
                                css="${css`
                                  font-weight: 500;
                                `}"
                              >
                                ${course.name}
                              </div>
                              $${(() => {
                                const courseInformationHTML = [
                                  course.courseState === "courseStateArchived"
                                    ? html`<span
                                        css="${css`
                                          font-weight: 700;
                                          [key~="course-selector"]:not(
                                              .button--blue
                                            )
                                            & {
                                            color: light-dark(
                                              var(--color--red--500),
                                              var(--color--red--500)
                                            );
                                          }
                                        `}"
                                        >Archived</span
                                      >`
                                    : html``,
                                  html`${course.information ?? ""}`,
                                ]
                                  .filter(
                                    (courseInformationPart) =>
                                      courseInformationPart !== "",
                                  )
                                  .join(" · ");
                                return courseInformationHTML !== html``
                                  ? html`
                                      <div
                                        css="${css`
                                          font-size: var(--font-size--3);
                                          line-height: var(
                                            --font-size--3--line-height
                                          );
                                          [key~="course-selector"]:not(
                                              .button--blue
                                            )
                                            & {
                                            color: light-dark(
                                              var(--color--slate--600),
                                              var(--color--slate--400)
                                            );
                                          }
                                          [key~="course-selector"].button--blue
                                            & {
                                            color: light-dark(
                                              var(--color--blue--200),
                                              var(--color--blue--200)
                                            );
                                          }
                                        `}"
                                      >
                                        $${courseInformationHTML}
                                      </div>
                                    `
                                  : html``;
                              })()}
                            </div>
                            <div
                              css="${css`
                                font-size: var(--space--1-5);
                                line-height: var(--font-size--3-5--line-height);
                                color: light-dark(
                                  var(--color--blue--500),
                                  var(--color--blue--500)
                                );
                              `} ${request.state.course!.id === course.id ||
                              application.database.get(
                                sql`
                                  select true
                                  from "courseConversationMessages"
                                  join "courseConversations" on
                                    "courseConversationMessages"."courseConversation" = "courseConversations"."id" and
                                    "courseConversations"."course" = ${course.id}
                                    and (
                                      "courseConversations"."courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                                      $${
                                        courseParticipation.courseParticipationRole ===
                                        "courseParticipationRoleInstructor"
                                          ? sql`
                                              or
                                              "courseConversations"."courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
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
                                    )
                                  left join "courseConversationMessageViews" on
                                    "courseConversationMessages"."id" = "courseConversationMessageViews"."courseConversationMessage" and
                                    "courseConversationMessageViews"."courseParticipation" = ${courseParticipation.id}
                                  where
                                    $${
                                      courseParticipation.courseParticipationRole !==
                                      "courseParticipationRoleInstructor"
                                        ? sql`
                                            "courseConversationMessages"."courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors' and
                                          `
                                        : sql``
                                    }
                                    "courseConversationMessageViews"."id" is null
                                  limit 1;
                                `,
                              ) === undefined
                                ? css`
                                    visibility: hidden;
                                  `
                                : css``}"
                            >
                              <i class="bi bi-circle-fill"></i>
                            </div>
                          </a>
                        `;
                      })}
                  </div>
                `
              : html``}
          </div>
          $${request.state.user !== undefined
            ? html`
                <button
                  key="user"
                  type="button"
                  class="button button--square button--transparent"
                  javascript="${javascript`
                    javascript.popover({ element: this, trigger: "click", placement: "bottom-end" })
                  `}"
                >
                  $${application.partials.userAvatar({
                    user: request.state.user,
                    onlineIndicator: false,
                  })}
                </button>
                <div
                  type="popover"
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                  `}"
                >
                  <div
                    css="${css`
                      display: flex;
                      gap: var(--space--2);
                    `}"
                  >
                    <div>
                      $${application.partials.userAvatar({
                        user: request.state.user,
                        onlineIndicator: false,
                        size: 9,
                      })}
                    </div>
                    <div>
                      <div
                        css="${css`
                          font-weight: 700;
                        `}"
                      >
                        ${request.state.user.name}
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
                        ${request.state.user.email}
                      </div>
                    </div>
                  </div>
                  <hr class="separator" />
                  $${request.state.user.userRole ===
                  "userRoleSystemAdministrator"
                    ? html`
                        <a
                          href="/system"
                          class="button button--rectangle button--transparent button--dropdown-menu"
                        >
                          System settings
                        </a>
                      `
                    : html``}
                  <a
                    href="/settings"
                    class="button button--rectangle button--transparent button--dropdown-menu"
                  >
                    User settings
                  </a>
                  <div type="form" method="DELETE" action="/session">
                    <button
                      type="submit"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              `
            : html``}
        </div>
        <div
          key="main"
          css="${css`
            flex: 1;
            min-height: 0;
          `}"
        >
          $${body}
        </div>
      </body>
    </html>
  `;
};
