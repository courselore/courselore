import * as serverTypes from "@radically-straightforward/server";
import { micromark } from "micromark";
import * as micromarkGfm from "micromark-extension-gfm";
import * as micromarkMath from "micromark-extension-math";
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

  const unifiedProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    // .use(remarkMath)
    .use(remarkRehype, {
      allowDangerousHtml: true,
      clobberPrefix: "",
      footnoteBackContent: "(Back)",
    })
    .use(rehypeRaw)
    // .use(rehypeSanitize)
    // .use(rehypeKatex)
    // .use(rehypeShiki)
    // .use(unistUtilVisit)
    .use(rehypeStringify);

  // De-clobber `id="___"`s
  // Add `id="___"`s to headings and treat `<a href="#___">`s (https://github.com/rehypejs/rehype-slug and https://github.com/rehypejs/rehype-autolink-headings)

  application.partials.courseConversationMessageContentProcessor = async ({
    content,
  }) => {
    const value = (await unifiedProcessor.process(content)).value;
    if (typeof value !== "string") throw new Error();
    return value;
  };
};
