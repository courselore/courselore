<!-- 
- [ ] Food for thought: All these designs allow me to mark a string as safe for inclusion in HTML right as I’m interpolating it; but none of them seem to give me the option to mark a good old string as safe for inclusion, so that its safeness becomes a property of the string itself (which is Rails’s design, as far as I can remember)
- I tested this against `ReactDOMServer.renderToStaticMarkup()` and it’s twice as fast!


@leafac/html: 1199ms
React: 2487ms

import { html } from "@leafac/html";
import React from "react";
import ReactDOMServer from "react-dom/server.js";

let before;
const iterations = 1_000_000;

const leafac_HTML = () =>
  html`
    <a href="${`https://leafac.com`}">
      $${html`<strong>${"Hello World"}</strong>`}
    </a>
  `;
console.log(leafac_HTML());
before = Date.now();
for (let i = 0; i < iterations; i++) leafac_HTML();
console.log(`@leafac/html: ${Date.now() - before}ms`);

const react = () =>
  ReactDOMServer.renderToStaticMarkup(
    <a href={`https://leafac.com`}>{<strong>{"Hello World"}</strong>}</a>
  );
console.log(react());
before = Date.now();
for (let i = 0; i < iterations; i++) react();
console.log(`React: ${Date.now() - before}ms`);


-->

<h1 align="center">@leafac/html</h1>
<h3 align="center">HTML <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals">tagged template literals</a></h3>
<p align="center">
<a href="https://github.com/leafac/html"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/html"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fhtml.svg"></a>
<a href="https://github.com/leafac/html/actions"><img src="https://github.com/leafac/html/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Videos

[<img src="https://img.youtube.com/vi/em3x-HbtCag/0.jpg" width="200" /><br />Demonstration](https://youtu.be/em3x-HbtCag)

[<img src="https://img.youtube.com/vi/UPNNLrXlnfw/0.jpg" width="200" /><br />Code Review](https://youtu.be/UPNNLrXlnfw)

### Installation

```console
$ npm install @leafac/html
```

Use @leafac/html with [Prettier](https://prettier.io) (automatic formatting), and the Visual Studio Code extensions [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (Prettier support) and [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) (syntax highlighting).

### Features, Usage, and Examples

- **Use tagged template literals as an HTML template engine.** For example:

  ```typescript
  import html from "@leafac/html";

  console.log(html`<p>${"Leandro Facchinetti"}</p>`); // => <p>Leandro Facchinetti</p>
  ```

- **Safe by default.** For example:

  ```typescript
  console.log(html`<p>${`<script>alert(1);</script>`}</p>`); // => <p>&#x3C;script&#x3E;alert(1);&#x3C;/script&#x3E;</p>
  ```

- **Unsafely interpolate trusted HTML with `$${...}`.** For example:

  ```typescript
  console.log(html`<p>$${`<span>Leandro Facchinetti</span>`}</p>`); // => <p><span>Leandro Facchinetti</span></p>
  ```

- **Join interpolated arrays.** For example:

  ```typescript
  console.log(html`<p>${["Leandro", " ", "Facchinetti"]}</p>`); // => <p>Leandro Facchinetti</p>
  ```

  Array interpolations are safe by default; if you wish to unsafely interpolate an array of trusted HTML use `$${[...]}`.

- **@leafac/html doesn’t encode HTML itself.** It relies on [he](https://npm.im/he), which is much more robust than any bespoke encoding.

- **@leafac/html doesn’t try to format the output.** If you need pretty HTML, you may call Prettier programmatically on the output.

- **@leafac/html generates strings.** No kind of virtual DOM here. For readability, the `HTML` type is exported in TypeScript, and you may use it like in the following example:

  ```typescript
  import { html, HTML } from ".";
  const name: HTML = html`<p>Leandro Facchinetti</p>`;
  console.log(name);
  ```

- **@leafac/html sanitizes (removes) invalid XML characters.** It uses [sanitize-xml-string](https://npm.im/sanitize-xml-string). For example:

  <!-- prettier-ignore -->
  ```typescript
  console.log(html`<p>A backspace is invalid in XML: |\b|</p>`); // => <p>A backspace is invalid in XML: ||</p>
  ```

### Related Projects

- <https://npm.im/@leafac/sqlite>: [better-sqlite3](https://npm.im/better-sqlite3) with tagged template literals.
- <https://npm.im/@leafac/sqlite-migration>: A lightweight migration system for @leafac/sqlite.

### Prior Art

- <https://npm.im/html-template-tag>:
  - Was a major inspiration for this. Its design is simple and great. In particular, I love (and stole) the idea of using `$${...}` to mark safe interpolation.
  - [Doesn’t encode arrays by default](https://github.com/AntonioVdlC/html-template-tag/issues/10).
  - [Uses a bespoke encoding](https://github.com/AntonioVdlC/html-template-tag/blob/b6a5eee92a4625c93de5cc9c3446cd3ca79e9b3c/src/index.js#L3).
  - [Has awkward types that require substitutions to be `string`s, as opposed to `any`s](https://github.com/AntonioVdlC/html-template-tag/blob/b6a5eee92a4625c93de5cc9c3446cd3ca79e9b3c/index.d.ts#L3).
- <https://npm.im/common-tags>:
  - Doesn’t encode interpolated values by default.
  - Uses the `safeHtml` tag, which isn’t recognized by Prettier & the es6-string-html Visual Studio Code extension.
- <https://npm.im/escape-html-template-tag>:
  - Awkward API with `escapeHtml.safe()` and `escapeHtml.join()` instead of the `$${}` trick.
  - [Uses a bespoke encoding](https://github.com/Janpot/escape-html-template-tag/blob/14ab388646b9b930ea68a46b0a9c8314d65b388a/index.mjs#L1-L10).
- <https://npm.im/lit-html>, <https://npm.im/nanohtml>, <https://npm.im/htm>, and <https://npm.im/viperhtml>:
  - Have the notion of virtual DOM instead of simple strings.
