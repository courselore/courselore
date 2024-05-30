import * as serverTypes from "@radically-straightforward/server";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
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
      response.end(html`
        <!doctype html>
        <html style="color-scheme: light dark">
          <head>
            <title>Courselore</title>
            <meta
              name="description"
              content="Communication Platform for Education"
            />
            <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
            <script src="/${caddy.staticFiles["index.mjs"]}"></script>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=1"
            />
          </head>
          <body
            css="${css`
              font-family: "Public Sans Variable",
                var(--font-family--sans-serif);
              font-size: var(--font-size--3-5);
              line-height: var(--font-size--3-5--line-height);
            `}"
          >
            <div
              css="${css`
                background-color: light-dark(
                  var(--color--white),
                  var(--color--black)
                );
                color: light-dark(
                  var(--color--slate--800),
                  var(--color--slate--200)
                );
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
              `}"
            >
              <div
                key="header"
                css="${css`
                  background-color: light-dark(
                    var(--color--slate--50),
                    var(--color--slate--950)
                  );
                  padding: var(--space--1) var(--space--2);
                  border-bottom: var(--border-width--1) solid
                    light-dark(
                      var(--color--slate--200),
                      var(--color--slate--800)
                    );
                `}"
              >
                <div
                  css="${css`
                    font-weight: 700;
                  `}"
                >
                  <a href="${new URL("/", request.URL).href}">Courselore</a>
                </div>
              </div>
              <div key="main">HELLO</div>
            </div>
          </body>
        </html>
      `);
    },
  });
};
