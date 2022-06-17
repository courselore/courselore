import express from "express";
import qs from "qs";
import { asyncHandler } from "@leafac/express-async-handler";
import { sql } from "@leafac/sqlite";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import dedent from "dedent";
import cryptoRandomString from "crypto-random-string";
import lodash from "lodash";
import QRCode from "qrcode";
import {
  Courselore,
  BaseMiddlewareLocals,
  LiveUpdatesMiddlewareLocals,
  IsSignedOutMiddlewareLocals,
  IsSignedInMiddlewareLocals,
  UserAvatarlessBackgroundColor,
} from "./index.js";

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

export type CoursePartial = ({
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

export type CoursesPartial = ({
  req,
  res,
  tight,
}: {
  req: express.Request<
    {},
    any,
    {},
    {},
    IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  res: express.Response<
    any,
    IsSignedInMiddlewareLocals & Partial<IsEnrolledInCourseMiddlewareLocals>
  >;
  tight?: boolean;
}) => HTML;

export type CourseArchivedPartial = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
  res: express.Response<any, BaseMiddlewareLocals>;
}) => HTML;

export type EnrollmentRoleIconPartial = {
  [role in EnrollmentRole]: {
    regular: HTML;
    fill: HTML;
  };
};

export type DefaultAccentColorHelper = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
  res: express.Response<any, IsSignedInMiddlewareLocals>;
}) => EnrollmentAccentColor;

export type IsEnrolledInCourseMiddleware = express.RequestHandler<
  { courseReference: string },
  any,
  {},
  {},
  IsEnrolledInCourseMiddlewareLocals
>[];
export interface IsEnrolledInCourseMiddlewareLocals
  extends IsSignedInMiddlewareLocals {
  enrollment: IsSignedInMiddlewareLocals["enrollments"][number];
  course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
  conversationsCount: number;
  tags: {
    id: number;
    reference: string;
    name: string;
    staffOnlyAt: string | null;
  }[];
  actionAllowedOnArchivedCourse?: boolean;
}

export type IsCourseStaffMiddleware = express.RequestHandler<
  { courseReference: string },
  any,
  {},
  {},
  IsCourseStaffMiddlewareLocals
>[];
export interface IsCourseStaffMiddlewareLocals
  extends IsEnrolledInCourseMiddlewareLocals {}

export type InvitationExistsMiddleware = express.RequestHandler<
  { courseReference: string; invitationReference: string },
  any,
  {},
  {},
  InvitationExistsMiddlewareLocals
>[];
export interface InvitationExistsMiddlewareLocals extends BaseMiddlewareLocals {
  invitation: {
    id: number;
    expiresAt: string | null;
    usedAt: string | null;
    course: {
      id: number;
      reference: string;
      archivedAt: string | null;
      name: string;
      year: string | null;
      term: string | null;
      institution: string | null;
      code: string | null;
      nextConversationReference: number;
    };
    reference: string;
    email: string | null;
    name: string | null;
    role: EnrollmentRole;
  };
}

export type MayManageInvitationMiddleware = express.RequestHandler<
  { courseReference: string; invitationReference: string },
  any,
  {},
  {},
  MayManageInvitationMiddlewareLocals
>[];
export interface MayManageInvitationMiddlewareLocals
  extends IsCourseStaffMiddlewareLocals,
    InvitationExistsMiddlewareLocals {}

export type IsInvitationUsableMiddleware = express.RequestHandler<
  { courseReference: string; invitationReference: string },
  any,
  {},
  {},
  IsInvitationUsableMiddlewareLocals
>[];
export interface IsInvitationUsableMiddlewareLocals
  extends InvitationExistsMiddlewareLocals,
    Omit<Partial<IsSignedInMiddlewareLocals>, keyof BaseMiddlewareLocals> {}

export type InvitationMailer = ({
  req,
  res,
  invitation,
}: {
  req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
  res: express.Response<any, BaseMiddlewareLocals>;
  invitation: InvitationExistsMiddlewareLocals["invitation"];
}) => void;

export type MayManageEnrollmentMiddleware = express.RequestHandler<
  { courseReference: string; enrollmentReference: string },
  any,
  {},
  {},
  MayManageEnrollmentMiddlewareLocals
>[];
export interface MayManageEnrollmentMiddlewareLocals
  extends IsCourseStaffMiddlewareLocals {
  managedEnrollment: {
    id: number;
    reference: string;
    role: EnrollmentRole;
    isSelf: boolean;
  };
}

export type CourseSettingsLayout = ({
  req,
  res,
  head,
  body,
}: {
  req: express.Request<{}, any, {}, {}, IsEnrolledInCourseMiddlewareLocals>;
  res: express.Response<any, IsEnrolledInCourseMiddlewareLocals>;
  head: HTML;
  body: HTML;
}) => HTML;

export default (app: Courselore): void => {
  app.locals.partials.course = ({
    req,
    res,
    course,
    enrollment = undefined,
    tight = false,
  }) => html`
    <div
      key="partial--course--${course.reference}"
      css="${res.locals.css(css`
        display: flex;
        gap: var(--space--2);
        align-items: baseline;
      `)}"
    >
      <div>
        <div
          class="button button--tight ${tight ? "button--tight--inline" : ""}"
          css="${res.locals.css(css`
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
          class="secondary"
          css="${res.locals.css(css`
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
                  $${app.locals.partials.enrollmentRoleIcon[enrollment.role]
                    .regular} ${lodash.capitalize(enrollment.role)}
                </div>
              `}
          $${course.archivedAt !== null
            ? html`
                <div>$${app.locals.partials.courseArchived({ req, res })}</div>
              `
            : html``}
        </div>
      </div>
    </div>
  `;

  app.locals.partials.courses = ({ req, res, tight = false }) => {
    const [unarchived, archived] = lodash.partition(
      res.locals.enrollments,
      (enrollment) => enrollment.course.archivedAt === null
    );
    const content: HTML[] = [];

    if (unarchived.length > 0)
      content.push(html`
        $${unarchived.map(
          (enrollment) =>
            html`
              <a
                key="enrollment--${enrollment.reference}"
                href="${app.locals.options.baseURL}/courses/${enrollment.course
                  .reference}"
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                res.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${app.locals.partials.course({
                  req,
                  res,
                  course: enrollment.course,
                  enrollment,
                  tight,
                })}
              </a>
            `
        )}
      `);

    if (archived.length > 0)
      content.push(html`
        <button
          key="enrollment--archived"
          class="dropdown--menu--item menu-box--item button ${tight
            ? ""
            : "button--tight"} button--transparent secondary"
          css="${res.locals.css(css`
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            justify-content: center;
          `)}"
          onload="${javascript`
            (this.tooltip ??= tippy(this)).setProps({
              touch: false,
              content: "Archived courses are read-only. You may continue to read existing conversations, but may no longer ask questions, send messages, and so forth.",
            });

            this.onclick = () => {
              for (const element of leafac.nextSiblings(this).slice(1))
                element.hidden = !element.hidden;
            };
          `}"
        >
          <i class="bi bi-archive"></i>
          Archived Courses
        </button>

        $${archived.map(
          (enrollment) =>
            html`
              <a
                key="enrollment--${enrollment.reference}"
                href="${app.locals.options.baseURL}/courses/${enrollment.course
                  .reference}"
                hidden
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                res.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${app.locals.partials.course({
                  req,
                  res,
                  course: enrollment.course,
                  enrollment,
                  tight,
                })}
              </a>
            `
        )}
      `);

    return content.join(html`<hr class="separator" />`);
  };

  app.locals.partials.enrollmentRoleIcon = {
    student: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
  };

  app.locals.partials.courseArchived = ({ req, res }) => html`
    <div
      class="strong text--rose"
      css="${res.locals.css(css`
        font-size: var(--font-size--2xs);
        line-height: var(--line-height--2xs);
        display: inline-flex;
        gap: var(--space--1);
      `)}"
      onload="${javascript`
        (this.tooltip ??= tippy(this)).setProps({
          touch: false,
          content: "This course is archived, which means it’s read-only. You may continue to read existing conversations, but may no longer ask questions, send messages, and so forth.",
        });
      `}"
    >
      <i class="bi bi-archive-fill"></i>
      Archived
    </div>
  `;

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          res.send(
            app.locals.layouts.main({
              req,
              res,
              head: html`<title>Courselore</title>`,
              body: html`
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `)}"
                >
                  <h2 class="heading--display">Welcome to Courselore!</h2>

                  <div class="decorative-icon">
                    $${app.locals.partials.logo({
                      size: 144 /* var(--space--36) */,
                    })}
                  </div>

                  <div class="menu-box">
                    <a
                      href="${app.locals.options.baseURL}/settings/profile"
                      class="menu-box--item button button--blue"
                    >
                      <i class="bi bi-person-circle"></i>
                      Fill in Your Profile
                    </a>
                    <button
                      class="menu-box--item button button--transparent"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          content: "To enroll in an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                        });
                      `}"
                    >
                      <i class="bi bi-journal-arrow-down"></i>
                      Enroll in an Existing Course
                    </button>
                    <a
                      href="${app.locals.options.baseURL}/courses/new"
                      class="menu-box--item button button--transparent"
                    >
                      <i class="bi bi-journal-plus"></i>
                      Create a New Course
                    </a>
                  </div>
                </div>
              `,
            })
          );
          break;

        case 1:
          res.redirect(
            303,
            `${app.locals.options.baseURL}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
            app.locals.layouts.main({
              req,
              res,
              head: html`<title>Courselore</title>`,
              showCourseSwitcher: false,
              body: html`
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                    align-items: center;
                  `)}"
                >
                  <div class="decorative-icon">
                    <i class="bi bi-journal-text"></i>
                  </div>

                  <p class="secondary">Go to one of your courses.</p>

                  <div
                    class="menu-box"
                    css="${res.locals.css(css`
                      max-width: var(--space--80);
                    `)}"
                  >
                    $${app.locals.partials.courses({ req, res })}
                  </div>
                </div>
              `,
            })
          );
          break;
      }
    }
  );

  app.get<{}, HTML, {}, {}, IsSignedInMiddlewareLocals>(
    "/courses/new",
    ...app.locals.middlewares.isSignedIn,
    (req, res) => {
      res.send(
        app.locals.layouts.main({
          req,
          res,
          head: html`<title>Create a New Course · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-plus"></i>
              Create a New Course
            </h2>

            $${app.locals.options.baseURL ===
            app.locals.options.canonicalBaseURL
              ? html`
                  <div
                    css="${res.locals.css(css`
                      color: var(--color--amber--700);
                      background-color: var(--color--amber--100);
                      @media (prefers-color-scheme: dark) {
                        color: var(--color--amber--200);
                        background-color: var(--color--amber--900);
                      }
                      padding: var(--space--4);
                      border-radius: var(--border-radius--lg);
                      display: flex;
                      gap: var(--space--4);

                      .link {
                        color: var(--color--amber--600);
                        &:hover,
                        &:focus-within {
                          color: var(--color--amber--500);
                        }
                        &:active {
                          color: var(--color--amber--700);
                        }
                        @media (prefers-color-scheme: dark) {
                          color: var(--color--amber--100);
                          &:hover,
                          &:focus-within {
                            color: var(--color--amber--50);
                          }
                          &:active {
                            color: var(--color--amber--200);
                          }
                        }
                      }
                    `)}"
                  >
                    <div
                      css="${res.locals.css(css`
                        font-size: var(--font-size--4xl);
                        line-height: var(--line-height--4xl);
                      `)}"
                    >
                      <i class="bi bi-exclamation-triangle-fill"></i>
                    </div>
                    <p>
                      This is the hosted installation of Courselore managed by
                      the Courselore developers. It’s free for a limited period,
                      but we may charge for it in the future (you’ll be warned
                      well in advance). Courselore is
                      <a
                        href="https://github.com/courselore/courselore"
                        class="link"
                        >open source</a
                      >
                      and you may install it on your own server, an option that
                      will be free forever and guarantees maximum privacy &
                      control.
                    </p>
                  </div>
                `
              : html``}

            <form
              method="POST"
              action="${app.locals.options.baseURL}/courses"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Name</p>
                <input
                  type="text"
                  name="name"
                  class="input--text"
                  required
                  autocomplete="off"
                  autofocus
                />
              </label>
              <div
                css="${res.locals.css(css`
                  display: flex;
                  gap: var(--space--2);
                  & > * {
                    flex: 1;
                  }
                `)}"
              >
                <label class="label">
                  <p class="label--text">Year</p>
                  <input
                    type="text"
                    name="year"
                    class="input--text"
                    autocomplete="off"
                    onload="${javascript`
                      this.defaultValue = new Date().getFullYear().toString();
                    `}"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Term</p>
                  <input
                    type="text"
                    name="term"
                    class="input--text"
                    autocomplete="off"
                    onload="${javascript`
                      const month = new Date().getMonth() + 1;
                      this.defaultValue = month < 4 || month > 9 ? "Spring" : "Fall";
                    `}"
                  />
                </label>
              </div>
              <label class="label">
                <p class="label--text">Institution</p>
                <input
                  type="text"
                  name="institution"
                  class="input--text"
                  autocomplete="off"
                  placeholder="Your University"
                  value="${res.locals.enrollments.length > 0
                    ? res.locals.enrollments[res.locals.enrollments.length - 1]
                        .course.institution ?? ""
                    : ""}"
                />
              </label>
              <label class="label">
                <p class="label--text">Code</p>
                <input
                  type="text"
                  name="code"
                  class="input--text"
                  autocomplete="off"
                  placeholder="CS 601.426"
                />
              </label>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-journal-plus"></i>
                  Create Course
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.post<
    {},
    any,
    {
      name?: string;
      year?: string;
      term?: string;
      institution?: string;
      code?: string;
    },
    {},
    IsSignedInMiddlewareLocals
  >("/courses", ...app.locals.middlewares.isSignedIn, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      !["string", "undefined"].includes(typeof req.body.year) ||
      !["string", "undefined"].includes(typeof req.body.term) ||
      !["string", "undefined"].includes(typeof req.body.institution) ||
      !["string", "undefined"].includes(typeof req.body.code)
    )
      return next("validation");

    const course = app.locals.database.get<{
      id: number;
      reference: string;
    }>(
      sql`
        INSERT INTO "courses" (
          "createdAt",
          "reference",
          "name",
          "year",
          "term",
          "institution",
          "code",
          "nextConversationReference"
        )
        VALUES (
          ${new Date().toISOString()},
          ${cryptoRandomString({ length: 10, type: "numeric" })},
          ${req.body.name},
          ${
            typeof req.body.year === "string" && req.body.year.trim() !== ""
              ? req.body.year
              : null
          },
          ${
            typeof req.body.term === "string" && req.body.term.trim() !== ""
              ? req.body.term
              : null
          },
          ${
            typeof req.body.institution === "string" &&
            req.body.institution.trim() !== ""
              ? req.body.institution
              : null
          },
          ${
            typeof req.body.code === "string" && req.body.code.trim() !== ""
              ? req.body.code
              : null
          },
          ${1}
        )
        RETURNING *
      `
    )!;
    app.locals.database.run(
      sql`
        INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
        VALUES (
          ${new Date().toISOString()},
          ${res.locals.user.id},
          ${course.id},
          ${cryptoRandomString({ length: 10, type: "numeric" })},
          ${"staff"},
          ${app.locals.helpers.defaultAccentColor({ req, res })}
        )
      `
    );
    res.redirect(
      303,
      `${app.locals.options.baseURL}/courses/${course.reference}`
    );
  });

  app.locals.helpers.defaultAccentColor = ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, IsSignedInMiddlewareLocals>;
    res: express.Response<any, IsSignedInMiddlewareLocals>;
  }): EnrollmentAccentColor => {
    const accentColorsInUse = new Set<EnrollmentAccentColor>(
      res.locals.enrollments.map((enrollment) => enrollment.accentColor)
    );
    const accentColorsAvailable = new Set<EnrollmentAccentColor>(
      enrollmentAccentColors
    );
    for (const accentColorInUse of accentColorsInUse) {
      accentColorsAvailable.delete(accentColorInUse);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  };

  app.locals.middlewares.isEnrolledInCourse = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      const enrollment = res.locals.enrollments.find(
        (enrollment) =>
          enrollment.course.reference === req.params.courseReference
      );
      if (enrollment === undefined) return next("route");
      res.locals.enrollment = enrollment;
      res.locals.course = enrollment.course;

      res.locals.conversationsCount = app.locals.database.get<{
        count: number;
      }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "conversations"
          WHERE "course" = ${res.locals.course.id}
          $${
            res.locals.enrollment.role !== "staff"
              ? sql`
                  AND "conversations"."staffOnlyAt" IS NULL
                `
              : sql``
          }
        `
      )!.count;

      res.locals.tags = app.locals.database.all<{
        id: number;
        reference: string;
        name: string;
        staffOnlyAt: string | null;
      }>(
        sql`
          SELECT "id", "reference", "name", "staffOnlyAt"
          FROM "tags"
          WHERE "course" = ${res.locals.course.id}
                $${
                  res.locals.enrollment.role === "student"
                    ? sql`AND "staffOnlyAt" IS NULL`
                    : sql``
                }
          ORDER BY "id" ASC
        `
      );

      if (
        res.locals.course.archivedAt !== null &&
        !["GET", "HEAD"].includes(req.method) &&
        res.locals.actionAllowedOnArchivedCourse !== true
      ) {
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "rose",
          content: html`
            This action isn’t allowed because the course is archived, which
            means it’s read-only.
          `,
        });
        return res.redirect(
          303,
          `${app.locals.options.baseURL}/courses/${res.locals.course.reference}`
        );
      }

      next();
    },
  ];

  app.locals.middlewares.isCourseStaff = [
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (res.locals.enrollment.role === "staff") return next();
      next("route");
    },
  ];

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & LiveUpdatesMiddlewareLocals
  >(
    "/courses/:courseReference",
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.liveUpdates,
    (req, res) => {
      if (res.locals.conversationsCount === 0)
        return res.send(
          app.locals.layouts.main({
            req,
            res,
            head: html`<title>${res.locals.course.name} · Courselore</title>`,
            body: html`
              <div
                css="${res.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  align-items: center;
                `)}"
              >
                <h2 class="heading--display">
                  Welcome to ${res.locals.course.name}!
                </h2>

                <div class="decorative-icon">
                  <i class="bi bi-journal-text"></i>
                </div>

                <div class="menu-box">
                  $${res.locals.enrollment.role === "staff"
                    ? html`
                        <a
                          href="${app.locals.options.baseURL}/courses/${res
                            .locals.course.reference}/settings/tags"
                          class="menu-box--item button button--blue"
                        >
                          <i class="bi bi-sliders"></i>
                          Configure the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="${app.locals.options.baseURL}/courses/${res.locals
                      .course.reference}/conversations/new"
                    class="menu-box--item button ${res.locals.enrollment
                      .role === "staff"
                      ? "button--transparent"
                      : "button--blue"}"
                  >
                    $${res.locals.enrollment.role === "staff"
                      ? html`<i class="bi bi-chat-left-text"></i>`
                      : html`<i class="bi bi-chat-left-text-fill"></i>`}
                    Start the First Conversation
                  </a>
                </div>
              </div>
            `,
          })
        );

      res.send(
        app.locals.layouts.conversation({
          req,
          res,
          head: html`<title>${res.locals.course.name} · Courselore</title>`,
          sidebarOnSmallScreen: true,
          body: html`<p class="secondary">No conversation selected.</p>`,
        })
      );
    }
  );

  app.locals.middlewares.invitationExists = [
    (req, res, next) => {
      const invitation = app.locals.database.get<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        courseId: number;
        courseReference: string;
        courseArchivedAt: string | null;
        courseName: string;
        courseYear: string | null;
        courseTerm: string | null;
        courseInstitution: string | null;
        courseCode: string | null;
        courseNextConversationReference: number;
        reference: string;
        email: string | null;
        name: string | null;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "invitations"."id",
                 "invitations"."expiresAt",
                 "invitations"."usedAt",
                 "courses"."id" AS "courseId",
                 "courses"."reference" AS "courseReference",
                 "courses"."archivedAt" AS "courseArchivedAt",
                 "courses"."name" AS "courseName",
                 "courses"."year" AS "courseYear",
                 "courses"."term" AS "courseTerm",
                 "courses"."institution" AS "courseInstitution",
                 "courses"."code" AS "courseCode",
                 "courses"."nextConversationReference" AS "courseNextConversationReference",
                 "invitations"."reference",
                 "invitations"."email",
                 "invitations"."name",
                 "invitations"."role"
          FROM "invitations"
          JOIN "courses" ON "invitations"."course" = "courses"."id" AND
                            "courses"."reference" = ${req.params.courseReference}
          WHERE "invitations"."reference" = ${req.params.invitationReference}
        `
      );
      if (invitation === undefined) return next("route");
      res.locals.invitation = {
        id: invitation.id,
        expiresAt: invitation.expiresAt,
        usedAt: invitation.usedAt,
        course: {
          id: invitation.courseId,
          reference: invitation.courseReference,
          archivedAt: invitation.courseArchivedAt,
          name: invitation.courseName,
          year: invitation.courseYear,
          term: invitation.courseTerm,
          institution: invitation.courseInstitution,
          code: invitation.courseCode,
          nextConversationReference: invitation.courseNextConversationReference,
        },
        reference: invitation.reference,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
      };
      next();
    },
  ];

  app.locals.middlewares.mayManageInvitation = [
    ...app.locals.middlewares.isCourseStaff,
    ...app.locals.middlewares.invitationExists,
  ];

  app.locals.middlewares.isInvitationUsable = [
    ...app.locals.middlewares.invitationExists,
    (req, res, next) => {
      if (
        res.locals.invitation.usedAt !== null ||
        app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
        (res.locals.invitation.email !== null &&
          res.locals.user !== undefined &&
          res.locals.invitation.email.toLowerCase() !==
            res.locals.user.email.toLowerCase())
      )
        return next("route");
      next();
    },
  ];

  app.locals.mailers.invitation = ({ req, res, invitation }) => {
    const link = `${app.locals.options.baseURL}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    app.locals.database.run(
      sql`
        INSERT INTO "sendEmailJobs" (
          "createdAt",
          "startAt",
          "expiresAt",
          "mailOptions"
        )
        VALUES (
          ${new Date().toISOString()},
          ${new Date().toISOString()},
          ${new Date(Date.now() + 20 * 60 * 1000).toISOString()},
          ${JSON.stringify({
            from: `"Courselore · ${invitation.course.name.replace(
              /[^\w ]/g,
              "•"
            )}" <${app.locals.options.administratorEmail}>`,
            to: invitation.email!,
            subject: `Enroll in ${invitation.course.name}`,
            html: html`
              <p>
                Enroll in ${invitation.course.name}:<br />
                <a href="${link}" target="_blank">${link}</a>
              </p>
              $${invitation.expiresAt === null
                ? html``
                : html`
                    <p>
                      <small>
                        This invitation is valid until
                        ${new Date(invitation.expiresAt).toISOString()}.
                      </small>
                    </p>
                  `}
            `,
          })}
        )
      `
    );
    app.locals.workers.sendEmail();
  };

  app.locals.middlewares.mayManageEnrollment = [
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      const managedEnrollment = app.locals.database.get<{
        id: number;
        reference: string;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "id", "reference", "role"
          FROM "enrollments"
          WHERE "course" = ${res.locals.course.id} AND
                "reference" = ${req.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next("route");
      res.locals.managedEnrollment = {
        ...managedEnrollment,
        isSelf: managedEnrollment.id === res.locals.enrollment.id,
      };
      if (
        managedEnrollment.id === res.locals.enrollment.id &&
        app.locals.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "enrollments"
            WHERE "course" = ${res.locals.course.id} AND
                  "role" = ${"staff"}
          `
        )!.count === 1
      )
        return next("validation");
      next();
    },
  ];

  app.locals.layouts.courseSettings = ({ req, res, head, body }) =>
    app.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `,
      menu:
        res.locals.enrollment.role === "staff"
          ? html`
              <a
                href="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/settings/course-information"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/course-information"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-journal-text"></i>
                Course Information
              </a>
              <a
                href="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/settings/tags"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/tags"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.endsWith("/settings/tags")
                    ? "bi-tags-fill"
                    : "bi-tags"}"
                ></i>
                Tags
              </a>
              <a
                href="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/settings/invitations"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/invitations"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.endsWith("/settings/invitations")
                    ? "bi-person-plus-fill"
                    : "bi-person-plus"}"
                ></i>
                Invitations
              </a>
              <a
                href="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/settings/enrollments"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/enrollments"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.endsWith("/settings/enrollments")
                    ? "bi-people-fill"
                    : "bi-people"}"
                ></i>
                Enrollments
              </a>
              <a
                href="${app.locals.options.baseURL}/courses/${res.locals.course
                  .reference}/settings/your-enrollment"
                class="dropdown--menu--item menu-box--item button ${req.path.endsWith(
                  "/settings/your-enrollment"
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.endsWith("/settings/your-enrollment")
                    ? "bi-person-fill"
                    : "bi-person"}"
                ></i>
                Your Enrollment
              </a>
            `
          : html``,
      body,
    });

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${
          res.locals.course.reference
        }/settings/${
          res.locals.enrollment.role === "staff"
            ? "course-information"
            : "your-enrollment"
        }`
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/course-information",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Course Information · Course Settings · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-journal-text"></i>
              Course Information
            </h2>
            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/course-information"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <label class="label">
                <p class="label--text">Name</p>
                <input
                  type="text"
                  name="name"
                  value="${res.locals.course.name}"
                  required
                  autocomplete="off"
                  class="input--text"
                />
              </label>
              <div
                css="${res.locals.css(css`
                  display: flex;
                  gap: var(--space--2);
                  & > * {
                    flex: 1;
                  }
                `)}"
              >
                <label class="label">
                  <p class="label--text">Year</p>
                  <input
                    type="text"
                    name="year"
                    value="${res.locals.course.year ?? ""}"
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Term</p>
                  <input
                    type="text"
                    name="term"
                    value="${res.locals.course.term ?? ""}"
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
              </div>
              <label class="label">
                <p class="label--text">Institution</p>
                <input
                  type="text"
                  name="institution"
                  value="${res.locals.course.institution ?? ""}"
                  autocomplete="off"
                  class="input--text"
                  placeholder="Your University"
                />
              </label>
              <label class="label">
                <p class="label--text">Code</p>
                <input
                  type="text"
                  name="code"
                  value="${res.locals.course.code ?? ""}"
                  autocomplete="off"
                  class="input--text"
                  placeholder="CS 601.426"
                />
              </label>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Course Information
                </button>
              </div>
            </form>

            <hr class="separator" />

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/course-information"
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--1);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />

              $${res.locals.course.archivedAt === null
                ? html`
                    <div
                      css="${res.locals.css(css`
                        display: flex;
                        gap: var(--space--2);
                        align-items: baseline;
                      `)}"
                    >
                      <input type="hidden" name="isArchived" value="true" />
                      <button class="button button--rose">
                        <i class="bi bi-archive-fill"></i>
                        Archive Course
                      </button>
                      <button
                        type="button"
                        class="button button--tight button--tight--inline button--transparent"
                        css="${res.locals.css(css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `)}"
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            trigger: "click",
                            interactive: true,
                            content: ${res.locals.html(html`
                              <div
                                css="${res.locals.css(css`
                                  padding: var(--space--2);
                                  display: flex;
                                  flex-direction: column;
                                  gap: var(--space--4);
                                `)}"
                              >
                                <p>
                                  An archived course becomes read-only. People,
                                  including students, who are enrolled in the
                                  course may continue to read existing
                                  conversations, but may no longer ask
                                  questions, send messages, and so forth.
                                </p>
                                <p>You may unarchive a course at any time.</p>
                              </div>
                            `)},
                          });
                        `}"
                      >
                        <i class="bi bi-info-circle"></i>
                      </button>
                    </div>
                  `
                : html`
                    <div
                      css="${res.locals.css(css`
                        display: flex;
                        gap: var(--space--2);
                        align-items: baseline;
                      `)}"
                    >
                      <input type="hidden" name="isArchived" value="false" />
                      <button class="button button--rose">
                        <i class="bi bi-archive-fill"></i>
                        Unarchive Course
                      </button>
                      <button
                        type="button"
                        class="button button--tight button--tight--inline button--transparent"
                        css="${res.locals.css(css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `)}"
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            trigger: "click",
                            interactive: true,
                            content: ${res.locals.html(html`
                              <div
                                css="${res.locals.css(css`
                                  padding: var(--space--2);
                                `)}"
                              >
                                This course is archived, which means it’s
                                read-only. People, including students, who are
                                enrolled in the course may continue to read
                                existing conversations, but may no longer ask
                                questions, send messages, and so forth.
                              </div>
                            `)},
                          });
                        `}"
                      >
                        <i class="bi bi-info-circle"></i>
                      </button>
                    </div>
                    <div
                      class="secondary"
                      css="${res.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <span>
                        Archived
                        <time
                          datetime="${new Date(
                            res.locals.course.archivedAt
                          ).toISOString()}"
                          onload="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                          `}"
                        ></time
                        >.
                      </span>
                    </div>
                  `}
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    {
      name?: string;
      year?: string;
      term?: string;
      institution?: string;
      code?: string;
      isArchived?: "true" | "false";
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/course-information",
    (req, res, next) => {
      res.locals.actionAllowedOnArchivedCourse =
        typeof req.body.isArchived === "string";
      next();
    },
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        (typeof req.body.isArchived !== "string" &&
          (typeof req.body.name !== "string" ||
            req.body.name.trim() === "" ||
            !["string", "undefined"].includes(typeof req.body.year) ||
            !["string", "undefined"].includes(typeof req.body.term) ||
            !["string", "undefined"].includes(typeof req.body.institution) ||
            !["string", "undefined"].includes(typeof req.body.code))) ||
        (typeof req.body.isArchived === "string" &&
          (!["true", "false"].includes(req.body.isArchived) ||
            (req.body.isArchived === "true" &&
              res.locals.course.archivedAt !== null) ||
            (req.body.isArchived === "false" &&
              res.locals.course.archivedAt === null)))
      )
        return next("validation");

      if (typeof req.body.isArchived !== "string") {
        app.locals.database.run(
          sql`
            UPDATE "courses"
            SET "name" = ${req.body.name},
                "year" = ${
                  typeof req.body.year === "string" &&
                  req.body.year.trim() !== ""
                    ? req.body.year
                    : null
                },
                "term" = ${
                  typeof req.body.term === "string" &&
                  req.body.term.trim() !== ""
                    ? req.body.term
                    : null
                },
                "institution" = ${
                  typeof req.body.institution === "string" &&
                  req.body.institution.trim() !== ""
                    ? req.body.institution
                    : null
                },
                "code" = ${
                  typeof req.body.code === "string" &&
                  req.body.code.trim() !== ""
                    ? req.body.code
                    : null
                }
            WHERE "id" = ${res.locals.course.id}
          `
        );
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Course information updated successfully.`,
        });
      } else {
        app.locals.database.run(
          sql`
            UPDATE "courses"
            SET "archivedAt" = ${
              req.body.isArchived === "true" ? new Date().toISOString() : null
            }
            WHERE "id" = ${res.locals.course.id}
          `
        );
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`
            Course ${req.body.isArchived === "true" ? "archived" : "unarchived"}
            successfully.
          `,
        });
      }

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/course-information`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Tags · Course Settings · ${res.locals.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-tags"></i>
              Tags
            </h2>

            $${res.locals.tags.length === 0
              ? html`
                  <div
                    css="${res.locals.css(css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      align-items: center;
                    `)}"
                  >
                    <div class="decorative-icon">
                      <i class="bi bi-tags"></i>
                    </div>
                    <p class="secondary">Organize conversations with tags.</p>
                  </div>
                `
              : html``}

            <form
              method="PUT"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/tags"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                css="${res.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `)}"
              >
                <div
                  class="tags"
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  $${res.locals.tags.map(
                    (tag, index) => html`
                      <div
                        key="tag--${tag.reference}"
                        class="tag"
                        css="${res.locals.css(css`
                          padding-bottom: var(--space--4);
                          border-bottom: var(--border-width--1) solid
                            var(--color--gray--medium--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--gray--medium--700);
                          }
                          display: flex;
                          gap: var(--space--2);
                          align-items: baseline;
                        `)}"
                      >
                        <input
                          type="hidden"
                          name="tags[${index.toString()}][reference]"
                          value="${tag.reference}"
                        />
                        <input
                          type="hidden"
                          name="tags[${index.toString()}][delete]"
                          value="true"
                          disabled
                          onload="${javascript`
                            this.isModified = true;
                          `}"
                        />
                        <div class="tag--icon text--teal">
                          <i class="bi bi-tag-fill"></i>
                        </div>
                        <div
                          css="${res.locals.css(css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `)}"
                        >
                          <input
                            type="text"
                            name="tags[${index.toString()}][name]"
                            value="${tag.name}"
                            class="disable-on-delete input--text"
                            required
                            autocomplete="off"
                          />
                          <div
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--4);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <div
                              css="${res.locals.css(css`
                                width: var(--space--40);
                              `)}"
                            >
                              <label
                                class="button button--tight button--tight--inline button--justify-start button--transparent"
                              >
                                <input
                                  type="checkbox"
                                  name="tags[${index.toString()}][isStaffOnly]"
                                  $${tag.staffOnlyAt === null
                                    ? html``
                                    : html`checked`}
                                  class="disable-on-delete visually-hidden input--radio-or-checkbox--multilabel"
                                />
                                <span
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Set as Visible by Staff Only",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-eye"></i>
                                  Visible by Everyone
                                </span>
                                <span
                                  class="text--sky"
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Set as Visible by Everyone",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-mortarboard-fill"></i>
                                  Visible by Staff Only
                                </span>
                              </label>
                            </div>
                            <div
                              css="${res.locals.css(css`
                                .tag.deleted & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    theme: "rose",
                                    touch: false,
                                    content: "Remove Tag",
                                  });

                                  (this.dropdown ??= tippy(this)).setProps({
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.html(
                                      html`
                                        <div
                                          css="${res.locals.css(css`
                                            padding: var(--space--2)
                                              var(--space--0);
                                            display: flex;
                                            flex-direction: column;
                                            gap: var(--space--4);
                                          `)}"
                                        >
                                          <p>
                                            Are you sure you want to remove this
                                            tag?
                                          </p>
                                          <p>
                                            <strong
                                              css="${res.locals.css(css`
                                                font-weight: var(
                                                  --font-weight--bold
                                                );
                                              `)}"
                                            >
                                              The tag will be removed from all
                                              conversations and you may not undo
                                              this action!
                                            </strong>
                                          </p>
                                          <button
                                            type="button"
                                            class="button button--rose"
                                            onload="${javascript`
                                              this.onclick = () => {
                                                const tag = this.closest(".tag");
                                                tag.classList.add("deleted");
                                                const tagIconClassList = tag.querySelector(".tag--icon").classList;
                                                tagIconClassList.remove("text--teal");
                                                tagIconClassList.add("text--rose");
                                                tag.querySelector('[name$="[delete]"]').disabled = false;
                                                for (const element of tag.querySelectorAll(".disable-on-delete")) {
                                                  element.disabled = true;
                                                  const button = element.closest(".button");
                                                  if (button === null) continue;
                                                  button.classList.add("disabled");
                                                  for (const element of button.querySelectorAll("*"))
                                                    if (element.tooltip !== undefined) element.tooltip.disable();
                                                }
                                              };
                                            `}"
                                          >
                                            <i class="bi bi-trash-fill"></i>
                                            Remove Tag
                                          </button>
                                        </div>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                <i class="bi bi-trash"></i>
                              </button>
                            </div>
                            <div
                              css="${res.locals.css(css`
                                .tag:not(.deleted) & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Don’t Remove Tag",
                                  });
                                      
                                  this.onclick = () => {
                                    const tag = this.closest(".tag");
                                    tag.classList.remove("deleted");
                                    const tagIconClassList = tag.querySelector(".tag--icon").classList;
                                    tagIconClassList.remove("text--rose");
                                    tagIconClassList.add("text--teal");
                                    tag.querySelector('[name$="[delete]"]').disabled = true;
                                    for (const element of tag.querySelectorAll(".disable-on-delete")) {
                                      element.disabled = false;
                                      const button = element.closest(".button");
                                      if (button === null) continue;
                                      button.classList.remove("disabled");
                                      for (const element of button.querySelectorAll("*"))
                                        if (element.tooltip !== undefined) element.tooltip.enable();
                                    }
                                  };
                                `}"
                              >
                                <i class="bi bi-recycle"></i>
                              </button>
                            </div>
                            $${res.locals.conversationsCount > 0
                              ? html`
                                  <a
                                    href="${app.locals.options
                                      .baseURL}/courses/${res.locals.course
                                      .reference}${qs.stringify(
                                      {
                                        conversations: {
                                          filters: {
                                            tagsReferences: [tag.reference],
                                          },
                                        },
                                      },
                                      { addQueryPrefix: true }
                                    )}"
                                    target="_blank"
                                    class="button button--tight button--tight--inline button--transparent"
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        touch: false,
                                        content: "See Conversations with This Tag",
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-chat-left-text"></i>
                                  </a>
                                `
                              : html``}
                          </div>
                        </div>
                      </div>
                    `
                  )}
                </div>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    justify-content: center;
                  `)}"
                >
                  <button
                    type="button"
                    class="button button--transparent button--full-width-on-small-screen"
                    onload="${javascript`
                      const newTagPartial = ${res.locals.html(
                        html`
                          <div
                            class="tag"
                            css="${res.locals.css(css`
                              padding-bottom: var(--space--4);
                              border-bottom: var(--border-width--1) solid
                                var(--color--gray--medium--200);
                              @media (prefers-color-scheme: dark) {
                                border-color: var(--color--gray--medium--700);
                              }
                              display: flex;
                              gap: var(--space--2);
                              align-items: baseline;
                            `)}"
                          >
                            <div class="text--teal">
                              <i class="bi bi-tag-fill"></i>
                            </div>
                            <div
                              css="${res.locals.css(css`
                                flex: 1;
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `)}"
                            >
                              <input
                                type="text"
                                placeholder=" "
                                required
                                autocomplete="off"
                                disabled
                                class="input--text"
                                onloadpartial="${javascript`
                                  this.isModified = true;
                                  this.disabled = false;
                                  this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][name]";
                                `}"
                              />
                              <div
                                css="${res.locals.css(css`
                                  display: flex;
                                  flex-wrap: wrap;
                                  column-gap: var(--space--4);
                                  row-gap: var(--space--2);
                                `)}"
                              >
                                <div
                                  css="${res.locals.css(css`
                                    width: var(--space--40);
                                  `)}"
                                >
                                  <label
                                    class="button button--tight button--tight--inline button--justify-start button--transparent"
                                  >
                                    <input
                                      type="checkbox"
                                      disabled
                                      class="visually-hidden input--radio-or-checkbox--multilabel"
                                      onloadpartial="${javascript`
                                        this.isModified = true;
                                        this.disabled = false;
                                        this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][isStaffOnly]";
                                      `}"
                                    />
                                    <span
                                      onloadpartial="${javascript`
                                        (this.tooltip ??= tippy(this)).setProps({
                                          touch: false,
                                          content: "Set as Visible by Staff Only",
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-eye"></i>
                                      Visible by Everyone
                                    </span>
                                    <span
                                      class="text--sky"
                                      onloadpartial="${javascript`
                                        (this.tooltip ??= tippy(this)).setProps({
                                          touch: false,
                                          content: "Set as Visible by Everyone",
                                        });
                                      `}"
                                    >
                                      <i class="bi bi-mortarboard-fill"></i>
                                      Visible by Staff Only
                                    </span>
                                  </label>
                                </div>
                                <button
                                  type="button"
                                  class="button button--tight button--tight--inline button--transparent"
                                  onloadpartial="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      theme: "rose",
                                      touch: false,
                                      content: "Remove Tag",
                                    });

                                    this.onclick = () => {
                                      const tag = this.closest(".tag");
                                      tag.replaceChildren();
                                      tag.hidden = true;
                                    };
                                  `}"
                                >
                                  <i class="bi bi-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        `
                      )};
                      newTagPartial.remove();
                      this.onclick = () => {
                        const newTag = newTagPartial.firstElementChild.cloneNode(true);
                        this.closest("form").querySelector(".tags").insertAdjacentElement("beforeend", newTag);
                        for (const element of newTag.querySelectorAll("[onloadpartial]"))
                          new Function(element.getAttribute("onloadpartial")).call(element);
                      };

                      this.onvalidate = (event) => {
                        if ([...this.closest("form").querySelector(".tags").children].filter((tag) => !tag.hidden).length === 0)
                          return "Please add at least one tag.";
                      };
                    `}"
                  >
                    <i class="bi bi-plus-circle"></i>
                    Add Tag
                  </button>
                </div>
              </div>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Tags
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.put<
    { courseReference: string },
    HTML,
    {
      tags?: {
        reference?: string;
        delete?: "true";
        name?: string;
        isStaffOnly?: boolean;
      }[];
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        !Array.isArray(req.body.tags) ||
        req.body.tags.length === 0 ||
        req.body.tags.some(
          (tag) =>
            (tag.reference === undefined &&
              (typeof tag.name !== "string" || tag.name.trim() === "")) ||
            (tag.reference !== undefined &&
              (!res.locals.tags.some(
                (existingTag) => tag.reference === existingTag.reference
              ) ||
                (tag.delete !== "true" &&
                  (typeof tag.name !== "string" || tag.name.trim() === ""))))
        )
      )
        return next("validation");

      for (const tag of req.body.tags)
        if (tag.reference === undefined)
          app.locals.database.run(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${tag.name},
                ${tag.isStaffOnly ? new Date().toISOString() : null}
              )
            `
          );
        else if (tag.delete === "true")
          app.locals.database.run(
            sql`
              DELETE FROM "tags" WHERE "reference" = ${tag.reference}
            `
          );
        else
          app.locals.database.run(
            sql`
              UPDATE "tags"
              SET "name" = ${tag.name},
                  "staffOnlyAt" = ${
                    tag.isStaffOnly ? new Date().toISOString() : null
                  }
              WHERE "reference" = ${tag.reference}
            `
          );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Tags updated successfully.`,
      });

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/tags`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      const invitations = app.locals.database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        role: EnrollmentRole;
      }>(
        sql`
          SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "role"
          FROM "invitations"
          WHERE "course" = ${res.locals.course.id}
          ORDER BY "id" DESC
        `
      );

      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Invitations · Course Settings · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-person-plus"></i>
              Invitations
            </h2>

            <form
              method="POST"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/invitations"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Type</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="link"
                      required
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onload="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          const emails = form.querySelector(".emails");
                          emails.hidden = true;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = true;
                          form.querySelector(".button--create-invitation").hidden = false;
                          form.querySelector(".button--send-invitation-emails").hidden = true;
                        };
                      `}"
                    />
                    <span>
                      <i class="bi bi-link"></i>
                      Invitation Link
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-link"></i>
                      Invitation Link
                    </span>
                  </label>
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="radio"
                      name="type"
                      value="email"
                      required
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onload="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          const emails = form.querySelector(".emails");
                          emails.hidden = false;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = false;
                          form.querySelector(".button--create-invitation").hidden = true;
                          form.querySelector(".button--send-invitation-emails").hidden = false;
                        };
                      `}"
                    />
                    <span>
                      <i class="bi bi-envelope"></i>
                      Email
                    </span>
                    <span class="text--blue">
                      <i class="bi bi-envelope-fill"></i>
                      Email
                    </span>
                  </label>
                </div>
              </div>

              <div hidden class="emails label">
                <div class="label--text">
                  Emails
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        content: ${res.locals.html(
                          html`
                            <div
                              css="${res.locals.css(css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `)}"
                            >
                              <p>
                                Emails must be separated by commas and/or
                                newlines, and may include names which may be
                                quoted or not, for example:
                              </p>
                              <pre class="pre"><code>${dedent`
                                "Scott" <scott@courselore.org>,
                                Ali <ali@courselore.org>
                                leandro@courselore.org
                              `}</code></pre>
                            </div>
                          `
                        )},
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <textarea
                  name="emails"
                  required
                  disabled
                  class="input--text input--text--textarea"
                  css="${res.locals.css(css`
                    height: var(--space--32);
                  `)}"
                  onload="${javascript`
                    this.onvalidate = (event) => {
                      const emails = [];
                      for (let email of this.value.split(${/[,\n]/})) {
                        email = email.trim();
                        let name = null;
                        const match = email.match(${/^(?<name>.*)<(?<email>.*)>$/});
                        if (match !== null) {
                          email = match.groups.email.trim();
                          name = match.groups.name.trim();
                          if (name.startsWith('"') && name.endsWith('"'))
                            name = name.slice(1, -1);
                          if (name === "") name = null;
                        }
                        if (email === "") continue;
                        emails.push({ email, name });
                      }
                      if (
                        emails.length === 0 ||
                        emails.some(
                          ({ email }) => email.match(leafac.regExps.email) === null
                        )
                      )
                        return "Match the requested format.";
                    };
                  `}"
                ></textarea>
              </div>

              <div class="label">
                <p class="label--text">Role</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  $${enrollmentRoles.map(
                    (role) =>
                      html`
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="radio"
                            name="role"
                            value="${role}"
                            required
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                          />
                          <span>
                            $${app.locals.partials.enrollmentRoleIcon[role]
                              .regular}
                            ${lodash.capitalize(role)}
                          </span>
                          <span class="text--blue">
                            $${app.locals.partials.enrollmentRoleIcon[role]
                              .fill}
                            ${lodash.capitalize(role)}
                          </span>
                        </label>
                      `
                  )}
                </div>
              </div>

              <div class="label">
                <p class="label--text">Expiration</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      onload="${javascript`
                        this.onchange = () => {
                          const expiresAt = this.closest("form").querySelector(".expires-at");
                          expiresAt.hidden = !this.checked;
                          for (const element of expiresAt.querySelectorAll("*"))
                            if (element.disabled !== undefined) element.disabled = !this.checked;
                        };
                      `}"
                    />
                    <span
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Set as Expiring",
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Expire
                    </span>
                    <span
                      class="text--amber"
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          touch: false,
                          content: "Set as Not Expiring",
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-plus-fill"></i>
                      Expires
                    </span>
                  </label>
                </div>
              </div>

              <div hidden class="expires-at label">
                <div class="label--text">
                  Expires at
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        content: "This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving change.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <input
                  type="text"
                  name="expiresAt"
                  value="${new Date().toISOString()}"
                  required
                  autocomplete="off"
                  disabled
                  class="input--text"
                  onload="${javascript`
                    this.value = this.defaultValue = leafac.localizeDateTime(this.defaultValue);

                    this.onvalidate = (event) => {
                      const error = leafac.validateLocalizedDateTime(this);
                      if (typeof error === "string") return error;
                      if (new Date(this.value).getTime() <= Date.now()) return "Must be in the future.";
                    };
                  `}"
                />
              </div>

              <div>
                <button
                  class="button--create-invitation button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-person-plus-fill"></i>
                  Create Invitation
                </button>
                <button
                  class="button--send-invitation-emails button button--full-width-on-small-screen button--blue"
                  hidden
                >
                  <i class="bi bi-envelope-fill"></i>
                  Send Invitation Emails
                </button>
              </div>
            </form>

            $${invitations.length === 0
              ? html``
              : html`
                  $${invitations.map((invitation) => {
                    const action = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                    const isInvitationExpired = app.locals.helpers.isExpired(
                      invitation.expiresAt
                    );
                    const isUsed = invitation.usedAt !== null;

                    return html`
                      <div
                        key="invitation--${invitation.reference}"
                        css="${res.locals.css(css`
                          padding-top: var(--space--4);
                          border-top: var(--border-width--1) solid
                            var(--color--gray--medium--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--gray--medium--700);
                          }
                          display: flex;
                          gap: var(--space--2);
                        `)}"
                      >
                        <div>
                          $${invitation.email === null
                            ? html`
                                <span
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Invitation Link",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-link"></i>
                                </span>
                              `
                            : html`
                                <span
                                  onload="${javascript`
                                    (this.tooltip ??= tippy(this)).setProps({
                                      touch: false,
                                      content: "Invitation Email",
                                    });
                                  `}"
                                >
                                  <i class="bi bi-envelope"></i>
                                </span>
                              `}
                        </div>
                        <div
                          css="${res.locals.css(css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `)}"
                        >
                          $${invitation.email === null
                            ? html`
                                <div>
                                  <button
                                    class="button--see-invitation-link button button--tight button--tight--inline button--transparent strong"
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        touch: false,
                                        content: "See Invitation Link",
                                      });

                                      (this.dropdown ??= tippy(this)).setProps({
                                        trigger: "click",
                                        interactive: true,
                                        maxWidth: "none",
                                        content: ${(() => {
                                          const link = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
                                          return res.locals.html(
                                            html`
                                              <div
                                                css="${res.locals.css(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                $${isInvitationExpired
                                                  ? html`
                                                      <p
                                                        class="text--rose"
                                                        css="${res.locals
                                                          .css(css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                          justify-content: center;
                                                        `)}"
                                                      >
                                                        <i
                                                          class="bi bi-calendar-x-fill"
                                                        ></i>
                                                        Expired
                                                      </p>
                                                    `
                                                  : html``}
                                                <div
                                                  css="${res.locals.css(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    align-items: center;
                                                  `)}"
                                                >
                                                  <input
                                                    type="text"
                                                    readonly
                                                    value="${link}"
                                                    class="input--text"
                                                    css="${res.locals.css(css`
                                                      flex: 1;
                                                    `)}"
                                                    onload="${javascript`
                                                      this.onfocus = () => {
                                                        this.select();
                                                      };
                                                    `}"
                                                  />
                                                  <button
                                                    class="button button--tight button--transparent"
                                                    onload="${javascript`
                                                      (this.tooltip ??= tippy(this)).setProps({
                                                        touch: false,
                                                        content: "Copy Link",
                                                      });

                                                      this.onclick = async () => {
                                                        await navigator.clipboard.writeText(${JSON.stringify(
                                                          link
                                                        )});
                                                        const stickies = this.querySelector(".stickies");
                                                        const check = this.querySelector(".check");
                                                        stickies.hidden = true;
                                                        check.hidden = false;
                                                        await new Promise((resolve) => { window.setTimeout(resolve, 500); });
                                                        stickies.hidden = false;
                                                        check.hidden = true;
                                                      };
                                                    `}"
                                                  >
                                                    <span class="stickies">
                                                      <i
                                                        class="bi bi-stickies"
                                                      ></i>
                                                    </span>
                                                    <span
                                                      hidden
                                                      class="check text--green"
                                                    >
                                                      <i
                                                        class="bi bi-check-lg"
                                                      ></i>
                                                    </span>
                                                  </button>
                                                  <a
                                                    href="${link}"
                                                    class="button button--tight button--transparent"
                                                    onload="${javascript`
                                                      (this.tooltip ??= tippy(this)).setProps({
                                                        touch: false,
                                                        content: "See QR Code for Link",
                                                      });
                                                    `}"
                                                    ><i
                                                      class="bi bi-qr-code"
                                                    ></i
                                                  ></a>
                                                </div>
                                              </div>
                                            `
                                          );
                                        })()},
                                      });
                                    `}"
                                  >
                                    ${"*".repeat(
                                      6
                                    )}${invitation.reference.slice(6)}
                                    <i class="bi bi-chevron-down"></i>
                                  </button>
                                </div>
                              `
                            : html`
                                <div>
                                  <button
                                    class="button button--tight button--tight--inline button--transparent"
                                    css="${res.locals.css(css`
                                      text-align: left;
                                      display: flex;
                                      flex-direction: column;
                                      align-items: flex-start;
                                      gap: var(--space--0);
                                    `)}"
                                    onload="${javascript`
                                      (this.tooltip ??= tippy(this)).setProps({
                                        trigger: "click",
                                        interactive: true,
                                        content: ${res.locals.html(
                                          html`
                                            <div class="dropdown--menu">
                                              <form
                                                method="PATCH"
                                                action="${action}"
                                              >
                                                <input
                                                  type="hidden"
                                                  name="_csrf"
                                                  value="${req.csrfToken()}"
                                                />
                                                <input
                                                  type="hidden"
                                                  name="resend"
                                                  value="true"
                                                />
                                                <button
                                                  class="dropdown--menu--item button button--transparent"
                                                  $${isUsed
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not resend this invitation because it’s used.",
                                                          });
                                                        `}"
                                                      `
                                                    : isInvitationExpired
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not resend this invitation because it’s expired.",
                                                          });
                                                        `}"
                                                      `
                                                    : html``}
                                                >
                                                  <i class="bi bi-envelope"></i>
                                                  Resend Invitation Email
                                                </button>
                                              </form>
                                            </div>
                                          `
                                        )},
                                      });
                                    `}"
                                  >
                                    <div
                                      class="strong"
                                      css="${res.locals.css(css`
                                        display: flex;
                                        align-items: baseline;
                                        gap: var(--space--2);
                                      `)}"
                                    >
                                      ${invitation.name ?? invitation.email}
                                      <i class="bi bi-chevron-down"></i>
                                    </div>
                                    $${invitation.name !== null
                                      ? html`
                                          <div class="secondary">
                                            ${invitation.email}
                                          </div>
                                        `
                                      : html``}
                                  </button>
                                </div>
                              `}

                          <div
                            css="${res.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `)}"
                          >
                            <div
                              css="${res.locals.css(css`
                                width: var(--space--28);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              <button
                                class="button button--tight button--tight--inline button--transparent ${invitation.role ===
                                "staff"
                                  ? "text--sky"
                                  : ""}"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Update Role",
                                  });

                                  (this.dropdown ??= tippy(this)).setProps({
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.html(
                                      html`
                                        <div class="dropdown--menu">
                                          $${enrollmentRoles.map((role) =>
                                            role === invitation.role
                                              ? html``
                                              : html`
                                                  <form
                                                    key="role--${role}"
                                                    method="PATCH"
                                                    action="${action}"
                                                  >
                                                    <input
                                                      type="hidden"
                                                      name="_csrf"
                                                      value="${req.csrfToken()}"
                                                    />
                                                    <input
                                                      type="hidden"
                                                      name="role"
                                                      value="${role}"
                                                    />
                                                    <button
                                                      class="dropdown--menu--item button button--transparent"
                                                      $${isUsed
                                                        ? html`
                                                            type="button"
                                                            onload="${javascript`
                                                              (this.tooltip ??= tippy(this)).setProps({
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the role of this invitation because it’s used.",
                                                              });
                                                            `}"
                                                          `
                                                        : isInvitationExpired
                                                        ? html`
                                                            type="button"
                                                            onload="${javascript`
                                                              (this.tooltip ??= tippy(this)).setProps({
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the role of this invitation because it’s expired.",
                                                              });
                                                            `}"
                                                          `
                                                        : html``}
                                                    >
                                                      $${app.locals.partials
                                                        .enrollmentRoleIcon[
                                                        role
                                                      ].regular}
                                                      ${lodash.capitalize(role)}
                                                    </button>
                                                  </form>
                                                `
                                          )}
                                        </div>
                                      `
                                    )},
                                  });
                                `}"
                              >
                                $${app.locals.partials.enrollmentRoleIcon[
                                  invitation.role
                                ].regular}
                                ${lodash.capitalize(invitation.role)}
                                <i class="bi bi-chevron-down"></i>
                              </button>
                            </div>

                            <div
                              css="${res.locals.css(css`
                                width: var(--space--40);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              $${(() => {
                                const updateExpirationForm = html`
                                  <form
                                    method="PATCH"
                                    action="${action}"
                                    novalidate
                                    class="dropdown--menu"
                                    css="${res.locals.css(css`
                                      gap: var(--space--2);
                                    `)}"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <div class="dropdown--menu--item">
                                      <input
                                        type="text"
                                        name="expiresAt"
                                        value="${new Date(
                                          invitation.expiresAt ?? new Date()
                                        ).toISOString()}"
                                        required
                                        autocomplete="off"
                                        class="input--text"
                                        onload="${javascript`
                                          this.value = this.defaultValue = leafac.localizeDateTime(this.defaultValue);

                                          this.onvalidate = (event) => {
                                            const error = leafac.validateLocalizedDateTime(this);
                                            if (typeof error === "string") return error;
                                            if (new Date(this.value).getTime() <= Date.now()) return "Must be in the future.";
                                          };
                                        `}"
                                      />
                                    </div>
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                    >
                                      <i class="bi bi-pencil"></i>
                                      Update Expiration Date
                                    </button>
                                  </form>
                                `;
                                const removeExpirationForm = html`
                                  <form
                                    method="PATCH"
                                    action="${action}"
                                    class="dropdown--menu"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <input
                                      type="hidden"
                                      name="removeExpiration"
                                      value="true"
                                    />
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                    >
                                      <i class="bi bi-calendar-minus"></i>
                                      Remove Expiration
                                    </button>
                                  </form>
                                `;
                                const expireForm = html`
                                  <form
                                    method="PATCH"
                                    action="${action}"
                                    class="dropdown--menu"
                                  >
                                    <input
                                      type="hidden"
                                      name="_csrf"
                                      value="${req.csrfToken()}"
                                    />
                                    <input
                                      type="hidden"
                                      name="expire"
                                      value="true"
                                    />
                                    <button
                                      class="dropdown--menu--item button button--transparent"
                                    >
                                      <i class="bi bi-calendar-x"></i>
                                      Expire Invitation
                                    </button>
                                  </form>
                                `;

                                return isUsed
                                  ? html`
                                      <div>
                                        <div
                                          class="button button--tight button--tight--inline text--green"
                                          css="${res.locals.css(css`
                                            cursor: default;
                                          `)}"
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              interactive: true,
                                              content: ${res.locals.html(
                                                html`
                                                  <div>
                                                    Used
                                                    <time
                                                      datetime="${new Date(
                                                        invitation.usedAt!
                                                      ).toISOString()}"
                                                      onload="${javascript`
                                                      leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                                    `}"
                                                    ></time>
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-check-lg"></i>
                                          Used
                                        </div>
                                      </div>
                                    `
                                  : isInvitationExpired
                                  ? html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--rose"
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                                                                    
                                            (this.dropdown ??= tippy(this)).setProps({
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.html(
                                                html`
                                                  <div
                                                    css="${res.locals.css(css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-x"
                                                      ></i>
                                                      <span>
                                                        Expired
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt!
                                                          ).toISOString()}"
                                                          onload="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                                          `}"
                                                        ></time>
                                                      </span>
                                                    </h3>
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${removeExpirationForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i class="bi bi-calendar-x-fill"></i>
                                          Expired
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `
                                  : invitation.expiresAt === null
                                  ? html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--blue"
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                                                                    
                                            (this.dropdown ??= tippy(this)).setProps({
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.html(
                                                html`
                                                  <div
                                                    css="${res.locals.css(css`
                                                      padding-top: var(
                                                        --space--2
                                                      );
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${expireForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i
                                            class="bi bi-calendar-minus-fill"
                                          ></i>
                                          Doesn’t Expire
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `
                                  : html`
                                      <div>
                                        <button
                                          class="button button--tight button--tight--inline button--transparent text--amber"
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            
                                            (this.dropdown ??= tippy(this)).setProps({
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.html(
                                                html`
                                                  <div
                                                    css="${res.locals.css(css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `)}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-plus"
                                                      ></i>
                                                      <span>
                                                        Expires
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt
                                                          ).toISOString()}"
                                                          onload="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                                          `}"
                                                        ></time>
                                                      </span>
                                                    </h3>
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${updateExpirationForm}
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    $${removeExpirationForm}
                                                    $${expireForm}
                                                  </div>
                                                `
                                              )},
                                            });
                                          `}"
                                        >
                                          <i
                                            class="bi bi-calendar-plus-fill"
                                          ></i>
                                          Expires
                                          <i class="bi bi-chevron-down"></i>
                                        </button>
                                      </div>
                                    `;
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  })}
                `}
          `,
        })
      );
    }
  );

  app.post<
    { courseReference: string },
    HTML,
    {
      type?: "link" | "email";
      role?: EnrollmentRole;
      expiresAt?: string;
      emails?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...app.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !enrollmentRoles.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !app.locals.helpers.isDate(req.body.expiresAt) ||
            app.locals.helpers.isExpired(req.body.expiresAt))) ||
        typeof req.body.type !== "string" ||
        !["link", "email"].includes(req.body.type)
      )
        return next("validation");

      switch (req.body.type) {
        case "link":
          const invitation = app.locals.database.get<{ reference: string }>(
            sql`
              INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "role")
              VALUES (
                ${new Date().toISOString()},
                ${req.body.expiresAt},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${req.body.role}
              )
              RETURNING *
          `
          )!;

          app.locals.helpers.Flash.set({
            req,
            res,
            theme: "green",
            content: html`
              Invitation link created successfully.
              <button
                class="link"
                onload="${javascript`
                  this.onclick = () => {
                    tippy.hideAll();
                    const button = document.querySelector('[key="invitation--${invitation.reference}"] .button--see-invitation-link');
                    button.click();
                    button.tooltip.hide();
                  };
                `}"
              >
                See invitation link</button
              >.
            `,
          });
          break;

        case "email":
          if (typeof req.body.emails !== "string") return next("validation");
          const emails: { email: string; name: string | null }[] = [];
          for (let email of req.body.emails.split(/[,\n]/)) {
            email = email.trim();
            let name: string | null = null;
            const match = email.match(/^(?<name>.*)<(?<email>.*)>$/);
            if (match !== null) {
              email = match.groups!.email.trim();
              name = match.groups!.name.trim();
              if (name.startsWith('"') && name.endsWith('"'))
                name = name.slice(1, -1);
              if (name === "") name = null;
            }
            if (email === "") continue;
            emails.push({ email, name });
          }
          if (
            emails.length === 0 ||
            emails.some(
              ({ email }) =>
                email.match(app.locals.helpers.emailRegExp) === null
            )
          )
            return next("validation");

          for (const { email, name } of emails) {
            if (
              app.locals.database.get<{}>(
                sql`
                  SELECT TRUE
                  FROM "enrollments"
                  JOIN "users" ON "enrollments"."user" = "users"."id" AND
                                  "users"."email" = ${email}
                  WHERE "enrollments"."course" = ${res.locals.course.id}
                `
              ) !== undefined
            )
              continue;

            const existingUnusedInvitation = app.locals.database.get<{
              id: number;
              name: string | null;
            }>(
              sql`
                SELECT "id", "name"
                FROM "invitations"
                WHERE "course" = ${res.locals.course.id} AND
                      "email" = ${email} AND
                      "usedAt" IS NULL
              `
            );
            if (existingUnusedInvitation !== undefined) {
              app.locals.database.run(
                sql`
                  UPDATE "invitations"
                  SET "expiresAt" = ${req.body.expiresAt},
                      "name" = ${name ?? existingUnusedInvitation.name},
                      "role" = ${req.body.role}
                  WHERE "id" = ${existingUnusedInvitation.id}
                `
              );
              continue;
            }

            const invitation = app.locals.database.get<{
              id: number;
              expiresAt: string | null;
              usedAt: string | null;
              reference: string;
              email: string;
              name: string | null;
              role: EnrollmentRole;
            }>(
              sql`
                INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "email", "name", "role")
                VALUES (
                  ${new Date().toISOString()},
                  ${req.body.expiresAt ?? null},
                  ${res.locals.course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${email},
                  ${name},
                  ${req.body.role}
                )
                RETURNING *
              `
            )!;

            app.locals.mailers.invitation({
              req,
              res,
              invitation: {
                ...invitation,
                course: res.locals.course,
              },
            });
          }

          app.locals.helpers.Flash.set({
            req,
            res,
            theme: "green",
            content: html`Invitation emails sent successfully.`,
          });
          break;
      }

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      role?: EnrollmentRole;
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    MayManageInvitationMiddlewareLocals
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    ...app.locals.middlewares.mayManageInvitation,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("validation");

      if (req.body.resend === "true") {
        if (
          app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          res.locals.invitation.email === null
        )
          return next("validation");
        app.locals.mailers.invitation({
          req,
          res,
          invitation: res.locals.invitation,
        });
        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation email resent successfully.`,
        });
      }

      if (req.body.role !== undefined) {
        if (
          app.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          !enrollmentRoles.includes(req.body.role)
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation role updated successfully.`,
        });
      }

      if (req.body.expiresAt !== undefined) {
        if (
          typeof req.body.expiresAt !== "string" ||
          !app.locals.helpers.isDate(req.body.expiresAt) ||
          app.locals.helpers.isExpired(req.body.expiresAt)
        )
          return next("validation");

        app.locals.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expiration updated successfully.`,
        });
      }

      if (req.body.removeExpiration === "true") {
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expiration removed successfully.`,
        });
      }

      if (req.body.expire === "true") {
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expired successfully.`,
        });
      }

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollments",
    ...app.locals.middlewares.isCourseStaff,
    (req, res) => {
      const enrollments = app.locals.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
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
                   "users"."reference" AS "userReference",
                   "users"."email" AS "userEmail",
                   "users"."name" AS "userName",
                   "users"."avatar" AS "userAvatar",
                   "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
                   "users"."biographySource" AS "userBiographySource",
                   "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
                   "enrollments"."reference",
                   "enrollments"."role"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id"
            WHERE "enrollments"."course" = ${res.locals.course.id}
            ORDER BY "enrollments"."role" ASC, "users"."name" ASC
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
          },
          reference: enrollment.reference,
          role: enrollment.role,
        }));

      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Enrollments · Course Settings · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-people"></i>
              Enrollments
            </h2>

            <label
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--2);
                align-items: baseline;
              `)}"
            >
              <i class="bi bi-funnel"></i>
              <input
                type="text"
                class="input--text"
                placeholder="Filter…"
                onload="${javascript`
                  this.isModified = false;

                  this.oninput = () => {
                    const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                    for (const enrollment of document.querySelectorAll(".enrollment")) {
                      let enrollmentHidden = filterPhrases.length > 0;
                      for (const filterablePhrasesElement of enrollment.querySelectorAll("[data-filterable-phrases]")) {
                        const filterablePhrases = JSON.parse(filterablePhrasesElement.dataset.filterablePhrases);
                        const filterablePhrasesElementChildren = [];
                        for (const filterablePhrase of filterablePhrases) {
                          let filterablePhraseElement;
                          if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                            filterablePhraseElement = document.createElement("mark");
                            filterablePhraseElement.classList.add("mark");
                            enrollmentHidden = false;
                          } else
                            filterablePhraseElement = document.createElement("span");
                          filterablePhraseElement.textContent = filterablePhrase;
                          filterablePhrasesElementChildren.push(filterablePhraseElement);
                        }
                        filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                      }
                      enrollment.hidden = enrollmentHidden;
                    }
                  };
                `}"
              />
            </label>

            $${enrollments.map((enrollment) => {
              const action = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
              const isSelf = enrollment.id === res.locals.enrollment.id;
              const isOnlyStaff =
                isSelf &&
                enrollments.filter((enrollment) => enrollment.role === "staff")
                  .length === 1;

              return html`
                <div
                  key="enrollment--${enrollment.reference}"
                  class="enrollment"
                  css="${res.locals.css(css`
                    padding-top: var(--space--2);
                    border-top: var(--border-width--1) solid
                      var(--color--gray--medium--200);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--gray--medium--700);
                    }
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  <div>
                    $${app.locals.partials.user({
                      req,
                      res,
                      enrollment,
                      name: false,
                    })}
                  </div>

                  <div
                    css="${res.locals.css(css`
                      flex: 1;
                      margin-top: var(--space--0-5);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      min-width: var(--space--0);
                    `)}"
                  >
                    <div>
                      <div
                        data-filterable-phrases="${JSON.stringify(
                          app.locals.helpers.splitFilterablePhrases(
                            enrollment.user.name
                          )
                        )}"
                        class="strong"
                      >
                        ${enrollment.user.name}
                      </div>
                      <div class="secondary">
                        <span
                          data-filterable-phrases="${JSON.stringify(
                            app.locals.helpers.splitFilterablePhrases(
                              enrollment.user.email
                            )
                          )}"
                          css="${res.locals.css(css`
                            margin-right: var(--space--2);
                          `)}"
                        >
                          ${enrollment.user.email}
                        </span>
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          css="${res.locals.css(css`
                            font-size: var(--font-size--xs);
                            line-height: var(--line-height--xs);
                            display: inline-flex;
                          `)}"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Copy Email",
                            });
                            (this.copied ??= tippy(this)).setProps({
                              theme: "green",
                              trigger: "manual",
                              content: "Copied",
                            });

                            this.onclick = async () => {
                              await navigator.clipboard.writeText(${JSON.stringify(
                                enrollment.user.email
                              )});
                              this.copied.show();
                              await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                              this.copied.hide();
                            };
                          `}"
                        >
                          <i class="bi bi-stickies"></i>
                        </button>
                      </div>
                      <div
                        class="secondary"
                        css="${res.locals.css(css`
                          font-size: var(--font-size--xs);
                        `)}"
                      >
                        <span>
                          Last seen online
                          <time
                            datetime="${new Date(
                              enrollment.user.lastSeenOnlineAt
                            ).toISOString()}"
                            onload="${javascript`
                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                            `}"
                          ></time>
                        </span>
                      </div>
                    </div>

                    <div
                      css="${res.locals.css(css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div
                        css="${res.locals.css(css`
                          width: var(--space--28);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent ${enrollment.role ===
                          "staff"
                            ? "text--sky"
                            : ""}"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Update Role",
                            });
                            
                            (this.dropdown ??= tippy(this)).setProps({
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.html(
                                html`
                                  <div class="dropdown--menu">
                                    $${enrollmentRoles.map((role) =>
                                      role === enrollment.role
                                        ? html``
                                        : html`
                                            <form
                                              key="role--${role}"
                                              method="PATCH"
                                              action="${action}"
                                            >
                                              <input
                                                type="hidden"
                                                name="_csrf"
                                                value="${req.csrfToken()}"
                                              />
                                              <input
                                                type="hidden"
                                                name="role"
                                                value="${role}"
                                              />
                                              <div>
                                                <button
                                                  class="dropdown--menu--item button button--transparent"
                                                  $${isOnlyStaff
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.tooltip ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not update your own role because you’re the only staff member.",
                                                          });
                                                        `}"
                                                      `
                                                    : isSelf
                                                    ? html`
                                                        type="button"
                                                        onload="${javascript`
                                                          (this.dropdown ??= tippy(this)).setProps({
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                            appendTo: document.querySelector("body"),
                                                            content: ${res.locals.html(
                                                              html`
                                                                <form
                                                                  key="role--${role}"
                                                                  method="PATCH"
                                                                  action="${action}"
                                                                  css="${res
                                                                    .locals
                                                                    .css(css`
                                                                    padding: var(
                                                                      --space--2
                                                                    );
                                                                    display: flex;
                                                                    flex-direction: column;
                                                                    gap: var(
                                                                      --space--4
                                                                    );
                                                                  `)}"
                                                                >
                                                                  <input
                                                                    type="hidden"
                                                                    name="_csrf"
                                                                    value="${req.csrfToken()}"
                                                                  />
                                                                  <input
                                                                    type="hidden"
                                                                    name="role"
                                                                    value="${role}"
                                                                  />
                                                                  <p>
                                                                    Are you sure
                                                                    you want to
                                                                    update your
                                                                    own role to
                                                                    ${role}?
                                                                  </p>
                                                                  <p>
                                                                    <strong
                                                                      css="${res
                                                                        .locals
                                                                        .css(css`
                                                                        font-weight: var(
                                                                          --font-weight--bold
                                                                        );
                                                                      `)}"
                                                                    >
                                                                      You may
                                                                      not undo
                                                                      this
                                                                      action!
                                                                    </strong>
                                                                  </p>
                                                                  <button
                                                                    class="button button--rose"
                                                                  >
                                                                    <i
                                                                      class="bi bi-pencil-fill"
                                                                    ></i>
                                                                    Update My
                                                                    Own Role to
                                                                    ${lodash.capitalize(
                                                                      role
                                                                    )}
                                                                  </button>
                                                                </form>
                                                              `
                                                            )},
                                                          });
                                                        `}"
                                                      `
                                                    : html``}
                                                >
                                                  $${app.locals.partials
                                                    .enrollmentRoleIcon[role]
                                                    .regular}
                                                  ${lodash.capitalize(role)}
                                                </button>
                                              </div>
                                            </form>
                                          `
                                    )}
                                  </div>
                                `
                              )},
                            });
                          `}"
                        >
                          $${app.locals.partials.enrollmentRoleIcon[
                            enrollment.role
                          ].regular}
                          ${lodash.capitalize(enrollment.role)}
                          <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>

                      <div
                        css="${res.locals.css(css`
                          width: var(--space--8);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              theme: "rose",
                              touch: false,
                              content: "Remove from the Course",
                            });

                            ${
                              isOnlyStaff
                                ? javascript`
                                    (this.dropdown ??= tippy(this)).setProps({
                                      theme: "rose",
                                      trigger: "click",
                                      content: "You may not remove yourself from the course because you’re the only staff member.",
                                    });
                                  `
                                : javascript`
                                    (this.dropdown ??= tippy(this)).setProps({
                                      theme: "rose",
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.html(
                                        html`
                                          <form
                                            method="DELETE"
                                            action="${action}"
                                            css="${res.locals.css(css`
                                              padding: var(--space--2);
                                              display: flex;
                                              flex-direction: column;
                                              gap: var(--space--4);
                                            `)}"
                                          >
                                            <input
                                              type="hidden"
                                              name="_csrf"
                                              value="${req.csrfToken()}"
                                            />
                                            <p>
                                              Are you sure you want to remove
                                              ${isSelf
                                                ? "yourself"
                                                : "this person"}
                                              from the course?
                                            </p>
                                            <p>
                                              <strong
                                                css="${res.locals.css(css`
                                                  font-weight: var(
                                                    --font-weight--bold
                                                  );
                                                `)}"
                                              >
                                                You may not undo this action!
                                              </strong>
                                            </p>
                                            <button class="button button--rose">
                                              <i
                                                class="bi bi-person-dash-fill"
                                              ></i>
                                              Remove ${isSelf ? "Myself" : ""}
                                              from the Course
                                            </button>
                                          </form>
                                        `
                                      )},
                                    });
                                  `
                            }
                          `}"
                        >
                          <i class="bi bi-person-dash"></i>
                        </button>
                      </div>
                    </div>

                    $${enrollment.user.biographyPreprocessed !== null
                      ? html`
                          <details class="details">
                            <summary>Biography</summary>
                            $${app.locals.partials.content({
                              req,
                              res,
                              type: "preprocessed",
                              content: enrollment.user.biographyPreprocessed,
                            }).processed}
                          </details>
                        `
                      : html``}
                  </div>
                </div>
              `;
            })}
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string; enrollmentReference: string },
    HTML,
    { role?: EnrollmentRole },
    {},
    MayManageEnrollmentMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!enrollmentRoles.includes(req.body.role)) return next("validation");
        app.locals.database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );

        app.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Enrollment updated successfully.`,
        });
      }

      res.redirect(
        303,
        res.locals.managedEnrollment.isSelf
          ? `${app.locals.options.baseURL}/courses/${res.locals.course.reference}`
          : `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.delete<
    { courseReference: string; enrollmentReference: string },
    HTML,
    {},
    {},
    MayManageEnrollmentMiddlewareLocals
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...app.locals.middlewares.mayManageEnrollment,
    (req, res) => {
      app.locals.database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`
          $${res.locals.managedEnrollment.isSelf
            ? html`You removed yourself`
            : html`Person removed`}
          from the course successfully.
        `,
      });

      res.redirect(
        303,
        res.locals.managedEnrollment.isSelf
          ? `${app.locals.options.baseURL}/`
          : `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
      );

      app.locals.helpers.liveUpdatesDispatch({ req, res });
    }
  );

  app.get<
    { courseReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.send(
        app.locals.layouts.courseSettings({
          req,
          res,
          head: html`
            <title>
              Your Enrollment · Course Settings · ${res.locals.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-person"></i>
              Your Enrollment
            </h2>

            <form
              method="PATCH"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/your-enrollment"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <div class="label--text">
                  Accent Color
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        trigger: "click",
                        content: "A bar with the accent color appears at the top of pages related to this course to help you differentiate between courses.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <div
                  css="${res.locals.css(css`
                    margin-top: var(--space--1);
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  $${enrollmentAccentColors.map(
                    (accentColor) => html`
                      <input
                        type="radio"
                        name="accentColor"
                        value="${accentColor}"
                        required
                        $${accentColor === res.locals.enrollment.accentColor
                          ? html`checked`
                          : html``}
                        class="input--radio"
                        css="${res.locals.css(css`
                          background-color: var(--color--${accentColor}--500);
                          &:hover,
                          &:focus-within {
                            background-color: var(--color--${accentColor}--400);
                          }
                          &:active {
                            background-color: var(--color--${accentColor}--600);
                          }
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--${accentColor}--600);
                            &:hover,
                            &:focus-within {
                              background-color: var(
                                --color--${accentColor}--500
                              );
                            }
                            &:active {
                              background-color: var(
                                --color--${accentColor}--700
                              );
                            }
                          }
                        `)}"
                      />
                    `
                  )}
                </div>
              </div>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Your Enrollment
                </button>
              </div>
            </form>
          `,
        })
      );
    }
  );

  app.patch<
    { courseReference: string },
    HTML,
    { accentColor?: EnrollmentAccentColor },
    {},
    IsEnrolledInCourseMiddlewareLocals
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...app.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.accentColor !== "string" ||
        !enrollmentAccentColors.includes(req.body.accentColor)
      )
        return next("validation");

      app.locals.database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
      );

      app.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Enrollment updated successfully.`,
      });

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/your-enrollment`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    IsEnrolledInCourseMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isEnrolledInCourse,
    ...app.locals.middlewares.isInvitationUsable,
    asyncHandler(async (req, res) => {
      if (
        typeof req.query.redirect === "string" &&
        req.query.redirect.trim() !== "" &&
        req.query.redirect.startsWith("/")
      )
        res.redirect(
          303,
          `${app.locals.options.baseURL}/courses/${res.locals.course.reference}${req.query.redirect}`
        );
      const link = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`;
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>Invitation · ${res.locals.course.name} · Courselore</title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${app.locals.partials.course({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <hr class="separator" />
            <p class="strong">You’re already enrolled.</p>
            <p>
              You may share this invitation with other people by asking them to
              point their phone camera at the following QR Code:
            </p>

            <div>
              <div
                css="${res.locals.css(css`
                  display: flex;
                  gap: var(--space--2);
                  align-items: baseline;
                `)}"
              >
                <input
                  type="text"
                  readonly
                  value="${link}"
                  class="input--text"
                  css="${res.locals.css(css`
                    flex: 1;
                  `)}"
                  onload="${javascript`
                    this.onfocus = () => {
                      this.select();
                    };
                  `}"
                />
                <div>
                  <button
                    class="button button--tight button--transparent"
                    onload="${javascript`
                      (this.tooltip ??= tippy(this)).setProps({
                        touch: false,
                        content: "Copy Link",
                      });
                            
                      this.onclick = async () => {
                        await navigator.clipboard.writeText(${JSON.stringify(
                          link
                        )});
                        const stickies = this.querySelector(".stickies");
                        const check = this.querySelector(".check");
                        stickies.hidden = true;
                        check.hidden = false;
                        await new Promise((resolve) => { window.setTimeout(resolve, 500); });
                        stickies.hidden = false;
                        check.hidden = true;
                      };
                    `}"
                  >
                    <span class="stickies">
                      <i class="bi bi-stickies"></i>
                    </span>
                    <span hidden class="check text--green">
                      <i class="bi bi-check-lg"></i>
                    </span>
                  </button>
                </div>
              </div>

              $${(
                await QRCode.toString(
                  `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`,
                  { type: "svg" }
                )
              )
                .replace("#000000", "currentColor")
                .replace("#ffffff", "transparent")}
            </div>

            <a
              href="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}"
              class="button button--blue"
            >
              Go to ${res.locals.course.name}
              <i class="bi bi-chevron-right"></i>
            </a>
          `,
        })
      );
    })
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${app.locals.partials.course({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <form
              method="POST"
              action="${app.locals.options.baseURL}/courses/${res.locals
                .invitation.course.reference}/invitations/${res.locals
                .invitation.reference}${qs.stringify(
                {
                  redirect: req.query.redirect,
                },
                {
                  addQueryPrefix: true,
                }
              )}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <button
                class="button button--blue"
                css="${res.locals.css(css`
                  width: 100%;
                `)}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Enroll as ${lodash.capitalize(res.locals.invitation.role)}
              </button>
            </form>
          `,
        })
      );
    }
  );

  app.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      app.locals.database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${res.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitation.role},
            ${app.locals.helpers.defaultAccentColor({ req, res })}
          )
        `
      );
      if (res.locals.invitation.email !== null)
        app.locals.database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        303,
        `${app.locals.options.baseURL}/courses/${
          res.locals.invitation.course.reference
        }${
          typeof req.query.redirect === "string" &&
          req.query.redirect.trim() !== "" &&
          req.query.redirect.startsWith("/")
            ? req.query.redirect
            : "/"
        }`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsSignedOutMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedOut,
    ...app.locals.middlewares.isInvitationUsable,
    (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html`
            <title>
              Invitation · ${res.locals.invitation.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${app.locals.partials.course({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <div
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--4);
                & > * {
                  flex: 1;
                }
              `)}"
            >
              <a
                href="${app.locals.options.baseURL}/sign-up${qs.stringify(
                  {
                    redirect: req.originalUrl,
                    invitation: {
                      email: res.locals.invitation.email ?? undefined,
                      name: res.locals.invitation.name ?? undefined,
                    },
                  },
                  { addQueryPrefix: true }
                )}"
                class="button button--blue"
              >
                <i class="bi bi-person-plus-fill"></i>
                Sign up
              </a>
              <a
                href="${app.locals.options.baseURL}/sign-in${qs.stringify(
                  {
                    redirect: req.originalUrl,
                    invitation: {
                      email: res.locals.invitation.email ?? undefined,
                      name: res.locals.invitation.name ?? undefined,
                    },
                  },
                  { addQueryPrefix: true }
                )}"
                class="button button--transparent"
              >
                <i class="bi bi-box-arrow-in-right"></i>
                Sign in
              </a>
            </div>
          `,
        })
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    BaseMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    (req, res) => {
      res.send(
        app.locals.layouts.box({
          req,
          res,
          head: html` <title>Invitation · Courselore</title> `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>

            <p>
              This invitation is invalid or expired. Please contact your course
              staff.
            </p>
          `,
        })
      );
    }
  );
};
