import util from "node:util";
import path from "node:path";
import os from "node:os";
import url from "node:url";
import fs from "node:fs/promises";
import fsCallback from "node:fs";
import crypto from "node:crypto";
import "@radically-straightforward/node";
import server from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as cryptography from "@radically-straightforward/cryptography";
import { Database } from "@radically-straightforward/sqlite";
import natural from "natural";
import * as SAML from "@node-saml/node-saml";
import selfsigned from "selfsigned";
import * as sqliteVec from "sqlite-vec";
import nodemailer from "nodemailer";
import * as smtpServer from "smtp-server";
import applicationLayouts, { ApplicationLayouts } from "./layouts.mjs";
import applicationAuthentication, {
  ApplicationAuthentication,
} from "./authentication.mjs";
import applicationHomepage from "./homepage.mjs";
import applicationSystemSettings from "./system-settings.mjs";
import applicationUsers, { ApplicationUsers } from "./users.mjs";
import applicationCourses, { ApplicationCourses } from "./courses.mjs";
import applicationCourseForumConversations, {
  ApplicationCourseForumConversations,
} from "./course-forum-conversations.mjs";
import applicationCourseForumConversationMessages, {
  ApplicationCourseForumConversationMessages,
} from "./course-forum-conversation-messages.mjs";
import applicationCourseForumConversationMessageContent, {
  ApplicationCourseForumConversationMessageContent,
} from "./course-forum-conversation-message-content.mjs";
import applicationEmails from "./emails.mjs";
import applicationErrors from "./errors.mjs";
import applicationDatabase from "./database.mjs";

export type Application = {
  version: string;
  commandLineArguments: {
    values: {
      type: "initialize" | "webServer" | "emailServer" | "backgroundJobWorker";
      port: undefined | string;
    };
    positionals: string[];
  };
  userConfiguration: {
    hostname: string;
    systemAdministratorEmail: string | undefined;
    email: {
      send: {
        from: string;
        nodemailerCreateTransportOptions: Parameters<
          typeof nodemailer.createTransport
        >[0];
      };
      receive: {
        hostname: string;
        key: string;
        certificate: string;
      };
    };
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
    courseAIProviders?: ({
      domains: string[];
    } & (
      | {
          type: "openAI" | "anthropic" | "google";
          apiKey: string;
        }
      | {
          type: "openAICompatible";
          apiKey: string;
          baseURL: string;
          model: string;
        }
    ))[];
  };
  applicationConfiguration: {
    ports: number[];
    stopWords: Set<string>;
    secretKey: crypto.KeyObject;
  };
  database: Database;
  webServer: undefined | ReturnType<typeof server>;
  layouts: {};
  partials: {};
  emailServer: undefined | smtpServer.SMTPServer;
} & ApplicationLayouts &
  ApplicationAuthentication &
  ApplicationUsers &
  ApplicationCourses &
  ApplicationCourseForumConversations &
  ApplicationCourseForumConversationMessages &
  ApplicationCourseForumConversationMessageContent;
const application = {} as Application;
application.version = "10.3.1";
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
if (
  application.commandLineArguments.values.type === "initialize" &&
  typeof application.userConfiguration.secretKey !== "string"
) {
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
                  Temporal.Now.zonedDateTimeISO().add({ years: 1000 })
                    .epochMilliseconds,
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
application.database = new Database(
  path.join(application.userConfiguration.dataDirectory, "courselore.db"),
).loadExtension(sqliteVec.getLoadablePath());
if (application.commandLineArguments.values.type === "webServer")
  application.webServer = server({
    port: Number(application.commandLineArguments.values.port),
    csrfProtectionExceptionPathname: new RegExp(
      "(?:^/authentication/lti/initiate$)|(?:^/authentication/lti/callback$)|(?:^/authentication/saml/assertion-consumer-service$)",
    ),
  });
application.layouts = {} as Application["layouts"];
application.partials = {} as Application["partials"];

utilities.log(
  "COURSELORE",
  "START",
  application.commandLineArguments.values.type,
  ...(application.commandLineArguments.values.type === "initialize"
    ? [application.version, `https://${application.userConfiguration.hostname}`]
    : []),
  application.commandLineArguments.values.port ?? "",
);
process.once("beforeExit", () => {
  utilities.log(
    "COURSELORE",
    "STOP",
    application.commandLineArguments.values.type,
    application.commandLineArguments.values.port ?? "",
  );
});

await applicationLayouts(application);
await applicationAuthentication(application);
await applicationHomepage(application);
await applicationSystemSettings(application);
await applicationUsers(application);
await applicationCourses(application);
await applicationCourseForumConversations(application);
await applicationCourseForumConversationMessages(application);
await applicationCourseForumConversationMessageContent(application);
await applicationEmails(application);
await applicationErrors(application);
await applicationDatabase(application);

if (application.commandLineArguments.values.type === "initialize")
  fsCallback.writeSync(3, JSON.stringify(application));
