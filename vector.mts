import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate();
console.log(
  database.get(
    sql`
      select vec_version();
    `,
  ),
);
