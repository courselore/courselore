# Self-Hosting

You may use Courselore at [`courselore.org`](https://courselore.org), but you may prefer to run Courselore on your own server for maximum privacy and control. Courselore is easy to self-host and is an excellent first project if you’re new to system administration.

> **Note:** If you get stuck, please [open an issue](https://github.com/courselore/courselore/issues/new) including as much information as possible: What you tried, what you expected to happen, what really happened, what error messages you ran into, and so forth.

### Requirements

- **Server.** This is the machine that will run Courselore. You may rent a server from a provider such as [DigitalOcean](https://www.digitalocean.com/) (this is what we use for [`courselore.org`](https://courselore.org)), [Linode](https://www.linode.com/), and so forth. You may also use a server provided by your educational institution, or a [Raspberry Pi](https://www.raspberrypi.com) that you have running in your closet.

  > **Note:** You need command-line access to the server.

  > **Note:** The server may run Linux, Windows, or macOS. We recommend Linux ([Ubuntu](https://ubuntu.com)).

  > **Note:** Courselore is lightweight. A $5/month DigitalOcean server is enough for a couple hundred users.

- **Email Delivery Service.** This is the service that will deliver emails on behalf of your server. You may use a service such as [Amazon SES](https://aws.amazon.com/ses/) (this is what we use for [`courselore.org`](https://courselore.org)), [SendGrid](https://sendgrid.com), and so forth. You may also use an email delivery service provided by your educational institution.

  > **Note:** In theory your server could try delivering emails directly instead of relying on an email delivery service. Courselore may be configured to do that, and it would be better for privacy because no data would be going through third-party services. Unfortunately, in practice your emails would likely be marked as spam or even be rejected by most destinations such as [Gmail](https://www.google.com/gmail/) and [Microsoft Outlook](https://outlook.live.com/). Courselore must be able to send emails to complete the sign-up process, to send notifications, and so forth, so it’s best to rely on an email delivery service who guarantees that emails will arrive at your users’ inboxes.

- **Domain.** This is a name such as `courselore.org`. You may buy a domain from providers such as [Namecheap](https://www.namecheap.com/) (this is what we use for `courselore.org`), [Amazon Route 53](https://aws.amazon.com/route53/), and so forth. You may also use a domain provided by your educational institution, for example, `my-course.educational-institution.edu`.

  > **Note:** You need access to the DNS configuration for the domain to set records such as “`my-course.educational-institution.edu` maps to the IP address of my server at `159.203.147.228`.”

### DNS Setup

Create an `A` Record pointing at your server’s IP address and `ALIAS` or `CNAME` Records for common subdomains, for example, `www`.

### Server Setup

1. [Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases). For example, from the Linux command line:

   ```console
   # mkdir courselore
   # cd courselore
   # wget https://github.com/courselore/courselore/releases/download/v0.0.8/courselore--linux--v0.0.8.tgz
   # tar xzf courselore--linux--v0.0.8.tgz
   ```

2. Create a configuration file based on [`configuration/example.mjs`](/configuration/example.mjs) (look for the keyword `YOUR` in that file). For example, from the Linux command line:

   ```console
   # wget -O configuration.mjs https://github.com/courselore/courselore/raw/main/configuration/example.mjs
   # nano configuration.mjs
   ```

   > **Note for Advanced Users:** The Courselore configuration is a JavaScript module whose default export is a function called by the `courselore` binary. The example configuration starts an [Express](https://expressjs.com) application server and a [Caddy](https://caddyserver.com) reverse-proxy & TLS certificate manager, both of which are embedded in the `courselore` binary using [`caxa`](https://github.com/leafac/caxa). But this is a pretty flexible configuration strategy that allows for endless customization, for example:
   >
   > - Load secrets from a different source instead of hard-coding them (see an example of how to do that in the configuration we use for [`courselore.org`](https://courselore.org) at [`configuration/production.mjs`](/configuration/production.mjs)).
   >
   > - Use a different reverse proxy, which may be necessary if you have other applications running on the same server.
   >
   > - Use a different email service provider, either via SMTP with [Nodemailer](https://nodemailer.com/) or via a proprietary API specific to your email service provider that may be available as a [Node.js](https://nodejs.org/) package. You may even try to [deliver emails directly from your server instead of relying on an email delivery service](https://github.com/nodemailer/nodemailer/issues/1227) if you can include your server on the allowlist of you users’ inbox.
   >
   > - Mount Courselore as part of a larger Node.js application. This allows you to intercept Courselore’s requests & responses and manipulate them in any way you want.

3. Configure your operating system’s service manager to start Courselore on boot and restart it in case it crashes. For example, you may use Ubuntu’s service manager [systemd](https://systemd.io) with the configuration we use for [`courselore.org`](https://courselore.org) at [`configuration/courselore.service`](/configuration/courselore.service):

   ```console
   # wget -O /etc/systemd/system/courselore.service https://github.com/courselore/courselore/raw/main/configuration/courselore.service
   # systemctl daemon-reload
   # systemctl enable courselore
   # systemctl start courselore
   ```

### Server Maintenance

#### Backups

With the default configuration, all the data generated by Courselore lives on the `data/` folder. Backup that directory using your usual backup strategies. For example, using macOS you may download all the data to a local hard drive:

```console
$ rsync -av --progress --delete YOUR-USER@YOUR-SERVER.EDU:PATH-TO-COURSELORE/data/ /Volumes/HARD-DRIVE/courselore-data/
```

#### Updates

[Download the latest Courselore release for your platform](https://github.com/courselore/courselore/releases) and restart the server. For example, if you followed the examples from [§ Server Setup](#server-setup), you may do the following:

```console
# wget https://github.com/courselore/courselore/releases/download/v0.0.8/courselore--linux--v0.0.8.tgz
# tar xzf courselore--linux--v0.0.8.tgz
# systemctl restart courselore
```

> **Note:** Major updates, for example, v1.x.x → v2.x.x, require extra manual steps. Refer to the [release notes](https://github.com/courselore/courselore/releases) for more information.
