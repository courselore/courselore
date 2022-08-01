import qs from "qs";
import { html } from "@leafac/html";
export default (app) => {
    app.all("*", ...app.locals.middlewares.isSignedOut, (req, res) => {
        res.redirect(303, `https://${app.locals.options.host}/sign-in${qs.stringify({
            redirect: req.originalUrl,
        }, { addQueryPrefix: true })}`);
    });
    app.all("*", ...app.locals.middlewares.isSignedIn, (req, res) => {
        if (typeof req.query.redirect === "string" &&
            req.query.redirect.trim() !== "")
            return res.redirect(303, `https://${app.locals.options.host}${req.query.redirect}`);
        res.status(404).send(app.locals.layouts.box({
            req,
            res,
            head: html `<title>404 Not Found · Courselore</title>`,
            body: html `
            <h2 class="heading">
              <i class="bi bi-question-diamond-fill"></i>
              404 Not Found
            </h2>
            <p>
              If you think there should be something here, please contact your
              course staff or the system administrator at
              <a
                href="${app.locals.partials.reportIssueHref}"
                target="_blank"
                class="link"
                >${app.locals.options.administratorEmail}</a
              >.
            </p>
          `,
        }));
    });
    app.use(((err, req, res, next) => {
        console.error(`${new Date().toISOString()}\tERROR\t${err}`);
        const isCSRF = err.code === "EBADCSRFTOKEN";
        const isValidation = err === "validation";
        const message = isCSRF
            ? "Cross-Site"
            : isValidation
                ? "Validation"
                : "Server";
        res.status(isCSRF ? 403 : isValidation ? 422 : 500).send(app.locals.layouts.box({
            req,
            res,
            head: html `<title>${message} Error · Courselore</title>`,
            body: html `
          <h2 class="heading">
            <i class="bi bi-bug-fill"></i>
            ${message} Error
          </h2>
          $${isCSRF
                ? html `
                <p>
                  This request doesn’t appear to have come from Courselore.
                  Please try again.
                </p>
                <p>
                  If the issue persists, please report to the system
                  administrator at
                  <a
                    href="${app.locals.partials.reportIssueHref}"
                    target="_blank"
                    class="link"
                    >${app.locals.options.administratorEmail}</a
                  >.
                </p>
              `
                : html `
                <p>
                  This is an issue in Courselore, please report to the system
                  administrator at
                  <a
                    href="${app.locals.partials.reportIssueHref}"
                    target="_blank"
                    class="link"
                    >${app.locals.options.administratorEmail}</a
                  >.
                </p>
              `}
        `,
        }));
    }));
};
//# sourceMappingURL=error.js.map