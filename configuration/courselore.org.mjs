export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const url = await courseloreImport("node:url");
  const fs = (await courseloreImport("fs-extra")).default;
  const secrets = JSON.parse(
    await fs.readFile(
      url.fileURLToPath(new URL("./secrets.json", import.meta.url)),
      "utf8"
    )
  );
  (await courseloreImport("../configuration/base.mjs")).default({
    courseloreImport,
    courseloreImportMetaURL,
    host: "courselore.org",
    administratorEmail: "administrator@courselore.org",
    dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
    sendMail: {
      options: {
        host: "email-smtp.us-east-1.amazonaws.com",
        auth: {
          user: secrets.smtp.username,
          pass: secrets.smtp.password,
        },
      },
      defaults: {
        from: {
          name: "Courselore",
          address: "administrator@courselore.org",
        },
      },
    },
    alternativeHosts: [
      "www.courselore.org",
      "courselore.com",
      "www.courselore.com",
    ],
    hstsPreload: true,
  });
};
