import os from "node:os";

export default {
  hostname: process.env.TUNNEL ?? os.hostname(),
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
