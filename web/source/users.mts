import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationUsers = {
  types: {
    states: {
      User: {
        user: {
          id: number;
          externalId: string;
          createdAt: string;
          name: string;
          nameSearch: string;
          email: string;
          emailVerificationNonce: string | null;
          emailVerificationCreatedAt: string | null;
          emailVerified: number;
          password: string | null;
          passwordResetNonce: string | null;
          passwordResetCreatedAt: string | null;
          color:
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
          avatar: string | null;
          systemRole: "systemAdministrator" | "systemStaff" | "systemUser";
          lastSeenOnlineAt: string;
          darkMode: "system" | "light" | "dark";
          sidebarWidth: number;
          emailNotificationsForAllMessages: number;
          emailNotificationsForMessagesIncludingMentions: number;
          emailNotificationsForMessagesInConversationsYouStarted: number;
          emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
          anonymous: number;
          mostRecentlyVisitedCourse: number | null;
        };
      };
    };
  };
  partials: {
    user: ({
      user,
      size,
    }: {
      user:
        | Application["types"]["states"]["User"]["user"]
        | "formerCourseParticipation"
        | "anonymous";
      size?: 6 | 9;
    }) => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      request.state.user = application.database.get<{
        id: number;
        externalId: string;
        createdAt: string;
        name: string;
        nameSearch: string;
        email: string;
        emailVerificationNonce: string | null;
        emailVerificationCreatedAt: string | null;
        emailVerified: number;
        password: string | null;
        passwordResetNonce: string | null;
        passwordResetCreatedAt: string | null;
        color:
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
        avatar: string | null;
        systemRole: "systemAdministrator" | "systemStaff" | "systemUser";
        lastSeenOnlineAt: string;
        darkMode: "system" | "light" | "dark";
        sidebarWidth: number;
        emailNotificationsForAllMessages: number;
        emailNotificationsForMessagesIncludingMentions: number;
        emailNotificationsForMessagesInConversationsYouStarted: number;
        emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
        anonymous: number;
        mostRecentlyVisitedCourse: number | null;
      }>(
        sql`
          select
            "id",
            "externalId",
            "createdAt",
            "name",
            "nameSearch",
            "email",
            "emailVerificationNonce",
            "emailVerificationCreatedAt",
            "emailVerified",
            "password",
            "passwordResetNonce",
            "passwordResetCreatedAt",
            "color",
            "avatar",
            "systemRole",
            "lastSeenOnlineAt",
            "darkMode",
            "sidebarWidth",
            "emailNotificationsForAllMessages",
            "emailNotificationsForMessagesIncludingMentions",
            "emailNotificationsForMessagesInConversationsYouStarted",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
            "anonymous",
            "mostRecentlyVisitedCourse"
          from "users"
          where
            "id" = ${1} and
            "emailVerified" = ${Number(true)};
        `,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: "/",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      const course = application.database.get<{
        externalId: number;
      }>(
        sql`
          select "externalId"
          from "courses"
          where "id" = ${
            request.state.user.mostRecentlyVisitedCourse ??
            application.database.get<{
              course: number;
            }>(
              sql`
                select "course"
                from "courseParticipations"
                where "user" = ${request.state.user.id}
                order by "id" desc
                limit 1;
              `,
            )?.course
          };
        `,
      );
      if (course === undefined) return;
      response.redirect(`/courses/${course.externalId}`);
    },
  });

  application.server?.push({
    method: "PATCH",
    pathname: "/settings",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { sidebarWidth: string },
        Application["types"]["states"]["User"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      if (typeof request.body.sidebarWidth === "string")
        if (
          request.body.sidebarWidth.match(/^[0-9]+$/) === null ||
          Number(request.body.sidebarWidth) < 60 * 4 ||
          112 * 4 < Number(request.body.sidebarWidth)
        )
          throw "validation";
        else
          application.database.run(
            sql`
              update "users"
              set "sidebarWidth" = ${Number(request.body.sidebarWidth)}
              where "id" = ${request.state.user.id};
            `,
          );
      response.redirect();
    },
  });

  application.partials.user = ({ user, size = 6 }) =>
    typeof user === "object" && typeof user.avatar === "string"
      ? html`
          <img
            key="user--avatar/${user.externalId}"
            src="${user.avatar}"
            css="${css`
              background-color: light-dark(
                var(--color--white),
                var(--color--white)
              );
              border-radius: var(--border-radius--1);
              display: block;
            `} ${size === 6
              ? css`
                  width: var(--space--6);
                  height: var(--space--6);
                `
              : size === 9
                ? css`
                    width: var(--space--9);
                    height: var(--space--9);
                  `
                : (() => {
                    throw new Error();
                  })()}"
          />
        `
      : html`
          <div
            key="user--avatar/${typeof user === "object"
              ? user.externalId
              : user}"
            style="
              --color--light: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--800);
              --color--dark: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--200);
              --background-color--light: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--200);
              --background-color--dark: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--800);
              --border-color--light: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--300);
              --border-color--dark: var(--color--${typeof user === "object"
              ? user.color
              : user === "formerCourseParticipation"
                ? "red"
                : user === "anonymous"
                  ? "blue"
                  : (() => {
                      throw new Error();
                    })()}--900);
            "
            css="${css`
              line-height: var(--space--0);
              font-weight: 800;
              color: light-dark(var(--color--light), var(--color--dark));
              background-color: light-dark(
                var(--background-color--light),
                var(--background-color--dark)
              );
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
            `} ${size === 6
              ? `${
                  typeof user === "object"
                    ? css`
                        font-size: var(--font-size--3);
                      `
                    : css`
                        font-size: var(--font-size--4);
                      `
                } ${css`
                  width: var(--space--6);
                  height: var(--space--6);
                `}`
              : size === 9
                ? `${
                    typeof user === "object"
                      ? css`
                          font-size: var(--font-size--3-5);
                        `
                      : css`
                          font-size: var(--font-size--7-5);
                        `
                  } ${css`
                    width: var(--space--9);
                    height: var(--space--9);
                  `}`
                : (() => {
                    throw new Error();
                  })()}"
          >
            $${(() => {
              if (typeof user === "object") {
                const nameParts = user.name
                  .split(/\s+/)
                  .filter((namePart) => namePart !== "");
                return html`${nameParts.length < 2
                  ? user.name.trim()[0]
                  : nameParts.at(0)![0] + nameParts.at(-1)![0]}`;
              }
              if (user === "formerCourseParticipation")
                return html`<i class="bi bi-person-fill"></i>`;
              if (user === "anonymous")
                return html`<i class="bi bi-emoji-sunglasses"></i>`;
              throw new Error();
            })()}
          </div>
        `;
};
