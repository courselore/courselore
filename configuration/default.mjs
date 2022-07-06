export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const path = await courseloreImport("node:path");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    host: process.env.HOST ?? "localhost",
    administratorEmail: "demonstration@courselore.org",
    dataDirectory: path.join(process.cwd(), "data"),
    sendMail: {
      options: { jsonTransport: true },
      defaults: {
        from: {
          name: "Courselore",
          address: "demonstration@courselore.org",
        },
      },
    },
    production: false,
  });
};
