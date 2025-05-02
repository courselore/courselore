export default {
  hostname: process.env.HOSTNAME ?? "localhost",
  email: {
    host: "127.0.0.1",
    port: 8025,
    from: "Courselore <courselore@courselore.org>",
  },
  environment: "development",
  saml: {
    "courselore-university": {
      name: "Courselore University",
      logo: {
        light: "development/courselore-university--light--2025-05-02.webp",
        dark: "development/courselore-university--dark--2025-05-02.webp",
        width: 300,
      },
      domains: ["courselore-university.edu"],
      attributes: (samlResponse) => ({
        email: samlResponse?.profile?.nameID,
        name: samlResponse?.profile?.attributes?.name,
      }),
      options: {
        idpIssuer: "http://localhost:8001/metadata",
        entryPoint: "http://localhost:8001/saml/sso",
        logoutUrl: "http://localhost:8001/saml/slo",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        cert: "MIIDnTCCAoWgAwIBAgIUVVzoVuIWUj97C7YHVpF724JKA7YwDQYJKoZIhvcNAQELBQAwXTESMBAGA1UEAwwJMTI3LjAuMC4xMQswCQYDVQQGEwJVUzERMA8GA1UECAwITWFyeWxhbmQxEjAQBgNVBAcMCUJhbHRpbW9yZTETMBEGA1UECgwKQ291cnNlbG9yZTAgFw0yMzA5MjIxMzUzMDJaGA8zMDIzMDEyMzEzNTMwMlowXTESMBAGA1UEAwwJMTI3LjAuMC4xMQswCQYDVQQGEwJVUzERMA8GA1UECAwITWFyeWxhbmQxEjAQBgNVBAcMCUJhbHRpbW9yZTETMBEGA1UECgwKQ291cnNlbG9yZTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAOMYqpZePwUP0wDAs3L8HoVCh+lTGYBrufXC7LO/z1oyF6XQBMn4FSF2P9G7YaUdAgPl8xKCwF7n9EoT/m7b0TFa/vSDjgj8Tp7ryHLr0RaPlI1hhp/Xs0zbP5uJ+RKHOlTEY5OF6vjV6uk8eI9vPwbG1cckpTSa1zZRvyllxXvk0zDme/jP5dHk3H3tkNqPTs+9ySenO66MFy/Ikz+DhRvPwY3haYIamqMky44SmTuQC6NoVURt9so+jmkVXND+3mGOf50LEUTxqKZWygsaVFiaID/hNOcpgCt6rST7sZvF90A3L3IEe28RCnEJ/0I0J/5LXm1D8WQ7vMgsA7rC+wcCAwEAAaNTMFEwHQYDVR0OBBYEFI8cAMO9JrKWuityw8frMv1EktTHMB8GA1UdIwQYMBaAFI8cAMO9JrKWuityw8frMv1EktTHMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAK5ansmIwptQvruUWzjpvWiz83nwNj7yg3Rw6nWLMFfDytoAyj9wdw/hPWOfE6CFEUh64JjtR5p1+l056/v6YA19y4r5IE9qNoygLczqnv1Olr0ntgx+JoH8dha7TfXqY+RbSo+T4vvnCUNW8aaLebst2Q3CgtXnVQSa/1DsHt6hklwGQHxPDmUjcUeJNNdOkuWvcZMTEHT/dma2uLKIZQ3oJWf88pNQnvXiQFccQ/72iRHqFP8fCc45ndUKOM1io1XJJNRfofbA6gUNW8gHXiqry6iJ8KrG1SDf8ziFN2M5C3TgKf5SzAaowB9ftPnrZaH66EDHujnLLQw1IR4hPik=",
      },
    },
  },
};
