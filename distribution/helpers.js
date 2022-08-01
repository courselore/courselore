import escapeStringRegexp from "escape-string-regexp";
import { html } from "@leafac/html";
export default (app) => {
    app.locals.helpers.emailRegExp = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
    app.locals.helpers.isDate = (string) => string.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null &&
        !isNaN(new Date(string).getTime());
    app.locals.helpers.isExpired = (expiresAt) => expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();
    app.locals.helpers.sanitizeSearch = (search, { prefix = false } = {}) => splitSearchPhrases(search)
        .map((phrase) => `"${phrase.replaceAll('"', '""')}"${prefix ? "*" : ""}`)
        .join(" ");
    app.locals.helpers.highlightSearchResult = (searchResult, searchPhrases, { prefix = false } = {}) => {
        if (searchPhrases === undefined)
            return searchResult;
        if (typeof searchPhrases === "string")
            searchPhrases = splitSearchPhrases(searchPhrases);
        if (searchPhrases.length === 0)
            return searchResult;
        return searchResult.replace(new RegExp(`(?<!\\w)(?:${searchPhrases
            .map((searchPhrase) => escapeStringRegexp(searchPhrase))
            .join("|")})${prefix ? "" : "(?!\\w)"}`, "gi"), (searchPhrase) => html `<mark class="mark">$${searchPhrase}</mark>`);
    };
    const splitSearchPhrases = (search) => search.split(/\s+/).filter((searchPhrase) => searchPhrase.trim() !== "");
    app.locals.helpers.splitFilterablePhrases = (filterable) => filterable.split(/(?<=[^a-z0-9])(?=[a-z0-9])|(?<=[a-z0-9])(?=[^a-z0-9])/i);
};
//# sourceMappingURL=helpers.js.map