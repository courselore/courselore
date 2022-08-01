# Tagged template literal noop

[![npm](https://img.shields.io/npm/v/tagged-template-noop.svg)](https://www.npmjs.com/package/tagged-template-noop)

This module exports a single function that can be called with an ES2015 [template string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_template_literals) to have the same effect as not using any template function with your template literal.

```javascript
const noopt = require('tagged-template-noop');

const qualifier = 'totally';

assert(
  noopt`Hopefully, I will be ${qualifier} useless.`
  ===  `Hopefully, I will be ${qualifier} useless.`
);
```

Possible uses include:
* Expression-oriented programming style, e.g.:

    ```javascript
    app.send((argv.escapeHtml ? escapeHtml : noopt)`
      <!doctype html>
      <html>
        <body>
          Hello ${form.username} !
        </body>
      </html>`
    );
    ```
* Testing
* Working around limited editor template literal content highlighting (e.g. to highlight [GraphQL](https://github.com/jparise/vim-graphql/pull/1) template strings in Vim)
