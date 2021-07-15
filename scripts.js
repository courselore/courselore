switch (process.argv[2]) {
  case "postinstall":
    const path = require("path");
    const execa = require("execa");
    const download = require("download");

    (async () => {
      await execa("npm", ["install"], { cwd: path.join(__dirname, "public") });

      await download(
        `https://github.com/caddyserver/caddy/releases/download/v2.4.3/caddy_2.4.3_${
          { win32: "windows", darwin: "mac", linux: "linux" }[process.platform]
        }_${{ x64: "amd64", arm64: "arm64", arm: "arm" }[process.arch]}${
          process.arch === "arm"
            ? `v${process.config.variables.arm_version}`
            : ""
        }.${process.platform === "win32" ? ".zip" : "tar.gz"}`,
        path.join(__dirname, "node_modules/.bin/"),
        {
          extract: true,
          filter: (file) => file.path.includes("caddy"),
        }
      );
    })();
    break;

  case "start:development":
    const concurrently = require("concurrently");
    concurrently([
      "node-dev src/index.ts",
      `caddy reverse-proxy --from ${
        process.env.URL ?? "https://localhost:5000"
      } --to localhost:4000`,
    ]);
    break;
}
