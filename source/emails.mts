import util from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import fsCallback from "node:fs";
import sql from "@radically-straightforward/sqlite";
import * as utilities from "@radically-straightforward/utilities";
import * as cryptography from "@radically-straightforward/cryptography";
import * as node from "@radically-straightforward/node";
import cryptoRandomString from "crypto-random-string";
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
                where "id" = ${courseParticipation.course};
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
            const feedEntryEnclosures = new Array<{ id: number }>();
            for (const attachment of email.attachments) {
              const feedEntryEnclosure = application.database.get<{
                id: number;
                publicId: string;
                name: string;
              }>(
                sql`
                select * from "feedEntryEnclosures" where "id" = ${
                  application.database.run(
                    sql`
                      insert into "feedEntryEnclosures" (
                        "publicId",
                        "type",
                        "length",
                        "name"
                      )
                      values (
                        ${cryptoRandomString({
                          length: 40,
                          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                        })},
                        ${attachment.contentType},
                        ${attachment.size},
                        ${
                          attachment.filename?.replaceAll(
                            /[^A-Za-z0-9_.-]/g,
                            "-",
                          ) ?? "untitled"
                        }
                      );
                    `,
                  ).lastInsertRowid
                };
              `,
              )!;
              await fs.mkdir(
                path.join(
                  application.userConfiguration.dataDirectory,
                  "files",
                  feedEntryEnclosure.publicId,
                ),
                { recursive: true },
              );
              await fs.writeFile(
                path.join(
                  application.userConfiguration.dataDirectory,
                  "files",
                  feedEntryEnclosure.publicId,
                  feedEntryEnclosure.name,
                ),
                attachment.content,
              );
              feedEntryEnclosures.push(feedEntryEnclosure);
            }
            for (const feed of session.states.feeds)
              application.database.transaction(() => {
                application.database.run(
                  sql`
                  update "feeds"
                  set "emailIcon" = ${`https://${(session.envelope.mailFrom as smtpServer.SMTPServerAddress).address.split("@")[1]}/favicon.ico`}
                  where "id" = ${feed.id};
                `,
                );
                const feedEntry = application.database.get<{
                  id: number;
                  publicId: string;
                }>(
                  sql`
                  select * from "feedEntries" where "id" = ${
                    application.database.run(
                      sql`
                        insert into "feedEntries" (
                          "publicId",
                          "feed",
                          "createdAt",
                          "author",
                          "title",
                          "content"
                        )
                        values (
                          ${cryptoRandomString({
                            length: 40,
                            characters: "abcdefghijklmnopqrstuvwxyz0123456789",
                          })},
                          ${feed.id},
                          ${new Date().toISOString()},
                          ${(session.envelope.mailFrom as smtpServer.SMTPServerAddress).address},
                          ${email.subject ?? "Untitled"},
                          ${typeof email.html === "string" ? email.html : typeof email.textAsHtml === "string" ? email.textAsHtml : "No content."}
                        );
                      `,
                    ).lastInsertRowid
                  };
                `,
                )!;
                for (const feedEntryEnclosure of feedEntryEnclosures)
                  application.database.run(
                    sql`
                    insert into "feedEntryEnclosureLinks" (
                      "feedEntry",
                      "feedEntryEnclosure"
                    ) values (
                      ${feedEntry.id},
                      ${feedEntryEnclosure.id}
                    );
                  `,
                  );
                const deletedFeedEntries = application.database.all<{
                  id: number;
                  publicId: string;
                  title: string;
                  content: string;
                }>(
                  sql`
                  select "id", "publicId", "title", "content"
                  from "feedEntries"
                  where "feed" = ${feed.id}
                  order by "id" asc;
                `,
                );
                let feedLength = 0;
                while (0 < deletedFeedEntries.length) {
                  const feedEntry = deletedFeedEntries.pop()!;
                  feedLength +=
                    feedEntry.title.length + feedEntry.content.length;
                  if (512 * 2 ** 10 < feedLength) break;
                }
                for (const deletedFeedEntry of deletedFeedEntries) {
                  application.database.run(
                    sql`
                    delete from "feedEntryEnclosureLinks" where "feedEntry" = ${deletedFeedEntry.id};
                  `,
                  );
                  application.database.run(
                    sql`
                    delete from "feedEntries" where "id" = ${deletedFeedEntry.id};
                  `,
                  );
                }
                for (const feedWebSubSubscription of application.database.all<{
                  id: number;
                }>(
                  sql`
                  select "id" from "feedWebSubSubscriptions" where "feed" = ${feed.id};
                `,
                ))
                  application.database.backgroundJob({
                    type: "feedWebSubSubscriptions.dispatch",
                    parameters: {
                      feedId: feed.id,
                      feedEntryId: feedEntry.id,
                      feedWebSubSubscriptionId: feedWebSubSubscription.id,
                    },
                  });
                utilities.log(
                  "EMAIL",
                  "SUCCESS",
                  "FEED",
                  String(feed.publicId),
                  "ENTRY",
                  feedEntry.publicId,
                  (session.envelope.mailFrom as smtpServer.SMTPServerAddress)
                    .address,
                  "DELETED ENTRIES",
                  JSON.stringify(
                    deletedFeedEntries.map(
                      (deletedFeedEntry) => deletedFeedEntry.publicId,
                    ),
                  ),
                );
              });
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
