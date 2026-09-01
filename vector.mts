import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";
import * as transformers from "@huggingface/transformers";

const extractor = await transformers.pipeline(
  "feature-extraction",
  "nomic-ai/nomic-embed-text-v1.5",
);

const embed = async (text: string) => {
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
};

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate(
    sql`
      create table "messages" (
        "id" integer primary key autoincrement,
        "content" text not null,
        -- "contentVectorEmbedding" blob check(vec_length("contentVectorEmbedding") == 384) not null
        "contentVectorEmbedding" blob not null
      ) strict;
    `,
  );

database.run(
  sql`
    insert into "messages" ("content", "contentVectorEmbedding")
    values
      (${"Hello"}, vec_f32(${JSON.stringify(await embed("Hello"))})),
      (${"World"}, vec_f32(${JSON.stringify(await embed("World"))}));
  `,
);

console.log(
  database.all<{ id: number; content: string; distance: number }>(
    sql`
      select
        "id",
        "content",
        vec_to_json("contentVectorEmbedding") as "contentVectorEmbedding",
        vec_distance_L2("contentVectorEmbedding", ${JSON.stringify(await embed("Hi"))}) as "distance"
      from "messages"
      order by "distance" asc;
    `,
  ),
);
