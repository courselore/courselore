import * as transformers from "@huggingface/transformers";

const classifier = await transformers.pipeline(
  "sentiment-analysis",
  "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
  { dtype: "q8" },
);

const classification = (await classifier(`I’m loving this course!`))[0];

console.log(
  classification.label === "POSITIVE"
    ? classification.score
    : -classification.score,
);
