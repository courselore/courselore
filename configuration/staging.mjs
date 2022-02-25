export default async ({
  courselore,
  courseloreImport,
  courseloreImportMetaURL,
  userFileExtensionsWhichMayBeShownInBrowser,
}) => {
  const baseURL = "https://try.courselore.org";
  const administratorEmail = "administrator@courselore.org";
  const url = await courseloreImport("node:url");
  const dataDirectory = url.fileURLToPath(new URL("./data/", import.meta.url));
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
            route {
              route {
                root * ${url.fileURLToPath(
                  new URL("../static/", courseloreImportMetaURL)
                )}
                @file_exists file
                file_server @file_exists
              }
              route /files/* {
                root * ${dataDirectory}
                @file_exists file
                route @file_exists {
                  @may_not_be_shown_in_browser not path ${userFileExtensionsWhichMayBeShownInBrowser
                    .map((extension) => `*.${extension}`)
                    .join(" ")}
                  header @may_not_be_shown_in_browser Content-Disposition attachment 
                  file_server
                }
              }
              reverse_proxy 127.0.0.1:4001
            }
            encode zstd gzip
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
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const app = await courselore({
      dataDirectory,
      baseURL,
      administratorEmail,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            jsonTransport: true,
          },
          { from: `"Courselore" <${administratorEmail}>` }
        );
        return async (mailOptions) => await transporter.sendMail(mailOptions);
      })(),
      demonstration: true,
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
