import * as serverTypes from "@radically-straightforward/server";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { DOMParser } from "linkedom";
import GitHubSlugger from "github-slugger";
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
      course,
      courseParticipation,
      courseConversationMessage,
    }: {
      course: {
        id: number;
        publicId: string;
        courseState: "courseStateActive" | "courseStateArchived";
      };
      courseParticipation: {
        id: number;
        courseParticipationRole:
          | "courseParticipationRoleInstructor"
          | "courseParticipationRoleStudent";
      };
      courseConversationMessage: {
        publicId: string;
        content: string;
      };
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

  application.partials.courseConversationMessageContentProcessor = async ({
    course,
    courseParticipation,
    courseConversationMessage,
  }) => {
    const processedMarkdown = (
      await unified()
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
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(courseConversationMessage.content)
    ).value;
    if (typeof processedMarkdown !== "string") throw new Error();
    const document = new DOMParser()
      .parseFromString(
        html`
          <!doctype html>
          <html>
            <body>
              <div
                key="courseConversationMessageContent ${courseConversationMessage.publicId}"
                css="${css`
                  h1,
                  h2,
                  h3,
                  h4,
                  h5,
                  h6 {
                    margin: var(--size--4) var(--size--0) var(--size--2)
                      var(--size--0);
                  }

                  h1 {
                    font-weight: 600;
                  }

                  h2 {
                    font-style: italic;
                  }

                  h3,
                  h4,
                  h5,
                  h6 {
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    font-weight: 600;
                    color: light-dark(
                      var(--color--slate--600),
                      var(--color--slate--400)
                    );
                  }

                  p + p {
                    margin-top: var(--size--2);
                  }

                  hr {
                    margin: var(--size--2) var(--size--0);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                  }

                  strong {
                    font-weight: 600;
                  }

                  em {
                    font-style: italic;
                  }

                  u {
                    text-decoration: underline;
                  }

                  code {
                    font-family:
                      "Roboto Mono Variable", var(--font-family--monospace);
                  }

                  ins {
                    color: light-dark(
                      var(--color--green--600),
                      var(--color--green--600)
                    );
                  }

                  del {
                    text-decoration: line-through;
                    color: light-dark(
                      var(--color--red--600),
                      var(--color--red--600)
                    );
                  }

                  sup,
                  sub {
                    font-size: var(--font-size--2-5);
                    line-height: var(--font-size--2-5--line-height);
                  }

                  sup {
                    vertical-align: var(--size--1);
                  }

                  sub {
                    vertical-align: var(--size---1);
                  }

                  img,
                  video {
                    background-color: light-dark(
                      var(--color--white),
                      var(--color--white)
                    );
                    max-width: 100%;
                    border-radius: var(--border-radius--1);
                  }

                  ul,
                  ol {
                    margin: var(--size--2) var(--size--0) var(--size--2)
                      var(--size--4);
                  }

                  li + li {
                    margin-top: var(--size--2);
                  }

                  ul > li {
                    list-style: disc;
                  }

                  ol > li {
                    list-style: decimal;
                  }

                  .input--checkbox--tasklist {
                    position: absolute;
                    translate: calc(-100% - var(--size--1)) 20%;
                  }

                  blockquote {
                    color: light-dark(
                      var(--color--slate--600),
                      var(--color--slate--400)
                    );
                    padding-left: calc(var(--size--4) - var(--border-width--4));
                    border-left: var(--border-width--4) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    margin: var(--size--2) var(--size--0);
                  }

                  table {
                    margin: var(--size--2) var(--size--0);
                    border-collapse: collapse;
                  }

                  thead {
                    border-bottom: var(--border-width--2) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                  }

                  th,
                  td {
                    padding: var(--size--1) var(--size--2);
                    &[align="left"] {
                      text-align: left;
                    }
                    &[align="center"] {
                      text-align: center;
                    }
                    &[align="right"] {
                      text-align: right;
                    }
                  }

                  details {
                    margin: var(--size--2) var(--size--0);
                  }

                  summary {
                    font-weight: 500;
                    details[open] > & {
                      margin-bottom: var(--size--1);
                    }
                  }

                  .katex-display {
                    margin: var(--size--2) var(--size--0);
                    overflow: auto hidden;
                    & > .katex > .katex-html {
                      text-align: center;
                    }
                  }

                  pre {
                    margin: var(--size--2) var(--size--0);
                  }

                  .shiki {
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3-5--line-height);
                    padding: var(--size--2) var(--size--4);
                    border-radius: var(--border-radius--1);
                    overflow: auto hidden;
                    &,
                    & span {
                      color: light-dark(var(--shiki-light), var(--shiki-dark));
                      background-color: light-dark(
                        var(--shiki-light-bg),
                        var(--shiki-dark-bg)
                      );
                    }
                  }

                  & > :first-child {
                    margin-top: var(--size--0);
                  }

                  & > :last-child {
                    margin-bottom: var(--size--0);
                  }
                `}"
              >
                $${processedMarkdown}
              </div>
            </body>
          </html>
        `,
        "text/html",
      )
      .querySelector("div");
    if (
      document.lastElementChild !== null &&
      document.lastElementChild.matches(
        'section[class="footnotes"][data-footnotes=""]',
      ) &&
      document.lastElementChild.children.length === 2 &&
      document.lastElementChild.children[0].matches(
        'h2[id="footnote-label"][class="sr-only"]',
      ) &&
      document.lastElementChild.children[0].textContent === "Footnotes" &&
      document.lastElementChild.children[1].matches("ol")
    ) {
      document.lastElementChild.replaceWith(
        document.lastElementChild.children[1],
      );
      document.lastElementChild.footnotes = true;
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
              "h1, h2, h3, h4, h5, h6, p, hr, strong, em, u, a, code, ins, del, sup, sub, br, img, video, courselore-poll, ul, ol, li, input, blockquote, table, thead, tbody, tr, th, td, details, summary, pre",
            ) ||
              (child.matches("a") &&
                (() => {
                  try {
                    const url = new URL(
                      child.getAttribute("href"),
                      `https://${application.configuration.hostname}`,
                    );
                    return (
                      url.protocol !== "https:" &&
                      url.protocol !== "http:" &&
                      url.protocol !== "mailto:"
                    );
                  } catch {
                    return true;
                  }
                })()) ||
              (child.matches("img, video") &&
                ((() => {
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
                })() ||
                  (typeof child.getAttribute("width") === "string" &&
                    !child.getAttribute("width").match(/^\d+$/)) ||
                  (typeof child.getAttribute("height") === "string" &&
                    !child.getAttribute("height").match(/^\d+$/)))) ||
              (child.matches("courselore-poll") &&
                (!child.matches("[id]") ||
                  !child.getAttribute("id").match(/^\d+$/))) ||
              (child.matches("ul, ol") &&
                [...child.children].some(
                  (element) => !element.matches("li"),
                )) ||
              (child.matches("li") && !parent.matches("ul, ol")) ||
              (child.matches("input") &&
                (!(
                  parent.matches("li") ||
                  (parent.matches("p:first-child") &&
                    parent.parentElement.matches("li"))
                ) ||
                  !child.matches(
                    ':first-child[type="checkbox"][disabled=""]',
                  ))) ||
              (child.matches("table") &&
                (2 < child.children.length ||
                  [...child.children].some(
                    (element) => !element.matches("thead, tbody"),
                  ))) ||
              (child.matches("thead") &&
                (!parent.matches("table") ||
                  !child.matches(":first-child") ||
                  1 < child.children.length ||
                  [...child.children].some(
                    (element) => !element.matches("tr"),
                  ))) ||
              (child.matches("tbody") &&
                (!parent.matches("table") ||
                  !child.matches(":last-child") ||
                  [...child.children].some(
                    (element) => !element.matches("tr"),
                  ))) ||
              (child.matches("tr") &&
                (!parent.matches("thead, tbody") ||
                  [...child.children].some(
                    (element) =>
                      !element.matches(parent.matches("thead") ? "th" : "td"),
                  ))) ||
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
        for (const attributeName of child.getAttributeNames())
          if (
            !(
              (child.matches("a") && attributeName === "href") ||
              (child.matches("code") &&
                attributeName === "class" &&
                child
                  .getAttribute(attributeName)
                  .match(
                    /^(?:language-math math-inline)|(?:language-math math-display)|(?:language-[a-z0-9\-+#]+)$/,
                  )) ||
              (child.matches("img, video") &&
                (attributeName === "src" ||
                  attributeName === "width" ||
                  attributeName === "height")) ||
              (child.matches("img") && attributeName === "alt") ||
              (child.matches("input") &&
                (attributeName === "type" ||
                  attributeName === "disabled" ||
                  attributeName === "checked")) ||
              ((child.matches("td") || child.matches("th")) &&
                attributeName === "align" &&
                (child.getAttribute(attributeName) === "left" ||
                  child.getAttribute(attributeName) === "center" ||
                  child.getAttribute(attributeName) === "right")) ||
              attributeName === "id"
            )
          )
            child.removeAttribute(attributeName);
        sanitize(child);
      }
    })(document);
    for (const element of document.querySelectorAll("a")) {
      element.setAttribute("target", "_blank");
      element.setAttribute("class", "link");
    }
    for (const element of document.querySelectorAll("img, video")) {
      const url = new URL(
        element.getAttribute("src"),
        `https://${application.configuration.hostname}`,
      );
      if (url.hostname !== application.configuration.hostname)
        element.setAttribute(
          "src",
          `https://${application.configuration.hostname}/_proxy?${new URLSearchParams({ destination: url.href }).toString()}`,
        );
    }
    for (const element of document.querySelectorAll("img"))
      element.setAttribute("loading", "lazy");
    for (const element of document.querySelectorAll("video"))
      if (element.parentElement.matches("a")) {
        element.setAttribute("autoplay", "");
        element.setAttribute("disablepictureinpicture", "");
        element.setAttribute("disableremoteplayback", "");
        element.setAttribute("loop", "");
        element.setAttribute("muted", "");
        element.setAttribute("playsinline", "");
      } else {
        element.setAttribute("controls", "");
        element.setAttribute("preload", "metadata");
      }
    for (const element of document.querySelectorAll("input"))
      element.setAttribute(
        "class",
        "input--checkbox input--checkbox--tasklist",
      );
    for (const element of document.querySelectorAll("details"))
      if (!element.firstElementChild.matches("summary"))
        element.insertAdjacentHTML(
          "afterbegin",
          html`<summary>See more</summary>`,
        );
    for (const element of document.querySelectorAll("summary")) {
      element.setAttribute(
        "class",
        "button button--rectangle button--transparent",
      );
      element.insertAdjacentHTML(
        "afterbegin",
        html`
          <span
            css="${css`
              display: inline-block;
              transition-property: var(--transition-property--transform);
              transition-duration: var(--transition-duration--150);
              transition-timing-function: var(
                --transition-timing-function--ease-in-out
              );
              details[open] > summary > & {
                rotate: var(--rotate--90);
              }
            `}"
          >
            <i class="bi bi-chevron-right"></i>
          </span>
        `,
      );
    }
    if (document.lastElementChild.footnotes === true) {
      const footnotes = document.lastElementChild;
      for (const element of footnotes.querySelectorAll("a:last-child"))
        if (
          typeof element.getAttribute("href") === "string" &&
          element.getAttribute("href").match(/^#fnref-\d+$/) &&
          element.textContent.trim() === "↩"
        ) {
          element.setAttribute(
            "class",
            "button button--square button--transparent",
          );
          element.innerHTML = html`<i class="bi bi-arrow-up"></i>`;
        }
      footnotes.outerHTML = html`
        <div
          css="${css`
            font-size: var(--font-size--3);
            line-height: var(--font-size--3--line-height);
            color: light-dark(
              var(--color--slate--600),
              var(--color--slate--400)
            );
            padding-top: var(--size--2);
            border-top: var(--border-width--1) solid
              light-dark(var(--color--slate--200), var(--color--slate--800));
            margin-top: var(--size--2);
            & > ol {
              margin-top: var(--size--0);
              margin-bottom: var(--size--0);
            }
          `}"
        >
          $${footnotes.outerHTML}
        </div>
      `;
    }
    {
      const katexMacros = {};
      for (const element of document.querySelectorAll("code.language-math"))
        (element.matches(".math-display") &&
        element.parentElement.matches("pre")
          ? element.parentElement
          : element
        ).outerHTML = katex.renderToString(element.textContent, {
          displayMode: element.matches(".math-display"),
          output: "html",
          throwOnError: false,
          macros: katexMacros,
          maxSize: 25,
          maxExpand: 10,
          strict: false,
        });
    }
    for (const element of document.querySelectorAll('code[class^="language-"]'))
      (element.parentElement.matches("pre")
        ? element.parentElement
        : element
      ).outerHTML = await shiki.codeToHtml(element.textContent, {
        lang: element.getAttribute("class").slice("language-".length),
        themes: { light: "light-plus", dark: "dark-plus" },
        defaultColor: false,
      });
    {
      const githubSlugger = new GitHubSlugger();
      for (const element of document.querySelectorAll(
        ":not(courselore-poll)[id]",
      )) {
        const originalId = element.getAttribute("id");
        const newId = `${courseConversationMessage.publicId}--${githubSlugger.slug(originalId)}`;
        element.setAttribute("id", newId);
        for (const element of document.querySelectorAll(
          `a[href="#${originalId}"]`,
        ))
          element.setAttribute("href", `#${newId}`);
      }
      for (const element of document.querySelectorAll(
        "h1, h2, h3, h4, h5, h6",
      )) {
        const id =
          element.getAttribute("id") ??
          `${courseConversationMessage.publicId}--${githubSlugger.slug(element.textContent)}`;
        element.setAttribute("id", id);
        element.insertAdjacentHTML(
          "afterbegin",
          html`
            <a
              href="#${id}"
              class="button button--square button--icon button--transparent"
              css="${css`
                font-size: var(--font-size--4-5);
                color: light-dark(
                  var(--color--slate--500),
                  var(--color--slate--500)
                );
                margin-left: var(--size--0);
                display: block;
                position: absolute;
                translate: -100%;
                transition-property:
                  var(--transition-property--opacity),
                  var(--transition-property--colors);
                transition-duration: var(--transition-duration--150);
                transition-timing-function: var(
                  --transition-timing-function--ease-in-out
                );
                &:not(:hover, :focus-within, :active) {
                  background-color: light-dark(
                    var(--color--white),
                    var(--color--black)
                  );
                }
                :not(:hover) > & {
                  opacity: var(--opacity--0);
                }
              `}"
            >
              <i class="bi bi-link"></i>
            </a>
          `,
        );
      }
    }
    (function mentionsAndReferences(parent) {
      let previousElementSibling;
      for (const child of parent.childNodes) {
        if (child.nodeType === child.ELEMENT_NODE) {
          if (!child.matches("a, code, .katex")) mentionsAndReferences(child);
          previousElementSibling = child;
          continue;
        }
        const childTextContentWithMentionsAndReferences =
          html`${child.textContent}`
            .replaceAll(
              /(?<=^|\s)@(?<courseParticipationPublicId>\d+)--[a-z\-]+/g,
              (match, courseParticipationPublicId) => {
                const mentionCourseParticipation = application.database.get<{
                  id: number;
                  user: number;
                  courseParticipationRole:
                    | "courseParticipationRoleInstructor"
                    | "courseParticipationRoleStudent";
                }>(
                  sql`
                    select
                      "id",
                      "user",
                      "courseParticipationRole"
                    from "courseParticipations"
                    where
                      "publicId" = ${courseParticipationPublicId} and
                      "course" = ${course.id};
                  `,
                );
                if (mentionCourseParticipation === undefined) return match;
                const mentionUser = application.database.get<{
                  name: string;
                }>(
                  sql`
                    select "name"
                    from "users"
                    where "id" = ${mentionCourseParticipation.user};
                  `,
                );
                if (mentionUser === undefined) throw new Error();
                return html`<strong
                  css="${courseParticipation.id ===
                  mentionCourseParticipation.id
                    ? css`
                        background-color: light-dark(
                          var(--color--yellow--200),
                          var(--color--yellow--800)
                        );
                        padding: var(--size--0-5) var(--size--1);
                        border-radius: var(--border-radius--1);
                      `
                    : css``}"
                  >@${mentionUser.name}${mentionCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? " (instructor)"
                    : ""}</strong
                >`;
              },
            )
            .replaceAll(
              /(?<=^|\s)@(?:everyone|instructors|students)/g,
              (match) => html`<strong>${match}</strong>`,
            )
            .replaceAll(
              /(?<=^|\s)#(?<courseConversationPublicId>\d+)(?:\/(?<courseConversationMessagePublicId>\d+))?/g,
              (
                match,
                courseConversationPublicId,
                courseConversationMessagePublicId,
              ) => {
                const mentionCourseConversation = application.database.get<{
                  id: number;
                  publicId: string;
                }>(
                  sql`
                    select "id", "publicId"
                    from "courseConversations"
                    where
                      "publicId" = ${courseConversationPublicId} and
                      "course" = ${course.id} and (
                        "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
                        $${
                          courseParticipation.courseParticipationRole ===
                          "courseParticipationRoleInstructor"
                            ? sql`
                                or
                                "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                              `
                            : sql``
                        }
                        or (
                          select true
                          from "courseConversationParticipations"
                          where
                            "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                            "courseConversationParticipations"."courseParticipation" = ${courseParticipation.id}
                        )
                      );
                  `,
                );
                if (mentionCourseConversation === undefined) return match;
                if (courseConversationMessagePublicId === undefined)
                  return html`
                    <a
                      href="/courses/${course.publicId}/conversations/${mentionCourseConversation.publicId}"
                      class="link"
                      >${match}</a
                    >
                  `;
                const mentionCourseConversationMessage =
                  application.database.get<{ publicId: string }>(
                    sql`
                      select "publicId"
                      from "courseConversationMessages"
                      where
                        "publicId" = ${courseConversationMessagePublicId} and
                        "courseConversation" = ${mentionCourseConversation.id} $${
                          courseParticipation.courseParticipationRole !==
                          "courseParticipationRoleInstructor"
                            ? sql`
                                and
                                "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                              `
                            : sql``
                        };
                    `,
                  );
                if (mentionCourseConversationMessage === undefined)
                  return match;
                return html`
                  <a
                    href="/courses/${course.publicId}/conversations/${mentionCourseConversation.publicId}?message=${mentionCourseConversationMessage.publicId}"
                    class="link"
                    >${match}</a
                  >
                `;
              },
            );
        parent.removeChild(child);
        if (previousElementSibling === undefined)
          parent.insertAdjacentHTML(
            "afterbegin",
            childTextContentWithMentionsAndReferences,
          );
        else
          previousElementSibling.insertAdjacentHTML(
            "afterend",
            childTextContentWithMentionsAndReferences,
          );
      }
    })(document);
    for (const element of document.querySelectorAll("a")) {
      if (element.getAttribute("href") !== element.textContent) continue;
      const match = element
        .getAttribute("href")
        .match(
          new RegExp(
            `^https://${application.configuration.hostname.replaceAll(".", "\\.")}/courses/${course.publicId}/conversations/(?<courseConversationPublicId>\\d+)(?:\\?message=(?<courseConversationMessagePublicId>\\d+))?$`,
          ),
        );
      if (match === null) continue;
      const mentionCourseConversation = application.database.get<{
        id: number;
        publicId: string;
      }>(
        sql`
          select "id", "publicId"
          from "courseConversations"
          where
            "publicId" = ${match.groups.courseConversationPublicId} and
            "course" = ${course.id} and (
              "courseConversationVisibility" = 'courseConversationVisibilityEveryone'
              $${
                courseParticipation.courseParticipationRole ===
                "courseParticipationRoleInstructor"
                  ? sql`
                      or
                      "courseConversationVisibility" = 'courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations'
                    `
                  : sql``
              }
              or (
                select true
                from "courseConversationParticipations"
                where
                  "courseConversations"."id" = "courseConversationParticipations"."courseConversation" and
                  "courseConversationParticipations"."courseParticipation" = ${courseParticipation.id}
              )
            );
        `,
      );
      if (mentionCourseConversation === undefined) continue;
      if (match.groups.courseConversationMessagePublicId === undefined) {
        element.textContent = `#${mentionCourseConversation.publicId}`;
        continue;
      }
      const mentionCourseConversationMessage = application.database.get<{
        publicId: string;
      }>(
        sql`
          select "publicId"
          from "courseConversationMessages"
          where
            "publicId" = ${match.groups.courseConversationMessagePublicId} and
            "courseConversation" = ${mentionCourseConversation.id} $${
              courseParticipation.courseParticipationRole !==
              "courseParticipationRoleInstructor"
                ? sql`
                    and
                    "courseConversationMessageVisibility" != 'courseConversationMessageVisibilityCourseParticipationRoleInstructors'
                  `
                : sql``
            };
        `,
      );
      if (mentionCourseConversationMessage === undefined) continue;
      element.textContent = `#${mentionCourseConversation.publicId}/${mentionCourseConversationMessage.publicId}`;
    }
    for (const element of document.querySelectorAll("courselore-poll")) {
      const courseConversationMessagePoll = application.database.get<{
        id: number;
        publicId: string;
        createdByCourseParticipation: number | null;
        multipleChoices: number;
      }>(
        sql`
          select
            "id",
            "publicId",
            "createdByCourseParticipation",
            "multipleChoices"
          from "courseConversationMessagePolls"
          where
            "publicId" = ${element.getAttribute("id")} and
            "course" = ${course.id};
        `,
      );
      const containerElement = element.closest(
        '[key~="courseConversationMessageContent"] > *',
      );
      if (courseConversationMessagePoll === undefined) {
        containerElement.remove();
        continue;
      }
      const courseConversationMessagePollOptionVotesTotalCount =
        application.database.get<{ count: number }>(
          sql`
            select count(*) as "count"
            from "courseConversationMessagePollOptionVotes"
            join "courseConversationMessagePollOptions"
            on
              "courseConversationMessagePollOptionVotes"."courseConversationMessagePollOption" = "courseConversationMessagePollOptions"."id" and
              "courseConversationMessagePollOptions"."courseConversationMessagePoll" = ${courseConversationMessagePoll.id};
          `,
        )!.count;
      const voted =
        application.database.get(
          sql`
            select true
            from "courseConversationMessagePollOptionVotes"
            join "courseConversationMessagePollOptions"
            on
              "courseConversationMessagePollOptionVotes"."courseConversationMessagePollOption" = "courseConversationMessagePollOptions"."id" and
              "courseConversationMessagePollOptions"."courseConversationMessagePoll" = ${courseConversationMessagePoll.id}
            where
              "courseConversationMessagePollOptionVotes"."courseParticipation" = ${courseParticipation.id};
          `,
        ) !== undefined;
      containerElement.outerHTML = html`
        <div
          key="courseConversationMessagePoll ${courseConversationMessagePoll.publicId}"
          type="form"
          css="${css`
            margin: var(--size--2) var(--size--0);
            display: flex;
            flex-direction: column;
            gap: var(--size--2);
          `}"
        >
          $${application.database
            .all<{
              id: number;
              publicId: string;
              content: string;
            }>(
              sql`
                select
                  "id",
                  "publicId",
                  "content"
                from "courseConversationMessagePollOptions"
                where "courseConversationMessagePoll" = ${courseConversationMessagePoll.id}
                order by "id" asc;
              `,
            )
            .map((courseConversationMessagePollOption) => {
              const courseConversationMessagePollOptionVotes =
                application.database.all<{
                  courseParticipation: number | null;
                }>(
                  sql`
                    select "courseParticipation"
                    from "courseConversationMessagePollOptionVotes"
                    where "courseConversationMessagePollOption" = ${courseConversationMessagePollOption.id}
                    order by "id" asc;
                  `,
                );
              return html`
                <div
                  key="courseConversationMessagePollOption ${courseConversationMessagePollOption.publicId}"
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--1);
                  `}"
                >
                  <label
                    $${course.courseState === "courseStateActive"
                      ? html`
                          class="button button--rectangle button--transparent"
                        `
                      : html``}
                  >
                    <input
                      type="${Boolean(
                        courseConversationMessagePoll.multipleChoices,
                      )
                        ? "checkbox"
                        : "radio"}"
                      name="courseConversationMessagePollOptions[]"
                      value="${courseConversationMessagePollOption.publicId}"
                      $${course.courseState === "courseStateArchived"
                        ? html`disabled`
                        : html``}
                      $${courseConversationMessagePollOptionVotes.some(
                        (courseConversationMessagePollOptionVote) =>
                          courseConversationMessagePollOptionVote.courseParticipation ===
                          courseParticipation.id,
                      )
                        ? html`checked`
                        : html``}
                      required
                      class="${Boolean(
                        courseConversationMessagePoll.multipleChoices,
                      )
                        ? "input--checkbox"
                        : "input--radio"}"
                    />  ${courseConversationMessagePollOption.content}
                  </label>
                  $${voted || course.courseState === "courseStateArchived"
                    ? html`
                        <div
                          css="${css`
                            font-size: var(--font-size--3);
                            line-height: var(--font-size--3--line-height);
                            font-weight: 600;
                            color: light-dark(
                              var(--color--blue--500),
                              var(--color--blue--500)
                            );
                            display: grid;
                            & > * {
                              grid-area: 1 / 1;
                            }
                          `}"
                        >
                          <div
                            style="width: ${String(
                              courseConversationMessagePollOptionVotesTotalCount ===
                                0
                                ? 0
                                : Math.round(
                                    (courseConversationMessagePollOptionVotes.length /
                                      courseConversationMessagePollOptionVotesTotalCount) *
                                      100,
                                  ),
                            )}%;"
                            css="${css`
                              background-color: light-dark(
                                var(--color--blue--100),
                                var(--color--blue--900)
                              );
                              border-radius: var(--border-radius--1);
                            `}"
                          ></div>
                          <div>
                            <button
                              type="button"
                              class="button button--rectangle button--transparent"
                              css="${css`
                                margin: var(--size--0);
                              `}"
                              javascript="${javascript`
                                javascript.popover({ element: this, trigger: "click" });
                              `}"
                            >
                              ${String(
                                courseConversationMessagePollOptionVotes.length,
                              )}
                              vote${courseConversationMessagePollOptionVotes.length !==
                              1
                                ? "s"
                                : ""} <i class="bi bi-chevron-down"></i>
                            </button>
                            <div
                              type="popover"
                              css="${css`
                                display: flex;
                                flex-direction: column;
                                gap: var(--size--2);
                              `}"
                            >
                              $${courseConversationMessagePollOptionVotes.map(
                                (courseConversationMessagePollOptionVote) => {
                                  const courseConversationMessagePollOptionVoteCourseParticipation =
                                    typeof courseConversationMessagePollOptionVote.courseParticipation ===
                                    "number"
                                      ? application.database.get<{
                                          user: number;
                                          courseParticipationRole:
                                            | "courseParticipationRoleInstructor"
                                            | "courseParticipationRoleStudent";
                                        }>(
                                          sql`
                                            select
                                              "user",
                                              "courseParticipationRole"
                                            from "courseParticipations"
                                            where "id" = ${courseConversationMessagePollOptionVote.courseParticipation};
                                          `,
                                        )
                                      : undefined;
                                  const courseConversationMessagePollOptionVoteUser =
                                    courseConversationMessagePollOptionVoteCourseParticipation !==
                                    undefined
                                      ? application.database.get<{
                                          publicId: string;
                                          name: string;
                                          avatarColor:
                                            | "red"
                                            | "orange"
                                            | "amber"
                                            | "yellow"
                                            | "lime"
                                            | "green"
                                            | "emerald"
                                            | "teal"
                                            | "cyan"
                                            | "sky"
                                            | "blue"
                                            | "indigo"
                                            | "violet"
                                            | "purple"
                                            | "fuchsia"
                                            | "pink"
                                            | "rose";
                                          avatarImage: string | null;
                                          lastSeenOnlineAt: string;
                                        }>(
                                          sql`
                                            select
                                              "publicId",
                                              "name",
                                              "avatarColor",
                                              "avatarImage",
                                              "lastSeenOnlineAt"
                                            from "users"
                                            where "id" = ${courseConversationMessagePollOptionVoteCourseParticipation.user};
                                          `,
                                        )
                                      : undefined;
                                  return html`
                                    <div
                                      css="${css`
                                        display: flex;
                                        gap: var(--size--2);
                                      `}"
                                    >
                                      $${application.partials.userAvatar({
                                        user:
                                          courseConversationMessagePollOptionVoteUser ??
                                          "courseParticipationDeleted",
                                      })}
                                      <div
                                        css="${css`
                                          margin-top: var(--size--0-5);
                                        `}"
                                      >
                                        ${courseConversationMessagePollOptionVoteUser?.name ??
                                        "Deleted course participant"}<span
                                          css="${css`
                                            font-size: var(--font-size--3);
                                            line-height: var(
                                              --font-size--3--line-height
                                            );
                                            color: light-dark(
                                              var(--color--slate--600),
                                              var(--color--slate--400)
                                            );
                                          `}"
                                          >${courseConversationMessagePollOptionVoteCourseParticipation?.courseParticipationRole ===
                                          "courseParticipationRoleInstructor"
                                            ? " (instructor)"
                                            : ""}</span
                                        >
                                      </div>
                                    </div>
                                  `;
                                },
                              )}
                            </div>
                          </div>
                        </div>
                      `
                    : html``}
                </div>
              `;
            })}
          $${course.courseState === "courseStateActive"
            ? html`
                <div
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    font-weight: 600;
                    color: light-dark(
                      var(--color--slate--600),
                      var(--color--slate--400)
                    );
                    display: flex;
                    align-items: baseline;
                    flex-wrap: wrap;
                    column-gap: var(--size--4);
                    row-gap: var(--size--2);
                  `}"
                >
                  <button
                    type="submit"
                    class="button button--rectangle button--transparent"
                  >
                    ${!voted ? "Vote" : "Update vote"}
                  </button>
                </div>
              `
            : html``}
        </div>
      `;
    }
    return document.outerHTML;
  };
};
