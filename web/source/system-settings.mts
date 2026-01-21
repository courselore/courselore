import * as serverTypes from "@radically-straightforward/server";
import sql from "@radically-straightforward/sqlite";
import html from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.server?.push({
    method: "GET",
    pathname: "/system-settings",
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Authentication"]
      >,
      response,
    ) => {
      if (
        request.state.user === undefined ||
        request.state.user.userRole !== "userRoleSystemAdministrator"
      )
        return;
      response.send(
        application.layouts.main({
          request,
          response,
          head: html`<title>System settings · Courselore</title>`,
          body: html`
            <div
              css="${css`
                display: flex;
                flex-direction: column;
                gap: var(--size--2);
              `}"
            >
              <div
                css="${css`
                  font-size: var(--font-size--4);
                  line-height: var(--font-size--4--line-height);
                  font-weight: 800;
                `}"
              >
                System settings
              </div>
              <details>
                <summary
                  class="button button--rectangle button--transparent"
                  css="${css`
                    font-weight: 500;
                  `}"
                >
                  <span
                    css="${css`
                      display: inline-block;
                      transition-property: var(
                        --transition-property--transform
                      );
                      transition-duration: var(--transition-duration--150);
                      transition-timing-function: var(
                        --transition-timing-function--ease-in-out
                      );
                      details[open] > summary > & {
                        rotate: var(--rotate--90);
                      }
                    `}"
                  >
                    <i class="bi bi-chevron-right"></i>
                  </span>
                  General settings
                </summary>
                <div
                  type="form"
                  method="PATCH"
                  action="/system-settings/general-settings"
                  css="${css`
                    padding: var(--size--2) var(--size--0);
                    border-bottom: var(--border-width--1) solid
                      light-dark(
                        var(--color--slate--200),
                        var(--color--slate--800)
                      );
                    display: flex;
                    flex-direction: column;
                    gap: var(--size--4);
                  `}"
                >
                  <div
                    css="${css`
                      display: flex;
                      flex-direction: column;
                      gap: var(--size--1);
                    `}"
                  >
                    <div
                      css="${css`
                        font-size: var(--font-size--3);
                        line-height: var(--font-size--3--line-height);
                        font-weight: 600;
                        color: light-dark(
                          var(--color--slate--500),
                          var(--color--slate--500)
                        );
                      `}"
                    >
                      User roles who may create courses
                    </div>
                    <form
                      css="${css`
                        display: flex;
                        flex-direction: column;
                        gap: var(--size--2);
                      `}"
                    >
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeSystem"
                          $${request.state.user.darkMode ===
                          "userDarkModeSystem"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  System
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeLight"
                          $${request.state.user.darkMode === "userDarkModeLight"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  Light
                      </label>
                      <label
                        class="button button--rectangle button--transparent"
                      >
                        <input
                          type="radio"
                          name="darkMode"
                          value="userDarkModeDark"
                          $${request.state.user.darkMode === "userDarkModeDark"
                            ? html`checked`
                            : html``}
                          class="input--radio"
                        />  Dark
                      </label>
                    </form>
                  </div>
                  <div
                    css="${css`
                      font-size: var(--font-size--3);
                      line-height: var(--font-size--3--line-height);
                    `}"
                  >
                    <button
                      type="submit"
                      class="button button--rectangle button--blue"
                    >
                      Update general settings
                    </button>
                  </div>
                </div>
              </details>
            </div>
          `,
        }),
      );
    },
  });

  // application.server?.push({
  //   method: "PATCH",
  //   pathname: "/settings/general-settings",
  //   handler: async (
  //     request: serverTypes.Request<
  //       {},
  //       {},
  //       {},
  //       {
  //         name: string;
  //         avatarImage: serverTypes.RequestBodyFile;
  //         "avatarImage--remove": "on";
  //         darkMode:
  //           | "userDarkModeSystem"
  //           | "userDarkModeLight"
  //           | "userDarkModeDark";
  //       },
  //       Application["types"]["states"]["Authentication"]
  //     >,
  //     response,
  //   ) => {
  //     if (request.state.user === undefined) return;
  //     if (
  //       typeof request.body.name !== "string" ||
  //       request.body.name.trim() === "" ||
  //       (typeof request.body.avatarImage === "object" &&
  //         request.body.avatarImage.mimeType !== "image/jpeg" &&
  //         request.body.avatarImage.mimeType !== "image/png") ||
  //       (request.body.darkMode !== "userDarkModeSystem" &&
  //         request.body.darkMode !== "userDarkModeLight" &&
  //         request.body.darkMode !== "userDarkModeDark")
  //     )
  //       throw "validation";
  //     let avatarImage: string | undefined;
  //     if (typeof request.body.avatarImage === "object") {
  //       const relativePath = `files/${cryptoRandomString({
  //         length: 20,
  //         characters: "abcdefghijklmnopqrstuvwxyz0123456789",
  //       })}/${path.basename(request.body.avatarImage.path)}`;
  //       const absolutePath = path.join(
  //         application.configuration.dataDirectory,
  //         relativePath,
  //       );
  //       await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  //       await fs.rename(request.body.avatarImage.path, absolutePath);
  //       await sharp(absolutePath, { autoOrient: true })
  //         .resize({ width: 256 /* var(--size--64) */, height: 256 })
  //         .toFile(`${absolutePath}.webp`);
  //       avatarImage = `/${relativePath}.webp`;
  //     }
  //     application.database.run(
  //       sql`
  //         update "users"
  //         set
  //           "name" = ${request.body.name},
  //           $${typeof avatarImage === "string" ? sql`"avatarImage" = ${avatarImage},` : request.body["avatarImage--remove"] === "on" ? sql`"avatarImage" = null,` : sql``}
  //           "darkMode" = ${request.body.darkMode}
  //         where "id" = ${request.state.user.id};
  //       `,
  //     );
  //     response.setFlash!(html`
  //       <div class="flash--green">General settings updated successfully.</div>
  //     `);
  //     response.redirect!("/settings");
  //   },
  // });
};
