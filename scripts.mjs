import * as transformers from "@huggingface/transformers";

if (process.argv[2] === "postinstall") {
  await transformers.pipeline(
    "feature-extraction",
    "nomic-ai/nomic-embed-text-v1.5",
  );
}
