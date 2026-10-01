import util from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import fsCallback from "node:fs";
import sql from "@radically-straightforward/sqlite";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import cryptoRandomString from "crypto-random-string";
import smtpServer from "smtp-server";
import * as mailParser from "mailparser";
import nodemailer from "nodemailer";
import { Application } from "./application.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "emailServer") {
    type SMTPServerSessionState = {
      state: {
        feeds: {
          id: number;
          publicId: string;
        }[];
      };
    };
    application.emailServer = new smtpServer.SMTPServer({
      name: application.userConfiguration.hostname,
      size: 512 * 2 ** 10,
      disabledCommands: ["AUTH"],
      key: await fs.readFile(application.userConfiguration.tls.key, "utf-8"),
      cert: await fs.readFile(
        application.userConfiguration.tls.certificate,
        "utf-8",
      ),
      onMailFrom: util.callbackify(
        async (
          address: smtpServer.SMTPServerAddress,
          session: smtpServer.SMTPServerSession & SMTPServerSessionState,
        ) => {
          session.state = { feeds: [] };
          if (
            address.address.match(utilities.emailRegExp) === null ||
            ["blogtrottr.com", "feedrabbit.com"].some((hostname) =>
              address.address.endsWith("@" + hostname),
            )
          )
            throw new Error();
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
          const [feedPublicId, hostname] = address.address.split("@");
          if (hostname !== application.userConfiguration.hostname)
            throw new Error();
          const feed = application.database.get<{
            id: number;
            publicId: string;
          }>(
            sql`
            select "id", "publicId" from "feeds" where "publicId" = ${feedPublicId};
          `,
          );
          if (feed === undefined) throw new Error();
          session.state.feeds.push(feed);
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
            for (const feed of session.state.feeds)
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
      application.userConfiguration.tls.key,
      application.userConfiguration.tls.certificate,
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
