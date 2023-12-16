# Changelog

> **Note:** You may be notified about new Courselore releases in the following ways:
>
> **Courselore:** Administrators of [self-hosted Courselore installations](self-hosting.md) see an “Update” button at the footer when a new version of Courselore is available.
>
> **GitHub Notifications:** Watch for releases in the [Courselore repository](https://github.com/courselore/courselore/) using the **Watch > Custom > Releases** option.
>
> **Atom Feed:** Subscribe to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom).
>
> **Email:** Use [CodeRelease.io](https://coderelease.io/) or sign up to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom) via services such as [Blogtrottr](https://blogtrottr.com/) or [IFTTT](https://ifttt.com).

## Unreleased

## 7.0.2

**2023-10-17 · [Download](https://github.com/courselore/courselore/releases/tag/v7.0.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added a message when people upload screenshots of code teaching them how to copy-and-paste the code while keeping syntax highlighting.

## 7.0.1

**2023-09-23 · [Download](https://github.com/courselore/courselore/releases/tag/v7.0.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added more logging to SAML errors to help investigate issues caused by updating to Courselore 7.0.0.

## 7.0.0

**2023-09-23 · [Download](https://github.com/courselore/courselore/releases/tag/v7.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

**This is a major release for the following reasons:**

1. If you setup the experimental support for SAML, then you must apply some changes to the configuration file.

   In particular, the following options are no longer supported:

   - `privateKey`
   - `signingCert`
   - `decryptionPvk`
   - `decryptionCert`
   - `maxAssertionAgeMs`

   And the following options are recommended:

   - `wantAuthnResponseSigned`
   - `wantAssertionsSigned`

   Refer to https://github.com/courselore/courselore/blob/1aaef74c7bfee6e85a47922abcc32636db262111/web/configuration/example.mjs for details.

2. You must run the Courselore executable by hand at least once to answer some prompts. We changed the way that Courselore manages keys for integrations including SAML and the upcoming LTI support. Previously you’d have to create keys and provide them to Courselore; now Courselore creates and manages keys internally.

   If you had already setup SAML, then when prompted you may wish to continue using the same keys and avoid having to rotate keys with Identity Providers. This is only possible if you had the same keys for signing and encryption, as moving forward Courselore will only have one keypair for both purposes. And it’s only possible with you had a single keypair for all the SAML Identity Providers, as moving forward will only have one keypair for the whole installation.

3. The ports that Courselore uses have changed. Besides ports 80 and 443, previously Courselore would bind to ports in the 6000–9000 range. Now Courselore binds to ports starting on 18000, and the number of ports depends on the number of processes, which ultimately depends on the number of CPU cores. If a port is unavailable, now Courselore will report with a friendly error message and propose to kill the other processes (as long as its run interactively instead of through a process manager).

---

Besides the breaking changes above, this version of Courselore also includes the following changes:

- Added a way for users to remove themselves from a course.
- Changed underline style (https://courselore.org/courses/8537410611/conversations/83).
- Allowed you to copy-and-paste image buffers (https://courselore.org/courses/8537410611/conversations/83).
- Fixed a missing header on `/help/styling-content` when you’re signed out.

## 6.2.1

**2023-08-09 · [Download](https://github.com/courselore/courselore/releases/tag/v6.2.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed an issue in which trying to see invitations for existing courses would cause a server error.
- Allow people to create a chat with only themselves: https://courselore.org/courses/8537410611/conversations/80
- Fixed some labels on course settings, for example, “Courses Participants” → “Course Participants”.
- Added Johns Hopkins as a SAML Identity Provider for courselore.org.

## 6.2.0

**2023-06-08 · [Download](https://github.com/courselore/courselore/releases/tag/v6.2.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the configuration for SAML. Please refer to https://github.com/courselore/courselore/blob/248863d9d069c890522219c6e6de01a60b9fa937/web/configuration/example.mjs for details. In particular:
  - The feature flag under `features` that hid all identity providers from the users has been replaced with the `public: false` attribute on a per-identity provider basis.
  - The `extractName` function has been replaced with `attributes`, which also needs to provide an email address.
  - **This is a breaking change, but we’re releasing it under a minor version instead of a major version because the SAML support is still experimental.**

## 6.1.3

**2023-06-05 · [Download](https://github.com/courselore/courselore/releases/tag/v6.1.3) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changes in terminology:
  - “Enroll in Course” → “Join Course” / “Enrollment” → “Course Participants”: Avoid students thinking that they got off the waiting list because they’re invited to Courselore.
  - “Staff” → “Course Staff”: Avoid people thinking that “Staff” includes, for example, department administrators.
- Improved the starting state of the `@mentions` and `#references` widgets. Instead of simply saying “Start typing to search”, they now give useful options, for example, the people who authored the most recent messages.
- Fixed glitches when dragging-and-dropping or copying-and-pasting folders and text into the content editor and avatar uploader.

## 6.1.2

**2023-05-23 · [Download](https://github.com/courselore/courselore/releases/tag/v6.1.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added a way for staff members to export questions as JSON for research.

## 6.1.1

**2023-05-19 · [Download](https://github.com/courselore/courselore/releases/tag/v6.1.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Introduced Rich-Text Pasting, which allows you to paste formatted text, spreadsheets, and so forth, directly into the content editor and preserve the formatting.
- Introduced “Staff Whispers”, which are messages visible by staff only. Staff Whispers may be used, for example, to discuss how to answer a student’s question.
- Introduced “Follow-Up Questions”, which are a new type of message in conversations of type “Question”, in addition to the existing message type of “Answer”. This helps tell apart messages simply saying “thanks for the answer” from messages that require some further action.
- User interface improvements:
  - Conversation participants
    - Updating participants no longer requires you to click on the “Update Participants” button. The action is performed as soon as you close the dropdown menu.
    - When updating from “Everyone” to “Staff”/“Selected People”, or “Staff” to “Selected People” preselect as “Selected People” the people who have participated with at least one message in the conversation, so that they don’t lose access to it. This covers the use case in which a student creates a question in which “Conversation Participants” is “Everyone”, but as a staff member you’d like to change that to “Staff” without removing the student from the conversation.
    - Added explanatory text “+ Selected Students” when setting conversation participants to “Staff”.
  - When you visit Courselore, instead of showing a list of courses, redirect you to the most recently visited course/conversation.
  - New Note: When changing “Participants”, make it “Not an Announcement” and “Unpinned”.
  - Fixed glitches in `@mentions`/`#references` widget
  - `@mention` widget: Sort by people who have most recently participated in the conversation.

## 6.1.0

**2023-04-20 · [Download](https://github.com/courselore/courselore/releases/tag/v6.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added support for single sign-on and single logout with the credentials of educational institutions via SAML.

  See https://github.com/courselore/courselore/blob/8dc06fdfc8760f42f477984543d9058bfc2b27f5/web/configuration/example.mjs for instructions on how to configure it.

  This is the first experimental feature that we release under a feature flag, because it depends on external systems (the identity providers of educational institutions). You may test single sign-on by going to `https://your-domain.edu/saml` and when everything is working show the single sign-on options to your users by enabling the `saml` feature flag in your configuration file (see https://github.com/courselore/courselore/blob/8dc06fdfc8760f42f477984543d9058bfc2b27f5/web/configuration/example.mjs for instructions on how to enable the feature flag).

  Please report back your experience to the Courselore developers at <https://meta.courselore.org> or <development@courselore.org>.

  > Note: As a consequence of introducing SAML, when this version of Courselore is deployed all users will be signed out.

- Fixed styling issues on scrollbars.
- Added a sign out button to the screen asking you to confirm your email for the case in which you’re in a public computer where you don’t have access to your email and you need to sign out.

## 6.0.11

**2023-03-16 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.11) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added polls.

## 6.0.10

**2023-02-28 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.10) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Redesigned the page in which you manage tags to make it more compact.
- Added a list of programming languages supported by the syntax highlighter in the “Styling Content” help page.
- Fixed an issue in which relative dates could be mistakenly shown as “yesterday” (https://courselore.org/courses/8537410611/conversations/71).

## 6.0.9

**2023-02-18 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.9) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added the possibility of reordering tags.

## 6.0.8

**2023-02-10 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.8) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed an issue in which the image/video proxy could lead to execution of untrusted JavaScript. **This is a security issue so we recommend you to update as soon as possible.** We have no report of this issue having been explored by attackers.
- Added the possibility of a user removing their account.

## 6.0.7

**2023-02-01 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.7) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed message drafts from being stored in the browser to being stored in the server. This allows you to, for example, start drafting a message on the phone and finish it on the desktop.
- Changed preferences such as whether Programmer Mode is enable in the content editor from being stored in the browser to being stored in the server. This makes the preferences consistent across devices.
- Staff members can see who’s currently typing in a conversation.
- Added a new administration page to see all courses.

## 6.0.6

**2023-01-27 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.6) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Redesigned the content editor.
  - The toolbar occupies less space and doesn’t need horizontal scrolling. (At the cost of some options being two clicks away instead of one.)
  - The toolbar has more options, for example, insertion/deletion, superscript/subscript, and so forth.
  - The toolbar is available on chats. (Previously you had to: 1. know the syntax; and 2. upload attachments by dragging-and-dropping or copying-and-pasting. Now everything is much more discoverable.)
  - Changed the content sanitization to be more restrictive. Before we were using GitHub’s sanitization, which is too permissive in some areas (for example, allowing deprecated HTML tags and allowing some attributes that affect appearance and could break Courselore’s layout).
  - Changed the `@mention` and `#reference` widgets to show up and hide more intelligently as you’re typing.
  - Added a help page to explain how to use Markdown with a couple examples.
  - Fixed some layout issues in certain kinds of content, for example, vertical rhythm of list items.
- In relative dates (for example, “14 days ago”), the tooltip shows not only the original time in UTC, but in local time as well.
- Fixed the link in email notifications that directs the user to update notifications preferences. https://courselore.org/courses/8537410611/conversations/68

## 6.0.5

**2023-01-18 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.5) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Improved the performance across the application, particularly on big pages, by extracting client CSS/JavaScript and serving them as static files.

## 6.0.4

**2022-12-16 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.4) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Improved the performance of long conversations for staff by lazy loading the “Edit Message” panel.

## 6.0.3

**2022-12-15 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.3) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added support for animated GIFs and videos.
- Improved the performance of images by using WebP.

## 6.0.2

**2022-12-13 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added a way to “Reuse” a conversation or message across courses.
- Improved the performance of the conversations page by lazy loading some dropdown menus.
- Fixed a rare race condition in which the browser could try to open a Live-Connection to the server before the original request was closed, which would crash the server process.

## 6.0.1

**2022-12-03 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Improved the performance by a factor of approximately 2 by optimizing the way we render HTML/CSS/(client-side)JavaScript.
- Fixed an issue in which code blocks nested in other tags (for example, `<div>CODE BLOCK</div>`) would not be syntax highlighted.
- Introduced infrastructure for developers to measure performance and profile the application.

## 6.0.0

**2022-11-19 · [Download](https://github.com/courselore/courselore/releases/tag/v6.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

**This is a major release for the following reasons:**

1. Before this update, Courselore used the following network ports: 80, 443, and 4000. Now Courselore uses the following network ports: 80, 443, and 6000–9000. If you have other application occupying those ports, you may need to adapt them. In general, to avoid these kinds of issues, we recommend that Courselore is the only application running in the machine. Or, if you must, use containers to separate applications and give Courselore its own container.

2. We introduced changes to the Courselore configuration file that require your intervention.

   You may refer to [`example.mjs`](https://github.com/courselore/courselore/blob/v5.0.0/web/configuration/example.mjs) and adapt your configuration based on it. In particular, the following has changed:

   1. The `sendMail` configuration property has been renamed to `email`.

   2. The boilerplate around the configuration has been simplified. Instead of using functions and special `import`s, the configuration is just a JavaScript module exporting a configuration object.

   We expect this configuration file format to be valid for longer and we expect to have fewer updates that require your intervention in the future.

3. Courselore has been through a significant rearchitecture. This update may include some issues that we haven’t detected yet in our testing. Please monitor your installation more closely than normal after the update and report any issues you encounter.

---

Details about Courselore’s significant rearchitecture:

Previously there was a single Node.js process that was responsible for everything in the application, including serving requests and working on background jobs that would determine who should receive email notifications for messages, deliver email, clean the database of expired data (for example, expired user sessions), and so forth.

That’s a simple architecture, but it has two issues:

1. The server may take longer to respond to a request because it’s busy with background jobs.
2. A single process is allocated in a single CPU core, so it doesn’t use the machine resources as well as it should.

We fixed these issues in Courselore 6.0.0 by doing the following:

1. Now there are different kinds of processes for serving requests and working on background jobs. The server process is dedicated to responding to requests as fast as possible.
2. We start multiple processes of each kind—one per CPU core.

This kind of change had repercussions across the codebase, which now must deal with issues including supervising the multiple processes, dealing with edge cases in case some processes are unavailable, allowing processes to communicate with one another (for example, when a user creates an account, the server process has to start a job in a worker process immediately to send the “welcome” email), and so forth.

Overall, this makes Courselore’s codebase a bit more complex for beginner contributors, but we expect that the performance and availability benefits will offset that.

---

In the process of bringing this rearchitecture about, we improved many smaller things, including:

1. Previously some pages would keep two open connections between browser and server. One to detect that the user is online, to notify of server updates, and so forth. And another to receive page updates in case, for example, someone has sent a message.

   Now we keep a single connection open to service all these needs. This should increase the number of users that a server can support, and slightly improve the performance overall.

2. We changed the way middleware is installed in the Node.js server, simplifying the TypeScript declarations and the codebase overall, and making Courselore a bit more welcoming to beginner contributors.

3. We changed the way we detect that a user is online and now the little green dot under their avatar is more reliable.

4. We introduced [variables fonts](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Fonts/Variable_Fonts_Guide), which reduce the number of files that have to be downloaded by the browser and speed up the initial loading.

---

We also changed the behavior of archived courses.

Previously archived courses would reject new actions, for example, sending new messages.

Now those actions are allowed, and the only effect of archiving a course is making it less apparent on the course switcher in the user interface.

The reason for this change is that for the most part people don’t participate in archived courses, but it sometimes be necessary to do it, and it could be annoying to unarchive a course momentarily just for this. For example, a staff member may want to contact certain students of an archived course in a later semester to invite them to become course assistants.

## 5.0.0

**2022-10-13 · [Download](https://github.com/courselore/courselore/releases/tag/v5.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

**This is a major release because we introduced changes to the Courselore configuration file that require your intervention as a system administrator.**

1. In your configuration file, you may have a line similar to the following:

   ```javascript
   (await courseloreImport("../configuration/base.mjs")).default({
   ```

   You must change this line to add another `../` to the path:

   ```javascript
   (await courseloreImport("../../configuration/base.mjs")).default({
   ```

2. In version 4.1.0 we renamed the configuration fields `host` & `alternativeHosts` to `hostname` & `alternativeHostnames`, but kept backwards compatibility, so `host` & `alternativeHosts` continued to work. In version 5.0.0 the old names no longer work, and you must update to `hostname` & `alternativeHostnames`.

Alternatively, you may refer to [`example.mjs`](https://github.com/courselore/courselore/blob/v5.0.0/web/configuration/example.mjs) and restart your configuration from scratch.

---

These changes to the configuration file are relatively minor, but were caused by a major restructuring of the codebase to allow for significant internal improvements. Here are some of the highlights:

- Previously, we served static files such as CSS & JavaScript as a collection of several small files. We were relying on HTTP/2 multiplexing to speed things up, but as it turns out, [even with HTTP/2 multiplexing that strategy isn’t the best](https://www.smashingmagazine.com/2021/09/http3-practical-deployment-options-part3/). Now Courselore is bundling CSS & JavaScript into single files. In our tests this led to an 2x improvement when first visiting a page without cache.
- Restructured the cache-busting mechanism to allow for caches to be reused even across different versions of Courselore—as long as the files haven’t changed, of course.
- Reenabled HTTP/3, [which should improve the performance for people whose internet connection isn’t very reliable](https://www.smashingmagazine.com/2021/08/http3-core-concepts-part1/). Fixed the bad interactions between HTTP/3 and Firefox.

## 4.1.6

**2022-10-04 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.6) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed an issue that was reducing the size of non-High-DPI images. (<https://courselore.org/courses/8537410611/conversations/58>)
- Fixed an issue that was causing Firefox to show “Failed to connect to the Courselore server.” for a moment during reload. (<https://courselore.org/courses/8537410611/conversations/57?messages%5BmessageReference%5D=22>)

## 4.1.5

**2022-09-29 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.5) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Turned off HTTP/3 to try and solve issues in which Firefox refuses to make requests.

## 4.1.4

**2022-09-29 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.4) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed an issue in the treatment of Live-Updates (the technology that updates a page, for example, when a new message is sent to you) that made the server crash.

## 4.1.3

**2022-09-28 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.3) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed a mysterious issue in Firefox that caused people to see an error message: “Failed to connect to the Courselore server.”

  It only occurs when half a dozen seemingly arbitrary specific circumstances align. To the best our knowledge seems to be an issue in Firefox, which isn’t sending requests for calls to `fetch()`.

  The solution is equally vexing: to set `cache: "no-store"` in the call to `fetch()` 🤷

## 4.1.2

**2022-09-27 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Improved the performance of many actions in the conversations page by prioritizing giving feedback to the person who performed that action over updating the page for other people who are on that conversation (our so-called **Live-Updates**).
- [Fixed an issue in which dragging-and-dropping text (as opposed to a file) into the content editor would result in an error.](https://courselore.org/courses/8537410611/conversations/47?messages%5BmessageReference%5D=5)

## 4.1.1

**2022-09-26 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the behavior of messages posted in conversations that are **Announcements**. Before, these messages behaved differently in that they would trigger immediate email notifications. The idea was that these would be follow-ups to the announcement. But in practice it seems that some of these messages are actually from students asking follow-up questions to the announcement. So now these messages are treated normally, and only the original announcement receives the special treatment when it comes to email notifications.
- [Added support for HTTP/3 and improved the performance of serving static files, for example, images, stylesheets, attachments, and so forth.](https://github.com/caddyserver/caddy/releases/tag/v2.6.0)
- Introduced [cache-busting](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#immutable) to speed up loading of images, stylesheets, and so forth. This completes the treatment of the cache control policy started in Courselore version 4.1.0.

## 4.1.0

**2022-09-21 · [Download](https://github.com/courselore/courselore/releases/tag/v4.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Introduced a backwards-compatible change to the configuration file.**

  We recommend that you take action and update your configuration file, but existing configuration files will continue to work until the next major version (5.0.0).

  We renamed the `host` & `alternativeHosts` configuration fields to `hostname` & `alternativeHostnames` (see [`example.mjs`](https://github.com/courselore/courselore/blob/v4.1.0/configuration/example.mjs)). This follows [the Node.js naming convention for parts of an URL](https://nodejs.org/dist/latest-v18.x/docs/api/url.html#url-strings-and-url-objects) and reflects the intent that Courselore must be run from the default ports (80 for HTTP & 443 for HTTPS).

- Fixed an issue in which Google Chrome users would see a “validation error” when trying to change the attributes of a conversation, for example, “pinning” a conversation.

  <details>
  <summary>The Investigation behind This Issue Is Fascinating</summary>

  This was a really difficult issue to fix, because it only occurred under very specific circumstances, and even though we found a solution, we still don’t know what caused the issue in the first place.

  Here’s what we know:

  - The issue only occurred in Google Chrome.

    At one point we thought it could be related to a slightly outdated version of Google Chrome, because that was the version used by the people who reported the issue. The investigation of this hypothesis was troublesome because [installing specific versions of Google Chrome is made difficult on purpose](https://www.chromium.org/getting-involved/download-chromium/#downloading-old-builds-of-chrome-chromium). The idea is to keep everyone on the latest and most secure version, which is a valid consideration, but does complicate things for developers.

    In the end, it turns out that the issue occurred at least from version 102.0.50005.61 to version 105.0.5195.125 (the most recent version at the time of this writing).

  - The issue only occurred on some actions, for example, pinning a conversation or setting a note as an announcement.

    Notably, the issue did **not** occur on similar actions that exercise similar parts of the codebase, for example, setting a message as an answer to a question.

    We still don’t understand why that’s the case.

  - The issue only occurred when accessing Courselore through the internet.

    Importantly, it did **not** occur when accessing Courselore directly from a development machine or via a Local-Area Network (LAN).

    And surprisingly, the issue **did** occur when accessing Courselore from a development machine when going through a tunnel that passes the network traffic through the internet.

    We still don’t understand why that’s the case.

  - The issue only occurred if the conversation page had live-updates enabled.

    Live-updates are the system that shows updates in real-time, for example, updating the page when someone else sends you a message.

    We still don’t understand why that’s the case.

  - By looking at the server logs while the issue was being reproduced, it appears that Google Chrome was sending the same request twice.

    On the first request, the action would be performed, for example, the conversation would be pinned. On the second request, the server would respond with an error message, because the person would be trying to pin a conversation that was already pinned. That’s why the action would be performed successfully, but the user would see an error message.

    We still don’t understand why that’s the case.

  - Surprisingly, looking at the browser logs, Google Chrome only reported sending one request.

    We still don’t understand why that’s the case.

  - Looking at the browser logs to check the requests made by Google Chrome was tricky in the first place, and for some time during the investigation the developers of Courselore couldn’t reproduce the issue locally because of this. It turned out that opening the developer tools disabled the cache (that’s a setting you may turn on and off), and if the cache was disabled then the issue would not occur.

    We still don’t understand why that’s the case.

  This last quirk was a hint at the underlying cause of the issue: Google Chrome was acting weird with respect to caching.

  It used to be the case that Courselore used the [`no-cache` cache control policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-cache). This policy allows the browser to use material from the cache, but only after having checked with the server that there isn’t a newer version of that material.

  The `no-cache` cache control policy is a good compromise between being able to use the browser cache to speed things up while avoiding stale resources. Generally, HTML pages are cache misses, because their content changes fast; and assets such as images, fonts, stylesheet, and so forth, are cache hits until Courselore is updated to a new version.

  Perhaps Google Chrome is getting confused about how to handle the “is this resource fresh or can I used the cache?” kind of request.

  In any case, **the solution was to change the cache control policy to [`no-store`](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#no-store)**, in which the browser isn’t allowed to use the cache at all—it isn’t even supposed to store pages in the cache in the first place.

  To keep things fast, we apply the `no-store` cache control policy only to HTML pages. Other assets such as images, fonts, stylesheet, and so forth continue to use the `no-cache` cache control policy. Hopefully that won’t cause problems with Google Chrome.

  And to make things even better, now attachments & user avatars use the [`immutable` cache control policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control#immutable), which allows the browser to use the cache without checking with the server. That’s possible because users may not change existing attachments & user avatars, even though they may upload new ones.

  </details>

## 4.0.15

**2022-09-17 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.15) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed a [security issue](https://fortbridge.co.uk/research/a-csrf-vulnerability-in-the-popular-csurf-package/) related to [CSRF](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).**

  The issue could affect Courselore installations running under domains that had untrusted applications running in subdomains, for example, if Courselore was running at `courselore.example.com` and there was an untrusted application running at `untrusted.courselore.example.com`. This situation could lead to cookie tossing, which combined with reading CSRF tokens from query parameters could lead to a successful CSRF attack.

  We have no report of this having been explored by attackers.

  The source of the issue was relying on the [`csurf` package](https://github.com/expressjs/csurf) for CSRF protection. Since the issue has been reported, the `csurf` package was deprecated and now Courselore implements its own CSRF protection using [custom headers](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers). In the future we will add [synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) as added security against poorly-behaved clients that allow for custom headers in cross-site requests (for example, old versions of Flash & some PDF readers).

## 4.0.14

**2022-09-16 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.14) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed an issue in which sessions wouldn’t be closed on the server properly on sign-out.**

  The server would clear the session cookie on the browser, so the user would be signed out, but the server didn’t dispose of the session properly, so if the session was compromised the attacker would continue to have access to it even after a sign-out.

  We fixed the issue, so when a user signs out we invalidate the session on the server.

  Even though we have no reports of this issue having been explored by attackers, in an abundance of caution this update invalidates all user sessions. This means that **users will be signed out after this update and will have to sign in again**.

- **Fixed an issue in which cookies set by Courselore would be accessible by subdomains.**

  Courselore was setting cookies with the `Domain` option, which makes cookies accessible by subdomains. This is a security concern for installations running under `sub-domain.example.com` if there’s an untrusted application running at `sub-sub-domain.sub-domain.example.com`, which could read user sessions.

  Now Courselore doesn’t use the `Domain` option, which makes the cookie bound to the exact origin under which Courselore is running.

  Additionally, we now use the `__Host-` prefix on cookies, which should mitigate cookie tossing attacks.

- Added a way for people to see who liked a message.
- Added a counter next to the separator for new messages in conversations you visited before (for example, “3 New”).
- Reduced the grace period between a message being sent and its email notifications being delivered from approximately 10 minutes to approximately 2 minutes. We may bring this grace period back up when the email notification digests are more fleshed out, or we may turn this into a user setting.

## 4.0.13

**2022-09-10 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.13) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed an issue in which students would have access to the list of people who viewed a message.**

  The issue was that URLs of the form `https://courselore.org/courses/5699921211/conversations/32/messages/3/views` were accessible by students (naturally, the user interface wouldn’t show this to students; they’d have to find out about it by some other mean, for example, digging through the Courselore source code).

  The solution was to restrict access to URLs of this form to staff.

  There’s an obscure edge case in which this could reveal to other students the identity of the author of an anonymous message:

  - Message 1 (2 views; you and student John Doe).
  - Message 2 (anonymous).

  If a student were to query the views of “Message 1” before this fix, they’d see John Doe as the other student, who by the process of elimination must have been the author of “Message 2”.

  As far as we know this hasn’t been explored in real-world use of Courselore, but **system administrators must update as soon as possible**.

- Show conversation participants on the sidebar, preventing having to go into the conversation itself. (If there’s only one other participant, for example, in a chat between two people, show the other person right away; if there are more participants, show a dropdown after hoovering for second.)
- Disabled the password reset workflow for users who are signed in.
- Changed the error messages on the authentication & invitation workflows (sign-in, sign-up, email verification, password reset, using an invitation, and so forth) to be more informative, even in a couple cases in which that reveals some of the internal state of the application.
- When updating email, only send an email to the previous address to inform of update if the previous address was verified. This fixes a subtle edge case in which the person mistyped their email and quickly fixed it, but the application would try to send one more email to the incorrect address, adding to the number of bounces and counting negatively towards deliverability.

## 4.0.12

**2022-09-07 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.12) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the default values of **Announcement** and **Pinned** in **New Note** from unchecked to checked. It appears that most of the time when a staff member creates a note they want it to be an announcement.
- Added a way for staff to change the anonymity of students conversations & messages. Previously only the students themselves could do that.
- Added a way for people to set conversations as anonymous. Previously they could only set the first message in the conversation as anonymous—the new behavior is more intuitive.
- Changed the following operations to notify the user via email: update email, update password, and reset password. These are important operations that, if performed by an attacker, must be acted on as soon as possible.

## 4.0.11

**2022-09-06 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.11) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed a security issue in which redirects would allow an attacker to create a link that looked legitimate but would redirect away from the application.** For example, `https://courselore.org/sign-in?redirect=.example.com/attack` would redirect to `https://courselore.org.example.com/attack`, which could be under the attacker’s control. This could have been used for scams & phishing. As far as we know the issue has **not** been explored in real attacks, but system administrators must update as soon as possible.
- Locked down the application to users who haven’t verified their emails. Previously, they could do almost everything, including enrolling on courses, starting conversations, and so forth. One of the few restrictions was that they wouldn’t receive email notifications. Now, we require email verification to do almost anything.

## 4.0.10

**2022-09-03 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.10) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added the notion of **Announcements**, which are a qualification on conversations of type **Note**. Announcements may only be created by staff, and they send everyone immediate email notifications that can’t be opted-out. (Note for Courselore users from spring 2022: These new **Announcements** are similar to our old notion of **Announcement**, but now they’re a qualification on conversations of type **Note** instead of being a type of conversation in of themselves.)
- Improved a subtle edge case on filters: Before, if you selected **Types: Question & Note**, and **Question Resolved: Resolved**, we would not include **Notes** in the filter results; now we do.
- Added a check in browsers for the server version: When the server is updated, people are notified that they must reload the page.
- Improved the detection that a user is offline: Before we would only detect that the user was offline when they tried to perform an action (for example, visit a link, submit a form, and so forth), or if they were on a page with live-updates (for example, a conversation page) and the live-updates connection to the server was broken. Now we keep a dedicated connection to the server at all times, and we’re able to detect when the user goes offline much faster and more reliably.
- Changed the subjects on email notifications: Before it was, for example, “When is Assignment 3 due? · Principles of Programming Languages · Courselore”; now it’s just the title of the conversation, for example, “When is Assignment 3 due?”. (Note that the course name & the server name, for example, “Principles of Programming Languages · Courselore”, are already part of the “From”.)
- Fixed an issue in which administrators of `courselore.org` could see a prompt to update to a new version even when running the latest version because of a race condition between publishing the new version to GitHub Releases and deploying to `courselore.org`.

## 4.0.9

**2022-09-01 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.9) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Fixed the newly-introduced underlines in Safari.

## 4.0.8

**2022-09-01 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.8) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the rendering of `~example~` to show up as-is, instead of doing a ~~strikethrough~~. The strikethrough is still achievable with two `~~`: `~~example~~`. The old behavior was equivalent to GitHub’s, while the new one is equivalent to Discord’s & Reddit’s. <https://courselore.org/courses/8537410611/conversations/48>
- Added toolbar button in content editor for strikethrough.
- Added support for underline in the content editor with `<u></u>`.
- Added `meta.courselore.org` redirect to Meta Courselore.

## 4.0.6

**2022-08-31 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.6) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the act of pinning of a conversation to bump the conversation to the top of the sidebar. <https://courselore.org/courses/8537410611/conversations/42>
- Changed the color of “Participants: Selected People” from rose (which may communicate “pay attention”) to purple (which is more neutral).
- Changed the color of the labels “New:” and “Quick Filters:” on the sidebar to stand out more.
- Changed the **Report an Issue > Meta Courselore** button on the footer to pre-fill the tag.
- Changed the “From” on email notifications to be, for example, “Principles of Programming Languages · Courselore” instead of “Courselore · Principles of Programming Languages”.

## 4.0.5

**2022-08-30 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.5) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed an issue that prevented users of Microsoft Outlook from resetting their passwords.**

  It used to be the case that Courselore would mark a password reset link as used as soon as it was visited. This is a very strict security policy. But it appears that Microsoft Outlook visits links included in emails before showing them to the user—perhaps in attempt to verify the safety of following those links. Naturally, this marked the password reset link as used before the user had a chance of visiting it.

  To fix this issue, we relaxed the security policy and only mark a password reset link as used when the user has finished resetting their password.

## 4.0.4

**2022-08-27 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.4) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Introduced the notion of **conversation participants** which allows for more control over who’s part of a conversation and enables workflows such as **Direct Messages**.

## 4.0.2

**2022-08-12 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the communication about the period of free hosting.

## 4.0.1

**2022-08-12 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added email notifications for conversations in which you participated, and conversations which you started.
- Changed email notifications so that they’re threaded per conversation.
- Added notification of updates for system administrators in Courselore itself.
- Added a delay between a message being sent and its email notifications being delivered, to leave time for edits.
- Redesigned sidebar & “New Conversation” form.

## 4.0.0

**2022-07-09 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

Courselore 4.0.0 introduces the notion of an administrative interface for you, system administrator. For now it includes only one setting, allowing you to control who’s able to create courses. Moving forward, we’ll have more settings for you to manage & collect statistics about your Courselore installation easily 🎉

Update to Courselore 4.0.0 with the following steps:

1. Make sure you, system administrator, have an account in Courselore. If you don’t have an account, create one before continuing. Even if you don’t intend on participating on courses, your user will be a system administrator.

2. Backup. Always backup before updates.

3. Update the configuration file according to `configuration/example.mjs`. Note how the configuration file is much simpler now, asking just for essential information. We hope that moving forward this will minimize the changes you’ll have to make to the configuration file, avoiding major and minor updates that demand more of your attention.

4. The first time you run Courselore after the update, run it manually from an interactive command line. Don’t run it from your process manager, for example, systemd. Courselore will prompt you for some information. When Courselore has started successfully you may shut it down and restart it using your process manager.

Enjoy!

## 3.3.0

**2022-05-27 · [Download](https://github.com/courselore/courselore/releases/tag/v3.3.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This minor release includes a non-breaking change to the configuration to allow third-party websites to embed images sent as attachments. This is necessary for Outlook (and perhaps other email clients) to show images in email notifications. Refer to <https://github.com/courselore/courselore/blob/v3.3.0/configuration/example.mjs> and apply the changes to your configuration accordingly.

## 3.2.0

**2022-05-12 · [Download](https://github.com/courselore/courselore/releases/tag/v3.2.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This release includes an optional but recommended [change to a header recently introduced in the configuration file](https://github.com/courselore/courselore/blob/v3.2.0/configuration/example.mjs#L38):

`Referrer-Policy same-origin` → `Referrer-Policy no-referrer`

## 3.0.0

**2022-04-30 · [Download](https://github.com/courselore/courselore/releases/tag/v3.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

People who self-host their own installation of Courselore on their server must update their configuration according to the example:

<https://github.com/courselore/courselore/blob/387512a00b5e59a8346153f0e5416bd265ec0e25/configuration/example.mjs>

In particular, the configuration of the reverse proxy (Caddy) changed to include headers that improve security & privacy.

## 2.1.0

**2022-04-09 · [Download](https://github.com/courselore/courselore/releases/tag/v2.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

In this minor release we introduce a backward-compatible but highly-recommended change to the configuration file: https://github.com/courselore/courselore/blob/f2475da6b0eb17b750cfad04f7c59a0d0f962daa/configuration/example.mjs#L54

This configuration line improves the cache management in the browser and prevents the use of old client-side JavaScript, CSS, fonts, images, and so forth.

## 2.0.0

**2022-03-05 · [Download](https://github.com/courselore/courselore/releases/tag/v2.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This release includes an overhaul in the architecture for better performance and maintainability. It requires changes to your configuration. You may either [start over with the new configuration example (recommended)](https://github.com/courselore/courselore/blob/c66f3b8f46f52d53bcb17f334ddd7b834070a25d/configuration/example.mjs) or [look at the changes and apply them to your existing configuration](https://github.com/courselore/courselore/compare/v1.2.10...c66f3b8f46f52d53bcb17f334ddd7b834070a25d#diff-1d4efc9a9a4c88b7dfd373d4aec08c68c4396f2c86211734014124d8aa12d3c3).

## 1.2.0

**2022-01-31 · [Download](https://github.com/courselore/courselore/releases/tag/v1.2.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

We made a backwards-compatible improvement to logging that requires you to change your configuration file. Please refer to https://github.com/courselore/courselore/blob/3b102a6c2a9e8658dcd12e0bf99d4b078a7b6723/configuration/example.mjs and make the appropriate adjustments.

## 1.1.0

**2022-01-27 · [Download](https://github.com/courselore/courselore/releases/tag/v1.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

We made a backwards-compatible improvement to the configuration to more gracefully close resources (for example, database connections) on shutdown. Refer to https://github.com/courselore/courselore/blob/0b26b4c3bf7f0807fdf1dac91e10d5a1f45dbcc1/configuration/example.mjs#L65-L82 and update your configuration.

## 1.0.0

**2022-01-22 · [Download](https://github.com/courselore/courselore/releases/tag/v1.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This is the first release of CourseLore that’s meant for self-hosting by the larger community. The deployment process & configuration scheme are fixed, and any backward incompatible changes will only occur on major releases.

There are still some known issues, and if you’re planning on using v1.0.0 you should expect to update often. If you’re an early adopter, you should join us on [Meta CourseLore](https://courselore.org/courses/8537410611/invitations/3667859788).

## 0.9.0

**2022-01-16 · [Download](https://github.com/courselore/courselore/releases/tag/v0.9.0) · For early adopters.**

Contact <self-hosting@courselore.org> if you want to use this.
