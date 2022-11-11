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
import { Application } from "./index.mjs";

export type ApplicationCourse = {
  server: {
    locals: {
      Types: {
        Enrollment: {
          id: number;
          user: Application["server"]["locals"]["Types"]["User"];
          reference: string;
          courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
        };
        MaybeEnrollment:
          | Application["server"]["locals"]["Types"]["Enrollment"]
          | "no-longer-enrolled";
      };
      ResponseLocals: {
        CourseEnrolled: Application["server"]["locals"]["ResponseLocals"]["SignedIn"] & {
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
      };
      partials: {
        course({
          request,
          response,
          course,
          enrollment,
          tight,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["Base"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["Base"]
          >;
          course: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number]["course"];
          enrollment?: Application["server"]["locals"]["ResponseLocals"]["SignedIn"]["enrollments"][number];
          tight?: boolean;
        }): HTML;
        courses({
          request,
          response,
          tight,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["SignedIn"] &
              Partial<
                Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
              >
          >;
          tight?: boolean;
        }): HTML;
        courseArchived({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["server"]["locals"]["ResponseLocals"]["Base"]
          >;
          response: express.Response<
            any,
            Application["server"]["locals"]["ResponseLocals"]["Base"]
          >;
        }): HTML;
      };
      helpers: {
        courseRoles: ["student", "staff"];
        enrollmentAccentColors: [
          "red",
          "yellow",
          "emerald",
          "sky",
          "violet",
          "pink"
        ];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.server.locals.partials.course = ({
    request,
    response,
    course,
    enrollment = undefined,
    tight = false,
  }) => html`
    <div
      key="partial--course--${course.reference}"
      css="${response.locals.css(css`
        display: flex;
        gap: var(--space--2);
        align-items: baseline;
      `)}"
    >
      <div>
        <div
          class="button button--tight ${tight ? "button--tight--inline" : ""}"
          css="${response.locals.css(css`
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
          css="${response.locals.css(css`
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
                <div>
                  $${application.server.locals.partials.courseArchived({
                    request,
                    response,
                  })}
                </div>
              `
            : html``}
        </div>
      </div>
    </div>
  `;

  application.server.locals.partials.courses = ({
    request,
    response,
    tight = false,
  }) => {
    let courses = html``;

    const [unarchived, archived] = lodash.partition(
      response.locals.enrollments,
      (enrollment) => enrollment.course.archivedAt === null
    );

    if (unarchived.length > 0)
      courses += html`
        $${unarchived.map(
          (enrollment) =>
            html`
              <a
                key="enrollment--${enrollment.reference}"
                href="https://${application.configuration
                  .hostname}/courses/${enrollment.course.reference}"
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                response.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${application.server.locals.partials.course({
                  request,
                  response,
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
          css="${response.locals.css(css`
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
                href="https://${application.configuration
                  .hostname}/courses/${enrollment.course.reference}"
                hidden
                class="dropdown--menu--item menu-box--item button ${tight
                  ? ""
                  : "button--tight"} ${enrollment.id ===
                response.locals.enrollment?.id
                  ? "button--blue"
                  : "button--transparent"}"
              >
                $${application.server.locals.partials.course({
                  request,
                  response,
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

  application.server.locals.partials.courseArchived = ({
    request,
    response,
  }) => html`
    <div
      class="strong text--rose"
      css="${response.locals.css(css`
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

  application.server.locals.helpers.courseRoles = ["student", "staff"];

  application.server.locals.helpers.enrollmentAccentColors = [
    "red",
    "yellow",
    "emerald",
    "sky",
    "violet",
    "pink",
  ];

  const courseRoleIcon: {
    [courseRole in Application["server"]["locals"]["helpers"]["courseRoles"][number]]: {
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
    [courseRole in Application["server"]["locals"]["helpers"]["courseRoles"][number]]: string;
  } = {
    student: "",
    staff: "text--sky",
  };

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    switch (response.locals.enrollments.length) {
      case 0:
        response.send(
          application.server.locals.layouts.main({
            request,
            response,
            head: html`<title>Courselore</title>`,
            body: html`
              <div
                css="${response.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                  align-items: center;
                `)}"
              >
                <h2 class="heading--display">Welcome to Courselore!</h2>

                <div class="decorative-icon">
                  $${application.server.locals.partials.logo({
                    size: 144 /* var(--space--36) */,
                  })}
                </div>

                <div class="menu-box">
                  <a
                    href="https://${application.configuration
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
                  $${response.locals.mayCreateCourses
                    ? html`
                        <a
                          href="https://${application.configuration
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
        response.redirect(
          303,
          `https://${application.configuration.hostname}/courses/${response.locals.enrollments[0].course.reference}`
        );
        break;

      default:
        response.send(
          application.server.locals.layouts.main({
            request,
            response,
            head: html`<title>Courselore</title>`,
            showCourseSwitcher: false,
            body: html`
              <div
                css="${response.locals.css(css`
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
                  css="${response.locals.css(css`
                    max-width: var(--space--80);
                  `)}"
                >
                  $${application.server.locals.partials.courses({
                    request,
                    response,
                  })}
                </div>
              </div>
            `,
          })
        );
        break;
    }
  });

  application.server.get<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/courses/new", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      !response.locals.mayCreateCourses
    )
      return next();

    response.send(
      application.server.locals.layouts.main({
        request,
        response,
        head: html`<title>Create a New Course · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-journal-plus"></i>
            Create a New Course
          </h2>

          <form
            method="POST"
            action="https://${application.configuration.hostname}/courses"
            novalidate
            css="${response.locals.css(css`
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
              css="${response.locals.css(css`
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
                value="${response.locals.enrollments.length > 0
                  ? response.locals.enrollments[
                      response.locals.enrollments.length - 1
                    ].course.institution ?? ""
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
  });

  application.server.post<
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
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/courses", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      !response.locals.mayCreateCourses
    )
      return next();

    if (
      typeof request.body.name !== "string" ||
      request.body.name.trim() === "" ||
      !["string", "undefined"].includes(typeof request.body.year) ||
      !["string", "undefined"].includes(typeof request.body.term) ||
      !["string", "undefined"].includes(typeof request.body.institution) ||
      !["string", "undefined"].includes(typeof request.body.code)
    )
      return next("Validation");

    const course = application.database.executeTransaction(() => {
      const course = application.database.get<{
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
            ${request.body.name},
            ${
              typeof request.body.year === "string" &&
              request.body.year.trim() !== ""
                ? request.body.year
                : null
            },
            ${
              typeof request.body.term === "string" &&
              request.body.term.trim() !== ""
                ? request.body.term
                : null
            },
            ${
              typeof request.body.institution === "string" &&
              request.body.institution.trim() !== ""
                ? request.body.institution
                : null
            },
            ${
              typeof request.body.code === "string" &&
              request.body.code.trim() !== ""
                ? request.body.code
                : null
            },
            ${1}
          )
          RETURNING *
        `
      )!;
      application.database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"staff"},
            ${defaultAccentColor({ request, response })}
          )
        `
      );
      return course;
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${course.reference}`
    );
  });

  const defaultAccentColor = ({
    request,
    response,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    response: express.Response<
      any,
      Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
  }): Application["server"]["locals"]["helpers"]["enrollmentAccentColors"][number] => {
    const accentColorsAvailable = new Set(
      application.server.locals.helpers.enrollmentAccentColors
    );
    for (const enrollment of response.locals.enrollments) {
      accentColorsAvailable.delete(enrollment.accentColor);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  };

  application.server.use<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    const enrollment = response.locals.enrollments.find(
      (enrollment) =>
        enrollment.course.reference === request.params.courseReference
    );
    if (enrollment === undefined) return next();
    response.locals.enrollment = enrollment;
    response.locals.course = enrollment.course;

    response.locals.courseEnrollmentsCount = application.database.get<{
      count: number;
    }>(
      sql`
        SELECT COUNT(*) AS "count"
        FROM "enrollments"
        WHERE "course" = ${response.locals.course.id}
      `
    )!.count;

    response.locals.conversationsCount = application.database.get<{
      count: number;
    }>(
      sql`
        SELECT COUNT(*) AS "count"
        FROM "conversations"
        WHERE
          "course" = ${response.locals.course.id} AND (
            "conversations"."participants" = 'everyone' $${
              response.locals.enrollment.courseRole === "staff"
                ? sql`OR "conversations"."participants" = 'staff'`
                : sql``
            } OR EXISTS(
              SELECT TRUE
              FROM "conversationSelectedParticipants"
              WHERE
                "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                "conversationSelectedParticipants"."enrollment" = ${
                  response.locals.enrollment.id
                }
            )
          )
      `
    )!.count;

    response.locals.tags = application.database.all<{
      id: number;
      reference: string;
      name: string;
      staffOnlyAt: string | null;
    }>(
      sql`
        SELECT "id", "reference", "name", "staffOnlyAt"
        FROM "tags"
        WHERE
          "course" = ${response.locals.course.id}
          $${
            response.locals.enrollment.courseRole === "student"
              ? sql`AND "staffOnlyAt" IS NULL`
              : sql``
          }
        ORDER BY "id" ASC
      `
    );

    next();
  });

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference", (request, response, next) => {
    if (response.locals.course === undefined) return next();

    if (response.locals.conversationsCount === 0)
      return response.send(
        application.server.locals.layouts.main({
          request,
          response,
          head: html`<title>
            ${response.locals.course.name} · Courselore
          </title>`,
          body: html`
            <div
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                align-items: center;
              `)}"
            >
              <h2 class="heading--display">
                Welcome to ${response.locals.course.name}!
              </h2>

              <div class="decorative-icon">
                <i class="bi bi-journal-text"></i>
              </div>

              <div class="menu-box">
                $${response.locals.enrollment.courseRole === "staff"
                  ? html`
                      <a
                        href="https://${application.configuration
                          .hostname}/courses/${response.locals.course
                          .reference}/settings/tags"
                        class="menu-box--item button button--blue"
                      >
                        <i class="bi bi-sliders"></i>
                        Configure the Course
                      </a>
                    `
                  : html``}
                <a
                  href="https://${application.configuration
                    .hostname}/courses/${response.locals.course
                    .reference}/conversations/new${qs.stringify(
                    {
                      newConversation: {
                        type:
                          response.locals.enrollment.courseRole === "staff"
                            ? "note"
                            : "question",
                      },
                    },
                    { addQueryPrefix: true }
                  )}"
                  class="menu-box--item button ${response.locals.enrollment
                    .courseRole === "staff"
                    ? "button--transparent"
                    : "button--blue"}"
                >
                  $${response.locals.enrollment.courseRole === "staff"
                    ? html`<i class="bi bi-chat-text"></i>`
                    : html`<i class="bi bi-chat-text-fill"></i>`}
                  Start the First Conversation
                </a>
              </div>
            </div>
          `,
        })
      );

    response.send(
      application.server.locals.layouts.conversation({
        request,
        response,
        head: html`<title>${response.locals.course.name} · Courselore</title>`,
        sidebarOnSmallScreen: true,
        body: html`<p class="secondary">No conversation selected.</p>`,
      })
    );
  });

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference/settings", (request, response, next) => {
    if (response.locals.course === undefined) return next();

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${
        response.locals.course.reference
      }/settings/${
        response.locals.enrollment.courseRole === "staff"
          ? "course-information"
          : "your-enrollment"
      }`
    );
  });

  const layoutCourseSettings = ({
    request,
    response,
    head,
    body,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    response: express.Response<
      any,
      Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    application.server.locals.layouts.settings({
      request,
      response,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `,
      menu:
        response.locals.enrollment.courseRole === "staff"
          ? html`
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/course-information"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/course-information\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-journal-text"></i>
                Course Information
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/tags"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/tags\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(/\/settings\/tags\/?$/i)
                    ? "bi-tags-fill"
                    : "bi-tags"}"
                ></i>
                Tags
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/invitations"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/invitations\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(/\/settings\/invitations\/?$/i)
                    ? "bi-person-plus-fill"
                    : "bi-person-plus"}"
                ></i>
                Invitations
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/enrollments"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/enrollments\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(/\/settings\/enrollments\/?$/i)
                    ? "bi-people-fill"
                    : "bi-people"}"
                ></i>
                Enrollments
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/your-enrollment"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/your-enrollment\/?$/i
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(
                    /\/settings\/your-enrollment\/?$/i
                  )
                    ? "bi-person-fill"
                    : "bi-person"}"
                ></i>
                Your Enrollment
              </a>
            `
          : html``,
      body,
    });

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/course-information",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Course Information · Course Settings ·
              ${response.locals.course.name} · Courselore
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
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/course-information"
              novalidate
              css="${response.locals.css(css`
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
                  value="${response.locals.course.name}"
                  required
                  autocomplete="off"
                  class="input--text"
                />
              </label>
              <div
                css="${response.locals.css(css`
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
                    value="${response.locals.course.year ?? ""}"
                    autocomplete="off"
                    class="input--text"
                  />
                </label>
                <label class="label">
                  <p class="label--text">Term</p>
                  <input
                    type="text"
                    name="term"
                    value="${response.locals.course.term ?? ""}"
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
                  value="${response.locals.course.institution ?? ""}"
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
                  value="${response.locals.course.code ?? ""}"
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
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/course-information"
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--1);
              `)}"
            >
              $${response.locals.course.archivedAt === null
                ? html`
                    <div
                      css="${response.locals.css(css`
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
                        css="${response.locals.css(css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `)}"
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            trigger: "click",
                            interactive: true,
                            content: ${response.locals.html(html`
                              <div
                                css="${response.locals.css(css`
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
                      css="${response.locals.css(css`
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
                        css="${response.locals.css(css`
                          font-size: var(--font-size--xs);
                          line-height: var(--line-height--xs);
                        `)}"
                        onload="${javascript`
                          (this.tooltip ??= tippy(this)).setProps({
                            trigger: "click",
                            interactive: true,
                            content: ${response.locals.html(html`
                              <div
                                css="${response.locals.css(css`
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
                      css="${response.locals.css(css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `)}"
                    >
                      <span>
                        Archived
                        <time
                          datetime="${new Date(
                            response.locals.course.archivedAt
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

  application.server.patch<
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
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/course-information",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      if (
        response.locals.course.archivedAt !== null &&
        !(
          typeof request.body.isArchived === "string" &&
          request.body.name === undefined &&
          request.body.year === undefined &&
          request.body.term === undefined &&
          request.body.institution === undefined &&
          request.body.code === undefined
        )
      ) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            This action isn’t allowed because the course is archived, which
            means it’s read-only.
          `,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
        );
      }

      if (
        (typeof request.body.isArchived !== "string" &&
          (typeof request.body.name !== "string" ||
            request.body.name.trim() === "" ||
            !["string", "undefined"].includes(typeof request.body.year) ||
            !["string", "undefined"].includes(typeof request.body.term) ||
            !["string", "undefined"].includes(
              typeof request.body.institution
            ) ||
            !["string", "undefined"].includes(typeof request.body.code))) ||
        (typeof request.body.isArchived === "string" &&
          !["true", "false"].includes(request.body.isArchived))
      )
        return next("Validation");

      if (typeof request.body.isArchived !== "string") {
        application.database.run(
          sql`
            UPDATE "courses"
            SET
              "name" = ${request.body.name},
              "year" = ${
                typeof request.body.year === "string" &&
                request.body.year.trim() !== ""
                  ? request.body.year
                  : null
              },
              "term" = ${
                typeof request.body.term === "string" &&
                request.body.term.trim() !== ""
                  ? request.body.term
                  : null
              },
              "institution" = ${
                typeof request.body.institution === "string" &&
                request.body.institution.trim() !== ""
                  ? request.body.institution
                  : null
              },
              "code" = ${
                typeof request.body.code === "string" &&
                request.body.code.trim() !== ""
                  ? request.body.code
                  : null
              }
            WHERE "id" = ${response.locals.course.id}
          `
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Course information updated successfully.`,
        });
      } else {
        application.database.run(
          sql`
            UPDATE "courses"
            SET "archivedAt" = ${
              request.body.isArchived === "true"
                ? new Date().toISOString()
                : null
            }
            WHERE "id" = ${response.locals.course.id}
          `
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`
            Course
            ${request.body.isArchived === "true" ? "archived" : "unarchived"}
            successfully.
          `,
        });
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/course-information`
      );

      for (const port of application.ports.serverEvents)
        got
          .post(`http://127.0.0.1:${port}/live-updates`, {
            form: { url: `/courses/${response.locals.course.reference}` },
          })
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES ",
              "ERROR EMITTING POST EVENT",
              error
            );
          });
    }
  );

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference/settings/tags", (request, response, next) => {
    if (
      response.locals.course === undefined ||
      response.locals.enrollment.courseRole !== "staff"
    )
      return next();

    response.send(
      layoutCourseSettings({
        request,
        response,
        head: html`
          <title>
            Tags · Course Settings · ${response.locals.course.name} · Courselore
          </title>
        `,
        body: html`
          <h2 class="heading">
            <i class="bi bi-sliders"></i>
            Course Settings ·
            <i class="bi bi-tags-fill"></i>
            Tags
          </h2>

          $${response.locals.tags.length === 0
            ? html`
                <div
                  css="${response.locals.css(css`
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
            action="https://${application.configuration
              .hostname}/courses/${response.locals.course
              .reference}/settings/tags"
            novalidate
            css="${response.locals.css(css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `)}"
          >
            <div
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `)}"
            >
              <div
                class="tags"
                css="${response.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
              >
                $${response.locals.tags.map(
                  (tag, index) => html`
                    <div
                      key="tag--${tag.reference}"
                      class="tag"
                      css="${response.locals.css(css`
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
                        css="${response.locals.css(css`
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
                          css="${response.locals.css(css`
                            display: flex;
                            flex-wrap: wrap;
                            column-gap: var(--space--4);
                            row-gap: var(--space--2);
                          `)}"
                        >
                          <div
                            css="${response.locals.css(css`
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
                            css="${response.locals.css(css`
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
                                  content: ${response.locals.html(
                                    html`
                                      <div
                                        css="${response.locals.css(css`
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
                                            css="${response.locals.css(css`
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
                            css="${response.locals.css(css`
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
                          $${response.locals.conversationsCount > 0
                            ? html`
                                <a
                                  href="https://${application.configuration
                                    .hostname}/courses/${response.locals.course
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
                css="${response.locals.css(css`
                  display: flex;
                  justify-content: center;
                `)}"
              >
                <button
                  type="button"
                  class="button button--transparent button--full-width-on-small-screen"
                  onload="${javascript`
                    const newTagPartial = ${response.locals.html(
                      html`
                        <div
                          class="tag"
                          css="${response.locals.css(css`
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
                            css="${response.locals.css(css`
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
                              css="${response.locals.css(css`
                                display: flex;
                                flex-wrap: wrap;
                                column-gap: var(--space--4);
                                row-gap: var(--space--2);
                              `)}"
                            >
                              <div
                                css="${response.locals.css(css`
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
  });

  application.server.put<
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
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >("/courses/:courseReference/settings/tags", (request, response, next) => {
    if (
      response.locals.course === undefined ||
      response.locals.enrollment.courseRole !== "staff"
    )
      return next();

    if (response.locals.course.archivedAt !== null) {
      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "rose",
        content: html`
          This action isn’t allowed because the course is archived, which means
          it’s read-only.
        `,
      });
      return response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
      );
    }

    if (
      !Array.isArray(request.body.tags) ||
      request.body.tags.length === 0 ||
      request.body.tags.some(
        (tag) =>
          (tag.reference === undefined &&
            (typeof tag.name !== "string" ||
              tag.name.trim() === "" ||
              ![undefined, "on"].includes(tag.isStaffOnly))) ||
          (tag.reference !== undefined &&
            (!response.locals.tags.some(
              (existingTag) => tag.reference === existingTag.reference
            ) ||
              (tag.delete !== "true" &&
                (typeof tag.name !== "string" ||
                  tag.name.trim() === "" ||
                  ![undefined, "on"].includes(tag.isStaffOnly)))))
      )
    )
      return next("Validation");

    for (const tag of request.body.tags)
      if (tag.reference === undefined)
        application.database.run(
          sql`
            INSERT INTO "tags" ("createdAt", "course", "reference", "name", "staffOnlyAt")
            VALUES (
              ${new Date().toISOString()},
              ${response.locals.course.id},
              ${cryptoRandomString({ length: 10, type: "numeric" })},
              ${tag.name},
              ${tag.isStaffOnly === "on" ? new Date().toISOString() : null}
            )
          `
        );
      else if (tag.delete === "true")
        application.database.run(
          sql`
            DELETE FROM "tags" WHERE "reference" = ${tag.reference}
          `
        );
      else
        application.database.run(
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

    application.server.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`Tags updated successfully.`,
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/tags`
    );

    for (const port of application.ports.serverEvents)
      got
        .post(`http://127.0.0.1:${port}/live-updates`, {
          form: { url: `/courses/${response.locals.course.reference}` },
        })
        .catch((error) => {
          response.locals.log(
            "LIVE-UPDATES ",
            "ERROR EMITTING POST EVENT",
            error
          );
        });
  });

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/invitations",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      const invitations = application.database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
      }>(
        sql`
          SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "courseRole"
          FROM "invitations"
          WHERE "course" = ${response.locals.course.id}
          ORDER BY "id" DESC
        `
      );

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Invitations · Course Settings · ${response.locals.course.name} ·
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
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/invitations"
              novalidate
              css="${response.locals.css(css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `)}"
            >
              <div class="label">
                <p class="label--text">Type</p>
                <div
                  css="${response.locals.css(css`
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
                        content: ${response.locals.html(
                          html`
                            <div
                              css="${response.locals.css(css`
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
                  css="${response.locals.css(css`
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
                  css="${response.locals.css(css`
                    display: flex;
                    gap: var(--space--8);
                  `)}"
                >
                  $${application.server.locals.helpers.courseRoles.map(
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
                  css="${response.locals.css(css`
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
                    const action = `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/invitations/${invitation.reference}`;
                    const isInvitationExpired =
                      application.server.locals.helpers.isExpired(
                        invitation.expiresAt
                      );
                    const isUsed = invitation.usedAt !== null;

                    return html`
                      <div
                        key="invitation--${invitation.reference}"
                        css="${response.locals.css(css`
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
                          css="${response.locals.css(css`
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
                                          const link = `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/invitations/${invitation.reference}`;
                                          return response.locals.html(
                                            html`
                                              <div
                                                css="${response.locals.css(css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `)}"
                                              >
                                                $${isInvitationExpired
                                                  ? html`
                                                      <p
                                                        class="text--rose"
                                                        css="${response.locals
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
                                                  css="${response.locals
                                                    .css(css`
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
                                                    css="${response.locals
                                                      .css(css`
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
                                    css="${response.locals.css(css`
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
                                        content: ${response.locals.html(
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
                                      css="${response.locals.css(css`
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
                            css="${response.locals.css(css`
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `)}"
                          >
                            <div
                              css="${response.locals.css(css`
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
                                    content: ${response.locals.html(
                                      html`
                                        <div class="dropdown--menu">
                                          $${application.server.locals.helpers.courseRoles.map(
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
                              css="${response.locals.css(css`
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
                                    css="${response.locals.css(css`
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
                                          css="${response.locals.css(css`
                                            cursor: default;
                                          `)}"
                                          onload="${javascript`
                                            (this.tooltip ??= tippy(this)).setProps({
                                              interactive: true,
                                              content: ${response.locals.html(
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
                                              content: ${response.locals.html(
                                                html`
                                                  <div
                                                    css="${response.locals
                                                      .css(css`
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
                                              content: ${response.locals.html(
                                                html`
                                                  <div
                                                    css="${response.locals
                                                      .css(css`
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
                                              content: ${response.locals.html(
                                                html`
                                                  <div
                                                    css="${response.locals
                                                      .css(css`
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

  const sendInvitationEmail = ({
    request,
    response,
    invitation,
  }: {
    request: express.Request<
      {},
      any,
      {},
      {},
      Application["server"]["locals"]["ResponseLocals"]["Base"]
    >;
    response: express.Response<
      any,
      Application["server"]["locals"]["ResponseLocals"]["Base"]
    >;
    invitation: ResponseLocalsInvitation["invitation"];
  }): void => {
    const link = `https://${application.configuration.hostname}/courses/${invitation.course.reference}/invitations/${invitation.reference}`;
    application.database.run(
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
              name: `${invitation.course.name} · ${application.configuration.email.defaults.from.name}`,
              address: application.configuration.email.defaults.from.address,
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

  application.server.post<
    { courseReference: string },
    HTML,
    {
      type?: "link" | "email";
      courseRole?: Application["server"]["locals"]["helpers"]["courseRoles"][number];
      expiresAt?: string;
      emails?: string;
    },
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/invitations",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      if (response.locals.course.archivedAt !== null) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            This action isn’t allowed because the course is archived, which
            means it’s read-only.
          `,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
        );
      }

      if (
        typeof request.body.courseRole !== "string" ||
        !application.server.locals.helpers.courseRoles.includes(
          request.body.courseRole
        ) ||
        (request.body.expiresAt !== undefined &&
          (typeof request.body.expiresAt !== "string" ||
            !application.server.locals.helpers.isDate(request.body.expiresAt) ||
            application.server.locals.helpers.isExpired(
              request.body.expiresAt
            ))) ||
        typeof request.body.type !== "string" ||
        !["link", "email"].includes(request.body.type)
      )
        return next("Validation");

      switch (request.body.type) {
        case "link":
          const invitation = application.database.get<{ reference: string }>(
            sql`
              INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "courseRole")
              VALUES (
                ${new Date().toISOString()},
                ${request.body.expiresAt},
                ${response.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${request.body.courseRole}
              )
              RETURNING *
          `
          )!;

          application.server.locals.helpers.Flash.set({
            request,
            response,
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
          if (typeof request.body.emails !== "string")
            return next("Validation");
          const emails: { email: string; name: string | null }[] = [];
          for (let email of request.body.emails.split(/[,\n]/)) {
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
                email.match(application.server.locals.helpers.emailRegExp) ===
                null
            )
          )
            return next("Validation");

          for (const { email, name } of emails) {
            if (
              application.database.get<{}>(
                sql`
                  SELECT TRUE
                  FROM "enrollments"
                  JOIN "users" ON
                    "enrollments"."user" = "users"."id" AND
                    "users"."email" = ${email}
                  WHERE "enrollments"."course" = ${response.locals.course.id}
                `
              ) !== undefined
            )
              continue;

            const existingUnusedInvitation = application.database.get<{
              id: number;
              name: string | null;
            }>(
              sql`
                SELECT "id", "name"
                FROM "invitations"
                WHERE
                  "course" = ${response.locals.course.id} AND
                  "email" = ${email} AND
                  "usedAt" IS NULL
              `
            );
            if (existingUnusedInvitation !== undefined) {
              application.database.run(
                sql`
                  UPDATE "invitations"
                  SET
                    "expiresAt" = ${request.body.expiresAt},
                    "name" = ${name ?? existingUnusedInvitation.name},
                    "courseRole" = ${request.body.courseRole}
                  WHERE "id" = ${existingUnusedInvitation.id}
                `
              );
              continue;
            }

            const invitation = application.database.get<{
              id: number;
              expiresAt: string | null;
              usedAt: string | null;
              reference: string;
              email: string;
              name: string | null;
              courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
            }>(
              sql`
                INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "email", "name", "courseRole")
                VALUES (
                  ${new Date().toISOString()},
                  ${request.body.expiresAt ?? null},
                  ${response.locals.course.id},
                  ${cryptoRandomString({ length: 10, type: "numeric" })},
                  ${email},
                  ${name},
                  ${request.body.courseRole}
                )
                RETURNING *
              `
            )!;

            sendInvitationEmail({
              request,
              response,
              invitation: {
                ...invitation,
                course: response.locals.course,
              },
            });
          }

          application.server.locals.helpers.Flash.set({
            request,
            response,
            theme: "green",
            content: html`Invitation emails sent successfully.`,
          });
          break;
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/invitations`
      );
    }
  );

  type ResponseLocalsInvitation =
    Application["server"]["locals"]["ResponseLocals"]["Base"] & {
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
        courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
      };
    };

  application.server.use<
    { courseReference: string; invitationReference: string },
    any,
    {},
    {},
    ResponseLocalsInvitation
  >(
    [
      "/courses/:courseReference/settings/invitations/:invitationReference",
      "/courses/:courseReference/invitations/:invitationReference",
    ],
    (request, response, next) => {
      const invitation = application.database.get<{
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
        courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
            "courses"."reference" = ${request.params.courseReference}
          WHERE "invitations"."reference" = ${request.params.invitationReference}
        `
      );
      if (invitation === undefined) return next();
      response.locals.invitation = {
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
    }
  );

  application.server.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      courseRole?: Application["server"]["locals"]["helpers"]["courseRoles"][number];
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
      ResponseLocalsInvitation
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff" ||
        response.locals.invitation === undefined
      )
        return next();

      if (response.locals.course.archivedAt !== null) {
        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "rose",
          content: html`
            This action isn’t allowed because the course is archived, which
            means it’s read-only.
          `,
        });
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
        );
      }

      if (response.locals.invitation.usedAt !== null) return next("Validation");

      if (request.body.resend === "true") {
        if (
          application.server.locals.helpers.isExpired(
            response.locals.invitation.expiresAt
          ) ||
          response.locals.invitation.email === null
        )
          return next("Validation");

        sendInvitationEmail({
          request,
          response,
          invitation: response.locals.invitation,
        });

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation email resent successfully.`,
        });
      }

      if (request.body.courseRole !== undefined) {
        if (
          application.server.locals.helpers.isExpired(
            response.locals.invitation.expiresAt
          ) ||
          !application.server.locals.helpers.courseRoles.includes(
            request.body.courseRole
          )
        )
          return next("Validation");

        application.database.run(
          sql`UPDATE "invitations" SET "courseRole" = ${request.body.courseRole} WHERE "id" = ${response.locals.invitation.id}`
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation course role updated successfully.`,
        });
      }

      if (request.body.expiresAt !== undefined) {
        if (
          typeof request.body.expiresAt !== "string" ||
          !application.server.locals.helpers.isDate(request.body.expiresAt) ||
          application.server.locals.helpers.isExpired(request.body.expiresAt)
        )
          return next("Validation");

        application.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${request.body.expiresAt} WHERE "id" = ${response.locals.invitation.id}`
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation expiration updated successfully.`,
        });
      }

      if (request.body.removeExpiration === "true") {
        application.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${null}
            WHERE "id" = ${response.locals.invitation.id}
          `
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation expiration removed successfully.`,
        });
      }

      if (request.body.expire === "true") {
        application.database.run(
          sql`
            UPDATE "invitations"
            SET "expiresAt" = ${new Date().toISOString()}
            WHERE "id" = ${response.locals.invitation.id}
          `
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation expired successfully.`,
        });
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/invitations`
      );
    }
  );

  application.server.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] &
      ResponseLocalsInvitation
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    asyncHandler(async (request, response, next) => {
      if (response.locals.invitation === undefined)
        return response.send(
          application.server.locals.layouts.box({
            request,
            response,
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

      if (response.locals.invitation.usedAt !== null)
        return response.send(
          application.server.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                Invitation · ${response.locals.invitation.course.name} ·
                Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              $${application.server.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation has already been used. Please contact your
                course staff.
              </p>
            `,
          })
        );

      if (
        application.server.locals.helpers.isExpired(
          response.locals.invitation.expiresAt
        )
      )
        return response.send(
          application.server.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                Invitation · ${response.locals.invitation.course.name} ·
                Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              $${application.server.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation is expired. Please contact your course staff.
              </p>
            `,
          })
        );

      if (response.locals.user === undefined)
        return response.send(
          application.server.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                Invitation · ${response.locals.invitation.course.name} ·
                Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              $${application.server.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <div
                css="${response.locals.css(css`
                  display: flex;
                  gap: var(--space--4);
                  & > * {
                    flex: 1;
                  }
                `)}"
              >
                $${(() => {
                  let buttons = html``;

                  const hasInvitationEmail =
                    response.locals.invitation.email !== null;
                  const invitationUserExists =
                    hasInvitationEmail &&
                    application.database.get<{}>(
                      sql`
                        SELECT TRUE
                        FROM "users"
                        WHERE "email" = ${response.locals.invitation.email}
                      `
                    ) !== undefined;

                  if (!invitationUserExists)
                    buttons += html`
                      <a
                        href="https://${application.configuration
                          .hostname}/sign-up${qs.stringify(
                          {
                            redirect: request.originalUrl.slice(1),
                            invitation: {
                              email:
                                response.locals.invitation.email ?? undefined,
                              name:
                                response.locals.invitation.name ?? undefined,
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

                  if (!(hasInvitationEmail && !invitationUserExists))
                    buttons += html`
                      <a
                        href="https://${application.configuration
                          .hostname}/sign-in${qs.stringify(
                          {
                            redirect: request.originalUrl.slice(1),
                            invitation: {
                              email:
                                response.locals.invitation.email ?? undefined,
                              name:
                                response.locals.invitation.name ?? undefined,
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

      if (response.locals.user.emailVerifiedAt === null) return next();

      if (
        response.locals.invitation.email !== null &&
        response.locals.invitation.email.toLowerCase() !==
          response.locals.user.email.toLowerCase()
      )
        return response.send(
          application.server.locals.layouts.box({
            request,
            response,
            head: html`
              <title>
                Invitation · ${response.locals.invitation.course.name} ·
                Courselore
              </title>
            `,
            body: html`
              <h2 class="heading">
                <i class="bi bi-journal-arrow-down"></i>
                Invitation
              </h2>
              $${application.server.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation is for another email address.
              </p>
              <p>
                You’re signed in with the email address
                <code class="code">${response.locals.user.email}</code>, and
                this invitation is for the email address
                <code class="code">${response.locals.invitation.email}</code>.
              </p>
            `,
          })
        );

      if (response.locals.course !== undefined)
        if (typeof request.query.redirect === "string")
          return response.redirect(
            303,
            `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/${request.query.redirect}`
          );
        else {
          const link = `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/invitations/${response.locals.invitation.reference}`;
          return response.send(
            application.server.locals.layouts.box({
              request,
              response,
              head: html`
                <title>
                  Invitation · ${response.locals.invitation.course.name} ·
                  Courselore
                </title>
              `,
              body: html`
                <h2 class="heading">
                  <i class="bi bi-journal-arrow-down"></i>
                  Invitation
                </h2>
                $${application.server.locals.partials.course({
                  request,
                  response,
                  course: response.locals.invitation.course,
                })}
                <hr class="separator" />
                <p class="strong">You’re already enrolled.</p>

                $${response.locals.invitation.email === null
                  ? html`
                      <p>
                        You may share this invitation with other people by
                        asking them to point their phone camera at the following
                        QR Code:
                      </p>

                      <div>
                        <div
                          css="${response.locals.css(css`
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
                            css="${response.locals.css(css`
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
                            `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/invitations/${response.locals.invitation.reference}`,
                            { type: "svg" }
                          )
                        )
                          .replace("#000000", "currentColor")
                          .replace("#ffffff", "transparent")}
                      </div>
                    `
                  : html``}

                <a
                  href="https://${application.configuration
                    .hostname}/courses/${response.locals.invitation.course
                    .reference}"
                  class="button button--blue"
                >
                  Go to ${response.locals.invitation.course.name}
                  <i class="bi bi-chevron-right"></i>
                </a>
              `,
            })
          );
        }

      response.send(
        application.server.locals.layouts.box({
          request,
          response,
          head: html`
            <title>
              Invitation · ${response.locals.invitation.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-journal-arrow-down"></i>
              Invitation
            </h2>
            $${application.server.locals.partials.course({
              request,
              response,
              course: response.locals.invitation.course,
            })}
            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.invitation.course
                .reference}/invitations/${response.locals.invitation
                .reference}${qs.stringify(
                { redirect: request.query.redirect },
                { addQueryPrefix: true }
              )}"
            >
              <button
                class="button button--blue"
                css="${response.locals.css(css`
                  width: 100%;
                `)}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Enroll as
                ${lodash.capitalize(response.locals.invitation.courseRole)}
              </button>
            </form>
          `,
        })
      );
    })
  );

  application.server.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"] &
      Partial<
        Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
      > &
      ResponseLocalsInvitation
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    (request, response, next) => {
      if (
        response.locals.user === undefined ||
        response.locals.user.emailVerifiedAt === null ||
        response.locals.invitation === undefined ||
        response.locals.course !== undefined
      )
        return next();

      application.database.run(
        sql`
          INSERT INTO "enrollments" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.user.id},
            ${response.locals.invitation.course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${response.locals.invitation.courseRole},
            ${defaultAccentColor({ request, response })}
          )
        `
      );
      if (response.locals.invitation.email !== null)
        application.database.run(
          sql`
            UPDATE "invitations"
            SET "usedAt" = ${new Date().toISOString()}
            WHERE "id" = ${response.locals.invitation.id}
          `
        );

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.invitation.course.reference
        }/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`
      );
    }
  );

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/enrollments",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      const enrollments = application.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: Application["server"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          reference: string;
          courseRole: Application["server"]["locals"]["helpers"]["courseRoles"][number];
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
            WHERE "enrollments"."course" = ${response.locals.course.id}
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

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Enrollments · Course Settings · ${response.locals.course.name} ·
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
              css="${response.locals.css(css`
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
              const action = `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/enrollments/${enrollment.reference}`;
              const isSelf = enrollment.id === response.locals.enrollment.id;
              const isOnlyStaff =
                isSelf &&
                enrollments.filter(
                  (enrollment) => enrollment.courseRole === "staff"
                ).length === 1;

              return html`
                <div
                  key="enrollment--${enrollment.reference}"
                  class="enrollment"
                  css="${response.locals.css(css`
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
                    $${application.server.locals.partials.user({
                      request,
                      response,
                      enrollment,
                      name: false,
                    })}
                  </div>

                  <div
                    css="${response.locals.css(css`
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
                          application.server.locals.helpers.splitFilterablePhrases(
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
                            application.server.locals.helpers.splitFilterablePhrases(
                              enrollment.user.email
                            )
                          )}"
                          css="${response.locals.css(css`
                            margin-right: var(--space--2);
                          `)}"
                        >
                          ${enrollment.user.email}
                        </span>
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          css="${response.locals.css(css`
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
                        css="${response.locals.css(css`
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
                      css="${response.locals.css(css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `)}"
                    >
                      <div
                        css="${response.locals.css(css`
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
                              content: ${response.locals.html(
                                html`
                                  <div class="dropdown--menu">
                                    $${application.server.locals.helpers.courseRoles.map(
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
                                                          content: ${response.locals.html(
                                                            html`
                                                              <form
                                                                key="course-role--${courseRole}"
                                                                method="PATCH"
                                                                action="${action}"
                                                                css="${response
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
                                                                    css="${response
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
                        css="${response.locals.css(css`
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
                                      content: ${response.locals.html(
                                        html`
                                          <form
                                            method="DELETE"
                                            action="${action}"
                                            css="${response.locals.css(css`
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
                                                css="${response.locals.css(css`
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
                            $${application.server.locals.partials.content({
                              request,
                              response,
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

  type ResponseLocalsManagedEnrollment =
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"] & {
      managedEnrollment: {
        id: number;
        reference: string;
        isSelf: boolean;
      };
    };

  application.server.use<
    { courseReference: string; enrollmentReference: string },
    any,
    {},
    {},
    ResponseLocalsManagedEnrollment
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.enrollment.courseRole !== "staff"
      )
        return next();

      const managedEnrollment = application.database.get<{
        id: number;
        reference: string;
      }>(
        sql`
          SELECT "id", "reference"
          FROM "enrollments"
          WHERE
            "course" = ${response.locals.course.id} AND
            "reference" = ${request.params.enrollmentReference}
        `
      );
      if (managedEnrollment === undefined) return next();
      response.locals.managedEnrollment = {
        ...managedEnrollment,
        isSelf: managedEnrollment.id === response.locals.enrollment.id,
      };

      if (
        response.locals.managedEnrollment.isSelf &&
        application.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "enrollments"
            WHERE
              "course" = ${response.locals.course.id} AND
              "courseRole" = ${"staff"}
          `
        )!.count === 1
      )
        return next("Validation");

      next();
    }
  );

  application.server.patch<
    { courseReference: string; enrollmentReference: string },
    HTML,
    {
      courseRole?: Application["server"]["locals"]["helpers"]["courseRoles"][number];
    },
    {},
    ResponseLocalsManagedEnrollment
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    (request, response, next) => {
      if (response.locals.managedEnrollment === undefined) return next();

      if (typeof request.body.courseRole === "string") {
        if (
          !application.server.locals.helpers.courseRoles.includes(
            request.body.courseRole
          )
        )
          return next("Validation");

        application.database.run(
          sql`UPDATE "enrollments" SET "courseRole" = ${request.body.courseRole} WHERE "id" = ${response.locals.managedEnrollment.id}`
        );

        application.server.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Enrollment updated successfully.`,
        });
      }

      response.redirect(
        303,
        response.locals.managedEnrollment.isSelf
          ? `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
          : `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/enrollments`
      );

      for (const port of application.ports.serverEvents)
        got
          .post(`http://127.0.0.1:${port}/live-updates`, {
            form: { url: `/courses/${response.locals.course.reference}` },
          })
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES ",
              "ERROR EMITTING POST EVENT",
              error
            );
          });
    }
  );

  application.server.delete<
    { courseReference: string; enrollmentReference: string },
    HTML,
    {},
    {},
    ResponseLocalsManagedEnrollment
  >(
    "/courses/:courseReference/settings/enrollments/:enrollmentReference",
    (request, response, next) => {
      if (response.locals.managedEnrollment === undefined) return next();

      application.database.run(
        sql`DELETE FROM "enrollments" WHERE "id" = ${response.locals.managedEnrollment.id}`
      );

      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          $${response.locals.managedEnrollment.isSelf
            ? html`You removed yourself`
            : html`Person removed`}
          from the course successfully.
        `,
      });

      response.redirect(
        303,
        response.locals.managedEnrollment.isSelf
          ? `https://${application.configuration.hostname}/`
          : `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/enrollments`
      );

      for (const port of application.ports.serverEvents)
        got
          .post(`http://127.0.0.1:${port}/live-updates`, {
            form: { url: `/courses/${response.locals.course.reference}` },
          })
          .catch((error) => {
            response.locals.log(
              "LIVE-UPDATES ",
              "ERROR EMITTING POST EVENT",
              error
            );
          });
    }
  );

  application.server.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/your-enrollment",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Your Enrollment · Course Settings · ${response.locals.course.name}
              · Courselore
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
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/your-enrollment"
              novalidate
              css="${response.locals.css(css`
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
                  css="${response.locals.css(css`
                    margin-top: var(--space--1);
                    display: flex;
                    gap: var(--space--2);
                  `)}"
                >
                  $${application.server.locals.helpers.enrollmentAccentColors.map(
                    (accentColor) => html`
                      <input
                        type="radio"
                        name="accentColor"
                        value="${accentColor}"
                        required
                        $${accentColor ===
                        response.locals.enrollment.accentColor
                          ? html`checked`
                          : html``}
                        class="input--radio"
                        css="${response.locals.css(css`
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

  application.server.patch<
    { courseReference: string },
    HTML,
    {
      accentColor?: Application["server"]["locals"]["helpers"]["enrollmentAccentColors"][number];
    },
    {},
    Application["server"]["locals"]["ResponseLocals"]["CourseEnrolled"]
  >(
    "/courses/:courseReference/settings/your-enrollment",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      if (
        typeof request.body.accentColor !== "string" ||
        !application.server.locals.helpers.enrollmentAccentColors.includes(
          request.body.accentColor
        )
      )
        return next("Validation");

      application.database.run(
        sql`UPDATE "enrollments" SET "accentColor" = ${request.body.accentColor} WHERE "id" = ${response.locals.enrollment.id}`
      );

      application.server.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Enrollment updated successfully.`,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/your-enrollment`
      );
    }
  );
};
