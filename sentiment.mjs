import * as transformers from "@huggingface/transformers";

const classifier = await transformers.pipeline(
  "sentiment-analysis",
  "Xenova/distilbert-base-uncased-finetuned-sst-2-english",
  { dtype: "q8" },
);

const classification = (await classifier(`In Next.js App Router, when should we prefer Server Actions ('use server') over traditional Route Handlers (app/api/.../route.ts) for mutating database records?`))[0];

console.log(
  classification.label === "POSITIVE"
    ? classification.score
    : -classification.score,
);
