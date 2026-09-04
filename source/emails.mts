import nodemailer from "nodemailer";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "backgroundJobWorker")
    setTimeout(() => {
      application.database.backgroundJobWorker<any>(
        { type: "email" },
        async (parameters) => {
          await nodemailer
            .createTransport(
              application.userConfiguration.email,
              application.userConfiguration.email,
            )
            .sendMail(parameters);
        },
      );
    });
};
