import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/health", (request, response) => {
    response.json({ name: application.name, version: application.version });
  });

  if (application.configuration.environment !== "development") return;

  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/errors/not-found", (request, response, next) => {
    next();
  });

  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/errors/validation", (request, response, next) => {
    next("Validation");
  });

  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/errors/cross-site-request-forgery", (request, response, next) => {
    next("Cross-Site Request Forgery");
  });

  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/errors/exception", (request, response) => {
    throw new Error("Exception");
  });

  application.web.get<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/errors/crash", (request, response) => {
    setTimeout(() => {
      throw new Error("Crash");
    });
  });
};
