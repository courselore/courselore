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
          name: string;
          avatarlessBackgroundColor:
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
          darkMode: "system" | "light" | "dark";
          sidebarWidth: number;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  // TODO
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
        name: string;
        avatarlessBackgroundColor:
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
        darkMode: "system" | "light" | "dark";
        sidebarWidth: number;
      }>(
        sql`
          select "id", "name", "avatarlessBackgroundColor", "darkMode", "sidebarWidth"
          from "users"
          where "id" = ${1};
        `,
      );
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