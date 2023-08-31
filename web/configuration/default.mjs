import url from "node:url";
import fs from "node:fs/promises";
import path from "node:path";

export default {
  hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
  dataDirectory: ["development", "profile"].includes(process.env.ENVIRONMENT)
    ? url.fileURLToPath(new URL("../data/", import.meta.url))
    : path.join(process.cwd(), "data"),
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
            import.meta.url,
          ),
          "utf-8",
        ),
        privateKey: await fs.readFile(
          new URL(
            "./development--saml--service-provider--signing.key",
            import.meta.url,
          ),
          "utf-8",
        ),
        signingCert: await fs.readFile(
          new URL(
            "./development--saml--service-provider--signing.crt",
            import.meta.url,
          ),
          "utf-8",
        ),
        decryptionPvk: await fs.readFile(
          new URL(
            "./development--saml--service-provider--encryption.key",
            import.meta.url,
          ),
          "utf-8",
        ),
        decryptionCert: await fs.readFile(
          new URL(
            "./development--saml--service-provider--encryption.crt",
            import.meta.url,
          ),
          "utf-8",
        ),
      },
    },
  },
  environment: process.env.ENVIRONMENT ?? "default",
  tunnel: typeof process.env.TUNNEL === "string",
};
