### Features

#### Courses

- Enrollment (user ↔ course) roles
  - Instructor
  - Assistant
  - Student
- States
  - Draft
  - Enrollment
  - Running
  - Archived
- Create roles and manage permissions
- Tag-based actions

#### Forum

- Only one kind of post in threads
- Configurable anonymity
  - Only instructors may identify the person
  - Instructors and assistants may identify the person (default)
  - No-one may identify the person
- Don’t implement that idea of collaboratively coming up with an answer (like Piazza) (no-one in the courses I was involved with used that; people just write follow-up answers)
- Notifications
  - How
    - Email
    - In-app
  - What
    - Subscribe to threads
    - Subscribe to whole courses
    - Staff may send messages that are notified to everyone
- Tags
- Reactions & Badges
  - Only allow positive reactions? (Like Facebook) (Probably yes)
  - Allow both positive and negative reactions? (like GitHub / Reddit)
  - Created by/Endorsed by instructor
- States
  - Open
  - Closed
- Visibility
  - To students
  - To staff only (and students that may have posted on it)

#### API

- To integrate with other platforms, like, LMS
- To ask a question from within the text editor, for example

#### Authentication

- SSO with Hopkins ID
  - SAML

#### Email

- Requirements
  - DNS:
    - MX DNS record
      - Check with <https://toolbox.googleapps.com/apps/checkmx/>
    - PTR DNS record
      - IPv4 & IPv6
      - Check with <https://intodns.com/>
    - SPF
      - <https://support.google.com/a/answer/33786#zippy=>
    - DMARC
      - <https://support.google.com/a/topic/2759254>
  - DKIM
    - <https://support.google.com/a/answer/174124?visit_id=637457136864921918-3619574292&ref_topic=2752442&rd=1#zippy=>
    - Key of 1024 bits or longer (recommended is 2048 bits)
  - TLS??
  - MTA-STS??
  - ARC??
    - http://arc-spec.org
  - Blacklists
    - Check with
      - https://support.google.com/mail/answer/9981691?visit_id=637457136864921918-3619574292&rd=1
      - https://transparencyreport.google.com/safe-browsing/search
  - Unsubscribe
    - “Use one-click unsubscribe”:
      - <https://support.google.com/mail/answer/81126?hl=en>
        - <https://tools.ietf.org/html/rfc2369>
        - <https://tools.ietf.org/html/rfc8058>
    - Generic troubleshooter
      - <https://support.google.com/mail/troubleshooter/2696779>
- Why not third-party
  - Share data with third party!
  - Cost
  - More stuff to configure
- Third-parties
  - SendGrid
  - SES
  - https://blog.mailtrap.io/free-smtp-servers/
- Libraries
  - https://www.npmjs.com/package/sendmail
  - Nodemailer direct transport (https://github.com/nodemailer/nodemailer/issues/1227)
  - https://www.npmjs.com/package/sendmail
  - https://nodemailer.com/extras/smtp-connection/
  - https://github.com/andris9/mailauth
  - https://www.npmjs.com/package/usemail
  - Haraka
  - https://github.com/substack/node-smtp-protocol
  - https://github.com/zone-eu/zone-mta
- Boxed solutions
  - https://mailinabox.email
  - https://www.iredmail.org
  - https://modoboa.org/en/
  - https://github.com/sovereign/sovereign
  - https://mailu.io/1.7/
  - https://mailcow.email
    - https://www.servermania.com/kb/articles/setup-your-own-email-server/
- Howtos
  - <https://medium.com/@stoyanov.veseline/self-hosting-a-mail-server-in-2019-6d29542dadd4>
  - https://sealedabstract.com/code/nsa-proof-your-e-mail-in-2-hours/
  - https://blog.mailtrap.io/setup-smtp-server/
  - https://arstechnica.com/information-technology/2014/02/how-to-run-your-own-e-mail-server-with-your-own-domain-part-1/
- Testing
  - https://mailtrap.io/
  - https://mailslurper.com

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

### Improvements

#### Page Transitions & Client-Side JavaScript

- https://hotwire.dev
  - https://www.npmjs.com/package/express-hotwire
  - https://github.com/turbolinks/turbolinks
- https://docs.stimulusreflex.com
- https://barba.js.org
- https://swup.js.org/getting-started
- https://unpoly.com
- https://youtube.github.io/spfjs/

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

- A version hosted by us for other people to use (not just demo)

  - In addition, or as an alternative, a demo version that self destructs every hour (like Moodle: https://moodle.org/demo)

- Supervisors
  - systemd
  - PM2
  - Nodemon
  - Forever
- Packagers
  - Docker
  - https://github.com/vercel/pkg/pull/837#issuecomment-775362263
  - Electron (for demo only, of course)
- “One-click deployment” for different platforms like DigitalOcean, Linode, and so forth.
  - DigitalOcean
  - Linode
  - Amazon
  - Google Cloud
  - https://sandstorm.io

### Documentation

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
- Create accounts on:
  - Patreon
  - PayPal
  - Facebook
  - Instagram
  - Reddit

### References

- GitHub
- Slack
- <https://campuswire.com>
- <https://piazza.com/>
- <https://discourse.org>
- <https://us.edstem.org>
- <https://aula.education>
- <https://yellowdig.com>
- <https://moodle.org>
- Canvas
- <https://www.reddit.com>
- Basecamp
- <https://www.codegrade.com/>
  - <https://app.codegra.de/login>
  - <https://github.com/CodeGra-de>
  - <https://github.com/CodeGrade/bottlenose>
- <https://glacial-plateau-47269.herokuapp.com/>
  - <https://glacial-plateau-47269.herokuapp.com/jhu/login>
- <https://www.acadly.com/>
- References in self-hosting
  - https://www.reddit.com/r/selfhosted/
  - Discourse
  - Mattermost
  - Moodle
  - GitLab
  - WordPress
  - https://github.com/RocketChat/Rocket.Chat
  - https://gitea.io/
  - https://gogs.io/
- <https://github.com/npm/roadmap/projects/1>: A meta-reference on how to present the roadmap moving forward.
