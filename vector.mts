import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate(
    sql`
      create virtual table "vectors" using vec0(
        id integer primary key autoincrement,
        coordinates float[2] distance_metric = cosine
      );
    `,
  );
database.run(
  sql`
    insert into "vectors" ("coordinates")
    values
      (${JSON.stringify([0, 0])}),
      (${JSON.stringify([0, 4])});
  `,
);
console.log(
  database.all<{ id: number; distance: number }>(
    sql`
      select "id", "distance"
      from "vectors"
      where "coordinates" match ${JSON.stringify([3, 0])}
      order by distance asc
      limit 10;
    `,
  ),
);
