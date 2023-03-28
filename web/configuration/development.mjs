import url from "node:url";
import fs from "node:fs/promises";

export default {
  hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
  dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
  email: {
    options: {
      streamTransport: true,
      buffer: true,
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "development@courselore.org",
      },
    },
  },
  administratorEmail: "development@courselore.org",
  staticPaths: [
    url.fileURLToPath(new URL("./development--static/", import.meta.url)),
  ],
  saml: {
    development: {
      name: "Development SAML Identity Provider",
      logo: {
        light: "johns-hopkins-university--light--2023-03-28.webp",
        dark: "johns-hopkins-university--dark--2023-03-28.webp",
        width: 300,
      },
      domains: ["courselore.org"],
      identityProvider: {
        metadata: `
          <EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="urn:example:idp">
          <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
          <KeyDescriptor use="signing">
          <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
          <X509Data>
          <X509Certificate>MIICfjCCAWYCCQD3t5kVTY1+tTANBgkqhkiG9w0BAQsFADAAMCAXDTIzMDMyNTEwMTI1OFoYDzMwMjIwNzI2MTAxMjU4WjAAMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA58fyl7XaFFrWQlVBFivFzoQKyZA0JULpY1cTLG+peDdj2T4masQM+ajMTiSHg1lTwDTN9EMyAcekLDa5ZAd8i46Z+bK52S4eEel3mPrVXYHxnisrq2RPGytL2xD2JCDHfRg5FoVoyGbXt9A1TyX8971JdKL4+UG3oGjt00EA6SSnhNPO45kA/VZzJMaewY3ssSbwYcDrMGnVjZblJQ7856CA2z7l+WMbfxzECMrIEmzd7Ye/QJJchxRiaazV64IQEYAtE/FVoMhNWEHQJrcViIXMYYXl0ZmTWyFZ8SDqajM++WZGTVt+MSGarfoph9UWlam8Ttd1eUwWHhjimeVabQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQA95QL8Fpc2+5xsbSBi0hSVB4BYiAv540iYEyczHyf9im+H13EaaoCmnORmYRLoneQhMqw55KqjVVBb5qRLTJ2BMTrx4NWE/YnZ5vSgwef2QHtgy96AWOYAcRT6EMbf5FMmS43+HniTnW+HylkxvgqY9dlE0mP0sT6DCZTf0T7iX+XY6GEeC8gcpIx1zNUH+Y5exBCIb496tzJlBlpaZXEc9uIUOQdja5W++iRdTfCk5fvTxMAr4VwEmJH4lYplhexmokh2X2nP1pVGd4/hxGfbJIuBoH5qbfwKy6BoGOD5tdO4rr52RIK+mDij7vj1+G/D8cMCxKaMeduURCliJSeQ</X509Certificate>
          </X509Data>
          </KeyInfo>
          </KeyDescriptor>
          <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
          <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:persistent</NameIDFormat>
          <NameIDFormat>urn:oasis:names:tc:SAML:2.0:nameid-format:transient</NameIDFormat>
          <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="http://localhost:9000/saml/sso"/>
          <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:9000/saml/sso"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="firstName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="First Name"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="lastName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Last Name"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="displayName" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Display Name"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="E-Mail Address"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="mobilePhone" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Mobile Phone"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="Groups"/>
          <Attribute xmlns="urn:oasis:names:tc:SAML:2.0:assertion" Name="userType" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:uri" FriendlyName="User Type"/>
          </IDPSSODescriptor>
          </EntityDescriptor>
        `,
      },
      serviceProvider: {
        signingCert: await fs.readFile(
          url.fileURLToPath(
            new URL(
              "./development--saml--service-provider--signing.crt",
              import.meta.url
            )
          ),
          "utf-8"
        ),
        privateKey: await fs.readFile(
          url.fileURLToPath(
            new URL(
              "./development--saml--service-provider--signing.key",
              import.meta.url
            )
          ),
          "utf-8"
        ),
      },
    },
  },
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
