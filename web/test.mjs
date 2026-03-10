import * as jose from "jose";

const session = "s0216f7980a7111a54f1152749814c4aa";

const response = await fetch(
  `https://saltire.lti.app/platform/token/${session}`,
  {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope:
        "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: await new jose.SignJWT()
        .setProtectedHeader({ typ: "JWT", alg: "RS256" })
        .setJti("TODOJTI")
        .setIssuedAt()
        .setExpirationTime("2h")
        .setSubject("courselore")
        .setIssuer("courselore")
        .setAudience("https://saltire.lti.app/platform")
        .sign(
          await jose.importPKCS8(
            `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCSbM6iVekBqUvR
V6RJmqf4BgNzTjQq2Yph6E3KuO+3SA+ciUbWFR19Xziiw8WWnad9as6ENqVP1hkb
S3oCLcM4iB59g/SIOSaarin32+33X5DdwCOPSat9gqXPVTZTlzYdECPjT122ooL0
WWSGj+b04wrpj0K95FNmFd8aNTWUxwloWuLByLQVALMDYXlO6LleS+Da15cRr0Ib
g/mC9vWi2ifbUp8NsGKlA96hkOvh/GxYOSVYwC7Y3+azfnywutMYUdsdR/mX3gj/
ByEvRqVMjCZkE4sZ9KkC1CArPQ2NiICooICx8cOnh0YVCPwR5OBpGTIr6eh9Xh++
P8DrtNuTAgMBAAECggEAHMkvRlLFYAI8WYd1UNMKuoPUIdL6BoKF5gGZaYU5+zo7
d3a1alj0VzVlGPqL2bRcvRdGSk/D6BIbFXadIdiFTJPWCq7qX+18XWRn88ZU3hD3
leC0HPNKt337wurppz1O8h++Lm3n6oPAYvFABgQ8T2BjQM9dO5+rlaIvHiPfyMOc
QRP5pq8RBRmQbRjNOOsMgaM7/BK0tkHrnQfQh/tI4EGa339oJKW1OlS2uJe8H42D
+VfcahROWUTeM98A0SraUJxJZTvVc4Ufq1la3J+VDpLIGnS+cX/6hftWgLm8FwVQ
DcmIryEIK5n1n1ze8fq6/0BFiWlBFUaNAGvxNUKDQQKBgQDDSxQ/sIrFw2vQwY77
teumtMa6/48YT2OJnQMg0VaREdB2l/CrJPp81RTuDwnH6tAz9KDPSoXdLdkwExok
z5TXOiMa6gMqZJA3G3Z/HMEt3lvSq3JJ9eRY5iT0KYnyYmjPTMns3K6oyRbePw0N
ac+Sx9j+wgVcDk++hs6OvfRMGwKBgQC/8Owi5TJVPWwUwKU4p9h8CXSp4k2lSW+v
7muYPavSGNEzWPSY/BEFrqw8hx0aH9VHwEUqs4dTOfGpf3bEwvQAkVrSSogTAiKZ
h4I0HUgnwA4ExkiJ5gW96YrrjGJ/sZLLw3JOWxHXnhlF31AiLnKrxb70CTEJZzHw
2sBnU2416QKBgALCZtDXj75nmnhio8COu3uphj1SKxVu2bsyCr9F9fEqzUU/tFjW
tutYn2kVsU+v061IQZVsOiP759u0CWSHwlSgL6rLr6vDq/37V1tIbrpVL/r0DTNa
VBWletQwWhCgr1ZugVPlclpULQyK24Za/mHWjQxcdXLtiNbqVLTTnkYNAoGAVIeH
lv6VIhEAzkrg+IiCwG1xoXd2dnpW44X+gHd4efhP+WsNnWo1HOmGFMn0ORMX3JeC
XoHd8PstwFXQOmsZBj79XmtQbf6cujyBTO4wXsEn61Zfj8trb+2wLngO0OmlGnOi
nXth6jFINAtawRLvkVJu/A4oOFnoFohf/6EwgjECgYAqsqfd7Vcfa/I8nkYNEDVJ
mR19TMaDyKf3AHECbe/lE+GAamQQ8atoBXiCgQna0lHqM3dtMPUcnJnPeIznVcDW
U71N9RTMX7dXWj2Ol6m7m1pM8df1G1eFTg2O9NBzca5UlwNBgY6MMsYaQDjDHPzn
3K0FV5lFMcvqpwzms6FrFg==
-----END PRIVATE KEY-----
`,
            "RS256",
          ),
        ),
    }),
  },
);

// const accessToken = "69aeeccfda251";

// const response = await fetch(
//   `https://saltire.lti.app/platform/membership/context/${session}`,
//   {
//     headers: {
//       Authorization: `Bearer ${accessToken}`,
//       Accept: "application/vnd.ims.lti-nrps.v2.membershipcontainer+json",
//     },
//   },
// );

console.log(response.status);
console.log(response.headers);
const responseBody = await response.text();
console.log(responseBody);
