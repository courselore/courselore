module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const execa = require("execa");
  const courselore = require(".").default;
  const customization = require(__dirname)(require);

  const app = await courselore(path.join(__dirname, "../data"));
  app.locals.settings.url = "https://leafac.local";

  const server = express()
    .use(customization(app))
    .use(app)
    .listen(4000, "127.0.0.1");
  await execa(
    "caddy",
    [
      "reverse-proxy",
      "--from",
      app.locals.settings.url,
      "--to",
      "127.0.0.1:4000",
    ],
    { preferLocal: true, stdio: "inherit" }
  );
  server.close();
};
