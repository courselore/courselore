import path from "node:path";
import timers from "node:timers/promises";
import fs from "fs-extra";
import nodemailer from "nodemailer";
import { sql } from "@leafac/sqlite";
import filenamify from "filenamify";
import { Courselore } from "./index.mjs";

export type SendEmailWorker = () => Promise<void>;

export default async (app: Courselore): Promise<void> => {
  if (app.locals.options.processType === "worker")
    app.once("start", async () => {
      const sendMailTransport = nodemailer.createTransport(
        app.locals.options.email.options,
        app.locals.options.email.defaults
      );
      const sendMail =
        app.locals.options.email.options.streamTransport &&
        app.locals.options.email.options.buffer
          ? async (mailOptions: nodemailer.SendMailOptions) => {
              const sentMessageInfo = await sendMailTransport.sendMail(
                mailOptions
              );
              await fs.outputFile(
                path.join(
                  app.locals.options.dataDirectory,
                  "emails",
                  filenamify(
                    `${new Date().toISOString()}--${mailOptions.to}.eml`,
                    {
                      replacement: "-",
                    }
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
            app.locals.options.processType
          }\tsendEmailJobs\tSTARTING...`
        );

        app.locals.database.executeTransaction(() => {
          for (const job of app.locals.database.all<{
            id: number;
            mailOptions: string;
          }>(
            sql`
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE "expiresAt" < ${new Date().toISOString()}
            `
          )) {
            app.locals.database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.locals.options.processType
              }\tsendEmailJobs\tEXPIRED\n${JSON.stringify(
                JSON.parse(job.mailOptions),
                undefined,
                2
              )}`
            );
          }
        });

        app.locals.database.executeTransaction(() => {
          for (const job of app.locals.database.all<{
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
            app.locals.database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startedAt" = NULL
                WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.locals.options.processType
              }\tsendEmailJobs\tTIMED OUT\n${JSON.stringify(
                JSON.parse(job.mailOptions),
                undefined,
                2
              )}`
            );
          }
        });

        while (true) {
          const job = app.locals.database.executeTransaction(() => {
            const job = app.locals.database.get<{
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
              app.locals.database.run(
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
            app.locals.database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            console.log(
              `${new Date().toISOString()}\t${
                app.locals.options.processType
              }\tsendEmailJobs\tSUCCEEDED\t${sentMessageInfo.response ?? ""}\t${
                mailOptions.to
              }\t${mailOptions.subject}`
            );
          } catch (error: nodemailer.SentMessageInfo) {
            app.locals.database.run(
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
                app.locals.options.processType
              }\tsendEmailJobs\tFAILED\t${error.response ?? ""}\t${
                mailOptions.to
              }\t${mailOptions.subject}\n${error}`
            );
          }

          await timers.setTimeout(100, undefined, { ref: false });
        }

        console.log(
          `${new Date().toISOString()}\t${
            app.locals.options.processType
          }\tsendEmailJobs\tFINISHED`
        );

        await timers.setTimeout(2 * 60 * 1000, undefined, { ref: false });
      }
    });
};
