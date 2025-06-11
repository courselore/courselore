import path from "node:path";
import fs from "node:fs/promises";
import childProcess from "node:child_process";
import util from "node:util";
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
import cryptoRandomString from "crypto-random-string";
import sharp from "sharp";
import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { dedent as markdown } from "@radically-straightforward/utilities";
import { Application } from "./index.mjs";

export type ApplicationCourseConversationMessageContent = {
  partials: {
    courseConversationMessageContentEditor: ({
      course,
      courseParticipation,
      courseConversation,
      courseConversationMessage,
      courseConversationMessageContent,
    }: {
      course: {
        id: number;
        publicId: string;
        courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent: number;
      };
      courseParticipation: {
        id: number;
        courseParticipationRole:
          | "courseParticipationRoleInstructor"
          | "courseParticipationRoleStudent";
      };
      courseConversation?: {
        id: number;
        publicId: string;
        courseConversationVisibility:
          | "courseConversationVisibilityEveryone"
          | "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
          | "courseConversationVisibilityCourseConversationParticipations";
      };
      courseConversationMessage?: {
        publicId: string;
        content: string;
      };
      courseConversationMessageContent?: string;
    }) => HTML;
    courseConversationMessageContentProcessor: ({
      course,
      courseParticipation,
      courseConversation,
      courseConversationMessage,
      courseConversationMessageContent,
      preview,
    }: {
      course: {
        id: number;
        publicId: string;
        courseState: "courseStateActive" | "courseStateArchived";
      };
      courseParticipation: {
        id: number;
        publicId: string;
        courseParticipationRole:
          | "courseParticipationRoleInstructor"
          | "courseParticipationRoleStudent";
      };
      courseConversation?: {
        publicId: string;
      };
      courseConversationMessage?: {
        publicId: string;
        createdByCourseParticipation: number | null;
        content: string;
      };
      courseConversationMessageContent?: string;
      preview?: boolean;
    }) => Promise<HTML>;
  };
};

export default async (application: Application): Promise<void> => {
  application.partials.courseConversationMessageContentEditor = ({
    course,
    courseParticipation,
    courseConversation,
    courseConversationMessage,
    courseConversationMessageContent = courseConversationMessage?.content ?? "",
  }) => html`
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
          justify-content: space-between;
          gap: var(--size--4);
        `}"
      >
        <div
          css="${css`
            display: flex;
            gap: var(--size--2);
          `}"
        >
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = () => {
                const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                element.focus();
                const previousSelectionStart = element.selectionStart;
                if (element.selectionStart === element.selectionEnd) {
                  document.execCommand("insertText", false, "**BOLD**");
                  element.selectionStart = previousSelectionStart + "**".length;
                  element.selectionEnd = previousSelectionStart + "**BOLD".length;
                } else {
                  const selection = element.value.substring(element.selectionStart, element.selectionEnd);
                  document.execCommand("insertText", false, \`**\${selection}**\`);
                  element.selectionStart = previousSelectionStart + "**".length;
                  element.selectionEnd = previousSelectionStart + \`**\${selection}\`.length;
                }
              };
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
              this.onclick = () => {
                const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                element.focus();
                const previousSelectionStart = element.selectionStart;
                if (element.selectionStart === element.selectionEnd) {
                  document.execCommand("insertText", false, "[LINK DESCRIPTION](https://example.com)");
                  element.selectionStart = previousSelectionStart + "[".length;
                  element.selectionEnd = previousSelectionStart + "[LINK DESCRIPTION".length;
                } else {
                  const selection = element.value.substring(element.selectionStart, element.selectionEnd);
                  if (
                    (() => {
                      try {
                        new URL(selection);
                        return true;
                      } catch {
                        return false;
                      }
                    })()
                  ) {
                    document.execCommand("insertText", false, \`[LINK DESCRIPTION](\${selection})\`);
                    element.selectionStart = previousSelectionStart + "[".length;
                    element.selectionEnd = previousSelectionStart + "[LINK DESCRIPTION".length;
                  } else {
                    document.execCommand("insertText", false, \`[\${selection}](https://example.com)\`);
                    element.selectionStart = previousSelectionStart + \`[\${selection}](\`.length;
                    element.selectionEnd = previousSelectionStart + \`[\${selection}](https://example.com\`.length;
                  }
                }
              };
            `}"
          >
            <i class="bi bi-link"></i>
          </button>
          <div type="popover">Link</div>
          $${!(
            Boolean(
              course.courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent,
            ) === false &&
            courseParticipation.courseParticipationRole ===
              "courseParticipationRoleStudent"
          )
            ? html`
                <div
                  type="form"
                  method="POST"
                  action="/courses/${course.publicId}/messages/attachments"
                  enctype="multipart/form-data"
                  css="${css`
                    display: flex;
                  `}"
                  javascript="${javascript`
                    const popover = javascript.popover({
                      element: this.querySelector("label"),
                      target: this.querySelector("label").nextElementSibling.nextElementSibling,
                      trigger: "none",
                    });
                    this.onchange = utilities.foregroundJob(async () => {
                      popover.showPopover();
                      const responseText = await (
                        await fetch(
                          this.getAttribute("action"), {
                            method: this.getAttribute("method"),
                            headers: { "CSRF-Protection": "true" },
                            body: javascript.serialize(this),
                          }
                        )
                      ).text();
                      const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                      element.focus();
                      element.selectionStart = element.selectionEnd;
                      document.execCommand("insertText", false, (0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : "") + responseText + " ");
                      popover.hidePopover();
                    });
                  `}"
                >
                  <label
                    class="button button--square button--icon button--transparent"
                    javascript="${javascript`
                      javascript.popover({ element: this });
                    `}"
                  >
                    <i class="bi bi-paperclip"></i>
                    <input type="file" name="attachments[]" multiple hidden />
                  </label>
                  <div type="popover">Attachment</div>
                  <div type="popover">
                    <div
                      css="${css`
                        color: light-dark(
                          var(--color--slate--600),
                          var(--color--slate--400)
                        );
                        animation: var(--animation--pulse);
                      `}"
                    >
                      <i class="bi bi-three-dots"></i>
                    </div>
                  </div>
                </div>
              `
            : html``}
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = () => {
                const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                element.focus();
                element.selectionEnd = element.selectionStart;
                const previousSelectionStart = element.selectionStart;
                document.execCommand("insertText", false, "\\n\\n<poll>\\n\\n- [ ] OPTION 1\\n- [ ] OPTION 2\\n- [ ] ...\\n\\n</poll>\\n\\n");
                element.selectionStart = previousSelectionStart + "\\n\\n<poll>\\n\\n- [ ] ".length;
                element.selectionEnd = previousSelectionStart + "\\n\\n<poll>\\n\\n- [ ] OPTION 1".length;
              };
            `}"
          >
            <i class="bi bi-card-checklist"></i>
          </button>
          <div type="popover">Poll</div>
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = () => {
                const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                element.focus();
                const previousSelectionStart = element.selectionStart;
                if (element.selectionStart === element.selectionEnd) {
                  document.execCommand("insertText", false, "\\n\\n$$\\nLATEX\\n$$\\n\\n");
                  element.selectionStart = previousSelectionStart + "\\n\\n$$\\n".length;
                  element.selectionEnd = previousSelectionStart + "\\n\\n$$\\nLATEX".length;
                } else {
                  const selection = element.value.substring(element.selectionStart, element.selectionEnd);
                  document.execCommand("insertText", false, \`\\n\\n$$\\n\${selection}\\n$$\\n\\n\`);
                  element.selectionStart = previousSelectionStart + \`\\n\\n$$\\n\`.length;
                  element.selectionEnd = previousSelectionStart + \`\\n\\n$$\\n\${selection}\`.length;
                }
              };
            `}"
          >
            <i class="bi bi-calculator"></i>
          </button>
          <div type="popover">Mathematics</div>
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = () => {
                const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                element.focus();
                const previousSelectionStart = element.selectionStart;
                if (element.selectionStart === element.selectionEnd) {
                  document.execCommand("insertText", false, "\\n\\n\`\`\`LANGUAGE\\nCODE\\n\`\`\`\\n\\n");
                  element.selectionStart = previousSelectionStart + "\\n\\n\`\`\`".length;
                  element.selectionEnd = previousSelectionStart + "\\n\\n\`\`\`LANGUAGE".length;
                } else {
                  const selection = element.value.substring(element.selectionStart, element.selectionEnd);
                  document.execCommand("insertText", false, \`\\n\\n\\\`\\\`\\\`LANGUAGE\\n\${selection}\\n\\\`\\\`\\\`\\n\\n\`);
                  element.selectionStart = previousSelectionStart + \`\\n\\n\\\`\\\`\\\`\`.length;
                  element.selectionEnd = previousSelectionStart + \`\\n\\n\\\`\\\`\\\`LANGUAGE\`.length;
                }
              };
            `}"
          >
            <i class="bi bi-code"></i>
          </button>
          <div type="popover">Code</div>
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              javascript.popover({
                element: this,
                target: this.nextElementSibling.nextElementSibling,
                trigger: "click",
                remainOpenWhileFocused: true,
                placement: "top-start",
                onshow: () => {
                  this.nextElementSibling.nextElementSibling.querySelector('[key~="courseConversationMessageContentEditor--mention--input"]').focus();
                  this.nextElementSibling.nextElementSibling.querySelector('[key~="courseConversationMessageContentEditor--mention--input"]').select();
                },
              });
            `}"
          >
            <i class="bi bi-at"></i>
          </button>
          <div type="popover">Mention</div>
          <div
            key="courseConversationMessageContentEditor--mention"
            type="popover"
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--size--2);
            `}"
          >
            <button
              type="button"
              class="button button--rectangle button--transparent button--dropdown-menu"
              javascript="${javascript`
                this.onclick = () => {
                  const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                  element.click();
                  element.focus();
                  element.selectionEnd = element.selectionStart;
                  document.execCommand("insertText", false, \`\${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : ""}@everyone \`);
                };
              `}"
            >
              Everyone
            </button>
            <button
              type="button"
              class="button button--rectangle button--transparent button--dropdown-menu"
              javascript="${javascript`
                this.onclick = () => {
                  const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                  element.click();
                  element.focus();
                  element.selectionEnd = element.selectionStart;
                  document.execCommand("insertText", false, \`\${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : ""}@instructors \`);
                };
              `}"
            >
              Instructors
            </button>
            <button
              type="button"
              class="button button--rectangle button--transparent button--dropdown-menu"
              javascript="${javascript`
                this.onclick = () => {
                  const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                  element.click();
                  element.focus();
                  element.selectionEnd = element.selectionStart;
                  document.execCommand("insertText", false, \`\${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : ""}@students \`);
                };
              `}"
            >
              Students
            </button>
            <hr class="separator" />
            <input
              key="courseConversationMessageContentEditor--mention--input"
              type="text"
              placeholder="Search…"
              maxlength="3000"
              class="input--text"
              javascript="${javascript`
                this.onkeyup = utilities.foregroundJob(() => {
                  const search = new Set(utilities.tokenize(this.value).map((tokenWithPosition) => tokenWithPosition.token));
                  for (const element of this.closest('[key~="courseConversationMessageContentEditor--mention"]').querySelector('[key~="courseConversationMessageContentEditor--mention--courseParticipations"]').children) {
                    const nameElement = element.querySelector('[key~="courseConversationMessageContentEditor--mention--courseParticipation--name"]');
                    nameElement.innerHTML = utilities.highlight(html\`\${nameElement.name}\`, search, { prefix: true });
                    element.hidden = 0 < search.size && nameElement.querySelector("span") === null;
                  }
                });
              `}"
            />
            <div
              key="courseConversationMessageContentEditor--mention--courseParticipations"
              class="scroll"
              css="${css`
                height: var(--size--28);
                padding: var(--size--1) var(--size--2);
                margin: var(--size---1) var(--size---2);
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              $${application.database
                .all<{
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
                    join "users" on "courseParticipations"."user" = "users"."id"
                    where
                      "courseParticipations"."course" = ${course.id} and
                      "courseParticipations"."id" != ${courseParticipation.id} $${
                        courseConversation === undefined
                          ? sql``
                          : courseConversation.courseConversationVisibility ===
                              "courseConversationVisibilityEveryone"
                            ? sql``
                            : courseConversation.courseConversationVisibility ===
                                "courseConversationVisibilityCourseParticipationRoleInstructorsAndCourseConversationParticipations"
                              ? sql`
                                  and (
                                    "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' or (
                                      select true
                                      from "courseConversationParticipations"
                                      where
                                        "courseConversationParticipations"."courseConversation" = ${courseConversation.id} and
                                        "courseParticipations"."id" = "courseConversationParticipations"."courseParticipation"
                                    )
                                  )
                                `
                              : courseConversation.courseConversationVisibility ===
                                  "courseConversationVisibilityCourseConversationParticipations"
                                ? sql`
                                    and (
                                      select true
                                      from "courseConversationParticipations"
                                      where
                                        "courseConversationParticipations"."courseConversation" = ${courseConversation.id} and
                                        "courseParticipations"."id" = "courseConversationParticipations"."courseParticipation"
                                    )
                                  `
                                : (() => {
                                    throw new Error();
                                  })()
                      }
                    order by
                      "courseParticipations"."courseParticipationRole" = 'courseParticipationRoleInstructor' desc,
                      "users"."name" asc;
                  `,
                )
                .map((courseParticipation) => {
                  const courseParticipationUser = application.database.get<{
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
                      where "id" = ${courseParticipation.user};
                    `,
                  );
                  if (courseParticipationUser === undefined) throw new Error();
                  return html`
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      css="${css`
                        display: flex;
                        gap: var(--size--2);
                      `}"
                      javascript="${javascript`
                        this.onclick = () => {
                          const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                          element.click();
                          element.focus();
                          element.selectionEnd = element.selectionStart;
                          document.execCommand("insertText", false, \`\${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : ""}@\${${courseParticipationUser.name.toLowerCase().replaceAll(/[^a-z\-]/g, "-")}}--\${${courseParticipationUser.publicId}} \`);
                        };
                      `}"
                    >
                      $${application.partials.userAvatar({
                        user: courseParticipationUser,
                      })}
                      <div
                        css="${css`
                          margin-top: var(--size--0-5);
                        `}"
                      >
                        <span
                          key="courseConversationMessageContentEditor--mention--courseParticipation--name"
                          javascript="${javascript`
                            this.name = ${courseParticipationUser.name};
                          `}"
                          >${courseParticipationUser.name}</span
                        >$${courseParticipation.courseParticipationRole ===
                        "courseParticipationRoleInstructor"
                          ? html`<span
                              css="${css`
                                font-size: var(--font-size--3);
                                line-height: var(--font-size--3--line-height);
                                color: light-dark(
                                  var(--color--slate--600),
                                  var(--color--slate--400)
                                );
                              `}"
                            >
                              (instructor)</span
                            >`
                          : html``}
                      </div>
                    </button>
                  `;
                })}
            </div>
          </div>
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
              javascript.popover({
                element: this,
                target: this.nextElementSibling.nextElementSibling,
                trigger: "click",
                remainOpenWhileFocused: true,
                placement: "top-start",
                onshow: () => {
                  this.nextElementSibling.nextElementSibling.querySelector('[key~="courseConversationMessageContentEditor--reference--input"]').focus();
                  this.nextElementSibling.nextElementSibling.querySelector('[key~="courseConversationMessageContentEditor--reference--input"]').select();
                },
              });
            `}"
          >
            <i class="bi bi-hash"></i>
          </button>
          <div type="popover">Reference</div>
          <div
            key="courseConversationMessageContentEditor--reference"
            type="popover"
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--size--2);
            `}"
          >
            <input
              key="courseConversationMessageContentEditor--reference--input"
              type="text"
              placeholder="Search…"
              maxlength="3000"
              class="input--text"
              javascript="${javascript`
                this.onkeyup = utilities.foregroundJob(() => {
                  const search = new Set(utilities.tokenize(this.value).map((tokenWithPosition) => tokenWithPosition.token));
                  for (const element of this.closest('[key~="courseConversationMessageContentEditor--reference"]').querySelector('[key~="courseConversationMessageContentEditor--reference--courseConversations"]').children) {
                    const titleElement = element.querySelector('[key~="courseConversationMessageContentEditor--reference--courseConversation--title"]');
                    titleElement.innerHTML = utilities.highlight(html\`\${titleElement.title}\`, search, { prefix: true });
                    element.hidden = 0 < search.size && titleElement.querySelector("span") === null;
                  }
                });
              `}"
            />
            <div
              key="courseConversationMessageContentEditor--reference--courseConversations"
              class="scroll"
              css="${css`
                height: var(--size--60);
                padding: var(--size--1) var(--size--2);
                margin: var(--size---1) var(--size---2);
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              $${application.database
                .all<{
                  publicId: string;
                  title: string;
                }>(
                  sql`
                    select
                      "publicId",
                      "title"
                    from "courseConversations"
                    where
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
                      )
                    order by "id" desc;
                  `,
                )
                .map(
                  (courseConversation) => html`
                    <button
                      type="button"
                      class="button button--rectangle button--transparent button--dropdown-menu"
                      javascript="${javascript`
                        this.onclick = () => {
                          const element = this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]');
                          element.click();
                          element.focus();
                          element.selectionEnd = element.selectionStart;
                          document.execCommand("insertText", false, \`\${0 < element.selectionStart && !element.value[element.selectionStart - 1].match(/\\s/) ? " " : ""}#\${${courseConversation.publicId}} \`);
                        };
                      `}"
                    >
                      <span
                        css="${css`
                          font-size: var(--font-size--3);
                          line-height: var(--font-size--3--line-height);
                          font-weight: 500;
                          color: light-dark(
                            var(--color--slate--400),
                            var(--color--slate--600)
                          );
                        `}"
                        >#${courseConversation.publicId}</span
                      >
                      <span
                        key="courseConversationMessageContentEditor--reference--courseConversation--title"
                        javascript="${javascript`
                          this.title = ${courseConversation.title};
                        `}"
                        >${courseConversation.title}</span
                      >
                    </button>
                  `,
                )}
            </div>
          </div>
        </div>
        <div
          css="${css`
            display: flex;
            gap: var(--size--2);
          `}"
        >
          <button
            type="button"
            class="button button--square button--icon button--transparent"
            css="${css`
              [key~="courseConversationMessageContentEditor"][state] & {
                display: none;
              }
            `}"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = async () => {
                try {
                  if (!javascript.validate(this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]'))) return;
                  this.closest('[key~="courseConversationMessageContentEditor"]').setAttribute("state", "loading");
                  this.closest('[key~="courseConversationMessageContentEditor"]').abortController = new AbortController();
                  javascript.mount(
                    this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--preview"]').firstElementChild,
                    await (
                      await fetch(
                        ${`/courses/${course.publicId}${courseConversation !== undefined ? `/conversations/${courseConversation.publicId}` : ""}/messages${courseConversationMessage !== undefined ? `/${courseConversationMessage.publicId}` : ""}/preview`}, {
                          method: "POST",
                          headers: { "CSRF-Protection": "true" },
                          body: new URLSearchParams(javascript.serialize(this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[key~="courseConversationMessageContentEditor--textarea"]'))),
                          signal: this.closest('[key~="courseConversationMessageContentEditor"]').abortController.signal,
                        }
                      )
                    ).text()
                  );
                  this.closest('[key~="courseConversationMessageContentEditor"]').setAttribute("state", "preview");
                } catch (error) {
                  if (error.name !== "AbortError") throw error;
                }
              };
            `}"
          >
            <i class="bi bi-eyeglasses"></i>
          </button>
          <div type="popover">Preview</div>
          <button
            type="button"
            class="button button--square button--icon button--transparent button--blue"
            css="${css`
              border: none;
              [key~="courseConversationMessageContentEditor"]:not([state]) & {
                display: none;
              }
            `}"
            javascript="${javascript`
              javascript.popover({ element: this });
              this.onclick = async () => {
                this.closest('[key~="courseConversationMessageContentEditor"]').abortController?.abort();
                this.closest('[key~="courseConversationMessageContentEditor"]').removeAttribute("state");
              };
            `}"
          >
            <i class="bi bi-eyeglasses"></i>
          </button>
          <div type="popover">Preview</div>
          <a
            href="/courses/${course.publicId}/help/message-formatting"
            target="_blank"
            class="button button--square button--icon button--transparent"
            javascript="${javascript`
              javascript.popover({ element: this });
            `}"
          >
            <i class="bi bi-question-circle"></i>
          </a>
          <div type="popover">Help</div>
        </div>
      </div>
      <div
        key="courseConversationMessageContentEditor--main"
        css="${css`
          display: flex;
          justify-content: center;
          align-items: center;
          & > * {
            flex: 1;
            padding: var(--size--1) var(--size--2);
          }
        `}"
      >
        <textarea
          key="courseConversationMessageContentEditor--textarea"
          name="content"
          required
          css="${css`
            font-family: "Roboto Mono Variable", var(--font-family--monospace);
            height: var(--size--44);
            border-bottom-left-radius: var(--border-radius--1);
            border-bottom-right-radius: var(--border-radius--1);
            transition-property: var(--transition-property--colors);
            transition-duration: var(--transition-duration--150);
            transition-timing-function: var(
              --transition-timing-function--ease-in-out
            );
            &[state~="dragging"] {
              background-color: light-dark(
                var(--color--blue--200),
                var(--color--blue--800)
              );
            }
            [key~="courseConversationMessageContentEditor"][state] & {
              display: none;
            }
          `}"
          $${!(
            Boolean(
              course.courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent,
            ) === false &&
            courseParticipation.courseParticipationRole ===
              "courseParticipationRoleStudent"
          )
            ? html`
                javascript="${javascript`
                  this.ondragenter = (event) => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                    javascript.stateAdd(this, "dragging");
                  };
                  this.ondragleave = (event) => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                    javascript.stateRemove(this, "dragging");
                  };
                  this.ondragover = (event) => {
                    if (!event.dataTransfer.types.includes("Files")) return;
                    event.preventDefault();
                  };
                  this.ondrop = (event) => {
                    if (event.dataTransfer.files.length === 0) return;
                    event.preventDefault();
                    javascript.stateRemove(this, "dragging");
                    this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[name="attachments[]"]').files = event.dataTransfer.files;
                    this.closest('[key~="courseConversationMessageContentEditor"]').querySelector('[name="attachments[]"]').dispatchEvent(
                      new Event("change", {
                        bubbles: true,
                        cancelable: false,
                        composed: false,
                      }),
                    );
                  };
                `}"
              `
            : html``}
        >
${courseConversationMessageContent}</textarea
        >
        <div
          key="courseConversationMessageContentEditor--loading"
          css="${css`
            font-size: var(--size--12);
            color: light-dark(
              var(--color--slate--600),
              var(--color--slate--400)
            );
            height: var(--size--44);
            display: flex;
            justify-content: center;
            align-items: center;
            animation: var(--animation--pulse);
            [key~="courseConversationMessageContentEditor"]:not(
                [state~="loading"]
              )
              & {
              display: none;
            }
          `}"
        >
          <i class="bi bi-three-dots"></i>
        </div>
        <div
          key="courseConversationMessageContentEditor--preview"
          css="${css`
            min-width: var(--size--0);
            [key~="courseConversationMessageContentEditor"]:not(
                [state~="preview"]
              )
              & {
              display: none;
            }
          `}"
        >
          <div></div>
        </div>
      </div>
    </div>
  `;

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/messages/attachments$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        { attachments: serverTypes.RequestBodyFile[] },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        (Boolean(
          request.state.course
            .courseParticipationRoleStudentsMayAttachFileOrImagesToCourseConversationMessageContent,
        ) === false &&
          request.state.courseParticipation.courseParticipationRole ===
            "courseParticipationRoleStudent")
      )
        return;
      request.body.attachments ??= [];
      if (
        !Array.isArray(request.body.attachments) ||
        request.body.attachments.some(
          (attachment) => typeof attachment !== "object",
        )
      )
        throw "validation";
      const markdown = new Array<string>();
      for (const attachment of request.body.attachments) {
        const relativePath = `files/${cryptoRandomString({
          length: 20,
          characters: "abcdefghijklmnopqrstuvwxyz0123456789",
        })}/${path.basename(attachment.path)}`;
        const absolutePath = path.join(
          application.configuration.dataDirectory,
          relativePath,
        );
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.rename(attachment.path, absolutePath);
        try {
          if (
            attachment.mimeType === "image/jpeg" ||
            attachment.mimeType === "image/png" ||
            attachment.mimeType === "image/gif"
          ) {
            const image = sharp(absolutePath, { autoOrient: true });
            const metadata = await image.metadata();
            if (
              attachment.mimeType === "image/gif" &&
              typeof metadata.width === "number" &&
              0 < metadata.width &&
              typeof metadata.height === "number" &&
              0 < metadata.height &&
              typeof metadata.pages === "number" &&
              1 < metadata.pages
            ) {
              const ratio = Math.min(
                1280 /* var(--size--320) */ / metadata.width,
                1,
              );
              const width = Math.floor((metadata.width * ratio) / 2) * 2;
              const height = Math.floor((metadata.height * ratio) / 2) * 2;
              await util.promisify(childProcess.execFile)(
                path.join(import.meta.dirname, "../node_modules/.bin/ffmpeg"),
                [
                  "-i",
                  absolutePath,
                  "-movflags",
                  "faststart",
                  "-pix_fmt",
                  "yuv420p",
                  "-vf",
                  `scale=${width}:${height}`,
                  `${absolutePath}.mp4`,
                ],
              );
              markdown.push(
                `[<video src="/${relativePath}.mp4" width="${Math.floor(width / 2)}" height="${Math.floor(height / 2)}"></video>](/${relativePath})`,
              );
              continue;
            }
            const thumbnail = await image
              .resize({
                width: 1280 /* var(--size--320) */,
                withoutEnlargement: true,
              })
              .toFile(`${absolutePath}.webp`);
            markdown.push(
              `[<img src="/${relativePath}.webp" width="${Math.floor(thumbnail.width / 2)}" height="${Math.floor(thumbnail.height / 2)}" />](/${relativePath})`,
            );
            continue;
          }
        } catch (error) {
          request.log("ERROR", String(error));
        }
        markdown.push(`[Attachment](/${relativePath})`);
      }
      response.end(markdown.join("\n\n"));
    },
  });

  application.server?.push({
    method: "POST",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)(?:/conversations/(?<courseConversationPublicId>[0-9]+))?/messages(?:/(?<courseConversationMessagePublicId>[0-9]+))?/preview$",
    ),
    handler: async (
      request: serverTypes.Request<
        {
          courseConversationPublicId: string;
          courseConversationMessagePublicId: string;
        },
        {},
        {},
        { content: string },
        Application["types"]["states"]["CourseConversationMessage"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined ||
        (typeof request.pathname.courseConversationPublicId === "string" &&
          request.state.courseConversation === undefined) ||
        (typeof request.pathname.courseConversationMessagePublicId ===
          "string" &&
          request.state.courseConversationMessage === undefined)
      )
        return;
      if (
        typeof request.body.content !== "string" ||
        request.body.content.trim() === ""
      )
        throw "validation";
      response.end(
        await application.partials.courseConversationMessageContentProcessor({
          course: request.state.course,
          courseParticipation: request.state.courseParticipation,
          courseConversation: request.state.courseConversation,
          courseConversationMessage: request.state.courseConversationMessage,
          courseConversationMessageContent: request.body.content,
          preview: true,
        }),
      );
    },
  });

  application.server?.push({
    method: "GET",
    pathname: new RegExp(
      "^/courses/(?<coursePublicId>[0-9]+)/help/message-formatting$",
    ),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        { content: string },
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      response.end(
        application.layouts.main({
          request,
          response,
          head: html` <title>Message formatting · Help · Courselore</title> `,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
              javascript="${javascript`
                this.isModified = false;
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                Help · Message formatting
              </div>
              $${await application.partials.courseConversationMessageContentProcessor(
                {
                  course: request.state.course,
                  courseParticipation: request.state.courseParticipation,
                  courseConversationMessageContent: markdown`
<table>
<thead>
<tr>
<th>You write…</th>
<th>…and it shows up as</th>
</tr>
</thead>
<tbody>
<tr>
<td>

~~~
**Bold**
~~~

</td>
<td>

**Bold**

</td>
</tr>
<tr>
<td>

~~~
_Italics_
~~~

</td>
<td>

_Italics_

</td>
</tr>
<tr>
<td>

~~~
<u>Underline</u>
~~~

</td>
<td>

<u>Underline</u>

</td>
</tr>
<tr>
<td>

~~~
[Link](https://courselore.org)
~~~

</td>
<td>

[Link](https://courselore.org)

</td>
</tr>
<tr>
<td>

~~~
$E=mc^2$
~~~

</td>
<td>

$E=mc^2$ ([Mathematics support](https://katex.org/docs/supported))

</td>
</tr>
<tr>
<td>

~~~
\`Code\`
~~~

</td>
<td>

\`Code\`

</td>
</tr>
<tr>
<td>

~~~
<ins>Insertion</ins>
~~~

</td>
<td>

<ins>Insertion</ins>

</td>
</tr>
<tr>
<td>

~~~
~~Deletion~~
~~~

</td>
<td>

~~Deletion~~

</td>
</tr>
<tr>
<td>

~~~
<sup>Superscript</sup>
~~~

</td>
<td>

<sup>Superscript</sup>

</td>
</tr>
<tr>
<td>

~~~
<sub>Subscript</sub>
~~~

</td>
<td>

<sub>Subscript</sub>

</td>
</tr>
<tr>
<td>

~~~
# Heading level 1
~~~

</td>
<td>

# Heading level 1

</td>
</tr>
<tr>
<td>

~~~
## Heading level 2
~~~

</td>
<td>

## Heading level 2

</td>
</tr>
<tr>
<td>

~~~
### Heading level 3
~~~

</td>
<td>

### Heading level 3

</td>
</tr>
<tr>
<td>

~~~
#### Heading level 4
~~~

</td>
<td>

#### Heading level 4

</td>
</tr>
<tr>
<td>

~~~
##### Heading level 5
~~~

</td>
<td>

##### Heading level 5

</td>
</tr>
<tr>
<td>

~~~
###### Heading level 6
~~~

</td>
<td>

###### Heading level 6

</td>
</tr>
<tr>
<td>

~~~
An example of a

---

separator
~~~

</td>
<td>

An example of a

---

separator

</td>
</tr>
<tr>
<td>

~~~
- An
- example
- of
- an
- unordered
- list
~~~

</td>
<td>

- An
- example
- of
- an
- unordered
- list

</td>
</tr>
<tr>
<td>

~~~
1. An
2. example
3. of
4. an
5. ordered
6. list
~~~

</td>
<td>

1. An
2. example
3. of
4. an
5. ordered
6. list

</td>
</tr>
<tr>
<td>

~~~
- [ ] An
- [ ] example
- [x] of
- [ ] a
- [x] tasklist
~~~

</td>
<td>

- [ ] An
- [ ] example
- [x] of
- [ ] a
- [x] tasklist

</td>
</tr>
<tr>
<td>

~~~
> An example of a blockquote.
~~~

</td>
<td>

> An example of a blockquote.

</td>
</tr>
<tr>
<td>

~~~
| An  | example | of  |
| --- | ------- | --- |
| a   | table   |     |
~~~

</td>
<td>

| An  | example | of  |
| --- | ------- | --- |
| a   | table   |     |

</td>
</tr>
<tr>
<td>

~~~
<details>
<summary>
An example of concealed content
</summary>

See more content here.

</details>
~~~

</td>
<td>

<details>
<summary>
An example of concealed content
</summary>

See more content here.

</details>

</td>
</tr>
<tr>
<td>

~~~
An example of a footnote[^1].

[^1]: This is the content of a footnote.
~~~

</td>
<td>

An example of a footnote[^1].

[^1]: This is the content of a footnote.

</td>
</tr>
<tr>
<td>

~~~
$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$
~~~

</td>
<td>

$$
L = \\frac{1}{2} \\rho v^2 S C_L
$$

([Mathematics support](https://katex.org/docs/supported))

</td>
</tr>
<tr>
<td>

~~~
\`\`\`javascript
const hello = "world";
\`\`\`
~~~

</td>
<td>

~~~javascript
const hello = "world";
~~~

([Syntax highlighting support](https://shiki.style/languages))

</td>
</tr>
</tbody>
</table>
                  `,
                  preview: true,
                },
              )}
              $${await application.partials.courseConversationMessageContentProcessor(
                {
                  course: request.state.course,
                  courseParticipation: request.state.courseParticipation,
                  courseConversationMessageContent: markdown`
---

You may also use the buttons on the message content editor to attach files/images/videos, create polls, \`@mention\` other course participants, \`#refer\` to other conversations and messages, and preview the message before sending it.

**Try it**
                  `,
                  preview: true,
                },
              )}
              $${application.partials.courseConversationMessageContentEditor({
                course: request.state.course,
                courseParticipation: request.state.courseParticipation,
              })}
            </div>
          `,
        }),
      );
    },
  });

  application.partials.courseConversationMessageContentProcessor = async ({
    course,
    courseParticipation,
    courseConversation,
    courseConversationMessage,
    courseConversationMessageContent = courseConversationMessage?.content ??
      (() => {
        throw new Error();
      })(),
    preview = false,
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
        .process(courseConversationMessageContent)
    ).value;
    if (typeof processedMarkdown !== "string") throw new Error();
    const document = new DOMParser()
      .parseFromString(
        html`
          <!doctype html>
          <html>
            <body>
              <div
                key="courseConversationMessageContent ${courseConversationMessage?.publicId ??
                ""}"
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
                    height: auto;
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

                  input {
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

                  th {
                    font-weight: 500;
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
              "h1, h2, h3, h4, h5, h6, p, hr, strong, em, u, a, code, ins, del, sup, sub, br, img, video, ul, ol, li, input, poll, votes, blockquote, table, thead, tbody, tr, th, td, details, summary, pre",
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
              (child.matches("poll") &&
                (child.children.length !== 1 ||
                  !child.children[0].matches("ul") ||
                  ![...child.children[0].children].every(
                    (element) =>
                      element.querySelectorAll("input").length === 1 &&
                      element.querySelector("input:checked") === null &&
                      element.querySelectorAll("votes").length <= 1,
                  ) ||
                  ![...child.querySelectorAll("votes")].every(
                    (votesElement) => {
                      try {
                        const votes = JSON.parse(votesElement.textContent);
                        return (
                          Array.isArray(votes) &&
                          votes.every(
                            (vote) =>
                              typeof vote === "string" && vote.match(/^\d+$/),
                          )
                        );
                      } catch {
                        return false;
                      }
                    },
                  ) ||
                  child.querySelector("poll") !== null)) ||
              (child.matches("votes") && child.closest("poll") === null) ||
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
      const url = new URL(
        element.getAttribute("href"),
        `https://${application.configuration.hostname}/courses/${course.publicId}${courseConversation !== undefined ? `/conversations/${courseConversation.publicId}` : ""}`,
      );
      if (
        !(
          url.protocol === "https:" &&
          url.hostname === application.configuration.hostname &&
          url.pathname.match(
            new RegExp(
              `^/courses/${course.publicId}${courseConversation !== undefined ? `/conversations/${courseConversation.publicId}` : ""}(?:$|/)`,
            ),
          )
        )
      )
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
      element.setAttribute("class", "input--checkbox");
    for (const [elementIndex, element] of [
      ...document.querySelectorAll("poll"),
    ].entries()) {
      let votesCount = 0;
      for (const [pollOptionIndex, pollOption] of [
        ...element.children[0].children,
      ].entries()) {
        const votesElement = pollOption.querySelector("votes");
        votesElement?.remove();
        pollOption.votes =
          votesElement === null ? [] : JSON.parse(votesElement.textContent);
        votesCount += pollOption.votes.length;
        pollOption
          .querySelector("input")
          .setAttribute("name", "courseConversationMessagePollOptions[]");
        pollOption
          .querySelector("input")
          .setAttribute("value", pollOptionIndex);
        pollOption.querySelector("input").setAttribute("required", "");
        if (pollOption.votes.includes(courseParticipation.publicId))
          pollOption.querySelector("input").setAttribute("checked", "");
        if (!preview && course.courseState === "courseStateActive") {
          pollOption.innerHTML = html`
            <label
              class="button button--rectangle button--transparent"
              css="${css`
                padding-left: var(--size--6);
                margin-left: var(--size---6);
                display: block;
              `}"
            >
              $${pollOption.innerHTML}
            </label>
          `;
          pollOption.querySelector("input").removeAttribute("disabled");
        }
      }
      if (
        courseParticipation.courseParticipationRole ===
          "courseParticipationRoleInstructor" ||
        courseParticipation.id ===
          courseConversationMessage?.createdByCourseParticipation ||
        element.querySelector("input:checked") !== null ||
        course.courseState === "courseStateArchived"
      )
        for (const pollOption of element.children[0].children) {
          pollOption.insertAdjacentHTML(
            "beforeend",
            html`
              <details
                css="${pollOption.votes.length === 0
                  ? css`
                      margin: var(--size--0);
                    `
                  : css`
                      margin: var(--size--1) var(--size--0) var(--size--0)
                        var(--size--0);
                    `}"
              >
                <summary
                  css="${css`
                    font-size: var(--font-size--3);
                    line-height: var(--font-size--3--line-height);
                    position: relative;
                  `}"
                >
                  $${0 < pollOption.votes.length
                    ? html`
                        <div
                          style="width: ${String(
                            Math.round(
                              (pollOption.votes.length / votesCount) * 100,
                            ),
                          )}%;"
                          css="${css`
                            background-color: light-dark(
                              var(--color--blue--500),
                              var(--color--blue--500)
                            );
                            height: var(--border-width--4);
                            border-radius: var(--border-radius--round);
                            position: absolute;
                            top: var(--size--0);
                          `}"
                        ></div>
                      `
                    : html``}
                  ${String(pollOption.votes.length)}
                  vote${pollOption.votes.length !== 1 ? "s" : ""}
                </summary>
                <div
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--2);
                  `}"
                >
                  $${pollOption.votes.map(
                    (voteCourseParticipationPublicId: string) => {
                      const courseConversationMessagePollOptionVoteCourseParticipation =
                        application.database.get<{
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
                            where
                              "publicId" = ${voteCourseParticipationPublicId} and
                              "course" = ${course.id};
                          `,
                        );
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
                            "Deleted course participant"}$${courseConversationMessagePollOptionVoteCourseParticipation?.courseParticipationRole ===
                            "courseParticipationRoleInstructor"
                              ? html`<span
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
                                >
                                  (instructor)</span
                                >`
                              : html``}
                          </div>
                        </div>
                      `;
                    },
                  )}
                </div>
              </details>
            `,
          );
        }
      if (!preview && course.courseState === "courseStateActive")
        element.insertAdjacentHTML(
          "beforeend",
          html`
            <div
              css="${css`
                font-size: var(--font-size--3);
                line-height: var(--font-size--3--line-height);
                font-weight: 600;
                color: light-dark(
                  var(--color--slate--600),
                  var(--color--slate--400)
                );
                margin: var(--size--2) var(--size--0);
              `}"
            >
              <button
                type="submit"
                class="button button--rectangle button--transparent"
              >
                ${element.querySelector("input:checked") === null
                  ? "Vote"
                  : "Update vote"}
              </button>
            </div>
          `,
        );
      element.outerHTML = html`
        <div
          type="form"
          method="PATCH"
          action="/courses/${course.publicId}${courseConversation !== undefined
            ? `/conversations/${courseConversation.publicId}`
            : ""}${courseConversationMessage !== undefined
            ? `/messages/${courseConversationMessage.publicId}`
            : ""}/polls/${String(elementIndex)}"
        >
          $${element.innerHTML}
        </div>
      `;
    }
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
          <span> </span>
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
      for (const element of document.querySelectorAll("[id]")) {
        const originalId = element.getAttribute("id");
        const newId = `${courseConversationMessage?.publicId ?? "new-message"}--${githubSlugger.slug(originalId)}`;
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
          `${courseConversationMessage?.publicId ?? "new-message"}--${githubSlugger.slug(element.textContent)}`;
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
              /(?<=^|\s)@[a-z\-]+--(?<courseParticipationPublicId>\d+)/g,
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
                  $${courseParticipation.id === mentionCourseParticipation.id
                    ? html`class="highlight"`
                    : html``}
                  >@${mentionUser.name}${mentionCourseParticipation.courseParticipationRole ===
                  "courseParticipationRoleInstructor"
                    ? " (instructor)"
                    : ""}</strong
                >`;
              },
            )
            .replaceAll(
              /(?<=^|\s)@(?:everyone|instructors|students)(?![A-Za-z0-9\-])/g,
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
      const match = element.getAttribute("href").match(
        new RegExp(
          // @ts-expect-error
          `^https://${RegExp.escape(application.configuration.hostname)}/courses/${course.publicId}/conversations/(?<courseConversationPublicId>\\d+)(?:\\?message=(?<courseConversationMessagePublicId>\\d+))?$`,
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
    return document.outerHTML;
  };
};
