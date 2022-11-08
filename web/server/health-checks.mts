import { Application, ResponseLocalsBase } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/health",
    (request, response) => {
      response.json({ name: application.name, version: application.version });
    }
  );

  if (application.configuration.environment !== "development") return;

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/validation",
    (request, response, next) => {
      next("Validation");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/cross-site-request-forgery",
    (request, response, next) => {
      next("Cross-Site Request Forgery");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/exception",
    (request, response) => {
      throw new Error("Exception");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/crash",
    (request, response) => {
      setTimeout(() => {
        throw new Error("Crash");
      });
    }
  );
};
