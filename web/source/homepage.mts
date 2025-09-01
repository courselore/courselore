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
        application.layouts.base({
          request,
          response,
          head: html`<title>Courselore</title>`,
          body: html`
            <div
              key="main--main /"
              class="scroll"
              css="${css`
                width: 100%;
                height: 100%;
              `}"
            >
              <div
                css="${css`
                  font-family:
                    "Roboto Serif Variable", var(--font-family--serif);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: var(--size--4);
                  margin-top: var(--size--20);
                `}"
              >
                <div
                  css="${css`
                    font-weight: 800;
                    font-size: var(--font-size--9);
                    line-height: var(--font-size--9--line-height);
                    color: light-dark(
                      var(--color--slate--700),
                      var(--color--slate--300)
                    );
                  `}"
                >
                  Communication platform
                </div>
                <div
                  css="${css`
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }
                  `}"
                >
                  <div
                    css="${css`
                      color: light-dark(
                        var(--color--yellow--200),
                        var(--color--yellow--800)
                      );
                    `}"
                  >
                    <svg
                      viewBox="0 0 837.85048 225.08389"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M 23.871741,45.13578 C 211.72864,-2.5727948 635.08169,-9.0659184 780.27492,9.8911911 851.11802,19.140786 859.76179,220.46825 788.40824,224.06989 607.02119,233.2254 261.41894,177.57406 99.783173,169.84741 8.518464,165.48469 -28.249967,58.372727 23.871741,45.13578 Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <div
                    css="${css`
                      font-weight: 900;
                      font-size: var(--font-size--12);
                      line-height: var(--font-size--12--line-height);
                    `}"
                  >
                    for education
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });
};
