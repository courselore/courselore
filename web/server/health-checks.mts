import { Application, ResponseLocalsBase } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/health",
    (req, res) => {
      res.json({ name: application.name, version: application.version });
    }
  );

  if (application.configuration.environment !== "development") return;

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/validation",
    (req, res, next) => {
      next("Validation");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/cross-site-request-forgery",
    (req, res, next) => {
      next("Cross-Site Request Forgery");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/exception",
    (req, res) => {
      throw new Error("Exception");
    }
  );

  application.server.get<{}, any, {}, {}, ResponseLocalsBase>(
    "/errors/crash",
    (req, res) => {
      setTimeout(() => {
        throw new Error("Crash");
      });
    }
  );
};
