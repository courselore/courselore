export default async (
  courselore,
  courseloreImport,
  courseloreImportMetaURL
) => {
  const baseURL = "https://courselore.org";
  const email = "administrator@courselore.org";
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
          env: { NODE_ENV: "production" },
        }
      ),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "inherit",
        stderr: "inherit",
        input: caddyfile`
          {
            admin off
            email ${email}
          }

          ${baseURL} {
            reverse_proxy 127.0.0.1:4000
            encode zstd gzip
          }
    
          www.courselore.org, courselore.com, www.courselore.com {
            redir https://courselore.org{uri}
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
    const secrets = JSON.parse(
      await fs.readFile(
        url.fileURLToPath(new URL("./secrets.json", import.meta.url)),
        "utf8"
      )
    );
    const app = await courselore({
      dataDirectory: path.join(
        url.fileURLToPath(new URL(".", import.meta.url)),
        "data"
      ),
      baseURL,
      administrator: `mailto:${email}`,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            host: secrets.smtp.host,
            auth: {
              user: secrets.smtp.username,
              pass: secrets.smtp.password,
            },
          },
          { from: `"CourseLore" <${email}>` }
        );
        return async (mailOptions) => await transporter.sendMail(mailOptions);
      })(),
      demonstration: true,
    });
    app.listen(4000, "127.0.0.1", () => {
      console.log(`CourseLore/${version} started at ${baseURL}`);
    });
  }
};
