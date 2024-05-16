import escapeStringRegexp from "escape-string-regexp";
import html, { HTML } from "@leafac/html";
import { Application } from "./index.mjs";

export type ApplicationHelpers = {
  web: {
    locals: {
      helpers: {
        isPast: (expiresAt: string | null) => boolean;
        sanitizeSearch: (
          search: string,
          options?: { prefix?: boolean },
        ) => string;
        highlightSearchResult: (
          searchResult: string,
          searchPhrases: string | string[] | undefined,
          options?: { prefix?: boolean },
        ) => HTML;
        splitFilterablePhrases: (filterable: string) => string[];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.helpers.isPast = (expiresAt) =>
    expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

  application.web.locals.helpers.sanitizeSearch = (
    search,
    { prefix = false } = {},
  ) =>
    splitSearchPhrases(search)
      .map((phrase) => `"${phrase.replaceAll('"', '""')}"${prefix ? "*" : ""}`)
      .join(" ");

  application.web.locals.helpers.highlightSearchResult = (
    searchResult,
    searchPhrases,
    { prefix = false } = {},
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
        "gi",
      ),
      (searchPhrase) => html`<mark class="mark">$${searchPhrase}</mark>`,
    );
  };

  const splitSearchPhrases = (search: string): string[] =>
    search.split(/\s+/).filter((searchPhrase) => searchPhrase.trim() !== "");

  application.web.locals.helpers.splitFilterablePhrases = (filterable) =>
    filterable.split(/(?<=[^a-z0-9])(?=[a-z0-9])|(?<=[a-z0-9])(?=[^a-z0-9])/i);
};
