export default {
  hostname: process.env.HOSTNAME ?? "localhost",
  email: {
    host: "smtp.ethereal.email",
    auth: {
      user: "corine.rosenbaum14@ethereal.email",
      pass: "ndbDu86SBNVRMYsud2",
    },
    from: "courselore@courselore.org",
  },
  lti: {
    "courselore-university": {
      name: "Courselore University",
      platformID: "http://localhost:8000",
      clientID: "wkvNru6zzCgFbkb",
      deploymentID: "1",
      publicKeysetURL: "http://localhost:8000/mod/lti/certs.php",
      authenticationRequestURL: "http://localhost:8000/mod/lti/auth.php",
      accessTokenURL: "http://localhost:8000/mod/lti/token.php",
    },
  },
  saml: {
    "courselore-university": {
      name: "Courselore University",
      domains: ["courselore.org"],
      attributes: (profile) => ({
        email:
          profile.attributes[
            "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
          ],
        name: profile.attributes[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        ],
      }),
      options: {
        idpIssuer: "urn:dev-bh02bolq44z2wn4n.us.auth0.com",
        entryPoint:
          "https://dev-bh02bolq44z2wn4n.us.auth0.com/samlp/WJrFP9UEINSRSMg7Ch5vBqfGpzptzYfs",
        idpCert:
          "MIIDHTCCAgWgAwIBAgIJM9IrqJ0y3ZIIMA0GCSqGSIb3DQEBCwUAMCwxKjAoBgNVBAMTIWRldi1iaDAyYm9scTQ0ejJ3bjRuLnVzLmF1dGgwLmNvbTAeFw0yNjAzMDQxODAzMTBaFw0zOTExMTExODAzMTBaMCwxKjAoBgNVBAMTIWRldi1iaDAyYm9scTQ0ejJ3bjRuLnVzLmF1dGgwLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMzWWNTwHK/IMFH6vuPtmztq5U2TbjVg9qtO18FdTnxTXT0J8cDVzdiddzXfSpVV3/MaIRgdVwjbVTOFW6+Iki45iaZxJHp5smjtbTYrNYT+7pOQSMRGhdj6eoaZbwEfHgMgS0D/HlDZB/glcDpV7UI9C5XDkYdC8x1zoTZ192OE6rjlNUBxEacDtspGQyZGBpSsRtB+eSyaRz2YTPMbgvEkhw6sON8365BcHUoKOGKeCD3eDnMnE7kkzA39PKMXICsqstgxPOGQzzP536vlL6b1JRZ9BDgVoXbmIdgrdCenp1gUbbhWEPEFj52+5f9XwIVQdcsL7Wb7EStu6Pi40bMCAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUk7G3KLN5JyUEwndWlee+klQcFIIwDgYDVR0PAQH/BAQDAgKEMA0GCSqGSIb3DQEBCwUAA4IBAQC0N6IQDlmMGkKKvDCgXbwvQ1wQf+JLDNS8AhxjbsdyRT/+1n2ohLFdTfqirOhC8nmi1PnR+URnMRKjnlppR6ih62tOOH+7w8lnQaSy2njgYSn9B7j6J5dR/FVXwN94SpBNCNDJ5Apq+bXarSlKlgOVSFEsiO7vFtOyjU/r2PqAXevrpVpYU+F16bnnx42jXu4oE1rfDFEaqDE43zIY8fWHN0fl12mjGCjSf3tR4RX2AOe9ZeSz9o8rS/PfJQotfX+t6nNr898zcXooBQMwzjdyNKbK3/2UbCIr3EWc656sbmXW9zlaw3lqunER0jKGLQJY/59LRRY4RXJSl6zoNRFU",
      },
    },
  },
  environment: "development",
};
