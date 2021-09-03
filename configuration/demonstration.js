module.exports = async (require) => {
  const url = process.env.URL ?? `https://localhost:5000`;
  if (process.argv[3] === undefined) {
    const execa = require("execa");
    const caddyfile = require("dedent");
    const subprocesses = [
      execa(process.argv[0], [process.argv[1], __filename, "server"], {
        preferLocal: true,
        stdio: "inherit",
      }),
      execa("caddy", ["run", "--config", "-", "--adapter", "caddyfile"], {
        preferLocal: true,
        stdout: "inherit",
        stderr: "inherit",
        input: caddyfile`
          {
            admin off
            local_certs
          }

          ${url} {
            reverse_proxy 127.0.0.1:4000
            encode zstd gzip
          }
        `,
      }),
    ];
    await Promise.any(subprocesses);
    for (const subprocess of subprocesses) subprocess.cancel();
  } else {
    const path = require("path");
    const courselore = require(".").default;
    const { version } = require("../package.json");
    const app = await courselore({
      dataDirectory: path.join(process.cwd(), "data"),
      url,
      administrator: "mailto:demonstration@courselore.org",
      sendMail: async (mailOptions) => {
        console.log(`Email: ${JSON.stringify(mailOptions, undefined, 2)}`);
      },
    });
    app.listen(4000, "127.0.0.1", () => {
      console.log(`CourseLore/${version} started at ${url}`);
    });
  }
};
