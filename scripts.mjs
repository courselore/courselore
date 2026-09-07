import * as transformers from "@huggingface/transformers";

if (process.argv[2] === "postinstall") {
  await transformers.pipeline(
    "feature-extraction",
    "Xenova/bge-small-en-v1.5",
    { dtype: "q8" },
  );
}
