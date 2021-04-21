module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const AutoEncrypt = require("@small-tech/auto-encrypt");
  const courselore = require(".").default;
  const customization = require(path.join(__dirname, "customization"))(require);

  const app = await courselore(path.join(__dirname, "data"));

  app.locals.url = "https://courselore.org";
  app.locals.administrator = "mailto:administrator@courselore.org";

  const reverseProxy = express();

  reverseProxy.use((req, res, next) => {
    if (req.hostname !== new URL(app.locals.url).hostname)
      return res.redirect(`${app.locals.url}${req.originalUrl}`);
    next();
  });
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
        settingsPath: path.join(__dirname, "data/keys/tls"),
      },
      reverseProxy
    )
    .listen(443);
};
