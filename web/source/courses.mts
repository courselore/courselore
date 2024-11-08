import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourses = {
  types: {
    states: {
      Course: Application["types"]["states"]["User"] & {
        course: {
          id: number;
          publicId: string;
          createdAt: string;
          name: string;
          information: string | null;
          invitationLinkCourseParticipationRoleInstructorsEnabled: number;
          invitationLinkCourseParticipationRoleInstructorsToken: string;
          invitationLinkCourseParticipationRoleStudentsEnabled: number;
          invitationLinkCourseParticipationRoleStudentsToken: string;
          courseConversationRequiresTagging: number;
          courseParticipationRoleStudentsAnonymityAllowed: number;
          courseParticipationRoleStudentsMayHavePrivateCourseConversations: number;
          courseParticipationRoleStudentsMayAttachImages: number;
          courseParticipationRoleStudentsMayCreatePolls: number;
          courseState: "courseStateActive" | "courseStateArchived";
          courseConversationsNextPublicId: number;
        };
        courseParticipation: {
          id: number;
          publicId: string;
          createdAt: string;
          courseParticipationRole:
            | "courseParticipationRoleInstructor"
            | "courseParticipationRoleStudent";
          decorationColor:
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
        courseConversationsTags: {
          id: number;
          publicId: string;
          name: string;
          privateToCourseParticipationRoleInstructors: number;
        }[];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)(?:$|/)"),
    handler: (
      request: serverTypes.Request<
        { coursePublicId: string },
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
        publicId: string;
        createdAt: string;
        name: string;
        information: string | null;
        invitationLinkCourseParticipationRoleInstructorsEnabled: number;
        invitationLinkCourseParticipationRoleInstructorsToken: string;
        invitationLinkCourseParticipationRoleStudentsEnabled: number;
        invitationLinkCourseParticipationRoleStudentsToken: string;
        courseConversationRequiresTagging: number;
        courseParticipationRoleStudentsAnonymityAllowed: number;
        courseParticipationRoleStudentsMayHavePrivateCourseConversations: number;
        courseParticipationRoleStudentsMayAttachImages: number;
        courseParticipationRoleStudentsMayCreatePolls: number;
        courseState: "courseStateActive" | "courseStateArchived";
        courseConversationsNextPublicId: number;
      }>(
        sql`
          select
            "id",
            "publicId",
            "createdAt",
            "name",
            "information",
            "invitationLinkCourseParticipationRoleInstructorsEnabled",
            "invitationLinkCourseParticipationRoleInstructorsToken",
            "invitationLinkCourseParticipationRoleStudentsEnabled",
            "invitationLinkCourseParticipationRoleStudentsToken",
            "courseConversationRequiresTagging",
            "courseParticipationRoleStudentsAnonymityAllowed",
            "courseParticipationRoleStudentsMayHavePrivateCourseConversations",
            "courseParticipationRoleStudentsMayAttachImages",
            "courseParticipationRoleStudentsMayCreatePolls",
            "courseState",
            "courseConversationsNextPublicId"
          from "courses"
          where "publicId" = ${request.pathname.coursePublicId};
        `,
      );
      if (request.state.course === undefined) return;
      request.state.courseParticipation = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        courseParticipationRole:
          | "courseParticipationRoleInstructor"
          | "courseParticipationRoleStudent";
        decorationColor:
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
            "publicId",
            "createdAt",
            "courseParticipationRole",
            "decorationColor",
            "mostRecentlyVisitedCourseConversation"
          from "courseParticipations"
          where
            "user" = ${request.state.user.id} and
            "course" = ${request.state.course.id};
        `,
      );
      if (request.state.courseParticipation === undefined) return;
      request.state.courseConversationsTags = application.database.all<{
        id: number;
        publicId: string;
        name: string;
        privateToCourseParticipationRoleInstructors: number;
      }>(
        sql`
          select
            "id",
            "publicId",
            "name",
            "privateToCourseParticipationRoleInstructors"
          from "courseConversationsTags"
          where
            "course" = ${request.state.course.id} $${
              request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor"
                ? sql`
                    and
                    "privateToCourseParticipationRoleInstructors" = ${Number(false)}
                  `
                : sql``
            }
          order by "order" asc;
        `,
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)$"),
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
        publicId: number;
      }>(
        sql`
          select "publicId"
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
                  where
                    "course" = ${request.state.course.id} and (
                      "courseConversationParticipations" = 'courseConversationParticipationsEveryone'
                      $${
                        request.state.courseParticipation
                          .courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? sql`
                              or
                              "courseConversationParticipations" = 'courseConversationParticipationsCourseParticipationRoleInstructors'
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
                  order by "id" desc
                  limit 1
                `
          };
        `,
      );
      if (courseConversation === undefined) return;
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${courseConversation.publicId}`,
      );
    },
  });
};
