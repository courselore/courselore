import * as transformers from "@huggingface/transformers";

const rerankingModel =
  await transformers.AutoModelForSequenceClassification.from_pretrained(
    "Xenova/ms-marco-MiniLM-L-6-v2",
    { dtype: "q8" },
  );
const rerankingTokenizer = await transformers.AutoTokenizer.from_pretrained(
  "Xenova/ms-marco-MiniLM-L-6-v2",
);
// 1.5 is a good threshold

console.log(
  (
    await rerankingModel(
      rerankingTokenizer(
        ["How many people live in Berlin?", "How many people live in Berlin?"],
        {
          text_pair: [
            "Berlin has a population of 3,520,031 registered inhabitants in an area of 891.82 square kilometers.",
            "New York City is famous for the Metropolitan Museum of Art.",
          ],
          padding: true,
          truncation: true,
        },
      ),
    )
  ).logits.data,
);
