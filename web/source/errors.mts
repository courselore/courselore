import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    handler: (request: serverTypes.Request<{}, {}, {}, {}, {}>, response) => {
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Page not found · Courselore</title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                Page not found
              </div>
              <div>
                If you believe that there should be something here, please
                contact the system administrator:<br />
                <a
                  target="_blank"
                  class="link"
                  href="mailto:${application.configuration
                    .systemAdministratorEmail ??
                  "system-administrator@courselore.org"}"
                  >${application.configuration.systemAdministratorEmail ??
                  "system-administrator@courselore.org"}</a
                >
              </div>
            </div>
          `,
        }),
      );
    },
  });
};
