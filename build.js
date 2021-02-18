const process = require("process");
const fs = require("fs");
const path = require("path");
const shell = require("shelljs");
const archiver = require("archiver");

shell.exec("npx tsc");
shell.exec("npm prune --production");
shell.exec("npm dedupe");
shell.cp(process.execPath, "node_modules/.bin/");

const packageFile = path.join(shell.tempdir(), "courselore.zip");
console.log(`::set-output name=package::${packageFile}`);

const package = archiver("zip");
package.pipe(fs.createWriteStream(packageFile));
package.directory(".", "courselore/src");
if (process.platform !== "win32")
  package.append(
    `#!/usr/bin/env sh
"$(dirname "$0")/src/node_modules/.bin/node" "$(dirname "$0")/src/lib/index.js" "$(dirname "$0")/configuration.js"
`,
    { name: "courselore/courselore", mode: 0o755 }
  );
else
  package.append(`"src\\node_modules\\.bin\\node.exe" "src\\lib\\index.js"`, {
    name: "courselore/courselore.cmd",
  });

package.finalize();
