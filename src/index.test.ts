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
     src="/splash.png"
     alt="Grapefruit slice atop a pile of other slices">

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/tt

<p>Enter the following at the telnet command prompt: <code>set localecho</code><br />

The telnet client should display: <tt>Local Echo is on</tt></p>

---

https://developer.mozilla.org/en-US/docs/Web/HTML/Element/div

<div class="warning">
    <img src="/splash.png"
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
    <img src="/splash.png"
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
