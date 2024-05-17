import path from "node:path";
import sql, { Database } from "@radically-straightforward/sqlite";
import { Application } from "./index.mjs";

export default async (application: Application) => {
  application.database = await new Database(
    path.join(application.configuration.dataDirectory, "courselore.db"),
  ).migrate();
};
