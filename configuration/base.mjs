export default async ({
  courseloreImport,
  courseloreImportMetaURL,
  host,
  administratorEmail,
  dataDirectory,
  sendMail,
  // DEPRECATED
  alternativeHosts = [],
  alternativeHostnames = alternativeHosts,
  hstsPreload = false,
  caddyExtraConfiguration = "",
  tunnel = false,
  environment = "production",
  demonstration = false,
}) => {
  if (process.argv[3] === undefined) {
    const path = await courseloreImport("node:path");
    const url = await courseloreImport("node:url");
    const execa = (await courseloreImport("execa")).execa;
    const caddyfile = (await courseloreImport("dedent")).default;

    const subprocesses = [
      execa(
        process.argv[0],
        [
          process.argv[1],
          process.argv[2] ??
            url.fileURLToPath(new URL("./default.mjs", import.meta.url)),
          "server",
        ],
        {
          preferLocal: true,
          stdio: "inherit",
          ...(environment === "production"
            ? { env: { NODE_ENV: "production" } }
            : {}),
        }
      ),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "ignore",
        stderr: "ignore",
        input: caddyfile`
          {
            admin off
            ${
              environment === "production"
                ? `email ${administratorEmail}`
                : `local_certs`
            }
          }

          (common) {
            header Cache-Control no-cache
            header Content-Security-Policy "default-src https://${host}/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
            header Cross-Origin-Embedder-Policy require-corp
            header Cross-Origin-Opener-Policy same-origin
            header Cross-Origin-Resource-Policy same-origin
            header Referrer-Policy no-referrer
            header Strict-Transport-Security "max-age=31536000; includeSubDomains${
              hstsPreload ? `; preload` : ``
            }"
            header X-Content-Type-Options nosniff
            header Origin-Agent-Cluster "?1"
            header X-DNS-Prefetch-Control off
            header X-Frame-Options DENY
            header X-Permitted-Cross-Domain-Policies none
            header -Server
            header -X-Powered-By
            header X-XSS-Protection 0
            header Permissions-Policy "interest-cohort=()"
            encode zstd gzip
          }

          ${[tunnel ? [] : [host], ...alternativeHostnames]
            .map((host) => `http://${host}`)
            .join(", ")} {
            import common
            redir https://{host}{uri} 308
            handle_errors {
              import common
            }
          }

          ${
            alternativeHostnames.length > 0
              ? caddyfile`
                  ${alternativeHostnames
                    .map((host) => `https://${host}`)
                    .join(", ")} {
                    import common
                    redir https://${host}{uri} 307
                    handle_errors {
                      import common
                    }
                  }
                `
              : ``
          }

          ${caddyExtraConfiguration}
          
          http${tunnel ? `` : `s`}://${host} {
            route {
              import common
              route {
                root * ${path.resolve(
                  url.fileURLToPath(
                    new URL("../static/", courseloreImportMetaURL)
                  )
                )}
                @file_exists file
                file_server @file_exists
              }
              route /files/* {
                root * ${path.resolve(dataDirectory)}
                @file_exists file
                route @file_exists {
                  @must_be_downloaded not path *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                  header @must_be_downloaded Content-Disposition attachment
                  @may_be_embedded_in_other_sites path *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf
                  header @may_be_embedded_in_other_sites Cross-Origin-Resource-Policy cross-origin
                  file_server
                }
              }
              reverse_proxy 127.0.0.1:4000
            }
            handle_errors {
              import common
            }
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
    const path = await courseloreImport("node:path");
    const fs = (await courseloreImport("fs-extra")).default;
    const filenamify = (await courseloreImport("filenamify")).default;
    const nodemailer = await courseloreImport("nodemailer");
    const courselore = (await courseloreImport("./index.js")).default;

    if (typeof sendMail !== "function") {
      const { options, defaults } = sendMail;
      const transport = nodemailer.createTransport(options, defaults);
      sendMail =
        options.streamTransport && options.buffer
          ? async (mailOptions) => {
              const sentMessageInfo = await transport.sendMail(mailOptions);
              const emailsDirectory = path.join(dataDirectory, "emails");
              await fs.ensureDir(emailsDirectory);
              await fs.writeFile(
                path.join(
                  emailsDirectory,
                  filenamify(
                    `${new Date().toISOString()}--${mailOptions.to}.eml`,
                    { replacement: "-" }
                  )
                ),
                sentMessageInfo.message
              );
              return sentMessageInfo;
            }
          : async (mailOptions) => await transport.sendMail(mailOptions);
      sendMail.options = options;
      sendMail.defaults = defaults;
    }
    const app = await courselore({
      host,
      administratorEmail,
      dataDirectory,
      sendMail,
      environment,
      demonstration,
    });
    const server = app.listen(4000, "127.0.0.1");
    app.emit("listen");
    app.emit("jobs");
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
