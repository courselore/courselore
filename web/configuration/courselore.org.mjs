export default {
  hostname: "courselore.org",
  systemAdministratorEmail: "system-administrator@courselore.org",
  hstsPreload: true,
  extraCaddyfile: `
    www.courselore.org, courselore.com, www.courselore.com {
      redir https://courselore.org{uri} 
    }
    meta.courselore.org {
      redir https://courselore.org/courses/8537410611/invitations/3667859788?{query}
    }
  `,
};
