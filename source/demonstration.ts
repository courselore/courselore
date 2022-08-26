import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { html } from "@leafac/html";
import argon2 from "argon2";
import casual from "casual";
import lodash from "lodash";
import slugify from "@sindresorhus/slugify";
import cryptoRandomString from "crypto-random-string";
import {
  Courselore,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  userAvatarlessBackgroundColors,
  userEmailNotificationsForAllMessageses,
  CourseRole,
  courseRoles,
  enrollmentAccentColors,
  ConversationParticipants,
  conversationParticipantses,
  ConversationType,
  conversationTypes,
} from "./index.js";

export default (app: Courselore): void => {
  if (!app.locals.options.demonstration) return;

  const handler: express.RequestHandler<
    {},
    any,
    {},
    {},
    IsSignedOutMiddlewareLocals & Partial<IsSignedInMiddlewareLocals>
  > = asyncHandler(async (req, res) => {
    const password = await argon2.hash("courselore", app.locals.options.argon2);
    const avatarIndices = lodash.shuffle(lodash.range(250));
    const users = lodash.times(151, (userIndex) => {
      const name = casual.full_name;
      const biographySource = casual.sentences(lodash.random(5, 7));
      const isEmailNotificationsForNone = Math.random() < 0.1;
      const isEmailNotificationsForMentions =
        !isEmailNotificationsForNone && Math.random() < 0.8;
      const isEmailNotificationsForMessagesInConversationsInWhichYouParticipated =
        !isEmailNotificationsForNone && Math.random() < 0.8;
      const isEmailNotificationsForMessagesInConversationsYouStarted =
        isEmailNotificationsForMessagesInConversationsInWhichYouParticipated ||
        (!isEmailNotificationsForNone && Math.random() < 0.8);
      const isEmailNotificationsForAllMessages =
        isEmailNotificationsForMentions &&
        isEmailNotificationsForMessagesInConversationsInWhichYouParticipated &&
        isEmailNotificationsForMessagesInConversationsYouStarted &&
        Math.random() < 0.3
          ? lodash.sample(userEmailNotificationsForAllMessageses)!
          : "none";
      const hour = new Date();
      hour.setUTCMinutes(0, 0, 0);
      const day = new Date();
      day.setUTCHours(0, 0, 0, 0);
      return app.locals.database.get<{
        id: number;
        email: string;
        name: string;
      }>(
        sql`
          INSERT INTO "users" (
            "createdAt",
            "lastSeenOnlineAt",
            "reference",
            "email",
            "password",
            "emailVerifiedAt",
            "name",
            "nameSearch",
            "avatar",
            "avatarlessBackgroundColor",
            "biographySource",
            "biographyPreprocessed",
            "systemRole",
            "emailNotificationsForAllMessages",
            "emailNotificationsForAllMessagesDigestDeliveredAt",
            "emailNotificationsForMentionsAt",
            "emailNotificationsForMessagesInConversationsInWhichYouParticipatedAt",
            "emailNotificationsForMessagesInConversationsYouStartedAt"
          )
          VALUES (
            ${new Date().toISOString()},
            ${new Date(
              Date.now() -
                (Math.random() < 0.5 ? 0 : lodash.random(0, 5 * 60 * 60 * 1000))
            ).toISOString()},
            ${cryptoRandomString({ length: 20, type: "numeric" })},
            ${`${slugify(name)}--${cryptoRandomString({
              length: 5,
              type: "numeric",
            })}@courselore.org`},
            ${password},
            ${new Date().toISOString()},
            ${name},
            ${html`${name}`},
            ${
              Math.random() < 0.6
                ? `https://${
                    app.locals.options.host
                  }/node_modules/fake-avatars/avatars/${avatarIndices.shift()}.png`
                : null
            },
            ${lodash.sample(userAvatarlessBackgroundColors)!},
            ${biographySource},
            ${
              app.locals.partials.contentPreprocessed(biographySource)
                .contentPreprocessed
            },
            ${
              app.locals.options.host === app.locals.options.tryHost
                ? "none"
                : userIndex === 0
                ? "administrator"
                : Math.random() < 0.1
                ? "administrator"
                : Math.random() < 0.3
                ? "staff"
                : "none"
            },
            ${isEmailNotificationsForAllMessages},
            ${
              isEmailNotificationsForAllMessages === "hourly-digests"
                ? hour.toISOString()
                : isEmailNotificationsForAllMessages === "daily-digests"
                ? day.toISOString()
                : null
            },
            ${
              isEmailNotificationsForMentions ? new Date().toISOString() : null
            },
            ${
              isEmailNotificationsForMessagesInConversationsInWhichYouParticipated
                ? new Date().toISOString()
                : null
            },
            ${
              isEmailNotificationsForMessagesInConversationsYouStarted
                ? new Date().toISOString()
                : null
            }
          )
          RETURNING *
        `
      )!;
    });
    const demonstrationUser = res.locals.user ?? users.shift()!;

    const year = new Date().getFullYear().toString();
    const month = new Date().getMonth() + 1;
    const term = month < 4 || month > 9 ? "Spring" : "Fall";
    const institution = "Johns Hopkins University";
    for (const {
      name,
      code,
      courseRole: courseRole,
      accentColor,
      enrollmentsUsers,
      isArchived,
    } of [
      {
        name: "Principles of Programming Languages",
        code: "CS 601.426",
        courseRole: courseRoles[1],
        accentColor: enrollmentAccentColors[0],
        enrollmentsUsers: users.slice(0, 100),
      },
      {
        name: "Pharmacology",
        code: "MD 401.324",
        courseRole: courseRoles[0],
        accentColor: enrollmentAccentColors[1],
        enrollmentsUsers: users.slice(25, 125),
      },
      {
        name: "Object-Oriented Software Engineering",
        code: "EN 601.421",
        courseRole: courseRoles[1],
        accentColor: enrollmentAccentColors[2],
        enrollmentsUsers: users.slice(50, 150),
        isArchived: true,
      },
    ].reverse()) {
      const course = app.locals.database.get<{
        id: number;
        reference: string;
        nextConversationReference: number;
      }>(
        sql`
          INSERT INTO "courses" (
            "createdAt",
            "reference",
            "archivedAt",
            "name",
            "year",
            "term",
            "institution",
            "code",      
            "nextConversationReference"
          )
          VALUES (
            ${new Date().toISOString()},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${isArchived ? new Date().toISOString() : null},
            ${name},
            ${year},
            ${term},
            ${institution},
            ${code},
            ${lodash.random(30, 50)}
          )
          RETURNING *
        `
      )!;

      const enrollment = app.locals.database.get<{
        id: number;
        reference: string;
        courseRole: CourseRole;
      }>(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${demonstrationUser.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${courseRole},
            ${accentColor}
          )
          RETURNING *
        `
      )!;

      for (const _ of lodash.times(20)) {
        const expiresAt =
          Math.random() < 0.3
            ? new Date(
                Date.now() +
                  lodash.random(
                    -30 * 24 * 60 * 60 * 1000,
                    30 * 24 * 60 * 60 * 1000
                  )
              ).toISOString()
            : null;
        const user = Math.random() < 0.5 ? lodash.sample(users)! : null;
        const name =
          user !== null
            ? Math.random() < 0.7
              ? user.name
              : null
            : Math.random() < 0.5
            ? casual.full_name
            : null;
        const email =
          user !== null
            ? Math.random() < 0.7
              ? user.email
              : null
            : Math.random() < 0.5
            ? `${slugify(name ?? casual.full_name)}--${cryptoRandomString({
                length: 5,
                type: "numeric",
              })}@courselore.org`
            : null;
        app.locals.database.run(
          sql`
            INSERT INTO "invitations" (
              "createdAt",
              "expiresAt",
              "usedAt",
              "course",
              "reference",
              "email",
              "name",
              "courseRole"
            )
            VALUES (
              ${new Date().toISOString()},
              ${expiresAt},
              ${
                user === null || Math.random() < 0.4
                  ? null
                  : new Date(
                      (expiresAt === null
                        ? Date.now()
                        : Math.min(Date.now(), new Date(expiresAt).getTime())) -
                        lodash.random(20 * 24 * 60 * 60 * 1000)
                    ).toISOString()
              },
              ${course.id},
              ${cryptoRandomString({ length: 10, type: "numeric" })},
              ${email},
              ${name},
              ${courseRoles[Math.random() < 0.1 ? 1 : 0]}
            )
          `
        );
      }

      const enrollments = [
        enrollment,
        ...enrollmentsUsers.map(
          (enrollmentUser) =>
            app.locals.database.get<{
              id: number;
              reference: string;
              courseRole: CourseRole;
            }>(
              sql`
                INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
                VALUES (
                  ${new Date().toISOString()},
                  ${enrollmentUser.id},
                  ${course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${courseRoles[Math.random() < 0.1 ? 1 : 0]},
                  ${lodash.sample(enrollmentAccentColors)!}
                )
                RETURNING *
              `
            )!
        ),
      ];
      const staff = enrollments.filter(
        (enrollment) => enrollment.courseRole === "staff"
      );
      const students = enrollments.filter(
        (enrollment) => enrollment.courseRole === "student"
      );

      const tags: { id: number }[] = [
        { name: "Assignment 1", staffOnlyAt: null },
        { name: "Assignment 2", staffOnlyAt: null },
        { name: "Assignment 3", staffOnlyAt: null },
        { name: "Assignment 4", staffOnlyAt: null },
        { name: "Assignment 5", staffOnlyAt: null },
        { name: "Assignment 6", staffOnlyAt: null },
        { name: "Assignment 7", staffOnlyAt: null },
        { name: "Assignment 8", staffOnlyAt: null },
        { name: "Assignment 9", staffOnlyAt: null },
        { name: "Assignment 10", staffOnlyAt: null },
        {
          name: "Change for Next Year",
          staffOnlyAt: new Date().toISOString(),
        },
        {
          name: "Duplicate Question",
          staffOnlyAt: new Date().toISOString(),
        },
      ].map(
        ({ name, staffOnlyAt }) =>
          app.locals.database.get<{ id: number }>(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${name},
                ${staffOnlyAt}
              )
              RETURNING *
            `
          )!
      );

      const conversationCreatedAts = [
        new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      ];
      for (
        let conversationReference = 2;
        conversationReference < course.nextConversationReference;
        conversationReference++
      )
        conversationCreatedAts.unshift(
          new Date(
            new Date(conversationCreatedAts[0]).getTime() -
              lodash.random(6 * 60 * 60 * 1000, 2 * 24 * 60 * 60 * 1000)
          ).toISOString()
        );

      const exampleOfAllFeaturesInRichTextMessages = `
**Edit to see source**

---

# Sources

- Markdown: \`remark-parse\`, \`remark-gfm\`.
- LaTeX: \`remark-math\`, \`rehype-katex\`, \`katex\`
- Syntax Highlighting: \`@leafac/rehype-shiki\`, \`shiki\`
- HTML: \`rehype-raw\`, \`rehype-sanitize\` (\`hast-util-sanitize\`)

---

# \`@mentions\`

Self: @${enrollment.reference}

Other: @${lodash.sample(enrollments)!.reference}

Non-existent: @1571024857

---

# \`#references\`

Conversation self: #1

Conversation other: #2

Conversation non-existent: #14981039481

Conversation permanent link turned reference: <https://${
        app.locals.options.host
      }/courses/${course.reference}/conversations/1>

Conversation non-existent permanent link turned reference: <https://${
        app.locals.options.host
      }/courses/${course.reference}/conversations/14981039481>

Message self: #1/1

Message other: #2/1

Message non-existent: #1/2

Message permanent link turned reference: <https://${
        app.locals.options.host
      }/courses/${
        course.reference
      }/conversations/1?messages%5BmessageReference%5D=1>

Message non-existent permanent link turned reference: <https://${
        app.locals.options.host
      }/courses/${
        course.reference
      }/conversations/1?messages%5BmessageReference%5D=2>

---

# \`#anchors\`

<p id="destination">Destination</p>

[Anchor](#destination)

---

# Markdown (CommonMark)

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

# LaTeX (Mathematics · KaTeX)

https://katex.org

$\\displaystyle \\frac{1}{\\Bigl(\\sqrt{\\phi \\sqrt{5}}-\\phi\\Bigr) e^{\\frac25 \\pi}} = 1+\\frac{e^{-2\\pi}} {1+\\frac{e^{-4\\pi}} {1+\\frac{e^{-6\\pi}} {1+\\frac{e^{-8\\pi}} {1+\\cdots} } } }$

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

---

# Syntax Highlighting (Shiki)

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

# HTML

<details class="note">

A mix of _Markdown_ and <em>HTML</em>.

</details>

---

# Cross-Site Scripting (XSS)

👍<script>document.write("💩");</script>🙌

---

# All Supported HTML Tags

https://github.com/syntax-tree/hast-util-sanitize

---

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

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/ins
https://developer.mozilla.org/en-US/docs/Web/HTML/Element/del

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
`;

      for (
        let conversationReference = 1;
        conversationReference < course.nextConversationReference;
        conversationReference++
      ) {
        const isExampleOfAllFeaturesInRichTextMessages =
          conversationReference === 1;
        const conversationCreatedAt =
          conversationCreatedAts[conversationReference - 1];
        const participants = isExampleOfAllFeaturesInRichTextMessages
          ? "everyone"
          : Math.random() < 0.5
          ? "everyone"
          : lodash.sample(conversationParticipantses)!;
        const selectedParticipantEnrollments = lodash.uniq(
          participants === "everyone"
            ? []
            : participants === "staff"
            ? [
                ...(enrollment.courseRole === "staff"
                  ? []
                  : Math.random() < 0.5
                  ? [enrollment]
                  : []),
                ...lodash.sampleSize(students, lodash.random(0, 10)),
              ]
            : participants === "selected-people"
            ? [
                ...(Math.random() < 0.5 ? [enrollment] : []),
                ...lodash.sampleSize(enrollments, lodash.random(2, 10)),
              ]
            : []
        );
        const participantEnrollments = lodash.uniq([
          ...(participants === "everyone"
            ? enrollments
            : participants === "staff"
            ? staff
            : participants === "selected-people"
            ? []
            : []),
          ...selectedParticipantEnrollments,
        ]);
        const thereExistsMultipleStudentParticipants =
          lodash.intersection(participantEnrollments, students).length > 1;
        const conversationAuthorEnrollment =
          Math.random() < 0.9 ? lodash.sample(participantEnrollments)! : null;
        const type = isExampleOfAllFeaturesInRichTextMessages
          ? conversationTypes[1]
          : conversationTypes[
              Math.random() < 0.5 ? 0 : Math.random() < 0.8 ? 1 : 2
            ];
        const title = isExampleOfAllFeaturesInRichTextMessages
          ? `Example of All Features in Rich-Text Messages`
          : `${lodash.capitalize(casual.words(lodash.random(3, 9)))}${
              type === "question" ? "?" : ""
            }`;
        const nextMessageReference = isExampleOfAllFeaturesInRichTextMessages
          ? 2
          : type === "chat"
          ? lodash.random(50, 100)
          : lodash.random(2, 30);
        const messageCreatedAts = [conversationCreatedAt];
        for (
          let messageReference = 1;
          messageReference < nextMessageReference;
          messageReference++
        )
          messageCreatedAts.push(
            new Date(
              Math.min(
                Date.now(),
                new Date(
                  messageCreatedAts[messageCreatedAts.length - 1]
                ).getTime() + lodash.random(12 * 60 * 60 * 1000)
              )
            ).toISOString()
          );
        const conversation = app.locals.database.get<{
          id: number;
          authorEnrollment: number | null;
          participants: ConversationParticipants;
          anonymousAt: string | null;
          type: ConversationType;
          title: string;
        }>(
          sql`
            INSERT INTO "conversations" (
              "createdAt",
              "updatedAt",
              "course",
              "reference",
              "authorEnrollment",
              "participants",
              "anonymousAt",      
              "type",
              "resolvedAt",
              "pinnedAt",
              "title",
              "titleSearch",
              "nextMessageReference"
            )
            VALUES (
              ${conversationCreatedAt},
              ${messageCreatedAts[messageCreatedAts.length - 1]},
              ${course.id},
              ${String(conversationReference)},
              ${conversationAuthorEnrollment?.id},
              ${participants},
              ${
                conversationAuthorEnrollment?.courseRole === "student" &&
                thereExistsMultipleStudentParticipants &&
                Math.random() < 0.5
                  ? new Date().toISOString()
                  : null
              },
              ${type},
              ${
                type === "question" && Math.random() < 0.75
                  ? new Date().toISOString()
                  : null
              },
              ${
                isExampleOfAllFeaturesInRichTextMessages
                  ? null
                  : Math.random() < 0.15
                  ? new Date().toISOString()
                  : null
              },
              ${title},
              ${html`${title}`},
              ${nextMessageReference}
            )
            RETURNING *
          `
        )!;

        for (const enrollment of selectedParticipantEnrollments)
          app.locals.database.run(
            sql`
              INSERT INTO "conversationSelectedParticipants" ("createdAt", "conversation", "enrollment")
              VALUES (
                ${new Date().toISOString()},
                ${conversation.id},
                ${enrollment.id}
              )
            `
          );

        app.locals.database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversation.id},
              ${lodash.sample(tags)!.id}
            )
          `
        );

        for (
          let messageReference = 1;
          messageReference < nextMessageReference;
          messageReference++
        ) {
          const messageCreatedAt = messageCreatedAts[messageReference - 1];
          const messageAuthorEnrollment =
            messageReference === 1
              ? conversationAuthorEnrollment
              : Math.random() < 0.05
              ? null
              : lodash.sample(participantEnrollments)!;
          const contentSource = isExampleOfAllFeaturesInRichTextMessages
            ? exampleOfAllFeaturesInRichTextMessages
            : type === "chat" && Math.random() < 0.9
            ? casual.sentences(lodash.random(1, 2))
            : lodash
                .times(lodash.random(1, 6), () =>
                  casual.sentences(lodash.random(1, 6))
                )
                .join("\n\n");
          const contentPreprocessed =
            app.locals.partials.contentPreprocessed(contentSource);
          const message = app.locals.database.get<{ id: number }>(
            sql`
              INSERT INTO "messages" (
                "createdAt",
                "updatedAt",
                "conversation",
                "reference",
                "authorEnrollment",
                "anonymousAt",
                "answerAt",
                "contentSource",
                "contentPreprocessed",
                "contentSearch"
              )
              VALUES (
                ${messageCreatedAt},
                ${
                  Math.random() < 0.8
                    ? null
                    : new Date(
                        Math.min(
                          Date.now(),
                          new Date(messageCreatedAt).getTime() +
                            lodash.random(
                              5 * 60 * 60 * 1000,
                              18 * 60 * 60 * 1000
                            )
                        )
                      ).toISOString()
                },
                ${conversation.id},
                ${String(messageReference)},
                ${messageAuthorEnrollment?.id},
                ${
                  messageReference === 1
                    ? conversation.anonymousAt
                    : messageAuthorEnrollment?.courseRole === "student" &&
                      thereExistsMultipleStudentParticipants &&
                      Math.random() < 0.5
                    ? new Date().toISOString()
                    : null
                },
                ${Math.random() < 0.5 ? new Date().toISOString() : null},
                ${contentSource},
                ${contentPreprocessed.contentPreprocessed},
                ${contentPreprocessed.contentSearch}
              )
              RETURNING *
            `
          )!;

          let readingCreatedAt = messageCreatedAt;
          for (const enrollment of lodash.sampleSize(
            participantEnrollments,
            lodash.random(1, participantEnrollments.length)
          )) {
            readingCreatedAt = new Date(
              Math.min(
                Date.now(),
                new Date(readingCreatedAt).getTime() +
                  lodash.random(12 * 60 * 60 * 1000)
              )
            ).toISOString();
            app.locals.database.run(
              sql`
                INSERT INTO "readings" ("createdAt", "message", "enrollment")
                VALUES (
                  ${readingCreatedAt},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );
          }

          for (const enrollment of lodash.sampleSize(
            lodash.intersection(staff, participantEnrollments),
            Math.random() < 0.8 ? 0 : lodash.random(2)
          ))
            app.locals.database.run(
              sql`
                INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );

          for (const enrollment of lodash.sampleSize(
            participantEnrollments,
            Math.random() < (conversation.type === "chat" ? 0.9 : 0.5)
              ? 0
              : lodash.random(5)
          ))
            app.locals.database.run(
              sql`
                INSERT INTO "likes" ("createdAt", "message", "enrollment")
                VALUES (
                  ${new Date().toISOString()},
                  ${message.id},
                  ${enrollment.id}
                )
              `
            );
        }
      }
    }

    if (res.locals.user === undefined)
      app.locals.helpers.Session.open({
        req,
        res,
        userId: demonstrationUser.id,
      });

    app.locals.helpers.Flash.set({
      req,
      res,
      theme: "green",
      content: html`
        Demonstration data including users, courses, conversations, and so
        forth, have been created and you’ve been signed in as a demonstration
        user to give you a better idea of what Courselore looks like in use. If
        you wish to sign in as another one of the demonstration users, their
        password is “courselore”.
      `,
    });
    res.redirect(303, `https://${app.locals.options.host}`);
  });

  app.post<{}, any, {}, {}, IsSignedOutMiddlewareLocals>(
    "/demonstration-data",
    ...app.locals.middlewares.isSignedOut,
    handler
  );

  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/demonstration-data",
    ...app.locals.middlewares.isSignedIn,
    handler
  );
};
