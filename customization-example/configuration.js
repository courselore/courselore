module.exports = async (require) => {
  const path = require("path");
  const fs = require("fs-extra");
  const express = require("express");
  const courselore = require(".").default;
  const customization = require(__dirname)(require);

  await fs.writeFile(
    path.join(__dirname, "../public/avatar.svg"),
    customization.art({ size: 200, order: 4, strokeWidth: 2 })
  );
  await fs.writeFile(
    path.join(__dirname, "../public/logo.svg"),
    customization.art({ size: 30, order: 3, strokeWidth: 1 })
  );

  const app = await courselore(path.join(__dirname, "../data"));

  const reverseProxy = express();

  reverseProxy.use(customization(app));
  reverseProxy.use(app);

  reverseProxy.listen(new URL(app.locals.settings.url).port, () => {
    console.log(`Server started at ${app.locals.settings.url}`);
  });
};
