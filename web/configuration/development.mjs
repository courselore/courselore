export default async ({ courseloreImport }) => {
  const url = await courseloreImport("node:url");
  (await courseloreImport("../../configuration/base.mjs")).default({
    courseloreImport,
    hostname: process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
    administratorEmail: "development@courselore.org",
    dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
    sendMail: {
      options: { streamTransport: true, buffer: true },
      defaults: {
        from: {
          name: "Courselore",
          address: "development@courselore.org",
        },
      },
    },
    tunnel: typeof process.env.TUNNEL === "string",
    environment: "development",
    demonstration: true,
  });
};
