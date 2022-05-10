export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const baseURL = "https://YOUR-DOMAIN.EDU";
  const administratorEmail = "administrator@YOUR-DOMAIN.EDU";
  const url = await courseloreImport("node:url");
  const dataDirectory = url.fileURLToPath(new URL("./data/", import.meta.url));
  const { default: courselore } = await courseloreImport("./index.js");
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

          (common) {
            header {
              Cache-Control no-cache
              Content-Security-Policy "default-src ${baseURL}/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
              Cross-Origin-Embedder-Policy require-corp
              Cross-Origin-Opener-Policy same-origin
              Cross-Origin-Resource-Policy same-origin
              Referrer-Policy no-referrer
              Strict-Transport-Security "max-age=31536000; includeSubDomains"
              X-Content-Type-Options nosniff
              Origin-Agent-Cluster "?1"
              X-DNS-Prefetch-Control off
              X-Frame-Options DENY
              X-Permitted-Cross-Domain-Policies none
              -Server
              -X-Powered-By
              X-XSS-Protection 0
              Permissions-Policy "interest-cohort=()"
            }
            encode zstd gzip
          }

          http://${
            new URL(baseURL).host
          }, http://WWW.YOUR-DOMAIN.EDU, http://AND-OTHER-DOMAINS-YOU-WOULD-LIKE-TO-REDIRECT {
            import common
            redir https://{host}{uri} 308
            handle_errors {
              import common
            }
          }

          https://WWW.YOUR-DOMAIN.EDU, https://AND-OTHER-DOMAINS-YOU-WOULD-LIKE-TO-REDIRECT {
            import common
            redir ${baseURL}{uri} 307
            handle_errors {
              import common
            }
          }

          ${new URL(baseURL).origin} {
            route ${new URL(`${baseURL}/*`).pathname} {
              import common
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
                  @must_be_downloaded not path *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                  header @must_be_downloaded Content-Disposition attachment 
                  file_server
                }
              }
              reverse_proxy 127.0.0.1:4001
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
    const nodemailer = (await courseloreImport("nodemailer")).default;
    const app = await courselore({
      dataDirectory,
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
          { from: `"Courselore" <${administratorEmail}>` }
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
