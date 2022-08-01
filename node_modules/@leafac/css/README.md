<!--
- Update to Tailwind 3
- Use explicit names like `large` instead of `lg`
- Normalize spaces with .replace(/\s/+, " "). This should reduce the number of redundant classes.
- Document: Don’t use #ids, because of specificity (use `key=""`s instead, for compatibility with @leafac/javascript)
-->

# This documentation is a work-in-progress. The library itself is ready for consumption for early adopters.

<h1 align="center">@leafac/css</h1>
<h3 align="center">Radically Straightforward CSS</h3>
<p align="center">
<a href="https://github.com/leafac/css"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/@leafac/css"><img alt="Package" src="https://badge.fury.io/js/%40leafac%2Fcss.svg"></a>
<a href="https://github.com/leafac/css/actions"><img src="https://github.com/leafac/css/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Support

- <https://patreon.com/leafac>
- <https://paypal.me/LeandroFacchinetti>

### Installation

```console
$ npm install @leafac/css
```

### Example

```typescript
import html from "@leafac/html";
import { css, extractInlineStyles } from ".";

console.log(
  extractInlineStyles(html`
    <!DOCTYPE html>
    <html lang="en">
      <head></head>
      <body>
        <p
          style="${css`
            background-color: var(--color--red--500);
            &:hover {
              background-color: var(--color--red--300);
            }

            @media (max-width: 599px) {
              margin: 1rem;
            }
          `}"
        >
          Leandro Facchinetti
        </p>
      </body>
    </html>
  `)
);
```

Produces:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <style>
      /* ... A PREAMBLE WITH A CSS RESET, A DESIGN SYSTEM, AND SO FORTH ... */

      /* INLINE STYLES */

      .style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw {
        background-color: var(--color--red--500);
      }

      .style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw:hover {
        background-color: var(--color--red--300);
      }

      @media (max-width: 599px) {
        .style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw.style--1s69iw {
          margin: 1rem;
        }
      }
    </style>
  </head>
  <body>
    <p class="style--1s69iw">Leandro Facchinetti</p>
  </body>
</html>
```

<details>
<summary>What’s up with the Repeated Selectors?</summary>

It’s a hack to give the selector a specificity high enough that it won’t be overwritten by most other styles.

</details>

<details>
<summary>What’s [@leafac/html](https://npm.im/@leafac/html)?</summary>

That’s my other package for Radically Straightforward HTML, which is just HTML templates embedded in JavaScript using [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates).

</details>

### What’s in the Box? (Why I Love Tailwind Css; Why I Have Never Actually Used It; And How I’m Proposing to Replace It with 10 Lines of Code.)

#### A Radically Straightforward Approach to CSS

In the beginning, styles lived inline in the HTML. That was good because it was the simplest thing that could work, but it had its limitations: design inconsistencies, verbosity, and so forth.

We solved this by pulling styles into a stylesheet and connecting them to the HTML via selectors, classes, ids, and so forth. That was good because it led to more consistent designs, relatively less code, and some reusable components, for example, those in the most popular components library, [Bootstrap](https://getbootstrap.com). But it had its limitations: the HTML and its corresponding styles were far away, which can make things more difficult to understand and modify; and you often had to spend time being creative to come up with class names that didn’t describe much of anything, and existed only to connect the HTML to its corresponding styles.

People have come to realize that both approaches have their place. We start with a global stylesheet including things like fonts, colors, sizes, and so forth; and we complete the job with inline styles. We avoid extracting things into reusable components until they really do need to be reused in other places.

This is the driving principle behind the popularity of tools like [Tailwind CSS](https://tailwindcss.com). Unlike Bootstrap, Tailwind isn’t a collection of components—it’s a framework at a lower level. It’s closer to an **approach** for how to reason about styles. I **love** how straightforward, productive, and scalable this approach feels. And I’m not alone. But Tailwind has its limitations.

##### Why Not Use Tailwind CSS?

**Because it’s a new language to learn.** The good-old `width: 8rem` turns into `m-32`; and `text-align: center` turns into `text-center`; and so forth. While it’s true that you can become proficient in this new language relatively quickly, you still have to keep translating things in your head the entire time you’re using Tailwind. Every time you read CSS documentation, or a tutorial showing how to do something, you have to translate.

**Because the Tailwind CSS build system is weird.** For the longest time Tailwind worked by producing every single utility class you could possibly want to use; then pruning everything you didn’t end up using, which is most things. This feels backwards, and it isn’t super-fast either. In the most recent releases Tailwind introduced a just-in-time compiler that alleviates some of these concerns. Both the pruning and the just-in-time compiler work by inspecting your HTML to detect which utility classes you used.

##### But What to Use Instead of Tailwind? Inline Styles with Modest Superpowers

The Tailwind approach is [similar in spirit to inline styles](https://tailwindcss.com/docs/utility-first#why-not-just-use-inline-styles), but it improves upon inline styles in the following ways:

**Designing with constraints:** Using a design system is an **awesome** idea and improved my game as a developer venturing into design more than anything else I’ve ever tried. But we could have the design system as any kind of sets of variables, most notably [CSS custom properties (variables)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties), but [Sass](https://sass-lang.com) variables or anything else would also work.

**Responsive design; hover, focus, and other states:** That’s when the **modest superpowers** of inline styles come in. While it’s true that inline styles can’t have media queries or `:hover`, `:focus`, and so forth, what if instead of introducing a new language of class names like `md:...` and `hover:...`, we just preprocessed the inline styles to give them these abilities? It’s easy with nesting:

```html
<body>
  <p
    style="
      background-color: red;

      @media (max-width: 599px) {
        margin: 1rem;
      }

      &:hover {
        background-color: blue;
      }
    "
  >
    Leandro Facchinetti
  </p>
</body>
```

Becomes:

```html
<head>
  <style>
    .style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2 {
      background-color: red;
    }

    @media (max-width: 599px) {
      .style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2 {
        margin: 1rem;
      }
    }

    .style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2.style--zvyll2:hover {
      background-color: blue;
    }
  </style>
</head>
<body>
  <p class="style--zvyll2">Leandro Facchinetti</p>
</body>
```

**BOOM:** The first time you read this you already understood it. Nesting is super-natural at this point to most people writing CSS. It’s supported by all pre-processors and it’s on track to become a standard in CSS.

@leafac/css is a preprocessor that does exactly this. But more importantly, @leafac/css is an architectural statement that this is how we should be writing our styles.

<!-- Htmx
style -> data-style ??? -->

<!-- * My approach to css & ondomcontentloaded is just object oriented programming -->

<!-- 



- [ ] Reason why my css strategy is good: no !importantts to overwrite with js
    - [ ] Why I like Tailwind: Principle of locality; avoid premature optimization
    - [ ] What I don’t like: Learning curve; weird build system
    - [ ] Oh, but my approach requires you to process the HTML; well Tailwind uses Purge, which has teh same requirement…
    - [ ] You’re only loading the css you need for that page
    - [ ] https://youtu.be/J_7_mnFSLDg?t=1695 DUDE’S COPYING THE HTML TO CHANGE INLINE STYLES!! OH NOES!



- [ ] It reflects the fullstack nature of the developer
- [ ] Separation of concerns, but feature-wide instead of presentation/behavior/markup
- [ ] References:
    - [ ] https://www.npmjs.com/package/csjs
    - [ ] https://www.npmjs.com/package/radium



    https://vanilla-extract.style
    Type checking & autocomplete. I’m totally stealing that idea! Instead of writing:

color: var(--color--green--200);

You’ll write something like:

color: ${css.color.green[200]};


xxhash

https://xstyled.dev

https://github.com/bryc/code/tree/master/jshash/hashes

https://linaria.dev/
 -->

<!-- What else is there to love about Tailwind? The docs (including the book), and the design system -->

<!-- And sometimes in those situations extracting CSS components isn’t the right level of abstraction, because the component also has opinions on the HTML. React, for example, but we can do it much more simply. -->

<!-- Put a code example right away -->

<!-- <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
          /> -->

<!--
trust your eyes

screens: don’t use a set of breakpoints, instead look at the interface, determine when it isn’t working anymore, and add a breakpoint there (also, CSS custom properties don’t work in media queries)

approach:
reset
design system
global styles (for example, font)
components for things like form inputs and buttons
inline styles everywhere else

think about styles and order them in the stylesheet inside-out


- https://tailwindcss.com/docs/utility-first#why-not-just-use-inline-styles

      // TODO: Make this possibly faster by using Rehype instead of JSDOM (though we have to benchmark to be sure…)
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-classes
      //         https://www.npmjs.com/package/pseudo-classes
      //       https://developer.mozilla.org/en-US/docs/Web/CSS/Pseudo-elements
      //       https://github.com/postcss/postcss
      //       https://github.com/brettstimmerman/mensch
      // https://stackoverflow.com/questions/10963997/css-parser-for-javascript
      // https://github.com/CSSLint/parser-lib
      // https://github.com/NV/CSSOM
      // https://github.com/reworkcss/css
      // https://www.npmjs.com/package/cssparser
      // https://rahulnpadalkar.medium.com/css-parser-in-javascript-578eba0977e5
      // https://github.com/rahulnpadalkar/CSSParser
      // http://glazman.org/JSCSSP/

      // https://github.com/postcss/postcss-scss
      // https://github.com/postcss/postcss-js
      // https://github.com/jonathantneal/precss
      // https://github.com/postcss/postcss-nested (more installations than the one below)
      // https://github.com/jonathantneal/postcss-nesting (closer to the standard and more stars than the one above)

      // https://github.com/jsdom/cssstyle
      // https://github.com/reworkcss/css
      // https://github.com/css/csso
      // https://github.com/csstree/csstree
      // https://github.com/brettstimmerman/mensch



Use @leafac/html with [Prettier](https://prettier.io) (automatic formatting), and the Visual Studio Code extensions [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) (Prettier support) and [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html) (syntax highlighting).


### Related Projects


### Prior Art


-->
