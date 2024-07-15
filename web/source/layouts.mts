import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export type ApplicationLayouts = {
  layouts: {
    main: ({
      request,
      response,
      head,
      body,
    }: {
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["User"]
      >;
      response: serverTypes.Response;
      head: HTML;
      body: HTML;
    }) => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  application.layouts = {
    main: ({ request, response, head, body }) => html``,
  };
};
