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
import users, { ApplicationUsers } from "./users.mjs";
import courses, { ApplicationCourses } from "./courses.mjs";
import courseConversations, {
  ApplicationCourseConversation,
} from "./course-conversations.mjs";
import courseConversationMessages from "./course-conversation-messages.mjs";

export type Application = {
  version: string;
  commandLineArguments: {
    values: {
      type: undefined | "server" | "backgroundJob";
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
    tunnel: boolean;
    ports: number[];
    argon2: argon2.Options;
  };
  server: undefined | ReturnType<typeof server>;
} & ApplicationDatabase &
  ApplicationUsers &
  ApplicationCourses &
  ApplicationCourseConversation;
const application = {} as Application;
application.version = "9.0.0";
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
    csrfProtectionExceptionPathname: new RegExp("^TODO$"),
  });

utilities.log(
  "COURSELORE",
  application.version,
  "START",
  application.commandLineArguments.values.type ??
    `https://${application.configuration.hostname}`,
  application.commandLineArguments.values.port ?? "",
);
process.once("beforeExit", () => {
  utilities.log(
    "COURSELORE",
    "STOP",
    application.commandLineArguments.values.type ??
      `https://${application.configuration.hostname}`,
    application.commandLineArguments.values.port ?? "",
  );
});

await database(application);
// TODO
application.server?.push({
  handler: (request, response) => {
    if (
      request.liveConnection?.establish &&
      request.liveConnection.skipUpdateOnEstablish
    )
      response.end();
  },
});
await users(application);
await courses(application);
await courseConversations(application);
await courseConversationMessages(application);

// TODO
if (application.commandLineArguments.values.type === "backgroundJob")
  setInterval(() => {}, 1000);

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
          "backgroundJob",
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
