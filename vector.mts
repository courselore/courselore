import sql, { Database } from "@radically-straightforward/sqlite";
import * as sqliteVec from "sqlite-vec";

// const database = await new Database(":memory:")
//   .loadExtension(sqliteVec.getLoadablePath())
//   .migrate(
//     sql`
//       create virtual table "vectors" using vec0(
//         coordinates float[3]
//       );
//     `,
//   );
// database.run(
//   sql`
//     insert into "vectors" ("rowid", "coordinates")
//     values
//       (1, ${Buffer.from(new Float32Array([+1, +1, +1]).buffer)}),
//       (2, ${Buffer.from(new Float32Array([+1, +1, -1]).buffer)}),
//       (3, ${Buffer.from(new Float32Array([+1, -1, +1]).buffer)}),
//       (4, ${Buffer.from(new Float32Array([+1, -1, -1]).buffer)}),
//       (5, ${Buffer.from(new Float32Array([-1, +1, +1]).buffer)}),
//       (6, ${Buffer.from(new Float32Array([-1, +1, -1]).buffer)}),
//       (7, ${Buffer.from(new Float32Array([-1, -1, +1]).buffer)}),
//       (8, ${Buffer.from(new Float32Array([-1, -1, -1]).buffer)});
//   `,
// );
// console.log(
//   database.all(
//     sql`
//       select "rowid", "coordinates", "distance"
//       from "vectors"
//       where "coordinates" match ${Buffer.from(new Float32Array([0.5, 0.5, 0.5]).buffer)}
//       order by distance asc
//       limit 10;
//     `,
//   ),
// );

const database = await new Database(":memory:")
  .loadExtension(sqliteVec.getLoadablePath())
  .migrate(
    sql`
      create virtual table "vectors" using vec0(
        coordinates float[2]
      );
    `,
  );
database.run(
  sql`
    insert into "vectors" ("rowid", "coordinates")
    values
      (7, ${JSON.stringify([0, 0])}),
      (8, ${JSON.stringify([0, 4])});
  `,
);
console.log(
  database.all<{ rowid: number; distance: number }>(
    sql`
      select "rowid", "distance"
      from "vectors"
      where "coordinates" match ${JSON.stringify([3, 0])}
      order by distance asc
      limit 10;
    `,
  ),
);
