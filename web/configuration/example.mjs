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
  // lti: {
  //   // The following URLs become available:
  //   // - https://example.com/authentication/lti/example-university/keyset
  //   // - https://example.com/authentication/lti/example-university/initiate
  //   // - https://example.com/authentication/lti/example-university/callback
  //   "example-university": {
  //     name: "Example University",
  //     // The domains over which the LMS has authority. It includes subdomains, for example, `computer-science.example-university.edu`.
  //     domains: ["example-university.edu", "example-university.com"],
  //     // The following are instructions on how to set up LTI with different LMSs:
  //     //
  //     // **Moodle**
  //     //
  //     // As a system administrator, go to **Site administration > Plugins > Activity modules > External tool > Manage tools > configure a tool manually** (fields that aren’t listed should be left at their defaults):
  //     //
  //     // - Tool settings
  //     //   - Tool name: Courselore
  //     //   - Tool url: https://example.com/authentication/lti/example-university/callback
  //     //   - LTI version: LTI 1.3
  //     //   - Public keyset: https://example.com/authentication/lti/example-university/keyset
  //     //   - Initiate login URL: https://example.com/authentication/lti/example-university/initiate
  //     //   - Redirection URI(s): https://example.com/authentication/lti/example-university/callback
  //     //   - Tool configuration usage: Show in activity chooser and as preconfigured tool
  //     //   - Default launcher container: New window
  //     // - Services
  //     //   - IMS LTI Names and Role Provisioning: Use this service to retrieve members' information as per privacy settings
  //     // - Privacy
  //     //   - Share launcher's name with tool: Always
  //     //   - Share launcher's email with tool: Always
  //     //   - Accept grades from the tool: Never
  //     //   - Force SSL: Checked
  //     //
  //     // The data that you must fill below is available at: **Site administration > Plugins > Activity modules > External tool > Manage tools > Courselore > 🔍**
  //     //
  //     // As an instructor, create a course in both Moodle and Courselore.
  //     //
  //     // In Moodle, go to the course, enable **Edit mode**, click on the **+** to add content, choose **Activity or resource**, and choose **Courselore**.
  //     //
  //     // Create the Activity, and click on it to open Courselore. Select the Courselore course to connect with the Moodle course.
  //     //
  //     // Click on **Course settings > Course participants > Sync with Learning Management System (LMS)**.
  //     //
  //     // **Canvas**
  //     //
  //     // As a system administrator, go to **Admin > [Your account] > Apps > Manage > Install a New App**:
  //     //
  //     // - Install Method: JSON
  //     // - JSON Code (change the URLs in the snippet below):
  //     //
  //     // ```json
  //     // {
  //     //   "title": "Courselore",
  //     //   "description": "",
  //     //   "custom_fields": {},
  //     //   "target_link_uri": "https://example.com/authentication/lti/example-university/callback",
  //     //   "oidc_initiation_url": "https://example.com/authentication/lti/example-university/initiate",
  //     //   "oidc_initiation_urls": {},
  //     //   "public_jwk": null,
  //     //   "public_jwk_url": "https://example.com/authentication/lti/example-university/keyset",
  //     //   "scopes": [
  //     //     "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
  //     //   ],
  //     //   "extensions": [
  //     //     {
  //     //       "tool_id": null,
  //     //       "domain": "example.com",
  //     //       "privacy_level": "public",
  //     //       "platform": "canvas.instructure.com",
  //     //       "settings": {
  //     //         "placements": [
  //     //           {
  //     //             "message_type": "LtiResourceLinkRequest",
  //     //             "windowTarget": "_blank",
  //     //             "default": "enabled",
  //     //             "placement": "course_navigation"
  //     //           }
  //     //         ],
  //     //         "target_link_uri": "https://example.com/authentication/lti/example-university/callback",
  //     //         "message_settings": []
  //     //       }
  //     //     }
  //     //   ]
  //     // }
  //     // ```
  //     //
  //     // Click on **Next** several times and **Install App** at the end.
  //     //
  //     // Click on **Copy Client ID**. This needs to be provided to instructors.
  //     //
  //     // The data that you must fill below looks like the following (change the domain in the URLs and the Client ID which was provided by Canvas):
  //     //
  //     // ```json
  //     // platformID: "https://example-canvas.com/login/oauth2/token",
  //     // clientID: "10000000000005",
  //     // publicKeysetURL: "https://example-canvas.com/api/lti/security/jwks",
  //     // authenticationRequestURL: "https://example-canvas.com/api/lti/authorize_redirect",
  //     // accessTokenURL: "https://example-canvas.com/login/oauth2/token",
  //     // ```
  //     // As an instructor, create a course in both Canvas and Courselore.
  //     //
  //     // In Canvas, go to the course, **Settings > Apps > + App**:
  //     //
  //     // - Configuration Type: By Client ID
  //     // - Client ID: The Client ID that was provided by the system administrator.
  //     //
  //     // Refresh the page and click on Courselore on the course sidebar to open Courselore. Select the Courselore course to connect with the Canvas course.
  //     //
  //     // Click on **Course settings > Course participants > Sync with Learning Management System (LMS)**.
  //     platformID: "https://example-lms.edu",
  //     clientID: "example-client-id",
  //     publicKeysetURL: "https://example-lms.edu/public-keyset",
  //     authenticationRequestURL:
  //       "https://example-lms.edu/authentication-request",
  //     accessTokenURL: "https://example-lms.edu/access-token",
  //   },
  //   // Another LTI configuration...
  // },

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
  //   // Another SAML configuration...
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
