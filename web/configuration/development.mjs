export default {
  hostname: process.env.HOSTNAME ?? "localhost",
  email: {
    host: "127.0.0.1",
    port: 8025,
    from: "Courselore <courselore@courselore.org>",
  },
  environment: "development",
};
