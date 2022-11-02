#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import timers from "node:timers/promises";
import os from "node:os";
import fs from "fs-extra";
import * as commander from "commander";
import express from "express";
import nodemailer from "nodemailer";
import lodash from "lodash";
import { execa, ExecaChildProcess } from "execa";
import caddyfile from "dedent";
import dedent from "dedent";
// import logging from "./logging.mjs";
// import database from "./database.mjs";
// import globalMiddlewares from "./global-middlewares.mjs";
// export { BaseLocals } from "./global-middlewares.mjs";
// import liveUpdates from "./live-updates.mjs";
// export { LiveUpdatesLocals } from "./live-updates.mjs";
// import healthChecks from "./health-checks.mjs";
// import authentication from "./authentication.mjs";
// export {
//   IsSignedOutLocals,
//   IsSignedInLocals,
//   HasPasswordConfirmationLocals,
// } from "./authentication.mjs";
// import layouts from "./layouts.mjs";
// import about from "./about.mjs";
// import administration from "./administration.mjs";
// export {
//   UserSystemRolesWhoMayCreateCourses,
//   userSystemRolesWhoMayCreateCourseses,
//   SystemRole,
//   systemRoles,
// } from "./administration.mjs";
// import user from "./user.mjs";
// export {
//   User,
//   UserAvatarlessBackgroundColor,
//   userAvatarlessBackgroundColors,
//   UserEmailNotificationsForAllMessages,
//   userEmailNotificationsForAllMessageses,
// } from "./user.mjs";
// import course from "./course.mjs";
// export {
//   Enrollment,
//   MaybeEnrollment,
//   CourseRole,
//   courseRoles,
//   EnrollmentAccentColor,
//   enrollmentAccentColors,
//   IsEnrolledInCourseLocals,
//   IsCourseStaffLocals,
// } from "./course.mjs";
// import conversation from "./conversation.mjs";
// export {
//   ConversationParticipants,
//   conversationParticipantses,
//   ConversationType,
//   conversationTypes,
//   IsConversationAccessibleLocals,
// } from "./conversation.mjs";
// import message from "./message.mjs";
// import content from "./content.mjs";
// import email from "./email.mjs";
// import demonstration from "./demonstration.mjs";
// import error from "./error.mjs";
// import helpers from "./helpers.mjs";

export type Courselore = {
  configuration: {
    hostname: string;
    dataDirectory: string;
    email: {
      options: any;
      defaults: nodemailer.SendMailOptions & {
        from: { name: string; address: string };
      };
    };
    administratorEmail: string;
    environment: "production" | "development" | "other";
    demonstration: boolean;
    tunnel: boolean;
    alternativeHostnames: string[];
    hstsPreload: boolean;
    caddyfileExtra: string;
  };
  process: {
    identifier: string;
    type: "main" | "server" | "worker";
  };
  version: string;
  addresses: {
    canonicalHostname: string;
    metaCourseloreInvitation: string;
    tryHostname: string;
  };
  static: {
    [path: string]: string;
  };
  server: express.Express;
  worker: express.Express;
};

if (
  url.fileURLToPath(import.meta.url) === (await fs.realpath(process.argv[1]))
) {
  const version = JSON.parse(
    await fs.readFile(new URL("../../package.json", import.meta.url), "utf8")
  ).version;
  await commander.program
    .name("courselore")
    .description("Communication Platform for Education")
    .addOption(
      new commander.Option(
        "--process-type <process-type>",
        "[INTERNAL] ‘main’, ‘server’, or ‘worker’."
      )
        .default("main")
        .hideHelp()
    )
    .addOption(
      new commander.Option(
        "--port <port>",
        "[INTERNAL] The network port on which to listen."
      ).hideHelp()
    )
    .argument(
      "[configuration]",
      "Path to configuration file. If you don’t provide a configuration file, Courselore runs in demonstration mode.",
      url.fileURLToPath(
        new URL("../../configuration/default.mjs", import.meta.url)
      )
    )
    .version(version)
    .addHelpText(
      "after",
      "\n" +
        dedent`
          Configuration:
            See ‘https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md’ for instructions, and ‘https://github.com/courselore/courselore/blob/main/web/configuration/example.mjs’ for an example.
        `
    )
    .allowExcessArguments(false)
    .showHelpAfterError()
    .action(
      async (
        configuration: string,
        {
          processType,
          port,
        }: {
          processType: "main" | "server" | "worker";
          port: string;
        }
      ) => {
        const courselore = {
          configuration: (
            await import(url.pathToFileURL(path.resolve(configuration)).href)
          ).default,
          process: {
            identifier: Math.random().toString(36).slice(2),
            type: processType,
          },
          version,
          addresses: {
            canonicalHostname: "courselore.org",
            metaCourseloreInvitation: "https://meta.courselore.org",
            tryHostname: "try.courselore.org",
          },
          static: JSON.parse(
            await fs.readFile(
              url.fileURLToPath(
                new URL("../static/paths.json", import.meta.url)
              ),
              "utf8"
            )
          ),
          server: express(),
          worker: express(),
        } as Courselore;

        courselore.configuration.environment ??= "production";
        courselore.configuration.demonstration ??=
          courselore.configuration.environment !== "production";
        courselore.configuration.tunnel ??= false;
        courselore.configuration.alternativeHostnames ??= [];
        courselore.configuration.hstsPreload ??= false;
        courselore.configuration.caddyfileExtra ??= caddyfile``;

        // TODO
        courselore.server.get("/", (req, res) => {
          res.send("SERVER");
        });
        courselore.worker.get("/", (req, res) => {
          res.send("WORKER");
        });

        // await logging(courselore);
        // await database(courselore);
        // await globalMiddlewares(courselore);
        // await liveUpdates(courselore);
        // await healthChecks(courselore);
        // await authentication(courselore);
        // await layouts(courselore);
        // await about(courselore);
        // await administration(courselore);
        // await user(courselore);
        // await course(courselore);
        // await conversation(courselore);
        // await message(courselore);
        // await content(courselore);
        // await email(courselore);
        // await demonstration(courselore);
        // await error(courselore);
        // await helpers(courselore);

        const processKeepAlive = new AbortController();
        timers
          .setInterval(1 << 30, undefined, { signal: processKeepAlive.signal })
          [Symbol.asyncIterator]()
          .next()
          .catch(() => {});

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

        switch (courselore.process.type) {
          case "main":
            const childProcesses = new Set<ExecaChildProcess>();
            let respawnChildProcesses = true;
            for (const execaArguments of [
              ...["server", "worker"].flatMap((processType) =>
                lodash.times(os.cpus().length, (processNumber) => ({
                  file: process.argv[0],
                  arguments: [
                    process.argv[1],
                    "--process-type",
                    processType,
                    "--port",
                    { server: 6000, worker: 7000 }[processType]! +
                      processNumber,
                    configuration,
                  ],
                  options: {
                    preferLocal: true,
                    stdio: "inherit",
                    ...(courselore.configuration.environment === "production"
                      ? { env: { NODE_ENV: "production" } }
                      : {}),
                  },
                }))
              ),
              {
                file: "caddy",
                arguments: ["run", "--config", "-", "--adapter", "caddyfile"],
                options: {
                  preferLocal: true,
                  stdout: "ignore",
                  stderr: "ignore",
                  input: caddyfile`
                    {
                      admin off
                      ${
                        courselore.configuration.environment === "production"
                          ? `email ${courselore.configuration.administratorEmail}`
                          : `local_certs`
                      }
                    }

                    (common) {
                      header Cache-Control no-store
                      header Content-Security-Policy "default-src https://${
                        courselore.configuration.hostname
                      }/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
                      header Cross-Origin-Embedder-Policy require-corp
                      header Cross-Origin-Opener-Policy same-origin
                      header Cross-Origin-Resource-Policy same-origin
                      header Referrer-Policy no-referrer
                      header Strict-Transport-Security "max-age=31536000; includeSubDomains${
                        courselore.configuration.hstsPreload ? `; preload` : ``
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

                    ${[
                      courselore.configuration.tunnel
                        ? []
                        : [courselore.configuration.hostname],
                      ...courselore.configuration.alternativeHostnames,
                    ]
                      .map((hostname) => `http://${hostname}`)
                      .join(", ")} {
                      import common
                      redir https://{host}{uri} 308
                      handle_errors {
                        import common
                      }
                    }

                    ${
                      courselore.configuration.alternativeHostnames.length > 0
                        ? caddyfile`
                            ${courselore.configuration.alternativeHostnames
                              .map((hostname) => `https://${hostname}`)
                              .join(", ")} {
                              import common
                              redir https://${
                                courselore.configuration.hostname
                              }{uri} 307
                              handle_errors {
                                import common
                              }
                            }
                          `
                        : ``
                    }

                    ${courselore.configuration.caddyfileExtra}

                    http${courselore.configuration.tunnel ? `` : `s`}://${
                    courselore.configuration.hostname
                  } {
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
                          root * ${JSON.stringify(
                            path.resolve(courselore.configuration.dataDirectory)
                          )}
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
                        reverse_proxy ${lodash
                          .times(
                            os.cpus().length,
                            (processNumber) =>
                              `127.0.0.1:${6000 + processNumber}`
                          )
                          .join(" ")}
                      }
                      handle_errors {
                        import common
                      }
                    }
                  `,
                },
              },
            ])
              (async () => {
                while (true) {
                  const childProcess = execa(
                    execaArguments.file,
                    execaArguments.arguments as any,
                    {
                      ...execaArguments.options,
                      reject: false,
                      cleanup: false,
                    } as any
                  );
                  childProcesses.add(childProcess);
                  const childProcessResult = await childProcess;
                  console.log(
                    `${new Date().toISOString()}\t${
                      courselore.process.type
                    }\tCHILD PROCESS RESULT\n${JSON.stringify(
                      childProcessResult,
                      undefined,
                      2
                    )}`
                  );
                  if (!respawnChildProcesses) break;
                  childProcesses.delete(childProcess);
                }
              })();

            await signalPromise;
            respawnChildProcesses = false;
            for (const childProcess of childProcesses) childProcess.cancel();
            break;

          case "server":
          case "worker":
            const application = courselore[courselore.process.type];
            application.emit("start");
            const server = application.listen(Number(port), "127.0.0.1");
            await signalPromise;
            server.close();
            application.emit("stop");
            break;
        }

        processKeepAlive.abort();
        await timers.setTimeout(10 * 1000, undefined, { ref: false });
        process.exit(1);
      }
    )
    .parseAsync();
}
