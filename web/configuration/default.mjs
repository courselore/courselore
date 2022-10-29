import path from "node:path";

export default {
  hostname: "localhost",
  administratorEmail: "feedback@courselore.org",
  dataDirectory: path.join(process.cwd(), "data"),
  sendMail: {
    options: { streamTransport: true, buffer: true },
    defaults: {
      from: {
        name: "Courselore",
        address: "feedback@courselore.org",
      },
    },
  },
  environment: "default",
  demonstration: true,
};
