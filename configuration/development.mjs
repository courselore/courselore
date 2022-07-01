export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
  });
};
