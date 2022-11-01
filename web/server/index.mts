#!/usr/bin/env node

import path from "node:path";
import url from "node:url";
import timers from "node:timers/promises";
import fs from "fs-extra";
import * as commander from "commander";
import express from "express";
import nodemailer from "nodemailer";
import { execa } from "execa";
import caddyfile from "dedent";
import logging from "./logging.mjs";
import database from "./database.mjs";
import globalMiddlewares from "./global-middlewares.mjs";
export { BaseLocals } from "./global-middlewares.mjs";
import liveUpdates from "./live-updates.mjs";
export { LiveUpdatesLocals } from "./live-updates.mjs";
import healthChecks from "./health-checks.mjs";
import authentication from "./authentication.mjs";
export {
  IsSignedOutLocals,
  IsSignedInLocals,
  HasPasswordConfirmationLocals,
} from "./authentication.mjs";
import layouts from "./layouts.mjs";
import about from "./about.mjs";
import administration from "./administration.mjs";
export {
  UserSystemRolesWhoMayCreateCourses,
  userSystemRolesWhoMayCreateCourseses,
  SystemRole,
  systemRoles,
} from "./administration.mjs";
import user from "./user.mjs";
export {
  User,
  UserAvatarlessBackgroundColor,
  userAvatarlessBackgroundColors,
  UserEmailNotificationsForAllMessages,
  userEmailNotificationsForAllMessageses,
} from "./user.mjs";
import course from "./course.mjs";
export {
  Enrollment,
  MaybeEnrollment,
  CourseRole,
  courseRoles,
  EnrollmentAccentColor,
  enrollmentAccentColors,
  IsEnrolledInCourseLocals,
  IsCourseStaffLocals,
} from "./course.mjs";
import conversation from "./conversation.mjs";
export {
  ConversationParticipants,
  conversationParticipantses,
  ConversationType,
  conversationTypes,
  IsConversationAccessibleLocals,
} from "./conversation.mjs";
import message from "./message.mjs";
import content from "./content.mjs";
import email from "./email.mjs";
import demonstration from "./demonstration.mjs";
import error from "./error.mjs";
import helpers from "./helpers.mjs";

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
  http: express.Express;
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
    .argument(
      "[configuration]",
      "Path to configuration file. If you don’t provide one, Courselore runs in demonstration mode for you to try it out.",
      url.fileURLToPath(
        new URL("../../configuration/default.mjs", import.meta.url)
      )
    )
    .argument(
      "[process-type]",
      "[ADVANCED] ‘main’, ‘server’, or ‘worker’.",
      "main"
    )
    .version(version)
    .addHelpText(
      "after",
      "See ‘https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md’ for instructions on how to create a configuration file, and ‘https://github.com/courselore/courselore/blob/main/web/configuration/example.mjs’ for an example configuration file."
    )
    .action(
      async (
        configuration: string,
        processType: "main" | "server" | "worker"
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
          http: express(),
          worker: express(),
        };

        courselore.configuration.environment ??= "production";
        courselore.configuration.demonstration ??=
          courselore.configuration.environment !== "production";
        courselore.configuration.tunnel ??= false;
        courselore.configuration.alternativeHostnames ??= [];
        courselore.configuration.hstsPreload ??= false;
        courselore.configuration.caddyfileExtra ??= caddyfile``;

        await logging(courselore);
        await database(courselore);
        await globalMiddlewares(courselore);
        await liveUpdates(courselore);
        await healthChecks(courselore);
        await authentication(courselore);
        await layouts(courselore);
        await about(courselore);
        await administration(courselore);
        await user(courselore);
        await course(courselore);
        await conversation(courselore);
        await message(courselore);
        await content(courselore);
        await email(courselore);
        await demonstration(courselore);
        await error(courselore);
        await helpers(courselore);

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
              execa(
                "caddy",
                ["run", "--config", "-", "--adapter", "caddyfile"],
                {
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

                    ${caddyfileExtra}
                    
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
                }
              ),
            ];
            await Promise.race([signalPromise, ...subprocesses]).catch(
              () => {}
            );
            for (const subprocess of subprocesses) subprocess.cancel();
            (async () => {
              const subprocessesResults = await Promise.allSettled(
                subprocesses
              );
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
      }
    )
    .showHelpAfterError()
    .parseAsync();
}
