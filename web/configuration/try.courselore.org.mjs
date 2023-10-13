import url from "node:url";

export default {
  hostname: "try.courselore.org",
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
  email: {
    options: {
      host: "localhost",
      port: 8002,
    },
    defaults: {
      from: {
        name: "Courselore",
        address: "try@courselore.org",
      },
    },
  },
  administratorEmail: "try@courselore.org",
  demonstration: true,
  alternativeHostnames: ["try.courselore.com"],
  caddy: `
    https://leafac.courselore.org {
      reverse_proxy http://localhost:3000
    }

    http://leafac.courselore.org {
      redir https://{host}{uri} 308
    }
  `,
};
