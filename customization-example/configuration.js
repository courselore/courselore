module.exports = (require) => {
  const path = require("path");
  const fs = require("fs");
  const express = require("express");
  const courselore = require(".").default;
  const customization = require(__dirname)(require);

  fs.writeFileSync(
    path.join(__dirname, "../public/avatar.svg"),
    customization.art({ size: 200, order: 4, strokeWidth: 2 })
  );
  fs.writeFileSync(
    path.join(__dirname, "../public/logo.svg"),
    customization.art({ size: 30, order: 3, strokeWidth: 1 })
  );

  const app = courselore(path.join(__dirname, "../data"));

  const reverseProxy = express();

  reverseProxy.use(customization(app));
  reverseProxy.use(app);

  reverseProxy.listen(new URL(app.get("url")).port, () => {
    console.log(`Server started at ${app.get("url")}`);
  });
};
