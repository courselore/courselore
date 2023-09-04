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
import { got } from "got";
import * as Got from "got";
import * as node from "@leafac/node";
import prompts from "prompts";
import killPort from "kill-port";
import caddyfile from "dedent";
import dedent from "dedent";
import * as saml from "@node-saml/node-saml";
import logging, { ApplicationLogging } from "./logging.mjs";
import database, { ApplicationDatabase } from "./database.mjs";
import base, { ApplicationBase } from "./base.mjs";
import liveConnection, {
  ApplicationLiveConnection,
} from "./live-connection.mjs";
import layouts, { ApplicationLayouts } from "./layouts.mjs";
import authentication, {
  ApplicationAuthentication,
} from "./authentication.mjs";
import healthChecks from "./health-checks.mjs";
import about from "./about.mjs";
import administration, {
  ApplicationAdministration,
} from "./administration.mjs";
import user, { ApplicationUser } from "./user.mjs";
import course, { ApplicationCourse } from "./course.mjs";
import conversation, { ApplicationConversation } from "./conversation.mjs";
import message, { ApplicationMessage } from "./message.mjs";
import content, { ApplicationContent } from "./content.mjs";
import email from "./email.mjs";
import demonstration from "./demonstration.mjs";
import error from "./error.mjs";
import helpers, { ApplicationHelpers } from "./helpers.mjs";

export type Application = {
  name: string;
  version: string;
  process: {
    id: string;
    type: "main" | "web" | "worker";
    number: number;
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
    staticPaths: string[];
    saml: {
      [identifier: string]: {
        public?: boolean;
        name: string;
        logo?: {
          light: string;
          dark: string;
          width: number;
        };
        domains: string[];
        attributes: (samlResponse: object | undefined) => {
          email: string | undefined;
          name: string | undefined;
        };
        options: ConstructorParameters<typeof saml.SAML>[0] & {
          decryptionCert?: string;
          signingCert?: string;
        };
      };
    };
    environment: "production" | "development" | "profile" | "default";
    demonstration: boolean;
    slow: boolean;
    tunnel: boolean;
    alternativeHostnames: string[];
    hstsPreload: boolean;
    caddy: string;
  };
  static: {
    [path: string]: string;
  };
  ports: {
    web: number[];
    webEventsAny: number;
    webEvents: number[];
    workerEventsAny: number;
    workerEvents: number[];
  };
  addresses: {
    canonicalHostname: string;
    metaCourseloreInvitation: string;
    tryHostname: string;
  };
  web: Omit<express.Express, "locals"> & Function;
  webEvents: Omit<express.Express, "locals"> & Function;
  workerEvents: Omit<express.Express, "locals"> & Function;
  got: Got.Got;
} & ApplicationLogging &
  ApplicationDatabase &
  ApplicationBase &
  ApplicationLiveConnection &
  ApplicationLayouts &
  ApplicationAuthentication &
  ApplicationAdministration &
  ApplicationUser &
  ApplicationCourse &
  ApplicationConversation &
  ApplicationMessage &
  ApplicationContent &
  ApplicationHelpers;

if (await node.isExecuted(import.meta.url)) {
  const version = JSON.parse(
    await fs.readFile(new URL("../package.json", import.meta.url), "utf8"),
  ).version;
  await commander.program
    .name("courselore")
    .description("Communication Platform for Education")
    .addOption(
      new commander.Option("--process-type <process-type>")
        .default("main")
        .hideHelp(),
    )
    .addOption(
      new commander.Option("--process-number <process-number>").hideHelp(),
    )
    .argument(
      "[configuration]",
      "Path to configuration file. If you don’t provide a configuration file, the application runs in Demonstration Mode.",
    )
    .version(version)
    .addHelpText(
      "after",
      "\n" +
        dedent`
          Configuration:
            See ‘https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md’ for instructions, and ‘https://github.com/courselore/courselore/blob/main/web/configuration/example.mjs’ for an example.
        `,
    )
    .allowExcessArguments(false)
    .showHelpAfterError()
    .action(
      async (
        configuration: string | undefined,
        {
          processType,
          processNumber,
        }: {
          processType: "main" | "web" | "worker";
          processNumber: string | undefined;
        },
      ) => {
        const eventLoopActive = node.eventLoopActive();

        const portStart = 18000;
        let port = portStart;

        const application = {
          name: "courselore",
          version,
          process: {
            id: Math.random().toString(36).slice(2),
            type: processType,
            number:
              typeof processNumber === "string"
                ? Number(processNumber)
                : undefined,
          },
          configuration:
            typeof configuration === "string"
              ? (await import(url.pathToFileURL(configuration).href)).default
              : {
                  hostname:
                    process.env.TUNNEL ?? process.env.HOSTNAME ?? "localhost",
                  dataDirectory:
                    typeof process.env.ENVIRONMENT === "string" &&
                    ["development", "profile"].includes(process.env.ENVIRONMENT)
                      ? url.fileURLToPath(new URL("../data/", import.meta.url))
                      : path.join(process.cwd(), "data"),
                  email: {
                    options: {
                      host: "127.0.0.1",
                      port: 8002,
                    },
                    defaults: {
                      from: {
                        name: "Courselore",
                        address: "feedback@courselore.org",
                      },
                    },
                  },
                  administratorEmail: "feedback@courselore.org",
                  // TODO: SAML
                  // staticPaths: [
                  //   url.fileURLToPath(
                  //     new URL("./development--static/", import.meta.url),
                  //   ),
                  // ],
                  saml: {
                    "courselore-university": {
                      public: false, // TODO: SAML
                      name: "Courselore University",
                      ...(process.env.SAML_LOGO === "true"
                        ? {
                            logo: {
                              light:
                                "johns-hopkins-university--light--2023-03-28.webp",
                              dark: "johns-hopkins-university--dark--2023-03-28.webp",
                              width: 300,
                            },
                          }
                        : {}),
                      domains: ["courselore.org"],
                      attributes: (samlResponse: any) => ({
                        email: samlResponse?.profile?.nameID,
                        name: samlResponse?.profile?.attributes?.name,
                      }),
                      options: {
                        idpIssuer: "http://127.0.0.1:8080/realms/myrealm",
                        entryPoint:
                          "http://127.0.0.1:8080/realms/myrealm/protocol/saml",
                        logoutUrl:
                          "http://127.0.0.1:8080/realms/myrealm/protocol/saml",
                        signatureAlgorithm: "sha256",
                        digestAlgorithm: "sha256",
                        signMetadata: true,
                        cert: "MIICnTCCAYUCBgGKYAfm3zANBgkqhkiG9w0BAQsFADASMRAwDgYDVQQDDAdteXJlYWxtMB4XDTIzMDkwNDExNDkwNVoXDTMzMDkwNDExNTA0NVowEjEQMA4GA1UEAwwHbXlyZWFsbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKwu+FHQKoMFUSZpQJnPqIdtk8jB5SPmzdWTWxwihCm/CZ/VsmmzH2AYPE+/aBJsYyHXkDFIYamiNaD6XY0aRjwoIjilkdS6rjJLInRm+ZSEui1IcZJkEXMEf088Cm/IidEKIZKHhfQ/5l50EhmH5PQ1Yr8Mm/2DKd02VyLGGJmfctWp6gB502NPt7HZN2GsPqOhOV+WCVByacxr+v/w5vZIq4UrUnKF85Fsf/+yuYDZjZveoYoQD2VgAJtxN0Qz3RpHyXNZbkm7sWkvL5fNtIUgJCApNxy9PaJCC2Bnf0//PprpL3dwLcPkuUmKyARm/+iorMseKDDiNru2Z1RtQJcCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAUVIgXw1221hSXLwc7PTrqnpHK9uINRiTY1DiGYyKtIfMTJiPacxS/4OBAgXFIt9CMg8deKODjWggw9oYGekjAZ6A8s2ok1WeNKzti77ODkqsma+6q+bietqx1+kQ/gzPQGOlFkOXhHcv1gsgFZmIfiyq4Yt1W4J3zJBB8lpDQbGTy9wbKa2YRfExFdcQaKEnbQb5d8W7yBVFlOGlXpxq+JUdg1YHmghfb8lodJDg2XHlxaFIJAb5E2wFLDzAzFpPLyyZogc2aZkP3HkNwmWLurt1T9bIJtNSax6USe1b14qvu8iTn47S0Kjtzl7KyAnyS2dEQf6A0V5rB9BhD2nppQ==",
                        // privateKey: await fs.readFile(
                        //   new URL(
                        //     "./development--saml--service-provider--signing.key",
                        //     import.meta.url,
                        //   ),
                        //   "utf-8",
                        // ),
                        // signingCert: await fs.readFile(
                        //   new URL(
                        //     "./development--saml--service-provider--signing.crt",
                        //     import.meta.url,
                        //   ),
                        //   "utf-8",
                        // ),
                        // decryptionPvk: await fs.readFile(
                        //   new URL(
                        //     "./development--saml--service-provider--encryption.key",
                        //     import.meta.url,
                        //   ),
                        //   "utf-8",
                        // ),
                        // decryptionCert: await fs.readFile(
                        //   new URL(
                        //     "./development--saml--service-provider--encryption.crt",
                        //     import.meta.url,
                        //   ),
                        //   "utf-8",
                        // ),
                      },
                    },
                  },
                  environment: process.env.ENVIRONMENT ?? "default",
                  slow: process.env.SLOW === "true",
                  tunnel: typeof process.env.TUNNEL === "string",
                },
          static: JSON.parse(
            await fs.readFile(
              new URL("./static/paths.json", import.meta.url),
              "utf8",
            ),
          ),
          ports: {
            web: lodash.times(os.availableParallelism(), () => port++),
            webEventsAny: port++,
            webEvents: lodash.times(os.availableParallelism(), () => port++),
            workerEventsAny: port++,
            workerEvents: lodash.times(os.availableParallelism(), () => port++),
          },
          addresses: {
            canonicalHostname: "courselore.org",
            metaCourseloreInvitation: "https://meta.courselore.org",
            tryHostname: "try.courselore.org",
          },
          web: express() as any,
          webEvents: express() as any,
          workerEvents: express() as any,
        } as Application;

        application.configuration.staticPaths ??= [];
        application.configuration.saml ??= {};
        application.configuration.environment ??= "production";
        application.configuration.demonstration ??=
          application.configuration.environment !== "production";
        application.configuration.slow ??= false;
        application.configuration.tunnel ??= false;
        application.configuration.alternativeHostnames ??= [];
        application.configuration.hstsPreload ??= false;
        application.configuration.caddy ??= caddyfile``;

        application.web.locals.configuration = {} as any;
        application.web.locals.layouts = {} as any;
        application.web.locals.partials = {} as any;
        application.web.locals.helpers = {} as any;

        application.got = got.extend({ timeout: { request: 5 * 1000 } });

        await logging(application);
        await database(application);
        await base(application);
        await liveConnection(application);
        await layouts(application);
        await authentication(application);
        await healthChecks(application);
        await about(application);
        await administration(application);
        await user(application);
        await course(application);
        await conversation(application);
        await message(application);
        await content(application);
        await email(application);
        await demonstration(application);
        await error(application);
        await helpers(application);

        switch (application.process.type) {
          case "main": {
            while (true) {
              const unavailablePorts = [];
              for (const configuration of [
                { port: 80, hostname: undefined },
                { port: 443, hostname: undefined },
                ...lodash
                  .range(portStart, port)
                  .map((port) => ({ port, hostname: "127.0.0.1" })),
                ...(application.configuration.demonstration
                  ? [
                      { port: 8000, hostname: undefined },
                      { port: 8001, hostname: "127.0.0.1" },
                      { port: 8002, hostname: "127.0.0.1" },
                    ]
                  : []),
              ])
                if (
                  !(await node.portAvailable(
                    configuration.port,
                    configuration.hostname,
                  ))
                )
                  unavailablePorts.push(configuration.port);
              if (unavailablePorts.length === 0) break;
              if (
                process.stdin.isTTY &&
                (
                  await prompts({
                    type: "confirm",
                    name: "output",
                    message: `The following ports are unavailable, do you want to kill the respective processes and retry? ${JSON.stringify(
                      unavailablePorts,
                    )}`,
                    initial: true,
                  })
                ).output
              ) {
                for (const port of unavailablePorts) await killPort(port);
                continue;
              }
              application.log(
                "UNAVAILABLE PORTS",
                JSON.stringify(unavailablePorts),
              );
              process.exit(1);
            }
            const childProcesses = new Set<ExecaChildProcess>();
            let restartChildProcesses = true;
            for (const execaArguments of [
              ...["web", "worker"].flatMap((processType) =>
                [
                  ...(application.ports as any)[processType + "Events"].keys(),
                ].map((processNumber) => ({
                  file:
                    application.configuration.environment === "profile"
                      ? "0x"
                      : process.argv[0],
                  arguments: [
                    ...(application.configuration.environment === "profile"
                      ? [
                          "--name",
                          `${processType}--${processNumber}`,
                          "--output-dir",
                          "data/measurements/profiles/{name}",
                          "--collect-delay",
                          "2000",
                        ]
                      : []),
                    process.argv[1],
                    "--process-type",
                    processType,
                    "--process-number",
                    processNumber,
                    ...(typeof configuration === "string"
                      ? [configuration]
                      : []),
                  ],
                  options: {
                    preferLocal: true,
                    stdio: "inherit",
                    ...(["production", "profile"].includes(
                      application.configuration.environment,
                    )
                      ? { env: { NODE_ENV: "production" } }
                      : {}),
                  },
                })),
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
                      header Content-Security-Policy "default-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; form-action 'self'; frame-ancestors 'none'"
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

                    http${application.configuration.tunnel ? `` : `s`}://${
                      application.configuration.hostname
                    } {
                      route {
                        import common
                        ${[
                          url.fileURLToPath(
                            new URL("./static/", import.meta.url),
                          ),
                          ...application.configuration.staticPaths,
                        ]
                          .map(
                            (staticPath) => caddyfile`
                            route {
                                root * ${JSON.stringify(
                                  path.resolve(staticPath),
                                )}
                              @file_exists file
                              route @file_exists {
                                header Cache-Control "public, max-age=31536000, immutable"
                                file_server
                              }
                            }
                          `,
                          )
                          .join("\n\n")}
                        route /files/* {
                          root * ${JSON.stringify(
                            path.resolve(
                              application.configuration.dataDirectory,
                            ),
                          )}
                          @file_exists file
                          route @file_exists {
                            header Cache-Control "private, max-age=31536000, immutable"
                            @must_be_downloaded not path *.webp *.webm *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf *.txt
                            header @must_be_downloaded Content-Disposition attachment
                            @may_be_embedded_in_other_sites path *.webp *.webm *.png *.jpg *.jpeg *.gif *.mp3 *.mp4 *.m4v *.ogg *.mov *.mpeg *.avi *.pdf
                            header @may_be_embedded_in_other_sites Cross-Origin-Resource-Policy cross-origin
                            file_server
                          }
                        }
                        reverse_proxy ${application.ports.web
                          .map((port) => `http://127.0.0.1:${port}`)
                          .join(" ")} {
                          lb_retries 1
                        }
                      }
                      handle_errors {
                        import common
                      }
                    }

                    http://127.0.0.1:${application.ports.webEventsAny} {
                      bind 127.0.0.1
                      reverse_proxy ${application.ports.webEvents
                        .map((port) => `http://127.0.0.1:${port}`)
                        .join(" ")} {
                        lb_retries 1
                      }
                    }

                    http://127.0.0.1:${application.ports.workerEventsAny} {
                      bind 127.0.0.1
                      reverse_proxy ${application.ports.workerEvents
                        .map((port) => `http://127.0.0.1:${port}`)
                        .join(" ")} {
                        lb_retries 1
                      }
                    }

                    ${
                      application.configuration.demonstration
                        ? caddyfile`
                            https://${application.configuration.hostname}:8000 {
                              reverse_proxy http://127.0.0.1:8001 {
                                lb_retries 1
                              }
                            }
                          `
                        : caddyfile``
                    }

                    ${[
                      ...(application.configuration.tunnel
                        ? []
                        : [application.configuration.hostname]),
                      ...application.configuration.alternativeHostnames,
                    ]
                      .map(
                        (hostname) => caddyfile`
                          http://${hostname} {
                            import common
                            redir https://${hostname}{uri} 308
                            handle_errors {
                              import common
                            }
                          }
                        `,
                      )
                      .join("\n\n")}

                    ${application.configuration.alternativeHostnames
                      .map(
                        (hostname) => caddyfile`
                          https://${hostname} {
                            import common
                            redir https://${application.configuration.hostname}{uri} 307
                            handle_errors {
                              import common
                            }
                          }
                        `,
                      )
                      .join("\n\n")}

                    ${application.configuration.caddy}
                  `,
                },
              },
              ...(application.configuration.demonstration
                ? await (async () => {
                    application.log(
                      "DEMONSTRATION INBOX",
                      `https://${application.configuration.hostname}:8000`,
                    );
                    const emailsDirectory = path.join(
                      application.configuration.dataDirectory,
                      "emails",
                    );
                    await fs.mkdir(emailsDirectory, { recursive: true });
                    return [
                      {
                        file: "maildev",
                        arguments: [
                          "--web",
                          "8001",
                          "--smtp",
                          "8002",
                          "--mail-directory",
                          emailsDirectory,
                          "--ip",
                          "127.0.0.1",
                        ],
                        options: {
                          preferLocal: true,
                          stdout: "ignore",
                          stderr: "ignore",
                        },
                      },
                    ];
                  })()
                : []),
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
                    } as any,
                  );
                  childProcesses.add(childProcess);
                  const childProcessResult = await childProcess;
                  application.log(
                    "CHILD PROCESS RESULT",
                    JSON.stringify(childProcessResult, undefined, 2),
                  );
                  childProcesses.delete(childProcess);
                }
              })();
            await eventLoopActive;
            restartChildProcesses = false;
            for (const childProcess of childProcesses)
              childProcess.kill(undefined, {
                forceKillAfterTimeout: 20 * 1000,
              });
            break;
          }

          case "web": {
            application.web.emit("start");
            application.webEvents.emit("start");
            const webServer = application.web.listen(
              application.ports.web[application.process.number],
              "127.0.0.1",
            );
            const webEventsServer = application.webEvents.listen(
              application.ports.webEvents[application.process.number],
              "127.0.0.1",
            );
            await eventLoopActive;
            webServer.close();
            webEventsServer.close();
            application.web.emit("stop");
            application.webEvents.emit("stop");
            break;
          }

          case "worker": {
            application.workerEvents.emit("start");
            const workerEventsServer = application.workerEvents.listen(
              application.ports.workerEvents[application.process.number],
              "127.0.0.1",
            );
            await eventLoopActive;
            workerEventsServer.close();
            application.workerEvents.emit("stop");
            break;
          }
        }

        await timers.setTimeout(10 * 1000, undefined, { ref: false });
        process.exit(1);
      },
    )
    .parseAsync();
}
