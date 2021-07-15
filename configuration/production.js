module.exports = async (require) => {
  if (process.argv[3] === undefined) {
    const os = require("os");
    const fs = require("fs-extra");
    const execa = require("execa");
    const caddyfile = require("dedent");
    const caddyfilePath = path.join(os.tmpdir(), "Caddyfile");
    await fs.writeFile(
      caddyfilePath,
      caddyfile`
        courselore.org {
          reverse_proxy 127.0.0.1:4000
        }
  
        www.courselore.org, courselore.com, www.courselore.com {
          redir https://courselore.org{uri}
        }
      `
    );
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
        env: { NODE_ENV: "production" },
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
    const express = require("express");
    const courselore = require(".").default;
    const customization = require(path.join(__dirname, "customization"))(
      require
    );
    const app = await courselore(path.join(__dirname, "data"));
    app.locals.settings.url = "https://courselore.org";
    app.locals.settings.administrator = "mailto:administrator@courselore.org";
    express().use(customization(app)).use(app).listen(4000, "127.0.0.1");
  }
};
