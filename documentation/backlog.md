# Backlog

## Finish

- Reviewed up to `63ab51c381cc94ad8b6f0f46acffd7c90a4c1db5`

**SAML**

- Implementation
  - Sign up with SAML
    - Passwords
      - Allow user to create a password after the fact
        - Security concern: When creating a password, you can’t verify that you are yourself by typing in your old password.
          - Perhaps just use the password reset workflow, which sends an email instead?
      - Insist on administrators having a password
    - Allow people to disconnect the SAML identity from their account? (As long as they have a password?)
    - Interactions with email verification
    - Revisit uses of `passwordConfirmation` to deal with `null` passwords
    - Help pages for people who end up with two accounts.
      - Move help pages near where they’re useful in the codebase, instead of having a dedicated `help.mts` file
  - Trying to change your email when you have signed up via SAML and don’t even have a password
  - Sign out
    - `SameSite=none`
      - I remember that perhaps `.clearCookie()` needs the same `options` as `.cookie()` used to begin with, but I tested and it works. Just in case, double-check the documentation.
    - Initiated in Courselore: Sign out of Courselore only (leaving you signed in to the identity provider) or single sign out? Single sign-out.
  - Invitations and their links to sign-in/sign-up and prefilled form data.
  - Identity-provider initiated sign in, but you’re already signed in
    - And to a different account.
  - Signatures & encryption on requests & responses
  - Send an email saying “You signed in from a new device”
  - Different `NameIdFormat`s
  - Finalize configurations:
    - `development.mjs`
    - `example.mjs`
      - The keys must stay the same, because they’ll be stored in the database?
      - Don’t set for service provider:
        - `issuer`
        - `callbackUrl`
      - But you may provide:
        - `decryptionCert`
        - `signingCert`
        - (For `generateServiceProviderMetadata()`)
      - Logo should be:
        - Transparent
        - WebP
          - `npx sharp-cli -i johns-hopkins.png -o johns-hopkins.webp`
        - Immutable
        - A certain size around 300px of width
      - `/saml/<identifier>/metadata`
    - `courselore.org.mjs`
  - Have a way for system administrators to turn off sign in via email and password
- Testing tools
  - Lightweight
    - **https://github.com/mcguinness/saml-idp**
    - https://github.com/boxyhq/mock-saml
    - https://github.com/Clever/saml2
    - https://github.com/auth0/node-samlp
    - https://github.com/bjorns/mock-idp
  - Enterprisy
    - https://www.shibboleth.net
    - https://www.keycloak.org
  - As a service
    - https://mocksaml.com
    - https://auth0.com
- Implementation tools
  - https://github.com/tngan/samlify
  - https://github.com/Clever/saml2
  - https://github.com/node-saml/node-saml
  - https://github.com/auth0/node-saml
  - https://github.com/auth0/node-samlp
  - https://github.com/auth0/samlp-logout
  - https://github.com/node-saml/passport-saml
    - http://www.passportjs.org/packages/passport-saml/
    - https://github.com/jwalton/passport-api-docs
    - https://github.com/gbraad/passport-saml-example/
  - https://github.com/boxyhq/jackson (OAuth proxy)
  - https://github.com/simov/grant (OAuth)
  - https://github.com/ianstormtaylor/permit (for APIs)
- Examples
  - https://www.gradescope.com/saml
  - https://cs280fall20.github.io/jhu-sso/index.html
  - https://www.samltool.com/generic_sso_req.php
  - https://www.samltool.com/generic_sso_res.php
- Documentation
  - https://developer.okta.com/docs/concepts/saml/
  - https://github.com/authenio/react-samlify/blob/d36744c53f979e376b6380ae5368dd1ed70172a4/middleware/index.ts
    - https://github.com/authenio/react-samlify/blob/d36744c53f979e376b6380ae5368dd1ed70172a4/server.ts
  - https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html
- Johns Hopkins SAML
  - Ask Ali for an example of Hopkins request and response
  - Get an alumni account
  - Contact the Enterprise Auth team
    - http://www.it.johnshopkins.edu/services/directoryservices/jhea/Shibboleth/
    - enterpriseauth@jhmi.edu
  - Metadata https://idp.jh.edu/idp/shibboleth
    - Username: req.user.username (your JHED ID)
    - Affiliation: req.user.user_field_affiliation (either STUDENT, FACULTY or STAFF)
    - Job title: req.user.user_field_job_title (e.g. mine comes up as LECTURER)
    - Last name: req.user.last_name
    - First name: req.user.first_name
    - Given name: req.user.given_name
    - Email: req.user.email
  - URL to redirect to: https://idp.jh.edu/idp/profile/SAML2/Redirect/SSO
  - Example of service provider metadata https://glacial-plateau-47269.herokuapp.com/jhu/metadata
  - When creating the SAML request in the first place, is the identity provider receiving the cookies (necessary if they’re already signed in to the identity provider)?
- Swarthmore
  - https://sid.swarthmore.edu/idp/shibboleth
- Questions to confirm with other people
  - We don’t need email verification when signing up with SAML, right?
- Later
  - When there are many universities, add a filter, similar to Gradescope has, and similar to what we do in the list of enrollments.
  - Add support for `HTTP-POST` in addition to `HTTP-Redirect`
  - Long SAML identity provider name may break the interface (use ellipsis to fix it?)
  - Add support for other `nameIDFormat`s
    - Store in database: `samlIdentifier`, `nameIDFormat`, and `nameID`
    - Dealing with transient `nameID`s is tricky
  - Add support for `emailAdress`es that doesn’t follow our more strict rules for email address format
  - Sign up with SAML if identity provider doesn’t provide a name
    - Create a session without a user, but with an email address instead.
      - It doesn’t have to use a cookie, it can be a short-lived session as a `hidden` field in the form, similar to password reset.
        - `flashes`
          - Yes
        - `sessions`
          - No, because token is long-lived, sliding, and there’s a foreign key to the `user`
        - `passwordResets`
          - No, because there’s a foreign key to the `user` (but the concept o `nonce` is what we want)
        - `emailVerifications`
          - No, because there’s a foreign key to the `user` (but the concept o `nonce` is what we want)
    - Create user interface with form for name (and other data we might want to ask from the user)
    - Create the backend that makes sign up with SAML work.
      - Reuse the existing sign-up route, or create a new one?
    - Make invitation name & email work as well?

---

- Use `node --test` in other projects: look for uses of the `TEST` environment variable
- Some `setTippy()`s don’t need the `event`, for example, those inside an `.onclick`. In fact, the `event` may be problematic because it’s the `event` in the closure of when the `.onclick` was set, and it’ll be passed down to `morph()` and `execute()`, which may lead to issues.

**DateTimePicker**

- Uses
  - Invitation `expiresAt`
  - Poll `closesAt`
- State
  - Year
  - Month
  - Selected day
  - Today
  - Hours
  - Minutes
- Internal dateTimePicker state may be different from input, because, for example, you’re navigating between months/years to pick a day.

```
  import html from "@leafac/html";



leafac.setTippy({
                          event,
                          element: this,
                          elementProperty: "dateTimePicker",
                          tippyProps: {
                            trigger: "click",
                            interactive: true,
                            onShow: () => {
                              const dateTimePicker = this.dateTimePicker.props.content.querySelector('[key="date-time-picker"]');
                              const date = leafac.UTCizeDateTime(this.value) ?? new Date();
                              dateTimePicker.year = date.getFullYear();
                              dateTimePicker.month = date.getMonth();
                              dateTimePicker.day = date.getDate();
                              dateTimePicker.hours = date.getHours();
                              dateTimePicker.minutes = date.getMinutes();
                              dateTimePicker.render();
                              dateTimePicker.partialParentElement = true;
                            },
                            content: html\`
                              <div
                                key="date-time-picker"
                                javascript="\${${javascript`
                                  this.render = () => {
                                    leafac.morph(this, html\`
                                      <div
                                        css="\${${css`
                                          display: flex;
                                          flex-direction: column;
                                          gap: var(--space--2);
                                        `}}"
                                      >
                                        <div
                                          css="\${${css`
                                            display: flex;
                                            align-items: baseline;
                                            gap: var(--space--4);
                                            & > * {
                                              display: flex;
                                              gap: var(--space--2);
                                            }
                                          `}}"
                                        >
                                          <div>
                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              javascript="\${${javascript`
                                                this.onclick = () => {
                                                  const dateTimePicker = this.closest('[key="date-time-picker"]');
                                                  dateTimePicker.year -= 1;
                                                  dateTimePicker.render();
                                                };
                                              `}}"
                                            >
                                              <i class="bi bi-chevron-left"></i>
                                            </button>
                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              css="\${${css`
                                                min-width: var(--space--12);
                                                text-align: center;
                                              `}}"
                                              javascript="\${${javascript`
                                                leafac.setTippy({
                                                  event,
                                                  element: this,
                                                  elementProperty: "dropdown",
                                                  tippyProps: {
                                                    trigger: "click",
                                                    interactive: true,
                                                    onShow: () => {
                                                      const element = this.dropdown.props.content.querySelector('[key="date-time-picker--years-dropdown"]');
                                                      element.scrollTo(0, element.scrollHeight / 3);
                                                    },
                                                    content: html\`
                                                      <div
                                                        key="date-time-picker--years-dropdown"
                                                        class="dropdown--menu"
                                                        css="\${${css`
                                                          max-height: var(
                                                            --space--40
                                                          );
                                                          overflow: auto;
                                                        `}}"
                                                      >
                                                        $\${(() => {
                                                          const dateTimePicker = this.closest('[key="date-time-picker"]');
                                                          let options = html\`\`;
                                                          for (let year = dateTimePicker.year - 10; year <= dateTimePicker.year + 10; year++)
                                                            options += html\`
                                                              <button
                                                                type="button"
                                                                class="dropdown--menu--item button \${year === dateTimePicker.year ? "button--blue" : "button--transparent"}"
                                                                javascript="\${${javascript`
                                                                  this.onclick = () => {
                                                                    const dateTimePicker = this.closest('[key="date-time-picker"]');
                                                                    const year = Number(this.textContent);
                                                                    dateTimePicker.year = year;
                                                                    dateTimePicker.render();
                                                                  };
                                                                `}}"
                                                              >
                                                                \${String(year)}
                                                              </button>
                                                            \`;
                                                          return options;
                                                        })()}
                                                      </div>
                                                    \`,
                                                  },
                                                });
                                              `}}"
                                            >
                                              \${String(this.year)}
                                            </button>
                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              javascript="\${${javascript`
                                                this.onclick = () => {
                                                  const dateTimePicker = this.closest('[key="date-time-picker"]');
                                                  dateTimePicker.year += 1;
                                                  dateTimePicker.render();
                                                };
                                              `}}"
                                            >
                                              <i class="bi bi-chevron-right"></i>
                                            </button>
                                          </div>
                                        </div>

                                        <table
                                          key="date-time-picker--calendar"
                                        >
                                          <tr><td>CALENDAR</td></tr>
                                        </table>

                                        <div>TIME</div>
                                      </div>
                                    \`);
                                    leafac.execute({ element: this });
                                  };
                                `}}"
                              ></div>
                            \`,
                          },
                        });








<select
  class="button button--tight button--tight--inline button--transparent"
  css="\${${css`
    min-width: var(--space--12);
    text-align: center;
  `}}"
  javascript="\${${javascript`
    this.onchange = () => {
      const dateTimePicker = this.closest('[key="datetime-picker"]');
      dateTimePicker.year = Number(this.value);
      dateTimePicker.render();
    };
  `}}"
>
  $\${(() => {
    const dateTimePicker = this.closest('[key="datetime-picker"]');
    let options = html\`\`;
    for (let year = dateTimePicker.year - 10; year <= dateTimePicker.year + 10; year++)
      options += html\`
        <option value="\${String(year)}" \${year === dateTimePicker.year ? html\`selected\` : html\`\`}>\${String(year)}</option>
      \`;
    return options;
  })()}
</select>



                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              javascript="${javascript`
                                                this.onclick = () => {
                                                  const dateTimePicker = this.closest('[key="datetime-picker"]');
                                                  dateTimePicker.date.setFullYear(dateTimePicker.date.getFullYear() + 1);
                                                  dateTimePicker.render();
                                                };
                                              `}"
                                            >
                                              <i
                                                class="bi bi-chevron-right"
                                              ></i>
                                            </button>


                                            <div>
                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              javascript="${javascript`
                                                this.onclick = () => {
                                                  const dateTimePicker = this.closest('[key="datetime-picker"]');
                                                  dateTimePicker.date.setMonth(dateTimePicker.date.getMonth() - 1);
                                                  dateTimePicker.render();
                                                };
                                              `}"
                                            >
                                              <i class="bi bi-chevron-left"></i>
                                            </button>
                                            <div
                                              css="${css`
                                                width: var(--space--20);
                                                text-align: center;
                                              `}"
                                              javascript="${javascript`
                                                this.textContent = new Intl.DateTimeFormat("en-US", {
                                                  month: "long",
                                                }).format(this.closest('[key="datetime-picker"]').date);
                                              `}"
                                            ></div>
                                            <button
                                              type="button"
                                              class="button button--tight button--tight--inline button--transparent"
                                              javascript="${javascript`
                                                this.onclick = () => {
                                                  const dateTimePicker = this.closest('[key="datetime-picker"]');
                                                  dateTimePicker.date.setMonth(dateTimePicker.date.getMonth() + 1);
                                                  dateTimePicker.render();
                                                };
                                              `}"
                                            >
                                              <i
                                                class="bi bi-chevron-right"
                                              ></i>
                                            </button>
                                          </div>











const extractStaticCSSAndJavaScript = () => ({
  ImportDeclaration(path) {
    if (
      (path.node.specifiers[0]?.local?.name === "css" &&
        path.node.source?.value === "@leafac/css") ||
      (path.node.specifiers[0]?.local?.name === "javascript" &&
        path.node.source?.value === "@leafac/javascript")
    )
      path.remove();
  },

  TaggedTemplateExpression(path) {
    switch (path.node.tag.name) {
      case "css": {
        const css_ = prettier.format(
          new Function(
            "css",
            `return (${babelGenerator.default(path.node).code});`
          )(css),
          { parser: "css" }
        );
        const identifier = baseIdentifier.encode(
          xxhash.XXHash3.hash(Buffer.from(css_))
        );
        if (!staticCSSIdentifiers.has(identifier)) {
          staticCSSIdentifiers.add(identifier);
          staticCSS += css`/********************************************************************************/\n\n${`[css~="${identifier}"]`.repeat(
            6
          )} {\n${css_}}\n\n`;
        }
        path.replaceWith(babel.types.stringLiteral(identifier));
        break;
      }

      case "javascript": {
        let javascript_ = "";
        const expressions = [];
        for (const index of path.node.quasi.expressions.keys()) {
          const quasi = path.node.quasi.quasis[index];
          const expression = path.node.quasi.expressions[index];
          if (quasi.value.cooked.endsWith("$")) {
            const expression = path.get(`quasi.expressions.${index}`);
            expression.traverse(extractStaticCSSAndJavaScript());
            javascript_ +=
              quasi.value.cooked.slice(0, -1) +
              babelGenerator.default(expression.node).code;
          } else {
            javascript_ += quasi.value.cooked + `$$${expressions.length}`;
            expressions.push(expression);
          }
        }
        javascript_ += path.node.quasi.quasis.at(-1).value.cooked;
        javascript_ = prettier.format(javascript_, {
          parser: "babel",
        });
        const identifier = baseIdentifier.encode(
          xxhash.XXHash3.hash(Buffer.from(javascript_))
        );
        if (!staticJavaScriptIdentifiers.has(identifier)) {
          staticJavaScriptIdentifiers.add(identifier);
          staticJavaScript += javascript`/********************************************************************************/\n\nleafac.execute.functions.set("${identifier}", function (${[
            "event",
            ...expressions.map((value, index) => `$$${index}`),
          ].join(", ")}) {\n${javascript_}});\n\n`;
        }
        path.replaceWith(
          babel.template.ast`
            JSON.stringify({
              function: ${babel.types.stringLiteral(identifier)},
              arguments: ${babel.types.arrayExpression(expressions)},
            })
          `
        );
        break;
      }
    }
  },
});
```

---

- `partialParentElement` → `this.onbeforemorph = (event) => !event?.detail?.liveUpdate;`?
- Should `morph()` call `execute()`?
  - Improve `execute()`’s default `elements` to take `event` Live-Updates in account
    - Look at `DOMContentLoaded`
    - Double-check every use of `execute()`
- In `/settings/tags`, make tag input even smaller
- Use more `` html\`\` ``
  - “Add Tag”
  - “Add Option” in polls
  - Latency compensation when sending message
- Try TypeScript on client-side JavaScript
- In routes like `/likes`, do a redirect back with `${qs.stringify( { redirect: request.originalUrl.slice(1) }, { addQueryPrefix: true } )}`

---

**Next Priorities**

- Whispers.
- SAML.

---

- Merge feature branches
  - `poll`
    - Exam period
    - Files
      - `authentication.ts`
      - `content.ts`
      - `conversation.ts`
      - `course.ts`
      - `database.ts`
      - `index.ts`
      - `layouts.ts`
      - `message.ts`
      - `user.ts`
  - Whispers
  - `app-mobile`
- Email digests
- Drafts
- Pagination

## Users

- Allow people to remove their accounts.
- Improvements to the workflow for when you change your email:
  - Don’t actually change the email until it’s verified. Otherwise an attacker with a compromised password could change your email and lock you out of the “Forgot your password?” flow.
- Allow person to have multiple emails on their account?
- Online indicators.
  - Turn them on as soon as someone who was offline becomes online (right now it may take up to 5 minutes in next periodic Live-Update).
  - Fade in and out.
- Authentication:
  - SSO with Hopkins ID (SAML) (https://glacial-plateau-47269.herokuapp.com/).
  - 2-Factor Authentication.
  - Look into SIS to get a list of courses
  - Send an email on sign-in to alert of potentially suspicious activity
  - On email verification page, add a sign out button.
- Give visual indication on dragging-and-dropping avatar on `/settings/profile`.
- Extra fields:
  - Display name.
  - Pronoun.
  - A short audio with the name’s pronunciation.

## Courses

- “Enrollment” → “Course Participant”
  - “Enroll” → “Join”
- “Staff” → “Course Staff”
- Remove course entirely.
- Have a setting to either let students remove themselves from the course, or let them request the staff to be removed.
- Upload roster and show differences.
  - https://courselore.org/courses/8537410611/conversations/34
- Lock a course for a period, for example, when a take-home exam is out.
  - Still allow students to ask private questions
  - Multiple locks, scheduled in advance?
- Introduce the notion of sections:
  - Invitations per section.
  - Choose a section when joining the course or when already joined.
- Introduce the notion of “groups”, for example, “group of TAs who work on grading”.
- When switching between courses, go back to the same conversation where you’ve been.
- Pretty URLs for courses (for example, `https://courselore.org/principles-of-programming-languages--2023`?
  - https://courselore.org/courses/8537410611/conversations/44
- Have a way to delete a course entirely?
- On tags, `this.isModified = true;` in `this.reorder()` is heavy-handed, because it marks everything as modified even if you reorder back to original order or “recycle” a tag.
- Move “Archive Course” and related controls (for example, the upcoming “Exam Period” feature) out of “Course Information” and into its own settings page.

## Invitations

- Simplify the system by having a single invitation link per course role that you can enable/disable/reset.
- Limit invitation links to certain email domains, for example, “this link may only be used by people whose emails end with `@jhu.edu`.”
- Have an option to require approval of enrollment.
- Have a public listing of courses in the system and allow people to request to join?
- When the user signs up via an invitation, have a call to action to fill in profile (just like the one when you sign up without an invitation).
- Allow staff to preview the email invitations they’re about to submit? (Think the problem with the “enroll” language.)

## Enrollments

- Have a way for a student to remove themselves from the course?
  - Or at least have a structured way for the student to ask staff to remove them.
- Allow the last staff member to remove themselves from the course?

## Conversations

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
- Have a simple way to share “conversation templates,” which use the query parameters to pre-fill the “New Conversation” form.
- Add the notion of “staff considers this a good question.” Similar to the notion of “endorsement,” but for questions.
  - https://courselore.org/courses/8537410611/conversations/33
- Introduce the notion of locking a conversation.
- Streamline the creation of DMs.
- Highlights (similar to Slack’s pins, but we’re avoiding the word “pin” because it already means “pinned conversations”). The highlights are visible to everyone in the conversation.
- Bookmarks / flags / saved items. These are personal, for example, for something you have to follow up on.
- Assign questions to CAs.
- `position: sticky` headers (showing author name) in messages?
- Different states: Open vs archived.
- “Mark all conversations as read” could work with search & filters, marking as read only the conversations that matched the search & filters.
- Let original question asker approve an answer.
- Add a course-wide setting to make tags optional in all kinds of conversation (not only non-chats), even if there are tags.
- Killer feature to attract people: off-the-shelf AI
  - Help staff write answers
  - Find similar questions (this semester, previous semesters)
  - Sentiment analysis to avoid marking question as unresolved when student just said “thank you”
  - Talk about this on home page.
- Introduce a helper to explain Conversation Participants. People aren’t getting, for example, that you can have “Staff + these few people I selected by hand.”
- Introduce panes so you can have multiple conversations open on the same window, side-by-side (particularly useful on desktop application, maybe even on mobile application).
- When navigating back and forth between conversations, go back to previous scrolling position.
  - https://courselore.org/courses/8537410611/conversations/66

**Participants**

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
- Groups, for example, Graders, Project Advisors, Group members, different sections on courses.
  - Some groups are available only to students, while others only to staff.
  - People assign themselves to groups.
  - Add mentions like `@group-3`.

**Chats**

- Have chats on a little sidebar thing, similar to Discourse.

## Messages

- Whispers:
  - Similar to Discourse
  - Staff-only messages
  - Disclosure button to show/hide all whispers
    - On load, it’s showing
    - On new whisper, show again
    - The point is: Don’t let people miss whispers
  - There’s no way to convert back and forth between regular messages & whispers. If necessary, delete and send another message.
  - Style differences to highlight whispers: font (italics vs regular), font color, and a little icon. Do several such things. Perhaps don’t change the background color. It might be good to make it a little more obvious, e.g. label it as a "staff-only whisper, students cannot see this". Otherwise some new staff may not know what is going on.
  - Talk about it on home page.
- Add the notion of follow-up question, so that questions aren’t marked as “unresolved” as soon as a student sends a message. It makes sense for when the student just says “thanks.”
  - Have a dedicated button for this.
- Let staff endorse other staff answers.
- Introduce the notion of promoting a message into its own conversation (one example use case is when someone asks a question as a follow-up to an announcement).
- Add a notion of “reply” that’s a first-class citizen, like Discord and unlike GitHub.
- Polls
  - Polls don’t render in email notifications, because we’re still sending the content without processing.
  - Include options in full-text search. This is difficult because when you edit a poll we’d have to track every use of the poll and update it as well.
  - Reusing a poll in a new course doesn’t work out of the box; we need some logic to duplicate the poll.
  - Use content editor for poll options? (Think of a poll in which the options are `@mentions`, or LaTeX formulas.)
  - When you’re editing a poll and submit the message, you lose the poll.
  - Have a way to not even show the “Edit Poll” dropdown menu on the content editor when you may not edit a poll.
  - Changes to the inputs related to creating a poll don’t need to submit message draft updates
  - Finer control over who can see what results
  - Ranking: https://civs1.civs.us

**Readings & Views**

- Change the meaning of “views”: Instead of using “readings”, only count as “viewed” if the message has appeared on the person’s screen.
  - Tracking pixel on email for people who will read the notification on their email and just “mark as read” on Courselore?
  - This should be the last instance of a GET request that makes changes on the server, which should unlock the possibility of prefetching on hover.
- Mark a message as unread.
- Add notification badges indicating the number of unread messages on the lists of courses (for example, the main page and the course switcher on the upper-left).
- Add different notification badges for when you’re @mentioned.
  - On badges on sidebar indicating that a conversation includes unread messages
  - On badges on course list
  - https://courselore.org/courses/8537410611/conversations/53
- A timeline-like list of unread messages and other things that require your attention.

**Chat**

- Show accent colors for different people (for example, faint background colors), to help identify messages.
- Nested replies (similar to Slack’s threads).

**Reuse**

- Import messages from Piazza in a structured way.
- Don’t use the URL to reuse a message, like we’re doing now, because there’s a size limit to the URL (for example, the demonstration data of rich text is too big and causes a 431 response). Instead, put course/conversation/message on query parameters and fetch straight from the database on `/new` route.
- Have a way to mark several messages in a course as reusable and reuse them all at the same time on a new course.
  - The reusable messages could become “drafts” in the new course.
- Have a way to schedule messages into the future, to have a timeline of things like homework handouts.
  - Either automatically post, or just notify staff that it’s time to post (in case they want to double-check stuff)
- Follow up with Jason
  - Ask about other features he thinks may help Courselore stand out from email lists and other communication software.
- Introduce the notion of course resources
  - Superpinned conversation that people can’t post messages to.
- Don’t introduce the notion of continuity between courses as a first-class concept in the application, because it would complicate things too much. Just have ways to “import” material from other courses conveniently.

## Anonymity

- Allow people to create Personas.
- Have a completely anonymous mode in which not even the staff has access to the identity.

## Search & Filters

- Search should display multiple messages in the same conversation. (Right now it’s only showing the highest ranked message and grouping by conversation.)
- Search in all courses you’re taking (for example, search for `deadline extension`) (see how GitHub does it).
- Filter by date.
- `@mentions` are awkward in search results, because they take in account the original `@<enrollment-reference>--<name-slug>` instead of the rendered person’s name.
- When filtering by “Selected People”, allow you to select **which** people.
- Include tags in freeform search

## Content

**Processor**

- On the `partials.content()`, maybe don’t render `@mention` widget for people who aren’t in the conversation, given that we don’t give that person as option on the `@mentions` autocomplete widget in the content editor.
- It’s possible to send messages that are visually empty, for example, `<!-- -->`
- `#references` into the same conversation don’t need to load the whole `partials.conversation()`, just the message part of it.
- Lightbox modal:
  - Resized images
  - Code blocks
    - Just truncate and have a “click for more” kind of button
    - Do a proper lightbox modal in full screen
    - Give option to wrap or not long lines
  - Block quotes (especially replies)
  - https://courselore.org/courses/8537410611/conversations/6
- Install extensions for Shiki, for example, for OCaml.
- Mermaid: https://github.blog/2022-02-14-include-diagrams-markdown-files-mermaid/
  - Isn’t made for server-side rendering: https://github.com/mermaid-js/mermaid/issues/3650
  - The current workaround is to use `mermaid-cli`, which uses Puppeteer, but that’s slow and downloads a whole browser (~200MB) 🤦‍♂️
- Once the chats have been redesigned with avatars on the margin to better establish a hierarchy and delimit messages, consider bringing back the full `partials.user()` widget to `@mentions`, with avatar and everything. (I think this will look good, but it’s a controversial point, given that people were very insistent on removing avatars from that context.)
- Checklists: Make it easy to check/uncheck and move items (like GitHub) (only if you can edit the message).
- Video:
  - Convert to improve compatibility & performance?
  - Poster image for `<video>` tag?
  - How do they show up in email notifications?
- Let the “quote” selected text pick parts of paragraphs.
  - https://courselore.org/courses/8537410611/conversations/63

**Editor**

- On new conversation page, maybe adapt the `@mentions` widget according to the participants that are currently set. (This already happens on drafting messages on existing conversations.)
- The `@mention` widget should sort by people who have recently participated in the conversation.
- Have the `@mention` widget list people who aren’t in the conversation (suitably marked as so) (similar to Twitter DMs).
- Answer templates.
- Paste tables from Excel and have them formatted as Markdown tables.
- Add https://github.com/fregante/indent-textarea or CodeMirror in programmer mode.
  - Issue with indent-textarea is that it only supports tabs, not spaces https://github.com/fregante/indent-textarea/issues/21
  - CodeMirror is heavy-handed
- If you’re in the middle of editing, and someone else edits a message (or the conversation title), then you’re going to overwrite their changes. Warn about this.
- Dragging a directory from Finder makes the request fail without even an error code(!)
- In programmer mode, change the behavior of when the `@mentions` and `#references` widgets appear and go away, particularly in code & mathematics blocks.
- Load “Preview” on hover/focus to speed things up?
- When pasting things like spreadsheets into the editor, turn them into Markdown tables.
  - Do the same for links, bold, and other inline styles.
  - @github/paste-markdown
  - See what Discourse does for spreadsheets → tables.
  - Paste from Piazza
  - LaTeX

## Notifications

**Email**

- Grace period between sending a message and triggering the email notifications
  - Allow users to configure it?
  - The feature is effectively turned off with a grace period of zero
  - https://courselore.org/courses/8537410611/conversations/28
- Allow replying to a message by replying to the email notification
  - Obfuscate email addresses in the message (like GitHub does).
  - Use IMAP on an existing inbox instead of SMTP?
  - There’s nothing we can do about replying to an email notifications digest, so it should still go to the system administrator, or perhaps have an automatic bounce reply.
- Don’t send notifications when the person is online and/or has seen the message.
  - Explain this in Notifications Settings page.
- More granular control over what to be notified about.
  - Course-level configuration.
  - Subscribe/unsubscribe to particular conversations of interest/disinterest.
- Add option to receive email notifications for your own messages.
- Email digests:
  - “Announcements” should be sent immediately, not as part of the digest.
  - What happens when you change your email notification settings and a digest is already being prepared for you?
  - When it’s time to process a message:
    - Process content with recipients perspective
      - Extract out of `application.web` (Right now we make up fake request/response objects, which is prone to errors.)
        - Are there other auxiliary functions that need to be extracted like that?
      - Modify content processor to allow for taking an arbitrary user’s perspective
    - If digest: enqueue in digests queue
  - Periodically check digests queue and enqueue `sendEmailJobs` for delivery
    - Enqueue hourly digests on the hour and daily digests at 07:00 UTC.
  - Digests should use `contentSearch` truncated?
  - Digests group messages from different courses
  - `notificationDigestJobs`
    - Existence indicates active worker to avoid race condition
    - `startedAt` is used for timeout
  - Reenable digests in user interface
  - Add transaction to `emailNotificationMessageJobs`
  - https://courselore.org/courses/8537410611/conversations/22
- Email contents:

  - Subjects could include the fact that you were mentioned, to make it easier to set up filters.
    - Perhaps this could be more generalized and, like GitHub, include the reason why you were notified. (GitHub seems to do that with a custom header.)
  - Easier ways to unsubscribe:
    - Link to one-click unsubscription in message body.
    - `List-*` headers to allow one-click unsubscription.
    - Don’t require user to be logged in to unsubscribe from notifications?
  - Decorate (with some special treatment for email notifications):
    - Avoid showing things like `@john-doe--201231`.
    - Code blocks are duplicated:
      - Have a processor to remove one of the versions of code block from the email.
    - Polls don’t show up
  - Mathematics are rendered incorrectly.
  - https://courselore.org/courses/8537410611/conversations/7
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

**Other**

- Browser Notifications API & Push API; Desktop & phone applications.

```javascript
Notification.requestPermission();
Notification.permission;
new Notification('Example');

<button
  class="button button--transparent"
  javascript="${javascript`
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

## User Interface Improvements

**Top Menus**

- Use hamburger menu instead of a couple separate menus
  - It shouldn’t cover the whole page underneath (and shouldn’t push an entry into the history, naturally)

**Sidebar · Actions**

- Clean interface.
- Don’t have an “Apply Filter” button, but apply the filters as soon as you click on them.
- Search as you type.
- New filters (and quick filters):
  - Conversations I started
  - My questions
  - Conversations in which I participated.
  - Conversations in which I’m mentioned
    - https://courselore.org/courses/8537410611/conversations/65
- Use a dropdown to occupy less space

**Sidebar · Conversations List**

- Group conversations (similar to Piazza & Campuswire).
  - Includes unread messages
  - Date
  - Pinned
  - Tags
  - Type
- Conversations that are pinned & read may be collapsed after some time, but pinned & unread must be shown prominently.
- Conversations are sorted by most recent activity, but that means when you send a message, the conversation moves to the top, which can be disorienting.
  - Wait for a little while, 10~30 minutes, before sorting.
- Make the distinction between the types more prominent. Separate questions from chats in the list of conversations, for example.
  - Make the visualization of “types” a little more distinct, for example, make announcements pop up.
  - Improve display of endorsements & answers (on the sidebar, include number of answers).
  - Manage answer badges more intelligently (answered at all, answered by staff).
- Highlight conversations that include an `@mention` to you.
- Quick Actions:
  - Unpin
  - Resolve a Question.

**Conversation**

- Add “Change conversation type” and that sort of thing to the “Actions” menu?
- First conversation for staff should default to being pinned.
- Editing tags should behave like “Selected Participants”. (You have to confirm your changes by clicking a button, the dropdown doesn’t go away on first click, and that kind of thing.)
- Fix keyboard navigation on “Selected Participants” widget, which is a bunch of checkboxes acting as a `<select>`.

**Messages**

- On conversation of type Question, have separate buttons for:
  - Sending an answer
  - Follow-up question (resets the resolved status)
  - Regular message (doesn’t reset the resolved status)
  - (Remove the “Type” selector for messages)
  - (Introduce the notion of “message type” for follow-up question as a first class citizen and things like that?)
- Higher contrast between background and text?
- Blockquotes
  - Faint background color to help differentiate them?
  - Collapse long blockquotes?
- Add more options to the hover menu (besides the ellipses), similar to Slack & Discord.
- Bigger font (15pt).
- Wider columns
- Include a “set as answer and endorse” button.
- Show a widget similar to the Views and Likes (with person & time) to endorsements.
- Don’t show endorsements for messages that have been converted into non-answers. (They show up at least for staff.)
- Staff endorsements should show a list of people similar to “Likes” and “Views”.

**Chat**

- Move the avatar to the side, giving a clearer indication of where a message ends and another one starts
- More space between messages?
- Collapse long messages.
- Add a button to “Return to Bottom” when chat is scrolled up.
- Scrolling is glitchy:

  - Images may break the scrolling to the bottom.
  - Safari/Firefox window resize causes unwanted scrolling.
  - Possible solutions:

    - Mutation Observer & more JavaScript 🤷

    - Wrapper with `flex-direction: column-reverse;` (<https://stackoverflow.com/a/72644230>)

      - Safari desktop: Content scrolls if you’re up
      - Safari iOS: Content isn’t pinned to the bottom if you scroll up and back down

      ```html
      <div
        style="
            background-color: cyan;
            height: 200px;
            overflow: auto;
            display: flex;
            flex-direction: column-reverse;
          "
      >
        <div key="content"></div>
      </div>
      <button
        onclick='document.querySelector(`[key="content"]`).insertAdjacentHTML("beforeend", `<p style="background-color: green;">${new Date().toISOString()}</p>`)'
      >
        Add
      </button>
      ```

    - `overflow-anchor` (<https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom/>)

      - Doesn’t work in Safari at all 🤦‍♂️

      ```html
      <div style="background-color: cyan; height: 200px; overflow: auto">
        <div key="anchor" style="overflow-anchor: auto; height: 1px;"></div>
      </div>
      <button
        onclick='document.querySelector(`[key="anchor"]`).insertAdjacentHTML("beforebegin", `<p style="background-color: green; overflow-anchor: none;">${new Date().toISOString()}</p>`)'
      >
        Add
      </button>
      ```

**Content Editor**

- Help page
  - Clarify that “Programmer Mode” is for your input only. Unlike other buttons on the toolbar, it doesn’t affect the rendered text.
- When editing, and trying to send empty message, propose to delete (like Discord does).
- When pressing up on an empty chat box, start editing the your most recently sent message (if it’s still the most recently sent message in the conversation) (like Discord does).
- Issue with autosizing:
  - Slows down the typing in iOS
  - In chats, if the textarea is autosizing, then the main messages pane scrolls up.
  - When you’re typing, there’s a weird scrollbar glitch: it shows up for a split second and hides back again. I observed this in Meta Courselore using Safari.
  - https://css-tricks.com/the-cleanest-trick-for-autogrowing-textareas/
  - https://github.com/fregante/fit-textarea **Use v2**.
  - https://courselore.org/courses/8537410611/conversations/66
- The HTML for latency-compensate sending a message could be embedded in the JavaScript, now that embedding HTML in JavaScript is a thing.
- Selecting multiple paragraphs and bolding doesn’t work (the same issue occurs in GitHub 🤷)
- Don’t let `@metions` and `#references` widgets appear if you’re in the middle of a code block.
  - https://courselore.org/courses/8537410611/conversations/64

**New Conversation**

- Keep all the material that is there, but present it differently to try and make the page cleaner.
- Collapse tags (similar to what we do in the conversation page itself, and to what Reddit does).
  - Change the widget that’s a tag: Instead of `icon text`, make the text look like it’s inside a tag.
- Use different background colors, similar to Piazza.

**Live-Navigation**

- On form submissions, for example, when you create an invitation, highlight the part of the page that changed (use the same yellow we use for permanent links to messages).

**Other**

- Add the number of unread messages to the `<title>`.
  - Or change the favicon.
  - https://courselore.org/courses/8537410611/conversations/25
- Detect old or otherwise unsupported browsers and alert, asking the user to update.
- Make breadcrumbs (for example, under “User Settings”) clickable (they should expose the navigation menu, just like what happens in Visual Studio Code).
- The anonymity button isn’t as clear as it should be.
- Add more help pages in other parts that may need them.
- Replace `<i class="bi bi-info-circle"></i>` with `<i class="bi bi-question-circle"></i>`?
- Flash:
  - Anchor it to artificial element, instead of `<body>` hack
  - When there are multiple (for example, you’ve just edited your profile **and** you become offline), let them stack on top of each other, instead of overlapping.
- Consider using `position: absolute` for header and footer, to avoid them scrolling under any circumstance
  - Also, you could probably scroll anywhere on the page, as opposed to now, when you must have your cursor in the scrolling pane.
- On lists with reorderable items, scroll when your cursor is near the edge of the surrounding scrollable pane.
  - In particular, test with three-fingers scroll in macOS.
- Test on Windows the styling of scrollbars. (Remember that autosizing the textarea in the content editor creates weird scrollbars, including a horizontal scrollbar because `autosize` is using `overflow: scroll;` instead of `overflow[-y]: auto;`, which may show up as a strip of white at the bottom on unstyled scrollbars.)

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
  - `CAST("reference" AS INTEGER) >= CAST(${request.query.beforeMessageReference} AS INTEGER)`
    - Create indices for `CAST("reference" AS INTEGER)` or convert `"reference"` into number (and then create an index for that!).
- On sending message on non-chat, it’s scrolling back to the first page.
- The “mark as read” (not “mark **all** as read”) button doesn’t work because it doesn’t visit all pages.
- Edge case: Show next/previous page on “no more messages”.
  - This is an edge case because people should only be able to get there when they manipulate the URL (or because they’re loading the next page right when an item has been deleted)
  - Difficult because we don’t have a “before” or “after” message to anchor to.
- Paginate other things, for example, Course Settings · Enrollments, and invitations.
- Things like clearing search and filters may affect query parameters.
- Rendering the sidebar is about 10% of the response time. When paginating, don’t include the sidebar.

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

- How many questions & how fast they were answered.
- Number of people who are online.
- More statics from Piazza.
- Staff that should be on call answering questions, but aren’t.
- A way to grade interactions on conversations, for example, for when the homework is to discuss a certain topic. (It seems that Canvas has this feature.)
- Gamification
  - Badges (for example, first to answer a question)
  - Karma points for whole class and unlock achievements for everyone
- https://courselore.org/courses/8537410611/conversations/62

## Live Course Communication during the Lectures

- References:
  - https://www.sli.do
  - https://pigeonholelive.com/features-qna/

## Native Mobile & Desktop Applications

- `NODE_EXTRA_CA_CERTS=".../Application Support/Caddy/pki/authorities/local/root.crt"`
- PWA: https://checkvist.com/auth/mobile
- Consider https://tauri.app
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
  - PWA
    - PWABuilder
    - Manifest
    - Service worker (Cache API)
    - Install to home screen
    - Push API & Notifications API
  - https://capacitorjs.com/
    - Agnostic to front-end framework.
    - Excellent onboarding experience.
    - Isn’t super popular, but the smaller community is enthusiastic.
    - It’s mostly for delivering a pre-bundled static website, but we want to use server-rendered HTML, and we want to connect to multiple servers.
  - https://reactnative.dev/
    - https://expo.dev/
    - Ties you to React.
    - Much more popular than anything else.
  - https://cordova.apache.org/
    - The spiritual predecessor of Capacitor.
    - Still more popular, but dreaded.
  - Warn users about untrusted content
  - Before redirecting the user, let the server verify that the instance does seem like a Courselore installation
  - Have a way to preview static part of the mobile application in the browser (without having to go though mobile simulators or actual devices)
  - Review the treatment of notches
    - Safe area padding
    - Progress bar should be in safe area
    - When the onscreen keyboard shows up, the bottom safe area gets large and the whole page shifts up
  - Treat the case in which you’re offline
  - Introduce a way for the web application to detect that we’re in the context of the mobile application.
    - Use a cookie? That’s what PWABuilder does.
    - Use preload scripts (but then how does that information carry across to the context of HTML loaded from the server?)
  - Close and reopen the application should take you to where you were before
  - Icon
    - Iconset creator
  - Certificate/signing/notarization
  - Apple may reject our application based on clause 4.2, but what about Mattermost, Discourse, Discord, and so forth?
    - They would probably have approved without questions if we had hidden our website from the internet 😛
    - Rendering HTML from relatively untrusted sources doesn’t help our case 🤷
  - Have a way to sign out
  - Have a way to sign in to multiple Courselore instances
- Have registry of Courselore instances. For example, in a phone application we could show a list of existing instances. (You could always not list yourself in the registry and enter the URL for your instance manually on the phone application.)
  - Perhaps this would be paid, to support our work of verifying the validity of the instance

## Administrative Interface

- Users
  - See what courses people are on
- Courses
  - Access the course
    - Have a quick link to the list of enrollments
  - Have a quick way to archive a course directly from this list
- Bulk actions on users & courses?
- When an administrator is creating a course, ask them if they want to be staff, because perhaps they’re creating a course for someone else.
- Deal with the case in which you’re the administrator and also the staff/student on a course.
  - Switch in out of administrator role and see the course differently.
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
  - Have a wizard to set things up the first time: It’d have to be something like a command-line application, because without the basic information the server can’t even start.
  - Have a way to change configuration moving forward, by changing the configuration file and restarting the server (perhaps ask for confirmation and revert if necessary, similar to when you change the resolution of a display)
- Take a look at other nice features from Discourse’s administrative interface

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
        - Automatically remove from the course the people who dropped.
      - Submitting grades (for example, if discussing a topic in Courselore is part of an assignment, add that grade to the gradebook in Blackboard).
      - https://piazza.com/product/lti
      - https://www.edu-apps.org/code.html

## User Interface

- Forms:
  - Use `maxlength`.
  - Keep the buttons disabled while the form isn’t in a valid state.
- Prevent the flash of unformatted datetime on fields using `validateLocalizedDateTime()`.
  - I tried to just reset all elements to the `valueInputByUser` at the end (which, incidentally, requires `window.setTimeout()` to not reset the value before the form data is actually sent to the server), but it doesn’t work. It seems like the only solution is to use an auxiliary `<input type="hidden">` that’s actually sent and an `<input type="text">` that drives it to show to the user.
- Have some kind of in-app guide for the first time you enter the system, or the first time you create a course, and that sort of thing. This should complement the video tutorials that we also want to make.
- Checkboxes that don’t have a visual indication may be confusing.
- Right click menus on stuff?
  - For example, something like the “Actions” menu under the ellipses on messages.
  - But they can frustrate people who just want to interact with the browser right-click context menu.
- Places where we show `administratorEmail` to report bugs could be forms instead.
- In Safari iOS, the address bar never collapses because of the way we’re doing panes.
- Add `-fill` to journal icons: https://github.com/twbs/icons/issues/1322

## Design & Accessibility

- Translate to other languages: 30 languages.
- Test screen readers.
  - https://piazza.com/product/accessibility
- Test contrast.
- FERPA
  - https://piazza.com/legal/ferpa

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
- Prevent event attempting a Live-Navigation if the Live-Connection determines that you’re offline.

## Live-Connection

- Maybe don’t disconnect/reconnect the Live-Connection when a Live-Navigation will just return you to the same page?
  - It only saves the creation of connection metadata on the database on the server and the cost of establishing the connection.
  - A `POST` will already cause an update to the information on the page.
  - The implementation gets a bit awkward. The trick is to introduce the URL to the identity of the connection on top of the token which already identifies it. The token becomes the identity of the browser tab, and the URL becomes its state. If you put the two together, you can disconnect/reconnect only when necessary. But there are plenty of edge cases to deal with, for example, a Live-Update coming in right in the middle of a `POST` Live-Navigation.

**Live-Updates**

- Live-Updates can freeze the user interface for a split second, as the morphing is happening.
  - Examples of issues:
    - Typing on an inbox lags.
    - Pressing buttons such as the “Conversations” disclosure button on mobile.
  - Potential solutions:
    - Break the work up by introducing some `await`s, which hopefully would give the event loop an opportunity to process user interactions.
    - Minimize the work on the client-side by making the pages small, so there’s less to diff.
    - Minimize the work on the client-side by sending only the diffs.
- Be more selective about who receives a Live-Update:
  - When we have pagination, take it a step further and only Live-Update tabs with the affected message open.
- Do something special on Live-Updates that result in 404.
  - Right now we just show the 404 to the person, without much context, which can be confusing.
  - For example, when we have a tab open with a conversation and someone else deletes it.
- Morphing on the server: Don’t send the whole page, only a diff to be applied on the client
- Partials
  - Relatively straightforward: Re-fetch partials in the background after a Live-Update? They may have gotten stale, for example, the “Views” component, if it’s open right as a Live-Update is happening.
  - More principled: Partials remember their URLs and keep their own Live-Updates lifecycle.
- Currently, if a connection comes in with a token we don’t identify, we treat that as a browser tab that was offline for a while and just reconnected, which means it receives a Live-Update right away. This can be superfluous if no change actually took place. This may be a minor issue—or not an issue at all. And addressing it probably complicates the Live-Updates mechanisms quite a bit. But, in any case, one potential solution is, instead of keeping tokens on the server and scheduling events to them, keep a notion of when things were updated, this way upon reconnection the client can say when it was the last time it got a Live-Update, and the server can know if another Live-Update is necessary. But the notion of tracking which parts of which pages require which data sounds error-prone.
- Authentication:
  - When the user signs out, send a Live-Update to all other browser tabs.
    - Store user in Live-Updates metadata database table.
  - When the user `Session.closeAllAndReopen()` (for example, when resetting the password), also send Live-Update, which will have the effect of signing you out to prevent personal information from being exposed.
- Pause after some period of inactivity?

## Performance

- Lazy loading & DRYing to reduce HTML payload
  - `userPartial` tooltip
  - `conversationPartial` tooltip on decorated content
  - Selected participants widget
    - New conversation
    - Conversations page (edit participants)
- View caching on the server.
  - https://guides.rubyonrails.org/caching_with_rails.html
  - This would interact in some way with server-side diffing on Live-Updates
  - Elm seems to do something similar
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
- Write a function to determine if processing content is even necessary. Most content doesn’t use extra features and could skip JSDOM entirely.
- Investigate other potential bottlenecks:
  - Synchronous stuff that could be async.
- Framing?
  - Disadvantage: One more roundtrip to the server to complete the page.
  - Sidebar vs main content
    - On mobile may not need to load the sidebar at all
  - Pagination links.
    - Conversations in sidebar.
    - Messages in conversation.
  - Filters.
- Database:
  - Look for more database indices that may be necessary.
  - n+1 queries:
    - Cases:
      - `getConversation()`.
      - `getMessage()`.
      - Treatment of `@mentions` in Content Processor.
      - Finding which enrollments to notify (not exactly an n+1, but we’re filtering in JavaScript what could maybe filtered in SQL (if we’re willing to use the `IN` operator)).
    - Potential solutions:
      - Single follow-up query with `IN` operator (but then you end up with a bunch of prepared statements in the cache).
      - Use a temporary table instead of `IN`.
      - Nest first query as a subquery and bundle all the information together, then deduplicate the 1–N relationships in the code.
  - We’re doing pagination of conversations in sidebar using `OFFSET`, because the order and presence of conversations changes, so we can’t anchor a `WHERE` clause on the first/last conversation shown. Try and find a better approach. Maybe use window functions anchored on the `row_number`.
- `slugify` is expensive, and it may be cacheable.
- Process content (which is CPU intensive) in worker thread (asynchronously)?
- We’re hitting the disk a lot, perhaps too much. More than Kill the Newsletter!
- Probably bad idea for reducing HTML size and improving performance: Have some “templates” as JavaScript strings at the global level that we reuse, for things like spinners. (Spooky action at a distance.)

## Infrastructure

- Extract component that does reordering (tags, poll options, and so forth).
- Rename schema to be more explicit, for example, “likes” → “messageLikes”.
- Test process manager on Windows
  - In development, `Ctrl+C`.
  - Kill process
    - Ways to kill
      - Preventable (`SIGTERM`)
      - Not preventable (`SIGKILL`)
    - Processes to kill
      - Main
      - Web
      - Worker
      - Caddy
  - Crash the server process
- Email system administrator in case of a crash.
- Remove checks for redundancy of boolean actions.
  - Examples:
    - Liking a message you already liked.
    - Endorsing a message you already endorsed.
    - Adding a tag that already exists.
    - Pinning a conversation that’s already pinned.
    - Setting as announcement a conversation that’s already an announcement.
  - Search for:
    - `== null`
    - `"true"`
    - `"false"`
    - `"on"`
    - `.patch`
- Convert from negative checks into positive checks: `== null`/`== undefined` → `typeof ___ === "string"`
- @types/nodemailer should export things like `SentMessageInfo`, because `.sendMail()` is overloaded, so you can’t use `ReturnType<___>`
- Children processes could tell main process that they’re ready, this way we could do things like, for example, only start Caddy when the `web` processes are ready to receive requests. If we do that, then we can enable Caddy’s active health checks.
- In the authentication workflow, there’s a query parameter called `invitation`, but it isn’t used only for invitations, so rename it to something like `user`.
- If a child process crashes too many times in a short period, then crash the main process.
- Extract libraries:
  - @leafac/javascript
  - @leafac/express
  - @radically-straightforward
- Make top-level `await` available for `` javascript`...` ``.
  - Complication: many things, like `setTippy()` would become `async` as well.
  - Convert infinite loops with `update()` and `setTimeout()` into `while (true)` (search for `update(`).
  - No other existing `` javascript`...` `` needs this right now.
- Extract the logic to use SQLite as a job queue.
- In development, have a way to force jobs to run.
- Edge case in which Tippy must be removed from element:
  1. Change an invitation from expired to not expired.
  2. Change the invitation role. The error tooltip about not being able to change the role of an expired invitation will show up for a split second.
  - Probably there are other cases like this.
- DRY debounce that uses `isUpdating`
- DRY lazy loading of tooltip
- `key="...--<SOME-KIND-OF-REFERENCE>"` → `key=".../<SOME-KIND-OF-REFERENCE>"`
- Inconsistency: In the `liveConnectionsMetadata` (and possibly others) we store `expiredAt`, but in `session` (and possible others) we store `createdAt` and let the notion of expiration be represented in the code.
- autocannon: produce graphs (HDRHistogram)
- There’s a small chance (once every tens of thousands of requests) that you’ll get an “SQLite busy” error. I observed it when creating `liveConnectionsMetadata`, which is the only write in a hot path of the application. Treat that case gracefully.
- There’s a issue when running for the first time: Caddy may ask for your password, but you may not see it.
  - It still works if you see it and type in the password, even as other stuff has scrolled by.
  - Potential solutions:
    - Run Caddy before spawning other children processes (but how do you know that Caddy is done?)
    - Document this quirk.
- Investigate browser crashes on Android Chrome
- Add synchronizer token as added security against CSRF.
  - Currently we’re defending from CSRF with a [custom header](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#use-of-custom-request-headers). This is the simplest viable protection, but it’s vulnerable to broken environments that let cross-site requests include custom headers (for example, an old version of Flash).
  - [Synchronizer tokens](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#synchronizer-token-pattern) are the most secure option.
    - Communicate the token to the server with the custom header (`CSRF-Protection`), combining the synchronizer token with the custom header approach.
    - Let the synchronizer tokens be session-wide, not specific per page, so as to not break the browser “Back” button.
    - Couple the synchronizer token to the user session.
    - Have pre-sessions with synchronizer tokens for signed out users to protect against login CSRF.
  - In case the implementation of the synchronizer token doesn’t go well, try to use the [double-submit pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie).
    - It requires a secret known by the server to implement most securely. Note how everything boils down to the server recognizing itself by seeing a secret piece of data that it created.
- `filenamify` may generate long names in pathological cases in which the extension is long.
- Things like `text--sky` and `mortarboard` are repeated throughout the application. DRY these up.
- Windows development:
  - `Ctrl+C` leaves the Caddy process behind, failing subsequent runs because the port is taken
- Sign-out is slow for some reason 🤷
- When we start receiving code contributions, we might want to ask for people to sign a contributor’s agreement, because otherwise we’re locking ourselves out of the possibility of dual-licensing & perhaps selling closed-source extensions.
- Do things break if you’re trying to run Courselore from a directory that includes spaces & weird characters?
  - Note Caddy’s configuration and the serving of static files.
  - Test development.
  - Test binary.
  - Test on Windows.
- Review all uses of `fetch()`:
  - Treat the error cases
  - Have timeouts, because there may be no feedback if the internet goes down in the middle of an operation, and the connection may be left hanging, and we’ll be `await`ing forever.
    - But maybe this only applies to event-stream type of requests, and we have them covered already. Maybe for regular kinds of requests this would be overkill…
- Autosize issues:
  - Leaks resources because of the global `Map` of bound textareas. It should be using `WeakMap` instead.
  - Makes typing slow on big pages on iOS.
  - Also slows down “Reply” of long messages, like the rich-text demonstration message.
  - Look into using `fit-textarea@2.0.0` instead.
- Add missing `key`s:
  - `class=`
  - `querySelector`
  - `map(`
- Mark all conversations as read may be slow because it does a bunch of in `INSERT`s.
- Move some of the non-application-specific server-side code into a library (for example, cookie settings, server-sent events, logging, and that sort of thing).
  - Maybe move @leafac/express-async-handler into that library as well.
- Make Demonstration Data load faster by having a cache of pre-built data.
- Using `getConversation()` to enforce permissions may not be a great idea. It limits the number of search results in a weird way, that even leaks a bit of data. Also, it isn’t the most performant thing, probably (see point about n+1 queries). Maybe a better idea would be to `WHERE` the permissions everywhere, or use a database view.
- Rate limiting.
  - Caddy extensions are a possibility, but not a very good one, first because they don’t seem to be any good, and second because Caddy doesn’t know, for example, whether the user is signed in.
  - Check
    - Signed out → IP
    - Signed in → user identifier
  - Response: either a special HTTP status that means “rate limited,” or just delay the response.
- Find more places where we should be using database transactions.
- Maintenance:
- Automate:
  - Updates.
  - Backups.
    - SQLite
      - `VACUUM INTO`
      - better-sqlite3’s `.backup()` method.
- Have a way for self-hosters to migrate domains.
  - Rewrite avatars.
  - Rewrite URLs in messages.
- In some situations, we’re unnecessarily updating the boolean fields in the database that are represented as dates. For example, `"tags"."staffOnlyAt"` on `PUT /courses/:courseReference/settings/tags`.
- Right now we’re allowing any other website to embed images. If we detect abuse, add an allowlist.
- Caddy could silence logs **after** a successful startup.
- Live-Navigation usability issue: When there are multiple forms on the page, and you partially fill both of them, submitting one will lose inputs on the other.
  - For example, when you’re filling in the “Start a New Conversation” form, and you do a search on the sidebar.
- Image proxy
  - Max size 5242880
  - Max number of redirects 4
  - Timeout 10s
  - Resizing?
  - Caching? Not only for performance, but also because third-party images may go away
  - Include HMAC
    - Perhaps not, because as far as I understand the purpose of HMAC is to prevent abuse, but hotlinked images can only be used from our website anyway due to Cross-Origin-Resource-Policy. In other words, you can’t hotlink a hotlinked (proxied) image. This saves us from having to compute & verify HMACs.
  - Allow hotlinking from our proxy? This has implications on the decision to not use HMAC on the proxy, and also has implications on rendering hotlinked images on third-party websites, for example, the Outlook email client, as soon as we start sending email notifications with fully processed content (right now we send the pre-processed content, but we want to change that so that things like `@mentions` show up more properly.)
    - This is necessary to 100% guarantee that people will be able to see images on Outlook
- Automated tests.

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
- Developer documentation: Project architecture and other things that new developers need to know.

## Marketing

- Communicate that we’re in a free hosting period **for now**.
- Invest more in marketing on spring.
  - Buy keywords on Google.
- Goal: Double usage every semester for the first couple semesters.
- Start charging by 2024, start turning a profit by 2026.
  - But only start charging when we have a thousand users.
- Homepage:
  - Better printscreens without `lorem ipsum`.
  - Example of design that we like: https://capacitorjs.com
  - At some point hire a designer to make it shinier
  - Comparison chart: Courselore, Piazza, Campuswire, edstem, and so forth.
    - Make sure to mention that we’re open-source.
    - Piazza has LTI support (for identity only?).
  - Business model
    - Open-source, so free forever.
    - Hosting at <courselore.org> is free for a couple years.
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
- Google
  - https://www.partneradvantage.goog/
  - https://cloud.google.com/partners/become-a-partner/
  - Independent Software Vendor (ISV)
  - $3000–$6000/year
- Look at other system to find features that people will ask for.

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
  - <https://discourse.org>
  - <https://reddit.com>
  - <https://basecamp.com>
  - <https://slack.com>
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
- Conferences
  - <https://openeducationconference.org>
  - <https://www.digitallyengagedlearning.net>
