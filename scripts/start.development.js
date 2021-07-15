require("concurrently")([
  "node-dev src/index.ts",
  `caddy reverse-proxy --from ${
    process.env.URL ?? "https://localhost:5000"
  } --to localhost:4000`,
]);
