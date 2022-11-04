import url from "node:url";

export default {
  hostname: "try.courselore.org",
  dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
  email: {
    options: { streamTransport: true, buffer: true },
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
      reverse_proxy 127.0.0.1:4001
    }
  `,
};
