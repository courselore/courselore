export default async (
  courselore,
  courseloreImport,
  courseloreImportMetaURL
) => {
  const baseURL = process.env.BASE_URL ?? `https://localhost:5000`;
  const email = "development@courselore.org";
  if (process.argv[3] === undefined) {
    const url = await courseloreImport("node:url");
    const execa = (await courseloreImport("execa")).default;
    const caddyfile = (await courseloreImport("dedent")).default;
    const subprocesses = [
      execa(
        process.argv[0],
        [process.argv[1], url.fileURLToPath(import.meta.url), "server"],
        {
          preferLocal: true,
          stdio: "inherit",
        }
      ),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "inherit",
        stderr: "inherit",
        input: caddyfile`
          {
            admin off
            local_certs
          }

          ${baseURL} {
            reverse_proxy 127.0.0.1:4000
            encode zstd gzip
          }
        `,
      }),
    ];
    for (const subprocess of subprocesses)
      subprocess.on("close", () => {
        for (const otherSubprocess of subprocesses)
          if (subprocess !== otherSubprocess) otherSubprocess.cancel();
      });
  } else {
    const path = await courseloreImport("node:path");
    const url = await courseloreImport("node:url");
    const fs = (await courseloreImport("fs-extra")).default;
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const { version } = JSON.parse(
      await fs.readFile(
        url.fileURLToPath(new URL("../package.json", courseloreImportMetaURL)),
        "utf8"
      )
    );
    const app = await courselore({
      dataDirectory: path.join(process.cwd(), "data"),
      baseURL,
      administrator: `mailto:${email}`,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            jsonTransport: true,
          },
          { from: `"CourseLore" <${email}>` }
        );
        return async (mailOptions) => {
          console.log(await transporter.sendMail(mailOptions));
        };
      })(),
      liveReload: true,
    });
    app.listen(4000, "127.0.0.1", () => {
      console.log(`CourseLore/${version} started at ${baseURL}`);
    });
  }
};
