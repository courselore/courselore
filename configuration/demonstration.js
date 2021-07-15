module.exports = async (require) => {
  const url = process.env.URL ?? "https://localhost:5000";
  if (process.argv[3] === undefined) {
    const execa = require("execa");
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
      }),
      execa(
        "caddy",
        ["reverse-proxy", "--from", url, "--to", "localhost:4000"],
        { preferLocal: true, stdio: "inherit" }
      ),
    ];
    await Promise.any(subprocesses);
    for (const subprocess of subprocesses) subprocess.cancel();
  } else {
    const path = require("path");
    const express = require("express");
    const courselore = require(".").default;
    const app = await courselore(path.join(process.cwd(), "data"));
    app.locals.settings.url = url;
    express().use(app).listen(4000, "127.0.0.1");
  }
};
