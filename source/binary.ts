#!/usr/bin/env node

import path from "node:path";
import url from "node:url";

await (
  await import(
    process.argv[2] === undefined
      ? url.fileURLToPath(
          new URL("../configuration/development.mjs", import.meta.url)
        )
      : path.resolve(process.argv[2])
  )
).default({
  courseloreImport: async (modulePath: string) => await import(modulePath),
  courseloreImportMetaURL: import.meta.url,
});
