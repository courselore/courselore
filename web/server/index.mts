#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";
import timers from "node:timers/promises";
import os from "node:os";
import * as commander from "commander";
import express from "express";
import nodemailer from "nodemailer";
import lodash from "lodash";
import { execa, ExecaChildProcess } from "execa";
import caddyfile from "dedent";
import dedent from "dedent";
import logging, { ApplicationLogging } from "./logging.mjs";
export { ResponseLocalsLogging } from "./logging.mjs";
import database, { ApplicationDatabase } from "./database.mjs";
import base, { ApplicationBase } from "./base.mjs";
export { ResponseLocalsBase } from "./base.mjs";
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

export type Application = {
  name: string;
  version: string;
  process: {
    identifier: string;
    type: "main" | "server" | "worker";
    port: number | undefined;
  };
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
    caddy: string;
  };
  static: {
    [path: string]: string;
  };
  addresses: {
    canonicalHostname: string;
    metaCourseloreInvitation: string;
    tryHostname: string;
  };
  server: express.Express;
  worker: express.Express;
} & ApplicationLogging &
  ApplicationDatabase &
  ApplicationBase;

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
      "Path to configuration file. If you don’t provide a configuration file, the application runs in demonstration mode.",
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
        const stop = new Promise<void>((resolve) => {
          const processKeepAlive = new AbortController();
          timers
            .setInterval(1 << 30, undefined, {
              signal: processKeepAlive.signal,
            })
            [Symbol.asyncIterator]()
            .next()
            .catch(() => {});
          for (const event of [
            "exit",
            "SIGHUP",
            "SIGINT",
            "SIGQUIT",
            "SIGTERM",
            "SIGUSR2",
            "SIGBREAK",
          ])
            process.on(event, () => {
              processKeepAlive.abort();
              resolve();
            });
        });

        const application = {
          name: "courselore",
          version,
          process: {
            identifier: Math.random().toString(36).slice(2),
            type: processType,
            port: typeof port === "string" ? Number(port) : undefined,
          },
          configuration: (
            await import(url.pathToFileURL(path.resolve(configuration)).href)
          ).default,
          static: JSON.parse(
            await fs.readFile(
              url.fileURLToPath(
                new URL("../static/paths.json", import.meta.url)
              ),
              "utf8"
            )
          ),
          addresses: {
            canonicalHostname: "courselore.org",
            metaCourseloreInvitation: "https://meta.courselore.org",
            tryHostname: "try.courselore.org",
          },
          server: express(),
          worker: express(),
        } as Application;

        application.configuration.environment ??= "production";
        application.configuration.demonstration ??=
          application.configuration.environment !== "production";
        application.configuration.tunnel ??= false;
        application.configuration.alternativeHostnames ??= [];
        application.configuration.hstsPreload ??= false;
        application.configuration.caddy ??= caddyfile``;

        await logging(application);
        await database(application);
        await base(application);
        // await liveUpdates(application);
        // await healthChecks(application);
        // await authentication(application);
        // await layouts(application);
        // await about(application);
        // await administration(application);
        // await user(application);
        // await course(application);
        // await conversation(application);
        // await message(application);
        // await content(application);
        // await email(application);
        // await demonstration(application);
        // await error(application);
        // await helpers(application);

        switch (application.process.type) {
          case "main":
            const childProcesses = new Set<ExecaChildProcess>();
            let restartChildProcesses = true;
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
                    ...(application.configuration.environment === "production"
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
                        application.configuration.environment === "production"
                          ? `email ${application.configuration.administratorEmail}`
                          : `local_certs`
                      }
                    }

                    (common) {
                      header Cache-Control no-store
                      header Content-Security-Policy "default-src https://${
                        application.configuration.hostname
                      }/ 'unsafe-inline' 'unsafe-eval'; frame-ancestors 'none'; object-src 'none'"
                      header Cross-Origin-Embedder-Policy require-corp
                      header Cross-Origin-Opener-Policy same-origin
                      header Cross-Origin-Resource-Policy same-origin
                      header Referrer-Policy no-referrer
                      header Strict-Transport-Security "max-age=31536000; includeSubDomains${
                        application.configuration.hstsPreload ? `; preload` : ``
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
                      application.configuration.tunnel
                        ? []
                        : [application.configuration.hostname],
                      ...application.configuration.alternativeHostnames,
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
                      application.configuration.alternativeHostnames.length > 0
                        ? caddyfile`
                            ${application.configuration.alternativeHostnames
                              .map((hostname) => `https://${hostname}`)
                              .join(", ")} {
                              import common
                              redir https://${
                                application.configuration.hostname
                              }{uri} 307
                              handle_errors {
                                import common
                              }
                            }
                          `
                        : ``
                    }

                    http${application.configuration.tunnel ? `` : `s`}://${
                    application.configuration.hostname
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
                            path.resolve(
                              application.configuration.dataDirectory
                            )
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

                    ${application.configuration.caddy}
                  `,
                },
              },
            ])
              (async () => {
                while (restartChildProcesses) {
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
                  application.log(
                    "CHILD PROCESS RESULT",
                    JSON.stringify(childProcessResult, undefined, 2)
                  );
                  childProcesses.delete(childProcess);
                }
              })();
            await stop;
            restartChildProcesses = false;
            for (const childProcess of childProcesses) childProcess.cancel();
            break;

          case "server":
          case "worker":
            const processApplication = application[application.process.type];
            processApplication.emit("start");
            const server = processApplication.listen(
              application.process.port!,
              "127.0.0.1"
            );
            await stop;
            server.close();
            processApplication.emit("stop");
            break;
        }

        await timers.setTimeout(10 * 1000, undefined, { ref: false });
        process.exit(1);
      }
    )
    .parseAsync();
}
