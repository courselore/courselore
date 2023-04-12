// COURSELORE CONFIGURATION

import url from "node:url";

export default {
  // The main hostname through which people may access Courselore.
  hostname: "your-domain.edu",

  // The path to the directory in which Courselore stores data:
  // the database and the files uploaded by users (for example, user avatars and attachments in messages).
  // With the line below this is a directory called ‘data/’ relative to this configuration file.
  // In most cases this is appropriate, but you may want to change it to an absolute path, for example, ‘/home/courselore/data/’.
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),

  // Configuration for the email server that delivers email on Courselore’s behalf.
  // Use the format of arguments accepted by Nodemailer’s ‘.createTransport()’. See https://nodemailer.com/smtp/.
  email: {
    options: {
      host: "smtp.your-domain.edu",
      auth: {
        user: "SMTP username",
        pass: "SMTP password",
      },
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "from@your-domain.edu",
      },
    },
  },

  // This email address serves two purposes:
  // 1. If something goes wrong in Courselore, we direct users to report the issue to this email.
  // 2. We provide this email to the certificate authority providing a TLS certificate (necessary for httpS to work).
  //    In case something goes wrong with the certificate, they’ll contact you at this address.
  administratorEmail: "administrator@your-domain.edu",

  // [OPTIONAL] Paths to folders with static files.
  //            They’re useful, for example, to serve logos for SAML configuration (see below).
  // staticPaths: [
  //   url.fileURLToPath(new URL("./static/", import.meta.url)),
  // ],

  // [OPTIONAL] Configuration for single sign-on and single logout via educational institutions with SAML.
  saml: {
    "educational-institution": {
      name: "Educational Institution",
      logo: {
        light: "educational-institution--light--2023-03-28.webp",
        dark: "educational-institution--dark--2023-03-28.webp",
        width: 300,
      },
      domains: ["educational-institution.edu"],
      extractName: (samlResponse) => samlResponse?.profile?.attributes?.name,
      options: {
        idpIssuer:
          "https://identity-provider.educational-institution.edu/metadata",
        entryPoint:
          "https://identity-provider.educational-institution.edu/single-sign-on",
        logoutUrl:
          "https://identity-provider.educational-institution.edu/single-logout",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        signMetadata: true,
        privateKey: await fs.readFile(
          new URL(
            "./educational-institution--saml--service-provider--signing.key",
            import.meta.url
          ),
          "utf-8"
        ),
        signingCert: await fs.readFile(
          new URL(
            "./educational-institution--saml--service-provider--signing.crt",
            import.meta.url
          ),
          "utf-8"
        ),
        decryptionPvk: await fs.readFile(
          new URL(
            "./educational-institution--saml--service-provider--encryption.key",
            import.meta.url
          ),
          "utf-8"
        ),
        decryptionCert: await fs.readFile(
          new URL(
            "./educational-institution--saml--service-provider--encryption.crt",
            import.meta.url
          ),
          "utf-8"
        ),
        cert: await fs.readFile(
          new URL(
            "./educational-institution--saml--identity-provider--signing.crt",
            import.meta.url
          ),
          "utf-8"
        ),
      },
    },

    // Copy the configuration above to add other educational institutions...
  },

  // [OPTIONAL] Other hostnames you’d like to redirect to this Courselore installation.
  // alternativeHostnames: ["www.your-domain.edu", "..."],

  // [OPTIONAL, BUT RECOMMENDED] See https://hstspreload.org/.
  // hstsPreload: true,

  // [OPTIONAL] Extra Caddy configuration to add to Courselore’s Caddy configuration. See https://caddyserver.com.
  // caddy: ``,
};
