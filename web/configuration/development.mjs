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
      name: "Courselore University",
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
      attributes: (samlResponse) => ({
        email: samlResponse?.profile?.nameID,
        name: samlResponse?.profile?.attributes?.name,
      }),
      options: {
        idpIssuer: "http://localhost:9000/metadata",
        entryPoint: "http://localhost:9000/saml/sso",
        logoutUrl: "http://localhost:9000/saml/slo",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        signMetadata: true,
        cert: await fs.readFile(
          new URL(
            "./development--saml--identity-provider--signing.crt",
            import.meta.url
          ),
          "utf-8"
        ),
        privateKey: await fs.readFile(
          new URL(
            "./development--saml--service-provider--signing.key",
            import.meta.url
          ),
          "utf-8"
        ),
        signingCert: await fs.readFile(
          new URL(
            "./development--saml--service-provider--signing.crt",
            import.meta.url
          ),
          "utf-8"
        ),
        decryptionPvk: await fs.readFile(
          new URL(
            "./development--saml--service-provider--encryption.key",
            import.meta.url
          ),
          "utf-8"
        ),
        decryptionCert: await fs.readFile(
          new URL(
            "./development--saml--service-provider--encryption.crt",
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
