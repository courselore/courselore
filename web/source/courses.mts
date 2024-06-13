import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationCourses = {
  types: {
    states: {
      Course: Application["types"]["states"]["User"] & {
        course: {
          id: number;
          externalId: string;
          name: string;
        };
        courseParticipation: {
          id: number;
          externalId: string;
          createdAt: string;
          courseRole: "courseStaff" | "courseStudent";
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
          mostRecentlyVisitedCourseConversation: number;
        };
        courseConversationTags: {
          id: number;
          externalId: string;
          name: string;
          courseStaff: number;
        }[];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    pathname: new RegExp("^/courses/(?<courseId>[0-9]+)(?:$|/)"),
    handler: (
      request: serverTypes.Request<
        { courseId: string },
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (request.state.user === undefined) return;
      request.state.course = application.database.get<{
        id: number;
        externalId: string;
        name: string;
      }>(
        sql`
          select "id", "externalId", "name"
          from "courses"
          where "externalId" = ${request.pathname.courseId};
        `,
      );
      if (request.state.course === undefined) return;
      request.state.courseParticipation = application.database.get<{
        id: number;
        externalId: string;
        createdAt: string;
        courseRole: "courseStaff" | "courseStudent";
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
        mostRecentlyVisitedCourseConversation: number;
      }>(
        sql`
          select
            "id",
            "externalId",
            "createdAt",
            "courseRole",
            "color",
            "mostRecentlyVisitedCourseConversation"
          from "courseParticipations"
          where
            "user" = ${request.state.user.id} and
            "course" = ${request.state.course.id};
        `,
      );
      if (request.state.courseParticipation === undefined) return;
      request.state.courseConversationTags = application.database.all<{
        id: number;
        externalId: string;
        name: string;
        courseStaff: number;
      }>(
        sql`
          select "id", "externalId", "name", "courseStaff"
          from "courseConversationTags"
          where
            "course" = ${request.state.course.id}$${
              request.state.courseParticipation.courseRole !== "courseStaff"
                ? sql`
                    and
                    "courseStaff" = ${Number(true)}
                  `
                : sql``
            }
          order by "order";
        `,
      );
    },
  });
};
