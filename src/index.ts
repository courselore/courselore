#!/usr/bin/env node

const VERSION = require("../package.json").version;

console.log(`CourseLore\nVersion: ${VERSION}`);

import path from "path";
import fsSync from "fs";
const CONFIGURATION_PATH = path.join(process.cwd(), "configuration.js");
if (fsSync.existsSync(CONFIGURATION_PATH))
  process.env.NODE_ENV ??= "production";
import express from "express";
import shelljs from "shelljs";
import Greenlock from "greenlock";
import GreenlockExpress from "greenlock-express";

export const app = express();

try {
  require(CONFIGURATION_PATH)(app, require);
  console.log(`Loaded configuration from ${CONFIGURATION_PATH}`);
} catch (error) {
  console.error(
    `Error: Failed to load configuration from ${CONFIGURATION_PATH}: ${error.message}`
  );
  app.set("courselore origin", "http://localhost:4000");
  app.set("courselore administrator email", "administrator@courselore.org");
}
const REQUIRED_SETTINGS = [
  "courselore origin",
  "courselore administrator email",
];
if (app.get("env") === "production" && app.get("courselore listen") !== false)
  REQUIRED_SETTINGS.push("courselore domains");
const missingRequiredSettings = REQUIRED_SETTINGS.filter(
  (setting) => app.get(setting) === undefined
);
if (missingRequiredSettings.length > 0) {
  console.error(
    `Error: Missing the following required settings (did you set them on ‘${CONFIGURATION_PATH}’?): ${missingRequiredSettings
      .map((setting) => `‘${setting}’`)
      .join(", ")}`
  );
  process.exit(1);
}

app.use(express.static(path.join(__dirname, "..", "static")));

if (require.main === module && app.get("courselore listen") !== false) {
  if (app.get("env") !== "production") {
    const origin = app.get("courselore origin");
    app.listen(Number(new URL(origin).port), () => {
      console.log(`Web server started at ${origin}`);
    });
  } else {
    const TLS_KEYS_DIRECTORY = path.join(process.cwd(), "keys", "tls");
    const greenlockOptions = {
      packageRoot: TLS_KEYS_DIRECTORY,
      packageAgent: `courselore/${VERSION}`,
      maintainerEmail: app.get("courselore administrator email"),
    };
    if (!fsSync.existsSync(TLS_KEYS_DIRECTORY))
      (async () => {
        shelljs.mkdir("-p", TLS_KEYS_DIRECTORY);
        const greenlock = Greenlock.create(greenlockOptions);
        await greenlock.manager.defaults({
          agreeToTerms: true,
          subscriberEmail: app.get("courselore administrator email"),
        });
        const domains = app.get("courselore domains");
        await greenlock.add({
          subject: domains[0],
          altnames: domains,
        });
        console.log(
          "TLS keys configured. Restart CourseLore. Shutting down now..."
        );
        process.exit();
      })();
    else {
      GreenlockExpress.init(greenlockOptions).serve(app);
    }
  }
}
