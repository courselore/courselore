# Self-Hosting

**Welcome!** 👋

You may use Courselore at [`courselore.org`](https://courselore.org), but you may prefer to run Courselore on your own server for maximum privacy and control. Courselore is easy to self-host and is an excellent first project if you’re new to system administration.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new?body=%2A%2AWhat%20did%20you%20try%20to%20do%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20did%20you%20expect%20to%20happen%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20really%20happened%3F%2A%2A%0A%0A%0A%0A%2A%2AWhat%20error%20messages%20%28if%20any%29%20did%20you%20run%20into%3F%2A%2A%0A%0A%0A%0A%2A%2APlease%20provide%20as%20much%20relevant%20context%20as%20possible%20%28operating%20system%2C%20browser%2C%20and%20so%20forth%29%3A%2A%2A%0A).

> **Note:** Join our community at [Meta Courselore](https://courselore.org/courses/8537410611/invitations/3667859788) to talk to the developers, request features, report bugs, and so forth.

## Requirements

- **Server.** This is the machine that will run Courselore. You may rent a server from a provider such as [DigitalOcean](https://www.digitalocean.com/) (this is what we use for [`courselore.org`](https://courselore.org)), [Linode](https://www.linode.com/), and so forth. You may also use a server provided by your educational institution, or a [Raspberry Pi](https://www.raspberrypi.com) that you have running in your closet.

  > **Note:** You need command-line access to the server.

  > **Note:** Courselore uses the following network ports: 80, 443, and 6000–9000. Stop other applications you may have running on those ports. In Linux and macOS, for example, you may find which application is running on a network port by using `lsof -i:80`. Or you may prefer to use [`npx kill-port 80 443 ...`](https://github.com/tiaanduplessis/kill-port).

  > **Note:** We recommend that Courselore is the only application running in the machine. Or, if you must, use containers to separate applications and give Courselore its own container.

  > **Note:** The server may run Linux, Windows, or macOS. We recommend Linux ([Ubuntu](https://ubuntu.com)).

  > **Note:** Courselore is lightweight. A $5/month DigitalOcean server is enough for a couple hundred users.

- **Email Delivery Service.** This is the service that will deliver emails on behalf of your server. You may use a service such as [Amazon SES](https://aws.amazon.com/ses/) (this is what we use for [`courselore.org`](https://courselore.org)), [SendGrid](https://sendgrid.com), and so forth. You may also use an email delivery service provided by your educational institution.

  > **Note:** In theory your server could try delivering emails directly instead of relying on an email delivery service. Courselore may be configured to do that, and it would be better for privacy because no data would be going through third-party services. Unfortunately, in practice your emails would likely be marked as spam or even be rejected by most destinations such as [Gmail](https://www.google.com/gmail/) and [Microsoft Outlook](https://outlook.live.com/). Courselore must be able to send emails to complete the sign-up process, to send notifications, and so forth, so it’s best to rely on an email delivery service which guarantees that emails will arrive at your users’ inboxes.

- **Domain/Subdomain.** This is a name such as `courselore.org`. You may buy a domain from providers such as [Namecheap](https://www.namecheap.com/) (this is what we use for `courselore.org`), [Amazon Route 53](https://aws.amazon.com/route53/), and so forth. You may also use a domain/subdomain provided by your educational institution, for example, `my-course.educational-institution.edu`.

  > **Note:** You need access to the DNS configuration for the domain/subdomain to set records such as “`my-course.educational-institution.edu` maps to the IP address of my server at `159.203.147.228`.”

  > **Note:** You must have a domain/subdomain dedicated to Courselore—you may not run Courselore under a pathname, for example, `educational-institution.edu/courselore/`. This is necessary to enable Courselore to manage cookies in the most secure way and to avoid conflicts with other applications that could be running on the same domain/subdomain under other pathnames.

## DNS Setup

Create an `A` Record pointing at your server’s IP address and `ALIAS` or `CNAME` Records for common subdomains, for example, `www`.

## Server Setup

1. [Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases). For example, from the Linux command line:

   ```console
   # mkdir courselore
   # cd courselore
   # wget https://github.com/courselore/courselore/releases/download/v<VERSION>/courselore--linux--v<VERSION>.tgz
   # tar xzf courselore--linux--v<VERSION>.tgz
   ```

2. Create a configuration file based on [`web/configuration/example.mjs`](/web/configuration/example.mjs). For example, from the Linux command line:

   ```console
   # wget -O configuration.mjs https://github.com/courselore/courselore/raw/main/web/configuration/example.mjs
   # nano configuration.mjs
   ```

   > **Note for Advanced Users:** The Courselore configuration is a JavaScript module. You may use JavaScript for more advanced configuration options, for example:
   >
   > - In the configuration for development (see [`web/configuration/development.mjs`](/web/configuration/development.mjs)), we read the `hostname` from the `HOSTNAME` environment variable.
   >
   > - In the configuration for [`courselore.org`](https://courselore.org) (see [`web/configuration/courselore.org.mjs`](/web/configuration/courselore.org.mjs)), we load secrets from a different file instead of hard-coding them.

3. Configure your operating system’s service manager to start Courselore on boot and restart it in case it crashes. For example, you may use Ubuntu’s service manager [systemd](https://systemd.io) with the configuration we use for [`courselore.org`](https://courselore.org) at [`web/configuration/courselore.service`](/web/configuration/courselore.service):

   ```console
   # wget -O /etc/systemd/system/courselore.service https://github.com/courselore/courselore/raw/main/web/configuration/courselore.service
   # systemctl daemon-reload
   # systemctl enable courselore
   # systemctl start courselore
   ```

   > **Note:** When you run Courselore for the first time, create an account for yourself, because the first account that is created is granted system administrator privileges.

## Backup

With the default configuration, all the data generated by Courselore lives on the `data/` directory next to the configuration file. Backup that directory using your usual backup strategies. For example, using macOS you may download all the data to a local hard drive:

```console
$ rsync -av --progress --delete YOUR-USER@YOUR-SERVER.EDU:PATH-TO-COURSELORE/data/ /Volumes/HARD-DRIVE/courselore-data/
```

> **Note:** If Courselore is running while you run the backup, [there’s a small chance that the database files will be in an invalid state](https://sqlite.org/howtocorrupt.html#_backup_or_restore_while_a_transaction_is_active). We recommend that you stop Courselore during the backup if you can.

## Update

> **Important:** [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)

> **Important:** Major updates (for example, 1.x.x → 2.x.x) include **required** extra manual steps. Minor updates (for example, x.1.x → x.2.x) include **optional** manual steps.
>
> If you’re updating across multiple major & minor versions, then you may update the configuration file with respect to the latest version, but you must follow all other steps for all the versions in between (for example, to update 1.2.3 → 3.2.5 use a configuration file compatible with 3.2.5, but follow the other steps for 1.2.3 → 2.0.0 → 2.1.0 → 2.2.0 → 3.0.0 → 3.1.0 → 3.2.5 as well).
>
> Refer to the [changelog](https://github.com/courselore/courselore/blob/main/documentation/changelog.md) for more information.

> **Note:** You may be notified about new Courselore releases in the following ways:
>
> **Courselore Footer:** Courselore checks for updates. When a new version is available Courselore notifies administrators with a button in the footer of the main Courselore interface as well as log messages in the console.
>
> **GitHub Notifications:** Watch for releases in the [Courselore repository](https://github.com/courselore/courselore/) using the **Watch > Custom > Releases** option.
>
> **Atom Feed:** Subscribe to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom).
>
> **Email:** Use [CodeRelease.io](https://coderelease.io/) or sign up to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom) via services such as [Blogtrottr](https://blogtrottr.com/) or [IFTTT](https://ifttt.com).

[Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases) and restart the server. For example, if you followed the examples from [§ Server Setup](#server-setup), you may do the following:

```console
# rm courselore
# wget https://github.com/courselore/courselore/releases/download/v<VERSION>/courselore--linux--v<VERSION>.tgz
# tar xzf courselore--linux--v<VERSION>.tgz
# systemctl restart courselore
```
