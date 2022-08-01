/** Inserts `text` at the cursor’s position, replacing any selection, with **undo** support and by firing the `input` event. */
export declare function insert(field: HTMLTextAreaElement | HTMLInputElement, text: string): void;
/** Replaces the entire content, equivalent to `field.value = text` but with **undo** support and by firing the `input` event. */
export declare function set(field: HTMLTextAreaElement | HTMLInputElement, text: string): void;
/** Get the selected text in a field or an empty string if nothing is selected. */
export declare function getSelection(field: HTMLTextAreaElement | HTMLInputElement): string;
/** Adds the `wrappingText` before and after field’s selection (or cursor). If `endWrappingText` is provided, it will be used instead of `wrappingText` at on the right. */
export declare function wrapSelection(field: HTMLTextAreaElement | HTMLInputElement, wrap: string, wrapEnd?: string): void;
declare type ReplacerCallback = (substring: string, ...args: any[]) => string;
/** Finds and replaces strings and regex in the field’s value, like `field.value = field.value.replace()` but better */
export declare function replace(field: HTMLTextAreaElement | HTMLInputElement, searchValue: string | RegExp, replacer: string | ReplacerCallback): void;
export {};
