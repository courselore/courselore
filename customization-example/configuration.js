module.exports = async (require) => {
  const path = require("path");
  const fs = require("fs/promises");
  const express = require("express");
  const cookieSession = require("cookie-session");
  const { sql } = require("@leafac/sqlite");
  const courselore = require(".").default;
  const customization = require(path.join(__dirname, "index"))(require);

  const app = await courselore(path.join(__dirname, ".."));

  try {
    await require(path.join(__dirname, "./configuration.local.js"))(require)(
      app
    );
  } catch (error) {
    if (error.code !== "MODULE_NOT_FOUND") throw error;
  }

  const reverseProxy = express();

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

  reverseProxy.listen(new URL(app.get("url")).port, () => {
    console.log(
      `Demonstration/Development web server started at ${app.get("url")}`
    );
  });

  await fs.writeFile(
    path.join(__dirname, "../public/avatar.svg"),
    customization.art({ size: 200, order: 4, strokeWidth: 2 })
  );
  await fs.writeFile(
    path.join(__dirname, "../public/logo.svg"),
    customization.art({ size: 30, order: 3, strokeWidth: 1 })
  );
};
