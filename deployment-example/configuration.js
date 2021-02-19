module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const cookieSession = require("cookie-session");
  const { sql } = require("@leafac/sqlite");
  const AutoEncrypt = require("@small-tech/auto-encrypt");
  const courselore = require(".").default;
  const customization = require("../customization-example/index")(require);

  const ROOT_DIRECTORY = "/root/courselore";

  const app = await courselore(ROOT_DIRECTORY);

  app.set("url", "https://courselore.org");
  app.set("administrator email", "administrator@courselore.org");

  const reverseProxy = express();

  reverseProxy.use((req, res, next) => {
    if (req.hostname !== new URL(app.get("url")).hostname)
      res.redirect(`${app.get("url")}${req.originalUrl}`);
    else next();
  });
  reverseProxy.use(
    cookieSession({
      secret: app
        .get("runtime database")
        .get(
          sql`SELECT "value" FROM "settings" WHERE "key" = ${"cookieSecret"}`
        ).value,
    })
  );
  reverseProxy.use(customization(app));
  reverseProxy.use(app);

  AutoEncrypt.https
    .createServer(
      {
        domains: [
          "courselore.org",
          "www.courselore.org",
          "courselore.com",
          "www.courselore.com",
        ],
        settingsPath: path.join(ROOT_DIRECTORY, "var/keys/tls"),
      },
      reverseProxy
    )
    .listen(443);
};
