import * as transformers from "@huggingface/transformers";

const exampleGenerator = await transformers.pipeline(
  "text-generation",
  "onnx-community/Qwen2.5-0.5B-Instruct",
  { dtype: "q4" },
);

console.log(
  (
    await exampleGenerator(
      [
        {
          role: "user",
          content:
            "Please generate an example of a realistic conversation between an instructor and a student in an university setting. The conversation is about principles of programming languages. The conversation takes place in an online forum. The conversation starts with the student asking a question, and then the instructor responds to the question. The conversation may continue for a few more messages, with the student asking follow-up questions and the instructor providing answers. Please provide your answer in a JSON object with the keys `title` (string) and `messages` (array). Each `message` is an object with the keys `role` (either `instructor` or `student`) and `content` (the text of the message in Markdown).",
        },
      ],
      // {
      //   max_new_tokens: 150,
      //   temperature: 0.7,
      //   do_sample: true,
      // },
    )
  )[0].generated_text.at(-1)!.content as string,
);
