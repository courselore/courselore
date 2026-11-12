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
      CourseConversationMessage: Application["types"]["states"]["CourseConversation"] & {
        courseConversationMessage: {
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
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/draft$",
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
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !== "string" ||
            request.state.courseConversation.courseForumConversationType !==
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
        const previousCourseConversationMessageDraft =
          application.database.get<{ content: string }>(
            sql`
              select "content"
              from "courseConversationMessageDrafts"
              where
                "courseConversation" = ${request.state.courseConversation!.id} and
                "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
            `,
          );
        sendLiveConnectionUpdates =
          ((previousCourseConversationMessageDraft === undefined ||
            previousCourseConversationMessageDraft.content.trim() === "") &&
            request.body.content!.trim() !== "") ||
          (previousCourseConversationMessageDraft !== undefined &&
            previousCourseConversationMessageDraft.content.trim() !== "" &&
            request.body.content!.trim() === "");
        application.database.run(
          sql`
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        application.database.run(
          sql`
            insert into "courseConversationMessageDrafts" (
              "courseConversation",
              "createdByCourseParticipation",
              "createdAt",
              "courseForumConversationMessageType",
              "courseForumConversationMessageVisibility",
              "courseForumConversationMessageAnonymity",
              "content"
            )
            values (
              ${request.state.courseConversation!.id},
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
              pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
            }),
          });
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages$",
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
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !== "string" ||
            request.state.courseConversation.courseForumConversationType !==
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
        await application.partials.courseConversationMessageContentProcessor({
          course: request.state.course,
          courseConversationMessageContent: request.body.content,
          mode: "textContent",
        });
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
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
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
              update "courseConversations"
              set "courseForumConversationTypeQuestionResolved" = ${Number(true)}
              where "id" = ${request.state.courseConversation!.id};
            `,
            );
          else if (
            request.body.courseForumConversationMessageType ===
            "courseForumConversationMessageTypeFollowUpQuestion"
          )
            application.database.run(
              sql`
              update "courseConversations"
              set "courseForumConversationTypeQuestionResolved" = ${Number(false)}
              where "id" = ${request.state.courseConversation!.id};
            `,
            );
        }
        const courseConversationMessage = application.database.get<{
          id: number;
        }>(
          sql`
            select * from "courseConversationMessages" where "id" = ${
              application.database.run(
                sql`
                  insert into "courseConversationMessages" (
                    "publicId",
                    "courseConversation",
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
                    ${request.state.courseConversation!.id},
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
              "courseConversationMessage",
              "courseParticipation",
              "createdAt"
            )
            values (
              ${courseConversationMessage.id},
              ${request.state.courseParticipation!.id},
              ${Temporal.Now.instant().toString()}
            );
          `,
        );
        application.database.backgroundJob({
          type: "courseConversationMessageEmailNotification",
          startAt: Temporal.Now.instant().add({ minutes: 5 }).toString(),
          parameters: {
            courseConversationMessageId: courseConversationMessage.id,
          },
        });
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  if (application.commandLineArguments.values.type === "backgroundJobWorker")
    application.database.backgroundJobWorker<{
      courseConversationMessageId: number;
      announcement?: boolean;
    }>(
      { type: "courseConversationMessageEmailNotification" },
      async (parameters) => {
        const courseConversationMessage = application.database.get<{
          id: number;
          publicId: string;
          courseConversation: number;
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
              "courseConversation",
              "createdByCourseParticipation",
              "updatedAt",
              "courseForumConversationMessageVisibility",
              "courseForumConversationMessageAnonymity",
              "content"
            from "courseConversationMessages"
            where "id" = ${parameters.courseConversationMessageId};
          `,
        );
        if (courseConversationMessage === undefined) return;
        const courseConversation = application.database.get<{
          id: number;
          publicId: string;
          course: number;
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseConversationParticipations";
          title: string;
        }>(
          sql`
            select
              "id",
              "publicId",
              "course",
              "courseForumConversationVisibility",
              "title"
            from "courseConversations"
            where "id" = ${courseConversationMessage.courseConversation};
          `,
        );
        if (courseConversation === undefined) throw new Error();
        const firstCourseConversationMessage = application.database.get<{
          createdByCourseParticipation: number | null;
        }>(
          sql`
            select "createdByCourseParticipation"
            from "courseConversationMessages"
            where "courseConversation" = ${courseConversation.id}
            order by "id" asc
            limit 1;
          `,
        );
        if (firstCourseConversationMessage === undefined) throw new Error();
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
            where "id" = ${courseConversation.course};
          `,
        );
        if (course === undefined) throw new Error();
        const courseConversationMessageCreatedByCourseParticipation =
          typeof courseConversationMessage.createdByCourseParticipation ===
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
                  where "id" = ${courseConversationMessage.createdByCourseParticipation};
                `,
              )
            : undefined;
        const courseConversationMessageCreatedByUser =
          typeof courseConversationMessageCreatedByCourseParticipation ===
          "object"
            ? application.database.get<{ name: string }>(
                sql`
                  select "name"
                  from "users"
                  where "id" = ${courseConversationMessageCreatedByCourseParticipation.user};
                `,
              )
            : undefined;
        const courseConversationMessageMentions =
          await application.partials.courseConversationMessageContentProcessor({
            course,
            courseConversation,
            courseConversationMessage,
            mode: "mentions",
          });
        const courseConversationMessageEmailNotifications = new Array<any>();
        for (const courseConversationMessageEmailNotificationCourseParticipation of application.database.all<{
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
          const courseConversationMessageEmailNotificationUser =
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
                where "id" = ${courseConversationMessageEmailNotificationCourseParticipation.user};
              `,
            );
          if (courseConversationMessageEmailNotificationUser === undefined)
            throw new Error();
          const courseConversationMessageAnonymous =
            courseConversationMessage.createdByCourseParticipation !==
              courseConversationMessageEmailNotificationCourseParticipation.id &&
            ((courseConversationMessage.courseForumConversationMessageAnonymity ===
              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" &&
              courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                "courseParticipationRoleStudent") ||
              courseConversationMessage.courseForumConversationMessageAnonymity ===
                "courseForumConversationMessageAnonymityEveryone");
          if (
            courseConversationMessage.createdByCourseParticipation !==
              courseConversationMessageEmailNotificationCourseParticipation.id &&
            (courseConversation.courseForumConversationVisibility ===
              "courseForumConversationVisibilityEveryone" ||
              (courseConversation.courseForumConversationVisibility ===
                "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations" &&
                courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor") ||
              application.database.get(
                sql`
                  select true
                  from "courseConversationParticipations"
                  where
                    "courseConversation" = ${courseConversation.id} and
                    "courseParticipation" = ${courseConversationMessageEmailNotificationCourseParticipation.id};
                `,
              ) !== undefined) &&
            (courseConversationMessage.courseForumConversationMessageVisibility ===
              "courseForumConversationMessageVisibilityEveryone" ||
              (courseConversationMessage.courseForumConversationMessageVisibility ===
                "courseForumConversationMessageVisibilityCourseParticipationRoleInstructors" &&
                courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor")) &&
            (parameters.announcement === true ||
              Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForAllMessages,
              ) ||
              (Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesIncludingAMention,
              ) &&
                (courseConversationMessageMentions.has("everyone") ||
                  (courseConversationMessageMentions.has("instructors") &&
                    courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                      "courseParticipationRoleInstructor") ||
                  (courseConversationMessageMentions.has("students") &&
                    courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                      "courseParticipationRoleStudent") ||
                  courseConversationMessageMentions.has(
                    courseConversationMessageEmailNotificationCourseParticipation.publicId,
                  ))) ||
              (Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesInConversationsInWhichYouParticipated,
              ) &&
                application.database.get(
                  sql`
                    select true
                    from "courseConversationMessages"
                    where
                      "courseConversation" = ${courseConversation.id} and
                      "createdByCourseParticipation" = ${courseConversationMessageEmailNotificationCourseParticipation.id}
                    limit 1;
                  `,
                ) !== undefined) ||
              (Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForCourseForumForMessagesInConversationsThatYouStarted,
              ) &&
                firstCourseConversationMessage.createdByCourseParticipation ===
                  courseConversationMessageEmailNotificationCourseParticipation.id)) &&
            application.database.get(
              sql`
                select true
                from "courseForumConversationMessageViews"
                where
                  "courseConversationMessage" = ${courseConversationMessage.id} and
                  "courseParticipation" = ${courseConversationMessageEmailNotificationCourseParticipation.id};
              `,
            ) === undefined
          ) {
            const courseConversationMessageEmailNotificationReplyToken =
              cryptoRandomString({
                length: 40,
                characters: "abcdefghijklmnopqrstuvwxyz0123456789",
              });
            application.database.run(
              sql`
                insert into "courseForumConversationMessageEmailNotificationReplyTokens" (
                  "tokenTokenHash",
                  "courseConversation",
                  "courseParticipation"
                ) values (
                  ${cryptography.TokenHash.hash(courseConversationMessageEmailNotificationReplyToken)},
                  ${courseConversation.id},
                  ${courseConversationMessageEmailNotificationCourseParticipation.id}
                );
              `,
            );
            courseConversationMessageEmailNotifications.push({
              from: {
                name: `${
                  courseConversationMessageAnonymous
                    ? "Anonymous"
                    : (courseConversationMessageCreatedByUser?.name ??
                      "Deleted course participant")
                } · ${course.name}`,
                address: application.userConfiguration.email.send.from,
              },
              to: courseConversationMessageEmailNotificationUser.email,
              replyTo: `${courseConversationMessageEmailNotificationReplyToken}@${application.userConfiguration.email.receive.hostname}`,
              inReplyTo: `courses/${course.publicId}/forum/${courseConversation.publicId}@${application.userConfiguration.hostname}`,
              references: `courses/${course.publicId}/forum/${courseConversation.publicId}@${application.userConfiguration.hostname}`,
              subject: courseConversation.title,
              html: html`
                $${await application.partials.courseConversationMessageContentProcessor(
                  {
                    course,
                    courseParticipation:
                      courseConversationMessageEmailNotificationCourseParticipation,
                    courseConversation,
                    courseConversationMessage,
                    mode: "emailNotification",
                  },
                )}
                <hr />
                <p>
                  <small>
                    <a
                      href="https://${
                        application.userConfiguration.hostname
                      }/courses/${course.publicId}/forum/${courseConversation.publicId}?${new URLSearchParams(
                        {
                          message: courseConversationMessage.publicId,
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
          for (const courseConversationMessageEmailNotification of courseConversationMessageEmailNotifications)
            application.database.backgroundJob({
              type: "email",
              parameters: courseConversationMessageEmailNotification,
            });
        });
      },
    );

  application.webServer?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)(?:$|/)",
    ),
    handler: (
      request: serverTypes.Request<
        { courseConversationMessagePublicId: string },
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        typeof request.pathname.courseConversationMessagePublicId !==
          "string" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      request.state.courseConversationMessage = application.database.get<{
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
            from "courseConversationMessages"
            where
              "courseConversation" = ${request.state.courseConversation.id} and
              "publicId" = ${request.pathname.courseConversationMessagePublicId} and (
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
      if (request.state.courseConversationMessage === undefined) return;
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/edit$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined ||
        !(
          request.state.course!.courseState === "courseStateActive" &&
          (request.state.courseParticipation!.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
            request.state.courseParticipation!.id ===
              request.state.courseConversationMessage
                .createdByCourseParticipation)
        )
      )
        return;
      response.send(html`
        <div
          type="form"
          method="PATCH"
          action="/courses/${request.state.course.publicId}/forum/${
            request.state.courseConversation.publicId
          }/messages/${request.state.courseConversationMessage.publicId}"
          css="${css`
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
          javascript="${javascript`
            this.onsubmit = () => {
              this.closest('[key~="courseConversationMessage--main--content--body"]').removeAttribute("state");
              this.closest('[key~="courseConversationMessage--main--content--edit"]').firstElementChild.innerHTML = "";
            };
          `}"
        >
          $${application.partials.courseConversationMessageContentEditor({
            course: request.state.course,
            courseParticipation: request.state.courseParticipation,
            courseConversation: request.state.courseConversation,
            courseConversationMessage: request.state.courseConversationMessage,
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
                let courseConversationMessageEditOptionsHTML = html``;
                const firstCourseConversationMessage =
                  application.database.get<{
                    id: number;
                  }>(
                    sql`
                      select "id"
                      from "courseConversationMessages"
                      where "courseConversation" = ${request.state.courseConversation.id}
                      order by "id" asc
                      limit 1;
                    `,
                  );
                if (firstCourseConversationMessage === undefined)
                  throw new Error();
                if (
                  request.state.courseConversation.courseForumConversationType ===
                    "courseForumConversationTypeQuestion" &&
                  request.state.courseConversationMessage.id !==
                    firstCourseConversationMessage.id
                )
                  courseConversationMessageEditOptionsHTML += html`
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
                            request.state.courseConversationMessage
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
                            request.state.courseConversationMessage
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
                            request.state.courseConversationMessage
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
                  request.state.courseConversationMessage.id !==
                    firstCourseConversationMessage.id
                )
                  courseConversationMessageEditOptionsHTML += html`
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
                            request.state.courseConversationMessage
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
                            request.state.courseConversationMessage
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
                  courseConversationMessageEditOptionsHTML += html`
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
                            request.state.courseConversationMessage
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
                            request.state.courseConversationMessage
                              .courseForumConversationMessageAnonymity ===
                              "courseForumConversationMessageAnonymityCourseParticipationRoleStudents" ||
                            (request.state.course
                              .courseParticipationRoleStudentsAnonymityAllowed ===
                              "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" &&
                              request.state.courseConversationMessage
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
                                    request.state.courseConversationMessage
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
                return courseConversationMessageEditOptionsHTML !== html``
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
                        $${courseConversationMessageEditOptionsHTML}
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
                      this.closest('[key~="courseConversationMessage--main--content--body"]').removeAttribute("state");
                      this.closest('[key~="courseConversationMessage--main--content--edit"]').firstElementChild.innerHTML = "";
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
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)$",
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
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined ||
        !(
          request.state.course!.courseState === "courseStateActive" &&
          (request.state.courseParticipation!.courseParticipationRole ===
            "courseParticipationRoleInstructor" ||
            request.state.courseParticipation!.id ===
              request.state.courseConversationMessage
                .createdByCourseParticipation)
        )
      )
        return;
      const firstCourseConversationMessage = application.database.get<{
        id: number;
      }>(
        sql`
          select "id"
          from "courseConversationMessages"
          where "courseConversation" = ${request.state.courseConversation.id}
          order by "id" asc
          limit 1;
        `,
      );
      if (firstCourseConversationMessage === undefined) throw new Error();
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === "" ||
        (request.body.courseForumConversationMessageType !== undefined &&
          (typeof request.body.courseForumConversationMessageType !== "string" ||
            request.state.courseConversation.courseForumConversationType !==
              "courseForumConversationTypeQuestion" ||
            request.state.courseConversationMessage.id ===
              firstCourseConversationMessage.id ||
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
            request.state.courseConversationMessage.id ===
              firstCourseConversationMessage.id ||
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
        await application.partials.courseConversationMessageContentProcessor({
          course: request.state.course,
          courseConversationMessageContent: request.body.content,
          mode: "textContent",
        });
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
          update "courseConversationMessages"
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
          where "id" = ${request.state.courseConversationMessage.id};
        `,
      );
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseParticipation.courseParticipationRole !==
          "courseParticipationRoleInstructor" ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined ||
        request.state.courseConversationMessage.id ===
          (
            application.database.get<{ id: number }>(
              sql`
                select "id"
                from "courseConversationMessages"
                where "courseConversation" = ${request.state.courseConversation.id}
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
            where "courseConversationMessage" = ${request.state.courseConversationMessage!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseForumConversationMessageLikes"
            where "courseConversationMessage" = ${request.state.courseConversationMessage!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseConversationMessages"
            where "id" = ${request.state.courseConversationMessage!.id};
          `,
        );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/view$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.courseParticipation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseForumConversationMessageViews"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseForumConversationMessageViews" (
                "courseConversationMessage",
                "courseParticipation",
                "createdAt"
              )
              values (
                ${request.state.courseConversationMessage!.id},
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
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseForumConversationMessageLikes"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseForumConversationMessageLikes" (
                "courseConversationMessage",
                "courseParticipation"
              )
              values (
                ${request.state.courseConversationMessage!.id},
                ${request.state.courseParticipation!.id}
              );
            `,
          );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.webServer?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/forum/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
    ),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined ||
        request.state.courseConversationMessage === undefined
      )
        return;
      application.database.transaction(() => {
        const courseConversationMessageLike = application.database.get<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseForumConversationMessageLikes"
            where
              "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
              "courseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (courseConversationMessageLike !== undefined)
          application.database.run(
            sql`
              delete from "courseForumConversationMessageLikes" where "id" = ${courseConversationMessageLike.id};
            `,
          );
      });
      response.redirect!(
        `/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.applicationConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/forum/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });
};
