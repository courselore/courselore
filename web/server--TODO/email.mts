import path from "node:path";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import nodemailer from "nodemailer";
import { sql } from "@leafac/sqlite";
import filenamify from "filenamify";
import { Courselore } from "./index.mjs";

export type SendEmailWorker = () => Promise<void>;

export default async (app: Courselore): Promise<void> => {
  if (app.process.type === "worker")
    app.once("start", async () => {
      const sendMailTransport = nodemailer.createTransport(
        app.configuration.email.options,
        app.configuration.email.defaults
      );
      const sendMail =
        app.configuration.email.options.streamTransport &&
        app.configuration.email.options.buffer
          ? async (mailOptions: nodemailer.SendMailOptions) => {
              const sentMessageInfo = await sendMailTransport.sendMail(
                mailOptions
              );
              await fs.outputFile(
                path.join(
                  app.configuration.dataDirectory,
                  "emails",
                  filenamify(
                    `${new Date().toISOString()}--${mailOptions.to}.eml`,
                    { replacement: "-" }
                  )
                ),
                (sentMessageInfo as any).message
              );
              return sentMessageInfo;
            }
          : async (mailOptions: nodemailer.SendMailOptions) =>
              await sendMailTransport.sendMail(mailOptions);

      while (true) {
        console.log(
          `${new Date().toISOString()}\t${
            app.process.type
          }\tsendEmailJobs\tSTARTING...`
        );

        app.database.executeTransaction(() => {
          for (const job of app.database.all<{
            id: number;
            mailOptions: string;
          }>(
            sql`
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE "expiresAt" < ${new Date().toISOString()}
            `
          )) {
            app.database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\tsendEmailJobs\tEXPIRED\n${JSON.stringify(
                JSON.parse(job.mailOptions),
                undefined,
                2
              )}`
            );
          }
        });

        app.database.executeTransaction(() => {
          for (const job of app.database.all<{
            id: number;
            mailOptions: string;
          }>(
            sql`
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE "startedAt" < ${new Date(
                Date.now() - 2 * 60 * 1000
              ).toISOString()}
            `
          )) {
            app.database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startedAt" = NULL
                WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\tsendEmailJobs\tTIMED OUT\n${JSON.stringify(
                JSON.parse(job.mailOptions),
                undefined,
                2
              )}`
            );
          }
        });

        while (true) {
          const job = app.database.executeTransaction(() => {
            const job = app.database.get<{
              id: number;
              mailOptions: string;
            }>(
              sql`
                SELECT "id", "mailOptions"
                FROM "sendEmailJobs"
                WHERE "startAt" <= ${new Date().toISOString()} AND
                      "startedAt" IS NULL
                ORDER BY "startAt" ASC
                LIMIT 1
              `
            );
            if (job !== undefined)
              app.database.run(
                sql`
                  UPDATE "sendEmailJobs"
                  SET "startedAt" = ${new Date().toISOString()}
                  WHERE "id" = ${job.id}
                `
              );
            return job;
          });
          if (job === undefined) break;
          const mailOptions = JSON.parse(job.mailOptions);
          try {
            const sentMessageInfo = await sendMail(mailOptions);
            app.database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\tsendEmailJobs\tSUCCEEDED\t${sentMessageInfo.response ?? ""}\t${
                mailOptions.to
              }\t${mailOptions.subject}`
            );
          } catch (error: nodemailer.SentMessageInfo) {
            app.database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startAt" = ${new Date(
                  Date.now() + 5 * 60 * 1000
                ).toISOString()},
                    "startedAt" = NULL
                WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.process.type
              }\tsendEmailJobs\tFAILED\t${error.response ?? ""}\t${
                mailOptions.to
              }\t${mailOptions.subject}\n${error}`
            );
          }

          await timers.setTimeout(100, undefined, { ref: false });
        }

        console.log(
          `${new Date().toISOString()}\t${
            app.process.type
          }\tsendEmailJobs\tFINISHED`
        );

        await timers.setTimeout(2 * 60 * 1000, undefined, { ref: false });
      }
    });
};
