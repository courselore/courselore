import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server.get<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("/health", (request, response) => {
    response.json({ name: application.name, version: application.version });
  });

  if (application.configuration.environment !== "development") return;

  application.server.get<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("/errors/validation", (request, response, next) => {
    next("Validation");
  });

  application.server.get<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("/errors/cross-site-request-forgery", (request, response, next) => {
    next("Cross-Site Request Forgery");
  });

  application.server.get<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("/errors/exception", (request, response) => {
    throw new Error("Exception");
  });

  application.server.get<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("/errors/crash", (request, response) => {
    setTimeout(() => {
      throw new Error("Crash");
    });
  });
};
