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
          darkMode: "system" | "light" | "dark";
          sidebarWidth: number;
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
        name: string;
        darkMode: "system" | "light" | "dark";
        sidebarWidth: number;
      }>(
        sql`
          select "id", "name", "darkMode", "sidebarWidth"
          from "users"
          where "id" = ${1};
        `,
      );
    },
  });
};
