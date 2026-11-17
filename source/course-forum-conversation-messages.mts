import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as cryptography from "@radically-straightforward/cryptography";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./application.mjs";

export type ApplicationCourseForumConversationMessages = {
  types: {
    states: {
      CourseForumConversationMessage: Application["types"]["states"]["CourseForumConversation"] & {
        courseForumConversationMessage: {
          id: number;
          publicId: string;
          createdByCourseParticipation: number | null;
          createdAt: string;
          updatedAt: string | null;
          courseForumConversationMessageType:
            | "courseForumConversationMessageTypeMessage"
            | "courseForumConversationMessageTypeAnswer"
            | "courseForumConversationMessageTypeFollowUpQuestion";
          courseForumConversationMessageVisibility:
            | "courseForumConversationMessageVisibilityEveryone"
            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
          content: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/draft$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseForumConversationMessageType:
            | "courseForumConversationMessageTypeMessage"
            | "courseForumConversationMessageTypeAnswer"
            | "courseForumConversationMessageTypeFollowUpQuestion";
          courseForumConversationMessageVisibility:
            | "courseForumConversationMessageVisibilityEveryone"
            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
        },
        Application["types"]["states"]["CourseForumConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !==
            "string" ||
            request.state.courseForumConversation
              .courseForumConversationType !==
              "courseForumConversationTypeQuestion" ||
            (request.body.courseForumConversationMessageType !==
              "courseForumConversationMessageTypeMessage" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeAnswer" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeFollowUpQuestion"))) ||
        (request.body.courseForumConversationMessageVisibility !== undefined &&
          (typeof request.body.courseForumConversationMessageVisibility !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor" ||
            (request.body.courseForumConversationMessageVisibility !==
              "courseForumConversationMessageVisibilityEveryone" &&
              request.body.courseForumConversationMessageVisibility !==
                "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (request.body.courseForumConversationMessageAnonymity !== undefined &&
          (typeof request.body.courseForumConversationMessageAnonymity !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleStudent" ||
            (request.body.courseForumConversationMessageAnonymity !==
              "courseForumConversationMessageAnonymityNone" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityEveryone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityEveryone" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      let sendLiveConnectionUpdates = false;
      application.database.transaction(() => {
        const previouscourseForumConversationMessageDraft =
          application.database.get<{ content: string }>(
            sql`
              select "content"
              from "courseForumConversationMessageDrafts"
              where
                "courseForumConversation" = ${request.state.courseForumConversation!.id} and
                "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
            `,
          );
        sendLiveConnectionUpdates =
          ((previouscourseForumConversationMessageDraft === undefined ||
            previouscourseForumConversationMessageDraft.content.trim() ===
              "") &&
            request.body.content!.trim() !== "") ||
          (previouscourseForumConversationMessageDraft !== undefined &&
            previouscourseForumConversationMessageDraft.content.trim() !== "" &&
            request.body.content!.trim() === "");
        application.database.run(
          sql`
            delete from "courseForumConversationMessageDrafts"
            where
              "courseForumConversation" = ${request.state.courseForumConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        application.database.run(
          sql`
            insert into "courseForumConversationMessageDrafts" (
              "courseForumConversation",
              "createdByCourseParticipation",
              "createdAt",
              "courseForumConversationMessageType",
              "courseForumConversationMessageVisibility",
              "courseForumConversationMessageAnonymity",
              "content"
            )
            values (
              ${request.state.courseForumConversation!.id},
              ${request.state.courseParticipation!.id},
              ${Temporal.Now.instant().toString()},
              ${request.body.courseForumConversationMessageType ?? "courseForumConversationMessageTypeMessage"},
              ${request.body.courseForumConversationMessageVisibility ?? "courseForumConversationMessageVisibilityEveryone"},
              ${request.body.courseForumConversationMessageAnonymity ?? "courseForumConversationMessageAnonymityNone"},
              ${request.body.content!}
            );
          `,
        );
      });
      response.send();
      if (sendLiveConnectionUpdates)
        for (const port of application.applicationConfiguration.ports)
          fetch(`http://localhost:${port}/__live-connections`, {
            method: "POST",
            headers: { "CSRF-Protection": "true" },
            body: new URLSearchParams({
              pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
            }),
          });
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseForumConversationMessageType:
            | "courseForumConversationMessageTypeMessage"
            | "courseForumConversationMessageTypeAnswer"
            | "courseForumConversationMessageTypeFollowUpQuestion";
          courseForumConversationMessageVisibility:
            | "courseForumConversationMessageVisibilityEveryone"
            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
        },
        Application["types"]["states"]["CourseForumConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !==
            "string" ||
            request.state.courseForumConversation
              .courseForumConversationType !==
              "courseForumConversationTypeQuestion" ||
            (request.body.courseForumConversationMessageType !==
              "courseForumConversationMessageTypeMessage" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeAnswer" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeFollowUpQuestion"))) ||
        (request.body.courseForumConversationMessageVisibility !== undefined &&
          (typeof request.body.courseForumConversationMessageVisibility !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor" ||
            (request.body.courseForumConversationMessageVisibility !==
              "courseForumConversationMessageVisibilityEveryone" &&
              request.body.courseForumConversationMessageVisibility !==
                "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (request.body.courseForumConversationMessageAnonymity !== undefined &&
          (typeof request.body.courseForumConversationMessageAnonymity !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleStudent" ||
            (request.body.courseForumConversationMessageAnonymity !==
              "courseForumConversationMessageAnonymityNone" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityEveryone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityEveryone" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      const contentTextContent =
        await application.partials.courseForumConversationMessageContentProcessor(
          {
            course: request.state.course,
            courseForumConversationMessageContent: request.body.content,
            mode: "textContent",
          },
        );
      const contentSemanticSearch = await (
        await fetch("http://localhost:19000/vector-embedding", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).text();
      const contentSentimentAnalysis = (await (
        await fetch("http://localhost:19000/sentiment-analysis", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).json()) as {
        label: "positive" | "neutral" | "negative";
        score: number;
      };
      application.database.transaction(() => {
        application.database.run(
          sql`
            delete from "courseForumConversationMessageDrafts"
            where
              "courseForumConversation" = ${request.state.courseForumConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (
          request.body.courseForumConversationMessageVisibility !==
          "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
        ) {
          if (
            request.body.courseForumConversationMessageType ===
            "courseForumConversationMessageTypeAnswer"
          )
            application.database.run(
              sql`
              update "courseForumConversations"
              set "courseForumConversationTypeQuestionResolved" = ${Number(true)}
              where "id" = ${request.state.courseForumConversation!.id};
            `,
            );
          else if (
            request.body.courseForumConversationMessageType ===
            "courseForumConversationMessageTypeFollowUpQuestion"
          )
            application.database.run(
              sql`
              update "courseForumConversations"
              set "courseForumConversationTypeQuestionResolved" = ${Number(false)}
              where "id" = ${request.state.courseForumConversation!.id};
            `,
            );
        }
        const courseForumConversationMessage = application.database.get<{
          id: number;
        }>(
          sql`
            select * from "courseForumConversationMessages" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseForumConversationMessages" (
                    "publicId",
                    "courseForumConversation",
                    "createdByCourseParticipation",
                    "createdAt",
                    "updatedAt",
                    "courseForumConversationMessageType",
                    "courseForumConversationMessageVisibility",
                    "courseForumConversationMessageAnonymity",
                    "sentViaEmail",
                    "content",
                    "contentLexicalSearch",
                    "contentSemanticSearch",
                    "contentSentimentAnalysisType",
                    "contentSentimentAnalysisIntensity"
                  )
                  values (
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${request.state.courseForumConversation!.id},
                    ${request.state.courseParticipation!.id},
                    ${Temporal.Now.instant().toString()},
                    ${null},
                    ${request.body.courseForumConversationMessageType ?? "courseForumConversationMessageTypeMessage"},
                    ${request.body.courseForumConversationMessageVisibility ?? "courseForumConversationMessageVisibilityEveryone"},
                    ${request.body.courseForumConversationMessageAnonymity ?? "courseForumConversationMessageAnonymityNone"},
                    ${Number(false)},
                    ${request.body.content!},
                    ${utilities
                      .tokenize(contentTextContent, {
                        stopWords:
                          application.applicationConfiguration.stopWords,
                        stem: (token) => natural.PorterStemmer.stem(token),
                      })
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")},
                    vec_f32(${contentSemanticSearch}),
                    ${contentSentimentAnalysis.label},
                    ${contentSentimentAnalysis.score}
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
        application.database.run(
          sql`
            insert into "courseForumConversationMessageViews" (
              "courseForumConversationMessage",
              "courseParticipation",
              "createdAt"
            )
            values (
              ${courseForumConversationMessage.id},
              ${request.state.courseParticipation!.id},
              ${Temporal.Now.instant().toString()}
            );
          `,
        );
        application.database.backgroundJob({
          type: "courseForumConversationMessageEmailNotification",
          startAt: Temporal.Now.instant().add({ minutes: 5 }).toString(),
          parameters: {
            courseForumConversationMessageId: courseForumConversationMessage.id,
          },
        });
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  if (application.commandLineArguments.values.type === "backgroundJobWorker")
    application.database.backgroundJobWorker<{
      courseForumConversationMessageId: number;
      announcement?: boolean;
    }>(
      { type: "courseForumConversationMessageEmailNotification" },
      async (parameters) => {
        const courseForumConversationMessage = application.database.get<{
          id: number;
          publicId: string;
          courseForumConversation: number;
          createdByCourseParticipation: number | null;
          updatedAt: string | null;
          courseForumConversationMessageVisibility:
            | "courseForumConversationMessageVisibilityEveryone"
            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
          content: string;
        }>(
          sql`
            select
              "id",
              "publicId",
              "courseForumConversation",
              "createdByCourseParticipation",
              "updatedAt",
              "courseForumConversationMessageVisibility",
              "courseForumConversationMessageAnonymity",
              "content"
            from "courseForumConversationMessages"
            where "id" = ${parameters.courseForumConversationMessageId};
          `,
        );
        if (courseForumConversationMessage === undefined) return;
        const courseForumConversation = application.database.get<{
          id: number;
          publicId: string;
          course: number;
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationParticipations";
          title: string;
        }>(
          sql`
            select
              "id",
              "publicId",
              "course",
              "courseForumConversationVisibility",
              "title"
            from "courseForumConversations"
            where "id" = ${courseForumConversationMessage.courseForumConversation};
          `,
        );
        if (courseForumConversation === undefined) throw new Error();
        const firstcourseForumConversationMessage = application.database.get<{
          createdByCourseParticipation: number | null;
        }>(
          sql`
            select "createdByCourseParticipation"
            from "courseForumConversationMessages"
            where "courseForumConversation" = ${courseForumConversation.id}
            order by "id" asc
            limit 1;
          `,
        );
        if (firstcourseForumConversationMessage === undefined)
          throw new Error();
        const course = application.database.get<{
          id: number;
          publicId: string;
          name: string;
          courseState: "courseStateActive" | "courseStateArchived";
        }>(
          sql`
            select
              "id",
              "publicId",
              "name",
              "courseState"
            from "courses"
            where "id" = ${courseForumConversation.course};
          `,
        );
        if (course === undefined) throw new Error();
        const courseForumConversationMessageCreatedByCourseParticipation =
          typeof courseForumConversationMessage.createdByCourseParticipation ===
          "number"
            ? application.database.get<{
                user: number;
                courseParticipationRole:
                  | "courseParticipationRoleInstructor"
                  | "courseParticipationRoleStudent";
              }>(
                sql`
                  select
                    "user",
                    "courseParticipationRole"
                  from "courseParticipations"
                  where "id" = ${courseForumConversationMessage.createdByCourseParticipation};
                `,
              )
            : undefined;
        const courseForumConversationMessageCreatedByUser =
          typeof courseForumConversationMessageCreatedByCourseParticipation ===
          "object"
            ? application.database.get<{ name: string }>(
                sql`
                  select "name"
                  from "users"
                  where "id" = ${courseForumConversationMessageCreatedByCourseParticipation.user};
                `,
              )
            : undefined;
        const courseForumConversationMessageMentions =
          await application.partials.courseForumConversationMessageContentProcessor(
            {
              course,
              courseForumConversation,
              courseForumConversationMessage,
              mode: "mentions",
            },
          );
        const courseForumConversationMessageEmailNotifications =
          new Array<any>();
        for (const courseForumConversationMessageEmailNotificationCourseParticipation of application.database.all<{
          id: number;
          publicId: string;
          user: number;
          courseParticipationRole:
            | "courseParticipationRoleInstructor"
            | "courseParticipationRoleStudent";
        }>(
          sql`
            select
              "id",
              "publicId",
              "user",
              "courseParticipationRole"
            from "courseParticipations"
            where "course" = ${course.id}
            order by "id" asc;
          `,
        )) {
          const courseForumConversationMessageEmailNotificationUser =
            application.database.get<{
              email: string;
              emailNotificationsForCourseForumForAllMessages: number;
              emailNotificationsForCourseForumForMessagesIncludingAMention: number;
              emailNotificationsForCourseForumForMessagesInConversationsInWhichYouParticipated: number;
              emailNotificationsForCourseForumForMessagesInConversationsThatYouStarted: number;
            }>(
              sql`
                select
                  "email",
                  "emailNotificationsForCourseForumForAllMessages",
                  "emailNotificationsForCourseForumForMessagesIncludingAMention",
                  "emailNotificationsForCourseForumForMessagesInConversationsInWhichYouParticipated",
                  "emailNotificationsForCourseForumForMessagesInConversationsThatYouStarted"
                from "users"
                where "id" = ${courseForumConversationMessageEmailNotificationCourseParticipation.user};
              `,
            );
          if (courseForumConversationMessageEmailNotificationUser === undefined)
            throw new Error();
          const courseForumConversationMessageAnonymous =
            courseForumConversationMessage.createdByCourseParticipation !==
              courseForumConversationMessageEmailNotificationCourseParticipation.id &&
            ((courseForumConversationMessage.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              courseForumConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                "courseParticipationRoleStudent") ||
              courseForumConversationMessage.courseForumConversationMessageAnonymity ===
                "courseForumConversationMessageAnonymityEveryone");
          if (
            courseForumConversationMessage.createdByCourseParticipation !==
              courseForumConversationMessageEmailNotificationCourseParticipation.id &&
            (courseForumConversation.courseForumConversationVisibility ===
              "courseForumConversationVisibilityEveryone" ||
              (courseForumConversation.courseForumConversationVisibility ===
                "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                courseForumConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor") ||
              application.database.get(
                sql`
                  select true
                  from "courseForumConversationParticipations"
                  where
                    "courseForumConversation" = ${courseForumConversation.id} and
                    "courseParticipation" = ${courseForumConversationMessageEmailNotificationCourseParticipation.id};
                `,
              ) !== undefined) &&
            (courseForumConversationMessage.courseForumConversationMessageVisibility ===
              "courseForumConversationMessageVisibilityEveryone" ||
              (courseForumConversationMessage.courseForumConversationMessageVisibility ===
                "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors" &&
                courseForumConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor")) &&
            (parameters.announcement === true ||
              Boolean(
                courseForumConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForAllMessages,
              ) ||
              (Boolean(
                courseForumConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesIncludingAMention,
              ) &&
                (courseForumConversationMessageMentions.has("everyone") ||
                  (courseForumConversationMessageMentions.has("instructors") &&
                    courseForumConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                      "courseParticipationRoleInstructor") ||
                  (courseForumConversationMessageMentions.has("students") &&
                    courseForumConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                      "courseParticipationRoleStudent") ||
                  courseForumConversationMessageMentions.has(
                    courseForumConversationMessageEmailNotificationCourseParticipation.publicId,
                  ))) ||
              (Boolean(
                courseForumConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesInConversationsInWhichYouParticipated,
              ) &&
                application.database.get(
                  sql`
                    select true
                    from "courseForumConversationMessages"
                    where
                      "courseForumConversation" = ${courseForumConversation.id} and
                      "createdByCourseParticipation" = ${courseForumConversationMessageEmailNotificationCourseParticipation.id}
                    limit 1;
                  `,
                ) !== undefined) ||
              (Boolean(
                courseForumConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesInConversationsThatYouStarted,
              ) &&
                firstcourseForumConversationMessage.createdByCourseParticipation ===
                  courseForumConversationMessageEmailNotificationCourseParticipation.id)) &&
            application.database.get(
              sql`
                select true
                from "courseForumConversationMessageViews"
                where
                  "courseForumConversationMessage" = ${courseForumConversationMessage.id} and
                  "courseParticipation" = ${courseForumConversationMessageEmailNotificationCourseParticipation.id};
              `,
            ) === undefined
          ) {
            const courseForumConversationMessageEmailNotificationReplyToken =
              cryptoRandomString({
                length: 40,
                characters: "abcdefghijklmnopqrstuvwxyz0123456789",
              });
            application.database.run(
              sql`
                insert into "courseForumConversationMessageEmailNotificationReplyTokens" (
                  "tokenTokenHash",
                  "courseForumConversation",
                  "courseParticipation"
                ) values (
                  ${cryptography.TokenHash.hash(courseForumConversationMessageEmailNotificationReplyToken)},
                  ${courseForumConversation.id},
                  ${courseForumConversationMessageEmailNotificationCourseParticipation.id}
                );
              `,
            );
            courseForumConversationMessageEmailNotifications.push({
              from: {
                name: `${
                  courseForumConversationMessageAnonymous
                    ? "Anonymous"
                    : (courseForumConversationMessageCreatedByUser?.name ??
                      "Deleted course participant")
                } · ${course.name}`,
                address: application.userConfiguration.email.send.from,
              },
              to: courseForumConversationMessageEmailNotificationUser.email,
              replyTo: `${courseForumConversationMessageEmailNotificationReplyToken}@${application.userConfiguration.email.receive.hostname}`,
              inReplyTo: `courses/${course.publicId}/forum/${courseForumConversation.publicId}@${application.userConfiguration.hostname}`,
              references: `courses/${course.publicId}/forum/${courseForumConversation.publicId}@${application.userConfiguration.hostname}`,
              subject: courseForumConversation.title,
              html: html`
                $${await application.partials.courseForumConversationMessageContentProcessor(
                  {
                    course,
                    courseParticipation:
                      courseForumConversationMessageEmailNotificationCourseParticipation,
                    courseForumConversation,
                    courseForumConversationMessage,
                    mode: "emailNotification",
                  },
                )}
                <hr />
                <p>
                  <small>
                    <a
                      href="https://${
                        application.userConfiguration.hostname
                      }/courses/${course.publicId}/forum/${courseForumConversation.publicId}?${new URLSearchParams(
                        {
                          message: courseForumConversationMessage.publicId,
                        },
                      ).toString()}"
                      >See message in Courselore</a
                    > ·
                    <a
                      href="https://${
                        application.userConfiguration.hostname
                      }/settings"
                      >Change email notification preferences</a
                    > · You may answer to this message by replying to this email
                  </small>
                </p>
              `,
            });
          }
        }
        application.database.transaction(() => {
          for (const courseForumConversationMessageEmailNotification of courseForumConversationMessageEmailNotifications)
            application.database.backgroundJob({
              type: "email",
              parameters: courseForumConversationMessageEmailNotification,
            });
        });
      },
    );

  application.webServer?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseForumConversationMessagePublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.courseForumConversationMessagePublicId !==
          "string" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined
      )
        return;
      request.state.courseForumConversationMessage = application.database.get<{
        id: number;
        publicId: string;
        createdByCourseParticipation: number | null;
        createdAt: string;
        updatedAt: string | null;
        courseForumConversationMessageType:
          | "courseForumConversationMessageTypeMessage"
          | "courseForumConversationMessageTypeAnswer"
          | "courseForumConversationMessageTypeFollowUpQuestion";
        courseForumConversationMessageVisibility:
          | "courseForumConversationMessageVisibilityEveryone"
          | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
        courseForumConversationMessageAnonymity:
          | "courseForumConversationMessageAnonymityNone"
          | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
          | "courseForumConversationMessageAnonymityEveryone";
        content: string;
      }>(
        sql`
            select 
              "id",
              "publicId",
              "createdByCourseParticipation",
              "createdAt",
              "updatedAt",
              "courseForumConversationMessageType",
              "courseForumConversationMessageVisibility",
              "courseForumConversationMessageAnonymity",
              "content"
            from "courseForumConversationMessages"
            where
              "courseForumConversation" = ${request.state.courseForumConversation.id} and
              "publicId" = ${request.pathname.courseForumConversationMessagePublicId} and (
                "courseForumConversationMessageVisibility" = 'courseForumConversationMessageVisibilityEveryone'
                ${
                  request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? sql`
                        or
                        "courseForumConversationMessageVisibility" = 'courseForumConversationMessageVisibilityCourseParticipationRoleInstructors'
                      `
                    : sql``
                }
              );
          `,
      );
      if (request.state.courseForumConversationMessage === undefined) return;
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)/edit$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined ||
        request.state.courseForumConversationMessage === undefined ||
        !(
          request.state.course!.courseState === "courseStateActive" &&
          (request.state.courseParticipation!.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
            request.state.courseParticipation!.id ===
              request.state.courseForumConversationMessage
                .createdByCourseParticipation)
        )
      )
        return;
      response.send(html`
        <div
          type="form"
          method="PATCH"
          action="/courses/${request.state.course.publicId}/forum/${
            request.state.courseForumConversation.publicId
          }/messages/${request.state.courseForumConversationMessage.publicId}"
          css="${css`
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
          javascript="${javascript`
            this.onsubmit = () => {
              this.closest('[key~="courseForumConversationMessage--main--content--body"]').removeAttribute("state");
              this.closest('[key~="courseForumConversationMessage--main--content--edit"]').firstElementChild.innerHTML = "";
            };
          `}"
        >
          $${application.partials.courseForumConversationMessageContentEditor({
            course: request.state.course,
            courseParticipation: request.state.courseParticipation,
            courseForumConversation: request.state.courseForumConversation,
            courseForumConversationMessage:
              request.state.courseForumConversationMessage,
          })}
          <div
            css="${css`
              font-size: var(--font-size--3);
              line-height: var(--font-size--3--line-height);
              font-weight: 600;
              color: light-dark(
                var(--color--slate--600),
                var(--color--slate--400)
              );
              display: flex;
              justify-content: space-between;
              gap: var(--size--4);
            `}"
          >
            <div
              css="${css`
                display: flex;
                align-items: baseline;
                gap: var(--size--4);
              `}"
            >
              <div>
                <button
                  type="submit"
                  class="button button--rectangle button--blue"
                >
                  Update
                </button>
              </div>
              $${(() => {
                let courseForumConversationMessageEditOptionsHTML = html``;
                const firstcourseForumConversationMessage =
                  application.database.get<{
                    id: number;
                  }>(
                    sql`
                      select "id"
                      from "courseForumConversationMessages"
                      where "courseForumConversation" = ${request.state.courseForumConversation.id}
                      order by "id" asc
                      limit 1;
                    `,
                  );
                if (firstcourseForumConversationMessage === undefined)
                  throw new Error();
                if (
                  request.state.courseForumConversation
                    .courseForumConversationType ===
                    "courseForumConversationTypeQuestion" &&
                  request.state.courseForumConversationMessage.id !==
                    firstcourseForumConversationMessage.id
                )
                  courseForumConversationMessageEditOptionsHTML += html`
                    <button
                      type="button"
                      class="button button--rectangle button--transparent"
                      javascript="${javascript`
                        javascript.popover({ element: this, trigger: "click" });
                      `}"
                    >
                      <form>
                        <span
                          css="${css`
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                          >Type:</span
                        >  <input
                          type="radio"
                          name="courseForumConversationMessageType"
                          value="courseForumConversationMessageTypeMessage"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageType ===
                            "courseForumConversationMessageTypeMessage"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Message</span
                        ><input
                          type="radio"
                          name="courseForumConversationMessageType"
                          value="courseForumConversationMessageTypeAnswer"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageType ===
                            "courseForumConversationMessageTypeAnswer"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            color: light-dark(
                              var(--color--green--500),
                              var(--color--green--500)
                            );
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Answer</span
                        ><input
                          type="radio"
                          name="courseForumConversationMessageType"
                          value="courseForumConversationMessageTypeFollowUpQuestion"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageType ===
                            "courseForumConversationMessageTypeFollowUpQuestion"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            color: light-dark(
                              var(--color--red--500),
                              var(--color--red--500)
                            );
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Follow-up question</span
                        > <i class="bi bi-chevron-down"></i>
                      </form>
                    </button>
                    <div
                      type="popover"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeMessage"]').click();
                          };
                        `}"
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeAnswer"]').click();
                          };
                        `}"
                      >
                        Answer
                      </button>
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageType"][value="courseForumConversationMessageTypeFollowUpQuestion"]').click();
                          };
                        `}"
                      >
                        Follow-up question
                      </button>
                    </div>
                  `;
                if (
                  request.state.courseParticipation.courseParticipationRole ===
                    "courseParticipationRoleInstructor" &&
                  request.state.courseForumConversationMessage.id !==
                    firstcourseForumConversationMessage.id
                )
                  courseForumConversationMessageEditOptionsHTML += html`
                    <button
                      type="button"
                      class="button button--rectangle button--transparent"
                      javascript="${javascript`
                        javascript.popover({ element: this, trigger: "click" });
                      `}"
                    >
                      <form>
                        <span
                          css="${css`
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                          >Visibility:</span
                        >  <input
                          type="radio"
                          name="courseForumConversationMessageVisibility"
                          value="courseForumConversationMessageVisibilityEveryone"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageVisibility ===
                            "courseForumConversationMessageVisibilityEveryone"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Everyone</span
                        ><input
                          type="radio"
                          name="courseForumConversationMessageVisibility"
                          value="courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageVisibility ===
                            "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            color: light-dark(
                              var(--color--blue--500),
                              var(--color--blue--500)
                            );
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Instructors</span
                        > <i class="bi bi-chevron-down"></i>
                      </form>
                    </button>
                    <div
                      type="popover"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageVisibility"][value="courseForumConversationMessageVisibilityEveryone"]').click();
                          };
                        `}"
                      >
                        Everyone
                      </button>
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageVisibility"][value="courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"]').click();
                          };
                        `}"
                      >
                        Instructors
                      </button>
                    </div>
                  `;
                if (
                  request.state.courseParticipation.courseParticipationRole ===
                    "courseParticipationRoleStudent" &&
                  (request.state.course
                    .courseParticipationRoleStudentsAnonymityAllowed ===
                    "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" ||
                    request.state.course
                      .courseParticipationRoleStudentsAnonymityAllowed ===
                      "courseParticipationRoleStudentsAnonymityAllowedEveryone")
                )
                  courseForumConversationMessageEditOptionsHTML += html`
                    <button
                      type="button"
                      class="button button--rectangle button--transparent"
                      javascript="${javascript`
                        javascript.popover({ element: this, trigger: "click" });
                      `}"
                    >
                      <form>
                        <span
                          css="${css`
                            color: light-dark(
                              var(--color--slate--500),
                              var(--color--slate--500)
                            );
                          `}"
                          >Anonymity:</span
                        >  <input
                          type="radio"
                          name="courseForumConversationMessageAnonymity"
                          value="courseForumConversationMessageAnonymityNone"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageAnonymity ===
                            "courseForumConversationMessageAnonymityNone"
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >None</span
                        ><input
                          type="radio"
                          name="courseForumConversationMessageAnonymity"
                          value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
                          required
                          $${
                            request.state.courseForumConversationMessage
                              .courseForumConversationMessageAnonymity ===
                              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" ||
                            (request.state.course
                              .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" &&
                              request.state.courseForumConversationMessage
                                .courseForumConversationMessageAnonymity ===
                                "courseForumConversationMessageAnonymityEveryone")
                              ? html`checked`
                              : html``
                          }
                          hidden
                        /><span
                          css="${css`
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Anonymous to students</span
                        >$${
                          request.state.course
                            .courseParticipationRoleStudentsAnonymityAllowed ===
                          "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                            ? html`<input
                                  type="radio"
                                  name="courseForumConversationMessageAnonymity"
                                  value="courseForumConversationMessageAnonymityEveryone"
                                  required
                                  $${
                                    request.state.courseForumConversationMessage
                                      .courseForumConversationMessageAnonymity ===
                                    "courseForumConversationMessageAnonymityEveryone"
                                      ? html`checked`
                                      : html``
                                  }
                                  hidden
                                /><span
                                  css="${css`
                                    :not(:checked) + & {
                                      display: none;
                                    }
                                  `}"
                                  >Anonymous to everyone</span
                                >`
                            : html``
                        } <i class="bi bi-chevron-down"></i>
                      </form>
                    </button>
                    <div
                      type="popover"
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityNone"]').click();
                          };
                        `}"
                      >
                        None
                      </button>
                      <button
                        type="button"
                        class="button button--rectangle button--transparent button--dropdown-menu"
                        javascript="${javascript`
                          this.onclick = () => {
                            this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                          };
                        `}"
                      >
                        Anonymous to students
                      </button>
                      $${
                        request.state.course
                          .courseParticipationRoleStudentsAnonymityAllowed ===
                        "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                          ? html`
                              <button
                                type="button"
                                class="button button--rectangle button--transparent button--dropdown-menu"
                                javascript="${javascript`
                                this.onclick = () => {
                                  this.closest('[type~="form"]').querySelector('[name="courseForumConversationMessageAnonymity"][value="courseForumConversationMessageAnonymityEveryone"]').click();
                                };
                              `}"
                              >
                                Anonymous to everyone
                              </button>
                            `
                          : html``
                      }
                    </div>
                  `;
                return courseForumConversationMessageEditOptionsHTML !== html``
                  ? html`
                      <div
                        css="${css`
                          flex: 1;
                          display: flex;
                          align-items: baseline;
                          flex-wrap: wrap;
                          column-gap: var(--size--4);
                          row-gap: var(--size--2);
                        `}"
                      >
                        $${courseForumConversationMessageEditOptionsHTML}
                      </div>
                    `
                  : html``;
              })()}
            </div>
            <div>
              <div>
                <button
                  type="button"
                  class="button button--rectangle button--transparent"
                  javascript="${javascript`
                    this.onclick = () => {
                      this.closest('[key~="courseForumConversationMessage--main--content--body"]').removeAttribute("state");
                      this.closest('[key~="courseForumConversationMessage--main--content--edit"]').firstElementChild.innerHTML = "";
                    };
                  `}"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      `);
    },
  });

  application.webServer?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseForumConversationMessageType:
            | "courseForumConversationMessageTypeMessage"
            | "courseForumConversationMessageTypeAnswer"
            | "courseForumConversationMessageTypeFollowUpQuestion";
          courseForumConversationMessageVisibility:
            | "courseForumConversationMessageVisibilityEveryone"
            | "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseForumConversationMessageAnonymity:
            | "courseForumConversationMessageAnonymityNone"
            | "courseForumConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseForumConversationMessageAnonymityEveryone";
        },
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined ||
        request.state.courseForumConversationMessage === undefined ||
        !(
          request.state.course!.courseState === "courseStateActive" &&
          (request.state.courseParticipation!.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
            request.state.courseParticipation!.id ===
              request.state.courseForumConversationMessage
                .createdByCourseParticipation)
        )
      )
        return;
      const firstcourseForumConversationMessage = application.database.get<{
        id: number;
      }>(
        sql`
          select "id"
          from "courseForumConversationMessages"
          where "courseForumConversation" = ${request.state.courseForumConversation.id}
          order by "id" asc
          limit 1;
        `,
      );
      if (firstcourseForumConversationMessage === undefined) throw new Error();
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !==
            "string" ||
            request.state.courseForumConversation
              .courseForumConversationType !==
              "courseForumConversationTypeQuestion" ||
            request.state.courseForumConversationMessage.id ===
              firstcourseForumConversationMessage.id ||
            (request.body.courseForumConversationMessageType !==
              "courseForumConversationMessageTypeMessage" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeAnswer" &&
              request.body.courseForumConversationMessageType !==
                "courseForumConversationMessageTypeFollowUpQuestion"))) ||
        (request.body.courseForumConversationMessageVisibility !== undefined &&
          (typeof request.body.courseForumConversationMessageVisibility !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor" ||
            request.state.courseForumConversationMessage.id ===
              firstcourseForumConversationMessage.id ||
            (request.body.courseForumConversationMessageVisibility !==
              "courseForumConversationMessageVisibilityEveryone" &&
              request.body.courseForumConversationMessageVisibility !==
                "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (request.body.courseForumConversationMessageAnonymity !== undefined &&
          (typeof request.body.courseForumConversationMessageAnonymity !==
            "string" ||
            request.state.courseParticipation.courseParticipationRole !==
              "courseParticipationRoleStudent" ||
            (request.body.courseForumConversationMessageAnonymity !==
              "courseForumConversationMessageAnonymityNone" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseForumConversationMessageAnonymity !==
                "courseForumConversationMessageAnonymityEveryone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityEveryone" &&
              (request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone" ||
                request.state.course
                  .courseParticipationRoleStudentsAnonymityAllowed ===
                  "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"))))
      )
        throw "validation";
      const contentTextContent =
        await application.partials.courseForumConversationMessageContentProcessor(
          {
            course: request.state.course,
            courseForumConversationMessageContent: request.body.content,
            mode: "textContent",
          },
        );
      const contentSemanticSearch = await (
        await fetch("http://localhost:19000/vector-embedding", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).text();
      const contentSentimentAnalysis = (await (
        await fetch("http://localhost:19000/sentiment-analysis", {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({ text: contentTextContent }),
        })
      ).json()) as {
        label: "positive" | "neutral" | "negative";
        score: number;
      };
      application.database.run(
        sql`
          update "courseForumConversationMessages"
          set
            "updatedAt" = ${Temporal.Now.instant().toString()},
            ${typeof request.body.courseForumConversationMessageType === "string" ? sql`"courseForumConversationMessageType" = ${request.body.courseForumConversationMessageType},` : sql``}
            ${typeof request.body.courseForumConversationMessageVisibility === "string" ? sql`"courseForumConversationMessageVisibility" = ${request.body.courseForumConversationMessageVisibility},` : sql``}
            ${typeof request.body.courseForumConversationMessageAnonymity === "string" ? sql`"courseForumConversationMessageAnonymity" = ${request.body.courseForumConversationMessageAnonymity},` : sql``}
            "content" = ${request.body.content},
            "contentLexicalSearch" = ${utilities
              .tokenize(contentTextContent, {
                stopWords: application.applicationConfiguration.stopWords,
                stem: (token) => natural.PorterStemmer.stem(token),
              })
              .map((tokenWithPosition) => tokenWithPosition.token)
              .join(" ")},
            "contentSemanticSearch" = vec_f32(${contentSemanticSearch}),
            "contentSentimentAnalysisType" = ${contentSentimentAnalysis.label},
            "contentSentimentAnalysisIntensity" = ${contentSentimentAnalysis.score}
          where "id" = ${request.state.courseForumConversationMessage.id};
        `,
      );
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseParticipation.courseParticipationRole !==
          "courseParticipationRoleInstructor" ||
        request.state.courseForumConversation === undefined ||
        request.state.courseForumConversationMessage === undefined ||
        request.state.courseForumConversationMessage.id ===
          (
            application.database.get<{ id: number }>(
              sql`
                select "id"
                from "courseForumConversationMessages"
                where "courseForumConversation" = ${request.state.courseForumConversation.id}
                order by "id" asc
                limit 1;
              `,
            ) ??
            (() => {
              throw new Error();
            })()
          ).id
      )
        return;
      application.database.transaction(() => {
        application.database.run(
          sql`
            delete from "courseForumConversationMessageViews"
            where "courseForumConversationMessage" = ${request.state.courseForumConversationMessage!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationMessageLikes"
            where "courseForumConversationMessage" = ${request.state.courseForumConversationMessage!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationMessages"
            where "id" = ${request.state.courseForumConversationMessage!.id};
          `,
        );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)/view$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseForumConversationMessageViews"
              where
                "courseForumConversationMessage" = ${request.state.courseForumConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseForumConversationMessageViews" (
                "courseForumConversationMessage",
                "courseParticipation",
                "createdAt"
              )
              values (
                ${request.state.courseForumConversationMessage!.id},
                ${request.state.courseParticipation!.id},
                ${Temporal.Now.instant().toString()}
              );
            `,
          );
      });
      response.send();
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined ||
        request.state.courseForumConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseForumConversationMessageLikes"
              where
                "courseForumConversationMessage" = ${request.state.courseForumConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseForumConversationMessageLikes" (
                "courseForumConversationMessage",
                "courseParticipation"
              )
              values (
                ${request.state.courseForumConversationMessage!.id},
                ${request.state.courseParticipation!.id}
              );
            `,
          );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseForumConversationPublicId>[0-9]+)/messages/(?<courseForumConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseForumConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseForumConversation === undefined ||
        request.state.courseForumConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        const courseForumConversationMessageLike = application.database.get<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseForumConversationMessageLikes"
            where
              "courseForumConversationMessage" = ${request.state.courseForumConversationMessage!.id} and
              "courseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (courseForumConversationMessageLike !== undefined)
          application.database.run(
            sql`
              delete from "courseForumConversationMessageLikes" where "id" = ${courseForumConversationMessageLike.id};
            `,
          );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseForumConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });
};
