import * as transformers from "@huggingface/transformers";

const classifier = await transformers.pipeline(
  "sentiment-analysis",
  "Xenova/twitter-roberta-base-sentiment-latest",
  { dtype: "q8" },
);

console.log(
  await classifier(`
How do we unroll nested tags and calculate average score per tag in the aggregation pipeline for Task 3?

Unfortunately I’m really having a hard time with this.
`),
);
