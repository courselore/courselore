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
import got from "got";
import {
  Courselore,
  ResponseLocalsLiveUpdates,
  User,
} from "./index.mjs";

export type Enrollment = {
  id: number;
  user: User;
  reference: string;
  courseRole: CourseRole;
};

export type MaybeEnrollment = Enrollment | "no-longer-enrolled";

export type CourseRole = typeof courseRoles[number];
export const courseRoles = ["student", "staff"] as const;

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
  req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
  res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
  course: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number]["course"];
  enrollment?: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number];
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
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & Partial<Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>
  >;
  res: express.Response<
    any,
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & Partial<Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>
  >;
  tight?: boolean;
}) => HTML;

export type CourseArchivedPartial = ({
  req,
  res,
}: {
  req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
  res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
}) => HTML;

export type IsEnrolledInCourseMiddleware = express.RequestHandler<
  { courseReference: string },
  any,
  {},
  {},
  Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
>[];
export type Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] = Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & {
  actionAllowedOnArchivedCourse?: boolean;
  enrollment: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number];
  course: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number]["course"];
  courseEnrollmentsCount: number;
  conversationsCount: number;
  tags: {
    id: number;
    reference: string;
    name: string;
    staffOnlyAt: string | null;
  }[];
};

export type IsCourseStaffMiddleware = express.RequestHandler<
  { courseReference: string },
  any,
  {},
  {},
  IsCourseStaffLocals
>[];
export type IsCourseStaffLocals = Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"];

export default async (app: Courselore): Promise<void> => {
  const courseRoleIcon: {
    [courseRole in CourseRole]: {
      regular: HTML;
      fill: HTML;
    };
  } = {
    student: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    staff: {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
  };

  const courseRoleTextColor: {
    [courseRole in CourseRole]: string;
  } = {
    student: "",
    staff: "text--sky",
  };

  app.server.locals.partials.course = ({
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
                  $${courseRoleIcon[enrollment.courseRole]
                    .regular} ${lodash.capitalize(enrollment.courseRole)}
                </div>
              `}
          $${course.archivedAt !== null
            ? html`
                <div>$${app.server.locals.partials.courseArchived({ req, res })}</div>
              `
            : html``}
        </div>
      </div>
    </div>
  `;

  app.server.locals.partials.courses = ({ req, res, tight = false }) => {
    let courses = html``;

    const [unarchived, archived] = lodash.partition(
      res.locals.enrollments,
      (enrollment) => enrollment.course.archivedAt === null
    );

    if (unarchived.length > 0)
      courses += html`
        $${unarchived.map(
          (enrollment) =>
            html`
              <a
                key="enrollment--${enrollment.reference}"
                href="https://${app.configuration.hostname}/courses/${enrollment
                  .course.reference}"
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                res.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${app.server.locals.partials.course({
                  req,
                  res,
                  course: enrollment.course,
                  enrollment,
                  tight,
                })}
              </a>
            `
        )}
      `;

    if (archived.length > 0)
      courses += html`
        $${courses !== html`` ? html`<hr class="separator" />` : html``}

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
                href="https://${app.configuration.hostname}/courses/${enrollment
                  .course.reference}"
                hidden
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                res.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${app.server.locals.partials.course({
                  req,
                  res,
                  course: enrollment.course,
                  enrollment,
                  tight,
                })}
              </a>
            `
        )}
      `;

    return courses;
  };

  app.server.locals.partials.courseArchived = ({ req, res }) => html`
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

  app.server.get<{}, HTML, {}, {}, Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>(
    "/",
    ...app.server.locals.middlewares.isSignedIn,
    (req, res) => {
      switch (res.locals.enrollments.length) {
        case 0:
          res.send(
            app.server.locals.layouts.main({
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
                    $${app.server.locals.partials.logo({
                      size: 144 /* var(--space--36) */,
                    })}
                  </div>

                  <div class="menu-box">
                    <a
                      href="https://${app.configuration
                        .hostname}/settings/profile"
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
                    $${res.locals.mayCreateCourses
                      ? html`
                          <a
                            href="https://${app.configuration
                              .hostname}/courses/new"
                            class="menu-box--item button button--transparent"
                          >
                            <i class="bi bi-journal-plus"></i>
                            Create a New Course
                          </a>
                        `
                      : html``}
                  </div>
                </div>
              `,
            })
          );
          break;

        case 1:
          res.redirect(
            303,
            `https://${app.configuration.hostname}/courses/${res.locals.enrollments[0].course.reference}`
          );
          break;

        default:
          res.send(
            app.server.locals.layouts.main({
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
                    $${app.server.locals.partials.courses({ req, res })}
                  </div>
                </div>
              `,
            })
          );
          break;
      }
    }
  );

  type MayCreateCoursesLocals = Application["server"]["locals"]["ResponseLocals"]["SignedIn"];
  const mayCreateCoursesMiddleware: express.RequestHandler<
    {},
    any,
    {},
    {},
    MayCreateCoursesLocals
  >[] = [
    ...app.server.locals.middlewares.isSignedIn,
    (req, res, next) => {
      if (res.locals.mayCreateCourses) return next();
      next("route");
    },
  ];

  app.server.get<{}, HTML, {}, {}, MayCreateCoursesLocals>(
    "/courses/new",
    ...mayCreateCoursesMiddleware,
    (req, res) => {
      res.send(
        app.server.locals.layouts.main({
          req,
          res,
          head: html`<title>Create a New Course · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-plus"></i>
              Create a New Course
            </h2>

            <form
              method="POST"
              action="https://${app.configuration.hostname}/courses"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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

  app.server.post<
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
    MayCreateCoursesLocals
  >("/courses", ...mayCreateCoursesMiddleware, (req, res, next) => {
    if (
      typeof req.body.name !== "string" ||
      req.body.name.trim() === "" ||
      !["string", "undefined"].includes(typeof req.body.year) ||
      !["string", "undefined"].includes(typeof req.body.term) ||
      !["string", "undefined"].includes(typeof req.body.institution) ||
      !["string", "undefined"].includes(typeof req.body.code)
    )
      return next("Validation");

    const course = app.database.get<{
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
    app.database.run(
      sql`
        INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
        VALUES (
          ${new Date().toISOString()},
          ${res.locals.user.id},
          ${course.id},
          ${cryptoRandomString({ length: 10, type: "numeric" })},
          ${"staff"},
          ${defaultAccentColor({ req, res })}
        )
      `
    );
    res.redirect(
      303,
      `https://${app.configuration.hostname}/courses/${course.reference}`
    );
  });

  const defaultAccentColor = ({
    req,
    res,
  }: {
    req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>;
    res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>;
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

  app.server.locals.middlewares.isEnrolledInCourse = [
    ...app.server.locals.middlewares.isSignedIn,
    (req, res, next) => {
      const actionAllowedOnArchivedCourse =
        res.locals.actionAllowedOnArchivedCourse;
      delete res.locals.actionAllowedOnArchivedCourse;

      const enrollment = res.locals.enrollments.find(
        (enrollment) =>
          enrollment.course.reference === req.params.courseReference
      );
      if (enrollment === undefined) return next("route");
      res.locals.enrollment = enrollment;
      res.locals.course = enrollment.course;

      res.locals.courseEnrollmentsCount = app.database.get<{
        count: number;
      }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "enrollments"
          WHERE "course" = ${res.locals.course.id}
        `
      )!.count;

      res.locals.conversationsCount = app.database.get<{
        count: number;
      }>(
        sql`
          SELECT COUNT(*) AS "count"
          FROM "conversations"
          WHERE
            "course" = ${res.locals.course.id} AND (
              "conversations"."participants" = 'everyone' $${
                res.locals.enrollment.courseRole === "staff"
                  ? sql`OR "conversations"."participants" = 'staff'`
                  : sql``
              } OR EXISTS(
                SELECT TRUE
                FROM "conversationSelectedParticipants"
                WHERE
                  "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                  "conversationSelectedParticipants"."enrollment" = ${
                    res.locals.enrollment.id
                  }
              )
            )
        `
      )!.count;

      res.locals.tags = app.database.all<{
        id: number;
        reference: string;
        name: string;
        staffOnlyAt: string | null;
      }>(
        sql`
          SELECT "id", "reference", "name", "staffOnlyAt"
          FROM "tags"
          WHERE
            "course" = ${res.locals.course.id}
            $${
              res.locals.enrollment.courseRole === "student"
                ? sql`AND "staffOnlyAt" IS NULL`
                : sql``
            }
          ORDER BY "id" ASC
        `
      );

      if (
        res.locals.course.archivedAt !== null &&
        !["GET", "HEAD", "OPTIONS", "TRACE"].includes(req.method) &&
        actionAllowedOnArchivedCourse !== true
      ) {
        app.server.locals.helpers.Flash.set({
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
          `https://${app.configuration.hostname}/courses/${res.locals.course.reference}`
        );
      }

      next();
    },
  ];

  app.server.locals.middlewares.isCourseStaff = [
    ...app.server.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (res.locals.enrollment.courseRole === "staff") return next();
      next("route");
    },
  ];

  app.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & ResponseLocalsLiveUpdates
  >(
    "/courses/:courseReference",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    ...app.server.locals.middlewares.liveUpdates,
    (req, res) => {
      if (res.locals.conversationsCount === 0)
        return res.send(
          app.server.locals.layouts.main({
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
                  $${res.locals.enrollment.courseRole === "staff"
                    ? html`
                        <a
                          href="https://${app.configuration
                            .hostname}/courses/${res.locals.course
                            .reference}/settings/tags"
                          class="menu-box--item button button--blue"
                        >
                          <i class="bi bi-sliders"></i>
                          Configure the Course
                        </a>
                      `
                    : html``}
                  <a
                    href="https://${app.configuration.hostname}/courses/${res
                      .locals.course.reference}/conversations/new${qs.stringify(
                      {
                        newConversation: {
                          type:
                            res.locals.enrollment.courseRole === "staff"
                              ? "note"
                              : "question",
                        },
                      },
                      { addQueryPrefix: true }
                    )}"
                    class="menu-box--item button ${res.locals.enrollment
                      .courseRole === "staff"
                      ? "button--transparent"
                      : "button--blue"}"
                  >
                    $${res.locals.enrollment.courseRole === "staff"
                      ? html`<i class="bi bi-chat-text"></i>`
                      : html`<i class="bi bi-chat-text-fill"></i>`}
                    Start the First Conversation
                  </a>
                </div>
              </div>
            `,
          })
        );

      res.send(
        app.server.locals.layouts.conversation({
          req,
          res,
          head: html`<title>${res.locals.course.name} · Courselore</title>`,
          sidebarOnSmallScreen: true,
          body: html`<p class="secondary">No conversation selected.</p>`,
        })
      );
    }
  );

  app.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    (req, res) => {
      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.course.reference
        }/settings/${
          res.locals.enrollment.courseRole === "staff"
            ? "course-information"
            : "your-enrollment"
        }`
      );
    }
  );

  const courseSettingsLayout = ({
    req,
    res,
    head,
    body,
  }: {
    req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
    res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>;
    head: HTML;
    body: HTML;
  }): HTML =>
    app.server.locals.layouts.settings({
      req,
      res,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `,
      menu:
        res.locals.enrollment.courseRole === "staff"
          ? html`
              <a
                href="https://${app.configuration.hostname}/courses/${res.locals
                  .course.reference}/settings/course-information"
                class="dropdown--menu--item menu-box--item button ${req.path.match(
                  /\/settings\/course-information\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-journal-text"></i>
                Course Information
              </a>
              <a
                href="https://${app.configuration.hostname}/courses/${res.locals
                  .course.reference}/settings/tags"
                class="dropdown--menu--item menu-box--item button ${req.path.match(
                  /\/settings\/tags\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.match(/\/settings\/tags\/?$/i)
                    ? "bi-tags-fill"
                    : "bi-tags"}"
                ></i>
                Tags
              </a>
              <a
                href="https://${app.configuration.hostname}/courses/${res.locals
                  .course.reference}/settings/invitations"
                class="dropdown--menu--item menu-box--item button ${req.path.match(
                  /\/settings\/invitations\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.match(/\/settings\/invitations\/?$/i)
                    ? "bi-person-plus-fill"
                    : "bi-person-plus"}"
                ></i>
                Invitations
              </a>
              <a
                href="https://${app.configuration.hostname}/courses/${res.locals
                  .course.reference}/settings/enrollments"
                class="dropdown--menu--item menu-box--item button ${req.path.match(
                  /\/settings\/enrollments\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.match(/\/settings\/enrollments\/?$/i)
                    ? "bi-people-fill"
                    : "bi-people"}"
                ></i>
                Enrollments
              </a>
              <a
                href="https://${app.configuration.hostname}/courses/${res.locals
                  .course.reference}/settings/your-enrollment"
                class="dropdown--menu--item menu-box--item button ${req.path.match(
                  /\/settings\/your-enrollment\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${req.path.match(/\/settings\/your-enrollment\/?$/i)
                    ? "bi-person-fill"
                    : "bi-person"}"
                ></i>
                Your Enrollment
              </a>
            `
          : html``,
      body,
    });

  app.server.get<{ courseReference: string }, HTML, {}, {}, IsCourseStaffLocals>(
    "/courses/:courseReference/settings/course-information",
    ...app.server.locals.middlewares.isCourseStaff,
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
              method="PATCH"
              action="https://${app.configuration.hostname}/courses/${res.locals
                .course.reference}/settings/course-information"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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
              action="https://${app.configuration.hostname}/courses/${res.locals
                .course.reference}/settings/course-information"
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--1);
              `)}"
            >
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

  app.server.patch<
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
    IsCourseStaffLocals
  >(
    "/courses/:courseReference/settings/course-information",
    (req, res, next) => {
      res.locals.actionAllowedOnArchivedCourse =
        typeof req.body.isArchived === "string" &&
        req.body.name === undefined &&
        req.body.year === undefined &&
        req.body.term === undefined &&
        req.body.institution === undefined &&
        req.body.code === undefined;
      next();
    },
    ...app.server.locals.middlewares.isCourseStaff,
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
        return next("Validation");

      if (typeof req.body.isArchived !== "string") {
        app.database.run(
          sql`
            UPDATE "courses"
            SET
              "name" = ${req.body.name},
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
        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Course information updated successfully.`,
        });
      } else {
        app.database.run(
          sql`
            UPDATE "courses"
            SET "archivedAt" = ${
              req.body.isArchived === "true" ? new Date().toISOString() : null
            }
            WHERE "id" = ${res.locals.course.id}
          `
        );
        app.server.locals.helpers.Flash.set({
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
        `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/course-information`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.get<{ courseReference: string }, HTML, {}, {}, IsCourseStaffLocals>(
    "/courses/:courseReference/settings/tags",
    ...app.server.locals.middlewares.isCourseStaff,
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
              <i class="bi bi-tags-fill"></i>
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
              action="https://${app.configuration.hostname}/courses/${res.locals
                .course.reference}/settings/tags"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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
                                  class="${courseRoleTextColor.staff}"
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
                                    href="https://${app.configuration
                                      .hostname}/courses/${res.locals.course
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
                                    <i class="bi bi-chat-text"></i>
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
                                      class="${courseRoleTextColor.staff}"
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

                      this.onvalidate = () => {
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

  app.server.put<
    { courseReference: string },
    HTML,
    {
      tags?: {
        reference?: string;
        delete?: "true";
        name?: string;
        isStaffOnly?: "on";
      }[];
    },
    {},
    IsCourseStaffLocals
  >(
    "/courses/:courseReference/settings/tags",
    ...app.server.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        !Array.isArray(req.body.tags) ||
        req.body.tags.length === 0 ||
        req.body.tags.some(
          (tag) =>
            (tag.reference === undefined &&
              (typeof tag.name !== "string" ||
                tag.name.trim() === "" ||
                ![undefined, "on"].includes(tag.isStaffOnly))) ||
            (tag.reference !== undefined &&
              (!res.locals.tags.some(
                (existingTag) => tag.reference === existingTag.reference
              ) ||
                (tag.delete !== "true" &&
                  (typeof tag.name !== "string" ||
                    tag.name.trim() === "" ||
                    ![undefined, "on"].includes(tag.isStaffOnly)))))
        )
      )
        return next("Validation");

      for (const tag of req.body.tags)
        if (tag.reference === undefined)
          app.database.run(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${tag.name},
                ${tag.isStaffOnly === "on" ? new Date().toISOString() : null}
              )
            `
          );
        else if (tag.delete === "true")
          app.database.run(
            sql`
              DELETE FROM "tags" WHERE "reference" = ${tag.reference}
            `
          );
        else
          app.database.run(
            sql`
              UPDATE "tags"
              SET
                "name" = ${tag.name},
                "staffOnlyAt" = ${
                  tag.isStaffOnly === "on" ? new Date().toISOString() : null
                }
              WHERE "reference" = ${tag.reference}
            `
          );

      app.server.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Tags updated successfully.`,
      });

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/tags`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.get<{ courseReference: string }, HTML, {}, {}, IsCourseStaffLocals>(
    "/courses/:courseReference/settings/invitations",
    ...app.server.locals.middlewares.isCourseStaff,
    (req, res) => {
      const invitations = app.database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        courseRole: CourseRole;
      }>(
        sql`
          SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "courseRole"
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
              <i class="bi bi-person-plus-fill"></i>
              Invitations
            </h2>

            <form
              method="POST"
              action="https://${app.configuration.hostname}/courses/${res.locals
                .course.reference}/settings/invitations"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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
                    this.onvalidate = () => {
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
                <p class="label--text">Course Role</p>
                <div
                  css="${res.locals.css(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  $${courseRoles.map(
                    (courseRole) =>
                      html`
                        <label
                          class="button button--tight button--tight--inline button--transparent"
                        >
                          <input
                            type="radio"
                            name="courseRole"
                            value="${courseRole}"
                            required
                            class="visually-hidden input--radio-or-checkbox--multilabel"
                          />
                          <span>
                            $${courseRoleIcon[courseRole].regular}
                            ${lodash.capitalize(courseRole)}
                          </span>
                          <span class="text--blue">
                            $${courseRoleIcon[courseRole].fill}
                            ${lodash.capitalize(courseRole)}
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

                    this.onvalidate = () => {
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
                  <i class="bi bi-link"></i>
                  Create Invitation Link
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
                    const action = `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/invitations/${invitation.reference}`;
                    const isInvitationExpired = app.server.locals.helpers.isExpired(
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
                                          const link = `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/invitations/${invitation.reference}`;
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
                                class="button button--tight button--tight--inline button--transparent ${courseRoleTextColor[
                                  invitation.courseRole
                                ]}"
                                onload="${javascript`
                                  (this.tooltip ??= tippy(this)).setProps({
                                    touch: false,
                                    content: "Update Course Role",
                                  });

                                  (this.dropdown ??= tippy(this)).setProps({
                                    trigger: "click",
                                    interactive: true,
                                    content: ${res.locals.html(
                                      html`
                                        <div class="dropdown--menu">
                                          $${courseRoles.map(
                                            (courseRole) =>
                                              html`
                                                <form
                                                  key="course-role--${courseRole}"
                                                  method="PATCH"
                                                  action="${action}"
                                                >
                                                  <input
                                                    type="hidden"
                                                    name="courseRole"
                                                    value="${courseRole}"
                                                  />
                                                  <button
                                                    class="dropdown--menu--item button ${courseRole ===
                                                    invitation.courseRole
                                                      ? "button--blue"
                                                      : "button--transparent"} ${courseRoleTextColor[
                                                      courseRole
                                                    ]}"
                                                    $${isUsed
                                                      ? html`
                                                          type="button"
                                                          onload="${javascript`
                                                            (this.tooltip ??= tippy(this)).setProps({
                                                              theme: "rose",
                                                              trigger: "click",
                                                              content: "You may not update the course role of this invitation because it’s used.",
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
                                                              content: "You may not update the course role of this invitation because it’s expired.",
                                                            });
                                                          `}"
                                                        `
                                                      : html``}
                                                  >
                                                    $${courseRoleIcon[
                                                      courseRole
                                                    ][
                                                      courseRole === "staff"
                                                        ? "fill"
                                                        : "regular"
                                                    ]}
                                                    ${lodash.capitalize(
                                                      courseRole
                                                    )}
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
                                $${courseRoleIcon[invitation.courseRole][
                                  invitation.courseRole === "staff"
                                    ? "fill"
                                    : "regular"
                                ]}
                                ${lodash.capitalize(invitation.courseRole)}
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
                                    css="${res.locals.css(css`
                                      gap: var(--space--2);
                                    `)}"
                                  >
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

                                          this.onvalidate = () => {
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
                                  <form method="PATCH" action="${action}">
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
                                  <form method="PATCH" action="${action}">
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
                                                        class="bi bi-calendar-x-fill"
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
                                                    <div class="dropdown--menu">
                                                      $${updateExpirationForm}
                                                    </div>
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    <div class="dropdown--menu">
                                                      $${removeExpirationForm}
                                                    </div>
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
                                                    <div class="dropdown--menu">
                                                      $${updateExpirationForm}
                                                    </div>
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    <div class="dropdown--menu">
                                                      $${expireForm}
                                                    </div>
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
                                                        class="bi bi-calendar-plus-fill"
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
                                                    <div class="dropdown--menu">
                                                      $${updateExpirationForm}
                                                    </div>
                                                    <hr
                                                      class="dropdown--separator"
                                                    />
                                                    <div class="dropdown--menu">
                                                      $${removeExpirationForm}
                                                      $${expireForm}
                                                    </div>
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

  const invitationMailer = ({
    req,
    res,
    invitation,
  }: {
    req: express.Request<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
    res: express.Response<any, Application["server"]["locals"]["ResponseLocals"]["Base"]>;
    invitation: InvitationExistsLocals["invitation"];
  }): void => {
    const link = `https://${app.configuration.hostname}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    app.database.run(
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
            from: {
              name: `${invitation.course.name} · ${app.configuration.email.defaults.from.name}`,
              address: app.configuration.email.defaults.from.address,
            },
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
    got
      .post(`http://127.0.0.1:${application.ports.workerEventsAny}/send-email`)
      .catch((error) => {
        response.locals.log("FAILED TO EMIT ‘/send-email’ EVENT", error);
      });
  };

  app.server.post<
    { courseReference: string },
    HTML,
    {
      type?: "link" | "email";
      courseRole?: CourseRole;
      expiresAt?: string;
      emails?: string;
    },
    {},
    IsCourseStaffLocals
  >(
    "/courses/:courseReference/settings/invitations",
    ...app.server.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      if (
        typeof req.body.courseRole !== "string" ||
        !courseRoles.includes(req.body.courseRole) ||
        (req.body.expiresAt !== undefined &&
          (typeof req.body.expiresAt !== "string" ||
            !app.server.locals.helpers.isDate(req.body.expiresAt) ||
            app.server.locals.helpers.isExpired(req.body.expiresAt))) ||
        typeof req.body.type !== "string" ||
        !["link", "email"].includes(req.body.type)
      )
        return next("Validation");

      switch (req.body.type) {
        case "link":
          const invitation = app.database.get<{ reference: string }>(
            sql`
              INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "courseRole")
              VALUES (
                ${new Date().toISOString()},
                ${req.body.expiresAt},
                ${res.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${req.body.courseRole}
              )
              RETURNING *
          `
          )!;

          app.server.locals.helpers.Flash.set({
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
          if (typeof req.body.emails !== "string") return next("Validation");
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
                email.match(app.server.locals.helpers.emailRegExp) === null
            )
          )
            return next("Validation");

          for (const { email, name } of emails) {
            if (
              app.database.get<{}>(
                sql`
                  SELECT TRUE
                  FROM "enrollments"
                  JOIN "users" ON
                    "enrollments"."user" = "users"."id" AND
                    "users"."email" = ${email}
                  WHERE "enrollments"."course" = ${res.locals.course.id}
                `
              ) !== undefined
            )
              continue;

            const existingUnusedInvitation = app.database.get<{
              id: number;
              name: string | null;
            }>(
              sql`
                SELECT "id", "name"
                FROM "invitations"
                WHERE
                  "course" = ${res.locals.course.id} AND
                  "email" = ${email} AND
                  "usedAt" IS NULL
              `
            );
            if (existingUnusedInvitation !== undefined) {
              app.database.run(
                sql`
                  UPDATE "invitations"
                  SET
                    "expiresAt" = ${req.body.expiresAt},
                    "name" = ${name ?? existingUnusedInvitation.name},
                    "courseRole" = ${req.body.courseRole}
                  WHERE "id" = ${existingUnusedInvitation.id}
                `
              );
              continue;
            }

            const invitation = app.database.get<{
              id: number;
              expiresAt: string | null;
              usedAt: string | null;
              reference: string;
              email: string;
              name: string | null;
              courseRole: CourseRole;
            }>(
              sql`
                INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "email", "name", "courseRole")
                VALUES (
                  ${new Date().toISOString()},
                  ${req.body.expiresAt ?? null},
                  ${res.locals.course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${email},
                  ${name},
                  ${req.body.courseRole}
                )
                RETURNING *
              `
            )!;

            invitationMailer({
              req,
              res,
              invitation: {
                ...invitation,
                course: res.locals.course,
              },
            });
          }

          app.server.locals.helpers.Flash.set({
            req,
            res,
            theme: "green",
            content: html`Invitation emails sent successfully.`,
          });
          break;
      }

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  type InvitationExistsLocals = Application["server"]["locals"]["ResponseLocals"]["Base"] & {
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
      courseRole: CourseRole;
    };
  };
  const invitationExistsMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    InvitationExistsLocals
  >[] = [
    (req, res, next) => {
      const invitation = app.database.get<{
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
        courseRole: CourseRole;
      }>(
        sql`
          SELECT
            "invitations"."id",
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
            "invitations"."courseRole"
          FROM "invitations"
          JOIN "courses" ON
            "invitations"."course" = "courses"."id" AND
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
        courseRole: invitation.courseRole,
      };
      next();
    },
  ];

  app.server.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      courseRole?: CourseRole;
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    IsCourseStaffLocals & InvitationExistsLocals
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    ...app.server.locals.middlewares.isCourseStaff,
    ...invitationExistsMiddleware,
    (req, res, next) => {
      if (res.locals.invitation.usedAt !== null) return next("Validation");

      if (req.body.resend === "true") {
        if (
          app.server.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          res.locals.invitation.email === null
        )
          return next("Validation");
        invitationMailer({
          req,
          res,
          invitation: res.locals.invitation,
        });
        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation email resent successfully.`,
        });
      }

      if (req.body.courseRole !== undefined) {
        if (
          app.server.locals.helpers.isExpired(res.locals.invitation.expiresAt) ||
          !courseRoles.includes(req.body.courseRole)
        )
          return next("Validation");

        app.database.run(
          sql`UPDATE "invitations" SET "courseRole" = ${req.body.courseRole} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation course role updated successfully.`,
        });
      }

      if (req.body.expiresAt !== undefined) {
        if (
          typeof req.body.expiresAt !== "string" ||
          !app.server.locals.helpers.isDate(req.body.expiresAt) ||
          app.server.locals.helpers.isExpired(req.body.expiresAt)
        )
          return next("Validation");

        app.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${req.body.expiresAt} WHERE "id" = ${res.locals.invitation.id}`
        );

        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expiration updated successfully.`,
        });
      }

      if (req.body.removeExpiration === "true") {
        app.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expiration removed successfully.`,
        });
      }

      if (req.body.expire === "true") {
        app.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Invitation expired successfully.`,
        });
      }

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/invitations`
      );
    }
  );

  app.server.get<{ courseReference: string }, HTML, {}, {}, IsCourseStaffLocals>(
    "/courses/:courseReference/settings/enrollments",
    ...app.server.locals.middlewares.isCourseStaff,
    (req, res) => {
      const enrollments = app.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"];
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          reference: string;
          courseRole: CourseRole;
        }>(
          sql`
            SELECT
              "enrollments"."id",
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
              "enrollments"."courseRole"
            FROM "enrollments"
            JOIN "users" ON "enrollments"."user" = "users"."id"
            WHERE "enrollments"."course" = ${res.locals.course.id}
            ORDER BY
              "enrollments"."courseRole" ASC,
              "users"."name" ASC
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
          courseRole: enrollment.courseRole,
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
              <i class="bi bi-people-fill"></i>
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
              const action = `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
              const isSelf = enrollment.id === res.locals.enrollment.id;
              const isOnlyStaff =
                isSelf &&
                enrollments.filter(
                  (enrollment) => enrollment.courseRole === "staff"
                ).length === 1;

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
                    $${app.server.locals.partials.user({
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
                          app.server.locals.helpers.splitFilterablePhrases(
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
                            app.server.locals.helpers.splitFilterablePhrases(
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
                          class="button button--tight button--tight--inline button--transparent ${courseRoleTextColor[
                            enrollment.courseRole
                          ]}"
                          onload="${javascript`
                            (this.tooltip ??= tippy(this)).setProps({
                              touch: false,
                              content: "Update Course Role",
                            });
                            
                            (this.dropdown ??= tippy(this)).setProps({
                              trigger: "click",
                              interactive: true,
                              content: ${res.locals.html(
                                html`
                                  <div class="dropdown--menu">
                                    $${courseRoles.map(
                                      (courseRole) =>
                                        html`
                                          <form
                                            key="course-role--${courseRole}"
                                            method="PATCH"
                                            action="${action}"
                                          >
                                            <input
                                              type="hidden"
                                              name="courseRole"
                                              value="${courseRole}"
                                            />
                                            <div>
                                              <button
                                                class="dropdown--menu--item button ${courseRole ===
                                                enrollment.courseRole
                                                  ? "button--blue"
                                                  : "button--transparent"} ${courseRoleTextColor[
                                                  courseRole
                                                ]}"
                                                $${isOnlyStaff
                                                  ? html`
                                                      type="button"
                                                      onload="${javascript`
                                                        (this.tooltip ??= tippy(this)).setProps({
                                                          theme: "rose",
                                                          trigger: "click",
                                                          content: "You may not update your own course role because you’re the only staff member.",
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
                                                                key="course-role--${courseRole}"
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
                                                                  name="courseRole"
                                                                  value="${courseRole}"
                                                                />
                                                                <p>
                                                                  Are you sure
                                                                  you want to
                                                                  update your
                                                                  own course
                                                                  role to
                                                                  ${courseRole}?
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
                                                                    You may not
                                                                    undo this
                                                                    action!
                                                                  </strong>
                                                                </p>
                                                                <button
                                                                  class="button button--rose"
                                                                >
                                                                  <i
                                                                    class="bi bi-pencil-fill"
                                                                  ></i>
                                                                  Update My Own
                                                                  Course Role to
                                                                  ${lodash.capitalize(
                                                                    courseRole
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
                                                $${courseRoleIcon[courseRole][
                                                  courseRole === "staff"
                                                    ? "fill"
                                                    : "regular"
                                                ]}
                                                ${lodash.capitalize(courseRole)}
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
                          $${courseRoleIcon[enrollment.courseRole][
                            enrollment.courseRole === "staff"
                              ? "fill"
                              : "regular"
                          ]}
                          ${lodash.capitalize(enrollment.courseRole)}
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
                            $${app.server.locals.partials.content({
                              req,
                              res,
                              contentPreprocessed:
                                enrollment.user.biographyPreprocessed,
                            }).contentProcessed}
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

  type MayManageEnrollmentLocals = IsCourseStaffLocals & {
    managedEnrollment: {
      id: number;
      reference: string;
      isSelf: boolean;
    };
  };
  const mayManageEnrollmentMiddleware: express.RequestHandler<
    { courseReference: string; enrollmentReference: string },
    any,
    {},
    {},
    MayManageEnrollmentLocals
  >[] = [
    ...app.server.locals.middlewares.isCourseStaff,
    (req, res, next) => {
      const managedEnrollment = app.database.get<{
        id: number;
        reference: string;
      }>(
        sql`
          SELECT "id", "reference"
          FROM "enrollments"
          WHERE
            "course" = ${res.locals.course.id} AND
            "reference" = ${req.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next("route");
      res.locals.managedEnrollment = {
        ...managedEnrollment,
        isSelf: managedEnrollment.id === res.locals.enrollment.id,
      };
      if (
        res.locals.managedEnrollment.isSelf &&
        app.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "enrollments"
            WHERE
              "course" = ${res.locals.course.id} AND
              "courseRole" = ${"staff"}
          `
        )!.count === 1
      )
        return next("Validation");
      next();
    },
  ];

  app.server.patch<
    { courseReference: string; enrollmentReference: string },
    HTML,
    { courseRole?: CourseRole },
    {},
    MayManageEnrollmentLocals
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...mayManageEnrollmentMiddleware,
    (req, res, next) => {
      if (typeof req.body.courseRole === "string") {
        if (!courseRoles.includes(req.body.courseRole))
          return next("Validation");
        app.database.run(
          sql`UPDATE "enrollments" SET "courseRole" = ${req.body.courseRole} WHERE "id" = ${res.locals.managedEnrollment.id}`
        );

        app.server.locals.helpers.Flash.set({
          req,
          res,
          theme: "green",
          content: html`Enrollment updated successfully.`,
        });
      }

      res.redirect(
        303,
        res.locals.managedEnrollment.isSelf
          ? `https://${app.configuration.hostname}/courses/${res.locals.course.reference}`
          : `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/enrollments`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.delete<
    { courseReference: string; enrollmentReference: string },
    HTML,
    {},
    {},
    MayManageEnrollmentLocals
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    ...mayManageEnrollmentMiddleware,
    (req, res) => {
      app.database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${res.locals.managedEnrollment.id}`
      );

      app.server.locals.helpers.Flash.set({
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
          ? `https://${app.configuration.hostname}/`
          : `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/enrollments`
      );

      app.server.locals.helpers.liveUpdates({ req, res });
    }
  );

  app.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...app.server.locals.middlewares.isEnrolledInCourse,
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
              <i class="bi bi-person-fill"></i>
              Your Enrollment
            </h2>

            <form
              method="PATCH"
              action="https://${app.configuration.hostname}/courses/${res.locals
                .course.reference}/settings/your-enrollment"
              novalidate
              css="${res.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
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

  app.server.patch<
    { courseReference: string },
    HTML,
    { accentColor?: EnrollmentAccentColor },
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/your-enrollment",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    (req, res, next) => {
      if (
        typeof req.body.accentColor !== "string" ||
        !enrollmentAccentColors.includes(req.body.accentColor)
      )
        return next("Validation");

      app.database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${req.body.accentColor} WHERE "id" = ${res.locals.enrollment.id}`
      );

      app.server.locals.helpers.Flash.set({
        req,
        res,
        theme: "green",
        content: html`Enrollment updated successfully.`,
      });

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${res.locals.course.reference}/settings/your-enrollment`
      );
    }
  );

  type IsInvitationUsableLocals = Application["server"]["locals"]["ResponseLocals"]["Base"] &
    Omit<Partial<Application["server"]["locals"]["ResponseLocals"]["Base"]>, keyof Application["server"]["locals"]["ResponseLocals"]["Base"]> &
    Omit<Partial<Application["server"]["locals"]["ResponseLocals"]["SignedIn"]>, keyof Application["server"]["locals"]["ResponseLocals"]["Base"]> &
    Omit<Partial<Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]>, keyof Application["server"]["locals"]["ResponseLocals"]["Base"]> &
    InvitationExistsLocals;
  const isInvitationUsableMiddleware: express.RequestHandler<
    { courseReference: string; invitationReference: string },
    any,
    {},
    { redirect?: string },
    IsInvitationUsableLocals
  >[] = [
    ...invitationExistsMiddleware,
    asyncHandler(async (req, res, next) => {
      if (
        res.locals.invitation.email !== null &&
        res.locals.user !== undefined &&
        res.locals.invitation.email.toLowerCase() !==
          res.locals.user.email.toLowerCase()
      )
        return res.send(
          app.server.locals.layouts.box({
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
              $${app.server.locals.partials.course({
                req,
                res,
                course: res.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation is for another email address.
              </p>
              <p>
                You’re signed in with the email address
                <code class="code">${res.locals.user.email}</code>, and this
                invitation is for the email address
                <code class="code">${res.locals.invitation.email}</code>.
              </p>
            `,
          })
        );

      if (res.locals.invitation.usedAt !== null)
        return res.send(
          app.server.locals.layouts.box({
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
              $${app.server.locals.partials.course({
                req,
                res,
                course: res.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">This invitation has already been used.</p>
            `,
          })
        );

      if (app.server.locals.helpers.isExpired(res.locals.invitation.expiresAt))
        return res.send(
          app.server.locals.layouts.box({
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
              $${app.server.locals.partials.course({
                req,
                res,
                course: res.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation is expired. Please contact your course staff.
              </p>
            `,
          })
        );

      if (res.locals.enrollment !== undefined)
        if (typeof req.query.redirect === "string")
          return res.redirect(
            303,
            `https://${app.configuration.hostname}/courses/${res.locals.invitation.course.reference}/${req.query.redirect}`
          );
        else {
          const link = `https://${app.configuration.hostname}/courses/${res.locals.invitation.course.reference}/invitations/${res.locals.invitation.reference}`;
          return res.send(
            app.server.locals.layouts.box({
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
                $${app.server.locals.partials.course({
                  req,
                  res,
                  course: res.locals.invitation.course,
                })}
                <hr class="separator" />
                <p class="strong">You’re already enrolled.</p>

                $${res.locals.invitation.email === null
                  ? html`
                      <p>
                        You may share this invitation with other people by
                        asking them to point their phone camera at the following
                        QR Code:
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
                            `https://${app.configuration.hostname}/courses/${res.locals.invitation.course.reference}/invitations/${res.locals.invitation.reference}`,
                            { type: "svg" }
                          )
                        )
                          .replace("#000000", "currentColor")
                          .replace("#ffffff", "transparent")}
                      </div>
                    `
                  : html``}

                <a
                  href="https://${app.configuration.hostname}/courses/${res
                    .locals.invitation.course.reference}"
                  class="button button--blue"
                >
                  Go to ${res.locals.invitation.course.name}
                  <i class="bi bi-chevron-right"></i>
                </a>
              `,
            })
          );
        }

      next();
    }),
  ];

  app.server.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & IsInvitationUsableLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    ...isInvitationUsableMiddleware
  );

  app.server.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & IsInvitationUsableLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.server.locals.middlewares.isSignedIn,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        app.server.locals.layouts.box({
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
            $${app.server.locals.partials.course({
              req,
              res,
              course: res.locals.invitation.course,
            })}
            <form
              method="POST"
              action="https://${app.configuration.hostname}/courses/${res.locals
                .invitation.course.reference}/invitations/${res.locals
                .invitation.reference}${qs.stringify(
                { redirect: req.query.redirect },
                { addQueryPrefix: true }
              )}"
            >
              <button
                class="button button--blue"
                css="${res.locals.css(css`
                  width: 100%;
                `)}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Enroll as ${lodash.capitalize(res.locals.invitation.courseRole)}
              </button>
            </form>
          `,
        })
      );
    }
  );

  app.server.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & IsInvitationUsableLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.server.locals.middlewares.isEnrolledInCourse,
    ...isInvitationUsableMiddleware
  );

  app.server.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & IsInvitationUsableLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.server.locals.middlewares.isSignedIn,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      app.database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${res.locals.user.id},
            ${res.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${res.locals.invitation.courseRole},
            ${defaultAccentColor({ req, res })}
          )
        `
      );
      if (res.locals.invitation.email !== null)
        app.database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${res.locals.invitation.id}
          `
        );

      res.redirect(
        303,
        `https://${app.configuration.hostname}/courses/${
          res.locals.invitation.course.reference
        }/${typeof req.query.redirect === "string" ? req.query.redirect : ""}`
      );
    }
  );

  app.server.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"] & IsInvitationUsableLocals
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    ...app.server.locals.middlewares.isSignedOut,
    ...isInvitationUsableMiddleware,
    (req, res) => {
      res.send(
        app.server.locals.layouts.box({
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
            $${app.server.locals.partials.course({
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
              $${(() => {
                let buttons = html``;

                const hasInvitationEmail = res.locals.invitation.email !== null;
                const invitationUserExists =
                  hasInvitationEmail &&
                  app.database.get<{}>(
                    sql`
                      SELECT TRUE
                      FROM "users"
                      WHERE "email" = ${res.locals.invitation.email}
                    `
                  ) !== undefined;

                if (!hasInvitationEmail || !invitationUserExists)
                  buttons += html`
                    <a
                      href="https://${app.configuration
                        .hostname}/sign-up${qs.stringify(
                        {
                          redirect: req.originalUrl.slice(1),
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
                  `;

                if (!hasInvitationEmail || invitationUserExists)
                  buttons += html`
                    <a
                      href="https://${app.configuration
                        .hostname}/sign-in${qs.stringify(
                        {
                          redirect: req.originalUrl.slice(1),
                          invitation: {
                            email: res.locals.invitation.email ?? undefined,
                            name: res.locals.invitation.name ?? undefined,
                          },
                        },
                        { addQueryPrefix: true }
                      )}"
                      class="button ${invitationUserExists
                        ? "button--blue"
                        : "button--transparent"}"
                    >
                      <i class="bi bi-box-arrow-in-right"></i>
                      Sign in
                    </a>
                  `;

                return buttons;
              })()}
            </div>
          `,
        })
      );
    }
  );

  app.server.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    (req, res) => {
      res.send(
        app.server.locals.layouts.box({
          req,
          res,
          head: html` <title>Invitation · Courselore</title> `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>

            <p>Invitation not found. Please contact your course staff.</p>
          `,
        })
      );
    }
  );
};
