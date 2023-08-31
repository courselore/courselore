import url from "node:url";

export default {
  hostname: "try.courselore.org",
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
  email: {
    options: {
      host: "127.0.0.1",
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
    http://leafac.courselore.org {
      redir https://{host}{uri} 308
    }

    https://leafac.courselore.org {
      reverse_proxy http://127.0.0.1:3000
    }
  `,
};
