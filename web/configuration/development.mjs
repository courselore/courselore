import os from "node:os";

export default {
  hostname: process.env.TUNNEL ?? os.hostname(),
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
  extraCaddyfile: `
    ${os.hostname()}:8000 {
      reverse_proxy localhost:9000
    }
  `,
};
