import test from "node:test";
import assert from "node:assert/strict";
import * as playwright from "playwright";

test(async () => {
  const browser = await playwright.chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // // The actual interesting bit
  // await context.route("**.jpg", (route) => route.abort());
  await page.goto("https://example.com/");

  // assert((await page.title()) === "Example Domain"); // 👎 not a Web First assertion

  // await context.close();
  // await browser.close();
});
