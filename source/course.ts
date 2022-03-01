import express from "express";
import { BaseMiddlewareLocals } from "./global-middleware.js";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import lodash from "lodash";

export type EnrollmentRole = typeof enrollmentRoles[number];
export const enrollmentRoles = ["student", "staff"] as const;

export type EnrollmentAccentColor = typeof enrollmentAccentColors[number];
export const enrollmentAccentColors = [
  "red",
  "yellow",
  "emerald",
  "sky",
  "violet",
  "pink",
] as const;

export type ConversationType = typeof conversationTypes[number];
export const conversationTypes = [
  "announcement",
  "question",
  "note",
  "chat",
] as const;

type CoursePartial = ({
  req,
  res,
  course,
  enrollment,
  tight,
}: {
  req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
  res: express.Response<any, BaseMiddlewareLocals>;
  course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
  enrollment?: IsSignedInMiddlewareLocals["enrollments"][number];
  tight?: boolean;
}) => HTML;

export default (): { coursePartial: CoursePartial } => {
  const coursePartial: CoursePartial = ({
    req,
    res,
    course,
    enrollment = undefined,
    tight = false,
  }) => html`
    <div
      class="${res.locals.localCSS(css`
        display: flex;
        gap: var(--space--2);
        align-items: baseline;
      `)}"
    >
      <div>
        <div
          class="button button--tight ${tight
            ? "button--tight--inline"
            : ""} ${res.locals.localCSS(css`
            cursor: default;
            ${enrollment === undefined
              ? css``
              : css`
                  color: var(--color--${enrollment.accentColor}--700);
                  background-color: var(
                    --color--${enrollment.accentColor}--100
                  );
                  @media (prefers-color-scheme: dark) {
                    color: var(--color--${enrollment.accentColor}--200);
                    background-color: var(
                      --color--${enrollment.accentColor}--800
                    );
                  }
                `}
          `)}"
        >
          $${enrollment === undefined
            ? html`<i class="bi bi-journal-arrow-down"></i>`
            : html`<i class="bi bi-journal-text"></i>`}
        </div>
      </div>
      <div>
        <div class="strong">${course.name}</div>
        <div
          class="secondary ${res.locals.localCSS(css`
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
          `)}"
        >
          $${[
            [course.year, course.term],
            [course.institution, course.code],
          ].flatMap((row) => {
            row = row.filter((element) => element !== null);
            return row.length === 0
              ? []
              : [
                  html`
                    <div>
                      $${row.map((element) => html`${element!}`).join(" · ")}
                    </div>
                  `,
                ];
          })}
          $${enrollment === undefined
            ? html``
            : html`
                <div>
                  $${enrollmentRoleIcon[enrollment.role]
                    .regular} ${lodash.capitalize(enrollment.role)}
                </div>
              `}
        </div>
      </div>
    </div>
  `;

  const enrollmentRoleIcon = {
    student: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
  };

  const conversationTypeIcon = {
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

  const conversationTypeTextColor = {
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

  return {
    coursePartial,
    enrollmentRoleIcon,
    conversationTypeIcon,
    conversationTypeTextColor,
  };
};
