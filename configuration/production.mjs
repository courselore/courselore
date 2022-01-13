export default async (courselore, courseloreImport) => {
  const baseURL = "https://courselore.org";
  const administratorEmail = "administrator@courselore.org";
  if (process.argv[3] === undefined) {
    const url = await courseloreImport("node:url");
    const execa = (await courseloreImport("execa")).execa;
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
            email ${administratorEmail}
          }

          ${baseURL} {
            reverse_proxy 127.0.0.1:4001
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
    const url = await courseloreImport("node:url");
    const fs = (await courseloreImport("fs-extra")).default;
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const secrets = JSON.parse(
      await fs.readFile(
        url.fileURLToPath(new URL("./secrets.json", import.meta.url)),
        "utf8"
      )
    );
    const app = await courselore({
      dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
      baseURL,
      administratorEmail,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            host: secrets.smtp.host,
            auth: {
              user: secrets.smtp.username,
              pass: secrets.smtp.password,
            },
          },
          { from: `"CourseLore" <${administratorEmail}>` }
        );
        return async (mailOptions) => await transporter.sendMail(mailOptions);
      })(),
      demonstration: true,
    });
    app.listen(4001, "127.0.0.1", () => {
      console.log(`CourseLore/${app.locals.version} started at ${baseURL}`);
    });
  }
};
