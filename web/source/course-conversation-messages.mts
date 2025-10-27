import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversationMessages = {
  types: {
    states: {
      CourseConversationMessage: Application["types"]["states"]["CourseConversation"] & {
        courseConversationMessage: {
          id: number;
          publicId: string;
          createdAt: string;
          updatedAt: string | null;
          createdByCourseParticipation: number | null;
          courseConversationMessageType:
            | "courseConversationMessageTypeMessage"
            | "courseConversationMessageTypeAnswer"
            | "courseConversationMessageTypeFollowUpQuestion";
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityEveryone";
          content: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/draft$",
    ),
    // TODO: Remove `async`
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        { content: string },
        Application["types"]["states"]["CourseConversation"]
      >,
      response,
    ) => {
      // TODO
      await utilities.sleep(3000);
      if (
        request.state.course === undefined ||
        request.state.course.courseState !== "courseStateActive" ||
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      if (typeof request.body.content !== "string") throw "validation";
      let sendLiveConnectionUpdates = false;
      application.database.executeTransaction(() => {
        const existingCourseConversationMessageDraft = application.database.get(
          sql`
            select true
            from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        sendLiveConnectionUpdates =
          (existingCourseConversationMessageDraft === undefined &&
            request.body.content!.trim() !== "") ||
          (existingCourseConversationMessageDraft !== undefined &&
            request.body.content!.trim() === "");
        application.database.run(
          sql`
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (request.body.content!.trim() !== "")
          application.database.run(
            sql`
              insert into "courseConversationMessageDrafts" (
                "courseConversation",
                "createdByCourseParticipation",
                "createdAt",
                "content"
              )
              values (
                ${request.state.courseConversation!.id},
                ${request.state.courseParticipation!.id},
                ${new Date().toISOString()},
                ${request.body.content}
              );
            `,
          );
      });
      response.end();
      if (sendLiveConnectionUpdates)
        for (const port of application.privateConfiguration.ports)
          fetch(`http://localhost:${port}/__live-connections`, {
            method: "POST",
            headers: { "CSRF-Protection": "true" },
            body: new URLSearchParams({
              pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
            }),
          });
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseConversationMessageType:
            | "courseConversationMessageTypeMessage"
            | "courseConversationMessageTypeAnswer"
            | "courseConversationMessageTypeFollowUpQuestion";
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityEveryone";
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
        (typeof request.body.courseConversationMessageType === "string" &&
          (request.state.courseConversation.courseConversationType !==
            "courseConversationTypeQuestion" ||
            (request.body.courseConversationMessageType !==
              "courseConversationMessageTypeMessage" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeAnswer" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeFollowUpQuestion"))) ||
        (typeof request.body.courseConversationMessageVisibility === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor" ||
            (request.body.courseConversationMessageVisibility !==
              "courseConversationMessageVisibilityEveryone" &&
              request.body.courseConversationMessageVisibility !==
                "courseConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (typeof request.body.courseConversationMessageAnonymity === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleStudent" ||
            (request.body.courseConversationMessageAnonymity !==
              "courseConversationMessageAnonymityNone" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityEveryone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityEveryone" &&
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
      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            delete from "courseConversationMessageDrafts"
            where
              "courseConversation" = ${request.state.courseConversation!.id} and
              "createdByCourseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (
          request.body.courseConversationMessageType ===
          "courseConversationMessageTypeAnswer"
        )
          application.database.run(
            sql`
              update "courseConversations"
              set "questionResolved" = ${Number(true)}
              where "id" = ${request.state.courseConversation!.id};
            `,
          );
        else if (
          request.body.courseConversationMessageType ===
          "courseConversationMessageTypeFollowUpQuestion"
        )
          application.database.run(
            sql`
              update "courseConversations"
              set "questionResolved" = ${Number(false)}
              where "id" = ${request.state.courseConversation!.id};
            `,
          );
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
                    "createdAt",
                    "updatedAt",
                    "createdByCourseParticipation",
                    "courseConversationMessageType",
                    "courseConversationMessageVisibility",
                    "courseConversationMessageAnonymity",
                    "content",
                    "contentSearch"
                  )
                  values (
                    ${cryptoRandomString({ length: 20, type: "numeric" })},
                    ${request.state.courseConversation!.id},
                    ${new Date().toISOString()},
                    ${null},
                    ${request.state.courseParticipation!.id},
                    ${request.body.courseConversationMessageType ?? "courseConversationMessageTypeMessage"},
                    ${request.body.courseConversationMessageVisibility ?? "courseConversationMessageVisibilityEveryone"},
                    ${request.body.courseConversationMessageAnonymity ?? "courseConversationMessageAnonymityNone"},
                    ${request.body.content},
                    ${utilities
                      .tokenize(contentTextContent, {
                        stopWords: application.privateConfiguration.stopWords,
                        stem: (token) => natural.PorterStemmer.stem(token),
                      })
                      .map((tokenWithPosition) => tokenWithPosition.token)
                      .join(" ")}
                  );
                `,
              ).lastInsertRowid
            };
          `,
        )!;
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
        application.database.run(
          sql`
            insert into "_backgroundJobs" (
              "type",
              "startAt",
              "parameters"
            )
            values (
              'courseConversationMessageEmailNotification',
              ${new Date(Date.now() /* TODO: + 5 * 60 * 1000 */).toISOString()},
              ${JSON.stringify({ courseConversationMessageId: courseConversationMessage.id })}
            );
          `,
        );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  if (application.commandLineArguments.values.type === "backgroundJob")
    application.database.backgroundJob<{
      courseConversationMessageId: number;
      announcement?: boolean;
    }>(
      { type: "courseConversationMessageEmailNotification" },
      async (parameters) => {
        const courseConversationMessage = application.database.get<{
          id: number;
          publicId: string;
          courseConversation: number;
          updatedAt: string | null;
          createdByCourseParticipation: number | null;
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityEveryone";
          content: string;
        }>(
          sql`
            select
              "id",
              "publicId",
              "courseConversation",
              "updatedAt",
              "createdByCourseParticipation",
              "courseConversationMessageVisibility",
              "courseConversationMessageAnonymity",
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
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationParticipations";
          title: string;
        }>(
          sql`
            select
              "id",
              "publicId",
              "course",
              "courseConversationVisibility",
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
              emailNotificationsForAllMessages: number;
              emailNotificationsForMessagesIncludingAMention: number;
              emailNotificationsForMessagesInConversationsInWhichYouParticipated: number;
              emailNotificationsForMessagesInConversationsThatYouStarted: number;
            }>(
              sql`
                select
                  "email",
                  "emailNotificationsForAllMessages",
                  "emailNotificationsForMessagesIncludingAMention",
                  "emailNotificationsForMessagesInConversationsInWhichYouParticipated",
                  "emailNotificationsForMessagesInConversationsThatYouStarted"
                from "users"
                where "id" = ${courseConversationMessageEmailNotificationCourseParticipation.user};
              `,
            );
          if (courseConversationMessageEmailNotificationUser === undefined)
            throw new Error();
          const courseConversationMessageAnonymous =
            courseConversationMessage.createdByCourseParticipation !==
              courseConversationMessageEmailNotificationCourseParticipation.id &&
            ((courseConversationMessage.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                "courseParticipationRoleStudent") ||
              courseConversationMessage.courseConversationMessageAnonymity ===
                "courseConversationMessageAnonymityEveryone");
          if (
            courseConversationMessage.createdByCourseParticipation !==
              courseConversationMessageEmailNotificationCourseParticipation.id &&
            (courseConversation.courseConversationVisibility ===
              "courseConversationVisibilityEveryone" ||
              (courseConversation.courseConversationVisibility ===
                "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations" &&
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
            (courseConversationMessage.courseConversationMessageVisibility ===
              "courseConversationMessageVisibilityEveryone" ||
              (courseConversationMessage.courseConversationMessageVisibility ===
                "courseConversationMessageVisibilityCourseParticipationRoleInstructors" &&
                courseConversationMessageEmailNotificationCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor")) &&
            (parameters.announcement === true ||
              Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForAllMessages,
              ) ||
              (Boolean(
                courseConversationMessageEmailNotificationUser.emailNotificationsForMessagesIncludingAMention,
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
                courseConversationMessageEmailNotificationUser.emailNotificationsForMessagesInConversationsInWhichYouParticipated,
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
                courseConversationMessageEmailNotificationUser.emailNotificationsForMessagesInConversationsThatYouStarted,
              ) &&
                firstCourseConversationMessage.createdByCourseParticipation ===
                  courseConversationMessageEmailNotificationCourseParticipation.id)) &&
            application.database.get(
              sql`
                select true
                from "courseConversationMessageViews"
                where
                  "courseConversationMessage" = ${courseConversationMessage.id} and
                  "courseParticipation" = ${courseConversationMessageEmailNotificationCourseParticipation.id};
              `,
            ) === undefined
          )
            courseConversationMessageEmailNotifications.push({
              from: {
                name: `${course.name} · Courselore`,
                address: application.configuration.email.from,
              },
              to: courseConversationMessageEmailNotificationUser.email,
              subject: courseConversation.title,
              inReplyTo: `courses/${course.publicId}/conversations/${courseConversation.publicId}@${application.configuration.hostname}`,
              references: `courses/${course.publicId}/conversations/${courseConversation.publicId}@${application.configuration.hostname}`,
              html: html`
                <p>
                  <small>
                    <a
                      href="https://${application.configuration
                        .hostname}/courses/${course.publicId}/conversations/${courseConversation.publicId}?${new URLSearchParams(
                        {
                          message: courseConversationMessage.publicId,
                        },
                      ).toString()}"
                      >See message in Courselore</a
                    > ·
                    <a
                      href="https://${application.configuration
                        .hostname}/settings"
                      >Change email notification preferences</a
                    >
                  </small>
                </p>
                <p>
                  <strong>
                    ${courseConversationMessageAnonymous
                      ? "Anonymous"
                      : (courseConversationMessageCreatedByUser?.name ??
                        "Deleted course participant")}
                  </strong>
                  ${!courseConversationMessageAnonymous
                    ? `
                        ${
                          courseConversationMessageCreatedByCourseParticipation?.courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                            ? "(instructor)"
                            : ""
                        }
                        ${
                          courseConversationMessage.courseConversationMessageAnonymity ===
                          "courseConversationMessageAnonymityCourseParticipationRoleStudents"
                            ? "(anonymous to students)"
                            : courseConversationMessage.courseConversationMessageAnonymity ===
                                "courseConversationMessageAnonymityEveryone"
                              ? "(anonymous to everyone)"
                              : ""
                        }
                      `
                    : ``}
                  ${courseConversationMessage.courseConversationMessageVisibility ===
                  "courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                    ? "(visible by instructors only)"
                    : ""}
                </p>
                <hr />
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
              `,
            });
        }
        application.database.executeTransaction(() => {
          for (const courseConversationMessageEmailNotification of courseConversationMessageEmailNotifications)
            application.database.run(
              sql`
              insert into "_backgroundJobs" (
                "type",
                "startAt",
                "parameters"
              )
              values (
                'email',
                ${new Date().toISOString()},
                ${JSON.stringify(courseConversationMessageEmailNotification)}
              );
            `,
            );
        });
      },
    );

  application.server?.push({
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)(?:$|/)",
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
        request.state.courseParticipation === undefined ||
        request.state.courseConversation === undefined
      )
        return;
      request.state.courseConversationMessage = application.database.get<{
        id: number;
        publicId: string;
        createdAt: string;
        updatedAt: string | null;
        createdByCourseParticipation: number | null;
        courseConversationMessageType:
          | "courseConversationMessageTypeMessage"
          | "courseConversationMessageTypeAnswer"
          | "courseConversationMessageTypeFollowUpQuestion";
        courseConversationMessageVisibility:
          | "courseConversationMessageVisibilityEveryone"
          | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
        courseConversationMessageAnonymity:
          | "courseConversationMessageAnonymityNone"
          | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
          | "courseConversationMessageAnonymityEveryone";
        content: string;
      }>(
        sql`
            select 
              "id",
              "publicId",
              "createdAt",
              "updatedAt",
              "createdByCourseParticipation",
              "courseConversationMessageType",
              "courseConversationMessageVisibility",
              "courseConversationMessageAnonymity",
              "content"
            from "courseConversationMessages"
            where
              "courseConversation" = ${request.state.courseConversation.id} and
              "publicId" = ${request.pathname.courseConversationMessagePublicId} and (
                "courseConversationMessageVisibility" = 'courseConversationMessageVisibilityEveryone'
                $${
                  request.state.courseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? sql`
                        or
                        "courseConversationMessageVisibility" = 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                      `
                    : sql``
                }
              );
          `,
      );
      if (request.state.courseConversationMessage === undefined) return;
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/edit$",
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
      response.end(html`
        <div
          type="form"
          method="PATCH"
          action="/courses/${request.state.course
            .publicId}/conversations/${request.state.courseConversation
            .publicId}/messages/${request.state.courseConversationMessage
            .publicId}"
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
                  Edit
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
                  request.state.courseConversation.courseConversationType ===
                    "courseConversationTypeQuestion" &&
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
                          name="courseConversationMessageType"
                          value="courseConversationMessageTypeMessage"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageType ===
                          "courseConversationMessageTypeMessage"
                            ? html`checked`
                            : html``}
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
                          name="courseConversationMessageType"
                          value="courseConversationMessageTypeAnswer"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageType ===
                          "courseConversationMessageTypeAnswer"
                            ? html`checked`
                            : html``}
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
                          name="courseConversationMessageType"
                          value="courseConversationMessageTypeFollowUpQuestion"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageType ===
                          "courseConversationMessageTypeFollowUpQuestion"
                            ? html`checked`
                            : html``}
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeMessage"]').click();
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeAnswer"]').click();
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageType"][value="courseConversationMessageTypeFollowUpQuestion"]').click();
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
                          name="courseConversationMessageVisibility"
                          value="courseConversationMessageVisibilityEveryone"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageVisibility ===
                          "courseConversationMessageVisibilityEveryone"
                            ? html`checked`
                            : html``}
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
                          name="courseConversationMessageVisibility"
                          value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageVisibility ===
                          "courseConversationMessageVisibilityCourseParticipationRoleInstructors"
                            ? html`checked`
                            : html``}
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityEveryone"]').click();
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageVisibility"][value="courseConversationMessageVisibilityCourseParticipationRoleInstructors"]').click();
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
                          name="courseConversationMessageAnonymity"
                          value="courseConversationMessageAnonymityNone"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageAnonymity ===
                          "courseConversationMessageAnonymityNone"
                            ? html`checked`
                            : html``}
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
                          name="courseConversationMessageAnonymity"
                          value="courseConversationMessageAnonymityCourseParticipationRoleStudents"
                          required
                          $${request.state.courseConversationMessage
                            .courseConversationMessageAnonymity ===
                            "courseConversationMessageAnonymityCourseParticipationRoleStudents" ||
                          (request.state.course
                            .courseParticipationRoleStudentsAnonymityAllowed ===
                            "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents" &&
                            request.state.courseConversationMessage
                              .courseConversationMessageAnonymity ===
                              "courseConversationMessageAnonymityEveryone")
                            ? html`checked`
                            : html``}
                          hidden
                        /><span
                          css="${css`
                            :not(:checked) + & {
                              display: none;
                            }
                          `}"
                          >Anonymous to students</span
                        >$${request.state.course
                          .courseParticipationRoleStudentsAnonymityAllowed ===
                        "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                          ? html`<input
                                type="radio"
                                name="courseConversationMessageAnonymity"
                                value="courseConversationMessageAnonymityEveryone"
                                required
                                $${request.state.courseConversationMessage
                                  .courseConversationMessageAnonymity ===
                                "courseConversationMessageAnonymityEveryone"
                                  ? html`checked`
                                  : html``}
                                hidden
                              /><span
                                css="${css`
                                  :not(:checked) + & {
                                    display: none;
                                  }
                                `}"
                                >Anonymous to everyone</span
                              >`
                          : html``} <i class="bi bi-chevron-down"></i>
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityNone"]').click();
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
                            this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityCourseParticipationRoleStudents"]').click();
                          };
                        `}"
                      >
                        Anonymous to students
                      </button>
                      $${request.state.course
                        .courseParticipationRoleStudentsAnonymityAllowed ===
                      "courseParticipationRoleStudentsAnonymityAllowedEveryone"
                        ? html`
                            <button
                              type="button"
                              class="button button--rectangle button--transparent button--dropdown-menu"
                              javascript="${javascript`
                                this.onclick = () => {
                                  this.closest('[type~="form"]').querySelector('[name="courseConversationMessageAnonymity"][value="courseConversationMessageAnonymityEveryone"]').click();
                                };
                              `}"
                            >
                              Anonymous to everyone
                            </button>
                          `
                        : html``}
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

  application.server?.push({
    method: "PATCH",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {
          content: string;
          courseConversationMessageType:
            | "courseConversationMessageTypeMessage"
            | "courseConversationMessageTypeAnswer"
            | "courseConversationMessageTypeFollowUpQuestion";
          courseConversationMessageVisibility:
            | "courseConversationMessageVisibilityEveryone"
            | "courseConversationMessageVisibilityCourseParticipationRoleInstructors";
          courseConversationMessageAnonymity:
            | "courseConversationMessageAnonymityNone"
            | "courseConversationMessageAnonymityCourseParticipationRoleStudents"
            | "courseConversationMessageAnonymityEveryone";
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
        (typeof request.body.courseConversationMessageType === "string" &&
          (request.state.courseConversation.courseConversationType !==
            "courseConversationTypeQuestion" ||
            request.state.courseConversationMessage.id ===
              firstCourseConversationMessage.id ||
            (request.body.courseConversationMessageType !==
              "courseConversationMessageTypeMessage" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeAnswer" &&
              request.body.courseConversationMessageType !==
                "courseConversationMessageTypeFollowUpQuestion"))) ||
        (typeof request.body.courseConversationMessageVisibility === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleInstructor" ||
            request.state.courseConversationMessage.id ===
              firstCourseConversationMessage.id ||
            (request.body.courseConversationMessageVisibility !==
              "courseConversationMessageVisibilityEveryone" &&
              request.body.courseConversationMessageVisibility !==
                "courseConversationMessageVisibilityCourseParticipationRoleInstructors"))) ||
        (typeof request.body.courseConversationMessageAnonymity === "string" &&
          (request.state.courseParticipation.courseParticipationRole !==
            "courseParticipationRoleStudent" ||
            (request.body.courseConversationMessageAnonymity !==
              "courseConversationMessageAnonymityNone" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.body.courseConversationMessageAnonymity !==
                "courseConversationMessageAnonymityEveryone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityCourseParticipationRoleStudents" &&
              request.state.course
                .courseParticipationRoleStudentsAnonymityAllowed ===
                "courseParticipationRoleStudentsAnonymityAllowedNone") ||
            (request.body.courseConversationMessageAnonymity ===
              "courseConversationMessageAnonymityEveryone" &&
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
      application.database.run(
        sql`
          update "courseConversationMessages"
          set
            "updatedAt" = ${new Date().toISOString()},
            $${typeof request.body.courseConversationMessageType === "string" ? sql`"courseConversationMessageType" = ${request.body.courseConversationMessageType},` : sql``}
            $${typeof request.body.courseConversationMessageVisibility === "string" ? sql`"courseConversationMessageVisibility" = ${request.body.courseConversationMessageVisibility},` : sql``}
            $${typeof request.body.courseConversationMessageAnonymity === "string" ? sql`"courseConversationMessageAnonymity" = ${request.body.courseConversationMessageAnonymity},` : sql``}
            "content" = ${request.body.content},
            "contentSearch" = ${utilities
              .tokenize(contentTextContent, {
                stopWords: application.privateConfiguration.stopWords,
                stem: (token) => natural.PorterStemmer.stem(token),
              })
              .map((tokenWithPosition) => tokenWithPosition.token)
              .join(" ")}
          where "id" = ${request.state.courseConversationMessage.id};
        `,
      );
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.server?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)$",
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
      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            delete from "courseConversationMessageViews"
            where "courseConversationMessage" = ${request.state.courseConversationMessage!.id};
          `,
        );
        application.database.run(
          sql`
            delete from "courseConversationMessageLikes"
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
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/view$",
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
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseConversationMessageViews"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
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
                ${request.state.courseConversationMessage!.id},
                ${request.state.courseParticipation!.id},
                ${new Date().toISOString()}
              );
            `,
          );
      });
      response.end();
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
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
      application.database.executeTransaction(() => {
        if (
          application.database.get(
            sql`
              select true
              from "courseConversationMessageLikes"
              where
                "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
                "courseParticipation" = ${request.state.courseParticipation!.id};
            `,
          ) === undefined
        )
          application.database.run(
            sql`
              insert into "courseConversationMessageLikes" (
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
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });

  application.server?.push({
    method: "DELETE",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/conversations/(?<courseConversationPublicId>[0-9]+)/messages/(?<courseConversationMessagePublicId>[0-9]+)/like$",
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
      application.database.executeTransaction(() => {
        const courseConversationMessageLike = application.database.get<{
          id: number;
        }>(
          sql`
            select "id"
            from "courseConversationMessageLikes"
            where
              "courseConversationMessage" = ${request.state.courseConversationMessage!.id} and
              "courseParticipation" = ${request.state.courseParticipation!.id};
          `,
        );
        if (courseConversationMessageLike !== undefined)
          application.database.run(
            sql`
              delete from "courseConversationMessageLikes" where "id" = ${courseConversationMessageLike.id};
            `,
          );
      });
      response.redirect(
        `/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}`,
      );
      for (const port of application.privateConfiguration.ports)
        fetch(`http://localhost:${port}/__live-connections`, {
          method: "POST",
          headers: { "CSRF-Protection": "true" },
          body: new URLSearchParams({
            pathname: `^/courses/${request.state.course.publicId}/conversations/${request.state.courseConversation.publicId}(?:$|/)`,
          }),
        });
    },
  });
};
