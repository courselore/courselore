import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    handler: (request, response) => {
      response.statusCode = 404;
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
                  "system-administrator@courselore.org"}?${new URLSearchParams({
                    subject: "Page not found",
                    body: `Page: ${request.URL.href}\n\nPlease describe the circumstances under which you reached the page and why you believe that there should be something there:`,
                  })
                    .toString()
                    .replaceAll("+", "%20")}"
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

  application.server?.push({
    error: true,
    handler: (request, response) => {
      response.end(
        application.layouts.main({
          request,
          response,
          head: html`<title>Server error · Courselore</title>`,
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
                Server error
              </div>
              <div>
                This is an issue with Courselore, please report to the system
                administrator:<br />
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
