module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const cookieSession = require("cookie-session");
  const { sql } = require("@leafac/sqlite");
  const AutoEncrypt = require("@small-tech/auto-encrypt");
  const courselore = require(".").default;
  const website = require("../website/src/index")(require);

  const app = await courselore(__dirname);

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
  reverseProxy.use(website(app));
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
        settingsPath: path.join(__dirname, "var/keys/tls"),
      },
      reverseProxy
    )
    .listen(443);
};
