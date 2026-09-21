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

const modelsServer = server({ port: 19000 });

modelsServer.push({
  method: "POST",
  pathname: "/vector-embedding",
  handler: async (
    request: serverTypes.Request<{}, {}, {}, { text: string }, {}>,
    response,
  ) => {
    if (
      typeof request.body.text !== "string" ||
      request.body.text.trim() === ""
    )
      throw "validation";
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

utilities.log("COURSELORE", "START", "modelsServer");
process.once("beforeExit", () => {
  utilities.log("COURSELORE", "STOP", "modelsServer");
});

fsCallback.writeSync(3, "ready");
