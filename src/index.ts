#!/usr/bin/env node

const VERSION = require("../package.json").version;

console.log(`CourseLore\nVersion: ${VERSION}`);

import path from "path";
import fsSync from "fs";
const CWD = process.argv[2] ?? process.cwd();
const CONFIGURATION_FILE = path.join(CWD, "courselore.js");
if (fsSync.existsSync(CONFIGURATION_FILE))
  process.env.NODE_ENV ??= "production";
import express from "express";
import shelljs from "shelljs";
import Greenlock from "greenlock";
import GreenlockExpress from "greenlock-express";
type HTML = string;
import html from "tagged-template-noop";

export const app = express();

app.set("courselore require", require);
let layout = (head: HTML | undefined, body: HTML): HTML =>
  html`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="shortcut icon" type="image/x-icon" href="/favicon.ico" />
        <style>
          /* https://pico-8.fandom.com/wiki/Palette */

          /* TODO: Remove unnecessary weights. */
          @import "node_modules/@fontsource/public-sans/100.css";
          @import "node_modules/@fontsource/public-sans/200.css";
          @import "node_modules/@fontsource/public-sans/300.css";
          @import "node_modules/@fontsource/public-sans/400.css";
          @import "node_modules/@fontsource/public-sans/500.css";
          @import "node_modules/@fontsource/public-sans/600.css";
          @import "node_modules/@fontsource/public-sans/700.css";
          @import "node_modules/@fontsource/public-sans/800.css";
          @import "node_modules/@fontsource/public-sans/900.css";

          body {
            line-height: 1.5;
            font-family: "Public Sans", sans-serif;
            max-width: 600px;
            padding: 0 1em;
            margin: 2em auto;
          }

          a {
            color: inherit;
          }

          a.undecorated {
            text-decoration: none;
          }

          h1 {
            line-height: 1.2;
            font-size: 1.5em;
            font-weight: 800;
            margin-top: 1.5em;
          }

          img,
          svg {
            max-width: 100%;
            height: auto;
          }

          figure {
            text-align: center;
            font-size: 1.1em;
          }

          header {
            text-align: center;
          }

          nav a {
            text-decoration: none;
          }
        </style>
        ${head ?? ""}
      </head>
      <body>
        ${body}
      </body>
    </html>
  `.trim();
app.set("courselore layout", layout);

try {
  require(CONFIGURATION_FILE)(app);
  console.log(`Loaded configuration from ${CONFIGURATION_FILE}`);
} catch (error) {
  console.error(
    `Error: Failed to load configuration from ${CONFIGURATION_FILE}: ${error.message}`
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
    `Error: Missing the following required settings (did you set them on ‘${CONFIGURATION_FILE}’?): ${missingRequiredSettings
      .map((setting) => `‘${setting}’`)
      .join(", ")}`
  );
  process.exit(1);
}
layout = app.get("courselore layout");

app.use(express.static(path.join(__dirname, "../static")));

if (require.main === module && app.get("courselore listen") !== false) {
  if (app.get("env") !== "production") {
    const origin = app.get("courselore origin");
    app.listen(Number(new URL(origin).port), () => {
      console.log(`Web server started at ${origin}`);
    });
  } else {
    const TLS_KEYS_DIRECTORY = path.join(CWD, "keys/tls");
    const greenlockOptions = {
      packageRoot: TLS_KEYS_DIRECTORY,
      packageAgent: `courselore/${VERSION}`,
      maintainerEmail: app.get("courselore administrator email"),
    };
    if (!fsSync.existsSync(TLS_KEYS_DIRECTORY))
      (async () => {
        shelljs.mkdir("-p", TLS_KEYS_DIRECTORY);
        const greenlockManager = Greenlock.create(greenlockOptions).manager;
        await greenlockManager.defaults({
          agreeToTerms: true,
          subscriberEmail: app.get("courselore administrator email"),
        });
        const domains = app.get("courselore domains");
        await greenlockManager.add({
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
