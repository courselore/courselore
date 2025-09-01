import * as serverTypes from "@radically-straightforward/server";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "GET",
    pathname: "/",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user !== undefined) return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Courselore</title>`,
          body: html` Homepage `,
        }),
      );
    },
  });
};
