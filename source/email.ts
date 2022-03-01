export default () => {
  const sendEmailWorker = (() => {
    let timeout = setTimeout(schedule, 2 * 60 * 1000);
    return schedule;

    async function schedule(): Promise<void> {
      clearTimeout(timeout);
      clean();
      await work();
      timeout = setTimeout(schedule, 2 * 60 * 1000);
    }

    function clean(): void {
      database.executeTransaction(() => {
        for (const job of database.all<{ id: number; mailOptions: string }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "expiresAt" < ${new Date().toISOString()}
          `
        )) {
          database.run(
            sql`
              DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
            `
          );
          console.log(
            `${new Date().toISOString()}\tsendEmailWorker\tEXPIRED\n${JSON.stringify(
              JSON.parse(job.mailOptions),
              undefined,
              2
            )}`
          );
        }
      });

      database.executeTransaction(() => {
        for (const job of database.all<{ id: number; mailOptions: string }>(
          sql`
            SELECT "id", "mailOptions"
            FROM "sendEmailJobs"
            WHERE "startedAt" < ${new Date(
              Date.now() - 2 * 60 * 1000
            ).toISOString()}
          `
        )) {
          database.run(
            sql`
              UPDATE "sendEmailJobs"
              SET "startedAt" = NULL
              WHERE "id" = ${job.id}
            `
          );
          console.log(
            `${new Date().toISOString()}\tsendEmailWorker\tTIMED OUT\n${JSON.stringify(
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
        const job = database.executeTransaction(() => {
          const job = database.get<{ id: number; mailOptions: string }>(
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
            database.run(
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
          const sentMessageInfo = await sendMail(mailOptions);
          result = { status: "SUCCEEDED", ...sentMessageInfo };
        } catch (error: any) {
          result = { status: "FAILED", ...error };
        }
        switch (result.status) {
          case "SUCCEEDED":
            database.run(
              sql`
                DELETE FROM "sendEmailJobs" WHERE "id" = ${job.id}
              `
            );
            break;
          case "FAILED":
            database.run(
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
          `${new Date().toISOString()}\tsendEmailWorker\t${result.status}\t\t${
            result?.response ?? ""
          }\t\t${mailOptions.to}\t\t${mailOptions.subject}${
            process.env.NODE_ENV !== "production" ? `\n${mailOptions.html}` : ``
          }`
        );
      }
    }
  })();
};
