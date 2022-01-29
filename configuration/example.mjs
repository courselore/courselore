export default async ({ courselore, courseloreImport }) => {
  const baseURL = "https://YOUR-DOMAIN.EDU";
  const administratorEmail = "administrator@YOUR-DOMAIN.EDU";
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
        stdout: "ignore",
        stderr: "ignore",
        input: caddyfile`
          {
            admin off
            email ${administratorEmail}
          }

          ${baseURL} {
            reverse_proxy 127.0.0.1:4001
            encode zstd gzip
          }
    
          WWW.YOUR-DOMAIN.EDU, AND-OTHER-DOMAINS-YOU-WOULD-LIKE-TO-REDIRECT {
            redir https://YOUR-DOMAIN.EDU{uri}
          }
        `,
      }),
    ];
    for (const subprocess of subprocesses)
      subprocess.once("close", () => {
        for (const otherSubprocess of subprocesses)
          if (subprocess !== otherSubprocess) otherSubprocess.cancel();
      });
  } else {
    const url = await courseloreImport("node:url");
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const app = await courselore({
      dataDirectory: url.fileURLToPath(new URL("./data/", import.meta.url)),
      baseURL,
      administratorEmail,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            host: "YOUR-EMAIL-DELIVERY-SERVICE, FOR EXAMPLE, email-smtp.us-east-1.amazonaws.com",
            auth: {
              user: "YOUR-USERNAME-AT-YOUR-EMAIL-DELIVERY-SERVICE",
              pass: "YOUR-PASSWORD-AT-YOUR-EMAIL-DELIVERY-SERVICE",
            },
          },
          { from: `"CourseLore" <${administratorEmail}>` }
        );
        return async (mailOptions) => await transporter.sendMail(mailOptions);
      })(),
    });
    const server = app.listen(4001, "127.0.0.1");
    app.emit("listen");
    for (const signal of [
      "exit",
      "SIGHUP",
      "SIGINT",
      "SIGQUIT",
      "SIGUSR2",
      "SIGTERM",
      "SIGBREAK",
    ])
      process.once(signal, () => {
        server.close();
        app.emit("close");
        if (signal.startsWith("SIG")) process.kill(process.pid, signal);
      });
  }
};
