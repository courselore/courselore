import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/views$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        { courseConversationMessagePublicIds: string[] },
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
        !Array.isArray(request.body.courseConversationMessagePublicIds) ||
        request.body.courseConversationMessagePublicIds.some(
          (courseConversationMessagePublicId) =>
            typeof courseConversationMessagePublicId !== "string",
        )
      )
        throw "validation";
      application.database.executeTransaction(() => {
        for (const courseConversationMessagePublicId of request.body
          .courseConversationMessagePublicIds!) {
          const courseConversationMessage = application.database.get<{
            id: number;
          }>(
            sql`
              select "id"
              from "courseConversationMessages"
              where
                "publicId" = ${courseConversationMessagePublicId} and
                "courseConversation" = ${request.state.courseConversation!.id} $${
                  request.state.courseParticipation!.courseParticipationRole !==
                  "courseParticipationRoleInstructor"
                    ? sql`
                        and
                        "courseConversationMessageType" != 'courseConversationMessageTypeCourseParticipationRoleInstructorWhisper'
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
                from "courseConversationMessageViews"
                where
                  "courseConversationMessage" = ${courseConversationMessage.id} and
                  "courseParticipation" = ${request.state.courseParticipation!.id};
              `,
            ) === undefined
          )
            application.database.run(
              sql`
                insert into "courseConversationMessageViews" (
                  "courseConversationMessage",
                  "courseParticipation",
                  "createdAt"
                )
                values (
                  ${courseConversationMessage.id},
                  ${request.state.courseParticipation!.id},
                  ${new Date().toISOString()}
                );
              `,
            );
        }
      });
      response.end();
    },
  });
};
