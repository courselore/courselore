import * as jose from "jose";

const session = "a7dd58e457ce47339ef86a41f14c1885";

// const response = await fetch(
//   `https://saltire.lti.app/platform/token/${session}`,
//   {
//     method: "POST",
//     body: new URLSearchParams({
//       grant_type: "client_credentials",
//       scope:
//         "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
//       client_assertion_type:
//         "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
//       client_assertion: await new jose.SignJWT()
//         .setProtectedHeader({ typ: "JWT", alg: "RS256" })
//         .setJti("TODO")
//         .setIssuer("saltire.lti.app")
//         .setAudience("https://saltire.lti.app/platform")
//         .setSubject("saltire.lti.app")
//         .setIssuedAt()
//         .setExpirationTime("1 hour")
//         .sign(
//           await jose.importPKCS8(
//             `-----BEGIN PRIVATE KEY-----
// MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCSbM6iVekBqUvR
// V6RJmqf4BgNzTjQq2Yph6E3KuO+3SA+ciUbWFR19Xziiw8WWnad9as6ENqVP1hkb
// S3oCLcM4iB59g/SIOSaarin32+33X5DdwCOPSat9gqXPVTZTlzYdECPjT122ooL0
// WWSGj+b04wrpj0K95FNmFd8aNTWUxwloWuLByLQVALMDYXlO6LleS+Da15cRr0Ib
// g/mC9vWi2ifbUp8NsGKlA96hkOvh/GxYOSVYwC7Y3+azfnywutMYUdsdR/mX3gj/
// ByEvRqVMjCZkE4sZ9KkC1CArPQ2NiICooICx8cOnh0YVCPwR5OBpGTIr6eh9Xh++
// P8DrtNuTAgMBAAECggEAHMkvRlLFYAI8WYd1UNMKuoPUIdL6BoKF5gGZaYU5+zo7
// d3a1alj0VzVlGPqL2bRcvRdGSk/D6BIbFXadIdiFTJPWCq7qX+18XWRn88ZU3hD3
// leC0HPNKt337wurppz1O8h++Lm3n6oPAYvFABgQ8T2BjQM9dO5+rlaIvHiPfyMOc
// QRP5pq8RBRmQbRjNOOsMgaM7/BK0tkHrnQfQh/tI4EGa339oJKW1OlS2uJe8H42D
// +VfcahROWUTeM98A0SraUJxJZTvVc4Ufq1la3J+VDpLIGnS+cX/6hftWgLm8FwVQ
// DcmIryEIK5n1n1ze8fq6/0BFiWlBFUaNAGvxNUKDQQKBgQDDSxQ/sIrFw2vQwY77
// teumtMa6/48YT2OJnQMg0VaREdB2l/CrJPp81RTuDwnH6tAz9KDPSoXdLdkwExok
// z5TXOiMa6gMqZJA3G3Z/HMEt3lvSq3JJ9eRY5iT0KYnyYmjPTMns3K6oyRbePw0N
// ac+Sx9j+wgVcDk++hs6OvfRMGwKBgQC/8Owi5TJVPWwUwKU4p9h8CXSp4k2lSW+v
// 7muYPavSGNEzWPSY/BEFrqw8hx0aH9VHwEUqs4dTOfGpf3bEwvQAkVrSSogTAiKZ
// h4I0HUgnwA4ExkiJ5gW96YrrjGJ/sZLLw3JOWxHXnhlF31AiLnKrxb70CTEJZzHw
// 2sBnU2416QKBgALCZtDXj75nmnhio8COu3uphj1SKxVu2bsyCr9F9fEqzUU/tFjW
// tutYn2kVsU+v061IQZVsOiP759u0CWSHwlSgL6rLr6vDq/37V1tIbrpVL/r0DTNa
// VBWletQwWhCgr1ZugVPlclpULQyK24Za/mHWjQxcdXLtiNbqVLTTnkYNAoGAVIeH
// lv6VIhEAzkrg+IiCwG1xoXd2dnpW44X+gHd4efhP+WsNnWo1HOmGFMn0ORMX3JeC
// XoHd8PstwFXQOmsZBj79XmtQbf6cujyBTO4wXsEn61Zfj8trb+2wLngO0OmlGnOi
// nXth6jFINAtawRLvkVJu/A4oOFnoFohf/6EwgjECgYAqsqfd7Vcfa/I8nkYNEDVJ
// mR19TMaDyKf3AHECbe/lE+GAamQQ8atoBXiCgQna0lHqM3dtMPUcnJnPeIznVcDW
// U71N9RTMX7dXWj2Ol6m7m1pM8df1G1eFTg2O9NBzca5UlwNBgY6MMsYaQDjDHPzn
// 3K0FV5lFMcvqpwzms6FrFg==
// -----END PRIVATE KEY-----
// `,
//             "RS256",
//           ),
//         ),
//     }),
//   },
// );

/*
{
  "access_token" : "69cf8dc156761",
  "token_type" : "bearer",
  "expires_in" : 3600,
  "scope" : "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly"
}
*/

const accessToken = "69cf8dc156761";

const response = await fetch(
  `https://saltire.lti.app/platform/membership/context/${session}`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.ims.lti-nrps.v2.membershipcontainer+json",
    },
  },
);

/*
{
  "id" : "https://saltire.lti.app/platform/membership/context/a7dd58e457ce47339ef86a41f14c1885",
  "context" : {
    "id" : "S3294476",
    "label" : "ST101",
    "title" : "Telecommunications 101"
  },
  "members" : [
    {
      "status" : "Active",
      "user_id" : "29123",
      "lis_person_sourcedid" : "sis:942a8dd9",
      "name" : "John Logie Baird",
      "family_name" : "Baird",
      "given_name" : "John",
      "email" : "jbaird@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "48502",
      "lis_person_sourcedid" : "sis:4a945be3",
      "name" : "Sean Connery",
      "family_name" : "Connery",
      "given_name" : "Sean",
      "email" : "sconnery@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "58873",
      "lis_person_sourcedid" : "sis:9djhdf84",
      "name" : "Sheena Easton",
      "family_name" : "Easton",
      "given_name" : "Sheena",
      "email" : "seaston@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "34885",
      "lis_person_sourcedid" : "sis:23skjh458sw",
      "name" : "Andy Murray",
      "family_name" : "Murray",
      "given_name" : "Andrew",
      "email" : "amurray@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
        "http://purl.imsglobal.org/vocab/lis/v2/membership/Instructor#TeachingAssistant"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "S495696",
      "lis_person_sourcedid" : "sis:596f05a3",
      "name" : "Robert Stevenson",
      "family_name" : "Stevenson",
      "given_name" : "Robert",
      "email" : "rstevenson@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "S693290",
      "lis_person_sourcedid" : "sis:445feb40",
      "name" : "Alexander Graham Bell",
      "family_name" : "Bell",
      "given_name" : "Alexander",
      "email" : "agbell@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "S4029466",
      "lis_person_sourcedid" : "sis:f59ab344",
      "name" : "Muriel Spark",
      "family_name" : "Spark",
      "given_name" : "Muriel",
      "email" : "mspark@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "S5938596",
      "lis_person_sourcedid" : "sis:de49a458",
      "name" : "Barbara Dickson",
      "family_name" : "Dickson",
      "given_name" : "Barbara",
      "email" : "bdickson@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "S92457221",
      "lis_person_sourcedid" : "sis:b23dc88",
      "name" : "Lewis Capaldi",
      "family_name" : "Capaldi",
      "given_name" : "Lewis",
      "email" : "lcapaldi@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "X23489",
      "lis_person_sourcedid" : "sis:942a8dd9",
      "name" : "Joanne K Rowling",
      "family_name" : "Rowling",
      "given_name" : "Joanne",
      "email" : "jkrowling@uni.ac.uk",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user001",
      "lis_person_sourcedid" : "sis:x001",
      "name" : "Student User1",
      "family_name" : "User1",
      "given_name" : "Student",
      "email" : "user001@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user002",
      "lis_person_sourcedid" : "sis:x002",
      "name" : "Student User2",
      "family_name" : "User2",
      "given_name" : "Student",
      "email" : "user002@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user003",
      "lis_person_sourcedid" : "sis:x003",
      "name" : "Student User3",
      "family_name" : "User3",
      "given_name" : "Student",
      "email" : "user003@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user004",
      "lis_person_sourcedid" : "sis:x004",
      "name" : "Student User4",
      "family_name" : "User4",
      "given_name" : "Student",
      "email" : "user004@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user005",
      "lis_person_sourcedid" : "sis:x005",
      "name" : "Student User5",
      "family_name" : "User5",
      "given_name" : "Student",
      "email" : "user005@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user006",
      "lis_person_sourcedid" : "sis:x006",
      "name" : "Student User6",
      "family_name" : "User6",
      "given_name" : "Student",
      "email" : "user006@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user007",
      "lis_person_sourcedid" : "sis:x007",
      "name" : "Student User7",
      "family_name" : "User7",
      "given_name" : "Student",
      "email" : "user007@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user008",
      "lis_person_sourcedid" : "sis:x008",
      "name" : "Student User8",
      "family_name" : "User8",
      "given_name" : "Student",
      "email" : "user008@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user009",
      "lis_person_sourcedid" : "sis:x009",
      "name" : "Student User9",
      "family_name" : "User9",
      "given_name" : "Student",
      "email" : "user009@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    },
    {
      "status" : "Active",
      "user_id" : "user010",
      "lis_person_sourcedid" : "sis:x010",
      "name" : "Student User10",
      "family_name" : "User10",
      "given_name" : "Student",
      "email" : "user010@uni.ac.uk",
      "picture" : "https://saltire.lti.app/images/lti.gif",
      "roles" : [
        "http://purl.imsglobal.org/vocab/lis/v2/membership#Learner"
      ]
    }
  ]
}
*/

console.log(response.status);
console.log(response.headers);
console.log(await response.text());
