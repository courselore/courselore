import path from "node:path";
import sql, { Database } from "@radically-straightforward/sqlite";
import * as application from "./index.mjs";

export default await new Database(
  path.join(application.configuration.dataDirectory, "courselore.db"),
).migrate();
