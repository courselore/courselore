// COURSELORE CONFIGURATION

import url from "node:url";

export default {
  // The main hostname through which people may access Courselore.
  hostname: "YOUR-DOMAIN.EDU",

  // The path to the directory in which Courselore stores data:
  // the database and the files uploaded by users (for example, user avatars and attachments in messages).
  // With the line below this is a directory called ‘data/’ relative to this configuration file.
  // In most cases this is appropriate, but you may want to change it to an absolute path, for example, ‘/home/courselore/data/’.
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),

  // Configuration for the email server that delivers email on Courselore’s behalf.
  // Use the format of arguments accepted by Nodemailer’s ‘.createTransport()’. See https://nodemailer.com/smtp/.
  email: {
    options: {
      host: "SMTP.YOUR-DOMAIN.EDU",
      auth: {
        user: "SMTP USERNAME",
        pass: "SMTP PASSWORD",
      },
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "FROM@YOUR-DOMAIN.EDU",
      },
    },
  },

  // This email address serves two purposes:
  // 1. If something goes wrong in Courselore, we direct users to report the issue to this email.
  // 2. We provide this email to the certificate authority providing a TLS certificate (necessary for httpS to work).
  //    In case something goes wrong with the certificate, they’ll contact you at this address.
  administratorEmail: "ADMINISTRATOR@YOUR-DOMAIN.EDU",

  // [OPTIONAL] Paths to folders with static files.
  //            They’re useful, for example, to store logos for SAML configuration (see below).
  // staticPaths: [
  //   url.fileURLToPath(new URL("./static/", import.meta.url)),
  // ],

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
      extractName: (samlResponse) => samlResponse?.profile?.attributes?.name,
      options: {
        idpIssuer: "http://localhost:9000/metadata",
        entryPoint: "http://localhost:9000/saml/sso",
        logoutUrl: "http://localhost:9000/saml/slo",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        signMetadata: true,
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

  // [OPTIONAL] Other hostnames you’d like to redirect to this Courselore installation.
  // alternativeHostnames: ["WWW.YOUR-DOMAIN.EDU", "..."],

  // [OPTIONAL, BUT RECOMMENDED] See https://hstspreload.org/.
  // hstsPreload: true,

  // [OPTIONAL] Extra Caddy configuration to add to Courselore’s Caddy configuration. See https://caddyserver.com.
  // caddy: ``,
};
