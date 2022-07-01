export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    baseURL: process.env.BASE_URL ?? `https://localhost`,
    administratorEmail: "development@courselore.org",
  });
};
