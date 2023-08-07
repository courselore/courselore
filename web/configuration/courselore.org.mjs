import url from "node:url";
import fs from "node:fs/promises";

const secrets = JSON.parse(
  await fs.readFile(new URL("./secrets.json", import.meta.url), "utf8"),
);

export default {
  hostname: "courselore.org",
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
  email: {
    options: {
      host: "email-smtp.us-east-1.amazonaws.com",
      auth: {
        user: secrets.smtp.username,
        pass: secrets.smtp.password,
      },
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "administrator@courselore.org",
      },
    },
  },
  administratorEmail: "administrator@courselore.org",
  staticPaths: [url.fileURLToPath(new URL("./static/", import.meta.url))],
  saml: {
    "johns-hopkins-university": {
      name: "Johns Hopkins University",
      logo: {
        light: "johns-hopkins-university--light--2023-03-28.webp",
        dark: "johns-hopkins-university--dark--2023-03-28.webp",
        width: 300,
      },
      domains: ["jhu.edu", "jh.edu", "jhmi.edu"],
      attributes: (samlResponse) => ({
        email: samlResponse?.profile?.attributes?.Email,
        name: `${samlResponse?.profile?.attributes?.FirstName ?? ""} ${
          samlResponse?.profile?.attributes?.LastName ?? ""
        }`,
      }),
      options: {
        idpIssuer: "https://idp.jh.edu/idp/shibboleth",
        entryPoint: "https://idp.jh.edu/idp/profile/SAML2/Redirect/SSO",
        logoutUrl: "https://login.johnshopkins.edu/cgi-bin/logoff.pl",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        signMetadata: true,
        cert: await fs.readFile(
          new URL(
            "./keys/johns-hopkins-university--saml--identity-provider--signing.crt",
            import.meta.url,
          ),
          "utf-8",
        ),
        privateKey: await fs.readFile(
          new URL(
            "./keys/johns-hopkins-university--saml--service-provider--signing.key",
            import.meta.url,
          ),
          "utf-8",
        ),
        signingCert: await fs.readFile(
          new URL(
            "./keys/johns-hopkins-university--saml--service-provider--signing.crt",
            import.meta.url,
          ),
          "utf-8",
        ),
        decryptionPvk: await fs.readFile(
          new URL(
            "./keys/johns-hopkins-university--saml--service-provider--encryption.key",
            import.meta.url,
          ),
          "utf-8",
        ),
        decryptionCert: await fs.readFile(
          new URL(
            "./keys/johns-hopkins-university--saml--service-provider--encryption.crt",
            import.meta.url,
          ),
          "utf-8",
        ),
      },
    },
  },
  alternativeHostnames: [
    "www.courselore.org",
    "courselore.com",
    "www.courselore.com",
  ],
  hstsPreload: true,
  caddy: `
    http://meta.courselore.org, http://meta.courselore.com {
      import common
      redir https://{host}{uri} 308
      handle_errors {
        import common
      }
    }

    https://meta.courselore.org, https://meta.courselore.com {
      import common
      redir https://courselore.org/courses/8537410611/invitations/3667859788?{query} 307
      handle_errors {
        import common
      }
    }
  `,
};
