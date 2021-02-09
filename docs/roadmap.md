### Features

#### Authentication

- Magic links.
  - https://www.youtube.com/watch?v=KiYfWaGRHTc
- Deep links & redirects.
- Prevent people from trying to brute-force login. Put a limit on the amount of magic links you may generate in a period.

#### User Profile

- Gravatar.

#### API

- People may want to integrate CourseLore with their existing LMS & other systems.

#### Text Processor

- Add CSS for all the HTML that may be produced (see `hast-util-sanitize/lib/github.json`).
- Emoji with the `:smile:` form.
- Proxy insecure content.
  - https://github.com/atmos/camo
- Reference: <https://github.com/gjtorikian/html-pipeline>

#### Landing Page

- Try to make animation consume less resources. (Currently it’s making the “this tab is consuming too much energy” warning pop up in Safari.)
  - Maybe it has to do with computing the sine of large numbers? Clamp the values between 0–2π to see if that helps…

#### Textarea Niceties

- Store what the user wrote per thread/chat, even if they move to other threads/chats.
  - Garlic.js does that, but it seems a bit old and requires jQuery. Use localStorage instead.
- Some helpers to input Markdown & LaTeX (similar to what GitHub has).
- Upload files (like images), and have them embedded (similar to what GitHub has).
  - Packages to handle multipart form data: busboy, multer, formidable, multiparty, connect-multiparty, and pez.

#### Error Pages

- 400s.
- 500s.
- Form validation errors.

#### Search

- In contents of a course (for example, search for `NullPointerException` to find that thread that helped you out).
  - Search within the scope of a course.
  - Search in all courses you’re taking (for example, search for `deadline extension`).
  - Reference: GitHub let’s you search in different scopes like that.
- Courses in the system (for joining a course).

#### More Deployment Strategies

- Docker.
- “One-click deployment” for different platforms like DigitalOcean, Linode, and so forth.

### Improvements

#### Code Base

- Produce native ESM:
  - It’s too fresh, assess again start 2021-08.
  - Blocked by experimental support in ts-node-dev (https://github.com/TypeStrong/ts-node/issues/1007) & Jest (https://jestjs.io/docs/en/ecmascript-modules).
  - ESM unlocks top-level await and eliminates the need for `appGenerator()`.
- Consider using a CSS framework:
  - Bootstrap: The most popular.
  - TailwindCSS: The hot new option.
- <https://github.com/wclr/ts-node-dev/issues/243>: Stop using `--pool` when calling `ts-node-dev`.
- Call Prettier to check contents of `public/` folders.

#### Deployment

- Graceful HTTP shutdown

  ```js
  process.on("SIGTERM", () => {
    debug("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      debug("HTTP server closed");
    });
  });
  ```

  - https://github.com/gajus/http-terminator

- Helmet.
- csurf.
- Compression.

- HTTPS:

  - Consider using <https://www.npmjs.com/package/@small-tech/https>
  - Use Caddy
    - Manage with https://pm2.keymetrics.io/docs/usage/pm2-api/
  - Use another reverse-proxy / load balancing solution: https://balance.inlab.net
  - Use certbot:
    - <https://www.sitepoint.com/how-to-use-ssltls-with-node-js/>
  - Or roll out our own thing:
    - ACME implementations
      - <https://www.npmjs.com/package/acme-v2>
      - <https://www.npmjs.com/package/acme-client>
      - <https://www.npmjs.com/package/acme-middleware>
      - <https://github.com/publishlab/node-acme-client>
      - <https://github.com/compulim/acme-http-01-azure-key-vault-middleware>
      - <https://letsencrypt.org/docs/client-options/>
    - ACME description: <https://tools.ietf.org/html/rfc8555>
    - Implementations of cryptography
      - Node’s crypto
      - <https://github.com/brix/crypto-js>
      - <https://github.com/digitalbazaar/forge>
    - Other considerations:
      - HSTS:
        - <https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security>
        - Helmet.
    - HTTP → HTTPS
      - <https://www.npmjs.com/package/express-force-https>
  - Verify: https://www.ssllabs.com

- HTTP/2:

  - <https://github.com/expressjs/express/issues/3388>: Express doesn’t work with Node’s http/2 implementation, because the `req` and `res` aren’t compatible.
  - Using Greenlock: https://git.rootprojects.org/root/greenlock-express.js/src/branch/master/examples/http2/server.js
  - Use the spdy package (seems abandoned, and people said it doesn’t work with recent versions of node: https://github.com/spdy-http2/node-spdy/issues/380)
  - Try express 5.
  - <https://gist.github.com/studentIvan/6c78886c140067936ff379031fd12e14>
  - Frameworks that seem to support it out of the box:
    - koa
    - Hapi
    - tinyhttp

- Auto-updater
- `download.courselore.org` points to installer.

### Open-Source Contributions

- <https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794>: Add more specific types to better-sqlite3 with generics.
- <https://github.com/actions/upload-release-asset/issues/56>: Document how to create a release in one GitHub Actions job and upload assets in another.
- Prettier: Bug Report: When formatting Markdown within a JavaScript tagged template literal, Prettier adds space at the end. This breaks the es6-string-markdown Visual Studio Code extension.
  - Get rid of the `// prettier-ignore`.
- <https://github.com/syntax-tree/hast-util-sanitize/pull/21>: Add types to the JSON in hast-util-sanitize.
- <https://npm.im/hast-util-to-text>: Write types.
  - <https://github.com/leafac/rehype-shiki/blob/ca1725c13aa720bf552ded5e71be65c129d15967/src/index.ts#L3-L4>
- Questions about Greenlock
  - <https://git.rootprojects.org/root/greenlock.js/issues/41>: Does it use https://greenlock.domains or does it go straight to LetsEncrypt?
  - <https://git.rootprojects.org/root/greenlock-express.js/issues/50>: Can we get TypeScript types?

### Marketing

- Newsletter
- Create CourseLore Gravatar
  - Use in npm

### References

- <https://www.acadly.com/>
