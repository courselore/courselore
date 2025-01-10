import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationUsers = {
  types: {
    states: {
      User: {
        user: {
          id: number;
          publicId: string;
          createdAt: string;
          name: string;
          email: string;
          emailVerificationEmail: string | null;
          emailVerificationNonce: string | null;
          emailVerificationCreatedAt: string | null;
          emailVerified: number;
          password: string | null;
          passwordResetNonce: string | null;
          passwordResetCreatedAt: string | null;
          oneTimePasswordEnabled: number;
          oneTimePasswordSecret: string | null;
          oneTimePasswordBackupCodes: string | null;
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
          userRole:
            | "userRoleSystemAdministrator"
            | "userRoleStaff"
            | "userRoleUser";
          lastSeenOnlineAt: string;
          darkMode:
            | "userDarkModeSystem"
            | "userDarkModeLight"
            | "userDarkModeDark";
          sidebarWidth: number;
          emailNotificationsForAllMessages: number;
          emailNotificationsForMessagesIncludingMentions: number;
          emailNotificationsForMessagesInConversationsYouStarted: number;
          emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
          userAnonymityPreferred:
            | "userAnonymityPreferredNone"
            | "userAnonymityPreferredCourseParticipationRoleStudents"
            | "userAnonymityPreferredCourseParticipationRoleInstructors";
          mostRecentlyVisitedCourseParticipation: number | null;
        };
      };
    };
  };
  partials: {
    userAvatar: ({
      user,
      onlineIndicator,
      size,
    }: {
      user:
        | {
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
          }
        | "courseParticipationDeleted"
        | "anonymous";
      onlineIndicator?: boolean;
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
      // TODO
      request.state.user = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        name: string;
        email: string;
        emailVerificationEmail: string | null;
        emailVerificationNonce: string | null;
        emailVerificationCreatedAt: string | null;
        emailVerified: number;
        password: string | null;
        passwordResetNonce: string | null;
        passwordResetCreatedAt: string | null;
        oneTimePasswordEnabled: number;
        oneTimePasswordSecret: string | null;
        oneTimePasswordBackupCodes: string | null;
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
        userRole:
          | "userRoleSystemAdministrator"
          | "userRoleStaff"
          | "userRoleUser";
        lastSeenOnlineAt: string;
        darkMode:
          | "userDarkModeSystem"
          | "userDarkModeLight"
          | "userDarkModeDark";
        sidebarWidth: number;
        emailNotificationsForAllMessages: number;
        emailNotificationsForMessagesIncludingMentions: number;
        emailNotificationsForMessagesInConversationsYouStarted: number;
        emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
        userAnonymityPreferred:
          | "userAnonymityPreferredNone"
          | "userAnonymityPreferredCourseParticipationRoleStudents"
          | "userAnonymityPreferredCourseParticipationRoleInstructors";
        mostRecentlyVisitedCourseParticipation: number | null;
      }>(
        sql`
          select
            "id",
            "publicId",
            "createdAt",
            "name",
            "email",
            "emailVerificationEmail",
            "emailVerificationNonce",
            "emailVerificationCreatedAt",
            "emailVerified",
            "password",
            "passwordResetNonce",
            "passwordResetCreatedAt",
            "oneTimePasswordEnabled",
            "oneTimePasswordSecret",
            "oneTimePasswordBackupCodes",
            "avatarColor",
            "avatarImage",
            "userRole",
            "lastSeenOnlineAt",
            "darkMode",
            "sidebarWidth",
            "emailNotificationsForAllMessages",
            "emailNotificationsForMessagesIncludingMentions",
            "emailNotificationsForMessagesInConversationsYouStarted",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
            "userAnonymityPreferred",
            "mostRecentlyVisitedCourseParticipation"
          from "users"
          where "id" = ${1};
        `,
      );
    },
  });

  // TODO
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
        publicId: number;
      }>(
        sql`
          select "publicId"
          from "courses"
          where "id" = ${
            request.state.user.mostRecentlyVisitedCourseParticipation ??
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
      response.redirect(`/courses/${course.publicId}`);
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

  application.partials.userAvatar = ({
    user,
    onlineIndicator = true,
    size = 6,
  }) => html`
    <div
      key="user--avatar/${typeof user === "object" ? user.publicId : user}"
      css="${css`
        display: grid;
        & > * {
          grid-area: 1 / 1;
        }
      `}"
    >
      $${typeof user === "object" && typeof user.avatarImage === "string"
        ? html`
            <img
              src="${user.avatarImage}"
              loading="lazy"
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
              style="
                --color--light: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--800);
                --color--dark: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--200);
                --background-color--light: var(--color--${typeof user ===
              "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--200);
                --background-color--dark: var(--color--${typeof user ===
              "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--800);
                --border-color--light: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--300);
                --border-color--dark: var(--color--${typeof user === "object"
                ? user.avatarColor
                : user === "courseParticipationDeleted"
                  ? "red"
                  : user === "anonymous"
                    ? "blue"
                    : (() => {
                        throw new Error();
                      })()}--900);
              "
              css="${css`
                font-family: "Roboto Serif Variable", var(--font-family--serif);
                line-height: var(--space--0);
                font-weight: 900;
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
                          font-size: var(--font-size--2-5);
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
                            font-size: var(--font-size--6);
                          `
                    } ${css`
                      width: var(--space--9);
                      height: var(--space--9);
                    `}`
                  : (() => {
                      throw new Error();
                    })()}"
            >
              $${typeof user === "object"
                ? (() => {
                    const nameParts = [
                      ...user.name.matchAll(
                        /[\p{Letter}\p{Number}\p{Private_Use}]+/gu,
                      ),
                    ];
                    return html`${nameParts.length === 0
                      ? (() => {
                          throw new Error();
                        })()
                      : nameParts.length === 1
                        ? [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts[0][0],
                            ),
                          ][0].segment
                        : [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts.at(0)![0],
                            ),
                          ][0].segment +
                          [
                            ...new Intl.Segmenter("en-US").segment(
                              nameParts.at(-1)![0],
                            ),
                          ][0].segment}`;
                  })()
                : user === "courseParticipationDeleted"
                  ? html`<i class="bi bi-person-x"></i>`
                  : user === "anonymous"
                    ? html`<i class="bi bi-person"></i>`
                    : (() => {
                        throw new Error();
                      })()}
            </div>
          `}
      $${typeof user === "object"
        ? html`
            <div
              css="${css`
                font-size: var(--space--1-5);
                line-height: var(--space--0);
                color: light-dark(
                  var(--color--green--500),
                  var(--color--green--500)
                );
                justify-self: end;
                align-self: end;
                transform: translate(40%, 40%);
                transition-property: var(--transition-property--opacity);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
              `} ${user.lastSeenOnlineAt <
              new Date(Date.now() - 5 * 60 * 1000).toISOString()
                ? css`
                    opacity: var(--opacity--0);
                  `
                : css``}"
            >
              <i class="bi bi-circle-fill"></i>
            </div>
          `
        : html``}
    </div>
  `;
};
