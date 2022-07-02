export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const url = await courseloreImport("node:url");
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    baseURL: "https://YOUR-DOMAIN.EDU",
    administratorEmail: "ADMINISTRATOR@YOUR-DOMAIN.EDU",
    dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
    sendMail: [
      {
        host: "SMTP.YOUR-DOMAIN.EDU",
        auth: {
          user: "SMTP USERNAME",
          pass: "SMTP PASSWORD",
        },
      },
      { from: `"Courselore" <FROM@YOUR-DOMAIN.EDU>` },
    ],
    // alternativeHosts: ["WWW.YOUR-DOMAIN.EDU", "..."],
    // hstsPreload: true, // Recommended, see https://hstspreload.org/ to learn more
  });
};
