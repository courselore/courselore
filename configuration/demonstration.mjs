export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const path = await courseloreImport("node:path");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    baseURL: process.env.BASE_URL ?? `https://localhost`,
    administratorEmail: "demonstration@courselore.org",
    dataDirectory: path.join(process.cwd(), "data"),
  });
};
