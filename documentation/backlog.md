# Backlog

## Fall

- Notifications:
  - Email notification digests
  - Notifications API & Push API
  - Mobile & desktop applications
- Granular access control to conversations.
- Minimal integration with Learning Management Systems (identity, not grades).
- Performance:
  - Finish pagination, the measures that will reduce the size of HTML pages, and so forth
- Smaller things:
  - Lock a course for a period, for example, when a take-home exam is out.
  - Polls.
    - They’re a new type of message content, not something heavyweight like a new type of question. This follows the same lines as Discourse & Slack (where people use reactions (emojis) to do polls).
    - Support multiple answers.
    - Students may see aggregate results.
    - Staff may see individual votes.
    - Allow for closing a poll.
    - Perhaps don’t include poll in replies?
- Communicate that we’re in a free hosting period for now:

```javascript
            $${app.locals.options.host === app.locals.options.canonicalHost
              ? html`
                  <div
                    css="${res.locals.css(css`
                      color: var(--color--green--700);
                      background-color: var(--color--green--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--green--200);
                        background-color: var(--color--green--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);

                      .link {
                        color: var(--color--green--600);
                        &:hover,
                        &:focus-within {
                          color: var(--color--green--500);
                        }
                        &:active {
                          color: var(--color--green--700);
                        }
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--green--100);
                          &:hover,
                          &:focus-within {
                            color: var(--color--green--50);
                          }
                          &:active {
                            color: var(--color--green--200);
                          }
                        }
                      }
                    `)}"
                  >
                    <div
                      css="${res.locals.css(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-gift-fill"></i>
                    </div>
                    <p>
                      This is the hosted installation of Courselore managed by
                      the Courselore developers. Enjoy the initial period of
                      free hosting, during which you may create courses for
                      free! Courselore is
                      <a
                        href="https://github.com/courselore/courselore"
                        class="link"
                        >open source</a
                      >
                      and you may install it on your own server, an option that
                      will be free forever and guarantees maximum privacy &
                      control.
                    </p>
                  </div>
                `
              : html``}
```

**Roadmap**

- Review again other applications like Piazza so that we’re aware of features that people will probably ask us about.
- 20 users by fall, 200 by spring, paid by 2024, profit by 2026 (Only start charging when we have thousands of courses.)

## Spring

- SAML
  - Register our application with Hopkins to allow access to SAML.

## Administrative Interface

**Goals**

- List of people in the system
  - See what courses people are on
- List of courses in the system
  - Access the course
  - Have a quick way to archive a course directly from this list
- When an administrator is creating a course, ask them if they want to be staff, because perhaps they’re creating a course for someone else.
- Deal with the case in which you’re the administrator and also the staff/student on a course.
  - Switch in out of administrator role and see the course differently.

**Good to Have in the Future**

- Extract a partial for user in list of users (to be used in `/courses/___/settings/enrollments` & administrative interface list of users).
- Administrators can have further control over user accounts:
  - Create a password reset link (for people who forgot their password and can’t receive email with the registered address)
  - Enroll people in courses
  - Impersonate users & see the system just like the user sees it.
  - Remove a person from the system entirely
  - Manage sessions, for example, force a sign-out if it’s believed that an account is compromised
  - Perhaps even some more personal settings, for example, preferences related to email notifications
- Other ways to get administrators into the system:
  - Invitations for installation-wide roles
    - These would be similar to the invitations for a course. But email only, no invitation link.
  - Administrators may create users.
- Have some sort of visual indication of your own role in the system.
- Introduce the notion of “institution”
  - An institution may be a department, an university, and so forth.
  - For simplicity, institution can be the only layer of abstraction, let’s not model the relationship between departments, schools, universities, and so forth.
- Graph of use over time:
  - Number of users
  - Number of **active** courses (where an **active** course is a course that has seen recent activity, for example, a new conversation).
  - Activity on conversations
    - It’d be nice for the course staff to also have access to that
- Low-level information:
  - Machine statistics, for example, disk space
  - Notifications: Disk running out of space, load average above normal, and so forth
  - Run an update
  - Run a backup
  - Email server configuration & other things that currently live in configuration file
  - Have a wizard to set things up the first time: It’d have to be something like a command-line application, because without the basic information the server can’t even start.
  - Have a way to change configuration moving forward, by changing the configuration file and restarting the server (perhaps ask for confirmation and revert if necessary, similar to when you change the resolution of a display)
- Take a look at other nice features from Discourse’s administrative interface

## Better Email Notifications

- Don’t send notifications when the person is online and/or has seen the message.
- “Important staff announcements”
  - They have two consequences:
    - They send emails to everyone, because it isn’t possible to opt out of receiving them.
    - They send emails immediately, even to people who otherwise would receive digests.
  - Change New Conversation page.
    - When you select this option, check “Pin” in the form
  - Store this in conversation database table
  - Show these conversations differently on sidebar
- Email contents:

  - Subjects could include the fact that you were mentioned, to make it easier to set up filters.
    - Perhaps this could be more generalized and, like GitHub, include the reason why you were notified. (GitHub seems to do that with a custom header.)
  - Decorate:

    - Motivation:

      - Avoid showing things like `@john-doe--201231`.
      - Code blocks are duplicated:
        - Have Shiki generate classes instead of inline colors.
          - Possible with the `css-variables` theme, but “is less granular than most other supported VSCode themes”.
        - Have a processor to remove one of the versions of code block from the email.
      - Add first-class support for Dark Mode in emails? Or continue relying on automatic Dark Mode? And, in general, style our emails more?

        ```html
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />

        <style type="text/css">
          :root {
              color-scheme: light dark;
              supported-color-schemes: light dark;
          }
        </style>

        <style>
          /* Normal styles */
          @media (prefers-color-scheme: dark) {
            /* Dark mode styles */
          }
        </style>

        <style>
          .dark {
            display: none !important;
          }
          @media (prefers-color-scheme: dark) {
            .light {
              display: none !important;
            }
            .dark {
              display: block !important;
            }
          }
        </style>
        ```

  - Mathematics are rendered incorrectly.

---

**Good to Have**

- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
    - Email notifications should include:
      - Link to one-click unsubscription in message body.
      - `List-*` headers to allow one-click unsubscription.

## User Interface Improvements

**Top Menus**

- Use hamburger menu instead of a couple separate menus
  - It shouldn’t cover the whole page underneath (and shouldn’t push an entry into the history, naturally)

**Conversations List on Sidebar**

- Group conversations (similar to Piazza & Campuswire).
  - Date
  - Pinned
  - Tags
  - Type
- Separate the conversations in sections: One section for conversations with unread messages.
- Conversations are sorted by most recent activity, but that means when you send a message, the conversation moves to the top, which can be disorienting.
  - Wait for a little while, 10~30 minutes, before sorting.
- Make the distinction between the types more prominent. Separate questions from chats in the list of conversations, for example.
  - Change the visualization of “types” a little more, for example, make announcements pop up.
  - Improve display of endorsements & answers (on the sidebar, include number of answers).
  - Manage answer badges more intelligently (answered at all, answered by staff).
- Conversations that are pinned & read may be collapsed after some time, but pinned & unread must be shown prominently.

**Messages**

- Higher contrast between background and text?
- Blockquotes (replies) should have a faint background color to help differentiate them.
- Collapse long blockquotes
- Add more options to the hover menu (besides the ellipses), similar to Slack & Discord.
- Bigger font (15pt).
- Wider columns
- Include a “set as answer and endorse” button.
- Show a widget similar to the Views (with person & time) to likes & endorsements.
- Don’t show show endorsements for non-answers. (They show up at least for staff.)

**Chat**

- More space between messages and less space between paragraphs
- Move the avatar to the side, giving a clearer indication of where a message ends and another one starts
- “Truncate” long messages.
- Scroll to the bottom when sending chat message regardless of your scroll position?
- Add a button to “Return to Bottom” when chat is scrolled up.
- Images may break the scrolling to the bottom on chats.
- If the textarea is autosizing, then the main messages pane scrolls up.

**Content Editor**

- Clarify that “Programmer Mode” is for your input only. Unlike other buttons on the toolbar, it doesn’t affect the rendered text.
- When editing, and trying to send empty message, propose to delete (like Discord does).
- When pressing up on an empty chat box, start editing the your most recently sent message (if it’s still the most recently sent message in the conversation) (like Discord does).
- When you’re typing, there’s a weird scrollbar glitch: it shows up for a split second and hides back again. I observed this in Meta Courselore using Safari. Perhaps consider using other approaches to autosizing?
  - https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
  - https://github.com/fregante/fit-textarea **Use v2**.

**New Conversation**

- Keep all the material that is there, but present it differently to try and make the page cleaner.
- Collapse tags (similar to what we do in the conversation page itself, and to what Reddit does).
  - Change the widget that’s a tag: Instead of `icon text`, make the text look like it’s inside a tag.
- Use different background colors, similar to Piazza.

**Live-Navigation**

- On form submissions, for example, when you create an invitation, highlight the part of the page that changed (use the same yellow we use for permanent links to messages).

**Live-Updates**

- Avatar image on avatar tooltip flickers
- Scrolling goes up on mobile when the page is big and you’re scrolled all the way to the bottom, interacting with the content editor

**Other**

- When an SVG is uploaded & resized (either as an avatar or as attachment on a message) its type changes to PNG, but we’re producing the wrong filename, ending in `.svg`.
- Add the number of unread messages to the `<title>`.
  - Or change the favicon.
- Detect old or otherwise unsupported browsers and alert, asking the user to update.
- Make breadcrumbs (for example, under “User Settings”) clickable (they should expose the navigation menu, just like what happens in Visual Studio Code).
- The anonymity button isn’t as clear as it should be.
- The “Manage Tags” on “New Conversation” could happen inline, instead of taking you to course settings.

## Quality-of-Life Features

- Drafts:
  - Unhide buttons
    - Perhaps don’t have them styled as links…
  - Review database schema:
    - Include `shouldNotify`.
    - Include indices.
    - Include search indices, because search should work over the content of drafts.
  - Mix drafts with other conversations on sidebar.
    - `TODO`
    - Group them together
    - Visually distinct (grayed out).
    - Search.
    - Filters.
  - Adapt `partials.conversation` to support drafts (many fields become optional).
  - Add a button to delete a draft directly from the sidebar.

---

- Have a simple way to share “conversation templates,” which use the query parameters to pre-fill the “New Conversation” form.

---

- Do `localStorage` on the server:
  - It’ll work across devices, which is a “pleasant surprise.”
  - It allows for features such as “currently typing.”

---

- Add the notion of follow-up question, so that questions aren’t marked as “unresolved” as soon as a student sends a message. It makes sense for when the student just says “thanks.”
- Let staff endorse other staff answers.
- Add the notion of “staff considers this a good question.” Similar to the notion of “endorsement,” but for questions.
- Change the meaning of “views”: Instead of using “readings”, only count as “viewed” if the message has appeared on the person’s screen.
  - Tracking pixel on email for people who will read the notification on their email and just “mark as read” on Courselore?
- Introduce the notion of locking a conversation.
- Introduce the notion of promoting a message into its own conversation (one example use case is when someone asks a question as a follow-up to an announcement).

---

- Investigate browser crashes on Android Chrome

## Notifications

- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).
- Add different notification badges for when you’re @mentioned.
  - On badges on sidebar indicating that a conversation includes unread messages
  - On badges on course list
- A timeline-like list of unread messages and other things that require your attention.
- Snooze.
- Don’t require user to be logged in to unsubscribe from notifications?
- Add option to receive email notifications for your own messages.
- Allow replying to a message by replying to the email notification
  - Obfuscate email addresses in the message (like GitHub does).
- Other channels: Use the browser Notifications API & Push API; Desktop & phone applications.

```javascript
Notification.requestPermission();
Notification.permission;
new Notification('Example');

<button
  class="button button--transparent"
  onload="${javascript`
    this.onclick = async () => {
      if (await Notification.requestPermission() === "denied") return;
      new Notification("Example");
    };
  `}"
>
  <i class="bi bi-bell"></i>
  Send Notification
</button>
```

## Conversation Participants

- Conversation partial should have a dropdown to show selected participants (similar to “Views”, except that you’d long-hover over it, like user tooltip).
- Client-side filters like **Course Settings > Enrollments**, **Administration > Users**, Conversation Participants, and so forth:
  - Extract and DRY.
  - Treat more elegantly the case in which the filter removed all entries.
- More elegant treatment of edge cases:
  - You’re the only staff member
  - You’re the only enrollment
  - There are no students
- When changing from “Everybody” to “Staff” or “Selected People”, pre-select people who are part of the conversation.
- Consider removing selected participants from `getConversation()` as it’s probably expensive to retrieve and isn’t always necessary.
- 1-to-1 conversation
  - Use background color to distinguish between people, so you don’t have to show their names over and over.
- Staff may allow or disallow people to have private conversations in which staff don’t participate (the default is to allow)
- Whispers:
  - Similar to Discourse
  - Staff-only messages
  - Disclosure button to show/hide all whispers
    - On load, it’s showing
    - On new whisper, show again
    - The point is: Don’t let people miss whispers
  - There’s no way to convert back and fort between regular messages & whispers. If necessary, delete and send another message.
  - Style differences to highlight whispers: font (italics vs regular), font color, and a little icon. Do several such things. Perhaps don’t change the background color. It might be good to make it a little more obvious, e.g. label it as a "staff-only whisper, students cannot see this". Otherwise some new staff may not know what is going on.
- Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
  - Some groups are available only to students, while others only to staff.
  - People assign themselves to groups.
  - Add mentions like `@group-3`.

## Deleting Entities

- Users
- Courses
- Enrollments even if you’re the last staff

---

- Require password
  - Extract middleware
  - Use middleware in
    - Change email
    - Change password

## Users

- Improvements to the workflow for when you change your email:
  - The verification email has a subject of “Welcome to Courselore!”. It should be “Please verify your email”.
  - Don’t actually change the email until it’s verified. Otherwise an attacker with a compromised password could change your email and lock you out of the “Forgot your password?” flow.
- Online indicators.
  - Turn them on when someone who was offline becomes online.
  - Don’t turn them off if person continues to be online.
  - Fade in and out.
- Allow person to have multiple emails on their account.
- Allow people to remove their accounts.
- Authentication:
  - SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).
  - 2-Factor Authentication.
  - Look into SIS to get a list of courses
- Give visual indication on dragging-and-dropping avatar on `/settings/profile`.
- Extra fields:
  - Pronoun.
  - A short audio with the name’s pronunciation.

## Courses

- Course archival: Currently, when a course is archived, we continue to show all the forms and return an error message after submission. It’d be more elegant to disable the forms and inform the user before they try to submit. But this requires revisiting almost every form, input, and button in the application.
- Remove course entirely.
- Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Control who’s able to create courses, which makes sense for people who self-host.
- Upload roster and show differences.

## Invitations

- Simplify the system by having a single invitation link per course role that you can enable/disable/reset.
- Limit invitation links to certain email domains, for example, “this link may only be used by people whose emails end with `@jhu.edu`.”
- Have an option to require approval of enrollment.
- Have a public listing of courses in the system and allow people to request to join.
- When the user signs up via an invitation, have a call to action to fill in profile (just like the one when you sign up without an invitation).

## Conversations

- Streamline the creation of DMs.
- Highlights (similar to Slack’s pins, but we’re avoiding the word “pin” because it already means “pinned conversations”). The highlights are visible to everyone in the conversation.
- Bookmarks / flags / saved items. These are personal, for example, for something you have to follow up on.
- More sophisticated tag system: dependencies between tags, actions triggered by tags, and so forth.
- Modify the order of tags.
- Assign questions to CAs.
- `position: sticky` headers (showing author name) in messages?
- Different states: Open vs archived.
- “Mark all conversations as read” could work with search & filters, marking as read only the conversations that matched the search & filters.
- Conversation templates, for example, for bug reports on Meta Courselore.
- Let original question asker approve an answer.

## Chat

- Currently typing.
- Show accent colors for different people (for example, faint background colors), to help identify messages.
- Nested replies (similar to Slack’s threads).

## Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

## Search

- Search should display multiple messages in the same conversation. (Right now it’s only showing the highest ranked message and grouping by conversation.)
- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filter by date.
- `@mentions` are awkward in search results, because they take in account the original `@<enrollment-reference>--<name-slug>` instead of the rendered person’s name.

## Content Editor

- On new conversation page, maybe adapt the `@mentions` widget according to the visibility that’s currently set.
- Have the `@mention` widget list people who aren’t in the conversation (suitably marked as so) (similar to Twitter DMs).
- When you select multiple lines and click on the list options, turn each line into a list item.
- Add more placeholders to things like tables to help explain how to use them.
- Answer templates.
- Paste tables from Excel and have them formatted as Markdown tables.
- Add https://github.com/fregante/indent-textarea or CodeMirror in programmer mode.
  - Issue with indent-textarea is that it only supports tabs, not spaces https://github.com/fregante/indent-textarea/issues/21
  - CodeMirror is heavy-handed
- If you’re in the middle of editing, and someone else edits a message (or the conversation title), then you’re going to overwrite their changes. Warn about this.
- Dragging an image from another website and dropping it in the content editor results in a 422.
- Dragging a folder from Finder makes the request fail without even an error code(!)
- In programmer mode, change the behavior of when the `@mentions` and `#references` widgets appear and go away, particularly in code & mathematics blocks.

## Content Processor

- Add a notion of “reply” that’s a first-class citizen, like Discord and unlike GitHub.
- Lists of links are block but should be inline (look for “You can reach Michael at” in example text).
- On the `partials.content()`, maybe don’t render `@mention` widget for people who aren’t in the conversation, given that we don’t give that person as option on the `@mentions` autocomplete widget in the content editor.
- It’s possible to send messages that are visually empty, for example, `<!-- -->`
- Syntax highlighter only works on top-level elements (https://github.com/leafac/rehype-shiki/issues/5)
- `#references` into the same conversation don’t need to load the whole `partials.conversation()`, just the message part of it.
- Add support for underline in Markdown.
- The “quote” button on code blocks is showing up in the wrong place.
- `.katex` is overflowing in the `y` axis unnecessarily. (See, for example, the example we give on the home page.)
- Reference on more features ideas: <https://github.com/gjtorikian/html-pipeline>
- Polls.
- Lightbox modal:
  - Resized images
    - Animated GIFs should just play.
  - Code blocks
    - Just truncate and have a “click for more” kind of button
    - Do a proper lightbox modal in full screen
    - Give option to wrap or not long lines
  - Block quotes (especially replies)
- Convert animated GIFs into other data formats that would be lighter.
- Add support for videos: Sanitization, dimensions, and so forth.
- Install extensions for Shiki, for example, for OCaml.
- Mermaid: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
- Once the chats have been redesigned with avatars on the margin to better establish a hierarchy and delimit messages, consider bringing back the full `partials.user()` widget to `@mentions`, with avatar and everything. (I think this will look good, but it’s a controversial point, given that people were very insistent on removing avatars from that context.)
- Sanitize allowlist of attributes to prevent abuse (for example, `<code class="some-class-that-exists-in-the-system">`)

## Pagination

- `TODO`
- Pagination of non-chat conversations should behave like GitHub Issues: Show the first couple messages, and the last couple messages, and have a gap in the middle that you can click to load.
- Smarter default page for when the page isn’t specified explicitly:
  - Messages
    - Deep links should go to the page containing the referred message
    - If there is no deep link but there are unread messages, go to page containing the first unread message
  - Conversations
    - Page containing the currently open conversation
- Load pages on scroll instead of button
- Deal with delete messages/conversations at the edges (before and after)
  - `CAST("reference" AS INTEGER) >= CAST(${req.query.beforeMessageReference} AS INTEGER)`
    - Create indices for `CAST("reference" AS INTEGER)` or convert `"reference"` into number (and then create an index for that!).
- On sending message on non-chat, it’s scrolling back to the first page.
- The “mark as read” button doesn’t work because it doesn’t visit all pages.
- Edge case: Show next/previous page on “no more messages”.
  - This is an edge case because people should only be able to get there when they manipulate the URL (or because they’re loading the next page right when an item has been deleted)
  - Difficult because we don’t have a “before” or “after” message to anchor to.
- Paginate other things, for example, Course Settings · Enrollments, and invitations.
- Things like clearing search and filters may affect query parameters.

## File Management

- Have a way to delete files.
- Access control around attachments:
  - Possibilities:
    1. Anyone with a link may see the attachment.
    2. Only people who are logged in may see the attachment.
    3. Only people in the same course may see the attachment.
    4. Only people with access to the particular conversation may see the attachment.
  - Right now we’re implementing 1, but we may want to go more strict if FERPA requires it or if someone asks for it.
  - The advantage of 1 is that at some point we may want to link directly to something like S3, so we don’t have to proxy the file ourselves.
  - The disadvantage of something like 3 or 4 is that a person can’t copy and paste messages across courses (think of a PDF with course rules being sent at the beginning of a semester).
- Let people configure other storage engines (for example, S3).
- Create a garbage collection routine for attachments.
- Clean geolocation & other metadata from images.

## Statistics

- A way to grade interactions on conversations, for example, for when the homework is to discuss a certain topic. (It seems that Canvas has this feature.)
- Gamification
  - Badges (for example, first to answer a question)
  - Karma points for whole class and unlock achievements for everyone
- How many questions & how fast they were answered.
- Student engagement for courses in which participation is graded.

## Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

## Native Mobile & Desktop Applications

- `NODE_EXTRA_CA_CERTS=".../Application Support/Caddy/pki/authorities/local/root.crt"`
- PWA: https://checkvist.com/auth/mobile
- Desktop: Electron.

```javascript
{
  "scripts": {
    "start": "electron ./index.js"
  },
  "devDependencies": {
    "electron": "^18.1.0"
  }
}

const { app, BrowserWindow } = require("electron");

(async () => {
  await app.whenReady();

  let browserWindow;
  const createBrowserWindow = () => {
    browserWindow = new BrowserWindow({
      width: 800,
      height: 600,
    });
    browserWindow.loadURL("https://leafac.local");
  };
  createBrowserWindow();

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createBrowserWindow();
  });

  app.setBadgeCount(3);
})();
```

- There’s also https://github.com/nativefier/nativefier, but it’s “minimally maintained,” and it may not have the features necessary to do things like badges.

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

## API

- Enable us to connect with other applications, for example, assignment management, and course material.
  - Though we won’t necessarily be going to those areas right away.
  - Integration is part of our short-term strategy.
- To build extensions, for example, ask a question from within the text editor.
- Integrate with other platforms, for example, LMSs.
  - Learning Tools Interoperability (LTI).
    - Or perhaps not—do something more lightweight if LTI is too bureaucratic.
    - Purposes of LTI:
      - Identity management (for example, correlate a student in Courselore with a student in Blackboard).
      - Submitting grades (for example, if discussing a topic in Courselore is part of an assignment, add that grade to the gradebook in Blackboard).

## User Interface

- Forms:
  - Use `maxlength`.
  - Keep the buttons disabled while the form isn’t in a valid state.
  - Use date pickers:
    - https://github.com/jcgertig/date-input-polyfill
    - https://github.com/Pikaday/Pikaday

---

- Do something to prevent flash of unstyled content on scrolling. It’s mostly an issue when loading a deeply-linked conversation for the first time, because otherwise live-navigation takes care of the issue.

---

- Prevent the flash of unformatted datetime on fields using `validateLocalizedDateTime()`.
  - I tried to just reset all elements to the `valueInputByUser` at the end (which, incidentally, requires `window.setTimeout()` to not reset the value before the form data is actually sent to the server), but it doesn’t work. It seems like the only solution is to use an auxiliary `<input type="hidden">` that’s actually sent and an `<input type="text">` that drives it to show to the user.
- Tooltip showing the views for a message:
  - The counter is sometimes lagging behind the actual count, because we don’t send refresh events on every GET everyone ever does (’cause **that** would be silly 😛)
    - Another consequence of not sending refresh events on every GET is that the number of unread messages on the sidebar becomes inconsistent when you have multiple tabs open and you read messages on one of them (the rest still show the unread indicator).
  - It should live-update. (Or the cached content of the tooltip should be expired somehow.)
- Have some kind of in-app guide for the first time you enter the system, or the first time you create a course, and that sort of thing. This should complement the videos.
- Checkboxes that don’t have a visual indication may be confusing.
- Right click menus on stuff?
  - For example, something like the “Actions” menu under the ellipses on messages.
  - But they can frustrate people who just want to interact with the browser right-click context menu.
- Places where we show `administratorEmail` to report bugs could be forms instead.
- Maybe updating the accent color should send a live-update to tabs by the same user.
- The loading spinner keeps running forever in iOS because of streaming `fetch()`es.
  - Different MIME Content-Types didn’t help.
  - It appears that that icon only means “network activity is happening,” in which case, it’s true, and it’s actually the desired behavior.
- In Safari iOS, the address bar never collapses because of the way we’re doing panes.
- Add `-fill` to journal icons: https://github.com/twbs/icons/issues/1322
- On `/settings/enrollments`, in iOS, if you filter, then manually backspace to remove the filter, then the little icon on the left jumps out of place(!)

---

- Scrollbars:
  - https://css-tricks.com/almanac/properties/s/scrollbar/
  - https://css-tricks.com/the-current-state-of-styling-scrollbars-in-css/
  - https://www.digitalocean.com/community/tutorials/css-scrollbars

## Design & Accessibility

- Translate to other languages.
- Add a toggle to switch between light mode and dark mode, regardless of your operating system setting? I don’t like this idea, but lots of people do it. Investigate…
- Test screen readers.
- Test contrast.

## Live-Navigation

- Client-side cache?
  - Advantages:
    - It’ll potentially be a bit faster.
  - Disadvantages:
    - It complicates the implementation.
    - It uses more memory on the client side.
  - Make sure to clear cache on sign-out or the back button will reveal private information.
- The submission of a form resets the state of the rest of the page.
  - For example, start editing the title of a conversation, then click on “Pin”. The editing form will go away.
    - Another example: When performing any simple form submission, for example, “Like”, the “NEW” message separator goes away. But maybe that’s a good thing: Once you interacted with the page, you probably already read the new messages, so it maybe it’s better for that separator to go away.
  - The first step would be keep the `hidden` state on form submission, but then other things break, for example, if you’re actually submitting a conversation title update, then the form should be hidden. As far as I can tell, there’s no way to detect what should be hidden and what should be shown automatically: We’d have to write special cases. For example, on the `onsubmit` of the conversation title update, we could add actions to reset the hidden state of the involved components.
  - Then, on `morph()`, we must look at the `originalEvent` and avoid updating form fields that aren’t the submitted form. This part is actually relatively straightforward: `detail.originalEvent instanceof SubmitEvent && detail.originalEvent.target.contains(from)`
- In response to a `POST`, don’t redirect, but render the page right away, saving one round trip. This is similar to the Turbo Streams approach, in which a stream is sent as a response to the `POST`.
- More sophisticated latency compensation:
  - Only for critical flows, for example, sending a message or liking.
  - Right now we’re doing a placeholder.
  - Approaches:
    - Pre-render on the client.
      - That’s what Discord appears to do.
      - But it’s limited because we don’t have enough information to do a full rendering, for example, resolving `@mention`s and `#reference`s. Those cases can be relatively rare, but still…
    - Use the `/preview` route?
      - This doesn’t seem like a good approach. On the one hand, it’d render the message more accurately. But it would incur a roundtrip to the server, so might as well do the action in the first place.
      - But we could pre-fetch…
- Preserve more client-side state, for example:
  - On the list of enrollments (or list of users in administrative panel while it’s still naively implemented as a filter on the client side) the filter resets on form submission (for example, changing a person’s role).
  - In chats, submitting a form collapses the `conversation--header--full`.
- Scroll to URL `#hashes`, which may occur in the middle of a message.
- On main conversation page, when using a link like `#23/4` that’s a reference to another message in the conversation you’re in (say you’re conversation `#23` in this example), then there’s a weird scrolling glitch for a split second.

## Live-Updates

- Scroll to `#anchored` element.
- We’re leaking CSS. Maybe instead of just appending `local-css`, do some form of diffing, which only inserts and doesn’t delete (we want to keep the previous CSS because we may be preventing the deletion of some HTML, for example, the “NEW” separator).
  - Note that modifying the `textContent` of a `<style>` tag has immediate effect—the browser applies the new styles.
  - I ran live-updates every second for an hour, on mobile, and held itself okay, despite the leak of CSS. So maybe isn’t the biggest issue.
- Live-updates can freeze the user interface for a split second, as the morphing is happening.
  - Examples of issues:
    - Typing on an inbox lags.
    - Pressing buttons such as the “Conversations” disclosure button on mobile.
  - Potential solutions:
    - Break the work up by introducing some `await`s, which hopefully would give the event loop an opportunity to process user interactions.
    - Minimize the work on the client-side by making the pages small, so there’s less to diff.
    - Minimize the work on the client-side by sending only the diffs.
    - Throttle live-updates so that they can’t be super-frequent.
- Be more selective about who receives a live-update:
  - Right now everyone on the course receives a live-update for every action on the course.
  - Check conversation id and only send updates to relevant connections.
    - It gets a bit tricky, because some conversation modifications affect the sidebar, which should be updated for every tab with the course open.
  - When we have pagination, take it a step further and only live update tabs with the affected message open.
- Do something special on 404.
  - For example, when we have a tab open with a conversation and someone else deletes it.
  - Right now we just show the 404 to the person, without much context, which can be confusing.
  - One possible solution is to look at the `Live-Updates` header on the `GET` and set a flash.
- Morphing on the server: Don’t send the whole page, only a diff to be applied on the client
- Update tooltip content by morphing, instead of simply replacing, to preserve state:
  - Scrolling
  - In chats, the “Views” component in the “Actions” menu closes on live update.
- Re-fetch partials in the background after a live update? They may have gotten stale, for example, the “Views” component, if it’s open right as a live update is happening.
- Maybe don’t disconnect/reconnect the live-updates connection when a live-navigation will just return you to the same page?
  - It only saves the creation of connection information on the database on the server and the cost of establishing the connection.
  - A `POST` will already cause an update to the information on the page.
  - The implementation gets a bit awkward. The trick is to introduce the URL to the identity of the connection on top of the token which already identifies it. The token becomes the identity of the browser tab, and the URL becomes its state. If you put the two together, you can disconnect/reconnect only when necessary. But there are plenty of edge cases to deal with, for example, a live-update coming in right in the middle of a `POST` live-navigation.
- Currently, if a connection comes in with a token we don’t identify, we treat that as a browser tab that was offline for a while and just reconnected, which means it receives a live-update right away. This can be superfluous if no change actually took place. This may be a minor issue—or not an issue at all. And addressing it probably complicates the live-updates mechanisms quite a bit. But, in any case, one potential solution is, instead of keeping tokens on the server and scheduling events to them, keep a notion of when things were updated, this way upon reconnection the client can say when it was the last time it got a live-update, and the server can know if another live-update is necessary.

## Performance

- Lazy loading & DRYing to reduce HTML payload
  - `userPartial` tooltip
  - `conversationPartial` tooltip on decorated content
  - Edit message forms.
    - Use `data-content-source` that’s already used by the quoting mechanism.
    - Implement a more proper solution than the current use of `autosize.update()`
  - Content processor should only attach position information that we’ll actually use.
    - This also allows us to simplify the code that uses the position information, because we don’t have to discard positions from inner elements.

---

- View caching on the server.
  - https://guides.rubyonrails.org/caching_with_rails.html
  - This would interact in some way with server-side diffing on live-updates
  - Elm seems to do something similar

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

- Write a function to determine if processing content is even necessary. Most content doesn’t use extra features and could skip JSDOM entirely.

---

- Investigate other potential bottlenecks:
  - Synchronous stuff that could be async.

---

- Framing?
  - Sidebar vs main content
    - On mobile may not need to load the sidebar at all
  - Pagination links.
    - Conversations in sidebar.
    - Messages in conversation.
  - Filters.

---

- Database:
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

---

- Try and optimize `html` tagged template literal, which sanitizes things over and over.

## Infrastructure

- `filenamify` may generate long names in pathological cases in which the extension is long.
- Things like `text--sky` and `mortarboard` are repeated throughout the application. DRY these up.
- Windows development:
  - `global.css` is regenerated (probably because of line endings)
  - `Ctrl+C` leaves the Caddy process behind, failing subsequent runs because the port is taken
- Exclude `assets/` folder from build?
- Sign-out is slow for some reason 🤷
- When we start receiving code contributions, we might want to ask for people to sign a contributor’s agreement, because otherwise we locking ourselves out of the possibility of dual-licensing & perhaps selling closed-source extensions.
- When a new version is deployed, force browsers to reload, which may be necessary for new assets (CSS, JavaScript, and so forth) to be picked up.
- Mounting the application on a subpath, for example, `https://leafac.local/a/b/c` doesn’t work.
  - The Express server seems to not match the routes for things like `https://leafac.local/a/b/c/sign-in`.
- Do things break if you’re trying to run Courselore from a folder that includes spaces & weird characters?
  - Note Caddy’s configuration and the serving of static files.
  - Test development.
  - Test binary.
  - Test on Windows.
- Cluster mode:
  - Right now we’re running with a single process, which doesn’t take advantage of all CPU cores.
  - Approaches:
    - Spawn separate Node.js processes and use Caddy to reverse proxy between them:
      - Caddy may do a better job at load balancing.
      - In theory the processes wouldn’t even have to be on the same machine. In practice, we’re using SQLite, so we probably want to stick to a single machine, otherwise we run into issues with networked file systems.
    - Use Node.js’s `cluster` module:
      - There may be chance of sharing things like live-updates destinations, simplifying the messaging between an event changing the database and the listeners interested in those events.
      - We’re probably painting ourselves in the corner even more in terms of scalability, given that all cluster processes are on a single machine.
- Review all uses of `fetch()`:
  - Treat the error cases
  - Have timeouts, because there may be no feedback if the internet goes down in the middle of an operation, and the connection may be left hanging, and we’ll be `await`ing forever.
    - But maybe this only applies to event-stream type of requests, and we have them covered already. Maybe for regular kinds of requests this would be overkill…
- Autosize is leaking resources because of the global `Map` of bound textareas. It should be using `WeakMap` instead.
  - Look into using `fit-textarea@2.0.0` instead.
- Add missing `key`s:
  - `class=`
  - `querySelector`
  - `map(`
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
- Use `` javascript(html`<script>...</script>`) `` instead of `` javascript`...` `` because it works with Prettier (and syntax highlighting, to some extent)?
- `<script async>`?
- Mark all conversations as read may be slow because it does a bunch of in `INSERT`s.
- Move some of the non-application-specific server-side code into a library (for example, cookie settings, server-sent events, logging, and that sort of thing).
  - Maybe move @leafac/express-async-handler into that library as well.
  - The runner in `binary.ts`
  - Some common things from `configuration/*.mjs`.
- Make Demonstration Data load faster by having a cache of pre-built data.
- On deploy to production maybe backup the database like we do in staging.
- `app.on("close")` stop workers.
  - Or maybe unref them to begin with?
- Test signal handling of shutdown process on Windows
- Using `getConversation()` to enforce permissions may not be a great idea. It limits the number of search results in a weird way, that even leaks a bit of data. Also, it isn’t the most performant thing, probably (see point about n+1 queries). Maybe a better idea would be to `WHERE` the permissions everywhere, or use a database view.
- Rate limiting.
- Database transactions:
  - Automatic: One transaction per request
    - We shouldn’t keep the transaction open across ticks of the event loop, which entails that it would only work for request handlers that are synchronous.
    - When to commit the transaction:
      - Listen to the `res.once("finish", () => {...})` event. But I think that this goes across ticks of the event loop.
      - Maybe just call `next()` and then look at the `res.statusCode`?
      - Or maybe overwrite `res.send()` and `res.redirect()`, like we do for logging.
  - Manual: Probably the only sensible approach, given the constraint above related to asynchronous handlers
- Look into using `db.pragma("synchronous = NORMAL");` to improve performance. (<https://github.com/WiseLibs/better-sqlite3/issues/334>)
- Auto-updater.
- Backups.
  - For us, as system administrators.
  - For users, who may want to migrate data from a hosted version to another.
    - Rewrite URLs in messages.
- In some situations, we’re unnecessarily updating the boolean fields in the database that are represented as dates. For example, `"tags"."staffOnlyAt"` on `PUT /courses/:courseReference/settings/tags`.
- Live updates with Server-Sent Events currently depend on the fact that we’re running in a single process. Use a message broker like ZeroMQ to support multiple processes.
- Right now we’re allowing any other website to embed images. If we detect abuse, add an allowlist.
- Caddy could silence logs **after** a successful startup.
- Live-navigation usability issue: When there are multiple forms on the page, and you partially fill both of them, submitting one will lose inputs on the other.
  - For example, when you’re filling in the “Start a New Conversation” form, and you do a search on the sidebar.

---

- Have a way for Localtunnel to work again.
- Right now it doesn’t work because we serve via HTTPS, and `--local-https true` requires `--local-cert` and `--local-key`, but those are only created by Caddy after we have the URL. It’s a chicken and egg situation.

````markdown
<details>

<summary>Option 3: Using <a href="https://localtunnel.me">Localtunnel</a></summary>

1. Install & run Localtunnel following the instructions on the website.

2. Run Courselore with the Localtunnel address, for example:

   ```console
   $ env HOST=THE-LOCAL-TUNNEL-ADDRESS npm start
   ```
````

> **Note:** The address must start with `https`, not `http`. Courselore runs with HTTPS—not HTTP—in development to reduce confusion around some browser features that work differently under HTTPS.

3. Visit the Localtunnel address on the phone.

</details>
```

- Also SSH tunneling hasn’t been tested since the latest changes in Caddy infrastructure, so it probably doesn’t work either:

````markdown
<details>

<summary>Option 2: Using an SSH Tunnel through a Server That You Have Access to</summary>

1. Follow the instructions from Option 1 to transfer a certificate to the phone.

2. On the server that you have access to, open an SSH tunnel, for example, on Ubuntu:

   - Modify `/etc/ssh/sshd_config` to include `GatewayPorts yes`.
   - Run `ssh -NR 0.0.0.0:4001:localhost:4000 root@YOUR-SERVER.COM` and leave the terminal session open.

3. Run Courselore with the server’s address, for example:

   ```console
   $ env HOST=YOUR-SERVER.COM:4000 npm start
   ```
````

4. Connect to the tunnel from your machine, for example:

   ```console
   ssh -NR 4001:localhost:4000 root@YOUR-SERVER.COM
   ```

5. Visit the server’s address on the phone.

</details>
```

- And here’s the disclosure element for the first option, for when we get other options back:

```markdown
<details>

<summary>Option 1: Using the Local Area Network (Preferred)</summary>

</details>
```

---

- Image proxy
  - Allowlist of response headers
    - Content-type allowlist https://github.com/atmos/camo/blob/master/mime-types.json
    - Use Got hook
    - Use Transform in pipeline
  - Approaches
    - Question about current approach: https://github.com/sindresorhus/got/issues/2060
    - Alternative approach that doesn’t work: Using Caddy. That would be nice because it would reduce the load on the application. But it could be limiting moving forward because it’d be more difficult to do HMAC, and so forth. But none of this matters, Caddy doesn’t seem to support proxying to arbitrary upstreams.
    - Alternative approach: Use a standalone image proxy & fire it up behind Caddy, alongside the main application.
    - Alternative approach: `await` on headers & only pipe the body?
      - `res.set(msg.headers);`
      - https://github.com/sindresorhus/got/commit/83bc44c536f0c0ffb743e20e04bf569c51fa5d69
  - Tests:
    ```
    http://127.0.0.1:8000 {
      header REMOVE-ME PLEASE
      file_server
    }
    curl -vs "https://leafac.local/content/image-proxy?url=http://127.0.0.1:8000/image.png" > /dev/null
    curl -vs "https://leafac.local/content/image-proxy?url=https://httpbin.org/status/999" > /dev/null
    curl -vs "https://leafac.local/content/image-proxy?url=http://alskdfjqlweprjlsf.com" > /dev/null
    curl -vs "https://leafac.local/content/image-proxy?url=https://httpbin.org/image" > /dev/null
    curl -vs "https://leafac.local/content/image-proxy?url=http://httpbin.org/image" > /dev/null
    curl -vs "https://leafac.local/content/image-proxy?url=http://pudim.com.br/pudim.jpg" > /dev/null
    ```
  - Good-to-have
    - Max size 5242880
    - Max number of redirects 4
    - Timeout 10s
    - Resizing
    - Caching: Not only for performance, but also because third-party images may go away
    - Include HMAC
      - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.
    - Allow hotlinking from our proxy? This has implications on the decision to not use HMAC on the proxy, and also has implications on rendering hotlinked images on third-party websites, for example, the Outlook email client, as soon as we start sending email notifications with fully processed content (right now we send the pre-processed content, but we want to change that so that things like `@mentions` show up more properly.)
      - This is necessary to 100% guarantee that people will be able to see images on Outlook
    - Don’t decompress-recompress, but just forward the compressed payload
  - References:
    - Original: https://github.com/atmos/camo
    - Commercial: https://github.com/imgproxy/imgproxy
    - Open-Source in Go: https://github.com/willnorris/imageproxy
    - Node.js basic functionality: https://github.com/http-party/node-http-proxy
    - Node.js middleware (depends on `node-http-proxy`): https://github.com/chimurai/http-proxy-middleware
    - https://github.com/cookpad/ecamo
    - https://github.com/weserv/images
    - https://github.com/jpmckinney/image-proxy
    - https://github.com/sdepold/node-imageable
    - https://github.com/marcjacobs1021/node-image-proxy

---

- Automated tests:

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
          content: ``,
        },
      })
    ).body
  ).toMatchInlineSnapshot();
});
```

</details>

## Documentation

- Videos
  - Educators:
    - Short “sales pitch”
    - Tutorial
  - Students:
    - Tutorial
  - Lower priority: We’ll do this in the future and rely solely on the text-based instructions for now:
    - System administrators:
      - How to deploy, backup, and update
    - Developers:
      - How to setup for development.
- “One-click deployment”
  - DigitalOcean.
  - Linode.
  - Amazon.
  - Google Cloud.
  - Microsoft Azure.
  - https://sandstorm.io.

## Marketing

- Invest more in marketing on spring.
  - Buy keywords on Google.
- Homepage:
  - Better printscreens without `lorem ipsum`.
  - Example of design that we like: https://capacitorjs.com
  - At some point hire a designer to make it shinier
  - Courselore vs Piazza, Campuswire, edstem, and so forth, comparison chart.
    - Make sure to mention that we’re open-source.
    - Piazza has LTI support (for identity only?).
- User groups.
- Newsletter.
  - For system administrators, including updates & so forth.
  - For educators, including news & so forth.
  - For students?
- Create Courselore Gravatar.
  - Use in npm.
- Create accounts on:
  - Facebook.
  - Instagram.
  - Reddit.
- Make a public page listing known issues.
- Add a call-to-action on the bottom navigation bar that isn’t just about reporting bugs, but about providing feedback and joining the Courselore community.
- In Meta Courselore, make a pinned announcement of how to report bugs.
  - Use a pre-filled form, similar to what we do when reporting an issue via email or via GitHub.

## References

- Communication platforms for education
  - <https://piazza.com>
  - <https://campuswire.com>
    - <https://campus.org>
  - <https://edstem.org>
  - <https://aula.education>
  - <https://yellowdig.com>
    - Point-based system; gamification.
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
- Content editors
  - <https://typora.io>
  - <https://www.notion.so>
  - <https://marktext.app>
