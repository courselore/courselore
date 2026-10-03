import path from "node:path";
import nodemailer from "nodemailer";
import html from "@radically-straightforward/html";

await nodemailer
  .createTransport({
    host: "localhost",
    port: 25,
  })
  .sendMail({
    from: `"Example of Sender" <sender@example.com>`,
    to: `"Example of Recipient" <f6ajar6ttwsqxea1kclupaywptkwezeq7kvf46uu@localhost>`,
    subject: "Example of a reply to an email notification",
    html: html`
      <p>
        Hello <strong>World</strong>
        <img src="cid:image@example.com" />
      </p>
    `,
    attachments: [
      { path: path.join(import.meta.dirname, "../static/favicon.ico") },
      {
        path: path.join(import.meta.dirname, "../static/apple-touch-icon.png"),
        cid: "image@example.com",
      },
    ],
  });
