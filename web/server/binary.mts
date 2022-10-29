#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import timers from "node:timers/promises";
import fs from "fs-extra";
import * as commander from "commander";
import filenamify from "filenamify";
import nodemailer from "nodemailer";
import { execa } from "execa";
import caddyfile from "dedent";
import courselore from "./index.mjs";

await commander.program
  .name("courselore")
  .description("Communication Platform for Education")
  .argument(
    "[configuration]",
    "Path to configuration file.",
    url.fileURLToPath(
      new URL("../../configuration/default.mjs", import.meta.url)
    )
  )
  .argument("[process-type]", "‘main’, ‘server’, or ‘worker’", "main")
  .version(
    JSON.parse(
      await fs.readFile(new URL("../../package.json", import.meta.url), "utf8")
    ).version
  )
  .action(async (configuration, processType) => {
    let {
      hostname,
      administratorEmail,
      dataDirectory,
      email,
      alternativeHostnames = [],
      hstsPreload = false,
      caddyExtraConfiguration = caddyfile``,
      tunnel = false,
      environment = "production",
      demonstration = false,
    }: {
      hostname: string;
      administratorEmail: string;
      dataDirectory: string;
      email: {
        options: Parameters<typeof nodemailer.createTransport>[0];
        defaults: Parameters<typeof nodemailer.createTransport>[1];
      };
      alternativeHostnames?: string[];
      hstsPreload?: boolean;
      caddyExtraConfiguration?: string;
      tunnel?: boolean;
      environment?: "default" | "development" | "production";
      demonstration?: boolean;
    } = (await import(url.pathToFileURL(path.resolve(configuration)).href))
      .default;

    const app = await courselore({
      processType,
      hostname,
      administratorEmail,
      dataDirectory,
      email,
      environment,
      demonstration,
    });

    const signalPromise = Promise.race(
      [
        "exit",
        "SIGHUP",
        "SIGINT",
        "SIGQUIT",
        "SIGTERM",
        "SIGUSR2",
        "SIGBREAK",
      ].map(
        (signal) =>
          new Promise((resolve) => {
            process.on(signal, resolve);
          })
      )
    );

    app.emit("start");
    switch (processType) {
      case "main":
        const subprocesses = [
          ...["server", "worker"].map((processType) =>
            execa(
              process.argv[0],
              [process.argv[1], configuration, processType],
              {
                preferLocal: true,
                stdio: "inherit",
                ...(environment === "production"
                  ? { env: { NODE_ENV: "production" } }
                  : {}),
              }
            )
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
                header Cache-Control no-store
                header Content-Security-Policy "default-src https://${hostname}/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
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

              ${[tunnel ? [] : [hostname], ...alternativeHostnames]
                .map((hostname) => `http://${hostname}`)
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
                        .map((hostname) => `https://${hostname}`)
                        .join(", ")} {
                        import common
                        redir https://${hostname}{uri} 307
                        handle_errors {
                          import common
                        }
                      }
                    `
                  : ``
              }

              ${caddyExtraConfiguration}
              
              http${tunnel ? `` : `s`}://${hostname} {
                route {
                  import common
                  route {
                    root * ${JSON.stringify(
                      path.resolve(
                        url.fileURLToPath(
                          new URL("../static/", import.meta.url)
                        )
                      )
                    )}
                    @file_exists file
                    route @file_exists {
                      header Cache-Control "public, max-age=31536000, immutable"
                      file_server
                    }
                  }
                  route /files/* {
                    root * ${JSON.stringify(path.resolve(dataDirectory))}
                    @file_exists file
                    route @file_exists {
                      header Cache-Control "private, max-age=31536000, immutable"
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
        await Promise.race([signalPromise, ...subprocesses]).catch(() => {});
        for (const subprocess of subprocesses) subprocess.cancel();
        (async () => {
          const subprocessesResults = await Promise.allSettled(subprocesses);
          console.log(
            `${new Date().toISOString()}\t${processType}\tSUBPROCESSES\n${JSON.stringify(
              subprocessesResults,
              undefined,
              2
            )}`
          );
        })();
        break;

      case "server":
        const server = app.listen(4000, "127.0.0.1");
        await signalPromise;
        server.close();
        break;

      case "worker":
        const worker = new AbortController();
        timers
          .setInterval(1 << 30, undefined, { signal: worker.signal })
          [Symbol.asyncIterator]()
          .next()
          .catch(() => {});
        await signalPromise;
        worker.abort();
        break;
    }
    app.emit("stop");

    await timers.setTimeout(5 * 1000, undefined, { ref: false });
    process.exit();
  })
  .showHelpAfterError()
  .parseAsync();
