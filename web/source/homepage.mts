import * as serverTypes from "@radically-straightforward/server";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import * as caddy from "@radically-straightforward/caddy";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "GET",
    pathname: "/",
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (request.state.user !== undefined) return;
      response.end(
        application.layouts.base({
          request,
          response,
          head: html`<title>Courselore</title>`,
          body: html`
            <div
              key="main--main /"
              class="scroll"
              css="${css`
                width: 100%;
                height: 100%;
              `}"
            >
              <div
                css="${css`
                  background-image: radial-gradient(
                    light-dark(
                        var(--color--slate--300),
                        var(--color--slate--700)
                      )
                      var(--size--px),
                    transparent var(--size--0)
                  );
                  background-size: var(--size--4) var(--size--4);
                  padding: var(--size--20) var(--size--4) var(--size--0)
                    var(--size--4);
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  gap: var(--size--32);
                `}"
              >
                <div
                  css="${css`
                    font-family:
                      "Roboto Serif Variable", var(--font-family--serif);
                    font-weight: 900;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: var(--size--2);
                    @media (max-width: 559px) {
                      font-size: var(--font-size--5);
                      line-height: var(--font-size--5--line-height);
                    }
                    @media (min-width: 560px) {
                      font-size: var(--font-size--9);
                      line-height: var(--font-size--9--line-height);
                    }
                  `}"
                >
                  <div>Communication platform</div>
                  <div
                    css="${css`
                      display: grid;
                      & > * {
                        grid-area: 1 / 1;
                      }
                    `}"
                  >
                    <div
                      css="${css`
                        color: light-dark(
                          var(--color--yellow--300),
                          var(--color--yellow--700)
                        );
                        opacity: var(--opacity--50);
                        margin: -0.2em -1em -0.3em -1em;
                        position: relative;
                      `}"
                    >
                      <svg
                        viewBox="0 0 291.2677 71.839319"
                        preserveAspectRatio="none"
                        css="${css`
                          width: 100%;
                          height: 100%;
                          position: absolute;
                        `}"
                      >
                        <path
                          fill="currentColor"
                          d="m 51.968069,71.829835 c -1.969897,-0.0877 -3.636327,-0.38212 -5.006141,-0.88458 -1.12814,-0.41381 -3.372524,-1.50396 -4.407259,-2.1407 -0.768269,-0.47277 -1.981173,-1.58199 -2.775053,-2.53782 -1.698629,-2.04515 -3.425589,-5.43646 -3.934162,-7.72571 -0.203311,-0.91515 -0.393653,-3.6578 -0.32226,-4.64346 0.121763,-1.68109 1.081341,-4.66998 2.196718,-6.84236 0.697856,-1.35919 1.674862,-2.73305 2.591069,-3.64354 0.234007,-0.23255 0.4104,-0.43705 0.391983,-0.45444 -0.0184,-0.0174 -2.629378,0.69609 -5.802141,1.58554 -8.977181,2.51664 -12.067013,3.30514 -15.890849,4.05522 -8.758575,1.71807 -14.2606425,0.97979 -16.4627335,-2.209 -1.245626,-1.80377 -1.99230803,-4.349495 -2.51874503,-8.58736 -0.1702476,-1.370519 0.463366,-13.190452 0.813861,-18.264987 C 1.0147775,15.211651 25.566961,10.738099 37.206299,8.8901093 49.03831,6.8718853 50.768433,6.6112653 57.52672,5.8291243 c 4.571597,-0.529074 9.640963,-0.889846 23.400653,-1.66536 25.146167,-1.417273 41.553387,-2.256154 61.404237,-3.139524 7.96727,-0.35454703 32.20997,-1.04359003 36.02406,-1.02382402829 4.66677,0.0240899983 8.83398,0.12935399829 9.58528,0.24212499829 0.10581,0.01588 0.65857,0.05259 1.22835,0.08157 1.9097,0.09713 4.06726,0.489222 5.66133,1.02883403 1.22258,0.413865 2.88965,1.195586 3.58206,1.679701 1.79345,1.253947 4.3218,4.1866 5.47855,6.354605 l 0.45243,0.8479377 0.27245,-0.04533 c 0.30084,-0.05006 2.7154,-0.3334447 5.54255,-0.6505037 4.63089,-0.519344 6.95267,-0.691477 13.38159,-0.992082 l 3.74976,-0.175333 2.77934,-0.618209 c 3.05974,-0.680582 4.46641,-0.964909 6.24757,-1.262822 1.00134,-0.167479 1.4223,-0.198715 2.75279,-0.204259 2.11892,-0.0088 2.68115,0.117944 5.30481,1.196144 2.87675,1.18221 3.43959,1.516771 4.92755,2.9290267 1.111,1.05447 2.20532,2.352106 2.9177,3.459772 0.54501,0.847416 1.31335,2.343732 1.62553,3.165621 0.26672,0.702228 0.69002,2.280787 0.69931,2.607826 0.004,0.140954 0.0459,0.199998 0.13969,0.196878 0.22593,-0.0076 3.22635,-0.382613 5.90923,-0.738744 8.52717,-1.13192 10.51753,-1.335325 14.05473,-1.436325 8.54772,-0.24417 12.16783,1.584345 14.43504,7.290781 2.90396,7.309071 2.91388,19.150725 0.0214,25.603735 -0.59672,1.33129 -1.17677,2.25362 -1.91054,3.03788 -0.71,0.75887 -1.33237,1.23764 -2.24968,1.73067 -1.67481,0.90015 -3.76529,1.468 -6.53952,1.77638 -1.40041,0.15567 -6.2673,0.2247 -8.15751,0.1157 -4.06054,-0.23413 -5.99193,-0.4269 -17.32856,-1.72944 -10.25647,-1.17845 -13.63373,-1.38412 -21.07062,-1.28325 -16.55505,0.22456 -49.44377,1.11093 -59.03445,1.59101 -12.8058,0.64103 -21.24141,1.2413 -31.54501,2.24474 -12.00183,1.16881 -36.70678,4.08646 -42.767841,5.05085 -4.88316,0.77698 -6.64983,1.17386 -11.078603,2.48875 -6.207941,1.84315 -7.242349,2.10403 -12.173178,3.07023 -9.27584,1.81759 -14.472626,2.64294 -19.070806,3.02881 -1.309825,0.10991 -3.397206,0.1824 -4.210348,0.14623 z"
                        />
                      </svg>
                    </div>
                    <div
                      css="${css`
                        position: relative;
                      `}"
                    >
                      for education
                    </div>
                  </div>
                </div>
                <img
                  src="/${caddy.staticFiles["screenshot--light.webp"]}"
                  width="900"
                  height="691"
                  css="${css`
                    max-width: 100%;
                    height: auto;
                    border: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    border-top-left-radius: var(--border-radius--1);
                    border-top-right-radius: var(--border-radius--1);
                    && {
                      border-bottom: none;
                    }
                    box-shadow: 0 0 50px 0 rgba(0, 0, 0, 0.25);
                    @media (prefers-color-scheme: dark) {
                      display: none;
                    }
                  `}"
                />
                <img
                  src="/${caddy.staticFiles["screenshot--dark.webp"]}"
                  width="900"
                  height="691"
                  css="${css`
                    max-width: 100%;
                    height: auto;
                    border: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    border-top-left-radius: var(--border-radius--1);
                    border-top-right-radius: var(--border-radius--1);
                    && {
                      border-bottom: none;
                    }
                    box-shadow: 0 0 50px 0 rgba(0, 0, 0, 0.25);
                    @media (prefers-color-scheme: light) {
                      display: none;
                    }
                  `}"
                />
              </div>
              <div
                css="${css`
                  color: light-dark(
                    var(--color--fuchsia--100),
                    var(--color--fuchsia--900)
                  );
                  background-image:
                    radial-gradient(
                      ellipse at top,
                      light-dark(
                        var(--color--violet--800),
                        var(--color--violet--200)
                      ),
                      transparent
                    ),
                    radial-gradient(
                      ellipse at bottom,
                      light-dark(
                        var(--color--rose--800),
                        var(--color--rose--200)
                      ),
                      transparent
                    );
                  background-color: light-dark(
                    var(--color--fuchsia--800),
                    var(--color--fuchsia--200)
                  );
                  min-height: 100vh;
                  padding: var(--size--20) var(--size--4);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: var(--size--20);
                `}"
              >
                <div
                  css="${css`
                    font-family:
                      "Roboto Serif Variable", var(--font-family--serif);
                    font-weight: 900;
                    @media (max-width: 559px) {
                      font-size: var(--font-size--5);
                      line-height: var(--font-size--5--line-height);
                    }
                    @media (min-width: 560px) {
                      font-size: var(--font-size--9);
                      line-height: var(--font-size--9--line-height);
                    }
                  `}"
                >
                  <span>Courselore</span>
                  <span
                    css="${css`
                      font-weight: 400;
                      color: light-dark(
                        var(--color--fuchsia--400),
                        var(--color--fuchsia--600)
                      );
                    `}"
                    >vs</span
                  >
                  <span
                    css="${css`
                      display: inline-flex;
                      flex-direction: column;
                    `}"
                  >
                    <span>Slack</span>
                    <span>Discord</span>
                    <span>Discourse</span>
                    <span
                      css="${css`
                        text-align: center;
                      `}"
                      ><i class="bi bi-three-dots-vertical"></i
                    ></span>
                  </span>
                </div>
                <div
                  css="${css`
                    width: 100%;
                    max-width: var(--size--96);
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <div
                    css="${css`
                      font-weight: 900;
                    `}"
                  >
                    Courselore is made by educators, for educators.
                  </div>
                  <div>
                    <div
                      css="${css`
                        font-weight: 900;
                      `}"
                    >
                      <i class="bi bi-mortarboard-fill"></i> For instructors
                    </div>
                    <div>
                      Forum for announcements, question-and-answer, and
                      polls.<br />
                      Fine-grained control of visibility of conversations and
                      messages.<br />
                      Easy onboarding of students with a comprehensive and
                      simple invitation system, and single sign-on with SAML.
                    </div>
                  </div>
                  <div>
                    <div
                      css="${css`
                        font-weight: 900;
                      `}"
                    >
                      <i class="bi bi-backpack-fill"></i> For students
                    </div>
                    <div>
                      Ask questions anonymously.<br />
                      Ask questions visible to other students, to help everyone
                      out, or only to instructors, to protect your privacy.
                    </div>
                  </div>
                  <div>
                    <div
                      css="${css`
                        font-weight: 900;
                      `}"
                    >
                      <i class="bi bi-person-arms-up"></i> For everyone
                    </div>
                    <div>
                      Modern and functional design with support for dark mode
                      and mobile (no need to install an application).<br />
                      Rich-text messaging with support for Markdown, LaTeX, and
                      syntax highlighting for code.
                    </div>
                  </div>
                  <div>
                    <div
                      css="${css`
                        font-weight: 900;
                      `}"
                    >
                      <i class="bi bi-gear-fill"></i> For system administrators
                    </div>
                    <div>
                      Open-source. Easy to self-host. Free hosted version for a
                      limited time.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `,
        }),
      );
    },
  });
};
