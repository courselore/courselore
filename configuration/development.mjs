export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const url = await courseloreImport("node:url");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    baseURL: process.env.BASE_URL ?? `https://localhost`,
    administratorEmail: "development@courselore.org",
    dataDirectory: url.fileURLToPath(new URL("../data/", import.meta.url)),
    sendMail: [{ jsonTransport: true }],
    production: false,
    liveReload: true,
  });
};
