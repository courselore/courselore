import escapeStringRegexp from "escape-string-regexp";
import html, { HTML } from "@leafac/html";
import { Application } from "./index.mjs";

export type ApplicationHelpers = {
  server: {
    locals: {
      helpers: {
        emailRegExp: RegExp;
        isDate(string: string): boolean;
        isExpired(expiresAt: string | null): boolean;
        sanitizeSearch(search: string, options?: { prefix?: boolean }): string;
        highlightSearchResult(
          searchResult: string,
          searchPhrases: string | string[] | undefined,
          options?: { prefix?: boolean }
        ): HTML;
        splitFilterablePhrases(filterable: string): string[];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.locals.helpers.emailRegExp =
    /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  application.server.locals.helpers.isDate = (string) =>
    string.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null &&
    !isNaN(new Date(string).getTime());

  application.server.locals.helpers.isExpired = (expiresAt) =>
    expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

  application.server.locals.helpers.sanitizeSearch = (
    search,
    { prefix = false } = {}
  ) =>
    splitSearchPhrases(search)
      .map((phrase) => `"${phrase.replaceAll('"', '""')}"${prefix ? "*" : ""}`)
      .join(" ");

  application.server.locals.helpers.highlightSearchResult = (
    searchResult,
    searchPhrases,
    { prefix = false } = {}
  ) => {
    if (searchPhrases === undefined) return searchResult;
    if (typeof searchPhrases === "string")
      searchPhrases = splitSearchPhrases(searchPhrases);
    if (searchPhrases.length === 0) return searchResult;
    return searchResult.replace(
      new RegExp(
        `(?<!\\w)(?:${searchPhrases
          .map((searchPhrase) => escapeStringRegexp(searchPhrase))
          .join("|")})${prefix ? "" : "(?!\\w)"}`,
        "gi"
      ),
      (searchPhrase) => html`<mark class="mark">$${searchPhrase}</mark>`
    );
  };

  const splitSearchPhrases = (search: string): string[] =>
    search.split(/\s+/).filter((searchPhrase) => searchPhrase.trim() !== "");

  application.server.locals.helpers.splitFilterablePhrases = (filterable) =>
    filterable.split(/(?<=[^a-z0-9])(?=[a-z0-9])|(?<=[a-z0-9])(?=[^a-z0-9])/i);
};
