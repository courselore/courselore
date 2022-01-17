export default async ({ courselore, courseloreVersion, courseloreImport }) => {
  const baseURL = process.env.BASE_URL ?? `https://localhost:4000`;
  const administratorEmail = "development@courselore.org";
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
        }
      ),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "ignore",
        stderr: "ignore",
        input: caddyfile`
          {
            admin off
            local_certs
          }

          ${baseURL} {
            reverse_proxy 127.0.0.1:4001
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
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const app = await courselore({
      dataDirectory: path.join(process.cwd(), "data"),
      baseURL,
      administratorEmail,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            jsonTransport: true,
          },
          { from: `"CourseLore" <${administratorEmail}>` }
        );
        return async (mailOptions) => {
          console.log(await transporter.sendMail(mailOptions));
        };
      })(),
      liveReload: true,
    });
    app.listen(4001, "127.0.0.1", () => {
      console.log(`CourseLore/${courseloreVersion} started at ${baseURL}`);
    });
  }
};
