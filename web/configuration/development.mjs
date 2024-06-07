export default {
  hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
  hostname: process.env.HOSTNAME ?? "localhost",
  environment: "development",
  tunnel: typeof process.env.TUNNEL === "string",
};
