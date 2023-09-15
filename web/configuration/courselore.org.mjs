import url from "node:url";
import fs from "node:fs/promises";

const secrets = JSON.parse(
  await fs.readFile(new URL("./secrets.json", import.meta.url), "utf-8"),
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
        wantAuthnResponseSigned: true,
        wantAssertionsSigned: false,
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        cert: "MIIDEzCCAfugAwIBAgIUVqzf3xyifnjnnqzND3q+fEDQmuswDQYJKoZIhvcNAQELBQAwFTETMBEGA1UEAwwKaWRwLmpoLmVkdTAeFw0xNzA5MDYxNzUxMTNaFw0zNzA5MDYxNzUxMTNaMBUxEzARBgNVBAMMCmlkcC5qaC5lZHUwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQDEwxMPHGZn5GtE4RGoPZq+dbOf8I/CFd13y0fMKMwuGUefy+qjXA6n8l4DwRQO9kuzRJ7tVka83ABA9rBl16SnZ+apgdtz0qgxq53XnUyrzarzVmKk1t6zr2KyHGvOAXscEXmdcZTf62eXA/FvsgcksBFGeQXUq4RoAkFjRoUkvSij/K4Q1qr0BK9hdPdQBfRPvZ3M+2gDjMJ7+lJaWXbNlb7LgP4XrjR0Tyya1xJ5RUHQikAw7+vv7HxN7FqreTiMV94oZTj4/YTgo3wrmUEc4YrlOlaUb1kpVXI+9mta8ra4orlJraJts3gbsBGzB/ZY/3PL2jwKCJFa/RX0GiKXAgMBAAGjWzBZMB0GA1UdDgQWBBRl2hIs3JKNfXnIcVpgqolCIs7ZAjA4BgNVHREEMTAvggppZHAuamguZWR1hiFodHRwczovL2lkcC5qaC5lZHUvaWRwL3NoaWJib2xldGgwDQYJKoZIhvcNAQELBQADggEBAEE31fB/87L2sWgozEyPrwgefdMgKGLfvHGAOo0qKntUjEnp2qEXAciQ0LkxRN5qCL2ZbpWRGVoYB+8VLxn+oREDpB/AmqKbiqJ0X/XrsdSbJl3Iea0BdVdyRAAsu1fqB7v8omZ7pcCcjxmommnlVhZJWrhuOzqaNtIU3DynOrwIbq+VDB1TSm1/h4RmcFfYPKY4ZcbnNFgXkz71lH6zaCBLPPlh4TocfOegld6C5C9lxYs5JpH7KbhM6EsZjrr5l+zyLBdq8cu/r1s9ttH8xpbsBt3HPYcmfGHXNJA8vD3GHWTgJF35Vi1r+h1K1VuDwDS4FIDczA4WRVdMm+ONaBw=",
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
    https://meta.courselore.org, https://meta.courselore.com {
      import common
      redir https://courselore.org/courses/8537410611/invitations/3667859788?{query} 307
      handle_errors {
        import common
      }
    }

    http://meta.courselore.org, http://meta.courselore.com {
      import common
      redir https://{host}{uri} 308
      handle_errors {
        import common
      }
    }
  `,
};
