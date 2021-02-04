### Features

#### User Profile

- Gravatar.

#### API

- People may want to integrate CourseLore with their existing LMS & other systems.

#### Text Processor

- Add CSS for all the HTML that may be produced (see `hast-util-sanitize/lib/github.json`).
- Emoji with the `:smile:` form.
- Proxy insecure content.
  - https://github.com/atmos/camo
- Reference: <https://github.com/gjtorikian/html-pipeline>

#### Landing Page

- Try to make animation consume less resources. (Currently it’s making the “this tab is consuming too much energy” warning pop up in Safari.)
  - Maybe it has to do with computing the sine of large numbers? Clamp the values between 0–2π to see if that helps…

#### Textarea Niceties

- Store what the user wrote per thread/chat, even if they move to other threads/chats.
  - Garlic.js does that, but it seems a bit old and requires jQuery. Use localStorage instead.
- Some helpers to input Markdown & LaTeX (similar to what GitHub has).
- Upload files (like images), and have them embedded (similar to what GitHub has).
  - Packages to handle multipart form data: busboy, multer, formidable, multiparty, connect-multiparty, and pez.

#### Error Pages

- 400s.
- 500s.

#### Search

- In contents of a course (for example, search for `NullPointerException` to find that thread that helped you out).
  - Search within the scope of a course.
  - Search in all courses you’re taking (for example, search for `deadline extension`).
  - Reference: GitHub let’s you search in different scopes like that.
- Courses in the system (for joining a course).

#### More Deployment Strategies

- Docker.
- “One-click deployment” for different platforms like DigitalOcean, Linode, and so forth.

### Deployment Improvements

- Graceful HTTP shutdown

  ```js
  process.on("SIGTERM", () => {
    debug("SIGTERM signal received: closing HTTP server");
    server.close(() => {
      debug("HTTP server closed");
    });
  });
  ```

  - https://github.com/gajus/http-terminator

- Helmet.
- csurf.
- Compression.

### Open-Source Contributions

- <https://github.com/DefinitelyTyped/DefinitelyTyped/issues/50794>: Add more specific types to better-sqlite3 with generics.
- <https://github.com/actions/upload-release-asset/issues/56>: Document how to create a release in one GitHub Actions job and upload assets in another.
- Prettier: Bug Report: When formatting Markdown within a JavaScript tagged template literal, Prettier adds space at the end. This breaks the es6-string-markdown Visual Studio Code extension.
  - Get rid of the `// prettier-ignore`.
- <https://github.com/syntax-tree/hast-util-sanitize/pull/21>: Add types to the JSON in hast-util-sanitize.
- <https://npm.im/hast-util-to-text>: Write types.
  - <https://github.com/leafac/rehype-shiki/blob/ca1725c13aa720bf552ded5e71be65c129d15967/src/index.ts#L3-L4>

### Marketing

- Create CourseLore Gravatar
  - Use in npm

### References

- <https://www.acadly.com/>
