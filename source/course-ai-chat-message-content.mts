import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import { DOMParser } from "linkedom";
// @ts-expect-error
import MathJax from "mathjax";
await MathJax.init({
  loader: { load: ["input/tex-base", "ui/safe", "output/svg"] },
  svg: { fontCache: "none" },
});
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import { Application } from "./application.mjs";

export type ApplicationCourseAIChatMessageContent = {
  partials: {
    courseAIChatMessageContentProcessor: (options: {
      content: string;
      coursePublicId?: string;
      courseAIChatPublicId?: string;
      courseAIChatMessagePublicId?: string;
      mode?: "normal" | "textContent";
    }) => Promise<HTML>;
  };
};

export default async (application: Application): Promise<void> => {
  application.partials.courseAIChatMessageContentProcessor = async ({
    content,
    coursePublicId,
    courseAIChatPublicId,
    courseAIChatMessagePublicId,
    mode = "normal",
  }) => {
    const process = async (): Promise<HTML> => {
      const processed = (
        await unified()
          .use(remarkParse)
          .use(remarkGfm, { singleTilde: false })
          .use(remarkMath)
          .use(remarkRehype, { allowDangerousHtml: true })
          .use(rehypeRaw)
          .use(rehypeStringify)
          .process(content)
      ).value;
      if (typeof processed !== "string") throw new Error();
      const document = new DOMParser().parseFromString(
        `<!doctype html><html><body><main>${processed}</main></body></html>`,
        "text/html",
      );
      const main = document.querySelector("main");
      if (main === null) throw new Error();
      function sanitize(parent: NonNullable<typeof main>): void {
        for (const child of [...parent.childNodes]) {
          if (child.nodeType === child.TEXT_NODE) continue;
          if (
            child.nodeType !== child.ELEMENT_NODE ||
            !(child instanceof document.defaultView!.Element)
          ) {
            parent.removeChild(child);
            continue;
          }
          if (
            !child.matches(
              "h1, h2, h3, h4, h5, h6, p, hr, strong, em, a, code, del, sup, sub, br, ul, ol, li, blockquote, table, thead, tbody, tr, th, td, pre",
            )
          ) {
            parent.removeChild(child);
            continue;
          }
          for (const attributeName of child.getAttributeNames())
            if (!(
              (child.matches("a") && attributeName === "href") ||
              (child.matches("code") &&
                attributeName === "class" &&
                /^(language-math math-inline|language-math math-display|language-[a-z0-9+#-]+)$/.test(
                  child.getAttribute(attributeName) ?? "",
                ))
            ))
              child.removeAttribute(attributeName);
          if (child.matches("a")) {
            const href = child.getAttribute("href");
            let valid = false;
            if (href !== null)
              try {
                const url = new URL(
                  href,
                  `https://${application.userConfiguration.hostname}/courses/${coursePublicId ?? ""}/ai/`,
                );
                valid = ["http:", "https:", "mailto:"].includes(url.protocol);
              } catch {
                valid = false;
              }
            if (!valid) child.removeAttribute("href");
            else {
              child.setAttribute("class", "link");
              child.setAttribute("rel", "noopener noreferrer");
            }
          }
          sanitize(child);
        }
      }
      sanitize(main);
      if (mode === "textContent") {
        const textContent = main.textContent;
        if (textContent === null) throw new Error();
        return textContent;
      }
      for (const element of main.querySelectorAll("code.language-math")) {
        const svg = MathJax.startup.adaptor.innerHTML(
          await MathJax.tex2svgPromise(element.textContent),
        );
        if (element.parentElement?.matches("pre"))
          element.parentElement.outerHTML = html`
            <div
              css="${css`
                max-width: 100%;
                overflow: auto;
              `}"
            >
              $${svg}
            </div>
          `;
        else
          element.outerHTML = html`
            <span
              css="${css`
                display: inline-block;
                max-width: 100%;
                vertical-align: var(--size---1-5);
                overflow: auto;
              `}"
              >$${svg}</span
            >
          `;
      }
      return html`
        <div
          key="courseAIChatMessageContent"
          css="${css`
            overflow-wrap: anywhere;
            p,
            ul,
            ol,
            pre,
            blockquote {
              margin: var(--size--2) var(--size--0);
            }
            & > :first-child {
              margin-top: var(--size--0);
            }
            & > :last-child {
              margin-bottom: var(--size--0);
            }
            pre {
              overflow: auto;
            }
            code {
              font-family:
                "Roboto Mono Variable", var(--font-family--monospace);
            }
            strong {
              font-weight: 600;
            }
            em {
              font-style: italic;
            }
          `}"
        >
          $${main.innerHTML}
        </div>
      `;
    };
    return mode === "normal"
      ? application.database.cacheAsync(
          JSON.stringify({
            version: application.version,
            coursePublicId,
            courseAIChatPublicId,
            courseAIChatMessagePublicId,
            content,
          }),
          process,
        )
      : process();
  };
};
