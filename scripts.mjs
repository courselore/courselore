import * as transformers from "@huggingface/transformers";

if (process.argv[2] === "postinstall") {
  await transformers.pipeline(
    "feature-extraction",
    "Xenova/bge-small-en-v1.5",
    { dtype: "q8" },
  );
  await transformers.AutoTokenizer.from_pretrained(
    "Xenova/ms-marco-MiniLM-L-6-v2",
  );
  await transformers.AutoModelForSequenceClassification.from_pretrained(
    "Xenova/ms-marco-MiniLM-L-6-v2",
    { dtype: "q8" },
  );
  await transformers.pipeline(
    "sentiment-analysis",
    "Xenova/twitter-roberta-base-sentiment-latest",
    { dtype: "q8" },
  );
} else throw new Error();
