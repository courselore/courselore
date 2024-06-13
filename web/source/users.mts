import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
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
          contentEditorProgrammerMode: number;
          anonymous: number;
          mostRecentlyVisitedCourse: number | null;
        };
      };
    };
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
        contentEditorProgrammerMode: number;
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
            "contentEditorProgrammerMode",
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
};
