import { HTML } from "@leafac/html";
import { Courselore } from "./index.js";
export declare type EmailRegExpHelper = RegExp;
export declare type IsDateHelper = (string: string) => boolean;
export declare type IsExpiredHelper = (expiresAt: string | null) => boolean;
export declare type SanitizeSearchHelper = (search: string, options?: {
    prefix?: boolean;
}) => string;
export declare type HighlightSearchResultHelper = (searchResult: string, searchPhrases: string | string[] | undefined, options?: {
    prefix?: boolean;
}) => HTML;
export declare type SplitFilterablePhrasesHelper = (filterable: string) => string[];
declare const _default: (app: Courselore) => void;
export default _default;
//# sourceMappingURL=helpers.d.ts.map