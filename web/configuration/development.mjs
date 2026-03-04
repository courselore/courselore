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
        email: profile.nameID,
        name: profile.attributes[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
        ],
      }),
      options: {
        idpIssuer: "saml-mock",
        entryPoint:
          "https://samlmock.dev/idp?aud=https://localhost/authentication/saml/courselore-university/metadata&acs_url=https://localhost/authentication/saml/courselore-university/assertion-consumer-service",
        logoutUrl:
          "https://samlmock.dev/idp_logout?callback_url=https://localhost/authentication/saml/courselore-university/single-logout-service",
        idpCert:
          "MIIFDzCCAvegAwIBAgIUSxfAZOb1Hawu31z6ZHSuX5fd8HMwDQYJKoZIhvcNAQELBQAwFzEVMBMGA1UEAwwMdGhhbWVlcmEuY29tMB4XDTI0MDYwODEwNTYxMFoXDTQ0MDYwODEwNTYxMFowFzEVMBMGA1UEAwwMdGhhbWVlcmEuY29tMIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAmM2P8rs6Y6qT7cC+PrZebFfBtetot3che0S6h5/iXpf12HrxXLoJViYRyck+A5eszyogPDHi5USx4BnNgz5pNEk36tPwtWX0LtSYw9+jXMPZEflUUjxc2Tx9ykIZohiVThUomvXywXWSnPd257lmcQx6cynaaG4zsGwIFp9NO1NOD9bzLhqTegZJWmX3BlFqntrDMYfzJYwnj2M68mYNZ37Nqtj6DpmTnzo6X0DcM4Qz5A11+hH312oqhrcFfHCbf/nrtzGBjZg7j82IETwgfkZcSFlYsFVXC+6/LxQ5dNDDec3GNlQQGZp2Na6ng1ODAJjs7fEcV/5oI8CRkMaMvM73lxj7Xcf4NArDqjtkU8Cn+w/A4D8hOZeXCjUFtw+OyT9RdwsF4t9lxvvvg9JwNiYHWIr+J4KZaTBgORB9pVOu3PcoHP5UgjYFAUcANru7mDB0t5lVoyovHbQc7t1wPBlwyj0X2ChZKDzA7oIG49ebz/h+fBhV5DG7iOX4J6bGBWWCf20v5Na3FCSDhzOH9jvois6EpoZTWLEWqmqdYbLmoWXeN4aARwvNWdM829WVdJUTeSZEmq6Qrqp6QjM/+JolhbJnKawyQYNA6HZy13UGBa3hzZ80jKSj/PJ3Bj2CWdKZ7hrzvb1tnHoHvGtzw66YTljOw/WQpjHri0OlPMkCAwEAAaNTMFEwHQYDVR0OBBYEFMb9UDHy7LeneeMEtibPZ+XOa6BdMB8GA1UdIwQYMBaAFMb9UDHy7LeneeMEtibPZ+XOa6BdMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggIBAD+OaKAoNoLOsWxMOgKV4VWMw/VXiiHnzu5VYVwzxoHd/AO1CTj4KqjJ/PWmv29VGRAADKELKi5ltZFg6jRvCx5YRltbUPXi0URnnlTZhRvNtJxTb6+lX4Y+W2l43ArmzIyr9Q/eahETIwwKCbsdwYOmZdJmvYwErjVWiqhXghB+WiW8FBwJHBn6MCytiNNM69D9q8jq6AnvvcvwiM1rQd/8r+kfAGkMAuWD7UbmSGdb2sD9eQeV/gyFyxu7XZRSSXoz5f4a/9hwi3UYynIj4ymUyQqtZ56sXJ0i+UvQgw8qPtaj47BsK4RdUW01LQQuenFg4T2Ylay+1TB+d6FOLS7jnGaDJ2f10jkD2sSNzYDmblefzGiVdPhmsQz68oDEY8lJJGxbm6/qnL905h5yrtncrXN5GLMZsVZn+v961mR7u/iZZBCVZt6R2srkpF5EMrtbv3RCkr+YjVk8FZJq6vcOmAS/RWamg2Wa/zd34KCF7HGtvE9WO3M4Gg8ZQBsimPLM2rv5C6jTAPvfWiG4dWBj9tTL1wY6+Bv2Qyk5gfwzql1Rc2MF66Ld+nhMC7jMV1GiGhPyyBIjoigoYxQG3IiFXpitsWoJHzJMFelfWBE0WVY20DE8V9fA1/fLvj2jtdSnTbgNE9hDMhBB2/XGGRHJadrPssOSMLzCPQ3FEUT5",
      },
    },
  },
  environment: "development",
};
