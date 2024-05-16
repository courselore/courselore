import util from "node:util";
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import server from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import * as node from "@radically-straightforward/node";
import caddyfile from "@radically-straightforward/caddy";
import * as caddy from "@radically-straightforward/caddy";

export const commandLineArguments = util.parseArgs({
  options: {
    type: { type: "string" },
    port: { type: "string" },
  },
  allowPositionals: true,
});

export const configuration: {
  hostname: string;
  systemAdministratorEmail: string;
  dataDirectory: string;
  environment: "production" | "development";
  hstsPreload: boolean;
  extraCaddyfile: string;
  ports: number[];
} = (await import(path.resolve(commandLineArguments.positionals[0]))).default;
configuration.dataDirectory ??= path.resolve("./data/");
configuration.environment ??= "production";
configuration.hstsPreload ??= false;
configuration.extraCaddyfile ??= caddyfile``;
configuration.ports = Array.from(
  { length: os.availableParallelism() },
  (value, index) => 18000 + index,
);

await fs.mkdir(configuration.dataDirectory, { recursive: true });

export const web =
  commandLineArguments.values.type === "web"
    ? server({
        port: Number(commandLineArguments.values.port),
      })
    : undefined;

await import("./database.mjs");

switch (commandLineArguments.values.type) {
  case undefined: {
    utilities.log("COURSELORE", "9.0.0", "START");
    process.once("beforeExit", () => {
      utilities.log("COURSELORE", "STOP");
    });
    for (const port of configuration.ports) {
      node.childProcessKeepAlive(() =>
        childProcess.spawn(
          process.argv[0],
          [
            process.argv[1],
            ...commandLineArguments.positionals,
            "--type",
            "web",
            "--port",
            String(port),
          ],
          {
            env: { ...process.env, NODE_ENV: configuration.environment },
            stdio: "inherit",
          },
        ),
      );
      node.childProcessKeepAlive(() =>
        childProcess.spawn(
          process.argv[0],
          [
            process.argv[1],
            ...commandLineArguments.positionals,
            "--type",
            "background-job",
          ],
          {
            env: { ...process.env, NODE_ENV: configuration.environment },
            stdio: "inherit",
          },
        ),
      );
    }
    caddy.start({
      address: configuration.hostname,
      untrustedStaticFilesRoots: [],
      dynamicServerPorts: configuration.ports,
      email: configuration.systemAdministratorEmail,
      hstsPreload: configuration.hstsPreload,
      extraCaddyfile: configuration.extraCaddyfile,
    });
    break;
  }

  // case "web": {
  //   function layout(body: HTML): HTML {
  //     css`
  //       @import "@radically-straightforward/css/static/index.css";
  //       @import "@radically-straightforward/javascript/static/index.css";
  //       @import "@fontsource-variable/public-sans";
  //       @import "bootstrap-icons/font/bootstrap-icons.css";
  //     `;
  //     javascript`
  //       import * as javascript from "@radically-straightforward/javascript/static/index.mjs";
  //       import * as utilities from "@radically-straightforward/utilities";
  //     `;
  //     return html`
  //       <!doctype html>
  //       <html>
  //         <head>
  //           <title>Kill the Newsletter!</title>
  //           <meta
  //             name="description"
  //             content="Convert email newsletters into Atom feeds"
  //           />
  //           <link rel="stylesheet" href="/${caddy.staticFiles["index.css"]}" />
  //           <script src="/${caddy.staticFiles["index.mjs"]}"></script>
  //           <meta
  //             name="viewport"
  //             content="width=device-width, initial-scale=1, maximum-scale=1"
  //           />
  //         </head>
  //         <body
  //           css="${css`
  //             font-family: "Public Sans Variable",
  //               var(--font-family--sans-serif);
  //             font-size: var(--font-size--3-5);
  //             line-height: var(--font-size--3-5--line-height);
  //             background-color: var(--color--white);
  //             color: var(--color--stone--800);
  //             @media (prefers-color-scheme: dark) {
  //               background-color: var(--color--black);
  //               color: var(--color--stone--200);
  //             }
  //             padding: var(--space--4) var(--space--4);

  //             input[type="text"],
  //             button {
  //               background-color: var(--color--stone--50);
  //               padding: var(--space--1) var(--space--2);
  //               border: var(--border-width--1) solid var(--color--stone--400);
  //               border-radius: var(--border-radius--1);
  //               &:hover {
  //                 border-color: var(--color--stone--500);
  //               }
  //               &:focus-within {
  //                 border-color: var(--color--blue--400);
  //               }
  //               @media (prefers-color-scheme: dark) {
  //                 background-color: var(--color--stone--950);
  //                 border-color: var(--color--stone--500);
  //                 &:hover {
  //                   border-color: var(--color--stone--400);
  //                 }
  //                 &:focus-within {
  //                   border-color: var(--color--blue--600);
  //                 }
  //               }
  //               transition-property: var(--transition-property--colors);
  //               transition-duration: var(--transition-duration--150);
  //               transition-timing-function: var(
  //                 --transition-timing-function--ease-in-out
  //               );
  //             }

  //             button {
  //               cursor: pointer;
  //             }

  //             a {
  //               cursor: pointer;
  //               text-decoration: underline;
  //               color: var(--color--blue--500);
  //               &:hover,
  //               &:focus-within {
  //                 color: var(--color--blue--400);
  //               }
  //               &:active {
  //                 color: var(--color--blue--600);
  //               }
  //               @media (prefers-color-scheme: dark) {
  //                 color: var(--color--blue--500);
  //                 &:hover,
  //                 &:focus-within {
  //                   color: var(--color--blue--400);
  //                 }
  //                 &:active {
  //                   color: var(--color--blue--600);
  //                 }
  //               }
  //               transition-property: var(--transition-property--colors);
  //               transition-duration: var(--transition-duration--150);
  //               transition-timing-function: var(
  //                 --transition-timing-function--ease-in-out
  //               );
  //             }

  //             h2 {
  //               font-weight: 700;
  //             }

  //             small {
  //               font-size: var(--font-size--3);
  //               line-height: var(--font-size--3--line-height);
  //               font-weight: 700;
  //               color: var(--color--stone--500);
  //               @media (prefers-color-scheme: dark) {
  //                 color: var(--color--stone--400);
  //               }
  //             }
  //           `}"
  //         >
  //           <div
  //             css="${css`
  //               max-width: var(--space--prose);
  //               margin: var(--space--0) auto;
  //               display: flex;
  //               flex-direction: column;
  //               gap: var(--space--4);
  //             `}"
  //           >
  //             <div>
  //               <h1
  //                 css="${css`
  //                   font-size: var(--font-size--4-5);
  //                   line-height: var(--font-size--4-5--line-height);
  //                   font-weight: 700;
  //                 `}"
  //               >
  //                 <a
  //                   href="/"
  //                   css="${css`
  //                     text-decoration: none;
  //                     &:not(:hover, :focus-within, :active) {
  //                       color: var(--color--stone--800);
  //                       @media (prefers-color-scheme: dark) {
  //                         color: var(--color--stone--200);
  //                       }
  //                     }
  //                     display: inline-flex;
  //                     gap: var(--space--2);
  //                   `}"
  //                 >
  //                   <div>
  //                     <i class="bi bi-envelope-fill"></i> <i
  //                       class="bi bi-arrow-right"
  //                       > </i
  //                     ><i class="bi bi-rss-fill"></i>
  //                   </div>
  //                   <div>Kill the Newsletter!</div>
  //                 </a>
  //               </h1>
  //               <p
  //                 css="${css`
  //                   margin-top: var(--space---1);
  //                 `}"
  //               >
  //                 <small>Convert email newsletters into Atom feeds</small>
  //               </p>
  //             </div>
  //             $${body}
  //           </div>
  //         </body>
  //       </html>
  //     `;
  //   }
  //   application.push({
  //     method: "GET",
  //     pathname: "/",
  //     handler: (request, response) => {
  //       response.end(
  //         layout(html`
  //           <form
  //             method="POST"
  //             action="/"
  //             novalidate
  //             css="${css`
  //               display: flex;
  //               gap: var(--space--2);
  //               @media (max-width: 400px) {
  //                 flex-direction: column;
  //               }
  //             `}"
  //           >
  //             <input
  //               type="text"
  //               name="title"
  //               placeholder="Feed title…"
  //               required
  //               maxlength="200"
  //               autofocus
  //               css="${css`
  //                 flex: 1;
  //               `}"
  //             />
  //             <div><button>Create Feed</button></div>
  //           </form>
  //           <p>
  //             <small>
  //               <a href="https://leafac.com">By Leandro Facchinetti</a> |
  //               <a href="https://github.com/leafac/kill-the-newsletter"
  //                 >Source</a
  //               > |
  //               <a href="mailto:kill-the-newsletter@leafac.com">Report Issue</a
  //               > | <a href="https://patreon.com/leafac">Patreon</a> ·
  //               <a href="https://paypal.me/LeandroFacchinettiEU">PayPal</a> ·
  //               <a href="https://github.com/sponsors/leafac">GitHub Sponsors</a>
  //             </small>
  //           </p>
  //           <hr
  //             css="${css`
  //               border-top: var(--border-width--1) solid
  //                 var(--color--stone--500);
  //               @media (prefers-color-scheme: dark) {
  //                 border-color: var(--color--stone--500);
  //               }
  //             `}"
  //           />
  //           <div>
  //             <h2>How does Kill the Newsletter! work?</h2>
  //             <p>
  //               Create a feed with the form above and Kill the Newsletter!
  //               provides you with an email address and an Atom feed. Emails that
  //               are received at that address are turned into entries in that
  //               feed. Sign up to a newsletter with that address and use your
  //               feed reader to subscribe to that feed.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>How do I confirm my newsletter subscription?</h2>
  //             <p>
  //               In most cases when you subscribe to a newsletter the newsletter
  //               publisher sends you an email with a confirmation link. Kill the
  //               Newsletter! converts that email into a feed entry as usual, so
  //               it appears in your feed reader and you may follow the
  //               confirmation link from there. Some newsletter publishers want
  //               you to reply to an email using the address that subscribed to
  //               the newsletter. Unfortunately Kill the Newsletter! doesn’t
  //               support this scenario, but you may contact the newsletter
  //               publisher and ask them to verify you manually.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>
  //               Why can’t I subscribe to a newsletter with my Kill the
  //               Newsletter! email?
  //             </h2>
  //             <p>
  //               Some newsletter publishers block Kill the Newsletter!. You may
  //               contact them to explain why using Kill the Newsletter! is
  //               important to you and ask them to reconsider their decision, but
  //               ultimately it’s their content and their choice of who has access
  //               to it and by what means.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>How do I share a Kill the Newsletter! feed?</h2>
  //             <p>
  //               You don’t. The feed includes the identifier for the email
  //               address and anyone who has access to it may unsubscribe you from
  //               your newsletters, send you spam, and so forth. Instead of
  //               sharing a feed, you may share Kill the Newsletter! itself and
  //               let people create their own Kill the Newsletter! feeds. Kill the
  //               Newsletter! has been designed this way because it plays better
  //               with newsletter publishers, who may, for example, get statistics
  //               on the number of subscribers who use Kill the Newsletter!. Note
  //               that Kill the Newsletter! itself doesn’t track users in any way.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>Why are old entries disappearing?</h2>
  //             <p>
  //               When Kill the Newsletter! receives an email it may delete old
  //               entries to keep the feed under a size limit, because some feed
  //               readers don’t support feeds that are too big.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>Why isn’t my feed updating?</h2>
  //             <p>
  //               Send an email to the address that corresponds to your Kill the
  //               Newsletter! feed and wait a few minutes. If the email shows up
  //               on your feed reader, then the issue must be with the newsletter
  //               publisher and you should contact them. Otherwise, please
  //               <a href="mailto:kill-the-newsletter@leafac.com"
  //                 >report the issue us</a
  //               >.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>How do I delete my Kill the Newsletter! feed?</h2>
  //             <p>
  //               You don’t. If you’re no longer interested in a newsletter,
  //               unsubscribe from the publisher (typically you may do that by
  //               following a link in a feed entry), unsubscribe on the feed
  //               reader, and abandon the feed.
  //             </p>
  //           </div>
  //           <div>
  //             <h2>
  //               I’m a newsletter publisher and I saw some people subscribing
  //               with Kill the Newsletter!. What is this?
  //             </h2>
  //             <p>
  //               Think of Kill the Newsletter! as an email provider like Gmail,
  //               but the emails get delivered through Atom feeds for people who
  //               prefer to read with feed readers instead of email. Also,
  //               consider providing your content through an Atom feed—your
  //               readers will appreciate it.
  //             </p>
  //           </div>
  //         `),
  //       );
  //     },
  //   });
  //   application.push({
  //     method: "POST",
  //     pathname: "/",
  //     handler: (
  //       request: serverTypes.Request<{}, {}, {}, { title: string }, {}>,
  //       response,
  //     ) => {
  //       if (
  //         typeof request.body.title !== "string" ||
  //         request.body.title === "" ||
  //         request.body.title.length > 200
  //       )
  //         throw "validation";
  //       const reference = cryptoRandomString({
  //         length: 20,
  //         characters: "abcdefghijklmnopqrstuvwxyz0123456789",
  //       });
  //       database.run(
  //         sql`
  //           INSERT INTO "feeds" ("reference", "title")
  //           VALUES (${reference}, ${request.body.title})
  //         `,
  //       );
  //       response.end(
  //         layout(html`
  //           <p>Feed “${request.body.title}” created.</p>
  //           <div>
  //             <p>Subscribe to a newsletter with the following email address:</p>
  //             <div
  //               css="${css`
  //                 display: flex;
  //                 gap: var(--space--2);
  //                 @media (max-width: 400px) {
  //                   flex-direction: column;
  //                 }
  //               `}"
  //             >
  //               <input
  //                 type="text"
  //                 value="${reference}@${request.URL.hostname}"
  //                 readonly
  //                 css="${css`
  //                   flex: 1;
  //                 `}"
  //                 javascript="${javascript`
  //                   this.onclick = () => {
  //                     this.select();
  //                   };
  //                 `}"
  //               />
  //               <div>
  //                 <button
  //                   javascript="${javascript`
  //                     this.onclick = async () => {
  //                       await navigator.clipboard.writeText(${`${reference}@${request.URL.hostname}`});
  //                       javascript.tippy({
  //                         element: this,
  //                         trigger: "manual",
  //                         hideOnClick: false,
  //                         content: "Copied",
  //                       }).show();
  //                       await utilities.sleep(1000);
  //                       this.tooltip.hide();
  //                     };
  //                   `}"
  //                 >
  //                   <i class="bi bi-copy"></i>  Copy
  //                 </button>
  //               </div>
  //             </div>
  //           </div>
  //           <div>
  //             <p>Subscribe on your feed reader to the following Atom feed:</p>
  //             <div
  //               css="${css`
  //                 display: flex;
  //                 gap: var(--space--2);
  //                 @media (max-width: 400px) {
  //                   flex-direction: column;
  //                 }
  //               `}"
  //             >
  //               <input
  //                 type="text"
  //                 value="${request.URL.origin}/feeds/${reference}.xml"
  //                 readonly
  //                 css="${css`
  //                   flex: 1;
  //                 `}"
  //                 javascript="${javascript`
  //                   this.onclick = () => {
  //                     this.select();
  //                   };
  //                 `}"
  //               />
  //               <div>
  //                 <button
  //                   javascript="${javascript`
  //                     this.onclick = async () => {
  //                       await navigator.clipboard.writeText(${`${request.URL.origin}/feeds/${reference}.xml`});
  //                       javascript.tippy({
  //                         element: this,
  //                         trigger: "manual",
  //                         hideOnClick: false,
  //                         content: "Copied",
  //                       }).show();
  //                       await utilities.sleep(1000);
  //                       this.tooltip.hide();
  //                     };
  //                   `}"
  //                 >
  //                   <i class="bi bi-copy"></i>  Copy
  //                 </button>
  //               </div>
  //             </div>
  //           </div>
  //           <p>
  //             <a href="/">← Create Another Feed</a>
  //           </p>
  //         `),
  //       );
  //     },
  //   });
  //   application.push({
  //     method: "GET",
  //     pathname: new RegExp("^/feeds/(?<feedReference>[A-Za-z0-9]+)\\.xml$"),
  //     handler: (
  //       request: serverTypes.Request<{ feedReference: string }, {}, {}, {}, {}>,
  //       response,
  //     ) => {
  //       if (typeof request.pathname.feedReference !== "string") return;
  //       const feed = database.get<{
  //         id: number;
  //         reference: string;
  //         title: string;
  //       }>(
  //         sql`
  //           SELECT "id", "reference", "title"
  //           FROM "feeds"
  //           WHERE "reference" = ${request.pathname.feedReference}
  //         `,
  //       );
  //       if (feed === undefined) return;
  //       const entries = database.all<{
  //         reference: string;
  //         createdAt: string;
  //         title: string;
  //         content: string;
  //       }>(
  //         sql`
  //           SELECT "reference", "createdAt", "title", "content"
  //           FROM "entries"
  //           WHERE "feed" = ${feed.id}
  //           ORDER BY "id" DESC
  //         `,
  //       );
  //       response
  //         .setHeader("Content-Type", "application/atom+xml; charset=utf-8")
  //         .setHeader("X-Robots-Tag", "none")
  //         .end(
  //           html`<?xml version="1.0" encoding="utf-8"?>
  //             <feed xmlns="http://www.w3.org/2005/Atom">
  //               <id>urn:kill-the-newsletter:${feed.reference}</id>
  //               <link
  //                 rel="self"
  //                 href="${request.URL.origin}/feeds/${feed.reference}.xml"
  //               />
  //               <updated
  //                 >${entries[0]?.createdAt ??
  //                 "2000-01-01T00:00:00.000Z"}</updated
  //               >
  //               <title>${feed.title}</title>
  //               $${entries.map(
  //                 (entry) => html`
  //                   <entry>
  //                     <id>urn:kill-the-newsletter:${entry.reference}</id>
  //                     <link
  //                       rel="alternate"
  //                       type="text/html"
  //                       href="${request.URL
  //                         .origin}/feeds/${feed.reference}/entries/${entry.reference}.html"
  //                     />
  //                     <published>${entry.createdAt}</published>
  //                     <updated>${entry.createdAt}</updated>
  //                     <author>
  //                       <name>Kill the Newsletter!</name>
  //                       <email>kill-the-newsletter@leafac.com</email>
  //                     </author>
  //                     <title>${entry.title}</title>
  //                     <content type="html">${entry.content}</content>
  //                   </entry>
  //                 `,
  //               )}
  //             </feed> `,
  //         );
  //     },
  //   });
  //   application.push({
  //     method: "GET",
  //     pathname: new RegExp(
  //       "^/feeds/(?<feedReference>[A-Za-z0-9]+)/entries/(?<entryReference>[A-Za-z0-9]+)\\.html$",
  //     ),
  //     handler: (
  //       request: serverTypes.Request<
  //         {
  //           feedReference: string;
  //           entryReference: string;
  //         },
  //         {},
  //         {},
  //         {},
  //         {}
  //       >,
  //       response,
  //     ) => {
  //       if (
  //         typeof request.pathname.feedReference !== "string" ||
  //         typeof request.pathname.entryReference !== "string"
  //       )
  //         return;
  //       const entry = database.get<{
  //         content: string;
  //       }>(
  //         sql`
  //           SELECT "entries"."content" AS "content"
  //           FROM "entries"
  //           JOIN "feeds" ON
  //             "entries"."feed" = "feeds"."id" AND
  //             "feeds"."reference" = ${request.pathname.feedReference}
  //           WHERE "entries"."reference" = ${request.pathname.entryReference}
  //         `,
  //       );
  //       if (entry === undefined) return;
  //       response
  //         .setHeader(
  //           "Content-Security-Policy",
  //           "default-src 'self'; img-src *; style-src 'self' 'unsafe-inline'; frame-src 'none'; object-src 'none'; form-action 'self'; frame-ancestors 'none'",
  //         )
  //         .setHeader("Cross-Origin-Embedder-Policy", "unsafe-none")
  //         .setHeader("X-Robots-Tag", "none")
  //         .end(entry.content);
  //     },
  //   });
  //   application.push({
  //     handler: (request, response) => {
  //       response.end(
  //         layout(html`
  //           <p>Not found.</p>
  //           <p>
  //             If you expected to see the web version of a newsletter entry, you
  //             may be interested in the answer to the question
  //             <a href="/">“Why are old entries disappearing?”</a>.
  //           </p>
  //         `),
  //       );
  //     },
  //   });
  //   application.push({
  //     error: true,
  //     handler: (request, response) => {
  //       response.end(
  //         layout(html`
  //           <p>Something went wrong.</p>
  //           <p>
  //             Please report this issue to
  //             <a href="mailto:kill-the-newsletter@leafac.com"
  //               >kill-the-newsletter@leafac.com</a
  //             >.
  //           </p>
  //         `),
  //       );
  //     },
  //   });
  //   break;
  // }
}
