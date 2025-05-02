import util from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import * as caddy from "@radically-straightforward/caddy";
import * as argon2 from "argon2";
import database, { ApplicationDatabase } from "./database.mjs";
import layouts, { ApplicationLayouts } from "./layouts.mjs";
import authentication, {
  ApplicationAuthentication,
} from "./authentication.mjs";
import users, { ApplicationUsers } from "./users.mjs";
import courses, { ApplicationCourses } from "./courses.mjs";
import courseConversations, {
  ApplicationCourseConversation,
} from "./course-conversations.mjs";
import courseConversationMessages, {
  ApplicationCourseConversationMessages,
} from "./course-conversation-messages.mjs";
import courseConversationMessageContent, {
  ApplicationCourseConversationMessageContent,
} from "./course-conversation-message-content.mjs";
import emails from "./emails.mjs";
import errors from "./errors.mjs";

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
    systemAdministratorEmail: string | undefined;
    email: any;
    dataDirectory: string;
    environment: "production" | "development";
    hstsPreload?: boolean;
    extraCaddyfile?: string;
  };
  privateConfiguration: {
    ports: number[];
    argon2: argon2.Options;
  };
  server: undefined | ReturnType<typeof server>;
  layouts: {};
  partials: {};
} & ApplicationDatabase &
  ApplicationLayouts &
  ApplicationAuthentication &
  ApplicationUsers &
  ApplicationCourses &
  ApplicationCourseConversation &
  ApplicationCourseConversationMessages &
  ApplicationCourseConversationMessageContent;
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
application.privateConfiguration = {} as Application["privateConfiguration"];
application.privateConfiguration.ports = Array.from(
  { length: os.availableParallelism() },
  (value, index) => 18000 + index,
);
application.privateConfiguration.argon2 = {
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
application.layouts = {} as Application["layouts"];
application.partials = {} as Application["partials"];

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
await layouts(application);
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
await authentication(application);
await users(application);
await courses(application);
await courseConversations(application);
await courseConversationMessages(application);
await courseConversationMessageContent(application);
await emails(application);
await errors(application);

if (application.commandLineArguments.values.type === undefined) {
  for (const port of application.privateConfiguration.ports) {
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        process.argv[0],
        [
          "--enable-source-maps",
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
          "--enable-source-maps",
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
    ...application.privateConfiguration,
    untrustedStaticFilesRoots: [
      `/files/* "${application.configuration.dataDirectory}"`,
    ],
  });
  if (application.configuration.environment === "development") {
    utilities.log("MAILDEV", "http://localhost:8000");
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        "npx",
        [
          "maildev",
          "--ip",
          "127.0.0.1",
          "--web",
          "8000",
          "--smtp",
          "8025",
          "--mail-directory",
          path.join(application.configuration.dataDirectory, "emails"),
        ],
        { stdio: "ignore" },
      ),
    );
    utilities.log("SAML-IDP", "http://localhost:8001");
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        "npx",
        [
          "saml-idp",
          "--host",
          "localhost",
          "--port",
          "8001",
          "--key",
          path.join(
            import.meta.dirname,
            "../configuration/development/saml-idp/private-key.pem",
          ),
          "--cert",
          path.join(
            import.meta.dirname,
            "../configuration/development/saml-idp/certificate.pem",
          ),
          "--issuer",
          `https://${application.configuration.hostname}:8001/metadata`,
          "--acsUrl",
          `https://${application.configuration.hostname}/authentication/saml/courselore-university/assertion-consumer-service`,
          "--sloUrl",
          `https://${application.configuration.hostname}/authentication/saml/courselore-university/single-logout-service`,
          "--audience",
          `https://${application.configuration.hostname}/authentication/saml/courselore-university/metadata`,
          "--configFile",
          path.join(
            import.meta.dirname,
            "../configuration/development/saml-idp/configuration.cjs",
          ),
        ],
        { stdio: "ignore" },
      ),
    );
  }
}
