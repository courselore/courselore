<p align="center">
<a href="https://courselore.org"><img src="public/splash.png" width="600" alt="CourseLore · The Open-Source Student Forum" /></a>
</p>
<p align="center">
<a href="https://github.com/courselore/courselore"><img src="https://img.shields.io/badge/Source---" alt="Source"></a>
<a href="https://www.npmjs.com/package/courselore"><img alt="Package" src="https://badge.fury.io/js/courselore.svg"></a>
<a href="https://github.com/courselore/courselore/actions"><img src="https://github.com/courselore/courselore/workflows/.github/workflows/main.yml/badge.svg" alt="Continuous Integration"></a>
</p>

### Run the CourseLore Demonstration Server on Your Own Computer

You may run the CourseLore demonstration server on your own computer to play around, try out the features, and determine if CourseLore works for you.

(**Note:** We say that it’s a **demonstration** server because you shouldn’t run CourseLore this way for an actual course (your students wouldn’t be able to access it) (see [§ Host Your Own CourseLore Instance](#host-your-own-courselore-instance) when you’re ready to take that next step). We **do not** mean demonstration as in “now go buy CourseLore Premium,” or “here are some in-app purchases.” There **are no** CourseLore Premium or in-app purchases. CourseLore is and will always be free and open-source.)

- **Option 1 (Simplest):** [Download CourseLore](https://github.com/courselore/courselore/releases), run it, and go to `http://localhost:4000`. (To run CourseLore in macOS you’ll need to right-click on the executable, click on Open, and then confirm that you want to open it. CourseLore as downloaded from the the link above is safe, but hasn’t been signed, so macOS makes you confirm that you trust it.)

- **Option 2 (Advanced):** If you have [Node.js](https://nodejs.org) installed, run:

  ```console
  $ npx courselore
  ```

- **Option 3 (More Advanced):** Run:

  ```console
  $ git clone https://github.com/courselore/courselore.git
  $ cd courselore
  $ npm install
  $ npm run develop
  ```

### Host Your Own CourseLore Instance

Follow the instructions below to install CourseLore on your own servers. This is the most privacy-preserving way of using CourseLore, because your and your students’ data are under your control. It’s a bit of extra work to setup, but CourseLore has been designed from the beginning to be easy to install and maintain, so it’s an excellent first system administration project. And once it’s been setup, you can mostly forget about it.

#### Requisites

- **Domain:** A domain is an address where you’ll find your CourseLore installation, for example, `example.com`.

  You may use a subdomain under your institution’s domain (for example, `courselore.<university>.edu`) or a domain that you buy (for example, `example.com`). For this second option, most domain sellers work (for `courselore.org` we use [Namecheap](https://www.namecheap.com)) (when looking at domain sellers you may also see them being called **registrars**).

  The important thing to keep in mind when you’re getting a domain is that you must be able to configure a few DNS records for it (more on that below). If you’re using a subdomain under your institution’s domain, ask the system administrator if they can configure a few DNS records for you. If you’re buying your own domain, check with the domain seller if they provide some sort of DNS service that you can configure (most of them do).

- **Server:** A server is just a regular computer that’s always on and connected to the internet.

  You may use a server that’s provided by your institution or a server that you rent. For this second option, most providers of servers for rent work (for `courselore.org` we use [DigitalOcean](https://www.digitalocean.com), and another popular option is [linode](https://www.linode.com)) (when looking at servers for rent you may also see them being called **Virtual Private Servers (VPSs)**).

  In theory you could run CourseLore on a computer that you have at home or at your office, as long as it’s always on and connected to the internet. CourseLore doesn’t use a lot of resources so even an old computer or something like a Raspberry Pi would be enough. But in practice that probably won’t work because CourseLore needs to run a web server, send emails, and so forth, and most domestic internet service providers disable that kind of activity to prevent spam and other kinds of abuse.

  The important things to keep in mind when you’re getting a server are that you must be able to:

  1. Run network services, for example, a web server and an email server. In particular, you must be able to bind services to the network ports 80 and 443 for inbound connections, and you must be able to make outbound connections to port 25. You may also check for firewalls sitting in front of the server.
  2. Have access to the file system (read and write files). (Most providers of **Platform-as-a-Service (PaaS)**, for example, [Heroku](https://www.heroku.com), fail this criterion.)

  If you plan on using a server provided by your institution, you may ask your system administrator about these features. Most servers for rent provide these features.

**TODO: Continue instructions on how to install and setup everything.**

### Setup a Development Environment to Contribute to CourseLore

CourseLore has been designed to be a welcoming project for people who are new to contributing to open-source. Here’s what you need to install to get started:

- [Node.js](https://nodejs.org/)
- [Visual Studio Code](https://code.visualstudio.com) and the following Visual Studio Code extensions:
  - [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
  - [es6-string-html](https://marketplace.visualstudio.com/items?itemName=Tobermory.es6-string-html)
  - [es6-string-css](https://marketplace.visualstudio.com/items?itemName=bashmish.es6-string-css)
  - [es6-string-markdown](https://marketplace.visualstudio.com/items?itemName=jeoht.es6-string-markdown)
- [Git](https://git-scm.com)

**Clone and setup the project locally:**

```console
$ git clone https://github.com/courselore/courselore.git
$ cd courselore
$ npm install
$ code .
```

**Run the development server:**

```console
$ npm run develop
```

**Run the tests:**

```console
$ npm test
```

**Release a new version:**

```console
$ npm version <major|minor|patch>
$ git push --tags
```
