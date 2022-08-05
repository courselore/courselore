import express from "express";
import { asyncHandler } from "@leafac/express-async-handler";
import { html } from "@leafac/html";
import { css } from "@leafac/css";
import { javascript } from "@leafac/javascript";
import got from "got";
import { Courselore, BaseMiddlewareLocals } from "./index.js";

// TODO: This middleware is needed only on courselore.org, for /mobile-app
interface IsUsingMobileAppMiddlewareLocals extends BaseMiddlewareLocals {}
const isUsingMobileAppMiddleware: express.RequestHandler<
  {},
  any,
  {},
  {},
  IsUsingMobileAppMiddlewareLocals
>[] = [
  (req, res, next) => {
    // TODO: Verify that the user is on the mobile app via Capacitor, if possible
    // Currently bypasses cookies for testing
    if (false) {
      //req.cookies.mobileAppRedirectUrl !== undefined
      res.redirect(303, req.cookies.mobileAppURedirectUrl);
      return;
    }
    next();
  },
];

export default (app: Courselore): void => {
  // TODO: This route should be on courselore.org only
  app.get<{}, any, {}, {}, IsUsingMobileAppMiddlewareLocals>(
    "/mobile-app",
    ...isUsingMobileAppMiddleware,
    (req, res) => {
      res.send(
        app.locals.layouts.base({
          req,
          res,
          head: html``,
          body: html`
            <div
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--10);
                padding: var(--space--10);
                align-items: center;
                flex-direction: column;
              `)}"
            >
              <div class="decorative-icon">
                $${app.locals.partials.logo({
                  size: 144 /* var(--space--36) */,
                })}
              </div>
              <div
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--5xl);
                  line-height: var(--line-height--5xl);
                  font-weight: var(--font-weight--black);
                  align-items: center;
                `)}"
              >
                Welcome to Courselore!
              </div>
              <h3
                class="heading--display secondary"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Thank you for installing the Courselore app. To begin, select
                the type of Courselore installation you plan to access.
                <button
                  class="button button--tight button--tight--inline button--inline button--transparent"
                  onload="${javascript`
                  (this.tooltip ??= tippy(this)).setProps({
                    trigger: "click",
                    content: "An installation hosted by Courselore has the 'courselore.org' domain. A self hosted installation does not have that domain. If you are unsure, ask your instructor or your institution's system administrator.",
                  });
                `}"
                >
                  <i class="bi bi-info-circle"></i>
                </button>
              </h3>
              <form
                method="PATCH"
                action="https://${app.locals.options.host}/mobile-app"
              >
                <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
                <input
                  type="hidden"
                  name="href"
                  value="https://courselore.org"
                />
                <button
                  class="button button--blue heading--display"
                  css="${res.locals.css(css`
                    align-items: center;
                  `)}"
                >
                  $${app.locals.partials.logo({ size: 20 })} Hosted by
                  Courselore
                </button>
              </form>
              <div
                css="${res.locals.css(css`
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: var(--space--5);
                `)}"
              >
                <button
                  class="button button--blue heading--display"
                  onload="${javascript`
                    this.onclick = () => {
                      document.querySelector('[key="url-input"]').hidden = !document.querySelector('[key="url-input"]').hidden;
                    }
                  `}"
                >
                  <i class="bi bi-person-fill"></i>
                  Self hosted
                </button>
                <div
                  key="url-input"
                  hidden
                  css="${res.locals.css(css`
                    display: flex;
                    flex-direction: column;
                    gap: var(--space--3);
                  `)}"
                >
                  Enter the full URL of the Courselore server below.
                  <form
                    method="PATCH"
                    action="https://${app.locals.options.host}/mobile-app"
                    css="${res.locals.css(css`
                      display: flex;
                      gap: var(--space--3);
                    `)}"
                  >
                    <input
                      type="hidden"
                      name="_csrf"
                      value="${req.csrfToken()}"
                    />
                    <input
                      type="url"
                      name="href"
                      value="https://"
                      class="input--text secondary"
                    />
                    <button class="button button--blue heading--display">
                      Go
                    </button>
                  </form>
                </div>
              </div>
            </div>
          `,
        })
      );
    }
  );

  app.patch<{}, any, { href?: string }, {}, BaseMiddlewareLocals>(
    "/mobile-app",
    asyncHandler(async (req, res, next) => {
      if (typeof req.body.href !== "string") return next("validation");

      // TODO: URL validation
      let isValidUrl: boolean;

      try {
        const parsedText = (await got(
          `${req.body.href}/information`
        ).json()) as { platform: string };
        isValidUrl = parsedText.platform === "Courselore";
      } catch (error) {
        // TODO: res.send("It didn’t work 🤷")
        isValidUrl = false;
      }

      // TODO: isValidUrl is a promise, not a boolean
      if (!isValidUrl) {
        res.redirect(
          303,
          `https://${
            app.locals.options.host
          }/mobile-app/confirm-selection/${encodeURIComponent(req.body.href)}`
        );
        return;
      }

      req.cookies.mobileAppRedirectUrl = req.body.href;
      res.cookie("mobileAppRedirectUrl", req.body.href, {
        ...app.locals.options.cookies,
        maxAge: app.locals.helpers.Session.maxAge,
      });
      res.redirect(303, req.body.href);
    })
  );

  // TODO: This route should be on courselore.org only
  app.get<{ href: string }, any, {}, {}, BaseMiddlewareLocals>(
    "/mobile-app/confirm-selection/:href",
    (req, res) => {
      res.send(
        app.locals.layouts.base({
          req,
          res,
          head: html` <title>Confirm Selection · Courselore</title> `,
          body: html`
            <div
              css="${res.locals.css(css`
                display: flex;
                gap: var(--space--10);
                padding: var(--space--10);
                align-items: center;
                flex-direction: column;
              `)}"
            >
              <h3
                class="heading--display"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                The URL you entered could not be validated as being for a
                Courselore installation. It may not be supported in the
                Courselore app, and selecting it could result in unexpected
                behavior.
              </h3>
              <h3
                class="heading--display text--rose"
                css="${res.locals.css(css`
                  font-size: var(--font-size--lg);
                  line-height: var(--line-height--lg);
                  font-weight: var(--font-weight--bold);
                `)}"
              >
                Are you sure you want to continue?
              </h3>
              <div
                css="${res.locals.css(css`
                  display: flex;
                  gap: var(--space--5);
                  align-items: center;
                  flex-direction: column;
                `)}"
              >
                <a
                  class="button button--rose heading--display"
                  href="${decodeURIComponent(req.params.href)}"
                >
                  Yes, continue anyways
                </a>
                <a
                  class="button button--blue heading--display"
                  href="https://${app.locals.options.host}/mobile-app"
                >
                  Go back
                </a>
              </div>
            </div>
          `,
        })
      );
    }
  );

  // TODO: This route should be on all Courselore instances
  app.get<{}, any, {}, {}, BaseMiddlewareLocals>("/information", (req, res) => {
    res.send({ platform: "Courselore", version: app.locals.options.version });
  });

  app.get<{}, any, {}, {}, BaseMiddlewareLocals>(
    "/mobile-app/entrypoint",
    (req, res) => {
      req.cookies.isUsingMobileApp = "true";
      res.cookie("isUsingMobileApp", "true", {
        ...app.locals.options.cookies,
        maxAge: app.locals.helpers.Session.maxAge,
      });
      res.redirect(303, `https://${app.locals.options.host}/`);
    }
  );
};
