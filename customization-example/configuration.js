module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const courselore = require(".").default;
  const customization = require(__dirname)(require);

  const app = await courselore(path.join(__dirname, "../data"));
  app.locals.settings.url = "http://leafac.local:4000"

  const reverseProxy = express();

  reverseProxy.use(customization(app));
  reverseProxy.use(app);

  reverseProxy.listen(new URL(app.locals.settings.url).port, () => {
    console.log(`Server started at ${app.locals.settings.url}`);
  });
};
