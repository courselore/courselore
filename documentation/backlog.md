# Backlog

- Monospaced font on editor.
- Do a quick hack to fix autosize not kicking in on edit messages.
- On chat message send morphdom SHOULD erase the textarea.
- Big GIFs resizing
- Check why OCaml syntax highlighting behaves strangely.
- Anonymous messages are turning into “No longer enrolled”, leaking anonymity information.

---

- Add the notion of questions being resolved.
  - Only staff may change the “resolved” status
  - List of conversations: Make it easy to see unresolved questions. Color-code and filters.
  - Use that to organize Meta Courselore.
- Meta Courselore make a pinned announcement of how to report bugs.
- Add support for underline in Markdown.

---

- Implement job for scheduling notifications
  - Delay sending notifications for a little bit to give the person a chance to update or delete the message.
  - That’s another defense against multiple notifications being sent
  - Don’t send notifications when the person is online.
  - Get notifications for replies to your posts. If a student asks a question they probably would like notifications on all replies. That might want to be on by default as well.

---

- Live-updates:
  - Chat input area isn’t emptying.
  - Inputs of any kind.
  - Tooltips.
  - Relative times (for example, “2 days ago”).
  - Multiple message submissions.
  - Look for leaking event listeners.

---

- Lazy loading
  - userPartial
  - Edit message forms
    - Should also fix the bug in which you send a couple messages in a row, they coalesce, and then you try to edit.
  - Views component showing who saw each message and when
  - On mobile, decouple the list of conversation (the sidebar on desktop) from the conversation itself, to push less data on the wire
  - (We’re already doing it for things like the @mention component. Just use the same approach)
  - (Should we use web sockets instead of http to skip authentication, and that sort of thing)
- We need to update the online status of other users as they come online
- Add some view caching
- Potential issue: when we deploy a new version, the morphdom doesn’t update the global css & js. Solution: force a reload

---

- Add a help screen under the “About Courselore” button:
  - A more app-like experience (in iOS):
    - Bookmark Courselore to home screen.
    - Use VIPs as notifications mechanism.
  - If things look weird, or if something doesn’t work, you may need to update your browser.
- Make a public page listing known issues.
- Add a call-to-action on the bottom navigation bar that isn’t just about reporting bugs, but about providing feedback and joining the Courselore community.

---

- Rename table `readings` -> `views`.
- Remove `data-` in favor of `oninteractive`.
- Change from `addEventListener` to `onEvent`.
- Confirm email -> verify email.

---

- Live reloading:
  - Special behaviors:
    - Times and other components are blinking on reload. Add them to `onrefresh`.
    - Latency compensation when sending messages (particularly on chat).
    - Latency compensation when pressing “like”.
  - We may do latency compensation by returning the HTML to render as the response to the POST, instead of relying on the refresh event (similar to responding to a POST with a Turbo Stream).
  - On chats (which need to scroll to the bottom), do something to prevent flash of unstyled content. (I commented out the previous hack, look for `TODO`.)
  - Do the morphdom on the server.
    - **This is necessary for correctness as well; see what happens when you’re editing a message (not writing a new one, because we use localStorage to remember that one) and a new message is submitted, causing a refresh.**
  - The views component should live-update.
- Write a function to determine if processing the message is even necessary. Most messages don’t use extra features and could skip JSDOM entirely.
- Pagination.
  - Messages in conversation.
  - Conversations on sidebar.
  - Test with thousands of messages.
- Investigate other potential bottlenecks:
  - `html` tagged template literal.
  - Synchronous stuff that could be async.
- Components which we repeat in the HTML, making it bigger, but should DRY:
  - The `edit` form for messages. Use `data-content-source` that’s already used by the quoting mechanism.
    - That should fix jump in autosize, which can’t calculate width of a hidden element.
  - `userPartial`s, particularly on the list of who read each message.
- Make Demonstration Data load faster by having a cache of pre-built data.
- Front-end optimizations:
  - Hotwire.
  - Pre-fetching.
  - List of conversations shouldn’t jump when you go to a particular conversation.
- Add a button to “Return to Bottom” in chat.
- Email change improvements:
  - The confirmation email has a subject of “Welcome to Courselore!”. It should be “Please confirm your email”.
  - Maybe we shouldn’t actually change the email until it’s confirmed. Otherwise an attacker with a compromised password could change your email and lock you out of the “Forgot your password?” flow.

---

- **Browser tab crashes if left open for a long time.**
  - Has the change from `setInterval()` to `setTimeout()` fixed it?

---

- Change the page title when there are new messages on that conversation, to make it stand out on the browser tabs.
- When `contentEditor` is in `compact` mode, don’t just hide elements, prevent them from outputting HTML at all, which reduces the HTML payload. (But pay attention to buttons that are hidden but still accessible via keyboard shortcuts.)

### Advanced Access Control

- Chats with only a few people.
- 1-to-1 conversation: Use background color to distinguish between people, so you don’t have to show their names over and over.
- Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
  - Some groups are available only to students, while others only to staff.
  - People assign themselves to groups.
- Add mentions like `@group-3`.

### Users

- Online indicators.
  - Query the server for updates before turning off online indicator.
  - Fade in and out.
- Multiple emails.
- Allow people to remove their accounts.
- Authentication:
  - SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).
  - 2-Factor Authentication.
- Pronoun.
- A short audio with the name’s pronunciation.

### Courses

- Different course states, for example, archived.
- Remove course entirely.
- Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Control who’s able to create courses, which makes sense for people who self-host.

### Invitations

- Limit invitation links to certain domains.
- Have an option to require approval of enrollment.
- Have a public listing of courses in the system and allow people to request to join.

### Conversations

- Show a widget similar to the Views (with person & time) to likes & endorsements.
- We shouldn’t show endorsements for non-answers. (They show up at least for staff.)
- Scroll the conversations list to the current conversation doesn’t work on mobile.
- Streamlining the creation of DMs.
- Highlights (similar to Slack’s pins, but we’re avoiding the word “pin” because it already means “pinned conversations”). The highlights are visible to everyone in the conversation.
- Bookmarks / flags / saved items. These are personal, for example, for something you have to follow up on.
- Make the distinction between the types more prominent. Separate questions from chats in the list of conversations, for example.
  - Change the visualization of “types” a little more, for example, make announcements pop up.
  - Improve display of endorsements & answers (on the sidebar, include number of answers).
  - Manage answer badges more intelligently (answered at all, answered by staff).
  - Let original question asker approve an answer.
- More sophisticated tag system: dependencies between tags, actions triggered by tags, and so forth.
- Modify the order of tags.
- Different states: Open vs archived.
- Assign questions to CAs.
- Save drafts of conversations you’re creating.
- `position: sticky` headers (showing author name) in messages?
- Add list of who read each message and when they read it to chats as well. The first attempt wasn’t successful because the `userPartial`s blow up the HTML. Revisit this when we DRY `userPartial`s.

### Chat

- Currently typing.
- “Truncate” long messages.

### Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

### Notifications

- Add support for Dark Mode in emails.
  - This should fix the duplication of code blocks.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).
- Add different notification badges for when you’re @mentioned.
- A timeline-like list of unread messages and other things that require your attention.
- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
  - Receive notifications from conversations you’ve participated in.
- Digests that accumulate notifications over a period.
- Other channels: Use the browser Notifications API & Push API; Desktop & phone applications.
- Snooze.
- Don’t require user to be logged in to unsubscribe from notifications?
- Add option to receive email notifications for your own messages.

### Search

- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filters for unanswered questions, answered questions, and so forth.
- Filter by date.
- Show only conversations with unread messages.

### Content Editor

- Content editor:
  - When you select multiple lines and click on the list options, turn each line into a list item.
  - Add more placeholders to things like tables to help explain how to use them.
- Press ↑ to edit previously sent message.
- Templates for questions (like GitHub Issues).
- Reuse answers.
- Paste tables from Excel and have them formatted as Markdown tables.
- The localStorage which remembers messages that haven’t been sent yet isn’t cleaning empty objects, leaking resources.

### Content Processor

- The “quote” button on code blocks is showing up in the wrong place.
- `.katex` is overflowing in the `y` axis unnecessarily. (See, for example, the example we give on the home page.)
- Emoji with the `:smile:` form.
- Proxy hotlinked images (particularly if served with HTTP because of insecure content): https://github.com/atmos/camo
- Reference on more features ideas: <https://github.com/gjtorikian/html-pipeline>
- Polls.
- Lightbox modal for resized images.
- Lightbox for code blocks (“click for more”, full screen, and selective wrap or not long lines).
- Add support for videos: Sanitization, dimensions, and so forth.

### Pagination

- List of conversations on the left.
- Messages in a conversation.
- Course Settings · Enrollments.

### File Management

- Have a way to delete files.
- Access control around attachments:
  - Possibilities:
    1. Anyone with a link may see the attachment.
    2. Only people who are logged in may see the attachment.
    3. Only people in the same course may see the attachment.
    4. Only people with access to the particular conversation may see the attachment.
  - Right now we’re implementing 2, but we may want to go more strict if FERPA requires it or if someone asks for it.
  - The advantage of 1 is that we can have a link directly to something like S3, so we don’t have to proxy the file ourselves.
  - The disadvantage of something like 3 or 4 is that a person can’t copy and paste messages across courses (think of a PDF with course rules being sent at the beginning of a semester).
- Let people configure other storage engines (for example, S3).
- Create a garbage collection routine for attachments.
- Clean geolocation & other metadata from images.

### Forms

- Use `maxlength`.
- Keep the buttons disabled while the form isn’t in a valid state.
- Use date pickers:
  - https://github.com/jcgertig/date-input-polyfill
  - https://github.com/Pikaday/Pikaday

### Administrative Interface

- For department-wide deployments, have some sort of administrative interface with a hierarchy, for example, administrators may be able to see all courses, and so forth.

### Statistics

- Gamification: A reputation system with badges.
- How many questions & how fast they were answered.
- Student engagement for courses in which participation is graded.

### Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

### Homepage

- Better printscreens without `lorem ipsum`.

### Interface Details

- Change the design of chats so that it’s easier to tell messages apart. Right now @mentions and messages look too much alike. Maybe use the Slack/Discord/GitHub solution of moving the avatar into the margin.
- Have some kind of guide for the first time you enter the system, or the first time you create a course, and that sort of thing.
- Make breadcrumbs (for example, under “User Settings”) clickable (they should expose the navigation menu, just like what happens in Visual Studio Code).
- The anonymity button isn’t as clear as it should be.
- When adding tags with the “Manage Tags” button (from the “Create a New Conversation” form or from the “Tags” button on a conversation), have a way to load the new tags without losing progress.
- Add a `max-height` to the course switcher (what if you have many courses?).
- Checkboxes that don’t have a visual indication may be confusing.
- Using the JavaScript event loop for background jobs has another issue besides not persisting: there’s no contention mechanism, which opens it up for DOS attacks.
- Right click menus on stuff.
- Places where we show `administratorEmail` to report bugs could be forms instead.

### Infrastructure

- `app.on("close")` stop workers.
- The “No conversation selected.” page doesn’t open a SSE connection to the server, so it doesn’t get live updates.
- Graceful HTTP shutdown
  - Do we need that, or is our currently solution enough, given that Node.js seems to end keep-alive connections gracefully and we have no interest in keeping the Node.js process running?
    - I think we do need that, because we want to close the database, otherwise journal files are kept around, and we want to close the database strictly **after** the server closed, otherwise there could be requests in the middle that will throw because of a closed database connection.
    - But there’s more: the handler for `exit` has to be synchronous. So we can’t `await` on graceful termination.
    - One potential solution: Do the graceful termination on signals, but on `exit` just `server.close(); app.emit("close");`. This should be fine because in our case `exit` probably means an exception anyway.
  - https://github.com/gajus/http-terminator
    - https://www.npmtrends.com/@godaddy/terminus-vs-http-close-vs-http-shutdown-vs-http-terminator-vs-stoppable-vs-http-graceful-shutdown
- Test signal handling of shutdown process on Windows
- Handle errors on `fetch`. Right now we’ll just let the “loading” spinner run forever.
- When we’re a bit more mature, don’t have a `production` branch, but tie the production deployment to tags.
- Let @leafac/html eat interpolated `null`s and `undefined`s and `[objects]`.
- Using `getConversation()` to enforce permissions may not be a great idea. It limits the number of search results in a weird way, that even leaks a bit of data. Also, it isn’t the most performant thing, probably (see point about n+1 queries). Maybe a better idea would be to `WHERE` the permissions everywhere, or use a database view.
- Performance:
  - Look for more database indices that may be necessary.
  - n+1 queries:
    - Cases:
      - `getConversation()`.
      - `getMessage()`.
      - Treatment of @mentions in Content processor.
      - Finding which enrollments to notify (not exactly an n+1, but we’re filtering in JavaScript what could maybe filtered in SQL (if we’re willing to use the `IN` operator)).
    - Potential solutions:
      - Single follow-up query with `IN` operator (but then you end up with a bunch of prepared statements in the cache).
      - Use a temporary table instead of `IN`.
      - Nest first query as a subquery and bundle all the information together, then deduplicate the 1–N relationships in the code.
- Queue / background jobs:
  - Right now we’re using Node.js’s event queue as the queue. This is simple, but there are a few issues:
    - Jobs don’t persist if you stop the server and they haven’t have the chance of completing. This affects email delivery, notifications, and so forth.
    - If too many jobs are fired at once, there’s no protection in place, and it may exhaust resources.
  - Use SQLite as queue:
    - https://sqlite.org/forum/info/b047f5ef5b76edff
    - https://github.com/StratoKit/strato-db/blob/master/src/EventQueue.js
    - https://github.com/litements/litequeue
    - https://www.npmjs.com/package/better-queue-sqlite
- `try.courselore.org` (reference https://moodle.org/demo)
- Rate limiting.
- Database transactions:
  - One transaction per request?
  - Considerations:
    - We shouldn’t keep the transaction open across ticks of the event loop, which entails that all request handlers would have to be synchronous.
    - Moreover, as far as I can tell the only way to run a middleware **after** the router is to listen to the `res.once("finish", () => {...})` event. But I think that this goes across ticks of the event loop.
    - Maybe I can just call `next()` and then look at the `res.statusCode`?
    - For synchronous action handlers I think that transactions are only relevant if you’re running in cluster mode, because otherwise Node.js is single-threaded and queries are serialized, anyway.
  - References:
    - https://goenning.net/2017/06/20/session-per-request-pattern-go/
    - https://stackoverflow.com/questions/24258782/node-express-4-middleware-after-routes
    - https://www.lunchbadger.com/blog/tracking-the-performance-of-express-js-routes-and-middleware/
    - https://stackoverflow.com/questions/27484361/is-it-possible-to-use-some-sort-of-middleware-after-sending-the-response-with
    - https://stackoverflow.com/questions/44647617/middleware-after-all-route-in-nodejs
    - https://github.com/jshttp/on-finished
    - https://github.com/pillarjs/router/issues/18
- Use `Cache-control: no-store`.
- Helmet.
- Extract the infrastructure for running the project into a package:
  - The snippet in `index.ts`.
  - Some common things from `configuration/*.js`.
  - Auto-updater.
- Backups.
  - For us, as system administrators.
  - For users, who may want to migrate data from a hosted version to another.
    - Rewrite URLs in messages.
- In some situations, we’re unnecessarily updating the boolean fields in the database that are represented as dates. For example, `"tags"."staffOnlyAt"` on `PUT /courses/:courseReference/settings/tags`.
- Live updates with Server-Sent Events currently depend on the fact that we’re running in a single process. Use a message broker like ZeroMQ to support multiple processes.
- Automated tests.

<details>

```typescript
import { test, expect, beforeEach, afterEach } from "@jest/globals";
import os from "os";
import path from "path";
import http from "http";
import fs from "fs-extra";
import * as got from "got";
import * as toughCookie from "tough-cookie";
import { JSDOM } from "jsdom";
import markdown from "tagged-template-noop";
import courselore from ".";

let server: http.Server;
let client: got.Got;
beforeEach(async () => {
  const rootDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), "courselore-test-")
  );
  const app = await courselore(rootDirectory);
  server = app.listen(new URL(app.locals.settings.url).port);
  client = got.default.extend({
    prefixUrl: app.locals.settings.url,
    cookieJar: new toughCookie.CookieJar(undefined, {
      rejectPublicSuffixes: false,
    }),
    // FIXME:
    followRedirect: false,
  });
  await client.post("authenticate", {
    form: { email: "leandro@courselore.org" },
  });
  const demonstrationInbox = JSDOM.fragment(
    (await client.get("demonstration-inbox")).body
  );
  const nonce = demonstrationInbox
    .querySelector(`a[href^="${app.locals.settings.url}/authenticate/"]`)!
    .getAttribute("href")!
    .match(/\/authenticate\/(\d+)/)!
    .pop();
  await client.post("users", { form: { nonce, name: "Leandro Facchinetti" } });
});
afterEach(() => {
  server.close();
});

test("/preview (Text processor)", async () => {
  expect(
    (
      await client.post("preview", {
        form: {
          content:
            // prettier-ignore
            markdown`
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements

<h1>Beetles</h1>
<h2>External morphology</h2>
<h3>Head</h3>
<h4>Mouthparts</h4>
<h5>Thorax</h5>
<h6>Prothorax</h6>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br

<p> O’er all the hilltops<br>
    Is quiet now,<br>
    In all the treetops<br>
    Hearest thou<br>
    Hardly a breath;<br>
    The birds are asleep in the trees:<br>
    Wait, soon like these<br>
    Thou too shalt rest.
</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b

<p>The two most popular science courses offered by the school are <b class="term">chemistry</b> (the study of chemicals and the composition of substances) and <b class="term">physics</b> (the study of the nature and properties of matter and energy).</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i

<p>I looked at it and thought <i>This can't be real!</i></p>

<p><i class="latin">Musa</i> is one of two or three genera in the family <i class="latin">Musaceae</i>; it includes bananas and plantains.</p>

<p>The term <i>bandwidth</i> describes the measure of how much information can pass through a data connection in a given amount of time.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong

<p>... the most important rule, the rule you can never forget, no matter how much he cries, no matter how much he begs: <strong>never feed him after midnight</strong>.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em

<p>Get out of bed <em>now</em>!</p>

<p>We <em>had</em> to do something about it.</p>

<p>This is <em>not</em> a drill!</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a

<p>You can reach Michael at:</p>

<ul>
  <li><a href="https://example.com">Website</a></li>
  <li><a href="mailto:m.bluth@example.com">Email</a></li>
  <li><a href="tel:+123456789">Phone</a></li>
</ul>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre

<pre>
  L          TE
    A       A
      C    V
       R A
       DOU
       LOU
      REUSE
      QUE TU
      PORTES
    ET QUI T'
    ORNE O CI
     VILISÉ
    OTE-  TU VEUX
     LA    BIEN
    SI      RESPI
            RER       - Apollinaire
</pre>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code

<p>The <code>push()</code> method adds one or more elements to the end of an array and returns the new length of the array.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img

<img class="fit-picture"
     src="https://placekitten.com/500/300"
     alt="Grapefruit slice atop a pile of other slices">

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt

<p>Enter the following at the telnet command prompt: <code>set localecho</code><br />

The telnet client should display: <tt>Local Echo is on</tt></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div

<div class="warning">
    <img src="https://placekitten.com/500/300"
         alt="An intimidating leopard.">
    <p>Beware of the leopard</p>
</div>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins

<blockquote>
    There is <del>nothing</del> <ins>no code</ins> either good or bad, but <del>thinking</del> <ins>running it</ins> makes it so.
</blockquote>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup

<p>The <b>Pythagorean theorem</b> is often expressed as the following equation:</p>

<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit. <var>a<sup>2</sup></var> + <var>b<sup>2</sup></var> = <var>c<sup>2</sup></var> Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub

<p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit. Almost every developer's favorite molecule is
C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>, also known as "caffeine." Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p

<p>Geckos are a group of usually small, usually nocturnal lizards. They are found on every continent except Australia.</p>
 
<p>Some species live in houses where they hunt insects attracted by artificial light.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol

<ol>
  <li>Mix flour, baking powder, sugar, and salt.</li>
  <li>In another bowl, mix eggs, milk, and oil.</li>
  <li>Stir both mixtures together.</li>
  <li>Fill muffin tray 3/4 full.</li>
  <li>Bake for 20 minutes.</li>
  <li>Mix flour, baking powder, sugar, and salt.</li>
  <li>In another bowl, mix eggs, milk, and oil.</li>
  <li>Stir both mixtures together.</li>
  <li>Fill muffin tray 3/4 full.</li>
  <li>Bake for 20 minutes.</li>
  <li>Mix flour, baking powder, sugar, and salt.</li>
  <li>In another bowl, mix eggs, milk, and oil.</li>
  <li>Stir both mixtures together.</li>
  <li>Fill muffin tray 3/4 full.</li>
  <li>Bake for 20 minutes.</li>
  <li>Mix flour, baking powder, sugar, and salt.</li>
  <li>In another bowl, mix eggs, milk, and oil.</li>
  <li>Stir both mixtures together.</li>
  <li>Fill muffin tray 3/4 full.</li>
  <li>Bake for 20 minutes.</li>
  <li>Mix flour, baking powder, sugar, and salt.</li>
  <li>In another bowl, mix eggs, milk, and oil.</li>
  <li>Stir both mixtures together.</li>
  <li>Fill muffin tray 3/4 full.</li>
  <li>Bake for 20 minutes.</li>
</ol>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li

<ul>
    <li>Milk</li>
    <li>Cheese
        <ul>
            <li>Blue cheese</li>
            <li>Feta</li>
        </ul>
    </li>
</ul>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table

<table>
    <thead>
        <tr>
            <th colspan="2">The table header</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>The table body</td>
            <td>with two columns</td>
        </tr>
    </tbody>
</table>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption

<table>
    <caption>Council budget (in £) 2018</caption>
    <thead>
        <tr>
            <th scope="col">Items</th>
            <th scope="col">Expenditure</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th scope="row">Donuts</th>
            <td>3,000</td>
        </tr>
        <tr>
            <th scope="row">Stationery</th>
            <td>18,000</td>
        </tr>
    </tbody>
</table>

<table>
    <caption>Alien football stars</caption>
    <tr>
        <th scope="col">Player</th>
        <th scope="col">Gloobles</th>
        <th scope="col">Za'taak</th>
    </tr>
    <tr>
        <th scope="row">TR-7</th>
        <td>7</td>
        <td>4,569</td>
    </tr>
    <tr>
        <th scope="row">Khiresh Odo</th>
        <td>7</td>
        <td>7,223</td>
    </tr>
    <tr>
        <th scope="row">Mia Oolong</th>
        <td>9</td>
        <td>6,219</td>
    </tr>
</table>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot

<table>
    <thead>
        <tr>
            <th>Items</th>
            <th scope="col">Expenditure</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <th scope="row">Donuts</th>
            <td>3,000</td>
        </tr>
        <tr>
            <th scope="row">Stationery</th>
            <td>18,000</td>
        </tr>
    </tbody>
    <tfoot>
        <tr>
            <th scope="row">Totals</th>
            <td>21,000</td>
        </tr>
    </tfoot>
</table>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote

<figure>
    <blockquote cite="https://www.huxley.net/bnw/four.html">
        <p>Words can be like X-rays, if you use them properly—they’ll go through anything. You read and you’re pierced.</p>
    </blockquote>
    <figcaption>—Aldous Huxley, <cite>Brave New World</cite></figcaption>
</figure>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd

<p>Cryptids of Cornwall:</p>

<dl>

<dt>Beast of Bodmin</dt>
<dd>A large feline inhabiting Bodmin Moor.</dd>

<dt>Morgawr</dt>
<dd>A sea serpent.</dd>

<dt>Owlman</dt>
<dd>A giant owl-like creature.</dd>

</dl>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd

<p>Please press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to re-render an MDN page.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q

<p>When Dave asks HAL to open the pod bay door, HAL answers: <q cite="https://www.imdb.com/title/tt0062622/quotes/qt0396921">I'm sorry, Dave. I'm afraid I can't do that.</q></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp

<p>I was trying to boot my computer, but I got this hilarious message:</p>

<p><samp>Keyboard not found <br>Press F1 to continue</samp></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var

<p>The volume of a box is <var>l</var> × <var>w</var> × <var>h</var>, where <var>l</var> represents the length, <var>w</var> the width and <var>h</var> the height of the box.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr

<p>§1: The first rule of Fight Club is: You do not talk about Fight Club.</p>

<hr>

<p>§2: The second rule of Fight Club is: Always bring cupcakes.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rt
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rp

<ruby>
明日 <rp>(</rp><rt>Ashita</rt><rp>)</rp>
</ruby>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s

<p><s>There will be a few tickets available at the box office tonight.</s></p>

<p>SOLD OUT!</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strike

&lt;strike&gt;: <strike>Today's Special: Salmon</strike> SOLD OUT<br />
&lt;s&gt;: <s>Today's Special: Salmon</s> SOLD OUT

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary

<details>
    <summary>I have keys but no doors. I have space but no room. You can enter but can’t leave. What am I?</summary>
    A keyboard.
</details>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption

<figure>
    <img src="https://placekitten.com/500/300"
         alt="Elephant at sunset">
    <figcaption>An elephant at sunset</figcaption>
</figure>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr

<p>You can use <abbr title="Cascading Style Sheets">CSS</abbr> to style your <abbr title="HyperText Markup Language">HTML</abbr>.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo

<h1>Famous seaside songs</h1>

<p>The English song "Oh I do like to be beside the seaside"</p>

<p>Looks like this in Hebrew: <span dir="rtl">אה, אני אוהב להיות ליד חוף הים</span></p>

<p>In the computer's memory, this is stored as <bdo dir="ltr">אה, אני אוהב להיות ליד חוף הים</bdo></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite

<figure>
    <blockquote>
        <p>It was a bright cold day in April, and the clocks were striking thirteen.</p>
    </blockquote>
    <figcaption>First sentence in <cite><a href="http://www.george-orwell.org/1984/0.html">Nineteen Eighty-Four</a></cite> by George Orwell (Part 1, Chapter 1).</figcaption>
</figure>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn

<p>A <dfn id="def-validator">validator</dfn> is a program that checks for syntax errors in code or documents.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark

---

<p>Search results for "salamander":</p>

<hr>

<p>Several species of <mark>salamander</mark> inhabit the temperate rainforest of the Pacific Northwest.</p>

<p>Most <mark>salamander</mark>s are nocturnal, and hunt for insects, worms, and other small creatures.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small

<p>MDN Web Docs is a learning platform for Web technologies and the software that powers the Web.</p>

<hr>

<p><small>The content is licensed under a Creative Commons Attribution-ShareAlike 2.5 Generic License.</small></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span

<p>Add the <span class="ingredient">basil</span>, <span class="ingredient">pine nuts</span> and <span class="ingredient">garlic</span> to a blender and blend into a paste.</p>

<p>Gradually add the <span class="ingredient">olive oil</span> while running the blender slowly.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time

<p>The Cure will be celebrating their 40th anniversary on <time datetime="2018-07-07">July 7</time> in London's Hyde Park.</p>

<p>The concert starts at <time datetime="20:00">20:00</time> and you'll be able to enjoy the band for at least <time datetime="PT2H30M">2h 30m</time>.</p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr

<div id="example-paragraphs">
    <p>Fernstraßenbauprivatfinanzierungsgesetz</p>
    <p>Fernstraßen<wbr>bau<wbr>privat<wbr>finanzierungs<wbr>gesetz</p>
    <p>Fernstraßen&shy;bau&shy;privat&shy;finanzierungs&shy;gesetz</p>
</div>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox

<p>Choose your monster's features:</p>

<div>
  <input type="checkbox" id="scales" name="scales"
         checked>
  <label for="scales">Scales</label>
</div>

<div>
  <input type="checkbox" id="horns" name="horns">
  <label for="horns">Horns</label>
</div>

---

https://shiki.matsu.io

\`\`\`javascript
const fs = require("fs");
const markdown = require("markdown-it");
const shiki = require("shiki");

shiki
  .getHighlighter({
    theme: "nord",
  })
  .then((highlighter) => {
    const md = markdown({
      html: true,
      highlight: (code, lang) => {
        return highlighter.codeToHtml(code, lang);
      },
    });

    const html = md.render(fs.readFileSync("index.md", "utf-8"));
    const out = \`
    <title>Shiki</title>
    <link rel="stylesheet" href="style.css">
    \${html}
    <script src="index.js"></script>
  \`;
    fs.writeFileSync("index.html", out);

    console.log("done");
  });
\`\`\`

---

https://katex.org

$\\displaystyle \\frac{1}{\\Bigl(\\sqrt{\\phi \\sqrt{5}}-\\phi\\Bigr) e^{\\frac25 \\pi}} = 1+\\frac{e^{-2\\pi}} {1+\\frac{e^{-4\\pi}} {1+\\frac{e^{-6\\pi}} {1+\\frac{e^{-8\\pi}} {1+\\cdots} } } }$

---

\`\`\`json
[
  "abbr",
  "accept",
  "acceptCharset",
  "accessKey",
  "action",
  "align",
  "alt",
  "ariaDescribedBy",
  "ariaHidden",
  "ariaLabel",
  "ariaLabelledBy",
  "axis",
  "border",
  "cellPadding",
  "cellSpacing",
  "char",
  "charOff",
  "charSet",
  "checked",
  "clear",
  "cols",
  "colSpan",
  "color",
  "compact",
  "coords",
  "dateTime",
  "dir",
  "disabled",
  "encType",
  "htmlFor",
  "frame",
  "headers",
  "height",
  "hrefLang",
  "hSpace",
  "isMap",
  "id",
  "label",
  "lang",
  "maxLength",
  "media",
  "method",
  "multiple",
  "name",
  "noHref",
  "noShade",
  "noWrap",
  "open",
  "prompt",
  "readOnly",
  "rel",
  "rev",
  "rows",
  "rowSpan",
  "rules",
  "scope",
  "selected",
  "shape",
  "size",
  "span",
  "start",
  "summary",
  "tabIndex",
  "target",
  "title",
  "type",
  "useMap",
  "vAlign",
  "value",
  "vSpace",
  "width",
  "itemProp"
]
\`\`\`

---

# CommonMark

> Block quote.

Some _emphasis_, **importance**, and \`code\`.

---

# GitHub Flavored Markdown (GFM)

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Footnote

A note[^1]

[^1]: Big note.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a   | b   |   c |  d  |
| --- | :-- | --: | :-: |

## Tasklist

- [ ] Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus cupiditate distinctio similique sequi velit omnis tenetur aut vitae sapiente quod a repudiandae porro veniam soluta doloribus quia, dolorum, reprehenderit quisquam.
- [x] Lorem ipsum dolor sit amet, consectetur adipisicing elit. Delectus, voluptatem at architecto excepturi officia, dolores quibusdam fugiat eligendi veniam perspiciatis, nostrum laudantium autem quasi sequi explicabo molestias ea minima iusto.

---

# HTML

<details class="note">

A mix of _Markdown_ and <em>HTML</em>.

</details>

---

# Cross-Site Scripting (XSS)

👍<script>document.write("💩");</script>🙌

---

# Syntax highlighting (Shiki)

\`\`\`javascript
const shiki = require("shiki");

shiki
  .getHighlighter({
    theme: "nord",
  })
  .then((highlighter) => {
    console.log(highlighter.codeToHtml(\`console.log('shiki');\`, "js"));
  });
\`\`\`

---

# Mathematics (KaTeX)

Lift($L$) can be determined by Lift Coefficient ($C_L$) like the following
equation.

$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$

A raw dollar sign: \\$

$$
\\invalidMacro
$$

Prevent large width/height visual affronts:

$$
\\rule{500em}{500em}
$$
`,
        },
      })
    ).body
  ).toMatchInlineSnapshot(`
    "<p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements</a></p>
    <h1>Beetles</h1>
    <h2>External morphology</h2>
    <h3>Head</h3>
    <h4>Mouthparts</h4>
    <h5>Thorax</h5>
    <h6>Prothorax</h6>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/br</a></p>
    <p> O’er all the hilltops<br>
        Is quiet now,<br>
        In all the treetops<br>
        Hearest thou<br>
        Hardly a breath;<br>
        The birds are asleep in the trees:<br>
        Wait, soon like these<br>
        Thou too shalt rest.
    </p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/b</a></p>
    <p>The two most popular science courses offered by the school are <b>chemistry</b> (the study of chemicals and the composition of substances) and <b>physics</b> (the study of the nature and properties of matter and energy).</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/i</a></p>
    <p>I looked at it and thought <i>This can't be real!</i></p>
    <p><i>Musa</i> is one of two or three genera in the family <i>Musaceae</i>; it includes bananas and plantains.</p>
    <p>The term <i>bandwidth</i> describes the measure of how much information can pass through a data connection in a given amount of time.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strong</a></p>
    <p>... the most important rule, the rule you can never forget, no matter how much he cries, no matter how much he begs: <strong>never feed him after midnight</strong>.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/em</a></p>
    <p>Get out of bed <em>now</em>!</p>
    <p>We <em>had</em> to do something about it.</p>
    <p>This is <em>not</em> a drill!</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a</a></p>
    <p>You can reach Michael at:</p>
    <ul>
      <li><a href=\\"https://example.com\\">Website</a></li>
      <li><a href=\\"mailto:m.bluth@example.com\\">Email</a></li>
      <li><a>Phone</a></li>
    </ul>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/pre</a></p>
    <pre>  L          TE
        A       A
          C    V
           R A
           DOU
           LOU
          REUSE
          QUE TU
          PORTES
        ET QUI T'
        ORNE O CI
         VILISÉ
        OTE-  TU VEUX
         LA    BIEN
        SI      RESPI
                RER       - Apollinaire
    </pre>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/code</a></p>
    <p>The <code>push()</code> method adds one or more elements to the end of an array and returns the new length of the array.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img</a></p>
    <p><img src=\\"/splash.png\\" alt=\\"Grapefruit slice atop a pile of other slices\\"></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt</a></p>
    <p>Enter the following at the telnet command prompt: <code>set localecho</code><br>
    </p><p>The telnet client should display: <tt>Local Echo is on</tt></p><p></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div</a></p>
    <div class=\\"\\">
        <img src=\\"/splash.png\\" alt=\\"An intimidating leopard.\\">
        <p>Beware of the leopard</p>
    </div>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins</a></p>
    <blockquote>
        There is <del>nothing</del> <ins>no code</ins> either good or bad, but <del>thinking</del> <ins>running it</ins> makes it so.
    </blockquote>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sup</a></p>
    <p>The <b>Pythagorean theorem</b> is often expressed as the following equation:</p>
    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit. <var>a<sup>2</sup></var> + <var>b<sup>2</sup></var> = <var>c<sup>2</sup></var> Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/sub</a></p>
    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit. Almost every developer's favorite molecule is
    C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub>, also known as \\"caffeine.\\" Lorem ipsum dolor sit amet consectetur adipisicing elit. Inventore reprehenderit facere error culpa quo perspiciatis minima doloribus placeat nobis, reiciendis corrupti dolore aliquam aut, amet cupiditate cumque delectus odio odit.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/p</a></p>
    <p>Geckos are a group of usually small, usually nocturnal lizards. They are found on every continent except Australia.</p>
    <p>Some species live in houses where they hunt insects attracted by artificial light.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ol</a></p>
    <ol>
      <li>Mix flour, baking powder, sugar, and salt.</li>
      <li>In another bowl, mix eggs, milk, and oil.</li>
      <li>Stir both mixtures together.</li>
      <li>Fill muffin tray 3/4 full.</li>
      <li>Bake for 20 minutes.</li>
      <li>Mix flour, baking powder, sugar, and salt.</li>
      <li>In another bowl, mix eggs, milk, and oil.</li>
      <li>Stir both mixtures together.</li>
      <li>Fill muffin tray 3/4 full.</li>
      <li>Bake for 20 minutes.</li>
      <li>Mix flour, baking powder, sugar, and salt.</li>
      <li>In another bowl, mix eggs, milk, and oil.</li>
      <li>Stir both mixtures together.</li>
      <li>Fill muffin tray 3/4 full.</li>
      <li>Bake for 20 minutes.</li>
      <li>Mix flour, baking powder, sugar, and salt.</li>
      <li>In another bowl, mix eggs, milk, and oil.</li>
      <li>Stir both mixtures together.</li>
      <li>Fill muffin tray 3/4 full.</li>
      <li>Bake for 20 minutes.</li>
      <li>Mix flour, baking powder, sugar, and salt.</li>
      <li>In another bowl, mix eggs, milk, and oil.</li>
      <li>Stir both mixtures together.</li>
      <li>Fill muffin tray 3/4 full.</li>
      <li>Bake for 20 minutes.</li>
    </ol>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ul</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/li</a></p>
    <ul>
        <li>Milk</li>
        <li>Cheese
            <ul>
                <li>Blue cheese</li>
                <li>Feta</li>
            </ul>
        </li>
    </ul>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/table</a></p>
    <table>
        <thead>
            <tr>
                <th colspan=\\"2\\">The table header</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>The table body</td>
                <td>with two columns</td>
            </tr>
        </tbody>
    </table>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/thead</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tbody</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tr</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/td</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/th</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/caption</a></p>
    <table>
        <caption>Council budget (in £) 2018</caption>
        <thead>
            <tr>
                <th scope=\\"col\\">Items</th>
                <th scope=\\"col\\">Expenditure</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <th scope=\\"row\\">Donuts</th>
                <td>3,000</td>
            </tr>
            <tr>
                <th scope=\\"row\\">Stationery</th>
                <td>18,000</td>
            </tr>
        </tbody>
    </table>
    <table>
        <caption>Alien football stars</caption>
        <tbody><tr>
            <th scope=\\"col\\">Player</th>
            <th scope=\\"col\\">Gloobles</th>
            <th scope=\\"col\\">Za'taak</th>
        </tr>
        <tr>
            <th scope=\\"row\\">TR-7</th>
            <td>7</td>
            <td>4,569</td>
        </tr>
        <tr>
            <th scope=\\"row\\">Khiresh Odo</th>
            <td>7</td>
            <td>7,223</td>
        </tr>
        <tr>
            <th scope=\\"row\\">Mia Oolong</th>
            <td>9</td>
            <td>6,219</td>
        </tr>
    </tbody></table>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tfoot</a></p>
    <table>
        <thead>
            <tr>
                <th>Items</th>
                <th scope=\\"col\\">Expenditure</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <th scope=\\"row\\">Donuts</th>
                <td>3,000</td>
            </tr>
            <tr>
                <th scope=\\"row\\">Stationery</th>
                <td>18,000</td>
            </tr>
        </tbody>
        <tfoot>
            <tr>
                <th scope=\\"row\\">Totals</th>
                <td>21,000</td>
            </tr>
        </tfoot>
    </table>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/blockquote</a></p>
    <figure>
        <blockquote cite=\\"https://www.huxley.net/bnw/four.html\\">
            <p>Words can be like X-rays, if you use them properly—they’ll go through anything. You read and you’re pierced.</p>
        </blockquote>
        <figcaption>—Aldous Huxley, <cite>Brave New World</cite></figcaption>
    </figure>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dl</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dt</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dd</a></p>
    <p>Cryptids of Cornwall:</p>
    <dl>
    <dt>Beast of Bodmin</dt>
    <dd>A large feline inhabiting Bodmin Moor.</dd>
    <dt>Morgawr</dt>
    <dd>A sea serpent.</dd>
    <dt>Owlman</dt>
    <dd>A giant owl-like creature.</dd>
    </dl>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/kbd</a></p>
    <p>Please press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd> to re-render an MDN page.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/q</a></p>
    <p>When Dave asks HAL to open the pod bay door, HAL answers: <q cite=\\"https://www.imdb.com/title/tt0062622/quotes/qt0396921\\">I'm sorry, Dave. I'm afraid I can't do that.</q></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/samp</a></p>
    <p>I was trying to boot my computer, but I got this hilarious message:</p>
    <p><samp>Keyboard not found <br>Press F1 to continue</samp></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/var</a></p>
    <p>The volume of a box is <var>l</var> × <var>w</var> × <var>h</var>, where <var>l</var> represents the length, <var>w</var> the width and <var>h</var> the height of the box.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr</a></p>
    <p>§1: The first rule of Fight Club is: You do not talk about Fight Club.</p>
    <hr>
    <p>§2: The second rule of Fight Club is: Always bring cupcakes.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ruby</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rt\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rt</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rp\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/rp</a></p>
    <ruby>
    明日 <rp>(</rp><rt>Ashita</rt><rp>)</rp>
    </ruby>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/s</a></p>
    <p><s>There will be a few tickets available at the box office tonight.</s></p>
    <p>SOLD OUT!</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strike\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/strike</a></p>
    <p>&#x3C;strike>: <strike>Today's Special: Salmon</strike> SOLD OUT<br>
    &#x3C;s>: <s>Today's Special: Salmon</s> SOLD OUT</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/details</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/summary</a></p>
    <details>
        <summary>I have keys but no doors. I have space but no room. You can enter but can’t leave. What am I?</summary>
        A keyboard.
    </details>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figure</a>
    <a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/figcaption</a></p>
    <figure>
        <img src=\\"/splash.png\\" alt=\\"Elephant at sunset\\">
        <figcaption>An elephant at sunset</figcaption>
    </figure>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/abbr</a></p>
    <p>You can use <abbr title=\\"Cascading Style Sheets\\">CSS</abbr> to style your <abbr title=\\"HyperText Markup Language\\">HTML</abbr>.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/bdo</a></p>
    <h1>Famous seaside songs</h1>
    <p>The English song \\"Oh I do like to be beside the seaside\\"</p>
    <p>Looks like this in Hebrew: <span dir=\\"rtl\\">אה, אני אוהב להיות ליד חוף הים</span></p>
    <p>In the computer's memory, this is stored as <bdo dir=\\"ltr\\">אה, אני אוהב להיות ליד חוף הים</bdo></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/cite</a></p>
    <figure>
        <blockquote>
            <p>It was a bright cold day in April, and the clocks were striking thirteen.</p>
        </blockquote>
        <figcaption>First sentence in <cite><a href=\\"http://www.george-orwell.org/1984/0.html\\">Nineteen Eighty-Four</a></cite> by George Orwell (Part 1, Chapter 1).</figcaption>
    </figure>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dfn</a></p>
    <p>A <dfn id=\\"user-content-def-validator\\">validator</dfn> is a program that checks for syntax errors in code or documents.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/mark</a></p>
    <hr>
    <p>Search results for \\"salamander\\":</p>
    <hr>
    <p>Several species of <mark>salamander</mark> inhabit the temperate rainforest of the Pacific Northwest.</p>
    <p>Most <mark>salamander</mark>s are nocturnal, and hunt for insects, worms, and other small creatures.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/small</a></p>
    <p>MDN Web Docs is a learning platform for Web technologies and the software that powers the Web.</p>
    <hr>
    <p><small>The content is licensed under a Creative Commons Attribution-ShareAlike 2.5 Generic License.</small></p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/span</a></p>
    <p>Add the <span class=\\"\\">basil</span>, <span class=\\"\\">pine nuts</span> and <span class=\\"\\">garlic</span> to a blender and blend into a paste.</p>
    <p>Gradually add the <span class=\\"\\">olive oil</span> while running the blender slowly.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/time</a></p>
    <p>The Cure will be celebrating their 40th anniversary on <time datetime=\\"2018-07-07\\">July 7</time> in London's Hyde Park.</p>
    <p>The concert starts at <time datetime=\\"20:00\\">20:00</time> and you'll be able to enjoy the band for at least <time datetime=\\"PT2H30M\\">2h 30m</time>.</p>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/wbr</a></p>
    <div id=\\"user-content-example-paragraphs\\">
        <p>Fernstraßenbauprivatfinanzierungsgesetz</p>
        <p>Fernstraßen<wbr>bau<wbr>privat<wbr>finanzierungs<wbr>gesetz</p>
        <p>Fernstraßen­bau­privat­finanzierungs­gesetz</p>
    </div>
    <hr>
    <p><a href=\\"https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox\\">https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox</a></p>
    <p>Choose your monster's features:</p>
    <div>
      <input type=\\"checkbox\\" id=\\"user-content-scales\\" name=\\"user-content-scales\\" checked disabled>
      Scales
    </div>
    <div>
      <input type=\\"checkbox\\" id=\\"user-content-horns\\" name=\\"user-content-horns\\" disabled>
      Horns
    </div>
    <hr>
    <p><a href=\\"https://shiki.matsu.io\\">https://shiki.matsu.io</a></p>

                <div class=\\"rehype-shiki\\">
                  
                        <div class=\\"light\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #FFFFFF\\"><code><span class=\\"line\\"><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">fs</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">require</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"fs\\"</span><span style=\\"color: #000000\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">markdown</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">require</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"markdown-it\\"</span><span style=\\"color: #000000\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">shiki</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">require</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"shiki\\"</span><span style=\\"color: #000000\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #001080\\">shiki</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  .</span><span style=\\"color: #795E26\\">getHighlighter</span><span style=\\"color: #000000\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #001080\\">theme:</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #A31515\\">\\"nord\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  })</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  .</span><span style=\\"color: #795E26\\">then</span><span style=\\"color: #000000\\">((</span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\">) </span><span style=\\"color: #0000FF\\">=></span><span style=\\"color: #000000\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">md</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">markdown</span><span style=\\"color: #000000\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">      </span><span style=\\"color: #001080\\">html:</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0000FF\\">true</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">      </span><span style=\\"color: #795E26\\">highlight</span><span style=\\"color: #001080\\">:</span><span style=\\"color: #000000\\"> (</span><span style=\\"color: #001080\\">code</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #001080\\">lang</span><span style=\\"color: #000000\\">) </span><span style=\\"color: #0000FF\\">=></span><span style=\\"color: #000000\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">        </span><span style=\\"color: #AF00DB\\">return</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">codeToHtml</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #001080\\">code</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #001080\\">lang</span><span style=\\"color: #000000\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">      },</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    });</span></span>

    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">html</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #001080\\">md</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">render</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #001080\\">fs</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">readFileSync</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"index.md\\"</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #A31515\\">\\"utf-8\\"</span><span style=\\"color: #000000\\">));</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">out</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #A31515\\">\`</span></span>
    <span class=\\"line\\"><span style=\\"color: #A31515\\">    &#x3C;title>Shiki&#x3C;/title></span></span>
    <span class=\\"line\\"><span style=\\"color: #A31515\\">    &#x3C;link rel=\\"stylesheet\\" href=\\"style.css\\"></span></span>
    <span class=\\"line\\"><span style=\\"color: #A31515\\">    </span><span style=\\"color: #0000FF\\">\${</span><span style=\\"color: #001080\\">html</span><span style=\\"color: #0000FF\\">}</span></span>
    <span class=\\"line\\"><span style=\\"color: #A31515\\">    &#x3C;script src=\\"index.js\\">&#x3C;/script></span></span>
    <span class=\\"line\\"><span style=\\"color: #A31515\\">  \`</span><span style=\\"color: #000000\\">;</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #001080\\">fs</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">writeFileSync</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"index.html\\"</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #001080\\">out</span><span style=\\"color: #000000\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #001080\\">console</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">log</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"done\\"</span><span style=\\"color: #000000\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  });</span></span></code></pre>
                        </div>
                      
                        <div class=\\"dark\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #1E1E1E\\"><code><span class=\\"line\\"><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">fs</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #DCDCAA\\">require</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"fs\\"</span><span style=\\"color: #D4D4D4\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">markdown</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #DCDCAA\\">require</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"markdown-it\\"</span><span style=\\"color: #D4D4D4\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">shiki</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #DCDCAA\\">require</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"shiki\\"</span><span style=\\"color: #D4D4D4\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #9CDCFE\\">shiki</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  .</span><span style=\\"color: #DCDCAA\\">getHighlighter</span><span style=\\"color: #D4D4D4\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #9CDCFE\\">theme:</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #CE9178\\">\\"nord\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  })</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  .</span><span style=\\"color: #DCDCAA\\">then</span><span style=\\"color: #D4D4D4\\">((</span><span style=\\"color: #9CDCFE\\">highlighter</span><span style=\\"color: #D4D4D4\\">) </span><span style=\\"color: #569CD6\\">=></span><span style=\\"color: #D4D4D4\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">md</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #DCDCAA\\">markdown</span><span style=\\"color: #D4D4D4\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">      </span><span style=\\"color: #9CDCFE\\">html:</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #569CD6\\">true</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">      </span><span style=\\"color: #DCDCAA\\">highlight</span><span style=\\"color: #9CDCFE\\">:</span><span style=\\"color: #D4D4D4\\"> (</span><span style=\\"color: #9CDCFE\\">code</span><span style=\\"color: #D4D4D4\\">, </span><span style=\\"color: #9CDCFE\\">lang</span><span style=\\"color: #D4D4D4\\">) </span><span style=\\"color: #569CD6\\">=></span><span style=\\"color: #D4D4D4\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">        </span><span style=\\"color: #C586C0\\">return</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #9CDCFE\\">highlighter</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">codeToHtml</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #9CDCFE\\">code</span><span style=\\"color: #D4D4D4\\">, </span><span style=\\"color: #9CDCFE\\">lang</span><span style=\\"color: #D4D4D4\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">      },</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    });</span></span>

    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">html</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #9CDCFE\\">md</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">render</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #9CDCFE\\">fs</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">readFileSync</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"index.md\\"</span><span style=\\"color: #D4D4D4\\">, </span><span style=\\"color: #CE9178\\">\\"utf-8\\"</span><span style=\\"color: #D4D4D4\\">));</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">out</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #CE9178\\">\`</span></span>
    <span class=\\"line\\"><span style=\\"color: #CE9178\\">    &#x3C;title>Shiki&#x3C;/title></span></span>
    <span class=\\"line\\"><span style=\\"color: #CE9178\\">    &#x3C;link rel=\\"stylesheet\\" href=\\"style.css\\"></span></span>
    <span class=\\"line\\"><span style=\\"color: #CE9178\\">    </span><span style=\\"color: #569CD6\\">\${</span><span style=\\"color: #9CDCFE\\">html</span><span style=\\"color: #569CD6\\">}</span></span>
    <span class=\\"line\\"><span style=\\"color: #CE9178\\">    &#x3C;script src=\\"index.js\\">&#x3C;/script></span></span>
    <span class=\\"line\\"><span style=\\"color: #CE9178\\">  \`</span><span style=\\"color: #D4D4D4\\">;</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #9CDCFE\\">fs</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">writeFileSync</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"index.html\\"</span><span style=\\"color: #D4D4D4\\">, </span><span style=\\"color: #9CDCFE\\">out</span><span style=\\"color: #D4D4D4\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #9CDCFE\\">console</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">log</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"done\\"</span><span style=\\"color: #D4D4D4\\">);</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  });</span></span></code></pre>
                        </div>
                      
                </div>
              
    <hr>
    <p><a href=\\"https://katex.org\\">https://katex.org</a></p>
    <p><span class=\\"math-inline\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\"><semantics><mrow><mstyle scriptlevel=\\"0\\" displaystyle=\\"true\\"><mfrac><mn>1</mn><mrow><mo fence=\\"true\\">(</mo><msqrt><mrow><mi>ϕ</mi><msqrt><mn>5</mn></msqrt></mrow></msqrt><mo>−</mo><mi>ϕ</mi><mo fence=\\"true\\">)</mo><msup><mi>e</mi><mrow><mfrac><mn>2</mn><mn>5</mn></mfrac><mi>π</mi></mrow></msup></mrow></mfrac><mo>=</mo><mn>1</mn><mo>+</mo><mfrac><msup><mi>e</mi><mrow><mo>−</mo><mn>2</mn><mi>π</mi></mrow></msup><mrow><mn>1</mn><mo>+</mo><mfrac><msup><mi>e</mi><mrow><mo>−</mo><mn>4</mn><mi>π</mi></mrow></msup><mrow><mn>1</mn><mo>+</mo><mfrac><msup><mi>e</mi><mrow><mo>−</mo><mn>6</mn><mi>π</mi></mrow></msup><mrow><mn>1</mn><mo>+</mo><mfrac><msup><mi>e</mi><mrow><mo>−</mo><mn>8</mn><mi>π</mi></mrow></msup><mrow><mn>1</mn><mo>+</mo><mo>⋯</mo></mrow></mfrac></mrow></mfrac></mrow></mfrac></mrow></mfrac></mstyle></mrow><annotation encoding=\\"application/x-tex\\">\\\\displaystyle \\\\frac{1}{\\\\Bigl(\\\\sqrt{\\\\phi \\\\sqrt{5}}-\\\\phi\\\\Bigr) e^{\\\\frac25 \\\\pi}} = 1+\\\\frac{e^{-2\\\\pi}} {1+\\\\frac{e^{-4\\\\pi}} {1+\\\\frac{e^{-6\\\\pi}} {1+\\\\frac{e^{-8\\\\pi}} {1+\\\\cdots} } } }</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:3.01146em;vertical-align:-1.69002em;\\"></span><span class=\\"mord\\"><span class=\\"mopen nulldelimiter\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.32144em;\\"><span style=\\"top:-2.11em;\\"><span class=\\"pstrut\\" style=\\"height:3.15em;\\"></span><span class=\\"mord\\"><span class=\\"mopen\\"><span class=\\"delimsizing size2\\">(</span></span><span class=\\"mord sqrt\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.04139em;\\"><span class=\\"svg-align\\" style=\\"top:-3.2em;\\"><span class=\\"pstrut\\" style=\\"height:3.2em;\\"></span><span class=\\"mord\\" style=\\"padding-left:1em;\\"><span class=\\"mord mathnormal\\">ϕ</span><span class=\\"mord sqrt\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.90722em;\\"><span class=\\"svg-align\\" style=\\"top:-3em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\" style=\\"padding-left:0.833em;\\"><span class=\\"mord\\">5</span></span></span><span style=\\"top:-2.86722em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"hide-tail\\" style=\\"min-width:0.853em;height:1.08em;\\"><svg width=\\"400em\\" height=\\"1.08em\\" viewBox=\\"0 0 400000 1080\\" preserveAspectRatio=\\"xMinYMin slice\\"><path d=\\"M95,702
    c-2.7,0,-7.17,-2.7,-13.5,-8c-5.8,-5.3,-9.5,-10,-9.5,-14
    c0,-2,0.3,-3.3,1,-4c1.3,-2.7,23.83,-20.7,67.5,-54
    c44.2,-33.3,65.8,-50.3,66.5,-51c1.3,-1.3,3,-2,5,-2c4.7,0,8.7,3.3,12,10
    s173,378,173,378c0.7,0,35.3,-71,104,-213c68.7,-142,137.5,-285,206.5,-429
    c69,-144,104.5,-217.7,106.5,-221
    l0 -0
    c5.3,-9.3,12,-14,20,-14
    H400000v40H845.2724
    s-225.272,467,-225.272,467s-235,486,-235,486c-2.7,4.7,-9,7,-19,7
    c-6,0,-10,-1,-12,-3s-194,-422,-194,-422s-65,47,-65,47z
    M834 80h400000v40h-400000z\\"></path></svg></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.13278em;\\"><span></span></span></span></span></span></span></span><span style=\\"top:-3.0013900000000002em;\\"><span class=\\"pstrut\\" style=\\"height:3.2em;\\"></span><span class=\\"hide-tail\\" style=\\"min-width:1.02em;height:1.28em;\\"><svg width=\\"400em\\" height=\\"1.28em\\" viewBox=\\"0 0 400000 1296\\" preserveAspectRatio=\\"xMinYMin slice\\"><path d=\\"M263,681c0.7,0,18,39.7,52,119
    c34,79.3,68.167,158.7,102.5,238c34.3,79.3,51.8,119.3,52.5,120
    c340,-704.7,510.7,-1060.3,512,-1067
    l0 -0
    c4.7,-7.3,11,-11,19,-11
    H40000v40H1012.3
    s-271.3,567,-271.3,567c-38.7,80.7,-84,175,-136,283c-52,108,-89.167,185.3,-111.5,232
    c-22.3,46.7,-33.8,70.3,-34.5,71c-4.7,4.7,-12.3,7,-23,7s-12,-1,-12,-1
    s-109,-253,-109,-253c-72.7,-168,-109.3,-252,-110,-252c-10.7,8,-22,16.7,-34,26
    c-22,17.3,-33.3,26,-34,26s-26,-26,-26,-26s76,-59,76,-59s76,-60,76,-60z
    M1001 80h400000v40h-400000z\\"></path></svg></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.19860999999999995em;\\"><span></span></span></span></span></span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span><span class=\\"mbin\\">−</span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span><span class=\\"mord mathnormal\\">ϕ</span><span class=\\"mclose\\"><span class=\\"delimsizing size2\\">)</span></span><span class=\\"mord\\"><span class=\\"mord mathnormal\\">e</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.93957em;\\"><span style=\\"top:-3.3485500000000004em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\"><span class=\\"mopen nulldelimiter sizing reset-size3 size6\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.8443142857142858em;\\"><span style=\\"top:-2.656em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size3 size1 mtight\\"><span class=\\"mord mtight\\">5</span></span></span><span style=\\"top:-3.2255000000000003em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line mtight\\" style=\\"border-bottom-width:0.049em;\\"></span></span><span style=\\"top:-3.384em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size3 size1 mtight\\"><span class=\\"mord mtight\\">2</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.344em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter sizing reset-size3 size6\\"></span></span><span class=\\"mord mathnormal mtight\\" style=\\"margin-right:0.03588em;\\">π</span></span></span></span></span></span></span></span></span></span></span><span style=\\"top:-3.38em;\\"><span class=\\"pstrut\\" style=\\"height:3.15em;\\"></span><span class=\\"frac-line\\" style=\\"border-bottom-width:0.04em;\\"></span></span><span style=\\"top:-3.827em;\\"><span class=\\"pstrut\\" style=\\"height:3.15em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">1</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.69002em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter\\"></span></span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span><span class=\\"mrel\\">=</span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span></span><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.72777em;vertical-align:-0.08333em;\\"></span><span class=\\"mord\\">1</span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span><span class=\\"mbin\\">+</span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span></span><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:3.692383em;vertical-align:-2.201275em;\\"></span><span class=\\"mord\\"><span class=\\"mopen nulldelimiter\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.491108em;\\"><span style=\\"top:-2.19358em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">1</span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span><span class=\\"mbin\\">+</span><span class=\\"mspace\\" style=\\"margin-right:0.2222222222222222em;\\"></span><span class=\\"mord\\"><span class=\\"mopen nulldelimiter\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.91642em;\\"><span style=\\"top:-2.4519800000000003em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">1</span><span class=\\"mbin mtight\\">+</span><span class=\\"mord mtight\\"><span class=\\"mopen nulldelimiter sizing reset-size3 size6\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.0543142857142858em;\\"><span style=\\"top:-2.229757142857143em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size3 size1 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">1</span><span class=\\"mbin mtight\\">+</span><span class=\\"mord mtight\\"><span class=\\"mopen nulldelimiter sizing reset-size1 size6\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.32544em;\\"><span style=\\"top:-2.468em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">1</span><span class=\\"mbin mtight\\">+</span><span class=\\"minner mtight\\">⋯</span></span></span><span style=\\"top:-3.2255000000000003em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line mtight\\" style=\\"border-bottom-width:0.049em;\\"></span></span><span style=\\"top:-3.387em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mathnormal mtight\\">e</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.9384399999999999em;\\"><span style=\\"top:-2.93844em;margin-right:0.1em;\\"><span class=\\"pstrut\\" style=\\"height:2.64444em;\\"></span><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">−</span><span class=\\"mord mtight\\">8</span><span class=\\"mord mathnormal mtight\\" style=\\"margin-right:0.03588em;\\">π</span></span></span></span></span></span></span></span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.61533em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter sizing reset-size1 size6\\"></span></span></span></span></span><span style=\\"top:-3.2255000000000003em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line mtight\\" style=\\"border-bottom-width:0.049em;\\"></span></span><span style=\\"top:-3.384em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size3 size1 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mathnormal mtight\\">e</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.9384399999999999em;\\"><span style=\\"top:-2.93844em;margin-right:0.1em;\\"><span class=\\"pstrut\\" style=\\"height:2.64444em;\\"></span><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">−</span><span class=\\"mord mtight\\">6</span><span class=\\"mord mathnormal mtight\\" style=\\"margin-right:0.03588em;\\">π</span></span></span></span></span></span></span></span></span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.2097642857142856em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter sizing reset-size3 size6\\"></span></span></span></span></span><span style=\\"top:-3.23em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line\\" style=\\"border-bottom-width:0.04em;\\"></span></span><span style=\\"top:-3.394em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mathnormal mtight\\">e</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.7463142857142857em;\\"><span style=\\"top:-2.786em;margin-right:0.07142857142857144em;\\"><span class=\\"pstrut\\" style=\\"height:2.5em;\\"></span><span class=\\"sizing reset-size3 size1 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">−</span><span class=\\"mord mtight\\">4</span><span class=\\"mord mathnormal mtight\\" style=\\"margin-right:0.03588em;\\">π</span></span></span></span></span></span></span></span></span></span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.3948549999999997em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter\\"></span></span></span></span><span style=\\"top:-3.23em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line\\" style=\\"border-bottom-width:0.04em;\\"></span></span><span style=\\"top:-3.677em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\"><span class=\\"mord mathnormal\\">e</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.8141079999999999em;\\"><span style=\\"top:-3.063em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\"><span class=\\"mord mtight\\">−</span><span class=\\"mord mtight\\">2</span><span class=\\"mord mathnormal mtight\\" style=\\"margin-right:0.03588em;\\">π</span></span></span></span></span></span></span></span></span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:2.201275em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter\\"></span></span></span></span></span></span></p>
    <hr>

                <div class=\\"rehype-shiki\\">
                  
                        <div class=\\"light\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #FFFFFF\\"><code><span class=\\"line\\"><span style=\\"color: #000000\\">[</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"abbr\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"accept\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"acceptCharset\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"accessKey\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"action\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"align\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"alt\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"ariaDescribedBy\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"ariaHidden\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"ariaLabel\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"ariaLabelledBy\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"axis\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"border\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"cellPadding\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"cellSpacing\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"char\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"charOff\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"charSet\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"checked\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"clear\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"cols\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"colSpan\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"color\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"compact\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"coords\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"dateTime\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"dir\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"disabled\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"encType\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"htmlFor\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"frame\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"headers\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"height\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"hrefLang\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"hSpace\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"isMap\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"id\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"label\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"lang\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"maxLength\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"media\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"method\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"multiple\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"name\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"noHref\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"noShade\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"noWrap\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"open\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"prompt\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"readOnly\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"rel\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"rev\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"rows\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"rowSpan\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"rules\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"scope\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"selected\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"shape\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"size\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"span\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"start\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"summary\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"tabIndex\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"target\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"title\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"type\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"useMap\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"vAlign\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"value\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"vSpace\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"width\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #A31515\\">\\"itemProp\\"</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">]</span></span></code></pre>
                        </div>
                      
                        <div class=\\"dark\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #1E1E1E\\"><code><span class=\\"line\\"><span style=\\"color: #D4D4D4\\">[</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"abbr\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"accept\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"acceptCharset\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"accessKey\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"action\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"align\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"alt\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"ariaDescribedBy\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"ariaHidden\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"ariaLabel\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"ariaLabelledBy\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"axis\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"border\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"cellPadding\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"cellSpacing\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"char\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"charOff\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"charSet\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"checked\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"clear\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"cols\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"colSpan\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"color\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"compact\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"coords\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"dateTime\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"dir\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"disabled\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"encType\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"htmlFor\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"frame\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"headers\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"height\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"hrefLang\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"hSpace\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"isMap\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"id\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"label\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"lang\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"maxLength\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"media\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"method\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"multiple\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"name\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"noHref\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"noShade\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"noWrap\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"open\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"prompt\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"readOnly\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"rel\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"rev\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"rows\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"rowSpan\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"rules\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"scope\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"selected\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"shape\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"size\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"span\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"start\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"summary\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"tabIndex\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"target\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"title\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"type\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"useMap\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"vAlign\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"value\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"vSpace\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"width\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  </span><span style=\\"color: #CE9178\\">\\"itemProp\\"</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">]</span></span></code></pre>
                        </div>
                      
                </div>
              
    <hr>
    <h1>CommonMark</h1>
    <blockquote>
    <p>Block quote.</p>
    </blockquote>
    <p>Some <em>emphasis</em>, <strong>importance</strong>, and <code>code</code>.</p>
    <hr>
    <h1>GitHub Flavored Markdown (GFM)</h1>
    <h2>Autolink literals</h2>
    <p><a href=\\"http://www.example.com\\">www.example.com</a>, <a href=\\"https://example.com\\">https://example.com</a>, and <a href=\\"mailto:contact@example.com\\">contact@example.com</a>.</p>
    <h2>Strikethrough</h2>
    <p><del>one</del> or <del>two</del> tildes.</p>
    <h2>Table</h2>









    <table><thead><tr><th>a</th><th align=\\"left\\">b</th><th align=\\"right\\">c</th><th align=\\"center\\">d</th></tr></thead></table>
    <h2>Tasklist</h2>
    <ul>
    <li class=\\"task-list-item\\"><input type=\\"checkbox\\" disabled> Lorem, ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus cupiditate distinctio similique sequi velit omnis tenetur aut vitae sapiente quod a repudiandae porro veniam soluta doloribus quia, dolorum, reprehenderit quisquam.</li>
    <li class=\\"task-list-item\\"><input type=\\"checkbox\\" checked disabled> Lorem ipsum dolor sit amet, consectetur adipisicing elit. Delectus, voluptatem at architecto excepturi officia, dolores quibusdam fugiat eligendi veniam perspiciatis, nostrum laudantium autem quasi sequi explicabo molestias ea minima iusto.</li>
    </ul>
    <hr>
    <h1>HTML</h1>
    <details>
    <p>A mix of <em>Markdown</em> and <em>HTML</em>.</p>
    </details>
    <hr>
    <h1>Cross-Site Scripting (XSS)</h1>
    <p>👍🙌</p>
    <hr>
    <h1>Syntax highlighting (Shiki)</h1>

                <div class=\\"rehype-shiki\\">
                  
                        <div class=\\"light\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #FFFFFF\\"><code><span class=\\"line\\"><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">shiki</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">require</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\\"shiki\\"</span><span style=\\"color: #000000\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #001080\\">shiki</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  .</span><span style=\\"color: #795E26\\">getHighlighter</span><span style=\\"color: #000000\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #001080\\">theme:</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #A31515\\">\\"nord\\"</span><span style=\\"color: #000000\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  })</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  .</span><span style=\\"color: #795E26\\">then</span><span style=\\"color: #000000\\">((</span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\">) </span><span style=\\"color: #0000FF\\">=></span><span style=\\"color: #000000\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">    </span><span style=\\"color: #001080\\">console</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">log</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">codeToHtml</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\`console.log('shiki');\`</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #A31515\\">\\"js\\"</span><span style=\\"color: #000000\\">));</span></span>
    <span class=\\"line\\"><span style=\\"color: #000000\\">  });</span></span></code></pre>
                        </div>
                      
                        <div class=\\"dark\\">
                          <pre class=\\"shiki\\" style=\\"background-color: #1E1E1E\\"><code><span class=\\"line\\"><span style=\\"color: #569CD6\\">const</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #4FC1FF\\">shiki</span><span style=\\"color: #D4D4D4\\"> = </span><span style=\\"color: #DCDCAA\\">require</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\\"shiki\\"</span><span style=\\"color: #D4D4D4\\">);</span></span>

    <span class=\\"line\\"><span style=\\"color: #9CDCFE\\">shiki</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  .</span><span style=\\"color: #DCDCAA\\">getHighlighter</span><span style=\\"color: #D4D4D4\\">({</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #9CDCFE\\">theme:</span><span style=\\"color: #D4D4D4\\"> </span><span style=\\"color: #CE9178\\">\\"nord\\"</span><span style=\\"color: #D4D4D4\\">,</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  })</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  .</span><span style=\\"color: #DCDCAA\\">then</span><span style=\\"color: #D4D4D4\\">((</span><span style=\\"color: #9CDCFE\\">highlighter</span><span style=\\"color: #D4D4D4\\">) </span><span style=\\"color: #569CD6\\">=></span><span style=\\"color: #D4D4D4\\"> {</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">    </span><span style=\\"color: #9CDCFE\\">console</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">log</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #9CDCFE\\">highlighter</span><span style=\\"color: #D4D4D4\\">.</span><span style=\\"color: #DCDCAA\\">codeToHtml</span><span style=\\"color: #D4D4D4\\">(</span><span style=\\"color: #CE9178\\">\`console.log('shiki');\`</span><span style=\\"color: #D4D4D4\\">, </span><span style=\\"color: #CE9178\\">\\"js\\"</span><span style=\\"color: #D4D4D4\\">));</span></span>
    <span class=\\"line\\"><span style=\\"color: #D4D4D4\\">  });</span></span></code></pre>
                        </div>
                      
                </div>
              
    <hr>
    <h1>Mathematics (KaTeX)</h1>
    <p>Lift(<span class=\\"math-inline\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\"><semantics><mrow><mi>L</mi></mrow><annotation encoding=\\"application/x-tex\\">L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.68333em;vertical-align:0em;\\"></span><span class=\\"mord mathnormal\\">L</span></span></span></span></span>) can be determined by Lift Coefficient (<span class=\\"math-inline\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\"><semantics><mrow><msub><mi>C</mi><mi>L</mi></msub></mrow><annotation encoding=\\"application/x-tex\\">C_L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.83333em;vertical-align:-0.15em;\\"></span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.07153em;\\">C</span><span class=\\"msupsub\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.32833099999999993em;\\"><span style=\\"top:-2.5500000000000003em;margin-left:-0.07153em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mathnormal mtight\\">L</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.15em;\\"><span></span></span></span></span></span></span></span></span></span></span>) like the following
    equation.</p>
    <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mi>L</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>ρ</mi><msup><mi>v</mi><mn>2</mn></msup><mi>S</mi><msub><mi>C</mi><mi>L</mi></msub></mrow><annotation encoding=\\"application/x-tex\\">L = \\\\frac{1}{2} \\\\rho v^2 S C_L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.68333em;vertical-align:0em;\\"></span><span class=\\"mord mathnormal\\">L</span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span><span class=\\"mrel\\">=</span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span></span><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:2.00744em;vertical-align:-0.686em;\\"></span><span class=\\"mord\\"><span class=\\"mopen nulldelimiter\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.32144em;\\"><span style=\\"top:-2.314em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">2</span></span></span><span style=\\"top:-3.23em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line\\" style=\\"border-bottom-width:0.04em;\\"></span></span><span style=\\"top:-3.677em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">1</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.686em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter\\"></span></span><span class=\\"mord mathnormal\\">ρ</span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.03588em;\\">v</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.8641079999999999em;\\"><span style=\\"top:-3.113em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\">2</span></span></span></span></span></span></span></span><span class=\\"mord mathnormal\\" style=\\"margin-right:0.05764em;\\">S</span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.07153em;\\">C</span><span class=\\"msupsub\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.32833099999999993em;\\"><span style=\\"top:-2.5500000000000003em;margin-left:-0.07153em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mathnormal mtight\\">L</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.15em;\\"><span></span></span></span></span></span></span></span></span></span></span></div>
    <p>A raw dollar sign: $</p>
    <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mstyle mathcolor=\\"#cc0000\\"><mtext>\\\\invalidMacro</mtext></mstyle></mrow><annotation encoding=\\"application/x-tex\\">\\\\invalidMacro</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:1em;vertical-align:-0.25em;\\"></span><span class=\\"mord text\\" style=\\"color:#cc0000;\\"><span class=\\"mord\\" style=\\"color:#cc0000;\\">\\\\invalidMacro</span></span></span></span></span></span></div>
    <p>Prevent large width/height visual affronts:</p>
    <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mpadded height=\\"+0em\\" voffset=\\"0em\\"><mspace mathbackground=\\"black\\" width=\\"25em\\" height=\\"25em\\"></mspace></mpadded></mrow><annotation encoding=\\"application/x-tex\\">\\\\rule{500em}{500em}</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:25em;vertical-align:0em;\\"></span><span class=\\"mord rule\\" style=\\"border-right-width:25em;border-top-width:25em;bottom:0em;\\"></span></span></span></span></span></div>"
  `);
});
```

</details>

### API

- Integrate with other platforms, for example, LMSs.
  - Learning Tools Interoperability (LTI).
- To build extensions, for example, ask a question from within the text editor.

### Mobile & Desktop Applications

- Can we get away with not having mobile & desktop applications? How much does it hinder our ability to do things like notifications?
  - PWA to begin with: https://checkvist.com/auth/mobile
- Desktop: Electron.
- Mobile:
  - https://capacitorjs.com/
    - Agnostic to front-end framework.
    - Excellent onboarding experience.
    - Isn’t super popular, but the smaller community is enthusiastic.
  - https://reactnative.dev/
    - https://expo.dev/
    - Ties you to React.
    - Much more popular than anything else.
  - https://cordova.apache.org/
    - The spiritual predecessor of Capacitor.
    - Still more popular, but dreaded.
- Have registry of Courselore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)

### Design & Accessibility

- Translate to other languages.
- Add a toggle to switch between light mode and dark mode, regardless of your operating system setting? I don’t like this idea, but lots of people do it. Investigate…
- Test screen readers.
- Test contrast.

### Documentation

- Videos
  - Application demonstration.
  - How to self-host.
  - How to setup for development.
- “One-click deployment”
  - DigitalOcean.
  - Linode.
  - Amazon.
  - Google Cloud.
  - Microsoft Azure.
  - https://sandstorm.io.

### Marketing

- User groups.
- Landing page:
  - https://capacitorjs.com
  - Maybe hire a designer.
- Newsletter.
- Create Courselore Gravatar.
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
  - <https://www.d2l.com/products/>
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
