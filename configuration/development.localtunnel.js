module.exports = async (require) => {
  const url = process.env.URL;
  const path = require("path");
  const courselore = require(".").default;
  const { version } = require("../package.json");
  const app = await courselore(path.join(process.cwd(), "data"));
  app.locals.settings.url = url;
  app.listen(4000, "127.0.0.1", () => {
    console.log(`CourseLore/${version} started at ${app.locals.settings.url}`);
  });
};
