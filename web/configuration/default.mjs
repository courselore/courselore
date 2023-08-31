import path from "node:path";

export default {
  hostname: "localhost",
  dataDirectory: path.join(process.cwd(), "data"),
  email: {
    options: {
      host: "127.0.0.1",
      port: 8002,
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "feedback@courselore.org",
      },
    },
  },
  administratorEmail: "feedback@courselore.org",
  environment: "other",
};
