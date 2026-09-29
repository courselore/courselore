import nodemailer from "nodemailer";
import { Application } from "./application.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "backgroundJobWorker") {
    const nodemailerTransport = nodemailer.createTransport(
      application.userConfiguration.email,
    );
    application.database.backgroundJobWorker<any>(
      { type: "email" },
      async (parameters) => {
        await nodemailerTransport.sendMail(parameters);
      },
    );
  }
};
