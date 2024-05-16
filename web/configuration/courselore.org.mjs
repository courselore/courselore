export default {
  hostname: "courselore.org",
  systemAdministratorEmail: "system-administrator@courselore.org",
  hstsPreload: true,
  extraCaddyfile: `
    www.courselore.org, courselore.com, www.courselore.com {
      redir https://courselore.org{uri} 
    }
  `,
};
