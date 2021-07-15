module.exports = async (require) => {
  const path = require("path");
  const fs = require("fs-extra");
  const concurrently = require("concurrently");
  const courselore = require(".").default;

  const app = await courselore(path.join(process.cwd(), "data"));
  switch (process.argv[3]) {
    case "server":
      const express = require("express");
      const customization = require(path.join(__dirname, "customization"))(
        require
      );
      express().use(customization(app)).use(app).listen(4000, "127.0.0.1");
      break;
    default:
      concurrently(
        [
          "node-dev src/index.ts",
          `caddy reverse-proxy --from ${
            process.env.URL ?? "https://localhost:5000"
          } --to localhost:4000`,
        ],
        { killOthers: ["success", "failure"] }
      );
  }
};
