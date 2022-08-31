# Changelog

> **Note:** You may be notified about new Courselore releases in the following ways:
>
> **GitHub Notifications:** Watch for releases in the [Courselore repository](https://github.com/courselore/courselore/) using the **Watch > Custom > Releases** option.
>
> **Atom Feed:** Subscribe to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom).
>
> **Email:** Use [CodeRelease.io](https://coderelease.io/) or sign up to the [releases Atom feed](https://github.com/courselore/courselore/releases.atom) via services such as [Blogtrottr](https://blogtrottr.com/) or [IFTTT](https://ifttt.com).

## Unreleased

- Pinning a conversation now bumps it to the top of the sidebar. <https://courselore.org/courses/8537410611/conversations/42>

## 4.0.5

**2022-08-30 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.5) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- **Fixed an issue that prevented users of Microsoft Outlook from resetting their passwords.**

  It used to be the case that Courselore would mark a password reset link as used as soon as it was visited. This is a very strict security policy. But it appears that Microsoft Outlook visits links included in emails before showing them to the user—perhaps in attempt to verify the safety of following those links. Naturally, this marked the password reset link as used before the user had a chance of visiting it.

  To fix this issue, we relaxed the security policy and only mark a password reset link as used when the user has finished resetting their password.

## 4.0.4

**2022-08-27 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.4) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Introduced the notion of **conversation participants** which allows for more control over who’s part of a conversation and enables workflows such as **Direct Messages**.

## 4.0.2

**2022-08-12 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.2) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Changed the communication about the period of free hosting.

## 4.0.1

**2022-08-12 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.1) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

- Added email notifications for conversations in which you participated, and conversations which you started.
- Changed email notifications so that they’re threaded per conversation.
- Added notification of updates for system administrators in Courselore itself.
- Added a delay between a message being sent and its email notifications being delivered, to leave time for edits.
- Redesigned sidebar & “New Conversation” form.

## 4.0.0

**2022-07-09 · [Download](https://github.com/courselore/courselore/releases/tag/v4.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

Courselore 4.0.0 introduces the notion of an administrative interface for you, system administrator. For now it includes only one setting, allowing you to control who’s able to create courses. Moving forward, we’ll have more settings for you to manage & collect statistics about your Courselore installation easily 🎉

Update to Courselore 4.0.0 with the following steps:

1. Make sure you, system administrator, have an account in Courselore. If you don’t have an account, create one before continuing. Even if you don’t intend on participating on courses, your user will be a system administrator.

2. Backup. Always backup before updates.

3. Update the configuration file according to `configuration/example.mjs`. Note how the configuration file is much simpler now, asking just for essential information. We hope that moving forward this will minimize the changes you’ll have to make to the configuration file, avoiding major and minor updates that demand more of your attention.

4. The first time you run Courselore after the update, run it manually from an interactive command line. Don’t run it from your process manager, for example, systemd. Courselore will prompt you for some information. When Courselore has started successfully you may shut it down and restart it using your process manager.

Enjoy!

## 3.3.0

**2022-05-27 · [Download](https://github.com/courselore/courselore/releases/tag/v3.3.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This minor release includes a non-breaking change to the configuration to allow third-party websites to embed images sent as attachments. This is necessary for Outlook (and perhaps other email clients) to show images in email notifications. Refer to <https://github.com/courselore/courselore/blob/v3.3.0/configuration/example.mjs> and apply the changes to your configuration accordingly.

## 3.2.0

**2022-05-12 · [Download](https://github.com/courselore/courselore/releases/tag/v3.2.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This release includes an optional but recommended [change to a header recently introduced in the configuration file](https://github.com/courselore/courselore/blob/v3.2.0/configuration/example.mjs#L38):

`Referrer-Policy same-origin` → `Referrer-Policy no-referrer`

## 3.0.0

**2022-04-30 · [Download](https://github.com/courselore/courselore/releases/tag/v3.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

People who self-host their own installation of Courselore on their server must update their configuration according to the example:

<https://github.com/courselore/courselore/blob/387512a00b5e59a8346153f0e5416bd265ec0e25/configuration/example.mjs>

In particular, the configuration of the reverse proxy (Caddy) changed to include headers that improve security & privacy.

## 2.1.0

**2022-04-09 · [Download](https://github.com/courselore/courselore/releases/tag/v2.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

In this minor release we introduce a backward-compatible but highly-recommended change to the configuration file: https://github.com/courselore/courselore/blob/f2475da6b0eb17b750cfad04f7c59a0d0f962daa/configuration/example.mjs#L54

This configuration line improves the cache management in the browser and prevents the use of old client-side JavaScript, CSS, fonts, images, and so forth.

## 2.0.0

**2022-03-05 · [Download](https://github.com/courselore/courselore/releases/tag/v2.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This release includes an overhaul in the architecture for better performance and maintainability. It requires changes to your configuration. You may either [start over with the new configuration example (recommended)](https://github.com/courselore/courselore/blob/c66f3b8f46f52d53bcb17f334ddd7b834070a25d/configuration/example.mjs) or [look at the changes and apply them to your existing configuration](https://github.com/courselore/courselore/compare/v1.2.10...c66f3b8f46f52d53bcb17f334ddd7b834070a25d#diff-1d4efc9a9a4c88b7dfd373d4aec08c68c4396f2c86211734014124d8aa12d3c3).

## 1.2.0

**2022-01-31 · [Download](https://github.com/courselore/courselore/releases/tag/v1.2.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

We made a backwards-compatible improvement to logging that requires you to change your configuration file. Please refer to https://github.com/courselore/courselore/blob/3b102a6c2a9e8658dcd12e0bf99d4b078a7b6723/configuration/example.mjs and make the appropriate adjustments.

## 1.1.0

**2022-01-27 · [Download](https://github.com/courselore/courselore/releases/tag/v1.1.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

We made a backwards-compatible improvement to the configuration to more gracefully close resources (for example, database connections) on shutdown. Refer to https://github.com/courselore/courselore/blob/0b26b4c3bf7f0807fdf1dac91e10d5a1f45dbcc1/configuration/example.mjs#L65-L82 and update your configuration.

## 1.0.0

**2022-01-22 · [Download](https://github.com/courselore/courselore/releases/tag/v1.0.0) · [Backup before updating!](https://github.com/courselore/courselore/blob/main/documentation/self-hosting.md#backup)**

This is the first release of CourseLore that’s meant for self-hosting by the larger community. The deployment process & configuration scheme are fixed, and any backward incompatible changes will only occur on major releases.

There are still some known issues, and if you’re planning on using v1.0.0 you should expect to update often. If you’re an early adopter, you should join us on [Meta CourseLore](https://courselore.org/courses/8537410611/invitations/3667859788).

## 0.9.0

**2022-01-16 · [Download](https://github.com/courselore/courselore/releases/tag/v0.9.0) · For early adopters.**

Contact <self-hosting@courselore.org> if you want to use this.
