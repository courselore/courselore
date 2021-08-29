<h1 align="center"><a href="https://courselore.org">CourseLore</a></h1>
<h3 align="center">Communication Platform for Education</h3>
<p align="center">
<a href="https://github.com/courselore/courselore"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/courselore"><img alt="Package" src="https://badge.fury.io/js/courselore.svg"></a>
<a href="https://github.com/courselore/courselore/actions"><img src="https://github.com/courselore/courselore/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

<details>
<summary><strong>Backlog</strong></summary>

### To Organize

- Red trashcan.
- Consistent colors.
- Change the presentation of anonymity.
- Counter of private messages.
- Private to public.
- search by author name
- [ ] Favicon
  - SVG
  - Notification indicator
- [ ] Splash on README

- Things we want for the spring:

  - 1-1 conversations.
  - Chat.
  - demo.courselore.org or try.courselore.org
  - Speed
  - More strategic marketing.
  - Maybe hire a designer to do a marketing page and add a wow factor to the project.

- [ ] Use function input for settings
- [ ] Email notifications
- [ ] Private questions from students to staff
- [ ] Add colors everywhere else? (Things like pins, types, and so forth) (Currently it’s only messages list)

- Mathematics, code, and possibly other things are overflowing in small screens.

- Improve display of endorsements.
- Let original question asker to approve an answer.

- [ ] Invitation links could limit the domains of the emails that could be used with them

- Live updates

  - [ ] Try to come up with a solution that doesn’t require you requesting the page again, instead, just send the data in the first place
  - https://laravel-livewire.com

- Test sliding session (touch)

### Demonstration Fixtures

- https://github.com/Marak/Faker.js
- https://github.com/chancejs/chancejs
- https://github.com/boo1ean/casual
- https://github.com/rosiejs/rosie

### Minor Improvements

- Add search by user name.
- Get rid of fitTextarea & position sticky.
- Generalize conversation category: Question, Announcement, Other.
- Investigate why `kill -9` isn’t triggering the `await` in `development.js` (this could be a major issue in production when a process dies and the other isn’t killed to let them both be respawned).
- Manage answer tags more intelligently:
  - Answered at all.
  - Answered by staff.
- Styles issues.
  - Simplify icons in sidebar (they’re wrapping now).
  - Tippy & live reload.
    - Reset Tippy somehow?
  - Don’t breakpoint Demonstration Mode bar on phone if “Turn off” doesn’t show up.
  - `heading--2` needs `flex-wrap`, for example, `/settings/your-enrollment` at 320px wide.
  - The Search box doesn’t align with the highlighted conversation.
- Test that pins are working…
- Test interface with weird data: Long text, long words, too many tags, and so forth.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).

### Authentication

- Forgot password.
- Email confirmation.

### Courses

- Different course states, for example, archived.
- Remove course entirely.
- Create custom roles (beyond “staff” and “student”) and manage fine-grained permissions.
- Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Control who’s able to create courses, which makes sense for people who self-host.

### Invitations

- Limit invitation links to certain domains.
- Have an option to require approval of enrollment.
- Have a public listing of courses in the system and allow people to request to join.

### Conversations

- Tags:
  - Special:
    - Pin.
    - Question & Answer.
      - Answers by staff or endorsed by staff are presented with a badge.
  - User-generated, for organizational purposes, for example, “Assignment 3”:
    - Created & managed by staff.
    - Give option to make them mandatory to students when creating a conversation (not necessarily when posting).
    - Tags attach to conversations as well as to entries.
    - These tags may be private to instructors to allow for tags like “Change for Next Semester”.
    - Tags may have dependencies, for example, an entry tagged “Patch to Handout” may only occur in a conversation tagged with “Assignment”.
    - Good-to-have: Actions in the system triggered by tags. This idea is still a bit vague.
- Likes.
- Different modes: Forum vs Chat.
- Different states: Open vs archived.
- Different visibility: All, staff, or students. A student + staff, for private questions.
- Flag messages to answer later.

### Notifications

- **How:**
  - Via email.
  - In CourseLore as **read indicators**.
  - In CourseLore as a dedicated alerts kind of thing.
- **What:**
  - Subscribe to whole courses to be notified of everything.
    - Unsubscribe from certain conversations.
  - For people who aren’t subscribe to the whole course, give an option to subscribe to threads.
    - Give option to automatically subscribe them when they post.
  - Regardless of notification preferences, staff may send messages that are notified to everyone.
- **When:** Real-time vs digest.
- **Mentions:**
  - We’ll use automatically-generated usernames, for example, `@leandro-facchinetti--27348`.
  - We won’t have a user profile page yet (maybe in the future), so the `@mentions` will not link to anywhere. They just exist for the benefit of the notification system.
  - Also support things like `@staff` / `@students` / `@channel` / `@group-3`.
- **Nice-to-have in the future:**
  - Other channels: Use the browser Notifications API & Push API; Desktop & phone applications.
  - Snooze.

### Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to that information.

### API

- To integrate with other platforms, like, LMSs.
  - Learning Tools Interoperability (LTI).
- To build extensions, for example, ask a question from within the text editor.

### Users

- Avatars.
  - Gravatar.
- Multiple emails? Probably not, just the one institutional email (which is the account identifier). If people are affiliated with many institutions it’s likely that these institutions will be using different CourseLore instances anyway…
- Allow people to remove their accounts.
- User profile pages:
  - A little bio.
  - Accessible to other students, but not to the general public.
  - Make `@mentions` link to the user profile page.
- Make a little popup that displays basic user information, for example, the biography, when you hover over a name/mention.

### Text Editor Niceties

- Templates for questions (like GitHub Issues).
- Reuse answers.
- Paste tables from Excel and have them formatted as Markdown tables.
- Give the fit-textarea a max-height: https://github.com/fregante/fit-textarea/issues/17

### Text Processor

- Emoji with the `:smile:` form.
- Proxy insecure content: https://github.com/atmos/camo
- Reference on more features ideas: <https://github.com/gjtorikian/html-pipeline>
- Polls.
- Lightbox modal for resized images.
- Add support for videos: Sanitization, dimensions, and so forth.

### File Management

- Let people configure other storage engines (for example, S3).
- Create a **garbage collection** routine for attachments.
- Clean geolocation from images.

### Search

- In contents of a course (for example, search for `NullPointerException` to find that thread that helped you out).
  - Search within the scope of a course.
  - Search in all courses you’re taking (for example, search for `deadline extension`).
  - Reference: GitHub let’s you search in different scopes like that.
- Filter by tags.
- Dropdown helpers to pick mentions & references.
  - https://github.com/zurb/tribute
- Include snippets of search results. This is challenging because the contents of messages are Markdown, and the snippet must be aware of the parsing structure.

### Forms Niceties

- Use `maxlength`.
- Keep the buttons disabled while the form isn’t in a valid state.
- Use date pickers:
  - https://github.com/jcgertig/date-input-polyfill
  - https://github.com/Pikaday/Pikaday

### Statistics

- How many questions & how fast they were answered.
- Student engagement for courses in which participation is graded.

### Landing Page

- Try to make animation consume less resources. (Currently it’s making the “this tab is consuming too much energy” warning pop up in Safari.)
  - Maybe it has to do with computing the sine of large numbers? Clamp the values between 0–2π to see if that helps… Or maybe just cache a bunch results…

### Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

### Native Applications

- Can we get away with not having native applications? How much does it hinder our ability to do things like notifications?
- Desktop with Electron & mobile with web views? Maybe React Native?
- Have registry of CourseLore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)

### Translate to Other Languages

### Design & Accessibility

- Add a toggle to switch between light mode and dark mode, regardless of your operating system setting? I don’t like this idea, but lots of people do it. Investigate…
- Test screen readers.

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

</details>

<details>
<summary><strong>Implementation Notes</strong></summary>

### Email

- Have options to use third-parties, but also provide our own email delivery solution. Why?
  - To really protect everyone’s privacy, instead of potentially leaking sensitive information to the third-party who’s delivering the email.
  - More moving parts that may go down.
  - Cost.
- Requirements for good deliverability:
  - IPv6.
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
  - TLS
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
  - VERP
    - <https://meta.discourse.org/t/handling-bouncing-e-mails/45343>
- Third-parties:
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

### Authentication

- Passwordless authentication (Magic Authentication Links)
  - https://github.com/nickbalestra/zero
  - https://github.com/mxstbr/passport-magic-login
  - https://github.com/vinialbano/passport-magic-link
  - http://www.passportjs.org/packages/passport-passwordless/
  - https://github.com/florianheinemann/passwordless
  - https://hacks.mozilla.org/2014/10/passwordless-authentication-secure-simple-and-fast-to-deploy/
  - https://reallifeprogramming.com/how-to-implement-magic-link-authentication-using-jwt-in-node-8193196bcd78?gi=10747bc1322e
  - Don’t say whether the user is on the database: https://www.linkedin.com/pulse/dont-do-you-implement-magic-links-authentication-adrian-oprea
  - https://blog.jacksonbates.com/passwordless
  - https://www.freecodecamp.org/news/360-million-reasons-to-destroy-all-passwords-9a100b2b5001/
  - https://www.npmjs.com/package/passport-jwt#extracting-the-jwt-from-the-request
  - https://www.youtube.com/watch?v=KiYfWaGRHTc
  - https://softwareontheroad.com/nodejs-jwt-authentication-oauth/
  - https://medium.com/@aleksandrasays/sending-magic-links-with-nodejs-765a8686996
  - https://hackernoon.com/expressjs-integration-guide-for-passwordless-authentication-with-didapp-y55p3yss
  - https://github.com/alsmola/nopassword
  - https://www.wired.com/2016/06/hey-stop-using-texts-two-factor-authentication/
  - https://medium.com/@ninjudd/lets-boycott-passwords-680d97eddb01
  - https://medium.com/@ninjudd/passwords-are-obsolete-9ed56d483eb
  - https://notes.xoxco.com/post/27999787765/is-it-time-for-password-less-login
  - https://notes.xoxco.com/post/28288684632/more-on-password-less-login
  - Let’s not use JWT, because you have to check if a token has already been used anyway; at that point, just give a plain token that you stored in the database.
    - https://www.youtube.com/watch?v=dgg1dvs0Bn4
- Prevent people from trying to brute-force login. Put a limit on the amount of magic links you may generate in a period. Though I think that’ll be covered by the general rate-limiting solution we end up using.
- Good-to-have in the future: SSO with Hopkins ID
  - SAML.

### Queues

- For background tasks, such as sending email.
- Consider following the supposedly **bad practice** of using a database (SQLite, in this case) as a queue, because it’s simpler.
  - http://sqlite.1065341.n5.nabble.com/SQLite-is-perfect-for-FILE-based-MESSAGE-QUEUE-td57343.html
  - https://rdrr.io/cran/liteq/man/liteq.html
  - https://github.com/kd0kfo/smq/wiki/About-SMQ
  - https://github.com/damoclark/node-persistent-queue

### Code Base Improvements

- Consider using **session per request** middleware for database transactions.
  - Considerations:
    - We shouldn’t keep the transaction open across ticks of the event loop, which entails that all request handlers would have to be synchronous.
    - Moreover, as far as I can tell the only way to run a middle **after** the router is to listen to the `res.once("finish", () => {...})` event. But I think that this goes across ticks of the event loop.
    - Maybe I can just call `next()` and then look at the `res.statusCode`?
    - I think that transactions are only relevant if you’re running in cluster mode, because otherwise Node.js is single-threaded and queries are serialized, anyway.
  - References:
    - https://goenning.net/2017/06/20/session-per-request-pattern-go/
    - https://stackoverflow.com/questions/24258782/node-express-4-middleware-after-routes
    - https://www.lunchbadger.com/blog/tracking-the-performance-of-express-js-routes-and-middleware/
    - https://stackoverflow.com/questions/27484361/is-it-possible-to-use-some-sort-of-middleware-after-sending-the-response-with
    - https://stackoverflow.com/questions/44647617/middleware-after-all-route-in-nodejs
    - https://github.com/jshttp/on-finished
    - https://github.com/pillarjs/router/issues/18
- Produce native ESM:
  - It’s too fresh, assess again starting 2021-08.
  - Blocked by experimental support in ts-node-dev (https://github.com/TypeStrong/ts-node/issues/1007) & Jest (https://jestjs.io/docs/en/ecmascript-modules).
  - ESM unlocks top-level await, which is cool, but I don’t we’d need.
- <https://github.com/wclr/ts-node-dev/issues/243>: Stop using `--pool` when calling `ts-node-dev`.
- Use `Cache-control: no-store`.
- Use database indices where necessary.
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
- HTTP/2:
  - <https://github.com/expressjs/express/issues/3388>: Express doesn’t work with Node’s http/2 implementation, because the `req` and `res` aren’t compatible.
  - Use the spdy package (seems abandoned, and people said it doesn’t work with recent versions of node: https://github.com/spdy-http2/node-spdy/issues/380)
  - Try express 5.
  - <https://gist.github.com/studentIvan/6c78886c140067936ff379031fd12e14>
  - <https://www.npmjs.com/package/http2-express-bridge>
  - Frameworks that seem to support it out of the box:
    - koa
    - Hapi
    - tinyhttp
- Auto-updater
- Make a redirect `download.courselore.org` that points to installer.
- Make a demo version that self destructs every hour (like Moodle: https://moodle.org/demo)
- “One-click deployment” for different platforms like DigitalOcean, Linode, and so forth.
  - DigitalOcean
  - Linode
  - Amazon
  - Google Cloud
  - https://sandstorm.io
- Page transitions & prefetching
  - https://hotwire.dev
  - https://docs.stimulusreflex.com
  - https://barba.js.org
  - https://swup.js.org/getting-started
  - https://unpoly.com
  - https://youtube.github.io/spfjs/
  - https://getquick.link/
  - https://github.com/defunkt/jquery-pjax
- Backups.
  - For us, as system administrators.
  - For users, who may want to migrate data from a hosted version to another.
    - Rewrite URLs in messages.
- Update to `@types/node@16.0.0`.

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
- <https://github.com/zulip/zulip>
- <https://github.com/mattermost/mattermost-server>
- <https://github.com/RocketChat/Rocket.Chat>
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
  - https://hub.balena.io
  - https://github.com/awesome-selfhosted/awesome-selfhosted
  - https://selfhosted.show
- <https://github.com/npm/roadmap/projects/1>: A meta-reference on how to present the roadmap moving forward.
- References on text editors:
  - https://typora.io
  - https://www.notion.so
  - https://marktext.app
- Write more automated tests

</details>

<details>
<summary><strong>Meetings</strong></summary>

<details>
<summary>2021-08-21</summary>

- Progress.
  - Anonymity.
  - Staff-only conversations.
  - Email notifications.
    - Settings.
    - Haven’t finished interaction with other features (staff-only conversations, for example).
  - Polished read indicators:
    - They weren’t showing up for the current message on small screens (because of fake conversations list presenting).
    - On the side of messages.
  - Polished messages list:
    - Borders.
    - Colors on badges.
  - Several small fixes:
    - Padding bottom scrolling bug.
    - Scroll to unread message.
- We decided to not launch on the fall, but wait for the next spring. Show CourseLore to more people along the way and work on their feedback.
- Things we want for the spring:
  - 1-1 conversations.
  - Chat.
  - demo.courselore.org or try.courselore.org
  - Speed
  - More strategic marketing.
  - Maybe hire a designer to do a marketing page and add a wow factor to the project.

</details>

<details>
<summary>2021-08-14</summary>

- Finished conversations screen:
  - Fixed bug of messages from different threads showing up.
  - Finished Types (as opposed to just question).
  - Finished styles (including things like user-generated Markdown).
  - Fixed weirds styling issues, for example, scrolling when Tippy was activated.
  - Brought Demonstration Data up to date with the schema.
- Implemented read indicators.

</details>

<details>
<summary>2021-08-07</summary>

- Styling and user interface.
- Custom validation errors:
  - Because the browser validations have some issues and we want more control over them. Examples:
    - The validation of `type="email"` accepts `example@example` (which is technically correct, but practically incorrect).
    - The validation of `required` accepts empty spaces (again, technically correct, but practically incorrect).
  - Because we want to show error messages in a style that’s consistent with the rest of the application, and in our own language, as opposed to the different browsers messages.
  - Because we want to apply validations to elements that the Constraint validation API doesn’t support, for example, `<button type="button">`.
- Categories.
- Did a brief research on the space of email senders; played with the SendGrid API.

</details>

<details>
<summary>2021-07-31</summary>

- Created demonstration data.
- Started working on style changes asked by Dr. Scott: Colors; logo; and so forth.

</details>

<details>
<summary>2021-07-24</summary>

- Requests from last meeting:
  - Heading styles.
  - Moved Course menu to the left.
  - Scrolling issues.
- Tags.
  - Tag conversations.
  - Filter by tag.
- Search is just missing a `SELECT`…

</details>

<details>
<summary>2021-07-17</summary>

- Improved user profiles.
  - Optional names.
  - Avatars & Biographies.
- Implemented a unified solution to a bunch of problems:
  - No HTTPS/2 in production.
    - Prevents more than 6 connections for server-sent events.
  - No HTTPS in development.
  - No compression on responses.
  - The solution was to use Caddy as a reverse proxy, instead of letting the Node.js process itself exposed to the world.
- Button to turn off server in demonstration mode.
- Finished tag management screen.
- Started learning about FTS.

</details>

<details>
<summary>2021-07-10</summary>

- Finish basics of threads screen: Editing & deleting posts; Likes; Endorsements; Generalized live updates. Tags: Mark posts as answers; Create arbitrary tags.
- Asked for demo class for showing people starting August. Asked for categories, such as Question, Announcement, and Other.

</details>

<details>
<summary>2021-07-03</summary>

- Progress:
  - Images & attachments: Upload button; drag-and-drop; copy-and-paste.
  - References, for example, `#4/3`.
  - Quoting of selected text.
  - @leafac/css.
  - `data-ondomcontentloaded`.
  - Mousetrap.

</details>

<details>
<summary>2021-06-26</summary>

- Styled user-generated content such that nothing breaks the layout and everything looks nice.
- Text editor improvements:
  - Expand with content.
  - Toolbar.
    - Including **undo** when possible.
  - Keyboard shortcuts.
  - Started the image & attachments uploads (which is also the backbone of user avatars, and so forth).
- Roadmap.

</details>

<details>
<summary>2021-06-19</summary>

- Progress:
  - Styled pages:
    - Invitations.
    - Showing the menu first when on mobile & going to the course main page.
    - Follow Magic Authentication Link but already authenticated.
    - Threads screen (not finished).
  - Notification for when you’re invited to a course by email.
  - `:focus`, `:hover`, `:active`, and so forth.
- Next week:
  - 10 weeks.
  - Finish threads screen.
    - Finish questions & answer tagging.
    - Edit.
    - Styles for Markdown.
    - Reference posts.
    - @mentions.
    - Text editor.
    - Upload images.
      - Drag and drop.
      - Control + V.
  - Tags: Create & Filter.
  - Generalize live updates.
  - Notifications.
    - Email configuration.
  - Flags.
  - Search.
  - Statistics.
  - Anonymity.
    - Persona.
  - Threads private to instructors.

</details>

<details>
<summary>2021-06-12</summary>

- Progress:
  - Continued the make-over with the new design system: Landing pages (for example, when you just created a course), course settings, threads pages.
- Next week:
  - Finish the redesign with the new design system.
  - Come up with a roadmap.

</details>

<details>
<summary>2021-06-05</summary>

- Progress:
  - Continued the make-over with the new design system. Did the home page, brought back Dark Mode support, did the sign in / sign up workflow, including the Demonstration Inbox, created almost all the components we’ll need (tooltips, dropdowns, modals, and so forth), added support for `prefers-reduced-motion`, and so forth.
- Next week:
  - Finish the redesign with the new design system.

</details>

<details>
<summary>2021-05-29</summary>

- Progress:
  - Finish almost every screen using Bootstrap.
  - Wasn’t satisfied with the result: Either we’d end up with a stock-Bootstrap looking application, or the customization would amount to as much work as doing more things from scratch. But the result would be even worse, because people would have to know CSS **as well as Bootstrap**.
  - Started a make-over with a design system lifted from Tailwind. Borrowing only a couple helpers for things like tooltip positioning and modals.
- Next week:
  - Continue the redesign with the new design system.

</details>

<details>
<summary>2021-05-22</summary>

- Progress:
  - Worked fewer hours this week.
  - Styled most of the Course Settings pages (separated them into multiple pages).
  - Small usability improvements, for example, flash session messages saying your operation (for example, updating your profile) was successful.
- Next week:
  - Finish the following screens: Threads, course settings, and invitations.
  - Return to posts tags.

</details>

<details>
<summary>2021-05-15</summary>

- Progress:
  - Started a user-interface overhaul: Responsive design, accessibility, fancier components for a bit of a “wow factor”, and so forth.
  - Started using Bootstrap. Not Tailwind because Bootstrap has components, as opposed to just utilities. We’re continuing to use @leafac/css instead of utilities. We aren’t using many things from Bootstrap, for example, the grid system, because CSS Grid is better for our case.
- Next week:
  - Finish the following screens: Threads, course settings, and invitations.
  - Return to posts tags.

</details>

<details>
<summary>2021-05-01</summary>

- Progress:
  - Tags.
    - Pinning.
    - Question & Answer.
  - Keyboard navigation.
  - Many internal improvements on how icons and CSS are handled.
- Next week:
  - On checkboxes that are icons:
    - Change the text.
    - Change the cursor.
  - On buttons that toggle state:
    - Add a tooltip: Show the tooltip right away, and let them be long if necessary.
  - Move the “Threads that are pinned” to a tooltip.
  - Editor helpers for things like **bold**, _italics_, and so forth.
  - Staff endorsements.
  - Tag creation is a separate step under Course Settings.
    - Private tags: Tags that only staff sees.
    - Don’t let students create tags.
    - Force students to tag the threads they initiate.
    - Attributes on tags.
  - Search.

</details>

<details>
<summary>2021-04-24</summary>

- Progress:
  - Live update posts, and counts (of posts & likes).
  - Reply to.
  - Only ask for confirmation if actually going go to lose data.
  - Save the content of a new post textarea in localStorage.
  - Tags.
  - Introduced types to layouts, middlewares, and so forth.
- Next week:
  - Tags.
    - Pinning.
    - Question & Answer.
    - Tag creation is a separate step under Course Settings.
      - Private tags: Tags that only staff sees.
      - Don’t let students create tags.
      - Force students to tag the threads they initiate.
    - Instructor likes → Endorsed.
    - Attributes on tags.
  - Search.

</details>

<details>
<summary>2021-04-17</summary>

- Progress:
  - Infrastructure for live updates of stuff on the page.
  - Notification when someone else posts on a thread.
  - Likes.
  - Small niceties: Warn before leaving page; thread and post deletion; and a count of posts on threads.
  - Stuff you don’t see: A refactoring of the types and local data; and a simpler migration system (which allows functions in addition to SQL).
- Next week:
  - Fix the alignment of “alerts”.
  - Live update posts & likes count.
  - Save the content of a new post textarea in localStorage.
  - Tags.
    - Question & Answer.
    - Instructor likes → Endorsed.
- Mobile app may not be necessary, as web applications are capable of some “native” things.

</details>

<details>
<summary>2021-04-10</summary>

- Progress:
  - Finished invitation emails.
  - Manage enrollments.
- Questions:
  - Delete courses, users, and so forth: Let’s do it later.
- Nice to have: Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Next week:
  - Update threads when other people post.
  - Focus on forum features like **tags** (both on threads and on the posts), upvotes & notifications.

</details>

<details>
<summary>2021-04-03</summary>

- Progress:
  - Fixed the bug that was causing my name to appear in a post created by Dr. Scott (it was a simple mistake in one of the queries I DRYed up last week 🙄)
  - I forgot to mention last week, but I came with a solution for images working in light vs dark background: I simply added a background color to transparent images…
  - Finished invitation links.
    - Timezone issues.
  - Editing threads and posts.
  - Started invitation emails.
  - Experimented with [Turbo](https://turbo.hotwire.dev).
- Next week:
  - Finish invitation emails.
  - Manage enrollments.
  - Update threads when other people post.
  - Focus on forum features like **tags** (both on threads and on the posts), upvotes & notifications.

</details>

<details>
<summary>2021-03-27</summary>

- Progress:
  - Fixed everything that was broken last week: Threads, accent colors, and so forth.
  - Invitation links can be created and modified (almost—the backend for that isn’t working yet). Also, the invitation links don’t work yet.
  - DRYed up queries: Most of them happen in a single location and are reused throughout the request. Extracted data types (TypeScript) to clean up the code base.
  - Worked on styles & form validation: Datetime fields; form elements like radio and checkboxes; avoid zooming in on text fields in iOS; use SVG to draw icons & things like the circle that indicate the course accent color; and so forth.
- For next week:
  - Fix name on posts.
  - Finish invitations!!
  - Editing threads and posts.
  - Update threads when other people post.
  - Focus on forum features like **tags** (both on threads and on the posts), upvotes & notifications.
- Other ideas: Registry of CourseLore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)

</details>

<details>
<summary>2021-03-20</summary>

- Progress:
  - Better session management:
    - Being able to expire sessions individually.
    - Decouple the session from the email (being able to change emails in the future, if we wish).
    - Rolling sessions.
  - Visuals.
  - Finished accent colors (but they’re broken now for other reasons).
  - Using magic authentication links when already signed in.
  - Form validation.
  - Reuse queries.
- For next week:
  - Finish invitations.
  - Editing threads and posts.
  - Update threads when other people post.
  - Focus on forum features like tags, upvotes & notifications.

</details>

<details>
<summary>2021-03-13</summary>

- Progress:
  - Dark mode.
    - Syntax highlighter.
  - Small details
    - Cmd+enter to post.
    - Prevent long lines from breaking the interface.
  - Many quality-of-life improvements in the code base.
    - Best way to open SQLite database.
    - Manage cookies correctly so that session remains after browser is closed.
    - Form validation errors.
    - 404 page.
  - Work-in-progress:
    - Accent color switcher.
    - Invitations.
- Questions:
  - Should we allow course assistants to create courses and handle invitations?
    - Staff / student.
  - Do we want to keep a trace of what happened? (Edits, deletions, and so forth?)
    - We don’t need it now.
    - Only staff should be able to see it.
- At some point: Add a toggle to the dark mode support.
- For next week:
  - Finish accent colors.
  - Finish invitations.
  - Change roles to staff/student.
  - Editing posts. (And threads, and your profile, and so forth.)
  - Update threads when other people post.
  - Focus on forum features like tags, upvotes & notifications.

</details>

<details>
<summary>2021-03-06</summary>

- Developed a two-column layout for the course pages and fleshed out the styles across the application.
- Developed @leafac/css.
- Released caxa@1.0.0.
- Released a video about the background animation on the homepage.
- For next week:
  - Change background color
    - Pick a random one at course creation.
    - Let people change but have a default for the course.
    - Default palette.
    - https://marketplace.visualstudio.com/items?itemName=johnpapa.vscode-peacock
  - Dark mode.
  - Course enrollment invitations.
  - Update threads when other people post.
  - Editing posts. (And threads, and your profile, and so forth.)

</details>

<details>
<summary>2021-02-27</summary>

- Threads are working.
- Worked on styles & the small details:
  - Text editor.
  - Relative time (for example, `3 hours ago`).
  - Logo animation.
  - Buttons go into a ‘loading’ state to prevent double-submission.
  - Links change color.
- Started an utility to process CSS.
- Multiplatform testing & development setup.
- What should I work on next?
  - Options:
    - More forum-related features:
      - Notifications on updates
      - Anonymity.
      - Tags.
      - Instructor endorsed answers.
    - More onboarding features:
      - Invitations.
  - Answers:
    - For next week:
      - Threads list on a column on the left.
      - Tab on the text editor.
      - Make entries more lightweight.
      - Why isn’t the home two column?
      - Onboarding is broken.
    - Long-term:
      - Anonymity.
      - Search.
      - Filtering.
        - Only show my posts.
      - Nested posts.
      - Chat.
        - Integrated with the forum, not as two modalities.
        - A chat could be just another thread.
      - Groups.
      - Pin conversations.

</details>

<details>
<summary>2021-02-20</summary>

- Demonstration:
  - Clearer communication in sign-up/sign-in.
  - Create course.
  - Join course.
  - Create thread.
- Automated tests.
  - **Got + JSDOM** / Puppeteer / Cypress / Selenium.
- The packaging is working on Windows.
- What do we want the text editor to look like?
  - Simple, like GitHub’s.
- How to invite people to the course?
  - With link.
    - Different links for different roles.
  - With a list of emails.
  - Expiration dates on invitations.
- How should threads look like? One page for the list of threads and one page per thread (à la GitHub Issues), or one page with both the list of threads and one thread (à la Mail.app (and Piazza, for that matter…))?
  - We’re going GitHub-style on mobile and Mail.app style on the desktop.
- Show participation grades for courses in which that’s graded. (We don’t do the grading, we just present the statistics.)
- Templates for questions.
- Live course communication during the lectures:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

</details>

<details>
<summary>2021-02-13</summary>

- Finish the account creation workflow and wired it to the authentication workflow demonstrated last week.
- Tried to use [ECMAScript modules](https://nodejs.org/api/esm.html) (because of top-level async/await). Still too fresh. While Node’s support for them isn’t experimental anymore, some of the underlying infrastructure still is, so other tools in the ecosystem (for example, Jest & ts-node-dev) don’t support them very well (require flags and whatnot).
- Had issues with some native modules (for example, sharp) not working with @leafac/pkg. Ended up creating <https://npm.im/caxa>.
- Had issues with types for <https://www.npmjs.com/package/express-async-handler>. Ended up creating <https://npm.im/@leafac/express-async-handler>.
- Created a proper **demonstration** mode for CourseLore.

</details>

<details>
<summary>2021-02-06</summary>

- Wrote documentation at https://github.com/courselore/courselore and these documents you’re looking at.

- Last week Dr. Scott asked what are the operating system dependencies to run the `courselore` executable (which is generated with @leafac/pkg). To answer this, I tested putting the binary in a Docker container created from [scratch](https://hub.docker.com/_/scratch); that didn’t work. Then I tried [alpine](https://hub.docker.com/_/alpine); that didn’t work either! Then I tried [ubuntu](https://hub.docker.com/_/ubuntu/); that worked (naturally, since we’re running Ubuntu in production & on GitHub Actions). So, as it turns out, not only does the `courselore` executable need some support from the operating system, but it seems like lightweight things like musl libc may not be enough. I’ll take that…

- Did the signup / login flow with magic links: https://courselore.org/login

  - Login workflow
  - Sessions
  - Database

- Changes to the website:

  - Wider.
  - Mention API.
  - Convert to Markdown and use the text processing pipeline we developed for forum posts.

- Open-source contributions:

  - <https://www.npmjs.com/package/@leafac/sqlite>
  - <https://www.npmjs.com/package/@leafac/sqlite-migration>
  - <https://github.com/leafac/pkg/commit/ccc29eadc33f7a92179a68614e9d7ab1b5017e6c>

</details>

<details>
<summary>2020-01-30</summary>

#### Progress Report

- The text processor for posts is done. It supports Markdown, LaTeX, and syntax highlighting. Also, it’s secure against Cross-Side Scripting (XSS) attacks. [Here’s some input that exercises all these features](https://github.com/courselore/courselore/raw/e01f05f87039326fba47abab24c78a754a4ff7a8/misc/text-processor-example.md).

- Setup the infrastructure for GitHub Actions:

  - Run the test suite on Linux, macOS, and Windows.
  - Create binaries for all these operating systems.
  - Distribute the binaries as [releases](https://github.com/courselore/courselore/releases/) and as [nightly builds](https://github.com/courselore/courselore/actions/runs/537293785) (GitHub Actions Artifacts)

- Released the following packages:

  - <https://npm.im/courselore>: If people already have Node.js installed, they may try CourseLore with `npx courselore`. Also, they may `npm install courselore` to mount CourseLore as part of a bigger Node.js application. That isn’t the preferred deployment strategy (using the binaries is), but it’s a possibility for advanced users.

  - <https://npm.im/@leafac/rehype-shiki>: Rehype is part of the text processor, and Shiki is a syntax highlighter based on Visual Studio Code’s syntax highlighter. <https://npm.im/@leafac/rehype-shiki> is a package that connects the two and improves on the existing <https://npm.im/rehype-shiki> with support for the latest Shiki version, some architectural differences that decouples the dependencies a little better, and brings TypeScript support.

  - <https://npm.im/@leafac/html>: A safe and convenient way to use JavaScript’s tagged template literals as an HTML template engine.

  - <https://npm.im/@leafac/pkg>: Fixes some problems with <https://npm.im/pkg>, particularly in how it manages native modules.

#### Design Decisions

- The course URLs may be:

  - **In a flat namespace or in a hierarchical namespace.** A flat namespace is like Reddit’s `/r/<name>`, and a hierarchical namespace is like GitHub’s `/<user-or-organization>/<repository>`.

    - A flat namespace is good because it’s simpler, particularly in self-hosted installations for a single user (think of how silly `courselore.leafac.com/leafac/<course>` looks).

    - A flat namespace is bad because it clashes easily (think of multiple teaching a course identified as `cs-101`).

    - A hierarchical namespace makes sense when there’s the notion of **organizations**, which could be a group of people who have several courses together. That case probably is rare.

  - **Given by the user, or generated by the system.** An URL given by the user is like Reddit’s and GitHub’s URLs (for example `github.com/leafac/<repository>`). An URL generated by the system is like YouTube (for example, `youtu.be/<random-string-that-is-the-video-identifier>)`.

    - An URL given by the user is simpler to share (think of an URL projected on the board in a classroom).

    - URLs given by the user are more complex for the system, because we have to handle renames, redirects, and so forth.

  - **We decided to go with a flat namespace and system-generated URLs.** For example, `courselore.org/fjdkwoer83`. Because URLs are generated by the system, we don’t see a need for a subpath like `/r/<something>`. We know not to generate identifiers that would clash with routes we’d want to use, for example `/settings`. We may want to have some sort of aliasing in the future so users can create their own readable URLs if they want.

  - **References:**

    - Piazza has alises like `piazza.com/jhu/fall2020/en601329/home`.
    - Campuswire uses the Reddit approach with URLs like `campuswire.com/c/G9E051068/feed`.
    - They have different URLs for joining a course and then later for visiting it. We don’t want that.
    - <https://www.acadly.com/> only has the **magic link** approach.
    - <https://superauth.com>: A technology to handle authentication.

- Authentication methods:

  - The options are:

    1. A plain username/password authentication strategy.
    2. A **magic link** approach like Slack.
    3. Single sign-on integrated with universities’ systems.

  - We’re going with Option 2 for now, as it seems like a good sweet-spot in terms of security, simplicity to implement, and generality. It works for every university without extra effort on our part. That said, we may still give Option 1 as an alternative (as Slack does). Also, people may customize CourseLore with their own routes to implement Option 3.

  - **Note:** We’re following Slack in the approach to authentication (the so-called **magic link**), but we’re **not** going to have the weird separation of accounts per team that Slack has. There will only be one CourseLore account per email and the user may join multiple courses.

</details>

<details>
<summary>2021-01-06</summary>

- The project has officially started! 🙌
- How we’re different from existing platforms
  - Open-source
  - Self-hosting option
  - Privacy & more care with students data
  - Slicker interface than Piazza
  - Lightweight when compared to full LMS like Moodle
  - Articles showing that people care about these issues:
    - https://thetech.com/2020/03/05/piazza-security
    - https://www.stanforddaily.com/2020/10/04/concerned-with-piazzas-data-privacy-management-some-professors-look-to-alternative-discussion-forums/
    - https://matheducators.stackexchange.com/questions/7406/more-user-friendly-alternatives-to-piazza-service
    - https://redecentralize.org
- We’re meeting on Saturdays, at 10:00 EST
- Our next steps are to come up with a name and investigate the competition to come up with a list of initial features

</details>

<details>
<summary>2021-01-05</summary>

- Vision
  - An open-source platform for course interactions
- Key features
  - Piazza
    - Q&A
    - Announcements
    - Anonymity
    - Chat
  - More interactive/modern interface
  - FERPA compliance and stuff
- Competition
  - https://piazza.com/
  - https://campuswire.com
  - https://discourse.org
    - Hartz at MIT doing it - see https://thetech.com/2020/03/05/piazza-security
    - https://www.stanforddaily.com/2020/10/04/concerned-with-piazzas-data-privacy-management-some-professors-look-to-alternative-discussion-forums/
    - https://matheducators.stackexchange.com/questions/7406/more-user-friendly-alternatives-to-piazza-service
    - Could we do a Discourse plugin?
  - https://us.edstem.org
  - https://aula.education
  - https://yellowdig.com
  - Moodle
    - It’s a whole LMS, not a Q&A

</details>

</details>
