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
      domains: ["example.com"],
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
      domains: ["example.com"],
      attributes: (profile) => ({
        email: profile.attributes.email,
        name: profile.attributes.firstName,
      }),
      options: {
        idpIssuer: "https://saml.example.com/entityid",
        entryPoint: "https://mocksaml.com/api/saml/sso",
        idpCert:
          "MIIC4jCCAcoCCQC33wnybT5QZDANBgkqhkiG9w0BAQsFADAyMQswCQYDVQQGEwJVSzEPMA0GA1UECgwGQm94eUhRMRIwEAYDVQQDDAlNb2NrIFNBTUwwIBcNMjIwMjI4MjE0NjM4WhgPMzAyMTA3MDEyMTQ2MzhaMDIxCzAJBgNVBAYTAlVLMQ8wDQYDVQQKDAZCb3h5SFExEjAQBgNVBAMMCU1vY2sgU0FNTDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALGfYettMsct1T6tVUwTudNJH5Pnb9GGnkXi9Zw/e6x45DD0RuRONbFlJ2T4RjAE/uG+AjXxXQ8o2SZfb9+GgmCHuTJFNgHoZ1nFVXCmb/Hg8Hpd4vOAGXndixaReOiq3EH5XvpMjMkJ3+8+9VYMzMZOjkgQtAqO36eAFFfNKX7dTj3VpwLkvz6/KFCq8OAwY+AUi4eZm5J57D31GzjHwfjH9WTeX0MyndmnNB1qV75qQR3b2/W5sGHRv+9AarggJkF+ptUkXoLtVA51wcfYm6hILptpde5FQC8RWY1YrswBWAEZNfyrR4JeSweElNHg4NVOs4TwGjOPwWGqzTfgTlECAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAAYRlYflSXAWoZpFfwNiCQVE5d9zZ0DPzNdWhAybXcTyMf0z5mDf6FWBW5Gyoi9u3EMEDnzLcJNkwJAAc39Apa4I2/tml+Jy29dk8bTyX6m93ngmCgdLh5Za4khuU3AM3L63g7VexCuO7kwkjh/+LqdcIXsVGO6XDfu2QOs1Xpe9zIzLpwm/RNYeXUjbSj5ce/jekpAw7qyVVL4xOyh8AtUW1ek3wIw1MJvEgEPt0d16oshWJpoS1OT8Lr/22SvYEo3EmSGdTVGgk3x3s+A0qWAqTcyjr7Q4s/GKYRFfomGwz0TZ4Iw1ZN99Mm0eo2USlSRTVl7QHRTuiuSThHpLKQQ==",
      },
    },
  },
  environment: "development",
};
