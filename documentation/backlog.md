# Backlog

### Performance

- Client:

  - Treat the case of a live-update coming in the middle of a GET live-navigation.
    - Abort the live-update connection before live navigation.
    - Use the `beforenavigate` event.
    - Then we don’t need to call `liveUpdates(undefined)` on `layouts.ts` to close a live-updates connection.
  - Confirm that “will lose your changes” dialog happens before live-updates disconnection.
  - Don’t disconnect/reconnect the live-updates event stream if you’ll be on the same page.
  - Handle 422.

- Add the number of unread messages to the `<title>`.

- Deal with reconnections

  - Approaches:
    - Force a live updates when token is unknown
    - Introduce some global notion of timing, which we could use to determine whether a brand-new event-stream already needs a live-update
  - Use the notion of `expiresAt`.

- Server

  - Don’t even enqueue events for the token that originated a POST action. In other words, check early—don’t check for that condition before actually dispatching the event.
  - Double-check that the response to a `POST` goes out before we start processing live-updates
    - Keep in mind that a `POST` will generate a redirect and a subsequent `GET`.
    - Maybe introduce a timeout so that the client has a chance of getting their `GET` in front of the queue.

- TODO

- Review:

  - `leafac--javascript.js`
  - `live-updates.ts`
  - `authentication.ts`
  - `logging.ts`
  - `layouts.ts` (Call to `liveUpdates()`)

- Things to test:

  - Sliding session
    - Occurs on normal request
    - Occurs on request establishing event-stream
    - Doesn’t occur on event-stream itself
  - Flashes on live-updates
  - Logs
    - Live-updates GETs are flagged as such
    - Event-streams
      - Created
        - Opened
          - Closed
        - Failed
        - Expired
  - Event-stream
    - Disconnect because server went down: should live-update as soon as connected
    - Disconnect because client went offline & reconnect relatively quickly: should only live-update if something new came in
    - Disconnect because client went offline & reconnect after a long time: should live-update regardless
    - Update in between initial request and event-stream establishment: should live-update as soon as connected
  - `/messages/new`: Example of a route which has live-updates and has a form that will `POST` and redirect you to another URL.

- Document
  - Reasons to prefer `fetch` over `EventSource`:
    - Features such as headers.
    - Implementors lost interest on `EventSource` (https://github.com/whatwg/html/issues/2177).
    - Free to use a more sensible event-stream format, such as NDJSON
  - Reasons to have one event-stream connection per route, and close and reopen as you navigate, as opposed to a single persistent event-stream connection:
    - Session management would be awkward
    - Extra work to not have event-stream open for routes that don’t support them (otherwise it increases the server load for no good reason) (but most of the time people are on routes that support live updates, so it’s no big deal).
    - The live-updates middleware benefits from appearing after authentication and retrieval of things like course information. It’d be awkward to have it as a global middleware.
  - Reasons not to use the Visibility API:
    - First, the obvious pro: We could disconnect the live-updates event-stream when the tab isn’t showing, reducing the load on the server.
    - But we decided against it because we want to be able to have features such as changing a tab title to “2 unread messages,” even if the tab is on the background, and this requires the connection to the server to be kept alive.

---

- Check if textarea freezes when live-update is being processed.

---

- Pagination.
  - `TODO`
  - Smarter default page for when the page isn’t specified explicitly:
    - Messages
      - Deep links should go to the page containing the referred message
      - If there is no deep link but there are unread messages, go to page containing the first unread message
    - Conversations
      - Page containing the currently open conversation?
  - Load pages on scroll instead of button
  - Deal with delete messages/conversations at the edges (before and after)
    - `CAST("reference" AS INTEGER) >= CAST(${req.query.beforeMessageReference} AS INTEGER)`
      - Create indices for `CAST("reference" AS INTEGER)` or convert `"reference"` into number (and then create an index for that!).
  - On sending message on non-chat, it’s scrolling back to the first page.
  - Remove feature flag.
  - The “mark as read” button won’t work because it doesn’t visit all pages.

---

- Framing?
  - Pagination links.
    - Conversations in sidebar.
    - Messages in conversation.
  - Filters.

---

- Moving forward:
  - Redesign sidebar, chat messages, and things like announcements vs notes-that-generate-notifications.
  - Notification digests.
  - 1-on-1 conversations.

### User Interface Improvements

- Highlight changes in yellow (the same yellow as used for targeted messages with permanent links), for example, when you create an invitation.

---

- Add the notion of follow-up question, so that questions aren’t marked as “unresolved” as soon as a student sends a message. It makes sense for when the student just says “thanks.”

---

- Tip sheet on how to get notifications
- Upload roster and show differences.
- When editing, and trying to send empty message, propose to delete (like Discord does).

---

- SVG when resized (avatar or thumbnail) change extension into PNG, but we’re producing the wrong filename.

---

- Rename, reword, and refactor:
  - “Confirm” email → “Verify” email.

---

- Redesign the “Start a Conversation” button to include the wording of “Ask a Question”
- Remove the type “announcement” in favor of the type “note,” and introduce the notion of making it “broadcastable.”
- Redesign the “New Conversation” page. Keep all the material that is there, but present it differently to try and make the page cleaner.
  - Collapse tags (similar to what we do in the conversation page itself, and to what Reddit does).
    - Change the widget that’s a tag: Instead of `icon text`, make the text look like it’s inside a tag.
  - Use different background colors, similar to Piazza.
- Redesign filters to bring out the “resolved/unresolved” filters.
- Introduce the notion of “Quick Filters” for different conversation types.
- Group conversations by date & pinned (similar to Piazza & Campuswire).
- Include a “set as answer and endorse” button.

---

- Add a help screen under the “About Courselore” button:
  - A more app-like experience (in iOS):
    - Bookmark Courselore to home screen.
    - Use VIPs as notifications mechanism.
  - If things look weird, or if something doesn’t work, you may need to update your browser.
- Make a public page listing known issues.
- Add a call-to-action on the bottom navigation bar that isn’t just about reporting bugs, but about providing feedback and joining the Courselore community.
- In Meta Courselore, make a pinned announcement of how to report bugs.
  - Have a way to pre-fill the new conversation form, similar to what GitHub does with new issues.
- Don’t leak `HTMLForJavaScript`, `<style>`, and `update()`.
- Chats sometimes scroll by themselves(!)
  - Maybe it’s been fixed by preventing the date separators from hiding on live-updates.
  - Scroll to bottom on with MutationObserver?

---

- Introduce the notion of locking a conversation.
- Introduce the notion of promoting a message into its own conversation (one example use case is when someone asks a question as a follow-up to an announcement).

### More Performance

- Live updates destinations:
  - Check conversation id and only send notifications to relevant connections.
    - It gets a bit tricky, because some conversation modifications affect the sidebar, which should be updated for every tab with the course open.
  - When we have pagination, take it a step further and only live update tabs with the affected message open.
- Lazy loading & DRYing to reduce HTML payload
  - `userPartial` tooltip
  - `conversationPartial` tooltip on decorated content
  - Edit message forms.
    - Use `data-content-source` that’s already used by the quoting mechanism.
    - Implement a more proper solution than the current use of `autosize.update()`
    - Should also fix the bug in which you send a couple messages in a row, they coalesce, and then you try to edit.
  - Conversation navigation shouldn’t refresh the whole page:
    - List of conversations shouldn’t jump when you go to a particular conversation.
  - On mobile, decouple the list of conversation (the sidebar on desktop) from the conversation itself, to push less data on the wire
  - Use web sockets instead of HTTP to save on roundtrips, authentication, and so forth? (Probably not, because it adds a lot of complexity, from keeping the connection open, to re-authenticating anyway to make sure you haven’t lost access to the relevant information, and so forth. But still, investigate…)
  - I was on the fence about whether to hoist client-side JavaScript the same way we hoist CSS. Arguments in favor:
    - Reduce the payload, because multiple long `oninteractive` in a loop get DRYed up.
    - Consistency with CSS.
  - Content processor should only attach position information that we’ll actually use.
    - This also allows us to simplify the code that uses the position information, because we don’t have to discard positions from inner elements.
  - On live update `refresh` event, don’t include whole page, just a Turbo Stream of what changed

---

- View caching on the server.
- Page caching on the client (similar to Turbo Links).

---

- Pre-fetching
  - There are some links that have side-effects (marking messages as read).
  - All links in viewport
    - https://getquick.link/
  - Link under cursor
    - https://www.peterbe.com/plog/aggressively-prefetching-everything-you-might-click
    - https://www.mskog.com/posts/instant-page-loads-with-turbolinks-and-prefetch
    - http://instantclick.io
  - References:
    - https://web.dev/speculative-prerendering/

---

- Write a function to determine if processing the message is even necessary. Most messages don’t use extra features and could skip JSDOM entirely.
- Investigate other potential bottlenecks:
  - Synchronous stuff that could be async.

### Advanced Access Control

- Chats with only a few people.
- 1-to-1 conversation: Use background color to distinguish between people, so you don’t have to show their names over and over.
- Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
  - Some groups are available only to students, while others only to staff.
  - People assign themselves to groups.
- Add mentions like `@group-3`.

### Users

- Improvements to the workflow for when you change your email:
  - The confirmation email has a subject of “Welcome to Courselore!”. It should be “Please confirm your email”.
  - Maybe we shouldn’t actually change the email until it’s confirmed. Otherwise an attacker with a compromised password could change your email and lock you out of the “Forgot your password?” flow.
- Online indicators.
  - Turn them on when someone who was offline becomes online.
  - Don’t turn them off if person continues to be online.
  - Fade in and out.
- Allow person to have multiple emails on their account.
- Allow people to remove their accounts.
- Authentication:
  - SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).
  - 2-Factor Authentication.
- Pronoun.
- A short audio with the name’s pronunciation.
- Give visual indication on dragging-and-dropping avatar on `/settings/profile`.

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

- Let staff endorse other staff answers.
- Add the notion of “staff considers this a good question.” Similar to the notion of “endorsement,” but for questions.
- Change the meaning of “views”: Instead of using “readings”, only count as “viewed” if the message has appeared on the person’s screen.
  - Tracking pixel on email for people who will read the notification on their email and just “mark as read” on Courselore?
- Add a button to “Return to Bottom” in chat.
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

- Redesign:
  - Clearer separation between messages
    - More space
    - Avatars on side
    - Higher contrast between background and text.
  - Blockquotes (replies) should have a faint background color to help differentiate them.
    - Collapse long blockquotes
  - Add more options to the hover menu (besides the ellipses), similar to Slack & Discord.
  - Bigger font (15pt).
  - Wider columns
- Currently typing.
- “Truncate” long messages.
- Show accent colors for different people (for example, faint background colors), to help identify messages.
- Nested replies (similar to Slack’s threads).

### Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

### Notifications

- Make emails be replies, so that they’re grouped in conversations on email readers.
- Decorate the content sent on notifications, to avoid showing things like `@john-doe--201231`.
- Digests that accumulate notifications over a period: every 30 minutes / 1 hour / day.
- Notifications for the same conversation should be “reply” to email on same thread.
- Email notification subjects could include the fact that you were mentioned, to make it easier to set up filters.
- Change the page title when there are new messages on that conversation, to make it stand out on the browser tabs.
  - Or change the favicon.
- Implement job for scheduling notifications
  - Delay sending notifications for a little bit to give the person a chance to update or delete the message.
  - Don’t send notifications when the person is online and/or has seen the message.
  - Get notifications for replies to your posts. If a student asks a question they probably would like notifications on all replies. That might want to be on by default as well.
- Add support for Dark Mode in emails.
  - This should fix the duplication of code blocks.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).
- Add different notification badges for when you’re @mentioned.
- A timeline-like list of unread messages and other things that require your attention.
- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
  - Receive notifications from conversations you’ve participated in.
- Other channels: Use the browser Notifications API & Push API; Desktop & phone applications.
- Snooze.
- Don’t require user to be logged in to unsubscribe from notifications?
- Add option to receive email notifications for your own messages.

### Search

- Search should display multiple messages in the same conversation. (Right now it’s only showing the highest ranked message and grouping by conversation.)
- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filters for unanswered questions, answered questions, and so forth.
- Filter by date.
- Show only conversations with unread messages.

### Content Editor

- On new conversation page, maybe adapt the `@mentions` widget according to the visibility that’s currently set.
- On the contentProcessor, maybe don’t render `@mention` widget for people who aren’t in the conversation.
- Have the `@mention` widget list people who aren’t in the conversation (suitably marked as so) (similar to Twitter DMs).
- When you select multiple lines and click on the list options, turn each line into a list item.
- Add more placeholders to things like tables to help explain how to use them.
- Press ↑ to edit previously sent message.
- Templates for questions (like GitHub Issues).
- Reuse answers.
- Paste tables from Excel and have them formatted as Markdown tables.
- Add https://github.com/fregante/indent-textarea or CodeMirror in programmer mode.
- If you’re in the middle of editing, and someone else edits a message (or the conversation title), then you’re going to overwrite their changes. Warn about this.

### Content Processor

- Potential issue: It’s possible to send a message such as `<!-- -->` which is visually empty.
- Syntax highlighter isn’t kicking in on blockquote.
- `#references` into the same conversation don’t need to load the whole `conversationPartial`, just the message part of it.
- Add support for underline in Markdown.
  - Add a job to re-preprocess content:
    - Messages
    - Biographies
- The “quote” button on code blocks is showing up in the wrong place.
- `.katex` is overflowing in the `y` axis unnecessarily. (See, for example, the example we give on the home page.)
- Emoji with the `:smile:` form.
- Proxy hotlinked images (particularly if served with HTTP because of insecure content): https://github.com/atmos/camo
- Reference on more features ideas: <https://github.com/gjtorikian/html-pipeline>
- Polls.
- Lightbox modal for resized images.
  - Animated GIFs should just play.
  - Convert animaged GIFs into other data formats that would be lighter.
- Lightbox for code blocks (“click for more”, full screen, and selective wrap or not long lines).
- Lightbox for block quotes.
- Add support for videos: Sanitization, dimensions, and so forth.
- Install extensions for Shiki, for example, for OCaml.
- Mermaid: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/

### Pagination

- Edge case: Show next/previous page on “no more messages”.
  - This is edge case because people should only be able to get there when they manipulate the URL (or because they’re loading the next page right when an item has been deleted)
  - Difficult because we don’t have a “before” or “after” message to anchor to.
- Course Settings · Enrollments.
  - And other pages, for example, invitations.

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

- Do something special on live updates & 404.
  - For example, when we have a tab open with a conversation and someone else deletes it.
  - Right now we just show the 404 to the person, without much context, which can be confusing.
  - One possible solution is to look at the `Live-Updates` header on the `GET` and set a flash.
- The submission of a form resets the state of the rest of the page.
  - For example, start editing the title of a conversation, then click on “Pin”. The editing form will go away.
  - The first step would be keep the `hidden` state on form submission, but then other things break, for example, if you’re actually submitting a conversation title update, then the form should be hidden. As far as I can tell, there’s no way to detect what should be hidden and what should be shown automatically: We’d have to write special cases. For example, on the `onsubmit` of the conversation title update, we could add actions to reset the hidden state of the involved components.
  - Then, on `morph()`, we must look at the `originalEvent` and avoid updating form fields that aren’t the submitted form. This part is actually relatively straightforward: `detail.originalEvent instanceof SubmitEvent && detail.originalEvent.target.contains(from)`
  - (Another example: When performing any simple form submission, for example, “Like”, the “NEW” message separator goes away. But maybe that’s a good thing: Once you interacted with the page, you probably already read the new messages, so it maybe it’s better for that separator to go away.)
- On local CSS, use a non-standard attribute instead of classes?
  - Pros:
    - It’s a cleaner solution, given that we’re sort of abusing classes.
  - Cons:
    - It’s less usual.
- Selective fetching: the server doesn’t need to send the whole page all the time. It can send only what changed.
- Update tooltip content by morphing, instead of simply replacing, to preserve state (particularly on live updates):
  - Scrolling
  - In chats, the “Views” component in the “Actions” menu closes on live update.
- Re-fetch partials in the background after live updates? They may have gotten stale, for example, the “Views” component, if it’s open right as a live update is happening.
- Scroll to the bottom when sending chat message?
- Do something to prevent flash of unstyled content on scrolling. It’s mostly an issue when loading a deeply-linked conversation directly, because otherwise live-navigation takes care of the issue.
- Prevent the flash of unformatted datetime on fields using `validateLocalizedDateTime()`.
- Redesign the presentation of submenus, for example, “Conversations”, on mobile. Try a hamburger menu.
- Artificial progress bar on hijacked navigation, similar to Turbo Drive.
- Live-updates:
  - Improve the refreshing mechanism
    - Only send refresh events to people who need it (those who have open a page that’s affected)
    - Spread refresh events over time, or you’re DoS the server
- Tooltip showing the views for a message:
  - The counter is sometimes lagging behind the actual count, because we don’t send refresh events on every GET everyone ever does (’cause **that** would be silly 😛)
    - Another consequence of not sending refresh events on every GET is that the number of unread messages on the sidebar becomes inconsistent when you have multiple tabs open and you read messages on one of them (the rest still show the unread indicator).
  - It should live-update. (Or the cached content of the tooltip should be expired somehow.)
- `updatedAt` relative times aren’t updating as they should, because they don’t look at `datetime` again (effectively, `datetime` is cached).
- On chats (which need to scroll to the bottom), do something to prevent flash of unstyled content.
- Potential issue: when we deploy a new version, Morphdom doesn’t update the global CSS & JavaScript. Solution: force a reload.
- Right now we’re using a Turbo Drive approach. Upgrade to a Turbo Streams approach for critical flows. (In other words, don’t redirect as response to `POST`, but send the data right away.)
- Do the morphdom on the server?
- Add latency compensation to other parts of the system, for example, endorsements and changing the conversation type. (In general, look for `emitCourseRefresh`).
  - Maybe add it everywhere, following the Turbo Drive approach?
- In a chat, if you’re the only like, and you remove it, then the dropdown menu won’t update and you won’t be able to re-like it.
- Do something about time stamps making the design jump around.
  - I tried giving them fixed width, but it didn’t look right.
- Change the design of chats so that it’s easier to tell messages apart. Right now @mentions and messages look too much alike. Maybe use the Slack/Discord/GitHub solution of moving the avatar into the margin.
- Have some kind of guide for the first time you enter the system, or the first time you create a course, and that sort of thing.
- Make breadcrumbs (for example, under “User Settings”) clickable (they should expose the navigation menu, just like what happens in Visual Studio Code).
- The anonymity button isn’t as clear as it should be.
- When adding tags with the “Manage Tags” button (from the “Create a New Conversation” form or from the “Tags” button on a conversation), have a way to load the new tags without losing progress.
- Add a `max-height` to the course switcher (what if you have many courses?).
- Checkboxes that don’t have a visual indication may be confusing.
- Right click menus on stuff.
- Places where we show `administratorEmail` to report bugs could be forms instead.

### Live Updates Improvements

- Scroll to `#anchored` element.
- Cache?
  - Advantages:
    - It’ll potentially be a bit faster.
  - Disadvantages:
    - It complicates the implementation.
    - It uses more memory on the client side.
  - Make sure to clear cache on sign-out or the back button will reveal private information.

### Videos

- Educators:
  - Short “sales pitch”
  - Tutorial
- Students:
  - Tutorial
- System administrators
  - How to deploy, backup, and update
  - Lower priority: We’ll do this in the future and rely solely on the text-based instructions for now.

### Infrastructure

- Autosize is leaking resources because of the global `Map` of bound textareas. It should be using `WeakMap` instead.
  - Look into using `fit-textarea@2.0.0` instead.
- Event-streams (and keep-alive connections in general)
  - Heartbeat every 15 seconds?
  - Check for timeouts and limits:
    - Caddy
    - Express
- Live-updates:
  - Use smarter data structures for `liveUpdatesEventDestinations` so that we don’t have to traverse the whole set so often.
  - Make the channels more granular so that they have to update every connection for the course.
- Add missing `key`s:
  - `partials.user()` (this is trickier than it may seem, because it actually requires creating `reference`s for users).
  - `class=`
  - `querySelector`
- Asset fingerprinting?
  - Right now we’re relying on ETags, but they require a roundtrip to the server to get the 304. With asset fingerprinting, we could prevent the roundtrip by setting a long expiration time.
  - Two ways to do it:
    - Fingerprint on query param: Seems acceptable, probably easier to setup (when server starts, read file and compute fingerprint).
    - Fingerprint on file names: It’s what Rails does (but their reason seems to be based on an article from 2008 which may no longer be relevant, and they compare it to a naïve implementation in which the fingerprint is the file modification timestamp), harder to setup.
  - Consider that dependencies of dependencies don’t necessarily fingerprint (as far as I can tell, only bootstrap-icons does), so we’d have to use a module bundler to get this 100% right.
- Minify assets?
  - Right now we’re relying on gzip
  - Potential solutions
    - https://cssnano.co/ (based on PostCSS)
    - https://github.com/clean-css/clean-css (most popular)
    - https://github.com/parcel-bundler/parcel-css (seems faster, using Rust)
    - https://github.com/css/csso
- Check back on https://community.chocolatey.org/packages/nvm/1.1.9#discussion & https://community.chocolatey.org/packages/nvm.portable/1.1.9
  - If 1.1.9 hasn’t been released, add `--version=1.1.9` to installation instructions
- Use `` javascript(html`<script>...</script>`) `` instead of `` javascript`...` `` because it works with Prettier (and syntax highlighting, to some extent).
- `<script async>`
- “Demonstration Mode” didn’t work for me on Edge, on `try.courselore.org` (tried other browsers and on local machine an it worked (!)).
- Mark all conversations as read may be slow because it does a bunch of in `INSERT`s.
- Move some of the non-application-specific server-side code into a library (for example, cookie settings, server-sent events, logging, and that sort of thing).
  - Maybe move @leafac/express-async-handler into that library as well.
- Make Demonstration Data load faster by having a cache of pre-built data.
- On deploy to production maybe backup the database like we do in staging.
- Treat the error cases in every location where we do a `fetch`.
- `app.on("close")` stop workers.
  - Or maybe unref them to begin with?
- Graceful HTTP shutdown
  - Do we need that, or is our currently solution enough, given that Node.js seems to end keep-alive connections gracefully and we have no interest in keeping the Node.js process running?
    - I think we do need that, because we want to close the database, otherwise journal files are kept around, and we want to close the database strictly **after** the server closed, otherwise there could be requests in the middle that will throw because of a closed database connection.
    - But there’s more: the handler for `exit` has to be synchronous. So we can’t `await` on graceful termination.
    - One potential solution: Do the graceful termination on signals, but on `exit` just `server.close(); app.emit("close");`. This should be fine because in our case `exit` probably means an exception anyway.
  - https://github.com/gajus/http-terminator
    - https://www.npmtrends.com/@godaddy/terminus-vs-http-close-vs-http-shutdown-vs-http-terminator-vs-stoppable-vs-http-graceful-shutdown
- Test signal handling of shutdown process on Windows
- Handle errors on `fetch`. Right now we’ll just let the “loading” spinner run forever.
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
  - We’re doing pagination of conversations in sidebar using `OFFSET`, because the order and presence of conversations changes, so we can’t anchor a `WHERE` clause on the first/last conversation shown. Try and find a better approach. Maybe use window functions anchored on the `row_number`.
  - Try and optimize `html` tagged template literal, which sanitizes things over and over.
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
