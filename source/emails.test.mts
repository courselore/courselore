import path from "node:path";
import nodemailer from "nodemailer";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <f6ajar6ttwsqxea1kclupaywptkwezeq7kvf46uu@localhost>`,
    subject: "Example of a reply to an email notification",
    html: "<p>Hello <strong>World</strong></p>",
    attachments: [
      { path: path.join(import.meta.dirname, "../static/favicon.ico") },
    ],
  });
