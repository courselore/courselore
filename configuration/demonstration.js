export default async (importFromCourselore) => {
  const url = process.env.URL ?? `https://localhost:5000`;
  const email = "development@courselore.org";
  if (process.argv[3] === undefined) {
    const execa = await importFromCourselore("execa");
    const caddyfile = await importFromCourselore("dedent");
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
      }),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "inherit",
        stderr: "inherit",
        input: caddyfile`
          {
            admin off
            local_certs
          }

          ${url} {
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
    const path = await importFromCourselore("path");
    const nodemailer = await importFromCourselore("nodemailer");
    const courselore = await importFromCourselore(".").default;
    const { version } = await importFromCourselore("../package.json");
    const app = await courselore({
      dataDirectory: path.join(process.cwd(), "data"),
      url,
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
    });
    app.listen(4000, "127.0.0.1", () => {
      console.log(`CourseLore/${version} started at ${url}`);
    });
  }
};
