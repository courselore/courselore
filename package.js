const os = require("os");
const path = require("path");
const fs = require("fs");
const shell = require("shelljs");

const buildDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "build-"));
const courseloreDirectory = path.join(buildDirectory, "courselore");
const srcDirectory = path.join(courseloreDirectory, "src");

console.log(buildDirectory);

shell.mkdir("-p", srcDirectory);
shell.cp("-R", ".", srcDirectory);

shell.cd(srcDirectory);
shell.exec("npm install");
shell.exec("npm run prepare");
shell.exec("npm prune --production");
shell.exec("npm dedupe");
shell.rm("-rf", ".git");
shell.cp(process.execPath, "node_modules/.bin/");

fs.writeFileSync(
  path.join(courseloreDirectory, "courselore"),
  `#!/usr/bin/env sh
ROOT_DIRECTORY=$(dirname "$0")
"$ROOT_DIRECTORY/src/node_modules/.bin/node" "$ROOT_DIRECTORY/src/lib/index.js" "$ROOT_DIRECTORY/configuration.js"
`,
  { mode: 755 }
);

shell.cd(buildDirectory);
shell.exec(`tar -czf "${path.join(__dirname, "courselore.tar.gz")}" courselore`);
