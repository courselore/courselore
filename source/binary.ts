#!/usr/bin/env node

import path from "node:path";
import url from "node:url";

await (
  await import(
    process.argv[2] === undefined
      ? new URL("../configuration/default.mjs", import.meta.url).href
      : url.pathToFileURL(path.resolve(process.argv[2])).href
  )
).default({
  courseloreImport: async (modulePath: string) => await import(modulePath),
  courseloreImportMetaURL: import.meta.url,
});
