import url from "node:url";

export default {
  hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
  dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
  email: {
    options: {
      streamTransport: true,
      buffer: true,
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "development@courselore.org",
      },
    },
  },
  administratorEmail: "development@courselore.org",
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
