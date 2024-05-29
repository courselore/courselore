import * as serverTypes from "@radically-straightforward/server";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<courseIdentifier>[0-9]+)/conversations/(?<conversationIdentifier>[0-9]+)$",
    ),
    handler: (
      request: serverTypes.Request<
        { courseIdentifier: string; conversationIdentifier: string },
        { message: string },
        {},
        {},
        {}
      >,
      response,
    ) => {
      response.end("HELLO WORLD");
    },
  });
};
