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
    // Currently bypasses cookies for testing
    if (false) {
      //req.cookies.mobileAppRedirectUser
      res.redirect(303, req.cookies.mobileAppSelectedUrl);
      return;
    }
    next();
  },
];

export default (app: Courselore): void => {
  // TODO: This route should be on courselore.org only
  app.get<
    { invalidUrl?: string },
    any,
    {},
    {},
    IsUsingMobileAppMiddlewareLocals
  >(
    "/mobile-app(/invalid-url/:invalidUrl)?",
    ...isUsingMobileAppMiddleware,
    (req, res) => {
      res.send(
        app.locals.layouts.base({
          req,
          res,
          head: html`<title>Mobile App Setup · Courselore</title>`,
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
                      key="url-input-box"
                      type="url"
                      name="href"
                      placeholder="https://example-server.org"
                      class="input--text secondary"
                      onload="${javascript`
                        if (${req.params.invalidUrl !== undefined}) {
                          const decodedUrl = "${decodeURIComponent(
                            req.params.invalidUrl!
                          )}";
                          if (decodedUrl !== undefined) {
                            document.querySelector('[key="url-input"]').hidden = false;
                            (this.invalid ??= tippy(this)).setProps({
                              theme: "error",
                              trigger: "manual",
                              content: ${res.locals.html(
                                html`
                                  <label>
                                    The URL you entered could not be validated
                                    as being for a Courselore installation. If
                                    you think this is a mistake, contact your
                                    instructor or your institution's system
                                    administrator.
                                  </label>
                                `
                              )},
                            });
                            this.invalid.show();
                            this.value = decodedUrl;
                          }
                        }
  
                        if (${req.cookies.mobileAppSelectedUrl !== undefined})
                          (this.dropdown ??= tippy(this)).setProps({
                            trigger: "click",
                            interactive: true,
                            content: ${res.locals.html(
                              html`
                                <div class="dropdown--menu">
                                  <label class="secondary">
                                    Previous selection
                                  </label>
                                  <label
                                    class="dropdown--menu--item button button--transparent"
                                    onload="${javascript`
                                      this.textContent = "${req.cookies.mobileAppSelectedUrl}";
                                      this.onclick = () => document.querySelector('[key="url-input-box"]').value = this.textContent;
                                    `}"
                                  >
                                  </label>
                                </div>
                              `
                            )},
                          });
                      `}"
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

      let isValidUrl: boolean;
      try {
        const parsedText = (await got(
          `${req.body.href}/information`
        ).json()) as { platform: string; version: string };
        isValidUrl = parsedText.platform === "Courselore";
      } catch (error) {
        isValidUrl = false;
      }

      if (!isValidUrl) {
        res.redirect(
          303,
          `https://${
            app.locals.options.host
          }/mobile-app/invalid-url/${encodeURIComponent(req.body.href)}`
        );
        return;
      }

      req.cookies.mobileAppSelectedUrl = req.body.href;
      res.cookie("mobileAppSelectedUrl", req.body.href, {
        ...app.locals.options.cookies,
        maxAge: app.locals.helpers.Session.maxAge,
      });
      req.cookies.mobileAppRedirectUser = "true";
      res.cookie("mobileAppRedirectUser", "true", {
        ...app.locals.options.cookies,
        maxAge: app.locals.helpers.Session.maxAge,
      });
      res.redirect(303, `${req.body.href}/mobile-app/entrypoint`);
    })
  );

  // TODO: This route should be on all Courselore instances
  app.get<{}, any, {}, {}, BaseMiddlewareLocals>("/information", (req, res) => {
    res.send({ platform: "Courselore", version: app.locals.options.version });
  });

  // TODO: This route should be on all Courselore instances
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
