const esbuild = await import("esbuild");

const esbuildResult = await esbuild.build({
  absWorkingDir: url.fileURLToPath(new URL("../static/", import.meta.url)),
  entryPoints: ["bundle.mjs"],
  outdir: "bundle",
  entryNames: "[dir]/[name]-[hash]",

  loader: {
    ".woff2": "file",
    ".woff": "file",
    ".ttf": "file",
  },

  target: ["chrome100", "safari14", "edge100", "firefox100", "ios14"],

  bundle: true,
  minify: true,
  sourcemap: true,
  metafile: true,
});

for (const [javascriptBundle, { entryPoint, cssBundle }] of Object.entries(
  esbuildResult.metafile.outputs
))
  if (entryPoint === "bundle.mjs" && typeof cssBundle === "string")
    fs.writeFile(
      new URL("../static/bundle/entrypoints.json", import.meta.url),
      JSON.stringify(
        {
          cssBundle,
          javascriptBundle,
        },
        undefined,
        2
      )
    );
