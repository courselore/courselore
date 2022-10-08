export default async ({ courseloreImport }) => {
  const path = await courseloreImport("node:path");
  (await courseloreImport("../../configuration/base.mjs")).default({
    courseloreImport,
    hostname: process.env.HOSTNAME ?? "localhost",
    administratorEmail: "feedback@courselore.org",
    dataDirectory: path.join(process.cwd(), "data"),
    sendMail: {
      options: { streamTransport: true, buffer: true },
      defaults: {
        from: {
          name: "Courselore",
          address: "feedback@courselore.org",
        },
      },
    },
    environment: "default",
    demonstration: true,
  });
};
