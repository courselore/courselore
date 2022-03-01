import express from "express";
import { BaseMiddlewareLocals } from "./global-middleware.js";

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

export default (): { coursePartial } => {
  const coursePartial = ({
    req,
    res,
    course,
    enrollment = undefined,
    tight = false,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    enrollment?: IsSignedInMiddlewareLocals["enrollments"][number];
    tight?: boolean;
  }): HTML => html`
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
  return { coursePartial };
};
