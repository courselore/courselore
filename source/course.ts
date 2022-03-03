import express from "express";
import { HTML, html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import lodash from "lodash";
import {
  Courselore,
  BaseMiddlewareLocals,
  IsSignedInMiddlewareLocals,
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

export type EnrollmentRoleIconPartial = {
  [role in EnrollmentRole]: {
    regular: HTML;
    fill: HTML;
  };
};

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

export default (app: Courselore): void => {
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

  app.locals.partials.course = ({
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
                  $${app.locals.partials.enrollmentRoleIcon[enrollment.role]
                    .regular} ${lodash.capitalize(enrollment.role)}
                </div>
              `}
        </div>
      </div>
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
                  class="${res.locals.localCSS(css`
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
                      oninteractive="${javascript`
                        tippy(this, {
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
                  class="${res.locals.localCSS(css`
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

                  <div class="menu-box">
                    $${res.locals.enrollments.map(
                      (enrollment) =>
                        html`
                          <a
                            href="${app.locals.options
                              .baseURL}/courses/${enrollment.course.reference}"
                            class="menu-box--item button button--tight button--transparent"
                          >
                            $${app.locals.partials.course({
                              req,
                              res,
                              course: enrollment.course,
                              enrollment,
                            })}
                          </a>
                        `
                    )}
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

            $${baseURL === "https://courselore.org"
              ? html`
                  <div
                    class="${res.locals.localCSS(css`
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
                      class="${res.locals.localCSS(css`
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
              class="${res.locals.localCSS(css`
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
                class="${res.locals.localCSS(css`
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
                    oninteractive="${javascript`
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
                    oninteractive="${javascript`
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

    const course = database.get<{
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
    database.run(
      sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${defaultAccentColor(res.locals.enrollments)}
          )
        `
    );
    res.redirect(`${app.locals.options.baseURL}/courses/${course.reference}`);
  });

  const defaultAccentColor = (
    enrollments: IsSignedInMiddlewareLocals["enrollments"]
  ): EnrollmentAccentColor => {
    const accentColorsInUse = new Set<EnrollmentAccentColor>(
      enrollments.map((enrollment) => enrollment.accentColor)
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

  interface IsEnrolledInCourseMiddlewareLocals
    extends IsSignedInMiddlewareLocals {
    enrollment: IsSignedInMiddlewareLocals["enrollments"][number];
    course: IsSignedInMiddlewareLocals["enrollments"][number]["course"];
    conversationsCount: number;
    conversationTypes: ConversationType[];
    tags: {
      id: number;
      reference: string;
      name: string;
      staffOnlyAt: string | null;
    }[];
  }
  const isEnrolledInCourseMiddleware: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals
  >[] = [
    ...app.locals.middlewares.isSignedIn,
    (req, res, next) => {
      const enrollment = res.locals.enrollments.find(
        (enrollment) =>
          enrollment.course.reference === req.params.courseReference
      );
      if (enrollment === undefined) return next("route");
      res.locals.enrollment = enrollment;
      res.locals.course = enrollment.course;

      res.locals.conversationsCount = database.get<{
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

      res.locals.conversationTypes = conversationTypes.filter(
        (conversationType) =>
          !(
            conversationType === "announcement" &&
            res.locals.enrollment.role !== "staff"
          )
      );

      res.locals.tags = database.all<{
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

      next();
    },
  ];

  interface IsCourseStaffMiddlewareLocals
    extends IsEnrolledInCourseMiddlewareLocals {}
  const isCourseStaffMiddleware: express.RequestHandler<
    { courseReference: string },
    any,
    {},
    {},
    IsCourseStaffMiddlewareLocals
  >[] = [
    ...isEnrolledInCourseMiddleware,
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
    IsEnrolledInCourseMiddlewareLocals & EventSourceMiddlewareLocals
  >(
    "/courses/:courseReference",
    ...isEnrolledInCourseMiddleware,
    ...eventSourceMiddleware,
    (req, res) => {
      if (res.locals.conversationsCount === 0)
        return res.send(
          app.locals.layouts.main({
            req,
            res,
            head: html`<title>${res.locals.course.name} · Courselore</title>`,
            body: html`
              <div
                class="${res.locals.localCSS(css`
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
                    <i class="bi bi-chat-left-text"></i>
                    Start the First Conversation
                  </a>
                </div>
              </div>
            `,
          })
        );

      res.send(
        conversationLayout({
          req,
          res,
          head: html`<title>${res.locals.course.name} · Courselore</title>`,
          onlyConversationLayoutSidebarOnSmallScreen: true,
          body: html`<p class="secondary">No conversation selected.</p>`,
        })
      );
    }
  );

  interface InvitationExistsMiddlewareLocals extends BaseMiddlewareLocals {
    invitation: {
      id: number;
      expiresAt: string | null;
      usedAt: string | null;
      course: {
        id: number;
        reference: string;
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
  const invitationExistsMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    InvitationExistsMiddlewareLocals
  >[] = [
    (req, res, next) => {
      const invitation = database.get<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        courseId: number;
        courseReference: string;
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

  interface MayManageInvitationMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals,
      InvitationExistsMiddlewareLocals {}
  const mayManageInvitationMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    MayManageInvitationMiddlewareLocals
  >[] = [...isCourseStaffMiddleware, ...invitationExistsMiddleware];

  interface IsInvitationUsableMiddlewareLocals
    extends InvitationExistsMiddlewareLocals,
      Omit<Partial<IsSignedInMiddlewareLocals>, keyof BaseMiddlewareLocals> {}
  const isInvitationUsableMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    IsInvitationUsableMiddlewareLocals
  >[] = [
    ...invitationExistsMiddleware,
    (req, res, next) => {
      if (
        res.locals.invitation.usedAt !== null ||
        isExpired(res.locals.invitation.expiresAt) ||
        (res.locals.invitation.email !== null &&
          res.locals.user !== undefined &&
          res.locals.invitation.email.toLowerCase() !==
            res.locals.user.email.toLowerCase())
      )
        return next("route");
      next();
    },
  ];

  const sendInvitationEmail = ({
    req,
    res,
    invitation,
  }: {
    req: express.Request<{}, any, {}, {}, BaseMiddlewareLocals>;
    res: express.Response<any, BaseMiddlewareLocals>;
    invitation: InvitationExistsMiddlewareLocals["invitation"];
  }): void => {
    const link = `${app.locals.options.baseURL}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    database.run(
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
    sendEmailWorker();
  };

  interface MayManageEnrollmentMiddlewareLocals
    extends IsCourseStaffMiddlewareLocals {
    managedEnrollment: {
      id: number;
      reference: string;
      role: EnrollmentRole;
      isSelf: boolean;
    };
  }
  const mayManageEnrollmentMiddleware: express.RequestHandler<
    { courseReference: string; enrollmentReference: string },
    any,
    {},
    {},
    MayManageEnrollmentMiddlewareLocals
  >[] = [
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      const managedEnrollment = database.get<{
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
        database.get<{ count: number }>(
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

  const courseSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<
      {},
      any,
      {},
      {},
      IsEnrolledInCourseMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    res: express.Response<
      any,
      IsEnrolledInCourseMiddlewareLocals & Partial<EventSourceMiddlewareLocals>
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    settingsLayout({
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
                <i class="bi bi-tags"></i>
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
                <i class="bi bi-person-plus"></i>
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
                <i class="bi bi-people"></i>
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
                <i class="bi bi-person"></i>
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
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      res.redirect(
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
    ...isCourseStaffMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
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
              method="POST"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/course-information?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
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
                class="${res.locals.localCSS(css`
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
                  <i class="bi bi-pencil"></i>
                  Update Course Information
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
    {
      name?: string;
      year?: string;
      term?: string;
      institution?: string;
      code?: string;
    },
    {},
    IsCourseStaffMiddlewareLocals
  >(
    "/courses/:courseReference/settings/course-information",
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.name !== "string" ||
        req.body.name.trim() === "" ||
        !["string", "undefined"].includes(typeof req.body.year) ||
        !["string", "undefined"].includes(typeof req.body.term) ||
        !["string", "undefined"].includes(typeof req.body.institution) ||
        !["string", "undefined"].includes(typeof req.body.code)
      )
        return next("validation");

      database.run(
        sql`
          UPDATE "courses"
          SET "name" = ${req.body.name},
              "year" = ${
                typeof req.body.year === "string" && req.body.year.trim() !== ""
                  ? req.body.year
                  : null
              },
              "term" = ${
                typeof req.body.term === "string" && req.body.term.trim() !== ""
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
                typeof req.body.code === "string" && req.body.code.trim() !== ""
                  ? req.body.code
                  : null
              }
          WHERE "id" = ${res.locals.course.id}
        `
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            Course information updated successfully.
          </div>
        `,
      });

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/course-information`
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
    "/courses/:courseReference/settings/tags",
    ...isCourseStaffMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
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
                    class="${res.locals.localCSS(css`
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
              method="POST"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/tags?_method=PUT"
              novalidate
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div
                class="${res.locals.localCSS(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);
                `)}"
              >
                <div
                  class="tags ${res.locals.localCSS(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--4);
                  `)}"
                >
                  $${res.locals.tags.map(
                    (tag, index) => html`
                      <div
                        class="tag ${res.locals.localCSS(css`
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
                          oninteractive="${javascript`
                            this.isModified = true;
                          `}"
                        />
                        <div class="tag--icon text--teal">
                          <i class="bi bi-tag-fill"></i>
                        </div>
                        <div
                          class="${res.locals.localCSS(css`
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
                            class="${res.locals.localCSS(css`
                              display: flex;
                              flex-wrap: wrap;
                              column-gap: var(--space--4);
                              row-gap: var(--space--2);
                            `)}"
                          >
                            <div
                              class="${res.locals.localCSS(css`
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
                                  oninteractive="${javascript`
                                    tippy(this, {
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
                                  oninteractive="${javascript`
                                    tippy(this, {
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
                              class="${res.locals.localCSS(css`
                                .tag.deleted & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    theme: "rose",
                                    touch: false,
                                    content: "Remove Tag",
                                  });
                                  tippy(this, {
                                    theme: "rose",
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <div
                                          class="${res.locals.localCSS(css`
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
                                              class="${res.locals.localCSS(css`
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
                                            oninteractive="${javascript`
                                              this.addEventListener("click", () => {
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
                                              });
                                            `}"
                                          >
                                            <i class="bi bi-trash"></i>
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
                              class="${res.locals.localCSS(css`
                                .tag:not(.deleted) & {
                                  display: none;
                                }
                              `)}"
                            >
                              <button
                                type="button"
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Don’t Remove Tag",
                                  });
                                  this.addEventListener("click", () => {
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
                                  });
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
                                        conversationLayoutSidebarOpenOnSmallScreen:
                                          "true",
                                        filters: {
                                          tagsReferences: [tag.reference],
                                        },
                                      },
                                      { addQueryPrefix: true }
                                    )}"
                                    class="button button--tight button--tight--inline button--transparent"
                                    oninteractive="${javascript`
                                      tippy(this, {
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
                  class="${res.locals.localCSS(css`
                    display: flex;
                    justify-content: center;
                  `)}"
                >
                  <button
                    type="button"
                    class="button button--transparent button--full-width-on-small-screen"
                    oninteractive="${javascript`
                      this.addEventListener("validate", (event) => {
                        if ([...this.closest("form").querySelector(".tags").children].filter((tag) => !tag.hidden).length > 0) return;
                        event.stopImmediatePropagation();
                        event.detail.error = "Please add at least one tag.";
                      });
                      this.addEventListener("click", () => {
                        const newTag = ${res.locals.HTMLForJavaScript(
                          html`
                            <div
                              class="tag ${res.locals.localCSS(css`
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
                                class="${res.locals.localCSS(css`
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
                                  onmount="${javascript`
                                    this.isModified = true;
                                    this.disabled = false;
                                    this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][name]";
                                  `}"
                                />
                                <div
                                  class="${res.locals.localCSS(css`
                                    display: flex;
                                    flex-wrap: wrap;
                                    column-gap: var(--space--4);
                                    row-gap: var(--space--2);
                                  `)}"
                                >
                                  <div
                                    class="${res.locals.localCSS(css`
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
                                        onmount="${javascript`
                                          this.isModified = true;
                                          this.disabled = false;
                                          this.name = "tags[" + this.closest(".tag").parentElement.children.length + "][isStaffOnly]";
                                        `}"
                                      />
                                      <span
                                        onmount="${javascript`
                                          tippy(this, {
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
                                        onmount="${javascript`
                                          tippy(this, {
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
                                    onmount="${javascript`
                                      tippy(this, {
                                        theme: "rose",
                                        touch: false,
                                        content: "Remove Tag",
                                      });
                                      this.addEventListener("click", () => {
                                        const tag = this.closest(".tag");
                                        tag.replaceChildren();
                                        tag.hidden = true;
                                      });
                                    `}"
                                  >
                                    <i class="bi bi-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          `
                        )}.firstElementChild.cloneNode(true);
                        this.closest("form").querySelector(".tags").insertAdjacentElement("beforeend", newTag);
                        for (const element of leafac.descendants(newTag)) {
                          const onmount = element.getAttribute("onmount");
                          if (onmount === null) continue;
                          new Function(onmount).call(element);
                        }
                      });
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
                  <i class="bi bi-pencil"></i>
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
    ...isCourseStaffMiddleware,
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
          database.run(
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
          database.run(
            sql`
              DELETE FROM "tags" WHERE "reference" = ${tag.reference}
            `
          );
        else
          database.run(
            sql`
              UPDATE "tags"
              SET "name" = ${tag.name},
                  "staffOnlyAt" = ${
                    tag.isStaffOnly ? new Date().toISOString() : null
                  }
              WHERE "reference" = ${tag.reference}
            `
          );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Tags updated successfully.</div>
        `,
      });

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/tags`
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
    "/courses/:courseReference/settings/invitations",
    ...isCourseStaffMiddleware,
    (req, res) => {
      const invitations = database.all<{
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
        courseSettingsLayout({
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
              class="${res.locals.localCSS(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="label">
                <p class="label--text">Type</p>
                <div
                  class="${res.locals.localCSS(css`
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
                      oninteractive="${javascript`
                        this.addEventListener("change", () => {
                          const form = this.closest("form");
                          const emails = form.querySelector(".emails");
                          emails.hidden = true;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = true;
                          form.querySelector(".button--create-invitation").hidden = false;
                          form.querySelector(".button--send-invitation-emails").hidden = true;
                        });
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
                      oninteractive="${javascript`
                        this.addEventListener("change", () => {
                          const form = this.closest("form");
                          const emails = form.querySelector(".emails");
                          emails.hidden = false;
                          for (const element of emails.querySelectorAll("*"))
                            if (element.disabled !== null) element.disabled = false;
                          form.querySelector(".button--create-invitation").hidden = true;
                          form.querySelector(".button--send-invitation-emails").hidden = false;
                        });
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
                    oninteractive="${javascript`
                      tippy(this, {
                        trigger: "click",
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
                  class="input--text input--text--textarea ${res.locals
                    .localCSS(css`
                    height: var(--space--32);
                  `)}"
                  oninteractive="${javascript`
                    this.addEventListener("validate", (event) => {
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
                        emails.length > 0 &&
                        emails.every(
                          ({ email }) => email.match(leafac.regExps.email) !== null
                        )
                      )
                        return;
                      event.stopImmediatePropagation();
                      event.detail.error = "Match the requested format.";
                    });
                  `}"
                ></textarea>
              </div>

              <div class="label">
                <p class="label--text">Role</p>
                <div
                  class="${res.locals.localCSS(css`
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
                  class="${res.locals.localCSS(css`
                    display: flex;
                  `)}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      oninteractive="${javascript`
                        this.addEventListener("change", () => {
                          const expiresAt = this.closest("form").querySelector(".expires-at");
                          expiresAt.hidden = !this.checked;
                          for (const element of expiresAt.querySelectorAll("*"))
                            if (element.disabled !== undefined) element.disabled = !this.checked;
                        });
                      `}"
                    />
                    <span
                      oninteractive="${javascript`
                        tippy(this, {
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
                      oninteractive="${javascript`
                        tippy(this, {
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
                    oninteractive="${javascript`
                      tippy(this, {
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
                  oninteractive="${javascript`
                    leafac.localizeDateTimeInput(this);
                    this.addEventListener("validate", (event) => {
                      if (Date.now() < new Date(this.value).getTime()) return;
                      event.stopImmediatePropagation();
                      event.detail.error = "Must be in the future.";
                    });
                  `}"
                />
              </div>

              <div>
                <button
                  class="button--create-invitation button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-person-plus"></i>
                  Create Invitation
                </button>
                <button
                  class="button--send-invitation-emails button button--full-width-on-small-screen button--blue"
                  hidden
                >
                  <i class="bi bi-envelope"></i>
                  Send Invitation Emails
                </button>
              </div>
            </form>

            $${invitations.length === 0
              ? html``
              : html`
                  $${invitations.map((invitation) => {
                    const action = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                    const isInvitationExpired = isExpired(invitation.expiresAt);
                    const isUsed = invitation.usedAt !== null;

                    return html`
                      <div
                        class="${res.locals.localCSS(css`
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
                                  oninteractive="${javascript`
                                    tippy(this, {
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
                                  oninteractive="${javascript`
                                    tippy(this, {
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
                          class="${res.locals.localCSS(css`
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
                                    id="invitation--${invitation.reference}"
                                    class="button button--tight button--tight--inline button--transparent strong"
                                    oninteractive="${javascript`
                                      this.tooltip = tippy(this, {
                                        touch: false,
                                        content: "See Invitation Link",
                                      });
                                      tippy(this, {
                                        trigger: "click",
                                        interactive: true,
                                        maxWidth: "none",
                                        content: ${(() => {
                                          const link = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
                                          return res.locals.HTMLForJavaScript(
                                            html`
                                              <div
                                                class="${res.locals
                                                  .localCSS(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                $${isInvitationExpired
                                                  ? html`
                                                      <p
                                                        class="text--rose ${res
                                                          .locals.localCSS(css`
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
                                                  class="${res.locals
                                                    .localCSS(css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    align-items: center;
                                                  `)}"
                                                >
                                                  <input
                                                    type="text"
                                                    readonly
                                                    value="${link}"
                                                    class="input--text ${res
                                                      .locals.localCSS(css`
                                                      flex: 1;
                                                    `)}"
                                                    oninteractive="${javascript`
                                                      this.addEventListener("focus", () => {
                                                        this.select();
                                                      });
                                                    `}"
                                                  />
                                                  <button
                                                    class="button button--tight button--transparent"
                                                    oninteractive="${javascript`
                                                      tippy(this, {
                                                        touch: false,
                                                        content: "Copy Link",
                                                      });
                                                      this.addEventListener("click", async () => {
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
                                                      });
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
                                                    oninteractive="${javascript`
                                                      tippy(this, {
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
                                    class="button button--tight button--tight--inline button--transparent ${res
                                      .locals.localCSS(css`
                                      display: flex;
                                      flex-direction: column;
                                      align-items: flex-start;
                                      gap: var(--space--0);
                                    `)}"
                                    oninteractive="${javascript`
                                      tippy(this, {
                                        trigger: "click",
                                        interactive: true,
                                        content: ${res.locals.HTMLForJavaScript(
                                          html`
                                            <div class="dropdown--menu">
                                              <form
                                                method="POST"
                                                action="${action}?_method=PATCH"
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
                                                        oninteractive="${javascript`
                                                        tippy(this, {
                                                          theme: "rose",
                                                          trigger: "click",
                                                          content: "You may not resend this invitation because it’s used.",
                                                        });
                                                      `}"
                                                      `
                                                    : isInvitationExpired
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                        tippy(this, {
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
                                      class="strong ${res.locals.localCSS(css`
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
                            class="${res.locals.localCSS(css`
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `)}"
                          >
                            <div
                              class="${res.locals.localCSS(css`
                                width: var(--space--28);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              <button
                                class="button button--tight button--tight--inline button--transparent"
                                oninteractive="${javascript`
                                  tippy(this, {
                                    touch: false,
                                    content: "Update Role",
                                  });
                                  tippy(this, {
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.HTMLForJavaScript(
                                      html`
                                        <div class="dropdown--menu">
                                          $${enrollmentRoles.map((role) =>
                                            role === invitation.role
                                              ? html``
                                              : html`
                                                  <form
                                                    method="POST"
                                                    action="${action}?_method=PATCH"
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
                                                            oninteractive="${javascript`
                                                              tippy(this, {
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the role of this invitation because it’s used.",
                                                              });
                                                            `}"
                                                          `
                                                        : isInvitationExpired
                                                        ? html`
                                                            type="button"
                                                            oninteractive="${javascript`
                                                              tippy(this, {
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
                              class="${res.locals.localCSS(css`
                                width: var(--space--40);
                                display: flex;
                                justify-content: flex-start;
                              `)}"
                            >
                              $${(() => {
                                const updateExpirationForm = html`
                                  <form
                                    method="POST"
                                    action="${action}?_method=PATCH"
                                    novalidate
                                    class="dropdown--menu ${res.locals
                                      .localCSS(css`
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
                                        oninteractive="${javascript`
                                          leafac.localizeDateTimeInput(this);
                                          this.addEventListener("validate", (event) => {
                                            if (Date.now() < new Date(this.value).getTime()) return;
                                            event.stopImmediatePropagation();
                                            event.detail.error = "Must be in the future.";
                                          });
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
                                    method="POST"
                                    action="${action}?_method=PATCH"
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
                                    method="POST"
                                    action="${action}?_method=PATCH"
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
                                          class="button button--tight button--tight--inline text--green ${res
                                            .locals.localCSS(css`
                                            cursor: default;
                                          `)}"
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  Used
                                                  <time
                                                    datetime="${new Date(
                                                      invitation.usedAt!
                                                    ).toISOString()}"
                                                    oninteractive="${javascript`
                                                      leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                    `}"
                                                    onbeforeelchildrenupdated="${javascript`
                                                      return false;
                                                    `}"
                                                  ></time>
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
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
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
                                                          oninteractive="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                          `}"
                                                          onbeforeelchildrenupdated="${javascript`
                                                            return false;
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
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
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
                                          oninteractive="${javascript`
                                            tippy(this, {
                                              touch: false,
                                              content: "Update Expiration",
                                            });
                                            tippy(this, {
                                              trigger: "click",
                                              interactive: true,
                                              content: ${res.locals.HTMLForJavaScript(
                                                html`
                                                  <div
                                                    class="${res.locals
                                                      .localCSS(css`
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
                                                          oninteractive="${javascript`
                                                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                                                          `}"
                                                          onbeforeelchildrenupdated="${javascript`
                                                            return false;
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
    ...isCourseStaffMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.role !== "string" ||
        !enrollmentRoles.includes(req.body.role) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !isDate(req.body.expiresAt) ||
            isExpired(req.body.expiresAt))) ||
        typeof req.body.type !== "string" ||
        !["link", "email"].includes(req.body.type)
      )
        return next("validation");

      switch (req.body.type) {
        case "link":
          const invitation = database.get<{ reference: string }>(
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

          Flash.set({
            req,
            res,
            content: html`
              <div class="flash--green">
                <div>
                  Invitation link created successfully.
                  <button
                    class="link"
                    oninteractive="${javascript`
                      this.addEventListener("click", () => {
                        const id = "#invitation--${invitation.reference}";
                        window.location.hash = id;
                        const button = document.querySelector(id);
                        button.click();
                        button.tooltip.hide();
                        this.closest(".flash").remove();
                      });
                    `}"
                  >
                    See invitation link</button
                  >.
                </div>
              </div>
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
            emails.some(({ email }) => email.match(emailRegExp) === null)
          )
            return next("validation");

          for (const { email, name } of emails) {
            if (
              database.get<{}>(
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

            const existingUnusedInvitation = database.get<{
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
              database.run(
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

            const invitation = database.get<{
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

            sendInvitationEmail({
              req,
              res,
              invitation: {
                ...invitation,
                course: res.locals.course,
              },
            });
          }

          Flash.set({
            req,
            res,
            content: html`
              <div class="flash--green">
                Invitation emails sent successfully.
              </div>
            `,
          });
          break;
      }

      res.redirect(
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
    ...mayManageInvitationMiddleware,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("validation");

      if (req.body.resend === "true") {
        if (
          isExpired(res.locals.invitation.expiresAt) ||
          res.locals.invitation.email === null
        )
          return next("validation");
        sendInvitationEmail({
          req,
          res,
          invitation: res.locals.invitation,
        });
        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation email resent successfully.
            </div>
          `,
        });
      }

      if (req.body.role !== undefined) {
        if (
          isExpired(res.locals.invitation.expiresAt) ||
          !enrollmentRoles.includes(req.body.role)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation role updated successfully.
            </div>
          `,
        });
      }

      if (req.body.expiresAt !== undefined) {
        if (
          typeof req.body.expiresAt !== "string" ||
          !isDate(req.body.expiresAt) ||
          isExpired(req.body.expiresAt)
        )
          return next("validation");

        database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation expiration updated successfully.
            </div>
          `,
        });
      }

      if (req.body.removeExpiration === "true") {
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">
              Invitation expiration removed successfully.
            </div>
          `,
        });
      }

      if (req.body.expire === "true") {
        database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Invitation expired successfully.</div>
          `,
        });
      }

      res.redirect(
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
    ...isCourseStaffMiddleware,
    (req, res) => {
      const enrollments = database
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
        courseSettingsLayout({
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
              class="${res.locals.localCSS(css`
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
                oninteractive="${javascript`
                  this.isModified = false;
                  this.addEventListener("input", () => {
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
                  });
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
                  class="enrollment ${res.locals.localCSS(css`
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
                    $${userPartial({
                      req,
                      res,
                      enrollment,
                      name: false,
                    })}
                  </div>

                  <div
                    class="${res.locals.localCSS(css`
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
                          splitFilterablePhrases(enrollment.user.name)
                        )}"
                        class="strong"
                      >
                        ${enrollment.user.name}
                      </div>
                      <div
                        data-filterable-phrases="${JSON.stringify(
                          splitFilterablePhrases(enrollment.user.email)
                        )}"
                        class="secondary"
                      >
                        ${enrollment.user.email}
                      </div>
                      <div
                        class="secondary ${res.locals.localCSS(css`
                          font-size: var(--font-size--xs);
                        `)}"
                      >
                        Last seen online
                        <time
                          datetime="${new Date(
                            enrollment.user.lastSeenOnlineAt
                          ).toISOString()}"
                          oninteractive="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on" });
                          `}"
                          onbeforeelchildrenupdated="${javascript`
                            return false;
                          `}"
                        ></time>
                      </div>
                    </div>

                    <div
                      class="${res.locals.localCSS(css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div
                        class="${res.locals.localCSS(css`
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
                          oninteractive="${javascript`
                            tippy(this, {
                              touch: false,
                              content: "Update Role",
                            });
                            tippy(this, {
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.HTMLForJavaScript(
                                html`
                                  <div class="dropdown--menu">
                                    $${enrollmentRoles.map((role) =>
                                      role === enrollment.role
                                        ? html``
                                        : html`
                                            <form
                                              method="POST"
                                              action="${action}?_method=PATCH"
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
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not update your own role because you’re the only staff member.",
                                                          });
                                                        `}"
                                                      `
                                                    : isSelf
                                                    ? html`
                                                        type="button"
                                                        oninteractive="${javascript`
                                                          tippy(this, {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                            appendTo: document.body,
                                                            content: ${res.locals.HTMLForJavaScript(
                                                              html`
                                                                <form
                                                                  method="POST"
                                                                  action="${action}?_method=PATCH"
                                                                  class="${res
                                                                    .locals
                                                                    .localCSS(css`
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
                                                                      class="${res
                                                                        .locals
                                                                        .localCSS(css`
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
                        class="${res.locals.localCSS(css`
                          width: var(--space--8);
                          display: flex;
                          justify-content: flex-start;
                        `)}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          oninteractive="${javascript`
                            tippy(this, {
                              theme: "rose",
                              touch: false,
                              content: "Remove from the Course",
                            });
                            ${
                              isOnlyStaff
                                ? javascript`
                                    tippy(this, {
                                      theme: "rose",
                                      trigger: "click",
                                      content: "You may not remove yourself from the course because you’re the only staff member.",
                                    });
                                  `
                                : javascript`
                                    tippy(this, {
                                      theme: "rose",
                                      trigger: "click",
                                      interactive: true,
                                      content: ${res.locals.HTMLForJavaScript(
                                        html`
                                          <form
                                            method="POST"
                                            action="${action}?_method=DELETE"
                                            class="${res.locals.localCSS(css`
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
                                                class="${res.locals
                                                  .localCSS(css`
                                                  font-weight: var(
                                                    --font-weight--bold
                                                  );
                                                `)}"
                                              >
                                                You may not undo this action!
                                              </strong>
                                            </p>
                                            <button class="button button--rose">
                                              <i class="bi bi-person-dash"></i>
                                              Remove from the Course
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
                            $${processContent({
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
    ...mayManageEnrollmentMiddleware,
    (req, res, next) => {
      if (typeof req.body.role === "string") {
        if (!enrollmentRoles.includes(req.body.role)) return next("validation");
        database.run(
          sql`UPDATE "enrollments" SET "role" = ${req.body.role} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );

        Flash.set({
          req,
          res,
          content: html`
            <div class="flash--green">Enrollment updated successfully.</div>
          `,
        });
      }

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${app.locals.options.baseURL}/courses/${res.locals.course.reference}`
          : `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
      );
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
    ...mayManageEnrollmentMiddleware,
    (req, res) => {
      database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">
            $${res.locals.managedEnrollment.isSelf
              ? html`You removed yourself`
              : html`Person removed`}
            from the course successfully.
          </div>
        `,
      });

      res.redirect(
        res.locals.managedEnrollment.isSelf
          ? `${app.locals.options.baseURL}/`
          : `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/enrollments`
      );
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
    ...isEnrolledInCourseMiddleware,
    (req, res) => {
      res.send(
        courseSettingsLayout({
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
              method="POST"
              action="${app.locals.options.baseURL}/courses/${res.locals.course
                .reference}/settings/your-enrollment?_method=PATCH"
              novalidate
              class="${res.locals.localCSS(css`
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
                    oninteractive="${javascript`
                      tippy(this, {
                        trigger: "click",
                        content: "A bar with the accent color appears at the top of pages related to this course to help you differentiate between courses.",
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <div
                  class="${res.locals.localCSS(css`
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
                        class="input--radio ${res.locals.localCSS(css`
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
                  <i class="bi bi-pencil"></i>
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
    ...isEnrolledInCourseMiddleware,
    (req, res, next) => {
      if (
        typeof req.body.accentColor !== "string" ||
        !enrollmentAccentColors.includes(req.body.accentColor)
      )
        return next("validation");

      database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
      );

      Flash.set({
        req,
        res,
        content: html`
          <div class="flash--green">Enrollment updated successfully.</div>
        `,
      });

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/settings/your-enrollment`
      );
    }
  );

  app.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    IsEnrolledInCourseMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...isEnrolledInCourseMiddleware,
    ...isInvitationUsableMiddleware,
    asyncHandler(async (req, res) => {
      const link = `${app.locals.options.baseURL}/courses/${res.locals.course.reference}/invitations/${res.locals.invitation.reference}`;
      res.send(
        boxLayout({
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
                class="${res.locals.localCSS(css`
                  display: flex;
                  gap: var(--space--2);
                  align-items: baseline;
                `)}"
              >
                <input
                  type="text"
                  readonly
                  value="${link}"
                  class="input--text ${res.locals.localCSS(css`
                    flex: 1;
                  `)}"
                  oninteractive="${javascript`
                    this.addEventListener("focus", () => {
                      this.select();
                    });
                  `}"
                />
                <div>
                  <button
                    class="button button--tight button--transparent"
                    oninteractive="${javascript`
                      tippy(this, {
                        touch: false,
                        content: "Copy Link",
                      });
                      this.addEventListener("click", async () => {
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
                      });
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
    {},
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        boxLayout({
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
                .invitation.reference}"
            >
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <button
                class="button button--blue ${res.locals.localCSS(css`
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
    {},
    IsSignedInMiddlewareLocals & IsInvitationUsableMiddlewareLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.locals.middlewares.isSignedIn,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "role", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${res.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitation.role},
            ${defaultAccentColor(res.locals.enrollments)}
          )
        `
      );
      if (res.locals.invitation.email !== null)
        database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        `${app.locals.options.baseURL}/courses/${res.locals.invitation.course.reference}`
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
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        boxLayout({
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
              class="${res.locals.localCSS(css`
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
                    ...(res.locals.invitation.email === null
                      ? {}
                      : {
                          email: res.locals.invitation.email,
                        }),
                    ...(res.locals.invitation.name === null
                      ? {}
                      : {
                          name: res.locals.invitation.name,
                        }),
                  },
                  { addQueryPrefix: true }
                )}"
                class="button button--blue"
              >
                <i class="bi bi-person-plus"></i>
                Sign up
              </a>
              <a
                href="${app.locals.options.baseURL}/sign-in${qs.stringify(
                  {
                    redirect: req.originalUrl,
                    ...(res.locals.invitation.email === null
                      ? {}
                      : {
                          email: res.locals.invitation.email,
                        }),
                    ...(res.locals.invitation.name === null
                      ? {}
                      : {
                          name: res.locals.invitation.name,
                        }),
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
        boxLayout({
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
