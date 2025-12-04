export default {
  hostname: "example.com",

  systemAdministratorEmail: "system-administrator@example.com",

  // Nodemailer email configuration: https://nodemailer.com/
  email: {
    host: "smtp.example.com",
    auth: {
      user: "courselore@example.com",
      pass: "example",
    },
    from: "courselore@example.com",
  },

  // [Optional] SAML configuration
  // saml: {
  //   // The metadata for the SAML Service Provider is available at: https://example.com/authentication/saml/example-university/metadata
  //   "example-university": {
  //     name: "Example University",
  //     // The domains over which the Identity Provider has authority. It includes subdomains, for example, `computer-science.example-university.edu`.
  //     domains: ["example-university.edu", "example-university.com"],
  //     // The `attributes` function receives as argument a `SAML.Profile` (https://github.com/node-saml/node-saml/blob/ff2d6756eff082609b203a115a87a1a21e33cfb8/src/types.ts#L234-L249) and must produce an `email` and `name`.
  //     attributes: (profile) => ({
  //       email: profile.nameID,
  //       name: profile.attributes.name,
  //     }),
  //     options: {
  //       idpIssuer: "http://example-identity-provider.edu/metadata",
  //       entryPoint: "http://example-identity-provider.edu/saml/sso",
  //       logoutUrl: "http://example-identity-provider.edu/saml/slo",
  //       signatureAlgorithm: "sha256",
  //       digestAlgorithm: "sha256",
  //       idpCert: "MIIDszC...93Sa",
  //       // Node SAML configurations: https://github.com/node-saml/node-saml
  //       // May include `decryptionCert`.
  //       // Must not include:
  //       // - `issuer`
  //       // - `callbackUrl`
  //       // - `logoutCallbackUrl`
  //       // - `privateKey`
  //       // - `publicCert`
  //       // - `signMetadata`
  //       // - `validateInResponseTo`
  //     },
  //   },
  //   // Another SAML Identity Provider…
  // },

  // [Optional] The directory in which Courselore stores the database and files.
  // dataDirectory: "/root/courselore/data/",

  // [Optional] Enable HSTS Preload if you can: https://hstspreload.org/
  // hstsPreload: true,

  // [Optional] Caddyfile configuration: https://caddyserver.com
  // extraCaddyfile: `
  //   www.example.com {
  //     redir https://example.com{uri}
  //   }
  // `,
};
