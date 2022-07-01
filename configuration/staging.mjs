export default async ({ courseloreImport, courseloreImportMetaURL }) => {
  const path = await courseloreImport("node:path");
  const url = await courseloreImport("node:url");
  const execa = (await courseloreImport("execa")).execa;
  const caddyfile = (await courseloreImport("dedent")).default;
  const courselore = (await courseloreImport("./index.js")).default;
  const baseURL = "https://try.courselore.org";
  const administratorEmail = "administrator@courselore.org";
  const dataDirectory = url.fileURLToPath(new URL("./data/", import.meta.url));
  if (process.argv[3] === undefined) {
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
            header Cache-Control no-cache
            header Content-Security-Policy "default-src ${baseURL}/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
            header Cross-Origin-Embedder-Policy require-corp
            header Cross-Origin-Opener-Policy same-origin
            header Cross-Origin-Resource-Policy same-origin
            header Referrer-Policy no-referrer
            header Strict-Transport-Security "max-age=31536000; includeSubDomains"
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

          http://${new URL(baseURL).host} {
            import common
            redir https://{host}{uri} 308
            handle_errors {
              import common
            }
          }
          
          ${new URL(baseURL).origin} {
            route ${new URL(`${baseURL}/*`).pathname} {
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
                root * ${dataDirectory}
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
    const app = await courselore({
      dataDirectory,
      baseURL,
      administratorEmail,
      demonstration: true,
    });
    const server = app.listen(4000, "127.0.0.1");
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
