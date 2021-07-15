module.exports = async (require) => {
  const path = require("path");
  const express = require("express");
  const courselore = require(".").default;
  const customization = require(path.join(__dirname, "customization-example"))(
    require
  );

  const app = await courselore(path.join(process.cwd(), "data"));
  if (process.env.URL !== undefined) app.locals.settings.url = process.env.URL;
  express().use(customization(app)).use(app).listen(4000, "127.0.0.1");
};
