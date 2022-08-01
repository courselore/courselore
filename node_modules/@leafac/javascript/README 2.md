# ⚠️ WORK-IN-PROGRESS. What follows are notes that will at some point turn into proper documentation. ⚠️

<details>

# My Version of morphdom

## Essential Features (And How It’s Different from morphdom and nanomorph)

- **Key.**
  - Serves two purposes:
    1. Distinguishes between components that rely on the same tag.
       - For example, `<div key="conversations">` and `<div key="new-conversation">`
       - Prevents trying to morph between completely unrelated components, which is a lot of unnecessary work compared to a complete replacement.
       - Similar to React’s named components (`<TagsWhichStartWithACapitalLetter>`), and to nanomorph’s `data-nanomorph-component-id`.
       - When used for this purpose, may repeat between siblings (unlike React’s `key`s, but like `data-nanomorph-component-id`).
    2. Allows for reordering of list-like elements.
       - Similar to React’s `key`s.
       - When used for this purpose, shouldn’t repeat between siblings (like React’s `key`s).
  - Notes:
    - It’s okay to mix and match between these two purposes (2 is actually a subcase of 1).
    - Even when using for purpose 2, the only needs to be unique among siblings—it may repeat across the document (like React’s `key`s, unlike `id`s).
- **Longest Common Subsequence (LCS).**
  - Minimize modifications to the DOM in cases of insertions, deletions, and transpositions, particularly in the middle of the list of child nodes.
    - Preserve state such as scrolling position, input caret positions, CSS transitions, hidden state, and so forth.
  - May alleviate some of the manual work of assigning keys for purpose 1.
  - Performance-wise, minimizing modifications to the DOM makes things faster but computing the LCS makes things slower, and whether the trade-off is worth it is up in the air.
  - This is what React seems to do. Contrary to [their documentation](https://reactjs.org/docs/reconciliation.html#recursing-on-children), even without keys React recognizes an insertion in the middle of a list without `key`s.
  - Doesn’t handle the case of a subtree being moved from one part of the document to a completely unrelated part.
    - In that case, the subtree is deleted, and a new equivalent subtree is inserted at the destination.
    - Similar to React.
    - In practice this seems to be reasonable approach.
    - The reason for this heuristic is that this general problem of subtree similarity is slow to compute (O(n³)).
    - morphdom actually has a workaround for this using `id`s, but we haven’t implemented anything like that.
- Also, unlike morphdom and nanomorph, we don’t modify the destination DOM node (we use `.importNode()` instead) so you don’t have to discard it.

## Desirable Features

- Separate `diff` & `patch`, so that the `diff` may be done on the server, and the `patch` on the client.
  - This is more work for the server, but minimizes data on the wire and load on the client, which may be advantageous, particularly for people on mobile connections, in which case it’s reasonable to expect the internet to be slower and the device to be less powerful.

## Ideas

- Use `.isEqualNode()`.
  - Seems like a good idea in theory, but in practice may introduce overhead and something as simple as a new `html-for-javascript--<number>` makes nodes different.
- Right now, when a node isn’t an element (for example, it’s text, or a comment), its `.nodeValue` is part of its identity, which means in case some text has changed, we remove and add nodes. We could remove the `.nodeValue` from the identity and sync it, similar to how we sync attributes on elements.
  - Advantage: Possibly less addition/deletion of siblings.
  - Disadvantage: Possibly more shuffling things around, as we have less information for LCS.
- Maybe `<input type="file">` shouldn’t be morphed under some circumstances, because we can’t reset their `.files`.
- Add support for namespaced attributes?
- Add support for `<select>` & `<option>`? (See https://github.com/patrick-steele-idem/morphdom/blob/master/src/specialElHandlers.js & https://github.com/choojs/nanomorph/blob/master/lib/morph.js)

## Related Work

- **Similar Libraries.**
  - <https://npm.im/morphdom>
    - Transposition is only handled via `id`s, which are global, not scoped to siblings.
    - [Doesn’t handle well the case of insertions in the middle, losing state (for example, scrolling position) of siblings, because it detaches and reattaches them](https://github.com/patrick-steele-idem/morphdom/issues/200).
  - <https://npm.im/nanomorph>
    - Transposition is only handled via `id`s, which are global, not scoped to siblings.
      - Maybe it could be handled with `data-nanomorph-component-id`, but still, as far as I understand, it doesn’t do LCS, and probably detaches and reattaches elements similar to morphdom.
    - No lifecycle callbacks (though most of them are subsumed by other mechanisms, for example, `.isSameNode()`).
    - Transferring callback handlers seems heavy-handed (though it may be a good idea in practice).
  - Others
    - Rely on some notion of virtual DOM or introduce abstractions and opinions in terms of how components should be specified.
- **Implementations of the Algorithms (See below for Algorithms Themselves).**
  - https://github.com/YuJianrong/fast-array-diff
    - The output is minimal and the performance is good
    - Claims to use less memory but be slower than `diff`.
    - More popular
    - Ended up using it because it comes with ESM version in the npm package, making it easy to use with Rollup.
  - https://github.com/gliese1337/fast-myers-diff
    - The output is minimal and the performance is good
    - I’m not a huge fan of the generator-based API, but I understand its purpose
    - Reasons to not go with it:
      - It’s less popular than fast-array-diff
      - The npm package doesn’t include an ESM version. (We could always fetch the source, but that’s less ergonomic.)
  - https://github.com/kpdecker/jsdiff (diff)
    - Good, but may be a bit bloated, given that it solves several cases, for example, splitting text.
  - https://github.com/flitbit/diff (deep-diff)
    - Deal-breaker: Doesn’t generate optimal diffs.
  - https://github.com/AsyncBanana/microdiff
    - Deal-breaker: Doesn’t generate optimal diffs.
    - It’s focused on being fast, having a small bundle size, and supporting data structures such as `Date`s and cyclic objects.
  - https://github.com/wickedest/myers-diff
    - Text-only
  - https://github.com/tapirdata/mdiff
    - Weird API, doesn’t look as polished.
  - https://github.com/Two-Screen/symmetry/
    - [Doesn’t seem to be super-optimized](https://github.com/Two-Screen/symmetry/blob/86644f6585e714fe00a9bb7068980188abb7ba5b/src/diff.ts#L241).
    - Supports many data types, which is more than we need.
- **Algorithms.**
  - [React Reconciliation](https://reactjs.org/docs/reconciliation.html)
    - Claims to be linear time (`O(n)`), but it’s getting right some insertions in the middle of a list, which I don’t think one can do in linear time 🤷
  - LCS:
    - Myers
      - Canonical sources:
        - <http://www.xmailserver.org/diff2.pdf>
        - <https://publications.mpi-cbg.de/Miller_1985_5440.pdf>
      - Other people explaining it:
        - <https://blog.jcoglan.com/2017/02/12/the-myers-diff-algorithm-part-1/>
        - <https://blog.robertelder.org/diff-algorithm/>
        - <https://tiarkrompf.github.io/notes/?/diff-algorithm/>
      - Improvements:
        - <https://neil.fraser.name/writing/diff/>
        - <https://www.sciencedirect.com/science/article/abs/pii/002001909090035V>
      - Implementations:
        - <http://www.mathertel.de/Diff/>
        - <https://github.com/git/git/blob/a68dfadae5e95c7f255cf38c9efdcbc2e36d1931/xdiff/xdiffi.c> (see folder for alternative algorithms)
      - Notes:
        - It seems to be used by `diff`, `git`, and so forth.
    - Patching:
      - <https://neil.fraser.name/writing/patch/>
      - Notes:
        - This relevant when we get to the idea of doing diffing on the server and patching on the client.
        - It isn’t trivial because the client may have changed the DOM ever so slightly, and we must use the context to apply the patch, as well as deal with conflicts.
    - Wagner–Fischer
      - <https://dl.acm.org/doi/10.1145/321796.321811>
      - Notes:
        - This is the original dynamic-programming implementation that sidesteps the exponential complexity of the brute-force approach.
    - Heckel
      - <http://documents.scribd.com/docs/10ro9oowpo1h81pgh1as.pdf>
      - Notes:
        - Includes **move** operations.
        - Deal-breaker: Makes more inserts/deletes: <https://neil.fraser.name/writing/diff/> §2.3
    - Patience Diff
      - Original explanation: <https://bramcohen.livejournal.com/73318.html>
      - Other people explaining it:
        - <https://blog.jcoglan.com/2017/09/19/the-patience-diff-algorithm/>
        - <http://bryanpendleton.blogspot.com/2010/05/patience-diff.html>
        - <https://alfedenzo.livejournal.com/170301.html>
        - <https://stackoverflow.com/questions/40133534/is-gits-implementation-of-the-patience-diff-algorithm-correct/40159510#40159510>
      - Implementations:
        - <https://www.npmjs.com/package/patience-diff>
      - Notes:
        - Supposedly easy to implement and linear performance.
        - Focuses on making diffs readable, which isn’t a high priority for us.
        - Relies on the notion of low-frequency vs high-frequency elements, which may not be applicable.
        - Seems to be slower than Myers.
        - Deal-breaker: [Makes more insert/deletes](https://gist.github.com/roryokane/6f9061d3a60c1ba41237).
    - Surveys:
      - <https://en.wikipedia.org/wiki/Edit_distance>
      - <https://en.wikipedia.org/wiki/Longest_common_subsequence_problem>
      - <https://en.wikipedia.org/wiki/Diff>
      - <https://wordaligned.org/articles/longest-common-subsequence>
      - <https://wiki.c2.com/?DiffAlgorithm>
      - Includes the notion of blocks: <https://ably.com/blog/practical-guide-to-diff-algorithms>
        - I don’t that the notion of blocks apply because DOM manipulations don’t afford for that.
  - Sorting algorithms for `key`s:
    - Probably minimizes manipulation to the DOM in the general case: <https://en.wikipedia.org/wiki/Insertion_sort>
    - Probably minimizes manipulation to the DOM when the siblings have been reordered, but not inserted/deleted: <https://en.wikipedia.org/wiki/Cycle_sort>
    - May also be relevant: <https://en.wikipedia.org/wiki/Selection_sort>
    - And the merge part of Merge Sort may also be relevant: <https://en.wikipedia.org/wiki/Merge_sort>
  - Tree edit distance:
    - This would be the optimal solution because it finds subtree movements across the tree, not limited to reordering siblings at a given level. Unfortunately, it’s too costly to be practical, so it makes sense to follow React’s heuristic of handling that edge case by destructing and reconstructing the subtree. Effectively, this turns the tree edit distance into a bunch of LCS problems, which are more tractable.
    - https://grfia.dlsi.ua.es/ml/algorithms/references/editsurvey_bille.pdf
    - http://tree-edit-distance.dbresearch.uni-salzburg.at/
    - https://stackoverflow.com/questions/1065247/how-do-i-calculate-tree-edit-distance
    - https://dl.acm.org/doi/10.1145/2699485

# Nonstandard Tags (Custom Elements) & Attributes

- We actually end up doing the exact opposite of the “best practices” 😛
- We don’t use nonstandard tags (custom elements) (for example, `<x-conversations></x-conversations>`) (instead, we use `<div key="conversation"></div>`).
  - Pros:
    - Cleaner.
  - Cons:
    - May require a bit more of explicit styling, because by default custom tags are inline elements but most components behave like block elements.
    - Are less familiar to some people.
    - Dealbreaker: Don’t work well when the component relies on a tag that has intrinsic meaning, for example, `<button>`. In that case, it would require registering it with JavaScript, adding a polyfill for Safari, and so forth.
- We do use nonstandard attributes (for example, `key`, `onload`, and so forth).
  - Pros:
    - Cleaner.
  - Cons:
    - New developers could mistake these for standard attributes.
    - It may clash with standard attributes in the future.
      - In practice, we can cross that bridge when we get to it.
      - Besides, some attributes such as `key` are used by React, so they’re a de-facto standard.
  - We could just use `data-`, but that’s more verbose…
- Bonus “bad practice” 😛:
  - We add attributes to DOM elements as we see fit (for example, `element.tooltip`, and so forth).
  - `dataset` doesn’t work because some of these attributes aren’t strings.
  - We could have namespaced them, like Tippy.js does with `_tippy`.
  - Let’s wait for it to become a problem…

</details>
