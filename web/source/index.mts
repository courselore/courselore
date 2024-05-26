import util from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import caddyfile from "@radically-straightforward/caddy";
import * as caddy from "@radically-straightforward/caddy";
import * as argon2 from "argon2";
import database, { ApplicationDatabase } from "./database.mjs";

export type Application = {
  commandLineArguments: {
    values: {
      type: undefined | "server" | "background-job";
      port: undefined | string;
    };
    positionals: string[];
  };
  configuration: {
    hostname: string;
    systemAdministratorEmail: string;
    dataDirectory: string;
    environment: "production" | "development";
    hstsPreload: boolean;
    extraCaddyfile: string;
    ports: number[];
    argon2: argon2.Options
  };
  server: undefined | ReturnType<typeof server>;
} & ApplicationDatabase;
const application = {} as Application;
application.commandLineArguments = util.parseArgs({
  options: {
    type: { type: "string" },
    port: { type: "string" },
  },
  allowPositionals: true,
}) as Application["commandLineArguments"];
application.configuration = (
  await import(path.resolve(application.commandLineArguments.positionals[0]))
).default;
application.configuration.dataDirectory ??= path.resolve("./data/");
await fs.mkdir(application.configuration.dataDirectory, { recursive: true });
application.configuration.environment ??= "production";
application.configuration.hstsPreload ??= false;
application.configuration.extraCaddyfile ??= caddyfile``;
application.configuration.ports = Array.from(
  { length: os.availableParallelism() },
  (value, index) => 18000 + index,
);
application.configuration.argon2 = {
  type: argon2.argon2id,
  memoryCost: 12288,
  timeCost: 3,
  parallelism: 1,
};
if (application.commandLineArguments.values.type === "server")
  application.server = server({
    port: Number(application.commandLineArguments.values.port),
    csrfProtectionExceptionPathname: new RegExp(
      "^/saml/[a-z0-9-]+/(assertion-consumer-service|single-logout-service)$",
    ),
  });

utilities.log(
  "COURSELORE",
  "9.0.0",
  "START",
  application.commandLineArguments.values.type ??
    application.configuration.hostname,
  application.commandLineArguments.values.port ?? "",
);
process.once("beforeExit", () => {
  utilities.log(
    "COURSELORE",
    "STOP",
    application.commandLineArguments.values.type ??
      application.configuration.hostname,
    application.commandLineArguments.values.port ?? "",
  );
});

await database(application);

if (application.commandLineArguments.values.type === undefined) {
  for (const port of application.configuration.ports) {
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          process.argv[1],
          ...application.commandLineArguments.positionals,
          "--type",
          "server",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: application.configuration.environment,
          },
          stdio: "inherit",
        },
      ),
    );
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          process.argv[1],
          ...application.commandLineArguments.positionals,
          "--type",
          "background-job",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: application.configuration.environment,
          },
          stdio: "inherit",
        },
      ),
    );
  }
  caddy.start({
    ...application.configuration,
    untrustedStaticFilesRoots: [
      `/files/* "${path.join(process.cwd(), "data")}"`,
    ],
  });
}
