import path from "node:path";
import childProcess from "node:child_process";
import * as node from "@radically-straightforward/node";
import * as caddy from "@radically-straightforward/caddy";

childProcess.spawn(
  process.argv[0],
  [
    "--enable-source-maps",
    path.join(import.meta.dirname, "application.mjs"),
    ...process.argv.slice(2),
    "--type",
    "initialize",
  ],
  {
    env: {
      ...process.env,
      DOTENV_CONFIG_QUIET: "true",
    },
    stdio: "inherit",
  },
);

for (const port of application.applicationConfiguration.ports)
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
          DOTENV_CONFIG_QUIET: "true",
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
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: application.userConfiguration.environment,
        DOTENV_CONFIG_QUIET: "true",
      },
      stdio: "inherit",
    },
  ),
);
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
      path.join(
        import.meta.dirname,
        `../node_modules/.bin/maildev${process.platform === "win32" ? ".cmd" : ""}`,
      ),
      [
        "--web",
        "17000",
        "--smtp",
        "17001",
        "--mail-directory",
        path.join(application.userConfiguration.dataDirectory, "emails"),
      ],
      {
        stdio: "ignore",
        ...(process.platform === "win32" ? { shell: true } : {}),
      },
    ),
  );
