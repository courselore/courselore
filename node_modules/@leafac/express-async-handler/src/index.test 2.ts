import { test, expect } from "@jest/globals";
import express from "express";
import fetch from "node-fetch";
import { asyncHandler, asyncErrorHandler } from ".";

test("Synchronous", async () => {
  const app = express();

  app.get<
    { exampleParameter: string },
    { exampleResponseBody: string },
    { exampleRequestBody: string },
    { exampleRequestQuery: string },
    { exampleLocals: string }
  >("/error/:exampleParameter", (req, res) => {
    // The following are just examples of using the types from the generics.
    if (false) {
      req.params.exampleParameter;
      res.send({ exampleResponseBody: "exampleResponseBody" });
      req.body.exampleRequestBody;
      req.query.exampleRequestQuery;
      res.locals.exampleLocals;
    }

    throw new Error("Error from the app");
  });

  // Adding the generics to ‘app.use<...>()’ doesn’t work. Don’t ask me why; @types/express are weird with error handlers.
  app.use(((err, req, res, next) => {
    // The following are just examples of using the types from the generics.
    if (false) {
      req.params.exampleParameter;
      res.send({ exampleResponseBody: "exampleResponseBody" });
      req.body.exampleRequestBody;
      req.query.exampleRequestQuery;
      res.locals.exampleLocals;
    }

    throw new Error(`Decorated error from an error handler: ${err}`);
  }) as express.ErrorRequestHandler<{ exampleParameter: string }, { exampleResponseBody: string }, { exampleRequestBody: string }, { exampleRequestQuery: string }, { exampleLocals: string }>);

  const server = app.listen();
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Invalid address");
  const port = address.port;

  await expect(
    await (await fetch(`http://localhost:${port}/error/hi`)).text()
  ).toMatch(
    "Error: Decorated error from an error handler: Error: Error from the app"
  );
  expect(server.listening).toBe(true);

  server.close();
});

test("Asynchronous", async () => {
  const app = express();

  // Adding the generics to ‘app.get<...>()’ would also work, but it’s more consistent to add them to ‘asyncHandler<...>()’.
  app.get(
    "/error/:exampleParameter",
    asyncHandler<
      { exampleParameter: string },
      { exampleResponseBody: string },
      { exampleRequestBody: string },
      { exampleRequestQuery: string },
      { exampleLocals: string }
    >(async (req, res) => {
      // The following are just examples of using the types from the generics.
      if (false) {
        req.params.exampleParameter;
        res.send({ exampleResponseBody: "exampleResponseBody" });
        req.body.exampleRequestBody;
        req.query.exampleRequestQuery;
        res.locals.exampleLocals;
      }

      await Promise.resolve();
      throw new Error("Error from the app");
    })
  );

  // Adding the generics to ‘app.get<...>()’ would *not* work. Don’t ask me why; @types/express are weird with error handlers.
  app.use(
    asyncErrorHandler<
      { exampleParameter: string },
      { exampleResponseBody: string },
      { exampleRequestBody: string },
      { exampleRequestQuery: string },
      { exampleLocals: string }
    >(async (err, req, res, next) => {
      // The following are just examples of using the types from the generics.
      if (false) {
        req.params.exampleParameter;
        res.send({ exampleResponseBody: "exampleResponseBody" });
        req.body.exampleRequestBody;
        req.query.exampleRequestQuery;
        res.locals.exampleLocals;
      }

      await Promise.resolve();
      throw new Error(`Decorated error from an error handler: ${err}`);
    })
  );

  const server = app.listen();
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("Invalid address");
  const port = address.port;

  await expect(
    await (await fetch(`http://localhost:${port}/error/hi`)).text()
  ).toMatch(
    "Error: Decorated error from an error handler: Error: Error from the app"
  );
  expect(server.listening).toBe(true);

  server.close();
});
