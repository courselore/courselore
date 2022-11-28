import url from "node:url";

export default {
  hostname: "localhost",
  dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
  email: {
    options: {
      streamTransport: true,
      buffer: true,
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "profile@courselore.org",
      },
    },
  },
  administratorEmail: "profile@courselore.org",
  environment: "profile",
};
