import util from "node:util";
import path from "node:path";
import os from "node:os";
import url from "node:url";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import * as cryptography from "@radically-straightforward/cryptography";
import * as caddy from "@radically-straightforward/caddy";
import natural from "natural";
import * as SAML from "@node-saml/node-saml";
import selfsigned from "selfsigned";
import database, { ApplicationDatabase } from "./database.mjs";
import layouts, { ApplicationLayouts } from "./layouts.mjs";
import authentication, {
  ApplicationAuthentication,
} from "./authentication.mjs";
import homepage from "./homepage.mjs";
import systemSettings from "./system-settings.mjs";
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
      type: undefined | "server" | "backgroundJobWorker";
      port: undefined | string;
    };
    positionals: string[];
  };
  userConfiguration: {
    hostname: string;
    systemAdministratorEmail: string | undefined;
    email: any;
    secretKey: string;
    dataDirectory: string;
    environment: "production" | "development";
    hstsPreload?: boolean;
    extraCaddyfile?: string;
    lti?: {
      privateKey: string;
      publicKey: string;
      platforms: {
        name: string;
        domains: string[];
        platformId: string;
        clientId: string;
        publicKeysetURL: string;
        authenticationRequestURL: string;
        accessTokenURL: string;
      }[];
    };
    saml?: {
      privateKey: string;
      publicKey: string;
      certificate: string;
      identityProviders: ({
        name: string;
        domains: string[];
        userData: (profile: SAML.Profile) => {
          email: string;
          name: string;
        };
      } & SAML.SamlConfig & { decryptionCert?: string })[];
    };
  };
  applicationConfiguration: {
    ports: number[];
    stopWords: Set<string>;
    secretKey: crypto.KeyObject;
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
application.version = "10.2.1";
application.commandLineArguments = util.parseArgs({
  options: {
    type: { type: "string" },
    port: { type: "string" },
  },
  allowPositionals: true,
}) as Application["commandLineArguments"];
application.userConfiguration = (
  await import(
    url.pathToFileURL(
      path.resolve(application.commandLineArguments.positionals[0]),
    ).href
  )
).default;
application.userConfiguration.dataDirectory ??= path.resolve("./data/");
await fs.mkdir(application.userConfiguration.dataDirectory, {
  recursive: true,
});
application.userConfiguration.environment ??= "production";
application.applicationConfiguration =
  {} as Application["applicationConfiguration"];
application.applicationConfiguration.ports = Array.from(
  {
    length:
      application.userConfiguration.environment === "development"
        ? 1
        : os.availableParallelism(),
  },
  (value, index) => 18000 + index,
);
application.applicationConfiguration.stopWords = new Set(
  natural.stopwords.map((stopWord) => utilities.normalizeToken(stopWord)),
);
if (typeof application.userConfiguration.secretKey !== "string") {
  const secretKey = cryptography.SymmetricEncryption.exportKey(
    await cryptography.SymmetricEncryption.generateKey(),
  );
  const ltiKeyPair = await cryptography.AsymmetricEncryption.generateKeyPair();
  const samlKeyPair = await cryptography.AsymmetricEncryption.generateKeyPair();
  console.log(
    JSON.stringify(
      {
        secretKey,
        lti: {
          privateKey: ltiKeyPair.privateKey,
          publicKey: ltiKeyPair.publicKey,
        },
        saml: {
          privateKey: samlKeyPair.privateKey,
          publicKey: samlKeyPair.publicKey,
          certificate: (
            await selfsigned.generate(
              [
                {
                  shortName: "CN",
                  value: application.userConfiguration.hostname,
                },
                { shortName: "O", value: "Courselore" },
                { shortName: "C", value: "US" },
                { shortName: "ST", value: "Maryland" },
                { shortName: "L", value: "Baltimore" },
              ],
              {
                keyPair: samlKeyPair,
                algorithm: "sha256",
                notAfterDate: new Date(
                  Date.now() + 1000 * 365 * 24 * 60 * 60 * 1000,
                ),
              },
            )
          ).cert,
        },
      },
      undefined,
      2,
    ),
  );
  process.exit();
}
application.applicationConfiguration.secretKey =
  cryptography.SymmetricEncryption.importKey(
    application.userConfiguration.secretKey,
  );
if (application.commandLineArguments.values.type === "server")
  application.server = server({
    port: Number(application.commandLineArguments.values.port),
    csrfProtectionExceptionPathname: new RegExp(
      "(?:^/authentication/lti/initiate$)|(?:^/authentication/lti/callback$)|(?:^/authentication/saml/assertion-consumer-service$)",
    ),
  });
application.layouts = {} as Application["layouts"];
application.partials = {} as Application["partials"];

utilities.log(
  "COURSELORE",
  application.version,
  "START",
  application.commandLineArguments.values.type ??
    `https://${application.userConfiguration.hostname}`,
  application.commandLineArguments.values.port ?? "",
);
process.once("beforeExit", () => {
  utilities.log(
    "COURSELORE",
    "STOP",
    application.commandLineArguments.values.type ??
      `https://${application.userConfiguration.hostname}`,
    application.commandLineArguments.values.port ?? "",
  );
});

await database(application);
await layouts(application);
await authentication(application);
await homepage(application);
await systemSettings(application);
await users(application);
await courses(application);
await courseConversations(application);
await courseConversationMessages(application);
await courseConversationMessageContent(application);
await emails(application);
await errors(application);

if (application.commandLineArguments.values.type === undefined) {
  for (const port of application.applicationConfiguration.ports) {
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
            NODE_ENV: application.userConfiguration.environment,
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
          "backgroundJobWorker",
          "--port",
          String(port),
        ],
        {
          env: {
            ...process.env,
            NODE_ENV: application.userConfiguration.environment,
          },
          stdio: "inherit",
        },
      ),
    );
  }
  caddy.start({
    ...application.userConfiguration,
    ...application.applicationConfiguration,
    untrustedStaticFilesRoots: [
      `/files/* "${application.userConfiguration.dataDirectory}"`,
    ],
  });
  if (application.userConfiguration.environment === "development")
    node.childProcessKeepAlive(() =>
      childProcess.spawn(
        path.join(import.meta.dirname, "../node_modules/.bin/maildev"),
        [
          "--web",
          "17000",
          "--smtp",
          "17001",
          "--mail-directory",
          path.join(application.userConfiguration.dataDirectory, "emails"),
        ],
        { stdio: "ignore" },
      ),
    );
}
