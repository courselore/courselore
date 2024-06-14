import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "PUT",
    pathname: new RegExp(
      "^/courses/(?<courseId>[0-9]+)/conversations/(?<courseConversationId>[0-9]+)/messages/readings$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { courseConversationMessageIds: string[] },
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      if (
        !Array.isArray(request.body.courseConversationMessageIds) ||
        request.body.courseConversationMessageIds.some(
          (courseConversationMessageId) =>
            typeof courseConversationMessageId !== "string",
        )
      )
        throw "validation";
      application.database.executeTransaction(() => {
        for (const courseConversationMessageId of request.body
          .courseConversationMessageIds!) {
          const courseConversationMessage = application.database.get<{
            id: number;
          }>(
            sql`
              select "id"
              from "courseConversationMessages"
              where
                "externalId" = ${courseConversationMessageId} and
                "courseConversation" = ${request.state.courseConversation!.id} $${
                  request.state.courseParticipation!.courseRole !==
                  "courseStaff"
                    ? sql`
                        and
                        "courseConversationMessageType" != 'courseConversationMessageCourseStaffWhisper'
                      `
                    : sql``
                };
            `,
          );
          if (courseConversationMessage === undefined) continue;
          if (
            application.database.get(
              sql`
                select true
                from "courseConversationMessageReadings"
                where
                  "courseConversationMessage" = ${courseConversationMessage.id} and
                  "courseParticipation" = ${request.state.courseParticipation!.id};
              `,
            ) === undefined
          )
            application.database.run(
              sql`
                insert into "courseConversationMessageReadings" (
                  "createdAt",
                  "courseConversationMessage",
                  "courseParticipation"
                )
                values (
                  ${new Date().toISOString()},
                  ${courseConversationMessage.id},
                  ${request.state.courseParticipation!.id}
                );
              `,
            );
        }
      });
      response.end();
    },
  });
};
