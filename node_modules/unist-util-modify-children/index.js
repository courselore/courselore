import {arrayIterate} from 'array-iterate'

/**
 * @typedef {import('unist').Parent} Parent
 * @typedef {import('unist').Node} Node
 *
 * @callback Modifier
 * @param {Node} node
 * @param {number} index
 * @param {Parent} parent
 * @returns {number|void}
 *
 * @callback Modify
 * @param {Parent} node
 * @returns {void}
 */

/**
 * Turn `callback` into a child-modifier accepting a parent.
 * See `array-iterate` for more info.
 *
 * @param {Modifier} callback
 * @returns {Modify}
 */
export function modifyChildren(callback) {
  return iterator

  /**
   * @param {Parent} parent
   * @returns {void}
   */
  function iterator(parent) {
    if (!parent || !parent.children) {
      throw new Error('Missing children in `parent` for `modifier`')
    }

    arrayIterate(parent.children, iteratee, parent)
  }

  /**
   * Pass the context as the third argument to `callback`.
   *
   * @this {Parent}
   * @param {Node} node
   * @param {number} index
   */
  function iteratee(node, index) {
    return callback(node, index, this)
  }
}
