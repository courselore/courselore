import util from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import fsCallback from "node:fs";
import stream from "node:stream";
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
import * as smtpServer from "smtp-server";
import PostalMime from "postal-mime";
import nodemailer from "nodemailer";
import { DOMParser } from "linkedom";
import { Application } from "./application.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "emailServer") {
    type SMTPServerSessionStates = {
      states: {
        courseForumConversationMessageEmailNotificationReplyToken: {
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
          courseForumConversationRequiresTagging: number;
          courseParticipationRoleStudentsAnonymityAllowed:
            | "courseParticipationRoleStudentsAnonymityAllowedNone"
            | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
            | "courseParticipationRoleStudentsAnonymityAllowedEveryone";
          courseParticipationRoleStudentsMayAttachFileOrImagesToTheirMessages: number;
          courseState: "courseStateActive" | "courseStateArchived";
          courseForumConversationsNextPublicId: number;
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
          mostRecentlyVisitedCourseForumConversation: number | null;
        };
        courseConversation: {
          id: number;
          publicId: string;
          courseForumConversationType:
            "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
          courseForumConversationTypeQuestionResolved: number;
          courseForumConversationVisibility:
            | "courseForumConversationVisibilityEveryone"
            | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
            | "courseForumConversationVisibilityCourseForumConversationParticipations";
          pinned: number;
          title: string;
        };
        courseForumConversationMessage: {
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
          session: smtpServer.SMTPServerSession & SMTPServerSessionStates,
        ) => {
          session.states = [];
        },
      ),
      onRcptTo: util.callbackify(
        async (
          address: smtpServer.SMTPServerAddress,
          session: smtpServer.SMTPServerSession & SMTPServerSessionStates,
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
            courseForumConversationMessageEmailNotificationReplyTokenToken,
            hostname,
          ] = address.address.split("@");
          if (hostname !== application.userConfiguration.email.receive.hostname)
            throw new Error();
          const courseForumConversationMessageEmailNotificationReplyToken =
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
                from "courseForumConversationMessageEmailNotificationReplyTokens"
                where "tokenTokenHash" = ${cryptography.TokenHash.hash(
                  courseForumConversationMessageEmailNotificationReplyTokenToken,
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
              mostRecentlyVisitedCourseForumConversation: number | null;
            }>(
              sql`
                select
                  "id",
                  "publicId",
                  "course",
                  "courseParticipationRole",
                  "decorationColor",
                  "mostRecentlyVisitedCourseForumConversation"
                from "courseParticipations"
                where "id" = ${courseForumConversationMessageEmailNotificationReplyToken.courseParticipation};
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
              courseForumConversationRequiresTagging: number;
              courseParticipationRoleStudentsAnonymityAllowed:
                | "courseParticipationRoleStudentsAnonymityAllowedNone"
                | "courseParticipationRoleStudentsAnonymityAllowedCourseParticipationRoleStudents"
                | "courseParticipationRoleStudentsAnonymityAllowedEveryone";
              courseParticipationRoleStudentsMayAttachFileOrImagesToTheirMessages: number;
              courseState: "courseStateActive" | "courseStateArchived";
              courseForumConversationsNextPublicId: number;
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
                  "courseForumConversationRequiresTagging",
                  "courseParticipationRoleStudentsAnonymityAllowed",
                  "courseParticipationRoleStudentsMayAttachFileOrImagesToTheirMessages",
                  "courseState",
                  "courseForumConversationsNextPublicId",
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
              courseForumConversationType:
                "courseForumConversationTypeNote" | "courseForumConversationTypeQuestion";
              courseForumConversationTypeQuestionResolved: number;
              courseForumConversationVisibility:
                | "courseForumConversationVisibilityEveryone"
                | "courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations"
                | "courseForumConversationVisibilityCourseForumConversationParticipations";
              pinned: number;
              title: string;
            }>(
              sql`
                select 
                  "id",
                  "publicId",
                  "courseForumConversationType",
                  "courseForumConversationTypeQuestionResolved",
                  "courseForumConversationVisibility",
                  "pinned",
                  "title"
                from "courseConversations"
                where
                  "course" = ${course.id} and
                  "id" = ${courseForumConversationMessageEmailNotificationReplyToken.courseConversation} and (
                    "courseForumConversationVisibility" = 'courseForumConversationVisibilityEveryone'
                    ${
                      courseParticipation.courseParticipationRole ===
                      "courseParticipationRoleInstructor"
                        ? sql`
                            or
                            "courseForumConversationVisibility" = 'courseForumConversationVisibilityCourseParticipationRoleInstructorsAndCourseForumConversationParticipations'
                          `
                        : sql``
                    }
                    or (
                      select true
                      from "courseForumConversationParticipations"
                      where
                        "courseConversations"."id" = "courseForumConversationParticipations"."courseConversation" and
                        "courseForumConversationParticipations"."courseParticipation" = ${courseParticipation.id}
                    )
                  );
              `,
            ) ??
            (() => {
              throw new Error();
            })();
          session.states.push({
            courseForumConversationMessageEmailNotificationReplyToken,
            course,
            courseParticipation,
            courseConversation,
          } as SMTPServerSessionStates["states"][0]);
        },
      ),
      onData: util.callbackify(
        async (
          emailStream: smtpServer.SMTPServerDataStream,
          session: smtpServer.SMTPServerSession & SMTPServerSessionStates,
        ) => {
          try {
            if (session.envelope.mailFrom === false) throw new Error();
            const email = await PostalMime.parse(
              stream.Readable.toWeb(emailStream) as ReadableStream,
            );
            if (emailStream.sizeExceeded) throw new Error();
            const emailBody =
              typeof email.html === "string"
                ? email.html
                : html`<pre>${email.text ?? ""}</pre>`;
            const emailBodyDOM = new DOMParser()
              .parseFromString(
                emailBody.trim().startsWith(`<!doctype`)
                  ? emailBody
                  : html`
                      <!doctype html>
                      <html>
                        <body>
                          $${emailBody}
                        </body>
                      </html>
                    `,
                "text/html",
              )
              .querySelector("html")!;
            while (true) {
              const element = emailBodyDOM.querySelector(
                `.gmail_attr, blockquote.gmail_quote:last-child, blockquote.gmail_extra:last-child, div[type="cite"]:last-child, #divRplyFwdMsg:last-child, #appendonsend:last-child`,
              );
              if (element === null) break;
              element.remove();
            }
            const attachments = new Array<string>();
            for (const attachment of email.attachments) {
              const filename = path.join(
                "files",
                cryptoRandomString({
                  length: 40,
                  characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                }),
                attachment.filename?.replaceAll(/[^A-Za-z0-9_.-]/g, "-") ??
                  "untitled",
              );
              await fs.mkdir(
                path.join(
                  application.userConfiguration.dataDirectory,
                  path.dirname(filename),
                ),
                { recursive: true },
              );
              await fs.writeFile(
                path.join(
                  application.userConfiguration.dataDirectory,
                  filename,
                ),
                Buffer.from(attachment.content as ArrayBuffer),
              );
              if (typeof attachment.contentId === "string") {
                for (const element of emailBodyDOM.querySelectorAll(
                  'img[src^="cid:"]',
                ))
                  if (
                    attachment.contentId.replaceAll(/^<|>$/g, "") ===
                    element
                      .getAttribute("src")!
                      .replace(/^cid:/, "")
                      .replaceAll(/^<|>$/g, "")
                  )
                    element.setAttribute("src", `/${filename}`);
              } else attachments.push(filename);
            }
            const content =
              String(
                (
                  await unified()
                    .use(rehypeParse, { fragment: true })
                    .use(rehypeRemark, { document: false })
                    .use(remarkGfm, { singleTilde: false })
                    .use(remarkMath)
                    .use(remarkStringify)
                    .process(html`
                      <!doctype html>
                      $${emailBodyDOM.outerHTML}
                    `)
                ).value,
              ) +
              (0 < attachments.length
                ? "\n\n" +
                  attachments
                    .map(
                      (attachment) =>
                        `[${path.basename(attachment)}](/${attachment})`,
                    )
                    .join("\n\n")
                : "");
            for (const state of session.states) {
              const contentTextContent =
                await application.partials.courseForumConversationMessageContentProcessor(
                  {
                    course: state.course,
                    courseForumConversationMessageContent: content,
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
                if (
                  state.courseConversation.courseForumConversationType ===
                    "courseForumConversationTypeQuestion" &&
                  state.courseParticipation.courseParticipationRole ===
                    "courseParticipationRoleInstructor"
                )
                  application.database.run(
                    sql`
                      update "courseConversations"
                      set "courseForumConversationTypeQuestionResolved" = ${Number(true)}
                      where "id" = ${state.courseConversation.id};
                    `,
                  );
                state.courseForumConversationMessage = application.database.get<{
                  id: number;
                }>(
                  sql`
                    select * from "courseForumConversationMessages" where "id" = ${
                      application.database.run(
                        sql`
                          insert into "courseForumConversationMessages" (
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
                            ${state.courseConversation.id},
                            ${state.courseParticipation.id},
                            ${Temporal.Now.instant().toString()},
                            ${null},
                            ${
                              state.courseConversation
                                .courseForumConversationType ===
                                "courseForumConversationTypeQuestion" &&
                              state.courseParticipation
                                .courseParticipationRole ===
                                "courseParticipationRoleInstructor"
                                ? "courseForumConversationMessageTypeAnswer"
                                : "courseForumConversationMessageTypeMessage"
                            },
                            ${"courseForumConversationMessageVisibilityEveryone"},
                            ${"courseForumConversationMessageAnonymityNone"},
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
                                (tokenWithPosition) => tokenWithPosition.token,
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
                    insert into "courseForumConversationMessageViews" (
                      "courseForumConversationMessage",
                      "courseParticipation",
                      "createdAt"
                    )
                    values (
                      ${state.courseForumConversationMessage.id},
                      ${state.courseParticipation.id},
                      ${Temporal.Now.instant().toString()}
                    );
                  `,
                );
                application.database.backgroundJob({
                  type: "courseForumConversationMessageEmailNotification",
                  startAt: Temporal.Now.instant()
                    .add({ minutes: 5 })
                    .toString(),
                  parameters: {
                    courseForumConversationMessageId:
                      state.courseForumConversationMessage.id,
                  },
                });
              });
              for (const port of application.applicationConfiguration.ports)
                fetch(`http://localhost:${port}/__live-connections`, {
                  method: "POST",
                  headers: { "CSRF-Protection": "true" },
                  body: new URLSearchParams({
                    pathname: `^/courses/${state.course.publicId}/forum/${state.courseConversation.publicId}(?:$|/)`,
                  }),
                });
              utilities.log(
                "EMAIL",
                "SUCCESS",
                JSON.stringify({
                  course: state.course.id,
                  courseParticipation: state.courseParticipation.id,
                  courseConversation: state.courseConversation.id,
                  courseForumConversationMessage: state.courseForumConversationMessage.id,
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
