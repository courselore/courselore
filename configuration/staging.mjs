export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const url = await courseloreImport("node:url");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    baseURL: "https://try.courselore.org",
    administratorEmail: "administrator@courselore.org",
    dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
    sendMail: [{ jsonTransport: true }],
    demonstration: true,
  });
};
