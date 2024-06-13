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
          createdAt: string;
          name: string;
          year: string | null;
          term: string | null;
          institution: string | null;
          code: string | null;
          invitationLinkCourseStaffToken: string;
          invitationLinkCourseStaffActive: number;
          invitationLinkCourseStudentsToken: string;
          invitationLinkCourseStudentsActive: number;
          courseStudentsMayCreatePolls: number;
          archivedAt: string | null;
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
          mostRecentlyVisitedCourseConversation: number | null;
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
        createdAt: string;
        name: string;
        year: string | null;
        term: string | null;
        institution: string | null;
        code: string | null;
        invitationLinkCourseStaffToken: string;
        invitationLinkCourseStaffActive: number;
        invitationLinkCourseStudentsToken: string;
        invitationLinkCourseStudentsActive: number;
        courseStudentsMayCreatePolls: number;
        archivedAt: string | null;
      }>(
        sql`
          select
            "id",
            "externalId",
            "createdAt",
            "name",
            "year",
            "term",
            "institution",
            "code",
            "invitationLinkCourseStaffToken",
            "invitationLinkCourseStaffActive",
            "invitationLinkCourseStudentsToken",
            "invitationLinkCourseStudentsActive",
            "courseStudentsMayCreatePolls",
            "archivedAt"
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
        mostRecentlyVisitedCourseConversation: number | null;
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

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<courseId>[0-9]+)$"),
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
        request.state.courseParticipation === undefined
      )
        return;
      const courseConversation = application.database.get<{
        externalId: number;
      }>(
        sql`
          select "externalId"
          from "courseConversations"
          $${
            typeof request.state.courseParticipation
              .mostRecentlyVisitedCourseConversation === "number"
              ? sql`
                  where "id" = ${
                    request.state.courseParticipation
                      .mostRecentlyVisitedCourseConversation
                  }
                `
              : sql`
                  where "course" = ${request.state.course.id} -- TODO: "courseConversationParticipations"
                  order by "id" desc
                  limit 1
                `
          };
        `,
      );
      if (courseConversation === undefined) return;
      response.redirect(
        `/courses/${request.state.course.externalId}/conversations/${courseConversation.externalId}`,
      );
    },
  });
};
