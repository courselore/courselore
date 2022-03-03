
export type ConversationType = typeof conversationTypes[number];
export const conversationTypes = [
  "announcement",
  "question",
  "note",
  "chat",
] as const;

export const conversationTypeIcon = {
  announcement: {
    regular: html`<i class="bi bi-megaphone"></i>`,
    fill: html`<i class="bi bi-megaphone-fill"></i>`,
  },
  question: {
    regular: html`<i class="bi bi-patch-question"></i>`,
    fill: html`<i class="bi bi-patch-question-fill"></i>`,
  },
  note: {
    regular: html`<i class="bi bi-sticky"></i>`,
    fill: html`<i class="bi bi-sticky-fill"></i>`,
  },
  chat: {
    regular: html`<i class="bi bi-cup"></i>`,
    fill: html`<i class="bi bi-cup-fill"></i>`,
  },
};

export const conversationTypeTextColor = {
  announcement: {
    display: "text--fuchsia",
    select: "text--fuchsia",
  },
  question: {
    display: "text--rose",
    select: "text--rose",
  },
  note: {
    display: "",
    select: "text--blue",
  },
  chat: {
    display: "text--cyan",
    select: "text--cyan",
  },
};

export default () => {
  const conversationLayout = ({
    req,
    res,
    head,
    onlyConversationLayoutSidebarOnSmallScreen = false,
    mainIsAScrollingPane = false,
    body,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference?: string },
      HTML,
      {},
      {
        conversationLayoutSidebarOpenOnSmallScreen?: "true";
        search?: string;
        filters?: {
          types?: ConversationType[];
          isResolved?: "true" | "false";
          isPinned?: "true" | "false";
          isStaffOnly?: "true" | "false";
          tagsReferences?: string[];
        };
        scrollToConversation?: "false";
        conversationsPage?: string;
      },
      IsEnrolledInCourseMiddlewareLocals &
        Partial<IsConversationAccessibleMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      HTML,
      IsEnrolledInCourseMiddlewareLocals &
        Partial<IsConversationAccessibleMiddlewareLocals> &
        Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    onlyConversationLayoutSidebarOnSmallScreen?: boolean;
    mainIsAScrollingPane?: boolean;
    body: HTML;
  }): HTML => {
    const search =
      typeof req.query.search === "string" && req.query.search.trim() !== ""
        ? sanitizeSearch(req.query.search)
        : undefined;

    const filters: {
      types?: ConversationType[];
      isResolved?: "true" | "false";
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
      tagsReferences?: string[];
    } = {};
    if (typeof req.query.filters === "object") {
      if (Array.isArray(req.query.filters.types)) {
        const types = [
          ...new Set(
            req.query.filters.types.filter((type) =>
              conversationTypes.includes(type)
            )
          ),
        ];
        if (types.length > 0) filters.types = types;
      }
      if (
        filters.types?.includes("question") &&
        typeof req.query.filters.isResolved === "string" &&
        ["true", "false"].includes(req.query.filters.isResolved)
      )
        filters.isResolved = req.query.filters.isResolved;
      if (
        typeof req.query.filters.isPinned === "string" &&
        ["true", "false"].includes(req.query.filters.isPinned)
      )
        filters.isPinned = req.query.filters.isPinned;
      if (
        typeof req.query.filters.isStaffOnly === "string" &&
        ["true", "false"].includes(req.query.filters.isStaffOnly)
      )
        filters.isStaffOnly = req.query.filters.isStaffOnly;
      if (Array.isArray(req.query.filters.tagsReferences)) {
        const tagsReferences = [
          ...new Set(
            req.query.filters.tagsReferences.filter(
              (tagReference) =>
                res.locals.tags.find(
                  (tag) => tagReference === tag.reference
                ) !== undefined
            )
          ),
        ];
        if (tagsReferences.length > 0) filters.tagsReferences = tagsReferences;
      }
    }

    const conversationsPage =
      typeof req.query.conversationsPage === "string" &&
      req.query.conversationsPage.match(/^[1-9][0-9]*$/)
        ? Number(req.query.conversationsPage)
        : 1;

    const conversationsWithSearchResults = database
      .all<{
        reference: string;
        conversationTitleSearchResultHighlight?: string | null;
        messageAuthorUserNameSearchResultMessageReference?: string | null;
        messageAuthorUserNameSearchResultHighlight?: string | null;
        messageContentSearchResultMessageReference?: string | null;
        messageContentSearchResultSnippet?: string | null;
      }>(
        sql`
          SELECT "conversations"."reference"
                  $${
                    search === undefined
                      ? sql``
                      : sql`
                          ,
                          "conversationTitleSearchResult"."highlight" AS "conversationTitleSearchResultHighlight",
                          "messageAuthorUserNameSearchResult"."messageReference" AS "messageAuthorUserNameSearchResultMessageReference",
                          "messageAuthorUserNameSearchResult"."highlight" AS "messageAuthorUserNameSearchResultHighlight",
                          "messageContentSearchResult"."messageReference" AS "messageContentSearchResultMessageReference",
                          "messageContentSearchResult"."snippet" AS "messageContentSearchResultSnippet"
                        `
                  }
          FROM "conversations"
          $${
            search === undefined
              ? sql``
              : sql`
                LEFT JOIN (
                  SELECT "rowid",
                         "rank",
                         highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "conversationsTitleSearchIndex"
                  WHERE "conversationsTitleSearchIndex" MATCH ${search}
                ) AS "conversationTitleSearchResult" ON "conversations"."id" = "conversationTitleSearchResult"."rowid"

                LEFT JOIN (
                  SELECT "messages"."reference" AS  "messageReference",
                         "messages"."conversation" AS "conversationId",
                         "usersNameSearchIndex"."rank" AS "rank",
                         highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "highlight"
                  FROM "usersNameSearchIndex"
                  JOIN "users" ON "usersNameSearchIndex"."rowid" = "users"."id"
                  JOIN "enrollments" ON "users"."id" = "enrollments"."user"
                  JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment"
                                     $${
                                       res.locals.enrollment.role === "staff"
                                         ? sql``
                                         : sql`
                                             AND (
                                               "messages"."anonymousAt" IS NULL OR
                                               "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                                             )
                                           `
                                     }
                  WHERE "usersNameSearchIndex" MATCH ${search}
                ) AS "messageAuthorUserNameSearchResult" ON "conversations"."id" = "messageAuthorUserNameSearchResult"."conversationId"

                LEFT JOIN (
                  SELECT "messages"."reference" AS "messageReference",
                         "messages"."conversation" AS "conversationId",
                         "messagesContentSearchIndex"."rank" AS "rank",
                         snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "snippet"
                  FROM "messagesContentSearchIndex"
                  JOIN "messages" ON "messagesContentSearchIndex"."rowid" = "messages"."id"
                  WHERE "messagesContentSearchIndex" MATCH ${search}
                ) AS "messageContentSearchResult" ON "conversations"."id" = "messageContentSearchResult"."conversationId"
              `
          }
          $${
            filters.tagsReferences === undefined
              ? sql``
              : sql`
                  JOIN "taggings" ON "conversations"."id" = "taggings"."conversation"
                  JOIN "tags" ON "taggings"."tag" = "tags"."id" AND
                                 "tags"."reference" IN ${filters.tagsReferences}
                `
          }
          $${
            res.locals.enrollment.role !== "staff"
              ? sql`
                  LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation" AND
                                          "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                `
              : sql``
          }
          WHERE "conversations"."course" = ${res.locals.course.id}
          $${
            search === undefined
              ? sql``
              : sql`
                  AND (
                    "conversationTitleSearchResult"."rank" IS NOT NULL OR
                    "messageAuthorUserNameSearchResult"."rank" IS NOT NULL OR
                    "messageContentSearchResult"."rank" IS NOT NULL
                  )
                `
          }
          $${
            filters.types === undefined
              ? sql``
              : sql`
                  AND "conversations"."type" IN ${filters.types}
                `
          }
          $${
            filters.isResolved === undefined
              ? sql``
              : sql`
                  AND "conversations"."resolvedAt" IS $${
                    filters.isResolved === "true" ? sql`NOT` : sql``
                  } NULL
                `
          }
          $${
            filters.isPinned === undefined
              ? sql``
              : sql`
                  AND "conversations"."pinnedAt" IS $${
                    filters.isPinned === "true" ? sql`NOT` : sql``
                  } NULL
                `
          }
          $${
            filters.isStaffOnly === undefined
              ? sql``
              : sql`
                  AND "conversations"."staffOnlyAt" IS $${
                    filters.isStaffOnly === "true" ? sql`NOT` : sql``
                  } NULL
                `
          }
          $${
            res.locals.enrollment.role !== "staff"
              ? sql`
                  AND (
                    "conversations"."staffOnlyAt" IS NULL OR
                    "messages"."id" IS NOT NULL
                  )
                `
              : sql``
          }
          GROUP BY "conversations"."id"
          ORDER BY "conversations"."pinnedAt" IS NOT NULL DESC,
                    $${
                      search === undefined
                        ? sql``
                        : sql`
                            min(
                              coalesce("conversationTitleSearchResult"."rank", 0),
                              coalesce("messageAuthorUserNameSearchResult"."rank", 0),
                              coalesce("messageContentSearchResult"."rank", 0)
                            ) ASC,
                          `
                    }
                    coalesce("conversations"."updatedAt", "conversations"."createdAt") DESC
          $${
            FEATURE_PAGINATION
              ? sql`
                  LIMIT 16 OFFSET ${(conversationsPage - 1) * 15}
                `
              : sql``
          }
        `
      )
      .map((conversationWithSearchResult) => {
        const conversation = getConversation({
          req,
          res,
          conversationReference: conversationWithSearchResult.reference,
        });
        assert(conversation !== undefined);

        const searchResult =
          typeof conversationWithSearchResult.conversationTitleSearchResultHighlight ===
          "string"
            ? ({
                type: "conversationTitle",
                highlight:
                  conversationWithSearchResult.conversationTitleSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight ===
                "string"
            ? ({
                type: "messageAuthorUserName",
                message: getMessage({
                  req,
                  res,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageAuthorUserNameSearchResultMessageReference,
                })!,
                highlight:
                  conversationWithSearchResult.messageAuthorUserNameSearchResultHighlight,
              } as const)
            : typeof conversationWithSearchResult.messageContentSearchResultMessageReference ===
                "string" &&
              typeof conversationWithSearchResult.messageContentSearchResultSnippet ===
                "string"
            ? ({
                type: "messageContent",
                message: getMessage({
                  req,
                  res,
                  conversation,
                  messageReference:
                    conversationWithSearchResult.messageContentSearchResultMessageReference,
                })!,
                snippet:
                  conversationWithSearchResult.messageContentSearchResultSnippet,
              } as const)
            : undefined;

        return { conversation, searchResult };
      });
    const moreConversationsExist =
      FEATURE_PAGINATION && conversationsWithSearchResults.length === 16;
    if (FEATURE_PAGINATION && moreConversationsExist)
      conversationsWithSearchResults.pop();

    return applicationLayout({
      req,
      res,
      head,
      extraHeaders: html`
        $${onlyConversationLayoutSidebarOnSmallScreen
          ? html``
          : html`
              <div
                class="${res.locals.localCSS(css`
                  justify-content: center;
                  @media (min-width: 900px) {
                    display: none;
                  }
                `)}"
              >
                <button
                  class="button button--transparent"
                  oninteractive="${javascript`
                    this.addEventListener("click", () => {
                      document.querySelector(".conversation--layout--sidebar").classList.toggle("hidden-on-small-screen");
                      document.querySelector(".conversation--layout--main").classList.toggle("hidden-on-small-screen");
                      this.lastElementChild.classList.toggle("bi-chevron-bar-expand");
                      this.lastElementChild.classList.toggle("bi-chevron-bar-contract");
                    });
                  `}"
                >
                  <i class="bi bi-chat-left-text"></i>
                  Conversations
                  <i class="bi bi-chevron-bar-expand"></i>
                </button>
              </div>
            `}
      `,
      body: html`
        <div
          class="${res.locals.localCSS(css`
            width: 100%;
            height: 100%;
            display: flex;
            @media (max-width: 899px) {
              & > .hidden-on-small-screen {
                display: none;
              }
            }
          `)}"
        >
          <div
            class="conversation--layout--sidebar ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? ""
              : "hidden-on-small-screen"} ${res.locals.localCSS(css`
              background-color: var(--color--gray--medium--100);
              @media (prefers-color-scheme: dark) {
                background-color: var(--color--gray--medium--800);
              }
              overflow: auto;
              @media (max-width: 899px) {
                flex: 1;
              }
              @media (min-width: 900px) {
                width: var(--width--sm);
                border-right: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
              }
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                margin: var(--space--4);
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
              `)}"
            >
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                  @media (max-width: 899px) {
                    flex: 1;
                    min-width: var(--width--0);
                    max-width: var(--width--prose);
                  }
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                  `)}"
                >
                  <a
                    href="${app.locals.options.baseURL}/courses/${res.locals.course
                      .reference}/conversations/new${qs.stringify(
                      lodash.omit(req.query, [
                        "conversationLayoutSidebarOpenOnSmallScreen",
                        "messageReference",
                        "beforeMessageReference",
                        "afterMessageReference",
                      ]),
                      { addQueryPrefix: true }
                    )}"
                    class="button button--transparent"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start a New Conversation
                  </a>
                </div>

                <hr class="separator" />

                <form
                  novalidate
                  class="${res.locals.localCSS(css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--1);
                  `)}"
                  oninteractive="${javascript`
                    this.isModified = false;
                  `}"
                >
                  <input
                    type="hidden"
                    name="conversationLayoutSidebarOpenOnSmallScreen"
                    value="true"
                  />
                  <input
                    type="hidden"
                    name="scrollToConversation"
                    value="false"
                  />
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      gap: var(--space--2);
                      align-items: center;
                    `)}"
                  >
                    <input
                      type="text"
                      name="search"
                      value="${req.query.search ?? ""}"
                      placeholder="Search…"
                      class="input--text"
                    />
                    <button
                      class="button button--tight button--tight--inline button--transparent"
                      oninteractive="${javascript`
                        tippy(this, {
                          touch: false,
                          content: "Search",
                        });
                      `}"
                    >
                      <i class="bi bi-search"></i>
                    </button>
                    $${req.query.search !== undefined ||
                    req.query.filters !== undefined
                      ? html`
                          <a
                            href="${qs.stringify(
                              {
                                conversationLayoutSidebarOpenOnSmallScreen:
                                  "true",
                                scrollToConversation: "false",
                              },
                              { addQueryPrefix: true }
                            )}"
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: "Clear Search & Filters",
                              });
                            `}"
                          >
                            <i class="bi bi-x-lg"></i>
                          </a>
                        `
                      : html``}
                  </div>

                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                    `)}"
                  >
                    <label
                      class="button button--tight button--tight--inline button--transparent"
                    >
                      <input
                        type="checkbox"
                        class="visually-hidden input--radio-or-checkbox--multilabel"
                        $${req.query.filters === undefined
                          ? html``
                          : html`checked`}
                        oninteractive="${javascript`
                          this.addEventListener("change", () => {
                            const filters = this.closest("form").querySelector(".filters");
                            filters.hidden = !this.checked;
                            for (const element of filters.querySelectorAll("*"))
                              if (element.disabled !== null) element.disabled = !this.checked;
                          });
                        `}"
                      />
                      <span>
                        <i class="bi bi-funnel"></i>
                        Filters
                      </span>
                      <span class="text--blue">
                        <i class="bi bi-funnel-fill"></i>
                        Filters
                      </span>
                    </label>
                  </div>

                  <div
                    $${req.query.filters === undefined ? html`hidden` : html``}
                    class="filters ${res.locals.localCSS(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `)}"
                  >
                    <div class="label">
                      <p class="label--text">Type</p>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        $${conversationTypes.map(
                          (conversationType) => html`
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="filters[types][]"
                                value="${conversationType}"
                                $${req.query.filters?.types?.includes(
                                  conversationType
                                )
                                  ? html`checked`
                                  : html``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                                oninteractive="${javascript`
                                  ${
                                    conversationType === "question"
                                      ? javascript`
                                          this.addEventListener("change", () => {
                                            this.closest(".filters").querySelector(".filters--resolved").hidden = !this.checked;
                                          });                                      
                                        `
                                      : javascript``
                                  }
                                `}"
                              />
                              <span>
                                $${conversationTypeIcon[conversationType]
                                  .regular}
                                $${lodash.capitalize(conversationType)}
                              </span>
                              <span
                                class="${conversationTypeTextColor[
                                  conversationType
                                ].select}"
                              >
                                $${conversationTypeIcon[conversationType].fill}
                                $${lodash.capitalize(conversationType)}
                              </span>
                            </label>
                          `
                        )}
                      </div>
                    </div>

                    <div
                      class="filters--resolved label"
                      $${req.query.filters?.types?.includes("question")
                        ? html``
                        : html`hidden`}
                    >
                      <p class="label--text">Resolved</p>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isResolved]"
                            value="false"
                            $${req.query.filters?.isResolved === "false"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked)
                                  for (const element of this.closest(".filters--resolved").querySelectorAll("input"))
                                    if (element !== this)
                                      element.checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-patch-exclamation"></i>
                            Unresolved
                          </span>
                          <span class="text--rose">
                            <i class="bi bi-patch-exclamation-fill"></i>
                            Unresolved
                          </span>
                        </label>
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isResolved]"
                            value="true"
                            $${req.query.filters?.isResolved === "true"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked)
                                  for (const element of this.closest(".filters--resolved").querySelectorAll("input"))
                                    if (element !== this)
                                      element.checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-patch-check"></i>
                            Resolved
                          </span>
                          <span class="text--emerald">
                            <i class="bi bi-patch-check-fill"></i>
                            Resolved
                          </span>
                        </label>
                      </div>
                    </div>

                    <div class="label">
                      <div class="label--text">
                        Pin
                        <button
                          type="button"
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
                            tippy(this, {
                              trigger: "click",
                              content: "Pinned conversations are listed first.",
                            });
                          `}"
                        >
                          <i class="bi bi-info-circle"></i>
                        </button>
                      </div>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isPinned]"
                            value="true"
                            $${req.query.filters?.isPinned === "true"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked) this.closest("form").querySelector('[name="filters[isPinned]"][value="false"]').checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-pin"></i>
                            Pinned
                          </span>
                          <span class="text--amber">
                            <i class="bi bi-pin-fill"></i>
                            Pinned
                          </span>
                        </label>
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isPinned]"
                            value="false"
                            $${req.query.filters?.isPinned === "false"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked) this.closest("form").querySelector('[name="filters[isPinned]"][value="true"]').checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-pin-angle"></i>
                            Unpinned
                          </span>
                          <span class="text--amber">
                            <i class="bi bi-pin-angle-fill"></i>
                            Unpinned
                          </span>
                        </label>
                      </div>
                    </div>

                    <div class="label">
                      <p class="label--text">Visibility</p>
                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--6);
                          row-gap: var(--space--2);
                        `)}"
                      >
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isStaffOnly]"
                            value="false"
                            $${req.query.filters?.isStaffOnly === "false"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked) this.closest("form").querySelector('[name="filters[isStaffOnly]"][value="true"]').checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-eye"></i>
                            Visible by Everyone
                          </span>
                          <span class="text--sky">
                            <i class="bi bi-eye-fill"></i>
                            Visible by Everyone
                          </span>
                        </label>
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="checkbox"
                            name="filters[isStaffOnly]"
                            value="true"
                            $${req.query.filters?.isStaffOnly === "true"
                              ? html`checked`
                              : html``}
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                if (this.checked) this.closest("form").querySelector('[name="filters[isStaffOnly]"][value="false"]').checked = false;
                              });
                            `}"
                          />
                          <span>
                            <i class="bi bi-mortarboard"></i>
                            Visible by Staff Only
                          </span>
                          <span class="text--sky">
                            <i class="bi bi-mortarboard-fill"></i>
                            Visible by Staff Only
                          </span>
                        </label>
                      </div>
                    </div>

                    $${res.locals.tags.length === 0
                      ? html``
                      : html`
                          <div class="label">
                            <div class="label--text">
                              Tags
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    trigger: "click",
                                    content: "Tags help to organize conversations.",
                                  });
                                `}"
                              >
                                <i class="bi bi-info-circle"></i>
                              </button>
                            </div>
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                flex-wrap: wrap;
                                column-gap: var(--space--6);
                                row-gap: var(--space--2);
                              `)}"
                            >
                              $${res.locals.tags.map(
                                (tag) => html`
                                  <div
                                    class="${res.locals.localCSS(css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <label
                                      class="button button--tight button--tight--inline button--transparent"
                                    >
                                      <input
                                        type="checkbox"
                                        name="filters[tagsReferences][]"
                                        value="${tag.reference}"
                                        $${req.query.filters?.tagsReferences?.includes(
                                          tag.reference
                                        )
                                          ? html`checked`
                                          : html``}
                                        class="visually-hidden input--radio-or-checkbox--multilabel"
                                      />
                                      <span>
                                        <i class="bi bi-tag"></i>
                                        ${tag.name}
                                      </span>
                                      <span class="text--teal">
                                        <i class="bi bi-tag-fill"></i>
                                        ${tag.name}
                                      </span>
                                    </label>
                                    $${tag.staffOnlyAt !== null
                                      ? html`
                                          <span
                                            class="text--sky"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                touch: false,
                                                content: "This tag is visible by staff only.",
                                              });
                                            `}"
                                          >
                                            <i
                                              class="bi bi-mortarboard-fill"
                                            ></i>
                                          </span>
                                        `
                                      : html``}
                                  </div>
                                `
                              )}
                            </div>
                          </div>
                        `}
                    <div
                      class="${res.locals.localCSS(css`
                        margin-top: var(--space--2);
                        display: flex;
                        gap: var(--space--2);
                        & > * {
                          flex: 1;
                        }
                      `)}"
                    >
                      <button
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <i class="bi bi-funnel"></i>
                        Apply Filters
                      </button>
                      $${req.query.search !== undefined ||
                      req.query.filters !== undefined
                        ? html`
                            <a
                              href="${qs.stringify(
                                {
                                  conversationLayoutSidebarOpenOnSmallScreen:
                                    "true",
                                  scrollToConversation: "false",
                                },
                                { addQueryPrefix: true }
                              )}"
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <i class="bi bi-x-lg"></i>
                              Clear Search & Filters
                            </a>
                          `
                        : html``}
                    </div>
                  </div>
                </form>

                $${conversationsWithSearchResults.length === 0
                  ? html`
                      <hr class="separator" />

                      <div
                        class="${res.locals.localCSS(css`
                          display: flex;
                          flex-direction: column;
                          align-items: center;
                        `)}"
                      >
                        <div class="decorative-icon">
                          <i class="bi bi-chat-left-text"></i>
                        </div>
                        <p class="secondary">No conversation found.</p>
                      </div>
                    `
                  : html`
                      $${req.query.search === undefined &&
                      req.query.filters === undefined &&
                      conversationsWithSearchResults.some(
                        ({ conversation }) =>
                          conversation.readingsCount <
                          conversation.messagesCount
                      )
                        ? html`
                            <hr class="separator" />

                            <form
                              method="POST"
                              action="${app.locals.options.baseURL}/courses/${res.locals.course
                                .reference}/conversations/mark-all-conversations-as-read"
                              class="${res.locals.localCSS(css`
                                display: flex;
                                justify-content: flex-end;
                              `)}"
                            >
                              <input
                                type="hidden"
                                name="_csrf"
                                value="${req.csrfToken()}"
                              />
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                  .locals.localCSS(css`
                                  font-size: var(--font-size--xs);
                                  line-height: var(--line-height--xs);
                                `)}"
                              >
                                <i class="bi bi-check-all"></i>
                                Mark All Conversations as Read
                              </button>
                            </form>
                          `
                        : html``}
                      $${FEATURE_PAGINATION && conversationsPage > 1
                        ? html`
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                justify-content: center;
                              `)}"
                            >
                              <a
                                href="${qs.stringify(
                                  {
                                    ...req.query,
                                    conversationLayoutSidebarOpenOnSmallScreen:
                                      "true",
                                    conversationsPage: conversationsPage - 1,
                                  },
                                  {
                                    addQueryPrefix: true,
                                  }
                                )}"
                                class="button button--transparent"
                              >
                                <i class="bi bi-arrow-up"></i>
                                Load Previous Conversations
                              </a>
                            </div>
                          `
                        : html``}

                      <div>
                        $${conversationsWithSearchResults.map(
                          ({ conversation, searchResult }) => {
                            const isSelected =
                              conversation.id === res.locals.conversation?.id;
                            return html`
                              <div id="conversation--${conversation.reference}">
                                <hr
                                  class="separator ${res.locals.localCSS(css`
                                    margin: var(--space---px) var(--space--0);
                                  `)}"
                                />
                                <a
                                  href="${app.locals.options.baseURL}/courses/${res.locals.course
                                    .reference}/conversations/${conversation.reference}${qs.stringify(
                                    lodash.omit(
                                      {
                                        ...req.query,
                                        messageReference:
                                          searchResult?.message?.reference,
                                      },
                                      [
                                        "conversationLayoutSidebarOpenOnSmallScreen",
                                        "scrollToConversation",
                                        "beforeMessageReference",
                                        "afterMessageReference",
                                      ]
                                    ),
                                    { addQueryPrefix: true }
                                  )}"
                                  class="button ${isSelected
                                    ? "button--blue"
                                    : "button--transparent"} ${res.locals
                                    .localCSS(css`
                                    width: calc(
                                      var(--space--2) + 100% + var(--space--2)
                                    );
                                    padding: var(--space--3) var(--space--2);
                                    margin-left: var(--space---2);
                                    position: relative;
                                    align-items: center;
                                    ${isSelected
                                      ? css`
                                          & + * {
                                            margin-bottom: var(--space--0);
                                          }
                                        `
                                      : css``}
                                  `)}"
                                  oninteractive="${javascript`
                                    ${
                                      isSelected &&
                                      req.query.scrollToConversation !== "false"
                                        ? javascript`
                                            window.setTimeout(() => { this.scrollIntoView({ block: "center" }); }, 0);
                                          `
                                        : javascript``
                                    }
                                  `}"
                                >
                                  <div
                                    class="${res.locals.localCSS(css`
                                      flex: 1;
                                    `)}"
                                  >
                                    $${conversationPartial({
                                      req,
                                      res,
                                      conversation,
                                      searchResult,
                                    })}
                                  </div>
                                  <div
                                    class="${res.locals.localCSS(css`
                                      width: var(--space--4);
                                      display: flex;
                                      justify-content: flex-end;
                                    `)}"
                                  >
                                    $${(() => {
                                      const unreadCount =
                                        conversation.messagesCount -
                                        conversation.readingsCount;
                                      return unreadCount === 0 ||
                                        conversation.id ===
                                          res.locals.conversation?.id
                                        ? html``
                                        : html`
                                            <button
                                              class="button button--tight button--blue ${res
                                                .locals.localCSS(css`
                                                font-size: var(
                                                  --font-size--2xs
                                                );
                                                line-height: var(
                                                  --line-height--2xs
                                                );
                                              `)}"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  touch: false,
                                                  content: "Mark as Read",
                                                });
                                                this.addEventListener("click", async (event) => {
                                                  event.preventDefault();
                                                  await fetch(this.closest("a").getAttribute("href"));
                                                  this.remove();
                                                });
                                              `}"
                                            >
                                              ${unreadCount.toString()}
                                            </button>
                                          `;
                                    })()}
                                  </div>
                                </a>
                              </div>
                            `;
                          }
                        )}
                      </div>
                      $${FEATURE_PAGINATION && moreConversationsExist
                        ? html`
                            <div
                              class="${res.locals.localCSS(css`
                                display: flex;
                                justify-content: center;
                              `)}"
                            >
                              <a
                                href="${qs.stringify(
                                  {
                                    ...req.query,
                                    conversationLayoutSidebarOpenOnSmallScreen:
                                      "true",
                                    conversationsPage: conversationsPage + 1,
                                  },
                                  {
                                    addQueryPrefix: true,
                                  }
                                )}"
                                class="button button--transparent"
                              >
                                <i class="bi bi-arrow-down"></i>
                                Load Next Conversations
                              </a>
                            </div>
                          `
                        : html``}
                    `}
              </div>
            </div>
          </div>

          <div
            class="conversation--layout--main ${onlyConversationLayoutSidebarOnSmallScreen ||
            req.query.conversationLayoutSidebarOpenOnSmallScreen === "true"
              ? "hidden-on-small-screen"
              : ""} ${res.locals.localCSS(css`
              overflow: auto;
              flex: 1;
            `)}"
          >
            <div
              class="${res.locals.localCSS(css`
                @media (max-width: 899px) {
                  display: flex;
                  justify-content: center;
                }
                ${mainIsAScrollingPane
                  ? css`
                      height: 100%;
                      display: flex;
                    `
                  : css`
                      margin: var(--space--4);
                      @media (min-width: 900px) {
                        margin-left: var(--space--8);
                      }
                    `}
              `)}"
            >
              $${mainIsAScrollingPane
                ? body
                : html`
                    <div
                      class="${res.locals.localCSS(css`
                        min-width: var(--width--0);
                        max-width: var(--width--prose);
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--4);
                        @media (max-width: 899px) {
                          flex: 1;
                        }
                      `)}"
                    >
                      $${body}
                    </div>
                  `}
            </div>
          </div>
        </div>
      `,
    });
  };

  const conversationPartial = ({
    req,
    res,
    conversation,
    searchResult = undefined,
    message = undefined,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    searchResult?:
      | {
          type: "conversationTitle";
          highlight: HTML;
        }
      | {
          type: "messageAuthorUserName";
          message: NonNullable<ReturnType<typeof getMessage>>;
          highlight: HTML;
        }
      | {
          type: "messageContent";
          message: NonNullable<ReturnType<typeof getMessage>>;
          snippet: HTML;
        };
    message?: NonNullable<ReturnType<typeof getMessage>>;
  }): HTML => html`
    <div
      class="${res.locals.localCSS(css`
        display: flex;
        flex-direction: column;
        gap: var(--space--1);
      `)}"
    >
      <div
        class="${res.locals.localCSS(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--4);
          row-gap: var(--space--0-5);

          & > * {
            display: flex;
            gap: var(--space--1);
          }
        `)}"
      >
        <div
          class="${conversation.type === "question" &&
          conversation.resolvedAt !== null
            ? "text--emerald"
            : conversationTypeTextColor[conversation.type].display}"
        >
          $${conversationTypeIcon[conversation.type].fill}
          ${lodash.capitalize(conversation.type)}
        </div>
        $${conversation.type === "question"
          ? html`
              $${conversation.resolvedAt === null
                ? html`
                    <div class="text--rose">
                      <i class="bi bi-patch-exclamation-fill"></i>
                      Unresolved
                    </div>
                  `
                : html`
                    <div class="text--emerald">
                      <i class="bi bi-patch-check-fill"></i>
                      Resolved
                    </div>
                  `}
            `
          : html``}
        $${conversation.pinnedAt !== null
          ? html`
              <div
                class="text--amber"
                oninteractive="${javascript`
                  tippy(this, {
                    touch: false,
                    content: "Pinned conversations are listed first.",
                  });
                `}"
              >
                <i class="bi bi-pin-fill"></i>
                Pinned
              </div>
            `
          : html``}
        $${conversation.staffOnlyAt !== null
          ? html`
              <div class="text--sky">
                <i class="bi bi-mortarboard-fill"></i>
                Visible by Staff Only
              </div>
            `
          : html``}
      </div>

      <h3 class="strong">
        $${searchResult?.type === "conversationTitle"
          ? searchResult.highlight
          : html`${conversation.title}`}
      </h3>

      <div
        class="secondary ${res.locals.localCSS(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
        `)}"
      >
        $${userPartial({
          req,
          res,
          enrollment: conversation.authorEnrollment,
          anonymous:
            conversation.anonymousAt === null
              ? false
              : res.locals.enrollment.role === "staff" ||
                (conversation.authorEnrollment !== "no-longer-enrolled" &&
                  conversation.authorEnrollment.id === res.locals.enrollment.id)
              ? "reveal"
              : true,
          size: "xs",
        })}
      </div>

      <div
        class="secondary ${res.locals.localCSS(css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          flex-wrap: wrap;
          column-gap: var(--space--3);
          row-gap: var(--space--0-5);
        `)}"
      >
        <div
          oninteractive="${javascript`
          tippy(this, {
            touch: false,
            content: "Conversation Reference",
          });
        `}"
        >
          #${conversation.reference}
        </div>

        <time
          datetime="${new Date(conversation.createdAt).toISOString()}"
          oninteractive="${javascript`
            leafac.relativizeDateTimeElement(this, { capitalize: true });
          `}"
          onbeforeelchildrenupdated="${javascript`
            return false;
          `}"
        ></time>

        $${conversation.updatedAt !== null
          ? html`
              <div>
                Updated
                <time
                  datetime="${new Date(conversation.updatedAt).toISOString()}"
                  oninteractive="${javascript`
                    leafac.relativizeDateTimeElement(this, { preposition: "on" });
                  `}"
                  onbeforeelchildrenupdated="${javascript`
                    return false;
                  `}"
                ></time>
              </div>
            `
          : html``}
      </div>

      $${conversation.taggings.length === 0
        ? html``
        : html`
            <div
              class="${res.locals.localCSS(css`
                font-size: var(--font-size--xs);
                line-height: var(--line-height--xs);
                display: flex;
                flex-wrap: wrap;
                column-gap: var(--space--4);
                row-gap: var(--space--0-5);

                & > * {
                  display: flex;
                  gap: var(--space--1);
                }
              `)}"
            >
              $${conversation.taggings.map(
                (tagging) => html`
                  <div class="text--teal">
                    <i class="bi bi-tag-fill"></i>
                    ${tagging.tag.name}
                    $${tagging.tag.staffOnlyAt !== null
                      ? html`
                          <span
                            class="text--sky"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: "This tag is visible by staff only.",
                              });
                            `}"
                          >
                            <i class="bi bi-mortarboard-fill"></i>
                          </span>
                        `
                      : html``}
                  </div>
                `
              )}
            </div>
          `}
      $${searchResult?.type === "messageAuthorUserName"
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: searchResult.message.authorEnrollment,
                  name: searchResult.highlight,
                })}
              </div>
              <div>
                $${lodash.truncate(searchResult.message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : searchResult?.type === "messageContent"
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: searchResult.message.authorEnrollment,
                  anonymous:
                    searchResult.message.anonymousAt === null
                      ? false
                      : res.locals.enrollment.role === "staff" ||
                        (searchResult.message.authorEnrollment !==
                          "no-longer-enrolled" &&
                          searchResult.message.authorEnrollment.id ===
                            res.locals.enrollment.id)
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>$${searchResult.snippet}</div>
            </div>
          `
        : message !== undefined
        ? html`
            <div>
              <div>
                $${userPartial({
                  req,
                  res,
                  enrollment: message.authorEnrollment,
                  anonymous:
                    message.anonymousAt === null
                      ? false
                      : res.locals.enrollment.role === "staff" ||
                        (message.authorEnrollment !== "no-longer-enrolled" &&
                          message.authorEnrollment.id ===
                            res.locals.enrollment.id)
                      ? "reveal"
                      : true,
                })}
              </div>
              <div>
                $${lodash.truncate(message.contentSearch, {
                  length: 100,
                  separator: /\W/,
                })}
              </div>
            </div>
          `
        : html``}
    </div>
  `;

  type AuthorEnrollmentUser = {
    id: number;
    lastSeenOnlineAt: string;
    email: string;
    name: string;
    avatar: string | null;
    avatarlessBackgroundColor: UserAvatarlessBackgroundColor;
    biographySource: string | null;
    biographyPreprocessed: HTML | null;
  };
  type AuthorEnrollment =
    | {
        id: number;
        user: AuthorEnrollmentUser;
        reference: string;
        role: EnrollmentRole;
      }
    | "no-longer-enrolled";

  const getConversation = ({
    req,
    res,
    conversationReference,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversationReference: string;
  }):
    | {
        id: number;
        createdAt: string;
        updatedAt: string | null;
        reference: string;
        authorEnrollment: AuthorEnrollment;
        anonymousAt: string | null;
        type: ConversationType;
        resolvedAt: string | null;
        pinnedAt: string | null;
        staffOnlyAt: string | null;
        title: string;
        titleSearch: string;
        nextMessageReference: number;
        taggings: {
          id: number;
          tag: {
            id: number;
            reference: string;
            name: string;
            staffOnlyAt: string | null;
          };
        }[];
        messagesCount: number;
        readingsCount: number;
        endorsements: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
      }
    | undefined => {
    const conversationRow = database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: string | null;
      authorEnrollmentRole: EnrollmentRole | null;
      anonymousAt: string | null;
      type: ConversationType;
      resolvedAt: string | null;
      pinnedAt: string | null;
      staffOnlyAt: string | null;
      title: string;
      titleSearch: string;
      nextMessageReference: number;
    }>(
      sql`
        SELECT "conversations"."id",
               "conversations"."createdAt",
               "conversations"."updatedAt",
               "conversations"."reference",
               "authorEnrollment"."id" AS "authorEnrollmentId",
               "authorUser"."id" AS "authorUserId",
               "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
               "authorUser"."email" AS "authorUserEmail",
               "authorUser"."name" AS "authorUserName",
               "authorUser"."avatar" AS "authorUserAvatar",
               "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColor",
               "authorUser"."biographySource" AS "authorUserBiographySource",
               "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
               "authorEnrollment"."reference" AS "authorEnrollmentReference",
               "authorEnrollment"."role" AS "authorEnrollmentRole",
               "conversations"."anonymousAt",
               "conversations"."type",
               "conversations"."resolvedAt",
               "conversations"."pinnedAt",
               "conversations"."staffOnlyAt",
               "conversations"."title",
               "conversations"."titleSearch",
               "conversations"."nextMessageReference"
        FROM "conversations"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "conversations"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        $${
          res.locals.enrollment.role !== "staff"
            ? sql`
                LEFT JOIN "messages" ON "conversations"."id" = "messages"."conversation" AND
                                        "messages"."authorEnrollment" = ${res.locals.enrollment.id}
              `
            : sql``
        }
        WHERE "conversations"."course" = ${res.locals.course.id} AND
              "conversations"."reference" = ${conversationReference}
              $${
                res.locals.enrollment.role !== "staff"
                  ? sql`
                      AND (
                        "conversations"."staffOnlyAt" IS NULL OR
                        "messages"."id" IS NOT NULL
                      )
                    `
                  : sql``
              }
        GROUP BY "conversations"."id"
      `
    );
    if (conversationRow === undefined) return undefined;
    const conversation = {
      id: conversationRow.id,
      createdAt: conversationRow.createdAt,
      updatedAt: conversationRow.updatedAt,
      reference: conversationRow.reference,
      authorEnrollment:
        conversationRow.authorEnrollmentId !== null &&
        conversationRow.authorUserId !== null &&
        conversationRow.authorUserLastSeenOnlineAt !== null &&
        conversationRow.authorUserEmail !== null &&
        conversationRow.authorUserName !== null &&
        conversationRow.authorUserAvatarlessBackgroundColor !== null &&
        conversationRow.authorEnrollmentReference !== null &&
        conversationRow.authorEnrollmentRole !== null
          ? {
              id: conversationRow.authorEnrollmentId,
              user: {
                id: conversationRow.authorUserId,
                lastSeenOnlineAt: conversationRow.authorUserLastSeenOnlineAt,
                email: conversationRow.authorUserEmail,
                name: conversationRow.authorUserName,
                avatar: conversationRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  conversationRow.authorUserAvatarlessBackgroundColor,
                biographySource: conversationRow.authorUserBiographySource,
                biographyPreprocessed:
                  conversationRow.authorUserBiographyPreprocessed,
              },
              reference: conversationRow.authorEnrollmentReference,
              role: conversationRow.authorEnrollmentRole,
            }
          : ("no-longer-enrolled" as const),
      anonymousAt: conversationRow.anonymousAt,
      type: conversationRow.type,
      resolvedAt: conversationRow.resolvedAt,
      pinnedAt: conversationRow.pinnedAt,
      staffOnlyAt: conversationRow.staffOnlyAt,
      title: conversationRow.title,
      titleSearch: conversationRow.titleSearch,
      nextMessageReference: conversationRow.nextMessageReference,
    };

    const taggings = database
      .all<{
        id: number;
        tagId: number;
        tagReference: string;
        tagName: string;
        tagStaffOnlyAt: string | null;
      }>(
        sql`
          SELECT "taggings"."id",
                 "tags"."id" AS "tagId",
                 "tags"."reference" AS "tagReference",
                 "tags"."name" AS "tagName",
                 "tags"."staffOnlyAt" AS "tagStaffOnlyAt"
          FROM "taggings"
          JOIN "tags" ON "taggings"."tag" = "tags"."id"
          $${
            res.locals.enrollment.role === "student"
              ? sql`AND "tags"."staffOnlyAt" IS NULL`
              : sql``
          }
          WHERE "taggings"."conversation" = ${conversation.id}
          ORDER BY "tags"."id" ASC
        `
      )
      .map((tagging) => ({
        id: tagging.id,
        tag: {
          id: tagging.tagId,
          reference: tagging.tagReference,
          name: tagging.tagName,
          staffOnlyAt: tagging.tagStaffOnlyAt,
        },
      }));

    const messagesCount = database.get<{
      messagesCount: number;
    }>(
      sql`SELECT COUNT(*) AS "messagesCount" FROM "messages" WHERE "messages"."conversation" = ${conversation.id}`
    )!.messagesCount;

    const readingsCount = database.get<{ readingsCount: number }>(
      sql`
        SELECT COUNT(*) AS "readingsCount"
        FROM "readings"
        JOIN "messages" ON "readings"."message" = "messages"."id" AND
                           "messages"."conversation" = ${conversation.id}
        WHERE "readings"."enrollment" = ${res.locals.enrollment.id}
      `
    )!.readingsCount;

    const endorsements =
      conversation.type === "question"
        ? database
            .all<{
              id: number;
              enrollmentId: number | null;
              userId: number | null;
              userLastSeenOnlineAt: string | null;
              userEmail: string | null;
              userName: string | null;
              userAvatar: string | null;
              userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
              userBiographySource: string | null;
              userBiographyPreprocessed: HTML | null;
              enrollmentReference: string | null;
              enrollmentRole: EnrollmentRole | null;
            }>(
              sql`
                SELECT "endorsements"."id",
                       "enrollments"."id" AS "enrollmentId",
                       "users"."id" AS "userId",
                       "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                       "users"."email" AS "userEmail",
                       "users"."name" AS "userName",
                       "users"."avatar" AS "userAvatar",
                       "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                       "users"."biographySource" AS "userBiographySource",
                       "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                       "enrollments"."reference" AS "enrollmentReference",
                       "enrollments"."role" AS "enrollmentRole"
                FROM "endorsements"
                JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
                JOIN "users" ON "enrollments"."user" = "users"."id"
                JOIN "messages" ON "endorsements"."message" = "messages"."id" AND
                                  "messages"."conversation" = ${conversation.id}
                ORDER BY "endorsements"."id" ASC
              `
            )
            .map((endorsement) => ({
              id: endorsement.id,
              enrollment:
                endorsement.enrollmentId !== null &&
                endorsement.userId !== null &&
                endorsement.userLastSeenOnlineAt !== null &&
                endorsement.userEmail !== null &&
                endorsement.userName !== null &&
                endorsement.userAvatarlessBackgroundColor !== null &&
                endorsement.enrollmentReference !== null &&
                endorsement.enrollmentRole !== null
                  ? {
                      id: endorsement.enrollmentId,
                      user: {
                        id: endorsement.userId,
                        lastSeenOnlineAt: endorsement.userLastSeenOnlineAt,
                        email: endorsement.userEmail,
                        name: endorsement.userName,
                        avatar: endorsement.userAvatar,
                        avatarlessBackgroundColor:
                          endorsement.userAvatarlessBackgroundColor,
                        biographySource: endorsement.userBiographySource,
                        biographyPreprocessed:
                          endorsement.userBiographyPreprocessed,
                      },
                      reference: endorsement.enrollmentReference,
                      role: endorsement.enrollmentRole,
                    }
                  : ("no-longer-enrolled" as const),
            }))
        : [];

    return {
      ...conversation,
      taggings,
      messagesCount,
      readingsCount,
      endorsements,
    };
  };

  const getMessage = ({
    req,
    res,
    conversation,
    messageReference,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    messageReference: string;
  }):
    | {
        id: number;
        createdAt: string;
        updatedAt: string | null;
        reference: string;
        authorEnrollment: AuthorEnrollment;
        anonymousAt: string | null;
        answerAt: string | null;
        contentSource: string;
        contentPreprocessed: HTML;
        contentSearch: string;
        reading: { id: number } | null;
        readings: {
          id: number;
          createdAt: string;
          enrollment: AuthorEnrollment;
        }[];
        endorsements: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
        likes: {
          id: number;
          enrollment: AuthorEnrollment;
        }[];
      }
    | undefined => {
    const messageRow = database.get<{
      id: number;
      createdAt: string;
      updatedAt: string | null;
      reference: string;
      authorEnrollmentId: number | null;
      authorUserId: number | null;
      authorUserLastSeenOnlineAt: string | null;
      authorUserEmail: string | null;
      authorUserName: string | null;
      authorUserAvatar: string | null;
      authorUserAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
      authorUserBiographySource: string | null;
      authorUserBiographyPreprocessed: HTML | null;
      authorEnrollmentReference: EnrollmentRole | null;
      authorEnrollmentRole: EnrollmentRole | null;
      anonymousAt: string | null;
      answerAt: string | null;
      contentSource: string;
      contentPreprocessed: HTML;
      contentSearch: string;
      readingId: number | null;
    }>(
      sql`
        SELECT "messages"."id",
               "messages"."createdAt",
               "messages"."updatedAt",
               "messages"."reference",
               "authorEnrollment"."id" AS "authorEnrollmentId",
               "authorUser"."id" AS "authorUserId",
               "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
               "authorUser"."email" AS "authorUserEmail",
               "authorUser"."name" AS "authorUserName",
               "authorUser"."avatar" AS "authorUserAvatar",
               "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColor",
               "authorUser"."biographySource" AS "authorUserBiographySource",
               "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
               "authorEnrollment"."reference" AS "authorEnrollmentReference",
               "authorEnrollment"."role" AS "authorEnrollmentRole",
               "messages"."anonymousAt",
               "messages"."answerAt",
               "messages"."contentSource",
               "messages"."contentPreprocessed",
               "messages"."contentSearch",
               "readings"."id" AS "readingId"
        FROM "messages"
        LEFT JOIN "enrollments" AS "authorEnrollment" ON "messages"."authorEnrollment" = "authorEnrollment"."id"
        LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
        LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                "readings"."enrollment" = ${res.locals.enrollment.id}
        WHERE "messages"."conversation" = ${conversation.id} AND
              "messages"."reference" = ${messageReference}
        ORDER BY "messages"."id" ASC
      `
    );
    if (messageRow === undefined) return undefined;
    const message = {
      id: messageRow.id,
      createdAt: messageRow.createdAt,
      updatedAt: messageRow.updatedAt,
      reference: messageRow.reference,
      authorEnrollment:
        messageRow.authorEnrollmentId !== null &&
        messageRow.authorUserId !== null &&
        messageRow.authorUserLastSeenOnlineAt !== null &&
        messageRow.authorUserEmail !== null &&
        messageRow.authorUserName !== null &&
        messageRow.authorUserAvatarlessBackgroundColor !== null &&
        messageRow.authorEnrollmentReference !== null &&
        messageRow.authorEnrollmentRole !== null
          ? {
              id: messageRow.authorEnrollmentId,
              user: {
                id: messageRow.authorUserId,
                lastSeenOnlineAt: messageRow.authorUserLastSeenOnlineAt,
                email: messageRow.authorUserEmail,
                name: messageRow.authorUserName,
                avatar: messageRow.authorUserAvatar,
                avatarlessBackgroundColor:
                  messageRow.authorUserAvatarlessBackgroundColor,
                biographySource: messageRow.authorUserBiographySource,
                biographyPreprocessed:
                  messageRow.authorUserBiographyPreprocessed,
              },
              reference: messageRow.authorEnrollmentReference,
              role: messageRow.authorEnrollmentRole,
            }
          : ("no-longer-enrolled" as const),
      anonymousAt: messageRow.anonymousAt,
      answerAt: messageRow.answerAt,
      contentSource: messageRow.contentSource,
      contentPreprocessed: messageRow.contentPreprocessed,
      contentSearch: messageRow.contentSearch,
      reading:
        messageRow.readingId === null ? null : { id: messageRow.readingId },
    };

    const readings = database
      .all<{
        id: number;
        createdAt: string;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "readings"."id",
                 "readings"."createdAt",
                 "enrollments"."id" AS "enrollmentId",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                 "enrollments"."reference" AS "enrollmentReference",
                 "enrollments"."role" AS "enrollmentRole"
          FROM "readings"
          JOIN "enrollments" ON "readings"."enrollment" = "enrollments"."id"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "readings"."message" = ${message.id}
          ORDER BY "readings"."id" ASC
        `
      )
      .map((reading) => ({
        id: reading.id,
        createdAt: reading.createdAt,
        enrollment:
          reading.enrollmentId !== null &&
          reading.userId !== null &&
          reading.userLastSeenOnlineAt !== null &&
          reading.userEmail !== null &&
          reading.userName !== null &&
          reading.userAvatarlessBackgroundColor !== null &&
          reading.enrollmentReference !== null &&
          reading.enrollmentRole !== null
            ? {
                id: reading.enrollmentId,
                user: {
                  id: reading.userId,
                  lastSeenOnlineAt: reading.userLastSeenOnlineAt,
                  email: reading.userEmail,
                  name: reading.userName,
                  avatar: reading.userAvatar,
                  avatarlessBackgroundColor:
                    reading.userAvatarlessBackgroundColor,
                  biographySource: reading.userBiographySource,
                  biographyPreprocessed: reading.userBiographyPreprocessed,
                },
                reference: reading.enrollmentReference,
                role: reading.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const endorsements = database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "endorsements"."id",
                 "enrollments"."id" AS "enrollmentId",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                 "enrollments"."reference" AS "enrollmentReference",
                 "enrollments"."role" AS "enrollmentRole"
          FROM "endorsements"
          JOIN "enrollments" ON "endorsements"."enrollment" = "enrollments"."id"
          JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "endorsements"."message" = ${message.id}
          ORDER BY "endorsements"."id" ASC
        `
      )
      .map((endorsement) => ({
        id: endorsement.id,
        enrollment:
          endorsement.enrollmentId !== null &&
          endorsement.userId !== null &&
          endorsement.userLastSeenOnlineAt !== null &&
          endorsement.userEmail !== null &&
          endorsement.userName !== null &&
          endorsement.userAvatarlessBackgroundColor !== null &&
          endorsement.enrollmentReference !== null &&
          endorsement.enrollmentRole !== null
            ? {
                id: endorsement.enrollmentId,
                user: {
                  id: endorsement.userId,
                  lastSeenOnlineAt: endorsement.userLastSeenOnlineAt,
                  email: endorsement.userEmail,
                  name: endorsement.userName,
                  avatar: endorsement.userAvatar,
                  avatarlessBackgroundColor:
                    endorsement.userAvatarlessBackgroundColor,
                  biographySource: endorsement.userBiographySource,
                  biographyPreprocessed: endorsement.userBiographyPreprocessed,
                },
                reference: endorsement.enrollmentReference,
                role: endorsement.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    const likes = database
      .all<{
        id: number;
        enrollmentId: number | null;
        userId: number | null;
        userLastSeenOnlineAt: string | null;
        userEmail: string | null;
        userName: string | null;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor | null;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        enrollmentReference: string | null;
        enrollmentRole: EnrollmentRole | null;
      }>(
        sql`
          SELECT "likes"."id",
                "enrollments"."id" AS "enrollmentId",
                "users"."id" AS "userId",
                "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                "users"."email" AS "userEmail",
                "users"."name" AS "userName",
                "users"."avatar" AS "userAvatar",
                "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                "users"."biographySource" AS "userBiographySource",
                "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                "enrollments"."reference" AS "enrollmentReference",
                "enrollments"."role" AS "enrollmentRole"
          FROM "likes"
          LEFT JOIN "enrollments" ON "likes"."enrollment" = "enrollments"."id"
          LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
          WHERE "likes"."message" = ${message.id}
          ORDER BY "likes"."id" ASC
        `
      )
      .map((like) => ({
        id: like.id,
        enrollment:
          like.enrollmentId !== null &&
          like.userId !== null &&
          like.userLastSeenOnlineAt !== null &&
          like.userEmail !== null &&
          like.userName !== null &&
          like.userAvatarlessBackgroundColor !== null &&
          like.enrollmentReference !== null &&
          like.enrollmentRole !== null
            ? {
                id: like.enrollmentId,
                user: {
                  id: like.userId,
                  lastSeenOnlineAt: like.userLastSeenOnlineAt,
                  email: like.userEmail,
                  name: like.userName,
                  avatar: like.userAvatar,
                  avatarlessBackgroundColor: like.userAvatarlessBackgroundColor,
                  biographySource: like.userBiographySource,
                  biographyPreprocessed: like.userBiographyPreprocessed,
                },
                reference: like.enrollmentReference,
                role: like.enrollmentRole,
              }
            : ("no-longer-enrolled" as const),
      }));

    return {
      ...message,
      readings,
      endorsements,
      likes,
    };
  };

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/new",
    ...isEnrolledInCourseMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      res.send(
        (res.locals.conversationsCount === 0 ? app.locals.layouts.main : conversationLayout)(
          {
            req,
            res,
            head: html`
              <title>
                Start
                ${res.locals.conversationsCount === 0 ? "the First" : "a New"}
                Conversation · ${res.locals.course.name} · Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-chat-left-text"></i>
                Start
                ${res.locals.conversationsCount === 0 ? "the First" : "a New"}
                Conversation
              </h2>

              <form
                method="POST"
                action="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/conversations"
                novalidate
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
              >
                <input type="hidden" name="_csrf" value="${req.csrfToken()}" />

                <div class="label">
                  <p class="label--text">Type</p>
                  <div
                    class="${res.locals.localCSS(css`
                      display: flex;
                      flex-wrap: wrap;
                      column-gap: var(--space--8);
                      row-gap: var(--space--2);
                    `)}"
                  >
                    $${res.locals.conversationTypes.map(
                      (conversationType) => html`
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="radio"
                            name="type"
                            value="${conversationType}"
                            required
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                            oninteractive="${javascript`
                              this.addEventListener("change", () => {
                                const form = this.closest("form");
                                for (const element of [...form.querySelectorAll('[name="tagsReferences[]"]'), form.querySelector('[name="content"]')])
                                  element.required = ${JSON.stringify(
                                    conversationType !== "chat"
                                  )};
                              });
                            `}"
                          />
                          <span>
                            $${conversationTypeIcon[conversationType].regular}
                            $${lodash.capitalize(conversationType)}
                          </span>
                          <span
                            class="${conversationTypeTextColor[conversationType]
                              .select}"
                          >
                            $${conversationTypeIcon[conversationType].fill}
                            $${lodash.capitalize(conversationType)}
                          </span>
                        </label>
                      `
                    )}
                  </div>
                </div>

                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-wrap: wrap;
                    column-gap: var(--space--8);
                    row-gap: var(--space--4);
                  `)}"
                >
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <div
                          class="label ${res.locals.localCSS(css`
                            width: var(--space--24);
                          `)}"
                        >
                          <div class="label--text">
                            Pin
                            <button
                              type="button"
                              class="button button--tight button--tight--inline button--transparent"
                              oninteractive="${javascript`
                                tippy(this, {
                                  trigger: "click",
                                  content: "Pinned conversations are listed first.",
                                });
                              `}"
                            >
                              <i class="bi bi-info-circle"></i>
                            </button>
                          </div>
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isPinned"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Pin",
                                  });
                                `}"
                              >
                                <i class="bi bi-pin-angle"></i>
                                Unpinned
                              </span>
                              <span
                                class="text--amber"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Unpin",
                                  });
                                `}"
                              >
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </span>
                            </label>
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="label ${res.locals.localCSS(css`
                      width: var(--space--40);
                    `)}"
                  >
                    <p class="label--text">Visibility</p>
                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                      `)}"
                    >
                      <label
                        class="button button--tight button--tight--inline button--transparent"
                      >
                        <input
                          type="checkbox"
                          name="isStaffOnly"
                          class="visually-hidden input--radio-or-checkbox--multilabel"
                          oninteractive="${javascript`
                            this.addEventListener("change", () => {
                              const anonymity = this.closest("form").querySelector(".anonymity");
                              if (anonymity === null) return;
                              anonymity.hidden = this.checked;
                              for (const element of anonymity.querySelectorAll("*"))
                                if (element.disabled !== null) element.disabled = this.checked;
                            });
                          `}"
                        />
                        <span
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Set as Visible by Staff Only",
                            });
                          `}"
                        >
                          <i class="bi bi-eye"></i>
                          Visible by Everyone
                        </span>
                        <span
                          class="text--sky"
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Set as Visible by Everyone",
                            });
                          `}"
                        >
                          <i class="bi bi-mortarboard-fill"></i>
                          Visible by Staff Only
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="label">
                  <p class="label--text">Title</p>
                  <input
                    type="text"
                    name="title"
                    required
                    autocomplete="off"
                    autofocus
                    class="input--text"
                  />
                </div>

                $${contentEditor({ req, res })}
                $${res.locals.tags.length === 0 &&
                res.locals.enrollment.role !== "staff"
                  ? html``
                  : html`
                      <div class="label">
                        <div class="label--text">
                          Tags
                          <button
                            type="button"
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              tippy(this, {
                                trigger: "click",
                                content: "Tags help to organize conversations.",
                              });
                            `}"
                          >
                            <i class="bi bi-info-circle"></i>
                          </button>
                          $${res.locals.tags.length > 0 &&
                          res.locals.enrollment.role === "staff"
                            ? html`
                                <div
                                  class="${res.locals.localCSS(css`
                                    flex: 1;
                                    display: flex;
                                    justify-content: flex-end;
                                  `)}"
                                >
                                  <a
                                    href="${app.locals.options.baseURL}/courses/${res.locals.course
                                      .reference}/settings/tags"
                                    target="_blank"
                                    class="button button--tight button--tight--inline button--transparent secondary"
                                  >
                                    <i class="bi bi-sliders"></i>
                                    Manage Tags
                                  </a>
                                </div>
                              `
                            : html``}
                        </div>
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                            flex-wrap: wrap;
                            column-gap: var(--space--8);
                            row-gap: var(--space--2);
                          `)}"
                        >
                          $${res.locals.tags.length === 0 &&
                          res.locals.enrollment.role === "staff"
                            ? html`
                                <a
                                  href="${app.locals.options.baseURL}/courses/${res.locals.course
                                    .reference}/settings/tags"
                                  target="_blank"
                                  class="button button--tight button--tight--inline button--inline button--transparent secondary"
                                >
                                  <i class="bi bi-sliders"></i>
                                  Create the First Tag
                                </a>
                              `
                            : res.locals.tags.map(
                                (tag) => html`
                                  <div
                                    class="${res.locals.localCSS(css`
                                      display: flex;
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <label
                                      class="button button--tight button--tight--inline button--transparent"
                                    >
                                      <input
                                        type="checkbox"
                                        name="tagsReferences[]"
                                        value="${tag.reference}"
                                        required
                                        class="visually-hidden input--radio-or-checkbox--multilabel"
                                      />
                                      <span>
                                        <i class="bi bi-tag"></i>
                                        ${tag.name}
                                      </span>
                                      <span class="text--teal">
                                        <i class="bi bi-tag-fill"></i>
                                        ${tag.name}
                                      </span>
                                    </label>
                                    $${tag.staffOnlyAt !== null
                                      ? html`
                                          <span
                                            class="text--sky"
                                            oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "This tag is visible by staff only.",
                                          });
                                        `}"
                                          >
                                            <i
                                              class="bi bi-mortarboard-fill"
                                            ></i>
                                          </span>
                                        `
                                      : html``}
                                  </div>
                                `
                              )}
                        </div>
                      </div>
                    `}
                $${res.locals.enrollment.role === "staff"
                  ? html``
                  : html`
                      <div class="anonymity label">
                        <p class="label--text">Anonymity</p>
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                          `)}"
                        >
                          <label
                            class="button button--tight button--tight--inline button--transparent"
                          >
                            <input
                              type="checkbox"
                              name="isAnonymous"
                              class="visually-hidden input--radio-or-checkbox--multilabel"
                            />
                            <span
                              oninteractive="${javascript`
                                tippy(this, {
                                  touch: false,
                                  content: "Set as Anonymous to Other Students",
                                });
                              `}"
                            >
                              <span>
                                $${userPartial({
                                  req,
                                  res,
                                  user: res.locals.user,
                                  decorate: false,
                                  name: false,
                                })}
                                <span
                                  class="${res.locals.localCSS(css`
                                    margin-left: var(--space--1);
                                  `)}"
                                >
                                  Signed by You
                                </span>
                              </span>
                            </span>
                            <span
                              oninteractive="${javascript`
                                tippy(this, {
                                  touch: false,
                                  content: "Set as Signed by You",
                                });
                              `}"
                            >
                              <span>
                                $${userPartial({
                                  req,
                                  res,
                                  name: false,
                                })}
                                <span
                                  class="${res.locals.localCSS(css`
                                    margin-left: var(--space--1);
                                  `)}"
                                >
                                  Anonymous to Other Students
                                </span>
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>
                    `}

                <div>
                  <button
                    class="button button--full-width-on-small-screen button--blue"
                    oninteractive="${javascript`
                      Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                      tippy(this, {
                        touch: false,
                        content: ${res.locals.HTMLForJavaScript(
                          html`
                            <span class="keyboard-shortcut">
                              <span
                                oninteractive="${javascript`
                                  this.hidden = leafac.isAppleDevice;
                                `}"
                                >Ctrl+Enter</span
                              ><span
                                class="keyboard-shortcut--cluster"
                                oninteractive="${javascript`
                                  this.hidden = !leafac.isAppleDevice;
                                `}"
                                ><i class="bi bi-command"></i
                                ><i class="bi bi-arrow-return-left"></i
                              ></span>
                            </span>
                          `
                        )},
                      });
                    `}"
                  >
                    <i class="bi bi-chat-left-text"></i>
                    Start Conversation
                  </button>
                </div>
              </form>
            `,
          }
        )
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      type?: ConversationType;
      isPinned?: boolean;
      isStaffOnly?: boolean;
      title?: string;
      content?: string;
      tagsReferences?: string[];
      isAnonymous?: boolean;
    },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations",
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      req.body.tagsReferences ??= [];
      if (
        typeof req.body.type !== "string" ||
        !res.locals.conversationTypes.includes(req.body.type) ||
        (req.body.isPinned && res.locals.enrollment.role !== "staff") ||
        typeof req.body.title !== "string" ||
        req.body.title.trim() === "" ||
        (req.body.type !== "chat" &&
          (typeof req.body.content !== "string" ||
            req.body.content.trim() === "")) ||
        (req.body.type === "chat" &&
          req.body.content !== undefined &&
          typeof req.body.content !== "string") ||
        !Array.isArray(req.body.tagsReferences) ||
        (res.locals.tags.length > 0 &&
          ((req.body.type !== "chat" && req.body.tagsReferences.length === 0) ||
            new Set(req.body.tagsReferences).size <
              req.body.tagsReferences.length ||
            req.body.tagsReferences.some(
              (tagReference) =>
                typeof tagReference !== "string" ||
                !res.locals.tags.some(
                  (existingTag) => tagReference === existingTag.reference
                )
            ))) ||
        ((res.locals.enrollment.role === "staff" || req.body.isStaffOnly) &&
          req.body.isAnonymous)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "nextConversationReference" = ${
            res.locals.course.nextConversationReference + 1
          }
          WHERE "id" = ${res.locals.course.id}
        `
      );
      const conversationRow = database.get<{
        id: number;
        reference: string;
        type: ConversationType;
        staffOnlyAt: string | null;
        title: string;
      }>(
        sql`
          INSERT INTO "conversations" (
            "createdAt",
            "course",
            "reference",
            "authorEnrollment",
            "anonymousAt",
            "type",
            "pinnedAt",
            "staffOnlyAt",
            "title",
            "titleSearch",
            "nextMessageReference"
          )
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.course.id},
            ${String(res.locals.course.nextConversationReference)},
            ${res.locals.enrollment.id},
            ${req.body.isAnonymous ? new Date().toISOString() : null},
            ${req.body.type},
            ${req.body.isPinned ? new Date().toISOString() : null},
            ${req.body.isStaffOnly ? new Date().toISOString() : null},
            ${req.body.title},
            ${html`${req.body.title}`},
            ${2}
          )
          RETURNING *
        `
      )!;
      for (const tagReference of req.body.tagsReferences)
        database.run(
          sql`
            INSERT INTO "taggings" ("createdAt", "conversation", "tag")
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${
                res.locals.tags.find(
                  (existingTag) => existingTag.reference === tagReference
                )!.id
              }
            )
          `
        );

      if (
        typeof req.body.content === "string" &&
        req.body.content.trim() !== ""
      ) {
        const processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        const message = database.get<{
          id: number;
          reference: string;
        }>(
          sql`
            INSERT INTO "messages" (
              "createdAt",
              "conversation",
              "reference",
              "authorEnrollment",
              "anonymousAt",
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${new Date().toISOString()},
              ${conversationRow.id},
              ${"1"},
              ${res.locals.enrollment.id},
              ${req.body.isAnonymous ? new Date().toISOString() : null},
              ${req.body.content},
              ${processedContent.preprocessed},
              ${processedContent.search}
            )
            RETURNING *
          `
        )!;
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
        const conversation = getConversation({
          req,
          res,
          conversationReference: conversationRow.reference,
        })!;
        sendNotificationEmails({
          req,
          res,
          conversation,
          message: getMessage({
            req,
            res,
            conversation,
            messageReference: message.reference,
          })!,
          mentions: processedContent.mentions!,
        });
      }

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.course.nextConversationReference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.post<
    { courseReference: string },
    any,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/mark-all-conversations-as-read",
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      const messages = database.all<{ id: number }>(
        sql`
          SELECT "messages"."id"
          FROM "messages"
          JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                  "conversations"."course" = ${
                                    res.locals.course.id
                                  }
          LEFT JOIN "readings" ON "messages"."id" = "readings"."message" AND
                                  "readings"."enrollment" = ${
                                    res.locals.enrollment.id
                                  }
          WHERE "readings"."id" IS NULL
                $${
                  res.locals.enrollment.role === "staff"
                    ? sql``
                    : sql`
                        AND "conversations"."staffOnlyAt" IS NULL OR
                        EXISTS(
                          SELECT TRUE
                          FROM "messages"
                          WHERE "messages"."authorEnrollment" = ${res.locals.enrollment.id} AND
                                "messages"."conversation" = "conversations"."id"
                        )
                      `
                }
          ORDER BY "messages"."id" ASC
        `
      );
      for (const message of messages)
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
      res.redirect("back");
    }
  );

  interface IsConversationAccessibleMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {
    conversation: NonNullable<ReturnType<typeof getConversation>>;
  }
  const isConversationAccessibleMiddleware: express.RequestHandler<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    IsConversationAccessibleMiddlewareLocals
  >[] = [
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      const conversation = getConversation({
        req,
        res,
        conversationReference: req.params.conversationReference,
      });
      if (conversation === undefined) return next("route");
      res.locals.conversation = conversation;
      next();
    },
  ];

  const mayEditConversation = ({
    req,
    res,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
  }): boolean =>
    res.locals.enrollment.role === "staff" ||
    (res.locals.conversation.authorEnrollment !== "no-longer-enrolled" &&
      res.locals.conversation.authorEnrollment.id === res.locals.enrollment.id);

  interface MayEditConversationMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {}
  const mayEditConversationMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    {},
    {},
    MayEditConversationMiddlewareLocals
  >[] = [
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      if (mayEditConversation({ req, res })) return next();
      next("route");
    },
  ];

  interface MessageExistsMiddlewareLocals
    extends IsConversationAccessibleMiddlewareLocals {
    message: NonNullable<ReturnType<typeof getMessage>>;
  }
  const messageExistsMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MessageExistsMiddlewareLocals
  >[] = [
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      const message = getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: req.params.messageReference,
      });
      if (message === undefined) return next("route");
      res.locals.message = message;
      next();
    },
  ];

  const mayEditMessage = ({
    req,
    res,
    message,
  }: {
    req: express.Request<
      { courseReference: string; conversationReference: string },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: MessageExistsMiddlewareLocals["message"];
  }) =>
    res.locals.enrollment.role === "staff" ||
    (message.authorEnrollment !== "no-longer-enrolled" &&
      message.authorEnrollment.id === res.locals.enrollment.id);

  interface MayEditMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  const mayEditMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEditMessageMiddlewareLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (mayEditMessage({ req, res, message: res.locals.message }))
        return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {
      search?: string;
      messageReference?: string;
      beforeMessageReference?: string;
      afterMessageReference?: string;
    },
    IsConversationAccessibleMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...isConversationAccessibleMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      const beforeMessage =
        FEATURE_PAGINATION &&
        typeof req.query.beforeMessageReference === "string"
          ? database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE "conversation" = ${res.locals.conversation.id} AND
                      "reference" = ${req.query.beforeMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const afterMessage =
        FEATURE_PAGINATION &&
        beforeMessage === undefined &&
        typeof req.query.afterMessageReference === "string"
          ? database.get<{ id: number }>(
              sql`
                SELECT "id"
                FROM "messages"
                WHERE "conversation" = ${res.locals.conversation.id} AND
                      "reference" = ${req.query.afterMessageReference}
                LIMIT 1
              `
            )
          : undefined;
      const messagesReverse =
        FEATURE_PAGINATION &&
        (beforeMessage !== undefined ||
          (afterMessage === undefined &&
            res.locals.conversation.type === "chat"));

      const messagesRows = database.all<{ reference: string }>(
        sql`
          SELECT "reference"
          FROM "messages"
          WHERE "conversation" = ${res.locals.conversation.id}
                $${
                  FEATURE_PAGINATION && beforeMessage !== undefined
                    ? sql`
                        AND "id" < ${beforeMessage.id}
                      `
                    : sql``
                }
                $${
                  FEATURE_PAGINATION && afterMessage !== undefined
                    ? sql`
                        AND "id" > ${afterMessage.id}
                      `
                    : sql``
                }
          ORDER BY "id" $${
            FEATURE_PAGINATION && messagesReverse ? sql`DESC` : sql`ASC`
          }
          $${FEATURE_PAGINATION ? sql`LIMIT 26` : sql``}
        `
      );
      const moreMessagesExist =
        FEATURE_PAGINATION && messagesRows.length === 26;
      if (FEATURE_PAGINATION && moreMessagesExist) messagesRows.pop();
      if (FEATURE_PAGINATION && messagesReverse) messagesRows.reverse();
      const messages = messagesRows.map(
        (message) =>
          getMessage({
            req,
            res,
            conversation: res.locals.conversation,
            messageReference: message.reference,
          })!
      );

      for (const message of messages)
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );

      res.send(
        conversationLayout({
          req,
          res,
          head: html`
            <title>
              ${res.locals.conversation.title} · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          mainIsAScrollingPane: res.locals.conversation.type === "chat",
          body: html`
            <div
              class="${res.locals.localCSS(css`
                flex: 1;
                display: flex;
                flex-direction: column;
                min-width: var(--space--0);
              `)}"
            >
              <div
                class="conversation--header ${res.locals.localCSS(css`
                  padding-bottom: var(--space--2);
                  border-bottom: var(--border-width--1) solid
                    var(--color--gray--medium--200);
                  @media (prefers-color-scheme: dark) {
                    border-color: var(--color--gray--medium--700);
                  }
                  ${res.locals.conversation.type === "chat"
                    ? css`
                        padding-top: var(--space--4);
                        padding-right: var(--space--4);
                        padding-left: var(--space--4);
                        @media (min-width: 900px) {
                          padding-left: var(--space--8);
                        }
                        display: flex;
                        @media (max-width: 899px) {
                          justify-content: center;
                        }
                      `
                    : css``}
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                          display: flex;
                          & > * {
                            flex: 1;
                          }
                        `
                      : css``}
                  `)}"
                >
                  $${res.locals.conversation.type === "chat"
                    ? html`
                        <button
                          class="conversation--header--compact button button--tight button--tight--inline button--transparent strong ${res
                            .locals.localCSS(css`
                            max-width: calc(100% + var(--space--2));
                            margin-top: var(--space---2);
                          `)}"
                          oninteractive="${javascript`
                            this.addEventListener("click", () => {
                              this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = true;
                              this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = false;
                            });
                          `}"
                          onbeforeelupdated="${javascript`
                            this.wasHidden = this.hidden;
                          `}"
                          onelupdated="${javascript`
                            this.hidden = this.wasHidden;
                          `}"
                        >
                          <span
                            class="${res.locals.localCSS(css`
                              flex: 1;
                              text-align: left;
                              white-space: nowrap;
                              overflow: hidden;
                              text-overflow: ellipsis;
                            `)}"
                          >
                            $${highlightSearchResult(
                              html`${res.locals.conversation.title}`,
                              req.query.search
                            )}
                          </span>
                          <i class="bi bi-chevron-bar-expand"></i>
                        </button>
                      `
                    : html``}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                    class="conversation--header--full ${res.locals.localCSS(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--1);
                    `)}"
                    onbeforeelupdated="${javascript`
                      this.wasHidden = this.hidden;
                    `}"
                    onelupdated="${javascript`
                      this.hidden = this.wasHidden;
                    `}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        display: flex;
                        gap: var(--space--4);
                      `)}"
                    >
                      <div
                        class="${res.locals.localCSS(css`
                          flex: 1;
                          display: flex;
                          flex-wrap: wrap;
                          column-gap: var(--space--8);
                          row-gap: var(--space--1);

                          & > * {
                            display: flex;
                            gap: var(--space--1);
                          }
                        `)}"
                      >
                        $${mayEditConversation({ req, res })
                          ? html`
                              <div>
                                <button
                                  class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                    .locals.conversation.type === "question" &&
                                  res.locals.conversation.resolvedAt !== null
                                    ? "text--emerald"
                                    : conversationTypeTextColor[
                                        res.locals.conversation.type
                                      ].display}"
                                  oninteractive="${javascript`
                                    tippy(this, {
                                      touch: false,
                                      content: "Update Conversation Type",
                                    });
                                    tippy(this, {
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.HTMLForJavaScript(
                                        html`
                                          <div class="dropdown--menu">
                                            $${res.locals.conversationTypes.map(
                                              (conversationType) => html`
                                                <form
                                                  method="POST"
                                                  action="${app.locals.options.baseURL}/courses/${res
                                                    .locals.course
                                                    .reference}/conversations/${res
                                                    .locals.conversation
                                                    .reference}?_method=PATCH"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="_csrf"
                                                    value="${req.csrfToken()}"
                                                  />
                                                  <input
                                                    type="hidden"
                                                    name="type"
                                                    value="${conversationType}"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button ${conversationType ===
                                                    res.locals.conversation.type
                                                      ? "button--blue"
                                                      : "button--transparent"} ${conversationTypeTextColor[
                                                      conversationType
                                                    ].display}"
                                                  >
                                                    $${conversationTypeIcon[
                                                      conversationType
                                                    ].fill}
                                                    $${lodash.capitalize(
                                                      conversationType
                                                    )}
                                                  </button>
                                                </form>
                                              `
                                            )}
                                          </div>
                                        `
                                      )},
                                    });
                                  `}"
                                >
                                  $${conversationTypeIcon[
                                    res.locals.conversation.type
                                  ].fill}
                                  $${lodash.capitalize(
                                    res.locals.conversation.type
                                  )}
                                </button>
                              </div>
                            `
                          : html`
                              <div
                                class="${res.locals.conversation.type ===
                                  "question" &&
                                res.locals.conversation.resolvedAt !== null
                                  ? "text--emerald"
                                  : conversationTypeTextColor[
                                      res.locals.conversation.type
                                    ].display}"
                              >
                                $${conversationTypeIcon[
                                  res.locals.conversation.type
                                ].fill}
                                $${lodash.capitalize(
                                  res.locals.conversation.type
                                )}
                              </div>
                            `}
                        $${res.locals.conversation.type === "question"
                          ? html`
                              $${res.locals.enrollment.role === "staff"
                                ? html`
                                    <form
                                      method="POST"
                                      action="${app.locals.options.baseURL}/courses/${res.locals
                                        .course.reference}/conversations/${res
                                        .locals.conversation
                                        .reference}?_method=PATCH"
                                    >
                                      <input
                                        type="hidden"
                                        name="_csrf"
                                        value="${req.csrfToken()}"
                                      />
                                      $${res.locals.conversation.resolvedAt ===
                                      null
                                        ? html`
                                            <input
                                              type="hidden"
                                              name="isResolved"
                                              value="true"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--rose"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  touch: false,
                                                  content: "Set as Resolved",
                                                });
                                              `}"
                                            >
                                              <i
                                                class="bi bi-patch-exclamation-fill"
                                              ></i>
                                              Unresolved
                                            </button>
                                          `
                                        : html`
                                            <input
                                              type="hidden"
                                              name="isResolved"
                                              value="false"
                                            />
                                            <button
                                              class="button button--tight button--tight--inline button--tight-gap button--transparent text--emerald"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  touch: false,
                                                  content: "Set as Unresolved",
                                                });
                                              `}"
                                            >
                                              <i
                                                class="bi bi-patch-check-fill"
                                              ></i>
                                              Resolved
                                            </button>
                                          `}
                                    </form>
                                  `
                                : res.locals.conversation.resolvedAt === null
                                ? html`
                                    <div
                                      class="text--rose ${res.locals
                                        .localCSS(css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `)}"
                                    >
                                      <i
                                        class="bi bi-patch-exclamation-fill"
                                      ></i>
                                      Unresolved
                                    </div>
                                  `
                                : html`
                                    <div
                                      class="text--emerald ${res.locals
                                        .localCSS(css`
                                        display: flex;
                                        gap: var(--space--1);
                                      `)}"
                                    >
                                      <i class="bi bi-patch-check-fill"></i>
                                      Resolved
                                    </div>
                                  `}
                            `
                          : html``}
                        $${res.locals.enrollment.role === "staff"
                          ? html`
                              <form
                                method="POST"
                                action="${app.locals.options.baseURL}/courses/${res.locals.course
                                  .reference}/conversations/${res.locals
                                  .conversation.reference}?_method=PATCH"
                              >
                                <input
                                  type="hidden"
                                  name="_csrf"
                                  value="${req.csrfToken()}"
                                />
                                $${res.locals.conversation.pinnedAt === null
                                  ? html`
                                      <input
                                        type="hidden"
                                        name="isPinned"
                                        value="true"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "Pin",
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-angle"></i>
                                        Unpinned
                                      </button>
                                    `
                                  : html`
                                      <input
                                        type="hidden"
                                        name="isPinned"
                                        value="false"
                                      />
                                      <button
                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--amber"
                                        oninteractive="${javascript`
                                          tippy(this, {
                                            touch: false,
                                            content: "Unpin",
                                          });
                                        `}"
                                      >
                                        <i class="bi bi-pin-fill"></i>
                                        Pinned
                                      </button>
                                    `}
                              </form>
                            `
                          : res.locals.conversation.pinnedAt !== null
                          ? html`
                              <div class="text--amber">
                                <i class="bi bi-pin-fill"></i>
                                Pinned
                              </div>
                            `
                          : html``}
                        $${res.locals.enrollment.role === "staff"
                          ? html`
                              <button
                                class="button button--tight button--tight--inline button--tight-gap button--transparent ${res
                                  .locals.conversation.staffOnlyAt === null
                                  ? ""
                                  : "text--sky"}"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as ${
                                      res.locals.conversation.staffOnlyAt ===
                                      null
                                        ? "Visible by Staff Only"
                                        : "Visible by Everyone"
                                    }",
                                  });
                                  tippy(this, {
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <form
                                          method="POST"
                                          action="${app.locals.options.baseURL}/courses/${res
                                            .locals.course
                                            .reference}/conversations/${res
                                            .locals.conversation
                                            .reference}?_method=PATCH"
                                          class="${res.locals.localCSS(css`
                                            padding: var(--space--2);
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--4);
                                          `)}"
                                        >
                                          <input
                                            type="hidden"
                                            name="_csrf"
                                            value="${req.csrfToken()}"
                                          />
                                          $${res.locals.conversation
                                            .staffOnlyAt === null
                                            ? html`
                                                <input
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="true"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Staff Only?
                                                </p>
                                                <p>
                                                  <strong
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Students who already
                                                    participated in the
                                                    conversation will continue
                                                    to have access to it.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i
                                                    class="bi bi-mortarboard"
                                                  ></i>
                                                  Set as Visible by Staff Only
                                                </button>
                                              `
                                            : html`
                                                <input
                                                  type="hidden"
                                                  name="isStaffOnly"
                                                  value="false"
                                                />
                                                <p>
                                                  Are you sure you want to set
                                                  this conversation as Visible
                                                  by Everyone?
                                                </p>
                                                <p>
                                                  <strong
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-weight: var(
                                                        --font-weight--bold
                                                      );
                                                    `)}"
                                                  >
                                                    Ensure that people involved
                                                    in the conversation consent
                                                    to having their messages
                                                    visible by everyone.
                                                  </strong>
                                                </p>
                                                <button
                                                  class="button button--rose"
                                                >
                                                  <i class="bi bi-eye"></i>
                                                  Set as Visible by Everyone
                                                </button>
                                              `}
                                        </form>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                $${res.locals.conversation.staffOnlyAt === null
                                  ? html`
                                      <i class="bi bi-eye"></i>
                                      Visible by Everyone
                                    `
                                  : html`
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Visible by Staff Only
                                    `}
                              </button>
                            `
                          : res.locals.conversation.staffOnlyAt !== null
                          ? html`
                              <div
                                class="text--sky ${res.locals.localCSS(css`
                                  display: flex;
                                  gap: var(--space--1);
                                `)}"
                              >
                                <i class="bi bi-mortarboard-fill"></i>
                                Visible by Staff Only
                              </div>
                            `
                          : html``}
                      </div>

                      <div>
                        <button
                          class="button button--tight button--tight--inline button--transparent secondary"
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Actions",
                            });
                            tippy(this, {
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.HTMLForJavaScript(
                                html`
                                  <h3 class="heading">
                                    <i class="bi bi-chat-left-text"></i>
                                    Conversation
                                    #${res.locals.conversation.reference}
                                  </h3>
                                  <div class="dropdown--menu">
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                      oninteractive="${javascript`
                                        const copied = tippy(this, {
                                          theme: "green",
                                          trigger: "manual",
                                          content: "Copied",
                                        });
                                        this.addEventListener("click", async () => {
                                          await navigator.clipboard.writeText("${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}");
                                          copied.show();
                                          await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                          copied.hide();
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-link"></i>
                                      Copy Conversation Permanent Link
                                    </button>
                                    $${mayEditConversation({ req, res })
                                      ? html`
                                          <button
                                            class="dropdown--menu--item button button--transparent"
                                            oninteractive="${javascript`
                                              this.addEventListener("click", () => {
                                                this.closest(".conversation--header--full").querySelector(".title--show").hidden = true;
                                                this.closest(".conversation--header--full").querySelector(".title--edit").hidden = false;
                                                tippy.hideAll();
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-pencil"></i>
                                            Edit Conversation Title
                                          </button>
                                        `
                                      : html``}
                                    $${res.locals.enrollment.role === "staff"
                                      ? html`
                                          <div>
                                            <button
                                              class="dropdown--menu--item button button--transparent"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  theme: "rose",
                                                  trigger: "click",
                                                  interactive: true,
                                                  content: ${res.locals.HTMLForJavaScript(
                                                    html`
                                                      <form
                                                        method="POST"
                                                        action="${app.locals.options.baseURL}/courses/${res
                                                          .locals.course
                                                          .reference}/conversations/${res
                                                          .locals.conversation
                                                          .reference}?_method=DELETE"
                                                        class="${res.locals
                                                          .localCSS(css`
                                                          padding: var(
                                                            --space--2
                                                          );
                                                          display: flex;
                                                          flex-direction: column;
                                                          gap: var(--space--4);
                                                        `)}"
                                                      >
                                                        <input
                                                          type="hidden"
                                                          name="_csrf"
                                                          value="${req.csrfToken()}"
                                                        />
                                                        <p>
                                                          Are you sure you want
                                                          to remove this
                                                          conversation?
                                                        </p>
                                                        <p>
                                                          <strong
                                                            class="${res.locals
                                                              .localCSS(css`
                                                              font-weight: var(
                                                                --font-weight--bold
                                                              );
                                                            `)}"
                                                          >
                                                            You may not undo
                                                            this action!
                                                          </strong>
                                                        </p>
                                                        <button
                                                          class="button button--rose"
                                                        >
                                                          <i
                                                            class="bi bi-trash"
                                                          ></i>
                                                          Remove Conversation
                                                        </button>
                                                      </form>
                                                    `
                                                  )},
                                                });
                                              `}"
                                            >
                                              <i class="bi bi-trash"></i>
                                              Remove Conversation
                                            </button>
                                          </div>
                                        `
                                      : html``}
                                  </div>
                                `
                              )},
                            });
                          `}"
                        >
                          <i class="bi bi-three-dots-vertical"></i>
                        </button>
                      </div>
                    </div>

                    <h2
                      class="title--show strong ${res.locals.localCSS(css`
                        font-size: var(--font-size--lg);
                        line-height: var(--line-height--lg);
                      `)}"
                      onbeforeelupdated="${javascript`
                        this.wasHidden = this.hidden;
                      `}"
                      onelupdated="${javascript`
                        this.hidden = this.wasHidden;
                      `}"
                    >
                      $${highlightSearchResult(
                        html`${res.locals.conversation.title}`,
                        req.query.search
                      )}
                    </h2>

                    $${mayEditConversation({ req, res })
                      ? html`
                          <form
                            method="POST"
                            action="${app.locals.options.baseURL}/courses/${res.locals.course
                              .reference}/conversations/${res.locals
                              .conversation.reference}?_method=PATCH"
                            novalidate
                            hidden
                            class="title--edit ${res.locals.localCSS(css`
                              display: flex;
                              gap: var(--space--2);
                              align-items: center;
                            `)}"
                            onbeforeelupdated="${javascript`
                              this.wasHidden = this.hidden;
                            `}"
                            onelupdated="${javascript`
                              this.hidden = this.wasHidden;
                            `}"
                          >
                            <input
                              type="hidden"
                              name="_csrf"
                              value="${req.csrfToken()}"
                            />
                            <input
                              type="text"
                              name="title"
                              value="${res.locals.conversation.title}"
                              required
                              autocomplete="off"
                              class="input--text"
                            />
                            <button
                              class="button button--tight button--tight--inline button--transparent text--green ${res
                                .locals.localCSS(css`
                                flex: 1;
                              `)}"
                              oninteractive="${javascript`
                                tippy(this, {
                                  theme: "green",
                                  touch: false,
                                  content: "Update Title",
                                });
                              `}"
                            >
                              <i class="bi bi-check-lg"></i>
                            </button>
                            <button
                              type="reset"
                              class="button button--tight button--tight--inline button--transparent text--rose"
                              oninteractive="${javascript`
                                tippy(this, {
                                  theme: "rose",
                                  touch: false,
                                  content: "Cancel",
                                });
                                this.addEventListener("click", () => {
                                  this.closest(".conversation--header--full").querySelector(".title--show").hidden = false;
                                  this.closest(".conversation--header--full").querySelector(".title--edit").hidden = true;
                                });
                              `}"
                            >
                              <i class="bi bi-x-lg"></i>
                            </button>
                          </form>
                        `
                      : html``}
                    $${res.locals.tags.length === 0
                      ? html``
                      : html`
                          <div
                            class="${res.locals.localCSS(css`
                              font-size: var(--font-size--xs);
                              line-height: var(--line-height--xs);
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--8);
                              row-gap: var(--space--1);

                              & > * {
                                display: flex;
                                gap: var(--space--1);
                              }
                            `)}"
                          >
                            $${mayEditConversation({ req, res })
                              ? html`
                                  $${res.locals.conversation.taggings.length ===
                                  1
                                    ? html`
                                        <div>
                                          <button
                                            class="button button--tight button--tight--inline button--tight-gap text--teal disabled ${res
                                              .locals.localCSS(css`
                                              text-align: left;
                                            `)}"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                theme: "rose",
                                                touch: false,
                                                content: "You may not remove this tag because a conversation must have at least one tag.",
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-tag-fill"></i>
                                            ${res.locals.conversation
                                              .taggings[0].tag.name}
                                          </button>
                                          $${res.locals.conversation.taggings[0]
                                            .tag.staffOnlyAt !== null
                                            ? html`
                                                <span
                                                  class="text--sky"
                                                  oninteractive="${javascript`
                                                    tippy(this, {
                                                      content: "This tag is visible by staff only.",
                                                    });
                                                  `}"
                                                >
                                                  <i
                                                    class="bi bi-mortarboard-fill"
                                                  ></i>
                                                </span>
                                              `
                                            : html``}
                                        </div>
                                      `
                                    : html`
                                        $${res.locals.conversation.taggings.map(
                                          (tagging) => html`
                                            <form
                                              method="POST"
                                              action="${app.locals.options.baseURL}/courses/${res
                                                .locals.course
                                                .reference}/conversations/${res
                                                .locals.conversation
                                                .reference}/taggings?_method=DELETE"
                                              class="${res.locals.localCSS(css`
                                                display: flex;
                                                gap: var(--space--2);
                                              `)}"
                                            >
                                              <input
                                                type="hidden"
                                                name="_csrf"
                                                value="${req.csrfToken()}"
                                              />
                                              <input
                                                type="hidden"
                                                name="reference"
                                                value="${tagging.tag.reference}"
                                              />
                                              <button
                                                class="button button--tight button--tight--inline button--tight-gap button--transparent text--teal ${res
                                                  .locals.localCSS(css`
                                                  text-align: left;
                                                `)}"
                                                oninteractive="${javascript`
                                                  tippy(this, {
                                                    theme: "rose",
                                                    touch: false,
                                                    content: "Remove Tag",
                                                  });
                                                `}"
                                              >
                                                <i class="bi bi-tag-fill"></i>
                                                ${tagging.tag.name}
                                              </button>
                                              $${tagging.tag.staffOnlyAt !==
                                              null
                                                ? html`
                                                    <span
                                                      class="text--sky"
                                                      oninteractive="${javascript`
                                                        tippy(this, {
                                                          content: "This tag is visible by staff only.",
                                                        });
                                                      `}"
                                                    >
                                                      <i
                                                        class="bi bi-mortarboard-fill"
                                                      ></i>
                                                    </span>
                                                  `
                                                : html``}
                                            </form>
                                          `
                                        )}
                                      `}
                                  $${res.locals.tags.length >
                                  res.locals.conversation.taggings.length
                                    ? html`
                                        <div>
                                          <button
                                            class="button button--tight button--tight--inline button--transparent text--teal"
                                            oninteractive="${javascript`
                                              tippy(this, {
                                                touch: false,
                                                content: "Add Tag",
                                              });
                                              tippy(this, {
                                                trigger: "click",
                                                interactive: true,
                                                content: ${res.locals.HTMLForJavaScript(
                                                  html`
                                                    <div
                                                      class="dropdown--menu ${res
                                                        .locals.localCSS(css`
                                                        max-height: var(
                                                          --space--40
                                                        );
                                                        overflow: auto;
                                                      `)}"
                                                    >
                                                      $${res.locals.tags
                                                        .filter(
                                                          (tag) =>
                                                            !res.locals.conversation.taggings.some(
                                                              (tagging) =>
                                                                tagging.tag
                                                                  .id === tag.id
                                                            )
                                                        )
                                                        .map(
                                                          (tag) => html`
                                                            <form
                                                              method="POST"
                                                              action="${app.locals.options.baseURL}/courses/${res
                                                                .locals.course
                                                                .reference}/conversations/${res
                                                                .locals
                                                                .conversation
                                                                .reference}/taggings"
                                                            >
                                                              <input
                                                                type="hidden"
                                                                name="_csrf"
                                                                value="${req.csrfToken()}"
                                                              />
                                                              <input
                                                                type="hidden"
                                                                name="reference"
                                                                value="${tag.reference}"
                                                              />
                                                              <button
                                                                class="dropdown--menu--item button button--transparent text--teal"
                                                              >
                                                                <i
                                                                  class="bi bi-tag-fill"
                                                                ></i>
                                                                ${tag.name}
                                                                $${tag.staffOnlyAt !==
                                                                null
                                                                  ? html`
                                                                      <span
                                                                        class="text--sky"
                                                                        oninteractive="${javascript`
                                                                          tippy(this, {
                                                                            touch: false,
                                                                            content: "This tag is visible by staff only.",
                                                                          });
                                                                        `}"
                                                                      >
                                                                        <i
                                                                          class="bi bi-mortarboard-fill"
                                                                        ></i>
                                                                      </span>
                                                                    `
                                                                  : html``}
                                                              </button>
                                                            </form>
                                                          `
                                                        )}
                                                      $${res.locals.enrollment
                                                        .role === "staff"
                                                        ? html`
                                                            <a
                                                              href="${app.locals.options.baseURL}/courses/${res
                                                                .locals.course
                                                                .reference}/settings/tags"
                                                              target="_blank"
                                                              class="dropdown--menu--item button button--transparent"
                                                            >
                                                              <i
                                                                class="bi bi-sliders"
                                                              ></i>
                                                              Manage Tags
                                                            </a>
                                                          `
                                                        : html``}
                                                    </div>
                                                  `
                                                )},
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-tags-fill"></i>
                                            Tags
                                          </button>
                                        </div>
                                      `
                                    : html``}
                                `
                              : res.locals.conversation.taggings.map(
                                  (tagging) => html`
                                    <div class="text--teal">
                                      <i class="bi bi-tag-fill"></i>
                                      ${tagging.tag.name}
                                    </div>
                                  `
                                )}
                          </div>
                        `}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--tight button--tight--inline button--transparent"
                            oninteractive="${javascript`
                              this.addEventListener("click", () => {
                                this.closest(".conversation--header").querySelector(".conversation--header--full").hidden = true;
                                this.closest(".conversation--header").querySelector(".conversation--header--compact").hidden = false;
                              });
                            `}"
                          >
                            <i class="bi bi-chevron-bar-contract"></i>
                          </button>
                        `
                      : html``}
                  </div>
                </div>
              </div>

              $${(() => {
                const firstUnreadMessage = messages.find(
                  (message) => message.reading === null
                );
                const shouldScrollToMessage =
                  typeof req.query.messageReference === "string";
                const shouldScrollToFirstUnreadMessage =
                  !shouldScrollToMessage &&
                  firstUnreadMessage !== undefined &&
                  firstUnreadMessage !== messages[0];
                const shouldScrollToBottom =
                  !shouldScrollToMessage &&
                  !shouldScrollToFirstUnreadMessage &&
                  res.locals.conversation.type === "chat" &&
                  messages.length > 0 &&
                  afterMessage === undefined;
                const shouldScroll =
                  shouldScrollToMessage ||
                  shouldScrollToFirstUnreadMessage ||
                  shouldScrollToBottom;

                return html`
                  <div
                    class="${res.locals.localCSS(css`
                      ${shouldScroll
                        ? css`
                            /* TODO: Do something to prevent flash of unstyled content. visibility: hidden; */
                          `
                        : css``}
                      ${res.locals.conversation.type === "chat"
                        ? css`
                            flex: 1;
                            padding-right: var(--space--4);
                            padding-left: var(--space--4);
                            @media (min-width: 900px) {
                              padding-left: var(--space--8);
                            }
                            overflow: auto;
                            display: flex;
                            @media (max-width: 899px) {
                              justify-content: center;
                            }
                          `
                        : css``}
                    `)}"
                    oninteractive="${javascript`
                      ${
                        shouldScroll
                          ? javascript`
                              this.style.visibility = "visible";
                              ${
                                shouldScrollToBottom
                                  ? javascript`
                                      window.setTimeout(() => {
                                        this.scrollTop = this.scrollHeight;
                                        this.shouldScrollToBottomOnRefresh = true;
                                      }, 0);
                                    `
                                  : javascript``
                              }
                            `
                          : javascript``
                      }
                      this.addEventListener("scroll", () => {
                        this.shouldScrollToBottomOnRefresh = this.scrollTop === this.scrollHeight - this.offsetHeight;
                      });
                    `}"
                    onrefresh="${javascript`
                      if (this.shouldScrollToBottomOnRefresh) this.scrollTop = this.scrollHeight;
                    `}"
                  >
                    <div
                      class="${res.locals.localCSS(css`
                        ${res.locals.conversation.type === "chat"
                          ? css`
                              flex: 1;
                              min-width: var(--width--0);
                              max-width: var(--width--prose);
                            `
                          : css``}
                      `)}"
                    >
                      $${messages.length === 0
                        ? html`
                            <div
                              class="${res.locals.localCSS(css`
                                padding: var(--space--4) var(--space--0);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--4);
                                align-items: center;
                              `)}"
                            >
                              <div class="decorative-icon">
                                <i class="bi bi-chat-left-text"></i>
                              </div>
                              <p class="secondary">
                                ${FEATURE_PAGINATION &&
                                (afterMessage !== undefined ||
                                  beforeMessage !== undefined)
                                  ? "No more messages."
                                  : res.locals.conversation.type === "chat"
                                  ? "Start the chat by sending the first message!"
                                  : "All messages in this conversation have been deleted."}
                              </p>
                            </div>
                          `
                        : html`
                            <div
                              class="${res.locals.localCSS(css`
                                ${res.locals.conversation.type === "chat"
                                  ? css`
                                      padding: var(--space--4) var(--space--0);
                                    `
                                  : css``}
                              `)}"
                            >
                              $${FEATURE_PAGINATION &&
                              (afterMessage !== undefined ||
                                (moreMessagesExist && messagesReverse))
                                ? html`
                                    <div
                                      class="${res.locals.localCSS(css`
                                        display: flex;
                                        justify-content: center;
                                      `)}"
                                    >
                                      <a
                                        href="${app.locals.options.baseURL}/courses/${res.locals
                                          .course.reference}/conversations/${res
                                          .locals.conversation
                                          .reference}${qs.stringify(
                                          lodash.omit(
                                            {
                                              ...req.query,
                                              beforeMessageReference:
                                                messages[0].reference,
                                            },
                                            [
                                              "conversationLayoutSidebarOpenOnSmallScreen",
                                              "afterMessageReference",
                                            ]
                                          ),
                                          {
                                            addQueryPrefix: true,
                                          }
                                        )}"
                                        class="button button--transparent"
                                      >
                                        <i class="bi bi-arrow-up"></i>
                                        Load Previous Messages
                                      </a>
                                    </div>
                                  `
                                : html``}
                              $${messages.map(
                                (message) =>
                                  html`
                                    <div
                                      id="message--${message.reference}"
                                      data-content-source="${JSON.stringify(
                                        message.contentSource
                                      )}"
                                      class="message ${res.locals.localCSS(css`
                                        ${res.locals.conversation.type ===
                                        "chat"
                                          ? css``
                                          : css`
                                              border-bottom: var(
                                                  --border-width--4
                                                )
                                                solid
                                                var(--color--gray--medium--200);
                                              @media (prefers-color-scheme: dark) {
                                                border-color: var(
                                                  --color--gray--medium--700
                                                );
                                              }
                                            `}
                                      `)}"
                                      oninteractive="${javascript`
                                        ${
                                          (shouldScrollToMessage &&
                                            req.query.messageReference ===
                                              message.reference) ||
                                          (shouldScrollToFirstUnreadMessage &&
                                            message === firstUnreadMessage)
                                            ? javascript`
                                                window.setTimeout(() => { this.scrollIntoView(); }, 0);
                                              `
                                            : javascript``
                                        }
                                      `}"
                                    >
                                      $${message === firstUnreadMessage &&
                                      message !== messages[0]
                                        ? html`
                                            <button
                                              class="message--new-separator button button--transparent ${res
                                                .locals.localCSS(css`
                                                width: calc(
                                                  var(--space--2) + 100% +
                                                    var(--space--2)
                                                );
                                                padding: var(--space--1-5)
                                                  var(--space--2);
                                                margin: var(--space--0)
                                                  var(--space---2);
                                                display: flex;
                                                gap: var(--space--4);
                                                align-items: center;
                                              `)}"
                                              oninteractive="${javascript`
                                                tippy(this, {
                                                  touch: false,
                                                  content: "Close",
                                                });
                                                this.addEventListener("click", () => {
                                                  this.remove();
                                                });
                                              `}"
                                              onnodeadded="${javascript`
                                                if (document.querySelectorAll(".message--new-separator").length > 1) this.remove();
                                              `}"
                                              onbeforenodediscarded="${javascript`
                                                return false;
                                              `}"
                                            >
                                              <hr
                                                class="separator ${res.locals
                                                  .localCSS(css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `)}"
                                              />
                                              <span class="heading text--rose">
                                                New
                                              </span>
                                              <hr
                                                class="separator ${res.locals
                                                  .localCSS(css`
                                                  flex: 1;
                                                  border-color: var(
                                                    --color--rose--600
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    border-color: var(
                                                      --color--rose--500
                                                    );
                                                  }
                                                `)}"
                                              />
                                            </button>
                                          `
                                        : html``}
                                      $${res.locals.conversation.type === "chat"
                                        ? html`
                                            <div
                                              hidden
                                              class="message--date-separator ${res
                                                .locals.localCSS(css`
                                                margin: var(--space--2)
                                                  var(--space--0);
                                                display: flex;
                                                gap: var(--space--4);
                                                align-items: center;
                                              `)}"
                                              onbeforeelupdated="${javascript`
                                                return false;
                                              `}"
                                            >
                                              <hr
                                                class="separator ${res.locals
                                                  .localCSS(css`
                                                  flex: 1;
                                                `)}"
                                              />
                                              <time
                                                datetime="${new Date(
                                                  message.createdAt
                                                ).toISOString()}"
                                                class="heading secondary"
                                                oninteractive="${javascript`
                                                  const element = this;
                                                  leafac.relativizeDateElement(element);
                                                  (function update() {
                                                    const dateSeparators = [...document.querySelectorAll(".message--date-separator")];
                                                    const thisDateSeparator = element.closest(".message--date-separator");
                                                    const thisDateSeparatorIndex = dateSeparators.indexOf(thisDateSeparator);
                                                    const previousDateSeparator = thisDateSeparatorIndex <= 0 ? undefined : dateSeparators[thisDateSeparatorIndex - 1];
                                                    thisDateSeparator.hidden = previousDateSeparator !== undefined && previousDateSeparator.textContent === thisDateSeparator.textContent;
                                                    window.setTimeout(update, 60 * 1000);
                                                  })();
                                                `}"
                                              ></time>
                                              <hr
                                                class="separator ${res.locals
                                                  .localCSS(css`
                                                  flex: 1;
                                                `)}"
                                              />
                                            </div>
                                          `
                                        : html``}

                                      <div
                                        class="${res.locals.localCSS(css`
                                          padding: var(--space--2);
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css``
                                            : css`
                                                padding-bottom: var(--space--4);
                                              `}
                                          border-radius: var(--border-radius--lg);
                                          margin: var(--space--0)
                                            var(--space---2);
                                          display: flex;
                                          flex-direction: column;
                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css`
                                                gap: var(--space--1);
                                              `
                                            : css`
                                                gap: var(--space--2);
                                              `}

                                          ${shouldScrollToMessage &&
                                          req.query.messageReference ===
                                            message.reference
                                            ? css`
                                                --color--message--highlight-background-on-target: var(
                                                  --color--amber--200
                                                );
                                                @media (prefers-color-scheme: dark) {
                                                  --color--message--highlight-background-on-target: var(
                                                    --color--amber--900
                                                  );
                                                }
                                                @keyframes message--highlight-background-on-target {
                                                  from {
                                                    background-color: var(
                                                      --color--message--highlight-background-on-target
                                                    );
                                                  }
                                                  to {
                                                    background-color: transparent;
                                                  }
                                                }
                                                animation: message--highlight-background-on-target
                                                  2s
                                                  var(
                                                    --transition-timing-function--in-out
                                                  );
                                              `
                                            : css``}
                                         

                                          ${res.locals.conversation.type ===
                                          "chat"
                                            ? css`
                                                transition-property: var(
                                                  --transition-property--colors
                                                );
                                                transition-duration: var(
                                                  --transition-duration--150
                                                );
                                                transition-timing-function: var(
                                                  --transition-timing-function--in-out
                                                );
                                                &:hover,
                                                &:focus-within {
                                                  background-color: var(
                                                    --color--gray--medium--100
                                                  );
                                                  @media (prefers-color-scheme: dark) {
                                                    background-color: var(
                                                      --color--gray--medium--800
                                                    );
                                                  }
                                                }
                                              `
                                            : css``}
                                        `)}"
                                      >
                                        $${(() => {
                                          const actions = html`
                                            <div>
                                              <button
                                                class="button button--tight button--tight--inline button--transparent secondary ${res
                                                  .locals.localCSS(css`
                                                  font-size: var(
                                                    --font-size--xs
                                                  );
                                                  line-height: var(
                                                    --line-height--xs
                                                  );
                                                  ${res.locals.conversation
                                                    .type === "chat"
                                                    ? css`
                                                        transition-property: var(
                                                          --transition-property--opacity
                                                        );
                                                        transition-duration: var(
                                                          --transition-duration--150
                                                        );
                                                        transition-timing-function: var(
                                                          --transition-timing-function--in-out
                                                        );
                                                        .message:not(:hover, :focus-within)
                                                          & {
                                                          opacity: var(
                                                            --opacity--0
                                                          );
                                                        }
                                                      `
                                                    : css``}
                                                `)}"
                                                oninteractive="${javascript`
                                                  tippy(this, {
                                                    touch: false,
                                                    content: "Actions",
                                                  });
                                                  tippy(this, {
                                                    trigger: "click",
                                                    interactive: true,
                                                    content: ${res.locals.HTMLForJavaScript(
                                                      html`
                                                        <h3 class="heading">
                                                          <i
                                                            class="bi bi-chat-left-text"
                                                          ></i>
                                                          Message
                                                          #${res.locals
                                                            .conversation
                                                            .reference}/${message.reference}
                                                        </h3>
                                                        <div
                                                          class="dropdown--menu"
                                                        >
                                                          $${res.locals
                                                            .conversation
                                                            .type === "chat" &&
                                                          message.likes
                                                            .length === 0
                                                            ? html`
                                                                <form
                                                                  method="POST"
                                                                  action="${app.locals.options.baseURL}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}/likes"
                                                                  oninteractive="${javascript`
                                                                    this.addEventListener("submit", () => {
                                                                      tippy.hideAll();
                                                                      window.setTimeout(() => { this.remove(); }, 0);
                                                                    });
                                                                  `}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                  >
                                                                    <i
                                                                      class="bi bi-hand-thumbs-up"
                                                                    ></i>
                                                                    Like
                                                                  </button>
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment.role ===
                                                            "staff" &&
                                                          res.locals
                                                            .conversation
                                                            .type === "chat"
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  oninteractive="${javascript`
                                                                    const tooltip = ${res
                                                                      .locals
                                                                      .HTMLForJavaScript(html`
                                                                      <div
                                                                        class="loading ${res.locals.localCSS(
                                                                          css`
                                                                            display: flex;
                                                                            gap: var(
                                                                              --space--2
                                                                            );
                                                                            align-items: center;
                                                                          `
                                                                        )}"
                                                                      >
                                                                        $${spinner(
                                                                          {
                                                                            req,
                                                                            res,
                                                                          }
                                                                        )}
                                                                        Loading…
                                                                      </div>
                                                                      <div
                                                                        class="content"
                                                                        hidden
                                                                      ></div>
                                                                    `)};
                                                                    const loading = tooltip.querySelector(".loading");
                                                                    const content = tooltip.querySelector(".content");

                                                                    tippy(this, {
                                                                      trigger: "click",
                                                                      interactive: true,
                                                                      content: tooltip,
                                                                    });

                                                                    const load = async () => {
                                                                      if (!content.hidden) return;
                                                                      leafac.mount(
                                                                        content,
                                                                        await (await fetch("${app.locals.options.baseURL}/courses/${
                                                                    res.locals
                                                                      .course
                                                                      .reference
                                                                  }/conversations/${
                                                                    res.locals
                                                                      .conversation
                                                                      .reference
                                                                  }/messages/${
                                                                    message.reference
                                                                  }/views")).text()
                                                                      );
                                                                      loading.hidden = true;
                                                                      content.hidden = false;
                                                                    };

                                                                    this.addEventListener("mouseover", load);
                                                                    this.addEventListener("focus", load);
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-eye"
                                                                  ></i>
                                                                  ${message.readings.length.toString()}
                                                                  Views
                                                                </button>
                                                              `
                                                            : html``}

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            oninteractive="${javascript`
                                                              this.addEventListener("click", () => {
                                                                const content = JSON.parse(this.closest("[data-content-source]").dataset.contentSource);
                                                                const newMessage = document.querySelector(".new-message");
                                                                newMessage.querySelector(".content-editor--button--write").click();
                                                                const element = newMessage.querySelector(".content-editor--write--textarea");
                                                                textFieldEdit.wrapSelection(
                                                                  element,
                                                                  ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                    message.authorEnrollment ===
                                                                    "no-longer-enrolled"
                                                                      ? javascript``
                                                                      : javascript`
                                                                        "@${
                                                                          message.anonymousAt ===
                                                                          null
                                                                            ? `${
                                                                                message
                                                                                  .authorEnrollment
                                                                                  .reference
                                                                              }--${slugify(
                                                                                message
                                                                                  .authorEnrollment
                                                                                  .user
                                                                                  .name
                                                                              )}`
                                                                            : `anonymous`
                                                                        } · " +
                                                                      `
                                                                  } "#" + ${JSON.stringify(
                                                              res.locals
                                                                .conversation
                                                                .reference
                                                            )} + "/" + ${JSON.stringify(
                                                              message.reference
                                                            )} + "\\n>\\n> " + content.replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                                  ""
                                                                );
                                                                element.focus();
                                                                tippy.hideAll();
                                                              });
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-reply"
                                                            ></i>
                                                            Reply
                                                          </button>

                                                          <button
                                                            class="dropdown--menu--item button button--transparent"
                                                            oninteractive="${javascript`
                                                              this.copied = tippy(this, {
                                                                theme: "green",
                                                                trigger: "manual",
                                                                content: "Copied",
                                                              });
                                                              this.addEventListener("click", async () => {
                                                                await navigator.clipboard.writeText("${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${message.reference}");
                                                                this.copied.show();
                                                                await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                                                this.copied.hide();
                                                              });                                                            
                                                            `}"
                                                          >
                                                            <i
                                                              class="bi bi-link"
                                                            ></i>
                                                            Copy Message
                                                            Permanent Link
                                                          </button>

                                                          $${message.authorEnrollment !==
                                                            "no-longer-enrolled" &&
                                                          message
                                                            .authorEnrollment
                                                            .id ===
                                                            res.locals
                                                              .enrollment.id &&
                                                          res.locals.enrollment
                                                            .role ===
                                                            "student" &&
                                                          res.locals
                                                            .conversation
                                                            .staffOnlyAt ===
                                                            null
                                                            ? html`
                                                                <form
                                                                  method="POST"
                                                                  action="${app.locals.options.baseURL}/courses/${res
                                                                    .locals
                                                                    .course
                                                                    .reference}/conversations/${res
                                                                    .locals
                                                                    .conversation
                                                                    .reference}/messages/${message.reference}?_method=PATCH"
                                                                  class="dropdown--menu"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  $${message.anonymousAt ===
                                                                  null
                                                                    ? html`
                                                                        <input
                                                                          type="hidden"
                                                                          name="isAnonymous"
                                                                          value="true"
                                                                        />
                                                                        <button
                                                                          class="dropdown--menu--item button button--transparent"
                                                                        >
                                                                          <span
                                                                            class="${res
                                                                              .locals
                                                                              .localCSS(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${userPartial(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Anonymous
                                                                          to
                                                                          Other
                                                                          Students
                                                                        </button>
                                                                      `
                                                                    : html`
                                                                        <input
                                                                          type="hidden"
                                                                          name="isAnonymous"
                                                                          value="false"
                                                                        />
                                                                        <button
                                                                          class="dropdown--menu--item button button--transparent"
                                                                        >
                                                                          <span
                                                                            class="${res
                                                                              .locals
                                                                              .localCSS(css`
                                                                              margin-left: var(
                                                                                --space---0-5
                                                                              );
                                                                            `)}"
                                                                          >
                                                                            $${userPartial(
                                                                              {
                                                                                req,
                                                                                res,
                                                                                user: res
                                                                                  .locals
                                                                                  .user,
                                                                                decorate:
                                                                                  false,
                                                                                name: false,
                                                                                size: "xs",
                                                                              }
                                                                            )}
                                                                          </span>
                                                                          Set as
                                                                          Signed
                                                                          by You
                                                                        </button>
                                                                      `}
                                                                </form>
                                                              `
                                                            : html``}
                                                          $${mayEditMessage({
                                                            req,
                                                            res,
                                                            message,
                                                          })
                                                            ? html`
                                                                <button
                                                                  class="dropdown--menu--item button button--transparent"
                                                                  oninteractive="${javascript`
                                                                    this.addEventListener("click", () => {
                                                                      this.closest(".message").querySelector(".message--show").hidden = true;
                                                                      this.closest(".message").querySelector(".message--edit").hidden = false;
                                                                      autosize.update(this.closest(".message").querySelector(".message--edit .content-editor--write--textarea"));
                                                                      tippy.hideAll();
                                                                    });
                                                                  `}"
                                                                >
                                                                  <i
                                                                    class="bi bi-pencil"
                                                                  ></i>
                                                                  Edit Message
                                                                </button>
                                                              `
                                                            : html``}
                                                          $${res.locals
                                                            .enrollment.role ===
                                                          "staff"
                                                            ? html`
                                                                <div>
                                                                  <button
                                                                    class="dropdown--menu--item button button--transparent"
                                                                    oninteractive="${javascript`
                                                                      tippy(this, {
                                                                        theme: "rose",
                                                                        trigger: "click",
                                                                        interactive: true,
                                                                        content: ${res.locals.HTMLForJavaScript(
                                                                          html`
                                                                            <form
                                                                              method="POST"
                                                                              action="${app.locals.options.baseURL}/courses/${res
                                                                                .locals
                                                                                .course
                                                                                .reference}/conversations/${res
                                                                                .locals
                                                                                .conversation
                                                                                .reference}/messages/${message.reference}?_method=DELETE"
                                                                              class="${res
                                                                                .locals
                                                                                .localCSS(css`
                                                                                padding: var(
                                                                                  --space--2
                                                                                );
                                                                                display: flex;
                                                                                flex-direction: column;
                                                                                gap: var(
                                                                                  --space--4
                                                                                );
                                                                              `)}"
                                                                            >
                                                                              <input
                                                                                type="hidden"
                                                                                name="_csrf"
                                                                                value="${req.csrfToken()}"
                                                                              />
                                                                              <p>
                                                                                Are
                                                                                you
                                                                                sure
                                                                                you
                                                                                want
                                                                                to
                                                                                remove
                                                                                this
                                                                                message?
                                                                              </p>
                                                                              <p>
                                                                                <strong
                                                                                  class="${res
                                                                                    .locals
                                                                                    .localCSS(css`
                                                                                    font-weight: var(
                                                                                      --font-weight--bold
                                                                                    );
                                                                                  `)}"
                                                                                >
                                                                                  You
                                                                                  may
                                                                                  not
                                                                                  undo
                                                                                  this
                                                                                  action!
                                                                                </strong>
                                                                              </p>
                                                                              <button
                                                                                class="button button--rose"
                                                                              >
                                                                                <i
                                                                                  class="bi bi-trash"
                                                                                ></i>
                                                                                Remove
                                                                                Message
                                                                              </button>
                                                                            </form>
                                                                          `
                                                                        )},
                                                                      });
                                                                    `}"
                                                                  >
                                                                    <i
                                                                      class="bi bi-trash"
                                                                    ></i>
                                                                    Remove
                                                                    Message
                                                                  </button>
                                                                </div>
                                                              `
                                                            : html``}
                                                        </div>
                                                      `
                                                    )},
                                                  });
                                                `}"
                                              >
                                                <i
                                                  class="bi bi-three-dots-vertical"
                                                ></i>
                                              </button>
                                            </div>
                                          `;

                                          const headers: HTML[] = [];

                                          if (
                                            mayEditMessage({
                                              req,
                                              res,
                                              message,
                                            }) &&
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question"
                                          )
                                            headers.push(html`
                                              <form
                                                method="POST"
                                                action="${app.locals.options.baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}?_method=PATCH"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${message.answerAt === null
                                                  ? html`
                                                      <input
                                                        type="hidden"
                                                        name="isAnswer"
                                                        value="true"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: "Set as Answer",
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-patch-check"
                                                        ></i>
                                                        Not an Answer
                                                      </button>
                                                    `
                                                  : html`
                                                      <input
                                                        type="hidden"
                                                        name="isAnswer"
                                                        value="false"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--emerald"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: "Set as Not an Answer",
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-patch-check-fill"
                                                        ></i>
                                                        Answer
                                                      </button>
                                                    `}
                                              </form>
                                            `);
                                          else if (
                                            message.reference !== "1" &&
                                            res.locals.conversation.type ===
                                              "question" &&
                                            message.answerAt !== null
                                          )
                                            headers.push(html`
                                              <div class="text--emerald">
                                                <i
                                                  class="bi bi-patch-check-fill"
                                                ></i>
                                                Answer
                                              </div>
                                            `);

                                          if (
                                            mayEndorseMessage({
                                              req,
                                              res,
                                              message,
                                            })
                                          ) {
                                            const isEndorsed =
                                              message.endorsements.some(
                                                (endorsement) =>
                                                  endorsement.enrollment !==
                                                    "no-longer-enrolled" &&
                                                  endorsement.enrollment.id ===
                                                    res.locals.enrollment.id
                                              );

                                            headers.push(html`
                                              <form
                                                method="POST"
                                                action="${app.locals.options.baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}/endorsements${isEndorsed
                                                  ? "?_method=DELETE"
                                                  : ""}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${isEndorsed
                                                  ? html`
                                                      <input
                                                        type="hidden"
                                                        name="isEndorsed"
                                                        value="false"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--blue"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            touch: false,
                                                            content: ${JSON.stringify(
                                                              `Remove Endorsement${
                                                                message.endorsements.filter(
                                                                  (
                                                                    endorsement
                                                                  ) =>
                                                                    endorsement.enrollment !==
                                                                      "no-longer-enrolled" &&
                                                                    endorsement
                                                                      .enrollment
                                                                      .id !==
                                                                      res.locals
                                                                        .enrollment
                                                                        .id
                                                                ).length > 0
                                                                  ? ` (Also endorsed by ${
                                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                        Intl as any
                                                                      ).ListFormat(
                                                                        "en"
                                                                      ).format(
                                                                        message.endorsements.flatMap(
                                                                          (
                                                                            endorsement
                                                                          ) =>
                                                                            endorsement.enrollment !==
                                                                              "no-longer-enrolled" &&
                                                                            endorsement
                                                                              .enrollment
                                                                              .id !==
                                                                              res
                                                                                .locals
                                                                                .enrollment
                                                                                .id
                                                                              ? [
                                                                                  endorsement
                                                                                    .enrollment
                                                                                    .user
                                                                                    .name,
                                                                                ]
                                                                              : []
                                                                        )
                                                                      )
                                                                    })`
                                                                  : ``
                                                              }`
                                                            )},
                                                          });
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-award-fill"
                                                        ></i>
                                                        ${message.endorsements.length.toString()}
                                                        Staff
                                                        Endorsement${message
                                                          .endorsements
                                                          .length === 1
                                                          ? ""
                                                          : "s"}
                                                      </button>
                                                    `
                                                  : html`
                                                      <input
                                                        type="hidden"
                                                        name="isEndorsed"
                                                        value="true"
                                                      />
                                                      <button
                                                        class="button button--tight button--tight--inline button--tight-gap button--transparent text--lime"
                                                        $${message.endorsements.filter(
                                                          (endorsement) =>
                                                            endorsement.enrollment !==
                                                            "no-longer-enrolled"
                                                        ).length === 0
                                                          ? html``
                                                          : html`
                                                              oninteractive="${javascript`
                                                                tippy(this, {
                                                                  touch: false,
                                                                  content: ${JSON.stringify(
                                                                    `Endorse (Already endorsed by ${
                                                                      /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                        Intl as any
                                                                      ).ListFormat(
                                                                        "en"
                                                                      ).format(
                                                                        message.endorsements.flatMap(
                                                                          (
                                                                            endorsement
                                                                          ) =>
                                                                            endorsement.enrollment ===
                                                                            "no-longer-enrolled"
                                                                              ? []
                                                                              : [
                                                                                  endorsement
                                                                                    .enrollment
                                                                                    .user
                                                                                    .name,
                                                                                ]
                                                                        )
                                                                      )
                                                                    })`
                                                                  )},
                                                                });
                                                              `}"
                                                            `}
                                                      >
                                                        <i
                                                          class="bi bi-award"
                                                        ></i>
                                                        ${message.endorsements
                                                          .length === 0
                                                          ? `Endorse`
                                                          : `${
                                                              message
                                                                .endorsements
                                                                .length
                                                            }
                                                            Staff Endorsement${
                                                              message
                                                                .endorsements
                                                                .length === 1
                                                                ? ""
                                                                : "s"
                                                            }`}
                                                      </button>
                                                    `}
                                              </form>
                                            `);
                                          } else if (
                                            res.locals.conversation.type ===
                                              "question" &&
                                            (message.authorEnrollment ===
                                              "no-longer-enrolled" ||
                                              message.authorEnrollment.role !==
                                                "staff") &&
                                            message.endorsements.length > 0
                                          )
                                            headers.push(html`
                                              <div
                                                class="text--lime"
                                                oninteractive="${javascript`
                                                  ${
                                                    message.endorsements.filter(
                                                      (endorsement) =>
                                                        endorsement.enrollment !==
                                                        "no-longer-enrolled"
                                                    ).length > 0
                                                      ? javascript`
                                                          tippy(this, {
                                                            content: ${JSON.stringify(
                                                              `Endorsed by ${
                                                                /* FIXME: https://github.com/microsoft/TypeScript/issues/29129 */ new (
                                                                  Intl as any
                                                                ).ListFormat(
                                                                  "en"
                                                                ).format(
                                                                  message.endorsements.flatMap(
                                                                    (
                                                                      endorsement
                                                                    ) =>
                                                                      endorsement.enrollment ===
                                                                      "no-longer-enrolled"
                                                                        ? []
                                                                        : [
                                                                            endorsement
                                                                              .enrollment
                                                                              .user
                                                                              .name,
                                                                          ]
                                                                  )
                                                                )
                                                              }`
                                                            )},
                                                          });
                                                        `
                                                      : javascript``
                                                  }
                                                  
                                                `}"
                                              >
                                                <i class="bi bi-award"></i>
                                                ${message.endorsements.length.toString()}
                                                Staff
                                                Endorsement${message
                                                  .endorsements.length === 1
                                                  ? ""
                                                  : "s"}
                                              </div>
                                            `);

                                          return html`
                                            $${headers.length === 0
                                              ? html``
                                              : html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-size: var(
                                                        --font-size--xs
                                                      );
                                                      line-height: var(
                                                        --line-height--xs
                                                      );
                                                      display: flex;
                                                      gap: var(--space--4);
                                                    `)}"
                                                  >
                                                    <div
                                                      class="${res.locals
                                                        .localCSS(css`
                                                        flex: 1;
                                                        display: flex;
                                                        flex-wrap: wrap;
                                                        column-gap: var(
                                                          --space--8
                                                        );
                                                        row-gap: var(
                                                          --space--1
                                                        );
                                                        & > * {
                                                          display: flex;
                                                          gap: var(--space--1);
                                                        }
                                                      `)}"
                                                    >
                                                      $${headers}
                                                    </div>
                                                    $${actions}
                                                  </div>
                                                `}

                                            <div
                                              class="${res.locals.localCSS(css`
                                                display: flex;
                                                gap: var(--space--2);
                                              `)}"
                                            >
                                              <div
                                                class="secondary ${res.locals
                                                  .localCSS(css`
                                                  font-size: var(
                                                    --font-size--xs
                                                  );
                                                  line-height: var(
                                                    --line-height--xs
                                                  );
                                                  flex: 1;
                                                  display: flex;
                                                  flex-wrap: wrap;
                                                  align-items: baseline;
                                                  column-gap: var(--space--4);
                                                  row-gap: var(--space--2);
                                                `)}"
                                              >
                                                <div
                                                  class="strong ${res.locals
                                                    .localCSS(css`
                                                    font-size: var(
                                                      --font-size--sm
                                                    );
                                                    line-height: var(
                                                      --line-height--sm
                                                    );
                                                  `)}"
                                                >
                                                  $${userPartial({
                                                    req,
                                                    res,
                                                    enrollment:
                                                      message.authorEnrollment,
                                                    anonymous:
                                                      message.anonymousAt ===
                                                      null
                                                        ? false
                                                        : res.locals.enrollment
                                                            .role === "staff" ||
                                                          (message.authorEnrollment !==
                                                            "no-longer-enrolled" &&
                                                            message
                                                              .authorEnrollment
                                                              .id ===
                                                              res.locals
                                                                .enrollment.id)
                                                        ? "reveal"
                                                        : true,
                                                    name:
                                                      message.authorEnrollment ===
                                                      "no-longer-enrolled"
                                                        ? undefined
                                                        : highlightSearchResult(
                                                            html`${message
                                                              .authorEnrollment
                                                              .user.name}`,
                                                            req.query.search
                                                          ),
                                                  })}
                                                </div>

                                                <time
                                                  datetime="${new Date(
                                                    message.createdAt
                                                  ).toISOString()}"
                                                  oninteractive="${javascript`
                                                    leafac.relativizeDateTimeElement(this, { capitalize: true });
                                                  `}"
                                                  onbeforeelchildrenupdated="${javascript`
                                                    return false;
                                                  `}"
                                                ></time>

                                                $${message.updatedAt !== null
                                                  ? html`
                                                      <div>
                                                        Updated
                                                        <time
                                                          datetime="${new Date(
                                                            message.updatedAt
                                                          ).toISOString()}"
                                                          oninteractive="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                          `}"
                                                          onbeforeelchildrenupdated="${javascript`
                                                            return false;
                                                          `}"
                                                        ></time>
                                                      </div>
                                                    `
                                                  : html``}
                                              </div>

                                              $${headers.length === 0
                                                ? actions
                                                : html``}
                                            </div>
                                          `;
                                        })()}

                                        <div
                                          class="message--show ${res.locals
                                            .localCSS(css`
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--2);
                                          `)}"
                                          onbeforeelupdated="${javascript`
                                            this.wasHidden = this.hidden;
                                          `}"
                                          onelupdated="${javascript`
                                            this.hidden = this.wasHidden;
                                          `}"
                                        >
                                          <div
                                            class="message--show--content-area ${res
                                              .locals.localCSS(css`
                                              position: relative;
                                            `)}"
                                          >
                                            <div
                                              class="message--show--content-area--dropdown-menu-target ${res
                                                .locals.localCSS(css`
                                                width: var(--space--0);
                                                height: var(--line-height--sm);
                                                position: absolute;
                                              `)}"
                                            ></div>
                                            <div
                                              class="message--show--content-area--content"
                                              oninteractive="${javascript`
                                                const dropdownMenuTarget = this.closest(".message--show--content-area").querySelector(".message--show--content-area--dropdown-menu-target");
                                                const dropdownMenu = tippy(dropdownMenuTarget, {
                                                  trigger: "manual",
                                                  interactive: true,
                                                  content: ${res.locals.HTMLForJavaScript(
                                                    html`
                                                      <div
                                                        class="dropdown--menu"
                                                      >
                                                        <button
                                                          class="dropdown--menu--item button button--transparent"
                                                          oninteractive="${javascript`
                                                            this.addEventListener("click", () => {
                                                              tippy.hideAll();
                                                              const selection = window.getSelection();
                                                              const anchorElement = leafac.ancestors(selection.anchorNode).findLast(element => element?.dataset?.position !== undefined);
                                                              const focusElement = leafac.ancestors(selection.focusNode).findLast(element => element?.dataset?.position !== undefined);
                                                              const contentElement = this.closest(".message--show--content-area").querySelector(".message--show--content-area--content");
                                                              if (
                                                                selection.isCollapsed ||
                                                                anchorElement === undefined ||
                                                                focusElement === undefined ||
                                                                !contentElement.contains(anchorElement) ||
                                                                !contentElement.contains(focusElement)
                                                              ) return;
                                                              const anchorPosition = JSON.parse(anchorElement.dataset.position);
                                                              const focusPosition = JSON.parse(focusElement.dataset.position);
                                                              const start = Math.min(anchorPosition.start.offset, focusPosition.start.offset);
                                                              const end = Math.max(anchorPosition.end.offset, focusPosition.end.offset);
                                                              const content = JSON.parse(anchorElement.closest("[data-content-source]").dataset.contentSource);
                                                              const newMessage = document.querySelector(".new-message");
                                                              newMessage.querySelector(".content-editor--button--write").click();
                                                              const element = newMessage.querySelector(".content-editor--write--textarea");
                                                              textFieldEdit.wrapSelection(
                                                                element,
                                                                ((element.selectionStart > 0) ? "\\n\\n" : "") + "> " + ${
                                                                  message.authorEnrollment ===
                                                                  "no-longer-enrolled"
                                                                    ? javascript``
                                                                    : javascript`
                                                                      "@${
                                                                        message.anonymousAt ===
                                                                        null
                                                                          ? `${
                                                                              message
                                                                                .authorEnrollment
                                                                                .reference
                                                                            }--${slugify(
                                                                              message
                                                                                .authorEnrollment
                                                                                .user
                                                                                .name
                                                                            )}`
                                                                          : `anonymous`
                                                                      } · " +
                                                                    `
                                                                } "#" + ${JSON.stringify(
                                                            res.locals
                                                              .conversation
                                                              .reference
                                                          )} + "/" + ${JSON.stringify(
                                                            message.reference
                                                          )} + "\\n>\\n> " + content.slice(start, end).replaceAll("\\n", "\\n> ") + "\\n\\n",
                                                                ""
                                                              );
                                                              element.focus();
                                                            });
                                                          `}"
                                                        >
                                                          <i
                                                            class="bi bi-chat-left-quote"
                                                          ></i>
                                                          Quote
                                                        </button>
                                                      </div>
                                                    `
                                                  )},
                                                });
                                                this.addEventListener("mouseup", (event) => {
                                                  window.setTimeout(() => {
                                                    const selection = window.getSelection();
                                                    const anchorElement = leafac.ancestors(selection.anchorNode).findLast(element => element?.dataset?.position !== undefined);
                                                    const focusElement = leafac.ancestors(selection.focusNode).findLast(element => element?.dataset?.position !== undefined);
                                                    if (
                                                      selection.isCollapsed ||
                                                      anchorElement === undefined ||
                                                      focusElement === undefined ||
                                                      !this.contains(anchorElement) ||
                                                      !this.contains(focusElement)
                                                    ) return;
                                                    dropdownMenuTarget.style.top = String(event.layerY) + "px";
                                                    dropdownMenuTarget.style.left = String(event.layerX) + "px";
                                                    dropdownMenu.show();
                                                  }, 0);
                                                });
                                              `}"
                                            >
                                              $${processContent({
                                                req,
                                                res,
                                                type: "preprocessed",
                                                content:
                                                  message.contentPreprocessed,
                                                decorate: true,
                                                search: req.query.search,
                                              }).processed}
                                            </div>
                                          </div>

                                          $${(() => {
                                            const content: HTML[] = [];

                                            const isLiked = message.likes.some(
                                              (like) =>
                                                like.enrollment !==
                                                  "no-longer-enrolled" &&
                                                like.enrollment.id ===
                                                  res.locals.enrollment.id
                                            );
                                            const likesCount =
                                              message.likes.length;
                                            if (
                                              res.locals.conversation.type !==
                                                "chat" ||
                                              likesCount > 0
                                            )
                                              content.push(
                                                html`
                                                  <form
                                                    method="POST"
                                                    action="${app.locals.options.baseURL}/courses/${res
                                                      .locals.course
                                                      .reference}/conversations/${res
                                                      .locals.conversation
                                                      .reference}/messages/${message.reference}/likes${isLiked
                                                      ? "?_method=DELETE"
                                                      : ""}"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="_csrf"
                                                      value="${req.csrfToken()}"
                                                    />
                                                    <button
                                                      class="button button--tight button--tight--inline button--tight-gap button--transparent ${isLiked
                                                        ? "text--blue"
                                                        : ""}"
                                                      $${likesCount === 0
                                                        ? html``
                                                        : html`
                                                            oninteractive="${javascript`
                                                              tippy(this, {
                                                                touch: false,
                                                                content: ${JSON.stringify(
                                                                  isLiked
                                                                    ? "Remove Like"
                                                                    : "Like"
                                                                )},
                                                              });
                                                            `}"
                                                          `}
                                                    >
                                                      $${isLiked
                                                        ? html`
                                                            <i
                                                              class="bi bi-hand-thumbs-up-fill"
                                                            ></i>
                                                          `
                                                        : html`<i
                                                            class="bi bi-hand-thumbs-up"
                                                          ></i>`}
                                                      $${likesCount === 0
                                                        ? html`Like`
                                                        : html`
                                                            ${likesCount.toString()}
                                                            Like${likesCount ===
                                                            1
                                                              ? ""
                                                              : "s"}
                                                          `}
                                                    </button>
                                                  </form>
                                                `
                                              );

                                            if (
                                              res.locals.enrollment.role ===
                                                "staff" &&
                                              res.locals.conversation.type !==
                                                "chat"
                                            )
                                              content.push(html`
                                                <button
                                                  class="button button--tight button--tight--inline button--tight-gap button--transparent"
                                                  oninteractive="${javascript`
                                                    const tooltip = ${res.locals
                                                      .HTMLForJavaScript(html`
                                                      <div
                                                        class="loading ${res.locals.localCSS(
                                                          css`
                                                            display: flex;
                                                            gap: var(
                                                              --space--2
                                                            );
                                                            align-items: center;
                                                          `
                                                        )}"
                                                      >
                                                        $${spinner({
                                                          req,
                                                          res,
                                                        })}
                                                        Loading…
                                                      </div>
                                                      <div
                                                        class="content"
                                                        hidden
                                                      ></div>
                                                    `)};
                                                    const loading = tooltip.querySelector(".loading");
                                                    const content = tooltip.querySelector(".content");

                                                    tippy(this, {
                                                      trigger: "click",
                                                      interactive: true,
                                                      content: tooltip,
                                                    });

                                                    const load = async () => {
                                                      if (!content.hidden) return;
                                                      leafac.mount(
                                                        content,
                                                        await (await fetch("${app.locals.options.baseURL}/courses/${
                                                    res.locals.course.reference
                                                  }/conversations/${
                                                    res.locals.conversation
                                                      .reference
                                                  }/messages/${
                                                    message.reference
                                                  }/views")).text()
                                                      );
                                                      loading.hidden = true;
                                                      content.hidden = false;
                                                    };

                                                    this.addEventListener("mouseover", load);
                                                    this.addEventListener("focus", load);
                                                  `}"
                                                >
                                                  <i class="bi bi-eye"></i>
                                                  ${message.readings.length.toString()}
                                                  Views
                                                </button>
                                              `);

                                            return content.length === 0
                                              ? html``
                                              : html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
                                                      font-size: var(
                                                        --font-size--xs
                                                      );
                                                      line-height: var(
                                                        --line-height--xs
                                                      );
                                                      display: flex;
                                                      flex-wrap: wrap;
                                                      column-gap: var(
                                                        --space--8
                                                      );
                                                      row-gap: var(--space--1);
                                                    `)}"
                                                  >
                                                    $${content}
                                                  </div>
                                                `;
                                          })()}
                                        </div>

                                        $${mayEditMessage({ req, res, message })
                                          ? html`
                                              <form
                                                method="POST"
                                                action="${app.locals.options.baseURL}/courses/${res
                                                  .locals.course
                                                  .reference}/conversations/${res
                                                  .locals.conversation
                                                  .reference}/messages/${message.reference}?_method=PATCH"
                                                novalidate
                                                hidden
                                                class="message--edit ${res
                                                  .locals.localCSS(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                                onbeforeelupdated="${javascript`
                                                  this.wasHidden = this.hidden;
                                                `}"
                                                onelupdated="${javascript`
                                                  this.hidden = this.wasHidden;
                                                `}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                $${contentEditor({
                                                  req,
                                                  res,
                                                  contentSource:
                                                    message.contentSource,
                                                  compact:
                                                    res.locals.conversation
                                                      .type === "chat",
                                                })}

                                                <div
                                                  class="${res.locals
                                                    .localCSS(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    @media (max-width: 400px) {
                                                      flex-direction: column;
                                                    }
                                                  `)}"
                                                >
                                                  <button
                                                    class="button button--blue"
                                                    oninteractive="${javascript`
                                                      Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                                                      tippy(this, {
                                                        touch: false,
                                                        content: ${res.locals.HTMLForJavaScript(
                                                          html`
                                                            <span
                                                              class="keyboard-shortcut"
                                                            >
                                                              <span
                                                                oninteractive="${javascript`
                                                                    this.hidden = leafac.isAppleDevice;
                                                                  `}"
                                                                >Ctrl+Enter</span
                                                              ><span
                                                                class="keyboard-shortcut--cluster"
                                                                oninteractive="${javascript`
                                                                    this.hidden = !leafac.isAppleDevice;
                                                                  `}"
                                                                ><i
                                                                  class="bi bi-command"
                                                                ></i
                                                                ><i
                                                                  class="bi bi-arrow-return-left"
                                                                ></i
                                                              ></span>
                                                            </span>
                                                          `
                                                        )},
                                                      });
                                                    `}"
                                                  >
                                                    <i class="bi bi-pencil"></i>
                                                    Update Message
                                                  </button>
                                                  <button
                                                    type="reset"
                                                    class="button button--transparent"
                                                    oninteractive="${javascript`
                                                      this.addEventListener("click", () => {
                                                        this.closest(".message").querySelector(".message--show").hidden = false;
                                                        this.closest(".message").querySelector(".message--edit").hidden = true;
                                                      });
                                                    `}"
                                                  >
                                                    <i class="bi bi-x-lg"></i>
                                                    Cancel
                                                  </button>
                                                </div>
                                              </form>
                                            `
                                          : html``}
                                      </div>
                                    </div>
                                  `
                              )}
                              $${FEATURE_PAGINATION &&
                              (beforeMessage !== undefined ||
                                (moreMessagesExist && !messagesReverse))
                                ? html`
                                    <div
                                      class="${res.locals.localCSS(css`
                                        display: flex;
                                        justify-content: center;
                                      `)}"
                                    >
                                      <a
                                        href="${app.locals.options.baseURL}/courses/${res.locals
                                          .course.reference}/conversations/${res
                                          .locals.conversation
                                          .reference}${qs.stringify(
                                          lodash.omit(
                                            {
                                              ...req.query,
                                              afterMessageReference:
                                                messages[messages.length - 1]
                                                  .reference,
                                            },
                                            [
                                              "conversationLayoutSidebarOpenOnSmallScreen",
                                              "beforeMessageReference",
                                            ]
                                          ),
                                          {
                                            addQueryPrefix: true,
                                          }
                                        )}"
                                        class="button button--transparent"
                                      >
                                        <i class="bi bi-arrow-down"></i>
                                        Load Next Messages
                                      </a>
                                    </div>
                                  `
                                : html``}
                            </div>
                          `}
                    </div>
                  </div>
                `;
              })()}

              <form
                method="POST"
                action="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/conversations/${res.locals.conversation
                  .reference}/messages"
                novalidate
                class="${res.locals.localCSS(css`
                  ${res.locals.conversation.type === "chat"
                    ? css`
                        padding-right: var(--space--4);
                        padding-bottom: var(--space--4);
                        padding-left: var(--space--4);
                        @media (min-width: 900px) {
                          padding-left: var(--space--8);
                        }
                        display: flex;
                        @media (max-width: 899px) {
                          justify-content: center;
                        }
                      `
                    : css`
                        padding-top: var(--space--4);
                      `}
                `)}"
              >
                <div
                  class="${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    ${res.locals.conversation.type === "chat"
                      ? css`
                          gap: var(--space--2);
                          flex: 1;
                          min-width: var(--width--0);
                          max-width: var(--width--prose);
                        `
                      : css`
                          gap: var(--space--4);
                        `}
                  `)}"
                >
                  <input
                    type="hidden"
                    name="_csrf"
                    value="${req.csrfToken()}"
                  />

                  $${res.locals.conversation.type === "question"
                    ? html`
                        <div class="label">
                          <p class="label--text">Type</p>
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnswer"
                                $${res.locals.enrollment.role === "staff"
                                  ? `checked`
                                  : ``}
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check"></i>
                                Not an Answer
                              </span>
                              <span
                                class="text--emerald"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Not an Answer",
                                  });
                                `}"
                              >
                                <i class="bi bi-patch-check-fill"></i>
                                Answer
                              </span>
                            </label>
                          </div>
                        </div>
                      `
                    : html``}

                  <div
                    class="new-message ${res.locals.localCSS(css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }

                      ${res.locals.conversation.type === "chat"
                        ? css`
                            textarea {
                              padding-right: var(--space--8);
                            }
                          `
                        : css``}
                    `)}"
                    oninteractive="${javascript`
                      leafac.saveFormInputValue(this.querySelector(".content-editor--write--textarea"), "new-message");
                    `}"
                  >
                    $${contentEditor({
                      req,
                      res,
                      compact: res.locals.conversation.type === "chat",
                    })}
                    $${res.locals.conversation.type === "chat"
                      ? html`
                          <button
                            class="button button--blue ${res.locals
                              .localCSS(css`
                              position: relative;
                              place-self: end;
                              width: var(--font-size--2xl);
                              height: var(--font-size--2xl);
                              padding: var(--space--0);
                              border-radius: var(--border-radius--circle);
                              margin: var(--space--1);
                              align-items: center;
                            `)}"
                            oninteractive="${javascript`
                              tippy(this, {
                                touch: false,
                                content: ${res.locals.HTMLForJavaScript(
                                  html`
                                    Send Message
                                    <span class="keyboard-shortcut">
                                      <span
                                        oninteractive="${javascript`
                                          this.hidden = leafac.isAppleDevice;
                                        `}"
                                        >Ctrl+Enter</span
                                      ><span
                                        class="keyboard-shortcut--cluster"
                                        oninteractive="${javascript`
                                          this.hidden = !leafac.isAppleDevice;
                                        `}"
                                        ><i class="bi bi-command"></i
                                        ><i class="bi bi-arrow-return-left"></i
                                      ></span>
                                    </span>
                                  `
                                )},
                              });
                            `}"
                          >
                            <i
                              class="bi bi-send ${res.locals.localCSS(css`
                                position: relative;
                                top: var(--space--px);
                                right: var(--space--px);
                              `)}"
                            ></i>
                          </button>
                        `
                      : html``}
                  </div>

                  $${res.locals.enrollment.role === "staff" ||
                  res.locals.conversation.staffOnlyAt !== null
                    ? html``
                    : html`
                        <div class="label">
                          $${res.locals.conversation.type === "chat"
                            ? html``
                            : html`<p class="label--text">Anonymity</p>`}
                          <div
                            class="${res.locals.localCSS(css`
                              display: flex;
                            `)}"
                          >
                            <label
                              class="button button--tight button--tight--inline button--transparent"
                            >
                              <input
                                type="checkbox"
                                name="isAnonymous"
                                class="visually-hidden input--radio-or-checkbox--multilabel"
                              />
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Anonymous to Other Students",
                                  });
                                `}"
                              >
                                <span>
                                  $${userPartial({
                                    req,
                                    res,
                                    user: res.locals.user,
                                    decorate: false,
                                    name: false,
                                  })}
                                  <span
                                    class="${res.locals.localCSS(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Signed by You
                                  </span>
                                </span>
                              </span>
                              <span
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Set as Signed by You",
                                  });
                                `}"
                              >
                                <span>
                                  $${userPartial({
                                    req,
                                    res,
                                    name: false,
                                  })}
                                  <span
                                    class="${res.locals.localCSS(css`
                                      margin-left: var(--space--1);
                                    `)}"
                                  >
                                    Anonymous to Other Students
                                  </span>
                                </span>
                              </span>
                            </label>
                          </div>
                        </div>
                      `}

                  <div
                    $${res.locals.conversation.type === "chat"
                      ? html`hidden`
                      : html``}
                  >
                    <button
                      class="button button--full-width-on-small-screen button--blue"
                      oninteractive="${javascript`
                        Mousetrap(this.closest("form").querySelector(".content-editor--write--textarea")).bind("mod+enter", () => { this.click(); return false; });
                        tippy(this, {
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <span class="keyboard-shortcut">
                                <span
                                  oninteractive="${javascript`
                                    this.hidden = leafac.isAppleDevice;
                                  `}"
                                  >Ctrl+Enter</span
                                ><span
                                  class="keyboard-shortcut--cluster"
                                  oninteractive="${javascript`
                                    this.hidden = !leafac.isAppleDevice;
                                  `}"
                                  ><i class="bi bi-command"></i
                                  ><i class="bi bi-arrow-return-left"></i
                                ></span>
                              </span>
                            `
                          )},
                        });
                      `}"
                    >
                      <i class="bi bi-send"></i>
                      Send Message
                    </button>
                  </div>
                </div>
              </form>
            </div>
          `,
        })
      );
    }
  );

  app.get<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    HTML,
    {},
    {},
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/views",
    ...messageExistsMiddleware,
    (req, res) => {
      res.send(
        partialLayout({
          req,
          res,
          body: html`
            <div
              class="dropdown--menu ${res.locals.localCSS(css`
                max-height: var(--space--56);
                padding: var(--space--1) var(--space--0);
                overflow: auto;
                gap: var(--space--2);
              `)}"
            >
              $${res.locals.message.readings.reverse().map(
                (reading) => html`
                  <button class="dropdown--menu--item">
                    $${userPartial({
                      req,
                      res,
                      enrollment: reading.enrollment,
                      size: "xs",
                    })}
                     
                    <span
                      class="secondary ${res.locals.localCSS(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <time
                        datetime="${new Date(reading.createdAt).toISOString()}"
                        oninteractive="${javascript`
                          leafac.relativizeDateTimeElement(this, { capitalize: true });
                        `}"
                        onbeforeelchildrenupdated="${javascript`
                          return false;
                        `}"
                      ></time>
                    </span>
                  </button>
                `
              )}
            </div>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string; conversationReference: string },
    HTML,
    {
      type?: ConversationType;
      isResolved?: "true" | "false";
      isPinned?: "true" | "false";
      isStaffOnly?: "true" | "false";
      title?: string;
    },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (typeof req.body.type === "string")
        if (!res.locals.conversationTypes.includes(req.body.type))
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "type" = ${req.body.type}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isResolved === "string")
        if (
          res.locals.conversation.type !== "question" ||
          !["true", "false"].includes(req.body.isResolved) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isResolved === "true" &&
            res.locals.conversation.resolvedAt !== null) ||
          (req.body.isResolved === "false" &&
            res.locals.conversation.resolvedAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "resolvedAt" = ${
                req.body.isResolved === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isPinned === "string")
        if (
          !["true", "false"].includes(req.body.isPinned) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isPinned === "true" &&
            res.locals.conversation.pinnedAt !== null) ||
          (req.body.isPinned === "false" &&
            res.locals.conversation.pinnedAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "pinnedAt" = ${
                req.body.isPinned === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.isStaffOnly === "string")
        if (
          !["true", "false"].includes(req.body.isStaffOnly) ||
          res.locals.enrollment.role !== "staff" ||
          (req.body.isStaffOnly === "true" &&
            res.locals.conversation.staffOnlyAt !== null) ||
          (req.body.isStaffOnly === "false" &&
            res.locals.conversation.staffOnlyAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "staffOnlyAt" = ${
                req.body.isStaffOnly === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      if (typeof req.body.title === "string")
        if (req.body.title.trim() === "") return next("validation");
        else
          database.run(
            sql`
              UPDATE "conversations"
              SET "updatedAt" = ${new Date().toISOString()},
                  "title" = ${req.body.title},
                  "titleSearch" = ${html`${req.body.title}`}
              WHERE "id" = ${res.locals.conversation.id}
            `
          );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.delete<
    { courseReference: string; conversationReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals & IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference",
    ...isCourseStaffMiddleware,
    ...isConversationAccessibleMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "conversations" WHERE "id" = ${res.locals.conversation.id}`
      );

      res.redirect(`${app.locals.options.baseURL}/courses/${res.locals.course.reference}`);

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.post<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.reference !== "string" ||
        !res.locals.tags.some((tag) => req.body.reference === tag.reference) ||
        res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "taggings" ("createdAt", "conversation", "tag")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.conversation.id},
            ${
              res.locals.tags.find(
                (tag) => req.body.reference === tag.reference
              )!.id
            }
          )
        `
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
    },
    any,
    { reference?: string },
    {},
    MayEditConversationMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/taggings",
    ...mayEditConversationMiddleware,
    (req, res, next) => {
      if (
        res.locals.conversation.taggings.length === 1 ||
        typeof req.body.reference !== "string" ||
        !res.locals.conversation.taggings.some(
          (tagging) => req.body.reference === tagging.tag.reference
        )
      )
        return next("validation");

      database.run(
        sql`
          DELETE FROM "taggings"
          WHERE "conversation" = ${res.locals.conversation.id} AND
                "tag" = ${
                  res.locals.tags.find(
                    (tag) => req.body.reference === tag.reference
                  )!.id
                }
        `
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );
    }
  );

  app.post<
    { courseReference: string; conversationReference: string },
    HTML,
    { isAnswer?: boolean; content?: string; isAnonymous?: boolean },
    { eventSourceReference?: string },
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages",
    ...isConversationAccessibleMiddleware,
    (req, res, next) => {
      if (
        (req.body.isAnswer && res.locals.conversation.type !== "question") ||
        typeof req.body.content !== "string" ||
        req.body.content.trim() === "" ||
        ((res.locals.enrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null) &&
          req.body.isAnonymous)
      )
        return next("validation");

      const mostRecentMessage = getMessage({
        req,
        res,
        conversation: res.locals.conversation,
        messageReference: String(
          res.locals.conversation.nextMessageReference - 1
        ),
      });
      let processedContent: ReturnType<typeof processContent>;
      let messageReference: string;
      if (
        res.locals.conversation.type === "chat" &&
        mostRecentMessage !== undefined &&
        mostRecentMessage.authorEnrollment !== "no-longer-enrolled" &&
        res.locals.enrollment.id === mostRecentMessage.authorEnrollment.id &&
        mostRecentMessage.anonymousAt === null &&
        !req.body.isAnonymous &&
        new Date().getTime() - new Date(mostRecentMessage.createdAt).getTime() <
          5 * 60 * 1000
      ) {
        const contentSource = `${mostRecentMessage.contentSource}\n\n${req.body.content}`;
        processedContent = processContent({
          req,
          res,
          type: "source",
          content: contentSource,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${contentSource},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search}
            WHERE "id" = ${mostRecentMessage.id}
          `
        );
        database.run(
          sql`
            DELETE FROM "readings"
            WHERE "message" = ${mostRecentMessage.id} AND
                  "enrollment" != ${res.locals.enrollment.id}
          `
        );
        messageReference = mostRecentMessage.reference;
      } else {
        processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()},
                "nextMessageReference" = ${
                  res.locals.conversation.nextMessageReference + 1
                }
                $${
                  res.locals.conversation.type === "question" &&
                  res.locals.enrollment.role === "staff" &&
                  req.body.isAnswer &&
                  res.locals.conversation.resolvedAt === null
                    ? sql`,
                      "resolvedAt" = ${new Date().toISOString()}
                    `
                    : res.locals.conversation.type === "question" &&
                      res.locals.enrollment.role === "student" &&
                      !req.body.isAnswer
                    ? sql`,
                        "resolvedAt" = ${null}
                      `
                    : sql``
                }
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        const message = database.get<{ id: number; reference: string }>(
          sql`
            INSERT INTO "messages" (
              "createdAt",
              "conversation",
              "reference",
              "authorEnrollment",
              "anonymousAt",
              "answerAt",
              "contentSource",
              "contentPreprocessed",
              "contentSearch"
            )
            VALUES (
              ${new Date().toISOString()},
              ${res.locals.conversation.id},
              ${String(res.locals.conversation.nextMessageReference)},
              ${res.locals.enrollment.id},
              ${req.body.isAnonymous ? new Date().toISOString() : null},
              ${req.body.isAnswer ? new Date().toISOString() : null},
              ${req.body.content},
              ${processedContent.preprocessed},
              ${processedContent.search}
            )
            RETURNING *
          `
        )!;
        database.run(
          sql`
            INSERT INTO "readings" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${res.locals.enrollment.id}
            )
          `
        );
        messageReference = message.reference;
      }
      sendNotificationEmails({
        req,
        res,
        conversation: res.locals.conversation,
        message: getMessage({
          req,
          res,
          conversation: res.locals.conversation,
          messageReference,
        })!,
        mentions: processedContent.mentions!,
      });

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.conversation.nextMessageReference}`
      );

      emitCourseRefresh(res.locals.course.id, req.query.eventSourceReference);
    }
  );

  app.patch<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {
      isAnswer?: "true" | "false";
      isAnonymous?: "true" | "false";
      content?: string;
    },
    {},
    MayEditMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...mayEditMessageMiddleware,
    (req, res, next) => {
      if (typeof req.body.isAnswer === "string")
        if (
          !["true", "false"].includes(req.body.isAnswer) ||
          res.locals.message.reference === "1" ||
          res.locals.conversation.type !== "question" ||
          (req.body.isAnswer === "true" &&
            res.locals.message.answerAt !== null) ||
          (req.body.isAnswer === "false" &&
            res.locals.message.answerAt === null)
        )
          return next("validation");
        else
          database.run(
            sql`
              UPDATE "messages"
              SET "answerAt" = ${
                req.body.isAnswer === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );

      if (typeof req.body.isAnonymous === "string")
        if (
          !["true", "false"].includes(req.body.isAnonymous) ||
          res.locals.message.authorEnrollment === "no-longer-enrolled" ||
          res.locals.message.authorEnrollment.role === "staff" ||
          res.locals.conversation.staffOnlyAt !== null ||
          (req.body.isAnonymous === "true" &&
            res.locals.message.anonymousAt !== null) ||
          (req.body.isAnonymous === "false" &&
            res.locals.message.anonymousAt === null)
        )
          return next("validation");
        else {
          database.run(
            sql`
              UPDATE "messages"
              SET "anonymousAt" = ${
                req.body.isAnonymous === "true"
                  ? new Date().toISOString()
                  : null
              }
              WHERE "id" = ${res.locals.message.id}
            `
          );
          if (res.locals.message.reference === "1")
            database.run(
              sql`
                UPDATE "conversations"
                SET "anonymousAt" = ${
                  req.body.isAnonymous === "true"
                    ? new Date().toISOString()
                    : null
                }
                WHERE "id" = ${res.locals.conversation.id}
              `
            );
        }

      if (typeof req.body.content === "string") {
        if (req.body.content.trim() === "") return next("validation");
        const processedContent = processContent({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        });
        database.run(
          sql`
            UPDATE "messages"
            SET "contentSource" = ${req.body.content},
                "contentPreprocessed" = ${processedContent.preprocessed},
                "contentSearch" = ${processedContent.search},
                "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.message.id}
          `
        );
        database.run(
          sql`
            UPDATE "conversations"
            SET "updatedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );
        sendNotificationEmails({
          req,
          res,
          conversation: res.locals.conversation,
          message: res.locals.message,
          mentions: processedContent.mentions!,
        });
      }

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    IsCourseStaffMiddlewareLocals & MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference",
    ...isCourseStaffMiddleware,
    ...messageExistsMiddleware,
    (req, res, next) => {
      database.run(
        sql`DELETE FROM "messages" WHERE "id" = ${res.locals.message.id}`
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    { eventSourceReference?: string },
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.likes.some(
          (like) =>
            like.enrollment !== "no-longer-enrolled" &&
            like.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "likes" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id, req.query.eventSourceReference);
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    { eventSourceReference?: string },
    MessageExistsMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/likes",
    ...messageExistsMiddleware,
    (req, res, next) => {
      const like = res.locals.message.likes.find(
        (like) =>
          like.enrollment !== "no-longer-enrolled" &&
          like.enrollment.id === res.locals.enrollment.id
      );
      if (like === undefined) return next("validation");

      database.run(
        sql`
          DELETE FROM "likes" WHERE "id" = ${like.id}
        `
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id, req.query.eventSourceReference);
    }
  );

  const mayEndorseMessage = ({
    req,
    res,
    message,
  }: {
    req: express.Request<
      {
        courseReference: string;
        conversationReference: string;
      },
      any,
      {},
      {},
      IsConversationAccessibleMiddlewareLocals
    >;
    res: express.Response<any, IsConversationAccessibleMiddlewareLocals>;
    message: MessageExistsMiddlewareLocals["message"];
  }): boolean =>
    res.locals.enrollment.role === "staff" &&
    res.locals.conversation.type === "question" &&
    message.reference !== "1" &&
    message.answerAt !== null &&
    (message.authorEnrollment === "no-longer-enrolled" ||
      message.authorEnrollment.role !== "staff");

  interface MayEndorseMessageMiddlewareLocals
    extends MessageExistsMiddlewareLocals {}
  const mayEndorseMessageMiddleware: express.RequestHandler<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >[] = [
    ...messageExistsMiddleware,
    (req, res, next) => {
      if (mayEndorseMessage({ req, res, message: res.locals.message }))
        return next();
      next("route");
    },
  ];

  app.post<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      if (
        res.locals.message.endorsements.some(
          (endorsement) =>
            endorsement.enrollment !== "no-longer-enrolled" &&
            endorsement.enrollment.id === res.locals.enrollment.id
        )
      )
        return next("validation");

      database.run(
        sql`
          INSERT INTO "endorsements" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.message.id},
            ${res.locals.enrollment.id}
          )
        `
      );
      if (res.locals.conversation.resolvedAt === null)
        database.run(
          sql`
            UPDATE "conversations"
            SET "resolvedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.conversation.id}
          `
        );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  app.delete<
    {
      courseReference: string;
      conversationReference: string;
      messageReference: string;
    },
    any,
    {},
    {},
    MayEndorseMessageMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/messages/:messageReference/endorsements",
    ...mayEndorseMessageMiddleware,
    (req, res, next) => {
      const endorsement = res.locals.message.endorsements.find(
        (endorsement) =>
          endorsement.enrollment !== "no-longer-enrolled" &&
          endorsement.enrollment.id === res.locals.enrollment.id
      );
      if (endorsement === undefined) return next("validation");

      database.run(
        sql`DELETE FROM "endorsements" WHERE "id" = ${endorsement.id}`
      );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/conversations/${res.locals.conversation.reference}?messageReference=${res.locals.message.reference}`
      );

      emitCourseRefresh(res.locals.course.id);
    }
  );

  const emitCourseRefresh = (
    courseId: number,
    eventDestinationReference?: string | undefined
  ): void => {
    setTimeout(() => {
      for (const { reference, req, res } of eventDestinations) {
        if (reference === eventDestinationReference) continue;
        res.write(`event: refresh\ndata:\n\n`);
        console.log(
          `${new Date().toISOString()}\tSSE\trefresh\t${
            req.ip
          }\t${reference}\t\t\t${req.originalUrl}`
        );
      }
    }, 200);
  };

  const sendNotificationEmails = ({
    req,
    res,
    conversation,
    message,
    mentions,
  }: {
    req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
    res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
    conversation: NonNullable<ReturnType<typeof getConversation>>;
    message: NonNullable<ReturnType<typeof getMessage>>;
    mentions: Set<string>;
  }): void => {
    database.run(
      sql`
        INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
        VALUES (
          ${new Date().toISOString()},
          ${message.id},
          ${res.locals.enrollment.id}
        )
      `
    );
    if (message.authorEnrollment !== "no-longer-enrolled")
      database.run(
        sql`
          INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
          VALUES (
            ${new Date().toISOString()},
            ${message.id},
            ${message.authorEnrollment.id}
          )
        `
      );

    database.executeTransaction(() => {
      let enrollments = database.all<{
        id: number;
        userId: number;
        userEmail: string;
        userEmailNotifications: UserEmailNotifications;
        reference: string;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "enrollments"."id",
                 "users"."id" AS "userId",
                 "users"."email" AS "userEmail",
                 "users"."emailNotifications" AS "userEmailNotifications",
                 "enrollments"."reference",
                 "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id" AND
                          "users"."emailConfirmedAt" IS NOT NULL AND
                          "users"."emailNotifications" != 'none'
          LEFT JOIN "notificationDeliveries" ON "enrollments"."id" = "notificationDeliveries"."enrollment" AND
                                                "notificationDeliveries"."message" = ${
                                                  message.id
                                                }
          $${
            conversation.staffOnlyAt !== null
              ? sql`
                  LEFT JOIN "messages" ON "enrollments"."id" = "messages"."authorEnrollment" AND
                                          "messages"."conversation" = ${conversation.id}
                `
              : sql``
          }
          WHERE "enrollments"."course" = ${res.locals.course.id} AND
                "notificationDeliveries"."id" IS NULL
                $${
                  conversation.staffOnlyAt !== null
                    ? sql`
                      AND (
                        "enrollments"."role" = 'staff' OR
                        "messages"."id" IS NOT NULL
                      )
                    `
                    : sql``
                }
          GROUP BY "enrollments"."id"
        `
      );
      if (
        !(
          (conversation.type === "announcement" && message.reference === "1") ||
          mentions.has("everyone")
        )
      )
        enrollments = enrollments.filter(
          (enrollment) =>
            enrollment.userEmailNotifications === "all-messages" ||
            (enrollment.role === "staff" && mentions.has("staff")) ||
            (enrollment.role === "student" && mentions.has("students")) ||
            mentions.has(enrollment.reference)
        );

      for (const enrollment of enrollments) {
        database.run(
          sql`
            INSERT INTO "sendEmailJobs" (
              "createdAt",
              "startAt",
              "expiresAt",
              "mailOptions"
            )
            VALUES (
              ${new Date().toISOString()},
              ${new Date().toISOString()},
              ${new Date(Date.now() + 20 * 60 * 1000).toISOString()},
              ${JSON.stringify({
                to: enrollment.userEmail,
                subject: `${conversation.title} · ${res.locals.course.name} · Courselore`,
                html: html`
                  <p>
                    <a
                      href="${app.locals.options.baseURL}/courses/${res.locals.course
                        .reference}/conversations/${conversation.reference}?messageReference=${message.reference}"
                      >${message.authorEnrollment === "no-longer-enrolled"
                        ? "Someone who is no longer enrolled"
                        : message.anonymousAt !== null
                        ? `Anonymous ${
                            enrollment.role === "staff"
                              ? `(${message.authorEnrollment.user.name})`
                              : ""
                          }`
                        : message.authorEnrollment.user.name}
                      says</a
                    >:
                  </p>

                  <hr />

                  $${message.contentPreprocessed}

                  <hr />

                  <p>
                    <small>
                      <a href="${app.locals.options.baseURL}/settings/notifications-preferences"
                        >Change Notifications Preferences</a
                      >
                    </small>
                  </p>
                `,
              })}
            )
          `
        );
        database.run(
          sql`
            INSERT INTO "notificationDeliveries" ("createdAt", "message", "enrollment")
            VALUES (
              ${new Date().toISOString()},
              ${message.id},
              ${enrollment.id}
            )
          `
        );
      }
    });

    sendEmailWorker();
  };
};
