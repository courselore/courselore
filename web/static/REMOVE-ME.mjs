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
