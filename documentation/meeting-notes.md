# Meeting Notes

<details>
<summary>2022-12-24</summary>

- Resumed work on pagination, which is causing performance issues.
- Started improving the treatment of client JavaScript.
  - `defer`.
  - Reuse functions (like we already do for CSS).
  - `morph` tooltips (which improves things on Live-Updates).

</details>

<details>
<summary>2022-12-17</summary>

- Introduced WebP for better performance & support for videos and animated GIFs.
- Converted the “Actions” menu to be lazy-loaded, improving the performance significantly.
- Highest priority: Feature-parity with other platforms.
- Are replies to announcements sending notifications to everyone? (Later: No, they aren’t.)
- We considered an option on follow-ups to announcements that would allow a staff member to force sending notifications to everyone, similar to the announcement itself. Ultimately, we decided against it, because the benefit didn’t seem to compensate the complication in the system. For the time being, you can `@everyone`, since most people don’t change the default settings and receive notifications for `@mentions`.
- We may hire an intern for the summer.
- Autocomplete for `@everyone`, `@students`, and `@staff` (just focus on the right option as the person is typing).
- `@mentions` and `#references` widgets should disappear on `␣`.

</details>

<details>
<summary>2022-12-12</summary>

- Reuse conversations across semesters.
- Performance improvements of almost 2x by lazy loading dropdown menu for “Actions”.

</details>

<details>
<summary>2021-12-03</summary>

- Progress:
  - Performance improvements of 2x.
  - Monitor.
  - Reusable messages across courses is almost finished.

</details>

<details>
<summary>2021-11-19</summary>

- Finished and deployed version 6.0.0 with new infrastructure.
- Prioritize being able to migrate content from Piazza and across semesters.
- Buy keywords in AdSense.
- At some point look for people who can do more proper marketing & sales.
- At some point look for people who can manage contracts & payments.
- Future pricing:
  - Free period and/or free tier.
  - Based on number of (active) classes.
  - Based on number of users.
- Table of comparison with other services, for example, Piazza and Ed.

</details>

<details>
<summary>2021-11-12</summary>

- Rearchitecture of processes, Live-Connections & Live-Updates, and so forth.
- Priorities moving forward:
  - Sidebar reorganization: Don’t change the user interface too much, given it’s almost the end of the semester and people are used to it.
  - Basic help for formatting, for example, the use of code fences (```).
  - Analytics, for example, the average time to respond, number of questions asked, and so forth.
  - Whispers.

</details>

<details>
<summary>2021-10-08</summary>

- Fixed an issue that was causing non-high-DPI images to be resized.
- Fixed an issue that was causing Firefox to show “Failed to connect to the Courselore server.” for a moment during reload.
- Started module bundling.
- We should start reaching out to more people on the spring, and before that we need:
  - Feature parity with Piazza.
  - Mobile application.
  - More robust notification system.
  - Better chat user interface.
- Long conversations are a bit slow (we need to flesh out pagination).
- Let’s rename “Staff” to “Course Staff”. (We also considered “Professor/Teaching Assistants”.)
- Let’s add more ℹ️s to explain “Selected People” & “Course Staff”.
- Let’s make tutorials to teach people Courselore in detail.

</details>

<details>
<summary>2021-10-02</summary>

- Issues we fixed:
  - Double submission in Chrome.
  - Server restarting.
  - Firefox not connecting to server.
  - Performance related to priority of Live-Updates.
- Investigated HTTP/3.
- Updated Caddy, Node.js, and dependencies.
- We’re double the size as last semester.
- Relax offline alerts.
- Show who’s typing, but hide students from other students.

</details>

<details>
<summary>2021-09-17</summary>

- Small quality-of-life improvements:
  - Show who liked a message.
  - Reduce the delay between sending a message & triggering its email notifications.
- Security issues:
  - Closing user sessions on the server (we had to sign everyone out just in case…).
  - Cookies & subdomains (it was breaking `try.courselore.org` and could lead to cookie tossing).
  - CSRF (`csurf` was deprecated).
- Investigated double-submit issue.
- Chrome on Android is still crashing 2 times out of 5.
- Filter by Selected People should allow to choose **which** people.
- Some operations are slow because live-updates are putting you behind in the queue.

</details>

<details>
<summary>2021-09-10</summary>

- No-reply: Let’s keep the administrator email for now, and at some point implement the feature in which you’re able to post a message by replying to the email notification.
- Don’t notify about messages you saw in real-time. Particularly on chats, in which there are many messages in succession.
- Edge case: While messages may be anonymous, the participation of a student in the conversation isn’t anonymous, so if there are only two students and one posts anonymously, the other can figure out who it was. But we’re considering that okay.
- Investigating a double-submit issue that Ali & Earl ran into. Don’t know what’s causing it yet.
- Locking down the application for people who haven’t verified their email address seems to have worked 😁
- Fixed security & privacy issues:
  - Redirects could lead you outside the application.
  - Students could see who viewed a message, if they knew which URL to query.
- Improved the error messages in the authentication & invitation workflows.
- Show participants on sidebar.
- Let’s continue allowing you to like your own messages, but let’s add a way for you to see who liked a message (and let everyone see that).
- Let’s postpone the notion of deleting users, courses, and so forth. It’ll come particularly handy when we have LMS integration.
- Do something about the case in which a student posts “thank you” in reply to an answer to a question, and the question becoming unresolved: perhaps separate buttons.
- Think about more separation between chats & other types of conversation. Perhaps remove chats for everyone from students?
- Have a setting to configure the delay on email notifications.
- The ceiling for improving performance is high.

</details>

<details>
<summary>2021-09-03</summary>

- Brought back the concept of “Announcements”.
- Fixed issue with password reset links & Outlook.
- Several quality-of-life features.
- Other topics:
  - A student didn’t get an email notification for a reply to their question. Could it be because they didn’t verify their email? (Let’s lock the system further if you didn’t verify your email.) Could it be one of the emails didn’t get relayed, mostly because of wrong domains? Keep an eye out…
  - In the near future, let’s implement a notion of “importing” conversations from other courses to allow for reuse, but let’s **not** put too much structure into the continuity of the courses across semester—let’s let it be more freeform.
  - Get rid of horizontal scrolling. In the content editor toolbar in particular, but in the rest of the application in general as well…

</details>

<details>
<summary>2021-08-27</summary>

- Conversation participants deployed.
- Finished things off with Eliot: Polls are mostly fleshed out.
- Password reset issue reported by Ali.
- We started discussing the notion of reusable posts across semesters.
- SAML is a priority for spring, so we should start now, because it will take some time to cut through the red tape.

</details>

<details>
<summary>2021-08-20</summary>

- DMs: Almost finished, only missing user interface. Most of the work was dealing with how DMs interact with other features, for example, anonymity and email notifications.
- Lock Course (Exam Period): Done. Not merged.
- Polls: Explored the idea of holding the results in the message, but landed on the concept of having polls as external objects, like images.
- Other topics:
  - Administrative interface should show the active courses.
  - Import from Piazza: Announcement messages.
  - Apply filters right away, don’t have an “Apply Filter” button.
  - **Superpins**, that would be useful for administrative pages with PDFs, zips, and other course material. But let’s not have a dedicated “course resources” feature.
  - Chats should be “Selected People” by default.
  - On course lock, students may ask private questions.

</details>

<details>
<summary>2021-08-13</summary>

- Mobile application:
  - Cookies to detect mobile application as opposed to the browser.
  - Redirection flows.
- Digests:
  - Deployed new email notifications infrastructure with delay between receiving a message and sending its notifications.
  - We haven’t deployed digests because we’re still dealing with edge cases, for example, what happens when you’re receiving digests and switch to immediate notifications.
- Participants:
  - Most of the infrastructure is in place. Still dealing with interactions between this feature and other features, for example, search, email notifications, the `@mentions` widget and so forth.
- Polls:
  - They’re a new type of message content, not something heavyweight like a new type of question. This follows the same lines as Discourse & Slack (where people use reactions (emojis) to do polls).
  - Support multiple answers.
  - Students may see aggregate results.
  - Staff may see individual votes.
  - Allow for closing a poll.
- Zach’s comments:
  - DMs.
  - SAML (for spring).

</details>

<details>
<summary>2021-08-06</summary>

- Mobile application.
  - Select server to connect to (and validate that it’s a Courselore server).
  - Safe area (notch).
- Email digests.
  - Decorate content from other people’s perspective.
  - Fixed issues with `#anchors`.

</details>

<details>
<summary>2021-07-30</summary>

- Mobile application is under way: Capacitor is setup, and we’re working on the page that lets you select the server. We may have issues getting the application approved by Apple.
- Email notification digests are almost done. Also implemented a grace period between sending a message and its email notification, to allow the person to edit.
- The new Tags selector widget is done. The person selector widget for DMs will reuse this work.

</details>

<details>
<summary>2021-07-23</summary>

- Better email notifications:
  - Filters for conversations in which you participated is now deployed.
  - Emails are threaded.
  - Do we want more granular control for digests, for example, answers to your questions should be received right away?
- Eliot’s work on the new tags widget isn’t finished yet.
  - Start investigating mobile application.
- Sketch of 1-to-1 conversations.

</details>

<details>
<summary>2021-07-16</summary>

- Better ways for administrators to be notified of updates.
- “New Conversation” interface changes (sidebar & main form).

</details>

<details>
<summary>2021-07-09</summary>

- Administrative interface: Deployed.
- Better email notifications: Deployed (but missing digests).
- Icons: Improving the presentation of “New Conversation” form.

</details>

<details>
<summary>2021-07-02</summary>

- Administrative interface: It’s almost ready to deploy: We want to revert some changes before we actually deploy.
- Simplified configuration.
- Better email notifications: Doing filtering on database. Everything but digests.

</details>

<details>
<summary>2021-06-25</summary>

- Better email notifications:
  - Completed the settings page.
  - Implemented the filtering rules.
  - Not actually creating digests yet.
- Administrative interface:
  - Preparing for deployment of initial features:
    - Users with system role management
    - Settings for restricting who can create courses
    - General settings like administrative email
  - Migration process: Setup some tricky database migrations requiring user input for migration of existing installations.
- Other minor things:
  - Fixed layout glitch on user settings profile page when the person doesn’t have an avatar yet.
- When we get to 1-to-1 conversations, do whispers, similar to Discourse.
- API
- Gamification
  - Badges (for example, first to answer a question)
  - Karma points for whole class and unlock achievements for everyone

</details>

<details>
<summary>2021-06-18</summary>

- Administrative interface:
  - Course creation is restricted to only certain users, respecting option set by administrator.
  - List of all users in the system.
- Better email notifications:
  - See interface.
- Smaller things:
  - Fixed configuration issues that made development on Windows not work.
  - Fixed small annoyance in which a tap on user partial would open the tooltip right away on mobile, not respecting the delay.

</details>

<details>
<summary>2021-06-11</summary>

- Started work on the administrative interface.
- Added an image reverse proxy to serve hotlinked images in message content. This fixes mixed content errors and improves on privacy.
- Several small quality-of-life improvements, for example, including the course name on the “From” field in emails, making it easier for staff to make a note generate a notification, and so forth.

</details>

<details>
<summary>2021-05-28</summary>

- Had a meeting with Zach: how the first semester with Courselore went; what to do for next semester; and a brief technical overview.
- Implemented the course archival feature.
- A couple more tweaks to the layout of the sidebar.
- Fixed issues: Images in email notifications not showing up on some email clients; close the `@mentions` and `#references` widget on `@␣`; and so forth.
- Minimal integration with Learning Management Systems is a high priority. (Identity only; don’t do grades and other things right now.)

</details>

<details>
<summary>2021-05-24 (Zach)</summary>

- Liked Courselore this first semester and plan on using again next semester (starting things off in August), with a co-instructor who used to use <https://edstem.org>.
- Ran into some bugs that have already been fixed on the latest version.
- Caddy could silence logs **after** a successful startup.
- Most wanted features for next semester:
  - 1-to-1 conversations.
  - SAML (only for authentication; authorization and the invitation process should remain the same).
- Desktop version would be more useful than mobile.
- On the technical side of things:
  - Our live-navigation & live-updates are related to functional reactive programming.
  - Elm gives some of the same benefits, but at the cost of making the programmer work to maintain some of the invariants necessary to make the system work.
  - `key=""` implies uniqueness & perhaps it would be nicer to have more structure in the key besides just a string.

</details>

<details>
<summary>2021-05-21</summary>

- Sidebar redesign.
  - Ask a question.
  - Quick filters. (Unread isn’t working yet.)
  - Search takes less space.
  - Filtering by unresolved questions becomes more obvious.
  - The search & filters part of the sidebar stays fixed.
- Made emails copyable.
- Query parameters management, from blocklist to allowlist.
- Questions:
  - Is the semester over? May I downsize the machine? May I deploy new versions with design changes?
    - Yes, the semester is over.
  - Course archival.
    - Prioritize it.
- Review again other applications like Piazza so that we’re aware of features that people will probably ask us about.
- Our API should enable us to connect with other applications, for example, assignment management, and course material.
  - Though we won’t necessarily be going to those areas right away.
  - It’s part of our short-term strategy.
- Roadmap: 20 users by fall, 200 by spring, paid by 2024, profit by 2026
- SAML is a must-have feature for next semester (along with API)
- Administrative interface is for system administrators, not for department administrators(!)
  - It’s like a root user on Linux.
  - Allowlist people who can create a course.
  - Have complete access to course information.
  - Have one single layer of abstraction: Institution (it encapsulates departments, universities, and so forth).

</details>

<details>
<summary>2021-05-14</summary>

- Quicker feedback to actions, for example, sending a message.
  - Investigated how Discord does latency compensation.
  - Disabled submit buttons.
  - Added a “wait” cursor.
  - Latency compensation for sending a message with a placeholder.
- On `/conversations/new`, added support for pre-filling the `<input>`s with query parameters, which is useful for templates & drafts.
- Started implementing conversations drafts.
  - Do we want to show them on the sidebar?
  - Do we want to make them searchable?
- Fixes:
  - Fixed validation error in which a live-update would preserve the `value` of `input` even when it shouldn’t, for example, to set a question as “resolved.”
  - Fixed uses of `.findLast()`, which isn’t supported on all browsers yet.
  - Investigated performance issue, which seemed to be have been a temporary issue that solved itself…

</details>

<details>
<summary>2021-04-30</summary>

- Day off (holiday).
- Backlog grooming.
- Interface improvements:
  - Tooltips on relative times now target whole phrase.
  - “Conversations” button on mobile now adds entry to history.
  - `theme-color` in Safari.
- Security:
  - Headers, cross-origin, and so forth.
  - Cleaning `localStorage` on sign-out.
- Other:
  - End of the term in two weeks.
  - <https://campus.org>
  - Vacation.
  - Some protocol to interoperate with other tools, including grading systems and live lecture systems.
    - Perhaps don’t use LTI if it’s too heavy and bureaucratic.

</details>

<details>
<summary>2021-04-23</summary>

- Finished and deployed live-updates with new mechanism that’s resilient to disconnections of any kind, and that doesn’t require extra round trips to the server.

---

- Improve experience on phone:
  - Make the “Conversations” button push an entry into the history. (We can do that by turning it into a link that points at `/courses/<courseReference>`.)
  - Have a hamburger menu that doesn’t cover the whole pane underneath, and in that case don’t push an entry into the history.
  - When you click on the existing “Conversations” menu, it take a little while to respond. But not all the time, so keep an eye out for it. (Maybe it has to do with live-updates coming in and morphing happening on the background?)
- Other ideas for improving the design:
  - Conversations are sorted by most recent activity, but that means when you send a message, the conversation moves to the top, which can be disorienting.
    - Wait for a little while, 10~30 minutes, before sorting.
  - Separate the conversations in sections: One section for conversations with unread messages.
  - Add filters for conversations with unread messages.
  - Quick filters:
    - Staff:
      - Unresolved questions
      - Conversations with unread messages
    - Students:
      - Questions
      - Conversations with unread messages
- Don’t deploy big design changes in the next two weeks, because we’re approaching the end of the semester and big design changes could confuse people.
- Over the summer, start thinking more strategically.

</details>

<details>
<summary>2021-04-09</summary>

- Finished and deployed details on morphing, live navigation, and live updates. This should address several glitches in the application, and give it a more app-like feel.
- We’ll do videos for educators and students with a brief sales pitch, and a tutorial.
- The new contributor who’ll be joining us for the summer may be working on the administrative panel.

</details>

<details>
<summary>2021-04-02</summary>

- Converted from morphdom into own implementation, which minimizes changes to the DOM, fixing glitches with tooltips, scrolling, and so forth.

</details>

<details>
<summary>2021-03-20</summary>

- We finished and deployed many performance improvements, including live navigation and live updates powered by live navigation.

</details>

<details>
<summary>2021-03-12</summary>

- Almost finished live navigation, which speeds things up and makes some pagination details more straightforward to implement.

---

- ETags don’t seem to be enough: A deployment to try.courselore.org was serving stale assets.
- Our goal is to get new features while we have active users, to have them test things. Goals for the next two months:
  - Finish performance & pagination work.
  - Redesign sidebar, chat messages, and things like announcements vs notes-that-generate-notifications.
  - Notification digests.
  - 1-on-1 conversations.
- Tip sheet on how to get notifications
- After the fall semester, spread the word.

</details>

<details>
<summary>2021-03-05</summary>

- Deployed a new version with some optimizations (for example, Caddy serving static files), but still not `liveNavigation` and pagination.
- Broke the codebase into multiple files.
- Made `eventSource` more robust: It’ll try to reconnect no matter what happens.

---

- Chat
  - Look & feel, and speed.
  - Difficulty tracking what’s going on.
  - Maybe get an specialist in user-interface design after the next iteration.
  - Alternating 10 background colors.
  - Don’t just copy Slack, do better.
  - Nested chats (later).
  - More separation between messages.
  - Avatars on side.
  - More space.
  - More contrast.
  - Improve replies.
  - Little hover menu a la Slack.
  - Bigger font (Slack is 15pt).
  - Wider column for forums.
  - Wide as possible for chats.

</details>

<details>
<summary>2021-02-26</summary>

- Module bundling.
- Serving static assets with Caddy.
- Benchmarked `@leafac/html`.
- Fixed installation issues on `@leafac/caddy`.
- Fixed development installation instructions on Windows.
- Started the Turbo Drive + morphdom.

---

- 1-1 conversations are the most important feature to work on next.
- Restructuring the codebase: split files by May.

</details>

<details>
<summary>2021-02-19</summary>

- This week’s progress:
  - Worked out many edge cases of pagination (for example, I had to change permanent links 🤷).
  - Started framing (for example, the sidebar doesn’t jump around when you go to a different conversation).
  - Improved types & tests to prevent subtle bugs.
  - Fixed issues with the “New” indicator & Firefox not resetting the textarea.
- Other things we talked about:
  - Redesign the presentation of submenus, for example, “Conversations”, on mobile. Try a hamburger menu.

</details>

<details>
<summary>2021-02-12</summary>

- This week’s progress:
  - Fixed live-update glitches.
  - Better (but still not best) latency compensation.
  - Fixed “mark all as read” making it seem as if a student had read a staff-only conversation.
  - Implemented the core of pagination.
- Other things we talked about:
  - Framing.
  - Issue: Ali’s students are less active than on previous courses using other platforms.
  - We want a way to steer people away from asking questions as follow-up on announcements.
    - Locking.
    - Extract message into conversation.
    - “Ask a question”
  - Redesign “Start a new conversation” so that it is clearer how to ask a question
  - Get rid of “announcement”, and give “note” the option to broadcast.
  - Quick filters.
  - `<details>` sidebar group by date & pins.
  - Redesign New Conversation page.
  - Tags presentation make them look like tags, instead of icons on the left.

</details>

<details>
<summary>2021-02-05</summary>

- Fixes:
  - Email notifications deliveries fixed.
  - “Oh, snap” fixed.
  - Several cosmetic things.
  - Started work on live-updates.
- New features:
  - “Resolved” questions.
  - Autosizing, monospaced font on editor, and so forth.
- Bump up the VM even more.

</details>

<details>
<summary>2021-01-29</summary>

- This week’s progress:
  - Investigated techniques for live-updates, view caching, and so forth.
  - Fixed shutdown behavior.
  - Added logging.
  - Investigated issue of notifications being delivered multiple times.
- Other things we talked about:
  - The highest priority is fixing all the remaining bugs.
  - Redesign the presentation of @mentions in messages.
    - Shorten “Everyone in this Conversation” to just “Everyone”.
  - The scale of a single course:
    - 150 students
    - 15 CAs
    - 1300 conversations
    - 2~3 messages per conversation
    - 8 chats
    - 50 messages per chat
  - Add the notion of questions being resolved.
    - Only staff may change the “resolved” status
    - List of conversations: Make it easy to see unresolved questions. Color-code and filters.
    - Use that to organize Meta CourseLore.
  - Meta CourseLore make a pinned announcement of how to report bugs.

</details>

<details>
<summary>2021-01-23</summary>

- This week’s progress:
  - Improved the performance by 3x by changing the processing of CSS/JS.
  - Improved routing regarding email confirmation, email resetting, invitations, and so forth.
  - Fixed the cookie issue that was causing Outlook confirmation links to not work.
  - Did one more round of testing in different devices & browsers.
  - Added links to try.courselore.org & Meta CourseLore.
  - Added warnings explaining the intent of different servers.
  - Changed landing page for when you just created a course.
  - Made QR code more prominent on the invitations settings page.
  - Email notifications are formatted.
  - Silenced Caddy logs.
  - Operating-system detection for showing only the relevant keyboard shortcuts.
  - Fixed scrolling to the bottom on new messages on chat.
- Progress from last week that we didn’t have the time to talk about:
  - Added a decoration to the `userPartial` to highlight staff.
  - Changed the display of new messages: Instead of a blue dot next to each new message (à la Mail.app), have a bar on top of the first new message (à la Discord). Started the investigation of which parts to optimize first.
  - Fixed glitches related to tooltips on live updates.
  - Fixed the treatment of people who are no longer enrolled.
- Other things that we talked about:
  - On home page, under the “source code” button, add a tooltip to highlight how CourseLore will be free forever for people who self-host.
  - Make a public page listing known issues.
  - Add a call-to-action on the bottom navigation bar that isn’t just about reporting bugs, but about providing feedback and joining the CourseLore community.
  - Change `userPartial` tooltip to be activated on click, instead of hover.
  - Don’t send notifications when the person is online.
  - List of conversations shouldn’t jump when you go to a particular conversation.
  - Add favicon for when you bookmark CourseLore on iOS’s home screen.
  - Add a help screen under the “About CourseLore” button:
    - A more app-like experience (in iOS):
      - Bookmark CourseLore to home screen.
      - Use VIPs as notifications mechanism.
    - If things look weird, or if something doesn’t work, you may need to update your browser.

</details>

<details>
<summary>2021-01-16</summary>

- Infrastructure is in place.
  - Production server.
  - `try.courselore.org`
  - New homepage.
- We have a first person self-hosting who’s happy with the process & the documentation.
  - He wasn’t put off by the recommendation to use Homebrew, for example.
- User interface:
  - Added extra course information (year, term, institution, and code).
  - Added redirect to login when trying to confirm email but logged out.
  - Added a filter to Course Settings > Enrollments.
  - Made more explicit the administrator’s email in case the `mailto:` protocol doesn’t work.
  - “Help” button
  - Link from conversation creation to tag management.
  - Made password updates close all other sessions, in case a password is compromised or an attacker is using session fixation.
  - Fixed refreshing ids, so that things like footnotes work.
- Performance:
  - Cache preprocessed messages: 10% improvement.
  - Investigated other issues that should be 50% improvement, but haven’t implemented.
- Progress we didn’t have time to talk about:
  - Added a decoration to the `userPartial` to highlight staff.
  - Changed the display of new messages: Instead of a blue dot next to each new message (à la Mail.app), have a bar on top of the first new message (à la Discord). Started the investigation of which parts to optimize first.
  - Fixed glitches related to tooltips on live updates.
  - Fixed the treatment of people who are no longer enrolled.

</details>

<details>
<summary>2021-01-08</summary>

- It’s a good thing that we stopped using Faker.js!
- Finished `userPartial`.
  - Coolest bug ever caused by a self-`@mention` in a biography leading to an infinite loop.
- Documentation.
- We went various parts of the application and talked about the most pressing issues.

</details>

<details>
<summary>2021-12-22</summary>

- Tooltips are rendered out-of-band, to support block elements in tooltip contents even when the tooltip target is inline.

</details>

<details>
<summary>2021-12-22</summary>

- Progress:
  - User component.
  - Actions menu.
  - Database improvements: cleaned up a bit of magic, cleaned up repetition, and so forth.
- Other topics:
  - README
    - Description.
    - Links.
      - Production
      - Staging
      - Home.
      - GitHub.
    - Installation.
  - Don’t disclose emails to students.
  - 1-to-1 conversation: Use background color to distinguish between people, so you don’t have to show their names over and over.
  - Discourse rebake task.

</details>

<details>
<summary>2021-12-11</summary>

- Finished presentation of chat messages.
- Added a date separator between chat messages.
- Group together messages sent in quick succession.
- Started online indicators.
- Other things we talked about:
  - Delete attachments.
  - Notifications delay.

</details>

<details>
<summary>2021-12-04</summary>

- Created https://github.com/leafac/fake-avatars to replace Faker.
- Fixed scrolling of chat window.
- Cleaned up the layout of chats.
- Pagination
  - Messages in conversation.
  - Conversations on sidebar.
- Test with thousands of messages.
- Scroll on new message.
  - Latency compensation.
- A course about courselore. For collecting feedback.
  - Put invitation link on the page somewhere.
- Lightbox for images & code blocks (click for more & full screen).
- “Truncate” long messages in chat.
- Button to choose whether to wrap lines.
- Mobile app is more important than chat.
  - PWA to begin with: https://checkvist.com/auth/mobile

</details>

<details>
<summary>2021-11-20</summary>

- Chat:
  - https://github.com/twbs/icons/issues/1101
  - More compact layout (specially on mobile)
  - Don’t reload on send
  - Scroll to the bottom
  - Hide secondary buttons
- Market & design investigation: Slack, Discord, and Campuswire
  - Ideas to borrow
    - Draft conversations
  - Things I think we’re doing better:
    - Not pushing apps
    - Responsive design
    - Search
  - https://medium.com/campuswire/introducing-campuswire-courses-and-some-thoughts-on-monetization-157d5fa02e8f

</details>

<details>
<summary>2021-11-13</summary>

- Chat:
  - Duplicate author information (including anonymity) into conversation, instead of relying on first message.
  - Chats may be created without tags & first message.
- Tested the interface with weird data, for example, names that are too long, and fixed layout issues.
- Icons changed (for example, staff-only) and moved around.
- Finished the notifications system.
- Filters.

</details>

<details>
<summary>2021-11-06</summary>

- Security:
  - CSRF.
  - HTML uploads leading to XSS.
  - Resize images that are too big (previous we were doing that only for avatars).
  - Ask for password when updating email.
- Markdown editor improvements:
  - Footnotes.
  - Brought back syntax highlighting.
  - Visual indication while upload is in progress.
  - Quoting code.
- Icons for students/staff.
- Started updating notifications system to take in account features that have been developed since then, for example, staff-only conversations.
  - Do we want to allow students to `@everyone`? Yeah, it’s okay.
- Renamed “other” to “note” and added the “chat” type.

</details>

<details>
<summary>2021-10-30</summary>

- Finishing touches on showing messages:
  - Added a “mark all as read” button.
  - Changed “Copy to clipboard” wording.
  - Looked into FERPA compliance.
  - Improved security around uploads.
  - Migrated to ESM.
  - Hide blue dots indicating unread messages after a second.
  - Made blue dot count indicator on sidebar a “mark as read” button.
  - Added highlight message that has been #message--... targeted.
  - Included every message (not just the first one) to search results when searching for author.
  - Fixed anonymity violations on partial that shows conversation information.
- Other things we talked about:
  - Attachments should be attached to conversations?
  - Change the visualization of “types” a little more: Make announcements pop up.
  - “Other” -> “Note”
  - Chat highlights (for everyone in the chat)
  - Bookmarks / flags / saved items (for you only)
  - More granular access control:
    - Chats with only a few people.
    - Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
    - Invitations for groups? No.
    - People assign themselves to groups.
  - Tags required for chats? No.
  - The first post is a chatroom description

</details>

<details>
<summary>2021-10-16</summary>

- Progress:
  - Finished the #references widget.
  - Markdown processor:
    - Improved display of @mentions (in particular, when you’re mentioned).
    - Links to conversations/messages are converted into #reference format.
  - Search:
    - Include authors.
    - Highlight search results.
    - Include message snippets.
  - Made permalinks copyable.
  - Fixed overflow of code blocks in small screens.
- Requests:
  - Search authors of every message.
  - Hide blue dots after a second.
  - Make blue dot count indicator a “mark as read” button.
  - Make all as read.
  - “Copy to clipboard” wording.
  - Cache.
  - Chat.
  - Notifications.
  - Look into FERPA compliance.

</details>

<details>
<summary>2021-10-09</summary>

- @leafac/javascript
  - Treatment of relative dates is more consistent with GitHub & Mail.app.
  - Manually tested the application across browsers.
    - Firefox login wasn’t working(!)
- Accent colors.
- Presentation of radios & checkboxes.
- Made possible to change the visibility of existing conversations (previously you could only go from visible to everyone to visible by staff-only—now it’s possible to go the other way as well).
- Improved the presentation of anonymity.
- Fixed staff-only conversations being innacessible by students who participated.
- Started the `#references` widget.

</details>

<details>
<summary>2021-09-25</summary>

- Progress:
  - Finished the @mentions widget.
  - Fixed the issue that was crashing the server last Saturday.
  - More importantly, fixed the process supervisor so that even if the server goes down, it respawns.

</details>

<details>
<summary>2021-09-18</summary>

- Progress:
  - Investigated the space of tools to build mobile applications based on web technologies.
  - `courselore.org` is sending emails.
  - Database improvements:
    - Investigated n+1 queries.
    - Reviewed queries to fetch conversations.
    - Started introducing users in search results (but haven’t completed; search is broken now!).
  - Widget to show help you pick users for @mentions.

</details>

<details>
<summary>2021-09-11</summary>

- Progress:
  - Authentication:
    - Update email & password.
    - Email confirmation confirmation.
    - Fixed sliding sessions.
  - Database improvements:
    - Handled Markdown and user-generated HTML on search indices.
    - Database indices (for performance).
    - Job to periodically clean expired data, for example, sessions.
  - Favicon.
- Work in progress:
  - The @mention widget.
  - Include users in search.
  - Include snippets in search results.
  - Better filters (for example, for conversation types).
- Features we talked about:
  - Enable emails courselore.org.
  - Department wide infrastructure. Hierarchy: Administrators may be able to see all courses in installation, and so forth.
  - Highlight search terms on the entire page.
  - Assign CA to questions.
  - Mobile application.
  - Communicate with LMS.

</details>

<details>
<summary>2021-09-04</summary>

- Cleaning.
  - Backlog grooming.
  - Cleaned up the code.
  - Updated dependencies.
- Minor tweaks.
  - Staff-only conversations use the same counter as regular conversations.
  - The trashcan not being red anymore.
  - `:hover` states on radios & checkboxes.
- Password reset.

</details>

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

**Progress Report**

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

**Design Decisions**

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
