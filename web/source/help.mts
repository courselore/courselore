import html, { HTML } from "@leafac/html";
import markdown from "dedent";
import * as shiki from "shiki";
import { Application } from "./index.mjs";

export default async (application: Application): Promise<void> => {
  application.web.get<
    {},
    HTML,
    {},
    {},
    Application["web"]["locals"]["ResponseLocals"]["LiveConnection"]
  >("/help/styling-content", (request, response) => {
    response.send(
      application.web.locals.layouts.main({
        request,
        response,
        head: html`<title>Styling Content · Help · Courselore</title>`,
        body: html`
          $${application.web.locals.partials.content({
            request,
            response,
            contentPreprocessed:
              application.web.locals.partials.contentPreprocessed(
                markdown`
                  # Styling Content

                  You may style content with
                  [GitHub Flavored Markdown](https://guides.github.com/features/mastering-markdown/)
                  and include mathematical formulas with [LaTeX](https://katex.org/docs/supported.html), for example:

                  <table>
                  <thead>
                  <tr>
                  <th>
                  You Write
                  </th>
                  <th>
                  Result
                  </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr>
                  <td>**Bold**</td>
                  <td>
                      
                  **Bold**
                      
                  </td>
                  </tr>
                  <tr>
                  <td>_Italics_</td>
                  <td>
                      
                  _Italics_
                      
                  </td>
                  </tr>
                  <tr>
                  <td>$E=mc^2$</td>
                  <td>
                      
                  $E=mc^2$
                      
                  </td>
                  </tr>
                  <tr>
                  <td>\`Code\`</td>
                  <td>
                      
                  \`Code\`
                      
                  </td>
                  </tr>
                  <tr>
                  <td>$$<br/>
                  L = \frac{1}{2} \rho v^2 S C_L<br/>
                  $$</td>
                  <td>
                      
                  $$
                  L = \frac{1}{2} \rho v^2 S C_L
                  $$
                      
                  </td>
                  </tr>
                  <tr>
                  <td>\`\`\`javascript<br/>
                  console.log("Courselore");<br/>
                  \`\`\`</td>
                  <td>
                      
                  \`\`\`javascript
                  console.log("Courselore");
                  \`\`\`
                      
                  </td>
                  </tr>
                  </tbody>
                  </table>

                  <details>
                  <summary>List of languages supported in code blocks (\`\`\`LANGUAGE)</summary>

                  ${shiki.BUNDLED_LANGUAGES.map(
                    (language) => markdown`- \`${language.id}\`\n`
                  ).join("")}

                  </details>
                      
                  The content editor includes a toolbar that helps you discover all the options. Try it out:
                `
              ).contentPreprocessed,
          }).contentProcessed}
          $${application.web.locals.partials.contentEditor({
            request,
            response,
            modifiable: false,
          })}
        `,
      })
    );
  });
};
