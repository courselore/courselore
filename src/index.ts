#!/usr/bin/env node

import path from "path";
import express from "express";
import html from "tagged-template-noop";

type HTML = string;

export const app = express()
  .set(
    "layout",
    (head: HTML, body: HTML): HTML =>
      html`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1.0"
            />
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
                margin: 1em auto;
                -webkit-text-size-adjust: 100%;
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
      `.trimLeft()
  )
  .use(express.static(path.join(__dirname, "../public")));

if (require.main === module) {
  app
    .set("version", require("../package.json").version)
    .set("require", require);

  console.log(`CourseLore\nVersion: ${app.get("version")}`);

  const CONFIGURATION_FILE = path.join(
    process.argv[2] ?? process.cwd(),
    "configuration.js"
  );
  try {
    require(CONFIGURATION_FILE)(app);
    console.log(`Loaded configuration from ‘${CONFIGURATION_FILE}’`);
  } catch (error) {
    console.error(
      `Error: Failed to load configuration at ‘${CONFIGURATION_FILE}’: ${error.message}`
    );
    if (app.get("env") === "development")
      app
        .set("url", "http://localhost:4000")
        .set("administrator email", "administrator@courselore.org")
        .listen(new URL(app.get("url")).port, () => {
          console.log(`Development web server started at ${app.get("url")}`);
        });
  }
  const REQUIRED_SETTINGS = ["url", "administrator email"];
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
}
