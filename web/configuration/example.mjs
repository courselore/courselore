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
  //     //
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
  //     //
  //     // **Sakai**
  //     //
  //     // As a system administrator, go to **[Icon of 3x3 grid of squares on top right] > Other > Administration Workspace > External Tools > Install LTI Tool** (fields that aren’t listed should be left at their defaults):
  //     //
  //     // - Tool title: Courselore
  //     // - Launch URL (1.1) / Target Link URI (1.3): https://example.com/authentication/lti/example-university/callback
  //     // - Launch in Popup: Always launch in Popup
  //     // - The launch URL for this tool must support at least one launch message type. Most tools support one or the other, but some tools do support both messages at one URL.
  //     //   - The tool URL supports a single LTI tool (Resource Link launch): Checked
  //     // - Indicate where in the Sakai User interface that these tools should appear
  //     //   - Allow the tool to be selected from Lessons: Checked
  //     // - Privacy Settings:
  //     //   - Send User Names to External Tool: Checked
  //     //   - Send Email Addresses to External Tool: Checked
  //     // - Services:
  //     //   - Provide Roster to External Tool: Checked
  //     // - Sakai supports either LTI 1.1 or 1.3. If both are selected and correctly configured, LTI 1.3 will be preferred and Sakai will include the LTI 1.1 transition data in LTI 1.3 launches.
  //     //   - Tool supports LTI 1.3: Checked
  //     // - LTI 1.3 Tool Keyset / JWK URL (provided by the tool): https://example.com/authentication/lti/example-university/keyset
  //     // - LTI 1.3 Tool OpenID Connect/Initialization Endpoint (provided by the tool): https://example.com/authentication/lti/example-university/initiate
  //     // - LTI 1.3 Tool Redirect Endpoint(s) (comma separated and provided by the tool): https://example.com/authentication/lti/example-university/callback
  //     //
  //     // The data that you must fill below is available right below where it says “These values can be provided to an LTI 1.3 tool using dynamic registration or by providing these values to the tool manually. These values are generated by Sakai and are readonly.”
  //     //
  //     // As an instructor, create a course in both Sakai (what Sakai calls a “site”) and Courselore.
  //     //
  //     // In Sakai, go to the course, **Lessons > Add Content + > Simple Content Items > Add Learning App > Courselore**
  //     //
  //     // Create the Content, and click on it to open Courselore. Select the Courselore course to connect with the Sakai course.
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
};
