# Development Notes

## Performance

- autocannon uses negligible CPU.
- Use `yes > /dev/null` to saturate one core.
- [Stats](https://github.com/exelban/stats) shows an aggregate of all the CPU cores, just like the Activity Monitor lower pane. So if 1 out of 8 cores is saturated, you see 25% usage.
- In a Mac Mini with a M1 processor, the performance cores saturate first and the efficiency cores saturate last.
- Sending signals:

  |                                                                             |           |
  | --------------------------------------------------------------------------- | --------- |
  | `⌃C`                                                                        | `SIGINT`  |
  | `kill`, **Activity Monitor > Quit**, **Stats > Kill process**, and so forth | `SIGTERM` |
  | `kill -9`, **Activity Monitor > Force Quit**, and so forth                  | `SIGKILL` |
  | `⌃Z`                                                                        | `SIGTSTP` |
  | `fg`/`bg`                                                                   | `SIGCONT` |

- If a parent process receives a `SIGKILL`, it can’t handle it, so it leaves the children as orphans.
  - This is an operating system behavior that applies to any parent: `npm run`, `nodemon`, `0x`, and so forth.
- `npm run` & Nodemon forward signals such as `SIGTERM` correctly.
- Nodemon sends `SIGUSR2` to restart child process.
- 0x
  - Sometimes flaky when stopped with `⌃C`, but I don’t know why. May have to do with [its own process event handlers in prelude](https://github.com/davidmarkclements/0x/blob/6875aa33add4aecdbfade14360c41ae26747a205/lib/preload/soft-exit.js).
    - Maybe it’s more reliable to `SIGTERM` the main Courselore process.
  - Prelude
    - Does not support cluster. Good thing we aren’t using it, I guess…
    - Redirects `stdout`.
    - Includes its own handlers for `SIGINT` & `SIGTERM` which `process.exit()`s right away.
      - This explains why my event handlers didn’t have a chance of printing anything…
- Response times:

  | Browser        | autocannon |
  | -------------- | ---------- |
  | Just the HTML  | 75%ile     |
  | Full page load | 90%ile     |

- The overhead introduced by running the application with 0x seems to be negligible (as measured with autocannon’s response time).
- The same test, when reproduced a couple days later, gives consistent results up to the 99%ile.
  - I believe numbers above 99%ile aren’t significant because we only have a couple thousand requests, not millions.
- It’s better to have one process per core. It does saturate the core more, but the performance is a bit better than having half as many processes as cores, and it’s much better than having a single process.
- The overhead of logging is negligible, even creating request ids, logging start and end of requests, looking at the logs in Visual Studio Code while they scroll by (this loads the GPU a bit), and so forth.
- The overhead of creating Live-Connections (a write in the hot path of a `GET` request) is negligible.
- Caddy & load balancing has negligible impact on performance.
- Using HAR with autocannon could have been good in theory, because it means we wouldn’t have to collect cookies, URLs, and so forth by hand. But in practice there’s no way to create an HAR of a single request, and it isn’t ergonomic to edit the generated HAR and filter the requests that we actually want to run.
