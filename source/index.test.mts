import path from "node:path";
import childProcess from "node:child_process";
import test from "node:test";
import assert from "node:assert/strict";
import * as playwright from "playwright";

test(async () => {
  const server = childProcess.spawn(
    "node",
    [
      path.join(import.meta.dirname, "index.mjs"),
      path.join(import.meta.dirname, "../configuration/development.mjs"),
    ],
    {
      env: {
        ...process.env,
        DOTENV_CONFIG_QUIET: "true",
      },
      stdio: "inherit",
    },
  );
  while (true)
    try {
      if ((await fetch("https://localhost/_health")).status !== 200)
        throw new Error();
      break;
    } catch {}
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // // The actual interesting bit
  // await context.route("**.jpg", (route) => route.abort());
  await page.goto("https://localhost/");

  // await context.close();
  // await browser.close();
  // server.kill();
});
