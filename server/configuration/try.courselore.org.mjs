export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const url = await courseloreImport("node:url");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    host: "try.courselore.org",
    administratorEmail: "try@courselore.org",
    dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
    sendMail: {
      options: { jsonTransport: true },
      defaults: {
        from: {
          name: "Courselore",
          address: "try@courselore.org",
        },
      },
    },
    demonstration: true,
  });
};
