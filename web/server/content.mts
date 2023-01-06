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
import rehypeSanitize, {
  defaultSchema as rehypeSanitizeDefaultSchema,
} from "rehype-sanitize";
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
  server: {
    locals: {
      partials: {
        contentPreprocessed(contentSource: string): {
          contentPreprocessed: string;
          contentSearch: string;
        };

        content({
          request,
          response,
          id,
          contentPreprocessed,
          decorate,
          search,
        }: {
          request: express.Request<
            {},
            any,
            {},
            { conversations?: object },
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          id?: string;
          contentPreprocessed: HTML;
          decorate?: boolean;
          search?: string | string[] | undefined;
        }): {
          contentProcessed: HTML;
          mentions: Set<string>;
        };

        contentEditor({
          request,
          response,
          name,
          contentSource,
          required,
          compact,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              > &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              > &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["Conversation"]
              >
          >;
          name?: string;
          contentSource?: string;
          required?: boolean;
          compact?: boolean;
        }): HTML;
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.locals.partials.contentPreprocessed = await (async () => {
    const unifiedProcessor = unified()
      .use(remarkParse)
      .use(remarkGfm, { singleTilde: false })
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(rehypeSanitize, {
        ...rehypeSanitizeDefaultSchema,
        clobber: [],
        tagNames: [
          ...(rehypeSanitizeDefaultSchema.tagNames ?? []),
          "u",
          "video",
        ],
        attributes: {
          ...rehypeSanitizeDefaultSchema.attributes,
          div: [
            ...(rehypeSanitizeDefaultSchema.attributes?.div ?? []),
            ["className", "math", "math-display"],
          ],
          span: [
            ...(rehypeSanitizeDefaultSchema.attributes?.span ?? []),
            ["className", "math", "math-inline"],
          ],
          code: [
            ...(rehypeSanitizeDefaultSchema.attributes?.code ?? []),
            "className",
          ],
          video: [
            ...(rehypeSanitizeDefaultSchema.attributes?.video ?? []),
            "src",
          ],
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

  application.server.locals.partials.content = ({
    request,
    response,
    id = Math.random().toString(36).slice(2),
    contentPreprocessed,
    decorate = false,
    search = undefined,
  }) => {
    const contentElement = JSDOM.fragment(html`
      <div key="content" class="content">$${contentPreprocessed}</div>
    `).firstElementChild!;
    const mentions = new Set<string>();

    for (const element of contentElement.querySelectorAll("li, td, th, dt, dd"))
      element.innerHTML = [...element.childNodes].some(
        (node) =>
          (node.nodeType === node.TEXT_NODE &&
            node.textContent!.trim() !== "") ||
          (node.nodeType === node.ELEMENT_NODE &&
            (node as Element).matches("a"))
      )
        ? html`<div><p>$${element.innerHTML}</p></div>`
        : html`<div>$${element.innerHTML}</div>`;

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

    for (const element of contentElement.querySelectorAll("details")) {
      const childNodes = [...element.childNodes];
      while (
        childNodes.length > 0 &&
        childNodes[0].nodeType === childNodes[0].TEXT_NODE &&
        typeof childNodes[0].nodeValue === "string" &&
        childNodes[0].nodeValue.trim() === ""
      )
        childNodes.shift();
      const wrapper = JSDOM.fragment(html`<div></div>`).firstElementChild!;
      if (
        childNodes.length > 0 &&
        childNodes[0].nodeType === childNodes[0].ELEMENT_NODE &&
        (childNodes[0] as Element).matches("summary")
      ) {
        wrapper.replaceChildren(...childNodes.slice(1));
        element.replaceChildren(childNodes[0], wrapper);
      } else {
        wrapper.replaceChildren(...childNodes);
        element.replaceChildren(
          JSDOM.fragment(html`<summary>See More</summary>`).firstElementChild!,
          wrapper
        );
      }
    }

    for (const attribute of ["id", "name"])
      for (const element of contentElement.querySelectorAll(`[${attribute}]`))
        element.setAttribute(
          attribute,
          `${id}--${element.getAttribute(attribute)}`
        );
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
          javascript_TODO`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: ${JSON.stringify(
                  href.startsWith("mailto:")
                    ? html`Send email to
                        <code class="code"
                          >${href.slice("mailto:".length)}</code
                        >`
                    : html`External link to <code class="code">${href}</code>`
                )},  
              },
            });
          `
        );
    }

    if (decorate && response.locals.course !== undefined) {
      const requestCourseEnrolled = request as express.Request<
        {},
        any,
        {},
        {},
        Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      >;
      const responseCourseEnrolled = response as express.Response<
        any,
        Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      >;

      for (const element of contentElement.querySelectorAll("a")) {
        const href = element.getAttribute("href");
        if (href !== element.textContent!.trim()) continue;
        const match = href.match(
          new RegExp(
            `^https://${escapeStringRegexp(
              application.configuration.hostname
            )}/courses/(\\d+)/conversations/(\\d+)(?:\\?messages%5BmessageReference%5D=(\\d+))?$`
          )
        );
        if (match === null) continue;
        const [courseReference, conversationReference, messageReference] =
          match.slice(1);
        if (courseReference !== response.locals.course.reference) continue;
        const conversation = application.server.locals.helpers.getConversation({
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
        const message = application.server.locals.helpers.getMessage({
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
            parentElement.closest("a, code, .mention, .reference") !== null
          )
            return;
          let newNodeHTML = html`${node.textContent}`;

          newNodeHTML = newNodeHTML.replace(
            /(?<!\w)@(everyone|staff|students|anonymous|[0-9a-z-]+)(?!\w)/gi,
            (match, mention) => {
              mention = mention.toLowerCase();
              let mentionHTML: HTML;
              switch (mention) {
                case "everyone":
                case "staff":
                case "students":
                  mentions.add(mention);
                  mentionHTML = html`<span
                    javascript-TODO="${javascript_TODO`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          touch: false,
                          content: "Mention " + ${mention} + " in the conversation",
                        },
                      });
                    `}"
                    >@${lodash.capitalize(mention)}</span
                  >`;
                  break;
                case "anonymous":
                  mentionHTML = html`@$${application.server.locals.partials.user(
                    {
                      request,
                      response,
                      avatar: false,
                    }
                  )}`;
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
                    userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
                    userBiographySource: string | null;
                    userBiographyPreprocessed: HTML | null;
                    reference: string;
                    courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
                  mentionHTML = html`@$${application.server.locals.partials.user(
                    {
                      request,
                      response,
                      enrollment,
                      avatar: false,
                    }
                  )}`;
                  if (enrollment.user.id === response.locals.user!.id)
                    mentionHTML = html`<mark class="mark"
                      >$${mentionHTML}</mark
                    >`;
                  break;
              }
              return html`<strong class="mention">$${mentionHTML}</strong>`;
            }
          );

          newNodeHTML = newNodeHTML.replace(
            /(?<!\w)#(\d+)(?:\/(\d+))?(?!\w)/g,
            (match, conversationReference, messageReference) => {
              const conversation =
                application.server.locals.helpers.getConversation({
                  request: requestCourseEnrolled,
                  response: responseCourseEnrolled,
                  conversationReference,
                });
              if (conversation === undefined) return match;
              if (messageReference === undefined)
                return html`<a
                  class="reference"
                  href="https://${application.configuration
                    .hostname}/courses/${response.locals.course!
                    .reference}/conversations/${conversation.reference}${qs.stringify(
                    { conversations: request.query.conversations },
                    { addQueryPrefix: true }
                  )}"
                  >${match}</a
                >`;
              const message = application.server.locals.helpers.getMessage({
                request: requestCourseEnrolled,
                response: responseCourseEnrolled,
                conversation,
                messageReference,
              });
              if (message === undefined) return match;
              return html`<a
                class="reference"
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
            )}/courses/(\\d+)/conversations/(\\d+)(?:\\?messages%5BmessageReference%5D=(\\d+))?$`
          )
        );
        if (hrefMatch === null) continue;
        const [
          hrefCourseReference,
          hrefConversationReference,
          hrefMessageReference,
        ] = hrefMatch.slice(1);
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
        const conversation = application.server.locals.helpers.getConversation({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversationReference: hrefConversationReference,
        });
        if (conversation === undefined) continue;
        if (hrefMessageReference === undefined) {
          element.setAttribute(
            "javascript",
            javascript_TODO`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: ${JSON.stringify(html`
                    <div
                      css="${css`
                        padding: var(--space--2);
                      `}"
                    >
                      $${application.server.locals.partials.conversation({
                        request: requestCourseEnrolled,
                        response: responseCourseEnrolled,
                        conversation,
                      })}
                    </div>
                  `)},  
                },
              });
            `
          );
          continue;
        }
        const message = application.server.locals.helpers.getMessage({
          request: requestCourseEnrolled,
          response: responseCourseEnrolled,
          conversation,
          messageReference: hrefMessageReference,
        });
        if (message === undefined) continue;
        element.setAttribute(
          "javascript",
          javascript_TODO`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: ${JSON.stringify(html`
                  <div
                    css="${css`
                      padding: var(--space--2);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                    `}"
                  >
                    $${application.server.locals.partials.conversation({
                      request: requestCourseEnrolled,
                      response: responseCourseEnrolled,
                      conversation,
                      message,
                    })}
                  </div>
                `)},  
              },
            });
          `
        );
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
              application.server.locals.helpers.highlightSearchResult(
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

  application.server.get<
    {},
    any,
    {},
    { url?: string },
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"]
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

      await stream.pipeline(
        application.got
          .stream(request.query.url, {
            throwHttpErrors: false,
            retry: { limit: 0 },
            timeout: { request: 10000 },
          })
          .on("response", (proxiedResponse) => {
            for (const header of Object.keys(proxiedResponse.headers))
              if (
                !["content-type", "content-length"].includes(
                  header.toLowerCase()
                )
              )
                delete proxiedResponse.headers[header];
          }),
        response
      );
    })
  );

  application.server.locals.partials.contentEditor = ({
    request,
    response,
    name = "content",
    contentSource = "",
    required = true,
    compact = false,
  }) => html`
    <div
      key="content-editor"
      css="${css`
        min-width: var(--space--0);
      `}"
    >
      $${compact
        ? html``
        : html`
            <div
              css="${css`
                display: flex;
                gap: var(--space--1);

                .button {
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                  padding-bottom: var(--space--4);
                  margin-bottom: var(--space---3);
                }
                & + * {
                  position: relative;
                }

                :checked + .button--transparent {
                  background-color: var(--color--gray--medium--100);
                }
                :focus-within + .button--transparent {
                  background-color: var(--color--gray--medium--200);
                }
                @media (prefers-color-scheme: dark) {
                  :checked + .button--transparent {
                    background-color: var(--color--gray--medium--800);
                  }
                  :focus-within + .button--transparent {
                    background-color: var(--color--gray--medium--700);
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
                  javascript-TODO="${javascript_TODO`
                    this.isModified = false;

                    this.onclick = () => {
                      this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]').hidden = false;
                      this.closest('[key="content-editor"]').querySelector('[key="content-editor--loading"]').hidden = true;
                      this.closest('[key="content-editor"]').querySelector('[key="content-editor--preview"]').hidden = true;  
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
                  javascript-TODO="${javascript_TODO`
                    this.isModified = false;

                    this.onclick = async (event) => {
                      const write = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write"]');
                      const loading = this.closest('[key="content-editor"]').querySelector('[key="content-editor--loading"]');
                      const preview = this.closest('[key="content-editor"]').querySelector('[key="content-editor--preview"]');
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
                            cache: "no-store",
                            method: "POST",
                            headers: { "CSRF-Protection": "true", },
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
                  javascript-TODO="${javascript_TODO`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        touch: false,
                        content: ${JSON.stringify(html`
                          <span class="keyboard-shortcut">
                            <span
                              javascript-TODO="${javascript_TODO`
                                  this.hidden = leafac.isAppleDevice;
                                `}"
                              >Ctrl+Alt+P</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              javascript-TODO="${javascript_TODO`
                                  this.hidden = !leafac.isAppleDevice;
                                `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>P</span
                            >
                          </span>
                        `)},  
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
          `}
      <div
        css="${css`
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--800);
          }
          border-radius: var(--border-radius--lg);
        `}"
      >
        <div key="content-editor--write">
          <div
            $${compact ? html`hidden` : html``}
            css="${css`
              padding: var(--space--1) var(--space--0);
              margin: var(--space--0) var(--space--3);
              overflow-x: auto;
              display: flex;
              & > * {
                display: flex;
              }
              & > * + * {
                padding-left: var(--space--0-5);
                border-left: var(--border-width--1) solid
                  var(--color--gray--medium--200);
                @media (prefers-color-scheme: dark) {
                  border-color: var(--color--gray--medium--700);
                }
                margin-left: var(--space--0-5);
              }
            `}"
          >
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: "Help",
                    },
                  });

                  leafac.setTippy({
                    event,
                    element: this,
                    elementProperty: "dropdown",
                    tippyProps: {
                      trigger: "click",
                      interactive: true,
                      content: ${JSON.stringify(html`
                        <p>
                          You may style text with
                          <a
                            href="https://guides.github.com/features/mastering-markdown/"
                            target="_blank"
                            class="link"
                            >GitHub Flavored Markdown</a
                          >
                          and include mathematical formulas with
                          <a
                            href="https://katex.org/docs/supported.html"
                            target="_blank"
                            class="link"
                            >LaTeX</a
                          >.
                        </p>
                      `)},  
                    },
                  });
                `}"
              >
                <i class="bi bi-info-circle"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Heading 1
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+1</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>1</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "# ", "\\n\\n");
                    textarea.focus();  
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+1", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-h1"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Heading 2
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+2</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>2</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "## ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+2", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-h2"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Heading 3
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+3</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>3</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "### ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+3", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-h3"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Bold
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+B</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>B</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "**");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+b", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-bold"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Italic
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>I</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "_");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+i", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-italic"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Underline
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+U</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>U</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "<u>", "</u>");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+u", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-underline"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Strikethrough
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+S</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>S</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "~~");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+s", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-type-strikethrough"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Link
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>K</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "[", "](https://example.com)");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+k", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-link"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Bulleted List
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+8</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>8</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "- ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+8", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-list-ul"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Numbered List
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+7</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>7</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "1. ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+7", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-list-ol"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Checklist
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+9</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>9</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "- [ ] ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+9", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-ui-checks"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Quote
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+'</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>'</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "> ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+'", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-quote"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Table
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+T</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>T</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    const gapLength = textarea.selectionEnd - textarea.selectionStart + 2;
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "| ", " |  |\\n|" + "-".repeat(gapLength) + "|--|\\n|" + " ".repeat(gapLength) + "|  |\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+t", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-table"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Disclosure
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+D</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>D</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "<details>\\n<summary>", "</summary>\\n\\nContent\\n\\n</details>\\n\\n");
                    textarea.focus();
                  };
                  
                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+d", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-chevron-bar-expand"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Footnote
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+F</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>F</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "[^", "<identifier>]\\n\\n[^<identifier>]: <footnote>");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+f", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-card-text"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Inline Code
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "\`");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+e", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-code"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Code Block
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "\`\`\`language\\n", "\\n\`\`\`\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+e", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-code-square"></i>
              </button>
            </div>
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Inline Equation
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `)},  
                    },
                  });
                  
                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, "$");
                    textarea.focus();
                  };
                
                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+e", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-calculator"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Equation Block
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `)},  
                    },
                  });

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "$$\\n", "\\n$$\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+shift+e", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-calculator-fill"></i>
              </button>
            </div>
            $${response.locals.course !== undefined
              ? html`
                  <div>
                    <button
                      type="button"
                      class="button button--tight button--transparent"
                      javascript-TODO="${javascript_TODO`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: ${JSON.stringify(html`
                              Mention User
                              <span class="keyboard-shortcut">(@)</span>
                            `)},
                          },
                        });

                        const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                        this.onclick = () => {
                          textFieldEdit.wrapSelection(textarea, " @", "");
                          textarea.focus();
                        };
                      `}"
                    >
                      <i class="bi bi-at"></i>
                    </button>
                    <button
                      type="button"
                      class="button button--tight button--transparent"
                      javascript-TODO="${javascript_TODO`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: ${JSON.stringify(html`
                              Refer to Conversation or Message
                              <span class="keyboard-shortcut">(#)</span>
                            `)},  
                          },
                        });

                        const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                        this.onclick = () => {
                          textFieldEdit.wrapSelection(textarea, " #", "");
                          textarea.focus();
                        };
                      `}"
                    >
                      <i class="bi bi-hash"></i>
                    </button>
                  </div>
                `
              : html``}
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Image
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>I</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `)},  
                    },
                  });

                  this.onclick = () => {
                    this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--attachments"]').click();
                  };

                  const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+i", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-image"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Attachment
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>K</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `)},  
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
                javascript-TODO="${javascript_TODO`
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
                    const response = await (await fetch("https://${
                      application.configuration.hostname
                    }/content-editor/attachments", {
                      cache: "no-store",
                      method: "POST",
                      headers: { "CSRF-Protection": "true", },
                      body,
                    })).text();
                    textarea.disabled = false;
                    textarea.uploadingIndicator.hide();
                    textFieldEdit.wrapSelection(textarea, response, "");
                    textarea.focus();
                  };

                  const checkIsSignedIn = ${
                    response.locals.user === undefined ||
                    response.locals.user.emailVerifiedAt === null
                      ? javascript_TODO`
                          (() => {
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
                          })();
                        `
                      : javascript_TODO`
                          () => true;
                        `
                  }


                  leafac.setTippy({
                    event,
                    element: textarea,
                    elementProperty: "uploadingIndicator",
                    tippyProps: {
                      trigger: "manual",
                      hideOnClick: false,
                      content: ${JSON.stringify(html`
                        <div
                          css="${css`
                            display: flex;
                            gap: var(--space--2);
                          `}"
                        >
                          $${application.server.locals.partials.spinner({
                            request,
                            response,
                          })}
                          Uploading…
                        </div>
                      `)},  
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
            </div>
            <div>
              <label
                class="button button--tight button--transparent"
                javascript-TODO="${javascript_TODO`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: ${JSON.stringify(html`
                        Programmer Mode
                        <span class="secondary">(Monospaced Font)</span>
                        <span class="keyboard-shortcut">
                          (<span
                            javascript-TODO="${javascript_TODO`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+0</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            javascript-TODO="${javascript_TODO`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>0</span
                          >)
                        </span>
                      `)},  
                    },
                  });
                `}"
              >
                <input
                  type="checkbox"
                  class="visually-hidden input--radio-or-checkbox--multilabel"
                  javascript-TODO="${javascript_TODO`
                    this.isModified = false;

                    const textarea = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]');

                    this.onclick = () => {
                      if (this.checked) textarea.classList.add("content-editor--write--textarea--programmer-mode");
                      else textarea.classList.remove("content-editor--write--textarea--programmer-mode");
                      localStorage.setItem("content-editor--write--textarea--programmer-mode", JSON.stringify(this.checked));  
                    };
                    
                    (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+alt+0", () => { this.click(); return false; });

                    if (JSON.parse(localStorage.getItem("content-editor--write--textarea--programmer-mode") ?? "false")) this.click();
                  `}"
                />
                <span>
                  <i class="bi bi-braces-asterisk"></i>
                </span>
                <span class="text--blue">
                  <i class="bi bi-braces-asterisk"></i>
                </span>
              </label>
            </div>
          </div>
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
              class="input--text input--text--textarea"
              style="${compact
                ? `--height: var(--space--14);`
                : `--height: var(--space--20);`}"
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
              `}"
              javascript-TODO="${javascript_TODO`
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

                ${
                  response.locals.course !== undefined
                    ? javascript_TODO`
                        const dropdownMenuTarget = this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea--dropdown-menu-target"]');

                        leafac.setTippy({
                          event,
                          element: dropdownMenuTarget,
                          elementProperty: "dropdownMenuMention",
                          tippyProps: {
                            placement: "bottom-start",
                            trigger: "manual",
                            interactive: true,
                            content: ${JSON.stringify(html`
                              <div
                                css="${css`
                                  width: var(--space--56);
                                  max-height: var(--space--44);
                                  overflow: auto;
                                `}"
                              >
                                <p class="heading">
                                  <i class="bi bi-at"></i>
                                  Mention User
                                </p>
                                <div class="dropdown--menu">
                                  <div key="search-results"></div>
                                  <button
                                    type="button"
                                    class="dropdown--menu--item button button--transparent"
                                    javascript-TODO="${javascript_TODO`
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
                                    javascript-TODO="${javascript_TODO`
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
                                    javascript-TODO="${javascript_TODO`
                                        this.onclick = () => {
                                          this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete("students");
                                        };
                                      `}"
                                  >
                                    Students in the Conversation
                                  </button>
                                </div>
                              </div>
                            `)},  
                          },
                        });

                        leafac.setTippy({
                          event,
                          element: dropdownMenuTarget,
                          elementProperty: "dropdownMenuReference",
                          tippyProps: {
                            placement: "bottom-start",
                            trigger: "manual",
                            interactive: true,
                            content: ${JSON.stringify(html`
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
                                <div class="dropdown--menu">
                                  <div key="search-results"></div>
                                </div>
                              </div>
                            `)},  
                          },
                        });

                        const dropdownMenus = [
                          {
                            trigger: "@",
                            route: ${JSON.stringify(
                              `https://${
                                application.configuration.hostname
                              }/courses/${response.locals.course.reference}/${
                                response.locals.conversation !== undefined
                                  ? `conversations/${response.locals.conversation.reference}/`
                                  : ``
                              }content-editor/mention-user-search`
                            )},
                            dropdownMenu: dropdownMenuTarget.dropdownMenuMention,
                          },
                          {
                            trigger: "#",
                            route: ${JSON.stringify(
                              `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/content-editor/refer-to-conversation-or-message-search`
                            )},
                            dropdownMenu: dropdownMenuTarget.dropdownMenuReference,
                          },
                        ];

                        let anchorIndex = null;

                        this.oninput = (() => {
                          let isUpdating = false;
                          let shouldUpdateAgain = false;
                          return async () => {
                            const value = this.value;
                            const selectionMin = Math.min(this.selectionStart, this.selectionEnd);
                            const selectionMax = Math.max(this.selectionStart, this.selectionEnd);
                            for (const { trigger, route, dropdownMenu } of dropdownMenus) {
                              if (!dropdownMenu.state.isShown) {
                                if (
                                  value[selectionMin - 1] !== trigger ||
                                  (selectionMin > 1 && value[selectionMin - 2].match(/\\w/) !== null)
                                ) continue;
                                anchorIndex = selectionMin;
                                const caretCoordinates = textareaCaret(this, anchorIndex - 1);
                                dropdownMenuTarget.style.top = String(caretCoordinates.top) + "px";
                                dropdownMenuTarget.style.left = String(caretCoordinates.left) + "px";
                                tippy.hideAll();
                                dropdownMenu.show();
                              }
                              if (selectionMin < anchorIndex || value[anchorIndex - 1] !== trigger || value[anchorIndex] === " ") {
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
                              const search = value.slice(anchorIndex, selectionMax).trim();
                              if (search === "") searchResults.innerHTML = "";
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
                          this.setSelectionRange(anchorIndex, Math.max(this.selectionStart, this.selectionEnd));
                          textFieldEdit.insert(this, text + " ");
                          tippy.hideAll();
                          this.focus();
                        };
                      `
                    : javascript_TODO``
                }
              `}"
            >
${contentSource}</textarea
            >
          </div>
        </div>

        $${compact
          ? html``
          : html`
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
                $${application.server.locals.partials.spinner({
                  request,
                  response,
                })}
                Loading…
              </div>

              <div
                key="content-editor--preview"
                hidden
                css="${css`
                  padding: var(--space--4);
                `}"
              ></div>
            `}
      </div>
    </div>
  `;

  application.server.get<
    { courseReference: string; conversationReference?: string },
    any,
    {},
    { search?: string },
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["Conversation"]>
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

      const enrollments = application.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          userNameSearchResultHighlight: string;
          reference: string;
          courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
              "usersNameSearchIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
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
        }));

      response.send(
        application.server.locals.layouts.partial({
          request,
          response,
          body: html`
            $${enrollments.length === 0
              ? html`
                  <div class="dropdown--menu--item secondary">
                    No user found.
                  </div>
                `
              : enrollments.map(
                  (enrollment) => html`
                    <button
                      key="mention-user-search--${enrollment.reference}"
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      javascript-TODO="${javascript_TODO`
                        this.onclick = () => {
                          this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${
                            enrollment.reference
                          }--${slugify(enrollment.user.name)}`});  
                        };
                    `}"
                    >
                      $${application.server.locals.partials.user({
                        request,
                        response,
                        enrollment,
                        name: enrollment.user.nameSearchResultHighlight,
                        tooltip: false,
                        size: "xs",
                        bold: false,
                      })}
                    </button>
                  `
                )}
          `,
        })
      );
    }
  );

  application.server.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
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
              "conversationsReferenceIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
                request.query.search,
                { prefix: true }
              )}
            WHERE "conversations"."course" = ${response.locals.course.id}
            ORDER BY "conversations"."id" ASC
            LIMIT 5
          `
        )) {
          const conversation =
            application.server.locals.helpers.getConversation({
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
              javascript-TODO="${javascript_TODO`
                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${conversation.reference});
                };
              `}"
            >
              <span>
                <span class="secondary">
                  $${application.server.locals.helpers.highlightSearchResult(
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
        const conversation = application.server.locals.helpers.getConversation({
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
                        "messagesReferenceIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
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
            const message = application.server.locals.helpers.getMessage({
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
                javascript-TODO="${javascript_TODO`
                  this.onclick = () => {
                    this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${`${conversation.reference}/${message.reference}`});
                  };
                `}"
              >
                <div>
                  <div>
                    <span class="secondary">
                      $${application.server.locals.helpers.highlightSearchResult(
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
              javascript-TODO="${javascript_TODO`
                this.onclick = () => {
                  this.closest('[key="content-editor"]').querySelector('[key="content-editor--write--textarea"]').dropdownMenuComplete(${conversation.reference});
                };
              `}"
            >
              <span>
                <span class="secondary">
                  $${application.server.locals.helpers.highlightSearchResult(
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
            "conversationsTitleSearchIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
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
        const conversation = application.server.locals.helpers.getConversation({
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
            javascript-TODO="${javascript_TODO`
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
            "usersNameSearchIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
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
        const conversation = application.server.locals.helpers.getConversation({
          request,
          response,
          conversationReference: messageRow.conversationReference,
        });
        if (conversation === undefined) continue;
        const message = application.server.locals.helpers.getMessage({
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
            javascript-TODO="${javascript_TODO`
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
                  $${application.server.locals.partials.user({
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
            "messagesContentSearchIndex" MATCH ${application.server.locals.helpers.sanitizeSearch(
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
        const conversation = application.server.locals.helpers.getConversation({
          request,
          response,
          conversationReference: messageRow.conversationReference,
        });
        if (conversation === undefined) continue;
        const message = application.server.locals.helpers.getMessage({
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
            javascript-TODO="${javascript_TODO`
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
        application.server.locals.layouts.partial({
          request,
          response,
          body: html`
            $${results === html``
              ? html`
                  <div class="dropdown--menu--item secondary">
                    No conversation or message found.
                  </div>
                `
              : results}
          `,
        })
      );
    }
  );

  application.server.post<
    {},
    any,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
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

  application.server.post<
    { courseReference?: string },
    any,
    { content?: string },
    {},
    Application["server"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]> &
      Partial<
        Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      >
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
        application.server.locals.layouts.partial({
          request,
          response,
          body: application.server.locals.partials.content({
            request,
            response,
            contentPreprocessed:
              application.server.locals.partials.contentPreprocessed(
                request.body.content
              ).contentPreprocessed,
            decorate: true,
          }).contentProcessed,
        })
      );
    }
  );
};
