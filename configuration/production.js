module.exports = async (require) => {
  const url = "https://courselore.org";
  const email = "administrator@courselore.org";
  if (process.argv[3] === undefined) {
    const execa = require("execa");
    const caddyfile = require("dedent");
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
        env: { NODE_ENV: "production" },
      }),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "inherit",
        stderr: "inherit",
        input: caddyfile`
          {
            admin off
            email ${email}
          }

          ${url} {
            reverse_proxy 127.0.0.1:4000
            encode zstd gzip
          }
    
          www.courselore.org, courselore.com, www.courselore.com {
            redir https://courselore.org{uri}
          }
        `,
      }),
    ];
    await Promise.any(subprocesses);
    for (const subprocess of subprocesses) subprocess.cancel();
  } else {
    const path = require("path");
    const nodemailer = require("nodemailer");
    const courselore = require(".").default;
    const { version } = require("../package.json");
    const secrets = require(path.join(__dirname, "secrets.json"));
    const app = await courselore({
      dataDirectory: path.join(__dirname, "data"),
      url,
      administrator: `mailto:${email}`,
      sendMail: (() => {
        const transporter = nodemailer.createTransport(
          {
            host: secrets.smtp.host,
            auth: {
              user: secrets.smtp.username,
              pass: secrets.smtp.password,
            },
          },
          { from: `"CourseLore" <administrator@courselore.org>` }
        );
        return async (mailOptions) => await transporter.sendMail(mailOptions);
      })(),
      demonstration: true,
    });
    app.listen(4000, "127.0.0.1", () => {
      console.log(`CourseLore/${version} started at ${url}`);
    });
  }
};
