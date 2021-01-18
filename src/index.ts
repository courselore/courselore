#!/usr/bin/env node

import path from "path";

console.log(`CourseLore\nVersion: ${require("../package.json").version}`);

const configuration = {
  host: "http://localhost:5000",
  port: 5000,
};

const deploymentConfigurationPath = path.join(
  process.cwd(),
  "configuration.js"
);
try {
  Object.assign(configuration, require(deploymentConfigurationPath));
  console.log(
    `Loaded deployment configuration: ${deploymentConfigurationPath}`
  );
  process.env.NODE_ENV = "production";
} catch (error) {
  console.error(
    `Error: Failed to load deployment configuration at ‘${deploymentConfigurationPath}’: ${error.message}`
  );
}

console.log(`Configuration: ${JSON.stringify(configuration, undefined, 2)}`);

import express from "express";

const application = express();

application.use(express.static(path.join(process.cwd(), "static")));
application.use(express.static(path.join(__dirname, "..", "static")));

application.listen(configuration.port, () => {
  console.log("Web server started");
});
