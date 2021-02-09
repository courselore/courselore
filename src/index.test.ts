import { describe, test, expect, beforeAll, afterAll } from "@jest/globals";
import os from "os";
import fs from "fs/promises";
import path from "path";
import http from "http";
import express from "express";
import cookieSession from "cookie-session";
import markdown from "tagged-template-noop";
import courselore from ".";

let app: express.Express;
let server: http.Server;
beforeAll(async () => {
  app = await courselore(
    await fs.mkdtemp(path.join(os.tmpdir(), "courselore-test-"))
  );
  server = express()
    .use(cookieSession({ secret: "test" }))
    .use(app)
    .listen();
});
afterAll(() => {
  server.close();
});

describe("Text processor", () => {
  test("CommonMark", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
# CommonMark

> Block quote.

Some _emphasis_, **importance**, and \`code\`.
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>CommonMark</h1>
      <blockquote>
      <p>Block quote.</p>
      </blockquote>
      <p>Some <em>emphasis</em>, <strong>importance</strong>, and <code>code</code>.</p>"
    `);
  });

  test("GitHub Flavored Markdown (GFM)", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
# GitHub Flavored Markdown (GFM)

## Autolink literals

www.example.com, https://example.com, and contact@example.com.

## Strikethrough

~one~ or ~~two~~ tildes.

## Table

| a | b  |  c |  d  |
| - | :- | -: | :-: |

## Tasklist

* [ ] to do
* [x] done
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>GitHub Flavored Markdown (GFM)</h1>
      <h2>Autolink literals</h2>
      <p><a href=\\"http://www.example.com\\">www.example.com</a>, <a href=\\"https://example.com\\">https://example.com</a>, and <a href=\\"mailto:contact@example.com\\">contact@example.com</a>.</p>
      <h2>Strikethrough</h2>
      <p><del>one</del> or <del>two</del> tildes.</p>
      <h2>Table</h2>









      <table><thead><tr><th>a</th><th align=\\"left\\">b</th><th align=\\"right\\">c</th><th align=\\"center\\">d</th></tr></thead></table>
      <h2>Tasklist</h2>
      <ul>
      <li class=\\"task-list-item\\"><input type=\\"checkbox\\" disabled> to do</li>
      <li class=\\"task-list-item\\"><input type=\\"checkbox\\" checked disabled> done</li>
      </ul>"
    `);
  });

  test("HTML", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
# HTML

<details class="note">

A mix of *Markdown* and <em>HTML</em>.

</details>
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>HTML</h1>
      <details>
      <p>A mix of <em>Markdown</em> and <em>HTML</em>.</p>
      </details>"
    `);
  });

  test("Cross-Site Scripting (XSS)", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
# Cross-Site Scripting (XSS)

👍<script>document.write("💩");</script>🙌
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>Cross-Site Scripting (XSS)</h1>
      <p>👍🙌</p>"
    `);
  });

  test("Syntax highlighting (Shiki)", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
# Syntax highlighting (Shiki)

\`\`\`javascript
const shiki = require('shiki')

shiki.getHighlighter({
  theme: 'nord'
}).then(highlighter => {
  console.log(highlighter.codeToHtml(\`console.log('shiki');\`, 'js'))
})
\`\`\`
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>Syntax highlighting (Shiki)</h1>
      <pre class=\\"shiki\\" style=\\"background-color: #FFFFFF\\"><code><span class=\\"line\\"><span style=\\"color: #0000FF\\">const</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0070C1\\">shiki</span><span style=\\"color: #000000\\"> = </span><span style=\\"color: #795E26\\">require</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">'shiki'</span><span style=\\"color: #000000\\">)</span></span>

      <span class=\\"line\\"><span style=\\"color: #001080\\">shiki</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">getHighlighter</span><span style=\\"color: #000000\\">({</span></span>
      <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #001080\\">theme:</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #A31515\\">'nord'</span></span>
      <span class=\\"line\\"><span style=\\"color: #000000\\">}).</span><span style=\\"color: #795E26\\">then</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\"> </span><span style=\\"color: #0000FF\\">=></span><span style=\\"color: #000000\\"> {</span></span>
      <span class=\\"line\\"><span style=\\"color: #000000\\">  </span><span style=\\"color: #001080\\">console</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">log</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #001080\\">highlighter</span><span style=\\"color: #000000\\">.</span><span style=\\"color: #795E26\\">codeToHtml</span><span style=\\"color: #000000\\">(</span><span style=\\"color: #A31515\\">\`console.log('shiki');\`</span><span style=\\"color: #000000\\">, </span><span style=\\"color: #A31515\\">'js'</span><span style=\\"color: #000000\\">))</span></span>
      <span class=\\"line\\"><span style=\\"color: #000000\\">})</span></span></code></pre>"
    `);
  });

  test("Mathematics (KaTeX)", () => {
    expect(
      app.get("text processor")(
        // prettier-ignore
        markdown`
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
`
      )
    ).toMatchInlineSnapshot(`
      "<h1>Mathematics (KaTeX)</h1>
      <p>Lift(<span class=\\"math-inline\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\"><semantics><mrow><mi>L</mi></mrow><annotation encoding=\\"application/x-tex\\">L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.68333em;vertical-align:0em;\\"></span><span class=\\"mord mathnormal\\">L</span></span></span></span></span>) can be determined by Lift Coefficient (<span class=\\"math-inline\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\"><semantics><mrow><msub><mi>C</mi><mi>L</mi></msub></mrow><annotation encoding=\\"application/x-tex\\">C_L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.83333em;vertical-align:-0.15em;\\"></span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.07153em;\\">C</span><span class=\\"msupsub\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.32833099999999993em;\\"><span style=\\"top:-2.5500000000000003em;margin-left:-0.07153em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mathnormal mtight\\">L</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.15em;\\"><span></span></span></span></span></span></span></span></span></span></span>) like the following
      equation.</p>
      <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mi>L</mi><mo>=</mo><mfrac><mn>1</mn><mn>2</mn></mfrac><mi>ρ</mi><msup><mi>v</mi><mn>2</mn></msup><mi>S</mi><msub><mi>C</mi><mi>L</mi></msub></mrow><annotation encoding=\\"application/x-tex\\">L = \\\\frac{1}{2} \\\\rho v^2 S C_L</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:0.68333em;vertical-align:0em;\\"></span><span class=\\"mord mathnormal\\">L</span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span><span class=\\"mrel\\">=</span><span class=\\"mspace\\" style=\\"margin-right:0.2777777777777778em;\\"></span></span><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:2.00744em;vertical-align:-0.686em;\\"></span><span class=\\"mord\\"><span class=\\"mopen nulldelimiter\\"></span><span class=\\"mfrac\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:1.32144em;\\"><span style=\\"top:-2.314em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">2</span></span></span><span style=\\"top:-3.23em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"frac-line\\" style=\\"border-bottom-width:0.04em;\\"></span></span><span style=\\"top:-3.677em;\\"><span class=\\"pstrut\\" style=\\"height:3em;\\"></span><span class=\\"mord\\"><span class=\\"mord\\">1</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.686em;\\"><span></span></span></span></span></span><span class=\\"mclose nulldelimiter\\"></span></span><span class=\\"mord mathnormal\\">ρ</span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.03588em;\\">v</span><span class=\\"msupsub\\"><span class=\\"vlist-t\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.8641079999999999em;\\"><span style=\\"top:-3.113em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mtight\\">2</span></span></span></span></span></span></span></span><span class=\\"mord mathnormal\\" style=\\"margin-right:0.05764em;\\">S</span><span class=\\"mord\\"><span class=\\"mord mathnormal\\" style=\\"margin-right:0.07153em;\\">C</span><span class=\\"msupsub\\"><span class=\\"vlist-t vlist-t2\\"><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.32833099999999993em;\\"><span style=\\"top:-2.5500000000000003em;margin-left:-0.07153em;margin-right:0.05em;\\"><span class=\\"pstrut\\" style=\\"height:2.7em;\\"></span><span class=\\"sizing reset-size6 size3 mtight\\"><span class=\\"mord mathnormal mtight\\">L</span></span></span></span><span class=\\"vlist-s\\">​</span></span><span class=\\"vlist-r\\"><span class=\\"vlist\\" style=\\"height:0.15em;\\"><span></span></span></span></span></span></span></span></span></span></span></div>
      <p>A raw dollar sign: $</p>
      <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mstyle mathcolor=\\"#cc0000\\"><mtext>\\\\invalidMacro</mtext></mstyle></mrow><annotation encoding=\\"application/x-tex\\">\\\\invalidMacro</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:1em;vertical-align:-0.25em;\\"></span><span class=\\"mord text\\" style=\\"color:#cc0000;\\"><span class=\\"mord\\" style=\\"color:#cc0000;\\">\\\\invalidMacro</span></span></span></span></span></span></div>
      <p>Prevent large width/height visual affronts:</p>
      <div class=\\"math-display\\"><span class=\\"katex-display\\"><span class=\\"katex\\"><span class=\\"katex-mathml\\"><math xmlns=\\"http://www.w3.org/1998/Math/MathML\\" display=\\"block\\"><semantics><mrow><mpadded height=\\"+0em\\" voffset=\\"0em\\"><mspace mathbackground=\\"black\\" width=\\"25em\\" height=\\"25em\\"></mspace></mpadded></mrow><annotation encoding=\\"application/x-tex\\">\\\\rule{500em}{500em}</annotation></semantics></math></span><span class=\\"katex-html\\" aria-hidden=\\"true\\"><span class=\\"base\\"><span class=\\"strut\\" style=\\"height:25em;vertical-align:0em;\\"></span><span class=\\"mord rule\\" style=\\"border-right-width:25em;border-top-width:25em;bottom:0em;\\"></span></span></span></span></span></div>"
    `);
  });
});
