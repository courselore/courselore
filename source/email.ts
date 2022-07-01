import { sql } from "@leafac/sqlite";
import { Courselore } from "./index.js";

export type SendEmailWorker = () => Promise<void>;

export default (app: Courselore): void => {
  app.locals.workers.sendEmail = (() => {
    let timeout: NodeJS.Timeout;
    schedule();
    return schedule;

    async function schedule() {
      clean();
      await work();
      clearTimeout(timeout);
      timeout = setTimeout(schedule, 2 * 60 * 1000);
    }

    function clean(): void {
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
            `${new Date().toISOString()}\tworker.sendEmail\tEXPIRED\n${JSON.stringify(
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
            `${new Date().toISOString()}\tworker.sendEmail\tTIMED OUT\n${JSON.stringify(
              JSON.parse(job.mailOptions),
              undefined,
              2
            )}`
          );
        }
      });
    }

    async function work(): Promise<void> {
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
        if (job === undefined) return;
        const mailOptions = JSON.parse(job.mailOptions);
        let result: { status: "SUCCEEDED" | "FAILED"; response: string };
        try {
          const sentMessageInfo = await app.locals.options.sendMail(
            mailOptions
          );
          result = { status: "SUCCEEDED", ...sentMessageInfo };
        } catch (error: any) {
          result = { status: "FAILED", ...error };
        }
        switch (result.status) {
          case "SUCCEEDED":
            app.locals.database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            break;
          case "FAILED":
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
            break;
        }
        console.log(
          `${new Date().toISOString()}\tworker.sendEmail\t${result.status}\t\t${
            result?.response ?? ""
          }\t\t${mailOptions.to}\t\t${mailOptions.subject}${
            process.env.NODE_ENV !== "production"
              ? `\n${JSON.stringify(JSON.parse(job.mailOptions), undefined, 2)}`
              : ``
          }`
        );
      }
    }
  })();
};
