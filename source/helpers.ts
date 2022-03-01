const emailRegExp = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

const isDate = (string: string): boolean =>
  string.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) !== null &&
  !isNaN(new Date(string).getTime());

const isExpired = (expiresAt: string | null): boolean =>
  expiresAt !== null && new Date(expiresAt).getTime() <= Date.now();

const sanitizeSearch = (
  search: string,
  { prefix = false }: { prefix?: boolean } = {}
): string =>
  splitSearchPhrases(search)
    .map((phrase) => `"${phrase.replaceAll('"', '""')}"${prefix ? "*" : ""}`)
    .join(" ");

const highlightSearchResult = (
  searchResult: string,
  searchPhrases: string | string[] | undefined,
  { prefix = false }: { prefix?: boolean } = {}
): HTML => {
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

const splitFilterablePhrases = (filterable: string): string[] =>
  filterable.split(/(?<=[^a-z0-9])(?=[a-z0-9])|(?<=[a-z0-9])(?=[^a-z0-9])/i);
