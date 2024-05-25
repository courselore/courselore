import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  if (application.configuration.environment === "development")
    application.server?.push({
      method: "POST",
      pathname: "/demonstration",
      handler: (request, response) => {},
    });
};
