import * as transformers from "@huggingface/transformers";

const reranker = await transformers.pipeline(
  "text-classification",
  "Xenova/ms-marco-MiniLM-L-6-v2",
  { dtype: "q8" },
);

console.log(
  (
    await Promise.all(
      [
        "Berlin has a population of 3,520,031 registered inhabitants in an area of 891.82 square kilometers.",
        "New York City is famous for the Metropolitan Museum of Art.",
      ].map(async (candidate) => {
        return {
          candidate,
          score: (
            await reranker({
              text: "How many people live in Berlin?",
              text_pair: candidate,
            })
          )[0].score,
        };
      }),
    )
  )
    .filter((item) => item.score >= 0.75)
    .sort((a, b) => b.score - a.score),
);
