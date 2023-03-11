import path from "node:path";
import stream from "node:stream/promises";
import assert from "node:assert/strict";
import express from "express";
import qs from "qs";
import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import * as sanitizeXMLCharacters from "sanitize-xml-string";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeKatex from "rehype-katex";
import * as shiki from "shiki";
import rehypeParse from "rehype-parse";
import { visit as unistUtilVisit } from "unist-util-visit";
import { toString as hastUtilToString } from "hast-util-to-string";
import rehypeStringify from "rehype-stringify";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import { execa } from "execa";
import maybeFFmpeg from "ffmpeg-static";
assert.equal(typeof maybeFFmpeg, "string");
const ffmpeg = maybeFFmpeg as unknown as string;
import escapeStringRegexp from "escape-string-regexp";
import slugify from "@sindresorhus/slugify";
import filenamify from "filenamify";
import cryptoRandomString from "crypto-random-string";
import lodash from "lodash";
import { Application } from "./index.mjs";

export type ApplicationContent = {
  web: {
    locals: {
      partials: {
        contentPreprocessed: (contentSource: string) => {
          contentPreprocessed: string;
          contentSearch: string;
        };

        content: ({
          request,
          response,
          id,
          contentPreprocessed,
          search,
        }: {
          request: express.Request<
            {},
            any,
            {},
            { conversations?: object },
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          id?: string;
          contentPreprocessed: HTML;
          search?: string | string[] | undefined;
        }) => {
          contentProcessed: HTML;
          mentions: Set<string>;
        };

        contentEditor: ({
          request,
          response,
          name,
          contentSource,
          required,
          compact,
          modifiable,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              > &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          name?: string;
          contentSource?: string;
          required?: boolean;
          compact?: boolean;
          modifiable?: boolean;
        }) => HTML;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.partials.contentPreprocessed = await (async () => {
    const unifiedProcessor = unified()
      .use(remarkParse)
      .use(remarkGfm, { singleTilde: false })
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize, {
        strip: ["script"],
        clobberPrefix: "UNUSED",
        clobber: [],
        ancestors: {
          li: ["ul", "ol"],
          thead: ["table"],
          tbody: ["table"],
          tfoot: ["table"],
          tr: ["table"],
          th: ["table"],
          td: ["table"],
          summary: ["details"],
        },
        protocols: {
          href: ["http", "https", "mailto"],
          src: ["http", "https"],
        },
        tagNames: [
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "hr",
          "p",
          "strong",
          "em",
          "u",
          "a",
          "span",
          "code",
          "ins",
          "del",
          "sup",
          "sub",
          "br",
          "img",
          "video",
          "courselore-poll",
          "ul",
          "ol",
          "li",
          "input",
          "blockquote",
          "table",
          "thead",
          "tbody",
          "tfoot",
          "tr",
          "th",
          "td",
          "details",
          "summary",
          "div",
          "pre",
        ],
        attributes: {
          a: ["href", "id"],
          img: ["src", "alt", "width"],
          video: ["src"],
          "courselore-poll": ["reference"],
          li: ["id"],
          input: [["type", "checkbox"], ["disabled", "true"], "checked"],
          th: [["align", "left", "center", "right"]],
          td: [["align", "left", "center", "right"]],
          div: [["className", "math-display"]],
          span: [["className", "math-inline"]],
          code: [["className", /^language-/]],
          "*": [],
        },
        required: {
          input: { type: "checkbox", disabled: true },
          div: { className: "math-display" },
          span: { className: "math-inline" },
        },
      })
      .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
      .use(
        await (async () => {
          const shikiHighlighter = await shiki.getHighlighter({
            themes: ["light-plus", "dark-plus"],
          });
          const rehypeParseProcessor = unified().use(rehypeParse, {
            fragment: true,
          });

          return () => (tree) => {
            unistUtilVisit(tree, (node, index, parent) => {
              if (
                node.type !== "element" ||
                node.tagName !== "pre" ||
                node.children.length !== 1 ||
                node.children[0].type !== "element" ||
                node.children[0].tagName !== "code" ||
                node.children[0].properties === undefined ||
                !Array.isArray(node.children[0].properties.className) ||
                node.children[0].properties.className.length !== 1 ||
                typeof node.children[0].properties.className[0] !== "string" ||
                !node.children[0].properties.className[0].startsWith(
                  "language-"
                ) ||
                index === null ||
                parent === null
              )
                return;

              const code = hastUtilToString(node).slice(0, -1);
              const language = node.children[0].properties.className[0].slice(
                "language-".length
              );

              const highlightedCode = (() => {
                try {
                  return rehypeParseProcessor
                    .parse(
                      html`
                        <div>
                          <div class="light">
                            $${shikiHighlighter.codeToHtml(code, {
                              lang: language,
                              theme: "light-plus",
                            })}
                          </div>
                          <div class="dark">
                            $${shikiHighlighter.codeToHtml(code, {
                              lang: language,
                              theme: "dark-plus",
                            })}
                          </div>
                        </div>
                      `
                    )
                    .children.find((child) => child.type === "element");
                } catch (error: any) {
                  application.log(
                    "ERROR IN SYNTAX HIGHLIGHTER",
                    String(error),
                    error?.stack
                  );
                }
              })();
              if (highlightedCode === undefined) return;
              highlightedCode.position = node.position;
              parent.children[index] = highlightedCode;
            });
          };
        })()
      )
      .use(() => (tree) => {
        unistUtilVisit(tree, (node) => {
          if (
            node.type === "element" &&
            node.properties !== undefined &&
            node.position !== undefined
          )
            node.properties.dataPosition = JSON.stringify(node.position);
        });
      })
      .use(rehypeStringify);

    return (contentSource) => {
      const contentElement = JSDOM.fragment(html`
        <div>
          $${unifiedProcessor
            .processSync(sanitizeXMLCharacters.sanitize(contentSource))
            .toString()}
        </div>
      `).firstElementChild!;

      return {
        contentPreprocessed: contentElement.innerHTML,
        contentSearch: contentElement.textContent!,
      };
    };
  })();

  application.web.locals.partials.content = ({
    request,
    response,
    id = Math.random().toString(36).slice(2),
    contentPreprocessed,
    search = undefined,
  }) => {
    const contentElement = JSDOM.fragment(html`
      <div key="content" class="content">$${contentPreprocessed}</div>
    `).firstElementChild!;
    const mentions = new Set<string>();

    for (const element of contentElement.querySelectorAll(`[id]`))
      element.setAttribute("id", `${id}--${element.getAttribute("id")}`);
    for (const element of contentElement.querySelectorAll("[href]")) {
      let href = element.getAttribute("href")!;
      if (href.startsWith("#")) {
        href = `#${id}--${href.slice(1)}`;
        element.setAttribute("href", href);
      }

      if (
        href.startsWith(`#${id}--user-content-fnref-`) &&
        element.innerHTML === "↩"
      )
        element.innerHTML = html`<i class="bi bi-arrow-return-left"></i>`;

      const isExternal =
        !href.startsWith(`https://${application.configuration.hostname}`) &&
        !href.startsWith("#");
      if (
        isExternal ||
        href.startsWith(`https://${application.configuration.hostname}/files/`)
      )
        element.setAttribute("target", "_blank");

      if (isExternal)
        element.setAttribute(
          "javascript",
          javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: ${
                  href.startsWith("mailto:")
                    ? html`Send email to
                        <code class="code"
                          >${href.slice("mailto:".length)}</code
                        >`
                    : html`External link to <code class="code">${href}</code>`
                },  
              },
            });
          `
        );
    }

    for (const element of contentElement.querySelectorAll("img")) {
      element.setAttribute("loading", "lazy");
      if (
        !element
          .getAttribute("src")
          ?.startsWith(`https://${application.configuration.hostname}/`)
      )
        element.setAttribute(
          "src",
          `https://${
            application.configuration.hostname
          }/content/proxy${qs.stringify(
            { url: element.getAttribute("src") },
            { addQueryPrefix: true }
          )}`
        );
    }

    for (const element of contentElement.querySelectorAll("video")) {
      if (element.parentElement?.matches("a")) {
        element.setAttribute("autoplay", "");
        element.setAttribute("loop", "");
        element.setAttribute("muted", "");
        element.setAttribute("playsinline", "");
      } else {
        element.setAttribute("controls", "");
        element.setAttribute("preload", "metadata");
      }
      if (
        !element
          .getAttribute("src")
          ?.startsWith(`https://${application.configuration.hostname}/`)
      )
        element.setAttribute(
          "src",
          `https://${
            application.configuration.hostname
          }/content/proxy${qs.stringify(
            { url: element.getAttribute("src") },
            { addQueryPrefix: true }
          )}`
        );
    }

    for (const element of contentElement.querySelectorAll("details"))
      if (!element.children[0].matches("summary"))
        element.insertAdjacentHTML(
          "afterbegin",
          html`<summary>See More</summary>`
        );

    if (response.locals.course === undefined) {
      for (const element of contentElement.querySelectorAll("courselore-poll"))
        element.remove();
    } else {
      const requestCourseEnrolled = request as express.Request<
        {},
        any,
        {},
        {},
        Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      >;
      const responseCourseEnrolled = response as express.Response<
        any,
        Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      >;

      for (const element of contentElement.querySelectorAll("a")) {
        const href = element.getAttribute("href");
        if (href !== element.textContent!.trim()) continue;
        const match = href.match(
          new RegExp(
            `^https://${escapeStringRegexp(
              application.configuration.hostname
            )}/courses/(?<courseReference>\\d+)/conversations/(?<conversationReference>\\d+)(?:\\?messages%5BmessageReference%5D=(?<messageReference>\\d+))?$`
          )
        );
        if (match?.groups === undefined) continue;
        const { courseReference, conversationReference, messageReference } =
          match.groups;
        if (courseReference !== response.locals.course.reference) continue;
        const conversation = application.web.locals.helpers.getConversation({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversationReference,
        });
        if (conversation === undefined) continue;
        const url = new URL(href);
        url.search = qs.stringify(
          {
            ...Object.fromEntries(url.searchParams),
            conversations: request.query.conversations,
          },
          { addQueryPrefix: true }
        );
        if (messageReference === undefined) {
          element.setAttribute("href", url.href);
          element.textContent = `#${conversation.reference}`;
          continue;
        }
        const message = application.web.locals.helpers.getMessage({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversation,
          messageReference,
        });
        if (message === undefined) continue;
        element.setAttribute("href", url.href);
        element.textContent = `#${conversation.reference}/${message.reference}`;
      }

      (function processTree(node: Node): void {
        processNode();
        for (const childNode of node.childNodes) processTree(childNode);
        function processNode() {
          if (node.nodeType !== node.TEXT_NODE) return;
          const parentElement = node.parentElement;
          if (
            node.textContent === null ||
            parentElement === null ||
            parentElement.closest(
              `a, code, [key="mention"], [key="reference"]`
            ) !== null
          )
            return;
          let newNodeHTML = html`${node.textContent}`;

          newNodeHTML = newNodeHTML.replace(
            /(?<=^|\s)@([a-z0-9-]+)(?=[^a-z0-9-]|$)/gi,
            (match, mention) => {
              mention = mention.toLowerCase();
              let mentionHTML: HTML;
              switch (mention) {
                case "everyone":
                case "staff":
                case "students":
                  mentions.add(mention);
                  mentionHTML = html`<span
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: ${`Mention ${mention} in the conversation`},
                        },
                      });
                    `}"
                    >@${mention}</span
                  >`;
                  break;
                case "anonymous":
                  mentionHTML = html`@$${application.web.locals.partials.user({
                    request,
                    response,
                    avatar: false,
                  })}`;
                  break;
                default:
                  const enrollmentReference = mention.split("--")[0];
                  const enrollmentRow = application.database.get<{
                    id: number;
                    userId: number;
                    userLastSeenOnlineAt: string;
                    userReference: string;
                    userEmail: string;
                    userName: string;
                    userAvatar: string | null;
                    userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
                    userBiographySource: string | null;
                    userBiographyPreprocessed: HTML | null;
                    reference: string;
                    courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
                  }>(
                    sql`
                      SELECT
                        "enrollments"."id",
                        "users"."id" AS "userId",
                        "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                        "users"."reference" AS "userReference",
                        "users"."email" AS "userEmail",
                        "users"."name" AS "userName",
                        "users"."avatar" AS "userAvatar",
                        "users"."avatarlessBackgroundColor" AS  "userAvatarlessBackgroundColor",
                        "users"."biographySource" AS "userBiographySource",
                        "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                        "enrollments"."reference",
                        "enrollments"."courseRole"
                      FROM "enrollments"
                      JOIN "users" ON "enrollments"."user" = "users"."id"
                      WHERE
                        "enrollments"."course" = ${
                          response.locals.course!.id
                        } AND
                        "enrollments"."reference" = ${enrollmentReference}
                    `
                  );
                  if (enrollmentRow === undefined) return match;
                  const enrollment = {
                    id: enrollmentRow.id,
                    user: {
                      id: enrollmentRow.userId,
                      lastSeenOnlineAt: enrollmentRow.userLastSeenOnlineAt,
                      reference: enrollmentRow.userReference,
                      email: enrollmentRow.userEmail,
                      name: enrollmentRow.userName,
                      avatar: enrollmentRow.userAvatar,
                      avatarlessBackgroundColor:
                        enrollmentRow.userAvatarlessBackgroundColor,
                      biographySource: enrollmentRow.userBiographySource,
                      biographyPreprocessed:
                        enrollmentRow.userBiographyPreprocessed,
                    },
                    reference: enrollmentRow.reference,
                    courseRole: enrollmentRow.courseRole,
                  };
                  mentions.add(enrollment.reference);
                  mentionHTML = html`@$${application.web.locals.partials.user({
                    request,
                    response,
                    enrollment,
                    avatar: false,
                  })}`;
                  if (enrollment.user.id === response.locals.user!.id)
                    mentionHTML = html`<mark class="mark"
                      >$${mentionHTML}</mark
                    >`;
                  break;
              }
              return html`<strong key="mention">$${mentionHTML}</strong>`;
            }
          );

          newNodeHTML = newNodeHTML.replace(
            /(?<=^|\s)#(\d+)(?:\/(\d+))?(?=[^\d]|$)/g,
            (match, conversationReference, messageReference) => {
              const conversation =
                application.web.locals.helpers.getConversation({
                  request: requestCourseEnrolled,
                  response: responseCourseEnrolled,
                  conversationReference,
                });
              if (conversation === undefined) return match;
              if (messageReference === undefined)
                return html`<a
                  key="reference"
                  href="https://${application.configuration
                    .hostname}/courses/${response.locals.course!
                    .reference}/conversations/${conversation.reference}${qs.stringify(
                    { conversations: request.query.conversations },
                    { addQueryPrefix: true }
                  )}"
                  >${match}</a
                >`;
              const message = application.web.locals.helpers.getMessage({
                request: requestCourseEnrolled,
                response: responseCourseEnrolled,
                conversation,
                messageReference,
              });
              if (message === undefined) return match;
              return html`<a
                key="reference"
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course!
                  .reference}/conversations/${conversation.reference}${qs.stringify(
                  {
                    conversations: request.query.conversations,
                    messages: { messageReference: message.reference },
                  },
                  { addQueryPrefix: true }
                )}"
                >${match}</a
              >`;
            }
          );

          parentElement.replaceChild(JSDOM.fragment(newNodeHTML), node);
        }
      })(contentElement);

      for (const element of contentElement.querySelectorAll("a")) {
        const href = element.getAttribute("href");
        if (href === null) continue;
        const hrefMatch = href.match(
          new RegExp(
            `^https://${escapeStringRegexp(
              application.configuration.hostname
            )}/courses/(?<hrefCourseReference>\\d+)/conversations/(?<hrefConversationReference>\\d+)(?:\\?messages%5BmessageReference%5D=(?<hrefMessageReference>\\d+))?$`
          )
        );
        if (hrefMatch?.groups === undefined) continue;
        const {
          hrefCourseReference,
          hrefConversationReference,
          hrefMessageReference,
        } = hrefMatch.groups;
        if (hrefCourseReference !== response.locals.course.reference) continue;
        const textContentMatch = element
          .textContent!.trim()
          .match(/^#(\d+)(?:\/(\d+))?$/);
        if (textContentMatch === null) continue;
        const [textContentConversationReference, textContentMessageReference] =
          textContentMatch.slice(1);
        if (
          hrefConversationReference !== textContentConversationReference ||
          hrefMessageReference !== textContentMessageReference
        )
          continue;
        const conversation = application.web.locals.helpers.getConversation({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversationReference: hrefConversationReference,
        });
        if (conversation === undefined) continue;
        if (hrefMessageReference === undefined) {
          element.setAttribute(
            "javascript",
            javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  interactive: true,
                  appendTo: document.querySelector("body"),
                  content: ${html`
                    <div
                      css="${css`
                        padding: var(--space--2);
                      `}"
                    >
                      $${application.web.locals.partials.conversation({
                        request: requestCourseEnrolled,
                        response: responseCourseEnrolled,
                        conversation,
                      })}
                    </div>
                  `},  
                },
              });
            `
          );
          continue;
        }
        const message = application.web.locals.helpers.getMessage({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversation,
          messageReference: hrefMessageReference,
        });
        if (message === undefined) continue;
        element.setAttribute(
          "javascript",
          javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                interactive: true,
                appendTo: document.querySelector("body"),
                content: ${html`
                  <div
                    css="${css`
                      padding: var(--space--2);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    $${application.web.locals.partials.conversation({
                      request: requestCourseEnrolled,
                      response: responseCourseEnrolled,
                      conversation,
                      message,
                    })}
                  </div>
                `},  
              },
            });
          `
        );
      }

      for (const element of contentElement.querySelectorAll(
        "courselore-poll"
      )) {
        const pollReference = element.getAttribute("reference");
        if (pollReference === null) {
          element.outerHTML = html`<div>POLL MISSING REFERENCE</div>`;
          continue;
        }

        const pollRow = application.database.get<{
          id: number;
          reference: string;
          authorEnrollmentId: number | null;
          multipleChoicesAt: string | null;
          closesAt: string | null;
          votesCount: number;
        }>(
          sql`
            SELECT
              "messagePolls"."id",
              "messagePolls"."reference",
              "messagePolls"."authorEnrollment" AS "authorEnrollmentId",
              "messagePolls"."multipleChoicesAt",
              "messagePolls"."closesAt",
              COUNT("messagePollVotes"."id") AS "votesCount"
            FROM "messagePolls"
            LEFT JOIN "messagePollOptions" ON "messagePolls"."id" = "messagePollOptions"."messagePoll"
            LEFT JOIN "messagePollVotes" ON "messagePollOptions"."id" = "messagePollVotes"."messagePollOption"
            WHERE
              "messagePolls"."course" = ${responseCourseEnrolled.locals.course.id} AND
              "messagePolls"."reference" = ${pollReference}
            GROUP BY "messagePolls"."id"
          `
        );
        if (pollRow === undefined) {
          element.outerHTML = html`<div>POLL REFERENCE NOT FOUND</div>`;
          continue;
        }
        const poll = {
          id: pollRow.id,
          reference: pollRow.reference,
          authorEnrollment:
            pollRow.authorEnrollmentId !== null
              ? { id: pollRow.authorEnrollmentId }
              : ("no-longer-enrolled" as const),
          multipleChoicesAt: pollRow.multipleChoicesAt,
          closesAt: pollRow.closesAt,
          votesCount: pollRow.votesCount,
        };

        const options = application.database.all<{
          id: number;
          reference: string;
          contentPreprocessed: string;
          enrollmentVote: number | null;
          votesCount: number;
        }>(
          sql`
            SELECT
              "messagePollOptions"."id",
              "messagePollOptions"."reference",
              "messagePollOptions"."contentPreprocessed",
              "messagePollVotesEnrollmentVote"."id" AS "enrollmentVote",
              COUNT("messagePollVotesCount"."id") AS "votesCount"
            FROM "messagePollOptions"
            LEFT JOIN "messagePollVotes" AS "messagePollVotesEnrollmentVote" ON
              "messagePollOptions"."id" = "messagePollVotesEnrollmentVote"."messagePollOption" AND
              "messagePollVotesEnrollmentVote"."enrollment" = ${responseCourseEnrolled.locals.enrollment.id}
            LEFT JOIN "messagePollVotes" AS "messagePollVotesCount" ON "messagePollOptions"."id" = "messagePollVotesCount"."messagePollOption"
            WHERE "messagePollOptions"."messagePoll" = ${poll.id}
            GROUP BY "messagePollOptions"."id"
            ORDER BY "messagePollOptions"."order" ASC
          `
        );

        const voted = options.some((option) => option.enrollmentVote !== null);
        const mayEdit = mayEditPoll({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          poll,
        });
        const closed = application.web.locals.helpers.isPast(poll.closesAt);

        let pollHTML = html`
          $${options.map((option) => {
            let optionHTML = html`
              <div
                javascript="${javascript`
                  if (${voted})
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: "Your Vote",  
                      },
                    });
                `}"
              >
                <input
                  type="${poll.multipleChoicesAt === null
                    ? "radio"
                    : "checkbox"}"
                  name="optionsReferences[]"
                  value="${option.reference}"
                  required
                  ${option.enrollmentVote ? html`checked` : html``}
                  ${voted || closed ? html`disabled` : html``}
                  css="${css`
                    margin-top: var(--space--0-5);
                  `}"
                />
              </div>

              $${voted || mayEdit || closed
                ? (() => {
                    const width =
                      poll.votesCount < 10
                        ? "var(--space--14)"
                        : poll.votesCount < 100
                        ? "var(--space--16)"
                        : poll.votesCount < 1000
                        ? "var(--space--18)"
                        : "var(--space--24)";

                    return html`
                      <div
                        data-results="true"
                        $${voted || closed ? html`` : html`hidden`}
                        class="strong"
                        style="--width: ${width};"
                        css="${css`
                          width: var(--width);
                        `}"
                        javascript="${javascript`
                          this.style.setProperty("--width", ${width});
                        `}"
                      >
                        ${String(option.votesCount)}
                        vote${option.votesCount === 1 ? "" : "s"}
                      </div>
                    `;
                  })()
                : html``}

              <div
                css="${css`
                  flex: 1;
                `}"
              >
                $${application.web.locals.partials.content({
                  request,
                  response,
                  id: `${id}--${option.reference}`,
                  contentPreprocessed: option.contentPreprocessed,
                  search,
                }).contentProcessed}
              </div>
            `;

            optionHTML =
              voted || closed
                ? html`
                    <div
                      css="${css`
                        display: flex;
                        gap: var(--space--2);
                      `}"
                    >
                      $${optionHTML}
                    </div>
                  `
                : html`
                    <label
                      css="${css`
                        display: flex;
                        gap: var(--space--2);
                        cursor: pointer;
                      `}"
                    >
                      $${optionHTML}
                    </label>
                  `;

            if (voted || mayEdit || closed)
              optionHTML = html`
                <div
                  css="${css`
                    display: grid;
                    & > * {
                      grid-area: 1 / 1;
                    }
                  `}"
                >
                  <div
                    data-results="true"
                    $${voted || closed ? html`` : html`hidden`}
                    css="${css`
                      background: var(--color--gray--medium--100);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--gray--medium--800);
                      }
                      width: calc(var(--space--1) + 100% + var(--space--1));
                      height: calc(var(--space--6) + var(--space--0-5));
                      margin-left: var(--space---1);
                      margin-top: var(--space---1);
                      border-radius: var(--border-radius--md);
                    `}"
                  ></div>

                  $${(() => {
                    const width =
                      option.votesCount > 0
                        ? `calc(var(--space--1) + ${
                            (option.votesCount / Math.max(poll.votesCount, 1)) *
                            100
                          }% + var(--space--1))`
                        : "0%";

                    return html`
                      <div
                        data-results="true"
                        $${voted || closed ? html`` : html`hidden`}
                        style="--width: ${width};"
                        css="${css`
                          background: var(--color--blue--100);
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--blue--900);
                          }
                          width: var(--width);
                          height: calc(var(--space--6) + var(--space--0-5));
                          margin-left: var(--space---1);
                          margin-top: var(--space---1);
                          border-radius: var(--border-radius--md);
                        `}"
                        javascript="${javascript`
                          this.style.setProperty("--width", ${width});
                        `}"
                      ></div>
                    `;
                  })()}

                  <div
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    $${optionHTML}

                    <div
                      key="poll--show--option--votes/${option.reference}"
                      data-results="true"
                      data-results-votes="true"
                      hidden
                      class="secondary"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                        padding-bottom: var(--space--2);
                        border-bottom: var(--border-width--1) solid
                          var(--color--gray--medium--300);
                        @media (prefers-color-scheme: dark) {
                          border-color: var(--color--gray--medium--600);
                        }
                        margin-bottom: var(--space--2);
                        display: flex;
                        column-gap: var(--space--4);
                        row-gap: var(--space--1);
                        flex-wrap: wrap;
                      `}"
                    ></div>
                  </div>
                </div>
              `;

            return optionHTML;
          })}
          $${poll.closesAt !== null
            ? html`
                <div
                  class="secondary"
                  css="${css`
                    font-size: var(--font-size--xs);
                    line-height: var(--line-height--xs);
                  `}"
                >
                  <span>
                    ${closed ? "Closed" : "Closes"}
                    <time
                      datetime="${new Date(poll.closesAt).toISOString()}"
                      javascript="${javascript`
                        leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                      `}"
                    ></time
                    >.
                  </span>
                </div>
              `
            : html``}
          $${(() => {
            let actions = html``;

            if (!closed)
              actions += voted
                ? html`
                    <form
                      method="DELETE"
                      action="https://${application.configuration
                        .hostname}/courses/${responseCourseEnrolled.locals
                        .course
                        .reference}/polls/${poll.reference}/votes${qs.stringify(
                        { redirect: request.originalUrl.slice(1) },
                        { addQueryPrefix: true }
                      )}"
                    >
                      <button class="button button--rose">
                        <i class="bi bi-trash-fill"></i>
                        Remove Vote
                      </button>
                    </form>
                  `
                : html`
                    <div>
                      <button class="button button--blue">
                        <i class="bi bi-card-checklist"></i>
                        Vote
                      </button>
                    </div>

                    <button
                      type="button"
                      class="button button--tight button--tight--inline button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            trigger: "click",
                            content: "Staff and the poll creator may see individual votes. Students may see aggregate results.",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>

                    $${mayEdit
                      ? html`
                          <div key="poll--show--actions--show-results">
                            <button
                              type="button"
                              class="button button--transparent"
                              javascript="${javascript`
                                this.onclick = async () => {
                                  const poll = this.closest('[key="poll--show"]');
                                  for (const element of poll.querySelectorAll('[data-results="true"]:not([data-results-votes="true"])'))
                                    element.hidden = false;
                                  poll.querySelector('[key="poll--show--actions--show-results"]').hidden = true;
                                };
                              `}"
                            >
                              <i class="bi bi-eye"></i>
                              Show Results
                            </button>
                          </div>

                          <div data-results="true" hidden>
                            <button
                              type="button"
                              class="button button--transparent"
                              javascript="${javascript`
                                this.onclick = async () => {
                                  const poll = this.closest('[key="poll--show"]');
                                  for (const element of poll.querySelectorAll('[data-results="true"]'))
                                    element.hidden = true;
                                  poll.querySelector('[key="poll--show--actions--show-results"]').hidden = false;
                                };
                              `}"
                            >
                              <i class="bi bi-eye-slash"></i>
                              Hide Results
                            </button>
                          </div>
                        `
                      : html``}
                  `;

            if (mayEdit)
              actions += html`
                <div
                  key="poll--show--actions--show-votes"
                  data-results="true"
                  $${voted || closed ? html`` : html`hidden`}
                  css="${css`
                    display: flex;
                    gap: var(--space--2);
                    align-items: center;
                  `}"
                >
                  <button
                    type="button"
                    class="button ${closed
                      ? "button--blue"
                      : "button--transparent"}"
                    javascript="${javascript`
                      this.onclick = async () => {
                        const poll = this.closest('[key="poll--show"]');
                        const loading = poll.querySelector('[key="poll--show--actions--show-votes--loading"]');
                        loading.hidden = false;
                        const partial = leafac.stringToElement(await (await fetch(${`https://${application.configuration.hostname}/courses/${responseCourseEnrolled.locals.course.reference}/polls/${poll.reference}/votes`}, { cache: "no-store" })).text());
                        for (const partialElement of partial.querySelectorAll('[key^="poll--show--option--votes/"]')) {
                          const element = poll.querySelector('[key="' + partialElement.getAttribute("key") + '"]');
                          element.onbeforemorph = (event) => !event?.detail?.liveUpdate;
                          leafac.morph(element, partialElement);
                          leafac.execute({ element });
                          element.hidden = false;
                        }
                        loading.hidden = true;
                        poll.querySelector('[key="poll--show--actions--show-votes"]').hidden = true;
                        poll.querySelector('[key="poll--show--actions--hide-votes"]').hidden = false;
                      };
                    `}"
                  >
                    <i class="bi ${closed ? "bi-eye-fill" : "bi-eye"}"></i>
                    Show Votes
                  </button>

                  <div key="poll--show--actions--show-votes--loading" hidden>
                    $${application.web.locals.partials.spinner({
                      request,
                      response,
                    })}
                  </div>
                </div>

                <div
                  key="poll--show--actions--hide-votes"
                  data-results="true"
                  data-results-votes="true"
                  hidden
                >
                  <button
                    type="button"
                    class="button ${closed
                      ? "button--blue"
                      : "button--transparent"}"
                    javascript="${javascript`
                      this.onclick = async () => {
                        const poll = this.closest('[key="poll--show"]');
                        for (const element of poll.querySelectorAll('[key^="poll--show--option--votes/"]'))
                          element.hidden = true;
                        poll.querySelector('[key="poll--show--actions--show-votes"]').hidden = false;
                        poll.querySelector('[key="poll--show--actions--hide-votes"]').hidden = true;
                      };
                    `}"
                  >
                    <i
                      class="bi ${closed
                        ? "bi-eye-slash-fill"
                        : "bi-eye-slash"}"
                    ></i>
                    Hide Votes
                  </button>
                </div>

                <div>
                  <button
                    type="button"
                    class="button button--transparent"
                    javascript="${javascript`
                      this.onclick = async () => {
                        const edit = this.closest('[key^="poll/"]').querySelector('[key="poll--edit"]');
                        const loading = this.querySelector('[key="loading"]');
                        loading.hidden = false;
                        edit.onbeforemorph = (event) => !event?.detail?.liveUpdate;
                        leafac.morph(edit, await (await fetch(${`https://${
                          application.configuration.hostname
                        }/courses/${response.locals.course.reference}/polls/${
                          poll.reference
                        }/edit${qs.stringify(
                          { redirect: request.originalUrl.slice(1) },
                          { addQueryPrefix: true }
                        )}`}, { cache: "no-store" })).text());
                        loading.hidden = true;
                        leafac.execute({ element: edit });
                        this.closest('[key^="poll/"]').querySelector('[key="poll--show"]').hidden = true;
                        edit.hidden = false;
                      };
                    `}"
                  >
                    <i class="bi bi-pencil"></i>
                    Edit Poll
                    <div key="loading" hidden>
                      $${application.web.locals.partials.spinner({
                        request,
                        response,
                        size: 10,
                      })}
                    </div>
                  </button>
                </div>

                <div>
                  <button
                    formmethod="PATCH"
                    formaction="https://${application.configuration
                      .hostname}/courses/${responseCourseEnrolled.locals.course
                      .reference}/polls/${poll.reference}${qs.stringify(
                      { redirect: request.originalUrl.slice(1) },
                      { addQueryPrefix: true }
                    )}"
                    name="close"
                    value="${closed ? "false" : "true"}"
                    class="button button--transparent"
                    javascript="${javascript`
                      this.onclick = () => {
                        this.closest("form").isValid = true;
                      };
                    `}"
                  >
                    $${closed
                      ? html`
                          <i class="bi bi-calendar-check"></i>
                          Reopen Poll
                        `
                      : html`
                          <i class="bi bi-calendar-x"></i>
                          Close Poll
                        `}
                  </button>
                </div>
              `;

            return actions !== html``
              ? html`
                  <div
                    css="${css`
                      display: flex;
                      gap: var(--space--2);
                      flex-wrap: wrap;
                      align-items: center;
                    `}"
                  >
                    $${actions}
                  </div>
                `
              : html``;
          })()}
        `;

        pollHTML = html`
          <div
            key="poll/${poll.reference}/${String(poll.closesAt === null)}"
            css="${css`
              margin: var(--space--8) var(--space--0);
            `}"
          >
            <form
              key="poll--show"
              method="POST"
              action="https://${application.configuration
                .hostname}/courses/${responseCourseEnrolled.locals.course
                .reference}/polls/${poll.reference}/votes${qs.stringify(
                { redirect: request.originalUrl.slice(1) },
                { addQueryPrefix: true }
              )}"
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              $${pollHTML}
            </form>

            <form
              key="poll--edit"
              method="PUT"
              action="https://${application.configuration
                .hostname}/courses/${responseCourseEnrolled.locals.course
                .reference}/polls/${poll.reference}${qs.stringify(
                { redirect: request.originalUrl.slice(1) },
                { addQueryPrefix: true }
              )}"
              novalidate
              hidden
            ></form>
          </div>
        `;

        element.outerHTML = pollHTML;
      }
    }

    if (search !== undefined)
      (function processTree(node: Node): void {
        processNode();
        for (const childNode of node.childNodes) processTree(childNode);
        function processNode() {
          if (node.nodeType !== node.TEXT_NODE) return;
          const parentElement = node.parentElement;
          if (node.textContent === null || parentElement === null) return;
          parentElement.replaceChild(
            JSDOM.fragment(
              application.web.locals.helpers.highlightSearchResult(
                html`${node.textContent}`,
                search
              )
            ),
            node
          );
        }
      })(contentElement);

    return { contentProcessed: contentElement.outerHTML, mentions };
  };

  application.web.get<
    {},
    any,
    {},
    { url?: string },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >(
    "/content/proxy",
    asyncHandler(async (request, response) => {
      if (
        typeof request.query.url !== "string" ||
        !["http://", "https://"].some((urlPrefix) =>
          request.query.url!.toLowerCase().startsWith(urlPrefix)
        ) ||
        request.query.url
          .toLowerCase()
          .startsWith(`https://${application.configuration.hostname}/`)
      )
        return response.status(422).end();

      delete response.locals.liveConnectionNonce;

      await stream.pipeline(
        application.got
          .stream(request.query.url, {
            throwHttpErrors: false,
            retry: { limit: 0 },
            timeout: { request: 10000 },
          })
          .on("response", (proxiedResponse) => {
            for (const [headerName, headerValue] of Object.entries(
              proxiedResponse.headers
            ))
              switch (headerName.toLowerCase()) {
                case "content-type":
                  if (
                    typeof headerValue !== "string" ||
                    !(
                      headerValue.startsWith("image/") ||
                      headerValue.startsWith("video/")
                    )
                  )
                    response.status(422).end();
                  break;
                case "content-length":
                  break;
                default:
                  delete proxiedResponse.headers[headerName];
                  break;
              }
          }),
        response
      );
    })
  );

  application.web.locals.partials.contentEditor = ({
    request,
    response,
    name = "content",
    contentSource = "",
    required = true,
    compact = false,
    modifiable = true,
  }) => html`
    <div
      key="content-editor"
      css="${css`
        min-width: var(--space--0);
        & > * {
          position: relative;
        }
      `}"
      javascript="${javascript`
        this.onbeforemorph = (event) => !event?.detail?.liveUpdate;
      `}"
    >
      <div
        key="content-editor--toolbar"
        ${compact &&
        typeof response.locals.user?.preferContentEditorToolbarInCompactAt !==
          "string"
          ? html`hidden`
          : html``}
        css="${css`
          font-size: var(--font-size--xs);
          line-height: var(--line-height--xs);
          display: flex;
          gap: var(--space--4);
          justify-content: space-between;
          align-items: baseline;
        `}"
      >
        <div
          css="${css`
            display: flex;
            gap: var(--space--1);

            .button {
              padding-bottom: var(--space--4);
              margin-bottom: var(--space---3);
            }

            :checked + .button--transparent {
              background-color: var(--color--gray--medium--200);
            }
            :focus-within + .button--transparent {
              background-color: var(--color--gray--medium--300);
            }
            @media (prefers-color-scheme: dark) {
              :checked + .button--transparent {
                background-color: var(--color--gray--medium--700);
              }
              :focus-within + .button--transparent {
                background-color: var(--color--gray--medium--600);
              }
            }
          `}"
        >
          <label>
            <input
              key="content-editor--button--write"
              type="radio"
              name="content-editor--mode"
              checked
              class="visually-hidden"
              javascript="${javascript`
                this.isModified = false;

                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]').hidden = false;
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--loading"]').hidden = true;
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--preview"]').hidden = true;  
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--toolbar--write"]').hidden = false;
                };
              `}"
            />
            <span class="button button--transparent">
              <i class="bi bi-pencil"></i>
              Write
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="content-editor--mode"
              class="content-editor--button--preview visually-hidden"
              javascript="${javascript`
                this.isModified = false;

                this.onclick = async (event) => {
                  const write = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]');
                  const loading = this.closest('[key="content-editor"]').querySelector('[key="content-editor--loading"]');
                  const preview = this.closest('[key="content-editor"]').querySelector('[key="content-editor--preview"]');
                  const toolbar = this.closest('[key="content-editor"]').querySelector('[key="content-editor--toolbar--write"]');
                  const textarea = write.querySelector("textarea");
                  const previousTextareaRequired = textarea.required;
                  textarea.required = true;
                  const isWriteValid = leafac.validate(write);
                  textarea.required = previousTextareaRequired;
                  if (!isWriteValid) {
                    event.preventDefault();
                    return;
                  }
                  tippy.hideAll();
                  write.hidden = true;
                  loading.hidden = false;
                  preview.hidden = true;
                  toolbar.hidden = true;
                  leafac.loadPartial(
                    preview,
                    await (
                      await fetch(${`https://${
                        application.configuration.hostname
                      }${
                        response.locals.course === undefined
                          ? ""
                          : `/courses/${response.locals.course.reference}`
                      }/content-editor/preview`}, {
                        method: "POST",
                        headers: { "CSRF-Protection": "true", },
                        cache: "no-store",
                        body: new URLSearchParams({ content: textarea.value, }),
                      })
                    ).text()
                  );
                  write.hidden = true;
                  loading.hidden = true;
                  preview.hidden = false;
                };
              `}"
            />
            <span
              class="button button--transparent"
              javascript="${javascript`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: ${html`
                      <span class="keyboard-shortcut">
                        <span
                          javascript="${javascript`
                            this.hidden = leafac.isAppleDevice;
                          `}"
                          >Ctrl+Alt+P</span
                        ><span
                          class="keyboard-shortcut--cluster"
                          javascript="${javascript`
                            this.hidden = !leafac.isAppleDevice;
                          `}"
                          ><i class="bi bi-alt"></i
                          ><i class="bi bi-command"></i>P</span
                        >
                      </span>
                    `},  
                  },
                });

                const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+p", () => { this.click(); return false; });
              `}"
            >
              <i class="bi bi-eyeglasses"></i>
              Preview
            </span>
          </label>
        </div>
        <div
          key="content-editor--toolbar--write"
          css="${css`
            display: flex;
            margin-right: var(--space---1);
          `}"
        >
          <button
            type="button"
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Headings",
                },
              });

              leafac.setTippy({
                event,
                element: this,
                elementProperty: "dropdown",
                tippyProps: {
                  trigger: "click",
                  interactive: true,
                  content: ${html`
                    <div
                      css="${css`
                        max-height: 40vh;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "# ", "HEADING\\n\\n");
                                textarea.selectionEnd += "HEADING".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "# ", "\\n\\n");
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+1", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-h1"></i>
                          Heading 1
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+1</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>1</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "## ", "HEADING\\n\\n");
                                textarea.selectionEnd += "HEADING".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "## ", "\\n\\n");
                              textarea.focus();  
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+2", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-h2"></i>
                          Heading 2
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+2</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>2</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "### ", "HEADING\\n\\n");
                                textarea.selectionEnd += "HEADING".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "### ", "\\n\\n");
                              textarea.focus();  
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+3", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-h3"></i>
                          Heading 3
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+3</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>3</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "---\\n\\n", "");
                              textarea.focus();  
                            };
                          `}"
                        >
                          <i class="bi bi-dash-lg"></i>
                          Separator
                        </button>
                      </div>
                    </div>
                  `},  
                },
              });
            `}"
          >
            <i class="bi bi-paragraph"></i>
          </button>
          <button
            type="button"
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Inline",
                },
              });

              leafac.setTippy({
                event,
                element: this,
                elementProperty: "dropdown",
                tippyProps: {
                  trigger: "click",
                  interactive: true,
                  content: ${html`
                    <div
                      css="${css`
                        max-height: 40vh;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "**", "TEXT**");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "**");
                              textarea.focus();
                            };
                      
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+b", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-bold"></i>
                          Bold
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+B</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>B</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "_", "TEXT_");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "_");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+i", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-italic"></i>
                          Italic
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+I</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>I</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "<u>", "TEXT</u>");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "<u>", "</u>");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+u", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-underline"></i>
                          Underline
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+U</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>U</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "~~", "TEXT~~");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "~~");
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+s", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-type-strikethrough"></i>
                          Strikethrough
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+S</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>S</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "[", "TEXT](https://example.com)");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "[", "](https://example.com)");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+k", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-link"></i>
                          Link
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+K</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>K</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "$", "LATEX$");
                                textarea.selectionEnd += "LATEX".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "$");
                              textarea.focus();
                            };
                          
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+e", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-calculator"></i>
                          Mathematics (LaTeX)
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+E</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>E</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "\`", "CODE\`");
                                textarea.selectionEnd += "CODE".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "\`");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+e", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-braces"></i>
                          Code
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+E</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>E</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "<ins>", "TEXT</ins>");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "<ins>", "</ins>");
                              textarea.focus();
                            };
                          `}"
                        >
                          <i class="bi bi-plus-square-dotted"></i>
                          Insertion
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "~~", "TEXT~~");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "~~");
                              textarea.focus();
                            };
                          `}"
                        >
                          <i class="bi bi-dash-square-dotted"></i>
                          Deletion
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "<sup>", "TEXT</sup>");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "<sup>", "</sup>");
                              textarea.focus();
                            };
                          `}"
                        >
                          <i class="bi bi-superscript"></i>
                          Superscript
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "<sub>", "TEXT</sub>");
                                textarea.selectionEnd += "TEXT".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "<sub>", "</sub>");
                              textarea.focus();
                            };
                          `}"
                        >
                          <i class="bi bi-subscript"></i>
                          Subscript
                        </button>
                      </div>
                    </div>
                  `},  
                },
              });
            `}"
          >
            <i class="bi bi-type"></i>
          </button>
          <button
            type="button"
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: ${html`
                    Attachment
                    <span class="keyboard-shortcut">
                      <span
                        javascript="${javascript`
                          this.hidden = leafac.isAppleDevice;
                        `}"
                        >Ctrl+Shift+K</span
                      ><span
                        class="keyboard-shortcut--cluster"
                        javascript="${javascript`
                          this.hidden = !leafac.isAppleDevice;
                        `}"
                        ><i class="bi bi-shift"></i
                        ><i class="bi bi-command"></i>K</span
                      >
                      / drag-and-drop / copy-and-paste
                    </span>
                  `},  
                },
              });

              this.onclick = () => {
                this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--attachments"]').click();
              };

              const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

              (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+k", () => { this.click(); return false; });
            `}"
          >
            <i class="bi bi-paperclip"></i>
          </button>
          <input
            key="content-editor--write--attachments"
            type="file"
            multiple
            hidden
            javascript="${javascript`
              this.isModified = false;

              const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

              this.upload = async (fileList) => {
                if (!checkIsSignedIn()) return;
                const body = new FormData();
                for (const file of fileList) body.append("attachments", file);
                this.value = "";
                tippy.hideAll();
                textarea.uploadingIndicator.show();
                textarea.disabled = true;
                const response = await (await fetch(${`https://${application.configuration.hostname}/content-editor/attachments`}, {
                  method: "POST",
                  headers: { "CSRF-Protection": "true", },
                  cache: "no-store",
                  body,
                })).text();
                textarea.disabled = false;
                textarea.uploadingIndicator.hide();
                textFieldEdit.wrapSelection(textarea, response, "");
                textarea.focus();
              };

              const checkIsSignedIn = (() => {
                if (${
                  response.locals.user === undefined ||
                  response.locals.user.emailVerifiedAt === null
                }) {
                  leafac.setTippy({
                    event,
                    element: textarea,
                    tippyProps: {
                      trigger: "manual",
                      theme: "rose",
                      content: "You must sign in to upload files.",
                    },
                  });

                  return () => {
                    textarea.tooltip.show();
                    return false;
                  };
                } else
                  return () => true;
              })();

              leafac.setTippy({
                event,
                element: textarea,
                elementProperty: "uploadingIndicator",
                tippyProps: {
                  trigger: "manual",
                  hideOnClick: false,
                  content: ${html`
                    <div
                      css="${css`
                        display: flex;
                        gap: var(--space--2);
                      `}"
                    >
                      $${application.web.locals.partials.spinner({
                        request,
                        response,
                      })}
                      Uploading…
                    </div>
                  `},  
                },
              });

              this.onclick = (event) => {
                if (!checkIsSignedIn()) event.preventDefault();
              };

              this.onchange = () => {
                this.upload(this.files);
              };
            `}"
          />
          <button
            type="button"
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Block",
                },
              });

              leafac.setTippy({
                event,
                element: this,
                elementProperty: "dropdown",
                tippyProps: {
                  trigger: "click",
                  interactive: true,
                  content: ${html`
                    <div
                      css="${css`
                        max-height: 40vh;
                        overflow: auto;
                        display: flex;
                        flex-direction: column;
                        gap: var(--space--2);
                      `}"
                    >
                      $${response.locals.course !== undefined &&
                      !(
                        response.locals.enrollment?.courseRole === "student" &&
                        response.locals.course.studentsMayCreatePollsAt === null
                      )
                        ? html`
                            <div class="dropdown--menu">
                              <button
                                type="button"
                                class="dropdown--menu--item button button--transparent"
                                javascript="${javascript`
                                  this.onclick = () => {
                                    tippy.hideAll();
                                    const write = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]');
                                    if (write.querySelector('[key="poll-editor"]') !== null) return;
                                    const poll = leafac.stringToElement(${partialPollEditor(
                                      {
                                        request: request as any,
                                        response: response as any,
                                      }
                                    )}).querySelector('[key="poll-editor"]');
                                    write.insertAdjacentElement("afterbegin", poll);
                                    leafac.execute({ element: poll });
                                  };
                                `}"
                              >
                                <i class="bi bi-card-checklist"></i>
                                Poll
                              </button>
                            </div>

                            <hr class="dropdown--separator" />
                          `
                        : html``}

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "- ", "TEXT\\n\\n");
                                textarea.selectionEnd += "TEXT".length;
                              } else {
                                const replacement = textFieldEdit.getSelection(textarea).split("\\n").map((line) => "- " + line).join("\\n");
                                const selectionStart = textarea.selectionStart + ((textarea.selectionStart > 0) ? "\\n\\n" : "").length;
                                textFieldEdit.insert(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + replacement + "\\n\\n");
                                textarea.selectionStart = selectionStart;
                                textarea.selectionEnd = textarea.selectionStart + replacement.length;
                              }
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+8", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-list-ul"></i>
                          Bulleted List
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+8</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>8</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "1. ", "TEXT\\n\\n");
                                textarea.selectionEnd += "TEXT".length;
                              } else {
                                const replacement = textFieldEdit.getSelection(textarea).split("\\n").map((line, index) => String(index + 1) + ". " + line).join("\\n");
                                const selectionStart = textarea.selectionStart + ((textarea.selectionStart > 0) ? "\\n\\n" : "").length;
                                textFieldEdit.insert(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + replacement + "\\n\\n");
                                textarea.selectionStart = selectionStart;
                                textarea.selectionEnd = textarea.selectionStart + replacement.length;
                              }
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+7", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-list-ol"></i>
                          Numbered List
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+7</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>7</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "- [ ] ", "TEXT (USE [X] TO MARK ITEM AS DONE)\\n\\n");
                                textarea.selectionEnd += "TEXT (USE [X] TO MARK ITEM AS DONE)".length;
                              } else {
                                const replacement = textFieldEdit.getSelection(textarea).split("\\n").map((line) => "- [ ] " + line).join("\\n");
                                const selectionStart = textarea.selectionStart + ((textarea.selectionStart > 0) ? "\\n\\n" : "").length;
                                textFieldEdit.insert(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + replacement + "\\n\\n");
                                textarea.selectionStart = selectionStart;
                                textarea.selectionEnd = textarea.selectionStart + replacement.length;
                              }
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+9", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-list-check"></i>
                          Checklist
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+9</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>9</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "> ", "TEXT\\n\\n");
                                textarea.selectionEnd += "TEXT".length;
                              } else {
                                const replacement = textFieldEdit.getSelection(textarea).split("\\n").map((line) => "> " + line).join("\\n");
                                const selectionStart = textarea.selectionStart + ((textarea.selectionStart > 0) ? "\\n\\n" : "").length;
                                textFieldEdit.insert(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + replacement + "\\n\\n");
                                textarea.selectionStart = selectionStart;
                                textarea.selectionEnd = textarea.selectionStart + replacement.length;
                              }
                              textarea.focus();
                            };

                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+'", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-quote"></i>
                          Blockquote
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+'</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-command"></i>'</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              const selectionStart = textarea.selectionStart + (textFieldEdit.getSelection(textarea) + ((textarea.selectionEnd > 0) ? "\\n\\n" : "") + "| ").length;
                              textFieldEdit.insert(textarea, textFieldEdit.getSelection(textarea) + ((textarea.selectionEnd > 0) ? "\\n\\n" : "") + "| HEADING | HEADING |\\n|---------|---------|\\n| CONTENT | CONTENT |\\n\\n");
                              textarea.selectionStart = selectionStart;
                              textarea.selectionEnd = textarea.selectionStart + "HEADING".length;
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+t", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-table"></i>
                          Table
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+T</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>T</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "<details>\\n<summary>", "SUMMARY</summary>\\n\\nCONTENT\\n\\n</details>\\n\\n");
                                textarea.selectionEnd += "SUMMARY".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "<details>\\n<summary>SUMMARY</summary>\\n\\n", "\\n\\n</details>\\n\\n");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+d", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-chevron-bar-expand"></i>
                          Disclosure
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+D</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>D</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              const identifier = Math.random().toString(36).slice(2);
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, "[^footnote--" + identifier + "]\\n\\n[^footnote--" + identifier + "]: ", "FOOTNOTE");
                                textarea.selectionEnd += "FOOTNOTE".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, "[^footnote--" + identifier + "]\\n\\n[^footnote--" + identifier + "]: ", "");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+f", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-card-text"></i>
                          Footnote
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+F</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>F</span
                            >
                          </span>
                        </button>
                      </div>

                      <hr class="dropdown--separator" />

                      <div class="dropdown--menu">
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "$$\\n", "LATEX\\n$$\\n\\n");
                                textarea.selectionEnd += "LATEX".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "$$\\n", "\\n$$\\n\\n");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+shift+e", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-calculator"></i>
                          Mathematics (LaTeX)
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+Shift+E</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>E</span
                            >
                          </span>
                        </button>
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          javascript="${javascript`
                            const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                            this.onclick = () => {
                              this.closest("[data-tippy-root]")._tippy.hide();
                              if (textarea.selectionStart === textarea.selectionEnd) {
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "\`\`\`", "LANGUAGE\\nCODE\\n\`\`\`\\n\\n");
                                textarea.selectionEnd += "LANGUAGE".length;
                              }
                              else
                                textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "\`\`\`LANGUAGE\\n", "\\n\`\`\`\\n\\n");
                              textarea.focus();
                            };
                        
                            (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+e", () => { this.click(); return false; });
                          `}"
                        >
                          <i class="bi bi-braces"></i>
                          Code
                          <span class="keyboard-shortcut">
                            <span
                              javascript="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Shift+E</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-shift"></i
                              ><i class="bi bi-command"></i>E</span
                            >
                          </span>
                        </button>
                      </div>
                    </div>
                  `},  
                },
              });
            `}"
          >
            <i class="bi bi-textarea-t"></i>
          </button>
          $${response.locals.course !== undefined
            ? html`
                <button
                  type="button"
                  class="button button--tight button--transparent"
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: "Mentions & References",
                      },
                    });

                    leafac.setTippy({
                      event,
                      element: this,
                      elementProperty: "dropdown",
                      tippyProps: {
                        trigger: "click",
                        interactive: true,
                        content: ${html`
                          <div
                            css="${css`
                              max-height: 40vh;
                              overflow: auto;
                              display: flex;
                              flex-direction: column;
                              gap: var(--space--2);
                            `}"
                          >
                            <div class="dropdown--menu">
                              <button
                                type="button"
                                class="dropdown--menu--item button button--transparent"
                                javascript="${javascript`
                                  const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
                
                                  this.onclick = () => {
                                    this.closest("[data-tippy-root]")._tippy.hide();
                                    textFieldEdit.wrapSelection(textarea, " @", "");
                                    textarea.focus();
                                  };
                                `}"
                              >
                                <i class="bi bi-at"></i>
                                Mention Person
                                <span class="keyboard-shortcut">@</span>
                              </button>
                              <button
                                type="button"
                                class="dropdown--menu--item button button--transparent"
                                javascript="${javascript`
                                  const textarea = this.closest("[data-tippy-root]")._tippy.reference.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
                
                                  this.onclick = () => {
                                    this.closest("[data-tippy-root]")._tippy.hide();
                                    textFieldEdit.wrapSelection(textarea, " #", "");
                                    textarea.focus();
                                  };
                                `}"
                              >
                                <i class="bi bi-hash"></i>
                                Refer to Conversation or Message
                                <span class="keyboard-shortcut">#</span>
                              </button>
                            </div>
                          </div>
                        `},  
                      },
                    });
                  `}"
                >
                  <i class="bi bi-at"></i>
                </button>
              `
            : html``}
          <label
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: ${html`
                    Programmer Mode
                    <span class="secondary">(Monospaced Font)</span>
                  `},
                },
              });
            `}"
          >
            <input
              type="checkbox"
              $${typeof response.locals.user
                ?.preferContentEditorProgrammerModeAt === "string"
                ? html`checked`
                : html``}
              class="visually-hidden input--radio-or-checkbox--multilabel"
              javascript="${javascript`
                this.isModified = false;
          
                const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');
          
                this.onchange = async () => {
                  textarea.classList[this.checked ? "add" : "remove"]("content-editor--write--textarea--programmer-mode");
                  await fetch(${`https://${application.configuration.hostname}/preferences`}, {
                    method: "PATCH",
                    headers: { "CSRF-Protection": "true", },
                    cache: "no-store",
                    body: new URLSearchParams({ preferContentEditorProgrammerMode: String(this.checked), }),
                  });
                };
              `}"
            />
            <span>
              <i class="bi bi-braces-asterisk"></i>
            </span>
            <span class="text--blue">
              <i class="bi bi-braces-asterisk"></i>
            </span>
          </label>
          <a
            href="https://${application.configuration
              .hostname}/help/styling-content"
            target="_blank"
            class="button button--tight button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Help",
                },
              });
            `}"
          >
            <i class="bi bi-info-circle"></i>
          </a>
        </div>
      </div>
      <div
        css="${css`
          background-color: var(--color--gray--medium--200);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--700);
          }
          border-radius: var(--border-radius--lg);
        `}"
      >
        <div key="content-editor--write">
          <div
            css="${css`
              display: grid;
              & > * {
                grid-area: 1 / 1;
              }
            `}"
          >
            <div>
              <div
                css="${css`
                  position: relative;
                `}"
              >
                <div
                  key="content-editor--write--textarea--dropdown-menu-target"
                  css="${css`
                    width: var(--space--0);
                    height: var(--line-height--sm);
                    position: absolute;
                  `}"
                ></div>
                <textarea
                  key="content-editor--write--textarea"
                  name="${name}"
                  $${required ? html`required` : html``}
                  class="input--text input--text--textarea ${typeof response
                    .locals.user?.preferContentEditorProgrammerModeAt ===
                  "string"
                    ? "content-editor--write--textarea--programmer-mode"
                    : ""}"
                  style="
                    --height: ${compact
                    ? `var(--space--14)`
                    : `var(--space--20)`};
                  "
                  css="${css`
                    height: var(--height);
                    max-height: var(--space--64);

                    &.drag {
                      background-color: var(--color--blue--200);
                      @media (prefers-color-scheme: dark) {
                        background-color: var(--color--blue--900);
                      }
                    }

                    &.content-editor--write--textarea--programmer-mode {
                      font-family: "JetBrains MonoVariable",
                        var(--font-family--monospace);
                      font-variant-ligatures: none;
                    }
                  `} ${compact
                    ? css`
                        padding-right: var(--space--8);
                      `
                    : css``}"
                  javascript="${javascript`
                    if (${!modifiable}) this.isModified = false;

                    autosize(this);
                    autosize.update(this);
    
                    this.ondragenter = () => {
                      this.classList.add("drag");
                    };
                    this.ondragleave = () => {
                      this.classList.remove("drag");
                    };
    
                    this.ondragover = (event) => {
                      if (!event.dataTransfer.types.includes("Files")) return;
                      event.preventDefault();
                    };
                    this.ondrop = (event) => {
                      this.classList.remove("drag");
                      if (event.dataTransfer.files.length === 0) return;
                      event.preventDefault();
                      this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--attachments"]').upload(event.dataTransfer.files);
                    };
    
                    this.onpaste = (event) => {
                      if (event.clipboardData.files.length === 0) return;
                      event.preventDefault();
                      this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--attachments"]').upload(event.clipboardData.files);
                    };
    
                    if (${response.locals.course !== undefined}) {
                      const dropdownMenuTarget = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea--dropdown-menu-target"]');
    
                      const dropdownMenus = [
                        {
                          trigger: "@",
                          route: ${`https://${
                            application.configuration.hostname
                          }/courses/${response.locals.course?.reference}/${
                            response.locals.conversation !== undefined
                              ? `conversations/${response.locals.conversation.reference}/`
                              : ``
                          }content-editor/mention-user-search`},
                          emptySearch: ${html`
                            <button
                              type="button"
                              class="dropdown--menu--item button button--transparent"
                              javascript="${javascript`
                                this.onclick = () => {
                                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete("everyone");
                                };
                              `}"
                            >
                              Everyone in the Conversation
                            </button>
                            <button
                              type="button"
                              class="dropdown--menu--item button button--transparent"
                              javascript="${javascript`
                                this.onclick = () => {
                                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete("staff");
                                };
                              `}"
                            >
                              Staff in the Conversation
                            </button>
                            <button
                              type="button"
                              class="dropdown--menu--item button button--transparent"
                              javascript="${javascript`
                                this.onclick = () => {
                                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete("students");
                                };
                              `}"
                            >
                              Students in the Conversation
                            </button>
                            <div class="dropdown--menu--item secondary">
                              Start typing to search…
                            </div>
                          `},
                          dropdownMenu: leafac.setTippy({
                            event,
                            element: dropdownMenuTarget,
                            elementProperty: "dropdownMenuMention",
                            tippyProps: {
                              placement: "bottom-start",
                              trigger: "manual",
                              interactive: true,
                              content: ${html`
                                <div
                                  css="${css`
                                    width: var(--space--56);
                                    max-height: var(--space--44);
                                    overflow: auto;
                                  `}"
                                >
                                  <p class="heading">
                                    <i class="bi bi-at"></i>
                                    Mention Person
                                  </p>
                                  <div
                                    key="search-results"
                                    class="dropdown--menu"
                                  ></div>
                                </div>
                              `},  
                            },
                          }),
                        },
                        {
                          trigger: "#",
                          route: ${`https://${application.configuration.hostname}/courses/${response.locals.course?.reference}/content-editor/refer-to-conversation-or-message-search`},
                          emptySearch: ${html`
                            <div class="dropdown--menu--item secondary">
                              Start typing to search…
                            </div>
                          `},
                          dropdownMenu: leafac.setTippy({
                            event,
                            element: dropdownMenuTarget,
                            elementProperty: "dropdownMenuReference",
                            tippyProps: {
                              placement: "bottom-start",
                              trigger: "manual",
                              interactive: true,
                              content: ${html`
                                <div
                                  css="${css`
                                    width: var(--space--72);
                                    max-height: var(--space--44);
                                    overflow: auto;
                                  `}"
                                >
                                  <p class="heading">
                                    <i class="bi bi-hash"></i>
                                    Refer to Conversation or Message
                                  </p>
                                  <div
                                    key="search-results"
                                    class="dropdown--menu"
                                  ></div>
                                </div>
                              `},  
                            },
                          }),
                        },
                      ];
    
                      let anchorIndex = null;
    
                      this.oninput = (() => {
                        let isUpdating = false;
                        let shouldUpdateAgain = false;
                        return async () => {
                          for (const { trigger, route, emptySearch, dropdownMenu } of dropdownMenus) {
                            if (!dropdownMenu.state.isShown) {
                              if (
                                (this.selectionStart > 1 && this.value[this.selectionStart - 2].match(/^\\s$/) === null) ||
                                this.value[this.selectionStart - 1] !== trigger
                              ) continue;
                              anchorIndex = this.selectionStart;
                              const caretCoordinates = caretPos.position(this);
                              dropdownMenuTarget.style.top = String(caretCoordinates.top - this.scrollTop) + "px";
                              dropdownMenuTarget.style.left = String(caretCoordinates.left - 15) + "px";
                              tippy.hideAll();
                              dropdownMenu.show();
                            }
                            const search = this.value.slice(anchorIndex, this.selectionStart);
                            if (this.selectionStart < anchorIndex || search.match(/[^a-z0-9\\/]/i) !== null) {
                              dropdownMenu.hide();
                              continue;
                            }
                            if (isUpdating) {
                              shouldUpdateAgain = true;
                              continue;
                            }
                            isUpdating = true;
                            shouldUpdateAgain = false;
                            const content = dropdownMenu.props.content;
                            const searchResults = content.querySelector('[key="search-results"]');
                            searchResults.partialParentElement = true;
                            if (search === "")
                              searchResults.innerHTML = emptySearch;
                            else
                              leafac.loadPartial(
                                searchResults,
                                await (await fetch(route + "?" + new URLSearchParams({ search }), { cache: "no-store" })).text()
                              );
                            const buttons = content.querySelectorAll(".button");
                            for (const button of buttons) button.classList.remove("hover");
                            if (buttons.length > 0) buttons[0].classList.add("hover");
                            isUpdating = false;
                            if (shouldUpdateAgain) this.oninput();
                          }
                        }
                      })();
    
                      this.onkeydown = (event) => {
                        for (const { dropdownMenu } of dropdownMenus) {
                          if (!dropdownMenu.state.isShown) continue;
                          const content = dropdownMenu.props.content;
                          switch (event.code) {
                            case "ArrowUp":
                            case "ArrowDown":
                              event.preventDefault();
                              const buttons = [...content.querySelectorAll(".button")];
                              if (buttons.length === 0) continue;    
                              const currentHoverIndex = buttons.indexOf(content.querySelector(".button.hover"));
                              if (
                                currentHoverIndex === -1 ||
                                (event.code === "ArrowUp" && currentHoverIndex === 0) ||
                                (event.code === "ArrowDown" && currentHoverIndex === buttons.length - 1)
                              ) continue;
                              buttons[currentHoverIndex].classList.remove("hover");
                              const buttonToHover = buttons[currentHoverIndex + (event.code === "ArrowUp" ? -1 : 1)];
                              buttonToHover.classList.add("hover");
                              scrollIntoViewIfNeeded(buttonToHover, { scrollMode: "if-needed" });
                              break;
                            case "Enter":
                            case "Tab":
                              const buttonHover = content.querySelector(".button.hover");
                              if (buttonHover === null) dropdownMenu.hide();
                              else {
                                event.preventDefault();
                                buttonHover.click();
                              }
                              break;
                            case "Escape":
                            case "ArrowLeft":
                            case "ArrowRight":
                            case "Home":
                            case "End":
                              dropdownMenu.hide();
                              break;
                          }
                        }
                      };
    
                      this.dropdownMenuComplete = (text) => {
                        this.setSelectionRange(anchorIndex, this.selectionStart);
                        textFieldEdit.insert(this, text);
                        tippy.hideAll();
                        this.focus();
                      };

                      this.onclick = this.onkeyup = () => {
                        if (this.closest('[key="content-editor"]').querySelector('[key="poll-editor"]') !== null) return;
                        
                        for (const match of this.value.matchAll(/<courselore-poll\\s+reference="(?<pollReference>\\d+)"><\\/courselore-poll>/g))
                          if (match.index <= this.selectionStart && this.selectionStart <= match.index + match[0].length) {
                            const caretCoordinates = caretPos.position(this);
                            dropdownMenuTarget.style.top = String(caretCoordinates.top - this.scrollTop) + "px";
                            dropdownMenuTarget.style.left = String(caretCoordinates.left) + "px";

                            (window.locals ??= {}).editPollReference = match.groups.pollReference;

                            leafac.setTippy({
                              event,
                              element: dropdownMenuTarget,
                              elementProperty: "dropdownPollEdit",
                              tippyProps: {
                                trigger: "manual",
                                interactive: true,
                                content: ${html`
                                  <div class="dropdown--menu">
                                    <button
                                      type="button"
                                      class="dropdown--menu--item button button--transparent"
                                      javascript="${javascript`
                                        this.onclick = async () => {
                                          const loading = this.querySelector('[key="loading"]');
                                          loading.hidden = false;
                                          const response = await fetch(${`https://${application.configuration.hostname}/courses/${response.locals.course?.reference}/polls/`} + window.locals.editPollReference + ${`/edit${qs.stringify(
                                        {
                                          redirect:
                                            request.originalUrl.slice(1),
                                        },
                                        { addQueryPrefix: true }
                                      )}`}, { cache: "no-store" });
                                          loading.hidden = true;
                                          if (!response.ok) {
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              elementProperty: "errorTooltip",
                                              tippyProps: {
                                                theme: "rose",
                                                trigger: "manual",
                                                content: await response.text(),
                                              },
                                            });
                                            this.errorTooltip.show();
                                            return;
                                          }
                                          const poll = leafac.stringToElement(await response.text()).querySelector('[key="poll-editor"]');
                                          this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]').insertAdjacentElement("afterbegin", poll);
                                          leafac.execute({ element: poll });
                                          tippy.hideAll();
                                        };
                                      `}"
                                    >
                                      <i class="bi bi-pencil"></i>
                                      Edit Poll
                                      <div key="loading" hidden>
                                        $${application.web.locals.partials.spinner(
                                          {
                                            request,
                                            response,
                                            size: 10,
                                          }
                                        )}
                                      </div>
                                    </button>
                                  </div>
                                `},  
                              },
                            });

                            tippy.hideAll();
                            dropdownMenuTarget.dropdownPollEdit.show();

                            return;
                          }

                        dropdownMenuTarget.dropdownPollEdit?.hide?.();
                      };
                    }
                  `}"
                >
${contentSource}</textarea
                >
              </div>
            </div>
            $${compact
              ? html`
                  <button
                    type="button"
                    class="button button--transparent"
                    css="${css`
                      position: relative;
                      justify-self: end;
                      &:hover,
                      &:focus-within {
                        background-color: var(--color--gray--medium--300);
                      }
                      &:active {
                        background-color: var(--color--gray--medium--400);
                      }
                      @media (prefers-color-scheme: dark) {
                        &:hover,
                        &:focus-within {
                          background-color: var(--color--gray--medium--600);
                        }
                        &:active {
                          background-color: var(--color--gray--medium--500);
                        }
                      }
                      width: var(--font-size--2xl);
                      height: var(--font-size--2xl);
                      padding: var(--space--0);
                      border-radius: var(--border-radius--circle);
                      margin: var(--space--1);
                      align-items: center;
                    `}"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Toolbar",
                        },
                      });

                      this.onclick = async () => {
                        const toolbar = this.closest('[key="content-editor"]').querySelector('[key="content-editor--toolbar"]');
                        toolbar.hidden = !toolbar.hidden;
                        await fetch(${`https://${application.configuration.hostname}/preferences`}, {
                          method: "PATCH",
                          headers: { "CSRF-Protection": "true", },
                          cache: "no-store",
                          body: new URLSearchParams({ preferContentEditorToolbarInCompact: String(!toolbar.hidden), }),
                        });
                      };
                    `}"
                  >
                    <i class="bi bi-three-dots-vertical"></i>
                  </button>
                `
              : html``}
          </div>
        </div>

        <div
          key="content-editor--loading"
          hidden
          class="strong"
          css="${css`
            padding: var(--space--4);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: var(--space--2);
          `}"
        >
          $${application.web.locals.partials.spinner({
            request,
            response,
          })}
          Loading…
        </div>

        <div
          key="content-editor--preview"
          hidden
          css="${css`
            padding: var(--space--2) var(--space--4);
          `}"
        ></div>
      </div>
    </div>
  `;

  const partialPollEditor = ({
    request,
    response,
    poll = undefined,
  }: {
    request: express.Request<
      {},
      any,
      {},
      { redirect?: string },
      Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    poll?: ResponseLocalsPoll["poll"];
  }): HTML => {
    const partialOption = ({
      option = undefined,
      order = 0,
    }: {
      option?: ResponseLocalsPoll["poll"]["options"][number] | undefined;
      order?: number;
    } = {}): HTML => html`
      <div key="poll-editor--option/${option?.reference ?? "new"}">
        $${option !== undefined
          ? html`
              <input
                type="hidden"
                name="options[${String(order)}][reference]"
                value="${option.reference}"
              />
            `
          : html``}

        <button
          key="poll-editor--option--grab--handle"
          type="button"
          class="button button--tight button--tight--inline button--transparent"
          javascript="${javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: "Drag to Reorder",
              },
            });
          `}"
        >
          <i class="bi bi-grip-vertical"></i>
        </button>

        <input
          type="text"
          name="options[${String(order)}][content]"
          $${option !== undefined
            ? html`value="${option.contentSource}"`
            : html`placeholder=" "`}
          required
          autocomplete="off"
          class="input--text"
          $${option === undefined
            ? html`
                javascript="${javascript`
                  this.isModified = true;
                `}"
              `
            : html``}
        />

        <button
          type="button"
          class="button button--tight button--tight--inline button--transparent"
          javascript="${javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                theme: "rose",
                touch: false,
                content: "Remove Option",
              },
            });

            this.onclick = () => {
              const options = this.closest('[key="poll-editor--options"]');
              this.closest('[key^="poll-editor--option/"]').remove();
              options.reorder();
            };
          `}"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
    `;

    return html`
      <div
        key="poll-editor"
        css="${css`
          [key="content-editor"] & {
            padding: var(--space--2);
          }
        `}"
      >
        <div
          css="${css`
            [key="content-editor"] & {
              padding-bottom: var(--space--2);
              border-bottom: var(--border-width--1) solid
                var(--color--gray--medium--300);
              @media (prefers-color-scheme: dark) {
                border-color: var(--color--gray--medium--600);
              }
            }
          `}"
        >
          <div
            key="poll-editor--content"
            css="${css`
              [key="content-editor"] & {
                background-color: var(--color--gray--medium--50);
                @media (prefers-color-scheme: dark) {
                  background-color: var(--color--gray--medium--900);
                }
                padding: var(--space--2) var(--space--4);
                border-radius: var(--border-radius--lg);
              }
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div class="heading">
              <i class="bi bi-card-checklist"></i>
              Poll
            </div>

            <div
              css="${css`
                display: flex;
                flex-wrap: wrap;
                column-gap: var(--space--10);
                row-gap: var(--space--4);
              `}"
            >
              <div class="label">
                <p class="label--text">Choices</p>
                <div
                  css="${css`
                    display: flex;
                    gap: var(--space--8);
                  `}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="choices"
                      value="single"
                      required
                      $${poll !== undefined && poll.multipleChoicesAt === null
                        ? html`checked`
                        : html``}
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                    />
                    <span>
                      <i class="bi bi-ui-radios"></i>
                      Single
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-ui-radios"></i>
                      Single
                    </span>
                  </label>
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="choices"
                      value="multiple"
                      required
                      $${poll !== undefined &&
                      typeof poll.multipleChoicesAt === "string"
                        ? html`checked`
                        : html``}
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                    />
                    <span>
                      <i class="bi bi-ui-checks"></i>
                      Multiple
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-ui-checks"></i>
                      Multiple
                    </span>
                  </label>
                </div>
              </div>

              <div class="label">
                <p class="label--text">Closing</p>
                <div
                  css="${css`
                    display: flex;
                    gap: var(--space--2);
                    align-items: flex-start;
                  `}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      $${typeof poll?.closesAt === "string"
                        ? html`checked`
                        : html``}
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      javascript="${javascript`
                        this.onchange = () => {
                          const closesAt = this.closest('[key="poll-editor"]').querySelector('[key="poll-editor--closes-at"]');
                          closesAt.hidden = !this.checked;
                          for (const element of leafac.descendants(closesAt))
                            if (element.disabled !== undefined) element.disabled = !this.checked;
                        };
                      `}"
                    />
                    <span
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "Set as Closing",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Close
                    </span>
                    <span
                      class="text--amber"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "Set as Not Closing",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-plus-fill"></i>
                      Closes at
                    </span>
                  </label>
                  <div
                    key="poll-editor--closes-at"
                    $${poll === undefined || poll.closesAt === null
                      ? html`hidden`
                      : html``}
                    css="${css`
                      display: flex;
                      gap: var(--space--2);
                      align-items: flex-start;
                    `}"
                  >
                    <input
                      type="text"
                      name="closesAt"
                      value="${poll?.closesAt ?? new Date().toISOString()}"
                      required
                      autocomplete="off"
                      $${poll === undefined || poll.closesAt === null
                        ? html`disabled`
                        : html``}
                      class="input--text"
                      css="${css`
                        width: var(--space--40);
                        margin: var(--space---2) var(--space--0);
                      `}"
                      javascript="${javascript`
                        this.value = this.defaultValue = leafac.localizeDateTime(this.defaultValue);

                        this.onvalidate = () => {
                          const error = leafac.validateLocalizedDateTime(this);
                          if (typeof error === "string") return error;
                          if (new Date(this.value).getTime() <= Date.now()) return "Must be in the future.";
                        };
                      `}"
                    />
                    <button
                      type="button"
                      class="button button--tight button--tight--inline button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            trigger: "click",
                            content: "This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving time change.",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="label">
              <p class="label--text">Options</p>
              <div
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `}"
              >
                <div
                  key="poll-editor--options"
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);

                    [key^="poll-editor--option/"] {
                      display: flex;
                      gap: var(--space--2);
                      align-items: center;

                      transition-property: var(--transition-property--opacity);
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--in-out
                      );

                      &.grabbed {
                        opacity: var(--opacity--50);
                      }

                      [key="poll-editor--option--grab--handle"]:not(.disabled) {
                        cursor: grab;
                      }
                    }
                  `}"
                  javascript="${javascript`
                    this.onbeforemorph = (event) => {
                      const liveUpdate = event?.detail?.liveUpdate;
                      if (!liveUpdate) this.isModified = false;
                      return !liveUpdate;
                    };

                    this.onpointerdown = (event) => {
                      if (event.target.closest('[key="poll-editor--option--grab--handle"]') === null) return;

                      const body = document.querySelector("body");
                      const option = event.target.closest('[key^="poll-editor--option/"]');

                      this.grabbed = option;
                      body.classList.add("grabbing");
                      option.classList.add("grabbed");

                      body.addEventListener("pointerup", () => {
                        delete this.grabbed;
                        body.classList.remove("grabbing");
                        option.classList.remove("grabbed");
                      }, { once: true });
                    };

                    this.onpointermove = (event) => {
                      const option = (
                        event.pointerType === "touch" ? document.elementFromPoint(event.clientX, event.clientY) : event.target
                      ).closest('[key^="poll-editor--option/"]');
                      if (option === null || [undefined, option].includes(this.grabbed)) return;

                      const boundingClientRect = option.getBoundingClientRect();
                      option[
                        (event.clientY - boundingClientRect.top) / (boundingClientRect.bottom - boundingClientRect.top) < 0.5 ?
                        "after" : "before"
                      ](this.grabbed);
                      this.reorder();
                    };

                    this.onkeydown = (event) => {
                      if (event.target.closest('[key="poll-editor--option--grab--handle"]') === null) return;

                      const option = event.target.closest('[key^="poll-editor--option/"]');
                      switch (event.code) {
                        case "ArrowUp":
                          event.preventDefault();
                          option.previousElementSibling?.before?.(option);
                          break;
                        case "ArrowDown":
                          event.preventDefault();
                          option.nextElementSibling?.after?.(option);
                          break;
                      }
                      option.querySelector('[key="poll-editor--option--grab--handle"]').focus();
                      this.reorder();
                    };

                    this.reorder = () => {
                      this.isModified = true;

                      for (const [order, option] of this.querySelectorAll('[key^="poll-editor--option/"]').entries())
                        for (const element of option.querySelectorAll('[name^="options["]'))
                          element.setAttribute("name", element.getAttribute("name").replace(/\\d+/, String(order)));
                    };
                  `}"
                >
                  $${poll !== undefined
                    ? poll.options.map((option, order) =>
                        partialOption({ option, order })
                      )
                    : html``}
                </div>
                <div
                  css="${css`
                    display: flex;
                    justify-content: center;
                  `}"
                >
                  <button
                    type="button"
                    class="button button--full-width-on-small-screen button--transparent"
                    javascript="${javascript`
                      this.onclick = () => {
                        const newOption = leafac.stringToElement(${partialOption()}).querySelector('[key="poll-editor--option/new"]');

                        const options = this.closest('[key="poll-editor"]').querySelector('[key="poll-editor--options"]');
                        options.insertAdjacentElement("beforeend", newOption);
                        leafac.execute({ element: newOption });
                        options.reorder();
                      };

                      if (${poll === undefined} && !event?.detail?.liveUpdate)
                        for (const initialOptions of new Array(3))
                          this.onclick();

                      this.onvalidate = () => {
                        if (this.closest("[hidden]") === null && this.closest('[key="poll-editor"]').querySelector('[key="poll-editor--options"]').children.length <= 1)
                          return "Please add at least two options.";
                      };
                    `}"
                  >
                    <i class="bi bi-plus-circle"></i>
                    Add Option
                  </button>
                </div>
              </div>
            </div>

            <div
              css="${css`
                display: flex;
                gap: var(--space--2);
                align-items: center;
              `}"
            >
              <button
                class="button button--blue"
                javascript="${javascript`
                  if (this.closest('[key^="poll/"]') !== null) return;
                  
                  this.setAttribute("type", "button");

                  this.onclick = async () => {
                    const pollEditor = this.closest('[key="poll-editor"]');
                    const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                    if (!leafac.validate(pollEditor)) return;

                    const body = leafac.serialize(pollEditor);

                    leafac.morph(pollEditor.querySelector('[key="poll-editor--content"]'), ${html`
                      <div
                        class="strong"
                        css="${css`
                          display: flex;
                          justify-content: center;
                          align-items: center;
                          gap: var(--space--2);
                        `}"
                      >
                        $${application.web.locals.partials.spinner({
                          request,
                          response,
                        })}
                        $${poll === undefined ? html`Creating` : html`Updating`}
                        Poll…
                      </div>
                    `});

                    const content = await (await fetch(${`https://${
                      application.configuration.hostname
                    }/courses/${response.locals.course.reference}/polls${
                      poll !== undefined ? `/${poll.reference}` : ``
                    }`}, {
                      method: ${poll === undefined ? "POST" : "PUT"},
                      headers: { "CSRF-Protection": "true", },
                      cache: "no-store",
                      body,
                    })).text();

                    pollEditor.remove();

                    if (${poll === undefined})
                      textFieldEdit.insert(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + content + "\\n\\n");
                    textarea.focus();
                  };
                `}"
              >
                $${poll === undefined
                  ? html`
                      <i class="bi bi-card-checklist"></i>
                      Create Poll
                    `
                  : html`
                      <i class="bi bi-pencil-fill"></i>
                      Update Poll
                    `}
              </button>

              <button
                type="button"
                class="button button--tight button--tight--inline button--transparent"
                javascript="${javascript`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      trigger: "click",
                      content: "Staff and the poll creator may see individual votes. Students may see aggregate results.",
                    },
                  });
                `}"
              >
                <i class="bi bi-info-circle"></i>
              </button>

              $${poll !== undefined &&
              (poll.closesAt === null ||
                !application.web.locals.helpers.isPast(poll.closesAt))
                ? html`
                    <button
                      formmethod="PATCH"
                      formaction="https://${application.configuration
                        .hostname}/courses/${response.locals.course
                        .reference}/polls/${poll.reference}${qs.stringify(
                        {
                          redirect:
                            request.query.redirect ??
                            request.originalUrl.slice(1),
                        },
                        { addQueryPrefix: true }
                      )}"
                      name="close"
                      value="true"
                      class="button button--transparent"
                      javascript="${javascript`
                        this.onclick = () => {
                          this.closest("form").isValid = true;
                        };
                      `}"
                    >
                      <i class="bi bi-calendar-x"></i>
                      Close Poll
                    </button>
                  `
                : html``}

              <button
                type="button"
                class="button button--transparent"
                javascript="${javascript`
                  this.onclick = () => {
                    const poll = this.closest('[key^="poll/"]');
                    if (poll !== null) {
                      poll.querySelector('[key="poll--show"]').hidden = false;
                      poll.querySelector('[key="poll--edit"]').hidden = true;
                    }
                    this.closest('[key="poll-editor"]').remove();
                  };
                `}"
              >
                <i class="bi bi-x-lg"></i>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  application.web.get<
    { courseReference: string; conversationReference?: string },
    any,
    {},
    { search?: string },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["Conversation"]>
  >(
    [
      "/courses/:courseReference/content-editor/mention-user-search",
      "/courses/:courseReference/conversations/:conversationReference/content-editor/mention-user-search",
    ],
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        (request.params.conversationReference !== undefined &&
          response.locals.conversation === undefined)
      )
        return next();

      if (
        typeof request.query.search !== "string" ||
        request.query.search.trim() === ""
      )
        return next("Validation");

      let result = html``;

      for (const mention of ["everyone", "staff", "students"])
        if (mention.startsWith(request.query.search.toLowerCase()))
          result += html`
            <button
              type="button"
              class="dropdown--menu--item button button--transparent"
              javascript="${javascript`
                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${mention});
                };
              `}"
            >
              <span>
                <mark class="mark">${lodash.capitalize(mention)}</mark> in the
                Conversation
              </span>
            </button>
          `;

      for (const enrollment of application.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          userNameSearchResultHighlight: string;
          reference: string;
          courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        }>(
          sql`
            SELECT
              "enrollments"."id",
              "users"."id" AS "userId",
              "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
              "users"."reference" AS "userReference",
              "users"."email" AS "userEmail",
              "users"."name" AS "userName",
              "users"."avatar" AS "userAvatar",
              "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
              "users"."biographySource" AS "userBiographySource",
              "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
              highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "userNameSearchResultHighlight",
              "enrollments"."reference",
              "enrollments"."courseRole"
            FROM "enrollments"
            JOIN "users" ON
              "enrollments"."user" = "users"."id" AND
              "enrollments"."course" = ${response.locals.course.id} AND
              "users"."id" != ${response.locals.user.id}
            JOIN "usersNameSearchIndex" ON
              "users"."id" = "usersNameSearchIndex"."rowid" AND
              "usersNameSearchIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
                request.query.search,
                { prefix: true }
              )}
            $${
              response.locals.conversation !== undefined
                ? sql`
                    WHERE EXISTS(
                      SELECT TRUE
                      FROM "conversations"
                      WHERE
                        "conversations"."id" = ${response.locals.conversation.id} AND (
                        "conversations"."participants" = 'everyone' OR (
                          "conversations"."participants" = 'staff' AND
                          "enrollments"."courseRole" = 'staff'
                        ) OR
                        EXISTS(
                          SELECT TRUE
                          FROM "conversationSelectedParticipants"
                          WHERE
                            "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                            "conversationSelectedParticipants"."enrollment" = "enrollments"."id"
                        )
                      )
                    )
                  `
                : sql``
            }
            ORDER BY
              "usersNameSearchIndex"."rank" ASC,
              "users"."name" ASC
            LIMIT 5
          `
        )
        .map((enrollment) => ({
          id: enrollment.id,
          user: {
            id: enrollment.userId,
            lastSeenOnlineAt: enrollment.userLastSeenOnlineAt,
            reference: enrollment.userReference,
            email: enrollment.userEmail,
            name: enrollment.userName,
            avatar: enrollment.userAvatar,
            avatarlessBackgroundColor: enrollment.userAvatarlessBackgroundColor,
            biographySource: enrollment.userBiographySource,
            biographyPreprocessed: enrollment.userBiographyPreprocessed,
            nameSearchResultHighlight: enrollment.userNameSearchResultHighlight,
          },
          reference: enrollment.reference,
          courseRole: enrollment.courseRole,
        })))
        result += html`
          <button
            key="mention-user-search--${enrollment.reference}"
            type="button"
            class="dropdown--menu--item button button--transparent"
            javascript="${javascript`
              this.onclick = () => {
                this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${
                  enrollment.reference
                }--${slugify(enrollment.user.name)}`});  
              };
          `}"
          >
            $${application.web.locals.partials.user({
              request,
              response,
              enrollment,
              name: enrollment.user.nameSearchResultHighlight,
              tooltip: false,
              size: "xs",
              bold: false,
            })}
          </button>
        `;

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            $${result === html``
              ? html`
                  <div class="dropdown--menu--item secondary">
                    Person not found.
                  </div>
                `
              : result}
          `,
        })
      );
    }
  );

  application.web.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/content-editor/refer-to-conversation-or-message-search",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      if (
        typeof request.query.search !== "string" ||
        request.query.search.trim() === ""
      )
        return next("Validation");

      let results = html``;

      if (request.query.search.match(/^\d+$/) !== null)
        for (const conversationRow of application.database.all<{
          reference: string;
        }>(
          sql`
            SELECT "conversations"."reference"
            FROM "conversations"
            JOIN "conversationsReferenceIndex" ON
              "conversations"."id" = "conversationsReferenceIndex"."rowid" AND
              "conversationsReferenceIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
                request.query.search,
                { prefix: true }
              )}
            WHERE "conversations"."course" = ${response.locals.course.id}
            ORDER BY "conversations"."id" ASC
            LIMIT 5
          `
        )) {
          const conversation = application.web.locals.helpers.getConversation({
            request,
            response,
            conversationReference: conversationRow.reference,
          });
          if (conversation === undefined) continue;
          results += html`
            <button
              key="refer-to-conversation-or-message-search--${conversation.reference}"
              type="button"
              class="dropdown--menu--item button button--transparent"
              javascript="${javascript`
                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${conversation.reference});
                };
              `}"
            >
              <span>
                <span class="secondary">
                  $${application.web.locals.helpers.highlightSearchResult(
                    `#${conversation.reference}`,
                    `#${request.query.search}`,
                    { prefix: true }
                  )}
                </span>
                <span class="strong">${conversation.title}</span>
              </span>
            </button>
          `;
        }

      const messageReferenceSearchMatch =
        request.query.search.match(/^(\d+)\/(\d*)$/);
      if (messageReferenceSearchMatch !== null) {
        const [conversationReference, messageReferenceSearch] =
          messageReferenceSearchMatch.slice(1);
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference,
        });
        if (conversation !== undefined) {
          for (const messageRow of application.database.all<{
            reference: string;
          }>(
            sql`
              SELECT "messages"."reference"
              FROM "messages"
              $${
                messageReferenceSearch === ""
                  ? sql``
                  : sql`
                      JOIN "messagesReferenceIndex" ON
                        "messages"."id" = "messagesReferenceIndex"."rowid" AND
                        "messagesReferenceIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
                          messageReferenceSearch,
                          { prefix: true }
                        )}
                    `
              }
              WHERE "messages"."conversation" = ${conversation.id}
              ORDER BY "messages"."id" ASC
              LIMIT 5
            `
          )) {
            const message = application.web.locals.helpers.getMessage({
              request,
              response,
              conversation,
              messageReference: messageRow.reference,
            });
            if (message === undefined) continue;
            results += html`
              <button
                key="refer-to-conversation-or-message-search--${conversation.reference}/${message.reference}"
                type="button"
                class="dropdown--menu--item button button--transparent"
                javascript="${javascript`
                  this.onclick = () => {
                    this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${conversation.reference}/${message.reference}`});
                  };
                `}"
              >
                <div>
                  <div>
                    <span class="secondary">
                      $${application.web.locals.helpers.highlightSearchResult(
                        `#${conversation.reference}/${message.reference}`,
                        `#${request.query.search}`,
                        { prefix: true }
                      )}
                    </span>
                    <span class="strong">${conversation.title}</span>
                  </div>
                  <div class="secondary">
                    $${lodash.truncate(message.contentSearch, {
                      length: 100,
                      separator: /\W/,
                    })}
                  </div>
                </div>
              </button>
            `;
          }
          results += html`
            <button
              type="button"
              class="dropdown--menu--item button button--transparent"
              javascript="${javascript`
                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${conversation.reference});
                };
              `}"
            >
              <span>
                <span class="secondary">
                  $${application.web.locals.helpers.highlightSearchResult(
                    `#${conversation.reference}`,
                    `#${conversationReference}`
                  )}
                </span>
                <span class="strong">${conversation.title}</span>
              </span>
            </button>
          `;
        }
      }

      for (const conversationRow of application.database.all<{
        reference: string;
        conversationTitleSearchResultHighlight: string;
      }>(
        sql`
          SELECT
            "conversations"."reference",
            highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "conversationTitleSearchResultHighlight"
          FROM "conversations"
          JOIN "conversationsTitleSearchIndex" ON
            "conversations"."id" = "conversationsTitleSearchIndex"."rowid" AND
            "conversationsTitleSearchIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
              request.query.search,
              { prefix: true }
            )}
          WHERE "conversations"."course" = ${response.locals.course.id}
          ORDER BY
            "conversationsTitleSearchIndex"."rank" ASC,
            "conversations"."id" DESC
          LIMIT 5
        `
      )) {
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference: conversationRow.reference,
        });
        if (conversation === undefined) continue;
        results += html`
          <button
            key="refer-to-conversation-or-message-search--${conversation.reference}"
            type="button"
            class="dropdown--menu--item button button--transparent"
            javascript="${javascript`
              this.onclick = () => {
                this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${conversation.reference});
              };
            `}"
          >
            <span>
              <span class="secondary">#${conversation.reference}</span>
              <span class="strong">
                $${conversationRow.conversationTitleSearchResultHighlight}
              </span>
            </span>
          </button>
        `;
      }

      for (const messageRow of application.database.all<{
        messageReference: string;
        conversationReference: string;
        messageAuthorUserNameSearchResultHighlight: string;
      }>(
        sql`
          SELECT
            "messages"."reference" AS "messageReference",
            "conversations"."reference" AS "conversationReference",
            highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "messageAuthorUserNameSearchResultHighlight"
          FROM "messages"
          JOIN "enrollments" ON "messages"."authorEnrollment" = "enrollments"."id"
          JOIN "usersNameSearchIndex" ON
            "enrollments"."user" = "usersNameSearchIndex"."rowid" AND
            "usersNameSearchIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
              request.query.search,
              { prefix: true }
            )}
          JOIN "conversations" ON
            "messages"."conversation" = "conversations"."id" AND
            "conversations"."course" = ${response.locals.course.id}
          $${
            response.locals.enrollment.courseRole === "staff"
              ? sql``
              : sql`
                  WHERE (
                    "messages"."anonymousAt" IS NULL OR
                    "messages"."authorEnrollment" = ${response.locals.enrollment.id}
                  )
                `
          }
          ORDER BY
            "usersNameSearchIndex"."rank" ASC,
            "messages"."id" DESC
          LIMIT 5
        `
      )) {
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference: messageRow.conversationReference,
        });
        if (conversation === undefined) continue;
        const message = application.web.locals.helpers.getMessage({
          request,
          response,
          conversation,
          messageReference: messageRow.messageReference,
        });
        if (message === undefined) continue;
        results += html`
          <button
            key="refer-to-conversation-or-message-search--${conversation.reference}/${message.reference}"
            type="button"
            class="dropdown--menu--item button button--transparent"
            javascript="${javascript`
              this.onclick = () => {
                this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${conversation.reference}/${message.reference}`});
              };
            `}"
          >
            <div>
              <div>
                <span class="secondary">
                  #${conversation.reference}/${message.reference}
                </span>
                <span class="strong">${conversation.title}</span>
              </div>
              <div class="secondary">
                <div>
                  $${application.web.locals.partials.user({
                    request,
                    response,
                    enrollment: message.authorEnrollment,
                    name: messageRow.messageAuthorUserNameSearchResultHighlight,
                    tooltip: false,
                  })}
                </div>
                <div>
                  $${lodash.truncate(message.contentSearch, {
                    length: 100,
                    separator: /\W/,
                  })}
                </div>
              </div>
            </div>
          </button>
        `;
      }

      for (const messageRow of application.database.all<{
        messageReference: string;
        conversationReference: string;
        messageContentSearchResultSnippet: string;
      }>(
        sql`
          SELECT
            "messages"."reference" AS "messageReference",
            "conversations"."reference" AS "conversationReference",
            snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "messageContentSearchResultSnippet"
          FROM "messages"
          JOIN "messagesContentSearchIndex" ON
            "messages"."id" = "messagesContentSearchIndex"."rowid" AND
            "messagesContentSearchIndex" MATCH ${application.web.locals.helpers.sanitizeSearch(
              request.query.search,
              { prefix: true }
            )}
          JOIN "conversations" ON
            "messages"."conversation" = "conversations"."id" AND
            "conversations"."course" = ${response.locals.course.id}
          ORDER BY
            "messagesContentSearchIndex"."rank" ASC,
            "messages"."id" DESC
          LIMIT 5
        `
      )) {
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference: messageRow.conversationReference,
        });
        if (conversation === undefined) continue;
        const message = application.web.locals.helpers.getMessage({
          request,
          response,
          conversation,
          messageReference: messageRow.messageReference,
        });
        if (message === undefined) continue;
        results += html`
          <button
            key="refer-to-conversation-or-message-search--${conversation.reference}/${message.reference}"
            type="button"
            class="dropdown--menu--item button button--transparent"
            javascript="${javascript`
              this.onclick = () => {
                this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${conversation.reference}/${message.reference}`});
              };
            `}"
          >
            <div>
              <div>
                <span class="secondary">
                  #${conversation.reference}/${message.reference}
                </span>
                <span class="strong">${conversation.title}</span>
              </div>
              <div class="secondary">
                $${messageRow.messageContentSearchResultSnippet}
              </div>
            </div>
          </button>
        `;
      }

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            $${results === html``
              ? html`
                  <div class="dropdown--menu--item secondary">
                    Conversation or message not found.
                  </div>
                `
              : results}
          `,
        })
      );
    }
  );

  application.web.post<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >(
    "/content-editor/attachments",
    asyncHandler(async (request, response, next) => {
      if (
        response.locals.user === undefined ||
        response.locals.user.emailVerifiedAt === null
      )
        return next();

      if (request.files?.attachments === undefined) return next("Validation");

      const attachments = Array.isArray(request.files.attachments)
        ? request.files.attachments
        : [request.files.attachments];
      if (attachments.length === 0) return next("Validation");

      for (const attachment of attachments) {
        if (attachment.truncated)
          return response
            .status(413)
            .send(
              `\n\n<!-- Failed to upload: Attachments must be smaller than 10MB. -->\n\n`
            );
        attachment.name = filenamify(attachment.name, { replacement: "-" });
        if (attachment.name.trim() === "") return next("Validation");
      }

      let attachmentsContentSources = ``;
      for (const attachment of attachments) {
        const directory = cryptoRandomString({
          length: 20,
          type: "numeric",
        });
        const file = path.join(
          application.configuration.dataDirectory,
          "files",
          directory,
          attachment.name
        );
        const href = `https://${
          application.configuration.hostname
        }/files/${directory}/${encodeURIComponent(attachment.name)}`;

        await attachment.mv(file);

        if (attachment.mimetype.startsWith("image/"))
          try {
            const image = sharp(attachment.data);
            const metadata = await image.metadata();
            if (
              typeof metadata.width !== "number" ||
              typeof metadata.height !== "number"
            )
              throw new Error();
            const animated =
              typeof metadata.pages === "number" && metadata.pages > 1;
            const nameThumbnail = `${attachment.name.slice(
              0,
              -path.extname(attachment.name).length
            )}--thumbnail.${animated ? "mp4" : "webp"}`;
            const fileThumbnail = path.join(
              application.configuration.dataDirectory,
              "files",
              directory,
              nameThumbnail
            );
            const src = `https://${
              application.configuration.hostname
            }/files/${directory}/${encodeURIComponent(nameThumbnail)}`;
            const width = Math.min(
              metadata.width,
              1152 /* var(--width--6xl) */
            );

            if (animated)
              await execa(ffmpeg, [
                "-i",
                file,
                ...(metadata.width % 2 !== 0 || metadata.height % 2 !== 0
                  ? ["-vf", "crop=trunc(iw/2)*2:trunc(ih/2)*2"]
                  : []),
                "-f",
                "mp4",
                "-vcodec",
                "libx264",
                "-b:v",
                "0",
                "-crf",
                "25",
                "-pix_fmt",
                "yuv420p",
                fileThumbnail,
              ]);
            else await image.rotate().resize({ width }).toFile(fileThumbnail);

            attachmentsContentSources += `[${
              animated
                ? `<video src="${src}"></video>`
                : typeof metadata.density === "number" &&
                  metadata.density >= 120
                ? `<img src="${src}" alt="${attachment.name}" width="${
                    width / 2
                  }" />`
                : `![${attachment.name}](${src})`
            }](${href})\n\n`;
            continue;
          } catch (error: any) {
            response.locals.log(
              "ERROR IN CREATING THUMBNAIL",
              String(error),
              error?.stack
            );
          }
        else if (attachment.mimetype.startsWith("video/")) {
          attachmentsContentSources += `<video src="${href}"></video>`;
          continue;
        }

        attachmentsContentSources += `[${attachment.name}](${href})\n\n`;
      }

      response.send(`\n\n${attachmentsContentSources}`);
    })
  );

  application.web.post<
    { courseReference: string },
    any,
    {
      choices?: "single" | "multiple";
      closesAt?: string;
      options?: {
        content?: string;
      }[];
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference/polls", (request, response, next) => {
    if (
      response.locals.course === undefined ||
      (response.locals.enrollment.courseRole === "student" &&
        response.locals.course.studentsMayCreatePollsAt === null)
    )
      return next();

    request.body.options ??= [];

    if (
      typeof request.body.choices !== "string" ||
      !["single", "multiple"].includes(request.body.choices) ||
      (request.body.closesAt !== undefined &&
        (typeof request.body.closesAt !== "string" ||
          !application.web.locals.helpers.isDate(request.body.closesAt) ||
          application.web.locals.helpers.isPast(request.body.closesAt))) ||
      !Array.isArray(request.body.options) ||
      request.body.options.length <= 1 ||
      request.body.options.some(
        (option) =>
          typeof option.content !== "string" || option.content.trim() === ""
      )
    )
      return next("Validation");

    const poll = application.database.get<{
      id: number;
      reference: string;
    }>(
      sql`
        SELECT * FROM "messagePolls" WHERE "id" = ${
          application.database.run(
            sql`
              INSERT INTO "messagePolls" (
                "createdAt",
                "course",
                "reference",
                "authorEnrollment",
                "multipleChoicesAt",
                "closesAt"
              )
              VALUES (
                ${new Date().toISOString()},
                ${response.locals.course.id},
                ${cryptoRandomString({ length: 20, type: "numeric" })},
                ${response.locals.enrollment.id},
                ${
                  request.body.choices === "multiple"
                    ? new Date().toISOString()
                    : null
                },
                ${request.body.closesAt}
              )
            `
          ).lastInsertRowid
        }
      `
    )!;

    for (const [order, option] of request.body.options.entries())
      application.database.run(
        sql`
          INSERT INTO "messagePollOptions" (
            "createdAt",
            "messagePoll",
            "reference",
            "order",
            "contentSource",
            "contentPreprocessed"
          )
          VALUES (
            ${new Date().toISOString()},
            ${poll.id},
            ${cryptoRandomString({ length: 20, type: "numeric" })},
            ${order},
            ${option.content!},
            ${
              application.web.locals.partials.contentPreprocessed(
                option.content!
              ).contentPreprocessed
            }
          )
        `
      );

    response.send(
      `<courselore-poll reference="${poll.reference}"></courselore-poll>`
    );
  });

  type ResponseLocalsPoll =
    Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"] & {
      poll: {
        id: number;
        createdAt: string;
        reference: string;
        authorEnrollment: Application["web"]["locals"]["Types"]["MaybeEnrollment"];
        multipleChoicesAt: string | null;
        closesAt: string | null;
        options: {
          id: number;
          createdAt: string;
          reference: string;
          contentSource: string;
          contentPreprocessed: string;
        }[];
      };
    };

  const mayEditPoll = ({
    request,
    response,
    poll,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    poll: { authorEnrollment: { id: number } | "no-longer-enrolled" };
  }): boolean =>
    response.locals.enrollment.courseRole === "staff" ||
    (poll.authorEnrollment !== "no-longer-enrolled" &&
      poll.authorEnrollment.id === response.locals.enrollment.id);

  application.web.use<
    { courseReference: string; pollReference: string },
    any,
    {},
    {},
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      const pollRow = application.database.get<{
        id: number;
        createdAt: string;
        reference: string;
        authorEnrollmentId: number | null;
        authorUserId: number | null;
        authorUserLastSeenOnlineAt: string | null;
        authorUserReference: string;
        authorUserEmail: string | null;
        authorUserName: string | null;
        authorUserAvatar: string | null;
        authorUserAvatarlessBackgroundColors:
          | Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
          | null;
        authorUserBiographySource: string | null;
        authorUserBiographyPreprocessed: HTML | null;
        authorEnrollmentReference: string | null;
        authorEnrollmentCourseRole:
          | Application["web"]["locals"]["helpers"]["courseRoles"][number]
          | null;
        multipleChoicesAt: string | null;
        closesAt: string | null;
      }>(
        sql`
          SELECT
            "messagePolls"."id",
            "messagePolls"."createdAt",
            "messagePolls"."reference",
            "authorEnrollment"."id" AS "authorEnrollmentId",
            "authorUser"."id" AS "authorUserId",
            "authorUser"."lastSeenOnlineAt" AS "authorUserLastSeenOnlineAt",
            "authorUser"."reference" AS "authorUserReference",
            "authorUser"."email" AS "authorUserEmail",
            "authorUser"."name" AS "authorUserName",
            "authorUser"."avatar" AS "authorUserAvatar",
            "authorUser"."avatarlessBackgroundColor" AS "authorUserAvatarlessBackgroundColors",
            "authorUser"."biographySource" AS "authorUserBiographySource",
            "authorUser"."biographyPreprocessed" AS "authorUserBiographyPreprocessed",
            "authorEnrollment"."reference" AS "authorEnrollmentReference",
            "authorEnrollment"."courseRole" AS "authorEnrollmentCourseRole",  
            "messagePolls"."multipleChoicesAt",
            "messagePolls"."closesAt"
          FROM "messagePolls"
          LEFT JOIN "enrollments" AS "authorEnrollment" ON "messagePolls"."authorEnrollment" = "authorEnrollment"."id"
          LEFT JOIN "users" AS "authorUser" ON "authorEnrollment"."user" = "authorUser"."id"
          WHERE
            "messagePolls"."course" = ${response.locals.course.id} AND
            "messagePolls"."reference" = ${request.params.pollReference}
        `
      );
      if (pollRow === undefined) return next();
      const poll = {
        id: pollRow.id,
        createdAt: pollRow.createdAt,
        reference: pollRow.reference,
        authorEnrollment:
          pollRow.authorEnrollmentId !== null &&
          pollRow.authorUserId !== null &&
          pollRow.authorUserLastSeenOnlineAt !== null &&
          pollRow.authorUserReference !== null &&
          pollRow.authorUserEmail !== null &&
          pollRow.authorUserName !== null &&
          pollRow.authorUserAvatarlessBackgroundColors !== null &&
          pollRow.authorEnrollmentReference !== null &&
          pollRow.authorEnrollmentCourseRole !== null
            ? {
                id: pollRow.authorEnrollmentId,
                user: {
                  id: pollRow.authorUserId,
                  lastSeenOnlineAt: pollRow.authorUserLastSeenOnlineAt,
                  reference: pollRow.authorUserReference,
                  email: pollRow.authorUserEmail,
                  name: pollRow.authorUserName,
                  avatar: pollRow.authorUserAvatar,
                  avatarlessBackgroundColor:
                    pollRow.authorUserAvatarlessBackgroundColors,
                  biographySource: pollRow.authorUserBiographySource,
                  biographyPreprocessed:
                    pollRow.authorUserBiographyPreprocessed,
                },
                reference: pollRow.authorEnrollmentReference,
                courseRole: pollRow.authorEnrollmentCourseRole,
              }
            : ("no-longer-enrolled" as const),
        multipleChoicesAt: pollRow.multipleChoicesAt,
        closesAt: pollRow.closesAt,
      };

      const pollOptions = application.database.all<{
        id: number;
        createdAt: string;
        reference: string;
        contentSource: string;
        contentPreprocessed: string;
      }>(
        sql`
          SELECT
            "id",
            "createdAt",
            "reference",
            "contentSource",
            "contentPreprocessed"
          FROM "messagePollOptions"
          WHERE "messagePoll" = ${poll.id}
          ORDER BY "order" ASC
        `
      );

      response.locals.poll = {
        ...poll,
        options: pollOptions,
      };

      next();
    }
  );

  application.web.get<
    { courseReference: string; pollReference: string },
    any,
    {},
    { redirect?: string },
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference/edit",
    (request, response) => {
      if (response.locals.poll === undefined)
        return response.status(404).send("Poll not found.");

      if (!mayEditPoll({ request, response, poll: response.locals.poll }))
        return response.status(403).send("You may not edit this poll.");

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: partialPollEditor({
            request,
            response,
            poll: response.locals.poll,
          }),
        })
      );
    }
  );

  application.web.put<
    { courseReference: string; pollReference: string },
    any,
    {
      choices?: "single" | "multiple";
      closesAt?: string;
      options?: {
        reference?: string | undefined;
        content?: string;
      }[];
    },
    { redirect?: string },
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference",
    (request, response, next) => {
      if (
        response.locals.poll === undefined ||
        !mayEditPoll({ request, response, poll: response.locals.poll })
      )
        return next();

      request.body.options ??= [];

      if (
        typeof request.body.choices !== "string" ||
        !["single", "multiple"].includes(request.body.choices) ||
        (request.body.closesAt !== undefined &&
          (typeof request.body.closesAt !== "string" ||
            !application.web.locals.helpers.isDate(request.body.closesAt) ||
            application.web.locals.helpers.isPast(request.body.closesAt))) ||
        !Array.isArray(request.body.options) ||
        request.body.options.length <= 1 ||
        request.body.options.some(
          (option) =>
            (option.reference !== undefined &&
              (typeof option.reference !== "string" ||
                !response.locals.poll.options
                  .map((option) => option.reference)
                  .includes(option.reference))) ||
            typeof option.content !== "string" ||
            option.content.trim() === ""
        )
      )
        return next("Validation");

      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            UPDATE "messagePolls"
            SET
              "multipleChoicesAt" = ${
                request.body.choices === "multiple"
                  ? new Date().toISOString()
                  : null
              },
              "closesAt" = ${request.body.closesAt}
            WHERE "id" = ${response.locals.poll.id}
          `
        );

        for (const [order, option] of request.body.options!.entries())
          if (option.reference === undefined)
            application.database.run(
              sql`
                INSERT INTO "messagePollOptions" (
                  "createdAt",
                  "messagePoll",
                  "reference",
                  "order",
                  "contentSource",
                  "contentPreprocessed"
                )
                VALUES (
                  ${new Date().toISOString()},
                  ${response.locals.poll.id},
                  ${cryptoRandomString({ length: 20, type: "numeric" })},
                  ${order},
                  ${option.content!},
                  ${
                    application.web.locals.partials.contentPreprocessed(
                      option.content!
                    ).contentPreprocessed
                  }
                )
              `
            );
          else
            application.database.run(
              sql`
                UPDATE "messagePollOptions"
                SET
                  "order" = ${order},
                  "contentSource" = ${option.content!},
                  "contentPreprocessed" = ${
                    application.web.locals.partials.contentPreprocessed(
                      option.content!
                    ).contentPreprocessed
                  }
                WHERE
                  "messagePoll" = ${response.locals.poll.id} AND
                  "reference" = ${option.reference}
              `
            );

        for (const option of response.locals.poll.options.filter(
          (option) =>
            !request.body
              .options!.map((option) => option.reference)
              .includes(option.reference)
        ))
          application.database.run(
            sql`
              DELETE FROM "messagePollOptions"
              WHERE
                "messagePoll" = ${response.locals.poll.id} AND
                "reference" = ${option.reference}
            `
          );
      });

      if (typeof request.query.redirect === "string")
        response.redirect(
          303,
          `https://${application.configuration.hostname}/${request.query.redirect}`
        );
      else response.end();

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.patch<
    { courseReference: string; pollReference: string },
    any,
    {
      close?: "true" | "false";
    },
    { redirect?: string },
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference",
    (request, response, next) => {
      if (
        response.locals.poll === undefined ||
        !mayEditPoll({ request, response, poll: response.locals.poll })
      )
        return next();

      if (typeof request.body.close === "string")
        if (!["true", "false"].includes(request.body.close))
          return next("Validation");
        else
          application.database.run(
            sql`
              UPDATE "messagePolls"
              SET "closesAt" = ${
                request.body.close === "true" ? new Date().toISOString() : null
              }
              WHERE "id" = ${response.locals.poll.id}
            `
          );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${request.query.redirect}`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.post<
    { courseReference: string; pollReference: string },
    any,
    { optionsReferences?: string[] },
    { redirect?: string },
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference/votes",
    (request, response, next) => {
      if (response.locals.poll === undefined) return next();

      request.body.optionsReferences ??= [];

      if (
        application.web.locals.helpers.isPast(response.locals.poll.closesAt) ||
        !Array.isArray(request.body.optionsReferences) ||
        (response.locals.poll.multipleChoicesAt === null &&
          request.body.optionsReferences.length !== 1) ||
        (response.locals.poll.multipleChoicesAt !== null &&
          request.body.optionsReferences.length === 0) ||
        request.body.optionsReferences.some(
          (option) =>
            !response.locals.poll.options
              .map((option) => option.reference)
              .includes(option)
        ) ||
        application.database.get<{}>(
          sql`
            SELECT TRUE
            FROM "messagePollVotes"
            WHERE
              "messagePollOption" IN ${response.locals.poll.options.map(
                (option) => option.id
              )} AND
              "enrollment" = ${response.locals.enrollment.id}
          `
        ) !== undefined
      )
        return next("Validation");

      for (const optionReference of request.body.optionsReferences)
        application.database.run(
          sql`
            INSERT INTO "messagePollVotes" (
              "createdAt",
              "messagePollOption",
              "enrollment"
            )
            VALUES (
              ${new Date().toISOString()},
              ${
                response.locals.poll.options.find(
                  (option) => option.reference === optionReference
                )!.id
              },
              ${response.locals.enrollment.id}
            )
          `
        );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.delete<
    { courseReference: string; pollReference: string },
    any,
    {},
    { redirect?: string },
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference/votes",
    (request, response, next) => {
      if (response.locals.poll === undefined) return next();

      if (application.web.locals.helpers.isPast(response.locals.poll.closesAt))
        return next("Validation");

      application.database.run(
        sql`
          DELETE FROM "messagePollVotes"
          WHERE
            "messagePollOption" IN ${response.locals.poll.options.map(
              (option) => option.id
            )} AND
            "enrollment" = ${response.locals.enrollment.id}
        `
      );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    }
  );

  application.web.get<
    { courseReference: string; pollReference: string },
    any,
    {},
    {},
    ResponseLocalsPoll
  >(
    "/courses/:courseReference/polls/:pollReference/votes",
    (request, response, next) => {
      if (
        response.locals.poll === undefined ||
        !mayEditPoll({ request, response, poll: response.locals.poll })
      )
        return next();

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: html`
            $${response.locals.poll.options.map(
              (option) => html`
                <div key="poll--show--option--votes/${option.reference}">
                  $${application.database
                    .all<{
                      enrollmentId: number | null;
                      userId: number | null;
                      userLastSeenOnlineAt: string | null;
                      userReference: string;
                      userEmail: string | null;
                      userName: string | null;
                      userAvatar: string | null;
                      userAvatarlessBackgroundColors:
                        | Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number]
                        | null;
                      userBiographySource: string | null;
                      userBiographyPreprocessed: HTML | null;
                      enrollmentReference: string | null;
                      enrollmentCourseRole:
                        | Application["web"]["locals"]["helpers"]["courseRoles"][number]
                        | null;
                    }>(
                      sql`
                        SELECT
                          "enrollments"."id" AS "enrollmentId",
                          "users"."id" AS "userId",
                          "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                          "users"."reference" AS "userReference",
                          "users"."email" AS "userEmail",
                          "users"."name" AS "userName",
                          "users"."avatar" AS "userAvatar",
                          "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColors",
                          "users"."biographySource" AS "userBiographySource",
                          "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                          "enrollments"."reference" AS "enrollmentReference",
                          "enrollments"."courseRole" AS "enrollmentCourseRole"
                        FROM "messagePollVotes"
                        LEFT JOIN "enrollments" ON "messagePollVotes"."enrollment" = "enrollments"."id"
                        LEFT JOIN "users" ON "enrollments"."user" = "users"."id"
                        WHERE "messagePollVotes"."messagePollOption" = ${option.id}
                        ORDER BY "messagePollVotes"."createdAt" ASC
                      `
                    )
                    .map((vote) => ({
                      enrollment:
                        vote.enrollmentId !== null &&
                        vote.userId !== null &&
                        vote.userLastSeenOnlineAt !== null &&
                        vote.userReference !== null &&
                        vote.userEmail !== null &&
                        vote.userName !== null &&
                        vote.userAvatarlessBackgroundColors !== null &&
                        vote.enrollmentReference !== null &&
                        vote.enrollmentCourseRole !== null
                          ? {
                              id: vote.enrollmentId,
                              user: {
                                id: vote.userId,
                                lastSeenOnlineAt: vote.userLastSeenOnlineAt,
                                reference: vote.userReference,
                                email: vote.userEmail,
                                name: vote.userName,
                                avatar: vote.userAvatar,
                                avatarlessBackgroundColor:
                                  vote.userAvatarlessBackgroundColors,
                                biographySource: vote.userBiographySource,
                                biographyPreprocessed:
                                  vote.userBiographyPreprocessed,
                              },
                              reference: vote.enrollmentReference,
                              courseRole: vote.enrollmentCourseRole,
                            }
                          : ("no-longer-enrolled" as const),
                    }))
                    .map(
                      (vote) => html`
                        $${application.web.locals.partials.user({
                          request,
                          response,
                          enrollment: vote.enrollment,
                          size: "xs",
                        })}
                      `
                    )}
                </div>
              `
            )}
          `,
        })
      );
    }
  );

  application.web.post<
    { courseReference?: string },
    any,
    { content?: string },
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]> &
      Partial<Application["web"]["locals"]["ResponseLocals"]["CourseEnrolled"]>
  >(
    [
      "/content-editor/preview",
      "/courses/:courseReference/content-editor/preview",
    ],
    (request, response, next) => {
      if (
        request.params.courseReference !== undefined &&
        response.locals.course === undefined
      )
        return next();

      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === ""
      )
        return next("Validation");

      response.send(
        application.web.locals.layouts.partial({
          request,
          response,
          body: application.web.locals.partials.content({
            request,
            response,
            contentPreprocessed:
              application.web.locals.partials.contentPreprocessed(
                request.body.content
              ).contentPreprocessed,
          }).contentProcessed,
        })
      );
    }
  );
};
