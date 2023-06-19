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
  // They’re useful, for example, to serve logos for SAML configuration (see below).
  // Files must be immutable. If the contents of a file changes, then change its name as well.
  // staticPaths: [
  //   // Use the following for paths that are relative to the configuration file.
  //   url.fileURLToPath(new URL("./static/", import.meta.url)),
  // ],

  // [OPTIONAL] Configuration for single sign-on and single logout via educational institutions with SAML.
  // saml: {
  //   // For each educational institution Courselore provides the following endpoints, which may be necessary for registering Courselore as a service provider with the identity provider at the educational institution:
  //   // - https://your-domain.edu/saml/educational-institution/metadata
  //   // - https://your-domain.edu/saml/educational-institution/assertion-consumer-service
  //   // - https://your-domain.edu/saml/educational-institution/single-logout-service
  //   "educational-institution": {
  //     // [OPTIONAL] Set ‘public’ to ‘false’ to hide this educational institution from the main sign in page.
  //     // It will be available from ‘/sign-in/saml’ and may be used for testing and setting up with the identity provider.
  //     // It also enables special logging including, for example, the SAML response from the identity provider.
  //     // public: false,

  //     name: "Educational Institution",

  //     // [OPTIONAL] Images for the logo of the educational institution.
  //     // Images should:
  //     // - Have a transparent background.
  //     // - Be approximately 300px in width, matching the other logos visually.
  //     // - Be in WebP format. You may use https://npm.im/sharp-cli to convert from other formats into WebP using the following command:
  //     //   $ npx sharp-cli -i educational-institution--light.png -o educational-institution--light--2023-03-28.webp
  //     // - Be appropriate for light and dark backgrounds.
  //     logo: {
  //       light: "educational-institution--light--2023-03-28.webp",
  //       dark: "educational-institution--dark--2023-03-28.webp",
  //       width: 300,
  //     },

  //     // Email domains with which this educational institution is trusted, including subdomains.
  //     // For example, for the ‘educational-institution.edu’ domain, Courselore trusts this educational institution with ‘scott@educational-institution.edu’ and ‘leandro@alumni.educational-institution.edu’.
  //     domains: ["educational-institution.edu"],

  //     // A function that, given a SAML response from the educational institution, produces the user attributes for sign up and sign in.
  //     // See https://github.com/node-saml/node-saml/blob/e85389560a36b624ad5d399ee85e1c8a3b8adbea/src/saml.ts#L669 and https://github.com/node-saml/node-saml/blob/e85389560a36b624ad5d399ee85e1c8a3b8adbea/src/types.ts#L236-L251
  //     attributes: (samlResponse) => ({
  //       email: samlResponse?.profile?.nameID,
  //       name: samlResponse?.profile?.attributes?.name,
  //     }),

  //     // Options for Node SAML.
  //     // See https://github.com/node-saml/node-saml
  //     // Some of these options may not be necessary depending on the SAML configuration of the identity provider at the educational institution.
  //     // Do not provide the following options, which are set by Courselore:
  //     // - issuer
  //     // - callbackUrl
  //     // - logoutCallbackUrl
  //     // - validateInResponseTo
  //     // - requestIdExpirationPeriodMs
  //     // - cacheProvider
  //     options: {
  //       // The URL of the metadata for the identity provider at the educational institution.
  //       idpIssuer:
  //         "https://identity-provider.educational-institution.edu/metadata",
  //       // The ‘Location’ given in the ‘SingleSignOnService’ entry with the ‘HTTP-Redirect’ binding.
  //       entryPoint:
  //         "https://identity-provider.educational-institution.edu/single-sign-on",
  //       // The ‘Location’ given in the ‘SingleLogoutService’ entry with the ‘HTTP-Redirect’ binding.
  //       logoutUrl:
  //         "https://identity-provider.educational-institution.edu/single-logout",

  //       signatureAlgorithm: "sha256",
  //       digestAlgorithm: "sha256",
  //       signMetadata: true,

  //       // Use the following for keys and certificates stored as files whose paths are relative to the configuration file.
  //       cert: await fs.readFile(
  //         new URL(
  //           "./educational-institution--saml--identity-provider--signing.crt",
  //           import.meta.url
  //         ),
  //         "utf-8"
  //       ),

  //       // You may create the following keys and certificates with the following commands (see https://knowledge.digicert.com/generalinformation/INFO1745.html for more information on the ‘-subj’ parameter):
  //       // $ openssl req -x509 -newkey rsa:2048 -nodes -days 365000 -subj "/C=US/ST=Maryland/L=Baltimore/O=Courselore/CN=courselore.org" -keyout educational-institution--saml--service-provider--signing.key -out educational-institution--saml--service-provider--signing.crt
  //       // $ openssl req -x509 -newkey rsa:2048 -nodes -days 365000 -subj "/C=US/ST=Maryland/L=Baltimore/O=Courselore/CN=courselore.org" -keyout educational-institution--saml--service-provider--encryption.key -out educational-institution--saml--service-provider--encryption.crt
  //       privateKey: await fs.readFile(
  //         new URL(
  //           "./educational-institution--saml--service-provider--signing.key",
  //           import.meta.url
  //         ),
  //         "utf-8"
  //       ),
  //       signingCert: await fs.readFile(
  //         new URL(
  //           "./educational-institution--saml--service-provider--signing.crt",
  //           import.meta.url
  //         ),
  //         "utf-8"
  //       ),

  //       decryptionPvk: await fs.readFile(
  //         new URL(
  //           "./educational-institution--saml--service-provider--encryption.key",
  //           import.meta.url
  //         ),
  //         "utf-8"
  //       ),
  //       decryptionCert: await fs.readFile(
  //         new URL(
  //           "./educational-institution--saml--service-provider--encryption.crt",
  //           import.meta.url
  //         ),
  //         "utf-8"
  //       ),
  //     },
  //   },

  //   // Copy the configuration above to add other educational institutions...
  // },

  // [OPTIONAL] Other hostnames you’d like to redirect to this Courselore installation.
  // alternativeHostnames: ["www.your-domain.edu", "..."],

  // [OPTIONAL, BUT RECOMMENDED] See https://hstspreload.org/.
  // hstsPreload: true,

  // [OPTIONAL] Extra Caddy configuration to add to Courselore’s Caddy configuration. See https://caddyserver.com.
  // caddy: ``,
};
