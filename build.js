const process = require("process");
const fs = require("fs");
const shell = require("shelljs");
const archiver = require("archiver");

shell.exec("npx tsc");
shell.exec("npm prune --production");
shell.exec("npm dedupe");
shell.cp(process.execPath, "node_modules/.bin/");

const package = archiver("zip");
package.pipe(fs.createWriteStream("../courselore.zip"));
package.directory(".", "courselore/src");
package.append(
  `#!/usr/bin/env sh
export ROOT_DIRECTORY=$(dirname "$0")
env PATH="$ROOT_DIRECTORY/src/node_modules/.bin":$PATH node "$ROOT_DIRECTORY/src/lib/index.js" "$ROOT_DIRECTORY/configuration.js" "$@"
`,
  { name: "courselore/courselore", mode: 0o755 }
);
package.finalize();
