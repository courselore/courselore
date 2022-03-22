import path from "node:path";
import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema as rehypeSanitizeDefaultSchema,
} from "rehype-sanitize";
import deepMerge from "deepmerge";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@leafac/rehype-shiki";
import * as shiki from "shiki";
import { visit as unistUtilVisit } from "unist-util-visit";
import rehypeStringify from "rehype-stringify";
import { JSDOM } from "jsdom";
import sharp from "sharp";
import escapeStringRegexp from "escape-string-regexp";
import slugify from "@sindresorhus/slugify";
import filenamify from "filenamify";
import cryptoRandomString from "crypto-random-string";
import lodash from "lodash";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  UserAvatarlessBackgroundColor,
  EnrollmentRole,
  IsEnrolledInCourseMiddlewareLocals,
  IsConversationAccessibleMiddlewareLocals,
} from "./index.js";

export type ContentPartial = ({
  req,
  res,
  type,
  content,
  decorate,
  search,
}: {
  req: express.Request<
    {},
    any,
    {},
    {},
    BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  res: express.Response<
    any,
    BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  type: "source" | "preprocessed";
  content: string;
  decorate?: boolean;
  search?: string | string[] | undefined;
}) => {
  preprocessed: HTML | undefined;
  search: string | undefined;
  processed: HTML;
  mentions: Set<string> | undefined;
};

export type ContentEditorPartial = ({
  req,
  res,
  name,
  contentSource,
  required,
  compact,
}: {
  req: express.Request<
    {},
    any,
    {},
    {},
    BaseMiddlewareLocals &
      Partial<IsEnrolledInCourseMiddlewareLocals> &
      Partial<IsConversationAccessibleMiddlewareLocals>
  >;
  res: express.Response<
    any,
    BaseMiddlewareLocals &
      Partial<IsEnrolledInCourseMiddlewareLocals> &
      Partial<IsConversationAccessibleMiddlewareLocals>
  >;
  name?: string;
  contentSource?: string;
  required?: boolean;
  compact?: boolean;
}) => HTML;

export type MentionUserSearchHandler = express.RequestHandler<
  { courseReference: string; conversationReference?: string },
  any,
  {},
  { search?: string },
  IsEnrolledInCourseMiddlewareLocals &
    Partial<IsConversationAccessibleMiddlewareLocals>
>;

export type ContentPreviewHandler = express.RequestHandler<
  {},
  any,
  { content?: string },
  {},
  BaseMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
>;

export default async (app: Courselore): Promise<void> => {
  app.locals.partials.content = await (async () => {
    const unifiedProcessor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMath)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(
        rehypeSanitize,
        deepMerge(rehypeSanitizeDefaultSchema, {
          attributes: {
            code: ["className"],
            span: [["className", "math", "math-inline"]],
            div: [["className", "math", "math-display"]],
          },
        })
      )
      .use(rehypeKatex, { maxSize: 25, maxExpand: 10, output: "html" })
      .use(rehypeShiki, {
        highlighter: {
          light: await shiki.getHighlighter({ theme: "light-plus" }),
          dark: await shiki.getHighlighter({ theme: "dark-plus" }),
        },
      })
      .use(() => (tree) => {
        unistUtilVisit(tree, (node) => {
          if (
            (node as any).properties !== undefined &&
            node.position !== undefined
          )
            (node as any).properties.dataPosition = JSON.stringify(
              node.position
            );
        });
      })
      .use(rehypeStringify);

    return ({
      req,
      res,
      type,
      content,
      decorate = false,
      search = undefined,
    }) => {
      const contentElement = JSDOM.fragment(html`
        <div class="content">
          $${type === "source"
            ? unifiedProcessor.processSync(content).toString()
            : type === "preprocessed"
            ? content
            : html``}
        </div>
      `).firstElementChild!;
      const contentPreprocessed =
        type === "source" ? contentElement.innerHTML : undefined;
      const contentSearch =
        type === "source" ? contentElement.textContent! : undefined;
      let mentions: Set<string> | undefined;

      for (const element of contentElement.querySelectorAll(
        "li, td, th, dt, dd"
      ))
        element.innerHTML = [...element.childNodes].some(
          (node) =>
            node.nodeType === node.TEXT_NODE && node.textContent!.trim() !== ""
        )
          ? html`<div><p>$${element.innerHTML}</p></div>`
          : html`<div>$${element.innerHTML}</div>`;

      for (const element of contentElement.querySelectorAll("img"))
        element.setAttribute("loading", "lazy");

      for (const element of contentElement.querySelectorAll("details")) {
        const summaries: Node[] = [];
        const rest: Node[] = [];
        for (const child of element.childNodes)
          (child.nodeType === child.ELEMENT_NODE &&
          (child as Element).tagName.toLowerCase() === "summary"
            ? summaries
            : rest
          ).push(child);
        switch (summaries.length) {
          case 0:
            summaries.push(
              JSDOM.fragment(html`<summary>See More</summary>`)
                .firstElementChild!
            );
            break;
          case 1:
            break;
          default:
            continue;
        }
        const wrapper = JSDOM.fragment(html`<div></div>`).firstElementChild!;
        wrapper.replaceChildren(...rest);
        element.replaceChildren(summaries[0], wrapper);
      }

      const namespace = Math.random().toString(36).slice(2);
      for (const element of contentElement.querySelectorAll("[id]"))
        element.id += `--${namespace}`;
      for (const element of contentElement.querySelectorAll("[href]")) {
        let href = element.getAttribute("href")!;
        if (href.startsWith("#")) {
          href = `#user-content-${href.slice(1)}--${namespace}`;
          element.setAttribute("href", href);
        }
        if (
          href.startsWith("#user-content-user-content-fnref-") &&
          element.innerHTML === "↩"
        )
          element.innerHTML = html`<i class="bi bi-arrow-return-left"></i>`;
        if (
          (!href.startsWith("#") &&
            !href.startsWith(app.locals.options.baseURL)) ||
          href.startsWith(`${app.locals.options.baseURL}/files/`)
        ) {
          element.setAttribute("target", "_blank");
          element.setAttribute(
            "onload",
            javascript`
              ${
                href.startsWith(`${app.locals.options.baseURL}/files/`)
                  ? javascript``
                  : javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: ${res.locals.HTMLForJavaScript(
                          html`External link to
                            <code class="code">${href}</code>`
                        )},
                      });
                    `
              }
            `
          );
        }
      }

      if (decorate) {
        if (res.locals.course !== undefined) {
          const narrowReq = req as express.Request<
            {},
            any,
            {},
            {},
            IsEnrolledInCourseMiddlewareLocals
          >;
          const narrowRes = res as express.Response<
            any,
            IsEnrolledInCourseMiddlewareLocals
          >;

          for (const element of contentElement.querySelectorAll("a")) {
            const href = element.getAttribute("href");
            if (href !== element.textContent!.trim()) continue;
            const match = href.match(
              new RegExp(
                `^${escapeStringRegexp(
                  app.locals.options.baseURL
                )}/courses/(\\d+)/conversations/(\\d+)(?:\\?messageReference=(\\d+))?$`
              )
            );
            if (match === null) continue;
            const [courseReference, conversationReference, messageReference] =
              match.slice(1);
            if (courseReference !== res.locals.course.reference) continue;
            const conversation = app.locals.helpers.getConversation({
              req: narrowReq,
              res: narrowRes,
              conversationReference,
            });
            if (conversation === undefined) continue;
            if (messageReference === undefined) {
              element.textContent = `#${conversation.reference}`;
              continue;
            }
            const message = app.locals.helpers.getMessage({
              req: narrowReq,
              res: narrowRes,
              conversation,
              messageReference,
            });
            if (message === undefined) continue;
            element.textContent = `#${conversation.reference}/${message.reference}`;
          }

          mentions = new Set();
          (function processTree(node: Node): void {
            processNode();
            if (node.hasChildNodes())
              for (const childNode of node.childNodes) processTree(childNode);
            function processNode() {
              switch (node.nodeType) {
                case node.TEXT_NODE:
                  const parentElement = node.parentElement;
                  if (
                    node.textContent === null ||
                    parentElement === null ||
                    parentElement.closest("a, code, .mention, .reference") !==
                      null
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
                          mentions!.add(mention);
                          mentionHTML = html`<span
                            onload="${javascript`
                              (this.tooltip ??= tippy(this)).setProps({
                                touch: false,
                                content: "Mention ${mention} in the conversation",
                              });
                            `}"
                            >@${lodash.capitalize(mention)}</span
                          >`;
                          break;
                        case "anonymous":
                          mentionHTML = html`@$${app.locals.partials.user({
                            req,
                            res,
                            avatar: false,
                          })}`;
                          break;
                        default:
                          const enrollmentReference = mention.split("--")[0];
                          const enrollmentRow = app.locals.database.get<{
                            id: number;
                            userId: number;
                            userLastSeenOnlineAt: string;
                            userEmail: string;
                            userName: string;
                            userAvatar: string | null;
                            userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor;
                            userBiographySource: string | null;
                            userBiographyPreprocessed: HTML | null;
                            reference: string;
                            role: EnrollmentRole;
                          }>(
                            sql`
                              SELECT "enrollments"."id",
                                      "users"."id" AS "userId",
                                      "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                                      "users"."email" AS "userEmail",
                                      "users"."name" AS "userName",
                                      "users"."avatar" AS "userAvatar",
                                      "users"."avatarlessBackgroundColor" AS  "userAvatarlessBackgroundColor",
                                      "users"."biographySource" AS "userBiographySource",
                                      "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                                      "enrollments"."reference",
                                      "enrollments"."role"
                              FROM "enrollments"
                              JOIN "users" ON "enrollments"."user" = "users"."id"
                              WHERE "enrollments"."course" = ${
                                res.locals.course!.id
                              } AND
                                    "enrollments"."reference" = ${enrollmentReference}
                            `
                          );
                          if (enrollmentRow === undefined) return match;
                          const enrollment = {
                            id: enrollmentRow.id,
                            user: {
                              id: enrollmentRow.userId,
                              lastSeenOnlineAt:
                                enrollmentRow.userLastSeenOnlineAt,
                              email: enrollmentRow.userEmail,
                              name: enrollmentRow.userName,
                              avatar: enrollmentRow.userAvatar,
                              avatarlessBackgroundColor:
                                enrollmentRow.userAvatarlessBackgroundColor,
                              biographySource:
                                enrollmentRow.userBiographySource,
                              biographyPreprocessed:
                                enrollmentRow.userBiographyPreprocessed,
                            },
                            reference: enrollmentRow.reference,
                            role: enrollmentRow.role,
                          };
                          mentions!.add(enrollment.reference);
                          mentionHTML = html`@$${app.locals.partials.user({
                            req,
                            res,
                            enrollment,
                            avatar: false,
                          })}`;
                          if (enrollment.user.id === res.locals.user!.id)
                            mentionHTML = html`<mark class="mark"
                              >$${mentionHTML}</mark
                            >`;
                          break;
                      }
                      return html`<strong class="mention"
                        >$${mentionHTML}</strong
                      >`;
                    }
                  );

                  newNodeHTML = newNodeHTML.replace(
                    /(?<!\w)#(\d+)(?:\/(\d+))?(?!\w)/g,
                    (match, conversationReference, messageReference) => {
                      const conversation = app.locals.helpers.getConversation({
                        req: narrowReq,
                        res: narrowRes,
                        conversationReference,
                      });
                      if (conversation === undefined) return match;
                      if (messageReference === undefined)
                        return html`<a
                          class="reference"
                          href="${app.locals.options.baseURL}/courses/${res
                            .locals.course!
                            .reference}/conversations/${conversation.reference}"
                          >${match}</a
                        >`;
                      const message = app.locals.helpers.getMessage({
                        req: narrowReq,
                        res: narrowRes,
                        conversation,
                        messageReference,
                      });
                      if (message === undefined) return match;
                      return html`<a
                        class="reference"
                        href="${app.locals.options.baseURL}/courses/${res.locals
                          .course!
                          .reference}/conversations/${conversation.reference}?messageReference=${message.reference}"
                        >${match}</a
                      >`;
                    }
                  );

                  parentElement.replaceChild(JSDOM.fragment(newNodeHTML), node);
                  break;
              }
            }
          })(contentElement);

          for (const element of contentElement.querySelectorAll("a")) {
            const href = element.getAttribute("href");
            if (href === null) continue;
            const hrefMatch = href.match(
              new RegExp(
                `^${escapeStringRegexp(
                  app.locals.options.baseURL
                )}/courses/(\\d+)/conversations/(\\d+)(?:\\?messageReference=(\\d+))?$`
              )
            );
            if (hrefMatch === null) continue;
            const [
              hrefCourseReference,
              hrefConversationReference,
              hrefMessageReference,
            ] = hrefMatch.slice(1);
            if (hrefCourseReference !== res.locals.course.reference) continue;
            const textContentMatch = element
              .textContent!.trim()
              .match(/^#(\d+)(?:\/(\d+))?$/);
            if (textContentMatch === null) continue;
            const [
              textContentConversationReference,
              textContentMessageReference,
            ] = textContentMatch.slice(1);
            if (
              hrefConversationReference !== textContentConversationReference ||
              hrefMessageReference !== textContentMessageReference
            )
              continue;
            const conversation = app.locals.helpers.getConversation({
              req: narrowReq,
              res: narrowRes,
              conversationReference: hrefConversationReference,
            });
            if (conversation === undefined) continue;
            if (hrefMessageReference === undefined) {
              element.setAttribute(
                "onload",
                javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <div
                          class="${res.locals.localCSS(css`
                            padding: var(--space--2);
                          `)}"
                        >
                          $${app.locals.partials.conversation({
                            req: narrowReq,
                            res: narrowRes,
                            conversation,
                          })}
                        </div>
                      `
                    )},
                  });
                `
              );
              continue;
            }
            const message = app.locals.helpers.getMessage({
              req: narrowReq,
              res: narrowRes,
              conversation,
              messageReference: hrefMessageReference,
            });
            if (message === undefined) continue;
            element.setAttribute(
              "onload",
              javascript`
                (this.tooltip ??= tippy(this)).setProps({
                  touch: false,
                  content: ${res.locals.HTMLForJavaScript(
                    html`
                      <div
                        class="${res.locals.localCSS(css`
                          padding: var(--space--2);
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--2);
                        `)}"
                      >
                        $${app.locals.partials.conversation({
                          req: narrowReq,
                          res: narrowRes,
                          conversation,
                          message,
                        })}
                      </div>
                    `
                  )},
                });
              `
            );
          }
        }

        if (search !== undefined)
          (function processTree(node: Node): void {
            processNode();
            if (node.hasChildNodes())
              for (const childNode of node.childNodes) processTree(childNode);
            function processNode() {
              switch (node.nodeType) {
                case node.TEXT_NODE:
                  const parentElement = node.parentElement;
                  if (node.textContent === null || parentElement === null)
                    return;
                  parentElement.replaceChild(
                    JSDOM.fragment(
                      app.locals.helpers.highlightSearchResult(
                        html`${node.textContent}`,
                        search
                      )
                    ),
                    node
                  );
                  break;
              }
            }
          })(contentElement);
      }

      return {
        preprocessed: contentPreprocessed,
        search: contentSearch,
        processed: contentElement.outerHTML,
        mentions,
      };
    };
  })();

  app.locals.partials.contentEditor = ({
    req,
    res,
    name = "content",
    contentSource = "",
    required = true,
    compact = false,
  }) => html`
    <div
      class="content-editor ${res.locals.localCSS(css`
        min-width: var(--space--0);
      `)}"
    >
      $${compact
        ? html``
        : html`
            <div
              class="${res.locals.localCSS(css`
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
              `)}"
            >
              <label>
                <input
                  type="radio"
                  name="content-editor--mode"
                  checked
                  class="content-editor--button--write visually-hidden"
                  onload="${javascript`
                    this.isModified = false;

                    this.onclick = () => {
                      this.closest(".content-editor").querySelector(".content-editor--write").hidden = false;
                      this.closest(".content-editor").querySelector(".content-editor--loading").hidden = true;
                      this.closest(".content-editor").querySelector(".content-editor--preview").hidden = true;  
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
                  onload="${javascript`
                    this.isModified = false;

                    this.onclick = async (event) => {
                      const write = this.closest(".content-editor").querySelector(".content-editor--write");
                      const loading = this.closest(".content-editor").querySelector(".content-editor--loading");
                      const preview = this.closest(".content-editor").querySelector(".content-editor--preview");
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
                          await fetch(${JSON.stringify(
                            `${app.locals.options.baseURL}${
                              res.locals.course === undefined
                                ? ""
                                : `/courses/${res.locals.course.reference}`
                            }/content-editor/preview`
                          )}, {
                            method: "POST",
                            body: new URLSearchParams({
                              _csrf: ${JSON.stringify(req.csrfToken())},
                              content: textarea.value,
                            }),
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
                  onload="${javascript`
                    (this.tooltip ??= tippy(this)).setProps({
                      touch: false,
                      content: ${res.locals.HTMLForJavaScript(
                        html`
                          <span class="keyboard-shortcut">
                            <span
                              onload="${javascript`
                                this.hidden = leafac.isAppleDevice;
                              `}"
                              >Ctrl+Alt+P</span
                            ><span
                              class="keyboard-shortcut--cluster"
                              onload="${javascript`
                                this.hidden = !leafac.isAppleDevice;
                              `}"
                              ><i class="bi bi-alt"></i
                              ><i class="bi bi-command"></i>P</span
                            >
                          </span>
                        `
                      )},
                    });

                    const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
        class="${res.locals.localCSS(css`
          background-color: var(--color--gray--medium--100);
          @media (prefers-color-scheme: dark) {
            background-color: var(--color--gray--medium--800);
          }
          border-radius: var(--border-radius--lg);
        `)}"
      >
        <div class="content-editor--write">
          <div
            $${compact ? html`hidden` : html``}
            class="${res.locals.localCSS(css`
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
            `)}"
          >
            <div>
              <button
                type="button"
                class="button button--tight button--transparent"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: "Help",
                  });

                  (this.dropdown ??= tippy(this)).setProps({
                    trigger: "click",
                    interactive: true,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
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
                      `
                    )},
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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 1
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+1</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>1</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 2
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+2</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>2</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Heading 3
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+3</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>3</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Bold
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+B</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>B</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Italic
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>I</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Link
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>K</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Bulleted List
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+8</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>8</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Numbered List
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+7</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>7</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Checklist
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+9</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>9</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Quote
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+'</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>'</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

                  this.onclick = () => {
                    textFieldEdit.wrapSelection(textarea, ((textarea.selectionStart > 0) ? "\\n\\n" : "") + "> ", "\\n\\n");
                    textarea.focus();
                  };

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+'", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-chat-left-quote"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Table
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+T</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>T</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Disclosure
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+D</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>D</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Footnote
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+F</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>F</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Inline Code
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Code Block
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Inline Equation
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });
                  
                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Equation Block
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+Shift+E</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>E</span
                          >)
                        </span>
                      `
                    )},
                  });

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
            $${res.locals.course !== undefined
              ? html`
                  <div>
                    <button
                      type="button"
                      class="button button--tight button--transparent"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              Mention User
                              <span class="keyboard-shortcut">(@)</span>
                            `
                          )},
                        });

                        const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              Refer to Conversation or Message
                              <span class="keyboard-shortcut">(#)</span>
                            `
                          )},
                        });

                        const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Image
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+I</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>I</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `
                    )},
                  });

                  this.onclick = () => {
                    this.closest(".content-editor").querySelector(".content-editor--write--attachments").click();
                  };

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+i", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-image"></i>
              </button>
              <button
                type="button"
                class="button button--tight button--transparent"
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Attachment
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Shift+K</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-shift"></i
                            ><i class="bi bi-command"></i>K</span
                          >
                          or drag-and-drop or copy-and-paste)
                        </span>
                      `
                    )},
                  });

                  this.onclick = () => {
                    this.closest(".content-editor").querySelector(".content-editor--write--attachments").click();
                  };

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

                  (textarea.mousetrap ??= new Mousetrap(textarea)).bind("mod+shift+k", () => { this.click(); return false; });
                `}"
              >
                <i class="bi bi-paperclip"></i>
              </button>
              <input
                type="file"
                class="content-editor--write--attachments"
                multiple
                hidden
                onload="${javascript`
                  this.isModified = false;

                  const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

                  this.upload = async (fileList) => {
                    if (!checkIsSignedIn()) return;
                    const body = new FormData();
                    body.append("_csrf", ${JSON.stringify(req.csrfToken())});
                    for (const file of fileList) body.append("attachments", file);
                    this.value = "";
                    tippy.hideAll();
                    textarea.uploadingIndicator.show();
                    textarea.disabled = true;
                    const response = await (await fetch(${JSON.stringify(
                      `${app.locals.options.baseURL}/content-editor/attachments`
                    )}, {
                      method: "POST",
                      body,
                    })).text();
                    textarea.disabled = false;
                    textarea.uploadingIndicator.hide();
                    textFieldEdit.wrapSelection(textarea, response, "");
                    textarea.focus();
                  };

                  const checkIsSignedIn = ${
                    res.locals.user === undefined
                      ? javascript`
                          (() => {
                            (textarea.tooltip ??= tippy(textarea)).setProps({
                              trigger: "manual",
                              theme: "rose",
                              content: "You must sign in to upload files.",
                            });
                            return () => {
                              textarea.tooltip.show();
                              return false;
                            };
                          })();
                        `
                      : javascript`
                          () => true;
                        `
                  }

                  (textarea.uploadingIndicator ??= tippy(textarea)).setProps({
                    trigger: "manual",
                    hideOnClick: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        <div
                          class="${res.locals.localCSS(css`
                            display: flex;
                            gap: var(--space--2);
                          `)}"
                        >
                          $${app.locals.partials.spinner({ req, res })}
                          Uploading…
                        </div>
                      `
                    )},
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
                onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    touch: false,
                    content: ${res.locals.HTMLForJavaScript(
                      html`
                        Programmer Mode
                        <span class="secondary">(Monospaced Font)</span>
                        <span class="keyboard-shortcut">
                          (<span
                            onload="${javascript`
                              this.hidden = leafac.isAppleDevice;
                            `}"
                            >Ctrl+Alt+0</span
                          ><span
                            class="keyboard-shortcut--cluster"
                            onload="${javascript`
                              this.hidden = !leafac.isAppleDevice;
                            `}"
                            ><i class="bi bi-alt"></i
                            ><i class="bi bi-command"></i>0</span
                          >)
                        </span>
                      `
                    )},
                  });
                `}"
              >
                <input
                  type="checkbox"
                  class="visually-hidden input--radio-or-checkbox--multilabel"
                  onload="${javascript`
                    this.isModified = false;

                    const textarea = this.closest(".content-editor").querySelector(".content-editor--write--textarea");

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
            class="${res.locals.localCSS(css`
              position: relative;
            `)}"
          >
            <div
              class="content-editor--write--textarea--dropdown-menu-target ${res
                .locals.localCSS(css`
                width: var(--space--0);
                height: var(--line-height--sm);
                position: absolute;
              `)}"
            ></div>
            <textarea
              name="${name}"
              $${required ? html`required` : html``}
              class="content-editor--write--textarea input--text input--text--textarea ${res
                .locals.localCSS(css`
                ${compact
                  ? css`
                      height: var(--space--14);
                    `
                  : css`
                      height: var(--space--20);
                    `}
                max-height: var(--space--64);

                &.drag {
                  background-color: var(--color--blue--200);
                  @media (prefers-color-scheme: dark) {
                    background-color: var(--color--blue--900);
                  }
                }

                &.content-editor--write--textarea--programmer-mode {
                  font-family: "JetBrains Mono", var(--font-family--monospace);
                  font-variant-ligatures: none;
                }
              `)}"
              onload="${javascript`
                autosize(this);

                this.ondragenter = () => {
                  this.classList.add("drag");
                };
                this.ondragover = (event) => {
                  event.preventDefault();
                };
                this.ondrop = (event) => {
                  event.preventDefault();
                  this.classList.remove("drag");
                  this.closest(".content-editor").querySelector(".content-editor--write--attachments").upload(event.dataTransfer.files);
                };
                this.ondragleave = () => {
                  this.classList.remove("drag");
                };
                this.onpaste = (event) => {
                  if (event.clipboardData.files.length === 0) return;
                  event.preventDefault();
                  this.closest(".content-editor").querySelector(".content-editor--write--attachments").upload(event.clipboardData.files);
                };

                ${
                  res.locals.course !== undefined
                    ? javascript`
                        const dropdownMenuTarget = this.closest(".content-editor").querySelector(".content-editor--write--textarea--dropdown-menu-target");

                        (dropdownMenuTarget.dropdownMenuMention ??= tippy(dropdownMenuTarget)).setProps({
                          placement: "bottom-start",
                          trigger: "manual",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <div
                                class="${res.locals.localCSS(css`
                                  width: var(--space--56);
                                  max-height: var(--space--44);
                                  overflow: auto;
                                `)}"
                              >
                                <p class="heading">
                                  <i class="bi bi-at"></i>
                                  Mention User
                                </p>
                                <div class="dropdown--menu">
                                  <div class="search-results"></div>
                                  <button
                                    type="button"
                                    class="dropdown--menu--item button button--transparent"
                                    onload="${javascript`
                                      this.onclick = () => {
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("everyone");
                                      };
                                    `}"
                                  >
                                    Everyone in the Conversation
                                  </button>
                                  <button
                                    type="button"
                                    class="dropdown--menu--item button button--transparent"
                                    onload="${javascript`
                                      this.onclick = () => {
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("staff");
                                      };
                                    `}"
                                  >
                                    Staff in the Conversation
                                  </button>
                                  <button
                                    type="button"
                                    class="dropdown--menu--item button button--transparent"
                                    onload="${javascript`
                                      this.onclick = () => {
                                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete("students");
                                      };
                                    `}"
                                  >
                                    Students in the Conversation
                                  </button>
                                </div>
                              </div>
                            `
                          )},
                        });

                        (dropdownMenuTarget.dropdownMenuReference ??= tippy(dropdownMenuTarget)).setProps({
                          placement: "bottom-start",
                          trigger: "manual",
                          interactive: true,
                          content: ${res.locals.HTMLForJavaScript(
                            html`
                              <div
                                class="${res.locals.localCSS(css`
                                  width: var(--space--72);
                                  max-height: var(--space--44);
                                  overflow: auto;
                                `)}"
                              >
                                <p class="heading">
                                  <i class="bi bi-hash"></i>
                                  Refer to Conversation or Message
                                </p>
                                <div class="dropdown--menu">
                                  <div class="search-results"></div>
                                </div>
                              </div>
                            `
                          )},
                        });

                        const dropdownMenus = [
                          {
                            trigger: "@",
                            route: ${JSON.stringify(
                              `${app.locals.options.baseURL}/courses/${
                                res.locals.course.reference
                              }/${
                                res.locals.conversation !== undefined
                                  ? `conversations/${res.locals.conversation.reference}/`
                                  : ``
                              }content-editor/mention-user-search`
                            )},
                            dropdownMenu: dropdownMenuTarget.dropdownMenuMention,
                          },
                          {
                            trigger: "#",
                            route: ${JSON.stringify(
                              `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/content-editor/refer-to-conversation-or-message-search`
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
                                const caretCoordinates = getCaretCoordinates(this, anchorIndex - 1);
                                dropdownMenuTarget.style.top = String(caretCoordinates.top) + "px";
                                dropdownMenuTarget.style.left = String(caretCoordinates.left) + "px";
                                tippy.hideAll();
                                dropdownMenu.show();
                              }
                              if (selectionMin < anchorIndex || value[anchorIndex - 1] !== trigger) {
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
                              const searchResults = content.querySelector(".search-results");
                              const search = value.slice(anchorIndex, selectionMax).trim();
                              if (search === "") searchResults.innerHTML = "";
                              else
                                leafac.loadPartial(
                                  searchResults,
                                  await (await fetch(route + "?" + new URLSearchParams({ search }))).text()
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
                                scrollIntoView(buttonToHover, { scrollMode: "if-needed" });
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
                    : javascript`
                      `
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
                hidden
                class="content-editor--loading strong ${res.locals.localCSS(css`
                  padding: var(--space--4);
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  gap: var(--space--2);
                `)}"
              >
                $${app.locals.partials.spinner({ req, res })} Loading…
              </div>

              <div
                hidden
                class="content-editor--preview ${res.locals.localCSS(css`
                  padding: var(--space--4);
                `)}"
              ></div>
            `}
      </div>
    </div>
  `;

  app.locals.handlers.mentionUserSearch = (req, res, next) => {
    if (typeof req.query.search !== "string" || req.query.search.trim() === "")
      return next("validation");

    const enrollments = app.locals.database
      .all<{
        id: number;
        userId: number;
        userLastSeenOnlineAt: string;
        userEmail: string;
        userName: string;
        userAvatar: string | null;
        userAvatarlessBackgroundColor: UserAvatarlessBackgroundColor;
        userBiographySource: string | null;
        userBiographyPreprocessed: HTML | null;
        userNameSearchResultHighlight: string;
        reference: string;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "enrollments"."id",
                 "users"."id" AS "userId",
                 "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
                 "users"."email" AS "userEmail",
                 "users"."name" AS "userName",
                 "users"."avatar" AS "userAvatar",
                 "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                 "users"."biographySource" AS "userBiographySource",
                 "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                 highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "userNameSearchResultHighlight",
                 "enrollments"."reference",
                 "enrollments"."role"
          FROM "enrollments"
          JOIN "users" ON "enrollments"."user" = "users"."id" AND
                          "enrollments"."course" = ${res.locals.course.id} AND
                          "users"."id" != ${res.locals.user.id}
          JOIN "usersNameSearchIndex" ON "users"."id" = "usersNameSearchIndex"."rowid" AND
                                        "usersNameSearchIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                          req.query.search,
                                          { prefix: true }
                                        )}
          $${
            res.locals.conversation !== undefined &&
            res.locals.conversation.staffOnlyAt !== null
              ? sql`
                  WHERE "enrollments"."role" = ${"staff"} OR
                        EXISTS(
                          SELECT TRUE
                          FROM "messages"
                          WHERE "enrollments"."id" = "messages"."authorEnrollment" AND
                                "messages"."conversation" = ${
                                  res.locals.conversation.id
                                }
                        )
                `
              : sql``
          }
          ORDER BY "usersNameSearchIndex"."rank" ASC,
                   "users"."name" ASC
          LIMIT 5
        `
      )
      .map((enrollment) => ({
        id: enrollment.id,
        user: {
          id: enrollment.userId,
          lastSeenOnlineAt: enrollment.userLastSeenOnlineAt,
          email: enrollment.userEmail,
          name: enrollment.userName,
          avatar: enrollment.userAvatar,
          avatarlessBackgroundColor: enrollment.userAvatarlessBackgroundColor,
          biographySource: enrollment.userBiographySource,
          biographyPreprocessed: enrollment.userBiographyPreprocessed,
          nameSearchResultHighlight: enrollment.userNameSearchResultHighlight,
        },
        reference: enrollment.reference,
        role: enrollment.role,
      }));

    res.send(
      app.locals.layouts.partial({
        req,
        res,
        body: html`
          $${enrollments.length === 0
            ? html`
                <div class="dropdown--menu--item secondary">No user found.</div>
              `
            : enrollments.map(
                (enrollment) => html`
                  <button
                    type="button"
                    class="dropdown--menu--item button button--transparent"
                    onload="${javascript`
                      this.onclick = () => {
                        this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                          `${enrollment.reference}--${slugify(
                            enrollment.user.name
                          )}`
                        )});  
                      };
                  `}"
                  >
                    $${app.locals.partials.user({
                      req,
                      res,
                      enrollment,
                      name: enrollment.user.nameSearchResultHighlight,
                      tooltip: false,
                      size: "xs",
                    })}
                  </button>
                `
              )}
        `,
      })
    );
  };

  app.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/mention-user-search",
    ...app.locals.middlewares.isEnrolledInCourse,
    app.locals.handlers.mentionUserSearch
  );

  app.get<
    { courseReference: string; conversationReference: string },
    any,
    {},
    { search?: string },
    IsConversationAccessibleMiddlewareLocals
  >(
    "/courses/:courseReference/conversations/:conversationReference/content-editor/mention-user-search",
    ...app.locals.middlewares.isConversationAccessible,
    app.locals.handlers.mentionUserSearch
  );

  app.get<
    { courseReference: string },
    any,
    {},
    { search?: string },
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/refer-to-conversation-or-message-search",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.query.search !== "string" ||
        req.query.search.trim() === ""
      )
        return next("validation");

      const results: HTML[] = [];

      if (req.query.search.match(/^\d+$/) !== null)
        results.push(
          ...app.locals.database
            .all<{ reference: string }>(
              sql`
                SELECT "conversations"."reference"
                FROM "conversations"
                JOIN "conversationsReferenceIndex" ON "conversations"."id" = "conversationsReferenceIndex"."rowid" AND
                                                      "conversationsReferenceIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                                        req.query.search,
                                                        { prefix: true }
                                                      )}
                WHERE "conversations"."course" = ${res.locals.course.id}
                ORDER BY "conversations"."id" ASC
                LIMIT 5
              `
            )
            .flatMap((conversationRow) => {
              const conversation = app.locals.helpers.getConversation({
                req,
                res,
                conversationReference: conversationRow.reference,
              });
              return conversation === undefined
                ? []
                : [
                    html`
                      <button
                        type="button"
                        class="dropdown--menu--item button button--transparent"
                        onload="${javascript`
                          this.onclick = () => {
                            this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                              conversation.reference
                            )});
                          };
                        `}"
                      >
                        <span>
                          <span class="secondary">
                            $${app.locals.helpers.highlightSearchResult(
                              `#${conversation.reference}`,
                              `#${req.query.search}`,
                              { prefix: true }
                            )}
                          </span>
                          <span class="strong">${conversation.title}</span>
                        </span>
                      </button>
                    `,
                  ];
            })
        );

      const messageReferenceSearchMatch =
        req.query.search.match(/^(\d+)\/(\d*)$/);
      if (messageReferenceSearchMatch !== null) {
        const [conversationReference, messageReferenceSearch] =
          messageReferenceSearchMatch.slice(1);
        const conversation = app.locals.helpers.getConversation({
          req,
          res,
          conversationReference,
        });
        if (conversation !== undefined) {
          results.push(
            ...app.locals.database
              .all<{ reference: string }>(
                sql`
                  SELECT "messages"."reference"
                  FROM "messages"
                  $${
                    messageReferenceSearch === ""
                      ? sql``
                      : sql`
                        JOIN "messagesReferenceIndex" ON "messages"."id" = "messagesReferenceIndex"."rowid" AND
                                                         "messagesReferenceIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                                           messageReferenceSearch,
                                                           { prefix: true }
                                                         )}
                      `
                  }
                  WHERE "messages"."conversation" = ${conversation.id}
                  ORDER BY "messages"."id" ASC
                  LIMIT 5
                `
              )
              .flatMap((messageRow) => {
                const message = app.locals.helpers.getMessage({
                  req,
                  res,
                  conversation,
                  messageReference: messageRow.reference,
                });
                return message === undefined
                  ? []
                  : [
                      html`
                        <button
                          type="button"
                          class="dropdown--menu--item button button--transparent"
                          onload="${javascript`
                            this.onclick = () => {
                              this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                                `${conversation.reference}/${message.reference}`
                              )});
                            };
                          `}"
                        >
                          <div>
                            <div>
                              <span class="secondary">
                                $${app.locals.helpers.highlightSearchResult(
                                  `#${conversation.reference}/${message.reference}`,
                                  `#${req.query.search}`,
                                  { prefix: true }
                                )}
                              </span>
                              <span class="strong">
                                ${conversation.title}
                              </span>
                            </div>
                            <div class="secondary">
                              $${lodash.truncate(message.contentSearch, {
                                length: 100,
                                separator: /\W/,
                              })}
                            </div>
                          </div>
                        </button>
                      `,
                    ];
              })
          );
          results.push(
            html`
              <button
                type="button"
                class="dropdown--menu--item button button--transparent"
                onload="${javascript`
                  this.onclick = () => {
                    this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                      conversation.reference
                    )});
                  };
                `}"
              >
                <span>
                  <span class="secondary">
                    $${app.locals.helpers.highlightSearchResult(
                      `#${conversation.reference}`,
                      `#${conversationReference}`
                    )}
                  </span>
                  <span class="strong">${conversation.title}</span>
                </span>
              </button>
            `
          );
        }
      }

      results.push(
        ...app.locals.database
          .all<{
            reference: string;
            conversationTitleSearchResultHighlight: string;
          }>(
            sql`
              SELECT "conversations"."reference",
                     highlight("conversationsTitleSearchIndex", 0, '<mark class="mark">', '</mark>') AS "conversationTitleSearchResultHighlight"
              FROM "conversations"
              JOIN "conversationsTitleSearchIndex" ON "conversations"."id" = "conversationsTitleSearchIndex"."rowid" AND
                                                      "conversationsTitleSearchIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                                        req.query.search,
                                                        { prefix: true }
                                                      )}
              WHERE "conversations"."course" = ${res.locals.course.id}
              ORDER BY "conversationsTitleSearchIndex"."rank" ASC,
                       "conversations"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((conversationRow) => {
            const conversation = app.locals.helpers.getConversation({
              req,
              res,
              conversationReference: conversationRow.reference,
            });
            return conversation === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onload="${javascript`
                        this.onclick = () => {
                          this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                            conversation.reference
                          )});
                        };
                      `}"
                    >
                      <span>
                        <span class="secondary">
                          #${conversation.reference}
                        </span>
                        <span class="strong">
                          $${conversationRow.conversationTitleSearchResultHighlight}
                        </span>
                      </span>
                    </button>
                  `,
                ];
          })
      );

      results.push(
        ...app.locals.database
          .all<{
            messageReference: string;
            conversationReference: string;
            messageAuthorUserNameSearchResultHighlight: string;
          }>(
            sql`
              SELECT "messages"."reference" AS "messageReference",
                     "conversations"."reference" AS "conversationReference",
                     highlight("usersNameSearchIndex", 0, '<mark class="mark">', '</mark>') AS "messageAuthorUserNameSearchResultHighlight"
              FROM "messages"
              JOIN "enrollments" ON "messages"."authorEnrollment" = "enrollments"."id"
              JOIN "usersNameSearchIndex" ON "enrollments"."user" = "usersNameSearchIndex"."rowid" AND
                                             "usersNameSearchIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                               req.query.search,
                                               { prefix: true }
                                             )}
              JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                      "conversations"."course" = ${
                                        res.locals.course.id
                                      }
              $${
                res.locals.enrollment.role === "staff"
                  ? sql``
                  : sql`
                      WHERE (
                       "messages"."anonymousAt" IS NULL OR
                       "messages"."authorEnrollment" = ${res.locals.enrollment.id}
                     )
                   `
              }
              ORDER BY "usersNameSearchIndex"."rank" ASC,
                       "messages"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((messageRow) => {
            const conversation = app.locals.helpers.getConversation({
              req,
              res,
              conversationReference: messageRow.conversationReference,
            });
            if (conversation === undefined) return [];
            const message = app.locals.helpers.getMessage({
              req,
              res,
              conversation,
              messageReference: messageRow.messageReference,
            });
            return message === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onload="${javascript`
                        this.onclick = () => {
                          this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                            `${conversation.reference}/${message.reference}`
                          )});
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
                            $${app.locals.partials.user({
                              req,
                              res,
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
                  `,
                ];
          })
      );

      results.push(
        ...app.locals.database
          .all<{
            messageReference: string;
            conversationReference: string;
            messageContentSearchResultSnippet: string;
          }>(
            sql`
              SELECT "messages"."reference" AS "messageReference",
                     "conversations"."reference" AS "conversationReference",
                     snippet("messagesContentSearchIndex", 0, '<mark class="mark">', '</mark>', '…', 16) AS "messageContentSearchResultSnippet"
              FROM "messages"
              JOIN "messagesContentSearchIndex" ON "messages"."id" = "messagesContentSearchIndex"."rowid" AND
                                                   "messagesContentSearchIndex" MATCH ${app.locals.helpers.sanitizeSearch(
                                                     req.query.search,
                                                     { prefix: true }
                                                   )}
              JOIN "conversations" ON "messages"."conversation" = "conversations"."id" AND
                                      "conversations"."course" = ${
                                        res.locals.course.id
                                      }
              ORDER BY "messagesContentSearchIndex"."rank" ASC,
                       "messages"."id" DESC
              LIMIT 5
            `
          )
          .flatMap((messageRow) => {
            const conversation = app.locals.helpers.getConversation({
              req,
              res,
              conversationReference: messageRow.conversationReference,
            });
            if (conversation === undefined) return [];
            const message = app.locals.helpers.getMessage({
              req,
              res,
              conversation,
              messageReference: messageRow.messageReference,
            });
            return message === undefined
              ? []
              : [
                  html`
                    <button
                      type="button"
                      class="dropdown--menu--item button button--transparent"
                      onload="${javascript`
                        this.onclick = () => {
                          this.closest(".content-editor").querySelector(".content-editor--write--textarea").dropdownMenuComplete(${JSON.stringify(
                            `${conversation.reference}/${message.reference}`
                          )});
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
                  `,
                ];
          })
      );

      res.send(
        app.locals.layouts.partial({
          req,
          res,
          body: html`
            $${results.length === 0
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

  app.post<{}, any, {}, {}, IsSignedInMiddlewareLocals>(
    "/content-editor/attachments",
    ...app.locals.middlewares.isSignedIn,
    asyncHandler(async (req, res, next) => {
      if (req.files?.attachments === undefined) return next("validation");
      const attachments = Array.isArray(req.files.attachments)
        ? req.files.attachments
        : [req.files.attachments];
      for (const attachment of attachments) {
        if (attachment.truncated)
          return res
            .status(413)
            .send(
              `<!-- Failed to upload: Attachments must be smaller than 10MB. -->`
            );
        attachment.name = filenamify(attachment.name, { replacement: "-" });
        if (attachment.name.trim() === "") return next("validation");
      }
      const attachmentsContentSources: string[] = [];
      for (const attachment of attachments) {
        const folder = cryptoRandomString({
          length: 20,
          type: "numeric",
        });
        await attachment.mv(
          path.join(
            app.locals.options.dataDirectory,
            `files/${folder}/${attachment.name}`
          )
        );
        const href = `${
          app.locals.options.baseURL
        }/files/${folder}/${encodeURIComponent(attachment.name)}`;
        if (attachment.mimetype.startsWith("image/"))
          try {
            const image = sharp(attachment.data, { limitInputPixels: false });
            const metadata = await image.metadata();
            if (metadata.width === undefined) throw new Error();
            const maximumWidth = 1152; /* var(--width--6xl) */
            if (metadata.width <= maximumWidth) {
              attachmentsContentSources.push(
                `[<img src="${href}" alt="${attachment.name}" width="${
                  metadata.width / 2
                }" />](${href})`
              );
              continue;
            }
            const ext = path.extname(attachment.name);
            const nameThumbnail = `${attachment.name.slice(
              0,
              attachment.name.length - ext.length
            )}--thumbnail${ext}`;
            await image
              .rotate()
              .resize({ width: maximumWidth })
              .toFile(
                path.join(
                  app.locals.options.dataDirectory,
                  `files/${folder}/${nameThumbnail}`
                )
              );
            attachmentsContentSources.push(
              `[<img src="${
                app.locals.options.baseURL
              }/files/${folder}/${encodeURIComponent(nameThumbnail)}" alt="${
                attachment.name
              }" width="${maximumWidth / 2}" />](${href})`
            );
            continue;
          } catch {}
        attachmentsContentSources.push(`[${attachment.name}](${href})`);
      }
      res.send(` ${attachmentsContentSources.join("\n\n")} `);
    })
  );

  app.locals.handlers.contentPreview = (req, res, next) => {
    if (typeof req.body.content !== "string" || req.body.content.trim() === "")
      return next("validation");
    res.send(
      app.locals.layouts.partial({
        req,
        res,
        body: app.locals.partials.content({
          req,
          res,
          type: "source",
          content: req.body.content,
          decorate: true,
        }).processed,
      })
    );
  };

  app.post<
    { courseReference: string },
    any,
    { content?: string },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/content-editor/preview",
    ...app.locals.middlewares.isEnrolledInCourse,
    app.locals.handlers.contentPreview
  );

  app.post<{}, any, { content?: string }, {}, IsSignedInMiddlewareLocals>(
    "/content-editor/preview",
    ...app.locals.middlewares.isSignedIn,
    app.locals.handlers.contentPreview
  );

  app.post<{}, any, { content?: string }, {}, IsSignedOutMiddlewareLocals>(
    "/content-editor/preview",
    ...app.locals.middlewares.isSignedOut,
    app.locals.handlers.contentPreview
  );
};
