import * as transformers from "@huggingface/transformers";

const exampleGenerator = await transformers.pipeline(
  "text-generation",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  { dtype: "q4" },
);

console.log(
  JSON.parse(
    (
      await exampleGenerator(
        [
          {
            role: "system",
            content:
              "You are a helpful teaching assistant generating realistic database seed data. Return ONLY JSON with `title` and `content` keys.",
          },
          {
            role: "user",
            content:
              "Generate a realistic student forum question about principles of programming languages.",
          },
        ],
        {
          max_new_tokens: 150,
          temperature: 0.7,
          do_sample: true,
        },
      )
    )[0].generated_text.at(-1)!.content as string,
  ),
);
