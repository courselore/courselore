import timers from "node:timers/promises";
import nodemailer from "nodemailer";
import sql from "@leafac/sqlite";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  let timerAbortController: AbortController;

  application.workerEvents.once("start", async () => {
    while (true) {
      application.log("sendEmailJobs", "STARTING...");

      application.database.executeTransaction(() => {
        for (const job of application.database.all<{
          id: number;
          mailOptions: string;
        }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "createdAt" < ${new Date(
              Date.now() - 20 * 60 * 1000,
            ).toISOString()}
          `,
        )) {
          application.database.run(
            sql`
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "sendEmailJobs",
            "EXPIRED",
            JSON.stringify(JSON.parse(job.mailOptions), undefined, 2),
          );
        }
      });

      application.database.executeTransaction(() => {
        for (const job of application.database.all<{
          id: number;
          mailOptions: string;
        }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "startedAt" < ${new Date(
              Date.now() - 2 * 60 * 1000,
            ).toISOString()}
          `,
        )) {
          application.database.run(
            sql`
              UPDATE "sendEmailJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "sendEmailJobs",
            "TIMED OUT",
            JSON.stringify(JSON.parse(job.mailOptions), undefined, 2),
          );
        }
      });

      while (true) {
        const job = application.database.executeTransaction(() => {
          const job = application.database.get<{
            id: number;
            mailOptions: string;
          }>(
            sql`
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE
                "startAt" <= ${new Date().toISOString()} AND
                "startedAt" IS NULL
              ORDER BY "startAt" ASC
              LIMIT 1
            `,
          );
          if (job !== undefined)
            application.database.run(
              sql`
                UPDATE "sendEmailJobs"
                SET "startedAt" = ${new Date().toISOString()}
                WHERE "id" = ${job.id}
              `,
            );
          return job;
        });
        if (job === undefined) break;

        const mailOptions = JSON.parse(job.mailOptions);
        try {
          const sentMessageInfo = await nodemailer
            .createTransport(application.configuration.email.options)
            .sendMail({
              ...application.configuration.email.defaults,
              ...mailOptions,
            });
          application.database.run(
            sql`
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "sendEmailJobs",
            "SUCCEEDED",
            sentMessageInfo.response ?? "",
            mailOptions.to,
            mailOptions.subject,
          );
        } catch (error: nodemailer.SentMessageInfo) {
          application.database.run(
            sql`
              UPDATE "sendEmailJobs"
              SET
                "startAt" = ${new Date(
                  Date.now() + 5 * 60 * 1000,
                ).toISOString()},
                "startedAt" = NULL
              WHERE "id" = ${job.id}
            `,
          );
          application.log(
            "sendEmailJobs",
            "FAILED",
            error.response ?? "",
            mailOptions.to,
            mailOptions.subject,
            String(error),
            error?.stack,
          );
        }

        await timers.setTimeout(100 + Math.random() * 100, undefined, {
          ref: false,
        });
      }

      application.log("sendEmailJobs", "FINISHED");

      timerAbortController = new AbortController();
      await timers
        .setTimeout(2 * 60 * 1000 + Math.random() * 30 * 1000, undefined, {
          ref: false,
          signal: timerAbortController.signal,
        })
        .catch(() => {});
    }
  });

  application.workerEvents.post<{}, any, {}, {}, {}>(
    "/send-email",
    (request, response) => {
      timerAbortController?.abort();
      response.end();
    },
  );
};
