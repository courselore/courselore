import express from "express";
import qs from "qs";
import { HTML, html } from "@leafac/html";
import { Courselore } from "./index.mjs";

export default async (app: Courselore): Promise<void> => {
  app.all<
    {},
    HTML,
    {},
    {},
    Application["server"]["locals"]["ResponseLocals"]["Base"]
  >("*", ...app.server.locals.middlewares.isSignedOut, (req, res) => {
    res.redirect(
      303,
      `https://${app.configuration.hostname}/sign-in${qs.stringify(
        { redirect: req.originalUrl.slice(1) },
        { addQueryPrefix: true }
      )}`
    );
  });

  app.all<
    {},
    HTML,
    {},
    { redirect?: string },
    Application["server"]["locals"]["ResponseLocals"]["SignedIn"]
  >("*", ...app.server.locals.middlewares.isSignedIn, (req, res) => {
    if (typeof req.query.redirect === "string")
      return res.redirect(
        303,
        `https://${app.configuration.hostname}/${req.query.redirect}`
      );
    res.status(404).send(
      app.server.locals.layouts.box({
        req,
        res,
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
              href="${app.server.locals.partials.reportIssueHref}"
              target="_blank"
              class="link"
              >${app.configuration.administratorEmail}</a
            >.
          </p>
        `,
      })
    );
  });

  /*
        return response.send(
          application.server.locals.layouts.box({
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
                  { addQueryPrefix: true }
                )}"
              >
                Didn’t receive the email? Already checked your spam inbox?
                <button class="link">Resend</button>
              </form>

              <hr class="separator" />

              <p>
                Have the wrong email address?
                <button
                  class="link"
                  onload="${javascript`
                    this.onclick = () => {
                      document.querySelector('[key="update-email"]').hidden = false;
                    };
                `}"
                >
                  Update email
                </button>
              </p>

              <form
                key="update-email"
                method="PATCH"
                action="https://${application.configuration
                  .hostname}/settings/email-and-password${qs.stringify(
                  { redirect: request.originalUrl.slice(1) },
                  { addQueryPrefix: true }
                )}"
                hidden
                novalidate
                css="${response.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  gap: var(--space--4);
                `)}"
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
                    onload="${javascript`
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
                      onload="${javascript`
                        (this.tooltip ??= tippy(this)).setProps({
                          trigger: "click",
                          content: "You must confirm your email because this is an important operation that affects your account.",
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
                ? (() => {
                    let emailVerification = application.database.get<{
                      nonce: string;
                    }>(
                      sql`
                        SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${response.locals.user.id}
                      `
                    );
                    if (emailVerification === undefined) {
                      application.server.locals.helpers.emailVerification({
                        request,
                        response,
                        userId: response.locals.user.id,
                        userEmail: response.locals.user.email,
                      });
                      emailVerification = application.database.get<{
                        nonce: string;
                      }>(
                        sql`
                          SELECT "nonce" FROM "emailVerifications" WHERE "user" = ${response.locals.user.id}
                        `
                      )!;
                    }
                    return html`
                      <hr class="separator" />

                      <p
                        css="${response.locals.css(css`
                          font-weight: var(--font-weight--bold);
                        `)}"
                      >
                        This Courselore installation is running in demonstration
                        mode and doesn’t send emails.
                        <a
                          href="https://${application.configuration
                            .hostname}/email-verification/${emailVerification.nonce}${qs.stringify(
                            { redirect: request.originalUrl.slice(1) },
                            { addQueryPrefix: true }
                          )}"
                          class="link"
                          >Verify email</a
                        >
                      </p>
                    `;
                  })()
                : html``}
            `,
          })
        );

  */

  /*
        if (request.method === "GET")
          response.redirect(
            303,
            `https://${application.configuration.hostname}/${
              typeof request.query.redirect === "string"
                ? request.query.redirect
                : ""
            }`
          );
        */

  app.use(((err, req, res, next) => {
    response.locals.log("ERROR", String(error));

    if (!["Cross-Site Request Forgery", "Validation"].includes(err))
      err = "Server";
    res
      .status(
        err === "Cross-Site Request Forgery"
          ? 403
          : err === "Validation"
          ? 422
          : 500
      )
      .send(
        app.server.locals.layouts.box({
          req,
          res,
          head: html`<title>${err} Error · Courselore</title>`,
          body: html`
            <h2 class="heading">
              <i class="bi bi-bug-fill"></i>
              ${err} Error
            </h2>

            <p>
              ${err === "Cross-Site Request Forgery"
                ? "This request doesn’t appear to have come from Courselore. Please try again. If the issue persists, please report to the system administrator at"
                : "This is an issue in Courselore. Please report to the system administrator at"}
              <a
                href="${app.server.locals.partials.reportIssueHref}"
                target="_blank"
                class="link"
                >${app.configuration.administratorEmail}</a
              >.
            </p>
          `,
        })
      );
  }) as express.ErrorRequestHandler<{}, any, {}, {}, Application["server"]["locals"]["ResponseLocals"]["Base"]>);
};
