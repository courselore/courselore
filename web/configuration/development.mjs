import url from "node:url";
import fs from "node:fs/promises";

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
  staticPaths: [
    url.fileURLToPath(new URL("./development--static/", import.meta.url)),
  ],
  saml: {
    development: {
      name: "Development SAML Identity Provider",
      ...(process.env.SAML_LOGO === "true"
        ? {
            logo: {
              light: "johns-hopkins-university--light--2023-03-28.webp",
              dark: "johns-hopkins-university--dark--2023-03-28.webp",
              width: 300,
            },
          }
        : {}),
      domains: ["courselore.org"],
      options: {
        cert: await fs.readFile(
          new URL(
            "./development--saml--identity-provider--signing.crt",
            import.meta.url
          ),
          "utf-8"
        ),
      },
    },
  },
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
