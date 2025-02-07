import * as serverTypes from "@radically-straightforward/server";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { DOMParser } from "linkedom";
import katex from "katex";
import * as shiki from "shiki";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversationMessageContent = {
  partials: {
    courseConversationMessageContentEditor: (options?: {
      value?: string;
    }) => HTML;
    courseConversationMessageContentProcessor: ({
      content,
    }: {
      content: string;
    }) => Promise<HTML>;
  };
};

export default async (application: Application): Promise<void> => {
  application.partials.courseConversationMessageContentEditor = ({
    value = "",
  } = {}) => html`
    <div
      key="courseConversationMessageContentEditor"
      class="input--text"
      css="${css`
        padding: var(--size--0);
        display: flex;
        flex-direction: column;
      `}"
    >
      <div
        key="courseConversationMessageContentEditor--menu"
        css="${css`
          color: light-dark(var(--color--slate--600), var(--color--slate--400));
          padding: var(--size--1-5) var(--size--2);
          border-bottom: var(--border-width--1) solid
            light-dark(var(--color--slate--200), var(--color--slate--800));
          display: flex;
          gap: var(--size--2);
        `}"
      >
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-type-bold"></i>
        </button>
        <div type="popover">Bold</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-link"></i>
        </button>
        <div type="popover">Link</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-image"></i>
        </button>
        <div type="popover">Image</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-code"></i>
        </button>
        <div type="popover">Code block</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-calculator"></i>
        </button>
        <div type="popover">Mathematics block</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-card-checklist"></i>
        </button>
        <div type="popover">Poll</div>
        <div
          css="${css`
            flex: 1;
          `}"
        ></div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.popover({ element: this });
          `}"
        >
          <i class="bi bi-eyeglasses"></i>
        </button>
        <div type="popover">Preview</div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
        >
          <i class="bi bi-three-dots-vertical"></i>
        </button>
      </div>
      <textarea
        key="courseConversationMessageContentEditor--textarea"
        name="content"
        required
        css="${css`
          font-family: "Roboto Mono Variable", var(--font-family--monospace);
          height: var(--size--44);
          padding: var(--size--1) var(--size--2);
        `}"
      >
${value}</textarea
      >
    </div>
  `;

  const markdownProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm, { singleTilde: false })
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: true, clobberPrefix: "" })
    .use(() => (root: any) => {
      if (Array.isArray(root?.children))
        for (const node of root.children)
          if (
            typeof node.properties === "object" &&
            typeof node.position === "object"
          )
            node.properties.dataPosition = JSON.stringify(node.position);
    })
    .use(rehypeStringify, { allowDangerousHtml: true });

  application.partials.courseConversationMessageContentProcessor = async ({
    content,
  }) => {
    const processedMarkdown = (await markdownProcessor.process(content)).value;
    if (typeof processedMarkdown !== "string") throw new Error();
    const fragment = new DOMParser()
      .parseFromString(
        html`
          <!doctype html>
          <html>
            <body>
              <div css="${css``}">$${processedMarkdown}</div>
            </body>
          </html>
        `,
        "text/html",
      )
      .querySelector("div");
    if (
      fragment.lastElementChild !== null &&
      fragment.lastElementChild.matches(
        'section[class="footnotes"][data-footnotes=""]',
      ) &&
      fragment.lastElementChild.children.length === 2 &&
      fragment.lastElementChild.children[0].matches(
        'h2[id="footnote-label"][class="sr-only"]',
      ) &&
      fragment.lastElementChild.children[0].textContent === "Footnotes" &&
      fragment.lastElementChild.children[1].matches("ol")
    ) {
      fragment.lastElementChild.insertAdjacentElement(
        "beforebegin",
        fragment.lastElementChild.children[1],
      );
      fragment.lastElementChild.remove();
    }
    (function sanitize(parent) {
      for (const child of parent.childNodes) {
        if (
          !(
            child.nodeType === child.ELEMENT_NODE ||
            child.nodeType === child.TEXT_NODE
          ) ||
          (child.nodeType === child.ELEMENT_NODE &&
            (!child.matches(
              "h1, h2, h3, h4, h5, h6, p, hr, strong, em, u, a, code, ins, del, sup, sub, br, img, video, courselore-pool, ul, ol, li, input, blockquote, table, thead, tbody, tr, th, td, details, summary, pre",
            ) ||
              (child.matches("a") &&
                (() => {
                  try {
                    const url = new URL(
                      child.getAttribute("href"),
                      `https://${application.configuration.hostname}`,
                    );
                    return (
                      url.protocol !== "https:" && url.protocol !== "http:"
                    );
                  } catch {
                    return true;
                  }
                })()) ||
              (child.matches("img, video") &&
                (() => {
                  try {
                    const url = new URL(
                      child.getAttribute("src"),
                      `https://${application.configuration.hostname}`,
                    );
                    return !(
                      url.protocol === "https:" || url.protocol === "http:"
                    );
                  } catch {
                    return true;
                  }
                })()) ||
              (child.matches("courselore-pool") &&
                (!child.matches("[id]") ||
                  !child.getAttribute("id").match(/^\d+$/))) ||
              (child.matches("li") && !parent.matches("ul, ol")) ||
              (child.matches("input") &&
                (!parent.matches("li") ||
                  !child.matches(
                    ':first-child[type="checkbox"][disabled=""]',
                  ))) ||
              (child.matches("table") && 2 < child.children.length) ||
              (child.matches("thead") &&
                (!parent.matches("table") || !child.matches(":first-child"))) ||
              (child.matches("tbody") &&
                (!parent.matches("table") || !child.matches(":last-child"))) ||
              (child.matches("tr") && !parent.matches("thead, tbody")) ||
              (child.matches("th") &&
                (!parent.matches("tr") ||
                  !parent.parentElement.matches("thead"))) ||
              (child.matches("td") &&
                (!parent.matches("tr") ||
                  !parent.parentElement.matches("tbody"))) ||
              (child.matches("summary") &&
                (!parent.matches("details") ||
                  !child.matches(":first-child")))))
        ) {
          parent.removeChild(child);
          continue;
        }
        if (child.nodeType !== child.ELEMENT_NODE) continue;
        for (const attribute of child.getAttributeNames())
          if (
            !(
              (child.matches("a") && attribute === "href") ||
              (child.matches("code") &&
                attribute === "class" &&
                child
                  .getAttribute(attribute)
                  .match(
                    /^(?:language-math math-inline)|(?:language-math math-display)|(?:language-[a-z0-9\-+#]+)$/,
                  )) ||
              (child.matches("img, video") &&
                (attribute === "src" ||
                  attribute === "width" ||
                  attribute === "height")) ||
              (child.matches("img") && attribute === "alt") ||
              (child.matches("input") &&
                (attribute === "type" || attribute === "disabled")) ||
              (child.matches("td") &&
                attribute === "align" &&
                (child.getAttribute(attribute) === "left" ||
                  child.getAttribute(attribute) === "center" ||
                  child.getAttribute(attribute) === "right")) ||
              attribute === "id"
            )
          )
            child.removeAttribute(attribute);
        sanitize(child);
      }
    })(fragment);
    return fragment.outerHTML;
  };
};
