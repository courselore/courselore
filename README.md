<h1 align="center"><a href="https://courselore.org">CourseLore</a></h1>
<h3 align="center">Communication Platform for Education</h3>
<p align="center">
<a href="https://github.com/courselore/courselore"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/courselore"><img alt="Package" src="https://badge.fury.io/js/courselore.svg"></a>
<a href="https://github.com/courselore/courselore/actions"><img src="https://github.com/courselore/courselore/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

<details>
<summary><strong>Backlog</strong></summary>

### Spring 2022 Milestones

- More granular control of who’s in a conversation (1-on-1, just a group of people, and so forth).
- Chat.
- Performance.
- More strategic marketing
  - User groups.
  - Marketing page.
  - Maybe hire a designer.

### Minor Things We Should Do Right Away

- `heading` needs `flex-wrap: wrap`. See, for example, `/settings/your-enrollment` at 300px wide.
- Update to `@types/node@16.0.0`.
- Let staff-only conversations use the same global counter as regular conversations.
- Consistent colors on things like pins.
- Improve the presentation of anonymity for people who get to see the true identity of the person (the person themselves, and staff).
- Let staff change the conversation from staff-only to regular.
- Make search include author name.
- Favicon (SVG & notification indicator).
- Instead of calling `await courselore()` and then updating the settings, use function arguments.
- Fix private questions from students to staff. (Don’t `WHERE` away conversations if you’ve been part of it.)
- Mathematics, code, and possibly other things are overflowing in small screens.
- Improve display of endorsements.
- Manage answer badges more intelligently (answered at all, answered by staff).
- Let original question asker approve an answer.
- Test sliding session (touch).
- Test interface with weird data: Long text, long words, too many tags, and so forth.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).

### Users

- Gravatar as a fallback to avatar.
- Change email.
- Multiple emails.
- Allow people to remove their accounts.
- Make a little popup that displays basic user information, for example, the biography, when you hover over a name/mention.

### Authentication

- Forgot password.
- Email confirmation.
- SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).

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

- More sophisticated tag system: dependencies between tags, actions triggered by tags, and so forth.
- Different modes: Forum vs Chat.
- Different states: Open vs archived.
- Flag messages to answer later.

### Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

### Notifications

- Add support for things like `@staff` / `@students` / `@channel` / `@group-3`.
- A list of unread messages and other things that require your attention.
- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
  - Receive notifications from conversations you’ve participated in.
- Digests that accumulate notifications over a period.
- Other channels: Use the browser Notifications API & Push API; Desktop & phone applications.
- Snooze.

### Search

- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Dropdown helpers to pick mentions & references (consider using https://github.com/zurb/tribute).
- Include snippets of search results. This is challenging because the contents of messages are Markdown, and the snippet must be aware of the parsing structure. Maybe the solution is to store the parsed Markdown `.textContent` instead of the Markdown itself on the search tables.

### Text Editor

- Templates for questions (like GitHub Issues).
- Reuse answers.
- Paste tables from Excel and have them formatted as Markdown tables.

### Text Processor

- Emoji with the `:smile:` form.
- Proxy insecure content: https://github.com/atmos/camo
- Reference on more features ideas: <https://github.com/gjtorikian/html-pipeline>
- Polls.
- Resize images & lightbox modal for resized images.
- Add support for videos: Sanitization, dimensions, and so forth.

### File Management

- Let people configure other storage engines (for example, S3).
- Create a garbage collection routine for attachments.
- Clean geolocation from images.

### Forms

- Use `maxlength`.
- Keep the buttons disabled while the form isn’t in a valid state.
- Use date pickers:
  - https://github.com/jcgertig/date-input-polyfill
  - https://github.com/Pikaday/Pikaday

### Statistics

- How many questions & how fast they were answered.
- Student engagement for courses in which participation is graded.

### Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

### Infrastructure

- `try.courselore.org` (reference https://moodle.org/demo)
- Investigate why `kill -9` isn’t triggering the `await` in `development.js` (this could be a major issue in production when a process dies and the other isn’t killed to let them both be respawned).
- Live updates: Try to come up with a solution that doesn’t require you requesting the page again, instead, just send the data in the first place.
- Rate limiting.
- Database transactions:
  - One transaction per request?
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
- ESM:
  - ts-node (https://github.com/TypeStrong/ts-node/issues/1007)
  - Jest (https://jestjs.io/docs/en/ecmascript-modules).
- Use `Cache-control: no-store`.
- Database indices.
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
- Auto-updater for self-hosted.
- Backups.
  - For us, as system administrators.
  - For users, who may want to migrate data from a hosted version to another.
    - Rewrite URLs in messages.
- Automated tests.

### API

- Integrate with other platforms, for example, LMSs.
  - Learning Tools Interoperability (LTI).
- To build extensions, for example, ask a question from within the text editor.

### Native Applications

- Can we get away with not having native applications? How much does it hinder our ability to do things like notifications?
- Desktop with Electron & mobile with web views? Maybe React Native?
- Have registry of CourseLore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)

### Design & Accessibility

- Translate to other languages.
- Add a toggle to switch between light mode and dark mode, regardless of your operating system setting? I don’t like this idea, but lots of people do it. Investigate…
- Test screen readers.

### Documentation

- How to self-host.
  - Create `download.courselore.org`.
  - “One-click deployment”
    - DigitalOcean.
    - Linode.
    - Amazon.
    - Google Cloud.
    - Microsoft Azure.
    - https://sandstorm.io.
- How to contribute to the project.

### Marketing

- Newsletter.
- Create CourseLore Gravatar.
  - Use in npm.
- Create accounts on:
  - Facebook.
  - Instagram.
  - Reddit.

### References

- Communication platforms for education
  - <https://piazza.com>
  - <https://campuswire.com>
  - <https://edstem.org>
  - <https://aula.education>
  - <https://yellowdig.com>
  - <https://moodle.org>
  - <https://canvaslms.com>
  - <https://www.acadly.com/>
- General-purpose communication platforms
  - <https://github.com>
  - <https://slack.com>
  - <https://discourse.org>
  - <https://basecamp.com>
  - <https://reddit.com>
- Open-source communication platforms
  - <https://github.com/zulip/zulip>
  - <https://github.com/RocketChat/Rocket.Chat>
  - <https://github.com/mattermost/mattermost-server>
- Graders
  - <https://www.codegrade.com/>
    - <https://app.codegra.de/login>
    - <https://github.com/CodeGra-de>
    - <https://github.com/CodeGrade/bottlenose>
- Self-hosting
  - <https://www.reddit.com/r/selfhosted/>
  - <https://selfhosted.show>
  - <https://github.com/awesome-selfhosted/awesome-selfhosted>
  - <https://gitlab.com>
  - <https://wordpress.org>
  - <https://gitea.io/>
  - <https://gogs.io/>
- Text editors
  - https://typora.io
  - https://www.notion.so
  - https://marktext.app

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
