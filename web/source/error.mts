import express from "express";
import qs from "qs";
import html, { HTML } from "@leafac/html";
import css from "@leafac/css";
import javascript from "@leafac/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.web.use<
    {},
    HTML,
    {},
    { redirect?: string },
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"] &
      Partial<Application["web"]["locals"]["ResponseLocals"]["SignedIn"]>
  >((request, response) => {
    if (typeof request.header("Live-Connection") !== "string") {
      if (response.locals.user === undefined)
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/sign-in${qs.stringify(
            { redirect: request.originalUrl.slice(1) },
            { addQueryPrefix: true },
          )}`,
        );

      if (typeof request.query.redirect === "string")
        return response.redirect(
          303,
          `https://${application.configuration.hostname}/${request.query.redirect}`,
        );
    }

    if (response.locals.user?.emailVerifiedAt === null)
      return response.send(
        application.web.locals.layouts.box({
          request,
          response,
          head: html` <title>Email Verification · Courselore</title> `,
          body: html`
            <h2 class="heading">
              <i class="bi bi-person-check-fill"></i>
              Email Verification
            </h2>

            <p>
              Please verify your email by following the link sent to
              <span class="strong">${response.locals.user.email}</span>
            </p>

            <hr class="separator" />

            <form
              method="POST"
              action="https://${application.configuration
                .hostname}/resend-email-verification${qs.stringify(
                { redirect: request.originalUrl.slice(1) },
                { addQueryPrefix: true },
              )}"
            >
              Didn’t receive the email? Already checked your spam inbox?
              <button class="link">Resend</button>.
            </form>

            <hr class="separator" />

            <p>
              Have the wrong email address?
              <button
                class="link"
                javascript="${javascript`
                  this.onclick = () => {
                    document.querySelector('[key="update-email"]').hidden = false;
                  };
              `}"
              >
                Update email</button
              >.
            </p>

            <form
              key="update-email"
              method="PATCH"
              action="https://${application.configuration
                .hostname}/settings/email-and-password${qs.stringify(
                { redirect: request.originalUrl.slice(1) },
                { addQueryPrefix: true },
              )}"
              hidden
              novalidate
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--space--4);
              `}"
            >
              <label class="label">
                <p class="label--text">Email</p>
                <input
                  type="email"
                  name="email"
                  placeholder="you@educational-institution.edu"
                  value="${response.locals.user.email}"
                  required
                  class="input--text"
                  javascript="${javascript`
                    this.onvalidate = () => {
                      if (!leafac.isModified(this))
                        return "Please provide the email address to which you’d like to update.";
                    };
                  `}"
                />
              </label>
              <div class="label">
                <p class="label--text">
                  Password Confirmation
                  <button
                    type="button"
                    class="button button--tight button--tight--inline button--transparent"
                    javascript="${javascript`
                      leafac.setTippy({
                        event,
                        element: this,
                        tippyProps: {
                          trigger: "click",
                          content: "You must confirm your password because this is an important operation that affects your account.",
                        },
                      });
                    `}"
                  >
                    <i class="bi bi-info-circle"></i>
                  </button>
                </p>
                <input
                  type="password"
                  name="passwordConfirmation"
                  required
                  class="input--text"
                />
              </div>

              <div>
                <button
                  class="button button--full-width-on-small-screen button--blue"
                >
                  <i class="bi bi-pencil-fill"></i>
                  Update Email
                </button>
              </div>
            </form>

            $${application.configuration.demonstration
              ? html`
                  <hr class="separator" />

                  <p
                    css="${css`
                      font-weight: var(--font-weight--bold);
                    `}"
                  >
                    This Courselore installation is running in Demonstration
                    Mode.
                    <a
                      href="https://${application.configuration.hostname}:8000"
                      target="_blank"
                      class="link"
                    >
                      Open Demonstration Inbox</a
                    >.
                  </p>
                `
              : html``}
          `,
        }),
      );

    response.status(404).send(
      application.web.locals.layouts.box({
        request,
        response,
        head: html`<title>404 Not Found · Courselore</title>`,
        body: html`
          <h2 class="heading">
            <i class="bi bi-question-diamond-fill"></i>
            404 Not Found
          </h2>
          <p>
            If you think there should be something here, please contact your
            course staff or the system administrator at
            <a
              href="${application.web.locals.partials.reportIssueHref}"
              target="_blank"
              class="link"
              >${application.configuration.administratorEmail}</a
            >.
          </p>
        `,
      }),
    );
  });

  application.web.use(((error, request, response, next) => {
    response.locals.log("ERROR", String(error), error?.stack);

    if (!["Cross-Site Request Forgery", "Validation"].includes(error))
      error = "Server";

    response
      .status(
        error === "Cross-Site Request Forgery"
          ? 403
          : error === "Validation"
            ? 422
            : 500,
      )
      .send(
        application.web.locals.layouts.box({
          request,
          response,
          head: html`<title>${error} Error · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-bug-fill"></i>
              ${error} Error
            </h2>

            <p>
              ${error === "Cross-Site Request Forgery"
                ? "This request doesn’t appear to have come from Courselore. Please try again. If the issue persists, please report to the system administrator at"
                : "This is an issue in Courselore. Please report to the system administrator at"}
              <a
                href="${application.web.locals.partials.reportIssueHref}"
                target="_blank"
                class="link"
                >${application.configuration.administratorEmail}</a
              >.
            </p>
          `,
        }),
      );
  }) as express.ErrorRequestHandler<
    {},
    any,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >);
};
