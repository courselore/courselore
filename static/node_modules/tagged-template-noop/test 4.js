const noopt = require('./index.js');

const cmp = (a, b) => { expect(a).toEqual(b) };

it(`Will yield the same result as not using a template function.`, () => {
  cmp(noopt`foo${'bar'}`,
           `foo${'bar'}`)
  cmp(noopt`${'bar'}`,
           `${'bar'}`)
  cmp(noopt``,
           ``)
  cmp(noopt`${'foo'}`,
           `${'foo'}`)
  cmp(noopt`${/foo/}bar`,
           `${/foo/}bar`)
  cmp(noopt`${'foo'}bar${347}`,
           `${'foo'}bar${347}`)
  cmp(noopt`${'foo'}bar${347}${/qux/}`,
           `${'foo'}bar${347}${/qux/}`)
  cmp(noopt`${'foo'}${347}qux`,
           `${'foo'}${347}qux`)
})
