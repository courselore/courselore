<h1 align="center">@leafac/rehype-shiki</h1>
<h3 align="center"><a href="https://github.com/rehypejs/rehype">Rehype</a> plugin to highlight code blocks with <a href="https://shiki.matsu.io">Shiki</a></h3>
<p align="center">
<a href="https://github.com/leafac/rehype-shiki"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/rehype-shiki"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Frehype-shiki.svg"></a>
<a href="https://github.com/leafac/rehype-shiki/actions"><img src="https://github.com/leafac/rehype-shiki/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Installation

```console
$ npm install @leafac/rehype-shiki shiki
```

### Format

Code blocks must have the following format:

```html
<pre>
<code class="language-javascript">
return unified();
</code>
</pre>
```

This is the format produced by [remark-parse](https://github.com/remarkjs/remark/tree/main/packages/remark-parse) & [remark-rehype](https://github.com/remarkjs/remark-rehype) from the following Markdown:

````markdown
```javascript
return unified();
```
````

### Usage

See [`source/index.test.ts`](source/index.test.ts) for examples.

#### Options

- `highlighter` (required): An instance of the Shiki highlighter, or an object whose keys are identifiers and values are Shiki highlighters, in which case @leafac/rehype-shiki combines the outputs of all the highlighters.
- `throwOnUnsupportedLanguage` (default: `false`): A boolean indicating whether to throw an exception if a code block refers to an unsupported language.

### Security

@leafac/rehype-shiki doesn’t open you up to [cross-site scripting (XSS)](https://en.wikipedia.org/wiki/Cross-site_scripting) attacks as long as Shiki doesn’t (which it doesn’t).

### How Is This Different from [rehype-shiki](https://github.com/rsclarke/rehype-shiki)?

rehype-shiki is great! That’s how I learned about Shiki and I fell in love with it. The following are the ways in which @leafac/rehype-shiki is different:

1. TypeScript support.
2. Shiki is declared as a [`peerDependency`](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#peerdependencies), so @leafac/rehype-shiki doesn’t have to be updated when new versions of Shiki are released (as long as Shiki’s API remain compatible). See https://github.com/rsclarke/rehype-shiki/pull/48 https://github.com/rsclarke/rehype-shiki/pull/46 https://github.com/rsclarke/rehype-shiki/issues/47 https://github.com/rsclarke/rehype-shiki/issues/2.
3. You must pass in an instance of the Shiki highlighter, @leafac/rehype-shiki won’t create one for you. This means that:
   1. The Shiki highlighter instance is reused on every invocation of the processor, [instead of being recreated every time you call the processor](https://github.com/rsclarke/rehype-shiki/blob/3ebaeab3297d1cbe9ac75e2294ab636bbe250541/index.js#L38-L43).
   2. The transformer is synchronous, so you may use it with `.processSync()`.
4. Instead of [looking at the tokens produced by Shiki and generating hast](https://github.com/rsclarke/rehype-shiki/blob/3ebaeab3297d1cbe9ac75e2294ab636bbe250541/index.js#L69-L97), [@leafac/rehype-shiki lets Shiki produce HTML and parses the result](https://github.com/leafac/rehype-shiki/blob/a745b01d98608fb934c1bdbe9a1399e8b9dec1ed/src/index.ts#L32-L39). The advantage is that [when Shiki improves the output with things like italics](https://github.com/shikijs/shiki/pull/23) @leafac/rehype-shiki will pick the changes up with no extra work. The disadvantage is that we’re producing HTML as a string and then parsing it right back; this is slower, but in most cases it won’t matter and I think the previous advantages outweighs this disadvantage. (Also, the `language-*` class will be removed from the produced HTML, so you may need to adapt your CSS.)
5. Support for multiple highlighters.

That said, [I contacted the maintainers of rehype-shiki and try to merge the code bases](https://github.com/rsclarke/rehype-shiki/issues/49). We’ll see…

### Changelog

#### 2.1.0

- Added a feature that preserves the `position` of the top `element` node. Useful for products that need to map the HTML back to the Markdown that generated it (see tests).

#### 2.0.0

- [ESM only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).
- Compatible with unified 10.
