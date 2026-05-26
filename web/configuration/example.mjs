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

  // [Optional] LTI configuration
  lti: {
    // The following URLs become available:
    // - https://example.com/authentication/lti/example-university/keyset
    // - https://example.com/authentication/lti/example-university/initiate
    // - https://example.com/authentication/lti/example-university/callback
    "example-university": {
      name: "Example University",
      // The domains over which the LMS has authority. It includes subdomains, for example, `computer-science.example-university.edu`.
      domains: ["example-university.edu", "example-university.com"],
      // # Moodle
      //
      // As system administrator, go to **Site administration > Plugins > Activity modules > Manage tools > configure a tool manually**:
      //
      // - Tool settings
      //   - Tool name: Courselore
      //   - Tool url: https://example.com/authentication/lti/example-university/callback
      //   - LTI version: LTI 1.3
      //   - Public keyset: https://example.com/authentication/lti/example-university/keyset
      //   - Initiate login URL: https://example.com/authentication/lti/example-university/initiate
      //   - Redirection URI(s): https://example.com/authentication/lti/example-university/callback
      //   - Tool configuration usage: Show in activity chooser and as preconfigured tool
      //   - Default launcher container: New window
      // - Services
      //   - IMS LTI Names and Role Provisioning: Use this service to retrieve members' information as per privacy settings
      // - Privacy
      //   - Share launcher's name with tool: Always
      //   - Share launcher's email with tool: Always
      //   - Accept grades from the tool: Never
      //   - Force SSL: Checked
      //
      // The data that you must fill below is available at: **Site administration > Plugins > Activity modules > Manage tools > Courselore > 🔍**
      platformID: "https://example-lms.edu",
      clientID: "example-client-id",
      deploymentID: "example-deployment-id",
      publicKeysetURL: "https://example-lms.edu/public-keyset",
      authenticationRequestURL:
        "https://example-lms.edu/authentication-request",
      accessTokenURL: "https://example-lms.edu/access-token",
    },
  },

  // [Optional] SAML configuration
  // saml: {
  //   // The metadata for the SAML Service Provider is available at: https://example.com/authentication/saml/example-university/metadata
  //   "example-university": {
  //     name: "Example University",
  //     // The domains over which the Identity Provider has authority. It includes subdomains, for example, `computer-science.example-university.edu`.
  //     domains: ["example-university.edu", "example-university.com"],
  //     // The `userData` function receives as argument a `SAML.Profile` (https://github.com/node-saml/node-saml/blob/ff2d6756eff082609b203a115a87a1a21e33cfb8/src/types.ts#L234-L249) and must produce an `email` and `name`.
  //     userData: (profile) => ({
  //       email: profile.attributes.email,
  //       name: profile.attributes.name,
  //     }),
  //     options: {
  //       idpIssuer: "https://example-identity-provider.edu/metadata",
  //       entryPoint: "https://example-identity-provider.edu/saml/sso",
  //       idpCert: "MIIDszC...93Sa",
  //       // Node SAML configurations: https://github.com/node-saml/node-saml
  //       // May include `decryptionCert`.
  //       // Must not include:
  //       // - `issuer`
  //       // - `callbackUrl`
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
