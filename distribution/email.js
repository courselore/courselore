import { sql } from "@leafac/sqlite";
export default (app) => {
    app.locals.workers.sendEmail = (() => {
        let timeout;
        schedule();
        return schedule;
        async function schedule() {
            await work();
            clearTimeout(timeout);
            timeout = setTimeout(schedule, 2 * 60 * 1000);
        }
        async function work() {
            app.locals.database.executeTransaction(() => {
                for (const job of app.locals.database.all(sql `
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "expiresAt" < ${new Date().toISOString()}
          `)) {
                    app.locals.database.run(sql `
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `);
                    console.log(`${new Date().toISOString()}\tworker.sendEmail\tEXPIRED\n${JSON.stringify(JSON.parse(job.mailOptions), undefined, 2)}`);
                }
            });
            app.locals.database.executeTransaction(() => {
                for (const job of app.locals.database.all(sql `
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "startedAt" < ${new Date(Date.now() - 2 * 60 * 1000).toISOString()}
          `)) {
                    app.locals.database.run(sql `
              UPDATE "sendEmailJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `);
                    console.log(`${new Date().toISOString()}\tworker.sendEmail\tTIMED OUT\n${JSON.stringify(JSON.parse(job.mailOptions), undefined, 2)}`);
                }
            });
            while (true) {
                const job = app.locals.database.executeTransaction(() => {
                    const job = app.locals.database.get(sql `
              SELECT "id", "mailOptions"
              FROM "sendEmailJobs"
              WHERE "startAt" <= ${new Date().toISOString()} AND
                    "startedAt" IS NULL
              ORDER BY "startAt" ASC
              LIMIT 1
            `);
                    if (job !== undefined)
                        app.locals.database.run(sql `
                UPDATE "sendEmailJobs"
                SET "startedAt" = ${new Date().toISOString()}
                WHERE "id" = ${job.id}
              `);
                    return job;
                });
                if (job === undefined)
                    return;
                const mailOptions = JSON.parse(job.mailOptions);
                try {
                    const sentMessageInfo = await app.locals.options.sendMail(mailOptions);
                    app.locals.database.run(sql `
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `);
                    console.log(`${new Date().toISOString()}\tworker.sendEmail\tSUCCEEDED\t\t${sentMessageInfo.response ?? ""}\t\t${mailOptions.to}\t\t${mailOptions.subject}${app.locals.options.environment !== "production"
                        ? `\n${JSON.stringify(sentMessageInfo, undefined, 2)}`
                        : ``}`);
                }
                catch (error) {
                    app.locals.database.run(sql `
              UPDATE "sendEmailJobs"
              SET "startAt" = ${new Date(Date.now() + 5 * 60 * 1000).toISOString()},
                  "startedAt" = NULL
              WHERE "id" = ${job.id}
            `);
                    console.log(`${new Date().toISOString()}\tworker.sendEmail\tFAILED\t\t${error.response ?? ""}\t\t${mailOptions.to}\t\t${mailOptions.subject}${app.locals.options.environment !== "production"
                        ? `\n${JSON.stringify(error, undefined, 2)}`
                        : ``}`);
                }
            }
        }
    })();
};
//# sourceMappingURL=email.js.map