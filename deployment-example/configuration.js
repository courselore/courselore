module.exports = async (require) => {
  const os = require("os");
  const path = require("path");
  const fs = require("fs-extra");
  const express = require("express");
  const execa = require("execa");
  const caddyfile = require("dedent");
  const courselore = require(".").default;
  const customization = require(path.join(__dirname, "customization"))(require);

  const app = await courselore(path.join(__dirname, "data"));

  app.locals.settings.url = "https://courselore.org";
  app.locals.settings.administrator = "mailto:administrator@courselore.org";

  const server = express()
    .use(customization(app))
    .use(app)
    .listen(4000, "127.0.0.1");

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
  await execa("caddy", ["run", "--config", caddyfilePath], {
    preferLocal: true,
    stdio: "inherit",
  });
  server.close();
};
