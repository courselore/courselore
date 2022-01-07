# Backlog

### First Public Release

**Soft Deadline:** 2022-01-15

**Hard Deadline:** 2022-02-01

### Chat

- Avatars.

  - Fix client-side JavaScript syntax error when focusing on `markdownEditor` in conversations page.
  - Bring `partialLayout` into other places where it’ll be useful, for example, the server results of the `#references` widget.
    - Verify that every `res.send()` is using a layout.
  - Extract into @leafac/javascript the snippet that loads a `partialLayout` result into a DOM element. (Look for `insertAdjacentHTML`: There are two occurrences.)
  - Test `@mentions` & `#references` widgets.
  - Is the user name being highlighted by search in the right places (`conversationPartial`, the list of messages in a conversation, and so forth)?
  - On `@mentions` to self, the `<mark>` bleeds under the avatar.
  - Finish using `userPartial` in every location where it belongs.
    - `bi-person-circle`
    - `avatar`
  - Don’t disclose emails to students.

  - Add staff badge to `userPartial`.

```js
<span
  class="secondary"
  oninteractive="${javascript`
                          tippy(this, {
                            touch: false,
                            content: ${JSON.stringify(
                              lodash.capitalize(user.enrollmentRole)
                            )},
                          });
                        `}"
>
  $${enrollmentRoleIcon[user.enrollmentRole].regular}
</span>
```

- `TODO` (see code below)

```js
$${searchResults !== undefined
  ? html`
      $${typeof searchResults.messageAuthorUserNameSearchResultHighlight ===
        "string" &&
      searchResults.messageAuthorUserNameSearchResultMessage !== undefined
        ? html`
            <div>
              <div>
                $${searchResults.messageAuthorUserNameSearchResultMessage
                  .anonymousAt === null
                  ? html`
                      <span
                        class="online-indicator online-indicator--inline online-indicator--small"
                      >
                        $${searchResults
                          .messageAuthorUserNameSearchResultMessage
                          .authorEnrollment.user.avatar === null
                          ? html`<i class="bi bi-person-circle"></i>`
                          : html`
                              <img
                                src="${searchResults
                                  .messageAuthorUserNameSearchResultMessage
                                  .authorEnrollment.user.avatar}"
                                alt="${searchResults
                                  .messageAuthorUserNameSearchResultMessage
                                  .authorEnrollment.user.name}"
                                class="avatar avatar--xs avatar--vertical-align"
                              />
                            `}
                        <span
                          data-last-seen-online-at="${conversation
                            .authorEnrollment.user.lastSeenOnlineAt}"
                          oninteractive="${javascript`
                            // onlineIndicator(this);
                          `}"
                        ></span>
                      </span>
                      $${searchResults.messageAuthorUserNameSearchResultHighlight}
                    `
                  : html`
                      <span
                        class="text--violet"
                        oninteractive="${javascript`
                          tippy(this, {
                            touch: false,
                            content: "Anonymous to other students.",
                          });
                        `}"
                      >
                        <i class="bi bi-sunglasses"></i>
                        Anonymous
                      </span>
                      $${res.locals.enrollment.role === "staff" ||
                      searchResults
                        .messageAuthorUserNameSearchResultMessage
                        .authorEnrollment.id === res.locals.enrollment.id
                        ? html`
                            (<span
                              class="online-indicator online-indicator--inline online-indicator--small"
                            >
                              $${searchResults
                                .messageAuthorUserNameSearchResultMessage
                                .authorEnrollment.user.avatar === null
                                ? html`<i
                                    class="bi bi-person-circle"
                                  ></i>`
                                : html`
                                    <img
                                      src="${searchResults
                                        .messageAuthorUserNameSearchResultMessage
                                        .authorEnrollment.user.avatar}"
                                      alt="${searchResults
                                        .messageAuthorUserNameSearchResultMessage
                                        .authorEnrollment.user.name}"
                                      class="avatar avatar--xs avatar--vertical-align"
                                    />
                                  `}
                              <span
                                data-last-seen-online-at="${conversation
                                  .authorEnrollment.user
                                  .lastSeenOnlineAt}"
                                oninteractive="${javascript`
                                  // onlineIndicator(this);
                                `}"
                              ></span>
                            </span>
                            $${searchResults.messageAuthorUserNameSearchResultHighlight})
                          `
                        : html``}
                    `}
              </div>
              <div>
                $${lodash.truncate(
                  searchResults.messageAuthorUserNameSearchResultMessage
                    .contentSearch,
                  {
                    length: 100,
                    separator: /\W/,
                  }
                )}
              </div>
            </div>
          `
        : typeof searchResults.messageContentSearchResultSnippet ===
            "string" &&
          searchResults.messageContentSearchResultMessage !== undefined
        ? html`
            <div>
              <div>
                $${searchResults.messageContentSearchResultMessage
                  .anonymousAt === null
                  ? html`
                      <span
                        class="online-indicator online-indicator--inline online-indicator--small"
                      >
                        $${searchResults.messageContentSearchResultMessage
                          .authorEnrollment.user.avatar === null
                          ? html`<i class="bi bi-person-circle"></i>`
                          : html`
                              <img
                                src="${searchResults
                                  .messageContentSearchResultMessage
                                  .authorEnrollment.user.avatar}"
                                alt="${searchResults
                                  .messageContentSearchResultMessage
                                  .authorEnrollment.user.name}"
                                class="avatar avatar--xs avatar--vertical-align"
                              />
                            `}
                        <span
                          data-last-seen-online-at="${conversation
                            .authorEnrollment.user.lastSeenOnlineAt}"
                          oninteractive="${javascript`
                            // onlineIndicator(this);
                          `}"
                        ></span>
                      </span>
                      ${searchResults.messageContentSearchResultMessage
                        .authorEnrollment.user.name}
                    `
                  : html`
                      <span
                        class="text--violet"
                        oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Anonymous to other students.",
                        });
                      `}"
                      >
                        <i class="bi bi-sunglasses"></i>
                        Anonymous
                      </span>
                      $${res.locals.enrollment.role === "staff" ||
                      searchResults.messageContentSearchResultMessage
                        .authorEnrollment.id === res.locals.enrollment.id
                        ? html`
                            (<span
                              class="online-indicator online-indicator--inline online-indicator--small"
                            >
                              $${searchResults
                                .messageContentSearchResultMessage
                                .authorEnrollment.user.avatar === null
                                ? html`<i
                                    class="bi bi-person-circle"
                                  ></i>`
                                : html`<img
                                    src="${searchResults
                                      .messageContentSearchResultMessage
                                      .authorEnrollment.user.avatar}"
                                    alt="${searchResults
                                      .messageContentSearchResultMessage
                                      .authorEnrollment.user.name}"
                                    class="avatar avatar--xs avatar--vertical-align"
                                  />`}
                              <span
                                data-last-seen-online-at="${conversation
                                  .authorEnrollment.user
                                  .lastSeenOnlineAt}"
                                oninteractive="${javascript`
                                  // onlineIndicator(this);
                                `}"
                              ></span>
                            </span>
                            ${searchResults
                              .messageContentSearchResultMessage
                              .authorEnrollment.user.name})
                          `
                        : html``}
                    `}
              </div>
              <div>
                $${searchResults.messageContentSearchResultSnippet}
              </div>
            </div>
          `
        : html``}
    `
  : html``}


  $${message !== undefined
        ? html`
            <div>
              <div class="secondary">
                $${message.anonymousAt === null
                  ? html`
                      <span
                        class="online-indicator online-indicator--inline online-indicator--small"
                      >
                        $${message.authorEnrollment.user.avatar === null
                          ? html`<i class="bi bi-person-circle"></i>`
                          : html`
                              <img
                                src="${message.authorEnrollment.user.avatar}"
                                alt="${message.authorEnrollment.user.name}"
                                class="avatar avatar--xs avatar--vertical-align"
                              />
                            `}
                        <span
                          data-last-seen-online-at="${conversation
                            .authorEnrollment.user.lastSeenOnlineAt}"
                          oninteractive="${javascript`
                            // onlineIndicator(this);
                          `}"
                        ></span>
                      </span>
                      ${message.authorEnrollment.user.name}
                    `
                  : html`
                      <span
                        class="text--violet"
                        oninteractive="${javascript`
                          tippy(this, {
                            touch: false,
                            content: "Anonymous to other students.",
                          });
                        `}"
                      >
                        <i class="bi bi-sunglasses"></i>
                        Anonymous
                      </span>
                      $${res.locals.enrollment.role === "staff" ||
                      message.authorEnrollment.id === res.locals.enrollment.id
                        ? html`
                            (<span
                              class="online-indicator online-indicator--inline online-indicator--small"
                            >
                              $${message.authorEnrollment.user.avatar === null
                                ? html`<i class="bi bi-person-circle"></i>`
                                : html`<img
                                    src="${message.authorEnrollment.user
                                      .avatar}"
                                    alt="${message.authorEnrollment.user.name}"
                                    class="avatar avatar--xs avatar--vertical-align"
                                  />`}
                              <span
                                data-last-seen-online-at="${conversation
                                  .authorEnrollment.user.lastSeenOnlineAt}"
                                oninteractive="${javascript`
                                  // onlineIndicator(this);
                                `}"
                              ></span>
                            </span>
                            ${message.authorEnrollment.user.name})
                          `
                        : html``}
                    `}
              </div>
              <div>
                $${lodash.truncate(message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : html``}
```

- Test everything in different browsers.

- README
  - Description.
  - Links.
    - Production
    - Staging
    - Home.
    - GitHub.
  - Installation.
- `position: sticky` headers (showing author name) in messages?
- Revisit unread management:
  - Don’t store all readings, but only the latest for a given conversation.
  - Line to separate new messages instead of little unread indicator.
  - Or maybe not, because then we can have features such as (`person ___ read this message at ___`).
  - Also, we could attach reactions to the reading, for example, likes & endorsements
    - But then we’d be associating personal data (when the reading happened) with data about messages (whether it was liked). The first should be deleted when the person leaves the course; the second shouldn’t.
- Messages display:
  - “Truncate” long messages.
- Scroll on new message.
- Latency compensation when sending message.
- Currently typing.
- Messages features:
  - Highlights (similar to Slack’s pins, but we’re avoiding the word “pin” because it already means “pinned conversations”). The highlights are visible to everyone in the conversation.
  - Bookmarks / flags / saved items. These are personal, for example, for something you have to follow up on.

### Performance

- Remove static CSS from every request.
- Cache Markdown parsing.
  - Similar to Discourse’s `rebake` task.
  - In `markdownProcessor`, decouple the computation of `mentions` from the process of decoration.
    - Revisit notifications and other potential consumer of the `mentions` information, which aren’t working right now.
      - I left them broken because the decoration processes includes resolving `#234` references, which shouldn’t be processed for everyone (for example, in full-text search plain text).
- Pagination.
  - Messages in conversation.
  - Conversations on sidebar.
- Test with thousands of messages.

### Advanced Access Control

- Chats with only a few people.
- 1-to-1 conversation: Use background color to distinguish between people, so you don’t have to show their names over and over.
- Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
  - Some groups are available only to students, while others only to staff.
  - People assign themselves to groups.
- Add mentions like `@group-3`.

### Release

- A course about CourseLore for collecting feedback.
  - Put invitation link on the page somewhere.
- Create separate staging & production versions.

### Users

- Online indicators.
  - Query the server for updates before turning off online indicator.
  - Fade in and out.
- Multiple emails.
- Allow people to remove their accounts.
- Authentication:
  - SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).
  - 2-Factor Authentication.

### Courses

- More information:
  - Number.
  - Term.
- Different course states, for example, archived.
- Remove course entirely.
- Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Control who’s able to create courses, which makes sense for people who self-host.

### Invitations

- Limit invitation links to certain domains.
- Have an option to require approval of enrollment.
- Have a public listing of courses in the system and allow people to request to join.

### Conversations

- Change the visualization of “types” a little more, for example, make announcements pop up.
  - Improve display of endorsements & answers (on the sidebar, include number of answers).
  - Manage answer badges more intelligently (answered at all, answered by staff).
  - Let original question asker approve an answer.
- More sophisticated tag system: dependencies between tags, actions triggered by tags, and so forth.
- Modify the order of tags.
- Different states: Open vs archived.
- Assign questions to CAs.
- Scroll the conversations list to the current conversation doesn’t work on mobile.
- Save drafts of conversations you’re creating.

### Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

### Notifications

- Have a little red dot next to the course names for courses that have unread messages.
- Delay sending notifications for a little bit to give the person a chance to update or delete the message.
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

### Search

- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filters for unanswered questions, answered questions, and so forth.
- Filter by date.
- Show only conversations with unread messages.

### Markdown Editor

- Templates for questions (like GitHub Issues).
- Reuse answers.
- Paste tables from Excel and have them formatted as Markdown tables.

### Markdown Processor

- Code blocks don’t include the position information, so selecting text & quoting on an answer doesn’t work.
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

### Infrastructure

- Using `getConversation()` to enforce permissions may not be a great idea. It limits the number of search results in a weird way, that even leaks a bit of data. Also, it isn’t the most performant thing, probably (see point about n+1 queries). Maybe a better idea would be to `WHERE` the permissions everywhere, or use a database view.
- Performance:
  - Do the morphdom diff on the server (this is necessary for correctness as well; see what happens when you’re editing a message and a new message is submitted, causing a refresh).
  - Render views asynchronously.
  - Pre-render reusable CSS (for example, the design system) and move it out of every HTML.
  - Pre-render Markdown.
  - Look for more database indices that may be necessary.
  - n+1 queries:
    - Cases:
      - `getConversation()`.
      - `getMessage()`.
      - Treatment of @mentions in Markdown processor.
      - Finding which enrollments to notify (not exactly an n+1, but we’re filtering in JavaScript what could maybe filtered in SQL (if we’re willing to use the `IN` operator)).
    - Potential solutions:
      - Single follow-up query with `IN` operator (but then you end up with a bunch of prepared statements in the cache).
      - Use a temporary table instead of `IN`.
      - Nest first query as a subquery and bundle all the information together, then deduplicate the 1–N relationships in the code.
- Queue / background jobs:
  - Right now we’re using Node.js’s event queue as the queue. This is simple, but there are a few issues:
    - Jobs don’t persist if you stop the server and they haven’t have the chance of completing. This affects email delivery, notifications, and so forth.
    - If too many jobs are fired at once, there’s no protection in place, and it may exhaust resources.
- `try.courselore.org` (reference https://moodle.org/demo)
- Live updates: Try to come up with a solution that doesn’t require you requesting the page again, instead, just send the data in the first place.
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
- Auto-updater for self-hosted.
- Backups.
  - For us, as system administrators.
  - For users, who may want to migrate data from a hosted version to another.
    - Rewrite URLs in messages.
- Automated tests.
- In some situations, we’re unnecessarily updating the boolean fields in the database that are represented as dates. For example, `"tags"."staffOnlyAt"` on `PUT /courses/:courseReference/settings/tags`.
- Live updates with Server-Sent Events currently depend on the fact that we’re running in a single process. Use a message broker like ZeroMQ to support multiple processes.

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

- User groups.
- Landing page:
  - https://capacitorjs.com
  - Maybe hire a designer.
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
