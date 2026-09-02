import * as transformers from "@huggingface/transformers";
import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";

const embedder = await transformers.pipeline(
  "feature-extraction",
  "nomic-ai/nomic-embed-text-v1.5",
);

const embed = async (text: string): Promise<string> => {
  return JSON.stringify(
    Array.from(
      (await embedder(text, { pooling: "mean", normalize: true })).data,
    ),
  );
};

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate(
    sql`
      create table "messages" (
        "id" integer primary key autoincrement,
        "content" text not null,
        "contentVectorEmbedding" blob not null
      ) strict;
    `,
  );

database.run(
  sql`
    insert into "messages" ("content", "contentVectorEmbedding")
    values
      (${"Hello"}, vec_f32(${await embed("search_document: Hello")})),
      (${"World"}, vec_f32(${await embed("search_document: World")}));
  `,
);

console.log(
  database.all<{ id: number; content: string; distance: number }>(
    sql`
      select
        "id",
        "content",
        vec_to_json("contentVectorEmbedding") as "contentVectorEmbedding",
        vec_distance_L2("contentVectorEmbedding", ${await embed("search_query: Hi")}) as "distance"
      from "messages"
      order by "distance" asc;
    `,
  ),
);
