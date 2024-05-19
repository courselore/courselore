import path from "node:path";
import sql, { Database } from "@radically-straightforward/sqlite";
import { Application } from "./index.mjs";

export type ApplicationDatabase = {
  database: Database;
};

export default async (application: Application): Promise<void> => {
  application.database = await new Database(
    path.join(application.configuration.dataDirectory, "courselore.db"),
  ).migrate();
};
