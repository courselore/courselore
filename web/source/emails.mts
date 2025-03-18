import nodemailer from "nodemailer";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  if (application.commandLineArguments.values.type === "backgroundJob")
    application.database.backgroundJob<any>(
      { type: "email" },
      async (parameters) => {
        await nodemailer
          .createTransport(
            application.configuration.email,
            application.configuration.email,
          )
          .sendMail(parameters);
      },
    );
};
