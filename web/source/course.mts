import express from "express";
import qs from "qs";
import { asyncHandler } from "@leafac/express-async-handler";
import sql from "@leafac/sqlite";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import dedent from "dedent";
import cryptoRandomString from "crypto-random-string";
import lodash from "lodash";
import QRCode from "qrcode";
import { Application } from "./index.mjs";

export type ApplicationCourse = {
  web: {
    locals: {
      Types: {
        CourseParticipant: {
          id: number;
          user: Application["web"]["locals"]["Types"]["User"];
          reference: string;
          courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        };

        MaybeCourseParticipant:
          | Application["web"]["locals"]["Types"]["CourseParticipant"]
          | "no-longer-participating";
      };

      ResponseLocals: {
        CourseParticipant: Application["web"]["locals"]["ResponseLocals"]["SignedIn"] & {
          courseParticipant: Application["web"]["locals"]["ResponseLocals"]["SignedIn"]["courseParticipants"][number];
          course: Application["web"]["locals"]["ResponseLocals"]["SignedIn"]["courseParticipants"][number]["course"];
          courseParticipantsCount: number;
          mostRecentlyUpdatedConversationReference: string | null;
          tags: {
            id: number;
            reference: string;
            order: number;
            name: string;
            courseStaffOnlyAt: string | null;
          }[];
        };
      };

      partials: {
        course: ({
          request,
          response,
          course,
          courseParticipant,
          tight,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          course: Application["web"]["locals"]["ResponseLocals"]["SignedIn"]["courseParticipants"][number]["course"];
          courseParticipant?: Application["web"]["locals"]["ResponseLocals"]["SignedIn"]["courseParticipants"][number];
          tight?: boolean;
        }) => HTML;

        courses: ({
          request,
          response,
          tight,
          hrefSuffix,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
              >
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["SignedIn"] &
              Partial<
                Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
              >
          >;
          tight?: boolean;
          hrefSuffix?: string;
        }) => HTML;

        courseArchived: ({
          request,
          response,
        }: {
          request: express.Request<
            {},
            any,
            {},
            {},
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
          response: express.Response<
            any,
            Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
          >;
        }) => HTML;
      };

      helpers: {
        courseRoles: ["student", "course-staff"];

        courseParticipantAccentColors: [
          "red",
          "yellow",
          "emerald",
          "sky",
          "violet",
          "pink",
        ];
      };
    };
  };
};

export default async (application: Application): Promise<void> => {
  application.web.locals.helpers.courseRoles = ["student", "course-staff"];

  application.web.locals.helpers.courseParticipantAccentColors = [
    "red",
    "yellow",
    "emerald",
    "sky",
    "violet",
    "pink",
  ];

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    if (response.locals.courseParticipants.length === 0)
      return response.send(
        application.web.locals.layouts.main({
          request,
          response,
          head: html`<title>Courselore</title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                align-items: center;
              `}"
            >
              <h2 class="heading--display">Welcome to Courselore!</h2>

              <div class="decorative-icon">
                $${application.web.locals.partials.logo({
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
                  javascript="${javascript`
                    leafac.setTippy({
                      event,
                      element: this,
                      tippyProps: {
                        trigger: "click",
                        content: "To join an existing course you either have to follow an invitation link or be invited via email. Contact your course staff for more information.",
                      },
                    });
                  `}"
                >
                  <i class="bi bi-journal-arrow-down"></i>
                  Join an Existing Course
                </button>
                $${application.web.locals.helpers.mayCreateCourses({
                  request,
                  response,
                })
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
                $${typeof response.locals.session.samlIdentifier === "string"
                  ? html`
                      <button
                        class="menu-box--item button button--transparent"
                        javascript="${javascript`
                          leafac.setTippy({
                            event,
                            element: this,
                            tippyProps: {
                              trigger: "click",
                              interactive: true,
                              content: ${html`
                                <div
                                  css="${css`
                                    padding: var(--space--2);
                                    display: flex;
                                    flex-direction: column;
                                    gap: var(--space--4);
                                  `}"
                                >
                                  <p>
                                    You signed in with the email address
                                    ${response.locals.user.email} via
                                    ${application.configuration.saml[
                                      response.locals.session.samlIdentifier
                                    ].name},
                                    but you may already have a Courselore
                                    account with a different email address in
                                    which you participate in courses.
                                  </p>

                                  <p>
                                    You may want to
                                    <a
                                      href="https://${application.configuration
                                        .hostname}/settings/account"
                                      class="link"
                                      >remove this account</a
                                    >
                                    and modify the email address in the other
                                    account to ${response.locals.user.email}.
                                  </p>
                                </div>
                              `},
                            },
                          });
                        `}"
                      >
                        <i class="bi bi-question-diamond"></i>
                        Where Are My Courses?
                      </button>
                    `
                  : html``}
              </div>
            </div>
          `,
        }),
      );

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${
        response.locals.user.mostRecentlyVisitedCourseReference ??
        response.locals.courseParticipants[0].course.reference
      }`,
    );
  });

  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/courses/new", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      !application.web.locals.helpers.mayCreateCourses({ request, response })
    )
      return next();

    response.send(
      application.web.locals.layouts.main({
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
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
              css="${css`
                display: flex;
                gap: var(--space--2);
                & > * {
                  flex: 1;
                }
              `}"
            >
              <label class="label">
                <p class="label--text">Year</p>
                <input
                  type="text"
                  name="year"
                  class="input--text"
                  autocomplete="off"
                  javascript="${javascript`
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
                  javascript="${javascript`
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
                value="${response.locals.courseParticipants.length > 0
                  ? response.locals.courseParticipants.at(-1)!.course
                      .institution ?? ""
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
      }),
    );
  });

  application.web.post<
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
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
  >("/courses", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null ||
      !application.web.locals.helpers.mayCreateCourses({ request, response })
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
          SELECT * FROM "courses" WHERE "id" = ${
            application.database.run(
              sql`
                INSERT INTO "courses" (
                  "createdAt",
                  "reference",
                  "name",
                  "year",
                  "term",
                  "institution",
                  "code",
                  "nextConversationReference",
                  "studentsMayCreatePollsAt"
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
                  ${1},
                  ${new Date().toISOString()}
                )
              `,
            ).lastInsertRowid
          }
        `,
      )!;
      application.database.run(
        sql`
          INSERT INTO "courseParticipants" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
          VALUES (
            ${new Date().toISOString()},
            ${response.locals.user.id},
            ${course.id},
            ${cryptoRandomString({ length: 10, type: "numeric" })},
            ${"course-staff"},
            ${defaultAccentColor({ request, response })}
          )
        `,
      );
      return course;
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${course.reference}`,
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
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["SignedIn"]
    >;
  }): Application["web"]["locals"]["helpers"]["courseParticipantAccentColors"][number] => {
    const accentColorsAvailable = new Set(
      application.web.locals.helpers.courseParticipantAccentColors,
    );
    for (const courseParticipant of response.locals.courseParticipants) {
      accentColorsAvailable.delete(courseParticipant.accentColor);
      if (accentColorsAvailable.size === 1) break;
    }
    return [...accentColorsAvailable][0];
  };

  application.web.use<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >("/courses/:courseReference", (request, response, next) => {
    if (
      response.locals.user === undefined ||
      response.locals.user.emailVerifiedAt === null
    )
      return next();

    const courseParticipant = response.locals.courseParticipants.find(
      (courseParticipant) =>
        courseParticipant.course.reference === request.params.courseReference,
    );
    if (courseParticipant === undefined) return next();
    response.locals.courseParticipant = courseParticipant;
    response.locals.course = courseParticipant.course;

    response.locals.courseParticipantsCount = application.database.get<{
      count: number;
    }>(
      sql`
        SELECT COUNT(*) AS "count"
        FROM "courseParticipants"
        WHERE "course" = ${response.locals.course.id}
      `,
    )!.count;

    response.locals.mostRecentlyUpdatedConversationReference =
      application.database.get<{
        reference: string;
      }>(
        sql`
          SELECT "reference"
          FROM "conversations"
          WHERE
            "course" = ${response.locals.course.id} AND (
              "conversations"."participants" = 'everyone' $${
                response.locals.courseParticipant.courseRole === "course-staff"
                  ? sql`OR "conversations"."participants" = 'course-staff'`
                  : sql``
              } OR EXISTS(
                SELECT TRUE
                FROM "conversationSelectedParticipants"
                WHERE
                  "conversationSelectedParticipants"."conversation" = "conversations"."id" AND 
                  "conversationSelectedParticipants"."courseParticipant" = ${
                    response.locals.courseParticipant.id
                  }
              )
            )
          ORDER BY
            "conversations"."pinnedAt" IS NOT NULL DESC,
            coalesce("updatedAt", "createdAt") DESC
        `,
      )?.reference ?? null;

    response.locals.tags = application.database.all<{
      id: number;
      reference: string;
      order: number;
      name: string;
      courseStaffOnlyAt: string | null;
    }>(
      sql`
        SELECT "id", "reference", "order", "name", "courseStaffOnlyAt"
        FROM "tags"
        WHERE
          "course" = ${response.locals.course.id}
          $${
            response.locals.courseParticipant.courseRole === "student"
              ? sql`AND "courseStaffOnlyAt" IS NULL`
              : sql``
          }
        ORDER BY "order" ASC
      `,
    );

    application.database.run(
      sql`
        UPDATE "users"
        SET "mostRecentlyVisitedCourseParticipant" = ${response.locals.courseParticipant.id}
        WHERE "id" = ${response.locals.user.id}
      `,
    );

    next();
  });

  application.web.locals.partials.course = ({
    request,
    response,
    course,
    courseParticipant = undefined,
    tight = false,
  }) => html`
    <div
      key="partial--course--${course.reference}"
      css="${css`
        display: flex;
        gap: var(--space--2);
        align-items: baseline;
      `}"
    >
      <div>
        <div
          class="button button--tight ${tight ? "button--tight--inline" : ""}"
          style="
            --color--accent-color--100: var(--color--${courseParticipant?.accentColor ??
          ""}--100);
            --color--accent-color--200: var(--color--${courseParticipant?.accentColor ??
          ""}--200);
            --color--accent-color--700: var(--color--${courseParticipant?.accentColor ??
          ""}--700);
            --color--accent-color--800: var(--color--${courseParticipant?.accentColor ??
          ""}--800);
          "
          css="${css`
            cursor: default;
          `} ${courseParticipant === undefined
            ? css``
            : css`
                color: var(--color--accent-color--700);
                background-color: var(--color--accent-color--100);
                @media (prefers-color-scheme: dark) {
                  color: var(--color--accent-color--200);
                  background-color: var(--color--accent-color--800);
                }
              `}"
          javascript="${javascript`
            this.style.setProperty("--color--accent-color--100", ${`var(--color--${courseParticipant?.accentColor}--100)`});
            this.style.setProperty("--color--accent-color--200", ${`var(--color--${courseParticipant?.accentColor}--200)`});
            this.style.setProperty("--color--accent-color--700", ${`var(--color--${courseParticipant?.accentColor}--700)`});
            this.style.setProperty("--color--accent-color--800", ${`var(--color--${courseParticipant?.accentColor}--800)`});
          `}"
        >
          $${courseParticipant === undefined
            ? html`<i class="bi bi-journal-arrow-down"></i>`
            : html`<i class="bi bi-journal-text"></i>`}
        </div>
      </div>
      <div>
        <div class="strong">${course.name}</div>
        <div
          class="secondary"
          css="${css`
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
          `}"
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
          $${courseParticipant === undefined
            ? html``
            : html`
                <div>
                  $${iconsCourseRole[courseParticipant.courseRole]
                    .regular} ${labelsCourseRole[courseParticipant.courseRole]}
                </div>
              `}
          $${course.archivedAt !== null
            ? html`
                <div>
                  $${application.web.locals.partials.courseArchived({
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

  application.web.locals.partials.courses = ({
    request,
    response,
    tight = false,
    hrefSuffix = "",
  }) => {
    let courses = html``;

    const [unarchived, archived] = lodash.partition(
      response.locals.courseParticipants,
      (courseParticipant) => courseParticipant.course.archivedAt === null,
    );

    if (unarchived.length > 0)
      courses += html`
        $${unarchived.map(
          (courseParticipant) => html`
            <a
              key="course-participant--${courseParticipant.reference}"
              href="https://${application.configuration
                .hostname}/courses/${courseParticipant.course
                .reference}${hrefSuffix}"
              class="dropdown--menu--item menu-box--item button ${tight
                ? ""
                : "button--tight"} ${courseParticipant.id ===
              response.locals.courseParticipant?.id
                ? "button--blue"
                : "button--transparent"}"
            >
              $${application.web.locals.partials.course({
                request,
                response,
                course: courseParticipant.course,
                courseParticipant,
                tight,
              })}
            </a>
          `,
        )}
      `;

    if (archived.length > 0)
      courses += html`
        $${courses !== html`` ? html`<hr class="separator" />` : html``}

        <button
          key="course-participant--archived"
          class="dropdown--menu--item menu-box--item button ${tight
            ? ""
            : "button--tight"} button--transparent secondary"
          css="${css`
            font-size: var(--font-size--xs);
            line-height: var(--line-height--xs);
            justify-content: center;
          `}"
          javascript="${javascript`
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
          (courseParticipant) => html`
            <a
              key="course-participant--${courseParticipant.reference}"
              href="https://${application.configuration
                .hostname}/courses/${courseParticipant.course
                .reference}${hrefSuffix}"
              hidden
              class="dropdown--menu--item menu-box--item button ${tight
                ? ""
                : "button--tight"} ${courseParticipant.id ===
              response.locals.courseParticipant?.id
                ? "button--blue"
                : "button--transparent"}"
            >
              $${application.web.locals.partials.course({
                request,
                response,
                course: courseParticipant.course,
                courseParticipant,
                tight,
              })}
            </a>
          `,
        )}
      `;

    return courses;
  };

  application.web.locals.partials.courseArchived = ({
    request,
    response,
  }) => html`
    <div
      class="strong text--rose"
      css="${css`
        font-size: var(--font-size--2xs);
        line-height: var(--line-height--2xs);
        display: inline-flex;
        gap: var(--space--1);
      `}"
    >
      <i class="bi bi-archive-fill"></i>
      Archived
    </div>
  `;

  const iconsCourseRole: {
    [courseRole in Application["web"]["locals"]["helpers"]["courseRoles"][number]]: {
      regular: HTML;
      fill: HTML;
    };
  } = {
    student: {
      regular: html`<i class="bi bi-person"></i>`,
      fill: html`<i class="bi bi-person-fill"></i>`,
    },
    "course-staff": {
      regular: html`<i class="bi bi-mortarboard"></i>`,
      fill: html`<i class="bi bi-mortarboard-fill"></i>`,
    },
  };

  const labelsCourseRole: {
    [courseRole in Application["web"]["locals"]["helpers"]["courseRoles"][number]]: string;
  } = {
    student: "Student",
    "course-staff": "Course Staff",
  };

  const textColorsCourseRole: {
    [courseRole in Application["web"]["locals"]["helpers"]["courseRoles"][number]]: string;
  } = {
    student: "",
    "course-staff": "text--sky",
  };

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    { sidebarOnSmallScreen?: "true" },
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >("/courses/:courseReference", (request, response, next) => {
    if (response.locals.course === undefined) return next();

    if (response.locals.mostRecentlyUpdatedConversationReference === null)
      return response.send(
        application.web.locals.layouts.main({
          request,
          response,
          head: html`<title>
            ${response.locals.course.name} · Courselore
          </title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
                align-items: center;
              `}"
            >
              <h2 class="heading--display">
                Welcome to ${response.locals.course.name}!
              </h2>

              <div class="decorative-icon">
                <i class="bi bi-journal-text"></i>
              </div>

              <div class="menu-box">
                $${response.locals.courseParticipant.courseRole ===
                "course-staff"
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
                          response.locals.courseParticipant.courseRole ===
                          "course-staff"
                            ? "note"
                            : "question",
                      },
                    },
                    { addQueryPrefix: true },
                  )}"
                  class="menu-box--item button ${response.locals
                    .courseParticipant.courseRole === "course-staff"
                    ? "button--transparent"
                    : "button--blue"}"
                >
                  $${response.locals.courseParticipant.courseRole ===
                  "course-staff"
                    ? html`<i class="bi bi-chat-text"></i>`
                    : html`<i class="bi bi-chat-text-fill"></i>`}
                  Start the First Conversation
                </a>
              </div>
            </div>
          `,
        }),
      );

    if (request.query.sidebarOnSmallScreen === "true") {
      application.database.run(
        sql`
          UPDATE "courseParticipants"
          SET "mostRecentlyVisitedConversation" = NULL
          WHERE "id" = ${response.locals.courseParticipant.id}
        `,
      );

      return response.send(
        application.web.locals.layouts.conversation({
          request,
          response,
          head: html`
            <title>${response.locals.course.name} · Courselore</title>
          `,
          sidebarOnSmallScreen: true,
          body: html`<p class="secondary">No conversation selected.</p>`,
        }),
      );
    }

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${
        response.locals.course.reference
      }/conversations/${
        response.locals.courseParticipant
          .mostRecentlyVisitedConversationReference ??
        response.locals.mostRecentlyUpdatedConversationReference
      }${qs.stringify(
        {
          ...(response.locals.courseParticipant
            .mostRecentlyVisitedConversationReference === null
            ? { sidebarOnSmallScreen: true }
            : {}),
        },
        { addQueryPrefix: true },
      )}`,
    );
  });

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >("/courses/:courseReference/settings", (request, response, next) => {
    if (response.locals.course === undefined) return next();

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${
        response.locals.course.reference
      }/settings/${
        response.locals.courseParticipant.courseRole === "course-staff"
          ? "course-information"
          : "my-course-participation"
      }`,
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
      Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
    >;
    head: HTML;
    body: HTML;
  }): HTML =>
    application.web.locals.layouts.settings({
      request,
      response,
      head,
      menuButton: html`
        <i class="bi bi-sliders"></i>
        Course Settings
      `,
      menu:
        response.locals.courseParticipant.courseRole === "course-staff"
          ? html`
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/course-information"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/course-information\/?$/i,
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
                  /\/settings\/tags\/?$/i,
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
                  /\/settings\/invitations\/?$/i,
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
                  .reference}/settings/course-participants"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/course-participants\/?$/i,
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(
                    /\/settings\/course-participants\/?$/i,
                  )
                    ? "bi-people-fill"
                    : "bi-people"}"
                ></i>
                Course Participants
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/advanced"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/advanced\/?$/i,
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i class="bi bi-journal-medical"></i>
                Advanced
              </a>
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}/settings/my-course-participation"
                class="dropdown--menu--item menu-box--item button ${request.path.match(
                  /\/settings\/my-course-participation\/?$/i,
                )
                  ? "button--blue"
                  : "button--transparent"}"
              >
                <i
                  class="bi ${request.path.match(
                    /\/settings\/my-course-participation\/?$/i,
                  )
                    ? "bi-person-fill"
                    : "bi-person"}"
                ></i>
                My Course Participation
              </a>
            `
          : html``,
      body,
    });

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/course-information",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
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
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
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
                css="${css`
                  display: flex;
                  gap: var(--space--2);
                  & > * {
                    flex: 1;
                  }
                `}"
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
          `,
        }),
      );
    },
  );

  application.web.patch<
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
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/course-information",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
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
        `,
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Course information updated successfully.`,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/course-information`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >("/courses/:courseReference/settings/tags", (request, response, next) => {
    if (
      response.locals.course === undefined ||
      response.locals.courseParticipant.courseRole !== "course-staff"
    )
      return next();

    const partialTag = ({
      tag = undefined,
      order = 0,
    }: {
      tag?: (typeof response.locals.tags)[number] | undefined;
      order?: number;
    } = {}): HTML => html`
      <div key="tag/${tag?.reference ?? "new"}">
        $${tag !== undefined
          ? html`
              <input
                type="hidden"
                name="tags[${String(order)}][reference]"
                value="${tag.reference}"
              />
            `
          : html``}

        <button
          key="tag--grab--handle"
          type="button"
          class="button button--tight button--tight--inline button--transparent"
          javascript="${javascript`
            leafac.setTippy({
              event,
              element: this,
              tippyProps: {
                touch: false,
                content: "Drag to Reorder",
              },
            });
          `}"
        >
          <i class="bi bi-grip-vertical"></i>
        </button>

        <input
          type="text"
          name="tags[${String(order)}][name]"
          $${tag !== undefined
            ? html`value="${tag.name}"`
            : html`placeholder=" "`}
          required
          autocomplete="off"
          class="input--text"
          $${tag === undefined
            ? html`
                javascript="${javascript`
                  this.isModified = true;
                `}"
              `
            : html``}
        />

        <div
          css="${css`
            width: calc(var(--space--96) + var(--space--12));
          `}"
        >
          <label
            class="button button--tight button--tight--inline button--justify-start button--transparent"
          >
            <input
              type="checkbox"
              name="tags[${String(order)}][isCourseStaffOnly]"
              $${typeof tag?.courseStaffOnlyAt === "string"
                ? html`checked`
                : html``}
              class="visually-hidden input--radio-or-checkbox--multilabel"
              $${tag === undefined
                ? html`
                    javascript="${javascript`
                      this.isModified = true;
                    `}"
                  `
                : html``}
            />
            <span
              javascript="${javascript`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: "Set as Visible by Course Staff Only",
                  },
                });
              `}"
            >
              <i class="bi bi-eye"></i>
              Visible by Everyone
            </span>
            <span
              class="${textColorsCourseRole["course-staff"]}"
              javascript="${javascript`
                leafac.setTippy({
                  event,
                  element: this,
                  tippyProps: {
                    touch: false,
                    content: "Set as Visible by Everyone",
                  },
                });
              `}"
            >
              <i class="bi bi-mortarboard-fill"></i>
              Visible by Course Staff Only
            </span>
          </label>
        </div>

        <div
          css="${css`
            [key^="tag/"].removed & {
              display: none;
            }
          `}"
        >
          <button
            type="button"
            class="button button--tight button--tight--inline button--transparent"
            javascript="${javascript`
              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  theme: "rose",
                  touch: false,
                  content: "Remove Tag",
                },
              });

              if (${tag !== undefined})
                leafac.setTippy({
                  event,
                  element: this,
                  elementProperty: "dropdown",
                  tippyProps: {
                    theme: "rose",
                    trigger: "click",
                    interactive: true,
                    content: ${html`
                      <div
                        css="${css`
                          padding: var(--space--2) var(--space--0);
                          display: flex;
                          flex-direction: column;
                          gap: var(--space--4);
                        `}"
                      >
                        <p>Are you sure you want to remove this tag?</p>
                        <p>
                          <strong
                            css="${css`
                              font-weight: var(--font-weight--bold);
                            `}"
                          >
                            The tag will be removed from all conversations and
                            you may not undo this action!
                          </strong>
                        </p>
                        <button
                          type="button"
                          class="button button--rose"
                          javascript="${javascript`
                            this.onclick = () => {
                              const tag = this.closest('[key^="tag/"]');
                              tag.classList.add("removed");
                              for (const element of leafac.descendants(tag)) {
                                if (element.skipDisable === true) continue;
                                if (typeof element.disabled === "boolean") element.disabled = true;
                                if (element.matches(".button")) element.classList.add("disabled");
                                if (element.tooltip !== undefined) element.tooltip.disable();
                              }
                              this.closest('[key="tags"]').reorder();
                            };
                          `}"
                        >
                          <i class="bi bi-trash-fill"></i>
                          Remove Tag
                        </button>
                      </div>
                    `},  
                  },
                });
              else
                this.onclick = () => {
                  const tags = this.closest('[key="tags"]');
                  this.closest('[key^="tag/"]').remove();
                  tags.reorder();
                };
            `}"
          >
            <i class="bi bi-trash"></i>
          </button>
        </div>

        <div
          css="${css`
            [key^="tag/"]:not(.removed) & {
              display: none;
            }
          `}"
        >
          <button
            type="button"
            class="button button--tight button--tight--inline button--transparent"
            javascript="${javascript`
              this.skipDisable = true;

              leafac.setTippy({
                event,
                element: this,
                tippyProps: {
                  touch: false,
                  content: "Don’t Remove Tag",
                },
              });

              this.onclick = () => {
                const tag = this.closest('[key^="tag/"]');
                tag.classList.remove("removed");
                for (const element of leafac.descendants(tag)) {
                  if (typeof element.disabled === "boolean") element.disabled = false;
                  if (element.matches(".button")) element.classList.remove("disabled");
                  if (element.tooltip !== undefined) element.tooltip.enable();
                }
                tag.closest('[key="tags"]').reorder();
              };
            `}"
          >
            <i class="bi bi-recycle"></i>
          </button>
        </div>

        $${typeof response.locals.mostRecentlyUpdatedConversationReference ===
          "string" && response.locals.tags.length > 0
          ? html`
              <a
                href="https://${application.configuration
                  .hostname}/courses/${response.locals.course
                  .reference}${qs.stringify(
                  {
                    conversations: {
                      filters: { tagsReferences: [tag?.reference] },
                    },
                  },
                  { addQueryPrefix: true },
                )}"
                target="_blank"
                class="button button--tight button--tight--inline button--transparent"
                css="${tag === undefined
                  ? css`
                      visibility: hidden;
                    `
                  : css``}"
                javascript="${javascript`
                  leafac.setTippy({
                    event,
                    element: this,
                    tippyProps: {
                      touch: false,
                      content: "See Conversations with This Tag",
                    },
                  });
                `}"
              >
                <i class="bi bi-chat-text"></i>
              </a>
            `
          : html``}
      </div>
    `;

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
                  css="${css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--2);
                    align-items: center;
                  `}"
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
            css="${css`
              display: flex;
              flex-direction: column;
              gap: var(--space--4);
            `}"
          >
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <div
                key="tags"
                css="${css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--2);

                  [key^="tag/"] {
                    display: flex;
                    gap: var(--space--2);
                    align-items: center;

                    transition-property: var(--transition-property--opacity);
                    transition-duration: var(--transition-duration--150);
                    transition-timing-function: var(
                      --transition-timing-function--in-out
                    );

                    &.grabbed {
                      opacity: var(--opacity--50);
                    }

                    [key="tag--grab--handle"]:not(.disabled) {
                      cursor: grab;
                    }
                  }
                `}"
                javascript="${javascript`
                  this.onbeforemorph = (event) => {
                    const liveUpdate = event?.detail?.liveUpdate;
                    if (!liveUpdate) this.isModified = false;
                    return !liveUpdate;
                  };

                  this.onpointerdown = (event) => {
                    if (event.target.closest('[key="tag--grab--handle"]') === null) return;

                    const body = document.querySelector("body");
                    const tag = event.target.closest('[key^="tag/"]');

                    this.grabbed = tag;
                    body.classList.add("grabbing");
                    tag.classList.add("grabbed");

                    body.addEventListener("pointerup", () => {
                      delete this.grabbed;
                      body.classList.remove("grabbing");
                      tag.classList.remove("grabbed");
                    }, { once: true });
                  };

                  this.onpointermove = (event) => {
                    const tag = (
                      event.pointerType === "touch" ? document.elementFromPoint(event.clientX, event.clientY) : event.target
                    ).closest('[key^="tag/"]');
                    if (tag === null || [undefined, tag].includes(this.grabbed)) return;

                    const boundingClientRect = tag.getBoundingClientRect();
                    tag[
                      (event.clientY - boundingClientRect.top) / (boundingClientRect.bottom - boundingClientRect.top) < 0.5 ?
                      "after" : "before"
                    ](this.grabbed);
                    this.reorder();
                  };

                  this.onkeydown = (event) => {
                    if (event.target.closest('[key="tag--grab--handle"]') === null) return;

                    const tag = event.target.closest('[key^="tag/"]');
                    switch (event.code) {
                      case "ArrowUp":
                        event.preventDefault();
                        tag.previousElementSibling?.before?.(tag);
                        break;
                      case "ArrowDown":
                        event.preventDefault();
                        tag.nextElementSibling?.after?.(tag);
                        break;
                    }
                    tag.querySelector('[key="tag--grab--handle"]').focus();
                    this.reorder();
                  };

                  this.reorder = () => {
                    this.isModified = true;

                    for (const [order, tag] of this.querySelectorAll('[key^="tag/"]:not(.removed)').entries())
                      for (const element of tag.querySelectorAll('[name^="tags["]'))
                        element.setAttribute("name", element.getAttribute("name").replace(/\\d+/, String(order)));
                  };
                `}"
              >
                $${response.locals.tags.map((tag, order) =>
                  partialTag({ tag, order }),
                )}
              </div>
              <div
                css="${css`
                  display: flex;
                  justify-content: center;
                `}"
              >
                <button
                  type="button"
                  class="button button--full-width-on-small-screen button--transparent"
                  javascript="${javascript`
                    this.onclick = () => {
                      const newTag = leafac.stringToElement(${partialTag()}).querySelector('[key="tag/new"]');

                      const tags = this.closest("form").querySelector('[key="tags"]');
                      tags.insertAdjacentElement("beforeend", newTag);
                      leafac.execute({ element: newTag });
                      tags.reorder();
                    };

                    this.onvalidate = () => {
                      if (this.closest("form").querySelector('[key="tags"]').children.length === 0)
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
      }),
    );
  });

  application.web.put<
    { courseReference: string },
    HTML,
    {
      tags?: {
        reference?: string | undefined;
        name?: string;
        isCourseStaffOnly?: "on";
      }[];
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >("/courses/:courseReference/settings/tags", (request, response, next) => {
    if (
      response.locals.course === undefined ||
      response.locals.courseParticipant.courseRole !== "course-staff"
    )
      return next();

    request.body.tags ??= [];

    if (
      !Array.isArray(request.body.tags) ||
      request.body.tags.some(
        (tag) =>
          ![
            undefined,
            ...response.locals.tags.map((tag) => tag.reference),
          ].includes(tag.reference) ||
          typeof tag.name !== "string" ||
          tag.name.trim() === "" ||
          ![undefined, "on"].includes(tag.isCourseStaffOnly),
      )
    )
      return next("Validation");

    application.database.executeTransaction(() => {
      for (const [order, tag] of request.body.tags!.entries())
        if (tag.reference === undefined)
          application.database.run(
            sql`
              INSERT INTO "tags" ("createdAt", "course", "reference", "order", "name", "courseStaffOnlyAt")
              VALUES (
                ${new Date().toISOString()},
                ${response.locals.course.id},
                ${cryptoRandomString({ length: 10, type: "numeric" })},
                ${order},
                ${tag.name},
                ${
                  tag.isCourseStaffOnly === "on"
                    ? new Date().toISOString()
                    : null
                }
              )
            `,
          );
        else
          application.database.run(
            sql`
              UPDATE "tags"
              SET
                "order" = ${order},
                "name" = ${tag.name},
                "courseStaffOnlyAt" = ${
                  tag.isCourseStaffOnly === "on"
                    ? new Date().toISOString()
                    : null
                }
              WHERE
                "course" = ${response.locals.course.id} AND
                "reference" = ${tag.reference}
            `,
          );

      for (const tag of response.locals.tags.filter(
        (tag) =>
          !request.body
            .tags!.map((tag) => tag.reference)
            .includes(tag.reference),
      ))
        application.database.run(
          sql`
            DELETE FROM "tags"
            WHERE
              "course" = ${response.locals.course.id} AND
              "reference" = ${tag.reference}
          `,
        );
    });

    application.web.locals.helpers.Flash.set({
      request,
      response,
      theme: "green",
      content: html`Tags updated successfully.`,
    });

    response.redirect(
      303,
      `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/tags`,
    );

    application.web.locals.helpers.liveUpdates({
      request,
      response,
      url: `/courses/${response.locals.course.reference}`,
    });
  });

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/invitations",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      const invitations = application.database.all<{
        id: number;
        expiresAt: string | null;
        usedAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
      }>(
        sql`
          SELECT "id", "expiresAt", "usedAt", "reference", "email", "name", "courseRole"
          FROM "invitations"
          WHERE "course" = ${response.locals.course.id}
          ORDER BY "id" DESC
        `,
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
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div class="label">
                <p class="label--text">Type</p>
                <div
                  css="${css`
                    display: flex;
                    gap: var(--space--8);
                  `}"
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
                      javascript="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          const emails = form.querySelector('[key="emails"]');
                          emails.hidden = true;
                          for (const element of leafac.descendants(emails))
                            if (element.disabled !== undefined) element.disabled = true;
                          form.querySelector('[key="button--create-invitation"]').hidden = false;
                          form.querySelector('[key="button--send-invitation-emails"]').hidden = true;
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
                      javascript="${javascript`
                        this.onchange = () => {
                          const form = this.closest("form");
                          const emails = form.querySelector('[key="emails"]');
                          emails.hidden = false;
                          for (const element of leafac.descendants(emails))
                            if (element.disabled !== undefined) element.disabled = false;
                          form.querySelector('[key="button--create-invitation"]').hidden = true;
                          form.querySelector('[key="button--send-invitation-emails"]').hidden = false;
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

              <div key="emails" hidden class="label">
                <div class="label--text">
                  Emails
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          trigger: "click",
                          content: ${html`
                            <div
                              css="${css`
                                padding: var(--space--2);
                                display: flex;
                                flex-direction: column;
                                gap: var(--space--2);
                              `}"
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
                          `},  
                        },
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
                  css="${css`
                    height: var(--space--32);
                  `}"
                  javascript="${javascript`
                    this.onvalidate = () => {
                      const emails = [];
                      for (let email of this.value.split(/[,\\n]/)) {
                        email = email.trim();
                        let name = null;
                        const match = email.match(/^(?<name>.*)<(?<email>.*)>$/);
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
                  css="${css`
                    display: flex;
                    gap: var(--space--8);
                  `}"
                >
                  $${application.web.locals.helpers.courseRoles.map(
                    (courseRole) => html`
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
                          $${iconsCourseRole[courseRole].regular}
                          ${labelsCourseRole[courseRole]}
                        </span>
                        <span class="text--blue">
                          $${iconsCourseRole[courseRole].fill}
                          ${labelsCourseRole[courseRole]}
                        </span>
                      </label>
                    `,
                  )}
                </div>
              </div>

              <div class="label">
                <p class="label--text">Expiration</p>
                <div
                  css="${css`
                    display: flex;
                    gap: var(--space--2);
                    align-items: flex-start;
                  `}"
                >
                  <label
                    class="button button--tight button--tight--inline button--transparent"
                  >
                    <input
                      type="checkbox"
                      class="visually-hidden input--radio-or-checkbox--multilabel"
                      javascript="${javascript`
                        this.onchange = () => {
                          const expiresAt = this.closest("form").querySelector('[key="expires-at"]');
                          expiresAt.hidden = !this.checked;
                          for (const element of leafac.descendants(expiresAt))
                            if (element.disabled !== undefined) element.disabled = !this.checked;
                        };
                      `}"
                    />
                    <span
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "Set as Expiring",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-minus"></i>
                      Doesn’t Expire
                    </span>
                    <span
                      class="text--amber"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            touch: false,
                            content: "Set as Not Expiring",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-calendar-plus-fill"></i>
                      Expires at
                    </span>
                  </label>
                  <div
                    key="expires-at"
                    hidden
                    css="${css`
                      display: flex;
                      gap: var(--space--2);
                      align-items: flex-start;
                    `}"
                  >
                    <input
                      type="text"
                      name="expiresAt"
                      value="${new Date().toISOString()}"
                      required
                      autocomplete="off"
                      disabled
                      class="input--text"
                      css="${css`
                        width: var(--space--40);
                        margin: var(--space---2) var(--space--0);
                      `}"
                      javascript="${javascript`
                        this.value = this.defaultValue = leafac.localizeDateTime(this.defaultValue);

                        this.onvalidate = () => {
                          const error = leafac.validateLocalizedDateTime(this);
                          if (typeof error === "string") return error;
                          if (new Date(this.value).getTime() <= Date.now()) return "Must be in the future.";
                        };
                      `}"
                    />
                    <button
                      type="button"
                      class="button button--tight button--tight--inline button--transparent"
                      javascript="${javascript`
                        leafac.setTippy({
                          event,
                          element: this,
                          tippyProps: {
                            trigger: "click",
                            content: "This datetime will be converted to UTC, which may lead to surprising off-by-one-hour differences if it crosses a daylight saving time change.",
                          },
                        });
                      `}"
                    >
                      <i class="bi bi-info-circle"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <button
                  key="button--create-invitation"
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-link"></i>
                  Create Invitation Link
                </button>
                <button
                  key="button--send-invitation-emails"
                  class="button button--full-width-on-small-screen button--blue"
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
                      application.web.locals.helpers.isPast(
                        invitation.expiresAt,
                      );
                    const isUsed = invitation.usedAt !== null;

                    return html`
                      <div
                        key="invitation--${invitation.reference}"
                        css="${css`
                          padding-top: var(--space--4);
                          border-top: var(--border-width--1) solid
                            var(--color--zinc--200);
                          @media (prefers-color-scheme: dark) {
                            border-color: var(--color--zinc--700);
                          }
                          display: flex;
                          gap: var(--space--2);
                        `}"
                      >
                        <div>
                          $${invitation.email === null
                            ? html`
                                <span
                                  javascript="${javascript`
                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      tippyProps: {
                                        touch: false,
                                        content: "Invitation Link",
                                      },
                                    });
                                  `}"
                                >
                                  <i class="bi bi-link"></i>
                                </span>
                              `
                            : html`
                                <span
                                  javascript="${javascript`
                                    leafac.setTippy({
                                      event,
                                      element: this,
                                      tippyProps: {
                                        touch: false,
                                        content: "Invitation Email",
                                      },
                                    });
                                  `}"
                                >
                                  <i class="bi bi-envelope"></i>
                                </span>
                              `}
                        </div>
                        <div
                          css="${css`
                            flex: 1;
                            display: flex;
                            flex-direction: column;
                            gap: var(--space--2);
                          `}"
                        >
                          $${invitation.email === null
                            ? html`
                                <div>
                                  <button
                                    key="see-invitation-link"
                                    class="button button--tight button--tight--inline button--transparent strong"
                                    javascript="${javascript`
                                      leafac.setTippy({
                                        event,
                                        element: this,
                                        tippyProps: {
                                          touch: false,
                                          content: "See Invitation Link",
                                        },
                                      });

                                      leafac.setTippy({
                                        event,
                                        element: this,
                                        elementProperty: "dropdown",
                                        tippyProps: {
                                          trigger: "click",
                                          interactive: true,
                                          maxWidth: "none",
                                          content: ${(() => {
                                            const link = `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/invitations/${invitation.reference}`;
                                            return html`
                                              <div
                                                css="${css`
                                                  display: flex;
                                                  flex-direction: column;
                                                  gap: var(--space--2);
                                                `}"
                                              >
                                                $${isInvitationExpired
                                                  ? html`
                                                      <p
                                                        class="text--rose"
                                                        css="${css`
                                                          display: flex;
                                                          gap: var(--space--2);
                                                          justify-content: center;
                                                        `}"
                                                      >
                                                        <i
                                                          class="bi bi-calendar-x-fill"
                                                        ></i>
                                                        Expired
                                                      </p>
                                                    `
                                                  : html``}
                                                <div
                                                  css="${css`
                                                    display: flex;
                                                    gap: var(--space--2);
                                                    align-items: center;
                                                  `}"
                                                >
                                                  <input
                                                    type="text"
                                                    readonly
                                                    value="${link}"
                                                    class="input--text"
                                                    css="${css`
                                                      flex: 1;
                                                    `}"
                                                    javascript="${javascript`
                                                      this.onfocus = () => {
                                                        this.select();
                                                      };
                                                    `}"
                                                  />
                                                  <button
                                                    class="button button--tight button--transparent"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          touch: false,
                                                          content: "Copy Link",
                                                        },
                                                      });

                                                      this.onclick = async () => {
                                                        await navigator.clipboard.writeText(${link});
                                                        const stickies = this.querySelector('[key="stickies"]');
                                                        const check = this.querySelector('[key="check"]');
                                                        stickies.hidden = true;
                                                        check.hidden = false;
                                                        await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                                        stickies.hidden = false;
                                                        check.hidden = true;
                                                      };
                                                    `}"
                                                  >
                                                    <span key="stickies">
                                                      <i
                                                        class="bi bi-stickies"
                                                      ></i>
                                                    </span>
                                                    <span
                                                      key="check"
                                                      hidden
                                                      class="text--green"
                                                    >
                                                      <i
                                                        class="bi bi-check-lg"
                                                      ></i>
                                                    </span>
                                                  </button>
                                                  <a
                                                    href="${link}"
                                                    class="button button--tight button--transparent"
                                                    javascript="${javascript`
                                                      leafac.setTippy({
                                                        event,
                                                        element: this,
                                                        tippyProps: {
                                                          touch: false,
                                                          content: "See QR Code for Link",
                                                        },
                                                      });
                                                    `}"
                                                    ><i
                                                      class="bi bi-qr-code"
                                                    ></i
                                                  ></a>
                                                </div>
                                              </div>
                                            `;
                                          })()},
                                        },
                                      });
                                    `}"
                                  >
                                    ${"*".repeat(
                                      6,
                                    )}${invitation.reference.slice(6)}
                                    <i class="bi bi-chevron-down"></i>
                                  </button>
                                </div>
                              `
                            : html`
                                <div>
                                  <button
                                    class="button button--tight button--tight--inline button--transparent"
                                    css="${css`
                                      text-align: left;
                                      display: flex;
                                      flex-direction: column;
                                      align-items: flex-start;
                                      gap: var(--space--0);
                                    `}"
                                    javascript="${javascript`
                                      leafac.setTippy({
                                        event,
                                        element: this,
                                        elementProperty: "dropdown",
                                        tippyProps: {
                                          trigger: "click",
                                          interactive: true,
                                          content: ${html`
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
                                                        javascript="${javascript`
                                                          leafac.setTippy({
                                                            event,
                                                            element: this,
                                                            tippyProps: {
                                                              theme: "rose",
                                                              trigger: "click",
                                                              content: "You may not resend this invitation because it’s used.",
                                                            },
                                                          });
                                                        `}"
                                                      `
                                                    : isInvitationExpired
                                                    ? html`
                                                        type="button"
                                                        javascript="${javascript`
                                                          leafac.setTippy({
                                                            event,
                                                            element: this,
                                                            tippyProps: {
                                                              theme: "rose",
                                                              trigger: "click",
                                                              content: "You may not resend this invitation because it’s expired.",
                                                            },
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
                                          `},  
                                        },
                                      });
                                    `}"
                                  >
                                    <div
                                      class="strong"
                                      css="${css`
                                        display: flex;
                                        align-items: baseline;
                                        gap: var(--space--2);
                                      `}"
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
                            css="${css`
                              display: flex;
                              flex-wrap: wrap;
                              gap: var(--space--2);
                            `}"
                          >
                            <div
                              css="${css`
                                width: var(--space--36);
                                display: flex;
                                justify-content: flex-start;
                              `}"
                            >
                              <button
                                class="button button--tight button--tight--inline button--transparent ${textColorsCourseRole[
                                  invitation.courseRole
                                ]}"
                                javascript="${javascript`
                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    tippyProps: {
                                      touch: false,
                                      content: "Update Course Role",
                                    },
                                  });

                                  leafac.setTippy({
                                    event,
                                    element: this,
                                    elementProperty: "dropdown",
                                    tippyProps: {
                                      trigger: "click",
                                      interactive: true,
                                      content: ${html`
                                        <div class="dropdown--menu">
                                          $${application.web.locals.helpers.courseRoles.map(
                                            (courseRole) => html`
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
                                                    : "button--transparent"} ${textColorsCourseRole[
                                                    courseRole
                                                  ]}"
                                                  $${isUsed
                                                    ? html`
                                                        type="button"
                                                        javascript="${javascript`
                                                            leafac.setTippy({
                                                              event,
                                                              element: this,
                                                              tippyProps: {
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the course role of this invitation because it’s used.",
                                                              },
                                                            });
                                                          `}"
                                                      `
                                                    : isInvitationExpired
                                                    ? html`
                                                        type="button"
                                                        javascript="${javascript`
                                                            leafac.setTippy({
                                                              event,
                                                              element: this,
                                                              tippyProps: {
                                                                theme: "rose",
                                                                trigger: "click",
                                                                content: "You may not update the course role of this invitation because it’s expired.",
                                                              },
                                                            });
                                                          `}"
                                                      `
                                                    : html``}
                                                >
                                                  $${iconsCourseRole[
                                                    courseRole
                                                  ][
                                                    courseRole ===
                                                    "course-staff"
                                                      ? "fill"
                                                      : "regular"
                                                  ]}
                                                  ${labelsCourseRole[
                                                    courseRole
                                                  ]}
                                                </button>
                                              </form>
                                            `,
                                          )}
                                        </div>
                                      `},  
                                    },
                                  });
                                `}"
                              >
                                $${iconsCourseRole[invitation.courseRole][
                                  invitation.courseRole === "course-staff"
                                    ? "fill"
                                    : "regular"
                                ]}
                                ${labelsCourseRole[invitation.courseRole]}
                                <i class="bi bi-chevron-down"></i>
                              </button>
                            </div>

                            <div
                              css="${css`
                                width: var(--space--40);
                                display: flex;
                                justify-content: flex-start;
                              `}"
                            >
                              $${(() => {
                                const updateExpirationForm = html`
                                  <form
                                    method="PATCH"
                                    action="${action}"
                                    novalidate
                                    css="${css`
                                      gap: var(--space--2);
                                    `}"
                                  >
                                    <div class="dropdown--menu--item">
                                      <input
                                        type="text"
                                        name="expiresAt"
                                        value="${new Date(
                                          invitation.expiresAt ?? new Date(),
                                        ).toISOString()}"
                                        required
                                        autocomplete="off"
                                        class="input--text"
                                        javascript="${javascript`
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
                                          css="${css`
                                            cursor: default;
                                          `}"
                                          javascript="${javascript`
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              tippyProps: {
                                                interactive: true,
                                                content: ${html`
                                                  <div>
                                                    Used
                                                    <time
                                                      datetime="${new Date(
                                                        invitation.usedAt!,
                                                      ).toISOString()}"
                                                      javascript="${javascript`
                                                        leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                                                      `}"
                                                    ></time>
                                                  </div>
                                                `},
                                              },
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
                                          javascript="${javascript`
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              tippyProps: {
                                                touch: false,
                                                content: "Update Expiration",
                                              },
                                            });

                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              elementProperty: "dropdown",
                                              tippyProps: {
                                                trigger: "click",
                                                interactive: true,
                                                content: ${html`
                                                  <div
                                                    css="${css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-x-fill"
                                                      ></i>
                                                      <span>
                                                        Expired
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt!,
                                                          ).toISOString()}"
                                                          javascript="${javascript`
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
                                                `},  
                                              },
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
                                          javascript="${javascript`
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              tippyProps: {
                                                touch: false,
                                                content: "Update Expiration",
                                              },
                                            });

                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              elementProperty: "dropdown",
                                              tippyProps: {
                                                trigger: "click",
                                                interactive: true,
                                                content: ${html`
                                                  <div
                                                    css="${css`
                                                      padding-top: var(
                                                        --space--2
                                                      );
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `}"
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
                                                `},  
                                              },
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
                                          javascript="${javascript`
                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              tippyProps: {
                                                touch: false,
                                                content: "Update Expiration",
                                              },
                                            });

                                            leafac.setTippy({
                                              event,
                                              element: this,
                                              elementProperty: "dropdown",
                                              tippyProps: {
                                                trigger: "click",
                                                interactive: true,
                                                content: ${html`
                                                  <div
                                                    css="${css`
                                                      display: flex;
                                                      flex-direction: column;
                                                      gap: var(--space--2);
                                                    `}"
                                                  >
                                                    <h3 class="heading">
                                                      <i
                                                        class="bi bi-calendar-plus-fill"
                                                      ></i>
                                                      <span>
                                                        Expires
                                                        <time
                                                          datetime="${new Date(
                                                            invitation.expiresAt,
                                                          ).toISOString()}"
                                                          javascript="${javascript`
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
                                                `},  
                                              },
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
        }),
      );
    },
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
      Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
    >;
    response: express.Response<
      any,
      Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
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
            subject: `Join ${invitation.course.name}`,
            html: html`
              <p>
                Join ${invitation.course.name}:<br />
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
      `,
    );
    application.got
      .post(`http://127.0.0.1:${application.ports.workerEventsAny}/send-email`)
      .catch((error) => {
        response.locals.log(
          "FAILED TO EMIT ‘/send-email’ EVENT",
          String(error),
          error?.stack,
        );
      });
  };

  application.web.post<
    { courseReference: string },
    HTML,
    {
      type?: "link" | "email";
      courseRole?: Application["web"]["locals"]["helpers"]["courseRoles"][number];
      expiresAt?: string;
      emails?: string;
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/invitations",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      if (
        typeof request.body.courseRole !== "string" ||
        !application.web.locals.helpers.courseRoles.includes(
          request.body.courseRole,
        ) ||
        (request.body.expiresAt !== undefined &&
          (typeof request.body.expiresAt !== "string" ||
            !application.web.locals.helpers.isDate(request.body.expiresAt) ||
            application.web.locals.helpers.isPast(request.body.expiresAt))) ||
        typeof request.body.type !== "string" ||
        !["link", "email"].includes(request.body.type)
      )
        return next("Validation");

      switch (request.body.type) {
        case "link":
          const invitation = application.database.get<{ reference: string }>(
            sql`
              SELECT * FROM "invitations" WHERE "id" = ${
                application.database.run(
                  sql`
                    INSERT INTO "invitations" ("createdAt", "expiresAt", "course", "reference", "courseRole")
                    VALUES (
                      ${new Date().toISOString()},
                      ${request.body.expiresAt},
                      ${response.locals.course.id},
                      ${cryptoRandomString({ length: 10, type: "numeric" })},
                      ${request.body.courseRole}
                    )
                  `,
                ).lastInsertRowid
              }
            `,
          )!;

          application.web.locals.helpers.Flash.set({
            request,
            response,
            theme: "green",
            content: html`
              Invitation link created successfully.
              <button
                class="link"
                javascript="${javascript`
                  this.onclick = () => {
                    tippy.hideAll();
                    const button = document.querySelector(${`[key="invitation--${invitation.reference}"] [key="see-invitation-link"]`});
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
                email.match(application.web.locals.helpers.emailRegExp) ===
                null,
            )
          )
            return next("Validation");

          for (const { email, name } of emails) {
            if (
              application.database.get<{}>(
                sql`
                  SELECT TRUE
                  FROM "courseParticipants"
                  JOIN "users" ON
                    "courseParticipants"."user" = "users"."id" AND
                    "users"."email" = ${email}
                  WHERE "courseParticipants"."course" = ${response.locals.course.id}
                `,
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
              `,
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
                `,
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
              courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
            }>(
              sql`
                SELECT * FROM "invitations" WHERE "id" = ${
                  application.database.run(
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
                    `,
                  ).lastInsertRowid
                }
              `,
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

          application.web.locals.helpers.Flash.set({
            request,
            response,
            theme: "green",
            content: html`Invitation emails sent successfully.`,
          });
          break;
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/invitations`,
      );
    },
  );

  type ResponseLocalsInvitation =
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] & {
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
          studentsMayCreatePollsAt: string | null;
        };
        reference: string;
        email: string | null;
        name: string | null;
        courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
      };
    };

  application.web.use<
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
        courseStudentsMayCreatePollsAt: string | null;
        reference: string;
        email: string | null;
        name: string | null;
        courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
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
            "courses"."studentsMayCreatePollsAt" AS "courseStudentsMayCreatePollsAt",
            "invitations"."reference",
            "invitations"."email",
            "invitations"."name",
            "invitations"."courseRole"
          FROM "invitations"
          JOIN "courses" ON
            "invitations"."course" = "courses"."id" AND
            "courses"."reference" = ${request.params.courseReference}
          WHERE "invitations"."reference" = ${request.params.invitationReference}
        `,
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
          studentsMayCreatePollsAt: invitation.courseStudentsMayCreatePollsAt,
        },
        reference: invitation.reference,
        email: invitation.email,
        name: invitation.name,
        courseRole: invitation.courseRole,
      };

      next();
    },
  );

  application.web.patch<
    { courseReference: string; invitationReference: string },
    HTML,
    {
      resend?: "true";
      courseRole?: Application["web"]["locals"]["helpers"]["courseRoles"][number];
      expiresAt?: string;
      removeExpiration?: "true";
      expire?: "true";
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"] &
      ResponseLocalsInvitation
  >(
    "/courses/:courseReference/settings/invitations/:invitationReference",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff" ||
        response.locals.invitation === undefined
      )
        return next();

      if (response.locals.invitation.usedAt !== null) return next("Validation");

      if (request.body.resend === "true") {
        if (
          application.web.locals.helpers.isPast(
            response.locals.invitation.expiresAt,
          ) ||
          response.locals.invitation.email === null
        )
          return next("Validation");

        sendInvitationEmail({
          request,
          response,
          invitation: response.locals.invitation,
        });

        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation email resent successfully.`,
        });
      }

      if (request.body.courseRole !== undefined) {
        if (
          application.web.locals.helpers.isPast(
            response.locals.invitation.expiresAt,
          ) ||
          !application.web.locals.helpers.courseRoles.includes(
            request.body.courseRole,
          )
        )
          return next("Validation");

        application.database.run(
          sql`
            UPDATE "invitations"
            SET "courseRole" = ${request.body.courseRole}
            WHERE "id" = ${response.locals.invitation.id}
          `,
        );

        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation course role updated successfully.`,
        });
      }

      if (request.body.expiresAt !== undefined) {
        if (
          typeof request.body.expiresAt !== "string" ||
          !application.web.locals.helpers.isDate(request.body.expiresAt) ||
          application.web.locals.helpers.isPast(request.body.expiresAt)
        )
          return next("Validation");

        application.database.run(
          sql`UPDATE "invitations" SET "expiresAt" = ${request.body.expiresAt} WHERE "id" = ${response.locals.invitation.id}`,
        );

        application.web.locals.helpers.Flash.set({
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
          `,
        );

        application.web.locals.helpers.Flash.set({
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
          `,
        );

        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Invitation expired successfully.`,
        });
      }

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/invitations`,
      );
    },
  );

  application.web.get<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"] &
      ResponseLocalsInvitation
  >(
    "/courses/:courseReference/invitations/:invitationReference",
    asyncHandler(async (request, response, next) => {
      if (response.locals.invitation === undefined)
        return response.status(404).send(
          application.web.locals.layouts.box({
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
          }),
        );

      if (response.locals.invitation.usedAt !== null)
        return response.send(
          application.web.locals.layouts.box({
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
              $${application.web.locals.partials.course({
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
          }),
        );

      if (
        application.web.locals.helpers.isPast(
          response.locals.invitation.expiresAt,
        )
      )
        return response.send(
          application.web.locals.layouts.box({
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
              $${application.web.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <hr class="separator" />
              <p class="strong">
                This invitation is expired. Please contact your course staff.
              </p>
            `,
          }),
        );

      if (response.locals.user === undefined)
        return response.send(
          application.web.locals.layouts.box({
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
              $${application.web.locals.partials.course({
                request,
                response,
                course: response.locals.invitation.course,
              })}
              <div
                css="${css`
                  display: flex;
                  gap: var(--space--4);
                  & > * {
                    flex: 1;
                  }
                `}"
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
                      `,
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
                          { addQueryPrefix: true },
                        )}"
                        class="button button--blue"
                      >
                        <i class="bi bi-person-plus-fill"></i>
                        Sign Up
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
                          { addQueryPrefix: true },
                        )}"
                        class="button ${invitationUserExists
                          ? "button--blue"
                          : "button--transparent"}"
                      >
                        <i class="bi bi-box-arrow-in-right"></i>
                        Sign In
                      </a>
                    `;

                  return buttons;
                })()}
              </div>
            `,
          }),
        );

      if (response.locals.user.emailVerifiedAt === null) return next();

      if (
        response.locals.invitation.email !== null &&
        response.locals.invitation.email.toLowerCase() !==
          response.locals.user.email.toLowerCase()
      )
        return response.send(
          application.web.locals.layouts.box({
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
              $${application.web.locals.partials.course({
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
          }),
        );

      if (response.locals.course !== undefined)
        if (typeof request.query.redirect === "string")
          return response.redirect(
            303,
            `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/${request.query.redirect}`,
          );
        else {
          const link = `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/invitations/${response.locals.invitation.reference}`;
          return response.send(
            application.web.locals.layouts.box({
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
                <a
                  href="https://${application.configuration
                    .hostname}/courses/${response.locals.invitation.course
                    .reference}"
                  class="button button--tight button--tight--inline button--transparent"
                  css="${css`
                    justify-content: start;
                  `}"
                >
                  $${application.web.locals.partials.course({
                    request,
                    response,
                    course: response.locals.invitation.course,
                  })}
                </a>
                <hr class="separator" />
                <p class="strong">You’re already participating.</p>

                $${response.locals.invitation.email === null
                  ? html`
                      <p>
                        You may share this invitation with other people by
                        asking them to point their phone camera at the following
                        QR Code:
                      </p>

                      <div>
                        <div
                          css="${css`
                            display: flex;
                            gap: var(--space--2);
                            align-items: baseline;
                          `}"
                        >
                          <input
                            type="text"
                            readonly
                            value="${link}"
                            class="input--text"
                            css="${css`
                              flex: 1;
                            `}"
                            javascript="${javascript`
                              this.onfocus = () => {
                                this.select();
                              };
                            `}"
                          />
                          <div>
                            <button
                              class="button button--tight button--transparent"
                              javascript="${javascript`
                                leafac.setTippy({
                                  event,
                                  element: this,
                                  tippyProps: {
                                    touch: false,
                                    content: "Copy Link",
                                  },
                                });

                                this.onclick = async () => {
                                  await navigator.clipboard.writeText(${link});
                                  const stickies = this.querySelector('[key="stickies"]');
                                  const check = this.querySelector('[key="check"]');
                                  stickies.hidden = true;
                                  check.hidden = false;
                                  await new Promise((resolve) => { window.setTimeout(resolve, 1000); });
                                  stickies.hidden = false;
                                  check.hidden = true;
                                };
                              `}"
                            >
                              <span key="stickies">
                                <i class="bi bi-stickies"></i>
                              </span>
                              <span key="check" hidden class="text--green">
                                <i class="bi bi-check-lg"></i>
                              </span>
                            </button>
                          </div>
                        </div>

                        $${(
                          await QRCode.toString(
                            `https://${application.configuration.hostname}/courses/${response.locals.invitation.course.reference}/invitations/${response.locals.invitation.reference}`,
                            { type: "svg" },
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
            }),
          );
        }

      response.send(
        application.web.locals.layouts.box({
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
            $${application.web.locals.partials.course({
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
                { addQueryPrefix: true },
              )}"
            >
              <button
                class="button button--blue"
                css="${css`
                  width: 100%;
                `}"
              >
                <i class="bi bi-journal-arrow-down"></i>
                Join as
                ${labelsCourseRole[response.locals.invitation.courseRole]}
              </button>
            </form>
          `,
        }),
      );
    }),
  );

  application.web.post<
    { courseReference: string; invitationReference: string },
    HTML,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["SignedIn"] &
      Partial<
        Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
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

      application.database.executeTransaction(() => {
        application.database.run(
          sql`
            INSERT INTO "courseParticipants" ("createdAt", "user", "course", "reference", "courseRole", "accentColor")
            VALUES (
              ${new Date().toISOString()},
              ${response.locals.user.id},
              ${response.locals.invitation.course.id},
              ${cryptoRandomString({ length: 10, type: "numeric" })},
              ${response.locals.invitation.courseRole},
              ${defaultAccentColor({ request, response })}
            )
          `,
        );
        if (response.locals.invitation.email !== null)
          application.database.run(
            sql`
              UPDATE "invitations"
              SET "usedAt" = ${new Date().toISOString()}
              WHERE "id" = ${response.locals.invitation.id}
            `,
          );
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${
          response.locals.invitation.course.reference
        }/${
          typeof request.query.redirect === "string"
            ? request.query.redirect
            : ""
        }`,
      );
    },
  );

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/course-participants",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      const courseParticipants = application.database
        .all<{
          id: number;
          userId: number;
          userLastSeenOnlineAt: string;
          userReference: string;
          userEmail: string;
          userName: string;
          userAvatar: string | null;
          userAvatarlessBackgroundColor: Application["web"]["locals"]["helpers"]["userAvatarlessBackgroundColors"][number];
          userBiographySource: string | null;
          userBiographyPreprocessed: HTML | null;
          reference: string;
          courseRole: Application["web"]["locals"]["helpers"]["courseRoles"][number];
        }>(
          sql`
            SELECT
              "courseParticipants"."id",
              "users"."id" AS "userId",
              "users"."lastSeenOnlineAt" AS "userLastSeenOnlineAt",
              "users"."reference" AS "userReference",
              "users"."email" AS "userEmail",
              "users"."name" AS "userName",
              "users"."avatar" AS "userAvatar",
              "users"."avatarlessBackgroundColor" AS "userAvatarlessBackgroundColor",
              "users"."biographySource" AS "userBiographySource",
              "users"."biographyPreprocessed" AS "userBiographyPreprocessed",
              "courseParticipants"."reference",
              "courseParticipants"."courseRole"
            FROM "courseParticipants"
            JOIN "users" ON "courseParticipants"."user" = "users"."id"
            WHERE "courseParticipants"."course" = ${response.locals.course.id}
            ORDER BY
              "courseParticipants"."courseRole" ASC,
              "users"."name" ASC
          `,
        )
        .map((courseParticipantRow) => ({
          id: courseParticipantRow.id,
          user: {
            id: courseParticipantRow.userId,
            lastSeenOnlineAt: courseParticipantRow.userLastSeenOnlineAt,
            reference: courseParticipantRow.userReference,
            email: courseParticipantRow.userEmail,
            name: courseParticipantRow.userName,
            avatar: courseParticipantRow.userAvatar,
            avatarlessBackgroundColor:
              courseParticipantRow.userAvatarlessBackgroundColor,
            biographySource: courseParticipantRow.userBiographySource,
            biographyPreprocessed:
              courseParticipantRow.userBiographyPreprocessed,
          },
          reference: courseParticipantRow.reference,
          courseRole: courseParticipantRow.courseRole,
        }));

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Course Participants · Course Settings ·
              ${response.locals.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-people-fill"></i>
              Course Participants
            </h2>

            <label
              css="${css`
                display: flex;
                gap: var(--space--2);
                align-items: baseline;
              `}"
            >
              <i class="bi bi-funnel"></i>
              <input
                type="text"
                class="input--text"
                placeholder="Filter…"
                javascript="${javascript`
                  this.isModified = false;

                  this.oninput = () => {
                    const filterPhrases = this.value.split(/[^a-z0-9]+/i).filter((filterPhrase) => filterPhrase.trim() !== "");
                    for (const courseParticipant of document.querySelectorAll('[key^="course-participant/"]')) {
                      let courseParticipantHidden = filterPhrases.length > 0;
                      for (const filterablePhrasesElement of courseParticipant.querySelectorAll("[data-filterable-phrases]")) {
                        const filterablePhrases = JSON.parse(filterablePhrasesElement.getAttribute("data-filterable-phrases"));
                        const filterablePhrasesElementChildren = [];
                        for (const filterablePhrase of filterablePhrases) {
                          let filterablePhraseElement;
                          if (filterPhrases.some(filterPhrase => filterablePhrase.toLowerCase().startsWith(filterPhrase.toLowerCase()))) {
                            filterablePhraseElement = document.createElement("mark");
                            filterablePhraseElement.classList.add("mark");
                            courseParticipantHidden = false;
                          } else
                            filterablePhraseElement = document.createElement("span");
                          filterablePhraseElement.textContent = filterablePhrase;
                          filterablePhrasesElementChildren.push(filterablePhraseElement);
                        }
                        filterablePhrasesElement.replaceChildren(...filterablePhrasesElementChildren);
                      }
                      courseParticipant.hidden = courseParticipantHidden;
                    }
                  };
                `}"
              />
            </label>

            $${courseParticipants.map((courseParticipant) => {
              const action = `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/course-participants/${courseParticipant.reference}`;
              const isSelf =
                courseParticipant.id === response.locals.courseParticipant.id;
              const isOnlyCourseStaff =
                isSelf &&
                courseParticipants.filter(
                  (courseParticipant) =>
                    courseParticipant.courseRole === "course-staff",
                ).length === 1;

              return html`
                <div
                  key="course-participant/${courseParticipant.reference}"
                  css="${css`
                    padding-top: var(--space--2);
                    border-top: var(--border-width--1) solid
                      var(--color--zinc--200);
                    @media (prefers-color-scheme: dark) {
                      border-color: var(--color--zinc--700);
                    }
                    display: flex;
                    gap: var(--space--2);
                  `}"
                  javascript="${javascript`
                    this.onbeforemorph = (event) => !event?.detail?.liveUpdate;
                  `}"
                >
                  <div>
                    $${application.web.locals.partials.user({
                      request,
                      response,
                      courseParticipant,
                      name: false,
                    })}
                  </div>

                  <div
                    css="${css`
                      flex: 1;
                      margin-top: var(--space--0-5);
                      display: flex;
                      flex-direction: column;
                      gap: var(--space--2);
                      min-width: var(--space--0);
                    `}"
                  >
                    <div>
                      <div
                        class="strong"
                        data-filterable-phrases="${JSON.stringify(
                          application.web.locals.helpers.splitFilterablePhrases(
                            courseParticipant.user.name,
                          ),
                        )}"
                      >
                        ${courseParticipant.user.name}
                      </div>
                      <div class="secondary">
                        <span
                          css="${css`
                            margin-right: var(--space--2);
                          `}"
                          data-filterable-phrases="${JSON.stringify(
                            application.web.locals.helpers.splitFilterablePhrases(
                              courseParticipant.user.email,
                            ),
                          )}"
                        >
                          ${courseParticipant.user.email}
                        </span>
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          css="${css`
                            font-size: var(--font-size--xs);
                            line-height: var(--line-height--xs);
                            display: inline-flex;
                          `}"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Copy Email",
                              },
                            });


                            leafac.setTippy({
                              event,
                              element: this,
                              elementProperty: "copied",
                              tippyProps: {
                                theme: "green",
                                trigger: "manual",
                                content: "Copied",
                              },
                            });

                            this.onclick = async () => {
                              await navigator.clipboard.writeText(${courseParticipant.user.email});
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
                        css="${css`
                          font-size: var(--font-size--xs);
                        `}"
                      >
                        <span>
                          Last seen online
                          <time
                            datetime="${new Date(
                              courseParticipant.user.lastSeenOnlineAt,
                            ).toISOString()}"
                            javascript="${javascript`
                              leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                            `}"
                          ></time>
                        </span>
                      </div>
                    </div>

                    <div
                      css="${css`
                        display: flex;
                        flex-wrap: wrap;
                        gap: var(--space--2);
                      `}"
                    >
                      <div
                        css="${css`
                          width: var(--space--36);
                          display: flex;
                          justify-content: flex-start;
                        `}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent ${textColorsCourseRole[
                            courseParticipant.courseRole
                          ]}"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                touch: false,
                                content: "Update Course Role",
                              },
                            });

                            leafac.setTippy({
                              event,
                              element: this,
                              elementProperty: "dropdown",
                              tippyProps: {
                                trigger: "click",
                                interactive: true,
                                content: ${html`
                                  <div class="dropdown--menu">
                                    $${application.web.locals.helpers.courseRoles.map(
                                      (courseRole) => html`
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
                                              courseParticipant.courseRole
                                                ? "button--blue"
                                                : "button--transparent"} ${textColorsCourseRole[
                                                courseRole
                                              ]}"
                                              $${isOnlyCourseStaff
                                                ? html`
                                                    type="button"
                                                    javascript="${javascript`
                                                        leafac.setTippy({
                                                          event,
                                                          element: this,
                                                          tippyProps: {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            content: "You may not update your own course role because you’re the only course staff member.",
                                                          },
                                                        });
                                                      `}"
                                                  `
                                                : isSelf
                                                ? html`
                                                    type="button"
                                                    javascript="${javascript`
                                                        leafac.setTippy({
                                                          event,
                                                          element: this,
                                                          elementProperty: "dropdown",
                                                          tippyProps: {
                                                            theme: "rose",
                                                            trigger: "click",
                                                            interactive: true,
                                                            appendTo: document.querySelector("body"),
                                                            content: ${html`
                                                              <form
                                                                key="course-role--${courseRole}"
                                                                method="PATCH"
                                                                action="${action}"
                                                                css="${css`
                                                                  padding: var(
                                                                    --space--2
                                                                  );
                                                                  display: flex;
                                                                  flex-direction: column;
                                                                  gap: var(
                                                                    --space--4
                                                                  );
                                                                `}"
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
                                                                  ${labelsCourseRole[
                                                                    courseRole
                                                                  ].toLowerCase()}?
                                                                </p>
                                                                <p>
                                                                  <strong
                                                                    css="${css`
                                                                      font-weight: var(
                                                                        --font-weight--bold
                                                                      );
                                                                    `}"
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
                                                                  ${labelsCourseRole[
                                                                    courseRole
                                                                  ]}
                                                                </button>
                                                              </form>
                                                            `},  
                                                          },
                                                        });
                                                      `}"
                                                  `
                                                : html``}
                                            >
                                              $${iconsCourseRole[courseRole][
                                                courseRole === "course-staff"
                                                  ? "fill"
                                                  : "regular"
                                              ]}
                                              ${labelsCourseRole[courseRole]}
                                            </button>
                                          </div>
                                        </form>
                                      `,
                                    )}
                                  </div>
                                `},  
                              },
                            });
                          `}"
                        >
                          $${iconsCourseRole[courseParticipant.courseRole][
                            courseParticipant.courseRole === "course-staff"
                              ? "fill"
                              : "regular"
                          ]}
                          ${labelsCourseRole[courseParticipant.courseRole]}
                          <i class="bi bi-chevron-down"></i>
                        </button>
                      </div>

                      <div
                        css="${css`
                          width: var(--space--8);
                          display: flex;
                          justify-content: flex-start;
                        `}"
                      >
                        <button
                          class="button button--tight button--tight--inline button--transparent"
                          javascript="${javascript`
                            leafac.setTippy({
                              event,
                              element: this,
                              tippyProps: {
                                theme: "rose",
                                touch: false,
                                content: "Remove from the Course",
                              },
                            });

                            if (${isOnlyCourseStaff})
                              leafac.setTippy({
                                event,
                                element: this,
                                elementProperty: "dropdown",
                                tippyProps: {
                                  theme: "rose",
                                  trigger: "click",
                                  content: "You may not remove yourself from the course because you’re the only course staff member.",
                                },
                              });
                            else
                              leafac.setTippy({
                                event,
                                element: this,
                                elementProperty: "dropdown",
                                tippyProps: {
                                  theme: "rose",
                                  trigger: "click",
                                  interactive: true,
                                  content: ${html`
                                    <form
                                      method="DELETE"
                                      action="${action}"
                                      css="${css`
                                        padding: var(--space--2);
                                        display: flex;
                                        flex-direction: column;
                                        gap: var(--space--4);
                                      `}"
                                    >
                                      <p>
                                        Are you sure you want to remove
                                        ${isSelf
                                          ? "yourself"
                                          : "this course participant"}
                                        from the course?
                                      </p>
                                      <p>
                                        <strong
                                          css="${css`
                                            font-weight: var(
                                              --font-weight--bold
                                            );
                                          `}"
                                        >
                                          You may not undo this action!
                                        </strong>
                                      </p>
                                      <button class="button button--rose">
                                        <i class="bi bi-person-dash-fill"></i>
                                        Remove ${isSelf ? "Myself" : ""} from
                                        the Course
                                      </button>
                                    </form>
                                  `},  
                                },
                              });
                          `}"
                        >
                          <i class="bi bi-person-dash"></i>
                        </button>
                      </div>
                    </div>

                    $${courseParticipant.user.biographyPreprocessed !== null
                      ? html`
                          <details class="details">
                            <summary>Biography</summary>
                            $${application.web.locals.partials.content({
                              request,
                              response,
                              contentPreprocessed:
                                courseParticipant.user.biographyPreprocessed,
                              context: "plain",
                            }).contentProcessed}
                          </details>
                        `
                      : html``}
                  </div>
                </div>
              `;
            })}
          `,
        }),
      );
    },
  );

  type ResponseLocalsManagedCourseParticipant =
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"] & {
      managedCourseParticipant: {
        id: number;
        reference: string;
        isSelf: boolean;
      };
    };

  application.web.use<
    { courseReference: string; courseParticipantReference: string },
    any,
    {},
    {},
    ResponseLocalsManagedCourseParticipant
  >(
    "/courses/:courseReference/settings/course-participants/:courseParticipantReference",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      const managedCourseParticipant = application.database.get<{
        id: number;
        reference: string;
      }>(
        sql`
          SELECT "id", "reference"
          FROM "courseParticipants"
          WHERE
            "course" = ${response.locals.course.id} AND
            "reference" = ${request.params.courseParticipantReference}
        `,
      );
      if (managedCourseParticipant === undefined) return next();
      response.locals.managedCourseParticipant = {
        ...managedCourseParticipant,
        isSelf:
          managedCourseParticipant.id === response.locals.courseParticipant.id,
      };

      if (
        response.locals.managedCourseParticipant.isSelf &&
        application.database.get<{ count: number }>(
          sql`
            SELECT COUNT(*) AS "count"
            FROM "courseParticipants"
            WHERE
              "course" = ${response.locals.course.id} AND
              "courseRole" = ${"course-staff"}
          `,
        )!.count === 1
      )
        return next("Validation");

      next();
    },
  );

  application.web.patch<
    { courseReference: string; courseParticipantReference: string },
    HTML,
    {
      courseRole?: Application["web"]["locals"]["helpers"]["courseRoles"][number];
    },
    {},
    ResponseLocalsManagedCourseParticipant
  >(
    "/courses/:courseReference/settings/course-participants/:courseParticipantReference",
    (request, response, next) => {
      if (response.locals.managedCourseParticipant === undefined) return next();

      if (typeof request.body.courseRole === "string") {
        if (
          !application.web.locals.helpers.courseRoles.includes(
            request.body.courseRole,
          )
        )
          return next("Validation");

        application.database.run(
          sql`
            UPDATE "courseParticipants"
            SET "courseRole" = ${request.body.courseRole}
            WHERE "id" = ${response.locals.managedCourseParticipant.id}
          `,
        );

        application.web.locals.helpers.Flash.set({
          request,
          response,
          theme: "green",
          content: html`Course participant updated successfully.`,
        });
      }

      response.redirect(
        303,
        response.locals.managedCourseParticipant.isSelf
          ? `https://${application.configuration.hostname}/courses/${response.locals.course.reference}`
          : `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/course-participants`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.delete<
    { courseReference: string; courseParticipantReference: string },
    HTML,
    {},
    {},
    ResponseLocalsManagedCourseParticipant
  >(
    "/courses/:courseReference/settings/course-participants/:courseParticipantReference",
    (request, response, next) => {
      if (response.locals.managedCourseParticipant === undefined) return next();

      application.database.run(
        sql`
          DELETE FROM "courseParticipants"
          WHERE "id" = ${response.locals.managedCourseParticipant.id}
        `,
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          $${response.locals.managedCourseParticipant.isSelf
            ? html`You removed yourself`
            : html`Course participant removed`}
          from the course successfully.
        `,
      });
      response.redirect(
        303,
        response.locals.managedCourseParticipant.isSelf
          ? `https://${application.configuration.hostname}/`
          : `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/course-participants`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/advanced",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              Advanced · Course Settings · ${response.locals.course.name} ·
              Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-journal-medical"></i>
              Advanced
            </h2>

            <form
              method="PATCH"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/advanced"
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--2);
              `}"
            >
              <div
                css="${css`
                  display: flex;
                `}"
              >
                <label class="button button--tight button--tight--inline">
                  <input
                    type="checkbox"
                    name="studentsMayCreatePolls"
                    $${typeof response.locals.course
                      .studentsMayCreatePollsAt === "string"
                      ? html`checked`
                      : html``}
                    class="input--checkbox"
                  />
                  Students may create polls
                </label>
              </div>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Advanced Settings
                </button>
              </div>
            </form>

            <hr class="separator" />

            <form
              method="PUT"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/advanced/archived"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--1);
              `}"
            >
              $${response.locals.course.archivedAt === null
                ? html`
                    <input type="hidden" name="isArchived" value="true" />
                    <div>
                      <button class="button button--rose">
                        <i class="bi bi-archive-fill"></i>
                        Archive Course
                      </button>
                    </div>
                    <div
                      class="secondary"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `}"
                    >
                      You may unarchive a course at any time.
                    </div>
                  `
                : html`
                    <input type="hidden" name="isArchived" value="false" />
                    <div>
                      <button class="button button--rose">
                        <i class="bi bi-archive-fill"></i>
                        Unarchive Course
                      </button>
                    </div>
                    <div
                      class="secondary"
                      css="${css`
                        font-size: var(--font-size--xs);
                        line-height: var(--line-height--xs);
                      `}"
                    >
                      <span>
                        Archived
                        <time
                          datetime="${new Date(
                            response.locals.course.archivedAt,
                          ).toISOString()}"
                          javascript="${javascript`
                            leafac.relativizeDateTimeElement(this, { preposition: "on", target: this.parentElement });
                          `}"
                        ></time
                        >.
                      </span>
                    </div>
                  `}
            </form>

            <hr class="separator" />

            <form
              method="GET"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/advanced/export"
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--1);
              `}"
            >
              <div>
                <button class="button button--green">
                  <i class="bi bi-journal-arrow-down"></i>
                  Download All Anonymized Questions as JSON
                </button>
              </div>
              <div
                class="secondary"
                css="${css`
                  font-size: var(--font-size--xs);
                  line-height: var(--line-height--xs);
                `}"
              >
                This feature is experimental and the format of the JSON will
                change in future versions of Courselore.
              </div>
            </form>
          `,
        }),
      );
    },
  );

  application.web.patch<
    { courseReference: string },
    HTML,
    {
      studentsMayCreatePolls?: "on";
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/advanced",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      if (![undefined, "on"].includes(request.body.studentsMayCreatePolls))
        return next("Validation");

      application.database.run(
        sql`
          UPDATE "courses"
          SET "studentsMayCreatePollsAt" = ${
            request.body.studentsMayCreatePolls === "on"
              ? new Date().toISOString()
              : null
          }
          WHERE "id" = ${response.locals.course.id}
        `,
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Advanced settings updated successfully.`,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/advanced`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.put<
    { courseReference: string },
    HTML,
    { isArchived?: "true" | "false" },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/advanced/archived",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      if (
        typeof request.body.isArchived !== "string" ||
        !["true", "false"].includes(request.body.isArchived)
      )
        return next("Validation");

      application.database.run(
        sql`
          UPDATE "courses"
          SET "archivedAt" = ${
            request.body.isArchived === "true" ? new Date().toISOString() : null
          }
          WHERE "id" = ${response.locals.course.id}
        `,
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`
          Course
          ${request.body.isArchived === "true" ? "archived" : "unarchived"}
          successfully.
        `,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/advanced`,
      );

      application.web.locals.helpers.liveUpdates({
        request,
        response,
        url: `/courses/${response.locals.course.reference}`,
      });
    },
  );

  application.web.get<
    { courseReference: string },
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/advanced/export",
    (request, response, next) => {
      if (
        response.locals.course === undefined ||
        response.locals.courseParticipant.courseRole !== "course-staff"
      )
        return next();

      const questions = [];

      for (const conversationRow of application.database.all<{
        reference: string;
      }>(
        sql`
          SELECT "conversations"."reference"
          FROM "conversations"
          WHERE
            "conversations"."course" = ${response.locals.course.id} AND (
              "conversations"."participants" = 'everyone' $${
                response.locals.courseParticipant.courseRole === "course-staff"
                  ? sql`OR "conversations"."participants" = 'course-staff'`
                  : sql``
              } OR EXISTS(
                SELECT TRUE
                FROM "conversationSelectedParticipants"
                WHERE
                  "conversationSelectedParticipants"."conversation" = "conversations"."id" AND
                  "conversationSelectedParticipants"."courseParticipant" = ${
                    response.locals.courseParticipant.id
                  }
              )
            )
            AND "conversations"."type" = 'question'
          ORDER BY "conversations"."id" ASC
        `,
      )) {
        const conversation = application.web.locals.helpers.getConversation({
          request,
          response,
          conversationReference: conversationRow.reference,
        })!;

        const messages = application.database
          .all<{ reference: string }>(
            sql`
              SELECT "reference"
              FROM "messages"
              WHERE "conversation" = ${conversation.id}
              ORDER BY "id" ASC
            `,
          )
          .map(
            (messageRow) =>
              application.web.locals.helpers.getMessage({
                request,
                response,
                conversation,
                messageReference: messageRow.reference,
              })!,
          );

        questions.push({
          ID: conversation.reference,
          Conversation: messages.map((message) => ({
            Role:
              message.authorCourseParticipant === "no-longer-participating"
                ? "No Longer Participating"
                : labelsCourseRole[message.authorCourseParticipant.courseRole],
            Text: message.contentSearch.replace(
              /(?<=^|\s)@([a-z0-9-]+)(?=[^a-z0-9-]|$)/gi,
              "@anonymous",
            ),
          })),
          Tags: conversation.taggings.map((tagging) => tagging.tag.name),
        });
      }

      response
        .header(
          "Content-Disposition",
          `attachment;filename="${response.locals.course.name.replaceAll(
            `"`,
            `\\"`,
          )}.json"`,
        )
        .contentType("application/json")
        .send(JSON.stringify(questions, undefined, 2));
    },
  );

  application.web.get<
    { courseReference: string },
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/my-course-participation",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      response.send(
        layoutCourseSettings({
          request,
          response,
          head: html`
            <title>
              My Course Participation · Course Settings ·
              ${response.locals.course.name} · Courselore
            </title>
          `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-sliders"></i>
              Course Settings ·
              <i class="bi bi-person-fill"></i>
              My Course Participation
            </h2>

            <form
              method="PATCH"
              action="https://${application.configuration
                .hostname}/courses/${response.locals.course
                .reference}/settings/my-course-participation"
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <div class="label">
                <div class="label--text">
                  Accent Color
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          trigger: "click",
                          content: "A bar with the accent color appears at the top of pages related to this course to help you differentiate between courses.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </div>
                <div
                  css="${css`
                    margin-top: var(--space--1);
                    display: flex;
                    gap: var(--space--2);
                  `}"
                >
                  $${application.web.locals.helpers.courseParticipantAccentColors.map(
                    (accentColor) => html`
                      <input
                        type="radio"
                        name="accentColor"
                        value="${accentColor}"
                        required
                        $${accentColor ===
                        response.locals.courseParticipant.accentColor
                          ? html`checked`
                          : html``}
                        class="input--radio"
                        style="
                          --color--accent-color--400: var(--color--${accentColor}--400);
                          --color--accent-color--500: var(--color--${accentColor}--500);
                          --color--accent-color--600: var(--color--${accentColor}--600);
                          --color--accent-color--700: var(--color--${accentColor}--700);
                        "
                        css="${css`
                          background-color: var(--color--accent-color--500);
                          &:hover,
                          &:focus-within {
                            background-color: var(--color--accent-color--400);
                          }
                          &:active {
                            background-color: var(--color--accent-color--600);
                          }
                          @media (prefers-color-scheme: dark) {
                            background-color: var(--color--accent-color--600);
                            &:hover,
                            &:focus-within {
                              background-color: var(--color--accent-color--500);
                            }
                            &:active {
                              background-color: var(--color--accent-color--700);
                            }
                          }
                        `}"
                      />
                    `,
                  )}
                </div>
              </div>
              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update My Course Participation
                </button>
              </div>
            </form>
          `,
        }),
      );
    },
  );

  application.web.patch<
    { courseReference: string },
    HTML,
    {
      accentColor?: Application["web"]["locals"]["helpers"]["courseParticipantAccentColors"][number];
    },
    {},
    Application["web"]["locals"]["ResponseLocals"]["CourseParticipant"]
  >(
    "/courses/:courseReference/settings/my-course-participation",
    (request, response, next) => {
      if (response.locals.course === undefined) return next();

      if (
        typeof request.body.accentColor !== "string" ||
        !application.web.locals.helpers.courseParticipantAccentColors.includes(
          request.body.accentColor,
        )
      )
        return next("Validation");

      application.database.run(
        sql`
          UPDATE "courseParticipants"
          SET "accentColor" = ${request.body.accentColor}
          WHERE "id" = ${response.locals.courseParticipant.id}
        `,
      );

      application.web.locals.helpers.Flash.set({
        request,
        response,
        theme: "green",
        content: html`Course participation updated successfully.`,
      });

      response.redirect(
        303,
        `https://${application.configuration.hostname}/courses/${response.locals.course.reference}/settings/my-course-participation`,
      );
    },
  );
};
