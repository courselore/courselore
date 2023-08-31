import url from "node:url";

export default {
  hostname: "localhost",
  dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
  email: {
    options: {
      host: "127.0.0.1",
      port: 8002,
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
