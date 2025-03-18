export default {
  hostname: "example.com",
  systemAdministratorEmail: "administrator@example.com",
  // Nodemailer email configuration: https://nodemailer.com/
  email: {
    host: "smtp.ethereal.email",
    auth: {
      user: "maddison53@ethereal.email",
      pass: "jn7jnAPss4f63QBp6D",
    },
    from: "Courselore <courselore@example.com>",
  },
  // The following is the default `dataDirectory`, but you may change it if necessary.
  // dataDirectory: "/root/courselore/data/",
  // Enable the following if you can. See https://hstspreload.org/.
  // hstsPreload: true,
  // Add some extra Caddyfile directives, for example, to redirect `www.example.com` to `example.com`.
  // extraCaddyfile: `
  //   www.example.com {
  //     redir https://example.com{uri}
  //   }
  // `,
};
