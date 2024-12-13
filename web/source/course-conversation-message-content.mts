import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export type ApplicationCourseConversationMessageContent = {
  partials: {
    courseConversationMessageContentEditor: () => HTML;
  };
};

export default async (application: Application): Promise<void> => {
  application.partials.courseConversationMessageContentEditor = () => html`
    <div
      key="courseConversationMessageContentEditor"
      class="input--text"
      css="${css`
        padding: var(--space--0);
        display: flex;
        flex-direction: column;
      `}"
    >
      <div
        key="courseConversationMessageContentEditor--menu"
        css="${css`
          color: light-dark(var(--color--slate--600), var(--color--slate--400));
          padding: var(--space--1-5) var(--space--2);
          border-bottom: var(--border-width--1) solid
            light-dark(var(--color--slate--200), var(--color--slate--800));
          display: flex;
          gap: var(--space--2);
        `}"
      >
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Bold",
            });
          `}"
        >
          <i class="bi bi-type-bold"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Link",
            });
          `}"
        >
          <i class="bi bi-link"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Image",
            });
          `}"
        >
          <i class="bi bi-image"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Code block",
            });
          `}"
        >
          <i class="bi bi-code"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Mathematics block",
            });
          `}"
        >
          <i class="bi bi-calculator"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Poll",
            });
          `}"
        >
          <i class="bi bi-card-checklist"></i>
        </button>
        <div
          css="${css`
            flex: 1;
          `}"
        ></div>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Preview",
            });
          `}"
        >
          <i class="bi bi-eyeglasses"></i>
        </button>
        <button
          type="button"
          class="button button--square button--icon button--transparent"
          javascript="${javascript`
            javascript.tippy({
              event,
              element: this,
              content: "Menu",
            });
          `}"
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
          height: var(--space--44);
          padding: var(--space--1) var(--space--2);
        `}"
      ></textarea>
    </div>
  `;
};
