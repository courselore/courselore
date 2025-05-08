export default {
  hostname: "example.com",

  systemAdministratorEmail: "administrator@example.com",

  // Nodemailer email configuration: https://nodemailer.com/
  email: {
    host: "smtp.ethereal.email",
    auth: {
      user: "maddison53@ethereal.email",
      pass: "jn7jnAPss4f63QBp6D",
    },
    from: "Courselore <courselore@example.com>",
  },

  // saml: {
  //   // The metadata for the SAML Service Provider is available at: https://example.com/authentication/saml/example-university/metadata
  //   "example-university": {
  //     name: "Example University",
  //     // The domains over which the identity provider has authority. It includes subdomains, for example, `computer-science.example-university.edu`.
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
  //       // More Node SAML configurations: https://github.com/node-saml/node-saml
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
  // },

  // The following is the default `dataDirectory`, but you may change it if necessary.
  // dataDirectory: "/root/courselore/data/",

  // Enable the following if you can. See https://hstspreload.org/.
  // hstsPreload: true,

  // Add some extra Caddyfile directives, for example, to redirect `www.example.com` to `example.com`.
  // extraCaddyfile: `
  //   www.example.com {
  //     redir https://example.com{uri}
  //   }
  // `,
};
