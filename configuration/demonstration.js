module.exports = async (require) => {
  const url = process.env.URL ?? "https://localhost:5000";
  if (process.argv[3] === undefined) {
    const os = require("os");
    const path = require("path");
    const fs = require("fs-extra");
    const execa = require("execa");
    const caddyfile = require("dedent");
    const caddyfilePath = path.join(os.tmpdir(), "Caddyfile");
    await fs.writeFile(
      caddyfilePath,
      caddyfile`
        ${url}
        reverse_proxy 127.0.0.1:4000
        encode zstd gzip
      `
    );
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
      }),
      execa("caddy", ["run", "--config", caddyfilePath], {
        preferLocal: true,
        stdio: "inherit",
      }),
    ];
    await Promise.any(subprocesses);
    for (const subprocess of subprocesses) subprocess.cancel();
  } else {
    const path = require("path");
    const courselore = require(".").default;
    const { version } = require("../package.json");
    const app = await courselore(path.join(process.cwd(), "data"));
    app.locals.settings.url = url;
    app.listen(4000, "127.0.0.1", () => {
      console.log(
        `CourseLore/${version} started at ${app.locals.settings.url}`
      );
    });
  }
};
