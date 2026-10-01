import util from "node:util";
import fs from "node:fs/promises";
import fsCallback from "node:fs";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import * as utilities from "@radically-straightforward/utilities";
import * as cryptography from "@radically-straightforward/cryptography";
import * as node from "@radically-straightforward/node";
import { unified } from "unified";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkStringify from "remark-stringify";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import smtpServer from "smtp-server";
import * as mailParser from "mailparser";
import nodemailer from "nodemailer";
import { Application } from "./application.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "emailServer") {
    type SMTPServerSessionState = {
      states: {
        courseConversationMessageEmailNotificationReplyToken: {
          id: number;
          courseConversation: number;
          courseParticipation: number;
        };
        course: {
          id: number;
          publicId: string;
          name: string;
          information: string | null;
          invitationLinkCourseParticipationRoleInstructorsEnabled: number;
          invitationLinkCourseParticipationRoleInstructorsTokenEncrypted: string;
          invitationLinkCourseParticipationRoleStudentsEnabled: number;
          invitationLinkCourseParticipationRoleStudentsTokenEncrypted: string;
          courseConversationRequiresTagging: number;
          courseParticipationRoleStudentsAnonymityAllowed:
            | "courseParticipationRoleStudentsAnonymityAllowedNone"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
            | "courseParticipationRoleStudentsAnonymityAllowedEveryone";
          courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent: number;
          courseState: "courseStateActive" | "courseStateArchived";
          courseConversationsNextPublicId: number;
          ltiPlatformId: string | null;
          ltiClientId: string | null;
          ltiContextId: string | null;
          ltiNamesAndRoleProvisioningServicesURL: string | null;
        };
        courseParticipation: {
          id: number;
          publicId: string;
          course: number;
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
            | "violet"
            | "purple"
            | "fuchsia"
            | "pink"
            | "rose";
          mostRecentlyVisitedCourseConversation: number | null;
        };
        courseConversation: {
          id: number;
          publicId: string;
          courseConversationType:
            "courseConversationTypeNote" | "courseConversationTypeQuestion";
          questionResolved: number;
          courseConversationVisibility:
            | "courseConversationVisibilityEveryone"
            | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
            | "courseConversationVisibilityCourseConversationParticipations";
          pinned: number;
          title: string;
        };
        courseConversationMessage: {
          id: number;
        };
      }[];
    };
    application.emailServer = new smtpServer.SMTPServer({
      name: application.userConfiguration.hostname,
      size: 20 * 2 ** 20,
      disabledCommands: ["AUTH"],
      key: await fs.readFile(
        application.userConfiguration.email.receive.key,
        "utf-8",
      ),
      cert: await fs.readFile(
        application.userConfiguration.email.receive.certificate,
        "utf-8",
      ),
      onMailFrom: util.callbackify(
        async (
          address: smtpServer.SMTPServerAddress,
          session: smtpServer.SMTPServerSession & SMTPServerSessionState,
        ) => {
          session.states = [];
        },
      ),
      onRcptTo: util.callbackify(
        async (
          address: smtpServer.SMTPServerAddress,
          session: smtpServer.SMTPServerSession & SMTPServerSessionState,
        ) => {
          if (
            address.address.match(utilities.emailRegExp) === null &&
            !(
              application.userConfiguration.environment === "development" &&
              address.address.match(/^[a-z0-9._%+-=]+@localhost$/i) !== null
            )
          )
            throw new Error();
          const [
            courseConversationMessageEmailNotificationReplyTokenToken,
            hostname,
          ] = address.address.split("@");
          if (hostname !== application.userConfiguration.email.receive.hostname)
            throw new Error();
          const courseConversationMessageEmailNotificationReplyToken =
            application.database.get<{
              id: number;
              courseConversation: number;
              courseParticipation: number;
            }>(
              sql`
                select 
                  "id",
                  "courseConversation",
                  "courseParticipation"
                from "courseConversationMessageEmailNotificationReplyTokens"
                where "tokenTokenHash" = ${cryptography.TokenHash.hash(
                  courseConversationMessageEmailNotificationReplyTokenToken,
                )};
              `,
            ) ??
            (() => {
              throw new Error();
            })();
          const courseParticipation =
            application.database.get<{
              id: number;
              publicId: string;
              course: number;
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
                  "course",
                  "courseParticipationRole",
                  "decorationColor",
                  "mostRecentlyVisitedCourseConversation"
                from "courseParticipations"
                where "id" = ${courseConversationMessageEmailNotificationReplyToken.courseParticipation};
              `,
            ) ??
            (() => {
              throw new Error();
            })();
          const course =
            application.database.get<{
              id: number;
              publicId: string;
              name: string;
              information: string | null;
              invitationLinkCourseParticipationRoleInstructorsEnabled: number;
              invitationLinkCourseParticipationRoleInstructorsTokenEncrypted: string;
              invitationLinkCourseParticipationRoleStudentsEnabled: number;
              invitationLinkCourseParticipationRoleStudentsTokenEncrypted: string;
              courseConversationRequiresTagging: number;
              courseParticipationRoleStudentsAnonymityAllowed:
                | "courseParticipationRoleStudentsAnonymityAllowedNone"
                | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
                | "courseParticipationRoleStudentsAnonymityAllowedEveryone";
              courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent: number;
              courseState: "courseStateActive" | "courseStateArchived";
              courseConversationsNextPublicId: number;
              ltiPlatformId: string | null;
              ltiClientId: string | null;
              ltiContextId: string | null;
              ltiNamesAndRoleProvisioningServicesURL: string | null;
            }>(
              sql`
                select
                  "id",
                  "publicId",
                  "name",
                  "information",
                  "invitationLinkCourseParticipationRoleInstructorsEnabled",
                  "invitationLinkCourseParticipationRoleInstructorsTokenEncrypted",
                  "invitationLinkCourseParticipationRoleStudentsEnabled",
                  "invitationLinkCourseParticipationRoleStudentsTokenEncrypted",
                  "courseConversationRequiresTagging",
                  "courseParticipationRoleStudentsAnonymityAllowed",
                  "courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent",
                  "courseState",
                  "courseConversationsNextPublicId",
                  "ltiPlatformId",
                  "ltiClientId",
                  "ltiContextId",
                  "ltiNamesAndRoleProvisioningServicesURL"
                from "courses"
                where
                  "id" = ${courseParticipation.course} and
                  "courseState" = 'courseStateActive';
              `,
            ) ??
            (() => {
              throw new Error();
            })();
          const courseConversation =
            application.database.get<{
              id: number;
              publicId: string;
              courseConversationType:
                "courseConversationTypeNote" | "courseConversationTypeQuestion";
              questionResolved: number;
              courseConversationVisibility:
                | "courseConversationVisibilityEveryone"
                | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                | "courseConversationVisibilityCourseConversationParticipations";
              pinned: number;
              title: string;
            }>(
              sql`
                select 
                  "id",
                  "publicId",
                  "courseConversationType",
                  "questionResolved",
                  "courseConversationVisibility",
                  "pinned",
                  "title"
                from "courseConversations"
                where
                  "course" = ${course.id} and
                  "id" = ${courseConversationMessageEmailNotificationReplyToken.courseConversation} and (
                    "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                    ${
                      courseParticipation.courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? sql`
                            or
                            "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                          `
                        : sql``
                    }
                    or (
                      select true
                      from "courseConversationParticipations"
                      where
                        "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                        "courseConversationParticipations"."courseParticipation" = ${courseParticipation.id}
                    )
                  );
              `,
            ) ??
            (() => {
              throw new Error();
            })();
          session.states.push({
            courseConversationMessageEmailNotificationReplyToken,
            course,
            courseParticipation,
            courseConversation,
          });
        },
      ),
      onData: util.callbackify(
        async (
          emailStream: smtpServer.SMTPServerDataStream,
          session: smtpServer.SMTPServerSession & SMTPServerSessionState,
        ) => {
          try {
            if (session.envelope.mailFrom === false) throw new Error();
            const email = await mailParser.simpleParser(emailStream);
            if (emailStream.sizeExceeded) throw new Error();
            const attachments = new Array<string>();
            // for (const attachment of email.attachments) {
            //   const feedEntryEnclosure = application.database.get<{
            //     id: number;
            //     publicId: string;
            //     name: string;
            //   }>(
            //     sql`
            //     select * from "feedEntryEnclosures" where "id" = ${
            //       application.database.run(
            //         sql`
            //           insert into "feedEntryEnclosures" (
            //             "publicId",
            //             "type",
            //             "length",
            //             "name"
            //           )
            //           values (
            //             ${cryptoRandomString({
            //               length: 40,
            //               characters: "abcdefghijklmnopqrstuvwxyz0123456789",
            //             })},
            //             ${attachment.contentType},
            //             ${attachment.size},
            //             ${
            //               attachment.filename?.replaceAll(
            //                 /[^A-Za-z0-9_.-]/g,
            //                 "-",
            //               ) ?? "untitled"
            //             }
            //           );
            //         `,
            //       ).lastInsertRowid
            //     };
            //   `,
            //   )!;
            //   await fs.mkdir(
            //     path.join(
            //       application.userConfiguration.dataDirectory,
            //       "files",
            //       feedEntryEnclosure.publicId,
            //     ),
            //     { recursive: true },
            //   );
            //   await fs.writeFile(
            //     path.join(
            //       application.userConfiguration.dataDirectory,
            //       "files",
            //       feedEntryEnclosure.publicId,
            //       feedEntryEnclosure.name,
            //     ),
            //     attachment.content,
            //   );
            //   attachments.push(feedEntryEnclosure);
            // }
            const content = String(
              (
                await unified()
                  .use(rehypeParse, { fragment: true })
                  .use(rehypeRemark, { document: false })
                  .use(remarkGfm, { singleTilde: false })
                  .use(remarkMath)
                  .use(remarkStringify)
                  .process(
                    typeof email.html === "string"
                      ? email.html
                      : typeof email.textAsHtml === "string"
                        ? email.textAsHtml
                        : html`<div></div>`,
                  )
              ).value,
            );
            for (const state of session.states) {
              const contentTextContent =
                await application.partials.courseConversationMessageContentProcessor(
                  {
                    course: state.course,
                    courseConversationMessageContent: content,
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
              const contentSentimentAnalysis = await (
                await fetch("http://localhost:19000/sentiment-analysis", {
                  method: "POST",
                  headers: { "CSRF-Protection": "true" },
                  body: new URLSearchParams({ text: contentTextContent }),
                })
              ).json();
              application.database.transaction(() => {
                if (
                  state.courseConversation.courseConversationType ===
                    "courseConversationTypeQuestion" &&
                  state.courseParticipation.courseParticipationRole ===
                    "courseParticipationRoleInstructor"
                )
                  application.database.run(
                    sql`
                      update "courseConversations"
                      set "questionResolved" = ${Number(true)}
                      where "id" = ${state.courseConversation.id};
                    `,
                  );
                state.courseConversationMessage = application.database.get<{
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
                              "courseConversationMessageType",
                              "courseConversationMessageVisibility",
                              "courseConversationMessageAnonymity",
                              "sentViaEmail",
                              "content",
                              "contentLexicalSearch",
                              "contentSemanticSearch",
                              "contentSentimentAnalysisType",
                              "contentSentimentAnalysisIntensity"
                            )
                            values (
                              ${cryptoRandomString({ length: 20, type: "numeric" })},
                              ${state.courseConversation.id},
                              ${state.courseParticipation.id},
                              ${new Date().toISOString()},
                              ${null},
                              ${
                                state.courseConversation
                                  .courseConversationType ===
                                  "courseConversationTypeQuestion" &&
                                state.courseParticipation
                                  .courseParticipationRole ===
                                  "courseParticipationRoleInstructor"
                                  ? "courseConversationMessageTypeAnswer"
                                  : "courseConversationMessageTypeMessage"
                              },
                              ${"courseConversationMessageVisibilityEveryone"},
                              ${"courseConversationMessageAnonymityNone"},
                              ${Number(true)},
                              ${content},
                              ${utilities
                                .tokenize(contentTextContent, {
                                  stopWords:
                                    application.applicationConfiguration
                                      .stopWords,
                                  stem: (token) =>
                                    natural.PorterStemmer.stem(token),
                                })
                                .map(
                                  (tokenWithPosition) =>
                                    tokenWithPosition.token,
                                )
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
                      insert into "courseConversationMessageViews" (
                        "courseConversationMessage",
                        "courseParticipation",
                        "createdAt"
                      )
                      values (
                        ${state.courseConversationMessage.id},
                        ${state.courseParticipation.id},
                        ${new Date().toISOString()}
                      );
                    `,
                );
                application.database.backgroundJob({
                  type: "courseConversationMessageEmailNotification",
                  startAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                  parameters: {
                    courseConversationMessageId:
                      state.courseConversationMessage.id,
                  },
                });
              });
              for (const port of application.applicationConfiguration.ports)
                fetch(`http://localhost:${port}/__live-connections`, {
                  method: "POST",
                  headers: { "CSRF-Protection": "true" },
                  body: new URLSearchParams({
                    pathname: `^/courses/${state.course.publicId}/conversations/${state.courseConversation.publicId}(?:$|/)`,
                  }),
                });
              utilities.log(
                "EMAIL",
                "SUCCESS",
                JSON.stringify({
                  course: state.course.id,
                  courseParticipation: state.courseParticipation.id,
                  courseConversation: state.courseConversation.id,
                  courseConversationMessage: state.courseConversationMessage.id,
                }),
              );
            }
          } finally {
            emailStream.resume();
          }
        },
      ),
    });
    application.emailServer.listen(25);
    process.once("gracefulTermination", () => {
      application.emailServer!.close();
    });
    for (const file of [
      application.userConfiguration.email.receive.key,
      application.userConfiguration.email.receive.certificate,
    ])
      fsCallback
        .watchFile(file, () => {
          node.exit();
        })
        .unref();
  }

  if (application.commandLineArguments.values.type === "backgroundJobWorker") {
    const nodemailerTransport = nodemailer.createTransport(
      application.userConfiguration.email.send.nodemailerCreateTransportOptions,
    );
    application.database.backgroundJobWorker<
      Parameters<typeof nodemailerTransport.sendMail>[0]
    >({ type: "email" }, async (parameters) => {
      await nodemailerTransport.sendMail(parameters);
    });
  }
};
