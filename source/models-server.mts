import fsCallback from "node:fs";
import server from "@radically-straightforward/server";
import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as transformers from "@huggingface/transformers";

transformers.env.allowRemoteModels = false;

const vectorEmbedding = await transformers.pipeline(
  "feature-extraction",
  "Xenova/bge-small-en-v1.5",
  { dtype: "q8" },
);

const rerankingTokenizer = await transformers.AutoTokenizer.from_pretrained(
  "Xenova/ms-marco-MiniLM-L-6-v2",
);
const rerankingModel =
  await transformers.AutoModelForSequenceClassification.from_pretrained(
    "Xenova/ms-marco-MiniLM-L-6-v2",
    { dtype: "q8" },
  );

const sentimentAnalysis = await transformers.pipeline(
  "sentiment-analysis",
  "Xenova/twitter-roberta-base-sentiment-latest",
  { dtype: "q8" },
);

const modelsServer = server({ port: 19000 });

modelsServer.push({
  method: "POST",
  pathname: "/vector-embedding",
  handler: async (
    request: serverTypes.Request<{}, {}, {}, { text: string }, {}>,
    response,
  ) => {
    if (typeof request.body.text !== "string") throw "validation";
    response.setHeader("Content-Type", "application/json; charset=utf-8").send(
      JSON.stringify(
        Array.from(
          (
            await vectorEmbedding(request.body.text, {
              pooling: "mean",
              normalize: true,
            })
          ).data,
        ),
      ),
    );
  },
});

modelsServer.push({
  method: "POST",
  pathname: "/reranking",
  handler: async (
    request: serverTypes.Request<
      {},
      {},
      {},
      {
        query: string;
        searchResults: string[];
      },
      {}
    >,
    response,
  ) => {
    if (
      typeof request.body.query !== "string" ||
      !Array.isArray(request.body.searchResults) ||
      request.body.searchResults.some(
        (searchResult) => typeof searchResult !== "string",
      )
    )
      throw "validation";
    response.setHeader("Content-Type", "application/json; charset=utf-8").send(
      JSON.stringify(
        Array.from(
          (
            await rerankingModel(
              rerankingTokenizer(
                new Array(request.body.searchResults.length).fill(
                  request.body.query,
                ),
                {
                  text_pair: request.body.searchResults,
                  padding: true,
                  truncation: true,
                },
              ),
            )
          ).logits.data,
        ),
      ),
    );
  },
});

modelsServer.push({
  method: "POST",
  pathname: "/sentiment-analysis",
  handler: async (
    request: serverTypes.Request<
      {},
      {},
      {},
      {
        text: string;
      },
      {}
    >,
    response,
  ) => {
    if (typeof request.body.text !== "string") throw "validation";
    response
      .setHeader("Content-Type", "application/json; charset=utf-8")
      .send(
        JSON.stringify(
          (
            await sentimentAnalysis(
              request.body.text
                .slice(0, 1500)
                .replaceAll(/[^A-Za-z0-9 ]/gu, ""),
            )
          )[0],
        ),
      );
  },
});

utilities.log("COURSELORE", "START", "modelsServer");
process.once("beforeExit", () => {
  utilities.log("COURSELORE", "STOP", "modelsServer");
});

fsCallback.writeSync(3, "ready");
