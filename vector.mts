import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate(
    sql`
      create table "messages" (
        "id" integer primary key autoincrement,
        "content" text not null,
        "contentVectorEmbedding" blob check(vec_length("contentVectorEmbedding") == 2) not null
      ) strict;
    `,
  );
database.run(
  sql`
    insert into "messages" ("content", "contentVectorEmbedding")
    values
      (${"Hello"}, vec_f32(${JSON.stringify([1, 0])})),
      (${"World"}, vec_f32(${JSON.stringify([0, 4])}));
  `,
);
console.log(
  database.all<{ id: number; content: string; distance: number }>(
    sql`
      select
        "id",
        "content",
        vec_distance_cosine("contentVectorEmbedding", ${JSON.stringify([3, 0])}) as "distance"
      from "messages"
      order by "distance" asc;
    `,
  ),
);
