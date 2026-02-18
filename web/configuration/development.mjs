export default {
  hostname: process.env.HOSTNAME ?? "localhost",
  email: {
    host: "127.0.0.1",
    port: 9025,
    from: "courselore@courselore.org",
  },
  lti: {
    "courselore-university": {
      name: "Courselore University",
      platformID: "http://localhost:8000",
      clientID: "aiWmCn3wBNshswh",
      deploymentID: "1",
      publicKeysetURL: "http://localhost:8000/mod/lti/certs.php",
      authenticationRequestURL: "http://localhost:8000/mod/lti/auth.php",
      accessTokenURL: "http://localhost:8000/mod/lti/token.php",
    },
  },
  saml: {
    "courselore-university": {
      name: "Courselore University",
      domains: ["courselore-university.edu"],
      attributes: (profile) => ({
        email: profile.nameID,
        name: profile.attributes.name,
      }),
      options: {
        idpIssuer: "http://localhost:9001/metadata",
        entryPoint: "http://localhost:9001/saml/sso",
        logoutUrl: "http://localhost:9001/saml/slo",
        signatureAlgorithm: "sha256",
        digestAlgorithm: "sha256",
        idpCert:
          "MIIDszCCApugAwIBAgIUS4sMKiiF2HjEmP3s/EssoOiCIK4wDQYJKoZIhvcNAQELBQAwaTELMAkGA1UEBhMCVVMxETAPBgNVBAgMCE1hcnlsYW5kMRIwEAYDVQQHDAlCYWx0aW1vcmUxEzARBgNVBAoMCkNvdXJzZWxvcmUxHjAcBgNVBAMMFUNvdXJzZWxvcmUgVW5pdmVyc2l0eTAeFw0yNTA1MDQxMzIyNDFaFw00NTA0MjkxMzIyNDFaMGkxCzAJBgNVBAYTAlVTMREwDwYDVQQIDAhNYXJ5bGFuZDESMBAGA1UEBwwJQmFsdGltb3JlMRMwEQYDVQQKDApDb3Vyc2Vsb3JlMR4wHAYDVQQDDBVDb3Vyc2Vsb3JlIFVuaXZlcnNpdHkwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCFsigXmwgkPTV3MlHQtWsrEazgPvxb5AjpIPX03unnES/vRRuupqxPQznCAg8h59wR5CyPOEtnvtJVv667bpKJRpmk+BsujKWDySYvCduNw2299GRTfwqDTGDF4VzGEopSIuLQ5RQgQdAtYT0n8baDPNUH/QsEX3ftdt828TfOxnLj4gTgDjDX3PWajjVq0P1nJl8qTrIQ1xDfjGk/d1UaJB+Ida6sFPcQVqcfSkr79Ew/olnEONYHYLOp22uiS+POCYx5C9kthWY/FZPdHy9oZrMRfuOm7M4axRRzWmadkP7IWADvXR5/4yOnsunpFq2PxnwEHhgG1eniTanF8XQLAgMBAAGjUzBRMB0GA1UdDgQWBBQ+tVWZv9HohUTyC26N1QTaC72tJTAfBgNVHSMEGDAWgBQ+tVWZv9HohUTyC26N1QTaC72tJTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQAvoQOMMY4K0DqNBgFDobrrtBeyH6uEV4HyGN/aY/Ocojbplncw/o1aktkfKaWKgrkiM5RFqK3Kl4sFWixuVE3ruO72y6ksUeb+hAEJLV4utoXbYAVtQDZ44aymGLdj7Xtn7kcNcsWKU5D123Iq2F3kTHMPZrRCfT4hLujMsCUC6Wv1Wpo5XIK71Bjr932qvvi5YlEA58pG5Fmm2hRqq9onTxGppmHYnGp29RG+Yfwdsr2g9KRJR9hTO1+IIe+/zGIL/IpjGYS4c1GZgJjICMfYdoIhn9EpyNkTo+9sW3wsU4ual/neslAxZPEarX7JoMjbDA7E85m08KWcRm2/93Sa",
      },
    },
  },
  environment: "development",
};
